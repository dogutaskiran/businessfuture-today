import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { RELEVANCE_TERMS, type SourceConfig } from "@/lib/automation/sources";

const STOPWORDS = new Set([
  "the","a","an","and","or","to","of","for","in","on","at","with","from","is","are","was",
  "were","be","been","being","as","by","this","that","it","its","will","new","how","what",
  "why","after","over","into","about","says"
]);

function tokens(title: string) {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/)
      .map((token) => token.replace(/^-+|-+$/g, ""))
      .filter((token) => token.length > 2 && !STOPWORDS.has(token))
  );
}

function similarity(a: string, b: string) {
  const one = tokens(a);
  const two = tokens(b);
  if (!one.size || !two.size) return 0;
  let intersection = 0;
  for (const token of one) if (two.has(token)) intersection += 1;
  return intersection / new Set([...one, ...two]).size;
}

function relevance(title: string, summary: string) {
  const haystack = `${title} ${summary}`.toLowerCase();
  return Math.min(1, RELEVANCE_TERMS.filter((term) => haystack.includes(term)).length / 5);
}

function recencyScore(date?: Date | null) {
  if (!date || Number.isNaN(date.getTime())) return 0.25;
  const hours = Math.max(0, (Date.now() - date.getTime()) / 3_600_000);
  return Math.max(0, 1 - hours / 72);
}

async function recomputeCluster(clusterId: string) {
  const details = await db().query<{
    source_count: string; avg_weight: string; newest: Date | null; title: string; summary: string;
  }>(
    `SELECT COUNT(DISTINCT si.source_id)::text AS source_count,
            AVG(s.weight)::text AS avg_weight,
            MAX(si.published_at) AS newest,
            (ARRAY_AGG(si.title ORDER BY COALESCE(si.published_at,si.created_at) DESC))[1] AS title,
            (ARRAY_AGG(si.summary ORDER BY COALESCE(si.published_at,si.created_at) DESC))[1] AS summary
       FROM cluster_items ci
       JOIN source_items si ON si.id=ci.source_item_id
       JOIN sources s ON s.id=si.source_id
      WHERE ci.cluster_id=$1 GROUP BY ci.cluster_id`,
    [clusterId]
  );
  const row = details.rows[0];
  if (!row) return;

  const sourceCount = Number(row.source_count);
  const score = Math.min(
    0.98,
    0.22 + Math.min(0.28, sourceCount * 0.09) +
    Math.min(0.18, Number(row.avg_weight) * 0.14) +
    relevance(row.title, row.summary) * 0.2 + recencyScore(row.newest) * 0.12
  );

  await db().query(
    `UPDATE clusters SET title=$2,source_count=$3,score=$4,updated_at=NOW() WHERE id=$1`,
    [clusterId, row.title, sourceCount, score]
  );
}

export async function clusterStories() {
  const existing = await db().query<{
    id: string; title: string; category: string; score: string; source_count: number;
  }>(
    `SELECT id,title,category,score::text,source_count FROM clusters
      WHERE updated_at>NOW()-INTERVAL '72 hours' ORDER BY updated_at DESC LIMIT 250`
  );

  const items = await db().query<{
    id: string; title: string; summary: string; category: SourceConfig["category"];
    weight: string; published_at: Date | null;
  }>(
    `SELECT si.id,si.title,si.summary,s.category,s.weight::text,si.published_at
       FROM source_items si JOIN sources s ON s.id=si.source_id
       LEFT JOIN cluster_items ci ON ci.source_item_id=si.id
      WHERE ci.source_item_id IS NULL
        AND COALESCE(si.published_at,si.created_at)>NOW()-INTERVAL '72 hours'
      ORDER BY COALESCE(si.published_at,si.created_at) DESC LIMIT 500`
  );

  let created = 0;
  let attached = 0;
  const touched = new Set<string>();

  for (const item of items.rows) {
    let best: (typeof existing.rows)[number] | undefined;
    let bestScore = 0;

    for (const candidate of existing.rows) {
      const score = similarity(item.title, candidate.title);
      if (score > bestScore) { bestScore = score; best = candidate; }
    }

    let clusterId: string;
    if (best && bestScore >= 0.42) {
      clusterId = best.id;
      attached += 1;
    } else {
      clusterId = randomUUID();
      const initialScore = Math.min(
        0.9,
        0.28 + Number(item.weight)*0.13 + relevance(item.title,item.summary)*0.24 +
        recencyScore(item.published_at)*0.16
      );
      await db().query(
        `INSERT INTO clusters (id,title,category,score,source_count) VALUES ($1,$2,$3,$4,1)`,
        [clusterId,item.title,item.category,initialScore]
      );
      existing.rows.push({
        id: clusterId, title: item.title, category: item.category,
        score: String(initialScore), source_count: 1
      });
      created += 1;
    }

    await db().query(
      `INSERT INTO cluster_items (cluster_id,source_item_id) VALUES ($1,$2)
       ON CONFLICT (source_item_id) DO NOTHING`,
      [clusterId,item.id]
    );
    touched.add(clusterId);
  }

  for (const clusterId of touched) await recomputeCluster(clusterId);
  return { created, attached, touched: touched.size };
}
