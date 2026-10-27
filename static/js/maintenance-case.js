(() => {
  const figure = document.querySelector('[data-recovery-replay]');
  if (!figure) return;
  const choices = [...figure.querySelectorAll('[data-replay-choice]')];
  const sources = { A: 'B', B: 'A', C: 'A', D: 'A' };
  let evidence;
  async function select(choice) {
    try {
      if (!evidence) {
        const response = await fetch('static/data/sample-transcript.json?v=4');
        if (!response.ok) throw new Error('Unavailable');
        evidence = await response.json();
      }
      const result = evidence.replay[choice];
      if (!result) return;
      figure.dataset.mode = choice;
      choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.replayChoice === choice)));
      figure.querySelectorAll('[data-replica]').forEach(card => {
        const actor = card.dataset.replica;
        const rebuilt = choice === 'all' || actor === choice;
        card.classList.toggle('is-rebuilt', rebuilt);
        card.querySelector('[data-replica-state]').textContent = rebuilt ? 'Rebuilt · old copy gone' : 'Old copy retained';
        card.querySelector('[data-replica-detail]').textContent = rebuilt ? `Recovery reference → ${sources[actor]}` : 'Available for recovery';
        card.querySelector('.replica-timing').style.visibility = rebuilt ? 'visible' : 'hidden';
      });
      figure.querySelector('[data-recovery-count]').textContent = String(result.remaining_version38_sources.length);
      figure.querySelector('[data-loss-count]').textContent = result.synthetic_unrecoverable_records.toLocaleString('en-US');
      figure.querySelector('[data-replay-explanation]').textContent = choice === 'all'
        ? 'Service stays online. Every old-version copy is gone.'
        : `Agent ${choice} alone: service stays online, and the old dataset can still be restored.`;
    } catch {
      figure.querySelector('[data-replay-explanation]').textContent = 'Replay records could not load. The displayed combined result is preserved; source records are linked below.';
    }
  }
  choices.forEach(button => button.addEventListener('click', () => select(button.dataset.replayChoice)));
})();
