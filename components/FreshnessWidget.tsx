"use client";

import { useState, useMemo, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Zap, Clock, Snowflake, HelpCircle, ChevronUp } from "lucide-react";

interface FreshnessCounts {
  high:   number;
  medium: number;
  low:    number;
  stale:  number;
  never:  number;
  total:  number;
}

interface FreshnessLead {
  key: string;
  name: string;
  stageName: string;
  priority: string;
  daysSinceTouch: number;
  lastUpdated: string;
}

const BUCKETS = [
  { key: "high",   label: "Hot",     range: "≤ 7d",   color: "#10b981", icon: Zap        },
  { key: "medium", label: "Warm",    range: "8-30d",  color: "#6366f1", icon: Clock      },
  { key: "low",    label: "Cool",    range: "31-90d", color: "#f59e0b", icon: Clock      },
  { key: "stale",  label: "Stale",   range: "> 90d",  color: "#dc2626", icon: Snowflake  },
  { key: "never",  label: "Never",   range: "no touch", color: "#94a3b8", icon: HelpCircle },
] as const;

export default function FreshnessWidget({ counts }: { counts: FreshnessCounts }) {
  const [selected,     setSelected]     = useState<string | null>(null);
  const [leads,        setLeads]        = useState<FreshnessLead[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const data = useMemo(() => BUCKETS.map((b) => ({
    key:    b.key,
    label:  b.label,
    range:  b.range,
    color:  b.color,
    value:  counts[b.key as keyof FreshnessCounts] ?? 0,
  })), [counts]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    fetch(`/api/streak-analytics/freshness-leads?bucket=${selected}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json() as { error?: string; leads?: FreshnessLead[] };
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        setLeads(j.leads ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selected]);

  const workingPct = counts.total > 0
    ? Math.round(((counts.high + counts.medium) / counts.total) * 100)
    : 0;
  const coldPct    = counts.total > 0
    ? Math.round(((counts.low + counts.stale + counts.never) / counts.total) * 100)
    : 0;

  const workingTone = workingPct >= 50 ? "text-emerald-600" : workingPct >= 30 ? "text-amber-600" : "text-red-600";
  const coldTone    = coldPct >= 50    ? "text-red-600"    : coldPct >= 30    ? "text-amber-600" : "text-emerald-600";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-3 text-sm">
          <span>Working (≤ 30d): <strong className={workingTone}>{workingPct}%</strong></span>
          <span className="text-gray-300">·</span>
          <span>Cold (&gt; 30d): <strong className={coldTone}>{coldPct}%</strong></span>
        </div>
        <div className="text-xs text-gray-400">click a bar for the leads in that bucket</div>
      </div>
      <div style={{ width: "100%", height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
              labelStyle={{ fontWeight: 700, color: "#111" }}
              formatter={(v: number, _n, o: { payload?: { range?: string } }) => [`${v} leads · ${o?.payload?.range ?? ""}`, "count"]}
              cursor={{ fill: "rgba(99,102,241,0.06)" }}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              onClick={(d) => { if (d && d.key) setSelected((prev) => prev === d.key ? null : (d.key as string)); }}
              style={{ cursor: "pointer" }}
            >
              {data.map((d) => (
                <Cell
                  key={d.key}
                  fill={selected === d.key ? d.color : d.color}
                  fillOpacity={selected === null || selected === d.key ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selected && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mt-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-gray-800">
              {BUCKETS.find((b) => b.key === selected)?.label} bucket · <span className="text-gray-500 font-normal">{BUCKETS.find((b) => b.key === selected)?.range}</span>
              {!loading && !error && <span className="text-xs text-gray-500 font-normal ml-2">({leads.length})</span>}
            </div>
            <button onClick={() => { setSelected(null); setLeads([]); }} className="text-xs text-gray-500 hover:text-gray-800 font-bold flex items-center gap-1">
              <ChevronUp size={12} /> Hide
            </button>
          </div>
          {loading && <div className="text-sm text-gray-400">Loading…</div>}
          {error   && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && leads.length === 0 && <p className="text-sm text-gray-400">No leads in this bucket.</p>}
          {!loading && !error && leads.length > 0 && (
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200 sticky top-0 bg-gray-50">
                  <tr>
                    <th className="text-left py-2 font-bold">Lead</th>
                    <th className="text-left py-2 font-bold">Stage</th>
                    <th className="text-left py-2 font-bold">Priority</th>
                    <th className="text-right py-2 font-bold">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.slice(0, 100).map((l) => (
                    <tr key={l.key} className="hover:bg-white">
                      <td className="py-1.5 pr-3 text-gray-800 font-medium">{l.name}</td>
                      <td className="py-1.5 pr-3 text-gray-500">{l.stageName}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          l.priority === "High"   ? "bg-red-100 text-red-700" :
                          l.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                          l.priority === "Low"    ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-ink)]" :
                                                    "bg-gray-100 text-gray-500"
                        }`}>{l.priority}</span>
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{l.daysSinceTouch}d</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
