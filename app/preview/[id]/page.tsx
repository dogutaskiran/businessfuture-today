import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationArticle } from "@/components/publication/article";
import type { Story } from "@/lib/content";
import { db } from "@/lib/db";
import { canonicalTemplate } from "@/lib/publication";
import { bundleJson } from "@/lib/automation/crawlmesh";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata:Metadata={robots:{index:false,follow:false},title:"Draft preview · Business Future Today"};

type DraftRow={id:string;slug:string;title:string;dek:string;kicker:string;category:string;body_markdown:string;source_urls:string[];social_caption:string;model:string;status:string;created_at:Date;published_at:Date|null;metadata:Record<string,unknown>};
type MediaRow={role:string;hero_path:string;card_path:string;og_path:string;alt_text:string;attribution_text:string|null;source_type:string;source_page_url:string|null;source_image_url:string|null;license_status:string;license_basis:string|null;width:number|null;height:number|null};
type SourceRow={source_name:string;url:string;canonical_url:string|null;crawl_ingest_id:string|null;crawl_document_id:string|null;crawl_revision_id:string|null;published_at:Date|null};
type ResourceBundle={images?:Array<Record<string,unknown>>;embeds?:Array<{provider?:string;url?:string;title?:string;host?:string;source?:string}>;supportingLinks?:Array<{url?:string;host?:string;text?:string;role?:string}>};

