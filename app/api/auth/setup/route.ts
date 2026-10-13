import { NextResponse, NextRequest } from "next/server";
import {
  SETUP_CODE_SHA256, sha256Hex, getUsers, upsertUser, passwordProblem,
  rotateSecret, createSessionToken, sessionCookie, normEmail,
} from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// One-time bootstrap: create the first admin. Refuses once any account exists.
// POST { code, email, name, password }
export async function POST(req: NextRequest) {
  const users = await getUsers();
  if (Object.keys(users).length > 0) {
    return NextResponse.json({ error: "Setup already completed." }, { status: 403 });
  }
  const b = (await req.json().catch(() => ({}))) as { code?: string; email?: string; name?: string; password?: string };
  if (!b.code || (await sha256Hex(b.code)) !== SETUP_CODE_SHA256) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "Invalid setup code." }, { status: 401 });
  }
  const email = normEmail(b.email ?? "");
  if (!email.includes("@")) return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  const p = passwordProblem(b.password ?? "");
  if (p) return NextResponse.json({ error: p }, { status: 400 });

  await rotateSecret();   // invalidate anything signed before setup
  await upsertUser(email, b.name ?? "", "admin", b.password!);
  const u = (await getUsers())[email];
  const res = NextResponse.json({ ok: true, email, role: "admin" });
  res.headers.set("Set-Cookie", sessionCookie(await createSessionToken(email, "admin", u.sv)));
  return res;
}
