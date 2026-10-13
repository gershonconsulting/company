import { NextResponse, NextRequest } from "next/server";
import { createSessionToken, sessionCookie, verifyCredentials } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// POST { email, password } → sets the session cookie on success.
export async function POST(req: NextRequest) {
  let email = "", password = "";
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    email = body.email ?? ""; password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }
  const r = await verifyCredentials(email, password);
  if (!r.ok) {
    await new Promise((res) => setTimeout(res, 600));
    const msg = r.reason === "locked"
      ? "Too many failed attempts. Try again in 15 minutes."
      : r.reason === "no-accounts"
        ? "No accounts are set up yet. Ask your administrator."
        : "Invalid email or password.";
    return NextResponse.json({ error: msg }, { status: r.reason === "locked" ? 429 : 401 });
  }
  const token = await createSessionToken(r.sub, r.role, r.sv);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookie(token));
  return res;
}
