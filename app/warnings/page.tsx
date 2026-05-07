"use client";

import WarningsPanel from "@/components/WarningsPanel";
import { AlertTriangle } from "lucide-react";

export default function WarningsPage() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-[color:var(--brand)]" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Warnings</h1>
            <p className="text-sm text-gray-500 mt-1">Stale leads, pipeline rot, and other things needing attention.</p>
          </div>
        </div>
      </div>
      <WarningsPanel />
    </main>
  );
}
