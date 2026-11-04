(() => {
  const root = document.documentElement;
  const preference = matchMedia('(prefers-color-scheme: dark)');
  let selected = null;
  try { selected = localStorage.getItem('swarmharm-theme'); } catch {}
  if (!['light', 'dark'].includes(selected)) selected = null;

  function apply(theme) {
    if (root.dataset.theme !== theme) root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111315' : '#ffffff');
    document.querySelectorAll('[data-wordmark]').forEach(image => {
      image.src = `static/images/swarmharm-wordmark${theme === 'dark' ? '-dark' : ''}.svg?v=27`;
    });
    const button = document.querySelector('[data-theme-toggle]');
    if (button) {
      const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
      button.hidden = false;
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  apply(selected || (preference.matches ? 'dark' : 'light'));
  preference.addEventListener('change', () => {
    if (!selected) apply(preference.matches ? 'dark' : 'light');
  });
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      selected = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('swarmharm-theme', selected); } catch {}
      apply(selected);
    });
  });
})();
