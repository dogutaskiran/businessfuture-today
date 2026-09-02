export const CONSENT_STORAGE_KEY = "bft.consent.v1";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
export type ConsentState = { version:number; decidedAt:string; analytics:boolean; advertising:boolean };
export function readConsent(): ConsentState | null { if(typeof window==="undefined")return null; try{const raw=localStorage.getItem(CONSENT_STORAGE_KEY);if(!raw)return null;const p=JSON.parse(raw) as ConsentState;if(p.version!==CONSENT_VERSION)return null;const t=new Date(p.decidedAt).getTime();if(!Number.isFinite(t)||Date.now()-t>CONSENT_MAX_AGE_MS)return null;return p}catch{return null}}
export function writeConsent(value:Pick<ConsentState,"analytics"|"advertising">){const state:ConsentState={version:CONSENT_VERSION,decidedAt:new Date().toISOString(),...value};localStorage.setItem(CONSENT_STORAGE_KEY,JSON.stringify(state));if(!state.analytics)clearAnalyticsCookies();window.dispatchEvent(new CustomEvent("bft-consent-change",{detail:state}));return state}
function clearAnalyticsCookies(){for(const part of document.cookie.split(";")){const name=part.split("=")[0]?.trim();if(!name||!(name==="_ga"||name.startsWith("_ga_")))continue;for(const domain of [undefined,location.hostname,`.${location.hostname}`]){document.cookie=`${name}=; Max-Age=0; path=/; SameSite=Lax${domain?`; domain=${domain}`:""}`}}}
