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
  const sections = sectionLinks.map(link => ({link, element:document.getElementById(link.hash.slice(1))}))
    .filter(item => item.element);
  const findingsMenu = navigation?.querySelector('.nav-findings');
  const compactNav = matchMedia('(max-width: 1050px)');

  function arrangeNavigation() {
    if (!findingsMenu) return;
    findingsMenu.open = !compactNav.matches;
    findingsMenu.classList.toggle('is-inline', !compactNav.matches);
  }
  arrangeNavigation();
  compactNav.addEventListener('change', arrangeNavigation);
  document.addEventListener('click', event => {
    if (compactNav.matches && findingsMenu?.open &&
        (event.target.closest('a') || !findingsMenu.contains(event.target))) findingsMenu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && compactNav.matches && findingsMenu?.open) {
      findingsMenu.open = false;
      findingsMenu.querySelector('summary').focus();
    }
  });

  function selectSection(hash) {
    const target = document.getElementById((hash || '').slice(1));
    const selected = target && (sections.find(item => item.element.contains(target)) ||
      sections.find(item => target.contains(item.element)));
    sectionLinks.forEach(link => {
      if (link === selected?.link) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  sectionLinks.forEach(link => link.addEventListener('click', () => selectSection(link.hash)));
  window.addEventListener('hashchange', () => selectSection(location.hash));
  selectSection(location.hash);
  let sectionTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(sectionTimer);
    sectionTimer = setTimeout(() => {
      const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || headerHeight || 0;
      const visible = sections.map(({link,element}) => {
        const {top,bottom} = element.getBoundingClientRect();
        const margin = parseFloat(getComputedStyle(element).scrollMarginTop) || 0;
        return {link,top,bottom,start:padding+margin};
      }).filter(item => item.top <= item.start + 5 && item.bottom > padding);
      // Two findings can share a row. Keep the one the visitor explicitly opened.
      const active = visible.find(item => item.link.hash === location.hash) ||
        visible.sort((a,b) => b.top-a.top)[0];
      selectSection(active?.link.hash);
    }, 100);
  }, {passive:true});

  const formerReplayAnchors = [
    'sample', 'sample-title', 'sample-result', 'sample-steps', 'incident-goal-drift',
    'setup', 'p1-summary-title', 'p2-summary-title', 'threat-models', 'threat-models-title'
  ];

  function revealTarget(hash, scroll = false) {
    if (!hash || hash === '#') return;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    // Preserve shared links when sections are renamed or consolidated.
    const original = id;
    if (id === 'stay-updated' || id === 'updates-title') id = 'contact';
    if (["research", "rq1", "rq2", "rq3"].includes(id)) id = "tldr";
    if (formerReplayAnchors.includes(id) || id.startsWith('setup-') || id.startsWith('case-')) id = 'trajectory';
    const target = document.getElementById(id);
    if (!target) return;
    if (target instanceof HTMLDetailsElement) target.open = true;
    let parent = target.parentElement;
    while (parent) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
      parent = parent.parentElement;
    }
    if (id !== original) {
      history.replaceState(null, '', `#${id}`);
      selectSection(`#${id}`);
    }
    // Direct fragment navigation may happen before a closed disclosure opens.
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', () => revealTarget(link.hash));
  });
  window.addEventListener('hashchange', () => revealTarget(location.hash, true));
  revealTarget(location.hash, true);
})();
