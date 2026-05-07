"use client";

import SwotPanel from "@/components/SwotPanel";
import { Layers } from "lucide-react";

export default function SwotPage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Layers size={24} className="text-[color:var(--brand)]" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">SWOT</h1>
            <p className="text-sm text-gray-500 mt-1">VP of Sales narrative + Strengths · Weaknesses · Opportunities · Threats.</p>
          </div>
        </div>
      </div>
      <SwotPanel />
    </main>
  );
}
