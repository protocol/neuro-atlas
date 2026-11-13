const STATUS: Record<string, { label: string; cls: string }> = {
  live: { label: "Live", cls: "bg-white/12 text-white" },
  partial: { label: "Partial public coverage", cls: "bg-white/12 text-white" },
  planned: { label: "Coming soon", cls: "bg-white/12 text-white" },
};

export type PlateStat = { value: string; label: string };

export function PlateHero({
  kicker,
  meta,
  title,
  description,
  status,
  stats,
}: {
  kicker: string;
  meta?: string[];
  title: string;
  description: string;
  status?: "live" | "partial" | "planned";
  stats: PlateStat[];
}) {
  const s = status ? STATUS[status] : undefined;
  return (
    <section className="-mx-5 -mt-5 rounded-t-2xl border-b border-border bg-[#101217] px-5 pb-8 pt-8 text-white sm:-mx-7 sm:-mt-7 sm:px-7 sm:pb-10 sm:pt-10 lg:-mx-9 lg:-mt-9 lg:px-9 lg:pb-12 lg:pt-12">
      <div className="mb-8 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
        <span className="rounded-full bg-accent px-3 py-1.5 text-accent-foreground">{kicker}</span>
        {(meta ?? []).map((item) => (
          <span key={item}>{item}</span>
        ))}
        {s && <>
          <span aria-hidden="true">•</span>
          <span className={`rounded-full px-3 py-1.5 ${s.cls}`}>{s.label}</span>
        </>}
      </div>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)] lg:items-start">
        <div>
          <h1 className="max-w-5xl text-[clamp(2.35rem,4.2vw,4.5rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/75 sm:mt-5 sm:text-lg">{description}</p>
        </div>
        {stats.length > 0 && (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/10">
            {stats.map(({ value, label }) => (
              <div key={label} className="bg-[#171a21] p-4 sm:p-6">
                <div className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-white/65">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
