"use client";

import { useEffect, useState, useCallback } from "react";
import {
  currentData as mockCurrent,
  lastWeekData,
  lastYearData,
  checkObjectives,
  getHighPct,
  getMediumPct,
  getLowPct,
  OBJECTIVES,
  PeriodData,
} from "@/lib/data";
import ObjectiveBadge from "@/components/ObjectiveBadge";
import ComparisonChart from "@/components/ComparisonChart";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";
import ObjectiveEvolution from "@/components/ObjectiveEvolution";
import SalesAnalytics from "@/components/SalesAnalytics";
import { Target, Settings, RefreshCw, AlertCircle, Radio } from "lucide-react";
import Link from "next/link";

interface StreakBreakdown {
  total: number;
  high: number;
  medium: number;
  low: number;
  unset: number;
  nextDueDatePct: number;
}

function breakdownToPeriodData(b: StreakBreakdown): PeriodData {
  return {
    label: "This Week (Live)",
    week: "Live",
    totalLeads: b.total,
    high: b.high,
    medium: b.medium,
    low: b.low,
    nextDueDateOnTime: b.nextDueDatePct,
  };
}

export default function Dashboard() {
  const [liveData, setLiveData]   = useState<PeriodData | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const fetchLive = useCallback(() => {
    setLoading(true);
    setLiveError(null);
    fetch("/api/streak-data")
      .then(async (r) => {
        const json = await r.json() as { error?: string };
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setLiveData(breakdownToPeriodData(json as unknown as StreakBreakdown));
      })
      .catch((e: Error) => setLiveError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  const currentData = liveData ?? mockCurrent;
  const isLive      = !!liveData;

  const objectives = checkObjectives(currentData);
  const metCount   = Object.values(objectives).filter((o) => o.met).length;
  const totalCount = Object.values(objectives).length;

  const weeklyChartData = [
    { name: "Last Week", High: getHighPct(lastWeekData),  Medium: getMediumPct(lastWeekData),  Low: getLowPct(lastWeekData)  },
    { name: "This Week", High: getHighPct(currentData),   Medium: getMediumPct(currentData),   Low: getLowPct(currentData)   },
  ];
  const yearlyChartData = [
    { name: "Last Year", High: getHighPct(lastYearData),  Medium: getMediumPct(lastYearData),  Low: getLowPct(lastYearData)  },
    { name: "This Week", High: getHighPct(currentData),   Medium: getMediumPct(currentData),   Low: getLowPct(currentData)   },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Analysis</h1>
          <p className="text-sm text-gray-500 mt-1">Deep priority objectives, weekly evolution, period comparisons</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live / mock badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
            isLive
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <Radio size={12} className={isLive ? "text-emerald-500" : "text-amber-500"} />
            {loading ? "Fetching…" : isLive ? `Live · ${currentData.totalLeads} leads` : "Demo data"}
          </div>

          <button
            onClick={fetchLive}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-400 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <Target size={18} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-700">
              Objectives met:{" "}
              <span className={metCount === totalCount ? "text-emerald-600" : "text-amber-600"}>
                {metCount}/{totalCount}
              </span>
            </span>
          </div>

          <Link
            href="/settings"
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-400 rounded-xl px-4 py-2 shadow-sm transition-colors text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <Settings size={16} />
            Settings
          </Link>
        </div>
      </div>

      {/* ── Error / unconfigured banner ─────────────────────────── */}
      {!loading && liveError && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <span className="font-semibold">Could not load live Streak data</span>
            {" — "}{liveError}
            {liveError.includes("/settings") && (
              <Link href="/settings" className="ml-1 underline font-medium">Open Settings</Link>
            )}
            <span className="block text-xs text-amber-600 mt-0.5">Showing demo data below.</span>
          </div>
        </div>
      )}

      {/* ── Objectives ─────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Objectives — Current Week
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <ObjectiveBadge label="High Priority"           value={objectives.highPriority.value}   target={objectives.highPriority.target}   met={objectives.highPriority.met} />
          <ObjectiveBadge label="Medium Priority"         value={objectives.mediumPriority.value} target={objectives.mediumPriority.target} met={objectives.mediumPriority.met} />
          <ObjectiveBadge label="Low Priority"            value={objectives.lowPriority.value}    target={objectives.lowPriority.target}    met={objectives.lowPriority.met} />
          <ObjectiveBadge label="Next Due Date Coverage"  value={objectives.nextDueDate.value}    target={objectives.nextDueDate.target}    met={objectives.nextDueDate.met} />
          <ObjectiveBadge label="High Leads (% of total)" value={objectives.highLeads.value}     target={objectives.highLeads.target}      met={objectives.highLeads.met}   unit="%" />
          <ObjectiveBadge label="Medium Leads Share"      value={objectives.mediumLeads.value}    target={objectives.mediumLeads.target}    met={objectives.mediumLeads.met} />
        </div>
      </section>

      {/* ── Week-over-week evolution ────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Week-over-week Evolution
        </h2>
        <WeeklyTrendChart />
      </section>

      {/* ── Objective progress & streaks ───────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Objective Progress &amp; Streaks
        </h2>
        <ObjectiveEvolution />
      </section>

      {/* ── Sales analytics: VP analysis, SWOT, monthly trends, hot/stale leads ── */}
      <section className="mb-8">
        <SalesAnalytics />
      </section>

      {/* ── Snapshot charts ────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Snapshot Charts
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ComparisonChart data={weeklyChartData} title="vs Last Week" />
          <ComparisonChart data={yearlyChartData} title="vs Last Year" />
        </div>
      </section>

      {/* ── Reference table ────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Objective Reference Table
        </h2>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-5 py-3 text-left">Metric</th>
                <th className="px-5 py-3 text-left">Target</th>
                <th className="px-5 py-3 text-right">Current</th>
                <th className="px-5 py-3 text-right">Last Week</th>
                <th className="px-5 py-3 text-right">Last Year</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { metric: "High Priority",   target: `> ${OBJECTIVES.highMin}%`,           current: objectives.highPriority.value,   lastWeek: getHighPct(lastWeekData),       lastYear: getHighPct(lastYearData),       met: objectives.highPriority.met },
                { metric: "Medium Priority", target: `> ${OBJECTIVES.mediumMin}%`,         current: objectives.mediumPriority.value, lastWeek: getMediumPct(lastWeekData),     lastYear: getMediumPct(lastYearData),     met: objectives.mediumPriority.met },
                { metric: "Low Priority",    target: `< ${OBJECTIVES.lowMax}%`,            current: objectives.lowPriority.value,    lastWeek: getLowPct(lastWeekData),        lastYear: getLowPct(lastYearData),        met: objectives.lowPriority.met },
                { metric: "Next Due Date",   target: `≥ ${OBJECTIVES.nextDueDateTarget}%`, current: objectives.nextDueDate.value,    lastWeek: lastWeekData.nextDueDateOnTime, lastYear: lastYearData.nextDueDateOnTime, met: objectives.nextDueDate.met },
                { metric: "High Leads %",    target: `≥ ${OBJECTIVES.highLeadsTarget}%`,   current: objectives.highLeads.value,      lastWeek: getHighPct(lastWeekData),       lastYear: getHighPct(lastYearData),       met: objectives.highLeads.met },
                { metric: "Medium Leads %",  target: `< ${OBJECTIVES.mediumLeadsMax}%`,    current: objectives.mediumLeads.value,    lastWeek: getMediumPct(lastWeekData),     lastYear: getMediumPct(lastYearData),     met: objectives.mediumLeads.met },
              ].map((row) => (
                <tr key={row.metric} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-700">{row.metric}</td>
                  <td className="px-5 py-3 text-gray-500">{row.target}</td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800">{row.current.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-right text-gray-500">{row.lastWeek.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-right text-gray-500">{row.lastYear.toFixed(1)}%</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${row.met ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {row.met ? "Met" : "Not Met"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
