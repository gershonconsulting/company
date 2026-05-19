import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { fetchPipelineBoxes, resolvePipelineKey } from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Plain-text count of boxes that have at least one OVERDUE task.
export async function GET() {
  try {
    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) return plain("0");

    const boxes = await fetchPipelineBoxes(apiKey, pipelineKey);
    let count = 0;
    for (const b of boxes) {
      if (b.taskOverdueCount && b.taskOverdueCount > 0) count++;
    }
    return plain(String(count));
  } catch {
    return plain("0");
  }
}

function plain(body: string) {
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" },
  });
}
