"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  current: number;
  previous: number;
  unit?: string;
  positiveIsGood?: boolean; // set to false when lower is better (e.g. Low priority)
}

export default function DeltaBadge({
  current,
  previous,
  unit = "%",
  positiveIsGood = true,
}: Props) {
  const delta = parseFloat((current - previous).toFixed(1));

  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <Minus size={12} />
        0{unit}
      </span>
    );
  }

  const isGood = positiveIsGood ? delta > 0 : delta < 0;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isGood ? "text-emerald-600" : "text-red-500"
      }`}
    >
      {delta > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {delta > 0 ? "+" : ""}
      {delta}
      {unit}
    </span>
  );
}
