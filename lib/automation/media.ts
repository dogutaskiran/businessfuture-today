import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { db, ensureSchema } from "@/lib/db";
import { selectBestSourceImage } from "@/lib/automation/source-media";

type MediaRole = "hero" | "inline_1" | "inline_2";
type DraftRow = { id:string; cluster_id:string; slug:string; title:string; dek:string; category:string; body_markdown:string; source_urls:string[]; roles:string[] };
type RightsMode = "owned"|"licensed"|"editorial"|"public_license"|"review"|"deny";
type SourceMedia = { pageUrl:string|null; imageUrl:string|null; licenseUrl:string|null; licenseStatus:string; licenseBasis:string; attribution:string|null; reusable:boolean; rightsMode:RightsMode };

type SourcePolicy = { domain:string; mode:RightsMode; allowed_roles:unknown; attribution_template:string|null; license_basis:string|null };

const STYLE = [
  "Business Future Today visual system: premium modern business/technology editorial art direction.",
  "Prefer documentary realism, precise industrial/product detail, architectural scale, or restrained conceptual compositions.",
  "Avoid generic AI tropes: no glowing brains, humanoid robots at laptops, neon cyberpunk cities, floating holographic dashboards, random binary code, or meaningless circuit-board overlays.",
  "Generated illustration may use warm cream (#F4F0E7), near-black (#11110F), neutral industrial tones, and a very sparing acid-lime (#D8FF43) accent. Photography should remain natural rather than colorized.",
  "No visible logos, fake UI, text labels, watermarks, or copied protected artwork."
].join(" ");

function meta(html:string,key:string){
  const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  for(const p of [new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,`i`),new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,`i`)]){const m=html.match(p);if(m?.[1])return m[1].replace(/&amp;/g,"&");}
  return null;
}
function licenseFromHtml(html:string){return html.match(/<link[^>]+rel=["'][^"']*license[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1]||html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*license[^"']*["']/i)?.[1]||html.match(/["']license["']\s*:\s*["']([^"']+)["']/i)?.[1]||null;}
function reusableLicense(url:string|null){if(!url)return false;const v=url.toLowerCase();return v.includes("creativecommons.org/licenses/by/")||v.includes("creativecommons.org/licenses/by-sa/")||v.includes("creativecommons.org/publicdomain/")||v.includes("creativecommons.org/publicdomain/zero/");}
function hostname(url:string|null){try{return url?new URL(url).hostname.toLowerCase().replace(/^www\./,""):null;}catch{return null;}}
function allowedRole(policy:SourcePolicy|null,role:MediaRole){if(!policy)return false;const roles=Array.isArray(policy.allowed_roles)?policy.allowed_roles:[];return roles.includes(role)||roles.includes("all");}

async function policyFor(pageUrl:string|null):Promise<SourcePolicy|null>{
  const domain=hostname(pageUrl); if(!domain)return null;
  const candidates=[domain,...domain.split(".").slice(-2)];
  for(const candidate of [...new Set(candidates)]){
    const r=await db().query<SourcePolicy>(`SELECT domain,mode,allowed_roles,attribution_template,license_basis FROM source_media_policies WHERE domain=$1 LIMIT 1`,[candidate]);
    if(r.rows[0])return r.rows[0];
  }
  return null;
}

