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
    const wanted = normalizeStageName(decodeURIComponent(stage ?? ""));
    if (!wanted) return plain("0");

    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) return plain("0");

    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);

    // Build stageKey -> stageName map. Match tolerantly so Streak stage names
    // with numeric prefixes ("5. Proposal Sent") still match a plain query
    // ("Proposal Sent"). We normalize both sides identically.
    const matchingKeys = new Set<string>();
    const stages = (schema as { stages?: Record<string, { name?: string }> }).stages ?? {};
    for (const [key, val] of Object.entries(stages)) {
      if (normalizeStageName(val?.name ?? "") === wanted) matchingKeys.add(key);
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

// Normalize a Streak stage name for tolerant matching.
// - strip leading number+dot prefix ("5. Proposal Sent" -> "Proposal Sent")
// - collapse internal whitespace
// - lowercase and trim
function normalizeStageName(s: string): string {
  return s.trim()
          .replace(/^\d+\s*[.)\-:]\s*/, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
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
