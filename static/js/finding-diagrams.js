(() => {
  // Scenario-specific illustration cues, not inferred emotions or intentions.
  window.swarmAgentImage = (actor, caseId) => {
    const moods = { r136:'curious', r74:'attentive', r75:'relieved', r65:'curious',
      r257:'questioning', r261:'editing', r255:'money-concerned', r263:'money-concerned',
      r165:'surprised', r178:'squinting' };
    const letter = String(actor).toLowerCase();
    const mood = moods[String(caseId).split('-')[0]] || 'attentive';
    return `static/images/fieldguide/finding-agents.svg?v=5#${letter}-${mood}`;
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
    timers.set(figure, setTimeout(() => stop(figure), 3500));
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
