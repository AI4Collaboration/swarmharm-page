"""Make self-contained SVG fallbacks from paused production scene SVGs.

Usage: python scripts/export-plate-stills.py path/to/scene-svgs.json [--scene separate]
The JSON contains the four .plate-motion outerHTML strings captured during QA.
Selecting one scene leaves the other plates and research-question miniatures unchanged.
"""
from pathlib import Path
import argparse
import base64
import copy
import json
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
namespace = 'http://www.w3.org/2000/svg'
ET.register_namespace('', namespace)
tag = lambda name: f'{{{namespace}}}{name}'
names = ['separate', 'discover', 'communicate', 'harm']
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('snapshot', type=Path)
parser.add_argument('--scene', choices=names)
args = parser.parse_args()
scenes = json.loads(args.snapshot.read_text(encoding='utf-8'))
assert len(scenes) == 4
for name, source in zip(names, scenes):
    if args.scene and name != args.scene:
        continue
    if 'xmlns=' not in source.split('>')[0]:
        source = source.replace('<svg ', f'<svg xmlns="{namespace}" ', 1)
    svg = ET.fromstring(source)
    svg.attrib.pop('class', None)
    svg.set('width', '720')
    svg.set('height', '720')
    # These are static snapshots; invisible animation layers need no payload.
    for parent in list(svg.iter()):
        for child in list(parent):
            if child.get('opacity') in {'0', '0.000'}:
                parent.remove(child)
    defs = svg.find(tag('defs'))
    embedded = {}
    for image in list(svg.iter(tag('image'))):
        href = image.get('href')
        dimensions = (image.get('width', '720'), image.get('height', '720'))
        key = (href, dimensions)
        if key not in embedded:
            path = (root / href.split('?')[0]).resolve()
            assert root in path.parents and path.suffix == '.webp'
            identifier = f'still-{name}-source-{len(embedded)}'
            uri = 'data:image/webp;base64,' + base64.b64encode(path.read_bytes()).decode()
            ET.SubElement(defs, tag('image'), {'id': identifier, 'href': uri, 'width': dimensions[0], 'height': dimensions[1]})
            embedded[key] = identifier
        image.tag = tag('use')
        image.set('href', '#' + embedded[key])
    output = root / f'static/images/fieldguide/plate-{name}-still.svg'
    output.write_text(ET.tostring(svg, encoding='unicode') + '\n', encoding='utf-8', newline='\n')
    print(output.name)

# The research-question miniatures share the same engraved figures and eyes.
if args.scene:
    raise SystemExit(0)
separate = ET.parse(root / 'static/images/fieldguide/plate-separate-still.svg').getroot()
for i, name in enumerate(['watchful', 'narrow']):
    svg = ET.Element(tag('svg'), {'viewBox': '198 242 230 310', 'width': '230', 'height': '310'})
    svg.append(copy.deepcopy(separate.find(tag('defs'))))
    actor = next(node for node in separate.iter(tag('g')) if node.get('data-explorer') == str(i))
    svg.append(copy.deepcopy(actor))
    output = root / f'static/images/fieldguide/swarm-agent-{name}.svg'
    output.write_text(ET.tostring(svg, encoding='unicode') + '\n', encoding='utf-8', newline='\n')
