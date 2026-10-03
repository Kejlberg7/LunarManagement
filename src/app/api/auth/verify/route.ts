import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawToken = url.searchParams.get("token");
  const base = process.env.APP_URL ?? url.origin;
  if (!rawToken) return NextResponse.redirect(new URL("/login?error=expired", base));
  const setupPage = new URL("/set-password", base);
  setupPage.searchParams.set("token", rawToken);
  return NextResponse.redirect(setupPage);
}
