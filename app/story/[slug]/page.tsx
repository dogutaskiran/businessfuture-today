import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stories } from "@/lib/content";
import { SubscribeForm } from "@/components/subscribe-form";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return stories.map((story) => ({ slug: story.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = stories.find((item) => item.slug === slug);
  if (!story) return {};
  const image = story.ogImage ? `https://businessfuture.today${story.ogImage}` : undefined;
  return {
    title: story.title,
    description: story.dek,
    openGraph: { title: story.title, description: story.dek, type: "article", images: image ? [{ url: image, width: 1200, height: 630, alt: story.imageAlt || story.title }] : undefined },
    twitter: { card: "summary_large_image", title: story.title, description: story.dek, images: image ? [image] : undefined }
  };
}

function ArticleBody({ markdown }: { markdown?: string }) {
  if (!markdown) return (
    <>
      <p>This launch-format story is being replaced by Business Future Today&apos;s live editorial engine.</p>
      <h2>The signal</h2><p>We separate what happened from what matters to operators, founders, executives and builders.</p>
    </>
  );
  const blocks = markdown.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return <>{blocks.map((block, index) => {
    if (block.startsWith("### ")) return <h3 key={index}>{block.slice(4)}</h3>;
    if (block.startsWith("## ")) return <h2 key={index}>{block.slice(3)}</h2>;
    if (block.startsWith("# ")) return <h2 key={index}>{block.slice(2)}</h2>;
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 0 && lines.every((line) => line.startsWith("- "))) {
      return <ul key={index}>{lines.map((line, i) => <li key={i}>{line.slice(2)}</li>)}</ul>;
    }
    return <p key={index}>{block.replace(/\*\*/g, "")}</p>;
  })}</>;
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = stories.find((item) => item.slug === slug);
  if (!story) notFound();
  return (
    <main>
      <header className="site-header shell"><Link href="/" className="brand"><span>BUSINESS FUTURE</span><strong>TODAY</strong></Link><Link className="back-link" href="/">← Back to today</Link></header>
      <article className="article shell">
        <p className="eyebrow">{story.kicker}</p><h1>{story.title}</h1><p className="article__dek">{story.dek}</p>
        <div className="story-meta"><span>{story.category}</span><span>{story.readTime}</span></div>
        {story.heroImage ? (
          <figure className="article__hero">
            <img src={story.heroImage} alt={story.imageAlt || story.title} />
            {story.imageCredit ? <figcaption>{story.imageCredit}</figcaption> : null}
          </figure>
        ) : null}
        <div className="article__body"><ArticleBody markdown={story.bodyMarkdown} /></div>
        {story.sourceUrls?.length ? <div className="article__sources"><h2>Sources</h2><ul>{story.sourceUrls.map((url) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}</a></li>)}</ul></div> : null}
      </article>
      <section className="briefing briefing--article shell"><div><p className="eyebrow">STAY AHEAD</p><h2>The future of business, in your inbox.</h2></div><div><SubscribeForm /><small>Built to become personal, not noisy.</small></div></section>
    </main>
  );
}
