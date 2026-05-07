"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, Settings } from "lucide-react";
import { APP_VERSION, APP_BUILT_AT } from "@/lib/version";

function fmtDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // Compact: "May 6, 2026"
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Header() {
  const pathname = usePathname() ?? "/";
  const tabs = [
    { href: "/",         label: "Dashboard", icon: LayoutDashboard, active: pathname === "/" },
    { href: "/analysis", label: "Analysis",  icon: LineChart,       active: pathname.startsWith("/analysis") },
    { href: "/settings", label: "Settings",  icon: Settings,        active: pathname.startsWith("/settings") },
  ];

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-wrap items-center justify-between gap-3">
        {/* Title + version */}
        <Link href="/" className="flex items-baseline gap-2 group">
          <span className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
            GershonCRM
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
            v{APP_VERSION}
          </span>
          {APP_BUILT_AT && (
            <span className="hidden md:inline text-xs text-gray-400">
              · built {fmtDate(APP_BUILT_AT)}
            </span>
          )}
        </Link>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 flex-wrap">
          {tabs.map(({ href, label, icon: Icon, active }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-transparent"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
