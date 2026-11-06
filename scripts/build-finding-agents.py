"""Build original, lightweight robot heads for the diagrams.

Design reference: the simple robot-head vocabulary in Subliminal Learning
(https://alignment.anthropic.com/2025/subliminal-learning/). Shapes are drawn
here, not copied from that figure. Expressions are illustrative, not evidence
of internal emotions, understanding, or malicious intent.
"""
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'static/images/fieldguide'
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)

PALETTES = {
    'a': ('#dceaf2', '#345268'),
    'b': ('#e2efe7', '#3c6054'),
    'c': ('#f3e8ce', '#765d36'),
    'd': ('#e8ebef', '#515e6d'),
}
MOODS = ('curious', 'surprised', 'speaking', 'attentive', 'worried',
         'relieved', 'confused', 'focused', 'squinting',
         'questioning', 'editing', 'concerned', 'content')
VIEWS = [(letter, mood) for mood in MOODS for letter in 'abcd']


def element(tag, **attrs):
    return ET.Element(f'{{{NS}}}{tag}', {
        key.replace('_', '-'): str(value) for key, value in attrs.items()
    })


def add(parent, tag, **attrs):
    node = element(tag, **attrs)
    parent.append(node)
    return node


def line(parent, d, width=2.6):
    return add(parent, 'path', d=d, fill='none', stroke_width=width,
               stroke_linecap='round', stroke_linejoin='round')


def face(parent, mood):
    # Small eyes retain the same proportions in every state. No spirals,
    # oversized pupils, solid-black lids, teeth, sweat, or gaping mouths.
    if mood in ('relieved', 'content'):
        line(parent, 'M39 57Q45 49 51 57M77 57Q83 49 89 57')
    elif mood == 'squinting':
        line(parent, 'M39 55Q45 60 51 55M77 55Q83 60 89 55')
    else:
        for cx in (45, 83):
            add(parent, 'ellipse', cx=cx, cy=56,
                rx=5.5, ry=4.8 if mood in ('focused', 'editing') else 5.5,
                fill='#fffefb', stroke_width=2.5)
        if mood in ('focused', 'editing'):
            line(parent, 'M39 52Q45 50 51 52M77 52Q83 50 89 52', 2.2)

    if mood in ('questioning', 'confused', 'curious'):
        line(parent, 'M37 44Q44 39 51 42M77 45l12 1', 2)
    elif mood in ('concerned', 'worried'):
        line(parent, 'M38 45Q44 45 50 41M78 41Q84 45 90 45', 2)
    elif mood in ('editing', 'focused'):
        line(parent, 'M39 44h12M77 44h12', 2)
    elif mood == 'surprised':
        line(parent, 'M38 42Q45 39 52 42M76 42Q83 39 90 42', 2)

    mouths = {
        'questioning': 'M56 77Q63 73 72 75',
        'confused': 'M56 77Q64 74 72 76',
        'curious': 'M56 74Q64 79 72 74',
        'editing': 'M57 76h14',
        'focused': 'M57 76h14',
        'concerned': 'M55 79Q64 72 73 79',
        'worried': 'M55 79Q64 72 73 79',
        'content': 'M54 74Q64 83 74 74',
        'relieved': 'M54 74Q64 83 74 74',
        'squinting': 'M55 77Q64 79 73 74',
        'attentive': 'M55 74Q64 82 73 74',
    }
    if mood in ('surprised', 'speaking'):
        add(parent, 'ellipse', cx=64, cy=77,
            rx=3.5 if mood == 'surprised' else 6,
            ry=4.5 if mood == 'surprised' else 3,
            fill='#fffefb', stroke_width=2.3)
    else:
        line(parent, mouths[mood], 2.5)


sprite = element('svg', viewBox='0 0 128 120', width=128, height=120,
                 aria_label='Simple robot heads with gentle scenario expressions')
for index, (letter, mood) in enumerate(VIEWS):
    offset = index * 240  # Blank gutters prevent neighboring views bleeding into letterboxing.
    add(sprite, 'view', id=f'{letter}-{mood}', viewBox=f'0 {offset} 128 120')
    fill, ink = PALETTES[letter]
    frame = add(sprite, 'g', transform=f'translate(0 {offset})',
                data_agent=letter.upper(), data_expression=mood,
                fill=fill, stroke=ink, stroke_width=2.7,
                stroke_linecap='round', stroke_linejoin='round')
    # A small neck and shoulder line make the icon read as a robot head.
    add(frame, 'rect', x=54, y=88, width=20, height=14, rx=4)
    add(frame, 'path', d='M31 113v-5q0-9 11-9h44q11 0 11 9v5Z')
    tilt = {'questioning': -4, 'confused': -3, 'curious': -3,
            'editing': 2, 'focused': 2, 'attentive': 1}.get(mood, 0)
    head = add(frame, 'g', transform=f'rotate({tilt} 64 76)')
    line(head, 'M64 13v12')
    add(head, 'circle', cx=64, cy=10, r=4)
    add(head, 'rect', x=7, y=47, width=16, height=25, rx=7)
    add(head, 'rect', x=105, y=47, width=16, height=25, rx=7)
    add(head, 'rect', x=18, y=25, width=92, height=66, rx=14)
    face(head, mood)

ET.indent(sprite, space='  ')
ET.ElementTree(sprite).write(ART / 'finding-agents.svg', encoding='unicode')
print(f'Built {len(VIEWS)} gentle robot-head views.')
