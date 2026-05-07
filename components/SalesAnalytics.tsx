"use client";

import { useEffect, useState } from "react";
import {
  Flame, Clock, ArrowUpRight, ArrowDownRight,
  Filter, AlertTriangle, Trophy,
} from "lucide-react";

interface MonthlyTrend  { month: string; count: number; }
interface StaleLead     { key: string; name: string; stageName: string; priority: string; daysInactive: number; lastUpdated: string; }
interface HotLead       { key: string; name: string; stageName: string; daysSinceTouch: number; }
interface FunnelStage   { stageKey: string; stageName: string; count: number; isClosing: boolean; }

interface PipelineAnalytics {
  monthlyHighIntake:     MonthlyTrend[];
  monthlyReachedClosing: MonthlyTrend[];
  staleLeads:            StaleLead[];
  staleLeadsTotal:       number;
  hotLeads:              HotLead[];
  funnel:                FunnelStage[];
  totalLeads:            number;
  closingStageNames:     string[];
  staleThresholdDays:    number;
  monthsConsidered:      number;
}

function fmtMonth(m: string): string {
  const [y, mn] = m.split("-");
  if (!y || !mn) return m;
  const d = new Date(Number(y), Number(mn) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

// ── Mini bar chart ─────────────────────────────────────────────────────────
function BarSeries({ data, color, label }: { data: MonthlyTrend[]; color: string; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">{total} total · last {data.length} months</span>
      </div>
      <div className="flex items-end gap-1 h-32 overflow-hidden">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="text-xs text-gray-700 font-medium tabular-nums" style={{ visibility: d.count > 0 ? "visible" : "hidden" }}>
              {d.count}
            </div>
            <div className="w-full rounded-t-md transition-all" style={{
              height: `${(d.count / max) * 100}%`,
              minHeight: d.count > 0 ? 2 : 0,
              background: color,
              opacity: d.count === 0 ? 0.15 : 1,
            }} />
            <div className="text-[10px] text-gray-400 truncate w-full text-center">{fmtMonth(d.month)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Funnel rows ────────────────────────────────────────────────────────────
function Funnel({ funnel, total }: { funnel: FunnelStage[]; total: number }) {
  const max = Math.max(1, ...funnel.map((f) => f.count));
  return (
    <div className="flex flex-col gap-1.5">
      {funnel.map((f) => (
        <div key={f.stageKey} className="flex items-center gap-3">
          <div className="w-32 text-sm text-gray-700 font-medium truncate flex items-center gap-1.5">
            {f.isClosing && <Trophy size={12} className="text-emerald-500 shrink-0" />}
            {f.stageName}
          </div>
          <div className="flex-1 h-7 bg-gray-100 rounded-md overflow-hidden relative">
            <div
              className={`h-full transition-all ${f.isClosing ? "bg-emerald-500" : "bg-indigo-500"}`}
              style={{ width: `${(f.count / max) * 100}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-end pr-2">
              <span className="text-xs font-semibold text-gray-700 tabular-nums">
                {f.count} <span className="text-gray-400 font-normal">({total > 0 ? ((f.count / total) * 100).toFixed(0) : 0}%)</span>
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── VP of Sales narrative (rule-based) ─────────────────────────────────────
interface VpAnalysisProps {
  total: number;
  monthlyHighIntake: MonthlyTrend[];
  monthlyReachedClosing: MonthlyTrend[];
  staleLeadsTotal: number;
  staleThresholdDays: number;
  closingStageNames: string[];
  funnel: FunnelStage[];
}

function VPAnalysis(p: VpAnalysisProps) {
  const recentHigh = p.monthlyHighIntake.slice(-3).reduce((s, d) => s + d.count, 0);
  const prevHigh   = p.monthlyHighIntake.slice(-6, -3).reduce((s, d) => s + d.count, 0);
  const highTrend  = recentHigh - prevHigh;

  const recentClose = p.monthlyReachedClosing.slice(-3).reduce((s, d) => s + d.count, 0);
  const prevClose   = p.monthlyReachedClosing.slice(-6, -3).reduce((s, d) => s + d.count, 0);
  const closeTrend  = recentClose - prevClose;

  const inClosing      = p.funnel.filter((f) => f.isClosing).reduce((s, f) => s + f.count, 0);
  const earlyStageQty  = p.funnel.slice(0, 2).reduce((s, f) => s + f.count, 0);
  const closingPct     = p.total > 0 ? (inClosing / p.total) * 100 : 0;
  const stalePct       = p.total > 0 ? (p.staleLeadsTotal / p.total) * 100 : 0;

  const bullets: { tone: "good" | "warn" | "bad" | "neutral"; text: string }[] = [];

  bullets.push({ tone: "neutral",
    text: `Pipeline carries ${p.total} leads; ${inClosing} in closing stages (${closingPct.toFixed(0)}%).` });

  if (highTrend > 0)      bullets.push({ tone: "good", text: `High-priority intake is up: ${recentHigh} added in last 3 months vs ${prevHigh} in the prior 3.` });
  else if (highTrend < 0) bullets.push({ tone: "warn", text: `High-priority intake is slowing: ${recentHigh} added in last 3 months vs ${prevHigh} previously.` });

  if (closeTrend > 0)      bullets.push({ tone: "good", text: `Closing-stage entries are accelerating: ${recentClose} in last 3 months vs ${prevClose} previously.` });
  else if (closeTrend < 0) bullets.push({ tone: "warn", text: `Closing-stage entries are dropping: only ${recentClose} in the last 3 months vs ${prevClose} previously.` });

  if (stalePct > 25) bullets.push({ tone: "bad",
    text: `${p.staleLeadsTotal} leads (${stalePct.toFixed(0)}%) have been untouched for >${p.staleThresholdDays} days. Schedule a cleanup pass.` });
  else if (p.staleLeadsTotal > 0) bullets.push({ tone: "warn",
    text: `${p.staleLeadsTotal} leads untouched >${p.staleThresholdDays} days — review quickly to keep pipeline healthy.` });

  if (closingPct < 5 && p.total > 20) bullets.push({ tone: "warn",
    text: `Only ${closingPct.toFixed(0)}% of pipeline is in closing stages — push qualified leads forward.` });

  if (earlyStageQty > p.total * 0.6) bullets.push({ tone: "neutral",
    text: `Top-of-funnel is heavy (${earlyStageQty} early-stage leads). Make sure qualification capacity matches intake.` });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide">VP of Sales</span>
        <h3 className="text-sm font-semibold text-gray-900">Read of the pipeline</h3>
      </div>
      <ul className="space-y-2 text-sm">
        {bullets.map((b, i) => (
          <li key={i} className={`flex items-start gap-2 ${
            b.tone === "good" ? "text-emerald-700" :
            b.tone === "warn" ? "text-amber-700"   :
            b.tone === "bad"  ? "text-red-700"     : "text-gray-700"
          }`}>
            <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{
              background: b.tone === "good" ? "#10b981" : b.tone === "warn" ? "#f59e0b" : b.tone === "bad" ? "#ef4444" : "#6366f1"
            }} />
            <span>{b.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── SWOT (rule-based) ──────────────────────────────────────────────────────
function SWOT({ total, hotLeads, staleLeadsTotal, funnel, monthlyHighIntake, monthlyReachedClosing }: {
  total: number; hotLeads: HotLead[]; staleLeadsTotal: number; funnel: FunnelStage[];
  monthlyHighIntake: MonthlyTrend[]; monthlyReachedClosing: MonthlyTrend[];
}) {
  const inClosing  = funnel.filter((f) => f.isClosing).reduce((s, f) => s + f.count, 0);
  const recentHigh = monthlyHighIntake.slice(-3).reduce((s, d) => s + d.count, 0);
  const recentClose = monthlyReachedClosing.slice(-3).reduce((s, d) => s + d.count, 0);

  const strengths:     string[] = [];
  const weaknesses:    string[] = [];
  const opportunities: string[] = [];
  const threats:       string[] = [];

  if (hotLeads.length > 0) strengths.push(`${hotLeads.length} active high-priority leads with recent activity`);
  if (inClosing > 0)       strengths.push(`${inClosing} leads in closing stages — near-term revenue`);
  if (recentHigh > 0)      strengths.push(`${recentHigh} new high-priority leads in the last 3 months`);
  if (strengths.length === 0) strengths.push("Pipeline data is now clean enough to read — pickings to be made");

  if (staleLeadsTotal > 5) weaknesses.push(`${staleLeadsTotal} leads sitting untouched too long`);
  if (inClosing < total * 0.05 && total > 20) weaknesses.push(`Closing stages are thin (<5% of pipeline)`);
  if (recentClose === 0 && total > 20) weaknesses.push(`No leads moved into closing in the last 3 months`);
  if (weaknesses.length === 0) weaknesses.push("None obvious from the data — stay disciplined");

  if (recentHigh > recentClose && recentHigh > 0) opportunities.push(`More high-priority intake than closing entries — qualify aggressively`);
  if (funnel.slice(0, 2).reduce((s, f) => s + f.count, 0) > total * 0.4) opportunities.push("Top-of-funnel is rich — invest in qualification capacity");
  if (hotLeads.length >= 3) opportunities.push(`Top ${hotLeads.length} hot leads can be pushed to next stage this week`);
  if (opportunities.length === 0) opportunities.push("Open new top-of-funnel sources to grow intake");

  if (staleLeadsTotal > total * 0.3) threats.push(`>30% of pipeline is stale — risk of pipeline rot`);
  if (recentClose < monthlyReachedClosing.slice(-6, -3).reduce((s, d) => s + d.count, 0)) threats.push("Closing-stage velocity has dropped vs prior quarter");
  if (recentHigh < monthlyHighIntake.slice(-6, -3).reduce((s, d) => s + d.count, 0)) threats.push("High-priority intake is slowing");
  if (threats.length === 0) threats.push("None acute right now — maintain discipline");

  const Quad = ({ title, items, color, bg, border }: { title: string; items: string[]; color: string; bg: string; border: string }) => (
    <div className={`rounded-xl border ${border} ${bg} p-4`}>
      <div className={`text-xs font-bold uppercase tracking-wide mb-2 ${color}`}>{title}</div>
      <ul className="space-y-1.5 text-sm text-gray-700">
        {items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-gray-400">•</span><span>{it}</span></li>)}
      </ul>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Quad title="Strengths"     items={strengths}     color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
      <Quad title="Weaknesses"    items={weaknesses}    color="text-red-700"     bg="bg-red-50"     border="border-red-200" />
      <Quad title="Opportunities" items={opportunities} color="text-sky-700"     bg="bg-sky-50"     border="border-sky-200" />
      <Quad title="Threats"       items={threats}       color="text-amber-700"   bg="bg-amber-50"   border="border-amber-200" />
    </div>
  );
}

// ── Tables ─────────────────────────────────────────────────────────────────
function HotLeadsTable({ rows }: { rows: HotLead[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">No high-priority leads found.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-xs uppercase tracking-wide text-gray-400">
        <tr><th className="text-left pb-2">Lead</th><th className="text-left pb-2">Stage</th><th className="text-right pb-2">Days since touch</th></tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.key}>
            <td className="py-2 pr-3 text-gray-800 font-medium">{r.name}</td>
            <td className="py-2 pr-3 text-gray-500">{r.stageName}</td>
            <td className="py-2 text-right tabular-nums">
              <span className={r.daysSinceTouch < 7 ? "text-emerald-600 font-semibold" : r.daysSinceTouch < 30 ? "text-gray-700" : "text-amber-600"}>
                {r.daysSinceTouch}d
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StaleLeadsTable({ rows, total }: { rows: StaleLead[]; total: number }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">No stale leads — clean pipeline.</p>;
  return (
    <>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase tracking-wide text-gray-400">
          <tr><th className="text-left pb-2">Lead</th><th className="text-left pb-2">Stage</th><th className="text-left pb-2">Priority</th><th className="text-right pb-2">Days inactive</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="py-2 pr-3 text-gray-800 font-medium">{r.name}</td>
              <td className="py-2 pr-3 text-gray-500">{r.stageName}</td>
              <td className="py-2 pr-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                r.priority === "High"   ? "bg-red-100 text-red-700" :
                r.priority === "Medium" ? "bg-amber-100 text-amber-700" :
                r.priority === "Low"    ? "bg-sky-100 text-sky-700" :
                                          "bg-gray-100 text-gray-600"
              }`}>{r.priority}</span></td>
              <td className="py-2 text-right tabular-nums text-red-600 font-semibold">{r.daysInactive}d</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > rows.length && (
        <p className="text-xs text-gray-400 mt-2">Showing top {rows.length} of {total} stale leads.</p>
      )}
    </>
  );
}

// ── Main exported component ────────────────────────────────────────────────
export default function SalesAnalytics() {
  const [data,    setData]    = useState<PipelineAnalytics | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/streak-analytics", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json() as { error?: string } & PipelineAnalytics;
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setData(json as unknown as PipelineAnalytics);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-400 animate-pulse">Loading pipeline analytics…</div>;
  if (error)   return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
      <div>Could not load analytics — {error}</div>
    </div>
  );
  if (!data) return null;

  return (
    <div className="flex flex-col gap-8">

      {/* VP analysis */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Sales Read</h2>
        <VPAnalysis
          total={data.totalLeads}
          monthlyHighIntake={data.monthlyHighIntake}
          monthlyReachedClosing={data.monthlyReachedClosing}
          staleLeadsTotal={data.staleLeadsTotal}
          staleThresholdDays={data.staleThresholdDays}
          closingStageNames={data.closingStageNames}
          funnel={data.funnel}
        />
      </section>

      {/* SWOT */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">SWOT</h2>
        <SWOT
          total={data.totalLeads}
          hotLeads={data.hotLeads}
          staleLeadsTotal={data.staleLeadsTotal}
          funnel={data.funnel}
          monthlyHighIntake={data.monthlyHighIntake}
          monthlyReachedClosing={data.monthlyReachedClosing}
        />
      </section>

      {/* Monthly trends */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Monthly Movement</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={16} className="text-red-500" />
              <span className="text-xs uppercase font-semibold tracking-wide text-gray-500">High Priority Intake</span>
            </div>
            <BarSeries data={data.monthlyHighIntake} color="#ef4444" label="New High Priority leads / month" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Trophy size={16} className="text-emerald-500" />
              <span className="text-xs uppercase font-semibold tracking-wide text-gray-500">Reaching Closing Stages</span>
            </div>
            <BarSeries data={data.monthlyReachedClosing} color="#10b981" label={`Leads entering ${data.closingStageNames.join(" / ") || "closing"} / month`} />
          </div>
        </div>
      </section>

      {/* Funnel */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Pipeline Funnel</h2>
          <span className="text-xs text-gray-400 flex items-center gap-1"><Filter size={11} /> by current stage</span>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <Funnel funnel={data.funnel} total={data.totalLeads} />
        </div>
      </section>

      {/* Hot + Stale tables */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Flame size={16} className="text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-900">Hot leads</h3>
            <span className="text-xs text-gray-400">most-recent high-priority activity</span>
          </div>
          <HotLeadsTable rows={data.hotLeads} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-red-500" />
            <h3 className="text-sm font-semibold text-gray-900">Stale leads</h3>
            <span className="text-xs text-gray-400">untouched &gt; {data.staleThresholdDays}d, not in closing</span>
          </div>
          <StaleLeadsTable rows={data.staleLeads} total={data.staleLeadsTotal} />
        </div>
      </section>

    </div>
  );
}
