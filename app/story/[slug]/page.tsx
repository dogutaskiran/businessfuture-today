import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stories } from "@/lib/content";
import { SubscribeForm } from "@/components/subscribe-form";
import { AdSlot } from "@/components/ad-slot";

type Props={params:Promise<{slug:string}>};
type InlineImage={role:string;src:string;alt:string;credit?:string|null};
export function generateStaticParams(){return stories.map((story)=>({slug:story.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const{slug}=await params;const story=stories.find((item)=>item.slug===slug);if(!story)return{};const image=story.ogImage?`https://businessfuture.today${story.ogImage}`:undefined;return{title:story.title,description:story.dek,openGraph:{title:story.title,description:story.dek,type:"article",images:image?[{url:image,width:1200,height:630,alt:story.imageAlt||story.title}]:undefined},twitter:{card:"summary_large_image",title:story.title,description:story.dek,images:image?[image]:undefined}};}

function InlineFigure({image}:{image:InlineImage}){return <figure className="article__inline"><img src={image.src} alt={image.alt}/>{image.credit?<figcaption>{image.credit}</figcaption>:null}</figure>;}
function ArticleBody({markdown,inlineImages=[]}:{markdown?:string;inlineImages?:readonly InlineImage[]}){
  if(!markdown)return <><p>This launch-format story is being replaced by Business Future Today&apos;s live editorial engine.</p><h2>The signal</h2><p>We separate what happened from what matters to operators, founders, executives and builders.</p></>;
  const blocks=markdown.split(/\n{2,}/).map((block)=>block.trim()).filter(Boolean);
  const paragraphIndices=blocks.map((block,index)=>({block,index})).filter(({block})=>!block.startsWith("#")&&!block.split("\n").every((line)=>line.trim().startsWith("- "))).map(({index})=>index);
  const imageInsertion=new Map<number,InlineImage[]>();
  inlineImages.forEach((image,i)=>{if(!paragraphIndices.length)return;const ratio=i===0?.25:.62;const target=paragraphIndices[Math.min(paragraphIndices.length-1,Math.max(0,Math.floor(paragraphIndices.length*ratio)))];imageInsertion.set(target,[...(imageInsertion.get(target)||[]),image]);});
  const adInsertion=new Map<number,string[]>();
  if(paragraphIndices.length>=4){const target=paragraphIndices[Math.min(paragraphIndices.length-1,Math.floor(paragraphIndices.length*.45))];adInsertion.set(target,["article_inline_1"]);}
  if(paragraphIndices.length>=7){const target=paragraphIndices[Math.min(paragraphIndices.length-1,Math.floor(paragraphIndices.length*.78))];adInsertion.set(target,[...(adInsertion.get(target)||[]),"article_inline_2"]);}
  return <>{blocks.map((block,index)=>{
    let node;
    if(block.startsWith("### "))node=<h3>{block.slice(4)}</h3>;
    else if(block.startsWith("## "))node=<h2>{block.slice(3)}</h2>;
    else if(block.startsWith("# "))node=<h2>{block.slice(2)}</h2>;
    else {const lines=block.split("\n").map((line)=>line.trim()).filter(Boolean);node=lines.length>0&&lines.every((line)=>line.startsWith("- "))?<ul>{lines.map((line,i)=><li key={i}>{line.slice(2)}</li>)}</ul>:<p>{block.replace(/\*\*/g,"")}</p>;}
    return <div className="article__block" key={index}>{node}{(imageInsertion.get(index)||[]).map((image)=><InlineFigure key={image.role} image={image}/>)}{(adInsertion.get(index)||[]).map((slot)=><AdSlot key={slot} slotKey={slot}/>)}</div>;
  })}</>;
}

export default async function StoryPage({params}:Props){
  const{slug}=await params; const story=stories.find((item)=>item.slug===slug); if(!story)notFound();
  return <main>
    <header className="site-header shell"><Link href="/" className="brand"><span>BUSINESS FUTURE</span><strong>TODAY</strong></Link><Link className="back-link" href="/">← Back to today</Link></header>
    <div className="ad-band shell"><AdSlot slotKey="site_top_billboard"/></div>
    <article className="article shell">
      <div className="article__intro"><p className="eyebrow">{story.kicker}</p><h1>{story.title}</h1><p className="article__dek">{story.dek}</p><div className="story-meta"><span>{story.category}</span><span>{story.readTime}</span></div></div>
      {story.heroImage?<figure className="article__hero"><img src={story.heroImage} alt={story.imageAlt||story.title}/>{story.imageCredit?<figcaption>{story.imageCredit}</figcaption>:null}</figure>:null}
      <div className="article__after-hero-ad"><AdSlot slotKey="article_after_hero"/></div>
      <div className="article__content-grid">
        <div className="article__body"><ArticleBody markdown={story.bodyMarkdown} inlineImages={story.inlineImages}/></div>
        <aside className="article__rail"><AdSlot slotKey="article_rail"/></aside>
      </div>
      {story.sourceUrls?.length?<div className="article__sources"><h2>Sources</h2><ul>{story.sourceUrls.map((url)=><li key={url}><a href={url} target="_blank" rel="noreferrer">{new URL(url).hostname}</a></li>)}</ul></div>:null}
    </article>
    <section className="briefing briefing--article shell"><div><p className="eyebrow">STAY AHEAD</p><h2>The future of business, in your inbox.</h2></div><div><SubscribeForm/><small>Built to become personal, not noisy.</small></div></section>
    <AdSlot slotKey="article_sticky" sticky/>
  </main>;
}
