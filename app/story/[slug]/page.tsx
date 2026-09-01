import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicationArticle } from "@/components/publication/article";
import { stories } from "@/lib/content";
import { resolveTemplate } from "@/lib/publication";

type Props={params:Promise<{slug:string}>;searchParams:Promise<{template?:string|string[]}>};
export function generateStaticParams(){return stories.map((story)=>({slug:story.slug}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const{slug}=await params;const story=stories.find((item)=>item.slug===slug);if(!story)return{};const image=story.ogImage?`https://businessfuture.today${story.ogImage}`:undefined;return{title:story.title,description:story.dek,openGraph:{title:story.title,description:story.dek,type:"article",images:image?[{url:image,width:1200,height:630,alt:story.imageAlt||story.title}]:undefined},twitter:{card:"summary_large_image",title:story.title,description:story.dek,images:image?[image]:undefined}};}
export default async function StoryPage({params,searchParams}:Props){const[{slug},query]=await Promise.all([params,searchParams]);const story=stories.find((item)=>item.slug===slug);if(!story)notFound();const template=resolveTemplate(query.template);return <PublicationArticle story={story} stories={stories} template={template}/>;}
