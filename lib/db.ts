import { Pool } from "pg";

declare global {
  var __businessFuturePool: Pool | undefined;
}

function connectionString() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is not configured");
  return value;
}

export function db() {
  if (!globalThis.__businessFuturePool) {
    globalThis.__businessFuturePool = new Pool({
      connectionString: connectionString(),
      max: 3,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
    });
  }

  return globalThis.__businessFuturePool;
}

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;

  await db().query(`
    CREATE TABLE IF NOT EXISTS sources (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      weight NUMERIC NOT NULL DEFAULT 1,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_fetched_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS source_items (
      id TEXT PRIMARY KEY,
      source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
      url TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      author TEXT,
      published_at TIMESTAMPTZ,
      raw JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS source_items_published_idx
      ON source_items (published_at DESC);

    CREATE TABLE IF NOT EXISTS clusters (
      id UUID PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      score NUMERIC NOT NULL DEFAULT 0,
      source_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS clusters_score_idx
      ON clusters (score DESC, updated_at DESC);

    CREATE TABLE IF NOT EXISTS cluster_items (
      cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
      source_item_id TEXT NOT NULL REFERENCES source_items(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (cluster_id, source_item_id),
      UNIQUE (source_item_id)
    );

    CREATE TABLE IF NOT EXISTS drafts (
      id UUID PRIMARY KEY,
      cluster_id UUID NOT NULL UNIQUE REFERENCES clusters(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      dek TEXT NOT NULL,
      kicker TEXT NOT NULL,
      category TEXT NOT NULL,
      body_markdown TEXT NOT NULL,
      source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
      social_caption TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS drafts_status_idx
      ON drafts (status, created_at DESC);

    CREATE TABLE IF NOT EXISTS source_media_policies (
      domain TEXT PRIMARY KEY,
      mode TEXT NOT NULL DEFAULT 'review' CHECK (mode IN ('owned','licensed','public_license','review','deny')),
      allowed_roles JSONB NOT NULL DEFAULT '["hero","inline_1","inline_2","social"]'::jsonb,
      attribution_template TEXT,
      license_basis TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    INSERT INTO source_media_policies (domain,mode,attribution_template,license_basis)
    VALUES ('businessfuture.today','owned','Business Future Today','First-party publication media')
    ON CONFLICT (domain) DO NOTHING;

    CREATE TABLE IF NOT EXISTS media_assets (
      id UUID PRIMARY KEY,
      draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'hero',
      source_type TEXT NOT NULL,
      source_page_url TEXT,
      source_image_url TEXT,
      license_status TEXT NOT NULL DEFAULT 'unknown',
      license_basis TEXT,
      attribution_text TEXT,
      original_path TEXT NOT NULL,
      hero_path TEXT NOT NULL,
      card_path TEXT NOT NULL,
      og_path TEXT NOT NULL,
      mime_type TEXT NOT NULL DEFAULT 'image/webp',
      width INTEGER,
      height INTEGER,
      alt_text TEXT NOT NULL,
      prompt TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (draft_id, role)
    );

    CREATE INDEX IF NOT EXISTS media_assets_draft_idx
      ON media_assets (draft_id, role);

    CREATE TABLE IF NOT EXISTS automation_runs (
      id UUID PRIMARY KEY,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      stats JSONB NOT NULL DEFAULT '{}'::jsonb,
      error TEXT
    );
  `);

  initialized = true;
}
