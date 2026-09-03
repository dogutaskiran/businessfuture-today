export function authorizeAutomationRequest(request:Request){
  const cron=process.env.CRON_SECRET,auth=request.headers.get("authorization");
  if(cron&&auth===`Bearer ${cron}`)return true;
  const bootstrap=process.env.BOOTSTRAP_TOKEN,supplied=new URL(request.url).searchParams.get("bootstrap");
  return Boolean(bootstrap&&supplied===bootstrap);
}
