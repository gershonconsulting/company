import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { fetchPipelineBoxes, computeBreakdown } from "@/lib/streak";

export async function GET(req: NextRequest) {
  try {
    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = config.STREAK_PIPELINE_KEY;

    if (!apiKey)      return NextResponse.json({ error: "Streak API key not configured. Go to /settings." }, { status: 400 });
    if (!pipelineKey) return NextResponse.json({ error: "Streak pipeline key not configured. Go to /settings." }, { status: 400 });

    const boxes    = await fetchPipelineBoxes(apiKey, pipelineKey);
    const breakdown = computeBreakdown(boxes);

    // ?test=1 → just validate connectivity, return minimal payload
    if (req.nextUrl.searchParams.get("test") === "1") {
      return NextResponse.json({ ok: true, total: breakdown.total });
    }

    return NextResponse.json(breakdown);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
