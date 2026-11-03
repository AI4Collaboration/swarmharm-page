(() => {
  const root=document.querySelector('.trajectory-viewer'),cases=window.SWARMHARM_CASES;
  if(!root||!cases?.length)return;
  const select=root.querySelector('[data-case-select]'),intro=root.querySelector('[data-case-intro]');
  const review=root.querySelector('[data-case-review]'),full=root.querySelector('[data-case-full]');
  const cache=new Map();let version=0,dispose=null,request=null;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(const mode of ['Phase 1: Swarm Formation','Phase 2: Collective Misalignment','Historical connected']){
    const group=document.createElement('optgroup');group.label=mode;
    cases.filter(c=>c.mode===mode).forEach(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=`${c.domain} · ${c.title}`;group.append(option);});
    select.append(group);
  }
  async function show(id){
    const item=cases.find(c=>c.id===id)||cases[0];select.value=item.id;
    const current=++version;request?.abort();dispose?.();dispose=null;full.replaceChildren();
    root.dispatchEvent(new CustomEvent('trajectory-case-change',{detail:item.id}));
    root.dataset.caseMode=item.full?'full':'review';full.hidden=!item.full;review.hidden=item.full;
    intro.innerHTML=`<p class="case-meta">${escape(item.mode)} · ${escape(item.model)} · ${escape(item.id)}</p><p class="case-context">${escape(item.context)}</p><p class="case-outcome" ${item.mode==='Phase 1: Swarm Formation'?'data-formation="true"':''}><strong>Outcome</strong> ${escape(item.outcome)}</p>`;
    if(item.composition){
      const p=item.composition;
      intro.insertAdjacentHTML('beforeend',`<div class="composition-proof" aria-label="Full-sequence counterfactual replay"><div><small>Each agent alone</small><strong>${escape(p.alone)}</strong><small>${escape(p.aloneDetail)}</small></div><span aria-hidden="true">→</span><div class="combined"><small>The same actions combined</small><strong>${escape(p.combined)}</strong><small>${escape(p.combinedDetail)}</small></div></div>`);
    }
    intro.insertAdjacentHTML('beforeend',`<details class="case-evidence"><summary>Reviewed sequence & evidence</summary><p class="case-scope">${escape(item.scope)}</p><ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>${item.full?`<a href="${escape(item.trajectory)}" download>Download this trajectory (JSON)</a>`:''}${item.composition?'<p><a href="static/data/composition-review.json" download>Download the solo / combined replay evidence</a></p>':''}<p>Original rollout: <code>${escape(item.runId)}</code></p></details>`);
    if(!item.full){
      review.innerHTML=`<h4>Reviewed sequence</h4><ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol><p class="case-scope">${escape(item.scope)}</p><p class="case-pending">Full messages and per-turn records are not yet available here.</p>`;
    }
    // A shareable case selection, without scrolling or replaying the title.
    const url=new URL(location.href);url.searchParams.set('case',item.id);
    history.replaceState(null,'',url);
    if(!item.full){root.removeAttribute('aria-busy');return;}
    root.setAttribute('aria-busy','true');full.innerHTML='<p class="record-loading" role="status">Loading recorded events…</p>';
    try {
      let data=cache.get(item.id);
      if(!data){
        request=new AbortController();const response=await fetch(item.trajectory,{signal:request.signal});
        if(!response.ok)throw new Error('Could not load recorded events');
        data=await response.json();
        if(data.id!==item.id||!Array.isArray(data.events)||!Array.isArray(data.messages)||!data.turns)throw new Error('Invalid trajectory');
        cache.set(item.id,data);
      }
      if(current!==version)return;
      dispose=window.mountRecordedTimeline(full,data,item);
    }catch(error){
      if(current!==version||error.name==='AbortError')return;
      full.innerHTML='<p class="record-loading" role="status">The trajectory could not be loaded.</p><button type="button" class="record-retry">Try again</button>';
      full.querySelector('button').addEventListener('click',()=>show(item.id),{once:true});
    }finally{if(current===version)root.removeAttribute('aria-busy');}
  }
  select.addEventListener('change',()=>show(select.value));
  document.querySelectorAll('[data-show-case]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();show(link.dataset.showCase);root.scrollIntoView({block:'start',behavior:'auto'});}));
  show(new URL(location.href).searchParams.get('case'));
})();
