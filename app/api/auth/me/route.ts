import { NextResponse, NextRequest } from "next/server";
import { sessionFromRequest, getUsers } from "@/lib/auth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await sessionFromRequest(req);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = (await getUsers())[s.sub];
  return NextResponse.json({ email: s.sub, name: u?.name ?? s.sub, role: s.role });
}
