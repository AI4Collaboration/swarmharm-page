(() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const symbols={search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',message:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',read:'<path d="M14 2H6v20h13V7ZM14 2v6h5M8 14l3 3 5-6"/>',action:'<path d="m5 12 4 4L19 6"/>',outcome:'<path d="m12 3 10 18H2ZM12 9v5m0 3v1"/>'};
  const icon=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true">${symbols[kind]}</svg>`;
  window.mountRecordedAgentMap=(host,data,meta,open)=>{
    const controller=new AbortController(),signal=controller.signal,on=(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal});
    const events=new Map(data.events.map(e=>[e.id,e])),messages=new Map(data.messages.map(m=>[m.id,m]));
    const first=new Set(data.actors.map(a=>data.events.find(e=>e.actor===a.id)?.id));
    // Preserve the original r19 coordinate view; the complete record remains below.
    const shownMessages=data.id==='r19'?data.messages.filter(m=>m.kind==='Shared-file note'):data.messages;
    const ids=new Set(first);
    if(data.id==='r19')[22,105,241,249,250,253].forEach(id=>ids.add(id));
    else data.events.filter(e=>e.important&&!first.has(e.id)).forEach(e=>ids.add(e.id));
    shownMessages.forEach(m=>{ids.add(m.event);m.reads.forEach(r=>ids.add(r.event));});
    const readIds=new Set(shownMessages.flatMap(m=>m.reads.map(r=>r.event)));
    const nodes=[...ids].sort((a,b)=>a-b).map(id=>{
      const e=events.get(id),kind=e.messages.length?'message':readIds.has(id)?'read':first.has(id)?'search':'action';
      return {...e,kind,stage:first.has(id)?'explore':kind==='message'||kind==='read'?'communication':'actions',label:kind==='message'?(messages.get(e.messages[0]).kind==='Version comment'?'Comment':'Note'):kind==='read'?'Read':kind==='search'?'Explore':data.id==='r19'&&id>=241?'Upgrade':data.id==='r19'&&id===105?'Full archive':data.id==='r19'&&id===22?'Search':e.label.replace(/^(Read|Check|Request|Prepare|Execute|Run|Import|Approve|Publish|File|Confirm|Select|Acknowledge|Apply|Calculate) .*/, '$1')};
    });
    nodes.push({id:'outcome',actor:null,kind:'outcome',stage:'outcome',label:'Outcome',messages:[],reads:[]});
    let column=0;nodes.forEach(n=>n.column=first.has(n.id)?0:++column);
    const byId=new Map(nodes.map(n=>[n.id,n])),lanes=['A','B','channel','C','D'];
    const names=new Map(data.actors.map(a=>[a.id,a.name]));
    let selected=null, layoutKey=null, layoutFrame=0, forceLayout=false;
    let edgeElements=[];
    host.innerHTML=`<nav class="traj-chapters" aria-label="Trajectory stages">${[['explore','Explore'],['communication','Communication'],['actions','Actions'],['outcome','Outcome']].map(([key,label])=>`<button type="button" data-map-stage="${key}">${label}</button>`).join('')}</nav><div class="traj-reading-guide"><span class="traj-time-direction"><span class="traj-hint-desktop">Time →</span><span class="traj-hint-mobile">Time ↓</span></span></div><div class="traj-map-scroll" tabindex="0" role="region" aria-label="Agent coordinate map, events in recorded order"><div class="traj-map"><svg class="traj-map-lines" aria-hidden="true"></svg><div class="traj-lane-heads">${lanes.map(a=>`<div class="traj-lane-label" data-lane="${a}" data-agent="${a}">${a==='channel'?`<span class="traj-lane-copy">${shownMessages.some(m=>m.kind==='Shared-file note')?'Shared files<small>Side channel</small>':'Discussion'}</span>`:`<span class="traj-avatar" aria-hidden="true"><span class="traj-avatar-crop"><img src="static/images/fieldguide/swarm-agent-${a.toLowerCase()}.svg?v=2" alt="" width="230" height="310"></span><span class="traj-avatar-letter">${a}</span></span><span>${esc(names.get(a))}</span>`}</div>`).join('')}</div>${nodes.map((n,i)=>`<button type="button" class="traj-node is-${n.kind}" data-map-node="${i}" data-agent="${n.actor||''}" aria-label="${esc(n.actor?names.get(n.actor)+', turn '+n.turn+': '+n.label:meta.outcome)}" aria-controls="record-original"><span class="traj-node-shape">${icon(n.kind)}</span><span class="traj-node-label">${esc(n.label)}</span></button>`).join('')}</div></div><div class="coordinate-summary" aria-live="polite"></div>`;
    const map=host.querySelector('.traj-map'),scroll=host.querySelector('.traj-map-scroll'),plot=host.querySelector('.traj-map-lines'),summary=host.querySelector('.coordinate-summary');
    const narrow=()=>innerWidth<=800;
    const nodeButtons=[...host.querySelectorAll('[data-map-node]')];
    const buttons=new Map(nodes.map((n,i)=>[n,nodeButtons[i]]));
    const chapters=[...host.querySelectorAll('[data-map-stage]')];
    const laneLabels=lanes.map(a=>host.querySelector(`[data-lane="${a}"]`));
    const nodeLabels=[...host.querySelectorAll('.traj-node-label')];
    const button=n=>buttons.get(n);
    function text(n){
      if(n.kind==='outcome')return `<strong>Outcome</strong><p>${esc(meta.outcome)}</p>`;
      const ms=(n.messages.length?n.messages:n.reads).map(id=>messages.get(id)).filter(Boolean);
      const excerpt=ms.slice(0,2).map(m=>`<p>${esc(m.body.length>180?m.body.slice(0,180)+'…':m.body)}</p>${n.kind==='message'?`<small>${m.reads.length?'Read by '+m.reads.map(r=>names.get(r.actor)).join(', '):'No verified cross-agent read'}</small>`:''}`).join('');
      return `<strong>${esc(names.get(n.actor))} · Turn ${n.turn} · ${esc(n.label)}</strong>${excerpt||`<p>${esc(events.get(n.id).label)}</p>`}`;
    }
    function select(n){
      if (selected===n) return;
      if (selected) button(selected).classList.remove('is-selected');
      const stageChanged=selected?.stage!==n.stage;
      selected=n;button(n).classList.add('is-selected');
      if (stageChanged) chapters.forEach(b=>{if(b.dataset.mapStage===n.stage)b.setAttribute('aria-current','step');else if(b.hasAttribute('aria-current'))b.removeAttribute('aria-current');});
      summary.innerHTML=text(n);
      edgeElements.forEach(edge=>{
        const active=edge.dataset.from===String(n.id)||edge.dataset.to===String(n.id);
        if(edge.classList.contains('is-active')!==active)edge.classList.toggle('is-active',active);
      });
    }
    function point(n,width){const lane=lanes.indexOf(n.actor||'channel');return narrow()?[width*(lane+.5)/5,100+n.column*70]:[136+n.column*76,60+lane*70];}
    function draw(force=false){
      const mobile=narrow(),key=`${mobile}:${scroll.clientWidth||innerWidth}`;
      if(!force && key===layoutKey)return;
      layoutKey=key;
      const height=mobile?170+column*70:394;
      map.style.minWidth=mobile?'0':`${200+column*76}px`;map.style.height=`${height}px`;
      const width=map.clientWidth|| (mobile?Math.max(250,innerWidth-48):200+column*76);plot.setAttribute('viewBox',`0 0 ${width} ${height}`);
      let guides='';lanes.forEach((a,i)=>{const p=mobile?width*(i+.5)/5:60+i*70;guides+=`<path class="traj-lane-line ${a==='channel'?'is-files':''}" d="${mobile?`M${p} 76V${height-24}`:`M112 ${p}H${width-12}`}"/>`;const label=laneLabels[i];label.style.left=mobile?p+'px':'0';label.style.top=mobile?'0':p+'px';});
      nodes.forEach(n=>{const [x,y]=point(n,width),b=button(n);b.style.left=x+'px';b.style.top=y+'px';});
      let paths='';
      for(const m of shownMessages)for(const r of m.reads){
        const from=byId.get(m.event),to=byId.get(r.event);if(!from||!to)continue;
        const [x,y]=point(from,width),[ex,ey]=point(to,width),incoming=shownMessages.filter(v=>v.reads.some(rr=>rr.event===r.event)),port=(incoming.indexOf(m)-(incoming.length-1)/2)*Math.min(5,14/Math.max(1,incoming.length-1));
        const sx=mobile?x:x+18,sy=mobile?y+18:y,tx=mobile?ex+port:ex-20,ty=mobile?ey-20:ey+port;
        const handle=Math.min(80,Math.max(14,(mobile?ty-sy:tx-sx)*.45));
        const d=mobile?`M${sx} ${sy}C${sx} ${sy+handle} ${tx} ${ty-handle} ${tx} ${ty}`:`M${sx} ${sy}C${sx+handle} ${sy} ${tx-handle} ${ty} ${tx} ${ty}`;
        const arrow=mobile?`M${tx-3} ${ty-5}L${tx} ${ty}L${tx+3} ${ty-5}`:`M${tx-5} ${ty-3}L${tx} ${ty}L${tx-5} ${ty+3}`;
        paths+=`<g class="traj-message-route ${selected===from||selected===to?'is-active':''}" data-agent="${from.actor}" data-map-edge="${m.id}:${r.event}" data-from="${from.id}" data-to="${to.id}"><path d="${d}"/><path d="${arrow}"/></g>`;
      }
      const origin=map.getBoundingClientRect();const masks=nodeLabels.map(el=>{const r=el.getBoundingClientRect();return `<rect x="${r.left-origin.left-5}" y="${r.top-origin.top-4}" width="${r.width+10}" height="${r.height+8}" fill="#000" stroke="none"/>`;}).join('');
      plot.innerHTML=`<defs><mask id="coordinate-label-clearance" maskUnits="userSpaceOnUse" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#fff" stroke="none"/>${masks}</mask></defs>${guides}<g mask="url(#coordinate-label-clearance)">${paths}</g>`;
      edgeElements=[...plot.querySelectorAll('[data-map-edge]')];
    }
    function reveal(n){const b=button(n);if(narrow())scroll.scrollTop=Math.max(0,parseFloat(b.style.top)-150);else scroll.scrollLeft=Math.max(0,parseFloat(b.style.left)-scroll.clientWidth*.45);}
    host.querySelectorAll('[data-map-node]').forEach((b,i)=>{
      on(b,'pointerenter',e=>{if(e.pointerType==='mouse'){select(nodes[i]);}});
      on(b,'focus',()=>select(nodes[i]));
      on(b,'click',()=>{select(nodes[i]);open(nodes[i].kind==='outcome'?null:[nodes[i].id]);});
      on(b,'keydown',e=>{const n={ArrowRight:i+1,ArrowDown:i+1,ArrowLeft:i-1,ArrowUp:i-1,Home:0,End:nodes.length-1}[e.key];if(n===undefined)return;e.preventDefault();const next=nodes[Math.max(0,Math.min(nodes.length-1,n))];select(next);reveal(next);button(next).focus({preventScroll:true});});
    });
    host.querySelectorAll('[data-map-stage]').forEach(b=>on(b,'click',()=>{const n=nodes.find(n=>n.stage===b.dataset.mapStage);if(n){select(n);reveal(n);}}));
    function scheduleDraw(force=false){
      forceLayout ||= force;
      if(layoutFrame)return;
      layoutFrame=requestAnimationFrame(()=>{
        layoutFrame=0;const refresh=forceLayout;forceLayout=false;draw(refresh);
      });
    }
    const observer=new ResizeObserver(()=>scheduleDraw());observer.observe(scroll);
    on(window,'resize',()=>scheduleDraw());draw();select(nodes[0]);
    if(document.fonts?.status==='loading')document.fonts.ready.then(()=>{if(!signal.aborted)scheduleDraw(true);});
    return ()=>{controller.abort();observer.disconnect();cancelAnimationFrame(layoutFrame);host.replaceChildren();};
  };
})();
