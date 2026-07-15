import type { StreakBox, PipelineSchema, PriorityFieldMapping } from "./streak";

// ── Configuration ─────────────────────────────────────────────────────────
const MONTHS_BACK             = 12;
const STALE_DAYS              = 90;
const HOT_LEAD_LIMIT          = 10;
const STALE_LEAD_LIMIT        = 50;
const CLOSING_STAGE_PATTERNS  = [/proposal/i, /negotiat/i, /closing/i];
const REMOVED_STAGE_PATTERNS  = [/recycl/i, /lost/i, /reject/i, /archiv/i, /dead/i];

// ── Types ──────────────────────────────────────────────────────────────────
export interface MonthlyTrend { month: string; count: number; }

export interface StaleLead {
  key: string;
  name: string;
  stageName: string;
  priority: "High" | "Medium" | "Low" | "Unset";
  daysInactive: number;
  lastUpdated: string;
}

export interface HotLead {
  key: string;
  name: string;
  stageName: string;
  daysSinceTouch: number;
}

export interface FunnelStage {
  stageKey: string;
  stageName: string;    // Kept verbatim from Streak, incl. leading numeric prefix
  order: number;        // Numeric prefix extracted for sorting (e.g. "5. Proposal Sent" -> 5)
  count: number;
  isClosing: boolean;
  isRemoved: boolean;
}

export type FreshnessBucket = "high" | "medium" | "low" | "stale" | "never";

export interface FreshnessCounts {
  high:   number;   // touched within last 7 days
  medium: number;   // 8-30 days
  low:    number;   // 31-90 days
  stale:  number;   // > 90 days
  never:  number;   // never touched
  total:  number;
}

export interface PipelineAnalytics {
  monthlyHighIntake:     MonthlyTrend[];
  monthlyAllIntake:      MonthlyTrend[];
  monthlyReachedClosing: MonthlyTrend[];
  monthlyRemoved:        MonthlyTrend[];
  staleLeads:            StaleLead[];
  staleLeadsTotal:       number;
  hotLeads:              HotLead[];
  funnel:                FunnelStage[];
  freshness:             FreshnessCounts;   // NEW
  totalLeads:            number;
  closingStageNames:     string[];
  removedStageNames:     string[];
  staleThresholdDays:    number;
  monthsConsidered:      number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function monthOf(ts: number | undefined | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"));
  }
  return out;
}

function priorityLabel(box: StreakBox, mapping: PriorityFieldMapping): "High" | "Medium" | "Low" | "Unset" {
  let val: string | number | null | undefined;
  if (mapping.fieldKey) val = (box.fields ?? {})[mapping.fieldKey] as string | number | null | undefined;
  else                  val = box.priority;
  if (val === null || val === undefined) return "Unset";
  if (mapping.high.has(val))   return "High";
  if (mapping.medium.has(val)) return "Medium";
  if (mapping.low.has(val))    return "Low";
  return "Unset";
}

interface PipelineWithStages extends PipelineSchema {
  stages?: Record<string, { name?: string }> | Array<{ key: string; name: string }>;
}

function buildStageMap(schema: PipelineSchema): Map<string, string> {
  const map = new Map<string, string>();
  const stages = (schema as PipelineWithStages).stages;
  if (Array.isArray(stages)) {
    for (const s of stages) map.set(s.key, s.name);
  } else if (stages && typeof stages === "object") {
    for (const [k, v] of Object.entries(stages)) {
      if (v && typeof v === "object" && "name" in v) {
        map.set(k, (v as { name?: string }).name ?? k);
      }
    }
  }
  return map;
}

// Extract the leading number from a Streak stage name so we can sort by
// intent order regardless of how the schema returns them.
// "5. Proposal Sent" -> 5, "Proposal Sent" -> Number.POSITIVE_INFINITY
export function extractStageOrder(name: string): number {
  const m = name.trim().match(/^(\d+)\s*[.)\-:]?/);
  return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
}

interface BoxWithTimestamps {
  creationTimestamp?: number;
  lastUpdatedTimestamp?: number;
  lastStageChangeTimestamp?: number;
  lastSavedTimestamp?: number;
}

