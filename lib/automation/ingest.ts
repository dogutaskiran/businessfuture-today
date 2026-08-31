import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { db } from "@/lib/db";
import { SOURCES, type SourceConfig } from "@/lib/automation/sources";

const parser: Parser<any, any> = new Parser({
  timeout: 12_000,
  headers: { "User-Agent": "BusinessFutureToday/0.3 (+https://businessfuture.today)" },
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"]
    ]
  }
} as any);

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function stripHtml(value?: string | null) { return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2400); }

async function upsertSource(source: SourceConfig) {
  const result = await db().query<{ id: string }>(
    `INSERT INTO sources (name, url, category, weight) VALUES ($1,$2,$3,$4)
     ON CONFLICT (url) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, weight=EXCLUDED.weight RETURNING id`,
    [source.name, source.url, source.category, source.weight]
  );
  return result.rows[0].id;
}

export async function ingestSources() {
  let feedsOk = 0, feedsFailed = 0, inserted = 0;
  for (const source of SOURCES) {
    const sourceId = await upsertSource(source);
    try {
      const feed = await parser.parseURL(source.url); feedsOk += 1;
      for (const item of feed.items.slice(0, 30)) {
        const url = item.link?.trim(); const title = item.title?.trim();
        if (!url || !title) continue;
        const summary = stripHtml(item.contentSnippet || item.content || item.summary);
        const dateValue = item.isoDate || item.pubDate || "";
        const publishedAt = dateValue ? new Date(dateValue) : null;
        const itemId = hash(`${source.url}:${item.guid || url}`);
        const media = {
          enclosure: item.enclosure?.url || null,
          mediaContent: item.mediaContent?.$?.url || item.mediaContent?.url || null,
          mediaThumbnail: item.mediaThumbnail?.$?.url || item.mediaThumbnail?.url || null
        };
        const result = await db().query(
          `INSERT INTO source_items (id, source_id, url, title, summary, author, published_at, raw)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
           ON CONFLICT (url) DO UPDATE SET raw=source_items.raw || EXCLUDED.raw`,
          [itemId, sourceId, url, title, summary, item.creator || null,
           publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
           JSON.stringify({ guid: item.guid ?? null, media })]
        );
        if (result.rowCount && result.command === "INSERT") inserted += result.rowCount;
      }
      await db().query(`UPDATE sources SET last_fetched_at=NOW() WHERE id=$1`, [sourceId]);
    } catch (error) { feedsFailed += 1; console.error(`feed failed: ${source.name}`, error); }
  }
  return { feedsOk, feedsFailed, inserted };
}
