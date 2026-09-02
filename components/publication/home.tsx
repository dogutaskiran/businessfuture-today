import { AdSlot } from "@/components/ad-slot";
import { SubscribeForm } from "@/components/subscribe-form";
import { PublicationFooter, PublicationHeader, StoryLink } from "@/components/publication/chrome";
import type { Story } from "@/lib/content";
import { numericReadTime, publicationBrand, type HomeSection, type PublicationTemplate } from "@/lib/publication";

function StoryImage({ story, className = "" }: { story: Story; className?: string }) {
  if (!story.cardImage && !story.heroImage) return <div className={`pub-image pub-image--fallback ${className}`} aria-hidden="true"><span>BF/T</span></div>;
  return <img className={`pub-image ${className}`} src={story.cardImage || story.heroImage || ""} alt={story.imageAlt || story.title} />;
}

function Meta({ story }: { story: Story }) {
  return <div className="pub-meta"><span>{story.author?`${story.author.name} · ${story.author.desk}`:story.category}</span><span>{story.readTime}</span></div>;
}

function LeadSection({ stories, template, secondaryCount }: { stories: Story[]; template: PublicationTemplate; secondaryCount: number }) {
  const lead = stories[0]; if (!lead) return null;
  const secondary = stories.slice(1, 1 + secondaryCount);
  if (template.id === "signal") return <section className="pub-signal-lead pub-shell">
    <div className="pub-signal-lead__copy"><p className="pub-kicker">{lead.kicker}</p><h1><StoryLink slug={lead.slug} template={template}>{lead.title}</StoryLink></h1><p className="pub-dek">{lead.dek}</p><Meta story={lead}/><StoryLink slug={lead.slug} template={template} className="pub-text-link">Read the signal →</StoryLink></div>
    <StoryLink slug={lead.slug} template={template} className="pub-signal-lead__media"><StoryImage story={lead}/></StoryLink>
  </section>;

  return <section className="pub-lead pub-shell">
    <article className="pub-lead__primary">
      <StoryLink slug={lead.slug} template={template} className="pub-lead__media"><StoryImage story={lead}/></StoryLink>
      <div className="pub-lead__copy"><p className="pub-kicker">{lead.kicker}</p><h1><StoryLink slug={lead.slug} template={template}>{lead.title}</StoryLink></h1><p className="pub-dek">{lead.dek}</p><Meta story={lead}/></div>
    </article>
    <div className="pub-lead__secondary">
      {secondary.map((story) => <article className="pub-secondary" key={story.slug}><StoryLink slug={story.slug} template={template} className="pub-secondary__media"><StoryImage story={story}/></StoryLink><div><p className="pub-kicker">{story.category}</p><h2><StoryLink slug={story.slug} template={template}>{story.title}</StoryLink></h2><Meta story={story}/></div></article>)}
    </div>
  </section>;
}

function LatestSection({ stories, template, title, limit }: { stories: Story[]; template: PublicationTemplate; title: string; limit: number }) {
  return <section className="pub-section pub-shell"><div className="pub-section__head"><h2>{title}</h2><span>What just changed</span></div><div className="pub-latest">
    {stories.slice(0, limit).map((story, index) => <article className="pub-latest__item" key={story.slug}><span className="pub-latest__number">{String(index + 1).padStart(2,"0")}</span><div><p className="pub-kicker">{story.category}</p><h3><StoryLink slug={story.slug} template={template}>{story.title}</StoryLink></h3><Meta story={story}/></div>{story.cardImage ? <StoryLink slug={story.slug} template={template} className="pub-latest__media"><StoryImage story={story}/></StoryLink> : null}</article>)}
  </div></section>;
}

function CategorySection({ stories, template, section }: { stories: Story[]; template: PublicationTemplate; section: Extract<HomeSection,{kind:"category"}> }) {
  const matches = stories.filter((story) => story.category === section.category).slice(0, section.limit);
  if (!matches.length) return null; const [lead, ...rest] = matches;
  return <section id={`section-${section.category.toLowerCase()}`} className="pub-section pub-category pub-shell"><div className="pub-section__head"><h2>{section.title}</h2><span>See all {section.title.toLowerCase()}</span></div><div className="pub-category__grid">
    <article className="pub-category__lead"><StoryLink slug={lead.slug} template={template} className="pub-category__media"><StoryImage story={lead}/></StoryLink><p className="pub-kicker">{lead.kicker}</p><h3><StoryLink slug={lead.slug} template={template}>{lead.title}</StoryLink></h3><p>{lead.dek}</p><Meta story={lead}/></article>
    <div className="pub-category__list">{rest.map((story) => <article key={story.slug}><StoryLink slug={story.slug} template={template} className="pub-category__thumb"><StoryImage story={story}/></StoryLink><div><p className="pub-kicker">{story.kicker}</p><h4><StoryLink slug={story.slug} template={template}>{story.title}</StoryLink></h4><Meta story={story}/></div></article>)}</div>
  </div></section>;
}

