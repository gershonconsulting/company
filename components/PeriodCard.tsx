"use client";

import { PeriodData, getHighPct, getMediumPct, getLowPct } from "@/lib/data";
import PriorityBar from "./PriorityBar";
import DeltaBadge from "./DeltaBadge";

interface Props {
  data: PeriodData;
  compareWith?: PeriodData;
  compareLabel?: string;
}

function StatRow({
  label,
  count,
  pct,
  prev,
  prevPct,
  positiveIsGood,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  prev?: number;
  prevPct?: number;
  positiveIsGood?: boolean;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-sm ${color}`} />
        <span className="text-gray-600">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-gray-800">
          {count} <span className="text-gray-400 font-normal">({pct.toFixed(1)}%)</span>
        </span>
        {prevPct !== undefined && (
          <DeltaBadge current={pct} previous={prevPct} positiveIsGood={positiveIsGood} />
        )}
      </div>
    </div>
  );
}

export default function PeriodCard({ data, compareWith, compareLabel }: Props) {
  const highPct = getHighPct(data);
  const medPct = getMediumPct(data);
  const lowPct = getLowPct(data);

  const prevHighPct = compareWith ? getHighPct(compareWith) : undefined;
  const prevMedPct = compareWith ? getMediumPct(compareWith) : undefined;
  const prevLowPct = compareWith ? getLowPct(compareWith) : undefined;
  const prevNdd = compareWith ? compareWith.nextDueDateOnTime : undefined;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">{data.label}</h3>
          <p className="text-xs text-gray-400">
            {data.totalLeads} total leads
            {compareWith && (
              <span className="ml-1 text-gray-300">
                (vs {compareWith.totalLeads} {compareLabel})
              </span>
            )}
          </p>
        </div>
      </div>

      <PriorityBar high={highPct} medium={medPct} low={lowPct} />

      <div className="flex flex-col">
        <StatRow
          label="High"
          count={data.high}
          pct={highPct}
          prev={compareWith?.high}
          prevPct={prevHighPct}
          positiveIsGood={true}
          color="bg-rose-500"
        />
        <StatRow
          label="Medium"
          count={data.medium}
          pct={medPct}
          prev={compareWith?.medium}
          prevPct={prevMedPct}
          positiveIsGood={true}
          color="bg-amber-400"
        />
        <StatRow
          label="Low"
          count={data.low}
          pct={lowPct}
          prev={compareWith?.low}
          prevPct={prevLowPct}
          positiveIsGood={false}
          color="bg-sky-400"
        />
      </div>

      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2 text-sm">
        <span className="text-gray-500">Next Due Date coverage</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-800">{data.nextDueDateOnTime}%</span>
          {prevNdd !== undefined && (
            <DeltaBadge current={data.nextDueDateOnTime} previous={prevNdd} positiveIsGood={true} />
          )}
        </div>
      </div>
    </div>
  );
}
