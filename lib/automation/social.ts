import OpenAI from "openai";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { db, ensureSchema } from "@/lib/db";
import { absoluteMediaUrl } from "@/lib/media-url";
import { putPublicObject, publicAssetUrl } from "@/lib/storage/r2";

type SlideType = "cover" | "explainer" | "feature" | "impact" | "context" | "watch" | "cta";
type Slide = {
  type: SlideType;
  label: string;
  headline: string;
  body: string | null;
  imageRole: "hero" | "inline_1" | "inline_2" | null;
  bullets: string[] | null;
};
type SocialPlan = {
  schemaVersion: 1;
  platform: "instagram";
  caption: string;
  hashtags: string[];
  carousel: { ratio: "4:5"; slides: Slide[] };
};
type DraftRow = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  body_markdown: string;
  source_urls: string[];
  published_at: Date;
};
type PublishResult = { mediaId: string; instagramBusinessAccountId?: string; imageCount?: number; published?: boolean };
type JobRow = {
  id: string;
  draft_id: string;
  content_slug: string;
  status: string;
  attempts: number;
  plan: SocialPlan | null;
  assets: { imageUrls?: string[]; publishResult?: PublishResult } | null;
  published_object_id: string | null;
};
type MediaRow = { role: "hero" | "inline_1" | "inline_2"; hero_path: string | null; social_portrait_path: string | null };

const PROJECT = "business-future-today";
const BRAND = { ink: "#111827", paper: "#F6F3EB", accent: "#F4D03F", muted: "#677386", line: "#d6dbe2" };
const EXPECTED_SLIDES: SlideType[] = ["cover", "explainer", "feature", "impact", "context", "watch", "cta"];

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c] || c));
}

async function ensureSocialSchema() {
  await ensureSchema();
  await db().query(`
    CREATE TABLE IF NOT EXISTS social_publications (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      publication text NOT NULL DEFAULT 'business-future-today',
      content_slug text,
      platform text NOT NULL,
      account_handle text,
      account_id text,
      object_id text NOT NULL,
      object_type text NOT NULL,
      status text NOT NULL,
      permalink text,
      asset_url text,
      published_at timestamptz,
      deleted_at timestamptz,
      source_commit text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (platform, object_id)
    );
    CREATE INDEX IF NOT EXISTS social_publications_content_slug_idx ON social_publications (content_slug);
    CREATE INDEX IF NOT EXISTS social_publications_platform_status_idx ON social_publications (platform, status);

    CREATE TABLE IF NOT EXISTS social_jobs (
      id uuid PRIMARY KEY,
      draft_id uuid NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      content_slug text NOT NULL,
      platform text NOT NULL DEFAULT 'instagram',
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','retry_wait','published','skipped','failed')),
      attempts integer NOT NULL DEFAULT 0,
      next_attempt_at timestamptz NOT NULL DEFAULT now(),
      locked_at timestamptz,
      plan jsonb,
      assets jsonb,
      last_error text,
      published_object_id text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      published_at timestamptz,
      UNIQUE (draft_id, platform)
    );
    CREATE INDEX IF NOT EXISTS social_jobs_due_idx ON social_jobs (platform, status, next_attempt_at, created_at);
  `);
}

async function discoverJobs() {
  await db().query(`UPDATE social_jobs SET status='retry_wait',next_attempt_at=NOW(),locked_at=NULL,updated_at=NOW(),last_error=COALESCE(last_error,'stale_processing_recovered') WHERE status='processing' AND locked_at<NOW()-INTERVAL '20 minutes'`);
  const candidates = await db().query<{id:string;slug:string}>(`
    SELECT d.id,d.slug
    FROM drafts d
    JOIN media_assets h ON h.draft_id=d.id AND h.role='hero' AND h.hero_path IS NOT NULL
    WHERE d.status='published'
      AND d.published_at >= NOW()-INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM social_publications sp
        WHERE sp.platform='instagram' AND sp.status='published' AND sp.content_slug=d.slug
      )
    ORDER BY d.published_at DESC
    LIMIT 12
  `);
  for (const candidate of candidates.rows) {
    await db().query(`INSERT INTO social_jobs (id,draft_id,content_slug,platform) VALUES ($1,$2,$3,'instagram') ON CONFLICT (draft_id,platform) DO NOTHING`,[randomUUID(),candidate.id,candidate.slug]);
  }
}

