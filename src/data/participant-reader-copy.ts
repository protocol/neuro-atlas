// Reader-facing summaries; source quotations and the archived records stay intact.
const definitions: Record<string, string> = {
  'identified-literature-cohort': 'Assistive implanted-BCI participants identified in a literature review covering 1998–December 2023.',
  'neuralink-cumulative': 'Company-reported cumulative implanted trial recipients, dated by implantation month or later disclosure.',
  'synchron-cumulative': 'Company-reported Stentrode recipients in SWITCH and COMMAND; cohorts overlap the historical review.',
  'onward-arc-bci': 'People with cortical recording implants paired with spinal stimulation. Historical CEA/WIMAGINE participants may overlap the review.',
  'paradromics-connect-one': 'Documented long-term Connexus Connect-One recipients.',
  'neo-documented-lower-bound': 'Documented NEO recipients: wireless epidural ECoG for hand-grasp control and rehabilitation after cervical spinal-cord injury. Values are lower bounds; program cohorts may overlap.',
};
const notes: Record<string, string> = {
  'identified-literature-cohort:2023-12-01': 'The cohort includes ECoG and endovascular systems; 31 participants were active at the December 2023 cutoff. Annual implant dates remain unspecified in the supplement.',
  'neuralink-cumulative:2024-01-01': 'April 12, 2024 disclosure; January is the implantation month.',
  'neuralink-cumulative:2024-07-01': 'August 21, 2024 disclosure; July is the implantation month. Cumulative two recipients.',
  'neuralink-cumulative:2025-02-05': 'Disclosure date for a cumulative company-reported total.',
  'neuralink-cumulative:2025-06-02': 'Post-implant use supports the recipient count.',
  'neuralink-cumulative:2026-01-28': 'The body’s comparison with 20 subsequent participants supports the cumulative implant count. January 28 release; page updated February 2. Active-use status remains unverified.',
  'synchron-cumulative:2025-11-06': 'Four Australian and six US recipients; the cohort overlaps the historical review.',
  'onward-arc-bci:2026-01-22': 'Two additional people bring the program total to seven. Historical CEA/WIMAGINE overlap remains unresolved.',
  'onward-arc-bci:2024-09-12': 'The reported third paired implant is interpreted as three program participants. Successive totals may overlap historical CEA/WIMAGINE recipients. Eligibility requires a cortical recording implant paired with spinal stimulation.',
  'onward-arc-bci:2025-05-21': 'Cumulative program total. Successive checkpoints may overlap the historical CEA/WIMAGINE cohort; eligibility requires paired cortical recording and spinal stimulation.',
  'onward-arc-bci:2026-09-09': 'Reaffirms seven participants already reported in January. The 22-person Empower BP cohort describes ARC-IM-only spinal stimulation. Successive ARC-BCI totals may overlap historical recipients.',
  'paradromics-connect-one:2026-06-17': 'Disclosure date for at least one long-term participant. The earlier temporary 2025 epilepsy recording has separate eligibility.',
  'neo-documented-lower-bound:2023-10-24': 'Exact surgery date. The first two feasibility recipients recur in later research; confirmatory-cohort overlap remains unresolved.',
  'neo-documented-lower-bound:2023-12-19': 'Exact surgery date for the second recipient. The first two feasibility recipients recur in later research; confirmatory-cohort overlap remains unresolved.',
  'neo-documented-lower-bound:2025-01-01': 'Implantation year 2025; January 1 is the year anchor. The 11-hospital confirmatory cohort gives a program lower bound of ≥32; overlap with four feasibility cases remains unresolved.',
};
export function participantTrackCopy<T extends { id: string; definition: string; points: { date: string; note?: string }[] }>(track: T): T {
  return {
    ...track,
    definition: definitions[track.id] ?? track.definition,
    points: track.points.map(point => {
      const summary = notes[`${track.id}:${point.date}`];
      if (!summary) return point;
      const quotations = point.note?.match(/“[^”]*”/g) ?? [];
      return { ...point, note: [...quotations, summary].join(' ') };
    }),
  };
}
export const participantPaperNotes: Record<string, string> = {
  '10.1088/1741-2552/adb88e': 'Broader eligibility: 214 patients across 93 studies. Person-level overlap with the 67-person review remains unresolved.',
  '10.1088/1741-2552/ae7694': 'Recalibration-focused sample: 39 subjects across 58 studies, 2006–2024.',
  '10.3389/fnins.2026.1994636': 'Reviews the different eligibility criteria behind the 67- and 214-patient counts.',
};
