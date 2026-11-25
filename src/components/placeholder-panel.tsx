type PlaceholderPanelProps = {
  title: string;
  description: string;
  height?: string;
};

export function PlaceholderPanel({ title, description, height = "h-64" }: PlaceholderPanelProps) {
  return (
    <div className="card flex flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
          Planned
        </span>
      </div>
      <div
        className={`flex ${height} items-center justify-center rounded-xl border border-dashed border-border-strong`}
      >
        <p className="max-w-xs px-6 text-center text-xs leading-relaxed text-faint">
          {description}
        </p>
      </div>
    </div>
  );
}
