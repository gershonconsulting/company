"use client";

import { Target, Layers } from "lucide-react";
import { useAnalytics, LoadingShim, ErrorShim, MonthlyTrend, FunnelStage, HotLead } from "@/components/analytics-shared";
import { useActions, fmtUSD, type ActionsPayload } from "@/components/useActions";
import type { Momentum } from "@/lib/momentum";

const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

interface VpAnalysisProps {
  total: number;
  monthlyHighIntake: MonthlyTrend[];
  monthlyReachedClosing: MonthlyTrend[];
  staleLeadsTotal: number;
  staleThresholdDays: number;
  funnel: FunnelStage[];
}

function VPAnalysis(p: VpAnalysisProps) {
  const recentHigh  = p.monthlyHighIntake.slice(-3).reduce((s, d) => s + d.count, 0);
  const prevHigh    = p.monthlyHighIntake.slice(-6, -3).reduce((s, d) => s + d.count, 0);
  const highTrend   = recentHigh - prevHigh;

  const recentClose = p.monthlyReachedClosing.slice(-3).reduce((s, d) => s + d.count, 0);
  const prevClose   = p.monthlyReachedClosing.slice(-6, -3).reduce((s, d) => s + d.count, 0);
  const closeTrend  = recentClose - prevClose;

  const inClosing   = p.funnel.filter((f) => f.isClosing).reduce((s, f) => s + f.count, 0);
  const closingPct  = p.total > 0 ? (inClosing / p.total) * 100 : 0;
  const stalePct    = p.total > 0 ? (p.staleLeadsTotal / p.total) * 100 : 0;

  const bullets: { tone: "good" | "warn" | "bad" | "neutral"; text: string }[] = [];

  bullets.push({ tone: "neutral", text: `Pipeline carries ${p.total} leads; ${inClosing} in closing stages (${closingPct.toFixed(0)}%).` });

  if (highTrend > 0)         bullets.push({ tone: "good", text: `High-priority intake is up: ${recentHigh} added in last 3 months vs ${prevHigh} in the prior 3.` });
  else if (highTrend < 0)    bullets.push({ tone: "warn", text: `High-priority intake is slowing: ${recentHigh} in last 3 months vs ${prevHigh} previously.` });
  else if (recentHigh === 0) bullets.push({ tone: "bad",  text: `Zero new high-priority leads in the last 3 months — refresh top-of-funnel.` });

  if (closeTrend > 0)         bullets.push({ tone: "good", text: `Closing-stage entries are accelerating: ${recentClose} in last 3 months vs ${prevClose} previously.` });
  else if (closeTrend < 0)    bullets.push({ tone: "warn", text: `Closing-stage entries are dropping: only ${recentClose} in last 3 months vs ${prevClose} previously.` });

  if (stalePct > 25)              bullets.push({ tone: "bad",  text: `${p.staleLeadsTotal} leads (${stalePct.toFixed(0)}%) untouched > ${p.staleThresholdDays} days — schedule cleanup.` });
  else if (p.staleLeadsTotal > 0) bullets.push({ tone: "warn", text: `${p.staleLeadsTotal} leads untouched > ${p.staleThresholdDays} days — review and act.` });
  else                            bullets.push({ tone: "good", text: `No stale leads (>${p.staleThresholdDays} days untouched) — pipeline is well-maintained.` });

  const toneStyle = (t: string) => ({
    good:    "text-emerald-700 bg-emerald-50 border-emerald-200",
    warn:    "text-amber-700  bg-amber-50  border-amber-200",
    bad:     "text-red-700    bg-red-50    border-red-200",
    neutral: "text-gray-700   bg-gray-50   border-gray-200",
  } as Record<string, string>)[t];

  return (
    <ul className="space-y-2">
      {bullets.map((b, i) => (
        <li key={i} className={`flex items-start gap-2 px-3 py-2 rounded-md border ${toneStyle(b.tone)}`}>
          <span className="text-sm leading-relaxed">{b.text}</span>
        </li>
      ))}
    </ul>
  );
}

interface SwotProps {
  total: number;
  hotLeads: HotLead[];
  staleLeadsTotal: number;
  funnel: FunnelStage[];
  monthlyHighIntake: MonthlyTrend[];
  monthlyReachedClosing: MonthlyTrend[];
  momentum?: Momentum;
  actions?: ActionsPayload | null;
}

