"""Apply the same light glass to the shared-desk illustration."""
from pathlib import Path
from copy import deepcopy
import xml.etree.ElementTree as E
root=Path(__file__).resolve().parents[1]
E.register_namespace('', 'http://www.w3.org/2000/svg')
n='{http://www.w3.org/2000/svg}'
source=E.parse(root/'static/images/fieldguide/plate-separate-identity.svg').getroot()
p=root/'static/images/fieldguide/plate-discover-identity.svg'
t=E.parse(p);r=t.getroot();defs=r.find(n+'defs')
if defs.find(n+'mask[@id="refined-desk-objects"]') is not None:
    raise SystemExit('Shared glass refinement already applied.')
for name in ['refined-glass-tint','refined-glass-dome']:
    defs.append(deepcopy(next(x for x in source.find(n+'defs') if x.get('id')==name)))
m=E.fromstring('''<mask xmlns="http://www.w3.org/2000/svg" id="refined-desk-objects" maskUnits="userSpaceOnUse" x="0" y="0" width="720" height="720">
<rect width="720" height="720" fill="black"/>
<ellipse cx="360" cy="551" rx="350" ry="43" fill="white"/>
<rect x="10" y="550" width="700" height="80" fill="white"/>
<path d="M75 414H645V442H632V550H612V444H110V550H88V442H75Z" fill="white"/>
<path d="M110 439H278V483H110Z M448 439H610V483H448Z" fill="white"/>
</mask>''');defs.append(m)
scene=r.find('.//'+n+'g[@data-scene-art="1"]')
original=scene[0];scene.remove(original)
wrapper=E.Element(n+'g',{'mask':'url(#refined-desk-objects)'});wrapper.append(original)
scene.insert(0,wrapper)
for x in [236,-124]:
    scene.insert(0,E.Element(n+'use',{'href':'#refined-glass-dome','transform':f'translate({x} 0) scale(.84 1)'}))
t.write(p,encoding='unicode')
