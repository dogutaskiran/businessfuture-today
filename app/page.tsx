import { PublicationHome } from "@/components/publication/home";
import { stories } from "@/lib/content";
import { canonicalTemplate } from "@/lib/publication";

export default function Home() {
  return <PublicationHome stories={stories} template={canonicalTemplate}/>;
}
