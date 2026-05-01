// On Cloudflare Pages there's no writable filesystem. Streak credentials are
// read from environment variables set in the Cloudflare Pages project
// (Settings → Environment variables → Production).
//
// To rotate keys: change them in the Cloudflare dashboard and redeploy
// (push to main, or hit "Retry deployment" in the Pages UI).

export type ConfigKey = "STREAK_API_KEY" | "STREAK_PIPELINE_KEY";

export async function getConfig(): Promise<Record<ConfigKey, string>> {
  return {
    STREAK_API_KEY:      process.env.STREAK_API_KEY      ?? "",
    STREAK_PIPELINE_KEY: process.env.STREAK_PIPELINE_KEY ?? "",
  };
}

// Settings is read-only on Cloudflare Pages — the /settings page shows current
// values but writing is via the Cloudflare dashboard.
export function canWriteSettings(): boolean {
  return false;
}

// Kept for compat — POST handler will refuse via canWriteSettings() check.
export async function setConfigValues(
  _values: Partial<Record<ConfigKey, string>>
): Promise<void> {
  throw new Error(
    "Settings are read-only on Cloudflare Pages. Update STREAK_API_KEY / STREAK_PIPELINE_KEY in the Cloudflare Pages dashboard (Settings → Environment variables) and redeploy."
  );
}
