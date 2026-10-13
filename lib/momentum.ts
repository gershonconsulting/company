// Momentum — "are we slowing down?"
//
// Answers three questions with rolling 7-day windows (not calendar months, so a
// half-finished month never hides or exaggerates a slowdown):
//   1. Leads         — how many new leads entered the pipeline
//   2. Interactions  — how many leads had a real touchpoint (email / call / meeting)
//   3. Moves         — how many leads changed stage
//
// For each metric we compare the last 4 weeks' weekly average to a TARGET pace:
// your best 13-week stretch of the past year (so a slow summer can never become
// the new "normal"). We also show the 6-month average for context, and turn the
// gap into a plain-English ask: "add N leads / week to get back to target".
//
// Pure functions only — safe on the edge runtime and in the browser.

import type { StreakBox } from "./streak";

export const HISTORY_WEEKS    = 52;   // weeks computed (for the best-quarter target)
export const MOMENTUM_WEEKS   = 26;   // weeks of history shown
export const RECENT_WEEKS     = 4;    // "now" window
export const BEST_WINDOW      = 13;   // a quarter
export const SLOWING_PCT      = -25;  // ≤ this vs target → red
export const SOFTENING_PCT    = -10;  // ≤ this vs target → amber
export const COVERAGE_TARGET  = 50;   // % of live leads that should be touched every 30 days
export const DRY_SPELL_DAYS   = 10;   // no new lead for this long → slowing, whatever the averages say

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
  normalPerWeek:  number;   // avg / week over the shown history before the recent window (~6 months)
  targetPerWeek:  number;   // best 13-week average of the past year
  targetFrom:     string | null;   // start date of that best quarter
  lastWeek:       number;   // most recent 7 days
  changePct:      number | null;   // recent vs target, null when no target
  changeVsNormalPct: number | null;
  status:         MomentumStatus;
  gapPerWeek:     number;   // how many more / week to reach target (0 if on target)
  reliable:       boolean;  // false when the data source is a weak proxy
  coverage?:      { touched7: number; touched30: number; live: number; pct30: number; targetPct: number };
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
  sources?:     { boxes: number; withEmailTimestamps: number; withTouchpoint: number; usingUpdatedFallback: number; sampleKeys: string[] };
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

function hasEmailTs(b: AnyBox): boolean {
  return !!(ts(b.lastEmailSentTimestamp) || ts(b.lastEmailReceivedTimestamp) || ts(b.lastEmailUpdatedTimestamp)
    || ts(b.mostRecentCallLogTimestamp) || ts(b.mostRecentMeetingNotesTimestamp));
}

