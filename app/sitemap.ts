import type {MetadataRoute} from "next";
import {stories} from "@/lib/content";
import {publicationSections,sectionHref} from "@/lib/sections";
export default function sitemap():MetadataRoute.Sitemap{
  const base="https://businessfuture.today";
  const evergreen=["about","newsletter","privacy","cookies","terms","editorial-standards","corrections","affiliate-disclosure"];
  return [
    {url:base,changeFrequency:"daily",priority:1},
    ...publicationSections.map(section=>({url:`${base}${sectionHref(section)}`,changeFrequency:"hourly" as const,priority:.85})),
    ...evergreen.map(path=>({url:`${base}/${path}`,changeFrequency:"monthly" as const,priority:path==="newsletter"?.8:.4})),
    ...stories.map(story=>({url:`${base}/story/${story.slug}`,changeFrequency:"weekly" as const,priority:.8}))
  ];
}
