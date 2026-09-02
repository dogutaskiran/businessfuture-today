import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;
const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const ARTICLES_DIR = path.join(CONTENT_DIR, "articles");

function connectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  return value;
}

function readTime(markdown) {
  const words = String(markdown || "").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(2, Math.ceil(words / 220))} min`;
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const pool = new Pool({
  connectionString: connectionString(),
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
});

try {
  const result = await pool.query(`
    SELECT d.id,d.slug,d.kicker,d.title,d.dek,d.category,d.body_markdown,d.source_urls,d.social_caption,d.published_at,
      h.hero_path,h.card_path,h.og_path,h.social_square_path,h.social_portrait_path,h.alt_text,h.attribution_text,h.source_image_url,h.license_status,h.license_basis,h.source_page_url,
      i1.hero_path inline1_path,i1.original_path inline1_original_path,i1.alt_text inline1_alt,i1.attribution_text inline1_credit,i1.source_image_url inline1_source_image_url,
      i2.hero_path inline2_path,i2.original_path inline2_original_path,i2.alt_text inline2_alt,i2.attribution_text inline2_credit,i2.source_image_url inline2_source_image_url
    FROM drafts d
    LEFT JOIN media_assets h ON h.draft_id=d.id AND h.role='hero'
    LEFT JOIN media_assets i1 ON i1.draft_id=d.id AND i1.role='inline_1'
    LEFT JOIN media_assets i2 ON i2.draft_id=d.id AND i2.role='inline_2'
    WHERE d.status='published'
    ORDER BY d.published_at DESC NULLS LAST,d.created_at DESC
    LIMIT 500
  `);

  await rm(ARTICLES_DIR, { recursive: true, force: true });
  await mkdir(ARTICLES_DIR, { recursive: true });

  const stories = [];
  const mediaManifest = [];

  for (const [index, row] of result.rows.entries()) {
    const folder = path.join(ARTICLES_DIR, row.slug);
    await mkdir(folder, { recursive: true });

    const inlineImages = [
      row.inline1_path ? { role: "inline_1", src: row.inline1_path, alt: row.inline1_alt || `Supporting image for ${row.title}`, credit: row.inline1_credit || null } : null,
      row.inline2_path ? { role: "inline_2", src: row.inline2_path, alt: row.inline2_alt || `Supporting image for ${row.title}`, credit: row.inline2_credit || null } : null
    ].filter(Boolean);

    const story = {
      slug: row.slug,
      kicker: row.kicker,
      title: row.title,
      dek: row.dek,
      readTime: readTime(row.body_markdown),
      category: row.category,
      featured: index === 0,
      bodyMarkdown: row.body_markdown,
      sourceUrls: row.source_urls || [],
      publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
      heroImage: row.hero_path,
      cardImage: row.card_path,
      ogImage: row.og_path,
      socialSquareImage: row.social_square_path,
      socialPortraitImage: row.social_portrait_path,
      imageAlt: row.alt_text,
      imageCredit: row.attribution_text,
      sourceImageCandidate: row.source_image_url,
      licenseStatus: row.license_status,
      inlineImages,
      generated: true
    };

    const article = {
      schemaVersion: 1,
      publication: "business-future-today",
      id: row.id,
      slug: row.slug,
      kicker: row.kicker,
      title: row.title,
      dek: row.dek,
      category: row.category,
      readTime: story.readTime,
      publishedAt: story.publishedAt,
      sources: story.sourceUrls,
      socialCaption: row.social_caption || "",
      media: {
        hero: row.hero_path,
        card: row.card_path,
        og: row.og_path,
        socialSquare: row.social_square_path,
        socialPortrait: row.social_portrait_path,
        alt: row.alt_text,
        credit: row.attribution_text,
        sourcePageUrl: row.source_page_url,
        sourceImageUrl: row.source_image_url,
        licenseStatus: row.license_status,
        licenseBasis: row.license_basis,
        inline: inlineImages
      }
    };

    await writeFile(path.join(folder, "article.json"), json(article), "utf8");
    await writeFile(path.join(folder, "body.md"), `${String(row.body_markdown || "").trim()}\n`, "utf8");

    stories.push(story);
    mediaManifest.push({
      slug: row.slug,
      sourcePageUrl: row.source_page_url,
      sourceImageUrl: row.source_image_url,
      licenseStatus: row.license_status,
      licenseBasis: row.license_basis,
      current: {
        hero: row.hero_path,
        card: row.card_path,
        og: row.og_path,
        socialSquare: row.social_square_path,
        socialPortrait: row.social_portrait_path,
        inline1: row.inline1_path,
        inline2: row.inline2_path
      },
      originalCandidates: {
        hero: row.source_image_url,
        inline1: row.inline1_source_image_url,
        inline2: row.inline2_source_image_url
      }
    });
  }

  await mkdir(CONTENT_DIR, { recursive: true });
  await writeFile(path.join(CONTENT_DIR, "index.json"), json(stories), "utf8");
  await writeFile(path.join(CONTENT_DIR, "media-manifest.json"), json(mediaManifest), "utf8");
  console.log(JSON.stringify({ exported: stories.length, contentDir: "content/articles", mediaManifest: mediaManifest.length }));
} finally {
  await pool.end();
}
