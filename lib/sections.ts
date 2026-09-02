import type {Story} from "@/lib/content";

export const publicationSections=[
  {id:"ai",name:"AI",description:"Models, agents and the business systems forming around artificial intelligence."},
  {id:"companies",name:"Companies",description:"Leadership, strategy, acquisitions, valuations and consequential company moves."},
  {id:"startups",name:"Startups",description:"Funding, venture activity and emerging companies building the next layer of business."},
  {id:"policy",name:"Policy",description:"Regulation, governance, legal disputes and public-policy shifts affecting technology and business."},
  {id:"infrastructure",name:"Infrastructure",description:"Cloud, data, security and the technical foundations businesses increasingly depend on."},
  {id:"work",name:"Work",description:"How AI, software and new operating models are changing teams, jobs and organizations."},
  {id:"products",name:"Products",description:"Products, platforms and technical releases changing what companies and users can do."}
] as const;
export type PublicationSectionName=(typeof publicationSections)[number]["name"];
export type PublicationSection=(typeof publicationSections)[number];

export function sectionBySlug(slug:string):PublicationSection|undefined{return publicationSections.find(section=>section.id===slug)}
export function sectionHref(section:PublicationSection|PublicationSectionName){const item=typeof section==="string"?publicationSections.find(x=>x.name===section):section;return `/category/${item?.id||String(section).toLowerCase()}`}

export function sectionForStory(story:Story):PublicationSectionName{
  const kicker=(story.kicker||"").toLowerCase();
  const title=(story.title||"").toLowerCase();
  const category=story.category;
  if(["ai and work","hiring","family operations","event operations"].some(x=>kicker.includes(x))||title.includes(" jobs ")||title.includes("workplace"))return "Work";
  if(["regulation","policy","legal tech","ai rights","model governance","ai agent governance","state policy","eu regulation","platform policy","public technology"].some(x=>kicker.includes(x))||["ftc ","lawsuit","compliance bar","surveillance backlash"].some(x=>title.includes(x)))return "Policy";
  if(kicker.includes("leadership")||[" ceo ","ceo departs","takes over apple","sells to","sale to","acquisition","valuation","investment signals"].some(x=>title.includes(x)))return "Companies";
  if(["funding","startup financing"].some(x=>kicker.includes(x))||/\braises \$[0-9]/.test(title)||["seed round","bridge financing","lands $"].some(x=>title.includes(x)))return "Startups";
  if(["cloud infrastructure","observability","databases","database","robotics infrastructure","healthcare cybersecurity","aws weekly"].some(x=>kicker.includes(x))||["data-center","data center","cyberattack","graviton","opentelemetry","sqlite fork"].some(x=>title.includes(x)))return "Infrastructure";
  if(category==="AI"||kicker.startsWith("ai ")||kicker.startsWith("ai &")||["ai models","enterprise ai","ai safety","ai tooling","ai agents","ai weather","ai risk","ai accountability"].some(x=>kicker.includes(x))||/\b(ai|chatgpt|openai|anthropic|claude|gemini|agentic)\b/.test(title))return "AI";
  return "Products";
}

export function orderedStories(stories:Story[]){return [...stories].sort((a,b)=>(Date.parse(b.publishedAt||"")||0)-(Date.parse(a.publishedAt||"")||0))}
export function storiesInSection(stories:Story[],section:PublicationSectionName){return orderedStories(stories.filter(story=>sectionForStory(story)===section))}
