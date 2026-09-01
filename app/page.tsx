import { PublicationHome } from "@/components/publication/home";
import { stories } from "@/lib/content";
import { resolveTemplate } from "@/lib/publication";

type Props = { searchParams: Promise<{ template?: string | string[] }> };
export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const template = resolveTemplate(params.template);
  return <PublicationHome stories={stories} template={template}/>;
}
