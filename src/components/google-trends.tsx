"use client";

import React, { useRef, useState } from 'react';
import SNAPSHOT from '../../public/data/google-trends/google-trends.json';
import type { TrendsData } from '@/lib/field-velocity/google-trends';
import { atlasPath } from '@/lib/atlas-path';
import { ChartModal } from '@/components/chart-modal';
import { navigatePerformance, performanceUrl, usePerformanceHash } from '@/lib/field-velocity/navigation';

type Group = TrendsData & { id: string; title: string; sourceUrl: string; rawSha256: string };
const groups: Group[] = SNAPSHOT.groups;
const colors = ['var(--accent)', '#087f8c'];

function TrendPlot({ group, compact = false }: { group: Group; compact?: boolean }) {
  const rows = group.rows.filter(row => !row.partial);
  const start = Date.parse(group.start), end = Date.parse(group.end);
  const x = (date: string) => 48 + (Date.parse(date) - start) / (end - start) * 532;
  const y = (value: number) => 24 + (100 - value) / 100 * 200;
  return <div className={compact ? 'gt-preview' : 'gt-plot'} role={compact ? undefined : 'region'} aria-label={compact ? undefined : `${group.title} plot`} tabIndex={compact ? undefined : 0}>
    {compact && <span className="gt-preview-axis">Weekly index · 0–100</span>}
    <svg viewBox={compact ? '48 0 552 235' : '0 0 600 270'} role="img" aria-label={`${group.title}: weekly Google Trends index, 0–100. Complete weeks only; source values available in the expanded chart.`}>
      {[0, 50, 100].map(tick => <g key={tick}><line x1={48} x2={580} y1={y(tick)} y2={y(tick)} stroke="var(--border-strong)" strokeDasharray="3 5" /><text x={38} y={y(tick) + 5} textAnchor="end">{tick}</text></g>)}
      {group.terms.map((term, index) => {
        let gap = true;
        const path = rows.map(row => {
          const value = row.values[index];
          if (value === null) { gap = true; return ''; }
          const command = gap ? 'M' : 'L'; gap = false;
          return `${command}${x(row.date).toFixed(2)},${y(value).toFixed(2)}`;
        }).join(' ');
        return <path key={term} data-trend-line={term} d={path} fill="none" stroke={colors[index]} strokeWidth={2.5} strokeDasharray={index ? '7 3' : undefined} />;
      })}
      {!compact && rows.flatMap(row => row.values.map((value, i) => value === null ? null : <circle key={`${row.date}:${i}`} data-trend-point="true" data-date={row.date} data-term={group.terms[i]} data-value={value} cx={x(row.date)} cy={y(value)} r={2.5} fill={colors[i]}><title>{row.date} · {group.terms[i]}: {row.displayValues[i]}</title></circle>))}
      <text x={48} y={254}>{group.start.slice(0, 7)}</text><text x={580} y={254} textAnchor="end">{group.end.slice(0, 7)}</text>
    </svg>
    {compact && <span className="gt-preview-dates"><span>{group.start.slice(0, 7)}</span><span>{group.end.slice(0, 7)}</span></span>}
  </div>;
}

function Legend({ group }: { group: Group }) {
  return <ul className="gt-legend">{group.terms.map((term, i) => <li key={term}><span aria-hidden="true" style={{ borderColor: colors[i], borderTopStyle: i ? 'dashed' : 'solid' }} />{term}</li>)}</ul>;
}

