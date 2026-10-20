// Copied verbatim from legacy/app.js (checked by scripts/test-events.mjs).
export const EVENTS: any[] = [
  {
    id: 'cordoba', region: 'Córdoba', when: 'Mayo a noviembre de 2020', year: 2020,
    provs: ['Córdoba'], marker: [-64.55, -32.15], title: 'Las sierras de Córdoba',
    hero: { value: 316150, unit: 'hectáreas', label: 'quemadas entre el 16 de mayo y el 22 de noviembre de 2020 (aprox.).', src: 'Secretaría de Ambiente de Córdoba',
      note: 'El informe oficial registra 316.150 ha y cita además un registro acumulado de 321.688 ha, sin detallar el origen de la diferencia de unas 5.500 ha.' },
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
    response: 'Un avión hidrante del Plan Nacional y más de 200 personas combatieron el fuego e hicieron guardia de cenizas.', means: { crew: 4, plane: 1 },
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
      ['Iberá', 'buena parte de los focos activos afectó al Macrosistema del Iberá (1,3 millones de hectáreas), según National Geographic.']
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
    cause: { kind: 'intencional', text: 'El gobierno provincial y la Fiscalía confirmaron que el foco inicial fue intencional. La nota no reporta imputados.' },
    response: 'Más de 500 personas, aviones hidrantes y helicópteros. Las lluvias de la cordillera no superaron los 8 mm y no frenaron el avance.', means: { crew: 5, plane: 1, heli: 1 },
    months: { prov: ['Chubut'], year: 2026, from: 1, to: 10 },
    sources: [
      { t: 'Infobae: un mes de los incendios en Chubut', u: 'https://www.infobae.com/sociedad/2026/02/05/un-mes-de-los-incendios-en-chubut-la-cronologia-de-la-catastrofe-ambiental-que-ya-arraso-con-mas-de-50-mil-hectareas/' },
      { t: 'Diario de Cuyo: confirmaron que el fuego fue intencional', u: 'https://www.diariodecuyo.com.ar/argentina/incendios-en-chubut-confirmaron-que-el-fuego-fue-intencional-y-hay-cientos-de-evacuados-1817717.html' }
    ]
  }
];
