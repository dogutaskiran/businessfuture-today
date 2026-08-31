import type { MetadataRoute } from "next";
import { stories } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://businessfuture.today";
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...stories.map((story) => ({
      url: `${base}/story/${story.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8
    }))
  ];
}