function TrendCard({ group }: { group: Group }) {
  const ref = useRef<HTMLButtonElement>(null);
  const hash = usePerformanceHash();
  const id = `google-trends-${group.id}`;
  const open = hash === `#${id}`;
  const [copyStatus, setCopyStatus] = useState('');
  const [valuesOpen, setValuesOpen] = useState(false);
  const latest = group.rows.filter(row => !row.partial).at(-1)!;
  const normalization = group.id === 'neurotech' ? 'Both terms compared in one request; shared 0–100 scale.' : 'Neuralink is independently normalized; its index cannot be compared with the other chart.';
  const latestReading = <p className="gt-latest" data-trends-latest={latest.date}>Latest complete week · {latest.date}<br />{group.terms.map((term, i) => `${term}: ${latest.displayValues[i]}`).join(' · ')}</p>;
  const share = <div className="pc-share">
    <a href={`#${id}`} aria-label={`Direct link to ${group.title}`} onClick={event => { if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); navigatePerformance(id); } }}>Direct link ↗</a>
    <button type="button" aria-label={`Copy link to ${group.title}`} onClick={async () => {
      try { await navigator.clipboard.writeText(performanceUrl(window.location.href, id)); setCopyStatus('Link copied'); }
      catch { setCopyStatus('Copy unavailable — use the direct link'); }
    }}>Copy link</button><span role="status">{copyStatus}</span>
  </div>;
  return <article className="pc-card card gt-card" data-trends-card={group.id}>
    <button ref={ref} type="button" className="pc-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={() => navigatePerformance(id)}>
      <span className="pc-eyebrow">{group.id === 'neurotech' ? 'Search terms · shared scale' : 'Brand context · separate scale'}</span>
      <h3>{group.title}</h3><TrendPlot group={group} compact />
      <span className="pc-open-hint">Expand chart &amp; source values ↗</span>
    </button>
    <div className="gt-card-notes"><Legend group={group} />{latestReading}<p className="gt-scale">{normalization}</p></div>
    {share}
    {open && <ChartModal id={id} title={group.title} returnFocus={ref}>
      <p className="gt-scope">Past 36 months · {group.start}–{group.end}<br />Worldwide · Web Search · All categories · weekly UTC · index 0–100</p>
      <TrendPlot group={group} /><Legend group={group} />{latestReading}
      <section className="pc-methodology" aria-label="Google Trends methodology">
        <h3>How to read this chart</h3>
        <p>Public attention, not technical progress, adoption, sentiment or total search counts. {normalization}</p>
        <p>Google Trends uses a sample of searches, divided by all searches in each time and location, then scaled relative to the peak in the request. 100 is that request’s peak, not 100 searches or a percentage of people. Sampling and statistical noise can change values on later retrievals, especially for low-volume terms.</p>
        <p>These are search terms, not topics: the literal English strings shown above, without quotes, using Google’s broad term matching. They do not pool multilingual topic equivalents, synonyms or all neurotech searches. The ambiguous acronym BCI is deliberately excluded. Neuralink is brand/news context, not a field-wide measure.</p>
        <p>0 means low or insufficient interest, not zero searches. “&lt;1” is retained in source values and plotted at the index floor; unavailable data remain gaps, never interpolated. Lines connect available weekly samples, not a fitted trend.</p>
        <p>Incomplete boundary weeks and Google-flagged partial periods are excluded from the graph and latest reading, but retained and labeled in the table and CSV. Week dates are UTC starts; each complete week spans seven days. Excluding partial values does not rescale Google’s original index.</p>
        <p>Captured {group.capturedAt} from Google Trends’ public Explore widget. A checked-in snapshot, not a live connection; manual refresh only.</p>
      </section>
      <ul className="pc-sources">
        <li><a href={group.sourceUrl} target="_blank" rel="noreferrer">Open exact Google Trends query ↗</a></li>
        <li><a href={atlasPath(`/data/google-trends/${group.id}.csv`)} download>Download source values CSV</a></li>
        <li><a href={atlasPath('/data/google-trends/google-trends.json')} download>Download snapshot &amp; provenance JSON</a></li>
        <li><a href="https://support.google.com/trends/answer/4365533?hl=en" target="_blank" rel="noreferrer">Google’s data and normalization methodology ↗</a></li>
        <li><a href="https://support.google.com/trends/answer/4359550?hl=en" target="_blank" rel="noreferrer">Search terms versus topics ↗</a></li>
      </ul>
      {share}
      <details className="gt-values" open={valuesOpen} onToggle={event => setValuesOpen(event.currentTarget.open)}><summary tabIndex={0}>All source values · {group.rows.length} weekly rows (including partial)</summary>
        <div className="pc-table-scroll" role="region" aria-label={`${group.title} source values`} tabIndex={valuesOpen ? 0 : undefined}>
          <table><caption>Google Trends normalized index · original precision, no rescaling</caption><thead><tr><th scope="col">Week start (UTC)</th>{group.terms.map(term => <th scope="col" key={term}>{term}</th>)}<th scope="col">Period status</th></tr></thead>
            <tbody>{group.rows.map(row => <tr key={row.date} data-trends-row={row.date}><th scope="row">{row.date}</th>{row.displayValues.map((value, i) => <td key={i}>{value}</td>)}<td>{row.partial ? 'Partial · excluded' : 'Complete'}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
      <p className="gt-hash">Raw response SHA-256: <code>{group.rawSha256}</code>. Raw captures, request metadata and refresh instructions are versioned in docs/google-trends.</p>
    </ChartModal>}
  </article>;
}

export function GoogleTrends() {
  return <section id="google-trends" className="performance-curves gt-section" aria-labelledby="google-trends-title">
    <header className="pc-section-header"><h2 id="google-trends-title">Public attention · Google Trends</h2></header>
    <p className="pc-intro">Search interest is public attention, not technical progress, adoption or total search counts. A bounded English-language term basket, not the whole neurotech field.</p>
    <p className="gt-scope">Past 36 months · {SNAPSHOT.start}–{SNAPSHOT.end}<br />Worldwide · Web Search · All categories · weekly UTC</p>
    <div className="pc-grid">{groups.map(group => <TrendCard key={group.id} group={group} />)}</div>
    <p className="gt-scope">Snapshot captured {groups[0].capturedAt.slice(0, 10)} · not a live feed. Incomplete weeks are excluded from charts and latest readings. Expand a chart for methodology and downloadable source values.</p>
  </section>;
}
