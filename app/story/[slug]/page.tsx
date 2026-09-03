import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationArticle } from "@/components/publication/article";
import { stories, type Story } from "@/lib/content";
import { authorForStory } from "@/lib/authors";
import { absoluteMediaUrl } from "@/lib/media-url";
import { canonicalTemplate } from "@/lib/publication";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };
const API_BASE = (process.env.BFT_API_BASE_URL || "https://api.businessfuture.today").replace(/\/+$/, "");

async function liveStory(slug: string): Promise<Story | null> {
  try {
    const response = await fetch(`${API_BASE}/api/public/story/${encodeURIComponent(slug)}`, { cache: "no-store" });
    if (response.ok) {
      const story = await response.json() as Story;
      return { ...story, author: story.author || authorForStory(story) };
    }
  } catch {}
  const fallback = stories.find((item) => item.slug === slug);
  return fallback || null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = await liveStory(slug);
  if (!story) return {};
  const canonical = `https://businessfuture.today/story/${story.slug}`;
  const image = absoluteMediaUrl(story.ogImage) || undefined;
  return {
    title: story.title,
    description: story.dek,
    alternates: { canonical },
    authors: story.author ? [{ name: `${story.author.name} · ${story.author.desk}` }] : [{ name: "Business Future Today" }],
    openGraph: { title: story.title, description: story.dek, type: "article", url: canonical, publishedTime: story.publishedAt || undefined, authors: story.author ? [story.author.name] : undefined, images: image ? [{ url: image, width: 1200, height: 630, alt: story.imageAlt || story.title }] : undefined },
    twitter: { card: "summary_large_image", title: story.title, description: story.dek, images: image ? [image] : undefined }
  };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await liveStory(slug);
  if (!story) notFound();
  const related = [story, ...stories.filter((item) => item.slug !== story.slug)];
  return <PublicationArticle story={story} stories={related} template={canonicalTemplate} />;
}
