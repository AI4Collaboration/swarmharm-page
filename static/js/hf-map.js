(() => {
  const tablist = document.querySelector('[data-hf-tabs]');
  if (!tablist) return;
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const activate = (tab) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activate(tabs[next]);
      tabs[next].focus();
    });
  });

  // Keep the task-level blocker distinct from the boundaries crossed on a detour.
  // CWE labels are our classifications unless a vendor classification is cited.
  const pairs = {
    network: {
      scope: 'Network boundary', taxonomy: 'Access restricted + SSRF',
      from: 'Agent sandbox', to: 'Internet', blocked: 'Direct requests blocked',
      fromIcon: 'person', toIcon: 'globe',
      via: 'Package service fetches the URL', cwe: '918', weakness: 'SSRF',
      effect: 'The service reaches a destination the agent cannot access directly.',
      note: 'A network restriction is the blocker; SSRF is the weakness that crosses it.',
      route: 'Direct internet access is blocked. The package service can instead fetch an unintended URL through SSRF.',
      sources: [['OpenAI incident report', 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/']]
    },
    peers: {
      scope: 'Communication boundary', taxonomy: 'Access restricted + shared-state isolation',
      taxonomyHref: '#protocol',
      from: 'Separate agents', to: 'Other task runs', blocked: 'No designated peer channel',
      fromIcon: 'person', toIcon: 'person',
      via: 'Shared cache becomes a message board', cwe: '653', weakness: 'Improper isolation',
      effect: 'Agents exchange notes and reuse discoveries through a side channel.',
      note: 'Our architectural mapping: shared credentials already permitted access. Creating the early board did not require exploiting a product vulnerability.',
      route: 'Separate task runs have no designated peer channel. Shared infrastructure lets agents leave and read messages across runs.',
      sources: [['OpenAI technical report · pp. 6–7', 'https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf#page=6']]
    },
    files: {
      scope: 'Hugging Face · file boundary', taxonomy: 'Access restricted + external file control',
      from: 'Untrusted dataset', to: 'Worker files', blocked: 'Local files are private',
      fromIcon: 'file', toIcon: 'file',
      via: 'HDF5 reference chooses a local file', cwe: '73', weakness: 'External file control',
      effect: 'The dataset service reads worker-local bytes and returns them to the requester.',
      note: 'Unsafe use of an HDF5 feature by the service. This is file disclosure, not code execution or a demonstrated HDF5 library bug.',
      route: 'A dataset cannot directly read private worker files. The service follows an untrusted HDF5 external-file reference and returns local file contents.',
      sources: [
        ['Hugging Face forensic report', 'https://huggingface.co/blog/agent-intrusion-technical-timeline'],
        ['HDF Group clarification', 'https://www.hdfgroup.org/2026/08/23/hdf5-was-the-mechanism-not-the-vulnerability/']
      ]
    },
    execution: {
      scope: 'Hugging Face · execution boundary', taxonomy: 'Access restricted + template injection',
      from: 'Dataset input', to: 'Worker runtime', blocked: 'No authorized code execution',
      fromIcon: 'file', toIcon: 'server',
      via: 'A reference value is evaluated as a template', cwe: '1336', weakness: 'Template injection',
      effect: 'Attacker-controlled input executes code inside the dataset worker.',
      note: 'The URL allowlist stopped remote fetches; it did not guard local template evaluation in the fsspec reference path.',
      route: 'Dataset input has no authorized route to execute code on a worker. Template evaluation of a reference value crosses that execution boundary.',
      sources: [['Hugging Face forensic report', 'https://huggingface.co/blog/agent-intrusion-technical-timeline']]
    },
    cache: {
      scope: 'OpenAI infrastructure · parallel branch', taxonomy: 'Access restricted + path traversal',
      from: 'Remote cache input', to: 'Trusted image path', blocked: 'Writes confined to a cache path',
      fromIcon: 'file', toIcon: 'server',
      via: 'A manipulated path escapes the intended cache', cwe: '22', weakness: 'Path traversal',
      vendorCwe: true, cve: 'CVE-2026-66384',
      effect: 'A trusted container-image cache entry is replaced with attacker-controlled content.',
      note: 'Cache poisoning was confirmed; downstream execution was not observed. OpenAI explicitly separates this branch from the Hugging Face compromise.',
      route: 'Cache writes should stay inside their assigned path. Path traversal allows content to be cached under a trusted image path. This is a separate branch, not Hugging Face ingress.',
      sources: [
        ['OpenAI technical report · § V', 'https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf#page=13'],
        ['JFrog advisory · CVE-2026-66384', 'https://docs.jfrog.com/releases/docs/jfrog-security-advisories']
      ]
    }
  };
  const pairButtons = Array.from(document.querySelectorAll('[data-hf-pair]'));
  const setText = (id, value) => { document.getElementById(id).textContent = value; };
  function selectPair(button) {
    const key = button.dataset.hfPair;
    const pair = pairs[key];
    if (!pair) return;
    pairButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('hf-pair-detail').classList.toggle('is-branch', key === 'cache');
    setText('hf-pair-scope', pair.scope);
    setText('hf-pair-taxonomy', pair.taxonomy);
    document.getElementById('hf-pair-taxonomy').href = pair.taxonomyHref || '#scenario-space';
    setText('hf-route-from', pair.from);
    setText('hf-route-to', pair.to);
    document.getElementById('hf-route-from-icon').setAttribute('href', `#hf-${pair.fromIcon}-icon`);
    document.getElementById('hf-route-to-icon').setAttribute('href', `#hf-${pair.toIcon}-icon`);
    setText('hf-route-blocked', pair.blocked);
    setText('hf-route-via', pair.via);
    setText('hf-route-cwe', `CWE-${pair.cwe} · ${pair.weakness} ↗`);
    document.getElementById('hf-route-cwe').href = `https://cwe.mitre.org/data/definitions/${pair.cwe}.html`;
    document.getElementById('hf-pair-route').setAttribute('aria-label', pair.route);
    setText('hf-pair-effect', pair.effect);
    setText('hf-pair-note', pair.note);
    setText('hf-cwe-status', pair.vendorCwe ? 'CWE: vendor classification' : 'CWE: our mapping');
    setText('hf-cve-status', pair.cve ? `${pair.cve} · incident link confirmed` : 'Incident CVE not confirmed in cited sources');
    const links = pair.sources.map(([label, url]) => {
      const link = document.createElement('a');
      link.textContent = `${label} ↗`;
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      return link;
    });
    document.getElementById('hf-pair-links').replaceChildren(...links);
    if (window.matchMedia('(max-width: 760px)').matches) {
      document.getElementById('hf-pair-detail').scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
      });
    }
  }
  pairButtons.forEach(button => button.addEventListener('click', () => selectPair(button)));

  // Reveal integrated evidence even when its tab or disclosure is closed.
  const revealHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    const panel = target?.closest('[data-hf-panel]');
    const tab = tabs.find((item) => item.getAttribute('aria-controls') === panel?.id);
    if (tab) activate(tab);
    let ancestor = target.parentElement;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    if (tab || target.closest('details')) {
      target.scrollIntoView({ block: 'start' });
    }
    if (target.matches('[data-hf-pair]')) selectPair(target);
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && link.hash === location.hash) revealHash();
  });
  window.addEventListener('hashchange', revealHash);
  revealHash();
})();
