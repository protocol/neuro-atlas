"use client";

import Link from "next/link";
import { atlasPath, atlasPathname } from "@/lib/atlas-path";
import { NEUROFOUNDERS_MAP_URL } from "@/lib/ecosystem";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedbackTrigger } from "./feedback/feedback-trigger";

const sideAction = "flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] font-medium text-muted transition-colors hover:border-border-strong hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const TABS: { href: string; label: string }[] = [
  { href: "/milestones", label: "Milestones" },
  { href: "/field-velocity", label: "Field Velocity" },
  { href: "/funding", label: "BCI Funding Index" },
  { href: NEUROFOUNDERS_MAP_URL, label: "Ecosystem ↗" },
];

function BrandMark() {
  return (
    <div className="px-3">
      <Link href="/" className="block text-xl font-semibold tracking-tight">Neuro Atlas</Link>
      <a href="https://www.plrd.org/" className="inline-block rounded-sm text-[11px] text-muted underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">by PL R&amp;D</a>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
function PoweredBy() {
  return (
    <div className="mt-3 px-3">
      <div className="mb-2 text-[9px] font-medium uppercase tracking-wider text-faint">powered by</div>
      <div className="flex flex-col gap-2">
        <a href="https://www.plneuro.xyz" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted transition-colors hover:text-foreground">
          <img src={atlasPath("/powered-plneuro.svg")} alt="PL Neuro" className="h-6 w-6" />
          <span className="text-[12px] font-medium">PL Neuro</span>
        </a>
        <a href="https://neurotechnology.substack.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-muted transition-colors hover:text-foreground">
          <img src={atlasPath("/powered-neurotechfutures.png")} alt="Neurotech Futures" className="h-6 w-6 rounded-[4px]" />
          <span className="text-[12px] font-medium">Neurotech Futures</span>
        </a>
      </div>
    </div>
  );
}

function VItem({ tab, active }: { tab: { href: string; label: string }; active: boolean }) {
  return (
    <Link
      href={tab.href}
      target={tab.href === NEUROFOUNDERS_MAP_URL ? "_blank" : undefined}
      rel={tab.href === NEUROFOUNDERS_MAP_URL ? "noopener noreferrer" : undefined}
      aria-label={tab.href === NEUROFOUNDERS_MAP_URL ? "Ecosystem on Neurofounders (opens in a new tab)" : undefined}
      title={tab.href === NEUROFOUNDERS_MAP_URL ? "Neurofounders startup map" : undefined}
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

function HItem({ tab, active }: { tab: { href: string; label: string }; active: boolean }) {
  return (
    <Link
      href={tab.href}
      target={tab.href === NEUROFOUNDERS_MAP_URL ? "_blank" : undefined}
      rel={tab.href === NEUROFOUNDERS_MAP_URL ? "noopener noreferrer" : undefined}
      aria-label={tab.href === NEUROFOUNDERS_MAP_URL ? "Ecosystem on Neurofounders (opens in a new tab)" : undefined}
      title={tab.href === NEUROFOUNDERS_MAP_URL ? "Neurofounders startup map" : undefined}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
      }`}
    >
      {tab.label}
    </Link>
  );
}

// Vertical sidebar (lg+): brand top, nav in the grey chrome, Methodology below a
// divider, theme toggle pinned at the bottom. The active item is the white pill.
export function SideNav() {
  const pathname = atlasPathname(usePathname());
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col py-5 lg:flex">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 pr-3">
          <BrandMark />
          <ThemeToggle />
        </div>
        <PoweredBy />
      </div>
      <nav className="flex flex-1 flex-col px-2">
        <div className="flex flex-col gap-0.5">
          {TABS.map((t) => (
            <VItem key={t.href} tab={t} active={pathname === t.href} />
          ))}
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <FeedbackTrigger className={sideAction} />
        </div>
      </nav>
    </aside>
  );
}

// Mobile top bar (below lg): brand + theme toggle, then a horizontal scroll nav.
export function MobileBar() {
  const pathname = atlasPathname(usePathname());
  return (
    <div className="lg:hidden">
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-1 py-3">
        <BrandMark />
        <div className="ml-auto flex items-center gap-2 pr-2">
          <ThemeToggle />
        </div>
      </div>
      <nav className="overflow-x-auto px-3 pb-2">
        <div className="flex min-w-max items-center gap-1">
          {TABS.map((t) => (
            <HItem key={t.href} tab={t} active={pathname === t.href} />
          ))}
        </div>
      </nav>
    </div>
  );
}
