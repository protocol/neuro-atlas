import { chartNoteParagraphs } from "@/lib/chart-notes";

/** Supporting prose keeps the plot's legend colors without coloring the text. */
export function ChartNoteList({ notes, legend = [] }: {
  notes: readonly string[]; legend?: readonly { label: string; color: string }[];
}) {
  return <ul className="chart-supporting-notes" aria-label="Dataset notes">
    {chartNoteParagraphs(notes, legend).map((note, index) => <li key={index} data-chart-note data-keyed={note.color ? true : undefined}>
      {note.color && <span data-chart-note-key aria-hidden="true" style={{ backgroundColor: note.color }} />}
      <p>{note.text}</p>
    </li>)}
  </ul>;
}
