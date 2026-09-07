import { authorForStory } from "@/lib/authors";
import { db, ensureSchema } from "@/lib/db";
import { absoluteMediaUrl } from "@/lib/media-url";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  slug: string;
  kicker: string;
  title: string;
  dek: string;
  category: string;
  body_markdown: string;
  social_caption: string;
  source_urls: string[];
  published_at: Date | null;
  hero_path: string | null;
  card_path: string | null;
  og_path: string | null;
  social_square_path: string | null;
  social_portrait_path: string | null;
  hero_alt: string | null;
  hero_credit: string | null;
  hero_source_page_url: string | null;
  hero_source_image_url: string | null;
  hero_license_status: string | null;
  hero_license_basis: string | null;
  inline1_path: string | null;
  inline1_alt: string | null;
  inline1_credit: string | null;
  inline2_path: string | null;
  inline2_alt: string | null;
  inline2_credit: string | null;
  instagram_published: boolean;
};

export async function GET() {
  await ensureSchema();
  const result = await db().query<Row>(`
    SELECT d.id,d.slug,d.kicker,d.title,d.dek,d.category,d.body_markdown,d.social_caption,d.source_urls,d.published_at,
      h.hero_path,h.card_path,h.og_path,h.social_square_path,h.social_portrait_path,
      h.alt_text hero_alt,h.attribution_text hero_credit,h.source_page_url hero_source_page_url,
      h.source_image_url hero_source_image_url,h.license_status hero_license_status,h.license_basis hero_license_basis,
      i1.hero_path inline1_path,i1.alt_text inline1_alt,i1.attribution_text inline1_credit,
      i2.hero_path inline2_path,i2.alt_text inline2_alt,i2.attribution_text inline2_credit,
      EXISTS(
        SELECT 1 FROM social_publications sp
        WHERE sp.platform='instagram' AND sp.status='published' AND sp.content_slug=d.slug
      ) instagram_published
    FROM drafts d
    LEFT JOIN media_assets h ON h.draft_id=d.id AND h.role='hero'
    LEFT JOIN media_assets i1 ON i1.draft_id=d.id AND i1.role='inline_1'
    LEFT JOIN media_assets i2 ON i2.draft_id=d.id AND i2.role='inline_2'
    WHERE d.status='published'
    ORDER BY d.published_at DESC NULLS LAST,d.created_at DESC
    LIMIT 40
  `);

  const items = result.rows.map((row) => {
    const author = authorForStory({ slug: row.slug, category: row.category });
    const hero = absoluteMediaUrl(row.hero_path);
    const inline = [
      row.inline1_path ? {
        role: "inline_1",
        src: absoluteMediaUrl(row.inline1_path),
        alt: row.inline1_alt || `Supporting image for ${row.title}`,
        credit: row.inline1_credit || null,
      } : null,
      row.inline2_path ? {
        role: "inline_2",
        src: absoluteMediaUrl(row.inline2_path),
        alt: row.inline2_alt || `Supporting image for ${row.title}`,
        credit: row.inline2_credit || null,
      } : null,
    ].filter(Boolean);

    const article = {
      schemaVersion: 1,
      publication: "business-future-today",
      id: row.id,
      slug: row.slug,
      kicker: row.kicker,
      title: row.title,
      dek: row.dek,
      category: row.category,
      bodyMarkdown: row.body_markdown,
      publishedAt: row.published_at?.toISOString() || null,
      sources: row.source_urls || [],
      socialCaption: row.social_caption || "",
      media: {
        hero,
        card: absoluteMediaUrl(row.card_path),
        og: absoluteMediaUrl(row.og_path),
        socialSquare: absoluteMediaUrl(row.social_square_path),
        socialPortrait: absoluteMediaUrl(row.social_portrait_path),
        alt: row.hero_alt,
        credit: row.hero_credit,
        sourcePageUrl: row.hero_source_page_url,
        sourceImageUrl: row.hero_source_image_url,
        licenseStatus: row.hero_license_status,
        licenseBasis: row.hero_license_basis,
        inline,
      },
    };

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
        hero,
        portrait: absoluteMediaUrl(row.social_portrait_path),
        square: absoluteMediaUrl(row.social_square_path),
        card: absoluteMediaUrl(row.card_path),
        inline,
      },
      sources: row.source_urls || [],
      publishedAt: row.published_at?.toISOString() || null,
      instagramPublished: Boolean(row.instagram_published),
      delivered: { instagram: Boolean(row.instagram_published) },
      ready: Boolean(hero),
      article,
    };
  });

  return Response.json({
    publication: "business-future-today",
    recipe: "bft-edition-v1",
    items,
  }, { headers: { "Cache-Control": "no-store" } });
}
