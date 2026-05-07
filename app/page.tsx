"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw, AlertCircle, Radio, Database, Flame, Users, Bell,
  ArrowRight,
} from "lucide-react";

interface StreakBreakdown {
  total: number;
  high: number;
  medium: number;
  low: number;
  unset: number;
  nextDueDatePct: number;
  priorityFieldName?: string | null;
}

// ── KPI card (client.gershoncrm.com style: big number + goal progress bar) ──
interface KpiCardProps {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  unit?: string;
  caption: string;
  goal?: { label: string; pctOfGoal: number };
  href?: string;
}

function KpiCard({ title, icon, value, unit, caption, goal, href }: KpiCardProps) {
  const colorTier =
    !goal ? "neutral" :
    goal.pctOfGoal >= 80 ? "good" :
    goal.pctOfGoal >= 50 ? "warn" : "bad";

  const badgeClass = ({
    good:    "bg-emerald-100 text-emerald-700",
    warn:    "bg-amber-100   text-amber-700",
    bad:     "bg-red-100     text-red-700",
    neutral: "bg-gray-100    text-gray-700",
  } as const)[colorTier];

  const barClass = ({
    good:    "bg-emerald-500",
    warn:    "bg-amber-500",
    bad:     "bg-red-500",
    neutral: "bg-gray-400",
  } as const)[colorTier];

  const labelColor = ({
    good:    "text-emerald-600",
    warn:    "text-amber-600",
    bad:     "text-red-600",
    neutral: "text-gray-600",
  } as const)[colorTier];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <span className="text-indigo-500">{icon}</span>
          {title}
        </div>
        {goal && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
            {Math.round(goal.pctOfGoal)}% of goal
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</span>
        {unit && <span className="text-base text-gray-500">{unit}</span>}
      </div>
      <p className="text-xs text-gray-500 -mt-1">{caption}</p>

      {goal && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">{goal.label}</span>
            <span className={`text-xs font-semibold ${labelColor}`}>{Math.round(goal.pctOfGoal)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full ${barClass} transition-all`}
              style={{ width: `${Math.min(100, Math.max(0, goal.pctOfGoal))}%` }}
            />
          </div>
        </div>
      )}

      {href && (
        <Link
          href={href}
          className="mt-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          View Details <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data,    setData]    = useState<StreakBreakdown | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLive = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/streak-data", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json() as { error?: string } & StreakBreakdown;
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setData(json as unknown as StreakBreakdown);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);

  const isLive = !!data;
  const total       = data?.total          ?? 0;
  const highCount   = data?.high           ?? 0;
  const mediumCount = data?.medium         ?? 0;
  const lowCount    = data?.low            ?? 0;
  const unsetCount  = data?.unset          ?? 0;
  const dueDatePct  = data?.nextDueDatePct ?? 0;
  const prioritySetCount = total - unsetCount;
  const prioritySetPct   = total > 0 ? (prioritySetCount / total) * 100 : 0;

  // Goal: target % of total leads that should be HIGH priority
  const HIGH_TARGET_PCT = 10;
  const highPctOfPipeline = total > 0 ? (highCount / total) * 100 : 0;
  const highGoalPct       = (highPctOfPipeline / HIGH_TARGET_PCT) * 100;

  // Goal: target % coverage of due dates
  const DUE_TARGET_PCT = 50;
  const dueGoalPct = (dueDatePct / DUE_TARGET_PCT) * 100;

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8">

      {/* Header / status row */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Live status from Streak CRM · field-mapped to Priority dropdown
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
            isLive
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-amber-50 border-amber-200 text-amber-700"
          }`}>
            <Radio size={12} className={isLive ? "text-emerald-500" : "text-amber-500"} />
            {loading ? "Fetching…" : isLive ? `Live · ${total} leads` : "No data"}
          </div>
          <button
            onClick={fetchLive}
            disabled={loading}
            className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-400 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {!loading && error && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <span className="font-semibold">Could not load live Streak data</span>
            {" — "}{error}
            {error.includes("/settings") && (
              <Link href="/settings" className="ml-1 underline font-medium">Open Settings</Link>
            )}
          </div>
        </div>
      )}

      {!isLive && !error ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm text-center text-sm text-gray-500">
          {loading ? "Loading live pipeline…" : "Live pipeline not connected. Open Settings to add your Streak API key + pipeline."}
        </div>
      ) : isLive ? (
        <>
          {/* Top-level KPI cards (client.gershoncrm.com style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              title="Total Leads"
              icon={<Database size={16} />}
              value={total}
              caption="in pipeline now"
            />
            <KpiCard
              title="High Priority"
              icon={<Flame size={16} />}
              value={highCount}
              unit="leads"
              caption={`target: ≥${HIGH_TARGET_PCT}% of pipeline`}
              goal={{
                label: `Goal: ≥${HIGH_TARGET_PCT}% high`,
                pctOfGoal: highGoalPct,
              }}
            />
            <KpiCard
              title="Priority Coverage"
              icon={<Users size={16} />}
              value={prioritySetCount}
              unit={`/ ${total}`}
              caption={`${prioritySetPct.toFixed(0)}% of leads have priority set`}
              goal={{
                label: "Goal: 100% labeled",
                pctOfGoal: prioritySetPct,
              }}
            />
            <KpiCard
              title="Active Follow-ups"
              icon={<Bell size={16} />}
              value={Math.round(total * dueDatePct / 100)}
              unit="leads"
              caption={`${dueDatePct.toFixed(0)}% of pipeline has a next due date`}
              goal={{
                label: `Goal: ≥${DUE_TARGET_PCT}% covered`,
                pctOfGoal: dueGoalPct,
              }}
            />
          </div>

          {/* Priority distribution mini-cards */}
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Priority Distribution
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <KpiCard
              title="High"
              icon={<Flame size={16} />}
              value={highCount}
              unit="leads"
              caption={`${total > 0 ? ((highCount / total) * 100).toFixed(1) : "0"}% of pipeline`}
            />
            <KpiCard
              title="Medium"
              icon={<Flame size={16} />}
              value={mediumCount}
              unit="leads"
              caption={`${total > 0 ? ((mediumCount / total) * 100).toFixed(1) : "0"}% of pipeline`}
            />
            <KpiCard
              title="Low"
              icon={<Flame size={16} />}
              value={lowCount}
              unit="leads"
              caption={`${total > 0 ? ((lowCount / total) * 100).toFixed(1) : "0"}% of pipeline`}
            />
          </div>

          {/* Link to Analysis */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-indigo-900">Want the deep view?</h3>
              <p className="text-xs text-indigo-700 mt-0.5">Priority objectives, week-over-week trends, period comparisons, reference table.</p>
            </div>
            <Link
              href="/analysis"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              Open Analysis <ArrowRight size={14} />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
