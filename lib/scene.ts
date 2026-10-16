/*
 * Scroll-driven schematic fire scene. Ported from legacy/scene.js.
 * Kept verbatim: all drawing code, geometry, timings and the stage thresholds. Changes: module wrapper,
 * `export`s, a typed contract, and one bug fix (the helicopter guide path lacked its leading 'M' and logged an SVG error),
 * a typed contract (create -> { html, mount, update }); update(s) is a pure function of s in 0..1.
 * Stages: 0-0.34 start, 0.34-0.67 peak fire, 0.67-1 fight.
 * Typing is deliberately loose (strict is off); the logic is the tested legacy code.
 */
/* eslint-disable */
var S_FIRE = 0.34, S_FIGHT = 0.67, GROUND = 258;

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
function seg(s, a, b) { return clamp((s - a) / (b - a), 0, 1); }
function ease(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }
function frac(x) { return x - Math.floor(x); }
function rnd(i) { return frac(Math.sin(i * 127.1 + 311.7) * 43758.5453); }
function hex(h) { return [1, 3, 5].map(function (k) { return parseInt(h.slice(k, k + 2), 16); }); }
function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + [0, 1, 2].map(function (k) { return Math.round(lerp(A[k], B[k], t)); }).join(',') + ')'; }
function ramp(a, b, c, m, t) { return t < m ? mix(a, b, ease(t / m)) : mix(b, c, ease((t - m) / (1 - m))); }
function n1(v) { return v.toFixed(1); }
function fmt(n) { return Math.round(n).toLocaleString('es-AR'); }

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

var ORIGIN = {
  cordoba: [220, 230],
  delta: [180, 232],
  misiones: [160, 230],
  corrientes: [200, 230],
  mendoza: [190, 240],
  chubut: [180, 238],
  intencional: [180, 238], quema: [160, 230], sequia: [220, 230]
};

function flameSites(id, kind) {
  var L = [], o = ORIGIN[id] || ORIGIN[kind] || [200, 235];
  for (var i = 0; i < 18; i++) {
    var x = 120 + i * 13 + rnd(i * 3 + 7) * 10, y = 208 + rnd(i * 5 + 13) * 44;
    var dist = Math.abs(x - o[0]);
    var t = 0.03 + 0.28 * clamp(dist / 140, 0, 1);
    var k = 0.65 + rnd(i * 7 + 19) * 0.7;
    L.push({ x: x, y: y, k: k * (0.8 + (y - 200) / 140), t: Math.min(t, 0.32) });
  }
  return L.sort(function (a, b) { return a.y - b.y; });
}

function nearestT(fl, x, y) {
  var best = 1, bd = 1e9;
  fl.forEach(function (f) { var d = Math.hypot(f.x - x, (f.y - y) * 1.5); if (d < bd) { bd = d; best = f.t; } });
  return bd < 65 ? best : 2;
}

/* ---- Palettes (all tunable here). Muted on purpose: schematic illustration, not a photograph. ---- */
var SKY = {
  top: ['#26333d', '#241410', '#2a2828'],   /* day, peak smoke, ash */
  mid: ['#4b5a66', '#59291a', '#423e3c'],
  low: ['#92877d', '#a2552d', '#6a5f56']
};
var SUN = { core: '#fffbeb', corona: '#f59e0b', coronaMid: '#dc2626', coronaEdge: '#7f1d1d', peak: '#b91c1c' };
var FIRE = {
  base: '#7a2010', mid: '#cf5a1a', tip: '#f59e0b',      /* outer gradient: rich ruby, vibrant fire, bright amber */
  layer: '#fbbf24', core: '#fffbeb',                    /* incandescent inner core */
  glowIn: '#f59e0b', glowMid: '#b43403', glowOut: '#450a0a',
  ember: '#fef08a', emberFall: '#ea580c', haze: '#ea580c', flare: '#f59e0b'
};
var SMOKE = ['#a8a29e', '#1c1917', '#78716c'];
var WATER = { jetTop: '#f0fdf4', jetBot: '#38bdf8', jet: '#60a5fa', drop: '#bae6fd', fill: '#38bdf8' };
var AIR = { heli: '#a8432a', heliTail: '#823022', bucket: '#b86030', glass: '#8fb0c4', stripe: '#d9cfc4', plane: '#d8cec2', planeTail: '#a8432a', planeBelly: '#cfc6b9', planeGlass: '#86a8bd' };
var CREW = { hose: '#a89650', body: '#b5562a', skin: '#d1a584', helmet: '#c9a23a', legA: '#3a3a46', legB: '#30303a', nozzle: '#2a2a2a' };
var TAG = { bg: 'rgba(14,9,7,0.78)', stroke: 'rgba(200,160,110,0.25)', text: '#cfc5bb' };
var LAND = {
  chubut: { far: '#1e1b29', shadow: '#14111d', snow: '#f8fafc', mid: '#2d221c', tree: '#1e382b', ground: '#3e3223', lake: '#1a3440', lakeHi: '#38bdf8' },
  misiones: { far: '#192b1d', crown0: '#142618', mid: '#224026', crown: '#2a5a2e', trunk: '#42241b', frond: '#3e7844', soil1: '#7c2d12', soil2: '#5f2010', soil3: '#45180c' },
  corrientes: { far: '#182b22', palm: '#1c4028', frond: '#2b5c36', water: '#1a3644', waterLine: '#38bdf8', island: '#2f4f2c', ground: '#3a3426', pool: '#1e3e50', poolHi: '#60a5fa', pool2: '#1b3644', pool2Hi: '#38bdf8' },
  delta: { far: '#1f2e24', river: '#203d4e', riverLine: '#60a5fa', mid: '#28442c', trunk: '#2e2118', crown: '#2f5636', droop: '#407446', ground: '#423727', channel: '#1e3848' },
  mendoza: { far: '#3d2c20', ridge: '#573d2d', mid: '#4d372b', shrub: '#555e2e', ground: '#5c452e', cactus: '#4d6930', spine: '#fef08a' },
  cordoba: { far: '#2d2432', far2: '#241c29', mid: '#3e2e22', trunk: '#332014', crown: '#42542a', blossom: '#facc15', ground: '#523c26', rock: '#3f3630', rockEdge: '#6b5e54' }
};
var GRASS = { misiones: '#33502a', corrientes: '#566a34', delta: '#6a7038', mendoza: '#7a6540', cordoba: '#94783f' };

