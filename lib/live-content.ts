import { stories as staticStories, type Story } from "@/lib/content";
import { authorForStory } from "@/lib/authors";

const API_BASE=(process.env.BFT_API_BASE_URL||"https://api.businessfuture.today").replace(/\/+$/,"" );

function withAuthor(story:Story):Story{return {...story,author:story.author||authorForStory(story)}}

export async function liveStories(limit=500):Promise<Story[]> {
  try{
    const response=await fetch(`${API_BASE}/api/public/stories?limit=${Math.max(1,Math.min(500,limit))}`,{cache:"no-store"});
    if(response.ok){const payload=await response.json() as {stories?:Story[]};if(Array.isArray(payload.stories)&&payload.stories.length)return payload.stories.map(withAuthor)}
  }catch{}
  return staticStories.map(withAuthor);
}
