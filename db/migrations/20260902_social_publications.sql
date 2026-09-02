CREATE TABLE IF NOT EXISTS social_publications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  publication text NOT NULL DEFAULT 'business-future-today',
  content_slug text,
  platform text NOT NULL,
  account_handle text,
  account_id text,
  object_id text NOT NULL,
  object_type text NOT NULL,
  status text NOT NULL,
  permalink text,
  asset_url text,
  published_at timestamptz,
  deleted_at timestamptz,
  source_commit text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, object_id)
);
CREATE INDEX IF NOT EXISTS social_publications_content_slug_idx ON social_publications (content_slug);
CREATE INDEX IF NOT EXISTS social_publications_platform_status_idx ON social_publications (platform, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON social_publications TO business_future_today_app;
GRANT USAGE, SELECT ON SEQUENCE social_publications_id_seq TO business_future_today_app;
