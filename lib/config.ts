// Airtable Config table identifiers — hardcoded so no env var is needed for the table itself
const BASE_ID   = "appZ3onA8CrfO6zhM";
const TABLE_ID  = "tblIV3Qr9vCEFu1mm";
const FIELD_KEY = "fldzqMPN00504AucO";
const FIELD_VAL = "fldnmsIG3e9KzqNDi";

// Record IDs seeded at table creation
export const CONFIG_RECORDS: Record<string, string> = {
  STREAK_API_KEY:      "recLMbXnSLhFNRW0l",
  STREAK_PIPELINE_KEY: "recB6IJhOcyMFD63I",
};

function airtableHeaders() {
  const key = process.env.AIRTABLE_API_KEY;
  if (!key) throw new Error("AIRTABLE_API_KEY env var is not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function getConfig(): Promise<Record<string, string>> {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?fields%5B%5D=${FIELD_KEY}&fields%5B%5D=${FIELD_VAL}`;
  const res = await fetch(url, { headers: airtableHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`Airtable GET failed: ${res.status}`);
  const json = await res.json();
  const config: Record<string, string> = {};
  for (const record of json.records ?? []) {
    const k = record.fields[FIELD_KEY];
    const v = record.fields[FIELD_VAL] ?? "";
    if (k) config[k] = v;
  }
  return config;
}

export async function setConfigValue(key: string, value: string): Promise<void> {
  const recordId = CONFIG_RECORDS[key];
  if (!recordId) throw new Error(`Unknown config key: ${key}`);
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: airtableHeaders(),
    body: JSON.stringify({ fields: { [FIELD_VAL]: value } }),
  });
  if (!res.ok) throw new Error(`Airtable PATCH failed: ${res.status}`);
}
