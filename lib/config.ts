// Streak credentials live in the SETTINGS Cloudflare KV namespace, bound in
// wrangler.jsonc. The /settings page reads & writes them through the API
// routes in app/api/. This avoids the "no writable filesystem" limitation of
// Cloudflare Pages (no fs.writeFile available at runtime).

import { getRequestContext } from "@cloudflare/next-on-pages";

export type ConfigKey = "STREAK_API_KEY" | "STREAK_PIPELINE_KEY";

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
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
  const [apiKey, pipelineKey] = await Promise.all([
    settings.get("STREAK_API_KEY"),
    settings.get("STREAK_PIPELINE_KEY"),
  ]);
  return {
    STREAK_API_KEY: apiKey ?? "",
    STREAK_PIPELINE_KEY: pipelineKey ?? "",
  };
}

export async function setConfigValues(
  values: Partial<Record<ConfigKey, string>>
): Promise<void> {
  const settings = kv();
  const ops: Promise<void>[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (v && v.length > 0) ops.push(settings.put(k, v));
  }
  await Promise.all(ops);
}

export function canWriteSettings(): boolean {
  return true;
}
