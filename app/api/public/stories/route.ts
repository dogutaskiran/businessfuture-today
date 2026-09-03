import {NextResponse} from "next/server";
import {db,ensureSchema} from "@/lib/db";
export const dynamic="force-dynamic";
function readTime(markdown:string){const words=String(markdown||"").trim().split(/\s+/).filter(Boolean).length;return `${Math.max(2,Math.ceil(words/220))} min`}
export async function GET(request:Request){
  await ensureSchema();
  const requested=Number(new URL(request.url).searchParams.get("limit")||100);const limit=Math.max(1,Math.min(500,Number.isFinite(requested)?requested:100));
  const result=await db().query(`SELECT d.slug,d.kicker,d.title,d.dek,d.category,d.body_markdown,d.source_urls,d.social_caption,d.published_at,h.hero_path,h.card_path,h.og_path,h.social_square_path,h.social_portrait_path,h.alt_text,h.attribution_text,h.source_image_url,h.license_status FROM drafts d LEFT JOIN media_assets h ON h.draft_id=d.id AND h.role='hero' WHERE d.status='published' ORDER BY d.published_at DESC NULLS LAST,d.created_at DESC LIMIT $1`,[limit]);
  const stories=result.rows.map((row:any,index:number)=>({slug:row.slug,kicker:row.kicker,title:row.title,dek:row.dek,readTime:readTime(row.body_markdown),category:row.category,featured:index===0,bodyMarkdown:row.body_markdown,sourceUrls:row.source_urls||[],socialCaption:row.social_caption||"",publishedAt:row.published_at?new Date(row.published_at).toISOString():null,generated:true,heroImage:row.hero_path,cardImage:row.card_path,ogImage:row.og_path,socialSquareImage:row.social_square_path,socialPortraitImage:row.social_portrait_path,imageAlt:row.alt_text,imageCredit:row.attribution_text,sourceImageCandidate:row.source_image_url,licenseStatus:row.license_status}));
  return NextResponse.json({stories},{headers:{"cache-control":"public, max-age=30, s-maxage=60, stale-while-revalidate=300"}})
}
