export interface PeriodData {
  label: string;
  week: string; // e.g. "W14", "W13" …
  totalLeads: number;
  high: number;
  medium: number;
  low: number;
  nextDueDateOnTime: number; // % of leads with next due date set
}

export interface ObjectiveConfig {
  highMin: number;
  mediumMin: number;
  lowMax: number;
  nextDueDateTarget: number;
  highLeadsTarget: number;
  mediumLeadsMax: number;
}

export const OBJECTIVES: ObjectiveConfig = {
  highMin: 40,
  mediumMin: 10,
  lowMax: 50,
  nextDueDateTarget: 50,
  highLeadsTarget: 10,
  mediumLeadsMax: 50,
};

// 8 weeks of history — oldest first, current last
export const weeklyHistory: PeriodData[] = [
  { label: "W7",  week: "W7",  totalLeads: 265, high: 58,  medium: 34, low: 173, nextDueDateOnTime: 29 },
  { label: "W8",  week: "W8",  totalLeads: 271, high: 66,  medium: 29, low: 176, nextDueDateOnTime: 33 },
  { label: "W9",  week: "W9",  totalLeads: 280, high: 81,  medium: 36, low: 163, nextDueDateOnTime: 36 },
  { label: "W10", week: "W10", totalLeads: 289, high: 95,  medium: 28, low: 166, nextDueDateOnTime: 40 },
  { label: "W11", week: "W11", totalLeads: 293, high: 102, medium: 30, low: 161, nextDueDateOnTime: 43 },
  { label: "W12", week: "W12", totalLeads: 301, high: 108, medium: 38, low: 155, nextDueDateOnTime: 46 },
  { label: "W13", week: "W13", totalLeads: 298, high: 104, medium: 22, low: 172, nextDueDateOnTime: 41 },
  { label: "W14", week: "W14", totalLeads: 312, high: 138, medium: 58, low: 116, nextDueDateOnTime: 53 },
];

// Convenience aliases
export const currentData   = weeklyHistory[weeklyHistory.length - 1];
export const lastWeekData  = weeklyHistory[weeklyHistory.length - 2];
export const lastYearData: PeriodData = {
  label: "Last Year", week: "LY",
  totalLeads: 278, high: 83, medium: 47, low: 148, nextDueDateOnTime: 38,
};

// ── helpers ────────────────────────────────────────────────────────────────

export function getPct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 10) / 10;
}
export const getHighPct   = (d: PeriodData) => getPct(d.high,   d.totalLeads) * 100;
export const getMediumPct = (d: PeriodData) => getPct(d.medium, d.totalLeads) * 100;
export const getLowPct    = (d: PeriodData) => getPct(d.low,    d.totalLeads) * 100;

export type ObjectiveKey =
  | "highPriority"
  | "mediumPriority"
  | "lowPriority"
  | "nextDueDate"
  | "highLeads"
  | "mediumLeads";

export interface ObjectiveResult {
  value: number;
  target: string;
  met: boolean;
}

export function checkObjectives(d: PeriodData): Record<ObjectiveKey, ObjectiveResult> {
  const highPct   = getHighPct(d);
  const mediumPct = getMediumPct(d);
  const lowPct    = getLowPct(d);

  return {
    highPriority:   { value: highPct,               target: `> ${OBJECTIVES.highMin}%`,           met: highPct   > OBJECTIVES.highMin },
    mediumPriority: { value: mediumPct,             target: `> ${OBJECTIVES.mediumMin}%`,         met: mediumPct > OBJECTIVES.mediumMin },
    lowPriority:    { value: lowPct,                target: `< ${OBJECTIVES.lowMax}%`,            met: lowPct    < OBJECTIVES.lowMax },
    nextDueDate:    { value: d.nextDueDateOnTime,   target: `≥ ${OBJECTIVES.nextDueDateTarget}%`, met: d.nextDueDateOnTime >= OBJECTIVES.nextDueDateTarget },
    highLeads:      { value: highPct,               target: `≥ ${OBJECTIVES.highLeadsTarget}%`,   met: highPct   >= OBJECTIVES.highLeadsTarget },
    mediumLeads:    { value: mediumPct,             target: `< ${OBJECTIVES.mediumLeadsMax}%`,    met: mediumPct <  OBJECTIVES.mediumLeadsMax },
  };
}

/** Returns the met/not-met boolean for each week, oldest → newest */
export function objectiveHistory(key: ObjectiveKey): boolean[] {
  return weeklyHistory.map((w) => checkObjectives(w)[key].met);
}

/** Consecutive streak of met weeks ending on the most recent week */
export function currentStreak(key: ObjectiveKey): number {
  const hist = objectiveHistory(key);
  let streak = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    if (hist[i]) streak++;
    else break;
  }
  return streak;
}
