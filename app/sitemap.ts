import type { MetadataRoute } from "next";
import { stories } from "@/lib/content";
import { publicationSections, sectionHref } from "@/lib/sections";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://businessfuture.today";
  const evergreen = ["about", "newsletter", "privacy", "cookies", "terms", "editorial-standards", "corrections", "affiliate-disclosure"];
  return [{ url: `${base}/`, changeFrequency: "daily", priority: 1 }, ...publicationSections.map((section) => ({ url: `${base}${sectionHref(section)}/`, changeFrequency: "daily" as const, priority: 0.85 })), ...evergreen.map((page) => ({ url: `${base}/${page}/`, changeFrequency: "monthly" as const, priority: page === "newsletter" ? 0.8 : 0.4 })), ...stories.map((story) => ({ url: `${base}/story/${story.slug}/`, lastModified: story.publishedAt ? new Date(story.publishedAt) : undefined, changeFrequency: "weekly" as const, priority: 0.8 }))];
}
