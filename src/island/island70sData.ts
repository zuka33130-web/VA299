/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ISLA 01 — ISLA DEL ORIGEN (ESTILO GAME BOY COLOR)
 * Mapa continuo interconectado organizado alrededor de LAS CINCO GRANDES ZONAS:
 *   1. El Pueblo del Origen (corazón de la isla, casas, carteles, guardado e historia)
 *   2. Las Praderas del Pixel (hierba, flores, arroyos, rutas alternas y acceso a Pong)
 *   3. El Bosque de los Secretos (senderos bifurcados, árboles que ocultan pasos y taller)
 *   4. La Fortaleza Volcánica (montaña, roca basáltica, lava pixel-art y Space Invaders)
 *   5. La Costa y las Ruinas del Tiempo (playas, muelles, cuevas, túneles y secreto origen)
 *
 * Conserva el 100% de los IDs y coordenadas de progresión existentes para compatibilidad total.
 */

export const ISLAND_WORLD_W = 5200;
export const ISLAND_WORLD_TOP = -1200;
export const ISLAND_WORLD_H = 4200;
export const GBC_TILE_SIZE = 16;

export type GbcBiomeType = 'village' | 'meadow' | 'forest' | 'volcanic' | 'coast';

export type IslandZoneId =
  | 'costa-despertar'
  | 'bosque-circuitos'
  | 'ruinas-primer-arcade'
  | 'santuario-pong'
  | 'garganta-invasor'
  | 'fortaleza-oleadas'
  | 'cavernas-codigo'
  | 'cumbre-arquitecto'
  | 'cumbre-septentrional'
  | 'puerto-islas-perdidas'
  | 'faro-reinicio';

export interface WalkableRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zoneId: IslandZoneId;
  surface:
    | 'sand'
    | 'grass'
    | 'circuit'
    | 'stone'
    | 'crystal'
    | 'bridge'
    | 'fortress'
    | 'pier'
    | 'cobble'
    | 'secret-grass';
  requiresCondition?: 'south-shortcut' | 'garganta-bridge';
}

export interface IslandZoneMeta {
  id: IslandZoneId;
  numberLabel: string;
  macroRegionTitle: string;
  name: string;
  subtitle: string;
  biome: GbcBiomeType;
  accentHex: string;
  ambientTint: string;
  mapCenter: { x: number; y: number };
}

export interface IslandNpcSpec {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  palette: { primary: string; secondary: string; glow: string };
  pitch: number;
  linesInitial: string[];
  linesAfterPong?: string[];
  linesAfterInvaders?: string[];
}

export interface IslandEchoSpec {
  id: string;
  year: number;
  title: string;
  pioneer: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  accentHex: string;
  motif: 'oscilloscope' | 'pdp1-star' | 'rocket-cabinet';
  loreText: string;
  gameplayHint: string;
}

export interface IslandDiamondSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  requiresSwitchId?: string;
  requiresShortcut?: boolean;
}

export interface IslandSwitchSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  zoneId: IslandZoneId;
  accentHex: string;
  descriptionOnActivate: string;
}

export interface DistantDecadeVistaSpec {
  id: string;
  decadeLabel: string;
  title: string;
  x: number;
  y: number;
  accentHex: string;
  statusText: string;
  unlockRequirement: string;
  lorePreview: string;
}

