"use client";

import { useEffect, useState } from "react";
import { useDemo } from "@/lib/demo-context";
import { DEMO_ANALYTICS } from "@/lib/demo-data";
import { AlertTriangle } from "lucide-react";

export interface MonthlyTrend  { month: string; count: number; }
export interface StaleLead     { key: string; name: string; stageName: string; priority: string; daysInactive: number; lastUpdated: string; }
export interface HotLead       { key: string; name: string; stageName: string; daysSinceTouch: number; }
export interface FunnelStage   { stageKey: string; stageName: string; count: number; isClosing: boolean; isRemoved?: boolean; }

export interface PipelineAnalytics {
  monthlyHighIntake:     MonthlyTrend[];
  monthlyAllIntake:      MonthlyTrend[];
  monthlyReachedClosing: MonthlyTrend[];
  monthlyRemoved:        MonthlyTrend[];
  staleLeads:            StaleLead[];
  staleLeadsTotal:       number;
  hotLeads:              HotLead[];
  funnel:                FunnelStage[];
  totalLeads:            number;
  closingStageNames:     string[];
  removedStageNames:     string[];
  staleThresholdDays:    number;
  monthsConsidered:      number;
}

export function fmtMonth(m: string): string {
  const [y, mn] = m.split("-");
  if (!y || !mn) return m;
  const d = new Date(Number(y), Number(mn) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

interface FetchState {
  data:    PipelineAnalytics | null;
  error:   string | null;
  loading: boolean;
}

export function useAnalytics(): FetchState {
  const { demoMode } = useDemo();
  const [data,    setData]    = useState<PipelineAnalytics | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoMode) {
      setData(DEMO_ANALYTICS);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setData(null);
    setError(null);
    fetch("/api/streak-analytics", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json() as { error?: string } & PipelineAnalytics;
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`);
        setData(json as unknown as PipelineAnalytics);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [demoMode]);

  return { data, error, loading };
}

export function LoadingShim({ label }: { label?: string }) {
  return <div className="text-sm text-gray-400 animate-pulse py-6">{label ?? "Loading…"}</div>;
}

export function ErrorShim({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border-l-4 border-[color:var(--brand)] p-6 rounded-lg flex items-start gap-3">
      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-[color:var(--brand)]" />
      <div>
        <p className="font-bold text-red-800">Could not load analytics</p>
        <p className="text-red-700 text-sm mt-1">{message}</p>
      </div>
    </div>
  );
}

// Generic KPI tile in the canonical client.gershoncrm.com style
export function KpiTile({
  label, value, sub, accent, icon,
}: {
  label: string; value: string | number; sub?: React.ReactNode;
  accent: "brand" | "blue" | "yellow" | "purple" | "green" | "red" | "indigo";
  icon?: React.ReactNode;
}) {
  const accentBorder = {
    brand:  "border-[color:var(--brand)]",
    blue:   "border-blue-500",
    yellow: "border-yellow-500",
    purple: "border-purple-500",
    green:  "border-green-500",
    red:    "border-red-500",
    indigo: "border-indigo-500",
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

// Page header used at the top of every tab page
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
