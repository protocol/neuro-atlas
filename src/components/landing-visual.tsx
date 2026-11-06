type View = "milestones" | "ecosystem" | "funding" | "velocity";

/** Decorative navigation artwork, not plotted data or a live preview. */
export function LandingVisual({ view }: { view: View }) {
  return (
    <svg viewBox="0 0 480 132" fill="none" aria-hidden="true" focusable="false" className="landing-visual">
      {view === "milestones" && (
        <g strokeWidth="1.5">
          <path d="M24 36H456M24 66H456M24 96H456" stroke="currentColor" opacity=".16" />
          <path d="M91 20V112M240 20V112M389 20V112" stroke="currentColor" opacity=".1" strokeDasharray="3 6" />
          <path d="M66 36H151M185 66H305M318 96H414" stroke="var(--accent-on-dark)" strokeWidth="3" />
          {[[66, 36], [151, 36], [185, 66], [240, 66], [305, 66], [318, 96], [389, 96], [414, 96]].map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="var(--accent-on-dark)" stroke="#171920" strokeWidth="2" />
          ))}
          <circle cx="240" cy="66" r="14" stroke="var(--accent-on-dark)" opacity=".4" />
        </g>
      )}
      {view === "ecosystem" && (
        <g>
          <path d="M84 76L148 42L221 78L296 35L369 72L424 44M148 42L174 110L221 78L287 106L369 72M221 78L226 20" stroke="currentColor" opacity=".2" />
          {[[84, 76, 18], [148, 42, 23], [174, 110, 11], [221, 78, 30], [226, 20, 10], [296, 35, 19], [287, 106, 14], [369, 72, 25], [424, 44, 11]].map(([cx, cy, r], i) => (
            <g key={cx}>
              <circle cx={cx} cy={cy} r={r} fill={i === 3 ? "var(--accent-on-dark)" : "#252731"} stroke={i === 3 ? "var(--accent-on-dark-hover)" : "var(--accent-on-dark-muted)"} />
              <circle cx={cx} cy={cy} r={i === 3 ? 6 : 3} fill={i === 3 ? "#171920" : "var(--accent-on-dark)"} />
            </g>
          ))}
        </g>
      )}
      {view === "funding" && (
        <g strokeWidth="1.5">
          <path d="M60 27H204Q232 27 240 53Q248 80 278 80H420M60 66H155Q175 66 185 42Q191 27 204 27M60 105H212Q242 105 258 80M278 80Q310 80 325 39H420" stroke="var(--accent-on-dark)" opacity=".7" />
          <path d="M60 27V105M420 27V105" stroke="currentColor" opacity=".12" />
          {[27, 66, 105].map((cy) => <circle key={cy} cx="60" cy={cy} r="6" fill="var(--accent-on-dark)" />)}
          <circle cx="278" cy="80" r="12" fill="#171920" stroke="var(--accent-on-dark)" />
          <circle cx="420" cy="39" r="8" fill="var(--accent-on-dark)" />
          <circle cx="420" cy="80" r="8" fill="var(--accent-on-dark)" />
        </g>
      )}
      {view === "velocity" && (
        <g strokeWidth="2" strokeLinecap="round">
          <path d="M30 95H72L82 77L94 112L111 40L129 96H179L192 67L207 111L227 23L249 94H304L318 68L332 108L350 41L369 94H450" stroke="var(--accent-on-dark)" />
          <path d="M30 37H450M30 66H450M30 95H450" stroke="currentColor" opacity=".1" strokeWidth="1" />
          <circle cx="227" cy="23" r="5" fill="var(--accent-on-dark-hover)" />
          <circle cx="227" cy="23" r="13" stroke="var(--accent-on-dark)" opacity=".3" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}
