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
  const ATLAS_RADIUS = 278;
  const EYE_DISTANCE = SKY_RADIUS * 4.8;
  const CENTER = [0,0,SKY_HEIGHT*.44];
  const DEGREES = 180 / Math.PI;

  function skyPoint(bearing, altitude) {
    const radius = SKY_RADIUS*Math.cos(altitude);
    return [radius*Math.cos(bearing),radius*Math.sin(bearing),SKY_HEIGHT*Math.sin(altitude)];
  }

  function orbitPoint(track, progress) {
    const radius = lerp(26 + 3*track.index, track.extent, progress);
    const r = radius / SKY_RADIUS;
    const angle = track.phase + .35 - 5.55*r**.75 + .25*Math.sin(4.1*r + 1.7*track.index);
    return [radius*Math.cos(angle),radius*Math.sin(angle),0];
  }

  const shellSamples = Array.from({length:13},(_,row)=>
    Array.from({length:64},(_,i)=>skyPoint(TAU*i/64,row*Math.PI/24))).flat();
  const stars = Array.from({length:40},(_,i)=>({
    point:skyPoint(TAU*hash(i,70),Math.asin(hash(i,71))), size:.3+.58*hash(i,72), alpha:.10+.18*hash(i,73)
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

  // The camera uses the bounding silhouette to keep the entire flight volume in view.
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
    return {...projector(world),outline:outline.map(([x,y])=>[x+dx,y+dy]),
      floorTransform:world.translate(-ATLAS_RADIUS,-ATLAS_RADIUS).toString()};
  }
  function drawDome(ctx,projection,paint) {
    const crown=projection.project([0,0,SKY_HEIGHT]), base=projection.project([0,0,0]);
    const light=ctx.createLinearGradient(0,crown[1]-14,0,base[1]+40);
    light.addColorStop(0,paint.blue+(paint.dark?'24':'19'));
    light.addColorStop(.55,paint.blue+(paint.dark?'10':'0b'));
    light.addColorStop(1,paint.guide+'04');
    ctx.beginPath(); ctx.moveTo(...projection.outline[0]);
    for (let i=1;i<projection.outline.length;i++) ctx.lineTo(...projection.outline[i]);
    ctx.closePath(); ctx.fillStyle=light; ctx.fill();
    ctx.fillStyle=paint.guide;
    for (const star of stars) {
      const [x,y]=projection.project(star.point);
      ctx.globalAlpha=star.alpha; ctx.fillRect(x,y,star.size,star.size);
    }
    ctx.globalAlpha=1;
  }
  function trackProgress(track, seconds) {
    if (!track.duration) return track.to;
    const t = clamp((seconds - track.started) / track.duration, 0, 1);
    return lerp(track.from, track.to, t * t * (3 - 2 * t));
  }

  function label(ctx, item, occupied, {width, height}, paint, fontFamily, gutter, offsets, follow) {
    const {text, at:[x, y], color, current, receipt} = item;
    ctx.font = '600 ' + (receipt || width < 440 ? 10 : 12) + 'px ' + fontFamily;
    const w = ctx.measureText(text).width + 8, h = 18;
    const right = [x + 6, y - h / 2], left = [x - w - 6, y - h / 2];
    const choices = x >= width / 2 ? [right, left] : [left, right];
    const gap = current ? 5 : 7;
    const above = [x - w / 2, y - h - gap], below = [x - w / 2, y + gap];
    if (receipt) choices.splice(0,choices.length,[x-w/2,y-h-13]);
    else choices.push(above,below);
    const previous=offsets.get(text);
    let best, penalty = Infinity;
    for (const [px, py] of choices) {
      const bx = clamp(px, gutter + 3, width - w - 3), by = clamp(py, 29, height - h - 3);
      let score = Math.abs(bx - px) + Math.abs(by - py);
      if (previous) score+=.30*Math.hypot(bx-x-previous[0],by-y-previous[1]);
      for (const other of occupied) {
        score += Math.max(0, Math.min(bx + w, other.x + other.w) - Math.max(bx, other.x)) *
          Math.max(0, Math.min(by + h, other.y + other.h) - Math.max(by, other.y));
      }
      if (score < penalty) { best = {x:bx, y:by, w, h}; penalty = score; }
    }
    if (!receipt) {
      if (previous) {
        best.x=clamp(x+lerp(previous[0],best.x-x,follow),gutter+3,width-w-3);
        best.y=clamp(y+lerp(previous[1],best.y-y,follow),29,height-h-3);
      }
      offsets.set(text,[best.x-x,best.y-y]);
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
    let first = 0;
    return events.map((event, i) => {
      const rank = (i + 1) / events.length;
      const t = duration ? .36 * rank + .64 * (times[i] - times[0]) / duration : rank;
      while (times[first] < times[i] - 10) first++;
      const density = i - first + 1;
      const point = orbitPoint(track, t);
      const type = event.messages.length ? 'post' : event.reads.length ? 'read' : 'action';
      const baseHeight = type === 'post' ? 38 : type === 'read' ? 27 : event.important ? 16 : 8;
      const height = baseHeight + Math.min(26, (density - 1) * 3.8);
      return {track, event, t, point, tip:[point[0], point[1], height], type};
    });
  }

  // A soft core keeps the center legible behind the action tracks.
  function drawNucleus(context, dark) {
    const glow = context.createRadialGradient(0,0,0,0,0,62);
    glow.addColorStop(0,dark?'#f3d8ad99':'#ae825343');
    glow.addColorStop(.20,dark?'#c7a48249':'#bc9a7427');
    glow.addColorStop(1,'#a58e7100');
    context.fillStyle=glow;context.fillRect(-62,-62,124,124);
  }

  // Cache the smooth paths below the moving heads and communication endpoints.
  function paintDisk(surface, tracks, size, paint) {
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
      // Begin vertically above the sender, then pitch over toward the reader.
      const downrange = t*t*(2-t), s = 1-downrange, mid = 2*s*downrange;
      const x = s*s*a[0] + mid*controlX + downrange*downrange*b[0];
      const y = s*s*a[1] + mid*controlY + downrange*downrange*b[1];
      const ceiling = SKY_HEIGHT*Math.sqrt(Math.max(0,1-(x*x+y*y)/(SKY_RADIUS*SKY_RADIUS)));
      const baseline = lerp(a[2],b[2],t);
      const rise = Math.sin(Math.PI*t);
      return [x,y,lerp(baseline,ceiling,rise*(1.35-.35*rise))];
    }
    return {at,focus:at(.5),path:Array.from({length:65},(_,i)=>at(i/64))};
  }
  function drawLaunch(ctx, arc, projection, points, paint, progress, gradient, opacity) {
    const world = arc.at(progress), head = projection.project(world);
    const index = progress*(points.length-1);
    const flown = points.slice(0,Math.ceil(index));
    flown.push(head);
    ctx.globalAlpha = opacity;
    line(ctx,flown,gradient,4.6);
    line(ctx,flown,paint.packet,1.8);
    if (progress >= 1) return;

    const size = clamp(projection.magnification(world),.8,1.16);
    const flame = paint.dark ? '#ffb166' : '#af4e22';
    const sender = paint.agents.get(arc.post.event.actor) || paint.muted;
    const fade = opacity*Math.min(1,(1-progress)/.045);
    ctx.save();
    if (progress < .12) {
      const ignition = 1-progress/.12;
      ctx.globalAlpha = ignition*opacity;
      bloom(ctx,...points[0],17*size,flame,'a0');
      ctx.beginPath();
      ctx.ellipse(...points[0],(6+8*(1-ignition))*size,3*size,0,0,TAU);
      ctx.strokeStyle = flame; ctx.lineWidth = 1; ctx.stroke();
    }

    // Follow the projected curve backwards for a fixed length of fading exhaust.
    const wakeLength = 42*size;
    let previous = head, distance = 0;
    for (let i=Math.ceil(index)-1; i>=0 && distance<wakeLength; i--) {
      const p = points[i], segment = Math.hypot(p[0]-previous[0],p[1]-previous[1]);
      if (segment === 0) continue;
      const step = Math.min(segment,wakeLength-distance);
      const end = [lerp(previous[0],p[0],step/segment),lerp(previous[1],p[1],step/segment)];
      const strength = 1-(distance+.5*step)/wakeLength;
      ctx.globalAlpha = fade*strength*.72;
      line(ctx,[previous,end],flame,(1+5*strength)*size);
      distance += step; previous = end;
    }

    const before = projection.project(arc.at(Math.max(0,progress-.005)));
    const after = projection.project(arc.at(Math.min(1,progress+.005)));
    const heading = Math.atan2(after[1]-before[1],after[0]-before[0]);
    ctx.globalAlpha = fade;
    ctx.translate(...head); ctx.rotate(heading); ctx.scale(size,size);
    const tail = -11-17*Math.min(1,progress/.10);
    const exhaust = ctx.createLinearGradient(tail,0,-4,0);
    exhaust.addColorStop(0,flame+'00'); exhaust.addColorStop(.50,flame+'c2');
    exhaust.addColorStop(.78,flame); exhaust.addColorStop(1,'#fff1cf');
    ctx.beginPath(); ctx.moveTo(-4,-1.6);
    ctx.bezierCurveTo(-9,-4,tail*.75,-1,tail,0);
    ctx.bezierCurveTo(tail*.75,1,-9,4,-4,1.6);
    ctx.closePath(); ctx.fillStyle=exhaust; ctx.fill();

    ctx.beginPath(); ctx.moveTo(9,0);
    ctx.quadraticCurveTo(5,-2.7,-.5,-2.7);
    ctx.lineTo(-6,-4.7); ctx.lineTo(-4.6,-1.4); ctx.lineTo(-4.6,1.4); ctx.lineTo(-6,4.7);
    ctx.lineTo(-.5,2.7); ctx.quadraticCurveTo(5,2.7,9,0); ctx.closePath();
    ctx.strokeStyle=paint.paper; ctx.lineWidth=1.8; ctx.stroke();
    ctx.fillStyle=paint.packet; ctx.fill();
    line(ctx,[[-3,0],[3,0]],sender,1.2);
    ctx.restore();
  }
  function drawRead(ctx, arc, projection, paint, hits, {history,last,current}, featured, progress) {
    if (Math.max(history,last,current)<.005) return;
    const {post,reader,receipt} = arc;
    const a = post.screenTip, b = reader.screenTip;
    const points = arc.path.map(projection.project);
    const from = paint.agents.get(post.event.actor), to = paint.agents.get(reader.event.actor);
    const gradient = ctx.createLinearGradient(...a, ...b);
    gradient.addColorStop(0,from); gradient.addColorStop(1,to);
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (let i=1; i<points.length; i++) ctx.lineTo(...points[i]);
    for (let i=1; i<points.length-1; i++) {
      const [x,y] = points[i];
      hits.push({x,y,r:7,event:receipt.event,moment:receipt.order,message:receipt.message.id,earlierRead:!featured});
    }
    ctx.save();
    if (history>.005) {
      ctx.setLineDash([4,4]); ctx.globalAlpha=history;
      ctx.strokeStyle=gradient; ctx.lineWidth=1.15; ctx.stroke(); ctx.setLineDash([]);
    }
    if (last>.005) {
      ctx.globalAlpha=last; ctx.strokeStyle=paint.paper; ctx.lineWidth=4; ctx.stroke();
      ctx.globalAlpha=last*.86; ctx.strokeStyle=gradient; ctx.lineWidth=2.4; ctx.stroke();
    }
    if (current>.005) {
      if (!paint.dark) {
        ctx.strokeStyle=paint.paper; ctx.lineWidth=8; ctx.globalAlpha=current*.98; ctx.stroke();
      }
      ctx.strokeStyle=gradient;
      const strokes=paint.dark ? [[12,.09],[7,.23],[3.6,1]] : [[5.8,.32],[3.6,1]];
      for (const [width,alpha] of strokes) {
        ctx.globalAlpha=current*alpha; ctx.lineWidth=width; ctx.stroke();
      }
      ctx.strokeStyle=paint.packet; ctx.lineWidth=1.3; ctx.stroke();
      if (progress!=null) drawLaunch(ctx,arc,projection,points,paint,progress,gradient,current);
    }
    ctx.restore();
  }

  function drawCallouts(ctx, items, width, height, paint, font) {
    const left = 13, right = width - 11, row = 50;
    const top = (height - items.length*row) / 2 + 7;
    items.forEach((item,i) => {
      const y = top + i*row;
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
    const instructions = canvas.getAttribute('aria-label');

    const plate = document.createElement('canvas');
    const floor = document.createElement('div');
    floor.className = 'obs-disk-floor';
    floor.setAttribute('aria-hidden','true');
    plate.style.width = plate.style.height = (2*ATLAS_RADIUS)+'px';
    floor.append(plate);
    canvas.before(floor);
    let platePaint;

    const longest = Math.max(1,...actors.map(actor=>actorEvents.get(actor.id).length));
    const nodes = new Map();
    const tracks = actors.map((actor,index) => {
      const events = actorEvents.get(actor.id);
      const track = {
        id:actor.id,index,phase:index*TAU/actors.length,extent:SKY_RADIUS*(.72+.28*events.length/longest),
        from:0,to:0,duration:0,last:null
      };
      track.path = Array.from({length:STEPS+1},(_,j)=>orbitPoint(track,j/STEPS));
      track.nodes = actionNodes(track,events);
      for (const node of track.nodes) nodes.set(node.event.id,node);
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

    let moment,arc,featured,selectedAt=0,initialTravel=0,camera,framing,projection,projectedFocus;
    let focus=CENTER,focusTo=CENTER,selectedFocus=CENTER,velocity=[0,0,0],focusing=false;
    let visualSeconds=0,trackUntil=0,routeMix=1,routes=new Map();
    const off={history:0,last:0,current:0};
    const labelOffsets=new Map();
    let lastDraw=0;

    function appearance({from,to}) {
      if (routeMix===1) return to;
      const t=routeMix*routeMix*(3-2*routeMix);
      return {history:lerp(from.history,to.history,t),last:lerp(from.last,to.last,t),current:lerp(from.current,to.current,t)};
    }

    function selectRoutes(history,animate) {
      const targets=new Map();
      if (featured) targets.set(featured,{...off,[arc?'current':'last']:1});
      for (const read of history) {
        const link=readArcs.get(read);
        if (!link || (link.post.track===featured?.post.track && link.reader.track===featured?.reader.track)) continue;
        targets.set(link,{...off,history:read.message===moment.message ? .44 : targets.size<3 ? .33 : .25});
        if (targets.size>=6) break;
      }
      // Fades belong to their own receipts. Seeking backward drops any future read immediately.
      for (const [link,style] of routes) {
        if (!animate || targets.size>=6 || link.receipt.order>moment.order || targets.has(link)) continue;
        const visible=appearance(style);
        if (Math.max(visible.history,visible.current,visible.last)>.005) targets.set(link,off);
      }
      const next=new Map();
      let changed=false;
      for (const [link,to] of targets) {
        const old=routes.get(link);
        const from=animate ? (old ? appearance(old) : off) : to;
        if (from.current!==to.current || from.last!==to.last || from.history!==to.history) changed=true;
        next.set(link,{from,to});
      }
      routes=next;
      routeMix=changed ? 0 : 1;
    }

    function setFocus(target,animate) {
      focusTo=target;
      focusing=animate && focus!==target;
      if (!focusing) { focus=target; velocity=[0,0,0]; }
    }
    function advance(ms) {
      const changing=focusing || routeMix<1 || visualSeconds<trackUntil;
      visualSeconds+=ms/1000;
      routeMix=Math.min(1,routeMix+ms/340);
      if (focusing && ms>0) {
        const dt=ms/1000, rate=5.6, decay=Math.exp(-rate*dt);
        // A critically damped camera keeps its velocity when a second reader is selected mid-pan.
        focus=focus.map((value,i)=>{
          const delta=value-focusTo[i], v=velocity[i], slope=v+rate*delta;
          velocity[i]=(v-rate*slope*dt)*decay;
          return focusTo[i]+(delta+slope*dt)*decay;
        });
        if (Math.hypot(...focus.map((v,i)=>v-focusTo[i]))<.08 && Math.hypot(...velocity)<.5) setFocus(focusTo,false);
      }
      return changing;
    }

    function select(next,seconds,history,{animate=false,easeFocus=false,launch=false}={}) {
      moment=next; selectedAt=seconds; initialTravel=launch?0:.50;
      if (!animate) trackUntil=visualSeconds;
      arc=readArcs.get(next);
      featured=arc || readArcs.get(reads.findLast(read=>read.order<next.order));
      const receipt=featured?.receipt;
      const description=receipt ? (arc?'Current':'Last')+' read from Agent '+receipt.message.actor+' to Agent '+receipt.actor+'. ' : '';
      canvas.setAttribute('aria-label',description+instructions);
      selectRoutes(history,animate);
      selectedFocus=featured?.focus || CENTER;
      setFocus(selectedFocus,easeFocus);
      for (const track of tracks) {
        const last = track.nodes.findLast(node => node.event.id <= next.event);
        if (animate && last === track.last) continue;
        track.from = trackProgress(track,visualSeconds);
        track.to = last?.t ?? 0; track.last = last;
        track.started = visualSeconds;
        track.duration = animate ? .52 : 0;
        if (track.duration) trackUntil=Math.max(trackUntil,visualSeconds+track.duration);
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
      const now=performance.now(), dt=now-lastDraw;
      const follow=reduced || !lastDraw || dt>250 ? 1 : 1-Math.exp(-dt/80);
      lastDraw=now;
      const center = project([0,0,0]);
      const size = clamp(Math.ceil(width*dpr/128)*128,512,1536);
      if (platePaint!==paint || plate.width!==size) {
        paintDisk(plate,tracks,size,paint);
        platePaint=paint;
      }

      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
      ctx.lineCap='round'; ctx.lineJoin='round';
      const selected=nodes.get(moment.event), post=moment.message && nodes.get(moment.message.event);
      const travelSeconds=(moment.duration/1000)*.8;
      const flight=reduced ? .50 : clamp(initialTravel+(seconds-selectedAt)/travelSeconds,0,1);
      const burn=clamp((flight-.05)/.95,0,1);
      const travel=burn*burn*(2-burn);
      const hits=[],labels=[],occupied=[],callouts=[];
      const pins=new Map();
      if(selected)pins.set(selected,1);
      if(post)pins.set(post,1);
      for (const [link,style] of routes) {
        const {history,last,current}=appearance(style), strength=Math.max(history,last,current);
        if(strength<.005)continue;
        for(const node of [link.post,link.reader])pins.set(node,Math.max(pins.get(node)||0,strength));
      }
      drawDome(ctx,projection,paint);
      drawSpirals(visualSeconds,paint);

      for (const track of tracks) {
        if (!track.nodes.length) continue;
        const {ink,involved}=track;
        if (track.last) {
          const size=magnification(orbitPoint(track,track.reached));
          circle(ctx,...track.head,(involved?3.1:2.1)*size,ink);
          if (involved) circle(ctx,...track.head,1.25*size,paint.paper);
          const hit={x:track.head[0],y:track.head[1],r:8,event:track.last.event.id,latest:true};
          if(track.last===selected)hit.moment=moment.order;
          hits.push(hit);
        }
        const rim = track.screen[Math.floor(STEPS*.94)];
        const dx = rim[0]-center[0], dy = rim[1]-center[1], length = Math.hypot(dx,dy) || 1;
        const anchor = [rim[0]+6*dx/length,rim[1]+6*dy/length];
        labels.push({text:'Agent '+track.id,at:anchor,color:arc && !involved ? paint.muted : ink});
        occupied.push({x:anchor[0]-4,y:anchor[1]-4,w:8,h:8});
      }
      for (const [link,style] of routes) {
        if (link!==featured) drawRead(ctx,link,projection,paint,hits,appearance(style),false,null);
      }
      for (const node of backToFront) {
        const {track,size} = node, ink = paint.agents.get(track.id) || paint.muted;
        const active = node === selected || node === post, latest = node === track.last;
        const alpha=pins.get(node);
        if(alpha===undefined) {
          if(!latest)hits.push({x:node.foot[0],y:node.foot[1],event:node.event.id,r:4,unmarked:true});
          continue;
        }
        const at=node.screenTip;
        ctx.globalAlpha = active ? .95 : alpha*.78;
        line(ctx,[node.foot,at],ink,(active ? 1.35 : .75)*size);
        ctx.globalAlpha = active ? 1 : Math.min(1,alpha);
        circle(ctx,...node.foot,1.15*size,ink);
        const type = node === selected && arc ? 'read' : node.type;
        const radius = type === 'action' ? (node.event.important ? 2 : 1.6) : 2.6;
        pinCap(ctx,type,at,(active ? 3.7 : radius)*size,ink,paint.paper);
        const hit = {x:at[0],y:at[1],event:node.event.id,latest,r:active || latest ? 8 : 5};
        if (node === selected) hit.moment = moment.order;
        hits.push(hit);
        hits.push({...hit,x:node.foot[0],y:node.foot[1],r:4});
      }
      ctx.globalAlpha = 1;
      if (featured) {
        const receipt=featured.receipt;
        const pair=receipt.message.actor+' → '+receipt.actor;
        const style=appearance(routes.get(featured));
        drawRead(ctx,featured,projection,paint,hits,style,true,arc ? travel : null);
        if (arc && travel<1) {
          const [x,y]=project(arc.at(travel));
          occupied.push({x:x-12,y:y-12,w:24,h:24});
        }
        for (let i=4;i<featured.path.length;i+=5) {
          const [x,y]=project(featured.path[i]);
          occupied.push({x:x-4,y:y-4,w:8,h:8});
        }
        labels.unshift({text:(arc?'Now · ':'Last read · ')+pair,at:project(featured.focus),
          color:arc?paint.paper:paint.muted,current:Boolean(arc),receipt,opacity:Math.min(1,style.last+style.current)});
      }
      if (post) {
        const ink = paint.agents.get(post.event.actor);
        bloom(ctx,...post.screenTip,12*post.size,ink,'54');
        circle(ctx,...post.screenTip,6.2*post.size,ink,true);
        hits.push({x:post.screenTip[0],y:post.screenTip[1],r:8,event:post.event.id,moment:sendIndex.get(moment.message.id)});
        callouts.push({name:'Agent '+post.event.actor,detail:'Shared · '+moment.message.time,ink});
      }
      if (selected && (arc || !post)) {
        const ink = paint.agents.get(selected.event.actor);
        bloom(ctx,...selected.screenTip,13*selected.size,ink,'65');
        circle(ctx,...selected.screenTip,6.2*selected.size,ink,true);
        const arrival = (seconds-selectedAt-(1-initialTravel)*travelSeconds)/.7;
        if (arc && !reduced && arrival>0 && arrival<1) {
          ctx.globalAlpha=(1-arrival)*.65;
          circle(ctx,...selected.screenTip,(6.2+13*arrival)*selected.size,ink,true);
          ctx.globalAlpha=1;
        }
        callouts.push({name:'Agent '+selected.event.actor,detail:(arc?'Read':'Turn '+selected.event.turn)+' · '+selected.event.time,ink});
      }
      if (gutter) drawCallouts(ctx,callouts,gutter,height,paint,fontFamily);
      for (const item of labels) {
        ctx.globalAlpha=item.opacity ?? 1;
        const bounds = label(ctx,item,occupied,view,paint,fontFamily,gutter,labelOffsets,follow);
        if (item.receipt) hits.push({bounds,x:item.at[0],y:item.at[1],event:item.receipt.event,
          moment:item.receipt.order,message:item.receipt.message.id});
      }
      ctx.globalAlpha=1;
      if (hover) circle(ctx,hover.x,hover.y,6.5,paint.ink,true);
      return hits.reverse();
    }


    return {
      select,draw,entryYaw,advance,
      get transitioning() { return focusing || routeMix<1 || visualSeconds<trackUntil; },
      holdFocus:()=>setFocus(focus,false),
      resumeFocus:animate=>setFocus(selectedFocus,animate),
      resetFocus:animate=>setFocus(CENTER,animate)
    };
  };
})();
