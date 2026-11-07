/* Four agents share a galactic disk. Action nodes and message links come from the replay. */
(() => {
  const TAU = Math.PI * 2;
  const STEPS = 152;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const textures = new Map();
  const bodies = [
    { size: 1.02, low: [18, 67, 123], high: [154, 206, 230] },
    { size: 1.10, low: [24, 85, 78], high: [174, 221, 186] },
    { size: .99, low: [136, 78, 44], high: [249, 215, 150] },
    { size: .92, low: [74, 83, 103], high: [211, 214, 208] }
  ];

  function hash(x, y) {
    let n = Math.imul(x + 1777, 374761393) ^ Math.imul(y + 397, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }
  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const u = ease(x - ix), v = ease(y - iy);
    return lerp(lerp(hash(ix, iy), hash(ix + 1, iy), u),
      lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
  }
  function terrain(u, v) {
    return .55 * noise(u, v) + .28 * noise(2.1 * u + 8, 2.1 * v) +
      .13 * noise(4.4 * u, 4.4 * v + 17) + .04 * noise(9 * u, 9 * v);
  }

  // Cache surface maps and sphere lighting. Rotation then only samples the maps.
  const MAP_WIDTH = 256, MAP_HEIGHT = 112, DISC_SIZE = 116;
  let disc = null;
  function sphereDisc() {
    if (disc) return disc;
    disc = [];
    for (let py=0; py<DISC_SIZE; py++) for (let px=0; px<DISC_SIZE; px++) {
      const x=(2*px+1)/DISC_SIZE-1, y=(2*py+1)/DISC_SIZE-1, rho=x*x+y*y;
      if (rho>=1) continue;
      const z=Math.sqrt(1-rho), sun=Math.max(0,-.62*x-.46*y+.63*z);
      disc.push({
        offset:4*(py*DISC_SIZE+px),
        u:Math.floor((Math.atan2(x,z)/TAU+.5)*MAP_WIDTH),
        row:Math.floor((Math.asin(y)/Math.PI+.5)*MAP_HEIGHT)*MAP_WIDTH,
        shade:.17+.88*sun**.75,
        rim:(1-z)**3*(.19+.25*sun),
        alpha:255*clamp((1-Math.sqrt(rho))*DISC_SIZE/2,0,1)
      });
    }
    return disc;
  }
  function surfaceMap(index) {
    const material=bodies[index], map=new Uint8ClampedArray(MAP_WIDTH*MAP_HEIGHT*3);
    const craters=Array.from({length:100},(_,i)=>{
      const a=TAU*hash(i,1), h=2*hash(i,2)-1, cos=Math.sqrt(1-h*h);
      const radius=.035+hash(i,3)**3*.18;
      return {x:Math.sin(a)*cos, y:h, z:Math.cos(a)*cos, radius};
    });
    for (let iy=0; iy<MAP_HEIGHT; iy++) {
      const v=((iy+.5)/MAP_HEIGHT-.5)*Math.PI, y=Math.sin(v), cos=Math.cos(v);
      for (let ix=0; ix<MAP_WIDTH; ix++) {
        const u=((ix+.5)/MAP_WIDTH-.5)*TAU, x=Math.sin(u)*cos, z=Math.cos(u)*cos;
        const relief=terrain(x*4+z*1.8+11*index,y*4.3+z*2.7+4);
        const latitude=v+x*(index===1?.25:-.13);
        let tint=relief, detail=0;
        if (index===0) {
          const ice=ease(clamp((relief-.45)*5,0,1));
          const cloud=terrain(x*5.7+3*relief+z,v*10+2*Math.sin(u));
          tint=.13+.55*ice+.32*ease(clamp((cloud-.49)*6,0,1));
        } else if (index===1 || index===2) {
          const swirl=Math.sin(u*2+v*4)*.16+relief*.43;
          const bands=.5+.5*Math.sin(14*latitude+6*swirl);
          tint=.22+.40*bands+.24*relief+.11*Math.sin(35*latitude+8*swirl);
        } else {
          tint=.21+.76*relief;
          for (const crater of craters) {
            const dx=x-crater.x, dy=y-crater.y, dz=z-crater.z;
            const distance=dx*dx+dy*dy+dz*dz;
            if (distance>1.32*crater.radius*crater.radius) continue;
            const d=Math.sqrt(distance)/crater.radius;
            detail-=.32*Math.max(0,1-d*d);
            detail+=.38*Math.max(0,1-Math.abs(d-.85)*5)*(.5-(dx+dy)/(2*crater.radius));
          }
        }
        const grain=(hash(ix+index*MAP_WIDTH,iy)-.5)*(index===3?18:6);
        const offset=3*(iy*MAP_WIDTH+ix);
        for (let c=0; c<3; c++) {
          map[offset+c]=lerp(material.low[c],material.high[c],clamp(tint,0,1))*(1+detail)+grain;
        }
      }
    }
    return map;
  }
  function texture(index, seconds) {
    let sprite=textures.get(index);
    if (!sprite) {
      const canvas=document.createElement('canvas');
      canvas.width=canvas.height=DISC_SIZE;
      const context=canvas.getContext('2d');
      sprite={canvas,context,map:surfaceMap(index),pixels:context.createImageData(DISC_SIZE,DISC_SIZE),step:-1};
      textures.set(index,sprite);
    }
    const speeds=[6,8,7,3], step=Math.floor(seconds*speeds[index])%MAP_WIDTH;
    if (sprite.step===step) return sprite.canvas;
    const pixels=sprite.pixels.data, material=bodies[index];
    for (const p of sphereDisc()) {
      const at=3*(p.row+(p.u+step)%MAP_WIDTH);
      for (let c=0; c<3; c++) pixels[p.offset+c]=sprite.map[at+c]*p.shade+material.high[c]*p.rim;
      pixels[p.offset+3]=p.alpha;
    }
    sprite.context.putImageData(sprite.pixels,0,0);sprite.step=step;
    return sprite.canvas;
  }

  function line(ctx, points, ink, width = 1) {
    if (points.length < 2) return;
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.strokeStyle = ink; ctx.lineWidth = width; ctx.stroke();
  }
  function circle(ctx, x, y, radius, ink, outline = false) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU);
    if (outline) { ctx.strokeStyle = ink; ctx.lineWidth = 1; ctx.stroke(); }
    else { ctx.fillStyle = ink; ctx.fill(); }
  }
  function bloom(ctx, x, y, radius, ink, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, ink + alpha); g.addColorStop(.42, ink + '12'); g.addColorStop(1, ink + '00');
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function rings(ctx, x, y, radius, front, dark) {
    const bands = [[1.29, .035, '#b9925e'], [1.42, .095, '#d4b786'],
      [1.56, .062, '#a18159'], [1.68, .04, '#dec99f']];
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.30);
    ctx.globalAlpha *= dark ? .93 : .88;
    for (const [span, weight, ink] of bands) {
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * span, radius * span * .275, 0,
        front ? 0 : Math.PI, front ? Math.PI : TAU);
      ctx.strokeStyle = ink; ctx.lineWidth = Math.max(.65, radius * weight); ctx.stroke();
    }
    ctx.restore();
  }
  function planet(ctx, x, y, radius, index, ink, active, dark, seconds) {
    const ringed = index % bodies.length === 2;
    ctx.save();
    if (active) {
      bloom(ctx, x, y, radius * 2.15, ink, dark ? '69' : '38');
      const rim = radius + 4;
      ctx.strokeStyle = ink + (dark ? 'af' : '92'); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x,y,rim,-2.95,-1.95); ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,rim,.22,1.2); ctx.stroke();
    }
    if (ringed) rings(ctx, x, y, radius, false, dark);
    ctx.drawImage(texture(index,seconds), x - radius, y - radius, radius * 2, radius * 2);
    circle(ctx, x, y, radius - .3, ink + (active ? '96' : '61'), true);
    if (ringed) rings(ctx, x, y, radius, true, dark);
    ctx.restore();
  }

  const DISK_RADIUS = 230;
  const ATLAS_RADIUS = 278;
  const ARM_ANGLE = TAU / 4;
  const galaxyMaps = new Map();

  function winding(radius) {
    const r = radius / DISK_RADIUS;
    return .32 - 5.45 * r ** .78 + .12 * Math.sin(4 * r);
  }

  function orbitPoint(track, progress) {
    const radius = lerp(67, DISK_RADIUS, progress);
    const angle = track.index * ARM_ANGLE + winding(radius);
    return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
  }

  // The dust, the central bulge and the action tracks are drawn in the same disk coordinates.
  // Background stars are paint only. Hit testing uses the separate map of recorded events.
  function galaxyMap(dark) {
    if (galaxyMaps.has(dark)) return galaxyMaps.get(dark);
    const map = document.createElement('canvas');
    const size = 640;
    map.width = map.height = size;
    const context = map.getContext('2d');
    const pixels = context.createImageData(size, size);
    const unit = ATLAS_RADIUS * 2 / size;
    const cold = dark ? [133,165,211] : [105,134,169];
    const warm = dark ? [255,226,175] : [164,116,65];

    for (let row = 0; row < size; row++) {
      const y = (row + .5 - size / 2) * unit;
      for (let col = 0; col < size; col++) {
        const x = (col + .5 - size / 2) * unit;
        const radius = Math.hypot(x,y), r = radius / DISK_RADIUS;
        if (r > 1.19) continue;
        const taper = 1 - ease(clamp((r - .81) / .38, 0, 1));
        const phase = Math.atan2(y,x) - winding(radius);
        const arm = Math.round(phase / ARM_ANGLE);
        const width = 5.1 + 8.6 * r;
        const cloud = terrain(x * .047 + 6, y * .047 + 13);
        const offset = radius * Math.sin(phase - arm * ARM_ANGLE) + (cloud - .5) * width * 1.55;
        const band = offset / width;
        const ridge = Math.exp(-.60 * band * band);
        const mist = Math.exp(-.08 * band * band);
        const dustLane = Math.exp(-5.4 * (band + .50) ** 2);
        const bulge = Math.exp(-Math.hypot(x * .82, y * 1.15) / 18.5);
        const disk = Math.exp(-r * r * 2.6);
        const strength = arm % 2 === 0 ? 1 : .78;
        const clouds = (.18 + .84 * cloud * cloud) * strength * (.82 + .18 * disk);
        const stars = taper * (.073 * disk + clouds * (.69 * ridge + .25 * mist) * (1 - .68 * dustLane));
        const core = .98 * bulge;
        const heat = clamp((core + .08 * disk) / (core + stars + .10), 0, 1);
        const pixel = 4 * (row * size + col);
        for (let c = 0; c < 3; c++) {
          pixels.data[pixel+c] = lerp(cold[c], warm[c], heat);
        }
        pixels.data[pixel+3] = 255 * clamp((core + stars) * (dark ? 1 : .67), 0, 1);
      }
    }
    context.putImageData(pixels, 0, 0);
    context.setTransform(1/unit,0,0,1/unit,size/2,size/2);
    const inks = dark ? ['#cedcf5','#a6bbd9','#dfcfb2'] : ['#576d88','#71849b','#947c61'];
    for (let i = 0; i < 9200; i++) {
      const seed = hash(i,61), spread = hash(i,62) + hash(i,63) + hash(i,64) - 1.5;
      let radius, angle;
      if (i < 6800) {
        radius = 12 + 234 * seed;
        angle = i % 4 * ARM_ANGLE + winding(radius) + spread * (9 + radius * .076) / radius;
      } else if (i < 8350) {
        radius = -Math.log(Math.max(.002,seed)) * 14.5;
        angle = TAU * hash(i,65);
      } else {
        radius = 247 * Math.sqrt(seed);
        angle = TAU * hash(i,66);
      }
      const shine = hash(i,67), starSize = .22 + .66 * shine ** 4;
      const fade = 1 - ease(clamp((radius - DISK_RADIUS * .83) / 64, 0, 1));
      context.globalAlpha = fade * (.14 + .70 * shine) * (dark ? 1 : .68);
      context.fillStyle = inks[radius < 42 ? 2 : i % inks.length];
      context.fillRect(Math.cos(angle)*radius,Math.sin(angle)*radius,starSize,starSize);
    }
    context.globalAlpha = 1;
    galaxyMaps.set(dark,map);
    return map;
  }

  // Orthographic projection keeps every arm and its dust aligned during rotation and drag.
  function projectDisk({width,height,yaw,pitch}) {
    const narrow = clamp((470 - width) / 190, 0, 1);
    const inclination = Math.max(.10, pitch - narrow * .29);
    const tilt = Math.cos(inclination), lift = Math.sin(inclination);
    const roll = -.17, cr = Math.cos(roll), sr = Math.sin(roll);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const roof = width < 440 ? 45 : 29, foot = width < 440 ? 15 : 13;
    const edge = width < 440 ? 18 : 28;
    const extentX = Math.hypot(cr, sr * tilt), extentY = Math.hypot(sr, cr * tilt);
    const scale = Math.min(
      (width - 2 * edge) / (2 * DISK_RADIUS * extentX),
      (height - roof - foot) / (2 * DISK_RADIUS * extentY)
    );
    const matrix = [
      scale * (cr * cy - sr * sy * tilt), scale * (sr * cy + cr * sy * tilt),
      scale * (-cr * sy - sr * cy * tilt), scale * (-sr * sy + cr * cy * tilt),
      width / 2, roof + (height - roof - foot) / 2
    ];
    const project = ([x,y,z]) => [
      matrix[4] + matrix[0]*x + matrix[2]*y + scale * sr * lift * z,
      matrix[5] + matrix[1]*x + matrix[3]*y - scale * cr * lift * z
    ];
    return { matrix, scale, project };
  }
  function arc(start, end, lift, bend, exit, entry) {
    const dx = end[0] - start[0], dy = end[1] - start[1];
    const a = [start[0] + .33 * dx - bend * dy, start[1] + .33 * dy + bend * dx, start[2] + lift];
    const b = [end[0] - .22 * dx - bend * dy, end[1] - .22 * dy + bend * dx, end[2] + .72 * lift];
    const reach = Math.min(52, Math.hypot(dx,dy)*.25);
    for (let axis = 0; axis < 3; axis++) {
      if (exit) a[axis] += exit[axis] * reach;
      if (entry) b[axis] -= entry[axis] * reach;
    }
    return Array.from({ length: 37 }, (_, i) => {
      const t = i / 36, s = 1 - t;
      return start.map((value, axis) => s ** 3 * value + 3 * s * s * t * a[axis] +
        3 * s * t * t * b[axis] + t ** 3 * end[axis]);
    });
  }
  function measuredPath(points) {
    let total = 0;
    const lengths = points.map((point, i) => {
      if (i) total += Math.hypot(point[0] - points[i - 1][0], point[1] - points[i - 1][1]);
      return total;
    });
    return { points, lengths, total };
  }
  function onPath(path, fraction) {
    const distance = clamp(fraction, 0, 1) * path.total;
    let i = 1;
    while (i < path.lengths.length - 1 && path.lengths[i] < distance) i++;
    const k = (distance - path.lengths[i - 1]) / (path.lengths[i] - path.lengths[i - 1] || 1);
    return [0, 1].map(axis => lerp(path.points[i - 1][axis], path.points[i][axis], k));
  }

  window.createTrajectoryOrbitView = ({ canvas, actors, actorEvents, connections, sendIndex, fontFamily }) => {
    const ctx = canvas.getContext('2d');
    const base = document.createElement('canvas'), ground = base.getContext('2d');
    const tracks = actors.map((actor, i) => {
      const identity = ['A','B','C','D'].indexOf(actor.id);
      const index = identity < 0 ? i % bodies.length : identity;
      const track = { id: actor.id, index, material: bodies[index],
        events: actorEvents.get(actor.id), from: 0, to: 0, last: null };
      track.path = Array.from({ length: STEPS + 1 }, (_, j) => orbitPoint(track, j / STEPS));
      return track;
    });
    const nodes = new Map();
    for (const track of tracks) {
      track.nodes = track.events.map((event, i) => {
        const t = (i + 1) / Math.max(1, track.events.length);
        const point = orbitPoint(track, t);
        const ahead = orbitPoint(track, t + .0005);
        const delta = ahead.map((n, axis) => n - point[axis]);
        const length = Math.hypot(...delta);
        const node = { event, t, point, tangent: delta.map(n => n / length) };
        nodes.set(event.id, node);
        return node;
      });
    }
    let moment = null, selectedAt = 0, moving = false, previousReads = [], cache = null;

    function progress(track, seconds) {
      return moving ? lerp(track.from, track.to, ease(clamp((seconds - selectedAt) / .85, 0, 1))) : track.to;
    }
    function select(next, seconds, animate) {
      for (const track of tracks) {
        track.from = progress(track, seconds);
        track.last = track.nodes.findLast(node => node.event.id <= next.event) || null;
        track.to = track.last?.t ?? 0;
      }
      moment = next; selectedAt = seconds; moving = animate; cache = null;
      const pairs = new Set();
      previousReads = [];
      for (let i = connections.length - 1; i >= 0; i--) {
        const item = connections[i], key = item.message.actor + '/' + item.actor;
        if (item.order >= next.order || item.kind !== 'read' || item.message === next.message || pairs.has(key)) continue;
        pairs.add(key); previousReads.push(item);
        if (previousReads.length >= (next.kind === 'outcome' ? 6 : 2)) break;
      }
    }

    function transfer(item) {
      const sender = nodes.get(item.message.event), receiver = nodes.get(item.event);
      if (!sender || !receiver) return null;
      // One stable location per posted message, offset from its source arm and the nucleus.
      const [x,y] = sender.point;
      const angle = Math.atan2(y,x) - .31, radius = Math.hypot(x,y) * .57;
      const post = [radius*Math.cos(angle),radius*Math.sin(angle),22];
      const posted = arc(sender.point,post,38,-.16,sender.tangent,null);
      const read = item.kind === 'read' ? arc(post,receiver.point,48,.18,null,receiver.tangent) : [];
      return { posted, read };
    }

    function prepare(view, paint, scale) {
      const side = Math.min(1536, Math.max(640, Math.ceil(2*ATLAS_RADIUS*scale*view.dpr)));
      if (base.width !== side) base.width = base.height = side;
      else {
        ground.setTransform(1,0,0,1,0,0);
        ground.clearRect(0,0,side,side);
      }
      const unit = side/(2*ATLAS_RADIUS), pen = 1/scale;
      ground.setTransform(unit,0,0,unit,side/2,side/2);
      ground.drawImage(galaxyMap(paint.dark),-ATLAS_RADIUS,-ATLAS_RADIUS,2*ATLAS_RADIUS,2*ATLAS_RADIUS);
      ground.lineCap = 'round'; ground.lineJoin = 'round';
      for (const track of tracks) {
        const ink = paint.agents.get(track.id) || paint.muted;
        const relevant = track.id === moment.actor || track.id === moment.message?.actor || moment.kind === 'outcome';
        const cut = Math.floor(track.to * STEPS), boundary = orbitPoint(track,track.to);
        const past = track.path.slice(0,cut+1).concat([boundary]);
        ground.setLineDash([2*pen,3.7*pen]);
        line(ground,[boundary,...track.path.slice(cut+1)],ink+(relevant?'76':'48'),.95*pen);
        ground.setLineDash([]);
        line(ground,past,ink+(paint.dark?'1a':'0c'),3.9*pen);
        line(ground,past,ink+(relevant?'c3':'84'),(relevant?1.5:1.05)*pen);
        for (const node of track.nodes) {
          const e = node.event, [x,y] = node.point;
          const inkHere = ink + (e.id > moment.event ? '73' : relevant ? 'ff' : 'bf');
          if (e.messages.length) {
            const r = 2.9*pen;
            ground.beginPath(); ground.moveTo(x,y-r); ground.lineTo(x+r,y);
            ground.lineTo(x,y+r); ground.lineTo(x-r,y); ground.closePath();
            ground.fillStyle = inkHere; ground.fill();
          } else if (e.reads.length) {
            ground.beginPath(); ground.arc(x,y,2.65*pen,0,TAU);
            ground.fillStyle = paint.paper; ground.fill();
            ground.lineWidth = 1.1*pen; ground.strokeStyle = inkHere; ground.stroke();
          } else circle(ground,x,y,(track.nodes.length>90?1.4:1.85)*pen,inkHere);
        }
      }
      return { scale, dpr:view.dpr, paint, link:moment.message ? transfer(moment) : null, history:previousReads.map(transfer).filter(Boolean) };
    }

    function drawTransfer(link, project, paint, hits) {
      const posted = link.posted.map(project), read = link.read.map(project);
      const sender = paint.agents.get(moment.message.actor), reader = paint.agents.get(moment.actor);
      for (const [points,ink] of [[posted,sender],[read,reader]]) {
        if (!points.length) continue;
        line(ctx,points,paint.paper,3.4);
        line(ctx,points,ink+'12',9); line(ctx,points,ink+'46',3.4); line(ctx,points,ink,1.65);
        const i = Math.floor(points.length*.69), tip = points[i];
        const angle = Math.atan2(tip[1]-points[i-1][1],tip[0]-points[i-1][0]);
        ctx.save(); ctx.translate(...tip); ctx.rotate(angle);
        line(ctx,[[-3.4,-2.6],[0,0],[-3.4,2.6]],ink,1.4); ctx.restore();
      }
      const [x,y] = posted[0];
      circle(ctx,x,y,4,paint.paper); circle(ctx,x,y,4,sender,true);
      hits.push({x,y,event:moment.message.event,moment:sendIndex.get(moment.message.id),r:7});
      return { posted, read, path:measuredPath(posted.concat(read.slice(1))) };
    }
    function comet(link, seconds, paint, reduced) {
      const phase = ((seconds-selectedAt) / 2.95) % 1;
      const travel = reduced ? .65 : clamp(phase/.84,0,1);
      const pos = onPath(link.path, travel);
      const portion = link.posted.length === link.path.points.length ? 1 :
        link.path.lengths[link.posted.length-1] / (link.path.total || 1);
      const ink = paint.agents.get(travel <= portion ? moment.message.actor : moment.actor);
      if (!reduced) {
        const start = Math.max(0,travel-32/Math.max(1,link.path.total));
        for (let i=0; i<12; i++) {
          const a=onPath(link.path,lerp(start,travel,i/12));
          const b=onPath(link.path,lerp(start,travel,(i+1)/12));
          ctx.globalAlpha=.12+.80*i/12; line(ctx,[a,b],ink,1+2.1*i/12);
        }
        ctx.globalAlpha=1;
        if (phase>.80) {
          const arrival=(phase-.80)/.20;
          const [x,y]=link.path.points.at(-1);
          ctx.globalAlpha=(1-arrival)*.7;
          circle(ctx,x,y,9+24*arrival,ink,true);ctx.globalAlpha=1;
        }
      }
      bloom(ctx,...pos,11,ink,'65'); circle(ctx,...pos,3.5,ink);circle(ctx,...pos,1.6,'#f4faff');
    }

    function label(text, x, y, limits, paint, ink, occupied) {
      ctx.font='600 '+(limits.width<440?'10':'12')+'px '+fontFamily;
      const w=ctx.measureText(text).width+8, h=18;
      const choices = [[x+limits.radius+5,y-h/2],[x-limits.radius-w-5,y-h/2],
        [x-w/2,y+limits.radius+5],[x-w/2,y-limits.radius-h-5]];
      let best=null, penalty=Infinity;
      for (const [cx,cy] of choices) {
        const bx=clamp(cx,3,limits.width-w-3), by=clamp(cy,31,limits.height-h-3);
        let score=Math.abs(bx-cx)+Math.abs(by-cy);
        for (const other of occupied) {
          score+=Math.max(0,Math.min(bx+w,other.x+other.w)-Math.max(bx,other.x))*
            Math.max(0,Math.min(by+h,other.y+other.h)-Math.max(by,other.y));
        }
        if(score<penalty){penalty=score;best={x:bx,y:by,w,h};}
      }
      ctx.fillStyle=paint.paper;ctx.globalAlpha=.88;
      ctx.beginPath();ctx.roundRect(best.x,best.y,w,h,4);ctx.fill();ctx.globalAlpha=1;
      ctx.fillStyle=ink;ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(text,best.x+4,best.y+h/2);
      occupied.push(best);
    }

    function draw(view, paint, seconds, reduced, hover) {
      if (!ctx || !moment || view.width<=0 || view.height<=0) return [];
      const { width,height,dpr } = view;
      const { scale,matrix,project } = projectDisk(view);
      if (!cache || cache.paint !== paint || cache.scale !== scale || cache.dpr !== dpr) {
        cache = prepare(view,paint,scale);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,width,height);
      ctx.save(); ctx.transform(...matrix);
      ctx.drawImage(base,-ATLAS_RADIUS,-ATLAS_RADIUS,2*ATLAS_RADIUS,2*ATLAS_RADIUS);
      ctx.restore();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const hits = [], occupied = [], labels = [];
      for (const node of nodes.values()) {
        const [x,y] = project(node.point);
        hits.push({x,y,event:node.event.id,r:5.5});
      }
      ctx.setLineDash([2,5]);
      for (const route of cache.history) {
        line(ctx,route.posted.concat(route.read.slice(1)).map(project),paint.guide + (paint.dark?'32':'38'),.8);
      }
      ctx.setLineDash([]);
      const activeLink = cache.link ? drawTransfer(cache.link,project,paint,hits) : null;
      const planetRadius = clamp(Math.min(width,height)*.043,9.4,18.6);
      for (const track of tracks) {
        const [x,y] = project(orbitPoint(track,progress(track,seconds)));
        const active = track.id===moment.actor || track.id===moment.message?.actor;
        const ink=paint.agents.get(track.id)||paint.muted, radius=planetRadius*track.material.size;
        ctx.save();ctx.globalAlpha=active||moment.kind==='outcome'?1:.84;
        planet(ctx,x,y,radius,track.index,ink,active,paint.dark,reduced?0:seconds);ctx.restore();
        occupied.push({x:x-radius-2,y:y-radius-2,w:2*radius+4,h:2*radius+4});
        labels.push({text:'Agent '+track.id,x,y,radius:radius*(track.index%4===2?1.45:1),ink:active?ink:paint.muted});
        if (track.last) {
          const hit={x,y,event:track.last.event.id,r:radius+3,planet:true};
          if (hit.event===moment.event && track.id===moment.actor) hit.moment=moment.order;
          hits.push(hit);
        }
      }
      if (activeLink) {
        const link=activeLink, [x,y]=link.posted.at(-1), ink=paint.agents.get(moment.message.actor);
        bloom(ctx,x,y,16,ink,'4d');
        circle(ctx,x,y,8,paint.paper);circle(ctx,x,y,8,ink+'b8',true);
        ctx.strokeStyle=ink;ctx.lineWidth=1.15;ctx.strokeRect(x-4.6,y-3.1,9.2,6.2);
        line(ctx,[[x-4.6,y-3.1],[x,y+.4],[x+4.6,y-3.1]],ink,1);
        comet(link,seconds,paint,reduced);
        hits.push({x,y,message:moment.message.id,event:moment.message.event,moment:sendIndex.get(moment.message.id),r:9});
        occupied.push({x:x-8,y:y-8,w:16,h:16});
        labels.unshift({text:'Message '+String(moment.index+1).padStart(2,'0'),x,y,radius:8,ink:paint.ink});
      }
      for (const item of labels) label(item.text,item.x,item.y,{width,height,radius:item.radius},paint,item.ink,occupied);
      if (hover) circle(ctx,hover.x,hover.y,hover.r||7,paint.ink,true);
      return hits;
    }
    return { select, draw };
  };
})();
