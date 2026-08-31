import { db } from "../lib/db";
import { processArticleMedia } from "../lib/automation/media";
async function main(){ const results=await processArticleMedia(); console.log(JSON.stringify({processed:results.length,results},null,2)); await db().end(); }
main().catch((error)=>{console.error(error);process.exit(1);});
