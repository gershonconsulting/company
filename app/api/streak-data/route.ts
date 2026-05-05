import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { fetchPipelineBoxes, fetchPipelineSchema, buildPriorityMapping, computeBreakdown, resolvePipelineKey } from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");

    if (!apiKey)      return NextResponse.json({ error: "Streak API key not set. Go to /settings." }, { status: 400 });
    if (!pipelineKey) return NextResponse.json({ error: "Streak pipeline key not set. Go to /settings." }, { status: 400 });

    // Fetch schema + boxes in parallel
    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);
    const mapping   = buildPriorityMapping(schema);
    const breakdown = computeBreakdown(boxes, mapping);

    if (req.nextUrl.searchParams.get("test") === "1") {
      return NextResponse.json({
        ok: true,
        total: breakdown.total,
        priorityField: breakdown.priorityFieldName ?? "native box.priority",
        high: breakdown.high,
        medium: breakdown.medium,
        low: breakdown.low,
        unset: breakdown.unset,
      });
    }
    return NextResponse.json(breakdown);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
