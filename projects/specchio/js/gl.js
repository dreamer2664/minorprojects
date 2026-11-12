/* ═══════════════════════════════════════════════════════════
   SPECCHIO — motore WebGL
   Un solo organismo di particelle che cambia forma in ogni atto.
   WebGL1 compatibile, nessuna dipendenza.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const canvas = document.getElementById('glMain');
  if (!canvas) return;

  const glOpts = { alpha: true, antialias: false, depth: false, powerPreference: 'high-performance' };
  let gl = canvas.getContext('webgl', glOpts) || canvas.getContext('experimental-webgl', glOpts);

  const state = {
    scene: 0,
    progress: 0,
    mouse: { x: 0, y: 0 },
    mouseT: { x: 0, y: 0 },
    scrollVel: 0,
  };

  // ——— mappa atti → forma + regia ———
  // forme: 0 nebula · 1 occhio · 2 griglia · 3 spirale · 4 tunnel
  //        5 flusso · 6 nastri · 7 polvere · 8 implosione · 9 orbe
  const DIRECTION = [
    { shape: 0, spread: 2.9, size: 2.4, bg: 1.00, tint: 0.55 }, // 00 nascita
    { shape: 1, spread: 2.1, size: 2.2, bg: 0.85, tint: 0.70 }, // 01 genesi
    { shape: 7, spread: 2.4, size: 1.7, bg: 0.55, tint: 0.50 }, // 02 manifesto
    { shape: 9, spread: 1.9, size: 2.6, bg: 0.70, tint: 0.85 }, // 03 materia
    { shape: 3, spread: 2.4, size: 1.8, bg: 0.52, tint: 0.90 }, // 04 scacco
    { shape: 4, spread: 2.2, size: 2.0, bg: 0.75, tint: 0.75 }, // 05 scala
    { shape: 5, spread: 2.6, size: 1.7, bg: 0.42, tint: 0.45 }, // 06 specie
    { shape: 7, spread: 2.2, size: 1.4, bg: 0.30, tint: 0.40 }, // 07 riflesso
    { shape: 7, spread: 2.6, size: 1.8, bg: 0.45, tint: 0.55 }, // 08 prova
    { shape: 6, spread: 2.5, size: 2.3, bg: 0.70, tint: 0.80 }, // 09 sogno
    { shape: 6, spread: 2.5, size: 2.2, bg: 0.72, tint: 0.85 }, // 10 frase madre
    { shape: 2, spread: 2.3, size: 1.7, bg: 0.45, tint: 0.50 }, // 11 controllo
    { shape: 7, spread: 2.5, size: 1.8, bg: 0.45, tint: 0.55 }, // 12 principio
    { shape: 5, spread: 2.5, size: 1.8, bg: 0.52, tint: 0.70 }, // 13 numeri
    { shape: 7, spread: 1.6, size: 1.2, bg: 0.22, tint: 0.35 }, // 14 pausa
    { shape: 9, spread: 2.1, size: 2.8, bg: 1.00, tint: 1.00 }, // 15 specchio
  ];

  if (!gl) {
    document.documentElement.classList.add('no-webgl');
    console.warn('SPECCHIO: WebGL non disponibile, resto in fallback CSS.');
    window.SpecchioGL = { setScene() {}, setMouse() {}, setScrollVel() {}, get active() { return false; } };
    return;
  }

  const COUNT = window.innerWidth < 760 ? 26000 : 52000;

  /* ───────────── shader helpers ───────────── */

  const VERT = `
precision highp float;

attribute vec3 aSeed;

uniform float uTime;
uniform float uShapeA;
uniform float uShapeB;
uniform float uMix;
uniform float uProgress;
uniform vec2  uMouse;
uniform float uVel;
uniform float uPR;
uniform float uSize;
uniform float uSpread;
uniform float uTint;

varying vec3 vColor;
varying float vAlpha;

const float PI = 3.141592653589793;
const float TAU = 6.283185307179586;

vec3 hash3(vec2 p){
  vec3 q = vec3(dot(p, vec2(127.1, 311.7)),
                dot(p, vec2(269.5, 183.3)),
                dot(p, vec2(419.2, 371.9)));
  return fract(sin(q) * 43758.5453);
}

float shapeH(vec3 seed, float k){ return fract(seed.x * 91.7 + seed.y * 37.3 + seed.z * 17.9 + k * 13.1); }

vec3 shapePos(float s, vec3 seed, float t, float prog){
  float h  = seed.x;       // 0..1 identità
  float h2 = seed.y;
  float h3 = seed.z;

  if (s < 0.5) {
    // 0 · nebulosa: guscio sferico schiacciato, respira
    float th = shapeH(seed, 1.0) * TAU * 9.0;
    float ph = acos(2.0 * shapeH(seed, 2.0) - 1.0);
    vec3 dir = vec3(sin(ph) * cos(th), cos(ph) * 0.60, sin(ph) * sin(th));
    float r = 1.05 + 0.55 * h3 + 0.05 * sin(t * 0.35 + h * 40.0);
    return dir * r;
  }
  else if (s < 1.5) {
    // 1 · occhio: iride a disco + palpebra a mandorla
    float a = shapeH(seed, 3.0) * TAU;
    if (h3 < 0.82) {
      float rr = sqrt(shapeH(seed, 4.0)) * 0.60;
      a += rr * 5.2;
      float zj = (shapeH(seed, 5.0) - 0.5) * 0.10;
      return vec3(cos(a) * rr * 1.30, sin(a) * rr * 0.74, -0.12 + zj);
    }
    float yPinch = 1.0 - 0.62 * pow(abs(cos(a)), 3.0);
    return vec3(cos(a) * 1.62, sin(a) * 0.86 * yPinch, (h2 - 0.5) * 0.05);
  }
  else if (s < 2.5) {
    // 2 · griglia: piano in prospettiva che ondeggia
    float gx = (floor(shapeH(seed, 6.0) * 56.0) / 56.0 - 0.5) * 5.4;
    float gz = (floor(shapeH(seed, 7.0) * 56.0) / 56.0 - 0.5) * 5.4;
    float gy = -1.55 + sin(gx * 1.6 + t * 0.7) * 0.10 + (shapeH(seed, 8.0) - 0.5) * 0.04;
    return vec3(gx, gy, gz);
  }
  else if (s < 3.5) {
    // 3 · spirale aurea
    float k = fract(h * 7.0);
    float ang = k * 4.4 * TAU + t * 0.12;
    float r = 0.18 + k * 1.55;
    float y = (shapeH(seed, 9.0) - 0.5) * 0.85 * (1.0 - k * 0.55);
    return vec3(cos(ang) * r, y + (k - 0.5) * 1.3, sin(ang) * r);
  }
  else if (s < 4.5) {
    // 4 · tunnel: anelli che scorrono verso la camera
    float z = -fract(shapeH(seed, 10.0) * 9.0 + t * 0.09) * 6.4 + 1.2;
    float ringAng = shapeH(seed, 11.0) * TAU + z * 0.35;
    float rad = 1.35 + sin(z * 0.6 - t * 0.8) * 0.18;
    return vec3(cos(ringAng) * rad, sin(ringAng) * rad, z);
  }
  else if (s < 5.5) {
    // 5 · flusso: corrente orizzontale con onde
    float x = (h - 0.5) * 5.2;
    float y = sin(x * 2.1 + t * 0.8) * 0.28 + (h2 - 0.5) * 0.55;
    float z = cos(x * 1.7 + t * 0.5) * 0.55 + (h3 - 0.5) * 0.35;
    return vec3(x, y, z);
  }
  else if (s < 6.5) {
    // 6 · nastri: bande sinuose intrecciate
    float band = floor(h3 * 4.0);
    float tt = h * TAU * 1.6 + band * 1.9 + t * 0.10;
    float x = sin(tt * 1.25) * 1.65;
    float y = (band - 1.5) * 0.42 + sin(tt * 2.0 + band) * 0.30 + (h2 - 0.5) * 0.07;
    float z = cos(tt * 1.05) * 1.65;
    return vec3(x, y, z);
  }
  else if (s < 7.5) {
    // 7 · polvere: nube piccola e calma
    float th = shapeH(seed, 12.0) * TAU * 7.0;
    float ph = acos(2.0 * shapeH(seed, 13.0) - 1.0);
    vec3 dir = vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th));
    return dir * (0.28 + 0.55 * h3);
  }
  else if (s < 8.5) {
    // 8 · implosione: tutto crolla verso il centro
    float th = shapeH(seed, 14.0) * TAU * 11.0;
    float ph = acos(2.0 * shapeH(seed, 15.0) - 1.0);
    vec3 dir = vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th));
    float e = clamp(prog, 0.0, 1.0);
    float r = mix(1.55, 0.05, e * e * (3.0 - 2.0 * e));
    float swirl = (1.0 - e) * 3.4;
    float ang = th + swirl;
    return vec3(sin(ph) * cos(ang), cos(ph), sin(ph) * sin(ang)) * r;
  }
  else {
    // 9 · orbe: sfera precisa in lenta rotazione
    float th = shapeH(seed, 16.0) * TAU;
    float ph = acos(2.0 * shapeH(seed, 17.0) - 1.0);
    vec3 dir = vec3(sin(ph) * cos(th), cos(ph), sin(ph) * sin(th));
    float r = 1.30 + (shapeH(seed, 18.0) - 0.5) * 0.07;
    return dir * r;
  }
}

mat4 rotX(float a){ float c = cos(a), s = sin(a); return mat4(1.,0.,0.,0., 0.,c,s,0., 0.,-s,c,0., 0.,0.,0.,1.); }
mat4 rotY(float a){ float c = cos(a), s = sin(a); return mat4(c,0.,-s,0., 0.,1.,0.,0., s,0.,c,0., 0.,0.,0.,1.); }

void main(){
  vec3 seed = aSeed;
  float h2 = seed.y;
  float h3 = seed.z;

  vec3 pA = shapePos(uShapeA, seed, uTime, uProgress);
  vec3 pB = shapePos(uShapeB, seed, uTime, uProgress);
  vec3 p  = mix(pA, pB, uMix);

  p *= uSpread;

  // respiro globale
  float breathe = 1.0 + sin(uTime * 0.5 + seed.x * 6.283) * 0.012;
  p *= breathe;

  // parallasse dolce con il mouse
  p.xy += uMouse * (0.16 + 0.10 * h3);

  // deriva organica
  p += vec3(
    sin(uTime * 0.32 + h2 * 21.0),
    cos(uTime * 0.27 + h3 * 17.0),
    sin(uTime * 0.38 + seed.x * 13.0)
  ) * 0.028;

  float yaw = uMouse.x * 0.34 + uTime * 0.035;
  float pitch = -uMouse.y * 0.20 + sin(uTime * 0.11) * 0.03;
  vec3 vp = (rotX(pitch) * rotY(yaw) * vec4(p, 1.0)).xyz;
  vp.z -= 4.6;

  float persp = 1.0 / max(0.25, -vp.z);
  gl_Position = vec4(vp.x * persp * 1.9, vp.y * persp * 1.9, vp.z * -0.02, 1.0);

  float sizeJitter = 0.55 + 0.85 * h2;
  float boost = smoothstep(0.0, 0.001, uVel * 0.0 + 1.0);
  gl_PointSize = uSize * uPR * (1.6 + 2.4 * h3) * sizeJitter * persp * 86.0 * 0.05;
  gl_PointSize = clamp(gl_PointSize, 0.6, 7.5 * uPR);

  // colore: bianco caldo → oro, in base al seme e alla regia
  vec3 cold = vec3(0.93, 0.91, 0.86);
  vec3 gold = vec3(0.86, 0.68, 0.40);
  float goldMix = mix(smoothstep(0.35, 0.95, h3) * 0.7, 1.0, uTint * 0.65);
  vColor = mix(cold, gold, goldMix);

  // profondità: più lontano = più tenue
  float dist = clamp((-vp.z - 2.2) / 4.5, 0.0, 1.0);
  float shapeAlpha = (uShapeB > 7.5 || uShapeA > 7.5) ? 1.0 : 1.0;
  vAlpha = (0.55 + 0.45 * h3) * (1.0 - dist * 0.72) * shapeAlpha;

  // lampi: alcune particelle pulsano
  float pulse = step(0.985, fract(h2 * 511.0)) * (0.5 + 0.5 * sin(uTime * 3.0 + h3 * 40.0));
  vAlpha += pulse * 0.8;
  vAlpha = clamp(vAlpha, 0.0, 1.0);
}
`;

  const FRAG = `
precision mediump float;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float core = smoothstep(0.5, 0.0, d);
  float hot = pow(core, 4.0);
  vec3 col = vColor + vec3(1.0, 0.95, 0.85) * hot * 0.55;
  float a = core * vAlpha;
  gl_FragColor = vec4(col * a, a);
}
`;

  const BG_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

  const BG_FRAG = `
precision mediump float;
varying vec2 vUv;
uniform float uTime;
uniform float uIntensity;
uniform vec2 uMouse;
uniform vec2 uRes;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.,0.)), u.x),
             mix(hash(i + vec2(0.,1.)), hash(i + vec2(1.,1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){
    v += a * noise(p);
    p *= 2.02;
    a *= 0.52;
  }
  return v;
}
void main(){
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float t = uTime * 0.045;

  // tre aloni d'oro che respirano
  float glow = 0.0;
  vec2 c1 = vec2(-0.42 + sin(t * 1.7) * 0.10, 0.12 + cos(t * 1.3) * 0.08);
  vec2 c2 = vec2( 0.48 + cos(t * 1.1) * 0.12, -0.20 + sin(t * 1.9) * 0.07);
  vec2 c3 = vec2( 0.02 + sin(t * 0.8) * 0.06, 0.46 + cos(t * 1.5) * 0.05);
  glow += 0.030 / (0.20 + dot(p - c1, p - c1) * 3.4);
  glow += 0.022 / (0.22 + dot(p - c2, p - c2) * 3.8);
  glow += 0.015 / (0.26 + dot(p - c3, p - c3) * 4.2);

  // vapore sottile
  float vapor = fbm(p * 2.6 + vec2(t * 1.6, -t * 1.1));
  vapor = smoothstep(0.40, 0.96, vapor) * 0.22;

  vec3 gold = vec3(0.74, 0.58, 0.35);
  vec3 base = vec3(0.012, 0.011, 0.010);
  vec3 col = base;
  col += gold * glow * uIntensity;
  col += vec3(0.05, 0.045, 0.038) * vapor * uIntensity;
  col += gold * vapor * 0.05 * uIntensity;

  // vignettatura interna
  float vig = smoothstep(0.95, 0.25, length(p));
  col *= mix(0.55, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

  /* ───────────── compilazione ───────────── */

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function program(vs, fs) {
    const p = gl.createProgram();
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  }

  const progParticles = program(VERT, FRAG);
  const progBg = program(BG_VERT, BG_FRAG);
  if (!progParticles || !progBg) {
    window.SpecchioGL = { setScene() {}, setMouse() {}, setScrollVel() {}, get active() { return false; } };
    return;
  }

  /* ───────────── buffers ───────────── */

  const seeds = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
  }

  const seedBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const U = {
    time: gl.getUniformLocation(progParticles, 'uTime'),
    shapeA: gl.getUniformLocation(progParticles, 'uShapeA'),
    shapeB: gl.getUniformLocation(progParticles, 'uShapeB'),
    mix: gl.getUniformLocation(progParticles, 'uMix'),
    progress: gl.getUniformLocation(progParticles, 'uProgress'),
    mouse: gl.getUniformLocation(progParticles, 'uMouse'),
    vel: gl.getUniformLocation(progParticles, 'uVel'),
    pr: gl.getUniformLocation(progParticles, 'uPR'),
    size: gl.getUniformLocation(progParticles, 'uSize'),
    spread: gl.getUniformLocation(progParticles, 'uSpread'),
    tint: gl.getUniformLocation(progParticles, 'uTint'),
  };
  const B = {
    time: gl.getUniformLocation(progBg, 'uTime'),
    intensity: gl.getUniformLocation(progBg, 'uIntensity'),
    mouse: gl.getUniformLocation(progBg, 'uMouse'),
    res: gl.getUniformLocation(progBg, 'uRes'),
  };

  const seedLoc = gl.getAttribLocation(progParticles, 'aSeed');
  const posLoc = gl.getAttribLocation(progBg, 'aPos');

  /* ───────────── stato di regia ───────────── */

  let cur = Object.assign({}, DIRECTION[0]);
  let prev = Object.assign({}, DIRECTION[0]);
  let mixT = 1;          // 0→1 transizione forma
  let curShape = DIRECTION[0].shape;
  let prevShape = DIRECTION[0].shape;
  let target = Object.assign({}, DIRECTION[0]);
  let targetIndex = 0;
  let progress = 0;
  let intensity = cur.bg;
  let dpr = Math.min(window.devicePixelRatio || 1, 1.75);

  const mouseS = { x: 0, y: 0 };
  const mouseL = { x: 0, y: 0 };
  let vel = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  let last = performance.now();

  function render(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const time = now * 0.001;

    mouseL.x = lerp(mouseL.x, state.mouseT.x, 0.045);
    mouseL.y = lerp(mouseL.y, state.mouseT.y, 0.045);

    if (mixT < 1) {
      mixT = Math.min(1, mixT + dt * 0.75);
      const e = mixT * mixT * (3 - 2 * mixT);
      cur.spread = lerp(prev.spread, target.spread, e);
      cur.size = lerp(prev.size, target.size, e);
      cur.tint = lerp(prev.tint, target.tint, e);
      cur.bg = lerp(prev.bg, target.bg, e);
      if (mixT >= 1) {
        prevShape = curShape;
        curShape = target.shape;
        prev = Object.assign({}, target);
      }
    }
    intensity = lerp(intensity, cur.bg, 0.03);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // sfondo
    gl.disable(gl.BLEND);
    gl.useProgram(progBg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(B.time, time);
    gl.uniform1f(B.intensity, intensity * 0.82);
    gl.uniform2f(B.mouse, mouseL.x, mouseL.y);
    gl.uniform2f(B.res, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // particelle
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(progParticles);
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuf);
    gl.enableVertexAttribArray(seedLoc);
    gl.vertexAttribPointer(seedLoc, 3, gl.FLOAT, false, 0, 0);

    gl.uniform1f(U.time, time);
    gl.uniform1f(U.shapeA, prevShape);
    gl.uniform1f(U.shapeB, curShape);
    gl.uniform1f(U.mix, mixT);
    gl.uniform1f(U.progress, progress);
    gl.uniform2f(U.mouse, mouseL.x, -mouseL.y);
    gl.uniform1f(U.vel, vel);
    gl.uniform1f(U.pr, dpr);
    gl.uniform1f(U.size, cur.size);
    gl.uniform1f(U.spread, cur.spread);
    gl.uniform1f(U.tint, cur.tint);
    gl.drawArrays(gl.POINTS, 0, COUNT);

    vel *= 0.92;
    requestAnimationFrame(render);
  }

  /* ───────────── API pubblica ───────────── */

  window.SpecchioGL = {
    active: true,
    setScene(index, p) {
      index = Math.max(0, Math.min(DIRECTION.length - 1, index|0));
      progress = p || 0;
      if (index !== targetIndex) {
        prev = { shape: curShape, spread: cur.spread, size: cur.size, bg: cur.bg, tint: cur.tint };
        prevShape = curShape;
        target = DIRECTION[index];
        targetIndex = index;
        curShape = target.shape;
        mixT = 0;
      }
    },
    setMouse(nx, ny) {
      state.mouseT.x = nx;
      state.mouseT.y = ny;
    },
    setScrollVel(v) {
      vel = Math.min(Math.abs(v) * 0.02, 3.0);
    },
  };

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(render);
})();
