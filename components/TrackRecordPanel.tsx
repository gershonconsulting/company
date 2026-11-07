"use client";

import { useState } from "react";
import { History, Users, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from "recharts";
import { HISTORY_BENCHMARKS as B } from "@/lib/history-benchmarks";
import { newClientOutlook, survivalAt } from "@/lib/history-model";
import { fmtUSD } from "@/components/useActions";

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 tabular-nums mt-1">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
    </div>
  );
}

/**
 * Client track record (2021 → today) and what it implies for the pipeline:
 * how long a won client stays, what one is worth, and how many signings it
 * takes to hold or grow the client base.
 */
export default function TrackRecordPanel({ avgInvoice }: { avgInvoice: number | null }) {
  const nc = newClientOutlook();
  const [target, setTarget] = useState(15);
  const curve = Array.from({ length: 37 }, (_, m) => ({ m, pct: Math.round(survivalAt(m) * 100) }));
  const years = Object.entries(B.signingsByYear).map(([y, n]) => ({ y, n }));
  const fullYears = years.filter((x) => x.y !== "2026" && x.y !== "2021");
  const avgSignings = fullYears.reduce((a, x) => a + x.n, 0) / Math.max(1, fullYears.length);
  // Steady state: active clients ≈ signings per month × average lifetime (months).
  const steady = Math.round((avgSignings / 12) * B.lifetimeMeanMonths);
  const needPerMonth = Math.round((target / B.lifetimeMeanMonths) * 10) / 10;
  const clientValue = avgInvoice ? avgInvoice * nc.expectedMonths : null;

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center"><History size={16} className="text-[color:var(--brand)] mr-2" /> Client track record since 2021</h3>
      <p className="text-xs text-gray-400 mb-4">
        {B.clientsRun} client campaigns and {B.totalOpportunities.toLocaleString("en-US")} opportunities (Straight-in sheet, client.gershonCRM, finance roster; as of {B.asOf}). Retention counts clients still with us as still running.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat label="Average client lifetime" value={`${B.lifetimeMeanMonths} mo`} sub={`median ${B.lifetimeMedianMonths} months`} />
        <Stat label="Still with us after 6 / 12 mo" value={`${Math.round(B.retention["6"] * 100)}% / ${Math.round(B.retention["12"] * 100)}%`} sub={`${Math.round(B.retention["24"] * 100)}% after 2 years`} />
        <Stat label="Opportunities per client" value={`${B.oppsPerClientMonthMean} / mo`} sub={`median ${B.oppsPerClientMonthMedian} · ~${nc.expectedOpportunities} over a client's life`} />
        <Stat label="A new client is worth" value={clientValue ? fmtUSD(clientValue) : `~${nc.expectedMonths} mo`} sub={clientValue ? `avg invoice × ~${nc.expectedMonths} expected billed months` : "set Avg Invoice Value in Settings to see $"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-bold text-gray-600 mb-2">Share of clients still with us, by month</p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="m" tick={{ fontSize: 10 }} ticks={[0, 6, 12, 18, 24, 30, 36]} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} formatter={(v) => [`${v}%`, "still with us"]} labelFormatter={(m) => `Month ${m}`} />
                <ReferenceLine x={6} stroke="#cbd5e1" strokeDasharray="3 3" />
                <ReferenceLine x={12} stroke="#cbd5e1" strokeDasharray="3 3" />
                <Line type="linear" dataKey="pct" stroke="var(--series)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">The biggest drop is between months 3 and 6: that is where renewals are won or lost.</p>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-600 mb-2 flex items-center"><Users size={13} className="mr-1.5" /> New clients signed per year</p>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={years} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <XAxis dataKey="y" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 11 }} formatter={(v) => [v, "new clients"]} />
                <Bar dataKey="n" fill="var(--series)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">2026 is to {B.asOf}. At the 2022–2025 pace (~{Math.round(avgSignings)} a year) the client base settles around {steady} active clients.</p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <Target size={16} className="text-[color:var(--brand)]" />
        <span className="text-sm text-gray-700">To hold</span>
        <input type="number" min={1} max={100} value={target} onChange={(e) => setTarget(Math.max(1, Number(e.target.value) || 1))}
          className="w-16 border border-gray-200 rounded-md px-2 py-1 text-sm tabular-nums" aria-label="Target active clients" />
        <span className="text-sm text-gray-700">active clients, we need to sign about <b className="tabular-nums">{needPerMonth}</b> new clients a month (<b className="tabular-nums">{Math.round(needPerMonth * 12)}</b> a year){avgInvoice ? <> — about <b>{fmtUSD(target * avgInvoice)}</b> billed a month</> : null}.</span>
      </div>
    </div>
  );
}
