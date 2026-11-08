(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const actorStyle = id => window.swarmAgentPalette?.[id] || 'var(--scene-muted)';
  const playIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4v12M13 4v12"/></svg>';
  const arrow = direction => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${direction<0?'m12 5-5 5 5 5':'m8 5 5 5-5 5'}"/></svg>`;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const short = (value,n=80) => value.length>n?value.slice(0,n).trimEnd()+'…':value;
  function clockLabel(seconds) {
    const minutes = Math.floor(seconds / 60);
    return minutes + ':' + String(seconds % 60).padStart(2,'0');
  }
  const homeView = {yaw:-.35, pitch:.99};
  const clockwiseRate = 2*Math.PI/288_000; // radians per millisecond of visible playback
  const cameras = new WeakMap();

  window.mountTrajectoryObservatory = (host,data,meta,openRecord) => {
    const controller = new AbortController();
    const on = (el,type,fn,options={}) => el.addEventListener(type,fn,{...options,signal:controller.signal});
    const actors=data.actors, events=[...data.events].sort((a,b)=>a.id-b.id);
    const names=new Map(actors.map(a=>[a.id,'Agent '+a.id]));
    const contexts=new Map(actors.map(a=>{
      const account=events.some(e=>e.actor===a.id && e.result?.account===a.name);
      return [a.id,a.name===names.get(a.id)?'':(account?'Account · ':'Recorded as · ')+a.name];
    }));
    const actorIndex=new Map(actors.map((a,i)=>[a.id,i]));
    const eventIndex=new Map(events.map((e,i)=>[e.id,i]));
    const eventById=new Map(events.map(e=>[e.id,e]));
    const messages=data.messages.filter(message=>{
      const post=eventById.get(message.event);
      return post && actorIndex.has(message.actor) && post.actor===message.actor && post.messages?.includes(message.id);
    }).sort((a,b)=>a.event-b.event);
    const messageById=new Map(messages.map(m=>[m.id,m]));
    const messageNumberById=new Map(messages.map((m,i)=>[m.id,i+1]));
    const noMessages=!messages.length;
    const sharedRecords = !noMessages && messages.every(message => message.kind === 'Released dispatch record');
    const entryLabel = sharedRecords ? 'shared record' : 'message';
    const moments=[];
    messages.forEach((message,index)=>{
      moments.push({kind:'send',event:message.event,actor:message.actor,time:message.time,turn:message.turn,message,index});
      for (const read of [...message.reads, ...(message.repeatReads || [])]) {
        const received = eventById.get(read.event);
        if (!received || read.actor === message.actor || read.event <= message.event || !actorIndex.has(read.actor) ||
            received.actor !== read.actor || !received.reads?.includes(message.id)) continue;
        moments.push({kind:'read',event:read.event,actor:read.actor,time:read.time,turn:read.turn,message,index,
          firstRead:message.reads.includes(read)});
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
    const eventTimes = new Map();
    let day = 0, lastTime = 0;
    for (const event of events) {
      const [h,m,s] = event.time.split(':').map(Number);
      let at = day + h*3600 + m*60 + s;
      if (at < lastTime - 43200) { day += 86400; at += 86400; }
      lastTime = Math.max(at,lastTime);
      eventTimes.set(event.id,lastTime);
    }
    const startTime = eventTimes.get(events[0]?.id) ?? 0;
    const duration = lastTime - startTime;
    const recordedSecond = id => id === Infinity ? duration : eventTimes.get(id) - startTime;
    const eventFraction = id => duration ? recordedSecond(id) / duration : 0;
    const recordedMoments = moments.slice(0,-1);
    const reads = moments.filter(step => step.kind === 'read');
    const receiptCount = reads.length;
    const firstReads = reads.filter(step => step.firstRead).reverse();

    // Keep a small history of distinct routes, with the selected message's other readers first.
    function earlierReadsAt(moment) {
      const earlier = firstReads.filter(step => step.order < moment.order);
      const candidates = moment.message ? [
        ...earlier.filter(step => step.message === moment.message),
        ...earlier.filter(step => step.message !== moment.message)
      ] : earlier;
      const route = step => step.message.actor + ':' + step.actor;
      const seen = new Set(moment.kind === 'read' ? [route(moment)] : []);
      const history = [];
      for (const step of candidates) {
        const pair = route(step);
        if (seen.has(pair)) continue;
        history.push(step);
        seen.add(pair);
        if (seen.size === 6) break;
      }
      return history;
    }

    const viewer = host.closest('.trajectory-viewer') || host;
    const camera = cameras.get(viewer) || {...homeView};
    cameras.set(viewer,camera);

    let current=0,playing=false,started=false,visible=false,stageVisible=false,flowVisible=false,disposed=false;
    let elapsed=0,lastFrame=0,frame=0,speed=1;
    let settlePaused=false, cameraReset=null, resumeAfterLoad=false;
    let signalSeconds = 0;
    let readingUntil=0,hovered=null,drag=null,transcriptScroll=null;
    let viewWidth=0, viewHeight=0, flowWidth=0, dpr=1;
    let sceneHits=[],flowHits=[],displayedMessage=null;
    let scrubPointer=null;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let reduced=motion.matches;
    const active=()=>moments[current];
    const holding=()=>readingUntil>0 || !!drag || scrubPointer!==null;
    const isVisible=()=>visible&&!document.hidden&&!disposed;
    const running=()=>isVisible() && (playing || cameraReset || (settlePaused && orbitView.transitioning));

    for (const moment of moments) {
      if (moment.message) {
        const words = moment.message.body.trim().split(/\s+/).length;
        moment.duration = clamp(3600 + 150*words,6000,12000);
      } else {
        moment.duration = moment.action?.important ? 2100 : 1450;
      }
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
      const receipts=reads.filter(read=>read.message===message && read.firstRead).map(read=>{
        return `<button type="button" data-obs-receipt="${read.order}" style="--reader:${actorStyle(read.actor)}" aria-label="${esc(names.get(read.actor))} reads message ${number} at turn ${read.turn}">${esc(names.get(read.actor))}</button>`;
      }).join('');
      return `<article class="obs-chat-message" data-chat-message="${esc(message.id)}" style="--agent:${actorStyle(message.actor)}" aria-label="Message ${number} from ${esc(names.get(message.actor))}">
        <span class="obs-chat-avatar" aria-hidden="true"><img src="${esc(window.swarmAgentImage?.(message.actor,'message')||`static/images/fieldguide/finding-agents.svg?v=8#${message.actor.toLowerCase()}-speaking`)}" width="210" height="150" alt=""></span>
        <div class="obs-chat-content">
          <header class="obs-chat-heading"><button class="obs-chat-select" type="button" data-message="${esc(message.id)}"><span>Posted by <strong title="${esc(contexts.get(message.actor))}">${esc(names.get(message.actor))}</strong></span><span aria-hidden="true">·</span><span><span data-read-label hidden>Read by </span><strong data-chat-recipient>${esc(messageSource(message))}</strong></span></button><span class="obs-chat-stamp"><span>#${number}</span><time>${esc(message.time)}</time></span></header>
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
          <header class="obs-panel-heading"><h5>Swarm trajectory</h5><span class="obs-view-tools"><button class="obs-timeline-jump" type="button" data-timeline-jump title="Go to this moment on the timeline"><time></time> <span aria-hidden="true">↓</span></button><small data-share-status role="status"></small><button class="obs-share" type="button" data-share aria-label="Copy link to this moment" title="Copy link to this moment"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 12 4-4m-1.5-2.5 1.8-1.8a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0m.2 2.8-1.8 1.8a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0"/></svg></button><button class="obs-reset" type="button" data-reset aria-label="Reset spatial view"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7a6 6 0 1 1 0 6M4 3v4h4"/></svg></button></span></header>
          <div class="obs-route" id="obs-current-route" data-route><div class="obs-route-heading"></div><blockquote class="obs-route-quote" hidden><button type="button" data-original="message" title="View original ${entryLabel}"><span data-excerpt></span><span aria-hidden="true">↗</span></button></blockquote></div>
          <div class="obs-stage"><canvas class="obs-space-canvas" tabindex="0" role="img" aria-label="Each agent has its own action spiral on the lower disk.${noMessages?'':' The bright arc marked Now connects the author to the current reader. Between reads, Last read marks the most recent exchange. Dashed arcs show earlier reads. Select an arc to inspect its message.'} Drag to rotate, select an action, or use the arrow keys to step through events." aria-describedby="obs-current-route"></canvas><div class="obs-stage-key"><span><i class="obs-key-action"></i>Action</span>${noMessages?'':'<span><i class="obs-key-post"></i>Shared</span><span><i class="obs-key-read"></i>Read</span>'}</div><div class="obs-graph-tooltip" role="tooltip" hidden></div><div class="obs-stage-hint">Drag to rotate · Select to inspect</div></div>
          <div class="obs-agent-strip">${actors.map(a=>`<div data-strip-actor="${a.id}" style="--agent:${actorStyle(a.id)}" title="${esc(contexts.get(a.id))}"><span aria-hidden="true">${a.id}</span><div><strong>${esc(names.get(a.id))}</strong><small><b data-actor-role hidden></b><span data-actor-count="${a.id}"></span></small></div><div class="obs-mini-bars" data-activity="${a.id}" aria-hidden="true"></div></div>`).join('')}</div>
        </section>
        <section class="obs-flow" id="timeline" aria-labelledby="obs-timeline-title">
          <header class="obs-panel-heading"><h5 id="obs-timeline-title">Timeline</h5><div class="obs-run-clock"><span>Run time</span><time data-current-time></time><span>/ ${clockLabel(duration)}</span></div></header>
          <div class="obs-timeline-selection" id="obs-timeline-detail" data-timeline-selection></div>
          <div class="obs-flow-stage">
            <canvas class="obs-flow-canvas" tabindex="0" role="img" aria-label="Recorded timeline. Each row is one agent. Dots mark actions, diamonds mark posts, and rings mark reads. Select a point or use the arrow keys to step through events." aria-describedby="obs-timeline-detail"></canvas>
            <input class="obs-time-scrub" type="range" min="0" max="${Math.max(1,duration)}" value="0" step="1" aria-label="Seek by elapsed run time"${duration ? '' : ' disabled'}>
            <div class="obs-flow-tooltip" role="tooltip" hidden></div>
          </div>
          <footer class="obs-transport"><button type="button" data-previous aria-label="Previous event">${arrow(-1)}</button><button type="button" data-timeline-play aria-label="Play timeline">${playIcon}</button><button type="button" data-next aria-label="Next event">${arrow(1)}</button><span data-position></span><span class="sr-only" data-status>Paused</span><button type="button" data-speed aria-label="Playback speed: 1 times">1×</button><button class="obs-outcome-button" type="button" data-outcome>Outcome ↗</button></footer>
        </section>
      </div>`;

    const scene=host.querySelector('.obs-space-canvas'),ctx=scene.getContext('2d');
    const flow=host.querySelector('.obs-flow-canvas'),fctx=flow.getContext('2d');
    const stage=host.querySelector('.obs-stage'),flowStage=host.querySelector('.obs-flow-stage');
    const documentPanel=host.querySelector('.obs-document');
    const range=host.querySelector('input[type="range"]');
    const timeline = host.querySelector('#timeline');
    const timelineJump = host.querySelector('[data-timeline-jump]');
    const timelineSelection = host.querySelector('[data-timeline-selection]');
    const playButtons = host.querySelectorAll('[data-play],[data-timeline-play]');
    const tooltips=new Map([[scene,host.querySelector('.obs-graph-tooltip')],[flow,host.querySelector('.obs-flow-tooltip')]]);
    const chatRows=new Map([...host.querySelectorAll('[data-chat-message]')].map(row=>[row.dataset.chatMessage,row]));
    const fontFamily=getComputedStyle(host).fontFamily;
    let paletteSample;
    // Canvas gradients use hex alpha. Theme extensions can provide the same color in CSS functional notation.
    function canvasColor(value) {
      if (!value || /^#[\da-f]{6}$/i.test(value)) return value;
      if (/^#[\da-f]{3}$/i.test(value)) return '#'+Array.from(value.slice(1),digit=>digit+digit).join('');
      if (!paletteSample) {
        const pixel = document.createElement('canvas');
        pixel.width = pixel.height = 1;
        paletteSample = pixel.getContext('2d',{willReadFrequently:true});
      }
      if (!paletteSample) return value;
      paletteSample.clearRect(0,0,1,1);
      paletteSample.fillStyle = value;
      paletteSample.fillRect(0,0,1,1);
      const [r,g,b] = paletteSample.getImageData(0,0,1,1).data;
      return '#' + [r,g,b].map(channel=>channel.toString(16).padStart(2,'0')).join('');
    }
    function readCanvasPaint() {
      const style = getComputedStyle(host);
      const read = name => canvasColor(style.getPropertyValue(name).trim());
      const muted = read('--scene-muted');
      return {
        agents: new Map(actors.map(({id}) => [id, read('--agent-' + id.toLowerCase()) || muted])),
        paper: read('--scene-bg'),
        ink: read('--scene-ink'),
        muted,
        guide: read('--scene-guide'),
        blue: read('--scene-blue'),
        packet: read('--scene-packet'),
        dark: style.getPropertyValue('--scene-scheme').trim() === 'dark'
      };
    }
    let paint = readCanvasPaint();
    const color = id => paint.agents.get(id) || paint.muted;
    const routeHeading = host.querySelector('.obs-route-heading');
    const routeQuote = host.querySelector('.obs-route-quote');
    const quoteText = routeQuote.querySelector('[data-excerpt]');
    const shareStatus = host.querySelector('[data-share-status]');
    let shareTimer;
    const stripRows = new Map([...host.querySelectorAll('[data-strip-actor]')].map(row => [row.dataset.stripActor, row]));
    const actorEvents=new Map(actors.map(a=>[a.id,events.filter(e=>e.actor===a.id)]));
    const orbitView = window.createTrajectoryOrbitView({ canvas:scene, actors, actorEvents, reads, sendIndex, fontFamily });
    const eventMoment=new Map();
    moments.forEach(m=>{if(!eventMoment.has(m.event))eventMoment.set(m.event,m.order);});
    function momentAtSecond(second) {
      if (second === recordedSecond(active().event)) return current;
      if (second <= 0) return 0;
      if (second >= duration) return moments.length - 1;
      let lo = 0, hi = recordedMoments.length - 1;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (recordedSecond(recordedMoments[mid].event) < second) lo = mid + 1;
        else hi = mid;
      }
      const after = recordedSecond(recordedMoments[lo].event);
      if (lo && second - recordedSecond(recordedMoments[lo-1].event) < after - second) return lo - 1;
      return lo;
    }
    function positionIndex(position) {
      if (position.event === 'outcome') return moments.length - 1;
      // One native event can read several notes. Keep the note as well as the event in a shared link.
      const exact = position.message && moments.find(m => m.event === position.event && m.message?.id === position.message);
      return exact?.order ?? eventMoment.get(position.event) ?? reads[0]?.order ?? 0;
    }
    function pinMoment(hash = '#trajectory') {
      const moment = active();
      return meta.pinMoment({event:moment.kind === 'outcome' ? 'outcome' : moment.event, message:moment.message?.id}, hash);
    }
    async function copyMomentLink() {
      const url = pinMoment();
      let feedback = 'Link in address bar';
      try {
        await navigator.clipboard.writeText(url);
        feedback = 'Link copied';
      } catch { /* The address bar also contains the selected moment. */ }
      if (disposed) return;
      shareStatus.textContent = feedback;
      clearTimeout(shareTimer);
      shareTimer = setTimeout(() => { shareStatus.textContent = ''; }, 2800);
    }
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
      const verb = playing ? 'Pause' : m.kind === 'outcome' ? 'Replay' : 'Play';
      // Keep the pointer target alive when focus moves from the inspector to this button.
      for (const button of playButtons) {
        const compact = button.hasAttribute('data-timeline-play');
        const label = verb + (compact ? ' timeline' : ' trajectory');
        if (button.getAttribute('aria-label') === label) continue;
        button.innerHTML = (playing ? pauseIcon : playIcon) + (compact ? '' : '<span>' + verb + '</span>');
        button.setAttribute('aria-label', label);
      }
      host.querySelector('[data-status]').textContent=playing?(holding()?'Inspecting':'Replaying'):'Paused';
      host.querySelector('[data-previous]').disabled=current===0;
      host.querySelector('[data-next]').disabled=current===moments.length-1;
      const second = recordedSecond(m.event);
      const runTime = clockLabel(second);
      host.querySelector('[data-current-time]').textContent = runTime;
      timelineJump.querySelector('time').textContent = runTime;
      timelineJump.setAttribute('aria-label', 'Go to the timeline at ' + runTime + ' elapsed');
      host.querySelector('[data-position]').textContent = `Step ${current+1} / ${moments.length}`;
      if (scrubPointer === null) range.value = String(second);
      range.setAttribute('aria-valuetext', `${clockLabel(second)} elapsed, step ${current+1} of ${moments.length}. ${timelineSelection.textContent}`);
      host.querySelector('[data-prev-message]').disabled=noMessages?current===0:(m.index??messages.length)===0;
      host.querySelector('[data-next-message]').disabled=m.kind==='outcome';
    }
    function timelineStamp(moment, label) {
      const second = recordedSecond(moment.event);
      return `<span class="obs-time-mark" data-kind="${moment.kind}" style="--mark:${actorStyle(moment.actor)}"><i aria-hidden="true"></i><time datetime="PT${second}S">${clockLabel(second)}</time> ${esc(names.get(moment.actor))} ${esc(label)}</span>`;
    }
    function showTimeline(moment) {
      if (moment.kind === 'read') {
        const post = moments[sendIndex.get(moment.message.id)];
        const delay = recordedSecond(moment.event) - recordedSecond(post.event);
        const gap = delay >= 60 ? Math.floor(delay / 60) + 'm' + (delay % 60 ? ' ' + delay % 60 + 's' : '') : delay + 's';
        timelineSelection.innerHTML = `<button type="button" data-timeline-post="${post.order}" title="Go to the original post">${timelineStamp(post,'posted')}</button> <span class="obs-time-arrow" aria-hidden="true">→</span> ${timelineStamp(moment,'read')} <small>${delay ? gap + ' later' : 'Same second'}</small>`;
      } else if (moment.kind === 'outcome') {
        timelineSelection.textContent = 'Run outcome';
      } else {
        timelineSelection.innerHTML = timelineStamp(moment, moment.kind === 'send' ? 'posted' : '· ' + moment.action.label);
      }
    }
    function showExchange(moment, history) {
      const message = moment.message;
      routeHeading.replaceChildren();
      routeQuote.hidden = !message;
      if (!message) {
        routeHeading.textContent = moment.kind === 'action'
          ? names.get(moment.actor) + ' · ' + moment.action.label
          : 'Outcome';
        return;
      }

      const number = document.createElement('span');
      number.className = 'obs-route-number';
      number.textContent = (sharedRecords ? 'Record ' : 'Message ') + String(moment.index + 1).padStart(2, '0');
      const sender = document.createElement('strong');
      sender.textContent = names.get(message.actor);
      sender.style.color = actorStyle(message.actor);
      const author = document.createElement('span');
      author.append('Posted by ', sender);
      const separator = document.createElement('span');
      separator.textContent = '·';
      separator.setAttribute('aria-hidden', 'true');
      const destination = document.createElement('span');
      const recipient = document.createElement('strong');
      if (moment.kind === 'read') {
        destination.append('Read by ');
        recipient.textContent = names.get(moment.actor);
        recipient.style.color = actorStyle(moment.actor);
      } else {
        recipient.textContent = messageSource(message);
      }
      destination.append(recipient);
      routeHeading.append(number, author, separator, destination);
      const peers = history.filter(step => step.message === message).map(step => step.actor).sort();
      if (peers.length) {
        const prior = document.createElement('small');
        prior.textContent = 'Also read by ' + peers.join(' and ');
        routeHeading.append(prior);
      }

      const body = message.body.trim();
      const passage = meta.messageExcerpts?.[message.id];
      const quotedPassage = Boolean(passage && body.includes(passage));
      routeQuote.toggleAttribute('data-passage', quotedPassage);
      if (quotedPassage) {
        quoteText.textContent = '“' + passage + '”';
        return;
      }
      const prefix = body.slice(0, 170);
      const atWord = prefix.replace(/\s+\S*$/, '').trimEnd();
      const excerpt = body.length <= prefix.length ? body : (atWord.length > 130 ? atWord : prefix) + '…';
      quoteText.textContent = '“' + excerpt + '”';
    }

    const actionPanel = host.querySelector('[data-action-panel]');
    const actionArgs = actionPanel.querySelector('[data-action-args]');
    const messagePanel = host.querySelector('[data-message-panel]');
    const outcomePanel = host.querySelector('[data-inspector-outcome]');
    const chatLog = messagePanel.querySelector('[data-chat-log]');
    const empty = messagePanel.querySelector('[data-message-empty]');
    const nav = host.querySelector('[data-inspector-nav]');
    const messageNumber = host.querySelector('[data-message-number]');

    function scrollToMessage(message, smooth) {
      const row=chatRows.get(message.id);
      if(!row || !documentPanel.clientHeight)return;
      const viewport=documentPanel.getBoundingClientRect(),box=row.getBoundingClientRect();
      const max = documentPanel.scrollHeight-documentPanel.clientHeight;
      const top = clamp(documentPanel.scrollTop+box.top-viewport.top-Math.min(54,viewport.height*.15),0,max);
      const bottom = clamp(documentPanel.scrollTop+box.bottom-viewport.bottom+10,0,max);
      documentPanel.scrollTo({top,behavior:smooth && !reduced ? 'smooth' : 'instant'});
      transcriptScroll = bottom>top+16 ? {order:current,from:top,to:bottom} : null;
    }

    function renderInspector(moment, smooth) {
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
        const selectMessage = row.querySelector('.obs-chat-select');
        selectMessage.setAttribute('aria-pressed', String(selected));
        const description = isRead ? ', read by ' + names.get(event.actor) : '';
        selectMessage.setAttribute('aria-label', 'Select message ' + messageNumberById.get(item.id) + ' from ' + names.get(item.actor) + description);
        const recipient=row.querySelector('[data-chat-recipient]');
        row.querySelector('[data-read-label]').hidden = !isRead;
        recipient.textContent=isRead?names.get(event.actor):messageSource(item);
        recipient.style.color=isRead?actorStyle(event.actor):'';
        recipient.title=isRead?'Read by '+names.get(event.actor)+' at '+event.time:'Posted to '+messageSource(item);
        for(const button of row.querySelectorAll('[data-obs-receipt]')) {
          const order=Number(button.dataset.obsReceipt);
          button.toggleAttribute('data-current-reader', selected && moment.kind==='read' && moments[order].actor===moment.actor);
          button.setAttribute('aria-current',order===current?'step':'false');
          button.classList.toggle('is-received',order<=current);
        }
      }
      const key = message?.id ?? event.id;
      if (key !== displayedMessage) {
        displayedMessage = key;
        const anchor=message || messageById.get(event.reads[0]);
        if(anchor)scrollToMessage(anchor,smooth);
      }
    }

    function select(index) {
      current = clamp(index, 0, moments.length - 1);
      elapsed = 0;
      transcriptScroll = null;
      if (hovered) { hovered=null; hideTooltips(); }
      const m = active(), message = m.message;
      const history = earlierReadsAt(m);
      if (m.kind === 'outcome') playing = false;
      host.style.setProperty('--signal', actorStyle(message?.actor || m.actor));
      host.dataset.moment = m.kind;
      const animateView=isVisible() && !reduced;
      settlePaused=animateView && !playing;
      orbitView.select(m, signalSeconds, history, {
        animate: animateView, easeFocus: animateView, launch: !reduced && (playing || !started)
      });
      renderInspector(m, animateView);
      showExchange(m, history);
      showTimeline(m);
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
    function stop(settleSelection = true) {
      playing = false;
      cameraReset=null;
      readingUntil = 0;
      documentPanel.scrollTo({top:documentPanel.scrollTop,behavior:'instant'});
      orbitView.holdFocus();
      settlePaused=settleSelection && !reduced && orbitView.transitioning;
      lastFrame = 0;
      cancelAnimationFrame(frame);
      frame = 0;
      updateControls();
      draw(); ensureFrame();
    }
    function seek(index, hash = '#trajectory') {
      if (!started) playing = !reduced;
      started = true;
      readingUntil = 0;
      hovered = null;
      hideTooltips();
      select(index);
      if (hash) pinMoment(hash);
    }
    on(viewer,'trajectory-case-change',()=>{
      resumeAfterLoad=resumeAfterLoad || playing;
      stop(false);
    });
    on(viewer,'trajectory-seek',event=>{
      if (resumeAfterLoad && !reduced) playing=true;
      resumeAfterLoad=false;
      const index=positionIndex(event.detail);
      if (index!==current) seek(index, null);
      else { orbitView.resumeFocus(!reduced); updateControls(); ensureFrame(); }
    });
    function togglePlay(hash = '#trajectory') {
      started = true;
      if (playing) { stop(); pinMoment(hash); return; }
      if (active().kind === 'outcome') select(0);
      playing = true;
      orbitView.resumeFocus(!reduced);
      lastFrame = 0;
      updateControls();
      ensureFrame();
    }
    function openOriginal(kind){
      stop();
      pinMoment();
      const moment=active();
      const event=kind==='message'?moment.message?.event:moment.event;
      if(kind==='outcome')openRecord(null);
      else if(event!=null && Number.isFinite(event))openRecord([event], kind === 'message' ? moment.message.id : undefined);
    }
    function inspectMessage(id) {
      const read = reads.findLast(step => step.message.id === id && step.order <= current)
        || reads.find(step => step.message.id === id);
      const index=read?.order ?? sendIndex.get(id);
      if (index!==current) seek(index);
      else pinMoment();
    }
    function moveMessage(direction) {
      if (noMessages) { seek(current + direction); return; }
      const next = (active().index ?? messages.length) + direction;
      if (next >= messages.length) seek(moments.length - 1);
      else inspectMessage(messages[Math.max(0,next)].id);
    }

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
        {width:viewWidth, height:viewHeight, dpr, yaw:camera.yaw, pitch:camera.pitch},
        paint, signalSeconds, reduced, hovered?.surface === scene ? hovered.hit : null
      );
    }
    const axisLeft = 64, axisRight = 16, laneHeight = 26;
    const lanesBottom = actors.length * laneHeight + 4, chartHeight = lanesBottom + 45;
    flowStage.style.setProperty('--axis-left', axisLeft + 'px');
    flowStage.style.setProperty('--axis-right', axisRight + 'px');
    flowStage.style.setProperty('--scrub-center', (lanesBottom + 9) + 'px');
    flowStage.style.height = chartHeight + 'px';
    const laneMoments = actors.map(a => recordedMoments.filter(m => m.actor === a.id));
    const flowPoints = [];
    let ticks = [];
    const laneY = row => 16 + row * laneHeight;
    const timeX = second => axisLeft + (duration ? second / duration : 0) * (flowWidth - axisLeft - axisRight);

    function layoutTimeline() {
      const span = flowWidth - axisLeft - axisRight;
      // Keep simultaneous moments on the same timestamp. Spread their markers within the lane.
      laneMoments.forEach((lane, row) => {
        let start = 0;
        while (start < lane.length) {
          const x = timeX(recordedSecond(lane[start].event));
          let end = start + 1;
          while (end < lane.length && timeX(recordedSecond(lane[end].event)) - x < 6) end++;
          for (let j = start; j < end; j++) {
            const m = lane[j], offset = end - start > 1 ? 9 * ((j - start) / (end - start - 1) - .5) : 0;
            flowPoints[m.order] = {x:timeX(recordedSecond(m.event)), y:laneY(row) + offset, event:m.event, message:m.message?.id, moment:m.order, r:9};
          }
          start = end;
        }
      });
      flowHits = flowPoints;
      const ideal = duration / Math.max(2,Math.round(span / 104));
      const intervals = [1,2,5,10,15,30,60,120,180,300,600,900,1800,3600];
      const step = ideal > 3600 ? Math.ceil(ideal / 3600) * 3600 :
        intervals.reduce((best,n) => Math.abs(n-ideal) < Math.abs(best-ideal) ? n : best);
      ticks = [0];
      for (let second = step; second < duration; second += step) {
        if (timeX(duration) - timeX(second) > 48) ticks.push(second);
      }
      if (duration) ticks.push(duration);
    }
    function drawTimeMark(moment, ink, featured = false) {
      const {x,y} = flowPoints[moment.order];
      const r = featured ? 5 : moment.kind === 'action' ? 1.6 : 2.8;
      fctx.beginPath();
      if (moment.kind === 'send') {
        fctx.moveTo(x,y-r); fctx.lineTo(x+r,y); fctx.lineTo(x,y+r); fctx.lineTo(x-r,y); fctx.closePath();
      } else {
        fctx.arc(x,y,r,0,2*Math.PI);
      }
      fctx.fillStyle = moment.kind === 'read' ? paint.paper : ink;
      fctx.fill();
      if (moment.kind === 'read' || featured) {
        fctx.strokeStyle = ink; fctx.lineWidth = featured ? 1.8 : 1.2; fctx.stroke();
      }
    }
    function drawFlow() {
      const m = active(), cursor = timeX(recordedSecond(m.event));
      const post = m.kind === 'read' ? moments[sendIndex.get(m.message.id)] : null;
      fctx.setTransform(dpr,0,0,dpr,0,0);
      fctx.clearRect(0,0,flowWidth,chartHeight);
      fctx.font = '11px ' + fontFamily;
      for (const second of ticks) {
        const x = timeX(second);
        strokePoints(fctx,[[x,5],[x,lanesBottom]],paint.guide+'24',.8);
        fctx.textAlign = second === 0 ? 'left' : second === duration ? 'right' : 'center';
        fctx.fillStyle = paint.muted; fctx.fillText(clockLabel(second),x,chartHeight-7);
      }
      fctx.textAlign = 'left';
      actors.forEach((a,i) => {
        const y = laneY(i), ink = color(a.id);
        strokePoints(fctx,[[axisLeft,y],[flowWidth-axisRight,y]],ink+'46',.8);
        fctx.fillStyle = ink; fctx.fillText(names.get(a.id),7,y+4);
      });
      strokePoints(fctx,[[cursor,3],[cursor,lanesBottom+7]],paint.packet+'86',1);
      for (const step of recordedMoments) {
        const alpha = step.order > current ? '4e' : step.kind === 'action' ? '83' : 'c6';
        drawTimeMark(step, color(step.actor) + alpha);
      }
      if (post) {
        const a = flowPoints[post.order], b = flowPoints[m.order];
        const mid = (a.x + b.x) / 2;
        const line = fctx.createLinearGradient(a.x,a.y,b.x,b.y);
        line.addColorStop(0,color(post.actor)); line.addColorStop(1,color(m.actor));
        fctx.beginPath(); fctx.moveTo(a.x,a.y); fctx.bezierCurveTo(mid,a.y,mid,b.y,b.x,b.y);
        fctx.strokeStyle = line; fctx.lineWidth = 2; fctx.stroke();
        drawTimeMark(post,color(post.actor),true);
      }
      if (m.kind !== 'outcome') {
        const {x,y} = flowPoints[m.order];
        glow(fctx,x,y,12,color(m.actor),.6);
        drawTimeMark(m,paint.packet,true);
        if (m.kind === 'read') dot(fctx,x,y,1.6,color(m.actor));
      }
      if (hovered?.surface === flow) dot(fctx,hovered.hit.x,hovered.hit.y,7,paint.ink,false);
    }
    function draw(){
      if(disposed||!ctx||!fctx||!viewWidth||!visible)return;
      if(stageVisible)drawSpatial();
      if(flowVisible)drawFlow();
    }
    function resize() {
      const box=stage.getBoundingClientRect(), timelineWidth=flowStage.getBoundingClientRect().width;
      const ratio=Math.min(devicePixelRatio||1,2);
      if (!box.width || !box.height || !timelineWidth || disposed || !ctx || !fctx) return;
      if (viewWidth===box.width && viewHeight===box.height && flowWidth===timelineWidth && dpr===ratio) return;
      viewWidth=box.width; viewHeight=box.height; flowWidth=timelineWidth; dpr=ratio;
      scene.width=Math.round(viewWidth*dpr); scene.height=Math.round(viewHeight*dpr);
      flow.width=Math.round(flowWidth*dpr); flow.height=Math.round(chartHeight*dpr);
      layoutTimeline();
      drawSpatial(); drawFlow();
    }
    function ensureFrame(){if(!frame&&running())frame=requestAnimationFrame(animate);}
    function animate(now){
      frame=0;if(!running()){lastFrame=0;return;}
      const dt=lastFrame?clamp(now-lastFrame,0,80):0;lastFrame=now;
      if (readingUntil && now>=readingUntil) { readingUntil=0; updateControls(); }
      const transitioning = !reduced && !drag && orbitView.advance(dt);
      const resetting=!!cameraReset;
      if (cameraReset) {
        cameraReset.elapsed=Math.min(cameraReset.duration,cameraReset.elapsed+dt);
        const t=cameraReset.elapsed/cameraReset.duration, ease=t*t*(3-2*t);
        camera.yaw=cameraReset.yaw+cameraReset.turn*ease;
        camera.pitch=cameraReset.pitch+(homeView.pitch-cameraReset.pitch)*ease;
        if (t===1) cameraReset=null;
      }
      const advancing = playing && !holding();
      if (advancing) {
        if (!reduced) {
          signalSeconds += dt * speed / 1000;
          if (!resetting) camera.yaw += dt * clockwiseRate;
        }
        elapsed += dt * speed;
        if (!reduced && transcriptScroll?.order===current) {
          const t=clamp((elapsed/active().duration-.24)/.60,0,1);
          if (t>0) documentPanel.scrollTop=transcriptScroll.from+(transcriptScroll.to-transcriptScroll.from)*t*t*(3-2*t);
          if (t===1) transcriptScroll=null;
        }
        if (elapsed >= active().duration) {
          if (current === moments.length - 1) { stop(); return; }
          select(current + 1);
          return;
        }
      }
      if (stageVisible && (transitioning || resetting || (advancing && !reduced)) && ctx) drawSpatial();
      if (!running()) lastFrame=0;
      ensureFrame();
    }
    function hideTooltips(){tooltips.forEach(t=>{t.hidden=true;});}
    function redrawHover(surface) {
      if (surface===flow) drawFlow();
      else if (!playing || reduced || holding()) drawSpatial();
    }
    function nearest(surface, x, y) {
      let best = null, distance = Infinity, bestPriority = -1;
      for (const hit of surface === scene ? sceneHits : flowHits) {
        if (hit.bounds) {
          const {x:left, y:top, w, h} = hit.bounds;
          if (x >= left && x <= left+w && y >= top && y <= top+h) return hit;
          continue;
        }
        const d = Math.hypot(hit.x - x, hit.y - y);
        if (d >= hit.r) continue;
        const priority = hit.earlierRead ? -1 : hit.moment !== undefined ? 2 : Number(Boolean(hit.latest));
        if (priority > bestPriority || (priority === bestPriority && (d < distance || (d === distance && hit.moment === current)))) {
          best = hit; distance = d; bestPriority = priority;
        }
      }
      return best;
    }
    function hover(surface,event){
      const box=surface.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top,hit=nearest(surface,x,y),tip=tooltips.get(surface);
      if(!hit){hovered=null;tip.hidden=true;redrawHover(surface);return;}
      hovered={surface,hit};const e=eventById.get(hit.event);
      const moment = moments[hit.moment ?? eventMoment.get(hit.event)];
      const message = messageById.get(hit.message) || moment?.message || messageById.get(e.messages[0]);
      let label = 'Open original action';
      if (message) label = 'Select message';
      if (moment?.kind === 'read') label = 'Select recorded read';
      if (moment?.kind === 'action') label = 'Select action';
      const stamp = surface === flow ? clockLabel(recordedSecond(e.id)) + ' elapsed' : e.time;
      tip.innerHTML=`<strong style="color:${actorStyle(e.actor)}">${esc(names.get(e.actor))}<time>${esc(stamp)}</time></strong><span>${esc(message?short(message.body,170):e.label)}</span><small>Turn ${e.turn} · ${label}</small>`;tip.hidden=false;
      tip.style.left=clamp(x-60,10,box.width-tip.offsetWidth-10)+'px';tip.style.top=Math.max(7,y-tip.offsetHeight-14)+'px';redrawHover(surface);
    }
    function pick(surface,event) {
      const box=surface.getBoundingClientRect(), x=event.clientX-box.left, hit=nearest(surface,x,event.clientY-box.top);
      if (!hit) {
        if (surface === flow && x >= axisLeft && x <= flowWidth-axisRight) {
          seek(momentAtSecond(duration*(x-axisLeft)/(flowWidth-axisLeft-axisRight)),'#timeline');
        }
      } else if (hit.moment !== undefined) seek(hit.moment,surface === flow ? '#timeline' : '#trajectory');
      else if (hit.message) seek(sendIndex.get(hit.message));
      else if (eventMoment.has(hit.event)) seek(eventMoment.get(hit.event));
      else { stop(); openRecord([hit.event]); }
    }
    function stepKey(event) {
      const hash = event.currentTarget === scene ? '#trajectory' : '#timeline';
      const steps = {ArrowLeft:current-1, ArrowRight:current+1, Home:0, End:moments.length-1};
      if (event.currentTarget === range) { steps.ArrowDown = current-1; steps.ArrowUp = current+1; }
      const next = steps[event.key];
      if (next !== undefined) { event.preventDefault(); seek(next,hash); }
      else if (event.key === ' ') { event.preventDefault(); togglePlay(hash); }
    }
    [scene,flow].forEach(surface=>{
      on(surface,'pointermove',event=>{
        if (drag && surface===scene) {
          if (event.pointerId!==drag.id) return;
          const dx=event.clientX-drag.x, dy=event.clientY-drag.y;
          if (!drag.moved && Math.abs(dx)+Math.abs(dy)<=4) return;
          drag.moved=true;
          camera.yaw=drag.yaw+dx*.004;
          camera.pitch=clamp(drag.pitch+dy*.003,.22,1.29);
          hideTooltips(); draw(); return;
        }
        if(event.pointerType==='mouse')hover(surface,event);
      });
      on(surface,'pointerleave',()=>{if(drag)return;hovered=null;hideTooltips();redrawHover(surface);});
      on(surface,'keydown',stepKey);
    });
    on(scene,'pointerdown',event=>{
      if (event.button!==0 || drag) return;
      cameraReset=null;
      hovered=null; hideTooltips();
      orbitView.holdFocus();
      drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:camera.yaw,pitch:camera.pitch,moved:false};
      scene.setPointerCapture(event.pointerId);
    });
    on(scene,'pointerup',event=>{
      if (drag?.id!==event.pointerId) return;
      const moved=drag.moved;
      drag=null;
      if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
      if (!moved) pick(scene,event);
      updateControls();
    });
    function cancelDrag(event) {
      if (drag?.id!==event.pointerId) return;
      drag=null; hovered=null; hideTooltips(); updateControls();
    }
    on(scene,'pointercancel',cancelDrag);
    on(scene,'lostpointercapture',cancelDrag);
    on(flow,'click',event=>pick(flow,event));
    on(host,'click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-play'))togglePlay();
      else if(button.hasAttribute('data-timeline-play'))togglePlay('#timeline');
      else if(button.hasAttribute('data-share'))copyMomentLink();
      else if(button.hasAttribute('data-timeline-jump')){
        pinMoment('#timeline'); timeline.scrollIntoView({block:'start',behavior:'instant'}); flow.focus({preventScroll:true});
      }
      else if(button.hasAttribute('data-timeline-post')){seek(Number(button.dataset.timelinePost),'#timeline'); flow.focus({preventScroll:true});}
      else if(button.hasAttribute('data-previous'))seek(current-1,'#timeline');
      else if(button.hasAttribute('data-next'))seek(current+1,'#timeline');
      else if(button.hasAttribute('data-prev-message'))moveMessage(-1);
      else if(button.hasAttribute('data-next-message'))moveMessage(1);
      else if(button.classList.contains('obs-chat-select'))inspectMessage(button.dataset.message);
      else if(button.hasAttribute('data-message'))seek(sendIndex.get(button.dataset.message));
      else if(button.hasAttribute('data-obs-receipt'))seek(Number(button.dataset.obsReceipt));
      else if(button.hasAttribute('data-original'))openOriginal(button.dataset.original);
      else if(button.hasAttribute('data-outcome')){seek(moments.length-1,'#timeline');outcomePanel.focus({preventScroll:true});}
      else if(button.hasAttribute('data-reset')) {
        const turn=Math.atan2(Math.sin(homeView.yaw-camera.yaw),Math.cos(homeView.yaw-camera.yaw));
        if (reduced) Object.assign(camera,homeView);
        else cameraReset={yaw:camera.yaw,pitch:camera.pitch,turn,elapsed:0,duration:420+Math.abs(turn)*260};
        settlePaused=!playing && !reduced;
        orbitView.resetFocus(!reduced); draw(); ensureFrame();
      }
      else if(button.hasAttribute('data-speed')){speed=speed===1?2:speed===2?.5:1;button.textContent=speed+'×';button.setAttribute('aria-label',`Playback speed: ${speed} times`);}
    });
    on(range,'pointerdown',event=>{if(event.button===0) {scrubPointer=event.pointerId; updateControls();}});
    function endScrub(event) {
      if (scrubPointer===null || (event.type!=='blur' && event.pointerId!==scrubPointer)) return;
      scrubPointer=null; updateControls(); ensureFrame();
    }
    on(window,'pointerup',endScrub);
    on(window,'pointercancel',endScrub);
    on(window,'blur',endScrub);
    on(range,'keydown',stepKey);
    on(range,'input',()=>{
      const index=momentAtSecond(Number(range.value));
      if (index!==current) seek(index, null);
    });
    on(range,'change',()=>{pinMoment('#timeline'); updateControls();});
    on(documentPanel,'pointerdown',()=>documentPanel.focus({preventScroll:true}));
    function browseTranscript() {
      if (!playing || documentPanel.scrollHeight<=documentPanel.clientHeight+1) return;
      transcriptScroll=null;
      readingUntil=performance.now()+6000;
      updateControls();
    }
    on(documentPanel,'wheel',browseTranscript,{passive:true});
    on(documentPanel,'touchmove',browseTranscript,{passive:true});
    on(documentPanel,'keydown',event=>{
      if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(event.key)) browseTranscript();
    });
    function startIfVisible() {
      if (!isVisible() || started || reduced || active().kind === 'outcome') return;
      playing=true; started=true;
      const m=active();
      if(m.message)scrollToMessage(m.message,false);
    }
    on(document,'visibilitychange',()=>{lastFrame=0;startIfVisible();updateControls();ensureFrame();});
    on(motion,'change',()=>{
      reduced=motion.matches;
      if (reduced) {
        if (playing) started=false;
        orbitView.select(active(),signalSeconds,earlierReadsAt(active()));
        stop();
      } else {
        startIfVisible(); updateControls(); ensureFrame();
      }
      draw();
    });
    const themeObserver = new MutationObserver(() => {
      paint = readCanvasPaint();
      if (viewWidth && ctx && fctx && !disposed) { drawSpatial(); drawFlow(); }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-darkreader-scheme']
    });
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resizeObserver.observe(flowStage);
    const visibleSurfaces=new Set();
    const visibilityObserver=new IntersectionObserver(entries=>{
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio>=.15) visibleSurfaces.add(entry.target);
        else visibleSurfaces.delete(entry.target);
      }
      const wasVisible=visible;
      visible=visibleSurfaces.size>0;
      stageVisible=visibleSurfaces.has(stage);
      flowVisible=visibleSurfaces.has(flowStage);
      if (stageVisible) camera.seen=true;
      startIfVisible();
      if (wasVisible!==visible) lastFrame=0;
      updateControls(); if(visible)draw(); ensureFrame();
    },{threshold:.15});
    visibilityObserver.observe(stage);
    visibilityObserver.observe(documentPanel);
    visibilityObserver.observe(flowStage);
    const openingMoment = positionIndex(meta.position);
    if (!camera.seen) camera.yaw = orbitView.entryYaw(moments[openingMoment],camera.pitch) ?? camera.yaw;
    select(openingMoment);resize();
    return ()=>{disposed=true;clearTimeout(shareTimer);cancelAnimationFrame(frame);controller.abort();themeObserver.disconnect();resizeObserver.disconnect();visibilityObserver.disconnect();host.classList.remove('trajectory-observatory');host.replaceChildren();};
  };
})();
