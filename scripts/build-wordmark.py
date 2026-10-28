"""Build Michroma wordmarks and a compact crescent from irregular sand grains."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import json
import math
import random

root = Path(__file__).resolve().parents[1]
font = TTFont(root / 'static/fonts/Michroma-Regular.ttf')
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
word, tracking = 'SWARMHARM', 80
advances = [glyphs[cmap[ord(c)]].width for c in word]
scale = 1972 / (sum(advances) + tracking * (len(word) - 1))
left, baseline, cursor = 100, 604, 0
paths = []
for i, char in enumerate(word):
    pen = SVGPathPen(glyphs)
    glyphs[cmap[ord(char)]].draw(pen)
    x = left + cursor * scale
    fill = '#dc2c25' if i == 6 else 'INK'
    paths.append(f'<path data-letter="{char}" data-index="{i}" fill="{fill}" transform="translate({x:.5f} {baseline}) scale({scale:.8f} {-scale:.8f})" d="{pen.getCommands()}"/>')
    if i == 6:
        red_peak = x + 1088 * scale
    cursor += advances[i] + tracking


def curve(t, points):
    p0, p1, p2, p3 = points
    u = 1 - t
    x = u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0]
    y = u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]
    dx = 3*u*u*(p1[0]-p0[0]) + 6*u*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0])
    dy = 3*u*u*(p1[1]-p0[1]) + 6*u*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1])
    return x, y, dx, dy


def grains(points, width, radius, count, gap, seed):
    rng = random.Random(seed)
    result, cells = [], {}
    cell_size = radius * 3
    for _ in range(count * 100):
        if len(result) >= count:
            break
        t = rng.uniform(.006, .994)
        taper = math.sin(math.pi*t)
        x, y, dx, dy = curve(t, points)
        offset = rng.uniform(-1, 1) * width * taper**1.5
        norm = math.hypot(dx, dy)
        x, y = x - dy/norm*offset, y + dx/norm*offset
        r = radius * rng.uniform(.45, 1) * (.35 + .65*taper**.4)
        cell = (int(x/cell_size), int(y/cell_size))
        nearby = [node for i in range(-1, 2) for j in range(-1, 2)
                  for node in cells.get((cell[0]+i, cell[1]+j), [])]
        if any(math.hypot(x-nx, y-ny) < r+nr+gap for nx, ny, nr in nearby):
            continue
        cells.setdefault(cell, []).append((x, y, r))
        verts = []
        turn = rng.uniform(0, 2*math.pi)
        for k in range(7):
            angle = turn + k*2*math.pi/7
            rr = r*rng.uniform(.7, 1)
            verts.append((x+math.cos(angle)*rr, y+math.sin(angle)*rr))
        mids = [((verts[k][0]+verts[(k+1)%7][0])/2,
                 (verts[k][1]+verts[(k+1)%7][1])/2) for k in range(7)]
        d = f'M{mids[-1][0]:.2f},{mids[-1][1]:.2f}'
        for v, m in zip(verts, mids):
            d += f'Q{v[0]:.2f},{v[1]:.2f} {m[0]:.2f},{m[1]:.2f}'
        result.append((d+'Z', t, rng.uniform(.92, 1)))
    return result


start = (left + 1250*scale, baseline - 1540*scale)
end = (red_peak, baseline - 1536*scale)
bridge = grains((start, (540, 170), (1110, 195), end), 38, 2.4, 7000, .02, 281026)
for theme, ink, origin in [('light', '#111315', (20, 23, 27)), ('dark', '#f2f2ef', (226, 228, 231))]:
    particles = []
    for d, t, opacity in bridge:
        mix = min(1, t/.65)**.85
        rgb = [round(a+(b-a)*mix) for a, b in zip(origin, (220, 44, 37))]
        particles.append(f'<path d="{d}" fill="rgb({rgb[0]},{rgb[1]},{rgb[2]})" opacity="{opacity:.2f}"/>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="2172" height="520" viewBox="0 140 2172 520" role="img" aria-labelledby="title desc">
<title id="title">SWARMHARM</title>
<desc id="desc">Individual sand grains form a low crescent bridge rising from S, above complete Michroma letterforms.</desc>
<g aria-label="Sand-grain crescent">{''.join(particles)}</g>
<g aria-label="SWARMHARM">{''.join(paths).replace('INK', ink)}</g>
</svg>
'''
    suffix = '-dark' if theme == 'dark' else ''
    (root/f'static/images/swarmharm-wordmark{suffix}.svg').write_text(svg, encoding='utf-8', newline='\n')

symbol = grains(((4, 47), (16, 7), (48, 7), (60, 47)), 5, .68, 750, .005, 8126)
mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>SwarmHarm sand crescent</title>'
mark += ''.join(f'<path d="{d}" fill="#d92b24" opacity="{opacity:.2f}"/>' for d, _, opacity in symbol)
mark += '</svg>\n'
(root/'static/images/swarmharm-mark.svg').write_text(mark, encoding='utf-8')
print(json.dumps({'wordmark': word, 'glyphs': len(paths), 'sand_grains': len(bridge), 'favicon_grains': len(symbol), 'themes': ['light', 'dark']}))
