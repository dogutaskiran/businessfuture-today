export type SourceConfig = {
  name: string;
  url: string;
  category: "AI" | "Technology" | "Companies" | "Work" | "Tools";
  weight: number;
};

export const SOURCES: SourceConfig[] = [
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Technology", weight: 1.0 },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Technology", weight: 0.9 },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", category: "AI", weight: 1.1 },
  { name: "Google Blog", url: "https://blog.google/rss/", category: "Companies", weight: 0.95 },
  { name: "Microsoft Blog", url: "https://blogs.microsoft.com/feed/", category: "Companies", weight: 0.95 },
  { name: "AWS News Blog", url: "https://aws.amazon.com/blogs/aws/feed/", category: "Technology", weight: 0.85 },
  { name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Technology", weight: 0.7 }
];

export const RELEVANCE_TERMS = [
  "ai", "agent", "agents", "artificial intelligence", "startup", "startups", "software",
  "business", "company", "companies", "enterprise", "product", "products", "technology",
  "work", "automation", "model", "models", "platform", "cloud", "developer", "developers"
];
