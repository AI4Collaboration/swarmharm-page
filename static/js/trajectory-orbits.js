/* Recorded actions form each planet's orbit. Only recorded posts and reads cross orbits. */
(() => {
  const TAU = Math.PI * 2;
  const STEPS = 152;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const textures = new Map();
  const bodies = [
    { phase: 2.6, tilt: -.33, turns: 2.38, size: 1.02, low: [18, 67, 123], high: [154, 206, 230] },
    { phase: .7, tilt: .23, turns: 2.17, size: 1.10, low: [24, 85, 78], high: [174, 221, 186] },
    { phase: 4.0, tilt: -.21, turns: 2.27, size: .99, low: [136, 78, 44], high: [249, 215, 150] },
    { phase: 2.0, tilt: .19, turns: 2.41, size: .92, low: [74, 83, 103], high: [211, 214, 208] }
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

  // The open ellipse widens and advances in depth in each actor's own action order.
  function orbitPoint(track, t) {
    const { material, cx, cy } = track;
    const angle = material.phase + TAU * material.turns * t;
    const radius = lerp(39, 78, t);
    const u = 1.15 * radius * Math.cos(angle), v = .81 * radius * Math.sin(angle);
    const advance = t - .5;
    return [
      cx + u * Math.cos(material.tilt) - v * Math.sin(material.tilt) + 105 * advance,
      cy + u * Math.sin(material.tilt) + v * Math.cos(material.tilt) + 31 * advance,
      .47 * radius * Math.sin(angle) + 64 * advance
    ];
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
    const columns = Math.min(actors.length, 2), rows = Math.ceil(actors.length / columns);
    const tracks = actors.map((actor, i) => {
      const col = i % columns, row = Math.floor(i / columns);
      const identity = ['A','B','C','D'].indexOf(actor.id);
      const index = identity < 0 ? i % bodies.length : identity;
      const track = { id: actor.id, index, material: bodies[index],
        cx: (col - (columns - 1) / 2) * 280 + (row % 2 ? 10 : -8),
        cy: (row - (rows - 1) / 2) * 162 + (col ? -12 : 12),
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
    const beacon = [0, 0, 26];
    const sky = Array.from({ length: 82 }, (_, i) => [hash(i, 41), hash(i, 42), hash(i, 43)]);
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

    function layout(view) {
      const cosYaw = Math.cos(view.yaw), sinYaw = Math.sin(view.yaw);
      const cosPitch = Math.cos(view.pitch), sinPitch = Math.sin(view.pitch);
      function rotate([x,y,z]) {
        const depth = x * sinYaw + z * cosYaw;
        const perspective = 1000 / (1000 - .38 * (depth * cosPitch + y * sinPitch));
        return [(x * cosYaw - z * sinYaw) * perspective, (y * cosPitch - depth * sinPitch) * perspective];
      }
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (const track of tracks) for (const p of track.path) {
        const [x,y] = rotate(p);
        left = Math.min(left,x); right = Math.max(right,x); top = Math.min(top,y); bottom = Math.max(bottom,y);
      }
      const edge = view.width < 400 ? 26 : 43;
      const head = view.width < 520 ? 60 : 47, foot = 32;
      const sx = (view.width - 2 * edge) / Math.max(1,right-left);
      const sy = (view.height - head - foot) / Math.max(1,bottom-top);
      return point => {
        const [x,y] = rotate(point);
        return [edge + (x-left)*sx, head + (y-top)*sy];
      };
    }

    function transfer(item, project) {
      const sender = nodes.get(item.message.event), receiver = nodes.get(item.event);
      if (!sender || !receiver) return null;
      const posted = arc(sender.point, beacon, 85, -.20, sender.tangent, null).map(project);
      const read = item.kind === 'read' ? arc(beacon, receiver.point, 81, .22, null, receiver.tangent).map(project) : [];
      return { posted, read, path: measuredPath(posted.concat(read.slice(1))) };
    }

    function prepare(view, paint) {
      const { width, height, dpr } = view, project = layout(view);
      base.width = canvas.width; base.height = canvas.height;
      ground.setTransform(dpr, 0, 0, dpr, 0, 0);
      ground.lineCap = 'round'; ground.lineJoin = 'round';
      // The sky is a backdrop. Only marks attached to tracks participate in hit testing.
      for (const [u,v,k] of sky) {
        const x = 8 + u*(width-16), y = 36 + v*(height-50);
        const ink = paint.guide + (paint.dark ? '76' : '42');
        if (k > .93) {
          line(ground, [[x-2,y],[x+2,y]], ink, .7);
          line(ground, [[x,y-2],[x,y+2]], ink, .7);
        } else circle(ground, x, y, .4 + .58*k, ink);
      }
      const hits = [];
      for (const item of previousReads) {
        const link = transfer(item, project);
        if (!link) continue;
        ground.setLineDash([2, 5]);
        line(ground, link.path.points, paint.guide + (paint.dark ? '30' : '34'), .8);
        ground.setLineDash([]);
      }
      for (const track of tracks) {
        const ink = paint.agents.get(track.id) || paint.muted;
        const relevant = track.id === moment.actor || track.id === moment.message?.actor || moment.kind === 'outcome';
        const path = track.path.map(project), cut = Math.floor(track.to * STEPS);
        const boundary = project(orbitPoint(track,track.to));
        const past = path.slice(0,cut+1).concat([boundary]);
        ground.setLineDash([2,3.6]);
        line(ground,[boundary,...path.slice(cut+1)],ink+(relevant?'7c':'55'),.9);
        ground.setLineDash([]);
        line(ground, past, ink+(paint.dark?'12':'0b'),4);
        line(ground, past, ink+(relevant?'ac':'79'),relevant?1.35:1.05);
        for (const node of track.nodes) {
          const e = node.event, [x,y] = project(node.point), future = e.id > moment.event;
          const mark = ink + (future ? '62' : relevant ? 'ee' : 'ab');
          if (e.messages.length) {
            ground.beginPath(); ground.moveTo(x,y-2.7); ground.lineTo(x+2.7,y);
            ground.lineTo(x,y+2.7); ground.lineTo(x-2.7,y); ground.closePath();
            ground.fillStyle=mark; ground.fill();
          } else if (e.reads.length) {
            circle(ground,x,y,2.35,paint.paper);
            circle(ground,x,y,2.35,mark,true);
          } else {
            circle(ground,x,y,track.nodes.length>90?1.1:1.55,mark);
          }
          hits.push({x,y,event:e.id,r:5.5});
        }
      }
      const link = moment.message ? transfer(moment, project) : null;
      if (link) {
        const sender = paint.agents.get(moment.message.actor);
        const reader = paint.agents.get(moment.actor);
        for (const [points,ink] of [[link.posted,sender],[link.read,reader]]) {
          line(ground,points,ink+'0f',10); line(ground,points,ink+'29',4.3); line(ground,points,ink+'ef',1.65);
          if (points.length) {
            const i = Math.floor(points.length*.69), tip = points[i];
            const angle = Math.atan2(tip[1]-points[i-1][1],tip[0]-points[i-1][0]);
            ground.save(); ground.translate(...tip); ground.rotate(angle);
            line(ground,[[-3.4,-2.4],[0,0],[-3.4,2.4]],ink,1.4); ground.restore();
          }
        }
        const [x,y] = link.posted[0];
        circle(ground,x,y,4,paint.paper); circle(ground,x,y,4,sender,true);
        hits.push({x,y,event:moment.message.event,moment:sendIndex.get(moment.message.id),r:7});
      }
      return { ...view, paint, project, hits, link };
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
      if (!cache || cache.paint!==paint || cache.width!==view.width || cache.height!==view.height ||
          cache.dpr!==view.dpr || cache.yaw!==view.yaw || cache.pitch!==view.pitch) {
        cache=prepare(view,paint);
      }
      const { width,height,dpr }=view;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      ctx.drawImage(base,0,0,width,height);ctx.lineCap='round';ctx.lineJoin='round';
      const hits=cache.hits.slice(), occupied=[], labels=[];
      const planetRadius=clamp(width*.036,11,22);
      for (const track of tracks) {
        const [x,y]=cache.project(orbitPoint(track,progress(track,seconds)));
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
      if (cache.link) {
        const link=cache.link, [x,y]=link.posted.at(-1), ink=paint.agents.get(moment.message.actor);
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
