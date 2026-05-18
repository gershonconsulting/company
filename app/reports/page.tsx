"use client";

import { useState } from "react";
import { FileBarChart, TrendingUp, TrendingDown, Trophy, Trash2, PlusCircle } from "lucide-react";
import {
  useAnalytics, LoadingShim, ErrorShim, KpiTile, fmtMonth, MonthlyTrend,
} from "@/components/analytics-shared";

type Persona = "ceo" | "vp_sales" | "ops";

function thisMonthVsLast(series: MonthlyTrend[]): { now: number; prev: number; delta: number } {
  const n = series.length;
  if (n === 0) return { now: 0, prev: 0, delta: 0 };
  const now  = series[n - 1].count;
  const prev = n >= 2 ? series[n - 2].count : 0;
  return { now, prev, delta: now - prev };
}

function sumLastN(series: MonthlyTrend[], n: number): number {
  return series.slice(-n).reduce((s, d) => s + d.count, 0);
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) return (
    <span className="text-emerald-600 font-semibold text-sm flex items-center gap-1">
      <TrendingUp size={14} /> +{delta} vs last month
    </span>
  );
  if (delta < 0) return (
    <span className="text-red-600 font-semibold text-sm flex items-center gap-1">
      <TrendingDown size={14} /> {delta} vs last month
    </span>
  );
  return <span className="text-gray-500 font-medium text-sm">flat vs last month</span>;
}

