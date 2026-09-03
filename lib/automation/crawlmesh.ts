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
    documentCreated?: boolean;
    revisionCreated?: boolean;
    canonicalUrl?: string;
  } | null;
  provenance?: { contentHash?: string; canonicalUrl?: string };
  content?: { hash?: string };
  metadata?: Record<string, unknown>;
  images?: Array<Record<string, unknown>>;
};

type DiscoveryResponse = {
  ok: boolean;
  runId: string;
  results: Array<{
    ok: boolean;
    error?: string;
    ingestId?: string;
    documentId?: string;
    revisionId?: string;
    canonicalUrl?: string;
    method?: string;
  }>;
};

export async function ingestSource(params: {
  url: string;
  sourceItemId: string;
  sourceName: string;
  feedUrl: string;
}): Promise<CrawlIngestResult> {
  const runId = `rss-${params.sourceItemId.slice(0, 48).toLowerCase().replace(/[^a-z0-9._-]+/g, "-")}`;
  const { text } = await request("/v1/discoveries", {
    method: "POST",
    body: JSON.stringify({
      consumer: "businessfuture-network",
      consumerName: "Business Future Network",
      site: "businessfuture.today",
      siteUrl: "https://businessfuture.today",
      pipeline: "editorial",
      channel: "rss",
      runId,
      sourceUrl: params.feedUrl,
      items: [{
        url: params.url,
        externalId: params.sourceItemId,
        title: params.sourceName,
        metadata: { sourceName: params.sourceName }
      }],
      ingest: {
        mode: "auto",
        assetPolicy: "manifest",
        maxAssets: 12
      }
    })
  }, 180_000);

  const response = JSON.parse(text) as DiscoveryResponse;
  const item = response.results?.[0];
  if (!item?.ok || !item.ingestId || !item.documentId || !item.revisionId) {
    throw new Error(`CRAWLMESH_DISCOVERY_FAILED:${item?.error || "missing canonical refs"}`);
  }

  return {
    id: item.ingestId,
    method: item.method || "unknown",
    central: {
      documentId: item.documentId,
      revisionId: item.revisionId,
      canonicalUrl: item.canonicalUrl
    },
    provenance: { canonicalUrl: item.canonicalUrl }
  };
}

export async function bundleText(
  id: string,
  file: "content.md" | "metadata.json" | "assets.json" | "resources.json" | "provenance.json" | "report.json"
) {
  return (await request(`/v1/ingests/${encodeURIComponent(id)}/${file}`, {}, 30_000)).text;
}

export async function bundleJson<T = unknown>(
  id: string,
  file: "metadata.json" | "assets.json" | "resources.json" | "provenance.json" | "report.json"
): Promise<T> {
  return JSON.parse(await bundleText(id, file)) as T;
}
