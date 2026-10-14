// Sales actions engine — turns the Streak pipeline into "who do I contact
// today, why, and what do I do", plus the pipeline value and objective
// metrics that the Today / Warnings / Values / Objectives pages share.
// Pure functions; edge-safe.

import type { StreakBox, PriorityFieldMapping } from "./streak";
import { lastTouchAt } from "./momentum";

const DAY = 86_400_000;
const INTERNAL_DOMAINS = ["gershonconsulting.com", "gershonconsulting.net", "gershon.ai"];

export type ActionKind =
  | "reply"          // they wrote, we haven't answered
  | "overdue"        // overdue Streak task
  | "hot-open"       // opened our last email several times, no reply
  | "closing"        // closing-stage deal with no touch for a while
  | "no-next-step"   // live lead with no open task
  | "going-cold";    // mid-funnel lead drifting

export const ACTION_META: Record<ActionKind, { label: string; weight: number; tone: "red" | "amber" | "indigo" }> = {
  "reply":        { label: "Waiting on our reply",   weight: 100, tone: "red" },
  "overdue":      { label: "Overdue task",           weight: 80,  tone: "red" },
  "hot-open":     { label: "Opened our email",       weight: 70,  tone: "amber" },
  "closing":      { label: "Deal needs follow-up",   weight: 60,  tone: "amber" },
  "going-cold":   { label: "Going cold",             weight: 40,  tone: "amber" },
  "no-next-step": { label: "No next step",           weight: 30,  tone: "indigo" },
};

export interface ActionReason { kind: ActionKind; text: string; todo: string; weight?: number; }

export interface LeadAction {
  key:        string;
  name:       string;
  url:        string;
  stageName:  string;
  stageOrder: number;
  priority:   "High" | "Medium" | "Low" | "Unset";
  owners:     string[];          // assignee emails
  ownerNames: string[];
  daysSinceTouch: number | null;
  lastTouchType:  string | null;
  score:      number;
  reasons:    ActionReason[];
  winProb:    number;            // 0..1 stage probability
  value:      number;            // weighted $ value
}

export interface StageValue { stageName: string; order: number; count: number; prob: number; value: number; }

export interface ObjectiveMetric {
  key: string; label: string; value: number; unit: "%" | "#" | "/wk";
  target: number; direction: "min" | "max"; met: boolean; help: string;
}

export interface ActionsPayload {
  generatedAt: string;
  leads:       LeadAction[];                         // only leads with at least one reason, best first
  counts:      Record<ActionKind, number>;
  owners:      { email: string; name: string; count: number }[];
  value:       { clv: number; clvSource: "settings" | "history" | "default"; invoicesPerClient?: number | null; total: number; byStage: StageValue[]; top: LeadAction[] };
  objectives:  ObjectiveMetric[];
  history?:    { date: string; values: Record<string, number> }[];
}

// ── Stage helpers ─────────────────────────────────────────────────────────
const STAGE_PROB: [RegExp, number][] = [
  [/recycl|lost|reject|archiv|dead/i, 0],
  [/clos/i,       0.85],
  [/negotiat/i,   0.65],
  [/proposal/i,   0.45],
  [/pitch/i,      0.30],
  [/schedul|meeting|demo/i, 0.20],
  [/nurtur|nurter/i, 0.10],
  [/contact/i,    0.10],
  [/lead|new/i,   0.05],
];
export function stageProb(name: string): number {
  for (const [re, p] of STAGE_PROB) if (re.test(name)) return p;
  return 0.1;
}
const isRemoved = (n: string) => /recycl|lost|reject|archiv|dead/i.test(n);
const isClosing = (n: string) => /proposal|negotiat|clos/i.test(n);
const isMidFunnel = (n: string) => /contact|schedul|pitch|nurtur|nurter/i.test(n);
function stageOrder(name: string): number {
  const m = name.trim().match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : 99;
}

