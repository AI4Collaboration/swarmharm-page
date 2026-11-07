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

  const navigation = header?.querySelector('nav');

  const sectionLinks = [...(navigation?.querySelectorAll('a[href^="#"]') || [])];
  function selectSection(hash) {
    const target = document.getElementById((hash || '').slice(1));
    sectionLinks.forEach(link => {
      if (target && document.getElementById(link.hash.slice(1))?.contains(target)) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  sectionLinks.forEach(link => link.addEventListener('click', () => selectSection(link.hash)));
  window.addEventListener('hashchange', () => selectSection(location.hash));
  selectSection(location.hash);
  const sections = sectionLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
  let sectionTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(sectionTimer);
    sectionTimer = setTimeout(() => {
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || headerHeight || 0;
      const atEnd = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
      const active = atEnd ? sections.at(-1) : sections.findLast(section => {
        const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
        return section.getBoundingClientRect().top <= padding + margin + 4;
      });
      selectSection(active && '#' + active.id);
    }, 100);
  }, {passive:true});

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
