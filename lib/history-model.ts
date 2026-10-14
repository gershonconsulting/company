// ─────────────────────────────────────────────────────────────────────────────
// Retention and opportunity projections built on HISTORY_BENCHMARKS.
// Pure functions, shared by client.gershonCRM and company.gershonCRM.
// ─────────────────────────────────────────────────────────────────────────────
import { HISTORY_BENCHMARKS as B } from './history-benchmarks'

/** Share of clients still with us after `m` months (Kaplan–Meier step curve). */
export function survivalAt(m: number): number {
  let s = 1
  for (const [t, v] of B.survivalCurve) { if (t <= m) s = v; else break }
  return s
}

// Few clients have stayed beyond ~3 years, so the curve goes flat there and
// would claim long-standing clients never leave. Keep at least the monthly
// churn observed between 12 and 36 months (≈4% a month) as a floor.
const TAIL_MONTHLY_CHURN = (() => {
  const a = survivalAt(12), b = survivalAt(36)
  return a > 0 && b > 0 ? 1 - Math.pow(b / a, 1 / 24) : 0.03
})()

/** Chance a client that has been with us `tenure` months is still with us `more` months later. */
export function stayProbability(tenure: number, more: number): number {
  const t = Math.max(0, tenure)
  const now = survivalAt(t)
  if (now <= 0) return 0
  const fromCurve = Math.min(1, survivalAt(t + more) / now)
  const floor = Math.pow(1 - TAIL_MONTHLY_CHURN, more)
  return t >= 12 ? Math.min(fromCurve, floor) : fromCurve
}

/** Expected months still to come within the next `horizon` months, given tenure. */
export function expectedMonthsAhead(tenure: number, horizon = 12): number {
  let e = 0
  for (let k = 1; k <= horizon; k++) e += stayProbability(tenure, k)
  return Math.round(e * 10) / 10
}

/** Expected total lifetime (months) of a client that has already been with us `tenure` months. */
export function expectedLifetime(tenure: number, horizon = 60): number {
  return Math.round((tenure + expectedMonthsAhead(tenure, horizon)) * 10) / 10
}

export interface MonthPoint { month: string; sent: number; accepted: number; opportunities: number; live: boolean; partial?: boolean }

export interface ClientProjection {
  tenureMonths: number | null
  monthsWithData: number
  totalOpportunities: number
  avgPerMonth: number
  last3Avg: number | null
  vsBenchmarkPct: number | null        // last-3-month pace vs the historical average client-month
  stay3: number | null; stay6: number | null; stay12: number | null
  expectedMonthsNext12: number | null
  expectedLifetime: number | null
  next3RunRate: number                  // if the client stays and keeps this pace
  next3Expected: number                 // weighted by the chance the client stays
  next12Expected: number
  basis: 'run-rate' | 'ramp' | 'blend' | 'inactive' | 'none'
  lastDataMonth: string | null
  series: MonthPoint[]
}

const monthsBetween = (a: string, b: string) => {
  const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma)
}
const r1 = (v: number) => Math.round(v * 10) / 10

/**
 * Project a client from its monthly series.
 * `start` is the contract (or first campaign) month, `today` is YYYY-MM-DD.
 */
export function projectClient(start: string | null, series: MonthPoint[], today: string): ClientProjection {
  const cur = today.slice(0, 7)
  const tenure = start ? Math.max(0, monthsBetween(start.slice(0, 7), cur) + (Number(today.slice(8, 10)) - 1) / 30) : null
  const withData = series.filter(p => p.sent > 0 || p.accepted > 0 || p.opportunities > 0)
  const full = withData.filter(p => !p.partial)
  const total = withData.reduce((a, p) => a + p.opportunities, 0)
  const last3 = full.slice(-3)
  const last3Avg = last3.length ? last3.reduce((a, p) => a + p.opportunities, 0) / last3.length : null

  // Pace per future month: own run-rate once 3 full months exist, the
  // historical ramp before that, a blend in between.
  const campaignMonth = full.length // months already run
  const ramp = (i: number) => B.rampOppsByMonth[Math.min(B.rampOppsByMonth.length - 1, i)] ?? B.oppsPerClientMonthMean
  const pace = (k: number) => {
    const ownW = Math.min(1, full.length / 3)
    const own = last3Avg ?? 0
    return ownW * own + (1 - ownW) * ramp(campaignMonth + k - 1)
  }
  const lastDataMonth = withData.length ? withData[withData.length - 1].month : null
  // No Straight-in report for 3+ months = no running campaign: project nothing.
  const inactive = lastDataMonth != null && monthsBetween(lastDataMonth, cur) > 3
  const basis: ClientProjection['basis'] = inactive ? 'inactive' : tenure == null && !withData.length ? 'none'
    : full.length >= 3 ? 'run-rate' : full.length === 0 ? 'ramp' : 'blend'
  const t = tenure ?? 0
  let next3RunRate = 0, next3Expected = 0, next12Expected = 0
  for (let k = 1; k <= 12 && basis !== 'inactive' && basis !== 'none'; k++) {
    const p = pace(k), stay = stayProbability(t, k)
    if (k <= 3) { next3RunRate += p; next3Expected += p * stay }
    next12Expected += p * stay
  }
  return {
    tenureMonths: tenure == null ? null : r1(tenure),
    monthsWithData: withData.length,
    totalOpportunities: total,
    avgPerMonth: withData.length ? r1(total / withData.length) : 0,
    last3Avg: last3Avg == null ? null : r1(last3Avg),
    vsBenchmarkPct: last3Avg == null ? null : Math.round((last3Avg / B.oppsPerClientMonthMean) * 100),
    stay3: tenure == null ? null : Math.round(stayProbability(t, 3) * 100),
    stay6: tenure == null ? null : Math.round(stayProbability(t, 6) * 100),
    stay12: tenure == null ? null : Math.round(stayProbability(t, 12) * 100),
    expectedMonthsNext12: tenure == null ? null : expectedMonthsAhead(t, 12),
    expectedLifetime: tenure == null ? null : expectedLifetime(t),
    next3RunRate: Math.round(next3RunRate),
    next3Expected: Math.round(next3Expected),
    next12Expected: Math.round(next12Expected),
    basis,
    lastDataMonth,
    series,
  }
}

/** What a brand-new client is worth over its expected life, in opportunities and billed months. */
export function newClientOutlook(): { expectedMonths: number; expectedOpportunities: number; firstQuarterOpps: number; stay6: number; stay12: number } {
  let months = 0, opps = 0
  for (let k = 1; k <= 60; k++) {
    const s = survivalAt(k - 1)
    months += s
    opps += s * (B.rampOppsByMonth[Math.min(B.rampOppsByMonth.length - 1, k - 1)] ?? B.oppsPerClientMonthMean)
  }
  const fq = B.rampOppsByMonth.slice(0, 3).reduce((a, v) => a + v, 0)
  return { expectedMonths: r1(months), expectedOpportunities: Math.round(opps), firstQuarterOpps: Math.round(fq), stay6: Math.round(survivalAt(6) * 100), stay12: Math.round(survivalAt(12) * 100) }
}