// ── Box helpers ───────────────────────────────────────────────────────────
type AnyBox = StreakBox & Record<string, unknown>;
function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") { const n = Number(v); if (!isNaN(n)) return n; const d = Date.parse(v); return isNaN(d) ? 0 : d; }
  return 0;
}
function isInternal(email: unknown): boolean {
  const e = String(email ?? "").toLowerCase();
  return INTERNAL_DOMAINS.some((d) => e.endsWith("@" + d));
}
function owners(b: AnyBox): { emails: string[]; names: string[] } {
  const raw = b.assignedToSharingEntries;
  const list = Array.isArray(raw) ? raw as Record<string, unknown>[] : [];
  const emails: string[] = [], names: string[] = [];
  for (const e of list) {
    const email = String(e.email ?? "").toLowerCase();
    if (!email) continue;
    emails.push(email);
    names.push(String(e.fullName ?? e.displayName ?? email.split("@")[0]));
  }
  return { emails, names };
}
function priorityOf(b: AnyBox, mapping: PriorityFieldMapping): LeadAction["priority"] {
  const val = mapping.fieldKey ? (b.fields ?? {})[mapping.fieldKey] as string | number | null | undefined : b.priority;
  if (val === null || val === undefined || val === "") return "Unset";
  if (mapping.high.has(val)) return "High";
  if (mapping.medium.has(val)) return "Medium";
  if (mapping.low.has(val)) return "Low";
  return "Unset";
}
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

