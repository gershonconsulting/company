import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getConfig } from "@/lib/config";
import {
  fetchPipelineBoxes, fetchPipelineSchema, buildPriorityMapping, resolvePipelineKey,
} from "@/lib/streak";
import { buildStageMap } from "@/lib/analytics";
import { computeMomentum } from "@/lib/momentum";
import { computeActions, type ActionsPayload } from "@/lib/actions";

export const runtime = "edge";
export const dynamic = "force-dynamic";

interface KV { get(k: string): Promise<string | null>; put(k: string, v: string, o?: { expirationTtl?: number }): Promise<void>; }

// Daily objective snapshots → real week-over-week history on /objectives.
async function history(p: ActionsPayload): Promise<ActionsPayload["history"]> {
  try {
    const store = (getRequestContext().env as unknown as { SETTINGS: KV }).SETTINGS;
    const today = p.generatedAt.slice(0, 10);
    const values = Object.fromEntries(p.objectives.map((o) => [o.key, o.value]));
    if (!(await store.get(`obj:snap:${today}`))) {
      await store.put(`obj:snap:${today}`, JSON.stringify(values), { expirationTtl: 400 * 86400 });
    }
    // One point per week for the last 12 weeks (closest snapshot within ±3 days)
    const out: { date: string; values: Record<string, number> }[] = [];
    const now = Date.parse(p.generatedAt);
    for (let w = 11; w >= 0; w--) {
      for (const off of [0, 1, -1, 2, -2, 3, -3]) {
        const d = new Date(now - (w * 7 + off) * 86400000).toISOString().slice(0, 10);
        if (d > today) continue;
        const raw = d === today ? JSON.stringify(values) : await store.get(`obj:snap:${d}`);
        if (raw) { out.push({ date: d, values: JSON.parse(raw) }); break; }
      }
    }
    return out;
  } catch {
    return undefined;
  }
}

export async function GET() {
  try {
    const config = await getConfig();
    const apiKey = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) {
      return NextResponse.json({ error: "Streak credentials not set. Go to /settings." }, { status: 400 });
    }
    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);
    const stages  = buildStageMap(schema);
    const mapping = buildPriorityMapping(schema);
    const removed = new Set([...stages].filter(([, n]) => /recycl|lost|reject|archiv|dead/i.test(n)).map(([k]) => k));
    const momentum = computeMomentum(boxes, Date.now(), removed);
    const leadsM = momentum.metrics.find((m) => m.key === "leads");
    const inv = Number(config.AVG_INVOICE_VALUE) || 0;
    const cnt = Number(config.AVG_INVOICES_PER_CLIENT) || 0;
    const payload = computeActions(boxes, stages, mapping, inv && cnt ? inv * cnt : null, {
      leadsPerWeek: leadsM?.recentPerWeek ?? 0,
      leadsTarget:  leadsM?.targetPerWeek ?? 0,
    });
    payload.history = await history(payload);
    return NextResponse.json(payload);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
