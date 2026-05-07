"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Eye, EyeOff, Save, TestTube2, RefreshCw, Settings as SettingsIcon, DollarSign } from "lucide-react";

type Status = "idle" | "saving" | "saved" | "error" | "testing" | "test_ok" | "test_fail";

interface BusinessKpis {
  AVG_INVOICE_VALUE:       string;
  AVG_INVOICES_PER_CLIENT: string;
  AVG_CLIENT_LIFETIME_MO:  string;
  CONVERSION_RATE_HIGH:    string;
  CONVERSION_RATE_MEDIUM:  string;
  CONVERSION_RATE_LOW:     string;
}

const EMPTY_KPIS: BusinessKpis = {
  AVG_INVOICE_VALUE:       "",
  AVG_INVOICES_PER_CLIENT: "",
  AVG_CLIENT_LIFETIME_MO:  "",
  CONVERSION_RATE_HIGH:    "",
  CONVERSION_RATE_MEDIUM:  "",
  CONVERSION_RATE_LOW:     "",
};

export default function SettingsPage() {
  const [apiKey,      setApiKey]      = useState("");
  const [pipelineKey, setPipelineKey] = useState("");
  const [apiKeySet,   setApiKeySet]   = useState(false);
  const [showKey,     setShowKey]     = useState(false);
  const [kpis,        setKpis]        = useState<BusinessKpis>(EMPTY_KPIS);
  const [status,      setStatus]      = useState<Status>("idle");
  const [message,     setMessage]     = useState("");
  const [loading,     setLoading]     = useState(true);

  function loadSettings() {
    setLoading(true);
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setApiKeySet(d.STREAK_API_KEY_SET ?? false);
        setPipelineKey(d.STREAK_PIPELINE_KEY ?? "");
        setKpis({
          AVG_INVOICE_VALUE:       d.AVG_INVOICE_VALUE       ?? "",
          AVG_INVOICES_PER_CLIENT: d.AVG_INVOICES_PER_CLIENT ?? "",
          AVG_CLIENT_LIFETIME_MO:  d.AVG_CLIENT_LIFETIME_MO  ?? "",
          CONVERSION_RATE_HIGH:    d.CONVERSION_RATE_HIGH    ?? "",
          CONVERSION_RATE_MEDIUM:  d.CONVERSION_RATE_MEDIUM  ?? "",
          CONVERSION_RATE_LOW:     d.CONVERSION_RATE_LOW     ?? "",
        });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSettings(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const body: Record<string, string> = { STREAK_PIPELINE_KEY: pipelineKey, ...kpis };
      if (apiKey && apiKey !== "•••••••") body.STREAK_API_KEY = apiKey;
      const res  = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setStatus("saved");
      setApiKeySet(true);
      setApiKey("");
      setMessage("Saved. Changes are live immediately.");
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  }

  async function handleTest() {
    setStatus("testing");
    setMessage("");
    try {
      const res  = await fetch("/api/streak-data?test=1", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Connection failed");
      setStatus("test_ok");
      setMessage(`Connected — ${json.total} leads found in pipeline.`);
    } catch (err) {
      setStatus("test_fail");
      setMessage(String(err));
    }
  }

  const banner = () => {
    if (status === "saved" || status === "test_ok")
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} /> {message}
        </div>
      );
    if (status === "error" || status === "test_fail")
      return (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle size={16} /> {message}
        </div>
      );
    return null;
  };

  function KpiInput({ label, k, suffix, hint }: { label: string; k: keyof BusinessKpis; suffix?: string; hint?: string }) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-sm font-semibold text-gray-700">{label}</label>
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
        <div className="relative">
          <input
            type="number"
            step="any"
            inputMode="decimal"
            value={kpis[k]}
            onChange={(e) => setKpis({ ...kpis, [k]: e.target.value })}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
            placeholder="0"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-semibold">{suffix}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <SettingsIcon size={24} className="text-[color:var(--brand)]" />
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
              <p className="text-sm text-gray-500 mt-1">Streak credentials + business assumptions for pipeline value calc.</p>
            </div>
          </div>
          <button onClick={loadSettings} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Reload
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-5">

            {/* ── Streak credentials ───────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-5 border-t-4 border-[color:var(--brand)] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-gray-700">Streak API Key</label>
                {apiKeySet && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Saved</span>
                )}
              </div>
              <p className="text-xs text-gray-400">Streak → Settings → API &amp; Integrations</p>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKeySet ? "Enter a new key to replace the saved one" : "sk_live_…"}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5 flex flex-col gap-3">
              <label className="text-sm font-bold text-gray-700">Pipeline Key</label>
              <p className="text-xs text-gray-400">The Streak pipeline whose leads to track. Paste the key or the full pipeline URL.</p>
              <input
                type="text"
                value={pipelineKey}
                onChange={(e) => setPipelineKey(e.target.value)}
                placeholder="agCIEr7S…"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
              />
            </div>

            {/* ── Business assumptions ─────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-[color:var(--brand)]" />
                <h3 className="text-sm font-bold text-gray-700">Business assumptions — used by the Values tab</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">All optional. Fill them in to enable expected pipeline value calculations.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KpiInput label="Avg Invoice Value"           k="AVG_INVOICE_VALUE"       suffix="USD"   hint="Dollars per invoice" />
                <KpiInput label="Avg Invoices / Client"       k="AVG_INVOICES_PER_CLIENT" suffix="count" hint="Lifetime invoice count" />
                <KpiInput label="Avg Client Lifetime"         k="AVG_CLIENT_LIFETIME_MO"  suffix="months" hint="Average retention in months" />
                <div /> {/* spacer */}
                <KpiInput label="Conversion: High Priority"   k="CONVERSION_RATE_HIGH"    suffix="%" hint="High priority leads that close" />
                <KpiInput label="Conversion: Medium Priority" k="CONVERSION_RATE_MEDIUM"  suffix="%" hint="Medium priority leads that close" />
                <KpiInput label="Conversion: Low Priority"    k="CONVERSION_RATE_LOW"     suffix="%" hint="Low priority leads that close" />
              </div>
            </div>

            {banner()}

            <div className="flex gap-3 flex-wrap">
              <button type="submit" disabled={status === "saving"}
                className="flex items-center gap-2 bg-[color:var(--brand)] hover:bg-[color:var(--brand-dark)] disabled:opacity-50 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-sm">
                <Save size={15} />
                {status === "saving" ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={handleTest} disabled={!apiKeySet || status === "testing"}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] disabled:opacity-40 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-full transition-colors">
                <TestTube2 size={15} />
                {status === "testing" ? "Testing…" : "Test Streak Connection"}
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Saved instantly to the Cloudflare KV store on the server. Live on the next page refresh.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
