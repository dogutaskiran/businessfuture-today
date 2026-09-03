from pathlib import Path
import re

# Fix staged CrawlMesh client typo if present.
p = Path("lib/automation/crawlmesh.ts")
s = p.read_text()
s = s.replace("feedUrl: iparams.feedUrl", "feedUrl: params.feedUrl")
p.write_text(s)

# Keep ensureSchema capable of upgrading existing/new BFT databases.
p = Path("lib/db.ts")
s = p.read_text()
if "crawl_ingest_id TEXT" not in s:
    anchor = '''    CREATE INDEX IF NOT EXISTS source_items_published_idx
      ON source_items (published_at DESC);
'''
    addition = '''
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS crawl_ingest_id TEXT;
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS crawl_document_id UUID;
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS crawl_revision_id UUID;
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS canonical_url TEXT;
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS source_content_hash TEXT;
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_attempts INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_next_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquisition_error TEXT;
    ALTER TABLE source_items ADD COLUMN IF NOT EXISTS acquired_at TIMESTAMPTZ;
    DO $$ BEGIN
      ALTER TABLE source_items ADD CONSTRAINT source_items_acquisition_status_check
        CHECK (acquisition_status IN ('pending','running','retry_wait','completed','dead'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS source_items_acquisition_due_idx
      ON source_items (acquisition_status, acquisition_next_at, created_at DESC);
    CREATE INDEX IF NOT EXISTS source_items_crawl_document_idx ON source_items (crawl_document_id);
    CREATE INDEX IF NOT EXISTS source_items_canonical_url_idx ON source_items (canonical_url);
'''
    if anchor not in s:
        raise SystemExit("db.ts source_items anchor missing")
    s = s.replace(anchor, anchor + addition, 1)
p.write_text(s)

# Run canonical acquisition between feed discovery and clustering.
p = Path("lib/automation/index.ts")
s = p.read_text()
if 'from "@/lib/automation/acquire"' not in s:
    s = s.replace(
        'import {ingestSources} from "@/lib/automation/ingest";\n',
        'import {ingestSources} from "@/lib/automation/ingest";\nimport {acquireSourceItems} from "@/lib/automation/acquire";\n',
        1,
    )
s = s.replace(
    'const errors:Record<string,string>={};let ingest:any=null,cluster:any=null,generated:any=null;',
    'const errors:Record<string,string>={};let ingest:any=null,acquisition:any=null,cluster:any=null,generated:any=null;',
)
if 'acquisition=await acquireSourceItems()' not in s:
    anchor = 'try{ingest=await ingestSources()}catch(e){errors.ingest=msg(e)}\n'
    if anchor not in s:
        raise SystemExit("index.ts ingest anchor missing")
    s = s.replace(
        anchor,
        anchor + '  try{acquisition=await acquireSourceItems()}catch(e){errors.acquisition=msg(e)}\n',
        1,
    )
s = s.replace(
    'const stats={ingest,cluster,generated,errors};',
    'const stats={ingest,acquisition,cluster,generated,errors};',
)
p.write_text(s)

# New clusters only consume source items whose canonical source page was acquired.
p = Path("lib/automation/cluster.ts")
s = p.read_text()
if "si.acquisition_status='completed'" not in s:
    old = '''      WHERE ci.source_item_id IS NULL
        AND COALESCE(si.published_at,si.created_at)>NOW()-INTERVAL '72 hours' '''
    new = '''      WHERE ci.source_item_id IS NULL
        AND si.acquisition_status='completed'
        AND si.crawl_ingest_id IS NOT NULL
        AND COALESCE(si.published_at,si.created_at)>NOW()-INTERVAL '72 hours' '''
    if old not in s:
        raise SystemExit("cluster.ts item anchor missing")
    s = s.replace(old, new, 1)
p.write_text(s)

# Editorial generation uses CrawlMesh normalized Markdown, not feed summaries.
p = Path("lib/automation/generate.ts")
s = p.read_text()
if 'from "@/lib/automation/crawlmesh"' not in s:
    s = s.replace(
        'import {db} from "@/lib/db";',
        'import {db} from "@/lib/db";\nimport {bundleText} from "@/lib/automation/crawlmesh";',
        1,
    )
