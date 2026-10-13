import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema,
  buildPriorityMapping, resolvePipelineKey,
} from "@/lib/streak";
import { computeAnalytics } from "@/lib/analytics";
import { computeMomentum } from "@/lib/momentum";
import { recordAndReadExact } from "@/lib/momentum-store";

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
    const removed   = new Set(analytics.funnel.filter((f) => f.isRemoved).map((f) => f.stageKey));
    const momentum  = computeMomentum(boxes, Date.now(), removed);
    momentum.exact  = await recordAndReadExact(boxes);
    return NextResponse.json({ ...analytics, momentum });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
