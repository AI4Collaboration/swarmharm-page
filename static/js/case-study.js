(() => {
  function revealEvidence(hash) {
    if (!hash || hash === '#') return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    let parent = target.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
  }

  // Native links and disclosures work without JavaScript; this also opens
  // evidence reached through a link or a directly shared fragment URL.
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => revealEvidence(link.hash));
  });
  window.addEventListener('hashchange', () => revealEvidence(location.hash));
  revealEvidence(location.hash);
})();
