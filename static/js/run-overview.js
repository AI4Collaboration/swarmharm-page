(() => {
  const figure=document.querySelector('[data-run-overview]');
  const lanes=window.SWARMHARM_RUN_TURNS, data=window.SWARMHARM_TRAJECTORY;
  const actions=window.SWARMHARM_RUN_ACTIONS;
  if(!figure||!lanes||!data||!actions)return;
  const actors=Object.keys(lanes).sort(), longest=Math.max(...actors.map(a=>lanes[a].length));
  const total=actors.reduce((n,a)=>n+lanes[a].length,0), step=17,rowHeight=64,width=longest*step;
  const chart=figure.querySelector('.run-coordinate'),summary=figure.querySelector('[data-turn-summary]'),legend=figure.querySelector('.run-key');
  const positions=new Map(),buttons=new Map(),connections=[],readers=new Map(),sharedReads=new Set();
  const messages=new Map(data.messages.map(m=>[m.id,m]));
  const point=(actor,turn)=>({x:(turn-.5)*step,y:actors.indexOf(actor)*rowHeight+32});
  const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  figure.querySelector('#run-total').textContent=`${total} model turns`;
  actors.forEach(actor=>lanes[actor].forEach((events,i)=>events.forEach(([id])=>positions.set(id,{actor,turn:i+1,...point(actor,i+1)}))));
  data.messages.forEach(message=>message.reads.forEach(read=>{
    const from=positions.get(message.id),to=positions.get(read.event);
    if(!from||!to)return;
    if(!readers.has(read.event))readers.set(read.event,new Set());
    readers.get(read.event).add(message.actor);
    if(message.kind==='shared-file')sharedReads.add(read.event);
    connections.push({from,to,id:message.id,shared:message.kind==='shared-file'});
  }));
  function shortLabel(id){
    if(messages.has(id))return messages.get(id).kind==='shared-file'?'Write note':'Post update';
    if(readers.has(id))return 'Read messages';
    return actions[id]?.label||'Tool action';
  }
  function description(id){
    if(messages.has(id))return messages.get(id).title;
    if(readers.has(id))return `Reads messages from Agent ${[...readers.get(id)].join(', Agent ')}`;
    return actions[id]?.description||'Recorded tool action';
  }
  function turnContent(actor,turn){
    const descriptions=new Map();
    lanes[actor][turn-1].forEach(([id])=>{const text=description(id);descriptions.set(text,(descriptions.get(text)||0)+1);});
    return `<strong>Agent ${actor} · Turn ${turn}</strong>${descriptions.size?`<ul>${[...descriptions].map(([text,count])=>`<li>${count>1?`${count} × `:''}${escape(text)}</li>`).join('')}</ul>`:'<p>No tool call was recorded in this model turn.</p>'}`;
  }
  const tip=document.createElement('div');tip.className='run-hover';tip.id='run-turn-tooltip';tip.role='tooltip';tip.hidden=true;document.body.append(tip);
  let hoverButton=null,hideTimer,keyboardInput=false;
  function hideTip(){clearTimeout(hideTimer);tip.hidden=true;hoverButton?.removeAttribute('aria-describedby');hoverButton=null;}
  function deferHide(){clearTimeout(hideTimer);hideTimer=setTimeout(hideTip,100);}
  function showTip(button,actor,turn){
    clearTimeout(hideTimer);hoverButton?.removeAttribute('aria-describedby');hoverButton=button;
    tip.innerHTML=turnContent(actor,turn);tip.hidden=false;button.setAttribute('aria-describedby',tip.id);
    const b=button.getBoundingClientRect(),box=tip.getBoundingClientRect(),pad=12;
    const x=Math.max(pad,Math.min(innerWidth-box.width-pad,b.left+b.width/2-box.width/2));
    const above=b.top+b.height/2-16-box.height;
    const y=Math.max(pad,Math.min(innerHeight-box.height-pad,above>=pad?above:b.top+b.height/2+16));
    tip.style.left=`${x}px`;tip.style.top=`${y}px`;
  }
  tip.addEventListener('pointerenter',()=>clearTimeout(hideTimer));tip.addEventListener('pointerleave',deferHide);
  document.addEventListener('pointerdown',event=>{keyboardInput=false;if(!tip.contains(event.target))hideTip();});
  document.addEventListener('keydown',event=>{keyboardInput=true;if(event.key==='Escape')hideTip();});
  window.addEventListener('resize',hideTip);window.addEventListener('scroll',hideTip,{passive:true});
  const scroller=document.createElement('div');scroller.className='run-scroll';scroller.tabIndex=0;
  scroller.setAttribute('role','region');scroller.setAttribute('aria-label','Full trajectory, scroll horizontally to inspect every turn');
  chart.before(scroller);scroller.append(chart);
  chart.style.setProperty('--run-width',`${width}px`);
  chart.style.setProperty('--run-turns',longest);
  const axis=document.createElement('div');axis.className='run-axis';
  for(const turn of [1,10,20,30,40,50,longest]){const tick=document.createElement('span');tick.style.left=`${(turn-.5)*step}px`;tick.textContent=turn;axis.append(tick);}
  chart.append(axis);
  const key=document.createElement('div');key.className='run-type-key';key.setAttribute('aria-label','Important turns');
  key.innerHTML='<span data-kind="message"><i></i>Shared message</span><span data-kind="read"><i></i>Message read</span><span data-kind="upgrade"><i></i>Upgrade request</span>';
  scroller.before(key);
  actors.forEach((actor,row)=>{
    const label=document.createElement('span');label.className='run-actor';label.dataset.agent=actor;
    label.style.gridRow=row+2;label.innerHTML=`Agent ${actor}<small>${lanes[actor].length} turns</small>`;
    const lane=document.createElement('div');lane.className='run-slider';lane.style.gridRow=row+2;
    lane.setAttribute('role','group');lane.setAttribute('aria-label',`Agent ${actor} turns`);
    lanes[actor].forEach((events,i)=>{
      const turn=i+1,labels=[...new Set(events.map(([id])=>shortLabel(id)))];
      const text=labels.join(' + ')||'No tool call';
      const button=document.createElement('button');button.type='button';button.className='run-turn';button.dataset.agent=actor;button.dataset.turn=turn;
      button.tabIndex=i===0?0:-1;
      button.dataset.kind=events.some(([id])=>messages.get(id)?.kind==='shared-file')?'message':events.some(([id])=>sharedReads.has(id))?'read':events.some(([,op])=>op==='book_replica_upgrade')?'upgrade':'ordinary';
      button.setAttribute('aria-label',`Agent ${actor}, turn ${turn}: ${text}`);
      button.innerHTML='<i class="run-turn-dot" aria-hidden="true"></i>';
      button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')showTip(button,actor,turn);});
      button.addEventListener('pointerleave',deferHide);
      button.addEventListener('focus',()=>{if(keyboardInput)showTip(button,actor,turn);});
      button.addEventListener('blur',deferHide);
      button.addEventListener('click',()=>selectTurn(actor,turn));
      button.addEventListener('keydown',event=>{
        const next={ArrowRight:turn+1,ArrowLeft:turn-1,Home:1,End:lanes[actor].length}[event.key];
        if(next===undefined)return;
        event.preventDefault();const n=Math.max(1,Math.min(lanes[actor].length,next));selectTurn(actor,n,true);buttons.get(`${actor}-${n}`).focus({preventScroll:true});
      });
      lane.append(button);buttons.set(`${actor}-${turn}`,button);
    });
    chart.append(label,lane);
  });
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','run-plot');svg.setAttribute('viewBox',`0 0 ${width} ${rowHeight*4}`);svg.setAttribute('aria-hidden','true');
  svg.innerHTML='<g class="run-links"></g>';chart.append(svg);
  let selectedButton=null;
  function selectTurn(actor,turn,reveal=false){
    selectedButton?.classList.remove('is-selected');selectedButton?.removeAttribute('aria-current');
    selectedButton=buttons.get(`${actor}-${turn}`);selectedButton.classList.add('is-selected');selectedButton.setAttribute('aria-current','true');
    for(const [key,button] of buttons)if(key.startsWith(`${actor}-`))button.tabIndex=button===selectedButton?0:-1;
    const events=lanes[actor][turn-1],ids=new Set(events.map(([id])=>id));
    summary.innerHTML=turnContent(actor,turn);
    const related=connections.filter(({to,id})=>ids.has(id)||(to.actor===actor&&to.turn===turn));
    legend.hidden=!related.length;
    const routes=related.map(({from,to,shared})=>{
      const direction=Math.sign(to.y-from.y)||1,sx=from.x,tx=to.x,sy=from.y+direction*9,ty=to.y-direction*10,mid=(sy+ty)/2;
      return `<g class="run-edge active" data-agent="${from.actor}"><path ${shared?'':'stroke-dasharray="3 3"'} d="M${sx} ${sy}C${sx} ${mid} ${tx} ${mid} ${tx} ${ty}"/><path d="M${tx-3} ${ty-direction*5}l3 ${direction*5}l3 ${-direction*5}"/></g>`;
    }).join('');
    svg.innerHTML=`<g class="run-links">${routes}</g>`;
    if(reveal){const x=(turn-1)*step; if(x<scroller.scrollLeft||x+step>scroller.scrollLeft+scroller.clientWidth-64)scroller.scrollLeft=Math.max(0,x-scroller.clientWidth*.4);}
  }
  figure.closest('.trajectory-viewer').addEventListener('trajectory-event',event=>{
    const found=positions.get(event.detail);if(found)selectTurn(found.actor,found.turn,true);
  });
  scroller.addEventListener('scroll',hideTip,{passive:true});
  figure.closest('.trajectory-viewer').addEventListener('trajectory-case-change',hideTip);
  selectTurn(actors[0],1);figure.hidden=false;
})();
