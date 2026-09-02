export type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

export function trackShare(method: string, itemId?: string) {
  if (typeof window === "undefined") return;
  trackEvent("share", {
    method,
    content_type: "article",
    item_id: itemId || window.location.pathname,
    source_path: window.location.pathname
  });
}
