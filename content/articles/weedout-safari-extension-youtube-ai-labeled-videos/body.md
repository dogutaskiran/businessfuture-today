A small Safari extension called Weedout is taking a straightforward approach to YouTube’s growing volume of AI-generated content: hide videos that YouTube itself labels “Made with AI.”

Created by an independent developer and listed at $1.99 for macOS, the extension removes labeled videos from YouTube feeds, search results, related-video modules, playlists and Shorts. Its developer says the project was prompted by an increase in AI-generated conspiracy videos appearing in their own feed.

## What changed

Weedout is not an AI-content detector. Instead, it reads and acts on YouTube’s existing “Made with AI” disclosure label. That choice defines both its utility and its limitations.

For users who want less synthetic content in their browsing experience, using a platform-supplied label can be more predictable than relying on a third-party classifier. The extension runs locally, according to its developer, and targets several of YouTube’s main discovery surfaces rather than just the home feed.

But it will not remove videos that are AI-generated without carrying YouTube’s label. Its effectiveness therefore depends on YouTube’s labeling coverage and on creators complying with the platform’s disclosure requirements.

## Why it matters

The product points to an emerging layer in content platforms: user-side preference controls built around metadata that platforms already expose. Rather than asking YouTube to redesign recommendation systems or add a universal feed setting, Weedout alters what an individual user sees after the page loads.

For builders, that is a useful design pattern. Where a platform exposes reliable labels, tags or structured disclosures, a browser extension can turn those signals into a filtering choice without making stronger claims about content authenticity than the available data supports.

For platform operators, the tool also highlights a consequence of introducing AI-content labels. Once labels exist, users and third parties can use them not only for disclosure, but for ranking, blocking and segmentation. Labeling policy can therefore affect distribution as well as transparency.

## Limits to watch

The central question is whether AI labels become sufficiently consistent to support user trust. If labels are missing, inconsistently displayed or applied narrowly, filters based on them will create an incomplete experience. Conversely, broader and more standardized disclosures could make this category of user-control tools more useful.

Weedout’s source code is available on GitHub for developers who want to fork it or build related tools. The developer says pull requests are not accepted, positioning the repository as a reference point for independent variants rather than a shared development project.

The extension is a narrow solution, but it addresses a broad product issue: as AI-generated media becomes more visible in discovery feeds, users may increasingly expect controls that let them decide whether such material belongs in their default viewing experience.
