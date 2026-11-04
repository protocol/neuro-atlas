"use client";

import { useEffect, useRef, useState } from "react";
import { FeedbackClient, FeedbackClientError, type FeedbackConfig } from "../../lib/feedback-client";
import type { FeedbackInput, FeedbackSession, FeedbackStatus } from "../../lib/feedback/contracts";
import { allowedTarget, feedbackContext, semanticTargets, targetAt } from "./selection";

/** PR77/chart actions can dispatch this with optional {targetId}; unknown IDs are ignored. */
export const FEEDBACK_OPEN_EVENT = "atlas-feedback-open";
// Alt+Shift+F: deliberately not Cmd/Ctrl+K or browser Find. Ignored inside editable controls.
const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="searchbox"]';
const activeStates = new Set(["received", "queued", "working", "validating", "publishing", "pr_ready", "merged"]);
const labels: Record<string, string> = {
  received: "Received · awaiting processing", queued: "Queued", working: "Working", validating: "Validating", publishing: "Publishing", pr_ready: "PR ready", merged: "Merged · not yet verified live", live: "Live · deployment verified", needs_clarification: "Needs clarification", needs_human_review: "Needs human review", failed: "Failed", cancelled: "Cancelled",
};
function message(error: unknown) { return error instanceof FeedbackClientError ? error.message : "Feedback is unavailable. Your draft is still here; try again."; }
function publicPr(status: FeedbackStatus) {
  const pr = status.pr;
  return pr && Number.isSafeInteger(pr.number) && pr.number > 0 && pr.url === `https://github.com/protocol/neuro-atlas/pull/${pr.number}` ? pr.url : undefined;
}
function previewUrl(status: FeedbackStatus) {
  if (!status.preview || status.preview.verifiedSha !== status.pr?.headSha) return undefined;
  try { const url = new URL(status.preview.url); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; } catch { return undefined; }
}

