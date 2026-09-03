import {randomUUID} from "node:crypto";
import {db,ensureSchema} from "@/lib/db";
import {ingestSources} from "@/lib/automation/ingest";
import {acquireSourceItems} from "@/lib/automation/acquire";
import {clusterStories} from "@/lib/automation/cluster";
import {generateDrafts} from "@/lib/automation/generate";
const LOCK_ID="684250310903";
function msg(e:unknown){return e instanceof Error?e.message:String(e)}
export async function runAutomation(){
 await ensureSchema();const lock=await db().connect();
 await lock.query("BEGIN");
 try{
  const acquired=(await lock.query<{locked:boolean}>(`SELECT pg_try_advisory_xact_lock($1::bigint) locked`,[LOCK_ID])).rows[0]?.locked;
  if(!acquired){await lock.query("ROLLBACK");return{status:"skipped",reason:"already_running"};}
  await db().query(`UPDATE automation_runs SET status='degraded',finished_at=NOW(),error=COALESCE(error,'stale_run_recovered') WHERE status='running'`);
  const runId=randomUUID();await db().query(`INSERT INTO automation_runs(id,status) VALUES($1,'running')`,[runId]);
  const errors:Record<string,string>={};let ingest:any=null,acquisition:any=null,cluster:any=null,generated:any=null;
  try{ingest=await ingestSources()}catch(e){errors.ingest=msg(e)}
  try{acquisition=await acquireSourceItems()}catch(e){errors.acquisition=msg(e)}
  try{cluster=await clusterStories()}catch(e){errors.cluster=msg(e)}
  try{generated=await generateDrafts()}catch(e){errors.generation=msg(e)}
  const providerState=generated?.provider?.state;
  const status=Object.keys(errors).length||providerState==="cooldown"||providerState==="degraded"?"degraded":"completed";
  const stats={ingest,acquisition,cluster,generated,errors};
  await db().query(`UPDATE automation_runs SET status=$2,finished_at=NOW(),stats=$3::jsonb,error=$4 WHERE id=$1`,[runId,status,JSON.stringify(stats),Object.keys(errors).length?JSON.stringify(errors):null]);
  return{runId,status,...stats};
 }finally{try{await lock.query("COMMIT")}catch{try{await lock.query("ROLLBACK")}catch{}}lock.release()}
}
