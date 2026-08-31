import { NextResponse } from "next/server";
import { runAutomation } from "@/lib/automation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (cronSecret && authorization === `Bearer ${cronSecret}`) return true;

  const bootstrapToken = process.env.BOOTSTRAP_TOKEN;
  if (bootstrapToken) {
    const supplied = new URL(request.url).searchParams.get("bootstrap");
    if (supplied === bootstrapToken) return true;
  }

  return false;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAutomation();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Automation failed" },
      { status: 500 }
    );
  }
}

export const POST = GET;
