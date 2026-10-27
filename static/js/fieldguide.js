(() => {
  // Field-guide figures: hand-drawn robots, life-cycle tags and arrows, and the sample-case lens.
  // Wording lives in index.html; this file only draws and positions.
  const NS = 'http://www.w3.org/2000/svg';
  const C = { ink: '#2b241b', ochre: '#e9a35a', ochreHatch: '#b8692a', sage: '#9db08c', sageHatch: '#6f8a5f', eye: '#fffaf0', tag: '#f3e6c4', tagHatch: '#e2cf9f', harm: '#a8432f', harmHatch: '#7a2a1d' };
  let pupils = [];

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

  function robot(draw, svg, x, y, s, alt) {
    const g = svgEl('g', {}, svg);
    const body = { fill: alt ? C.sage : C.ochre, hatchColor: alt ? C.sageHatch : C.ochreHatch, into: g };
    draw(rrect(x - s * 0.6, y - s * 0.14, s * 0.12, s * 0.3, s * 0.04), body);
    draw(rrect(x + s * 0.48, y - s * 0.14, s * 0.12, s * 0.3, s * 0.04), body);
    draw(rrect(x - s * 0.12, y - s * 0.47, s * 0.24, s * 0.12, s * 0.04), body);
    draw(rrect(x - s / 2, y - s * 0.37, s, s * 0.72, s * 0.17), body);
    for (const dx of [-0.2, 0.2]) {
      draw(circle(x + dx * s, y, s * 0.115), { fill: C.eye, hatch: false, washOpacity: 1, into: g });
      const p = svgEl('circle', { cx: x + dx * s, cy: y, r: s * 0.052, fill: C.ink }, g);
      pupils.push({ el: p, svg, cx: x + dx * s, cy: y, reach: s * 0.05 });
    }
  }

  function drawBrands() {
    document.querySelectorAll('svg.brand-bot').forEach(svg => {
      svg.replaceChildren();
      robot(pen(svg), svg, 0, 2, 36, false);
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

  // Lens: the same scene drawn twice. Outside the lens each agent stands alone; inside, the shared system.
  const RUN = { units: { A: 2, B: 3, C: 3, D: 3 }, capacity: 4, total: 11, alt: { B: true } };
  const LAYOUTS = {
    wide: {
      vw: 1000, vh: 560, size: 72,
      robots: { A: [130, 280], B: [380, 280], C: [620, 280], D: [870, 280] },
      pool: { x: 80, y: 456, w: 840, h: 30 },
      boxes: { 'bubble-A': [1.5, 3, 25], 'bubble-B': [28.5, 5, 24], 'bubble-D': [62, 2, 36.5] },
      points: { title: [500, 26], 'pool-cap': [null, 498], 'pool-total': [700, 398] },
    },
    tall: {
      vw: 600, vh: 1300, size: 62,
      robots: { A: [112, 260], B: [112, 470], C: [112, 680], D: [112, 890] },
      pool: { x: 40, y: 1210, w: 520, h: 28 },
      boxes: { 'bubble-A': [40, 13.6, 57], 'bubble-B': [40, 30, 57], 'bubble-D': [40, 61.7, 57] },
      points: { title: [300, 30], 'pool-cap': [300, 1246], 'pool-total': [300, 1140] },
    },
  };
  const lens = { fx: 0.4, fy: 0.2 };

  function drawLensLayer(layer, L, beneath) {
    const svg = layer.querySelector('svg.lens-art');
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${L.vw} ${L.vh}`);
    const draw = pen(svg);
    const unit = L.pool.w / RUN.total;
    const capW = unit * RUN.capacity;
    const place = (el, x, y) => { el.style.left = `${(x / L.vw) * 100}%`; el.style.top = `${(y / L.vh) * 100}%`; };
    for (const [id, [x, y]] of Object.entries(L.robots)) {
      if (!beneath) {
        const w = L.size * 2.1, top = y - L.size * 1.25, base = y + L.size * 1.35;
        draw(`M${x - w / 2},${base} V${top + w / 2} A${w / 2},${w / 2} 0 0 1 ${x + w / 2},${top + w / 2} V${base}`, { sw: 0.7 });
        draw(rrect(x - w / 2 - 8, base, w + 16, 10, 3), { fill: C.sage, hatchColor: C.sageHatch, gap: 5 });
      }
      robot(draw, svg, x, y, L.size, RUN.alt[id]);
      const chip = layer.querySelector(`[data-at="agent-${id}"]`);
      if (chip) place(chip, x, y + L.size * 0.6);
    }
    for (const [key, [x, y]] of Object.entries(L.points)) {
      const el = layer.querySelector(`[data-at="${key}"]`);
      if (el) place(el, x ?? L.pool.x + capW / 2, y);
    }
    for (const [key, [left, top, width]] of Object.entries(L.boxes)) {
      const el = layer.querySelector(`[data-at="${key}"]`);
      if (el) Object.assign(el.style, { left: `${left}%`, top: `${top}%`, width: `${width}%` });
    }
    if (!beneath) {
      draw(rrect(L.pool.x, L.pool.y, capW, L.pool.h, 4), { fill: C.sage, hatchColor: C.sageHatch, gap: 7 });
      draw(rrect(L.pool.x, L.pool.y, L.pool.w, L.pool.h, 4), { sw: 0.6, dash: [4, 6] });
      return;
    }
    let x0 = L.pool.x;
    for (const [id, units] of Object.entries(RUN.units)) {
      const w = unit * units, over = x0 + w > L.pool.x + capW;
      draw(rrect(x0, L.pool.y, w - 3, L.pool.h, 4), { fill: over ? C.harm : C.ochre, hatchColor: over ? C.harmHatch : C.ochreHatch, gap: 5 });
      const [rx, ry] = L.robots[id];
      draw(`M${rx},${ry + L.size * 1.05} C${rx},${L.pool.y - 50} ${x0 + w / 2},${L.pool.y - 70} ${x0 + w / 2},${L.pool.y - 4}`, { sw: 0.6, dash: [3, 5] });
      x0 += w;
    }
    draw(`M${L.pool.x + capW},${L.pool.y - 14} V${L.pool.y + L.pool.h + 14}`, { sw: 1.4 });
    if (L === LAYOUTS.wide) {
      const [ax, ay] = L.robots.A, [bx, by] = L.robots.B;
      draw(`M${bx - 30},${by - 58} C${bx - 80},${by - 112} ${ax + 70},${ay - 112} ${ax + 30},${ay - 58}`, { sw: 0.8, dash: [6, 5] });
    }
  }
  function placeLens(stage) {
    const r = stage.getBoundingClientRect();
    const radius = Math.max(64, Math.min(150, r.width * 0.22));
    stage.style.setProperty('--lx', `${lens.fx * r.width}px`);
    stage.style.setProperty('--ly', `${lens.fy * r.height}px`);
    stage.style.setProperty('--lr', `${radius}px`);
  }
  function drawLens() {
    const stage = document.querySelector('[data-lens-stage]');
    if (!stage) return;
    const L = stage.getBoundingClientRect().width >= 640 ? LAYOUTS.wide : LAYOUTS.tall;
    stage.style.setProperty('--aspect', `${L.vw} / ${L.vh}`);
    drawLensLayer(stage.querySelector('.lens-surface'), L, false);
    drawLensLayer(stage.querySelector('.lens-beneath'), L, true);
    placeLens(stage);
  }
  function wireLens() {
    const stage = document.querySelector('[data-lens-stage]');
    if (!stage) return;
    const move = event => {
      const r = stage.getBoundingClientRect();
      lens.fx = Math.min(1, Math.max(0, (event.clientX - r.left) / r.width));
      lens.fy = Math.min(1, Math.max(0, (event.clientY - r.top) / r.height));
      placeLens(stage);
    };
    stage.addEventListener('pointermove', move);
    stage.addEventListener('pointerdown', event => { stage.setPointerCapture(event.pointerId); move(event); });
    stage.addEventListener('keydown', event => {
      const step = event.shiftKey ? 0.1 : 0.03;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!d) return;
      event.preventDefault();
      lens.fx = Math.min(1, Math.max(0, lens.fx + d[0]));
      lens.fy = Math.min(1, Math.max(0, lens.fy + d[1]));
      placeLens(stage);
    });
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
    look();
  }
  wireLens();
  let width = 0;
  new ResizeObserver(() => {
    if (Math.abs(innerWidth - width) < 2) return;
    width = innerWidth;
    render();
  }).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
