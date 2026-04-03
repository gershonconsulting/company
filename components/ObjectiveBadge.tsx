"use client";

import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  met: boolean;
  value: number | string;
  target: string;
  label: string;
  unit?: string;
}

export default function ObjectiveBadge({ met, value, target, label, unit = "%" }: Props) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl p-4 border ${
        met
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500">Target: {target}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-2xl font-bold ${
            met ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {typeof value === "number" ? value.toFixed(1) : value}
          {unit}
        </span>
        {met ? (
          <CheckCircle className="text-emerald-500" size={22} />
        ) : (
          <XCircle className="text-red-500" size={22} />
        )}
      </div>
    </div>
  );
}
