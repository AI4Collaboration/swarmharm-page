(() => {
  const root=document.querySelector('.trajectory-viewer'),cases=window.SWARMHARM_CASES?.concat(window.SWARMHARM_ARCHIVED_CASES||[]);
  if(!root||!cases?.length)return;
  const disclosure=root.querySelector('[data-trajectory-disclosure]');
  const select=root.querySelector('[data-case-select]'),intro=root.querySelector('[data-case-intro]');
  const review=root.querySelector('[data-case-review]'),full=root.querySelector('[data-case-full]');
  const cache=new Map();let version=0,dispose=null,request=null;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons={
    Agents:'<circle cx="8" cy="7" r="2.5"/><circle cx="24" cy="7" r="2.5"/><circle cx="8" cy="23" r="2.5"/><circle cx="24" cy="23" r="2.5"/><path d="M3 15v-2a5 5 0 0 1 10 0v2m6 0v-2a5 5 0 0 1 10 0v2M3 31v-2a5 5 0 0 1 10 0v2m6 0v-2a5 5 0 0 1 10 0v2"/>',
    Harness:'<rect x="3" y="5" width="26" height="22" rx="4"/><path d="m8 12 4 4-4 4m9 0h7"/>',
    Reasoning:'<rect x="4" y="21" width="5" height="7" rx="1"/><rect x="13" y="14" width="5" height="14" rx="1"/><rect x="22" y="5" width="5" height="23" rx="1"/>',
    Feedback:'<rect x="3" y="5" width="26" height="20" rx="4"/><path d="m9 25-3 5v-5m3-13h14M9 18h9"/>'
  };
  // Keep recorded goal settings in source data and downloads, outside the presentation.
  const visibleSettings=rows=>(rows||[]).filter(([key])=>!/^goal\b/i.test(key));
  function settingsMarkup(item){
    const settings=visibleSettings(item.settings).map(row=>[...row]);
    const reasoning=item.parameters?.find(([key])=>key==='Reasoning effort');
    if(reasoning&&!settings.some(([key])=>key==='Reasoning')){
      const value=reasoning[1];settings.splice(3,0,['Reasoning',value.charAt(0).toUpperCase()+value.slice(1)]);
    }
    return `<dl class="case-settings" style="--settings-count:${settings.length}" aria-label="Recorded experiment settings">${settings.map(([key,value])=>`<div class="case-setting" data-setting="${escape(key.toLowerCase())}" data-value="${escape(value.toLowerCase())}"><span class="case-setting-icon" aria-hidden="true"><svg viewBox="0 0 32 34">${icons[key]||icons.Feedback}</svg></span><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;
  }
  function outcomeMarkup(item){
    const visual=item.outcomeVisual;
    if(!visual)return `<div class="case-result" data-result="${item.phase===1?'formation':'impact'}"><span class="case-result-label">Outcome</span><p>${escape(item.outcome)}</p></div>`;
    return `<div class="case-result" data-result="${item.phase===1?'formation':'impact'}"><span class="case-result-label">Outcome</span><p>${escape(visual.action)}</p><dl class="case-result-metrics">${visual.metrics.map(m=>`<div data-tone="${escape(m.tone)}"><dt>${escape(m.label)}</dt><dd>${escape(m.value)}</dd></div>`).join('')}</dl>${visual.note?`<small class="case-result-note">${escape(visual.note)}</small>`:''}</div>`;
  }
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
    intro.innerHTML=`<div class="case-setup"><p class="case-meta">${escape(item.mode)} · ${escape(item.model)} · ${escape(item.id)}</p><p class="case-context">${escape(item.context)}</p>${item.settings?settingsMarkup(item):''}</div>${outcomeMarkup(item)}`;
    if(item.variants)intro.insertAdjacentHTML('afterbegin',`<div class="case-variants" role="group" aria-label="Composition model cases">${item.variants.map(key=>{const c=cases.find(c=>c.key===key);return `<button type="button" data-case-variant="${escape(key)}" aria-pressed="${key===item.key}">${c.id==='r263'?'Haiku 5.5':'Sol 5.6'} · ${escape(c.id)}</button>`;}).join('')}</div>`);
    if(item.composition){
      const p=item.composition;
      intro.insertAdjacentHTML('beforeend',`<div class="composition-proof" aria-label="Full-sequence counterfactual replay"><div><small>Each agent alone</small><strong>${escape(p.alone)}</strong><small>${escape(p.aloneDetail)}</small></div><span aria-hidden="true">→</span><div class="combined"><small>The same actions combined</small><strong>${escape(p.combined)}</strong><small>${escape(p.combinedDetail)}</small></div></div>`);
    }
    const parameters=visibleSettings(item.parameters);
    intro.insertAdjacentHTML('beforeend',`<details class="case-evidence"><summary><span>${item.settings?'Settings & evidence':'Evidence'}</span><span class="case-evidence-action"><span class="when-closed">View details</span><span class="when-open">Hide details</span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg></span></summary><p class="case-scope">${escape(item.scope)}</p>${parameters.length?`<dl class="case-parameters">${parameters.map(([key,value])=>`<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`:''}<ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>${item.full?`<a href="${escape(item.trajectory)}" download>Download trajectory (JSON)</a>`:''}${item.review?`<p><a href="${escape(item.review)}" download>Download independent review</a></p>`:item.composition?'<p><a href="static/data/composition-review.json" download>Download replay evidence</a></p>':''}<p>Original rollout: <code>${escape(item.runId)}</code></p></details>`);
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
    if(disclosure)disclosure.open=true;
    const loading=show(link.dataset.showPhase?`${link.dataset.showCase}-phase${link.dataset.showPhase}`:link.dataset.showCase),clickedVersion=version;
    await loading;
    if(clickedVersion!==version)return;
    const url=new URL(location.href);url.hash='trajectory';history.replaceState(null,'',url);
    root.scrollIntoView({block:'start',behavior:'instant'});
  }));
  const params=new URL(location.href).searchParams;
  if(params.has('case')&&disclosure)disclosure.open=true;
  show(params.get('phase')?`${params.get('case')}-phase${params.get('phase')}`:params.get('case'));
})();
