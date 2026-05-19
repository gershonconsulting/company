import { NextResponse, NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema,
  buildPriorityMapping, resolvePipelineKey,
  PipelineSchema, StreakBox,
} from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface BoxWithTimestamps extends StreakBox {
  creationTimestamp?: number;
  lastUpdatedTimestamp?: number;
  lastStageChangeTimestamp?: number;
  lastSavedTimestamp?: number;
}

const CLOSING_STAGE_PATTERNS = [/proposal/i, /negotiat/i, /closing/i];
const REMOVED_STAGE_PATTERNS = [/recycl/i, /lost/i, /reject/i, /archiv/i, /dead/i];

function monthOf(ts: number | undefined | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

function buildStageMap(schema: PipelineSchema): Map<string, string> {
  const map = new Map<string, string>();
  const stages = (schema as PipelineSchema & { stages?: Record<string, { name?: string }> }).stages;
  if (stages && typeof stages === "object") {
    for (const [k, v] of Object.entries(stages)) {
      if (v && typeof v === "object" && "name" in v) {
        map.set(k, (v as { name?: string }).name ?? k);
      }
    }
  }
  return map;
}

// Drill-down endpoint: returns the leads behind a specific (metric, month) bar.
// metric  : intake | highIntake | closing | removed
// month   : YYYY-MM (e.g. 2026-04)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metric = (searchParams.get("metric") ?? "intake") as "intake" | "highIntake" | "closing" | "removed";
    const month  = (searchParams.get("month")  ?? "").trim();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Provide month=YYYY-MM" }, { status: 400 });
    }

    const config      = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) {
      return NextResponse.json({ error: "Streak credentials not set" }, { status: 400 });
    }

    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);
    const stageMap        = buildStageMap(schema);
    const mapping         = buildPriorityMapping(schema);

    const closingKeys = new Set<string>();
    const removedKeys = new Set<string>();
    for (const [key, name] of stageMap) {
      if (CLOSING_STAGE_PATTERNS.some((re) => re.test(name))) closingKeys.add(key);
      if (REMOVED_STAGE_PATTERNS.some((re) => re.test(name))) removedKeys.add(key);
    }

    const priorityLabel = (b: StreakBox): "High" | "Medium" | "Low" | "Unset" => {
      let val: string | number | null | undefined;
      if (mapping.fieldKey) val = (b.fields ?? {})[mapping.fieldKey] as string | number | null | undefined;
      else                  val = b.priority;
      if (val === null || val === undefined) return "Unset";
      if (mapping.high.has(val))   return "High";
      if (mapping.medium.has(val)) return "Medium";
      if (mapping.low.has(val))    return "Low";
      return "Unset";
    };

    const out: Array<{
      key: string; name: string; stageName: string; priority: string;
      createdAt: string; lastStageChangeAt: string;
    }> = [];

    for (const rawBox of boxes) {
      const box = rawBox as BoxWithTimestamps;
      const created   = box.creationTimestamp ?? box.lastSavedTimestamp;
      const changed   = box.lastStageChangeTimestamp ?? box.lastUpdatedTimestamp;
      const createdM  = monthOf(created);
      const changedM  = monthOf(changed);
      const pri       = priorityLabel(box);
      let include = false;

      if (metric === "intake")        include = createdM === month;
      else if (metric === "highIntake") include = createdM === month && pri === "High";
      else if (metric === "closing")  include = changedM === month && !!box.stageKey && closingKeys.has(box.stageKey);
      else if (metric === "removed")  include = changedM === month && !!box.stageKey && removedKeys.has(box.stageKey);

      if (!include) continue;

      out.push({
        key:               box.key,
        name:              box.name ?? "(unnamed)",
        stageName:         stageMap.get(box.stageKey ?? "") ?? "Unknown",
        priority:          pri,
        createdAt:         created ? new Date(created).toISOString() : "",
        lastStageChangeAt: changed ? new Date(changed).toISOString() : "",
      });
    }

    // Sort: most recently affected first
    out.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    return NextResponse.json({ month, metric, leads: out });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
