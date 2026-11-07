(() => {
  // The same identity colors follow an agent through illustrations, chat and canvas lanes.
  window.swarmAgentPalette = Object.freeze({ A:'var(--agent-a)', B:'var(--agent-b)', C:'var(--agent-c)', D:'var(--agent-d)' });
  window.swarmAgentImage = (actor, role = 'action') => {
    const mood = role === 'message' ? 'speaking' : role === 'read' ? 'attentive' : 'focused';
    return `static/images/fieldguide/finding-agents.svg?v=7#${String(actor).toLowerCase()}-${mood}`;
  };
  const palette = window.swarmAgentPalette, motion = matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  // Explanatory phases, not synthetic messages or additional recorded events.
  // Routes refer to the existing arrows in each illustration.
  const sequences = {
    'setup-discover': [
      {end:.3,actors:'A',routes:[]}, {end:.68,actors:'A',routes:[[0,'A']]}, {end:1,actors:'AB',routes:[]}
    ],
    'setup-outcome': [
      {end:.3,actors:'ABCD',routes:[]}, {end:.72,actors:'ABCD',routes:[[0,'A'],[1,'B'],[2,'C'],[3,'D']]}, {end:1,actors:'ABCD',routes:[]}
    ],
    f11: [
      {end:.35,actors:'A',routes:[[0,'A']]}, {end:.7,actors:'B',routes:[[1,'B']]}, {end:1,actors:'AB',routes:[]}
    ],
    f12: [
      {end:.42,actors:'AB',routes:[[0,'A']]}, {end:.84,actors:'AB',routes:[[1,'B']]}, {end:1,actors:'AB',routes:[]}
    ],
    f13: [
      {end:.24,actors:'A',routes:[]}, {end:.72,actors:'AB',routes:[[0,'A']]}, {end:1,actors:'B',routes:[]}
    ],
    f23: [
      {end:.27,actors:'C',routes:[]}, {end:.67,actors:'CB',routes:[[0,'C']]}, {end:1,actors:'BAD',routes:[[1,'B']]}
    ],
    f21: [
      {end:.2,actors:'D',routes:[[0,'D']]}, {end:.4,actors:'CB',routes:[[1,'C'],[2,'B']]}, {end:1,actors:'CB',routes:[[3,'C'],[4,'B']]}
    ],
    f22: [
      {end:.28,actors:'ABCD',routes:[]}, {end:.65,actors:'ABCD',routes:[[0,'A'],[1,'B'],[2,'C'],[3,'D']]}, {end:1,actors:'ABCD',routes:[]}
    ]
  };
  const states = [];
  let frame = 0, lastFrame = 0;
  const canRun = s => s.playing && s.visible && !document.hidden && !motion.matches;
  function control(s) {
    const label = s.playing ? 'Pause' : s.elapsed > 0 && s.elapsed < s.duration ? 'Resume' : 'Replay';
    s.button.querySelector('span').textContent = label;
    s.button.setAttribute('aria-label', `${label} illustration: ${s.title}`);
    s.button.querySelector('path').setAttribute('d', s.playing ? 'M7 4v12M13 4v12' : 'M4 6a7 7 0 1 1-1 6M4 2v5h5');
    s.figure.classList.toggle('is-paused', s.elapsed < s.duration && !canRun(s));
  }
  function render(s) {
    const fraction = Math.min(1, s.elapsed / s.duration);
    const index = Math.max(0, s.steps.findIndex(step => fraction <= step.end));
    const step = s.steps[index], start = index ? s.steps[index-1].end : 0;
    const progress = Math.max(0, Math.min(1, (fraction-start)/(step.end-start)));
    s.figure.dataset.diagramPhase = String(index+1);
    s.agents.forEach(el => el.toggleAttribute('data-active',step.actors.includes(el.dataset.diagramAgent)));
    s.ticks.forEach((el,i) => {
      el.toggleAttribute('data-active',i===index); el.toggleAttribute('data-complete',i<index);
    });
    s.routes.forEach((route,i) => {
      const active=step.routes.find(([routeIndex])=>routeIndex===i);
      route.path.toggleAttribute('data-active',Boolean(active));
      route.signal.toggleAttribute('hidden',!active); route.packet.toggleAttribute('hidden',!active);
      if (!active) return;
      const color=palette[active[1]], point=route.path.getPointAtLength(progress*route.length);
      route.path.style.setProperty('--signal',color); route.signal.style.setProperty('--signal',color);
      route.signal.style.strokeDashoffset=String(7-progress*100);
      route.packet.style.setProperty('--signal',color);
      route.packet.setAttribute('transform',`translate(${point.x} ${point.y})`);
      const opacity=String(Math.min(1,progress*10,(1-progress)*10));
      route.signal.style.opacity=opacity; route.packet.style.opacity=opacity;
    });
  }
  function finish(s) {
    s.elapsed=s.duration; s.playing=false;
    s.figure.classList.remove('is-playing','is-paused');
    s.agents.forEach(el=>el.removeAttribute('data-active'));
    s.routes.forEach(route=>{
      route.path.removeAttribute('data-active'); route.signal.setAttribute('hidden',''); route.packet.setAttribute('hidden','');
    });
    s.ticks.forEach(el=>{el.removeAttribute('data-active'); el.setAttribute('data-complete','');});
    control(s);
  }
  function tick(now) {
    const delta=lastFrame ? now-lastFrame : 0;
    frame=0; lastFrame=now;
    states.forEach(s=>{
      if (!canRun(s)) return;
      s.elapsed+=delta;
      if(s.elapsed>=s.duration)finish(s); else render(s);
    });
    schedule();
  }
  function schedule() {
    if(frame || !states.some(canRun)) {if(!frame)lastFrame=0; return;}
    frame=requestAnimationFrame(tick);
  }
  function start(s) {
    if(motion.matches)return;
    if(!s.elapsed || s.elapsed>=s.duration) {
      s.elapsed=0; s.figure.classList.remove('is-playing','is-paused');
      void s.figure.offsetWidth;
      s.figure.classList.add('is-playing');
    }
    s.seen=true; s.playing=true; render(s); control(s); schedule();
  }
  document.querySelectorAll('.finding-visual[data-finding-diagram]').forEach(figure=>{
    const steps=sequences[figure.dataset.findingDiagram];
    const svg=figure.querySelector('.diagram-stage > svg'), button=figure.querySelector('.diagram-replay');
    if(!steps || !svg || !button)return;
    const routes=[...svg.querySelectorAll('.diagram-arrow')].map(path=>{
      const signal=document.createElementNS(ns,'path');
      signal.setAttribute('d',path.getAttribute('d')); signal.setAttribute('pathLength','100');
      signal.setAttribute('class','diagram-signal'); signal.setAttribute('hidden',''); signal.setAttribute('aria-hidden','true');
      const packet=document.createElementNS(ns,'g');
      packet.setAttribute('class','diagram-packet'); packet.setAttribute('hidden',''); packet.setAttribute('aria-hidden','true');
      [['packet-glow',8],['packet-core',2.5]].forEach(([name,radius])=>{
        const dot=document.createElementNS(ns,'circle'); dot.setAttribute('class',name); dot.setAttribute('r',radius); packet.append(dot);
      });
      svg.append(signal,packet);
      return {path,signal,packet,length:path.getTotalLength()};
    });
    const s={figure,svg,button,steps,routes,agents:[...svg.querySelectorAll('[data-diagram-agent]')],ticks:[...figure.querySelectorAll('.diagram-progress i')],title:svg.querySelector('title').textContent,duration:Number(figure.dataset.diagramDuration)||4200,elapsed:0,playing:false,visible:false,seen:false};
    figure.style.setProperty('--diagram-duration',s.duration+'ms'); button.hidden=motion.matches;
    control(s); states.push(s);
    button.addEventListener('click',()=>{if(s.playing){s.playing=false;control(s);}else start(s);});
  });
  const observer='IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const s=states.find(item=>item.figure===entry.target); s.visible=entry.isIntersecting;
      if(s.visible && !s.seen && !motion.matches)start(s);else control(s);
    });
    schedule();
  },{threshold:.55}) : null;
  states.forEach(s=>{if(observer)observer.observe(s.figure);else s.visible=true;});
  motion.addEventListener('change',()=>{states.forEach(s=>{finish(s);s.button.hidden=motion.matches;});});
  document.addEventListener('visibilitychange',()=>{states.forEach(control);schedule();});
})();
