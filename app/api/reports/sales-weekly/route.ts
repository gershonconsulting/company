import { NextResponse, NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema,
  buildPriorityMapping, resolvePipelineKey,
} from "@/lib/streak";
import { computeAnalytics } from "@/lib/analytics";
import { computeMomentum } from "@/lib/momentum";
import { recordAndReadExact } from "@/lib/momentum-store";
import { computeSalesWeekly } from "@/lib/sales-weekly";
import { renderSalesWeeklyHTML as renderHTML } from "@/lib/sales-weekly-email";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Monday sales report → sales@gershonconsulting.com (override: SALES_REPORT_TO in KV).
// Last week vs this coming week, organised around the three jobs of sales:
// get new leads, entertain current leads, close leads.
// Auth: X-Report-Key header or ?key= (same REPORT_TRIGGER_KEY as the pipeline report).
// ?preview=1 returns the HTML without sending.
export async function GET(req: NextRequest)  { return run(req); }
export async function POST(req: NextRequest) { return run(req); }

const DEFAULT_TO = "sales@gershonconsulting.com";

async function run(req: NextRequest) {
  try {
    const config   = await getConfig();
    const url      = new URL(req.url);
    const key      = req.headers.get("x-report-key") ?? url.searchParams.get("key") ?? "";
    const expected = config.REPORT_TRIGGER_KEY ?? "";
    if (!expected) return NextResponse.json({ error: "REPORT_TRIGGER_KEY not set in /settings" }, { status: 400 });
    if (key !== expected) return NextResponse.json({ error: "Unauthorized (send X-Report-Key header or ?key=)" }, { status: 401 });

    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) return NextResponse.json({ error: "Streak credentials not set" }, { status: 400 });

    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);
    const mapping   = buildPriorityMapping(schema);
    const analytics = computeAnalytics(boxes, schema, mapping);
    const removed   = new Set(analytics.funnel.filter((f) => f.isRemoved).map((f) => f.stageKey));
    const now       = Date.now();
    const momentum  = computeMomentum(boxes, now, removed);
    const exact     = await recordAndReadExact(boxes, now);
    const report    = computeSalesWeekly(boxes, schema, mapping, momentum, exact, now);

    const subject = `GC Sales Weekly · Focus: ${report.focus.title} · ${report.nextLabel}`;
    const html    = renderHTML(report);

    if (url.searchParams.get("preview") === "1") {
      return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    }

    const resendKey = config.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY not set in /settings" }, { status: 400 });
    const fromAddr = extractAddress(config.REPORT_FROM) || "reports@gershonconsulting.com";
    const from     = `GC Sales Weekly <${fromAddr}>`;
    const to       = (config.SALES_REPORT_TO || DEFAULT_TO).split(",").map((s) => s.trim()).filter(Boolean);

    const r = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ from, to, subject, html }),
    });
    const json = await r.json() as { id?: string; message?: string; name?: string };
    if (!r.ok) return NextResponse.json({ error: `Resend ${r.status}: ${json.message ?? json.name ?? ""}` }, { status: 500 });
    return NextResponse.json({ ok: true, sentTo: to, subject, resendId: json.id, focus: report.focus.job });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function extractAddress(s: string | undefined): string {
  if (!s) return "";
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim();
}
