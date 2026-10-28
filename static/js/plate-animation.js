(() => {
  const figure = document.querySelector('[data-swarm-flow]');
  if (!figure) return;
  const steps = [...figure.querySelectorAll('.life-step')];
  const images = steps.map(step => step.querySelector('img'));
  const button = figure.querySelector('[data-flow-toggle]');
  if (images.length !== 4 || images.some(image => !image) || !button) return;

  const sources = images.map(image => image.dataset.plateSource || image.getAttribute('src'));
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const between = (p, start, end) => ease((p - start) / (end - start));
  const lerp = (a, b, t) => a + (b - a) * t;
  // Deliberate looks and holds, with no spring, overshoot or scale deformation.
  const track = (t, keys) => {
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [start, from] = keys[i - 1], [end, to] = keys[i];
        return lerp(from, to, ease((t - start) / (end - start)));
      }
    }
    return keys[keys.length - 1][1];
  };
  const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h-${w}Z`;
  const node = (parent, tag, attrs = {}) => {
    const element = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    parent.append(element);
    return element;
  };
  const transform = (element, x = 0, y = 0, angle = 0, cx = 0, cy = 0) => {
    element.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)} ${cx} ${cy})`);
  };
  const opacity = (element, value) => element.setAttribute('opacity', clamp(value).toFixed(3));

  const faces = [
    [{ eyes: [[315, 337], [358, 345]], radius: 11.5 }],
    [{ eyes: [[231, 292], [266, 285]], radius: 10 }, { eyes: [[525, 302], [558, 312]], radius: 9.5 }],
    [{ eyes: [[355, 136], [378, 138]], radius: 6 }, { eyes: [[94, 300], [116, 297]], radius: 6 },
     { eyes: [[604, 304], [625, 306]], radius: 6 }, { eyes: [[217, 552], [239, 550]], radius: 6 },
     { eyes: [[478, 557], [498, 559]], radius: 6 }],
    [{ eyes: [[109, 246], [134, 252]], radius: 7.5 }, { eyes: [[270, 258], [297, 263]], radius: 7.5 },
     { eyes: [[412, 271], [438, 265]], radius: 7.5 }, { eyes: [[590, 267], [613, 262]], radius: 7.5 }]
  ];

  // Convert paper to alpha before compositing, so moving cutouts cannot cover
  // adjacent engraving with white rectangles, in either theme.
  function plate(index) {
    const source = sources[index];
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 720 720');
    svg.setAttribute('class', 'plate-motion');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', images[index].alt);
    svg.setAttribute('focusable', 'false');
    const defs = node(svg, 'defs');
    const inkId = `plate-${index}-ink`;
    const ink = node(defs, 'filter', { id: inkId, 'color-interpolation-filters': 'sRGB' });
    node(ink, 'feColorMatrix', { type: 'matrix', values: '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.2126 -.7152 -.0722 0 1' });
    node(node(ink, 'feComponentTransfer'), 'feFuncA', { type: 'linear', slope: 1.08, intercept: -.035 });
    const stage = node(svg, 'g', { 'data-scene-art': index });
    let serial = 0;
    const mask = (holes, edge = 1) => {
      const id = `plate-${index}-mask-${serial++}`;
      const m = node(defs, 'mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
      node(m, 'rect', { width: 720, height: 720, fill: '#fff' });
      holes.forEach(d => node(m, 'path', { d, fill: '#000', stroke: '#000', 'stroke-width': edge }));
      return `url(#${id})`;
    };
    const eyeMaskId = `plate-${index}-eye-mask`;
    const eyeMask = node(defs, 'mask', { id: eyeMaskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
    node(eyeMask, 'rect', { width: 720, height: 720, fill: '#fff' });
    faces[index].forEach(face => face.eyes.forEach(([cx, cy]) => node(eyeMask, 'circle', { cx, cy, r: face.radius + 1.5, fill: '#000' })));
    function inkImage(parent, href, attrs) {
      const wrapper = node(parent, 'g', href === source ? { mask: `url(#${eyeMaskId})` } : {});
      node(wrapper, 'image', { href, width: 720, height: 720, filter: `url(#${inkId})`, ...attrs });
    }
    function cutout(shape, parent = stage, href = source, holes = []) {
      const id = `plate-${index}-cut-${serial++}`;
      const clip = node(defs, 'clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
      node(clip, 'path', { d: shape });
      const group = node(parent, 'g', { 'data-plate-part': id });
      inkImage(group, href, { 'clip-path': `url(#${id})`, ...(holes.length ? { mask: mask(holes) } : {}) });
      return group;
    }
    function background(holes, edge = 1, parent = stage) {
      inkImage(parent, source, { mask: mask(holes, edge) });
    }
    function eyes(parent, faceIndex, style = faceIndex) {
      const face = faces[index][faceIndex];
      const pupils = [], lids = [];
      face.eyes.forEach(([x, y], side) => {
        const r = face.radius;
        const narrow = [0.43, 0.65, 0.5, 0.36, 0.58][style % 5] * (side ? 0.9 : 1);
        const slant = (side ? -1 : 1) * r * (style % 2 ? .12 : .35);
        const shape = `M${x-r} ${y-r*narrow-slant}L${x+r} ${y-r*narrow+slant}L${x+r*.82} ${y+r*narrow}Q${x} ${y+r*(narrow+.2)} ${x-r*.82} ${y+r*narrow}Z`;
        const eye = node(parent, 'g', { 'data-gaze-eye': `${index}-${faceIndex}-${side}` });
        node(eye, 'path', { d: shape, fill: '#fff', stroke: '#191919', 'stroke-width': Math.max(1.4, r * .17), 'stroke-linejoin': 'round' });
        const clipId = `plate-${index}-pupil-${serial++}`;
        node(node(defs, 'clipPath', { id: clipId }), 'path', { d: shape });
        const iris = node(eye, 'g', { 'clip-path': `url(#${clipId})` });
        const pupil = node(iris, style % 2 ? 'rect' : 'ellipse', style % 2
          ? { x: x-r*.2, y: y-r*.7, width: r*.4, height: r*1.4, rx: r*.07, fill: '#111' }
          : { cx: x, cy: y, rx: r*.32, ry: r*.62, fill: '#111' });
        node(eye, 'path', { d: `M${x-r*1.12} ${y-r*narrow-slant-r*.3}L${x+r*1.1} ${y-r*narrow+slant-r*.3}`, fill: 'none', stroke: '#222', 'stroke-width': Math.max(1.5, r*.23), 'stroke-linecap': 'round' });
        const shutter = node(node(eye, 'g', { 'clip-path': `url(#${clipId})` }), 'rect', {
          x: x-r*1.2, y: y-r*1.5, width: r*2.4, height: 0, fill: '#242424'
        });
        pupils.push({ pupil, r });
        lids.push({ shutter, r });
      });
      return (lookX, lookY, blink = 0) => {
        pupils.forEach(({ pupil, r }) => transform(pupil, lookX * r * .42, lookY * r * .22));
        lids.forEach(({ shutter, r }) => shutter.setAttribute('height', (r*3*clamp(blink)).toFixed(3)));
      };
    }
    steps[index].insertBefore(svg, images[index].nextSibling);
    return { svg, stage, defs, cutout, background, eyes };
  }

  function exploration() {
    const scene = plate(0);
    const outline = 'M236 299L263 298L267 282L283 276L323 280L327 268L346 269L348 278L344 293L370 295L390 304L395 324L402 325L400 351L390 354L386 372L374 383L360 381L376 403L373 421L364 430L350 425L350 461L337 466L339 481L352 502L354 526L332 531L307 528L304 533L251 534L248 518L257 484L260 468L250 469L237 462L235 443L241 432L244 402L249 383L266 369L260 362L253 341L239 339L236 332Z';
    const headShape = 'M236 299L263 298L267 282L283 276L323 280L327 268L346 269L348 278L344 293L370 295L390 304L395 324L402 325L400 351L390 354L386 372L374 383L264 374L254 362L253 341L239 339L236 332Z';
    const handShape = 'M334 367L347 367L362 382L362 394L351 403L337 396L331 384Z';
    const actors = [];
    ['translate(-108 60) scale(.84)', 'translate(828 60) scale(-.84 .84)'].forEach((placement, i) => {
      const jar = node(scene.stage, 'g', { transform: placement, 'data-explorer-jar': i });
      scene.background([outline, headShape], 2, jar);
      const robot = node(jar, 'g', { 'data-explorer': i });
      const feet = scene.cutout(outline, robot, sources[0], [rect(220, 240, 200, 226)]);
      feet.setAttribute('data-rig-part', 'feet');
      const torso = node(robot, 'g', { 'data-rig-part': 'torso' });
      scene.cutout(outline, torso, sources[0], [headShape, handShape, rect(220, 466, 200, 80)]);
      const head = scene.cutout(headShape, torso, sources[0], [handShape]);
      head.setAttribute('data-rig-part', 'head');
      const gaze = scene.eyes(head, 0, i);
      scene.cutout(handShape, torso);
      actors.push({ torso, head, gaze });
    });
    return p => {
      actors.forEach(({ torso, head, gaze }, i) => {
        const t = (p + i*.43) % 1;
        // Eyes find a target first; the rigid neck and torso follow, then hold.
        const lookX = track(t, [[0,0],[.04,0],[.065,-.95],[.2,-.95],[.225,-.45],[.37,-.45],[.405,1],[.63,1],[.665,.8],[.83,.8],[.86,0],[1,0]]);
        const lookY = track(t, [[0,0],[.04,0],[.065,-.1],[.2,-.1],[.225,-1],[.37,-1],[.405,.9],[.63,.9],[.665,-.2],[.83,-.2],[.86,0],[1,0]]);
        const angle = track(t, [[0,0],[.08,0],[.14,-2],[.24,-2],[.3,-3],[.4,-3],[.47,3],[.64,3],[.72,1],[.86,1],[.94,0],[1,0]]);
        const lean = track(t, [[0,0],[.12,0],[.18,-.5],[.4,-.5],[.49,1.2],[.65,1.2],[.75,.2],[.88,.2],[.96,0],[1,0]]);
        transform(torso, 0, 0, lean, 310, 466);
        transform(head, 0, 0, angle, 313, 377);
        const blink = Math.max(0, 1-Math.abs(t-.385)/.009);
        gaze(lookX, lookY, blink);
      });
    };
  }

  function discovery() {
    const scene = plate(1);
    const leftHead = 'M232 235L248 236L249 247L271 244Q293 244 294 263L300 264L300 288L291 290L291 310L211 333L189 321L184 310L175 310L172 284L181 277L182 263L192 252L232 246Z';
    const rightHead = 'M554 255L574 258L572 274L604 280L613 293L622 298L617 322L607 324L603 344L583 352L500 334L495 313L487 307L494 281L505 278L512 266L553 271Z';
    const drawerShape = 'M118 365L274 381L400 363L404 453L272 491L118 462Z';
    const heldLetter = 'M274 314L333 300L348 344L309 356L298 370L266 368L272 349L283 342L272 337Z';
    const notice = [rect(335, 253, 43, 59), rect(461, 246, 38, 48)];
    scene.background([leftHead, rightHead, drawerShape, heldLetter, ...notice]);
    // The back of the runner remains inside the fixed letterbox as the drawer slides.
    scene.cutout('M378 365L407 361L407 459L378 467Z');
    const drawer = scene.cutout(drawerShape);
    const left = scene.cutout(leftHead), right = scene.cutout(rightHead);
    left.setAttribute('data-rig-part', 'head');
    right.setAttribute('data-rig-part', 'head');
    const holdingHand = 'M256 336L268 333L280 337L285 346L280 355L267 356L257 351Z';
    const letter = scene.cutout(heldLetter, scene.stage, sources[1], [holdingHand]);
    scene.cutout(holdingHand);
    const leftGaze = scene.eyes(left, 0, 0), rightGaze = scene.eyes(right, 1, 1);
    const signals = notice.map(shape => scene.cutout(shape));
    const reply = scene.cutout('M224 211L264 191L275 218L242 240Z', scene.stage, sources[2]);
    return p => {
      leftGaze(track(p, [[0,.2],[.16,.2],[.23,1],[.57,1],[.64,.5],[.87,.5],[1,.2]]), .35);
      rightGaze(track(p, [[0,0],[.2,0],[.27,-1],[.57,-1],[.64,-.3],[.86,-.3],[1,0]]), track(p, [[0,0],[.4,0],[.48,.8],[.64,.8],[.72,.3],[.88,.3],[1,0]]));
      const opened = between(p, .04, .3) * (1 - between(p, .85, 1));
      transform(drawer, -24 * opened, 4 * opened);
      transform(left, 0, 0, track(p, [[0,0],[.18,0],[.27,2],[.58,2],[.68,.5],[.88,.5],[1,0]]), 238, 324);
      transform(right, 0, 0, track(p, [[0,0],[.24,0],[.33,-2],[.44,-2],[.53,1.5],[.68,1.5],[.77,-1],[.9,-1],[1,0]]), 550, 343);
      signals.forEach(signal => opacity(signal, between(p, .29, .4) * (1 - between(p, .58, .7))));
      const outbound = p > .88 ? 0 : between(p, .3, .58);
      transform(letter, 180 * outbound, 45 * Math.sin(Math.PI * outbound), 8 * Math.sin(Math.PI * outbound), 306, 335);
      opacity(letter, p > .88 ? between(p, .91, 1) : 1 - between(p, .58, .64));
      const inbound = between(p, .6, .86);
      transform(reply, lerp(270, 68, inbound), 123 + 40 * Math.sin(Math.PI * inbound), -12, 249, 216);
      opacity(reply, between(p, .57, .62) * (1 - between(p, .87, .93)));
    };
  }

  function communication() {
    const scene = plate(2);
    const letters = [
      { shape: 'M222 210L264 190L276 219L242 240Z', center: [249, 216], from: [164, 279], to: [306, 165] },
      { shape: 'M441 198L486 215L476 245L440 228Z', center: [462, 222], from: [410, 180], to: [551, 274] },
      { shape: 'M540 418L568 437L551 469L527 458Z', center: [548, 444], from: [568, 378], to: [519, 518] },
      { shape: 'M330 541L374 535L380 567L337 573Z', center: [355, 554], from: [423, 542], to: [292, 552] },
      { shape: 'M151 427L179 415L193 450L165 465Z', center: [172, 440], from: [201, 511], to: [150, 387] }
    ];
    scene.background(letters.map(letter => letter.shape), 4);
    const routeMask = node(node(scene.svg, 'defs'), 'mask', { id: 'plate-letter-routes', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
    node(routeMask, 'rect', { width: 720, height: 720, fill: '#000' });
    letters.forEach(letter => node(routeMask, 'path', { d: letter.shape, fill: '#fff', stroke: '#fff', 'stroke-width': 4 }));
    const routes = node(scene.stage, 'g', { mask: 'url(#plate-letter-routes)' });
    ['M147 295L320 154', 'M396 170L566 283', 'M567 360L512 538', 'M442 539L276 551', 'M208 533L143 369'].forEach(d => node(routes, 'path', { d, fill: 'none', stroke: '#62594d', 'stroke-width': 1.5 }));
    const envelopes = letters.map(letter => scene.cutout(letter.shape));
    const gazes = faces[2].map((_, i) => scene.eyes(scene.stage, i, i));
    const positions = faces[2].map(face => face.eyes.map((_, axis) => (face.eyes[0][axis] + face.eyes[1][axis])/2));
    const neighbors = [[1,2],[3,0],[0,4],[4,1],[2,3]];
    return p => {
      gazes.forEach((gaze, i) => {
        const watch = track((p+i*.13)%1, [[0,0],[.2,0],[.24,1],[.67,1],[.71,0],[1,0]]);
        const a = positions[neighbors[i][0]], b = positions[neighbors[i][1]];
        const dx = lerp(a[0], b[0], watch)-positions[i][0], dy = lerp(a[1], b[1], watch)-positions[i][1];
        const distance = Math.hypot(dx, dy) || 1;
        gaze(dx/distance, dy/distance);
      });
      envelopes.forEach((envelope, i) => {
        const letter = letters[i];
        const t = (p * 2 + i * .16) % 1;
        opacity(envelope, Math.min(1, t * 8, (1 - t) * 8));
        const travel = ease(t);
        transform(envelope, lerp(letter.from[0], letter.to[0], travel) - letter.center[0], lerp(letter.from[1], letter.to[1], travel) - letter.center[1]);
      });
    };
  }

  function consequence() {
    const scene = plate(3);
    scene.cutout('M42 399L119 403L121 500L89 501L84 455Z');
    scene.cutout('M612 402L654 399L642 503L608 503Z');
    const leftShelf = scene.cutout('M23 378L350 399L359 435L25 405Z');
    const rightShelf = scene.cutout('M365 401L697 381L699 406L355 438L350 425Z');
    const seam = scene.cutout(rect(276, 402, 68, 23));
    const actorShapes = [rect(37, 204, 161, 179), rect(206, 211, 138, 184), rect(357, 221, 141, 178), rect(507, 219, 182, 174)];
    const actors = actorShapes.map(shape => scene.cutout(shape));
    const gazes = actors.map((actor, i) => scene.eyes(actor, i, i));
    const splinters = [
      { shape: 'M325 443L338 447L311 467L309 461Z', x: -30, y: 70 },
      { shape: 'M371 447L382 469L374 473L364 455Z', x: 23, y: 94 },
      { shape: 'M335 477L342 485L335 505L327 514L326 506Z', x: -15, y: 105 },
      { shape: 'M357 496L366 500L363 512L356 509Z', x: 14, y: 80 },
      { shape: 'M373 514L379 518L375 530L369 525Z', x: 29, y: 77 }
    ].map(piece => ({ ...piece, element: scene.cutout(piece.shape) }));
    const draw = cycle => {
      const p = cycle > .955 ? 0 : cycle;
      const loaded = between(p, .18, .48), broken = between(p, .5, .66);
      const bend = loaded*1.4 + broken*8;
      transform(leftShelf, 0, 0, -4.2+bend, 26, 391);
      transform(rightShelf, 0, 0, 4.2-bend, 697, 392);
      seam.setAttribute('transform', `translate(52 ${-20+5*loaded}) translate(310 402) scale(1 1.4) translate(-310 -402)`);
      opacity(seam, 1-between(p, .48, .55));
      actors.forEach((actor, i) => {
        const middle = i===1 || i===2;
        const settle = Math.sin(Math.PI*between(p, .02+i*.025, .22+i*.025));
        const angle = i<2 ? -4.2+bend : 4.2-bend;
        const anchor = i<2 ? 26 : 697;
        const lean = (i<2?1:-1)*(2*loaded+(middle?3:1)*broken);
        actor.setAttribute('transform', `rotate(${angle} ${anchor} 391) translate(0 ${-4*settle}) rotate(${lean} ${[125,278,425,598][i]} 390)`);
        gazes[i]((i<2?1:-1)*(.5+loaded*.5), broken*.9);

      });
      splinters.forEach((piece, i) => {
        const fall = between(p, .55+i*.014, .83);
        opacity(piece.element, between(p, .53+i*.014, .59+i*.014));
        transform(piece.element, piece.x*fall, piece.y*fall*fall, (i%2?35:-30)*fall, 355, 452);
      });
      opacity(scene.stage, cycle > .955 ? between(cycle, .965, 1) : 1-between(cycle, .9, .955));
    };
    return draw;
  }

  async function start() {
    try {
      await Promise.all(sources.map(source => {
        const image = new Image();
        image.src = source;
        return image.decode();
      }));
    } catch { return; }
    const draw = [exploration(), discovery(), communication(), consequence()];
    const durations = [12800, 8200, 9200, 9800];
    const elapsed = [1600, 1800, 2100, 0];
    const visible = [false, false, false, false];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, previous = null, frame = 0;
    let activated = true;
    let hasPlayed = !paused;
    if (paused) elapsed[3] = durations[3]*.79;

    function render() {
      draw.forEach((paint, i) => {
        paint(elapsed[i] / durations[i]);
        steps[i].classList.toggle('is-current', visible[i] && !paused);
      });
      figure.classList.toggle('has-plate-motion', activated);
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
      const running = activated && !paused && visible.some(Boolean) && !document.hidden;
      figure.dataset.flowRunning = String(running);
      button.setAttribute('aria-label', paused ? 'Play the four-stage animation' : 'Pause the four-stage animation');
      button.title = paused ? 'Play animation' : 'Pause animation';
      button.setAttribute('aria-pressed', String(!paused));
      button.querySelector('path').setAttribute('d', paused ? 'm8 5 10 7-10 7Z' : 'M8 5v14M16 5v14');
      if (running) frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (previous !== null) {
        const delta = Math.min(now - previous, 100);
        elapsed.forEach((time, i) => { if (visible[i]) elapsed[i] = (time + delta) % durations[i]; });
      }
      previous = now;
      render();
      frame = requestAnimationFrame(tick);
    }
    button.hidden = false;
    button.addEventListener('click', () => {
      paused = !paused;
      if (!paused) {
        activated = true;
        if (!hasPlayed) { elapsed[3] = 0; hasPlayed = true; }
      }
      render();
      sync();
    });
    reduced.addEventListener('change', () => {
      paused = reduced.matches;
      if (!paused) activated = true;
      render();
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => { visible[steps.indexOf(entry.target)] = entry.isIntersecting; });
        sync();
      }, { threshold: 0 });
      steps.forEach(step => observer.observe(step));
    } else visible.fill(true);
    render();
    sync();
  }
  start();
})();
