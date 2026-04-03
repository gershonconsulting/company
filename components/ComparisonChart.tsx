"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { OBJECTIVES } from "@/lib/data";

interface ChartEntry {
  name: string;
  High: number;
  Medium: number;
  Low: number;
}

interface Props {
  data: ChartEntry[];
  title: string;
}

export default function ComparisonChart({ data, title }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(v) => typeof v === "number" ? `${v.toFixed(1)}%` : v} />
          <Legend />
          {/* Objective reference lines */}
          <ReferenceLine
            y={OBJECTIVES.highMin}
            stroke="#f43f5e"
            strokeDasharray="4 2"
            label={{ value: `High >${OBJECTIVES.highMin}%`, position: "insideTopRight", fontSize: 10, fill: "#f43f5e" }}
          />
          <ReferenceLine
            y={OBJECTIVES.lowMax}
            stroke="#38bdf8"
            strokeDasharray="4 2"
            label={{ value: `Low <${OBJECTIVES.lowMax}%`, position: "insideTopLeft", fontSize: 10, fill: "#38bdf8" }}
          />
          <Bar dataKey="High" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Medium" fill="#fbbf24" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Low" fill="#38bdf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
