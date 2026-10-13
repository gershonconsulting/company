// Momentum — "are we slowing down?"
//
// Answers three questions with rolling 7-day windows (not calendar months, so a
// half-finished month never hides or exaggerates a slowdown):
//   1. Leads         — how many new leads entered the pipeline
//   2. Interactions  — how many leads had a real touchpoint (email / call / meeting)
//   3. Moves         — how many leads changed stage
//
// For each metric we compare the last 4 weeks' weekly average to the 8 weeks
// before that (the "normal pace"), and turn the gap into a plain-English ask:
// "you need +N leads / week to get back to pace".
//
// Pure functions only — safe on the edge runtime and in the browser.

import type { StreakBox } from "./streak";

export const MOMENTUM_WEEKS   = 12;   // weeks of history shown
export const RECENT_WEEKS     = 4;    // "now" window
export const SLOWING_PCT      = -25;  // ≤ this vs normal pace  → red
export const SOFTENING_PCT    = -10;  // ≤ this vs normal pace  → amber

export type MomentumStatus = "slowing" | "softening" | "steady" | "growing" | "no-baseline";
export type MomentumKey    = "leads" | "interactions" | "moves";

export interface MomentumWeek {
  start: string;      // ISO date (UTC) the 7-day window starts
  end:   string;      // ISO date (UTC) the window ends (exclusive)
  label: string;      // "Oct 6"
  leads: number;
  interactions: number;
  moves: number;
}

export interface MomentumMetric {
  key:            MomentumKey;
  label:          string;
  recentPerWeek:  number;   // avg / week, last RECENT_WEEKS
  normalPerWeek:  number;   // avg / week, the weeks before
  lastWeek:       number;   // most recent 7 days
  changePct:      number | null;   // recent vs normal, null when no baseline
  status:         MomentumStatus;
  gapPerWeek:     number;   // how many more / week to get back to normal pace (0 if on pace)
  daysSinceLast:  number | null;   // days since the most recent event of this kind
}

export interface MomentumExact {
  // Exact email counts, from daily KV snapshots of Streak's per-box email totals.
  trackingSince:     string | null;   // first snapshot date
  emailsLast7:       number | null;   // null until a snapshot ~7 days old exists
  emailsPrev7:       number | null;   // null until a snapshot ~14 days old exists
  sentLast7:         number | null;
  receivedLast7:     number | null;
}

export interface Momentum {
  generatedAt:  string;
  weeks:        MomentumWeek[];   // oldest → newest
  metrics:      MomentumMetric[];
  overall:      MomentumStatus;
  headline:     string;           // one-sentence verdict
  actions:      string[];         // concrete asks
  exact?:       MomentumExact;
}

// ── Box timestamp helpers ─────────────────────────────────────────────────
type AnyBox = StreakBox & Record<string, unknown>;

function ts(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v > 0 ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    if (!isNaN(n) && n > 0) return n;
    const d = Date.parse(v);
    return isNaN(d) ? 0 : d;
  }
  return 0;
}

export function createdAt(b: AnyBox): number {
  return ts(b.creationTimestamp) || ts(b.lastSavedTimestamp);
}

export function lastMoveAt(b: AnyBox): number {
  return ts(b.lastStageChangeTimestamp);
}

/** Most recent real human touch: email sent/received, call log, meeting note. */
export function lastTouchAt(b: AnyBox): number {
  const explicit = ts(b.lastTouchpointTimestamp);
  const derived = Math.max(
    ts(b.lastEmailSentTimestamp),
    ts(b.lastEmailReceivedTimestamp),
    ts(b.lastEmailUpdatedTimestamp),
    ts(b.mostRecentCallLogTimestamp),
    ts(b.mostRecentMeetingNotesTimestamp),
  );
  const best = Math.max(explicit, derived);
  // Fallback only when Streak gives us no touchpoint data at all.
  return best || ts(b.lastUpdatedTimestamp);
}

