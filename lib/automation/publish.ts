import {db,ensureSchema} from "@/lib/db";

export async function publishReadyDraft(){
  await ensureSchema();
  const interval=Math.max(15,Math.min(1440,Number(process.env.PUBLICATION_MIN_INTERVAL_MINUTES||480)));
  const latest=await db().query<{published_at:Date|null}>(`SELECT max(published_at) published_at FROM drafts WHERE status='published'`);
  const last=latest.rows[0]?.published_at?new Date(latest.rows[0].published_at):null;
  if(last&&Date.now()-last.getTime()<interval*60_000)return{status:"skipped",reason:"publication_interval",intervalMinutes:interval,lastPublishedAt:last.toISOString()};
  const ready=await db().query<{id:string;slug:string;title:string}>(`SELECT d.id,d.slug,d.title FROM drafts d JOIN media_assets h ON h.draft_id=d.id AND h.role='hero' AND h.hero_path IS NOT NULL WHERE d.status='draft' AND d.created_at>NOW()-INTERVAL '36 hours' AND char_length(d.body_markdown)>=1200 ORDER BY d.created_at DESC LIMIT 1`);
  const draft=ready.rows[0];
  if(!draft)return{status:"skipped",reason:"no_ready_draft",intervalMinutes:interval};
  const result=await db().query<{published_at:Date}>(`UPDATE drafts SET status='published',published_at=NOW(),updated_at=NOW() WHERE id=$1 AND status='draft' RETURNING published_at`,[draft.id]);
  if(!result.rows[0])return{status:"skipped",reason:"draft_changed"};
  return{status:"published",id:draft.id,slug:draft.slug,title:draft.title,publishedAt:new Date(result.rows[0].published_at).toISOString(),intervalMinutes:interval};
}
