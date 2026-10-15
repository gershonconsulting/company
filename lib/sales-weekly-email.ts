// HTML email for the Monday sales report. See lib/sales-weekly.ts.
import type { SalesWeekly, LeadRow, JobStatus } from "./sales-weekly";

// ── Rendering ─────────────────────────────────────────────────────────────

const STATUS: Record<JobStatus, { label: string; color: string; bg: string }> = {
  "on-track": { label: "On track", color: "#059669", bg: "#ecfdf5" },
  behind:     { label: "Behind",   color: "#d97706", bg: "#fffbeb" },
  critical:   { label: "Critical", color: "#dc2626", bg: "#fef2f2" },
};

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function pill(p: LeadRow["priority"]): string {
  const c = p === "High" ? ["#fee2e2", "#b91c1c"] : p === "Medium" ? ["#fef3c7", "#92400e"] : p === "Low" ? ["#eef0fe", "#4f46e5"] : ["#f1f5f9", "#64748b"];
  return `<span style="background:${c[0]};color:${c[1]};padding:1px 7px;border-radius:9999px;font-size:11px;font-weight:700;">${p}</span>`;
}

function leadTable(rows: LeadRow[], extra: "touch" | "due" = "touch"): string {
  if (!rows.length) return `<div style="font-size:13px;color:#94a3b8;padding:4px 0;">None.</div>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">${rows.map((r) => `
    <tr>
      <td style="padding:5px 6px;color:#111;font-weight:600;">${esc(r.name)}</td>
      <td style="padding:5px 6px;color:#64748b;">${esc(r.stage)}</td>
      <td style="padding:5px 6px;">${pill(r.priority)}</td>
      <td style="padding:5px 6px;text-align:right;white-space:nowrap;color:${r.overdue ? "#dc2626" : "#475569"};font-weight:600;">${
        extra === "due"
          ? (r.overdue ? "overdue" : r.due ? `due ${esc(r.due)}` : "no next step")
          : (r.daysSinceTouch === null ? "never touched" : `${r.daysSinceTouch}d since touch`)
      }</td>
    </tr>`).join("")}</table>`;
}

