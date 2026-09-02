import { db } from "@/lib/db";

let initialized = false;

async function ensureNewsletterSchema() {
  if (initialized) return;
  await db().query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      email TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed','unsubscribed','pending')),
      interests JSONB NOT NULL DEFAULT '[]'::jsonb,
      source TEXT NOT NULL DEFAULT 'businessfuture.today',
      consent JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_idx
      ON newsletter_subscribers (status, updated_at DESC);
  `);
  initialized = true;
}

export async function subscribe(params: { email: string; interests?: string[]; source?: string }) {
  await ensureNewsletterSchema();
  const result = await db().query<{ email: string; status: string; updated_at: Date }>(
    `INSERT INTO newsletter_subscribers (email,status,interests,source,consent)
     VALUES ($1,'subscribed',$2::jsonb,$3,$4::jsonb)
     ON CONFLICT (email) DO UPDATE SET
       status='subscribed',
       interests=EXCLUDED.interests,
       source=EXCLUDED.source,
       consent=EXCLUDED.consent,
       updated_at=NOW()
     RETURNING email,status,updated_at`,
    [
      params.email,
      JSON.stringify(params.interests || []),
      params.source || "businessfuture.today",
      JSON.stringify({ source: params.source || "businessfuture.today", form: "bft-web-subscribe", privacy: "accepted", capturedAt: new Date().toISOString() })
    ]
  );
  return result.rows[0];
}
