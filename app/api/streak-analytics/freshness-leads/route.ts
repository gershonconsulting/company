import { NextResponse, NextRequest } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema,
  buildPriorityMapping, resolvePipelineKey,
  PipelineSchema, StreakBox,
} from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface BoxWithTs extends StreakBox {
  creationTimestamp?: number;
  lastUpdatedTimestamp?: number;
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

// Drill-down for the freshness widget. Returns the leads in a freshness bucket.
// bucket : high (<=7d) | medium (8-30d) | low (31-90d) | stale (>90d) | never
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bucket = (searchParams.get("bucket") ?? "").toLowerCase();
    if (!["high", "medium", "low", "stale", "never"].includes(bucket)) {
      return NextResponse.json({ error: "Provide bucket=high|medium|low|stale|never" }, { status: 400 });
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
    const stageMap = buildStageMap(schema);
    const mapping  = buildPriorityMapping(schema);

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

    const now = Date.now();
    const D   = 86400 * 1000;

    const out: Array<{ key: string; name: string; stageName: string; priority: string; daysSinceTouch: number; lastUpdated: string }> = [];
    for (const rawBox of boxes) {
      const box = rawBox as BoxWithTs;
      const ts  = box.lastUpdatedTimestamp ?? 0;
      let matched = false;
      let days = 0;
      if (!ts || ts <= 0) {
        matched = bucket === "never";
      } else {
        days = (now - ts) / D;
        if      (bucket === "high"   && days <= 7)  matched = true;
        else if (bucket === "medium" && days > 7  && days <= 30) matched = true;
        else if (bucket === "low"    && days > 30 && days <= 90) matched = true;
        else if (bucket === "stale"  && days > 90) matched = true;
      }
      if (!matched) continue;
      out.push({
        key:            box.key,
        name:           box.name ?? "(unnamed)",
        stageName:      stageMap.get(box.stageKey ?? "") ?? "Unknown",
        priority:       priorityLabel(box),
        daysSinceTouch: ts > 0 ? Math.floor(days) : -1,
        lastUpdated:    ts > 0 ? new Date(ts).toISOString() : "",
      });
    }
    out.sort((a, b) => b.daysSinceTouch - a.daysSinceTouch);
    return NextResponse.json({ bucket, leads: out });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
