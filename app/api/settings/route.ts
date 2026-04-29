import { NextResponse } from "next/server";
import { getConfig, setConfigValues, canWriteSettings } from "@/lib/config";

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

export async function POST(req: Request) {
  if (!canWriteSettings()) {
    return NextResponse.json(
      { error: "CF_API_TOKEN and CF_ACCOUNT_ID must be set in Cloudflare Pages → Settings → Environment variables." },
      { status: 422 }
    );
  }
  try {
    const body = await req.json() as Record<string, string>;
    const patch: Partial<{ STREAK_API_KEY: string; STREAK_PIPELINE_KEY: string }> = {};
    if (body.STREAK_API_KEY      && body.STREAK_API_KEY      !== "••••••••") patch.STREAK_API_KEY      = body.STREAK_API_KEY;
    if (body.STREAK_PIPELINE_KEY && body.STREAK_PIPELINE_KEY !== "••••••••") patch.STREAK_PIPELINE_KEY = body.STREAK_PIPELINE_KEY;
    await setConfigValues(patch);
    return NextResponse.json({ ok: true, redeploying: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
