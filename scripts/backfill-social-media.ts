import path from "node:path";
import sharp from "sharp";
import { db, ensureSchema } from "../lib/db";
async function main(){
  await ensureSchema();
  const rows=await db().query<{id:string;slug:string;hero_path:string}>(`SELECT m.id,d.slug,m.hero_path FROM media_assets m JOIN drafts d ON d.id=m.draft_id WHERE m.role='hero' AND (m.social_square_path IS NULL OR m.social_portrait_path IS NULL) ORDER BY m.created_at`);
  let done=0;
  for(const row of rows.rows){
    const input=path.join(process.cwd(),"public",row.hero_path.replace(/^\//,""));
    const dir=path.dirname(input), square=path.join(dir,"social-square.webp"), portrait=path.join(dir,"social-portrait.webp");
    await sharp(input).resize(1080,1080,{fit:"cover",position:"attention"}).webp({quality:82,effort:5}).toFile(square);
    await sharp(input).resize(1080,1350,{fit:"cover",position:"attention"}).webp({quality:82,effort:5}).toFile(portrait);
    await db().query(`UPDATE media_assets SET social_square_path=$2,social_portrait_path=$3,updated_at=NOW() WHERE id=$1`,[row.id,`/media/${row.slug}/social-square.webp`,`/media/${row.slug}/social-portrait.webp`]);
    done++;
  }
  console.log(JSON.stringify({backfilled:done})); await db().end();
}
main().catch((e)=>{console.error(e);process.exit(1)});
