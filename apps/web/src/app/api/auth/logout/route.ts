import { NextResponse } from "next/server";
import { endSession } from "@/lib/session";

export async function POST() {
  await endSession();
  return NextResponse.redirect(new URL("/", process.env.APP_URL), 303);
}
