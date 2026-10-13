// Daily email-total snapshots in the SETTINGS KV namespace, so the dashboard
// can show EXACT emails exchanged per week (Streak only exposes running totals).
// One snapshot per UTC day, written the first time analytics runs that day.

import { getRequestContext } from "@cloudflare/next-on-pages";
import type { StreakBox } from "./streak";
import {
  buildSnapshot, emailsBetween,
  type EmailSnapshot, type MomentumExact,
} from "./momentum";

interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

const PREFIX     = "momentum:snap:";
const FIRST_KEY  = "momentum:first";
const TTL_SECS   = 120 * 86400;   // keep ~4 months of snapshots
const DAY        = 86_400_000;

function kv(): KV | null {
  try {
    const env = getRequestContext().env as unknown as { SETTINGS?: KV };
    return env?.SETTINGS ?? null;
  } catch {
    return null;
  }
}

async function read(store: KV, date: string): Promise<EmailSnapshot | null> {
  const raw = await store.get(PREFIX + date);
  if (!raw) return null;
  try { return JSON.parse(raw) as EmailSnapshot; } catch { return null; }
}

/** Find the snapshot closest to `daysAgo` (searching ±2 days). */
async function near(store: KV, now: number, daysAgo: number): Promise<EmailSnapshot | null> {
  for (const off of [0, -1, 1, -2, 2]) {
    const d = new Date(now - (daysAgo + off) * DAY).toISOString().slice(0, 10);
    const s = await read(store, d);
    if (s) return s;
  }
  return null;
}

export async function recordAndReadExact(boxes: StreakBox[], now = Date.now()): Promise<MomentumExact | undefined> {
  const store = kv();
  if (!store) return undefined;
  try {
    const today = buildSnapshot(boxes, now);
    const existing = await store.get(PREFIX + today.date);
    if (!existing) {
      await store.put(PREFIX + today.date, JSON.stringify(today), { expirationTtl: TTL_SECS });
    }
    let first = await store.get(FIRST_KEY);
    if (!first) {
      first = today.date;
      await store.put(FIRST_KEY, first);
    }

    const s7  = await near(store, now, 7);
    const s14 = await near(store, now, 14);
    const last7 = s7 ? emailsBetween(s7, today) : null;
    const prev7 = s7 && s14 ? emailsBetween(s14, s7) : null;

    return {
      trackingSince: first,
      emailsLast7:   last7 ? last7.total : null,
      emailsPrev7:   prev7 ? prev7.total : null,
      sentLast7:     last7 ? last7.sent : null,
      receivedLast7: last7 ? last7.received : null,
    };
  } catch {
    return undefined;   // never break the dashboard over tracking
  }
}
