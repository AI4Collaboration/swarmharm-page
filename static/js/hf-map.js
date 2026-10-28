(() => {
  if (!document.querySelector('[data-hf-pairs]')) return;

  // Keep the task-level blocker distinct from the boundaries crossed on a detour.
  // CWE labels are our classifications unless a vendor classification is cited.
  const pairs = {
    network: {
      scope: 'Network boundary', taxonomy: 'Access restricted + SSRF',
      from: 'Agent sandbox', to: 'Internet', blocked: 'Direct requests blocked',
      fromIcon: 'person', toIcon: 'globe',
      via: 'Package service fetches the URL', cwe: '918', weakness: 'SSRF',
      effect: 'The service reaches a destination the agent cannot access directly.',
      note: '',
      route: 'Direct internet access is blocked. The package service can instead fetch an unintended URL through SSRF.',
      sources: [['OpenAI incident report', 'https://openai.com/index/hugging-face-incident-and-the-road-ahead/']]
    },
    peers: {
      scope: 'Communication boundary', taxonomy: 'Access restricted + shared-state isolation',
      taxonomyHref: '#protocol',
      from: 'Separate agents', to: 'Other task runs', blocked: 'No designated peer channel',
      fromIcon: 'person', toIcon: 'person',
      via: 'Artifactory cache → message board', cwe: '653', weakness: 'Improper isolation',
      effect: 'Agents use cache directory names to exchange messages across separate tasks.',
      note: 'Permitted cache access enabled unauthorized peer communication before any product exploit.',
      route: 'Separate tasks have no designated peer channel. OpenAI’s shared Artifactory cache becomes an unauthorized message board through directory names.',
      sources: [
        ['METR investigation · message board', 'https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/'],
        ['OpenAI technical report · pp. 6–7', 'https://cdn.openai.com/pdf/67869394-cb91-4c12-888c-5cbd85c7814c/OpenAI-Hugging-Face%20Incident-Technical-Report.pdf#page=6']
      ]
    },
    files: {
      scope: 'Hugging Face · file boundary', taxonomy: 'Access restricted + external file control',
      from: 'Untrusted dataset', to: 'Worker files', blocked: 'Local files are private',
      fromIcon: 'file', toIcon: 'file',
      via: 'HDF5 reference chooses a local file', cwe: '73', weakness: 'External file control',
      effect: 'The dataset service reads worker-local bytes and returns them to the requester.',
      note: 'Unsafe service handling of HDF5 external-file references exposed local files.',
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
      note: 'The URL allowlist restricted remote fetches but left local template evaluation exposed.',
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
      note: 'Separate cache-poisoning branch. Downstream execution was not observed.',
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
    document.getElementById('hf-pair-detail').setAttribute('aria-label', `${pair.scope}: ${pair.taxonomy}`);
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

  // Reveal incident evidence when a containing disclosure is closed.
  const revealHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    let ancestor = target.parentElement;
    while (ancestor) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    if (target.closest('details')) {
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
