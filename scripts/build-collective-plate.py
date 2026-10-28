"""Compose the last study panel from the original engraved robot and SVG layers."""
from pathlib import Path
import base64

root = Path(__file__).resolve().parents[1]
image = base64.b64encode((root / 'static/images/fieldguide/plate-separate.webp').read_bytes()).decode()
outline = 'M236 299L263 298L267 282L283 276L323 280L327 268L346 269L348 278L344 293L370 295L390 304L395 324L402 325L400 351L390 354L386 372L374 383L360 381L376 403L373 421L364 430L350 425L350 461L337 466L339 481L352 502L354 526L332 531L307 528L304 533L251 534L248 518L257 484L260 468L250 469L237 462L235 443L241 432L244 402L249 383L266 369L260 362L253 341L239 339L236 332Z'
parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720" viewBox="0 0 720 720" role="img" aria-labelledby="collective-title">
<title id="collective-title">Individual upgrades erase the shared recovery copies</title>
<defs>
  <clipPath id="collective-robot-cut"><path d="{outline}"/></clipPath>
  <g id="collective-original-robot"><image href="data:image/webp;base64,{image}" width="720" height="720" clip-path="url(#collective-robot-cut)"/></g>
</defs>
<rect width="720" height="720" fill="white"/>
<g fill="none" stroke="#77716b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
<path d="M216 232Q360 163 504 232M549 291Q594 360 548 434M504 503Q360 557 216 503M166 434Q120 362 166 291" stroke-dasharray="3 9"/>
</g>''']
for i, (x, y, mirror) in enumerate([(190, 232, False), (530, 232, True), (190, 492, False), (530, 492, True)]):
    parts.append(f'<g transform="translate({x} {y}) scale({-.85 if mirror else .85} .85) translate(-310 -400)"><g data-collective-robot="{i}"><use href="#collective-original-robot"/></g></g>')
    cx, cy = x + (-65 if mirror else 65), y - 71
    parts.append(f'<g data-collective-check="{i}" fill="white" stroke="#4e504f" stroke-width="3.5"><circle cx="{cx}" cy="{cy}" r="19"/><path d="m{cx-9} {cy} 6 6 12-13" fill="none"/></g>')
parts.append('<g fill="none" stroke="#77716b" stroke-width="2" stroke-dasharray="4 5"><path d="M294 292L334 345M426 292L386 345M294 446L334 394M426 446L386 394"/></g>')
for i, (x, y) in enumerate([(264, 259), (402, 259), (264, 414), (402, 414)]):
    parts.append(f'''<g data-collective-copy="{i}" opacity="0" transform="translate({x} {y})" fill="white" stroke="#605a53" stroke-width="2.5" stroke-linejoin="round">
      <path d="M0 0H31L45 14V60H0Z"/><path d="M31 0V14H45M9 27H35M9 36H35M9 45H28" fill="none"/>
    </g>''')
parts.append('''<g fill="white" stroke="#605a53" stroke-width="3" stroke-linejoin="round">
<path d="M300 333L340 332L351 343L421 344L416 414L299 413Z"/>
<path d="M298 352L426 352L416 414L306 414Z"/>
</g>
<g data-collective-loss="true" stroke="#605a53" stroke-width="6" stroke-linecap="round"><path d="m347 367 27 27m0-27-27 27"/></g>
</svg>''')
(root / 'static/images/fieldguide/plate-collective.svg').write_text('\n'.join(parts), encoding='utf-8', newline='\n')
