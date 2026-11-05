(() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const icons = {
    previous: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12.5 5-5 5 5 5"/></svg>',
    next: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7.5 5 5 5-5 5"/></svg>',
    play: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 5 7 5-7 5Z"/></svg>',
    pause: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg>'
  };

  function sampleEvenly(items, limit) {
    if (items.length <= limit) return items;
    const selected = new Set();
    for (let index = 0; index < limit; index += 1) {
      selected.add(items[Math.round(index * (items.length - 1) / (limit - 1))]);
    }
    return [...selected];
  }

  window.mountRecordedAgentMap = (host, data, meta, open) => {
    const controller = new AbortController();
    const { signal } = controller;
    const on = (element, type, handler, options = {}) => element.addEventListener(type, handler, { ...options, signal });
    const messageById = new Map(data.messages.map(message => [message.id, message]));
    const names = new Map(data.actors.map(actor => [actor.id, actor.name]));
    const firstEventIds = new Set(data.actors.map(actor => data.events.find(event => event.actor === actor.id)?.id).filter(Boolean));
    const messageEventIds = new Set(data.messages.map(message => message.event));
    const readEventIds = new Set(data.messages.flatMap(message => message.reads.map(read => read.event)));
    const communicationIds = new Set([...messageEventIds, ...readEventIds]);
    const firstCommunication = Math.min(...communicationIds);
    const lastCommunication = Math.max(...communicationIds);
    const actionCandidates = data.events.filter(event => event.important && !communicationIds.has(event.id) && !firstEventIds.has(event.id));
    const sampledActions = sampleEvenly(actionCandidates, meta.phase === 2 ? 8 : 5);
    const selectedIds = new Set([...firstEventIds, ...communicationIds, ...sampledActions.map(event => event.id)]);
    const selectedEvents = data.events.filter(event => selectedIds.has(event.id)).sort((left, right) => left.id - right.id);
    const hasCommunication = Number.isFinite(firstCommunication);

    const stageDefinitions = meta.phase === 2
      ? [
          ['context', 'Context'],
          ['coordinate', 'Coordinate'],
          ['act', 'Act'],
          ['outcome', 'Outcome']
        ]
      : [
          ['explore', 'Explore'],
          ['discover', 'Discover'],
          ['exchange', 'Exchange'],
          ['outcome', 'Outcome']
        ];

    function stageFor(event, kind) {
      if (meta.phase === 2) {
        if (kind === 'explore' || (hasCommunication && event.id < firstCommunication)) return 'context';
        if (kind === 'message' || kind === 'read' || (hasCommunication && event.id <= lastCommunication)) return 'coordinate';
        return 'act';
      }
      if (kind === 'explore') return 'explore';
      if (!hasCommunication || event.id < firstCommunication) return 'discover';
      return 'exchange';
    }

    const moments = selectedEvents.map(event => {
      const kind = event.messages.length ? 'message' : event.reads.length ? 'read' : firstEventIds.has(event.id) ? 'explore' : 'action';
      return { ...event, kind, stage: stageFor(event, kind) };
    });
    moments.push({
      id: 'outcome',
      actor: null,
      turn: null,
      time: moments.at(-1)?.time || '',
      label: 'Recorded outcome',
      messages: [],
      reads: [],
      kind: 'outcome',
      stage: 'outcome'
    });

    const momentByEvent = new Map(moments.filter(moment => moment.id !== 'outcome').map(moment => [moment.id, moment]));
    const rows = ['A', 'B', 'channel', 'C', 'D'];
    const rowY = new Map([['A', 35], ['B', 95], ['channel', 150], ['C', 205], ['D', 265]]);
    const xFor = index => moments.length === 1 ? 500 : 28 + index * 944 / (moments.length - 1);
    moments.forEach((moment, index) => {
      moment.index = index;
      moment.x = xFor(index);
      moment.y = rowY.get(moment.actor || 'channel');
    });

    const routeMarkup = data.messages.map(message => {
      const source = momentByEvent.get(message.event);
      if (!source) return '';
      const sourceToChannel = `M${source.x} ${source.y} C${source.x} ${(source.y + 150) / 2} ${source.x} ${(source.y + 150) / 2} ${source.x} 150`;
      const receipts = message.reads.map(read => {
        const target = momentByEvent.get(read.event);
        if (!target) return '';
        const middle = source.x + (target.x - source.x) * .54;
        return `<path class="comm-route-receipt" d="M${source.x} 150 C${middle} 150 ${middle} ${target.y} ${target.x} ${target.y}"/>`;
      }).join('');
      return `<g class="comm-route" data-route-message="${esc(message.id)}" data-agent="${message.actor}"><path class="comm-route-send" d="${sourceToChannel}"/>${receipts}</g>`;
    }).join('');

    const nodeMarkup = moments.map(moment => {
      const label = moment.kind === 'outcome'
        ? meta.outcome
        : `${names.get(moment.actor)}, turn ${moment.turn}: ${moment.label}`;
      return `<button type="button" class="comm-event is-${moment.kind}" data-comm-index="${moment.index}" data-agent="${moment.actor || ''}" style="--event-x:${moment.x / 10}%;--event-y:${moment.y / 3}%" aria-label="${esc(label)}"><span></span></button>`;
    }).join('');

    const channelMarkers = moments.filter(moment => moment.kind === 'message').map(moment =>
      `<i class="comm-channel-marker" data-channel-event="${moment.id}" data-agent="${moment.actor}" style="--event-x:${moment.x / 10}%" aria-hidden="true"></i>`
    ).join('');

    const topologyNodes = data.actors.map((actor, index) => {
      const positions = [[17, 20], [83, 20], [17, 80], [83, 80]];
      return `<span class="comm-topology-agent" data-topology-agent="${actor.id}" data-agent="${actor.id}" style="--topology-x:${positions[index][0]}%;--topology-y:${positions[index][1]}%"><b>${actor.id}</b><small>${esc(actor.name)}</small></span>`;
    }).join('');
    const topologyLines = data.actors.map((actor, index) => {
      const positions = [[41, 30], [199, 30], [41, 120], [199, 120]];
      return `<path data-topology-line="${actor.id}" data-agent="${actor.id}" d="M120 75 L${positions[index][0]} ${positions[index][1]}"/>`;
    }).join('');

    host.innerHTML = `
      <nav class="comm-stage-rail" aria-label="Replay stages">
        ${stageDefinitions.map(([key, label], index) => `<button type="button" data-comm-stage="${key}"><span>0${index + 1}</span><strong>${label}</strong></button>`).join('')}
      </nav>
      <div class="comm-layout">
        <aside class="comm-now">
          <div class="comm-now-header"><span>Live event</span><strong data-comm-progress>1 / ${moments.length}</strong></div>
          <div class="comm-topology" aria-label="Active communication topology">
            <svg viewBox="0 0 240 150" aria-hidden="true">${topologyLines}</svg>
            <span class="comm-topology-hub"><b>Shared</b><small>channel</small></span>
            ${topologyNodes}
          </div>
          <div class="comm-now-copy" data-comm-copy aria-live="polite"></div>
          <button type="button" class="comm-open-record" data-open-current>Open original record</button>
        </aside>
        <section class="comm-flow-panel" aria-labelledby="comm-flow-title">
          <header class="comm-flow-header">
            <div><h5 id="comm-flow-title">Communication flow</h5><p>Recorded events, in order</p></div>
            <dl class="comm-metrics">
              <div><dt>Messages</dt><dd>${data.counts.messages}</dd></div>
              <div><dt>Reads</dt><dd>${data.counts.firstReads}</dd></div>
              <div><dt>Agents</dt><dd>${data.actors.length}</dd></div>
            </dl>
          </header>
          <div class="comm-flow-chart">
            <div class="comm-lane-labels" aria-hidden="true">
              ${rows.map(row => row === 'channel'
                ? '<span class="comm-lane-label is-channel" style="--lane-y:50%"><i></i><b>Shared</b><small>channel</small></span>'
                : `<span class="comm-lane-label" data-agent="${row}" style="--lane-y:${rowY.get(row) / 3}%"><i>${row}</i><b>${esc(names.get(row))}</b></span>`).join('')}
            </div>
            <div class="comm-flow-scroll" tabindex="0" role="region" aria-label="Communication events over time">
              <div class="comm-flow">
                <svg class="comm-flow-lines" viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true">
                  ${rows.map(row => `<path class="comm-lane-line${row === 'channel' ? ' is-channel' : ''}" d="M0 ${rowY.get(row)} H1000"/>`).join('')}
                  ${routeMarkup}
                </svg>
                <div class="comm-playhead" style="--playhead:2.8%" aria-hidden="true"><time></time></div>
                ${channelMarkers}
                ${nodeMarkup}
              </div>
              <div class="comm-time-axis" aria-hidden="true"><time>${esc(moments[0]?.time || '')}</time><span>Time</span><time>${esc(moments.at(-2)?.time || moments.at(-1)?.time || '')}</time></div>
            </div>
          </div>
          <footer class="comm-controls">
            <div class="comm-transport">
              <button type="button" data-comm-previous aria-label="Previous event">${icons.previous}</button>
              <button type="button" class="comm-play" data-comm-play aria-label="Play replay">${icons.play}<span>Play</span></button>
              <button type="button" data-comm-next aria-label="Next event">${icons.next}</button>
            </div>
            <div class="comm-key" aria-label="Event key"><span class="is-message"><i></i>Send</span><span class="is-read"><i></i>Read</span><span class="is-action"><i></i>Action</span></div>
          </footer>
        </section>
      </div>`;

    const eventButtons = [...host.querySelectorAll('[data-comm-index]')];
    const stageButtons = [...host.querySelectorAll('[data-comm-stage]')];
    const topologyAgents = new Map([...host.querySelectorAll('[data-topology-agent]')].map(element => [element.dataset.topologyAgent, element]));
    const topologyLinesByAgent = new Map([...host.querySelectorAll('[data-topology-line]')].map(element => [element.dataset.topologyLine, element]));
    const routeGroups = [...host.querySelectorAll('[data-route-message]')];
    const channelMarkerByEvent = new Map([...host.querySelectorAll('[data-channel-event]')].map(element => [Number(element.dataset.channelEvent), element]));
    const copy = host.querySelector('[data-comm-copy]');
    const progress = host.querySelector('[data-comm-progress]');
    const openCurrent = host.querySelector('[data-open-current]');
    const playButton = host.querySelector('[data-comm-play]');
    const previousButton = host.querySelector('[data-comm-previous]');
    const nextButton = host.querySelector('[data-comm-next]');
    const playhead = host.querySelector('.comm-playhead');
    const playheadTime = playhead.querySelector('time');
    const flowScroll = host.querySelector('.comm-flow-scroll');
    const topology = host.querySelector('.comm-topology');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let currentIndex = 0;
    let timer = null;
    let playing = false;
    let autoStarted = false;
    let startTimer = null;

    function messageBody(message) {
      return message?.body || '';
    }

    function momentCopy(moment) {
      if (moment.kind === 'outcome') {
        return `<p class="comm-now-meta"><span>Outcome</span></p><h6>Recorded outcome</h6><p>${esc(meta.outcome)}</p>`;
      }
      const authored = moment.messages.map(id => messageById.get(id)).filter(Boolean);
      const read = moment.reads.map(id => messageById.get(id)).filter(Boolean);
      if (moment.kind === 'message') {
        const readers = [...new Map(authored.flatMap(message => message.reads).map(receipt => [receipt.actor, receipt])).values()];
        return `<p class="comm-now-meta"><span>Sent</span><time>${esc(moment.time)}</time></p><h6>${esc(names.get(moment.actor))} writes to the shared channel</h6><p>${esc(messageBody(authored[0]))}</p>${authored.length > 1 ? `<small>${authored.length} messages in this event</small>` : ''}${readers.length ? `<div class="comm-receipts"><span>Read later by</span>${readers.map(reader => `<i data-agent="${reader.actor}">${reader.actor}<small>t${reader.turn}</small></i>`).join('')}</div>` : '<div class="comm-receipts"><span>No verified cross-agent read</span></div>'}`;
      }
      if (moment.kind === 'read') {
        const authors = [...new Set(read.map(message => message.actor))];
        return `<p class="comm-now-meta"><span>Read</span><time>${esc(moment.time)}</time></p><h6>${esc(names.get(moment.actor))} reads ${authors.map(author => esc(names.get(author))).join(', ')}</h6><p>${esc(messageBody(read[0]))}</p>${read.length > 1 ? `<small>${read.length} messages read in this event</small>` : ''}`;
      }
      const type = moment.kind === 'explore' ? 'First action' : 'Action';
      return `<p class="comm-now-meta"><span>${type}</span><time>${esc(moment.time)}</time></p><h6>${esc(names.get(moment.actor))} · Turn ${moment.turn}</h6><p>${esc(moment.label)}</p>`;
    }

    function communicationRoles(moment) {
      if (moment.kind === 'message') return { sources: [moment.actor], readers: [] };
      if (moment.kind === 'read') {
        const sources = [...new Set(moment.reads.map(id => messageById.get(id)?.actor).filter(Boolean))];
        return { sources, readers: [moment.actor] };
      }
      return { sources: moment.actor ? [moment.actor] : [], readers: [] };
    }

    function updateTopology(moment) {
      const { sources, readers } = communicationRoles(moment);
      topology.classList.toggle('is-communicating', moment.kind === 'message' || moment.kind === 'read');
      for (const actor of names.keys()) {
        const node = topologyAgents.get(actor);
        const line = topologyLinesByAgent.get(actor);
        node.classList.toggle('is-source', sources.includes(actor));
        node.classList.toggle('is-reader', readers.includes(actor));
        node.classList.toggle('is-muted', (sources.length || readers.length) && !sources.includes(actor) && !readers.includes(actor));
        line.classList.toggle('is-source', sources.includes(actor));
        line.classList.toggle('is-reader', readers.includes(actor));
      }
    }

    function activeMessageIds(moment) {
      return new Set(moment.kind === 'message' ? moment.messages : moment.kind === 'read' ? moment.reads : []);
    }

    function reveal(index) {
      const button = eventButtons[index];
      const left = button.offsetLeft - flowScroll.clientWidth * .5;
      if (button.offsetLeft < flowScroll.scrollLeft + 40 || button.offsetLeft > flowScroll.scrollLeft + flowScroll.clientWidth - 40) {
        flowScroll.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? 'auto' : 'smooth' });
      }
    }

    function select(index, shouldReveal = false) {
      currentIndex = Math.max(0, Math.min(moments.length - 1, index));
      const moment = moments[currentIndex];
      const activeMessages = activeMessageIds(moment);
      eventButtons.forEach((button, buttonIndex) => {
        button.classList.toggle('is-active', buttonIndex === currentIndex);
        button.classList.toggle('is-past', buttonIndex < currentIndex);
        if (buttonIndex === currentIndex) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      routeGroups.forEach(route => route.classList.toggle('is-active', activeMessages.has(route.dataset.routeMessage)));
      channelMarkerByEvent.forEach((marker, eventId) => marker.classList.toggle('is-active', eventId === moment.id));
      stageButtons.forEach(button => {
        if (button.dataset.commStage === moment.stage) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      playhead.style.setProperty('--playhead', `${moment.x / 10}%`);
      playheadTime.textContent = moment.time || 'Outcome';
      copy.innerHTML = momentCopy(moment);
      progress.textContent = `${currentIndex + 1} / ${moments.length}`;
      openCurrent.hidden = moment.kind === 'outcome';
      previousButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === moments.length - 1;
      updateTopology(moment);
      if (shouldReveal) reveal(currentIndex);
    }

    function updatePlayButton() {
      playButton.innerHTML = `${playing ? icons.pause : icons.play}<span>${playing ? 'Pause' : currentIndex === moments.length - 1 ? 'Replay' : 'Play'}</span>`;
      playButton.setAttribute('aria-label', playing ? 'Pause replay' : currentIndex === moments.length - 1 ? 'Replay from the start' : 'Play replay');
      copy.setAttribute('aria-live', playing ? 'off' : 'polite');
    }

    function stop() {
      playing = false;
      clearTimeout(timer);
      timer = null;
      updatePlayButton();
    }

    function tick() {
      if (!playing) return;
      if (currentIndex >= moments.length - 1) {
        stop();
        return;
      }
      select(currentIndex + 1, true);
      timer = setTimeout(tick, 900);
    }

    function play() {
      if (playing) {
        stop();
        return;
      }
      if (currentIndex >= moments.length - 1) select(0, true);
      playing = true;
      updatePlayButton();
      timer = setTimeout(tick, 650);
    }

    eventButtons.forEach((button, index) => {
      on(button, 'click', () => {
        stop();
        select(index);
      });
      on(button, 'keydown', event => {
        const target = {
          ArrowRight: currentIndex + 1,
          ArrowDown: currentIndex + 1,
          ArrowLeft: currentIndex - 1,
          ArrowUp: currentIndex - 1,
          Home: 0,
          End: moments.length - 1
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        stop();
        select(target, true);
        eventButtons[currentIndex].focus({ preventScroll: true });
      });
    });
    stageButtons.forEach(button => on(button, 'click', () => {
      const index = moments.findIndex(moment => moment.stage === button.dataset.commStage);
      if (index < 0) return;
      stop();
      select(index, true);
    }));
    on(playButton, 'click', play);
    on(previousButton, 'click', () => {
      stop();
      select(currentIndex - 1, true);
    });
    on(nextButton, 'click', () => {
      stop();
      select(currentIndex + 1, true);
    });
    on(openCurrent, 'click', () => {
      const moment = moments[currentIndex];
      if (moment.id !== 'outcome') open([moment.id]);
    });
    on(document, 'visibilitychange', () => {
      if (document.hidden) stop();
    });

    const visibilityObserver = new IntersectionObserver(entries => {
      if (autoStarted || reducedMotion || !entries.some(entry => entry.isIntersecting && entry.intersectionRatio > .3)) return;
      autoStarted = true;
      startTimer = setTimeout(() => {
        if (!signal.aborted) play();
      }, 500);
    }, { threshold: [.3] });
    visibilityObserver.observe(host);
    select(0);
    updatePlayButton();

    return () => {
      stop();
      clearTimeout(startTimer);
      visibilityObserver.disconnect();
      controller.abort();
      host.replaceChildren();
    };
  };
})();