export const ISLAND_ZONES: Record<IslandZoneId, IslandZoneMeta> = {
  'costa-despertar': {
    id: 'costa-despertar',
    numberLabel: 'SECTOR 01 · ALDEA DE LOS ORÍGENES',
    macroRegionTitle: 'LA ALDEA DE LOS ORÍGENES',
    name: 'La Aldea de los Orígenes',
    subtitle: 'Asentamiento artesanal con jardines, fuente del primer píxel, mirador costero y Centro de Historia',
    biome: 'village',
    accentHex: '#38bdf8',
    ambientTint: 'rgba(56, 189, 248, 0.03)',
    mapCenter: { x: 540, y: 2200 },
  },
  'ruinas-primer-arcade': {
    id: 'ruinas-primer-arcade',
    numberLabel: 'SECTOR 03 · PLAZA Y ARCADE CENTRAL',
    macroRegionTitle: 'PLAZA CENTRAL Y SALA ARCADE',
    name: 'Plaza Principal y Sala Arcade',
    subtitle: 'Centro neurálgico, Museo Viviente, Sala Vieja del Arcade y Castillo Kong',
    biome: 'village',
    accentHex: '#f59e0b',
    ambientTint: 'rgba(245, 158, 11, 0.035)',
    mapCenter: { x: 1860, y: 1500 },
  },
  'santuario-pong': {
    id: 'santuario-pong',
    numberLabel: 'SECTOR 04 · SANTUARIO DE PONG',
    macroRegionTitle: 'TERRAZAS DEL CLARO · PONG (1972)',
    name: 'Terrazas y Claro de Pong (1972)',
    subtitle: 'Colinas escalonadas, arroyo cristalino, flores luminiscentes y el gabinete fundacional de 1972',
    biome: 'meadow',
    accentHex: '#8cd96c',
    ambientTint: 'rgba(140, 217, 108, 0.035)',
    mapCenter: { x: 2780, y: 1680 },
  },
  'bosque-circuitos': {
    id: 'bosque-circuitos',
    numberLabel: 'SECTOR 02 · BOSQUE DE LAS SEÑALES',
    macroRegionTitle: 'EL BOSQUE DE LAS SEÑALES PERDIDAS',
    name: 'El Bosque de las Señales Perdidas',
    subtitle: 'Árboles monumentales con raíces de cobre, antenas olvidadas, senderos bifurcados y Taller TTL',
    biome: 'forest',
    accentHex: '#34d399',
    ambientTint: 'rgba(16, 85, 56, 0.06)',
    mapCenter: { x: 980, y: 1280 },
  },
  'garganta-invasor': {
    id: 'garganta-invasor',
    numberLabel: 'SECTOR 05 · CAÑÓN DE LAS ANOMALÍAS',
    macroRegionTitle: 'CAÑÓN Y UMBRAL DEL SENDERO GLITCH',
    name: 'Cañón de las Cascadas · Umbral Glitch',
    subtitle: 'Desfiladero rocoso, gruta oculta tras el agua y el Portal Anómalo de El Sendero del Glitch Perdido',
    biome: 'volcanic',
    accentHex: '#00f3ff',
    ambientTint: 'rgba(0, 243, 255, 0.04)',
    mapCenter: { x: 1880, y: 720 },
  },
  'fortaleza-oleadas': {
    id: 'fortaleza-oleadas',
    numberLabel: 'SECTOR 06 · BASTIÓN DE LAS OLEADAS',
    macroRegionTitle: 'EL BASTIÓN DE LAS OLEADAS (1978)',
    name: 'El Bastión de las Oleadas (1978)',
    subtitle: 'Ciudadela defensiva de basalto y fisuras ígneas · Hogar de Space Invaders y la plataforma estelar',
    biome: 'volcanic',
    accentHex: '#f97316',
    ambientTint: 'rgba(249, 115, 22, 0.05)',
    mapCenter: { x: 2820, y: 680 },
  },
  'cumbre-arquitecto': {
    id: 'cumbre-arquitecto',
    numberLabel: 'SECTOR 08 · MIRADORES Y CUMBRE',
    macroRegionTitle: 'LOS MIRADORES Y EL ASTROLABIO',
    name: 'Mirador Superior y Astrolabio de las Eras',
    subtitle: 'Atalaya elevada con vistas al archipiélago y sincronizador maestro de la década de 1970',
    biome: 'volcanic',
    accentHex: '#fde047',
    ambientTint: 'rgba(253, 224, 71, 0.04)',
    mapCenter: { x: 1960, y: 290 },
  },
  'cumbre-septentrional': {
    id: 'cumbre-septentrional',
    numberLabel: 'SECTOR 10 · CORDILLERA DEL PRIMER PULSO',
    macroRegionTitle: 'LA CORDILLERA DEL PRIMER PULSO',
    name: 'La Cordillera del Primer Pulso',
    subtitle: 'Terrazas boreales, archivos de cartógrafos y cavernas de resonancia bajo la nieve',
    biome: 'volcanic',
    accentHex: '#67e8f9',
    ambientTint: 'rgba(103, 232, 249, 0.045)',
    mapCenter: { x: 1952, y: -352 },
  },
  'cavernas-codigo': {
    id: 'cavernas-codigo',
    numberLabel: 'SECTOR 07 · CAVERNAS DE MEMORIA',
    macroRegionTitle: 'LAS CAVERNAS DE MEMORIA',
    name: 'Las Cavernas de Memoria',
    subtitle: 'Pasadizos subterráneos bifurcados, cristales resonantes, antiguas instalaciones y Portal Abisal',
    biome: 'coast',
    accentHex: '#c084fc',
    ambientTint: 'rgba(107, 33, 168, 0.08)',
    mapCenter: { x: 600, y: 580 },
  },
  'puerto-islas-perdidas': {
    id: 'puerto-islas-perdidas',
    numberLabel: 'SECTOR 09 · COSTA DE LAS MÁQUINAS',
    macroRegionTitle: 'LA COSTA DE LAS MÁQUINAS OLVIDADAS',
    name: 'La Costa de las Máquinas Olvidadas',
    subtitle: 'Playas con recreativas fosilizadas en la arena, muelles antiguos y el Altar del Origen',
    biome: 'coast',
    accentHex: '#38bdf8',
    ambientTint: 'rgba(36, 123, 160, 0.05)',
    mapCenter: { x: 3280, y: 1180 },
  },
  'faro-reinicio': {
    id: 'faro-reinicio',
    numberLabel: 'SECTOR 11 · FARO DEL REINICIO',
    macroRegionTitle: 'EL ACANTILADO DEL FARO',
    name: 'El Faro del Reinicio',
    subtitle:
      'Acantilado costero sellado tras la onda expansiva: la baliza que vigilaba el archipiélago, su registro de ondas y el mirador sobre el mar del tiempo',
    biome: 'coast',
    accentHex: '#7dd3fc',
    ambientTint: 'rgba(125, 211, 252, 0.05)',
    mapCenter: { x: 3968, y: 1670 },
  },
};

/**
 * Regiones caminables solapadas alineadas a múltiplos de 16 px (cuadrícula GBC).
 * Conserva todas las rutas existentes y añade pasadizos tras edificios, claros entre árboles
 * y desvíos escénicos en las praderas y acantilados costeros.
 */
