import { NextResponse } from "next/server";
import { getConfig, setConfigValue, canWriteSettings } from "@/lib/config";

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
      { error: "READONLY_ENV", message: "Running on Cloudflare Pages — set STREAK_API_KEY and STREAK_PIPELINE_KEY as environment variables in the Cloudflare Pages dashboard." },
      { status: 422 }
    );
  }
  try {
    const body = await req.json() as Record<string, string>;
    const allowed = ["STREAK_API_KEY", "STREAK_PIPELINE_KEY"] as const;
    for (const key of allowed) {
      if (key in body && body[key] && body[key] !== "••••••••") {
        await setConfigValue(key, body[key]);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