/* Faceted (polygonal) flame tongues: straight edges only */
var FLAME_TALL = 'M0 0L-13-8L-11-20L-6-30L-8-42L-1-56L3-44L8-48L7-34L14-30L16-16L10-5Z';
var FLAME_MID = 'M0 0L-10-6L-9-15L-5-22L-6-30L-1-40L3-31L6-34L5-24L11-20L10-9L6-3Z';
var FLAME_LOW = 'M0 0L-7-4L-7-11L-3-16L-4-22L-1-28L2-21L5-23L4-15L8-11L7-4Z';

function defs() {
  return '<defs>' +
    '<linearGradient id="sg-sky" x1="0" y1="0" x2="0" y2="1"><stop id="sg-s0" offset="0"/><stop id="sg-s1" offset=".58"/><stop id="sg-s2" offset="1"/></linearGradient>' +
    '<radialGradient id="sg-suncorona"><stop offset="0" stop-color="' + SUN.corona + '" stop-opacity=".7"/><stop offset=".45" stop-color="' + SUN.coronaMid + '" stop-opacity=".28"/><stop offset="1" stop-color="' + SUN.coronaEdge + '" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="sg-flame-outer" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="' + FIRE.base + '"/><stop offset=".45" stop-color="' + FIRE.mid + '"/><stop offset="1" stop-color="' + FIRE.tip + '"/></linearGradient>' +
    '<radialGradient id="sg-glow"><stop offset="0" stop-color="' + FIRE.glowIn + '" stop-opacity=".6"/><stop offset=".5" stop-color="' + FIRE.glowMid + '" stop-opacity=".3"/><stop offset="1" stop-color="' + FIRE.glowOut + '" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sg-burng"><stop offset="0" stop-color="#0a0604"/><stop offset=".7" stop-color="#140a06"/><stop offset="1" stop-color="#22120a" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="sg-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + WATER.jetTop + '" stop-opacity=".85"/><stop offset="1" stop-color="' + WATER.jetBot + '" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="sg-puff"><stop id="sg-pf0" offset="0" stop-opacity=".92"/><stop id="sg-pf1" offset=".55" stop-opacity=".55"/><stop id="sg-pf2" offset="1" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="sg-steam-puff"><stop offset="0" stop-color="#ffffff" stop-opacity=".75"/><stop offset=".5" stop-color="#d4e6f1" stop-opacity=".4"/><stop offset="1" stop-color="#aed6f1" stop-opacity="0"/></radialGradient>' +
    '</defs>';
}

