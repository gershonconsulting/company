"use client";

interface Segment {
  label: string;
  pct: number;
  color: string;
}

interface Props {
  high: number;
  medium: number;
  low: number;
}

export default function PriorityBar({ high, medium, low }: Props) {
  const segments: Segment[] = [
    { label: "High", pct: high, color: "bg-rose-500" },
    { label: "Medium", pct: medium, color: "bg-amber-400" },
    { label: "Low", pct: low, color: "bg-sky-400" },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-7 w-full rounded-full overflow-hidden">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all duration-500`}
            style={{ width: `${s.pct}%` }}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex gap-4 text-xs text-gray-600">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className={`inline-block w-3 h-3 rounded-sm ${s.color}`} />
            <span>
              {s.label}: <strong>{s.pct.toFixed(1)}%</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
