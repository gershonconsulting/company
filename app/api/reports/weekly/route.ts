import { NextResponse, NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema,
  buildPriorityMapping, resolvePipelineKey, computeBreakdown,
} from "@/lib/streak";
import { computeAnalytics } from "@/lib/analytics";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Weekly HTML digest of the pipeline, delivered via Resend.
// GET or POST — same behavior. Auth via X-Report-Key header (or
// ?key= query for cron-triggered use). Never accepts credentials
// from the request body — everything is read from KV.
export async function GET(req: NextRequest)  { return run(req); }
export async function POST(req: NextRequest) { return run(req); }

async function run(req: NextRequest) {
  try {
    const config = await getConfig();

    const headerKey = req.headers.get("x-report-key") ?? "";
    const url       = new URL(req.url);
    const queryKey  = url.searchParams.get("key") ?? "";
    const expected  = config.REPORT_TRIGGER_KEY ?? "";

    if (!expected) {
      return NextResponse.json({ error: "REPORT_TRIGGER_KEY not set in /settings" }, { status: 400 });
    }
    if (headerKey !== expected && queryKey !== expected) {
      return NextResponse.json({ error: "Unauthorized (send X-Report-Key header or ?key=)" }, { status: 401 });
    }

    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    const resendKey   = config.RESEND_API_KEY;
    const from        = config.REPORT_FROM || "reports@gershonconsulting.com";
    const to          = config.REPORT_TO   || "sales@gershonconsulting.com";

    if (!apiKey || !pipelineKey) {
      return NextResponse.json({ error: "Streak credentials not set" }, { status: 400 });
    }
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not set in /settings" }, { status: 400 });
    }

    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);
    const mapping   = buildPriorityMapping(schema);
    const breakdown = computeBreakdown(boxes, mapping);
    const analytics = computeAnalytics(boxes, schema, mapping);

    // Compose narrative
    const now    = new Date();
    const week   = weekLabel(now);
    const monthLabel = analytics.monthlyAllIntake.at(-1)?.month ?? "";
    const newNow = analytics.monthlyAllIntake.at(-1)?.count ?? 0;
    const newPrev= analytics.monthlyAllIntake.at(-2)?.count ?? 0;
    const clNow  = analytics.monthlyReachedClosing.at(-1)?.count ?? 0;
    const clPrev = analytics.monthlyReachedClosing.at(-2)?.count ?? 0;
    const rmNow  = analytics.monthlyRemoved.at(-1)?.count ?? 0;
    const rmPrev = analytics.monthlyRemoved.at(-2)?.count ?? 0;
    const activeFollowUpCount = Math.round((breakdown.nextDueDatePct / 100) * breakdown.total);

    const subject = `Gershon.AI Company — Weekly Pipeline Report · ${week}`;
    const html    = renderHTML({
      week,
      monthLabel,
      breakdown,
      analytics,
      newNow, newPrev,
      clNow, clPrev,
      rmNow, rmPrev,
      activeFollowUpCount,
    });

    // Send via Resend REST API
    const r = await fetch("https://api.resend.com/emails", {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    const json = await r.json() as { id?: string; message?: string; name?: string };
    if (!r.ok) {
      return NextResponse.json({ error: `Resend ${r.status}: ${json.message ?? json.name ?? ""}` }, { status: 500 });
    }
    return NextResponse.json({ ok: true, sentTo: to, subject, resendId: json.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function weekLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
}

function deltaStr(now: number, prev: number): string {
  const d = now - prev;
  if (d > 0) return `↑ +${d} vs last month`;
  if (d < 0) return `↓ ${d} vs last month`;
  return `flat vs last month`;
}

function deltaColor(now: number, prev: number, positiveIsGood = true): string {
  const d = now - prev;
  if (d === 0) return "#64748b";
  const isPositive = d > 0;
  const good = positiveIsGood ? isPositive : !isPositive;
  return good ? "#10b981" : "#dc2626";
}

interface RenderArgs {
  week: string;
  monthLabel: string;
  breakdown: { total: number; high: number; medium: number; low: number; unset: number; nextDueDatePct: number };
  analytics: import("@/lib/analytics").PipelineAnalytics;
  newNow: number; newPrev: number;
  clNow: number;  clPrev: number;
  rmNow: number;  rmPrev: number;
  activeFollowUpCount: number;
}

function renderHTML(a: RenderArgs): string {
  const { breakdown: bd, analytics: an } = a;
  const inClosing = an.funnel.filter((f) => f.isClosing).reduce((s, f) => s + f.count, 0);

  const funnelRows = an.funnel.map((f) => {
    const pct = bd.total > 0 ? Math.round((f.count / bd.total) * 100) : 0;
    const bar = f.isClosing ? "#10b981" : "#6366f1";
    return `
      <tr>
        <td style="padding:6px 8px;color:#374151;font-size:13px;">${escapeHtml(f.stageName)}${f.isClosing ? ' 🏆' : ''}${f.isRemoved ? ' 🗑' : ''}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600;color:#111;font-size:13px;">${f.count}</td>
        <td style="padding:6px 8px;width:60%;">
          <div style="background:#f1f5f9;border-radius:6px;overflow:hidden;height:16px;">
            <div style="background:${bar};height:16px;width:${Math.max(pct, 2)}%;"></div>
          </div>
        </td>
        <td style="padding:6px 8px;text-align:right;color:#6b7280;font-size:12px;">${pct}%</td>
      </tr>`;
  }).join("");

  const hotRows = an.hotLeads.slice(0, 5).map((l) => `
    <tr>
      <td style="padding:6px 8px;color:#111;font-weight:600;font-size:13px;">${escapeHtml(l.name)}</td>
      <td style="padding:6px 8px;color:#6b7280;font-size:13px;">${escapeHtml(l.stageName)}</td>
      <td style="padding:6px 8px;text-align:right;color:${l.daysSinceTouch < 7 ? "#059669" : "#f59e0b"};font-weight:600;font-size:13px;">${l.daysSinceTouch}d</td>
    </tr>`).join("");

  const staleRows = an.staleLeads.slice(0, 5).map((l) => `
    <tr>
      <td style="padding:6px 8px;color:#111;font-weight:600;font-size:13px;">${escapeHtml(l.name)}</td>
      <td style="padding:6px 8px;color:#6b7280;font-size:13px;">${escapeHtml(l.stageName)}</td>
      <td style="padding:6px 8px;font-size:12px;">
        <span style="background:${l.priority === 'High' ? '#fee2e2' : l.priority === 'Medium' ? '#fef3c7' : '#eef0fe'};color:${l.priority === 'High' ? '#b91c1c' : l.priority === 'Medium' ? '#92400e' : '#4f46e5'};padding:2px 8px;border-radius:9999px;font-weight:700;">${l.priority}</span>
      </td>
      <td style="padding:6px 8px;text-align:right;color:#dc2626;font-weight:600;font-size:13px;">${l.daysInactive}d</td>
    </tr>`).join("");

  const fr = an.freshness;
  const freshTot = fr.total || 1;
  const workingPct = Math.round(((fr.high + fr.medium) / freshTot) * 100);
  const coldPct    = Math.round(((fr.low + fr.stale + fr.never) / freshTot) * 100);

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #eef0f4;border-radius:14px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="padding:24px 28px 8px;">
        <div style="font-size:22px;font-weight:800;color:#6366f1;letter-spacing:-0.01em;">Company <span style="color:#94a3b8;font-weight:700;font-size:12px;letter-spacing:0.13em;text-transform:uppercase;margin-left:4px;">by Gershon.AI</span></div>
        <div style="font-size:14px;color:#64748b;margin-top:2px;">Weekly Pipeline Report · ${a.week}</div>
      </td></tr>

      <!-- KPI hero -->
      <tr><td style="padding:12px 28px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          ${kpiCell("Active leads",     String(bd.total), `${inClosing} in closing`, "#6366f1")}
          ${kpiCell(`New this month`, String(a.newNow), deltaStr(a.newNow, a.newPrev), deltaColor(a.newNow, a.newPrev))}
          ${kpiCell(`Reached closing`, String(a.clNow), deltaStr(a.clNow, a.clPrev), deltaColor(a.clNow, a.clPrev))}
          ${kpiCell("Active follow-ups", String(a.activeFollowUpCount), `${bd.nextDueDatePct}% of pipeline`, bd.nextDueDatePct >= 50 ? "#10b981" : "#f59e0b")}
        </tr></table>
      </td></tr>

      <!-- Narrative -->
      <tr><td style="padding:16px 28px 0;">
        <div style="padding:14px 16px;background:#f8fafc;border-left:4px solid #6366f1;border-radius:8px;font-size:14px;color:#334155;line-height:1.6;">
          <strong>What happened this week / month:</strong>
          We added <strong style="color:#6366f1;">${a.newNow}</strong> new leads
          (${deltaStr(a.newNow, a.newPrev)}), pushed <strong style="color:#10b981;">${a.clNow}</strong> into closing stages
          (${deltaStr(a.clNow, a.clPrev)}), and retired <strong style="color:#f59e0b;">${a.rmNow}</strong>
          (${deltaStr(a.rmNow, a.rmPrev)}).
          Net change: <strong style="color:${(a.newNow - a.rmNow) >= 0 ? "#10b981" : "#dc2626"};">${(a.newNow - a.rmNow) >= 0 ? "+" : ""}${a.newNow - a.rmNow}</strong>.
          Priority mix: High <strong>${bd.high}</strong>, Medium <strong>${bd.medium}</strong>, Low <strong>${bd.low}</strong>.
        </div>
      </td></tr>

      <!-- Freshness -->
      <tr><td style="padding:20px 28px 0;">
        <h3 style="margin:0 0 8px;font-size:14px;font-weight:800;color:#111;letter-spacing:-0.01em;">Freshness — how much we're actually working on leads</h3>
        <div style="font-size:13px;color:#64748b;margin-bottom:10px;">
          <span>Working (≤ 30d): <strong style="color:${workingPct >= 50 ? "#059669" : workingPct >= 30 ? "#d97706" : "#dc2626"};">${workingPct}%</strong></span>
          &nbsp;·&nbsp;
          <span>Cold (&gt; 30d): <strong style="color:${coldPct >= 50 ? "#dc2626" : coldPct >= 30 ? "#d97706" : "#059669"};">${coldPct}%</strong></span>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          ${freshRow("Hot",   "≤ 7d",   fr.high,   freshTot, "#10b981")}
          ${freshRow("Warm",  "8-30d",  fr.medium, freshTot, "#6366f1")}
          ${freshRow("Cool",  "31-90d", fr.low,    freshTot, "#f59e0b")}
          ${freshRow("Stale", "> 90d",  fr.stale,  freshTot, "#dc2626")}
          ${freshRow("Never", "no touch", fr.never, freshTot, "#94a3b8")}
        </table>
        ${fr.stale + fr.never > 5 ? `<div style="margin-top:8px;padding:10px 14px;background:#fee2e2;border-left:4px solid #dc2626;border-radius:8px;color:#7f1d1d;font-size:13px;"><strong>⚠ Warning:</strong> ${fr.stale + fr.never} leads have not been touched in over 90 days (or never). Prune or re-engage.</div>` : ""}
      </td></tr>

      <!-- Funnel -->
      <tr><td style="padding:20px 28px 0;">
        <h3 style="margin:0 0 8px;font-size:14px;font-weight:800;color:#111;letter-spacing:-0.01em;">Funnel — by stage (Streak order)</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
          ${funnelRows}
        </table>
      </td></tr>

      <!-- Hot leads -->
      ${hotRows ? `<tr><td style="padding:20px 28px 0;">
        <h3 style="margin:0 0 8px;font-size:14px;font-weight:800;color:#111;letter-spacing:-0.01em;">🔥 Hot leads — push these this week</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${hotRows}</table>
      </td></tr>` : ""}

      <!-- Stale leads -->
      ${staleRows ? `<tr><td style="padding:20px 28px 0;">
        <h3 style="margin:0 0 8px;font-size:14px;font-weight:800;color:#111;letter-spacing:-0.01em;">🧹 Stale leads — clean up</h3>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${staleRows}</table>
      </td></tr>` : ""}

      <!-- Footer -->
      <tr><td style="padding:24px 28px;background:#f8fafc;border-top:1px solid #eef0f4;font-size:12px;color:#94a3b8;text-align:center;margin-top:20px;">
        <a href="https://company.gershoncrm.com/" style="color:#6366f1;font-weight:700;text-decoration:none;">Open the dashboard →</a><br>
        <span style="margin-top:6px;display:inline-block;">company.gershonCRM.com · sent automatically every Monday</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function kpiCell(label: string, value: string, sub: string, color: string): string {
  return `<td style="width:25%;padding:6px;vertical-align:top;">
    <div style="background:#fff;border:1px solid #eef0f4;border-top:4px solid ${color};border-radius:12px;padding:14px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">${escapeHtml(label)}</div>
      <div style="font-size:26px;font-weight:800;color:#111;margin-top:4px;letter-spacing:-0.02em;">${escapeHtml(value)}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">${escapeHtml(sub)}</div>
    </div>
  </td>`;
}

function freshRow(label: string, range: string, count: number, total: number, color: string): string {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return `<tr>
    <td style="padding:5px 8px;color:#111;font-weight:600;width:20%;">${label} <span style="color:#94a3b8;font-weight:400;">${range}</span></td>
    <td style="padding:5px 8px;text-align:right;font-weight:700;color:#111;width:8%;">${count}</td>
    <td style="padding:5px 8px;">
      <div style="background:#f1f5f9;border-radius:6px;overflow:hidden;height:14px;">
        <div style="background:${color};height:14px;width:${Math.max(pct, 2)}%;"></div>
      </div>
    </td>
    <td style="padding:5px 8px;text-align:right;color:#6b7280;width:10%;">${pct}%</td>
  </tr>`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