if "Normalized source Markdown" not in s:
    pattern = re.compile(r'\n const src=await db\(\)\.query<.*?\n const packet=.*?;\n let r:Response;', re.S)
    replacement = r'''
 const src=await db().query<{title:string;url:string;published_at:Date|null;source_name:string;crawl_ingest_id:string}>(`SELECT si.title,si.url,si.published_at,s.name source_name,si.crawl_ingest_id FROM cluster_items ci JOIN source_items si ON si.id=ci.source_item_id JOIN sources s ON s.id=si.source_id WHERE ci.cluster_id=$1 AND si.acquisition_status='completed' AND si.crawl_ingest_id IS NOT NULL ORDER BY COALESCE(si.published_at,si.created_at) DESC LIMIT 12`,[j.cluster_id]);
 const sourcePackets:string[]=[];
 for(let i=0;i<src.rows.length;i++){const x=src.rows[i];try{const md=(await bundleText(x.crawl_ingest_id,"content.md")).trim();if(md)sourcePackets.push(`[${i+1}] ${x.source_name}\nTitle: ${x.title}\nPublished: ${x.published_at?.toISOString()??"unknown"}\nURL: ${x.url}\nNormalized source Markdown:\n${md.slice(0,12000)}`)}catch{}}
 if(!sourcePackets.length)throw new GenError("source_bundle_unavailable",null,"No canonical CrawlMesh source bundle could be loaded for this cluster");
 const packet=sourcePackets.join("\n\n---\n\n");
 let r:Response;'''
    s2, count = pattern.subn(replacement, s, count=1)
    if count != 1:
        raise SystemExit(f"generate.ts source packet replacement count={count}")
    s = s2
s = s.replace(
    "Turn source material into a concise, useful business-and-technology article.",
    "Turn the canonical normalized source bundles into a concise, useful business-and-technology article.",
)
p.write_text(s)

# Media candidate discovery first consumes the same CrawlMesh asset manifest.
p = Path("lib/automation/source-media.ts")
s = p.read_text()
if 'from "@/lib/automation/crawlmesh"' not in s:
    s = s.replace(
        'import { db } from "@/lib/db";',
        'import { db } from "@/lib/db";\nimport { bundleJson } from "@/lib/automation/crawlmesh";',
        1,
    )
if "crawlmeshIngestId" not in s:
    anchor = 'export async function discoverSourceImageCandidates(params: { draftId: string; pageUrl: string; rssImageUrl?: string | null }) {\n'
    if anchor not in s:
        raise SystemExit("source-media.ts function anchor missing")
    early = r'''  try {
    const ref = await db().query<{ crawl_ingest_id: string }>(
      `SELECT crawl_ingest_id FROM source_items
        WHERE crawl_ingest_id IS NOT NULL AND (url=$1 OR canonical_url=$1)
        ORDER BY acquired_at DESC NULLS LAST LIMIT 1`,
      [params.pageUrl]
    );
    const ingestId = ref.rows[0]?.crawl_ingest_id;
    if (ingestId) {
      const assets = await bundleJson<Array<{ sourceUrl?: string; role?: string }>>(ingestId, "assets.json");
      if (assets?.length) {
        const meshCandidates = new Map<string, Candidate>();
        let meshOrdinal = 0;
        for (const asset of assets) {
          const url = absolute(asset.sourceUrl, params.pageUrl);
          if (!url) continue;
          const score = asset.role === "og" ? 104 : asset.role === "social" ? 96 : 88;
          addCandidate(meshCandidates, {
            url,
            kind: `crawlmesh:${asset.role || "content"}`,
            ordinal: meshOrdinal++,
            widthHint: null,
            heightHint: null,
            score,
            metadata: { crawlmeshIngestId: ingestId }
          });
        }
        const sorted = [...meshCandidates.values()]
          .sort((a, b) => b.score - a.score || a.ordinal - b.ordinal)
          .slice(0, 16);
        await db().query(`DELETE FROM source_media_candidates WHERE draft_id=$1`, [params.draftId]);
        for (const candidate of sorted) {
          await db().query(
            `INSERT INTO source_media_candidates
              (id,draft_id,page_url,image_url,source_kind,ordinal,width_hint,height_hint,score,metadata)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
             ON CONFLICT (draft_id,image_url) DO UPDATE SET
               source_kind=EXCLUDED.source_kind,ordinal=EXCLUDED.ordinal,
               width_hint=EXCLUDED.width_hint,height_hint=EXCLUDED.height_hint,
               score=EXCLUDED.score,metadata=EXCLUDED.metadata,updated_at=NOW()`,
            [randomUUID(), params.draftId, params.pageUrl, candidate.url, candidate.kind, candidate.ordinal,
             candidate.widthHint, candidate.heightHint, candidate.score, JSON.stringify(candidate.metadata || {})]
          );
        }
        if (sorted.length) return sorted;
      }
    }
  } catch (error) {
    console.error("CrawlMesh source-media manifest fallback", error);
  }

'''
    s = s.replace(anchor, anchor + early, 1)
p.write_text(s)

# Runtime knobs.
p = Path(".env.example")
s = p.read_text()
if "CRAWLMESH_BASE_URL" not in s:
    s += '''
# Shared Kvar web source acquisition
CRAWLMESH_BASE_URL=https://crawlmesh.kvar.one
BROWSERMESH_SERVICE_TOKEN=
AUTOMATION_MAX_ACQUISITIONS=24
AUTOMATION_ACQUISITION_CONCURRENCY=4
'''
p.write_text(s)