function DeepSection({ stories, template, title, limit }: { stories: Story[]; template: PublicationTemplate; title: string; limit: number }) {
  const deep = [...stories].sort((a,b) => numericReadTime(b) - numericReadTime(a)).slice(0, limit);
  return <section className="pub-section pub-shell"><div className="pub-section__head"><h2>{title}</h2><span>Longer reads and explainers</span></div><div className="pub-deep-grid">{deep.map((story) => <article key={story.slug}><StoryLink slug={story.slug} template={template}><StoryImage story={story}/></StoryLink><p className="pub-kicker">{story.category}</p><h3><StoryLink slug={story.slug} template={template}>{story.title}</StoryLink></h3><Meta story={story}/></article>)}</div></section>;
}

function ArchiveSection({ stories, template, title, limit }: { stories: Story[]; template: PublicationTemplate; title: string; limit: number }) {
  if (template.id === "signal") return <section className="pub-section pub-shell"><div className="pub-section__head"><h2>{title}</h2></div><div className="pub-signal-grid">{stories.slice(1, limit + 1).map((story,index) => <article key={story.slug} className={index===0?"is-wide":""}><StoryLink slug={story.slug} template={template}><StoryImage story={story}/></StoryLink><p className="pub-kicker">{story.kicker}</p><h3><StoryLink slug={story.slug} template={template}>{story.title}</StoryLink></h3><p>{story.dek}</p><Meta story={story}/></article>)}</div></section>;
  return <section className="pub-section pub-shell"><div className="pub-section__head"><h2>{title}</h2><span>Keep exploring</span></div><div className="pub-archive">{stories.slice(8, 8 + limit).map((story) => <article key={story.slug}><div><p className="pub-kicker">{story.category}</p><h3><StoryLink slug={story.slug} template={template}>{story.title}</StoryLink></h3><p>{story.dek}</p><Meta story={story}/></div>{story.cardImage?<StoryLink slug={story.slug} template={template}><StoryImage story={story}/></StoryLink>:null}</article>)}</div></section>;
}

function NewsletterSection() {
  return <section id="briefing" className="pub-newsletter"><div className="pub-shell pub-newsletter__inner"><div><p className="pub-kicker">THE DAILY BRIEFING</p><h2>Know what matters before the day gets noisy.</h2></div><div><p>{publicationBrand.description} One useful briefing, built from the same publication engine.</p><SubscribeForm/><small>Unsubscribe any time. Privacy choices stay yours.</small></div></div></section>;
}

function ManifestoSection(){return <section className="pub-manifesto pub-shell"><p className="pub-kicker">WHY THIS EXISTS</p><h2>There is too much news.<br/>We care about what changes next.</h2><p>Business Future Today turns the daily flood of company, technology and AI updates into useful signals, sharp explainers and practical context.</p></section>}

export function PublicationHome({ stories, template }: { stories: Story[]; template: PublicationTemplate }) {
  const consumed = new Set<string>();
  const reserve = (input: Story[], count: number) => { const out = input.filter((story)=>!consumed.has(story.slug)).slice(0,count); out.forEach((story)=>consumed.add(story.slug)); return out; };
  return <main className={`publication publication--${template.id}`} data-template={template.id}>
    <PublicationHeader template={template}/>
    {template.home.sections.map((section,index) => {
      if(section.kind === "ad") return <div className="pub-ad-band pub-shell" key={`${section.kind}-${index}`}><AdSlot slotKey={section.slotKey}/></div>;
      if(section.kind === "lead") { const items=reserve(stories, Math.max(1,1+section.secondaryCount)); return <LeadSection key={`${section.kind}-${index}`} stories={items} template={template} secondaryCount={section.secondaryCount}/>; }
      if(section.kind === "latest") { const items=reserve(stories,section.limit); return <LatestSection key={`${section.kind}-${index}`} stories={items} template={template} title={section.title} limit={section.limit}/>; }
      if(section.kind === "category") return <CategorySection key={`${section.kind}-${section.category}`} stories={stories} template={template} section={section}/>;
      if(section.kind === "deep") return <DeepSection key={`${section.kind}-${index}`} stories={stories} template={template} title={section.title} limit={section.limit}/>;
      if(section.kind === "archive") return <ArchiveSection key={`${section.kind}-${index}`} stories={stories} template={template} title={section.title} limit={section.limit}/>;
      if(section.kind === "newsletter") return <NewsletterSection key={`${section.kind}-${index}`}/>;
      if(section.kind === "manifesto") return <ManifestoSection key={`${section.kind}-${index}`}/>;
      return null;
    })}
    <PublicationFooter template={template}/>
  </main>;
}
