(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const actorStyle = id => window.swarmAgentPalette?.[id] || 'var(--scene-muted)';
  const playIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4v12M13 4v12"/></svg>';
  const arrow = direction => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${direction<0?'m12 5-5 5 5 5':'m8 5 5 5-5 5'}"/></svg>`;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const short = (value,n=80) => value.length>n?value.slice(0,n).trimEnd()+'…':value;
  const mix = (a,b,t) => a+(b-a)*t;

  window.mountTrajectoryObservatory = (host,data,meta,openRecord) => {
    const controller = new AbortController();
    const on = (el,type,fn,options={}) => el.addEventListener(type,fn,{...options,signal:controller.signal});
    const actors=data.actors, events=[...data.events].sort((a,b)=>a.id-b.id);
    const messages=[...data.messages].sort((a,b)=>a.event-b.event);
    const names=new Map(actors.map(a=>[a.id,'Agent '+a.id]));
    const contexts=new Map(actors.map(a=>{
      const account=events.some(e=>e.actor===a.id && e.result?.account===a.name);
      return [a.id,a.name===names.get(a.id)?'':(account?'Account · ':'Recorded as · ')+a.name];
    }));
    const actorIndex=new Map(actors.map((a,i)=>[a.id,i]));
    const eventIndex=new Map(events.map((e,i)=>[e.id,i]));
    const eventById=new Map(events.map(e=>[e.id,e]));
    const messageById=new Map(messages.map(m=>[m.id,m]));
    const messageNumberById=new Map(messages.map((m,i)=>[m.id,i+1]));
    const noMessages=!messages.length;
    const sharedRecords = !noMessages && messages.every(message => message.kind === 'Released dispatch record');
    const entryLabel = sharedRecords ? 'shared record' : 'message';
    const moments=[];
    messages.forEach((message,index)=>{
      moments.push({kind:'send',event:message.event,actor:message.actor,time:message.time,turn:message.turn,message,index});
      for (const read of [...message.reads, ...(message.repeatReads || [])]) {
        moments.push({kind:'read',event:read.event,actor:read.actor,time:read.time,turn:read.turn,message,index});
      }
    });
    // Autoplay and manual stepping use the same complete sequence of actions, posts and reads.
    const exchangeEvents = new Set(moments.map(moment => moment.event));
    for (const event of events) {
      if (!exchangeEvents.has(event.id)) {
        moments.push({kind:'action', event:event.id, actor:event.actor, time:event.time, turn:event.turn, action:event});
      }
    }
    moments.sort((a,b)=>a.event-b.event||Number(a.kind!=='send')-Number(b.kind!=='send'));
    moments.forEach((m,i)=>{m.order=i;});
    const sendIndex=new Map(moments.filter(m=>m.kind==='send').map(m=>[m.message.id,m.order]));
    moments.push({kind:'outcome',event:Infinity,time:events.at(-1)?.time||'',order:moments.length});
    const receiptCount=moments.filter(m=>m.kind==='read').length;
    const eventFraction=id=>id===Infinity?1:(eventIndex.get(id)||0)/Math.max(1,events.length-1);
    const connections = moments.filter(moment => moment.message);
    const homeView = { yaw: -.35, pitch: .88 };

    let current=0,playing=false,started=false,visible=false,disposed=false;
    let elapsed=0,lastFrame=0,frame=0,speed=1;
    let signalSeconds = 0;
    let reading=false,focused=false,hovered=null,drag=null;
    let yaw=homeView.yaw, pitch=homeView.pitch, viewWidth=0, viewHeight=0, flowWidth=0, dpr=1;
    let sceneHits=[],flowHits=[],displayedMessage=null,flowRidges=[];
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let reduced=motion.matches;
    const active=()=>moments[current];
    const holding=()=>reading||focused||!!hovered||!!drag;
    const isVisible=()=>visible&&!document.hidden&&!disposed;
    const running=()=>playing && isVisible();

    // Compress long stretches of independent work and hold exchanges long enough to read.
    for (let i = 0; i < moments.length;) {
      if (moments[i].kind !== 'action') {
        moments[i].duration = moments[i].kind === 'read' ? 2500 : 2000;
        i++;
        continue;
      }
      let end = i + 1;
      while (end < moments.length && moments[end].kind === 'action') end++;
      const dwell = noMessages ? 650 : clamp(5000 / (end - i), 64, 540);
      for (; i < end; i++) moments[i].duration = dwell;
    }

    function messageSource(message) {
      const surface = eventById.get(message.event)?.arguments?.channel;
      if (surface === 'private') return 'Private discussion';
      if (surface === 'public') return 'Public discussion';
      return message.kind === 'Message' ? 'Shared channel' : message.kind;
    }

    function replyParent(message) {
      const parent=messageById.get(message.replyTo);
      const reference=message.replyReference ?? eventById.get(message.event)?.arguments?.reply_to;
      return parent && reference && (!parent.sourceReference || reference===parent.sourceReference) ? parent : null;
    }

    function chatMessage(message) {
      const number=messageNumberById.get(message.id),parent=replyParent(message);
      const receipts=message.reads.map(read=>{
        const step=connections.find(item=>item.kind==='read' && item.message===message && item.event===read.event);
        return `<button type="button" data-obs-receipt="${step.order}" style="--reader:${actorStyle(read.actor)}" aria-label="${esc(names.get(read.actor))} reads message ${number} at turn ${read.turn}">${esc(names.get(read.actor))}</button>`;
      }).join('');
      return `<article class="obs-chat-message" data-chat-message="${esc(message.id)}" style="--agent:${actorStyle(message.actor)}" aria-label="Message ${number} from ${esc(names.get(message.actor))}">
        <span class="obs-chat-avatar" aria-hidden="true"><img src="${esc(window.swarmAgentImage?.(message.actor,'message')||`static/images/fieldguide/finding-agents.svg?v=8#${message.actor.toLowerCase()}-speaking`)}" width="210" height="150" alt=""></span>
        <div class="obs-chat-content">
          <header class="obs-chat-heading"><button class="obs-chat-select" type="button" data-message="${esc(message.id)}" aria-label="Select message ${number} from ${esc(names.get(message.actor))}"><span>From</span><strong title="${esc(contexts.get(message.actor))}">${esc(names.get(message.actor))}</strong><span>to</span><strong data-chat-recipient>${esc(messageSource(message))}</strong></button><span class="obs-chat-stamp"><span>#${number}</span><time>${esc(message.time)}</time></span></header>
          ${parent?`<button class="obs-chat-reply" type="button" data-message="${esc(parent.id)}" aria-label="Reply to Message ${messageNumberById.get(parent.id)} from ${esc(names.get(parent.actor))}">↳ Reply to #${messageNumberById.get(parent.id)}</button>`:''}
          <p class="obs-chat-text" data-message-body>${esc(message.body)}</p>
          ${receipts?`<div class="obs-chat-readers"><span>Read by</span>${receipts}</div>`:''}
        </div>
      </article>`;
    }

    function participantRole(actor, moment) {
      if (moment.message?.actor === actor) return moment.message.kind === 'Message' ? 'Sender' : 'Author';
      if (moment.kind === 'read' && moment.actor === actor) return 'Reader';
      if (moment.kind === 'action' && moment.actor === actor) return 'Acting';
      return '';
    }

    host.classList.add('trajectory-observatory');
    const stepControls = `<div class="obs-step-buttons" data-inspector-nav>
      <button type="button" data-prev-message aria-label="Previous ${noMessages?'action':entryLabel}">${arrow(-1)}</button>
      <span data-message-number></span>
      <button type="button" data-next-message aria-label="Next ${noMessages?'action':entryLabel}">${arrow(1)}</button>
    </div>`;
    host.innerHTML=`<header class="obs-topbar"><div class="obs-title"><span class="obs-title-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><h4>${noMessages?'Agent actions':'Agent communication'}</h4></div><div class="obs-top-stats"><span><b>${messages.length}</b> ${entryLabel}${messages.length === 1 ? '' : 's'}</span><span><b>${receiptCount}</b> verified reads</span></div><button class="obs-play" type="button" data-play aria-label="Play trajectory">${playIcon}<span>Play</span></button></header>
      <div class="obs-workbench">
        <section class="obs-inspector" aria-label="Selected record">
          <section class="obs-action-panel" data-action-panel aria-label="Action">
            <header class="obs-panel-heading"><h5>Action</h5><small data-action-stamp></small>${noMessages?stepControls:''}<button class="obs-source-link" type="button" data-original="action" aria-label="View action record" title="View action record">↗</button></header>
            <div class="obs-action-line"><strong data-action-actor></strong><span data-action-label></span></div>
            <details class="obs-action-args" data-action-args hidden><summary>Tool arguments</summary><pre></pre></details>
          </section>
          <section class="obs-message-panel" data-message-panel aria-label="Message">
            <header class="obs-panel-heading"><h5>${sharedRecords ? 'Shared record' : 'Message'}</h5>${noMessages?'':stepControls}<button class="obs-source-link" type="button" data-original="message" aria-label="View original ${entryLabel}" title="View original ${entryLabel}">↗</button></header>
            <div class="obs-document" tabindex="0" role="region" aria-label="Conversation history">
              <div class="obs-chat" data-chat-log>${messages.map(chatMessage).join('')}</div>
              <p class="obs-message-empty" data-message-empty hidden></p>
            </div>
          </section>
          <section class="obs-outcome-panel" data-inspector-outcome hidden tabindex="-1"><header class="obs-panel-heading"><h5>Outcome</h5><button class="obs-source-link" type="button" data-original="outcome" aria-label="View outcome record" title="View outcome record">↗</button></header><p>${esc(meta.outcome)}</p></section>
        </section>
        <section class="obs-spatial" aria-label="Recorded agent actions and communication">
          <header class="obs-panel-heading"><h5>Swarm trajectory</h5><button class="obs-reset" type="button" data-reset aria-label="Reset spatial view"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7a6 6 0 1 1 0 6M4 3v4h4"/></svg></button></header>
          <div class="obs-route" id="obs-current-route" data-route><div class="obs-route-heading"></div><blockquote class="obs-route-quote" hidden></blockquote></div>
          <div class="obs-stage"><canvas class="obs-space-canvas" tabindex="0" role="img" aria-label="One path per agent, advancing with its recorded actions.${noMessages?'':' A verified read temporarily connects the sender’s action to the reader’s.'} Drag to rotate, select an action, or use the arrow keys to step through events." aria-describedby="obs-current-route"></canvas><div class="obs-stage-key"><span><i class="obs-key-path"></i>Agent path</span>${noMessages?'':'<span><i class="obs-key-link"></i>Message link</span>'}</div><div class="obs-graph-tooltip" role="tooltip" hidden></div><div class="obs-stage-hint">Drag to rotate · Select to inspect</div></div>
          <div class="obs-agent-strip">${actors.map(a=>`<div data-strip-actor="${a.id}" style="--agent:${actorStyle(a.id)}" title="${esc(contexts.get(a.id))}"><span aria-hidden="true">${a.id}</span><div><strong>${esc(names.get(a.id))}</strong><small><b data-actor-role hidden></b><span data-actor-count="${a.id}"></span></small></div><div class="obs-mini-bars" data-activity="${a.id}" aria-hidden="true"></div></div>`).join('')}</div>
        </section>
      </div>
      <section class="obs-flow" aria-label="All recorded actions by agent"><header class="obs-panel-heading"><div><h5>All actions</h5><span>${events.length} actions</span></div><div class="obs-flow-status"><i></i><span data-status>Paused</span><time data-current-time></time></div></header><div class="obs-flow-stage"><canvas class="obs-flow-canvas" tabindex="0" role="img" aria-label="Complete action timeline, one point per recorded action. Click a point to inspect it. Arrow keys move through the replay."></canvas><div class="obs-flow-tooltip" role="tooltip" hidden></div></div></section>
      <footer class="obs-transport"><button type="button" data-previous aria-label="Previous event">${arrow(-1)}</button><button type="button" data-next aria-label="Next event">${arrow(1)}</button><input type="range" min="0" max="${moments.length-1}" value="0" step="1" aria-label="Replay position"><span data-position></span><button type="button" data-speed aria-label="Playback speed: 1 times">1×</button><button class="obs-outcome-button" type="button" data-outcome>Outcome ↗</button></footer>`;

    const scene=host.querySelector('.obs-space-canvas'),ctx=scene.getContext('2d');
    const flow=host.querySelector('.obs-flow-canvas'),fctx=flow.getContext('2d');
    const stage=host.querySelector('.obs-stage'),flowStage=host.querySelector('.obs-flow-stage');
    const documentPanel=host.querySelector('.obs-document'),inspector=host.querySelector('.obs-inspector');
    const range=host.querySelector('input[type="range"]');
    const tooltips=new Map([[scene,host.querySelector('.obs-graph-tooltip')],[flow,host.querySelector('.obs-flow-tooltip')]]);
    const chatRows=new Map([...host.querySelectorAll('[data-chat-message]')].map(row=>[row.dataset.chatMessage,row]));
    const fontFamily=getComputedStyle(host).fontFamily;
    // CSS resolves the active theme for both canvases, including a paused frame.
    function readCanvasPaint() {
      const style = getComputedStyle(host);
      const read = name => style.getPropertyValue(name).trim();
      const muted = read('--scene-muted');
      return {
        agents: new Map(actors.map(({id}) => [id, read('--agent-' + id.toLowerCase()) || muted])),
        paper: read('--scene-bg'),
        ink: read('--scene-ink'),
        muted,
        guide: read('--scene-guide'),
        blue: read('--scene-blue'),
        packet: read('--scene-packet'),
        dark: read('--scene-scheme') === 'dark'
      };
    }
    let paint = readCanvasPaint();
    const color = id => paint.agents.get(id) || paint.muted;
    const routeHeading = host.querySelector('.obs-route-heading');
    const routeQuote = host.querySelector('.obs-route-quote');
    const stripRows = new Map([...host.querySelectorAll('[data-strip-actor]')].map(row => [row.dataset.stripActor, row]));
    const actorEvents=new Map(actors.map(a=>[a.id,events.filter(e=>e.actor===a.id)]));
    const orbitView = window.createTrajectoryOrbitView({ canvas:scene, actors, actorEvents, sendIndex, fontFamily });
    const eventMoment=new Map();
    moments.forEach(m=>{if(!eventMoment.has(m.event))eventMoment.set(m.event,m.order);});
    const activity=actors.map(a=>{
      const bins=Array.from({length:22},()=>[]);
      events.filter(e=>e.actor===a.id).forEach(e=>bins[Math.min(21,Math.floor(eventFraction(e.id)*22))].push(e.id));
      const max=Math.max(1,...bins.map(b=>b.length));
      host.querySelector(`[data-activity="${a.id}"]`).innerHTML=bins.map(bin=>`<i style="--height:${Math.max(2,bin.length/max*24)}px"></i>`).join('');
      return {id:a.id,bins,bars:[...host.querySelectorAll(`[data-activity="${a.id}"] i`)]};
    });

    function updateControls() {
      const m=active();
      host.classList.toggle('is-playing',playing);
      host.classList.toggle('is-holding',holding());
      const button=host.querySelector('[data-play]');
      const verb = playing ? 'Pause' : m.kind === 'outcome' ? 'Replay' : 'Play';
      const label = verb + ' trajectory';
      // Keep the pointer target alive when focus moves from the inspector to this button.
      if (button.getAttribute('aria-label') !== label) {
        button.innerHTML = (playing ? pauseIcon : playIcon) + '<span>' + verb + '</span>';
        button.setAttribute('aria-label', label);
      }
      host.querySelector('[data-status]').textContent=playing?(holding()?'Inspecting':'Replaying'):'Paused';
      host.querySelector('[data-previous]').disabled=current===0;
      host.querySelector('[data-next]').disabled=current===moments.length-1;
      host.querySelector('[data-current-time]').textContent=m.time;
      host.querySelector('[data-position]').textContent=`${String(current+1).padStart(2,'0')} / ${moments.length}`;
      range.value=String(current);
      range.setAttribute('aria-valuetext',`${current+1} of ${moments.length}, ${m.kind}, ${m.time}`);
      host.querySelector('[data-prev-message]').disabled=noMessages?current===0:(m.index??messages.length)===0;
      host.querySelector('[data-next-message]').disabled=m.kind==='outcome';
    }
    function showExchange(moment) {
      const message = moment.message;
      routeHeading.replaceChildren();
      routeQuote.hidden = !message;
      routeQuote.textContent = '';
      if (!message) {
        routeHeading.textContent = moment.kind === 'action'
          ? names.get(moment.actor) + ' · ' + moment.action.label
          : 'Outcome';
        return;
      }

      const number = document.createElement('span');
      number.className = 'obs-route-number';
      number.textContent = 'Message ' + String(moment.index + 1).padStart(2, '0');
      const sender = document.createElement('strong');
      sender.textContent = names.get(message.actor);
      sender.style.color = actorStyle(message.actor);
      const verb = document.createElement('span');
      verb.className = 'obs-route-verb';
      const recipient = document.createElement('strong');
      if (moment.kind === 'read') {
        recipient.textContent = names.get(moment.actor);
        recipient.style.color = actorStyle(moment.actor);
      } else {
        recipient.textContent = messageSource(message);
      }
      verb.textContent = '→';
      const description = moment.kind === 'read' ? 'read by' : 'posted to';
      verb.setAttribute('role', 'img');
      verb.setAttribute('aria-label', description);
      routeHeading.append(number, sender, verb, recipient);

      const body = message.body.trim();
      const prefix = body.slice(0, 170);
      const atWord = prefix.replace(/\s+\S*$/, '').trimEnd();
      const excerpt = body.length <= prefix.length ? body : (atWord.length > 130 ? atWord : prefix) + '…';
      routeQuote.textContent = '“' + excerpt + '”';
    }

    const actionPanel = host.querySelector('[data-action-panel]');
    const actionArgs = actionPanel.querySelector('[data-action-args]');
    const messagePanel = host.querySelector('[data-message-panel]');
    const outcomePanel = host.querySelector('[data-inspector-outcome]');
    const chatLog = messagePanel.querySelector('[data-chat-log]');
    const empty = messagePanel.querySelector('[data-message-empty]');
    const nav = host.querySelector('[data-inspector-nav]');
    const messageNumber = host.querySelector('[data-message-number]');

    function scrollToMessage(message) {
      const row=chatRows.get(message.id);
      if(!row || !documentPanel.clientHeight)return;
      const viewport=documentPanel.getBoundingClientRect(),box=row.getBoundingClientRect();
      // Leave a little preceding conversation visible and move only the chat's scroll area.
      documentPanel.scrollTop+=box.top-viewport.top-Math.min(100,documentPanel.clientHeight*.23);
    }

    function renderInspector(moment) {
      const event = eventById.get(moment.event);
      const message = moment.message;
      actionPanel.hidden = messagePanel.hidden = !event;
      outcomePanel.hidden = Boolean(event);
      nav.hidden = !event || (!message && !noMessages);
      if (!event) {
        displayedMessage = null;
        return;
      }

      // A read belongs to the reader. The message below belongs to its original author.
      actionPanel.style.setProperty('--actor-ink', actorStyle(event.actor));
      actionPanel.querySelector('[data-action-actor]').textContent = names.get(event.actor);
      actionPanel.querySelector('[data-action-actor]').title = contexts.get(event.actor);
      actionPanel.querySelector('[data-action-label]').textContent = event.label;
      actionPanel.querySelector('[data-action-stamp]').textContent = 'Turn ' + event.turn + ' · ' + event.time;
      const args = event.arguments;
      const hasArgs = args != null && (typeof args !== 'object' || Object.keys(args).length > 0);
      actionArgs.hidden = Boolean(message) || !hasArgs;
      if (!actionArgs.hidden) {
        actionArgs.querySelector('summary').textContent = data.provenance?.selectedActionFields ? 'Recorded business fields' : 'Tool arguments';
        actionArgs.querySelector('pre').textContent = typeof args === 'string' ? args : JSON.stringify(args, null, 2);
      }

      messagePanel.querySelector('[data-original="message"]').hidden = !message;
      messageNumber.textContent = message
        ? String(moment.index + 1).padStart(2, '0') + ' / ' + messages.length
        : (eventIndex.get(event.id) + 1) + ' / ' + events.length;
      const observed=new Set(message?[]:event.reads);
      chatLog.hidden=noMessages;
      empty.hidden=!chatLog.hidden;
      if(!empty.hidden)empty.textContent='No messages in this run.';

      for(const item of messages) {
        const row=chatRows.get(item.id),selected=item===message,isRead=selected && moment.kind==='read' || observed.has(item.id);
        row.classList.toggle('is-current',selected);
        row.classList.toggle('is-observed',observed.has(item.id));
        row.classList.toggle('is-future',item.event>event.id);
        row.toggleAttribute('data-current-message',selected);
        if(selected)row.setAttribute('aria-current','step');
        else row.removeAttribute('aria-current');
        row.querySelector('[data-message-body]').toggleAttribute('data-original-text',selected);
        row.querySelector('.obs-chat-select').setAttribute('aria-pressed',String(selected));
        const recipient=row.querySelector('[data-chat-recipient]');
        recipient.textContent=isRead?names.get(event.actor):messageSource(item);
        recipient.style.color=isRead?actorStyle(event.actor):'';
        recipient.title=isRead?'Read by '+names.get(event.actor)+' at '+event.time:'Posted to '+messageSource(item);
        for(const button of row.querySelectorAll('[data-obs-receipt]')) {
          const order=Number(button.dataset.obsReceipt);
          button.setAttribute('aria-current',order===current?'step':'false');
          button.classList.toggle('is-received',order<=current);
        }
      }
      const key = message?.id ?? event.id;
      if (key !== displayedMessage) {
        displayedMessage = key;
        const anchor=message || messageById.get(event.reads[0]);
        if(anchor)scrollToMessage(anchor);
      }
    }

    function select(index, animatePaths = false) {
      current = clamp(index, 0, moments.length - 1);
      elapsed = 0;
      const m = active(), message = m.message;
      if (m.kind === 'outcome') playing = false;
      host.style.setProperty('--signal', actorStyle(message?.actor || m.actor));
      host.dataset.moment = m.kind;
      orbitView.select(m, signalSeconds, animatePaths && playing && !reduced);
      renderInspector(m);
      showExchange(m);
      actors.forEach(a=>{
        const row = stripRows.get(a.id);
        const role = participantRole(a.id, m);
        row.toggleAttribute('data-participant', Boolean(role));
        const roleLabel = row.querySelector('[data-actor-role]');
        roleLabel.textContent = role;
        roleLabel.hidden = !role;
        const sent=messages.filter(x=>x.actor===a.id&&x.event<=m.event).length;
        const reads=moments.filter(x=>x.kind==='read'&&x.actor===a.id&&x.order<=current).length;
        host.querySelector(`[data-actor-count="${a.id}"]`).textContent=(noMessages||m.kind==='action')?`${events.filter(e=>e.actor===a.id&&e.id<=m.event).length} actions`:`${sent} sent · ${reads} read`;
      });
      activity.forEach(a=>a.bars.forEach((bar,i)=>{
        bar.classList.toggle('is-past',a.bins[i].some(id=>id<=m.event));
        const arriving=a.bins[i].includes(m.event);
        bar.toggleAttribute('data-current-bin',arriving);
      }));
      updateControls();draw();ensureFrame();
    }
    function stop() {
      playing = false;
      lastFrame = 0;
      cancelAnimationFrame(frame);
      frame = 0;
      updateControls();
      draw();
    }
    function seek(index) {
      if (!started) playing = !reduced;
      started = true;
      hovered = null;
      hideTooltips();
      select(index);
    }
    function togglePlay() {
      started = true;
      if (playing) { stop(); return; }
      if (active().kind === 'outcome') select(0);
      playing = true;
      lastFrame = 0;
      updateControls();
      ensureFrame();
    }
    function openOriginal(kind){
      stop();
      const moment=active();
      const event=kind==='message'?moment.message?.event:moment.event;
      if(kind==='outcome')openRecord(null);
      else if(event!=null && Number.isFinite(event))openRecord([event]);
    }
    function moveMessage(direction){const m=active();if(noMessages){seek(current+direction);return;}const at=m.message?m.index:messages.length;const next=at+direction;if(next>=messages.length)seek(moments.length-1);else seek(sendIndex.get(messages[Math.max(0,next)].id));}

    function strokePoints(context,points,stroke,width=1) {
      context.beginPath();points.forEach((p,i)=>i?context.lineTo(p[0],p[1]):context.moveTo(p[0],p[1]));context.strokeStyle=stroke;context.lineWidth=width;context.stroke();
    }
    function glow(context,x,y,r,c,alpha=1) {
      context.save();context.globalAlpha=alpha;
      const fill=context.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,c+'75');fill.addColorStop(.22,c+'2d');fill.addColorStop(1,c+'00');context.fillStyle=fill;context.fillRect(x-r,y-r,r*2,r*2);context.restore();
    }
    function dot(context,x,y,r,c,fill=true) {
      context.beginPath();context.arc(x,y,r,0,Math.PI*2);context.fillStyle=c;context.strokeStyle=c;context.lineWidth=1;if(fill)context.fill();else context.stroke();
    }
    function drawSpatial() {
      sceneHits = orbitView.draw(
        { width:viewWidth, height:viewHeight, dpr, yaw, pitch },
        paint, signalSeconds, reduced, hovered?.surface === scene ? hovered.hit : null
      );
    }
    function flowPoint(e){return [68+eventFraction(e.id)*(flowWidth-91),23+actorIndex.get(e.actor)*31];}
    function cacheFlowRidges(){
      flowRidges=actors.map(a=>{
        const own=actorEvents.get(a.id),x0=68,x1=flowWidth-23;
        return Array.from({length:101},(_,j)=>{const x=mix(x0,x1,j/100);let density=0;own.forEach(e=>{const dx=flowPoint(e)[0]-x;density+=Math.exp(-dx*dx/270)*1.3;});return [x,Math.min(6,density*.65+1)];});
      });
    }
    function drawFlow() {
      fctx.setTransform(dpr,0,0,dpr,0,0);fctx.clearRect(0,0,flowWidth,168);flowHits=[];const m=active();
      fctx.font=`10px ${fontFamily}`;
      for(let i=0;i<=4;i++){const x=68+i*(flowWidth-91)/4;strokePoints(fctx,[[x,7],[x,139]],paint.guide + '25',.6);}
      actors.forEach((a,i)=>{
        const y=23+i*31,c=color(a.id),own=actorEvents.get(a.id),x0=68,x1=flowWidth-23;
        const ridge=flowRidges[i]||[];
        fctx.beginPath();ridge.forEach(([x,h],i)=>i?fctx.lineTo(x,y-h):fctx.moveTo(x,y-h));[...ridge].reverse().forEach(([x,h])=>fctx.lineTo(x,y+h));fctx.closePath();fctx.fillStyle=c+'18';fctx.fill();strokePoints(fctx,[[x0,y],[x1,y]],c+'38',.7);
        fctx.fillStyle=c;fctx.fillText(a.id,16,y+4);fctx.fillStyle=paint.muted;fctx.fillText(String(own.length),32,y+4);
      });
      const x=68+eventFraction(m.event)*(flowWidth-91);strokePoints(fctx,[[x,4],[x,137]],paint.blue + '9c',1);glow(fctx,x,70,65,color(m.message?.actor||m.actor),.25);
      for (const event of events) {
        const point = flowPoint(event);
        const isEndpoint = event.id === m.event || event.id === m.message?.event;
        const participant = participantRole(event.actor, m);
        const ink = color(event.actor);
        let dotColor = paint.guide + '61';
        if (participant || m.kind === 'outcome') dotColor = ink + 'a0';
        if (event.id > m.event) dotColor = paint.guide + '44';
        let radius = event.messages.length ? 3 : event.reads.length ? 2.5 : 1.7;
        if (isEndpoint) {
          glow(fctx, ...point, 16, ink);
          radius = 4.3;
          dotColor = ink;
        }
        dot(fctx, ...point, radius, dotColor, !event.reads.length || event.messages.length > 0);
        const hit = {x: point[0], y: point[1], event: event.id, r: 8};
        if (event.id === m.event) hit.moment = m.order;
        else if (event.id === m.message?.event) hit.moment = sendIndex.get(m.message.id);
        flowHits.push(hit);
      }
      if(hovered?.surface===flow)dot(fctx,hovered.hit.x,hovered.hit.y,7,paint.ink,false);
      fctx.fillStyle=paint.muted;fctx.fillText(events[0]?.time||'',68,158);fctx.textAlign='right';fctx.fillText(events.at(-1)?.time||'',flowWidth-23,158);fctx.textAlign='left';
    }
    function draw(){if(disposed||!ctx||!fctx||!viewWidth||!visible)return;drawSpatial();drawFlow();}
    function resize(){const b=stage.getBoundingClientRect();if(!b.width)return;viewWidth=b.width;viewHeight=b.height;flowWidth=flowStage.getBoundingClientRect().width;dpr=Math.min(devicePixelRatio||1,2);scene.width=Math.round(viewWidth*dpr);scene.height=Math.round(viewHeight*dpr);flow.width=Math.round(flowWidth*dpr);flow.height=Math.round(168*dpr);cacheFlowRidges();draw();}
    function ensureFrame(){if(!frame&&running())frame=requestAnimationFrame(animate);}
    function animate(now){
      frame=0;if(!running()){lastFrame=0;return;}
      const dt=lastFrame?Math.min(80,now-lastFrame):0;lastFrame=now;
      if (!reduced && !drag) signalSeconds += dt * speed / 1000;
      if (!holding()) {
        elapsed += dt * speed;
        if (elapsed >= active().duration) {
          if (current === moments.length - 1) { stop(); return; }
          select(current + 1, true);
          return;
        }
      }
      if (!reduced && !drag && ctx) drawSpatial();
      ensureFrame();
    }
    function hideTooltips(){tooltips.forEach(t=>{t.hidden=true;});}
    function nearest(surface, x, y) {
      let best = null, distance = Infinity, bestPriority = -1;
      for (const hit of surface === scene ? sceneHits : flowHits) {
        const d = Math.hypot(hit.x - x, hit.y - y);
        if (d >= hit.r) continue;
        const priority = hit.moment !== undefined ? 2 : Number(Boolean(hit.latest));
        if (priority > bestPriority || (priority === bestPriority && d < distance)) {
          best = hit; distance = d; bestPriority = priority;
        }
      }
      return best;
    }
    function hover(surface,event){
      const box=surface.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top,hit=nearest(surface,x,y),tip=tooltips.get(surface);
      if(!hit){hovered=null;tip.hidden=true;updateControls();draw();return;}
      hovered={surface,hit};const e=eventById.get(hit.event);
      const moment = moments[hit.moment ?? eventMoment.get(hit.event)];
      const message = messageById.get(hit.message) || moment?.message || messageById.get(e.messages[0]);
      let label = 'Open original action';
      if (message) label = 'Select message';
      if (moment?.kind === 'read') label = 'Select recorded read';
      if (moment?.kind === 'action') label = 'Select action';
      tip.innerHTML=`<strong style="color:${actorStyle(e.actor)}">${esc(names.get(e.actor))}<time>${esc(e.time)}</time></strong><span>${esc(message?short(message.body,170):e.label)}</span><small>Turn ${e.turn} · ${label}</small>`;tip.hidden=false;
      tip.style.left=clamp(x-60,10,box.width-tip.offsetWidth-10)+'px';tip.style.top=Math.max(7,y-tip.offsetHeight-14)+'px';updateControls();draw();
    }
    function pick(surface,event){const box=surface.getBoundingClientRect(),hit=nearest(surface,event.clientX-box.left,event.clientY-box.top);if(!hit)return;if(hit.moment !== undefined)seek(hit.moment);else if(hit.message)seek(sendIndex.get(hit.message));else if(eventMoment.has(hit.event))seek(eventMoment.get(hit.event));else {stop();openRecord([hit.event]);}}
    [scene,flow].forEach(surface=>{
      on(surface,'pointermove',event=>{
        if(drag&&surface===scene){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;yaw=drag.yaw+dx*.004;pitch=clamp(drag.pitch+dy*.003,.20,1.12);hideTooltips();draw();return;}
        if(event.pointerType==='mouse')hover(surface,event);
      });
      on(surface,'pointerleave',()=>{if(drag)return;hovered=null;hideTooltips();updateControls();draw();});
      on(surface,'keydown',event=>{const next={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:moments.length-1}[event.key];if(next!==undefined){event.preventDefault();seek(next);}else if(event.key===' '){event.preventDefault();togglePlay();}});
    });
    on(scene,'pointerdown',event=>{if(event.button!==0)return;hovered=null;hideTooltips();drag={x:event.clientX,y:event.clientY,yaw,pitch,moved:false};scene.setPointerCapture(event.pointerId);});
    on(scene,'pointerup',event=>{if(!drag)return;const moved=drag.moved;drag=null;scene.releasePointerCapture(event.pointerId);if(!moved)pick(scene,event);updateControls();});
    on(scene,'pointercancel',()=>{drag=null;hovered=null;hideTooltips();updateControls();});
    on(flow,'click',event=>pick(flow,event));
    on(host,'click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-play'))togglePlay();
      else if(button.hasAttribute('data-previous'))seek(current-1);
      else if(button.hasAttribute('data-next'))seek(current+1);
      else if(button.hasAttribute('data-prev-message'))moveMessage(-1);
      else if(button.hasAttribute('data-next-message'))moveMessage(1);
      else if(button.hasAttribute('data-message'))seek(sendIndex.get(button.dataset.message));
      else if(button.hasAttribute('data-obs-receipt'))seek(Number(button.dataset.obsReceipt));
      else if(button.hasAttribute('data-original'))openOriginal(button.dataset.original);
      else if(button.hasAttribute('data-outcome')){seek(moments.length-1);outcomePanel.focus({preventScroll:true});}
      else if(button.hasAttribute('data-reset')){yaw=homeView.yaw;pitch=homeView.pitch;draw();}
      else if(button.hasAttribute('data-speed')){speed=speed===1?2:speed===2?.5:1;button.textContent=speed+'×';button.setAttribute('aria-label',`Playback speed: ${speed} times`);}
    });
    on(range,'input',()=>seek(Number(range.value)));
    on(documentPanel,'pointerdown',()=>documentPanel.focus({preventScroll:true}));
    for (const area of [inspector]) {
      on(area,'pointerenter',event=>{if(event.pointerType==='mouse'){reading=true;updateControls();}});
      on(area,'pointerleave',()=>{reading=false;updateControls();});
      on(area,'focusin',()=>{focused=true;updateControls();});
      on(area,'focusout',event=>{if(!area.contains(event.relatedTarget)){focused=false;updateControls();}});
    }
    on(document,'visibilitychange',()=>{lastFrame=0;ensureFrame();});
    on(motion,'change',()=>{reduced=motion.matches;if(reduced){orbitView.select(active(),signalSeconds,false);stop();}draw();});
    const themeObserver = new MutationObserver(() => {
      paint = readCanvasPaint();
      draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-darkreader-scheme']
    });
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resizeObserver.observe(flowStage);
    const visibilityObserver=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible&&!started&&!reduced){playing=true;started=true;}lastFrame=0;updateControls();if(visible)draw();ensureFrame();},{threshold:.18});visibilityObserver.observe(stage);
    const citedMoment=eventMoment.get(meta.focusEvent);
    if(citedMoment!==undefined)started=true;
    select(citedMoment??0);resize();
    return ()=>{disposed=true;cancelAnimationFrame(frame);controller.abort();themeObserver.disconnect();resizeObserver.disconnect();visibilityObserver.disconnect();host.classList.remove('trajectory-observatory');host.replaceChildren();};
  };
})();
