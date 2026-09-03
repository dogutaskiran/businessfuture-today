import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = {
  slug: string;
  kicker: string;
  title: string;
  dek: string;
  category: string;
  body_markdown: string;
  source_urls: string[];
  social_caption: string | null;
  published_at: Date | string | null;
  hero_path: string | null;
  card_path: string | null;
  og_path: string | null;
  social_square_path: string | null;
  social_portrait_path: string | null;
  alt_text: string | null;
  attribution_text: string | null;
  source_image_url: string | null;
  license_status: string | null;
  inline1_path: string | null;
  inline1_alt: string | null;
  inline1_credit: string | null;
  inline2_path: string | null;
  inline2_alt: string | null;
  inline2_credit: string | null;
};

function readTime(markdown: string) {
  const words = String(markdown || "").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(2, Math.ceil(words / 220))} min`;
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  await ensureSchema();
  const { slug } = await context.params;
  const result = await db().query<Row>(`
    SELECT d.slug,d.kicker,d.title,d.dek,d.category,d.body_markdown,d.source_urls,d.social_caption,d.published_at,
      h.hero_path,h.card_path,h.og_path,h.social_square_path,h.social_portrait_path,h.alt_text,h.attribution_text,h.source_image_url,h.license_status,
      i1.hero_path inline1_path,i1.alt_text inline1_alt,i1.attribution_text inline1_credit,
      i2.hero_path inline2_path,i2.alt_text inline2_alt,i2.attribution_text inline2_credit
    FROM drafts d
    LEFT JOIN media_assets h ON h.draft_id=d.id AND h.role='hero'
    LEFT JOIN media_assets i1 ON i1.draft_id=d.id AND i1.role='inline_1'
    LEFT JOIN media_assets i2 ON i2.draft_id=d.id AND i2.role='inline_2'
    WHERE d.slug=$1 AND d.status='published'
    LIMIT 1
  `, [slug]);

  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const inlineImages = [
    row.inline1_path ? { role: "inline_1", src: row.inline1_path, alt: row.inline1_alt || `Supporting image for ${row.title}`, credit: row.inline1_credit } : null,
    row.inline2_path ? { role: "inline_2", src: row.inline2_path, alt: row.inline2_alt || `Supporting image for ${row.title}`, credit: row.inline2_credit } : null
  ].filter(Boolean);

  return NextResponse.json({
    slug: row.slug,
    kicker: row.kicker,
    title: row.title,
    dek: row.dek,
    readTime: readTime(row.body_markdown),
    category: row.category,
    featured: false,
    bodyMarkdown: row.body_markdown,
    sourceUrls: row.source_urls || [],
    socialCaption: row.social_caption || "",
    publishedAt: row.published_at ? new Date(row.published_at).toISOString() : null,
    generated: true,
    heroImage: row.hero_path,
    cardImage: row.card_path,
    ogImage: row.og_path,
    socialSquareImage: row.social_square_path,
    socialPortraitImage: row.social_portrait_path,
    imageAlt: row.alt_text,
    imageCredit: row.attribution_text,
    sourceImageCandidate: row.source_image_url,
    licenseStatus: row.license_status,
    inlineImages
  }, { headers: { "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } });
}
