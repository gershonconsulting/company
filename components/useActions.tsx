"use client";

import { useCallback, useEffect, useState } from "react";
import { useDemo } from "@/lib/demo-context";
import type { ActionsPayload, LeadAction, ActionKind } from "@/lib/actions";
import { ACTION_META } from "@/lib/actions";

export type { ActionsPayload, LeadAction, ActionKind };
export { ACTION_META };

export interface Me { email: string; name: string; role: "admin" | "agent"; }

export function useMe(): Me | null {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setMe).catch(() => {});
  }, []);
  return me;
}

export function useActions() {
  const { demoMode } = useDemo();
  const [data, setData]       = useState<ActionsPayload | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    if (demoMode) {
      import("@/lib/demo-actions").then((m) => { setData(m.demoActions()); setError(null); setLoading(false); });
      return;
    }
    setLoading(true); setError(null);
    fetch("/api/actions", { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json() as ActionsPayload & { error?: string };
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        setData(j);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [demoMode]);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, loading, reload };
}

export const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const TONE: Record<"red" | "amber" | "indigo", string> = {
  red:    "bg-red-50 text-red-700 border-red-200",
  amber:  "bg-amber-50 text-amber-800 border-amber-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function PriorityPill({ p }: { p: LeadAction["priority"] }) {
  const cls = p === "High" ? "bg-red-50 text-red-700" : p === "Medium" ? "bg-amber-50 text-amber-700" : p === "Low" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-500";
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{p}</span>;
}
