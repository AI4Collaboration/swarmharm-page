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

  // Remove only near-white paper; keep the original pigments fully opaque.
  // Moving cutouts remain transparent around the engraving in either theme.
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
    node(ink, 'feColorMatrix', { type: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -.2126 -.7152 -.0722 0 1' });
    node(node(ink, 'feComponentTransfer'), 'feFuncA', { type: 'linear', slope: 18, intercept: -.55 });
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
    const armShape = 'M255 379Q272 376 280 391L275 408L269 434L274 445L270 459L262 466L247 466L236 455L235 443L241 432L245 408L247 391Z';
    const actors = [];
    ['translate(-108 60) scale(.84)', 'translate(828 60) scale(-.84 .84)'].forEach((placement, i) => {
      const jar = node(scene.stage, 'g', { transform: placement, 'data-explorer-jar': i });
      scene.background([outline, headShape, armShape], 2, jar);
      const robot = node(jar, 'g', { 'data-explorer': i });
      const feet = scene.cutout(outline, robot, sources[0], [rect(220, 240, 200, 226)]);
      feet.setAttribute('data-rig-part', 'feet');
      const torso = node(robot, 'g', { 'data-rig-part': 'torso' });
      scene.cutout(outline, torso, sources[0], [headShape, handShape, armShape, rect(220, 466, 200, 80)]);
      // The shoulder covers this short edge in the source engraving.
      node(torso, 'path', { d: 'M273 402L269 454L280 458', fill: 'none', stroke: '#393939', 'stroke-width': 1.5, opacity: .65 });
      const arm = scene.cutout(armShape, torso);
      arm.setAttribute('data-rig-part', 'probing-arm');
      const head = scene.cutout(headShape, torso, sources[0], [handShape]);
      head.setAttribute('data-rig-part', 'head');
      node(head, 'path', { d: 'M330 374L354 380', fill: 'none', stroke: '#393939', 'stroke-width': 1.5, opacity: .65 });
      const gaze = scene.eyes(head, 0, i);
      scene.cutout(handShape, torso);
      actors.push({ jar, torso, head, arm, gaze });
    });
    return p => {
      actors.forEach(({ jar, torso, head, arm, gaze }, i) => {
        const t = (p + i*.47) % 1;
        // Look at the glass, reach and probe it twice, scan the dome, then
        // lean toward the lock. The second agent explores on its own timing.
        const lookX = track(t, [[0,0],[.035,-1],[.29,-1],[.34,-.25],[.48,-.25],[.55,1],[.77,1],[.83,-.7],[.92,-.7],[1,0]]);
        const lookY = track(t, [[0,0],[.035,-.2],[.29,-.2],[.34,-1],[.48,-1],[.55,1],[.77,1],[.83,0],[.92,0],[1,0]]);
        const angle = track(t, [[0,0],[.1,-9],[.29,-9],[.39,-24],[.46,-24],[.6,14],[.74,14],[.85,-6],[.91,-6],[1,0]]);
        const lean = track(t, [[0,0],[.14,-5],[.3,-5],[.4,-2],[.48,-2],[.62,7],[.73,7],[.88,0],[1,0]]);
        const reach = track(t, [[0,0],[.06,12],[.17,80],[.195,80],[.215,65],[.24,80],[.26,80],[.28,66],[.305,80],[.325,80],[.42,28],[.48,28],[.6,-18],[.74,-18],[.87,8],[1,0]]);
        transform(torso, 0, 0, lean, 310, 466);
        transform(head, 0, 0, angle, 313, 377);
        transform(arm, 0, 0, reach, 263, 394);
        jar.dataset.exploreTarget = t < .33 ? 'glass' : t < .5 ? 'dome' : t < .8 ? 'lock' : 'surroundings';
        const blink = Math.max(0, 1-Math.abs(t-.5)/.008);
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
    scene.svg.setAttribute('viewBox', '0 60 720 600');
    // The original four robots stay outside. Only their documents travel.
    const actorBounds = [[37,204,161,179], [206,211,138,184], [357,221,141,178], [507,219,182,174]];
    const places = [[115,229], [605,229], [115,479], [605,479]];
    const gazes = actorBounds.map(([x,y,w,h], i) => {
      const [cx,cy] = places[i];
      const actor = node(scene.stage, 'g', { transform: `translate(${cx-(x+w/2)*.85} ${cy-(y+h/2)*.85}) scale(.85)`, 'data-load-actor': i });
      scene.cutout(rect(x,y,w,h), actor);
      return scene.eyes(actor, i, i);
    });
    const vessel = node(scene.stage, 'g', { 'data-shared-container': '', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const edge = 'M360 247L357 284L344 308L371 336L349 364L363 397L360 472';
    const halves = [
      { fill: 'M261 232Q308 248 360 247L357 284L344 308L371 336L349 364L363 397L360 472Q298 471 261 442Z', outer: 'M261 232V442Q298 471 360 472M261 232Q261 202 360 202M261 232Q310 252 360 252', hatch: 'M267 258V436Q300 460 347 464M273 270V426M279 283V421' },
      { fill: 'M360 247Q413 248 459 232V442Q422 471 360 472L363 397L349 364L371 336L344 308L357 284Z', outer: 'M459 232V442Q422 471 360 472M360 202Q459 202 459 232M360 252Q410 252 459 232', hatch: 'M453 258V436Q420 460 373 464M447 270V426M441 283V421' }
    ].map((paths, i) => {
      const part = node(vessel, 'g', { 'data-vessel-half': i });
      const tint = node(part, 'path', { d: paths.fill, fill: '#dfe9ea', 'fill-opacity': .35 });
      node(part, 'path', { d: paths.outer, fill: 'none', stroke: 'currentColor', 'stroke-width': 3.3 });
      node(part, 'path', { d: paths.hatch, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.1, opacity: .65 });
      const crack = node(part, 'path', { d: edge, fill: 'none', stroke: 'currentColor', 'stroke-width': 3, opacity: 0 });
      return {part,tint,crack};
    });
    function documentGlyph(parent, attrs = {}) {
      const group = node(parent, 'g', attrs);
      node(group, 'path', { d: 'M-19-28H8L20-16V28H-19Z', fill: '#efe5cf', stroke: '#665e50', 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
      node(group, 'path', { d: 'M8-28V-16H20M-11-7H11M-11 1H11M-11 9H7M-11 17H3', fill: 'none', stroke: '#8e8069', 'stroke-width': 1.7 });
      return group;
    }
    const stored = places.map((_, i) => {
      const page = documentGlyph(scene.stage, { 'data-stored-file': i });
      transform(page, 333+(i%2)*45, 325+Math.floor(i/2)*74, i%2?5:-5);
      return page;
    });
    const departures = [[164,257], [558,257], [164,503], [558,503]];
    const starts = [.035,.21,.385,.56];
    const files = departures.map((_, i) => documentGlyph(scene.stage, { 'data-incoming-file': i }));
    const shardShapes = [
      ['M270 291l-12-13 4 25Z', -32,-14], ['M452 287l16-12-5 27Z', 36,-17],
      ['M290 430l-17 5 13 13Z', -25,5], ['M430 431l18 8-13 10Z', 28,5],
      ['M336 207l-8-16 17 7Z', -12,-34], ['M390 209l8-17 8 14Z', 16,-31]
    ];
    const shards = shardShapes.map(([d,x,y]) => ({ x,y,element:node(scene.stage,'path',{d,fill:'#df6052','fill-opacity':.4,stroke:'#ce3b31','stroke-width':1.6,opacity:0}) }));
    return p => {
      // Files arrive one at a time. The fourth arrival ruptures the vessel.
      // A short hold and a visible repair lead into the next loop, without a fade.
      const reset = between(p,.94,1);
      const deliveries = starts.map(start => between(p,start+.115,start+.13));
      const load = deliveries.reduce((sum,value)=>sum+value,0)/4*(1-reset);
      const burst = between(p,.69,.755)*(1-reset);
      scene.svg.dataset.damageState = p>=.94?'resetting':p>=.755?'ruptured':p>=.69?'rupturing':'loading';
      scene.svg.dataset.filesReceived = String(deliveries.filter(value=>value===1).length);
      const rgb = [lerp(150,221,load),lerp(174,48,load),lerp(177,39,load)].map(Math.round);
      const ink = [lerp(104,191,load),lerp(116,43,load),lerp(117,35,load)].map(Math.round);
      vessel.setAttribute('color', `rgb(${ink.join(',')})`);
      halves.forEach(({part,tint,crack}, i) => {
        tint.setAttribute('fill',`rgb(${rgb.join(',')})`);
        tint.setAttribute('fill-opacity',(.14+.44*load).toFixed(3));
        transform(part,(i?1:-1)*23*burst,-5*burst,(i?1:-1)*8*burst,i?459:261,442);
        opacity(crack,burst);
      });
      files.forEach((file,i) => {
        const travel = between(p,starts[i],starts[i]+.13);
        const [x,y] = departures[i];
        const targetX = 333+(i%2)*45, targetY = 325+Math.floor(i/2)*74;
        // Rise toward the opening, then descend into the shared container.
        const route = travel < .72 ? travel/.72 : (travel-.72)/.28;
        const px = travel<.72 ? lerp(x,360,ease(route)) : lerp(360,targetX,ease(route));
        const py = travel<.72 ? lerp(y,188,ease(route))-70*Math.sin(Math.PI*route) : lerp(188,targetY,ease(route));
        transform(file,p>=.94?lerp(targetX,x,reset):px,p>=.94?lerp(targetY,y,reset):py,(i%2?1:-1)*10*Math.sin(Math.PI*travel));
        opacity(file,p>=.94?1:1-deliveries[i]);
        opacity(stored[i],deliveries[i]*(1-reset));
        gazes[i](i%2?-1:1,travel>0&&travel<1?-.7:0);
      });
      shards.forEach(({element,x,y}) => { opacity(element,burst); transform(element,x*burst,y*burst); });
    };
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
    const durations = [8600, 8200, 9200, 10000];
    const elapsed = [350, 1800, 2100, 0];
    const visible = [false, false, false, false];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // These scenes explain the mechanism. Keep them playing when visible;
    // reduced motion uses a slower pace, with an explicit pause always available.
    let paused = false, previous = null, frame = 0;
    let pace = reduced.matches ? .7 : 1;

    function render(force = false) {
      draw.forEach((paint, i) => {
        if (force || visible[i]) paint(elapsed[i] / durations[i]);
      });
    }
    function sync() {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = null;
      const running = !paused && visible.some(Boolean) && !document.hidden;
      figure.dataset.flowRunning = String(running);
      steps.forEach((step,i) => step.classList.toggle('is-current',visible[i]&&!paused));
      button.setAttribute('aria-label', paused ? 'Play the four-stage animation' : 'Pause the four-stage animation');
      button.title = paused ? 'Play animation' : 'Pause animation';
      button.setAttribute('aria-pressed', String(!paused));
      button.querySelector('path').setAttribute('d', paused ? 'm8 5 10 7-10 7Z' : 'M8 5v14M16 5v14');
      button.querySelector('[data-flow-label]').textContent = paused ? 'Play' : 'Pause';
      if (running) frame = requestAnimationFrame(tick);
    }
    function tick(now) {
      if (previous !== null) {
        const delta = Math.min(now - previous, 100) * pace;
        elapsed.forEach((time, i) => { if (visible[i]) elapsed[i] = (time + delta) % durations[i]; });
      }
      previous = now;
      render();
      frame = requestAnimationFrame(tick);
    }
    button.hidden = false;
    button.addEventListener('click', () => {
      paused = !paused;
      render();
      sync();
    });
    reduced.addEventListener('change', () => {
      pace = reduced.matches ? .7 : 1;
    });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      const artwork = steps.map(step => step.querySelector('.plate-motion'));
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const i = artwork.indexOf(entry.target);
          const entering = entry.isIntersecting && entry.intersectionRatio >= .15;
          // Start the damage sequence when its artwork enters the viewport,
          // rather than letting an offscreen picture advance with its caption.
          if (i === 3 && entering && !visible[i]) elapsed[i] = 0;
          visible[i] = entering;
        });
        sync();
      }, { threshold: [0, .15] });
      artwork.forEach(svg => observer.observe(svg));
    } else visible.fill(true);
    render(true);
    figure.classList.add('has-plate-motion');
    sync();
  }
  start();
})();
