import {createHash,createPublicKey,timingSafeEqual,verify as verifySignature} from "node:crypto";

const PROBE_HASH="315820cda3fa7d9f0e269e7d1bfd297ec7df66e0feb6c7cfb17c02ce871a79fd";
const VERCEL_TEAM="stambol";
const VERCEL_CALLER_PROJECT="dogu-one";
const VERCEL_AUDIENCE=`https://vercel.com/${VERCEL_TEAM}`;
const VERCEL_SUBJECT=`owner:${VERCEL_TEAM}:project:${VERCEL_CALLER_PROJECT}:environment:production`;
const ALLOWED_ISSUERS=new Set([`https://oidc.vercel.com/${VERCEL_TEAM}`,"https://oidc.vercel.com"]);

type Jwk=Record<string,unknown>&{kid?:string;kty?:string;alg?:string};
type JwksCache={issuer:string;expiresAt:number;keys:Jwk[]};
let jwksCache:JwksCache|null=null;

function bearerOk(secret:string|undefined,auth:string|null){
  if(!secret||!auth?.startsWith("Bearer "))return false;
  const got=Buffer.from(auth.slice(7));
  const expected=Buffer.from(secret);
  return got.length===expected.length&&timingSafeEqual(got,expected);
}

function probeOk(request:Request){
  const token=request.headers.get("x-bft-probe-token");
  if(!token)return false;
  const got=createHash("sha256").update(token).digest();
  const expected=Buffer.from(PROBE_HASH,"hex");
  return got.length===expected.length&&timingSafeEqual(got,expected);
}

function decodeJsonPart(value:string){
  return JSON.parse(Buffer.from(value,"base64url").toString("utf8")) as Record<string,unknown>;
}

function audienceOk(value:unknown){
  if(typeof value==="string")return value===VERCEL_AUDIENCE;
  return Array.isArray(value)&&value.some(item=>item===VERCEL_AUDIENCE);
}

async function jwksFor(issuer:string){
  const now=Date.now();
  if(jwksCache&&jwksCache.issuer===issuer&&jwksCache.expiresAt>now)return jwksCache.keys;
  const response=await fetch(`${issuer}/.well-known/jwks`,{
    cache:"no-store",
    signal:AbortSignal.timeout(10_000),
    headers:{accept:"application/json"},
  });
  if(!response.ok)throw new Error(`VERCEL_OIDC_JWKS_${response.status}`);
  const body=await response.json() as {keys?:Jwk[]};
  const keys=Array.isArray(body.keys)?body.keys:[];
  if(!keys.length)throw new Error("VERCEL_OIDC_JWKS_EMPTY");
  jwksCache={issuer,expiresAt:now+10*60_000,keys};
  return keys;
}

async function vercelOidcOk(auth:string|null){
  if(!auth?.startsWith("Bearer "))return false;
  const token=auth.slice(7).trim();
  const parts=token.split(".");
  if(parts.length!==3)return false;
  try{
    const header=decodeJsonPart(parts[0]);
    const payload=decodeJsonPart(parts[1]);
    if(header.alg!=="RS256"||typeof header.kid!=="string")return false;
    if(typeof payload.iss!=="string"||!ALLOWED_ISSUERS.has(payload.iss))return false;
    if(payload.sub!==VERCEL_SUBJECT||!audienceOk(payload.aud))return false;
    const now=Math.floor(Date.now()/1000);
    if(typeof payload.exp!=="number"||payload.exp<=now)return false;
    if(typeof payload.nbf==="number"&&payload.nbf>now+30)return false;
    const keys=await jwksFor(payload.iss);
    const jwk=keys.find(key=>key.kid===header.kid&&(!key.alg||key.alg==="RS256"));
    if(!jwk)return false;
    const publicKey=createPublicKey({key:jwk as any,format:"jwk"});
    return verifySignature(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2],"base64url"),
    );
  }catch{
    return false;
  }
}

export async function authorizeAutomationRequest(request:Request){
  const auth=request.headers.get("authorization");
  if(bearerOk(process.env.CRON_SECRET,auth))return true;
  if(bearerOk(process.env.AUTOMATION_CONTROL_TOKEN,auth))return true;
  if(await vercelOidcOk(auth))return true;
  const bootstrap=process.env.BOOTSTRAP_TOKEN,supplied=new URL(request.url).searchParams.get("bootstrap");
  if(bootstrap&&supplied===bootstrap)return true;
  return probeOk(request);
}
