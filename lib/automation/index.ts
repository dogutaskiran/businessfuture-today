import { randomUUID } from "node:crypto";
import { db, ensureSchema } from "@/lib/db";
import { ingestSources } from "@/lib/automation/ingest";
import { clusterStories } from "@/lib/automation/cluster";
import { generateDrafts } from "@/lib/automation/generate";

export async function runAutomation() {
  await ensureSchema();
  const runId = randomUUID();
  await db().query(`INSERT INTO automation_runs (id,status) VALUES ($1,'running')`, [runId]);

  try {
    const ingest = await ingestSources();
    const cluster = await clusterStories();
    const generated = await generateDrafts();
    const stats = { ingest, cluster, generated };

    await db().query(
      `UPDATE automation_runs SET status='completed',finished_at=NOW(),stats=$2::jsonb WHERE id=$1`,
      [runId,JSON.stringify(stats)]
    );
    return { runId, ...stats };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db().query(
      `UPDATE automation_runs SET status='failed',finished_at=NOW(),error=$2 WHERE id=$1`,
      [runId,message]
    );
    throw error;
  }
}
