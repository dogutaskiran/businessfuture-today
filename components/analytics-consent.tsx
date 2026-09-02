"use client";
import Script from "next/script";
import {useEffect,useState} from "react";
import {readConsent,type ConsentState} from "@/lib/consent";
export function AnalyticsConsent({measurementId}:{measurementId?:string}){const[allowed,setAllowed]=useState(false);useEffect(()=>{const sync=(event?:Event)=>{const state=event instanceof CustomEvent?event.detail as ConsentState:readConsent();setAllowed(Boolean(state?.analytics))};sync();window.addEventListener("bft-consent-change",sync);return()=>window.removeEventListener("bft-consent-change",sync)},[]);if(!measurementId||!allowed)return null;return <><Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive"/><Script id="google-analytics-consented" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:true,anonymize_ip:true});`}</Script></>}
