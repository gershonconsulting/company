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
  stageName: string;
  count: number;
  isClosing: boolean;
  isRemoved: boolean;
}

export interface PipelineAnalytics {
  monthlyHighIntake:     MonthlyTrend[];
  monthlyAllIntake:      MonthlyTrend[];   // NEW: every new lead per month
  monthlyReachedClosing: MonthlyTrend[];
  monthlyRemoved:        MonthlyTrend[];   // NEW: leads moved to recycled/lost/archived per month
  staleLeads:            StaleLead[];
  staleLeadsTotal:       number;
  hotLeads:              HotLead[];
  funnel:                FunnelStage[];
  totalLeads:            number;
  closingStageNames:     string[];
  removedStageNames:     string[];         // NEW: stage names treated as "removed"
  staleThresholdDays:    number;
  monthsConsidered:      number;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function monthOf(ts: number | undefined | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const yr = d.getUTCFullYear();
  const mn = String(d.getUTCMonth() + 1).padStart(2, "0");
  return yr + "-" + mn;
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const yr = d.getUTCFullYear();
    const mn = String(d.getUTCMonth() + 1).padStart(2, "0");
    out.push(yr + "-" + mn);
  }
  return out;
}

function priorityLabel(box: StreakBox, mapping: PriorityFieldMapping): "High" | "Medium" | "Low" | "Unset" {
  let val: string | number | null | undefined;
  if (mapping.fieldKey) {
    val = (box.fields ?? {})[mapping.fieldKey] as string | number | null | undefined;
  } else {
    val = box.priority;
  }
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
      if (v && typeof v === "object" && "name" in v) map.set(k, (v as { name?: string }).name ?? k);
    }
  }
  return map;
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

  const months    = lastNMonths(MONTHS_BACK);
  const monthSet  = new Set(months);
  const highMap   = new Map<string, number>(months.map((m) => [m, 0] as const));
  const allMap    = new Map<string, number>(months.map((m) => [m, 0] as const));
  const closeMap  = new Map<string, number>(months.map((m) => [m, 0] as const));
  const removedMap = new Map<string, number>(months.map((m) => [m, 0] as const));
  const stageCounts = new Map<string, number>();

  const now         = Date.now();
  const staleCutoff = now - STALE_DAYS * 86400 * 1000;
  const stale: StaleLead[] = [];
  const hot: HotLead[]     = [];

  for (const rawBox of boxes) {
    const box = rawBox as StreakBox & BoxWithTimestamps;
    const pri = priorityLabel(box, mapping);
    const createdMonth     = monthOf(box.creationTimestamp ?? box.lastSavedTimestamp);
    const stageChangeMonth = monthOf(box.lastStageChangeTimestamp ?? box.lastUpdatedTimestamp);

    if (monthSet.has(createdMonth)) {
      allMap.set(createdMonth, (allMap.get(createdMonth) ?? 0) + 1);
      if (pri === "High") {
        highMap.set(createdMonth, (highMap.get(createdMonth) ?? 0) + 1);
      }
    }

    if (box.stageKey && closingStageKeys.has(box.stageKey) && monthSet.has(stageChangeMonth)) {
      closeMap.set(stageChangeMonth, (closeMap.get(stageChangeMonth) ?? 0) + 1);
    }

    if (box.stageKey && removedStageKeys.has(box.stageKey) && monthSet.has(stageChangeMonth)) {
      removedMap.set(stageChangeMonth, (removedMap.get(stageChangeMonth) ?? 0) + 1);
    }

    if (box.stageKey) {
      stageCounts.set(box.stageKey, (stageCounts.get(box.stageKey) ?? 0) + 1);
    }

    const lastUpd  = box.lastUpdatedTimestamp ?? 0;
    const inClose  = box.stageKey ? closingStageKeys.has(box.stageKey) : false;
    if (lastUpd > 0 && lastUpd < staleCutoff && !inClose) {
      stale.push({
        key:          box.key,
        name:         box.name ?? "(unnamed)",
        stageName:    stageMap.get(box.stageKey ?? "") ?? "Unknown",
        priority:     pri,
        daysInactive: Math.floor((now - lastUpd) / (86400 * 1000)),
        lastUpdated:  new Date(lastUpd).toISOString(),
      });
    }

    if (pri === "High" && lastUpd > 0) {
      hot.push({
        key:            box.key,
        name:           box.name ?? "(unnamed)",
        stageName:      stageMap.get(box.stageKey ?? "") ?? "Unknown",
        daysSinceTouch: Math.floor((now - lastUpd) / (86400 * 1000)),
      });
    }
  }

  stale.sort((a, b) => b.daysInactive - a.daysInactive);
  hot.sort((a, b) => a.daysSinceTouch - b.daysSinceTouch);

  // Build funnel in stage-map insertion order, with closing + removed stages flagged
  const funnel: FunnelStage[] = [];
  for (const [stageKey, stageName] of stageMap) {
    funnel.push({
      stageKey,
      stageName,
      count:     stageCounts.get(stageKey) ?? 0,
      isClosing: closingStageKeys.has(stageKey),
      isRemoved: removedStageKeys.has(stageKey),
    });
  }

  return {
    monthlyHighIntake:     months.map((m) => ({ month: m, count: highMap.get(m)     ?? 0 })),
    monthlyAllIntake:      months.map((m) => ({ month: m, count: allMap.get(m)      ?? 0 })),
    monthlyReachedClosing: months.map((m) => ({ month: m, count: closeMap.get(m)    ?? 0 })),
    monthlyRemoved:        months.map((m) => ({ month: m, count: removedMap.get(m)  ?? 0 })),
    staleLeads:            stale.slice(0, STALE_LEAD_LIMIT),
    staleLeadsTotal:       stale.length,
    hotLeads:              hot.slice(0, HOT_LEAD_LIMIT),
    funnel,
    totalLeads:            boxes.length,
    closingStageNames,
    removedStageNames,
    staleThresholdDays:    STALE_DAYS,
    monthsConsidered:      MONTHS_BACK,
  };
}
