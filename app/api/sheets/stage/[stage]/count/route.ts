import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema, resolvePipelineKey,
} from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Plain-text count of boxes whose current stage NAME matches the URL param.
// Match is case- and whitespace-insensitive so Google Sheets URLs with
// regular spaces ("Proposal Sent") and percent-encoded ("Proposal%20Sent")
// both work. Always returns 200 with a number.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ stage: string }> },
) {
  try {
    const { stage } = await params;
    const wanted = decodeURIComponent(stage ?? "").trim().toLowerCase();
    if (!wanted) return plain("0");

    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) return plain("0");

    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);

    // Build stageKey -> stageName map (case-insensitive name comparison)
    const matchingKeys = new Set<string>();
    const stages = (schema as { stages?: Record<string, { name?: string }> }).stages ?? {};
    for (const [key, val] of Object.entries(stages)) {
      const name = (val?.name ?? "").trim().toLowerCase();
      if (name === wanted) matchingKeys.add(key);
    }

    if (matchingKeys.size === 0) return plain("0");

    let count = 0;
    for (const b of boxes) {
      if (b.stageKey && matchingKeys.has(b.stageKey)) count++;
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
