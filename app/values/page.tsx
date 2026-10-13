"use client";

import Link from "next/link";
import { DollarSign, TrendingUp, Layers, Trophy, ExternalLink } from "lucide-react";
import { LoadingShim, ErrorShim } from "@/components/analytics-shared";
import { useActions, fmtUSD, PriorityPill } from "@/components/useActions";

function Tile({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 border-t-4" style={{ borderTopColor: color }}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1 tabular-nums">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

export default function ValuesPage() {
  const { data, error, loading } = useActions();
  const v = data?.value;
  const maxStage = v ? Math.max(1, ...v.byStage.map((s) => s.value)) : 1;
  const closingValue = v ? v.byStage.filter((s) => /proposal|negotiat|clos/i.test(s.stageName)).reduce((a, s) => a + s.value, 0) : 0;
  const live = v ? v.byStage.reduce((a, s) => a + s.count, 0) : 0;

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mb-6 flex items-center gap-3">
        <DollarSign size={24} className="text-[color:var(--brand)]" />
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pipeline Value</h1>
          <p className="text-sm text-gray-500 mt-1">What the pipeline is worth: client lifetime value × the chance each deal closes at its current stage.</p>
        </div>
      </div>

      {loading && <LoadingShim label="Valuing the pipeline…" />}
      {error && <ErrorShim message={error} />}

      {v && !loading && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile label="Weighted pipeline value" value={fmtUSD(v.total)} sub={`${live} live leads`} color="var(--brand)" />
            <Tile label="In closing stages" value={fmtUSD(closingValue)} sub="Proposal · Negotiating · Closing" color="var(--success)" />
            <Tile label="Client lifetime value" value={fmtUSD(v.clv)} sub={v.clvSource === "settings" ? "avg invoice × invoices per client" : "default — set averages in Settings"} color="var(--info)" />
            <Tile label="Avg value per live lead" value={fmtUSD(live ? v.total / live : 0)} sub="weighted" color="var(--violet)" />
          </div>
          <p className="text-xs text-gray-500 -mt-3">
            <strong className="text-gray-700">What this tells you:</strong> moving one deal from Pitched (30%) to Proposal Sent (45%) adds about{" "}
            <strong>{fmtUSD(v.clv * 0.15)}</strong> of expected value. Moving deals forward a stage is the fastest way to grow this number.
          </p>

          {/* By stage */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center"><Layers size={16} className="text-[color:var(--brand)] mr-2" /> Value by stage</h3>
            <p className="text-xs text-gray-400 mb-4">Win probability per stage × client lifetime value × number of leads.</p>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-200">
                <tr><th className="text-left py-2">Stage</th><th className="text-right py-2">Leads</th><th className="text-right py-2">Win prob.</th><th className="py-2 w-1/3" /><th className="text-right py-2">Value</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {v.byStage.map((s) => (
                  <tr key={s.stageName}>
                    <td className="py-2 pr-3 text-gray-800 font-medium">{s.stageName}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{s.count}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-500">{Math.round(s.prob * 100)}%</td>
                    <td className="py-2 pr-3">
                      <div className="h-4 bg-gray-100 rounded overflow-hidden">
                        <div className={`h-full ${/proposal|negotiat|clos/i.test(s.stageName) ? "bg-emerald-500" : "bg-[color:var(--brand)]"}`} style={{ width: `${(s.value / maxStage) * 100}%` }} />
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums font-bold">{fmtUSD(s.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top deals */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center"><Trophy size={16} className="text-[color:var(--success)] mr-2" /> Most valuable deals — protect these</h3>
            <p className="text-xs text-gray-400 mb-3">Highest expected value. Make sure each one has a dated next step.</p>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-200">
                <tr><th className="text-left py-2">Lead</th><th className="text-left py-2">Stage</th><th className="text-left py-2">Priority</th><th className="text-right py-2">Last touch</th><th className="text-right py-2">Value</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {v.top.map((l) => (
                  <tr key={l.key} className="hover:bg-gray-50">
                    <td className="py-2 pr-3">
                      <a href={l.url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-800 hover:text-[color:var(--brand)] inline-flex items-center gap-1">
                        {l.name} <ExternalLink size={11} className="text-gray-400" />
                      </a>
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{l.stageName}</td>
                    <td className="py-2 pr-3"><PriorityPill p={l.priority} /></td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${l.daysSinceTouch !== null && l.daysSinceTouch > 14 ? "text-red-700 font-bold" : "text-gray-600"}`}>
                      {l.daysSinceTouch !== null ? `${l.daysSinceTouch}d` : "—"}
                    </td>
                    <td className="py-2 text-right tabular-nums font-bold">{fmtUSD(l.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <TrendingUp size={12} />
            Stage win probabilities: Lead 5% · Contacted 10% · Scheduled 20% · Pitched 30% · Proposal 45% · Nurturing 10% · Negotiating 65% · Closing 85%.
            Averages come from <Link href="/settings" className="text-[color:var(--brand)] font-bold">Settings</Link>.
          </p>
        </div>
      )}
    </main>
  );
}
