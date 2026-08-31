import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stories } from "@/lib/content";
import { SubscribeForm } from "@/components/subscribe-form";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return stories.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = stories.find((item) => item.slug === slug);
  if (!story) return {};
  return { title: story.title, description: story.dek };
}

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = stories.find((item) => item.slug === slug);
  if (!story) notFound();

  return (
    <main>
      <header className="site-header shell">
        <Link href="/" className="brand"><span>BUSINESS FUTURE</span><strong>TODAY</strong></Link>
        <Link className="back-link" href="/">← Back to today</Link>
      </header>

      <article className="article shell">
        <p className="eyebrow">{story.kicker}</p>
        <h1>{story.title}</h1>
        <p className="article__dek">{story.dek}</p>
        <div className="story-meta"><span>{story.category}</span><span>{story.readTime}</span></div>

        <div className="article__body">
          <p>
            This is a launch-format story page for Business Future Today. The production content pipeline
            will be fed by PubMesh: source discovery, editorial synthesis, images, CMS publishing and social distribution.
          </p>
          <h2>The signal</h2>
          <p>
            We will separate what happened from what matters. Every story should leave the reader with a clearer
            understanding of the business consequence, not another tab to keep open.
          </p>
          <h2>Why it matters</h2>
          <p>
            The same underlying event can matter differently to a founder, operator, developer, investor or marketer.
            That is where the personalization layer will evolve after the first publication loop is working.
          </p>
          <h2>What to watch next</h2>
          <p>
            Each story becomes an input to follow-up briefings, lists, social posts and personalized recommendations.
            One editorial object; many useful outputs.
          </p>
        </div>
      </article>

      <section className="briefing briefing--article shell">
        <div><p className="eyebrow">STAY AHEAD</p><h2>The future of business, in your inbox.</h2></div>
        <div><SubscribeForm /><small>Built to become personal, not noisy.</small></div>
      </section>
    </main>
  );
}
