import { randomUUID } from "node:crypto";
import * as cheerio from "cheerio";
import sharp from "sharp";
import { db } from "@/lib/db";
import { bundleJson } from "@/lib/automation/crawlmesh";

type Candidate = {
  url: string;
  kind: string;
  ordinal: number;
  widthHint: number | null;
  heightHint: number | null;
  score: number;
  metadata?: Record<string, unknown>;
};

type ProbedCandidate = Candidate & {
  actualWidth: number | null;
  actualHeight: number | null;
  contentType: string | null;
  bytes: number | null;
};

function absolute(raw: string | null | undefined, pageUrl: string) {
  if (!raw) return null;
  const value = raw.trim().replace(/&amp;/g, "&");
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return null;
  try { return new URL(value, pageUrl).toString(); } catch { return null; }
}

function parseIntSafe(value: string | null | undefined) {
  const n = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function srcsetEntries(srcset: string | undefined, pageUrl: string) {
  if (!srcset) return [] as { url: string; width: number | null }[];
  return srcset.split(",").map((part) => part.trim()).map((part) => {
    const [rawUrl, descriptor] = part.split(/\s+/, 2);
    const url = absolute(rawUrl, pageUrl);
    const width = descriptor?.endsWith("w") ? parseIntSafe(descriptor.slice(0, -1)) : null;
    return url ? { url, width } : null;
  }).filter(Boolean) as { url: string; width: number | null }[];
}

function originalVariants(url: string) {
  const out = new Set<string>([url]);
  try {
    const u = new URL(url);
    const resizeKeys = ["resize", "w", "width", "h", "height", "fit", "crop", "quality", "q", "auto"];
    if (resizeKeys.some((key) => u.searchParams.has(key))) {
      const stripped = new URL(u.toString());
      for (const key of resizeKeys) stripped.searchParams.delete(key);
      out.add(stripped.toString());
    }
    const m = u.pathname.match(/^(.*?)-([0-9]{3,5})x([0-9]{3,5})(\.[a-zA-Z0-9]+)$/);
    if (m) {
      const candidate = new URL(u.toString());
      candidate.pathname = `${m[1]}${m[4]}`;
      out.add(candidate.toString());
    }
  } catch {}
  return [...out];
}

function addCandidate(map: Map<string, Candidate>, candidate: Candidate) {
  for (const url of originalVariants(candidate.url)) {
    if (/sprite|logo|icon|avatar|emoji|favicon/i.test(url)) continue;
    const existing = map.get(url);
    const variantBonus = url === candidate.url ? 0 : 8;
    const next = { ...candidate, url, score: candidate.score + variantBonus, metadata: { ...(candidate.metadata || {}), derivedOriginalCandidate: url !== candidate.url } };
    if (!existing || next.score > existing.score || (next.widthHint || 0) > (existing.widthHint || 0)) map.set(url, next);
  }
}

function collectJsonImages(value: unknown, output: string[]) {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(value)) output.push(value);
    return;
  }
  if (Array.isArray(value)) { value.forEach((item) => collectJsonImages(item, output)); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (["image", "thumbnailUrl", "contentUrl", "url"].includes(key)) collectJsonImages(child, output);
    else if (typeof child === "object") collectJsonImages(child, output);
  }
}

