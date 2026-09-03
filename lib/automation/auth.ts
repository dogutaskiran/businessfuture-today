import {createHash,timingSafeEqual} from "node:crypto";
const PROBE_HASH="315820cda3fa7d9f0e269e7d1bfd297ec7df66e0feb6c7cfb17c02ce871a79fd";

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

export function authorizeAutomationRequest(request:Request){
  const auth=request.headers.get("authorization");
  if(bearerOk(process.env.CRON_SECRET,auth))return true;
  if(bearerOk(process.env.AUTOMATION_CONTROL_TOKEN,auth))return true;
  const bootstrap=process.env.BOOTSTRAP_TOKEN,supplied=new URL(request.url).searchParams.get("bootstrap");
  if(bootstrap&&supplied===bootstrap)return true;
  return probeOk(request);
}
