import {PublicationHome} from "@/components/publication/home";
import {liveStories} from "@/lib/live-content";
import {canonicalTemplate} from "@/lib/publication";
export const dynamic="force-dynamic";
export default async function Home(){return <PublicationHome stories={await liveStories()} template={canonicalTemplate}/>}
