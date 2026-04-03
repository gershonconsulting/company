"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { weeklyHistory, getHighPct, getMediumPct, getLowPct, OBJECTIVES } from "@/lib/data";

const chartData = weeklyHistory.map((w) => ({
  week: w.week,
  High: parseFloat(getHighPct(w).toFixed(1)),
  Medium: parseFloat(getMediumPct(w).toFixed(1)),
  Low: parseFloat(getLowPct(w).toFixed(1)),
  "Next Due Date": w.nextDueDateOnTime,
}));

const fmt = (v: unknown) => typeof v === "number" ? `${v.toFixed(1)}%` : String(v);

export default function WeeklyTrendChart() {
  return (
    <div className="flex flex-col gap-4">
      {/* Priority evolution */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Priority Evolution — week over week</h3>
            <p className="text-xs text-gray-400 mt-0.5">Dashed lines = objectives thresholds</p>
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-rose-500 inline-block" /> High</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-400 inline-block" /> Medium</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-sky-400 inline-block" /> Low</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis unit="%" domain={[0, 80]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={fmt} />
            {/* Objective thresholds */}
            <ReferenceLine y={OBJECTIVES.highMin} stroke="#f43f5e" strokeDasharray="5 3"
              label={{ value: `≥${OBJECTIVES.highMin}%`, position: "insideTopRight", fontSize: 10, fill: "#f43f5e" }} />
            <ReferenceLine y={OBJECTIVES.lowMax} stroke="#38bdf8" strokeDasharray="5 3"
              label={{ value: `≤${OBJECTIVES.lowMax}%`, position: "insideTopLeft", fontSize: 10, fill: "#38bdf8" }} />
            <ReferenceLine y={OBJECTIVES.mediumMin} stroke="#fbbf24" strokeDasharray="5 3"
              label={{ value: `≥${OBJECTIVES.mediumMin}%`, position: "insideBottomRight", fontSize: 10, fill: "#b45309" }} />
            <Line type="monotone" dataKey="High"   stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Medium" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Low"    stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Next Due Date evolution */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Next Due Date Coverage — week over week</h3>
        <p className="text-xs text-gray-400 mb-3">Target ≥ {OBJECTIVES.nextDueDateTarget}%</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="nddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} />
            <YAxis unit="%" domain={[0, 80]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={fmt} />
            <ReferenceLine y={OBJECTIVES.nextDueDateTarget} stroke="#6366f1" strokeDasharray="5 3"
              label={{ value: `Target ${OBJECTIVES.nextDueDateTarget}%`, position: "insideTopRight", fontSize: 10, fill: "#6366f1" }} />
            <Area type="monotone" dataKey="Next Due Date" stroke="#6366f1" strokeWidth={2.5}
              fill="url(#nddGrad)" dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
