import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { fetchPipelineBoxes, resolvePipelineKey } from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Plain-text count of boxes bucketed by how recently they were touched.
//   high   = touched within the last 7 days
//   medium = 7 to 30 days
//   low    = more than 30 days
//   stale  = more than 90 days (matches the Stale Leads view)
//   never  = never touched (no lastUpdatedTimestamp)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ level: string }> },
) {
  try {
    const { level } = await params;
    const wanted = decodeURIComponent(level ?? "").trim().toLowerCase();
    if (!["high", "medium", "low", "stale", "never"].includes(wanted)) return plain("0");

    const config = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) return plain("0");

    const boxes = await fetchPipelineBoxes(apiKey, pipelineKey);
    const now = Date.now();
    const D   = 86400 * 1000;

    let count = 0;
    for (const b of boxes) {
      const ts = b.lastUpdatedTimestamp ?? 0;
      let bucket: "high" | "medium" | "low" | "stale" | "never";
      if (!ts || ts <= 0) {
        bucket = "never";
      } else {
        const days = (now - ts) / D;
        if      (days <= 7)   bucket = "high";
        else if (days <= 30)  bucket = "medium";
        else if (days <= 90)  bucket = "low";
        else                  bucket = "stale";
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
