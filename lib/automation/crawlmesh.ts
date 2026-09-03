const BASE = (process.env.CRAWLMESH_BASE_URL || "https://crawlmesh.kvar.one").replace(/\/+$/, "");

function serviceToken() {
  const value = process.env.BROWSERMESH_SERVICE_TOKEN?.trim();
  if (!value) throw new Error("BROWSERMESH_SERVICE_TOKEN is not configured");
  return value;
}

async function request(path: string, init: RequestInit = {}, timeoutMs = 120_000) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${serviceToken()}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers || {})
    },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store"
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`CRAWLMESH_HTTP_${response.status}:${text.slice(0, 1000)}`);
  return { text, contentType: response.headers.get("content-type") };
}

export type CrawlIngestResult = {
  id: string;
  method: string;
  central?: {
    documentId: string;
    revisionId: string;
    documentCreated: boolean;
    revisionCreated: boolean;
    canonicalUrl: string;
  } | null;
  provenance?: { contentHash?: string; canonicalUrl?: string };
  content?: { hash?: string };
  metadata?: Record<string, unknown>;
  images?: Array<Record<string, unknown>>;
};

export async function ingestSource(params: {
  url: string;
  sourceItemId: string;
  sourceName: string;
  feedUrl: string;
}): Promise<CrawlIngestResult> {
  const { text } = await request("/v1/ingest", {
    method: "POST",
    body: JSON.stringify({
      url: params.url,
      mode: "auto",
      assetPolicy: "manifest",
      maxAssets: 12,
      discoveryContext: {
        system: "businessfuture.today",
        channel: "rss",
        sourceItemId: params.sourceItemId,
        sourceName: params.sourceName,
        fedUrl: iparams.feedUrl
      }
    })
  }, 150_000);
  return JSON.parse(text);
}

export async function bundleText(
  id: string,
  file: "content.md" | "metadata.json" | "assets.json" | "report.json"
) {
  return (await request(`/v1/ingests/${encodeURIComponent(id)}/${file}`, {}, 30_000)).text;
}

export async function bundleJson<T = unknown>(
  id: string,
  file: "metadata.json" | "assets.json" | "report.json"
): Promise<T> {
  return JSON.parse(await bundleText(id, file)) as T;
}
