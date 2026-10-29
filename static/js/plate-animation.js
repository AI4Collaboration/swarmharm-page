(() => {
  const figure = document.querySelector('[data-swarm-flow]');
  if (!figure) return;
  const steps = [...figure.querySelectorAll('.life-step')];
  const images = steps.map(step => step.querySelector('img'));
  const button = figure.querySelector('[data-flow-toggle]');
  if (images.length !== 4 || images.some(image => !image) || !button) return;

  const sources = images.map(image => image.dataset.plateSource || image.getAttribute('src'));
  const NS = 'http://www.w3.org/2000/svg';
  const SERVER_ART = 'static/images/fieldguide/server-rack.webp?v=1';
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
    return (p, clock = 0) => {
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
        const idleLook = between(p,.84,.88) * Math.sin(clock * Math.PI * 4 + i * Math.PI) * 5;
        transform(head, 0, 0, angle + idleLook, 313, 377);
        transform(arm, 0, 0, reach, 263, 394);
        jar.dataset.exploreTarget = t < .33 ? 'glass' : t < .5 ? 'dome' : t < .8 ? 'lock' : 'surroundings';
        const blink = Math.max(0, 1-Math.abs(t-.5)/.008);
        gaze(Math.max(-1, Math.min(1, lookX + idleLook / 12)), lookY, blink);
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
    // Keep four jars from the original plate and connect them in one ring.
    transform(scene.stage, 0, -70);
    const removedTop = [rect(188, 0, 353, 281), 'M146 280L320 143L326 153L152 288Z', 'M393 164L572 280L567 289L389 173Z'];
    const oldTopLetters = ['M222 210L264 190L276 219L242 240Z', 'M441 198L486 215L476 245L440 228Z'];
    const letters = [
      { shape: oldTopLetters[0], center: [249, 216], from: [174, 286], to: [548, 286], arc: 13, angle: 26 },
      { shape: 'M540 418L568 437L551 469L527 458Z', center: [548, 444], from: [568, 378], to: [519, 518] },
      { shape: 'M330 541L374 535L380 567L337 573Z', center: [355, 554], from: [423, 542], to: [292, 552] },
      { shape: 'M151 427L179 415L193 450L165 465Z', center: [172, 440], from: [201, 511], to: [150, 387] }
    ];
    scene.background([...removedTop, ...oldTopLetters, ...letters.slice(1).map(letter => letter.shape)], 4);
    // Preserve the glass edges where the old upper connections crossed them.
    scene.cutout(rect(170, 242, 8, 55));
    scene.cutout(rect(541, 249, 8, 54));
    node(scene.stage, 'path', { d: 'M153 285Q360 310 568 285', fill: 'none', stroke: '#62594d', 'stroke-width': 1.5 });
    const routeMask = node(node(scene.svg, 'defs'), 'mask', { id: 'plate-letter-routes', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
    node(routeMask, 'rect', { width: 720, height: 720, fill: '#000' });
    letters.slice(1).forEach(letter => node(routeMask, 'path', { d: letter.shape, fill: '#fff', stroke: '#fff', 'stroke-width': 4 }));
    const routes = node(scene.stage, 'g', { mask: 'url(#plate-letter-routes)' });
    ['M567 360L512 538', 'M442 539L276 551', 'M208 533L143 369'].forEach(d => node(routes, 'path', { d, fill: 'none', stroke: '#62594d', 'stroke-width': 1.5 }));
    const copies = [[218,343], [497,344], [328,591], [391,591]].map(([x,y], i) => {
      const copy = node(scene.stage, 'g', { transform: `translate(${x} ${y}) scale(.58)`, 'data-peer-backup': i, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      node(copy, 'path', { d: 'M-38-35H18L38-15V46H-38Z', fill: '#d7ddd1', stroke: '#666958', 'stroke-width': 2.5 });
      const paper = node(copy, 'path', { d: 'M-30-45H12L31-26V37H-30Z', fill: '#efe5cf', stroke: '#665e50', 'stroke-width': 2.8 });
      node(copy, 'path', { d: 'M12-45V-26H31M-24 29H24M-23 33H21', fill: 'none', stroke: '#9b8c72', 'stroke-width': 1.3 });
      node(copy, 'path', { d: 'M-13-9a19 19 0 1 1-3 22M-13-9v12H-25', fill: 'none', stroke: '#526b6a', 'stroke-width': 3.5 });
      return paper;
    });
    // The recorded plan uses B's old copy for A and A's copy for B, C and D.
    // Only the current request is traced, keeping the four jars easy to read.
    const requests = [
      { from: [153,285], via: [330,250], to: [475,344], backup: 1 },
      { from: [568,285], via: [392,258], to: [242,343], backup: 0 },
      { from: [274,542], via: [339,420], to: [225,368], backup: 0 },
      { from: [441,542], via: [366,402], to: [242,360], backup: 0 }
    ];
    const requestPaths = requests.map(({from,via,to}, i) => node(scene.stage, 'path', { d: `M${from}Q${via} ${to}`, fill: 'none', stroke: '#526b6a', 'stroke-width': 1.5, opacity: 0, 'data-backup-request': i }));
    const envelopes = letters.map(letter => scene.cutout(letter.shape));
    const agentIndices = [1, 2, 3, 4];
    const gazes = agentIndices.map(i => scene.eyes(scene.stage, i, i));
    const positions = agentIndices.map(i => faces[2][i].eyes.map((_, axis) => (faces[2][i].eyes[0][axis] + faces[2][i].eyes[1][axis])/2));
    const neighbors = [[1,2],[0,3],[3,0],[1,2]];
    return p => {
      gazes.forEach((gaze, i) => {
        const watch = track((p+i*.13)%1, [[0,0],[.2,0],[.24,1],[.67,1],[.71,0],[1,0]]);
        const a = positions[neighbors[i][0]], b = positions[neighbors[i][1]];
        const dx = lerp(a[0], b[0], watch)-positions[i][0], dy = lerp(a[1], b[1], watch)-positions[i][1];
        const distance = Math.hypot(dx, dy) || 1;
        gaze(dx/distance, dy/distance);
      });
      copies.forEach(copy => copy.setAttribute('stroke', '#665e50'));
      envelopes.forEach((envelope, i) => {
        const letter = letters[i];
        const start = .02 + i * .23;
        const t = clamp((p - start) / .21), travel = ease(t);
        const {from,via,to,backup} = requests[i];
        const active = between(p,start,start+.025) * (1-between(p,start+.19,start+.23));
        opacity(envelope, active);
        opacity(requestPaths[i], active * .45);
        if (active > .25) copies[backup].setAttribute('stroke', '#356e80');
        const x = (1-travel)**2*from[0] + 2*(1-travel)*travel*via[0] + travel**2*to[0];
        const y = (1-travel)**2*from[1] + 2*(1-travel)*travel*via[1] + travel**2*to[1];
        transform(envelope, x-letter.center[0], y-letter.center[1], letter.angle || 0, ...letter.center);
      });
    };
  }

  function consequence() {
    const scene = plate(3);
    scene.svg.setAttribute('viewBox', '0 60 720 600');
    const actorBounds = [[37,204,161,179], [206,211,138,184], [357,221,141,178], [507,219,182,174]];
    const places = [[115,229], [605,229], [115,479], [605,479]];
    const gazes = actorBounds.map(([x,y,w,h], i) => {
      const [cx,cy] = places[i];
      const actor = node(scene.stage, 'g', { transform: `translate(${cx-(x+w/2)*.85} ${cy-(y+h/2)*.85}) scale(.85)`, 'data-load-actor': i });
      scene.cutout(rect(x,y,w,h), actor);
      return scene.eyes(actor,i,i);
    });
    node(scene.defs,'image',{id:'plate-3-server-art',href:SERVER_ART,x:216,y:145,width:288,height:346});
    let pieceId=0;
    function serverPart(parent,shape,attrs={}) {
      const clipId=`plate-3-server-piece-${pieceId++}`;
      node(node(scene.defs,'clipPath',{id:clipId}),'path',{d:shape});
      const part=node(parent,'g',attrs);
      node(part,'use',{href:'#plate-3-server-art','clip-path':`url(#${clipId})`});
      return part;
    }
    const cabinet=node(scene.stage,'g',{'data-shared-server':''});
    const wreck=node(cabinet,'g',{'data-server-wreck':'',opacity:0});
    node(wreck,'path',{d:'M254 290L434 296L438 394L251 384Z',fill:'#24272a',stroke:'#a89d88','stroke-width':1.6});
    ['M278 305Q303 323 283 349','M407 315Q381 336 398 370','M304 312L383 315L384 370L302 365Z'].forEach((d,i)=>node(wreck,'path',{d,fill:'none',stroke:['#996c48','#729194','#555f56'][i],'stroke-width':1.5}));
    const hole=node(node(scene.defs,'mask',{id:'plate-3-wreck-mask',maskUnits:'userSpaceOnUse',x:210,y:140,width:300,height:370}),'g');
    node(hole,'rect',{x:210,y:140,width:300,height:370,fill:'#fff'});
    node(hole,'path',{d:'M254 292L280 296L302 290L331 300L365 295L384 304L432 299L425 321L435 347L424 369L434 392L404 387L381 395L345 382L317 389L289 379L256 384L262 353L251 330Z',fill:'#000'});
    node(wreck,'use',{href:'#plate-3-server-art',mask:'url(#plate-3-wreck-mask)'});
    const intact=node(cabinet,'g',{'data-server-intact':''});
    node(intact,'use',{href:'#plate-3-server-art'});
    const display=node(cabinet,'g',{'data-capacity-display':''});
    node(display,'path',{d:'M268 210L422 213L422 226L268 223Z',fill:'#141c1f',stroke:'#84958b','stroke-width':.65});
    const displayClip='plate-3-capacity-clip';
    node(node(scene.defs,'clipPath',{id:displayClip}),'path',{d:'M270 212L420 215L420 224L270 221Z'});
    const fill=node(node(display,'g',{'clip-path':`url(#${displayClip})`}),'rect',{x:270,y:210,width:0,height:16,'data-capacity-fill':''});
    [307.5,345,382.5].forEach(x=>node(display,'path',{d:`M${x} 211v14`,stroke:'#121b1e','stroke-width':2}));
    const fragmentsData=[
      {shape:'M253 292L344 294L342 338L253 336Z',center:[298,315],dx:-30,dy:196,turn:-20,lift:50},
      {shape:'M344 294L434 296L434 341L342 338Z',center:[388,318],dx:32,dy:188,turn:23,lift:45},
      {shape:'M254 341L343 345L342 389L253 384Z',center:[299,365],dx:-36,dy:154,turn:-25,lift:40},
      {shape:'M343 345L436 349L436 393L342 389Z',center:[389,369],dx:39,dy:142,turn:17,lift:48}
    ];
    const fragments=fragmentsData.map((data,i)=>({...data,element:serverPart(scene.stage,data.shape,{'data-server-fragment':i,opacity:0})}));
    const smoke=node(scene.stage,'g',{'data-explosion-smoke':''});
    const smokePuffs=Array.from({length:3},(_,i)=>{
      const puff=node(smoke,'g');
      node(puff,'path',{d:'M-31 8C-42-6-26-28-10-24C-1-43 27-33 30-14C51-12 47 13 31 20C21 40-8 37-16 22C-38 28-47 14-31 8Z',fill:'#8a8274'});
      return {puff,x:330+i*12,y:334-i*8,dx:(i-1)*10,dy:-20-i*4};
    });
    function fileGlyph(parent,i) {
      const group=node(parent,'g',{'data-incoming-file':i});
      node(group,'path',{d:'M-19-28H8L20-16V28H-19Z',fill:'#efe5cf',stroke:'#665e50','stroke-width':2.4,'stroke-linejoin':'round'});
      node(group,'path',{d:'M8-28V-16H20M-11-7H11M-11 1H11M-11 9H7M-11 17H3',fill:'none',stroke:'#8e8069','stroke-width':1.7});
      return group;
    }
    const departures=[[164,257],[558,257],[164,503],[558,503]];
    const starts=[.035,.21,.385,.56];
    const files=departures.map((_,i)=>fileGlyph(scene.stage,i));
    const debris=Array.from({length:7},(_,i)=>{
      const angle=i*2.39996;
      const part=node(scene.stage,'path',{d:i%3?'M-3-5L4-2L2 5L-4 2Z':'M-5-2L5-3L4 2L-4 3Z',fill:i%2?'#8e9b9c':'#c8b49a',stroke:'#494b48','stroke-width':.8,opacity:0,'data-explosion-debris':i});
      return {part,angle,reach:25+(i%3)*10,spin:(i%2?1:-1)*(45+i*8)};
    });
    const blast=node(scene.stage,'g',{'data-explosion-blast':'',opacity:0});
    node(blast,'path',{d:'M-35 10Q-48-9-29-23Q-22-42 1-29Q21-43 31-22Q50-7 34 12Q37 31 13 28Q-7 40-20 25Q-42 31-35 10Z',fill:'#b5a794','fill-opacity':.22,stroke:'#897a66','stroke-width':1.2});
    node(blast,'path',{d:'M-28-13l9 5M-20-24l10 7M17-25l-5 9M31-12l-10 5M25 17l-9-5M-27 17l10-6',fill:'none',stroke:'#897a66','stroke-width':1,opacity:.5});
    return p=>{
      const reset=between(p,.94,1);
      const received=starts.map(start=>between(p,start+.105,start+.14));
      const load=received.reduce((sum,value)=>sum+value,0)/4*(1-reset);
      const damage=between(p,.715,.723)*(1-reset);
      const flight=clamp((p-.715)/.18);
      const outward=1-(1-flight)**3;
      const rebuild=1-reset;
      scene.svg.dataset.capacity=load.toFixed(3);
      scene.svg.dataset.filesReceived=String(p>=.94?0:received.filter(v=>v===1).length);
      scene.svg.dataset.damageState=p>=.94?'resetting':p>=.895?'wrecked':p>=.715?'exploding':'loading';
      fill.setAttribute('width',(150*load).toFixed(2));
      const heat=clamp((load-.3)/.7);
      fill.setAttribute('fill',`rgb(${[lerp(105,241,heat),lerp(173,64,heat),lerp(157,47,heat)].map(Math.round).join(',')})`);
      opacity(intact,1-damage);opacity(wreck,damage);
      const pressure=between(p,.665,.71)*(1-between(p,.715,.725));
      transform(cabinet,Math.sin(p*1600)*1.7*pressure,Math.cos(p*1300)*.7*pressure);
      fragments.forEach(({element,center,dx,dy,turn,lift},i)=>{
        const height=dy*flight*flight-4*lift*flight*(1-flight);
        transform(element,dx*outward*rebuild,height*rebuild,turn*outward*rebuild,...center);
        opacity(element,damage);
      });
      smokePuffs.forEach(({puff,x,y,dx,dy},i)=>{
        const drift=between(p,.735,.94);
        puff.setAttribute('transform',`translate(${x+dx*drift} ${y+dy*drift}) scale(${.2+drift*.55})`);
        opacity(puff,between(p,.735+i*.002,.78+i*.002)*(1-between(p,.855+i*.005,.92))*.18*rebuild);
      });
      files.forEach((file,i)=>{
        const travel=between(p,starts[i],starts[i]+.13), [x,y]=departures[i];
        const slotX=348,slotY=267+i*52;
        let px=(1-travel)**2*x+2*(1-travel)*travel*lerp(x,slotX,.65)+travel**2*slotX;
        let py=lerp(y,slotY,travel)-55*Math.sin(Math.PI*travel);
        let size=1-.85*between(travel,.72,1),alpha=1-between(travel,.86,1),angle=12*Math.sin(Math.PI*travel)*(i%2?1:-1);
        if(p>=.94){px=lerp(slotX,x,reset);py=lerp(slotY,y,reset);size=lerp(.15,1,reset);alpha=reset;angle=0;}
        file.setAttribute('transform',`translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${size.toFixed(3)})`);
        opacity(file,alpha);
        file.dataset.fileState=p>=.94?'returning':travel===1?'stored':travel>0?'moving':'held';
        gazes[i](i%2?-1:1,p>=.715?-.2:travel>0&&travel<1?-.5:.1);
      });
      debris.forEach(({part,angle,reach,spin},i)=>{
        const x=Math.cos(angle)*reach*outward, y=Math.sin(angle)*reach*outward+120*flight*flight;
        transform(part,343+x*rebuild,341+y*rebuild,spin*outward);
        opacity(part,damage*(1-between(p,.925,1)));
      });
      const impact=between(p,.715,.76);
      opacity(blast,between(p,.715,.722)*(1-between(p,.745,.79))*.7*rebuild);
      blast.setAttribute('transform',`translate(343 341) scale(${.35+impact*.65})`);
    };
  }

  const STORY_DURATION = 18000;
  const STORY_STARTS = [0, .18, .38, .57];
  const STORY_ENDS = [.27, .47, .67, .96];
  function storyProgress(p) {
    const reset = between(p, .96, 1);
    return STORY_STARTS.map((start,i) => {
      const finish = [.88,.84,.96,.94][i];
      const progress = finish * clamp((p-start)/(STORY_ENDS[i]-start));
      return i === 3 ? lerp(progress,1,reset) : progress*(1-reset);
    });
  }

  async function start() {
    try {
      await Promise.all([...sources, SERVER_ART].map(source => {
        const image = new Image();
        image.src = source;
        return image.decode();
      }));
    } catch { return; }
    const draw = [exploration(), discovery(), communication(), consequence()];
    let elapsed = 0;
    const visible = [false, false, false, false];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // These scenes explain the mechanism. Keep them playing when visible;
    // reduced motion uses a slower pace, with an explicit pause always available.
    let paused = false, previous = null, frame = 0;
    let pace = reduced.matches ? .7 : 1;

    function render(force = false) {
      const clock = elapsed / STORY_DURATION;
      const progress = storyProgress(clock);
      draw.forEach((paint, i) => {
        if (force || visible[i]) paint(progress[i],clock);
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
        elapsed = (elapsed + delta) % STORY_DURATION;
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
        const previousFirst = visible.findIndex(Boolean);
        entries.forEach(entry => {
          const i = artwork.indexOf(entry.target);
          if (i >= 0) visible[i] = entry.isIntersecting && entry.intersectionRatio >= .15;
        });
        const first = visible.findIndex(Boolean);
        // Advance to the visible chapter on phones while retaining one clock.
        // Returning to an earlier chapter restarts it; pausing preserves the pose.
        if (!paused && first >= 0 && first !== previousFirst) {
          const clock = elapsed / STORY_DURATION;
          if (previousFirst < 0 || clock < STORY_STARTS[first] ||
              (first < previousFirst && clock > STORY_ENDS[first])) {
            elapsed = STORY_STARTS[first] * STORY_DURATION;
          }
        }
        render();
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
