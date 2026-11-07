/* Four agents share a galactic disk. Action nodes and message links come from the replay. */
(() => {
  const TAU = Math.PI * 2;
  const STEPS = 152;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const agentIds = ['A','B','C','D'];

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
    const radius = lerp(32 + 4 * track.index, track.extent, progress);
    const r = radius / DISK_RADIUS;
    const angle = track.index * ARM_ANGLE + .35 - 5.25 * r ** .72 +
      .25 * Math.sin(4.1 * r + 1.7 * track.index);
    return [radius * Math.cos(angle), radius * Math.sin(angle), 0];
  }

  // A compact stellar core leaves the silhouette of the disk to the recorded nodes.
  function drawNucleus(context, dark) {
    const glow = context.createRadialGradient(0,0,0,0,0,62);
    glow.addColorStop(0,dark?'#f3d8ad99':'#94704769');
    glow.addColorStop(.20,dark?'#c7a48249':'#997d6230');
    glow.addColorStop(1,'#a58e7100');
    context.fillStyle=glow;context.fillRect(-62,-62,124,124);
    context.fillStyle=dark?'#f5d9b189':'#735f4a56';
    for (let i=0; i<1200; i++) {
      const r=-Math.log(Math.max(.003,hash(i,68)))*15.4, a=TAU*hash(i,67);
      const size=.25+.74*hash(i,65);
      context.fillRect(r*Math.cos(a),r*Math.sin(a),size,size);
    }
  }

  // Orthographic projection keeps every arm and its dust aligned during rotation and drag.
  function projectDisk({width,height,yaw,pitch}) {
    const gutter=width>=530?clamp(width*.225,122,168):0;
    const narrow=clamp((470-width)/190,0,1);
    const inclination=Math.max(.16,pitch-narrow*.25);
    const tilt=Math.cos(inclination), lift=Math.sin(inclination);
    const roll=-.035, cr=Math.cos(roll), sr=Math.sin(roll);
    const cy=Math.cos(yaw), sy=Math.sin(yaw);
    // Leave room for raised action markers and for the selected record's callout.
    const roof=width<440?48:35, foot=width<440?18:20;
    const edge=width<440?18:22;
    const extentX=Math.hypot(cr,sr*tilt), extentY=Math.hypot(sr,cr*tilt);
    const scale=Math.min((width-gutter-2*edge)/(2*DISK_RADIUS*extentX),
      (height-roof-foot)/(2*DISK_RADIUS*extentY));
    const matrix = [
      scale * (cr * cy - sr * sy * tilt), scale * (sr * cy + cr * sy * tilt),
      scale * (-cr * sy - sr * cy * tilt), scale * (-sr * sy + cr * cy * tilt),
      (width+gutter)/2, roof+(height-roof-foot)/2+5
    ];
    const project = ([x,y,z]) => [
      matrix[4] + matrix[0]*x + matrix[2]*y + scale * sr * lift * z,
      matrix[5] + matrix[1]*x + matrix[3]*y - scale * cr * lift * z
    ];
    return { matrix, scale, project, gutter };
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

  window.createTrajectoryOrbitView = ({ canvas, actors, actorEvents, connections, sendIndex, fontFamily, messageSource }) => {
    const ctx = canvas.getContext('2d');
    const base = document.createElement('canvas'), ground = base.getContext('2d');
    const longest = Math.max(1,...actors.map(actor=>actorEvents.get(actor.id).length));
    const tracks = actors.map((actor, i) => {
      const identity = agentIds.indexOf(actor.id);
      const index = identity < 0 ? i % agentIds.length : identity;
      const events = actorEvents.get(actor.id);
      const track = { id: actor.id, index, events,
        extent:DISK_RADIUS * (.55 + .45 * events.length / longest), from: 0, to: 0, last: null };
      track.path = Array.from({ length: STEPS + 1 }, (_, j) => orbitPoint(track, j / STEPS));
      return track;
    });
    const nodes = new Map();
    for (const track of tracks) {
      let day = 0;
      const times = [];
      for (const event of track.events) {
        const [h,m,s] = event.time.split(':').map(Number);
        let at = day + h*3600 + m*60 + s;
        if (at < times.at(-1)) { day += 86400; at += 86400; }
        times.push(at);
      }
      const duration = times.at(-1) - times[0];
      let firstInWindow = 0;
      track.nodes = track.events.map((event, i) => {
        const rank = (i + 1) / track.events.length;
        const t = duration ? .36*rank + .64*(times[i]-times[0])/duration : rank;
        while (times[firstInWindow] < times[i]-10) firstInWindow++;
        const density = i - firstInWindow + 1;
        const point = orbitPoint(track, t);
        const ahead = orbitPoint(track, t + .0005);
        const delta = ahead.map((n, axis) => n - point[axis]);
        const length = Math.hypot(...delta);
        const node = { event, t, point, pin:point.slice(), density, tangent: delta.map(n => n / length) };
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
      const reads = new Map();
      for (const item of connections) {
        if (item.order > next.order) break;
        if (item.kind === 'read') reads.set(item.message.id,(reads.get(item.message.id)||0)+1);
      }
      for (const node of nodes.values()) {
        const e = node.event;
        let height = 7 + Math.min(29,4.5*(node.density-1)) + (e.important?6:0);
        if (e.reads.length) height = Math.max(height,24 + 5*Math.sqrt(e.reads.length));
        if (e.messages.length) {
          const received = e.messages.reduce((sum,id)=>sum+(reads.get(id)||0),0);
          height = 32 + Math.min(36,11*Math.sqrt(received));
        }
        node.pin[2] = height;
      }
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
      const posted = arc(sender.pin,post,32,-.16,sender.tangent,null);
      const read = item.kind === 'read' ? arc(post,receiver.pin,40,.18,null,receiver.tangent) : [];
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
      drawNucleus(ground,paint.dark);
      ground.lineWidth = .65*pen;
      ground.strokeStyle = paint.guide + (paint.dark ? '32' : '35');
      for (const factor of [.34,.68,1.03]) {
        ground.beginPath(); ground.arc(0,0,DISK_RADIUS*factor,0,TAU); ground.stroke();
      }
      for (let i=0; i<80; i++) {
        const a=TAU*i/80, r=DISK_RADIUS*1.055, outer=r+(i%5===0?5:2.4)*pen;
        line(ground,[[r*Math.cos(a),r*Math.sin(a)],[outer*Math.cos(a),outer*Math.sin(a)]],
          paint.guide+(i%5===0?'63':'37'),.72*pen);
      }
      ground.lineCap = 'round'; ground.lineJoin = 'round';
      for (const track of tracks) {
        const ink = paint.agents.get(track.id) || paint.muted;
        const relevant = track.id === moment.actor || track.id === moment.message?.actor || moment.kind === 'outcome';
        ground.setLineDash([2*pen,3.7*pen]);
        line(ground,track.path,ink+(relevant?'43':'2c'),.65*pen);
        ground.setLineDash([]);
        for (const node of track.nodes) {
          const e = node.event, [x,y] = node.point;
          const inkHere = ink + (e.id > moment.event ? '48' : relevant ? 'bd' : '92');
          // A fine footprint follows each actual record, along its arm's tangent.
          const [tx,ty]=node.tangent;
          ground.fillStyle=ink+(e.id>moment.event?'4c':relevant?'a4':'7c');
          const grains=32+Math.min(26,node.density*4);
          for(let k=0;k<grains;k++){
            const along=(hash(e.id,k+3)-.5)*22, across=(hash(e.id,k+65)+hash(e.id,k+125)-1)*7.5;
            const size=.32+.85*hash(e.id,k+191);
            ground.fillRect(x+along*tx-across*ty,y+along*ty+across*tx,size,size);
          }
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

    function drawCallouts(gutter, height, project, link, paint) {
      const selected=nodes.get(moment.event);
      if (!selected) return;
      const items=[];
      if (link) {
        const source=nodes.get(moment.message.event);
        items.push({at:project(source.pin), ink:paint.agents.get(moment.message.actor),
          title:'Agent '+moment.message.actor, detail:'Sent · '+moment.message.time});
        items.push({at:link.posted.at(-1), ink:paint.muted, title:'Message '+String(moment.index+1).padStart(2,'0'),
          detail:messageSource(moment.message)});
        if (moment.kind==='read') items.push({at:project(selected.pin), ink:paint.agents.get(moment.actor),
          title:'Agent '+moment.actor, detail:'Read · '+moment.time});
      } else {
        items.push({at:project(selected.pin), ink:paint.agents.get(moment.actor),
          title:'Agent '+moment.actor, detail:'Action · turn '+moment.turn});
      }
      const x=10, w=gutter-18, h=38, gap=7;
      const y0=(height-(h+gap)*items.length+gap)/2;
      items.forEach((item,i)=>{
        const y=y0+i*(h+gap), mid=y+h/2;
        line(ctx,[[x+w,mid],[x+w+10,mid],item.at],item.ink+'7d',.75);
        circle(ctx,...item.at,5.1,item.ink+'ad',true);
        ctx.beginPath();ctx.roundRect(x,y,w,h,4);ctx.fillStyle=paint.paper;ctx.fill();
        ctx.strokeStyle=paint.guide+'55';ctx.lineWidth=.75;ctx.stroke();
        line(ctx,[[x+1,y+5],[x+1,y+h-5]],item.ink,1.7);
        ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='550 11px '+fontFamily;
        ctx.fillStyle=paint.ink;ctx.fillText(item.title,x+8,y+12,w-15);
        ctx.font='9px '+fontFamily;ctx.fillStyle=item.ink;ctx.fillText(item.detail,x+8,y+27,w-15);
      });
    }

    function draw(view, paint, seconds, reduced, hover) {
      if (!ctx || !moment || view.width<=0 || view.height<=0) return [];
      const { width,height,dpr } = view;
      const { scale,matrix,project,gutter } = projectDisk(view);
      if (!cache || cache.paint !== paint || cache.scale !== scale || cache.dpr !== dpr) {
        cache = prepare(view,paint,scale);
      }
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,width,height);
      ctx.save(); ctx.transform(...matrix);
      ctx.lineCap='round';
      // The completed portion of each agent's path advances to its next recorded action.
      for (const track of tracks) {
        if (!track.last) continue;
        const reached = progress(track,seconds);
        const past = track.path.slice(0,Math.floor(reached * STEPS)+1);
        past.push(orbitPoint(track,reached));
        const ink = paint.agents.get(track.id) || paint.muted;
        const active = track.id===moment.actor || track.id===moment.message?.actor;
        line(ctx,past,ink+(active?'bb':'82'),(active?1.35:1.05)/scale);
      }
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
      // A post's height grows with its exact read receipts. All stems stay attached to real actions.
      for (const track of tracks) {
        const ink = paint.agents.get(track.id) || paint.muted;
        const frontier = progress(track,seconds);
        const primary = track.id===moment.actor || track.id===moment.message?.actor;
        for (const node of track.nodes) {
          const future=node.t>frontier;
          const event=node.event, foot=project(node.point), head=project(node.pin);
          const selected=event.id===moment.event, latest=node===track.last;
          const exchange=event.messages.length || event.reads.length;
          line(ctx,[foot,head],ink+(future?'55':selected?'ec':exchange?'b8':primary?'8c':'72'),selected?1.45:.83);
          if (event.reads.length) {
            circle(ctx,...head,selected?4:2.65,paint.paper);
            circle(ctx,...head,selected?4:2.65,ink+(future?'78':selected?'ff':'d0'),true);
          } else if (event.messages.length) {
            const [x,y]=head, r=selected?3.8:2.8;
            ctx.fillStyle=ink+(future?'6a':'eb');ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);
            ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();
          } else circle(ctx,...head,selected?3.5:latest?2.5:1.35+.13*Math.min(5,node.density),ink+(future?'76':selected?'ff':primary?'d3':'a9'));
          const hit={x:head[0],y:head[1],event:event.id,pin:true,latest,r:selected||latest?8:4};
          if (selected) hit.moment=moment.order;
          hits.push(hit);
        }
      }
      const activeLink = cache.link ? drawTransfer(cache.link,project,paint,hits) : null;
      for (const track of tracks) {
        if (!track.last) continue;
        const active = track.id===moment.actor || track.id===moment.message?.actor;
        // Label the recorded endpoints of the exchange, even if its author has acted since.
        const anchor = track.id===moment.message?.actor && track.id!==moment.actor
          ? nodes.get(moment.message.event) : track.last;
        const [x,y]=project(anchor.pin);
        occupied.push({x:x-5,y:y-5,w:10,h:10});
        if (!gutter || !active) labels.push({text:'Agent '+track.id,x,y,radius:4,ink:active?paint.agents.get(track.id):paint.muted});
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
        if (!gutter) labels.unshift({text:'Message '+String(moment.index+1).padStart(2,'0'),x,y,radius:8,ink:paint.ink});
      }
      if (gutter && moment.kind!=='outcome') drawCallouts(gutter,height,project,activeLink,paint);
      for (const item of labels) label(item.text,item.x,item.y,{width,height,radius:item.radius},paint,item.ink,occupied);
      if (hover) circle(ctx,hover.x,hover.y,hover.r||7,paint.ink,true);
      return hits;
    }
    return { select, draw };
  };
})();
