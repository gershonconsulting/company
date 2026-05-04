"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Eye, EyeOff, Save, TestTube2, ArrowLeft, RefreshCw } from "lucide-react";
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

  function loadSettings() {
    setLoading(true);
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setApiKeySet(d.STREAK_API_KEY_SET ?? false);
        setPipelineKey(d.STREAK_PIPELINE_KEY ?? "");
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

        {loading ? (
          <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-5">
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
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button type="button" onClick={() => setShowKey(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-3">
              <label className="text-sm font-semibold text-gray-700">Pipeline Key</label>
              <p className="text-xs text-gray-400">The Streak pipeline whose leads to track</p>
              <input
                type="text"
                value={pipelineKey}
                onChange={(e) => setPipelineKey(e.target.value)}
                placeholder="agCIEr7S…"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {banner()}

            <div className="flex gap-3">
              <button type="submit" disabled={status === "saving"}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <Save size={15} />
                {status === "saving" ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={handleTest} disabled={!apiKeySet || status === "testing"}
                className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-400 disabled:opacity-40 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                <TestTube2 size={15} />
                {status === "testing" ? "Testing…" : "Test Connection"}
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Saved instantly to the Cloudflare KV store on the server. Live on the next dashboard refresh.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
