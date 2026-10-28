import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode } from "@cadence/buffer-client";
import { oauthConfig } from "@/lib/env";
import { startSession, takeOAuthState, tokenStore } from "@/lib/session";

export async function GET(req: NextRequest) {
  const home = (path: string) => new URL(path, process.env.APP_URL);
  const params = req.nextUrl.searchParams;
  const saved = await takeOAuthState();

  if (params.get("error")) return NextResponse.redirect(home("/?error=" + encodeURIComponent(params.get("error")!)));
  if (!saved || saved.state !== params.get("state") || !params.get("code")) {
    return NextResponse.redirect(home("/?error=invalid_state"));
  }

  try {
    const tokens = await exchangeCode(oauthConfig(), params.get("code")!, saved.verifier);
    await tokenStore.set(await startSession(), tokens);
  } catch (e) {
    console.error("token exchange failed:", e instanceof Error ? e.message : e);
    return NextResponse.redirect(home("/?error=token_exchange"));
  }
  return NextResponse.redirect(home("/queue"));
}
