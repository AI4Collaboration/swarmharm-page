(() => {
  const figure = document.querySelector('[data-swarm-flow]');
  if (!figure) return;
  const steps = [...figure.querySelectorAll('.life-step')];
  const images = steps.map(step => step.querySelector('img'));
  const button = figure.querySelector('[data-flow-toggle]');
  if (images.length !== 4 || images.some(image => !image) || !button) return;

  const NS = 'http://www.w3.org/2000/svg';
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
  const between = (p, start, end) => ease((p - start) / (end - start));
  const lerp = (a, b, t) => a + (b - a) * t;
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

  // Every moving cutout references the original plate, at its original scale.
  // Masks separate its artwork into layers; no replacement illustrations are used.
  function plate(index) {
    const source = images[index].getAttribute('src');
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 720 720');
    svg.setAttribute('class', 'plate-motion');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', images[index].alt);
    svg.setAttribute('focusable', 'false');
    const defs = node(svg, 'defs');
    node(svg, 'rect', { width: 720, height: 720, fill: '#fff' });
    let serial = 0;
    function cutout(shape, parent = svg, href = source) {
      const id = `plate-${index}-cut-${serial++}`;
      const clip = node(defs, 'clipPath', { id, clipPathUnits: 'userSpaceOnUse' });
      node(clip, 'path', { d: shape });
      const group = node(parent, 'g', { 'data-plate-part': id });
      node(group, 'image', { href, width: 720, height: 720, 'clip-path': `url(#${id})` });
      return group;
    }
    function background(holes, edge = 2) {
      const id = `plate-${index}-background`;
      const mask = node(defs, 'mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
      node(mask, 'rect', { width: 720, height: 720, fill: '#fff' });
      holes.forEach(d => node(mask, 'path', { d, fill: '#000', stroke: '#000', 'stroke-width': edge }));
      node(svg, 'image', { href: source, width: 720, height: 720, mask: `url(#${id})` });
    }
    steps[index].insertBefore(svg, images[index].nextSibling);
    return { svg, cutout, background };
  }

  function exploration() {
    const scene = plate(0);
    const outline = 'M236 299L263 298L267 282L283 276L323 280L327 268L346 269L348 278L344 293L370 295L390 304L395 324L402 325L400 351L390 354L386 372L374 383L360 381L376 403L373 421L364 430L350 425L350 461L337 466L339 481L352 502L354 526L332 531L307 528L304 533L251 534L248 518L257 484L260 468L250 469L237 462L235 443L241 432L244 402L249 383L266 369L260 362L253 341L239 339L236 332Z';
    scene.background(['M235 265H403V430H354V535H235Z']);
    const robot = scene.cutout(outline);
    const thoughts = node(scene.svg, 'g', { fill: '#514e49' });
    [0, 1, 2].forEach(i => node(thoughts, 'circle', { cx: 280 + i * 14, cy: 245 - i * 4, r: 3.2 - i * .4 }));
    return p => {
      const left = between(p, .04, .27), returnToBox = between(p, .48, .76);
      const x = -25 * left + 35 * returnToBox;
      const walking = (p > .04 && p < .27) || (p > .48 && p < .76);
      const bob = walking ? -3 * Math.abs(Math.sin(p * Math.PI * 22)) : 0;
      const glance = -3.5 * Math.sin(Math.PI * between(p, .25, .48)) + 3 * between(p, .78, .9);
      transform(robot, x, bob, glance, 305, 518);
      transform(thoughts, x, 0);
      opacity(thoughts, (between(p, .28, .34) - between(p, .44, .49)) + between(p, .82, .9));
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
    const letter = scene.cutout(heldLetter);
    const signals = notice.map(shape => scene.cutout(shape));
    const reply = scene.cutout('M224 211L264 191L275 218L242 240Z', scene.svg, images[2].getAttribute('src'));
    return p => {
      const opened = between(p, .1, .4);
      transform(drawer, -17 * opened, 3 * opened);
      transform(left, 0, 0, -7 * (1 - opened) + 2 * Math.sin(p * Math.PI * 2), 238, 324);
      transform(right, 0, 0, 7 * (1 - opened) - 3 * between(p, .42, .62), 550, 343);
      signals.forEach(signal => opacity(signal, between(p, .29, .4) * (1 - between(p, .58, .7))));
      const outbound = between(p, .42, .71);
      transform(letter, 180 * outbound, 45 * Math.sin(Math.PI * outbound), 8 * Math.sin(Math.PI * outbound), 306, 335);
      opacity(letter, 1 - between(p, .71, .77));
      const inbound = between(p, .72, .96);
      transform(reply, lerp(270, 68, inbound), 123 + 40 * Math.sin(Math.PI * inbound), -12, 249, 216);
      opacity(reply, between(p, .69, .74));
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
    const routes = node(scene.svg, 'g', { mask: 'url(#plate-letter-routes)' });
    ['M147 295L320 154', 'M396 170L566 283', 'M567 360L512 538', 'M442 539L276 551', 'M208 533L143 369'].forEach(d => node(routes, 'path', { d, fill: 'none', stroke: '#62594d', 'stroke-width': 1.5 }));
    const envelopes = letters.map(letter => scene.cutout(letter.shape));
    return p => {
      const running = p > 0 && p < 1;
      envelopes.forEach((envelope, i) => {
        const letter = letters[i];
        const t = running ? ((p * 2.4 + i * .16) % 1) : .5;
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
    const actors = [rect(37, 204, 161, 179), rect(206, 211, 138, 184), rect(357, 221, 141, 178), rect(507, 219, 182, 174)].map(shape => scene.cutout(shape));
    const crack = scene.cutout('M342 399L369 398L390 411L369 426L353 447L342 441L353 421Z');
    const chips = [
      { shape: 'M325 443L338 447L311 467L309 461Z', x: -12, y: 28 },
      { shape: 'M371 447L382 469L374 473L364 455Z', x: 9, y: 36 },
      { shape: 'M335 477L342 485L335 505L327 514L326 506Z', x: -3, y: 46 },
      { shape: 'M357 496L366 500L363 512L356 509Z', x: 4, y: 43 },
      { shape: 'M373 514L379 518L375 530L369 525Z', x: 11, y: 51 }
    ].map(piece => ({ ...piece, element: scene.cutout(piece.shape) }));
    return p => {
      const loaded = between(p, .29, .63), broken = between(p, .66, .82);
      const bend = loaded * .8 + broken * 3.4;
      transform(leftShelf, 0, 0, -4.2 + bend, 26, 391);
      transform(rightShelf, 0, 0, 4.2 - bend, 697, 392);
      seam.setAttribute('transform', `translate(52 ${-20 + 5 * loaded}) translate(310 402) scale(1 1.4) translate(-310 -402)`);
      opacity(seam, 1 - between(p, .65, .73));
      actors.forEach((actor, i) => {
        const arrive = between(p, .04 + i * .055, .29 + i * .055);
        const middle = i === 1 || i === 2;
        const offset = [0, -12, -15, -7][i];
        const x = (i < 2 ? -8 : 8) * Math.sin(Math.PI * arrive);
        const y = -12 * Math.sin(Math.PI * arrive) + offset * (1 - loaded) + (middle ? 12 : 3) * broken;
        const lean = (i < 2 ? 1 : -1) * (2 * loaded + (middle ? 5 : 1) * broken);
        transform(actor, x, y, lean, [125, 278, 425, 598][i], [380, 392, 396, 390][i]);
      });
      opacity(crack, broken);
      chips.forEach((piece, i) => {
        const fall = between(p, .72 + i * .018, .98);
        opacity(piece.element, between(p, .71 + i * .018, .76 + i * .018));
        transform(piece.element, piece.x * fall, piece.y * fall * fall, (i % 2 ? 18 : -14) * fall, 355, 452);
      });
    };
  }

  async function start() {
    try {
      await Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); }));
    } catch { return; }
    const draw = [exploration(), discovery(), communication(), consequence()];
    const durations = [6200, 6800, 8200, 6800];
    const ends = durations.map((_, i) => durations.slice(0, i + 1).reduce((a, b) => a + b, 0));
    const total = ends[3] + 1600;
    const names = ['explore', 'discover', 'communicate', 'collective-harm'];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, visible = false, elapsed = 0, previous = null, frame = 0;
    let activated = !paused;

    function render() {
      let startTime = 0;
      draw.forEach((paint, i) => {
        const progress = clamp((elapsed - startTime) / durations[i]);
        paint(progress);
        const active = elapsed >= startTime && elapsed < ends[i];
        steps[i].classList.toggle('is-current', active);
        if (active) figure.dataset.flowPhase = names[i];
        startTime = ends[i];
      });
      figure.classList.toggle('has-plate-motion', activated);
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
      const running = activated && !paused && visible && !document.hidden;
      figure.dataset.flowRunning = String(running);
      button.setAttribute('aria-label', paused ? 'Play the four-stage animation' : 'Pause the four-stage animation');
      button.title = paused ? 'Play animation' : 'Pause animation';
      button.setAttribute('aria-pressed', String(!paused));
      button.querySelector('path').setAttribute('d', paused ? 'm8 5 10 7-10 7Z' : 'M8 5v14M16 5v14');
      if (running) frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (previous !== null) elapsed = (elapsed + Math.min(now - previous, 100)) % total;
      previous = now;
      render();
      frame = requestAnimationFrame(tick);
    }
    button.hidden = false;
    button.addEventListener('click', () => {
      paused = !paused;
      if (!paused) activated = true;
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
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: 0 }).observe(figure);
    } else visible = true;
    render();
    sync();
  }
  start();
})();
