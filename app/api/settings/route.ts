import { NextResponse } from "next/server";
import { getConfig, setConfigValue } from "@/lib/config";

export async function GET() {
  try {
    const config = await getConfig();
    // Mask the API key — return only whether it's set
    return NextResponse.json({
      STREAK_API_KEY:      config.STREAK_API_KEY ? "••••••••" : "",
      STREAK_API_KEY_SET:  !!config.STREAK_API_KEY,
      STREAK_PIPELINE_KEY: config.STREAK_PIPELINE_KEY ?? "",
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, string>;
    const allowed = ["STREAK_API_KEY", "STREAK_PIPELINE_KEY"] as const;
    for (const key of allowed) {
      if (key in body && body[key] !== undefined) {
        // Skip if the caller sent back the masked placeholder
        if (body[key] === "••••••••") continue;
        await setConfigValue(key, body[key]);
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
