// Reads from data/config.json (written by /api/settings on the Hostinger server).
// Falls back to process.env so local dev and CI smoke-tests still work.
import path from "path";
import fs from "fs";

const CONFIG_PATH = path.join(process.cwd(), "data", "config.json");

interface Config {
    STREAK_API_KEY?: string;
    STREAK_PIPELINE_KEY?: string;
}

function readConfigFile(): Config {
    try {
          if (fs.existsSync(CONFIG_PATH)) {
                  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
                  return JSON.parse(raw) as Config;
          }
    } catch {
          // fall through to env vars
    }
    return {};
}

export async function getConfig(): Promise<Record<string, string>> {
    const file = readConfigFile();
    return {
          STREAK_API_KEY:      file.STREAK_API_KEY      ?? process.env.STREAK_API_KEY      ?? "",
          STREAK_PIPELINE_KEY: file.STREAK_PIPELINE_KEY ?? process.env.STREAK_PIPELINE_KEY ?? "",
    };
}

export async function setConfigValues(
    values: Partial<{ STREAK_API_KEY: string; STREAK_PIPELINE_KEY: string }>
  ): Promise<void> {
    const current = readConfigFile();
    const next: Config = { ...current, ...values };
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), "utf8");
}

export function canWriteSettings(): boolean {
    return true; // always writable on Hostinger Node
}
