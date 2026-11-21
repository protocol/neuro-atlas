#!/usr/bin/env python3
"""Rebuild both dependency-free discussion layouts; never modifies app source."""
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUTPUT = ROOT / 'public' / 'mockups'


def build():
    template = (HERE / 'cost-per-channel.template.html').read_text()
    css = (HERE / 'cost-per-channel.css').read_text()
    js = (HERE / 'cost-per-channel.js').read_text()
    data = json.loads((HERE / 'cost-per-channel.data.json').read_text())
    serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for layout in ('chart', 'evidence'):
        values = {
            'CSS': css,
            'JS': js,
            'DATA': serialized,
            'LAYOUT': layout,
            'CHART_CURRENT': 'aria-current="page"' if layout == 'chart' else '',
            'EVIDENCE_CURRENT': 'aria-current="page"' if layout == 'evidence' else '',
            'LEDGER_KICKER': 'ALL 7 RECORDS · CURRENCIES KEPT DISTINCT' if layout == 'evidence' else 'EVIDENCE IN THIS VIEW',
            'LEDGER_TITLE': 'Start with the priced configuration' if layout == 'evidence' else 'What each point actually prices',
            'LEDGER_INTRO': 'The full ledger stays visible. Chart filters never hide a record here; inspecting any record selects its matching layer and currency.' if layout == 'evidence' else 'Every ratio carries its own accounting boundary. Inspect a record to see the numerator, denominator, date basis, and supporting sources.',
        }
        html = template
        for key, value in values.items():
            html = html.replace('@@' + key + '@@', value)
        if '@@' in html:
            raise ValueError('Unresolved template marker')
        filename = 'cost-per-channel' + ('-evidence' if layout == 'evidence' else '') + '.html'
        target = OUTPUT / filename
        target.write_text(html)
        print(f'Built {target.relative_to(ROOT)} ({target.stat().st_size:,} bytes)')


if __name__ == '__main__':
    build()