async function resolveSourceMedia(draftId:string,sourceUrls:string[],rssImageUrl:string|null,role:MediaRole):Promise<SourceMedia>{
  const pageUrl=sourceUrls[0]||null;
  if(!pageUrl)return{pageUrl:null,imageUrl:null,licenseUrl:null,licenseStatus:"none",licenseBasis:"No source page",attribution:null,reusable:false,rightsMode:"review"};
  const policy=await policyFor(pageUrl); const rightsMode=policy?.mode||"review";
  try{
    const response=await fetch(pageUrl,{headers:{"user-agent":"BusinessFutureToday/0.4 (+https://businessfuture.today)"},redirect:"follow",signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`HTTP_${response.status}`);
    const html=(await response.text()).slice(0,2_500_000);
    const best=await selectBestSourceImage({draftId,pageUrl,rssImageUrl,rank:role==="hero"?0:role==="inline_1"?1:2});
    const imageUrl=best?.url||rssImageUrl||meta(html,"og:image")||meta(html,"twitter:image")||null;
    const licenseUrl=meta(html,"license")||licenseFromHtml(html);
    const publicReusable=reusableLicense(licenseUrl);
    const policyReusable=!!policy&&allowedRole(policy,role)&&(rightsMode==="owned"||rightsMode==="licensed"||rightsMode==="editorial"||(rightsMode==="public_license"&&publicReusable));
    const reusable=!!imageUrl&&(publicReusable||policyReusable);
    const author=meta(html,"author"); const site=meta(html,"og:site_name");
    const attribution=policy?.attribution_template||author||site||hostname(pageUrl);
    return{pageUrl,imageUrl,licenseUrl,licenseStatus:rightsMode==="deny"?"denied":reusable?(rightsMode==="owned"?"owned":rightsMode==="licensed"?"licensed":rightsMode==="editorial"?"editorial":"reusable"):imageUrl?"unknown":"none",licenseBasis:rightsMode==="deny"?(policy?.license_basis||"Source policy denies media reuse"):reusable?(policy?.license_basis||`Reusable license: ${licenseUrl||rightsMode}`):imageUrl?"Publisher image discovered, but no reusable rights profile/license was found":"No source image discovered",attribution,reusable:rightsMode==="deny"?false:reusable,rightsMode};
  }catch(error){return{pageUrl,imageUrl:null,licenseUrl:null,licenseStatus:"unresolved",licenseBasis:error instanceof Error?error.message:"Source media lookup failed",attribution:null,reusable:false,rightsMode};}
}

async function downloadImage(url:string){const response=await fetch(url,{headers:{"user-agent":"BusinessFutureToday/0.4 (+https://businessfuture.today)"},redirect:"follow",signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`IMAGE_HTTP_${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>15_000_000)throw new Error("SOURCE_IMAGE_TOO_LARGE");return bytes;}

function roleDirection(draft:DraftRow,role:MediaRole){
  if(role==="hero")return `Create the lead editorial image. It should communicate the story's central tension at a glance and work as a premium publication cover image.`;
  const plain=draft.body_markdown.replace(/[#*_>`-]/g," ").replace(/\s+/g," ").trim();
  const excerpt=role==="inline_1"?plain.slice(Math.floor(plain.length*.15),Math.floor(plain.length*.55)):plain.slice(Math.floor(plain.length*.5),Math.floor(plain.length*.9));
  return role==="inline_1"
    ? `Create a supporting editorial detail image distinct from the hero. Visualize one concrete mechanism, object, environment, or operational consequence from this article section: ${excerpt.slice(0,1100)}. It should feel evidentiary and specific, not like a second cover.`
    : `Create a second supporting explainer image distinct from both the hero and first inline. Focus on a different downstream consequence or system relationship from: ${excerpt.slice(0,1100)}. Keep it visually simple and factual.`;
}

async function generateImage(draft:DraftRow,source:SourceMedia,role:MediaRole){
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,maxRetries:0,timeout:300_000});
  const prompt=[STYLE,`Article: ${draft.title}`,`Context: ${draft.dek}`,`Category: ${draft.category}.`,roleDirection(draft,role),"Landscape 3:2 composition with clean crop-safe edges.",source.imageUrl?"A publisher source image was discovered but is not reusable under current rights policy. Do not copy its composition or protected details; create an independent original visual.":"Create an independent original visual."].join("\n\n");
  const response=await client.responses.create({model:process.env.OPENAI_IMAGE_ORCHESTRATOR_MODEL||"gpt-5.6-terra",input:prompt,store:false,tools:[{type:"image_generation",model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-2",size:"1536x1024",quality:"medium",output_format:"webp"}],tool_choice:{type:"image_generation"}});
  const call=response.output.find((item:any)=>item.type==="image_generation_call") as any;if(!call?.result)throw new Error("OPENAI_IMAGE_RESULT_MISSING");
  return{bytes:Buffer.from(call.result,"base64"),prompt,responseId:response.id,model:process.env.OPENAI_IMAGE_MODEL||"gpt-image-2"};
}

async function makeVariants(slug:string,role:MediaRole,bytes:Buffer){
  const dir=path.join(process.cwd(),"public","media",slug);await mkdir(dir,{recursive:true});
  if(role==="hero"){
    const original=path.join(dir,"original.webp"),hero=path.join(dir,"hero.webp"),card=path.join(dir,"card.webp"),og=path.join(dir,"og.webp"),socialSquare=path.join(dir,"social-square.webp"),socialPortrait=path.join(dir,"social-portrait.webp");
    await sharp(bytes).rotate().resize(1600,1067,{fit:"cover",position:"attention",withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(original);
    await sharp(bytes).rotate().resize(1536,1024,{fit:"cover",position:"attention"}).webp({quality:82,effort:5}).toFile(hero);
    await sharp(bytes).rotate().resize(1200,675,{fit:"cover",position:"attention"}).webp({quality:80,effort:5}).toFile(card);
    await sharp(bytes).rotate().resize(1200,630,{fit:"cover",position:"attention"}).webp({quality:80,effort:5}).toFile(og);
    await sharp(bytes).rotate().resize(1080,1080,{fit:"cover",position:"attention"}).webp({quality:82,effort:5}).toFile(socialSquare);
    await sharp(bytes).rotate().resize(1080,1350,{fit:"cover",position:"attention"}).webp({quality:82,effort:5}).toFile(socialPortrait);
    return{original:`/media/${slug}/original.webp`,hero:`/media/${slug}/hero.webp`,card:`/media/${slug}/card.webp`,og:`/media/${slug}/og.webp`,socialSquare:`/media/${slug}/social-square.webp`,socialPortrait:`/media/${slug}/social-portrait.webp`,width:1536,height:1024};
  }
  const stem=role.replace("_","-"); const original=path.join(dir,`${stem}-original.webp`),inline=path.join(dir,`${stem}.webp`);
  await sharp(bytes).rotate().resize(1600,1067,{fit:"cover",position:"attention",withoutEnlargement:true}).webp({quality:84,effort:5}).toFile(original);
  await sharp(bytes).rotate().resize(1280,853,{fit:"cover",position:"attention"}).webp({quality:82,effort:5}).toFile(inline);
  const publicInline=`/media/${slug}/${stem}.webp`;
  return{original:`/media/${slug}/${stem}-original.webp`,hero:publicInline,card:publicInline,og:publicInline,socialSquare:null,socialPortrait:null,width:1280,height:853};
}

function requiredRoles(draft:DraftRow):MediaRole[]{const words=draft.body_markdown.trim().split(/\s+/).length;return ["hero",...(words>=300?["inline_1" as const]:[]),...(words>=700?["inline_2" as const]:[])];}

export async function processArticleMedia(){
  await ensureSchema(); const limit=Math.max(1,Math.min(8,Number(process.env.MEDIA_MAX_GENERATIONS||2)));
  const rows=await db().query<DraftRow>(`SELECT d.id,d.cluster_id,d.slug,d.title,d.dek,d.category,d.body_markdown,d.source_urls,COALESCE(array_agg(m.role) FILTER (WHERE m.role IS NOT NULL),ARRAY[]::text[]) roles FROM drafts d LEFT JOIN media_assets m ON m.draft_id=d.id WHERE d.status='published' GROUP BY d.id ORDER BY d.published_at DESC NULLS LAST,d.created_at DESC LIMIT 80`);
  const results:any[]=[]; let generatedCount=0;
  for(const draft of rows.rows){
    for(const role of requiredRoles(draft)){
      if(draft.roles.includes(role)||generatedCount>=limit)continue;
      const rssMedia=await db().query<{image_url:string|null}>(`SELECT COALESCE(si.raw->'media'->>'enclosure',si.raw->'media'->>'mediaContent',si.raw->'media'->>'mediaThumbnail') image_url FROM cluster_items ci JOIN source_items si ON si.id=ci.source_item_id WHERE ci.cluster_id=$1 AND COALESCE(si.raw->'media'->>'enclosure',si.raw->'media'->>'mediaContent',si.raw->'media'->>'mediaThumbnail') IS NOT NULL LIMIT 1`,[draft.cluster_id]);
      const source=await resolveSourceMedia(draft.id,draft.source_urls||[],rssMedia.rows[0]?.image_url||null,role);
      let bytes:Buffer,sourceType:"source"|"generated"="generated",prompt:string|null=null,generation:any=null;
      if(source.reusable&&source.imageUrl){try{bytes=await downloadImage(source.imageUrl);sourceType="source";}catch{generation=await generateImage(draft,source,role);bytes=generation.bytes;prompt=generation.prompt;}}else{generation=await generateImage(draft,source,role);bytes=generation.bytes;prompt=generation.prompt;}
      const paths=await makeVariants(draft.slug,role,bytes!); const assetId=randomUUID(); const alt=role==="hero"?`Editorial image for ${draft.title}`:`Supporting image for ${draft.title}`; const credit=sourceType==="source"?source.attribution:"Illustration: Business Future Today";
      await db().query(`INSERT INTO media_assets (id,draft_id,role,source_type,source_page_url,source_image_url,license_status,license_basis,attribution_text,original_path,hero_path,card_path,og_path,social_square_path,social_portrait_path,mime_type,width,height,alt_text,prompt,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'image/webp',$16,$17,$18,$19,$20::jsonb) ON CONFLICT (draft_id,role) DO NOTHING`,[assetId,draft.id,role,sourceType,source.pageUrl,source.imageUrl,source.licenseStatus,source.licenseBasis,credit,paths.original,paths.hero,paths.card,paths.og,paths.socialSquare,paths.socialPortrait,paths.width,paths.height,alt,prompt,JSON.stringify({licenseUrl:source.licenseUrl,rightsMode:source.rightsMode,generationResponseId:generation?.responseId||null,generationModel:generation?.model||null})]);
      results.push({slug:draft.slug,role,sourceType,path:paths.hero,sourceCandidate:source.imageUrl,licenseStatus:source.licenseStatus,rightsMode:source.rightsMode}); generatedCount++;
    }
    if(generatedCount>=limit)break;
  }
  return results;
}
