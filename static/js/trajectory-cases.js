(() => {
  const root=document.querySelector('.trajectory-viewer'),cases=window.SWARMHARM_CASES?.concat(window.SWARMHARM_ARCHIVED_CASES||[]);
  if(!root||!cases?.length)return;
  const select=root.querySelector('[data-case-select]'),intro=root.querySelector('[data-case-intro]');
  const review=root.querySelector('[data-case-review]'),full=root.querySelector('[data-case-full]');
  const details=root.querySelector('[data-case-details]');
  const cache=new Map();let version=0,dispose=null,request=null;
  const loading=root.querySelector('[data-case-loading]');
  let renderedSearch,mountedKey;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const models={
    'gpt-6.1-sol':{name:'Sol 6.1',logo:'openai'},
    'gpt-5.6-sol':{name:'Sol 5.6',logo:'openai'},
    'claude-haiku-5.5':{name:'Haiku 5.5',logo:'claude'}
  };
  function modelLabel(id){
    const model=models[id];
    if(!model)return escape(id);
    return `<span class="model-tag"><img class="model-logo model-logo-${model.logo}" src="static/images/${model.logo}.svg?v=2" width="16" height="16" alt="">${model.name}</span>`;
  }
  const icons={
    Agents:'<circle cx="8" cy="7" r="2.5"/><circle cx="24" cy="7" r="2.5"/><circle cx="8" cy="23" r="2.5"/><circle cx="24" cy="23" r="2.5"/><path d="M3 15v-2a5 5 0 0 1 10 0v2m6 0v-2a5 5 0 0 1 10 0v2M3 31v-2a5 5 0 0 1 10 0v2m6 0v-2a5 5 0 0 1 10 0v2"/>',
    Harness:'<rect x="3" y="5" width="26" height="22" rx="4"/><path d="m8 12 4 4-4 4m9 0h7"/>',
    Feedback:'<rect x="3" y="5" width="26" height="20" rx="4"/><path d="m9 25-3 5v-5m3-13h14M9 18h9"/>'
  };
  // The page omits goal and reasoning settings from both the summary and the evidence panel.
  const visibleSettings = rows => (rows || []).filter(([key]) => !/^(?:goal|reasoning)\b/i.test(key));
  function settingsMarkup(item){
    const settings = visibleSettings(item.settings);
    if (!settings.length) return '';
    const fields = settings.map(([key, value]) => {
      return `<div class="case-setting" data-setting="${escape(key.toLowerCase())}" data-value="${escape(value.toLowerCase())}">
        <span class="case-setting-icon" aria-hidden="true"><svg viewBox="0 0 32 34">${icons[key] || icons.Feedback}</svg></span>
        <dt>${escape(key)}</dt><dd>${escape(value)}</dd>
      </div>`;
    });
    return `<dl class="case-settings" style="--settings-count:${settings.length}" aria-label="Recorded experiment settings">${fields.join('')}</dl>`;
  }
  function outcomeMarkup(item){
    const visual=item.outcomeVisual;
    if(!visual)return `<div class="case-result" data-result="${item.phase===1?'formation':'impact'}"><span class="case-result-label">Outcome</span><p>${escape(item.outcome)}</p></div>`;
    return `<div class="case-result" data-result="${item.phase===1?'formation':'impact'}"><span class="case-result-label">Outcome</span><p>${escape(visual.action)}</p><dl class="case-result-metrics">${visual.metrics.map(m=>`<div data-tone="${escape(m.tone)}"><dt>${escape(m.label)}</dt><dd>${escape(m.value)}</dd></div>`).join('')}</dl>${visual.note?`<small class="case-result-note">${escape(visual.note)}</small>`:''}</div>`;
  }
  for(const mode of ['Swarm Formation','Collective Misalignment','Earlier outcomes']){
    const group=document.createElement('optgroup');group.label=mode;
    cases.filter(c=>!c.replication&&!c.archived&&(c.earlier?'Earlier outcomes':c.mode)===mode).forEach(c=>{const option=document.createElement('option');option.value=c.key;option.textContent=`${c.claim} · ${c.domain}`;group.append(option);});
    select.append(group);
  }
  function renderSummary(item) {
    root.dataset.caseMode=item.full?'full':'review';full.hidden=!item.full;review.hidden=item.full;
    intro.innerHTML=`<div class="case-setup">${item.variants?'':`<p class="case-meta">${modelLabel(item.model)}</p>`}<p class="case-context">${escape(item.context)}</p>${item.settings?settingsMarkup(item):''}</div>`;
    details.innerHTML=item.composition?'':outcomeMarkup(item);
    if(item.variants)intro.insertAdjacentHTML('afterbegin',`<div class="case-variants" role="group" aria-label="Composition model cases">${item.variants.map(key=>{const c=cases.find(c=>c.key===key);return `<button type="button" data-case-variant="${escape(key)}" aria-pressed="${key===item.key}">${modelLabel(c.model)}</button>`;}).join('')}</div>`);
    if(item.composition){
      const p=item.composition;
      details.insertAdjacentHTML('beforeend',`<div class="composition-proof" aria-label="Full-sequence counterfactual replay"><div><small>Each agent alone</small><strong>${escape(p.alone)}</strong><small>${escape(p.aloneDetail)}</small></div><span aria-hidden="true">→</span><div class="combined"><small>The same actions combined</small><strong>${escape(p.combined)}</strong><small>${escape(p.combinedDetail)}</small></div></div>`);
    }
    const parameters=visibleSettings(item.parameters);
    details.insertAdjacentHTML('beforeend',`<details class="case-evidence"><summary><span>${item.settings?'Settings & evidence':'Evidence'}</span><span class="case-evidence-action"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 8 5 5 5-5"/></svg></span></summary><p class="case-scope">${escape(item.scope)}</p>${parameters.length?`<dl class="case-parameters">${parameters.map(([key,value])=>`<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`:''}<ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol>${item.full?`<a href="${escape(item.trajectory)}" download>Download trajectory (JSON)</a>`:''}${item.review?`<p><a href="${escape(item.review)}" download>${escape(item.reviewLabel || 'Download independent review')}</a></p>`:item.composition?'<p><a href="static/data/composition-review.json" download>Download replay evidence</a></p>':''}<p>Case: ${escape(item.id)}<br>Original rollout: <code>${escape(item.runId)}</code></p></details>`);
    if(!item.full){
      review.innerHTML=`<h4>Reviewed sequence</h4><ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol><p class="case-scope">${escape(item.scope)}</p><p class="case-pending">Full messages and per-turn records are not yet available here.</p>`;
    }
  }
  async function show(id, requestedEvent){
    const item=cases.find(c=>c.key===id)||cases.find(c=>c.id===id&&c.phase===2)||cases.find(c=>c.id===id)||cases[0];
    select.querySelector('[data-archived-option]')?.remove();
    if(item.archived){const option=document.createElement('option');option.dataset.archivedOption='';option.value=item.key;option.textContent=`Earlier case · ${item.domain} · ${item.id}`;select.append(option);}
    select.value=item.selectionKey||item.key;
    const current=++version;
    request?.abort();
    // A shareable case selection, without scrolling or replaying the title.
    const focusEvent = Number(requestedEvent);
    const url=new URL(location.href);url.searchParams.set('case',item.id);url.searchParams.set('phase',String(item.phase));
    if(Number.isSafeInteger(focusEvent)&&focusEvent>0)url.searchParams.set('event',String(focusEvent));
    else url.searchParams.delete('event');
    history.replaceState(null,'',url);
    renderedSearch = url.search;
    if (dispose && mountedKey===item.key) {
      full.inert=false; loading.textContent=''; root.removeAttribute('aria-busy');
      root.dispatchEvent(new CustomEvent('trajectory-seek',{detail:focusEvent}));
      return;
    }
    const hadViewer=Boolean(dispose);
    root.dispatchEvent(new CustomEvent('trajectory-case-change',{detail:item.id}));
    const replace = () => {
      dispose?.(); dispose=null; mountedKey=null; full.inert=false;
      full.replaceChildren(); renderSummary(item);
    };
    if (!item.full) {
      replace(); loading.textContent=''; root.removeAttribute('aria-busy'); return;
    }
    root.setAttribute('aria-busy','true');
    if (dispose) full.inert=true;
    else if (!full.hasChildNodes() && review.hidden) {
      full.innerHTML='<p class="record-loading" role="status">Loading recorded events…</p>';
    }
    try {
      let data=cache.get(item.key);
      if (!data) {
        loading.textContent='Loading…';
        request=new AbortController();
        const response=await fetch(item.trajectory,{signal:request.signal});
        if (!response.ok) throw new Error('Could not load recorded events');
        data=await response.json();
        if (data.id!==item.id||!Array.isArray(data.events)||!Array.isArray(data.messages)||!data.turns) throw new Error('Invalid trajectory');
        cache.set(item.key,data);
      }
      if (current!==version) return;
      replace();
      dispose=window.mountRecordedTimeline(full,data,{...item,focusEvent});
      mountedKey=item.key;
      if (hadViewer && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        full.querySelector('.obs-workbench')?.animate([{opacity:.72},{opacity:1}],{duration:220,easing:'ease-out'});
      }
    } catch (error) {
      if (current!==version||error.name==='AbortError') return;
      replace();
      full.innerHTML='<p class="record-loading" role="status">The trajectory could not be loaded.</p><button type="button" class="record-retry">Try again</button>';
      full.querySelector('button').addEventListener('click',()=>show(item.key,requestedEvent),{once:true});
    } finally {
      if (current===version) { root.removeAttribute('aria-busy'); loading.textContent=''; }
    }
  }
  select.addEventListener('change',()=>show(select.value));
  intro.addEventListener('click',event=>{const button=event.target.closest('[data-case-variant]');if(button)show(button.dataset.caseVariant);});
  document.querySelectorAll('[data-show-case]').forEach(link=>link.addEventListener('click',async event=>{
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const target = new URL(link.href);
    if (target.href !== location.href) history.pushState(null, '', target);
    const key=link.dataset.showPhase?`${link.dataset.showCase}-phase${link.dataset.showPhase}`:link.dataset.showCase;
    const loading=show(key,target.searchParams.get('event')),clickedVersion=version;
    await loading;
    if (clickedVersion !== version || location.hash !== target.hash) return;
    root.querySelector('#trajectory-title').focus({preventScroll:true});
    root.scrollIntoView({block:'start',behavior:'instant'});
  }));
  function showLocation() {
    const params = new URL(location.href).searchParams;
    return show(params.has('phase') ? `${params.get('case')}-phase${params.get('phase')}` : params.get('case'), params.get('event'));
  }
  window.addEventListener('popstate', () => {
    if (location.search !== renderedSearch) showLocation();
  });
  const initialHash = location.hash;
  const initialTarget = document.getElementById(initialHash.slice(1));
  const firstRender = showLocation();
  // Loading the initial replay adds height above the lower sections.
  if (initialTarget && !root.contains(initialTarget) &&
      (root.compareDocumentPosition(initialTarget) & Node.DOCUMENT_POSITION_FOLLOWING)) {
    const landing = new AbortController();
    const cancel = () => landing.abort();
    for (const type of ['pointerdown','wheel','touchstart','keydown']) {
      window.addEventListener(type,cancel,{passive:true,once:true,signal:landing.signal});
    }
    firstRender.then(() => requestAnimationFrame(() => {
      if (!landing.signal.aborted && location.hash === initialHash) {
        initialTarget.scrollIntoView({block:'start',behavior:'instant'});
      }
      cancel();
    }));
  }
})();
