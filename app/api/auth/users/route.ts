import { NextResponse, NextRequest } from "next/server";
import {
  sessionFromRequest, getUsers, publicUsers, upsertUser, deleteUser,
  passwordProblem, normEmail, type Role,
} from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Admin-only team management.
//   GET                                   → list accounts
//   POST   { email, name, role, password? } → add or update (password optional on update)
//   DELETE { email }                       → remove (signs them out immediately)

async function requireAdmin(req: NextRequest) {
  const s = await sessionFromRequest(req);
  if (!s) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (s.role !== "admin") return { err: NextResponse.json({ error: "Admins only." }, { status: 403 }) };
  return { s };
}

export async function GET(req: NextRequest) {
  const a = await requireAdmin(req); if (a.err) return a.err;
  return NextResponse.json({ users: publicUsers(await getUsers()) });
}

export async function POST(req: NextRequest) {
  const a = await requireAdmin(req); if (a.err) return a.err;
  const b = (await req.json().catch(() => ({}))) as { email?: string; name?: string; role?: string; password?: string };
  const email = normEmail(b.email ?? "");
  if (!email.includes("@")) return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  const role: Role = b.role === "admin" ? "admin" : "agent";
  const users = await getUsers();
  const exists = !!users[email];
  const pw = b.password ? b.password : null;
  if (!exists && !pw) return NextResponse.json({ error: "Password required for a new account." }, { status: 400 });
  if (pw) { const p = passwordProblem(pw); if (p) return NextResponse.json({ error: p }, { status: 400 }); }
  // Never let the last admin demote themselves
  if (exists && users[email].role === "admin" && role !== "admin"
      && Object.values(users).filter((u) => u.role === "admin").length <= 1) {
    return NextResponse.json({ error: "There must be at least one admin." }, { status: 400 });
  }
  await upsertUser(email, b.name ?? "", role, pw);
  return NextResponse.json({ ok: true, users: publicUsers(await getUsers()) });
}

export async function DELETE(req: NextRequest) {
  const a = await requireAdmin(req); if (a.err) return a.err;
  const b = (await req.json().catch(() => ({}))) as { email?: string };
  const email = normEmail(b.email ?? "");
  if (email === a.s!.sub) return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });
  await deleteUser(email);
  return NextResponse.json({ ok: true, users: publicUsers(await getUsers()) });
}