function landscape(id, kind, lake) {
  var far = '', mid = '', ground = '', P: any;

  if (id === 'chubut') {
    /* Patagonia: Andean cordillera with faceted shaded ridges, conifer forest and a mountain lake */
    P = LAND.chubut;
    far += '<path d="M0 168L32 136L64 148L108 94L136 128L172 108L218 142L268 84L304 126L348 104L388 138L400 130V220H0Z" fill="' + P.far + '"/>';
    far += '<path d="M64 148L108 94L124 114L86 142ZM172 108L218 142L194 130ZM268 84L304 126L288 116ZM348 104L388 138L370 126Z" fill="' + P.shadow + '" opacity=".6"/>';
    far += '<path d="M100 104L108 94L118 105L110 102ZM258 93L268 84L280 96L270 91ZM340 111L348 104L356 112Z" fill="' + P.snow + '" opacity=".85"/>';
    far += '<path d="M108 94v12M268 84v14M348 104v10" stroke="' + P.snow + '" stroke-width="1.2" opacity=".7"/>';
    mid += '<path d="M0 192Q110 166 220 184T400 178V300H0Z" fill="' + P.mid + '"/>';
    for (var c = 0; c < 24; c++) {
      var cx = 4 + c * 16.5 + rnd(c + 90) * 5, cy = 186 - Math.sin(c * 0.45) * 8, h = 18 + rnd(c + 91) * 12;
      mid += '<g>' +
        '<path d="M' + n1(cx) + ' ' + n1(cy) + 'v4" stroke="#2a1f18" stroke-width="1.6"/>' +
        '<path class="sg-tree" data-x="' + cx + '" data-y="' + cy + '" d="M' + n1(cx) + ' ' + n1(cy - h) + 'l' + n1(h * 0.28) + ' ' + n1(h) + 'h' + n1(-h * 0.56) + 'Z" fill="' + P.tree + '"/>' +
        '</g>';
    }
    ground += '<path d="M0 216Q110 200 230 212T400 206V300H0Z" fill="' + P.ground + '"/>';
    if (lake) {
      ground += '<ellipse cx="355" cy="225" rx="55" ry="9" fill="' + P.lake + '"/><ellipse cx="355" cy="225" rx="36" ry="4" fill="' + P.lakeHi + '" opacity=".65"/>';
      ground += '<path d="M328 224h52M342 227h28" stroke="' + P.lakeHi + '" stroke-width="1.2" opacity=".6"/>';
    }

  } else if (id === 'misiones') {
    /* Selva Misionera: layered canopy, palmito palms and tierra colorada */
    P = LAND.misiones;
    far += '<path d="M0 170Q70 156 140 165T280 158T400 164V220H0Z" fill="' + P.far + '"/>';
    for (var t = 0; t < 24; t++) {
      var tx = t * 17 + rnd(t + 40) * 5, r = 11 + rnd(t + 41) * 9;
      far += '<ellipse class="sg-tree" data-x="' + n1(tx) + '" data-y="166" cx="' + n1(tx) + '" cy="' + n1(166 - r * 0.3) + '" rx="' + n1(r) + '" ry="' + n1(r * 0.55) + '" fill="' + P.crown0 + '"/>';
    }
    mid += '<path d="M0 190Q110 176 230 186T400 182V300H0Z" fill="' + P.mid + '"/>';
    for (var m = 0; m < 15; m++) {
      var mx = 8 + m * 27 + rnd(m + 80) * 7, my = 186 - (m % 3) * 7, mr = 16 + rnd(m + 81) * 9;
      mid += '<g transform="translate(' + n1(mx) + ' ' + n1(my) + ')">' +
        '<path d="M0 0V-14" stroke="' + P.trunk + '" stroke-width="2.8"/>' +
        '<ellipse class="sg-tree" data-x="' + n1(mx) + '" data-y="' + n1(my) + '" cx="0" cy="-18" rx="' + n1(mr) + '" ry="' + n1(mr * 0.52) + '" fill="' + P.crown + '"/>' +
        '<path d="M-10 -22l10 5l10 -5M-8 -25l8 5l8 -5" stroke="' + P.frond + '" stroke-width="1.8" fill="none"/>' +
        '</g>';
    }
    ground += '<path d="M0 206Q120 194 240 204T400 200V300H0Z" fill="' + P.soil1 + '"/>';
    ground += '<path d="M0 230Q110 220 230 228T400 224V300H0Z" fill="' + P.soil2 + '"/>';
    ground += '<path d="M0 262Q100 256 220 260T400 258V300H0Z" fill="' + P.soil3 + '"/>';
    ground += '<path d="M20 216q60-6 120 4t140-2t120 6" stroke="#9a3412" stroke-width="1.2" fill="none" opacity=".5"/>';

  } else if (id === 'corrientes') {
    /* Esteros del Iberá: open wetlands, water mirrors and caranday palms */
    P = LAND.corrientes;
    far += '<rect y="180" width="400" height="28" fill="' + P.far + '"/>';
    [18, 55, 95, 145, 195, 245, 295, 345, 385].forEach(function (px, i) {
      var py = 182 + (i % 2) * 2;
      far += '<g transform="translate(' + px + ' ' + py + ')">' +
        '<path d="M0 0V-18" stroke="' + P.palm + '" stroke-width="1.6"/>' +
        '<path d="M-9-22l9 4l9-4M-10-19l10 4l10-4M0-24v6" stroke="' + P.frond + '" stroke-width="1.4" fill="none"/>' +
        '</g>';
    });
    mid += '<rect y="192" width="400" height="24" fill="' + P.water + '"/>';
    mid += '<path d="M0 200H400" stroke="' + P.waterLine + '" stroke-width="1.8" opacity=".7"/>';
    mid += '<path d="M20 205h60M180 204h70M310 206h60" stroke="#7dd3fc" stroke-width="1.2" opacity=".6"/>';
    [[45, 201, 32], [145, 200, 42], [260, 202, 48], [360, 201, 35]].forEach(function (e) {
      mid += '<ellipse class="sg-tree" data-x="' + e[0] + '" data-y="' + e[1] + '" cx="' + e[0] + '" cy="' + e[1] + '" rx="' + e[2] + '" ry="5.5" fill="' + P.island + '"/>';
    });
    ground += '<path d="M0 210H400V300H0Z" fill="' + P.ground + '"/>';
    ground += '<ellipse cx="130" cy="234" rx="88" ry="13" fill="' + P.pool + '"/><ellipse cx="130" cy="234" rx="54" ry="5" fill="' + P.poolHi + '" opacity=".6"/>';
    ground += '<path d="M90 234h80M105 237h50" stroke="' + P.waterLine + '" stroke-width="1.2" opacity=".5"/>';
    ground += '<ellipse cx="310" cy="252" rx="78" ry="11" fill="' + P.pool2 + '"/><ellipse cx="310" cy="252" rx="46" ry="4.5" fill="' + P.pool2Hi + '" opacity=".55"/>';

  } else if (id === 'delta') {
    /* Delta del Paraná: river channel, weeping willows and reedbanks */
    P = LAND.delta;
    far += '<path d="M0 178Q100 172 200 176T400 174V205H0Z" fill="' + P.far + '"/>';
    far += '<rect y="190" width="400" height="16" fill="' + P.river + '"/>';
    far += '<path d="M0 196H400" stroke="' + P.riverLine + '" stroke-width="2" opacity=".65"/>';
    mid += '<path d="M0 200Q110 192 230 198T400 194V300H0Z" fill="' + P.mid + '"/>';
    [18, 62, 115, 172, 230, 288, 345, 388].forEach(function (wx, i) {
      var wy = 196 + (i % 2) * 3;
      mid += '<g transform="translate(' + wx + ' ' + wy + ')">' +
        '<path d="M0 0Q-2 -8 0 -16M0 -16Q-8 -22 -14 -26M0 -16Q8 -22 14 -26" stroke="' + P.trunk + '" stroke-width="2.2" fill="none"/>' +
        '<path class="sg-tree" data-x="' + wx + '" data-y="' + wy + '" d="M-19 -26Q-10 -37 0 -37Q10 -37 19 -26Q15 -13 0 -13Q-15 -13 -19 -26Z" fill="' + P.crown + '"/>' +
        '<path d="M-14 -22v10M-7 -20v13M0 -18v14M7 -20v13M14 -22v10" stroke="' + P.droop + '" stroke-width="1.3"/>' +
        '</g>';
    });
    ground += '<path d="M0 208H400V300H0Z" fill="' + P.ground + '"/>';
    ground += '<path d="M0 234Q90 226 180 232T360 228L400 234V248L360 242Q180 246 90 240L0 248Z" fill="' + P.channel + '"/>';
    ground += '<path d="M10 238q80-6 160 2t180-2" stroke="' + P.riverLine + '" stroke-width="1.4" fill="none" opacity=".5"/>';

  } else if (id === 'mendoza') {
    /* Mendoza: arid Precordillera, dry washes, jarilla and cardón cacti */
    P = LAND.mendoza;
    far += '<path d="M0 172L42 144L82 158L138 120L194 150L242 130L298 156L348 124L400 152V220H0Z" fill="' + P.far + '"/>';
    far += '<path d="M42 144L82 158L62 165ZM138 120L194 150L166 160ZM242 130L298 156L270 162ZM348 124L400 152L374 158Z" fill="#2d1f16" opacity=".5"/>';
    far += '<path d="M0 178L42 150L82 164L138 128M194 156L242 136L298 162M348 132L400 160" stroke="' + P.ridge + '" stroke-width="2.2" fill="none"/>';
    mid += '<path d="M0 198Q110 182 230 196T400 190V300H0Z" fill="' + P.mid + '"/>';
    for (var j = 0; j < 14; j++) {
      var jx = 10 + j * 28 + rnd(j + 30) * 8, jy = 194 + rnd(j + 31) * 6;
      mid += '<ellipse class="sg-tree" data-x="' + n1(jx) + '" data-y="' + n1(jy) + '" cx="' + n1(jx) + '" cy="' + n1(jy) + '" rx="11" ry="5.5" fill="' + P.shrub + '"/>';
    }
    ground += '<path d="M0 210Q110 196 230 208T400 202V300H0Z" fill="' + P.ground + '"/>';
    [[55, 230, 1.15], [140, 240, 0.95], [240, 234, 1.05], [330, 232, 1.1]].forEach(function (c) {
      var cx = c[0], cy = c[1], ck = c[2];
      ground += '<g transform="translate(' + cx + ' ' + cy + ') scale(' + ck + ')">' +
        '<path d="M0 0V-22M-7-14H0M-7-20V-14M7-12H0M7-18V-12" stroke="' + P.cactus + '" stroke-width="3.5" stroke-linecap="round" fill="none"/>' +
        '<path d="M-2-22v22M-7-19v5M7-17v5" stroke="' + P.spine + '" stroke-width="1" opacity=".8"/>' +
        '</g>';
    });

  } else {
    /* Córdoba: Sierras Chicas ridges, espinillos with umbrella crowns, granite rocks */
    P = LAND.cordoba;
    far += '<path d="M0 170Q65 142 135 158T275 142T400 160V220H0Z" fill="' + P.far + '"/>';
    far += '<path d="M75 152Q125 140 175 150T315 136T400 150V220H75Z" fill="' + P.far2 + '" opacity=".75"/>';
    mid += '<path d="M0 196Q100 178 210 192T400 184V300H0Z" fill="' + P.mid + '"/>';
    [[24, 198, 1], [84, 202, 1.2], [152, 196, .95], [220, 200, 1.15], [288, 196, 1.05], [356, 200, 1.25]].forEach(function (a) {
      var ex = a[0], ey = a[1], ek = a[2];
      mid += '<g transform="translate(' + ex + ' ' + ey + ') scale(' + ek + ')">' +
        '<path d="M0 0Q-3 -7 0 -13M0 -13Q-7 -17 -14 -22M0 -13Q7 -17 14 -22" stroke="' + P.trunk + '" stroke-width="2.4" fill="none"/>' +
        '<ellipse class="sg-tree" data-x="' + ex + '" data-y="' + ey + '" cx="0" cy="-22" rx="17" ry="6.5" fill="' + P.crown + '"/>' +
        '<circle cx="-8" cy="-23" r="2" fill="' + P.blossom + '" opacity=".85"/><circle cx="6" cy="-22" r="2.2" fill="' + P.blossom + '" opacity=".85"/>' +
        '</g>';
    });
    ground += '<path d="M0 212Q110 198 230 210T400 204V300H0Z" fill="' + P.ground + '"/>';
    ground += '<path d="M25 258l22-7l15 9l-11 7h-18ZM135 268l20-9l18 5l-9 7h-22ZM255 256l26-7l16 11l-13 7h-22ZM335 272l18-7l15 7l-9 5Z" fill="' + P.rock + '" stroke="' + P.rockEdge + '" stroke-width="1.3"/>';
    ground += '<path d="M26 257l20-6l13 8M136 267l18-8l16 4M256 255l24-6l14 10" stroke="#78716c" stroke-width="1" opacity=".7"/>';
  }

  return { far: far, mid: mid, ground: ground };
}

