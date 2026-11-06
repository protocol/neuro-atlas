"use client";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { bundledTrends, type TrendsView } from '@/lib/field-velocity/google-trends-default';
import { parseTrendsView } from '@/lib/field-velocity/google-trends-view';
import { atlasPath } from '@/lib/atlas-path';

const Context = createContext<TrendsView>(bundledTrends);
export function useTrendsView() { return useContext(Context); }

// Document scope also survives a client-side route unmount/remount. No SSR request
// state is shared; failed reads are retained too, so focus/navigation never retries.
const documentLoads = new WeakMap<Document, Promise<TrendsView>>();

/** Load once for both groups. Never change a rendered source while an old tab exports it. */
export function GoogleTrendsProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState(bundledTrends);
  useEffect(() => {
    let active = true;
    let pending = documentLoads.get(document);
    if (!pending) {
      pending = (async () => {
        const response = await fetch(atlasPath('/api/google-trends/latest'), { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(35_000) });
        if (response.status !== 200 || response.redirected || !/^application\/json(;|$)/i.test(response.headers.get('content-type') ?? '')) throw new Error('Invalid Trends response');
        const next = parseTrendsView(await response.json());
        if (next.snapshot.end < bundledTrends.snapshot.end) throw new Error('Stale Trends response');
        return next;
      })();
      documentLoads.set(document, pending);
    }
    pending.then(next => { if (active) setView(next); }).catch(() => { /* Preserve the verified whole-window fallback. */ });
    return () => { active = false; };
  }, []);
  return <Context.Provider value={view}>{children}</Context.Provider>;
}