export const ISLAND_WALKABLE_RECTS: WalkableRect[] = [
  // SECTOR 01: La Aldea de los Orígenes (Llegada + Cala compacta de playa y muelle)
  { id: 'costa-main', x: 224, y: 1616, w: 688, h: 432, zoneId: 'costa-despertar', surface: 'cobble' },
  { id: 'mirador-aldea-este', x: 864, y: 1808, w: 192, h: 160, zoneId: 'costa-despertar', surface: 'stone' },
  { id: 'costa-cove', x: 224, y: 1872, w: 640, h: 320, zoneId: 'costa-despertar', surface: 'sand' },
  { id: 'pueblo-back-alley', x: 528, y: 1520, w: 208, h: 112, zoneId: 'costa-despertar', surface: 'secret-grass' },
  { id: 'costa-to-bosque', x: 704, y: 1440, w: 288, h: 256, zoneId: 'costa-despertar', surface: 'grass' },

  // SECTOR 02: El Bosque de las Señales Perdidas (Senderos bifurcados + Claro oculto entre árboles)
  { id: 'bosque-main', x: 560, y: 992, w: 864, h: 528, zoneId: 'bosque-circuitos', surface: 'grass' },
  { id: 'bosque-glade', x: 752, y: 912, w: 496, h: 160, zoneId: 'bosque-circuitos', surface: 'grass' },
  { id: 'bosque-secret-grove', x: 544, y: 848, w: 224, h: 160, zoneId: 'bosque-circuitos', surface: 'secret-grass' },
  { id: 'bosque-to-ruinas', x: 1360, y: 1184, w: 224, h: 256, zoneId: 'bosque-circuitos', surface: 'cobble' },

  // Atajo desbloqueable entre la Aldea/Bosque Sur y las Ruinas del Primer Pulso
  {
    id: 'puente-atajo-sur',
    x: 864,
    y: 1632,
    w: 720,
    h: 112,
    zoneId: 'ruinas-primer-arcade',
    surface: 'bridge',
    requiresCondition: 'south-shortcut',
  },

  // SECTOR 03: Las Ruinas del Primer Pulso (Museo Viviente 70s + Archivo Pionero + Instalación de la Máquina del Tiempo)
  { id: 'ruinas-museo-esplanade', x: 1504, y: 928, w: 288, h: 176, zoneId: 'ruinas-primer-arcade', surface: 'cobble' },
  { id: 'ruinas-plaza', x: 1504, y: 1072, w: 768, h: 528, zoneId: 'ruinas-primer-arcade', surface: 'cobble' },
  { id: 'ruinas-south-terrace', x: 1504, y: 1536, w: 432, h: 192, zoneId: 'ruinas-primer-arcade', surface: 'stone' },
  { id: 'ruinas-to-pong', x: 2176, y: 1376, w: 304, h: 240, zoneId: 'ruinas-primer-arcade', surface: 'grass' },
  { id: 'ruinas-to-garganta', x: 1760, y: 832, w: 256, h: 288, zoneId: 'ruinas-primer-arcade', surface: 'stone' },

  // SECTOR 04: Terrazas y Claro de Pong (1972)
  { id: 'pong-sanctuary-main', x: 2400, y: 1440, w: 720, h: 480, zoneId: 'santuario-pong', surface: 'grass' },
  { id: 'praderas-north-meadow', x: 2464, y: 1280, w: 464, h: 192, zoneId: 'santuario-pong', surface: 'grass' },
  { id: 'pong-secret-balcony', x: 2976, y: 1712, w: 256, h: 256, zoneId: 'santuario-pong', surface: 'sand' },

  // SECTOR 07: Las Cavernas de Memoria (Galerías bifurcadas + Alcoba del Portal Abisal)
  { id: 'cavernas-main', x: 240, y: 352, w: 720, h: 448, zoneId: 'cavernas-codigo', surface: 'crystal' },
  { id: 'cavernas-east-tunnel', x: 912, y: 576, w: 464, h: 160, zoneId: 'cavernas-codigo', surface: 'crystal' },
  { id: 'moonstone-stepping-path', x: 1360, y: 580, w: 200, h: 180, zoneId: 'cavernas-codigo', surface: 'crystal' },
  { id: 'cavernas-north-alcove', x: 1216, y: 448, w: 288, h: 132, zoneId: 'cavernas-codigo', surface: 'crystal' },

  // ZONA 4: La Fortaleza Volcánica (Paso rocoso + Puente Astral + Bastión de Lava + Cumbre)
  { id: 'garganta-west-rim', x: 1520, y: 560, w: 544, h: 336, zoneId: 'garganta-invasor', surface: 'fortress' },
  { id: 'bridge-lava-straight', x: 2064, y: 640, w: 336, h: 48, zoneId: 'garganta-invasor', surface: 'bridge' },
  { id: 'fortaleza-courtyard', x: 2400, y: 432, w: 816, h: 528, zoneId: 'fortaleza-oleadas', surface: 'fortress' },
  { id: 'fortaleza-star-pad', x: 2512, y: 368, w: 352, h: 160, zoneId: 'fortaleza-oleadas', surface: 'fortress' },
  { id: 'cumbre-stairway', x: 2176, y: 272, w: 384, h: 208, zoneId: 'cumbre-arquitecto', surface: 'fortress' },
  { id: 'cumbre-sanctuary', x: 1552, y: 160, w: 800, h: 288, zoneId: 'cumbre-arquitecto', surface: 'stone' },

  // SECTOR 10: Cordillera septentrional conectada a la terraza de la Cumbre (sin desplazar el mapa existente)
  { id: 'north-spine', x: 1504, y: -560, w: 848, h: 720, zoneId: 'cumbre-septentrional', surface: 'stone' },
  { id: 'north-west-shelf', x: 1104, y: -320, w: 464, h: 352, zoneId: 'cumbre-septentrional', surface: 'grass' },
  { id: 'north-east-shelf', x: 2288, y: -288, w: 688, h: 320, zoneId: 'cumbre-septentrional', surface: 'stone' },
  { id: 'north-aurora-plateau', x: 1712, y: -800, w: 512, h: 256, zoneId: 'cumbre-septentrional', surface: 'crystal' },

  // ZONA 5: La Costa y las Ruinas del Tiempo (Playa oriental, ruinas costeras y muelle)
  { id: 'fortaleza-to-puerto', x: 2960, y: 896, w: 240, h: 224, zoneId: 'puerto-islas-perdidas', surface: 'sand' },
  { id: 'puerto-pier-main', x: 2992, y: 1056, w: 528, h: 336, zoneId: 'puerto-islas-perdidas', surface: 'pier' },
  { id: 'costa-ruinas-tiempo', x: 2992, y: 1360, w: 400, h: 240, zoneId: 'puerto-islas-perdidas', surface: 'sand' },

  // SECTOR 11: El Faro del Reinicio (acantilado tras la compuerta PRIORIDAD CERO)
  { id: 'faro-access', x: 3392, y: 1440, w: 192, h: 160, zoneId: 'faro-reinicio', surface: 'stone' },
  { id: 'faro-plateau', x: 3584, y: 1376, w: 688, h: 560, zoneId: 'faro-reinicio', surface: 'stone' },
  { id: 'faro-south-path', x: 3824, y: 1936, w: 304, h: 224, zoneId: 'faro-reinicio', surface: 'grass' },
  { id: 'faro-beacon-terrace', x: 4208, y: 1504, w: 264, h: 288, zoneId: 'faro-reinicio', surface: 'crystal' },
];

