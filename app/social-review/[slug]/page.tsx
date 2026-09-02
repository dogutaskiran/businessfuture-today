import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {stories} from '@/lib/content';
import {SocialReview} from '@/components/social/social-review';
export const metadata:Metadata={title:'Social Template Review',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const story=stories.find(s=>s.slug===slug);if(!story)notFound();return <SocialReview story={story}/>}
