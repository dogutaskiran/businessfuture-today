import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const slug = process.argv[2];
if (!slug) throw new Error('Usage: node scripts/render-social-assets.mjs <slug>');
const articlePath = path.join(process.cwd(),'content','articles',slug,'article.json');
const article = JSON.parse(await fs.readFile(articlePath,'utf8'));
const mediaBase = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || 'https://assets.businessfuture.today';
const heroUrl = new URL(article.media.hero, mediaBase).toString();
const response = await fetch(heroUrl);
if (!response.ok) throw new Error(`Could not fetch hero: ${response.status}`);
const hero = Buffer.from(await response.arrayBuffer());
const outDir = path.join(process.cwd(),'public','social-review-assets',slug);
await fs.mkdir(outDir,{recursive:true});

const brand = { ink:'#111827', paper:'#f6f3eb', accent:'#f4d03f', muted:'#677386' };
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const sourceHost = (()=>{try{return new URL(article.sources?.[0]||'').hostname.replace(/^www\./,'')}catch{return 'businessfuture.today'}})();
const sourceLabel = sourceHost.includes('theverge') ? 'The Verge' : sourceHost;
async function titleLayer(text,{maxWidth,maxHeight,startSize,minSize=42,color='#111827'}){
  for(let size=startSize;size>=minSize;size-=2){
    const input={text:{text:`<span foreground="${color}">${esc(text)}</span>`,font:`Georgia Bold ${size}`,width:maxWidth,align:'center',rgba:true}};
    const image=sharp(input);
    const meta=await image.metadata();
    if((meta.height||0)<=maxHeight){return {buffer:await image.png().toBuffer(),width:meta.width||maxWidth,height:meta.height||maxHeight,fontSize:size};}
  }
  const image=sharp({text:{text:`<span foreground="${color}">${esc(text)}</span>`,font:`Georgia Bold ${minSize}`,width:maxWidth,align:'center',rgba:true}});
  const meta=await image.metadata();
  return {buffer:await image.png().toBuffer(),width:meta.width||maxWidth,height:meta.height||maxHeight,fontSize:minSize};
}
async function renderFeed(){
  const W=1080,H=1350,imgH=610;
  const photo=await sharp(hero).resize(W,imgH,{fit:'cover'}).webp({quality:92}).toBuffer();
  const title=await titleLayer(article.title,{maxWidth:920,maxHeight:300,startSize:72,minSize:48});
  const overlay=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${brand.paper}"/><rect y="0" width="${W}" height="138" fill="${brand.ink}"/><text x="64" y="55" fill="#fff" font-family="Arial" font-size="20" font-weight="700" letter-spacing="2">BUSINESS FUTURE</text><text x="64" y="101" fill="#fff" font-family="Arial" font-size="44" font-weight="800" letter-spacing="-2">TODAY</text><rect x="445" y="790" width="190" height="42" rx="21" fill="${brand.accent}"/><text x="540" y="818" text-anchor="middle" fill="${brand.ink}" font-family="Arial" font-size="17" font-weight="800" letter-spacing="1">${esc(article.category).toUpperCase()}</text><line x1="64" y1="1238" x2="1016" y2="1238" stroke="#cfd5dd"/><text x="64" y="1290" fill="${brand.muted}" font-family="Arial" font-size="16">Source: ${esc(sourceLabel)}</text><text x="1016" y="1290" text-anchor="end" fill="${brand.ink}" font-family="Arial" font-size="16" font-weight="700">businessfuture.today</text></svg>`);
  const titleTop=875+Math.max(0,Math.floor((285-title.height)/2));
  return sharp({create:{width:W,height:H,channels:4,background:brand.paper}}).composite([{input:photo,left:0,top:138},{input:overlay,left:0,top:0},{input:title.buffer,left:Math.round((W-title.width)/2),top:titleTop}]).webp({quality:92}).toFile(path.join(outDir,'feed-1080x1350.webp'));
}
async function renderSquare(){
  const W=1080,H=1080,imgH=470;
  const photo=await sharp(hero).resize(W,imgH,{fit:'cover'}).webp({quality:92}).toBuffer();
  const title=await titleLayer(article.title,{maxWidth:920,maxHeight:245,startSize:66,minSize:44});
  const overlay=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect width="${W}" height="${H}" fill="${brand.paper}"/><rect width="${W}" height="118" fill="${brand.ink}"/><text x="60" y="48" fill="#fff" font-family="Arial" font-size="18" font-weight="700" letter-spacing="2">BUSINESS FUTURE</text><text x="60" y="90" fill="#fff" font-family="Arial" font-size="38" font-weight="800">TODAY</text><rect x="445" y="620" width="190" height="40" rx="20" fill="${brand.accent}"/><text x="540" y="647" text-anchor="middle" fill="${brand.ink}" font-family="Arial" font-size="16" font-weight="800">${esc(article.category).toUpperCase()}</text><text x="60" y="1030" fill="${brand.muted}" font-family="Arial" font-size="15">Source: ${esc(sourceLabel)}</text><text x="1020" y="1030" text-anchor="end" fill="${brand.ink}" font-family="Arial" font-size="15" font-weight="700">SWIPE →</text></svg>`);
  const titleTop=705+Math.max(0,Math.floor((245-title.height)/2));
  return sharp({create:{width:W,height:H,channels:4,background:brand.paper}}).composite([{input:photo,left:0,top:118},{input:overlay,left:0,top:0},{input:title.buffer,left:Math.round((W-title.width)/2),top:titleTop}]).webp({quality:92}).toFile(path.join(outDir,'carousel-cover-1080x1080.webp'));
}
async function renderStory(){
  const W=1080,H=1920;
  const photo=await sharp(hero).resize(W,H,{fit:'cover'}).modulate({brightness:.62,saturation:.85}).webp({quality:92}).toBuffer();
  const title=await titleLayer(article.title,{maxWidth:920,maxHeight:420,startSize:86,minSize:52,color:'#ffffff'});
  const overlay=Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#111827" stop-opacity=".15"/><stop offset=".55" stop-color="#111827" stop-opacity=".35"/><stop offset="1" stop-color="#111827" stop-opacity=".94"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/><text x="64" y="92" fill="#fff" font-family="Arial" font-size="20" font-weight="700" letter-spacing="2">BUSINESS FUTURE</text><text x="64" y="140" fill="#fff" font-family="Arial" font-size="44" font-weight="800">TODAY</text><rect x="435" y="1140" width="210" height="46" rx="23" fill="${brand.accent}"/><text x="540" y="1171" text-anchor="middle" fill="${brand.ink}" font-family="Arial" font-size="18" font-weight="800">${esc(article.category).toUpperCase()}</text><line x1="64" y1="1775" x2="1016" y2="1775" stroke="#ffffff" stroke-opacity=".35"/><text x="64" y="1830" fill="#fff" font-family="Arial" font-size="17">Source: ${esc(sourceLabel)}</text><text x="1016" y="1830" text-anchor="end" fill="#fff" font-family="Arial" font-size="17" font-weight="700">READ →</text></svg>`);
  const titleTop=1245+Math.max(0,Math.floor((430-title.height)/2));
  return sharp(photo).composite([{input:overlay,left:0,top:0},{input:title.buffer,left:Math.round((W-title.width)/2),top:titleTop}]).webp({quality:92}).toFile(path.join(outDir,'story-1080x1920.webp'));
}
await Promise.all([renderFeed(),renderSquare(),renderStory()]);
await fs.writeFile(path.join(outDir,'manifest.json'),JSON.stringify({slug,title:article.title,caption:article.socialCaption,source:article.sources?.[0],assets:{feed:'feed-1080x1350.webp',carouselCover:'carousel-cover-1080x1080.webp',story:'story-1080x1920.webp'}},null,2)+'\n');
console.log(JSON.stringify({ok:true,slug,outDir}));
