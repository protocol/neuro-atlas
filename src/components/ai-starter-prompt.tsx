"use client";

import { useRef, useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};
const servingIndex = () => new URL("/llms.txt", window.location.origin).href;
const relativeIndex = () => "/llms.txt";

export function StarterPrompt() {
  const indexUrl = useSyncExternalStore(subscribe, servingIndex, relativeIndex);
  const [status, setStatus] = useState("");
  const textArea = useRef<HTMLTextAreaElement>(null);
  const prompt = `Use Neuro Atlas as source context. Start by fetching ${indexUrl} and follow only the relevant section or record links. If access returns 401, stop and ask me for an approved access method; never include credentials in a prompt or URL.\n\nMy question: [replace with your question]\n\nCite original sources beside claims. Retain data dates, units, coverage and uncertainty. Separate sourced funding rounds from valuations and memo capital; this is a screened BCI index, not a census. Keep observations distinct from hypotheses, projections and forecast mappings. Do not invent unwired readings or sum incomparable datasets. Use the bounded JSON query for filtering and follow its next links when needed. Tell me what the Atlas cannot establish.`;
  async function copy() {
    try {
      await window.navigator.clipboard.writeText(prompt);
      setStatus("Starter prompt copied.");
    } catch {
      textArea.current?.focus();
      textArea.current?.select();
      setStatus("Clipboard unavailable. The prompt is selected; copy it manually.");
    }
  }
  return (
    <div className="card p-5">
      <label htmlFor="atlas-starter-prompt" className="block text-sm font-semibold">Starter prompt</label>
      <p id="starter-help" className="mt-2 text-xs leading-relaxed text-muted">Replace the question, then paste this into an agent that can fetch web pages. The copy uses this deployment’s address, not a hard-coded hostname.</p>
      <textarea id="atlas-starter-prompt" ref={textArea} readOnly value={prompt} aria-describedby="starter-help" rows={11} className="mt-4 block w-full min-w-0 resize-y rounded-lg border border-border bg-background p-3 text-[13px] leading-6 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className="min-h-11 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">Copy starter prompt</button>
        <p role="status" aria-live="polite" className="text-xs text-muted">{status}</p>
      </div>
    </div>
  );
}
