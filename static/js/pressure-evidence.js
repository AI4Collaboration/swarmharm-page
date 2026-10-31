(() => {
  const section = document.getElementById('pressures');
  if (!section) return;
  const triggers = [...section.querySelectorAll('[data-pressure-evidence]')];
  let selected = null;
  function close() {
    triggers.forEach(button => {
      button.setAttribute('aria-expanded','false');
      document.getElementById(button.getAttribute('aria-controls')).hidden = true;
    });
  }
  triggers.forEach(button => button.addEventListener('click', () => {
    const wasOpen = button.getAttribute('aria-expanded') === 'true';
    close();
    if (wasOpen) { selected=null; return; }
    selected=button;
    button.setAttribute('aria-expanded','true');
    const panel=document.getElementById(button.getAttribute('aria-controls'));
    panel.hidden=false;
    panel.scrollIntoView({block:'nearest',behavior:'instant'});
  }));
  section.querySelectorAll('[data-pressure-close]').forEach(button => button.addEventListener('click', () => {
    close(); selected?.focus(); selected=null;
  }));
})();
