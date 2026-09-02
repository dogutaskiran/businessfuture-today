import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { publicationBrand, storyHref, type PublicationTemplate } from "@/lib/publication";
import { TemplateSwitcher } from "@/components/publication/template-switcher";

export function PublicationHeader({ template, pathname = "/" }: { template: PublicationTemplate; pathname?: string }) {
  return <>
    <div className="pub-utility"><div className="pub-shell pub-utility__inner"><span>The future of business, today.</span><div><Link href="/feed.xml">RSS</Link><Link href="/newsletter">Newsletters</Link><a href="mailto:ads@businessfuture.today">Advertise</a></div></div></div>
    <header className="pub-header pub-shell">
      <Link href={`/?template=${template.id}`} className="pub-brand" aria-label={`${publicationBrand.name} home`}><span>{publicationBrand.markTop}</span><strong>{publicationBrand.markBottom}</strong></Link>
      <nav className="pub-nav" aria-label="Main navigation">
        {publicationBrand.primaryNav.map((category) => <a key={category} href={`/?template=${template.id}#section-${category.toLowerCase()}`}>{category}</a>)}
      </nav>
      <div className="pub-header__actions"><SubscribeForm compact /></div>
    </header>
    <div className="pub-template-bar pub-shell"><TemplateSwitcher current={template} pathname={pathname} /><span>{template.description}</span></div>
  </>;
}

export function PublicationFooter({ template }: { template: PublicationTemplate }) {
  return <footer className="pub-footer">
    <div className="pub-shell pub-footer__grid">
      <div><Link href={`/?template=${template.id}`} className="pub-brand pub-brand--footer"><span>{publicationBrand.markTop}</span><strong>{publicationBrand.markBottom}</strong></Link><p>{publicationBrand.tagline}</p></div>
      <div><h4>Sections</h4>{publicationBrand.primaryNav.map((item) => <a key={item} href={`/?template=${template.id}#section-${item.toLowerCase()}`}>{item}</a>)}</div>
      <div><h4>Products</h4><Link href="/newsletter">Daily Briefing</Link><Link href="/feed.xml">RSS Feed</Link><a href="mailto:ads@businessfuture.today">Advertise</a></div>
      <div><h4>Business Future Today</h4><Link href="/about">About</Link><Link href="/editorial-standards">Editorial Standards</Link><Link href="/corrections">Corrections</Link><Link href="/affiliate-disclosure">Affiliate Disclosure</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Terms</Link><a href="mailto:hello@businessfuture.today">Contact</a><span>© {new Date().getFullYear()}</span></div>
    </div>
  </footer>;
}

export function StoryLink({ slug, template, children, className }: { slug: string; template: PublicationTemplate; children: React.ReactNode; className?: string }) {
  return <Link href={storyHref(slug, template)} className={className}>{children}</Link>;
}
