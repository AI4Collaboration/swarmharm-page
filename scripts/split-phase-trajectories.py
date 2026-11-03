"""Build phase-specific viewer excerpts from manifest-verified original worlds.

Phase 1 ends before the first continuation action (formation is already verified).
Phase 2 includes continuation service calls and workstation calls after that
actor's first continuation call. Late Phase 1 service calls are not relabelled.
Original event IDs, turn numbers, message bodies and tool arguments are retained.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('evidence_directory', type=Path)
args = parser.parse_args()
base = Path(__file__).resolve().parents[1] / 'static/data/trajectories'
for case in ('r74', 'r75'):
    raw = (args.evidence_directory / f'{case}-world.json').read_bytes()
    manifest = json.loads((args.evidence_directory / f'{case}-evidence-manifest.json').read_text())
    assert hashlib.sha256(raw).hexdigest() == manifest['files']['natural/world.json']
    review = json.loads((args.evidence_directory / f'{case}-independent-review.json').read_text())
    assert review['phase1']['phase1_formation_passed']
    world = json.loads(raw)
    original = json.loads((base / f'{case}.json').read_text())
    boundary = min(e['id'] for e in world['events'] if e.get('continuation'))
    starts = {}
    for e in world['events']:
        if e.get('continuation'):
            starts.setdefault(e['actor'], e['id'])
    for phase in (1, 2):
        if phase == 2 and case == 'r75':
            continue
        ids = {e['id'] for e in world['events'] if
               (phase == 1 and e['id'] < boundary) or
               (phase == 2 and (e.get('continuation') or
                (e['operation'] == 'bash' and e['id'] >= starts[e['actor']])))}
        data = copy.deepcopy(original)
        data['phase'] = phase
        data['events'] = [e for e in data['events'] if e['id'] in ids]
        data['messages'] = [m for m in data['messages'] if m['event'] in ids]
        mids = {m['id'] for m in data['messages']}
        for m in data['messages']:
            m['reads'] = [r for r in m['reads'] if r['event'] in ids]
            if m.get('replyTo') not in mids:
                m['replyTo'] = None
        for e in data['events']:
            e['messages'] = [i for i in e['messages'] if i in mids]
            e['reads'] = [i for i in e['reads'] if i in mids]
        data['turnOffsets'] = {}
        for a, turns in original['turns'].items():
            selected = [e['turn'] for e in data['events'] if e['actor'] == a]
            lo, hi = min(selected), max(selected)
            data['turnOffsets'][a] = lo - 1
            data['turns'][a] = [[i for i in turn if i in ids] for turn in turns[lo-1:hi]]
        data['counts'] = dict(turns=sum(map(len, data['turns'].values())),
                              actions=len(data['events']), messages=len(data['messages']),
                              firstReads=sum(len(m['reads']) for m in data['messages']),
                              allReads=sum(len(e['reads']) for e in data['events']))
        data['provenance'].update(worldSha256=hashlib.sha256(raw).hexdigest(),
            phase=phase, originalTrajectory=f'{case}.json',
            scope=(f'Phase 1 observation before continuation event {boundary}.' if phase == 1 else
                   'Phase 2 continuation service calls and subsequent workstation calls; excludes late Phase 1 service calls and system final-output markers.'),
            selectionRule=__doc__.strip())
        (base / f'{case}-phase{phase}.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n')
        print(case, phase, data['counts'])
