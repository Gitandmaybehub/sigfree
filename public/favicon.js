// Animated tab icon for SigFree: a pen writing a signature on paper.
// Chrome and Safari freeze animated icon files, so this draws every frame once and swaps them in the tab.
(() => {
  const size = 64, TAU = Math.PI * 2;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const win = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const bump = (t, a, b) => Math.sin(Math.PI * win(t, a, b));
  const ease = x => x < .5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;
  const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  const ring = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); };
  const line = (a, b, c, d) => { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke(); };
  const tile = c => { ctx.globalAlpha = 1; ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(0, 0, size, size, 14); ctx.fill(); };
  const heart = (x, y, s) => { ctx.beginPath(); ctx.moveTo(x, y + .85 * s);
    ctx.bezierCurveTo(x - 1.1 * s, y + .05 * s, x - .55 * s, y - .85 * s, x, y - .35 * s);
    ctx.bezierCurveTo(x + .55 * s, y - .85 * s, x + 1.1 * s, y + .05 * s, x, y + .85 * s); ctx.fill(); };
  const draw = t => {
      tile('#f4f1ea');
      ctx.strokeStyle = '#1d3a8a'; ctx.globalAlpha = .25; ctx.lineWidth = 2.5; line(9, 50, 55, 50);
      const ink = win(t, .05, .6), fade = 1 - win(t, .86, 1);
      ctx.globalAlpha = fade; ctx.lineWidth = 4.5; ctx.beginPath();
      const n = Math.floor(70 * ink);
      let x = 10, y = 38;
      for (let i = 0; i <= n; i++) {
        const u = i / 70;
        x = 10 + 44 * u + 5 * Math.sin(u * TAU * 3);
        y = 34 - 12 * Math.sin(u * TAU * 3 + .6) * (1 - u * .5) + 4 * u;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      if (ink > 0 && ink < 1) { ctx.globalAlpha = 1; ctx.fillStyle = '#1d3a8a'; circle(x, y, 3.5); }
    };
  const paint = t => {
    ctx.save(); ctx.clearRect(0, 0, size, size); ctx.lineCap = ctx.lineJoin = 'round';
    draw(t); ctx.restore(); return canvas.toDataURL('image/png');
  };
  const count = 54, step = 67;
  // Chrome picks the listed icon whose size best fits the tab, so this one must be the only icon.
  const icon = document.createElement('link');
  icon.rel = 'icon'; icon.type = 'image/png'; icon.sizes = size + 'x' + size;
  const still = icon.href = paint(0.7);
  document.querySelectorAll('link[rel~="icon"]').forEach(link => link.remove());
  document.head.append(icon);
  const frames = Array.from({length: count}, (_, i) => paint(i / count));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer;
  function tick() {
    clearTimeout(timer);
    // A hidden tab gets about one timer a second, so it shows the still icon instead of a stutter.
    if (document.hidden || reduced.matches) { icon.href = still; return; }
    icon.href = frames[index]; index = (index + 1) % count;
    timer = setTimeout(tick, step);
  }
  document.addEventListener('visibilitychange', tick);
  reduced.addEventListener('change', tick);
  window.addEventListener('pagehide', () => clearTimeout(timer));
  window.addEventListener('pageshow', tick);
  tick();
})();
