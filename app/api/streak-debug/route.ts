import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { fetchPipelineBoxes, fetchPipelineSchema, resolvePipelineKey } from "@/lib/streak";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// Diagnostic-only endpoint: returns a sample of raw boxes + schema so we can
// identify which field actually stores the "Next Due Date" or follow-up date.
// Returns: list of all top-level keys observed across boxes (so we can see
// `reminderTimestamp`, `followupTimestamp`, etc.), plus all DATE-style custom
// fields from the schema, plus a sample of 3 boxes with all their fields populated.
export async function GET() {
  try {
    const config      = await getConfig();
    const apiKey      = config.STREAK_API_KEY;
    const pipelineKey = resolvePipelineKey(config.STREAK_PIPELINE_KEY ?? "");
    if (!apiKey || !pipelineKey) {
      return NextResponse.json({ error: "Streak credentials not set" }, { status: 400 });
    }

    const [schema, boxes] = await Promise.all([
      fetchPipelineSchema(apiKey, pipelineKey),
      fetchPipelineBoxes(apiKey, pipelineKey),
    ]);

    // Top-level keys observed across ALL boxes
    const topLevelKeys = new Set<string>();
    for (const b of boxes) {
      for (const k of Object.keys(b as object)) topLevelKeys.add(k);
    }

    // All schema fields, especially DATE / DATE_TIME ones
    interface Field {
      key: string;
      name: string;
      type: string;
    }
    const schemaFields = ((schema as { fields?: Field[] }).fields ?? []).map((f) => ({
      key: f.key,
      name: f.name,
      type: f.type,
    }));
    const dateFields = schemaFields.filter((f) =>
      /date|due|reminder|followup/i.test(f.name) ||
      /date/i.test(f.type)
    );

    // Sample 3 boxes with non-empty fields
    const sample = boxes.slice(0, 3).map((b) => {
      const fields = (b.fields ?? {}) as Record<string, unknown>;
      return {
        key:                  b.key,
        name:                 b.name,
        topLevel: {
          priority:                 (b as { priority?: unknown }).priority,
          reminderTimestamp:        (b as { reminderTimestamp?: unknown }).reminderTimestamp,
          followupTimestamp:        (b as { followupTimestamp?: unknown }).followupTimestamp,
          lastUpdatedTimestamp:     (b as { lastUpdatedTimestamp?: unknown }).lastUpdatedTimestamp,
          stageKey:                 (b as { stageKey?: unknown }).stageKey,
        },
        fieldKeys: Object.keys(fields),
        fieldsPreview: Object.fromEntries(Object.entries(fields).slice(0, 30)),
      };
    });

    // Count how many boxes have each of: reminderTimestamp, followupTimestamp,
    // and each DATE schema field populated
    const reminderCount  = boxes.filter((b) => !!(b as { reminderTimestamp?: number | null }).reminderTimestamp).length;
    const followupCount  = boxes.filter((b) => !!(b as { followupTimestamp?: number | null }).followupTimestamp).length;
    const customCounts: Record<string, number> = {};
    for (const f of dateFields) {
      customCounts[`${f.name} (key=${f.key}, type=${f.type})`] =
        boxes.filter((b) => {
          const v = (b.fields as Record<string, unknown> | undefined)?.[f.key];
          return v !== null && v !== undefined && v !== "" && v !== 0;
        }).length;
    }

    return NextResponse.json({
      totalBoxes: boxes.length,
      topLevelKeysObserved: Array.from(topLevelKeys).sort(),
      schemaFields,
      candidateDateFields: dateFields,
      counts: {
        reminderTimestamp_topLevel: reminderCount,
        followupTimestamp_topLevel: followupCount,
        ...customCounts,
      },
      sample,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
