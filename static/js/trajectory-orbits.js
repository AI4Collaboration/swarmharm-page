/* Each agent has one action path. A verified read briefly joins two paths. */
(() => {
  const TAU = 2 * Math.PI;
  const STEPS = 144;
  const RADIUS = 230;
  const actorIds = ['A', 'B', 'C', 'D'];
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const lerp = (a, b, t) => a + (b - a) * t;

  function orbitPoint(track, progress) {
    const radius = lerp(42 + 4 * track.index, track.extent, progress);
    const r = radius / RADIUS;
    const angle = track.index * TAU / actorIds.length + .35 - 5.25 * r ** .72 +
      .25 * Math.sin(4.1 * r + 1.7 * track.index);
    return [radius * Math.cos(angle), radius * Math.sin(angle)];
  }

  function projection({width, height, yaw, pitch}) {
    const narrow = clamp((470 - width) / 190, 0, 1);
    const tilt = Math.max(.16, pitch - narrow * .20);
    const top = width < 440 ? 46 : 31, bottom = 27;
    const scale = Math.min((width - (width < 440 ? 42 : 76)) / (2 * RADIUS),
      (height - top - bottom) / (2 * RADIUS * Math.cos(tilt)));
    const cx = width / 2, cy = (height + top - bottom) / 2;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const depth = Math.cos(tilt), lift = Math.sin(tilt);
    return ([x, y, z = 0]) => [cx + scale * (x * cos - y * sin),
      cy + scale * ((x * sin + y * cos) * depth - z * lift)];
  }

  function stroke(ctx, points, color, width) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function dot(ctx, [x, y], radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function trackProgress(track, seconds) {
    if (!track.duration) return track.to;
    const t = clamp((seconds - track.started) / track.duration, 0, 1);
    return lerp(track.from, track.to, t * t * (3 - 2 * t));
  }

  function actionNodes(events, track) {
    const times = [];
    let day = 0;
    for (const event of events) {
      const [h, m, s] = event.time.split(':').map(Number);
      let at = day + h * 3600 + m * 60 + s;
      if (at < times.at(-1)) { day += 86400; at += 86400; }
      times.push(at);
    }
    const duration = times.at(-1) - times[0];
    return events.map((event, i) => {
      const rank = (i + 1) / events.length;
      // Keep actions with identical timestamps individually selectable on the same curve.
      const t = duration ? .36 * rank + .64 * (times[i] - times[0]) / duration : rank;
      return {event, t, point:orbitPoint(track, t)};
    });
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

  window.createTrajectoryOrbitView = ({canvas, actors, actorEvents, sendIndex, fontFamily}) => {
    const ctx = canvas.getContext('2d');
    const longest = Math.max(1, ...actors.map(a => actorEvents.get(a.id).length));
    const nodes = new Map();
    const tracks = actors.map((actor, i) => {
      const identity = actorIds.indexOf(actor.id), events = actorEvents.get(actor.id);
      const track = {id:actor.id, index:identity < 0 ? i % actorIds.length : identity,
        extent:RADIUS * (.55 + .45 * events.length / longest), from:0, to:0, duration:0, last:null};
      track.path = Array.from({length:STEPS + 1}, (_, j) => orbitPoint(track, j / STEPS));
      track.nodes = actionNodes(events, track);
      for (const node of track.nodes) nodes.set(node.event.id, node);
      return track;
    });

    let moment, selectedAt, camera, project;
    function select(next, seconds, animate) {
      moment = next;
      selectedAt = seconds;
      for (const track of tracks) {
        const last = track.nodes.findLast(node => node.event.id <= next.event);
        if (animate && last === track.last) continue;
        track.from = trackProgress(track, seconds);
        track.to = last?.t ?? 0;
        track.last = last;
        track.started = seconds;
        track.duration = animate ? Math.min(.42, next.duration / 1000) : 0;
      }
    }

    function layout(view) {
      if (camera && ['yaw', 'pitch', 'width', 'height'].every(k => camera[k] === view[k])) return;
      camera = view;
      project = projection(view);
      for (const track of tracks) {
        track.screen = track.path.map(project);
        for (const node of track.nodes) node.screen = project(node.point);
      }
    }

    // A single directed curve between the exact post and the selected reader's action.
    function messageLink(source, reader, seconds, reduced, paint, hits) {
      const a = source.screen, b = reader.screen;
      const dx = reader.point[0] - source.point[0], dy = reader.point[1] - source.point[1];
      const c = project([(source.point[0] + reader.point[0]) / 2 - .10 * dy,
        (source.point[1] + reader.point[1]) / 2 + .10 * dx, Math.min(70, Math.hypot(dx, dy) * .30)]);
      c[0] = clamp(c[0], 12, camera.width - 12);
      c[1] = clamp(c[1], 32, camera.height - 12);
      const point = t => [0, 1].map(i => (1-t)**2*a[i] + 2*(1-t)*t*c[i] + t*t*b[i]);
      const senderColor = paint.agents.get(source.event.actor), readerColor = paint.agents.get(reader.event.actor);
      const gradient = ctx.createLinearGradient(...a, ...b);
      gradient.addColorStop(0, senderColor);
      gradient.addColorStop(1, readerColor);
      ctx.beginPath(); ctx.moveTo(...a); ctx.quadraticCurveTo(...c, ...b);
      ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeStyle = gradient; ctx.stroke(); ctx.setLineDash([]);

      const arrow = point(.78), before = point(.76);
      ctx.save(); ctx.translate(...arrow); ctx.rotate(Math.atan2(arrow[1]-before[1], arrow[0]-before[0]));
      stroke(ctx, [[-5, -3], [0, 0], [-5, 3]], readerColor, 1.8); ctx.restore();
      if (!reduced) {
        const t = clamp((seconds - selectedAt) / 1.05, 0, 1);
        if (t > 0 && t < 1) {
          const position = point(t);
          dot(ctx, position, 4, paint.paper);
          dot(ctx, position, 2.7, t < .5 ? senderColor : readerColor);
        }
      }
      for (let i = 1; i < 16; i++) {
        const [x, y] = point(i / 16);
        hits.push({x, y, r:5, event:reader.event.id, moment:moment.order, message:moment.message.id});
      }
    }

    function draw(view, paint, seconds, reduced, hover) {
      const {width, height, dpr} = view;
      if (!ctx || !moment || width <= 0 || height <= 0) return [];
      layout(view);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const hits = [], labels = [], occupied = [];
      const selected = nodes.get(moment.event);
      const post = moment.message && nodes.get(moment.message.event);
      const contact = moment.kind === 'read' && post && selected && post.event.actor !== selected.event.actor;

      for (const track of tracks) {
        if (!track.nodes.length) continue;
        const ink = paint.agents.get(track.id) || paint.muted;
        const involved = track.id === moment.actor || track.id === post?.event.actor;
        const quiet = contact && !involved;
        const reached = trackProgress(track, seconds), head = project(orbitPoint(track, reached));
        // The guide and the growing trail have exactly the same centerline.
        stroke(ctx, track.screen, ink + (quiet ? '37' : '62'), 1);
        if (track.last) {
          const past = track.screen.slice(0, Math.floor(reached * STEPS) + 1);
          past.push(head);
          stroke(ctx, past, ink + (quiet ? '79' : 'e0'), quiet ? 1.35 : 2);
        }
        for (const node of track.nodes) {
          const done = node.t <= reached;
          const latest = node === track.last;
          dot(ctx, node.screen, done ? 1.5 : 1, ink + (done ? (quiet ? '9a' : 'ed') : '53'));
          const [x, y] = node.screen;
          const hit = {x, y, event:node.event.id, latest, r:latest ? 8 : 5};
          if (node === selected) hit.moment = moment.order;
          hits.push(hit);
        }
        if (track.last) {
          dot(ctx, head, involved ? 3.1 : 2.4, ink + (quiet ? '99' : 'ff'));
        }
        const anchor = contact && track.id === post.event.actor ? post.screen :
          contact && track.id === moment.actor ? selected.screen : head;
        labels.push({text:'Agent ' + track.id, at:anchor, color:ink});
        occupied.push({x:anchor[0]-5, y:anchor[1]-5, w:10, h:10});
      }
      if (contact) messageLink(post, selected, seconds, reduced, paint, hits);
      if (post) {
        const [x, y] = post.screen, ink = paint.agents.get(post.event.actor);
        dot(ctx, post.screen, 5, ink); dot(ctx, post.screen, 3, paint.paper);
        hits.push({x, y, r:8, event:post.event.id, moment:sendIndex.get(moment.message.id), message:moment.message.id});
      }
      if (contact) {
        dot(ctx, selected.screen, 5, paint.agents.get(moment.actor));
        dot(ctx, selected.screen, 2, paint.paper);
      }
      for (const item of labels) label(ctx, item, occupied, view, paint, fontFamily);
      if (hover) {
        ctx.beginPath(); ctx.arc(hover.x, hover.y, 6, 0, TAU);
        ctx.lineWidth = 1; ctx.strokeStyle = paint.ink; ctx.stroke();
      }
      return hits;
    }
    return {select, draw};
  };
})();
