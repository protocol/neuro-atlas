"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { ATLAS_COOKIE_SETTINGS_EVENT, getAtlasAnalytics, type AnalyticsState } from "@/lib/atlas-analytics";

const Eligibility = createContext(false);
const choiceClass = "min-h-11 w-full rounded-full border border-border-strong bg-surface px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

// Mounted only by the actual app layout. The server-rendered launch gate bypasses it.
export function AtlasAnalytics({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AnalyticsState>({ eligible: false, showBanner: false, choice: null });
  const controller = useRef<ReturnType<typeof getAtlasAnalytics> | null>(null);
  useEffect(() => {
    controller.current = getAtlasAnalytics(window);
    return controller.current.connect(setState);
  }, []);

  return (
    <Eligibility.Provider value={state.eligible}>
      {children}
      {state.eligible && state.showBanner && (
        <section role="dialog" aria-modal="false" aria-label="Analytics cookies" aria-describedby="atlas-cookie-description" className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-xl rounded-2xl border border-border-strong bg-surface p-5 text-foreground shadow-2xl">
          <h2 className="text-base font-semibold">Analytics cookies</h2>
          <p id="atlas-cookie-description" className="mb-4 mt-2 text-sm leading-6 text-muted">
            We use Google Analytics to understand how Neuro Atlas is used. You can accept or reject analytics cookies and change your choice anytime in Cookie settings.{" "}
            <a href="https://www.plneuro.xyz/privacy-policy/" className="text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Privacy Policy</a>.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className={choiceClass} onClick={() => controller.current?.choose("denied")}>Reject</button>
            <button type="button" className={choiceClass} onClick={() => controller.current?.choose("granted")}>Accept</button>
          </div>
        </section>
      )}
    </Eligibility.Provider>
  );
}

export function AtlasCookieSettings() {
  const eligible = useContext(Eligibility);
  if (!eligible) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new window.Event(ATLAS_COOKIE_SETTINGS_EVENT))} className="inline-flex min-h-7 items-center rounded-sm py-1 text-[13px] leading-5 text-foreground/70 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent pointer-coarse:min-h-11 pointer-coarse:py-2">
      Cookie settings
    </button>
  );
}
