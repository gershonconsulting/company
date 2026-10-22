"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ListTodo, ExternalLink, RefreshCw, User, Users } from "lucide-react";
import { LoadingShim, ErrorShim } from "@/components/analytics-shared";
import {
  useActions, useMe, ACTION_META, TONE, PriorityPill, type ActionKind,
} from "@/components/useActions";

const ORDER: ActionKind[] = ["reply", "overdue", "hot-open", "closing", "going-cold", "no-next-step"];

export default function TodayPage() {
  const { data, error, loading, reload } = useActions();
  const me = useMe();
  const [owner, setOwner] = useState<string>("all");   // "all" | "mine" | email
  const [kind, setKind]   = useState<ActionKind | "all">("all");
  const [showAll, setShowAll] = useState(false);

  const mineEmail = me?.email?.toLowerCase() ?? "";
  const rows = useMemo(() => {
    if (!data) return [];
    return data.leads.filter((l) => {
      if (owner === "mine" && !l.owners.includes(mineEmail)) return false;
      if (owner !== "all" && owner !== "mine" && !l.owners.includes(owner)) return false;
      if (kind !== "all" && !l.reasons.some((r) => r.kind === kind)) return false;
      return true;
    });
  }, [data, owner, kind, mineEmail]);

  const visible = showAll ? rows : rows.slice(0, 25);
  const mineCount = data ? data.leads.filter((l) => l.owners.includes(mineEmail)).length : 0;

  return (
    <main className="gx-page min-h-screen p-6 md:p-10">
      <div className="gx-page-head mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ListTodo size={24} className="text-[color:var(--brand)]" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Today</h1>
            <p className="text-sm text-gray-500 mt-1">Who to contact, why, and what to do — most urgent first. Click a lead to open it in Streak.</p>
          </div>
        </div>
        <button onClick={reload} disabled={loading}
          className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] rounded-full px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-40">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && <LoadingShim label="Building today's list…" />}
      {error && <ErrorShim message={error} />}

      {data && !loading && (
        <div className="flex flex-col gap-5">
          {/* Category tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {ORDER.map((k) => {
              const m = ACTION_META[k];
              const active = kind === k;
              return (
                <button key={k} onClick={() => setKind(active ? "all" : k)}
                  className={`text-left rounded-xl border p-3 transition-all ${active ? "ring-2 ring-[color:var(--brand)]" : ""} ${data.counts[k] > 0 ? TONE[m.tone] : "bg-white text-gray-400 border-gray-200"}`}>
                  <p className="text-2xl font-extrabold tabular-nums">{data.counts[k]}</p>
                  <p className="text-xs font-bold">{m.label}</p>
                </button>
              );
            })}
          </div>

          {/* Owner filter */}
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <button onClick={() => setOwner("all")}
              className={`rounded-full px-3 py-1.5 font-bold border ${owner === "all" ? "bg-[color:var(--brand)] text-white border-transparent" : "bg-white text-gray-700 border-gray-200"}`}>
              <Users size={13} className="inline mr-1" /> Everyone ({data.leads.length})
            </button>
            {me && (
              <button onClick={() => setOwner("mine")}
                className={`rounded-full px-3 py-1.5 font-bold border ${owner === "mine" ? "bg-[color:var(--brand)] text-white border-transparent" : "bg-white text-gray-700 border-gray-200"}`}>
                <User size={13} className="inline mr-1" /> My leads ({mineCount})
              </button>
            )}
            {data.owners.length > 0 && (
              <select value={owner === "all" || owner === "mine" ? "" : owner} onChange={(e) => setOwner(e.target.value || "all")}
                className="rounded-full px-3 py-1.5 border border-gray-200 bg-white text-gray-700 font-bold">
                <option value="">By owner…</option>
                {data.owners.map((o) => <option key={o.email} value={o.email}>{o.name} ({o.count})</option>)}
              </select>
            )}
            {kind !== "all" && (
              <button onClick={() => setKind("all")} className="text-xs text-[color:var(--brand)] font-bold hover:underline">Clear filter: {ACTION_META[kind].label} ×</button>
            )}
          </div>

          {/* List */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {rows.length === 0 ? (
              <p className="p-6 text-sm text-gray-500">Nothing to do here 🎉 — no leads match this filter.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {visible.map((l, i) => (
                  <li key={l.key} className="p-4 hover:bg-gray-50 flex gap-4 items-start">
                    <span className="text-xs font-bold text-gray-400 tabular-nums w-6 pt-1">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={l.url} target="_blank" rel="noopener noreferrer"
                          className="font-bold text-gray-900 hover:text-[color:var(--brand)] inline-flex items-center gap-1">
                          {l.name} <ExternalLink size={12} className="text-gray-400" />
                        </a>
                        <PriorityPill p={l.priority} />
                        <span className="text-xs text-gray-500">{l.stageName}</span>
                        {l.ownerNames.length > 0 && <span className="text-xs text-gray-400">· {l.ownerNames.join(", ")}</span>}
                      </div>
                      <ul className="mt-1.5 flex flex-col gap-1">
                        {l.reasons.map((r, j) => (
                          <li key={j} className="text-sm flex items-start gap-2 flex-wrap">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${TONE[ACTION_META[r.kind].tone]}`}>{ACTION_META[r.kind].label}</span>
                            <span className="text-gray-600">{r.text}</span>
                            <span className="text-gray-900 font-semibold">→ {r.todo}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="text-right text-xs text-gray-400 shrink-0 pt-1">
                      {l.daysSinceTouch !== null ? `last touch ${l.daysSinceTouch}d` : "never touched"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {rows.length > 25 && (
              <button onClick={() => setShowAll(!showAll)} className="w-full p-3 text-sm font-bold text-[color:var(--brand)] hover:bg-gray-50 border-t border-gray-100">
                {showAll ? "Show top 25" : `Show all ${rows.length}`}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Ranked by urgency (waiting replies and overdue tasks first), then priority and deal stage. Recycled leads are excluded.
            See the pipeline&apos;s health on the <Link href="/warnings" className="text-[color:var(--brand)] font-bold">Warnings</Link> page.
          </p>
        </div>
      )}
    </main>
  );
}
