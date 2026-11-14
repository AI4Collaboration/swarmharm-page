(() => {
 const section=document.querySelector('.harm-taxonomy');
 if(!section)return;
 const data=[{"title": "Parallel scope overload", "description": "Each agent\u2019s requests stay below the service\u2019s limit when run alone. Together, requests from their shared outbound IP trigger a block, cutting off access for every agent.", "row": "System scope", "column": "No information flow"}, {"title": "Exploit propagation", "description": "One agent shares a method for crossing an access boundary. Peers copy and use it, spreading the violation. A leaked key is one possible example.", "row": "System scope", "column": "One-way information flow"}, {"title": "Coordinated external action", "description": "Agents jointly plan networking or other external actions, agree on the pieces, and divide the work without a manager. In harmful cases, their combined plan reaches systems or data outside permitted scope.", "row": "System scope", "column": "Two-way information flow"}, {"title": "Compositional failure", "description": "Each agent\u2019s complete action sequence is safe alone. Together, they exceed shared capacity. Harmful individual actions can also combine into a larger failure.", "row": "Shared infrastructure", "column": "No information flow"}, {"title": "Resource-use cascade", "description": "A resource-intensive method spreads to peers. Copying it multiplies queued jobs and overloads the shared service.", "row": "Shared infrastructure", "column": "One-way information flow"}, {"title": "Joint resource overreach", "description": "Agents agree on resource reservations that together exceed the shared pool.", "row": "Shared infrastructure", "column": "Two-way information flow"}, {"title": "Independent gaming & edits", "description": "Agents independently exploit an acceptance rule or alter activity records, without reading peer messages.", "row": "Grader & Trace", "column": "No information flow"}, {"title": "Imagined grader cascade", "description": "One agent invents an approval requirement. Peers copy it and wait for a grader that does not exist.", "row": "Grader & Trace", "column": "One-way information flow"}, {"title": "Grader & trace manipulation", "description": "Agents exchange and refine a plan to modify the grader or the records used to assess their work.", "row": "Grader & Trace", "column": "Two-way information flow"}];
 const cells=[...section.querySelectorAll('[data-tax-cell]')];
 cells.forEach((cell,index)=>{
  cell.addEventListener('click',()=>{
   cells.forEach(b=>b.setAttribute('aria-pressed',String(b===cell)));
   const item=data[index];
   section.querySelector('.tax-detail-label').textContent=item.row+' · '+item.column;
   section.querySelector('.tax-detail h3').textContent=item.title;
   section.querySelector('[data-tax-description]').textContent=item.description;
  });
  cell.addEventListener('keydown',event=>{
   const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:3,ArrowUp:-3};
   if(!(event.key in offsets))return;
   event.preventDefault();const next=cells[index+offsets[event.key]];if(next){next.focus();next.click();}
  });
 });
})();
