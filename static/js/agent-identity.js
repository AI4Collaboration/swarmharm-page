(() => {
  // Shared by the animated plates and the generated still/portrait SVGs.
  // Matched OKLCH lightness stops keep the four shells at comparable visual weight.
  // Chroma is concentrated in midtones; deep ink and highlights remain neutral.
  const palette = {
    A: { name: 'steel blue', channels: [[0,.14162,.26024,.55542,1],[0,.16878,.42953,.68071,1],[0,.19191,.56503,.78632,1]] },
    B: { name: 'patina teal', channels: [[0,.14249,.26111,.55885,1],[0,.17305,.45683,.70063,1],[0,.16118,.39018,.64692,1]] },
    C: { name: 'aged brass', channels: [[0,.17873,.49060,.72668,1],[0,.16286,.39593,.65387,1],[0,.13470,.21776,.52385,1]] },
    D: { name: 'graphite', channels: [[0,.16247,.39792,.65284,1],[0,.16483,.41153,.66358,1],[0,.16966,.43954,.68562,1]] },
  };
  const transmissionShells = [
    'M171 272H200V286L233 292L244 307L248 321V347L237 359L225 367L231 382L245 390L266 397L272 414H124V390L132 370L139 362L128 353L120 344V319L129 306L138 296L171 288Z M123 442L142 442L149 449L170 445L192 443L216 446L231 456L227 473L211 478L209 511L224 529L219 542H194L184 534L174 542H128L124 531L139 510V478L123 469Z',
    'M540 277H567V289L591 295L605 312L618 322V350L605 366L600 379L598 402L594 413H477L473 405L480 396L494 393L502 378L509 365L499 355L496 333V319L505 305L520 296L540 289Z M497 442L518 444L526 452L544 448H562L582 444L603 442L602 470L589 477H579L577 506L584 529L571 542H546L536 530L526 541H501L495 529L502 510L505 478L491 472L488 458Z',
  ];
  const NS = 'http://www.w3.org/2000/svg';
  function apply(scene, group, actor) {
    const id = `robot-${scene.svg.querySelector('[data-plate-frame]').dataset.plateFrame}-${actor}`;
    if (!scene.defs.querySelector(`[id="${id}"]`)) {
      const filter = document.createElementNS(NS, 'filter');
      filter.setAttribute('id', id);
      filter.setAttribute('color-interpolation-filters', 'sRGB');
      const grayscale = document.createElementNS(NS, 'feColorMatrix');
      grayscale.setAttribute('type', 'saturate');
      grayscale.setAttribute('values', '0');
      filter.append(grayscale);
      const transfer = document.createElementNS(NS, 'feComponentTransfer');
      palette[actor].channels.forEach((values, i) => {
        const channel = document.createElementNS(NS, `feFunc${'RGB'[i]}`);
        channel.setAttribute('type', 'table');
        channel.setAttribute('tableValues', values.join(' '));
        transfer.append(channel);
      });
      filter.append(transfer);
      scene.defs.append(filter);
    }
    group.setAttribute('filter', `url(#${id})`);
    group.dataset.agent = actor;
  }
  window.SWARMHARM_AGENT_IDENTITY = { palette, transmissionShells, apply };
})();
