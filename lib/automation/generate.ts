import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const output of payload?.output ?? []) {
    for (const content of output?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("OpenAI response did not contain output text");
}

export async function generateDrafts() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const model = process.env.OPENAI_MODEL || "gpt-5.6-terra";
  const limit = Math.max(1, Math.min(5, Number(process.env.AUTOMATION_MAX_DRAFTS || 2)));

  const clusters = await db().query<{
    id: string; title: string; category: string; score: string; source_count: number;
  }>(
    `SELECT c.id,c.title,c.category,c.score::text,c.source_count
       FROM clusters c LEFT JOIN drafts d ON d.cluster_id=c.id
      WHERE d.cluster_id IS NULL AND c.status='open' AND c.score>=0.54
        AND c.updated_at>NOW()-INTERVAL '72 hours'
      ORDER BY c.score DESC,c.source_count DESC,c.updated_at DESC LIMIT $1`,
    [limit]
  );

  const generated: Array<{ id: string; title: string; score: number; sources: number }> = [];

  for (const cluster of clusters.rows) {
    const sourceItems = await db().query<{
      title: string; url: string; summary: string; published_at: Date | null; source_name: string;
    }>(
      `SELECT si.title,si.url,si.summary,si.published_at,s.name AS source_name
         FROM cluster_items ci JOIN source_items si ON si.id=ci.source_item_id
         JOIN sources s ON s.id=si.source_id
        WHERE ci.cluster_id=$1
        ORDER BY COALESCE(si.published_at,si.created_at) DESC LIMIT 12`,
      [cluster.id]
    );

    const packet = sourceItems.rows.map((item,index) =>
      `[${index+1}] ${item.source_name}\nTitle: ${item.title}\nPublished: ${item.published_at?.toISOString() ?? "unknown"}\nURL: ${item.url}\nSummary: ${item.summary}`
    ).join("\n\n");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        reasoning: { effort: "low" },
        instructions: [
          "You are the editorial engine for Business Future Today.",
          "Turn source material into a concise, useful business-and-technology article.",
          "Do not invent facts or add claims unsupported by the supplied source summaries.",
          "Focus on what changed, why it matters to operators, founders, executives and builders, and what to watch next.",
          "Avoid hype, press-release language and generic AI filler.",
          "Write 450-800 words in Markdown with short sections.",
          "Return only data matching the requested JSON schema."
        ].join(" "),
        input: `Cluster: ${cluster.title}\nCategory: ${cluster.category}\nScore: ${cluster.score}\n\nSources:\n${packet}`,
        text: {
          format: {
            type: "json_schema",
            name: "business_future_article",
            strict: true,
            schema: {
              type: "object", additionalProperties: false,
              properties: {
                title: { type: "string" }, slug: { type: "string" }, dek: { type: "string" },
                kicker: { type: "string" },
                category: { type: "string", enum: ["AI","Technology","Companies","Work","Tools"] },
                body_markdown: { type: "string" }, social_caption: { type: "string" }
              },
              required: ["title","slug","dek","kicker","category","body_markdown","social_caption"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI generation failed (${response.status}): ${await response.text()}`);
    }

    const article = JSON.parse(extractOutputText(await response.json()));
    const draftId = randomUUID();
    const slug = String(article.slug).toLowerCase()
      .replace(/[^a-z0-9-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,120);

    await db().query(
      `INSERT INTO drafts
        (id,cluster_id,slug,title,dek,kicker,category,body_markdown,source_urls,social_caption,model)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
      [
        draftId,cluster.id,slug,article.title,article.dek,article.kicker,article.category,
        article.body_markdown,JSON.stringify(sourceItems.rows.map((item)=>item.url)),
        article.social_caption,model
      ]
    );

    generated.push({
      id: draftId, title: article.title, score: Number(cluster.score), sources: cluster.source_count
    });
  }

  return generated;
}
