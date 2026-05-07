import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { fetchPipelineBoxes, resolvePipelineKey } from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Plain-text total for =IMPORTDATA(...) in Google Sheets.
// Always returns 200 with a number so the formula resolves cleanly.
export async function GET() {
  try {
    const config = await getConfig();
    const apiKey = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) {
      return new NextResponse("0", { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    const boxes = await fetchPipelineBoxes(apiKey, pipelineKey);
    return new NextResponse(String(boxes.length), {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return new NextResponse("0", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
}
