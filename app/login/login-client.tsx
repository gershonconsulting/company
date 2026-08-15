"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

// Pulse/activity mark — same logo standard as the sidebar.
function PulseLogo({ size = 30 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState("/");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const n = p.get("next");
    // Only ever redirect to a same-site path.
    if (n && n.startsWith("/") && !n.startsWith("//")) setNext(n);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error || "Invalid email or password.");
        setLoading(false);
        return;
      }

      // Full navigation, so middleware sees the freshly set cookie.
      window.location.href = next;
    } catch {
      setError("Network error — please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-[color:var(--bg)]">
      <div className="w-full max-w-md">
        {/* Brand block — mirrors the sidebar lockup */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-1.5">
            <span className="flex items-center text-[color:var(--brand)]">
              <PulseLogo size={30} />
            </span>
            <span className="text-[1.75rem] font-extrabold tracking-tight text-[color:var(--brand)]">
              Company
            </span>
          </div>
          <div className="text-[0.66rem] font-bold tracking-[0.13em] text-slate-400 uppercase">
            by Gershon.AI
          </div>
          <p className="text-sm text-slate-500 mt-3">
            Streak pipeline tracking, objectives &amp; monthly analytics
          </p>
        </div>

        <div
          className="bg-white rounded-2xl shadow-sm border p-8"
          style={{ borderColor: "var(--side-line)" }}
        >
          <h1 className="text-lg font-extrabold tracking-tight text-slate-800 mb-6">
            Sign in to your account
          </h1>

          {error && (
            <div
              className="mb-5 px-3.5 py-3 rounded-[11px] text-sm font-medium"
              style={{
                background: "var(--danger-soft)",
                color: "#b91c1c",
                border: "1px solid #fecaca",
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-[0.82rem] font-semibold text-slate-700 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="username"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@gershonconsulting"
                className="w-full px-3.5 py-2.5 rounded-[11px] text-sm text-slate-800 border border-[color:var(--border)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--brand)] focus:border-[color:var(--brand)]"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-[0.82rem] font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-[11px] text-sm text-slate-800 border border-[color:var(--border)] outline-none transition-shadow focus:ring-2 focus:ring-[color:var(--brand)] focus:border-[color:var(--brand)]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[11px] text-white text-[0.92rem] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed bg-brand hover:bg-brand-dark"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-slate-400">
            Gershon Consulting — Internal Use Only
          </p>
          <p className="text-[0.7rem] text-slate-300">
            company.gershonCRM.com · v{APP_VERSION}
          </p>
        </div>
      </div>
    </div>
  );
}
