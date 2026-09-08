import { authorForStory, type EditorialAuthor } from "@/lib/authors";
import staticStoriesJson from "@/content/index.json";
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
    inlineImages
  } as T;
}

export const stories: Story[] = (staticStoriesJson as unknown as Story[]).map((story) => withAuthor({ ...story }));
export const categories = ["AI", "Technology", "Companies", "Work", "Tools"] as const;
