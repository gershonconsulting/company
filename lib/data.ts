export interface PeriodData {
  label: string;
  totalLeads: number;
  high: number;
  medium: number;
  low: number;
  nextDueDateOnTime: number; // % of leads with next due date set
}

export interface ObjectiveConfig {
  highMin: number;       // High must be > 40%
  mediumMin: number;     // Medium must be > 10%
  lowMax: number;        // Low must be < 50%
  nextDueDateTarget: number; // 50%
  highLeadsTarget: number;   // 10% of total leads in High
  mediumLeadsMax: number;    // < 50% for Medium
}

export const OBJECTIVES: ObjectiveConfig = {
  highMin: 40,
  mediumMin: 10,
  lowMax: 50,
  nextDueDateTarget: 50,
  highLeadsTarget: 10,
  mediumLeadsMax: 50,
};

export const currentData: PeriodData = {
  label: "This Week",
  totalLeads: 312,
  high: 138,    // 44.2% → above 40% ✓
  medium: 58,   // 18.6% → above 10% ✓
  low: 116,     // 37.2% → below 50% ✓
  nextDueDateOnTime: 53, // 53% → above 50% ✓
};

export const lastWeekData: PeriodData = {
  label: "Last Week",
  totalLeads: 298,
  high: 104,    // 34.9% → below 40% ✗
  medium: 22,   // 7.4% → below 10% ✗
  low: 172,     // 57.7% → above 50% ✗
  nextDueDateOnTime: 41, // 41% → below 50% ✗
};

export const lastYearData: PeriodData = {
  label: "Last Year",
  totalLeads: 278,
  high: 83,     // 29.9%
  medium: 47,   // 16.9%
  low: 148,     // 53.2%
  nextDueDateOnTime: 38,
};

export function getPct(count: number, total: number): number {
  return total === 0 ? 0 : Math.round((count / total) * 10) / 10;
}

export function getHighPct(d: PeriodData) {
  return getPct(d.high, d.totalLeads) * 100;
}
export function getMediumPct(d: PeriodData) {
  return getPct(d.medium, d.totalLeads) * 100;
}
export function getLowPct(d: PeriodData) {
  return getPct(d.low, d.totalLeads) * 100;
}

export type ObjectiveStatus = "met" | "not_met";

export function checkObjectives(d: PeriodData) {
  const highPct = getHighPct(d);
  const mediumPct = getMediumPct(d);
  const lowPct = getLowPct(d);

  return {
    highPriority: {
      value: highPct,
      target: `> ${OBJECTIVES.highMin}%`,
      met: highPct > OBJECTIVES.highMin,
    },
    mediumPriority: {
      value: mediumPct,
      target: `> ${OBJECTIVES.mediumMin}%`,
      met: mediumPct > OBJECTIVES.mediumMin,
    },
    lowPriority: {
      value: lowPct,
      target: `< ${OBJECTIVES.lowMax}%`,
      met: lowPct < OBJECTIVES.lowMax,
    },
    nextDueDate: {
      value: d.nextDueDateOnTime,
      target: `≥ ${OBJECTIVES.nextDueDateTarget}%`,
      met: d.nextDueDateOnTime >= OBJECTIVES.nextDueDateTarget,
    },
    highLeads: {
      value: d.high,
      target: `≥ ${OBJECTIVES.highLeadsTarget}% of total leads`,
      met: highPct >= OBJECTIVES.highLeadsTarget,
    },
    mediumLeads: {
      value: mediumPct,
      target: `< ${OBJECTIVES.mediumLeadsMax}%`,
      met: mediumPct < OBJECTIVES.mediumLeadsMax,
    },
  };
}
