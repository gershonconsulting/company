"use client";

import { Clock, AlertTriangle, ListChecks } from "lucide-react";
import {
  useAnalytics, LoadingShim, ErrorShim, KpiTile,
  StaleLead,
} from "@/components/analytics-shared";

function StaleLeadsTable({ rows, total }: { rows: StaleLead[]; total: number }) {
  if (rows.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5 flex items-center gap-3">
        <ListChecks size={18} className="text-emerald-600 shrink-0" />
        <div>
          <p className="font-bold text-emerald-800">No stale leads.</p>
          <p className="text-sm text-emerald-700">Every lead has been touched within the threshold. Nothing to remove.</p>
        </div>
      </div>
    );
  }
  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
          <tr>
            <th className="text-left py-2 font-bold">Lead</th>
            <th className="text-left py-2 font-bold">Stage</th>
            <th className="text-left py-2 font-bold">Priority</th>
            <th className="text-right py-2 font-bold">Days inactive</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.key} className="hover:bg-gray-50">
              <td className="py-2 pr-3 text-gray-800 font-medium">{r.name}</td>
              <td className="py-2 pr-3 text-gray-500">{r.stageName}</td>
              <td className="py-2 pr-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  r.priority === "High"   ? "bg-[color:var(--brand-light)] text-[color:var(--brand)]" :
                  r.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                  r.priority === "Low"    ? "bg-blue-100 text-blue-700" :
                                            "bg-gray-100 text-gray-500"
                }`}>{r.priority}</span>
              </td>
              <td className="py-2 text-right tabular-nums text-amber-700 font-bold">{r.daysInactive}d</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > rows.length && (
        <p className="text-xs text-gray-400 mt-3">Showing {rows.length} of {total} stale leads</p>
      )}
    </>
  );
}

export default function WarningsPanel() {
  const { data, error, loading } = useAnalytics();
  if (loading) return <LoadingShim label="Loading warnings…" />;
  if (error)   return <ErrorShim message={error} />;
  if (!data)   return null;

  // Compute warning KPIs
  const stalePct       = data.totalLeads > 0 ? (data.staleLeadsTotal / data.totalLeads) * 100 : 0;
  const inClosing      = data.funnel.filter((f) => f.isClosing).reduce((s, f) => s + f.count, 0);
  const closingPct     = data.totalLeads > 0 ? (inClosing / data.totalLeads) * 100 : 0;
  const recentHigh     = data.monthlyHighIntake.slice(-3).reduce((s, d) => s + d.count, 0);
  const recentClose    = data.monthlyReachedClosing.slice(-3).reduce((s, d) => s + d.count, 0);

  const warnings: { tone: "bad" | "warn" | "info"; text: string }[] = [];
  if (stalePct > 25)                   warnings.push({ tone: "bad",  text: `${data.staleLeadsTotal} leads (${stalePct.toFixed(0)}%) untouched > ${data.staleThresholdDays}d. Cleanup overdue.` });
  else if (data.staleLeadsTotal > 0)   warnings.push({ tone: "warn", text: `${data.staleLeadsTotal} leads untouched > ${data.staleThresholdDays}d. Review the table below.` });
  if (closingPct < 5 && data.totalLeads > 20) warnings.push({ tone: "warn", text: `Closing stages hold less than 5% of pipeline (${closingPct.toFixed(0)}%). Push qualified leads forward.` });
  if (recentClose === 0 && data.totalLeads > 20) warnings.push({ tone: "bad", text: `Zero leads moved into closing in the last 3 months.` });
  if (recentHigh === 0) warnings.push({ tone: "warn", text: `No new High Priority intake in the last 3 months — refresh top-of-funnel.` });
  if (warnings.length === 0) warnings.push({ tone: "info", text: `Pipeline is in good shape — no critical warnings.` });

  const toneStyle = (t: string) => ({
    bad:  "bg-red-50    border-red-200    text-red-800",
    warn: "bg-amber-50  border-amber-200  text-amber-800",
    info: "bg-emerald-50 border-emerald-200 text-emerald-800",
  } as Record<string, string>)[t];

  return (
    <div className="flex flex-col gap-6">
      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiTile
          label="Stale Leads"
          value={data.staleLeadsTotal}
          accent={data.staleLeadsTotal > 0 ? "brand" : "green"}
          icon={<Clock size={16} className="text-[color:var(--brand)]" />}
          sub={<span className="text-gray-500">untouched &gt; {data.staleThresholdDays}d</span>}
        />
        <KpiTile
          label="Stale Share of Pipeline"
          value={`${stalePct.toFixed(0)}%`}
          accent={stalePct > 25 ? "brand" : stalePct > 10 ? "yellow" : "green"}
          icon={<AlertTriangle size={16} className="text-yellow-500" />}
          sub={<span className="text-gray-500">target &lt; 10%</span>}
        />
        <KpiTile
          label="Closing-Stage Share"
          value={`${closingPct.toFixed(0)}%`}
          accent={closingPct >= 5 ? "green" : "brand"}
          icon={<AlertTriangle size={16} className="text-blue-500" />}
          sub={<span className="text-gray-500">target ≥ 5%</span>}
        />
      </div>

      {/* Warning bullets */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
          <AlertTriangle size={16} className="text-[color:var(--brand)] mr-2" />
          What needs attention
        </h3>
        <ul className="space-y-2">
          {warnings.map((w, i) => (
            <li key={i} className={`flex items-start gap-2 px-3 py-2 rounded-md border ${toneStyle(w.tone)}`}>
              <span className="text-sm leading-relaxed">{w.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stale leads table */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
          <Clock size={16} className="text-[color:var(--brand)] mr-2" />
          Stale leads — sitting too long
          <span className="ml-auto text-xs font-normal text-gray-400">untouched &gt; {data.staleThresholdDays}d</span>
        </h3>
        <StaleLeadsTable rows={data.staleLeads} total={data.staleLeadsTotal} />
      </div>
    </div>
  );
}
