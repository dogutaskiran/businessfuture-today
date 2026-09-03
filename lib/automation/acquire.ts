import { db } from "@/lib/db";
import { ingestSource } from "@/lib/automation/crawlmesh";

type DueItem = {
  id: string;
  url: string;
  title: string;
  acquisition_attempts: number;
  source_name: string;
  feed_url: string;
};

function retryMinutes(attempt: number) {
  return Math.min(360, Math.max(2, 2 ** Math.min(8, attempt)));
}

async function acquireOne(item: DueItem) {
  const attempt = item.acquisition_attempts + 1;
  await db().query(
    `UPDATE source_items
        SET acquisition_status='running',
            acquisition_attempts=$2,
            acquisition_error=NULL,
            acquisition_next_at=NOW()
      WHERE id=$1`,
    [item.id, attempt]
  );

  try {
    const result = await ingestSource({
      url: item.url,
      sourceItemId: item.id,
      sourceName: item.source_name,
      feedUrl: item.feed_url
    });

    if (!result.central?.documentId || !result.central?.revisionId) {
      throw new Error("CRAWLMESH_CENTRAL_REF_MISSING");
    }

    const contentHash = result.content?.hash || result.provenance?.contentHash || null;
    await db().query(
      `UPDATE source_items
          SET acquisition_status='completed',
              crawl_ingest_id=$2::text,
              crawl_document_id=$3::uuid,
              crawl_revision_id=$4::uuid,
              canonical_url=$5::text,
              source_content_hash=$6::text,
              acquired_at=NOW(),
              acquisition_next_at=NOW(),
              acquisition_error=NULL,
              raw=COALESCE(raw,'{}'::jsonb) ||
                  jsonb_build_object(
                    'crawlmesh',
                    jsonb_build_object(
                      'ingestId',$2::text,
                      'documentId',$3::uuid,
                      'revisionId',$4::uuid,
                      'canonicalUrl',$5::text,
                      'contentHash',$6::text,
                      'method',$7::text
                    )
                  )
        WHERE id=$1`,
      [
        item.id,
        result.id,
        result.central.documentId,
        result.central.revisionId,
        result.central.canonicalUrl || item.url,
        contentHash,
        result.method || "unknown"
      ]
    );

    return {
      id: item.id,
      ok: true,
      ingestId: result.id,
      documentId: result.central.documentId,
      revisionId: result.central.revisionId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const dead = attempt >= 8;
    await db().query(
      `UPDATE source_items
          SET acquisition_status=$2,
              acquisition_error=$3,
              acquisition_next_at=NOW()+($4::text||' minutes')::interval
        WHERE id=$1`,
      [item.id, dead ? "dead" : "retry_wait", message.slice(0, 3000), String(retryMinutes(attempt))]
    );
    return { id: item.id, ok: false, dead, error: message };
  }
}

export async function acquireSourceItems() {
  await db().query(
    `UPDATE source_items
        SET acquisition_status='retry_wait',
            acquisition_next_at=NOW(),
            acquisition_error='stale_running_reset'
      WHERE acquisition_status='running'
        AND acquisition_next_at<NOW()-INTERVAL '20 minutes'`
  );

  const limit = Math.max(1, Math.min(60, Number(process.env.AUTOMATION_MAX_ACQUISITIONS || 24)));
  const concurrency = Math.max(1, Math.min(8, Number(process.env.AUTOMATION_ACQUISITION_CONCURRENCY || 4)));

  const due = await db().query<DueItem>(
    `SELECT si.id,si.url,si.title,si.acquisition_attempts,
            s.name AS source_name,s.url AS feed_url
       FROM source_items si
       JOIN sources s ON s.id=si.source_id
      WHERE si.acquisition_status IN ('pending','retry_wait')
        AND si.acquisition_next_at<=NOW()
        AND COALESCE(si.published_at,si.created_at)>NOW()-INTERVAL '7 days'
      ORDER BY COALESCE(si.published_at,si.created_at) DESC
      LIMIT $1`,
    [limit]
  );

  const results: Array<Record<string, unknown>> = [];
  let cursor = 0;

  async function worker() {
    while (cursor < due.rows.length) {
      const item = due.rows[cursor++];
      results.push(await acquireOne(item));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, due.rows.length)) }, () => worker())
  );

  const completed = results.filter((item) => item.ok).length;
  const failed = results.length - completed;
  const queue = await db().query<{ status: string; count: number }>(
    `SELECT acquisition_status AS status,COUNT(*)::int AS count
       FROM source_items
      GROUP BY acquisition_status
      ORDER BY acquisition_status`
  );

  return {
    attempted: results.length,
    completed,
    failed,
    queue: queue.rows,
    sample: results.slice(0, 5)
  };
}
