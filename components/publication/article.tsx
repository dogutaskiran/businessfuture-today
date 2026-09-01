import { AdSlot } from "@/components/ad-slot";
import { SubscribeForm } from "@/components/subscribe-form";
import { PublicationFooter, PublicationHeader, StoryLink } from "@/components/publication/chrome";
import type { Story } from "@/lib/content";
import { publicationBrand, type PublicationTemplate } from "@/lib/publication";

type InlineImage={role:string;src:string;alt:string;credit?:string|null};

function InlineFigure({image}:{image:InlineImage}){return <figure className="pub-article__inline"><img src={image.src} alt={image.alt}/>{image.credit?<figcaption>{image.credit}</figcaption>:null}</figure>;}

function ArticleBody({markdown,inlineImages=[],adSlots=[]}:{markdown?:string;inlineImages?:readonly InlineImage[];adSlots?:string[]}){
  if(!markdown)return <p>Business Future Today is preparing this story.</p>;
  const blocks=markdown.split(/\n{2,}/).map((block)=>block.trim()).filter(Boolean);
  const paragraphIndices=blocks.map((block,index)=>({block,index})).filter(({block})=>!block.startsWith("#")&&!block.split("\n").every((line)=>line.trim().startsWith("- "))).map(({index})=>index);
  const imageInsertion=new Map<number,InlineImage[]>();
  inlineImages.forEach((image,i)=>{if(!paragraphIndices.length)return;const ratio=i===0?.25:.62;const target=paragraphIndices[Math.min(paragraphIndices.length-1,Math.max(0,Math.floor(paragraphIndices.length*ratio)))];imageInsertion.set(target,[...(imageInsertion.get(target)||[]),image]);});
  const adInsertion=new Map<number,string[]>();
  adSlots.forEach((slot,i)=>{if(paragraphIndices.length<4)return;const ratio=i===0?.45:.78;const target=paragraphIndices[Math.min(paragraphIndices.length-1,Math.floor(paragraphIndices.length*ratio))];adInsertion.set(target,[...(adInsertion.get(target)||[]),slot]);});
  return <>{blocks.map((block,index)=>{
    let node;
    if(block.startsWith("### "))node=<h3>{block.slice(4)}</h3>;
    else if(block.startsWith("## "))node=<h2>{block.slice(3)}</h2>;
    else if(block.startsWith("# "))node=<h2>{block.slice(2)}</h2>;
    else {const lines=block.split("\n").map((line)=>line.trim()).filter(Boolean);node=lines.length>0&&lines.every((line)=>line.startsWith("- "))?<ul>{lines.map((line,i)=><li key={i}>{line.slice(2)}</li>)}</ul>:<p>{block.replace(/\*\*/g,"")}</p>;}
    return <div className="pub-article__block" key={index}>{node}{(imageInsertion.get(index)||[]).map((image)=><InlineFigure key={image.role} image={image}/>)}{(adInsertion.get(index)||[]).map((slot)=><AdSlot key={slot} slotKey={slot}/>)}</div>;
  })}</>;
}

function RelatedStories({ story, stories, template }: {story:Story;stories:Story[];template:PublicationTemplate}){
  const related=stories.filter((candidate)=>candidate.slug!==story.slug&&candidate.category===story.category).slice(0,3);
  if(!related.length)return null;
  return <section className="pub-related"><div className="pub-section__head"><h2>More in {story.category}</h2></div><div className="pub-related__grid">{related.map((item)=><article key={item.slug}>{item.cardImage?<StoryLink slug={item.slug} template={template}><img src={item.cardImage} alt={item.imageAlt||item.title}/></StoryLink>:null}<p className="pub-kicker">{item.kicker}</p><h3><StoryLink slug={item.slug} template={template}>{item.title}</StoryLink></h3><div className="pub-meta"><span>{item.author?`${item.author.name} · ${item.author.desk}`:item.category}</span><span>{item.readTime}</span></div></article>)}</div></section>;
}

export function PublicationArticle({story,stories,template}:{story:Story;stories:Story[];template:PublicationTemplate}){
  const date=story.publishedAt?new Date(story.publishedAt):null;
  return <main className={`publication publication--${template.id}`} data-template={template.id}>
    <PublicationHeader template={template} pathname={`/story/${story.slug}`}/>
    {template.article.showTopAd?<div className="pub-ad-band pub-shell"><AdSlot slotKey="site_top_billboard"/></div>:null}
    <article className="pub-article pub-shell">
      <header className="pub-article__intro"><p className="pub-kicker">{story.kicker}</p><h1>{story.title}</h1><p className="pub-article__dek">{story.dek}</p><div className="pub-article__byline"><strong>{story.author?`${story.author.name} · ${story.author.desk}`:publicationBrand.name}</strong>{date?<time dateTime={date.toISOString()}>{date.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</time>:null}<span>{story.readTime} read</span></div></header>
      {story.heroImage?<figure className="pub-article__hero"><img src={story.heroImage} alt={story.imageAlt||story.title}/>{story.imageCredit?<figcaption>{story.imageCredit}</figcaption>:null}</figure>:null}
      {template.article.showAfterHeroAd?<div className="pub-article__after-hero-ad"><AdSlot slotKey="article_after_hero"/></div>:null}
      <div className={`pub-article__content ${template.article.showRailAd?"has-rail":""}`}>
        <div className="pub-article__body"><ArticleBody markdown={story.bodyMarkdown} inlineImages={story.inlineImages} adSlots={template.article.inlineAdSlots}/></div>
        {template.article.showRailAd?<aside className="pub-article__rail"><AdSlot slotKey="article_rail"/></aside>:null}
      </div>
      {story.sourceUrls?.length?<section className="pub-sources"><h2>Sources</h2><ul>{story.sourceUrls.map((url)=><li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}</a></li>)}</ul></section>:null}
      <RelatedStories story={story} stories={stories} template={template}/>
    </article>
    <section id="briefing" className="pub-newsletter"><div className="pub-shell pub-newsletter__inner"><div><p className="pub-kicker">STAY AHEAD</p><h2>The future of business, in your inbox.</h2></div><div><p>{publicationBrand.description}</p><SubscribeForm/><small>One useful briefing. Double opt-in.</small></div></div></section>
    <PublicationFooter template={template}/>
    {template.article.showStickyAd?<AdSlot slotKey="article_sticky" sticky/>:null}
  </main>;
}