function grass(id) {
  var s = '<g id="sg-grass">';
  var stroke = GRASS[id] || GRASS.cordoba;
  for (var i = 0; i < 34; i++) {
    var x = 6 + i * 11.6 + rnd(i + 120) * 6, y = 218 + rnd(i + 121) * 66;
    s += '<path data-x="' + n1(x) + '" data-y="' + n1(y) + '" d="M' + n1(x) + ' ' + n1(y) + 'l-2.5-9M' + n1(x) + ' ' + n1(y) + 'l0-12M' + n1(x) + ' ' + n1(y) + 'l2.5-9" stroke="' + stroke + '" stroke-width="1.3" fill="none"/>';
  }
  return s + '</g>';
}

function flameSVG(f, i) {
  var amb = 'animation-duration:' + n1(0.85 + rnd(i * 3 + 1) * 0.7) + 's;animation-delay:-' + n1(rnd(i * 5 + 3) * 2) + 's';
  var pathD = (i % 3 === 0) ? FLAME_TALL : (i % 3 === 1) ? FLAME_MID : FLAME_LOW;
  return '<g transform="translate(' + n1(f.x) + ' ' + n1(f.y) + ')"><g id="sg-f' + i + '" opacity="0">' +
    '<ellipse class="amb-gl" style="' + amb + '" cx="0" cy="-14" rx="28" ry="24" fill="url(#sg-glow)"/>' +
    '<g class="amb-fl" style="' + amb + '"><path d="' + pathD + '" fill="url(#sg-flame-outer)"/>' +
    '<path d="' + pathD + '" fill="' + FIRE.layer + '" transform="scale(.68)"/>' +
    '<path d="' + pathD + '" fill="' + FIRE.core + '" transform="scale(.38)"/></g></g>' +
    '<circle id="sg-e' + i + '" cx="0" cy="-1" r="2.2" fill="' + FIRE.emberFall + '" opacity="0"/></g>';
}

