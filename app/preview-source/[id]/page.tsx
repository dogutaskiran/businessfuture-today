import type {Metadata} from "next";
import {notFound} from "next/navigation";
import {PublicationArticle} from "@/components/publication/article";
import type {Story} from "@/lib/content";
import {db} from "@/lib/db";
import {canonicalTemplate} from "@/lib/publication";
import {bundleJson} from "@/lib/automation/crawlmesh";

export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata:Metadata={robots:{index:false,follow:false},title:"Source asset preview · Business Future Today"};

type DraftRow={id:string;slug:string;title:string;dek:string;kicker:string;category:string;body_markdown:string;source_urls:string[];social_caption:string;model:string;status:string;created_at:Date;published_at:Date|null};
type SourceRow={source_name:string;url:string;canonical_url:string|null;crawl_ingest_id:string|null};
type Candidate={image_url:string;source_kind:string;actual_width:number|null;actual_height:number|null;score:string;selected:boolean};
type Provenance={strategy?:string;aiUsed?:boolean;images?:Array<{sourceUrl?:string;credit?:{value?:string}|null;copyrightOwner?:{value?:string}|null;primarySourceCandidates?:Array<{url?:string;host?:string;score?:number;reasons?:string[]}>}>};
function minutes(markdown:string){return `${Math.max(1,Math.round(markdown.trim().split(/\s+/).length/220))} min`;}
function stem(url:string){try{const u=new URL(url);return u.pathname.replace(/\?.*$/,'').replace(/\?.*$/,'');}catch{return url;}}

export default async function SourceAssetPreview({params}:{params:Promise<{id:string}>}){
 const{id}=await params;
 const draft=(await db().query<DraftRow>(`SELECT id,slug,title,dek,kicker,category,body_markdown,source_urls,social_caption,model,status,created_at,published_at FROM drafts WHERE id=$1::uuid LIMIT 1`,[id])).rows[0];
 if(!draft)notFound();
 const sources=(await db().query<SourceRow>(`SELECT s.name source_name,si.url,si.canonical_url,si.crawl_ingest_id FROM drafts d JOIN cluster_items ci ON ci.cluster_id=d.cluster_id JOIN source_items si ON si.id=ci.source_item_id JOIN sources s ON s.id=si.source_id WHERE d.id=$1::uuid ORDER BY COALESCE(si.published_at,si.created_at) DESC`,[id])).rows;
 const candidates=(await db().query<Candidate>(`SELECT image_url,source_kind,actual_width,actual_height,score::text,selected FROM source_media_candidates WHERE draft_id=$1::uuid AND actual_width IS NOT NULL AND actual_height IS NOT NULL ORDER BY selected DESC,actual_width*actual_height DESC,score DESC LIMIT 20`,[id])).rows;
 const hero=candidates.find(x=>x.selected)||candidates[0];
 if(!hero)notFound();
 let provenance:Provenance|null=null;
 const ingestId=sources.find(x=>x.crawl_ingest_id)?.crawl_ingest_id;
 if(ingestId){try{provenance=await bundleJson<Provenance>(ingestId,"provenance.json");}catch{}}
 const heroStem=stem(hero.image_url);
 const pimg=provenance?.images?.find(x=>x.sourceUrl&&stem(x.sourceUrl)===heroStem)||provenance?.images?.find(x=>x.credit?.value);
 const credit=pimg?.credit?.value||pimg?.copyrightOwner?.value||sources[0]?.source_name||null;
 const story:Story={slug:draft.slug,kicker:draft.kicker,title:draft.title,dek:draft.dek,readTime:minutes(draft.body_markdown),category:draft.category as Story["category"],bodyMarkdown:draft.body_markdown,sourceUrls:draft.source_urls,socialCaption:draft.social_caption,publishedAt:(draft.published_at||draft.created_at).toISOString(),generated:true,heroImage:hero.image_url,cardImage:hero.image_url,ogImage:hero.image_url,imageAlt:draft.title,imageCredit:credit?`Image: ${credit} · source asset`:"Source asset",sourceImageCandidate:hero.image_url,licenseStatus:"source-editorial-preview",inlineImages:[]};
 const primary=pimg?.primarySourceCandidates?.[0];
 return <div className="draft-preview source-asset-preview">
   <aside className="draft-preview__bar" aria-label="Source asset preview status"><div className="draft-preview__bar-inner"><span className="draft-preview__badge">Source asset preview</span><span>AI media off</span><span>{hero.actual_width}×{hero.actual_height}</span><code>{draft.id}</code></div></aside>
   <PublicationArticle story={story} stories={[]} template={canonicalTemplate}/>
   <section className="preview-artifacts publication publication--newsroom"><div className="preview-artifacts__inner pub-shell">
    <header className="preview-artifacts__head"><div><p className="pub-kicker">Deterministic provenance</p><h2>Source media path</h2><p>This preview uses the source article image directly. No image model was called. Credit and primary-source candidates come from deterministic page metadata and DOM evidence.</p></div><div className="preview-artifacts__summary"><span><strong>{hero.actual_width||"?"}×{hero.actual_height||"?"}</strong>source image</span><span><strong>{credit||"—"}</strong>credit</span><span><strong>{provenance?.aiUsed===false?"No":"—"}</strong>AI used</span><span><strong>{primary?.score??"—"}</strong>primary score</span></div></header>
    <section className="preview-artifacts__section"><div className="preview-artifacts__section-head"><h3>Selected source asset</h3><span>{hero.source_kind}</span></div><div className="preview-source-list"><article className="preview-source"><div><span>Image URL</span><a href={hero.image_url} target="_blank" rel="noreferrer">{hero.image_url}</a></div><dl><div><dt>Credit</dt><dd>{credit||"unknown"}</dd></div><div><dt>Mode</dt><dd>source-direct-preview</dd></div>{primary?<div><dt>Primary</dt><dd>{primary.url}</dd></div>:null}</dl></article></div></section>
   </div></section>
 </div>;
}
