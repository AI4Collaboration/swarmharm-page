(() => {
  const header = document.querySelector('.site-header');
  let headerHeight = null, headerFrame = 0;
  function updateHeaderOffset() {
    headerFrame = 0;
    const height = header && getComputedStyle(header).position === 'sticky'
      ? header.getBoundingClientRect().height : 0;
    if (height === headerHeight) return;
    headerHeight = height;
    document.documentElement.style.setProperty('--header-offset', `${height}px`);
  }
  function scheduleHeaderOffset() {
    if (!headerFrame) headerFrame = requestAnimationFrame(updateHeaderOffset);
  }
  if (header && 'ResizeObserver' in window) new ResizeObserver(scheduleHeaderOffset).observe(header);
  window.addEventListener('resize', scheduleHeaderOffset);
  updateHeaderOffset();

  const menu = header?.querySelector('[data-nav-toggle]');
  const navigation = header?.querySelector('nav');
  const drawer = header?.querySelector('.navigation-drawer');
  const sideButton = header?.querySelector('[data-nav-side]');
  function setNavigationSide(side) {
    const right = side === 'right';
    document.body.classList.toggle('nav-on-right', right);
    if (sideButton) {
      const label = `Move navigation to ${right ? 'left' : 'right'}`;
      sideButton.setAttribute('aria-label', label);
      sideButton.title = label;
    }
  }
  try { setNavigationSide(localStorage.getItem('swarmharm-nav-side')); } catch { setNavigationSide('left'); }
  sideButton?.addEventListener('click', () => {
    const side = document.body.classList.contains('nav-on-right') ? 'left' : 'right';
    setNavigationSide(side);
    try { localStorage.setItem('swarmharm-nav-side', side); } catch { /* Storage may be unavailable. */ }
  });
  if (menu && navigation) {
    header.classList.add('nav-enhanced');
    menu.hidden = false;
    function setMenu(open) {
      if (menu.getAttribute('aria-expanded') === String(open)) return;
      header.classList.toggle('nav-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (drawer) {
        if (open && !drawer.open) drawer.show();
        if (!open && drawer.open) drawer.close();
        document.body.classList.toggle('nav-drawer-open', open);
      }
      updateHeaderOffset();
    }
    menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
    header.querySelector('[data-nav-close]')?.addEventListener('click', () => setMenu(false));
    drawer?.addEventListener('close', () => {
      header.classList.remove('nav-open');
      document.body.classList.remove('nav-drawer-open');
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'Open navigation');
    });
    drawer?.addEventListener('click', event => {
      const bounds = drawer.getBoundingClientRect();
      if (event.target === drawer && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) setMenu(false);
    });
    header.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      if (matchMedia('(max-width: 800px)').matches) setMenu(false);
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && header.classList.contains('nav-open')) {
        setMenu(false);
        menu.focus();
      }
    });
    document.addEventListener('click', event => {
      if (matchMedia('(max-width: 800px)').matches && !header.contains(event.target)) setMenu(false);
    });
    matchMedia('(max-width: 1100px)').addEventListener('change', () => setMenu(false));
    scheduleHeaderOffset();
    setMenu(true);
    if (drawer?.contains(document.activeElement)) document.activeElement.blur();
  }

  const sectionLinks = [...(navigation?.querySelectorAll('a[href^="#"]') || [])];
  function selectSection(hash) {
    sectionLinks.forEach(link => {
      if (link.hash === (hash || '#top')) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  sectionLinks.forEach(link => link.addEventListener('click', () => selectSection(link.hash)));
  window.addEventListener('hashchange', () => selectSection(location.hash));
  selectSection(location.hash);

  function revealTarget(hash, scroll = false) {
    if (!hash || hash === '#') return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    // Preserve shared links when sections are renamed or consolidated.
    const original = id;
    if (["research", "rq1", "rq2", "rq3"].includes(id)) id = "tldr";
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