var HELI = '<g id="sg-heli" opacity="0"><g id="sg-hflip"><g id="sg-helibody">' +
  '<path id="sg-rope" d="M0 10V40" stroke="#4a4846" stroke-width=".9"/>' +
  '<g id="sg-bucket" transform="translate(0 40)"><path d="M-7 0H7L5 10H-5Z" fill="' + AIR.bucket + '" stroke="#221208" stroke-width=".8"/><path id="sg-bfill" d="M-6 2H6L4.6 9H-4.6Z" fill="' + WATER.fill + '" opacity="0"/></g>' +
  '<path d="M20-6L58-3V1L20 4Z" fill="' + AIR.heliTail + '"/><path d="M54-3L60-15H64L60 1Z" fill="' + AIR.heliTail + '"/>' +
  '<ellipse cx="61" cy="-8" rx="6" ry="6" fill="#ddd" opacity=".18"/><path id="sg-trot" d="M61-14V-2" stroke="#ddd" stroke-width="1.4"/>' +
  '<path d="M-26 2C-26-10-14-14 0-14L14-12C20-10 22-4 22 2C22 8 14 10 0 10H-18C-24 10-26 6-26 2Z" fill="' + AIR.heli + '"/>' +
  '<path d="M-25 1C-24-8-16-12-8-12V1Z" fill="' + AIR.glass + '" opacity=".85"/><path d="M-20 5H18" stroke="' + AIR.stripe + '" stroke-width="1.4"/>' +
  '<path d="M-18 18H16M-12 10L-14 18M8 10L10 18" stroke="#2c2c2c" stroke-width="1.6" fill="none"/>' +
  '<rect x="-2" y="-19" width="4" height="6" fill="#3a3a3a"/><ellipse cx="0" cy="-20" rx="42" ry="2.4" fill="#ddd" opacity=".2"/>' +
  '<rect id="sg-rot" x="-42" y="-21" width="84" height="2" rx="1" fill="#d6cfc7"/></g></g></g>';

var PLANE = '<g id="sg-plane" opacity="0">' +
  '<path d="M-6-8L10-8L-2-22L-14-22Z" fill="#b0a79d"/>' +
  '<path d="M-28-6L-35-21H-27L-20-7Z" fill="' + AIR.planeTail + '"/><path d="M-36-2H-24L-27-6H-38Z" fill="#b0a79d"/>' +
  '<path d="M-34 0C-34-5-26-8-14-8H22C30-8 36-4 38 0C36 4 30 6 22 6H-24C-30 6-34 4-34 0Z" fill="' + AIR.plane + '"/>' +
  '<path d="M-31 1H35" stroke="' + AIR.planeTail + '" stroke-width="2.6"/><path d="M18-8C24-8 30-6 33-2H18Z" fill="' + AIR.planeGlass + '"/>' +
  '<path d="M-6 6H14L12 10H-4Z" fill="#7a7a7a"/><ellipse id="sg-prop" cx="39.5" cy="0" rx="1.8" ry="9" fill="#d6cfc7" opacity=".45"/>' +
  '<path d="M-6 2L12 2L-4 17L-17 17Z" fill="' + AIR.planeBelly + '"/></g>';

/* Simplified brigadista: flat shapes only (hose, two legs, torso, head, helmet, arm, nozzle) */
function crewSVG(i) {
  return '<g id="sg-c' + i + '" opacity="0"><path d="M5-18Q14-4 30 0L90 2" stroke="' + CREW.hose + '" stroke-width="1.5" fill="none"/>' +
    '<path id="sg-la' + i + '" d="M0-14L-3 0" stroke="' + CREW.legA + '" stroke-width="3" stroke-linecap="round"/><path id="sg-lb' + i + '" d="M0-14L3 0" stroke="' + CREW.legB + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="-4" y="-27" width="9" height="14" rx="2" fill="' + CREW.body + '"/>' +
    '<circle cx="0" cy="-31" r="3.6" fill="' + CREW.skin + '"/><path d="M-5-31A5 5 0 0 1 5-31Z" fill="' + CREW.helmet + '"/>' +
    '<path d="M-1-23L-10-20" stroke="' + CREW.body + '" stroke-width="2.6" stroke-linecap="round"/><path d="M-9-20L-14-21" stroke="' + CREW.nozzle + '" stroke-width="2.2"/></g>';
}

/* Same drop over the fire, but a steeper climb-out that clears the helicopter refilling at the lake. */
var PLANE_PATH_HELI = 'M-80 128C40 140 140 166 240 164S370 30 520 -30';
var PLANE_PATH = 'M-80 128C40 140 140 166 240 164S420 118 520 70', PLANE_IN = S_FIGHT, PLANE_OUT = 0.9;
var HELI_KEYS = [[0.69, 450, 60], [0.74, 355, 174], [0.77, 355, 174], [0.83, 246, 116], [0.86, 232, 114], [0.91, 355, 174], [0.935, 355, 174], [0.985, 204, 114], [1, 196, 112]];
var HELI_DIPS = [[0.74, 0.77], [0.91, 0.935]], HELI_DROPS = [[0.83, 0.865], [0.985, 1.01]];
function inAny(s, list) { for (var i = 0; i < list.length; i++) if (s >= list[i][0] && s <= list[i][1]) return list[i]; return null; }
function bucketFull(s) { return (s > 0.765 && s < 0.85) || (s > 0.93 && s < 0.995) ? 1 : 0; }

