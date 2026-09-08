import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/unsubscribe-form";
import { LegalShell } from "@/components/legal-shell";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export default function Page() { return <LegalShell title="Newsletter preferences" eyebrow="BUSINESS FUTURE TODAY"><p>If you no longer want the briefing, confirm below.</p><UnsubscribeForm/></LegalShell>; }
