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

    ALTER TABLE drafts ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

    CREATE OR REPLACE VIEW articles AS
      SELECT id, cluster_id, slug, title, dek, kicker, category, body_markdown, source_urls,
             social_caption, model, status, published_at, metadata, created_at, updated_at
      FROM drafts;

    CREATE TABLE IF NOT EXISTS publication_ad_slots (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      placement TEXT NOT NULL,
      provider_mode TEXT NOT NULL DEFAULT 'placeholder',
      format TEXT NOT NULL DEFAULT 'auto',
      width INTEGER,
      height INTEGER,
      responsive BOOLEAN NOT NULL DEFAULT TRUE,
      fallback_label TEXT NOT NULL DEFAULT 'Advertisement',
      provider_config JSONB NOT NULL DEFAULT '{}'::jsonb,
      placeholder JSONB NOT NULL DEFAULT '{}'::jsonb,
      settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS source_media_policies (
      domain TEXT PRIMARY KEY,
      mode TEXT NOT NULL DEFAULT 'review' CHECK (mode IN ('owned','licensed','editorial','public_license','review','deny')),
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

    ALTER TABLE source_media_policies DROP CONSTRAINT IF EXISTS source_media_policies_mode_check;
    ALTER TABLE source_media_policies ADD CONSTRAINT source_media_policies_mode_check CHECK (mode IN ('owned','licensed','editorial','public_license','review','deny'));

    INSERT INTO source_media_policies (domain,mode,license_basis) VALUES
      ('techcrunch.com','deny','TechCrunch terms restrict copying/republishing site materials without authorization'),
      ('theverge.com','review','No source-level reuse approval recorded'),
      ('technologyreview.com','review','No source-level reuse approval recorded'),
      ('blog.google','review','No source-level reuse approval recorded'),
      ('blogs.microsoft.com','review','No source-level reuse approval recorded'),
      ('aws.amazon.com','review','No source-level reuse approval recorded')
    ON CONFLICT (domain) DO NOTHING;

    CREATE TABLE IF NOT EXISTS source_media_candidates (
      id UUID PRIMARY KEY,
      draft_id UUID NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
      page_url TEXT NOT NULL,
      image_url TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      ordinal INTEGER NOT NULL DEFAULT 0,
      width_hint INTEGER,
      height_hint INTEGER,
      actual_width INTEGER,
      actual_height INTEGER,
      content_type TEXT,
      bytes INTEGER,
      score NUMERIC NOT NULL DEFAULT 0,
      selected BOOLEAN NOT NULL DEFAULT false,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (draft_id, image_url)
    );

    CREATE INDEX IF NOT EXISTS source_media_candidates_draft_idx
      ON source_media_candidates (draft_id, score DESC, ordinal ASC);

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
      social_square_path TEXT,
      social_portrait_path TEXT,
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

    ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS social_square_path TEXT;
    ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS social_portrait_path TEXT;

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

    CREATE TABLE IF NOT EXISTS automation_generation_queue (
      cluster_id UUID PRIMARY KEY REFERENCES clusters(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','retry_wait','completed','dead')),
      attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempt_at TIMESTAMPTZ, locked_at TIMESTAMPTZ, completed_at TIMESTAMPTZ,
      last_error_code TEXT, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS automation_generation_queue_due_idx ON automation_generation_queue (status,next_attempt_at,updated_at);
    CREATE TABLE IF NOT EXISTS automation_provider_state (
      provider TEXT PRIMARY KEY, state TEXT NOT NULL DEFAULT 'healthy', cooldown_until TIMESTAMPTZ,
      last_error_code TEXT, last_error TEXT, last_success_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS automation_scheduler_tokens (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name TEXT NOT NULL UNIQUE, token_hash TEXT NOT NULL UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE, last_used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  initialized = true;
}
