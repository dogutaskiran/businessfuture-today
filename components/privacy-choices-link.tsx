"use client";
export function PrivacyChoicesLink(){return <button type="button" onClick={()=>window.dispatchEvent(new Event("bft-open-privacy-choices"))} style={{display:"block",border:0,background:"transparent",color:"inherit",padding:0,margin:0,textAlign:"left",font:"inherit",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:"2px"}}>Privacy Choices</button>}