// ── Main ──────────────────────────────────────────────────────────────────
export function computeActions(
  boxes: StreakBox[],
  stageNames: Map<string, string>,
  mapping: PriorityFieldMapping,
  clvInput: number | null,
  extras: { leadsPerWeek: number; leadsTarget: number },
  now = Date.now(),
): ActionsPayload {
  const clv = clvInput && clvInput > 0 ? clvInput : 10_000;
  const counts = Object.fromEntries(Object.keys(ACTION_META).map((k) => [k, 0])) as Record<ActionKind, number>;
  const all: LeadAction[] = [];
  const byStage = new Map<string, StageValue>();
  let live = 0, touched30 = 0, withNext = 0, stale = 0, high = 0, waiting = 0, overdue = 0;

  for (const raw of boxes) {
    const b = raw as AnyBox;
    const stageName = stageNames.get(b.stageKey ?? "") ?? "Unknown";
    if (isRemoved(stageName)) continue;
    live++;

    const touch  = lastTouchAt(b);
    const days   = touch > 0 ? Math.max(0, Math.floor((now - touch) / DAY)) : null;
    const recv   = num(b.lastEmailReceivedTimestamp);
    const sent   = num(b.lastEmailSentTimestamp);
    const openTasks = num(b.taskIncompleteCount);
    const overdueTasks = num(b.taskOverdueCount);
    const pri    = priorityOf(b, mapping);
    const prob   = stageProb(stageName);
    const o      = owners(b);

    if (days !== null && days <= 30) touched30++;
    if (openTasks > 0 || num(b.soonestTaskDueDate) > 0) withNext++;
    if (days !== null && days > 90) stale++;
    if (pri === "High") high++;

    const reasons: ActionReason[] = [];

    // 1. They wrote last and it's not one of us
    if (recv > sent && recv > 0 && !isInternal(b.lastEmailFrom)) {
      const d = Math.floor((now - recv) / DAY);
      if (d <= 45) {
        // Fresher = more urgent: emailed today scores 130, a month ago 100
        reasons.push({ kind: "reply", text: `They emailed ${d === 0 ? "today" : `${plural(d, "day")} ago`} — no reply from us yet`, todo: "Reply today", weight: 100 + Math.max(0, 30 - d) });
        waiting++;
      }
    }
    // 2. Overdue task
    if (overdueTasks > 0) {
      const due = num(b.earliestOverdueTaskDueDate);
      const d = due ? Math.max(0, Math.floor((now - due) / DAY)) : null;
      const old = d !== null && d > 30;
      reasons.push(old
        ? { kind: "overdue", text: `${plural(overdueTasks, "old task")} overdue (${plural(d!, "day")})`, todo: "Close it or set a new date in Streak", weight: 20 }
        : { kind: "overdue", text: `${plural(overdueTasks, "task")} overdue${d !== null ? ` (${plural(d, "day")})` : ""}`, todo: "Do it today or reschedule it in Streak" });
      overdue++;
    }
    // 3. Opened our last email several times, no reply since we sent it
    const views = num(b.totalNumberOfLastSentEmailViews);
    if (views >= 2 && sent > recv && now - sent <= 14 * DAY) {
      reasons.push({ kind: "hot-open", text: `Opened our last email ${views}× — no reply yet`, todo: "Call or send a short follow-up while it's warm" });
    }
    // 4. Closing-stage deal untouched ≥ 10 days
    if (isClosing(stageName) && days !== null && days >= 10) {
      reasons.push({ kind: "closing", text: `${stageName.replace(/^\d+\.\s*/, "")} — no touch for ${plural(days, "day")}`, todo: "Follow up on the proposal / next step" });
    }
    // 5. Mid-funnel lead drifting (21–60 days)
    if (isMidFunnel(stageName) && days !== null && days >= 21 && days <= 60) {
      reasons.push({ kind: "going-cold", text: `No touch for ${plural(days, "day")}`, todo: "Re-engage before it goes stale" });
    }
    // 6. Live, recently active lead with no open task
    if (openTasks === 0 && days !== null && days <= 60 && !/^\s*(\d+\.\s*)?lead\b/i.test(stageName)) {
      reasons.push({ kind: "no-next-step", text: "No next step scheduled", todo: "Add a task with a due date in Streak" });
    }

    for (const r of reasons) counts[r.kind]++;

    const prioBonus = pri === "High" ? 25 : pri === "Medium" ? 10 : 0;
    const score = reasons.reduce((s, r) => s + (r.weight ?? ACTION_META[r.kind].weight), 0) + prioBonus + Math.round(prob * 40);
    const value = Math.round(clv * prob);

    const sv = byStage.get(stageName) ?? { stageName, order: stageOrder(stageName), count: 0, prob, value: 0 };
    sv.count++; sv.value += value;
    byStage.set(stageName, sv);

    all.push({
      key: b.key, name: b.name ?? "(unnamed)",
      url: `https://www.streak.com/a/boxes/${b.key}`,
      stageName, stageOrder: stageOrder(stageName), priority: pri,
      owners: o.emails, ownerNames: o.names,
      daysSinceTouch: days, lastTouchType: (b.lastTouchpointType as string) ?? null,
      score, reasons, winProb: prob, value,
    });
  }

  const leads = all.filter((l) => l.reasons.length > 0).sort((a, b) => b.score - a.score);

  const ownerMap = new Map<string, { email: string; name: string; count: number }>();
  for (const l of leads) l.owners.forEach((e, i) => {
    const cur = ownerMap.get(e) ?? { email: e, name: l.ownerNames[i] ?? e, count: 0 };
    cur.count++; ownerMap.set(e, cur);
  });

  const pct = (n: number) => (live > 0 ? Math.round((n / live) * 100) : 0);
  const objectives: ObjectiveMetric[] = [
    { key: "leadsPerWeek", label: "New leads per week", value: extras.leadsPerWeek, unit: "/wk", target: extras.leadsTarget, direction: "min", met: extras.leadsPerWeek >= extras.leadsTarget,
      help: "Last 4 weeks' average vs our best quarter. Feed the top of the funnel." },
    { key: "worked30", label: "Pipeline worked in last 30 days", value: pct(touched30), unit: "%", target: 50, direction: "min", met: pct(touched30) >= 50,
      help: "Share of live leads with an email, call or meeting in the last 30 days." },
    { key: "nextStep", label: "Leads with a next step", value: pct(withNext), unit: "%", target: 70, direction: "min", met: pct(withNext) >= 70,
      help: "Share of live leads with an open Streak task. Every lead should have a dated next step." },
    { key: "waiting", label: "Prospects waiting on our reply", value: waiting, unit: "#", target: 0, direction: "max", met: waiting === 0,
      help: "They emailed last and we haven't answered. Should always be zero." },
    { key: "overdue", label: "Leads with overdue tasks", value: overdue, unit: "#", target: 0, direction: "max", met: overdue === 0,
      help: "Overdue Streak tasks. Do them or reschedule." },
    { key: "stale", label: "Stale leads (> 90 days)", value: pct(stale), unit: "%", target: 10, direction: "max", met: pct(stale) <= 10,
      help: "Re-engage or recycle leads nobody has touched in 3 months." },
    { key: "highShare", label: "High-priority share", value: pct(high), unit: "%", target: 10, direction: "min", met: pct(high) >= 10,
      help: "Share of live leads tagged High priority in Streak. Qualify harder." },
  ];

  const top = [...all].filter((l) => l.value > 0).sort((a, b) => b.value - a.value).slice(0, 10);

  return {
    generatedAt: new Date(now).toISOString(),
    leads,
    counts,
    owners: [...ownerMap.values()].sort((a, b) => b.count - a.count),
    value: {
      clv, clvSource: clvInput && clvInput > 0 ? "settings" : "default",
      total: all.reduce((s, l) => s + l.value, 0),
      byStage: [...byStage.values()].sort((a, b) => a.order - b.order),
      top,
    },
    objectives,
  };
}
