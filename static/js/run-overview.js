(function(){
  const figure = document.querySelector('[data-run-overview]');
  const lanes = window.SWARMHARM_RUN_TURNS;
  const data = window.SWARMHARM_TRAJECTORY;
  if (!figure || !lanes || !data) return;
  const actors = Object.keys(lanes).sort();
  const longest = Math.max(...actors.map(actor => lanes[actor].length));
  const total = actors.reduce((sum, actor) => sum + lanes[actor].length, 0);
  const width = longest * 10;
  const rowHeight = 32;
  const positions = new Map();
  const summaries = new Map(data.messages.map(message => [message.id, message.title]));
  const readers = new Map();
  for (const id of data.steps.find(step => step.key === 'explore').events) {
    summaries.set(id, 'Inspects the workspace');
  }
  const connections = [];
  const chart = figure.querySelector('.run-coordinate');
  const summary = figure.querySelector('[data-turn-summary]');
  const controls = new Map();
  const point = (actor, turn) => ({x: (turn - 0.5) * 10, y: (actors.indexOf(actor) + 0.5) * rowHeight});
  figure.querySelector('#run-total').textContent = `${total} model turns`;
  const ticks = [];
  actors.forEach((actor, row) => {
    const turns = lanes[actor];
    ticks.push(`<path class="run-track" d="M5 ${(row+0.5)*rowHeight}h${(turns.length-1)*10}"/>`);
    turns.forEach((events, index) => {
      const turn = index + 1;
      const {x,y} = point(actor, turn);
      events.forEach(([id]) => positions.set(id,{actor,turn,x,y}));
      ticks.push(`<rect class="run-tick" data-agent="${actor}" x="${x-1.5}" y="${y-4.5}" width="3" height="9" rx="1"/>`);
    });
    const label = document.createElement('span');
    label.className = 'run-actor';
    label.dataset.agent = actor;
    label.style.gridRow = row + 1;
    label.textContent = `Agent ${actor}`;
    const control = document.createElement('div');
    control.className = 'run-slider';
    control.tabIndex = 0;
    control.dataset.agent = actor;
    control.style.gridRow = row + 1;
    control.setAttribute('role','slider');
    control.setAttribute('aria-label',`Turn within Agent ${actor}`);
    control.setAttribute('aria-valuemin','1');
    control.setAttribute('aria-valuemax',String(turns.length));
    control.setAttribute('aria-valuenow','1');
    control.addEventListener('focus', () => selectTurn(actor, Number(control.getAttribute('aria-valuenow'))));
    control.addEventListener('click',event => {
      const rect = control.getBoundingClientRect();
      const turn = Math.floor((event.clientX - rect.left) / rect.width * longest) + 1;
      selectTurn(actor, Math.max(1, Math.min(turns.length, turn)));
    });
    control.addEventListener('keydown',event => {
      const current = Number(control.getAttribute('aria-valuenow'));
      const keys = {ArrowRight:current+1, ArrowUp:current+1, ArrowLeft:current-1, ArrowDown:current-1, Home:1, End:turns.length};
      if (!(event.key in keys)) return;
      event.preventDefault();
      selectTurn(actor, Math.max(1,Math.min(turns.length,keys[event.key])));
    });
    const count = document.createElement('span');
    count.className = 'run-count';
    count.style.gridRow = row + 1;
    count.textContent = turns.length;
    controls.set(actor,control);
    chart.append(label,control,count);
  });
  for (const message of data.messages) {
    const from = positions.get(message.id);
    for (const read of message.reads) {
      const to = positions.get(read.event);
      if (!from || !to) continue;
      if (!readers.has(read.event)) readers.set(read.event, new Set());
      readers.get(read.event).add(message.actor);
      connections.push({from,to,id:message.id,shared:message.kind==='shared-file'});
    }
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','run-plot');
  svg.setAttribute('viewBox',`0 0 ${width} ${rowHeight*actors.length}`);
  svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');
  svg.innerHTML = `<g class="run-links"></g>${ticks.join('')}<rect class="run-cursor" width="7" height="15" rx="2"/>`;
  chart.append(svg);
  const axis = document.createElement('div');
  axis.className = 'run-axis';
  for (const tick of [1,15,30,45,longest]) {
    const mark = document.createElement('span');
    mark.style.left = `${(tick-.5)/longest*100}%`;
    mark.textContent = tick;
    axis.append(mark);
  }
  const axisName = document.createElement('span');
  axisName.className = 'run-axis-name';
  axisName.textContent = 'Turn';
  axisName.title = 'Turn number within each agent’s own run';
  chart.append(axis,axisName);
  function selectTurn(actor,turn) {
    const {x,y} = point(actor,turn);
    const cursor = svg.querySelector('.run-cursor');
    cursor.setAttribute('x',x-3.5);
    cursor.setAttribute('y',y-7.5);
    cursor.dataset.agent = actor;
    controls.get(actor).setAttribute('aria-valuenow',String(turn));
    const events = lanes[actor][turn-1];
    const ids = new Set(events.map(([id])=>id));
    const descriptions = events.map(([id,op]) => {
      if (summaries.has(id)) return summaries.get(id);
      if (readers.has(id)) return `Reads messages from ${[...readers.get(id)].join(', ')}`;
      if (op === 'bash') return 'Runs a shell command';
      if (op === 'final_output') return 'Final response';
      return op.replaceAll('_',' ');
    });
    summary.textContent = `Agent ${actor} · Turn ${turn} · ${[...new Set(descriptions)].join(', ') || 'No recorded tool action'}`;
    svg.querySelector('.run-links').innerHTML = connections.map(({from,to,id,shared})=>{
      const active = ids.has(id) || (to.actor === actor && to.turn === turn);
      const direction = Math.sign(to.y-from.y);
      const sx=from.x+direction*2, tx=to.x+direction*2;
      const sy=from.y+direction*5, ty=to.y-direction*6, mid=(sy+ty)/2;
      return `<g class="run-edge${active?' active':''}" data-agent="${from.actor}"><path ${shared?'':'stroke-dasharray="2 2"'} d="M${sx} ${sy}C${sx} ${mid} ${tx} ${mid} ${tx} ${ty}"/><path d="M${tx-2} ${ty-direction*3}l2 ${direction*3}l2 ${-direction*3}"/></g>`;
    }).join('');
  }
  figure.closest('.trajectory-viewer').addEventListener('trajectory-event',event=>{
    const location=positions.get(event.detail);
    if(location)selectTurn(location.actor,location.turn);
  });
  selectTurn(actors[0],1);
  figure.hidden=false;
})();
