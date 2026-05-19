"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { ChevronDown, ChevronUp, ExternalLink, ListChecks, Loader2 } from "lucide-react";
import { fmtMonth, MonthlyTrend } from "@/components/analytics-shared";

export type Metric = "intake" | "highIntake" | "closing" | "removed";

interface DrillLead {
  key: string;
  name: string;
  stageName: string;
  priority: string;
  createdAt: string;
  lastStageChangeAt: string;
}

interface Props {
  data:         MonthlyTrend[];
  color:        string;     // hex color for bars
  metric:       Metric;     // for drill-down API
  title?:       string;
  averageLabel?: boolean;
  height?:      number;
}

const RANGES: { label: string; n: number }[] = [
  { label: "3 mo",  n: 3  },
  { label: "6 mo",  n: 6  },
  { label: "12 mo", n: 12 },
];

export default function InteractiveMonthlyBar({
  data, color, metric, title, averageLabel = true, height = 220,
}: Props) {
  const [rangeN,          setRangeN]          = useState(12);
  const [selectedMonth,   setSelectedMonth]   = useState<string | null>(null);
  const [leads,           setLeads]           = useState<DrillLead[]>([]);
  const [drillLoading,    setDrillLoading]    = useState(false);
  const [drillError,      setDrillError]      = useState<string | null>(null);

  const sliced = useMemo(() => data.slice(-rangeN).map((d) => ({ ...d, label: fmtMonth(d.month) })), [data, rangeN]);
  const total  = sliced.reduce((s, d) => s + d.count, 0);
  const avg    = sliced.length > 0 ? total / sliced.length : 0;

  async function loadDrill(month: string) {
    setSelectedMonth(month);
    setLeads([]);
    setDrillError(null);
    setDrillLoading(true);
    try {
      const r = await fetch(`/api/streak-analytics/leads?metric=${metric}&month=${encodeURIComponent(month)}`, { cache: "no-store" });
      const j = await r.json() as { error?: string; leads?: DrillLead[] };
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setLeads(j.leads ?? []);
    } catch (e) {
      setDrillError((e as Error).message);
    } finally {
      setDrillLoading(false);
    }
  }

  function toggle(month: string) {
    if (selectedMonth === month) {
      setSelectedMonth(null);
      setLeads([]);
    } else {
      loadDrill(month);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Range selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {title && <span className="text-xs text-gray-500 font-semibold mr-2">{title}</span>}
        <div className="flex gap-1 bg-gray-100 rounded-full p-1">
          {RANGES.map((r) => (
            <button
              key={r.n}
              onClick={() => { setRangeN(r.n); setSelectedMonth(null); }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                rangeN === r.n ? "bg-white text-[color:var(--brand)] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {averageLabel && (
          <span className="ml-auto text-xs text-gray-500">
            <strong className="text-gray-800">{total}</strong> total · ~<strong className="text-gray-800">{avg.toFixed(1)}</strong>/mo
          </span>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sliced} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={36}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
              labelStyle={{ fontWeight: 700, color: "#111" }}
              formatter={(v: number) => [v, "leads"]}
              cursor={{ fill: "rgba(254,27,4,0.06)" }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              onClick={(d) => { if (d && d.month) toggle(d.month as string); }}
              style={{ cursor: "pointer" }}
            >
              {sliced.map((d) => (
                <Cell
                  key={d.month}
                  fill={selectedMonth === d.month ? "#FE1B04" : color}
                  fillOpacity={selectedMonth === null || selectedMonth === d.month ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400">Tip: click any bar to see the leads behind it.</p>

      {/* Drill-down list */}
      {selectedMonth && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks size={14} className="text-[color:var(--brand)]" />
              <span className="text-sm font-bold text-gray-800">
                Leads · {fmtMonth(selectedMonth)}
              </span>
              {!drillLoading && !drillError && (
                <span className="text-xs text-gray-500">({leads.length})</span>
              )}
            </div>
            <button
              onClick={() => { setSelectedMonth(null); setLeads([]); }}
              className="text-xs text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1"
            >
              <ChevronUp size={12} /> Hide
            </button>
          </div>

          {drillLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" /> Loading…
            </div>
          )}
          {drillError && (
            <p className="text-sm text-red-600">{drillError}</p>
          )}
          {!drillLoading && !drillError && leads.length === 0 && (
            <p className="text-sm text-gray-400">No leads matched for this month.</p>
          )}
          {!drillLoading && !drillError && leads.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-2 font-bold">Lead</th>
                    <th className="text-left py-2 font-bold">Stage</th>
                    <th className="text-left py-2 font-bold">Priority</th>
                    <th className="text-left py-2 font-bold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((l) => (
                    <tr key={l.key} className="hover:bg-white">
                      <td className="py-1.5 pr-3 text-gray-800 font-medium">{l.name}</td>
                      <td className="py-1.5 pr-3 text-gray-500">{l.stageName}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          l.priority === "High"   ? "bg-[color:var(--brand-light)] text-[color:var(--brand)]" :
                          l.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                          l.priority === "Low"    ? "bg-blue-100 text-blue-700" :
                                                    "bg-gray-100 text-gray-500"
                        }`}>{l.priority}</span>
                      </td>
                      <td className="py-1.5 text-gray-500 tabular-nums text-xs">
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—"}
                      </td>
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

// Re-export an "Expand" hint icon so callers can teach users about the click-to-drill
export const DrillHint = () => (
  <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
    <ChevronDown size={10} /> click bar for details
  </span>
);
