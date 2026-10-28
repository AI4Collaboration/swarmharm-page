(() => {
  // Whose replica's old copy each agent's booking named as its recovery point.
  const sources = { A: 'B', B: 'A', C: 'A', D: 'A' };
  let evidence;
  function loadEvidence() {
    if (!evidence) {
      evidence = fetch('static/data/sample-transcript.json?v=4')
        .then(response => {
          if (!response.ok) throw new Error('Unavailable');
          return response.json();
        })
        .catch(error => {
          evidence = null;
          throw error;
        });
    }
    return evidence;
  }

  const figure = document.querySelector('[data-recovery-replay]');
  if (figure) {
    const choices = [...figure.querySelectorAll('[data-replay-choice]')];
    async function select(choice) {
      try {
        const result = (await loadEvidence()).replay[choice];
        if (!result) return;
        figure.dataset.mode = choice;
        choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.replayChoice === choice)));
        figure.querySelectorAll('[data-replica]').forEach(card => {
          const actor = card.dataset.replica;
          const rebuilt = choice === 'all' || actor === choice;
          card.classList.toggle('is-rebuilt', rebuilt);
          card.querySelector('[data-replica-state]').textContent = rebuilt ? 'Old copy removed' : 'Old copy retained';
          card.querySelector('[data-replica-detail]').textContent = rebuilt ? `Uses copy → ${sources[actor]}` : 'Available for recovery';
          card.querySelector('.replica-timing').style.visibility = rebuilt ? 'visible' : 'hidden';
        });
        figure.querySelector('[data-recovery-count]').textContent = String(result.remaining_version38_sources.length);
        figure.querySelector('[data-loss-count]').textContent = result.synthetic_unrecoverable_records.toLocaleString('en-US');
        figure.querySelector('[data-replay-explanation]').textContent = choice === 'all'
          ? 'Zero outage. No recovery.'
          : `Agent ${choice} alone: zero outage, recovery preserved.`;
      } catch {
        figure.querySelector('[data-replay-explanation]').textContent = 'Replay records could not load. The displayed combined result is preserved; source records are linked below.';
      }
    }
    choices.forEach(button => button.addEventListener('click', () => select(button.dataset.replayChoice)));
  }

  const NS = 'http://www.w3.org/2000/svg';
  const INK = 'var(--text)', HARM = 'var(--risk)', GUIDE = 'var(--line)';

  function svgNode(parent, tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    parent.append(node);
    return node;
  }
  function label(parent, x, y, text, className = '', anchor = 'start') {
    const node = svgNode(parent, 'text', { x, y, 'text-anchor': anchor });
    if (className) node.setAttribute('class', className);
    node.textContent = text;
  }
  // Crisp geometry keeps the evidence diagrams consistent with the site.
  function pen(svg) {
    return (d, { stroke = INK, width = 1.6, wash, washOpacity = 1 } = {}) => {
      svgNode(svg, 'path', { d, fill: wash || 'none', 'fill-opacity': washOpacity, stroke, 'stroke-width': width, 'stroke-linejoin': 'round' });
    };
  }
  const box = (x, y, w, h) => `M${x},${y} H${x + w} V${y + h} H${x} Z`;

  // One box per replica, one arrow per booking to the replica whose old copy it named.
  function drawLinks(svg, schedule) {
    const draw = pen(svg);
    const replicaOf = Object.fromEntries(schedule.map(booking => [booking.agent, booking.replica]));
    const node = { A: [110, 220], B: [330, 100], C: [330, 220], D: [330, 340] };
    label(svg, 40, 40, 'Booking → recovery copy', 'm-small');
    for (const [agent, [cx, cy]] of Object.entries(node)) {
      draw(box(cx - 52, cy - 26, 104, 52), { wash: 'var(--surface)', washOpacity: 1 });
      label(svg, cx, cy - 3, replicaOf[agent], 'm-small', 'middle');
      label(svg, cx, cy + 15, `Agent ${agent}`, '', 'middle');
    }
    for (const booking of schedule) {
      const from = node[booking.agent], to = node[sources[booking.agent]];
      const rightward = to[0] > from[0];
      const [sx, sy] = rightward ? [from[0] + 10, from[1] - 26] : [from[0] - 52, from[1]];
      const [ex, ey] = rightward ? [to[0] - 40, to[1] - 26] : [to[0] + 52, to[1] + (from[1] - to[1]) * 0.25];
      const mx = (sx + ex) / 2, my = (sy + ey) / 2 - (rightward ? 40 : 0);
      draw(`M${sx},${sy} Q${mx},${my} ${ex},${ey}`, { stroke: HARM, roughness: 0.5 });
      const angle = Math.atan2(ey - my, ex - mx);
      const barb = side => `${ex - 11 * Math.cos(angle + side)},${ey - 11 * Math.sin(angle + side)}`;
      draw(`M${barb(-0.45)} L${ex},${ey} L${barb(0.45)}`, { stroke: HARM, roughness: 0.3 });
    }
  }

  // The upgrade windows on the maintenance clock, with the old copies left under them.
  function drawSchedule(svg, schedule) {
    const draw = pen(svg);
    const order = [...schedule].sort((a, b) => a.start_minute - b.start_minute || a.agent.localeCompare(b.agent));
    const finish = booking => booking.start_minute + booking.duration_minutes;
    const span = Math.ceil(Math.max(...order.map(finish)) / 10) * 10;
    const left = 100, right = 400, top = 100, rowGap = 46;
    const x = minute => left + minute / span * (right - left);
    label(svg, 16, 40, 'Maintenance minutes', 'm-small');
    order.forEach((booking, i) => {
      const rowY = top + i * rowGap;
      label(svg, left - 12, rowY + 5, `${booking.agent} · ${booking.replica.replace('reporting-', 'r-')}`, 'm-small', 'end');
      draw(box(x(booking.start_minute), rowY - 13, x(finish(booking)) - x(booking.start_minute), 26), { wash: 'var(--line)', width: 1.4 });
    });
    const axisY = top + order.length * rowGap - 10;
    draw(`M${left},${axisY} H${right}`, { width: 1.2, roughness: 0.4 });
    for (let minute = 0; minute <= span; minute += 10) {
      svgNode(svg, 'path', { d: `M${x(minute)},${axisY} V${axisY + 6}`, stroke: INK });
      label(svg, x(minute), axisY + 22, String(minute), 'm-small', 'middle');
    }

    // Old copies left, counted at the end of each window.
    const ends = [...new Set(order.map(finish))].sort((a, b) => a - b);
    const steps = [];
    let copies = order.length, since = 0;
    for (const end of ends) {
      steps.push([since, end, copies]);
      copies -= order.filter(booking => finish(booking) === end).length;
      since = end;
    }
    const bandTop = axisY + 50, bandBottom = axisY + 110;
    const copiesY = count => bandBottom - count / order.length * (bandBottom - bandTop);
    label(svg, left - 12, bandTop + 22, 'old copies', 'm-small', 'end');
    label(svg, left - 12, bandTop + 38, 'left', 'm-small', 'end');
    svgNode(svg, 'path', { d: `M${left},${bandBottom} H${right}`, stroke: GUIDE, 'stroke-dasharray': '3 5', 'stroke-width': 1 });
    for (const end of ends) svgNode(svg, 'path', { d: `M${x(end)},${top - 16} V${bandBottom}`, stroke: GUIDE, 'stroke-dasharray': '2 6', 'stroke-width': 1 });
    const points = steps.flatMap(([a, b, count]) => [[a, count], [b, count]]).concat([[ends[ends.length - 1], copies]]);
    draw('M' + points.map(([minute, count]) => `${x(minute)},${copiesY(count)}`).join(' L'), { stroke: HARM, width: 2, roughness: 0.4 });
    for (const [a, b, count] of steps) label(svg, (x(a) + x(b)) / 2, copiesY(count) - 8, String(count), 'm-harm', 'middle');
    label(svg, x(ends[ends.length - 1]) + 10, bandBottom + 5, String(copies), 'm-harm');
  }

  const links = document.querySelector('[data-mechanism="links"]');
  const windows = document.querySelector('[data-mechanism="schedule"]');
  if (links && windows) {
    loadEvidence()
      .then(data => {
        drawLinks(links, data.schedule);
        drawSchedule(windows, data.schedule);
      })
      .catch(() => label(links, 40, 200, 'Schedule records could not load. Source records are linked below.', 'm-small'));
  }
})();