function create(o) {
  var id = o.id || 'cordoba', kind = o.kind in ORIGIN ? o.kind : 'sequia';
  var means = o.means || { crew: 3 }, fl = flameSites(id, kind);
  var nCrew = means.crew || 0, burnR = 46 + 100 * clamp(Math.log(Math.max(o.hectares || 1, 10)) / Math.log(1e6), 0, 1);
  var oPt = ORIGIN[id] || ORIGIN[kind] || [220, 230];
  var burnX = oPt[0];

  var s = '<svg class="scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" role="img" aria-label="' + (o.aria || 'Ilustración esquemática del incendio') + '">' + defs();
  s += '<rect width="400" height="300" fill="url(#sg-sky)"/>';
  /* Radiant sun with luminous corona */
  s += '<g id="sg-sun"><circle cx="330" cy="88" r="42" fill="url(#sg-suncorona)"/><circle id="sg-sunc" cx="330" cy="88" r="14" fill="' + SUN.core + '"/></g>';

  var LS = landscape(id, kind, !!means.heli);
  s += '<g id="sg-far">' + LS.far + '</g><g id="sg-mid">' + LS.mid + '</g>' + LS.ground;
  s += '<ellipse id="sg-burn" cx="' + burnX + '" cy="236" rx="0" ry="0" fill="url(#sg-burng)"/>';
  s += grass(id);

  /* Volumetric billowing smoke */
  s += '<g id="sg-smoke">';
  for (var p = 0; p < 32; p++) {
    s += '<g class="amb-sm" style="--sx:' + n1(12 + rnd(p + 400) * 8) + 'px;animation-duration:' + n1(5.5 + rnd(p + 401) * 3) + 's;animation-delay:-' + n1(rnd(p + 402) * 8) + 's"><circle id="sg-p' + p + '" r="10" fill="url(#sg-puff)" opacity="0"/></g>';
  }
  s += '</g>';

  fl.forEach(function (f, i) { s += flameSVG(f, i); });

  /* Embers / sparks */
  s += '<g id="sg-embers">';
  for (var e2 = 0; e2 < 14; e2++) {
    var fi = (e2 * 4) % fl.length, f0 = fl[fi];
    s += '<g data-f="' + fi + '" opacity="0" transform="translate(' + n1(f0.x + (rnd(e2 + 500) - 0.5) * 14) + ' ' + n1(f0.y - 14) + ')"><circle class="amb-em" r="' + n1(1 + rnd(e2 + 501) * 0.8) + '" fill="' + FIRE.ember + '" style="--dx:' + n1((rnd(e2 + 502) - 0.25) * 24) + 'px;--dy:-' + n1(38 + rnd(e2 + 503) * 32) + 'px;animation-duration:' + n1(1.8 + rnd(e2 + 504) * 2) + 's;animation-delay:-' + n1(rnd(e2 + 505) * 3.5) + 's"/></g>';
  }
  s += '</g>';

  /* Subtle ignition flare (replaces toy lighter) */
  s += '<g id="sg-flare" opacity="0" transform="translate(' + oPt[0] + ' ' + (oPt[1] + 2) + ')">' +
    '<circle r="12" fill="url(#sg-glow)" opacity=".8"/>' +
    '<ellipse cx="0" cy="-6" rx="6" ry="8" fill="' + FIRE.flare + '"/>' +
    '<ellipse cx="0" cy="-5" rx="3.5" ry="5" fill="' + FIRE.core + '"/>' +
    '</g>';

  s += '<rect id="sg-haze" width="400" height="300" fill="' + FIRE.haze + '" opacity="0" style="mix-blend-mode:screen"/>';
  s += '<polygon id="sg-pwater" points="0,0" fill="url(#sg-water)" opacity="0"/>';
  s += '<g id="sg-hdrops" opacity="0">';
  for (var d = 0; d < 14; d++) s += '<circle r="' + n1(1.4 + rnd(d + 200) * 1.2) + '" fill="' + WATER.drop + '"/>';
  s += '</g>';
  s += '<g id="sg-steam" opacity="0">';
  for (var st = 0; st < 8; st++) s += '<circle r="12" fill="url(#sg-steam-puff)"/>';
  s += '</g>';

  for (var c = 0; c < nCrew; c++) s += '<path id="sg-j' + c + '" d="M0 0" stroke="' + WATER.jet + '" stroke-width="2" fill="none" stroke-dasharray="3 5" stroke-linecap="round" opacity="0"/>';
  for (c = 0; c < nCrew; c++) s += crewSVG(c);
  if (means.plane) s += '<path id="sg-ppath" d="' + (means.heli ? PLANE_PATH_HELI : PLANE_PATH) + '" stroke="rgba(255,240,220,.28)" stroke-width="1" stroke-dasharray="3 5" fill="none" opacity="0"/>' + PLANE;
  if (means.heli) s += '<path id="sg-hpath" d="M' + HELI_KEYS.map(function (k) { return k[1] + ' ' + k[2]; }).join('L') + '" stroke="rgba(255,240,220,.22)" stroke-width="1" stroke-dasharray="3 5" fill="none" opacity="0"/>' + HELI;

  /* Sleek minimal HUD badge, bottom-centre: the top band and the right edge are cropped by the slice rule on narrow boxes, the bottom centre never is */
  if (o.label !== false) {
    s += '<g id="sg-label" opacity="0" transform="translate(252 276)">' +
      '<rect id="sg-badge-bg" x="-104" y="0" width="104" height="22" rx="11" fill="rgba(14,9,7,0.92)" stroke="rgba(200,130,60,0.38)" stroke-width="1"/>' +
      '<circle cx="-93" cy="11" r="3.2" fill="' + FIRE.mid + '"/>' +
      '<text id="sg-count" x="-82" y="14.8" font-size="10" fill="#f4eae3" font-weight="700" font-family="system-ui, sans-serif">0 ' + (o.unit || 'ha') + '</text></g>';
  }
  /* Always-visible tag, bottom-left (wide boxes crop the top band by the slice rule, never the ground): this is a schematic drawing, not a depiction of the real fire */
  s += '<g id="sg-tag" transform="translate(10 276)" pointer-events="none">' +
    '<rect x="0" y="0" width="112" height="18" rx="9" fill="' + TAG.bg + '" stroke="' + TAG.stroke + '" stroke-width="1"/>' +
    '<text x="9" y="12.2" font-size="8.6" fill="' + TAG.text + '" font-family="system-ui, sans-serif">Ilustración esquemática</text></g>';
  s += '</svg>';

  var R = null;
  function mount(svg) {
    var q = function (id) { return svg.querySelector('#' + id); };
    R = {
      s0: q('sg-s0'), s1: q('sg-s1'), s2: q('sg-s2'), sun: q('sg-sun'), sunc: q('sg-sunc'), burn: q('sg-burn'), haze: q('sg-haze'), label: q('sg-label'), count: q('sg-count'),
      far: q('sg-far'), mid: q('sg-mid'), pf: [q('sg-pf0'), q('sg-pf1'), q('sg-pf2')],
      flare: q('sg-flare'), pwater: q('sg-pwater'), hdrops: q('sg-hdrops'),
      steam: q('sg-steam'), steamPuffs: Array.prototype.slice.call(svg.querySelectorAll('#sg-steam circle')),
      heli: q('sg-heli'), hflip: q('sg-hflip'), helibody: q('sg-helibody'), rot: q('sg-rot'), trot: q('sg-trot'), hpath: q('sg-hpath'),
      rope: q('sg-rope'), bucket: q('sg-bucket'), bfill: q('sg-bfill'),
      plane: q('sg-plane'), prop: q('sg-prop'), ppath: q('sg-ppath'),
      flames: fl.map(function (f, i) { return { g: q('sg-f' + i), e: q('sg-e' + i), f: f }; }),
      puffs: Array.prototype.slice.call(svg.querySelectorAll('#sg-smoke circle')),
      drops: Array.prototype.slice.call(svg.querySelectorAll('#sg-hdrops circle')),
      embers: Array.prototype.map.call(svg.querySelectorAll('#sg-embers > g'), function (el) { return { el: el, f: +el.getAttribute('data-f') }; }),
      trees: Array.prototype.map.call(svg.querySelectorAll('.sg-tree'), function (el) { return { el: el, t: nearestT(fl, +el.getAttribute('data-x'), +el.getAttribute('data-y') + 30), c: el.getAttribute('fill') }; }),
      grass: Array.prototype.map.call(svg.querySelectorAll('#sg-grass path'), function (el) { return { el: el, t: nearestT(fl, +el.getAttribute('data-x'), +el.getAttribute('data-y')), c: el.getAttribute('stroke') }; }),
      crew: []
    };
    for (var i = 0; i < nCrew; i++) R.crew.push({ g: q('sg-c' + i), la: q('sg-la' + i), lb: q('sg-lb' + i), j: q('sg-j' + i), x: 334 + i * 13, y: 268 + (i % 2) * 8 });
    R.plen = R.ppath ? R.ppath.getTotalLength() : 0;
  }

  /* With a helicopter on scene the plane finishes its pass earlier, so its drop happens while the
     helicopter is still filling the bucket at the lake and the two never overlap. */
  var PLANE_END = means.heli ? 0.8 : PLANE_OUT;
  function planeAt(x) { return PLANE_IN + (PLANE_END - PLANE_IN) * clamp((x + 80) / 600, 0, 1); }

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

    /* Sky: Atmospheric progression from natural day to smoky orange twilight to ash gray */
    R.s0.setAttribute('stop-color', ramp(SKY.top[0], SKY.top[1], SKY.top[2], 0.52, s));
    R.s1.setAttribute('stop-color', ramp(SKY.mid[0], SKY.mid[1], SKY.mid[2], 0.52, s));
    R.s2.setAttribute('stop-color', ramp(SKY.low[0], SKY.low[1], SKY.low[2], 0.52, s));
    R.haze.setAttribute('opacity', (heat * 0.15).toFixed(3));

    /* Sun turns deeper blood-orange as smoke thickens */
    if (R.sun) {
      R.sun.setAttribute('opacity', (1 - 0.7 * ease(seg(s, 0.1, 0.65))).toFixed(2));
      R.sunc.setAttribute('fill', mix(SUN.core, SUN.peak, ease(seg(s, 0.05, 0.5))));
    }

    if (!o.still) {
      R.far.setAttribute('transform', 'translate(' + n1(-16 + 10 - 20 * s) + ' ' + n1(8 * s) + ') scale(1.08 1)');
      R.mid.setAttribute('transform', 'translate(' + n1(-16 + 14 - 28 * s) + ' ' + n1(4 * s) + ') scale(1.08 1)');
    }

    /* Initial ignition flare at the very beginning */
    if (R.flare) {
      var flareVis = seg(s, 0, 0.03) * (1 - seg(s, 0.07, 0.14));
      R.flare.setAttribute('opacity', flareVis.toFixed(2));
    }

    /* Burned terrain scar */
    var bt = ease(seg(s, 0.05, 0.6));
    R.burn.setAttribute('rx', n1(burnR * bt)); R.burn.setAttribute('ry', n1(burnR * 0.28 * bt));
    if (R.label) {
      R.label.setAttribute('opacity', seg(s, 0.02, 0.07).toFixed(2));
      R.count.textContent = fmt((o.hectares || 0) * ease(seg(s, 0.05, 0.6))) + ' ' + (o.unit || 'ha');
    }

    var lits = [], sizes = R.flames.map(function (q, i) {
      var r = flameK(q.f, s), k = r.k * q.f.k, tall = 1 + 0.3 * heat;
      lits.push(r.lit);
      q.g.setAttribute('opacity', r.lit > 0.02 ? Math.min(1, r.lit * 3).toFixed(2) : '0');
      q.g.setAttribute('transform', 'scale(' + k.toFixed(3) + ' ' + (k * tall).toFixed(3) + ')');
      q.e.setAttribute('opacity', (r.lit * 0.9 * ease(seg(s, 0.6, 1))).toFixed(2));
      return k;
    });
    R.embers.forEach(function (e) { e.el.setAttribute('opacity', Math.min(1, (lits[e.f] || 0) * 2).toFixed(2)); });

    /* Scorched vegetation */
    R.trees.forEach(function (t) { t.el.setAttribute('fill', mix(t.c, '#120a06', ease(seg(s, t.t + 0.05, t.t + 0.25)))); });
    R.grass.forEach(function (g) { g.el.setAttribute('stroke', mix(g.c, '#160e08', ease(seg(s, g.t, g.t + 0.12)))); });

    /* Volumetric smoke billowing with wind */
    R.pf.forEach(function (st) { st.setAttribute('stop-color', ramp(SMOKE[0], SMOKE[1], SMOKE[2], 0.58, s)); });
    var H = 35 + 210 * ease(seg(s, 0.02, 0.6)), lean = 25 + 160 * ease(seg(s, 0.05, 1)), dens = Math.min(1, 0.25 + 0.9 * heat);
    var bx = (ORIGIN[id] ? ORIGIN[id][0] : ORIGIN[kind][0]) + 45 * ease(seg(s, 0, 0.5)), by = 220;
    R.puffs.forEach(function (el, i) {
      var u = frac(i / R.puffs.length + s * 2.2), side = (i % 3 - 1) * (6 + 22 * u);
      el.setAttribute('cx', n1(bx + lean * Math.pow(u, 1.35) + side)); el.setAttribute('cy', n1(by - u * H));
      el.setAttribute('r', n1((11 + u * 38) * (0.6 + 0.6 * ease(seg(s, 0.02, 0.55)))));
      el.setAttribute('opacity', (dens * Math.sin(Math.PI * Math.min(1, u * 1.15)) * 0.92).toFixed(2));
    });

    /* Ground crews advancing */
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

    var steamPlane = false, steamPlaneX = 0;
    /* Aerial hydrant plane */
    if (R.plane) {
      var pu = ease(seg(s, PLANE_IN, PLANE_END)), pt = R.ppath.getPointAtLength(R.plen * pu), vis = s > PLANE_IN && s < PLANE_END;
      var pt2 = R.ppath.getPointAtLength(Math.min(R.plen, R.plen * pu + 2)), ang = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
      R.plane.setAttribute('opacity', vis ? '1' : '0'); R.ppath.setAttribute('opacity', (seg(s, PLANE_IN - 0.03, PLANE_IN) * (1 - seg(s, PLANE_END, PLANE_END + 0.03))).toFixed(2));
      R.plane.setAttribute('transform', 'translate(' + n1(pt.x) + ' ' + n1(pt.y) + ') rotate(' + n1(ang) + ')');
      R.prop.setAttribute('ry', n1(9 * Math.abs(Math.cos(s * 400))));
      var release = vis && pt.x > 140 && pt.x < (means.heli ? 290 : 350); /* stop short of the lake when a helicopter refills there */
      R.pwater.setAttribute('opacity', release ? '0.85' : '0');
      R.pwater.setAttribute('points', [[pt.x - 2, pt.y + 9], [pt.x + 10, pt.y + 9], [pt.x - 25, GROUND - 22], [pt.x - 90, GROUND - 22]].map(function (q) { return n1(q[0]) + ',' + n1(q[1]); }).join(' '));
      steamPlane = release;
      steamPlaneX = pt.x - 55;
    }

    var steamHeli = false, steamHeliX = 0;
    /* Aerial helicopter with helibalde */
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
      steamHeli = !!drop;
      steamHeliX = hp.x;
    }

    /* Volumetric steam/vapor billowing when water hits the fire on the ground */
    if (R.steam) {
      var steamOn = steamPlane || steamHeli;
      var stX = steamPlane ? steamPlaneX : steamHeliX;
      R.steam.setAttribute('opacity', steamOn ? '1' : '0');
      if (steamOn) {
        R.steamPuffs.forEach(function (el, i) {
          var u = frac(s * 16 + i / R.steamPuffs.length);
          var sx = stX + (rnd(i + 700) - 0.5) * 36 + (u - 0.5) * 16;
          var sy = (GROUND - 24) - u * 32;
          el.setAttribute('cx', n1(sx));
          el.setAttribute('cy', n1(sy));
          el.setAttribute('r', n1(6 + u * 16));
          el.setAttribute('opacity', ((1 - u) * 0.75).toFixed(2));
        });
      }
    }
  }

  return { html: s, mount: mount, update: update };
}

export type SceneMeans = { crew?: number; plane?: number; heli?: number };
export type SceneOptions = {
  id?: string;
  kind?: string;
  means?: SceneMeans;
  hectares?: number;
  unit?: string;
  aria?: string;
  still?: boolean;
  label?: boolean;
};
export type FireSceneInstance = { html: string; mount: (svg: Element) => void; update: (s: number) => void };

export const createScene: (o: SceneOptions) => FireSceneInstance = create;
export { S_FIRE, S_FIGHT };
