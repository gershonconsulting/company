"use client";

import AnalysisPanel from "@/components/AnalysisPanel";
import { LineChart } from "lucide-react";

export default function AnalysisPage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <LineChart size={24} className="text-[color:var(--brand)]" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Pipeline Analysis</h1>
            <p className="text-sm text-gray-500 mt-1">Monthly intake & closing trends, funnel, and hot leads.</p>
          </div>
        </div>
      </div>
      <AnalysisPanel />
    </main>
  );
}
