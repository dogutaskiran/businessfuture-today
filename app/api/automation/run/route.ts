import {NextResponse} from "next/server";
import {runAutomation} from "@/lib/automation";
import {authorizeAutomationRequest} from "@/lib/automation/auth";
import {ensureSchema} from "@/lib/db";
export const dynamic="force-dynamic";export const maxDuration=300;

function authProbe(request:Request){
 const auth=request.headers.get("authorization");
 const bearer=auth?.startsWith("Bearer ")?auth.slice(7):"";
 const cron=process.env.CRON_SECRET||"";
 const control=process.env.AUTOMATION_CONTROL_TOKEN||"";
 return {
  authPresent:Boolean(auth),
  bearerLength:bearer.length,
  cronConfigured:Boolean(cron),
  cronLength:cron.length,
  controlConfigured:Boolean(control),
  controlLength:control.length,
  cronMatch:Boolean(bearer&&cron&&bearer===cron),
  controlMatch:Boolean(bearer&&control&&bearer===control)
 };
}

export async function GET(request:Request){
 try{
  await ensureSchema();
  if(!(await authorizeAutomationRequest(request)))return NextResponse.json({error:"Unauthorized",probe:authProbe(request)},{status:401});
  const result=await runAutomation();return NextResponse.json({ok:true,...result});
 }catch(error){console.error(error);return NextResponse.json({error:error instanceof Error?error.message:"Automation failed"},{status:500})}
}
export const POST=GET;
