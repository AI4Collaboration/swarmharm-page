/* One stellar arm per recorded agent. Cross-arm routes come from verified reads. */
(() => {
  const TAU = 2 * Math.PI;
  const STEPS = 152;
  const agentIds = ['A', 'B', 'C', 'D'];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  function hash(x, y) {
    let n = Math.imul(x + 1777, 374761393) ^ Math.imul(y + 397, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
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

  const DISK_RADIUS = 230;
  const ATLAS_RADIUS = 278;
  const ARM_ANGLE = TAU / agentIds.length;

  function orbitPoint(track, progress) {
    const radius = lerp(26 + 3 * track.index, track.extent, progress);
    const r = radius / DISK_RADIUS;
    const angle = track.index * ARM_ANGLE + .35 - 5.55 * r ** .75 +
      .25 * Math.sin(4.1 * r + 1.7 * track.index);
    return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
  }

  // A compact stellar core leaves the silhouette of the disk to the recorded nodes.
  function drawNucleus(context, dark) {
    const glow = context.createRadialGradient(0,0,0,0,0,62);
    glow.addColorStop(0,dark?'#f3d8ad99':'#ae825343');
    glow.addColorStop(.20,dark?'#c7a48249':'#bc9a7427');
    glow.addColorStop(1,'#a58e7100');
    context.fillStyle=glow;context.fillRect(-62,-62,124,124);
    context.fillStyle=dark?'#f5d9b189':'#805d3776';
    for (let i=0; i<1200; i++) {
      const r=-Math.log(Math.max(.003,hash(i,68)))*15.4, a=TAU*hash(i,67);
      const size=.25+.74*hash(i,65);
      context.fillRect(r*Math.cos(a),r*Math.sin(a),size,size);
    }
  }

  const EYE_DISTANCE = DISK_RADIUS * 4.1;
  const DEGREES = 180 / Math.PI;
  const ROLL = -.035;

  // Fit the rim and the raised pins at any pitch. The circular envelope is independent of yaw.
  function frameDisk({width, height, pitch}) {
    const gutter = width >= 565 ? clamp(width*.185,105,142) : 0;
    const narrow = clamp((470-width)/190,0,1);
    const inclination = Math.max(.16,pitch-narrow*.25);
    const lens = new DOMMatrix();
    lens.m34 = -1 / EYE_DISTANCE;
    const tilted = lens.rotate(0,0,ROLL*DEGREES).rotate(inclination*DEGREES,0,0);
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const [radius,z] of [[DISK_RADIUS*1.09,0],[DISK_RADIUS,64]]) {
      for (let i=0; i<48; i++) {
        const angle = TAU*i/48;
        const p = tilted.transformPoint({x:radius*Math.cos(angle), y:radius*Math.sin(angle), z});
        const x = p.x/p.w, y = p.y/p.w;
        left = Math.min(left,x); right = Math.max(right,x);
        top = Math.min(top,y); bottom = Math.max(bottom,y);
      }
    }
    const roof = width < 440 ? 46 : 29, foot = 13, edge = 10;
    const scale = Math.min((width-gutter-2*edge)/(right-left), (height-roof-foot)/(bottom-top));
    const cx = (width+gutter)/2 - scale*(left+right)/2;
    const cy = (height+roof-foot)/2 - scale*(top+bottom)/2;
    const matrix = new DOMMatrix().translate(cx,cy).scale(scale).multiply(tilted);
    return {matrix, cx, cy, gutter, scale, foreshortening:Math.cos(inclination)};
  }

  function projectDisk(frame, yaw) {
    const matrix = frame.matrix.rotate(0,0,yaw*DEGREES);
    const {m11,m12,m14,m21,m22,m24,m31,m32,m34,m41,m42,m44} = matrix;
    const magnification = ([x,y,z=0]) => 1/(m14*x+m24*y+m34*z+m44);
    const project = point => {
      const [x,y,z=0] = point, factor = magnification(point);
      return [(m11*x+m21*y+m31*z+m41)*factor, (m12*x+m22*y+m32*z+m42)*factor];
    };
    // CSS projects the cached grains with the same homogeneous coordinates as the event pins.
    const floorTransform = matrix.translate(-ATLAS_RADIUS,-ATLAS_RADIUS).toString();
    return {project, magnification, floorTransform};
  }

  function trackProgress(track, seconds) {
    if (!track.duration) return track.to;
    const t = clamp((seconds - track.started) / track.duration, 0, 1);
    return lerp(track.from, track.to, t * t * (3 - 2 * t));
  }

  function label(ctx, item, occupied, {width, height}, paint, fontFamily) {
    const {text, at:[x, y], color} = item;
    ctx.font = '600 ' + (width < 440 ? 10 : 12) + 'px ' + fontFamily;
    const w = ctx.measureText(text).width + 8, h = 18;
    const right = [x + 6, y - h / 2], left = [x - w - 6, y - h / 2];
    const choices = x >= width / 2 ? [right, left] : [left, right];
    choices.push([x - w / 2, y - h - 7], [x - w / 2, y + 7]);
    let best, penalty = Infinity;
    for (const [px, py] of choices) {
      const bx = clamp(px, 3, width - w - 3), by = clamp(py, 29, height - h - 3);
      let score = Math.abs(bx - px) + Math.abs(by - py);
      for (const other of occupied) {
        score += Math.max(0, Math.min(bx + w, other.x + other.w) - Math.max(bx, other.x)) *
          Math.max(0, Math.min(by + h, other.y + other.h) - Math.max(by, other.y));
      }
      if (score < penalty) { best = {x:bx, y:by, w, h}; penalty = score; }
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = paint.paper;
    ctx.strokeText(text, best.x + 4, best.y + h / 2);
    ctx.fillStyle = color;
    ctx.fillText(text, best.x + 4, best.y + h / 2);
    occupied.push(best);
  }

  function actionNodes(track, events) {
    let day = 0;
    const times = [];
    for (const event of events) {
      const [h, m, s] = event.time.split(':').map(Number);
      let at = day + h * 3600 + m * 60 + s;
      if (at < times.at(-1)) { day += 86400; at += 86400; }
      times.push(at);
    }
    const duration = times.at(-1) - times[0];
    const stride = Math.max(1, Math.ceil(events.length / 32));
    let first = 0;
    return events.map((event, i) => {
      const rank = (i + 1) / events.length;
      const t = duration ? .36 * rank + .64 * (times[i] - times[0]) / duration : rank;
      while (times[first] < times[i] - 10) first++;
      const density = i - first + 1;
      const point = orbitPoint(track, t);
      const ahead = orbitPoint(track, t + .001);
      const angle = Math.atan2(ahead[1] - point[1], ahead[0] - point[0]);
      const type = event.messages.length ? 'post' : event.reads.length ? 'read' : 'action';
      const baseHeight = type === 'post' ? 38 : type === 'read' ? 27 : event.important ? 16 : 8;
      const height = baseHeight + Math.min(26, (density - 1) * 3.8);
      return {track, event, t, point, tip:[point[0], point[1], height], type, density,
        tx:Math.cos(angle), ty:Math.sin(angle), raised:type !== 'action' || i % stride === 0};
    });
  }

  function actionGrain(node, i) {
    const seed = node.event.id, spread = 5+Math.min(node.density,5);
    const along = (hash(seed,i+3)-.5)*25;
    const across = (hash(seed,i+103)+hash(seed,i+189)-1)*spread;
    return {
      x:node.point[0]+along*node.tx-across*node.ty,
      y:node.point[1]+along*node.ty+across*node.tx,
      size:.44+hash(seed,i+263)*1.15,
      alpha:(.30+.53*hash(seed,i+349))*(1-.45*Math.abs(across/spread))
    };
  }

  // Most grains share a cached surface. A thin layer above it gives each arm volume as the camera turns.
  function paintDisk(surface, tracks, size, paint, liftedPerAction) {
    surface.width = surface.height = size;
    const g = surface.getContext('2d');
    const unit = size / (2 * ATLAS_RADIUS);
    g.setTransform(unit, 0, 0, unit, size / 2, size / 2);
    const guide = paint.guide;
    g.strokeStyle = guide;
    g.lineWidth = .65;
    g.globalAlpha = paint.dark ? .21 : .22;
    for (const r of [DISK_RADIUS * .55, DISK_RADIUS * 1.04]) {
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 80; i++) {
      const angle = i * TAU / 80, major = i % 5 === 0;
      const x = Math.cos(angle), y = Math.sin(angle), r = DISK_RADIUS * 1.065;
      const outer = r + (major ? 5 : 2.5);
      g.globalAlpha = major ? .42 : .23;
      line(g, [[r*x,r*y],[outer*x,outer*y]], guide, .75);
    }
    g.globalAlpha = 1;
    drawNucleus(g, paint.dark);

    for (const track of tracks) {
      if (!track.nodes.length) continue;
      const ink = paint.agents.get(track.id) || paint.muted;
      g.globalAlpha = .055;
      line(g, track.path, ink, 4);
      g.globalAlpha = paint.dark ? .29 : .33;
      line(g, track.path, ink, .8);
      g.fillStyle = ink;
      for (const node of track.nodes) {
        const grains = 48 + Math.min(24, node.density * 3);
        for (let i=liftedPerAction; i<grains; i++) {
          const grain = actionGrain(node,i);
          g.globalAlpha = Math.min(1,grain.alpha*(paint.dark ? 1 : 1.2));
          g.fillRect(grain.x,grain.y,grain.size,grain.size);
        }
      }
    }
    g.globalAlpha = 1;
  }

  function pinCap(ctx, type, p, radius, color, paper) {
    const [x, y] = p;
    if (type === 'post') {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x,y-radius); ctx.lineTo(x+radius,y);
      ctx.lineTo(x,y+radius); ctx.lineTo(x-radius,y); ctx.closePath(); ctx.fill();
    } else if (type === 'read') {
      circle(ctx,x,y,radius,paper); circle(ctx,x,y,radius,color,true);
    } else {
      circle(ctx,x,y,radius,color);
    }
  }

  // The verified endpoints and the arc between them all live in the same 3D space.
  function readArc(post, reader) {
    const a = post.tip, b = reader.tip, dx = b[0]-a[0], dy = b[1]-a[1];
    const control = [(a[0]+b[0])*.5-dy*.10, (a[1]+b[1])*.5+dx*.10,
      Math.max(a[2],b[2])+clamp(Math.hypot(dx,dy)*.46,32,108)];
    const at = t => {
      const s=1-t;
      return [0,1,2].map(i=>s*s*a[i]+2*s*t*control[i]+t*t*b[i]);
    };
    return {at, path:Array.from({length:41},(_,i)=>at(i/40))};
  }

  function groundShadow(ctx, world, projection, frame, paint) {
    const [x,y,z] = world;
    const footprint = [x+.15*z,y+.05*z,0];
    const center = projection.project(footprint);
    const radius = frame.scale*projection.magnification(footprint)*(3.5+.12*z);
    ctx.save(); ctx.translate(...center); ctx.rotate(ROLL);
    ctx.scale(radius,radius*frame.foreshortening);
    const shadow = ctx.createRadialGradient(0,0,0,0,0,1);
    shadow.addColorStop(0,paint.dark?'rgba(0,0,0,.58)':'rgba(35,47,61,.22)');
    shadow.addColorStop(1,'transparent');
    ctx.fillStyle = shadow; ctx.fillRect(-1,-1,2,2); ctx.restore();
  }

  function drawRead(ctx, arc, projection, paint, progress, hits) {
    const {post,reader,receipt} = arc;
    const a = post.screenTip, b = reader.screenTip;
    const points = arc.path.map(projection.project);
    const from = paint.agents.get(post.event.actor), to = paint.agents.get(reader.event.actor);
    const gradient = ctx.createLinearGradient(...a, ...b);
    gradient.addColorStop(0,from); gradient.addColorStop(1,to);
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (let i=1; i<points.length; i++) ctx.lineTo(...points[i]);
    const earlierRead = progress === null;
    for (let i=1; i<points.length-1; i++) {
      const [x,y] = points[i];
      hits.push({x,y,r:7,event:receipt.event,moment:receipt.order,message:receipt.message.id,earlierRead});
    }
    if (earlierRead) {
      ctx.save();
      ctx.setLineDash([4,3]);
      ctx.globalAlpha = paint.dark ? .68 : .61;
      ctx.strokeStyle = gradient; ctx.lineWidth = 1.35; ctx.stroke();
      ctx.restore();
      return;
    }

    const point = t => projection.project(arc.at(t));
    if (!paint.dark) {
      ctx.strokeStyle=paint.paper; ctx.lineWidth=4.8; ctx.globalAlpha=.94; ctx.stroke();
    }
    ctx.strokeStyle = gradient;
    const strokes = paint.dark ? [[8,.10],[3.6,.28],[1.65,1]] : [[3.4,.16],[1.95,1]];
    for (const [width, alpha] of strokes) {
      ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.stroke();
    }

    const arrow = point(.78), prior = point(.76);
    ctx.save(); ctx.translate(...arrow);
    ctx.rotate(Math.atan2(arrow[1]-prior[1],arrow[0]-prior[0]));
    line(ctx,[[-5,-3.2],[0,0],[-5,3.2]],to,1.7); ctx.restore();

    const start = Math.max(0,progress-Math.min(.27,32/Math.max(1,Math.hypot(b[0]-a[0],b[1]-a[1]))));
    const pulse = progress < .5 ? from : to;
    for (let i=0; i<10; i++) {
      ctx.globalAlpha=.14+i*.075;
      line(ctx,[point(lerp(start,progress,i/10)),point(lerp(start,progress,(i+1)/10))],pulse,1.5+i*.18);
    }
    ctx.globalAlpha=1;
    const world=arc.at(progress), head=projection.project(world), size=projection.magnification(world);
    if (paint.dark) {
      bloom(ctx,...head,12*size,pulse,'75');
      circle(ctx,...head,3.4*size,pulse); circle(ctx,...head,1.6*size,'#fff8df');
    } else {
      circle(ctx,...head,4.2*size,paint.paper);
      circle(ctx,...head,2.9*size,paint.packet);
    }
  }

  function drawCallouts(ctx, items, width, height, paint, font) {
    const left = 13, right = width - 11, row = 50;
    const top = (height - items.length*row) / 2 + 7;
    items.forEach((item,i) => {
      const y = top + i*row, mid = y + 11;
      ctx.globalAlpha = paint.dark ? .37 : .50;
      line(ctx,[[right,mid],[right+10,mid],item.at],item.ink,.75);
      ctx.globalAlpha = 1;
      line(ctx,[[left,y-1],[left,y+23]],item.ink,1.7);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = '600 11px '+font; ctx.fillStyle = paint.ink;
      ctx.fillText(item.name,left+8,y+4);
      ctx.font = '10px '+font; ctx.fillStyle = item.ink;
      ctx.fillText(item.detail,left+8,y+19,right-left-10);
    });
  }

  window.createTrajectoryOrbitView = ({canvas, actors, actorEvents, reads, sendIndex, fontFamily}) => {
    const ctx = canvas.getContext('2d');
    const plate = document.createElement('canvas');
    const floor = document.createElement('div');
    floor.className = 'obs-disk-floor';
    floor.setAttribute('aria-hidden','true');
    plate.style.width = plate.style.height = (2*ATLAS_RADIUS)+'px';
    floor.append(plate);
    canvas.before(floor);
    const longest = Math.max(1,...actors.map(a => actorEvents.get(a.id).length));
    const eventCount = actors.reduce((sum,a)=>sum+actorEvents.get(a.id).length,0);
    const liftedPerAction = clamp(Math.floor(900/Math.max(1,eventCount)),1,6);
    const nodes = new Map();
    const tracks = actors.map((actor,i) => {
      const events = actorEvents.get(actor.id);
      const identity = agentIds.indexOf(actor.id);
      const track = {id:actor.id,index:identity < 0 ? i % agentIds.length : identity,
        extent:DISK_RADIUS*(.72 + .28*events.length/longest),from:0,to:0,duration:0,last:null};
      track.path = Array.from({length:STEPS+1},(_,j)=>orbitPoint(track,j/STEPS));
      track.nodes = actionNodes(track,events);
      track.grains = [];
      for (const node of track.nodes) {
        nodes.set(node.event.id,node);
        for (let j=0; j<liftedPerAction; j++) {
          const grain = actionGrain(node,j);
          const height = (3+12*(1-node.t))*hash(node.event.id,j+431);
          track.grains.push({point:[grain.x,grain.y,height],size:grain.size,alpha:grain.alpha});
        }
      }
      return track;
    });
    const backToFront = Array.from(nodes.values());
    const readArcs = new Map();
    for (const receipt of reads) {
      const post = nodes.get(receipt.message.event), reader = nodes.get(receipt.event);
      if (post && reader) readArcs.set(receipt,{...readArc(post,reader),post,reader,receipt});
    }
    let moment, arc, earlierArcs = [], selectedAt = 0, initialTravel = 0, camera, framing, projection, platePaint;

    function select(next, seconds, animate, history) {
      moment = next; selectedAt = seconds; initialTravel = animate ? 0 : .54;
      arc = readArcs.get(next);
      earlierArcs = history.map(receipt => readArcs.get(receipt)).filter(Boolean);
      for (const track of tracks) {
        const last = track.nodes.findLast(node => node.event.id <= next.event);
        if (animate && last === track.last) continue;
        track.from = trackProgress(track,seconds);
        track.to = last?.t ?? 0; track.last = last;
        track.started = seconds;
        track.duration = animate ? Math.min(.43,next.duration/1000) : 0;
      }
    }

    function layout(view) {
      if (camera && ['width','height','yaw','pitch'].every(k => camera[k] === view[k])) return;
      if (!camera || ['width','height','pitch'].some(k=>camera[k]!==view[k])) framing = frameDisk(view);
      camera = view;
      projection = projectDisk(framing,view.yaw);
      plate.style.transform = projection.floorTransform;
      const {project,magnification} = projection;
      for (const track of tracks) {
        track.screen = track.path.map(project);
        for (const grain of track.grains) {
          grain.screen = project(grain.point);
          grain.diameter = grain.size*framing.scale*magnification(grain.point);
        }
        for (const node of track.nodes) {
          node.foot = project(node.point);
          node.screenTip = project(node.tip);
          node.size = magnification(node.tip);
        }
      }
      backToFront.sort((a,b)=>a.size-b.size);
    }

    function draw(view, paint, seconds, reduced, hover) {
      if (!ctx || !moment || view.width <= 0 || view.height <= 0) return [];
      layout(view);
      const {width,height,dpr} = view;
      const {project,magnification} = projection;
      const {gutter,cx,cy} = framing;
      const size = clamp(Math.ceil(width*dpr/128)*128,512,1536);
      if (platePaint !== paint || plate.width !== size) {
        paintDisk(plate,tracks,size,paint,liftedPerAction);
        platePaint = paint;
      }
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const selected = nodes.get(moment.event), post = moment.message && nodes.get(moment.message.event);
      const travel = reduced ? .60 : clamp(initialTravel+(seconds-selectedAt)/1.5,0,1);
      const hits = [], labels = [], occupied = [], callouts = [];

      for (const track of tracks) {
        if (!track.nodes.length) continue;
        const ink = paint.agents.get(track.id) || paint.muted;
        const involved = track.id === moment.actor || track.id === post?.event.actor;
        const quiet = arc && !involved;
        ctx.fillStyle = ink;
        for (const grain of track.grains) {
          ctx.globalAlpha = grain.alpha*(quiet ? .42 : .72);
          ctx.fillRect(grain.screen[0],grain.screen[1],grain.diameter,grain.diameter);
        }
        ctx.globalAlpha = 1;
        const reached = trackProgress(track,seconds), frontier = orbitPoint(track,reached), head = project(frontier);
        track.reached = reached;
        if (track.last) {
          const past = track.screen.slice(0,Math.floor(reached*STEPS)+1);
          past.push(head);
          ctx.globalAlpha = quiet ? .34 : .76;
          line(ctx,past,ink,quiet ? .85 : 1.35);
          if (involved && past.length > 2) {
            const tail = past.slice(-15);
            const light = ctx.createLinearGradient(...tail[0],...head);
            light.addColorStop(0,ink+'00'); light.addColorStop(1,ink);
            ctx.globalAlpha = .20; line(ctx,tail,light,5.5);
            ctx.globalAlpha = .92; line(ctx,tail,light,2);
          }
          ctx.globalAlpha = 1;
        }
        if (track.last) {
          const size = magnification(frontier);
          circle(ctx,...head,(involved ? 3.1 : 2.1)*size,ink);
          if (involved) circle(ctx,...head,1.25*size,paint.paper);
        }
        const endpoint = track.id === post?.event.actor ? post : track.id === moment.actor ? selected : null;
        if (!gutter || !endpoint) {
          const rim = track.screen[Math.floor(STEPS*.9)];
          const dx = rim[0]-cx, dy = rim[1]-cy, length = Math.hypot(dx,dy) || 1;
          const anchor = endpoint?.screenTip || [rim[0]+7*dx/length,rim[1]+7*dy/length];
          labels.push({text:'Agent '+track.id,at:anchor,color:involved || !arc ? ink : paint.muted});
          occupied.push({x:anchor[0]-4,y:anchor[1]-4,w:8,h:8});
        }
      }

      if (post) groundShadow(ctx,post.tip,projection,framing,paint);
      if (selected && selected !== post) groundShadow(ctx,selected.tip,projection,framing,paint);
      if (arc) groundShadow(ctx,arc.at(travel),projection,framing,paint);
      for (const earlier of earlierArcs) drawRead(ctx,earlier,projection,paint,null,hits);

      for (const node of backToFront) {
        const {track,size} = node, ink = paint.agents.get(track.id) || paint.muted;
        const active = node === selected || node === post, latest = node === track.last;
        const quiet = arc && track.id !== moment.actor && track.id !== post.event.actor;
        const past = node.t <= track.reached, raised = node.raised || active || latest;
        const at = raised ? node.screenTip : node.foot;
        const distanceFade = clamp((size-.76)*1.2+.57,.62,1.13);
        const strength = (past ? (quiet ? .48 : .85) : (quiet ? .18 : .36))*distanceFade;
        const alpha = paint.dark ? strength : Math.min(.98,strength*1.13+.045);
        ctx.globalAlpha = active ? .95 : alpha*.78;
        if (raised) line(ctx,[node.foot,at],ink,(active ? 1.35 : .75)*size);
        ctx.globalAlpha = active ? 1 : Math.min(1,alpha);
        circle(ctx,...node.foot,(raised ? 1.15 : 1.6)*size,ink);
        const type = node === selected && arc ? 'read' : node.type;
        const radius = type === 'action' ? (node.event.important ? 2 : 1.6) : 2.6;
        if (raised) pinCap(ctx,type,at,(active ? 3.7 : radius)*size,ink,paint.paper);
        const hit = {x:at[0],y:at[1],event:node.event.id,latest,r:active || latest ? 8 : 5};
        if (node === selected) hit.moment = moment.order;
        hits.push(hit);
        if (raised) hits.push({...hit,x:node.foot[0],y:node.foot[1],r:4});
      }
      ctx.globalAlpha = 1;
      if (arc) drawRead(ctx,arc,projection,paint,travel,hits);
      if (post) {
        const ink = paint.agents.get(post.event.actor);
        bloom(ctx,...post.screenTip,12*post.size,ink,'54');
        circle(ctx,...post.screenTip,6.2*post.size,ink,true);
        hits.push({x:post.screenTip[0],y:post.screenTip[1],r:8,event:post.event.id,moment:sendIndex.get(moment.message.id)});
        callouts.push({name:'Agent '+post.event.actor,detail:'Shared · '+moment.message.time,ink,at:post.screenTip});
      }
      if (selected && (arc || !post)) {
        const ink = paint.agents.get(selected.event.actor);
        bloom(ctx,...selected.screenTip,13*selected.size,ink,'65');
        circle(ctx,...selected.screenTip,6.2*selected.size,ink,true);
        const arrival = (seconds-selectedAt-(1-initialTravel)*1.5)/.55;
        if (arc && !reduced && arrival>0 && arrival<1) {
          ctx.globalAlpha=(1-arrival)*.65;
          circle(ctx,...selected.screenTip,(6.2+13*arrival)*selected.size,ink,true);
          ctx.globalAlpha=1;
        }
        callouts.push({name:'Agent '+selected.event.actor,detail:(arc?'Read':'Turn '+selected.event.turn)+' · '+selected.event.time,
          ink,at:selected.screenTip});
      }
      if (gutter) drawCallouts(ctx,callouts,gutter,height,paint,fontFamily);
      for (const item of labels) label(ctx,item,occupied,view,paint,fontFamily);
      if (hover) circle(ctx,hover.x,hover.y,6.5,paint.ink,true);
      return hits.reverse();
    }

    return {select,draw};
  };
})();