export async function discoverSourceImageCandidates(params: { draftId: string; pageUrl: string; rssImageUrl?: string | null }) {
  try {
    const ref = await db().query<{ crawl_ingest_id: string }>(
      `SELECT crawl_ingest_id FROM source_items
        WHERE crawl_ingest_id IS NOT NULL AND (url=$1 OR canonical_url=$1)
        ORDER BY acquired_at DESC NULLS LAST LIMIT 1`,
      [params.pageUrl]
    );
    const ingestId = ref.rows[0]?.crawl_ingest_id;
    if (ingestId) {
      const assets = await bundleJson<Array<{ sourceUrl?: string; role?: string }>>(ingestId, "assets.json");
      if (assets?.length) {
        const meshCandidates = new Map<string, Candidate>();
        let meshOrdinal = 0;
        for (const asset of assets) {
          const url = absolute(asset.sourceUrl, params.pageUrl);
          if (!url) continue;
          const score = asset.role === "og" ? 104 : asset.role === "social" ? 96 : 88;
          addCandidate(meshCandidates, {
            url,
            kind: `crawlmesh:${asset.role || "content"}`,
            ordinal: meshOrdinal++,
            widthHint: null,
            heightHint: null,
            score,
            metadata: { crawlmeshIngestId: ingestId }
          });
        }
        const sorted = [...meshCandidates.values()]
          .sort((a, b) => b.score - a.score || a.ordinal - b.ordinal)
          .slice(0, 16);
        await db().query(`DELETE FROM source_media_candidates WHERE draft_id=$1`, [params.draftId]);
        for (const candidate of sorted) {
          await db().query(
            `INSERT INTO source_media_candidates
              (id,draft_id,page_url,image_url,source_kind,ordinal,width_hint,height_hint,score,metadata)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
             ON CONFLICT (draft_id,image_url) DO UPDATE SET
               source_kind=EXCLUDED.source_kind,ordinal=EXCLUDED.ordinal,
               width_hint=EXCLUDED.width_hint,height_hint=EXCLUDED.height_hint,
               score=EXCLUDED.score,metadata=EXCLUDED.metadata,updated_at=NOW()`,
            [randomUUID(), params.draftId, params.pageUrl, candidate.url, candidate.kind, candidate.ordinal,
             candidate.widthHint, candidate.heightHint, candidate.score, JSON.stringify(candidate.metadata || {})]
          );
        }
        if (sorted.length) return sorted;
      }
    }
  } catch (error) {
    console.error("CrawlMesh source-media manifest fallback", error);
  }

  const response = await fetch(params.pageUrl, { headers: { "user-agent": "BusinessFutureToday/0.5 (+https://businessfuture.today)" }, redirect: "follow", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`SOURCE_PAGE_HTTP_${response.status}`);
  const html = (await response.text()).slice(0, 5_000_000);
  const $ = cheerio.load(html);
  const candidates = new Map<string, Candidate>();
  let ordinal = 0;

  if (params.rssImageUrl) {
    const url = absolute(params.rssImageUrl, params.pageUrl);
    if (url) addCandidate(candidates, { url, kind: "rss", ordinal: ordinal++, widthHint: null, heightHint: null, score: 92 });
  }

  const ogUrl = $("meta[property='og:image'],meta[property='og:image:url'],meta[property='og:image:secure_url']").first().attr("content");
  const ogWidth = parseIntSafe($("meta[property='og:image:width']").first().attr("content"));
  const ogHeight = parseIntSafe($("meta[property='og:image:height']").first().attr("content"));
  const og = absolute(ogUrl, params.pageUrl);
  if (og) addCandidate(candidates, { url: og, kind: "og", ordinal: ordinal++, widthHint: ogWidth, heightHint: ogHeight, score: 90 + Math.min(15, (ogWidth || 0) / 400) });

  const twitter = absolute($("meta[name='twitter:image'],meta[property='twitter:image']").first().attr("content"), params.pageUrl);
  if (twitter) addCandidate(candidates, { url: twitter, kind: "twitter", ordinal: ordinal++, widthHint: null, heightHint: null, score: 84 });

  const imageSrc = absolute($("link[rel='image_src']").first().attr("href"), params.pageUrl);
  if (imageSrc) addCandidate(candidates, { url: imageSrc, kind: "image_src", ordinal: ordinal++, widthHint: null, heightHint: null, score: 82 });

  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const text = $(el).text();
      const parsed = JSON.parse(text);
      const urls: string[] = [];
      collectJsonImages(parsed, urls);
      for (const raw of urls.slice(0, 12)) {
        const url = absolute(raw, params.pageUrl);
        if (url) addCandidate(candidates, { url, kind: "jsonld", ordinal: ordinal++, widthHint: null, heightHint: null, score: 78 });
      }
    } catch {}
  });

  $("picture source[srcset], img[srcset]").each((_, el) => {
    for (const entry of srcsetEntries($(el).attr("srcset"), params.pageUrl)) {
      addCandidate(candidates, { url: entry.url, kind: "srcset", ordinal: ordinal++, widthHint: entry.width, heightHint: null, score: 72 + Math.min(24, (entry.width || 0) / 200) });
    }
  });

  $("article img, main img, img").slice(0, 80).each((_, el) => {
    const node = $(el);
    const width = parseIntSafe(node.attr("width"));
    const height = parseIntSafe(node.attr("height"));
    for (const attr of ["src", "data-src", "data-original", "data-lazy-src"]) {
      const url = absolute(node.attr(attr), params.pageUrl);
      if (url) addCandidate(candidates, { url, kind: `img:${attr}`, ordinal: ordinal++, widthHint: width, heightHint: height, score: 54 + Math.min(20, (width || 0) / 200), metadata: { alt: node.attr("alt") || null } });
    }
  });

  const sorted = [...candidates.values()].sort((a, b) => b.score - a.score || (b.widthHint || 0) - (a.widthHint || 0) || a.ordinal - b.ordinal).slice(0, 16);
  await db().query(`DELETE FROM source_media_candidates WHERE draft_id=$1`, [params.draftId]);
  for (const candidate of sorted) {
    await db().query(`INSERT INTO source_media_candidates (id,draft_id,page_url,image_url,source_kind,ordinal,width_hint,height_hint,score,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) ON CONFLICT (draft_id,image_url) DO UPDATE SET source_kind=EXCLUDED.source_kind,ordinal=EXCLUDED.ordinal,width_hint=EXCLUDED.width_hint,height_hint=EXCLUDED.height_hint,score=EXCLUDED.score,metadata=EXCLUDED.metadata,updated_at=NOW()`, [randomUUID(), params.draftId, params.pageUrl, candidate.url, candidate.kind, candidate.ordinal, candidate.widthHint, candidate.heightHint, candidate.score, JSON.stringify(candidate.metadata || {})]);
  }
  return sorted;
}

