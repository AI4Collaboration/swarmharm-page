/* One action spiral per agent on the floor, with verified reads arching through the sky above. */
(() => {
  const TAU = 2 * Math.PI;
  const STEPS = 152;
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


  const SKY_RADIUS = 230, SKY_HEIGHT = 197;
  const READ_TRAVEL_SECONDS = 3;
  const ATLAS_RADIUS = 278;
  const EYE_DISTANCE = SKY_RADIUS * 4.8;
  const CENTER = [0,0,SKY_HEIGHT*.44];
  const DEGREES = 180 / Math.PI;

  function skyPoint(bearing, altitude) {
    const radius = SKY_RADIUS*Math.cos(altitude);
    return [radius*Math.cos(bearing),radius*Math.sin(bearing),SKY_HEIGHT*Math.sin(altitude)];
  }

  // The neutral guides describe the vault. Directional arcs are added only for actual reads.
  const skyGuides = [1.09,.80,1.24,.91].map((inclination,index) => {
    const bearing = -.19 + index*Math.PI/2 + .14*Math.sin(2.1*index);
    const sweep = index%2 ? -1 : 1;
    const skew = .095*Math.sin(index*2+.3);
    return Array.from({length:77},(_,i) => {
      const t=i/76;
      return skyPoint(bearing+sweep*((t-.5)*4.65+.18*Math.sin(TAU*t)),
        inclination*Math.sin(Math.PI*(t+skew*Math.sin(Math.PI*t))));
    });
  });

  function orbitPoint(track, progress) {
    const radius = lerp(26 + 3*track.index, track.extent, progress);
    const r = radius / SKY_RADIUS;
    const angle = track.phase + .35 - 5.55*r**.75 + .25*Math.sin(4.1*r + 1.7*track.index);
    return [radius*Math.cos(angle),radius*Math.sin(angle),0];
  }

  const horizon = Array.from({length:97},(_,i)=>skyPoint(TAU*i/96,0));
  const shellSamples = Array.from({length:13},(_,row)=>
    Array.from({length:64},(_,i)=>skyPoint(TAU*i/64,row*Math.PI/24))).flat();
  const dust = Array.from({length:250},(_,i)=>({
    point:skyPoint(TAU*hash(i,70),Math.asin(hash(i,71))),radius:.30+.58*hash(i,72),alpha:.14+.31*hash(i,73)
  }));

  function projector(matrix) {
    const {m11,m12,m14,m21,m22,m24,m31,m32,m34,m41,m42,m44} = matrix;
    const magnification = ([x,y,z]) => 1/(m14*x+m24*y+m34*z+m44);
    const project = point => {
      const [x,y,z] = point, k = magnification(point);
      return [(m11*x+m21*y+m31*z+m41)*k,(m12*x+m22*y+m32*z+m42)*k];
    };
    return {project,magnification};
  }

  // The silhouette is the convex outline of the projected upper hemisphere.
  function shellOutline(points) {
    const ordered = points.slice().sort((a,b)=>a.x-b.x || a.y-b.y);
    function half(sequence) {
      const edge = [];
      for (const p of sequence) {
        while (edge.length >= 2) {
          const a=edge.at(-2), b=edge.at(-1);
          if ((b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x)>0) break;
          edge.pop();
        }
        edge.push(p);
      }
      return edge.slice(0,-1);
    }
    return [...half(ordered),...half(ordered.reverse())].map(p=>p.world);
  }

  function frameDome({width,height,pitch}) {
    const gutter = width >= 565 ? clamp(width*.17,100,133) : 0;
    const lens = new DOMMatrix(); lens.m34 = -1/EYE_DISTANCE;
    const tilt = new DOMMatrix().rotate(0,0,-1.8).rotate(pitch*DEGREES,0,0);
    const initial = projector(lens.multiply(tilt)).project;
    const points = shellSamples.map(world=>{const [x,y]=initial(world); return {world,x,y};});
    const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
    const left=Math.min(...xs), right=Math.max(...xs), top=Math.min(...ys), bottom=Math.max(...ys);
    const roof=width<440?46:32, foot=14, edge=9;
    const scale=Math.min((width-gutter-2*edge)/(right-left),(height-roof-foot)/(bottom-top))*.96;
    const cx=(width+gutter)/2-scale*(left+right)/2, cy=(height+roof-foot)/2-scale*(top+bottom)/2;
    const screen = new DOMMatrix().translate(cx,cy).scale(scale).multiply(lens);
    return {tilt,screen,outline:shellOutline(points),scale,gutter,
      bounds:{left:gutter+edge,right:width-edge,top:roof,bottom:height-foot}};
  }

  function projectDome(frame,yaw,focus) {
    const rotation = frame.tilt.rotate(0,0,yaw*DEGREES);
    const target=rotation.transformPoint({x:focus[0],y:focus[1],z:focus[2]});
    const center=frame.tilt.transformPoint({x:CENTER[0],y:CENTER[1],z:CENTER[2]});
    const heading=clamp(.36*(Math.atan2(target.x,EYE_DISTANCE-target.z)-Math.atan2(center.x,EYE_DISTANCE-center.z)),-.030,.030);
    const elevation=clamp(.36*(Math.atan2(target.y,EYE_DISTANCE-target.z)-Math.atan2(center.y,EYE_DISTANCE-center.z)),-.022,.022);
    // Turn the lens toward the read without changing the clockwise orbit around the sky.
    const aim=new DOMMatrix().translate(0,0,EYE_DISTANCE).rotate(-elevation*DEGREES,0,0)
      .rotate(0,heading*DEGREES,0).translate(0,0,-EYE_DISTANCE);
    let shell=frame.screen.multiply(aim).multiply(frame.tilt);
    const outline=frame.outline.map(projector(shell).project);
    const xs=outline.map(p=>p[0]),ys=outline.map(p=>p[1]);
    const bounds=frame.bounds;
    const dx=Math.max(0,bounds.left-Math.min(...xs))+Math.min(0,bounds.right-Math.max(...xs));
    const dy=Math.max(0,bounds.top-Math.min(...ys))+Math.min(0,bounds.bottom-Math.max(...ys));
    if (dx || dy) shell=new DOMMatrix().translate(dx,dy).multiply(shell);
    const world=shell.rotate(0,0,yaw*DEGREES);
    return {...projector(world),shell:projector(shell).project,outline:outline.map(([x,y])=>[x+dx,y+dy]),
      floorTransform:world.translate(-ATLAS_RADIUS,-ATLAS_RADIUS).toString()};
  }

  function drawSky(ctx,projection,paint) {
    const outline=projection.outline;
    const crown=projection.shell([0,0,SKY_HEIGHT]), base=projection.shell([0,0,0]);
    const air=ctx.createLinearGradient(0,crown[1]-14,0,base[1]+40);
    air.addColorStop(0,paint.blue+(paint.dark?'1d':'12'));
    air.addColorStop(.52,paint.blue+(paint.dark?'0d':'08'));
    air.addColorStop(1,paint.guide+'04');
    ctx.beginPath();ctx.moveTo(...outline[0]);
    for (const p of outline.slice(1)) ctx.lineTo(...p);
    ctx.closePath();ctx.fillStyle=air;ctx.fill();
    ctx.strokeStyle=paint.guide+(paint.dark?'52':'55');ctx.lineWidth=.8;ctx.stroke();
    for (const guide of skyGuides) {
      line(ctx,guide.map(projection.project),paint.guide+(paint.dark?'43':'45'),.78);
    }
    line(ctx,horizon.map(projection.shell),paint.guide+(paint.dark?'51':'52'),.85);
    for (let i=0;i<48;i++) {
      const [x,y] = horizon[i*2], scale=i%4===0?1.029:1.014;
      line(ctx,[projection.project([x,y,0]),projection.project([x*scale,y*scale,0])],paint.guide+'54',.7);
    }
    ctx.fillStyle=paint.guide;
    for (const star of dust) {
      const [x,y]=projection.project(star.point);
      ctx.globalAlpha=star.alpha;
      ctx.fillRect(x,y,star.radius,star.radius);
    }
    ctx.globalAlpha=1;
  }
  function trackProgress(track, seconds) {
    if (!track.duration) return track.to;
    const t = clamp((seconds - track.started) / track.duration, 0, 1);
    return lerp(track.from, track.to, t * t * (3 - 2 * t));
  }

  function label(ctx, item, occupied, {width, height}, paint, fontFamily, gutter) {
    const {text, at:[x, y], color, current} = item;
    ctx.font = '600 ' + (current || width < 440 ? 10 : 12) + 'px ' + fontFamily;
    const w = ctx.measureText(text).width + 8, h = 18;
    const right = [x + 6, y - h / 2], left = [x - w - 6, y - h / 2];
    const choices = x >= width / 2 ? [right, left] : [left, right];
    const gap = current ? 5 : 7;
    const above = [x - w / 2, y - h - gap], below = [x - w / 2, y + gap];
    if (current) choices.unshift(above,below);
    else choices.push(above,below);
    let best, penalty = Infinity;
    for (const [px, py] of choices) {
      const bx = clamp(px, gutter + 3, width - w - 3), by = clamp(py, 29, height - h - 3);
      let score = Math.abs(bx - px) + Math.abs(by - py);
      for (const other of occupied) {
        score += Math.max(0, Math.min(bx + w, other.x + other.w) - Math.max(bx, other.x)) *
          Math.max(0, Math.min(by + h, other.y + other.h) - Math.max(by, other.y));
      }
      if (score < penalty) { best = {x:bx, y:by, w, h}; penalty = score; }
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (current) {
      const edge = [clamp(x,best.x,best.x+w),clamp(y,best.y,best.y+h)];
      line(ctx,[[x,y],edge],paint.packet,1);
      ctx.beginPath(); ctx.roundRect(best.x,best.y,w,h,4);
      ctx.fillStyle = paint.packet; ctx.fill();
    } else {
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = paint.paper;
      ctx.strokeText(text, best.x + 4, best.y + h / 2);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, best.x + 4, best.y + h / 2);
    occupied.push(best);
    return best;
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

  // The static grains stay on one cached plane while action heads and pins are projected above it.
  function paintDisk(surface, tracks, size, paint, liftedPerAction) {
    surface.width = surface.height = size;
    const g = surface.getContext('2d');
    const unit = size / (2*ATLAS_RADIUS);
    g.setTransform(unit,0,0,unit,size/2,size/2);
    drawNucleus(g,paint.dark);

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


  // The same path is used for the stroke, the travelling signal, picking and camera framing.
  // It leaves the post's pin, follows the upper shell, then descends to the reader's pin.
  function readArc(post,reader) {
    const a = post.tip, b = reader.tip;
    const dx = b[0]-a[0], dy = b[1]-a[1];
    const controlX = (a[0]+b[0])*.36 - dy*.20;
    const controlY = (a[1]+b[1])*.36 + dx*.20;
    function at(t) {
      if (t===0) return a;
      if (t===1) return b;
      const s = 1-t, mid = 2*s*t;
      const x = s*s*a[0] + mid*controlX + t*t*b[0];
      const y = s*s*a[1] + mid*controlY + t*t*b[1];
      const ceiling = SKY_HEIGHT*Math.sqrt(Math.max(0,1-(x*x+y*y)/(SKY_RADIUS*SKY_RADIUS)));
      const baseline = lerp(a[2],b[2],t);
      const rise = Math.sin(Math.PI*t);
      return [x,y,lerp(baseline,ceiling,rise*(2-rise))];
    }
    return {at,focus:at(.5),path:Array.from({length:65},(_,i)=>at(i/64))};
  }
  function drawRead(ctx, arc, projection, paint, progress, hits, historyAlpha) {
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
      ctx.globalAlpha = historyAlpha;
      ctx.strokeStyle = gradient; ctx.lineWidth = 1.35; ctx.stroke();
      ctx.restore();
      return;
    }

    const point = t => projection.project(arc.at(t));
    if (!paint.dark) {
      ctx.strokeStyle=paint.paper; ctx.lineWidth=6; ctx.globalAlpha=.96; ctx.stroke();
    }
    ctx.strokeStyle = gradient;
    const strokes = paint.dark ? [[10,.10],[6,.23],[3.2,1]] : [[4.4,.30],[3,1]];
    for (const [width, alpha] of strokes) {
      ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.stroke();
    }
    ctx.strokeStyle = paint.packet; ctx.lineWidth = 1.4; ctx.stroke();

    const arrow = point(.78), prior = point(.76);
    ctx.save(); ctx.translate(...arrow);
    ctx.rotate(Math.atan2(arrow[1]-prior[1],arrow[0]-prior[0]));
    line(ctx,[[-5.5,-3.6],[0,0],[-5.5,3.6]],paint.packet,2); ctx.restore();

    const start = Math.max(0,progress-Math.min(.27,32/Math.max(1,Math.hypot(b[0]-a[0],b[1]-a[1]))));
    const pulse = progress < .5 ? from : to;
    for (let i=0; i<10; i++) {
      ctx.globalAlpha=.14+i*.075;
      line(ctx,[point(lerp(start,progress,i/10)),point(lerp(start,progress,(i+1)/10))],pulse,1.5+i*.18);
    }
    ctx.globalAlpha=1;
    const world=arc.at(progress), head=projection.project(world), size=projection.magnification(world);
    if (paint.dark) {
      bloom(ctx,...head,14*size,pulse,'90');
      circle(ctx,...head,4*size,pulse); circle(ctx,...head,2.2*size,paint.packet);
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
    let platePaint;

    const eventCount = actors.reduce((sum,actor)=>sum+actorEvents.get(actor.id).length,0);
    const liftedPerAction = clamp(Math.floor(900/Math.max(1,eventCount)),1,6);
    const longest = Math.max(1,...actors.map(actor=>actorEvents.get(actor.id).length));
    const nodes = new Map();
    const tracks = actors.map((actor,index) => {
      const events = actorEvents.get(actor.id);
      const track = {
        id:actor.id,index,phase:index*TAU/actors.length,extent:SKY_RADIUS*(.72+.28*events.length/longest),
        from:0,to:0,duration:0,last:null,grains:[]
      };
      track.path = Array.from({length:STEPS+1},(_,j)=>orbitPoint(track,j/STEPS));
      track.nodes = actionNodes(track,events);
      for (const node of track.nodes) {
        nodes.set(node.event.id,node);
        for (let j=0;j<liftedPerAction;j++) {
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
    // Open a cited exchange with its endpoints separated and its midpoint facing the reader.
    function entryYaw(receipt,pitch) {
      const link=readArcs.get(receipt);
      if (!link) return null;
      const lens=new DOMMatrix(); lens.m34=-1/EYE_DISTANCE;
      const tilt=lens.rotate(pitch*DEGREES,0,0);
      let bestAngle=0, bestScore=-Infinity;
      for (let i=0;i<48;i++) {
        const yaw=i*TAU/48, project=projector(tilt.rotate(0,0,yaw*DEGREES)).project;
        const [ax,ay]=project(link.post.tip), [bx,by]=project(link.reader.tip);
        const [mx]=project(link.focus), front=link.focus[0]*Math.sin(yaw)+link.focus[1]*Math.cos(yaw);
        const score=.7*Math.abs(bx-ax)+.3*Math.hypot(bx-ax,by-ay)-.75*Math.abs(mx)+.45*front;
        if (score>bestScore) { bestScore=score; bestAngle=yaw; }
      }
      return bestAngle;
    }

    let moment,arc,earlierArcs=[],selectedAt=0,initialTravel=0,camera,framing,projection,projectedFocus;
    let focus=CENTER,focusFrom=CENTER,focusTo=CENTER,selectedFocus=CENTER,focusProgress=1;

    function setFocus(target,animate) {
      if (animate && focusTo===target) return;
      focusFrom=focus; focusTo=target; focusProgress=animate?0:1;
      if (!animate) focus=target;
    }
    function advanceFocus(ms) {
      if (focusProgress===1 || ms<=0) return false;
      focusProgress=Math.min(1,focusProgress+ms/2400);
      const t=focusProgress*focusProgress*(3-2*focusProgress);
      focus=focusProgress===1?focusTo:focusFrom.map((n,i)=>lerp(n,focusTo[i],t));
      return true;
    }

    function select(next,seconds,animate,history,easeFocus) {
      moment=next; selectedAt=seconds; initialTravel=animate?0:.54;
      arc=readArcs.get(next);
      earlierArcs=history.map(receipt=>readArcs.get(receipt)).filter(Boolean);
      const latest=arc || readArcs.get(reads.findLast(read=>read.order<next.order));
      selectedFocus=latest?.focus || CENTER;
      setFocus(selectedFocus,easeFocus);
      for (const track of tracks) {
        const last = track.nodes.findLast(node => node.event.id <= next.event);
        if (animate && last === track.last) continue;
        track.from = trackProgress(track,seconds);
        track.to = last?.t ?? 0; track.last = last;
        track.started = seconds;
        track.duration = animate ? Math.min(.9,next.duration/1000) : 0;
      }
    }


    function layout(view) {
      if (camera && projectedFocus===focus && ['width','height','yaw','pitch'].every(k=>camera[k]===view[k])) return;
      if (!camera || ['width','height','pitch'].some(k=>camera[k]!==view[k])) framing=frameDome(view);
      camera=view; projectedFocus=focus;
      projection=projectDome(framing,view.yaw,focus);
      plate.style.transform=projection.floorTransform;
      const {project,magnification}=projection;
      for (const track of tracks) {
        track.screen=track.path.map(project);
        for (const grain of track.grains) {
          grain.screen=project(grain.point);
          grain.diameter=Math.max(.52,grain.size*framing.scale*magnification(grain.point));
        }
        for (const node of track.nodes) {
          node.foot=project(node.point); node.screenTip=project(node.tip); node.size=magnification(node.tip);
        }
      }
      backToFront.sort((a,b)=>a.size-b.size);
    }

    function drawSpirals(seconds,paint) {
      for (const track of tracks) {
        if (!track.nodes.length) continue;
        const ink = paint.agents.get(track.id) || paint.muted;
        const involved = track.id === moment.actor || track.id === moment.message?.actor;
        const quiet = arc && !involved;
        const reached = trackProgress(track,seconds);
        const head = projection.project(orbitPoint(track,reached));
        track.reached = reached;
        track.head = head;
        track.ink = ink;
        track.involved = involved;

        ctx.fillStyle = ink;
        for (const grain of track.grains) {
          ctx.globalAlpha = grain.alpha*(quiet ? .50 : .75);
          ctx.fillRect(...grain.screen,grain.diameter,grain.diameter);
        }
        ctx.globalAlpha = 1;
        if (!track.last) continue;
        const past = track.screen.slice(0,Math.floor(reached*STEPS)+1);
        past.push(head);
        ctx.globalAlpha = quiet ? .57 : .85;
        line(ctx,past,ink,quiet ? 1.12 : 1.48);
        if (involved && past.length>2) {
          const tail = past.slice(-15);
          const light = ctx.createLinearGradient(...tail[0],...head);
          light.addColorStop(0,ink+'00'); light.addColorStop(1,ink);
          ctx.globalAlpha = .18; line(ctx,tail,light,5.5);
          ctx.globalAlpha = .92; line(ctx,tail,light,2);
        }
        ctx.globalAlpha = 1;
      }
    }

    function draw(view, paint, seconds, reduced, hover) {
      if (!ctx || !moment || view.width <= 0 || view.height <= 0) return [];
      layout(view);
      const {width,height,dpr} = view;
      const {project,magnification} = projection;
      const {gutter} = framing;
      const center = project([0,0,0]);
      const size = clamp(Math.ceil(width*dpr/128)*128,512,1536);
      if (platePaint!==paint || plate.width!==size) {
        paintDisk(plate,tracks,size,paint,liftedPerAction);
        platePaint=paint;
      }

      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
      ctx.lineCap='round'; ctx.lineJoin='round';
      const selected=nodes.get(moment.event), post=moment.message && nodes.get(moment.message.event);
      const travel=reduced ? .60 : clamp(initialTravel+(seconds-selectedAt)/READ_TRAVEL_SECONDS,0,1);
      const hits=[],labels=[],occupied=[],callouts=[];
      drawSky(ctx,projection,paint);
      drawSpirals(seconds,paint);

      for (const track of tracks) {
        if (!track.nodes.length) continue;
        const {ink,involved}=track;
        if (track.last) {
          const size=magnification(orbitPoint(track,track.reached));
          circle(ctx,...track.head,(involved?3.1:2.1)*size,ink);
          if (involved) circle(ctx,...track.head,1.25*size,paint.paper);
        }
        const rim = track.screen[Math.floor(STEPS*.94)];
        const dx = rim[0]-center[0], dy = rim[1]-center[1], length = Math.hypot(dx,dy) || 1;
        const anchor = [rim[0]+6*dx/length,rim[1]+6*dy/length];
        labels.push({text:'Agent '+track.id,at:anchor,color:ink});
        occupied.push({x:anchor[0]-4,y:anchor[1]-4,w:8,h:8});
      }
      for (const [i,earlier] of earlierArcs.entries()) {
        const related=earlier.receipt.message===moment.message;
        const alpha=related ? .63 : (i<2 ? .46 : .32);
        drawRead(ctx,earlier,projection,paint,null,hits,alpha);
      }
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
      if (arc) {
        drawRead(ctx,arc,projection,paint,travel,hits);
        labels.unshift({text:'Now',at:project(arc.at(.40)),color:paint.paper,current:true});
      }
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
        const arrival = (seconds-selectedAt-(1-initialTravel)*READ_TRAVEL_SECONDS)/.7;
        if (arc && !reduced && arrival>0 && arrival<1) {
          ctx.globalAlpha=(1-arrival)*.65;
          circle(ctx,...selected.screenTip,(6.2+13*arrival)*selected.size,ink,true);
          ctx.globalAlpha=1;
        }
        callouts.push({name:'Agent '+selected.event.actor,detail:(arc?'Read':'Turn '+selected.event.turn)+' · '+selected.event.time,
          ink,at:selected.screenTip});
      }
      if (gutter) drawCallouts(ctx,callouts,gutter,height,paint,fontFamily);
      for (const item of labels) {
        const bounds = label(ctx,item,occupied,view,paint,fontFamily,gutter);
        if (item.current) hits.push({bounds,x:item.at[0],y:item.at[1],event:moment.event,moment:moment.order,message:moment.message.id});
      }
      if (hover) circle(ctx,hover.x,hover.y,6.5,paint.ink,true);
      return hits.reverse();
    }


    return {
      select,draw,entryYaw,advanceFocus,
      get focusing() { return focusProgress<1; },
      holdFocus:()=>setFocus(focus,false),
      resumeFocus:animate=>setFocus(selectedFocus,animate),
      resetFocus:()=>setFocus(CENTER,false)
    };
  };
})();
