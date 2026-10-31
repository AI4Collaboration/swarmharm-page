(() => {
  const header = document.querySelector('.site-header');
  function updateHeaderOffset() {
    const height = header && getComputedStyle(header).position === 'sticky'
      ? header.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--header-offset', `${height}px`);
  }
  if (header && 'ResizeObserver' in window) new ResizeObserver(updateHeaderOffset).observe(header);
  window.addEventListener('resize', updateHeaderOffset);
  updateHeaderOffset();

  const menu = header?.querySelector('[data-nav-toggle]');
  const navigation = header?.querySelector('nav');
  if (menu && navigation) {
    header.classList.add('nav-enhanced');
    menu.hidden = false;
    function setMenu(open) {
      header.classList.toggle('nav-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      updateHeaderOffset();
    }
    menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
    header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && header.classList.contains('nav-open')) {
        setMenu(false);
        menu.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!header.contains(event.target)) setMenu(false);
    });
    matchMedia('(max-width: 1100px)').addEventListener('change', () => setMenu(false));
    updateHeaderOffset();
  }

  function revealTarget(hash, scroll = false) {
    if (!hash || hash === '#') return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    // Preserve shared links when sections are renamed or consolidated.
    const original = id;
    if (id === 'sample' || id === 'sample-title' || id === 'sample-result' || id === 'incident-goal-drift' || id.startsWith('case-')) id = 'sample-steps';
    const target = document.getElementById(id);
    if (!target) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    let parent = target.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    if (id !== original) history.replaceState(null, '', `#${id}`);
    // Direct fragment navigation may happen before a closed disclosure opens.
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => revealTarget(link.hash));
  });
  window.addEventListener('hashchange', () => revealTarget(location.hash, true));
  revealTarget(location.hash, true);
})();
