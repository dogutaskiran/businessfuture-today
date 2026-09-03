ALTER TABLE source_items ADD COLUMN IF NOT EXISTS crawl_ingest_id text;
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS crawl_document_id uuid;
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS crawl_revision_id uuid;
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS source_content_hash text;
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_status text NOT NULL DEFAULT 'pending';
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_next_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_error text;
ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquired_at timestamptz;

DO $$ BEGIN
  ALTER TABLE source_items ADD CONSTRAINT source_items_acquisition_status_check
    CHECK (acquisition_status IN ('pending','running','retry_wait','completed','dead'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS source_items_acquisition_due_idx
  ON source_items(acquisition_status,acquisition_next_at,created_at DESC);
CREATE INDEX IF NOT EXISTS source_items_crawl_document_idx ON source_items(crawl_document_id);
CREATE INDEX IF NOT EXISTS source_items_canonical_url_idx ON source_items(canonical_url);

GRANT SELECT,INSERT,UPDATE,DELETE ON source_items TO business_future_today_app;
