import { stories as staticStories, type Story } from "@/lib/content";
import { authorForStory } from "@/lib/authors";

const CONTENT_URL = (
  process.env.PUBLICATION_CONTENT_URL ||
  "https://dogu.one/api/publications/business-future-today/content"
).replace(/\/+$/, "");

function withAuthor(story: Story): Story {
  return { ...story, author: story.author || authorForStory(story) };
}

export async function liveStories(limit = 500): Promise<Story[]> {
  try {
    const response = await fetch(
      `${CONTENT_URL}?status=published&limit=${Math.max(1, Math.min(500, limit))}`,
      { next: { revalidate: 60 } },
    );
    if (response.ok) {
      const payload = await response.json() as { stories?: Story[]: items?: Story[] };
      const rows = Array.isArray(payload.stories) ? payload.stories : payload.items;
      if (Array.isArray(rows) && rows.length) return rows.map(withAuthor);
    }
  } catch {}
  return staticStories.map(withAuthor);
}
