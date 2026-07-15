"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle, AlertCircle, Eye, EyeOff, Save, TestTube2, RefreshCw,
  Settings as SettingsIcon, DollarSign, Mail, Send, Copy,
} from "lucide-react";

type Status =
  | "idle" | "saving" | "saved" | "error"
  | "testing" | "test_ok" | "test_fail"
  | "sending" | "sent" | "send_fail";

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
  const [apiKey,          setApiKey]          = useState("");
  const [pipelineKey,     setPipelineKey]     = useState("");
  const [apiKeySet,       setApiKeySet]       = useState(false);
  const [showKey,         setShowKey]         = useState(false);
  const [kpis,            setKpis]            = useState<BusinessKpis>(EMPTY_KPIS);

  // Weekly report state
  const [resendKey,       setResendKey]       = useState("");
  const [resendKeySet,    setResendKeySet]    = useState(false);
  const [showResend,      setShowResend]      = useState(false);
  const [reportFrom,      setReportFrom]      = useState("");
  const [reportTo,        setReportTo]        = useState("");
  const [triggerKey,      setTriggerKey]      = useState("");
  const [copied,          setCopied]          = useState(false);

  const [status,          setStatus]          = useState<Status>("idle");
  const [message,         setMessage]         = useState("");
  const [loading,         setLoading]         = useState(true);

  function loadSettings() {
    setLoading(true);
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setApiKeySet(d.STREAK_API_KEY_SET ?? false);
        setPipelineKey(d.STREAK_PIPELINE_KEY ?? "");
        setResendKeySet(d.RESEND_API_KEY_SET ?? false);
        setReportFrom(d.REPORT_FROM ?? "reports@gershonconsulting.com");
        setReportTo(d.REPORT_TO ?? "sales@gershonconsulting.com");
        setTriggerKey(d.REPORT_TRIGGER_KEY ?? "");
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
      const body: Record<string, string> = {
        STREAK_PIPELINE_KEY: pipelineKey,
        REPORT_FROM: reportFrom,
        REPORT_TO:   reportTo,
        ...kpis,
      };
      if (apiKey    && apiKey    !== "•••••••") body.STREAK_API_KEY = apiKey;
      if (resendKey && resendKey !== "•••••••") body.RESEND_API_KEY = resendKey;
      const res  = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setStatus("saved");
      setApiKeySet(!!(apiKeySet || apiKey));
      setResendKeySet(!!(resendKeySet || resendKey));
      setApiKey(""); setResendKey("");
      setMessage("Saved. Changes are live immediately.");
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  }

  async function handleTestStreak() {
    setStatus("testing"); setMessage("");
    try {
      const res  = await fetch("/api/streak-data?test=1", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Connection failed");
      setStatus("test_ok");
      setMessage(`Streak connected — ${json.total} leads in pipeline.`);
    } catch (err) {
      setStatus("test_fail"); setMessage(String(err));
    }
  }

  async function handleSendTest() {
    setStatus("sending"); setMessage("");
    try {
      const res  = await fetch(`/api/reports/weekly?key=${encodeURIComponent(triggerKey)}`, { cache: "no-store" });
      const json = await res.json() as { ok?: boolean; error?: string; sentTo?: string; subject?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setStatus("sent");
      setMessage(`Sent → ${json.sentTo}. Subject: "${json.subject}"`);
    } catch (err) {
      setStatus("send_fail"); setMessage(String(err));
    }
  }

  function copyTrigger() {
    if (!triggerKey) return;
    navigator.clipboard.writeText(triggerKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const banner = () => {
    if (status === "saved" || status === "test_ok" || status === "sent")
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <CheckCircle size={16} /> {message}
        </div>
      );
    if (status === "error" || status === "test_fail" || status === "send_fail")
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
            type="number" step="any" inputMode="decimal"
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
              <p className="text-sm text-gray-500 mt-1">Streak credentials, business assumptions, and weekly report delivery.</p>
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
                {apiKeySet && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Saved</span>}
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
                type="text" value={pipelineKey}
                onChange={(e) => setPipelineKey(e.target.value)}
                placeholder="agCIEr7S…"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
              />
            </div>

            {/* ── Weekly report ────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-5 border-t-4 border-[color:var(--brand)]">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={16} className="text-[color:var(--brand)]" />
                <h3 className="text-sm font-bold text-gray-700">Weekly report — sent every Monday at 8:00 AM ET</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">Sends an HTML pipeline recap via Resend. Fill in the API key and the &quot;Send test&quot; button turns on.</p>

              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Resend API Key</label>
                    {resendKeySet && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">Saved</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Get one at <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-[color:var(--brand)] font-semibold underline">resend.com/api-keys</a>. Requires a verified domain for the sender.</p>
                  <div className="relative mt-2">
                    <input
                      type={showResend ? "text" : "password"}
                      value={resendKey}
                      onChange={(e) => setResendKey(e.target.value)}
                      placeholder={resendKeySet ? "Enter a new key to replace the saved one" : "re_…"}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                    />
                    <button type="button" onClick={() => setShowResend(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showResend ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Sender (from)</label>
                    <p className="text-xs text-gray-400 mt-1">Must be a verified domain in Resend.</p>
                    <input type="email" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Recipient (to)</label>
                    <p className="text-xs text-gray-400 mt-1">Where the weekly report lands.</p>
                    <input type="email" value={reportTo} onChange={(e) => setReportTo(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700">Trigger Key (auto-generated · read-only)</label>
                  <p className="text-xs text-gray-400 mt-1">Server-generated shared secret. The scheduled cron uses this to authenticate calls to /api/reports/weekly.</p>
                  <div className="mt-2 flex items-center gap-2">
                    <input type="text" readOnly value={triggerKey}
                      className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-mono text-gray-700 focus:outline-none" />
                    <button type="button" onClick={copyTrigger}
                      className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] text-gray-700 text-xs font-bold px-3 py-2.5 rounded-full transition-colors">
                      <Copy size={13} /> {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 flex-wrap pt-1">
                  <button type="button" onClick={handleSendTest} disabled={!resendKeySet || status === "sending" || !triggerKey}
                    className="flex items-center gap-2 bg-[color:var(--brand)] hover:bg-[color:var(--brand-dark)] disabled:opacity-40 text-white text-sm font-bold px-5 py-2.5 rounded-full transition-colors shadow-sm">
                    <Send size={15} /> {status === "sending" ? "Sending…" : "Send test report now"}
                  </button>
                  {!resendKeySet && (
                    <span className="text-xs text-gray-500 self-center">Save the Resend API key first.</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Business assumptions ─────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={16} className="text-[color:var(--brand)]" />
                <h3 className="text-sm font-bold text-gray-700">Business assumptions — used by the Values tab</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">All optional. Fill them in to enable expected pipeline value calculations.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <KpiInput label="Avg Invoice Value"           k="AVG_INVOICE_VALUE"       suffix="USD"    hint="Dollars per invoice" />
                <KpiInput label="Avg Invoices / Client"       k="AVG_INVOICES_PER_CLIENT" suffix="count"  hint="Lifetime invoice count" />
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
                <Save size={15} /> {status === "saving" ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={handleTestStreak} disabled={!apiKeySet || status === "testing"}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-[color:var(--brand)] hover:text-[color:var(--brand)] disabled:opacity-40 text-gray-700 text-sm font-bold px-5 py-2.5 rounded-full transition-colors">
                <TestTube2 size={15} /> {status === "testing" ? "Testing…" : "Test Streak Connection"}
              </button>
            </div>

            <p className="text-xs text-gray-400">
              All values save instantly to the Cloudflare KV store on the server. Live on the next page refresh.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
