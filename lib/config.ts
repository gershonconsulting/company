import path from "path";

type Settings = Record<string, string>;

// Safely require fs — not available on Cloudflare edge runtime
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = (() => { try { return require("fs") as typeof import("fs"); } catch { return null; } })();

const SETTINGS_PATH = path.join(process.cwd(), "config", "settings.json");

function readFile(): Settings {
  if (!fs) return {};
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8")) as Settings;
  } catch {
    return {};
  }
}

export function canWriteSettings(): boolean {
  return fs !== null;
}

export async function getConfig(): Promise<Settings> {
  // Env vars always win — set these in Cloudflare Pages dashboard
  const fromEnv: Settings = {};
  if (process.env.STREAK_API_KEY)      fromEnv.STREAK_API_KEY      = process.env.STREAK_API_KEY;
  if (process.env.STREAK_PIPELINE_KEY) fromEnv.STREAK_PIPELINE_KEY = process.env.STREAK_PIPELINE_KEY;

  const fromFile = readFile();
  return { ...fromFile, ...fromEnv };
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  if (!fs) throw new Error("READONLY_ENV");
  const current = readFile();
  current[key] = value;
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(current, null, 2), "utf8");
}

export const CONFIG_RECORDS: Record<string, string> = {};
