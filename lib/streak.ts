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

interface DropdownOption { key: string; name: string; }
interface PipelineField {
  key: string;
  name: string;
  type: string;
  dropdownSettings?: { items?: DropdownOption[] };
}
export interface PipelineSchema {
  name?: string;
  fields?: PipelineField[];
}

export interface PriorityFieldMapping {
  fieldKey: string | null;
  fieldName: string | null;
  high: Set<string | number>;
  medium: Set<string | number>;
  low: Set<string | number>;
}

export function resolvePipelineKey(input: string): string {
  const trimmed = (input ?? "").trim();
  const m = trimmed.match(/\/pipelines\/([^/?#]+)/);
  return m ? m[1] : trimmed;
}

async function streakFetch(apiKey: string, path: string): Promise<unknown> {
  const auth = btoa(apiKey + ":");
  const res = await fetch(STREAK_BASE + path, {
    headers: { Authorization: "Basic " + auth, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("Invalid Streak API key (401 Unauthorized).");
  if (res.status === 404) throw new Error("Pipeline not found - check the pipeline key.");
  if (!res.ok) {
    const text = await res.text();
    throw new Error("Streak API error " + res.status + ": " + text.slice(0, 200));
  }
  return res.json();
}

export async function fetchPipelineSchema(apiKey: string, pipelineKey: string): Promise<PipelineSchema> {
  return streakFetch(apiKey, "/pipelines/" + pipelineKey) as Promise<PipelineSchema>;
}

export function buildPriorityMapping(schema: PipelineSchema): PriorityFieldMapping {
  // Default: native box.priority (Streak: 3=HIGH, 2=MEDIUM, 1=LOW)
  const fallback: PriorityFieldMapping = {
    fieldKey: null, fieldName: null,
    high: new Set([3]), medium: new Set([2]), low: new Set([1]),
  };
  const fields = schema.fields ?? [];
  // Match a DROPDOWN/TAG field whose name contains 'priority' (case-insensitive)
  const priField = fields.find((f) =>
    (f.type === "DROPDOWN" || f.type === "TAG") &&
    /priority/i.test(f.name ?? "")
  );
  if (!priField) return fallback;
  const items = priField.dropdownSettings?.items ?? [];
  const high: Set<string | number> = new Set();
  const medium: Set<string | number> = new Set();
  const low: Set<string | number> = new Set();
  for (const o of items) {
    const n = (o.name ?? "").toLowerCase();
    if (n.includes("high"))   high.add(o.key);
    else if (n.includes("medium") || n.includes("med")) medium.add(o.key);
    else if (n.includes("low"))    low.add(o.key);
  }
  if (high.size === 0 && medium.size === 0 && low.size === 0) return fallback;
  return { fieldKey: priField.key, fieldName: priField.name, high, medium, low };
}

export async function fetchPipelineBoxes(apiKey: string, pipelineKey: string): Promise<StreakBox[]> {
  const data = await streakFetch(apiKey, "/pipelines/" + pipelineKey + "/boxes") as { results?: unknown } | unknown[];
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
  priorityFieldName: string | null;
}

export function computeBreakdown(boxes: StreakBox[], mapping: PriorityFieldMapping): PriorityBreakdown {
  const bd: PriorityBreakdown = { total: boxes.length, high: 0, medium: 0, low: 0, unset: 0, nextDueDatePct: 0, priorityFieldName: mapping.fieldName };
  let withDueDate = 0;
  for (const box of boxes) {
    let val: string | number | null | undefined;
    if (mapping.fieldKey) {
      val = (box.fields ?? {})[mapping.fieldKey] as string | number | null | undefined;
    } else {
      val = box.priority;
    }
    if (val !== null && val !== undefined) {
      if (mapping.high.has(val))        bd.high++;
      else if (mapping.medium.has(val)) bd.medium++;
      else if (mapping.low.has(val))    bd.low++;
      else                              bd.unset++;
    } else {
      bd.unset++;
    }
    if (box.reminderTimestamp && box.reminderTimestamp > 0) withDueDate++;
  }
  bd.nextDueDatePct = bd.total > 0 ? Math.round((withDueDate / bd.total) * 100) : 0;
  return bd;
}
