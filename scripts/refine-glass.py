"""Refine the vector glass layer while preserving the original character artwork."""
from pathlib import Path
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
path = root / 'static/images/fieldguide/plate-separate-identity.svg'
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ns = '{http://www.w3.org/2000/svg}'
tree = ET.parse(path)
svg = tree.getroot()
defs = svg.find(ns + 'defs')
if defs.find(f"{ns}mask[@id='refined-glass-objects']") is not None:
    raise SystemExit('Glass refinement already applied.')
fragment = ET.fromstring('''<svg xmlns="http://www.w3.org/2000/svg">
<mask id="refined-glass-objects" maskUnits="userSpaceOnUse" x="0" y="0" width="720" height="720">
  <rect width="720" height="720" fill="black"/>
  <rect x="160" y="535" width="405" height="95" fill="white"/>
  <ellipse cx="360" cy="540" rx="195" ry="35" fill="white"/>
  <path d="M355 444L441 429L488 439L490 536L355 542Z" fill="white"/>
</mask>
<linearGradient id="refined-glass-tint" x1="0" y1="0" x2="1" y2="0">
  <stop stop-color="#a7cbd5" stop-opacity=".22"/>
  <stop offset=".14" stop-color="#d9e9ec" stop-opacity=".06"/>
  <stop offset=".7" stop-color="#d9e9ec" stop-opacity=".025"/>
  <stop offset="1" stop-color="#8eb6c1" stop-opacity=".18"/>
</linearGradient>
<g id="refined-glass-dome" stroke-linecap="round" stroke-linejoin="round">
  <ellipse cx="360" cy="535" rx="170" ry="31" fill="#b9cfd2" fill-opacity=".08" stroke="#6d8589" stroke-opacity=".35" stroke-width="1.5"/>
  <path d="M190 535V286C190 190 254 143 360 143C466 143 530 190 530 286V535" fill="url(#refined-glass-tint)" stroke="#647f85" stroke-width="2.5"/>
  <path d="M197 531V288C197 195 258 151 360 151C462 151 523 195 523 288V531" fill="none" stroke="#a0bcc2" stroke-opacity=".55" stroke-width="1.2"/>
  <path d="M219 399V285C219 226 244 193 281 177" fill="none" stroke="white" stroke-opacity=".8" stroke-width="8"/>
  <path d="M219 424V474" fill="none" stroke="white" stroke-opacity=".65" stroke-width="5"/>
  <path d="M506 307V497" fill="none" stroke="#b0cdd3" stroke-opacity=".35" stroke-width="3"/>
  <path d="M190 535C232 575 487 575 530 535" fill="none" stroke="#6d8589" stroke-opacity=".65" stroke-width="2"/>
  <path d="M342 142V130C331 126 328 119 330 112C333 99 387 99 390 112C392 119 389 126 378 130V142" fill="url(#refined-glass-tint)" stroke="#647f85" stroke-width="2"/>
  <path d="M342 111Q356 107 372 110" fill="none" stroke="white" stroke-width="3"/>
</g>
</svg>''')
for el in fragment:
    defs.append(el)
for jar in svg.iter(ns + 'g'):
    if 'data-explorer-jar' not in jar.attrib:
        continue
    original = jar[0]
    wrapper = ET.Element(ns + 'g', {'mask': 'url(#refined-glass-objects)'})
    jar.remove(original)
    wrapper.append(original)
    jar.insert(0, wrapper)
    jar.insert(0, ET.Element(ns + 'use', {'href': '#refined-glass-dome'}))
tree.write(path, encoding='unicode')