async function socialIntervalOpen() {
  const interval = Math.max(30, Math.min(1440, Number(process.env.SOCIAL_MIN_INTERVAL_MINUTES || 240)));
  const latest = await db().query<{ published_at: Date | null }>(`SELECT max(published_at) published_at FROM social_publications WHERE platform='instagram' AND status='published'`);
  const last = latest.rows[0]?.published_at ? new Date(latest.rows[0].published_at) : null;
  if (last && Date.now() - last.getTime() < interval * 60_000) {
    return { open: false as const, intervalMinutes: interval, lastPublishedAt: last.toISOString() };
  }
  return { open: true as const, intervalMinutes: interval, lastPublishedAt: last?.toISOString() || null };
}

async function claimJob(): Promise<JobRow | null> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<JobRow>(`
      SELECT id,draft_id,content_slug,status,attempts,plan,assets,published_object_id
      FROM social_jobs
      WHERE platform='instagram'
        AND status IN ('pending','retry_wait')
        AND next_attempt_at<=NOW()
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const job = found.rows[0];
    if (!job) { await client.query("COMMIT"); return null; }
    const updated = await client.query<JobRow>(`
      UPDATE social_jobs
      SET status='processing',attempts=attempts+1,locked_at=NOW(),updated_at=NOW(),last_error=NULL
      WHERE id=$1
      RETURNING id,draft_id,content_slug,status,attempts,plan,assets,published_object_id
    `,[job.id]);
    await client.query("COMMIT");
    return updated.rows[0] || null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

async function getDraft(draftId: string) {
  const result = await db().query<DraftRow>(`SELECT id,slug,title,dek,category,body_markdown,source_urls,published_at FROM drafts WHERE id=$1 AND status='published' LIMIT 1`,[draftId]);
  if (!result.rows[0]) throw new Error("SOCIAL_DRAFT_NOT_FOUND");
  return result.rows[0];
}

async function getMedia(draftId: string) {
  const result = await db().query<MediaRow>(`SELECT role,hero_path,social_portrait_path FROM media_assets WHERE draft_id=$1 AND role IN ('hero','inline_1','inline_2')`,[draftId]);
  const media = new Map<string,MediaRow>();
  for (const row of result.rows) media.set(row.role,row);
  if (!media.get("hero")) throw new Error("SOCIAL_HERO_MISSING");
  return media;
}

async function generatePlan(draft: DraftRow): Promise<SocialPlan> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY_MISSING");
  const client = new OpenAI({ apiKey: key, maxRetries: 1, timeout: 120_000 });
  const schema = {
    type: "object", additionalProperties: false,
    properties: {
      schemaVersion: { type: "integer", enum: [1] },
      platform: { type: "string", enum: ["instagram"] },
      caption: { type: "string", minLength: 40, maxLength: 900 },
      hashtags: { type: "array", minItems: 4, maxItems: 6, items: { type: "string" } },
      carousel: {
        type: "object", additionalProperties: false,
        properties: {
          ratio: { type: "string", enum: ["4:5"] },
          slides: {
            type: "array", minItems: 7, maxItems: 7,
            items: {
              type: "object", additionalProperties: false,
              properties: {
                type: { type: "string", enum: EXPECTED_SLIDES },
                label: { type: "string", maxLength: 28 },
                headline: { type: "string", maxLength: 120 },
                body: { type: ["string","null"], maxLength: 320 },
                imageRole: { type: ["string","null"], enum: ["hero","inline_1","inline_2",null] },
                bullets: { type: ["array","null"], minItems: 3, maxItems: 3, items: { type: "string", maxLength: 110 } }
              },
              required: ["type","label","headline","body","imageRole","bullets"]
            }
          }
        },
        required: ["ratio","slides"]
      }
    },
    required: ["schemaVersion","platform","caption","hashtags","carousel"]
  };
  const instructions = `You are the social editor for Business Future Today. Convert one published BFT article into a sharp 7-slide Instagram editorial carousel. Preserve factual accuracy. Do not invent facts. Do not write clickbait. Keep the publication's analytical, operator-focused voice. The seven slide types MUST appear exactly once and in this order: cover, explainer, feature, impact, context, watch, cta. The watch slide has exactly three bullets. Use imageRole hero for cover and cta; use inline_1 or hero for feature; other slides should have imageRole null. body should be null on cover and watch when unnecessary. bullets should be null except on watch. CTA body must be 'Read the full story at businessfuture.today'. Caption should add a concise angle rather than repeat the headline. Hashtags should start with BusinessFutureToday and use 3-5 highly relevant topical tags without # characters.`;
  const response = await client.responses.create({
    model: process.env.OPENAI_SOCIAL_MODEL || process.env.OPENAI_MODEL || "gpt-5.6-terra",
    reasoning: { effort: "low" }, store: false,
    instructions,
    input: JSON.stringify({ title: draft.title, dek: draft.dek, category: draft.category, bodyMarkdown: draft.body_markdown, sources: draft.source_urls || [] }),
    text: { format: { type: "json_schema", name: "bft_social_plan", strict: true, schema } }
  } as any);
  if (!response.output_text) throw new Error("SOCIAL_PLAN_EMPTY");
  const plan = JSON.parse(response.output_text) as SocialPlan;
  const types = plan.carousel?.slides?.map(slide => slide.type) || [];
  if (types.join(",") !== EXPECTED_SLIDES.join(",")) throw new Error(`SOCIAL_PLAN_SEQUENCE:${types.join(",")}`);
  if (plan.carousel.slides[6]?.body !== "Read the full story at businessfuture.today") throw new Error("SOCIAL_PLAN_CTA_INVALID");
  return plan;
}

