import { NextResponse } from "next/server";
import { authorizeAutomationRequest } from "@/lib/automation/auth";
import { runSocialAutomation } from "@/lib/automation/social";
import { db, ensureSchema } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const SOCIAL_LOCK_ID = "684250310906";

export async function GET(request: Request) {
  if (!(await authorizeAutomationRequest(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const lock = await db().connect();
  try {
    const acquired = (await lock.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_lock($1::bigint) locked`,
      [SOCIAL_LOCK_ID]
    )).rows[0]?.locked;

    if (!acquired) {
      return NextResponse.json({ ok: true, status: "skipped", reason: "social_already_running" });
    }

    const result = await runSocialAutomation();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, status: "failed", error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    try { await lock.query(`SELECT pg_advisory_unlock($1::bigint)`, [SOCIAL_LOCK_ID]); } catch {}
    lock.release();
  }
}

export const POST = GET;
