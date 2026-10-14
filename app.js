/* Foco Cero — focos de calor en Argentina, 2012–2026
   Datos: NASA FIRMS (VIIRS S-NPP). Límites: Natural Earth (dominio público). */
(function () {
  'use strict';
  var D = window.DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var fmt = function (n) { return Math.round(n).toLocaleString('es-AR'); };
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- contenido ---------- */
  var CAV = 'Cada punto del mapa es un <b>foco de calor</b> detectado por satélite (VIIRS, 375 m): no es una hectárea quemada ni necesariamente un incendio forestal, e incluye quemas agrícolas y de pastizal.';

  var EVENTS = [
    {
      id: 'cordoba', region: 'Córdoba', when: 'Mayo a noviembre de 2020', year: 2020,
      provs: ['Córdoba'], marker: [-64.55, -32.15], title: 'Las sierras de Córdoba',
      hero: { value: 316150, unit: 'hectáreas', label: 'quemadas entre el 16 de mayo y el 22 de noviembre de 2020 (aprox.).', src: 'Secretaría de Ambiente de Córdoba',
        note: 'El Ministerio de Seguridad informó 321.688 ha. El informe no explica la diferencia de unas 5.500 ha.' },
      facts: [
        ['265', 'incendios forestales, contra un promedio de 210 en los diez años anteriores.'],
        ['27', 'incendios de más de 500 ha sumaron 306.956 ha: casi toda la superficie quemada.'],
        ['99.856 ha', 'en el departamento Río Cuarto, el más afectado. Siguen Punilla (54.464) y Cruz del Eje (47.037).'],
        ['297.638 ha', 'de Bosque Chaqueño Serrano, la región fitogeográfica más golpeada.'],
        ['20 %', 'de lo quemado fueron rastrojos de maíz y soja.'],
        ['Octubre', 'recién entonces llegaron las lluvias, y los incendios se prolongaron hasta mediados de noviembre, según el informe provincial.']
      ],
      cause: { kind: 'sequia', text: 'El informe oficial no da porcentajes por causa. Señala baja humedad, heladas, vientos y mucho combustible seco, y menciona "el factor antrópico, como la imprudencia y la negligencia".' },
      response: 'La fuente no detalla los medios de combate.', means: { crew: 3 },
      months: { prov: ['Córdoba'], year: 2020, from: 5, to: 11 },
      sources: [{ t: 'Informe incendios 2020, Provincia de Córdoba', u: 'https://ambiente.cba.gov.ar/wp-content/uploads/2024/11/INFORME-INCENDIOS-2020-Provincia-de-Cordoba.pdf' }]
    },
    {
      id: 'delta', region: 'Delta del Paraná', when: 'Año 2020', year: 2020,
      provs: ['Santa Fe', 'Entre Ríos', 'Buenos Aires'], marker: [-60.4, -32.7], title: 'El humo sobre Rosario',
      hero: { value: 328000, unit: 'hectáreas', label: 'quemadas en el Delta del Paraná hasta noviembre de 2020.', src: 'Ministerio de Ambiente de Santa Fe (cifra oficial)',
        note: 'El Taller Ecologista estimó entre 350.000 y 400.000 ha (estimación no oficial).' },
      facts: [
        ['38.639', 'focos de calor hacia fines de noviembre, según el seguimiento del Museo Scasso (Piecas).'],
        ['Agosto', 'fue el peor mes en cantidad de focos.'],
        ['5 veces', 'peor de lo tolerable llegó a ser, por momentos, el aire en Rosario.'],
        ['Bajante', 'prolongada del río, que una especialista compara con la de hace unos 50 años.']
      ],
      cause: { kind: 'quema', text: 'Organizaciones ambientalistas señalan las quemas como origen del desastre, en un contexto de bajante histórica y sequía.' },
      response: 'La fuente no detalla los medios de combate.', means: { crew: 3 },
      months: { prov: ['Santa Fe', 'Entre Ríos', 'Buenos Aires'], year: 2020, from: 1, to: 12 },
      sources: [{ t: 'La Capital: más de 300 mil hectáreas incendiadas en el Delta (2020)', u: 'https://www.lacapital.com.ar/la-ciudad/con-el-2020-se-van-mas-300-mil-hectareas-incendiadas-el-delta-del-rio-parana-n2631286.html' }]
    },
    {
      id: 'misiones', region: 'Misiones', when: 'Noviembre de 2020', year: 2020,
      provs: ['Misiones'], marker: [-54.1, -27.0], title: 'Selva misionera: Reserva Yabotí',
      hero: { value: 340, unit: 'hectáreas', label: 'de selva nativa dañadas, según la estimación de la empresa propietaria de los lotes 8 y 9.', src: 'Juan Alberto SA, citada por Misiones Online',
        note: 'Es una estimación de parte, no una cifra oficial.' },
      facts: [
        ['+200', 'personas combatieron el fuego: brigadistas, bomberos, guardaparques, Policía y Protección Civil.'],
        ['1', 'avión hidrante del Plan Nacional de Manejo del Fuego.'],
        ['Por dentro', 'los troncos de gran diámetro siguieron encendidos por dentro, y hubo que hacer guardia de cenizas.'],
        ['Denuncia', 'penal por estragos presentada por el gobierno de Misiones.']
      ],
      cause: { kind: 'quema', text: 'La empresa habla de una quema ilegal para limpiar terreno. No hay responsables identificados.' },
      response: 'Un avión hidrante y más de 200 personas. La lluvia ayudó a controlar el fuego.', means: { crew: 4, plane: 1 },
      months: { prov: ['Misiones'], year: 2020, from: 5, to: 12 },
      sources: [{ t: 'Misiones Online: Yabotí, 340 hectáreas', u: 'https://misionesonline.net/2020/11/27/yaboti-habria-340-hectareas-de-bosques-nativos-afectadas-por-el-incendio-en-el-lote-8-y-9-de-la-empresa-forestal-juan-alberto-sa/' }]
    },
    {
      id: 'corrientes', region: 'Corrientes', when: 'Enero y febrero de 2022', year: 2022,
      provs: ['Corrientes'], marker: [-57.2, -28.5], title: 'Los Esteros del Iberá',
      hero: { value: 934238, unit: 'hectáreas', label: 'de cobertura vegetal afectada al 21 de febrero de 2022, cerca del 11 % de la provincia.', src: 'INTA Corrientes',
        note: 'El Servicio Nacional de Manejo del Fuego estimó unas 632 mil ha con imágenes satelitales: la provincia no reporta su superficie quemada al organismo nacional.' },
      facts: [
        ['6.055', 'focos de calor solo en enero y febrero de 2022, una cifra inusual para esa época.'],
        ['275 mil ha', 'de esteros y bañados quemadas (eran 245 mil días antes): la cobertura más afectada.'],
        ['+ que 2021', 'en dos meses de 2022 se quemó en el país más que en todo 2021 (unas 330 mil ha).'],
        ['100 %', 'de la herpetofauna (reptiles y anfibios) perdida en el Parque San Cayetano en los incendios de 2020, según el investigador Kowalewski.'],
        ['Iberá', 'gran parte de los focos activos estaba dentro de la Reserva del Iberá, un macrosistema de 1,3 millones de hectáreas, según National Geographic.']
      ],
      cause: { kind: 'sequia', text: 'Casi 24 meses de La Niña, calor y baja humedad. Especialistas citados hablan de quemas para obtener pastura fresca; la nota no cuantifica cuánto fue intencional.' },
      response: 'La fuente no detalla los medios de combate.', means: { crew: 3 },
      months: { prov: ['Corrientes'], year: 2022, from: 1, to: 12 },
      sources: [{ t: 'National Geographic: incendios en Argentina, pérdidas y causas', u: 'https://www.nationalgeographicla.com/medio-ambiente/2022/02/incendios-en-argentina-las-perdidas-sus-causas-y-la-destruccion-masiva-de-biodiversidad' }]
    },
    {
      id: 'mendoza', region: 'Mendoza', when: 'Octubre de 2023', year: 2023,
      provs: ['Mendoza'], marker: [-68.93, -32.8], title: 'El Challao, a minutos de la ciudad',
      hero: { value: 6000, unit: 'hectáreas', label: 'en el piedemonte de El Challao, Luján de Cuyo (aprox.).', src: 'Los Andes, con datos del Plan Provincial de Manejo del Fuego',
        note: 'La nota ubica el fuego el 28 y 29 de octubre y menciona otro foco el 30: las fechas no coinciden exactamente.' },
      facts: [
        ['84.839 ha', 'quemadas en toda la provincia en 2023: 92 % más que el período anterior.'],
        ['~90', 'personas evacuadas en El Challao.'],
        ['20.000 ha', 'en General Alvear, por una tormenta eléctrica el 17 de enero.'],
        ['+30 %', 'brigadistas temporarios sumados al Plan para esa temporada.']
      ],
      cause: { kind: 'intencional', text: 'Las autoridades indicaron que el incendio fue provocado.' },
      response: 'Brigadistas del Plan Provincial de Manejo del Fuego. La provincia pidió a Nación un avión hidrante para Luján de Cuyo.', means: { crew: 3 },
      months: { prov: ['Mendoza'], year: 2023, from: 1, to: 12 },
      sources: [
        { t: 'Los Andes: incendios arrasaron 85.000 hectáreas en Mendoza (dic. 2023)', u: 'https://www.losandes.com.ar/sociedad/luego-de-que-incendios-arrasaran-85000-hectareas-en-mendoza-aumentan-el-numero-de-brigadistas' },
        { t: 'El Sol: confirman que el incendio en el pedemonte fue intencional', u: 'https://www.elsol.com.ar/mendoza/confirman-que-el-incendio-en-el-pedemonte-fue-intencional-el-dano-ambiental-es-muy-grave/' }
      ]
    },
    {
      id: 'chubut', region: 'Chubut', when: 'Enero y febrero de 2026', year: 2026,
      provs: ['Chubut'], marker: [-71.45, -42.2], title: 'Patagonia: Epuyén y Los Alerces',
      hero: { value: 45000, unit: 'hectáreas', label: 'afectadas según el informe provincial del 3 de febrero de 2026.', src: 'Gobierno de Chubut, citado por Infobae',
        note: 'Infobae titula "más de 50 mil". La nota ubica el inicio en Puerto Patriada y también en El Hoyo.' },
      facts: [
        ['14.000 ha', 'quemadas al 12 de enero, una semana después del inicio (5 de enero).'],
        ['~47', 'viviendas totalmente destruidas, según el último reporte provincial.'],
        ['75 %', 'del bosque nativo de Epuyén se habría perdido, según expertos citados por Infobae.'],
        ['+500', 'personas desplegadas, con aviones hidrantes, anfibios y helicópteros con helibalde.'],
        ['4 provincias', 'en emergencia ígnea por DNU (30 de enero): Chubut, Neuquén, Río Negro y La Pampa.']
      ],
      cause: { kind: 'intencional', text: 'El gobernador Ignacio Torres afirmó el 6 de enero que el fuego fue intencional. La nota no informa si hay responsables identificados ni resoluciones judiciales.' },
      response: 'Más de 500 personas, aviones hidrantes y helicópteros. Las lluvias de la cordillera no superaron los 8 mm y no frenaron el avance.', means: { crew: 5, plane: 1, heli: 1 },
      months: { prov: ['Chubut'], year: 2026, from: 1, to: 10 },
      sources: [
        { t: 'Infobae: un mes de los incendios en Chubut', u: 'https://www.infobae.com/sociedad/2026/02/05/un-mes-de-los-incendios-en-chubut-la-cronologia-de-la-catastrofe-ambiental-que-ya-arraso-con-mas-de-50-mil-hectareas/' },
        { t: 'Diario de Cuyo: confirmaron que el fuego fue intencional', u: 'https://www.diariodecuyo.com.ar/argentina/incendios-en-chubut-confirmaron-que-el-fuego-fue-intencional-y-hay-cientos-de-evacuados-1817717.html' }
      ]
    }
  ];

  var SLIDES = [{ type: 'intro' }].concat(EVENTS.map(function (e) { return { type: 'event', ev: e }; })).concat([{ type: 'explore' }, { type: 'method' }]);

  /* ---------- datos derivados ---------- */
  var YEARS = Object.keys(D.grid.anios).map(Number).sort();
  var STEP = D.grid.step;
  var maxN = 1;
  YEARS.forEach(function (y) { D.grid.anios[String(y)].forEach(function (c) { if (c[2] > maxN) maxN = c[2]; }); });
  var ALL = null;
  function allCells() {
    if (ALL) return ALL;
    var m = {};
    YEARS.forEach(function (y) { D.grid.anios[String(y)].forEach(function (c) { var k = c[0] + ',' + c[1]; if (m[k]) m[k][2] += c[2]; else m[k] = [c[0], c[1], c[2]]; }); });
    ALL = Object.keys(m).map(function (k) { return m[k]; });
    return ALL;
  }
  var maxAll = 1; allCells().forEach(function (c) { if (c[2] > maxAll) maxAll = c[2]; });

  var LUT = (function () {
    var stops = [[0, [90, 26, 16]], [0.35, [179, 48, 15]], [0.65, [255, 106, 19]], [1, [255, 226, 122]]];
    var out = [];
    for (var i = 0; i < 64; i++) {
      var t = i / 63, a = stops[0], b = stops[1];
      for (var s = 0; s < stops.length - 1; s++) { if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; } }
      var u = (t - a[0]) / (b[0] - a[0] || 1);
      var c = [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * u); });
      out.push('rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (0.35 + 0.65 * t).toFixed(2) + ')');
    }
    return out;
  })();
  function colorFor(n, mx) { var t = Math.min(1, Math.log(n + 1) / Math.log(mx + 1)); return LUT[Math.round(t * 63)]; }

  function totalYear(y) { return (D.meta.por_anio[String(y)]) || 0; }
  var PROVS = D.prov.features.map(function (f) { return f.properties.name; });
  var FULL = YEARS.filter(function (y) { return y > 2012 && y < 2026; });
  function mkey(y, m) { return y + '-' + (m < 10 ? '0' : '') + m; }
  function provYear(p, y) { var o = D.pm[p] || {}, s = 0; for (var m = 1; m <= 12; m++) s += o[mkey(y, m)] || 0; return s; }
  function ranking(y) { return PROVS.map(function (n) { return { n: n, v: provYear(n, y) }; }).sort(function (a, b) { return b.v - a.v; }); }
  /* shareable view: #<slide>&y=<year>&p=<province> */
  var URLP = (function () {
    var parts = decodeURIComponent((location.hash || '').slice(1)).split('&'), o = { slide: parseInt(parts[0], 10) };
    parts.slice(1).forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = kv.slice(i + 1); });
    o.y = YEARS.indexOf(+o.y) >= 0 ? +o.y : null; o.p = PROVS.indexOf(o.p) >= 0 ? o.p : null;
    var c = (o.c || '').split('-');
    o.c = YEARS.indexOf(+c[0]) >= 0 && YEARS.indexOf(+c[1]) >= 0 ? { a: +c[0], b: +c[1], view: /^[abd]$/.test(c[2]) ? c[2] : 'd' } : null;
    return o;
  })();
  function monthSeries(provs, year) {
    var out = [];
    for (var m = 1; m <= 12; m++) {
      var key = year + '-' + (m < 10 ? '0' : '') + m, s = 0;
      provs.forEach(function (p) { s += (D.pm[p] && D.pm[p][key]) || 0; });
      out.push(s);
    }
    return out;
  }

  /* ---------- comparación de dos años ---------- */
  var DIFF_MIN = 3;
  function yearCells(y) { return D.grid.anios[String(y)] || []; }
  function maxOf(cs) { var m = 1; cs.forEach(function (c) { if (c[2] > m) m = c[2]; }); return m; }
  function diffCells(a, b) {
    var m = {};
    yearCells(a).forEach(function (c) { m[c[0] + ',' + c[1]] = [c[0], c[1], -c[2]]; });
    yearCells(b).forEach(function (c) { var k = c[0] + ',' + c[1]; if (m[k]) m[k][2] += c[2]; else m[k] = [c[0], c[1], c[2]]; });
    return Object.keys(m).map(function (k) { return m[k]; });
  }
  /* colorblind-safe diverging scale: blue = fewer heat spots in B, orange = more; symmetric, log magnitude */
  function divColor(d, mx) {
    var t = Math.min(1, Math.log(1 + Math.abs(d)) / Math.log(1 + mx)), a = (0.4 + 0.6 * t).toFixed(2);
    var c = d > 0 ? [200 + 55 * t, 90 + 106 * t, 20 + 100 * t] : [40 + 110 * t, 110 + 100 * t, 190 + 65 * t];
    return 'rgba(' + c.map(Math.round).join(',') + ',' + a + ')';
  }
  function commonMonths(a, b) {
    var f = 1, t = 12;
    [a, b].forEach(function (y) { if (y === 2012) f = 2; if (y === 2026) t = 9; });
    return [f, t];
  }
  function provRange(p, y, f, t) { var o = D.pm[p] || {}, s = 0; for (var m = f; m <= t; m++) s += o[mkey(y, m)] || 0; return s; }
  function partialNote(a, b) {
    var L = [];
    if (a === 2026 || b === 2026) L.push('2026 incluye datos solo hasta el 14/10');
    if (a === 2012 || b === 2012) L.push('2012 empieza el 20/01');
    if (!L.length || a === b) return '';
    var cm = commonMonths(a, b);
    return 'Atención: ' + L.join(' y ') + '. El mapa compara años completos, así que la diferencia está sesgada; el ranking usa solo los meses completos en común (' + MESES[cm[0] - 1] + '–' + MESES[cm[1] - 1] + ').';
  }

  /* =====================================================================
     Shell: fixed full-screen stage (map canvas + illustrated scene), one card
     at a time anchored bottom-left, a tall spacer whose scroll progress P drives everything.
     ===================================================================== */
  var EXPLORE = 7, METHOD = 8;
  var MOBILE = window.matchMedia('(max-width: 1023px)');
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function ease(t) { return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var cur = 0, P = 0, paused = false, timer = 0, playing = false, frameReq = 0;
  if (URLP.slide === 0 && (URLP.y || URLP.p || URLP.c)) URLP.slide = EXPLORE; // older exploration links
  var NAMES = ['Inicio'].concat(EVENTS.map(function (e) { return e.region; })).concat(['Explorar', 'Cómo se hizo']);
  /* scroll range (in screens) and card boundaries per chapter type */
  var RANGE = { intro: 1.6, event: 3.4, explore: 0, method: 0 };
  var CARD_ENDS = { intro: [1], event: [0.25, 0.5, 1], explore: [1], method: [1] };

  /* ---------- map: canvas with a camera (base units: degrees, longitude scaled by cos 38°) ---------- */
  var LON0 = -73.8, LON1 = -53.4, LAT0 = -55.3, LAT1 = -21.6, K = Math.cos(38 * Math.PI / 180);
  var cv = $('#map'), ctx = cv.getContext('2d');
  var MONTH_OPTS = [['0', 'Todo el año']].concat(MESES_L.map(function (m, i) { return [String(i + 1), m.charAt(0).toUpperCase() + m.slice(1)]; }))
    .concat([['q1', 'Enero a marzo'], ['q2', 'Abril a junio'], ['q3', 'Julio a septiembre'], ['q4', 'Octubre a diciembre']]);
  var state = { year: URLP.y || 2020, all: false, hi: [], prov: URLP.p, hover: null, cmp: URLP.c, m: /^(1[0-2]|[1-9]|q[1-4])$/.test(URLP.m || '') ? URLP.m : '0' };
  if (state.cmp) state.year = state.cmp.b;
  var W = 0, H = 0, dpr = 1, cellIdx = {}, drawList = [];
  function bxy(lon, lat) { return [(lon - LON0) * K, LAT1 - lat]; }
  var paths = D.prov.features.map(function (f) {
    var p = new Path2D(), g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates, bb = [1e9, 1e9, -1e9, -1e9];
    polys.forEach(function (poly) {
      poly.forEach(function (ring) {
        ring.forEach(function (pt, i) {
          var q = bxy(pt[0], pt[1]); if (i) p.lineTo(q[0], q[1]); else p.moveTo(q[0], q[1]);
          bb[0] = Math.min(bb[0], q[0]); bb[1] = Math.min(bb[1], q[1]); bb[2] = Math.max(bb[2], q[0]); bb[3] = Math.max(bb[3], q[1]);
        });
        p.closePath();
      });
    });
    return { name: f.properties.name, p: p, bb: bb };
  });
  var COUNTRY = [0, 0, (LON1 - LON0) * K, LAT1 - LAT0];
  var rest = { x: COUNTRY[2] / 2, y: COUNTRY[3] / 2, z: 10 }, flight = null, CAM_MS = 800, cam = rest;

  /* the map frames its subject inside the stage zone: right of the card, below the top bar, above the foot */
  function viewRect() {
    var top = MOBILE.matches ? 56 : 80;
    if (MOBILE.matches) return { x: 8, y: top, w: W - 16, h: H - top - 36 };
    var x0 = $('#cards').getBoundingClientRect().right + 48, x1 = W - 32;
    return { x: x0, y: top, w: Math.max(200, x1 - x0), h: H - top - 120 };
  }
  function camFor(bb, pad) {
    var R = viewRect(), bw = Math.max(0.5, bb[2] - bb[0]), bh = Math.max(0.5, bb[3] - bb[1]);
    var z = Math.min(R.w / bw, R.h / bh) * pad, cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
    return { x: cx - (R.x + R.w / 2 - W / 2) / z, y: cy - (R.y + R.h / 2 - H / 2) / z, z: z };
  }
  function bboxOf(names) {
    var b = [1e9, 1e9, -1e9, -1e9];
    paths.forEach(function (o) { if (names.indexOf(o.name) >= 0) { b[0] = Math.min(b[0], o.bb[0]); b[1] = Math.min(b[1], o.bb[1]); b[2] = Math.max(b[2], o.bb[2]); b[3] = Math.max(b[3], o.bb[3]); } });
    return b;
  }
  function lerpCam(a, b, t) { return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)) }; }
  function countryCam() { return camFor(COUNTRY, 0.95); }
  function targetCam() { var sl = SLIDES[cur]; return sl.type === 'event' ? camFor(bboxOf(sl.ev.provs), 0.8) : countryCam(); }
  function baseCam(now) {
    if (!flight) return rest;
    var t = clamp((now - flight.t0) / CAM_MS, 0, 1), e = 1 - Math.pow(1 - t, 3);
    cv.style.opacity = (1 - 0.45 * Math.sin(Math.PI * t)).toFixed(3); // cross-fade while flying
    if (t >= 1) { flight = null; cv.style.opacity = ''; return rest; }
    return lerpCam(flight.from, rest, e);
  }
  function flyTo(target, instant) {
    var from = cam;
    rest = target;
    if (instant || REDUCED || !W) { flight = null; cv.style.opacity = ''; }
    else flight = { from: from, t0: performance.now() };
    requestFrame();
  }
  /* scroll adjustments on top of the resting camera: slow push-in while foci accumulate, pull-out at the end */
  function scrollCam(c) {
    if (SLIDES[cur].type !== 'event') return c;
    var zin = 1 + 0.14 * seg(P, 0, 0.25), out = 0.7 * ease(seg(P, 0.85, 1));
    return lerpCam({ x: c.x, y: c.y, z: c.z * zin }, countryCam(), out);
  }

  function rebuildCells() {
    var sl = SLIDES[cur], C = cmpActive(), cs, col;
    cellIdx = {}; drawList = [];
    if (sl.type === 'event') return;
    function ix(c) { return Math.floor(c[0] / STEP) + ',' + Math.floor(c[1] / STEP); }
    if (C) {
      yearCells(C.a).forEach(function (c) { cellIdx[ix(c)] = { a: c[2], b: 0 }; });
      yearCells(C.b).forEach(function (c) { var k = ix(c); if (cellIdx[k]) cellIdx[k].b = c[2]; else cellIdx[k] = { a: 0, b: c[2] }; });
      if (C.view === 'd') {
        cs = diffCells(C.a, C.b).filter(function (c) { return Math.abs(c[2]) >= DIFF_MIN; });
        var md = 1; cs.forEach(function (c) { if (Math.abs(c[2]) > md) md = Math.abs(c[2]); });
        col = function (c) { return divColor(c[2], md); };
      } else {
        var mm = Math.max(maxOf(yearCells(C.a)), maxOf(yearCells(C.b)));
        cs = yearCells(C.view === 'a' ? C.a : C.b); col = function (c) { return colorFor(c[2], mm); };
      }
    } else {
      var mx = state.all ? maxAll : maxN;
      cs = state.all ? allCells() : yearCells(state.year); col = function (c) { return colorFor(c[2], mx); };
      cs.forEach(function (c) { cellIdx[ix(c)] = c[2]; });
    }
    drawList = cs.map(function (c) { var q = bxy(c[0], c[1]); return [q[0], q[1], col(c)]; });
  }

  /* ---------- per-fire weekly foci (lazy-loaded data/ev/<id>.js) ---------- */
  var FOCI = {};
  function loadFoci(ev) {
    if (FOCI[ev.id] || document.getElementById('ev-' + ev.id)) return;
    var s = document.createElement('script'); s.id = 'ev-' + ev.id; s.src = 'data/ev/' + ev.id + '.js';
    s.onload = function () {
      var E = window.EV_FOCI && window.EV_FOCI[ev.id]; if (!E) return;
      var cum = new Array(E.weeks + 1).fill(0), first = E.weeks;
      E.cells.forEach(function (c) { cum[c[2] + 1] += c[3]; if (c[2] < first) first = c[2]; });
      for (var i = 1; i < cum.length; i++) cum[i] += cum[i - 1];
      E.pts = E.cells.map(function (c) { var q = bxy(c[0], c[1]); return [q[0], q[1], c[2]]; });
      E.cum = cum; E.first = first; FOCI[ev.id] = E; requestFrame();
    };
    document.head.appendChild(s);
  }
  /* weeks shown: never empty, it starts with the first week that has foci */
  function fociWeek(E) { return P < 0.22 ? E.first + 1 + Math.floor(seg(P, 0.02, 0.22) * (E.weeks - E.first - 1)) : E.weeks; }
  function weekDate(E, w) {
    var d = new Date(E.start + 'T00:00:00'); d.setDate(d.getDate() + 7 * w - 1);
    var last = E.last ? new Date(E.last + 'T00:00:00') : null; if (last && d > last) d = last;
    return d.getDate() + ' de ' + MESES_L[d.getMonth()] + ' de ' + d.getFullYear();
  }

  /* ---------- drawing (only when something changed) ---------- */
  function draw(now) {
    if (!W) return;
    var sl = SLIDES[cur], c = cam = scrollCam(baseCam(now)), lw = 1 / c.z;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (sl.type === 'event' && sceneAlpha() > 0.995) return; // hidden under the scene
    ctx.setTransform(dpr * c.z, 0, 0, dpr * c.z, dpr * (W / 2 - c.z * c.x), dpr * (H / 2 - c.z * c.y));
    paths.forEach(function (o) { ctx.fillStyle = state.hi.indexOf(o.name) >= 0 ? 'rgba(255,176,58,.07)' : 'rgba(255,255,255,.035)'; ctx.fill(o.p); });
    var cw = STEP * K + 0.01, ch = STEP + 0.01;
    drawList.forEach(function (d) { ctx.fillStyle = d[2]; ctx.fillRect(d[0] - cw / 2, d[1] - ch / 2, cw, ch); });
    if (sl.type === 'event' && FOCI[sl.ev.id]) {
      var E = FOCI[sl.ev.id], wk = fociWeek(E), sz = Math.max(E.step, 2.4 / c.z), szx = Math.max(E.step * K, 2.4 / c.z);
      E.pts.forEach(function (q) {
        if (q[2] >= wk) return;
        var age = wk - 1 - q[2];
        ctx.fillStyle = age < 1 ? 'rgba(255,226,122,.95)' : age < 4 ? 'rgba(255,122,26,.85)' : 'rgba(179,48,15,.7)';
        ctx.fillRect(q[0] - szx / 2, q[1] - sz / 2, szx, sz);
      });
    }
    ctx.lineJoin = 'round';
    paths.forEach(function (o) { if (state.hi.indexOf(o.name) < 0) { ctx.strokeStyle = 'rgba(237,237,237,.18)'; ctx.lineWidth = 0.7 * lw; ctx.stroke(o.p); } });
    if (state.hover && state.hi.indexOf(state.hover.name) < 0) { ctx.strokeStyle = 'rgba(237,237,237,.7)'; ctx.lineWidth = 1.2 * lw; ctx.stroke(state.hover.p); }
    paths.forEach(function (o) { if (state.hi.indexOf(o.name) >= 0) { ctx.strokeStyle = '#ffb03a'; ctx.lineWidth = 1.2 * lw; ctx.stroke(o.p); } });
    if (sl.type === 'event') {
      var m = bxy(sl.ev.marker[0], sl.ev.marker[1]), ph = REDUCED || paused ? 0.4 : (now % 1600) / 1600;
      ctx.beginPath(); ctx.arc(m[0], m[1], (6 + ph * 22) * lw, 0, 7); ctx.strokeStyle = 'rgba(255,176,58,' + (0.8 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = 1.5 * lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(m[0], m[1], 4 * lw, 0, 7); ctx.fillStyle = '#ffb03a'; ctx.fill();
    }
  }
  /* a frame runs on scroll, resize, data load and during camera flights; the marker pulse keeps it alive only while visible */
  function needsLoop() {
    if (flight) return true;
    return SLIDES[cur].type === 'event' && !REDUCED && !paused && !document.hidden && sceneAlpha() < 0.995;
  }
  function requestFrame() { if (!frameReq) frameReq = requestAnimationFrame(frame); }
  function frame(now) {
    frameReq = 0;
    var sl = SLIDES[cur];
    $('#progress i').style.transform = 'scaleX(' + P.toFixed(4) + ')';
    setActiveCard();
    if (P > 0.01) $('#cue').hidden = true;
    if (sl.type === 'intro' && P > 0.05 && !playing) {
      var yi = Math.round(seg(P, 0.1, 0.95) * (YEARS.length - 1));
      if (YEARS[yi] !== state.year) setYear(YEARS[yi]);
    }
    if (sl.type === 'event') updateEvent();
    draw(now || performance.now());
    if (needsLoop()) requestFrame();
  }

  /* ---------- fire chapters: map phase -> scene phases -> back to the map ---------- */
  var scn = null;
  function sceneAlpha() { return SLIDES[cur].type === 'event' ? ease(seg(P, 0.2, 0.3)) * (1 - ease(seg(P, 0.85, 0.93))) : 0; }
  function sceneS() { return P < 0.25 ? 0 : P < 0.5 ? 0.67 * seg(P, 0.25, 0.5) : P < 0.85 ? 0.67 + 0.33 * seg(P, 0.5, 0.85) : 1; }
  function unitShort(ev) { return ev.hero.unit === 'hectáreas' ? 'ha' : ev.hero.unit; }
  function updateEvent() {
    var ev = SLIDES[cur].ev, a = sceneAlpha(), s = sceneS(), st = s < FireScene.S_FIRE ? 0 : s < FireScene.S_FIGHT ? 1 : 2;
    $('#scenewrap').style.opacity = a.toFixed(3);
    if (REDUCED) s = [0.18, 0.5, 0.8][st];
    if (scn) scn.update(s);
    var sv = $('#scenewrap svg.scene'); if (sv) sv.classList.toggle('paused', a < 0.02 || paused || document.hidden);
    var v = fmt(ev.hero.value * ease(seg(P, 0.25, 0.45)));
    var hn = $('#heronum'); if (hn) hn.textContent = v;
    var fig = $('#figure'); fig.hidden = P < 0.22;
    $('#figN').textContent = v + ' ' + unitShort(ev); $('#figL').textContent = 'Según ' + ev.hero.src;
    var E = FOCI[ev.id], foot = $('#foot');
    if (a < 0.5) {
      if (E) {
        var wk = fociWeek(E);
        foot.innerHTML = '<span class="key"><span>semanas anteriores</span><span class="ramp"></span><span>última semana</span></span><br>' +
          'Focos de calor en ' + ev.months.prov.join(' + ') + ' · semana ' + wk + ' de ' + E.weeks + ' · hasta el ' + weekDate(E, wk) + ' · <b>' + fmt(E.cum[wk]) + ' focos</b>';
      } else foot.textContent = 'Cargando los focos de calor de este incendio…';
    } else foot.innerHTML = '';
  }
  /* chapter of each fact, keyed by its figure (texts in EVENTS stay untouched); default: 1, the fire */
  var FACT_STAGE = {
    cordoba: { 'Octubre': 2 },
    delta: { 'Bajante': 0 },
    misiones: { '+200': 2, '1': 2, 'Por dentro': 2, 'Denuncia': 0 },
    chubut: { '+500': 2, '4 provincias': 2 }
  };
  var FACT_TAG = { mendoza: { '+30 %': 'a nivel provincial' } };
  /* when two sources give different figures, both are shown side by side (values and attribution as in hero.note) */
  var ALT = {
    cordoba: [['316.150 ha', 'Secretaría de Ambiente de Córdoba'], ['321.688 ha', 'Ministerio de Seguridad']],
    delta: [['328.000 ha', 'Ministerio de Ambiente de Santa Fe'], ['350.000–400.000 ha', 'Taller Ecologista, estimación no oficial']],
    corrientes: [['934.238 ha', 'INTA Corrientes'], ['unas 632 mil ha', 'Servicio Nacional de Manejo del Fuego']]
  };
  function factList(ev, st) {
    var map = FACT_STAGE[ev.id] || {}, tags = FACT_TAG[ev.id] || {};
    var L = ev.facts.filter(function (f) { return (f[0] in map ? map[f[0]] : 1) === st; });
    return L.length ? '<ul class="facts">' + L.map(function (f) {
      return '<li><b>' + f[0] + '</b><span>' + f[1] + (tags[f[0]] ? ' <em class="tag">' + tags[f[0]] + '</em>' : '') + '</span></li>';
    }).join('') + '</ul>' : '';
  }
  function meansText(m) {
    var L = [];
    if (m.plane) L.push('avión hidrante');
    if (m.heli) L.push('helicóptero con helibalde');
    L.push('brigadistas con mangueras');
    return 'En la ilustración: ' + L.join(', ') + (m.plane || m.heli ? ', como mencionan las fuentes.' : '. No se dibujan medios aéreos porque la fuente no los menciona.');
  }
  function mountScene(ev) {
    scn = FireScene.create({ still: REDUCED, label: false, kind: ev.cause.kind, means: ev.means || { crew: 3 }, hectares: ev.hero.value, unit: unitShort(ev),
      aria: 'Ilustración esquemática: cómo empezó, cómo creció y cómo se combatió el incendio de ' + ev.region });
    return scn.html;
  }
  document.addEventListener('visibilitychange', requestFrame);

  /* ---------- charts ---------- */
  function monthSVG(ev) {
    var s = monthSeries(ev.months.prov, ev.months.year), mx = Math.max.apply(null, s) || 1, w = 300, h = 84, bw = 20, gap = 4.5, out = '';
    var peak = s.indexOf(mx);
    s.forEach(function (v, i) {
      var inRange = (i + 1) >= ev.months.from && (i + 1) <= ev.months.to, bh = Math.max(1, (v / mx) * (h - 32)), x = i * (bw + gap) + 2;
      var future = ev.months.year === 2026 && i + 1 > 10;
      out += '<rect x="' + x + '" y="' + (h - 14 - bh) + '" width="' + bw + '" height="' + bh + '" rx="2" fill="' + (future ? '#2a2420' : (i === peak ? '#ffb03a' : '#8a5a2a')) + '" opacity="' + (inRange ? 1 : 0.4) + '"><title>' + MESES_L[i] + ': ' + fmt(v) + ' focos</title></rect>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (h - 2) + '" font-size="8.5" fill="rgba(237,237,237,.72)" text-anchor="middle">' + MESES[i] + '</text>';
    });
    out += '<text x="' + (peak * (bw + gap) + 2 + bw / 2) + '" y="' + (h - 14 - (h - 32) - 4) + '" font-size="9.5" fill="#ffb03a" text-anchor="middle" font-weight="700">' + fmt(mx) + '</text>';
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Focos de calor por mes, pico en ' + MESES_L[peak] + ' con ' + fmt(mx) + '">' + out + '</svg>';
  }
  function provYearsSVG(p) {
    var vals = YEARS.map(function (y) { return provYear(p, y); }), mx = Math.max.apply(null, vals) || 1, w = 320, h = 84, bw = 17.5, gap = 3, out = '';
    YEARS.forEach(function (y, i) {
      var v = vals[i], bh = Math.max(1, (v / mx) * (h - 30)), x = i * (bw + gap) + 2, on = y === state.year;
      out += '<rect data-y="' + y + '" x="' + x + '" y="' + (h - 16 - bh) + '" width="' + bw + '" height="' + bh + '" rx="2" fill="' + (on ? '#ffb03a' : '#8a5a2a') + '"><title>' + y + ': ' + fmt(v) + ' focos</title></rect>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (h - 4) + '" font-size="7.5" fill="rgba(237,237,237,.72)" text-anchor="middle">' + String(y).slice(2) + '</text>';
    });
    return '<svg class="pyears" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Focos de calor por año en ' + p + '">' + out + '</svg>';
  }

  /* ---------- cards: one idea per card ---------- */
  function sourcesHTML(title, list) {
    return '<h2 id="srcT">Fuentes · ' + title + '</h2><ul>' + list.map(function (s) { return '<li><a href="' + s.u + '" target="_blank" rel="noopener">' + s.t + '</a></li>'; }).join('') + '</ul><button class="cap" data-close>Cerrar</button>';
  }
  function more(html) { return html ? '<details class="more"><summary>Ver más</summary><div class="body">' + html + '</div></details>' : ''; }
  function nextBtn() { return cur < SLIDES.length - 1 ? '<button class="btn primary" data-go="' + (cur + 1) + '">' + NAMES[cur + 1] + ' →</button>' : ''; }
  function introCards() {
    return ['<p class="label">Argentina · 2012–2026</p><h1>Foco Cero</h1>' +
      '<p>' + EVENTS.length + ' incendios y <b>' + fmt(D.meta.total_focos) + '</b> focos de calor detectados por satélite en Argentina, 2012–2026.</p>' +
      '<p class="hint">Scrolleá para recorrer los años ↓</p><div class="row">' + nextBtn() + '</div>'];
  }
  function eventCards(ev, n) {
    var alt = ALT[ev.id], unit = ev.hero.unit.charAt(0).toUpperCase() + ev.hero.unit.slice(1);
    return [
      '<p class="label">' + n + '/' + EVENTS.length + ' · Cómo empezó</p><h2>' + ev.title + '</h2>' +
        '<blockquote class="quote"><p>' + ev.cause.text + '</p><footer>' + ev.region + ' · ' + ev.when + '</footer></blockquote>' +
        more(factList(ev, 0)),
      '<p class="label">El fuego</p><div class="big"><b id="heronum">0</b><span>' + ev.hero.unit + '</span></div>' +
        '<p class="sub">' + unit + ' ' + ev.hero.label + ' Según ' + ev.hero.src + '.</p>' +
        (alt ? '<div class="chips">' + alt.map(function (a) { return '<span><b>' + a[0] + '</b> · ' + a[1] + '</span>'; }).join('') + '</div>' : '') +
        more('<p>' + ev.hero.note + '</p>' + factList(ev, 1)),
      '<p class="label">Cómo se combatió</p><p>' + ev.response + '</p>' +
        '<figure class="chart">' + monthSVG(ev) + '<figcaption>Focos de calor por mes en ' + ev.months.prov.join(' + ') + ', ' + ev.months.year + '. Satélite VIIRS; no son hectáreas.</figcaption></figure>' +
        more('<p>' + meansText(ev.means || { crew: 3 }) + '</p>' + factList(ev, 2)) +
        '<div class="row"><button class="btn" data-src>Fuentes</button>' + nextBtn() + '</div>'
    ];
  }
  function exploreCards() {
    var opts = function (sel) { return YEARS.map(function (y) { return '<option' + (y === sel ? ' selected' : '') + '>' + y + '</option>'; }).join(''); };
    var C0 = state.cmp || { a: 2019, b: 2020, view: 'd' };
    return ['<p class="label">Explorar</p><h2>Los datos, a tu manera</h2>' +
      '<div class="tabs" role="tablist" aria-label="Modo"><button role="tab" id="tab1" aria-selected="' + !state.cmp + '">Un año</button><button role="tab" id="tab2" aria-selected="' + !!state.cmp + '">Comparar dos años</button></div>' +
      '<div class="ctrls">' +
        '<div id="mode1"' + (state.cmp ? ' hidden' : '') + '><div class="player"><button id="pp" aria-label="Reproducir los años">▶</button><input id="yr" type="range" min="' + YEARS[0] + '" max="' + YEARS[YEARS.length - 1] + '" step="1" value="' + state.year + '" aria-label="Año"><output id="yro">' + state.year + '</output></div></div>' +
        '<div id="mode2"' + (state.cmp ? '' : ' hidden') + '><label>Año A <select id="ca">' + opts(C0.a) + '</select></label><label>Año B <select id="cb">' + opts(C0.b) + '</select></label>' +
          '<label>Mapa <select id="cv"><option value="d"' + (C0.view === 'd' ? ' selected' : '') + '>Diferencia B − A</option><option value="a"' + (C0.view === 'a' ? ' selected' : '') + '>Año A</option><option value="b"' + (C0.view === 'b' ? ' selected' : '') + '>Año B</option></select></label></div>' +
        '<label>Provincia <select id="fp"><option value="">Todo el país</option>' + PROVS.slice().sort().map(function (p) { return '<option' + (p === state.prov ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></label>' +
        '<label>Mes o trimestre <select id="fm">' + MONTH_OPTS.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === state.m ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
      '</div><p class="reading" id="reading" aria-live="polite"></p><p class="warn" id="cwarn"></p><div class="scrollbox" id="explore"></div>'];
  }
  function methodCards() {
    return ['<p class="label">Cómo se hizo</p><h2>Datos, método y límites</h2><ul class="bul">' +
      '<li><b>Datos.</b> Focos de calor VIIRS (NASA FIRMS), 20/01/2012 a 14/10/2026.</li>' +
      '<li><b>Método.</b> Por provincia, en celdas de 0,25° por año y de 0,05° por semana en cada incendio.</li>' +
      '<li><b>Límites.</b> Un foco no es una hectárea quemada. 2012 y 2026 están incompletos.</li>' +
      '<li><b>Fuentes.</b> Cifras y causas de informes oficiales y prensa, citados en cada capítulo.</li>' +
      '<li><b>Herramientas.</b> Código escrito con asistencia de IA y supervisión humana; ningún dibujo generado por IA.</li>' +
      '<li><b>Licencias.</b> <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener">NASA FIRMS</a> (abiertos) y <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (dominio público).</li></ul>'];
  }
  var activeCard = -1;
  function setActiveCard() {
    var ends = CARD_ENDS[SLIDES[cur].type], i = 0;
    while (i < ends.length - 1 && P >= ends[i]) i++;
    if (i === activeCard) return;
    activeCard = i;
    Array.prototype.forEach.call(document.querySelectorAll('#cards .card'), function (c, k) {
      var on = k === i; c.classList.toggle('on', on); c.setAttribute('aria-hidden', String(!on)); c.inert = !on; // hidden cards take no focus
      if (on) { var h = c.querySelector('.label'); $('#announce').textContent = NAMES[cur] + ': ' + (h ? h.textContent : ''); }
    });
  }

  /* ---------- popovers (sources panel, about the data) ---------- */
  var opener = null;
  function openPop(id, html) {
    closePops();
    var el = $('#' + id); if (html) el.innerHTML = html;
    opener = document.activeElement; el.hidden = false;
    var b = el.querySelector('button,a'); if (b) b.focus();
  }
  function closePops() {
    var any = false;
    ['about', 'srcpanel'].forEach(function (id) { var el = $('#' + id); if (!el.hidden) { el.hidden = true; any = true; } });
    if (any && opener && opener.focus) opener.focus();
    opener = null;
  }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-close]')) { closePops(); return; }
    if (t.closest('#caveat,#info')) { openPop('about'); return; }
    if (t.closest('[data-src]')) { var ev = SLIDES[cur].ev; openPop('srcpanel', sourcesHTML(ev.region, ev.sources)); return; }
    var g = t.closest('[data-go]'); if (g) { closePops(); show(+g.getAttribute('data-go')); return; }
    if (!t.closest('.pop')) closePops();
  });

  /* ---------- tooltip and province selection ---------- */
  var tip = $('#tip');
  function deg(v, pos, neg) { return Math.abs(v).toFixed(2).replace('.', ',') + '° ' + (v < 0 ? neg : pos); }
  function hitTest(x, y) {
    var bx = cam.x + (x - W / 2) / cam.z, by = cam.y + (y - H / 2) / cam.z, pr = null;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (var i = 0; i < paths.length; i++) if (ctx.isPointInPath(paths[i].p, bx, by)) { pr = paths[i]; break; }
    var lon = LON0 + bx / K, lat = LAT1 - by, gx = Math.floor(lon / STEP), gy = Math.floor(lat / STEP);
    return { prov: pr, n: cellIdx[gx + ',' + gy] || 0, clon: gx * STEP + STEP / 2, clat: gy * STEP + STEP / 2 };
  }
  function periodLabel() { return state.all ? '2012–2026' : String(state.year); }
  function showTip(h, x, y) {
    if (SLIDES[cur].type === 'event' || (!h.prov && !h.n)) { tip.hidden = true; return; }
    var C = cmpActive(), where = 'Celda de 0,25° (unos 25 km) en ' + deg(h.clat, 'N', 'S') + ', ' + deg(h.clon, 'E', 'O');
    var t = h.prov ? '<b>' + h.prov.name + '</b>' : '<b>Fuera del territorio argentino</b>';
    if (C) {
      var v = h.n || { a: 0, b: 0 }, d = v.b - v.a;
      if (h.prov) t += '<span>' + fmt(provYear(h.prov.name, C.a)) + ' focos en ' + C.a + ' · ' + fmt(provYear(h.prov.name, C.b)) + ' en ' + C.b + '</span>';
      t += '<span class="cell">' + where + ': <b>' + fmt(v.a) + '</b> en ' + C.a + ', <b>' + fmt(v.b) + '</b> en ' + C.b + ' (' + (d > 0 ? '+' : d < 0 ? '−' : '') + fmt(Math.abs(d)) + ')</span>';
    } else {
      if (h.prov && !state.all) t += '<span>' + fmt(provYear(h.prov.name, state.year)) + ' focos en ' + state.year + '</span>';
      t += '<span class="cell">' + where + ': <b>' + fmt(h.n) + '</b> ' + (h.n === 1 ? 'foco' : 'focos') + ' (' + periodLabel() + ')</span>';
    }
    if (h.prov && cur !== METHOD) t += '<span class="hint">Click para analizar la provincia</span>';
    tip.innerHTML = t; tip.hidden = false;
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(6, Math.min(W - tw - 6, x + 14)) + 'px'; tip.style.top = Math.max(6, y - th - 12) + 'px';
  }
  function setHover(pr) { if ((state.hover && state.hover.name) === (pr && pr.name)) return; state.hover = pr; requestFrame(); }
  cv.addEventListener('mousemove', function (e) {
    if (SLIDES[cur].type === 'event') return;
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, h = hitTest(x, y);
    showTip(h, x, y); setHover(h.prov); cv.style.cursor = h.prov ? 'pointer' : 'default';
  });
  cv.addEventListener('mouseleave', function () { tip.hidden = true; setHover(null); });
  cv.addEventListener('click', function (e) {
    if (SLIDES[cur].type === 'event') return;
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, h = hitTest(x, y);
    showTip(h, x, y);
    if (h.prov) selectProv(h.prov.name);
  });
  function cmpActive() { return cur === EXPLORE && state.cmp; }
  function selectProv(name) {
    state.prov = name || null;
    if (cur !== EXPLORE) { show(EXPLORE); return; }
    state.hi = state.prov ? [state.prov] : []; var fp = $('#fp'); if (fp) fp.value = state.prov || '';
    renderExplore(); syncURL(); requestFrame();
  }
  function syncURL() {
    var h = '#' + cur;
    if (cur === EXPLORE) {
      h += '&y=' + state.year; if (state.prov) h += '&p=' + encodeURIComponent(state.prov);
      if (state.m !== '0') h += '&m=' + state.m; if (state.cmp) h += '&c=' + state.cmp.a + '-' + state.cmp.b + '-' + state.cmp.view;
    }
    try { history.replaceState(null, '', h); } catch (e) { }
  }

  /* ---------- exploration ---------- */
  function monthRange() { var m = state.m; if (m === '0') return [1, 12]; if (m.charAt(0) === 'q') { var q = +m.charAt(1); return [q * 3 - 2, q * 3]; } return [+m, +m]; }
  function rangeLabel() { var o = MONTH_OPTS.filter(function (x) { return x[0] === state.m; })[0]; return o[1].toLowerCase(); }
  function areaSum(p, y, f, t) { return p ? provRange(p, y, f, t) : PROVS.reduce(function (s, n) { return s + provRange(n, y, f, t); }, 0); }
  function pct(a, b) { return b ? (a / b * 100).toFixed(1).replace('.', ',') : '0'; }
  function renderExplore() {
    var el = $('#explore'); if (!el) return;
    var y = state.year, r = monthRange(), p = state.prov, where = p || 'el país', out = '', reading = '';
    if (state.cmp) {
      var A = state.cmp.a, B = state.cmp.b, cm = commonMonths(A, B), f = Math.max(r[0], cm[0]), t = Math.min(r[1], cm[1]);
      if (f > t) { reading = 'El período elegido no tiene meses completos en común entre ' + A + ' y ' + B + '.'; }
      else {
        var a = areaSum(p, A, f, t), b = areaSum(p, B, f, t), d = a ? Math.round((b - a) / a * 100) : null;
        reading = 'En ' + where + ' (' + (f === 1 && t === 12 ? 'año completo' : MESES[f - 1] + '–' + MESES[t - 1]) + '): <b>' + fmt(a) + '</b> focos en ' + A + ' y <b>' + fmt(b) + '</b> en ' + B + (d === null ? '.' : ' (' + (d > 0 ? '+' : d < 0 ? '−' : '') + fmt(Math.abs(d)) + ' %).');
        var rows = PROVS.map(function (n) { var x = provRange(n, A, f, t), z = provRange(n, B, f, t); return { n: n, a: x, b: z, d: z - x }; }).sort(function (u, v) { return v.d - u.d; });
        out = '<table class="cmpt"><thead><tr><th scope="col">Provincia</th><th scope="col">' + A + '</th><th scope="col">' + B + '</th><th scope="col">Cambio</th></tr></thead><tbody>' +
          rows.map(function (q) { return '<tr' + (q.n === p ? ' class="on"' : '') + '><th scope="row"><button data-p="' + q.n + '">' + q.n + '</button></th><td>' + fmt(q.a) + '</td><td>' + fmt(q.b) + '</td><td class="' + (q.d > 0 ? 'up' : q.d < 0 ? 'down' : '') + '">' + (q.d > 0 ? '+' : q.d < 0 ? '−' : '') + fmt(Math.abs(q.d)) + '</td></tr>'; }).join('') + '</tbody></table>';
      }
      $('#cwarn').textContent = partialNote(A, B);
    } else {
      var tot = areaSum(p, y, 1, 12), part = areaSum(p, y, r[0], r[1]);
      if (state.m === '0') {
        if (p) { var rk = ranking(y), pos = 0; rk.forEach(function (q, i) { if (q.n === p) pos = i + 1; }); reading = 'En ' + y + ', ' + p + ' registró <b>' + fmt(tot) + '</b> focos: el <b>' + pct(tot, totalYear(y)) + ' %</b> del país, puesto ' + pos + ' de ' + PROVS.length + '.'; }
        else reading = 'En ' + y + ' se detectaron <b>' + fmt(tot) + '</b> focos de calor en el país.';
      } else reading = 'En ' + y + ', ' + rangeLabel() + ' concentró el <b>' + pct(part, tot) + ' %</b> de los focos de ' + where + ' (' + fmt(part) + ' de ' + fmt(tot) + ').';
      if (y === 2026) reading += ' 2026 llega hasta el 14/10.';
      if (p) out = '<div class="pcard">' + provYearsSVG(p) + '<p class="sub">Focos por año en ' + p + '. Click en una barra para elegir el año.</p></div>';
      else {
        var list = PROVS.map(function (n) { return { n: n, v: provRange(n, y, r[0], r[1]) }; }).sort(function (u, v) { return v.v - u.v; }), mx = list[0].v || 1;
        out = '<ol class="rank">' + list.map(function (q, i) { return '<li><button data-p="' + q.n + '"><span class="rn">' + (i + 1) + '</span><span class="rl">' + q.n + '</span><span class="rb"><i style="width:' + (q.v / mx * 100).toFixed(1) + '%"></i></span><span class="rv">' + fmt(q.v) + '</span></button></li>'; }).join('') + '</ol>';
      }
      $('#cwarn').textContent = '';
    }
    $('#reading').innerHTML = reading; el.innerHTML = out;
    el.onclick = function (e) {
      var b = e.target.closest && e.target.closest('button[data-p]'); if (b) { selectProv(b.getAttribute('data-p') === state.prov ? null : b.getAttribute('data-p')); return; }
      var yy = e.target.getAttribute && e.target.getAttribute('data-y'); if (yy) { stopPlay(); setYear(+yy); }
    };
  }
  function setCompare(c) {
    stopPlay(); state.cmp = c;
    if (c) state.year = c.b;
    var on = !!c;
    $('#mode1').hidden = on; $('#mode2').hidden = !on;
    $('#tab1').setAttribute('aria-selected', String(!on)); $('#tab2').setAttribute('aria-selected', String(on));
    rebuildCells(); renderFoot(); renderExplore(); syncURL(); requestFrame();
    var yr = $('#yr'); if (yr) yr.value = state.year;
  }
  function bindExplore() {
    var cmpFromUI = function () { return { a: +$('#ca').value, b: +$('#cb').value, view: $('#cv').value }; };
    $('#tab1').onclick = function () { setCompare(null); };
    $('#tab2').onclick = function () { setCompare(cmpFromUI()); };
    $('#ca').onchange = $('#cb').onchange = $('#cv').onchange = function () { setCompare(cmpFromUI()); };
    $('#fp').onchange = function () { selectProv(this.value); };
    $('#fm').onchange = function () { state.m = this.value; renderExplore(); renderFoot(); syncURL(); };
  }
  function setYear(y) {
    state.year = y; state.all = false; rebuildCells(); renderFoot();
    var yr = $('#yr'); if (yr) yr.value = y; var yo = $('#yro'); if (yo) yo.textContent = y;
    if (cur === EXPLORE) { renderExplore(); syncURL(); }
    requestFrame();
  }
  function startPlay() {
    playing = true; var b = $('#pp'); if (b) b.textContent = '❚❚';
    if (state.year >= YEARS[YEARS.length - 1]) setYear(YEARS[0]);
    timer = setInterval(function () { if (paused || document.hidden) return; if (state.year >= YEARS[YEARS.length - 1]) { stopPlay(); return; } setYear(state.year + 1); }, 1100);
  }
  function stopPlay() { playing = false; clearInterval(timer); var b = $('#pp'); if (b) b.textContent = '▶'; }
  function bindPlayer() {
    var yr = $('#yr'), pp = $('#pp');
    if (yr) yr.oninput = function (e) { stopPlay(); setYear(+e.target.value); };
    if (pp) pp.onclick = function () { playing ? stopPlay() : startPlay(); };
  }

  /* ---------- stage foot: one line under the map ---------- */
  function renderFoot() {
    var sl = SLIDES[cur], f = $('#foot'), key = '<span class="key"><span>pocos focos</span><span class="ramp"></span><span>muchos</span></span><br>';
    if (sl.type === 'event') return; // updated per frame
    if (sl.type === 'intro') {
      f.innerHTML = '<div class="player" style="margin-bottom:8px"><button id="pp" aria-label="Reproducir los años">▶</button><input id="yr" type="range" min="' + YEARS[0] + '" max="' + YEARS[YEARS.length - 1] + '" step="1" value="' + state.year + '" aria-label="Año"><output id="yro">' + state.year + '</output></div>' +
        key + 'Focos de calor en <b>' + state.year + '</b>: ' + fmt(totalYear(state.year)) + (state.year === 2026 ? ' (hasta el 14/10)' : '') + (state.year === 2012 ? ' (desde el 20/01)' : '') + ' · celdas de unos 25 km';
      bindPlayer();
    } else if (sl.type === 'method') f.innerHTML = key + 'Todos los focos de calor, <b>2012–2026</b>';
    else if (cmpActive()) f.innerHTML = (state.cmp.view === 'd' ? '<span class="key"><span>menos en ' + state.cmp.b + '</span><span class="ramp div"></span><span>más en ' + state.cmp.b + '</span></span><br>Diferencia celda por celda, ' + state.cmp.b + ' − ' + state.cmp.a + '. No se pintan diferencias de menos de ' + DIFF_MIN + ' focos.' : key + 'Focos de ' + (state.cmp.view === 'a' ? state.cmp.a : state.cmp.b) + ', misma escala para los dos años') + (state.m !== '0' ? ' El mapa muestra el año completo.' : '');
    else f.innerHTML = key + 'Focos de calor en <b>' + state.year + '</b> · celdas de unos 25 km' + (state.m !== '0' ? ' · el mapa muestra el año completo; el filtro de mes se aplica a las cifras' : '');
  }

  /* ---------- navigation ---------- */
  function renderNav() {
    $('#railList').innerHTML = SLIDES.map(function (s, i) {
      return '<li><button data-go="' + i + '" aria-label="' + (i + 1) + '. ' + NAMES[i] + '"' + (i === cur ? ' class="on" aria-current="page"' : '') + '><span class="dot"></span><span class="lab">' + NAMES[i] + '</span></button></li>';
    }).join('');
    var sl = SLIDES[cur];
    $('#chip').textContent = sl.type === 'event' ? sl.ev.region + ' · ' + sl.ev.year : NAMES[cur];
    $('#mname').textContent = (cur + 1) + '/' + SLIDES.length + ' · ' + NAMES[cur];
    $('#prev').disabled = cur === 0; $('#next').disabled = cur === SLIDES.length - 1;
  }
  $('#prev').onclick = function () { show(cur - 1); };
  $('#next').onclick = function () { show(cur + 1); };
  $('#pause').onclick = function () {
    paused = !paused; this.setAttribute('aria-pressed', String(paused)); this.textContent = paused ? 'Reanudar animación' : 'Pausar animación';
    this.setAttribute('aria-label', paused ? 'Reanudar animación' : 'Pausar animación');
    if (paused) stopPlay();
    requestFrame();
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closePops(); return; }
    var t = e.target;
    if (t && /INPUT|SELECT|TEXTAREA/.test(t.tagName)) return;
    if (!$('#about').hidden || !$('#srcpanel').hidden) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); show(cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(cur - 1); }
  });
  var tx = null, ty = 0;
  document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  document.addEventListener('touchend', function (e) {
    if (tx === null) return; var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; tx = null;
    if (Math.abs(dx) > 80 && Math.abs(dx) > 2 * Math.abs(dy)) show(cur + (dx < 0 ? 1 : -1));
  }, { passive: true });

  /* ---------- chapter switch ---------- */
  function show(i) {
    var first = !W;
    cur = clamp(i, 0, SLIDES.length - 1); stopPlay(); closePops();
    var sl = SLIDES[cur];
    document.body.setAttribute('data-kind', sl.type);
    if (!first) resize(); // the stage height depends on the chapter on narrow screens
    state.hover = null; tip.hidden = true;
    state.all = sl.type === 'method';
    if (sl.type === 'event') { state.year = sl.ev.year; state.hi = sl.ev.provs; loadFoci(sl.ev); }
    else state.hi = cur === EXPLORE && state.prov ? [state.prov] : [];
    var cards = sl.type === 'intro' ? introCards() : sl.type === 'event' ? eventCards(sl.ev, cur) : sl.type === 'explore' ? exploreCards() : methodCards();
    $('#cards').innerHTML = cards.map(function (h, k) { return '<section class="card glass" aria-hidden="true" inert data-k="' + k + '">' + h + '</section>'; }).join('');
    activeCard = -1;
    scn = null; $('#scenewrap').innerHTML = ''; $('#scenewrap').style.opacity = '0'; $('#figure').hidden = true; $('#foot').innerHTML = '';
    if (sl.type === 'event') { $('#scenewrap').innerHTML = '<div class="scenebox">' + mountScene(sl.ev) + '</div>'; scn.mount($('#scenewrap svg.scene')); }
    $('#spacer').style.height = (100 + RANGE[sl.type] * 100) + 'vh';
    window.scrollTo(0, 0); P = 0;
    $('#cue').hidden = !(sl.type === 'intro' || sl.type === 'event');
    $('#cue span').textContent = sl.type === 'intro' ? 'Scrolleá para empezar' : 'Seguí bajando: el fuego avanza';
    rebuildCells(); renderFoot(); renderNav();
    if (sl.type === 'explore') { bindPlayer(); bindExplore(); renderExplore(); }
    syncURL();
    if (!first) flyTo(targetCam());
    requestFrame();
  }
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    P = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    requestFrame();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  function resize() {
    var r = cv.getBoundingClientRect(); dpr = window.devicePixelRatio || 1;
    W = Math.max(10, r.width); H = Math.max(10, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    flyTo(targetCam(), true);
  }
  window.addEventListener('resize', function () { resize(); onScroll(); });
  if (MOBILE.addEventListener) MOBILE.addEventListener('change', resize);

  show(isNaN(URLP.slide) ? 0 : URLP.slide);
  resize();
  requestAnimationFrame(function () { resize(); requestFrame(); var l = $('#loading'); l.classList.add('done'); setTimeout(function () { l.hidden = true; }, 400); });
})();
