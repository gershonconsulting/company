const STREAK_BASE = "https://www.streak.com/api/v1";

export interface StreakBox {
  key: string;
  name: string;
  // Streak priority: 3=HIGH, 2=MEDIUM, 1=LOW, null/0=NONE
  priority?: number | null;
  reminderTimestamp?: number | null;
  lastUpdatedTimestamp?: number;
  stageKey?: string;
  fields?: Record<string, unknown>;
}

// Streak native priority values (confirmed from Streak API v1 docs)
export const PRIORITY_MAP: Record<number, "High" | "Medium" | "Low"> = {
  3: "High",
  2: "Medium",
  1: "Low",
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

  if (res.status === 401) throw new Error("Invalid Streak API key (401 Unauthorized).");
  if (res.status === 404) throw new Error("Pipeline not found — check the pipeline key.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Streak API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // The endpoint returns either an array or { results: [...] }
  return (Array.isArray(data) ? data : data.results ?? []) as StreakBox[];
}

export interface PriorityBreakdown {
  total: number;
  high: number;
  medium: number;
  low: number;
  unset: number;
  nextDueDatePct: number; // % of boxes that have a reminder / next due date set
}

export function computeBreakdown(boxes: StreakBox[]): PriorityBreakdown {
  const bd: PriorityBreakdown = { total: boxes.length, high: 0, medium: 0, low: 0, unset: 0, nextDueDatePct: 0 };
  let withDueDate = 0;

  for (const box of boxes) {
    const p = box.priority;
    if (p === 3)      bd.high++;
    else if (p === 2) bd.medium++;
    else if (p === 1) bd.low++;
    else              bd.unset++;

    if (box.reminderTimestamp && box.reminderTimestamp > 0) withDueDate++;
  }

  bd.nextDueDatePct = bd.total > 0 ? Math.round((withDueDate / bd.total) * 100) : 0;
  return bd;
}