export function computeMomentum(boxes: StreakBox[], now = Date.now(), excludeStageKeys: Set<string> = new Set()): Momentum {
  // Window i (0 = most recent) covers [now - (i+1)*7d, now - i*7d)
  const weeks: MomentumWeek[] = [];
  for (let i = HISTORY_WEEKS - 1; i >= 0; i--) {
    const end   = now - i * 7 * DAY;
    const start = end - 7 * DAY;
    weeks.push({
      start: new Date(start).toISOString().slice(0, 10),
      end:   new Date(end).toISOString().slice(0, 10),
      label: fmtLabel(start),
      leads: 0, interactions: 0, moves: 0,
    });
  }
  const windowStart = now - HISTORY_WEEKS * 7 * DAY;
  const idx = (t: number) => {
    if (!t || t < windowStart || t >= now) return -1;
    return HISTORY_WEEKS - 1 - Math.floor((now - t) / (7 * DAY));
  };

  let lastLead = 0, lastTouch = 0, lastMove = 0;
  let withEmail = 0, withTouchpoint = 0, fallback = 0;
  let live = 0, touched7 = 0, touched30 = 0;
  for (const raw of boxes) {
    const b = raw as AnyBox;
    const c = createdAt(b);
    const m = lastMoveAt(b);
    const email = hasEmailTs(b);
    const tp    = ts(b.lastTouchpointTimestamp) > 0;
    if (email) withEmail++;
    if (tp) withTouchpoint++;
    // Only count real touches — never bulk-edit timestamps
    const t = email || tp ? lastTouchAt(b) : 0;
    if (!email && !tp) fallback++;

    lastLead  = Math.max(lastLead,  c);
    lastTouch = Math.max(lastTouch, t);
    lastMove  = Math.max(lastMove,  m);

    const ci = idx(c); if (ci >= 0) weeks[ci].leads++;
    const removed = b.stageKey ? excludeStageKeys.has(b.stageKey) : false;
    if (!removed) {
      live++;
      if (t && now - t <= 7 * DAY)  touched7++;
      if (t && now - t <= 30 * DAY) touched30++;
    }
    const ti = idx(t); if (ti >= 0 && !removed) weeks[ti].interactions++;
    const mi = idx(m); if (mi >= 0) weeks[mi].moves++;
  }

  const daysSince = (t: number) => (t > 0 ? Math.max(0, Math.floor((now - t) / DAY)) : null);
  const reliableTouch = boxes.length > 0 && (withEmail + withTouchpoint) / boxes.length >= 0.3;
  const out = summarizeMomentum(weeks, {
    leads: daysSince(lastLead), interactions: reliableTouch ? daysSince(lastTouch) : null, moves: daysSince(lastMove),
  }, now, { interactions: reliableTouch }, { touched7, touched30, live });
  out.sources = {
    boxes: boxes.length,
    withEmailTimestamps: withEmail,
    withTouchpoint,
    usingUpdatedFallback: fallback,
    sampleKeys: boxes[0] ? Object.keys(boxes[0]).sort() : [],
  };
  return out;
}

