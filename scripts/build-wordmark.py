"""Build the native SwarmHarm SVG using Michroma and distinct swarm nodes.

The supplied logo and imagegen studies established the visual direction. The
final asset uses complete font outlines and separated SVG circles. Requires
fontTools; raster exports can be made with CairoSVG without changing the design.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
import json
import math
import random

root = Path(__file__).resolve().parents[1]
font = TTFont(root / 'static/fonts/Michroma-Regular.ttf')
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
word = 'SWARMHARM'
tracking = 80
advances = [glyphs[cmap[ord(c)]].width for c in word]
scale = 1972 / (sum(advances) + tracking * (len(word) - 1))
left, baseline = 100, 604
cursor = 0
paths = []
red_peak = None
for i, char in enumerate(word):
    pen = SVGPathPen(glyphs)
    glyphs[cmap[ord(char)]].draw(pen)
    x = left + cursor * scale
    fill = '#dc2c25' if i == 6 else '#111315'
    paths.append(f'<path data-letter="{char}" data-index="{i}" fill="{fill}" transform="translate({x:.5f} {baseline}) scale({scale:.8f} {-scale:.8f})" d="{pen.getCommands()}"/>')
    if i == 6:
        red_peak = x + 1088 * scale
    cursor += advances[i] + tracking

# A low, slightly asymmetric curve. The path is implicit: only separate nodes
# are drawn, with no line, glow or filled ribbon behind them.
start = (left + 1250 * scale, baseline - 1540 * scale)
end = (red_peak, baseline - 1536 * scale)
p0, p1, p2, p3 = start, (540, 155), (1110, 180), end

def curve(t):
    u = 1 - t
    x = u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0]
    y = u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]
    dx = 3*u*u*(p1[0]-p0[0]) + 6*u*t*(p2[0]-p1[0]) + 3*t*t*(p3[0]-p2[0])
    dy = 3*u*u*(p1[1]-p0[1]) + 6*u*t*(p2[1]-p1[1]) + 3*t*t*(p3[1]-p2[1])
    return x, y, dx, dy

rng = random.Random(281026)
nodes = [(start[0], start[1], 2.2, 0), (end[0], end[1], 2.2, 1)]
for attempt in range(24000):
    if len(nodes) >= 285:
        break
    t = rng.uniform(.012, .988)
    x, y, dx, dy = curve(t)
    half_width = 3 + 42 * math.sin(math.pi*t)**1.65
    offset = rng.uniform(-half_width, half_width)
    norm = math.hypot(dx, dy)
    x, y = x - dy/norm*offset, y + dx/norm*offset
    radius = 2.4 + 4.5*math.sin(math.pi*t)**.7 + rng.uniform(-.35,.35)
    if all(math.hypot(x-nx,y-ny) >= radius+nr+5 for nx,ny,nr,_ in nodes):
        nodes.append((x,y,radius,t))
circles = []
for x,y,r,t in sorted(nodes,key=lambda node:node[3]):
    mix = min(1,t/.74)**.85
    rgb = [round(a+(b-a)*mix) for a,b in zip((20,23,27),(220,44,37))]
    circles.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="{r:.3f}" fill="rgb({rgb[0]},{rgb[1]},{rgb[2]})"/>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="2172" height="520" viewBox="0 140 2172 520" role="img" aria-labelledby="title desc">
<title id="title">SWARMHARM</title>
<desc id="desc">Complete Michroma letterforms under a low arc of distinct swarm members, rising only from S.</desc>
<g aria-label="Individual swarm members">{''.join(circles)}</g>
<g aria-label="SWARMHARM">{''.join(paths)}</g>
</svg>
'''
(root/'static/images/swarmharm-wordmark.svg').write_text(svg, encoding='utf-8', newline='\n')
print(json.dumps({'font':font['name'].getDebugName(1),'wordmark':word,'glyphs':len(paths),'R_indices':[i for i,c in enumerate(word) if c=='R'],'distinct_swarm_nodes':len(nodes),'minimum_node_gap':5,'arc_start':start,'arc_end':end}))
