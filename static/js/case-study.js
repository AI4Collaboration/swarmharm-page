(() => {
  const walkthrough = document.querySelector('[data-case-walkthrough]');
  if (!walkthrough) return;

  const tablist = walkthrough.querySelector('[role="tablist"]');
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  if (panels.some(panel => !panel)) return;

  function selectTab(index, moveFocus = false) {
    tabs.forEach((tab, position) => {
      const selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });
    if (moveFocus) tabs[index].focus({ preventScroll: true });
  }

  tabs.forEach((tab, index) => {
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', () => selectTab(index));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectTab(next, true);
    });
  });

  // Keep every dimension readable until the interactive navigation is ready.
  selectTab(0);
  tablist.hidden = false;

  const evidence = document.getElementById('case-evidence');
  document.querySelectorAll('a[href="#case-evidence"]').forEach(link => {
    link.addEventListener('click', () => { evidence.open = true; });
  });
})();
