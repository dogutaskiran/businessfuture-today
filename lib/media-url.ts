const DEFAULT_ORIGIN = "https://businessfuture.today";

function cleanBase(value?: string) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function resolveMediaUrl(value?: string | null) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const path = value.startsWith("/") ? value : `/${value}`;
  const base = cleanBase(process.env.NEXT_PUBLIC_MEDIA_BASE_URL);
  return base ? `${base}${path}` : path;
}

export function absoluteMediaUrl(value?: string | null) {
  const resolved = resolveMediaUrl(value);
  if (!resolved) return null;
  if (/^https?:\/\//i.test(resolved)) return resolved;
  return new URL(resolved, DEFAULT_ORIGIN).toString();
}
