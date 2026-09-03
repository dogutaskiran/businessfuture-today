import {NextResponse} from "next/server";
import {authorizeAutomationRequest} from "@/lib/automation/auth";
import {db,ensureSchema} from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 await ensureSchema();if(!(await authorizeAutomationRequest(request)))return NextResponse.json({error:"Unauthorized"},{status:401});
 const [runs,drafts,counts,provider,freshness]=await Promise.all([
  db().query(`SELECT id,status,started_at,finished_at,stats,error FROM automation_runs ORDER BY started_at DESC LIMIT 10`),
  db().query(`SELECT id,slug,title,category,status,model,created_at FROM drafts ORDER BY created_at DESC LIMIT 20`),
  db().query(`SELECT status,COUNT(*)::int count,MIN(next_attempt_at) next_attempt_at FROM automation_generation_queue GROUP BY status ORDER BY status`),
  db().query(`SELECT provider,state,cooldown_until,last_error_code,last_success_at,updated_at FROM automation_provider_state ORDER BY provider`),
  db().query(`SELECT MAX(last_fetched_at) last_feed_fetch,COUNT(*) FILTER(WHERE last_fetched_at>NOW()-INTERVAL '30 minutes')::int fresh_sources,COUNT(*)::int sources FROM sources`)
 ]);
 const last=runs.rows[0]?.started_at?new Date(runs.rows[0].started_at).getTime():0;
 return NextResponse.json({healthy:Date.now()-last<40*60_000,stale:!last||Date.now()-last>=40*60_000,lastRun:runs.rows[0]??null,runs:runs.rows,drafts:drafts.rows,queue:counts.rows,providers:provider.rows,feed:freshness.rows[0]??null});
}
