// Impressive fake data for live demos.
// Used by the "Demo Mode" toggle in the sidebar. Numbers are designed to
// look like a healthy, growing pipeline so the platform demos well.

import type { PipelineAnalytics } from "@/components/analytics-shared";

export interface DemoBreakdown {
  total: number;
  high: number;
  medium: number;
  low: number;
  unset: number;
  nextDueDatePct: number;
  priorityFieldName: string | null;
}

// 12-month series ending at the CURRENT month
function last12Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"));
  }
  return out;
}

const months = last12Months();

// Monthly series — trending upward, with a strong recent month
const intakeCounts:    number[] = [42, 51, 48, 62, 70, 65, 78, 84, 81, 92, 87, 96];
const highCounts:      number[] = [ 8,  9, 10, 14, 16, 13, 18, 21, 19, 24, 22, 27];
const closingCounts:   number[] = [12, 15, 14, 18, 22, 19, 24, 28, 26, 32, 30, 36];
const removedCounts:   number[] = [ 4,  3,  5,  2,  3,  4,  2,  3,  4,  2,  3,  2];

const HOT_NAMES = [
  "Acme Industries", "Nimbus Robotics", "Polaris Logistics", "Helios Energy",
  "Verdant Foods", "Cascade Analytics", "Sterling Capital", "Vortex Mobility",
  "Halcyon Health", "Ironclad Defense", "Lumen Networks", "Atlas Manufacturing",
  "Crescent Banking", "Pivotal Pharma", "Quantum Insights", "Rivermark Estates",
  "Solstice Media", "Tessera Robotics", "Umbra Security", "Voyager Logistics",
  "Whitecliff Holdings", "Zenith Industries", "Aurora Biotech", "Bastion Federal",
  "Cobalt Materials",
];

const STALE_NAMES = [
  "Driftwood Holdings", "Embargo Trading", "Faded Star Studios",
  "Greyfield Industries", "Hollowpoint LLC", "Inertia Capital",
  "Junkyard Robotics", "Kiln Manufacturing", "Loophole Legal",
  "Mothballed Mfg", "Nullroad Logistics", "Obsidian Group",
  "Pendulum Securities", "Quiescent Labs",
];

const HOT_STAGES   = ["Negotiating", "Proposal Sent", "Closing", "Scheduled", "Pitched"];
const STALE_STAGES = ["Lead", "Contacted", "Scheduled", "Nurtering"];

export const DEMO_BREAKDOWN: DemoBreakdown = {
  total: 1247,
  high:   312,
  medium: 580,
  low:    335,
  unset:   20,
  nextDueDatePct: 71,
  priorityFieldName: "Priority",
};

export const DEMO_ANALYTICS: PipelineAnalytics = {
  monthlyHighIntake:     months.map((m, i) => ({ month: m, count: highCounts[i]    })),
  monthlyAllIntake:      months.map((m, i) => ({ month: m, count: intakeCounts[i]  })),
  monthlyReachedClosing: months.map((m, i) => ({ month: m, count: closingCounts[i] })),
  monthlyRemoved:        months.map((m, i) => ({ month: m, count: removedCounts[i] })),

  hotLeads: HOT_NAMES.slice(0, 10).map((name, i) => ({
    key:            "demo_hot_" + i,
    name,
    stageName:      HOT_STAGES[i % HOT_STAGES.length],
    daysSinceTouch: [0, 1, 2, 2, 3, 4, 5, 6, 7, 9][i],
  })),

  staleLeads: STALE_NAMES.map((name, i) => ({
    key:          "demo_stale_" + i,
    name,
    stageName:    STALE_STAGES[i % STALE_STAGES.length],
    priority:     (["High", "Medium", "Low", "Low", "Medium", "Low", "Low", "Medium", "Low", "Low", "Medium", "Low", "Low", "Medium"] as const)[i],
    daysInactive: 90 + i * 6,
    lastUpdated:  new Date(Date.now() - (90 + i * 6) * 86400_000).toISOString(),
  })),
  staleLeadsTotal: 14,

  funnel: [
    { stageKey: "s1", stageName: "Lead",          count:  87, isClosing: false, isRemoved: false },
    { stageKey: "s2", stageName: "Contacted",     count: 240, isClosing: false, isRemoved: false },
    { stageKey: "s3", stageName: "Qualified",     count: 195, isClosing: false, isRemoved: false },
    { stageKey: "s4", stageName: "Pitched",       count: 178, isClosing: false, isRemoved: false },
    { stageKey: "s5", stageName: "Negotiating",   count: 156, isClosing: true,  isRemoved: false },
    { stageKey: "s6", stageName: "Scheduled",     count:  78, isClosing: false, isRemoved: false },
    { stageKey: "s7", stageName: "Proposal Sent", count: 142, isClosing: true,  isRemoved: false },
    { stageKey: "s8", stageName: "Closing",       count:  47, isClosing: true,  isRemoved: false },
    { stageKey: "s9", stageName: "Nurtering",     count:  35, isClosing: false, isRemoved: false },
    { stageKey: "s10",stageName: "Recycled",      count:  89, isClosing: false, isRemoved: true  },
  ],

  totalLeads:         1247,
  closingStageNames:  ["Negotiating", "Proposal Sent", "Closing"],
  removedStageNames:  ["Recycled"],
  staleThresholdDays: 90,
  monthsConsidered:   12,
};

// Drill-down leads for any (metric, month) — sampling from the same name pool
export function demoLeadsFor(metric: "intake" | "highIntake" | "closing" | "removed", month: string): Array<{
  key: string; name: string; stageName: string; priority: string; createdAt: string; lastStageChangeAt: string;
}> {
  const seedI = months.indexOf(month) >= 0 ? months.indexOf(month) : 0;
  const counts = metric === "intake" ? intakeCounts
              : metric === "highIntake" ? highCounts
              : metric === "closing"   ? closingCounts
              : removedCounts;
  const n = Math.min(counts[seedI] ?? 0, 20);
  const stageByMetric = {
    intake:     ["Lead", "Contacted"],
    highIntake: ["Pitched", "Negotiating"],
    closing:    ["Negotiating", "Proposal Sent", "Closing"],
    removed:    ["Recycled"],
  }[metric];
  const priorityByMetric = {
    intake:     ["Medium", "Low", "High"],
    highIntake: ["High"],
    closing:    ["High", "Medium"],
    removed:    ["Low", "Medium"],
  }[metric];
  return Array.from({ length: n }, (_, i) => {
    const name = HOT_NAMES[(seedI * 7 + i) % HOT_NAMES.length];
    return {
      key:               `demo_${metric}_${month}_${i}`,
      name:              `${name}${i > 0 && (seedI + i) % 3 === 0 ? " West" : ""}`,
      stageName:         stageByMetric[i % stageByMetric.length],
      priority:          priorityByMetric[i % priorityByMetric.length],
      createdAt:         new Date(Date.now() - i * 86400_000).toISOString(),
      lastStageChangeAt: new Date(Date.now() - i * 2 * 86400_000).toISOString(),
    };
  });
}
