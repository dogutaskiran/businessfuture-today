import { NextResponse } from "next/server";

const SUBSCRIBE_URL = "https://dogu.one/api/publications/business-future-today/subscribe";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const response = await fetch(SUBSCRIBE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...body,
        source: typeof body?.source === "string" ? body.source : "businessfuture.today",
        form: "bft-web-subscribe",
        consentVersion: "2026-09-02",
      }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error || "We couldn't add you yet." },
        { status: response.status },
      );
    }
    return NextResponse.json({
      ok: true,
      status: result?.status || "subscribed",
      confirmationRequired: false,
      confirmationQueued: false,
    });
  } catch (error) {
    console.error("central publication subscribe failed", error);
    return NextResponse.json({ error: "We couldn't add you yet." }, { status: 502 });
  }
}
