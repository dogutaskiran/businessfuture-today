import {createHash} from "node:crypto";
import {db} from "@/lib/db";
export async function authorizeAutomationRequest(request:Request){
 const auth=request.headers.get("authorization"),cron=process.env.CRON_SECRET;
 if(cron&&auth===`Bearer ${cron}`)return true;
 const bootstrap=process.env.BOOTSTRAP_TOKEN,supplied=new URL(request.url).searchParams.get("bootstrap");
 if(bootstrap&&supplied===bootstrap)return true;
 const token=request.headers.get("x-bft-scheduler-token");if(!token)return false;
 const hash=createHash("sha256").update(token).digest("hex");
 const r=await db().query(`UPDATE automation_scheduler_tokens SET last_used_at=NOW() WHERE token_hash=$1 AND enabled=TRUE RETURNING id`,[hash]);
 return Boolean(r.rowCount);
}
