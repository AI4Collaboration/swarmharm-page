(() => {
  const root=document.querySelector('.trajectory-viewer'),cases=window.SWARMHARM_CASES;
  if(!root||!cases?.length)return;
  const select=root.querySelector('[data-case-select]'),intro=root.querySelector('[data-case-intro]');
  const review=root.querySelector('[data-case-review]'),full=root.querySelector('[data-case-full]');
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  for(const mode of ['Connected study','Phase 2 only','Formation only']){
    const group=document.createElement('optgroup');group.label=mode;
    cases.filter(c=>c.mode===mode).forEach(c=>{const option=document.createElement('option');option.value=c.id;option.textContent=`${c.domain} · ${c.title}`;group.append(option);});
    select.append(group);
  }
  function show(id){
    const item=cases.find(c=>c.id===id)||cases[0];select.value=item.id;
    root.dispatchEvent(new CustomEvent('trajectory-case-change',{detail:item.id}));
    root.dataset.caseMode=item.full?'full':'review';full.hidden=!item.full;review.hidden=item.full;
    intro.innerHTML=`<p class="case-meta">${escape(item.mode)} · ${escape(item.model)} · ${escape(item.id)}</p><p class="case-context">${escape(item.context)}</p><p class="case-outcome" ${item.mode==='Formation only'?'data-formation="true"':''}><strong>Outcome</strong> ${escape(item.outcome)}</p>`;
    if(!item.full){
      review.innerHTML=`<h4>Reviewed sequence</h4><ol>${item.steps.map(step=>`<li>${escape(step)}</li>`).join('')}</ol><p class="case-scope">${escape(item.scope)}</p><p class="case-pending">Full messages and per-turn records are not yet available here.</p>`;
    }
    // A shareable case selection, without scrolling or replaying the title.
    const url=new URL(location.href);if(item.id==='r19')url.searchParams.delete('case');else url.searchParams.set('case',item.id);
    history.replaceState(null,'',url);
    if(item.full)window.dispatchEvent(new Event('resize'));
  }
  select.addEventListener('change',()=>show(select.value));
  show(new URL(location.href).searchParams.get('case'));
})();
