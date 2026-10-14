/* Scroll-driven schematic fire scene.
   The picture is a pure function of the progress s (0..1): no timers, no self-running animation.
   Stages: 0–0.30 ignition, 0.30–0.55 peak, 0.55–1 suppression. */
(function () {
  'use strict';
  var S_FIRE = 0.30, S_FIGHT = 0.55, GROUND = 262;

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(s, a, b) { return clamp((s - a) / (b - a), 0, 1); }
  function ease(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function frac(x) { return x - Math.floor(x); }
  function rnd(i) { return frac(Math.sin(i * 127.1 + 311.7) * 43758.5453); }
  function hex(h) { return [1, 3, 5].map(function (k) { return parseInt(h.slice(k, k + 2), 16); }); }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(lerp(A[k], B[k], t)); }).join(',') + ')'; }
  function n1(v) { return v.toFixed(1); }
  function fmt(n) { return Math.round(n).toLocaleString('es-AR'); }

  /* ---------- layout per cause ---------- */
  var ORIGIN = { intencional: [64, 244], quema: [40, 236], sequia: [210, 230] };
  function flameSites(kind) {
    var L = [], o = ORIGIN[kind], dmax = 330;
    for (var i = 0; i < 15; i++) {
      var x = 46 + i * 21 + rnd(i) * 10, y = 212 + rnd(i + 20) * 42, k = 0.7 + rnd(i + 40) * 0.55, t;
      if (kind === 'intencional') t = 0.03 + 0.25 * Math.min(1, Math.hypot(x - o[0], y - o[1]) / dmax);
      else if (kind === 'quema') t = 0.02 + 0.26 * (x - 40) / 330;
      else t = 0.05 + 0.23 * (0.55 * rnd(i + 60) + 0.45 * Math.abs(x - o[0]) / 170);
      L.push({ x: x, y: y, k: k * (0.75 + (y - 212) / 160), t: t });
    }
    return L.sort(function (a, b) { return a.y - b.y; });
  }
  function nearestT(fl, x, y) {
    var best = 1, bd = 1e9;
    fl.forEach(function (f) { var d = Math.hypot(f.x - x, (f.y - y) * 1.6); if (d < bd) { bd = d; best = f.t; } });
    return bd < 70 ? best : 2;
  }

  /* ---------- drawing ---------- */
  var FLAME = 'M0 0C-11 0-14-9-10-18C-7-25-8-31-3-39C-2-31 2-29 3-24C5-30 4-36 8-41C10-31 14-22 13-12C12-4 7 0 0 0Z';
  function defs() {
    return '<defs>' +
      '<linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1"><stop id="sg-s0" offset="0"/><stop id="sg-s1" offset=".62"/><stop id="sg-s2" offset="1"/></linearGradient>' +
      '<linearGradient id="sg-fo" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#a81d08"/><stop offset=".55" stop-color="#ef4a10"/><stop offset="1" stop-color="#ff9a2a"/></linearGradient>' +
      '<radialGradient id="sg-glow"><stop offset="0" stop-color="#ffb347" stop-opacity=".6"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="sg-burng"><stop offset="0" stop-color="#0c0806"/><stop offset=".75" stop-color="#1a100b"/><stop offset="1" stop-color="#2a1a10" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="sg-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f4ff" stop-opacity=".85"/><stop offset="1" stop-color="#8fd3ff" stop-opacity="0"/></linearGradient>' +
      '<filter id="sg-blur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/></filter>' +
      '<filter id="sg-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.2"/></filter>' +
      '</defs>';
  }
  function landscape(kind) {
    var s = '';
    if (kind === 'intencional') {
      s += '<path d="M0 172L38 142L70 154L112 104L150 140L186 120L232 152L272 92L312 134L352 116L400 146V210H0Z" fill="#262230"/>';
      s += '<path d="M104 112L112 104L121 113L114 110ZM262 101L272 92L283 103L274 99Z" fill="#9a90a6" opacity=".55"/>';
      s += '<path d="M0 198Q100 172 200 190T400 184V300H0Z" fill="#33251b"/>';
      for (var c = 0; c < 16; c++) { var cx = 8 + c * 25 + rnd(c + 90) * 8, cy = 192 - Math.sin(c * 0.6) * 6, h = 14 + rnd(c + 91) * 8; s += '<path class="sg-tree" data-x="' + cx + '" data-y="' + cy + '" d="M' + n1(cx) + ' ' + n1(cy - h) + 'l' + n1(h * 0.32) + ' ' + n1(h) + 'h' + n1(-h * 0.64) + 'Z" fill="#1f3a26"/>'; }
      s += '<path d="M0 222Q120 206 240 218T400 214V300H0Z" fill="#4a3520"/>';
    } else if (kind === 'quema') {
      s += '<rect y="186" width="400" height="16" fill="#2b2c2a"/><rect y="196" width="400" height="5" fill="#3b4c58" opacity=".7"/>';
      for (var t = 0; t < 22; t++) { var tx = t * 19 + rnd(t + 70) * 6, r = 8 + rnd(t + 71) * 6; s += '<ellipse class="sg-tree" data-x="' + n1(tx) + '" data-y="194" cx="' + n1(tx) + '" cy="' + n1(192 - r * 0.4) + '" rx="' + n1(r) + '" ry="' + n1(r * 0.7) + '" fill="#1f3a26"/>'; }
      s += '<path d="M0 204H400V300H0Z" fill="#4f3b22"/>';
      for (var row = 0; row < 7; row++) { var y = 210 + row * row * 1.9 + row * 6; s += '<path d="M0 ' + n1(y) + 'H400" stroke="' + (row % 2 ? '#5d4628' : '#43321c') + '" stroke-width="' + n1(2 + row * 0.9) + '"/>'; }
    } else {
      s += '<path d="M0 184Q60 150 120 170T250 158T400 172V300H0Z" fill="#3a2b26"/>';
      s += '<path d="M0 214Q110 198 220 212T400 206V300H0Z" fill="#6a4c2c"/>';
      s += '<path d="M24 262l20-8l14 10l22-6M128 272l18-10l24 8l10-6M246 262l24-6l16 10l20-8M330 280l16-8l14 6M70 288l18-6" stroke="#2a1a0e" stroke-width="1.6" fill="none"/>';
      [[30, 206, 1], [96, 210, 1.2], [168, 202, .9], [236, 208, 1.1], [306, 202, 1], [368, 208, 1.25]].forEach(function (a) {
        var x = a[0], y = a[1], k = a[2];
        s += '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M0 0V-14M0-9L-6-15M0-11L5-16" stroke="#2a1b12" stroke-width="2.4" fill="none"/>' +
          '<ellipse class="sg-tree" data-x="' + x + '" data-y="' + y + '" cx="0" cy="-19" rx="15" ry="7" fill="#3d4a26"/></g>';
      });
    }
    return s;
  }
  function grass(kind) {
    var s = '<g id="sg-grass">', col = kind === 'quema' ? '#8a6a34' : '#b08a4a';
    for (var i = 0; i < 34; i++) {
      var x = 6 + i * 11.6 + rnd(i + 120) * 6, y = 222 + rnd(i + 121) * 66;
      s += '<path data-x="' + n1(x) + '" data-y="' + n1(y) + '" d="M' + n1(x) + ' ' + n1(y) + 'l-3-7M' + n1(x) + ' ' + n1(y) + 'l0-9M' + n1(x) + ' ' + n1(y) + 'l3-7" stroke="' + col + '" stroke-width="1.3" fill="none"/>';
    }
    return s + '</g>';
  }
  function flameSVG(f, i) {
    return '<g transform="translate(' + n1(f.x) + ' ' + n1(f.y) + ')"><g id="sg-f' + i + '" opacity="0">' +
      '<ellipse cx="0" cy="-12" rx="26" ry="22" fill="url(#sg-glow)"/>' +
      '<path d="' + FLAME + '" fill="url(#sg-fo)"/>' +
      '<path d="' + FLAME + '" fill="#ff7a1a" transform="scale(.7)"/>' +
      '<path d="' + FLAME + '" fill="#ffe3a0" transform="scale(.4)"/></g>' +
      '<circle id="sg-e' + i + '" cx="0" cy="-1" r="2.2" fill="#ff5a14" opacity="0"/></g>';
  }
  var HELI = '<g id="sg-heli" opacity="0"><g id="sg-helibody">' +
    '<path d="M0 10V40" stroke="#4a4a4a" stroke-width=".9"/><path d="M-7 40H7L5 50H-5Z" fill="#e0701e" stroke="#2a1a10" stroke-width=".8"/>' +
    '<path d="M20-6L58-3V1L20 4Z" fill="#9a2a14"/><path d="M54-3L60-15H64L60 1Z" fill="#9a2a14"/>' +
    '<ellipse cx="61" cy="-8" rx="6" ry="6" fill="#ddd" opacity=".18"/><path id="sg-trot" d="M61-14V-2" stroke="#ddd" stroke-width="1.4"/>' +
    '<path d="M-26 2C-26-10-14-14 0-14L14-12C20-10 22-4 22 2C22 8 14 10 0 10H-18C-24 10-26 6-26 2Z" fill="#c23a1c"/>' +
    '<path d="M-25 1C-24-8-16-12-8-12V1Z" fill="#9fd6ff" opacity=".85"/><path d="M-20 5H18" stroke="#f1e6dc" stroke-width="1.4"/>' +
    '<path d="M-18 18H16M-12 10L-14 18M8 10L10 18" stroke="#2c2c2c" stroke-width="1.6" fill="none"/>' +
    '<rect x="-2" y="-19" width="4" height="6" fill="#3a3a3a"/><ellipse cx="0" cy="-20" rx="42" ry="2.4" fill="#ddd" opacity=".2"/>' +
    '<rect id="sg-rot" x="-42" y="-21" width="84" height="2" rx="1" fill="#e8e0d8"/></g></g>';
  var PLANE = '<g id="sg-plane" opacity="0">' +
    '<path d="M-6-8L10-8L-2-22L-14-22Z" fill="#bdb3a8"/>' +
    '<path d="M-28-6L-35-21H-27L-20-7Z" fill="#c8321a"/><path d="M-36-2H-24L-27-6H-38Z" fill="#bdb3a8"/>' +
    '<path d="M-34 0C-34-5-26-8-14-8H22C30-8 36-4 38 0C36 4 30 6 22 6H-24C-30 6-34 4-34 0Z" fill="#efe5d9"/>' +
    '<path d="M-31 1H35" stroke="#c8321a" stroke-width="2.6"/><path d="M18-8C24-8 30-6 33-2H18Z" fill="#7fb8de"/>' +
    '<path d="M-6 6H14L12 10H-4Z" fill="#7a7a7a"/><ellipse id="sg-prop" cx="39.5" cy="0" rx="1.8" ry="9" fill="#e8e0d8" opacity=".45"/>' +
    '<path d="M-6 2L12 2L-4 17L-17 17Z" fill="#e2d8cb"/></g>';
  function crewSVG(i) {
    return '<g id="sg-c' + i + '" opacity="0"><path id="sg-h' + i + '" d="M5-18Q14-4 30 0L90 2" stroke="#c9b24a" stroke-width="1.5" fill="none"/>' +
      '<path id="sg-la' + i + '" d="M0-14L-3 0" stroke="#3a3a46" stroke-width="3" stroke-linecap="round"/><path id="sg-lb' + i + '" d="M0-14L3 0" stroke="#30303a" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="3" y="-26" width="5" height="10" rx="1.5" fill="#6a4026"/><rect x="-4" y="-27" width="9" height="14" rx="2" fill="#e0601e"/>' +
      '<rect x="-4" y="-21" width="9" height="1.6" fill="#f4e27a"/><circle cx="0" cy="-31" r="3.6" fill="#e2b48c"/>' +
      '<path d="M-4.8-31.5A4.8 4.8 0 0 1 4.8-31.5Z" fill="#f2c230"/><path d="M-6-31.5H6" stroke="#f2c230" stroke-width="1.2"/>' +
      '<path d="M-1-23L-9-20" stroke="#e0601e" stroke-width="2.6" stroke-linecap="round"/><path d="M-8-20L-14-21" stroke="#2a2a2a" stroke-width="2.2"/></g>';
  }

  /* ---------- scene factory ---------- */
  function create(o) {
    var kind = o.kind in ORIGIN ? o.kind : 'sequia', means = o.means || { crew: 3 }, fl = flameSites(kind);
    var nCrew = means.crew || 0, burnR = 50 + 110 * clamp(Math.log(Math.max(o.hectares || 1, 10)) / Math.log(1e6), 0, 1);
    var s = '<svg class="scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="' + (o.aria || 'Ilustración esquemática del incendio') + '">' + defs();
    s += '<rect width="400" height="300" fill="url(#sg-sky)"/>';
    s += kind === 'sequia'
      ? '<g id="sg-sun"><circle cx="322" cy="64" r="48" fill="#ff9a3a" opacity=".16"/><circle id="sg-sunc" cx="322" cy="64" r="26" fill="#ffbe5c"/></g>'
      : '<g id="sg-sun"><circle id="sg-sunc" cx="336" cy="58" r="13" fill="#ffd9a0" opacity=".6"/></g>';
    s += landscape(kind);
    s += '<ellipse id="sg-burn" cx="' + (kind === 'sequia' ? 210 : 190) + '" cy="240" rx="0" ry="0" fill="url(#sg-burng)"/>';
    s += grass(kind);
    if (kind === 'sequia') for (var w = 0; w < 4; w++) s += '<path class="sg-wind" d="M' + (20 + w * 80) + ' ' + (96 + w * 20) + 'q60-12 120 0" stroke="rgba(255,235,210,.4)" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="14 18"/>';
    s += '<g id="sg-smoke" filter="url(#sg-blur)">';
    for (var p = 0; p < 28; p++) s += '<circle id="sg-p' + p + '" r="10" fill="#6a605c" opacity="0"/>';
    s += '</g>';
    fl.forEach(function (f, i) { s += flameSVG(f, i); });
    if (kind === 'intencional') s += '<g id="sg-lighter" transform="translate(' + (ORIGIN.intencional[0] - 8) + ' ' + (ORIGIN.intencional[1] + 4) + ')"><rect x="0" y="0" width="13" height="22" rx="3" fill="#c3bbb3"/><rect x="2" y="-5" width="9" height="6" rx="1" fill="#6e6862"/><g id="sg-lflame" transform="translate(6.5 -6) scale(.35)"><path d="' + FLAME + '" fill="url(#sg-fo)"/><path d="' + FLAME + '" fill="#ffe3a0" transform="scale(.45)"/></g></g>';
    s += '<rect id="sg-haze" width="400" height="300" fill="#ff6a1a" opacity="0" style="mix-blend-mode:screen"/>';
    s += '<polygon id="sg-pwater" points="0,0" fill="url(#sg-water)" opacity="0"/>';
    s += '<g id="sg-hdrops" opacity="0">';
    for (var d = 0; d < 12; d++) s += '<circle r="' + n1(1.4 + rnd(d + 200) * 1.2) + '" fill="#a8dcff"/>';
    s += '</g>';
    for (var c = 0; c < nCrew; c++) s += '<path id="sg-j' + c + '" d="M0 0" stroke="#9fd8ff" stroke-width="2" fill="none" stroke-dasharray="3 5" stroke-linecap="round" opacity="0"/>';
    for (c = 0; c < nCrew; c++) s += crewSVG(c);
    if (means.heli) s += '<path id="sg-hpath" d="M470 46C400 36 360 104 280 104S140 100 90 96S10 40-70 28" stroke="rgba(255,240,220,.22)" stroke-width="1" stroke-dasharray="3 5" fill="none" opacity="0"/>' + HELI;
    if (means.plane) s += '<path id="sg-ppath" d="M-90 66Q200 92 500 42" stroke="rgba(255,240,220,.22)" stroke-width="1" stroke-dasharray="3 5" fill="none" opacity="0"/>' + PLANE;
    s += '<g id="sg-label" opacity="0"><rect x="10" y="10" width="236" height="34" rx="6" fill="rgba(12,8,6,.72)"/>' +
      '<text x="18" y="25" font-size="10" fill="#f4eae3" font-weight="700">' + (o.hectares ? fmt(o.hectares) + ' ' + (o.unit || 'ha') : '') + ' · según la fuente</text>' +
      '<text x="18" y="37" font-size="8" fill="#c8b6aa">Mancha oscura: tamaño esquemático, escala logarítmica</text></g>';
    s += '</svg>';

    var R = null;
    function mount(svg) {
      var q = function (id) { return svg.querySelector('#' + id); };
      R = {
        s0: q('sg-s0'), s1: q('sg-s1'), s2: q('sg-s2'), sun: q('sg-sun'), sunc: q('sg-sunc'), burn: q('sg-burn'), haze: q('sg-haze'), label: q('sg-label'),
        lighter: q('sg-lighter'), lflame: q('sg-lflame'), pwater: q('sg-pwater'), hdrops: q('sg-hdrops'),
        heli: q('sg-heli'), helibody: q('sg-helibody'), rot: q('sg-rot'), trot: q('sg-trot'), hpath: q('sg-hpath'),
        plane: q('sg-plane'), prop: q('sg-prop'), ppath: q('sg-ppath'),
        flames: fl.map(function (f, i) { return { g: q('sg-f' + i), e: q('sg-e' + i), f: f }; }),
        puffs: Array.prototype.map.call(svg.querySelectorAll('#sg-smoke circle'), function (el) { return el; }),
        drops: Array.prototype.slice.call(svg.querySelectorAll('#sg-hdrops circle')),
        wind: Array.prototype.slice.call(svg.querySelectorAll('.sg-wind')),
        trees: Array.prototype.map.call(svg.querySelectorAll('.sg-tree'), function (el) { return { el: el, t: nearestT(fl, +el.getAttribute('data-x'), +el.getAttribute('data-y') + 30), c: el.getAttribute('fill') }; }),
        grass: Array.prototype.map.call(svg.querySelectorAll('#sg-grass path'), function (el) { return { el: el, t: nearestT(fl, +el.getAttribute('data-x'), +el.getAttribute('data-y')), c: el.getAttribute('stroke') }; }),
        crew: []
      };
      for (var i = 0; i < nCrew; i++) R.crew.push({ g: q('sg-c' + i), la: q('sg-la' + i), lb: q('sg-lb' + i), j: q('sg-j' + i), x: 296 + i * 21, y: 270 + (i % 2) * 9 });
      R.hlen = R.hpath ? R.hpath.getTotalLength() : 0;
      R.plen = R.ppath ? R.ppath.getTotalLength() : 0;
    }

    /* fire size of one site at progress s (0..1.15) */
    function flameK(f, s) {
      var grow = ease(seg(s, f.t, f.t + 0.12)) * (0.55 + 0.45 * ease(seg(s, S_FIRE, 0.47)));
      var start = 0.6 + 0.24 * (1 - f.x / 400) - (means.plane || means.heli ? 0.04 : 0);
      var cut = ease(seg(s, start, start + 0.28));
      return { k: grow * (1 - 0.72 * cut), cut: cut, lit: grow };
    }

    function update(s) {
      if (!R) return;
      s = clamp(s, 0, 1);
      var I = ease(seg(s, 0.03, 0.45)) * (1 - 0.6 * ease(seg(s, 0.62, 1)));
      R.s0.setAttribute('stop-color', mix('#18202e', '#2a0f0c', I));
      R.s1.setAttribute('stop-color', mix('#3a3040', '#6e1f10', I));
      R.s2.setAttribute('stop-color', mix('#7a5c48', '#c8501c', I));
      R.haze.setAttribute('opacity', (I * 0.12).toFixed(3));
      R.sun.setAttribute('opacity', (1 - 0.7 * I).toFixed(2));
      if (kind === 'sequia') R.sunc.setAttribute('r', n1(26 + 2 * Math.sin(s * 40)));
      R.wind.forEach(function (w, i) { w.setAttribute('stroke-dashoffset', n1(-s * 900 - i * 13)); w.setAttribute('opacity', (1 - 0.6 * seg(s, 0.5, 0.7)).toFixed(2)); });

      if (R.lighter) {
        var lo = 1 - seg(s, 0.12, 0.2);
        R.lighter.setAttribute('opacity', lo.toFixed(2));
        R.lflame.setAttribute('transform', 'translate(6.5 -6) scale(' + (0.35 * (0.9 + 0.1 * Math.sin(s * 300))).toFixed(3) + ')');
      }

      var bt = ease(seg(s, 0.22, S_FIGHT));
      R.burn.setAttribute('rx', n1(burnR * bt)); R.burn.setAttribute('ry', n1(burnR * 0.3 * bt));
      R.label.setAttribute('opacity', seg(s, 0.36, 0.46).toFixed(2));

      var sizes = R.flames.map(function (o, i) {
        var r = flameK(o.f, s), k = r.k * o.f.k, wob = Math.sin(s * 95 + i * 1.7), wob2 = Math.sin(s * 61 + i * 2.3);
        o.g.setAttribute('opacity', r.lit > 0.02 ? Math.min(1, r.lit * 3).toFixed(2) : '0');
        o.g.setAttribute('transform', 'scale(' + (k * (1 + 0.05 * wob2)).toFixed(3) + ' ' + (k * (1 + 0.1 * wob)).toFixed(3) + ') skewX(' + n1(4 * wob2) + ')');
        o.e.setAttribute('opacity', (r.cut * 0.9 * (0.75 + 0.25 * Math.sin(s * 70 + i))).toFixed(2));
        return k;
      });

      R.trees.forEach(function (t) { t.el.setAttribute('fill', mix(t.c, '#140c08', ease(seg(s, t.t + 0.05, t.t + 0.2)))); });
      R.grass.forEach(function (g) { g.el.setAttribute('stroke', mix(g.c, '#1a120c', ease(seg(s, g.t, g.t + 0.1)))); });

      var cols = [1, 4, 7, 10, 13], steam = seg(s, 0.6, 0.95);
      R.puffs.forEach(function (el, i) {
        var c = i % cols.length, src = R.flames[cols[c]] || R.flames[0], dens = Math.min(1, sizes[cols[c]] * 1.4 + (s > S_FIRE ? 0.25 * seg(s, S_FIRE, 1) : 0));
        var u = frac(s * 5 + i * 0.137 + c * 0.21), x = src.f.x + u * 70 + Math.sin(u * 6 + i) * 6, y = src.f.y - 20 - u * 190;
        el.setAttribute('cx', n1(x)); el.setAttribute('cy', n1(y)); el.setAttribute('r', n1(8 + u * 34));
        el.setAttribute('opacity', (dens * Math.sin(Math.PI * u) * 0.6).toFixed(2));
        el.setAttribute('fill', mix('#4a3e3a', '#a8a29e', steam));
      });

      var water = [];
      R.crew.forEach(function (m, i) {
        var a = ease(seg(s, 0.56 + i * 0.03, 0.72 + i * 0.03)), x = lerp(440 + i * 16, m.x, a), walking = a > 0 && a < 1;
        var sw = walking ? Math.sin(s * 320 + i) * 16 : 0;
        m.g.setAttribute('opacity', a > 0 ? '1' : '0');
        m.g.setAttribute('transform', 'translate(' + n1(x) + ' ' + m.y + ')');
        m.la.setAttribute('transform', 'rotate(' + n1(sw) + ' 0 -14)'); m.lb.setAttribute('transform', 'rotate(' + n1(-sw) + ' 0 -14)');
        var on = a >= 1 ? seg(s, 0.72 + i * 0.03, 0.76 + i * 0.03) : 0, nx = x - 14, ny = m.y - 21, tx = nx - 66 - i * 6, ty = m.y - 30 - (i % 2) * 8;
        m.j.setAttribute('d', 'M' + n1(nx) + ' ' + n1(ny) + 'Q' + n1(nx - 30) + ' ' + n1(ny - 34) + ' ' + n1(tx) + ' ' + n1(ty));
        m.j.setAttribute('stroke-dashoffset', n1(-s * 1400));
        m.j.setAttribute('opacity', (on * 0.9).toFixed(2));
        if (on) water.push(tx);
      });

      if (R.plane) {
        var pu = seg(s, 0.58, 0.84), pt = R.ppath.getPointAtLength(R.plen * pu), vis = pu > 0 && pu < 1;
        R.plane.setAttribute('opacity', vis ? '1' : '0'); R.ppath.setAttribute('opacity', seg(s, 0.55, 0.6) * (1 - seg(s, 0.84, 0.9)) + '');
        R.plane.setAttribute('transform', 'translate(' + n1(pt.x) + ' ' + n1(pt.y) + ') rotate(' + n1(lerp(4, -8, pu)) + ')');
        R.prop.setAttribute('ry', n1(9 * Math.abs(Math.cos(s * 400))));
        var release = vis && pt.x > 70 && pt.x < 340 ? 1 : 0;
        R.pwater.setAttribute('opacity', release ? '0.85' : '0');
        R.pwater.setAttribute('points', [[pt.x - 4, pt.y + 9], [pt.x + 10, pt.y + 9], [pt.x - 40, GROUND - 30], [pt.x - 110, GROUND - 30]].map(function (q) { return n1(q[0]) + ',' + n1(q[1]); }).join(' '));
      }
      if (R.heli) {
        var hu = seg(s, 0.66, 0.99), hp = R.hpath.getPointAtLength(R.hlen * hu), hvis = hu > 0 && hu < 1;
        R.heli.setAttribute('opacity', hvis ? '1' : '0'); R.hpath.setAttribute('opacity', seg(s, 0.62, 0.67) * (1 - seg(s, 0.97, 1)) + '');
        R.heli.setAttribute('transform', 'translate(' + n1(hp.x) + ' ' + n1(hp.y) + ')');
        R.helibody.setAttribute('transform', 'rotate(' + n1(-6 + 3 * Math.sin(hu * 6)) + ')');
        R.rot.setAttribute('transform', 'scale(' + Math.cos(s * 520).toFixed(3) + ' 1)');
        R.trot.setAttribute('transform', 'rotate(' + n1(s * 9000) + ' 61 -8)');
        var dropOn = hvis && hp.x > 60 && hp.x < 340;
        R.hdrops.setAttribute('opacity', dropOn ? '1' : '0');
        R.drops.forEach(function (el, i) {
          var u = frac(s * 30 + i / R.drops.length), y0 = hp.y + 52;
          el.setAttribute('cx', n1(hp.x + (rnd(i + 300) - 0.5) * 10 + u * 6)); el.setAttribute('cy', n1(y0 + u * Math.max(10, GROUND - 20 - y0)));
        });
      }
    }
    return { html: s, mount: mount, update: update };
  }

  window.FireScene = { create: create, S_FIRE: S_FIRE, S_FIGHT: S_FIGHT };
})();
