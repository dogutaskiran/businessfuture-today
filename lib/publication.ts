import type { Story } from "@/lib/content";

export type PublicationTemplateId = "newsroom" | "signal";
export type HomeSection =
  | { kind: "lead"; secondaryCount: number }
  | { kind: "latest"; title: string; limit: number }
  | { kind: "category"; category: Story["category"]; title: string; limit: number }
  | { kind: "deep"; title: string; limit: number }
  | { kind: "newsletter" }
  | { kind: "ad"; slotKey: string }
  | { kind: "archive"; title: string; limit: number }
  | { kind: "manifesto" };

export type PublicationTemplate = {
  id: PublicationTemplateId;
  name: string;
  description: string;
  density: "airy" | "compact";
  article: {
    showTopAd: boolean;
    showAfterHeroAd: boolean;
    showRailAd: boolean;
    showStickyAd: boolean;
    inlineAdSlots: string[];
  };
  home: { sections: HomeSection[] };
};

export const publicationBrand = {
  name: "Business Future Today",
  markTop: "BUSINESS FUTURE",
  markBottom: "TODAY",
  tagline: "Business, technology and what matters next.",
  description: "Useful signals on the companies, technologies and shifts changing business.",
  origin: "https://businessfuture.today",
  primaryNav: ["AI", "Technology", "Companies", "Work", "Tools"] as const,
  footer: {
    products: ["Daily Briefing", "RSS Feed", "Advertise"],
    company: ["About", "Contact", "Privacy", "Terms"]
  }
};

export const publicationTemplates: Record<PublicationTemplateId, PublicationTemplate> = {
  newsroom: {
    id: "newsroom",
    name: "Newsroom",
    description: "Modular business-news front page with hierarchy, sections and breathing room.",
    density: "airy",
    article: { showTopAd: true, showAfterHeroAd: true, showRailAd: true, showStickyAd: true, inlineAdSlots: ["article_inline_1", "article_inline_2"] },
    home: {
      sections: [
        { kind: "ad", slotKey: "site_top_billboard" },
        { kind: "lead", secondaryCount: 4 },
        { kind: "latest", title: "Latest", limit: 8 },
        { kind: "ad", slotKey: "home_midfeed" },
        { kind: "category", category: "AI", title: "AI", limit: 5 },
        { kind: "category", category: "Technology", title: "Technology", limit: 5 },
        { kind: "newsletter" },
        { kind: "category", category: "Companies", title: "Companies & Business", limit: 5 },
        { kind: "category", category: "Work", title: "Work", limit: 5 },
        { kind: "category", category: "Tools", title: "Tools", limit: 5 },
        { kind: "deep", title: "Worth your time", limit: 6 },
        { kind: "archive", title: "More stories", limit: 12 }
      ]
    }
  },
  signal: {
    id: "signal",
    name: "Signal",
    description: "The original BFT magazine-style concept: one big signal followed by a visual grid.",
    density: "compact",
    article: { showTopAd: true, showAfterHeroAd: true, showRailAd: false, showStickyAd: true, inlineAdSlots: ["article_inline_1"] },
    home: {
      sections: [
        { kind: "ad", slotKey: "site_top_billboard" },
        { kind: "lead", secondaryCount: 0 },
        { kind: "manifesto" },
        { kind: "ad", slotKey: "home_midfeed" },
        { kind: "archive", title: "The signals", limit: 24 },
        { kind: "newsletter" }
      ]
    }
  }
};

export function resolveTemplate(value?: string | string[] | null): PublicationTemplate {
  const id = Array.isArray(value) ? value[0] : value;
  return publicationTemplates[id === "signal" ? "signal" : "newsroom"];
}

export function storyHref(slug: string, template: PublicationTemplate) {
  return `/story/${slug}?template=${template.id}`;
}

export function numericReadTime(story: Story) {
  return Number.parseInt(story.readTime, 10) || 0;
}