/** Turn a weekly series (oldest → newest, up to HISTORY_WEEKS) into metrics, verdict and asks. */
export function summarizeMomentum(
  allWeeks: MomentumWeek[],
  daysSinceLastOf: Record<MomentumKey, number | null>,
  now = Date.now(),
  reliableOf: Partial<Record<MomentumKey, boolean>> = {},
  cov?: { touched7: number; touched30: number; live: number },
): Momentum {
  const shown = allWeeks.slice(-MOMENTUM_WEEKS);

  const metrics: MomentumMetric[] = (["leads", "interactions", "moves"] as MomentumKey[]).map((key) => {
    const all    = allWeeks.map((w) => w[key]);
    const series = shown.map((w) => w[key]);
    const recent = series.slice(-RECENT_WEEKS);
    const before = series.slice(0, -RECENT_WEEKS);
    const recentPerWeek = recent.reduce((s, x) => s + x, 0) / RECENT_WEEKS;
    const normalPerWeek = before.length ? before.reduce((s, x) => s + x, 0) / before.length : 0;

    // Best quarter: highest 13-week rolling average across the whole history
    let best = 0, bestIdx = -1;
    for (let i = 0; i + BEST_WINDOW <= all.length; i++) {
      const avg = all.slice(i, i + BEST_WINDOW).reduce((s, x) => s + x, 0) / BEST_WINDOW;
      if (avg > best) { best = avg; bestIdx = i; }
    }
    const target = Math.max(best, normalPerWeek);
    const changePct = target > 0 ? Math.round(((recentPerWeek - target) / target) * 100) : null;
    const changeVsNormalPct = normalPerWeek > 0 ? Math.round(((recentPerWeek - normalPerWeek) / normalPerWeek) * 100) : null;
    let status = statusFor(changePct);
    const days = daysSinceLastOf[key];
    if (key === "leads" && days !== null && days >= DRY_SPELL_DAYS) status = "slowing";
    const reliable = reliableOf[key] ?? true;
    // Interactions: a "latest touch" history always leans recent, so judge it on
    // coverage instead — what share of live leads got a real touch in 30 days.
    let coverage: MomentumMetric["coverage"];
    let gap = Math.max(0, Math.ceil(target - recentPerWeek));
    let pct: number | null = changePct;
    if (key === "interactions" && cov && cov.live > 0) {
      const pct30 = Math.round((cov.touched30 / cov.live) * 100);
      coverage = { ...cov, pct30, targetPct: COVERAGE_TARGET };
      status = pct30 >= COVERAGE_TARGET ? "steady" : pct30 >= COVERAGE_TARGET - 15 ? "softening" : "slowing";
      gap = Math.max(0, Math.ceil((COVERAGE_TARGET / 100) * cov.live - cov.touched30));
      pct = null;
    }
    return {
      coverage,
      key,
      label:         LABELS[key],
      recentPerWeek: round1(recentPerWeek),
      normalPerWeek: round1(normalPerWeek),
      targetPerWeek: round1(target),
      targetFrom:    bestIdx >= 0 ? allWeeks[bestIdx].start : null,
      lastWeek:      series[series.length - 1] ?? 0,
      changePct: pct,
      changeVsNormalPct,
      status:        reliable ? status : "no-baseline",
      gapPerWeek:    gap,
      daysSinceLast: days,
      reliable,
    };
  });

  const rank: Record<MomentumStatus, number> = { slowing: 0, softening: 1, steady: 2, growing: 3, "no-baseline": 4 };
  const counted = metrics.filter((m) => m.reliable);
  const overall = (counted.length ? counted : metrics).map((m) => m.status).sort((a, b) => rank[a] - rank[b])[0];

  const slow = counted.filter((m) => m.status === "slowing" || m.status === "softening");
  let headline: string;
  if (slow.length === 0) {
    headline = overall === "growing"
      ? "Momentum is up — the last 4 weeks beat your best quarter of the year."
      : "Momentum is holding — the last 4 weeks are close to your best quarter of the year.";
  } else {
    const parts = slow.map((m) => {
      const lead = m.key === "leads" && m.daysSinceLast !== null && m.daysSinceLast >= DRY_SPELL_DAYS
        ? ` (none in ${m.daysSinceLast} days)` : "";
      if (m.coverage) return `only ${m.coverage.pct30}% of leads touched in 30 days`;
      return `${m.label.toLowerCase()} ${m.changePct !== null ? `${m.changePct}%` : ""}${lead}`.trim();
    });
    headline = `We are slowing down — ${parts.join(", ")}.`;
  }

  const actions: string[] = [];
  for (const m of counted) {
    if (m.status !== "slowing" && m.status !== "softening") continue;
    const n = Math.max(1, m.gapPerWeek);
    if (m.key === "leads") {
      actions.push(`More leads: add ${n} new lead${n === 1 ? "" : "s"} per week to get back to ${m.targetPerWeek}/week` +
        (m.daysSinceLast !== null && m.daysSinceLast >= 7 ? ` — no new lead in ${m.daysSinceLast} days.` : "."));
    } else if (m.key === "interactions") {
      actions.push(m.coverage
        ? `More interactions: touch ${n} more lead${n === 1 ? "" : "s"} in the next 30 days (email, call or meeting) to have ${m.coverage.targetPct}% of the pipeline worked — today ${m.coverage.touched30} of ${m.coverage.live}.`
        : `More interactions: touch ${n} more lead${n === 1 ? "" : "s"} per week (email, call or meeting) to reach ${m.targetPerWeek}/week.`);
    } else {
      actions.push(`More moves: move ${n} more lead${n === 1 ? "" : "s"} forward a stage per week to reach ${m.targetPerWeek}/week` +
        (m.daysSinceLast !== null && m.daysSinceLast >= 7 ? ` — nothing has moved in ${m.daysSinceLast} days.` : "."));
    }
  }

  return { generatedAt: new Date(now).toISOString(), weeks: shown, metrics, overall, headline, actions };
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
