"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEvent, trackShare } from "@/lib/analytics";

const CONTENT_PATH = /^\/story\//;
const AFFILIATE_PARAMS = ["aff", "aff_id", "affiliate", "affiliate_id", "partner", "partner_id", "referral", "tag"];
const SCROLL_THRESHOLDS = [25, 50, 75, 90, 100] as const;

function cleanText(anchor: HTMLAnchorElement) {
  return (anchor.getAttribute("aria-label") || anchor.title || anchor.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function shareMethod(anchor: HTMLAnchorElement, url: URL) {
  if (anchor.dataset.shareMethod) return anchor.dataset.shareMethod;
  const host = url.hostname.replace(/^www\./, "");
  if (host === "linkedin.com" && url.pathname.includes("sharing")) return "linkedin";
  if ((host === "twitter.com" || host === "x.com") && url.pathname.includes("intent")) return "x";
  if (host === "facebook.com" && url.pathname.includes("sharer")) return "facebook";
  if (host === "wa.me" || host === "api.whatsapp.com") return "whatsapp";
  return null;
}

function isAffiliate(anchor: HTMLAnchorElement, url: URL) {
  if (anchor.dataset.affiliate === "true") return true;
  if ((anchor.rel || "").split(/\s+/).includes("sponsored")) return true;
  return AFFILIATE_PARAMS.some((key) => url.searchParams.has(key));
}

export function AnalyticsEvents() {
  const pathname = usePathname();
  const firedScrolls = useRef<Set<number>>(new Set());

  useEffect(() => {
    firedScrolls.current = new Set();

    const onClick = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const anchor = element?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      const text = cleanText(anchor);
      const sourcePath = window.location.pathname;
      const method = shareMethod(anchor, url);
      if (method) trackShare(method, sourcePath);

      if (url.protocol === "mailto:" || url.protocol === "tel:") return;

      if (url.origin !== window.location.origin) {
        const params = {
          link_url: `${url.origin}${url.pathname}`,
          link_domain: url.hostname,
          link_text: text,
          source_path: sourcePath
        };
        if (isAffiliate(anchor, url)) trackEvent("affiliate_click", params);
        trackEvent("outbound_click", params);
        return;
      }

      if (CONTENT_PATH.test(url.pathname)) {
        trackEvent("article_click", {
          content_path: url.pathname,
          link_text: text,
          source_path: sourcePath
        });
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  useEffect(() => {
    firedScrolls.current = new Set();

    const onScroll = () => {
      const root = document.documentElement;
      const scrollable = Math.max(0, root.scrollHeight - window.innerHeight);
      const percent = scrollable === 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100));

      for (const threshold of SCROLL_THRESHOLDS) {
        if (percent >= threshold && !firedScrolls.current.has(threshold)) {
          firedScrolls.current.add(threshold);
          trackEvent("scroll_depth", {
            percent_scrolled: threshold,
            page_path: window.location.pathname
          });
        }
      }
    };

    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  return null;
}