/**
 * Canal de la cala de llegada: separa la playa (sur) del asentamiento (norte).
 * El puente levadizo solo se despliega al instalar el engranaje del mecanismo.
 */
export const ORIGEN_CALA_CANAL = {
  x1: 224,
  x2: 1080,
  y1: 1872,
  y2: 1900,
  // El paso útil del puente incluye el ancho completo de la pasarela: antes
  // terminaba justo donde está el torno y el jugador quedaba frenado contra
  // el borde del canal al intentar cruzar en línea recta.
  bridgeX1: 408,
  bridgeX2: 600,
  mechanism: { x: 624, y: 1912 },
} as const;

/** Casa del viejo amigo en la cala de llegada. La puerta mira al sur. */
export const ORIGEN_FRIEND_HOUSE = {
  x: 620,
  y: 2088,
  w: 144,
  h: 88,
  doorX: 692,
  doorY: 2174,
  /** Punto exacto del umbral desde donde sale el amigo. */
  spawnX: 692,
  spawnY: 2182,
} as const;

export function isBlockedByOrigenCanal(x: number, y: number, bridgeOpen: boolean): boolean {
  if (x < ORIGEN_CALA_CANAL.x1 || x > ORIGEN_CALA_CANAL.x2) return false;
  if (y < ORIGEN_CALA_CANAL.y1 || y > ORIGEN_CALA_CANAL.y2) return false;
  if (bridgeOpen && x >= ORIGEN_CALA_CANAL.bridgeX1 && x <= ORIGEN_CALA_CANAL.bridgeX2) {
    return false;
  }
  return true;
}

/**
 * Compuerta de energía entre el Bosque de las Señales (Sector 02) y la Plaza
 * del Primer Pulso (Sector 03). La abre la palanca de seguridad del Sector 03
 * cuando el láser queda fuera de línea; reparar el generador no la mueve.
 */
export const ORIGEN_SECTOR_GATE = {
  x1: 1424,
  x2: 1466,
  y1: 1150,
  y2: 1470,
} as const;

export function isBlockedByOrigenGeneratorGate(
  x: number,
  y: number,
  gateOpen: boolean
): boolean {
  if (gateOpen) return false;
  return (
    x >= ORIGEN_SECTOR_GATE.x1 &&
    x <= ORIGEN_SECTOR_GATE.x2 &&
    y >= ORIGEN_SECTOR_GATE.y1 &&
    y <= ORIGEN_SECTOR_GATE.y2
  );
}

/**
 * Compuerta PRIORIDAD CERO del Faro del Reinicio, en el acantilado oriental de
 * la Costa de las Máquinas. La onda expansiva del Reinicio Cero partió su
 * circuito de sincronía: sólo vuelve a responder al instalar la válvula de
 * vacío que el abuelo guardaba en la radio de la cabaña de Isla Natal.
 */
export const ORIGEN_FARO_GATE = {
  x1: 3376,
  x2: 3408,
  y1: 1436,
  y2: 1612,
} as const;

export function isBlockedByOrigenFaroGate(
  x: number,
  y: number,
  gateOpen: boolean
): boolean {
  if (gateOpen) return false;
  return (
    x >= ORIGEN_FARO_GATE.x1 &&
    x <= ORIGEN_FARO_GATE.x2 &&
    y >= ORIGEN_FARO_GATE.y1 &&
    y <= ORIGEN_FARO_GATE.y2
  );
}

/** Consola exterior de la compuerta del Faro, accesible desde la costa. */
export const ORIGEN_FARO_CONSOLE = { x: 3344, y: 1528 } as const;

/** Baliza del Faro del Reinicio, en la terraza este del acantilado. */
export const ORIGEN_FARO_BEACON = { x: 4428, y: 1640 } as const;

/**
 * Lago del Bosque de las Señales. No es decorativo: corta el paso directo
 * hacia la orilla opuesta, donde quedaron los transistores de germanio del
 * Reinicio Cero. El jugador debe rodearlo por el este.
 */
export const ORIGEN_FOREST_LAKE = {
  x1: 560,
  x2: 840,
  y1: 1264,
  y2: 1424,
  islet: { x: 620, y: 1360, r: 26 },
} as const;

export function isInsideOrigenForestLake(x: number, y: number, froggerCleared = false): boolean {
  if (froggerCleared) {
    // Paso de troncos y rocas que conectan la orilla oriental con el islote central
    if (x >= 590 && x <= 850 && y >= 1340 && y <= 1380) {
      return false;
    }
  }
  return (
    x > ORIGEN_FOREST_LAKE.x1 &&
    x < ORIGEN_FOREST_LAKE.x2 &&
    y > ORIGEN_FOREST_LAKE.y1 &&
    y < ORIGEN_FOREST_LAKE.y2
  );
}

/** Consola de la palanca que corta el láser de seguridad del Sector 03. */
export const ORIGEN_LASER_CONSOLE = { x: 1398, y: 1312 } as const;

/** Restos de la instalación que el sistema láser protegía, tras la compuerta. */
export const ORIGEN_SECURITY_RUINS = { x: 1524, y: 1388 } as const;

