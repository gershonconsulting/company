import { NextResponse, NextRequest } from "next/server";
import { clearedSessionCookie } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearedSessionCookie());
  return res;
}

// GET support so a plain link can sign you out too.
export async function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  const res = NextResponse.redirect(url);
  res.headers.set("Set-Cookie", clearedSessionCookie());
  return res;
}
