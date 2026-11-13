"use client";

import { useMetricPreviewSpace } from "./use-metric-preview-space";

import { canonicalPerformanceAnchor } from "@/data/field-velocity-links";

import React, { useEffect, useRef, useState } from 'react';
import { useTrendsView } from '@/components/google-trends-provider';
import type { TrendsData } from '@/lib/field-velocity/google-trends';
import { atlasPath } from '@/lib/atlas-path';
import { ChartModal } from '@/components/chart-modal';
import { ChartShare } from '@/components/chart-share';
import { ChartActions } from '@/components/chart-actions';
import { usePreviewFont } from '@/components/use-preview-font';
import { PointTooltip, usePointTooltip } from '@/components/point-source-tooltip';
import { ChartYearGuides, annualDateYears } from '@/components/chart-year-guides';
import { CHART_PRESENTATION } from '@/lib/chart-presentation';
import { navigatePerformance, performanceUrl, usePerformanceHash } from '@/lib/field-velocity/navigation';

type Group = TrendsData & { id: string; title: string; sourceUrl: string; rawSha256: string };

const colors = ['var(--accent)', '#087f8c'];

function TrendPlot({ group, compact = false, link, intro }: { group: Group; compact?: boolean; link?: React.ReactNode; intro?: React.ReactNode }) {
  const plotRef = useRef<HTMLDivElement>(null);
  const previewExtra = useMetricPreviewSpace(plotRef, compact);
  const baseHeight = compact ? 238 : 270;
  const height = baseHeight + previewExtra;
  const tooltip = usePointTooltip<string>();
  const [previewWidth, setPreviewWidth] = useState(560);
  useEffect(() => {
    if (!compact || !plotRef.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const measured = entries[0]?.contentRect.width;
      if (measured > 0) setPreviewWidth(Math.max(120, Math.round(measured)));
    });
    observer.observe(plotRef.current);
    return () => observer.disconnect();
  }, [compact]);
  const width = compact ? previewWidth : 600;
  const { ref: presentationRef, fontSize, unitsPerPixel } = usePreviewFont(width, !compact, 270);
  const right = width - 20;
  const rows = group.rows.filter(row => !row.partial);
  const start = Date.parse(group.start), end = Date.parse(group.end);
  const x = (date: string) => 48 + (Date.parse(date) - start) / (end - start) * (right - 48);
  const y = (value: number) => 24 + (100 - value) / 100 * (baseHeight - 70 + previewExtra);
  return <>
    {!compact && <ChartActions anchor={`google-trends-${group.id}`} title={group.title} link={link}><ChartShare anchor={`google-trends-${group.id}`} title={group.title} getChart={() => ({
      svg: plotRef.current!.querySelector('svg')!, title: group.title, anchor: `google-trends-${group.id}`,
      legend: group.terms.map((term, index) => ({ label: term, color: colors[index], marker: index ? 'dashed' : 'line' })),
      notes: [
        `Weekly UTC Google Trends index · 0–100 · ${group.start}–${group.end}. Worldwide · Web Search · All categories.`,
        group.id === 'neurotech' ? 'English search terms compared in one request on a shared scale.' : 'Neuralink: independently normalized brand-search interest.',
        'Relative search interest. Complete weeks use the original index; partial periods are retained in source values. Missing values appear as gaps. 0 indicates low or insufficient interest; <1 appears at the index floor.',
        `Source: Google Trends Explore · captured ${group.capturedAt}.`,
      ],
    })} /></ChartActions>}
    {intro}
    <div ref={plotRef} className={compact ? 'gt-preview' : 'gt-plot'} role={compact ? undefined : 'region'} aria-label={compact ? undefined : `${group.title} plot`} tabIndex={compact ? undefined : 0}>
    {compact && <span className="gt-preview-axis">Worldwide · Weekly index · 0–100</span>}
    <svg ref={presentationRef} data-metric-preview-extra={compact ? previewExtra : undefined} style={compact ? undefined : { fontSize }} data-export-font-size={CHART_PRESENTATION.labelFontSize} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${group.title}: weekly Google Trends index, 0–100. Complete weeks only; source values available in the expanded chart.`}>
      <ChartYearGuides years={annualDateYears(start, end)} x={year => x(`${year}-01-01`)} top={y(100)} bottom={y(0)} />
      {[0, 50, 100].map(tick => <g key={tick}><line x1={48} x2={right} y1={y(tick)} y2={y(tick)} stroke="var(--border-strong)" strokeDasharray="3 5" /><text data-trends-axis="y" x={38} y={y(tick) + 5} textAnchor="end">{tick}</text></g>)}
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
      {!compact && rows.flatMap(row => row.values.map((value, i) => {
        if (value === null) return null;
        const label = `${row.date} · ${group.terms[i]}: ${row.displayValues[i]}`;
        return <circle key={`${row.date}:${i}`} data-trend-point="true" data-date={row.date} data-term={group.terms[i]} data-value={value} cx={x(row.date)} cy={y(value)} data-export-r={CHART_PRESENTATION.denseLineRadius} r={(tooltip.active === label ? CHART_PRESENTATION.focusRadius : CHART_PRESENTATION.denseLineRadius) * unitsPerPixel} fill={colors[i]} tabIndex={0} role="button" aria-label={label} {...tooltip.pointProps(label)}><title>{label}</title></circle>;
      }))}
      <text data-trends-axis="x" x={48} y={baseHeight - 16 + previewExtra}>{group.start.slice(0, compact && width < 240 ? 4 : 7)}</text><text data-trends-axis="x" x={right} y={baseHeight - 16 + previewExtra} textAnchor="end">{group.end.slice(0, compact && width < 240 ? 4 : 7)}</text>
    </svg>
  </div>
  {!compact && <PointTooltip {...tooltip.tooltipProps}><strong>{tooltip.active}</strong><p>Google Trends weekly index · 0–100 · captured {group.capturedAt}</p><p><a href={group.sourceUrl} target="_blank" rel="noreferrer">Open source query ↗</a></p></PointTooltip>}
  </>;
}

function Legend({ group }: { group: Group }) {
  return <ul className="gt-legend">{group.terms.map((term, i) => <li key={term}><span aria-hidden="true" style={{ borderColor: colors[i], borderTopStyle: i ? 'dashed' : 'solid' }} />{term}</li>)}</ul>;
}

function TrendCard({ group, revision }: { group: Group; revision: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const hash = usePerformanceHash();
  const id = `google-trends-${group.id}`;
  const open = hash === `#${canonicalPerformanceAnchor(id)}`;
  const [copyStatus, setCopyStatus] = useState('');
  const [copyFallback, setCopyFallback] = useState('');
  const [valuesOpen, setValuesOpen] = useState(false);
  const latest = group.rows.filter(row => !row.partial).at(-1)!;
  const normalization = group.id === 'neurotech' ? 'English search terms compared in one request on a shared 0–100 scale.' : 'Independently normalized English brand-search interest.';
  const latestReading = <p className="gt-latest" data-trends-latest={latest.date}>Latest complete week · {latest.date}<br />{group.terms.map((term, i) => `${term}: ${latest.displayValues[i]}`).join(' · ')}</p>;
  const share = <div className="pc-share">
    <button type="button" aria-label={`Copy link to ${group.title}`} onClick={async () => {
      const url = performanceUrl(window.location.href, id);
      try { await navigator.clipboard.writeText(url); setCopyFallback(''); setCopyStatus('Link copied'); }
      catch { setCopyFallback(url); setCopyStatus('Select and copy the chart URL below.'); }
    }}>Copy link</button><span role="status">{copyStatus}</span>
    {copyFallback && <label className="gt-copy-fallback">Chart URL<input type="text" aria-label={`Chart URL for ${group.title}`} readOnly value={copyFallback} onFocus={event => event.currentTarget.select()} /></label>}
  </div>;
  return <article className="pc-card card gt-card" data-trends-card={group.id} data-trends-revision={revision}>
    <div data-metric-card-body>
    <button ref={ref} type="button" className="pc-trigger" aria-label={`Open ${group.title}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => navigatePerformance(id)}>
      <h3>{group.title}</h3>
      <span className="gt-range">Past 36 months · {group.start.slice(0, 7)}–{group.end.slice(0, 7)}</span>
      <TrendPlot key={group.rawSha256} group={group} compact />
    </button>
    <div className="gt-card-notes"><Legend group={group} />{group.id !== 'neurotech' && <p className="gt-scale">Independently normalized brand-search interest.</p>}</div>
    </div>
    <div data-metric-card-footer>{share}</div>
    {open && <ChartModal id={id} title={group.title} returnFocus={ref}>
      <TrendPlot key={group.rawSha256} group={group} link={share} intro={<p className="gt-scope">Past 36 months · {group.start}–{group.end}<br />Worldwide · Web Search · All categories · weekly UTC · index 0–100</p>} /><Legend group={group} />{latestReading}
      <section className="pc-methodology" aria-label="Google Trends methodology">
        <h3>How to read this chart</h3>
        <p>Worldwide Google search interest. {normalization} Google uses broad term matching.</p>
        <p>The index uses a sample of searches, normalized by all searches in each time and location. 100 marks the request’s peak relative interest. Sampling can change later readings, especially for low-volume terms.</p>
        <p>0 indicates low or insufficient interest. “&lt;1” appears at the index floor; missing data appear as gaps. Lines connect weekly samples.</p>
        <p>Only complete weeks appear in the chart. The table and CSV retain partial periods. Dates are UTC week starts; complete weeks span seven days. The original index is preserved.</p>
        <p>Captured {group.capturedAt} from Google Trends Explore.</p>
      </section>
      <ul className="pc-sources">
        <li><a href={group.sourceUrl} target="_blank" rel="noreferrer">Open exact Google Trends query ↗</a></li>
        <li><a href={atlasPath(`/api/google-trends/${revision}/${group.id}.csv`)} download>Download source values CSV</a></li>
        <li><a href={atlasPath(`/api/google-trends/${revision}/google-trends.json`)} download>Download snapshot &amp; provenance JSON</a></li>
        <li><a href="https://support.google.com/trends/answer/4365533?hl=en" target="_blank" rel="noreferrer">Google’s data and normalization methodology ↗</a></li>
        <li><a href="https://support.google.com/trends/answer/4359550?hl=en" target="_blank" rel="noreferrer">Search terms versus topics ↗</a></li>
      </ul>
      <details className="gt-values" open={valuesOpen} onToggle={event => setValuesOpen(event.currentTarget.open)}><summary tabIndex={0}>All source values · {group.rows.length} weekly rows (including partial)</summary>
        <div className="pc-table-scroll" role="region" aria-label={`${group.title} source values`} tabIndex={valuesOpen ? 0 : undefined}>
          <table><caption>Google Trends index · original source precision</caption><thead><tr><th scope="col">Week start (UTC)</th>{group.terms.map(term => <th scope="col" key={term}>{term}</th>)}<th scope="col">Period status</th></tr></thead>
            <tbody>{group.rows.map(row => <tr key={row.date} data-trends-row={row.date}><th scope="row">{row.date}</th>{row.displayValues.map((value, i) => <td key={i}>{value}</td>)}<td>{row.partial ? 'Partial · excluded' : 'Complete'}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
      <p className="gt-hash">Raw response SHA-256: <code>{group.rawSha256}</code>. Source revision: <code>{revision}</code>.</p>
    </ChartModal>}
  </article>;
}

export function GoogleTrends({ selection, flat = false }: { selection?: readonly string[]; flat?: boolean } = {}) {
  const { revision, snapshot: { groups } } = useTrendsView();
  const cards = groups.filter(group => !selection || selection.includes(group.id)).map(group => <TrendCard key={group.id} group={group} revision={revision} />);
  if (flat) return <>{cards}</>;
  const sectionId = selection ? `google-trends-${selection.join("-")}-section` : "google-trends";
  return <section id={sectionId} className="performance-curves gt-section" aria-label="Google Trends search interest">
    <div className="pc-grid">{cards}</div>
  </section>;
}
