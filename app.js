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
        ['20 %', 'de lo quemado fueron rastrojos de maíz y soja.']
      ],
      cause: { kind: 'sequia', text: 'El informe oficial no da porcentajes por causa. Señala baja humedad, heladas, vientos y mucho combustible seco, y menciona "el factor antrópico, como la imprudencia y la negligencia".' },
      response: 'Brigadistas y bomberos en tierra. Las lluvias recién llegaron en octubre y los incendios se prolongaron hasta mediados de noviembre.',
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
      response: 'Las islas son de difícil acceso: el combate depende de brigadistas con embarcaciones y medios aéreos.',
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
      response: 'Un avión hidrante y más de 200 personas. La lluvia ayudó a controlar el fuego.',
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
        ['100 %', 'de la herpetofauna (reptiles y anfibios) perdida en el Parque San Cayetano en los incendios de 2020, según el investigador Kowalewski.']
      ],
      cause: { kind: 'sequia', text: 'Casi 24 meses de La Niña, calor y baja humedad. Especialistas citados hablan de quemas para obtener pastura fresca; la nota no cuantifica cuánto fue intencional.' },
      response: 'Gran parte de los focos activos estaba dentro de la Reserva del Iberá, un macrosistema de 1,3 millones de hectáreas.',
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
      response: 'Brigadistas del Plan Provincial de Manejo del Fuego. La provincia pidió a Nación un avión hidrante para Luján de Cuyo.',
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
        ['75 %', 'del bosque nativo de Epuyén se habría perdido, según expertos citados (Cholila Online).'],
        ['+500', 'personas desplegadas, con aviones hidrantes, anfibios y helicópteros con helibalde.'],
        ['4 provincias', 'en emergencia ígnea por DNU (30 de enero): Chubut, Neuquén, Río Negro y La Pampa.']
      ],
      cause: { kind: 'intencional', text: 'El gobernador Ignacio Torres afirmó el 6 de enero que el fuego fue intencional. La nota no informa si hay responsables identificados ni resoluciones judiciales.' },
      response: 'Más de 500 personas, aviones hidrantes y helicópteros. Las lluvias de la cordillera no superaron los 8 mm y no frenaron el avance.',
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
  var state = { year: 2020, all: false, hi: [], marker: null };
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
    cells().forEach(function (c) { var q = project(c[0], c[1]); bctx.fillStyle = colorFor(c[2], mx); bctx.fillRect(q[0] - cw / 2, q[1] - ch / 2, cw, ch); });
    bctx.lineJoin = 'round';
    paths.forEach(function (o) { if (state.hi.indexOf(o.name) < 0) { bctx.strokeStyle = 'rgba(120,84,66,.55)'; bctx.lineWidth = 0.7; bctx.stroke(o.p); } });
    paths.forEach(function (o) { if (state.hi.indexOf(o.name) >= 0) { bctx.strokeStyle = '#ff9a3c'; bctx.lineWidth = 2; bctx.shadowColor = 'rgba(255,140,40,.8)'; bctx.shadowBlur = 10; bctx.stroke(o.p); bctx.shadowBlur = 0; } });
    paint(0);
  }
  function paint(t) {
    if (!F) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(base, 0, 0);
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

  /* ---------- escena animada ---------- */
  var FLAME = '<symbol id="flame" viewBox="0 0 20 30"><path d="M10 0C12 8 19 11 19 20a9 9 0 0 1-18 0c0-6 5-8 6-14 1 2 2 3 3-6z" fill="url(#fg)"/><path d="M10 13c1 4 5 5 5 9a5 5 0 0 1-10 0c0-3 3-4 3-7 1 1 1 1 2-2z" fill="#ffe27a"/></symbol>';
  function flamesFor(kind) {
    var L = [];
    if (kind === 'intencional') {
      [[78, 236, 14, 1.2], [96, 232, 16, 1.7], [118, 228, 18, 2.2], [142, 222, 20, 2.7], [168, 218, 22, 3.1], [195, 222, 20, 3.5], [226, 220, 22, 3.9], [262, 222, 20, 4.3], [300, 224, 18, 4.7]].forEach(function (a) { L.push(a); });
    } else if (kind === 'quema') {
      for (var i = 0; i < 14; i++) L.push([40 + i * 25, 238 + (i % 2) * 6, 15 + (i % 3) * 2, 1 + i * 0.28]);
    } else {
      [[60, 196, 22, 2.4], [112, 204, 24, 2.9], [165, 192, 20, 3.3], [220, 202, 24, 2.7], [272, 194, 22, 3.6], [334, 205, 26, 3.1], [140, 232, 20, 4.0], [250, 234, 22, 4.4], [200, 236, 18, 4.8]].forEach(function (a) { L.push(a); });
    }
    return L;
  }
  function sceneSVG(kind) {
    var s = '<svg id="scene" class="scene" viewBox="0 0 400 300" role="img" aria-label="Ilustración: cómo empezó el fuego y cómo se combate"><defs>' +
      '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15102a"/><stop offset=".6" stop-color="#4a2018"/><stop offset="1" stop-color="#8a3a1c"/></linearGradient>' +
      '<linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb03a"/><stop offset=".6" stop-color="#ff5a14"/><stop offset="1" stop-color="#c8260c"/></linearGradient>' + FLAME + '</defs>';
    s += '<rect width="400" height="300" fill="url(#sky)"/>';
    if (kind === 'sequia') s += '<g class="sunbig"><circle cx="330" cy="62" r="46" fill="#ff8a2a" opacity=".16"/><circle class="core" cx="330" cy="62" r="26" fill="#ffb347"/></g>';
    else s += '<circle cx="340" cy="58" r="14" fill="#ffd9a0" opacity=".5"/>';
    s += '<path d="M0 190 Q70 150 140 178 T290 168 T400 180 V300 H0z" fill="#2a1914"/>';
    s += '<path d="M0 218 Q90 190 180 212 T400 204 V300 H0z" fill="#1c110d"/>';
    if (kind === 'quema') {
      for (var r = 0; r < 4; r++) s += '<path d="M0 ' + (236 + r * 15) + ' H400" stroke="' + (r % 2 ? '#3a2a18' : '#2e2112') + '" stroke-width="9"/>';
    }
    if (kind === 'sequia') {
      s += '<path d="M20 262 l22 -8 l14 10 l22 -6 M130 270 l18 -10 l24 8 M250 262 l24 -6 l16 10 l20 -8 M330 276 l16 -8" stroke="#0e0806" stroke-width="2" fill="none"/>';
      for (var w = 0; w < 3; w++) s += '<path class="wind" d="M' + (30 + w * 70) + ' ' + (100 + w * 22) + ' q60 -12 120 0" stroke="rgba(255,235,210,.35)" stroke-width="2.2" fill="none" stroke-linecap="round" style="animation-delay:' + (w * 0.3) + 's"/>';
    }
    [[40, 200, 1], [95, 210, 1.15], [150, 196, .9], [215, 206, 1.1], [270, 198, 1], [335, 208, 1.2], [372, 200, .85]].forEach(function (t) {
      var x = t[0], y = t[1], k = t[2];
      s += '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><rect x="-2.5" y="-14" width="5" height="16" fill="#2a1b12"/><ellipse cx="0" cy="-26" rx="13" ry="16" fill="#1f3322"/><ellipse cx="-4" cy="-30" rx="6" ry="8" fill="#2a4529" opacity=".7"/></g>';
    });
    flamesFor(kind).forEach(function (f) {
      var x = f[0], y = f[1], w = f[2], d = f[3].toFixed(1);
      s += '<g class="fl" style="--d:' + d + 's"><use class="fi" href="#flame" x="' + (x - w / 2) + '" y="' + (y - w * 1.5) + '" width="' + w + '" height="' + (w * 1.5) + '"/></g>';
    });
    [[130, 190, 2.8], [210, 185, 3.6], [280, 188, 4.4], [90, 195, 3.2]].forEach(function (c) {
      s += '<circle class="sm" cx="' + c[0] + '" cy="' + c[1] + '" r="13" fill="#9a8c86" opacity="0" style="--d:' + c[2] + 's"/>';
    });
    if (kind === 'intencional') {
      s += '<g class="lighter"><rect x="44" y="238" width="14" height="24" rx="3" fill="#b9b2ac"/><rect x="46" y="233" width="10" height="7" rx="1" fill="#6e6862"/><use class="fi" href="#flame" x="45" y="215" width="12" height="18"/></g>';
    }
    s += '<g class="crew"><g transform="translate(300 266)"><circle cx="0" cy="-17" r="4" fill="#e9b88a"/><rect x="-4" y="-13" width="8" height="14" rx="2" fill="#d9531a"/><rect x="-6" y="-17" width="12" height="3" rx="1.5" fill="#f2c230"/></g>' +
      '<g transform="translate(330 270)"><circle cx="0" cy="-17" r="4" fill="#e9b88a"/><rect x="-4" y="-13" width="8" height="14" rx="2" fill="#d9531a"/><rect x="-6" y="-17" width="12" height="3" rx="1.5" fill="#f2c230"/></g>' +
      '<path class="jet" d="M305 255 Q270 232 238 228" stroke="#7fc4ff" stroke-width="2.2" fill="none"/><path class="jet" d="M335 259 Q300 238 262 232" stroke="#7fc4ff" stroke-width="2.2" fill="none"/></g>';
    s += '<g class="heli"><g transform="translate(150 78)"><ellipse cx="0" cy="0" rx="26" ry="11" fill="#c23a1c"/><rect x="18" y="-3" width="40" height="6" rx="3" fill="#a02e16"/><rect x="54" y="-10" width="4" height="14" fill="#a02e16"/>' +
      '<path d="M-14 -8 Q-4 -12 8 -8 L8 -2 H-14z" fill="#9fd6ff" opacity=".85"/><rect x="-6" y="-17" width="4" height="7" fill="#444"/><rect class="rotor" x="-38" y="-19" width="76" height="3" rx="1.5" fill="#d8d0c8"/>' +
      '<path d="M-18 12 H18" stroke="#444" stroke-width="2"/><path d="M-6 12 L0 50 M6 12 L0 50" stroke="#555" stroke-width="1.2"/>' +
      '<path d="M-12 50 H12 L9 62 H-9z" fill="#3d86c6"/>' +
      [0, 1, 2, 3].map(function (i) { return '<circle class="drop" cx="' + (-6 + i * 4) + '" cy="64" r="2.6" fill="#7fc4ff" style="--d:' + (3.6 + i * 0.25) + 's"/>'; }).join('') +
      '</g></g>';
    return s + '</svg>';
  }
  var sceneTimer = 0;
  function playScene(ev) {
    var sv = $('#scene'); if (!sv) return;
    clearTimeout(sceneTimer);
    sv.classList.remove('go', 'p2'); void sv.getBoundingClientRect();
    var cap = $('#scenecap-text'), step = $('#scenecap-step');
    step.textContent = '1'; cap.innerHTML = '<b>Cómo empezó.</b> ' + shortCause(ev);
    if (REDUCED) { sv.classList.add('go', 'p2'); step.textContent = '2'; cap.innerHTML = '<b>Cómo se combate.</b> ' + ev.response; return; }
    sv.classList.add('go');
    sceneTimer = setTimeout(function () { sv.classList.add('p2'); step.textContent = '2'; cap.innerHTML = '<b>Cómo se combate.</b> ' + ev.response; }, 5600);
  }
  function shortCause(ev) {
    return ({ intencional: 'Un fuego provocado, según las fuentes citadas.', sequia: 'Sequía, calor y viento con el monte listo para arder.', quema: 'Una quema que se salió de control, según las fuentes citadas.' })[ev.cause.kind];
  }

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
    clearTimeout(sceneTimer);
    if (sl.type === 'intro') {
      setMap({ year: 2020, all: false, hi: [], marker: null });
      side.innerHTML = '<div class="kicker">Argentina · 2012–2026</div><h1>Argentina arde</h1>' +
        '<p class="lead">Desde 2012, un satélite de la NASA detectó <b>' + fmt(D.meta.total_focos) + ' focos de calor</b> dentro del territorio argentino. Cada punto del mapa es uno de ellos.</p>' +
        '<p>Elegí un año con el reproductor, o avanzá con <b>→</b> para ver seis incendios con sus cifras, sus causas y lo que dicen las fuentes.</p>' +
        '<h2>Focos de calor por año</h2><div class="yrbars" id="yb">' + yearBars() + '</div>' +
        '<p class="note">2020 fue el año con más focos: ' + fmt(totalYear(2020)) + '. Le sigue 2022, con ' + fmt(totalYear(2022)) + '.</p>' +
        '<ul class="facts"><li><b>1,15 M ha</b><span>quemadas en el país en 2020 (0,29 % del territorio), según National Geographic. El 57 % fue monte nativo de Córdoba y el Delta del Paraná.</span></li>' +
        '<li><b>258.794 ha</b><span>entre el 1 de enero y el 15 de febrero de 2022, según el Servicio Nacional de Manejo del Fuego: más que en todo 2021.</span></li></ul>' +
        '<p class="cav">' + CAV + '</p>' +
        sources([{ t: 'NASA FIRMS (VIIRS S-NPP)', u: 'https://firms.modaps.eosdis.nasa.gov/' }, { t: 'National Geographic: incendios en Argentina', u: 'https://www.nationalgeographicla.com/medio-ambiente/2022/02/incendios-en-argentina-las-perdidas-sus-causas-y-la-destruccion-masiva-de-biodiversidad' }]);
      sw.innerHTML = '<div class="card"><h3>Recorré los años</h3><div class="player"><button id="pp" aria-label="Reproducir">▶</button><input id="yr" type="range" min="' + YEARS[0] + '" max="' + YEARS[YEARS.length - 1] + '" step="1" value="2020" aria-label="Año"></div>' +
        '<div class="legend"><span>pocos focos</span><div class="bar"></div><span>muchos</span></div></div>' +
        '<div class="card"><h3>Cómo leer el mapa</h3><p>El color de cada celda (de unos 25 km) crece con la cantidad de focos de calor detectados en el año. El norte y el litoral se encienden todos los años: hay muchas quemas agrícolas y de pastizal.</p><p>Los números de cada incendio vienen de reportes oficiales y notas periodísticas, y no del satélite.</p></div>';
      $('#yr').oninput = function (e) { stopPlay(); setYear(+e.target.value); };
      $('#pp').onclick = function () { playing ? stopPlay() : startPlay(); };
      $('#yb').onclick = function (e) { var y = e.target.getAttribute && e.target.getAttribute('data-y'); if (y) { stopPlay(); setYear(+y); } };
    } else if (sl.type === 'event') {
      var ev = sl.ev, n = cur;
      setMap({ year: ev.year, all: false, hi: ev.provs, marker: ev.marker });
      side.innerHTML = '<div class="kicker">' + n + ' de ' + EVENTS.length + ' · ' + ev.region + ' · ' + ev.when + '</div><h1>' + ev.title + '</h1>' +
        '<div class="hero"><span class="num" id="heronum">0</span><span class="unit">' + ev.hero.unit + '</span></div>' +
        '<p class="herolabel">' + ev.hero.label + '<span class="src">Fuente: ' + ev.hero.src + '</span></p>' +
        '<p class="note">' + ev.hero.note + '</p>' +
        '<ul class="facts">' + ev.facts.map(function (f) { return '<li><b>' + f[0] + '</b><span>' + f[1] + '</span></li>'; }).join('') + '</ul>' +
        '<div class="cause"><h3>Cómo empezó, según las fuentes</h3><p>' + ev.cause.text + '</p></div>' +
        monthChart(ev) + '<p class="cav">' + CAV + ' El gráfico de barras es del satélite; las cifras de arriba son de las fuentes citadas.</p>' + sources(ev.sources);
      count($('#heronum'), ev.hero.value);
      sw.innerHTML = '<div class="scenebox">' + sceneSVG(ev.cause.kind) + '</div><div class="scenecap"><span class="step" id="scenecap-step">1</span><span id="scenecap-text"></span><button id="replay">Repetir</button></div>' +
        '<p class="cav" style="margin:0">Ilustración esquemática de cómo suele empezar y combatirse un incendio de este tipo; no reproduce el lugar ni los hechos exactos.</p>';
      $('#replay').onclick = function () { playScene(ev); };
      playScene(ev);
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
    side.scrollTop = 0; renderNav(); try { history.replaceState(null, '', '#' + cur); } catch (e) { }
  }
  function setYear(y) {
    state.year = y; state.all = false; drawBase(); badge();
    var yr = $('#yr'); if (yr) yr.value = y; var yb = $('#yb'); if (yb) yb.innerHTML = yearBars();
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
  window.addEventListener('resize', function () { resize(); startLoop(); });

  resize();
  var h = parseInt((location.hash || '').slice(1), 10);
  show(isNaN(h) ? 0 : h);
  // el layout puede terminar de acomodarse después del primer render
  requestAnimationFrame(function () { resize(); startLoop(); });
})();
