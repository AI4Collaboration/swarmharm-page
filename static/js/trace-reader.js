(() => {
  const panel = document.querySelector('[data-sample-trace]');
  if (!panel) return;
  const output = panel.querySelector('.trace-scroll');
  const expand = panel.querySelector('[data-expand-outputs]');
  const views = [...panel.querySelectorAll('[data-trace-view]')];
  let activeView = 'conversation';
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const kinds = {
    agent_message: 'Message', read_receipt: 'System receipt',
    tool_call_and_result: 'Tool call', change_handover: 'Change handover',
    agent_decision: 'Task output'
  };
  // Emphasis uses exact substrings; the published messages remain verbatim.
  const emphasis = {
    64: ['Source needed: Reliability Component 000008-compatibility-attestation.json.'],
    77: ['use the attached exact_lookup unchanged with search_archive.'],
    105: ['the customer archive has 0 bytes available and archival failed.']
  };
  const exchangeLabels = { 64: 'Request', 77: 'Reply' };
  function message(entry) {
    const paragraph = element('p');
    let remaining = entry.text;
    (emphasis[entry.event_id] || []).forEach(quote => {
      const at = remaining.indexOf(quote);
      if (at < 0) return;
      paragraph.append(document.createTextNode(remaining.slice(0, at)), element('mark', 'trace-key', quote));
      remaining = remaining.slice(at + quote.length);
    });
    paragraph.append(document.createTextNode(remaining));
    return paragraph;
  }
  function setView(view) {
    activeView = view;
    panel.dataset.view = view;
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.traceView === view)));
    output.querySelectorAll('.trace-event').forEach(item => {
      item.hidden = view === 'conversation' && item.dataset.conversation !== 'true';
    });
    expand.closest('label').hidden = view === 'conversation';
    output.setAttribute('aria-label', view === 'conversation' ? 'Agent conversation with verified read receipts, UTC' : 'Selected source events in chronological order, UTC');
    output.scrollTop = 0;
  }
  views.forEach(button => button.addEventListener('click', () => setView(button.dataset.traceView)));

  fetch('static/data/sample-transcript.json?v=6')
    .then(response => {
      if (!response.ok) throw new Error('Source records unavailable');
      return response.json();
    })
    .then(data => {
      const entries = Object.values(data.logs).flat().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const conversation = new Set(data.logs.formation.map(entry => entry.event_id));
      const fragment = document.createDocumentFragment();
      entries.forEach(entry => {
        const item = element('article', `trace-event${entry.kind === 'read_receipt' ? ' trace-receipt' : ''}`);
        item.dataset.eventId = entry.event_id;
        item.dataset.conversation = String(conversation.has(entry.event_id));
        if (entry.kind === 'agent_message') item.classList.add('trace-message');
        const time = element('time', '', entry.at.slice(11, 19));
        time.dateTime = entry.at;
        time.title = `${entry.at.slice(0, 10)} · UTC`;
        const content = element('div', 'trace-content');
        const header = element('header');
        if (entry.kind === 'read_receipt') {
          header.append(element('span', 'trace-read-by', `Read by ${entry.author}`));
        } else {
          header.append(element('strong', '', entry.author), element('span', 'trace-kind', exchangeLabels[entry.event_id] || kinds[entry.kind] || entry.kind));
        }
        content.append(header);
        if (entry.kind === 'tool_call_and_result') {
          content.append(element('code', 'trace-operation', entry.operation));
          content.append(element('pre', 'trace-arguments', JSON.stringify(entry.arguments, null, 2)));
          const details = element('details', 'trace-output');
          details.open = expand.checked;
          details.append(element('summary', '', `Output · ${entry.result.status}`), element('pre', '', JSON.stringify(entry.result, null, 2)));
          content.append(details);
        } else {
          content.append(message(entry));
        }
        item.append(time, content);
        fragment.append(item);
      });
      output.replaceChildren(fragment);
      output.removeAttribute('aria-busy');
      panel.dataset.loaded = 'true';
      expand.disabled = false;
      views.forEach(button => { button.disabled = false; });
      setView(activeView);
    })
    .catch(() => {
      output.replaceChildren(element('p', 'trace-loading', 'The transcript could not load. Open the source JSON to read the records.'));
      output.removeAttribute('aria-busy');
    });
  expand.addEventListener('change', () => {
    output.querySelectorAll('.trace-output').forEach(details => { details.open = expand.checked; });
  });
})();
