import { createHash } from "node:crypto";
import Parser from "rss-parser";
import { db } from "@/lib/db";
import { SOURCES, type SourceConfig } from "@/lib/automation/sources";
import { datedPrefix, putSourceObject } from "@/lib/storage/r2";

const parser: Parser<any, any> = new Parser({
  timeout: 12_000,
  headers: { "User-Agent": "BusinessFutureToday/0.6 (+https://businessfuture.today)" },
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"]
    ]
  }
} as any);

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
function stripHtml(value?: string | null) { return (value ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2400); }
function safeName(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "feed"; }

async function upsertSource(source: SourceConfig) {
  const result = await db().query<{ id: string }>(
    `INSERT INTO sources (name, url, category, weight) VALUES ($1,$2,$3,$4)
     ON CONFLICT (url) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, weight=EXCLUDED.weight RETURNING id`,
    [source.name, source.url, source.category, source.weight]
  );
  return result.rows[0].id;
}

export async function ingestSources() {
  let feedsOk = 0, feedsFailed = 0, seen = 0, inserted = 0, updated = 0, archivedFeeds = 0;
  const prefix = datedPrefix();

  for (const source of SOURCES) {
    const sourceId = await upsertSource(source);
    try {
      const response = await fetch(source.url, {
        headers: { "user-agent": "BusinessFutureToday/0.6 (+https://businessfuture.today)" },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000)
      });
      if (!response.ok) throw new Error(`FEED_HTTP_${response.status}`);

      const rawFeed = await response.text();
      const feedName = safeName(source.name);
      try {
        await putSourceObject(`rss/raw/${prefix}/${feedName}.xml`, rawFeed, response.headers.get("content-type") || "application/xml; charset=utf-8");
        archivedFeeds += 1;
      } catch (archiveError) {
        console.error(`feed archive failed: ${source.name}`, archiveError);
      }

      const feed = await parser.parseString(rawFeed);
      feedsOk += 1;
      const snapshotItems: any[] = [];

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

        snapshotItems.push({
          id: itemId,
          guid: item.guid ?? null,
          url,
          title,
          summary,
          author: item.creator || null,
          publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
          media
        });

        seen += 1;
        const result = await db().query<{ inserted: boolean }>(
          `INSERT INTO source_items (id, source_id, url, title, summary, author, published_at, raw)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
           ON CONFLICT (url) DO UPDATE SET raw=source_items.raw || EXCLUDED.raw
           RETURNING (xmax = 0) AS inserted`,
          [itemId, sourceId, url, title, summary, item.creator || null,
           publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt.toISOString() : null,
           JSON.stringify({ guid: item.guid ?? null, media })]
        );
        if (result.rows[0]?.inserted) inserted += 1; else updated += 1;
      }

      try {
        await putSourceObject(
          `rss/snapshots/${prefix}/${feedName}.json`,
          JSON.stringify({
            source: { name: source.name, url: source.url, category: source.category, weight: source.weight },
            fetchedAt: new Date().toISOString(),
            title: feed.title || null,
            link: feed.link || null,
            items: snapshotItems
          }),
          "application/json; charset=utf-8"
        );
      } catch (snapshotError) {
        console.error(`feed snapshot archive failed: ${source.name}`, snapshotError);
      }

      await db().query(`UPDATE sources SET last_fetched_at=NOW() WHERE id=$1`, [sourceId]);
    } catch (error) {
      feedsFailed += 1;
      console.error(`feed failed: ${source.name}`, error);
    }
  }

  return { feedsOk, feedsFailed, seen, inserted, updated, archivedFeeds };
}
