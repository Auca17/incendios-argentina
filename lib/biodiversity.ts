/**
 * Verified ecological and biodiversity impact data for each of the 6 major fire events.
 * Sourced from official environment ministries, INTA, CONICET researchers, and documented press archives.
 */

export interface BioImpact {
  biome: string;
  flora: string;
  fauna: string;
  highlight: string;
  source: string;
}

export const BIODIVERSITY_DATA: Record<string, BioImpact> = {
  cordoba: {
    biome: 'Bosque Chaqueño Serrano (297.638 ha)',
    flora: 'Espinillares, algarrobos blancos y negros, chañares y pastizales de altura.',
    fauna: 'Rey del bosque, pecarí de collar, gato montés y anfibios serranos.',
    highlight: 'Pérdida de la cubierta vegetal protectora de las cuencas hídricas que abastecen a la provincia.',
    source: 'Informe Incendios 2020, Secretaría de Ambiente de Córdoba',
  },
  delta: {
    biome: 'Humedales y albardones del Delta del Paraná',
    flora: 'Bosques de sauce criollo, aliso de río, pajonales de cortadera y vegetación palustre.',
    fauna: 'Mortandad masiva y asfixia en coipos, carpinchos, yacarés overos, tortugas y aves acuáticas.',
    highlight: 'Destrucción de la esponja natural del humedal, alterando la retención hídrica y purificación biológica.',
    source: 'Museo de Cs. Naturales P. Scasso / Taller Ecologista',
  },
  misiones: {
    biome: 'Selva Paranaense / Reserva de Biosfera Yabotí',
    flora: 'Árboles centenarios (lapacho, guatambú, cedro misionero) quemados por dentro y palmitos nativos.',
    fauna: 'Yaguareté, tapir amazónico, ocelote y aves selváticas de dosel protegidas.',
    highlight: 'Estragos directos en uno de los últimos corredores continuos de selva atlántica del planeta.',
    source: 'Ministerio de Ecología de Misiones / Guardaparques Yabotí',
  },
  corrientes: {
    biome: 'Macrosistema y Esteros del Iberá (275.000 ha de bañados)',
    flora: 'Palmares de caranday, pastizales inundables y embalsados flotantes calcinados por la sequía.',
    fauna: 'Pérdida del 100 % de la herpetofauna (anfibios y reptiles) en zonas testigo; ciervos de los pantanos y carpinchos acorralados.',
    highlight: 'Quiebre de los corredores biológicos de mayor riqueza faunística de la cuenca del Plata.',
    source: 'INTA Corrientes / Dr. Martin Kowalewski (CONICET)',
  },
  mendoza: {
    biome: 'Piedemonte árido xerófilo de la Precordillera',
    flora: 'Matorrales de jarilla crespa y hembra, retamos, algarrobillos y cactáceas endémicas (cardones).',
    fauna: 'Zorros grises, maras, águilas coronadas y lagartijas de arena precordilleranas sin refugio.',
    highlight: 'Pérdida de fijación del suelo, multiplicando el riesgo de aluviones ante tormentas de verano.',
    source: 'Plan Provincial de Manejo del Fuego Mendoza',
  },
  chubut: {
    biome: 'Bosque Andino Patagónico y Parque Nacional Los Alerces',
    flora: '75 % del bosque nativo arrasado en Epuyén; coihues, lengas, cipreses y alerces milenarios.',
    fauna: 'Hábitat crítico del huemul (monumento natural en peligro crítico), pudú y monito de monte.',
    highlight: 'Pérdida de ejemplares con siglos de crecimiento cuya regeneración biológica demandará generaciones.',
    source: 'Gobierno de Chubut / Dirección Provincial de Bosques',
  },
};

export function getBioImpact(id: string): BioImpact | null {
  return BIODIVERSITY_DATA[id] || null;
}
