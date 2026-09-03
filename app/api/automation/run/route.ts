import {NextResponse} from "next/server";
import {runAutomation} from "@/lib/automation";
import {authorizeAutomationRequest} from "@/lib/automation/auth";
import {ensureSchema} from "@/lib/db";
export const dynamic="force-dynamic";export const maxDuration=300;
export async function GET(request:Request){
 try{await ensureSchema();if(!(await authorizeAutomationRequest(request)))return NextResponse.json({error:"Unauthorized"},{status:401});
  const result=await runAutomation();return NextResponse.json({ok:true,...result});
 }catch(error){console.error(error);return NextResponse.json({error:error instanceof Error?error.message:"Automation failed"},{status:500})}
}
export const POST=GET;
