// Settings live in the SETTINGS Cloudflare KV namespace, bound in
// wrangler.jsonc. The /settings page reads & writes them through the API
// routes in app/api/. This avoids the "no writable filesystem" limitation of
// Cloudflare Pages (no fs.writeFile available at runtime).

import { getRequestContext } from "@cloudflare/next-on-pages";

// Streak credentials + business assumptions used to compute pipeline value
export type ConfigKey =
  | "STREAK_API_KEY"
  | "STREAK_PIPELINE_KEY"
  | "AVG_INVOICE_VALUE"
  | "AVG_INVOICES_PER_CLIENT"
  | "AVG_CLIENT_LIFETIME_MO"
  | "CONVERSION_RATE_HIGH"
  | "CONVERSION_RATE_MEDIUM"
  | "CONVERSION_RATE_LOW";

const ALL_KEYS: ConfigKey[] = [
  "STREAK_API_KEY",
  "STREAK_PIPELINE_KEY",
  "AVG_INVOICE_VALUE",
  "AVG_INVOICES_PER_CLIENT",
  "AVG_CLIENT_LIFETIME_MO",
  "CONVERSION_RATE_HIGH",
  "CONVERSION_RATE_MEDIUM",
  "CONVERSION_RATE_LOW",
];

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface CloudflareEnv {
  SETTINGS: KVNamespace;
}

function kv(): KVNamespace {
  const ctx = getRequestContext();
  const env = ctx.env as unknown as CloudflareEnv;
  if (!env?.SETTINGS) {
    throw new Error("SETTINGS KV binding not available. Check wrangler.jsonc.");
  }
  return env.SETTINGS;
}

export async function getConfig(): Promise<Record<ConfigKey, string>> {
  const settings = kv();
  const values = await Promise.all(ALL_KEYS.map((k) => settings.get(k)));
  const out = {} as Record<ConfigKey, string>;
  ALL_KEYS.forEach((k, i) => { out[k] = values[i] ?? ""; });
  return out;
}

export async function setConfigValues(
  values: Partial<Record<ConfigKey, string>>
): Promise<void> {
  const settings = kv();
  const ops: Promise<void>[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null) continue;
    if (v === "") {
      // Delete the key explicitly when emptied
      ops.push(settings.delete(k));
    } else {
      ops.push(settings.put(k, v));
    }
  }
  await Promise.all(ops);
}

export function canWriteSettings(): boolean {
  return true;
}
