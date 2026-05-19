"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, AlertCircle, Database, Flame, Bell, AlertTriangle,
  Trophy, Clock, TrendingUp, TrendingDown, Layers, Activity, ArrowRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import InteractiveMonthlyBar from "@/components/InteractiveMonthlyBar";
import {
  useAnalytics, LoadingShim, ErrorShim, fmtMonth,
} from "@/components/analytics-shared";

interface StreakBreakdown {
  total: number;
  high: number;
  medium: number;
  low: number;
  unset: number;
  nextDueDatePct: number;
  priorityFieldName?: string | null;
}

function useBreakdown() {
  const [data,    setData]    = useState<StreakBreakdown | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true); setError(null);
    fetch("/api/streak-data", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json() as { error?: string } & StreakBreakdown;
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        setData(j as StreakBreakdown);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

function KpiTile({
  label, value, sub, accent, icon,
}: {
  label: string; value: string | number; sub?: React.ReactNode;
  accent: "brand" | "success" | "warning" | "danger" | "info" | "violet";
  icon: React.ReactNode;
}) {
  const accentBorder = {
    brand:   "border-[color:var(--brand)]",
    success: "border-[color:var(--success)]",
    warning: "border-[color:var(--warning)]",
    danger:  "border-[color:var(--danger)]",
    info:    "border-[color:var(--info)]",
    violet:  "border-[color:var(--violet)]",
  }[accent];
  return (
    <div className={`bg-white rounded-xl shadow p-5 border-t-4 ${accentBorder}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {sub && <div className="text-sm mt-1">{sub}</div>}
    </div>
  );
}

function DeltaBadge({ delta, suffix }: { delta: number; suffix?: string }) {
  const u = suffix ?? " vs last month";
  if (delta > 0) return <span className="text-emerald-600 font-medium flex items-center gap-1"><TrendingUp size={13} /> +{delta}{u}</span>;
  if (delta < 0) return <span className="text-red-600    font-medium flex items-center gap-1"><TrendingDown size={13} /> {delta}{u}</span>;
  return <span className="text-gray-500 font-medium">flat{u}</span>;
}

export default function Dashboard() {
  const bd     = useBreakdown();
  const an     = useAnalytics();
  const ready  = !!bd.data && !!an.data;

  // Computed numbers
  const total              = bd.data?.total ?? 0;
  const activePct          = bd.data?.nextDueDatePct ?? 0;
  const activeCount        = total > 0 ? Math.round((activePct / 100) * total) : 0;
  const reachedClosingNow  = an.data?.monthlyReachedClosing.at(-1)?.count ?? 0;
  const reachedClosingPrev = an.data?.monthlyReachedClosing.at(-2)?.count ?? 0;
  const newNow             = an.data?.monthlyAllIntake.at(-1)?.count ?? 0;
  const newPrev            = an.data?.monthlyAllIntake.at(-2)?.count ?? 0;
  const removedNow         = an.data?.monthlyRemoved.at(-1)?.count ?? 0;
  const removedPrev        = an.data?.monthlyRemoved.at(-2)?.count ?? 0;
  const stale              = an.data?.staleLeadsTotal ?? 0;
  const hotLeads           = an.data?.hotLeads ?? [];
  const staleLeads         = an.data?.staleLeads ?? [];
  const inClosing          = an.data?.funnel.filter((f) => f.isClosing).reduce((s, f) => s + f.count, 0) ?? 0;
  const monthLabel         = an.data ? fmtMonth(an.data.monthlyAllIntake.at(-1)?.month ?? "") : "this month";

  const priorityData = bd.data ? [
    { name: "High",   value: bd.data.high,   fill: "#dc2626" },
    { name: "Medium", value: bd.data.medium, fill: "#f59e0b" },
    { name: "Low",    value: bd.data.low,    fill: "#6366f1" },
    { name: "Unset",  value: bd.data.unset,  fill: "#94a3b8" },
  ].filter((d) => d.value > 0) : [];

  const funnel = an.data?.funnel ?? [];

  return (
    <main className="min-h-screen p-6 md:p-10">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-[color:var(--brand)]" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Sales Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Where your pipeline stands today, what changed this month, and what needs attention.</p>
          </div>
        </div>
        <button
          onClick={() => { bd.reload(); window.location.reload(); }}
          disabled={bd.loading || an.loading}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] rounded-full px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={14} className={bd.loading || an.loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {bd.error && <ErrorShim message={bd.error} />}
      {an.error && <ErrorShim message={an.error} />}
      {(bd.loading || an.loading) && <LoadingShim label="Loading pipeline…" />}

      {ready && (
        <div className="flex flex-col gap-8">

          {/* ── Tier 1: Hero KPIs ─────────────────────────────────────── */}
          <section>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">At a glance</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiTile
                label="Active Leads"
                value={total}
                accent="brand"
                icon={<Database size={16} className="text-[color:var(--brand)]" />}
                sub={<span className="text-gray-500">{inClosing} in closing stages</span>}
              />
              <KpiTile
                label={`New in ${monthLabel}`}
                value={newNow}
                accent="info"
                icon={<TrendingUp size={16} className="text-[color:var(--info)]" />}
                sub={<DeltaBadge delta={newNow - newPrev} />}
              />
              <KpiTile
                label={`Reached Closing in ${monthLabel}`}
                value={reachedClosingNow}
                accent="success"
                icon={<Trophy size={16} className="text-[color:var(--success)]" />}
                sub={<DeltaBadge delta={reachedClosingNow - reachedClosingPrev} />}
              />
              <KpiTile
                label="Active Follow-ups"
                value={activeCount}
                accent={activePct >= 50 ? "success" : activePct >= 25 ? "warning" : "danger"}
                icon={<Bell size={16} className="text-[color:var(--warning)]" />}
                sub={<span className="text-gray-500">{activePct}% of pipeline · target ≥ 50%</span>}
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 max-w-3xl">
              <strong className="text-gray-700">What this tells you:</strong>{" "}
              you have <strong>{total}</strong> active leads, you added <strong>{newNow}</strong> this month
              ({(newNow - newPrev) >= 0 ? "+" : ""}{newNow - newPrev} vs last), and <strong>{activePct}%</strong> have an active follow-up.
              {activePct < 50 && " Most leads have no scheduled touch — schedule next steps in Streak."}
            </p>
          </section>

          {/* ── Tier 2: Where the pipeline is ────────────────────────── */}
          <section>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">Where your pipeline is</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Funnel */}
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
                  <Layers size={16} className="text-[color:var(--brand)] mr-2" />
                  Funnel by stage
                </h3>
                <p className="text-xs text-gray-400 mb-3">Where leads are stacked today. Trophy = closing stage.</p>
                <div className="space-y-1.5">
                  {funnel.map((f) => {
                    const max = Math.max(1, ...funnel.map((x) => x.count));
                    return (
                      <div key={f.stageKey} className="flex items-center gap-3 text-sm">
                        <div className="w-28 truncate text-gray-700 flex items-center gap-1">
                          {f.isClosing && <Trophy size={11} className="text-emerald-500 shrink-0" />}
                          {f.stageName}
                        </div>
                        <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden relative">
                          <div className={`h-full ${f.isClosing ? "bg-emerald-500" : "bg-[color:var(--brand)]"}`}
                               style={{ width: `${(f.count / max) * 100}%` }} />
                          <div className="absolute inset-0 flex items-center justify-end pr-2">
                            <span className="text-xs font-bold text-gray-700 tabular-nums">{f.count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  <strong className="text-gray-700">Read:</strong> {inClosing} leads are in closing stages — these are your shortest-path revenue.
                </p>
              </div>

              {/* Priority donut */}
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
                  <Flame size={16} className="text-[color:var(--brand)] mr-2" />
                  Priority distribution
                </h3>
                <p className="text-xs text-gray-400 mb-3">How leads break out by Priority tag in Streak.</p>
                <div style={{ width: "100%", height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={priorityData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {priorityData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                      <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  <strong className="text-gray-700">Read:</strong>{" "}
                  High = <strong className="text-red-700">{bd.data?.high}</strong>,
                  Medium = <strong className="text-amber-700">{bd.data?.medium}</strong>,
                  Low = <strong className="text-[color:var(--brand)]">{bd.data?.low}</strong>.
                  {bd.data && total > 0 && (bd.data.high / total) < 0.1 && " High Priority is thin — focus qualification."}
                </p>
              </div>
            </div>
          </section>

          {/* ── Tier 3: How we're trending ──────────────────────────── */}
          <section>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">How you're trending</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
                  <TrendingUp size={16} className="text-[color:var(--info)] mr-2" />
                  New leads — by month
                </h3>
                <p className="text-xs text-gray-400 mb-3">How many leads enter the pipeline each month (all priorities). Click a bar for the leads behind it.</p>
                <InteractiveMonthlyBar data={an.data!.monthlyAllIntake} color="#6366f1" metric="intake" height={200} />
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
                  <Trophy size={16} className="text-[color:var(--success)] mr-2" />
                  Reached closing — by month
                </h3>
                <p className="text-xs text-gray-400 mb-3">Leads currently in closing stages, by last-touch month.</p>
                <InteractiveMonthlyBar data={an.data!.monthlyReachedClosing} color="#10b981" metric="closing" height={200} />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3 max-w-4xl">
              <strong className="text-gray-700">Read:</strong>{" "}
              Net pipeline change in {monthLabel}: <strong className={(newNow - removedNow) >= 0 ? "text-emerald-700" : "text-red-700"}>
                {(newNow - removedNow) >= 0 ? "+" : ""}{newNow - removedNow}
              </strong>{" "}
              ({newNow} added, {removedNow} removed). Removed (recycled) is{" "}
              <DeltaBadge delta={removedNow - removedPrev} />.
            </p>
          </section>

          {/* ── Tier 4: Needs attention ─────────────────────────────── */}
          <section>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">What needs attention</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Hot leads */}
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
                  <Flame size={16} className="text-[color:var(--success)] mr-2" />
                  Hot leads — push these this week
                  <span className="ml-auto text-xs font-normal text-gray-400">top {Math.min(5, hotLeads.length)} of {hotLeads.length}</span>
                </h3>
                <p className="text-xs text-gray-400 mb-3">High priority leads with the most recent activity.</p>
                {hotLeads.length === 0 ? (
                  <p className="text-sm text-gray-400">No hot leads found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-200">
                      <tr><th className="text-left py-2 font-bold">Lead</th><th className="text-left py-2 font-bold">Stage</th><th className="text-right py-2 font-bold">Days</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {hotLeads.slice(0, 5).map((r) => (
                        <tr key={r.key} className="hover:bg-gray-50">
                          <td className="py-1.5 pr-3 text-gray-800 font-medium">{r.name}</td>
                          <td className="py-1.5 pr-3 text-gray-500">{r.stageName}</td>
                          <td className="py-1.5 text-right tabular-nums">{r.daysSinceTouch}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Stale leads */}
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-1 flex items-center">
                  <Clock size={16} className="text-[color:var(--danger)] mr-2" />
                  Stale leads — clean up
                  <span className="ml-auto text-xs font-normal text-gray-400">{stale} total · untouched &gt; 90d</span>
                </h3>
                <p className="text-xs text-gray-400 mb-3">Leads sitting too long without a touch. Disqualify or re-engage.</p>
                {staleLeads.length === 0 ? (
                  <p className="text-sm text-gray-500">No stale leads — pipeline is clean.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-[10px] uppercase text-gray-500 border-b border-gray-200">
                      <tr><th className="text-left py-2 font-bold">Lead</th><th className="text-left py-2 font-bold">Stage</th><th className="text-right py-2 font-bold">Days</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {staleLeads.slice(0, 5).map((r) => (
                        <tr key={r.key} className="hover:bg-gray-50">
                          <td className="py-1.5 pr-3 text-gray-800 font-medium">{r.name}</td>
                          <td className="py-1.5 pr-3 text-gray-500">{r.stageName}</td>
                          <td className="py-1.5 text-right tabular-nums text-amber-700 font-bold">{r.daysInactive}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {staleLeads.length > 5 && (
                  <Link href="/warnings" className="inline-flex items-center gap-1 text-xs text-[color:var(--brand)] font-bold mt-3 hover:underline">
                    See all stale leads in Warnings <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* ── Tier 5: Quick links ─────────────────────────────────── */}
          <section>
            <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3">Go deeper</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Link href="/analysis"   className="bg-white rounded-xl shadow p-4 hover:border-[color:var(--brand)] hover:shadow-md border border-transparent transition-all flex items-center gap-2 text-sm font-bold text-gray-700">
                <Activity size={16} className="text-[color:var(--brand)]" /> Analysis →
              </Link>
              <Link href="/swot"       className="bg-white rounded-xl shadow p-4 hover:border-[color:var(--brand)] hover:shadow-md border border-transparent transition-all flex items-center gap-2 text-sm font-bold text-gray-700">
                <Layers size={16} className="text-[color:var(--brand)]" /> SWOT →
              </Link>
              <Link href="/warnings"   className="bg-white rounded-xl shadow p-4 hover:border-[color:var(--brand)] hover:shadow-md border border-transparent transition-all flex items-center gap-2 text-sm font-bold text-gray-700">
                <AlertTriangle size={16} className="text-[color:var(--brand)]" /> Warnings →
              </Link>
              <Link href="/reports"    className="bg-white rounded-xl shadow p-4 hover:border-[color:var(--brand)] hover:shadow-md border border-transparent transition-all flex items-center gap-2 text-sm font-bold text-gray-700">
                <AlertCircle size={16} className="text-[color:var(--brand)]" /> Monthly Reports →
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
