(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const palette = ['#79b5ee','#b4a0e5','#80cbb7','#e5a08b'];
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
    const hubPoint=m=>[worldX(m.event),0,176];
    const connections=messages.flatMap(message=>[
      {kind:'send',message,event:message.event,actor:message.actor},
      ...message.reads.map(read=>({kind:'read',message,event:read.event,actor:read.actor,read}))
    ]);
    function connectionPath(connection) {
      const m=connection.message,hub=hubPoint(m);
      if(connection.kind==='send') {
        const start=eventPoint(eventById.get(m.event));
        return [start,[start[0]-16,start[1]*.72,110],[hub[0]-12,hub[1],218],hub];
      }
      const end=eventPoint(eventById.get(connection.event)),dx=end[0]-hub[0];
      return [hub,[hub[0]+dx*.28,hub[1],265],[end[0]-dx*.2,end[1]*.65,185],end];
    }
    connections.forEach(c=>{c.path=connectionPath(c);c.samples=Array.from({length:37},(_,i)=>cubic(c.path,i/36));});

    let current=0,playing=false,started=false,visible=false,disposed=false;
    let elapsed=0,clock=0,lastFrame=0,frame=0,speed=1;
    let reading=false,focused=false,hovered=null,drag=null;
    let yaw=-.16,pitch=.72,viewWidth=760,viewHeight=510,flowWidth=1000,dpr=1;
    let sceneHits=[],flowHits=[],displayedMessage=null,flowRidges=[];
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let reduced=motion.matches;
    const active=()=>moments[current];
    const holding=()=>reading||focused||!!hovered||!!drag;
    const isVisible=()=>visible&&!document.hidden&&!disposed;
    const running=()=>playing&&isVisible();

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
          <div class="obs-stage"><canvas class="obs-space-canvas" tabindex="0" role="img" aria-label="Four agent timelines. Drag to rotate. Click a point for its record. Arrow keys move through the replay."></canvas><div class="obs-stage-key"><span><i class="obs-key-action"></i>Action</span><span><i class="obs-key-send"></i>Message</span><span><i class="obs-key-read"></i>Verified read</span></div><div class="obs-graph-tooltip" role="tooltip" hidden></div><div class="obs-stage-hint">Drag to rotate · Select a point to read</div><div class="obs-route" data-route></div></div>
          <div class="obs-agent-strip">${actors.map(a=>`<div style="--agent:${color(a.id)}"><span>${a.id}</span><div><strong>${esc(a.name)}</strong><small data-actor-count="${a.id}"></small></div><div class="obs-mini-bars" data-activity="${a.id}" aria-hidden="true"></div></div>`).join('')}</div>
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
    function select(index) {
      current=clamp(index,0,moments.length-1);elapsed=0;
      const m=active(),message=m.message,id=message?.actor||m.actor;
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
      host.querySelector('[data-route]').innerHTML=m.kind==='send'?`<b style="color:${color(m.actor)}">${esc(names.get(m.actor))}</b><span>→</span><b>${channel}</b><small>Message ${String(m.index+1).padStart(2,'0')} published</small>`:m.kind==='read'?`<b style="color:${color(message.actor)}">${esc(names.get(message.actor))}</b><span>→</span><b style="color:${color(m.actor)}">${esc(names.get(m.actor))}</b><small>Read through ${channel.toLowerCase()}</small>`:m.kind==='outcome'?'<b>Recorded sequence complete</b>':`<b style="color:${color(m.actor)}">${esc(names.get(m.actor))}</b><small>${esc(m.action.label)}</small>`;
      actors.forEach(a=>{
        const sent=messages.filter(x=>x.actor===a.id&&x.event<=m.event).length;
        const reads=moments.filter(x=>x.kind==='read'&&x.actor===a.id&&x.order<=current).length;
        host.querySelector(`[data-actor-count="${a.id}"]`).textContent=noMessages?`${events.filter(e=>e.actor===a.id&&e.id<=m.event).length} actions`:`${sent} sent · ${reads} read`;
      });
      activity.forEach(a=>a.bars.forEach((bar,i)=>bar.classList.toggle('is-past',a.bins[i].some(id=>id<=m.event))));
      indexButtons.forEach(button=>{const selected=button.dataset.message===message?.id;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('is-future',sendIndex.get(button.dataset.message)>current);});
      const selectedRow=indexButtons.find(button=>button.dataset.message===message?.id);
      if(selectedRow){const list=selectedRow.parentElement,row=selectedRow.getBoundingClientRect(),box=list.getBoundingClientRect();if(row.top<box.top)list.scrollTop+=row.top-box.top;else if(row.bottom>box.bottom)list.scrollTop+=row.bottom-box.bottom;}
      updateControls();draw();
    }
    function stop(){playing=false;lastFrame=0;updateControls();cancelAnimationFrame(frame);frame=0;draw();}
    function seek(index){started=true;stop();hovered=null;hideTooltips();select(index);}
    function togglePlay(){started=true;if(playing){stop();return;}if(active().kind==='outcome')select(0);playing=true;lastFrame=0;updateControls();ensureFrame();}
    function openOriginal(){stop();const m=active();openRecord(m.kind==='outcome'?null:[m.event]);}
    function moveMessage(direction){const m=active();if(noMessages){seek(current+direction);return;}const at=m.message?m.index:messages.length;const next=at+direction;if(next>=messages.length)seek(moments.length-1);else seek(sendIndex.get(messages[Math.max(0,next)].id));}

    function project(p) {
      const angle=yaw+(playing&&!reduced?Math.sin(clock*.12)*.022:0);
      const x=p[0]*Math.cos(angle)-p[1]*Math.sin(angle),y=p[0]*Math.sin(angle)+p[1]*Math.cos(angle);
      const scale=(viewWidth-70)/830,depth=1+y*.00038;
      // Small screens retain vertical separation instead of shrinking all axes.
      const verticalScale=Math.max(.65,scale);
      return [viewWidth*.5+x*scale*depth,viewHeight*.56+(y*Math.sin(pitch)-p[2]*Math.cos(pitch))*verticalScale*depth];
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
    function isActiveConnection(c) {const m=active();return m.message?.id===c.message.id&&(m.kind==='send'?c.kind==='send':m.kind==='read'&&(c.kind==='send'||c.actor===m.actor&&c.event===m.event));}
    function drawSpatial() {
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,viewWidth,viewHeight);sceneHits=[];
      const m=active(),endY=(actors.length/2)*102,currentX=worldX(m.event);
      // Every point represents an actual tool action. The floor is event order.
      for(let i=0;i<=10;i++) {const x=mix(-390,390,i/10);strokePoints(ctx,[project([x,-endY,0]),project([x,endY,0])],'#b7c7e011',.6);}
      for(let y=-endY;y<=endY;y+=34)strokePoints(ctx,[project([-390,y,0]),project([390,y,0])],'#b7c7e009',.6);
      const plane=[project([currentX,-endY,0]),project([currentX,endY,0]),project([currentX,endY,125]),project([currentX,-endY,125])];
      ctx.beginPath();plane.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle='#b6cee805';ctx.fill();strokePoints(ctx,[plane[0],plane[1]],'#b9d9ff42',1);
      actors.forEach(a=>{
        const y=laneY(a.id),c=color(a.id),rail=Array.from({length:61},(_,i)=>project(lanePoint(mix(-375,375,i/60),a.id)));
        strokePoints(ctx,rail,c+'0c',19);strokePoints(ctx,rail,c+'20',7);strokePoints(ctx,rail,c+'7a',.8);
        const label=project([-390,y,0]);dot(ctx,label[0],label[1],10,'#12171f');ctx.textAlign='center';drawLabel(a.id,[label[0],label[1]+4],c);ctx.textAlign='left';
        if(viewWidth>460){const name=project([-350,y,-20]);drawLabel(short(a.name,22),[name[0],name[1]+13],c+'b8',true);}
      });
      if(!noMessages){strokePoints(ctx,[project([-380,0,176]),project([380,0,176])],'#e8d5b64d',.7);const p=project([-380,0,176]);drawLabel(channel,[p[0],p[1]-17],'#ded1b6',true);}
      const paths=connections.map(c=>({c,points:c.samples.map(project),selected:isActiveConnection(c)}));
      paths.sort((a,b)=>Number(a.selected)-Number(b.selected));
      paths.forEach(({c,points,selected})=>{
        const visible=c.event<=m.event,cx=color(c.message.actor);
        strokePoints(ctx,points,cx+(selected?'db':visible?'70':'30'),selected?1.55:.8);
        if(!selected)return;
        ctx.save();ctx.globalCompositeOperation='lighter';strokePoints(ctx,points,cx+'08',11);strokePoints(ctx,points,cx+'17',4);
        const t=reduced?.57:clock*.22;
        for(let n=0;n<3;n++) {
          const head=(t+n/3)%1;
          for(let trail=12;trail>=0;trail--) {
            const u=head-trail*.006;if(u<0)continue;const p=project(cubic(c.path,u));ctx.globalAlpha=(1-trail/13)*.9;dot(ctx,...p,trail===0?2.2:1.1,cx);
          }
          const p=project(cubic(c.path,head));ctx.globalAlpha=1;glow(ctx,...p,20,cx,.85);dot(ctx,...p,1.5,'#fff4e6');
        }
        ctx.restore();
      });
      stageEvents.forEach(e=>{
        const p=project(eventPoint(e)),base=project(lanePoint(worldX(e.id),e.actor));
        const isMessage=e.messages.length>0,isRead=e.reads.length>0,selected=m.event===e.id,seen=e.id<=m.event,c=color(e.actor);
        if(isMessage||isRead){strokePoints(ctx,[base,p],c+(seen?'65':'25'),.7);}
        if(selected)glow(ctx,...p,28,c,.9);
        dot(ctx,...p,selected?4.8:isMessage?3.7:isRead?3:1.7,c+(seen?'ef':'60'),!isRead||isMessage);
        if(selected)dot(ctx,...p,7,c+'76',false);
        sceneHits.push({x:p[0],y:p[1],event:e.id,r:isMessage?9:7});
      });
      messages.forEach(message=>{
        const p=project(hubPoint(message)),selected=m.message?.id===message.id,c=color(message.actor),seen=message.event<=m.event;
        if(selected) {glow(ctx,...p,38,c,.8);const radius=8+(reduced?.6:(clock*.6)%1)*12;dot(ctx,...p,radius,c+'46',false);}
        dot(ctx,...p,selected?4:2.3,c+(seen?'ed':'4d'));if(selected)dot(ctx,...p,1.5,'#ffffff');
        sceneHits.push({x:p[0],y:p[1],message:message.id,event:message.event,r:12});
        if(selected){const label=project([worldX(message.event),0,204]);ctx.textAlign='center';drawLabel(`Message ${String(messages.indexOf(message)+1).padStart(2,'0')}`,[label[0],label[1]-9],c);ctx.textAlign='left';}
      });
      if(hovered?.surface===scene){const p=hovered.hit;glow(ctx,p.x,p.y,20,'#d8e5f3',.7);dot(ctx,p.x,p.y,7,'#e4ecf6',false);}
      const left=project([-360,endY,0]),right=project([360,endY,0]);drawLabel(stageEvents[0]?.time||'',left,'#7e8794',true);ctx.textAlign='right';drawLabel(stageEvents.at(-1)?.time||'',right,'#7e8794',true);ctx.textAlign='left';
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
      events.forEach(e=>{const p=flowPoint(e),selected=e.id===m.event,c=color(e.actor),seen=e.id<=m.event;
        if(selected)glow(fctx,...p,18,c);dot(fctx,...p,selected?4.5:e.messages.length?3:e.reads.length?2.5:1.7,c+(seen?'dd':'4d'),!e.reads.length||e.messages.length>0);flowHits.push({x:p[0],y:p[1],event:e.id,r:8});});
      if(hovered?.surface===flow)dot(fctx,hovered.hit.x,hovered.hit.y,7,'#e4ecf6',false);
      fctx.fillStyle='#7e8794';fctx.fillText(events[0]?.time||'',68,158);fctx.textAlign='right';fctx.fillText(events.at(-1)?.time||'',flowWidth-23,158);fctx.textAlign='left';
    }
    function draw(){if(disposed||!ctx||!fctx)return;drawSpatial();drawFlow();}
    function resize(){const b=stage.getBoundingClientRect();if(!b.width)return;viewWidth=b.width;viewHeight=b.height;flowWidth=flowStage.getBoundingClientRect().width;dpr=Math.min(devicePixelRatio||1,2);scene.width=Math.round(viewWidth*dpr);scene.height=Math.round(viewHeight*dpr);flow.width=Math.round(flowWidth*dpr);flow.height=Math.round(168*dpr);cacheFlowRidges();draw();}
    function ensureFrame(){if(!frame&&running())frame=requestAnimationFrame(animate);}
    function animate(now){
      frame=0;if(!running()){lastFrame=0;return;}
      const dt=lastFrame?Math.min(80,now-lastFrame):0;lastFrame=now;clock+=dt/1000;
      if(!holding()){
        elapsed+=dt*speed;const m=active();const duration=m.kind==='send'?7200:m.kind==='read'?3100:m.kind==='outcome'?5500:1800;
        if(elapsed>=duration){if(current===moments.length-1){stop();return;}select(current+1);}
      }
      draw();ensureFrame();
    }
    function hideTooltips(){tooltips.forEach(t=>{t.hidden=true;});}
    function nearest(surface,x,y){let best=null,dist=Infinity;for(const hit of surface===scene?sceneHits:flowHits){const d=Math.hypot(hit.x-x,hit.y-y);if(d<hit.r&&d<dist){best=hit;dist=d;}}return best;}
    function hover(surface,event){
      const box=surface.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top,hit=nearest(surface,x,y),tip=tooltips.get(surface);
      if(!hit){hovered=null;tip.hidden=true;updateControls();draw();return;}
      hovered={surface,hit};const e=eventById.get(hit.event),message=hit.message?messageById.get(hit.message):messageById.get(e.messages[0]);
      tip.innerHTML=`<strong style="color:${color(e.actor)}">${esc(names.get(e.actor))}<time>${esc(e.time)}</time></strong><span>${esc(message?short(message.body,170):e.label)}</span><small>Turn ${e.turn} · ${message?'Select message':'Open original action'}</small>`;tip.hidden=false;
      tip.style.left=clamp(x-60,10,box.width-tip.offsetWidth-10)+'px';tip.style.top=Math.max(7,y-tip.offsetHeight-14)+'px';updateControls();draw();
    }
    function pick(surface,event){const box=surface.getBoundingClientRect(),hit=nearest(surface,event.clientX-box.left,event.clientY-box.top);if(!hit)return;if(hit.message)seek(sendIndex.get(hit.message));else if(eventMoment.has(hit.event))seek(eventMoment.get(hit.event));else {stop();openRecord([hit.event]);}}
    [scene,flow].forEach(surface=>{
      on(surface,'pointermove',event=>{
        if(drag&&surface===scene){const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;yaw=clamp(drag.yaw+dx*.002,-.5,.5);pitch=clamp(drag.pitch+dy*.003,.35,1.1);hideTooltips();draw();return;}
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
      else if(button.hasAttribute('data-reset')){yaw=-.16;pitch=.72;draw();}
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
