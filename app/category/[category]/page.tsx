import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationFooter, PublicationHeader, StoryLink } from "@/components/publication/chrome";
import { stories } from "@/lib/content";
import { canonicalTemplate } from "@/lib/publication";
import { publicationSections, sectionBySlug, sectionHref, storiesInSection } from "@/lib/sections";

export const dynamicParams = false;
type Props = { params: Promise<{ category: string }> };
export function generateStaticParams() { return publicationSections.map((section) => ({ category: section.id })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { category: slug } = await params; const section = sectionBySlug(slug); if (!section) return {}; return { title: section.name, description: section.description, alternates: { canonical: `https://businessfuture.today${sectionHref(section)}/` } }; }
export default async function CategoryPage({ params }: Props) { const { category: slug } = await params; const section = sectionBySlug(slug); if (!section) notFound(); const items = storiesInSection(stories, section.name); return <main className="publication publication--newsroom"><PublicationHeader template={canonicalTemplate}/><section className="pub-category-page__hero pub-shell"><p className="pub-kicker">SECTION</p><div><h1>{section.name}</h1><p>{section.description}</p></div><span>{items.length} stories</span></section><section className="pub-shell pub-category-page__grid">{items.map(story=><article key={story.slug} className="pub-category-page__card"><StoryLink slug={story.slug} template={canonicalTemplate} className="pub-category-page__media">{story.cardImage||story.heroImage?<img src={story.cardImage||story.heroImage||""} alt={story.imageAlt||story.title}/>:<div className="pub-image pub-image--fallback"><span>BFT</span></div>}</StoryLink><p className="pub-kicker">{story.kicker}</p><h2><StoryLink slug={story.slug} template={canonicalTemplate}>{story.title}</StoryLink></h2><p>{story.dek}</p><div className="pub-meta"><span>{story.author?`${story.author.name} · ${story.author.desk}`:section.name}</span><span>{story.readTime}</span></div></article>)}</section><PublicationFooter template={canonicalTemplate}/></main>; }
