import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema,
  buildPriorityMapping, resolvePipelineKey,
} from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Plain-text count of boxes whose Priority matches the URL param.
// Accepts: high / medium / low / unset (case-insensitive). Always 200.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ level: string }> },
) {
  try {
    const { level } = await params;
    const wanted = decodeURIComponent(level ?? "").trim().toLowerCase();
    if (!["high", "medium", "low", "unset"].includes(wanted)) return plain("0");

    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) return plain("0");

    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);
    const mapping = buildPriorityMapping(schema);

    let count = 0;
    for (const b of boxes) {
      let val: string | number | null | undefined;
      if (mapping.fieldKey) {
        val = (b.fields ?? {})[mapping.fieldKey] as string | number | null | undefined;
      } else {
        val = b.priority;
      }
      let bucket: "high" | "medium" | "low" | "unset" = "unset";
      if (val !== null && val !== undefined) {
        if      (mapping.high.has(val))   bucket = "high";
        else if (mapping.medium.has(val)) bucket = "medium";
        else if (mapping.low.has(val))    bucket = "low";
        else                              bucket = "unset";
      }
      if (bucket === wanted) count++;
    }
    return plain(String(count));
  } catch {
    return plain("0");
  }
}

function plain(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}
