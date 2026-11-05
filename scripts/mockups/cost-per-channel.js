(function () {
  'use strict';
  const selectRows = (records, scope, currency) => records.filter(r => r.scope === scope && r.currency === currency);
  const ratio = (record, tier) => record.price[tier] / record.quantity / record.channels;
  const money = (value, currency, decimals = 2) => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  const prefix = record => record.bound === 'lt' ? '<' : record.bound === 'approx' ? '≈' : '';
  const displayRatio = (record, tier) => prefix(record) + money(ratio(record, tier), record.currency);
  function plotPoints(rows, tier) {
    const years = rows.map(r => r.year);
    const first = Math.min(...years), last = Math.max(...years);
    const x = year => first === last ? 164 : 100 + (year - first) / (last - first) * 550;
    const y = value => 316 - Math.log10(value) / Math.log10(300) * 264;
    const ticks = first === last ? [first] : [...new Set([first, ...[2010, 2015, 2020, 2025].filter(n => n > first && n < last), last])];
    return { points: rows.map(record => ({ record, x: x(record.year), y: y(ratio(record, tier)) })), ticks: ticks.map(year => ({ year, x: x(year) })), yTicks: [1, 3, 10, 30, 100, 300].map(value => ({ value, y: y(value) })) };
  }
  function transition(state, action) {
    if (action.type === 'peek') return state.pinned ? state : { ...state, peek: action.id };
    if (action.type === 'pin') return { ...state, pinned: action.id, peek: null };
    if (action.type === 'clear') return { ...state, pinned: null, peek: null };
    if (action.type === 'filter') return { ...state, [action.key]: action.value, pinned: action.key === 'tier' ? state.pinned : null, peek: null };
    return state;
  }
  const core = { selectRows, ratio, money, prefix, displayRatio, plotPoints, transition };
  if (typeof module !== 'undefined') module.exports = core;
  if (typeof document === 'undefined') return;

  const data = JSON.parse(document.getElementById('mock-data').textContent);
  const records = data.records;
  const evidenceFirst = document.body.dataset.layout === 'evidence';
  let state = { scope: 'electronics', currency: 'USD', tier: 'academic', pinned: null, peek: null };
  const names = { electronics: 'Recording electronics', probes: 'Probes & arrays', complete: 'Complete setup' };
  const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const byId = id => records.find(r => r.id === id);
  const sourceLink = (url, label, className = '') => `<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} ↗</a>`;
  const price = row => prefix(row) + money(row.price[state.tier], row.currency);
  function calculation(row) {
    return `${price(row)}${row.quantity > 1 ? ' ÷ ' + row.quantity + ' probes' : ''} ÷ ${row.channels} channels`;
  }
  function renderChart() {
    const rows = selectRows(records, state.scope, state.currency);
    document.getElementById('chart-kicker').textContent = names[state.scope].toUpperCase() + ' · ' + state.currency;
    document.getElementById('point-count').textContent = rows.length + (rows.length === 1 ? ' observation' : ' observations');
    document.getElementById('axis-unit').textContent = state.currency + ' per simultaneous channel · log scale';
    const content = document.getElementById('chart-content');
    if (!rows.length) {
      content.innerHTML = document.getElementById('complete-empty').innerHTML;
      return;
    }
    const plot = plotPoints(rows, state.tier);
    const grid = plot.yTicks.map(t => `<line class="grid-line" x1="76" x2="708" y1="${t.y}" y2="${t.y}"/><text class="axis-text" text-anchor="end" x="62" y="${t.y + 3}">${state.currency === 'EUR' ? '€' : '$'}${t.value}</text>`).join('');
    const ticks = plot.ticks.map(t => `<text class="axis-text" x="${t.x}" y="346" text-anchor="middle">${t.year}</text>`).join('');
    const labels = plot.points.map(p => {
      const right = p.x > 580;
      const lx = p.x + (right ? -17 : 17);
      const ly = p.y - 7;
      const arrow = p.record.bound === 'lt' ? `<path class="bound-arrow" d="M ${p.x} ${p.y + 8} v 24 m -4 -5 l 4 5 l 4 -5"/>` : '';
      return `${arrow}<text class="point-label" x="${lx}" y="${ly}" text-anchor="${right ? 'end' : 'start'}">${escape(p.record.short)}<tspan class="point-value" x="${lx}" dy="16">${escape(displayRatio(p.record, state.tier))}${p.record.tiered ? ' · ' + state.tier : ''}</tspan></text>`;
    }).join('');
    const marks = plot.points.map(p => `<button type="button" class="mark" style="left:${p.x - 22}px;top:${p.y - 22}px" data-point="${p.record.id}" data-row-id="${p.record.id}" data-testid="point-${p.record.id}" data-bound="${p.record.bound}" aria-label="${escape(p.record.short + ', ' + p.record.year + ', ' + displayRatio(p.record, state.tier) + ' per channel. ' + (p.record.bound === 'lt' ? 'Upper bound. ' : p.record.bound === 'approx' ? 'Approximate. ' : '') + 'Click to pin evidence.')}" aria-pressed="false"></button>`).join('');
    content.innerHTML = `<div class="chart-scroll" data-testid="chart-scroll" tabindex="0" aria-label="Scrollable benchmark scatter plot. Scroll horizontally to see later years."><div class="plot" style="width:740px"><svg viewBox="0 0 740 390" aria-hidden="true">${grid}${ticks}${labels}<text class="axis-text" x="393" y="377" text-anchor="middle">Year · publication / observation date; see point evidence</text></svg>${marks}</div></div><div class="scroll-hint">↔ Scroll chart to inspect every year · tap a point to pin its evidence</div>`;
    content.querySelectorAll('[data-point]').forEach(button => {
      button.addEventListener('mouseenter', () => peek(button.dataset.point));
      // Keep inspected evidence reachable when the pointer or focus moves to its source link.
      button.addEventListener('focus', () => peek(button.dataset.point));
    });
  }
  function renderLedger() {
    const rows = evidenceFirst ? records : selectRows(records, state.scope, state.currency);
    document.getElementById('evidence-rows').innerHTML = rows.length ? rows.map(row => `<article class="evidence-row" data-evidence-row="${row.id}" data-row-id="${row.id}" data-testid="evidence-${row.id}">
      <div><h3 class="row-title">${escape(row.name)}</h3><p class="row-config">${escape(row.configuration)}</p><div class="row-meta"><span>${escape(row.dateLabel)}</span><span>${row.currency}${row.tiered ? ' · ' + state.tier : ''}</span><span class="row-type">${escape(row.priceType)}</span></div></div>
      <div class="row-number">${escape(displayRatio(row, state.tier))}<small>per channel</small></div>
      <div class="row-bottom"><p class="row-scope-note">${escape(calculation(row))}</p><button type="button" class="inspect-row" data-inspect="${row.id}" data-testid="inspect-${row.id}">Inspect evidence ↗</button></div>
      <div class="row-extra"><p>${escape(row.scope === 'electronics' ? 'Electronics · ' : 'Probe / array · ')}${escape(row.included)}</p><p>${sourceLink(row.evidence[0].url, row.evidence[0].text)}</p></div>
    </article>`).join('') : '<p class="no-rows">No matched observations in this layer. Missing evidence is not a zero-dollar setup.</p>';
  }
  function highlight() {
    const id = state.pinned || state.peek;
    document.querySelectorAll('[data-point]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.point === id);
      button.setAttribute('aria-pressed', String(button.dataset.point === state.pinned));
    });
    document.querySelectorAll('[data-evidence-row]').forEach(row => row.classList.toggle('is-active', row.dataset.evidenceRow === id));
  }
  function renderInspector() {
    const row = byId(state.pinned || state.peek);
    const body = document.getElementById('inspector-body');
    document.getElementById('clear-selection').hidden = !row;
    document.getElementById('inspection-state').textContent = row ? (state.pinned ? 'Pinned' : 'Preview') : 'Nothing selected';
    document.getElementById('detail-pane').dataset.selected = row ? row.id : '';
    document.getElementById('detail-pane').dataset.pinned = String(Boolean(state.pinned));
    if (!row) {
      // Preserve the owner's intentionally empty default; instructions live beside the chart.
      body.replaceChildren();
    } else {
      const numerator = row.quantity > 1 ? money(row.price[state.tier] / row.quantity, row.currency) : price(row);
      body.innerHTML = `<div class="detail" data-detail-row="${row.id}"><p class="eyebrow">${escape(row.priceType.toUpperCase())}${row.tiered ? ' · ' + state.tier.toUpperCase() : ''}</p><h3>${escape(row.name)}</h3><p class="detail-subtitle">${escape(row.configuration)}</p><p class="detail-ratio" data-testid="detail-ratio">${escape(displayRatio(row, state.tier))}<small>${row.currency} / simultaneous recording channel${row.bound === 'lt' ? ' · upper bound, not an exact price' : row.bound === 'approx' ? ' · approximate' : ''}</small></p><div class="calculation"><span>${escape(numerator)}<small>${row.quantity > 1 ? 'allocated per probe' : 'priced hardware'}</small></span><span>÷</span><span>${row.channels}<small>simultaneous channels</small></span></div><dl><dt>Price numerator</dt><dd>${escape(calculation(row))}.${row.tiered ? ' Academic and list are distinct price tiers; this is a parts sum, not a turnkey quote.' : ''}</dd><dt>Recording denominator</dt><dd>${escape(row.channelBasis)}</dd><dt>Included</dt><dd>${escape(row.included)}</dd><dt>Excluded / not established</dt><dd>${escape(row.excluded)}</dd><dt>Date basis</dt><dd>${escape(row.dateBasis)}</dd></dl><p class="boundary-note">${escape(row.caveat)}</p><div class="quote-section"><h4>Source excerpt / selected fields</h4>${row.evidence.map(q => `<figure class="source-quote"><figcaption>${escape(q.label)}</figcaption><blockquote>${escape(q.text)}</blockquote>${sourceLink(q.url, 'Supporting source')}</figure>`).join('')}</div><div class="source-buttons">${row.sources.map(s => sourceLink(s.url, s.label)).join('')}</div></div>`;
    }
    highlight();
  }
  function peek(id) {
    state = transition(state, { type: 'peek', id });
    renderInspector();
  }
  function renderAll() {
    ['scope', 'currency', 'tier'].forEach(key => document.querySelectorAll('[data-' + key + ']').forEach(button => button.setAttribute('aria-pressed', String(button.dataset[key] === state[key]))));
    renderChart(); renderLedger(); renderInspector();
  }
  document.addEventListener('click', event => {
    const control = event.target.closest('[data-scope], [data-currency], [data-tier]');
    if (control) {
      const key = ['scope', 'currency', 'tier'].find(k => control.dataset[k]);
      state = transition(state, { type: 'filter', key, value: control.dataset[key] });
      renderAll();
      return;
    }
    const target = event.target.closest('[data-point], [data-inspect]');
    if (target) {
      const row = byId(target.dataset.point || target.dataset.inspect);
      if (row.scope !== state.scope || row.currency !== state.currency) {
        state = { ...state, scope: row.scope, currency: row.currency };
        state = transition(state, { type: 'pin', id: row.id });
        renderAll();
      } else {
        state = transition(state, { type: 'pin', id: row.id });
        renderInspector();
      }
      document.getElementById('selection-announcement').textContent = 'Pinned evidence for ' + row.name + ', ' + row.configuration + '.';
    }
  });
  function clear() {
    state = transition(state, { type: 'clear' });
    renderInspector();
    document.getElementById('selection-announcement').textContent = 'Evidence selection cleared.';
  }
  document.getElementById('clear-selection').addEventListener('click', clear);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') clear(); });
  document.getElementById('print-button').addEventListener('click', () => window.print());
  renderAll();
})();
