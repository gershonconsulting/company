// Reads live from process.env — set by Cloudflare Pages environment variables.
// Writes via the Cloudflare Pages REST API, then triggers a new deployment
// so the fresh values are live within ~60 seconds.

export const CF_PROJECT = "gershon-company";

export async function getConfig(): Promise<Record<string, string>> {
  return {
    STREAK_API_KEY:      process.env.STREAK_API_KEY      ?? "",
    STREAK_PIPELINE_KEY: process.env.STREAK_PIPELINE_KEY ?? "",
  };
}

export async function setConfigValues(
  values: Partial<{ STREAK_API_KEY: string; STREAK_PIPELINE_KEY: string }>
): Promise<void> {
  const token     = process.env.CF_API_TOKEN;
  const accountId = process.env.CF_ACCOUNT_ID;

  if (!token || !accountId) {
    throw new Error("CF_API_TOKEN and CF_ACCOUNT_ID must be set in Cloudflare Pages.");
  }

  // 1 – Build the env_vars patch (only keys that were provided)
  const env_vars: Record<string, { value: string; type: "secret_text" }> = {};
  if (values.STREAK_API_KEY)      env_vars.STREAK_API_KEY      = { value: values.STREAK_API_KEY,      type: "secret_text" };
  if (values.STREAK_PIPELINE_KEY) env_vars.STREAK_PIPELINE_KEY = { value: values.STREAK_PIPELINE_KEY, type: "secret_text" };

  const patchRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${CF_PROJECT}`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ deployment_configs: { production: { env_vars } } }),
    }
  );
  if (!patchRes.ok) {
    const txt = await patchRes.text();
    throw new Error(`Cloudflare API error ${patchRes.status}: ${txt}`);
  }

  // 2 – Trigger a new deployment so the updated env vars take effect
  const deployRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${CF_PROJECT}/deployments`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }
  );
  if (!deployRes.ok) {
    const txt = await deployRes.text();
    throw new Error(`Redeploy failed ${deployRes.status}: ${txt}`);
  }
}

export function canWriteSettings(): boolean {
  return !!(process.env.CF_API_TOKEN && process.env.CF_ACCOUNT_ID);
}

// Kept for backward compat
export const CONFIG_RECORDS: Record<string, string> = {};
export async function setConfigValue(key: string, value: string): Promise<void> {
  await setConfigValues({ [key]: value } as Parameters<typeof setConfigValues>[0]);
}
