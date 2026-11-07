(() => {
  // Recorded avatars describe the action shown, never the case's eventual result.
  // Stylized failure expressions belong to the explanatory diagrams only.
  window.swarmAgentImage = (actor, role = 'action') => {
    const letter = String(actor).toLowerCase();
    const mood = role === 'message' ? 'speaking' : role === 'read' ? 'attentive' : 'focused';
    return `static/images/fieldguide/finding-agents.svg?v=7#${letter}-${mood}`;
  };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const figures = [...document.querySelectorAll('.finding-visual:has([data-diagram-step])')];
  const timers = new Map();
  const played = new WeakSet();
  function stop(figure) {
    clearTimeout(timers.get(figure));
    timers.delete(figure);
    figure.classList.remove('is-playing');
  }
  function play(figure) {
    if (motion.matches) return;
    stop(figure);
    // Replay uses a fresh animation timeline; no continuously running animation.
    void figure.offsetWidth;
    figure.classList.add('is-playing');
    played.add(figure);
    timers.set(figure, setTimeout(() => stop(figure), Number(figure.dataset.diagramDuration) || 3500));
  }
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !played.has(entry.target)) play(entry.target);
      else if (!entry.isIntersecting) stop(entry.target);
    });
  }, { threshold: .6 }) : null;
  figures.forEach(figure => {
    const button = figure.querySelector('.diagram-replay');
    if (button) {
      button.hidden = motion.matches;
      button.addEventListener('click', () => play(figure));
    }
    observer?.observe(figure);
  });
  motion.addEventListener('change', () => {
    figures.forEach(figure => {
      stop(figure);
      const button = figure.querySelector('.diagram-replay');
      if (button) button.hidden = motion.matches;
    });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) figures.forEach(stop);
  });
})();
