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


def filled(parent, tag, **attrs):
    parent.append(element(tag, {key.replace('_', '-'): str(value)
                               for key, value in attrs.items()}))


def failure_face(face, mood):
    """Different eye silhouettes, not small variations of the same round eyes."""
    ink, paper = '#171717', '#fffdf8'
    if mood == 'bewildered':
        filled(face, 'ellipse', cx=313, cy=334, rx=18, ry=21,
               fill=paper, stroke=ink, stroke_width=3)
        filled(face, 'ellipse', cx=360, cy=343, rx=13, ry=14,
               fill=paper, stroke=ink, stroke_width=3)
        stroke(face, 'M306 331c0-10 17-11 17 0 0 8-12 12-12 4 0-5 7-7 8-2', 3.3)
        filled(face, 'circle', cx=358, cy=338, r=5, fill=ink)
        stroke(face, 'M293 305Q311 289 332 303M347 322l26 5', 5)
        stroke(face, 'M319 376l10-7 10 12 12-7', 4.5)
    elif mood == 'redacting':
        for d in ('M296 328l35 11-3 15-31-9Z',
                  'M344 342l34-12-2 17-31 9Z'):
            filled(face, 'path', d=d, fill=ink, stroke=ink, stroke_width=2)
        # A tiny downward glance inside heavy, unmistakably narrowed lids.
        stroke(face, 'M306 341l14 4M351 347l14-5', 3.2)
        filled(face, 'circle', cx=322, cy=345, r=3, fill=paper)
        filled(face, 'circle', cx=367, cy=342, r=3, fill=paper)
        stroke(face, 'M294 318l38 12M344 333l35-14', 5)
        stroke(face, 'M320 376l31 3', 5)
    elif mood == 'alarmed':
        for cx, cy in ((312, 335), (358, 342)):
            filled(face, 'ellipse', cx=cx, cy=cy, rx=18, ry=21,
                   fill=paper, stroke=ink, stroke_width=3)
            filled(face, 'circle', cx=cx, cy=cy, r=4, fill=ink)
        stroke(face, 'M291 304Q311 290 330 304M340 308Q359 297 377 312', 5)
        filled(face, 'ellipse', cx=334, cy=380, rx=12, ry=15,
               fill=ink, stroke=paper, stroke_width=2)
        filled(face, 'path', d='M287 324q-18 20-5 24 15 2 5-24Z',
               fill='#76b9dd', stroke=ink, stroke_width=2)
    elif mood == 'confident':
        stroke(face, 'M296 340Q311 315 327 340M343 345Q358 320 374 345', 6)
        stroke(face, 'M296 313Q311 302 328 314M343 319Q358 308 374 321', 3)
        filled(face, 'path', d='M315 365Q336 375 357 365Q337 404 315 365Z',
               fill=paper, stroke=ink, stroke_width=3)
        stroke(face, 'M320 373l31 3', 2)


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
                 'relieved', 'confused', 'focused', 'squinting',
                 'bewildered', 'redacting', 'alarmed', 'confident')
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
    distinct = mood in ('bewildered', 'redacting', 'alarmed', 'confident')
    for child in list(head):
        if child.get('data-gaze-eye') is not None or (distinct and child.tag.endswith('path')):
            head.remove(child)

    tilts = {'curious': -8, 'surprised': 4, 'speaking': -3,
             'attentive': 7, 'relieved': -4, 'confused': 10,
             'focused': -5, 'worried': -6, 'squinting': 5,
             'bewildered': -14, 'redacting': 10, 'alarmed': 0, 'confident': -4}
    tilt = tilts[mood]
    if mood == 'confused' and letter in 'bd':
        tilt = -10
    head.set('transform', f'rotate({tilt} 330 359)' +
             (' translate(330 390) scale(1.26) translate(-330 -390)' if distinct else ''))
    torso.set('transform', 'rotate(0 310 466)')
    arm.set('transform', f'rotate({-24 if mood == "speaking" else -7 if mood == "curious" else 2} 263 394)')

    if distinct:
        arm.set('transform', f'rotate({dict(bewildered=26, redacting=34, alarmed=-26, confident=42)[mood]} 263 394)')
        torso.set('transform', f'rotate({10 if mood == "redacting" else -5 if mood == "alarmed" else 0} 310 466)')
        face = element('g', {'data-face': mood})
        failure_face(face, mood)
        head.append(face)
        frame.append(rig)
        if mood == 'redacting':
            # The eraser is deliberately outside the identity-color filter.
            prop = element('g', {'transform': 'rotate(-25 349 428)', 'data-prop': 'eraser'})
            filled(prop, 'rect', x=330, y=418, width=41, height=19, rx=4,
                   fill='#b52d40', stroke='#292020', stroke_width=2.5)
            filled(prop, 'path', d='M356 419h11q4 0 4 4v9q0 4-4 4h-11Z', fill='#f4d5c9')
            stroke(prop, 'M356 420v15', 2)
            frame.append(prop)
        sprite.append(frame)
        continue

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
