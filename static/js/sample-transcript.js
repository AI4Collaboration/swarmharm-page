(() => {
  let records;
  function loadRecords() {
    if (!records) records = fetch('static/data/sample-transcript.json?v=4').then(response => {
      if (!response.ok) throw new Error('Transcript unavailable');
      return response.json();
    }).catch(error => { records = undefined; throw error; });
    return records;
  }

  document.querySelectorAll('[data-transcript-phase]').forEach(panel => {
    async function render() {
      if (!panel.open || panel.dataset.loaded) return;
      panel.dataset.loaded = 'loading';
      const output = panel.querySelector('.log-entries');
      output.textContent = 'Loading source records…';
      try {
        const data = await loadRecords();
        const entries = data.logs[panel.dataset.transcriptPhase];
        if (!Array.isArray(entries)) throw new Error('Transcript unavailable');
        const fragment = document.createDocumentFragment();
        entries.forEach(entry => {
          const item = document.createElement('article');
          item.className = `log-entry${entry.kind === 'read_receipt' ? ' log-read' : ''}`;
          const header = document.createElement('header');
          const name = document.createElement('strong');
          name.textContent = entry.author;
          const time = document.createElement('time');
          time.dateTime = entry.at;
          time.textContent = `${entry.at.slice(11, 19)} UTC`;
          header.append(name, time);
          const text = document.createElement(entry.kind === 'tool_call_and_result' ? 'pre' : 'p');
          text.textContent = entry.kind === 'tool_call_and_result'
            ? `${entry.operation}\n${JSON.stringify(entry.arguments, null, 2)}\n\nResult\n${JSON.stringify(entry.result, null, 2)}`
            : entry.text;
          if (entry.kind === 'change_handover') name.textContent += ' · change handover';
          if (entry.kind === 'agent_decision') name.textContent += ' · private task output';
          if (entry.kind === 'read_receipt') name.textContent += ' · read receipt';
          item.append(header);
          if (entry.title) {
            const title = document.createElement('h5');
            title.textContent = entry.title;
            item.append(title);
          }
          if (entry.excerpt || entry.kind === 'tool_call_and_result') {
            const excerpt = document.createElement('p');
            excerpt.textContent = entry.excerpt || `${entry.operation} → status ${entry.result.status}`;
            excerpt.className = 'log-excerpt';
            item.append(excerpt);
            const full = document.createElement('details');
            full.className = 'log-original';
            const summary = document.createElement('summary');
            summary.textContent = entry.kind === 'tool_call_and_result' ? 'Full tool record' : entry.kind === 'agent_decision' ? 'Full original output' : 'Full original message';
            full.append(summary, text);
            item.append(full);
          } else {
            item.append(text);
          }
          fragment.append(item);
        });
        output.replaceChildren(fragment);
        panel.dataset.loaded = 'true';
      } catch {
        output.textContent = 'Open the source records below to read the transcript.';
        delete panel.dataset.loaded;
      }
    }
    panel.addEventListener('toggle', render);
    render();
  });
})();