export function emailTotals(b: AnyBox): { total: number; sent: number; received: number } {
  const n = (v: unknown) => { const x = Number(v); return isNaN(x) || x < 0 ? 0 : x; };
  return {
    total:    n(b.totalNumberOfEmails),
    sent:     n(b.totalNumberOfSentEmails),
    received: n(b.totalNumberOfReceivedEmails),
  };
}

// ── Core computation ──────────────────────────────────────────────────────
const DAY = 86_400_000;

function fmtLabel(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function round1(n: number): number { return Math.round(n * 10) / 10; }

function statusFor(changePct: number | null): MomentumStatus {
  if (changePct === null)          return "no-baseline";
  if (changePct <= SLOWING_PCT)    return "slowing";
  if (changePct <= SOFTENING_PCT)  return "softening";
  if (changePct >= 10)             return "growing";
  return "steady";
}

const LABELS: Record<MomentumKey, string> = {
  leads:        "New leads",
  interactions: "Interactions",
  moves:        "Stage moves",
};

export function computeMomentum(boxes: StreakBox[], now = Date.now(), excludeStageKeys: Set<string> = new Set()): Momentum {
  // Window i (0 = most recent) covers [now - (i+1)*7d, now - i*7d)
  const weeks: MomentumWeek[] = [];
  for (let i = MOMENTUM_WEEKS - 1; i >= 0; i--) {
    const end   = now - i * 7 * DAY;
    const start = end - 7 * DAY;
    weeks.push({
      start: new Date(start).toISOString().slice(0, 10),
      end:   new Date(end).toISOString().slice(0, 10),
      label: fmtLabel(start),
      leads: 0, interactions: 0, moves: 0,
    });
  }
  const windowStart = now - MOMENTUM_WEEKS * 7 * DAY;
  const idx = (t: number) => {
    if (!t || t < windowStart || t >= now) return -1;
    return MOMENTUM_WEEKS - 1 - Math.floor((now - t) / (7 * DAY));
  };

  let lastLead = 0, lastTouch = 0, lastMove = 0;
  for (const raw of boxes) {
    const b = raw as AnyBox;
    const c = createdAt(b);
    const t = lastTouchAt(b);
    const m = lastMoveAt(b);
    lastLead  = Math.max(lastLead,  c);
    lastTouch = Math.max(lastTouch, t);
    lastMove  = Math.max(lastMove,  m);

    const ci = idx(c); if (ci >= 0) weeks[ci].leads++;
    // Recycled / lost leads don't count as live interactions
    const removed = b.stageKey ? excludeStageKeys.has(b.stageKey) : false;
    const ti = idx(t); if (ti >= 0 && !removed) weeks[ti].interactions++;
    const mi = idx(m); if (mi >= 0) weeks[mi].moves++;
  }

  const daysSince = (t: number) => (t > 0 ? Math.max(0, Math.floor((now - t) / DAY)) : null);
  return summarizeMomentum(weeks, {
    leads: daysSince(lastLead), interactions: daysSince(lastTouch), moves: daysSince(lastMove),
  }, now);
}

/** Turn a weekly series into metrics, verdict and asks. Also used for demo data. */
export function summarizeMomentum(
  weeks: MomentumWeek[],
  daysSinceLastOf: Record<MomentumKey, number | null>,
  now = Date.now(),
): Momentum {

  const metrics: MomentumMetric[] = (["leads", "interactions", "moves"] as MomentumKey[]).map((key) => {
    const series = weeks.map((w) => w[key]);
    const recent = series.slice(-RECENT_WEEKS);
    const before = series.slice(0, -RECENT_WEEKS);
    const recentPerWeek = recent.reduce((s, x) => s + x, 0) / RECENT_WEEKS;
    const normalPerWeek = before.length ? before.reduce((s, x) => s + x, 0) / before.length : 0;
    const changePct = normalPerWeek > 0 ? Math.round(((recentPerWeek - normalPerWeek) / normalPerWeek) * 100) : null;
    return {
      key,
      label:         LABELS[key],
      recentPerWeek: round1(recentPerWeek),
      normalPerWeek: round1(normalPerWeek),
      lastWeek:      series[series.length - 1],
      changePct,
      status:        statusFor(changePct),
      gapPerWeek:    Math.max(0, Math.ceil(normalPerWeek - recentPerWeek)),
      daysSinceLast: daysSinceLastOf[key],
    };
  });

  const rank: Record<MomentumStatus, number> = { slowing: 0, softening: 1, "no-baseline": 2, steady: 3, growing: 4 };
  const overall = metrics.map((m) => m.status).sort((a, b) => rank[a] - rank[b])[0];

  const slow = metrics.filter((m) => m.status === "slowing" || m.status === "softening");
  let headline: string;
  if (slow.length === 0) {
    headline = overall === "growing"
      ? "Momentum is up — the last 4 weeks are ahead of your normal pace."
      : "Momentum is holding — the last 4 weeks are in line with your normal pace.";
  } else {
    const parts = slow.map((m) => `${m.label.toLowerCase()} ${m.changePct}%`);
    headline = `The pipeline is slowing down: ${parts.join(", ")} vs your normal pace.`;
  }

  const actions: string[] = [];
  for (const m of metrics) {
    if (m.status !== "slowing" && m.status !== "softening") continue;
    if (m.key === "leads") {
      actions.push(`Add ${m.gapPerWeek} more new lead${m.gapPerWeek === 1 ? "" : "s"} per week to get back to ${m.normalPerWeek}/week` +
        (m.daysSinceLast !== null && m.daysSinceLast >= 7 ? ` — no new lead in ${m.daysSinceLast} days.` : "."));
    } else if (m.key === "interactions") {
      actions.push(`Touch ${m.gapPerWeek} more lead${m.gapPerWeek === 1 ? "" : "s"} per week (email, call or meeting) to get back to ${m.normalPerWeek}/week.`);
    } else {
      actions.push(`Move ${m.gapPerWeek} more lead${m.gapPerWeek === 1 ? "" : "s"} forward a stage per week to get back to ${m.normalPerWeek}/week` +
        (m.daysSinceLast !== null && m.daysSinceLast >= 7 ? ` — nothing has moved in ${m.daysSinceLast} days.` : "."));
    }
  }

  return { generatedAt: new Date(now).toISOString(), weeks, metrics, overall, headline, actions };
}

// ── Exact email activity from daily snapshots ─────────────────────────────
// Snapshot = per-box email totals on a given day. Emails exchanged between two
// snapshots = sum over boxes of the increase in their totals (boxes that were
// deleted or moved out are ignored, so counts never go negative).

export interface EmailSnapshot {
  date: string;   // YYYY-MM-DD
  boxes: Record<string, [number, number, number]>;   // key → [total, sent, received]
}

export function buildSnapshot(boxes: StreakBox[], now = Date.now()): EmailSnapshot {
  const out: EmailSnapshot = { date: new Date(now).toISOString().slice(0, 10), boxes: {} };
  for (const raw of boxes) {
    const e = emailTotals(raw as AnyBox);
    out.boxes[raw.key] = [e.total, e.sent, e.received];
  }
  return out;
}

export function emailsBetween(older: EmailSnapshot, newer: EmailSnapshot): { total: number; sent: number; received: number } {
  let total = 0, sent = 0, received = 0;
  for (const [key, cur] of Object.entries(newer.boxes)) {
    const prev = older.boxes[key];
    if (!prev) {
      // box added since the older snapshot — count all of its emails? No:
      // its history predates the window. Count nothing for safety.
      continue;
    }
    total    += Math.max(0, cur[0] - prev[0]);
    sent     += Math.max(0, cur[1] - prev[1]);
    received += Math.max(0, cur[2] - prev[2]);
  }
  return { total, sent, received };
}
