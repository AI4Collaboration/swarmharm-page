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

  // Life cycle: a tag behind each label, an arrow between plates, a hand-drawn rule under each phase name.
  function drawTag(svg) {
    const r = svg.getBoundingClientRect();
    if (!r.width) return;
    const w = r.width, h = r.height;
    svg.replaceChildren();
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const draw = pen(svg);
    draw(`M16,0 H${w} V${h} H16 L0,${h * 0.62} V${h * 0.38} Z`, { fill: C.tag, hatch: false, washOpacity: 1, rough: 0.8 });
    draw(`M22,4 H${w - 4} V${h - 4} H22 L6,${h * 0.6} V${h * 0.4} Z`, { sw: 0.5, rough: 0.6 });
    draw(circle(22, h / 2, 4.5), { sw: 0.8 });
    draw(`M22,${h / 2} C6,${h / 2 + 3} -10,${h / 2 + 18} -5,${h / 2 + 30}`, { sw: 0.6 });
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
