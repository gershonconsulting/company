import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema,
  buildPriorityMapping, resolvePipelineKey,
} from "@/lib/streak";
import { computeAnalytics } from "@/lib/analytics";

export const runtime  = "edge";
export const dynamic  = "force-dynamic";

export async function GET() {
  try {
    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) {
      return NextResponse.json({ error: "Streak credentials not set. Go to /settings." }, { status: 400 });
    }
    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);
    const mapping   = buildPriorityMapping(schema);
    const analytics = computeAnalytics(boxes, schema, mapping);
    return NextResponse.json(analytics);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
