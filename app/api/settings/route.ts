import { NextResponse } from "next/server";
import { getConfig, setConfigValues, ConfigKey } from "@/lib/config";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BUSINESS_KEYS: ConfigKey[] = [
  "AVG_INVOICE_VALUE",
  "AVG_INVOICES_PER_CLIENT",
  "AVG_CLIENT_LIFETIME_MO",
  "CONVERSION_RATE_HIGH",
  "CONVERSION_RATE_MEDIUM",
  "CONVERSION_RATE_LOW",
];

export async function GET() {
  try {
    const config = await getConfig();
    const out: Record<string, string | boolean> = {
      STREAK_API_KEY_SET:  !!config.STREAK_API_KEY,
      STREAK_API_KEY:      config.STREAK_API_KEY ? "••••••••" : "",
      STREAK_PIPELINE_KEY: config.STREAK_PIPELINE_KEY ?? "",
      readonly: false,
    };
    for (const k of BUSINESS_KEYS) out[k] = config[k] ?? "";
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, string>;
    const patch: Partial<Record<ConfigKey, string>> = {};

    if (body.STREAK_API_KEY      !== undefined && body.STREAK_API_KEY      !== "••••••••") patch.STREAK_API_KEY      = body.STREAK_API_KEY;
    if (body.STREAK_PIPELINE_KEY !== undefined)                                              patch.STREAK_PIPELINE_KEY = body.STREAK_PIPELINE_KEY;

    for (const k of BUSINESS_KEYS) {
      if (body[k] !== undefined) patch[k] = body[k];
    }

    await setConfigValues(patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
