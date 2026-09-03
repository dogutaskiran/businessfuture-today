import {NextResponse} from "next/server";
import {authorizeAutomationRequest} from "@/lib/automation/auth";
import {processArticleMedia} from "@/lib/automation/media";
import {db,ensureSchema} from "@/lib/db";

export const dynamic="force-dynamic";
export const maxDuration=300;
const MEDIA_LOCK_ID="684250310904";

export async function GET(request:Request){
  if(!(await authorizeAutomationRequest(request)))return NextResponse.json({error:"Unauthorized"},{status:401});
  await ensureSchema();
  const lock=await db().connect();
  try{
    const acquired=(await lock.query<{locked:boolean}>(`SELECT pg_try_advisory_lock($1::bigint) locked`,[MEDIA_LOCK_ID])).rows[0]?.locked;
    if(!acquired)return NextResponse.json({ok:true,status:"skipped",reason:"media_already_running"});
    const results=await processArticleMedia({includeDrafts:true,maxGenerations:1});
    return NextResponse.json({ok:true,status:"completed",generated:results.length,results});
  }catch(error){
    console.error(error);
    return NextResponse.json({ok:false,status:"failed",error:error instanceof Error?error.message:String(error)},{status:500});
  }finally{
    try{await lock.query(`SELECT pg_advisory_unlock($1::bigint)`,[MEDIA_LOCK_ID]);}catch{}
    lock.release();
  }
}
export const POST=GET;
