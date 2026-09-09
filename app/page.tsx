import { PublicationHome } from "@/components/publication/home";
import { getStories } from "@/lib/content";
import { canonicalTemplate } from "@/lib/publication";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const stories = await getStories();
  return <PublicationHome stories={stories} template={canonicalTemplate} />;
}
