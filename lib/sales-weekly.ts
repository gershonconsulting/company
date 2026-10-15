// Sales Weekly — the Monday report for sales@gershonconsulting.com.
//
// Organised around the three jobs of sales:
//   1. GET new leads
//   2. ENTERTAIN current leads (active follow-up)
//   3. CLOSE leads
// For each job: what happened LAST WEEK (the 7 days before the report runs)
// and what must happen THIS COMING WEEK, then one "focus" verdict naming the
// job that is furthest behind.
//
// Pure functions only — safe on the edge runtime.

import type { StreakBox, PipelineSchema, PriorityFieldMapping } from "./streak";
import { buildStageMap, extractStageOrder } from "./analytics";
import { createdAt, lastMoveAt, lastTouchAt, type Momentum, type MomentumExact } from "./momentum";

const DAY = 86_400_000;
const CLOSING_PATTERNS = [/proposal/i, /negotiat/i, /closing/i, /contract/i];
const WON_PATTERNS     = [/\bwon\b/i, /signed/i, /\bclient\b/i, /customer/i];
const REMOVED_PATTERNS = [/recycl/i, /lost/i, /reject/i, /archiv/i, /dead/i];
const LIST_LIMIT = 10;

type AnyBox = StreakBox & Record<string, unknown>;
export type JobStatus = "on-track" | "behind" | "critical";

export interface LeadRow {
  key: string;
  name: string;
  stage: string;
  priority: "High" | "Medium" | "Low" | "Unset";
  daysSinceTouch: number | null;
  due: string | null;          // next task due date, "Oct 21"
  overdue: boolean;
}

export interface SalesWeekly {
  periodLabel: string;         // "Oct 6 – Oct 12"
  nextLabel: string;           // "Oct 13 – Oct 19"
  live: number;
  get: {
    lastWeek: number;
    target: number;            // per-week target (best quarter of the year)
    avg4w: number;
    daysSinceLast: number | null;
    newLeads: LeadRow[];
    status: JobStatus;
    goalNext: number;
  };
  entertain: {
    touchedLastWeek: number;
    touched30: number;
    coveragePct: number;       // % of live leads touched in 30 days
    emailsLastWeek: number | null;
    overdueCount: number;
    noNextStepCount: number;
    dueNextWeek: LeadRow[];
    overdue: LeadRow[];
    reengage: LeadRow[];       // High/Medium priority, no touch in 21+ days
    status: JobStatus;
  };
  close: {
    movedToClosingLastWeek: LeadRow[];
    wonLastWeek: LeadRow[];
    inClosing: LeadRow[];
    inClosingTotal: number;
    closingNoNextStep: number;
    status: JobStatus;
  };
  focus: { job: "get" | "entertain" | "close"; title: string; why: string };
  priorities: string[];
}

function fmt(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
}

function priorityOf(box: StreakBox, mapping: PriorityFieldMapping): LeadRow["priority"] {
  const val = mapping.fieldKey
    ? (box.fields ?? {})[mapping.fieldKey] as string | number | null | undefined
    : box.priority;
  if (val === null || val === undefined) return "Unset";
  if (mapping.high.has(val))   return "High";
  if (mapping.medium.has(val)) return "Medium";
  if (mapping.low.has(val))    return "Low";
  return "Unset";
}

const PRI_RANK: Record<LeadRow["priority"], number> = { High: 0, Medium: 1, Low: 2, Unset: 3 };

