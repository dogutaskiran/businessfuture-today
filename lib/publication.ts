
export type PublicationTemplateId = "newsroom";
export type PublicationTemplate = {
  id: PublicationTemplateId;
  name: string;
  description: string;
  density: "airy";
  article: {
    showTopAd: boolean;
    showAfterHeroAd: boolean;
    showRailAd: boolean;
    showStickyAd: boolean;
    inlineAdSlots: string[];
  };
};

export const publicationBrand = {
  name: "Business Future Today",
  tagline: "Business, technology and what matters next.",
  description: "Useful signals on the companies, technologies and shifts changing business.",
  origin: "https://businessfuture.today",
  footer: {
    products: ["Daily Briefing", "RSS Feed", "Advertise"],
    company: ["About", "Contact", "Privacy", "Terms"]
  }
};

export const canonicalTemplate: PublicationTemplate = {
  id: "newsroom",
  name: "Edition",
  description: "The canonical Business Future Today editorial system.",
  density: "airy",
  article: {
    showTopAd: true,
    showAfterHeroAd: true,
    showRailAd: true,
    showStickyAd: true,
    inlineAdSlots: ["article_inline_1", "article_inline_2"]
  }
};

export function storyHref(slug: string, _template?: PublicationTemplate) { return `/story/${slug}`; }
