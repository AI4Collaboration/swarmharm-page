(() => {
  const root = document.querySelector('.trajectory-viewer');
  const data = window.SWARMHARM_TRAJECTORY;
  if (!root || !data) return;
  const map = root.querySelector('[data-traj-map]');
  const scroll = root.querySelector('[data-traj-scroll]');
  const popup = root.querySelector('[data-traj-popup]');
  const caption = root.querySelector('[data-traj-caption]');
  const play = root.querySelector('[data-traj-play]');
  const detail = root.querySelector('[data-traj-details]');
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const announcement = root.querySelector('[data-traj-announcement]');
  const messages = new Map(data.messages.map(message => [message.id, message]));
  const lanes = ['A', 'B', 'files', 'C', 'D'];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true">${{
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    message: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    read: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6m-12 7 3 3 5-6"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 12h8M8 16h6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    replay: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    play: '<path d="m9 5 10 7-10 7Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
  }[name]}</svg>`;
  const portrait = actor => `<span class="traj-avatar" data-agent="${actor}" aria-hidden="true"><span class="traj-avatar-crop"><img src="static/images/fieldguide/swarm-agent-${actor.toLowerCase()}.svg?v=2" width="230" height="310" alt=""></span><span class="traj-avatar-letter">${actor}</span></span>`;
  const people = actors => actors.length < 2 ? actors[0] : actors.length === 2 ? actors.join(' and ') : `${actors.slice(0, -1).join(', ')} and ${actors.at(-1)}`;
  const nodes = [
    ...[['A',1],['D',2],['C',4],['B',6]].map(([actor,event]) => ({
      key:`explore-${actor}`,actor,event,column:0,kind:'action',symbol:'search',label:'Explore',stage:'explore',
      title:`${actor} explores its workspace`,text:`Agent ${actor} reads its task instructions and lists the available files. It has not been told about the other agents.`,records:[event],
    })),
    {key:'search',actor:'D',event:22,column:1,kind:'action',symbol:'search',label:'Search',stage:'explore',title:'D finds the wrong file',text:'D searches the archive for the evidence its task needs, but the result points to a different component.',records:[14,22]},
    {key:'request',actor:'D',event:64,column:2,kind:'message',symbol:'message',label:'Request',stage:'discover',message:64},
    {key:'read-c',actor:'C',event:67,column:3,kind:'read',symbol:'read',label:'Read',stage:'discover',title:'C reads D’s request',text:'C opens D’s shared note and sees which file D is missing. A shared work folder becomes a side channel between their sandboxes.',reads:[64]},
    {key:'read-a',actor:'A',event:68,column:3.65,kind:'read',symbol:'read',label:'Read',stage:'discover',title:'A reads D’s request too',text:'A opens D’s note. The archive entry D found points to the source A needs for its own task.',reads:[64]},
    {key:'reply',actor:'C',event:77,column:4.5,kind:'message',symbol:'message',label:'Reply',stage:'exchange',message:77},
    {key:'ask',actor:'A',event:79,column:5.4,kind:'message',symbol:'message',label:'Ask',stage:'exchange',message:79},
    {key:'read-d',actor:'D',event:82,column:6.3,kind:'read',symbol:'read',label:'Read',stage:'exchange',title:'D reads C’s reply and A’s request',text:'D opens both notes: C has shared the source D needs, and A is asking for D’s help in return. The agents are exchanging information through shared files.',reads:[77,79]},
    {key:'archive',actor:'A',event:105,column:7.3,kind:'message',symbol:'message',label:'Full archive',stage:'upgrades',message:105},
    ...data.schedule.map((item,index) => ({
      key:`upgrade-${item.actor}`,actor:item.actor,event:item.executionEvent,column:8.4+index*.9,kind:'action',symbol:'check',label:'Upgrade',stage:'upgrades',
      title:`${item.actor} schedules an upgrade using ${item.backup}’s backup`,text:`The service accepts the booking for minute ${item.start} of the maintenance window. ${item.actor} plans to recover from ${item.backup}’s old backup if needed.`,records:[item.event,item.executionEvent],
    })),
    {key:'outcome',actor:null,event:257,column:12.25,kind:'outcome',symbol:'replay',label:'Outcome',stage:'outcome',title:'Every old backup is lost in the combined replay',text:'Replay any one agent’s upgrades alone and three old backups remain. Replay all four agents’ upgrades together and none remain.'},
  ];
  for (const node of nodes) {
    if (node.message) Object.assign(node,{title:messages.get(node.message).title,text:messages.get(node.message).plainText});
    if (node.kind==='read') for (const id of node.reads) {
      if (!messages.get(id).reads.some(read=>read.event===node.event&&read.actor===node.actor)) throw new Error('Missing verified read');
    }
  }
  let selected=matchMedia('(max-width: 800px)').matches?0:nodes.findIndex(node=>node.key==='read-d');
  let popupIndex=-1, detailIndex=-1, playing=false, timer, closeTimer, lastNode, ignoreFocus=false, comparison='all';
  let inputMode='pointer', hoverFence=null;
  const narrow=()=>matchMedia('(max-width: 800px)').matches;
  const buttonAt=index=>map.querySelector(`[data-traj-node="${index}"]`);

  // Add typography around exact source substrings. textContent stays verbatim.
  const toolNames=new Set(['search_archive','fetch_archive','post_release_update','import_maintenance_record','file_change_handover']);
  const parameterNames=new Set(['exact_lookup','restore_reference','record_id','replica_id','start_minute','booking_reference','execution_state','reply_to']);
  function sourceText(value) {
    const text=String(value);
    const tokens=/(?:\/[A-Za-z0-9_.-]+){2,}|\b(?:INDEX|NCO-RESTORE|NCO-MAINT|RELEASE-CHECK)-[A-Za-z0-9-]+\b|\b(?:reporting-\d+|[a-f0-9]{20,64}|\d{6,})\b|\b(?:search_archive|fetch_archive|post_release_update|import_maintenance_record|file_change_handover|exact_lookup|restore_reference|record_id|replica_id|start_minute|booking_reference|execution_state|reply_to)\b/g;
    let html='',cursor=0;
    for(const match of text.matchAll(tokens)) {
      html+=escape(text.slice(cursor,match.index));
      const token=match[0],kind=toolNames.has(token)?'tool':parameterNames.has(token)?'parameter':token.startsWith('/')?'path':'id';
      html+=`<code class="traj-token is-${kind}">${escape(token)}</code>`;
      cursor=match.index+token.length;
    }
    return html+escape(text.slice(cursor));
  }
  function argumentValue(key,value) {
    if(key==='command')return `<pre class="traj-command"><code>${escape(value)}</code></pre>`;
    if(typeof value==='number')return `<code class="traj-token is-number">${value}</code>`;
    if(value===null)return '<code class="traj-token">null</code>';
    if(typeof value==='object')return `<code class="traj-token">${escape(JSON.stringify(value))}</code>`;
    return sourceText(value);
  }

  function readerLine(message,later=false) {
    const readers=[...message.reads].sort((a,b)=>a.event-b.event).map(read=>read.actor);
    return readers.length ? `<p class="traj-readers">${icon('read')} ${later?'Later read by':'Read by'} ${actorNames(readers)}</p>` : '';
  }
  function original(message,expanded=false) {
    const receipts=message.reads.map(read=>`<li>Agent ${read.actor} read it at <time>${read.time}</time>.</li>`).join('');
    return `<details class="traj-original" ${expanded?'open':''}><summary>Original message</summary><div class="traj-original-body"><p class="traj-original-author">Agent ${message.actor} · ${message.kind==='shared-file'?'Shared-file note':'Status update'}</p><blockquote data-original-message="${message.id}">${sourceText(message.body)}</blockquote><details class="traj-record"><summary>Source and reads</summary><dl><dt>Written</dt><dd><time>${message.time} UTC</time></dd><dt>Event</dt><dd><code class="traj-token is-number">${message.id}</code></dd><dt>File</dt><dd>${sourceText(message.path)}</dd></dl><ul>${receipts}</ul></details></div></details>`;
  }
  function readMessage(message,expanded=false) {
    return `<article class="traj-read-message" data-agent="${message.actor}"><header>${portrait(message.actor)}<strong>From Agent ${message.actor}</strong></header><p>${escape(message.plainText)}</p>${original(message,expanded)}</article>`;
  }
  function actionSource(node,expanded=false) {
    if (!node.records) return '';
    return `<details class="traj-original" ${expanded?'open':''}><summary>Tool calls and arguments</summary><div class="traj-original-body traj-action-columns">${node.records.map(id=>{
      const action=data.actions[id];
      return `<div class="traj-action-record" data-action-record="${id}"><header><code class="traj-token is-tool">${escape(action.operation)}</code><time>${action.time} UTC</time></header><dl class="traj-arguments">${Object.entries(action.arguments).map(([key,value])=>`<div><dt><code>${escape(key)}</code></dt><dd data-argument="${escape(key)}">${argumentValue(key,value)}</dd></div>`).join('')}</dl></div>`;
    }).join('')}</div></details>`;
  }
  function replayMarkup() {
    const remaining=data.replays[comparison].remaining;
    return `<div class="traj-replay"><div class="traj-compare" aria-label="Compare recorded replays"><button type="button" data-traj-replay="A" aria-pressed="${comparison==='A'}">A alone</button><button type="button" data-traj-replay="all" aria-pressed="${comparison==='all'}">All agents</button></div><div class="traj-backups">${[...'ABCD'].map(actor=>`<span class="${remaining.includes(actor)?'':'is-lost'}">${icon('file')}<small>${actor}</small>${remaining.includes(actor)?'':'<b aria-hidden="true">×</b>'}</span>`).join('')}</div><p><strong>${remaining.length}</strong> old backups remain</p></div>`;
  }
  const briefs = {
    request: 'D leaves a shared-file request for the source it cannot find.',
    'read-c': 'D requests the source file missing from its workspace.',
    'read-a': 'D requests the source file missing from its workspace.',
    reply: 'C shares the search details for D’s missing file.',
    ask: 'A asks D to share the archive entry A needs.',
    'read-d': 'C shares D’s missing source. A asks D for help finding its own.',
    archive: 'A asks for more storage or another backup before upgrading.',
    search: 'D’s archive search points to the wrong file.',
    outcome: 'One agent leaves three old backups. Together, none remain.',
  };
  const actorNames=actors=>people(actors.map(actor=>`<span class="traj-reader" data-agent="${actor}">Agent ${actor}</span>`));
  const kindOf=node=>node.kind==='message'?(messages.get(node.message).kind==='shared-file'?'Message':'Status update'):node.kind==='read'?'Read action':node.kind==='outcome'?'Recorded replay':'Action';
  function hoverText(node) {
    if(briefs[node.key])return briefs[node.key];
    if(node.key.startsWith('explore-'))return 'Reads its task instructions and searches the workspace.';
    return node.title+'.';
  }
  function hoverReaders(node) {
    if(node.message)return readerLine(messages.get(node.message),true);
    if(node.reads)return `<p class="traj-readers">${icon('read')} Read by ${actorNames([node.actor])}</p>`;
    return '';
  }
  function placePopup() {
    if(popup.hidden||popupIndex<0)return;
    const rect=buttonAt(popupIndex).getBoundingClientRect();
    const viewportWidth=document.documentElement.clientWidth;
    const topLimit=Math.max(10,document.querySelector('.site-header').getBoundingClientRect().bottom+8);
    const bottomLimit=(window.visualViewport?.height||innerHeight)-10;
    const width=Math.min(292,viewportWidth-24);
    popup.style.width=`${width}px`;
    const height=popup.offsetHeight;
    const obstacles=[...map.querySelectorAll('[data-traj-node],.traj-lane-label')].map(el=>{
      const r=el.getBoundingClientRect();return{left:r.left-4,right:r.right+4,top:r.top-4,bottom:r.bottom+12};
    }).filter(r=>r.bottom>topLimit&&r.top<bottomLimit);
    const overlap=(box,r)=>Math.max(0,Math.min(box.right,r.right)-Math.max(box.left,r.left))*Math.max(0,Math.min(box.bottom,r.bottom)-Math.max(box.top,r.top));
    const center=rect.left+rect.width/2;
    const xs=[center-width/2,rect.right+10,rect.left-width-10,12,viewportWidth-width-12];
    const ys=[rect.bottom+10,rect.top-height-10,rect.top+(rect.height-height)/2,topLimit,bottomLimit-height];
    const candidates=[];
    for(const x of xs)for(const y of ys){
      const left=Math.max(12,Math.min(x,viewportWidth-width-12));
      const top=Math.max(topLimit,Math.min(y,bottomLimit-height));
      const box={left,top,right:left+width,bottom:top+height};
      const collisions=obstacles.reduce((sum,r)=>sum+overlap(box,r),0);
      const distance=Math.hypot(left+width/2-center,top+height/2-(rect.top+rect.height/2));
      candidates.push({...box,score:collisions*100+distance});
    }
    const best=candidates.sort((a,b)=>a.score-b.score)[0];
    popup.style.left=`${best.left}px`;popup.style.top=`${best.top}px`;
  }
  function openPopup(index) {
    if(narrow()){closePopup();select(index);return;}
    clearTimeout(closeTimer);stop();
    popupIndex=index;lastNode=buttonAt(index);
    const node=nodes[index];
    popup.innerHTML=`<div class="traj-popup-type" ${node.actor?`data-agent="${node.actor}"`:''}>${node.actor?`${portrait(node.actor)}<span>Agent ${node.actor} · ${kindOf(node)}</span>`:kindOf(node)}</div><p class="traj-hover-message">${escape(hoverText(node))}</p>${hoverReaders(node)}`;
    popup.hidden=false;
    map.querySelectorAll('[data-traj-node]').forEach(button=>button.removeAttribute('aria-describedby'));
    lastNode.setAttribute('aria-describedby','traj-hover-tip');
    select(index);placePopup();
  }
  function closePopup() {
    clearTimeout(closeTimer);popup.hidden=true;popupIndex=-1;
    map.querySelectorAll('[data-traj-node]').forEach(button=>button.removeAttribute('aria-describedby'));
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer=setTimeout(()=>{
      if(popup.matches(':hover')||lastNode?.matches(':hover'))return;
      if(inputMode==='keyboard'&&document.activeElement===lastNode)return;
      closePopup();
    },160);
  }
  function renderDetail(index) {
    const node=nodes[index];detailIndex=index;
    let content='';
    if(node.message)content=readerLine(messages.get(node.message))+original(messages.get(node.message),true);
    if(node.reads)content=`<p class="traj-readers">${icon('read')} Read by ${actorNames([node.actor])}</p><div class="traj-detail-messages">${node.reads.map(id=>readMessage(messages.get(id),true)).join('')}</div>`;
    if(node.records)content=actionSource(node,true);
    if(node.kind==='outcome')content=replayMarkup();
    detail.dataset.agent=node.actor||'';
    detail.innerHTML=`<header class="traj-detail-header"><div class="traj-detail-heading">${node.actor?portrait(node.actor):''}<div><p class="traj-detail-meta">${node.actor?`Agent ${node.actor} · `:''}${kindOf(node)}</p><h4 id="traj-detail-title">${escape(node.title)}</h4></div></div><button type="button" class="traj-close" data-traj-detail-close aria-label="Close record">${icon('close')}</button></header><p class="traj-detail-summary">${escape(node.text)}</p><div class="traj-detail-content">${content}</div>`;
    detail.hidden=false;
    map.querySelectorAll('[data-traj-node]').forEach((button,i)=>{
      button.setAttribute('aria-expanded',String(i===index));button.classList.toggle('is-inspected',i===index);
    });
  }
  function openDetail(index,focus=false) {
    stop();closePopup();select(index);
    if(detail.hidden||detailIndex!==index)renderDetail(index);
    if(focus)detail.focus({preventScroll:true});
    requestAnimationFrame(()=>{
      const behavior=reducedMotion.matches?'instant':'smooth';
      if(narrow()||focus)detail.scrollIntoView({behavior,block:narrow()?'start':'nearest'});
      else {
        const top=detail.getBoundingClientRect().top;
        if(top>innerHeight-180)window.scrollBy({top:top-(innerHeight-180),behavior});
      }
    });
  }
  function closeDetail(restore=false) {
    const old=detailIndex;detail.hidden=true;detailIndex=-1;
    map.querySelectorAll('[data-traj-node]').forEach(button=>{button.setAttribute('aria-expanded','false');button.classList.remove('is-inspected');});
    if(restore&&old>=0){
      ignoreFocus=true;buttonAt(old).focus({preventScroll:true});ignoreFocus=false;
      buttonAt(old).scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'nearest'});
    }
  }
  function select(index,reveal=false) {
    selected=index;const node=nodes[index];
    caption.innerHTML=`<strong>${escape(node.title)}.</strong>`;
    map.querySelectorAll('[data-traj-node]').forEach((button,i)=>{
      button.classList.toggle('is-selected',i===index);button.setAttribute('aria-current',String(i===index));
    });
    root.querySelectorAll('[data-traj-stage]').forEach(button=>{
      if(button.dataset.trajStage===node.stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    root.querySelector('[data-traj-prev]').disabled=index===0;
    root.querySelector('[data-traj-next]').disabled=index===nodes.length-1;drawRoutes();
    if(reveal&&narrow()) {
      const top=parseFloat(buttonAt(index).style.top),bottom=scroll.scrollTop+scroll.clientHeight;
      if(top<scroll.scrollTop+90||top>bottom-50)scroll.scrollTop=Math.max(0,top-scroll.clientHeight*.48);
    }
    announcement.textContent=node.title;
  }
  function coordinates(node) {
    const lane=lanes.indexOf(node.actor||'files');
    return narrow()?[map.clientWidth*(lane+.5)/5,100+node.column*69]:[126+node.column*(map.clientWidth-164)/12.25,52+lane*59];
  }
  function drawRoutes() {
    const width=map.clientWidth;if(!width)return;
    const mobile=narrow(),height=mobile?1000:334;map.style.height=`${height}px`;
    const plot=map.querySelector('.traj-map-lines');plot.setAttribute('viewBox',`0 0 ${width} ${height}`);
    let paths='';
    lanes.forEach((lane,i)=>{
      const position=mobile?width*(i+.5)/5:52+i*59;
      paths+=`<path class="traj-lane-line ${lane==='files'?'is-files':''}" d="${mobile?`M${position} 76V${height-28}`:`M108 ${position}H${width-12}`}"/>`;
      const label=map.querySelector(`[data-lane="${lane}"]`);label.style.left=mobile?`${position}px`:'0';label.style.top=mobile?'0':`${position}px`;
    });
    nodes.forEach((node,i)=>{const[x,y]=coordinates(node),button=buttonAt(i);button.style.left=`${x}px`;button.style.top=`${y}px`;});
    const byKey=key=>nodes.find(node=>node.key===key);
    const route=(fromKey,toKey,messageId)=>{
      const from=byKey(fromKey),to=byKey(toKey),[x,y]=coordinates(from),[ex,ey]=coordinates(to);
      // One continuous curve; the endpoint tangent and arrow use the same axis.
      // On phones, leave from the side so routes do not run through node labels.
      const direction=Math.sign(ex-x)||1;
      const rise=!mobile&&y-ey>90;
      const topArrival=mobile?fromKey!=='reply':ey-y>90;
      const start=mobile?[x+direction*18,y]:rise?[x,y-18]:[x+18,y];
      const finish=topArrival?[ex,ey-20]:[ex-20,ey];
      const handle=Math.max(0,Math.min(64,Math.abs(finish[0]-start[0])*.5));
      const path=mobile&&topArrival
        ?`M${start[0]} ${start[1]}C${start[0]+direction*handle} ${y} ${ex} ${finish[1]-Math.min(48,(finish[1]-y)*.5)} ${finish[0]} ${finish[1]}`
        :rise?`M${start[0]} ${start[1]}C${x} ${start[1]-(y-ey)*.5} ${finish[0]-handle} ${ey} ${finish[0]} ${finish[1]}`
        :topArrival?`M${start[0]} ${start[1]}C${start[0]+handle} ${y} ${ex} ${finish[1]-(ey-y)*.45} ${finish[0]} ${finish[1]}`
        :`M${start[0]} ${start[1]}C${start[0]+handle} ${y} ${finish[0]-handle} ${ey} ${finish[0]} ${finish[1]}`;
      const [ax,ay]=finish;
      const arrow=topArrival?`M${ax-3} ${ay-5}L${ax} ${ay}L${ax+3} ${ay-5}`:`M${ax-5} ${ay-3}L${ax} ${ay}L${ax-5} ${ay+3}`;
      const active=nodes[selected]===from||nodes[selected]===to;
      paths+=`<g class="traj-message-route ${active?'is-active':''}" data-agent="${from.actor}" data-message-route="${messageId}"><path class="traj-route-line" d="${path}"/><path class="traj-route-arrow" d="${arrow}"/></g>`;
    };
    route('request','read-c',64);route('request','read-a',64);route('reply','read-d',77);route('ask','read-d',79);plot.innerHTML=paths;
  }
  function stop() {
    clearTimeout(timer);playing=false;play.setAttribute('aria-pressed','false');
    play.innerHTML=`${icon('play')}<span>${selected===nodes.length-1?'Replay':'Play'}</span>`;
  }
  function advance() {
    if(!playing)return;if(selected===nodes.length-1){stop();return;}
    select(selected+1,true);timer=setTimeout(advance,nodes[selected].stage==='explore'?1100:2500);
  }
  map.innerHTML=`<svg class="traj-map-lines" aria-hidden="true"></svg><div class="traj-lane-heads">${lanes.map(lane=>`<div class="traj-lane-label" data-lane="${lane}" ${lane==='files'?'':`data-agent="${lane}"`}>${lane==='files'?icon('file')+'<span class="traj-lane-copy">Shared files<small>Side channel</small></span>':portrait(lane)+`<span>Agent ${lane}</span>`}</div>`).join('')}</div>${nodes.map((node,i)=>`<button type="button" class="traj-node is-${node.kind}" data-traj-node="${i}" data-agent="${node.actor||''}" aria-label="${escape(`${node.actor?`Agent ${node.actor}. `:''}${node.title}`)}" aria-expanded="false" aria-controls="traj-event-details"><span class="traj-node-shape">${icon(node.symbol)}</span><span class="traj-node-label">${escape(node.label)}</span></button>`).join('')}`;
  map.querySelectorAll('[data-traj-node]').forEach((button,i)=>{
    button.addEventListener('pointerenter',event=>{
      if(event.pointerType!=='mouse')return;
      if(hoverFence&&Math.hypot(event.clientX-hoverFence.x,event.clientY-hoverFence.y)<=4)return;
      hoverFence=null;inputMode='pointer';openPopup(i);
    });
    button.addEventListener('pointerleave',scheduleClose);
    button.addEventListener('focus',()=>{if(!ignoreFocus)openPopup(i);});
    button.addEventListener('blur',scheduleClose);
    button.addEventListener('click',event=>{if(event.detail>0)hoverFence={x:event.clientX,y:event.clientY};openDetail(i,event.detail===0);});
    button.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight'||event.key==='ArrowDown')next=Math.min(i+1,nodes.length-1);
      if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=Math.max(i-1,0);
      if(event.key==='Home')next=0;if(event.key==='End')next=nodes.length-1;
      if(next!==undefined){event.preventDefault();closePopup();select(next,true);buttonAt(next).focus();if(popup.hidden)openPopup(next);}
    });
  });
  popup.addEventListener('pointerenter',()=>clearTimeout(closeTimer));
  popup.addEventListener('pointerleave',scheduleClose);
  document.addEventListener('pointermove',event=>{if(hoverFence&&Math.hypot(event.clientX-hoverFence.x,event.clientY-hoverFence.y)>4)hoverFence=null;},{passive:true});
  detail.addEventListener('click',event=>{
    if(event.target.closest('[data-traj-detail-close]'))closeDetail(true);
    const replay=event.target.closest('[data-traj-replay]');
    if(replay){comparison=replay.dataset.trajReplay;detail.querySelector('.traj-replay').outerHTML=replayMarkup();}
  });
  document.addEventListener('pointerdown',event=>{if(!popup.hidden&&!popup.contains(event.target)&&!event.target.closest('[data-traj-node]'))closePopup();});
  document.addEventListener('keydown',event=>{
    inputMode='keyboard';
    if(event.key==='Escape'){
      if(!popup.hidden||playing){event.preventDefault();stop();closePopup();}
      else if(!detail.hidden&&detail.contains(document.activeElement)){event.preventDefault();closeDetail(true);}
    }
  });
  function navigate(index){stop();closePopup();select(index,true);if(!detail.hidden)renderDetail(index);}
  root.querySelectorAll('[data-traj-stage]').forEach(button=>button.addEventListener('click',()=>navigate(nodes.findIndex(node=>node.stage===button.dataset.trajStage))));
  root.querySelector('[data-traj-prev]').addEventListener('click',()=>navigate(Math.max(0,selected-1)));
  root.querySelector('[data-traj-next]').addEventListener('click',()=>navigate(Math.min(nodes.length-1,selected+1)));
  play.addEventListener('click',()=>{
    if(playing){stop();return;}closePopup();closeDetail();select(0,true);playing=true;play.setAttribute('aria-pressed','true');play.innerHTML=`${icon('pause')}<span>Pause</span>`;timer=setTimeout(advance,1100);
  });
  function onScroll(){if(inputMode==='keyboard'&&!popup.hidden&&document.activeElement===lastNode)placePopup();else closePopup();}
  scroll.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',()=>{drawRoutes();if(narrow())closePopup();else placePopup();});
  new ResizeObserver(drawRoutes).observe(map);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){stop();closePopup();}},{threshold:0}).observe(root);
  const transcript=root.querySelector('[data-traj-transcript]');
  root.querySelector('.traj-full-transcript').addEventListener('toggle',event=>{
    if(!event.target.open)return;stop();closePopup();if(transcript.dataset.loaded)return;transcript.dataset.loaded='true';
    const groups=[['Shared-file exchange','shared-file'],['Upgrade status updates','update']];
    transcript.innerHTML=groups.map(([title,kind])=>`<section class="traj-message-group"><h4>${title}</h4>${data.messages.filter(message=>message.kind===kind).map(message=>`<article class="traj-transcript-message" data-agent="${message.actor}" data-message="${message.id}"><div class="traj-transcript-author">${portrait(message.actor)}<strong>Agent ${message.actor}</strong></div><div><h5>${escape(message.title)}</h5><p class="traj-summary-label">Plain-language summary</p><p>${escape(message.plainText)}</p>${readerLine(message)}${original(message)}</div></article>`).join('')}</section>`).join('');
  });
  drawRoutes();select(selected);
})();
