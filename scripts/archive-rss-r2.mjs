import Parser from "rss-parser";
const ACCOUNT=process.env.CLOUDFLARE_ACCOUNT_ID||"726e58dee7f6dbc6504a4c160cc21f6f",BUCKET=process.env.BFT_SOURCE_BUCKET||"businessfuture-source",TOKEN=process.env.CLOUDFLARE_API_TOKEN||"";
if(!TOKEN)throw new Error("CLOUDFLARE_API_TOKEN missing");
const feeds=[
["techcrunch","TechCrunch","https://techcrunch.com/feed/","Technology"],
["the-verge","The Verge","https://www.theverge.com/rss/index.xml","Technology"],
["mit-technology-review","MIT Technology Review","https://www.technologyreview.com/feed/","AI"],
["google-blog","Google Blog","https://blog.google/rss/","Companies"],
["microsoft-blog","Microsoft Blog","https://blogs.microsoft.com/feed/","Companies"],
["aws-news-blog","AWS News Blog","https://aws.amazon.com/blogs/aws/feed/","Technology"],
["hacker-news","Hacker News","https://hnrss.org/frontpage","Technology"]
];
const parser=new Parser({customFields:{item:[["media:content","mediaContent"],["media:thumbnail","mediaThumbnail"]]}});
const day=new Date().toISOString().slice(0,10).replaceAll("-","/");
const keyUrl=k=>`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/r2/buckets/${BUCKET}/objects/${k.split("/").map(encodeURIComponent).join("/")}`;
async function put(k,body,type){const r=await fetch(keyUrl(k),{method:"PUT",headers:{authorization:`Bearer ${TOKEN}`,"content-type":type},body,signal:AbortSignal.timeout(30000)});if(!r.ok)throw new Error(`R2_${r.status}:${k}`)}
function media(i){return{enclosure:i.enclosure?.url||null,mediaContent:i.mediaContent?.$?.url||i.mediaContent?.url||null,mediaThumbnail:i.mediaThumbnail?.$?.url||i.mediaThumbnail?.url||null}}
const results=[];
for(const [slug,name,url,category] of feeds){try{const r=await fetch(url,{headers:{"user-agent":"BusinessFutureToday/0.7 (+https://businessfuture.today)"},redirect:"follow",signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error(`HTTP_${r.status}`);const raw=await r.text();await put(`rss/raw/${day}/${slug}.xml`,raw,r.headers.get("content-type")||"application/xml; charset=utf-8");const feed=await parser.parseString(raw);const snapshot={source:{slug,name,url,category},fetchedAt:new Date().toISOString(),title:feed.title||null,link:feed.link||null,items:(feed.items||[]).slice(0,30).map(i=>({guid:i.guid||null,url:i.link||null,title:i.title||null,summary:(i.contentSnippet||i.summary||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,2400),author:i.creator||null,publishedAt:i.isoDate||i.pubDate||null,media:media(i)}))};await put(`rss/snapshots/${day}/${slug}.json`,JSON.stringify(snapshot,null,2),"application/json; charset=utf-8");results.push({slug,ok:true,items:snapshot.items.length})}catch(e){results.push({slug,ok:false,error:e instanceof Error?e.message:String(e)})}}
await put(`rss/snapshots/${day}/index.json`,JSON.stringify({publication:"businessfuture.today",fetchedAt:new Date().toISOString(),results},null,2),"application/json; charset=utf-8");
console.log(JSON.stringify({day,results},null,2));
