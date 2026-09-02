import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationArticle } from "@/components/publication/article";
import { stories } from "@/lib/content";
import { absoluteMediaUrl } from "@/lib/media-url";
import { resolveTemplate } from "@/lib/publication";

type Props={params:Promise<{slug:string}>;searchParams:Promise<{template?:string|string[]}>};
export function generateStaticParams(){return stories.map((story)=>({slug:story.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{
  const{slug}=await params;
  const story=stories.find((item)=>item.slug===slug);
  if(!story)return{};
  const canonical=`https://businessfuture.today/story/${story.slug}`;
  const image=absoluteMediaUrl(story.ogImage)||undefined;
  return{
    title:story.title,
    description:story.dek,
    alternates:{canonical},
    authors:story.author?[{name:`${story.author.name} · ${story.author.desk}`}]:[{name:"Business Future Today"}],
    openGraph:{title:story.title,description:story.dek,type:"article",url:canonical,publishedTime:story.publishedAt||undefined,authors:story.author?[story.author.name]:undefined,images:image?[{url:image,width:1200,height:630,alt:story.imageAlt||story.title}]:undefined},
    twitter:{card:"summary_large_image",title:story.title,description:story.dek,images:image?[image]:undefined}
  };
}
export default async function StoryPage({params,searchParams}:Props){const[{slug},query]=await Promise.all([params,searchParams]);const story=stories.find((item)=>item.slug===slug);if(!story)notFound();const template=resolveTemplate(query.template);return <PublicationArticle story={story} stories={stories} template={template}/>;}
