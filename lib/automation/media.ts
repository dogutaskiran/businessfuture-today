import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { db, ensureSchema } from "@/lib/db";

type DraftRow = { id:string; cluster_id:string; slug:string; title:string; dek:string; category:string; body_markdown:string; source_urls:string[] };
type SourceMedia = { pageUrl:string|null; imageUrl:string|null; licenseUrl:string|null; licenseStatus:string; licenseBasis:string; attribution:string|null; reusable:boolean };

function meta(html:string, key:string) {
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const patterns=[
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,`i`),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,`i`)
  ];
  for(const p of patterns){ const m=html.match(p); if(m?.[1]) return m[1].replace(/&amp;/g,"&"); }
  return null;
}

function licenseFromHtml(html:string) {
  const link=html.match(/<link[^>]+rel=["'][^"']*license[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1]
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*license[^"']*["']/i)?.[1];
  if(link) return link;
  const json=html.match(/["']license["']\s*:\s*["']([^"']+)["']/i)?.[1];
  return json || null;
}

function reusableLicense(licenseUrl:string|null) {
  if(!licenseUrl) return false;
  const value=licenseUrl.toLowerCase();
  return value.includes("creativecommons.org/licenses/by/") || value.includes("creativecommons.org/licenses/by-sa/") || value.includes("creativecommons.org/publicdomain/") || value.includes("creativecommons.org/publicdomain/zero/");
}

async function resolveSourceMedia(sourceUrls:string[], rssImageUrl:string|null):Promise<SourceMedia> {
  const pageUrl=sourceUrls[0] || null;
  if(!pageUrl) return {pageUrl:null,imageUrl:null,licenseUrl:null,licenseStatus:"none",licenseBasis:"No source page",attribution:null,reusable:false};
  try {
    const response=await fetch(pageUrl,{headers:{"user-agent":"BusinessFutureToday/0.3 (+https://businessfuture.today)"},redirect:"follow",signal:AbortSignal.timeout(12000)});
    if(!response.ok) throw new Error(`HTTP_${response.status}`);
    const html=(await response.text()).slice(0,2_500_000);
    const imageUrl=rssImageUrl || meta(html,"og:image") || meta(html,"twitter:image") || null;
    const licenseUrl=meta(html,"license") || licenseFromHtml(html);
    const reusable=reusableLicense(licenseUrl);
    const author=meta(html,"author");
    const site=meta(html,"og:site_name");
    return {
      pageUrl, imageUrl, licenseUrl,
      licenseStatus: reusable ? "reusable" : imageUrl ? "unknown" : "none",
      licenseBasis: reusable ? `Machine-readable reusable license: ${licenseUrl}` : imageUrl ? "Publisher image discovered, but no machine-readable reusable license was found" : "No source image discovered",
      attribution: author || site || (new URL(pageUrl)).hostname,
      reusable
    };
  } catch(error) {
    return {pageUrl,imageUrl:null,licenseUrl:null,licenseStatus:"unresolved",licenseBasis:error instanceof Error?error.message:"Source media lookup failed",attribution:null,reusable:false};
  }
}

async function downloadImage(url:string) {
  const response=await fetch(url,{headers:{"user-agent":"BusinessFutureToday/0.3 (+https://businessfuture.today)"},redirect:"follow",signal:AbortSignal.timeout(20000)});
  if(!response.ok) throw new Error(`IMAGE_HTTP_${response.status}`);
  const length=Number(response.headers.get("content-length")||0);
  if(length>15_000_000) throw new Error("SOURCE_IMAGE_TOO_LARGE");
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>15_000_000) throw new Error("SOURCE_IMAGE_TOO_LARGE");
  return bytes;
}

async function generateImage(draft:DraftRow, source:SourceMedia) {
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:300_000});
  const prompt=[
    "Create an original premium editorial hero image for Business Future Today, a modern business and technology publication.",
    `Article: ${draft.title}`,
    `Context: ${draft.dek}`,
    `Category: ${draft.category}.`,
    "Visual direction: sophisticated documentary/editorial photography or high-end conceptual business imagery; strong single focal idea; cinematic natural light; believable materials; contemporary; restrained; intelligent; suitable for a Financial Times / Bloomberg / MIT Technology Review caliber digital feature, while remaining visually original.",
    "Do not include text, captions, logos, trademarks, UI screenshots, watermarks, fake interfaces, or recognizable protected artwork. If companies or products are mentioned, communicate the idea without reproducing their logo or branded interface.",
    "Landscape composition, 3:2, with safe crop space for 16:9 and 1.91:1 derivatives.",
    source.imageUrl ? `A publisher source image was discovered but is NOT licensed for reuse by default. Do not copy it. Use only the article context to create an independent original visual.` : "No reusable source image is available; create an independent original visual."
  ].join("\n\n");
  const response=await client.responses.create({
    model:process.env.OPENAI_IMAGE_ORCHESTRATOR_MODEL || "gpt-5.6-terra",
    input:prompt,
    store:false,
    tools:[{type:"image_generation",model:process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",size:"1536x1024",quality:"medium",output_format:"webp"}],
    tool_choice:{type:"image_generation"}
  });
  const call=response.output.find((item:any)=>item.type==="image_generation_call") as any;
  if(!call?.result) throw new Error("OPENAI_IMAGE_RESULT_MISSING");
  return {bytes:Buffer.from(call.result,"base64"),prompt,responseId:response.id,model:process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"};
}

async function makeVariants(slug:string, bytes:Buffer) {
  const dir=path.join(process.cwd(),"public","media",slug);
  await mkdir(dir,{recursive:true});
  const original=path.join(dir,"original.webp");
  const hero=path.join(dir,"hero.webp");
  const card=path.join(dir,"card.webp");
  const og=path.join(dir,"og.webp");
  const normalized=sharp(bytes).rotate();
  await normalized.clone().resize(1600,1067,{fit:"cover",position:"attention",withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(original);
  await sharp(bytes).rotate().resize(1536,1024,{fit:"cover",position:"attention"}).webp({quality:82,effort:5}).toFile(hero);
  await sharp(bytes).rotate().resize(1200,675,{fit:"cover",position:"attention"}).webp({quality:80,effort:5}).toFile(card);
  await sharp(bytes).rotate().resize(1200,630,{fit:"cover",position:"attention"}).webp({quality:80,effort:5}).toFile(og);
  return {original:`/media/${slug}/original.webp`,hero:`/media/${slug}/hero.webp`,card:`/media/${slug}/card.webp`,og:`/media/${slug}/og.webp`};
}

export async function processArticleMedia() {
  await ensureSchema();
  const limit=Math.max(1,Math.min(5,Number(process.env.MEDIA_MAX_GENERATIONS || 2)));
  const rows=await db().query<DraftRow>(`
    SELECT d.id,d.cluster_id,d.slug,d.title,d.dek,d.category,d.body_markdown,d.source_urls
    FROM drafts d LEFT JOIN media_assets m ON m.draft_id=d.id AND m.role='hero'
    WHERE d.status='published' AND m.id IS NULL
    ORDER BY d.published_at DESC NULLS LAST,d.created_at DESC
    LIMIT $1
  `,[limit]);
  const results:any[]=[];
  for(const draft of rows.rows){
    const rssMedia = await db().query<{image_url:string|null}>(`
      SELECT COALESCE(si.raw->'media'->>'enclosure',si.raw->'media'->>'mediaContent',si.raw->'media'->>'mediaThumbnail') AS image_url
      FROM cluster_items ci JOIN source_items si ON si.id=ci.source_item_id
      WHERE ci.cluster_id=$1
        AND COALESCE(si.raw->'media'->>'enclosure',si.raw->'media'->>'mediaContent',si.raw->'media'->>'mediaThumbnail') IS NOT NULL
      LIMIT 1
    `,[draft.cluster_id]);
    const source=await resolveSourceMedia(draft.source_urls || [],rssMedia.rows[0]?.image_url || null);
    let bytes:Buffer; let sourceType:"source"|"generated"="generated"; let prompt:string|null=null; let generation:any=null;
    if(source.reusable && source.imageUrl){
      try { bytes=await downloadImage(source.imageUrl); sourceType="source"; }
      catch { generation=await generateImage(draft,source); bytes=generation.bytes; prompt=generation.prompt; }
    } else { generation=await generateImage(draft,source); bytes=generation.bytes; prompt=generation.prompt; }
    const paths=await makeVariants(draft.slug,bytes!);
    const assetId=randomUUID();
    const alt=`Editorial image for ${draft.title}`;
    const credit=sourceType==="source" ? source.attribution : "Illustration: Business Future Today";
    await db().query(`
      INSERT INTO media_assets (id,draft_id,role,source_type,source_page_url,source_image_url,license_status,license_basis,attribution_text,original_path,hero_path,card_path,og_path,mime_type,width,height,alt_text,prompt,metadata)
      VALUES ($1,$2,'hero',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'image/webp',1536,1024,$13,$14,$15::jsonb)
      ON CONFLICT (draft_id,role) DO NOTHING
    `,[assetId,draft.id,sourceType,source.pageUrl,source.imageUrl,source.licenseStatus,source.licenseBasis,credit,paths.original,paths.hero,paths.card,paths.og,alt,prompt,JSON.stringify({licenseUrl:source.licenseUrl,generationResponseId:generation?.responseId||null,generationModel:generation?.model||null})]);
    results.push({slug:draft.slug,sourceType,hero:paths.hero,sourceCandidate:source.imageUrl,licenseStatus:source.licenseStatus});
  }
  return results;
}
