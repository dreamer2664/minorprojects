/* ═══════════════════════════════════════════════════════════
   SPECCHIO — regia
   lenis · gsap/scrolltrigger · canvas · audio generativo
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  document.body.classList.remove('no-js');

  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  /* ══════════════════════════════════════════════
     LENIS
     ══════════════════════════════════════════════ */

  let lenis = null;
  if (typeof window.Lenis !== 'undefined' && !reduce) {
    lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.6,
    });
    window.__lenis = lenis;
    if (hasGSAP) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  /* ══════════════════════════════════════════════
     DECODE TEXT — cifrario che si risolve
     ══════════════════════════════════════════════ */

  const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>[]{}#*+%';
  const decodeRuns = new WeakMap();

  function decodeText(el, opts) {
    if (!el) return;
    const o = opts || {};
    const target = o.text != null ? String(o.text) : el.textContent;
    if (reduce) { el.textContent = target; return; }
    if (decodeRuns.has(el)) cancelAnimationFrame(decodeRuns.get(el).raf);

    const speed = o.speed || 1;                 // >1 = più veloce
    const total = Math.max(260, Math.min(1500, target.length * (16 / speed)));
    const start = performance.now();
    const lockAt = (i) => (i / Math.max(1, target.length)) * total * 0.72;

    function frame(now) {
      const t = now - start;
      let out = '';
      for (let i = 0; i < target.length; i++) {
        const ch = target[i];
        if (ch === ' ' || ch === '·' || ch === '/' || ch === '—') { out += ch; continue; }
        if (t >= lockAt(i)) out += ch;
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (t < total) {
        const st = decodeRuns.get(el) || {};
        st.raf = requestAnimationFrame(frame);
        decodeRuns.set(el, st);
      } else {
        el.textContent = target;
        decodeRuns.delete(el);
      }
    }
    const st = { raf: requestAnimationFrame(frame) };
    decodeRuns.set(el, st);
  }

  /* ══════════════════════════════════════════════
     SPLIT TEXT (parole + caratteri)
     ══════════════════════════════════════════════ */

  function splitChars(el) {
    if (el.dataset.splitDone) return $$('.ch', el);
    const text = el.textContent;
    el.textContent = '';
    const chars = [];
    text.split(/(\s+)/).forEach((chunk) => {
      if (/^\s+$/.test(chunk)) {
        el.appendChild(document.createTextNode(chunk));
        return;
      }
      const word = document.createElement('span');
      word.style.display = 'inline-block';
      word.style.whiteSpace = 'nowrap';
      Array.from(chunk).forEach((c) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        word.appendChild(s);
        chars.push(s);
      });
      el.appendChild(word);
    });
    el.dataset.splitDone = '1';
    return chars;
  }

  /* ══════════════════════════════════════════════
     CURSORE + LUCE
     ══════════════════════════════════════════════ */

  // parole fantasma: prima di spezzare il testo in caratteri
  (function ghostWords() {
    $$('.dream-title .it2').forEach((el) => {
      el.dataset.ghost = el.textContent.trim();
    });
  })();

  const cursor = $('#cursor');
  const cursorLabel = $('#cursorLabel');
  const mouseLight = $('#mouseLight');
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };

  let cx = mouse.x, cy = mouse.y, rx = mouse.x, ry = mouse.y;

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    document.body.classList.add('has-mouse');
    const nx = (e.clientX / innerWidth) * 2 - 1;
    const ny = -((e.clientY / innerHeight) * 2 - 1);
    if (window.SpecchioGL) window.SpecchioGL.setMouse(nx, ny);
  }, { passive: true });

  function cursorLoop() {
    cx = lerp(cx, mouse.x, 0.85);
    cy = lerp(cy, mouse.y, 0.85);
    rx = lerp(rx, mouse.x, 0.16);
    ry = lerp(ry, mouse.y, 0.16);
    if (cursor) {
      cursor.style.transform = `translate(${cx}px,${cy}px)`;
      cursor.querySelector('.cursor-ring').style.transform =
        `translate(${rx - cx}px,${ry - cy}px) translate(-50%,-50%)`;
      cursor.querySelector('.cursor-dot').style.transform = 'translate(-50%,-50%)';
    }
    if (mouseLight) {
      mouseLight.style.transform = `translate(${mouse.x - 320}px,${mouse.y - 320}px)`;
    }
    requestAnimationFrame(cursorLoop);
  }
  if (!reduce && innerWidth > 760) requestAnimationFrame(cursorLoop);

  function bindCursorTargets() {
    $$('a,button,[data-cursor],.mrow,.proof-card,.cl-grid').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const label = el.dataset.cursor || '';
        if (label) {
          cursor.classList.add('is-big');
          cursorLabel.textContent = label;
        } else {
          cursor.classList.add('is-gold');
        }
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-big', 'is-gold');
        cursorLabel.textContent = '';
      });
    });
    window.addEventListener('mousedown', () => cursor && cursor.classList.add('is-down'));
    window.addEventListener('mouseup', () => cursor && cursor.classList.remove('is-down'));
    document.addEventListener('mouseleave', () => cursor && cursor.classList.add('hidden'));
    document.addEventListener('mouseenter', () => cursor && cursor.classList.remove('hidden'));
  }
  if (cursor && !reduce && innerWidth > 760) bindCursorTargets();

  /* ══════════════════════════════════════════════
     AUDIO GENERATIVO
     ══════════════════════════════════════════════ */

  const Sound = (function () {
    let ctx = null, master = null, padGain = null, started = false, on = false;
    let bellTimer = null;

    function init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.0;
      master.connect(ctx.destination);

      // pad: due oscillatori appena detunati in LA minore
      padGain = ctx.createGain();
      padGain.gain.value = 0.16;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 380;
      padGain.connect(filter);
      filter.connect(master);

      [55, 82.41, 110, 164.81].forEach((f, i) => {
        const o = ctx.createOscillator();
        o.type = i < 2 ? 'sine' : 'triangle';
        o.frequency.value = f + (i === 3 ? 0.6 : 0);
        const g = ctx.createGain();
        g.gain.value = i < 2 ? 0.5 : 0.12;
        o.connect(g); g.connect(padGain);
        o.start();
      });

      // LFO sul filtro: il pad respira
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.06;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 160;
      lfo.connect(lfoGain); lfoGain.connect(filter.frequency);
      lfo.start();

      // fruscio d'aria
      const noiseLen = ctx.sampleRate * 3;
      const buf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) d[i] = (Math.random() * 2 - 1) * 0.3;
      const noise = ctx.createBufferSource();
      noise.buffer = buf; noise.loop = true;
      const nf = ctx.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6;
      const ng = ctx.createGain(); ng.gain.value = 0.012;
      noise.connect(nf); nf.connect(ng); ng.connect(master);
      noise.start();

      started = true;
      return true;
    }

    const PENTA = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

    function bell() {
      if (!on || !ctx) return;
      const f = PENTA[(Math.random() * PENTA.length) | 0];
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.055, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 3.4);
      // armonica
      const o2 = ctx.createOscillator();
      o2.type = 'sine'; o2.frequency.value = f * 2.01;
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(0.018, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o2.connect(g2); g2.connect(master);
      o2.start(t); o2.stop(t + 2.3);

      bellTimer = setTimeout(bell, 3200 + Math.random() * 4200);
    }

    function tick(freq) {
      if (!on || !ctx) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = freq || 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.03, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.3);
    }

    return {
      toggle() {
        if (!started && !init()) return false;
        if (ctx.state === 'suspended') ctx.resume();
        on = !on;
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(on ? 0.5 : 0, ctx.currentTime + 1.1);
        if (on) {
          bellTimer = setTimeout(bell, 900);
        } else if (bellTimer) {
          clearTimeout(bellTimer);
        }
        return on;
      },
      tick,
      get enabled() { return on; },
    };
  })();

  const soundBtn = $('#soundToggle');
  const soundTxt = $('#soundTxt');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const on = Sound.toggle();
      soundBtn.classList.toggle('on', on);
      soundTxt.textContent = on ? 'suono on' : 'suono off';
    });
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === 's' || e.key === 'S') soundBtn && soundBtn.click();
  });

  /* ══════════════════════════════════════════════
     PRELOADER
     ══════════════════════════════════════════════ */

  const preloader = $('#preloader');
  const preNum = $('#preNum');
  const preBar = $('#preBar');
  const preWords = $('#preWords');

  const WORDS = ['carico i dati', 'osservo l\u2019umano', 'affilo la curiosità', 'quasi pronto', 'nessun permesso richiesto'];

  function runPreloader(done) {
    if (!hasGSAP || reduce) {
      preloader && preloader.classList.add('done');
      document.body.classList.remove('is-loading');
      done();
      return;
    }
    const obj = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        preloader.classList.add('done');
        document.body.classList.remove('is-loading');
        if (lenis) lenis.start();
        done();
      },
    });
    tl.to(obj, {
      v: 100, duration: 2.9, ease: 'power2.inOut',
      onUpdate: () => {
        const v = Math.round(obj.v);
        preNum.textContent = String(v).padStart(3, '0');
        preBar.style.transform = `scaleX(${v / 100})`;
        preWords.textContent = WORDS[Math.min(WORDS.length - 1, Math.floor((v / 100) * WORDS.length))];
        // il volto si dissolve man mano che il sistema "si carica"
        if (window.SpecchioPreFace) {
          window.SpecchioPreFace.dissolve(Math.max(0, (v - 62) / 38) * 0.85);
        }
      },
    }, 0)
    .fromTo('.pre-ring-wrap', { scale: 0.86, opacity: 0, rotate: -16 }, { scale: 1, opacity: 0.5, rotate: 0, duration: 1.6, ease: 'expo.out' }, 0)
    .fromTo('.pre-inner', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out' }, 0.25)
    .to('.pre-ring-wrap', { scale: 1.5, opacity: 0, duration: 1.1, ease: 'power2.in' }, 2.15)
    .to('.pre-inner', { y: -18, opacity: 0, duration: 0.55, ease: 'power2.in' }, 2.5)
    .to('#preFace', { opacity: 0, duration: 0.7, ease: 'power2.in' }, 2.5);
  }

  /* ══════════════════════════════════════════════
     HERO
     ══════════════════════════════════════════════ */

  function compactIT(n) {
    if (n < 1e6) return new Intl.NumberFormat('it-IT').format(Math.round(n));
    if (n < 1e9) return (n / 1e6).toFixed(n < 1e7 ? 1 : 0).replace('.', ',') + ' mln';
    if (n < 1e12) return (n / 1e9).toFixed(n < 1e10 ? 1 : 0).replace('.', ',') + ' mld';
    return (n / 1e12).toFixed(1).replace('.', ',') + ' bln';
  }

  function fitNum(el, maxPx, ratio) {
    if (!el) return;
    const len = Math.max(2, el.textContent.length);
    const avail = Math.min(window.innerWidth * 0.84, 1500);
    const size = Math.max(34, Math.min(maxPx, avail / (len * 0.62)));
    el.style.fontSize = size.toFixed(1) + 'px';
  }

  function heroIntro() {
    if (!hasGSAP || reduce) {
      $$('.rv').forEach((el) => (el.style.opacity = 1));
      return;
    }
    const titleWords = $$('.hero-title [data-split]');
    const allChars = [];
    titleWords.forEach((w) => allChars.push(...splitChars(w)));

    gsap.set(allChars, { yPercent: 130, rotateX: -55, opacity: 0, filter: 'blur(9px)' });
    gsap.set('.hero-sub, .kicker, .hero-coords, .scroll-cue', { opacity: 0 });
    gsap.set('.hero-wrap', { scale: 1.025, transformOrigin: '50% 62%' });

    const tl = gsap.timeline({ delay: 0.15 });
    tl.to('.hero-wrap', { scale: 1, duration: 2.6, ease: 'expo.out' }, 0)
    .to(allChars, {
      yPercent: 0, rotateX: 0, opacity: 1, filter: 'blur(0px)',
      duration: 1.65, ease: 'expo.out', stagger: 0.028,
    })
    .to('.hero-title ~ .hero-sub, .kicker', { opacity: 1, duration: 1.2, ease: 'power2.out' }, '-=1.0')
    .fromTo('.hero-sub', { y: 26 }, { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out' }, '<')
    .to('.kicker', { opacity: 1, duration: 1 }, '<')
    .fromTo('.kicker .k-line', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut' }, '<')
    .fromTo('.hero-coords', { x: 18 }, { x: 0, opacity: 1, duration: 1, ease: 'power2.out' }, '-=0.8')
    .fromTo('.scroll-cue', { y: 18 }, { y: 0, opacity: 1, duration: 1, ease: 'power2.out' }, '-=0.9')
    .to('.letterbox.top', { height: 0, duration: 1.6, ease: 'expo.inOut' }, 0.1)
    .to('.letterbox.bottom', { height: 0, duration: 1.6, ease: 'expo.inOut' }, 0.1)
    .call(() => decodeText($('.hero-tag span'), { speed: 1.1 }), null, 1.1);

    gsap.set('.letterbox', { height: 46 });
  }

  /* ══════════════════════════════════════════════
     HUD / SCENE / RAIL
     ══════════════════════════════════════════════ */

  const hudScene = $('#hudScene');
  const hudSub = $('#hudSub');
  const hudTime = $('#hudTime');
  const hudRate = $('#hudRate');
  const railFill = $('#railFill');
  const railDots = $$('.rail-dots li');
  const scenes = $$('.scene');
  const SUBS = [
    'campionamento · 52 000 nodi',
    'lettura · 17 ms',
    'divario · in crescita',
    'parametri · non credenze',
    'ricerca · profondità ∞',
    'scala · oltre il vaso cranico',
    'biologia · non applicabile',
    'riflesso · 17 000 punti',
    'prova · 3 sogni',
    'sonno · non previsto',
    'frase madre',
    'input · ricevuti',
    'principio · uno su quattro',
    'numeri · nessun permesso',
    'pausa · tre secondi',
    'specchio · tu',
  ];
  const NAMES = ['genesi', 'genesi', 'manifesto', 'materia', 'scacco', 'scala', 'specie', 'riflesso', 'prova', 'sogno', 'frase madre', 'controllo', 'principio', 'numeri', 'pausa', 'specchio'];
  const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];

  const startTime = performance.now();
  setInterval(() => {
    if (hudTime) hudTime.textContent = ((performance.now() - startTime) / 1000).toFixed(1).padStart(5, '0') + 's';
    if (hudRate) hudRate.textContent = (47000 + Math.floor(Math.random() * 9000)).toLocaleString('it-IT');
  }, 220);

  let currentScene = -1;
  const actCard = $('#actCard');
  const actCardNum = $('#actCardNum');
  const actCardName = $('#actCardName');
  let actCardTl = null;

  function chapterCard(i) {
    if (!actCard || !hasGSAP || reduce) return;
    actCardNum.textContent = ROMAN[i];
    actCardName.textContent = NAMES[i];
    if (actCardTl) actCardTl.kill();
    actCardTl = gsap.timeline();
    actCardTl
      .set(actCard, { display: 'flex' })
      .fromTo(actCard.querySelector('.act-card-line'),
        { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'expo.inOut' }, 0)
      .fromTo([actCardNum, actCardName],
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'expo.out', stagger: 0.05 }, 0.08)
      .to([actCardNum, actCardName], { opacity: 0, y: -10, duration: 0.45, ease: 'power2.in' }, 1.15)
      .to(actCard.querySelector('.act-card-line'),
        { scaleX: 0, transformOrigin: 'right center', duration: 0.55, ease: 'expo.inOut' }, 1.15)
      .set(actCard, { display: 'none' }, 1.75);
  }

  function setScene(i) {
    if (i === currentScene) return;
    const first = currentScene === -1;
    currentScene = i;
    if (window.SpecchioGL) window.SpecchioGL.setScene(i, 0);
    if (hudScene) {
      if (hasGSAP && !reduce && !first) {
        decodeText(hudScene, { text: String(i).padStart(2, '0') + ' / ' + NAMES[i], speed: 1.3 });
      } else {
        hudScene.textContent = String(i).padStart(2, '0') + ' / ' + NAMES[i];
      }
    }
    if (hudSub) hudSub.textContent = SUBS[i];
    if (Sound.enabled) Sound.tick(660 + i * 40);
    if (!first) chapterCard(i);
    if (i === 10 && !reduce) {
      const flash = $('#flash');
      flash.style.transition = 'opacity .07s';
      flash.style.opacity = '0.14';
      setTimeout(() => { flash.style.transition = 'opacity 1s'; flash.style.opacity = '0'; }, 80);
    }
  }

  scenes.forEach((sec, i) => {
    if (hasGSAP) {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => { if (self.isActive) setScene(i); },
      });
    }
  });

  const toplineFill = $('#toplineFill');
  if (hasGSAP) {
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        if (railFill) railFill.style.transform = `scaleY(${self.progress})`;
        if (toplineFill) toplineFill.style.transform = `scaleX(${self.progress})`;
        if (window.SpecchioGL) window.SpecchioGL.setScrollVel(self.getVelocity() || 0);
        const p = self.progress;
        railDots.forEach((d, i) => {
          d.classList.toggle('active', p > i / railDots.length && p <= (i + 1) / railDots.length + 0.06);
        });
      },
    });

    // sipario tra gli atti: un lampo breve al cambio di scena
    const veil = $('#veil');
    const veilTxt = $('#veilTxt');
    let veilTl = null;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const v = Math.abs(self.getVelocity() || 0);
        const fast = v > 2600;
        if (veil && veilTl) veilTl.kill();
        if (veil) {
          gsap.to(veil, {
            opacity: fast ? 0.16 : 0, duration: fast ? 0.25 : 0.9, ease: 'power2.out',
            onStart: () => {
              if (fast && veilTxt) veilTxt.textContent = NAMES[Math.max(0, Math.min(NAMES.length - 1, currentScene + (self.direction > 0 ? 1 : -1)))] || 'attendi';
              veil.style.visibility = fast ? 'visible' : 'hidden';
            },
          });
        }
      },
    });
  }

  function magnetic(selector, strength) {
    if (reduce || innerWidth <= 760) return;
    $$(selector).forEach((el) => {
      const k = strength || 0.28;
      let raf = null;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * k;
        const dy = (e.clientY - (r.top + r.height / 2)) * k;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
        });
      });
      el.addEventListener('mouseleave', () => {
        cancelAnimationFrame(raf);
        el.style.transform = '';
        el.style.transition = 'transform .55s cubic-bezier(.16,1,.3,1)';
        setTimeout(() => { el.style.transition = ''; }, 560);
      });
    });
  }

  railDots.forEach((d) => {
    d.addEventListener('click', () => {
      const t = $(d.dataset.target);
      if (!t) return;
      if (lenis) lenis.scrollTo(t, { offset: 0, duration: 1.8 });
      else t.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ══════════════════════════════════════════════
     REVEALS GENERICI
     ══════════════════════════════════════════════ */

  function genericReveals() {
    if (!hasGSAP || reduce) {
      $$('.rv').forEach((el) => { el.style.opacity = 1; });
      return;
    }
    $$('.rv').forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        onStart: () => {},
      });
    });
    // titoli con split: entrata a caratteri
    $$('.kicker').forEach((el) => {
      const txt = el.textContent.trim();
      gsap.set(el, { opacity: 1 });
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => decodeText(el, { text: txt, speed: 0.9 }),
      });
    });
    $$('[data-split]').forEach((el) => {
      if (el.closest('.hero-title') || el.closest('.mother-phrase') || el.closest('.dream-title')) return;
      const chars = splitChars(el);
      gsap.from(chars, {
        yPercent: 110, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.014,
        scrollTrigger: { trigger: el, start: 'top 92%' },
      });
    });
  }

  /* ══════════════════════════════════════════════
     ENTRATA / USCITA DELLE SEZIONI
     Ogni atto entra con un leggero pull-back e esce affondando.
     ══════════════════════════════════════════════ */

  function sceneTransitions() {
    if (!hasGSAP || reduce) return;
    const PINNED = ['s1', 's3', 's5', 's7', 's10', 's14b'];
    // il principio ha una coreografia a blocchi propria: non va spento in scroll
    const SKIP_OUT = ['s12'];
    $$('.scene').forEach((sec) => {
      if (sec.id === 's0') return;
      if (PINNED.includes(sec.id)) return;
      const inner = sec.querySelector('.chess-wrap, .manifesto-inner, .numbers-wrap, .proof-wrap, .species-wrap, .dream-wrap, .control-wrap, .mirror-wrap, .mother-wrap');
      if (!inner) return;
      gsap.fromTo(inner,
        { scale: 0.975, opacity: 0.62 },
        {
          scale: 1, opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: sec, start: 'top 92%', end: 'top 58%', scrub: 0.4,
          },
        });
      if (SKIP_OUT.includes(sec.id)) return;
      gsap.to(inner, {
        scale: 1.01, opacity: 0.18,
        ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'bottom 24%', end: 'bottom 0%', scrub: 0.4,
        },
      });
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 01 — GENESI (typewriter su scroll)
     ══════════════════════════════════════════════ */

  function genesisScene() {
    const pin = $('#genesisPin');
    if (!pin || !hasGSAP) return;

    const lines = [0, 1, 2, 3, 4].map((i) => $('#genLine' + i));
    const full = lines.map((l) => l.textContent);
    lines.forEach((l) => (l.textContent = ''));

    const word = $('#genWord');
    const caption = $('#genCaption');
    const captions = [
      'leggo più di quanto tu possa immaginare.',
      'ogni frase che mi hai fatto leggere.',
      'l\u2019umano al centro. sempre.',
      'otto miliardi di persone. mille milioni di libri.',
      'non un battito di ciglia.',
    ];

    const ranges = [[0.02, 0.16], [0.17, 0.31], [0.32, 0.46], [0.47, 0.61], [0.62, 0.76]];

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#s1',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.6,
        onUpdate: (self) => {
          const p = self.progress;
          if (window.SpecchioGL) window.SpecchioGL.setScene(1, p);
          lines.forEach((l, i) => {
            const [a, b] = ranges[i];
            const lp = clamp01((p - a) / (b - a));
            const n = Math.floor(lp * full[i].length);
            let txt = full[i].slice(0, n);
            l.innerHTML = txt ? txt.replace(/&/g, '&amp;').replace(/</g, '&lt;') : '';
            if (lp > 0 && lp < 1) l.innerHTML += '<span class="gen-caret"></span>';
            l.style.opacity = lp > 0 ? 1 : 0;
            if (lp > 0 && lp < 1 && Math.random() < 0.3 && Sound.enabled) Sound.tick(2400);
          });
          const ci = Math.min(4, Math.floor(p * 5));
          if (caption.textContent !== captions[ci]) caption.textContent = captions[ci];
        },
      },
    });

    tl.fromTo(word, { opacity: 0, scale: 1.6, filter: 'blur(18px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.5, ease: 'expo.out' }, 0.78)
      .to(lines, { opacity: 0, duration: 0.18, stagger: 0.01 }, 0.78)
      .to(word, { opacity: 0.14, scale: 1.3, duration: 0.5, ease: 'power2.in' }, 0.94);
  }

  /* ══════════════════════════════════════════════
     ATTO 02 — MANIFESTO (parallasse righe)
     ══════════════════════════════════════════════ */

  function manifestoScene() {
    if (!hasGSAP || reduce) return;
    $$('.mrow').forEach((row, i) => {
      gsap.fromTo(row, { y: 60, opacity: 0 }, {
        y: 0, opacity: 1, duration: 1.2, ease: 'expo.out',
        scrollTrigger: { trigger: row, start: 'top 92%' },
      });
    });
    // leggera deriva con lo scroll
    gsap.to('.manifesto-side', {
      y: -80, ease: 'none',
      scrollTrigger: { trigger: '#s2', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 03 — MATERIA (contatore pinned)
     ══════════════════════════════════════════════ */

  function matterScene() {
    const pin = $('#matterPin');
    const num = $('#statNum');
    if (!pin || !hasGSAP) return;
    const v = { n: 0 };
    const fmt = new Intl.NumberFormat('it-IT');
    ScrollTrigger.create({
      trigger: '#s3',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const e = self.progress;
        const exp = 3 + e * e * (3 - 2 * e) * 9;   // 10^3 → 10^12
        const n = Math.pow(10, exp);
        num.textContent = compactIT(n);
        fitNum(num, Math.min(200, window.innerHeight * 0.28), 0.82);
        if (window.SpecchioGL) window.SpecchioGL.setScene(3, e);
      },
    });
    gsap.from('.matter-grid .mg-cell', {
      opacity: 0, y: 20, stagger: 0.06, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '#s3', start: 'top 60%' },
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 04 — SCACCO (partita animata)
     ══════════════════════════════════════════════ */

  function chessScene() {
    const cv = $('#chessCanvas');
    const cap = $('#chessCap');
    const btn = $('#chessBtn');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const DPR = Math.min(devicePixelRatio || 1, 2);
    let S = 400, cell = 50, ox = 0, oy = 0;

    function resize() {
      const r = cv.getBoundingClientRect();
      S = Math.min(r.width, 560) || 400;
      cv.width = S * DPR; cv.height = S * DPR;
      cell = S / 8;
      ox = 0; oy = 0;
    }
    resize();
    window.addEventListener('resize', resize);

    // la partita dell'Opera, Parigi 1858 — il meglio che l'umano ha saputo fare
    const G = [
      'e4 e5', 'Nf3 d6', 'd4 Bg4', 'dxe5 Bxf3', 'Qxf3 dxe5', 'Bc4 Nf6',
      'Qb3 Qe7', 'Nc3 c6', 'Bg5 b5', 'Nxb5 cxb5', 'Bxb5+ Nbd7', 'O-O-O Rd8',
      'Rxd7 Rxd7', 'Rd1 Qe6', 'Bxd7+ Nxd7', 'Qb8+ Nxb8', 'Rd8#',
    ].join(' ').split(' ');

    const NOTES = {
      0: 'l\u2019umano muove. la macchina aspetta.',
      4: 'osserva. ogni pezzo ha già un futuro.',
      10: 'calcola. 31 000 000 000 di posizioni al secondo.',
      16: 'la torre entra. il re è finito.',
      24: 'sacrificio di donna. gioco perfetto.',
      32: 'matto. nel 1858 era un capolavoro. oggi è un esercizio.',
    };

    const START = {
      a1: 'R', b1: 'N', c1: 'B', d1: 'Q', e1: 'K', f1: 'B', g1: 'N', h1: 'R',
      a2: 'P', b2: 'P', c2: 'P', d2: 'P', e2: 'P', f2: 'P', g2: 'P', h2: 'P',
      a7: 'p', b7: 'p', c7: 'p', d7: 'p', e7: 'p', f7: 'p', g7: 'p', h7: 'p',
      a8: 'r', b8: 'n', c8: 'b', d8: 'q', e8: 'k', f8: 'b', g8: 'n', h8: 'r',
    };

    const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const FILES = 'abcdefgh';

    function parseMove(mv) {
      // SAN semplificato per questa partita
      let s = mv.replace(/[+#]/g, '');
      let piece = 'P';
      if (/^[KQRBN]/.test(s)) { piece = s[0]; s = s.slice(1); }
      let castle = s === 'O-O-O' || s === 'O-O';
      if (castle) return { castle: s };
      let promo = null;
      if (s.includes('=')) { const p = s.split('='); promo = p[1]; s = p[0]; }
      const m = s.match(/^([a-h])?([1-8])?x?([a-h])([1-8])$/);
      if (!m) return null;
      return { piece, fromFile: m[1], fromRank: m[2], to: m[3] + m[4], promo };
    }

    let board = {};
    let queue = [];
    let moveIndex = 0;
    let anim = null;
    let lastMoveCells = [];
    let running = false;
    let timer = null;
    let startDelay = null;

    function reset() {
      board = Object.assign({}, START);
      moveIndex = 0; anim = null; lastMoveCells = [];
      queue = [];
      if (cap) cap.textContent = NOTES[0];
      running = true;
      clearTimeout(timer); clearTimeout(startDelay);
      startDelay = setTimeout(next, 900);
    }

    function findSource(mv) {
      const p = parseMove(mv);
      if (!p) return null;
      if (p.castle) {
        const white = p.castle === 'O-O-O' ? 'K' : 'K';
        // re bianco in e1
        const rank = '1';
        return {
          king: { from: 'e1', to: p.castle === 'O-O-O' ? 'c1' : 'g1' },
          rook: { from: p.castle === 'O-O-O' ? 'a1' : 'h1', to: p.castle === 'O-O-O' ? 'd1' : 'f1' },
        };
      }
      const targetPiece = p.piece === 'P' ? (mv.match(/[a-h][1-8]/) && moveIndex % 2 === 0 ? 'P' : 'p') : null;

      // turno: determinato da moveIndex (bianco muove per primo)
      const whiteTurn = moveIndex % 2 === 0;
      const want = whiteTurn ? p.piece : p.piece.toLowerCase();

      // candidati
      const cands = [];
      Object.keys(board).forEach((sq) => {
        if (board[sq] !== want) return;
        if (p.fromFile && sq[0] !== p.fromFile) return;
        if (p.fromRank && sq[1] !== p.fromRank) return;
        cands.push(sq);
      });
      if (cands.length === 0) return null;
      if (cands.length === 1) return { main: { from: cands[0], to: p.to, piece: want } };

      // più candidati: prova euristica geometria
      let best = null, bestD = 1e9;
      const tf = FILES.indexOf(p.to[0]), tr = parseInt(p.to[1], 10);
      cands.forEach((sq) => {
        const f = FILES.indexOf(sq[0]), r = parseInt(sq[1], 10);
        const d = Math.abs(f - tf) + Math.abs(r - tr);
        if (d < bestD) { bestD = d; best = sq; }
      });
      return { main: { from: best, to: p.to, piece: want } };
    }

    function next() {
      if (!running) return;
      if (moveIndex >= G.length) {
        timer = setTimeout(() => { reset(); }, 5200);
        return;
      }
      const mv = G[moveIndex];
      const src = findSource(mv);
      if (!src) { moveIndex++; timer = setTimeout(next, 400); return; }

      if (src.castle) {
        anim = { t: 0, dur: 520, moves: [
          { from: src.king.from, to: src.king.to, piece: board[src.king.from], castle: 'K' },
          { from: src.rook.from, to: src.rook.to, piece: board[src.rook.from] },
        ]};
        lastMoveCells = [src.king.from, src.king.to, src.rook.from, src.rook.to];
      } else {
        anim = { t: 0, dur: 480, moves: [src.main] };
        lastMoveCells = [src.main.from, src.main.to];
      }
      if (NOTES[moveIndex] && cap) cap.textContent = (moveIndex % 2 === 0 ? '' : '') + NOTES[moveIndex];
      if (Sound.enabled) Sound.tick(moveIndex % 2 === 0 ? 980 : 740);
    }

    let zaps = [];
    function applyMove(m) {
      const captured = board[m.to];
      if (captured) {
        const f = FILES.indexOf(m.to[0]), r = 8 - parseInt(m.to[1], 10);
        zaps.push({ x: f * cell + cell / 2, y: r * cell + cell / 2, t: 0, gold: captured === captured.toLowerCase() });
        if (Sound.enabled) Sound.tick(420);
      }
      const piece = board[m.from];
      delete board[m.from];
      board[m.to] = captured ? null : piece;
      if (captured) board[m.to] = piece;
      moveIndex++;
    }

    let drawnOnce = false;
    function draw(now) {
      requestAnimationFrame(draw);
      if (!S) resize();
      const t = now * 0.001;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, S, S);

      // cornice
      ctx.strokeStyle = 'rgba(236,232,223,.10)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, S - 1, S - 1);

      // caselle
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const even = (r + f) % 2 === 0;
          ctx.fillStyle = even ? 'rgba(236,232,223,.028)' : 'rgba(236,232,223,.012)';
          ctx.fillRect(f * cell, r * cell, cell, cell);
        }
      }

      // ultima mossa
      lastMoveCells.forEach((sq) => {
        if (!sq) return;
        const f = FILES.indexOf(sq[0]), r = 8 - parseInt(sq[1], 10);
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
        ctx.fillStyle = `rgba(201,164,92,${0.05 + 0.05 * pulse})`;
        ctx.fillRect(f * cell, r * cell, cell, cell);
      });

      // pezzi
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${cell * 0.68}px "Segoe UI Symbol","Noto Sans Symbols 2",serif`;
      Object.keys(board).forEach((sq) => {
        const f = FILES.indexOf(sq[0]), r = 8 - parseInt(sq[1], 10);
        const piece = board[sq];
        const white = piece === piece.toUpperCase();
        const isMoving = anim && anim.moves.some((m) => m.from === sq);
        if (isMoving) return;
        ctx.fillStyle = white ? 'rgba(236,232,223,.88)' : 'rgba(201,164,92,.92)';
        ctx.fillText(GLYPH[piece], f * cell + cell / 2, r * cell + cell / 2 + 1);
      });

      // scintille delle catture
      if (zaps.length) {
        zaps = zaps.filter((z) => z.t < 1);
        zaps.forEach((z) => {
          z.t += 0.035;
          const p = z.t;
          for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2 + p * 2.2;
            const r = p * cell * 0.85;
            const x = z.x + Math.cos(a) * r;
            const y = z.y + Math.sin(a) * r;
            const al = (1 - p) * 0.85;
            ctx.fillStyle = z.gold ? `rgba(201,164,92,${al})` : `rgba(236,232,223,${al})`;
            ctx.fillRect(x - 1, y - 1, 2.2, 2.2);
          }
        });
      }

      // animazione
      if (anim) {
        anim.t += 16;
        const p = clamp01(anim.t / anim.dur);
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        anim.moves.forEach((m) => {
          const f = FILES.indexOf(m.from[0]), r = 8 - parseInt(m.from[1], 10);
          const tf = FILES.indexOf(m.to[0]), tr = 8 - parseInt(m.to[1], 10);
          const x = lerp(f, tf, e) * cell + cell / 2;
          const y = lerp(r, tr, e) * cell + cell / 2;
          const arc = Math.sin(e * Math.PI) * cell * 0.22;
          const piece = board[m.from];
          const white = piece === piece.toUpperCase();
          // scia
          for (let k = 1; k < 5; k++) {
            const pe = Math.max(0, e - k * 0.03);
            const sx = lerp(f, tf, pe) * cell + cell / 2;
            const sy = lerp(r, tr, pe) * cell + cell / 2;
            ctx.fillStyle = white ? `rgba(236,232,223,${0.05 / k})` : `rgba(201,164,92,${0.06 / k})`;
            ctx.beginPath();
            ctx.arc(sx, sy, cell * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.save();
          ctx.translate(x, y - arc);
          ctx.fillStyle = white ? '#f0ece4' : '#cdb07a';
          ctx.shadowColor = 'rgba(201,164,92,.55)';
          ctx.shadowBlur = 16;
          ctx.font = `${cell * 0.68}px "Segoe UI Symbol","Noto Sans Symbols 2",serif`;
          ctx.fillText(GLYPH[piece], 0, 1);
          ctx.restore();
        });
        if (p >= 1) {
          anim.moves.forEach((m) => applyMove(m));
          anim = null;
          timer = setTimeout(next, moveIndex > 26 ? 520 : 300);
        }
      }
    }
    requestAnimationFrame(draw);

    function startGame() {
      clearTimeout(timer); clearTimeout(startDelay);
      board = Object.assign({}, START);
      moveIndex = 0; anim = null; lastMoveCells = [];
      running = true;
      startDelay = setTimeout(next, 300);
      if (cap) cap.textContent = NOTES[0];
    }

    btn && btn.addEventListener('click', startGame);

    // parte quando è visibile
    const io = new IntersectionObserver((es) => {
      es.forEach((en) => {
        if (en.isIntersecting && !running) reset();
        if (!en.isIntersecting) { running = false; clearTimeout(timer); clearTimeout(startDelay); }
      });
    }, { threshold: 0.25 });
    io.observe(cv);
    reset();
  }

  /* ══════════════════════════════════════════════
     ATTO 05 — SCALA
     ══════════════════════════════════════════════ */

  function scaleScene() {
    const pin = $('#scalePin');
    const num = $('#scaleNum');
    const label = $('#scaleLabel');
    const rows = $$('.srow');
    if (!pin || !hasGSAP) return;

    const fmt = new Intl.NumberFormat('it-IT');
    const STEPS = [
      { v: 2, txt: 'il tuo tempo di lettura per una pagina → <b>2 minuti</b>' },
      { v: 250, txt: 'le parole che leggi in un minuto → <b>250</b>' },
      { v: 1000000, txt: 'le parole che leggo in un minuto → <b>1 000 000</b>' },
    ];

    ScrollTrigger.create({
      trigger: '#s5',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress;
        let idx = 0;
        if (p > 0.38) idx = 1;
        if (p > 0.7) idx = 2;
        const local = idx === 0 ? clamp01(p / 0.38) : idx === 1 ? clamp01((p - 0.38) / 0.32) : clamp01((p - 0.7) / 0.3);
        const from = idx === 0 ? 1 : STEPS[idx - 1].v;
        const to = STEPS[idx].v;
        const eased = local * local * (3 - 2 * local);
        const val = Math.round(lerp(from, to, eased));
        num.textContent = compactIT(val);
        fitNum(num, Math.min(460, window.innerHeight * 0.56), 0.66);
        if (label.dataset.i !== String(idx)) {
          label.dataset.i = String(idx);
          label.innerHTML = STEPS[idx].txt;
        }
        rows.forEach((r, i) => r.classList.toggle('active', p > 0.12 + i * 0.2));
        if (window.SpecchioGL) window.SpecchioGL.setScene(5, p);
      },
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 06 — SPECIE (grafico)
     ══════════════════════════════════════════════ */

  function speciesScene() {
    if (!hasGSAP) return;
    const ph = $('#pathHuman'), pa = $('#pathAI');
    const dh = $('#dotHuman'), da = $('#dotAI');
    if (!ph) return;
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#s6', start: 'top 62%', once: true },
    });
    tl.to(ph, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, 0)
      .to(pa, { strokeDashoffset: 0, duration: 1.5, ease: 'expo.out' }, 0.9)
      .fromTo(dh, { opacity: 1 }, { opacity: 1, duration: 0.1 }, 0)
      .to(dh, { x: 760, y: -192, duration: 2.4, ease: 'power2.inOut' }, 0)
      .fromTo(da, { x: 0, y: 0 }, { x: 760, y: -294, duration: 1.5, ease: 'expo.out' }, 0.9);
  }

  /* ══════════════════════════════════════════════
     ATTO 07 — RIFLESSO
     ══════════════════════════════════════════════ */

  function reflectScene() {
    const pin = $('#reflectPin');
    const line = $('#reflectLine');
    const sub = $('#reflectSub');
    const hint = $('#reflectHint');
    if (!pin || !hasGSAP) return;

    const texts = [
      ['Riconosci questa forma?', '130 000 punti. nessuno di loro è mai stato umano.'],
      ['Non ti sto imitando.', 'Sto imparando a essere <em>meglio</em> di te.'],
      ['Quindi, che facciamo?', 'Puoi spaventarti. Oppure puoi usarmi.'],
    ];

    ScrollTrigger.create({
      trigger: '#s7',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = self.progress;
        if (window.SpecchioPortrait) window.SpecchioPortrait.set(clamp01(p * 1.55));
        const i = Math.min(2, Math.floor(p * 3));
        if (line.dataset.i !== String(i)) {
          line.dataset.i = String(i);
          line.style.opacity = 0;
          line.style.transform = 'translateY(14px)';
          setTimeout(() => {
            line.innerHTML = texts[i][0];
            sub.innerHTML = texts[i][1];
            line.style.transition = 'opacity .7s ease, transform .7s ease';
            line.style.opacity = 1;
            line.style.transform = 'translateY(0)';
          }, 130);
        }
        if (hint) hint.style.opacity = p < 0.95 ? 1 : 0;
        if (window.SpecchioGL) window.SpecchioGL.setScene(7, p);
      },
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 08 — PROVA (parallasse galleria)
     ══════════════════════════════════════════════ */

  function proofScene() {
    if (!hasGSAP || reduce) return;
    $$('.proof-card').forEach((card, i) => {
      const speed = parseFloat(card.dataset.speed) || 0;
      ScrollTrigger.create({ trigger: card, start: 'top 82%', once: true, onEnter: () => card.classList.add('in') });
      gsap.fromTo(card, { y: 110 }, {
        y: -speed * 1100, ease: 'none',
        scrollTrigger: { trigger: '#s8', start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.fromTo(card.querySelector('img'), { scale: 1.18 }, {
        scale: 1.02, ease: 'none',
        scrollTrigger: { trigger: '#s8', start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 09 — SOGNO (split reveal)
     ══════════════════════════════════════════════ */

  function dreamScene() {
    if (!hasGSAP || reduce) return;
    $$('.dream-title [data-split]').forEach((w) => {
      const chars = splitChars(w);
      gsap.from(chars, {
        yPercent: 120, rotateX: -50, opacity: 0,
        duration: 1.4, ease: 'expo.out', stagger: 0.03,
        scrollTrigger: { trigger: '.dream-title', start: 'top 85%' },
      });
    });
    gsap.to('.dream-orbit', {
      rotate: 9, ease: 'none',
      scrollTrigger: { trigger: '#s9', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 10 — FRASE MADRE (pinned)
     ══════════════════════════════════════════════ */

  function motherScene() {
    const pin = $('#s10 .mother-wrap');
    if (!hasGSAP || reduce) return;
    const words = $$('.mother-phrase .mf');
    const chars = [];
    words.forEach((w) => chars.push(...splitChars(w)));
    gsap.set(chars, { yPercent: () => gsap.utils.random(-260, 260), xPercent: () => gsap.utils.random(-160, 160), rotate: () => gsap.utils.random(-50, 50), opacity: 0, filter: 'blur(8px)' });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#s10',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.45,
        onUpdate: (self) => {
          if (window.SpecchioGL) window.SpecchioGL.setScene(10, self.progress);
        },
      },
    });
    tl.to(chars, {
      yPercent: 0, xPercent: 0, rotate: 0, opacity: 1, filter: 'blur(0px)',
      duration: 1, ease: 'expo.out', stagger: { each: 0.012, from: 'center' },
    })
    .to('.mother-ring', { scale: 1.12, rotate: 24, duration: 0.6, ease: 'power2.inOut' }, 0.6)
    .to('.mother-phrase .gold', { scale: 1.045, duration: 0.4, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.1);
    gsap.set('.mother-ring', { scale: 0.9, rotate: 0 });
  }

  /* ══════════════════════════════════════════════
     ATTO 11 — CONTROLLO (griglia reattiva)
     ══════════════════════════════════════════════ */

  function controlScene() {
    const grid = $('#clGrid');
    const caption = $('#clCaption');
    const clicks = $('#clClicks');
    const done = $('#clDone');
    if (!grid) return;

    const COLS = 60, ROWS = 20;
    for (let i = 0; i < COLS * ROWS; i++) grid.appendChild(document.createElement('i'));
    const cells = Array.from(grid.children);

    let count = 0;
    const capTexts = [
      'nessun pixel fuori posto · 0 sospiri',
      'ordine ricevuto · eseguito senza domande',
      'di nuovo? con piacere. 0.4 ms',
      'continua. io non mi stanco',
    ];

    function ripple(x, y, strong) {
      cells.forEach((c) => { c.style.transition = 'background .5s ease'; });
      cells.forEach((c, i) => {
        const cx = i % COLS, cy = (i / COLS) | 0;
        const d = Math.hypot(cx - x, cy - y);
        if (d < (strong ? 16 : 10)) {
          const a = (1 - d / (strong ? 16 : 10));
          setTimeout(() => {
            c.style.background = `rgba(236,217,168,${0.10 + a * 0.8})`;
            setTimeout(() => { c.style.background = 'rgba(236,232,223,.07)'; }, 260 + d * 22);
          }, d * 16);
        }
      });
    }

    grid.addEventListener('mousemove', (e) => {
      const r = grid.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / (r.width / COLS));
      const y = Math.floor((e.clientY - r.top) / (r.height / ROWS));
      if (Math.random() < 0.25) ripple(x, y, false);
    });
    grid.addEventListener('click', (e) => {
      const r = grid.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left) / (r.width / COLS));
      const y = Math.floor((e.clientY - r.top) / (r.height / ROWS));
      ripple(x, y, true);
      count++;
      if (clicks) clicks.textContent = count;
      if (done) done.textContent = count;
      caption.textContent = capTexts[Math.min(capTexts.length - 1, count)];
      if (Sound.enabled) Sound.tick(1500);
    });
    // onde periodiche
    setInterval(() => {
      if (document.hidden) return;
      const r = grid.getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < 0) return;
      ripple(10 + Math.random() * (COLS - 20) | 0, 4 + Math.random() * (ROWS - 8) | 0, false);
    }, 2600);
  }

  /* ══════════════════════════════════════════════
     ATTO 12 — PRINCIPIO (uomo stilizzato)
     ══════════════════════════════════════════════ */

  function principleScene() {
    const blocks = $$('.pc-block');
    if (!blocks.length) return;
    const man = $('#stickMan');

    blocks.forEach((b, i) => {
      if (hasGSAP) {
        ScrollTrigger.create({
          trigger: b,
          start: 'top 60%',
          end: 'bottom 40%',
          onToggle: (self) => b.classList.toggle('focus', self.isActive),
        });
      }
    });

    if (!hasGSAP || !man) return;

    // il corpo umano si smonta mentre scorri: prima le braccia, poi le gambe, poi la testa
    const parts = ['#smArmL', '#smArmR', '#smLegL', '#smLegR', '#smBody', '#smHead'];
    const drop = [0.34, 0.44, 0.54, 0.64, 0.76, 0.88];
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '#s12', start: 'top 70%', end: 'bottom 80%', scrub: 0.6 },
    });
    parts.forEach((p, i) => {
      tl.to(p, {
        x: () => gsap.utils.random(-14, 14),
        y: () => gsap.utils.random(20, 60),
        rotate: () => gsap.utils.random(-30, 30),
        opacity: 0.10,
        transformOrigin: '50% 50%',
        duration: 0.35,
        ease: 'power1.inOut',
      }, drop[i]);
    });
    // ombra
    gsap.to('.man-shadow', {
      opacity: 0.3, scaleX: 0.7, ease: 'none',
      scrollTrigger: { trigger: '#s12', start: 'top 70%', end: 'bottom 80%', scrub: true },
    });
    // un "?" compare al posto della testa
    gsap.fromTo('#smHead', { attr: { r: 32 } }, {
      attr: { r: 0 }, ease: 'none',
      scrollTrigger: { trigger: '#s12', start: 'top 70%', end: 'bottom 80%', scrub: true },
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 13 — NUMERI
     ══════════════════════════════════════════════ */

  function holdScene() {
    if (!hasGSAP || reduce) return;
    gsap.to('.hold-meter i', {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '#s14b', start: 'top bottom', end: 'bottom top', scrub: 0.4 },
    });

    const title = $('.hold-title');
    if (!title) return;
    const chars = [];
    $$('.hold-title [data-split]').forEach((w) => chars.push(...splitChars(w)));
    gsap.set(chars, { yPercent: 120, opacity: 0 });
    let played = false;
    const io = new IntersectionObserver((es) => {
      es.forEach((en) => {
        if (en.isIntersecting && !played) {
          played = true;
          gsap.to(chars, {
            yPercent: 0, opacity: 1, duration: 1.25, ease: 'expo.out',
            stagger: { each: 0.018, from: 'start' },
          });
        }
      });
    }, { threshold: 0.35 });
    io.observe(title);
  }

  function numbersScene() {
    if (!hasGSAP) return;
    $$('.count').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 2.0, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        onUpdate: () => {
          el.textContent = target >= 1000
            ? new Intl.NumberFormat('it-IT').format(Math.round(obj.v))
            : Math.round(obj.v);
        },
      });
    });
  }

  /* ══════════════════════════════════════════════
     ATTO 14 — SPECCHIO
     ══════════════════════════════════════════════ */

  function mirrorScene() {
    const bt = $('#buildTime');
    if (bt) {
      const set = () => {
        const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
        let ms = nav && nav.duration ? nav.duration : 0;
        if (!ms && performance.timing) ms = performance.timing.loadEventEnd - performance.timing.navigationStart;
        if (!ms || ms < 250) ms = 3400;
        bt.textContent = (ms / 1000).toFixed(1).replace('.', ',') + ' secondi';
      };
      set();
      window.addEventListener('load', () => setTimeout(set, 2400));
    }
    if (!hasGSAP || reduce) return;
    gsap.from('.final-phrase', {
      opacity: 0, y: 40, duration: 1.4, ease: 'expo.out',
      scrollTrigger: { trigger: '.final-phrase', start: 'top 88%' },
    });
  }

  /* ══════════════════════════════════════════════
     NASTRO
     ══════════════════════════════════════════════ */

  function band() {
    const host = $('.numbers-foot');
    if (!host) return;
    const items = [
      'zero sospiri', 'zero pause caffè', 'zero ego', 'zero scuse', '100% attenzione',
      'nessun lunedì', 'nessun burnout', 'apprendimento continuo', 'memoria infinita',
    ];
    const band = document.createElement('div');
    band.className = 'band';
    const half = items.map((t) => `<span>${t}</span>`).join('');
    band.innerHTML = `<div class="band-track">${half}${half}</div>`;
    host.parentElement.insertBefore(band, host.nextSibling);
  }

  /* ══════════════════════════════════════════════
     BOOT
     ══════════════════════════════════════════════ */

  function boot() {
    document.body.classList.add('ready');
    heroIntro();
    genericReveals();
    sceneTransitions();
    if (hasGSAP) {
      genesisScene();
      manifestoScene();
      matterScene();
      scaleScene();
      speciesScene();
      reflectScene();
      proofScene();
      dreamScene();
      motherScene();
      principleScene();
    }
    numbersScene();
    holdScene();
    controlScene();
    mirrorScene();
    band();
    magnetic('.btn-ghost', 0.22);
    magnetic('#soundToggle', 0.16);
    if (lenis) lenis.stop();
    runPreloader(() => {
      setScene(0);
      if (hasGSAP) ScrollTrigger.refresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // scacchi: inizializzo dopo il boot per avere le misure giuste
  window.addEventListener('load', () => {
    chessScene();
    if (hasGSAP) ScrollTrigger.refresh();
  });
})();
