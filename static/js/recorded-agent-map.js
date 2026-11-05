(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors = { A:'#80afff', B:'#b09bff', C:'#67d4cb', D:'#f1a1bd' };
  const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 11 7-11 7Z"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
  const botIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 5v4M13 5h6"/><rect x="6" y="9" width="20" height="17" rx="6"/><path d="M3 15v6M29 15v6M12 22h8"/><circle cx="12" cy="16" r="1.3"/><circle cx="20" cy="16" r="1.3"/></svg>';
  const noteIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v13H9l-4 4Z"/><path d="M9 8h6M9 12h4"/></svg>';

  window.mountRecordedAgentMap = (host, data, meta, openRecord) => {
    const controller = new AbortController();
    const on = (element, type, fn, options = {}) => element.addEventListener(type, fn, {...options, signal:controller.signal});
    const actors = data.actors;
    const names = new Map(actors.map(actor => [actor.id,actor.name]));
    const messages = [...data.messages].sort((a,b) => a.event-b.event);
    const noMessages = messages.length === 0;
    const channelName = noMessages ? 'Shared environment' : messages.some(message => message.kind === 'Shared-file note') ? 'Shared notes' : 'Shared channel';
    let moments = [];
    messages.forEach((message,index) => {
      moments.push({type:'send',event:message.event,actor:message.actor,time:message.time,turn:message.turn,message,index});
      message.reads.forEach(read => moments.push({type:'read',event:read.event,actor:read.actor,time:read.time,turn:read.turn,message,index}));
    });
    if(noMessages) {
      const important = data.events.filter(event => event.important);
      const candidates = important.length ? important : data.events;
      const stride = Math.max(1,Math.ceil(candidates.length/20));
      moments = candidates.filter((event,index) => index%stride===0 || index===candidates.length-1).map((event,index) => ({type:'action',event:event.id,actor:event.actor,time:event.time,turn:event.turn,action:event,index}));
    }
    moments.sort((a,b) => a.event-b.event || Number(a.type!=='send')-Number(b.type!=='send'));
    moments.forEach((moment,index) => {moment.order=index;});
    moments.push({type:'outcome',event:Infinity,time:data.events.at(-1)?.time || '',order:moments.length});
    const sendPositions = new Map(moments.filter(moment => moment.type==='send').map(moment => [moment.message.id,moment.order]));
    const positions = { A:[.16,.24], B:[.84,.24], C:[.16,.76], D:[.84,.76] };
    const firstMoment = moments[0];
    let current=0, playing=false, speed=1, elapsed=0, animationTime=0, frame=0, lastFrame=0;
    let visible=false, autoStarted=false, pointerReading=false, focusReading=false, disposed=false;
    const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion=motionQuery.matches;
    let width=600,height=460,dpr=1;
    let hubPoint=[300,220];
    const actorCenters=new Map();

    const messageCards = noMessages ? moments.filter(moment => moment.type==='action').map(moment => `<article class="sw-message" data-action-card="${moment.order}" data-agent="${moment.actor}"><header><span class="sw-message-avatar">${moment.actor}</span><button type="button" data-seek="${moment.order}">${esc(names.get(moment.actor))}<small>Recorded action · Turn ${moment.turn}</small></button><time>${esc(moment.time)}</time></header><p>${esc(moment.action.label)}</p><footer><button type="button" data-source="${moment.event}">Original record ↗</button></footer></article>`).join('') : messages.map((message,index) => `<article class="sw-message" data-message-card="${esc(message.id)}" data-agent="${message.actor}"><header><span class="sw-message-avatar">${message.actor}</span><button type="button" data-seek="${sendPositions.get(message.id)}">${esc(names.get(message.actor))}<small>Message ${String(index+1).padStart(2,'0')} · Turn ${message.turn}</small></button><time>${esc(message.time)}</time></header><blockquote>${esc(message.body)}</blockquote><footer><div class="sw-message-readers"><span>${message.reads.length?'Read by':'No verified cross-agent read'}</span>${message.reads.map(read => `<button type="button" data-read-event="${read.event}" data-read-message="${esc(message.id)}" data-agent="${read.actor}" aria-label="${esc(names.get(read.actor))} reads this message at turn ${read.turn}">${read.actor}<span>✓</span></button>`).join('')}</div><button type="button" data-source="${message.event}">Original ↗</button></footer></article>`).join('');
    const axisWidth = Math.max(760,moments.length*16);
    const point = moment => ({x:2+moment.order/Math.max(1,moments.length-1)*96,y:moment.type==='outcome'?50:12.5+actors.findIndex(actor=>actor.id===moment.actor)*25});
    const bandMarkup = actors.map((actor,lane) => {
      const middle=18.5+lane*37;
      const activity=moments.filter(moment=>moment.actor===actor.id).map(moment=>point(moment).x*10);
      const band=[];
      for(let x=0;x<=1000;x+=10) {
        const energy=activity.reduce((sum,eventX)=>sum+Math.exp(-Math.pow((eventX-x)/28,2))*2,0);
        band.push([x,Math.min(8,1.3+energy)]);
      }
      const path='M'+band.map(([x,energy])=>`${x},${middle-energy}`).join(' L')+' L'+[...band].reverse().map(([x,energy])=>`${x},${middle+energy}`).join(' L')+'Z';
      return `<path class="sw-river-band" data-agent="${actor.id}" d="${path}"/><path class="sw-river-line" data-agent="${actor.id}" d="M0 ${middle}H1000"/>`;
    }).join('');

    host.classList.add('sw-replay');
    host.innerHTML = `<header class="sw-heading"><div><p class="sw-eyebrow">INSIDE THE SWARM <span>/ ${esc(data.id)}</span></p><h4>${noMessages?'Actions, together.':'A conversation takes shape.'}</h4></div><div class="sw-live"><i></i><span data-play-state>Recorded replay</span><button type="button" data-header-play aria-label="Play conversation">${playIcon}</button></div></header>
      <div class="sw-main">
        <section class="sw-stage" aria-label="Animated communication between agents">
          <canvas class="sw-canvas" aria-hidden="true"></canvas>
          <div class="sw-scene-meta"><span>${actors.length} separate agents</span><time data-scene-time>${esc(firstMoment?.time||'')}</time></div>
          ${actors.map(actor=>`<div class="sw-agent" data-scene-agent="${actor.id}" data-agent="${actor.id}" style="--agent-x:${positions[actor.id][0]*100}%;--agent-y:${positions[actor.id][1]*100}%"><div class="sw-agent-symbol">${botIcon}<span>${actor.id}</span><i></i></div><strong>${esc(actor.name)}</strong><small data-agent-state>Working</small></div>`).join('')}
          <div class="sw-channel"><span class="sw-channel-stack" aria-hidden="true"><i></i><i></i><i>${noteIcon}</i></span><strong>${esc(channelName)}</strong><span class="sw-channel-count" data-channel-count></span></div>
          <div class="sw-floating-message" data-packet><span data-packet-label></span><p data-packet-text></p></div>
          <div class="sw-scene-caption"><span class="sw-caption-dot"></span><p data-scene-caption></p></div>
        </section>
        <section class="sw-conversation" aria-label="Full recorded messages"><header class="sw-conversation-heading"><h5>${noMessages?'Recorded actions':'The conversation'}</h5><span>${noMessages?data.counts.actions:messages.length} ${noMessages?'actions':'messages'}</span></header><div class="sw-reading-note"><span data-reading-note>Hover here to pause and read</span><i aria-hidden="true"></i></div><div class="sw-message-feed" tabindex="0" aria-label="${noMessages?'Recorded actions':'Full original message text'}">${messageCards}<article class="sw-outcome" data-outcome><span>RECORDED OUTCOME</span><p>${esc(meta.outcome)}</p></article></div></section>
      </div>
      <section class="sw-timeline" aria-label="Conversation timeline"><header><h5>${noMessages?'Action sequence':'Message flow'}</h5><span>Event order <i>→</i></span><div class="sw-timeline-key"><span><i></i>Sent</span><span><i></i>Read</span></div></header><div class="sw-river-layout"><div class="sw-river-actors">${actors.map(actor=>`<span data-agent="${actor.id}">${actor.id}</span>`).join('')}</div><div class="sw-river-scroll"><div class="sw-river" style="--river-width:${axisWidth}px"><svg viewBox="0 0 1000 148" preserveAspectRatio="none" aria-hidden="true">${bandMarkup}</svg><div class="sw-river-playhead" aria-hidden="true"></div>${moments.map(moment=>{const p=point(moment);return `<button type="button" class="sw-river-node is-${moment.type}" data-seek="${moment.order}" data-agent="${moment.actor||''}" style="left:${p.x}%;top:${p.y}%" tabindex="${moment.order===0?0:-1}" aria-label="${moment.type==='outcome'?'Outcome':esc(`${names.get(moment.actor)} ${moment.type==='send'?'sends a message':moment.type==='read'?'reads a message':moment.action.label}, ${moment.time}`)}"><i></i></button>`;}).join('')}</div></div></div></section>
      <footer class="sw-controls"><div class="sw-transport"><button type="button" data-previous aria-label="Previous event"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button type="button" class="sw-play" data-play aria-label="Play replay">${playIcon}<span>Play</span></button><button type="button" data-next aria-label="Next event"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div><input class="sw-scrubber" type="range" min="0" max="${moments.length-1}" value="0" step="1" aria-label="Replay position"><span class="sw-position" data-position></span><button class="sw-speed" type="button" data-speed aria-label="Playback speed: 1 times">1×</button></footer>`;

    const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d');
    const stage=host.querySelector('.sw-stage'),feed=host.querySelector('.sw-message-feed');
    const playButton=host.querySelector('[data-play]'),stateLabel=host.querySelector('[data-play-state]');
    const readingNote=host.querySelector('[data-reading-note]');
    const progress=host.querySelector('[data-position]'),scrubber=host.querySelector('.sw-scrubber');
    const riverScroll=host.querySelector('.sw-river-scroll'),river=host.querySelector('.sw-river'),playhead=host.querySelector('.sw-river-playhead');
    const nodeButtons=[...host.querySelectorAll('.sw-river-node')];
    const actorNodes=new Map([...host.querySelectorAll('[data-scene-agent]')].map(element=>[element.dataset.sceneAgent,element]));
    const cards=new Map([...host.querySelectorAll('[data-message-card]')].map(element=>[element.dataset.messageCard,element]));
    const actionCards=[...host.querySelectorAll('[data-action-card]')];
    const receiptButtons=[...host.querySelectorAll('[data-read-event]')];
    const outcome=host.querySelector('[data-outcome]');
    const caption=host.querySelector('[data-scene-caption]'),packet=host.querySelector('[data-packet]');
    const packetLabel=host.querySelector('[data-packet-label]'),packetText=host.querySelector('[data-packet-text]');
    let activeCard=null;
    const isReading=()=>pointerReading||focusReading;
    const running=()=>playing&&visible&&!document.hidden&&!isReading();
    const holdFor=moment=>moment.type==='send'?Math.min(16000,Math.max(8000,moment.message.body.split(/\s+/).length*160)):moment.type==='read'?3200:5500;

    function updateControls() {
      host.classList.toggle('is-playing',running());
      host.classList.toggle('is-reading',isReading());
      playButton.innerHTML=`${playing?pauseIcon:playIcon}<span>${playing?'Pause':current===moments.length-1?'Replay':'Play'}</span>`;
      playButton.setAttribute('aria-label',playing?'Pause replay':current===moments.length-1?'Replay from the start':'Play replay');
      const headerPlay=host.querySelector('[data-header-play]');
      headerPlay.innerHTML=playing?pauseIcon:playIcon;
      headerPlay.setAttribute('aria-label',playing?'Pause conversation':'Play conversation');
      stateLabel.textContent=playing?(isReading()?'Paused for reading':'Replaying conversation'):'Recorded replay';
      readingNote.textContent=isReading()?'Take your time. Replay is paused.':'Hover here to pause and read';
      host.querySelector('[data-previous]').disabled=current===0;
      host.querySelector('[data-next]').disabled=current===moments.length-1;
    }
    function ensureFrame() {
      if(!frame&&running()&&!disposed)frame=requestAnimationFrame(animate);
    }
    function stop() {playing=false;elapsed=0;updateControls();cancelAnimationFrame(frame);frame=0;lastFrame=0;draw();}
    function play() {
      autoStarted=true;
      if(playing){stop();return;}
      if(current===moments.length-1)select(0,true);
      playing=true;lastFrame=0;updateControls();ensureFrame();
    }
    function showCard(card) {
      if(!card)return;
      const y=card.getBoundingClientRect().top-feed.getBoundingClientRect().top+feed.scrollTop-8;
      feed.scrollTo({top:Math.max(0,y),behavior:reducedMotion?'instant':'smooth'});
    }
    function select(index,scroll=true,forceScroll=false) {
      current=Math.max(0,Math.min(moments.length-1,index));
      elapsed=0;
      const moment=moments[current];
      const message=moment.message;
      const color=colors[message?.actor||moment.actor]||(meta.phase===1?'#80afff':'#fa7d8c');
      host.style.setProperty('--signal',color);
      host.dataset.eventType=moment.type;
      host.querySelector('[data-scene-time]').textContent=moment.time;
      host.querySelector('[data-channel-count]').textContent=noMessages?`${data.counts.actions} recorded actions`:`${messages.filter(m=>m.event<=moment.event).length} / ${messages.length} messages`;
      for(const [id,node] of actorNodes) {
        const writing=moment.type==='send'&&id===moment.actor;
        const reading=moment.type==='read'&&id===moment.actor;
        node.classList.toggle('is-sending',writing);
        node.classList.toggle('is-receiving',reading);
        node.classList.toggle('is-author',moment.type==='read'&&id===message.actor);
        node.classList.toggle('is-connected',moments.some(m=>m.order<=current&&(m.actor===id||m.message?.actor===id)));
        node.querySelector('[data-agent-state]').textContent=writing?'Sending message':reading?'Reading message':moment.type==='outcome'?'Recorded':moment.type==='action'&&moment.actor===id?'Acting':'Working';
      }
      const nextCard=message?cards.get(message.id):moment.type==='outcome'?outcome:actionCards.find(card=>Number(card.dataset.actionCard)===moment.order);
      if(activeCard!==nextCard) {
        activeCard?.classList.remove('is-current');
        activeCard=nextCard;activeCard?.classList.add('is-current');
        if(scroll)showCard(activeCard);
      }
      else if(scroll&&forceScroll)showCard(activeCard);
      cards.forEach((card,id)=>card.classList.toggle('is-future',sendPositions.get(id)>current));
      receiptButtons.forEach(button=>{
        const readPosition=moments.findIndex(m=>m.type==='read'&&String(m.event)===button.dataset.readEvent&&m.message.id===button.dataset.readMessage);
        button.classList.toggle('is-read',readPosition>=0&&readPosition<=current);
        button.classList.toggle('is-current',readPosition===current);
      });
      const shortName=id=>names.get(id)||id;
      if(message) {
        packetLabel.textContent=moment.type==='send'?`${shortName(message.actor)} says`:`${shortName(moment.actor)} reads`;
        packetText.textContent=excerpt(message);
        caption.textContent=moment.type==='send'?`${shortName(moment.actor)} → ${channelName.toLowerCase()}`:`${shortName(message.actor)} → ${channelName.toLowerCase()} → ${shortName(moment.actor)}`;
      } else {
        packetLabel.textContent=moment.type==='outcome'?'Outcome':shortName(moment.actor);
        packetText.textContent=moment.type==='outcome'?'See the recorded result.':moment.action.label;
        caption.textContent=moment.type==='outcome'?'The recorded sequence is complete.':`${shortName(moment.actor)} · Turn ${moment.turn}`;
      }
      packet.classList.remove('is-arriving');
      void packet.offsetWidth;
      packet.classList.add('is-arriving');
      nodeButtons.forEach((button,i)=>{
        button.classList.toggle('is-current',i===current);button.classList.toggle('is-past',i<current);
        button.tabIndex=i===current?0:-1;
        if(i===current)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
      });
      playhead.style.left=point(moment).x+'%';
      scrubber.value=String(current);
      scrubber.setAttribute('aria-valuetext',`${current+1} of ${moments.length}, ${moment.time}, ${moment.type}`);
      progress.textContent=`${String(current+1).padStart(2,'0')} / ${String(moments.length).padStart(2,'0')}`;
      if(scroll) {
        const x=river.clientWidth*point(moment).x/100;
        if(x<riverScroll.scrollLeft+25||x>riverScroll.scrollLeft+riverScroll.clientWidth-25)riverScroll.scrollTo({left:Math.max(0,x-riverScroll.clientWidth*.6),behavior:reducedMotion?'instant':'smooth'});
      }
      updateControls();draw();
    }

    function excerpt(message) {
      const words=message.body.split(/\s+/),limit=width<420?10:16;
      return words.slice(0,limit).join(' ')+(words.length>limit?'…':'');
    }

    function curve(actor,fromHub=false) {
      const [rx,ry]=positions[actor],start=actorCenters.get(actor)||[rx*width,ry*height],end=hubPoint;
      const bend=actor==='A'||actor==='D'?-height*.075:height*.075;
      const p=[start,[start[0]+(end[0]-start[0])*.44,start[1]+bend],[end[0]-(end[0]-start[0])*.3,end[1]+bend],end];
      return fromHub?p.reverse():p;
    }
    function onCurve(p,t) {const s=1-t;return [s*s*s*p[0][0]+3*s*s*t*p[1][0]+3*s*t*t*p[2][0]+t*t*t*p[3][0],s*s*s*p[0][1]+3*s*s*t*p[1][1]+3*s*t*t*p[2][1]+t*t*t*p[3][1]];}
    function path(p) {ctx.beginPath();ctx.moveTo(...p[0]);ctx.bezierCurveTo(...p[1],...p[2],...p[3]);}
    function beam(actor,fromHub,color,time) {
      const p=curve(actor,fromHub);
      ctx.save();ctx.globalCompositeOperation='lighter';
      path(p);ctx.strokeStyle=color+'0b';ctx.lineWidth=16;ctx.stroke();
      path(p);ctx.strokeStyle=color+'1d';ctx.lineWidth=6;ctx.stroke();
      path(p);ctx.strokeStyle=color+'80';ctx.lineWidth=1;ctx.stroke();
      for(let n=0;n<3;n++) {
        const t=((time*.22+n/3)%1+1)%1;
        for(let tail=10;tail>=0;tail--) {
          const at=t-tail*.009;if(at<0)continue;
          const [x,y]=onCurve(p,at);ctx.globalAlpha=(1-tail/11)*.8;
          ctx.beginPath();ctx.arc(x,y,tail===0?2.4:1.3,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
        }
        const [x,y]=onCurve(p,t);ctx.globalAlpha=.24;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
        ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fillStyle='#f1f7ff';ctx.fill();
      }
      ctx.restore();
    }
    function draw() {
      if(!ctx||disposed)return;
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
      const moment=moments[current],t=reducedMotion?1.7:animationTime;
      const activeColor=colors[moment.message?.actor||moment.actor]||'#80afff';
      const wash=ctx.createRadialGradient(width*.5,height*.5,0,width*.5,height*.5,width*.44);
      wash.addColorStop(0,activeColor+'12');wash.addColorStop(1,activeColor+'00');ctx.fillStyle=wash;ctx.fillRect(0,0,width,height);
      // Quiet depth dots give the real message paths a spatial frame.
      for(let i=0;i<64;i++) {
        const x=((i*137.51+31)%997)/997*width;
        const y=((i*79.37+73)%619)/619*height;
        ctx.fillStyle=`rgba(155,184,231,${.08+.06*Math.sin(i+t*.3)})`;
        ctx.fillRect(x,y,1,1);
      }
      for(const actor of actors) {
        const p=curve(actor.id);
        path(p);ctx.strokeStyle=colors[actor.id]+'20';ctx.lineWidth=.7;ctx.stroke();
        const reached=moments.some(m=>m.order<=current&&(m.actor===actor.id||m.message?.actor===actor.id));
        if(reached){path(p);ctx.strokeStyle=colors[actor.id]+'35';ctx.lineWidth=1;ctx.stroke();}
      }
      if(moment.type==='send')beam(moment.actor,false,colors[moment.actor],t);
      if(moment.type==='read') {
        const p=curve(moment.message.actor);path(p);ctx.strokeStyle=colors[moment.message.actor]+'6b';ctx.lineWidth=1;ctx.stroke();
        beam(moment.actor,true,colors[moment.message.actor],t);
      }
      if(moment.type==='send'||moment.type==='read') {
        const target=moment.type==='send'?hubPoint:actorCenters.get(moment.actor)||positions[moment.actor].map((v,i)=>v*(i?height:width));
        for(let n=0;n<2;n++) {
          const life=(t*.45+n*.5)%1;ctx.beginPath();ctx.ellipse(target[0],target[1],22+life*31,14+life*21,0,0,Math.PI*2);ctx.strokeStyle=activeColor+Math.round((1-life)*55).toString(16).padStart(2,'0');ctx.lineWidth=1;ctx.stroke();
        }
      }
    }
    function resize() {
      const box=stage.getBoundingClientRect();if(!box.width)return;
      width=box.width;height=box.height;dpr=Math.min(devicePixelRatio||1,2);
      for(const [id,node] of actorNodes){const r=node.querySelector('.sw-agent-symbol').getBoundingClientRect();actorCenters.set(id,[r.left-box.left+r.width/2,r.top-box.top+r.height/2]);}
      const hub=host.querySelector('.sw-channel-stack').getBoundingClientRect();hubPoint=[hub.left-box.left+hub.width/2,hub.top-box.top+hub.height/2];
      if(moments[current].message)packetText.textContent=excerpt(moments[current].message);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);draw();
    }
    function animate(now) {
      frame=0;if(!running()||disposed){lastFrame=0;return;}
      const dt=lastFrame?Math.min(now-lastFrame,80):0;lastFrame=now;
      animationTime+=dt/1000;elapsed+=dt*speed;
      if(elapsed>=holdFor(moments[current])) {
        if(current===moments.length-1){stop();return;}
        select(current+1,true);
      }
      draw();ensureFrame();
    }
    on(host,'click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-play')||button.hasAttribute('data-header-play')){play();return;}
      if(button.hasAttribute('data-previous')){autoStarted=true;stop();select(current-1);}
      else if(button.hasAttribute('data-next')){autoStarted=true;stop();select(current+1);}
      else if(button.hasAttribute('data-speed')){speed=speed===1?2:speed===2?.5:1;button.textContent=speed+'×';button.setAttribute('aria-label',`Playback speed: ${speed} times`);}
      else if(button.hasAttribute('data-source')){autoStarted=true;stop();openRecord([Number(button.dataset.source)]);}
      else if(button.hasAttribute('data-seek')){autoStarted=true;stop();select(Number(button.dataset.seek),true,true);}
      else if(button.hasAttribute('data-read-event')){const index=moments.findIndex(moment=>moment.type==='read'&&String(moment.event)===button.dataset.readEvent&&moment.message.id===button.dataset.readMessage);if(index>=0){autoStarted=true;stop();select(index);}}
    });
    on(scrubber,'input',()=>{autoStarted=true;stop();select(Number(scrubber.value));});
    on(river,'keydown',event=>{
      const index={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:moments.length-1}[event.key];
      if(index===undefined)return;event.preventDefault();autoStarted=true;stop();select(index);nodeButtons[current].focus({preventScroll:true});
    });
    on(feed,'pointerenter',event=>{if(event.pointerType!=='mouse')return;pointerReading=true;updateControls();});
    on(feed,'pointerleave',()=>{pointerReading=false;lastFrame=0;updateControls();ensureFrame();});
    on(feed,'focusin',()=>{focusReading=true;updateControls();});
    on(feed,'focusout',event=>{if(feed.contains(event.relatedTarget))return;focusReading=false;lastFrame=0;updateControls();ensureFrame();});
    on(document,'visibilitychange',()=>{lastFrame=0;ensureFrame();});
    on(motionQuery,'change',()=>{reducedMotion=motionQuery.matches;if(reducedMotion)stop();draw();});
    const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(stage);
    const visibilityObserver=new IntersectionObserver(entries=>{
      visible=entries.some(entry=>entry.isIntersecting);
      if(visible&&!autoStarted&&!reducedMotion){autoStarted=true;playing=true;}
      lastFrame=0;updateControls();ensureFrame();
    },{threshold:.15});
    visibilityObserver.observe(stage);
    select(0,false);resize();
    return ()=>{disposed=true;cancelAnimationFrame(frame);controller.abort();resizeObserver.disconnect();visibilityObserver.disconnect();host.classList.remove('sw-replay');host.replaceChildren();};
  };
})();
