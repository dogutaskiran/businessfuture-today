import { socialOutboxResponse } from "@/lib/social-outbox";

export const dynamic = "force-dynamic";

export async function GET() {
  return socialOutboxResponse();
}
