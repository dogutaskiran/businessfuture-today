import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const endpoint = process.env.PUBMESH_SUBSCRIBE_URL;
  const token = process.env.PUBMESH_SERVICE_TOKEN;

  if (!endpoint) {
    return NextResponse.json(
      { error: "Subscriptions are opening shortly." },
      { status: 503 }
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      email,
      source: body?.source || "businessfuture.today",
      publication: "business-future-today",
      interests: Array.isArray(body?.interests) ? body.interests : []
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: "We couldn't add you yet." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
