import { authorForStory, type EditorialAuthor } from "@/lib/authors";
import { resolveMediaUrl } from "@/lib/media-url";

export type Story = {
  slug: string;
  kicker: string;
  title: string;
  dek: string;
  readTime: string;
  category: "AI" | "Technology" | "Companies" | "Work" | "Tools";
  featured?: boolean;
  author?: EditorialAuthor;
  bodyMarkdown?: string;
  sourceUrls?: readonly string[];
  socialCaption?: string;
  publishedAt?: string | null;
  generated?: boolean;
  heroImage?: string | null;
  cardImage?: string | null;
  ogImage?: string | null;
  socialSquareImage?: string | null;
  socialPortraitImage?: string | null;
  imageAlt?: string | null;
  imageCredit?: string | null;
  sourceImageCandidate?: string | null;
  licenseStatus?: string | null;
  inlineImages?: readonly { role: string; src: string; alt: string; credit?: string | null }[];
};

const CONTENT_URL = process.env.PUBLICATION_CONTENT_URL || "https://dogu.one/api/publications/business-future-today/content";

function withAuthor<T extends Story>(story: T): T {
  const inlineImages = story.inlineImages?.map((image) => ({ ...image, src: resolveMediaUrl(image.src) || image.src }));
  return {
    ...story,
    author: story.author || authorForStory(story),
    heroImage: resolveMediaUrl(story.heroImage),
    cardImage: resolveMediaUrl(story.cardImage),
    ogImage: resolveMediaUrl(story.ogImage),
    socialSquareImage: resolveMediaUrl(story.socialSquareImage),
    socialPortraitImage: resolveMediaUrl(story.socialPortraitImage),
    inlineImages,
  } as T;
}

export async function getStories(): Promise<Story[]> {
  const url = new URL(CONTENT_URL);
  url.searchParams.set("status", "published");
  url.searchParams.set("limit", "500");
  url.searchParams.set("fresh", "1");
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json", "x-dogu-content-fresh": "1" },
  });
  if (!response.ok) throw new Error(`Doğu One content read failed: ${response.status}`);
  const payload = await response.json();
  const rows = Array.isArray(payload?.stories) ? payload.stories : Array.isArray(payload?.items) ? payload.items : [];
  return rows.map((story: Story) => withAuthor({ ...story }));
}

export const categories = ["AI", "Technology", "Companies", "Work", "Tools"] as const;
