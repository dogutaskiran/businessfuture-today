import { authorForStory } from "@/lib/authors";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.SOCIAL_OUTBOX_TOKEN;
  if (!expected) return true;
  const authorization = request.headers.get("authorization") || "";
  return authorization === `Bearer ${expected}`;
}

function absolute(path: string | null) {
  if (!path) return null;
  return new URL(path, "https://businessfuture.today").toString();
}

type Row = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  category: string;
  social_caption: string;
  source_urls: string[];
  published_at: Date | null;
  social_square_path: string | null;
  social_portrait_path: string | null;
  card_path: string | null;
};

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  await ensureSchema();
  const result = await db().query<Row>(`
    SELECT d.id,d.slug,d.title,d.dek,d.category,d.social_caption,d.source_urls,d.published_at,
      m.social_square_path,m.social_portrait_path,m.card_path
    FROM drafts d
    LEFT JOIN media_assets m ON m.draft_id=d.id AND m.role='hero'
    WHERE d.status='published'
    ORDER BY d.published_at DESC NULLS LAST,d.created_at DESC
    LIMIT 40
  `);

  const items = result.rows.map((row) => {
    const author = authorForStory({ slug: row.slug, category: row.category });
    return {
      id: row.id,
      publication: "business-future-today",
      canonicalUrl: `https://businessfuture.today/story/${row.slug}`,
      title: row.title,
      dek: row.dek,
      category: row.category,
      author: { id: author.id, name: author.name, desk: author.desk },
      caption: row.social_caption || `${row.title}\n\n${row.dek}`,
      media: {
        portrait: absolute(row.social_portrait_path),
        square: absolute(row.social_square_path),
        card: absolute(row.card_path)
      },
      sources: row.source_urls || [],
      publishedAt: row.published_at?.toISOString() || null,
      ready: Boolean(row.social_portrait_path || row.social_square_path)
    };
  });

  return Response.json({ publication: "business-future-today", items }, { headers: { "Cache-Control": "no-store" } });
}
