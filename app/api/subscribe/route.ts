import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PUBMESH_SUBSCRIBE_URL = "https://pubmesh.media/api/v1/public/newsletter/channels/14dc376b-8161-4f1c-bde7-570c620ea0c5/subscribe";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const response = await fetch(PUBMESH_SUBSCRIBE_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      optIn: "double",
      attributes: {
        publication: "business-future-today",
        interests: Array.isArray(body?.interests) ? body.interests : []
      },
      consent: {
        source: typeof body?.source === "string" ? body.source : "businessfuture.today",
        form: "bft-web-subscribe",
        privacy: "accepted"
      }
    }),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: "We couldn't add you yet." }, { status: 502 });
  return NextResponse.json({ ok: true, status: data.status, confirmationRequired: Boolean(data.confirmationRequired), confirmationQueued: Boolean(data.confirmationQueued) });
}
