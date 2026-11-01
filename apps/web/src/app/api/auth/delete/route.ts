import { NextResponse } from "next/server";
import { invalidate } from "@/lib/cache";
import { currentSid, endSession } from "@/lib/session";

// Forgets everything Cadence holds server-side for this session: the stored tokens, the cached
// Buffer data and the session cookie. Posts, ideas and tags live in the user's Buffer and are not touched.
export async function POST() {
  const sid = await currentSid();
  await endSession();
  if (sid) invalidate(`${sid}:`);
  return NextResponse.redirect(new URL("/?deleted=1", process.env.APP_URL), 303);
}
