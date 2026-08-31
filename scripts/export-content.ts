import { writeFile } from "node:fs/promises";
import { db } from "../lib/db";

type Row = {
  slug: string; kicker: string; title: string; dek: string; category: "AI" | "Technology" | "Companies" | "Work" | "Tools";
  body_markdown: string; source_urls: string[]; published_at: Date | null;
  hero_path: string | null; card_path: string | null; og_path: string | null; alt_text: string | null; attribution_text: string | null;
  source_image_url: string | null; license_status: string | null;
};

async function main() {
  const result = await db().query<Row>(`
    SELECT d.slug,d.kicker,d.title,d.dek,d.category,d.body_markdown,d.source_urls,d.published_at,
           m.hero_path,m.card_path,m.og_path,m.alt_text,m.attribution_text,m.source_image_url,m.license_status
    FROM drafts d
    LEFT JOIN media_assets m ON m.draft_id=d.id AND m.role='hero'
    WHERE d.status='published'
    ORDER BY d.published_at DESC NULLS LAST, d.created_at DESC
    LIMIT 50
  `);
  const stories = result.rows.map((row, index) => ({
    slug: row.slug,
    kicker: row.kicker,
    title: row.title,
    dek: row.dek,
    readTime: `${Math.max(2, Math.ceil(row.body_markdown.trim().split(/\s+/).length / 220))} min`,
    category: row.category,
    featured: index === 0,
    bodyMarkdown: row.body_markdown,
    sourceUrls: row.source_urls ?? [],
    publishedAt: row.published_at?.toISOString() ?? null,
    heroImage: row.hero_path,
    cardImage: row.card_path,
    ogImage: row.og_path,
    imageAlt: row.alt_text,
    imageCredit: row.attribution_text,
    sourceImageCandidate: row.source_image_url,
    licenseStatus: row.license_status,
    generated: true
  }));
  await writeFile("lib/generated-content.ts", `export const generatedStories = ${JSON.stringify(stories, null, 2)} as const;\n`, "utf8");
  await db().end();
  console.log(JSON.stringify({ exported: stories.length, featured: stories[0]?.slug ?? null }));
}

main().catch((error) => { console.error(error); process.exit(1); });
