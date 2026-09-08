import { stories, type Story } from "@/lib/content";

export async function liveStories(limit = 500): Promise<Story[]> {
  return stories.slice(0, Math.max(1, Math.min(limit, stories.length)));
}
