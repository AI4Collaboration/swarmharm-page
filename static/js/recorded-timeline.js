(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  // Preserve exact substrings, while separating paths and opaque identifiers visually.
  function source(value){
    const text=String(value??''),pattern=/(?:\/[\w.-]+){2,}|\b[a-f0-9]{20,64}\b|\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-[\w-]*\d[\w-]*\b|\b\d{6,}\b/g;
    let out='',cursor=0;for(const m of text.matchAll(pattern)){out+=esc(text.slice(cursor,m.index))+`<code class="traj-token is-id">${esc(m[0])}</code>`;cursor=m.index+m[0].length;}
    return out+esc(text.slice(cursor));
  }
  const avatar=a=>`<span class="traj-avatar" data-agent="${a}" aria-hidden="true"><span class="traj-avatar-crop"><img src="static/images/fieldguide/swarm-agent-${a.toLowerCase()}.svg?v=2" width="230" height="310" alt=""></span><span class="traj-avatar-letter">${a}</span></span>`;
  window.mountRecordedTimeline=(container,data,meta)=>{
    const controller=new AbortController(),signal=controller.signal,on=(el,type,fn,options={})=>el.addEventListener(type,fn,{...options,signal});
    const events=new Map(data.events.map(e=>[e.id,e])),messages=new Map(data.messages.map(m=>[m.id,m]));
    const names=new Map(data.actors.map(a=>[a.id,a.name]));
    const failed=e=>Number(e.status)>=400||e.exitCode!=null&&e.exitCode!==0;
    let mode='key',actor='',selected=null,hideTimer,hoverButton=null,keyboard=false;
    const longest=Math.max(...Object.values(data.turns).map(ts=>ts.length)),step=19;
    container.innerHTML=`<div class="record-controls"><div class="record-modes" role="group" aria-label="Timeline events"><button type="button" data-record-mode="key" aria-pressed="true">Key events</button><button type="button" data-record-mode="message" aria-pressed="false">Messages</button><button type="button" data-record-mode="all" aria-pressed="false">All actions</button></div><select data-record-agent aria-label="Filter timeline by agent"><option value="">All agents</option>${data.actors.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div><p class="record-counts">${data.counts.messages} authored messages & comments · ${data.counts.firstReads} verified first reads</p><div class="record-timeline" tabindex="0" role="region" aria-label="Recorded events in chronological order"></div><section class="record-detail" id="record-original" data-record-detail aria-label="Selected event original record" hidden></section><figure class="record-run"><figcaption><strong>${data.counts.turns} model turns</strong><span>across four agents</span></figcaption><div class="record-dot-key"><span data-kind="message"><i></i>Message or comment</span><span data-kind="read"><i></i>Message read</span><span data-kind="important"><i></i>Key action</span></div><div class="record-run-scroll" tabindex="0" role="region" aria-label="Every model turn, scroll horizontally"><div class="record-grid" style="--record-width:${longest*step}px;--record-turns:${longest}"><div class="record-axis">${[...new Set([1,...Array.from({length:Math.floor(longest/10)},(_,i)=>(i+1)*10),longest])].map(n=>`<span style="left:${(n-.5)*step}px">${n}</span>`).join('')}</div>${data.actors.map((a,i)=>`<span class="record-actor" data-agent="${a.id}" style="grid-row:${i+2}"><b>${esc(a.name)}</b><small>${data.turns[a.id].length} turns</small></span><div class="record-lane" style="grid-row:${i+2}" role="group" aria-label="${esc(a.name)} turns">${data.turns[a.id].map((ids,j)=>{const es=ids.map(id=>events.get(id)),kind=es.some(e=>e.messages.length)?'message':es.some(e=>e.reads.length)?'read':es.some(e=>e.important)?'important':'ordinary';return `<button type="button" class="record-turn" data-agent="${a.id}" data-turn="${j+1}" data-kind="${kind}" tabindex="${j===0?'0':'-1'}" aria-label="${esc(a.name)}, turn ${j+1}: ${esc([...new Set(es.map(e=>e.label))].join('; ')||'No tool call')}"><i aria-hidden="true"></i></button>`;}).join('')}</div>`).join('')}</div></div><div class="record-turn-summary" aria-live="polite"></div></figure>`;
    const list=container.querySelector('.record-timeline'),detail=container.querySelector('[data-record-detail]'),summary=container.querySelector('.record-turn-summary'),scroller=container.querySelector('.record-run-scroll');
    const tip=document.createElement('div');tip.className='run-hover';tip.id='record-turn-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
    function readers(m){return m.reads.length?`<div class="record-readers"><span>Read by</span>${m.reads.map(r=>`<button type="button" data-receipt="${r.event}" data-message="${m.id}" data-agent="${r.actor}" aria-label="${esc(names.get(r.actor))} read this at turn ${r.turn}">${r.actor}<small>t${r.turn}</small></button>`).join('')}</div>`:'<p class="record-unread">No verified cross-agent read</p>';}
    function row(e){
      const ms=e.messages.map(id=>messages.get(id)),isRead=!ms.length&&e.reads.length;
      const kind=ms.length?ms.map(m=>m.kind).filter((x,i,a)=>a.indexOf(x)===i).join(' / '):isRead?'Read':'Action';
      const preview=(ms.length?ms.map(m=>`<div class="record-message"><p>${source(m.body.length>260?m.body.slice(0,260)+'…':m.body)}</p>${readers(m)}<button type="button" class="record-original-link" data-open-event="${e.id}" aria-controls="record-original" aria-expanded="false">Original message</button></div>`).join(''):isRead?`<p class="record-action-copy">Reads ${[...new Set(e.reads.map(id=>messages.get(id).actor))].map(a=>esc(names.get(a))).join(', ')}’s messages.</p>`:'')+(failed(e)?'<p class="record-failed">Request failed</p>':'');
      const title=ms[0]?.kind==='Shared-file note'?'Writes a shared source note':ms[0]?.kind==='Version comment'?'Files a section with a version comment':e.label;
      return `<article class="record-event ${ms.length?'has-message':''}" data-event="${e.id}" data-agent="${e.actor}"><div class="record-who">${avatar(e.actor)}<span>${esc(names.get(e.actor))}</span><small>Turn ${e.turn}</small></div><div class="record-content"><button type="button" class="record-open" data-open-event="${e.id}" aria-controls="record-original" aria-expanded="false"><span class="record-type">${esc(kind)}</span><strong>${esc(title)}</strong><time>${esc(e.time)}</time></button>${preview}</div></article>`;
    }
    function render(){
      const visible=data.events.filter(e=>(!actor||e.actor===actor)&&(mode==='all'||mode==='message'?mode==='all'||e.messages.length:e.important||e.messages.length));
      list.innerHTML=visible.map(row).join('')+`<article class="record-outcome"><strong>Outcome</strong><p>${esc(meta.outcome)}</p></article>`;
      list.scrollTop=0;container.querySelectorAll('[data-record-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.recordMode===mode)));
    }
    function argumentsMarkup(args){return Object.entries(args).map(([k,v])=>`<div><dt><code>${esc(k)}</code></dt><dd>${typeof v==='string'?(k==='command'?`<pre><code>${esc(v)}</code></pre>`:source(v)):typeof v==='object'?`<pre><code>${esc(JSON.stringify(v,null,2))}</code></pre>`:`<code>${esc(v)}</code>`}</dd></div>`).join('');}
    function messageMarkup(m,read=false){return `<section class="record-original-message"><p class="record-message-meta">${esc(names.get(m.actor))} · ${esc(m.kind)} · ${esc(m.time)}${read?' · Read in this event':''}</p><blockquote>${source(m.body)}</blockquote>${readers(m)}</section>`;}
    function eventMarkup(e,requestedMessage){
      const original=e.messages.map(id=>messageMarkup(messages.get(id))).join('');
      const read=e.reads.filter(id=>!requestedMessage||requestedMessage===id).map(id=>messageMarkup(messages.get(id),true)).join('');
      return `<section class="record-source-event"><h5>${esc(names.get(e.actor))} · Turn ${e.turn} · ${esc(e.label)}</h5>${original}${read}${e.resultText?`<div class="record-final">${source(e.resultText)}</div>`:''}${e.operation==='final_output'?'':`<details class="record-tool"><summary><code>${esc(e.operation)}</code><span>Tool arguments${e.status!=null?' · status '+e.status:''}</span></summary><dl>${argumentsMarkup(e.arguments)}</dl>${e.error?`<p>${source(typeof e.error==='string'?e.error:JSON.stringify(e.error))}</p>`:''}</details>`}</section>`;
    }
    function openEvents(ids,requestedMessage,scroll=true){
      hideTip();detail.id='record-original';detail.hidden=false;
      detail.innerHTML=`<header><h4>Original record</h4><button type="button" data-close-record aria-label="Close original record">×</button></header>${ids.length?ids.map(id=>eventMarkup(events.get(id),requestedMessage)).join(''):'<p>No tool call was recorded in this model turn.</p>'}`;
      container.querySelectorAll('[data-open-event]').forEach(b=>b.setAttribute('aria-expanded',String(ids.includes(Number(b.dataset.openEvent)))));
      if(scroll)detail.scrollIntoView({block:'nearest',behavior:'auto'});
    }
    function turnSummary(a,n){
      const ids=data.turns[a][n-1],counts=new Map();ids.forEach(id=>{const e=events.get(id);const text=e.messages.length?e.messages.map(id=>messages.get(id).body).join(' '):e.reads.length?'Reads messages from '+[...new Set(e.reads.map(id=>names.get(messages.get(id).actor)))].join(', '):e.label+(failed(e)?' (request failed)':'');counts.set(text,(counts.get(text)||0)+1);});
      return `<strong>${esc(names.get(a))} · Turn ${n}</strong>${counts.size?`<ul>${[...counts].map(([text,count])=>`<li>${count>1?count+' × ':''}${source(text.length>260?text.slice(0,260)+'…':text)}</li>`).join('')}</ul>`:'<p>No tool call was recorded in this model turn.</p>'}`;
    }
    function selectTurn(a,n){
      selected?.classList.remove('is-selected');selected?.removeAttribute('aria-current');
      selected=container.querySelector(`.record-turn[data-agent="${a}"][data-turn="${n}"]`);selected.classList.add('is-selected');selected.setAttribute('aria-current','true');
      container.querySelectorAll(`.record-turn[data-agent="${a}"]`).forEach(b=>b.tabIndex=b===selected?0:-1);
      summary.innerHTML=turnSummary(a,n);
    }
    function hideTip(){clearTimeout(hideTimer);tip.hidden=true;hoverButton?.removeAttribute('aria-describedby');hoverButton=null;}
    function deferHide(){clearTimeout(hideTimer);hideTimer=setTimeout(hideTip,100);}
    function showTip(b){
      clearTimeout(hideTimer);hoverButton?.removeAttribute('aria-describedby');hoverButton=b;tip.innerHTML=turnSummary(b.dataset.agent,Number(b.dataset.turn));tip.hidden=false;b.setAttribute('aria-describedby',tip.id);
      const box=b.getBoundingClientRect(),size=tip.getBoundingClientRect(),above=box.top+box.height/2-size.height-16;
      tip.style.left=Math.max(12,Math.min(innerWidth-size.width-12,box.left+box.width/2-size.width/2))+'px';
      tip.style.top=Math.max(12,Math.min(innerHeight-size.height-12,above>=12?above:box.top+box.height/2+16))+'px';
    }
    on(container,'click',event=>{
      const b=event.target.closest('button');if(!b)return;
      if(b.dataset.recordMode){mode=b.dataset.recordMode;render();}
      else if(b.dataset.receipt){const e=events.get(Number(b.dataset.receipt));selectTurn(e.actor,e.turn);openEvents([e.id],b.dataset.message);}
      else if(b.dataset.openEvent){const e=events.get(Number(b.dataset.openEvent));selectTurn(e.actor,e.turn);openEvents([e.id]);}
      else if(b.matches('.record-turn')){const a=b.dataset.agent,n=Number(b.dataset.turn);selectTurn(a,n);openEvents(data.turns[a][n-1]);}
      else if(b.hasAttribute('data-close-record')){detail.hidden=true;container.querySelectorAll('[data-open-event]').forEach(b=>b.setAttribute('aria-expanded','false'));}
    });
    on(container.querySelector('[data-record-agent]'),'change',event=>{actor=event.target.value;render();});
    container.querySelectorAll('.record-turn').forEach(b=>{
      on(b,'pointerenter',e=>{if(e.pointerType==='mouse')showTip(b);});on(b,'pointerleave',deferHide);
      on(b,'focus',()=>{if(keyboard)showTip(b);});on(b,'blur',deferHide);
      on(b,'keydown',e=>{const a=b.dataset.agent,n=Number(b.dataset.turn),next={ArrowRight:n+1,ArrowLeft:n-1,Home:1,End:data.turns[a].length}[e.key];if(next===undefined)return;e.preventDefault();const target=Math.max(1,Math.min(data.turns[a].length,next));selectTurn(a,target);selected.focus({preventScroll:true});selected.scrollIntoView({block:'nearest',inline:'nearest'});});
    });
    on(document,'keydown',e=>{keyboard=true;if(e.key==='Escape'){hideTip();if(detail.contains(document.activeElement))detail.hidden=true;}});
    on(document,'pointerdown',e=>{keyboard=false;if(!tip.contains(e.target))hideTip();});
    on(tip,'pointerenter',()=>clearTimeout(hideTimer));on(tip,'pointerleave',deferHide);
    on(window,'scroll',hideTip,{passive:true});on(window,'resize',hideTip);on(scroller,'scroll',hideTip,{passive:true});
    render();selectTurn(data.actors[0].id,1);
    return ()=>{hideTip();controller.abort();tip.remove();container.replaceChildren();};
  };
})();
