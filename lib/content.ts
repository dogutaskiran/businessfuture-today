export type Story = {
  slug: string;
  kicker: string;
  title: string;
  dek: string;
  readTime: string;
  category: "AI" | "Technology" | "Companies" | "Work" | "Tools";
  featured?: boolean;
};

export const stories: Story[] = [
  {
    slug: "the-ai-stack-is-becoming-the-company-stack",
    kicker: "THE BIG SHIFT",
    title: "The AI stack is becoming the company stack",
    dek: "The interesting question is no longer who uses AI. It is which parts of the business are being rebuilt around it.",
    readTime: "5 min",
    category: "AI",
    featured: true
  },
  {
    slug: "software-is-moving-from-seats-to-outcomes",
    kicker: "BUSINESS MODEL",
    title: "Software is moving from seats to outcomes",
    dek: "Agents are changing what software vendors sell, what buyers measure and where value gets captured.",
    readTime: "4 min",
    category: "Technology"
  },
  {
    slug: "the-new-operating-system-of-small-teams",
    kicker: "WORK",
    title: "The new operating system of small teams",
    dek: "Tiny teams can now run workflows that once required departments. The organizational consequences are just starting.",
    readTime: "6 min",
    category: "Work"
  },
  {
    slug: "when-every-employee-gets-an-agent",
    kicker: "AI AT WORK",
    title: "What changes when every employee gets an agent?",
    dek: "The first-order effect is productivity. The second-order effect is a redesign of roles, management and coordination.",
    readTime: "5 min",
    category: "AI"
  },
  {
    slug: "seven-workflows-likely-to-change-first",
    kicker: "LIST",
    title: "7 workflows likely to change before 7 job titles do",
    dek: "A practical watchlist for the business processes being reshaped faster than org charts can keep up.",
    readTime: "7 min",
    category: "Companies"
  },
  {
    slug: "tools-worth-watching",
    kicker: "TOOLS",
    title: "Tools worth watching as business becomes agentic",
    dek: "A living shortlist of products changing how teams publish, sell, support customers and operate.",
    readTime: "8 min",
    category: "Tools"
  }
];

export const categories = ["AI", "Technology", "Companies", "Work", "Tools"] as const;