export function Feedback() {
  const client = useRef<FeedbackClient | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const mode = useRef({ open: false, selecting: false });
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [target, setTarget] = useState<string>();
  const [choices, setChoices] = useState<string[]>([]);
  const [hover, setHover] = useState<string>();
  const [step, setStep] = useState<"private" | "public" | "status">("private");
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [acceptance, setAcceptance] = useState("");
  const [approved, setApproved] = useState(false);
  const [context, setContext] = useState<FeedbackInput["context"]>();
  const [config, setConfig] = useState<FeedbackConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [session, setSession] = useState<FeedbackSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<FeedbackStatus[]>([]);
  const [current, setCurrent] = useState<FeedbackStatus | null>(null);
  const [savedId, setSavedId] = useState<string>();
  const [followup, setFollowup] = useState<{ id: string; version: number }>();
  const available = config?.enabled && config.connected;

  function show(targetId?: unknown) {
    if (mode.current.open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = allowedTarget(targetId);
    if (id) { setTarget(id); setApproved(false); }
    mode.current = { open: true, selecting: false };
    setOpen(true);
    void loadConfig();
  }
  function close() {
    mode.current = { open: false, selecting: false };
    client.current?.cancelSignIn();
    setOpen(false); setSelecting(false);
  }
  function finishSelection(id?: string) {
    setTarget(id); setApproved(false); setSelecting(false);
    mode.current.selecting = false;
  }
  useEffect(() => {
    mounted.current = true;
    client.current = new FeedbackClient();
    const start = (event: Event) => show((event as CustomEvent).detail?.targetId);
    const keyboard = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (event.key === "Escape" && mode.current.open) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (mode.current.selecting) { mode.current.selecting = false; setSelecting(false); }
        else close();
        return;
      }
      if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && (event.code === "KeyF" || event.key.toLowerCase() === "f") && !(event.target instanceof HTMLElement && event.target.closest(editable))) {
        event.preventDefault(); event.stopImmediatePropagation(); show();
      }
    };
    window.addEventListener(FEEDBACK_OPEN_EVENT, start);
    window.addEventListener("keydown", keyboard, true);
    return () => {
      mounted.current = false;
      client.current?.dispose(); client.current = null;
      window.removeEventListener(FEEDBACK_OPEN_EVENT, start);
      window.removeEventListener("keydown", keyboard, true);
    };
  // Page-lifetime handlers use refs/setters only; resubscribing would dispose the memory session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function loadConfig() {
    setConfigLoading(true); setError("");
    try { const value = await client.current!.config(); if (mounted.current) setConfig(value); }
    catch (cause) { if (mounted.current) { setError(message(cause)); setConfig(null); } }
    finally { if (mounted.current) setConfigLoading(false); }
  }
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    element.showModal();
    return () => {
      element.close();
      if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const focus = dialog.current?.querySelector<HTMLElement>(selecting ? '[data-selection-back]' : step === "private" ? 'textarea' : step === "public" ? 'input' : '[data-feedback-close]');
    focus?.focus({ preventScroll: true });
  }, [open, selecting, step]);

  async function refresh(id = savedId) {
    try {
      const list = await client.current!.list();
      const detail = id ? await client.current!.status(id) : null;
      if (!mounted.current) return;
      setItems(list.items); if (detail) setCurrent(detail);
    } catch (cause) {
      if (!mounted.current) return;
      setError(message(cause));
      if (!client.current?.getSession()) setSession(null);
    }
  }
  useEffect(() => {
    if (!open || !session) return;
    let running = false;
    const poll = async () => {
      if (document.visibilityState === "hidden" || running) return;
      if (!client.current?.getSession()) { setSession(null); setError("Sign in again. Your feedback session expired."); return; }
      running = true; await refresh(savedId); running = false;
    };
    void poll();
    const timer = activeStates.has(current?.state ?? "received") || items.some(item => activeStates.has(item.state)) ? setInterval(() => void poll(), 5000) : undefined;
    const onVisible = () => { if (document.visibilityState !== "hidden") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  // State transitions rebuild the timer; edits to the composer never trigger network requests.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, session, savedId, current?.state]);

  function signIn() {
    setAuthBusy(true); setError("");
    // No await before this call: the popup must remain a direct user gesture.
    void client.current!.signIn().then(value => { if (mounted.current) setSession(value); }, cause => { if (mounted.current) setError(message(cause)); }).finally(() => { if (mounted.current) setAuthBusy(false); });
  }
  async function signOut() {
    try { await client.current!.signOut(); }
    catch (cause) { setError(message(cause)); }
    finally { setSession(null); setItems([]); setCurrent(null); }
  }
  function review() { setContext(feedbackContext(window, target)); setApproved(false); setStep("public"); setError(""); }
  const criteria = acceptance.split("\n").map(value => value.trim()).filter(Boolean);
  const validPublic = title.trim() && summary.trim() && criteria.length >= 1 && criteria.length <= 5 && criteria.every(value => value.length <= 200);
  async function submit() {
    if (submitting.current || !available || !session || !approved || !validPublic || !context || !comment.trim()) return;
    submitting.current = true; setBusy(true); setError("");
    const input: FeedbackInput = { privateComment: comment.trim(), publicTask: { title: title.trim(), summary: summary.trim(), acceptance: criteria }, publicApproval: { approved: true, policyVersion: "atlas-feedback-v1" }, context };
    const fingerprint = JSON.stringify({ followup, input });
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, key: client.current!.newKey() };
    try {
      const receipt = followup
        ? await client.current!.followup(followup.id, followup.version, input, pending.current.key)
        : await client.current!.submit(input, pending.current.key);
      if (!mounted.current) return;
      if (!receipt.id || !Number.isSafeInteger(receipt.version) || !labels[receipt.state]) throw new FeedbackClientError("invalid_response", "Could not confirm feedback was saved. Retry with this draft.");
      setSavedId(receipt.id); setCurrent(null); setStep("status");
      setComment(""); setTitle(""); setSummary(""); setAcceptance(""); setApproved(false); setFollowup(undefined); pending.current = null;
      await refresh(receipt.id);
    } catch (cause) {
      if (!mounted.current) return;
      setError(message(cause)); if (!client.current?.getSession()) setSession(null);
    } finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }
  function beginFollowup() {
    if (!current) return;
    setFollowup({ id: current.id, version: current.version }); setStep("private"); setApproved(false); setComment(""); setTitle(""); setSummary(""); setAcceptance(""); setError("");
  }
  function selectArea() {
    setChoices([...new Set(semanticTargets(document).map(value => value.id))]);
    setSelecting(true); mode.current.selecting = true;
  }
  function changePublic(setter: (value: string) => void, value: string) { setter(value); setApproved(false); }
  return <>
    <button type="button" className="atlas-feedback-launch" aria-keyshortcuts="Alt+Shift+F" title="Feedback (Alt+Shift+F, outside text fields)" onClick={() => show()}>Feedback</button>
    {open && <dialog ref={dialog} data-atlas-feedback data-feedback-composer={!selecting ? "" : undefined} data-feedback-selection={selecting ? "" : undefined}
      className={`atlas-feedback-layer${selecting ? " atlas-feedback-selecting" : ""}`} aria-label={selecting ? "Select feedback area" : "Atlas feedback"} aria-modal="true"
      onCancel={event => { event.preventDefault(); event.stopPropagation(); if (selecting) finishSelection(target); else close(); }}
      onClick={event => { if (!selecting && event.target === event.currentTarget) close(); }}
      onPointerMove={event => { if (selecting) setHover(targetAt(document, event.clientX, event.clientY)); }}
      onPointerUp={event => { if (selecting && !(event.target as HTMLElement).closest('[data-selection-controls]')) finishSelection(targetAt(document, event.clientX, event.clientY)); }}>
      {selecting ? <div className="atlas-feedback-selection-controls" data-selection-controls>
        <p>Choose a chart or use General page. No screenshot or text is captured.</p>
        {hover && <p className="atlas-feedback-target">{hover}</p>}
        <div className="atlas-feedback-actions"><button type="button" onClick={() => finishSelection()}>General page</button><button type="button" data-selection-back onClick={() => finishSelection(target)}>Back to feedback</button></div>
        <details><summary>Choose by chart ID</summary><ul>{choices.map(id => <li key={id}><button type="button" onClick={() => finishSelection(id)}>{id}</button></li>)}</ul></details>
      </div> : <section className="atlas-feedback-panel">
        <header><h2>{followup ? "Follow up" : "Atlas feedback"}</h2><button type="button" data-feedback-close aria-label="Close feedback" onClick={close}>×</button></header>
        <p className="atlas-feedback-note">Owner-only · private intake. No screenshots, uploads, or page text capture.</p>
        {configLoading ? <p role="status">Checking feedback connection…</p> : !config ? <p>Feedback connection unavailable. <button type="button" onClick={() => void loadConfig()}>Retry connection</button></p> : !config.enabled ? <p role="status">Feedback is disabled. Your draft stays in this page; nothing is submitted.</p> : !config.connected ? <p role="status">Feedback is disconnected. Your draft stays here; processing is not running. <button type="button" onClick={() => void loadConfig()}>Retry connection</button></p> : null}
        {available && <div className="atlas-feedback-auth">{session ? <><span>Signed in as {session.actor.login}</span><button type="button" onClick={() => void signOut()}>Sign out</button></> : <><span>Verify the owner account to submit.</span><button type="button" disabled={authBusy} onClick={signIn}>{authBusy ? "Signing in…" : "Sign in with GitHub"}</button>{authBusy && <button type="button" onClick={() => client.current?.cancelSignIn()}>Cancel sign-in</button>}</>}</div>}
        {error && <p role="alert">{error}</p>}
        {step === "private" && <>
          <label>1 · Private comment<textarea aria-label="Private comment" rows={2} maxLength={3000} placeholder="What should change?" value={comment} onChange={event => setComment(event.target.value)} /></label>
          <div className="atlas-feedback-actions"><button type="button" onClick={selectArea}>Select area</button><span className="atlas-feedback-target">{target ?? "General page"}</span>{target && <button type="button" onClick={() => { setTarget(undefined); setApproved(false); }}>Clear area</button>}</div>
          <p className="atlas-feedback-note">This comment stays private and is not sent to the code-writing model. Only your separately approved public task can reach the worker.</p>
          <button type="button" disabled={!comment.trim()} onClick={review}>Review public task</button>
        </>}
        {step === "public" && <>
          <h3>2 · Public PR task</h3><p className="atlas-feedback-note">Write a publishable task separately. Do not include private details. Automatic changes are limited to safe presentation CSS and selected navigation/tab labels; other requests require human review.</p>
          <label>Title<input aria-label="Public title" maxLength={100} value={title} onChange={event => changePublic(setTitle, event.target.value)} /></label>
          <label>Public summary<textarea aria-label="Public summary" maxLength={1500} rows={2} value={summary} onChange={event => changePublic(setSummary, event.target.value)} /></label>
          <label>Acceptance criteria · one per line, 1–5<textarea aria-label="Acceptance criteria" rows={2} maxLength={1004} value={acceptance} onChange={event => changePublic(setAcceptance, event.target.value)} /></label>
          {criteria.some(value => value.length > 200) && <p>Keep each criterion under 201 characters.</p>}
          <details className="atlas-feedback-context"><summary>Public context · review before approving</summary><p>Route: {context?.route}<br />Target: {context?.targetId ?? "General page"}<br />Viewport: {context?.viewport.width} × {context?.viewport.height}<br />Theme: {context?.theme}<br />No query, fragment, scenario, or revision is attached.</p></details>
          <label className="atlas-feedback-consent"><input data-feedback-consent type="checkbox" checked={approved} onChange={event => setApproved(event.target.checked)} /><span>I approve this task and the displayed context. This text and any resulting code diff will be public on GitHub.</span></label>
          <div className="atlas-feedback-actions"><button type="button" disabled={busy} onClick={() => { setStep("private"); setApproved(false); }}>Back</button><button type="button" data-feedback-submit disabled={!available || !session || !approved || !validPublic || busy} onClick={() => void submit()}>{busy ? "Saving…" : followup ? "Submit follow-up" : "Submit feedback"}</button></div>
        </>}
        {step === "status" && <section aria-live="polite"><h3>Saved · {savedId}</h3>{current ? <>
          <p>{labels[current.state] ?? "Status unavailable"} · Version {current.version}</p>
          {current.state === "received" && <p className="atlas-feedback-note">Saved privately. This does not mean a worker has started.</p>}
          {current.clarification && <p>{current.clarification}</p>}
          {current.reasonCode && <p className="atlas-feedback-note">Reason: {current.reasonCode}</p>}
          <div className="atlas-feedback-actions">{publicPr(current) && <a href={publicPr(current)} target="_blank" rel="noreferrer">View real PR ↗</a>}{previewUrl(current) && <a href={previewUrl(current)} target="_blank" rel="noreferrer">Verified preview ↗</a>}</div>
          {current.state === "merged" && <p>Follow-ups after merge require human review; no new automatic PR.</p>}
          <button type="button" onClick={beginFollowup}>Follow up</button>
        </> : <p>Saved. Status is not yet available; no PR or preview is confirmed.</p>}<button type="button" onClick={() => void refresh()}>Refresh status</button><button type="button" onClick={() => { setStep("private"); setFollowup(undefined); }}>New feedback</button></section>}
        {session && <details><summary>My recent feedback</summary>{items.length ? <ul className="atlas-feedback-history">{items.map(item => <li key={item.id}><button type="button" onClick={() => { setSavedId(item.id); setCurrent(item); setStep("status"); }}>{labels[item.state] ?? "Unknown"} · {item.id} · v{item.version}</button></li>)}</ul> : <p>No feedback loaded.</p>}<button type="button" onClick={() => void refresh()}>Refresh list</button></details>}
        <footer>Alt+Shift+F outside text fields · Escape returns one layer · Drafts exist only until this page reloads.</footer>
      </section>}
    </dialog>}
  </>;
}
