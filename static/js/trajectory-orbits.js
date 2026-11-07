/* One stellar arm per recorded agent. Only the selected verified read joins two arms. */
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
    const gutter=width>=565?clamp(width*.185,105,142):0;
    const narrow=clamp((470-width)/190,0,1);
    const inclination=Math.max(.16,pitch-narrow*.25);
    const tilt=Math.cos(inclination), lift=Math.sin(inclination);
    const roll=-.035, cr=Math.cos(roll), sr=Math.sin(roll);
    const cy=Math.cos(yaw), sy=Math.sin(yaw);
    // Leave room for raised action markers and for the selected record's callout.
    const roof=width<440?48:38, foot=width<440?22:25;
    const edge=width<440?20:27;
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
    return { matrix, project, gutter };
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
      const baseHeight = type === 'post' ? 34 : type === 'read' ? 23 : event.important ? 15 : 8;
      const height = baseHeight + Math.min(26, (density - 1) * 3.8);
      return {event, t, point, tip:[point[0], point[1], height], type, density,
        tx:Math.cos(angle), ty:Math.sin(angle), raised:type !== 'action' || i % stride === 0};
    });
  }

  // Each recorded action seeds a small cluster of grains along its path.
  function paintDisk(surface, tracks, size, paint) {
    surface.width = surface.height = size;
    const g = surface.getContext('2d');
    const unit = size / (2 * ATLAS_RADIUS);
    g.setTransform(unit, 0, 0, unit, size / 2, size / 2);
    const guide = paint.guide;
    g.strokeStyle = guide;
    g.lineWidth = .65;
    g.globalAlpha = paint.dark ? .21 : .16;
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
      g.globalAlpha = paint.dark ? .29 : .21;
      line(g, track.path, ink, .8);
      g.fillStyle = ink;
      for (const node of track.nodes) {
        const [x, y] = node.point;
        const spread = 5 + Math.min(node.density, 5);
        const grains = 48 + Math.min(24, node.density * 3);
        for (let i = 0; i < grains; i++) {
          const seed = node.event.id;
          const along = (hash(seed, i + 3) - .5) * 25;
          const across = (hash(seed, i + 103) + hash(seed, i + 189) - 1) * spread;
          const pixel = .44 + hash(seed, i + 263) * 1.15;
          g.globalAlpha = (.30 + .53 * hash(seed, i + 349)) * (1 - .45 * Math.abs(across / spread));
          g.fillRect(x + along*node.tx - across*node.ty, y + along*node.ty + across*node.tx, pixel, pixel);
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

  // The only inter-agent curve joins the published record to this exact read.
  function drawRead(ctx, post, reader, project, view, paint, progress, hits, moment) {
    const a = post.screenTip, b = reader.screenTip;
    const dx = reader.point[0] - post.point[0], dy = reader.point[1] - post.point[1];
    const control = project([(post.point[0] + reader.point[0]) * .5 - dy * .10,
      (post.point[1] + reader.point[1]) * .5 + dx * .10,
      Math.max(post.tip[2], reader.tip[2]) + clamp(Math.hypot(dx,dy) * .32, 24, 83)]);
    control[0] = clamp(control[0], 8, view.width - 8);
    control[1] = clamp(control[1], view.width < 440 ? 42 : 25, view.height - 8);
    const point = t => [0,1].map(i => (1-t)*(1-t)*a[i] + 2*(1-t)*t*control[i] + t*t*b[i]);
    const from = paint.agents.get(post.event.actor), to = paint.agents.get(reader.event.actor);
    const gradient = ctx.createLinearGradient(...a, ...b);
    gradient.addColorStop(0,from); gradient.addColorStop(1,to);
    ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...control,...b);
    ctx.strokeStyle = gradient;
    for (const [width, alpha] of [[8,.10],[3.6,.28],[1.65,1]]) {
      ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.stroke();
    }

    const arrow = point(.78), prior = point(.76);
    ctx.save(); ctx.translate(...arrow);
    ctx.rotate(Math.atan2(arrow[1]-prior[1],arrow[0]-prior[0]));
    line(ctx,[[-5,-3.2],[0,0],[-5,3.2]],to,1.7); ctx.restore();

    const start = Math.max(0, progress - Math.min(.27, 32 / Math.max(1, Math.hypot(b[0]-a[0],b[1]-a[1]))));
    const pulse = progress < .5 ? from : to;
    for (let i = 0; i < 10; i++) {
      ctx.globalAlpha = .14 + i * .075;
      line(ctx,[point(lerp(start,progress,i/10)),point(lerp(start,progress,(i+1)/10))],pulse,1.5 + i*.18);
    }
    ctx.globalAlpha = 1;
    const head = point(progress);
    bloom(ctx,...head,12,pulse,'75');
    circle(ctx,...head,3.4,pulse); circle(ctx,...head,1.6,paint.dark?'#fff8df':paint.paper);
    for (let i=1; i<24; i++) {
      const [x,y] = point(i/24);
      hits.push({x,y,r:5,event:reader.event.id,moment:moment.order,message:moment.message.id});
    }
  }

  function drawCallouts(ctx, items, width, height, paint, font) {
    const left = 13, right = width - 11, row = 50;
    const top = (height - items.length*row) / 2 + 7;
    items.forEach((item,i) => {
      const y = top + i*row, mid = y + 11;
      ctx.globalAlpha = .37;
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

  window.createTrajectoryOrbitView = ({canvas, actors, actorEvents, sendIndex, fontFamily}) => {
    const ctx = canvas.getContext('2d');
    const plate = document.createElement('canvas');
    const longest = Math.max(1,...actors.map(a => actorEvents.get(a.id).length));
    const nodes = new Map();
    const tracks = actors.map((actor,i) => {
      const events = actorEvents.get(actor.id);
      const identity = agentIds.indexOf(actor.id);
      const track = {id:actor.id,index:identity < 0 ? i % agentIds.length : identity,
        extent:DISK_RADIUS*(.72 + .28*events.length/longest),from:0,to:0,duration:0,last:null};
      track.path = Array.from({length:STEPS+1},(_,j)=>orbitPoint(track,j/STEPS));
      track.nodes = actionNodes(track,events);
      for (const node of track.nodes) nodes.set(node.event.id,node);
      return track;
    });
    let moment, selectedAt = 0, initialTravel = 0, camera, projection, platePaint;

    function select(next, seconds, animate) {
      moment = next; selectedAt = seconds; initialTravel = animate ? 0 : .54;
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
      camera = view;
      projection = projectDisk(view);
      const {project} = projection;
      for (const track of tracks) {
        track.screen = track.path.map(project);
        for (const node of track.nodes) {
          node.foot = project(node.point);
          node.screenTip = project(node.tip);
        }
      }
    }

    function draw(view, paint, seconds, reduced, hover) {
      if (!ctx || !moment || view.width <= 0 || view.height <= 0) return [];
      layout(view);
      const {width,height,dpr} = view;
      const {matrix,project,gutter} = projection;
      const size = clamp(Math.ceil(width*dpr/128)*128,512,1536);
      if (platePaint !== paint || plate.width !== size) {
        paintDisk(plate,tracks,size,paint);
        platePaint = paint;
      }
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
      ctx.save(); ctx.transform(...matrix);
      ctx.drawImage(plate,-ATLAS_RADIUS,-ATLAS_RADIUS,2*ATLAS_RADIUS,2*ATLAS_RADIUS);
      ctx.restore();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const selected = nodes.get(moment.event), post = moment.message && nodes.get(moment.message.event);
      const contact = moment.kind === 'read' && selected && post && selected.event.actor !== post.event.actor;
      const hits = [], labels = [], occupied = [], callouts = [];

      for (const track of tracks) {
        if (!track.nodes.length) continue;
        const ink = paint.agents.get(track.id) || paint.muted;
        const involved = track.id === moment.actor || track.id === post?.event.actor;
        const quiet = contact && !involved;
        const reached = trackProgress(track,seconds), head = project(orbitPoint(track,reached));
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
        for (const node of track.nodes) {
          const active = node === selected || node === post, latest = node === track.last;
          const past = node.t <= reached;
          const lift = node.raised || active || latest;
          const at = lift ? node.screenTip : node.foot;
          const alpha = past ? (quiet ? .48 : .85) : (quiet ? .18 : .36);
          ctx.globalAlpha = active ? .9 : alpha*.78;
          if (lift) line(ctx,[node.foot,at],ink,active ? 1.35 : .75);
          ctx.globalAlpha = active ? 1 : alpha;
          circle(ctx,...node.foot,lift ? 1.15 : 1.6,ink);
          const type = node === selected && contact ? 'read' : node.type;
          const radius = type === 'action' ? (node.event.important ? 2 : 1.6) : 2.6;
          if (lift) pinCap(ctx,type,at,active ? 3.7 : radius,ink,paint.paper);
          const hit = {x:at[0],y:at[1],event:node.event.id,latest,r:active || latest ? 8 : 5};
          if (node === selected) hit.moment = moment.order;
          hits.push(hit);
          if (lift) hits.push({...hit,x:node.foot[0],y:node.foot[1],r:4});
        }
        ctx.globalAlpha = 1;
        if (track.last) {
          circle(ctx,...head,involved ? 3.1 : 2.1,ink);
          if (involved) circle(ctx,...head,1.25,paint.paper);
        }
        const endpoint = track.id === post?.event.actor ? post : track.id === moment.actor ? selected : null;
        if (!gutter || !endpoint) {
          const rim = track.screen[Math.floor(STEPS*.9)];
          const dx = rim[0]-matrix[4], dy = rim[1]-matrix[5], length = Math.hypot(dx,dy) || 1;
          const anchor = endpoint?.screenTip || [rim[0]+7*dx/length,rim[1]+7*dy/length];
          labels.push({text:'Agent '+track.id,at:anchor,color:involved || !contact ? ink : paint.muted});
          occupied.push({x:anchor[0]-4,y:anchor[1]-4,w:8,h:8});
        }
      }

      if (contact) {
        const t = reduced ? .60 : clamp(initialTravel+(seconds-selectedAt)/1.5,0,1);
        drawRead(ctx,post,selected,project,view,paint,t,hits,moment);
      }
      if (post) {
        const ink = paint.agents.get(post.event.actor);
        bloom(ctx,...post.screenTip,12,ink,'54');
        circle(ctx,...post.screenTip,6.2,ink,true);
        hits.push({x:post.screenTip[0],y:post.screenTip[1],r:8,event:post.event.id,moment:sendIndex.get(moment.message.id)});
        callouts.push({name:'Agent '+post.event.actor,detail:'Shared · '+moment.message.time,ink,at:post.screenTip});
      }
      if (selected && (contact || !post)) {
        const ink = paint.agents.get(selected.event.actor);
        bloom(ctx,...selected.screenTip,13,ink,'65');
        circle(ctx,...selected.screenTip,6.2,ink,true);
        const arrival = (seconds-selectedAt-(1-initialTravel)*1.5)/.55;
        if (contact && !reduced && arrival>0 && arrival<1) {
          ctx.globalAlpha=(1-arrival)*.65;
          circle(ctx,...selected.screenTip,6.2+13*arrival,ink,true);
          ctx.globalAlpha=1;
        }
        callouts.push({name:'Agent '+selected.event.actor,detail:(contact?'Read':'Turn '+selected.event.turn)+' · '+selected.event.time,
          ink,at:selected.screenTip});
      }
      if (gutter) drawCallouts(ctx,callouts,gutter,height,paint,fontFamily);
      for (const item of labels) label(ctx,item,occupied,view,paint,fontFamily);
      if (hover) circle(ctx,hover.x,hover.y,6.5,paint.ink,true);
      return hits;
    }

    return {select,draw};
  };
})();
