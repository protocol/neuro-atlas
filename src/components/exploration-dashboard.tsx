"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FieldVelocityGraphDetail } from "@/components/field-velocity-graph";
import { FIELD_VELOCITY_GRAPHS, graphPath } from "@/data/field-velocity-links";
import { recordingViewToken } from "@/lib/recording-view";
import { useDashboardLayout } from "@/components/use-dashboard-layout";
import { atlasPath } from "@/lib/atlas-path";

import { CARD_LIMIT, DASHBOARD_ROUTE, DASHBOARD_STORAGE, NAME_LIMIT, SAVE_LIMIT, dashboardHash, isDashboardGraph, readDashboardLink, readDashboards, type CardState, type DashboardState } from "@/lib/dashboard-state";

type Card = CardState & { id: number };
type Focus = { id: number; action: "earlier" | "later" | "remove" } | "search" | "name" | "catalog-toggle";
const catalogId = "dashboard-chart-catalog";

export function ExplorationDashboard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [search, setSearch] = useState("");
  const [catalogOpen, setCatalogOpen] = useState<boolean | null>(null);
  const showCatalog = catalogOpen ?? (cards.length === 0);
  const [name, setName] = useState("Untitled dashboard");
  const [saved, setSaved] = useState<DashboardState[] | null>(null);
  const [storageError, setStorageError] = useState("");
  const [saveConflict, setSaveConflict] = useState("");
  const [status, setStatus] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkFallback, setLinkFallback] = useState("");
  const next = useRef(1);
  const openedSave = useRef<DashboardState | null>(null);
  const draftRevision = useRef(0);
  const root = useRef<HTMLElement>(null);
  const captureLayout = useDashboardLayout(root, cards);
  const pendingFocus = useRef<Focus | null>(null);
  useEffect(() => {
    const { search, hash } = window.location;
    const add = new URLSearchParams(search).getAll("add");
    if (hash.startsWith("#d=")) {
      const linked = readDashboardLink(hash);
      if (linked && !add.length) {
        setName(linked.name);
        setCards(linked.cards.map((card, id) => ({ ...card, id })));
        next.current = linked.cards.length;
      } else setLinkError("This dashboard link could not be opened. Choose charts below to start a new one.");
    } else if (add.length === 1 && isDashboardGraph(add[0])) {
      const recordingView = add[0] === "simultaneous-neural-recordings" ? recordingViewToken(new URL(window.location.href)) : undefined;
      setCards([{ id: 0, slug: add[0], ...(recordingView && { settings: { recordingView } }) }]);
    } else if (add.length) setLinkError("That chart could not be added. Choose a chart below.");
  }, []);
  useEffect(() => {
    function refresh(event?: StorageEvent) {
      if (event && event.key !== DASHBOARD_STORAGE && event.key !== null) return;
      try {
        const storage = window.localStorage;
        if (event && event.storageArea !== storage) return;
        const existing = readDashboards(storage.getItem(DASHBOARD_STORAGE));
        setSaved(existing);
        setStorageError(existing ? "" : "Saved dashboards could not be read. The original was left unchanged.");
      } catch {
        setSaved(null);
        setStorageError("Local storage is unavailable. You can still compare charts.");
      }
    }
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);
  useLayoutEffect(() => {
    const focus = pendingFocus.current;
    pendingFocus.current = null;
    if (focus) root.current?.querySelector<HTMLElement>(typeof focus === "string" ? `[data-dashboard-${focus}]` :
      `[data-dashboard-card="${focus.id}"] [data-dashboard-${focus.action}]`)?.focus();
  }, [cards, showCatalog]);
  useLayoutEffect(() => () => { draftRevision.current += 1; }, [cards, name]);

  const snapshot = (title: string): DashboardState => ({ name: title, cards: cards.map(({ id: _id, ...card }) => card) });
  async function copyLink() {
    const url = window.location.origin + atlasPath(DASHBOARD_ROUTE) + dashboardHash(snapshot(name.trim() || "Untitled dashboard"));
    setLinkFallback("");
    try {
      await window.navigator.clipboard.writeText(url);
      setStatus("Dashboard link copied.");
    } catch {
      setLinkFallback(url);
      setStatus("Copy the dashboard link below.");
    }
  }
  async function save() {
    const trimmed = name.trim();
    if (!saved || !trimmed) return;
    const revision = draftRevision.current;
    const address = window.location.href;
    const opened = openedSave.current;
    const stillCurrent = () => draftRevision.current === revision && window.location.href === address && openedSave.current === opened;
    setStatus("");
    setSaveConflict("");
    try {
      const locks = window.navigator.locks;
      if (locks) {
        await locks.request(DASHBOARD_STORAGE, { ifAvailable: true }, lock => {
          if (!stillCurrent()) return;
          if (lock) writeSave(trimmed, opened);
          else setStorageError("Another tab is saving dashboards. Try saving again.");
        });
      } else {
        // Older contexts can check for stale versions but cannot serialize peers' writes.
        writeSave(trimmed, opened);
      }
    } catch { if (stillCurrent()) setStorageError("Could not save this dashboard. Try again or copy a dashboard link."); }
  }
  function writeSave(trimmed: string, opened: DashboardState | null) {
    const storage = window.localStorage;
    const current = readDashboards(storage.getItem(DASHBOARD_STORAGE));
    setSaved(current);
    if (!current) { setStorageError("Saved dashboards could not be read. The original was left unchanged."); return; }
    setStorageError("");
    const index = current.findIndex(item => item.name === trimmed);
    // Never acquire update rights just by typing a name or importing a link.
    const expected = opened?.name === trimmed ? opened : undefined;
    if (JSON.stringify(current[index]) !== JSON.stringify(expected)) {
      setSaveConflict(`“${trimmed}” no longer matches the saved version this draft can update. Your draft was kept. Save with a new name, or reopen the latest version if listed to replace this draft.`);
      return;
    }
    if (index < 0 && current.length >= SAVE_LIMIT) { setStorageError(`You can save up to ${SAVE_LIMIT} dashboards in this browser. Open an existing dashboard to update it.`); return; }
    const pending = [...current];
    const target = index < 0 ? pending.length : index;
    pending[target] = snapshot(trimmed);
    const bytes = JSON.stringify(pending);
    const validated = readDashboards(bytes);
    if (!validated) { setStorageError("Could not save this dashboard. The original was left unchanged."); return; }
    storage.setItem(DASHBOARD_STORAGE, bytes);
    setSaved(validated);
    openedSave.current = validated[target];
    setName(trimmed);
    setStatus(`Saved “${trimmed}” in this browser.`);
  }
  function reopen(snapshot: DashboardState, appendCurrent = false) {
    openedSave.current = snapshot;
    setSaveConflict("");
    setName(snapshot.name);
    captureLayout();
    if (appendCurrent) pendingFocus.current = "name";
    const opened = snapshot.cards.map(card => ({ ...card, id: next.current++ }));
    setCards(appendCurrent ? [...opened, ...cards] : opened);
    setStatus(appendCurrent ? `Added charts to “${snapshot.name}”. Save locally to keep the changes.` : `Opened “${snapshot.name}”.`);
  }

  const query = search.trim().toLowerCase();
  const matches = FIELD_VELOCITY_GRAPHS.filter(entry => `${entry.title} ${entry.slug} ${entry.graph.description} ${entry.graph.renderer === "draft" ? entry.graph.plot : ""}`.toLowerCase().includes(query));
  function toggleCatalog(open: boolean) {
    pendingFocus.current = open ? "search" : "catalog-toggle";
    setCatalogOpen(open);
  }
  function add(slug: string) {
    if (cards.length >= CARD_LIMIT) return;
    setCatalogOpen(true);
    if (cards.length === CARD_LIMIT - 1) pendingFocus.current = "search";
    captureLayout();
    setCards([...cards, { id: next.current++, slug }]);
  }
  function move(index: number, step: -1 | 1) {
    const destination = index + step;
    if (destination < 0 || destination >= cards.length) return;
    const reordered = [...cards];
    [reordered[destination], reordered[index]] = [reordered[index], reordered[destination]];
    const reverse = destination === 0 || destination === reordered.length - 1;
    pendingFocus.current = { id: cards[index].id, action: (reverse ? -step : step) < 0 ? "earlier" : "later" };
    captureLayout();
    setCards(reordered);
  }
  function remove(index: number) {
    const peer = cards[index + 1] ?? cards[index - 1];
    pendingFocus.current = peer ? { id: peer.id, action: "remove" } : "search";
    if (!peer) setCatalogOpen(true);
    captureLayout();
    setCards(cards.filter((_, i) => i !== index));
  }

  return <section className="graph-page exploration-dashboard" data-dashboard ref={root}>
    <a className="graph-back" href={atlasPath("/field-velocity")}>Back to Field velocity</a>
    <h1>Chart dashboard</h1>
    <p className="graph-description">Compare charts side by side. Add the same chart twice to compare views.</p>
    <div className="dashboard-saves">
      <label>Dashboard name <input data-dashboard-name maxLength={NAME_LIMIT} value={name} onInput={event => setName(event.currentTarget.value)} /></label>
      <button className="dashboard-pill" type="button" data-dashboard-save disabled={!saved || !name.trim()} onClick={save}>Save locally</button>
      <button className="dashboard-pill" type="button" data-dashboard-copy disabled={!cards.length} onClick={copyLink}>Copy dashboard link</button>
      {saved && saved.length > 0 && <details><summary>Saved in this browser</summary><ul>
        {saved.map(snapshot => <li key={snapshot.name}>
          <button className="dashboard-pill" type="button" data-dashboard-reopen onClick={() => reopen(snapshot)}>{snapshot.name}</button>
          {cards.length > 0 && name !== snapshot.name && <button className="dashboard-pill" type="button" data-dashboard-append-saved
            aria-label={`Add current charts to ${snapshot.name}`} disabled={cards.length + snapshot.cards.length > CARD_LIMIT}
            onClick={() => reopen(snapshot, true)}>Add current charts</button>}
        </li>)}
      </ul></details>}
    </div>
    {cards.length > 0 && <p className="exploration-export-note" data-dashboard-export-note>Image export is unavailable here. Use Copy dashboard link to share these views.</p>}
    {storageError && <p data-dashboard-error role="alert">{storageError}</p>}
    {saveConflict && <p data-dashboard-save-conflict role="alert">{saveConflict}</p>}
    {linkError && <p data-dashboard-link-error role="alert">{linkError}</p>}
    <p role="status">{status}</p>
    {linkFallback && <div className="dashboard-saves"><label>Dashboard link
      <input data-dashboard-copy-fallback readOnly value={linkFallback} onFocus={event => event.currentTarget.select()} />
    </label></div>}
    <div className="dashboard-catalog" onKeyDown={event => {
      if (event.key !== "Escape" || !showCatalog) return;
      event.preventDefault();
      event.stopPropagation();
      toggleCatalog(false);
    }}>
      <button className="dashboard-pill" type="button" data-dashboard-catalog-toggle aria-expanded={showCatalog} aria-controls={catalogId}
        onClick={() => toggleCatalog(!showCatalog)}>Add chart</button>
      <div id={catalogId} className="dashboard-catalog-panel" data-dashboard-catalog-panel hidden={!showCatalog}>
        <label>Find charts <input type="search" data-dashboard-search value={search} maxLength={100} onInput={event => setSearch(event.currentTarget.value)} /></label>
        {matches.length > 0 ? <ul aria-label="Charts to add">{matches.map(entry => <li key={entry.slug}>
          <button className="dashboard-pill" type="button" data-dashboard-add={entry.slug} disabled={cards.length >= CARD_LIMIT}
            aria-label={`Add ${entry.title}`} onClick={() => add(entry.slug)}>{entry.title} <span aria-hidden="true">+</span></button>
        </li>)}</ul> : <p data-dashboard-no-match role="status">No charts match “{search}”.</p>}
      </div>
      {cards.length >= CARD_LIMIT && <p role="status">Dashboard full · remove a chart to add another.</p>}
    </div>
    {!cards.length && <p data-dashboard-empty>Add a chart to start comparing.</p>}
    <div className="dashboard-grid" data-dashboard-grid>
      {cards.map((card, index) => {
        const entry = FIELD_VELOCITY_GRAPHS.find(graph => graph.slug === card.slug)!;
        return <article className="dashboard-card" key={card.id} data-dashboard-card={card.id} data-dashboard-graph={card.slug}>
          <header>
            <h2>{index + 1}. {entry.title}</h2>
            <div className="dashboard-card-actions" role="group" aria-label={`Chart ${index + 1} controls`}>
              <button className="dashboard-pill" type="button" data-dashboard-earlier disabled={!index} onClick={() => move(index, -1)}>Move earlier</button>
              <button className="dashboard-pill" type="button" data-dashboard-later disabled={index === cards.length - 1} onClick={() => move(index, 1)}>Move later</button>
              <button className="dashboard-pill" type="button" data-dashboard-remove onClick={() => remove(index)}>Remove</button>
              <a className="dashboard-pill" data-dashboard-open-graph href={atlasPath(graphPath(entry))}>Open full graph</a>
            </div>
          </header>
          <FieldVelocityGraphDetail entry={entry} instance={{ dashboard: true, settings: card.settings ?? {}, update: change => {
            setCards(current => current.map(item => item.id === card.id ? { ...item, settings: { ...item.settings, ...change } } : item));
          } }} />
        </article>;
      })}
    </div>
  </section>;
}
