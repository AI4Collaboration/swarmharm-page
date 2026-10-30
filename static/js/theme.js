(() => {
  const root = document.documentElement;

  function apply(theme) {
    root.dataset.theme = theme;
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

  apply('light');
  document.addEventListener('DOMContentLoaded', () => {
    apply(root.dataset.theme);
    document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  });
})();
