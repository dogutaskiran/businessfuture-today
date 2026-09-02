"use client";

import { useEffect, useId, useMemo, useState } from "react";

type ResolvedAd = {
  slot: { id:string; key:string; name:string; placement:string; format:string; width:number|null; height:number|null; responsive:boolean; label:string };
  provider: "placeholder" | "google_adsense" | "google_ad_manager";
  providerConfig: Record<string, any>;
  scriptSrc: string | null;
  placeholder: { label?:string; imageUrl?:string|null; headline?:string; body?:string; cta?:string };
};

declare global {
  interface Window { adsbygoogle?: unknown[]; googletag?: any; }
}

function ensureScript(id:string,src:string,attrs:Record<string,string>={}) {
  const existing=document.getElementById(id) as HTMLScriptElement|null;
  if(existing) return existing;
  const script=document.createElement("script"); script.id=id; script.async=true; script.src=src;
  Object.entries(attrs).forEach(([key,value])=>script.setAttribute(key,value)); document.head.appendChild(script); return script;
}

function Placeholder({ad}:{ad:ResolvedAd}) {
  const p=ad.placeholder||{};
  return <div className="ad-placeholder">
    {p.imageUrl ? <img src={p.imageUrl} alt="" className="ad-placeholder__image" /> : null}
    <div className="ad-placeholder__copy">
      <strong>{p.headline || "Advertisement"}</strong>
      {p.body ? <span>{p.body}</span> : null}
      {p.cta ? <em>{p.cta}</em> : null}
    </div>
  </div>;
}

function Adsense({ad}:{ad:ResolvedAd}) {
  const config=ad.providerConfig||{}; const client=String(config.client||""); const slot=String(config.slot||"");
  useEffect(()=>{
    if(!client||!slot) return;
    ensureScript("bft-adsense",`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`,{"crossorigin":"anonymous"});
    const timer=window.setTimeout(()=>{ try { (window.adsbygoogle=window.adsbygoogle||[]).push({}); } catch {} },250);
    return()=>window.clearTimeout(timer);
  },[client,slot]);
  if(!client||!slot) return <Placeholder ad={ad}/>;
  return <ins className="adsbygoogle" style={{display:"block"}} data-ad-client={client} data-ad-slot={slot} data-ad-format={config.format||"auto"} data-full-width-responsive={String(config.fullWidthResponsive ?? true)} />;
}

function GoogleAdManager({ad}:{ad:ResolvedAd}) {
  const reactId=useId(); const divId=useMemo(()=>`bft-gam-${reactId.replace(/[:]/g,"")}`,[reactId]); const config=ad.providerConfig||{};
  useEffect(()=>{
    const adUnitPath=String(config.adUnitPath||""); const sizes=Array.isArray(config.sizes)?config.sizes:[]; if(!adUnitPath||!sizes.length) return;
    ensureScript("bft-gpt","https://securepubads.g.doubleclick.net/tag/js/gpt.js");
    window.googletag=window.googletag||{cmd:[]}; let defined:any=null;
    window.googletag.cmd.push(()=>{ try { defined=window.googletag.defineSlot(adUnitPath,sizes,divId)?.addService(window.googletag.pubads()); if(config.collapseEmptyDiv) window.googletag.pubads().collapseEmptyDivs(); window.googletag.enableServices(); window.googletag.display(divId); } catch {} });
    return()=>{ if(defined&&window.googletag?.destroySlots) window.googletag.destroySlots([defined]); };
  },[config.adUnitPath,JSON.stringify(config.sizes),config.collapseEmptyDiv,divId]);
  if(!config.adUnitPath||!Array.isArray(config.sizes)||!config.sizes.length) return <Placeholder ad={ad}/>;
  return <div id={divId}/>;
}

export function AdSlot({slotKey,className="",sticky=false}:{slotKey:string;className?:string;sticky?:boolean}) {
  const [ad,setAd]=useState<ResolvedAd|null>(null); const [dismissed,setDismissed]=useState(false);
  useEffect(()=>{ let active=true; fetch(`/api/ads/${encodeURIComponent(slotKey)}`,{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(active)setAd(data)}).catch(()=>{}); return()=>{active=false}; },[slotKey]);
  if(dismissed) return null;
  const fallback:ResolvedAd={slot:{id:"",key:slotKey,name:"",placement:"",format:"auto",width:null,height:null,responsive:true,label:"Advertisement"},provider:"placeholder",providerConfig:{},scriptSrc:null,placeholder:{label:"Advertisement",headline:"Advertisement",body:"Business Future Today"}};
  const resolved=ad||fallback;
  return <aside className={`ad-slot ad-slot--${slotKey} ${sticky?"ad-slot--sticky":""} ${className}`.trim()} aria-label="Advertisement">
    <div className="ad-slot__label">{resolved.slot.label||resolved.placeholder.label||"Advertisement"}</div>
    <div className="ad-slot__creative">
      {resolved.provider==="google_adsense"?<Adsense ad={resolved}/>:resolved.provider==="google_ad_manager"?<GoogleAdManager ad={resolved}/>:<Placeholder ad={resolved}/>} 
    </div>
    {sticky?<button className="ad-slot__close" onClick={()=>setDismissed(true)} aria-label="Close advertisement">×</button>:null}
  </aside>;
}
