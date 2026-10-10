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
  // Deep links to a dimension must reveal its panel even after switching views.
  const revealHash = () => {
    const target = document.getElementById(location.hash.slice(1));
    const panel = target?.closest('[data-hf-panel]');
    const tab = tabs.find((item) => item.getAttribute('aria-controls') === panel?.id);
    if (tab) {
      activate(tab);
      target.scrollIntoView({ block: 'start' });
    }
  };
  window.addEventListener('hashchange', revealHash);
  revealHash();
})();
