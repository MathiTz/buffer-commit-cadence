import { NextResponse } from "next/server";
import { createAuthorization } from "@cadence/buffer-client";
import { oauthConfig } from "@/lib/env";
import { setOAuthState } from "@/lib/session";

export async function GET() {
  const { url, state, verifier } = await createAuthorization(oauthConfig());
  await setOAuthState(state, verifier);
  return NextResponse.redirect(url);
}
