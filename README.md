# Business Future Today

AI-native business media publication at **businessfuture.today**.

## Product thesis

Business Future Today is not a generic news site. It turns business, technology and AI developments into:
- public stories, explainers and listicles for discovery;
- subscriber briefings for retention;
- personalized relevance over time;
- actionable recommendations and product/tool discovery;
- social distribution through PubMesh.

## Architecture

- **Web:** Next.js on Vercel
- **Publishing/distribution:** PubMesh
- **Media generation/storage:** PubMesh image generation + R2
- **Social:** PubMesh/Postiz integrations
- **Newsletter/contacts:** PubMesh adapter (`PUBMESH_SUBSCRIBE_URL`) — capability still to be exposed
- **Domain:** businessfuture.today
- **Repository:** dogutaskiran/businessfuture-today

## Content model

Source → signal/story → editorial synthesis → web article → newsletter variants → social variants → personalized briefing.

The site intentionally keeps content data behind a small local interface (`lib/content.ts`) so the data source can move to PubMesh CMS/API without changing presentation components.

## Local development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when PubMesh subscription endpoints are ready.

## Next integration steps

1. Expose PubMesh articles/CMS APIs through dogu.one MCP.
2. Expose PubMesh contacts/newsletter subscription API.
3. Store Business Future Today brand/publication config in PubMesh.
4. Replace launch content adapter with PubMesh-backed content fetching.
5. Connect the owned Instagram account through PubMesh when ready.
6. Add content ingestion, clustering, editorial generation and scheduled distribution.
