# Business Future Today

Independent publication runtime for Business Future Today.

## Ownership

- **Content lifecycle:** dedicated PostgreSQL database `business_future_today`; `drafts` is the lifecycle table and `articles` is the canonical publication view.
- **Source ingest:** publication-owned RSS/source tables plus the `businessfuture-source` R2 bucket.
- **Public media:** `businessfuture-public`, served at `assets.businessfuture.today`.
- **Newsletter audience:** publication-owned `newsletter_subscribers`; outbound delivery uses MailMesh.
- **Ads:** publication-owned `publication_ad_slots`, resolved by `/api/ads/[slot]`.
- **Social:** publication outbox with dogu.one Meta capabilities.
- **Secrets:** Business Future OpenBao namespace/runtime injection.
- **Deploy:** GitHub + Vercel.

`lib/generated-content.ts` and `content/` are deploy artifacts exported from the publication database; they are not the source of truth.
