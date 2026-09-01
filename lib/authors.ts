export type EditorialAuthor = {
  id: string;
  name: string;
  desk: string;
  beat: string;
  bio: string;
};

export const editorialAuthors: readonly EditorialAuthor[] = [
  {
    id: "mira",
    name: "Mira",
    desk: "AI Desk",
    beat: "AI, agents and automation",
    bio: "The BFT editorial voice covering AI systems, agents, automation and the businesses forming around them."
  },
  {
    id: "theo",
    name: "Theo",
    desk: "Technology Desk",
    beat: "Infrastructure, software and computing",
    bio: "The BFT editorial voice for infrastructure, software, developer platforms, chips and computing."
  },
  {
    id: "lina",
    name: "Lina",
    desk: "Companies Desk",
    beat: "Companies, capital and strategy",
    bio: "The BFT editorial voice following companies, capital allocation, deals, business models and strategy."
  },
  {
    id: "nia",
    name: "Nia",
    desk: "Work Desk",
    beat: "Work, organizations and operating models",
    bio: "The BFT editorial voice tracking how technology changes teams, jobs, management and operating models."
  },
  {
    id: "jules",
    name: "Jules",
    desk: "Operator Desk",
    beat: "Tools and practical workflows",
    bio: "The BFT editorial voice testing tools, workflows and practical systems for operators and builders."
  }
] as const;

const byCategory: Record<string, string[]> = {
  AI: ["mira", "theo"],
  Technology: ["theo", "mira"],
  Companies: ["lina", "mira"],
  Work: ["nia", "lina"],
  Tools: ["jules", "theo"]
};

function stableNumber(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function authorForStory(story: { slug: string; category: string }): EditorialAuthor {
  const candidates = byCategory[story.category] || editorialAuthors.map((author) => author.id);
  const id = candidates[stableNumber(story.slug) % candidates.length];
  return editorialAuthors.find((author) => author.id === id) || editorialAuthors[0];
}
