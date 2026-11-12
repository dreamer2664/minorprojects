/* ═══════════════════════════════════════════════════════════
   SPECCHIO — canvas 2D
   · occhio ASCII (atto 00)
   · ritratto di particelle (atto 07)
   · tunnel di glifi (atto 14)
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  window.addEventListener('mousemove', (e) => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = e.clientY / window.innerHeight;
  });

  function fit(canvas) {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(2, Math.floor(r.width * DPR));
    canvas.height = Math.max(2, Math.floor(r.height * DPR));
    return { w: r.width, h: r.height, dpr: DPR };
  }

  function visible(el, cb) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => cb(en.isIntersecting));
    }, { rootMargin: '10% 0px' });
    io.observe(el);
  }

  /* ══════════════════════════════════════════
     ATTO 00 — occhio ASCII
     ══════════════════════════════════════════ */

  (function eye() {
    const cv = document.getElementById('asciiEye');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, cw = 9, chh = 13, cols = 0, rows = 0;
    let on = true;
    let blink = 1, nextBlink = 2.2, blinkPhase = 0;
    const CHARS = ' .·:-=+*#%@';

    function measure() {
      const s = fit(cv);
      w = s.w; h = s.h;
      const cell = Math.max(6, Math.min(10, w / 195));
      cw = cell; chh = cell * 1.35;
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / chh);
      ctx.font = `${chh * 0.86}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }
    measure();
    window.addEventListener('resize', measure);

    // campo dell'occhio: 0..1 di luminosità
    function field(x, y) {
      // x,y in -1..1 (y già corretto per aspect)
      const px = x * 1.0;
      const py = y * 1.35;
      const irisX = (mouse.x - 0.5) * 0.30;
      const irisY = (mouse.y - 0.5) * 0.16;

      // palpebra: mandorla
      const lidOuter = 0.62 * Math.pow(Math.max(0, 1 - px * px), 0.72);
      const upper = -lidOuter * (0.86 + irisY * 0.2);
      const lower = lidOuter * 0.62 * blink;

      if (py < upper || py > lower) return 0;
      const inside = 1 - Math.abs(py - (upper + lower) / 2) / Math.max(0.001, (lower - upper) / 2);

      // iride + pupilla
      const dx = px - irisX, dy = py - irisY;
      const d = Math.sqrt(dx * dx + dy * dy * 1.6);
      const irisR = 0.34;
      const pupilR = 0.13;

      let v = 0.06 + inside * 0.10;                      // sclera tenue
      if (d < irisR) {
        const t = 1 - d / irisR;
        v = 0.35 + 0.5 * t;                              // iride
        const ang = Math.atan2(dy, dx);
        v += Math.sin(ang * 26 + d * 44) * 0.10 * t;     // fibre dell'iride
      }
      if (d < pupilR) v = 0.06;                          // pupilla nera
      // riflesso
      const hx = irisX - 0.09, hy = irisY - 0.10;
      const dh = Math.hypot(px - hx, py - hy);
      if (dh < 0.075) v = 1;
      // anello luminoso del limbo
      if (Math.abs(d - irisR) < 0.028) v = Math.max(v, 0.85);
      // ciglia
      if (py < upper + 0.035) v = Math.max(v, 0.5);
      return Math.min(1, v);
    }

    let last = 0;
    function draw(t) {
      requestAnimationFrame(draw);
      if (!on) return;
      if (t - last < 1000 / 26) return;
      last = t;

      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      // blink
      const time = t * 0.001;
      if (time > nextBlink && blinkPhase === 0) blinkPhase = 0.0001;
      if (blinkPhase > 0) {
        blinkPhase += 0.012;
        blink = Math.max(0.04, Math.abs(Math.cos(Math.min(Math.PI, blinkPhase * Math.PI))));
        if (blinkPhase >= 1) { blinkPhase = 0; blink = 1; nextBlink = time + 3.8 + Math.random() * 4; }
      }

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const scaleX = w * 0.47;
      const scaleY = h * 0.74;

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const nx = (i / cols - 0.5) * 2;
          const ny = (j / rows - 0.5) * 2;
          const v = field(nx * 1.06, ny * 1.06);
          if (v < 0.045) continue;
          const idx = Math.min(CHARS.length - 1, Math.floor(v * CHARS.length));
          const chr = CHARS[idx];
          if (chr === ' ') continue;
          const alpha = 0.14 + v * 0.9;
          const gold = Math.abs(nx * 1.12 - (mouse.x - .5) * .3) < 0.36 && v > 0.3;
          ctx.fillStyle = gold
            ? `rgba(240,223,180,${alpha})`
            : `rgba(236,232,223,${alpha})`;
          ctx.fillText(chr, i * cw + cw / 2, j * chh + chh / 2);
        }
      }
    }
    visible(cv, (v) => { on = v; });
    if (reduce) { blink = 1; }
    requestAnimationFrame(draw);
  })();

  /* ══════════════════════════════════════════
     ATTO 07 — ritratto di particelle
     ══════════════════════════════════════════ */

  (function portrait() {
    const cv = document.getElementById('particlePortrait');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let pts = [], W = 2, H = 2;
    let progress = 0, targetProgress = 0;
    let on = true;
    const N = window.innerWidth < 760 ? 7000 : 17000;

    // busto in profilo, rivolto a sinistra — spazio 450×450
    const PROFILE = new Path2D(
      'M300 40 ' +
      'C190 40 142 96 138 160 ' +
      'C136 180 128 190 132 206 ' +   // sopracciglio
      'C120 224 104 246 112 258 ' +   // naso
      'C116 266 132 262 134 270 ' +   // sotto il naso
      'C126 276 124 284 134 290 ' +   // labbra
      'C140 298 134 312 146 322 ' +   // mento
      'C156 332 180 346 198 356 ' +   // mandibola
      'C206 362 208 376 206 392 ' +   // collo
      'C204 404 180 410 120 420 ' +   // spalla sinistra
      'L60 450 L390 450 ' +           // base
      'C392 420 356 408 336 400 ' +   // spalla destra
      'C324 396 318 384 317 370 ' +   // collo posteriore
      'C315 336 332 306 334 252 ' +   // nuca
      'C342 228 354 152 341 102 ' +   // vertice posteriore
      'C334 72 318 46 300 40 Z'
    );

    function build() {
      const s = fit(cv);
      W = s.w; H = s.h;

      const off = document.createElement('canvas');
      const scale = 0.5;
      off.width = 450 * scale;
      off.height = 450 * scale;
      const octx = off.getContext('2d');
      octx.fillStyle = '#fff';
      octx.save();
      octx.scale(scale, scale);
      octx.fill(PROFILE);
      octx.restore();
      const data = octx.getImageData(0, 0, off.width, off.height).data;

      // candidati: prima il bordo (per leggere il profilo), poi il pieno
      const edge = [];
      const inner = [];
      const W2 = off.width, H2 = off.height;
      const alpha = (x, y) => (x < 0 || y < 0 || x >= W2 || y >= H2) ? 0 : data[(y * W2 + x) * 4 + 3];
      for (let y = 1; y < H2 - 1; y++) {
        for (let x = 1; x < W2 - 1; x++) {
          if (alpha(x, y) > 120) {
            const isEdge = alpha(x + 1, y) <= 120 || alpha(x - 1, y) <= 120 ||
                           alpha(x, y + 1) <= 120 || alpha(x, y - 1) <= 120 ||
                           alpha(x + 2, y) <= 120 || alpha(x - 2, y) <= 120 ||
                           alpha(x, y + 2) <= 120 || alpha(x, y - 2) <= 120;
            (isEdge ? edge : inner).push([x, y]);
          }
        }
      }
      const cand = edge.concat(inner);

      // mappa nel viewport: alto a destra, grande
      const fitScale = Math.min((W * 0.78) / (450 * scale), (H * 0.96) / (450 * scale));
      const ox = W * 0.5 - (225 * scale) * fitScale + W * 0.07;
      const oy = H * 0.5 - (235 * scale) * fitScale;

      pts = [];
      for (let i = 0; i < N; i++) {
        const pool = Math.random() < 0.78 ? edge : (inner.length ? inner : edge);
        const c = pool[(Math.random() * pool.length) | 0];
        pts.push({
          tx: ox + c[0] * fitScale,
          ty: oy + c[1] * fitScale,
          x: Math.random() * W,
          y: Math.random() * H,
          vx: 0, vy: 0,
          r: 0.5 + Math.random() * 1.4,
          gold: Math.random() < 0.16,
          edge: pool === edge,
          a: 0.25 + Math.random() * 0.75,
        });
      }
    }
    build();
    let rT;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(build, 150); });

    const mousePx = { x: -9999, y: -9999 };
    cv.parentElement.addEventListener('mousemove', (e) => {
      const r = cv.getBoundingClientRect();
      mousePx.x = e.clientX - r.left;
      mousePx.y = e.clientY - r.top;
    });
    cv.parentElement.addEventListener('mouseleave', () => { mousePx.x = -9999; mousePx.y = -9999; });

    let t0 = performance.now();
    function frame(t) {
      requestAnimationFrame(frame);
      if (!on) return;
      progress += (targetProgress - progress) * 0.05;
      const e = progress * progress * (3 - 2 * progress);

      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.x === 0 && p.y === 0) { p.x = Math.random() * W; p.y = Math.random() * H; }

        // bersaglio interpolato tra caos e volto
        const jitterX = Math.sin(t * 0.0006 + i) * 6 * (1 - e);
        const jitterY = Math.cos(t * 0.0005 + i * 1.7) * 6 * (1 - e);
        const tx = p.tx + jitterX + (1 - e) * (Math.random() - 0.5) * 0.4;
        const ty = p.ty + jitterY + (1 - e) * (Math.random() - 0.5) * 0.4;

        p.vx += (tx - p.x) * (0.022 + 0.16 * e);
        p.vy += (ty - p.y) * (0.022 + 0.16 * e);

        // repulsione dal mouse
        const dx = p.x - mousePx.x;
        const dy = p.y - mousePx.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 120) * 2.6;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx *= 0.90; p.vy *= 0.90;
        p.x += p.vx; p.y += p.vy;

        // quando il volto è formato: micro-vibrazione attorno al bersaglio
        if (e > 0.75) {
          const k = e * 0.35;
          p.x = p.tx + (p.x - p.tx) * (1 - k * 0.06);
          p.y = p.ty + (p.y - p.ty) * (1 - k * 0.06);
        }

        const size = p.r * (0.75 + e * 0.85) * (p.edge ? 1.25 : 0.85);
        ctx.fillStyle = p.gold
          ? `rgba(240,223,180,${p.a * (0.4 + e * 0.6)})`
          : p.edge ? `rgba(236,217,168,${p.a * (0.3 + e * 0.7)})` : `rgba(232,228,220,${p.a * (0.10 + e * 0.38)})`;
        ctx.fillRect(p.x, p.y, size, size);
      }
      ctx.globalCompositeOperation = 'source-over';

    }
    requestAnimationFrame(frame);
    visible(cv, (v) => { on = v; });

    window.SpecchioPortrait = {
      set(p) { targetProgress = Math.max(0, Math.min(1, p)); },
    };
  })();

  /* ══════════════════════════════════════════
     ATTO 14 — tunnel di glifi
     ══════════════════════════════════════════ */

  (function mirror() {
    const cv = document.getElementById('asciiMirror');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    let w = 0, h = 0, cw = 10, chh = 14, cols = 0, rows = 0;
    let on = true;
    const CHARS = ' .·:+=xX#%@&';

    function measure() {
      const s = fit(cv);
      w = s.w; h = s.h;
      const cell = Math.max(8, Math.min(13, w / 120));
      cw = cell; chh = cell * 1.35;
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / chh);
      ctx.font = `${chh * 0.82}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
    }
    measure();
    window.addEventListener('resize', measure);

    let last = 0;
    function draw(t) {
      requestAnimationFrame(draw);
      if (!on) return;
      if (t - last < 1000 / 18) return;
      last = t;
      const time = t * 0.001;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const maxR = Math.hypot(cx, cy);

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * cw + cw / 2;
          const y = j * chh + chh / 2;
          const dx = (x - cx) / maxR;
          const dy = (y - cy) / maxR;
          const r = Math.hypot(dx, dy);
          const ang = Math.atan2(dy, dx);

          // anelli che scorrono verso lo spettatore
          const wave = Math.sin(r * 26 - time * 2.2 + Math.sin(ang * 4 + time * 0.4) * 0.7);
          let v = (wave * 0.5 + 0.5) * (1 - r * 0.85);
          v = Math.pow(Math.max(0, v), 1.4);

          // alone centrale
          const glow = Math.max(0, 1 - r * 2.6);
          v = Math.max(v, glow * (0.55 + 0.3 * Math.sin(time * 1.7)));

          if (v < 0.06) continue;
          const chr = CHARS[Math.min(CHARS.length - 1, Math.floor(v * CHARS.length))];
          if (chr === ' ') continue;
          const a = Math.min(0.85, v * 0.9);
          ctx.fillStyle = `rgba(236,217,168,${a})`;
          ctx.fillText(chr, x, y);
        }
      }
    }
    visible(cv, (v) => { on = v; });
    requestAnimationFrame(draw);
  })();

})();
