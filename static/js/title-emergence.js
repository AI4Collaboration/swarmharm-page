(() => {
  'use strict';
  const canvas = document.getElementById('swarmharm-canvas');
  const root = canvas?.closest('.emergence-title');
  const ctx = canvas?.getContext('2d');
  if (!ctx || !root || !window.Path2D || !window.DOMMatrix) return;
  // Exact glyph outlines and stroke weight from the existing wordmark.
  const glyphs = [{"d": "M1827 444Q1827 533 1813.0 584.0Q1799 635 1750.0 659.5Q1701 684 1598.0 691.5Q1495 699 1316 702L760 710Q554 713 429.0 735.0Q304 757 240.0 804.5Q176 852 154.5 932.0Q133 1012 133 1132Q133 1263 162.5 1348.0Q192 1433 269.5 1481.0Q347 1529 489.0 1548.5Q631 1568 856 1568H1284Q1488 1568 1624.0 1555.0Q1760 1542 1840.0 1495.0Q1920 1448 1954.5 1349.0Q1989 1250 1989 1077H1797Q1797 1211 1771.5 1279.5Q1746 1348 1687.5 1373.0Q1629 1398 1530.0 1400.0Q1431 1402 1284 1402H866Q687 1402 579.5 1395.0Q472 1388 417.0 1363.0Q362 1338 343.5 1283.0Q325 1228 325 1132Q325 1051 338.0 1002.0Q351 953 396.5 927.5Q442 902 537.0 892.5Q632 883 796 881L1392 873Q1602 870 1727.5 848.5Q1853 827 1915.5 779.0Q1978 731 1998.5 649.5Q2019 568 2019 444Q2019 309 1993.5 217.5Q1968 126 1895.0 71.0Q1822 16 1684.0 -8.0Q1546 -32 1321 -32H853Q648 -32 509.0 -14.0Q370 4 287.5 58.5Q205 113 169.0 221.0Q133 329 133 509H325Q325 368 348.0 291.0Q371 214 428.5 180.5Q486 147 589.5 140.5Q693 134 853 134H1311Q1490 134 1594.0 145.5Q1698 157 1748.0 189.5Q1798 222 1812.5 283.0Q1827 344 1827 444Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 0.0, 32.0]}, {"d": "M832 0 77 1536H298L960 163L1584 1536H1808L2432 163L3030 1536H3251L2560 0H2304L1696 1343L1088 0Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 43.40032888888889, 32.0]}, {"d": "M64 0 960 1536H1216L2112 0H1888L1696 352H480L288 0ZM576 512H1600L1088 1408Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 109.96572888888889, 32.0]}, {"d": "M196 1536H1224Q1449 1536 1586.5 1516.0Q1724 1496 1795.0 1447.0Q1866 1398 1891.0 1313.0Q1916 1228 1916 1098V1058Q1916 938 1887.5 851.5Q1859 765 1778.0 711.5Q1697 658 1538 636L1872 0H1680L1353 622Q1333 621 1311.5 621.0Q1290 621 1267 621H388V0H196ZM388 787H1237Q1408 787 1506.5 798.5Q1605 810 1651.5 839.0Q1698 868 1711.0 921.0Q1724 974 1724 1058V1098Q1724 1193 1706.0 1248.0Q1688 1303 1634.0 1329.0Q1580 1355 1473.0 1362.5Q1366 1370 1187 1370H388Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 154.0301488888889, 32.0]}, {"d": "M196 0V1536H482L1411 283L2326 1536H2612V0H2420V1362L1503 101H1329L388 1362V0Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 196.35621333333336, 32.0]}, {"d": "M196 0V1536H388V864H1796V1536H1988V0H1796V704H388V0Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 252.76492222222225, 32.0]}, {"d": "M64 0 960 1536H1216L2112 0H1888L1696 352H480L288 0ZM576 512H1600L1088 1408Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 296.98559777777774, 32.0]}, {"d": "M196 1536H1224Q1449 1536 1586.5 1516.0Q1724 1496 1795.0 1447.0Q1866 1398 1891.0 1313.0Q1916 1228 1916 1098V1058Q1916 938 1887.5 851.5Q1859 765 1778.0 711.5Q1697 658 1538 636L1872 0H1680L1353 622Q1333 621 1311.5 621.0Q1290 621 1267 621H388V0H196ZM388 787H1237Q1408 787 1506.5 798.5Q1605 810 1651.5 839.0Q1698 868 1711.0 921.0Q1724 974 1724 1058V1098Q1724 1193 1706.0 1248.0Q1688 1303 1634.0 1329.0Q1580 1355 1473.0 1362.5Q1366 1370 1187 1370H388Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 341.0500177777778, 32.0]}, {"d": "M196 0V1536H482L1411 283L2326 1536H2612V0H2420V1362L1503 101H1329L388 1362V0Z", "matrix": [0.019532102222222222, 0, 0, -0.019532102222222222, 383.37608222222224, 32.0]}];
  const swarmPath = new Path2D(), harmPath = new Path2D();
  glyphs.forEach((glyph, i) => (i < 5 ? swarmPath : harmPath)
    .addPath(new Path2D(glyph.d), new DOMMatrix(glyph.matrix)));
  const duration = 6200;
  let elapsed = 0;
  let previous = null, frame = 0, inView = true;
  let W = 0, H = 0, scale = 1, x0 = 0, y0 = 0;
  let grains = [], transfers = [], ink = '#282828', red = '#e52b24';
  let seed = 7919;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const clamp = (t, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, t));
  const smooth = t => { t = clamp(t); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  function fillPath(context, path, color) {
    context.save();
    context.translate(x0, y0);
    context.scale(scale, scale);
    context.fillStyle = context.strokeStyle = color;
    context.lineWidth = 140 * .08789446 / 4.5;
    context.lineJoin = 'round';
    context.fill(path);
    context.stroke(path);
    context.restore();
  }
  function targets(path, step) {
    const mask = document.createElement('canvas');
    mask.width = Math.ceil(W); mask.height = Math.ceil(H);
    const g = mask.getContext('2d', {willReadFrequently:true});
    fillPath(g, path, '#000');
    const pixels = g.getImageData(0, 0, mask.width, mask.height).data;
    const points = [];
    for (let y = Math.max(0,y0-3*scale); y < Math.min(H,y0+39*scale); y += step) {
      const stagger = (Math.round(y / step) % 2) * step * .5;
      for (let x = stagger; x < W; x += step) {
        if (pixels[(Math.floor(y)*mask.width+Math.floor(x))*4+3] > 128) {
          points.push({x:x+(random()-.5)*step*.72, y:y+(random()-.5)*step*.72});
        }
      }
    }
    return points;
  }
  function colors() {
    const dark = document.documentElement.dataset.theme === 'dark';
    ink = dark ? '#f2f2ef' : '#282828';
    red = dark ? '#ff786e' : '#e52b24';
  }
  function layout() {
    const bounds = root.getBoundingClientRect();
    W = bounds.width; H = bounds.height;
    if (!W || !H) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(W*dpr); canvas.height = Math.round(H*dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = W / 470; x0 = 10 * scale; y0 = 30 * scale;
    seed = 7919;
    const step = clamp(1.35*scale, .9, 2.4);
    const dot = clamp(.56*scale, .4, 1.12);
    grains = targets(swarmPath,step).map(p => ({
      x:p.x, y:p.y, sx:p.x-(28+random()*65)*scale,
      sy:p.y+(random()-.5)*38*scale, r:dot*(.55+random()*.85), mover:-1,
      arrival:590+random()*520, delay:random()*180, wave:random()*Math.PI*2
    }));
    const pool = grains.map((_,i) => i);
    for (let i=pool.length-1;i>0;i--) {
      const j = Math.floor(random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    transfers = targets(harmPath,step).map((p,i) => {
      const source = grains[pool[i % pool.length]];
      const stream = i%7;
      const start = 1100 + stream*110 + random()*260;
      const particle = {x:p.x,y:p.y,source,start,travel:2400+random()*550,
        stream, wave:random()*Math.PI*2, orbit:4+random()*10,
        flockX:(238+stream*17)*scale, flockY:(29+(stream%3)*8)*scale,
        r:dot*(.55+random()*.85), early:i<grains.length*.048};
      if (source.mover === -1) source.mover = i;
      return particle;
    });
    root.dataset.particles = `${grains.length}/${transfers.length}`;
    colors(); draw();
    canvas.hidden = false;
    root.classList.add('is-ready');
  }
  function dot(x,y,r,color,alpha) {
    if (alpha < .003) return;
    ctx.globalAlpha = alpha; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  function windPosition(p,at) {
    // Particles share a moving flock centre, while keeping individual orbits.
    // Gathering and dispersal are smooth, so no grain jumps onto a common path.
    const gather=smooth(at/.3), settle=smooth((at-.56)/.44);
    const clock=elapsed/620, phase=p.stream*.87;
    const cx=p.flockX+scale*(19*Math.sin(clock+phase)+6*Math.sin(clock*2.1+phase));
    const cy=p.flockY+scale*(10*Math.cos(clock*1.3+phase)+3*Math.sin(clock*2.8));
    const orbit=p.orbit*scale*Math.sin(Math.PI*at);
    const ox=orbit*Math.cos(clock*2.5+p.wave), oy=orbit*.65*Math.sin(clock*3+p.wave);
    return [mix(mix(p.source.x,cx+ox,gather),p.x,settle),
      mix(mix(p.source.y,cy+oy,gather),p.y,settle)];
  }
  function draw() {
    ctx.clearRect(0,0,W,H);
    for (const p of grains) {
      const u=clamp((elapsed-p.delay)/p.arrival);
      const assembled=1-Math.pow(1-u,2);
      const ripple=Math.sin(Math.PI*u)*(1-u);
      const x=mix(p.sx,p.x,assembled)+Math.sin(u*11+p.wave)*5*scale*ripple;
      const y=mix(p.sy,p.y,assembled)+Math.sin(u*15+p.wave)*9*scale*ripple;
      const transfer=transfers[p.mover];
      if (!transfer) { dot(x,y,p.r,ink,.96); continue; }
      if (elapsed < transfer.start) {
        const redFraction = smooth((elapsed-(transfer.early ? 0 : transfer.start-240))/190);
        dot(x,y,p.r,ink,.96*(1-redFraction)); dot(x,y,p.r,red,redFraction);
      } else dot(x,y,p.r,ink,.96*smooth((elapsed-transfer.start)/420));
    }
    const solid = smooth((elapsed-5100)/900);
    for (const p of transfers) {
      if (elapsed < p.start) continue;
      const u=clamp((elapsed-p.start)/p.travel);
      // Local milling makes each group visible before it settles into the word.
      const [x,y]=windPosition(p,u), alpha=(1-solid)*smooth((elapsed-p.start)/110);
      if (u>.02 && u<.92 && p.r>scale*.5) {
        const [px,py]=windPosition(p,Math.max(0,u-.012));
        dot(px,py,p.r*.7,red,alpha*.2);
      }
      dot(x,y,p.r,red,alpha);
    }
    if (solid) { ctx.globalAlpha=solid; fillPath(ctx,harmPath,red); }
    ctx.globalAlpha=1;
    root.dataset.formation = elapsed >= duration ? 'complete' : elapsed < 1100 ? 'assembling' : elapsed < 2300 ? 'seeding' : elapsed < 5100 ? 'transferring' : 'settling';
  }
  function animate(now) {
    frame=0;
    if (document.hidden || !inView || elapsed >= duration) { previous=null; return; }
    // Finish in 4.8 seconds of visible time, then stop requesting frames.
    if (previous !== null) elapsed=Math.min(duration,elapsed+Math.min(now-previous,70)*duration/4800);
    previous=now; draw();
    // Completion is terminal for this page load. Resize/theme changes only redraw.
    if (elapsed < duration) frame=requestAnimationFrame(animate);
  }
  function resume() {
    if (!frame && !document.hidden && inView && elapsed < duration) {
      previous=null; frame=requestAnimationFrame(animate);
    }
  }
  function visibility() {
    if (document.hidden || !inView) {
      cancelAnimationFrame(frame); frame=0; previous=null;
    } else resume();
  }
  document.addEventListener('visibilitychange',visibility);
  const observer = new IntersectionObserver(entries => {
    inView=entries[0].isIntersecting; visibility();
  });
  observer.observe(root);
  new ResizeObserver(layout).observe(root);
  new MutationObserver(() => {colors();draw();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  layout(); resume();
})();
