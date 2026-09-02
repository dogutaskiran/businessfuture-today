import mediaManifest from "@/content/media-manifest.json";
import { putPublicObject, putSourceObject, publicAssetUrl } from "@/lib/storage/r2";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ManifestRow = (typeof mediaManifest)[number];

function extension(contentType: string | null, url: string) {
  const mime = (contentType || "").split(";")[0].trim().toLowerCase();
  const byMime: Record<string, string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/avif":"avif", "image/gif":"gif", "image/svg+xml":"svg" };
  if (byMime[mime]) return { ext: byMime[mime], mime };
  const match = new URL(url).pathname.match(/\.([a-zA-Z0-9]{2,5})$/);
  const ext = match?.[1]?.toLowerCase() || "bin";
  return { ext, mime: mime || "application/octet-stream" };
}

async function fetchAsset(url: string) {
  const response = await fetch(url, { redirect: "follow", headers: { "user-agent": "BusinessFutureToday/0.6 (+https://businessfuture.today)" }, signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`FETCH_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 20_000_000) throw new Error("ASSET_TOO_LARGE");
  return { bytes, contentType: response.headers.get("content-type") };
}

async function archiveOriginal(slug: string, role: string, url: string) {
  const fetched = await fetchAsset(url);
  const format = extension(fetched.contentType, url);
  const key = `media/${slug}/source/${role}-original.${format.ext}`;
  await putSourceObject(key, fetched.bytes, format.mime);
  return `r2://businessfuture-source/${key}`;
}

async function mirrorPublic(slug: string, path: string) {
  const sourceUrl = /^https?:\/\//i.test(path) ? path : new URL(path, "https://businessfuture.today").toString();
  const fetched = await fetchAsset(sourceUrl);
  const filename = new URL(sourceUrl).pathname.split("/").filter(Boolean).pop();
  if (!filename) throw new Error("ASSET_FILENAME_MISSING");
  const key = `media/${slug}/${filename}`;
  await putPublicObject(key, fetched.bytes, fetched.contentType || "application/octet-stream");
  return publicAssetUrl(key);
}

async function migrate(row: ManifestRow) {
  const originals = Object.entries(row.originalCandidates || {}).filter((entry): entry is [string,string] => Boolean(entry[1]));
  const current = Object.entries(row.current || {}).filter((entry): entry is [string,string] => Boolean(entry[1]));
  const archived: Record<string,string> = {};
  const publicAssets: Record<string,string> = {};
  const errors: string[] = [];

  await Promise.all(originals.map(async ([role,url]) => {
    try { archived[role] = await archiveOriginal(row.slug, role.replace("inline","inline-"), url); }
    catch (error) { errors.push(`source:${role}:${error instanceof Error ? error.message : String(error)}`); }
  }));
  await Promise.all(current.map(async ([role,path]) => {
    try { publicAssets[role] = await mirrorPublic(row.slug, path); }
    catch (error) { errors.push(`public:${role}:${error instanceof Error ? error.message : String(error)}`); }
  }));
  return { slug: row.slug, archived, publicAssets, errors };
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") return new Response("Not found", { status: 404 });
  const url = new URL(request.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
  const limit = Math.max(1, Math.min(8, Number(url.searchParams.get("limit") || 4)));
  const rows = (mediaManifest as ManifestRow[]).slice(offset, offset + limit);
  const results = [];
  for (const row of rows) results.push(await migrate(row));
  return Response.json({ ok: true, offset, limit, total: mediaManifest.length, processed: results.length, failedAssets: results.reduce((sum,row)=>sum+row.errors.length,0), results });
}
