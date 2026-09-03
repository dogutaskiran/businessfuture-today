import { liveStories } from "@/lib/live-content";

const ORIGIN = "https://businessfuture.today";
function xml(value: string) {
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}

export async function GET() {
  const stories = await liveStories(50);
  const items = stories.slice(0, 50).map((story) => {
    const link = `${ORIGIN}/story/${story.slug}`;
    const image = story.heroImage ? (/^https?:\/\//i.test(story.heroImage) ? story.heroImage : `${ORIGIN}${story.heroImage}`) : null;
    const published = story.publishedAt ? new Date(story.publishedAt) : new Date();
    const author = story.author ? `${story.author.name} · ${story.author.desk}` : "Business Future Today";
    return `
    <item>
      <title>${xml(story.title)}</title>
      <link>${xml(link)}</link>
      <guid isPermaLink="true">${xml(link)}</guid>
      <pubDate>${published.toUTCString()}</pubDate>
      <author>${xml(author)}</author>
      <category>${xml(story.category)}</category>
      <description>${xml(story.dek)}</description>
      ${image ? `<media:content url="${xml(image)}" medium="image" type="image/webp"/><media:thumbnail url="${xml(image)}"/>` : ""}
    </item>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Business Future Today</title>
    <link>${ORIGIN}</link>
    <description>Business, technology and what matters next.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <ttl>30</ttl>${items}
  </channel>
</rss>`;
  return new Response(body, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" } });
}
