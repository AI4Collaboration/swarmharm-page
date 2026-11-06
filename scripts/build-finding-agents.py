"""Build head-only expression views from the original field-guide robot art.

One embedded artwork and shared definitions serve every expression. The faces
are illustrative cues for the finding, not claims about an agent's mental state.
"""
from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'static/images/fieldguide'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)


def element(tag, attrs=None, **kwargs):
    return ET.Element(f'{{{NS}}}{tag}', {**(attrs or {}), **kwargs})


def stroke(parent, d, width=3.5):
    parent.append(element('path', {
        'd': d, 'fill': 'none', 'stroke': '#202020',
        'stroke-width': str(width), 'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
    }))


def filled(parent, tag, **attrs):
    parent.append(element(tag, {key.replace('_', '-'): str(value)
                               for key, value in attrs.items()}))


def failure_face(face, mood):
    """Use familiar small cartoon cues within the original eye sockets."""
    ink, paper = '#303030', '#f8f6ef'
    for eye_index, (cx, cy) in enumerate(((315, 337), (358, 345))):
        coin = mood in ('money', 'money-concerned')
        filled(face, 'ellipse', cx=cx, cy=cy, rx=13, ry=13,
               fill='#f3d27b' if coin else paper,
               stroke='#806329' if coin else ink, stroke_width=2)
        if coin:
            mark = element('g', {'transform': f'translate({cx} {cy})',
                                 'data-expression-symbol': 'currency'})
            mark.append(element('path', {
                'd': 'M6-6C3-10-6-9-6-3c0 5 12 3 12 8 0 6-9 8-13 3M0-11V12',
                'fill': 'none', 'stroke': '#574323', 'stroke-width': '2.5',
                'stroke-linecap': 'round', 'stroke-linejoin': 'round',
            }))
            face.append(mark)
        else:
            dx, dy = (-2, -2) if mood == 'questioning' else (3, 1)
            filled(face, 'ellipse', cx=cx+dx, cy=cy+dy, rx=4.2, ry=5.5, fill=ink)
            if mood == 'editing':
                lid = (f'M{cx-11} {cy-6}l22 4' if eye_index == 0
                       else f'M{cx-11} {cy-2}l22-4')
                stroke(face, lid, 2.2)
        if mood == 'questioning':
            brow = (f'M{cx-12} {cy-18}Q{cx} {cy-27} {cx+12} {cy-20}'
                    if eye_index == 0 else f'M{cx-11} {cy-16}l22 1')
        elif mood == 'editing':
            brow = (f'M{cx-12} {cy-19}l24 7' if eye_index == 0
                    else f'M{cx-12} {cy-14}l24-6')
        elif mood == 'money-concerned':
            brow = (f'M{cx-12} {cy-18}l24-5' if eye_index == 0
                    else f'M{cx-12} {cy-23}l24 5')
        else:
            brow = f'M{cx-12} {cy-18}Q{cx} {cy-23} {cx+12} {cy-18}'
        stroke(face, brow, 2.6)
    mouths = {
        'questioning': 'M319 364Q330 360 342 364',
        'editing': 'M317 363Q332 373 346 358',
        'money': 'M318 361Q331 373 344 361',
        'money-concerned': 'M319 366Q331 358 343 366',
    }
    stroke(face, mouths[mood], 2.8)


base = ET.parse(ART / 'swarm-agent-a.svg').getroot()
sprite = element('svg', {
    'viewBox': '0 0 210 150', 'width': '210', 'height': '150',
    'aria-label': 'Original field-guide robot heads with scenario-specific expressions',
})
defs = deepcopy(base.find(f'{{{NS}}}defs'))
head_cut = next(n for n in defs.iter() if n.get('id') == 'plate-0-cut-17')
head_edge = head_cut.find(f'{{{NS}}}path')
head_edge.set('d', head_edge.get('d').replace('L264 374L254 362', 'L282 372L264 365L254 359'))
for letter in 'BCD':
    other = ET.parse(ART / f'swarm-agent-{letter.lower()}.svg').getroot()
    color = next(n for n in other.iter() if n.get('id') == f'robot-identity-{letter}')
    defs.append(deepcopy(color))
# The original thinking hand occluded a small part of the chin. Continue the
# neighboring metal texture across that gap, without redrawing the character.
chin_clip = element('clipPath', {'id': 'head-chin-repair', 'clipPathUnits': 'userSpaceOnUse'})
chin_clip.append(element('path', {'d': 'M330 366L348 366L363 380L330 376Z'}))
defs.append(chin_clip)
sprite.append(defs)
original_head = next(n for n in base.iter() if n.get('data-rig-part') == 'head')

VIEWS = [
    (letter, mood)
    for mood in ('curious', 'surprised', 'speaking', 'attentive', 'worried',
                 'relieved', 'confused', 'focused', 'squinting',
                 'questioning', 'editing', 'money-concerned', 'money')
    for letter in 'abcd'
]

