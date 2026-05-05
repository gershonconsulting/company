const STREAK_BASE = "https://www.streak.com/api/v1";

export interface StreakBox {
  key: string;
  name: string;
  priority?: number | null;
  reminderTimestamp?: number | null;
  lastUpdatedTimestamp?: number;
  stageKey?: string;
  fields?: Record<string, unknown>;
}

export const PRIORITY_MAP: Record<number, "High" | "Medium" | "Low"> = {
  3: "High",
  2: "Medium",
  1: "Low",
};

export function resolvePipelineKey(input: string): string {
  const trimmed = (input ?? "").trim();
  const m = trimmed.match(/\/pipelines\/([^/?#]+)/);
  return m ? m[1] : trimmed;
}

export async function fetchPipelineBoxes(
  apiKey: string,
  pipelineKey: string
): Promise<StreakBox[]> {
  const key = resolvePipelineKey(pipelineKey);
  const url = STREAK_BASE + "/pipelines/" + key + "/boxes";
  const auth = btoa(apiKey + ":");
  const res = await fetch(url, {
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (res.status === 401) throw new Error("Invalid Streak API key (401 Unauthorized).");
  if (res.status === 404) throw new Error("Pipeline not found - check the pipeline key.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Streak API error " + res.status + ": " + text.slice(0, 200));
  }

  const data = await res.json() as { results?: unknown } | unknown[];
  const boxes = Array.isArray(data) ? data : ((data as { results?: unknown }).results ?? []);
  return boxes as StreakBox[];
}

export interface PriorityBreakdown {
  total: number;
  high: number;
  medium: number;
  low: number;
  unset: number;
  nextDueDatePct: number;
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