/** Cierra el paso sur entre la fortaleza y el puerto; el ferry sigue accesible desde la costa. */
export const ISLAND_ROUTE_RAILS = [
  { id: 'fortaleza-puerto-divider', x1: 2960, y1: 960, x2: 3200, y2: 960, radius: 12 },
  
  // Barrera entre Bosque (Taller) y Zona Lunar (Cavernas)
  { id: 'forest-lunar-barrier', x1: 480, y1: 912, x2: 720, y2: 912, radius: 12 },
  
  // Barandas del Puente de Lava (Bloqueo estricto)
  { id: 'bridge-rail-straight-north', x1: 2064, y1: 640, x2: 2400, y2: 640, radius: 8 },
  { id: 'bridge-rail-straight-south', x1: 2064, y1: 688, x2: 2400, y2: 688, radius: 8 },
] as const;

export function isBlockedByIslandRouteRail(x: number, y: number): boolean {
  return ISLAND_ROUTE_RAILS.some((rail) => {
    // Proyección del punto sobre el segmento de línea (x1,y1) -> (x2,y2)
    const dx = rail.x2 - rail.x1;
    const dy = rail.y2 - rail.y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? -1 : ((x - rail.x1) * dx + (y - rail.y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = rail.x1 + t * dx;
    const projY = rail.y1 + t * dy;
    const distSq = (x - projX) ** 2 + (y - projY) ** 2;
    return distSq <= rail.radius * rail.radius;
  });
}

export const NORTH_ARCADE_LAYOUT = {
  junction: { x: 1952, y: -240 },
  arcades: {
    breakout: { x: 1856, y: -240 },
    asteroids: { x: 2048, y: -240 },
    spaceInvaders: { x: 2208, y: -240 },
    lunarLander: { x: 1696, y: -240 },
    seaWolf: { x: -5000, y: -5000 },
    tank: { x: -5000, y: -5000 },
    galaxian: { x: -5000, y: -5000 },
  },
} as const;

/** Tres gabinetes originales ubicados en el bastión volcánico, tras el puente astral. */
export const VOLCANIC_ARCADE_LAYOUT = {
  asteroids: { x: 2768, y: 568 },
  spaceInvaders: { x: 2984, y: 696 },
  breakout: { x: 2784, y: 832 },
  breakoutStone: { x: 2872, y: 832 },
  guard: { x: 2512, y: 688 },
  accessGateX: 2580,
} as const;

export const VOLCANIC_GUARD_ID = 'npc-volcanic-guard';

export function isVolcanicArcadeCabinetBlocked(x: number, y: number): boolean {
  return [
    VOLCANIC_ARCADE_LAYOUT.asteroids,
    VOLCANIC_ARCADE_LAYOUT.spaceInvaders,
    VOLCANIC_ARCADE_LAYOUT.breakout,
  ].some((cabinet) => Math.abs(x - cabinet.x) < 32 && y >= cabinet.y - 68 && y <= cabinet.y + 4);
}

export function isBlockedByVolcanicGuardGate(x: number, y: number, open: boolean): boolean {
  if (open) return false;
  const dx = x - VOLCANIC_ARCADE_LAYOUT.accessGateX;
  return dx * dx <= 12 * 12 && y >= 368 && y <= 960;
}

export function isBreakoutLegendStoneBlocked(x: number, y: number): boolean {
  return Math.abs(x - VOLCANIC_ARCADE_LAYOUT.breakoutStone.x) <= 29 &&
    y >= VOLCANIC_ARCADE_LAYOUT.breakoutStone.y - 19 &&
    y <= VOLCANIC_ARCADE_LAYOUT.breakoutStone.y + 15;
}

export function isNorthArcadeCabinetBlocked(x: number, y: number): boolean {
  return [
    NORTH_ARCADE_LAYOUT.arcades.breakout,
    NORTH_ARCADE_LAYOUT.arcades.asteroids,
    NORTH_ARCADE_LAYOUT.arcades.spaceInvaders,
    NORTH_ARCADE_LAYOUT.arcades.lunarLander,
  ].some(
    (cabinet) => cabinet && Math.abs(x - cabinet.x) < 25 && y >= cabinet.y - 66 && y <= cabinet.y + 4
  );
}

export const ISLAND_KEY_COORDS = {
  awakeningSpawn: { x: 470, y: 1830 },
  origenBeachLanding: { x: 460, y: 2060 },
  origenBridgeMechanism: { x: 568, y: 1912 },
  origenGeneratorGate: { x: 1444, y: 1312 },
  origenLaserConsole: { x: 1398, y: 1312 },
  origenSecurityRuins: { x: 1524, y: 1388 },
  origenLakeChest: { x: 620, y: 1358 },
  origenFroggerCabinet: { x: 856, y: 1344 },
  pongCabinet: { x: 2820, y: 1660 },
  pongBoardLaunch: { x: 2710, y: 1610 },
  pongBoardLanding: { x: 1760, y: 780 },
  glitchTrailPortal: { x: 1880, y: 645 },
  glitchTrailReturn: { x: 2020, y: 685 },
  invadersCabinet: VOLCANIC_ARCADE_LAYOUT.spaceInvaders,
  starShuttlePad: { x: 2680, y: 495 },
  starShuttleDisembark: { x: 2742, y: 522 },
  architectAstrolabe: { x: 1940, y: 275 },
  nightDriverTerminal: { x: 3120, y: 1100 },
  cuatroCaminosJunction: { x: 1952, y: -240 },
  castleGateNorth: { x: 1984, y: -540 },
};

export const ISLAND_NPCS: IslandNpcSpec[] = [
  {
    id: 'npc-viejo-amigo',
    name: 'Viejo Amigo · Guardián de la Cala',
    role: 'Viejo amigo del abuelo de Pixel',
    x: 532,
    y: 2088,
    zoneId: 'costa-despertar',
    palette: { primary: '#2d6a4f', secondary: '#d9b878', glow: '#8cd96c' },
    pitch: 0.7,
    linesInitial: [
      '«Ese puente se quebró con el temblor. El engranaje que mueve el torno salió despedido y quedó enterrado en la arena de esta cala.»',
      '«Tu abuelo me encomendó que te diera el Pulso Sonar. Emitilo con [F / Acción]: no gasta energía y te muestra lo que la arena esconde.»',
      '«Encontrá el engranaje, instalalo en el mecanismo de la orilla y el puente bajará solo.»',
    ],
    linesAfterPong: [
      '«La marea deja brillos en la arena cuando algo de metal queda enterrado. Emití el Pulso Sonar cerca de esos destellos.»',
      '«El engranaje del puente es lo primero. Sin él no vas a cruzar el canal hacia el asentamiento.»',
    ],
  },
  {
    id: 'npc-bit01',
    name: 'Bit-01 · Cronista de la Aldea',
    role: 'Guardián de La Aldea de los Orígenes',
    x: 618,
    y: 1768,
    zoneId: 'costa-despertar',
    palette: { primary: '#247ba0', secondary: '#f2c94c', glow: '#5cc8ff' },
    pitch: 1.08,
    linesInitial: [
      '¡Bienvenido a La Aldea de los Orígenes, Pixel! Esta isla custodia la arqueología viva de los primeros videojuegos tras la fractura causada por SUPER CUPA.',
      'Al este de nuestra fuente verás un antiguo Portal Anómalo apagado y extraños glifos tallados en piedra. Sigue el sendero norte por El Bosque de las Señales Perdidas hasta Las Ruinas del Primer Pulso: allí aguarda una misteriosa máquina dormida.',
    ],
    linesAfterPong: [
      '¡El pulso de Pong (1972) volvió a iluminar los faroles de la aldea! Dicen que esa misma frecuencia ha despertado el primer anillo de la Máquina del Tiempo en las Ruinas.',
      'Cruza ahora hacia el Cañón del Norte para afrontar El Sendero del Glitch Perdido.',
    ],
    linesAfterInvaders: [
      '¡Has restaurado los grandes hitos de los años 70! Visita el Observatorio del Cronoscopio en Las Ruinas del Primer Pulso: la Máquina del Tiempo está lista para abrir el salto hacia la década de 1980.',
    ],
  },
  {
    id: 'npc-ambar',
    name: 'Arqueóloga Ámbar',
    role: 'Investigadora de Las Ruinas del Primer Pulso',
    x: 1865,
    y: 1320,
    zoneId: 'ruinas-primer-arcade',
    palette: { primary: '#d97706', secondary: '#fef08a', glow: '#f2c94c' },
    pitch: 0.94,
    linesInitial: [
      'Estas columnas no son simples piedras: son Las Ruinas del Primer Pulso, construidas alrededor de los primeros circuitos que soñaron mundos digitales.',
      'En el edificio abovedado del noreste descubrimos «El Cronoscopio», una antigua Máquina del Tiempo inactiva. Y si sintonizas los tres Símbolos del Pulso repartidos por la Aldea, el Bosque y la Terraza Costera, reactivarás el Portal Anómalo de atajo.',
    ],
    linesAfterPong: [
      '¡El primer anillo del Cronoscopio ya gira con la señal de 1972! Sube al Cañón del Norte para estabilizar El Sendero del Glitch Perdido y busca también la Cámara Subterránea en Las Cavernas de Memoria.',
    ],
    linesAfterInvaders: [
      '¡Increíble, Pixel! Con Pong, el Sendero Glitch y Space Invaders sincronizados, entra al Observatorio del Cronoscopio al noreste de esta plaza para activar la Máquina del Tiempo y viajar a los años 80.',
    ],
  },
  {
    id: 'npc-guardabosques-nilo',
    name: 'Explorador Nilo',
    role: 'Viajero de Las Praderas del Pixel (Zona 2)',
    x: 2545,
    y: 1515,
    zoneId: 'santuario-pong',
    palette: { primary: '#4ca64c', secondary: '#f2c94c', glow: '#8cd96c' },
    pitch: 1.02,
    linesInitial: [
      '¡Qué brisa tan agradable corre por Las Praderas del Pixel! Al este de este arroyo verás el legendario gabinete amarillo de Pong (1972).',
      'Si exploras la pradera norte y la playa escondida al sureste encontrarás objetos ocultos que muchos viajeros pasan por alto.',
    ],
    linesAfterPong: [
      '¡Increíble partido! Al restaurar Pong desbloqueaste la Lámpara de Fósforo y la plataforma de vuelo hacia el norte.',
    ],
  },
  {
    id: 'npc-eco-caverna',
    name: 'Espeleólogo Cuarzo',
    role: 'Cartógrafo de Túneles Costeros (Zona 5)',
    x: 540,
    y: 565,
    zoneId: 'cavernas-codigo',
    palette: { primary: '#7b2cbf', secondary: '#5cc8ff', glow: '#c084fc' },
    pitch: 1.24,
    linesInitial: [
      'Estos túneles subterráneos conectan el subsuelo de la Costa Sur directamente con el norte de la isla. ¡Usa la boca del túnel al suroeste cuando quieras volver rápido al Pueblo!',
      'Activa también el Nodo de Cuarzo al oeste para abrir la cámara de cristal y alcanzar su Diamante de Memoria.',
    ],
  },
  {
    id: 'npc-cartografo-isla',
    name: 'Cartógrafo del Caos',
    role: 'Guardián del Paso Volcánico (Zona 4)',
    x: 1795,
    y: 675,
    zoneId: 'garganta-invasor',
    palette: { primary: '#8c2d19', secondary: '#ffba08', glow: '#f26419' },
    pitch: 0.86,
    linesInitial: [
      '¡Alto ahí, aventurero! Más allá de este cañón humeante se alza La Fortaleza Volcánica, custodiada por ríos de magma pixelado.',
      'Si quieres tender el puente hacia Space Invaders, demuestra tu habilidad cruzando mi «Sendero del Glitch Perdido»... ¡y no olvides mirar detrás de la cascada!',
    ],
    linesAfterInvaders: [
      '¡Superaste los 1.000 puntos en Space Invaders dentro de La Fortaleza Volcánica! Tu logro ha quedado grabado para siempre en la memoria de la isla.',
    ],
  },
  {
    id: 'npc-guardian-cumbre',
    name: 'Vigía del Cráter',
    role: 'Custodio del Mirador Volcánico (Zona 4)',
    x: 1775,
    y: 305,
    zoneId: 'cumbre-arquitecto',
    palette: { primary: '#d97706', secondary: '#fef08a', glow: '#ffd166' },
    pitch: 0.78,
    linesInitial: [
      'Has coronado el punto más alto sobre La Fortaleza Volcánica. Desde aquí se divisan las cinco zonas de la Isla del Origen.',
      'Desciende por el sendero oriental de la fortaleza si deseas visitar La Costa y las Ruinas del Tiempo.',
    ],
  },
  {
    id: 'npc-custodio-rodo',
    name: 'Custodio Rodo',
    role: 'Guardián de la Sala de Los Cuatro Caminos',
    x: 1910,
    y: -260,
    zoneId: 'cumbre-septentrional',
    palette: { primary: '#2563eb', secondary: '#facc15', glow: '#60a5fa' },
    pitch: 0.96,
    linesInitial: [
      '¡Atención, viajero! Esta es la legendaria Sala de Los Cuatro Caminos, pero Gran Koopa corrompió las memorias históricas y fundió los circuitos de las cuatro máquinas (Lunar Lander, Sea Wolf, Tank y Galaxian).',
      'Las pantallas están apagadas y no responden. Para devolverles la vida necesitamos al maestro de hardware retro: el técnico Dylan, en Taller RS — Retro State.',
    ],
    linesAfterPong: [
      'Si encuentras a Dylan en Taller RS, dile que los gabinetes del cruce lo necesitan desesperadamente para recuperar su energía.',
    ],
  },
  {
    id: 'npc-operadora-nora',
    name: 'Operadora Nora',
    role: 'Técnica de Frecuencias de Los Cuatro Caminos',
    x: 1990,
    y: -260,
    zoneId: 'cumbre-septentrional',
    palette: { primary: '#db2777', secondary: '#38bdf8', glow: '#f472b6' },
    pitch: 1.12,
    linesInitial: [
      'El portón norte que conduce al puente del castillo de Gran Koopa está bloqueado por cuatro sellos arcade inviolables.',
      'Solo cuando Dylan repare las máquinas con los 3 transistores de germanio de Night Driver, y derrotes los desafíos de Lunar Lander, Sea Wolf, Tank y Galaxian, el paso al castillo se abrirá.',
    ],
    linesAfterPong: [
      '¡Dylan sabe exactamente qué transistores hacen falta! Ve a verlo al Taller en el bosque.',
    ],
  },
];

export const ISLAND_ECHOES: IslandEchoSpec[] = [
  {
    id: 'echo-1958-tennis',
    year: 1958,
    title: 'Crónica del Pasado · Tennis for Two (1958)',
    pioneer: 'William Higinbotham · Laboratorio de Brookhaven',
    x: 845,
    y: 1210,
    zoneId: 'bosque-circuitos',
    accentHex: '#8cd96c',
    motif: 'oscilloscope',
    loreText:
      'Catorce años antes de Pong, un computador analógico conectado a un osciloscopio redondo mostró una pelota rebotando con gravedad sobre una red para asombro de cientos de visitantes.',
    gameplayHint:
      'Secreto del Bosque: Observa la hilera de árboles al noroeste de este claro; un sendero entre el follaje oculta un cofre antiguo.',
  },
  {
    id: 'echo-1962-spacewar',
    year: 1962,
    title: 'Crónica del Pasado · Spacewar! (1962)',
    pioneer: 'Steve Russell y colegas · Computador PDP-1',
    x: 1665,
    y: 1185,
    zoneId: 'ruinas-primer-arcade',
    accentHex: '#f2c94c',
    motif: 'pdp1-star',
    loreText:
      'Dos naves espaciales maniobrando alrededor del pozo gravitatorio de una estrella central en el monitor circular del PDP-1 encendieron la imaginación espacial de toda una generación.',
    gameplayHint:
      'Pista de la Plaza: Camina hacia el sureste para adentrarte en Las Praderas del Pixel y descubrir Pong.',
  },
  {
    id: 'echo-1971-computerspace',
    year: 1971,
    title: 'Crónica del Pasado · Computer Space (1971)',
    pioneer: 'Nolan Bushnell y Ted Dabney',
    x: 2560,
    y: 785,
    zoneId: 'fortaleza-oleadas',
    accentHex: '#ffba08',
    motif: 'rocket-cabinet',
    loreText:
      'El primer videojuego recreativo operado con monedas abrió el camino hacia las grandes emociones de los salones arcade que culminarían en fenómenos como Space Invaders.',
    gameplayHint:
      'Meta de la Fortaleza Volcánica: Alcanza 1.000 puntos en Space Invaders para registrar el Logro Maestro y abrir el muelle costero.',
  },
];

export const ISLAND_SWITCHES: IslandSwitchSpec[] = [
  {
    id: 'sw-bosque-sur',
    label: 'Mecanismo de Piedra del Bosque',
    x: 1280,
    y: 1475,
    zoneId: 'bosque-circuitos',
    accentHex: '#8cd96c',
    descriptionOnActivate:
      '¡Engranaje del Bosque activado! Activa el pedestal gemelo al sur de la Plaza para desplegar el Puente Costero.',
  },
  {
    id: 'sw-ruinas-sur',
    label: 'Mecanismo de Piedra de la Plaza',
    x: 1585,
    y: 1595,
    zoneId: 'ruinas-primer-arcade',
    accentHex: '#f2c94c',
    descriptionOnActivate:
      '¡Engranaje de la Plaza activado! Con ambos pedestales encendidos se abre el atajo del Puente Costero.',
  },
  {
    id: 'sw-caverna-cristal',
    label: 'Interruptor de Cuarzo Antiguo',
    x: 355,
    y: 505,
    zoneId: 'cavernas-codigo',
    accentHex: '#c084fc',
    descriptionOnActivate:
      '¡Compuerta subterránea abierta! El paso hacia el cristal profundo del noreste ha quedado libre.',
  },
];

export const ISLAND_PIER_SPEC = {
  x: 398,
  y: 2088,
  w: 140,
  h: 240,
};

export const LAVA_STRAIGHT_BRIDGE_SPEC = {
  x: 2064,
  y: 640,
  w: 336,
  h: 48,
};

export interface IslandSandMoundSpec {
  id: string;
  x: number;
  y: number;
  rewardItemId: string | null;
  label: string;
}

export const ISLAND_SAND_MOUNDS: IslandSandMoundSpec[] = [
  { id: 'mound-combustible-tabla', x: 260, y: 1980, rewardItemId: 'item-polvo-fosforo', label: 'Montículo de Combustible de Tabla' },
  { id: 'mound-engranaje-puente', x: 300, y: 2160, rewardItemId: 'item-engranaje-puente', label: 'Montículo del Engranaje del Puente' },
  { id: 'mound-arena-central', x: 520, y: 2040, rewardItemId: null, label: 'Montículo de Arena Simple' },
  { id: 'mound-arena-oriental', x: 700, y: 2100, rewardItemId: null, label: 'Montículo de Arena Oriental' },
];

export const ISLAND_DIAMONDS: IslandDiamondSpec[] = [
  {
    id: 'isl-dia-costa',
    label: 'Diamante de la Cala del Pueblo',
    x: 285,
    y: 1995,
    zoneId: 'costa-despertar',
  },
  {
    id: 'isl-dia-puente-sur',
    label: 'Diamante del Puente Costero',
    x: 1210,
    y: 1692,
    zoneId: 'ruinas-primer-arcade',
    requiresShortcut: true,
  },
  {
    id: 'isl-dia-pong-terraza',
    label: 'Diamante Florido de las Praderas',
    x: 3115,
    y: 1850,
    zoneId: 'santuario-pong',
  },
  {
    id: 'isl-dia-caverna',
    label: 'Diamante del Túnel Subterráneo',
    x: 825,
    y: 445,
    zoneId: 'cavernas-codigo',
    requiresSwitchId: 'sw-caverna-cristal',
  },
  {
    id: 'isl-dia-cumbre',
    label: 'Diamante del Cráter Volcánico',
    x: 2235,
    y: 235,
    zoneId: 'cumbre-arquitecto',
  },
  {
    id: 'isl-dia-faro',
    label: 'Diamante del Acantilado del Faro',
    x: 4048,
    y: 2056,
    zoneId: 'faro-reinicio',
  },
];

export const DISTANT_DECADE_VISTAS: DistantDecadeVistaSpec[] = [
  {
    id: 'vista-80s',
    decadeLabel: 'HORIZONTE MARÍTIMO · AÑOS 80',
    title: 'Isla de las Vigas y Laberintos (1980–1989)',
    x: 3440,
    y: 1110,
    accentHex: '#f43f5e',
    statusText: 'PRÓXIMA REGIÓN EN EL MAR DEL TIEMPO',
    unlockRequirement:
      'Condición: Superar Pong en Las Praderas del Pixel y alcanzar el Logro de 1.000 puntos en Space Invaders dentro de La Fortaleza Volcánica.',
    lorePreview:
      'Al otro lado del océano aguardan los salones recreativos de principios de los 80, preparados como expansión natural del archipiélago de PIXELVERSE.',
  },
  {
    id: 'vista-90s',
    decadeLabel: 'HORIZONTE MARÍTIMO · AÑOS 90',
    title: 'Archipiélago Portátil y de 16 Bits (1990–1999)',
    x: 3440,
    y: 1225,
    accentHex: '#a855f7',
    statusText: 'REGIÓN FUTURA EN PREPARACIÓN NARRATIVA',
    unlockRequirement:
      'Condición: Restaurar primero los cimientos de las décadas de 1970 y 1980.',
    lorePreview:
      'Entre la bruma marina se distinguen cartuchos dorados, aventuras portátiles a color y las primeras ciudadelas tridimensionales.',
  },
  {
    id: 'vista-futuro',
    decadeLabel: 'HORIZONTE MARÍTIMO · NUEVO MILENIO',
    title: 'Faro de las Eras Modernas',
    x: 3440,
    y: 1335,
    accentHex: '#5cc8ff',
    statusText: 'SILUETA LEJANA EN EL HORIZONTE',
    unlockRequirement:
      'Condición: Reunir las memorias históricas del archipiélago antes del encuentro final contra SUPER CUPA.',
    lorePreview:
      'El destino último donde todas las generaciones del videojuego vuelven a latir unidas.',
  },
];

export function isSouthShortcutUnlocked(switches: string[], allUnlocked = false): boolean {
  if (allUnlocked) return true;
  return (
    (switches.includes('sw-bosque-sur') || switches.includes('sw-costa-este')) &&
    switches.includes('sw-ruinas-sur')
  );
}

export function isPointWalkableOnIsland(
  px: number,
  py: number,
  opts: { southShortcut: boolean; gargantaBridge: boolean; froggerCleared?: boolean }
): WalkableRect | null {
  for (let i = ISLAND_WALKABLE_RECTS.length - 1; i >= 0; i--) {
    const r = ISLAND_WALKABLE_RECTS[i];
    if (r.requiresCondition === 'south-shortcut' && !opts.southShortcut) continue;
    if (r.requiresCondition === 'garganta-bridge' && !opts.gargantaBridge) continue;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) {
      // El lago del bosque resta superficie caminable dentro del claro.
      if (isInsideOrigenForestLake(px, py, Boolean(opts.froggerCleared))) return null;
      return r;
    }
  }
  return null;
}