function minutes(markdown:string){return `${Math.max(1,Math.round(markdown.trim().split(/\s+/).length/220))} min`;}
function safeUrl(value:unknown){return typeof value==="string"&&/^https?:\/\//i.test(value)?value:null;}

export default async function DraftPreview({params}:{params:Promise<{id:string}>}){
  const{id}=await params;
  const draft=(await db().query<DraftRow>(`SELECT id,slug,title,dek,kicker,category,body_markdown,source_urls,social_caption,model,status,created_at,published_at,metadata FROM drafts WHERE id=$1::uuid LIMIT 1`,[id])).rows[0];
  if(!draft)notFound();
  const media=(await db().query<MediaRow>(`SELECT role,hero_path,card_path,og_path,alt_text,attribution_text,source_type,source_page_url,source_image_url,license_status,license_basis,width,height FROM media_assets WHERE draft_id=$1::uuid ORDER BY CASE role WHEN 'hero' THEN 0 WHEN 'inline_1' THEN 1 WHEN 'inline_2' THEN 2 ELSE 9 END`,[id])).rows;
  const sources=(await db().query<SourceRow>(`SELECT s.name source_name,si.url,si.canonical_url,si.crawl_ingest_id,si.crawl_document_id::text,si.crawl_revision_id::text,si.published_at FROM drafts d JOIN cluster_items ci ON ci.cluster_id=d.cluster_id JOIN source_items si ON si.id=ci.source_item_id JOIN sources s ON s.id=si.source_id WHERE d.id=$1::uuid ORDER BY COALESCE(si.published_at,si.created_at) DESC`,[id])).rows;
  const candidates=(await db().query<{image_url:string;source_kind:string;actual_width:number|null;actual_height:number|null;score:string;selected:boolean;metadata:Record<string,unknown>}>(`SELECT image_url,source_kind,actual_width,actual_height,score::text,selected,metadata FROM source_media_candidates WHERE draft_id=$1::uuid ORDER BY selected DESC,score DESC,ordinal ASC LIMIT 16`,[id])).rows;
  const resourceBundles=await Promise.all(sources.filter(s=>s.crawl_ingest_id).map(async source=>{try{return{source,resources:await bundleJson<ResourceBundle>(source.crawl_ingest_id!,"resources.json")}}catch{return{source,resources:null}}}));
  const hero=media.find(x=>x.role==="hero");
  const inline=media.filter(x=>x.role.startsWith("inline_")).map(x=>({role:x.role,src:x.hero_path,alt:x.alt_text,credit:x.attribution_text}));
  const story:Story={slug:draft.slug,kicker:draft.kicker,title:draft.title,dek:draft.dek,readTime:minutes(draft.body_markdown),category:draft.category as Story["category"],bodyMarkdown:draft.body_markdown,sourceUrls:draft.source_urls,socialCaption:draft.social_caption,publishedAt:(draft.published_at||draft.created_at).toISOString(),generated:true,heroImage:hero?.hero_path||null,cardImage:hero?.card_path||null,ogImage:hero?.og_path||null,imageAlt:hero?.alt_text||draft.title,imageCredit:hero?.attribution_text||null,sourceImageCandidate:hero?.source_image_url||candidates[0]?.image_url||null,licenseStatus:hero?.license_status||null,inlineImages:inline};
  const embeds=resourceBundles.flatMap(x=>x.resources?.embeds||[]);
  const supporting=resourceBundles.flatMap(x=>x.resources?.supportingLinks||[]);
  const sourceImages=resourceBundles.flatMap(x=>(x.resources?.images||[]).map(image=>({source:x.source.source_name,image})));
  return <>
    <div style={{position:"sticky",top:0,zIndex:80,background:"#d8ff43",color:"#11110f",padding:"10px 18px",font:"600 13px/1.3 system-ui",borderBottom:"1px solid #11110f"}}>DRAFT PREVIEW · {draft.status.toUpperCase()} · {draft.model} · {draft.id}</div>
    <PublicationArticle story={story} stories={[]} template={canonicalTemplate}/>
    <section style={{maxWidth:1180,margin:"0 auto 80px",padding:"28px 24px",fontFamily:"system-ui",borderTop:"1px solid #d7d3c8"}}>
      <h2 style={{fontSize:28,marginBottom:8}}>Source artifacts</h2>
      <p style={{maxWidth:820,color:"#5c594f"}}>Everything extracted from the source is preserved as input. Source media shown here is evidence/reference only unless its rights status separately permits publication.</p>
      <h3>Canonical sources</h3>
      <ul>{sources.map(s=><li key={s.url}><a href={s.canonical_url||s.url} target="_blank" rel="noreferrer">{s.source_name}: {s.canonical_url||s.url}</a>{s.crawl_ingest_id?<small> · ingest {s.crawl_ingest_id} · document {s.crawl_document_id} · revision {s.crawl_revision_id}</small>:null}</li>)}</ul>
      <h3>Source image candidates</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18}}>{candidates.slice(0,6).map(c=><figure key={c.image_url} style={{margin:0,border:"1px solid #d7d3c8",padding:10}}><img src={c.image_url} alt="Source candidate" style={{width:"100%",aspectRatio:"3/2",objectFit:"cover",background:"#eee"}}/><figcaption style={{fontSize:12,marginTop:8,wordBreak:"break-word"}}>{c.source_kind} · {c.actual_width||"?"}×{c.actual_height||"?"} · score {c.score}{c.selected?" · SELECTED":""}<br/>Source reference — not automatically cleared for publication.</figcaption></figure>)}</div>
      {sourceImages.length?<><h3>Extracted image manifest</h3><pre style={{whiteSpace:"pre-wrap",fontSize:12,background:"#f4f0e7",padding:14,overflow:"auto"}}>{JSON.stringify(sourceImages,null,2)}</pre></>:null}
      {embeds.length?<><h3>Embedded objects</h3><ul>{embeds.map((e,i)=><li key={`${e.url}-${i}`}><strong>{e.provider||"embed"}</strong> · <a href={safeUrl(e.url)||"#"} target="_blank" rel="noreferrer">{e.title||e.url}</a></li>)}</ul></>:<><h3>Embedded objects</h3><p>None detected in this source article.</p></>}
      {supporting.length?<><h3>Supporting links extracted from article body</h3><ul>{supporting.slice(0,40).map((l,i)=><li key={`${l.url}-${i}`}><a href={safeUrl(l.url)||"#"} target="_blank" rel="noreferrer">{l.text||l.host||l.url}</a> <small>· {l.role||"supporting"} · {l.host}</small></li>)}</ul></>:null}
    </section>
  </>;
}
