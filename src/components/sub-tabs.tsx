"use client";

// In-plate sub-navigation. A grouped plate (e.g. Capital) holds several
// dashboards; this switches between them. All panes stay mounted (`hidden`) so
// filter/timeline state is preserved when you switch away and back.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Keep the selected tab wholly visible by scrolling only its local rail. */
export function revealActiveTab(rail: HTMLElement, activeTab: HTMLElement) {
  const railBounds = rail.getBoundingClientRect();
  const tabBounds = activeTab.getBoundingClientRect();
  if (tabBounds.left < railBounds.left) rail.scrollLeft += tabBounds.left - railBounds.left;
  else if (tabBounds.right > railBounds.right) rail.scrollLeft += tabBounds.right - railBounds.right;
}

/** Repeat after the browser has finished the tab pane's layout work. */
export function scheduleActiveTabReveal(rail: HTMLElement, activeTab: HTMLElement) {
  rail.ownerDocument.defaultView?.requestAnimationFrame(() => revealActiveTab(rail, activeTab));
}

export function SubTabs({
  tabs,
  selectedKey,
  onSelect,
}: {
  tabs: { key: string; label: string; node: ReactNode }[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
}) {
  const [localActive, setActive] = useState(tabs[0].key);
  const active = selectedKey ?? localActive;
  const railRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const rail = railRef.current, tab = activeTabRef.current;
    if (!rail || !tab) return;
    const reveal = () => {
      revealActiveTab(rail, tab);
      scheduleActiveTabReveal(rail, tab);
    };
    reveal();
    const view = rail.ownerDocument.defaultView;
    view?.addEventListener("resize", reveal);
    return () => view?.removeEventListener("resize", reveal);
  }, [active]);
  return (
    <>
      <div ref={railRef} className="mb-6 inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-nav p-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            ref={active === t.key ? activeTabRef : undefined}
            type="button"
            onClick={() => onSelect ? onSelect(t.key) : setActive(t.key)}
            aria-current={active === t.key ? "true" : undefined}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === t.key
                ? "bg-foreground text-background"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} hidden={t.key !== active}>
          {t.node}
        </div>
      ))}
    </>
  );
}
