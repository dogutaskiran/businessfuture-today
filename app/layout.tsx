import type {Metadata} from "next";
import "./globals.css";
import {ConsentManager} from "@/components/consent-manager";
import {AnalyticsConsent} from "@/components/analytics-consent";
export const metadata:Metadata={metadataBase:new URL("https://businessfuture.today"),title:{default:"Business Future Today",template:"%s — Business Future Today"},description:"Business, technology and what matters next.",openGraph:{title:"Business Future Today",description:"Business, technology and what matters next.",url:"https://businessfuture.today",siteName:"Business Future Today",type:"website"},twitter:{card:"summary_large_image",title:"Business Future Today",description:"Business, technology and what matters next."}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}<ConsentManager/><AnalyticsConsent measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}/></body></html>}
