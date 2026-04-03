"use client";

import {
  currentData,
  lastWeekData,
  lastYearData,
  checkObjectives,
  getHighPct,
  getMediumPct,
  getLowPct,
  OBJECTIVES,
} from "@/lib/data";
import ObjectiveBadge from "@/components/ObjectiveBadge";
import PeriodCard from "@/components/PeriodCard";
import ComparisonChart from "@/components/ComparisonChart";
import WeeklyTrendChart from "@/components/WeeklyTrendChart";
import ObjectiveEvolution from "@/components/ObjectiveEvolution";
import { Target } from "lucide-react";

export default function Dashboard() {
  const objectives = checkObjectives(currentData);

  const weeklyChartData = [
    { name: "Last Week", High: getHighPct(lastWeekData), Medium: getMediumPct(lastWeekData), Low: getLowPct(lastWeekData) },
    { name: "This Week", High: getHighPct(currentData),  Medium: getMediumPct(currentData),  Low: getLowPct(currentData)  },
  ];

  const yearlyChartData = [
    { name: "Last Year", High: getHighPct(lastYearData), Medium: getMediumPct(lastYearData), Low: getLowPct(lastYearData) },
    { name: "This Week", High: getHighPct(currentData),  Medium: getMediumPct(currentData),  Low: getLowPct(currentData)  },
  ];

  const metCount   = Object.values(objectives).filter((o) => o.met).length;
  const totalCount = Object.values(objectives).length;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Priority Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Objectives tracking · Week of April 3, 2026</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <Target size={18} className="text-indigo-500" />
          <span className="text-sm font-semibold text-gray-700">
            Objectives met:{" "}
            <span className={metCount === totalCount ? "text-emerald-600" : "text-amber-600"}>
              {metCount}/{totalCount}
            </span>
          </span>
        </div>
      </div>

      {/* ── Objectives (current week) ───────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Objectives — Current Week
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <ObjectiveBadge label="High Priority"          value={objectives.highPriority.value}   target={objectives.highPriority.target}   met={objectives.highPriority.met} />
          <ObjectiveBadge label="Medium Priority"        value={objectives.mediumPriority.value} target={objectives.mediumPriority.target} met={objectives.mediumPriority.met} />
          <ObjectiveBadge label="Low Priority"           value={objectives.lowPriority.value}    target={objectives.lowPriority.target}    met={objectives.lowPriority.met} />
          <ObjectiveBadge label="Next Due Date Coverage" value={objectives.nextDueDate.value}    target={objectives.nextDueDate.target}    met={objectives.nextDueDate.met} />
          <ObjectiveBadge label="High Leads (% of total)" value={objectives.highLeads.value}    target={objectives.highLeads.target}      met={objectives.highLeads.met}   unit="%" />
          <ObjectiveBadge label="Medium Leads Share"     value={objectives.mediumLeads.value}    target={objectives.mediumLeads.target}    met={objectives.mediumLeads.met} />
        </div>
      </section>

      {/* ── Week-over-week evolution (NEW) ─────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Week-over-week Evolution
        </h2>
        <WeeklyTrendChart />
      </section>

      {/* ── Objective progress tracker (NEW) ───────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Objective Progress &amp; Streaks
        </h2>
        <ObjectiveEvolution />
      </section>

      {/* ── Period comparison cards ─────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Period Snapshot Comparison
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PeriodCard data={currentData} />
          <PeriodCard data={currentData} compareWith={lastWeekData} compareLabel="last week" />
          <PeriodCard data={currentData} compareWith={lastYearData} compareLabel="last year" />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Left: current · Center: vs last week · Right: vs last year (deltas shown)
        </p>
      </section>

      {/* ── Bar charts ─────────────────────────────────────────── */}
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
                { metric: "High Priority",   target: `> ${OBJECTIVES.highMin}%`,           current: objectives.highPriority.value,   lastWeek: getHighPct(lastWeekData),   lastYear: getHighPct(lastYearData),   met: objectives.highPriority.met },
                { metric: "Medium Priority", target: `> ${OBJECTIVES.mediumMin}%`,         current: objectives.mediumPriority.value, lastWeek: getMediumPct(lastWeekData), lastYear: getMediumPct(lastYearData), met: objectives.mediumPriority.met },
                { metric: "Low Priority",    target: `< ${OBJECTIVES.lowMax}%`,            current: objectives.lowPriority.value,    lastWeek: getLowPct(lastWeekData),    lastYear: getLowPct(lastYearData),    met: objectives.lowPriority.met },
                { metric: "Next Due Date",   target: `≥ ${OBJECTIVES.nextDueDateTarget}%`, current: objectives.nextDueDate.value,    lastWeek: lastWeekData.nextDueDateOnTime, lastYear: lastYearData.nextDueDateOnTime, met: objectives.nextDueDate.met },
                { metric: "High Leads %",    target: `≥ ${OBJECTIVES.highLeadsTarget}%`,   current: objectives.highLeads.value,      lastWeek: getHighPct(lastWeekData),   lastYear: getHighPct(lastYearData),   met: objectives.highLeads.met },
                { metric: "Medium Leads %",  target: `< ${OBJECTIVES.mediumLeadsMax}%`,    current: objectives.mediumLeads.value,    lastWeek: getMediumPct(lastWeekData), lastYear: getMediumPct(lastYearData), met: objectives.mediumLeads.met },
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
