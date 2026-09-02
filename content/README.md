# Business Future Today content

This directory is the publication's build-time static content tree.

Canonical editorial state remains in the isolated `business_future_today` PostgreSQL database. Before a site build, `npm run content:export` materializes published stories into:

- `content/index.json` — build-friendly story index used by the current Next.js renderer.
- `content/articles/<slug>/article.json` — portable article metadata, sources, social copy and media references.
- `content/articles/<slug>/body.md` — article body in Markdown.
- `content/media-manifest.json` — source-image provenance and current derivative paths for migration to the Kvar Media Library/R2.

The layout deliberately contains no PubMesh, UsageMesh or LoginMesh dependency. A future static renderer can consume these files directly and emit final HTML for Cloudflare without changing the editorial model.