async function fetchImage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`SOCIAL_MEDIA_HTTP_${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function textLayer(text: string | null, options: { width: number; height?: number; startSize?: number; minSize?: number; color?: string; font?: string; align?: "left"|"center"|"right" }) {
  const value = String(text || "").trim();
  const { width, height = 1000, startSize = 72, minSize = 28, color = BRAND.ink, font = "serif", align = "center" } = options;
  for (let size = startSize; size >= minSize; size -= 2) {
    const image = sharp({ text: { text: `<span foreground="${color}">${esc(value)}</span>`, font: `${font} ${size}`, width, align, rgba: true } });
    const metadata = await image.metadata();
    if ((metadata.height || 0) <= height) return { buffer: await image.png().toBuffer(), width: metadata.width || width, height: metadata.height || height };
  }
  const image = sharp({ text: { text: `<span foreground="${color}">${esc(value)}</span>`, font: `${font} ${minSize}`, width, align, rgba: true } });
  const metadata = await image.metadata();
  return { buffer: await image.png().toBuffer(), width: metadata.width || width, height: metadata.height || height };
}

function sourceLabel(draft: DraftRow) {
  try { return new URL(draft.source_urls?.[0] || "").hostname.replace(/^www\./,"") || "businessfuture.today"; }
  catch { return "businessfuture.today"; }
}

const pill = (label: string, x: number, y: number, width = 280) => `<rect x="${x}" y="${y}" width="${width}" height="42" rx="21" fill="${BRAND.accent}"/><text x="${x+width/2}" y="${y+28}" text-anchor="middle" fill="${BRAND.ink}" font-family="sans-serif" font-size="15" font-weight="800" letter-spacing="1">${esc(label).toUpperCase()}</text>`;
const masthead = (width: number) => `<rect width="${width}" height="132" fill="${BRAND.ink}"/><text x="60" y="52" fill="#fff" font-family="sans-serif" font-size="19" font-weight="700" letter-spacing="2">BUSINESS FUTURE</text><text x="60" y="96" fill="#fff" font-family="sans-serif" font-size="42" font-weight="800">TODAY</text>`;
function footer(width: number, height: number, source: string, index: number, total: number, options: { dark?: boolean; cta?: string } = {}) {
  const dark = Boolean(options.dark); const cta = options.cta || "businessfuture.today";
  return `<line x1="60" y1="${height-88}" x2="${width-60}" y2="${height-88}" stroke="${dark?'#ffffff55':BRAND.line}"/><text x="60" y="${height-42}" fill="${dark?'#d5dbe4':BRAND.muted}" font-family="sans-serif" font-size="15">Source: ${esc(source)}</text><text x="${width-60}" y="${height-42}" text-anchor="end" fill="${dark?'#fff':BRAND.ink}" font-family="sans-serif" font-size="15" font-weight="700">${index}/${total} · ${esc(cta)}</text>`;
}

async function renderSlide(slide: Slide, index: number, total: number, source: string, images: Record<string,Buffer>) {
  const W = 1080, H = 1350;
  let base = sharp({ create: { width: W, height: H, channels: 4, background: BRAND.paper } });
  const composites: any[] = [];
  const assetFor = (role: Slide["imageRole"]) => images[role || "hero"] || images.hero;

  if (slide.type === "cover") {
    const photo = await sharp(assetFor(slide.imageRole)).resize(W,650,{fit:"cover",position:"attention"}).jpeg({quality:94}).toBuffer();
    const head = await textLayer(slide.headline,{width:920,height:290,startSize:72,minSize:46,font:"serif"});
    composites.push({input:photo,left:0,top:132},{input:Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${masthead(W)}${pill(slide.label,420,820,240)}${footer(W,H,source,index,total,{cta:"SWIPE →"})}</svg>`),left:0,top:0},{input:head.buffer,left:Math.round((W-head.width)/2),top:900+Math.max(0,Math.floor((260-head.height)/2))});
  } else if (slide.type === "feature") {
    const photo = await sharp(assetFor(slide.imageRole)).resize(W,H,{fit:"cover",position:"attention"}).modulate({brightness:.55,saturation:.8}).jpeg({quality:94}).toBuffer();
    base = sharp(photo);
    const head = await textLayer(slide.headline,{width:900,height:300,startSize:82,minSize:48,color:"#fff",font:"serif"});
    const body = await textLayer(slide.body,{width:820,height:270,startSize:34,minSize:26,color:"#eef2f7",font:"sans-serif"});
    composites.push({input:Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#11182766"/>${masthead(W)}${pill(slide.label,400,360,280)}${footer(W,H,source,index,total,{dark:true})}</svg>`),left:0,top:0},{input:head.buffer,left:Math.round((W-head.width)/2),top:490},{input:body.buffer,left:Math.round((W-body.width)/2),top:850});
  } else if (slide.type === "watch") {
    const head = await textLayer(slide.headline,{width:900,height:250,startSize:64,minSize:42,font:"serif"});
    composites.push({input:Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${masthead(W)}${pill(slide.label,400,205,280)}${footer(W,H,source,index,total)}</svg>`),left:0,top:0},{input:head.buffer,left:Math.round((W-head.width)/2),top:300});
    let y = 615;
    for (let i=0;i<(slide.bullets||[]).length;i++) {
      const bullet = await textLayer((slide.bullets||[])[i],{width:760,height:145,startSize:31,minSize:24,font:"sans-serif",align:"left"});
      composites.push({input:Buffer.from(`<svg width="${W}" height="180" xmlns="http://www.w3.org/2000/svg"><circle cx="96" cy="48" r="27" fill="${BRAND.accent}"/><text x="96" y="57" text-anchor="middle" fill="${BRAND.ink}" font-family="sans-serif" font-size="24" font-weight="800">${i+1}</text></svg>`),left:0,top:y-16},{input:bullet.buffer,left:160,top:y});
      y += 190;
    }
  } else if (slide.type === "cta") {
    const photo = await sharp(assetFor(slide.imageRole)).resize(W,H,{fit:"cover",position:"attention"}).modulate({brightness:.38,saturation:.65}).jpeg({quality:94}).toBuffer();
    base = sharp(photo);
    const head = await textLayer(slide.headline,{width:900,height:360,startSize:78,minSize:46,color:"#fff",font:"serif"});
    const body = await textLayer(slide.body,{width:820,height:130,startSize:34,minSize:26,color:"#fff",font:"sans-serif"});
    composites.push({input:Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="#11182777"/>${masthead(W)}${pill(slide.label,395,300,290)}${footer(W,H,source,index,total,{dark:true})}</svg>`),left:0,top:0},{input:head.buffer,left:Math.round((W-head.width)/2),top:455},{input:body.buffer,left:Math.round((W-body.width)/2),top:930});
  } else {
    const isImpact = slide.type === "impact", isContext = slide.type === "context";
    const head = await textLayer(slide.headline,{width:900,height:300,startSize:isImpact?74:66,minSize:42,font:"serif"});
    const body = await textLayer(slide.body,{width:820,height:330,startSize:34,minSize:25,font:"sans-serif"});
    composites.push({input:Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${masthead(W)}${pill(slide.label,390,220,300)}${isImpact?`<rect x="60" y="390" width="14" height="520" fill="${BRAND.accent}"/>`:""}${isContext?`<circle cx="540" cy="410" r="92" fill="${BRAND.ink}"/><text x="540" y="430" text-anchor="middle" fill="${BRAND.accent}" font-family="serif" font-size="74" font-weight="700">↗</text>`:""}${footer(W,H,source,index,total)}</svg>`),left:0,top:0},{input:head.buffer,left:Math.round((W-head.width)/2),top:isContext?535:390},{input:body.buffer,left:Math.round((W-body.width)/2),top:isContext?860:790});
  }
  return base.composite(composites).jpeg({quality:94,chromaSubsampling:"4:4:4"}).toBuffer();
}

async function renderAndStore(draft: DraftRow, plan: SocialPlan, media: Map<string,MediaRow>, jobId: string) {
  const images: Record<string,Buffer> = {};
  for (const role of ["hero","inline_1","inline_2"] as const) {
    const row = media.get(role);
    const url = absoluteMediaUrl(row?.hero_path || row?.social_portrait_path);
    if (url) images[role] = await fetchImage(url);
  }
  if (!images.hero) throw new Error("SOCIAL_HERO_DOWNLOAD_MISSING");
  const source = sourceLabel(draft);
  const urls: string[] = [];
  for (let i=0;i<plan.carousel.slides.length;i++) {
    const slide = plan.carousel.slides[i];
    const bytes = await renderSlide(slide,i+1,plan.carousel.slides.length,source,images);
    const key = `social/${draft.slug}/${jobId}/carousel-${String(i+1).padStart(2,"0")}-${slide.type}-1080x1350.jpg`;
    const stored = await putPublicObject(key,bytes,"image/jpeg");
    if (!stored) throw new Error("SOCIAL_R2_WRITE_SKIPPED");
    urls.push(publicAssetUrl(key));
  }
  return { imageUrls: urls };
}

function doguOneToken() {
  return String(process.env.DOGU_ONE_SERVICE_TOKEN || process.env.DOGU_ONE_API_TOKEN || process.env.DOGU_ONE_TOKEN || "").trim();
}

async function publishInstagram(imageUrls: string[], plan: SocialPlan) {
  const token = doguOneToken();
  if (!token) throw new Error("DOGU_ONE_SERVICE_TOKEN_MISSING");
  const base = String(process.env.DOGU_ONE_BASE_URL || "https://dogu.one").replace(/\/$/,"");
  const hashtags = (plan.hashtags || []).map(value => `#${String(value).replace(/^#+/,"").replace(/\s+/g,"")}`).join(" ");
  const caption = `${plan.caption.trim()}\n\n${hashtags}`.trim();
  const response = await fetch(`${base}/api/v1/invoke`,{
    method:"POST",
    headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
    body:JSON.stringify({id:"publish.instagram.publish",input:{project:PROJECT,imageUrls,caption,confirmation:`PUBLISH INSTAGRAM ${PROJECT}`}}),
    signal:AbortSignal.timeout(300_000)
  });
  const text = await response.text();
  let payload: any = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = { raw: text.slice(0,1000) }; }
  if (!response.ok) throw new Error(`DOGU_ONE_INSTAGRAM_${response.status}:${JSON.stringify(payload).slice(0,1400)}`);
  if (!payload?.mediaId) throw new Error(`DOGU_ONE_INSTAGRAM_INVALID_RESPONSE:${JSON.stringify(payload).slice(0,1000)}`);
  return payload as PublishResult;
}

async function saveFailure(job: JobRow, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const terminal = job.attempts >= 6;
  const delayMinutes = Math.min(360,15 * Math.pow(2,Math.max(0,job.attempts-1)));
  await db().query(`UPDATE social_jobs SET status=$2,last_error=$3,next_attempt_at=CASE WHEN $2='failed' THEN next_attempt_at ELSE NOW()+($4::text||' minutes')::interval END,locked_at=NULL,updated_at=NOW() WHERE id=$1`,[job.id,terminal?"failed":"retry_wait",message.slice(0,4000),delayMinutes]);
  return { status: terminal ? "failed" : "retry_wait", error: message, attempts: job.attempts, retryInMinutes: terminal ? null : delayMinutes };
}

export async function runSocialAutomation() {
  await ensureSocialSchema();
  await discoverJobs();
  if (!doguOneToken()) return { status:"skipped", reason:"dogu_one_service_token_missing" };
  const interval = await socialIntervalOpen();
  if (!interval.open) return { status:"skipped", reason:"social_interval", ...interval };
  const job = await claimJob();
  if (!job) return { status:"skipped", reason:"no_social_job", intervalMinutes:interval.intervalMinutes };
  try {
    const draft = await getDraft(job.draft_id);
    let plan = job.plan;
    if (!plan) {
      plan = await generatePlan(draft);
      await db().query(`UPDATE social_jobs SET plan=$2::jsonb,updated_at=NOW() WHERE id=$1`,[job.id,JSON.stringify(plan)]);
    }
    let assets = job.assets;
    if (!assets?.imageUrls?.length) {
      const media = await getMedia(job.draft_id);
      assets = await renderAndStore(draft,plan,media,job.id);
      await db().query(`UPDATE social_jobs SET assets=$2::jsonb,updated_at=NOW() WHERE id=$1`,[job.id,JSON.stringify(assets)]);
    }
    let published = assets.publishResult;
    if (!published?.mediaId) {
      published = await publishInstagram(assets.imageUrls || [],plan);
      assets = { ...assets, publishResult: published };
      await db().query(`UPDATE social_jobs SET assets=$2::jsonb,published_object_id=$3,updated_at=NOW() WHERE id=$1`,[job.id,JSON.stringify(assets),String(published.mediaId)]);
    }
    const tx = await db().connect();
    try {
      await tx.query("BEGIN");
      await tx.query(`INSERT INTO social_publications (publication,content_slug,platform,account_id,object_id,object_type,status,asset_url,published_at,metadata) VALUES ($1,$2,'instagram',$3,$4,'carousel','published',$5,NOW(),$6::jsonb) ON CONFLICT (platform,object_id) DO UPDATE SET status='published',updated_at=NOW(),metadata=EXCLUDED.metadata`,[PROJECT,draft.slug,published.instagramBusinessAccountId||null,String(published.mediaId),assets.imageUrls?.[0]||null,JSON.stringify({jobId:job.id,imageCount:published.imageCount||assets.imageUrls?.length||0,plan})]);
      await tx.query(`UPDATE social_jobs SET status='published',published_object_id=$2,published_at=NOW(),locked_at=NULL,updated_at=NOW(),last_error=NULL WHERE id=$1`,[job.id,String(published.mediaId)]);
      await tx.query("COMMIT");
    } catch (error) { await tx.query("ROLLBACK"); throw error; } finally { tx.release(); }
    return { status:"published", jobId:job.id, slug:draft.slug, mediaId:String(published.mediaId), imageCount:assets.imageUrls?.length||0, intervalMinutes:interval.intervalMinutes };
  } catch (error) {
    return { jobId:job.id, slug:job.content_slug, ...(await saveFailure(job,error)) };
  }
}
