(() => {
  const counter = document.querySelector('.visit-counter');
  if (!counter || !['swarmharm.com', 'www.swarmharm.com'].includes(location.hostname)) return;

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
      // Keep integer digits as text, including counts beyond Number.MAX_SAFE_INTEGER.
      const match = body.match(/"site_pv"\s*:\s*(?:"(\d+)"|(\d+))\s*[,}]/);
      if (!match) return;
      const count = (match[1] || match[2]).replace(/^0+(?=\d)/, '');
      const groups = count.replace(/\B(?=(\d{3})+(?!\d))/g, ',').split(',');
      const digits = counter.querySelector('.visit-digits');
      digits.setAttribute('aria-label', groups.join(','));
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
          for (const face of ['flip-top', 'flip-bottom', 'flip-leaf']) {
            const span = document.createElement('span');
            span.className = face;
            span.textContent = value;
            digit.append(span);
          }
          row.append(digit);
        }
        digits.append(row);
      });
      counter.hidden = false;
    } catch {
      // A counter outage must never block the page or display a fabricated count.
    } finally {
      clearTimeout(timeout);
    }
  }
  loadVisits();
})();