// ── Main ───────────────────────────────────────────────────────────────────
export function computeAnalytics(
  boxes: StreakBox[],
  schema: PipelineSchema,
  mapping: PriorityFieldMapping,
): PipelineAnalytics {
  const stageMap          = buildStageMap(schema);
  const closingStageKeys  = new Set<string>();
  const closingStageNames: string[] = [];
  const removedStageKeys  = new Set<string>();
  const removedStageNames: string[] = [];
  for (const [key, name] of stageMap) {
    if (CLOSING_STAGE_PATTERNS.some((re) => re.test(name))) {
      closingStageKeys.add(key);
      closingStageNames.push(name);
    }
    if (REMOVED_STAGE_PATTERNS.some((re) => re.test(name))) {
      removedStageKeys.add(key);
      removedStageNames.push(name);
    }
  }

  const months     = lastNMonths(MONTHS_BACK);
  const monthSet   = new Set(months);
  const highMap    = new Map<string, number>(months.map((m) => [m, 0] as const));
  const allMap     = new Map<string, number>(months.map((m) => [m, 0] as const));
  const closeMap   = new Map<string, number>(months.map((m) => [m, 0] as const));
  const removedMap = new Map<string, number>(months.map((m) => [m, 0] as const));
  const stageCounts = new Map<string, number>();

  const now         = Date.now();
  const D           = 86400 * 1000;
  const staleCutoff = now - STALE_DAYS * D;
  const stale: StaleLead[] = [];
  const hot: HotLead[]     = [];

  const freshness: FreshnessCounts = { high: 0, medium: 0, low: 0, stale: 0, never: 0, total: 0 };

  for (const rawBox of boxes) {
    const box = rawBox as StreakBox & BoxWithTimestamps;
    const pri = priorityLabel(box, mapping);
    const createdMonth     = monthOf(box.creationTimestamp ?? box.lastSavedTimestamp);
    const stageChangeMonth = monthOf(box.lastStageChangeTimestamp ?? box.lastUpdatedTimestamp);

    if (monthSet.has(createdMonth)) {
      allMap.set(createdMonth, (allMap.get(createdMonth) ?? 0) + 1);
      if (pri === "High") highMap.set(createdMonth, (highMap.get(createdMonth) ?? 0) + 1);
    }

    if (box.stageKey && closingStageKeys.has(box.stageKey) && monthSet.has(stageChangeMonth)) {
      closeMap.set(stageChangeMonth, (closeMap.get(stageChangeMonth) ?? 0) + 1);
    }
    if (box.stageKey && removedStageKeys.has(box.stageKey) && monthSet.has(stageChangeMonth)) {
      removedMap.set(stageChangeMonth, (removedMap.get(stageChangeMonth) ?? 0) + 1);
    }
    if (box.stageKey) stageCounts.set(box.stageKey, (stageCounts.get(box.stageKey) ?? 0) + 1);

    const lastUpd = box.lastUpdatedTimestamp ?? 0;

    // Freshness bucketing
    freshness.total++;
    if (!lastUpd || lastUpd <= 0) freshness.never++;
    else {
      const days = (now - lastUpd) / D;
      if      (days <= 7)  freshness.high++;
      else if (days <= 30) freshness.medium++;
      else if (days <= 90) freshness.low++;
      else                 freshness.stale++;
    }

    const inClose = box.stageKey ? closingStageKeys.has(box.stageKey) : false;
    if (lastUpd > 0 && lastUpd < staleCutoff && !inClose) {
      stale.push({
        key:          box.key,
        name:         box.name ?? "(unnamed)",
        stageName:    stageMap.get(box.stageKey ?? "") ?? "Unknown",
        priority:     pri,
        daysInactive: Math.floor((now - lastUpd) / D),
        lastUpdated:  new Date(lastUpd).toISOString(),
      });
    }

    if (pri === "High" && lastUpd > 0) {
      hot.push({
        key:            box.key,
        name:           box.name ?? "(unnamed)",
        stageName:      stageMap.get(box.stageKey ?? "") ?? "Unknown",
        daysSinceTouch: Math.floor((now - lastUpd) / D),
      });
    }
  }

  stale.sort((a, b) => b.daysInactive - a.daysInactive);
  hot.sort((a, b) => a.daysSinceTouch - b.daysSinceTouch);

  // Build funnel and SORT by leading numeric prefix (Streak's stage order intent),
  // falling back to insertion order for stages without a prefix.
  const funnel: FunnelStage[] = [];
  let idx = 0;
  for (const [stageKey, stageName] of stageMap) {
    const orderPrefix = extractStageOrder(stageName);
    // If no prefix, keep insertion order by adding a fractional offset that sorts after prefixed ones
    const order = orderPrefix === Number.POSITIVE_INFINITY ? 1000 + idx : orderPrefix;
    funnel.push({
      stageKey,
      stageName,
      order,
      count:     stageCounts.get(stageKey) ?? 0,
      isClosing: closingStageKeys.has(stageKey),
      isRemoved: removedStageKeys.has(stageKey),
    });
    idx++;
  }
  funnel.sort((a, b) => a.order - b.order);

  return {
    monthlyHighIntake:     months.map((m) => ({ month: m, count: highMap.get(m)     ?? 0 })),
    monthlyAllIntake:      months.map((m) => ({ month: m, count: allMap.get(m)      ?? 0 })),
    monthlyReachedClosing: months.map((m) => ({ month: m, count: closeMap.get(m)    ?? 0 })),
    monthlyRemoved:        months.map((m) => ({ month: m, count: removedMap.get(m)  ?? 0 })),
    staleLeads:            stale.slice(0, STALE_LEAD_LIMIT),
    staleLeadsTotal:       stale.length,
    hotLeads:              hot.slice(0, HOT_LEAD_LIMIT),
    funnel,
    freshness,
    totalLeads:            boxes.length,
    closingStageNames,
    removedStageNames,
    staleThresholdDays:    STALE_DAYS,
    monthsConsidered:      MONTHS_BACK,
  };
}
