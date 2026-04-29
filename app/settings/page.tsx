"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Eye, EyeOff, Save, TestTube2, ArrowLeft, Cloud, RefreshCw } from "lucide-react";
import Link from "next/link";

type Status = "idle" | "saving" | "saved" | "error" | "testing" | "test_ok" | "test_fail";

export default function SettingsPage() {
  const [apiKey,      setApiKey]      = useState("");
  const [pipelineKey, setPipelineKey] = useState("");
  const [apiKeySet,   setApiKeySet]   = useState(false);
  const [showKey,     setShowKey]     = useState(false);
  const [status,      setStatus]      = useState<Status>("idle");
  const [message,     setMessage]     = useState("");
  const [loading,     setLoading]     = useState(true);
  const [readonly,    setReadonly]     = useState(false);

  function loadSettings() {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setApiKeySet(d.STREAK_API_KEY_SET ?? false);
        setPipelineKey(d.STREAK_PIPELINE_KEY ?? "");
        setReadonly(d.readonly ?? false);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadSettings(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage("");
    try {
      const body: Record<string, string> = { STREAK_PIPELINE_KEY: pipelineKey };
      if (apiKey && apiKey !== "••••••••") body.STREAK_API_KEY = apiKey;
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
      setMessage("Saved! Cloudflare is redeploying — changes will be live in ~60 seconds.");
    } catch (err) {
      setStatus("error");
      setMessage(String(err));
    }
  }

  async function handleTest() {
    setStatus("testing");
    setMessage("");
    try {
      const res  = await fetch("/api/streak-data?test=1");
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

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6">
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <button onClick={loadSettings} disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Reload
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-6">Streak.com CRM credentials</p>

        {/* One-time setup notice */}
        {!loading && readonly && (
          <div className="mb-6 flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4 text-sm text-sky-800">
            <Cloud size={16} className="mt-0.5 shrink-0 text-sky-500" />
            <div>
              <p className="font-semibold mb-2">One-time setup needed (2 minutes)</p>
              <p className="text-sky-700 mb-3">Add these 2 variables in <strong>Cloudflare Pages → gershon-company → Settings → Environment variables</strong>, then this form unlocks permanently:</p>
              <div className="space-y-2 text-xs font-mono">
                <div className="bg-sky-100 rounded px-3 py-2">
                  <span className="text-sky-500">Variable:</span> <strong>CF_API_TOKEN</strong><br />
                  <span className="text-sky-500">Value:</span> a Cloudflare API token with <em>Cloudflare Pages:Edit</em> permission
                </div>
                <div className="bg-sky-100 rounded px-3 py-2">
                  <span className="text-sky-500">Variable:</span> <strong>CF_ACCOUNT_ID</strong><br />
                  <span className="text-sky-500">Value:</span> your account ID (shown in the Cloudflare dashboard URL)
                </div>
              </div>
              <p className="text-sky-600 mt-2 text-xs">Create API token at <strong>dash.cloudflare.com/profile/api-tokens</strong> → "Create Token" → "Edit Cloudflare Pages" template.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
            {/* API Key */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700">Streak API Key</label>
                {apiKeySet && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Saved</span>
                )}
              </div>
              <p className="text-xs text-gray-400">Streak → Settings → API &amp; Integrations</p>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKeySet ? "Enter a new key to replace the saved one" : "sk_live_…"}
                  disabled={readonly}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Pipeline Key */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3">
              <label className="text-sm font-semibold text-gray-700">Pipeline Key</label>
              <p className="text-xs text-gray-400">The Streak pipeline whose leads to track</p>
              <input
                type="text"
                value={pipelineKey}
                onChange={(e) => setPipelineKey(e.target.value)}
                placeholder="agCIEr7S…"
                disabled={readonly}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>

            {banner()}

            <div className="flex gap-3">
              {!readonly && (
                <button type="submit" disabled={status === "saving"}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                  <Save size={15} />
                  {status === "saving" ? "Saving…" : "Save & Deploy"}
                </button>
              )}
              <button type="button" onClick={handleTest} disabled={!apiKeySet || status === "testing"}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-400 disabled:opacity-40 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <TestTube2 size={15} />
                {status === "testing" ? "Testing…" : "Test Connection"}
              </button>
            </div>

            {!readonly && (
              <p className="text-xs text-gray-400">
                Saving updates your Cloudflare environment variables and triggers a redeploy (~60 seconds).
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
