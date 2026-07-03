"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, LineChart, Layers, AlertTriangle,
  DollarSign, Target, Settings as SettingsIcon, Sparkles, LogOut, FileBarChart,
} from "lucide-react";
import { APP_VERSION, RELEASE_DATE } from "@/lib/version";
import { useDemo } from "@/lib/demo-context";

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; match: (p: string) => boolean };

// Pulse/activity SVG matching the Gershon.AI logo standard
function PulseLogo({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
         stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export default function Sidebar() {
  const pathname = usePathname() ?? "/";
  const router   = useRouter();
  const { demoMode, toggle: toggleDemo, setOff: setDemoOff } = useDemo();

  const sections: { heading?: string; items: Item[] }[] = [
    {
      items: [
        { href: "/",           label: "Dashboard",  icon: LayoutDashboard, match: (p) => p === "/" },
      ],
    },
    {
      heading: "Pipeline",
      items: [
        { href: "/analysis",   label: "Analysis",   icon: LineChart,     match: (p) => p.startsWith("/analysis") },
        { href: "/swot",       label: "SWOT",       icon: Layers,        match: (p) => p.startsWith("/swot") },
        { href: "/warnings",   label: "Warnings",   icon: AlertTriangle, match: (p) => p.startsWith("/warnings") },
        { href: "/values",     label: "Values",     icon: DollarSign,    match: (p) => p.startsWith("/values") },
        { href: "/objectives", label: "Objectives", icon: Target,        match: (p) => p.startsWith("/objectives") },
      ],
    },
    {
      heading: "Reports",
      items: [
        { href: "/reports", label: "Monthly Reports", icon: FileBarChart, match: (p) => p.startsWith("/reports") },
      ],
    },
  ];

  function handleLogout() {
    if (!confirm("Sign out of Company by Gershon.AI?")) return;
    setDemoOff();
    router.push("/");
  }

  return (
    <aside
      className="flex-shrink-0 bg-white text-slate-600 border-r flex flex-col sticky top-0 h-screen"
      style={{ width: 250, borderColor: "var(--side-line)" }}
    >
      {/* Brand block: <Product> big + BY GERSHON.AI eyebrow */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-1">
        <span className="flex items-center text-[color:var(--brand)]">
          <PulseLogo size={24} />
        </span>
        <h1 className="text-[1.35rem] font-extrabold tracking-tight text-[color:var(--brand)]">
          Company
        </h1>
      </div>
      <div className="px-5 pt-1.5 pb-4 mb-1 border-b" style={{ borderColor: "var(--side-line)" }}>
        <div className="text-[0.66rem] font-bold tracking-[0.13em] text-slate-400 uppercase">
          by Gershon.AI
        </div>
        <div className="text-[0.9rem] font-bold text-slate-700 mt-2">
          v{APP_VERSION}
        </div>
        <div className="text-[0.74rem] text-slate-400 mt-0.5">
          Last release: {RELEASE_DATE || "—"}
        </div>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-3 py-1.5">
        {sections.map((section, si) => (
          <div key={si}>
            {section.heading && (
              <div className="text-[0.66rem] font-bold tracking-[0.13em] text-slate-400 uppercase px-3 pt-4 pb-1.5">
                {section.heading}
              </div>
            )}
            {section.items.map(({ href, label, icon: Icon, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-[0.92rem] font-semibold w-full text-left transition-colors ${
                    active
                      ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-ink)]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span className="w-5 flex items-center justify-center shrink-0">
                    <Icon size={18} />
                  </span>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer — Settings, Demo, Log out, domain (in that order) */}
      <div className="px-3.5 pt-3 pb-2 border-t flex flex-col gap-1.5" style={{ borderColor: "var(--side-line)" }}>
        {/* Settings — first */}
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[0.9rem] font-semibold transition-colors ${
            pathname.startsWith("/settings")
              ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-ink)]"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <span className="w-5 flex items-center justify-center shrink-0">
            <SettingsIcon size={18} />
          </span>
          Settings
        </Link>

        {/* Demo mode — middle */}
        <button
          onClick={toggleDemo}
          aria-pressed={demoMode}
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[0.9rem] font-semibold text-left transition-colors ${
            demoMode
              ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-ink)]"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          }`}
          title={demoMode ? "Currently in demo mode — click to switch back to live data" : "Show a bundled fake dataset for demos (never writes to the backend)"}
        >
          <span className="w-5 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </span>
          {demoMode ? "Live data" : "Demo mode"}
        </button>

        {/* Log out — very bottom, red-accented */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[0.9rem] font-semibold text-left text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] hover:text-[#b91c1c] transition-colors"
        >
          <span className="w-5 flex items-center justify-center shrink-0">
            <LogOut size={18} />
          </span>
          Log out
        </button>

        {/* Domain */}
        <div className="text-center text-[0.72rem] text-slate-400 pt-1.5 pb-1">
          company.gershonCRM.com
        </div>
      </div>
    </aside>
  );
}
