# Business Future Today

Static publication frontend for [businessfuture.today](https://businessfuture.today).

## Architecture

Business Future Today does not own a runtime database, crawler, content API, AI key, cron worker, publication queue, or social outbox.

The source of truth lives in the shared dogu.one publication services. During every production build:

1. `scripts/export-static-content.mjs` reads published content from `https://dogu.one/api/publications/business-future-today/content`.
2. It materializes the build snapshot under `content/` and generates static RSS/feed files.
3. Next.js exports the entire site as static files (`output: "export"`).
4. Vercel serves the static output. There are no Vercel Functions or publication crons.

Newsletter subscribe/unsubscribe actions are browser calls to the shared dogu.one publication endpoints. No local API proxy is used.

## Media

New media is managed centrally. Existing article URLs under `assets.businessfuture.today` remain compatible through a temporary CDN rewrite to the legacy R2 public origin while historical assets are migrated to the central Media Library.

## Development

```bash
npm ci
npm run content:export
npm run dev
```

`PUBLICATION_CONTENT_URL` may be overridden for testing. It is not a secret.

## Production

```bash
npm run build
```

A successful build exports the current central publication snapshot and produces a fully static site. Production Vercel configuration must not contain database, OpenAI, BrowserMesh, Cloudflare, cron, or automation secrets.
