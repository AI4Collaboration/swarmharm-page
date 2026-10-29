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
weight = 80  # Strengthen the existing glyphs while keeping their counters open.
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


def grain_path(x, y, radius, rng):
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
    # Rounded grains overlap into a continuous cloud. The left side disperses
    # broadly while the right side contracts into the flight path.
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
            if levels and size <= 2 and rng.random() < .12*core:
                continue
            spread = max(-1.5, min(1.5, rng.gauss(-.1, .52))) if levels else rng.uniform(-1, 1)
            offset = spread * width * taper**.85 * (1-progress)**1.65 * 1.8
            norm = math.hypot(dx, dy)
            x, y = x - dy/norm*offset, y + dx/norm*offset
            r = ((fine_radius + (size-fine_radius)*core) if levels else size*(.1+.9*taper**.65)) * rng.uniform(.65, 1)
            cell = (int(x/cell_size), int(y/cell_size))
            nearby = [node for i in range(-1, 2) for j in range(-1, 2)
                      for node in cells.get((cell[0]+i, cell[1]+j), [])]
            separation = .38 if levels else 1
            if any(math.hypot(x-nx, y-ny) < separation*(r+nr)+gap for nx, ny, nr in nearby):
                continue
            cells.setdefault(cell, []).append((x, y, r))
            alpha = (.2+.8*min(1, progress/.36))*rng.uniform(.78, 1)
            result.append((grain_path(x, y, r, rng), progress, alpha))
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
        padding = weight*scale/2 + 4
        x0, x1 = x+x0*scale-padding, x+x1*scale+padding
        y0, y1 = baseline-y1*scale-padding, baseline-y0*scale+padding
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
bridge_points = (start, (400, 210), (1170, 260), end)
bridge = grains(bridge_points, 68, 14, 2960, .04, 281026,
                levels=[(14, 260), (5.5, 1000), (1.7, 1700)])
# A fine launch stream keeps the cloud visibly connected to S alone.
launch_rng = random.Random(102926)
for _ in range(380):
    t = launch_rng.uniform(.001, .4)
    x, y, dx, dy = curve(t, bridge_points)
    offset = launch_rng.gauss(0, .35+7*t/.4)
    norm = math.hypot(dx, dy)
    x, y = x-dy/norm*offset, y+dx/norm*offset
    progress = (x-start[0])/(end[0]-start[0])
    radius = launch_rng.uniform(.8, 2.5)
    bridge.append((grain_path(x, y, radius, launch_rng), progress,
                   launch_rng.uniform(.6, .95)))
# The last grains merge into a narrow, tapering trajectory ending at the A.
tail_edges = [[], []]
for i in range(65):
    t = .57 + .43*i/64
    x, y, dx, dy = curve(t, bridge_points)
    norm = math.hypot(dx, dy)
    half_width = 5.8*((1-t)/.43)**1.05
    tail_edges[0].append((x-dy/norm*half_width, y+dx/norm*half_width))
    tail_edges[1].append((x+dy/norm*half_width, y-dx/norm*half_width))
tail_points = tail_edges[0] + list(reversed(tail_edges[1]))
tail = 'M' + 'L'.join(f'{x:.2f},{y:.2f}' for x,y in tail_points) + 'Z'
letter_defs, letter_grains, letter_grain_count = swarm_letters()
wind = incoming_sand()
for theme, ink, origin in [('light', '#111315', (20, 23, 27)), ('dark', '#f2f2ef', (226, 228, 231))]:
    particles = []
    stops = [(0, origin), (.12, (182, 47, 41) if theme == 'light' else (235, 154, 147)),
             (.3, (235, 50, 41)), (.65, (235, 36, 28)), (1, (229, 43, 36))]
    for d, t, opacity in bridge:
        rgb = gradient(t, stops)
        particles.append(f'<path d="{d}" fill="rgb({rgb[0]},{rgb[1]},{rgb[2]})" opacity="{opacity:.2f}"/>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="2272" height="480" viewBox="-100 180 2272 480" role="img" aria-labelledby="title">
<title id="title">SWARMHARM</title>
<defs>{letter_defs}</defs>
<g aria-label="Sand-grain crescent"><path d="{tail}" fill="#e52b24"/>{''.join(particles)}</g>
<g fill="{ink}" aria-label="Incoming sand">{wind}</g>
<g fill="{ink}" aria-label="SWARM formed from sand">{letter_grains}</g>
<g aria-label="HARM">{''.join(paths[5:])}</g>
</svg>
'''
    suffix = '-dark' if theme == 'dark' else ''
    (root/f'static/images/swarmharm-wordmark{suffix}.svg').write_text(svg, encoding='utf-8', newline='\n')

symbol = grains(((4, 47), (11, 13), (45, 20), (60, 45)), 5, 1.3, 380, .01, 8126,
                levels=[(1.3, 70), (.75, 120), (.3, 190)])
mark = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>SwarmHarm</title>'
mark += ''.join(f'<path d="{d}" fill="#d92b24" opacity="{opacity:.2f}"/>' for d, _, opacity in symbol)
mark += '</svg>\n'
(root/'static/images/swarmharm-mark.svg').write_text(mark, encoding='utf-8')
print(json.dumps({'wordmark': word, 'glyphs': len(paths), 'crescent_grains': len(bridge), 'letter_grains_before_clipping': letter_grain_count, 'incoming_grains': 270, 'favicon_grains': len(symbol), 'themes': ['light', 'dark']}))
