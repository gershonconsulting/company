import { NextResponse, NextRequest } from "next/server";
import {
  sessionFromRequest, verifyCredentials, upsertUser, passwordProblem,
  getUsers, createSessionToken, sessionCookie,
} from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Change your own password. POST { current, next }
export async function POST(req: NextRequest) {
  const s = await sessionFromRequest(req);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { current?: string; next?: string };
  const ok = await verifyCredentials(s.sub, b.current ?? "");
  if (!ok.ok) return NextResponse.json({ error: "Current password is wrong." }, { status: 401 });
  const p = passwordProblem(b.next ?? ""); if (p) return NextResponse.json({ error: p }, { status: 400 });
  const u = (await getUsers())[s.sub];
  await upsertUser(s.sub, u.name, u.role, b.next!);
  const fresh = (await getUsers())[s.sub];
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", sessionCookie(await createSessionToken(s.sub, fresh.role, fresh.sv)));
  return res;
}
