import path from "path";
import fs from "fs";

const SETTINGS_PATH = path.join(process.cwd(), "config", "settings.json");

type Settings = Record<string, string>;

function readFile(): Settings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf8")) as Settings;
  } catch {
    return {};
  }
}

function writeFile(data: Settings): void {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function getConfig(): Promise<Settings> {
  // Env vars take precedence (useful for production / Vercel deployments)
  const fromEnv: Settings = {};
  if (process.env.STREAK_API_KEY)      fromEnv.STREAK_API_KEY      = process.env.STREAK_API_KEY;
  if (process.env.STREAK_PIPELINE_KEY) fromEnv.STREAK_PIPELINE_KEY = process.env.STREAK_PIPELINE_KEY;

  const fromFile = readFile();
  return { ...fromFile, ...fromEnv };
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  const current = readFile();
  current[key] = value;
  writeFile(current);
}

// Keep for backward compat — no longer needed but avoids import errors
export const CONFIG_RECORDS: Record<string, string> = {};
