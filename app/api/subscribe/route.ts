import { NextResponse } from "next/server";
import { subscribe } from "@/lib/newsletter";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  try {
    const subscriber = await subscribe({
      email,
      interests: Array.isArray(body?.interests) ? body.interests.filter((value: unknown): value is string => typeof value === "string").slice(0, 20) : [],
      source: typeof body?.source === "string" ? body.source.slice(0, 200) : "businessfuture.today",
      frequency: body?.frequency === "weekly" ? "weekly" : "daily"
    });
    return NextResponse.json({
      ok: true,
      status: subscriber.status,
      confirmationRequired: false,
      confirmationQueued: false
    });
  } catch (error) {
    console.error("newsletter subscribe failed", error);
    return NextResponse.json({ error: "We couldn't add you yet." }, { status: 502 });
  }
}
