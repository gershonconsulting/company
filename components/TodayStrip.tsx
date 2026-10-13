"use client";

import Link from "next/link";
import { ListTodo, ArrowRight } from "lucide-react";
import { useActions } from "@/components/useActions";

export default function TodayStrip() {
  const { data } = useActions();
  if (!data) return null;
  const c = data.counts;
  const items = [
    c.reply > 0 && `${c.reply} waiting on our reply`,
    c["hot-open"] > 0 && `${c["hot-open"]} opened our email`,
    c.closing > 0 && `${c.closing} closing deals need follow-up`,
  ].filter(Boolean) as string[];
  if (items.length === 0) return null;
  return (
    <Link href="/today" className="flex items-center gap-3 bg-white rounded-xl shadow px-5 py-3 border-l-4 border-[color:var(--brand)] hover:shadow-md transition-shadow">
      <ListTodo size={18} className="text-[color:var(--brand)] shrink-0" />
      <p className="text-sm text-gray-800"><strong>Do this first:</strong> {items.join(" · ")}</p>
      <span className="ml-auto text-sm font-bold text-[color:var(--brand)] inline-flex items-center gap-1 shrink-0">Open Today <ArrowRight size={14} /></span>
    </Link>
  );
}
