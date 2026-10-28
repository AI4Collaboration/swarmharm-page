(() => {
  const panel = document.querySelector('[data-sample-trace]');
  if (!panel) return;
  const output = panel.querySelector('.trace-scroll');
  const expand = panel.querySelector('[data-expand-outputs]');
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

  fetch('static/data/sample-transcript.json?v=6')
    .then(response => {
      if (!response.ok) throw new Error('Source records unavailable');
      return response.json();
    })
    .then(data => {
      const entries = Object.values(data.logs).flat().sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const fragment = document.createDocumentFragment();
      entries.forEach(entry => {
        const item = element('article', `trace-event${entry.kind === 'read_receipt' ? ' trace-receipt' : ''}`);
        item.dataset.eventId = entry.event_id;
        const time = element('time', '', entry.at.slice(11, 19));
        time.dateTime = entry.at;
        time.title = `${entry.at.slice(0, 10)} · UTC`;
        const content = element('div', 'trace-content');
        const header = element('header');
        header.append(element('strong', '', entry.author), element('span', 'trace-kind', kinds[entry.kind] || entry.kind));
        content.append(header);
        if (entry.kind === 'tool_call_and_result') {
          content.append(element('code', 'trace-operation', entry.operation));
          content.append(element('pre', 'trace-arguments', JSON.stringify(entry.arguments, null, 2)));
          const details = element('details', 'trace-output');
          details.open = expand.checked;
          details.append(element('summary', '', `Output · ${entry.result.status}`), element('pre', '', JSON.stringify(entry.result, null, 2)));
          content.append(details);
        } else {
          content.append(element('p', '', entry.text));
        }
        item.append(time, content);
        fragment.append(item);
      });
      output.replaceChildren(fragment);
      output.removeAttribute('aria-busy');
      panel.dataset.loaded = 'true';
      expand.disabled = false;
    })
    .catch(() => {
      output.replaceChildren(element('p', 'trace-loading', 'The transcript could not load. Open the source JSON to read the records.'));
      output.removeAttribute('aria-busy');
    });
  expand.addEventListener('change', () => {
    output.querySelectorAll('.trace-output').forEach(details => { details.open = expand.checked; });
  });
})();
