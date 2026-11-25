"""Reproduce test-only integration fixtures from accepted Git parents, never the candidate.
Run at repository root with python3 tests/helpers/build-pr144-main-fixture.py.
"""
import json
import pathlib
import re
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[2]
OURS = '85ceb1a0d55e0d2a139b3d1105a577b2497b0f1c'
MAIN = 'df97d0d70736465657ac50bc9569bbc1b60e6095'
BASE = 'c1195d7862fe7dc1346922bc0159f3ad3c8b6750'

def blob(ref, path):
    result = subprocess.run(['git', 'show', ref + ':' + path], cwd=ROOT, capture_output=True)
    if result.returncode:
        assert b'does not exist' in result.stderr or b'not in' in result.stderr, result.stderr
        return b''
    return result.stdout

def replace_once(text, before, after):
    assert text.count(before) == 1, before
    return text.replace(before, after)

with tempfile.TemporaryDirectory(prefix='pr144-accepted-parents-') as temporary:
    directory = pathlib.Path(temporary)
    fixture = json.loads((ROOT / 'tests/fixtures/sitewide-copy-delta-20261125.json').read_text())
    for file in fixture['files']:
        path = file['path']
        inputs = []
        for name, ref in [('ours', OURS), ('base', BASE), ('main', MAIN)]:
            target = directory / name / path
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(blob(ref, path))
            inputs.append(target)
        merged = subprocess.run(['git', 'merge-file', '-p', '-L', 'ours', '-L', 'base', '-L', 'main', *map(str, inputs)], capture_output=True)
        assert merged.returncode in [0, 1, 2], merged.stderr
        text = merged.stdout.decode()
        def resolve(match):
            ours, main = match.groups()
            if path.endswith('draft-chart-plot.tsx'):
                if 'const tooltip' in ours:
                    return replace_once(main, 'usePointTooltip(plot.points)', 'usePointTooltip(shown)')
                assert 'inlineDetail' in ours and 'recordingPoints.length' in main
                return replace_once(ours, 'plot.referenceTrendlines || plot.curationSource)', 'plot.referenceTrendlines || plot.curationSource || recordingPoints.length > 0)')
            if path.endswith('pace-readings.tsx'):
                assert 'detail={detail}' in ours and 'Reading unavailable' in main
                return replace_once(main, '<CurveCard key=', '<CurveCard detail={detail} key=')
            assert path.endswith('performance-curves.tsx')
            if 'pc-scenario-warning' in ours:
                return replace_once(main, '<label className="pc-track-select pc-scenario-select">', '{!controlledExtrapolation && <label className="pc-track-select pc-scenario-select">')
            assert 'Alternative growth assumptions' in main and '</label>}' in ours
            return replace_once(main, '</label>', '</label>}')
        text = re.sub(r'<<<<<<< ours\n(.*?)=======\n(.*?)>>>>>>> main\n', resolve, text, flags=re.S)
        assert '<<<<<<<' not in text
        if path.endswith('draft-chart-plot.tsx'):
            text = replace_once(text, 'line.id === "em" ? "EM · reported-tech estimates"', 'line.id === "em" ? "EM · reported-technology estimates"')
            text = replace_once(text, '      const key = <><span', '      // Reader-copy changes must not rename the persisted exploration series.\n      const series = isAcquisition && entry.label === "EM · reported-technology estimates" ? "EM · reported-tech estimates" : entry.label;\n      const key = <><span')
            text = replace_once(text, '<SeriesButton id={entry.label} visible={!hidden.includes(entry.label)}', '<SeriesButton id={series} visible={!hidden.includes(series)}')
            text = replace_once(text, 'toggleSeries(hidden, entry.label)', 'toggleSeries(hidden, series)')
        target = directory / 'composed' / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
    generated = directory / 'integration.json'
    subprocess.run(['node', 'scripts/qa/build-reviewed-delta.mjs', '--base-dir', str(directory / 'main'), '--candidate-dir', str(directory / 'composed'), '--baseline-sha', MAIN, '--output', str(generated), *[f['path'] for f in fixture['files']]], cwd=ROOT, check=True)
    (ROOT / 'tests/fixtures/pr144-main-copy-integration.json').write_bytes(generated.read_bytes())
    path = 'src/data/methodology-sources.json'
    old = json.loads(blob(OURS, path))
    base = json.loads(blob(BASE, path))
    # Locate the one PR-only source credit, preserving its accepted category and order.
    additions = [(category, entry) for category, entries in old.items() for entry in entries if entry not in base[category]]
    assert additions == [('studies', ['https://pmc.ncbi.nlm.nih.gov/articles/PMC1564115/', 'Koch et al. — How Much the Eye Tells the Brain (2006; guinea pig retinal-output study)'])]
    (ROOT / 'tests/fixtures/pr144-source-credit.json').write_text(json.dumps({'main': MAIN, 'pr': OURS, 'additions': additions}, indent=2) + '\n')

    import io
    import tarfile
    snapshots = {}
    for name, ref in [('main', MAIN), ('pr', OURS)]:
        snapshot = directory / ('recording-' + name)
        snapshot.mkdir()
        archive = subprocess.check_output(['git', 'archive', ref, 'src/data', 'src/lib'], cwd=ROOT)
        with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
            tar.extractall(snapshot, filter='data')
        (snapshot / 'node_modules').symlink_to(ROOT / 'node_modules')
        module = (snapshot / 'src/data/metric-chart-visibility.ts').as_uri()
        code = f"import {{METRIC_CHART_EVIDENCE as e}} from {json.dumps(module)}; console.log(JSON.stringify(e['Neural recording hours collected over time'].plots[0].points));"
        snapshots[name] = json.loads(subprocess.check_output(['node', '--import', 'tsx', '--input-type=module', '-e', code], cwd=ROOT))
    assert [point['id'] for point in snapshots['main'][:-1]] == [point['id'] for point in snapshots['pr']]
    assert snapshots['main'][-1]['id'] == 'braingate-t15-independent-use-2026-06-15'
    (ROOT / 'tests/fixtures/pr144-recording-parent-points.json').write_text(json.dumps({'mainSha': MAIN, 'prSha': OURS, **snapshots}, indent=2) + '\n')
