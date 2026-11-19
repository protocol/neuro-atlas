"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { atlasPath, atlasPathname } from "@/lib/atlas-path";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedbackTrigger } from "./feedback/feedback-trigger";

const sideAction = "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const TABS: { href: string; label: string }[] = [
  { href: "/milestones", label: "Milestones" },
  { href: "/field-velocity", label: "Field Velocity" },
  { href: "/funding", label: "BCI Funding Index" },
];

function BrandMark() {
  return (
    <div className="px-3">
      <Link href="/" className="block text-xl font-semibold tracking-tight">Neuro Atlas</Link>
      <a href="https://www.plneuro.xyz/" className="mt-0.5 inline-flex items-center gap-1.5 rounded-sm text-[11px] text-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        {/* The existing local vector is served directly, with no image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={atlasPath("/powered-plneuro.svg")} width={18} height={18} alt="" />
        <span>by PL Neuro</span>
      </a>
    </div>
  );
}

function VItem({ tab, active }: { tab: { href: string; label: string }; active: boolean }) {
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center rounded-lg px-3 py-2 text-[15px] font-medium transition-colors ${
        active
          ? "bg-surface text-foreground shadow-sm"
          : "text-muted hover:bg-surface/60 hover:text-foreground"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" aria-hidden />
      )}
      {tab.label}
    </Link>
  );
}


// The vertical sidebar is used on desktop; the active item is a pill.
export function SideNav() {
  const pathname = atlasPathname(usePathname());
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col py-5 lg:flex">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 pr-3">
          <BrandMark />
          <ThemeToggle />
        </div>
      </div>
      <nav className="flex flex-1 flex-col px-2">
        <div className="flex flex-col gap-0.5">
          {TABS.map((t) => (
            <VItem key={t.href} tab={t} active={pathname === t.href || (t.href === "/field-velocity" && pathname.startsWith("/field-velocity/"))} />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <FeedbackTrigger className={sideAction} />
        </div>
      </nav>
    </aside>
  );
}

// A single, non-sticky mobile header. The native modal supplies focus trapping,
// Escape dismissal and an inert background without freezing a second tab row.
export function MobileBar() {
  const pathname = atlasPathname(usePathname());
  const menuId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Layouts persist across client navigation, including back and forward.
    if (dialogRef.current?.open) dialogRef.current.close();
  }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches && dialogRef.current?.open) dialogRef.current.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className="mobile-site-header lg:hidden">
      <div className="flex items-center justify-between gap-2 px-1 py-2">
        <BrandMark />
        <button ref={triggerRef} type="button" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls={menuId}
          onClick={() => { dialogRef.current?.showModal(); setOpen(true); dialogRef.current?.querySelector<HTMLAnchorElement>("nav a")?.focus(); }}
          className="mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
      <dialog ref={dialogRef} id={menuId} aria-labelledby={`${menuId}-title`} className="mobile-nav-dialog rounded-2xl border border-border bg-surface p-4 text-foreground shadow-xl"
        onClose={() => { setOpen(false); if (!window.matchMedia("(min-width: 1024px)").matches) triggerRef.current?.focus(); }}
        onClick={(event) => {
          // Dismiss on every destination, even the already-active route or an
          // external new-tab link. The anchor itself still owns navigation.
          if ((event.target as HTMLElement).closest("a")) dialogRef.current?.close();
          else if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialogRef.current?.close();
          }
        }}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={`${menuId}-title`} className="px-3 text-base font-semibold">Navigation</h2>
          <button type="button" aria-label="Close navigation" onClick={() => dialogRef.current?.close()}
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent">
            Close <span aria-hidden>×</span>
          </button>
        </div>
        <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
          {TABS.map((tab) => <VItem key={tab.href} tab={tab} active={pathname === tab.href} />)}
        </nav>
        <div className="mt-4 flex items-center justify-between border-t border-border px-3 pt-4">
          <span className="text-sm text-muted">Appearance</span><ThemeToggle />
        </div>
      </dialog>
    </div>
  );
}