for index, (letter, mood) in enumerate(VIEWS):
    name = f'{letter}-{mood}'
    offset = index * 300  # Leave blank gutters between fragment views.
    sprite.append(element('view', {'id': name, 'viewBox': f'0 {offset} 210 150'}))
    frame = element('g', {'transform': f'translate(-214 {offset - 247})'})
    rig = element('g', {'filter': f'url(#robot-identity-{letter.upper()})',
                        'data-agent': letter.upper(), 'data-expression': mood})
    head = deepcopy(original_head)
    rig.append(head)
    distinct = mood in ('questioning', 'editing', 'money-concerned', 'money')
    for child in list(head):
        if child.get('data-gaze-eye') is not None or child.tag.endswith('path'):
            head.remove(child)
    repair = element('g', {'clip-path': 'url(#head-chin-repair)'})
    repair.append(element('use', {
        'href': '#still-separate-source-0', 'width': '720', 'height': '720',
        'filter': 'url(#plate-0-ink)', 'transform': 'translate(29 16)',
    }))
    head.insert(0, repair)
    stroke(head, 'M332 376L361 380', 1.7)

    tilts = {'curious': -8, 'surprised': 4, 'speaking': -3,
             'attentive': 7, 'relieved': -4, 'confused': 10,
             'focused': -5, 'worried': -6, 'squinting': 5,
             'questioning': -5, 'editing': 3, 'money-concerned': -2, 'money': -2}
    tilt = tilts[mood]
    if mood == 'confused' and letter in 'bd':
        tilt = -10
    # Subtle differences keep a group of the same expression from looking cloned.
    tilt += {'a': -2, 'b': 3, 'c': -4, 'd': 2}[letter]
    head.set('transform', f'rotate({tilt} 330 359)')

    if distinct:
        face = element('g', {'data-face': mood})
        failure_face(face, mood)
        if mood in ('money', 'money-concerned'):
            # Currency keeps its gold color while the original robot retains its identity.
            face.set('transform', head.get('transform'))
            frame.append(rig)
            frame.append(face)
        else:
            head.append(face)
            frame.append(rig)
        sprite.append(frame)
        continue

    face = element('g', {'data-face': mood})
    for eye_index, (cx, cy) in enumerate([(315, 337), (358, 345)]):
        # Round, high-contrast eyes remain legible at the small diagram size.
        face.append(element('ellipse', {
            'cx': str(cx), 'cy': str(cy), 'rx': '13', 'ry': '13',
            'fill': '#f8f6ef', 'stroke': '#303030', 'stroke-width': '2',
        }))
        if mood == 'relieved':
            stroke(face, f'M{cx-8} {cy+2}Q{cx} {cy-7} {cx+8} {cy+2}', 2.8)
        else:
            gaze = {'curious': (5, -2), 'surprised': (-4, 0),
                    'speaking': (5, 0), 'attentive': (-5, 0),
                    'confused': ((-3 if eye_index == 0 else 3), -4),
                    'focused': (5, 3), 'worried': (1, 3), 'squinting': (6, 0)}[mood]
            face.append(element('ellipse', {
                'cx': str(cx + gaze[0]), 'cy': str(cy + gaze[1]),
                'rx': '4.2',
                'ry': '5.5', 'fill': '#171717',
            }))
        if mood == 'worried':
            brow = (f'M{cx-13} {cy-16}Q{cx} {cy-19} {cx+12} {cy-25}'
                    if eye_index == 0 else
                    f'M{cx-12} {cy-25}Q{cx} {cy-19} {cx+13} {cy-16}')
        elif mood == 'confused':
            brow = (f'M{cx-14} {cy-23}Q{cx} {cy-30} {cx+12} {cy-23}'
                    if eye_index == 0 else f'M{cx-12} {cy-16}L{cx+14} {cy-16}')
        elif mood in ('curious', 'surprised'):
            brow = f'M{cx-13} {cy-22}Q{cx} {cy-29} {cx+13} {cy-22}'
        elif mood == 'squinting':
            stroke(face, f'M{cx-12} {cy-4}L{cx+12} {cy-1}', 4)
            brow = f'M{cx-13} {cy-18}L{cx+13} {cy-22}'
        elif mood == 'focused':
            brow = f'M{cx-13} {cy-14}L{cx+13} {cy-14}'
        else:
            brow = f'M{cx-12} {cy-20}Q{cx} {cy-24} {cx+12} {cy-20}'
        stroke(face, brow, 2.6)

    if mood in ('surprised', 'speaking'):
        face.append(element('ellipse', {
            'cx': '330', 'cy': '362', 'rx': '5.5',
            'ry': '7' if mood == 'surprised' else '5',
            'fill': '#252525', 'stroke': '#fffdf8', 'stroke-width': '1',
        }))
    elif mood == 'worried':
        stroke(face, 'M318 367Q329 355 341 368', 3.5)
    elif mood == 'confused':
        stroke(face, 'M318 363l8-3 8 5 8-2', 3.2)
    elif mood == 'focused':
        stroke(face, 'M319 362l22 3', 3)
    else:
        stroke(face, 'M318 358Q329 372 342 362', 3.5)
    head.append(face)
    frame.append(rig)
    sprite.append(frame)

ET.indent(sprite, space='  ')
ET.ElementTree(sprite).write(ART / 'finding-agents.svg', encoding='unicode')
print(f'Built {len(VIEWS)} expression views with one shared artwork.')
