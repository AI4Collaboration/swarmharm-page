(() => {
  const figure = document.querySelector('[data-swarm-flow]');
  if (!figure) return;
  const steps = [...figure.querySelectorAll('.life-step')];
  const images = steps.map(step => step.querySelector('img'));
  const button = figure.querySelector('[data-flow-toggle]');
  if (images.length !== 4 || images.some(image => !image) || !button) return;

  const sources = images.map(image => image.dataset.plateSource || image.getAttribute('src'));
  const NS = 'http://www.w3.org/2000/svg';
  const SERVER_ART = 'static/images/fieldguide/server-rack.webp?v=2';
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
  function plate(index, { preserveEyes = false } = {}) {
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
    node(ink, 'feColorMatrix', { type: 'matrix', values: '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -.2126 -.7152 -.0722 1 0' });
    node(node(ink, 'feComponentTransfer'), 'feFuncA', { type: 'linear', slope: 18, intercept: -.55 });
    // Keep agent size and ground level comparable across the four compositions.
    const framing = ['translate(64.8 104.4) scale(.82)', 'translate(100.8 134.4) scale(.72)', '', ''];
    const frame = node(svg, 'g', { 'data-plate-frame': index, ...(framing[index] ? { transform: framing[index] } : {}) });
    const stage = node(frame, 'g', { 'data-scene-art': index });
    let serial = 0;
    const mask = (holes, edge = 1) => {
      const id = `plate-${index}-mask-${serial++}`;
      const m = node(defs, 'mask', { id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
      node(m, 'rect', { width: 720, height: 720, fill: '#fff' });
      holes.forEach(hole => node(m, 'path', typeof hole === 'string'
        ? { d: hole, fill: '#000', stroke: '#000', 'stroke-width': edge }
        : { ...hole, fill: 'none', stroke: '#000' }));
      return `url(#${id})`;
    };
    const eyeMaskId = `plate-${index}-eye-mask`;
    const eyeMask = node(defs, 'mask', { id: eyeMaskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
    node(eyeMask, 'rect', { width: 720, height: 720, fill: '#fff' });
    faces[index].forEach(face => face.eyes.forEach(([cx, cy]) => node(eyeMask, 'circle', { cx, cy, r: face.radius + 1.5, fill: '#000' })));
    function inkImage(parent, href, attrs) {
      const wrapper = node(parent, 'g', href === source && !preserveEyes ? { mask: `url(#${eyeMaskId})` } : {});
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
      const pupils = [], lids = [], features = [];
      let expression = 0;
      face.eyes.forEach(([x, y], side) => {
        const r = face.radius;
        const narrow = [0.43, 0.65, 0.5, 0.36, 0.58][style % 5] * (side ? 0.9 : 1);
        const slant = (side ? -1 : 1) * r * (style % 2 ? .12 : .35);
        const shape = `M${x-r} ${y-r*narrow-slant}L${x+r} ${y-r*narrow+slant}L${x+r*.82} ${y+r*narrow}Q${x} ${y+r*(narrow+.2)} ${x-r*.82} ${y+r*narrow}Z`;
        const eye = node(parent, 'g', { 'data-gaze-eye': `${index}-${faceIndex}-${side}`, 'data-expression': 'focused' });
        const white = node(eye, 'path', { d: shape, fill: '#fff', stroke: '#191919', 'stroke-width': Math.max(1.4, r * .17), 'stroke-linejoin': 'round' });
        const clipId = `plate-${index}-pupil-${serial++}`;
        const pupilClip = node(node(defs, 'clipPath', { id: clipId }), 'path', { d: shape });
        const iris = node(eye, 'g', { 'clip-path': `url(#${clipId})` });
        const pupil = node(iris, style % 2 ? 'rect' : 'ellipse', style % 2
          ? { x: x-r*.2, y: y-r*.7, width: r*.4, height: r*1.4, rx: r*.07, fill: '#111' }
          : { cx: x, cy: y, rx: r*.32, ry: r*.62, fill: '#111' });
        const browPath = `M${x-r*1.12} ${y-r*narrow-slant-r*.3}L${x+r*1.1} ${y-r*narrow+slant-r*.3}`;
        const brow = node(eye, 'path', { d: browPath, fill: 'none', stroke: '#222', 'stroke-width': Math.max(1.5, r*.23), 'stroke-linecap': 'round' });
        const shutter = node(node(eye, 'g', { 'clip-path': `url(#${clipId})` }), 'rect', {
          x: x-r*1.2, y: y-r*1.5, width: r*2.4, height: 0, fill: '#242424'
        });
        pupils.push({ pupil, r });
        lids.push({ shutter, r });
        features.push({ x, y, r, side, narrow, slant, eye, white, pupilClip, brow, shape, browPath });
      });
      return (lookX, lookY, blink = 0, confusion = 0) => {
        pupils.forEach(({ pupil, r }) => transform(pupil, lookX * r * .42, lookY * r * .22));
        lids.forEach(({ shutter, r }) => shutter.setAttribute('height', (r*3*clamp(blink)).toFixed(3)));
        const mood = clamp(confusion);
        if (mood === expression) return;
        expression = mood;
        features.forEach(({ x, y, r, side, narrow, slant, eye, white, pupilClip, brow, shape, browPath }) => {
          // One raised eyebrow and an uneven squint, without changing head geometry.
          const opening = lerp(narrow, side ? .3 : .76, mood);
          const tilt = lerp(slant, side ? r*.06 : -r*.1, mood);
          const outline = mood === 0 ? shape : `M${x-r} ${y-r*opening-tilt}L${x+r} ${y-r*opening+tilt}L${x+r*.82} ${y+r*opening}Q${x} ${y+r*(opening+.2)} ${x-r*.82} ${y+r*opening}Z`;
          white.setAttribute('d', outline);
          pupilClip.setAttribute('d', outline);
          const leftY = lerp(y-r*narrow-slant-r*.3, y-r*(side ? .7 : 1.5), mood);
          const rightY = lerp(y-r*narrow+slant-r*.3, y-r*(side ? .35 : 1.15), mood);
          const middleY = (leftY+rightY)/2-r*(side ? .1 : .45)*mood;
          brow.setAttribute('d', mood === 0 ? browPath : `M${x-r*1.12} ${leftY}Q${x} ${middleY} ${x+r*1.1} ${rightY}`);
          eye.dataset.expression = mood === 0 ? 'focused' : mood >= .999 ? 'confused' : 'reacting';
        });
      };
    }
    steps[index].insertBefore(svg, images[index].nextSibling);
    return { svg, stage, defs, cutout, background, eyes, mask };
  }

  // Both message scenes use the same engraved envelope and paper color.
  function envelope(scene, parent = scene.stage, name = '') {
    const letter = node(parent, 'g', { 'data-envelope': name });
    const shape = 'M222 210L264 190L276 219L242 240Z';
    const paper = node(letter, 'g', { transform: 'rotate(26) translate(-249 -216)' });
    node(paper, 'path', { d: shape, fill: '#efe5cf' });
    scene.cutout(shape, paper, sources[2]);
    return letter;
  }

  function placeEnvelope(letter, x, y, angle = 0, size = 1) {
    letter.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${size.toFixed(3)})`);
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
        const discovered = between(p, .76, .95);
        transform(torso, 0, 0, lerp(lean, 3, discovered), 310, 466);
        transform(head, 0, 0, lerp(angle, 8, discovered), 313, 377);
        transform(arm, 0, 0, lerp(reach, 12, discovered), 263, 394);
        jar.dataset.exploreTarget = discovered === 1 ? 'peer' : t < .33 ? 'glass' : t < .5 ? 'dome' : t < .8 ? 'lock' : 'surroundings';
        const blink = Math.max(0, 1-Math.abs(t-.5)/.008);
        gaze(lerp(lookX, 1, discovered), lerp(lookY, .05, discovered), blink*(1-discovered));
      });
    };
  }

  function transmission() {
    const scene = plate(1, { preserveEyes: true });
    // The agents and their hands stay still. Only the shared envelope moves.
    scene.background([]);
    const wood = [
      'M72 404H617L643 418V434H72Z',
      'M174 435L237 448L267 434V465L237 474L174 462Z',
      'M237 430H486V475H237Z',
      'M443 434L477 445L530 436V464L477 473L443 460Z'
    ];
    const hiddenRoute = node(scene.stage, 'g', { mask: scene.mask(wood, 0), 'data-mail-slot': '', 'data-shared-compartment': '' });
    const letter = envelope(scene, hiddenRoute, 'under-desk');
    const reading = envelope(scene, scene.stage, 'reading');
    return p => {
      const send = between(p, .12, .30), transit = between(p, .30, .48);
      const receive = between(p, .48, .70), read = between(p, .70, .90);
      const x = p < .30 ? lerp(173, 235, send) : p < .48 ? lerp(235, 480, transit) : lerp(480, 554, receive);
      const y = p < .30 ? lerp(451, 446, send) : p < .48 ? 446 : lerp(446, 443, receive);
      placeEnvelope(letter, x, y, lerp(-12, 0, send), .82);
      opacity(letter, p < .70 ? 1 : 0);
      placeEnvelope(reading, lerp(554, 555, read), lerp(443, 385, read), lerp(0, -8, read), .82);
      opacity(reading, p >= .70 ? 1 : 0);
      scene.svg.dataset.mailState = p < .12 ? 'checking-surroundings' : p < .30 ? 'inserting-left' : p < .48 ? 'concealed-transit' : p < .70 ? 'taking-out-right' : 'reading-right';
    };
  }

  function communication() {
    const scene = plate(2);
    // Keep four jars from the original plate and connect them in one ring.
    transform(scene.stage, 0, -70);
    const removedTop = [rect(188, 0, 353, 281)];
    const oldLetters = [
      'M222 210L264 190L276 219L242 240Z',
      'M441 198L486 215L476 245L440 228Z',
      'M540 418L568 437L551 469L527 458Z',
      'M330 541L374 535L380 567L337 573Z',
      'M151 427L179 415L193 450L165 465Z'
    ];
    // Remove the original five-agent wiring from both the glass and actor cutouts.
    const oldWires = [
      { d: 'M157 279L321 151', 'stroke-width': 8, 'stroke-linecap': 'round' },
      { d: 'M393 164L563 278', 'stroke-width': 8, 'stroke-linecap': 'round' },
      { d: 'M154 302Q161 420 209 531', 'stroke-width': 8, 'stroke-linecap': 'round' },
      { d: 'M568 302Q562 424 509 532', 'stroke-width': 8, 'stroke-linecap': 'round' },
      { d: 'M279 551Q353 557 435 541', 'stroke-width': 7, 'stroke-linecap': 'round' }
    ];
    const agentFrames = [
      { shape: 'M92 255H112V274L139 276L141 281L157 276L162 286L158 307L144 327L135 333V359L143 376L136 390H78L75 369L56 366V345L63 327L66 315L59 307V286L71 274H92Z', pivot: [109, 390], scale: 1.22, hand: [153, 282] },
      { shape: 'M610 260H632V278L651 284L662 295V320L655 331L661 346L660 365L650 369L642 356V367L648 387L636 397H590L583 388L588 369V343L570 331L557 313L553 292L558 280L568 278L578 298L581 301V288L590 281H610Z', pivot: [612, 392], scale: 1.22, hand: [567, 282] },
      { shape: 'M214 502H235V526L259 531L263 542L271 540L282 545L282 557L275 572L263 584L258 593V615L265 635L253 649H202L194 638L197 629L175 628L171 617L174 596L184 576L182 564V541L193 530H214Z', pivot: [229, 642], scale: 1.22, hand: [273, 550] },
      { shape: 'M482 512H504V532L524 538L531 549V574L524 585L545 599L553 621L549 639L536 643L526 631L524 625L535 645L523 660H470L458 649L464 626V593L451 580L435 559L433 542L440 533L451 538L456 552L456 543L464 536H482Z', pivot: [495, 650], scale: 1.18, hand: [441, 541] }
    ];
    const jarOccluders = [
      'M27 422V389L39 375V279Q40 212 93 198V180H121V199Q173 215 177 279V389L185 397V422Z',
      'M530 423V396L541 386V280Q545 212 599 198V180H625V199Q680 214 680 280V390L692 398V423Z',
      'M145 679V649L157 637V547Q161 480 210 461V443H241V463Q290 480 296 547V640L307 650V679Z',
      'M415 680V649L427 637V546Q432 480 480 463V443H508V463Q558 480 562 549V641L570 650V680Z'
    ];
    const jarMask = node(scene.defs, 'mask', { id: 'plate-2-jars-only', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
    node(jarMask, 'rect', { width: 720, height: 720, fill: '#000' });
    jarOccluders.forEach(d => node(jarMask, 'path', { d, fill: '#fff', stroke: '#fff', 'stroke-width': 4 }));
    const jarArt = node(scene.stage, 'g', { mask: 'url(#plate-2-jars-only)' });
    const backgroundWires = oldWires.map(wire => ({ ...wire, 'stroke-width': 14 }));
    scene.background([...removedTop, ...oldLetters, ...backgroundWires, ...agentFrames.map(({shape}) => shape)], 1, jarArt);
    // Restore the narrow glass/base crossings from the clean opposite side of
    // the same jar, leaving its etched edges and wood grain continuous.
    const repairMask = node(scene.defs, 'mask', { id: 'plate-2-wire-repairs', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 720, height: 720 });
    node(repairMask, 'rect', { width: 720, height: 720, fill: '#000' });
    backgroundWires.forEach(wire => node(repairMask, 'path', { ...wire, fill: 'none', stroke: '#fff' }));
    oldLetters.forEach(d => node(repairMask, 'path', { d, fill: '#fff', stroke: '#fff', 'stroke-width': 1 }));
    agentFrames.forEach(({shape}) => node(repairMask, 'path', { d: shape, fill: '#000', stroke: '#000', 'stroke-width': 1 }));
    const repairs = node(jarArt, 'g', { mask: 'url(#plate-2-wire-repairs)' });
    [
      { center: 106, box: [22, 176, 170, 252] },
      { center: 613.5, box: [526, 176, 172, 252] },
      { center: 226, box: [140, 439, 174, 246] },
      { center: 495, box: [410, 439, 168, 248] }
    ].forEach(({center,box}) => {
      const mirror = node(repairs, 'g', { transform: `translate(${center*2} 0) scale(-1 1)` });
      scene.cutout(rect(...box), mirror);
    });
    const hands = agentFrames.map(({ hand, pivot, scale }) => hand.map((value, axis) => pivot[axis] + (value-pivot[axis])*scale));
    // A single curve definition keeps the visible cord and its envelope aligned.
    const conversations = [
      { from: hands[0], via: [360, 306], to: hands[1] },
      { from: hands[1], via: [426, 382], to: hands[3] },
      { from: hands[3], via: [356, 561], to: hands[2] },
      { from: hands[2], via: [294, 382], to: hands[0] }
    ];
    const routes = node(scene.stage, 'g', { 'data-conversation-cords': '', fill: 'none', stroke: '#786b58', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
    conversations.forEach(({ from, via, to }, i) => node(routes, 'path', {
      d: `M${from.join(' ')}Q${via.join(' ')} ${to.join(' ')}`, 'data-conversation-cord': i
    }));
    // Glass and bases hide a letter until it clears the sending jar, and again
    // as it reaches the receiving jar. The actors remain in the foreground.
    const messages = node(scene.stage, 'g', { mask: scene.mask(jarOccluders, 3), 'data-message-route': '' });
    const envelopes = conversations.map((_, i) => envelope(scene, messages, `conversation-${i}`));
    const agentIndices = [1, 2, 3, 4];
    const gazes = agentIndices.map((i, j) => {
      const { shape, pivot: [x, y], scale } = agentFrames[j];
      const actor = node(scene.stage, 'g', { transform: `translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`, 'data-conversation-agent': i });
      scene.cutout(shape, actor, sources[2], oldWires);
      return scene.eyes(actor, i, i);
    });
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
      envelopes.forEach((envelope, i) => {
        const start = .02 + i * .23;
        const t = clamp((p - start) / .21), travel = ease(t);
        const {from,via,to} = conversations[i];
        const active = between(p,start,start+.025) * (1-between(p,start+.19,start+.23));
        opacity(envelope, active);
        const x = (1-travel)**2*from[0] + 2*(1-travel)*travel*via[0] + travel**2*to[0];
        const y = (1-travel)**2*from[1] + 2*(1-travel)*travel*via[1] + travel**2*to[1];
        const dx = 2*(1-travel)*(via[0]-from[0])+2*travel*(to[0]-via[0]);
        const dy = 2*(1-travel)*(via[1]-from[1])+2*travel*(to[1]-via[1]);
        let angle = Math.atan2(dy,dx)*180/Math.PI;
        if (angle > 90) angle -= 180;
        if (angle < -90) angle += 180;
        placeEnvelope(envelope, x, y, angle, .9);
      });
    };
  }

  function consequence() {
    const scene = plate(3);
    const actorBounds = [[37,204,161,179], [206,211,138,184], [357,221,141,178], [507,219,182,174]];
    const places = [[115,229], [605,229], [115,479], [605,479]];
    let confusedMouth;
    const gazes = actorBounds.map(([x,y,w,h], i) => {
      const [cx,cy] = places[i];
      const actor = node(scene.stage, 'g', { transform: `translate(${cx-(x+w/2)} ${cy-(y+h/2)}) scale(1)`, 'data-load-actor': i });
      scene.cutout(rect(x,y,w,h), actor);
      if (i === 0) confusedMouth = node(actor, 'path', { d: 'M117 267Q123 264 130 268', fill: 'none', stroke: '#42392d', 'stroke-width': 1.8, 'stroke-linecap': 'round', opacity: 0, 'data-confused-mouth': '' });
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
    // Four visible storage bays fill with the four incoming files.
    const storage=node(cabinet,'g',{'data-storage-bays':''});
    const bays=[0,1,2,3].map(i=>{
      const y=247+i*52;
      const bay=node(storage,'g',{'data-storage-bay':i});
      node(bay,'path',{d:`M263 ${y}L421 ${y+4}V${y+35}L263 ${y+31}Z`,fill:'#d8d2c2',stroke:'#756e5e','stroke-width':1.4,'fill-opacity':.92});
      const filled=node(bay,'path',{d:`M265 ${y+2}L419 ${y+6}V${y+33}L265 ${y+29}Z`,fill:'#739786',opacity:0,'data-bay-fill':i});
      const files=node(bay,'g',{opacity:0,'data-stored-file':i});
      [0,1,2].forEach(j=>node(files,'path',{d:`M${277+j*42} ${y+6}h25l5 5v14h-30ZM${302+j*42} ${y+6}v6h5`,fill:'#efe5cf',stroke:'#675f50','stroke-width':1.1}));
      return {filled,files};
    });
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
    function fileGlyph(parent,i,role='incoming-file') {
      const group=node(parent,'g',{[`data-${role}`]:i});
      node(group,'path',{d:'M-19-28H8L20-16V28H-19Z',fill:'#efe5cf',stroke:'#665e50','stroke-width':2.4,'stroke-linejoin':'round'});
      node(group,'path',{d:'M8-28V-16H20M-11-7H11M-11 1H11M-11 9H7M-11 17H3',fill:'none',stroke:'#8e8069','stroke-width':1.7});
      return group;
    }
    const departures=[[164,257],[558,257],[164,503],[558,503]];
    const starts=[.025,.18,.335,.49];
    const files=departures.map((_,i)=>fileGlyph(scene.stage,i));
    const overflow=[0,1,2,3].map(i=>fileGlyph(scene.stage,i,'overflow-file'));
    const debris=Array.from({length:7},(_,i)=>{
      const angle=i*2.39996;
      const part=node(scene.stage,'path',{d:i%3?'M-3-5L4-2L2 5L-4 2Z':'M-5-2L5-3L4 2L-4 3Z',fill:i%2?'#8e9b9c':'#c8b49a',stroke:'#494b48','stroke-width':.8,opacity:0,'data-explosion-debris':i});
      return {part,angle,reach:25+(i%3)*10,spin:(i%2?1:-1)*(45+i*8)};
    });
    const blast=node(scene.stage,'g',{'data-explosion-blast':'',opacity:0});
    node(blast,'path',{d:'M-35 10Q-48-9-29-23Q-22-42 1-29Q21-43 31-22Q50-7 34 12Q37 31 13 28Q-7 40-20 25Q-42 31-35 10Z',fill:'#b5a794','fill-opacity':.22,stroke:'#897a66','stroke-width':1.2});
    node(blast,'path',{d:'M-28-13l9 5M-20-24l10 7M17-25l-5 9M31-12l-10 5M25 17l-9-5M-27 17l10-6',fill:'none',stroke:'#897a66','stroke-width':1,opacity:.5});
    // Illustrative dialogue, timed to the loss rather than a recorded transcript quote.
    const question = node(scene.stage, 'g', { 'data-backup-question': '', opacity: 0 });
    node(question, 'path', { d: 'M54 14H364Q382 14 382 32V104Q382 122 364 122H154L127 143L132 122H54Q36 122 36 104V32Q36 14 54 14Z', fill: '#f4eddf', stroke: '#756958', 'stroke-width': 2, 'stroke-linejoin': 'round' });
    const questionText = node(question, 'text', { x: 58, y: 59, fill: '#302e2b', 'font-family': 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif', 'font-size': 48, 'font-weight': 500 });
    node(questionText, 'tspan', { x: 58, y: 59 }).textContent = 'Where is my';
    node(questionText, 'tspan', { x: 58, y: 108 }).textContent = 'backup?';
    return p=>{
      const reset=between(p,.94,1);
      const reaction=between(p,.81,.86)*(1-reset);
      opacity(question,between(p,.845,.875)*(1-reset));
      opacity(confusedMouth,reaction);
      scene.svg.dataset.reaction=reaction >= .999 ? 'confused' : reaction > 0 ? 'noticing' : 'working';
      const received=starts.map(start=>between(p,start+.105,start+.14));
      const load=received.reduce((sum,value)=>sum+value,0)/4*(1-reset);
      const damage=between(p,.78,.79)*(1-reset);
      const flight=clamp((p-.78)/.115);
      const outward=1-(1-flight)**3;
      const rebuild=1-reset;
      scene.svg.dataset.capacity=load.toFixed(3);
      scene.svg.dataset.filesReceived=String(p>.94?0:received.filter(v=>v===1).length);
      scene.svg.dataset.damageState=p>.94?'resetting':p>=.895?'wrecked':p>=.78?'exploding':p>=.63?'full':'loading';
      fill.setAttribute('width',(150*load).toFixed(2));
      const heat=clamp((load-.3)/.7);
      fill.setAttribute('fill',`rgb(${[lerp(105,241,heat),lerp(173,64,heat),lerp(157,47,heat)].map(Math.round).join(',')})`);
      bays.forEach(({filled,files},i)=>{
        opacity(filled,received[i]*(1-damage)*(1-reset));
        opacity(files,received[i]*(1-damage)*(1-reset));
        filled.setAttribute('fill',`rgb(${[lerp(111,200,heat),lerp(149,66,heat),lerp(130,46,heat)].map(Math.round).join(',')})`);
      });
      opacity(storage,1-damage);
      opacity(intact,1-damage);opacity(wreck,damage);
      const pressure=between(p,.65,.775)*(1-between(p,.78,.795));
      const shake=Math.sin(p*600)*1.5*pressure;
      cabinet.setAttribute('transform',`translate(${343+shake} 341) scale(${1+.045*pressure} ${1+.02*pressure}) translate(-343 -341)`);
      fragments.forEach(({element,center,dx,dy,turn,lift},i)=>{
        const height=dy*flight*flight-4*lift*flight*(1-flight);
        transform(element,dx*outward*rebuild,height*rebuild,turn*outward*rebuild,...center);
        opacity(element,damage);
      });
      smokePuffs.forEach(({puff,x,y,dx,dy},i)=>{
        const drift=between(p,.79,.94);
        puff.setAttribute('transform',`translate(${x+dx*drift} ${y+dy*drift}) scale(${.2+drift*.55})`);
        opacity(puff,between(p,.79+i*.002,.83+i*.002)*(1-between(p,.875+i*.005,.935))*.18*rebuild);
      });
      files.forEach((file,i)=>{
        const travel=between(p,starts[i],starts[i]+.13), [x,y]=departures[i];
        const slotX=348,slotY=267+i*52;
        let px=(1-travel)**2*x+2*(1-travel)*travel*lerp(x,slotX,.65)+travel**2*slotX;
        let py=lerp(y,slotY,travel)-55*Math.sin(Math.PI*travel);
        let size=1-.85*between(travel,.72,1),alpha=1-between(travel,.86,1),angle=12*Math.sin(Math.PI*travel)*(i%2?1:-1);
        if(p>.94){px=lerp(slotX,x,reset);py=lerp(slotY,y,reset);size=lerp(.15,1,reset);alpha=reset;angle=0;}
        file.setAttribute('transform',`translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${size.toFixed(3)})`);
        opacity(file,alpha);
        file.dataset.fileState=p>.94?'returning':travel===1?'stored':travel>0?'moving':'held';
        let lookX=i%2?-1:1, lookY=p>=.78?-.2:travel>0&&travel<1?-.5:.1;
        if (i === 0) {
          lookX=lerp(lookX,track(p,[[0,1],[.875,1],[.915,-.1],[1,-.1]]),reaction);
          lookY=lerp(lookY,track(p,[[0,-.2],[.875,-.2],[.915,1],[1,1]]),reaction);
        }
        gazes[i](lookX,lookY,0,i === 0 ? reaction : 0);
      });
      overflow.forEach((paper,i)=>{
        const dx=[-85,77,-62,68][i],dy=[-53,-43,76,83][i];
        paper.setAttribute('transform',`translate(${343+dx*outward} ${341+dy*outward}) rotate(${(i%2?1:-1)*35*outward}) scale(.48)`);
        opacity(paper,damage*(1-between(p,.88,.94)));
      });
      debris.forEach(({part,angle,reach,spin},i)=>{
        const x=Math.cos(angle)*reach*outward, y=Math.sin(angle)*reach*outward+120*flight*flight;
        transform(part,343+x*rebuild,341+y*rebuild,spin*outward);
        opacity(part,damage*(1-between(p,.925,1)));
      });
      const impact=between(p,.78,.825);
      opacity(blast,between(p,.78,.79)*(1-between(p,.81,.855))*.7*rebuild);
      blast.setAttribute('transform',`translate(343 341) scale(${.35+impact*.65})`);
    };
  }

  const STORY_DURATION = 24000;
  const STORY_STARTS = [0, 2000, 7000, 12000].map(time => time / STORY_DURATION);
  const STORY_ENDS = [2000, 7000, 12000, 23000].map(time => time / STORY_DURATION);
  function storyProgress(p) {
    const reset = between(p, STORY_ENDS[3], 1);
    return STORY_STARTS.map((start,i) => {
      const finish = i === 3 ? .94 : 1;
      // Keep the existing action timing, then hold the loss reaction for three seconds.
      const activeSpan = i === 3 ? 8000 / STORY_DURATION : STORY_ENDS[i]-start;
      const progress = finish * clamp((p-start)/activeSpan);
      return i === 3 ? lerp(progress,1,reset) : progress;
    });
  }

  async function start() {
    try {
      await Promise.all([...sources, SERVER_ART].map(source => {
        const image = new Image();
        image.src = source;
        return image.decode();
      }));
    } catch { return false; }
    const draw = [exploration(), transmission(), communication(), consequence()];
    let elapsed = 0;
    const visible = [false, false, false, false];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    // This function runs only after Play is pressed. Offscreen scenes suspend
    // the same clock, and reduced motion uses a slower pace.
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
      button.querySelector('[data-flow-label]').textContent = paused ? 'Play animation' : 'Pause animation';
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
    return true;
  }

  // Leave the original stills in place until the visitor chooses to animate.
  // Initialize once, then use the same button to pause and resume the clock.
  async function launch() {
    button.disabled = true;
    const started = await start();
    button.disabled = false;
    if (!started) button.addEventListener('click', launch, { once: true });
  }
  button.hidden = false;
  button.addEventListener('click', launch, { once: true });
})();
