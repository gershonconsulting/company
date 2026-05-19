"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "gershoncrm-company.demoMode";

interface DemoCtx {
  demoMode: boolean;
  toggle:   () => void;
  setOff:   () => void;
}

const Ctx = createContext<DemoCtx>({ demoMode: false, toggle: () => {}, setOff: () => {} });

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [demoMode, setDemoMode] = useState(false);

  // Hydrate from localStorage after mount (avoid SSR mismatch)
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === "1") setDemoMode(true);
    } catch { /* ignore */ }
  }, []);

  // Persist
  useEffect(() => {
    try {
      if (demoMode) window.localStorage.setItem(STORAGE_KEY, "1");
      else          window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, [demoMode]);

  const toggle = useCallback(() => setDemoMode((v) => !v), []);
  const setOff = useCallback(() => setDemoMode(false), []);

  return (
    <Ctx.Provider value={{ demoMode, toggle, setOff }}>
      {children}
      {demoMode && (
        <div className="fixed top-3 right-3 z-50 bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          DEMO MODE — showing simulated data
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useDemo(): DemoCtx {
  return useContext(Ctx);
}
