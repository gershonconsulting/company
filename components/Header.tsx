"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Layers, AlertTriangle, LineChart,
  DollarSign, Target, Settings as SettingsIcon,
} from "lucide-react";
import { APP_VERSION, APP_BUILT_AT } from "@/lib/version";

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Header() {
  const pathname = usePathname() ?? "/";
  const tabs = [
    { href: "/",           label: "Dashboard",  icon: LayoutDashboard, match: (p: string) => p === "/" },
    { href: "/swot",       label: "SWOT",       icon: Layers,          match: (p: string) => p.startsWith("/swot") },
    { href: "/warnings",   label: "Warnings",   icon: AlertTriangle,   match: (p: string) => p.startsWith("/warnings") },
    { href: "/analysis",   label: "Analysis",   icon: LineChart,       match: (p: string) => p.startsWith("/analysis") },
    { href: "/values",     label: "Values",     icon: DollarSign,      match: (p: string) => p.startsWith("/values") },
    { href: "/objectives", label: "Objectives", icon: Target,          match: (p: string) => p.startsWith("/objectives") },
    { href: "/settings",   label: "Settings",   icon: SettingsIcon,    match: (p: string) => p.startsWith("/settings") },
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
        {/* Title + version */}
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="text-lg font-extrabold text-gray-900 tracking-tight group-hover:text-[color:var(--brand)] transition-colors">
            GershonCRM
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--brand-light)] text-[color:var(--brand)] font-bold tracking-wide">
            v{APP_VERSION}
          </span>
          {APP_BUILT_AT && (
            <span className="hidden md:inline text-xs text-gray-400">
              · built {fmtDate(APP_BUILT_AT)}
            </span>
          )}
        </Link>

        {/* Nav tabs — 7 entries */}
        <nav className="flex items-center gap-1 flex-wrap">
          {tabs.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[color:var(--brand)] text-white shadow-sm"
                    : "text-gray-600 hover:text-[color:var(--brand)] hover:bg-[color:var(--brand-light)]"
                }`}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
