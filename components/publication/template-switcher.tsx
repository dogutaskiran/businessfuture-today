import Link from "next/link";
import { publicationTemplates, type PublicationTemplate } from "@/lib/publication";

export function TemplateSwitcher({ current, pathname }: { current: PublicationTemplate; pathname: string }) {
  return <div className="pub-template-switch" aria-label="Template preview">
    <span>Template</span>
    {Object.values(publicationTemplates).map((template) => (
      <Link key={template.id} href={`${pathname}?template=${template.id}`} className={current.id === template.id ? "is-active" : ""}>{template.name}</Link>
    ))}
  </div>;
}
