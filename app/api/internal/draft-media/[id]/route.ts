import { NextResponse } from "next/server";
import { authorizeAutomationRequest } from "@/lib/automation/auth";
import { processDraftMedia } from "@/lib/automation/media";

export const dynamic="force-dynamic";
export const maxDuration=300;

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  if(!(await authorizeAutomationRequest(request))) return NextResponse.json({error:"Unauthorized"},{status:401});
  const {id}=await params;
  try{
    const results=await processDraftMedia(id);
    return NextResponse.json({ok:true,draftId:id,generated:results.length,results});
  }catch(error){
    console.error(error);
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:String(error)},{status:500});
  }
}
