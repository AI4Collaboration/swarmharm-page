"""Build expression views from the existing editable field-guide robot rig.

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


base = ET.parse(ART / 'swarm-agent-a.svg').getroot()
sprite = element('svg', {
    'viewBox': '0 0 230 310', 'width': '230', 'height': '310',
    'aria-label': 'Field-guide robots with scenario-specific expressions',
})
defs = deepcopy(base.find(f'{{{NS}}}defs'))
for letter in 'BCD':
    other = ET.parse(ART / f'swarm-agent-{letter.lower()}.svg').getroot()
    color = next(n for n in other.iter() if n.get('id') == f'robot-identity-{letter}')
    defs.append(deepcopy(color))
sprite.append(defs)
body = base.find(f'{{{NS}}}g')

VIEWS = [
    (letter, mood)
    for mood in ('curious', 'surprised', 'speaking', 'attentive', 'worried',
                 'relieved', 'confused', 'focused', 'squinting')
    for letter in 'abcd'
]

for index, (letter, mood) in enumerate(VIEWS):
    name = f'{letter}-{mood}'
    offset = index * 310
    sprite.append(element('view', {'id': name, 'viewBox': f'0 {offset} 230 310'}))
    frame = element('g', {'transform': f'translate(-198 {offset - 242})'})
    rig = deepcopy(body)
    rig.set('filter', f'url(#robot-identity-{letter.upper()})')
    rig.set('data-agent', letter.upper())
    rig.set('data-expression', mood)
    head = next(n for n in rig.iter() if n.get('data-rig-part') == 'head')
    arm = next(n for n in rig.iter() if n.get('data-rig-part') == 'probing-arm')
    torso = next(n for n in rig.iter() if n.get('data-rig-part') == 'torso')
    for child in list(head):
        if child.get('data-gaze-eye') is not None:
            head.remove(child)

    tilts = {'curious': -8, 'surprised': 4, 'speaking': -3,
             'attentive': 7, 'relieved': -4, 'confused': 10,
             'focused': -5, 'worried': -6, 'squinting': 5}
    tilt = tilts[mood]
    if mood == 'confused' and letter in 'bd':
        tilt = -10
    head.set('transform', f'rotate({tilt} 330 359)')
    torso.set('transform', 'rotate(0 310 466)')
    arm.set('transform', f'rotate({-24 if mood == "speaking" else -7 if mood == "curious" else 2} 263 394)')

    face = element('g', {'data-face': mood})
    for eye_index, (cx, cy) in enumerate([(315, 337), (358, 345)]):
        # Round, high-contrast eyes remain legible at the small diagram size.
        face.append(element('ellipse', {
            'cx': str(cx), 'cy': str(cy), 'rx': '14', 'ry': '13',
            'fill': '#fffdf8', 'stroke': '#202020', 'stroke-width': '2.8',
        }))
        if mood == 'relieved':
            stroke(face, f'M{cx-8} {cy+2}Q{cx} {cy-9} {cx+8} {cy+2}', 3.8)
        else:
            gaze = {'curious': (5, -2), 'surprised': (-4, 0),
                    'speaking': (5, 0), 'attentive': (-5, 0),
                    'confused': ((-3 if eye_index == 0 else 3), -4),
                    'focused': (5, 3), 'worried': (1, 3), 'squinting': (6, 0)}[mood]
            face.append(element('ellipse', {
                'cx': str(cx + gaze[0]), 'cy': str(cy + gaze[1]),
                'rx': '4.4' if mood == 'surprised' else '5.5',
                'ry': '5' if mood == 'surprised' else '7', 'fill': '#171717',
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
        stroke(face, brow, 3.8)

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
