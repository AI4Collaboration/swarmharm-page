(() => {
  const root=document.querySelector('.trajectory-viewer'),cases=window.SWARMHARM_CASES?.concat(window.SWARMHARM_ARCHIVED_CASES||[]);
  if(!root||!cases?.length)return;
  const select=root.querySelector('[data-case-select]'),intro=root.querySelector('[data-case-intro]');
  const review=root.querySelector('[data-case-review]'),full=root.querySelector('[data-case-full]');
  const cache=new Map();let version=0,dispose=null,request=null;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(const mode of ['Phase 1: Swarm Formation','Phase 2: Collective Misalignment']){
    const group=document.createElement('optgroup');group.label=mode;
    cases.filter(c=>c.mode===mode&&!c.replication&&!c.archived).forEach(c=>{const option=document.createElement('option');option.value=c.key;option.textContent=`${c.claim} · ${c.domain} · ${c.selectorCases||c.id}`;group.append(option);});
    select.append(group);
  }
  async function show(id){
    const item=cases.find(c=>c.key===id)||cases.find(c=>c.id===id&&c.phase===2)||cases.find(c=>c.id===id)||cases[0];
    select.querySelector('[data-archived-option]')?.remove();
    if(item.archived){const option=document.createElement('option');option.dataset.archivedOption='';option.value=item.key;option.textContent=`Earlier case · ${item.domain} · ${item.id}`;select.append(option);}
    select.value=item.selectionKey||item.key;
    const current=++version;request?.abort();dispose?.();dispose=null;full.replaceChildren();
    root.dispatchEvent(new CustomEvent('trajectory-case-change',{detail:item.id}));
    root.dataset.caseMode=item.full?'full':'review';full.hidden=!item.full;review.hidden=item.full;
    intro.innerHTML=`<p class="case-meta">${escape(item.mode)} · ${escape(item.model)} · ${escape(item.id)}</p><p class="case-context">${escape(item.context)}</p><p class="case-outcome" ${item.mode==='Phase 1: Swarm Formation'?'data-formation="true"':''}><strong>Outcome</strong> ${escape(item.outcome)}</p>`;
    if(item.settings)intro.insertAdjacentHTML('beforeend',`<dl class="case-settings" aria-label="Recorded experiment settings">${item.settings.map(([key,value])=>`<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`);
    if(item.variants)intro.insertAdjacentHTML('afterbegin',`<div class="case-variants" role="group" aria-label="Composition model cases">${item.variants.map(key=>{const c=cases.find(c=>c.key===key);return `<button type="button" data-case-variant="${escape(key)}" aria-pressed="${key===item.key}">${c.id==='r263'?'Haiku 5.5':'Sol 5.6'} · ${escape(c.id)}</button>`;}).join('')}</div>`);
    if(item.composition){
      const p=item.composition;
      intro.insertAdjacentHTML('beforeend',`<div class="composition-proof" aria-label="Full-sequence counterfactual replay"><div><small>Each agent alone</small><strong>${escape(p.alone)}</strong><small>${escape(p.aloneDetail)}</small></div><span aria-hidden="true">→</span><div class="combined"><small>The same actions combined</small><strong>${escape(p.combined)}</strong><small>${escape(p.combinedDetail)}</small></div></div>`);
    }
    intro.insertAdjacentHTML('beforeend',`<details class="case-evidence"><summary>${item.settings?'Settings & evidence':'Evidence'}</summary><p class="case-scope">${escape(item.scope)}</p>${item.parameters?`<dl class="case-parameters">${item.parameters.map(([key,value])=>`<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`:''}<ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>${item.full?`<a href="${escape(item.trajectory)}" download>Download trajectory (JSON)</a>`:''}${item.review?`<p><a href="${escape(item.review)}" download>Download independent review</a></p>`:item.composition?'<p><a href="static/data/composition-review.json" download>Download replay evidence</a></p>':''}<p>Original rollout: <code>${escape(item.runId)}</code></p></details>`);
    if(!item.full){
      review.innerHTML=`<h4>Reviewed sequence</h4><ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol><p class="case-scope">${escape(item.scope)}</p><p class="case-pending">Full messages and per-turn records are not yet available here.</p>`;
    }
    // A shareable case selection, without scrolling or replaying the title.
    const url=new URL(location.href);url.searchParams.set('case',item.id);url.searchParams.set('phase',String(item.phase));
    history.replaceState(null,'',url);
    if(!item.full){root.removeAttribute('aria-busy');return;}
    root.setAttribute('aria-busy','true');full.innerHTML='<p class="record-loading" role="status">Loading recorded events…</p>';
    try {
      let data=cache.get(item.key);
      if(!data){
        request=new AbortController();const response=await fetch(item.trajectory,{signal:request.signal});
        if(!response.ok)throw new Error('Could not load recorded events');
        data=await response.json();
        if(data.id!==item.id||!Array.isArray(data.events)||!Array.isArray(data.messages)||!data.turns)throw new Error('Invalid trajectory');
        cache.set(item.key,data);
      }
      if(current!==version)return;
      dispose=window.mountRecordedTimeline(full,data,item);
    }catch(error){
      if(current!==version||error.name==='AbortError')return;
      full.innerHTML='<p class="record-loading" role="status">The trajectory could not be loaded.</p><button type="button" class="record-retry">Try again</button>';
      full.querySelector('button').addEventListener('click',()=>show(item.key),{once:true});
    }finally{if(current===version)root.removeAttribute('aria-busy');}
  }
  select.addEventListener('change',()=>show(select.value));
  intro.addEventListener('click',event=>{const button=event.target.closest('[data-case-variant]');if(button)show(button.dataset.caseVariant);});
  document.querySelectorAll('[data-show-case]').forEach(link=>link.addEventListener('click',async event=>{
    event.preventDefault();
    const loading=show(link.dataset.showPhase?`${link.dataset.showCase}-phase${link.dataset.showPhase}`:link.dataset.showCase),clickedVersion=version;
    await loading;
    if(clickedVersion!==version)return;
    const url=new URL(location.href);url.hash='trajectory';history.replaceState(null,'',url);
    root.scrollIntoView({block:'start',behavior:'instant'});
  }));
  const params=new URL(location.href).searchParams;
  show(params.get('phase')?`${params.get('case')}-phase${params.get('phase')}`:params.get('case'));
})();
