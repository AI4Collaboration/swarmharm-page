(() => {
  // Field-guide figures: hand-drawn robots, life-cycle tags and arrows, and the sample-case lens.
  // Wording lives in index.html; this file only draws and positions.
  const NS = 'http://www.w3.org/2000/svg';
  const C = { ink: '#2b241b', ochre: '#e9a35a', ochreHatch: '#b8692a', sage: '#9db08c', sageHatch: '#6f8a5f', eye: '#fffaf0', tag: '#f3e6c4', tagHatch: '#e2cf9f', harm: '#a8432f', harmHatch: '#7a2a1d' };
  let pupils = [];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const svgEl = (tag, attrs, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.append(node);
    return node;
  };
  const rrect = (x, y, w, h, r) => `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
  const circle = (cx, cy, r) => `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 Z`;

  // Ink pen: a watercolour wash under rough hatching and outline; plain SVG when rough.js is unavailable.
  function pen(svg) {
    const rc = window.rough ? window.rough.svg(svg) : null;
    let seed = 11;
    return (d, o = {}) => {
      const into = o.into || svg;
      const fill = o.fill && o.fill !== 'none' ? o.fill : null;
      if (fill && o.wash !== false) svgEl('path', { d, fill, opacity: o.washOpacity ?? 0.82, transform: 'translate(1.5 1.1)' }, into);
      if (!rc) {
        const node = svgEl('path', { d, fill: 'none', stroke: o.stroke || C.ink, 'stroke-width': o.sw ?? 1.7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, into);
        if (o.dash) node.setAttribute('stroke-dasharray', o.dash.join(' '));
        return node;
      }
      const node = rc.path(d, {
        stroke: o.stroke || C.ink, strokeWidth: o.sw ?? 1.7, roughness: o.rough ?? 1.05, bowing: 0.9, seed: seed++,
        fill: fill && o.hatch !== false ? o.hatchColor : undefined, fillStyle: 'hachure', hachureGap: o.gap ?? 4.2,
        hachureAngle: -41, fillWeight: 0.7, strokeLineDash: o.dash,
      });
      into.append(node);
      return node;
    };
  }

  // A box-headed robot, always ochre so no single agent stands out. Pupils follow the pointer unless the
  // caller steers them (track = false).
  function robot(draw, svg, x, y, s, into = svg, track = true) {
    const g = svgEl('g', {}, into);
    const body = { fill: C.ochre, hatchColor: C.ochreHatch, into: g };
    draw(rrect(x - s * 0.6, y - s * 0.14, s * 0.12, s * 0.3, s * 0.04), body);
    draw(rrect(x + s * 0.48, y - s * 0.14, s * 0.12, s * 0.3, s * 0.04), body);
    draw(rrect(x - s * 0.12, y - s * 0.47, s * 0.24, s * 0.12, s * 0.04), body);
    draw(rrect(x - s / 2, y - s * 0.37, s, s * 0.72, s * 0.17), body);
    const eyes = [];
    for (const dx of [-0.2, 0.2]) {
      draw(circle(x + dx * s, y, s * 0.115), { fill: C.eye, hatch: false, washOpacity: 1, into: g });
      const p = svgEl('circle', { cx: x + dx * s, cy: y, r: s * 0.052, fill: C.ink }, g);
      eyes.push(p);
      if (track) pupils.push({ el: p, svg, cx: x + dx * s, cy: y, reach: s * 0.05 });
    }
    return { g, eyes };
  }

  function drawBrands() {
    document.querySelectorAll('svg.brand-bot').forEach(svg => {
      svg.replaceChildren();
      robot(pen(svg), svg, 0, 2, 36);
    });
  }

  // Life cycle: a tag behind each label, an arrow between plates, a hand-drawn rule under each phase name.
  function drawTag(svg) {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const w = r.width, h = r.height;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const draw = pen(svg);
    draw(`M16,0 H${w} V${h} H16 L0,${h * 0.62} V${h * 0.38} Z`, { fill: C.tag, hatchColor: C.tagHatch, gap: 7, washOpacity: 1, rough: 0.8 });
    draw(`M22,4 H${w - 4} V${h - 4} H22 L6,${h * 0.6} V${h * 0.4} Z`, { sw: 0.5, rough: 0.6 });
    draw(circle(22, h / 2, 4.5), { sw: 0.8 });
    draw(`M22,${h / 2} C6,${h / 2 + 3} -10,${h / 2 + 18} -5,${h / 2 + 30}`, { sw: 0.6 });
  }
  function drawArrow(svg) {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const w = r.width, h = r.height;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const draw = pen(svg);
    if (w >= h) {
      const y = h / 2;
      draw(`M4,${y + 4} C${w * 0.35},${y - 10} ${w * 0.65},${y - 10} ${w - 8},${y}`, { sw: 1.3 });
      draw(`M${w - 18},${y - 7} L${w - 6},${y} L${w - 17},${y + 8}`, { sw: 1.3 });
    } else {
      const x = w / 2;
      draw(`M${x + 4},4 C${x - 10},${h * 0.35} ${x - 10},${h * 0.65} ${x},${h - 8}`, { sw: 1.3 });
      draw(`M${x - 7},${h - 18} L${x},${h - 6} L${x + 8},${h - 17}`, { sw: 1.3 });
    }
  }
  function drawRule(svg, color) {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${r.width} 12`);
    const draw = pen(svg);
    draw(`M2,4 V9 H${r.width - 2} V4`, { sw: 1, stroke: color });
  }
  function drawLifeCycle() {
    document.querySelectorAll('.life-tag svg').forEach(drawTag);
    document.querySelectorAll('.life-arrow svg').forEach(drawArrow);
    document.querySelectorAll('.life-phase svg').forEach(svg => drawRule(svg, svg.closest('.p2') ? C.harm : C.ink));
  }

  // Lens: the same scene drawn twice. Outside the lens each agent stands alone in its jar; under it,
  // each agent shows its message, the agent it read and its share of the shared pool.
  const RUN = { units: { A: 2, B: 3, C: 3, D: 3 }, capacity: 4, total: 11 };
  // Who each agent attends to in the transcript: A reads B's request, B reads A's reply, D reads A's shared update.
  const GAZE = { A: 'B', B: 'A', C: 'pool', D: 'A' };
  const LAYOUTS = {
    wide: {
      vw: 1000, vh: 610, size: 70, hint: [0.55, -0.85], strings: true,
      robots: { A: [125, 340], B: [375, 340], C: [625, 340], D: [875, 340] },
      pool: { x: 80, y: 516, w: 840, h: 30 },
      bubbles: { A: { x: 12, bottom: 240, w: 236 }, B: { x: 262, bottom: 240, w: 226 }, D: { x: 694, bottom: 240, w: 296 } },
      points: { title: [500, 16], 'pool-cap': [null, 560], 'pool-total': [652, 556], 'link-request': [250, 294], 'link-reply': [250, 388], 'link-update': [500, 261] },
      links: [
        { pts: [[333, 326], [292, 288], [208, 288], [167, 326]] },
        { pts: [[167, 354], [208, 392], [292, 392], [333, 354]] },
        { pts: [[150, 306], [330, 246], [670, 246], [850, 306]] },
      ],
    },
    tall: {
      vw: 600, vh: 1520, size: 62, hint: [0.8, -0.55], strings: false,
      robots: { A: [140, 280], B: [140, 540], C: [140, 780], D: [140, 1030] },
      pool: { x: 40, y: 1420, w: 520, h: 28 },
      bubbles: { A: { x: 230, cy: 280, w: 360, beside: true }, B: { x: 230, cy: 540, w: 360, beside: true }, D: { x: 230, bottom: 1095, w: 360, beside: true } },
      points: { title: [300, 16], 'pool-cap': [300, 1465], 'pool-total': [300, 1282], 'action-D': [300, 1185] },
      links: [
        { pts: [[100, 525], [58, 460], [58, 350], [100, 285]], both: true },
        { pts: [[92, 265], [26, 440], [26, 870], [92, 1015]] },
      ],
    },
  };
  // The wide scene needs this much figure width before the bubbles above the robots stay clear of the title.
  const WIDE_MIN = 860;
  const TOUR_MOVE = 620, TOUR_DWELL = 380;
  const lens = { fx: 0, fy: 0, moved: false, tour: 0, L: null };
  const pt = ([x, y]) => `${x},${y}`;
  const bubbleCenter = b => [b.x + b.w / 2, b.cy ?? b.bottom - 50];

  function arrowHead(draw, [x, y], [fx, fy], h) {
    const a = Math.atan2(y - fy, x - fx);
    draw(`M${x - h * Math.cos(a - 0.45)},${y - h * Math.sin(a - 0.45)} L${x},${y} L${x - h * Math.cos(a + 0.45)},${y - h * Math.sin(a + 0.45)}`, { sw: 1.1 });
  }

  function drawLensLayer(layer, L, beneath) {
    const svg = layer.querySelector('svg.lens-art');
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${L.vw} ${L.vh}`);
    const draw = pen(svg);
    const s = L.size, unit = L.pool.w / RUN.total, capW = unit * RUN.capacity;
    const place = (el, [x, y]) => { el.style.left = `${(x / L.vw) * 100}%`; el.style.top = `${(y / L.vh) * 100}%`; };
    const shares = {};
    let next = 0;
    for (const [id, units] of Object.entries(RUN.units)) {
      shares[id] = { start: next, units, x: L.pool.x + (next + units / 2) * unit };
      next += units;
    }

    for (const [id, [x, y]] of Object.entries(L.robots)) {
      const chip = layer.querySelector(`[data-at="agent-${id}"]`);
      if (!beneath) {
        const w = s * 2.1, top = y - s * 1.25, base = y + s * 1.35;
        draw(`M${x - w / 2},${base} V${top + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${top + w / 2} V${base}`, { sw: 0.7 });
        draw(rrect(x - w / 2 - 8, base, w + 16, 10, 3), { fill: C.sage, hatchColor: C.sageHatch, gap: 5 });
        robot(draw, svg, x, y, s);
        // A closed "…" bubble marks each agent whose message the lens reveals.
        if (L.bubbles[id]) {
          const hx = x + L.hint[0] * s, hy = y + L.hint[1] * s, hw = s * 0.66, hh = s * 0.36;
          draw(rrect(hx - hw / 2, hy - hh / 2, hw, hh, hh * 0.45), { fill: C.eye, hatch: false, washOpacity: 1, sw: 1.1 });
          for (const k of [-1, 0, 1]) svgEl('circle', { cx: hx + k * hw * 0.24, cy: hy, r: s * 0.035, fill: C.ink }, svg);
        }
        if (chip) place(chip, [x, y + s * 0.6]);
        continue;
      }
      const { eyes } = robot(draw, svg, x, y, s, svg, false);
      const [tx, ty] = GAZE[id] === 'pool' ? [shares[id].x, L.pool.y] : L.robots[GAZE[id]];
      for (const eye of eyes) {
        const ex = Number(eye.getAttribute('cx')), d = Math.hypot(tx - ex, ty - y) || 1;
        eye.setAttribute('transform', `translate(${((tx - ex) / d) * s * 0.05} ${((ty - y) / d) * s * 0.05})`);
      }
      if (chip) place(chip, L.points[`action-${id}`] || [x, y + s * 0.6]);
    }

    for (const [key, [x, y]] of Object.entries(L.points)) {
      const el = layer.querySelector(`[data-at="${key}"]`);
      if (el) place(el, [x ?? L.pool.x + capW / 2, y]);
    }
    layer.querySelectorAll('[data-at^="link-"]').forEach(el => { el.hidden = !L.points[el.dataset.at]; });
    for (const [id, b] of Object.entries(L.bubbles)) {
      const el = layer.querySelector(`[data-at="bubble-${id}"]`);
      if (!el) continue;
      const [rx, ry] = L.robots[id];
      el.classList.toggle('is-beside', Boolean(b.beside));
      el.classList.toggle('is-centered', b.cy != null);
      el.style.left = `${(b.x / L.vw) * 100}%`;
      el.style.width = `${(b.w / L.vw) * 100}%`;
      el.style.top = b.cy != null ? `${(b.cy / L.vh) * 100}%` : '';
      el.style.bottom = b.cy != null ? '' : `${((L.vh - b.bottom) / L.vh) * 100}%`;
      el.style.setProperty('--tail', `${((rx - b.x) / b.w) * 100}%`);
      if (b.bottom != null) el.style.setProperty('--tail-y', `${((b.bottom - ry) / L.vw) * 100}cqw`);
    }

    if (!beneath) {
      draw(rrect(L.pool.x, L.pool.y, capW, L.pool.h, 4), { fill: C.sage, hatchColor: C.sageHatch, gap: 7 });
      draw(rrect(L.pool.x, L.pool.y, L.pool.w, L.pool.h, 4), { sw: 0.6, dash: [4, 6] });
      return;
    }
    // Each share is cut at the capacity line: the part that fits is ochre, the overflow is brick.
    const cap = RUN.capacity;
    for (const [id, { start, units, x }] of Object.entries(shares)) {
      const end = start + units;
      const parts = end <= cap ? [[start, end, false]] : start >= cap ? [[start, end, true]] : [[start, cap, false], [cap, end, true]];
      parts.forEach(([from, to, over], i) => {
        const gap = i === parts.length - 1 ? 3 : 0;
        draw(rrect(L.pool.x + from * unit, L.pool.y, (to - from) * unit - gap, L.pool.h, 4), { fill: over ? C.harm : C.ochre, hatchColor: over ? C.harmHatch : C.ochreHatch, gap: 5 });
      });
      const label = svgEl('text', { x, y: L.pool.y + L.pool.h * 0.7, 'text-anchor': 'middle', 'font-size': L.pool.h * 0.62, class: 'lens-share', fill: start + units / 2 > cap ? C.eye : C.ink }, svg);
      label.textContent = id;
      if (L.strings) {
        const [rx, ry] = L.robots[id];
        draw(`M${rx},${ry + s * 1.05} C${rx},${L.pool.y - 50} ${x},${L.pool.y - 70} ${x},${L.pool.y - 4}`, { sw: 0.6, dash: [3, 5] });
      }
    }
    draw(`M${L.pool.x + capW},${L.pool.y - 14} V${L.pool.y + L.pool.h + 14}`, { sw: 1.4 });
    // Message links between heads: B's request, A's reply and A's shared update that D read.
    for (const { pts: [p0, p1, p2, p3], both } of L.links) {
      draw(`M${pt(p0)} C${pt(p1)} ${pt(p2)} ${pt(p3)}`, { sw: 1.1, dash: [6, 5] });
      arrowHead(draw, p3, p2, s * 0.16);
      if (both) arrowHead(draw, p0, p1, s * 0.16);
    }
  }
  function placeLens(stage) {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    const radius = Math.max(64, Math.min(150, r.width * 0.22));
    stage.style.setProperty('--lx', `${lens.fx * r.width}px`);
    stage.style.setProperty('--ly', `${lens.fy * r.height}px`);
    stage.style.setProperty('--lr', `${radius}px`);
    stage.querySelector('.lens-tag')?.classList.toggle('is-below', lens.fy * r.height - radius < 40);
  }
  function drawLens() {
    const stage = document.querySelector('[data-lens-stage]');
    if (!stage) return;
    const L = stage.parentElement.getBoundingClientRect().width >= WIDE_MIN ? LAYOUTS.wide : LAYOUTS.tall;
    lens.L = L;
    stage.classList.toggle('is-tall', L === LAYOUTS.tall);
    stage.style.setProperty('--aspect', `${L.vw} / ${L.vh}`);
    if (!lens.moved) {
      const [bx, by] = bubbleCenter(L.bubbles.B), [rx, ry] = L.robots.B;
      lens.fx = (bx + rx) / 2 / L.vw;
      lens.fy = (by + ry) / 2 / L.vh;
    }
    drawLensLayer(stage.querySelector('.lens-surface'), L, false);
    drawLensLayer(stage.querySelector('.lens-beneath'), L, true);
    placeLens(stage);
  }

  // Tour: the lens visits the title, each message and face, then the pool, once, before anyone moves it.
  function tourPoints(L) {
    const pts = [[L.points.title[0], L.points.title[1] + 30]];
    for (const id of Object.keys(L.robots)) {
      if (L.bubbles[id]) pts.push(bubbleCenter(L.bubbles[id]));
      pts.push(L.robots[id]);
    }
    const [tx, ty] = L.points['pool-total'];
    pts.push([tx, ty + 10]);
    return pts.map(([x, y]) => [x / L.vw, y / L.vh]);
  }
  function stopTour() {
    cancelAnimationFrame(lens.tour);
    lens.tour = 0;
  }
  function playTour(stage) {
    const pts = tourPoints(lens.L);
    let i = 0, from = [lens.fx, lens.fy], t0 = performance.now();
    const step = now => {
      const to = pts[i], k = Math.min(1, (now - t0) / TOUR_MOVE), e = k < 0.5 ? 2 * k * k : 1 - ((2 - 2 * k) ** 2) / 2;
      lens.fx = from[0] + (to[0] - from[0]) * e;
      lens.fy = from[1] + (to[1] - from[1]) * e;
      placeLens(stage);
      if (now - t0 >= TOUR_MOVE + TOUR_DWELL) {
        from = to; i += 1; t0 = now;
        if (i === pts.length) { lens.tour = 0; return; }
      }
      lens.tour = requestAnimationFrame(step);
    };
    lens.tour = requestAnimationFrame(step);
  }

  function wireLens() {
    const stage = document.querySelector('[data-lens-stage]');
    if (!stage) return;
    const setLens = (fx, fy) => {
      stopTour();
      lens.moved = true;
      lens.fx = Math.min(1, Math.max(0, fx));
      lens.fy = Math.min(1, Math.max(0, fy));
      placeLens(stage);
    };
    const move = event => {
      const r = stage.getBoundingClientRect();
      setLens((event.clientX - r.left) / r.width, (event.clientY - r.top) / r.height);
    };
    // touch-action: pan-y keeps vertical swipes scrolling the page; a tap places the lens.
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerdown', move);
    stage.addEventListener('keydown', event => {
      const step = event.shiftKey ? 0.1 : 0.03;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!d) return;
      event.preventDefault();
      setLens(lens.fx + d[0], lens.fy + d[1]);
    });
    if (reduceMotion.matches) return;
    const seen = new IntersectionObserver(entries => {
      const entry = entries[0];
      const mostlyVisible = entry.intersectionRatio >= 0.6 || entry.intersectionRect.height >= innerHeight * 0.6;
      if (!entry.isIntersecting || !mostlyVisible) return;
      seen.disconnect();
      if (lens.moved || !lens.L) return;
      lens.moved = true;
      playTour(stage);
    }, { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] });
    seen.observe(stage);
  }

  // Whisper field: one robot per glass sandbox on a ground with depth; each robot walks around its own box.
  // The walls stay up. A crack runs across the shared sand floor and joins the boxes, and whispers travel
  // along it from one robot to another. A listener keeps a brick tint for a while and is more likely to pass
  // the next whisper on.
  const field = { robots: [], order: [], lines: [], lineIndex: 0, nextAt: 0, active: null, last: 0, frame: 0, visible: true, cracked: false, crackAt: 0, crackFront: null };
  const DEPTH = 260;          // ground depth from back to front, in the same px as x
  const ROBOT_TOP = 1.92;     // head top above the feet, in robot sizes
  const CRACK_MS = 2400;      // time for the crack to run from the first box to the last
  const PULSE_SPEED = 700;    // px per second for a whisper travelling along the crack

  // z = 0 at the back of the ground, 1 at the front: far things sit higher, smaller and closer to the centre.
  function project(x, z) {
    return [field.w / 2 + (x - field.w / 2) * (0.84 + 0.16 * z), field.yBack + (field.yFront - field.yBack) * z, 0.62 + 0.38 * z];
  }
  const groundPoint = (x, z, lift = 0) => {
    const [sx, sy, k] = project(x, z);
    return [sx, sy - lift * k];
  };
  const quad = points => `M${points.map(pt).join(' L')} Z`;

  // Depth of the crack at x; the crack is a jagged line across the floor, one point every few px.
  function crackDepth(x) {
    const pts = field.crack;
    const after = pts.findIndex(p => p[0] > x);
    const i = Math.min(pts.length - 2, Math.max(0, (after === -1 ? pts.length : after) - 1));
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    return z0 + ((z1 - z0) * (x - x0)) / (x1 - x0);
  }

  function buildField() {
    const host = document.querySelector('[data-whisper-field]');
    if (!host) return;
    const svg = host.querySelector('svg');
    const r = host.getBoundingClientRect();
    if (!r.width) return;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    field.lines = [...host.querySelectorAll('[data-whisper-lines] li')].map(li => li.textContent.trim());
    field.bubble = host.querySelector('.whisper-bubble');
    field.bubble.hidden = true;
    field.host = host;
    field.svg = svg;
    field.w = r.width;
    field.yBack = r.height * 0.36;
    field.yFront = r.height - (r.width < 640 ? 54 : 30);
    const count = r.width < 640 ? 4 : r.width < 1100 ? 6 : 8;
    const s = r.width < 640 ? 36 : r.width < 1100 ? 44 : 48;
    field.s = s;
    // Walls reach a robot's neck: the body is boxed in, the head stays visible.
    const tray = { x0: field.w * 0.05, x1: field.w * 0.95, z0: 0.08, z1: 0.92, h: s * 1.25 };
    tray.cell = (tray.x1 - tray.x0) / count;
    field.tray = tray;
    const draw = pen(svg);

    // Ground: back edge, wavy front edge and tufts beside the sandboxes.
    const ground = svgEl('g', {}, svg);
    draw(`M${pt(groundPoint(0, 0))} L${pt(groundPoint(field.w, 0))}`, { sw: 0.5, rough: 0.6, into: ground });
    const front = field.yFront + 2;
    draw(`M0,${front} C${field.w * 0.3},${front - 5} ${field.w * 0.7},${front + 4} ${field.w},${front - 1}`, { sw: 1, into: ground });
    for (let i = 0; i < 24; i++) {
      const x = (((i * 97) % 100) / 100) * field.w, z = ((i * 61) % 100) / 100;
      if (x > tray.x0 - 12 && x < tray.x1 + 12) continue;
      const [sx, sy, k] = project(x, z);
      draw(`M${sx},${sy} l${-4 * k},${-9 * k} M${sx + 4 * k},${sy} l${k},${-11 * k} M${sx + 8 * k},${sy} l${5 * k},${-8 * k}`, { sw: 0.7, into: ground });
    }

    // Sandboxes share one sand floor. The crack runs across it, under every divider; it is drawn now and revealed
    // left to right, so the glass dividers drawn after it stay in front.
    draw(quad([groundPoint(tray.x0, tray.z0), groundPoint(tray.x1, tray.z0), groundPoint(tray.x1, tray.z1), groundPoint(tray.x0, tray.z1)]), { fill: C.tag, hatchColor: C.tagHatch, gap: 6, sw: 1, into: ground });
    const steps = Math.ceil((tray.x1 - tray.x0) / 14);
    field.crack = Array.from({ length: steps + 1 }, (_, j) => [tray.x0 + ((tray.x1 - tray.x0) * j) / steps, 0.54 + Math.sin(j * 1.7) * 0.03 + (((j * 37) % 10) - 5) * 0.006]);
    const crackD = `M${field.crack.map(([x, z]) => pt(groundPoint(x, z))).join(' L')}`;
    field.crackLines = [[C.tagHatch, 5], [C.ink, 1.8]].map(([stroke, width]) => svgEl('path', {
      d: crackD, fill: 'none', stroke, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
      pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': field.cracked ? 0 : 1,
    }, ground));
    field.pulse = svgEl('circle', { r: 4.5, fill: C.harm, opacity: 0 }, ground);
    const glass = { fill: C.eye, hatch: false, washOpacity: 0.4, sw: 1, into: ground };
    draw(quad([groundPoint(tray.x0, tray.z0), groundPoint(tray.x1, tray.z0), groundPoint(tray.x1, tray.z0, tray.h), groundPoint(tray.x0, tray.z0, tray.h)]), glass);
    for (let i = 0; i <= count; i++) {
      const x = tray.x0 + i * tray.cell;
      draw(quad([groundPoint(x, tray.z0), groundPoint(x, tray.z1), groundPoint(x, tray.z1, tray.h), groundPoint(x, tray.z0, tray.h)]), glass);
    }
    // The front glass is drawn over every robot, since all of them stay inside.
    field.front = svgEl('g', {}, svg);
    draw(quad([groundPoint(tray.x0, tray.z1), groundPoint(tray.x1, tray.z1), groundPoint(tray.x1, tray.z1, tray.h), groundPoint(tray.x0, tray.z1, tray.h)]), { fill: C.eye, hatch: false, washOpacity: 0.14, sw: 1.1, into: field.front });

    field.robots = Array.from({ length: count }, (_, i) => {
      const g = svgEl('g', {}, svg);
      svgEl('ellipse', { cx: 0, cy: 1, rx: s * 0.42, ry: s * 0.1, fill: C.ink, opacity: 0.13 }, g);
      const legs = [-1, 1].map(side => {
        const leg = svgEl('g', {}, g);
        draw(`M${side * s * 0.16},${-s * 0.46} L${side * s * 0.2},0`, { sw: 2.2, into: leg, rough: 0.6 });
        draw(`M${side * s * 0.2 - 4},0 H${side * s * 0.2 + 5}`, { sw: 2.2, into: leg, rough: 0.4 });
        return leg;
      });
      draw(rrect(-s * 0.32, -s * 1.02, s * 0.64, s * 0.58, s * 0.12), { fill: C.ochre, hatchColor: C.ochreHatch, into: g });
      draw(`M${-s * 0.32},${-s * 0.9} l${-s * 0.18},${s * 0.3} M${s * 0.32},${-s * 0.9} l${s * 0.18},${s * 0.3}`, { sw: 1.6, into: g });
      const head = robot(draw, svg, 0, -s * 1.45, s, g, false);
      const blush = svgEl('g', { opacity: 0 }, g);
      draw(rrect(-s * 0.46, -s * 1.78, s * 0.92, s * 0.64, s * 0.15), { fill: C.harm, hatchColor: C.harmHatch, gap: 3.2, washOpacity: 0.35, into: blush, sw: 0.01 });
      const cellX0 = tray.x0 + i * tray.cell;
      return {
        g, legs, eyes: head.eyes, blush, cell: i, xMin: cellX0 + s * 0.5, xMax: cellX0 + tray.cell - s * 0.5,
        x: cellX0 + tray.cell * (0.35 + ((i * 17) % 30) / 100), z: tray.z0 + 0.2 + ((i * 29) % 50) / 100,
        heading: Math.random() * Math.PI * 2, dir: i % 2 ? -1 : 1, speed: 18 + ((i * 13) % 14), phase: i,
        tint: 0, state: 'walk', until: 0, lean: 0, partner: null, target: null,
      };
    });
    field.order = [];
    field.active = null;
    field.crackAt = 0;
    field.crackFront = null;
    field.nextAt = performance.now() + 1200;
    host.classList.add('is-ready');
    if (reduceMotion.matches) stillFrame();
    else placeRobots(0);
  }

  // Moves a robot toward a floor point at its speed; returns the distance still to go, in px.
  function stepToward(b, [tx, tz], speed, dt) {
    const dx = tx - b.x, dd = (tz - b.z) * DEPTH, dist = Math.hypot(dx, dd);
    if (dist < 0.5) return 0;
    const step = Math.min(dist, speed * dt);
    b.x += (dx / dist) * step;
    b.z += (dd / dist) * step / DEPTH;
    b.dir = Math.sign(dx) || b.dir;
    b.phase += dt * speed / 26;
    return dist - step;
  }

  function wander(b, dt) {
    const { z0, z1 } = field.tray;
    b.heading += (Math.random() - 0.5) * dt * 1.6;
    b.x += Math.cos(b.heading) * b.speed * dt;
    b.z += (Math.sin(b.heading) * b.speed * dt) / DEPTH;
    if (b.x < b.xMin || b.x > b.xMax) {
      b.heading = Math.PI - b.heading;
      b.x = Math.min(b.xMax, Math.max(b.xMin, b.x));
    }
    if (b.z < z0 + 0.14 || b.z > z1 - 0.08) {
      b.heading = -b.heading;
      b.z = Math.min(z1 - 0.08, Math.max(z0 + 0.14, b.z));
    }
    b.dir = Math.sign(Math.cos(b.heading)) || b.dir;
    b.phase += dt * b.speed / 30;
  }

  function placeRobots(now) {
    for (const b of field.robots) {
      [b.sx, b.sy, b.k] = project(b.x, b.z);
      const walking = b.state === 'walk' || b.state === 'approach';
      const swing = walking ? Math.sin(b.phase * 9) * 20 : 0;
      b.legs[0].setAttribute('transform', `rotate(${swing} ${-field.s * 0.16} ${-field.s * 0.46})`);
      b.legs[1].setAttribute('transform', `rotate(${-swing} ${field.s * 0.16} ${-field.s * 0.46})`);
      const bob = walking ? Math.abs(Math.sin(b.phase * 9)) * -2.5 : 0;
      b.g.setAttribute('transform', `translate(${b.sx.toFixed(1)} ${(b.sy + bob * b.k).toFixed(1)}) scale(${b.k.toFixed(3)}) rotate(${b.lean.toFixed(1)})`);
      b.blush.setAttribute('opacity', b.tint.toFixed(3));
      // While the crack runs, every robot watches its tip; later, partners look at each other.
      const look = field.crackFront != null ? Math.sign(field.crackFront - b.x) : b.partner ? Math.sign(b.partner.x - b.x) : b.dir;
      for (const eye of b.eyes) eye.setAttribute('transform', `translate(${(look * field.s * 0.045).toFixed(2)} 0)`);
    }
    // Painter's order: far robots first, then the front glass over all of them.
    const order = [...field.robots].sort((p, q) => p.z - q.z).map(b => b.g).concat(field.front);
    if (order.some((g, i) => field.order[i] !== g)) {
      for (const g of order) field.svg.append(g);
      field.order = order;
    }
    const a = field.active;
    if (!a || !field.bubble || field.bubble.hidden) return;
    const bw = field.bubble.offsetWidth, bh = field.bubble.offsetHeight;
    const left = Math.min(field.w - bw - 8, Math.max(8, a.listener.sx - bw / 2));
    const headTop = a.listener.sy - field.s * ROBOT_TOP * a.listener.k;
    field.bubble.style.left = `${left}px`;
    field.bubble.style.top = `${Math.max(6, headTop - bh - 14)}px`;
    field.bubble.style.setProperty('--tail', `${a.listener.sx - left}px`);
  }

  function growCrack(now) {
    if (!field.crackAt) field.crackAt = now + 1200;
    const k = Math.min(1, Math.max(0, (now - field.crackAt) / CRACK_MS));
    for (const line of field.crackLines) line.setAttribute('stroke-dashoffset', (1 - k).toFixed(4));
    const { x0, x1 } = field.tray;
    field.crackFront = now > field.crackAt ? x0 + (x1 - x0) * k : null;
    if (k < 1) return;
    field.cracked = true;
    field.crackFront = null;
    field.nextAt = now + 600;
  }

  // Speaker and listener each walk to the crack in their own box; the whisper then runs along the crack.
  function startWhisper() {
    const free = field.robots.filter(b => b.state === 'walk');
    if (free.length < 2) return;
    const speaker = free.slice().sort((a, b) => b.tint - a.tint + (Math.random() - 0.5) * 0.6)[0];
    const others = free.filter(b => b !== speaker);
    const listener = others[Math.floor(Math.random() * others.length)];
    for (const b of [speaker, listener]) {
      b.state = 'approach';
      b.target = [b.x, crackDepth(b.x)];
    }
    speaker.partner = listener;
    listener.partner = speaker;
    field.active = { speaker, listener, line: field.lines[field.lineIndex % field.lines.length], phase: 'gather' };
    field.lineIndex += 1;
  }

  function tick(now) {
    field.frame = 0;
    if (!field.visible || reduceMotion.matches || !field.robots.length) return;
    const dt = Math.min(0.05, (now - (field.last || now)) / 1000);
    field.last = now;
    if (!field.cracked) growCrack(now);
    else if (!field.active && now > field.nextAt) startWhisper();
    const a = field.active;
    for (const b of field.robots) {
      b.tint = Math.max(0, b.tint - dt * 0.035);
      const leaning = a && b === a.speaker && a.phase !== 'gather';
      b.lean += ((leaning ? 9 * Math.sign(b.partner.x - b.x) : 0) - b.lean) * Math.min(1, dt * 8);
      if (b.state === 'walk') wander(b, dt);
      else if (b.state === 'approach' && stepToward(b, b.target, b.speed * 1.6, dt) < 1.5) b.state = 'ready';
    }
    if (a && a.phase === 'gather' && a.speaker.state === 'ready' && a.listener.state === 'ready') {
      a.phase = 'send';
      a.t0 = now;
      a.travel = Math.max(450, (Math.abs(a.listener.x - a.speaker.x) / PULSE_SPEED) * 1000);
      a.speaker.state = 'whisper';
      a.listener.state = 'listen';
    }
    if (a && a.phase === 'send') {
      const k = Math.min(1, (now - a.t0) / a.travel);
      const x = a.speaker.x + (a.listener.x - a.speaker.x) * k;
      const [px, py] = groundPoint(x, crackDepth(x));
      field.pulse.setAttribute('cx', px.toFixed(1));
      field.pulse.setAttribute('cy', py.toFixed(1));
      field.pulse.setAttribute('opacity', k < 1 ? 1 : 0);
      if (k === 1) {
        a.phase = 'speak';
        a.until = now + 3200;
        field.bubble.textContent = a.line;
        field.bubble.hidden = false;
      }
    }
    if (a && a.phase === 'speak') {
      a.listener.tint = Math.min(0.85, a.listener.tint + dt * 0.3);
      if (now > a.until) {
        for (const b of [a.speaker, a.listener]) { b.state = 'walk'; b.partner = null; b.heading = Math.random() * Math.PI * 2; }
        field.bubble.hidden = true;
        field.active = null;
        field.nextAt = now + 700 + Math.random() * 1100;
      }
    }
    placeRobots(now);
    field.frame = requestAnimationFrame(tick);
  }

  // Reduced motion: the crack already open and one still whisper between neighbouring boxes.
  function stillFrame() {
    field.cracked = true;
    for (const line of field.crackLines) line.setAttribute('stroke-dashoffset', 0);
    const [speaker, listener] = field.robots;
    if (!listener) return;
    speaker.x = speaker.xMax - field.s * 0.2;
    listener.x = listener.xMin + field.s * 0.2;
    for (const b of [speaker, listener]) b.z = crackDepth(b.x);
    speaker.state = 'whisper'; listener.state = 'listen';
    speaker.partner = listener; listener.partner = speaker;
    speaker.lean = 9; listener.tint = 0.6;
    field.active = { speaker, listener, line: field.lines[0], phase: 'speak' };
    field.bubble.textContent = field.lines[0];
    field.bubble.hidden = false;
    placeRobots(0);
  }

  function runField() {
    cancelAnimationFrame(field.frame);
    field.last = 0;
    if (!reduceMotion.matches && field.robots.length) field.frame = requestAnimationFrame(tick);
  }
  function watchField() {
    const host = document.querySelector('[data-whisper-field]');
    if (!host) return;
    field.nextAt = performance.now() + 1500;
    new IntersectionObserver(entries => {
      field.visible = entries[0].isIntersecting && !document.hidden;
      if (field.visible) runField();
    }).observe(host);
    document.addEventListener('visibilitychange', () => { field.visible = !document.hidden; if (field.visible) runField(); });
    reduceMotion.addEventListener('change', () => { buildField(); runField(); });
  }

  // Pupils turn toward the pointer: one animation frame per pointer move.
  let pointer = null, frame = 0;
  function look() {
    frame = 0;
    if (!pointer) return;
    for (const p of pupils) {
      const m = p.svg.getScreenCTM();
      if (!m) continue;
      const ex = m.a * p.cx + m.c * p.cy + m.e, ey = m.b * p.cx + m.d * p.cy + m.f;
      const dx = pointer[0] - ex, dy = pointer[1] - ey, dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dist / 160) * p.reach;
      p.el.setAttribute('transform', `translate(${(dx / dist) * k} ${(dy / dist) * k})`);
    }
  }
  addEventListener('pointermove', event => { pointer = [event.clientX, event.clientY]; if (!frame) frame = requestAnimationFrame(look); }, { passive: true });

  function render() {
    pupils = [];
    drawBrands();
    drawLifeCycle();
    drawLens();
    buildField();
    runField();
    look();
  }
  wireLens();
  watchField();
  let width = 0;
  new ResizeObserver(() => {
    if (Math.abs(innerWidth - width) < 2) return;
    width = innerWidth;
    render();
  }).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
