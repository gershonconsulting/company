"use client";

import { Flame, Trophy, Layers, Calendar } from "lucide-react";
import InteractiveMonthlyBar from "@/components/InteractiveMonthlyBar";
import {
  useAnalytics, LoadingShim, ErrorShim, fmtMonth,
  MonthlyTrend, FunnelStage, HotLead,
} from "@/components/analytics-shared";

function Funnel({ funnel, total }: { funnel: FunnelStage[]; total: number }) {
  const max = Math.max(1, ...funnel.map((f) => f.count));
  return (
    <div className="space-y-2">
      {funnel.map((f) => (
        <div key={f.stageKey} className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-700 font-medium truncate flex items-center gap-1.5">
            {f.isClosing && <Trophy size={12} className="text-emerald-500 shrink-0" />}
            {f.stageName}
          </div>
          <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
            <div
              className={`h-full transition-all ${f.isClosing ? "bg-emerald-500" : "bg-[color:var(--brand)]"}`}
              style={{ width: `${(f.count / max) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-2">
              <span className="text-xs font-bold text-gray-700 tabular-nums">
                {f.count} <span className="text-gray-400 font-normal">({total > 0 ? ((f.count / total) * 100).toFixed(0) : 0}%)</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HotLeadsTable({ rows }: { rows: HotLead[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">No high-priority leads found.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
        <tr><th className="text-left py-2 font-bold">Lead</th><th className="text-left py-2 font-bold">Stage</th><th className="text-right py-2 font-bold">Days</th></tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.key} className="hover:bg-gray-50">
            <td className="py-2 pr-3 text-gray-800 font-medium">{r.name}</td>
            <td className="py-2 pr-3 text-gray-500">{r.stageName}</td>
            <td className="py-2 text-right tabular-nums">
              <span className={r.daysSinceTouch < 7 ? "text-emerald-600 font-bold" : r.daysSinceTouch < 30 ? "text-gray-700" : "text-amber-600"}>
                {r.daysSinceTouch}d
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AnalysisPanel() {
  const { data, error, loading } = useAnalytics();
  if (loading) return <LoadingShim label="Loading pipeline analytics…" />;
  if (error)   return <ErrorShim message={error} />;
  if (!data)   return null;

  const newLeadsTotal = data.monthlyAllIntake.reduce((s, d) => s + d.count, 0);
  const newLeadsAvg   = data.monthlyAllIntake.length > 0 ? newLeadsTotal / data.monthlyAllIntake.length : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Primary view: NEW LEADS per month (all priorities) */}
      <div className="bg-white rounded-xl shadow p-5 border-t-4 border-[color:var(--brand)]">
        <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
          <Flame size={16} className="text-[color:var(--brand)] mr-2" />
          New leads — by month
          <span className="ml-auto text-xs font-normal text-gray-400">last {data.monthlyAllIntake.length}mo · {newLeadsTotal} total · ~{newLeadsAvg.toFixed(1)}/mo</span>
        </h3>
        <p className="text-xs text-gray-400 mb-4">How many new leads we added to the pipeline each month (all priorities).</p>
        <InteractiveMonthlyBar data={data.monthlyAllIntake} color="#FE1B04" metric="intake" />
      </div>

      {/* Secondary: High Priority intake + Reached Closing side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
            <Flame size={16} className="text-[color:var(--brand)] mr-2" />
            New High Priority — by month
            <span className="ml-auto text-xs font-normal text-gray-400">last {data.monthlyHighIntake.length}mo</span>
          </h3>
          <p className="text-xs text-gray-400 mb-3">When new High Priority leads were added to the pipeline.</p>
          <InteractiveMonthlyBar data={data.monthlyHighIntake} color="#FE1B04" metric="highIntake" height={180} />
        </div>
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
            <Trophy size={16} className="text-emerald-500 mr-2" />
            Reached Closing — by month
            <span className="ml-auto text-xs font-normal text-gray-400">last {data.monthlyReachedClosing.length}mo</span>
          </h3>
          <p className="text-xs text-gray-400 mb-3">Leads currently in {data.closingStageNames.join(" / ") || "closing"} stages, by last-touch month.</p>
          <InteractiveMonthlyBar data={data.monthlyReachedClosing} color="#10B981" metric="closing" height={180} />
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
          <Layers size={16} className="text-[color:var(--brand)] mr-2" />
          Pipeline Funnel — by stage
        </h3>
        <Funnel funnel={data.funnel} total={data.totalLeads} />
      </div>

      {/* Hot leads */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
          <Calendar size={16} className="text-emerald-500 mr-2" />
          Hot leads
          <span className="ml-auto text-xs font-normal text-gray-400">most recent activity</span>
        </h3>
        <HotLeadsTable rows={data.hotLeads} />
      </div>
    </div>
  );
}
