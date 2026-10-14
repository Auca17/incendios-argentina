/* Argentina arde — focos de calor 2012–2026
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

  var SLIDES = [{ type: 'intro' }].concat(EVENTS.map(function (e) { return { type: 'event', ev: e }; })).concat([{ type: 'method' }]);

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

  /* ---------- mapa ---------- */
  var LON0 = -73.8, LON1 = -53.4, LAT0 = -55.3, LAT1 = -21.6, K = Math.cos(38 * Math.PI / 180);
  var cv = $('#map'), ctx = cv.getContext('2d');
  var base = document.createElement('canvas'), bctx = base.getContext('2d');
  var state = { year: URLP.y || 2020, all: false, hi: [], marker: null, prov: URLP.p, hover: null };
  var cellIdx = {};
  var geo = D.prov.features, paths = [], F = null, dpr = 1;

  function project(lon, lat) { return [F.ox + (lon - LON0) * K * F.s, F.oy + (LAT1 - lat) * F.s]; }
  function resize() {
    var r = cv.getBoundingClientRect(); dpr = window.devicePixelRatio || 1;
    var w = Math.max(10, r.width), h = Math.max(10, r.height);
    cv.width = base.width = Math.round(w * dpr); cv.height = base.height = Math.round(h * dpr);
    var W = (LON1 - LON0) * K, H = LAT1 - LAT0, s = Math.min(w / W, h / H) * 0.96;
    F = { s: s, ox: (w - W * s) / 2, oy: (h - H * s) / 2, w: w, h: h };
    paths = geo.map(function (f) {
      var p = new Path2D(), g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      polys.forEach(function (poly) { poly.forEach(function (ring) { ring.forEach(function (pt, i) { var q = project(pt[0], pt[1]); if (i) p.lineTo(q[0], q[1]); else p.moveTo(q[0], q[1]); }); p.closePath(); }); });
      return { name: f.properties.name, p: p };
    });
    drawBase();
  }
  function cells() { return state.all ? allCells() : (D.grid.anios[String(state.year)] || []); }
  function drawBase() {
    if (!F) return;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0); bctx.clearRect(0, 0, F.w, F.h);
    paths.forEach(function (o) { bctx.fillStyle = state.hi.indexOf(o.name) >= 0 ? '#2b1a12' : '#1a120e'; bctx.fill(o.p); });
    var cw = STEP * K * F.s + 0.7, ch = STEP * F.s + 0.7, mx = state.all ? maxAll : maxN;
    cellIdx = {}; cells().forEach(function (c) { cellIdx[Math.floor(c[0] / STEP) + ',' + Math.floor(c[1] / STEP)] = c[2]; });
    cells().forEach(function (c) { var q = project(c[0], c[1]); bctx.fillStyle = colorFor(c[2], mx); bctx.fillRect(q[0] - cw / 2, q[1] - ch / 2, cw, ch); });
    bctx.lineJoin = 'round';
    paths.forEach(function (o) { if (state.hi.indexOf(o.name) < 0) { bctx.strokeStyle = 'rgba(120,84,66,.55)'; bctx.lineWidth = 0.7; bctx.stroke(o.p); } });
    paths.forEach(function (o) { if (state.hi.indexOf(o.name) >= 0) { bctx.strokeStyle = '#ff9a3c'; bctx.lineWidth = 2; bctx.shadowColor = 'rgba(255,140,40,.8)'; bctx.shadowBlur = 10; bctx.stroke(o.p); bctx.shadowBlur = 0; } });
    paint(0);
  }
  function paint(t) {
    if (!F) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(base, 0, 0);
    if (state.hover && state.hi.indexOf(state.hover.name) < 0) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.strokeStyle = '#ffd9a0'; ctx.lineWidth = 1.5; ctx.stroke(state.hover.p); }
    if (state.marker) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var q = project(state.marker[0], state.marker[1]), ph = (t % 1600) / 1600;
      ctx.beginPath(); ctx.arc(q[0], q[1], 6 + ph * 26, 0, 7); ctx.strokeStyle = 'rgba(255,200,90,' + (0.8 * (1 - ph)).toFixed(2) + ')'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, 7); ctx.fillStyle = '#fff2c4'; ctx.fill();
      ctx.beginPath(); ctx.arc(q[0], q[1], 9, 0, 7); ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  var raf = 0;
  function loop(t) { paint(t); raf = requestAnimationFrame(loop); }
  function startLoop() { cancelAnimationFrame(raf); if (state.marker && !REDUCED) raf = requestAnimationFrame(loop); else paint(0); }
  function setMap(o) { for (var k in o) state[k] = o[k]; drawBase(); startLoop(); badge(); }
  function badge() {
    var el = $('#yearbadge');
    if (state.all) { el.innerHTML = '2012–2026<small>focos acumulados</small>'; return; }
    el.innerHTML = state.year + '<small>' + fmt(totalYear(state.year)) + ' focos de calor' + (state.year === 2026 ? ' (hasta el 14/10)' : '') + (state.year === 2012 ? ' (desde el 20/01)' : '') + '</small>';
  }

  /* ---------- exploración sobre el mapa ---------- */
  var tip = $('#tip');
  function deg(v, pos, neg) { return Math.abs(v).toFixed(2).replace('.', ',') + '° ' + (v < 0 ? neg : pos); }
  function hitTest(x, y) {
    if (!F) return {};
    var lon = LON0 + (x - F.ox) / (K * F.s), lat = LAT1 - (y - F.oy) / F.s, pr = null;
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i = 0; i < paths.length; i++) if (bctx.isPointInPath(paths[i].p, x * dpr, y * dpr)) { pr = paths[i]; break; }
    var gx = Math.floor(lon / STEP), gy = Math.floor(lat / STEP);
    return { prov: pr, n: cellIdx[gx + ',' + gy] || 0, clon: gx * STEP + STEP / 2, clat: gy * STEP + STEP / 2 };
  }
  function periodLabel() { return state.all ? '2012–2026' : String(state.year); }
  function showTip(h, x, y) {
    if (!h.prov && !h.n) { tip.hidden = true; return; }
    var t = h.prov ? '<b>' + h.prov.name + '</b>' + (state.all ? '' : '<span>' + fmt(provYear(h.prov.name, state.year)) + ' focos en ' + state.year + '</span>') : '<b>Fuera del territorio argentino</b>';
    t += '<span class="cell">Celda de 0,25° (unos 25 km) en ' + deg(h.clat, 'N', 'S') + ', ' + deg(h.clon, 'E', 'O') + ': <b>' + fmt(h.n) + '</b> ' + (h.n === 1 ? 'foco' : 'focos') + ' (' + periodLabel() + ')</span>';
    if (h.prov) t += '<span class="hint">Click para analizar la provincia</span>';
    tip.innerHTML = t; tip.hidden = false;
    var W = cv.clientWidth, tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = Math.max(6, Math.min(W - tw - 6, x + 14)) + 'px'; tip.style.top = Math.max(6, y - th - 12) + 'px';
  }
  function setHover(pr) { if ((state.hover && state.hover.name) === (pr && pr.name)) return; state.hover = pr; paint(performance.now()); }
  cv.addEventListener('mousemove', function (e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, h = hitTest(x, y);
    showTip(h, x, y); setHover(h.prov); cv.style.cursor = h.prov ? 'pointer' : 'default';
  });
  cv.addEventListener('mouseleave', function () { tip.hidden = true; setHover(null); });
  cv.addEventListener('click', function (e) {
    var r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, h = hitTest(x, y);
    showTip(h, x, y);
    if (h.prov) selectProv(h.prov.name);
  });
  function selectProv(name) {
    state.prov = name;
    if (cur !== 0) { show(0); return; }
    setMap({ hi: name ? [name] : [] }); renderExplore(); syncURL();
  }
  function syncURL() {
    var h = '#' + cur;
    if (cur === 0) { h += '&y=' + state.year; if (state.prov) h += '&p=' + encodeURIComponent(state.prov); }
    try { history.replaceState(null, '', h); } catch (e) { }
  }

  /* ---------- gráficos SVG ---------- */
  function monthChart(ev) {
    var s = monthSeries(ev.months.prov, ev.months.year), mx = Math.max.apply(null, s) || 1, w = 300, h = 96, bw = 20, gap = 4.5, out = '';
    var peak = s.indexOf(mx);
    s.forEach(function (v, i) {
      var inRange = (i + 1) >= ev.months.from && (i + 1) <= ev.months.to, bh = Math.max(1, (v / mx) * (h - 40)), x = i * (bw + gap) + 2;
      var future = ev.months.year === 2026 && i + 1 > 10;
      out += '<rect x="' + x + '" y="' + (h - 16 - bh) + '" width="' + bw + '" height="' + bh + '" rx="2" fill="' + (future ? '#2a1d17' : (i === peak ? '#ffc83d' : '#ff6a1a')) + '" opacity="' + (inRange ? 1 : 0.35) + '"><title>' + MESES_L[i] + ': ' + fmt(v) + ' focos</title></rect>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (h - 3) + '" font-size="8.5" fill="#b09d92" text-anchor="middle">' + MESES[i] + '</text>';
    });
    out += '<text x="' + (peak * (bw + gap) + 2 + bw / 2) + '" y="' + (h - 16 - (h - 40) - 4) + '" font-size="9" fill="#ffc83d" text-anchor="middle" font-weight="700">' + fmt(mx) + '</text>';
    return '<div class="chart"><h3>Focos de calor por mes · ' + ev.months.prov.join(' + ') + ' · ' + ev.months.year + '</h3><svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Focos de calor por mes">' + out + '</svg><div class="peak">Mes con más focos: <b>' + MESES_L[peak] + '</b> (' + fmt(mx) + ').</div></div>';
  }
  function yearBars() {
    var mx = Math.max.apply(null, YEARS.map(totalYear)), w = 320, h = 110, bw = 17.5, gap = 3, out = '';
    YEARS.forEach(function (y, i) {
      var v = totalYear(y), bh = (v / mx) * (h - 30), x = i * (bw + gap) + 2, on = (y === state.year && !state.all);
      out += '<rect data-y="' + y + '" x="' + x + '" y="' + (h - 18 - bh) + '" width="' + bw + '" height="' + bh + '" rx="2" fill="' + (on ? '#ffc83d' : '#ff6a1a') + '" opacity="' + (on ? 1 : 0.55) + '"><title>' + y + ': ' + fmt(v) + ' focos</title></rect>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (h - 5) + '" font-size="7.5" fill="#b09d92" text-anchor="middle">' + String(y).slice(2) + '</text>';
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Focos de calor por año">' + out + '</svg>';
  }

  function provYearsSVG(p) {
    var vals = YEARS.map(function (y) { return provYear(p, y); }), mx = Math.max.apply(null, vals) || 1, w = 320, h = 104, bw = 17.5, gap = 3, out = '';
    YEARS.forEach(function (y, i) {
      var v = vals[i], bh = Math.max(1, (v / mx) * (h - 34)), x = i * (bw + gap) + 2, on = y === state.year;
      out += '<rect data-y="' + y + '" x="' + x + '" y="' + (h - 18 - bh) + '" width="' + bw + '" height="' + bh + '" rx="2" fill="' + (on ? '#ffc83d' : '#ff6a1a') + '" opacity="' + (on ? 1 : 0.55) + '"><title>' + y + ': ' + fmt(v) + ' focos</title></rect>';
      out += '<text x="' + (x + bw / 2) + '" y="' + (h - 5) + '" font-size="7.5" fill="#b09d92" text-anchor="middle">' + String(y).slice(2) + '</text>';
    });
    var pk = vals.indexOf(mx);
    out += '<text x="' + (pk * (bw + gap) + 2 + bw / 2) + '" y="' + (h - 18 - (h - 34) - 4) + '" font-size="8.5" fill="#ffc83d" text-anchor="middle" font-weight="700">' + fmt(mx) + '</text>';
    return '<svg class="pyears" viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Focos de calor por año en ' + p + '">' + out + '</svg>';
  }
  function provSeasonSVG(p, y) {
    var o = D.pm[p] || {}, avg = [], sel = [];
    for (var m = 1; m <= 12; m++) {
      var s = 0; FULL.forEach(function (yy) { s += o[mkey(yy, m)] || 0; }); avg.push(s / FULL.length);
      sel.push(y === 2026 && m > 10 ? null : (o[mkey(y, m)] || 0));
    }
    var mx = Math.max.apply(null, avg.concat(sel.map(function (v) { return v || 0; }))) || 1, w = 320, h = 104, gw = 25, out = '';
    for (var i = 0; i < 12; i++) {
      var x = i * (gw + 1.5) + 2, ha = Math.max(1, avg[i] / mx * (h - 30)), hs = sel[i] === null ? 0 : Math.max(1, sel[i] / mx * (h - 30));
      out += '<rect x="' + x + '" y="' + (h - 16 - ha) + '" width="11" height="' + ha + '" rx="1.5" fill="#8a6a58"><title>' + MESES_L[i] + ', promedio ' + FULL[0] + '–' + FULL[FULL.length - 1] + ': ' + fmt(avg[i]) + ' focos</title></rect>';
      if (sel[i] !== null) out += '<rect x="' + (x + 12) + '" y="' + (h - 16 - hs) + '" width="11" height="' + hs + '" rx="1.5" fill="#ff6a1a"><title>' + MESES_L[i] + ' ' + y + ': ' + fmt(sel[i]) + ' focos</title></rect>';
      out += '<text x="' + (x + 11.5) + '" y="' + (h - 4) + '" font-size="8" fill="#b09d92" text-anchor="middle">' + MESES[i] + '</text>';
    }
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="Estacionalidad mensual en ' + p + '">' + out + '</svg>' +
      '<div class="legend2"><span><i style="background:#8a6a58"></i>promedio ' + FULL[0] + '–' + FULL[FULL.length - 1] + '</span><span><i style="background:#ff6a1a"></i>' + y + (y === 2026 ? ' (hasta el 14/10)' : '') + '</span></div>';
  }
  function renderExplore() {
    var el = $('#explore'); if (!el) return;
    var y = state.year, rk = ranking(y), tot = totalYear(y), out = '';
    if (state.prov) {
      var p = state.prov, pos = 0; rk.forEach(function (r, i) { if (r.n === p) pos = i + 1; });
      var v = provYear(p, y);
      out += '<div class="card pcard"><div class="phead"><h3>' + p + '</h3><button class="x" id="pclose" aria-label="Quitar la selección de provincia">×</button></div>' +
        '<p class="pkpi"><b>' + fmt(v) + '</b> focos en ' + y + (y === 2026 ? ' (hasta el 14/10)' : '') + ' · puesto <b>' + pos + '</b> de ' + PROVS.length + ' · ' + (tot ? (v / tot * 100).toFixed(1).replace('.', ',') : '0') + ' % del país</p>' +
        '<h4>Serie anual (click en un año para verlo en el mapa)</h4><div class="pyrs" id="pyrs">' + provYearsSVG(p) + '</div>' +
        '<h4>Estacionalidad: focos por mes</h4>' + provSeasonSVG(p, y) + '</div>';
    }
    var mx = rk[0].v || 1;
    out += '<div class="card"><h3>Ranking de provincias · ' + y + '</h3><ol class="rank">' + rk.map(function (r, i) {
      return '<li><button data-p="' + r.n + '"' + (r.n === state.prov ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '><span class="rn">' + (i + 1) + '</span><span class="rl">' + r.n + '</span><span class="rb"><i style="width:' + (r.v / mx * 100).toFixed(1) + '%"></i></span><span class="rv">' + fmt(r.v) + '</span></button></li>';
    }).join('') + '</ol></div>';
    el.innerHTML = out;
    var pc = $('#pclose'); if (pc) pc.onclick = function () { selectProv(null); };
    var py = $('#pyrs'); if (py) py.onclick = function (e) { var yy = e.target.getAttribute && e.target.getAttribute('data-y'); if (yy) { stopPlay(); setYear(+yy); } };
    el.querySelector('.rank').onclick = function (e) { var b = e.target.closest && e.target.closest('button[data-p]'); if (b) selectProv(b.getAttribute('data-p') === state.prov ? null : b.getAttribute('data-p')); };
  }

  /* ---------- escena guiada por scroll ---------- */
  var MOBILE = window.matchMedia('(max-width: 900px)');
  var STAGE_NAMES = ['Cómo empezó', 'Fuego', 'Combate'];
  var scn = null, scnEv = null, scnStage = -1, scnRaf = 0;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function shortCause(ev) {
    return ({ intencional: 'Un fuego provocado, según las fuentes citadas.', sequia: 'Sequía, calor y viento con el monte listo para arder.', quema: 'Una quema que se salió de control, según las fuentes citadas.' })[ev.cause.kind];
  }
  function meansText(m) {
    var L = [];
    if (m.plane) L.push('avión hidrante');
    if (m.heli) L.push('helicóptero con helibalde');
    L.push('brigadistas con mangueras');
    return 'En la ilustración: ' + L.join(', ') + (m.plane || m.heli ? ', tal como mencionan las fuentes.' : ' genéricos; no se dibujan medios aéreos porque la fuente no los menciona.');
  }
  function stageCaption(ev, st) {
    if (st === 0) return '<b>Cómo empezó.</b> ' + shortCause(ev);
    if (st === 1) return '<b>El fuego en su punto máximo.</b> ' + fmt(ev.hero.value) + ' ' + ev.hero.unit + ', según ' + ev.hero.src + '.';
    return '<b>Cómo se combatió.</b> ' + ev.response;
  }
  /* reading progress p (0..1) of the left column, or of the page on mobile */
  function readProgress() {
    var el = MOBILE.matches ? null : $('#side');
    var top = el ? el.scrollTop : window.scrollY, vh = el ? el.clientHeight : window.innerHeight;
    var max = (el ? el.scrollHeight : document.documentElement.scrollHeight) - vh;
    var off = el ? el.getBoundingClientRect().top : 0, line = MOBILE.matches ? 0.62 : 0.4;
    function at(sel) { var n = $(sel); return n ? clamp((n.getBoundingClientRect().top - off + top - line * vh) / (max || 1), 0, 1) : null; }
    var a = at('#st-loss'), b = at('#st-fight');
    if (a === null || b === null || !(a > 0 && b > a && b < 1)) { a = 0.3; b = 0.55; }
    return { p: max > 0 ? clamp(top / max, 0, 1) : 0, a: a, b: b };
  }
  /* piecewise map so each scene stage lines up with its text section */
  function toScene(r) {
    var S1 = FireScene.S_FIRE, S2 = FireScene.S_FIGHT;
    if (r.p <= r.a) return S1 * r.p / r.a;
    if (r.p <= r.b) return S1 + (S2 - S1) * (r.p - r.a) / (r.b - r.a);
    return S2 + (1 - S2) * (r.p - r.b) / (1 - r.b);
  }
  function renderScene() {
    scnRaf = 0;
    if (!scn) return;
    var s = toScene(readProgress()), st = s < FireScene.S_FIRE ? 0 : s < FireScene.S_FIGHT ? 1 : 2;
    if (REDUCED) s = [0.2, 0.46, 0.92][st];
    scn.update(s);
    if (st !== scnStage) {
      scnStage = st;
      $('#scenecap-step').textContent = st + 1;
      $('#scenecap-text').innerHTML = stageCaption(scnEv, st);
      Array.prototype.forEach.call(document.querySelectorAll('#stages [data-st]'), function (n) {
        var k = +n.getAttribute('data-st'); n.classList.toggle('on', k === st); n.classList.toggle('done', k < st);
        if (k === st) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
      });
    }
  }
  function scheduleScene() { if (scn && !scnRaf) scnRaf = requestAnimationFrame(renderScene); }
  function mountScene(ev) {
    scnEv = ev; scnStage = -1;
    scn = FireScene.create({ kind: ev.cause.kind, means: ev.means || { crew: 3 }, hectares: ev.hero.value, unit: ev.hero.unit === 'hectáreas' ? 'ha' : ev.hero.unit,
      aria: 'Ilustración esquemática: cómo empezó, cómo creció y cómo se combatió el incendio de ' + ev.region });
    return scn.html;
  }
  $('#side').addEventListener('scroll', scheduleScene, { passive: true });
  window.addEventListener('scroll', scheduleScene, { passive: true });

  /* ---------- render de diapositivas ---------- */
  var cur = 0, timer = 0, playing = false;
  function count(el, v) {
    if (REDUCED) { el.textContent = fmt(v); return; }
    var t0 = performance.now(), dur = 1300;
    (function tick(t) { var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(v * e); if (p < 1) requestAnimationFrame(tick); })(t0);
  }
  function sources(list) {
    return '<details class="sources"><summary>Fuentes de esta pantalla</summary><ul class="plain">' + list.map(function (s) { return '<li><a href="' + s.u + '" target="_blank" rel="noopener">' + s.t + '</a></li>'; }).join('') + '</ul></details>';
  }
  function show(i) {
    cur = Math.max(0, Math.min(SLIDES.length - 1, i)); stopPlay();
    var sl = SLIDES[cur], side = $('#side'), sw = $('#scenewrap');
    scn = null; cancelAnimationFrame(scnRaf); scnRaf = 0;
    document.body.classList.toggle('ev', sl.type === 'event');
    if (sl.type === 'intro') {
      setMap({ year: state.year, all: false, hi: state.prov ? [state.prov] : [], marker: null });
      side.innerHTML = '<div class="kicker">Argentina · 2012–2026</div><h1>Argentina arde</h1>' +
        '<p class="lead">Desde 2012, un satélite de la NASA detectó <b>' + fmt(D.meta.total_focos) + ' focos de calor</b> dentro del territorio argentino. Cada punto del mapa es uno de ellos.</p>' +
        '<p>Elegí un año con el reproductor, o avanzá con <b>→</b> para ver seis incendios con sus cifras, sus causas y lo que dicen las fuentes.</p>' +
        '<h2>Focos de calor por año</h2><div class="yrbars" id="yb">' + yearBars() + '</div>' +
        '<p class="note">2020 fue el año con más focos: ' + fmt(totalYear(2020)) + '. Le sigue 2022, con ' + fmt(totalYear(2022)) + '.</p>' +
        '<ul class="facts"><li><b>1,15 M ha</b><span>quemadas en el país en 2020 (0,29 % del territorio), según National Geographic. El 57 % fue monte nativo de Córdoba y el Delta del Paraná.</span></li>' +
        '<li><b>258.794 ha</b><span>entre el 1 de enero y el 15 de febrero de 2022, según el Servicio Nacional de Manejo del Fuego: más que en todo 2021.</span></li></ul>' +
        '<p class="cav">' + CAV + '</p>' +
        sources([{ t: 'NASA FIRMS (VIIRS S-NPP)', u: 'https://firms.modaps.eosdis.nasa.gov/' }, { t: 'National Geographic: incendios en Argentina', u: 'https://www.nationalgeographicla.com/medio-ambiente/2022/02/incendios-en-argentina-las-perdidas-sus-causas-y-la-destruccion-masiva-de-biodiversidad' }]);
      sw.innerHTML = '<div class="card"><h3>Recorré los años</h3><div class="player"><button id="pp" aria-label="Reproducir">▶</button><input id="yr" type="range" min="' + YEARS[0] + '" max="' + YEARS[YEARS.length - 1] + '" step="1" value="' + state.year + '" aria-label="Año"></div>' +
        '<div class="legend"><span>pocos focos</span><div class="bar"></div><span>muchos</span></div></div>' +
        '<div id="explore"></div>' +
        '<div class="card"><h3>Cómo leer el mapa</h3><p>Pasá el cursor por el mapa para ver los focos de cada celda, y hacé click en una provincia (o en el ranking) para ver su serie anual y su estacionalidad.</p><p>El color de cada celda (de unos 25 km) crece con la cantidad de focos de calor detectados en el año. El norte y el litoral se encienden todos los años: hay muchas quemas agrícolas y de pastizal.</p><p>Los números de cada incendio vienen de reportes oficiales y notas periodísticas, y no del satélite.</p></div>';
      $('#yr').oninput = function (e) { stopPlay(); setYear(+e.target.value); };
      $('#pp').onclick = function () { playing ? stopPlay() : startPlay(); };
      renderExplore();
      $('#yb').onclick = function (e) { var y = e.target.getAttribute && e.target.getAttribute('data-y'); if (y) { stopPlay(); setYear(+y); } };
    } else if (sl.type === 'event') {
      var ev = sl.ev, n = cur;
      setMap({ year: ev.year, all: false, hi: ev.provs, marker: ev.marker });
      side.innerHTML = '<div class="stages" id="stages" aria-label="Etapas de la ilustración">' +
          STAGE_NAMES.map(function (t, i) { return (i ? '<i aria-hidden="true">→</i>' : '') + '<span data-st="' + i + '">' + (i + 1) + ' ' + t + '</span>'; }).join('') + '</div>' +
        '<section class="st" id="st-what"><div class="kicker">' + n + ' de ' + EVENTS.length + ' · ' + ev.region + ' · ' + ev.when + '</div><h1>' + ev.title + '</h1>' +
          '<div class="hero"><span class="num" id="heronum">0</span><span class="unit">' + ev.hero.unit + '</span></div>' +
          '<p class="herolabel">' + ev.hero.label + '<span class="src">Fuente: ' + ev.hero.src + '</span></p>' +
          '<p class="note">' + ev.hero.note + '</p><p class="scrollhint" aria-hidden="true">Bajá para ver cómo empezó, cómo creció y cómo se combatió ↓</p></section>' +
        '<section class="st" id="st-cause"><h2>Cómo empezó</h2><div class="cause"><h3>Según las fuentes</h3><p>' + ev.cause.text + '</p></div></section>' +
        '<section class="st" id="st-loss"><h2>Cuánto se perdió</h2><ul class="facts">' + ev.facts.map(function (f) { return '<li><b>' + f[0] + '</b><span>' + f[1] + '</span></li>'; }).join('') + '</ul></section>' +
        '<section class="st" id="st-fight"><h2>Cómo se combatió</h2><p class="lead">' + ev.response + '</p><p class="note">' + meansText(ev.means || { crew: 3 }) + '</p></section>' +
        '<section class="st" id="st-sat"><h2>Lo que muestra el satélite</h2>' + monthChart(ev) + '<p class="cav">' + CAV + ' El gráfico de barras es del satélite; las cifras de arriba son de las fuentes citadas.</p></section>' +
        '<section class="st st-last" id="st-src"><h2>Fuentes</h2><ul class="plain">' + ev.sources.map(function (s) { return '<li><a href="' + s.u + '" target="_blank" rel="noopener">' + s.t + '</a></li>'; }).join('') + '</ul></section>';
      count($('#heronum'), ev.hero.value);
      sw.innerHTML = '<div class="scenebox">' + mountScene(ev) + '</div><div class="scenecap" aria-live="polite"><span class="step" id="scenecap-step">1</span><span id="scenecap-text"></span></div>' +
        '<p class="cav scenecav">Ilustración esquemática de cómo suele empezar y combatirse un incendio de este tipo; no reproduce el lugar ni los hechos exactos.</p>';
      scn.mount($('#scenewrap svg.scene'));
    } else {
      setMap({ all: true, hi: [], marker: null });
      side.innerHTML = '<div class="kicker">Cómo se hizo</div><h1>Datos, límites y advertencias</h1>' +
        '<h2>Qué mide el mapa</h2><p>Focos de calor detectados por el sensor VIIRS del satélite Suomi NPP (NASA FIRMS, archivo estándar más datos en tiempo casi real), del 20 de enero de 2012 al 14 de octubre de 2026. Se descartaron los puntos de baja confianza y los que no son fuego de vegetación. Se asignó cada punto a su provincia y se agrupó en celdas de 0,25°.</p>' +
        '<h2>Qué no mide</h2><ul class="plain"><li>No son hectáreas quemadas.</li><li>Incluyen quemas agrícolas, de pastizal y de rastrojo, que son muchas en el norte y el litoral.</li><li>Un satélite pasa pocas veces por día: puede perderse fuegos cortos o tapados por nubes.</li></ul>' +
        '<h2>De dónde salen las cifras</h2><p>Las hectáreas, causas y consecuencias de cada incendio vienen de informes oficiales y notas periodísticas citadas en cada pantalla. Cuando dos fuentes difieren, se muestran las dos. Cuando una causa no está confirmada, se dice quién la afirma.</p>' +
        '<h2>Mapa base</h2><p>Límites provinciales de Natural Earth (dominio público), simplificados.</p>' +
        '<h2>Código y datos</h2><p>Toda la visualización es una página estática, sin servidores. El código está en el repositorio <a style="color:#ffb070" href="https://github.com/Auca17/incendios-argentina" target="_blank" rel="noopener">Auca17/incendios-argentina</a>.</p>' +
        sources([{ t: 'NASA FIRMS', u: 'https://firms.modaps.eosdis.nasa.gov/' }, { t: 'Natural Earth', u: 'https://www.naturalearthdata.com/' }]);
      sw.innerHTML = '<div class="card"><h3>Todos los años juntos</h3><p>Así se ve la suma de los focos de calor de 2012 a 2026. El cinturón del norte y el litoral concentra la mayor parte.</p><div class="legend"><span>pocos focos</span><div class="bar"></div><span>muchos</span></div></div>' +
        '<div class="card"><h3>Para volver a empezar</h3><p>Usá <b>←</b> o los puntos de abajo para volver al recorrido.</p></div>';
    }
    side.scrollTop = 0; if (MOBILE.matches) window.scrollTo(0, 0); renderNav(); renderScene(); syncURL(); tip.hidden = true;
  }
  function setYear(y) {
    state.year = y; state.all = false; drawBase(); badge();
    var yr = $('#yr'); if (yr) yr.value = y; var yb = $('#yb'); if (yb) yb.innerHTML = yearBars();
    renderExplore(); syncURL();
  }
  function startPlay() {
    playing = true; var b = $('#pp'); if (b) b.textContent = '❚❚';
    if (state.year >= YEARS[YEARS.length - 1]) setYear(YEARS[0]);
    timer = setInterval(function () { if (state.year >= YEARS[YEARS.length - 1]) { stopPlay(); return; } setYear(state.year + 1); }, 1100);
  }
  function stopPlay() { playing = false; clearInterval(timer); var b = $('#pp'); if (b) b.textContent = '▶'; }
  function renderNav() {
    $('#prev').disabled = cur === 0; $('#next').disabled = cur === SLIDES.length - 1;
    $('#dots').innerHTML = SLIDES.map(function (s, i) { return '<i class="' + (i === cur ? 'on' : '') + '" data-i="' + i + '" title="' + (i === 0 ? 'Inicio' : i === SLIDES.length - 1 ? 'Cómo se hizo' : SLIDES[i].ev.region) + '"></i>'; }).join('');
  }
  $('#dots').onclick = function (e) { var i = e.target.getAttribute('data-i'); if (i !== null) show(+i); };
  $('#prev').onclick = function () { show(cur - 1); };
  $('#next').onclick = function () { show(cur + 1); };
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.key !== 'Escape') { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') e.target.blur(); else return; }
    if (e.key === 'ArrowRight' || e.key === 'PageDown') show(cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') show(cur - 1);
  });
  var tx = null;
  document.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', function (e) { if (tx === null) return; var dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 80) show(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
  window.addEventListener('resize', function () { resize(); startLoop(); scheduleScene(); });

  resize();
  show(isNaN(URLP.slide) ? 0 : URLP.slide);
  // el layout puede terminar de acomodarse después del primer render
  requestAnimationFrame(function () { resize(); startLoop(); });
})();
