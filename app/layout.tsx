import type {Metadata} from "next";
import "./globals.css";
import {ConsentManager} from "@/components/consent-manager";
import {AnalyticsConsent} from "@/components/analytics-consent";
import {AnalyticsEvents} from "@/components/analytics-events";
export const metadata:Metadata={metadataBase:new URL("https://businessfuture.today"),title:{default:"Business Future Today",template:"%s — Business Future Today"},description:"Business, technology and what matters next.",icons:{icon:[{url:"/brand/favicon-32.png",sizes:"32x32",type:"image/png"},{url:"/brand/favicon-64.png",sizes:"64x64",type:"image/png"}],apple:"/brand/apple-touch-icon.png"},openGraph:{title:"Business Future Today",description:"Business, technology and what matters next.",url:"https://businessfuture.today",siteName:"Business Future Today",type:"website",images:[{url:"/brand/og-default-1200x630.webp",width:1200,height:630,alt:"Business Future Today"}]},twitter:{card:"summary_large_image",title:"Business Future Today",description:"Business, technology and what matters next.",images:["/brand/og-default-1200x630.webp"]}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}<ConsentManager/><AnalyticsConsent measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}/><AnalyticsEvents/></body></html>}
