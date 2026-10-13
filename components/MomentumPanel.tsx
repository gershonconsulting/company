"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  TrendingDown, TrendingUp, Minus, AlertTriangle, CheckCircle2,
  UserPlus, MessagesSquare, ArrowRightLeft, Mail, Gauge,
} from "lucide-react";
import type { Momentum, MomentumMetric, MomentumStatus } from "@/lib/momentum";
import { RECENT_WEEKS } from "@/lib/momentum";

const STATUS: Record<MomentumStatus, { label: string; color: string; bg: string; text: string }> = {
  slowing:       { label: "Slowing down", color: "#dc2626", bg: "bg-red-50",     text: "text-red-700" },
  softening:     { label: "Softening",    color: "#f59e0b", bg: "bg-amber-50",   text: "text-amber-700" },
  steady:        { label: "On pace",      color: "#6366f1", bg: "bg-indigo-50",  text: "text-indigo-700" },
  growing:       { label: "Growing",      color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-700" },
  "no-baseline": { label: "Not enough history", color: "#94a3b8", bg: "bg-gray-50", text: "text-gray-600" },
};

const ICON = {
  leads:        <UserPlus size={16} />,
  interactions: <MessagesSquare size={16} />,
  moves:        <ArrowRightLeft size={16} />,
};

const EXPLAIN = {
  leads:        "Leads created in the pipeline, per 7-day window.",
  interactions: "Live leads by the week of their latest email, call or meeting — older bars are leads going cold.",
  moves:        "Leads whose latest stage change fell in that week.",
};

function ChangePill({ m }: { m: MomentumMetric }) {
  const s = STATUS[m.status];
  const Icon = m.changePct === null ? Minus : m.changePct < 0 ? TrendingDown : m.changePct > 0 ? TrendingUp : Minus;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${s.bg} ${s.text}`}>
      <Icon size={12} />
      {m.coverage ? `${m.coverage.pct30}% vs ${m.coverage.targetPct}% · ${s.label}` : m.changePct === null ? s.label : `${m.changePct > 0 ? "+" : ""}${m.changePct}% · ${s.label}`}
    </span>
  );
}

function MetricCard({ m, data }: { m: MomentumMetric; data: Momentum["weeks"] }) {
  const s = STATUS[m.status];
  const recentFrom = data.length - RECENT_WEEKS;
  const chart = data.map((w, i) => ({ label: w.label, value: w[m.key], recent: i >= recentFrom, range: `${w.start} → ${w.end}` }));
  const recentColor = m.status === "slowing" || m.status === "softening" ? s.color : "#6366f1";
  return (
    <div className="bg-white rounded-xl shadow p-5 border-t-4" style={{ borderTopColor: s.color }}>
      <div className="flex items-center gap-2 mb-1 text-gray-700" style={{ color: s.color }}>
        {ICON[m.key]}
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{m.label}</p>
      </div>
      {m.coverage ? (
        <>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight tabular-nums">{m.coverage.pct30}%</p>
            <p className="text-sm text-gray-500">of leads touched in 30 days</p>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Target <strong className="text-gray-700 tabular-nums">{m.coverage.targetPct}%</strong>
            <span className="text-gray-400"> · {m.coverage.touched30} of {m.coverage.live} live leads</span>
          </p>
          <p className="text-[11px] text-gray-400">Touched in the last 7 days: {m.coverage.touched7}</p>
        </>
      ) : (
        <>
      <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-3xl font-extrabold text-gray-900 tracking-tight tabular-nums">{m.recentPerWeek}</p>
          <p className="text-sm text-gray-500">/ week now</p>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Target <strong className="text-gray-700 tabular-nums">{m.targetPerWeek}</strong> / week
          <span className="text-gray-400"> · 6-mo avg {m.normalPerWeek}</span>
        </p>
        {m.targetFrom && (
          <p className="text-[11px] text-gray-400">Target = our best quarter (13 weeks from {m.targetFrom})</p>
        )}
        </>
      )}
      <div className="mt-2"><ChangePill m={m} /></div>

      <div style={{ width: "100%", height: 130 }} className="mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} interval={5} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }}
              formatter={(v) => [v as number, m.label]}
              labelFormatter={(_, p) => (p?.[0]?.payload as { range?: string } | undefined)?.range ?? ""}
            />
            {m.targetPerWeek > 0 && !m.coverage && (
              <ReferenceLine y={m.targetPerWeek} stroke="#334155" strokeDasharray="4 3"
                label={{ value: "target", position: "insideTopRight", fontSize: 10, fill: "#334155" }} />
            )}
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chart.map((d, i) => <Cell key={i} fill={d.recent ? recentColor : "#c7d2fe"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{EXPLAIN[m.key]}</p>
      {!m.reliable && (
        <p className="text-[11px] text-amber-700 mt-1">
          Streak isn&apos;t sending email/call timestamps for most leads, so this weekly view is incomplete — use the exact email count below.
        </p>
      )}
      <p className="text-xs text-gray-600 mt-2">
        Last 7 days: <strong className="tabular-nums">{m.lastWeek}</strong>
        {m.daysSinceLast !== null && (
          <> · last one <strong className={m.daysSinceLast >= 7 ? "text-red-700" : ""}>{m.daysSinceLast === 0 ? "today" : `${m.daysSinceLast}d ago`}</strong></>
        )}
      </p>
    </div>
  );
}

function ExactEmails({ m }: { m: Momentum }) {
  const e = m.exact;
  if (!e) return null;
  if (e.emailsLast7 === null) {
    return (
      <p className="text-xs text-gray-500 flex items-center gap-1.5">
        <Mail size={13} className="text-[color:var(--brand)]" />
        Exact email counting started {e.trackingSince ?? "today"} — weekly email totals appear here after 7 days of tracking.
      </p>
    );
  }
  const d = e.emailsPrev7 !== null ? e.emailsLast7 - e.emailsPrev7 : null;
  const pct = e.emailsPrev7 ? Math.round((d! / e.emailsPrev7) * 100) : null;
  return (
    <div className="bg-white rounded-xl shadow px-5 py-3 flex items-center gap-3 flex-wrap text-sm">
      <Mail size={16} className="text-[color:var(--brand)]" />
      <span className="text-gray-700">Emails exchanged in the last 7 days:</span>
      <strong className="text-gray-900 tabular-nums text-lg">{e.emailsLast7}</strong>
      <span className="text-gray-500">({e.sentLast7} sent · {e.receivedLast7} received)</span>
      {d !== null && (
        <span className={`font-bold ${d < 0 ? "text-red-700" : d > 0 ? "text-emerald-700" : "text-gray-500"}`}>
          {d > 0 ? "+" : ""}{d}{pct !== null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""} vs the week before
        </span>
      )}
    </div>
  );
}

export default function MomentumPanel({ momentum }: { momentum: Momentum }) {
  const s = STATUS[momentum.overall];
  const alarm = momentum.overall === "slowing" || momentum.overall === "softening";
  return (
    <section>
      <h2 className="text-[11px] font-bold tracking-[0.18em] text-gray-500 uppercase mb-3 flex items-center gap-1.5">
        <Gauge size={13} /> Momentum — are we slowing down?
      </h2>

      <div className={`rounded-xl p-5 mb-4 border-l-4 ${s.bg}`} style={{ borderLeftColor: s.color }}>
        <div className="flex items-start gap-3">
          {alarm
            ? <AlertTriangle size={22} style={{ color: s.color }} className="shrink-0 mt-0.5" />
            : <CheckCircle2 size={22} style={{ color: s.color }} className="shrink-0 mt-0.5" />}
          <div>
            <p className={`text-lg font-extrabold tracking-tight ${s.text}`}>{momentum.headline}</p>
            <p className="text-xs text-gray-500 mt-1">
              Last {RECENT_WEEKS} weeks vs our best quarter of the past year — a slow summer never becomes the new normal. Rolling 7-day windows.
            </p>
            {momentum.actions.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">What we need</p>
                <ul className="space-y-1">
                  {momentum.actions.map((a, i) => (
                    <li key={i} className="text-sm text-gray-800 flex gap-2">
                      <span style={{ color: s.color }} className="font-bold">→</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {momentum.metrics.map((m) => <MetricCard key={m.key} m={m} data={momentum.weeks} />)}
      </div>

      <div className="mt-3"><ExactEmails m={momentum} /></div>
    </section>
  );
}
