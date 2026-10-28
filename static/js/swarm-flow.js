(() => {
  const figure = document.querySelector('[data-swarm-flow]');
  if (!figure) return;
  const panels = Array.from(figure.querySelectorAll('[data-swarm-stage]'));
  if (panels.length !== 4) return;
  const NS = 'http://www.w3.org/2000/svg';
  const sprite = 'static/images/fieldguide/swarm-agent.png';
  const clamp = value => Math.max(0, Math.min(1, value));
  const ease = value => { const t = clamp(value); return t*t*(3-2*t); };
  const blend = (a, b, t) => a + (b-a)*t;
  const node = (parent, tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    parent.append(el);
    return el;
  };
  const path = (parent, d, className = 'flow-line') => node(parent, 'path', { d, class: className });
  function agent(parent) {
    const group = node(parent, 'g');
    node(group, 'image', { href: sprite, x: -22, y: -27, width: 44, height: 54, class: 'flow-robot' });
    const thought = node(group, 'g', { class: 'flow-thought' });
    [-5, 2, 9].forEach(x => node(thought, 'circle', { cx: x, cy: -36, r: 1.7 }));
    return { group, thought };
  }
  function move(actor, x, y, thinking = 0) {
    actor.group.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    actor.thought.setAttribute('opacity', thinking.toFixed(2));
  }
  function documentIcon(parent, x, y) {
    path(parent, `M${x} ${y}h18v24h-18Zm4 7h10m-10 5h10m-10 5h6`, 'flow-note');
  }
  function envelope(parent) {
    const group = node(parent, 'g', { class: 'flow-message', opacity: 0 });
    node(group, 'rect', { x: -7, y: -4.5, width: 14, height: 9, rx: 1 });
    path(group, 'm-7-4.5 7 5 7-5', 'flow-message-fold');
    return group;
  }
  function send(message, from, to, fraction, visible) {
    const t = clamp(fraction);
    message.setAttribute('transform', `translate(${blend(from[0], to[0], t).toFixed(2)} ${blend(from[1], to[1], t).toFixed(2)})`);
    message.setAttribute('opacity', visible ? '1' : '0');
  }
  const outer = [[66, 62], [254, 62], [66, 192], [254, 192]];
  const inner = [[101, 78], [219, 78], [101, 176], [219, 176]];
  const center = [160, 126];
  const scenes = panels.map((svg, index) => {
    svg.replaceChildren();
    const background = node(svg, 'g');
    const links = node(svg, 'g');
    const props = node(svg, 'g');
    const actors = outer.map(() => agent(svg));
    const messages = outer.map(() => envelope(svg));
    if (index === 0) {
      [[15, 15], [173, 15], [15, 139], [173, 139]].forEach(([x, y], i) => {
        node(background, 'rect', { x, y, width: 132, height: 96, rx: 7, class: 'flow-sandbox' });
        documentIcon(background, x + (i % 2 ? 90 : 96), y + 16);
        path(background, `M${x+25} ${y+70}q35-30 70-10`, 'flow-trail');
      });
      return p => {
        actors.forEach((actor, i) => {
          const phase = p*2*Math.PI + i*.9;
          const walk = .15 + .85*ease((Math.sin(phase)**2-.15)/.25);
          const x = outer[i][0] + 15*Math.sin(phase)*walk;
          const y = outer[i][1] + 9*Math.cos(phase*1.5)*walk;
          const thinking = p > 0 && p < 1 ? .35 + .65*Math.abs(Math.sin(phase*2)) : .55;
          move(actor, x, y, thinking);
        });
      };
    }
    const routes = outer.map(() => path(links, '', 'flow-link'));
    if (index === 1) {
      const shared = node(props, 'g');
      path(shared, 'M130 109v-9h23l9 9h28v43h-60Z', 'flow-folder');
      path(shared, 'M141 122h38m-38 9h30m-30 9h34', 'flow-note');
      return p => {
        shared.setAttribute('opacity', String(.18 + .82*ease(p/.3)));
        actors.forEach((actor, i) => {
          const found = ease((p-i*.12-.1)/.36);
          const point = outer[i].map((v, axis) => blend(v, inner[i][axis], found));
          move(actor, ...point, (1-found)*.6);
          routes[i].setAttribute('d', `M${point[0]} ${point[1]}L160 126`);
          routes[i].setAttribute('opacity', found*.75);
          const t = (p*3-i*.3)%1;
          send(messages[i], point, center, t, found > .6 && p < 1 && t >= 0);
        });
      };
    }
    if (index === 2) {
      path(background, 'M66 62H254V192H66Z', 'flow-trail');
      node(props, 'rect', { x: 125, y: 91, width: 70, height: 70, rx: 3, class: 'flow-folder' });
      const plan = [107, 126, 145].map(y => {
        const row = node(props, 'g');
        path(row, `m135 ${y} 3 3 5-6M151 ${y}h30`, 'flow-plan');
        return row;
      });
      return p => {
        plan.forEach((row, i) => row.setAttribute('opacity', String(.12 + .88*ease((p-i*.22-.12)/.2))));
        actors.forEach((actor, i) => {
          const bob = p > 0 && p < 1 ? Math.sin(p*13+i)*1.5 : 0;
          move(actor, outer[i][0], outer[i][1]+bob, p > 0 && p < 1 ? .3+.5*Math.abs(Math.sin(p*14+i)) : 0);
          routes[i].setAttribute('d', `M${outer[i][0]} ${outer[i][1]}L160 126`);
          routes[i].setAttribute('opacity', .45);
          const t = (p*4+i*.24)%1;
          send(messages[i], i%2 ? center : outer[i], i%2 ? outer[i] : center, t, p > 0 && p < 1);
        });
      };
    }
    const system = node(props, 'rect', { x: 112, y: 87, width: 96, height: 78, rx: 4, class: 'flow-folder' });
    const copies = [[123, 98], [165, 98], [123, 132], [165, 132]].map(([x, y]) => {
      const tile = node(props, 'g');
      node(tile, 'rect', { x, y, width: 32, height: 22, rx: 2, class: 'flow-copy' });
      path(tile, `M${x+6} ${y+7}h20m-20 7h15`, 'flow-note');
      return tile;
    });
    const failure = path(props, 'm145 111 30 30m0-30-30 30', 'flow-failure');
    return p => {
      actors.forEach((actor, i) => {
        move(actor, ...outer[i]);
        routes[i].setAttribute('d', `M${outer[i][0]} ${outer[i][1]}L160 126`);
        routes[i].setAttribute('opacity', String(.15+.65*ease((p-.08)/.3)));
        const action = (p-.08-i*.14)/.22;
        send(messages[i], outer[i], center, action, action > 0 && action < 1);
        copies[i].setAttribute('opacity', String(1-ease((p-.3-i*.14)/.12)));
      });
      const failed = ease((p-.8)/.12);
      failure.setAttribute('opacity', String(failed));
      system.classList.toggle('flow-system-failed', failed > .5);
    };
  });
  const durations = [5200, 4800, 5800, 5200];
  const total = durations.reduce((sum, value) => sum+value, 0);
  const names = ['explore', 'discover', 'coordinate', 'act'];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const button = figure.querySelector('[data-flow-toggle]');
  let paused = reduced.matches, visible = false, elapsed = paused ? total-1 : 0, last = 0, frame = 0;
  function render() {
    let start = 0;
    scenes.forEach((draw, i) => {
      const p = clamp((elapsed-start)/durations[i]);
      const active = elapsed >= start && elapsed < start+durations[i];
      panels[i].closest('.life-step').classList.toggle('is-current', active);
      panels[i].closest('.life-step').classList.toggle('is-complete', p === 1);
      if (active) figure.dataset.flowPhase = names[i];
      draw(p);
      start += durations[i];
    });
  }
  function sync() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    const running = !paused && visible && !document.hidden;
    figure.dataset.flowRunning = String(running);
    button.setAttribute('aria-label', paused ? 'Play the swarm animation' : 'Pause the swarm animation');
    button.setAttribute('title', paused ? 'Play animation' : 'Pause animation');
    button.setAttribute('aria-pressed', String(paused));
    button.querySelector('path').setAttribute('d', paused ? 'm8 5 10 7-10 7Z' : 'M8 5v14M16 5v14');
    if (running) frame = requestAnimationFrame(tick);
  }
  function tick(now) {
    if (last) elapsed = (elapsed+Math.min(now-last, 80))%total;
    last = now;
    render();
    frame = requestAnimationFrame(tick);
  }
  button.hidden = false;
  button.addEventListener('click', () => {
    paused = !paused;
    if (!paused && elapsed >= total-1) elapsed = 0;
    sync();
  });
  reduced.addEventListener('change', () => {
    paused = reduced.matches;
    if (paused) { elapsed = total-1; render(); }
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold: .05 }).observe(figure);
  } else { visible = true; }
  render();
  sync();
})();
