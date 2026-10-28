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

  // The first three scenes retain the original bell jars, letterbox and envelopes.
  // Cutouts separate the engraved pixels into independently moving layers.
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
      const x = -32 * left + 40 * returnToBox - 8 * between(p, .9, 1);
      const walking = (p > .04 && p < .27) || (p > .48 && p < .76);
      const bob = walking ? -5 * Math.abs(Math.sin(p * Math.PI * 22)) : 0;
      const glance = -3.5 * Math.sin(Math.PI * between(p, .25, .48)) + 3 * Math.sin(Math.PI * between(p, .78, 1));
      transform(robot, x, bob, glance, 305, 518);
      transform(thoughts, x, 0);
      opacity(thoughts, (between(p, .28, .34) - between(p, .44, .49)) + between(p, .82, .9) * (1 - between(p, .94, 1)));
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
      const opened = between(p, .04, .3) * (1 - between(p, .85, 1));
      transform(drawer, -24 * opened, 4 * opened);
      transform(left, 0, 0, -7 * (1 - opened) + 2 * Math.sin(p * Math.PI * 2), 238, 324);
      transform(right, 0, 0, 7 * (1 - opened) - 3 * between(p, .42, .62) * (1 - between(p, .85, 1)), 550, 343);
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
    const routes = node(scene.svg, 'g', { mask: 'url(#plate-letter-routes)' });
    ['M147 295L320 154', 'M396 170L566 283', 'M567 360L512 538', 'M442 539L276 551', 'M208 533L143 369'].forEach(d => node(routes, 'path', { d, fill: 'none', stroke: '#62594d', 'stroke-width': 1.5 }));
    const envelopes = letters.map(letter => scene.cutout(letter.shape));
    return p => {
      envelopes.forEach((envelope, i) => {
        const letter = letters[i];
        const t = (p * 2 + i * .16) % 1;
        opacity(envelope, Math.min(1, t * 8, (1 - t) * 8));
        const travel = ease(t);
        transform(envelope, lerp(letter.from[0], letter.to[0], travel) - letter.center[0], lerp(letter.from[1], letter.to[1], travel) - letter.center[1]);
      });
    };
  }

  function consequence(source) {
    const document = new DOMParser().parseFromString(source, 'image/svg+xml');
    const svg = document.documentElement;
    svg.setAttribute('class', 'plate-motion');
    svg.setAttribute('aria-label', images[3].alt);
    svg.setAttribute('focusable', 'false');
    steps[3].insertBefore(svg, images[3].nextSibling);
    const copies = [...svg.querySelectorAll('[data-collective-copy]')];
    const checks = [...svg.querySelectorAll('[data-collective-check]')];
    const robots = [...svg.querySelectorAll('[data-collective-robot]')];
    const loss = svg.querySelector('[data-collective-loss]');
    return p => {
      const reset = between(p, .88, 1);
      copies.forEach((copy, i) => {
        const done = between(p, .16 + i * .13, .29 + i * .13) * (1 - reset);
        opacity(copy, 1 - done);
        opacity(checks[i], done);
        const reach = Math.sin(Math.PI * between(p, .07 + i * .13, .35 + i * .13));
        transform(robots[i], 10 * reach, -4 * reach, 5 * reach, 310, 520);
      });
      opacity(loss, between(p, .69, .76) * (1 - reset));
    };
  }

  async function start() {
    try {
      await Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); }));
    } catch { return; }
    let source;
    try {
      const response = await fetch(images[3].getAttribute('src'));
      if (!response.ok) return;
      source = await response.text();
    } catch { return; }
    const draw = [exploration(), discovery(), communication(), consequence(source)];
    const durations = [5600, 6200, 7000, 7800];
    const elapsed = [500, 0, 0, 0];
    const visible = [false, false, false, false];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, previous = null, frame = 0;
    let activated = !paused;

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
