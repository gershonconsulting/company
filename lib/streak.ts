const STREAK_BASE = "https://www.streak.com/api/v1";

export interface StreakBox {
  key: string;
  name: string;
  priority?: number | null; // Streak numeric priority field
  assignedToSharingEntries?: unknown[];
  lastUpdatedTimestamp?: number;
  reminderTimestamp?: number | null;
}

// Streak priority values: 1=High, 2=Medium, 3=Low (may vary by account)
export const PRIORITY_MAP: Record<number, "High" | "Medium" | "Low"> = {
  1: "High",
  2: "Medium",
  3: "Low",
};

export async function fetchPipelineBoxes(
  apiKey: string,
  pipelineKey: string
): Promise<StreakBox[]> {
  const url = `${STREAK_BASE}/pipelines/${pipelineKey}/boxes`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Streak API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<StreakBox[]>;
}

export interface PriorityBreakdown {
  total: number;
  high: number;
  medium: number;
  low: number;
  unset: number;
  nextDueDateSet: number; // boxes that have a reminder set
}

export function computeBreakdown(boxes: StreakBox[]): PriorityBreakdown {
  const breakdown: PriorityBreakdown = {
    total: boxes.length,
    high: 0,
    medium: 0,
    low: 0,
    unset: 0,
    nextDueDateSet: 0,
  };
  for (const box of boxes) {
    const p = box.priority;
    if (p === 1)      breakdown.high++;
    else if (p === 2) breakdown.medium++;
    else if (p === 3) breakdown.low++;
    else              breakdown.unset++;

    if (box.reminderTimestamp && box.reminderTimestamp > 0) {
      breakdown.nextDueDateSet++;
    }
  }
  // nextDueDateSet as a percentage
  breakdown.nextDueDateSet =
    breakdown.total > 0
      ? Math.round((breakdown.nextDueDateSet / breakdown.total) * 100)
      : 0;
  return breakdown;
}
