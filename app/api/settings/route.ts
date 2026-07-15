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

const REPORT_KEYS: ConfigKey[] = [
  "REPORT_FROM",
  "REPORT_TO",
];

// URL-safe random hex (32 bytes / 64 chars) via Web Crypto (edge runtime)
function randomKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET() {
  try {
    const config = await getConfig();

    // Auto-generate the report trigger key on first read so the scheduled
    // task always has a valid credential without human intervention.
    let triggerKey = config.REPORT_TRIGGER_KEY;
    if (!triggerKey) {
      triggerKey = randomKey();
      await setConfigValues({ REPORT_TRIGGER_KEY: triggerKey });
    }

    const out: Record<string, string | boolean> = {
      // Streak
      STREAK_API_KEY_SET:  !!config.STREAK_API_KEY,
      STREAK_API_KEY:      config.STREAK_API_KEY ? "••••••••" : "",
      STREAK_PIPELINE_KEY: config.STREAK_PIPELINE_KEY ?? "",
      // Resend / weekly report
      RESEND_API_KEY_SET:  !!config.RESEND_API_KEY,
      RESEND_API_KEY:      config.RESEND_API_KEY ? "••••••••" : "",
      REPORT_FROM:         config.REPORT_FROM || "reports@gershonconsulting.com",
      REPORT_TO:           config.REPORT_TO   || "sales@gershonconsulting.com",
      REPORT_TRIGGER_KEY:  triggerKey,
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
    if (body.RESEND_API_KEY      !== undefined && body.RESEND_API_KEY      !== "••••••••") patch.RESEND_API_KEY      = body.RESEND_API_KEY;

    for (const k of BUSINESS_KEYS) if (body[k] !== undefined) patch[k] = body[k];
    for (const k of REPORT_KEYS)   if (body[k] !== undefined) patch[k] = body[k];

    // Never let clients overwrite REPORT_TRIGGER_KEY from the UI — it's
    // server-generated and shared with the cron. Ignore any attempt.

    await setConfigValues(patch);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
