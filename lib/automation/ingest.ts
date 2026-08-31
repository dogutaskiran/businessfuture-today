import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { db } from "@/lib/db";
import { SOURCES, type SourceConfig } from "@/lib/automation/sources";

const parser = new Parser({
  timeout: 12_000,
  headers: { "User-Agent": "BusinessFutureToday/0.2 (+https://businessfuture.today)" }
});

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stripHtml(value?: string | null) {
  return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2400);
}

async function upsertSource(source: SourceConfig) {
  const result = await db().query<{ id: string }>(
    `INSERT INTO sources (name, url, category, weight)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (url) DO UPDATE
       SET name=EXCLUDED.name, category=EXCLUDED.category, weight=EXCLUDED.weight
     RETURNING id`,
    [source.name, source.url, source.category, source.weight]
  );
  return result.rows[0].id;
}

export async function ingestSources() {
  let feedsOk = 0;
  let feedsFailed = 0;
  let inserted = 0;

  for (const source of SOURCES) {
    const sourceId = await upsertSource(source);
    try {
      const feed = await parser.parseURL(source.url);
      feedsOk += 1;

      for (const item of feed.items.slice(0, 30)) {
        const url = item.link?.trim();
        const title = item.title?.trim();
        if (!url || !title) continue;

        const summary = stripHtml(item.contentSnippet || item.content || item.summary);
        const dateValue = item.isoDate || item.pubDate || "";
        const publishedAt = dateValue ? new Date(dateValue) : null;
        const itemId = hash(`${source.url}:${item.guid || url}`);

        const result = await db().query(
          `INSERT INTO source_items
             (id, source_id, url, title, summary, author, published_at, raw)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
           ON CONFLICT (url) DO NOTHING`,
          [
            itemId, sourceId, url, title, summary, item.creator || null,
            publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
            JSON.stringify({ guid: item.guid ?? null })
          ]
        );
        inserted += result.rowCount ?? 0;
      }

      await db().query(`UPDATE sources SET last_fetched_at=NOW() WHERE id=$1`, [sourceId]);
    } catch (error) {
      feedsFailed += 1;
      console.error(`feed failed: ${source.name}`, error);
    }
  }

  return { feedsOk, feedsFailed, inserted };
}
