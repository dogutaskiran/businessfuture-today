import { socialOutboxResponse } from "@/lib/social-outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return await socialOutboxResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("social outbox failed", error);
    return Response.json(
      { ok: false, error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
