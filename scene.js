/* Scroll-driven schematic fire scene.
   The state is a pure function of the progress s (0..1), reversible when scrolling up.
   Every element follows a long, eased segment of s, so any scroll step changes something visible.
   Stages: 0–0.34 ignition, 0.34–0.67 fire, 0.67–1 suppression.
   Ambient CSS motion (flicker, smoke drift, embers) runs on top and never changes the state. */
(function () {
  'use strict';
  var S_FIRE = 0.34, S_FIGHT = 0.67, GROUND = 262;

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(s, a, b) { return clamp((s - a) / (b - a), 0, 1); }
  function ease(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function frac(x) { return x - Math.floor(x); }
  function rnd(i) { return frac(Math.sin(i * 127.1 + 311.7) * 43758.5453); }
  function hex(h) { return [1, 3, 5].map(function (k) { return parseInt(h.slice(k, k + 2), 16); }); }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(lerp(A[k], B[k], t)); }).join(',') + ')'; }
  /* three-stop colour ramp: a at 0, b at m, c at 1 */
  function ramp(a, b, c, m, t) { return t < m ? mix(a, b, ease(t / m)) : mix(b, c, ease((t - m) / (1 - m))); }
  function n1(v) { return v.toFixed(1); }
  function fmt(n) { return Math.round(n).toLocaleString('es-AR'); }
  /* piecewise-linear track with eased segments: keys = [[s, x, y], ...] */
  function track(keys, s) {
    if (s <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], dx: 0, i: 0 };
    for (var i = 1; i < keys.length; i++) {
      if (s <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i], t = ease(seg(s, a[0], b[0]));
        return { x: lerp(a[1], b[1], t), y: lerp(a[2], b[2], t), dx: b[1] - a[1], i: i };
      }
    }
    var l = keys[keys.length - 1];
    return { x: l[1], y: l[2], dx: 0, i: keys.length };
  }

  /* ---------- layout per cause: the action sits centre-right, the left third may be under text cards ---------- */
  var ORIGIN = { intencional: [178, 246], quema: [150, 236], sequia: [250, 232] };
  function flameSites(kind) {
    var L = [], o = ORIGIN[kind];
    for (var i = 0; i < 15; i++) {
      var x = 150 + i * 12.5 + rnd(i) * 8, y = 214 + rnd(i + 20) * 40, k = 0.7 + rnd(i + 40) * 0.55, t;
      if (kind === 'intencional') t = 0.02 + 0.3 * Math.min(1, Math.hypot(x - o[0], (y - o[1]) * 1.5) / 160);
      else if (kind === 'quema') t = 0.02 + 0.3 * (x - 150) / 190;
      else t = 0.03 + 0.29 * (0.5 * rnd(i + 60) + 0.5 * Math.abs(x - o[0]) / 100);
      L.push({ x: x, y: y, k: k * (0.75 + (y - 212) / 160), t: Math.min(t, 0.32) });
    }
    return L.sort(function (a, b) { return a.y - b.y; });
  }
  function nearestT(fl, x, y) {
    var best = 1, bd = 1e9;
    fl.forEach(function (f) { var d = Math.hypot(f.x - x, (f.y - y) * 1.6); if (d < bd) { bd = d; best = f.t; } });
    return bd < 60 ? best : 2;
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
      '<radialGradient id="sg-puff"><stop id="sg-pf0" offset="0" stop-opacity=".9"/><stop id="sg-pf1" offset=".55" stop-opacity=".5"/><stop id="sg-pf2" offset="1" stop-opacity="0"/></radialGradient>' +
      '</defs>';
  }
  /* parallax layers: far (mountains, horizon) and mid (hills) pan at different speeds; ground stays */
  function landscape(kind, lake) {
    var far = '', mid = '', ground = '';
    if (kind === 'intencional') {
      far += '<path d="M0 172L38 142L70 154L112 104L150 140L186 120L232 152L272 92L312 134L352 116L400 146V230H0Z" fill="#262230"/>';
      far += '<path d="M104 112L112 104L121 113L114 110ZM262 101L272 92L283 103L274 99Z" fill="#9a90a6" opacity=".55"/>';
      mid += '<path d="M0 198Q100 172 200 190T400 184V300H0Z" fill="#33251b"/>';
      for (var c = 0; c < 16; c++) { var cx = 8 + c * 25 + rnd(c + 90) * 8, cy = 192 - Math.sin(c * 0.6) * 6, h = 14 + rnd(c + 91) * 8; mid += '<path class="sg-tree" data-x="' + cx + '" data-y="' + cy + '" d="M' + n1(cx) + ' ' + n1(cy - h) + 'l' + n1(h * 0.32) + ' ' + n1(h) + 'h' + n1(-h * 0.64) + 'Z" fill="#1f3a26"/>'; }
      ground += '<path d="M0 222Q120 206 240 218T400 214V300H0Z" fill="#4a3520"/>';
    } else if (kind === 'quema') {
      far += '<rect y="186" width="400" height="30" fill="#2b2c2a"/><rect y="196" width="400" height="5" fill="#3b4c58" opacity=".7"/>';
      for (var t = 0; t < 22; t++) { var tx = t * 19 + rnd(t + 70) * 6, r = 8 + rnd(t + 71) * 6; far += '<ellipse class="sg-tree" data-x="' + n1(tx) + '" data-y="194" cx="' + n1(tx) + '" cy="' + n1(192 - r * 0.4) + '" rx="' + n1(r) + '" ry="' + n1(r * 0.7) + '" fill="#1f3a26"/>'; }
      ground += '<path d="M0 204H400V300H0Z" fill="#4f3b22"/>';
      for (var row = 0; row < 7; row++) { var y = 210 + row * row * 1.9 + row * 6; ground += '<path d="M0 ' + n1(y) + 'H400" stroke="' + (row % 2 ? '#5d4628' : '#43321c') + '" stroke-width="' + n1(2 + row * 0.9) + '"/>'; }
    } else {
      far += '<path d="M0 184Q60 150 120 170T250 158T400 172V300H0Z" fill="#3a2b26"/>';
      ground += '<path d="M0 214Q110 198 220 212T400 206V300H0Z" fill="#6a4c2c"/>';
      ground += '<path d="M24 262l20-8l14 10l22-6M128 272l18-10l24 8l10-6M246 262l24-6l16 10l20-8M330 280l16-8l14 6M70 288l18-6" stroke="#2a1a0e" stroke-width="1.6" fill="none"/>';
      [[30, 206, 1], [96, 210, 1.2], [168, 202, .9], [236, 208, 1.1], [306, 202, 1], [368, 208, 1.25]].forEach(function (a) {
        var x = a[0], y = a[1], k = a[2];
        ground += '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M0 0V-14M0-9L-6-15M0-11L5-16" stroke="#2a1b12" stroke-width="2.4" fill="none"/>' +
          '<ellipse class="sg-tree" data-x="' + x + '" data-y="' + y + '" cx="0" cy="-19" rx="15" ry="7" fill="#3d4a26"/></g>';
      });
    }
    if (lake) ground += '<ellipse cx="362" cy="226" rx="46" ry="7" fill="#26404f"/><ellipse cx="356" cy="225" rx="30" ry="3" fill="#3d6176" opacity=".7"/>';
    return { far: far, mid: mid, ground: ground };
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
    var amb = 'animation-duration:' + n1(0.9 + rnd(i + 600) * 0.7) + 's;animation-delay:-' + n1(rnd(i + 601) * 2) + 's';
    return '<g transform="translate(' + n1(f.x) + ' ' + n1(f.y) + ')"><g id="sg-f' + i + '" opacity="0">' +
      '<ellipse class="amb-gl" style="' + amb + '" cx="0" cy="-12" rx="26" ry="22" fill="url(#sg-glow)"/>' +
      '<g class="amb-fl" style="' + amb + '"><path d="' + FLAME + '" fill="url(#sg-fo)"/>' +
      '<path d="' + FLAME + '" fill="#ff7a1a" transform="scale(.7)"/>' +
      '<path d="' + FLAME + '" fill="#ffe3a0" transform="scale(.4)"/></g></g>' +
      '<circle id="sg-e' + i + '" cx="0" cy="-1" r="2.2" fill="#ff5a14" opacity="0"/></g>';
  }
  /* helicopter faces left; the bucket hangs from a rope whose length changes when dipping */
  var HELI = '<g id="sg-heli" opacity="0"><g id="sg-hflip"><g id="sg-helibody">' +
    '<path id="sg-rope" d="M0 10V40" stroke="#4a4a4a" stroke-width=".9"/>' +
    '<g id="sg-bucket" transform="translate(0 40)"><path d="M-7 0H7L5 10H-5Z" fill="#e0701e" stroke="#2a1a10" stroke-width=".8"/><path id="sg-bfill" d="M-6 2H6L4.6 9H-4.6Z" fill="#7fc4ff" opacity="0"/></g>' +
    '<path d="M20-6L58-3V1L20 4Z" fill="#9a2a14"/><path d="M54-3L60-15H64L60 1Z" fill="#9a2a14"/>' +
    '<ellipse cx="61" cy="-8" rx="6" ry="6" fill="#ddd" opacity=".18"/><path id="sg-trot" d="M61-14V-2" stroke="#ddd" stroke-width="1.4"/>' +
    '<path d="M-26 2C-26-10-14-14 0-14L14-12C20-10 22-4 22 2C22 8 14 10 0 10H-18C-24 10-26 6-26 2Z" fill="#c23a1c"/>' +
    '<path d="M-25 1C-24-8-16-12-8-12V1Z" fill="#9fd6ff" opacity=".85"/><path d="M-20 5H18" stroke="#f1e6dc" stroke-width="1.4"/>' +
    '<path d="M-18 18H16M-12 10L-14 18M8 10L10 18" stroke="#2c2c2c" stroke-width="1.6" fill="none"/>' +
    '<rect x="-2" y="-19" width="4" height="6" fill="#3a3a3a"/><ellipse cx="0" cy="-20" rx="42" ry="2.4" fill="#ddd" opacity=".2"/>' +
    '<rect id="sg-rot" x="-42" y="-21" width="84" height="2" rx="1" fill="#e8e0d8"/></g></g></g>';
  /* hydrant plane faces right: it crosses left to right */
  var PLANE = '<g id="sg-plane" opacity="0">' +
    '<path d="M-6-8L10-8L-2-22L-14-22Z" fill="#bdb3a8"/>' +
    '<path d="M-28-6L-35-21H-27L-20-7Z" fill="#c8321a"/><path d="M-36-2H-24L-27-6H-38Z" fill="#bdb3a8"/>' +
    '<path d="M-34 0C-34-5-26-8-14-8H22C30-8 36-4 38 0C36 4 30 6 22 6H-24C-30 6-34 4-34 0Z" fill="#efe5d9"/>' +
    '<path d="M-31 1H35" stroke="#c8321a" stroke-width="2.6"/><path d="M18-8C24-8 30-6 33-2H18Z" fill="#7fb8de"/>' +
    '<path d="M-6 6H14L12 10H-4Z" fill="#7a7a7a"/><ellipse id="sg-prop" cx="39.5" cy="0" rx="1.8" ry="9" fill="#e8e0d8" opacity=".45"/>' +
    '<path d="M-6 2L12 2L-4 17L-17 17Z" fill="#e2d8cb"/></g>';
  function crewSVG(i) {
    return '<g id="sg-c' + i + '" opacity="0"><path d="M5-18Q14-4 30 0L90 2" stroke="#c9b24a" stroke-width="1.5" fill="none"/>' +
      '<path id="sg-la' + i + '" d="M0-14L-3 0" stroke="#3a3a46" stroke-width="3" stroke-linecap="round"/><path id="sg-lb' + i + '" d="M0-14L3 0" stroke="#30303a" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="3" y="-26" width="5" height="10" rx="1.5" fill="#6a4026"/><rect x="-4" y="-27" width="9" height="14" rx="2" fill="#e0601e"/>' +
      '<rect x="-4" y="-21" width="9" height="1.6" fill="#f4e27a"/><circle cx="0" cy="-31" r="3.6" fill="#e2b48c"/>' +
      '<path d="M-4.8-31.5A4.8 4.8 0 0 1 4.8-31.5Z" fill="#f2c230"/><path d="M-6-31.5H6" stroke="#f2c230" stroke-width="1.2"/>' +
      '<path d="M-1-23L-9-20" stroke="#e0601e" stroke-width="2.6" stroke-linecap="round"/><path d="M-8-20L-14-21" stroke="#2a2a2a" stroke-width="2.2"/></g>';
  }

  /* ---------- timelines ---------- */
  var PLANE_PATH = 'M-80 128C40 140 140 166 240 164S420 118 520 70', PLANE_IN = S_FIGHT, PLANE_OUT = 0.9;
  /* heli: lake -> fire -> lake -> fire, with dips (refill) and drops */
  var HELI_KEYS = [[0.69, 450, 60], [0.74, 362, 176], [0.77, 362, 176], [0.83, 246, 116], [0.86, 232, 114], [0.91, 362, 176], [0.935, 362, 176], [0.985, 204, 114], [1, 196, 112]];
  var HELI_DIPS = [[0.74, 0.77], [0.91, 0.935]], HELI_DROPS = [[0.83, 0.865], [0.985, 1.01]];
  function inAny(s, list) { for (var i = 0; i < list.length; i++) if (s >= list[i][0] && s <= list[i][1]) return list[i]; return null; }
  function bucketFull(s) { return (s > 0.765 && s < 0.85) || (s > 0.93 && s < 0.995) ? 1 : 0; }

  /* ---------- scene factory ---------- */
  function create(o) {
    var kind = o.kind in ORIGIN ? o.kind : 'sequia', means = o.means || { crew: 3 }, fl = flameSites(kind);
    var nCrew = means.crew || 0, burnR = 46 + 100 * clamp(Math.log(Math.max(o.hectares || 1, 10)) / Math.log(1e6), 0, 1);
    var burnX = kind === 'sequia' ? 250 : 240;
    var s = '<svg class="scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label="' + (o.aria || 'Ilustración esquemática del incendio') + '">' + defs();
    s += '<rect width="400" height="300" fill="url(#sg-sky)"/>';
    s += kind === 'sequia'
      ? '<g id="sg-sun"><circle cx="330" cy="96" r="44" fill="#ff9a3a" opacity=".16"/><circle id="sg-sunc" cx="330" cy="96" r="24" fill="#ffbe5c"/></g>'
      : '<g id="sg-sun"><circle id="sg-sunc" cx="336" cy="92" r="13" fill="#ffd9a0" opacity=".7"/></g>';
    var LS = landscape(kind, !!means.heli);
    s += '<g id="sg-far">' + LS.far + '</g><g id="sg-mid">' + LS.mid + '</g>' + LS.ground;
    s += '<ellipse id="sg-burn" cx="' + burnX + '" cy="240" rx="0" ry="0" fill="url(#sg-burng)"/>';
    s += grass(kind);
    for (var w = 0; w < 4; w++) s += '<path class="sg-wind" d="M' + (120 + w * 60) + ' ' + (110 + w * 18) + 'q60-12 120 0" stroke="rgba(255,235,210,.4)" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-dasharray="14 18" opacity="0"/>';
    s += '<g id="sg-smoke">';
    for (var p = 0; p < 30; p++) s += '<g class="amb-sm" style="--sx:' + n1(12 + rnd(p + 400) * 8) + 'px;animation-duration:' + n1(6 + rnd(p + 401) * 3) + 's;animation-delay:-' + n1(rnd(p + 402) * 9) + 's"><circle id="sg-p' + p + '" r="10" fill="url(#sg-puff)" opacity="0"/></g>';
    s += '</g>';
    fl.forEach(function (f, i) { s += flameSVG(f, i); });
    s += '<g id="sg-embers">';
    for (var e2 = 0; e2 < 12; e2++) {
      var fi = (e2 * 5) % fl.length, f0 = fl[fi];
      s += '<g data-f="' + fi + '" opacity="0" transform="translate(' + n1(f0.x + (rnd(e2 + 500) - 0.5) * 14) + ' ' + n1(f0.y - 14) + ')"><circle class="amb-em" r="' + n1(1 + rnd(e2 + 501) * 0.8) + '" fill="#ffc067" style="--dx:' + n1((rnd(e2 + 502) - 0.3) * 22) + 'px;--dy:-' + n1(40 + rnd(e2 + 503) * 30) + 'px;animation-duration:' + n1(2 + rnd(e2 + 504) * 2) + 's;animation-delay:-' + n1(rnd(e2 + 505) * 4) + 's"/></g>';
    }
    s += '</g>';
    if (kind === 'intencional') s += '<g id="sg-lighter" transform="translate(' + (ORIGIN.intencional[0] - 8) + ' ' + (ORIGIN.intencional[1] + 4) + ')"><rect x="0" y="0" width="13" height="22" rx="3" fill="#c3bbb3"/><rect x="2" y="-5" width="9" height="6" rx="1" fill="#6e6862"/><g id="sg-lflame" transform="translate(6.5 -6) scale(.35)"><path d="' + FLAME + '" fill="url(#sg-fo)"/><path d="' + FLAME + '" fill="#ffe3a0" transform="scale(.45)"/></g></g>';
    s += '<rect id="sg-haze" width="400" height="300" fill="#ff6a1a" opacity="0" style="mix-blend-mode:screen"/>';
    s += '<polygon id="sg-pwater" points="0,0" fill="url(#sg-water)" opacity="0"/>';
    s += '<g id="sg-hdrops" opacity="0">';
    for (var d = 0; d < 14; d++) s += '<circle r="' + n1(1.4 + rnd(d + 200) * 1.2) + '" fill="#a8dcff"/>';
    s += '</g>';
    for (var c = 0; c < nCrew; c++) s += '<path id="sg-j' + c + '" d="M0 0" stroke="#9fd8ff" stroke-width="2" fill="none" stroke-dasharray="3 5" stroke-linecap="round" opacity="0"/>';
    for (c = 0; c < nCrew; c++) s += crewSVG(c);
    if (means.plane) s += '<path id="sg-ppath" d="' + PLANE_PATH + '" stroke="rgba(255,240,220,.28)" stroke-width="1" stroke-dasharray="3 5" fill="none" opacity="0"/>' + PLANE;
    if (means.heli) s += '<path id="sg-hpath" d="M' + HELI_KEYS.map(function (k) { return k[1] + ' ' + k[2]; }).join('L') + '" stroke="rgba(255,240,220,.22)" stroke-width="1" stroke-dasharray="3 5" fill="none" opacity="0"/>' + HELI;
    s += '<g id="sg-label" opacity="0"><rect x="186" y="74" width="168" height="31" rx="6" fill="rgba(10,10,10,.82)"/>' +
      '<text id="sg-count" x="194" y="88" font-size="9.6" fill="#f4eae3" font-weight="700">0 ' + (o.unit || 'ha') + ' · según la fuente</text>' +
      '<text x="194" y="99" font-size="7" fill="#c8b6aa">Mancha oscura: tamaño esquemático (escala log.)</text></g>';
    s += '</svg>';

    var R = null;
    function mount(svg) {
      var q = function (id) { return svg.querySelector('#' + id); };
      R = {
        s0: q('sg-s0'), s1: q('sg-s1'), s2: q('sg-s2'), sun: q('sg-sun'), sunc: q('sg-sunc'), burn: q('sg-burn'), haze: q('sg-haze'), label: q('sg-label'), count: q('sg-count'),
        far: q('sg-far'), mid: q('sg-mid'), pf: [q('sg-pf0'), q('sg-pf1'), q('sg-pf2')],
        lighter: q('sg-lighter'), lflame: q('sg-lflame'), pwater: q('sg-pwater'), hdrops: q('sg-hdrops'),
        heli: q('sg-heli'), hflip: q('sg-hflip'), helibody: q('sg-helibody'), rot: q('sg-rot'), trot: q('sg-trot'), hpath: q('sg-hpath'),
        rope: q('sg-rope'), bucket: q('sg-bucket'), bfill: q('sg-bfill'),
        plane: q('sg-plane'), prop: q('sg-prop'), ppath: q('sg-ppath'),
        flames: fl.map(function (f, i) { return { g: q('sg-f' + i), e: q('sg-e' + i), f: f }; }),
        puffs: Array.prototype.slice.call(svg.querySelectorAll('#sg-smoke circle')),
        drops: Array.prototype.slice.call(svg.querySelectorAll('#sg-hdrops circle')),
        wind: Array.prototype.slice.call(svg.querySelectorAll('.sg-wind')),
        embers: Array.prototype.map.call(svg.querySelectorAll('#sg-embers > g'), function (el) { return { el: el, f: +el.getAttribute('data-f') }; }),
        trees: Array.prototype.map.call(svg.querySelectorAll('.sg-tree'), function (el) { return { el: el, t: nearestT(fl, +el.getAttribute('data-x'), +el.getAttribute('data-y') + 30), c: el.getAttribute('fill') }; }),
        grass: Array.prototype.map.call(svg.querySelectorAll('#sg-grass path'), function (el) { return { el: el, t: nearestT(fl, +el.getAttribute('data-x'), +el.getAttribute('data-y')), c: el.getAttribute('stroke') }; }),
        crew: []
      };
      for (var i = 0; i < nCrew; i++) R.crew.push({ g: q('sg-c' + i), la: q('sg-la' + i), lb: q('sg-lb' + i), j: q('sg-j' + i), x: 334 + i * 13, y: 270 + (i % 2) * 9 });
      R.plen = R.ppath ? R.ppath.getTotalLength() : 0;
    }

    /* when the plane passes over x (approximate inverse of its eased track) */
    function planeAt(x) { return PLANE_IN + (PLANE_OUT - PLANE_IN) * clamp((x + 80) / 600, 0, 1); }
    /* fire size of one site: ignition, a peak at mid scroll, then a gradual decline that never reaches zero */
    function flameK(f, s) {
      var lit = ease(seg(s, f.t, f.t + 0.16));
      var env = s < 0.52 ? 0.5 + 0.5 * ease(seg(s, 0.12, 0.52)) : 1 - 0.55 * ease(seg(s, 0.52, 1));
      var cut = 0;
      if (means.plane) cut += 0.18 * ease(seg(s, planeAt(f.x), planeAt(f.x) + 0.05));
      if (means.heli) { if (Math.abs(f.x - 240) < 40) cut += 0.15 * ease(seg(s, 0.83, 0.87)); if (Math.abs(f.x - 200) < 40) cut += 0.12 * ease(seg(s, 0.985, 1)); }
      if (nCrew && f.x > 250) cut += 0.2 * ease(seg(s, 0.8, 1));
      var k = lit * env * (1 - Math.min(cut, 0.45));
      return { k: Math.max(k, lit * 0.22), lit: lit, cut: cut };
    }

    function update(s) {
      if (!R) return;
      s = clamp(s, 0, 1);
      var heat = s < 0.52 ? ease(seg(s, 0.02, 0.52)) : 1 - 0.6 * ease(seg(s, 0.52, 1));
      /* sky: day -> reddish -> smoke grey, continuously */
      R.s0.setAttribute('stop-color', ramp('#2d4157', '#2a0f0c', '#2b2a2c', 0.55, s));
      R.s1.setAttribute('stop-color', ramp('#6c7f8c', '#6e1f10', '#4d4644', 0.55, s));
      R.s2.setAttribute('stop-color', ramp('#c09a74', '#c8501c', '#7a6656', 0.55, s));
      R.haze.setAttribute('opacity', (heat * 0.12).toFixed(3));
      R.sun.setAttribute('opacity', (1 - 0.8 * ease(seg(s, 0, 0.6))).toFixed(2));
      if (!o.still) {
        R.far.setAttribute('transform', 'translate(' + n1(-16 + 10 - 20 * s) + ' ' + n1(10 * s) + ') scale(1.08 1)');
        R.mid.setAttribute('transform', 'translate(' + n1(-16 + 14 - 28 * s) + ' ' + n1(5 * s) + ') scale(1.08 1)');
      }
      var wind = ease(seg(s, 0.05, 0.75));
      R.wind.forEach(function (w, i) { w.setAttribute('stroke-dashoffset', n1(-s * 1200 - i * 13)); w.setAttribute('opacity', (0.15 + 0.6 * wind * (1 - 0.5 * seg(s, 0.8, 1))).toFixed(2)); });

      if (R.lighter) {
        R.lighter.setAttribute('opacity', (1 - seg(s, 0.08, 0.16)).toFixed(2));
        R.lflame.setAttribute('transform', 'translate(6.5 -6) scale(' + (0.2 + 0.25 * seg(s, 0, 0.06)).toFixed(3) + ')');
      }

      /* burned area grows to the peak and then stays */
      var bt = ease(seg(s, 0.05, 0.6));
      R.burn.setAttribute('rx', n1(burnR * bt)); R.burn.setAttribute('ry', n1(burnR * 0.3 * bt));
      R.label.setAttribute('opacity', seg(s, 0.02, 0.07).toFixed(2));
      R.count.textContent = fmt((o.hectares || 0) * ease(seg(s, 0.05, 0.6))) + ' ' + (o.unit || 'ha') + ' · según la fuente';

      var lits = [], sizes = R.flames.map(function (q, i) {
        var r = flameK(q.f, s), k = r.k * q.f.k, tall = 1 + 0.25 * heat;
        lits.push(r.lit);
        q.g.setAttribute('opacity', r.lit > 0.02 ? Math.min(1, r.lit * 3).toFixed(2) : '0');
        q.g.setAttribute('transform', 'scale(' + k.toFixed(3) + ' ' + (k * tall).toFixed(3) + ')');
        q.e.setAttribute('opacity', (r.lit * 0.9 * ease(seg(s, 0.6, 1))).toFixed(2));
        return k;
      });
      R.embers.forEach(function (e) { e.el.setAttribute('opacity', Math.min(1, (lits[e.f] || 0) * 2).toFixed(2)); });

      R.trees.forEach(function (t) { t.el.setAttribute('fill', mix(t.c, '#140c08', ease(seg(s, t.t + 0.05, t.t + 0.25)))); });
      R.grass.forEach(function (g) { g.el.setAttribute('stroke', mix(g.c, '#1a120c', ease(seg(s, g.t, g.t + 0.12)))); });

      /* smoke plume: grows taller and wider, leans with the wind, light grey -> near black -> grey */
      R.pf.forEach(function (st) { st.setAttribute('stop-color', ramp('#b8b0aa', '#2c2624', '#8e8884', 0.6, s)); });
      var H = 30 + 200 * ease(seg(s, 0.02, 0.6)), lean = 20 + 150 * ease(seg(s, 0.05, 1)), dens = Math.min(1, 0.25 + 0.9 * heat);
      var bx = ORIGIN[kind][0] + 50 * ease(seg(s, 0, 0.5)), by = 222;
      R.puffs.forEach(function (el, i) {
        var u = frac(i / R.puffs.length + s * 2.2), side = (i % 3 - 1) * (6 + 20 * u);
        el.setAttribute('cx', n1(bx + lean * Math.pow(u, 1.4) + side)); el.setAttribute('cy', n1(by - u * H));
        el.setAttribute('r', n1((10 + u * 36) * (0.6 + 0.6 * ease(seg(s, 0.02, 0.55)))));
        el.setAttribute('opacity', (dens * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.95).toFixed(2));
      });

      /* crew walk in single file towards the fire front during the whole suppression stage */
      R.crew.forEach(function (m, i) {
        var a = ease(seg(s, 0.64 + i * 0.03, 1)), x = lerp(430 + i * 26, m.x, a), walking = a > 0 && a < 1;
        var sw = walking ? Math.sin(s * 360 + i) * 16 : 0;
        m.g.setAttribute('opacity', a > 0 ? '1' : '0');
        m.g.setAttribute('transform', 'translate(' + n1(x) + ' ' + m.y + ')');
        m.la.setAttribute('transform', 'rotate(' + n1(sw) + ' 0 -14)'); m.lb.setAttribute('transform', 'rotate(' + n1(-sw) + ' 0 -14)');
        var on = seg(a, 0.45, 0.6), reach = 40 + 40 * a, nx = x - 14, ny = m.y - 21, tx = nx - reach, ty = m.y - 26 - (i % 2) * 8;
        m.j.setAttribute('d', 'M' + n1(nx) + ' ' + n1(ny) + 'Q' + n1(nx - reach * 0.45) + ' ' + n1(ny - 30) + ' ' + n1(tx) + ' ' + n1(ty));
        m.j.setAttribute('stroke-dashoffset', n1(-s * 1400));
        m.j.setAttribute('opacity', (on * 0.9).toFixed(2));
      });

      if (R.plane) {
        var pu = ease(seg(s, PLANE_IN, PLANE_OUT)), pt = R.ppath.getPointAtLength(R.plen * pu), vis = s > PLANE_IN && s < PLANE_OUT;
        var pt2 = R.ppath.getPointAtLength(Math.min(R.plen, R.plen * pu + 2)), ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
        R.plane.setAttribute('opacity', vis ? '1' : '0'); R.ppath.setAttribute('opacity', (seg(s, PLANE_IN - 0.03, PLANE_IN) * (1 - seg(s, PLANE_OUT, PLANE_OUT + 0.03))).toFixed(2));
        R.plane.setAttribute('transform', 'translate(' + n1(pt.x) + ' ' + n1(pt.y) + ') rotate(' + n1(ang) + ')');
        R.prop.setAttribute('ry', n1(9 * Math.abs(Math.cos(s * 400))));
        var release = vis && pt.x > 150 && pt.x < 340;
        R.pwater.setAttribute('opacity', release ? '0.85' : '0');
        R.pwater.setAttribute('points', [[pt.x - 2, pt.y + 9], [pt.x + 10, pt.y + 9], [pt.x - 30, GROUND - 26], [pt.x - 96, GROUND - 26]].map(function (q) { return n1(q[0]) + ',' + n1(q[1]); }).join(' '));
      }
      if (R.heli) {
        var hp = track(HELI_KEYS, s), hvis = s > HELI_KEYS[0][0];
        R.heli.setAttribute('opacity', hvis ? '1' : '0'); R.hpath.setAttribute('opacity', (0.8 * seg(s, 0.66, 0.69)).toFixed(2));
        R.heli.setAttribute('transform', 'translate(' + n1(hp.x) + ' ' + n1(hp.y) + ')');
        R.hflip.setAttribute('transform', hp.dx > 0 ? 'scale(-1 1)' : '');
        R.helibody.setAttribute('transform', 'rotate(' + n1(hp.dx === 0 ? 0 : -7) + ')');
        R.rot.setAttribute('transform', 'scale(' + Math.cos(s * 520).toFixed(3) + ' 1)');
        R.trot.setAttribute('transform', 'rotate(' + n1(s * 9000) + ' 61 -8)');
        var dip = inAny(s, HELI_DIPS), rope = dip ? 40 + 12 * Math.sin(Math.PI * seg(s, dip[0], dip[1])) : 40;
        R.rope.setAttribute('d', 'M0 10V' + n1(rope)); R.bucket.setAttribute('transform', 'translate(0 ' + n1(rope) + ')');
        R.bfill.setAttribute('opacity', String(bucketFull(s) * 0.95));
        var drop = inAny(s, HELI_DROPS);
        R.hdrops.setAttribute('opacity', drop ? '1' : '0');
        R.drops.forEach(function (el, i) {
          var u = frac(s * 40 + i / R.drops.length), y0 = hp.y + rope + 10;
          el.setAttribute('cx', n1(hp.x + (rnd(i + 300) - 0.5) * 12 + u * 4)); el.setAttribute('cy', n1(y0 + u * Math.max(10, GROUND - 24 - y0)));
        });
      }
    }
    return { html: s, mount: mount, update: update };
  }

  window.FireScene = { create: create, S_FIRE: S_FIRE, S_FIGHT: S_FIGHT };
})();
