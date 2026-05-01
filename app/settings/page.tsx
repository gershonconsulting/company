"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, TestTube2, ArrowLeft, Cloud, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";

type Status = "idle" | "testing" | "test_ok" | "test_fail";

export default function SettingsPage() {
  const [apiKeySet,   setApiKeySet]   = useState(false);
  const [pipelineKey, setPipelineKey] = useState("");
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

        <div className="mb-6 flex items-start gap-3 bg-sky-50 border border-sky-200 rounded-xl px-5 py-4 text-sm text-sky-800">
          <Cloud size={16} className="mt-0.5 shrink-0 text-sky-500" />
          <div>
            <p className="font-semibold mb-1">Where credentials live</p>
            <p className="text-sky-700">This site runs on Cloudflare Pages. Streak credentials are stored as environment variables on the <strong>gershoncrm-company</strong> Pages project.</p>
            <p className="text-sky-700 mt-2">To rotate keys: <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline font-medium">Cloudflare dashboard <ExternalLink size={12} /></a> → Workers &amp; Pages → <strong>gershoncrm-company</strong> → Settings → Environment variables. Update <code>STREAK_API_KEY</code> and/or <code>STREAK_PIPELINE_KEY</code>, then redeploy.</p>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 animate-pulse">Loading…</div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Streak API Key</span>
                {apiKeySet ? (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                    <CheckCircle size={12} /> Set
                  </span>
                ) : (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                    <AlertCircle size={12} /> Not set
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">env var <code>STREAK_API_KEY</code></p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col gap-2">
              <span className="text-sm font-semibold text-gray-700">Pipeline Key</span>
              <p className="text-xs text-gray-400">env var <code>STREAK_PIPELINE_KEY</code></p>
              <p className="text-sm text-gray-700 font-mono">{pipelineKey || <span className="text-amber-600">Not set</span>}</p>
            </div>

            {status === "test_ok" && (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle size={16} /> {message}
              </div>
            )}
            {status === "test_fail" && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <AlertCircle size={16} /> {message}
              </div>
            )}

            <button type="button" onClick={handleTest} disabled={!apiKeySet || status === "testing"}
              className="self-start flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-400 disabled:opacity-40 text-gray-700 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <TestTube2 size={15} />
              {status === "testing" ? "Testing…" : "Test Connection"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