export function computeSalesWeekly(
  boxes: StreakBox[],
  schema: PipelineSchema,
  mapping: PriorityFieldMapping,
  momentum: Momentum,
  exact: MomentumExact | undefined,
  now = Date.now(),
): SalesWeekly {
  const stageMap = buildStageMap(schema);
  const closingKeys = new Set<string>(), wonKeys = new Set<string>(), removedKeys = new Set<string>();
  for (const [k, name] of stageMap) {
    if (REMOVED_PATTERNS.some((re) => re.test(name))) { removedKeys.add(k); continue; }
    if (WON_PATTERNS.some((re) => re.test(name)))     { wonKeys.add(k); continue; }
    if (CLOSING_PATTERNS.some((re) => re.test(name))) closingKeys.add(k);
  }

  const from = now - 7 * DAY, until = now + 7 * DAY;
  const inLast = (t: number) => t > 0 && t >= from && t < now;

  const row = (b: AnyBox): LeadRow => {
    const touch = lastTouchAt(b);
    const due = Number(b.soonestTaskDueDate ?? 0) || 0;
    return {
      key: b.key,
      name: b.name ?? "(unnamed)",
      stage: stageMap.get(b.stageKey ?? "") ?? "—",
      priority: priorityOf(b, mapping),
      daysSinceTouch: touch > 0 ? Math.max(0, Math.floor((now - touch) / DAY)) : null,
      due: due > 0 ? fmt(due) : null,
      overdue: (Number(b.taskOverdueCount ?? 0) || 0) > 0,
    };
  };

  const newLeads: LeadRow[] = [];
  const dueNext: { r: LeadRow; t: number }[] = [];
  const overdue: LeadRow[] = [];
  const reengage: LeadRow[] = [];
  const movedToClosing: LeadRow[] = [];
  const won: LeadRow[] = [];
  const inClosing: LeadRow[] = [];
  let live = 0, touchedLast = 0, touched30 = 0, overdueCount = 0, noNext = 0, closingNoNext = 0;

  for (const raw of boxes) {
    const b = raw as AnyBox;
    const sk = b.stageKey ?? "";
    const removed = removedKeys.has(sk);
    const isWon = wonKeys.has(sk);
    const isClosing = closingKeys.has(sk);
    const c = createdAt(b), m = lastMoveAt(b), t = lastTouchAt(b);

    if (inLast(c)) newLeads.push(row(b));
    if (isWon && inLast(m)) won.push(row(b));
    if (removed || isWon) continue;

    live++;
    if (inLast(t)) touchedLast++;
    if (t > 0 && now - t <= 30 * DAY) touched30++;

    const due = Number(b.soonestTaskDueDate ?? 0) || 0;
    const hasNext = due > 0 || (Number(b.taskIncompleteCount ?? 0) || 0) > 0;
    const isOverdue = (Number(b.taskOverdueCount ?? 0) || 0) > 0;
    if (!hasNext) noNext++;
    if (isOverdue) { overdueCount++; overdue.push(row(b)); }
    else if (due >= now && due < until) dueNext.push({ r: row(b), t: due });

    const pri = priorityOf(b, mapping);
    if ((pri === "High" || pri === "Medium") && !isClosing && (t === 0 || now - t > 21 * DAY)) reengage.push(row(b));

    if (isClosing) {
      inClosing.push(row(b));
      if (!hasNext) closingNoNext++;
      if (inLast(m)) movedToClosing.push(row(b));
    }
  }

  dueNext.sort((a, b) => a.t - b.t);
  overdue.sort((a, b) => PRI_RANK[a.priority] - PRI_RANK[b.priority]);
  reengage.sort((a, b) => PRI_RANK[a.priority] - PRI_RANK[b.priority] || (b.daysSinceTouch ?? 9999) - (a.daysSinceTouch ?? 9999));
  inClosing.sort((a, b) => (extractStageOrder(b.stage) - extractStageOrder(a.stage)) || PRI_RANK[a.priority] - PRI_RANK[b.priority]);

  // ── Job statuses ───────────────────────────────────────────────────────
  const lm = momentum.metrics.find((x) => x.key === "leads");
  const target = lm?.targetPerWeek ?? 0;
  const lastWeekLeads = newLeads.length;
  const getStatus: JobStatus =
    target <= 0 ? (lastWeekLeads > 0 ? "on-track" : "behind")
    : lastWeekLeads >= target * 0.9 ? "on-track"
    : lastWeekLeads >= target * 0.5 ? "behind" : "critical";

  const coveragePct = live > 0 ? Math.round((touched30 / live) * 100) : 0;
  const entertainStatus: JobStatus =
    coveragePct >= 50 && overdueCount <= Math.max(3, live * 0.05) ? "on-track"
    : coveragePct >= 30 ? "behind" : "critical";

  const closingTouchedWeek = inClosing.filter((r) => r.daysSinceTouch !== null && r.daysSinceTouch <= 7).length;
  const closeStatus: JobStatus =
    inClosing.length === 0 ? "critical"
    : (won.length > 0 || movedToClosing.length > 0) && closingTouchedWeek >= inClosing.length * 0.5 ? "on-track"
    : closingTouchedWeek > 0 || movedToClosing.length > 0 ? "behind" : "critical";

  // ── Focus: closest to revenue wins ties ───────────────────────────────
  const sev: Record<JobStatus, number> = { critical: 2, behind: 1, "on-track": 0 };
  const order: Array<"close" | "entertain" | "get"> = ["close", "entertain", "get"];
  const statusOf = { get: getStatus, entertain: entertainStatus, close: closeStatus };
  const job = order.reduce((best, j) => (sev[statusOf[j]] > sev[statusOf[best]] ? j : best), "close" as "close" | "entertain" | "get");
  const goalNext = Math.max(1, Math.ceil(target || 1));

  const focusText = {
    close: {
      title: "Close leads",
      why: inClosing.length === 0
        ? "Nothing is in a closing stage. Revenue next month depends on moving warm leads to proposal now."
        : `${inClosing.length} lead${inClosing.length === 1 ? " is" : "s are"} in closing, only ${closingTouchedWeek} touched in the last 7 days${closingNoNext ? ` and ${closingNoNext} without a next step` : ""}.`,
    },
    entertain: {
      title: "Entertain current leads",
      why: `Only ${coveragePct}% of the ${live} live leads were touched in the last 30 days (target 50%)${overdueCount ? `, and ${overdueCount} follow-up${overdueCount === 1 ? " is" : "s are"} overdue` : ""}.`,
    },
    get: {
      title: "Get new leads",
      why: `${lastWeekLeads} new lead${lastWeekLeads === 1 ? "" : "s"} last week vs a target of ${target}/week${lm?.daysSinceLast != null && lm.daysSinceLast >= 7 ? ` — none in ${lm.daysSinceLast} days` : ""}.`,
    },
  }[job];

  const priorities: string[] = [];
  const push = (j: "get" | "entertain" | "close") => {
    if (j === "close") {
      if (inClosing.length) priorities.push(`Close: call or meet every lead in closing (${inClosing.length}) and give each a dated next step${closingNoNext ? ` — ${closingNoNext} have none today` : ""}.`);
      else priorities.push("Close: pick the 3 warmest leads and send a proposal this week.");
    } else if (j === "entertain") {
      const n = Math.max(0, Math.ceil(live * 0.5) - touched30);
      priorities.push(`Entertain: clear the ${overdueCount} overdue follow-up${overdueCount === 1 ? "" : "s"}, handle the ${dueNext.length} due this week${n > 0 ? `, and touch ${n} more lead${n === 1 ? "" : "s"} to reach 50% coverage` : ""}.`);
    } else {
      priorities.push(`Get: add at least ${goalNext} new qualified lead${goalNext === 1 ? "" : "s"} to the pipeline this week.`);
    }
  };
  push(job);
  for (const j of order) if (j !== job) push(j);

  return {
    periodLabel: `${fmt(from)} – ${fmt(now - DAY)}`,
    nextLabel: `${fmt(now)} – ${fmt(until - DAY)}`,
    live,
    get: {
      lastWeek: lastWeekLeads,
      target,
      avg4w: lm?.recentPerWeek ?? 0,
      daysSinceLast: lm?.daysSinceLast ?? null,
      newLeads: newLeads.slice(0, LIST_LIMIT),
      status: getStatus,
      goalNext,
    },
    entertain: {
      touchedLastWeek: touchedLast,
      touched30,
      coveragePct,
      emailsLastWeek: exact?.emailsLast7 ?? null,
      overdueCount,
      noNextStepCount: noNext,
      dueNextWeek: dueNext.slice(0, LIST_LIMIT).map((x) => x.r),
      overdue: overdue.slice(0, LIST_LIMIT),
      reengage: reengage.slice(0, LIST_LIMIT),
      status: entertainStatus,
    },
    close: {
      movedToClosingLastWeek: movedToClosing.slice(0, LIST_LIMIT),
      wonLastWeek: won.slice(0, LIST_LIMIT),
      inClosing: inClosing.slice(0, LIST_LIMIT),
      inClosingTotal: inClosing.length,
      closingNoNextStep: closingNoNext,
      status: closeStatus,
    },
    focus: { job, ...focusText },
    priorities,
  };
}