function stat(label: string, value: string, sub = ""): string {
  return `<td style="padding:4px;vertical-align:top;width:33%;">
    <div style="border:1px solid #eef0f4;border-radius:10px;padding:10px 12px;">
      <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">${esc(label)}</div>
      <div style="font-size:22px;font-weight:800;color:#111;margin-top:2px;">${esc(value)}</div>
      ${sub ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${esc(sub)}</div>` : ""}
    </div></td>`;
}

function h4(t: string): string {
  return `<div style="font-size:12px;font-weight:800;color:#334155;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 4px;">${t}</div>`;
}

function jobCard(n: number, title: string, status: JobStatus, isFocus: boolean, body: string): string {
  const s = STATUS[status];
  return `<tr><td style="padding:16px 28px 0;">
    <div style="border:1px solid ${isFocus ? "#6366f1" : "#eef0f4"};border-radius:14px;overflow:hidden;">
      <div style="padding:12px 16px;background:${s.bg};border-bottom:1px solid #eef0f4;">
        <span style="font-size:16px;font-weight:800;color:#111;">${n}. ${esc(title)}</span>
        <span style="float:right;font-size:12px;font-weight:800;color:${s.color};">${s.label}${isFocus ? " · FOCUS" : ""}</span>
      </div>
      <div style="padding:8px 16px 14px;">${body}</div>
    </div>
  </td></tr>`;
}

export function renderSalesWeeklyHTML(r: SalesWeekly): string {
  const g = r.get, e = r.entertain, c = r.close;

  const getBody = `
    ${h4(`Last week · ${esc(r.periodLabel)}`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${stat("New leads", String(g.lastWeek), `target ${g.target}/week`)}
      ${stat("4-week average", `${g.avg4w}/wk`)}
      ${stat("Last new lead", g.daysSinceLast === null ? "—" : `${g.daysSinceLast}d ago`)}
    </tr></table>
    ${g.newLeads.length ? leadTable(g.newLeads) : ""}
    ${h4(`This week · ${esc(r.nextLabel)}`)}
    <div style="font-size:13px;color:#1f2937;">Goal: add <strong>${g.goalNext}</strong> new qualified lead${g.goalNext === 1 ? "" : "s"} to the pipeline.</div>`;

  const entertainBody = `
    ${h4(`Last week · ${esc(r.periodLabel)}`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${stat("Leads touched", String(e.touchedLastWeek), `of ${r.live} live`)}
      ${stat("Emails exchanged", e.emailsLastWeek === null ? "—" : String(e.emailsLastWeek), e.emailsLastWeek === null ? "tracking warming up" : "")}
      ${stat("30-day coverage", `${e.coveragePct}%`, "target 50%")}
    </tr></table>
    ${h4(`This week · ${esc(r.nextLabel)}`)}
    <div style="font-size:13px;color:#1f2937;margin-bottom:4px;"><strong>${e.overdueCount}</strong> overdue follow-ups · <strong>${e.dueNextWeek.length}</strong> due this week · <strong>${e.noNextStepCount}</strong> live leads with no next step.</div>
    ${e.overdue.length ? `<div style="font-size:12px;font-weight:700;color:#dc2626;margin-top:8px;">Overdue — do first</div>${leadTable(e.overdue, "due")}` : ""}
    ${e.dueNextWeek.length ? `<div style="font-size:12px;font-weight:700;color:#334155;margin-top:8px;">Due this week</div>${leadTable(e.dueNextWeek, "due")}` : ""}
    ${e.reengage.length ? `<div style="font-size:12px;font-weight:700;color:#d97706;margin-top:8px;">Re-engage — High/Medium priority, silent 21+ days</div>${leadTable(e.reengage)}` : ""}`;

  const closeBody = `
    ${h4(`Last week · ${esc(r.periodLabel)}`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${stat("Moved to closing", String(c.movedToClosingLastWeek.length))}
      ${stat("Won", String(c.wonLastWeek.length))}
      ${stat("In closing now", String(c.inClosingTotal), c.closingNoNextStep ? `${c.closingNoNextStep} without next step` : "all have a next step")}
    </tr></table>
    ${c.wonLastWeek.length ? `<div style="font-size:12px;font-weight:700;color:#059669;margin-top:8px;">🏆 Won</div>${leadTable(c.wonLastWeek)}` : ""}
    ${c.movedToClosingLastWeek.length ? `<div style="font-size:12px;font-weight:700;color:#334155;margin-top:8px;">Moved into closing</div>${leadTable(c.movedToClosingLastWeek)}` : ""}
    ${h4(`This week · ${esc(r.nextLabel)}`)}
    <div style="font-size:13px;color:#1f2937;margin-bottom:4px;">Push every lead below to a decision. Each needs a dated next step.</div>
    ${leadTable(c.inClosing, "due")}`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #eef0f4;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:24px 28px 4px;">
        <div style="font-size:22px;font-weight:800;color:#6366f1;letter-spacing:-0.01em;">Sales Weekly <span style="color:#94a3b8;font-weight:700;font-size:12px;letter-spacing:0.13em;text-transform:uppercase;margin-left:4px;">by Gershon.AI</span></div>
        <div style="font-size:14px;color:#64748b;margin-top:2px;">Last week ${esc(r.periodLabel)} · This week ${esc(r.nextLabel)}</div>
      </td></tr>

      <tr><td style="padding:14px 28px 0;">
        <div style="padding:14px 16px;background:#eef2ff;border-left:4px solid #6366f1;border-radius:8px;">
          <div style="font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#4f46e5;">Focus this week</div>
          <div style="font-size:18px;font-weight:800;color:#111;margin-top:2px;">${esc(r.focus.title)}</div>
          <div style="font-size:13px;color:#334155;margin-top:4px;line-height:1.5;">${esc(r.focus.why)}</div>
          <ol style="margin:10px 0 0 18px;padding:0;font-size:13px;color:#1f2937;line-height:1.55;">
            ${r.priorities.map((p) => `<li style="margin:3px 0;">${esc(p)}</li>`).join("")}
          </ol>
        </div>
      </td></tr>

      <tr><td style="padding:14px 28px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;"><tr>
          ${(["get", "entertain", "close"] as const).map((j) => {
            const s = STATUS[r[j].status];
            const t = j === "get" ? "Get leads" : j === "entertain" ? "Entertain" : "Close";
            return `<td style="padding:4px;width:33%;"><div style="background:${s.bg};border-radius:10px;padding:8px 10px;text-align:center;"><div style="font-weight:800;color:#111;">${t}</div><div style="font-weight:700;color:${s.color};font-size:12px;">${s.label}</div></div></td>`;
          }).join("")}
        </tr></table>
      </td></tr>

      ${jobCard(1, "Get new leads", g.status, r.focus.job === "get", getBody)}
      ${jobCard(2, "Entertain current leads", e.status, r.focus.job === "entertain", entertainBody)}
      ${jobCard(3, "Close leads", c.status, r.focus.job === "close", closeBody)}

      <tr><td style="padding:24px 28px;background:#f8fafc;border-top:1px solid #eef0f4;font-size:12px;color:#94a3b8;text-align:center;">
        <a href="https://company.gershoncrm.com/" style="color:#6366f1;font-weight:700;text-decoration:none;">Open the dashboard →</a><br>
        <span style="margin-top:6px;display:inline-block;">company.gershonCRM.com · Streak pipeline · sent automatically every Monday</span>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
