(() => {
  const root = document.documentElement;
  let preference;
  try { preference = localStorage.getItem('swarmharm-theme'); } catch {}
  const valid = value => value === 'dark' || value === 'light';

  function apply(theme) {
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111315' : '#ffffff');
    document.querySelectorAll('[data-wordmark]').forEach(image => {
      image.src = `static/images/swarmharm-wordmark${theme === 'dark' ? '-dark' : ''}.svg?v=8`;
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

  apply(valid(preference) ? preference : 'light');
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('swarmharm-theme', preference); } catch {}
      apply(preference);
    });
  });
})();
