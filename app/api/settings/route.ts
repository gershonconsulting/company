import { NextResponse } from "next/server";
import { getConfig, setConfigValue, canWriteSettings } from "@/lib/config";

export async function GET() {
  try {
    const [config, writable] = await Promise.all([getConfig(), canWriteSettings()]);
    return NextResponse.json({
      STREAK_API_KEY_SET:  !!config.STREAK_API_KEY,
      STREAK_API_KEY:      config.STREAK_API_KEY ? "••••••••" : "",
      STREAK_PIPELINE_KEY: config.STREAK_PIPELINE_KEY ?? "",
      readonly: !writable,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await canWriteSettings())) {
    return NextResponse.json(
      { error: "AIRTABLE_API_KEY is not set — add it as an environment variable in Cloudflare Pages." },
      { status: 422 }
    );
  }
  try {
    const body = await req.json() as Record<string, string>;
    const allowed = ["STREAK_API_KEY", "STREAK_PIPELINE_KEY"] as const;
    for (const key of allowed) {
      if (body[key] && body[key] !== "••••••••") {
        await setConfigValue(key, body[key]);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
