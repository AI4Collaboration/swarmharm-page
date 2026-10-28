"""Build native SwarmHarm wordmarks and the compact swarm symbol.

The supplied logo and imagegen studies established the visual direction. The
Each swarm member has a body, sensory eyes and articulated antennae.
Requires fontTools; both theme variants share exactly the same geometry.
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
    fill = '#dc2c25' if i == 6 else 'var(--ink)'
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
nodes = []
for attempt in range(24000):
    if len(nodes) >= 72:
        break
    t = rng.uniform(.012, .988)
    x, y, dx, dy = curve(t)
    half_width = 3 + 40 * math.sin(math.pi*t)**1.65
    offset = rng.uniform(-half_width, half_width)
    norm = math.hypot(dx, dy)
    x, y = x - dy/norm*offset, y + dx/norm*offset
    radius = 5.5 + 9*math.sin(math.pi*t)**.7 + rng.uniform(-.8,.8)
    if all(math.hypot(x-nx,y-ny) >= radius+nr+7 for nx,ny,nr,_ in nodes):
        nodes.append((x,y,radius,t))

creature = '''<g id="member" fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
<path d="M2-3 7-7 10-7M2 3 7 7 10 7M-3-3-6-6-9-5M-3 3-6 6-9 5" fill="none" stroke-width="1.15"/>
<ellipse cx="-3" rx="5.5" ry="3.8" stroke="none"/>
<rect x="0" y="-4" width="7.5" height="8" rx="3.3" stroke="none"/>
<path d="M-5-1.6-2-2.3" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".85"/>
<circle cx="4.8" cy="-1.55" r=".95" fill="#fff" stroke="none"/><circle cx="4.8" cy="1.55" r=".95" fill="#fff" stroke="none"/>
</g>'''

for theme, ink, origin in [('light','#111315',(20,23,27)),('dark','#f2f2ef',(226,228,231))]:
    members = []
    for x,y,r,t in sorted(nodes,key=lambda node:node[3]):
        _,_,dx,dy = curve(t)
        angle = math.degrees(math.atan2(dy,dx))
        mix = min(1,t/.74)**.85
        rgb = [round(a+(b-a)*mix) for a,b in zip(origin,(220,44,37))]
        members.append(f'<use href="#member" transform="translate({x:.3f} {y:.3f}) rotate({angle:.2f}) scale({r/9:.3f})" color="rgb({rgb[0]},{rgb[1]},{rgb[2]})"/>')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="2172" height="520" viewBox="0 140 2172 520" role="img" aria-labelledby="title desc" style="--ink:{ink}">
<title id="title">SWARMHARM</title>
<desc id="desc">Individual sensing creatures form a low swarm arc above the complete Michroma letterforms.</desc>
<defs>{creature}</defs>
<g aria-label="Individual swarm members">{''.join(members)}</g>
<g aria-label="SWARMHARM">{''.join(paths)}</g>
</svg>
'''
    suffix = '-dark' if theme == 'dark' else ''
    (root/f'static/images/swarmharm-wordmark{suffix}.svg').write_text(svg, encoding='utf-8', newline='\n')

mark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><title>SwarmHarm</title><defs>{creature}</defs><g color="#d92b24"><use href="#member" transform="translate(23 37) rotate(-32) scale(1.65)"/><use href="#member" transform="translate(44 18) rotate(-32) scale(1.15)"/><use href="#member" transform="translate(48 49) rotate(-32) scale(.9)"/></g></svg>'''
(root/'static/images/swarmharm-mark.svg').write_text(mark+'\n', encoding='utf-8')
print(json.dumps({'wordmark':word,'glyphs':len(paths),'distinct_swarm_members':len(nodes),'themes':['light','dark']}))
