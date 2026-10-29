"""Build Michroma wordmarks with a sand blade and a compact crescent icon."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import json
import math
import random
from bisect import bisect_left

root = Path(__file__).resolve().parents[1]
font = TTFont(root / 'static/fonts/Michroma-Regular.ttf')
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
word, tracking = 'SWARMHARM', 80
weight = 140  # Strengthen the existing glyphs while keeping their counters open.
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


def grains(points, width, radius, count, gap, seed, levels=None, free_left=False, min_y=None):
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
            envelope = max(taper, .38*(1-progress)**2) if free_left else taper
            if free_left:
                spread = max(-1.25, min(1.25, spread))
            offset = spread * width * envelope**.85 * (1-progress)**1.65 * 1.8
            norm = math.hypot(dx, dy)
            x, y = x - dy/norm*offset, y + dx/norm*offset
            floor = 1.15*(1-progress)+.22*progress if free_left else fine_radius
            r = ((floor + (size-floor)*core) if levels else size*(.1+.9*taper**.65)) * rng.uniform(.65, 1)
            if min_y is not None and y-r < min_y:
                continue
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


def edge_table(points):
    samples = [curve(i/600, points) for i in range(601)]
    return [p[0] for p in samples], [p[1] for p in samples]


def edge_y(x, table):
    xs, ys = table
    i = max(1, min(len(xs)-1, bisect_left(xs, x)))
    mix = (x-xs[i-1])/(xs[i]-xs[i-1])
    return ys[i-1]+mix*(ys[i]-ys[i-1])


def blade_grains(upper, lower, origin_x):
    """Fill the blade's area, so its point is a wedge rather than a thin arc."""
    rng = random.Random(291026)
    top, bottom = edge_table(upper), edge_table(lower)
    result, cells = [], {}
    start_x, end_x = upper[0][0], upper[-1][0]
    for size, quantity in [(14, 470), (5.3, 1100), (1.7, 1800)]:
        target = len(result)+quantity
        for _ in range(quantity*60):
            if len(result) >= target:
                break
            u = rng.betavariate(2.3, 2.7) if size == 14 else rng.uniform(.001, .998)
            x = start_x+(end_x-start_x)*u
            y0, y1 = edge_y(x, top), edge_y(x, bottom)
            progress = (x-origin_x)/(end_x-origin_x)
            ramp = progress/.44 if progress < .44 else (1-progress)/.56
            core = math.sin(math.pi*.5*ramp)**1.65
            radius = (.35+(size-.35)*core)*rng.uniform(.62, 1)
            radius = min(radius, max(.12, (y1-y0)*.4))
            y = rng.uniform(y0-10*core, y1)
            cell = int(x/42), int(y/42)
            nearby = [p for dx in range(-1, 2) for dy in range(-1, 2)
                      for p in cells.get((cell[0]+dx, cell[1]+dy), [])]
            if any(math.hypot(x-px, y-py) < .42*(radius+pr)+.03
                   for px, py, pr in nearby):
                continue
            cells.setdefault(cell, []).append((x, y, radius))
            entrance = min(1, (x-start_x)/190)**.7
            result.append((grain_path(x, y, radius, rng), progress,
                           entrance*rng.uniform(.8, 1)))
    # Keep the taper visibly red as its grains become finer. The small grains
    # overlap like sand, with no painted ribbon underneath them.
    x = origin_x+(end_x-origin_x)*.42
    while x < end_x-23:
        progress = (x-origin_x)/(end_x-origin_x)
        blend = min(1, (progress-.42)/.24)
        blend = blend*blend*(3-2*blend)
        radius = max(.65, 4.4*((1-progress)/.46)**.7)
        step = radius*1.25
        y0, y1 = edge_y(x, top), edge_y(x, bottom)
        y = y0+rng.uniform(0, step)
        while y < y1:
            px, py = x+rng.uniform(-step*.4, step*.4), y+rng.uniform(-step*.3, step*.3)
            r = radius*rng.uniform(.7, 1.08)
            result.append((grain_path(px, py, r, rng), progress, blend*rng.uniform(.82, 1)))
            y += step
        x += step
    return result


def blade_contour(upper, lower):
    # Leave the spine granular while giving the lower cutting edge a clean taper.
    upper = tuple((x, y-offset) for (x, y), offset in zip(upper, (18, 25, 25, 0)))
    def point(p):
        return f'{p[0]:.2f},{p[1]:.2f}'
    return (f'M{point(upper[0])}C{point(upper[1])} {point(upper[2])} {point(upper[3])}'
            f'C{point(lower[2])} {point(lower[1])} {point(lower[0])}Z')


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


start = (-40, 340)
end = (red_peak, baseline - 1536*scale)
upper_edge = ((260, 285), (610, 180), (1140, 220), end)
lower_edge = ((260, 340), (760, 310), (1160, 340), end)
bridge = blade_grains(upper_edge, lower_edge, start[0])
drift_points = (start, (140, 305), (360, 240), (570, 275))
drift = grains(drift_points, 70, 5.5, 950, .04, 291027,
               levels=[(5.5, 250), (1.8, 700)], free_left=True, min_y=195)
drift_scale = (drift_points[-1][0]-start[0])/(end[0]-start[0])
drift = [(d, p*drift_scale, alpha*max(0, 1-(p*drift_scale/.44)**3))
         for d, p, alpha in drift]
# A short, crisp tip finishes the grain-filled wedge at A.
tip_x = end[0]-27
tail = (f'M{tip_x:.2f},{edge_y(tip_x, edge_table(upper_edge)):.2f}'
        f'L{end[0]:.2f},{end[1]:.2f}'
        f'L{tip_x:.2f},{edge_y(tip_x, edge_table(lower_edge)):.2f}Z')
letter_defs, letter_grains, letter_grain_count = swarm_letters()
wind = incoming_sand()
blade_shape = blade_contour(upper_edge, lower_edge)
for theme, ink in [('light', '#111315'), ('dark', '#f2f2ef')]:
    particles, drifting = [], []
    stops = [(0, (239, 96, 88)), (.35, (220, 33, 27)),
             (.7, (220, 28, 23)), (1, (229, 43, 36))]
    for d, t, opacity in bridge:
        rgb = gradient(t, stops)
        particles.append(f'<path d="{d}" fill="rgb({rgb[0]},{rgb[1]},{rgb[2]})" opacity="{opacity:.2f}"/>')
    for d, t, opacity in drift:
        rgb = gradient(t, stops)
        drifting.append(f'<path d="{d}" fill="rgb({rgb[0]},{rgb[1]},{rgb[2]})" opacity="{opacity:.2f}"/>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="2272" height="480" viewBox="-100 180 2272 480" role="img" aria-labelledby="title">
<title id="title">SWARMHARM</title>
<defs>{letter_defs}<clipPath id="sand-blade"><path d="{blade_shape}"/></clipPath></defs>
<g aria-label="Sand-grain crescent">{''.join(drifting)}<g clip-path="url(#sand-blade)">{''.join(particles)}</g><path d="{tail}" fill="#e52b24"/></g>
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
