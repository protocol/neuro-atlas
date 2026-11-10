"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PublicFeedbackClient, PublicFeedbackError } from "../../lib/feedback-public-client";
import type { PublicFeedbackInput, PublicFeedbackConfig } from "../../lib/feedback-public/contracts";
import { allowedTarget, feedbackContext, semanticTargets, elementAt, pickElement, type PickedElement } from "./selection";

/** PR77/chart actions can dispatch this with optional {targetId}; unknown IDs are ignored. */
export const FEEDBACK_OPEN_EVENT = "atlas-feedback-open";
// Alt+Shift+F: deliberately not Cmd/Ctrl+K or browser Find. Ignored inside editable controls.
const editable = 'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[role="searchbox"]';
function message(error: unknown) { return error instanceof PublicFeedbackError ? error.message : "Feedback is unavailable. Your draft is still here; try again."; }
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
export function Feedback() {
  const client = useRef<PublicFeedbackClient | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLDivElement>(null);
  const toastLayer = useRef<HTMLDivElement>(null);
  const outline = useRef<HTMLDivElement>(null);
  const downTarget = useRef<PickedElement | undefined>(undefined);
  const returnFocus = useRef<HTMLElement | null>(null);
  const mode = useRef({ open: false, selecting: false });
  const pending = useRef<{ fingerprint: string; key: string; input: PublicFeedbackInput } | null>(null);
  const retainedDraft = useRef(false);
  const submitting = useRef(false);
  const mounted = useRef(false);
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [target, setTarget] = useState<string>();
  const [pinned, setPinned] = useState<PickedElement>();
  const [hover, setHover] = useState<PickedElement>();
  const [selectionHost, setSelectionHost] = useState<Element | null>(null);
  const [comment, setComment] = useState("");
  const [config, setConfig] = useState<PublicFeedbackConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [toastHost, setToastHost] = useState<Element | null>(null);
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
  }, [comment, open, selecting]);
  useLayoutEffect(() => { retainedDraft.current = !!comment || !!pinned || !!target; }, [comment, pinned, target]);

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
    setOpen(false); setSelecting(false);
  }
  function finishSelection(pick?: PickedElement) {
    setPinned(pick); setTarget(pick?.targetId); setSelecting(false); setHover(undefined);
    mode.current.selecting = false;
  }
  function cancelSelection() {
    mode.current.selecting = false; setSelecting(false); setHover(undefined);
  }
  useEffect(() => {
    mounted.current = true;
    client.current = new PublicFeedbackClient();
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
        if (mode.current.selecting) cancelSelection();
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
  // Page-lifetime handlers use refs/setters only; draft and retry identity stay in memory.
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
    const focus = selecting ? picker.current?.querySelector<HTMLElement>('[data-selection-back]') : dialog.current?.querySelector<HTMLElement>('textarea');
    focus?.focus({ preventScroll: true });
  }, [open, selecting]);
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

  async function submit() {
    if (submitting.current || !available || !comment.trim() || comment.length > 3000) return;
    submitting.current = true; setBusy(true); setError("");
    // Only intentional note/target edits start a new operation. Viewport, theme and
    // DOM movement must not mutate an uncertain retry or create duplicate issues.
    const fingerprint = JSON.stringify({ comment, target, element: pinned?.reference });
    try {
      if (pending.current?.fingerprint !== fingerprint) pending.current = {
        fingerprint, key: client.current!.newKey(),
        input: { feedback: comment, context: { ...feedbackContext(window, target), ...(pinned ? { element: { ...pinned.reference } } : {}) } },
      };
      const { input, key } = pending.current;
      await client.current!.submit(input, key);
      if (!mounted.current) return;
      setToastHost([...document.querySelectorAll<HTMLDialogElement>('dialog[open]:not([data-atlas-feedback])')].at(-1) ?? document.body);
      setToast("Logged in Linear");
      setComment(""); setPinned(undefined); setTarget(undefined); pending.current = null; close();
    } catch (cause) {
      if (mounted.current) setError(message(cause));
    } finally { submitting.current = false; if (mounted.current) setBusy(false); }
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
        <div className="atlas-feedback-actions"><button type="button" onClick={() => finishSelection()}>General page</button><button type="button" data-selection-back onClick={cancelSelection}>Back</button></div>
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
      {pinned && <div ref={outline} data-feedback-outline aria-hidden="true" className="atlas-feedback-outline" />}
      <section className="atlas-feedback-panel">
        <header><h2 className="atlas-feedback-target">{pinned?.label ?? target ?? "General page"}</h2>{(pinned || target) && <button type="button" disabled={busy} onClick={() => { setTarget(undefined); setPinned(undefined); }}>Clear</button>}<button type="button" data-feedback-close aria-label="Close feedback" onClick={close}>×</button></header>
        {configLoading ? <p role="status">Checking feedback connection…</p> : !config ? <p>Feedback connection unavailable. <button type="button" onClick={() => void loadConfig()}>Retry connection</button></p> : !config.enabled ? <p role="status">Feedback is disabled. Draft kept here.</p> : !config.connected ? <p role="status">Feedback is disconnected. Draft kept here. <button type="button" onClick={() => void loadConfig()}>Retry connection</button></p> : null}
        {error && <p role="alert">{error}</p>}
        <textarea ref={textarea} aria-label="Feedback" rows={1} maxLength={3000} placeholder="What should change?" value={comment} disabled={busy} onChange={event => setComment(event.target.value)} onKeyDown={event => {
          if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          event.preventDefault(); void submit();
        }} />
        <div className="atlas-feedback-actions"><button type="button" disabled={busy} onClick={selectArea}>Select element</button><button type="button" aria-label="Send feedback" data-feedback-submit disabled={!available || !comment.trim() || busy} onClick={() => void submit()}>{busy ? "Saving…" : "↑"}</button></div>

      </section>
    </dialog>}
  </>;
}
