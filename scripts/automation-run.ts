import { db } from "../lib/db";
import { runAutomation } from "../lib/automation";

async function main() {
  const result = await runAutomation();
  console.log(JSON.stringify(result, null, 2));
  await db().end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
