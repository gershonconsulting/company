import { NextResponse } from "next/server";
import { getConfig, setConfigValues } from "@/lib/config";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getConfig();
    return NextResponse.json({
      STREAK_API_KEY_SET:  !!config.STREAK_API_KEY,
      STREAK_API_KEY:      config.STREAK_API_KEY ? "••••••••" : "",
      STREAK_PIPELINE_KEY: config.STREAK_PIPELINE_KEY ?? "",
      readonly: false,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, string>;
    const patch: Partial<{ STREAK_API_KEY: string; STREAK_PIPELINE_KEY: string }> = {};
    if (body.STREAK_API_KEY      && body.STREAK_API_KEY      !== "••••••••") patch.STREAK_API_KEY      = body.STREAK_API_KEY;
    if (body.STREAK_PIPELINE_KEY && body.STREAK_PIPELINE_KEY !== "••••••••") patch.STREAK_PIPELINE_KEY = body.STREAK_PIPELINE_KEY;
    await setConfigValues(patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
