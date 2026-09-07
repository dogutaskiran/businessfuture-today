import { db } from "@/lib/db";
import { socialOutboxResponse } from "@/lib/social-outbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function ensureSocialPublicationLedger() {
  await db().query(`
    CREATE TABLE IF NOT EXISTS social_publications (
      id BIGSERIAL PRIMARY KEY,
      publication TEXT NOT NULL DEFAULT 'business-future-today',
      content_slug TEXT,
      platform TEXT NOT NULL,
      account_handle TEXT,
      account_id TEXT,
      object_id TEXT NOT NULL,
      object_type TEXT NOT NULL DEFAULT 'post',
      status TEXT NOT NULL,
      permalink TEXT,
      asset_url TEXT,
      published_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ,
      source_commit TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (platform, object_id)
    );

    CREATE INDEX IF NOT EXISTS social_publications_content_idx
      ON social_publications (platform, content_slug, status, published_at DESC);
  `);
}

export async function GET() {
  await ensureSocialPublicationLedger();
  return socialOutboxResponse();
}
