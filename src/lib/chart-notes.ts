/** Paragraph boundaries and explicit legend identities are shared by the site
 * and native image exports. Never infer a new series from a substring. */
export function chartNoteParagraphs(notes: readonly string[], legend: readonly { label: string; color: string }[] = []) {
  return notes.flatMap(note => note.split(/\r?\n/).map(text => text.trim()).filter(Boolean).map(text => ({
    text,
    color: legend.find(entry => text.startsWith(`${entry.label}:`))?.color,
  })));
}