async function probe(candidate: Candidate): Promise<ProbedCandidate | null> {
  try {
    const response = await fetch(candidate.url, { headers: { "user-agent": "BusinessFutureToday/0.5 (+https://businessfuture.today)", accept: "image/avif,image/webp,image/png,image/jpeg,*/*" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 20_000_000) return null;
    const info = await sharp(bytes).metadata();
    const width = info.width || null, height = info.height || null;
    if ((width || 0) < 600 || (height || 0) < 300) return null;
    const areaBonus = width && height ? Math.min(45, (width * height) / 250_000) : 0;
    return { ...candidate, score: candidate.score + areaBonus, actualWidth: width, actualHeight: height, contentType, bytes: bytes.length };
  } catch { return null; }
}

export async function selectBestSourceImage(params: { draftId: string; pageUrl: string; rssImageUrl?: string | null; rank?: number }) {
  const discovered = await discoverSourceImageCandidates(params);
  const shortlist = discovered.slice(0, 7);
  const probed: ProbedCandidate[] = [];
  for (const candidate of shortlist) {
    const result = await probe(candidate);
    if (result) probed.push(result);
    if (result && (result.actualWidth || 0) >= 2400 && (result.actualHeight || 0) >= 1200) break;
  }
  probed.sort((a, b) => b.score - a.score || ((b.actualWidth || 0) * (b.actualHeight || 0)) - ((a.actualWidth || 0) * (a.actualHeight || 0)));
  await db().query(`UPDATE source_media_candidates SET selected=false WHERE draft_id=$1`, [params.draftId]);
  for (const item of probed) {
    await db().query(`UPDATE source_media_candidates SET actual_width=$3,actual_height=$4,content_type=$5,bytes=$6,score=$7,updated_at=NOW() WHERE draft_id=$1 AND image_url=$2`, [params.draftId, item.url, item.actualWidth, item.actualHeight, item.contentType, item.bytes, item.score]);
  }
  const rank = Math.max(0, params.rank || 0);
  const best = probed[Math.min(rank, Math.max(0, probed.length - 1))] || null;
  if (best) await db().query(`UPDATE source_media_candidates SET selected=true WHERE draft_id=$1 AND image_url=$2`, [params.draftId, best.url]);
  return best;
}
