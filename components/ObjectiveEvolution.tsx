"use client";

import { CheckCircle, XCircle, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ObjectiveKey,
  objectiveHistory,
  currentStreak,
  checkObjectives,
  weeklyHistory,
  getHighPct,
  getMediumPct,
  getLowPct,
  currentData,
  lastWeekData,
} from "@/lib/data";

interface RowConfig {
  key: ObjectiveKey;
  label: string;
  getValue: (idx: number) => number;
  unit: string;
  positiveIsGood: boolean;
}

const rows: RowConfig[] = [
  {
    key: "highPriority",
    label: "High Priority",
    getValue: (i) => getHighPct(weeklyHistory[i]),
    unit: "%",
    positiveIsGood: true,
  },
  {
    key: "mediumPriority",
    label: "Medium Priority",
    getValue: (i) => getMediumPct(weeklyHistory[i]),
    unit: "%",
    positiveIsGood: true,
  },
  {
    key: "lowPriority",
    label: "Low Priority",
    getValue: (i) => getLowPct(weeklyHistory[i]),
    unit: "%",
    positiveIsGood: false,
  },
  {
    key: "nextDueDate",
    label: "Next Due Date",
    getValue: (i) => weeklyHistory[i].nextDueDateOnTime,
    unit: "%",
    positiveIsGood: true,
  },
];

function Sparkline({ history }: { history: boolean[] }) {
  return (
    <div className="flex items-center gap-1">
      {history.map((met, i) => (
        <div
          key={i}
          title={`W${i + 7}: ${met ? "Met" : "Not Met"}`}
          className={`w-4 h-4 rounded-sm ${met ? "bg-emerald-400" : "bg-red-300"}`}
        />
      ))}
    </div>
  );
}

function Delta({ current, prev, positiveIsGood }: { current: number; prev: number; positiveIsGood: boolean }) {
  const d = parseFloat((current - prev).toFixed(1));
  if (d === 0) return <span className="text-xs text-gray-400 flex items-center gap-0.5"><Minus size={11} />0%</span>;
  const good = positiveIsGood ? d > 0 : d < 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 font-medium ${good ? "text-emerald-600" : "text-red-500"}`}>
      {d > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {d > 0 ? "+" : ""}{d}%
    </span>
  );
}

export default function ObjectiveEvolution() {
  const currentObj = checkObjectives(currentData);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Objective Progress — 8-week history</h3>
        <p className="text-xs text-gray-400 mt-0.5">Each square = one week · Green = objective met · Streak = consecutive weeks met</p>
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(({ key, label, getValue, unit, positiveIsGood }) => {
          const hist = objectiveHistory(key);
          const streak = currentStreak(key);
          const currentVal = getValue(weeklyHistory.length - 1);
          const prevVal    = getValue(weeklyHistory.length - 2);
          const met        = currentObj[key].met;

          return (
            <div key={key} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Status + label */}
              <div className="flex items-center gap-2 w-40 shrink-0">
                {met
                  ? <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  : <XCircle    size={16} className="text-red-400    shrink-0" />}
                <span className="text-sm font-medium text-gray-700">{label}</span>
              </div>

              {/* Sparkline */}
              <div className="flex-1">
                <Sparkline history={hist} />
              </div>

              {/* Current value + delta */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-800">{currentVal.toFixed(1)}{unit}</div>
                  <Delta current={currentVal} prev={prevVal} positiveIsGood={positiveIsGood} />
                </div>

                {/* Streak */}
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  streak >= 3 ? "bg-orange-100 text-orange-600" : streak > 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                }`}>
                  {streak >= 2 && <Flame size={11} />}
                  {streak}w
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
