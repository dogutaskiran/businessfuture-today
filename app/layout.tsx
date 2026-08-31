import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://businessfuture.today"),
  title: {
    default: "Business Future Today",
    template: "%s — Business Future Today"
  },
  description: "Business, technology and what matters next.",
  openGraph: {
    title: "Business Future Today",
    description: "Business, technology and what matters next.",
    url: "https://businessfuture.today",
    siteName: "Business Future Today",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Business Future Today",
    description: "Business, technology and what matters next."
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
