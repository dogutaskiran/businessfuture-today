import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { categories, stories } from "@/lib/content";

export default function Home() {
  const featured = stories.find((story) => story.featured) ?? stories[0];
  const rest = stories.filter((story) => story.slug !== featured.slug);

  return (
    <main>
      <header className="site-header shell">
        <Link href="/" className="brand" aria-label="Business Future Today home">
          <span>BUSINESS FUTURE</span>
          <strong>TODAY</strong>
        </Link>
        <nav aria-label="Main navigation">
          {categories.map((category) => (
            <a key={category} href={`#${category.toLowerCase()}`}>{category}</a>
          ))}
        </nav>
        <SubscribeForm compact />
      </header>

      <section className="ticker">
        <div className="shell ticker__inner">
          <span>THE FUTURE OF BUSINESS, TODAY.</span>
          <span>AI</span><i>•</i><span>TECHNOLOGY</span><i>•</i><span>COMPANIES</span><i>•</i><span>WORK</span><i>•</i><span>TOOLS</span>
        </div>
      </section>

      <section className="hero shell">
        <div className="hero__copy">
          <p className="eyebrow">{featured.kicker}</p>
          <h1>{featured.title}</h1>
          <p className="hero__dek">{featured.dek}</p>
          <div className="story-meta">
            <span>{featured.category}</span>
            <span>{featured.readTime}</span>
          </div>
          <Link className="text-link" href={`/story/${featured.slug}`}>Read the signal →</Link>
        </div>
        {featured.heroImage ? (
          <div className="hero__visual hero__visual--image">
            <img className="hero__image" src={featured.heroImage} alt={featured.imageAlt || featured.title} />
          </div>
        ) : (
          <div className="hero__visual" aria-hidden="true">
            <div className="orb orb--one" />
            <div className="orb orb--two" />
            <div className="grid-mark">BF/T</div>
            <p>Business is being rewritten in real time.</p>
          </div>
        )}
      </section>

      <section className="manifesto shell">
        <p className="eyebrow">WHY THIS EXISTS</p>
        <h2>There is too much news.<br />We care about what changes next.</h2>
        <p>
          Business Future Today turns the daily flood of company, technology and AI updates into
          useful signals, sharp explainers, practical lists and eventually a briefing built for you.
        </p>
      </section>

      <section className="story-grid shell">
        {rest.map((story, index) => (
          <article key={story.slug} id={story.category.toLowerCase()} className={index === 0 ? "story-card story-card--wide" : "story-card"}>
            {story.cardImage ? <Link href={`/story/${story.slug}`} className="story-card__media"><img className="story-card__image" src={story.cardImage} alt={story.imageAlt || story.title} /></Link> : null}
            <p className="eyebrow">{story.kicker}</p>
            <h3><Link href={`/story/${story.slug}`}>{story.title}</Link></h3>
            <p>{story.dek}</p>
            <div className="story-meta"><span>{story.category}</span><span>{story.readTime}</span></div>
          </article>
        ))}
      </section>

      <section className="briefing shell">
        <div>
          <p className="eyebrow">YOUR BRIEFING</p>
          <h2>Don't follow everything.<br />Follow what matters to you.</h2>
        </div>
        <div>
          <p>
            Start with one useful email. Later, Business Future Today will learn the industries,
            companies, tools and shifts you care about — and build your own daily view.
          </p>
          <SubscribeForm />
          <small>No noise. Just signals worth your attention.</small>
        </div>
      </section>

      <footer className="site-footer shell">
        <Link href="/" className="brand brand--footer"><span>BUSINESS FUTURE</span><strong>TODAY</strong></Link>
        <p>Business, technology and what matters next.</p>
        <p>© {new Date().getFullYear()} Business Future Today</p>
      </footer>
    </main>
  );
}