function SWOT({ total, hotLeads, staleLeadsTotal, funnel, monthlyHighIntake, monthlyReachedClosing, momentum, actions }: SwotProps) {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  const inClosing   = funnel.filter((f) => f.isClosing).reduce((s, f) => s + f.count, 0);
  const recentHigh  = monthlyHighIntake.slice(-3).reduce((s, d) => s + d.count, 0);
  const recentClose = monthlyReachedClosing.slice(-3).reduce((s, d) => s + d.count, 0);

  if (inClosing >= 5)         strengths.push(`${pl(inClosing, "lead")} in closing stages — close-able pipe`);
  if (recentClose > 0)        strengths.push(`${pl(recentClose, "lead")} reached closing in the last 3 months`);
  if (hotLeads.length >= 5)   strengths.push(`${hotLeads.length} hot leads with recent activity`);
  if (staleLeadsTotal === 0)  strengths.push(`Pipeline is clean — no stale leads`);
  if (strengths.length === 0) strengths.push("Pipeline data is clean enough to act on");

  if (staleLeadsTotal > 5)                       weaknesses.push(`${pl(staleLeadsTotal, "lead")} untouched for 90+ days`);
  if (inClosing < total * 0.05 && total > 20)    weaknesses.push(`Closing stages are thin (<5% of pipeline)`);
  if (recentClose === 0 && total > 20)           weaknesses.push(`No leads moved into closing in the last 3 months`);
  const mm = (k: string) => momentum?.metrics.find((m) => m.key === k);
  const leadsM = mm("leads"), touchM = mm("interactions"), movesM = mm("moves");
  if (actions) {
    const valClosing = actions.value.byStage.filter((s) => /proposal|negotiat|clos/i.test(s.stageName)).reduce((a, s) => a + s.value, 0);
    if (valClosing > 0) strengths.push(`${fmtUSD(valClosing)} of weighted value sits in closing stages`);
    if (actions.counts.reply > 0)    weaknesses.push(`${pl(actions.counts.reply, "prospect")} waiting on our reply`);
    if (actions.counts.closing > 0)  weaknesses.push(`${pl(actions.counts.closing, "closing-stage deal")} untouched for 10+ days`);
    if (actions.counts["no-next-step"] > 0) weaknesses.push(`${pl(actions.counts["no-next-step"], "active lead")} with no next step scheduled`);
    if (actions.counts["hot-open"] > 0) opportunities.push(`${pl(actions.counts["hot-open"], "prospect")} opened our last email several times — call them now`);
  }
  if (touchM?.coverage && touchM.coverage.pct30 < 50) weaknesses.push(`Only ${touchM.coverage.pct30}% of the pipeline was worked in the last 30 days`);
  if (weaknesses.length === 0)                   weaknesses.push("None obvious from the data");

  if (recentHigh > recentClose && recentHigh > 0) opportunities.push(`More high-priority intake than closing — qualify aggressively`);
  if (funnel.slice(0, 2).reduce((s, f) => s + f.count, 0) > total * 0.4) opportunities.push("Top-of-funnel is rich — invest in qualification");
  if (hotLeads.length >= 3)                       opportunities.push(`${pl(hotLeads.length, "hot lead")} can be pushed forward this week`);
  if (opportunities.length === 0)                 opportunities.push("Open new top-of-funnel sources to grow intake");

  if (staleLeadsTotal > total * 0.3) threats.push(`>30% of pipeline is stale — risk of pipeline rot`);
  if (recentClose < monthlyReachedClosing.slice(-6, -3).reduce((s, d) => s + d.count, 0)) threats.push("Closing-stage velocity has dropped vs prior quarter");
  if (recentHigh < monthlyHighIntake.slice(-6, -3).reduce((s, d) => s + d.count, 0)) threats.push("High-priority intake is slowing");
  if (leadsM && (leadsM.status === "slowing" || leadsM.status === "softening"))
    threats.push(`New-lead intake is ${Math.abs(leadsM.changePct ?? 0)}% below our best quarter${leadsM.daysSinceLast !== null && leadsM.daysSinceLast >= 7 ? ` — none in ${leadsM.daysSinceLast} days` : ""}`);
  if (movesM && (movesM.status === "slowing" || movesM.status === "softening"))
    threats.push(`Stage moves are ${Math.abs(movesM.changePct ?? 0)}% below our best quarter — deals are stalling`);
  if (threats.length === 0) threats.push("None acute right now — maintain discipline");

  const Quad = ({ title, items, color }: { title: string; items: string[]; color: "green" | "red" | "blue" | "yellow" }) => {
    const palette = {
      green:  { border: "border-green-500",  text: "text-green-700"  },
      red:    { border: "border-red-500",    text: "text-red-700"    },
      blue:   { border: "border-blue-500",   text: "text-blue-700"   },
      yellow: { border: "border-yellow-500", text: "text-yellow-700" },
    }[color];
    return (
      <div className={`bg-white rounded-xl shadow p-5 border-t-4 ${palette.border}`}>
        <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${palette.text}`}>{title}</p>
        <ul className="space-y-2 text-sm text-gray-700">
          {items.map((it, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-gray-400">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Quad title="Strengths"     items={strengths}     color="green"  />
      <Quad title="Weaknesses"    items={weaknesses}    color="red"    />
      <Quad title="Opportunities" items={opportunities} color="blue"   />
      <Quad title="Threats"       items={threats}       color="yellow" />
    </div>
  );
}

export default function SwotPanel() {
  const { data, error, loading } = useAnalytics();
  const acts = useActions();
  if (loading) return <LoadingShim label="Loading SWOT…" />;
  if (error)   return <ErrorShim message={error} />;
  if (!data)   return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
          <Target size={16} className="text-[color:var(--brand)] mr-2" />
          VP of Sales Read
        </h3>
        <VPAnalysis
          total={data.totalLeads}
          monthlyHighIntake={data.monthlyHighIntake}
          monthlyReachedClosing={data.monthlyReachedClosing}
          staleLeadsTotal={data.staleLeadsTotal}
          staleThresholdDays={data.staleThresholdDays}
          funnel={data.funnel}
        />
      </div>

      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
          <Layers size={16} className="text-[color:var(--brand)] mr-2" />
          SWOT — Strengths · Weaknesses · Opportunities · Threats
        </h3>
        <SWOT
          total={data.totalLeads}
          hotLeads={data.hotLeads}
          staleLeadsTotal={data.staleLeadsTotal}
          funnel={data.funnel}
          monthlyHighIntake={data.monthlyHighIntake}
          monthlyReachedClosing={data.monthlyReachedClosing}
          momentum={data.momentum}
          actions={acts.data}
        />
      </div>
    </div>
  );
}
