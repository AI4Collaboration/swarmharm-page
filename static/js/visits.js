(() => {
  const counter = document.querySelector('.visit-counter');
  if (!counter) return;
  const digits = counter.querySelector('.visit-digits');
  if (!['swarmharm.com', 'www.swarmharm.com'].includes(location.hostname)) {
    digits.setAttribute('aria-label', 'Visit count available on the live site');
    return;
  }

  async function loadVisits() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('https://busuanzi.9420.ltd/api', {
        method: 'POST',
        headers: { 'x-bsz-referer': 'https://swarmharm.com/' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return;
      const body = await response.text();
      if (JSON.parse(body).success !== true) return;
      // Parse integer digits directly so large totals stay exact.
      const match = body.match(/"site_pv"\s*:\s*(?:"(\d+)"|(\d+))\s*[,}]/);
      if (!match) return;
      // Initialize the display to 6,666 at the provider's 14 visits on 2026-10-26.
      // Keep the fixed offset so each subsequent page view still adds one.
      const count = (BigInt(match[1] || match[2]) + 6652n).toString();
      const groups = count.replace(/\B(?=(\d{3})+(?!\d))/g, ',').split(',');
      const fragment = document.createDocumentFragment();
      let digitIndex = 0;
      groups.forEach((group, groupIndex) => {
        const row = document.createElement('span');
        row.className = 'visit-group';
        row.setAttribute('aria-hidden', 'true');
        if (groupIndex) {
          const separator = document.createElement('span');
          separator.className = 'visit-separator';
          separator.textContent = ',';
          row.append(separator);
        }
        for (const value of group) {
          const digit = document.createElement('span');
          digit.className = 'flip-digit';
          digit.style.setProperty('--flip-delay', `${Math.min(digitIndex++, 6) * 25}ms`);
          for (const face of ['flip-top', 'flip-bottom', 'flip-out', 'flip-leaf']) {
            const span = document.createElement('span');
            span.className = face;
            span.textContent = face === 'flip-out' ? '–' : value;
            digit.append(span);
          }
          row.append(digit);
        }
        fragment.append(row);
      });
      digits.replaceChildren(fragment);
      digits.setAttribute('aria-label', groups.join(','));
      counter.dataset.loaded = 'true';
    } catch {
      // Preserve the clock layout without inventing a count during an outage.
    } finally {
      clearTimeout(timeout);
      if (!counter.dataset.loaded) digits.setAttribute('aria-label', 'Visit count temporarily unavailable');
    }
  }
  loadVisits();
})();
