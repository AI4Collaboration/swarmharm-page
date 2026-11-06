(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const palette = ['#79b5ee','#b4a0e5','#80cbb7','#e5a08b'];
  const travelMs = 1450;
  const arrivalMs = 420;
  const playIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 4v12M13 4v12"/></svg>';
  const arrow = direction => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="${direction<0?'m12 5-5 5 5 5':'m8 5 5 5-5 5'}"/></svg>`;
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  const short = (value,n=80) => value.length>n?value.slice(0,n).trimEnd()+'…':value;
  const mix = (a,b,t) => a+(b-a)*t;
  const cubic = (p,t) => p[0].map((_,i)=>Math.pow(1-t,3)*p[0][i]+3*Math.pow(1-t,2)*t*p[1][i]+3*(1-t)*t*t*p[2][i]+t*t*t*p[3][i]);

  window.mountTrajectoryObservatory = (host,data,meta,openRecord) => {
    const controller = new AbortController();
    const on = (el,type,fn,options={}) => el.addEventListener(type,fn,{...options,signal:controller.signal});
    const actors=data.actors, events=[...data.events].sort((a,b)=>a.id-b.id);
    const messages=[...data.messages].sort((a,b)=>a.event-b.event);
    const names=new Map(actors.map(a=>[a.id,a.name]));
    const actorIndex=new Map(actors.map((a,i)=>[a.id,i]));
    const eventIndex=new Map(events.map((e,i)=>[e.id,i]));
    const eventById=new Map(events.map(e=>[e.id,e]));
    const messageById=new Map(messages.map(m=>[m.id,m]));
    const color=id=>palette[actorIndex.get(id)]||'#e0b785';
    const noMessages=!messages.length;
    const channel=messages.some(m=>m.kind==='Shared-file note')?'Shared notes':'Shared channel';
    const moments=[];
    messages.forEach((message,index)=>{
      moments.push({kind:'send',event:message.event,actor:message.actor,time:message.time,turn:message.turn,message,index});
      message.reads.forEach(read=>moments.push({kind:'read',event:read.event,actor:read.actor,time:read.time,turn:read.turn,message,index}));
    });
    if(noMessages)events.forEach(event=>moments.push({kind:'action',event:event.id,actor:event.actor,time:event.time,turn:event.turn,action:event}));
    moments.sort((a,b)=>a.event-b.event||Number(a.kind!=='send')-Number(b.kind!=='send'));
    moments.forEach((m,i)=>{m.order=i;});
    const sendIndex=new Map(moments.filter(m=>m.kind==='send').map(m=>[m.message.id,m.order]));
    moments.push({kind:'outcome',event:Infinity,time:events.at(-1)?.time||'',order:moments.length});
    const receiptCount=messages.reduce((n,m)=>n+m.reads.length,0);
    const eventFraction=id=>id===Infinity?1:(eventIndex.get(id)||0)/Math.max(1,events.length-1);
    const communicationIndices=messages.flatMap(m=>[eventIndex.get(m.event),...m.reads.map(r=>eventIndex.get(r.event))]);
    const windowStart=noMessages?0:Math.max(0,Math.min(...communicationIndices)-2);
    const windowEnd=noMessages?events.length-1:Math.min(events.length-1,Math.max(...communicationIndices)+2);
    const stageEvents=events.slice(windowStart,windowEnd+1);
    const worldX=id=>mix(-360,360,id===Infinity?1:clamp(((eventIndex.get(id)||0)-windowStart)/Math.max(1,windowEnd-windowStart),0,1));
    const laneY=id=>(actorIndex.get(id)-(actors.length-1)/2)*102;
    const lanePoint=(x,id,z=0)=>[x,laneY(id)+Math.sin((x+360)/720*Math.PI*2+actorIndex.get(id)*.6)*9,z+Math.sin((x+360)/720*Math.PI)*6];
    const eventPoint=e=>lanePoint(worldX(e.id),e.actor,e.messages.length?28:e.reads.length?19:5);
    const channelHeight = 198;
    const hubPoint=m=>[worldX(m.event),0,channelHeight];
    // Use the very same send/read as the inspector, even when one action reads several messages.
    const connections = moments.filter(moment => moment.message);
    function connectionPath(connection) {
      const m=connection.message,hub=hubPoint(m);
      if(connection.kind==='send') {
        const start=eventPoint(eventById.get(m.event));
        return [start,[start[0]-15,start[1]*.75,105],[hub[0]-25,hub[1],channelHeight-3],hub];
      }
      const end=eventPoint(eventById.get(connection.event)),dx=end[0]-hub[0];
      return [hub,[hub[0]+Math.max(28,dx*.28),hub[1],channelHeight+28],[end[0]-dx*.18+10,end[1]*.66,150],end];
    }
    for (const connection of connections) {
      const path = connectionPath(connection);
      connection.samples = Array.from({length: 37}, (_, i) => cubic(path, i / 36));
    }
    const lanePaths = new Map(actors.map(actor => [
      actor.id, Array.from({length: 61}, (_, i) => lanePoint(mix(-375, 375, i / 60), actor.id))
    ]));
    const framingPoints = [
      ...Array.from(lanePaths.values()).flat(),
      ...stageEvents.map(eventPoint),
      ...connections.flatMap(connection => connection.samples)
    ];
    if (messages.length) framingPoints.push([-380, 0, channelHeight], [380, 0, channelHeight]);

    let current=0,playing=false,started=false,visible=false,disposed=false;
    let elapsed=0,lastFrame=0,frame=0,speed=1;
    let previewingTransfer = false;
    let reading=false,focused=false,hovered=null,drag=null;
    let yaw=-.16,pitch=.72,viewWidth=760,viewHeight=510,flowWidth=1000,dpr=1;
    let verticalScale = 1, verticalOrigin = 0;
    let sceneHits=[],flowHits=[],displayedMessage=null,flowRidges=[];
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let reduced=motion.matches;
    const active=()=>moments[current];
    const holding=()=>reading||focused||!!hovered||!!drag;
    const isVisible=()=>visible&&!document.hidden&&!disposed;
    const running=()=>(playing || previewingTransfer) && isVisible();

    function participantRole(actor, moment) {
      if (moment.message?.actor === actor) return 'Sender';
      if (moment.kind === 'read' && moment.actor === actor) return 'Reader';
      if (moment.kind === 'action' && moment.actor === actor) return 'Acting';
      return '';
    }

    host.classList.add('trajectory-observatory');
    host.innerHTML=`<header class="obs-topbar"><div class="obs-title"><span class="obs-title-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><h4>Trajectory observatory</h4><span class="obs-run">${esc(data.id)}</span></div><div class="obs-top-stats"><span><b>${actors.length}</b> agents</span><span><b>${messages.length}</b> messages</span><span><b>${receiptCount}</b> verified reads</span></div><button class="obs-play" type="button" data-play aria-label="Play trajectory">${playIcon}<span>Play</span></button></header>
      <div class="obs-workbench">
        <section class="obs-inspector" aria-label="Original message and verified receipts">
          <header class="obs-panel-heading"><h5>${noMessages?'Recorded action':'Original message'}</h5><div class="obs-step-buttons"><button type="button" data-prev-message aria-label="Previous ${noMessages?'action':'message'}">${arrow(-1)}</button><span data-message-number></span><button type="button" data-next-message aria-label="Next ${noMessages?'action':'message'}">${arrow(1)}</button></div></header>
          <div class="obs-record-meta"><span class="obs-author-dot" data-author-dot></span><strong data-author></strong><time data-record-time></time></div>
          <div class="obs-document" tabindex="0" role="region" aria-label="Complete original text"><div class="obs-document-kicker" data-document-kicker></div><blockquote data-original-text></blockquote></div>
          <div class="obs-receipts" data-receipts></div>
          <footer class="obs-record-footer"><span data-reading-status>Verbatim from the record</span><button type="button" data-original>Original record ↗</button></footer>
        </section>
        <section class="obs-spatial" aria-label="Spatial view of recorded agent actions">
          <header class="obs-panel-heading"><h5>${noMessages?'Action landscape':'Communication window'}<span>${stageEvents.length} actions</span></h5><button class="obs-reset" type="button" data-reset aria-label="Reset spatial view"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7a6 6 0 1 1 0 6M4 3v4h4"/></svg></button></header>
          <div class="obs-route" data-route><div class="obs-route-heading"></div><blockquote class="obs-route-quote" hidden></blockquote></div>
          <div class="obs-stage"><canvas class="obs-space-canvas" tabindex="0" role="img" aria-label="Four agent timelines. Drag to rotate. Click a point for its record. Arrow keys move through the replay."></canvas><div class="obs-stage-key"><span><i class="obs-key-action"></i>Action</span><span><i class="obs-key-send"></i>Message</span><span><i class="obs-key-read"></i>Verified read</span></div><div class="obs-graph-tooltip" role="tooltip" hidden></div><div class="obs-stage-hint">Drag to rotate · Select a point to read</div></div>
          <div class="obs-agent-strip">${actors.map(a=>`<div data-strip-actor="${a.id}" style="--agent:${color(a.id)}"><span>${a.id}</span><div><strong>${esc(a.name)}</strong><small><b data-actor-role hidden></b><span data-actor-count="${a.id}"></span></small></div><div class="obs-mini-bars" data-activity="${a.id}" aria-hidden="true"></div></div>`).join('')}</div>
        </section>
      </div>
      <section class="obs-flow" aria-label="All recorded actions by agent"><header class="obs-panel-heading"><div><h5>Event flow</h5><span>${events.length} actions · recorded order</span></div><div class="obs-flow-status"><i></i><span data-status>Paused</span><time data-current-time></time></div></header><div class="obs-flow-stage"><canvas class="obs-flow-canvas" tabindex="0" role="img" aria-label="Complete action timeline, one point per recorded action. Click a point to inspect it. Arrow keys move through the replay."></canvas><div class="obs-flow-tooltip" role="tooltip" hidden></div></div></section>
      <footer class="obs-transport"><button type="button" data-previous aria-label="Previous event">${arrow(-1)}</button><button type="button" data-next aria-label="Next event">${arrow(1)}</button><input type="range" min="0" max="${moments.length-1}" value="0" step="1" aria-label="Replay position"><span data-position></span><button type="button" data-speed aria-label="Playback speed: 1 times">1×</button><button class="obs-outcome-button" type="button" data-outcome>Outcome ↗</button></footer>
      <div class="obs-bottom"><section class="obs-message-stream" aria-label="Message index"><header><h5>${noMessages?'Action index':'Message index'}</h5><span>${noMessages?'Select any point above':'Select a message to follow its readers'}</span></header><div class="obs-index">${noMessages?'<p>No authored messages in this run.</p>':messages.map((m,i)=>`<button type="button" data-message="${esc(m.id)}" style="--agent:${color(m.actor)}" aria-label="Message ${i+1} from ${esc(names.get(m.actor))}"><span class="obs-index-number">${String(i+1).padStart(2,'0')}</span><i></i><span class="obs-index-copy"><b>${esc(names.get(m.actor))}</b><span>${esc(short(m.body,110))}</span></span><time>${esc(m.time)}</time></button>`).join('')}</div></section><section class="obs-result" aria-label="Recorded outcome"><span>Recorded outcome</span><p>${esc(meta.outcome)}</p><button type="button" data-outcome>Inspect outcome ↗</button></section></div>`;

    const scene=host.querySelector('.obs-space-canvas'),ctx=scene.getContext('2d');
    const flow=host.querySelector('.obs-flow-canvas'),fctx=flow.getContext('2d');
    const stage=host.querySelector('.obs-stage'),flowStage=host.querySelector('.obs-flow-stage');
    const documentPanel=host.querySelector('.obs-document'),inspector=host.querySelector('.obs-inspector');
    const text=host.querySelector('[data-original-text]'),receiptHost=host.querySelector('[data-receipts]');
    const range=host.querySelector('input[type="range"]');
    const tooltips=new Map([[scene,host.querySelector('.obs-graph-tooltip')],[flow,host.querySelector('.obs-flow-tooltip')]]);
    const indexButtons=[...host.querySelectorAll('[data-message]')];
    const fontFamily=getComputedStyle(host).fontFamily;
    const routeHeading = host.querySelector('.obs-route-heading');
    const routeQuote = host.querySelector('.obs-route-quote');
    const stripRows = new Map([...host.querySelectorAll('[data-strip-actor]')].map(row => [row.dataset.stripActor, row]));
    const actorEvents=new Map(actors.map(a=>[a.id,events.filter(e=>e.actor===a.id)]));
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
      button.innerHTML=`${playing?pauseIcon:playIcon}<span>${playing?'Pause':m.kind==='outcome'?'Replay':'Play'}</span>`;
      button.setAttribute('aria-label',playing?'Pause trajectory':m.kind==='outcome'?'Replay trajectory':'Play trajectory');
      host.querySelector('[data-status]').textContent=playing?(holding()?'Reading':'Replaying'):'Paused';
      host.querySelector('[data-reading-status]').textContent=reading||focused?'Paused for reading':m.kind==='action'?'Recorded tool arguments':m.kind==='outcome'?'Recorded outcome':'Verbatim from the record';
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
          : 'Recorded sequence complete';
        return;
      }

      const number = document.createElement('span');
      number.className = 'obs-route-number';
      number.textContent = 'Message ' + String(moment.index + 1).padStart(2, '0');
      const sender = document.createElement('strong');
      sender.textContent = names.get(message.actor);
      sender.style.color = color(message.actor);
      const verb = document.createElement('span');
      verb.className = 'obs-route-verb';
      const recipient = document.createElement('strong');
      if (moment.kind === 'read') {
        recipient.textContent = names.get(moment.actor);
        recipient.style.color = color(moment.actor);
      } else {
        recipient.textContent = channel;
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

    function select(index, preview = false) {
      current=clamp(index,0,moments.length-1);elapsed=0;
      const m=active(),message=m.message,id=message?.actor||m.actor;
      previewingTransfer = preview && Boolean(message) && !reduced;
      host.style.setProperty('--signal',color(id));
      host.dataset.moment=m.kind;
      host.querySelector('[data-author-dot]').style.background=color(id);
      host.querySelector('[data-author]').textContent=m.kind==='outcome'?'Recorded outcome':names.get(id);
      host.querySelector('[data-record-time]').textContent=message?.time||m.time;
      host.querySelector('[data-message-number]').textContent=message?`${String(m.index+1).padStart(2,'0')} / ${messages.length}`:m.kind==='outcome'?'Result':`${current+1} / ${events.length}`;
      host.querySelector('[data-document-kicker]').textContent=message?`${message.kind} · Turn ${message.turn}`:m.kind==='outcome'?'End of the recorded run':`Turn ${m.turn} · ${m.action.operation}`;
      const content=message?.body||(m.kind==='outcome'?meta.outcome:typeof m.action.arguments==='string'?m.action.arguments:JSON.stringify(m.action.arguments,null,2)||m.action.resultText||m.action.label);
      if(displayedMessage!==(message?.id||m.event)) {text.textContent=content;documentPanel.scrollTop=0;displayedMessage=message?.id||m.event;}
      host.querySelector('[data-original]').textContent=m.kind==='outcome'?'Outcome details ↗':m.kind==='read'?'Read record ↗':'Original record ↗';
      receiptHost.innerHTML=message?`<span>${message.reads.length?'Verified readers':'No verified cross-agent read'}</span><div>${message.reads.map(read=>{
        const readIndex=moments.findIndex(v=>v.kind==='read'&&v.event===read.event&&v.message.id===message.id);
        return `<button type="button" data-obs-receipt="${readIndex}" aria-current="${readIndex===current?'step':'false'}" class="${readIndex<=current?'is-received':''}" style="--agent:${color(read.actor)}" aria-label="${esc(names.get(read.actor))} reads this message at turn ${read.turn}"><i>${read.actor}</i><span>${esc(names.get(read.actor))}</span><b>${readIndex<=current?'✓':'·'}</b></button>`;
      }).join('')}</div>`:noMessages&&m.kind!=='outcome'?'<span>No authored messages in this run</span>':'<span>Source records remain available below</span>';
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
        host.querySelector(`[data-actor-count="${a.id}"]`).textContent=noMessages?`${events.filter(e=>e.actor===a.id&&e.id<=m.event).length} actions`:`${sent} sent · ${reads} read`;
      });
      activity.forEach(a=>a.bars.forEach((bar,i)=>bar.classList.toggle('is-past',a.bins[i].some(id=>id<=m.event))));
      indexButtons.forEach(button=>{const selected=button.dataset.message===message?.id;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('is-future',sendIndex.get(button.dataset.message)>current);});
      const selectedRow=indexButtons.find(button=>button.dataset.message===message?.id);
      if(selectedRow){const list=selectedRow.parentElement,row=selectedRow.getBoundingClientRect(),box=list.getBoundingClientRect();if(row.top<box.top)list.scrollTop+=row.top-box.top;else if(row.bottom>box.bottom)list.scrollTop+=row.bottom-box.bottom;}
      updateControls();draw();ensureFrame();
    }
    function stop(){playing=false;previewingTransfer=false;lastFrame=0;updateControls();cancelAnimationFrame(frame);frame=0;draw();}
    function seek(index){started=true;stop();hovered=null;hideTooltips();select(index,true);}
    function togglePlay(){started=true;if(playing){stop();return;}if(active().kind==='outcome')select(0);previewingTransfer=false;playing=true;lastFrame=0;updateControls();ensureFrame();}
    function openOriginal(){stop();const m=active();openRecord(m.kind==='outcome'?null:[m.event]);}
    function moveMessage(direction){const m=active();if(noMessages){seek(current+direction);return;}const at=m.message?m.index:messages.length;const next=at+direction;if(next>=messages.length)seek(moments.length-1);else seek(sendIndex.get(messages[Math.max(0,next)].id));}

    function elevation(depth, height) {
      return (depth * Math.sin(pitch) - height * Math.cos(pitch)) * (1 + depth * .00038);
    }
    function fitCamera() {
      // Fit the whole recording once per camera change so switching messages keeps the rails steady.
      let lowest = Infinity, highest = -Infinity;
      for (const [x, y, z] of framingPoints) {
        const depth = x * Math.sin(yaw) + y * Math.cos(yaw);
        const height = elevation(depth, z);
        lowest = Math.min(lowest, height);
        highest = Math.max(highest, height);
      }
      const top = viewWidth > 590 ? 45 : 65;
      const available = Math.max(1, viewHeight - top - 31);
      const span = Math.max(1, highest - lowest);
      verticalScale = Math.min(Math.max(.65, (viewWidth - 70) / 830), available / span);
      verticalOrigin = top + (available - span * verticalScale) / 2 - lowest * verticalScale;
    }
    function project([x, y, z]) {
      const depth = x * Math.sin(yaw) + y * Math.cos(yaw);
      const across = x * Math.cos(yaw) - y * Math.sin(yaw);
      const horizontalScale = (viewWidth - 70) / 830;
      return [
        viewWidth / 2 + across * horizontalScale * (1 + depth * .00038),
        verticalOrigin + elevation(depth, z) * verticalScale
      ];
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
    function drawLabel(label,p,c,small=false) {
      ctx.font=`${small?'10':'11'}px ${fontFamily}`;ctx.fillStyle=c;ctx.fillText(label,p[0],p[1]);
    }
    function drawTransfer(moment) {
      const points = moment.samples.map(project);
      const start = points[0];
      const end = points.at(-1);
      const senderColor = color(moment.message.actor);
      const endColor = color(moment.actor);
      const gradient = ctx.createLinearGradient(...start, ...end);
      gradient.addColorStop(0, senderColor);
      gradient.addColorStop(1, endColor);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      strokePoints(ctx, points, senderColor + '12', 9);
      strokePoints(ctx, points, gradient, 2.3);

      // Direction stays legible when the reader pauses or requests reduced motion.
      const arrowIndex = Math.floor(points.length * .62);
      const ahead = points[arrowIndex + 1];
      const behind = points[arrowIndex - 1];
      ctx.save();
      ctx.translate(...points[arrowIndex]);
      ctx.rotate(Math.atan2(ahead[1] - behind[1], ahead[0] - behind[0]));
      strokePoints(ctx, [[-4, -3.5], [1, 0], [-4, 3.5]], '#edf5ff', 1.8);
      ctx.restore();

      const progress = reduced ? 1 : clamp(elapsed / travelMs, 0, 1);
      if (progress < 1) {
        const position = progress * (points.length - 1);
        const index = Math.floor(position);
        const fraction = position - index;
        const next = points[index + 1];
        const head = points[index].map((v, axis) => mix(v, next[axis], fraction));
        const tail = points.slice(Math.max(0, index - 4), index + 1);
        strokePoints(ctx, [...tail, head], '#f4f8ffb0', 2.8);
        glow(ctx, ...head, 18, endColor);
        dot(ctx, ...head, 3, '#ffffff');
      } else if (!reduced && elapsed < travelMs + arrivalMs) {
        const arrival = (elapsed - travelMs) / arrivalMs;
        ctx.globalAlpha = 1 - arrival;
        dot(ctx, ...end, 10 + 11 * arrival, endColor, false);
      }
      ctx.restore();
    }

    function markParticipant(moment, label, alignLeft) {
      const event = eventById.get(moment.event);
      const [x, y] = project(eventPoint(event));
      const ink = color(event.actor);
      glow(ctx, x, y, 22, ink, .75);
      dot(ctx, x, y, 8.5, '#151b23');
      dot(ctx, x, y, 8.5, ink, false);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '600 10px ' + fontFamily;
      ctx.fillStyle = '#edf4fc';
      ctx.fillText(event.actor, x, y + 3.5);
      ctx.textAlign = 'left';
      const showName = viewWidth > 495;
      const caption = showName ? names.get(event.actor) : label;
      ctx.font = '550 11px ' + fontFamily;
      const width = ctx.measureText(caption).width;
      const fitsLeft = x - 13 - width > 3;
      const fitsRight = x + 13 + width < viewWidth - 3;
      const placeLeft = fitsLeft && (alignLeft || !fitsRight);
      const left = clamp(placeLeft ? x - 13 - width : x + 13, 3, viewWidth - width - 4);
      const labelY = showName ? y - 1 : y + 3.5;
      ctx.fillStyle = '#10151df0';
      ctx.fillRect(left - 2, labelY - 10, width + 4, showName ? 25 : 14);
      ctx.fillStyle = ink;
      ctx.fillText(caption, left, labelY);
      if (showName) {
        ctx.font = '10px ' + fontFamily;
        ctx.fillStyle = '#b9c4d1';
        ctx.fillText(label, left, labelY + 12);
      }
      ctx.restore();
      sceneHits.push({x, y, r: 10, event: event.id, moment: moment.order});
    }

    function drawSpatial() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, viewWidth, viewHeight);
      sceneHits = [];
      const moment = active();
      const focused = moment.kind !== 'outcome';
      const endY = actors.length * 51;
      const originalSend = moment.message && moments[sendIndex.get(moment.message.id)];

      for (let i = 0; i <= 10; i++) {
        const x = mix(-390, 390, i / 10);
        strokePoints(ctx, [project([x, -endY, 0]), project([x, endY, 0])], '#b7c7e00d', .6);
      }

      // Other exchanges stay behind the rails and never carry moving packets.
      for (const connection of connections) {
        if (connection === moment || connection === originalSend) continue;
        let ink = '#9baabc0a';
        if (connection.event <= moment.event) ink = '#9baabc1c';
        if (!focused) ink = color(connection.message.actor) + '56';
        strokePoints(ctx, connection.samples.map(project), ink, .75);
      }

      for (const actor of actors) {
        const role = participantRole(actor.id, moment);
        const lit = Boolean(role) || !focused;
        const ink = lit ? color(actor.id) : '#78899b';
        const rail = lanePaths.get(actor.id).map(project);
        if (lit) strokePoints(ctx, rail, ink + '16', 7);
        strokePoints(ctx, rail, ink + (lit ? 'a6' : '43'), lit ? 1.2 : .8);
        const y = laneY(actor.id);
        const label = project([-390, y, 0]);
        ctx.textAlign = 'center';
        drawLabel(actor.id, [label[0], label[1] + 4], ink);
        ctx.textAlign = 'left';
        if (!focused && viewWidth > 460) {
          const name = project([-350, y, -20]);
          drawLabel(short(actor.name, 22), [name[0], name[1] + 12], lit ? ink : '#73808e', true);
        }
      }

      if (!noMessages) {
        const left = project([-380, 0, channelHeight]);
        strokePoints(ctx, [left, project([380, 0, channelHeight])], '#b6c3d139', .7);
        drawLabel(channel, [left[0], left[1] + 14], '#85909e', true);
      }

      for (const event of stageEvents) {
        const [x, y] = project(eventPoint(event));
        const sent = event.messages.length > 0;
        const read = event.reads.length > 0;
        const participant = participantRole(event.actor, moment);
        const actorInk = color(event.actor);
        let ink = '#8290a13b';
        if (participant) ink = actorInk + '70';
        if (!focused) ink = actorInk + 'b8';
        if (focused && event.id > moment.event) ink = '#8290a12c';
        dot(ctx, x, y, sent ? 2.8 : read ? 2.4 : 1.4, ink, !read || sent);
        sceneHits.push({x, y, event: event.id, r: sent ? 8 : 6});
      }

      for (const message of messages) {
        const [x, y] = project(hubPoint(message));
        dot(ctx, x, y, 2.1, focused ? '#9aaabb51' : color(message.actor));
        sceneHits.push({x, y, message: message.id, event: message.event, r: 7});
      }

      if (originalSend) {
        // A read starts at the stored message. Its earlier send is a static trace.
        if (moment.kind === 'read') {
          strokePoints(ctx, originalSend.samples.map(project), color(originalSend.actor) + 'ae', 1.2);
        }
        drawTransfer(moment);
        markParticipant(originalSend, 'Sent', true);
        if (moment.kind === 'read') markParticipant(moment, 'Read', false);

        const [x, y] = project(hubPoint(moment.message));
        const ink = color(originalSend.actor);
        glow(ctx, x, y, 17, ink);
        ctx.fillStyle = '#18202b';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 1.3;
        ctx.fillRect(x - 6.5, y - 4.5, 13, 9);
        ctx.strokeRect(x - 6.5, y - 4.5, 13, 9);
        strokePoints(ctx, [[x - 6, y - 4], [x, y + .5], [x + 6, y - 4]], ink, 1);
        const labelX = clamp(x, 38, viewWidth - 38);
        const labelY = clamp(y - 17, 14, viewHeight - 10);
        ctx.textAlign = 'center';
        drawLabel('Message ' + String(moment.index + 1).padStart(2, '0'), [labelX, labelY], '#e7ecf4');
        ctx.textAlign = 'left';
        sceneHits.push({x, y, r: 9, event: originalSend.event, moment: originalSend.order});
      } else if (moment.kind === 'action') {
        markParticipant(moment, 'Action', false);
      }

      if (hovered?.surface === scene) {
        const hit = hovered.hit;
        dot(ctx, hit.x, hit.y, 8, '#e4ecf6', false);
      }
      drawLabel(stageEvents[0]?.time || '', [16, viewHeight - 7], '#798594', true);
      ctx.textAlign = 'right';
      drawLabel(stageEvents.at(-1)?.time || '', [viewWidth - 16, viewHeight - 7], '#798594', true);
      ctx.textAlign = 'left';
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
      for(let i=0;i<=4;i++){const x=68+i*(flowWidth-91)/4;strokePoints(fctx,[[x,7],[x,139]],'#a7b7cc17',.6);}
      actors.forEach((a,i)=>{
        const y=23+i*31,c=color(a.id),own=actorEvents.get(a.id),x0=68,x1=flowWidth-23;
        const ridge=flowRidges[i]||[];
        fctx.beginPath();ridge.forEach(([x,h],i)=>i?fctx.lineTo(x,y-h):fctx.moveTo(x,y-h));[...ridge].reverse().forEach(([x,h])=>fctx.lineTo(x,y+h));fctx.closePath();fctx.fillStyle=c+'18';fctx.fill();strokePoints(fctx,[[x0,y],[x1,y]],c+'38',.7);
        fctx.fillStyle=c;fctx.fillText(a.id,16,y+4);fctx.fillStyle='#6b7789';fctx.fillText(String(own.length),32,y+4);
      });
      const x=68+eventFraction(m.event)*(flowWidth-91);strokePoints(fctx,[[x,4],[x,137]],'#c9e2ff77',1);glow(fctx,x,70,65,color(m.message?.actor||m.actor),.25);
      for (const event of events) {
        const point = flowPoint(event);
        const isEndpoint = event.id === m.event || event.id === m.message?.event;
        const participant = participantRole(event.actor, m);
        const ink = color(event.actor);
        let dotColor = '#8292a25c';
        if (participant || m.kind === 'outcome') dotColor = ink + 'a0';
        if (event.id > m.event) dotColor = '#8292a244';
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
      if(hovered?.surface===flow)dot(fctx,hovered.hit.x,hovered.hit.y,7,'#e4ecf6',false);
      fctx.fillStyle='#7e8794';fctx.fillText(events[0]?.time||'',68,158);fctx.textAlign='right';fctx.fillText(events.at(-1)?.time||'',flowWidth-23,158);fctx.textAlign='left';
    }
    function draw(){if(disposed||!ctx||!fctx)return;drawSpatial();drawFlow();}
    function resize(){const b=stage.getBoundingClientRect();if(!b.width)return;viewWidth=b.width;viewHeight=b.height;flowWidth=flowStage.getBoundingClientRect().width;dpr=Math.min(devicePixelRatio||1,2);scene.width=Math.round(viewWidth*dpr);scene.height=Math.round(viewHeight*dpr);flow.width=Math.round(flowWidth*dpr);flow.height=Math.round(168*dpr);fitCamera();cacheFlowRidges();draw();}
    function ensureFrame(){if(!frame&&running())frame=requestAnimationFrame(animate);}
    function animate(now){
      frame=0;if(!running()){lastFrame=0;return;}
      const dt=lastFrame?Math.min(80,now-lastFrame):0;lastFrame=now;
      if (previewingTransfer || !holding()) {
        const moment = active();
        const moving = moment.message && !reduced && elapsed < travelMs + arrivalMs;
        elapsed += dt * speed;
        if (previewingTransfer && elapsed >= travelMs + arrivalMs) previewingTransfer = false;
        const duration = {send: 7200, read: 3100, outcome: 5500, action: 1800}[moment.kind];
        if (playing && elapsed >= duration) {
          if (current === moments.length - 1) { stop(); return; }
          select(current + 1);
        } else if (moving && ctx) {
          drawSpatial();
        }
      }
      ensureFrame();
    }
    function hideTooltips(){tooltips.forEach(t=>{t.hidden=true;});}
    function nearest(surface, x, y) {
      let best = null, distance = Infinity;
      for (const hit of surface === scene ? sceneHits : flowHits) {
        const d = Math.hypot(hit.x - x, hit.y - y);
        if (d >= hit.r) continue;
        // The labelled endpoints sit above other records that share the same coordinates.
        const priority = hit.moment !== undefined;
        if (best && best.moment !== undefined && !priority) continue;
        if (d < distance || (priority && best?.moment === undefined)) {
          best = hit;
          distance = d;
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
      tip.innerHTML=`<strong style="color:${color(e.actor)}">${esc(names.get(e.actor))}<time>${esc(e.time)}</time></strong><span>${esc(message?short(message.body,170):e.label)}</span><small>Turn ${e.turn} · ${label}</small>`;tip.hidden=false;
      tip.style.left=clamp(x-60,10,box.width-tip.offsetWidth-10)+'px';tip.style.top=Math.max(7,y-tip.offsetHeight-14)+'px';updateControls();draw();
    }
    function pick(surface,event){const box=surface.getBoundingClientRect(),hit=nearest(surface,event.clientX-box.left,event.clientY-box.top);if(!hit)return;if(hit.moment !== undefined)seek(hit.moment);else if(hit.message)seek(sendIndex.get(hit.message));else if(eventMoment.has(hit.event))seek(eventMoment.get(hit.event));else {stop();openRecord([hit.event]);}}
    [scene,flow].forEach(surface=>{
      on(surface,'pointermove',event=>{
        if(drag&&surface===scene){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;yaw=clamp(drag.yaw+dx*.002,-.5,.5);pitch=clamp(drag.pitch+dy*.003,.35,1.1);fitCamera();hideTooltips();draw();return;}
        if(event.pointerType==='mouse')hover(surface,event);
      });
      on(surface,'pointerleave',()=>{if(drag)return;hovered=null;hideTooltips();updateControls();draw();});
      on(surface,'keydown',event=>{const next={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:moments.length-1}[event.key];if(next!==undefined){event.preventDefault();seek(next);}else if(event.key===' '){event.preventDefault();togglePlay();}});
    });
    on(scene,'pointerdown',event=>{if(event.button!==0)return;started=true;stop();drag={x:event.clientX,y:event.clientY,yaw,pitch,moved:false};scene.setPointerCapture(event.pointerId);});
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
      else if(button.hasAttribute('data-original'))openOriginal();
      else if(button.hasAttribute('data-outcome')){seek(moments.length-1);documentPanel.focus({preventScroll:true});}
      else if(button.hasAttribute('data-reset')){yaw=-.16;pitch=.72;fitCamera();draw();}
      else if(button.hasAttribute('data-speed')){speed=speed===1?2:speed===2?.5:1;button.textContent=speed+'×';button.setAttribute('aria-label',`Playback speed: ${speed} times`);}
    });
    on(range,'input',()=>seek(Number(range.value)));
    on(inspector,'pointerenter',event=>{if(event.pointerType==='mouse'){reading=true;updateControls();}});
    on(inspector,'pointerleave',()=>{reading=false;updateControls();});
    on(inspector,'focusin',()=>{focused=true;updateControls();});
    on(inspector,'focusout',event=>{if(!inspector.contains(event.relatedTarget)){focused=false;updateControls();}});
    on(document,'visibilitychange',()=>{lastFrame=0;ensureFrame();});
    on(motion,'change',()=>{reduced=motion.matches;if(reduced)stop();draw();});
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);resizeObserver.observe(flowStage);
    const visibilityObserver=new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible&&!started&&!reduced){playing=true;started=true;}lastFrame=0;updateControls();ensureFrame();},{threshold:.18});visibilityObserver.observe(stage);
    select(0);resize();
    return ()=>{disposed=true;cancelAnimationFrame(frame);controller.abort();resizeObserver.disconnect();visibilityObserver.disconnect();host.classList.remove('trajectory-observatory');host.replaceChildren();};
  };
})();
