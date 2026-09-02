const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "726e58dee7f6dbc6504a4c160cc21f6f";
const SOURCE_BUCKET = process.env.BFT_SOURCE_BUCKET || "businessfuture-source";
const PUBLIC_BUCKET = process.env.BFT_PUBLIC_BUCKET || "businessfuture-public";
export const PUBLIC_ASSET_BASE_URL =
  process.env.BFT_PUBLIC_ASSET_BASE_URL || "https://assets.businessfuture.today";

function token() {
  return process.env.CLOUDFLARE_API_TOKEN || "";
}

function objectPath(bucket: string, key: string) {
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${bucket}/objects/${encodedKey}`;
}

async function putObject(bucket: string, key: string, body: string | Buffer, contentType: string) {
  const apiToken = token();
  if (!apiToken) {
    console.warn(`R2 mirror skipped: CLOUDFLARE_API_TOKEN is not configured (${bucket}/${key})`);
    return false;
  }

  const response = await fetch(objectPath(bucket, key), {
    method: "PUT",
    headers: {
      authorization: `Bearer ${apiToken}`,
      "content-type": contentType
    },
    body: body as any,
    signal: AbortSignal.timeout(30_000)
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 600);
    throw new Error(`R2_PUT_${response.status}:${bucket}/${key}:${detail}`);
  }
  return true;
}

export function datedPrefix(date = new Date()) {
  return date.toISOString().slice(0, 10).replaceAll("-", "/");
}

export async function putSourceObject(key: string, body: string | Buffer, contentType: string) {
  return putObject(SOURCE_BUCKET, key, body, contentType);
}

export async function putPublicObject(key: string, body: string | Buffer, contentType: string) {
  return putObject(PUBLIC_BUCKET, key, body, contentType);
}

export function publicAssetUrl(key: string) {
  return `${PUBLIC_ASSET_BASE_URL.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}
