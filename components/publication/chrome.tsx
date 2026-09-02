import Link from "next/link";
import { SubscribeForm } from "@/components/subscribe-form";
import { publicationBrand, storyHref, type PublicationTemplate } from "@/lib/publication";
import {publicationSections,sectionHref} from "@/lib/sections";

export function PublicationHeader({ template: _template, pathname: _pathname = "/" }: { template: PublicationTemplate; pathname?: string }) {
  return <>
    <div className="pub-utility"><div className="pub-shell pub-utility__inner"><span>The future of business, today.</span><div><Link href="/feed.xml">RSS</Link><Link href="/newsletter">Newsletters</Link><a href="mailto:ads@businessfuture.today">Advertise</a></div></div></div>
    <header className="pub-header pub-shell">
      <Link href="/" className="pub-brand" aria-label={`${publicationBrand.name} home`}><img src="/brand/site-header-wordmark-600x130.png" alt="Business Future Today" /></Link>
      <nav className="pub-nav" aria-label="Main navigation">
        {publicationSections.map((section) => <Link key={section.id} href={sectionHref(section)}>{section.name}</Link>)}
      </nav>
      <div className="pub-header__actions"><SubscribeForm compact /></div>
    </header>
  </>;
}

export function PublicationFooter({ template: _template }: { template: PublicationTemplate }) {
  return <footer className="pub-footer">
    <div className="pub-shell pub-footer__grid">
      <div><Link href="/" className="pub-brand pub-brand--footer"><img src="/brand/site-header-wordmark-600x130.png" alt="Business Future Today" /></Link><p>{publicationBrand.tagline}</p></div>
      <div><h4>Sections</h4>{publicationSections.map((section) => <Link key={section.id} href={sectionHref(section)}>{section.name}</Link>)}</div>
      <div><h4>Products</h4><Link href="/newsletter">Daily Briefing</Link><Link href="/feed.xml">RSS Feed</Link><a href="mailto:ads@businessfuture.today">Advertise</a></div>
      <div><h4>Business Future Today</h4><Link href="/about">About</Link><Link href="/editorial-standards">Editorial Standards</Link><Link href="/corrections">Corrections</Link><Link href="/affiliate-disclosure">Affiliate Disclosure</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link><Link href="/terms">Terms</Link><a href="mailto:hello@businessfuture.today">Contact</a><span>© {new Date().getFullYear()}</span></div>
    </div>
  </footer>;
}

export function StoryLink({ slug, template, children, className }: { slug: string; template?: PublicationTemplate; children: React.ReactNode; className?: string }) {
  return <Link href={storyHref(slug, template)} className={className}>{children}</Link>;
}
