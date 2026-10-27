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

  // A box-headed robot. Pupils follow the pointer unless the caller steers them (track = false).
  function robot(draw, svg, x, y, s, alt, into = svg, track = true) {
    const g = svgEl('g', {}, into);
    const body = { fill: alt ? C.sage : C.ochre, hatchColor: alt ? C.sageHatch : C.ochreHatch, into: g };
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

  // Whisper field: robots wander a strip; when two meet, one leans in and whispers a transcript fragment.
  // A listener keeps a brick tint for a while and is more likely to pass the next whisper on.
  const field = { robots: [], lines: [], lineIndex: 0, nextAt: 0, active: null, last: 0, frame: 0, visible: true };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

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
    field.host = host;
    field.w = r.width;
    field.ground = r.height - (r.width < 640 ? 46 : 28);
    const draw = pen(svg);
    draw(`M0,${field.ground + 2} C${r.width * 0.3},${field.ground - 3} ${r.width * 0.7},${field.ground + 6} ${r.width},${field.ground}`, { sw: 1 });
    for (let x = 30; x < r.width; x += 90 + ((x * 7) % 60)) draw(`M${x},${field.ground + 2} l-4,-9 M${x + 4},${field.ground + 2} l1,-11 M${x + 8},${field.ground + 2} l5,-8`, { sw: 0.7 });
    const count = r.width < 640 ? 4 : r.width < 1100 ? 6 : 8;
    const s = r.width < 640 ? 36 : r.width < 1100 ? 44 : 48;
    field.s = s;
    field.robots = Array.from({ length: count }, (_, i) => {
      const g = svgEl('g', {}, svg);
      const legs = [-1, 1].map(side => {
        const leg = svgEl('g', {}, g);
        draw(`M${side * s * 0.16},${-s * 0.46} L${side * s * 0.2},0`, { sw: 2.2, into: leg, rough: 0.6 });
        draw(`M${side * s * 0.2 - 4},0 H${side * s * 0.2 + 5}`, { sw: 2.2, into: leg, rough: 0.4 });
        return leg;
      });
      const alt = i % 3 === 1;
      draw(rrect(-s * 0.32, -s * 1.02, s * 0.64, s * 0.58, s * 0.12), { fill: alt ? C.sage : C.ochre, hatchColor: alt ? C.sageHatch : C.ochreHatch, into: g });
      draw(`M${-s * 0.32},${-s * 0.9} l${-s * 0.18},${s * 0.3} M${s * 0.32},${-s * 0.9} l${s * 0.18},${s * 0.3}`, { sw: 1.6, into: g });
      const head = robot(draw, svg, 0, -s * 1.45, s, alt, g, false);
      const blush = svgEl('g', { opacity: 0 }, g);
      draw(rrect(-s * 0.46, -s * 1.78, s * 0.92, s * 0.64, s * 0.15), { fill: C.harm, hatchColor: C.harmHatch, gap: 3.2, washOpacity: 0.35, into: blush, sw: 0.01 });
      return {
        g, legs, eyes: head.eyes, blush, x: (r.width / (count + 1)) * (i + 1), dir: i % 2 ? -1 : 1,
        speed: 22 + ((i * 13) % 18), phase: i, tint: 0, state: 'walk', until: 0, lean: 0, target: null, partner: null,
      };
    });
    field.active = null;
    field.nextAt = performance.now() + 1200;
    host.classList.add('is-ready');
    if (reduceMotion.matches) stillFrame();
    else placeRobots(0);
  }

  function placeRobots(t) {
    for (const b of field.robots) {
      const walking = b.state === 'walk' || b.state === 'approach';
      const swing = walking ? Math.sin(b.phase * 9) * 20 : 0;
      b.legs[0].setAttribute('transform', `rotate(${swing} ${-field.s * 0.16} ${-field.s * 0.46})`);
      b.legs[1].setAttribute('transform', `rotate(${-swing} ${field.s * 0.16} ${-field.s * 0.46})`);
      const bob = walking ? Math.abs(Math.sin(b.phase * 9)) * -2.5 : 0;
      b.g.setAttribute('transform', `translate(${b.x.toFixed(1)} ${(field.ground + bob).toFixed(1)}) rotate(${b.lean.toFixed(1)})`);
      b.blush.setAttribute('opacity', b.tint.toFixed(3));
      const look = b.partner ? Math.sign(b.partner.x - b.x) : b.dir;
      for (const eye of b.eyes) eye.setAttribute('transform', `translate(${look * field.s * 0.045} 0)`);
    }
    const a = field.active;
    if (!a || !field.bubble) return;
    const r = field.host.getBoundingClientRect();
    const bw = field.bubble.offsetWidth;
    const left = Math.min(r.width - bw - 8, Math.max(8, a.listener.x - bw / 2));
    field.bubble.style.left = `${left}px`;
    field.bubble.style.setProperty('--tail', `${a.listener.x - left}px`);
  }

  function startWhisper() {
    const free = field.robots.filter(b => b.state === 'walk');
    if (free.length < 2) return;
    const speaker = free.slice().sort((a, b) => b.tint - a.tint + (Math.random() - 0.5) * 0.6)[0];
    const listener = free.filter(b => b !== speaker).sort((a, b) => Math.abs(a.x - speaker.x) - Math.abs(b.x - speaker.x))[0];
    const side = Math.sign(listener.x - speaker.x) || 1;
    speaker.state = 'approach';
    speaker.target = listener.x - side * field.s * 0.95;
    speaker.partner = listener;
    listener.state = 'wait';
    listener.partner = speaker;
    field.active = { speaker, listener, line: field.lines[field.lineIndex % field.lines.length], shown: false };
    field.lineIndex += 1;
  }

  function tick(now) {
    field.frame = 0;
    if (!field.visible || reduceMotion.matches || !field.robots.length) return;
    const dt = Math.min(0.05, (now - (field.last || now)) / 1000);
    field.last = now;
    if (!field.active && now > field.nextAt) startWhisper();
    for (const b of field.robots) {
      b.tint = Math.max(0, b.tint - dt * 0.035);
      b.lean += ((b.state === 'whisper' && b === field.active?.speaker ? 9 * Math.sign(b.partner.x - b.x) : 0) - b.lean) * Math.min(1, dt * 8);
      if (b.state === 'walk') {
        b.x += b.dir * b.speed * dt;
        b.phase += dt * b.speed / 30;
        if (b.x < field.s || b.x > field.w - field.s) { b.dir *= -1; b.x = Math.min(field.w - field.s, Math.max(field.s, b.x)); }
        if (Math.random() < dt * 0.15) b.dir *= -1;
      } else if (b.state === 'approach') {
        const dx = b.target - b.x;
        b.dir = Math.sign(dx) || b.dir;
        b.x += Math.sign(dx) * Math.min(Math.abs(dx), b.speed * 1.6 * dt);
        b.phase += dt * b.speed / 22;
        if (Math.abs(dx) < 1.5) {
          b.state = 'whisper';
          b.partner.state = 'listen';
          b.until = now + 3200;
        }
      }
    }
    const a = field.active;
    if (a && a.speaker.state === 'whisper') {
      if (!a.shown) {
        field.bubble.textContent = a.line;
        field.bubble.hidden = false;
        a.shown = true;
      }
      a.listener.tint = Math.min(0.85, a.listener.tint + dt * 0.3);
      if (now > a.speaker.until) {
        for (const b of [a.speaker, a.listener]) { b.state = 'walk'; b.partner = null; b.dir = Math.random() < 0.5 ? -1 : 1; }
        field.bubble.hidden = true;
        field.active = null;
        field.nextAt = now + 700 + Math.random() * 1100;
      }
    }
    placeRobots(now);
    field.frame = requestAnimationFrame(tick);
  }

  // Reduced motion: one still whisper, no movement.
  function stillFrame() {
    const [speaker, listener] = field.robots;
    if (!listener) return;
    listener.x = speaker.x + field.s * 0.95;
    speaker.state = 'whisper'; listener.state = 'listen';
    speaker.partner = listener; listener.partner = speaker;
    speaker.lean = 9; listener.tint = 0.6;
    field.active = { speaker, listener, line: field.lines[0], shown: true };
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
