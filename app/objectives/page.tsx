"use client";

import Link from "next/link";
import { Target, RefreshCw, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, ReferenceLine, Tooltip } from "recharts";
import { LoadingShim, ErrorShim } from "@/components/analytics-shared";
import { useActions } from "@/components/useActions";
import type { ObjectiveMetric } from "@/lib/actions";

function fmt(o: Pick<ObjectiveMetric, "unit">, v: number): string {
  return o.unit === "%" ? `${Math.round(v)}%` : o.unit === "/wk" ? `${v}/wk` : String(Math.round(v));
}

const FIX: Record<string, { text: string; href: string }> = {
  leadsPerWeek: { text: "Add new leads to the pipeline", href: "/" },
  worked30:     { text: "Work the going-cold list", href: "/today" },
  nextStep:     { text: "Add next steps", href: "/today" },
  waiting:      { text: "Reply to these prospects", href: "/today" },
  overdue:      { text: "Clear overdue tasks", href: "/today" },
  stale:        { text: "Re-engage or recycle", href: "/warnings" },
  highShare:    { text: "Qualify and tag priorities in Streak", href: "/today" },
};

export default function ObjectivesPage() {
  const { data, error, loading, reload } = useActions();
  const met = data ? data.objectives.filter((o) => o.met).length : 0;
  const hist = data?.history ?? [];
  const since = hist[0]?.date;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-[color:var(--brand)]" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Objectives</h1>
            <p className="text-sm text-gray-500 mt-1">The habits that keep the pipeline moving — live from Streak, with week-over-week history.</p>
          </div>
        </div>
        <button onClick={reload} disabled={loading}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] rounded-full px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && <LoadingShim label="Checking objectives…" />}
      {error && <ErrorShim message={error} />}

      {data && !loading && (
        <div className="flex flex-col gap-5">
          <div className={`rounded-xl p-4 border-l-4 ${met === data.objectives.length ? "bg-emerald-50 border-emerald-500" : "bg-amber-50 border-amber-500"}`}>
            <p className="text-lg font-extrabold text-gray-900">{met} of {data.objectives.length} objectives met</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {since ? `Weekly history recorded since ${since} — one point per week appears on each chart as it builds.` : "History starts today."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.objectives.map((o) => {
              const series = hist.map((h) => ({ date: h.date, v: h.values[o.key] ?? null }));
              const prev = series.length >= 2 ? series[series.length - 2].v : null;
              const delta = prev !== null ? o.value - (prev as number) : null;
              const good = delta === null ? null : o.direction === "min" ? delta >= 0 : delta <= 0;
              const fix = FIX[o.key];
              return (
                <div key={o.key} className={`bg-white rounded-xl shadow p-5 border-t-4 ${o.met ? "border-emerald-500" : "border-red-500"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-700">{o.label}</p>
                    {o.met
                      ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5"><CheckCircle2 size={12} /> Met</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 rounded-full px-2 py-0.5"><XCircle size={12} /> Not met</span>}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2">
                    <p className="text-3xl font-extrabold text-gray-900 tabular-nums">{fmt(o, o.value)}</p>
                    <p className="text-sm text-gray-500">target {o.direction === "min" ? "≥" : "≤"} {fmt(o, o.target)}</p>
                  </div>
                  {delta !== null && (
                    <p className={`text-xs font-bold mt-0.5 ${good ? "text-emerald-700" : "text-red-700"}`}>
                      {delta > 0 ? "+" : ""}{o.unit === "/wk" ? Math.round(delta * 10) / 10 : Math.round(delta)}{o.unit === "%" ? " pts" : ""} vs last week
                    </p>
                  )}
                  <div style={{ width: "100%", height: 60 }} className="mt-2">
                    {series.length >= 2 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                          <YAxis hide domain={["auto", "auto"]} />
                          <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} labelFormatter={(_, p) => (p?.[0]?.payload as { date?: string })?.date ?? ""} />
                          <ReferenceLine y={o.target} stroke="#94a3b8" strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="v" stroke={o.met ? "#10b981" : "#dc2626"} strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-[11px] text-gray-400 pt-4">Trend line appears after the second weekly snapshot.</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{o.help}</p>
                  {!o.met && fix && (
                    <Link href={fix.href} className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--brand)] mt-2 hover:underline">
                      {fix.text} <ArrowRight size={12} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
