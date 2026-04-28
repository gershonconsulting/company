// Settings are stored in the Airtable "Config" table.
// The app only needs AIRTABLE_API_KEY set as an env var — everything else
// (Streak credentials) is then editable via /settings in the UI.

const BASE_ID   = "appZ3onA8CrfO6zhM";
const TABLE_ID  = "tblIV3Qr9vCEFu1mm";
const FIELD_KEY = "fldzqMPN00504AucO"; // "Key"
const FIELD_VAL = "fldnmsIG3e9KzqNDi"; // "Value"

// Record IDs for each setting key (seeded when the table was created)
const RECORD_IDS: Record<string, string> = {
  STREAK_API_KEY:      "recLMbXnSLhFNRW0l",
  STREAK_PIPELINE_KEY: "recB6IJhOcyMFD63I",
};

function headers() {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY is not configured.");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export async function getConfig(): Promise<Record<string, string>> {
  const url =
    `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}` +
    `?fields%5B%5D=${FIELD_KEY}&fields%5B%5D=${FIELD_VAL}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable read failed (${res.status})`);
  const json = await res.json() as { records: { fields: Record<string, string> }[] };
  const cfg: Record<string, string> = {};
  for (const record of json.records ?? []) {
    const k = record.fields[FIELD_KEY];
    const v = record.fields[FIELD_VAL] ?? "";
    if (k) cfg[k] = v;
  }
  return cfg;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  const recordId = RECORD_IDS[key];
  if (!recordId) throw new Error(`Unknown config key: ${key}`);
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ fields: { [FIELD_VAL]: value } }),
  });
  if (!res.ok) throw new Error(`Airtable write failed (${res.status})`);
}

export async function canWriteSettings(): Promise<boolean> {
  return !!process.env.AIRTABLE_API_KEY;
}

export const CONFIG_RECORDS = RECORD_IDS;