function MonthlyBar({ series, color }: { series: MonthlyTrend[]; color: string }) {
  const max = Math.max(1, ...series.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 h-40">
      {series.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full">
          <div className="text-[10px] text-gray-600 font-semibold tabular-nums shrink-0" style={{ visibility: d.count > 0 ? "visible" : "hidden" }}>{d.count}</div>
          <div className="flex-1 w-full bg-gray-100 rounded-t-md relative min-h-0">
            <div className="absolute bottom-0 left-0 right-0 rounded-t-md transition-all" style={{ height: `${(d.count / max) * 100}%`, backgroundColor: color }} />
          </div>
          <div className="text-[10px] text-gray-400 truncate w-full text-center shrink-0">{fmtMonth(d.month)}</div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [persona, setPersona] = useState<Persona>("ceo");
  const { data, error, loading } = useAnalytics();

  const tabs: { key: Persona; label: string; icon: string }[] = [
    { key: "ceo",      label: "CEO — Pipeline Overview",   icon: "👔" },
    { key: "vp_sales", label: "VP Sales — Movement",       icon: "📣" },
    { key: "ops",      label: "Ops — Hygiene",             icon: "🧹" },
  ];

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <FileBarChart size={24} className="text-[color:var(--brand)]" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Monthly Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Plain-English recap of how the pipeline moved this month, by persona.</p>
          </div>
        </div>
      </div>

      {/* Persona tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setPersona(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors border ${
              persona === t.key
                ? "bg-[color:var(--brand)] text-white border-[color:var(--brand)] shadow-sm"
                : "bg-white text-gray-700 border-gray-200 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)]"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {loading && <LoadingShim label="Building report…" />}
      {error   && <ErrorShim message={error} />}

      {data && (() => {
        const newTotal      = thisMonthVsLast(data.monthlyAllIntake);
        const newHigh       = thisMonthVsLast(data.monthlyHighIntake);
        const reachedClose  = thisMonthVsLast(data.monthlyReachedClosing);
        const removed       = thisMonthVsLast(data.monthlyRemoved);
        const netChange     = newTotal.now - removed.now;

        const last12        = data.monthlyAllIntake[data.monthlyAllIntake.length - 1];
        const monthLabel    = last12 ? fmtMonth(last12.month) : "this month";

        if (persona === "ceo") {
          return (
            <div className="flex flex-col gap-6">
              {/* Narrative */}
              <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[color:var(--brand)]">
                <h3 className="text-sm font-bold text-gray-700 mb-3">What happened in {monthLabel}</h3>
                <p className="text-base text-gray-800 leading-relaxed">
                  We added <strong className="text-[color:var(--brand)]">{newTotal.now}</strong> new leads to the pipeline
                  {newTotal.delta !== 0 && (
                    <> (<span className={newTotal.delta > 0 ? "text-emerald-700" : "text-red-700"}>{newTotal.delta > 0 ? "+" : ""}{newTotal.delta}</span> vs last month)</>
                  )}
                  ; <strong>{newHigh.now}</strong> of those were tagged High Priority.
                  We pushed <strong className="text-emerald-700">{reachedClose.now}</strong> leads into closing stages and
                  retired <strong className="text-red-700">{removed.now}</strong> dead leads.
                  Net change in active pipeline: <strong className={netChange >= 0 ? "text-emerald-700" : "text-red-700"}>{netChange >= 0 ? "+" : ""}{netChange}</strong>.
                  Total active pipeline now stands at <strong>{data.totalLeads}</strong> leads.
                </p>
              </div>

              {/* KPI tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiTile
                  label="New Leads"
                  value={newTotal.now}
                  accent="brand"
                  icon={<PlusCircle size={16} className="text-[color:var(--brand)]" />}
                  sub={<DeltaBadge delta={newTotal.delta} />}
                />
                <KpiTile
                  label="New High Priority"
                  value={newHigh.now}
                  accent="red"
                  icon={<PlusCircle size={16} className="text-red-500" />}
                  sub={<DeltaBadge delta={newHigh.delta} />}
                />
                <KpiTile
                  label="Reached Closing"
                  value={reachedClose.now}
                  accent="green"
                  icon={<Trophy size={16} className="text-emerald-500" />}
                  sub={<DeltaBadge delta={reachedClose.delta} />}
                />
                <KpiTile
                  label="Removed / Recycled"
                  value={removed.now}
                  accent="yellow"
                  icon={<Trash2 size={16} className="text-amber-500" />}
                  sub={<DeltaBadge delta={removed.delta} />}
                />
              </div>

              {/* 12-month bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">New leads / month</h3>
                  <p className="text-xs text-gray-400 mb-3">Last 12 months · all priorities · {sumLastN(data.monthlyAllIntake, 12)} total</p>
                  <MonthlyBar series={data.monthlyAllIntake} color="#FE1B04" />
                </div>
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-1">Removed leads / month</h3>
                  <p className="text-xs text-gray-400 mb-3">{data.removedStageNames.length > 0 ? `Stages: ${data.removedStageNames.join(", ")}` : "No removed-style stages detected"} · {sumLastN(data.monthlyRemoved, 12)} total</p>
                  <MonthlyBar series={data.monthlyRemoved} color="#F59E0B" />
                </div>
              </div>

              {/* Month-by-month table */}
              <div className="bg-white rounded-xl shadow p-5 overflow-x-auto">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Month-by-month detail</h3>
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 font-bold">Month</th>
                      <th className="text-right py-2 font-bold">New Leads</th>
                      <th className="text-right py-2 font-bold">New High Pri</th>
                      <th className="text-right py-2 font-bold">Reached Closing</th>
                      <th className="text-right py-2 font-bold">Removed</th>
                      <th className="text-right py-2 font-bold">Net Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.monthlyAllIntake.map((row, i) => {
                      const newAll  = row.count;
                      const newHi   = data.monthlyHighIntake[i]?.count ?? 0;
                      const reached = data.monthlyReachedClosing[i]?.count ?? 0;
                      const rem     = data.monthlyRemoved[i]?.count ?? 0;
                      const net     = newAll - rem;
                      return (
                        <tr key={row.month} className="hover:bg-gray-50">
                          <td className="py-2 text-gray-800 font-medium">{fmtMonth(row.month)}</td>
                          <td className="py-2 text-right tabular-nums">{newAll}</td>
                          <td className="py-2 text-right tabular-nums text-[color:var(--brand)] font-semibold">{newHi}</td>
                          <td className="py-2 text-right tabular-nums text-emerald-700 font-semibold">{reached}</td>
                          <td className="py-2 text-right tabular-nums text-amber-700 font-semibold">{rem}</td>
                          <td className={`py-2 text-right tabular-nums font-bold ${net >= 0 ? "text-emerald-700" : "text-red-700"}`}>{net >= 0 ? "+" : ""}{net}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }

        if (persona === "vp_sales") {
          const reach3 = sumLastN(data.monthlyReachedClosing, 3);
          const reach6 = sumLastN(data.monthlyReachedClosing, 6);
          const newHi3 = sumLastN(data.monthlyHighIntake, 3);
          return (
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[color:var(--brand)]">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Sales movement (last 3 months)</h3>
                <p className="text-base text-gray-800 leading-relaxed">
                  In the last 3 months we generated <strong className="text-[color:var(--brand)]">{newHi3}</strong> new High Priority leads
                  and pushed <strong className="text-emerald-700">{reach3}</strong> leads into closing stages
                  ({reach6 > 0 ? `${Math.round((reach3 / reach6) * 100)}%` : "—"} of the trailing-6-month total).
                  Hot list shows <strong>{data.hotLeads.length}</strong> high-priority leads with recent activity worth pushing this week.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <KpiTile label="New High Priority (3mo)" value={newHi3}    accent="brand"  icon={<PlusCircle size={16} className="text-[color:var(--brand)]" />} />
                <KpiTile label="Reached Closing (3mo)"   value={reach3}    accent="green"  icon={<Trophy size={16} className="text-emerald-500" />} />
                <KpiTile label="Hot Leads to Push"       value={data.hotLeads.length} accent="yellow" icon={<TrendingUp size={16} className="text-amber-500" />} />
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Reaching closing — by month</h3>
                <MonthlyBar series={data.monthlyReachedClosing} color="#10B981" />
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Top hot leads</h3>
                {data.hotLeads.length === 0 ? (
                  <p className="text-sm text-gray-400">No hot leads right now.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                      <tr><th className="text-left py-2 font-bold">Lead</th><th className="text-left py-2 font-bold">Stage</th><th className="text-right py-2 font-bold">Days</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.hotLeads.map((r) => (
                        <tr key={r.key} className="hover:bg-gray-50">
                          <td className="py-2 text-gray-800 font-medium">{r.name}</td>
                          <td className="py-2 text-gray-500">{r.stageName}</td>
                          <td className="py-2 text-right tabular-nums">{r.daysSinceTouch}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        }

        // Ops
        const removed3 = sumLastN(data.monthlyRemoved, 3);
        const stalePct = data.totalLeads > 0 ? (data.staleLeadsTotal / data.totalLeads) * 100 : 0;
        return (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow p-5 border-l-4 border-[color:var(--brand)]">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Pipeline hygiene snapshot</h3>
              <p className="text-base text-gray-800 leading-relaxed">
                We retired <strong className="text-amber-700">{removed3}</strong> leads in the last 3 months
                (stages: {data.removedStageNames.join(", ") || "none configured"}).
                {" "}<strong>{data.staleLeadsTotal}</strong> active leads ({stalePct.toFixed(0)}% of pipeline) haven&apos;t been touched in &gt;{data.staleThresholdDays} days and likely need a cleanup pass.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <KpiTile label="Removed (3mo)"  value={removed3}              accent="yellow" icon={<Trash2 size={16} className="text-amber-500" />} />
              <KpiTile label="Stale Leads"    value={data.staleLeadsTotal} accent={data.staleLeadsTotal > 0 ? "brand" : "green"} icon={<TrendingDown size={16} className="text-[color:var(--brand)]" />} />
              <KpiTile label="Stale Share"    value={`${stalePct.toFixed(0)}%`} accent={stalePct > 25 ? "brand" : "green"} icon={<TrendingDown size={16} className="text-gray-500" />} />
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3">Removed leads — by month</h3>
              <MonthlyBar series={data.monthlyRemoved} color="#F59E0B" />
            </div>
          </div>
        )