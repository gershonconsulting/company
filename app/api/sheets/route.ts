import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Lightweight directory of every IMPORTDATA-friendly endpoint, served as text.
// Lets users (Olivier) discover what's available by hitting the bare /api/sheets URL.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const lines = [
    "GershonCRM IMPORTDATA endpoints (all return plain text, always HTTP 200)",
    "",
    `${origin}/api/sheets/total                      -> total leads in pipeline`,
    `${origin}/api/sheets/duedate/count               -> leads with a Next Due Date set`,
    `${origin}/api/sheets/stage/{stageName}/count     -> leads in given stage (case-insensitive)`,
    `${origin}/api/sheets/priority/{level}/count      -> high | medium | low | unset`,
    `${origin}/api/sheets/freshness/{level}/count     -> high(<=7d) | medium(<=30d) | low(<=90d) | stale(>90d) | never`,
    "",
    "Examples for Google Sheets:",
    `  =IMPORTDATA("${origin}/api/sheets/total")`,
    `  =IMPORTDATA("${origin}/api/sheets/duedate/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/stage/Proposal Sent/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/stage/Negotiating/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/priority/high/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/priority/medium/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/priority/low/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/freshness/high/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/freshness/medium/count")`,
    `  =IMPORTDATA("${origin}/api/sheets/freshness/stale/count")`,
  ];
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}
