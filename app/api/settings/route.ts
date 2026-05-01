import { NextResponse } from "next/server";
import { getConfig, canWriteSettings } from "@/lib/config";

// Cloudflare Pages requires edge runtime for API routes via @cloudflare/next-on-pages.
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json({
      STREAK_API_KEY_SET:  !!config.STREAK_API_KEY,
      STREAK_API_KEY:      config.STREAK_API_KEY ? "••••••••" : "",
      STREAK_PIPELINE_KEY: config.STREAK_PIPELINE_KEY ?? "",
      readonly: !canWriteSettings(),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Settings are read-only. Update STREAK_API_KEY and STREAK_PIPELINE_KEY in the Cloudflare Pages dashboard (gershoncrm-company → Settings → Environment variables), then redeploy.",
    },
    { status: 422 }
  );
}
