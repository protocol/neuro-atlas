"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FeedbackClient, FeedbackClientError, type FeedbackConfig } from "../../lib/feedback-client";
import type { SimpleFeedbackInput, FeedbackSession, FeedbackStatus } from "../../lib/feedback/contracts";
import { allowedTarget, feedbackContext, semanticTargets, elementAt, pickElement, type PickedElement } from "./selection";

/** PR77/chart actions can dispatch this with optional {targetId}; unknown IDs are ignored. */
export const FEEDBACK_OPEN_EVENT = "atlas-feedback-open";
// Alt+Shift+F: deliberately not Cmd/Ctrl+K or browser Find. Ignored inside editable controls.
const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="searchbox"]';
const activeStates = new Set(["received", "queued", "working", "validating", "publishing", "pr_ready", "merged"]);
const labels: Record<string, string> = {
  received: "Received · awaiting processing", queued: "Queued", working: "Working", validating: "Validating", publishing: "Publishing", pr_ready: "PR ready", merged: "Merged · not yet verified live", live: "Live · deployment verified", needs_clarification: "Needs clarification", needs_human_review: "Needs human review", failed: "Failed", cancelled: "Cancelled",
};
function message(error: unknown) { return error instanceof FeedbackClientError ? error.message : "Feedback is unavailable. Your draft is still here; try again."; }
function visibleFeedbackControls(layer: HTMLDialogElement) {
  return [...layer.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary,input:not([disabled]):not([type="hidden"]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(control => {
    if (control.getAttribute("tabindex") === "-1" || control.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    for (let node: HTMLElement | null = control; node && node !== layer; node = node.parentElement) {
      if (node.tagName === "DETAILS" && !node.hasAttribute("open")) {
        const summary = [...node.children].find(child => child.tagName === "SUMMARY");
        if (!summary?.contains(control)) return false;
      }
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
    }
    return true;
  });
}
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
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const toastLayer = useRef<HTMLDivElement>(null);
  const outline = useRef<HTMLDivElement>(null);
  const downTarget = useRef<PickedElement | undefined>(undefined);
  const returnFocus = useRef<HTMLElement | null>(null);
  const mode = useRef({ open: false, selecting: false });
  const pending = useRef<{ fingerprint: string; key: string; input: SimpleFeedbackInput } | null>(null);
  const retainedDraft = useRef(false);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [target, setTarget] = useState<string>();
  const [pinned, setPinned] = useState<PickedElement>();
  const [hover, setHover] = useState<PickedElement>();
  const [selectionHost, setSelectionHost] = useState<Element | null>(null);
  const [step, setStep] = useState<"private" | "status">("private");
  const [comment, setComment] = useState("");
  const [config, setConfig] = useState<FeedbackConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [session, setSession] = useState<FeedbackSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<FeedbackStatus[]>([]);
  const [current, setCurrent] = useState<FeedbackStatus | null>(null);
  const [savedId, setSavedId] = useState<string>();
  const [toast, setToast] = useState("");
  const [toastHost, setToastHost] = useState<Element | null>(null);
  const [followup, setFollowup] = useState<{ id: string; version: number }>();
  const available = config?.enabled && config.connected;

  useLayoutEffect(() => {
    if (!toast) return;
    const layer = toastLayer.current!;
    layer.showPopover?.();
    const timeout = setTimeout(() => setToast(""), 6000);
    return () => { clearTimeout(timeout); if (layer.matches(":popover-open")) layer.hidePopover?.(); };
  }, [toast]);
  useLayoutEffect(() => {
    const field = textarea.current;
    if (!field) return;
    field.style.height = "0px";
    field.style.height = `${Math.max(36, Math.min(128, field.scrollHeight))}px`;
  }, [comment, open, selecting, step]);
  useLayoutEffect(() => { retainedDraft.current = !!comment || !!pinned || !!target || step === "status"; }, [comment, pinned, target, step]);

  function show(targetId?: unknown) {
    if (mode.current.open) return;
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const id = allowedTarget(targetId);
    if (id) {
      setTarget(id);
      const match = semanticTargets(document).find(value => value.id === id);
      const element = match?.element;
      setPinned(element ? pickElement(element) : undefined);
    }
    mode.current = { open: true, selecting: false };
    setOpen(true); setToast("");
    if (!id && !retainedDraft.current) selectArea();
    void loadConfig();
  }
  function close() {
    mode.current = { open: false, selecting: false };
    client.current?.cancelSignIn();
    setOpen(false); setSelecting(false);
  }
  function finishSelection(pick?: PickedElement) {
    setPinned(pick); setTarget(pick?.targetId); setSelecting(false); setHover(undefined);
    mode.current.selecting = false;
  }
  useEffect(() => {
    mounted.current = true;
    client.current = new FeedbackClient();
    const start = (event: Event) => show((event as CustomEvent).detail?.targetId);
    const keyboard = (event: KeyboardEvent) => {
      if (event.isComposing) return;
      if (mode.current.selecting && event.key === "Tab") {
        const controls = [...picker.current!.querySelectorAll<HTMLButtonElement>("button")];
        const index = controls.indexOf(document.activeElement as HTMLButtonElement);
        event.preventDefault(); event.stopImmediatePropagation();
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length]?.focus();
        return;
      }
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
  useLayoutEffect(() => {
    if (!open || selecting) return;
    const element = dialog.current!;
    element.showModal();
    return () => { element.close(); };
  }, [open, selecting]);
  useEffect(() => {
    if (!open) {
      if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
      return;
    }
    const focus = selecting ? picker.current?.querySelector<HTMLElement>('[data-selection-back]') : dialog.current?.querySelector<HTMLElement>(step === "private" ? 'textarea' : '[data-feedback-close]');
    focus?.focus({ preventScroll: true });
  }, [open, selecting, step]);
  useEffect(() => {
    if (!open || !selecting) return;
    const layer = picker.current!;
    layer.showPopover?.();
    const ownControl = (event: Event) => event.target instanceof window.Element && !!event.target.closest('[data-atlas-feedback]');
    const suppress = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const hit = (event: MouseEvent) => elementAt(document, event.clientX, event.clientY);
    const move = (event: MouseEvent) => {
      if (ownControl(event)) return;
      suppress(event);
      const next = hit(event);
      setHover(previous => previous?.element === next?.element ? previous : next);
    };
    const block = (event: Event) => {
      if (ownControl(event)) return;
      suppress(event);
      if (event.type === "pointerdown") downTarget.current = hit(event as MouseEvent);
      if (event.type === "click") {
        const next = downTarget.current ?? hit(event as MouseEvent);
        downTarget.current = undefined;
        if (next) finishSelection(next);
      }
    };
    window.addEventListener("pointermove", move, { capture: true, passive: false });
    const events = ["pointerdown", "pointerup", "mousedown", "mouseup", "click", "auxclick", "dblclick", "contextmenu", "dragstart"];
    events.forEach(type => window.addEventListener(type, block, { capture: true, passive: false }));
    return () => {
      window.removeEventListener("pointermove", move, true);
      events.forEach(type => window.removeEventListener(type, block, true));
      if (layer.matches(':popover-open')) layer.hidePopover?.();
      downTarget.current = undefined;
    };
  }, [open, selecting]);
  useLayoutEffect(() => {
    if (!open) return;
    const picked = selecting ? hover : pinned;
    const place = () => {
      const bounds = picked?.element.isConnected ? picked.element.getBoundingClientRect() : undefined;
      if (outline.current && bounds) Object.assign(outline.current.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
      const layer = dialog.current;
      if (!selecting && layer) {
        const viewport = window.visualViewport;
        const leftEdge = viewport?.offsetLeft ?? 0, topEdge = viewport?.offsetTop ?? 0;
        const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
        const size = layer.getBoundingClientRect();
        const x = Math.max(leftEdge + 10, Math.min(bounds?.left ?? (width <= 480 ? leftEdge + 10 : leftEdge + width - size.width - 24), leftEdge + width - size.width - 10));
        let y = bounds ? bounds.bottom + 8 : topEdge + 80;
        if (bounds && y + size.height > topEdge + height - 10 && bounds.top - size.height - 8 >= topEdge + 10) y = bounds.top - size.height - 8;
        y = Math.max(topEdge + 10, Math.min(y, topEdge + height - size.height - 10));
        Object.assign(layer.style, { left: `${x}px`, top: `${y}px`, maxHeight: `${Math.max(80, height - 20)}px` });
      }
    };
    place();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (dialog.current) observer?.observe(dialog.current);
    if (picked?.element) observer?.observe(picked.element);
    window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place); window.visualViewport?.addEventListener("scroll", place);
    return () => {
      observer?.disconnect(); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place); window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, selecting, hover, pinned]);

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
  async function submit() {
    if (submitting.current || !available || !session || !comment.trim() || comment.length > 3000) return;
    submitting.current = true; setBusy(true); setError("");
    // Only an intentional note/target/follow-up edit starts a new operation. Viewport,
    // theme, DOM movement and session renewal must not mutate an uncertain retry.
    const fingerprint = JSON.stringify({ followup, comment, target, element: pinned?.reference });
    if (pending.current?.fingerprint !== fingerprint) pending.current = {
      fingerprint, key: client.current!.newKey(),
      input: { feedback: comment, processingConsent: { approved: true, policyVersion: "atlas-feedback-simple-v1" }, context: { ...feedbackContext(window, target), ...(pinned ? { element: { ...pinned.reference } } : {}) } },
    };
    const { input, key } = pending.current;
    try {
      const receipt = followup
        ? await client.current!.followup(followup.id, followup.version, input, key)
        : await client.current!.submit(input, key);
      if (!mounted.current) return;
      if (!receipt.id || !Number.isSafeInteger(receipt.version) || !labels[receipt.state]) throw new FeedbackClientError("invalid_response", "Could not confirm feedback was saved. Retry with this draft.");
      setSavedId(receipt.id); setCurrent(null); setStep("private");
      setToastHost([...document.querySelectorAll<HTMLDialogElement>('dialog[open]:not([data-atlas-feedback])')].at(-1) ?? document.body);
      setToast("Feedback saved");
      setComment(""); setFollowup(undefined); pending.current = null; close();
      await refresh(receipt.id);
    } catch (cause) {
      if (!mounted.current) return;
      setError(message(cause)); if (!client.current?.getSession()) setSession(null);
    } finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }
  function beginFollowup() {
    if (!current) return;
    setFollowup({ id: current.id, version: current.version }); setStep("private"); setComment(""); setError("");
    // History can refer to a different record than the last locally pinned element.
    // Require a fresh intentional target (or General page), never inherit that stale pin.
    setTarget(undefined); setPinned(undefined); selectArea();
  }
  function selectArea() {
    const nativeModal = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]:not([data-atlas-feedback])')].at(-1);
    setSelectionHost(nativeModal ?? document.body); setHover(undefined);
    setSelecting(true); mode.current.selecting = true;
  }
  return <>
    <button type="button" className="atlas-feedback-launch" aria-keyshortcuts="Alt+Shift+F" title="Feedback (Alt+Shift+F, outside text fields)" onClick={() => show()}>Feedback</button>
    {toast && toastHost && createPortal(<div ref={toastLayer} popover="manual" data-atlas-feedback data-feedback-toast className="atlas-feedback-toast" role="status">{toast}</div>, toastHost)}
    {open && selecting && selectionHost && createPortal(<div ref={picker} popover="manual" data-atlas-feedback data-feedback-selection className="atlas-feedback-picker" role="dialog" aria-label="Select feedback element">
      {hover && <div ref={outline} data-feedback-outline aria-hidden="true" className="atlas-feedback-outline" />}
      <div className="atlas-feedback-selection-controls" data-selection-controls>
        <p>Point to an element. Click to attach.</p>
        <div className="atlas-feedback-actions"><button type="button" onClick={() => finishSelection()}>General page</button><button type="button" data-selection-back onClick={() => { mode.current.selecting = false; setSelecting(false); setHover(undefined); }}>Back</button></div>
      </div>
    </div>, selectionHost)}
    {open && !selecting && <dialog ref={dialog} data-atlas-feedback data-feedback-composer className="atlas-feedback-layer" aria-label="Atlas feedback" aria-modal="true"
      onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
      onKeyDown={event => {
        if (event.key !== "Tab") return;
        const controls = visibleFeedbackControls(event.currentTarget);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      {pinned && step !== "status" && <div ref={outline} data-feedback-outline aria-hidden="true" className="atlas-feedback-outline" />}
      <section className="atlas-feedback-panel">
        <header><h2 className="atlas-feedback-target">{step === "status" ? "Feedback history" : pinned?.label ?? target ?? (followup ? "Follow up · General page" : "General page")}</h2>{step === "private" && (pinned || target) && <button type="button" disabled={busy} onClick={() => { setTarget(undefined); setPinned(undefined); }}>Clear</button>}<button type="button" data-feedback-close aria-label="Close feedback" onClick={close}>×</button></header>
        {configLoading ? <p role="status">Checking feedback connection…</p> : !config ? <p>Feedback connection unavailable. <button type="button" onClick={() => void loadConfig()}>Retry connection</button></p> : !config.enabled ? <p role="status">Feedback is disabled. Draft kept here.</p> : !config.connected ? <p role="status">Feedback is disconnected. Draft kept here. <button type="button" onClick={() => void loadConfig()}>Retry connection</button></p> : null}
        {available && !session && <div className="atlas-feedback-auth"><button type="button" disabled={authBusy} onClick={signIn}>{authBusy ? "Signing in…" : "Sign in with GitHub"}</button>{authBusy && <button type="button" onClick={() => client.current?.cancelSignIn()}>Cancel sign-in</button>}</div>}
        {session && step === "status" && <details><summary>Account</summary><div className="atlas-feedback-auth"><span>{session.actor.login}</span><button type="button" disabled={busy} onClick={() => void signOut()}>Sign out</button></div></details>}
        {error && <p role="alert">{error}</p>}
        {step === "private" && <>

          <textarea ref={textarea} aria-label="Feedback" rows={1} maxLength={3000} placeholder="What should change?" value={comment} disabled={busy} onChange={event => setComment(event.target.value)} onKeyDown={event => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            event.preventDefault(); void submit();
          }} />
          <p className="atlas-feedback-note">Sent privately to the agent. Proposed code changes appear in a public draft PR.</p>
          <div className="atlas-feedback-actions"><button type="button" disabled={busy} onClick={selectArea}>Select element</button>{session && <button type="button" disabled={busy} onClick={() => { setStep("status"); void refresh(); }}>History</button>}<button type="button" aria-label="Send feedback" data-feedback-submit disabled={!available || !session || !comment.trim() || busy} onClick={() => void submit()}>{busy ? "Saving…" : "↑"}</button></div>
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
        {session && step === "status" && <details><summary>My recent feedback</summary>{items.length ? <ul className="atlas-feedback-history">{items.map(item => <li key={item.id}><button type="button" onClick={() => { setSavedId(item.id); setCurrent(item); setStep("status"); }}>{labels[item.state] ?? "Unknown"} · {item.id} · v{item.version}</button></li>)}</ul> : <p>No feedback loaded.</p>}<button type="button" onClick={() => void refresh()}>Refresh list</button></details>}

      </section>
    </dialog>}
  </>;
}
