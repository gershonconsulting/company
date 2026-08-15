import { NextResponse, NextRequest } from "next/server";
import { createSessionToken, sessionCookie, verifyCredentials } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// POST { email, password } → sets the session cookie on success.
export async function POST(req: NextRequest) {
  let email = "";
  let password = "";

  try {
    const body = (await req.json()) as { email?: string; password?: string };
    email = body.email ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const { ok, sub } = await verifyCredentials(email, password);

  if (!ok) {
    // Small fixed penalty on failure — makes online brute-forcing tedious
    // without meaningfully affecting a real sign-in.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = await createSessionToken(sub);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookie(token));
  return res;
}
