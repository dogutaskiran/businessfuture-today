import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const ARTICLES_DIR = path.join(CONTENT_DIR, "articles");
const PUBLIC_DIR = path.join(ROOT, "public");
const CONTENT_URL = (process.env.PUBLICATION_CONTENT_URL || "https://dogu.one/api/publications/business-future-today/content").replace(/\/+$/, "");

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const xml = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

const response = await fetch(`${CONTENT_URL}?status=published&limit=500`, {
  headers: { accept: "application/json", "user-agent": "businessfuture.today-static-build" },
});
if (!response.ok) throw new Error(`Doğu One content export failed: ${response.status} ${response.statusText}`);
const payload = await response.json();
const stories = Array.isArray(payload.stories) ? payload.stories : payload.items;
if (!Array.isArray(stories) || stories.length === 0) throw new Error("Doğu One returned no published stories; refusing to publish an empty site");

await rm(ARTICLES_DIR, { recursive: true, force: true });
await mkdir(ARTICLES_DIR, { recursive: true });
await mkdir(PUBLIC_DIR, { recursive: true });

for (const story of stories) {
  const folder = path.join(ARTICLES_DIR, story.slug);
  await mkdir(folder, { recursive: true });
  const article = {
    schemaVersion: 2,
    publication: "business-future-today",
    id: story.id || null,
    slug: story.slug,
    kicker: story.kicker || "",
    title: story.title,
    dek: story.dek || "",
    category: story.category || "",
    readTime: story.readTime || "",
    publishedAt: story.publishedAt || null,
    sources: story.sourceUrls || [],
    socialCaption: story.socialCaption || "",
    media: { hero: story.heroImage || null, card: story.cardImage || null, og: story.ogImage || null, socialSquare: story.socialSquareImage || null, socialPortrait: story.socialPortraitImage || null, alt: story.imageAlt || null, credit: story.imageCredit || null, licenseStatus: story.licenseStatus || null, inline: story.inlineImages || [] }
  };
  await writeFile(path.join(folder, "article.json"), json(article), "utf8");
  await writeFile(path.join(folder, "body.md"), `${String(story.bodyMarkdown || "").trim()}\n`, "utf8");
}

await writeFile(path.join(CONTENT_DIR, "index.json"), json(stories), "utf8");
await writeFile(path.join(CONTENT_DIR, "media-manifest.json"), json(stories.map((story) => ({ slug: story.slug, hero: story.heroImage || null, card: story.cardImage || null, og: story.ogImage || null, socialSquare: story.socialSquareImage || null, socialPortrait: story.socialPortraitImage || null, inline: story.inlineImages || [], imageCredit: story.imageCredit || null, licenseStatus: story.licenseStatus || null }))), "utf8");

const items = stories.slice(0, 100).map((story) => {
  const link = `https://businessfuture.today/story/${encodeURIComponent(story.slug)}/`;
  const pubDate = new Date(story.publishedAt || Date.now()).toUTCString();
  return `    <item>\n      <title>${xml(story.title)}</title>\n      <link>${link}</link>\n      <guid isPermaLink="true">${link}</guid>\n      <pubDate>${pubDate}</pubDate>\n      <description>${xml(story.dek || "")}</description>\n    </item>`;
}).join("\n");
const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Business Future Today</title>\n    <link>https://businessfuture.today/</link>\n    <description>What changes business next.</description>\n    <language>en</language>\n${items}\n  </channel>\n</rss>\n`;
await writeFile(path.join(PUBLIC_DIR, "rss.xml"), rss, "utf8");
await writeFile(path.join(PUBLIC_DIR, "feed.xml"), rss, "utf8");
console.log(JSON.stringify({ source: CONTENT_URL, exported: stories.length, rssItems: Math.min(100, stories.length) }));
