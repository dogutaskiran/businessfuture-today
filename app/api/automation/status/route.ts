import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();

  const [runs, drafts, clusters, items] = await Promise.all([
    db().query(`
      SELECT id, status, started_at, finished_at, stats, error
      FROM automation_runs
      ORDER BY started_at DESC
      LIMIT 10
    `),
    db().query(`
      SELECT id, slug, title, category, status, model, created_at
      FROM drafts
      ORDER BY created_at DESC
      LIMIT 20
    `),
    db().query(`SELECT COUNT(*)::int AS count FROM clusters`),
    db().query(`SELECT COUNT(*)::int AS count FROM source_items`)
  ]);

  return NextResponse.json({
    runs: runs.rows,
    drafts: drafts.rows,
    clusterCount: clusters.rows[0]?.count ?? 0,
    sourceItemCount: items.rows[0]?.count ?? 0
  });
}
