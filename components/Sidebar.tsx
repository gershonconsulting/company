"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, LineChart, Layers, AlertTriangle,
  DollarSign, Target, Settings as SettingsIcon, Activity, FileBarChart,
  Sparkles, LogOut,
} from "lucide-react";
import { APP_VERSION, APP_BUILT_AT } from "@/lib/version";
import { useDemo } from "@/lib/demo-context";

function fmtTimestamp(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "America/New_York" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/New_York", timeZoneName: "short" });
  return `${date}, ${time}`;
}

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; match: (p: string) => boolean };

export default function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router   = useRouter();
  const { demoMode, toggle: toggleDemo, setOff: setDemoOff } = useDemo();

  const sections: { heading?: string; items: Item[] }[] = [
    {
      items: [
        { href: "/",           label: "Dashboard",       icon: LayoutDashboard, match: (p) => p === "/" },
        { href: "/analysis",   label: "Analysis",        icon: LineChart,       match: (p) => p.startsWith("/analysis") },
        { href: "/swot",       label: "SWOT",            icon: Layers,          match: (p) => p.startsWith("/swot") },
        { href: "/warnings",   label: "Warnings",        icon: AlertTriangle,   match: (p) => p.startsWith("/warnings") },
        { href: "/values",     label: "Values",          icon: DollarSign,      match: (p) => p.startsWith("/values") },
        { href: "/objectives", label: "Objectives",      icon: Target,          match: (p) => p.startsWith("/objectives") },
      ],
    },
    {
      heading: "Reports",
      items: [
        { href: "/reports", label: "Monthly Reports", icon: FileBarChart, match: (p) => p.startsWith("/reports") },
      ],
    },
    {
      heading: "Configuration",
      items: [
        { href: "/settings", label: "Settings", icon: SettingsIcon, match: (p) => p.startsWith("/settings") },
      ],
    },
  ];

  function handleLogout() {
    if (!confirm("Sign out of Gershon.AI · Company?")) return;
    setDemoOff();
    router.push("/");
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 min-h-screen sticky top-0 h-screen flex flex-col">
      {/* Brand wordmark */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <Link href="/" className="flex items-center gap-2 group">
          <Activity size={22} className="text-[color:var(--brand)]" />
          <span className="text-xl font-extrabold tracking-tight text-[color:var(--brand)] group-hover:opacity-80 transition-opacity">
            Gershon.AI
          </span>
        </Link>
        <div className="text-[10px] font-bold tracking-[0.18em] text-gray-500 mt-1 ml-7">
          COMPANY
        </div>
        <div className="ml-7 mt-1">
          <div className="text-xs text-gray-500 font-medium">v{APP_VERSION}</div>
          {APP_BUILT_AT && (
            <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{fmtTimestamp(APP_BUILT_AT)}</div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {sections.map((section, si) => (
          <div key={si} className={si > 0 ? "mt-6" : ""}>
            {section.heading && (
              <div className="px-3 mb-2 text-[10px] font-bold tracking-[0.16em] text-gray-400 uppercase">
                {section.heading}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map(({ href, label, icon: Icon, match }) => {
                const active = match(pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        active
                          ? "bg-[color:var(--brand)] text-white shadow-sm"
                          : "text-gray-600 hover:bg-[color:var(--brand-light)] hover:text-[color:var(--brand)]"
                      }`}
                    >
                      <Icon size={17} className={active ? "text-white" : "text-gray-400"} />
                      <span>{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — Demo + Logout, always docked at bottom-right of sidebar */}
      <div className="px-3 py-3 border-t border-gray-100 flex flex-col gap-2">
        <button
          onClick={toggleDemo}
          aria-pressed={demoMode}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-bold transition-colors ${
            demoMode
              ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
              : "bg-[color:var(--brand-light)] text-[color:var(--brand)] border border-[color:var(--brand-light)] hover:border-[color:var(--brand)]"
          }`}
          title={demoMode ? "Exit demo mode and return to live data" : "Show impressive simulated data for demos"}
        >
          <Sparkles size={14} />
          {demoMode ? "Exit Demo" : "Demo Mode"}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-bold text-gray-700 bg-white border border-gray-200 hover:border-[color:var(--danger)] hover:text-[color:var(--danger)] transition-colors"
          title="Sign out"
        >
          <LogOut size={14} />
          Logout
        </button>
        <div className="text-[10px] text-gray-400 text-center mt-1">company.gershonCRM.com</div>
      </div>
    </aside>
  );
}
