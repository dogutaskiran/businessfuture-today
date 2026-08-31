import { writeFile } from "node:fs/promises";
import { db } from "../lib/db";

type Row = {
  slug: string; kicker: string; title: string; dek: string; category: "AI" | "Technology" | "Companies" | "Work" | "Tools";
  body_markdown: string; source_urls: string[]; published_at: Date | null;
};

async function main() {
  const result = await db().query<Row>(`
    SELECT slug,kicker,title,dek,category,body_markdown,source_urls,published_at
    FROM drafts
    WHERE status='published'
    ORDER BY published_at DESC NULLS LAST, created_at DESC
    LIMIT 50
  `);
  const stories = result.rows.map((row, index) => ({
    slug: row.slug,
    kicker: row.kicker,
    title: row.title,
    dek: row.dek,
    readTime: `${Math.max(2, Math.ceil(row.body_markdown.trim().split(/\\s+/).length / 220))} min`,
    category: row.category,
    featured: index === 0,
    bodyMarkdown: row.body_markdown,
    sourceUrls: row.source_urls ?? [],
    publishedAt: row.published_at?.toISOString() ?? null,
    generated: true
  }));
  await writeFile("lib/generated-content.ts", `export const generatedStories = ${JSON.stringify(stories, null, 2)} as const;\n`, "utf8");
  await db().end();
  console.log(JSON.stringify({ exported: stories.length, featured: stories[0]?.slug ?? null }));
}

main().catch((error) => { console.error(error); process.exit(1); });
