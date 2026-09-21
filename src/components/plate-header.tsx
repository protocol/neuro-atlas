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
  status: "live" | "partial" | "planned";
  stats: PlateStat[];
}) {
  const s = STATUS[status];
  return (
    <section className="-mx-5 -mt-5 rounded-t-2xl border-b border-border bg-[#101217] px-5 pb-8 pt-8 text-white sm:-mx-7 sm:-mt-7 sm:px-7 sm:pb-10 sm:pt-10 lg:-mx-9 lg:-mt-9 lg:px-9 lg:pb-12 lg:pt-12">
      <div className="mb-8 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
        <span className="rounded-full bg-accent px-3 py-1.5 text-white">{kicker}</span>
        {(meta ?? []).map((item) => (
          <span key={item}>{item}</span>
        ))}
        <span aria-hidden="true">•</span>
        <span className={`rounded-full px-3 py-1.5 ${s.cls}`}>{s.label}</span>
        <a
          href="https://github.com/protocol/neuro-atlas/pulls"
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-normal text-white/80 transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white"
          title="Contribute data or corrections via GitHub Pull Request"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
          </svg>
          Contribute via PR
        </a>
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
