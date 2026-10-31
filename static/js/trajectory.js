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
    ...data.messages.filter(message=>message.kind==='shared-file').map(message=>({
      key:`message-${message.id}`,actor:message.actor,event:message.id,kind:'message',symbol:'message',
      label:message.id===77?'Reply':message.id===79?'Ask':'Note',stage:message.id<76?'discover':'exchange',message:message.id,
    })),
    ...Object.values(data.messages.filter(message=>message.kind==='shared-file').reduce((groups,message)=>{
      message.reads.forEach(read=>{
        const key=`${read.actor}-${read.event}`;
        if(!groups[key])groups[key]={key:`read-${key}`,actor:read.actor,event:read.event,kind:'read',symbol:'read',label:'Read',stage:read.event<76?'discover':'exchange',reads:[],title:`${read.actor} reads shared notes`,text:''};
        groups[key].reads.push(message.id);
      });return groups;
    },{})).map(node=>({...node,title:`${node.actor} reads ${people([...new Set(node.reads.map(id=>messages.get(id).actor))])}’s ${node.reads.length===1?'note':'notes'}`,text:node.reads.map(id=>messages.get(id).plainText).join(' ')})),
    {key:'archive',actor:'A',event:105,kind:'message',symbol:'message',label:'Full archive',stage:'upgrades',message:105},
    ...data.schedule.map((item,index) => ({
      key:`upgrade-${item.actor}`,actor:item.actor,event:item.executionEvent,column:8.4+index*.9,kind:'action',symbol:'check',label:'Upgrade',stage:'upgrades',
      title:`${item.actor} schedules an upgrade using ${item.backup}’s backup`,text:`The service accepts the booking for minute ${item.start} of the maintenance window. ${item.actor} plans to recover from ${item.backup}’s old backup if needed.`,records:[item.event,item.executionEvent],
    })),
    {key:'outcome',actor:null,event:257,column:12.25,kind:'outcome',symbol:'replay',label:'Outcome',stage:'outcome',title:'Every old backup is lost in the combined replay',text:'Replay any one agent’s upgrades alone and three old backups remain. Replay all four agents’ upgrades together and none remain.'},
  ];
  nodes.sort((a,b)=>a.event-b.event);
  let timeColumn=0;
  nodes.forEach(node=>{node.column=node.stage==='explore'&&node.key!=='search'?0:++timeColumn;});
  const lastColumn=timeColumn;
  for (const node of nodes) {
    if (node.message) Object.assign(node,{title:messages.get(node.message).title,text:messages.get(node.message).plainText});
    if (node.kind==='read') for (const id of node.reads) {
      if (!messages.get(id).reads.some(read=>read.event===node.event&&read.actor===node.actor)) throw new Error('Missing verified read');
    }
  }
  let selected=0;
  let detailIndex=-1, playing=false, timer, closeTimer, lastNode, ignoreFocus=false, comparison='all';
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
    if(node.reads)return node.reads.map(id=>messages.get(id).title).join('; ')+'.';
    if(briefs[node.key])return briefs[node.key];
    if(node.key.startsWith('explore-'))return 'Reads its task instructions and searches the workspace.';
    return node.title+'.';
  }
  function hoverReaders(node) {
    if(node.message)return readerLine(messages.get(node.message),true);
    if(node.reads)return `<p class="traj-readers">${icon('read')} Read by ${actorNames([node.actor])}</p>`;
    return '';
  }
  function openPopup(index) {
    if(narrow()){closePopup();select(index);return;}
    clearTimeout(closeTimer);stop();
    lastNode=buttonAt(index);
    const node=nodes[index];
    popup.innerHTML=`<div class="traj-popup-type" ${node.actor?`data-agent="${node.actor}"`:''}>${node.actor?`${portrait(node.actor)}<span>Agent ${node.actor} · ${kindOf(node)}</span>`:kindOf(node)}</div><p class="traj-hover-message">${escape(hoverText(node))}</p>${hoverReaders(node)}`;
    popup.hidden=false;
    map.querySelectorAll('[data-traj-node]').forEach(button=>button.removeAttribute('aria-describedby'));
    lastNode.setAttribute('aria-describedby','traj-hover-tip');
    select(index);
  }
  function closePopup() {
    clearTimeout(closeTimer);popup.hidden=true;
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
    detail.innerHTML=`<header class="traj-detail-header"><div class="traj-detail-heading">${node.actor?portrait(node.actor):''}<div><p class="traj-detail-meta">${node.actor?`Agent ${node.actor} · `:''}${kindOf(node)}</p><h4 id="traj-detail-title">${escape(node.title)}</h4></div></div><button type="button" class="traj-close" data-traj-detail-close aria-label="Close record">${icon('close')}</button></header>${node.reads?'':`<p class="traj-detail-summary">${escape(node.text)}</p>`}<div class="traj-detail-content">${content}</div>`;
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
    root.dispatchEvent(new CustomEvent('trajectory-event',{detail:node.event}));
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
    if(reveal&&!narrow()){const x=parseFloat(buttonAt(index).style.left);if(x<scroll.scrollLeft+150||x>scroll.scrollLeft+scroll.clientWidth-45)scroll.scrollLeft=Math.max(0,x-scroll.clientWidth*.5);}
    announcement.textContent=node.title;
  }
  function coordinates(node) {
    const lane=lanes.indexOf(node.actor||'files');
    return narrow()?[map.clientWidth*(lane+.5)/5,100+node.column*69]:[126+node.column*(map.clientWidth-164)/lastColumn,60+lane*70];
  }
  function drawRoutes() {
    const mobile=narrow(),height=mobile?160+lastColumn*69:394;map.style.minWidth=mobile?'0':`${164+lastColumn*68}px`;map.style.height=`${height}px`;
    const width=map.clientWidth;if(!width)return;
    const plot=map.querySelector('.traj-map-lines');plot.setAttribute('viewBox',`0 0 ${width} ${height}`);
    let paths='';
    lanes.forEach((lane,i)=>{
      const position=mobile?width*(i+.5)/5:60+i*70;
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
      const topArrival=mobile?Math.abs(ex-x)>width/5+1:ey-y>90;
      const start=mobile?[x+direction*18,y]:rise?[x,y-18]:[x+18,y];
      const port=((to.reads||[]).indexOf(messageId)-((to.reads||[]).length-1)/2)*8;
      const finish=topArrival?[ex+port,ey-20]:[ex-20,ey+port];
      const handle=Math.max(0,Math.min(64,Math.abs(finish[0]-start[0])*.5));
      const path=mobile&&topArrival
        ?`M${start[0]} ${start[1]}C${start[0]+direction*handle} ${y} ${finish[0]} ${finish[1]-Math.min(48,(finish[1]-y)*.5)} ${finish[0]} ${finish[1]}`
        :rise?`M${start[0]} ${start[1]}C${x} ${start[1]-(y-ey)*.5} ${finish[0]-handle} ${finish[1]} ${finish[0]} ${finish[1]}`
        :topArrival?`M${start[0]} ${start[1]}C${start[0]+handle} ${y} ${finish[0]} ${finish[1]-(ey-y)*.45} ${finish[0]} ${finish[1]}`
        :`M${start[0]} ${start[1]}C${start[0]+handle} ${y} ${finish[0]-handle} ${finish[1]} ${finish[0]} ${finish[1]}`;
      const [ax,ay]=finish;
      const arrow=topArrival?`M${ax-3} ${ay-5}L${ax} ${ay}L${ax+3} ${ay-5}`:`M${ax-5} ${ay-3}L${ax} ${ay}L${ax-5} ${ay+3}`;
      const active=nodes[selected]===from||nodes[selected]===to;
      paths+=`<g class="traj-message-route ${active?'is-active':''}" data-agent="${from.actor}" data-message-route="${messageId}"><path class="traj-route-line" d="${path}"/><path class="traj-route-arrow" d="${arrow}"/></g>`;
    };
    data.messages.filter(message=>message.kind==='shared-file').forEach(message=>message.reads.forEach(read=>route(`message-${message.id}`,`read-${read.actor}-${read.event}`,message.id)));
    // Reserve measured space around labels, including Ask and Read, so routes
    // never touch the text even when several messages cross the same lane.
    const origin=map.getBoundingClientRect();
    const clearances=[...map.querySelectorAll('.traj-node-label')].map(label=>{
      const box=label.getBoundingClientRect();
      return `<rect x="${box.left-origin.left-5}" y="${box.top-origin.top-4}" width="${box.width+10}" height="${box.height+8}" rx="3" fill="#000" stroke="none"/>`;
    }).join('');
    plot.innerHTML=`<defs><mask id="traj-label-clearance" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#fff" stroke="none"/>${clearances}</mask></defs><g mask="url(#traj-label-clearance)">${paths}</g>`;
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
  function onScroll(){if(inputMode!=='keyboard'||document.activeElement!==lastNode)closePopup();}
  scroll.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',()=>{drawRoutes();if(narrow())closePopup();});
  new ResizeObserver(drawRoutes).observe(map);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){stop();closePopup();}},{threshold:0}).observe(root);
  // Both views use the same published records. One read event may open several notes.
  const overview=root.querySelector('#traj-overview'), log=root.querySelector('#traj-log');
  const list=log.querySelector('.traj-log-list'), agentFilter=log.querySelector('[data-log-agent]'), kindFilter=log.querySelector('[data-log-kind]');
  const events=new Map();
  for(const node of nodes.filter(n=>n.records||n.kind==='outcome')) {
    events.set(node.event,{...node,time:data.actions[node.event]?.time||'',type:node.kind==='outcome'?'Replay':'Action'});
  }
  for(const message of data.messages){
    events.set(message.id,{event:message.id,actor:message.actor,kind:'message',type:message.kind==='shared-file'?'Shared note':'Status update',title:message.title,time:message.time,message});
    for(const read of message.reads){
      let entry=events.get(read.event);
      if(!entry){entry={event:read.event,actor:read.actor,time:read.time,kind:'read',type:'Read',reads:[]};events.set(read.event,entry);}
      entry.reads.push(message);
    }
  }
  const ordered=[...events.values()].sort((a,b)=>a.event-b.event);
  for(const entry of ordered.filter(e=>e.reads)){
    const authors=people([...new Set(entry.reads.map(m=>m.actor))]);
    entry.title=`Read ${entry.reads.length===1?'a note':'notes'} from ${authors}`;
  }
  function logContent(e){
    if(e.message)return `<p>${escape(e.message.plainText)}</p>${readerLine(e.message)}${original(e.message)}`;
    if(e.reads)return e.reads.map(m=>readMessage(m)).join('');
    if(e.records)return `<p>${escape(e.text)}</p>${actionSource(e,true)}`;
    return `<p>${escape(e.text)}</p>${replayMarkup()}`;
  }
  function renderLog(current){
    const rows=ordered.filter(e=>(!agentFilter.value||e.actor===agentFilter.value)&&(!kindFilter.value||e.kind===kindFilter.value));
    list.innerHTML=rows.map(e=>`<details class="traj-log-row" data-log-event="${e.event}" data-agent="${e.actor||''}"><summary><span class="traj-log-who">${e.actor?portrait(e.actor)+`<span>Agent ${e.actor}</span>`:'Replay'}</span><span class="traj-log-copy"><small>${e.type}</small><span>${escape(e.title)}</span></span><time>${escape(e.time)}</time></summary><div class="traj-log-body"></div></details>`).join('')||'<p class="traj-log-empty">No matching events.</p>';
    list.scrollTop=0;
    const active=current!=null&&list.querySelector(`[data-log-event="${current}"]`);
    if(active){active.open=true;list.scrollTop+=active.getBoundingClientRect().top-list.getBoundingClientRect().top;}
  }
  list.addEventListener('toggle',event=>{
    const row=event.target;if(!row.matches('.traj-log-row[open]'))return;
    root.dispatchEvent(new CustomEvent('trajectory-event',{detail:Number(row.dataset.logEvent)}));
    const body=row.querySelector('.traj-log-body');if(!body.childElementCount)body.innerHTML=logContent(events.get(Number(row.dataset.logEvent)));
  },true);
  list.addEventListener('click',event=>{
    const replay=event.target.closest('[data-traj-replay]');if(replay){comparison=replay.dataset.trajReplay;replay.closest('.traj-replay').outerHTML=replayMarkup();}
  });
  agentFilter.addEventListener('change',()=>renderLog());kindFilter.addEventListener('change',()=>renderLog());
  const views=root.querySelector('.traj-views'); views.hidden=false;
  function setView(mode,messagesOnly=false){
    const reading=mode==='log';stop();closePopup();
    overview.hidden=reading;log.hidden=!reading;play.hidden=reading;
    views.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===mode)));
    if(reading){if(messagesOnly){agentFilter.value='';kindFilter.value='message';}renderLog(messagesOnly?null:nodes[selected].event);}
    else drawRoutes();
    requestAnimationFrame(()=>{
      const headerBottom=document.querySelector('.site-header').getBoundingClientRect().bottom;
      if(root.getBoundingClientRect().top<headerBottom+8)root.scrollIntoView({block:'start',behavior:'instant'});
    });
  }
  views.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b&&b.getAttribute('aria-pressed')!=='true')setView(b.dataset.view);});
  root.querySelector('[data-read-messages]').addEventListener('click',()=>{setView('log',true);views.querySelector('[data-view="log"]').focus();});
  drawRoutes();select(selected);
})();
