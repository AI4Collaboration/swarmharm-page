"""Build Michroma wordmarks and a compact crescent from irregular sand grains."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import json
import math
import random

root = Path(__file__).resolve().parents[1]
font = TTFont(root / 'static/fonts/Michroma-Regular.ttf')
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
word, tracking = 'SWARMHARM', 80
weight = 32  # A small outline expansion; keep the font, spacing and sand unchanged.
advances = [glyphs[cmap[ord(c)]].width for c in word]
scale = 1972 / (sum(advances) + tracking * (len(word) - 1))
left, baseline, cursor = 100, 604, 0
paths, letter_info = [], []
for i, char in enumerate(word):
    pen = SVGPathPen(glyphs)
    glyphs[cmap[ord(char)]].draw(pen)
    x = left + cursor * scale
    fill = '#e52b24' if i >= 5 else 'INK'
    placement = f'translate({x:.5f} {baseline}) scale({scale:.8f} {-scale:.8f})'
    paths.append(f'<path data-letter="{char}" data-index="{i}" fill="{fill}" stroke="{fill}" stroke-width="{weight}" stroke-linejoin="round" transform="{placement}" d="{pen.getCommands()}"/>')
    bounds = BoundsPen(glyphs)
    glyphs[cmap[ord(char)]].draw(bounds)
    letter_info.append((char, x, pen.getCommands(), placement, bounds.bounds))
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


def grain_path(x, y, radius, rng, faceted=False, direction=0):
    if faceted:
        turn = direction + rng.uniform(-1.4, 1.4)
        aspect = rng.uniform(.64, 1.12)
        count = rng.choice([5, 6, 7])
        points = []
        for k in range(count):
            angle = k*2*math.pi/count + rng.uniform(-.15, .15)
            r = radius*rng.uniform(.68, 1)
            px, py = math.cos(angle)*r, math.sin(angle)*r*aspect
            points.append((x+math.cos(turn)*px-math.sin(turn)*py,
                           y+math.sin(turn)*px+math.cos(turn)*py))
        corners = []
        for i, (px, py) in enumerate(points):
            prev, following = points[i-1], points[(i+1)%count]
            entry = (px+(prev[0]-px)*.14, py+(prev[1]-py)*.14)
            leave = (px+(following[0]-px)*.14, py+(following[1]-py)*.14)
            corners.append((entry, (px, py), leave))
        d = f'M{corners[-1][2][0]:.2f},{corners[-1][2][1]:.2f}'
        for entry, corner, leave in corners:
            d += f'L{entry[0]:.2f},{entry[1]:.2f}Q{corner[0]:.2f},{corner[1]:.2f} {leave[0]:.2f},{leave[1]:.2f}'
        return d+'Z'
    turn = rng.uniform(0, 2*math.pi)
    verts = []
    for k in range(7):
        angle = turn + k*2*math.pi/7
        r = radius*rng.uniform(.65, 1)
        verts.append((x+math.cos(angle)*r, y+math.sin(angle)*r))
    mids = [((verts[k][0]+verts[(k+1)%7][0])/2,
             (verts[k][1]+verts[(k+1)%7][1])/2) for k in range(7)]
    d = f'M{mids[-1][0]:.2f},{mids[-1][1]:.2f}'
    for v, m in zip(verts, mids):
        d += f'Q{v[0]:.2f},{v[1]:.2f} {m[0]:.2f},{m[1]:.2f}'
    return d+'Z'


def grains(points, width, radius, count, gap, seed, levels=None):
    rng = random.Random(seed)
    result, cells = [], {}
    cell_size = radius * 3
    fine_radius = min(.65, max(.1, radius*.035))
    # Place visible grains first, then let finer sand fill their interstices.
    # One shared packing map keeps each grain distinct at every size.
    for size, quantity in levels or [(radius, count)]:
        target = len(result) + quantity
        for _ in range(quantity * 100):
            if len(result) >= target:
                break
            t = rng.betavariate(3, 3.4) if levels and size == radius else rng.uniform(.003, .997)
            x, y, dx, dy = curve(t, points)
            progress = (x-points[0][0])/(points[-1][0]-points[0][0])
            taper = math.sin(math.pi*progress)
            ramp = progress/.44 if progress < .44 else (1-progress)/.56
            core = math.sin(math.pi*.5*ramp)**2.15
            # Fine dust belongs mainly in the taper, leaving the central grains legible.
            if levels and size <= 2 and rng.random() < .88*core:
                continue
            spread = max(-1.15, min(.85, rng.gauss(-.12, .43))) if levels else rng.uniform(-1, 1)
            offset = spread * width * taper**1.65 * (1.2-.35*progress)
            norm = math.hypot(dx, dy)
            x, y = x - dy/norm*offset, y + dx/norm*offset
            r = ((fine_radius + (size-fine_radius)*core) if levels else size*(.1+.9*taper**.65)) * rng.uniform(.65, 1)
            cell = (int(x/cell_size), int(y/cell_size))
            nearby = [node for i in range(-1, 2) for j in range(-1, 2)
                      for node in cells.get((cell[0]+i, cell[1]+j), [])]
            separation = .96 if levels else 1
            if any(math.hypot(x-nx, y-ny) < separation*(r+nr)+gap for nx, ny, nr in nearby):
                continue
            cells.setdefault(cell, []).append((x, y, r))
            result.append((grain_path(x, y, r, rng, faceted=bool(levels), direction=math.atan2(dy, dx)), progress, rng.uniform(.94, 1)))
    return result


def gradient(t, stops):
    for (at, color), (next_at, next_color) in zip(stops, stops[1:]):
        if t <= next_at:
            mix = (t-at)/(next_at-at)
            return [round(a+(b-a)*mix) for a, b in zip(color, next_color)]
    return stops[-1][1]


def swarm_letters():
    """Use the complete glyphs only as clips, with actual grains as their ink."""
    rng = random.Random(1082826)
    defs, letters = [], []
    total = 0
    for i, (char, x, outline, placement, bounds) in enumerate(letter_info[:5]):
        clip_id = f'swarm-letter-{i}'
        defs.append(f'<mask id="{clip_id}" maskUnits="userSpaceOnUse" x="-100" y="140" width="2272" height="520"><path fill="white" stroke="white" stroke-width="{weight}" stroke-linejoin="round" transform="{placement}" d="{outline}"/></mask>')
        x0, y0, x1, y1 = bounds
        x0, x1 = x+x0*scale-4, x+x1*scale+4
        y0, y1 = baseline-y1*scale-4, baseline-y0*scale+4
        dots = []
        row, y = 0, y0
        while y <= y1:
            xx = x0 + (row % 2)*2.8
            while xx <= x1:
                px, py = xx+rng.uniform(-1.5,1.5), y+rng.uniform(-1.3,1.3)
                radius = rng.uniform(2.4,3.9)
                dots.append(f'<path d="{grain_path(px,py,radius,rng)}"/>')
                xx += 5.6
            row += 1
            y += 4.85
        total += len(dots)
        letters.append(f'<g data-letter="{char}" data-index="{i}" mask="url(#{clip_id})">{"".join(dots)}</g>')
    return ''.join(defs), ''.join(letters), total


def incoming_sand():
    rng = random.Random(281028)
    dots = []
    for _ in range(270):
        progress = rng.betavariate(2,1.05)
        x = -92 + 217*progress
        lane = rng.choice([467, 527, 590])
        y = lane - 7*math.sin(progress*math.pi) + rng.gauss(0,14-9*progress)
        radius = .55 + 2.75*progress**1.35*rng.uniform(.55,1)
        dots.append(f'<path d="{grain_path(x,y,radius,rng)}" opacity="{.22+.78*progress:.2f}"/>')
    return ''.join(dots)


start = (left + 1250*scale, baseline - 1540*scale)
end = (red_peak, baseline - 1536*scale)
bridge = grains((start, (470, 232), (1015, 290), end), 50, 23, 2060, .32, 281026,
                levels=[(23, 160), (7, 400), (1.7, 1500)])
letter_defs, letter_grains, letter_grain_count = swarm_letters()
wind = incoming_sand()
for theme, ink, origin in [('light', '#111315', (20, 23, 27)), ('dark', '#f2f2ef', (226, 228, 231))]:
    particles = []
    stops = [(0, origin), (.22, (86, 24, 26) if theme == 'light' else (221, 169, 165)),
             (.5, (207, 37, 30)), (.82, (240, 45, 34)), (1, (229, 43, 36))]
    for d, t, opacity in bridge:
        rgb = gradient(t, stops)
        particles.append(f'<path d="{d}" fill="rgb({rgb[0]},{rgb[1]},{rgb[2]})" opacity="{opacity:.2f}"/>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="2272" height="480" viewBox="-100 180 2272 480" role="img" aria-labelledby="title desc">
<title id="title">SWARMHARM</title>
<desc id="desc">Sand blows in from the left and forms SWARM. An asymmetric flight arc has coarse, faceted grains through its center and fine sand at both tips, with a longer red taper toward solid red HARM.</desc>
<defs>{letter_defs}</defs>
<g aria-label="Sand-grain crescent">{''.join(particles)}</g>
<g fill="{ink}" aria-label="Incoming sand">{wind}</g>
<g fill="{ink}" aria-label="SWARM formed from sand">{letter_grains}</g>
<g aria-label="HARM">{''.join(paths[5:])}</g>
</svg>
'''
    suffix = '-dark' if theme == 'dark' else ''
    (root/f'static/images/swarmharm-wordmark{suffix}.svg').write_text(svg, encoding='utf-8', newline='\n')

symbol = grains(((4, 47), (12, 9), (39, 15), (60, 45)), 5, 1.3, 380, .01, 8126,
                levels=[(1.3, 70), (.75, 120), (.3, 190)])
mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>SwarmHarm sand crescent</title>'
mark += ''.join(f'<path d="{d}" fill="#d92b24" opacity="{opacity:.2f}"/>' for d, _, opacity in symbol)
mark += '</svg>\n'
(root/'static/images/swarmharm-mark.svg').write_text(mark, encoding='utf-8')
print(json.dumps({'wordmark': word, 'glyphs': len(paths), 'crescent_grains': len(bridge), 'letter_grains_before_clipping': letter_grain_count, 'incoming_grains': 270, 'favicon_grains': len(symbol), 'themes': ['light', 'dark']}))
