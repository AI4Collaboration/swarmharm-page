(() => {
  const p = document.querySelector('.hero #tldr p:first-child');

  const label = [...(p?.children || [])].find(el =>
    el.tagName === 'STRONG' &&
    /^TL\s*;?\s*DR\s*:/i.test(el.textContent.trim())
  );

  const titleScript = document.querySelector(
    'script[src*="swarmharm_title_demo_v3.js"]'
  );

  if (!label || !titleScript || label.dataset.beeRipple) return;

  const CONFIG = {
    density: 0.27,
    maxBees: 3800,
    outwardMs: 2700,
    inwardMs: 2700,
    edgePauseMs: 180,
    centerPauseMs: 250,
    waveWidth: 12,
    glowStrength: 1.0,
    frameInterval: 55
  };

  const reducedMotion = matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  async function initialize() {
    let image;

    try {
      const response = await fetch(titleScript.src, {
        cache: 'force-cache'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const source = await response.text();

      const match = source.match(
        /const\s+BLACK_BEE_SRC\s*=\s*['"](data:image\/[^'"]+)['"]/
      );

      if (!match) throw new Error('Bee atlas not found');

      image = new Image();
      image.src = match[1];
      await image.decode();

    } catch (error) {
      console.warn('TL;DR bee animation unavailable:', error);
      return;
    }

    const style = document.createElement('style');

    style.textContent = `
      .hero #tldr .swarm-bee-ripple {
        display: inline-flex;
        position: relative;
        align-items: center;
        justify-content: center;

        vertical-align: -.16em;
        margin-right: .22em;
        padding: .06em .16em .08em;
        min-height: 1.16em;

        font: 800 clamp(25px,2.5vw,29px)/1.02
          var(--font,system-ui);

        letter-spacing: -.06em;
        isolation: isolate;
        white-space: nowrap;

        background: transparent;
        border: 0;
      }

      .hero #tldr .swarm-bee-ripple > canvas {
        position: absolute;
        z-index: 0;

        inset: -2px -3px;
        width: calc(100% + 6px);
        height: calc(100% + 4px);

        pointer-events: none;
      }

      .hero #tldr .swarm-bee-ripple > span {
        position: relative;
        z-index: 1;
        color: var(--text);

        transform: scale(.90);
        transform-origin: center;

        text-shadow:
          0 0 2px var(--bg),
          0 0 5px var(--bg);
      }

      @media(max-width:680px) {
        .hero #tldr .swarm-bee-ripple {
          font-size: clamp(23px,6vw,26px);
        }
      }
    `;

    document.head.append(style);

    const originalNodes = [...label.childNodes];

    label.classList.add('swarm-bee-ripple');
    label.dataset.beeRipple = 'true';

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    text.textContent = 'TL;DR';

    label.replaceChildren(canvas, text);

    const ctx = canvas.getContext('2d');

    let active = true;
    let raf = 0;
    let lastFrame = 0;
    let startTime = null;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let maxDistance = 1;

    let bees = [];
    let blueAtlas;
    let redAtlas;
    let flashAtlas;
    let baseLayer;

    let currentTheme = '';

    function randomGenerator(seed = 17329) {
      return () => (
        (seed = (
          1664525 * seed + 1013904223
        ) >>> 0) / 4294967296
      );
    }

    function tint(color) {
      const c = document.createElement('canvas');

      c.width = image.naturalWidth;
      c.height = image.naturalHeight;

      const g = c.getContext('2d');

      g.drawImage(image, 0, 0);

      g.globalCompositeOperation = 'source-in';
      g.fillStyle = color;
      g.fillRect(0, 0, c.width, c.height);

      return c;
    }

    function stamp(g, bee, atlas, alpha, scale = 1) {
      const size = bee.size * scale;

      g.save();
      g.translate(bee.x, bee.y);
      g.rotate(bee.angle);

      g.globalAlpha = Math.max(
        0,
        Math.min(1, alpha)
      );

      g.drawImage(
        atlas,
        (bee.id % 12) * 34,
        Math.floor(bee.id / 12) * 34,
        34, 34,
        -size / 2,
        -size / 2,
        size,
        size
      );

      g.restore();
    }

    function buildBase() {
      if (!active) return;

      const dark =
        document.documentElement.dataset.theme === 'dark';

      currentTheme = dark ? 'dark' : 'light';

      blueAtlas = tint(
        dark ? '#94bfe9' : '#719bc5'
      );

      redAtlas = tint(
        dark ? '#eda4af' : '#c8788b'
      );

      flashAtlas = tint(
        dark ? '#f3fbff' : '#265b99'
      );

      baseLayer = document.createElement('canvas');

      baseLayer.width = canvas.width;
      baseLayer.height = canvas.height;

      const g = baseLayer.getContext('2d');

      g.setTransform(dpr, 0, 0, dpr, 0, 0);

      for (const bee of bees) {
        stamp(
          g,
          bee,
          bee.red ? redAtlas : blueAtlas,
          bee.alpha
        );
      }
    }

    function buildRectangle() {
      if (!active) return;

      const rect = canvas.getBoundingClientRect();

      if (rect.width < 1 || rect.height < 1) return;

      width = rect.width;
      height = rect.height;

      dpr = Math.min(devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      maxDistance = Math.hypot(
        width / 2,
        height / 2
      );

      const rand = randomGenerator();

      const count = Math.min(
        CONFIG.maxBees,
        Math.max(
          850,
          Math.round(width * height * CONFIG.density)
        )
      );

      bees = [];

      for (let i = 0; i < count; i++) {
        const x = 2 + rand() * Math.max(1, width - 4);
        const y = 2 + rand() * Math.max(1, height - 4);

        const edge = Math.min(
          x,
          width - x,
          y,
          height - y
        );

        const edgeAlpha =
          .48 + .52 *
          Math.min(1, Math.max(0, edge / 5));

        bees.push({
          x,
          y,

          distance: Math.hypot(
            x - width / 2,
            y - height / 2
          ),

          id: Math.floor(rand() * 112),

          size: 3.0 + rand() * 2.0,
          angle: rand() * Math.PI * 2,

          alpha:
            (.25 + rand() * .27) * edgeAlpha,

          red: rand() < .075,
          sparkle: rand() < .19,

          phase: rand() * Math.PI * 2
        });
      }

      buildBase();
    }

    const cycle =
      CONFIG.outwardMs +
      CONFIG.edgePauseMs +
      CONFIG.inwardMs +
      CONFIG.centerPauseMs;

    function waveAt(time) {
      const t =
        ((time - startTime) % cycle + cycle) % cycle;

      if (t < CONFIG.outwardMs) {
        return {
          distance:
            maxDistance * t / CONFIG.outwardMs,

          direction: 1,
          strength: 1
        };
      }

      if (
        t < CONFIG.outwardMs + CONFIG.edgePauseMs
      ) {
        const f =
          (t - CONFIG.outwardMs) /
          CONFIG.edgePauseMs;

        return {
          distance: maxDistance,
          direction: 1,
          strength: 1 - f
        };
      }

      const inwardStart =
        CONFIG.outwardMs + CONFIG.edgePauseMs;

      if (t < inwardStart + CONFIG.inwardMs) {
        const f =
          (t - inwardStart) / CONFIG.inwardMs;

        return {
          distance:
            maxDistance * (1 - f),

          direction: -1,
          strength: 1
        };
      }

      const f =
        (t - inwardStart - CONFIG.inwardMs) /
        CONFIG.centerPauseMs;

      return {
        distance: 0,
        direction: -1,
        strength: 1 - f
      };
    }

    function paint(time = 0) {
      if (!active || !baseLayer) return;

      const dark =
        document.documentElement.dataset.theme === 'dark';

      if (
        currentTheme !== (dark ? 'dark' : 'light')
      ) {
        buildBase();
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, width, height);

      ctx.drawImage(
        baseLayer,
        0, 0,
        width, height
      );

      if (reducedMotion) return;

      if (startTime === null) startTime = time;

      const wave = waveAt(time);
      const sigma = CONFIG.waveWidth;

      const lightColor = dark
        ? '160,217,255'
        : '52,115,183';

      for (const bee of bees) {
        const signed =
          bee.distance - wave.distance;

        const primary = Math.exp(
          -.5 * (signed / sigma) ** 2
        );

        const alreadyPassed =
          signed * wave.direction < 0;

        const wake = alreadyPassed
          ? .14 * Math.exp(
              -Math.abs(signed) / 27
            )
          : 0;

        const intensity = Math.min(
          1,
          (primary + wake) * wave.strength
        );

        if (intensity < .075) continue;

        const flicker = bee.sparkle
          ? (
              .83 +
              .17 * Math.sin(
                time * .012 + bee.phase
              ) ** 2
            )
          : .83;

        const power =
          intensity *
          flicker *
          CONFIG.glowStrength;

        stamp(
          ctx,
          bee,
          flashAtlas,
          Math.min(.96, power * .87),
          1 + .12 * power
        );

        if (bee.sparkle && power > .30) {
          const radius = 3.0 + 6.8 * power;

          const halo = ctx.createRadialGradient(
            bee.x, bee.y, 0,
            bee.x, bee.y, radius
          );

          halo.addColorStop(
            0,
            `rgba(${lightColor},${.29 * power})`
          );

          halo.addColorStop(
            .45,
            `rgba(${lightColor},${.10 * power})`
          );

          halo.addColorStop(
            1,
            `rgba(${lightColor},0)`
          );

          ctx.fillStyle = halo;

          ctx.beginPath();

          ctx.arc(
            bee.x,
            bee.y,
            radius,
            0,
            Math.PI * 2
          );

          ctx.fill();
        }
      }
    }

    function animate(time) {
      if (!active) return;

      raf = requestAnimationFrame(animate);

      if (
        document.hidden ||
        (
          lastFrame &&
          time - lastFrame < CONFIG.frameInterval
        )
      ) return;

      lastFrame = time;
      paint(time);
    }

    const resize = new ResizeObserver(buildRectangle);

    resize.observe(canvas);
    buildRectangle();

    if (reducedMotion) {
      paint();
    } else {
      raf = requestAnimationFrame(animate);
    }

    window.undoSwarmTLDRRipple = () => {
      active = false;

      cancelAnimationFrame(raf);
      resize.disconnect();

      label.replaceChildren(...originalNodes);
      label.classList.remove('swarm-bee-ripple');

      delete label.dataset.beeRipple;
      style.remove();

      delete window.undoSwarmTLDRRipple;
    };
  }

  initialize();
})();
