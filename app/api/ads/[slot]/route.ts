import { NextResponse } from "next/server";
import { db, ensureSchema } from "@/lib/db";

type Props = { params: Promise<{ slot: string }> };

export async function GET(_request: Request, { params }: Props) {
  const { slot } = await params;
  await ensureSchema();
  const result = await db().query(
    `SELECT key,name,placement,provider_mode,format,width,height,responsive,fallback_label,provider_config,placeholder,settings
       FROM publication_ad_slots WHERE key=$1 AND status='active' LIMIT 1`,
    [slot]
  );
  const row = result.rows[0];
  if (!row) return NextResponse.json({ error: "Ad slot not found" }, { status: 404 });
  const provider = row.provider_mode === "google_adsense" || row.provider_mode === "google_ad_manager"
    ? row.provider_mode
    : "placeholder";
  return NextResponse.json({
    slot: { id: row.key, key: row.key, name: row.name, placement: row.placement, format: row.format, width: row.width, height: row.height, responsive: row.responsive, label: row.fallback_label || "Advertisement" },
    provider,
    providerConfig: row.provider_config || {},
    scriptSrc: null,
    placeholder: { label: row.fallback_label || "Advertisement", ...(row.placeholder || {}) },
    settings: row.settings || {}
  });
}
