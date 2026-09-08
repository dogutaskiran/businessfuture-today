import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const ARTICLES_DIR = path.join(CONTENT_DIR, "articles");
const BASE = (process.env.PUBLICATION_CONTENT_URL || "https://dogu.one/api/publications/business-future-today/content").replace(/\/+$/, "");
const PAGE_SIZE = 200;

async function fetchAll() {
  const rows = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = `${BASE}?status=published&limit=${PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`Central publication content fetch failed: ${response.status} ${url}`);
    const payload = await response.json();
    const page = Array.isArray(payload.items) ? payload.items : Array.isArray(payload.stories) ? payload.stories : [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  if (!rows.length) throw new Error("Central publication content returned no published stories");
  return rows;
}

function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }

const rows = await fetchAll();
await rm(ARTICLES_DIR, { recursive: true, force: true });
await mkdir(ARTICLES_DIR, { recursive: true });

const stories = rows.map((row, index) => ({
  slug: row.slug,
  kicker: row.kicker || "",
  title: row.title,
  dek: row.dek || "",
  readTime: row.readTime || "2 min",
  category: row.category || "Technology",
  featured: index === 0,
  bodyMarkdown: row.bodyMarkdown || "",
  sourceUrls: Array.isArray(row.sourceUrls) ? row.sourceUrls : [],
  socialCaption: row.socialCaption || "",
  publishedAt: row.publishedAt || null,
  generated: true,
  heroImage: row.heroImage || null,
  cardImage: row.cardImage || null,
  ogImage: row.ogImage || null,
  socialSquareImage: row.socialSquareImage || null,
  socialPortraitImage: row.socialPortraitImage || null,
  imageAlt: row.imageAlt || null,
  imageCredit: row.imageCredit || null,
  sourceImageCandidate: row.sourceImageCandidate || null,
  licenseStatus: row.licenseStatus || null,
  inlineImages: Array.isArray(row.inlineImages) ? row.inlineImages : []
}));

const mediaManifest = [];
for (let index = 0; index < rows.length; index++) {
  const row = rows[index];
  const story = stories[index];
  const folder = path.join(ARTICLES_DIR, story.slug);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "body.md"), `${story.bodyMarkdown.trim()}\n`, "utf8");
  await writeFile(path.join(folder, "article.json"), json({
    schemaVersion: 2,
    publication: "business-future-today",
    id: row.id || null,
    slug: story.slug,
    kicker: story.kicker,
    title: story.title,
    dek: story.dek,
    category: story.category,
    readTime: story.readTime,
    publishedAt: story.publishedAt,
    sources: story.sourceUrls,
    socialCaption: story.socialCaption,
    media: {
      hero: story.heroImage,
      card: story.cardImage,
      og: story.ogImage,
      socialSquare: story.socialSquareImage,
      socialPortrait: story.socialPortraitImage,
      alt: story.imageAlt,
      credit: story.imageCredit,
      sourceImageUrl: story.sourceImageCandidate,
      licenseStatus: story.licenseStatus,
      inline: story.inlineImages
    }
  }), "utf8");
  mediaManifest.push({
    slug: story.slug,
    current: {
      hero: story.heroImage,
      card: story.cardImage,
      og: story.ogImage,
      socialSquare: story.socialSquareImage,
      socialPortrait: story.socialPortraitImage,
      inline: story.inlineImages
    },
    sourceImageUrl: story.sourceImageCandidate,
    licenseStatus: story.licenseStatus
  });
}

await writeFile(path.join(CONTENT_DIR, "index.json"), json(stories), "utf8");
await writeFile(path.join(CONTENT_DIR, "media-manifest.json"), json(mediaManifest), "utf8");
console.log(JSON.stringify({ publication: "business-future-today", source: BASE, exported: stories.length }));
