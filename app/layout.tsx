import type { Metadata } from "next";
import Script from "next/script";
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
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <body>{children}</body>
      {measurementId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${measurementId}', {
                send_page_view: true
              });
            `}
          </Script>
        </>
      ) : null}
    </html>
  );
}
