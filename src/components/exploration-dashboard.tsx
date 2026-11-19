"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FieldVelocityGraphDetail } from "@/components/field-velocity-graph";
import { FIELD_VELOCITY_GRAPHS, graphPath } from "@/data/field-velocity-links";
import { useDashboardLayout } from "@/components/use-dashboard-layout";
import { atlasPath } from "@/lib/atlas-path";

import { CARD_LIMIT, DASHBOARD_ROUTE, DASHBOARD_STORAGE, NAME_LIMIT, SAVE_LIMIT, dashboardHash, isDashboardGraph, readDashboardLink, readDashboards, type CardState, type DashboardState } from "@/lib/dashboard-state";

type Card = CardState & { id: number };
type Focus = { id: number; action: "earlier" | "later" | "remove" } | "search";

export function ExplorationDashboard() {
  const [cards, setCards] = useState<Card[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("Untitled dashboard");
  const [saved, setSaved] = useState<DashboardState[] | null>(null);
  const [storageError, setStorageError] = useState("");
  const [status, setStatus] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkFallback, setLinkFallback] = useState("");
  const next = useRef(1);
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
      setCards([{ id: 0, slug: add[0] }]);
    } else if (add.length) setLinkError("That chart could not be added. Choose a chart below.");
    try {
      const existing = readDashboards(window.localStorage.getItem(DASHBOARD_STORAGE));
      setSaved(existing);
      if (!existing) setStorageError("Saved dashboards could not be read. The original was left unchanged.");
    } catch { setStorageError("Local storage is unavailable. You can still compare charts."); }
  }, []);
  useLayoutEffect(() => {
    const focus = pendingFocus.current;
    pendingFocus.current = null;
    if (focus) root.current?.querySelector<HTMLElement>(focus === "search" ? "[data-dashboard-search]" :
      `[data-dashboard-card="${focus.id}"] [data-dashboard-${focus.action}]`)?.focus();
  }, [cards]);

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
  function save() {
    const trimmed = name.trim();
    if (!saved || !trimmed) return;
    try {
      // Re-read on user action so a different tab's malformed data is never overwritten.
      const current = readDashboards(window.localStorage.getItem(DASHBOARD_STORAGE));
      if (!current) { setSaved(null); setStorageError("Saved dashboards could not be read. The original was left unchanged."); return; }
      const pending = [...current];
      const index = pending.findIndex(item => item.name === trimmed);
      const item = snapshot(trimmed);
      if (index >= 0) pending[index] = item;
      else if (pending.length < SAVE_LIMIT) pending.push(item);
      else { setStorageError(`You can save up to ${SAVE_LIMIT} dashboards in this browser. Use an existing name to update it.`); return; }
      window.localStorage.setItem(DASHBOARD_STORAGE, JSON.stringify(pending));
      setSaved(pending);
      setName(trimmed);
      setStorageError("");
      setStatus(`Saved “${trimmed}” in this browser.`);
    } catch { setStorageError("Could not save this dashboard. Try again or copy a dashboard link."); }
  }
  function reopen(snapshot: DashboardState) {
    setName(snapshot.name);
    captureLayout();
    setCards(snapshot.cards.map(card => ({ ...card, id: next.current++ })));
    setStatus(`Opened “${snapshot.name}”.`);
  }

  const query = search.trim().toLowerCase();
  const matches = FIELD_VELOCITY_GRAPHS.filter(entry => `${entry.title} ${entry.slug} ${entry.graph.description} ${entry.graph.renderer === "draft" ? entry.graph.plot : ""}`.toLowerCase().includes(query));
  function add(slug: string) {
    if (cards.length >= CARD_LIMIT) return;
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
        {saved.map(snapshot => <li key={snapshot.name}><button className="dashboard-pill" type="button" data-dashboard-reopen onClick={() => reopen(snapshot)}>{snapshot.name}</button></li>)}
      </ul></details>}
    </div>
    {storageError && <p data-dashboard-error role="alert">{storageError}</p>}
    {linkError && <p data-dashboard-link-error role="alert">{linkError}</p>}
    <p role="status">{status}</p>
    {linkFallback && <div className="dashboard-saves"><label>Dashboard link
      <input data-dashboard-copy-fallback readOnly value={linkFallback} onFocus={event => event.currentTarget.select()} />
    </label></div>}
    <div className="dashboard-catalog">
      <label>Find charts <input type="search" data-dashboard-search value={search} maxLength={100} onInput={event => setSearch(event.currentTarget.value)} /></label>
      <ul aria-label="Charts to add">{matches.map(entry => <li key={entry.slug}>
        <button className="dashboard-pill" type="button" data-dashboard-add={entry.slug} disabled={cards.length >= CARD_LIMIT}
          aria-label={`Add ${entry.title}`} onClick={() => add(entry.slug)}>{entry.title} <span aria-hidden="true">+</span></button>
      </li>)}</ul>
      {!matches.length && <p data-dashboard-no-match role="status">No charts match “{search}”.</p>}
      {cards.length >= CARD_LIMIT && <p role="status">Dashboard full · remove a chart to add another.</p>}
    </div>
    {!cards.length && <p data-dashboard-empty>Choose a chart above to start comparing.</p>}
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
              <a className="dashboard-pill" href={atlasPath(graphPath(entry))}>Open graph</a>
            </div>
          </header>
          <FieldVelocityGraphDetail entry={entry} />
        </article>;
      })}
    </div>
  </section>;
}
