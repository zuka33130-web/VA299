/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contenido estructurado RPG 2D de PIXELVERSE — ISLA DEL ORIGEN (Estilo Game Boy Color):
 * - Direcciones cardinales (4 direcciones)
 * - Catálogo de Objetos (llaves, piezas arcade, memorias, herramientas, reliquias, cosméticos)
 * - Sistema de Misiones con objetivos verificables y recompensas reales
 * - Punto de Guardado del Pueblo, Carteles de Orientación GBC y Túneles Subterráneos conectados
 * - Interiores accesibles (Centro de Historia, Taller TTL, Archivo Pionero), paredes falsas y grutas
 * - Expansión jugable hacia «Isla Neón 1980s: Muelle de las Vigas Rojas»
 */

import { PixelAbilityId, PixelverseProgressState } from '../memories/progressionState';

export type FacingDirection = 'down' | 'up' | 'left' | 'right';

export type ArcadeMachineVariant =
  | 'upright'
  | 'cabaret'
  | 'cocktail'
  | 'deluxe'
  | 'shooter'
  | 'vector'
  | 'gutted'
  | 'tilted';

export type RpgAreaId =
  | 'exterior-70s'
  | 'interior-centro-historia'
  | 'interior-taller-alcorn'
  | 'secret-camara-osciloscopio'
  | 'interior-templo-pioneros'
  | 'interior-museo-viviente'
  | 'dungeon-laberinto-origen'
  | 'dungeon-cueva-glitch'
  | 'secret-sala-breakout'
  | 'interior-cronoscopio'
  | 'interior-archivo-norte'
  | 'interior-observatorio-boreal'
  | 'chamber-boveda-cronoscopio'
  | 'cave-gruta-cascada'
  | 'cave-cavidad-aurora'
  | 'cave-camara-eco'
  | 'island-80s'
  | 'castle-murallas'
  | 'castle-laberinto'
  | 'castle-cimientos'
  | 'castle-biblioteca'
  | 'castle-torre'
  | 'castle-trono'
  | 'interior-sala-cuatro-caminos';

export type RpgItemCategory =
  | 'herramienta'
  | 'pieza-arcade'
  | 'cinta-memoria'
  | 'llave'
  | 'reliquia'
  | 'cartucho'
  | 'cosmetico'
  | 'objeto';

export interface RpgItemSpec {
  id: string;
  name: string;
  category: RpgItemCategory;
  categoryLabel: string;
  accentHex: string;
  shortCode: string;
  description: string;
  usageHint: string;
  usableAction?: 'scanner' | 'lantern' | 'welder' | 'equip-cosmetic' | 'inspect';
  grantsAbility?: PixelAbilityId;
}

export interface RpgQuestSpec {
  id: string;
  code: string;
  title: string;
  giverName: string;
  decadeTag: string;
  accentHex: string;
  summary: string;
  steps: {
    label: string;
    isDone: (state: PixelverseProgressState, allUnlocked: boolean) => boolean;
  }[];
  rewardSummary: string;
  rewardItemIds: string[];
}

export interface SolidObstacleRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExteriorBuildingSpec {
  id: string;
  name: string;
  subtitle: string;
  archStyle?:
    | 'cottage-archive'
    | 'forest-workshop'
    | 'ruins-sanctuary'
    | 'chrono-dome'
    | 'museum-hall'
    | 'arcade-hall';
  x: number;
  y: number;
  w: number;
  h: number;
  roofHex: string;
  roofShadeHex: string;
  wallHex: string;
  trimHex: string;
  signText: string;
  doorX: number;
  doorY: number;
  targetArea: RpgAreaId;
  targetSpawnX: number;
  targetSpawnY: number;
  returnExteriorX: number;
  returnExteriorY: number;
}

export interface AnomalyPortalSpec {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  style: 'glyph-shortcut' | 'abyssal-chamber';
  accentHex: string;
  requiredSecretIds?: string[];
  targetKind: 'exterior-coords' | 'sub-area';
  destX: number;
  destY: number;
  destFacing: FacingDirection;
  targetArea?: RpgAreaId;
  returnExteriorX?: number;
  returnExteriorY?: number;
  dormantTitle: string;
  dormantLore: string[];
  dormantHint: string;
  activeToast: string;
}

export interface WoodenSignSpec {
  id: string;
  label: string;
  x: number;
  y: number;
  zoneTitle: string;
  lines: string[];
  mapLabel?: string;
  large?: boolean;
}

export interface TunnelPortalSpec {
  id: string;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  destX: number;
  destY: number;
  destFacing: FacingDirection;
  toastText: string;
  secretId?: string;
}

export interface IslandCaveEntranceSpec {
  id: string;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  accentHex: string;
  targetArea: RpgAreaId;
  targetSpawnX: number;
  targetSpawnY: number;
  returnExteriorX: number;
  returnExteriorY: number;
  secretId: string;
}

export interface RpgChestSpec {
  id: string;
  areaId: RpgAreaId;
  label: string;
  x: number;
  y: number;
  accentHex: string;
  rewardItemIds: string[];
  requiresPuzzleId?: string;
  requiresItemId?: string;
  requiresLanternInDark?: boolean;
}

export interface RpgExaminableSpec {
  id: string;
  areaId: RpgAreaId;
  label: string;
  actionLabel: string;
  x: number;
  y: number;
  accentHex: string;
  category: string;
  paragraphs: string[];
  hint?: string;
  secretIdToDiscover?: string;
  clueIdToDiscover?: string;
  isFalseWall?: boolean;
  unlocksDoorToArea?: {
    targetArea: RpgAreaId;
    spawnX: number;
    spawnY: number;
  };
}

export interface RpgSubAreaNpcSpec {
  id: string;
  areaId: RpgAreaId;
  name: string;
  role: string;
  x: number;
  y: number;
  facing: FacingDirection;
  palette: { primary: string; secondary: string; glow: string };
  pitch: number;
}

export interface PressureTileSpec {
  id: string;
  orderIndex: number;
  label: string;
  x: number;
  y: number;
  accentHex: string;
}

export interface SubAreaSpec {
  id: Exclude<RpgAreaId, 'exterior-70s'>;
  numberLabel: string;
  name: string;
  subtitle: string;
  accentHex: string;
  floorHex: string;
  floorGridHex: string;
  wallHex: string;
  borderHex: string;
  width: number;
  height: number;
  walkableBounds: { x: number; y: number; w: number; h: number };
  isDarkCave?: boolean;
  obstacles: SolidObstacleRect[];
  exits: {
    id: string;
    label: string;
    actionLabel: string;
    x: number;
    y: number;
    accentHex: string;
    targetArea: RpgAreaId;
    targetX?: number;
    targetY?: number;
    returnToSavedExterior?: boolean;
  }[];
  pressurePuzzle?: {
    puzzleId: string;
    tiles: PressureTileSpec[];
    successMessage: string;
  };
  decorProps: {
    kind:
      | 'workbench'
      | 'crt-rack'
      | 'archive-shelf'
      | 'oscilloscope-altar'
      | 'cave-crystal'
      | 'underground-pool'
      | 'neon-arch'
      | 'dk-cabinet-1981'
      | 'astral-ferry'
      | 'time-machine-core'
      | 'temporal-conduit'
      | 'museum-pedestal'
      | 'labyrinth-wall'
      | 'rgb-frequency-pillar'
      | 'breakout-cabinet-1976'
      | 'night-driver-cabinet-1976'
      | 'vector-projector'
      | 'castle-throne'
      | 'castle-gear'
      | 'castle-pendulum'
      | 'castle-valve'
      | 'castle-lectern'
      | 'space-invaders-ship'
      | 'corruption-core'
      | 'castle-banner'
      | 'castle-statue'
      | 'bed'
      | 'fireplace'
      | 'dining-table'
      | 'potted-plant'
      | 'framed-painting'
      | 'carpet'
      | 'dresser'
      | 'wall-clock'
      | 'arcade-machine';
    x: number;
    y: number;
    w: number;
    h: number;
    accentHex: string;
    label?: string;
    exhibitId?: string;
    arcade?: {
      variant: ArcadeMachineVariant;
      facing: 'north' | 'south';
      marquee: string;
      year: string;
      broken?: boolean;
    };
  }[];
}

/* ============================================================================
   1. CATÁLOGO DE OBJETOS Y HERRAMIENTAS DE EXPLORACIÓN
   ============================================================================ */
export const RPG_ITEMS: Record<string, RpgItemSpec> = {
  'item-cartucho-origen': {
    id: 'item-cartucho-origen',
    name: 'Cartucho Maestro: ORIGEN',
    category: 'cartucho',
    categoryLabel: 'CARTUCHO MAESTRO',
    accentHex: '#facc15',
    shortCode: 'ROM-ORIGEN',
    description:
      'Cartucho Maestro fundacional de la Isla del Origen. Custodia la armonización pura de Pong (1972), Breakout (1976) y Space Invaders (1978), forjado tras ensamblar los tres fragmentos de la Cueva Glitch y estabilizar el Núcleo Primigenio. Objeto permanente, no consumible y no descartable.',
    usageHint:
      'Habilita la resonancia con los altares maestros de la isla, preservando las pruebas individuales de cada videojuego histórico.',
    usableAction: 'inspect',
  },
  'item-fragmento-pulso': {
    id: 'item-fragmento-pulso',
    name: 'Fragmento de Pulso (1972)',
    category: 'pieza-arcade',
    categoryLabel: 'FRAGMENTO DEL ORIGEN',
    accentHex: '#38bdf8',
    shortCode: 'FRG-PLS',
    description:
      'Resonador cuántico liberado al alinear con precisión el haz de señal continua con el receptor sintonizado dentro del Sector del Pulso de la Cueva Glitch.',
    usageHint: 'Uno de los tres fragmentos requeridos para estabilizar la consola del Núcleo Central.',
    usableAction: 'inspect',
  },
  'item-fragmento-circuito': {
    id: 'item-fragmento-circuito',
    name: 'Fragmento de Circuito (1976)',
    category: 'pieza-arcade',
    categoryLabel: 'FRAGMENTO DEL ORIGEN',
    accentHex: '#f59e0b',
    shortCode: 'FRG-CRC',
    description:
      'Matriz de compuertas lógicas desbloqueada al activar los tres interruptores en la secuencia exacta indicada por las pistas TTL (Beta → Alfa → Gamma) en el Sector de Circuitos.',
    usageHint: 'Uno de los tres fragmentos requeridos para la consola central del Núcleo del Origen.',
    usableAction: 'inspect',
  },
  'item-fragmento-memoria': {
    id: 'item-fragmento-memoria',
    name: 'Fragmento de Memoria (1978)',
    category: 'pieza-arcade',
    categoryLabel: 'FRAGMENTO DEL ORIGEN',
    accentHex: '#c084fc',
    shortCode: 'FRG-MEM',
    description:
      'Núcleo mnemónico fractal descubierto en el pasadizo secreto tras la pared falsa de la Cueva Glitch y resuelto en la matriz de losetas históricas.',
    usageHint: 'Uno de los tres fragmentos requeridos para la consola central del Núcleo del Origen.',
    usableAction: 'inspect',
  },
  'item-nucleo-fotonico-nocturno': {
    id: 'item-nucleo-fotonico-nocturno',
    name: 'Núcleo Fotónico de Haluro (1976)',
    category: 'pieza-arcade',
    categoryLabel: 'ARTEFACTO DE TRAMA · 1976',
    accentHex: '#38bdf8',
    shortCode: 'FOT-76',
    description:
      'Resonador óptico sellado custodiado en el interior del gabinete de Night Driver (1976), oculto en la cueva oscura debajo de la cascada para escapar del rastreo de Gran Koopa. Canaliza pulsos lumínicos de alta tensión en penumbra absoluta y purga la sobrecarga de entropía que bloquea la Sala de Los Cuatro Caminos.',
    usageHint:
      'Entrégaselo al técnico Dylan en Taller RS — Retro State para iniciar la restauración de Los Cuatro Caminos y continuar hacia el Castillo de Gran Koopa.',
    usableAction: 'inspect',
  },
  'item-transistores-germanio': {
    id: 'item-transistores-germanio',
    name: '3 Transistores de Germanio (1976)',
    category: 'pieza-arcade',
    categoryLabel: 'COMPONENTE DE RESTAURACIÓN',
    accentHex: '#f97316',
    shortCode: 'TR-GERM',
    description:
      'Conjunto de tres semiconductores de germanio de 1976 preservados como respaldo auxiliar para circuitos TTL clásicos.',
    usageHint: 'Respaldo técnico compatible con el banco de trabajo de Dylan en Taller RS — Retro State.',
    usableAction: 'inspect',
  },
  'item-transistores-germanio-lago': {
    id: 'item-transistores-germanio-lago',
    name: '3 Transistores de Germanio del Lago',
    category: 'pieza-arcade',
    categoryLabel: 'COMPONENTE RESCATADO DEL REINICIO',
    accentHex: '#fb923c',
    shortCode: 'TR-LAGO',
    description:
      'Tres semiconductores de germanio que sobrevivieron al Reinicio Cero dentro de una caja estanca, en el lago del bosque. Son necesarios para recuperar el sistema de iluminación de las cuevas.',
    usageHint: 'Llévaselos al Maestro Kertz en el Taller Retro State TS del bosque.',
    usableAction: 'inspect',
  },
  'item-componentes-estano': {
    id: 'item-componentes-estano',
    name: 'Componentes de Estaño',
    category: 'pieza-arcade',
    categoryLabel: 'MATERIAL DE SOLDADURA',
    accentHex: '#94a3b8',
    shortCode: 'ESTAÑO',
    description:
      'Componentes de estaño de alta pureza hallados en el baúl del lago del bosque. Dylan los necesita para preparar su soldador de lápiz.',
    usageHint: 'Llévaselos al técnico Dylan en el Taller Retro State TS.',
    usableAction: 'inspect',
  },
  'item-baterias-linterna': {
    id: 'item-baterias-linterna',
    name: 'Baterías de Litio-Cero',
    category: 'objeto',
    categoryLabel: 'SUMINISTRO DE ENERGÍA',
    accentHex: '#facc15',
    shortCode: 'BAT-0',
    description:
      'Celdas de energía de alta densidad entregadas por Kertz. Activan de forma permanente la linterna integrada en tu mochila para explorar zonas oscuras.',
    usageHint: 'Una vez obtenidas, pulsa [L] en cualquier momento para encender o apagar la linterna.',
    usableAction: 'inspect',
  },
  'item-soldador-estaño': {
    id: 'item-soldador-estaño',
    name: 'Soldador de Estaño de Dylan',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE REPARACIÓN',
    accentHex: '#f97316',
    shortCode: 'SLD-SN',
    description:
      'Un soldador de lápiz con punta de cobre y carrete de estaño que Dylan preparó tras recibir el material. Sirve para unir contactos electrónicos partidos.',
    usageHint: 'En la consola de la palanca de seguridad del Sector 03, pulsá [E] para identificar los contactos fríos y soldarlos.',
    usableAction: 'inspect',
  },
  'item-valvula-vacio-abuelo': {
    id: 'item-valvula-vacio-abuelo',
    name: 'Válvula de Vacío del Abuelo (1969)',
    category: 'pieza-arcade',
    categoryLabel: 'COMPONENTE DE LA CASA NATAL',
    accentHex: '#7dd3fc',
    shortCode: 'VLV-69',
    description:
      'Válvula de vacío de repuesto que el abuelo guardaba en el compartimento de latón detrás de la radio de la cabaña. Alimentaba los circuitos de sincronía de las compuertas antiguas de la costa.',
    usageHint: 'Instalala en la consola de la compuerta PRIORIDAD CERO del acantilado oriental de la Costa de las Máquinas.',
    usableAction: 'inspect',
  },
  'item-lente-fresnel': {
    id: 'item-lente-fresnel',
    name: 'Lente de Fresnel del Faro',
    category: 'reliquia',
    categoryLabel: 'MEMORIA DE LA COSTA',
    accentHex: '#fde68a',
    shortCode: 'LNT-FR',
    description:
      'Anillo de cristal tallado que dirigía la luz de la baliza del Faro del Reinicio. Una de sus caras conserva la marca de la onda expansiva del 23 de octubre de 2026.',
    usageHint: 'Reliquia de exploración: conservala en la Mochila como memoria del Faro.',
    usableAction: 'inspect',
  },
  'item-bitacora-cero': {
    id: 'item-bitacora-cero',
    name: 'Bitácora de la Isla del Origen',
    category: 'cinta-memoria',
    categoryLabel: 'DIARIO DEL VIAJERO',
    accentHex: '#5cc8ff',
    shortCode: 'BIT-00',
    description:
      'Cuaderno portátil de Pixel. Registra pistas de las cinco zonas de la Isla del Origen, atajos descubiertos y crónicas de los videojuegos.',
    usageHint: 'Lee carteles de madera e inscripciones para hallar cuevas, túneles y pasadizos entre árboles.',
    usableAction: 'inspect',
  },
  'item-mochila-explorador': {
    id: 'item-mochila-explorador',
    name: 'Mochila de Lona de la Cabaña',
    category: 'objeto',
    categoryLabel: 'EQUIPO DE EXPLORACIÓN',
    accentHex: '#b07a4a',
    shortCode: 'MOC-70',
    description:
      'La vieja mochila de lona que colgaba junto a la ventana de la cabaña natal. Curtida por la sal, guarda el equipo por defecto de Pixel: la Bitácora de la Isla del Origen, una cantimplora de hojalata, una brújula de latón y un ovillo de cuerda.',
    usageHint: 'Viaja siempre contigo. El inventario se abre con [ENTER] durante la exploración de la Isla del Origen.',
    usableAction: 'inspect',
  },
  'item-lampara-fosforo': {
    id: 'item-lampara-fosforo',
    name: 'Lámpara de Fósforo Ámbar',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#facc15',
    shortCode: 'LMP-72',
    description:
      'Farol clásico alimentado por el pulso de Pong (1972). Disipa la oscuridad en cuevas húmedas y permite abrir cofres ocultos en la penumbra.',
    usageHint: 'Pulsa [USAR] o la tecla [L] para encender/apagar el halo de luz alrededor de Pixel.',
    usableAction: 'lantern',
    grantsAbility: 'phosphor-lantern',
  },
  'item-escaner-frecuencias': {
    id: 'item-escaner-frecuencias',
    name: 'Buscador de Secretos GBC',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#5cc8ff',
    shortCode: 'SCN-74',
    description:
      'Dispositivo de pulso armónico que revela paredes falsas, entradas disimuladas en rocas, árboles huecos y cofres sin abrir cercanos.',
    usageHint: 'Pulsa [USAR] o la tecla [R] durante la exploración para emitir una onda detectora.',
    usableAction: 'scanner',
    grantsAbility: 'secret-scanner',
  },
  'item-soldador-logico': {
    id: 'item-soldador-logico',
    name: 'Soldador Lógico de Precisión',
    category: 'herramienta',
    categoryLabel: 'HERRAMIENTA DE EXPLORACIÓN',
    accentHex: '#4ca64c',
    shortCode: 'SLD-76',
    description:
      'Herramienta maestra forjada en el Taller del Bosque de los Secretos. Repara mecanismos antiguos y despliega puentes bloqueados.',
    usageHint: 'Acércate al mecanismo averiado al sur de la Plaza Mayor y pulsa [E].',
    usableAction: 'welder',
    grantsAbility: 'circuit-welder',
  },
  'item-condensador-cuarzo': {
    id: 'item-condensador-cuarzo',
    name: 'Condensador de Cuarzo Puro',
    category: 'pieza-arcade',
    categoryLabel: 'PIEZA DE MÁQUINA ARCADE',
    accentHex: '#c084fc',
    shortCode: 'CAP-QZ',
    description:
      'Cristal estabilizador extraído de los Túneles Subterráneos del Tiempo. Regula fuentes de video clásicas sin fluctuaciones.',
    usageHint: 'Entrégaselo al Maestro Kertz dentro del Taller del Bosque de los Secretos.',
    usableAction: 'inspect',
  },
  'item-cinta-alfa': {
    id: 'item-cinta-alfa',
    name: 'Cartucho Histórico Alfa (1971)',
    category: 'cinta-memoria',
    categoryLabel: 'MEMORIA HISTÓRICA',
    accentHex: '#8cd96c',
    shortCode: 'CRT-A1',
    description:
      'Memoria recuperada en la cala costera del Pueblo del Origen. Conserva esquemas de las primeras recreativas.',
    usageHint: 'Llévaselo a la Archivera Lira en el Archivo de la Plaza Mayor.',
    usableAction: 'inspect',
  },
  'item-cinta-beta': {
    id: 'item-cinta-beta',
    name: 'Cartucho Histórico Beta (1975)',
    category: 'cinta-memoria',
    categoryLabel: 'MEMORIA HISTÓRICA',
    accentHex: '#f2c94c',
    shortCode: 'CRT-B2',
    description:
      'Memoria resguardada detrás de la cascada del Paso Volcánico. Documenta el salto a los microprocesadores de 8 bits.',
    usageHint: 'Llévaselo a la Archivera Lira en el Archivo de la Plaza Mayor.',
    usableAction: 'inspect',
  },
  'item-llave-binaria': {
    id: 'item-llave-binaria',
    name: 'Llave Antigua de 8 Pines',
    category: 'llave',
    categoryLabel: 'LLAVE ANTIGUA',
    accentHex: '#f59e0b',
    shortCode: 'KEY-08',
    description:
      'Llave metálica labrada con ocho muescas precisas. Abre cofres sellados de alta seguridad.',
    usageHint: 'Se utiliza automáticamente al interactuar con cofres con cerradura de 8 pines.',
    usableAction: 'inspect',
  },
  'item-reliquia-osciloscopio': {
    id: 'item-reliquia-osciloscopio',
    name: 'Válvula Luminosa de 1958',
    category: 'reliquia',
    categoryLabel: 'RELIQUIA FUNDACIONAL',
    accentHex: '#5cc8ff',
    shortCode: 'REL-58',
    description:
      'Tubo analógico oculto tras la pared falsa del Taller del Bosque. Aún proyecta una pequeña estela verde.',
    usageHint: 'Muéstrasela al Ermitaño que habita en la Gruta tras la Cascada.',
    usableAction: 'inspect',
  },
  'item-mapa-secreto-isla': {
    id: 'item-mapa-secreto-isla',
    name: 'Plano Secreto de Túneles y Árboles',
    category: 'reliquia',
    categoryLabel: 'MAPA DE EXPLORADOR',
    accentHex: '#8cd96c',
    shortCode: 'MAP-01',
    description:
      'Pergamino pixelado hallado tras los árboles del Bosque de los Secretos. Señala rocas huecas en la Costa y un pasadizo detrás del Centro de Historia.',
    usageHint: 'Pista: Busca rocas agrietadas al oeste del Pueblo y en las Ruinas Costeras del Este para viajar por túneles subterráneos.',
    usableAction: 'inspect',
  },
  'item-pase-astral-80s': {
    id: 'item-pase-astral-80s',
    name: 'Carta Náutica · Nuevas Islas (80s)',
    category: 'llave',
    categoryLabel: 'PASE MARÍTIMO',
    accentHex: '#f43f5e',
    shortCode: 'NAV-80',
    description:
      'Ruta marítima desbloqueada junto al Logro de 1.000 Puntos en Space Invaders. Permite zarpar desde el muelle de La Costa y las Ruinas del Tiempo.',
    usageHint: 'Dirígete al muelle oriental (Zona 5) y aborda el navío hacia la siguiente década.',
    usableAction: 'inspect',
  },
  'item-visor-vectorial': {
    id: 'item-visor-vectorial',
    name: 'Gafas Retro de Explorador',
    category: 'cosmetico',
    categoryLabel: 'EQUIPO COSMÉTICO',
    accentHex: '#5cc8ff',
    shortCode: 'VIS-GB',
    description:
      'Lentes luminosas halladas detrás del Centro de Historia o en cofres especiales. Cambian el aspecto de Pixel al caminar.',
    usageHint: 'Pulsa [EQUIPAR] en la Mochila [I] para llevarlas puestas.',
    usableAction: 'equip-cosmetic',
  },
  'item-manto-arquitecto': {
    id: 'item-manto-arquitecto',
    name: 'Corona Dorada del Origen',
    category: 'cosmetico',
    categoryLabel: 'EQUIPO COSMÉTICO',
    accentHex: '#fde047',
    shortCode: 'CRN-70',
    description:
      'Insignia real entregada a quienes descubren la cámara oculta de 1958 y la gruta tras la cascada.',
    usageHint: 'Pulsa [EQUIPAR] en la Mochila [I] para lucirla sobre Pixel.',
    usableAction: 'equip-cosmetic',
  },
  'item-bobina-temporal': {
    id: 'item-bobina-temporal',
    name: 'Bobina de Resonancia Temporal',
    category: 'pieza-arcade',
    categoryLabel: 'ARTEFACTO DEL CRONOSCOPIO',
    accentHex: '#00f3ff',
    shortCode: 'CRN-77',
    description:
      'Núcleo espiral de cuarzo y cobre hallado en la Cámara Abisal de las Cavernas de Memoria. Estabiliza los anillos de época de la Máquina del Tiempo.',
    usageHint: 'Llévala al Observatorio del Cronoscopio en Las Ruinas del Primer Pulso.',
    usableAction: 'inspect',
  },
  'item-insignia-vigas-1981': {
    id: 'item-insignia-vigas-1981',
    name: 'Emblema de las Vigas Rojas (1981)',
    category: 'reliquia',
    categoryLabel: 'TROFEO DE EXPANSIÓN',
    accentHex: '#fb7185',
    shortCode: 'EMB-81',
    description:
      'Medalla obtenida al superar el gabinete clásico de 1981 tras viajar a la década de 1980.',
    usageHint: 'Acredita tu avance hacia las nuevas décadas de PIXELVERSE.',
    usableAction: 'inspect',
  },
  'item-prisma-breakout': {
    id: 'item-prisma-breakout',
    name: 'Prisma Cromático TTL (1976)',
    category: 'reliquia',
    categoryLabel: 'MEMORIA SECRETA 1976',
    accentHex: '#f97316',
    shortCode: 'BRK-76',
    description:
      'Cristal de cuatro bandas luminosas obtenido al restaurar Breakout (1976) en la Sala Secreta bajo el Laberinto de Señales. Activa su vitrina en el Museo Viviente.',
    usageHint: 'Visita el Museo Viviente de los 70 para admirar el pedestal de 1976 encendido.',
    usableAction: 'inspect',
  },
  'item-filtro-interdecada': {
    id: 'item-filtro-interdecada',
    name: 'Lámina de Celofán Ámbar-Cian',
    category: 'pieza-arcade',
    categoryLabel: 'RELIQUIA DE INVESTIGACIÓN',
    accentHex: '#22d3ee',
    shortCode: 'CEL-76',
    description:
      'Lámina óptica original empleada sobre monitores CRT monocromos para simular franjas de color. Obtenida al resolver el Caso de Investigación de 1976.',
    usageHint: 'Conservada en tu archivo arqueológico como prueba de maestría histórica.',
    usableAction: 'inspect',
  },
  'item-lente-vectorial-79': {
    id: 'item-lente-vectorial-79',
    name: 'Lente Vectorial QuadraScan (1979)',
    category: 'reliquia',
    categoryLabel: 'ARTEFACTO DEL MUSEO',
    accentHex: '#a78bfa',
    shortCode: 'VEC-79',
    description:
      'Óptica de deflexión magnética XY que traza líneas puras de luz para Lunar Lander y Asteroids (1979). Obtenida al alinear el proyector del Museo Viviente.',
    usageHint: 'Sincroniza la galería norte del Museo Viviente de los 70.',
    usableAction: 'inspect',
  },
  'item-polvo-fosforo': {
    id: 'item-polvo-fosforo',
    name: 'Fósforo Ámbar de Pong (1972)',
    category: 'pieza-arcade',
    categoryLabel: 'COMBUSTIBLE DE VUELO',
    accentHex: '#facc15',
    shortCode: 'FOS-72',
    description:
      'Fósforo concentrado de alta energía recuperado en el Santuario de Pong. Alimenta la Paleta Voladora de Pong para planear sobre agua y barrancos.',
    usageHint: 'Activa la Paleta Voladora en el selector de habilidades [1-4].',
    usableAction: 'inspect',
  },
  'item-barra-pong': {
    id: 'item-barra-pong',
    name: 'Barra de Pong',
    category: 'objeto',
    categoryLabel: 'OBJETO DE TRANSPORTE',
    accentHex: '#facc15',
    shortCode: 'BAR-72',
    description:
      'La paleta original de Pong (1972) convertida en aeropatín. Viaja contigo desde la primera victoria contra la IA y permite sobrevolar la Isla del Origen mientras quede combustible.',
    usageHint:
      'Actívala con [F] o desde el menú de Poderes [K]. Consume combustible de vuelo y solo puede invocarse en el exterior de la isla.',
    usableAction: 'inspect',
    grantsAbility: 'pong-hoverboard',
  },
  'item-palanca-pong': {
    id: 'item-palanca-pong',
    name: 'Palanca de Pong (1972)',
    category: 'pieza-arcade',
    categoryLabel: 'MECANISMO DE ENCENDIDO',
    accentHex: '#f59e0b',
    shortCode: 'PLC-72',
    description:
      'Palanca de hierro forjado que el abuelo de Pixel guardó dentro del cofre familiar. Encaja en la ranura del gabinete de Pong y transmite el pulso necesario para despertar el tubo.',
    usageHint: 'Llévala al gabinete de la arboleda, en la Isla Natal, e instálala para encender Pong.',
    usableAction: 'inspect',
  },
  'item-carta-abuelo': {
    id: 'item-carta-abuelo',
    name: 'Carta del Abuelo',
    category: 'cinta-memoria',
    categoryLabel: 'TESTIMONIO DEL REINICIO CERO',
    accentHex: '#fde68a',
    shortCode: 'CRT-72',
    description:
      'Carta manuscrita encontrada dentro del cofre, bajo el retrato familiar. Explica qué fue el Reinicio Cero, por qué el viejo Pong sobrevivió y cuál es la misión de Pixel.',
    usageHint: 'Consérvala. La carta completa se lee al abrir el cofre; en el inventario queda como testimonio.',
    usableAction: 'inspect',
  },
  'item-foto-abuelo': {
    id: 'item-foto-abuelo',
    name: 'Fotografía del Abuelo',
    category: 'reliquia',
    categoryLabel: 'MEMORIA DE FAMILIA',
    accentHex: '#cbd5e1',
    shortCode: 'FOT-72',
    description:
      'Fotografía antigua del abuelo frente a un gabinete de Pong recién traído a la isla. En el reverso anotó una sola frase: «Lo que se juega, se recuerda».',
    usageHint: 'Una reliquia personal de Pixel. Mantiene viva la memoria de quien le enseñó a jugar.',
    usableAction: 'inspect',
  },
  'item-engranaje-puente': {
    id: 'item-engranaje-puente',
    name: 'Engranaje del Puente de la Cala',
    category: 'pieza-arcade',
    categoryLabel: 'PIEZA DE PUENTE',
    accentHex: '#f59e0b',
    shortCode: 'ENG-01',
    description:
      'Rueda dentada de bronce sepultada en la arena de la cala. Encaja en el torno del puente levadizo y transmite el giro necesario para desplegar las vigas sobre el canal.',
    usageHint: 'Llévala al mecanismo de la orilla sur y montala para abrir el paso hacia el asentamiento.',
    usableAction: 'inspect',
  },
  'item-brujula-mareas': {
    id: 'item-brujula-mareas',
    name: 'Brújula de Mareas',
    category: 'reliquia',
    categoryLabel: 'OBJETO OPCIONAL DE LA CALA',
    accentHex: '#38bdf8',
    shortCode: 'BRJ-01',
    description:
      'Pequeña brújula de latón que el mar devolvió a la arena. Su aguja no señala el norte: oscila con la memoria de las corrientes que trajeron a Pixel hasta la costa.',
    usageHint: 'Conservala en la Mochila como recuerdo de tu llegada a la Isla del Origen.',
    usableAction: 'inspect',
  },
  'item-pieza-generador': {
    id: 'item-pieza-generador',
    name: 'Pieza del Generador Retro State',
    category: 'pieza-arcade',
    categoryLabel: 'REPUESTO INDUSTRIAL',
    accentHex: '#22c55e',
    shortCode: 'GEN-79',
    description:
      'Conmutador de potencia sellado en cobre y baquelita, recuperado tras superar el Cruce de Circuitos en el bosque. Es la pieza exacta que falta para reparar el generador del taller.',
    usageHint: 'Llévala al Maestro Kertz en Retro State TS y después montala en el generador.',
    usableAction: 'inspect',
  },
  'item-espada-cambiante': {
    id: 'item-espada-cambiante',
    name: 'Espada Cambiante de Breakout (1976)',
    category: 'herramienta',
    categoryLabel: 'HABILIDAD PRINCIPAL',
    accentHex: '#f97316',
    shortCode: 'ESP-76',
    description:
      'Arma de luz cromática con 3 modos: Espada Corta, Espada Extensible de 4 bandas y Pistola de Energía de rebote. Destruye bloques de cristal y activa interruptores lejanos.',
    usageHint: 'Selecciona la Espada Cambiante con [1-4] y ataca con [F / Acción].',
    usableAction: 'inspect',
  },
  'item-modulo-orbital': {
    id: 'item-modulo-orbital',
    name: 'Módulo de Dash Orbital (1979)',
    category: 'herramienta',
    categoryLabel: 'HABILIDAD PRINCIPAL',
    accentHex: '#00f3ff',
    shortCode: 'DSH-79',
    description:
      'Propulsor vectorial de inercia pura de Asteroids (1979). Realiza un impulso a alta velocidad que destruye barreras de glitch e irrumpe en el Sendero Glitch.',
    usageHint: 'Selecciona Dash Orbital con [1-4] y ejecútalo con [F / Acción].',
    usableAction: 'inspect',
  },
  'item-sonar-profundidad': {
    id: 'item-sonar-profundidad',
    name: 'Emisor de Pulso Sonar',
    category: 'herramienta',
    categoryLabel: 'HABILIDAD PRINCIPAL',
    accentHex: '#10b981',
    shortCode: 'SNR-01',
    description:
      'Dispositivo de pulso sónico que el viejo amigo del abuelo conservaba en la cala. Su frecuencia revela objetos enterrados en la arena, pasadizos ocultos y mecanismos antiguos.',
    usageHint: 'Selecciona Pulso Sonar con [1-4] y emite ondas con [F / Acción].',
    usableAction: 'inspect',
  },
  'item-llave-bunker-militar': {
    id: 'item-llave-bunker-militar',
    name: 'Llave de Acceso al Búnker Militar (1974)',
    category: 'llave',
    categoryLabel: 'LLAVE TÁCTICA',
    accentHex: '#a3e635',
    shortCode: 'BNK-74',
    description:
      'Llave pesada obtenida al vencer la prueba del laberinto de Tank (1974). Abre el Búnker Militar en las Ruinas Centrales.',
    usageHint: 'Utilízala frente al portón blindado de las Ruinas.',
    usableAction: 'inspect',
  },
  'item-lente-cuantica-vectorial': {
    id: 'item-lente-cuantica-vectorial',
    name: 'Lente Cuántica Vectorial (1979)',
    category: 'pieza-arcade',
    categoryLabel: 'ARTEFACTO ASTRONÁUTICO',
    accentHex: '#a78bfa',
    shortCode: 'LNT-79',
    description:
      'Lente de alta precisión de Lunar Lander (1979). Calibra los sensores de altitud del Observatorio Vectorial.',
    usageHint: 'Llévala al proyector de las Cavernas del Código.',
    usableAction: 'inspect',
  },
  'item-memoria-aurora': {
    id: 'item-memoria-aurora',
    name: 'Memoria de la Aurora',
    category: 'cinta-memoria',
    categoryLabel: 'REGISTRO DE EXPLORACIÓN',
    accentHex: '#67e8f9',
    shortCode: 'MEM-AU',
    description:
      'Registro recuperado en la Cordillera del Primer Pulso. Conserva la secuencia de destellos que orientaba a sus antiguos cartógrafos.',
    usageHint: 'Pieza de archivo persistente; puede consultarse desde la Mochila [I].',
    usableAction: 'inspect',
  },
  'item-cristal-armonico': {
    id: 'item-cristal-armonico',
    name: 'Cristal Armónico Boreal',
    category: 'reliquia',
    categoryLabel: 'RELIQUIA DE LA CORDILLERA',
    accentHex: '#a5f3fc',
    shortCode: 'CRB-10',
    description:
      'Fragmento de cuarzo que retiene un eco estable de la aurora; recompensa de la cámara más profunda de la cordillera.',
    usageHint: 'Reliquia persistente conservada en el archivo de exploración.',
    usableAction: 'inspect',
  },
  'item-llave-torres-castillo': {
    id: 'item-llave-torres-castillo',
    name: 'Sello de las Cuatro Torres',
    category: 'llave',
    categoryLabel: 'SELLO ANTIGUO',
    accentHex: '#c084fc',
    shortCode: 'SEAL-4T',
    description:
      'Insignia tallada con los símbolos del Sol, Luna, Estrella y Rayo. Bajó el puente levadizo del castillo.',
    usageHint: 'Permite el libre tránsito por las murallas exteriores.',
    usableAction: 'inspect',
  },
  'item-cronica-fragmento-1': {
    id: 'item-cronica-fragmento-1',
    name: 'Crónica del Rey · Fragmento I',
    category: 'cinta-memoria',
    categoryLabel: 'CRÓNICA HISTÓRICA',
    accentHex: '#f59e0b',
    shortCode: 'CRON-01',
    description:
      '«En la era fundacional, el Rey Guardián Donkey Kong erigió la fortaleza para salvaguardar la memoria del videojuego».',
    usageHint: 'Colócalo en el primer atril de la Gran Biblioteca de los Reyes.',
    usableAction: 'inspect',
  },
  'item-cronica-fragmento-2': {
    id: 'item-cronica-fragmento-2',
    name: 'Crónica del Rey · Fragmento II',
    category: 'cinta-memoria',
    categoryLabel: 'CRÓNICA HISTÓRICA',
    accentHex: '#38bdf8',
    shortCode: 'CRON-02',
    description:
      '«En el hangar de la cima aguardaba la nave estelar, el puente sagrado hacia las siguientes épocas históricas».',
    usageHint: 'Colócalo en el segundo atril de la Gran Biblioteca de los Reyes.',
    usableAction: 'inspect',
  },
  'item-cronica-fragmento-3': {
    id: 'item-cronica-fragmento-3',
    name: 'Crónica del Rey · Fragmento III',
    category: 'cinta-memoria',
    categoryLabel: 'CRÓNICA HISTÓRICA',
    accentHex: '#a855f7',
    shortCode: 'CRON-03',
    description:
      '«Una sombra con fuego oscuro y caparazón de púas, Super KOOPA, corrompió los mecanismos y sumió la mente del rey en tinieblas».',
    usageHint: 'Colócalo en el tercer atril de la Gran Biblioteca de los Reyes.',
    usableAction: 'inspect',
  },
  'item-cronica-fragmento-4': {
    id: 'item-cronica-fragmento-4',
    name: 'Crónica del Rey · Fragmento IV',
    category: 'cinta-memoria',
    categoryLabel: 'CRÓNICA HISTÓRICA',
    accentHex: '#ef4444',
    shortCode: 'CRON-04',
    description:
      '«Solo destruyendo el Núcleo Digital sobre el trono podrá liberarse al monarca y abrirse el cielo estrellado».',
    usageHint: 'Colócalo en el cuarto atril de la Gran Biblioteca de los Reyes.',
    usableAction: 'inspect',
  },
  'item-nucleo-vital-castillo': {
    id: 'item-nucleo-vital-castillo',
    name: 'Núcleo de Vapor Ancestral',
    category: 'reliquia',
    categoryLabel: 'RELIQUIA VITAL',
    accentHex: '#10b981',
    shortCode: 'CORE-VP',
    description:
      'Engranaje milenario que late con agua termal y energía analógica. Hallado en la cámara secreta de los Cimientos.',
    usageHint: 'Otorga bendición de resistencia en el combate final.',
    usableAction: 'inspect',
  },
  'item-llave-hangar-dk': {
    id: 'item-llave-hangar-dk',
    name: 'Llave Maestra del Hangar',
    category: 'llave',
    categoryLabel: 'LLAVE MAESTRA',
    accentHex: '#eab308',
    shortCode: 'KEY-DK',
    description:
      'Llave ceremonial entregada por Donkey Kong tras liberarlo del control de Super KOOPA. Activa el lanzamiento de la nave de Space Invaders.',
    usageHint: 'Insértala en la consola de la nave de Space Invaders tras el trono.',
    usableAction: 'inspect',
  },
  'item-pase-travesia': {
    id: 'item-pase-travesia',
    name: 'Pase de Travesía de Isla Orígenes',
    category: 'llave',
    categoryLabel: 'PASAPORTE DE LIBERACIÓN',
    accentHex: '#f59e0b',
    shortCode: 'PAS-ORG',
    description:
      'Emblema de bronce dorado entregado por el Rey Donkey Kong tras ser purificado de Super KOOPA. Certifica la liberación completa de Isla Orígenes y autoriza el despegue en la nave de Space Invaders.',
    usageHint: 'Insértalo en la consola de la nave de Space Invaders en el hangar del trono para viajar a la Isla de los 80.',
    usableAction: 'inspect',
  },
  'item-nota-codigo-cofre': {
    id: 'item-nota-codigo-cofre',
    name: 'Nota código cofre',
    category: 'cinta-memoria',
    categoryLabel: 'NOTAS DE MISIÓN',
    accentHex: '#facc15',
    shortCode: 'COD-1972',
    description:
      'Nota entregada por el enviado del futuro. Registra el código del cofre del abuelo: 1972. Objeto permanente.',
    usageHint: 'Consúltala desde el inventario para recordar la combinación del cofre (1972).',
    usableAction: 'inspect',
  },
};

/* ============================================================================
   2. SISTEMA DE MISIONES DE LA ISLA DEL ORIGEN
   ============================================================================ */
export const RPG_QUESTS: RpgQuestSpec[] = [
  {
    id: 'quest-cueva-glitch-origen',
    code: 'MIS-ORIGEN',
    title: 'El Núcleo Glitch y el Cartucho Maestro ORIGEN',
    giverName: 'Consola del Núcleo de la Cueva Glitch',
    decadeTag: 'CUEVA GLITCH · ISLA DEL ORIGEN',
    accentHex: '#facc15',
    summary:
      'Supera las victorias reales de Pong, Breakout y Space Invaders (1.000+ PTS) para ingresar al laberinto digital. Reúne los tres fragmentos dentro de la cueva (Pulso, Circuito y Memoria) y estabiliza el núcleo en secuencia 1972 → 1976 → 1978 para forjar ORIGEN.',
    steps: [
      {
        label: 'Asegurar victorias en Pong (1972), Breakout (1976) y Space Invaders (1978, 1000+ PTS)',
        isDone: (st, all) =>
          all ||
          (Boolean(st.games['pong']?.memoryUnlocked) &&
            Boolean(st.games['breakout']?.memoryUnlocked) &&
            Boolean(st.games['space-invaders']?.memoryUnlocked) &&
            (st.games['space-invaders']?.bestScore ?? 0) >= 1000),
      },
      {
        label: 'Sector del Pulso: Alinear señal continua con su receptor',
        isDone: (st, all) =>
          all ||
          st.rpg.inventoryItems.includes('item-fragmento-pulso') ||
          st.rpg.inventoryItems.includes('item-cartucho-origen'),
      },
      {
        label: 'Sector de Circuitos: Activar interruptores en secuencia lógica (Beta → Alfa → Gamma)',
        isDone: (st, all) =>
          all ||
          st.rpg.inventoryItems.includes('item-fragmento-circuito') ||
          st.rpg.inventoryItems.includes('item-cartucho-origen'),
      },
      {
        label: 'Pasadizo Secreto: Descubrir pared oculta y resolver puzle de memoria fractal',
        isDone: (st, all) =>
          all ||
          st.rpg.inventoryItems.includes('item-fragmento-memoria') ||
          st.rpg.inventoryItems.includes('item-cartucho-origen'),
      },
      {
        label: 'Núcleo Central: Estabilizar resonadores en orden 1972 → 1976 → 1978 y recibir ORIGEN',
        isDone: (st, all) =>
          all ||
          Boolean(st.rpg.origenMasterStabilized) ||
          st.rpg.inventoryItems.includes('item-cartucho-origen'),
      },
    ],
    rewardSummary: 'Cartucho Maestro ORIGEN (Permanente y no consumible)',
    rewardItemIds: ['item-cartucho-origen'],
  },
  {
    id: 'quest-cuatro-caminos-dylan',
    code: 'MIS-4CAM',
    title: 'La Restauración de Los Cuatro Caminos',
    giverName: 'Custodio Rodo y Operadora Nora',
    decadeTag: 'CRUCE NORTE · LOS CUATRO CAMINOS',
    accentHex: '#38bdf8',
    summary:
      'Gran Koopa fundió los circuitos de las máquinas en el cruce de Los Cuatro Caminos. Habla con el técnico Dylan en Taller RS, adéntrate en la cueva a oscuras debajo de la cascada para superar el gabinete oculto de Night Driver (1976) y obtener el Núcleo Fotónico de Haluro, y escolta a Dylan hasta la sala para reactivar los gabinetes y despejar el paso al castillo.',
    steps: [
      {
        label: 'Hablar con los custodios en el cruce de Los Cuatro Caminos',
        isDone: (st, all) =>
          all ||
          st.island70s.talkedNpcIds.includes('npc-custodio-rodo') ||
          Boolean(st.rpg.cuatroCaminosRestored),
      },
      {
        label: 'Localizar al técnico Dylan en Taller RS — Retro State',
        isDone: (st, all) =>
          all ||
          st.island70s.talkedNpcIds.includes('npc-dylan-tecnico') ||
          Boolean(st.rpg.cuatroCaminosRestored),
      },
      {
        label: 'Entrar en la cueva oscura bajo la cascada y ganar Night Driver (1976) para obtener el Núcleo Fotónico de Haluro',
        isDone: (st, all) =>
          all ||
          st.rpg.inventoryItems.includes('item-nucleo-fotonico-nocturno') ||
          st.rpg.inventoryItems.includes('item-transistores-germanio') ||
          Boolean(st.rpg.germaniumTransistorsDelivered) ||
          Boolean(st.rpg.cuatroCaminosRestored),
      },
      {
        label: 'Entregar el Núcleo Fotónico de Haluro a Dylan y escoltarlo hasta Los Cuatro Caminos',
        isDone: (st, all) =>
          all ||
          Boolean(st.rpg.dylanEscortCompleted) ||
          Boolean(st.rpg.cuatroCaminosRestored),
      },
      {
        label: 'Presenciar la reactivación de las 4 máquinas (Lunar, Sea Wolf, Tank, Galaxian)',
        isDone: (st, all) => all || Boolean(st.rpg.cuatroCaminosRestored),
      },
      {
        label: 'Desbloquear el portal norte hacia el puente del castillo tras superar los hitos requeridos',
        isDone: (st, all) =>
          all ||
          (Boolean(st.rpg.cuatroCaminosRestored) &&
            Boolean(st.games['lunar-lander']?.memoryUnlocked) &&
            Boolean(st.games['sea-wolf']?.memoryUnlocked) &&
            Boolean(st.games['tank']?.memoryUnlocked) &&
            Boolean(st.games['galaxian']?.memoryUnlocked)),
      },
    ],
    rewardSummary: 'Reactivación de 4 arcades jugables + Acceso al Puente del Castillo',
    rewardItemIds: [],
  },
  {
    id: 'quest-pulso-1972',
    code: 'MIS-01',
    title: 'El Despertar en Las Praderas del Pixel',
    giverName: 'Bit-01 · Alcalde del Pueblo del Origen',
    decadeTag: 'ZONA 1 → ZONA 2 · PONG',
    accentHex: '#8cd96c',
    summary:
      'Recorre el Pueblo del Origen, atraviesa el Bosque de los Secretos hasta la Plaza Mayor y llega a Las Praderas del Pixel para jugar y restaurar Pong (1972).',
    steps: [
      {
        label: 'Orientarse en El Pueblo del Origen y cruzar hacia la Plaza Mayor',
        isDone: (st, all) =>
          all ||
          st.island70s.visitedZones.includes('ruinas-primer-arcade') ||
          Boolean(st.games['pong']?.memoryUnlocked),
      },
      {
        label: 'Restaurar Pong (1972) en Las Praderas del Pixel',
        isDone: (st, all) => all || Boolean(st.games['pong']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Tabla Planeadora de Pong + Lámpara de Fósforo [L]',
    rewardItemIds: ['item-lampara-fosforo'],
  },
  {
    id: 'quest-laser-seguridad',
    code: 'MIS-09',
    title: 'La Palanca y el Láser Dormido',
    giverName: 'Dylan · Taller Retro State TS',
    decadeTag: 'BOSQUE DE LAS SEÑALES · PASO AL SECTOR 03',
    accentHex: '#fb923c',
    summary:
      'El láser que sella el paso al Sector 03 se activó tras el Reinicio Cero. Dylan necesita transistores de germanio y componentes de estaño para preparar el soldador y reparar la palanca. Los materiales aguardan en un baúl del otro lado del lago del bosque, tras superar el desafío de Frogger.',
    steps: [
      {
        label: 'Hablar con Dylan en el Taller Retro State TS',
        isDone: (st, all) =>
          all ||
          st.island70s.talkedNpcIds.includes('npc-dylan-tecnico') ||
          st.rpg.questStates['quest-laser-seguridad'] !== undefined,
      },
      {
        label: 'Superar el desafío del gabinete Frogger cerca del lago del bosque',
        isDone: (st, all) => all || Boolean(st.games['frogger']?.memoryUnlocked),
      },
      {
        label: 'Abrir el cofre del lago y obtener los transistores de germanio y componentes de estaño',
        isDone: (st, all) =>
          all ||
          (st.rpg.inventoryItems.includes('item-transistores-germanio-lago') &&
            st.rpg.inventoryItems.includes('item-componentes-estano')) ||
          st.island70s.narrativeEvents.includes('origen-transistores-lago-entregados'),
      },
      {
        label: 'Entregar los componentes a Dylan y recibir el soldador de estaño',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-soldador-entregado'),
      },
      {
        label: 'Identificar y soldar los contactos fríos de la palanca',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-laser-controles-reparados'),
      },
      {
        label: 'Accionar la palanca y apagar el láser de seguridad',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-laser-desactivado'),
      },
    ],
    rewardSummary: 'Paso al Sector 03 abierto + Soldador de Estaño de Dylan',
    rewardItemIds: ['item-soldador-estaño'],
  },
  {
    id: 'quest-instalacion-oculta',
    code: 'MIS-10',
    title: 'Lo que el Láser Protegía',
    giverName: 'Instalación de Seguridad · Sector 03',
    decadeTag: 'SECTOR 03 · RESTOS BAJO LA HIEDRA',
    accentHex: '#67e8f9',
    summary:
      'Detrás del paso láser, una instalación antigua duerme cubierta de vegetación. Sus conductos están mudos y un panel incompleto sugiere que el sistema de seguridad no protegía la entrada, sino algo que aún espera más adelante.',
    steps: [
      {
        label: 'Cruzar el paso láser hacia el Sector 03',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-laser-desactivado'),
      },
      {
        label: 'Investigar la instalación cubierta por la vegetación',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-instalacion-investigada'),
      },
      {
        label: 'Descifrar el panel de control dañado y su registro incompleto',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-panel-instalacion-leido'),
      },
    ],
    rewardSummary: 'Nueva pista: una segunda compuerta marcada como PRIORIDAD CERO',
    rewardItemIds: [],
  },
  {
    id: 'quest-faro-reinicio',
    code: 'MIS-11',
    title: 'La Compuerta PRIORIDAD CERO',
    giverName: 'Compuerta del Faro · Costa de las Máquinas',
    decadeTag: 'ACANTILADO ORIENTAL · SECTOR 11',
    accentHex: '#7dd3fc',
    summary:
      'El registro de la instalación del Sector 03 señala una segunda compuerta PRIORIDAD CERO en el acantilado oriental. La onda expansiva del Reinicio Cero partió su circuito de sincronía. El abuelo guardaba una válvula de vacío de repuesto en la radio de la cabaña de Isla Natal: con ella, el Faro del Reinicio puede volver a abrirse.',
    steps: [
      {
        label: 'Inspeccionar la compuerta sellada del Faro en la Costa de las Máquinas',
        isDone: (st, all) => all || st.rpg.questStates['quest-faro-reinicio'] !== undefined,
      },
      {
        label: 'Volver a Isla Natal y recuperar la válvula de la radio del abuelo',
        isDone: (st, all) =>
          all ||
          st.rpg.inventoryItems.includes('item-valvula-vacio-abuelo') ||
          st.island70s.narrativeEvents.includes('isla-natal-valvula-entregada'),
      },
      {
        label: 'Instalar la válvula y abrir la compuerta PRIORIDAD CERO',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-faro-abierto'),
      },
      {
        label: 'Ascender al Faro del Reinicio y encender su baliza',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-faro-encendido'),
      },
    ],
    rewardSummary: 'Acceso al Faro del Reinicio + Lente de Fresnel en la terraza de la baliza',
    rewardItemIds: [],
  },
  {
    id: 'quest-generador-retrostate',
    code: 'MIS-00',
    title: 'La Pieza del Generador',
    giverName: 'Maestro Kertz · Retro State TS',
    decadeTag: 'BOSQUE DE LAS SEÑALES · SECTOR 03',
    accentHex: '#22c55e',
    summary:
      'El generador que alimenta el taller y sus máquinas está roto. Kertz necesita una pieza de repuesto custodiada por el Cruce de Circuitos, un prototipo arcade escondido en el bosque. Supera el desafío, entrega la pieza y devuelve la energía al taller.',
    steps: [
      {
        label: 'Escuchar al Maestro Kertz en Retro State TS',
        isDone: (st, all) =>
          all ||
          st.island70s.talkedNpcIds.includes('npc-maestro-kertz') ||
          st.rpg.questStates['quest-generador-retrostate'] !== undefined,
      },
      {
        label: 'Encontrar el gabinete «Cruce de Circuitos» en el bosque',
        isDone: (st, all) =>
          all || Boolean(st.games['frogger']?.started) || Boolean(st.games['frogger']?.completed),
      },
      {
        label: 'Superar el Cruce de Circuitos y obtener la pieza del generador',
        isDone: (st, all) =>
          all ||
          Boolean(st.games['frogger']?.memoryUnlocked) ||
          st.rpg.inventoryItems.includes('item-pieza-generador') ||
          st.island70s.narrativeEvents.includes('origen-pieza-entregada'),
      },
      {
        label: 'Entregar la pieza al Maestro Kertz',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-pieza-entregada'),
      },
      {
        label: 'Montar la pieza en el generador y estabilizar el taller',
        isDone: (st, all) =>
          all || st.island70s.narrativeEvents.includes('origen-generador-reparado'),
      },
    ],
    rewardSummary: 'Generador reparado + Taller Retro State TS energizado',
    rewardItemIds: [],
  },
  {
    id: 'quest-taller-ttl',
    code: 'MIS-02',
    title: 'El Artesano del Bosque de los Secretos',
    giverName: 'Maestro Kertz · Taller del Bosque',
    decadeTag: 'ZONA 3 · BOSQUE Y TÚNELES',
    accentHex: '#4ca64c',
    summary:
      'Encuentra el Condensador de Cuarzo en los Túneles Subterráneos y llévaselo al Maestro Kertz en el Taller del Bosque para forjar el Soldador Lógico.',
    steps: [
      {
        label: 'Conversar con el Maestro Kertz dentro del Taller del Bosque',
        isDone: (st, all) =>
          all ||
          st.island70s.talkedNpcIds.includes('npc-maestro-kertz') ||
          st.rpg.questStates['quest-taller-ttl'] === 'completed',
      },
      {
        label: 'Recuperar el Condensador de Cuarzo en los Túneles Subterráneos',
        isDone: (st, all) =>
          all || st.rpg.inventoryItems.includes('item-condensador-cuarzo'),
      },
      {
        label: 'Entregar el cuarzo en el Taller para recibir el Soldador Lógico',
        isDone: (st, all) =>
          all || st.rpg.questStates['quest-taller-ttl'] === 'completed',
      },
    ],
    rewardSummary: 'Soldador Lógico (Abre el atajo del Puente Costero)',
    rewardItemIds: ['item-soldador-logico'],
  },
  {
    id: 'quest-archivo-cartuchos',
    code: 'MIS-03',
    title: 'Los Cartuchos Perdidos de la Historia',
    giverName: 'Archivera Lira · Archivo Pionero',
    decadeTag: 'ZONA 1 Y ZONA 5 · EXPLORACIÓN',
    accentHex: '#f2c94c',
    summary:
      'Recupera los dos Cartuchos Históricos escondidos en la isla y resuelve las losetas I → II → III del Archivo para obtener el Buscador de Secretos.',
    steps: [
      {
        label: 'Hallar el Cartucho Alfa en la cala sur del Pueblo del Origen',
        isDone: (st, all) => all || st.rpg.inventoryItems.includes('item-cinta-alfa'),
      },
      {
        label: 'Hallar el Cartucho Beta en la gruta oculta tras la cascada',
        isDone: (st, all) => all || st.rpg.inventoryItems.includes('item-cinta-beta'),
      },
      {
        label: 'Resolver el acertijo de losetas (I → II → III) o informar a Lira',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-templo-losetas') ||
          st.rpg.questStates['quest-archivo-cartuchos'] === 'completed',
      },
    ],
    rewardSummary: 'Buscador de Secretos GBC [R]',
    rewardItemIds: ['item-escaner-frecuencias'],
  },
  {
    id: 'quest-secreto-cascada',
    code: 'MIS-04',
    title: 'Paredes Falsas y el Ermitaño del Agua',
    giverName: 'Ermitaño del Bit Cero',
    decadeTag: 'SECRETO · ZONA 3 Y ZONA 4',
    accentHex: '#c084fc',
    summary:
      'Descubre el pasadizo detrás del muro falso del Taller para obtener la Válvula de 1958 y entrégasela al Ermitaño detrás de la cascada norte.',
    steps: [
      {
        label: 'Abrir la pared falsa en el muro norte del Taller del Bosque',
        isDone: (st, all) =>
          all || st.rpg.discoveredSecretIds.includes('secret-muro-taller'),
      },
      {
        label: 'Recoger la Válvula Luminosa de 1958 en la cámara secreta',
        isDone: (st, all) =>
          all || st.rpg.inventoryItems.includes('item-reliquia-osciloscopio'),
      },
      {
        label: 'Cruzar la cascada con la Lámpara [L] y hablar con el Ermitaño',
        isDone: (st, all) =>
          all || st.rpg.questStates['quest-secreto-cascada'] === 'completed',
      },
    ],
    rewardSummary: 'Corona Dorada del Origen (Cosmético equipable)',
    rewardItemIds: ['item-manto-arquitecto'],
  },
  {
    id: 'quest-defensa-1978',
    code: 'MIS-05',
    title: 'La Fortaleza Volcánica y los 1.000 Puntos',
    giverName: 'Cartógrafo y Vigía del Cráter',
    decadeTag: 'ZONA 4 · LOGRO SPACE INVADERS',
    accentHex: '#f26419',
    summary:
      'Abre el puente hacia La Fortaleza Volcánica y alcanza 1.000 puntos en Space Invaders para desbloquear el Logro Persistente y el muelle costero.',
    steps: [
      {
        label: 'Cruzar El Sendero del Glitch Perdido para abrir el puente volcánico',
        isDone: (st, all) => all || st.island70s.glitchTrailCompleted,
      },
      {
        label: 'Alcanzar 1.000 puntos en Space Invaders (Logro Persistente)',
        isDone: (st, all) =>
          all ||
          Boolean(st.games['space-invaders']?.memoryUnlocked) ||
          st.rpg.achievementsUnlocked.includes('invaders-1000-pts'),
      },
    ],
    rewardSummary: 'Logro 1.000 PTS + Nave Estelar + Carta Náutica Costera',
    rewardItemIds: ['item-pase-astral-80s'],
  },
  {
    id: 'quest-despertar-1981',
    code: 'MIS-06',
    title: 'La Máquina del Tiempo y el Salto a los 80',
    giverName: 'Crono-0 & Capitana Vectoria',
    decadeTag: 'CRONOSCOPIO · VIAJE TEMPORAL',
    accentHex: '#00f3ff',
    summary:
      'Descubre la Máquina del Tiempo en Las Ruinas del Primer Pulso, sincroniza su energía completando los hitos de 1970 y viaja hacia la década de 1980.',
    steps: [
      {
        label: 'Descubrir la Máquina del Tiempo en el Observatorio del Cronoscopio',
        isDone: (st, all) =>
          all ||
          st.rpg.discoveredSecretIds.includes('secret-cronoscopio-hallado') ||
          st.rpg.discoveredSecretIds.includes('visited-island-80s'),
      },
      {
        label: 'Viajar a la década de 1980 y superar el desafío clásico de 1981',
        isDone: (st, all) => all || Boolean(st.games['donkey-kong']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Viaje Temporal 1980s + Emblema de las Vigas Rojas (1981)',
    rewardItemIds: ['item-insignia-vigas-1981'],
  },
  {
    id: 'quest-muro-1976',
    code: 'MIS-07',
    title: 'El Laberinto Oculto y el Muro de 1976',
    giverName: 'Curadora Sélene · Museo Viviente de los 70',
    decadeTag: 'SECRETO JUGABLE · BREAKOUT (1976)',
    accentHex: '#f97316',
    summary:
      'Investiga el pedestal cifrado del Museo Viviente, localiza la Escotilla Subterránea al norte de las Praderas de Pong, supera el Laberinto de Señales y restaura Breakout (1976).',
    steps: [
      {
        label: 'Visitar el Museo Viviente de los 70 en Las Ruinas del Primer Pulso',
        isDone: (st, all) =>
          all ||
          st.rpg.inspectedExhibitIds.length > 0 ||
          st.island70s.talkedNpcIds.includes('npc-curadora-selene'),
      },
      {
        label: 'Resolver el acertijo cromático RGB del Laberinto de Señales',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-laberinto-rgb-1976') ||
          Boolean(st.games['breakout']?.memoryUnlocked),
      },
      {
        label: 'Alcanzar 400 PTS en Breakout (1976) dentro de la Sala Secreta',
        isDone: (st, all) => all || Boolean(st.games['breakout']?.memoryUnlocked),
      },
    ],
    rewardSummary: 'Hito Jugable Breakout (1976) + Prisma Cromático TTL',
    rewardItemIds: ['item-prisma-breakout'],
  },
  {
    id: 'quest-casos-origen',
    code: 'MIS-08',
    title: 'Crónicas de Investigación de los Setenta',
    giverName: 'Sabio Orfeo & Curadora Sélene',
    decadeTag: 'MISTERIO · ARQUEOLOGÍA DIGITAL',
    accentHex: '#22d3ee',
    summary:
      'Examina placas del museo, estelas antiguas y guardianes luminosos para reunir pistas verificables y deducir los tres misterios históricos en tu Diario [Q].',
    steps: [
      {
        label: 'Reunir al menos 3 pistas arqueológicas en la Isla del Origen',
        isDone: (st, all) => all || st.rpg.discoveredClueIds.length >= 3,
      },
      {
        label: 'Resolver un Caso de Investigación mediante deducción en el Diario [Q]',
        isDone: (st, all) => all || st.rpg.solvedCaseIds.length >= 1,
      },
      {
        label: 'Completar los 3 Casos de Investigación de la década de 1970',
        isDone: (st, all) => all || st.rpg.solvedCaseIds.length >= 3,
      },
    ],
    rewardSummary: 'Logro Cronista de los 70 + Lámina de Celofán y Lente Vectorial',
    rewardItemIds: ['item-filtro-interdecada'],
  },
  {
    id: 'quest-castillo-rey-corrupto',
    code: 'MIS-09',
    title: 'El Castillo del Rey Corrupto',
    giverName: 'Eco de los Antiguos Guardianes',
    decadeTag: 'CORDILLERA NORTE · CASTILLO COLOSAL',
    accentHex: '#c084fc',
    summary:
      'Explora la cumbre norte, desactiva los cuatro sellos para bajar el puente levadizo, atraviesa el laberinto, los cimientos hidráulicos, la biblioteca y la torre del tiempo hasta la sala del trono para liberar a Donkey Kong de Super KOOPA.',
    steps: [
      {
        label: 'Activar los cuatro sellos de las torres (Sol ☀, Luna ☾, Estrella ★, Rayo ⚡) y bajar el puente',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-sellos-castillo') ||
          st.rpg.discoveredSecretIds.includes('castle-drawbridge-lowered'),
      },
      {
        label: 'Atravesar el Laberinto de las Doce Puertas y los Cimientos Hidráulicos',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-valvulas-hidraulicas') ||
          st.rpg.discoveredSecretIds.includes('castle-labyrinth-cleared'),
      },
      {
        label: 'Ordenar los cuatro fragmentos de la crónica en la Gran Biblioteca de los Reyes',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-cronica-reyes') ||
          st.rpg.discoveredSecretIds.includes('castle-library-cleared'),
      },
      {
        label: 'Sincronizar la Torre del Tiempo y alcanzar la Sala del Trono',
        isDone: (st, all) =>
          all ||
          st.rpg.solvedPuzzleIds.includes('puzzle-torre-tiempo') ||
          st.rpg.discoveredSecretIds.includes('castle-throne-reached'),
      },
      {
        label: 'Derrotar la Corrupción de Super KOOPA, liberar al Rey Donkey Kong y despegar en la Nave',
        isDone: (st, all) =>
          all ||
          Boolean(st.games['donkey-kong']?.memoryUnlocked) ||
          st.rpg.discoveredSecretIds.includes('castle-donkey-kong-freed'),
      },
    ],
    rewardSummary: 'Llave Maestra del Hangar + Nave Space Invaders + Paso a la Isla de los 80',
    rewardItemIds: ['item-llave-hangar-dk', 'item-insignia-vigas-1981'],
  },
];

/* ============================================================================
   3. EDIFICIOS EXPLORABLES CON ARQUITECTURA DIFERENCIADA DE PIXELVERSE
   ============================================================================ */
export const ISLAND_70S_BUILDINGS: ExteriorBuildingSpec[] = [
  {
    id: 'bldg-casa-historiador',
    name: 'Casa del Cronista · Archivo de los Orígenes',
    subtitle: 'Aldea de los Orígenes · Crónicas, mapas y jardín trasero secreto',
    archStyle: 'cottage-archive',
    x: 560,
    y: 1624,
    w: 144,
    h: 88,
    roofHex: '#c9923a',
    roofShadeHex: '#8a5a18',
    wallHex: '#b7a88c',
    trimHex: '#8a5a2c',
    signText: 'CRÓNICAS',
    doorX: 632,
    doorY: 1714,
    targetArea: 'interior-centro-historia',
    targetSpawnX: 360,
    targetSpawnY: 430,
    returnExteriorX: 632,
    returnExteriorY: 1738,
  },
  {
    id: 'bldg-casa-viejo-amigo',
    name: 'Casa del Viejo Amigo · Guardián de la Cala',
    subtitle: 'Cala de llegada · Hogar del amigo del abuelo, junto al muelle',
    archStyle: 'cottage-archive',
    x: 620,
    y: 2088,
    w: 144,
    h: 88,
    roofHex: '#8f6a3c',
    roofShadeHex: '#5c4020',
    wallHex: '#c7b493',
    trimHex: '#6b4a26',
    signText: 'CASA',
    doorX: 692,
    doorY: 2174,
    targetArea: 'interior-centro-historia',
    targetSpawnX: 360,
    targetSpawnY: 430,
    returnExteriorX: 692,
    returnExteriorY: 2190,
  },
  {
    id: 'bldg-taller-alcorn',
    name: 'Retro State TS · Taller de Pixel',
    subtitle: 'Bosque de las Señales · Generador, osciloscopios y el cartucho del Cruce de Circuitos',
    archStyle: 'forest-workshop',
    x: 944,
    y: 936,
    w: 148,
    h: 88,
    roofHex: '#c08a32',
    roofShadeHex: '#7a5218',
    wallHex: '#c4b49a',
    trimHex: '#5c3a1e',
    signText: 'RETRO STATE TS',
    doorX: 1018,
    doorY: 1026,
    targetArea: 'interior-taller-alcorn',
    targetSpawnX: 380,
    targetSpawnY: 438,
    returnExteriorX: 1018,
    returnExteriorY: 1052,
  },
  {
    id: 'bldg-templo-pioneros',
    name: 'Santuario del Archivo Pionero',
    subtitle: 'Ruinas del Primer Pulso · Cartuchos perdidos y losetas armónicas',
    archStyle: 'ruins-sanctuary',
    x: 1852,
    y: 1094,
    w: 168,
    h: 92,
    roofHex: '#5d6d82',
    roofShadeHex: '#3d4a5c',
    wallHex: '#b8ad98',
    trimHex: '#c4b08a',
    signText: 'ARCHIVO',
    doorX: 1936,
    doorY: 1188,
    targetArea: 'interior-templo-pioneros',
    targetSpawnX: 410,
    targetSpawnY: 462,
    returnExteriorX: 1936,
    returnExteriorY: 1216,
  },
  {
    id: 'bldg-cronoscopio-origen',
    name: 'Observatorio del Cronoscopio',
    subtitle: 'Instalación ancestral que alberga la Máquina del Tiempo de PIXELVERSE',
    archStyle: 'chrono-dome',
    x: 2068,
    y: 1094,
    w: 164,
    h: 92,
    roofHex: '#0e7490',
    roofShadeHex: '#164e63',
    wallHex: '#cbd5e1',
    trimHex: '#00f3ff',
    signText: 'CRONOSCOPIO',
    doorX: 2150,
    doorY: 1188,
    targetArea: 'interior-cronoscopio',
    targetSpawnX: 410,
    targetSpawnY: 468,
    returnExteriorX: 2150,
    returnExteriorY: 1216,
  },
  {
    id: 'bldg-museo-viviente',
    name: 'Museo Viviente de los 70 · Galería del Origen',
    subtitle: 'Ruinas del Primer Pulso · Exhibiciones históricas (1971–1979), pedestales interactivos y proyector vectorial',
    archStyle: 'museum-hall',
    x: 1548,
    y: 944,
    w: 184,
    h: 92,
    roofHex: '#9a3228',
    roofShadeHex: '#6b1c18',
    wallHex: '#b8ad98',
    trimHex: '#c4b08a',
    signText: 'MUSEO 1970s',
    doorX: 1640,
    doorY: 1038,
    targetArea: 'interior-museo-viviente',
    targetSpawnX: 490,
    targetSpawnY: 496,
    returnExteriorX: 1640,
    returnExteriorY: 1068,
  },
  {
    id: 'bldg-archivo-cartografia-norte',
    name: 'Archivo de Cartografía Polar',
    subtitle: 'Cordillera del Primer Pulso · Cartas de ruta y registros de aurora',
    archStyle: 'cottage-archive',
    x: 1168,
    y: -248,
    w: 144,
    h: 88,
    roofHex: '#6a7c92',
    roofShadeHex: '#3e4c5c',
    wallHex: '#c2b8a4',
    trimHex: '#8a5a2c',
    signText: 'CARTOGRAFÍA',
    doorX: 1240,
    doorY: -158,
    targetArea: 'interior-archivo-norte',
    targetSpawnX: 360,
    targetSpawnY: 430,
    returnExteriorX: 1240,
    returnExteriorY: -126,
  },
  {
    id: 'bldg-observatorio-boreal',
    name: 'Estación de Señales Boreales',
    subtitle: 'Cordillera del Primer Pulso · Lentes y receptores de larga distancia',
    archStyle: 'chrono-dome',
    x: 2528,
    y: -232,
    w: 160,
    h: 92,
    roofHex: '#0e7490',
    roofShadeHex: '#164e63',
    wallHex: '#cbd5e1',
    trimHex: '#a5f3fc',
    signText: 'ESTACIÓN',
    doorX: 2608,
    doorY: -138,
    targetArea: 'interior-observatorio-boreal',
    targetSpawnX: 360,
    targetSpawnY: 430,
    returnExteriorX: 2608,
    returnExteriorY: -106,
  },
  {
    id: 'bldg-sala-cuatro-caminos',
    name: 'Sala Arcade de Los Cuatro Caminos',
    subtitle: 'Cordillera del Primer Pulso · Salón recreativo clausurado',
    archStyle: 'arcade-hall',
    x: 1660,
    y: -420,
    w: 170,
    h: 96,
    roofHex: '#3b2a1f',
    roofShadeHex: '#1c120c',
    wallHex: '#4a3323',
    trimHex: '#f59e0b',
    signText: 'ARCADE 4 CAMINOS',
    doorX: 1745,
    doorY: -326,
    targetArea: 'interior-sala-cuatro-caminos',
    targetSpawnX: 620,
    targetSpawnY: 690,
    returnExteriorX: 1745,
    returnExteriorY: -304,
  },
];

/* ============================================================================
   3B. PORTALES ANÓMALOS ENTRE SECTORES Y CÁMARAS OCULTAS
   ============================================================================ */
export const ISLAND_ANOMALY_PORTALS: AnomalyPortalSpec[] = [
  {
    id: 'portal-aldea-mirador',
    name: 'Portal Anómalo del Mirador Sur',
    subtitle: 'Fractura armónica conectada con Las Ruinas del Primer Pulso',
    x: 976,
    y: 1876,
    style: 'glyph-shortcut',
    accentHex: '#00f3ff',
    requiredSecretIds: ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'],
    targetKind: 'exterior-coords',
    destX: 1856,
    destY: 1684,
    destFacing: 'up',
    dormantTitle: 'Portal Anómalo Inactivo · Resonancia Incompleta',
    dormantLore: [
      'Un arco de piedra y cátodos antiguos vibra débilmente frente al mar. Tres ranuras vacías muestran símbolos geométricos apagados: [ ◈ ] · [ ◈◈ ] · [ ◈◈◈ ].',
      'Quien sintonice los tres Símbolos del Primer Pulso tallados en la Aldea, el Bosque de las Señales y la Terraza Costera abrirá este puente instantáneo entre sectores.',
    ],
    dormantHint: 'Busca monolitos con glifos brillantes en la Aldea (Sur), el Bosque (Norte) y la Terraza de Pong (Sureste).',
    activeToast: '¡Portal Anómalo cruzado! Emerges en la terraza sur de Las Ruinas del Primer Pulso',
  },
  {
    id: 'portal-ruinas-sur',
    name: 'Portal Anómalo de las Ruinas',
    subtitle: 'Fractura armónica conectada con el Mirador de la Aldea',
    x: 1856,
    y: 1648,
    style: 'glyph-shortcut',
    accentHex: '#00f3ff',
    requiredSecretIds: ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'],
    targetKind: 'exterior-coords',
    destX: 944,
    destY: 1876,
    destFacing: 'left',
    dormantTitle: 'Portal Anómalo de las Ruinas (Latente)',
    dormantLore: [
      'El núcleo cristalino de este portal aguarda la alineación de los tres Símbolos del Primer Pulso repartidos por la Isla del Origen.',
    ],
    dormantHint: 'Usa el Escáner [R] o explora los rincones de la Aldea, el Bosque y la Costa de Pong para hallar los 3 glifos.',
    activeToast: '¡Portal Anómalo cruzado! Regresas al Mirador Costero de La Aldea de los Orígenes',
  },
  {
    id: 'portal-caverna-boveda',
    name: 'Portal Abisal de Memoria',
    subtitle: 'Anomalía subterránea hacia la Cámara Oculta del Cronoscopio',
    x: 600,
    y: 500,
    style: 'abyssal-chamber',
    accentHex: '#c084fc',
    targetKind: 'sub-area',
    targetArea: 'chamber-boveda-cronoscopio',
    destX: 380,
    destY: 428,
    destFacing: 'up',
    returnExteriorX: 600,
    returnExteriorY: 540,
    dormantTitle: 'Portal Abisal de Memoria',
    dormantLore: [],
    dormantHint: '',
    activeToast: 'Atravesando anomalía subterránea · Cámara Abisal del Cronoscopio',
  },
];

export const TIME_MACHINE_CONSOLE = {
  id: 'console-cronoscopio-central',
  x: 410,
  y: 235,
};

export interface TimeMachineProgressStatus {
  discovered: boolean;
  pongReady: boolean;
  glitchReady: boolean;
  invadersReady: boolean;
  archaeologyReady: boolean;
  syncedCount: number; // 0..4
  canTravelTo80s: boolean;
  stageNumber: 1 | 2 | 3 | 4;
}

export function evaluateTimeMachineStatus(
  state: PixelverseProgressState,
  allUnlocked: boolean
): TimeMachineProgressStatus {
  const discovered =
    allUnlocked || state.rpg.discoveredSecretIds.includes('secret-cronoscopio-hallado');
  const pongReady = allUnlocked || Boolean(state.games['pong']?.memoryUnlocked);
  const glitchReady =
    allUnlocked ||
    Boolean(state.island70s.glitchTrailCompleted) ||
    Boolean(state.games['glitch-trail']?.completed);
  const invadersReady =
    allUnlocked || Boolean(state.games['space-invaders']?.memoryUnlocked);
  const glyphsAll =
    state.rpg.discoveredSecretIds.includes('secret-glyph-1') &&
    state.rpg.discoveredSecretIds.includes('secret-glyph-2') &&
    state.rpg.discoveredSecretIds.includes('secret-glyph-3');
  const archaeologyReady =
    allUnlocked ||
    state.rpg.inventoryItems.includes('item-bobina-temporal') ||
    glyphsAll;

  const syncedCount =
    (pongReady ? 1 : 0) +
    (glitchReady ? 1 : 0) +
    (invadersReady ? 1 : 0) +
    (archaeologyReady ? 1 : 0);

  const canTravelTo80s = pongReady && glitchReady && invadersReady;
  const stageNumber: 1 | 2 | 3 | 4 = canTravelTo80s
    ? 4
    : syncedCount >= 2
    ? 3
    : syncedCount >= 1 || discovered
    ? 2
    : 1;

  return {
    discovered,
    pongReady,
    glitchReady,
    invadersReady,
    archaeologyReady,
    syncedCount,
    canTravelTo80s,
    stageNumber,
  };
}

/* Punto de Guardado en Zona 1 — El Pueblo del Origen */
export const VILLAGE_SAVE_TERMINAL = {
  id: 'save-pueblo-origen',
  label: 'Bitácora de Guardado · Pueblo del Origen',
  x: 416,
  y: 1744,
};

/* Carteles de Orientación estilo Game Boy Color en las 5 Grandes Zonas */
export const ISLAND_WOODEN_SIGNS: WoodenSignSpec[] = [
  {
    id: 'sign-id-costa',
    label: 'Leer cartel',
    x: 480,
    y: 1760,
    zoneTitle: 'ALDEA DE LOS ORÍGENES',
    lines: ['Sector 01', 'Aquí comenzó la historia del primer píxel.'],
    large: false,
  },
  {
    id: 'sign-id-bosque',
    label: 'Leer cartel',
    x: 750,
    y: 1380,
    zoneTitle: 'BOSQUE DE LAS SEÑALES',
    lines: ['Sector 02', 'Árboles monumentales y raíces de cobre.'],
    large: false,
  },
  {
    id: 'sign-id-ruinas',
    label: 'Leer cartel',
    x: 1550,
    y: 1200,
    zoneTitle: 'PLAZA DEL PRIMER PULSO',
    lines: ['Sector 03', 'Centro neurálgico de la arqueología digital.'],
    large: false,
  },
  {
    id: 'sign-id-pong',
    label: 'Leer cartel',
    x: 2350,
    y: 1550,
    zoneTitle: 'PRADERAS DEL PIXEL',
    lines: ['Sector 04', 'Santuario de la paleta fundacional.'],
    large: false,
  },
  {
    id: 'sign-id-fortaleza',
    label: 'Leer cartel',
    x: 2000,
    y: 720,
    zoneTitle: 'BASTIÓN DE LAS OLEADAS',
    lines: ['Sector 06', 'Territorio de basalto y fuego ígneo.'],
    large: false,
  },
  {
    id: 'sign-id-cavernas',
    label: 'Leer cartel',
    x: 550,
    y: 500,
    zoneTitle: 'CAVERNAS DE MEMORIA',
    lines: ['Sector 07', 'El Portal Abisal late en la profundidad.'],
    large: false,
  },
  {
    id: 'sign-id-puerto',
    label: 'Leer cartel',
    x: 3150,
    y: 1050,
    zoneTitle: 'COSTA DE LAS MÁQUINAS',
    lines: ['Sector 09', 'Punto de partida hacia nuevas eras.'],
    large: false,
  },
  {
    id: 'sign-id-faro',
    label: 'Leer cartel',
    x: 3488,
    y: 1570,
    zoneTitle: 'EL FARO DEL REINICIO',
    lines: [
      'Sector 11',
      'La baliza que vigilaba el archipiélago antes del Reinicio Cero.',
    ],
    large: false,
  },
  {
    id: 'sign-cuatro-caminos-arcade',
    label: 'Cartel de Madera · Sala de Los Cuatro Caminos',
    x: 1868,
    y: -330,
    zoneTitle: 'SALA DE LOS CUATRO CAMINOS',
    lines: [
      '▲ NORTE: Puente levadizo y portón del castillo de Gran Koopa.',
      '◀ OESTE: Entrada al salón arcade clausurado. Las máquinas del interior llevan años sin energía.',
      '▼ SUR: Cruce de los cuatro gabinetes recuperables: Lunar Lander, Sea Wolf, Tank y Galaxian.',
    ],
    mapLabel: '4 CAMINOS',
    large: true,
  },
];

/* Túneles subterráneos ocultos bajo rocas que conectan la Costa con las Cuevas */
export const COASTAL_SUBTERRANEAN_TUNNELS: TunnelPortalSpec[] = [
  {
    id: 'tunnel-pueblo-to-caverna',
    label: 'Roca Hueca Costera · Entrada a Túnel Subterráneo',
    actionLabel: 'Descender al Túnel',
    x: 272,
    y: 1656,
    destX: 304,
    destY: 736,
    destFacing: 'up',
    toastText: 'Túnel Costero atravesado · Emerges en las Cuevas del Tiempo (Norte)',
    secretId: 'secret-tunel-costero',
  },
  {
    id: 'tunnel-caverna-to-pueblo',
    label: 'Escalinata de Roca · Regreso a la Costa del Pueblo',
    actionLabel: 'Subir a la Costa Sur',
    x: 304,
    y: 760,
    destX: 272,
    destY: 1684,
    destFacing: 'down',
    toastText: 'Regresaste por el túnel subterráneo al Pueblo del Origen',
  },
  {
    id: 'tunnel-ruinas-tiempo-to-caverna',
    label: 'Gruta Marina en las Ruinas del Tiempo',
    actionLabel: 'Cruzar Pasadizo Subterráneo',
    x: 3056,
    y: 1520,
    destX: 1008,
    destY: 648,
    destFacing: 'left',
    toastText: 'Atajo subterráneo completado · Conectaste la Costa Este con el Túnel Central',
    secretId: 'secret-tunel-ruinas-tiempo',
  },
  {
    id: 'tunnel-caverna-east-to-ruinas',
    label: 'Galería Submarina · Salida a las Ruinas del Tiempo',
    actionLabel: 'Salir a la Costa Este',
    x: 1040,
    y: 640,
    destX: 3056,
    destY: 1488,
    destFacing: 'down',
    toastText: 'Emerges frente al mar en La Costa y las Ruinas del Tiempo',
  },
];

/* Pasaje secreto tras la cascada en el Paso Volcánico */
export const WATERFALL_SECRET_ENTRANCE = {
  id: 'waterfall-grotto-entry',
  x: 2088,
  y: 748,
  targetArea: 'cave-gruta-cascada' as RpgAreaId,
  targetSpawnX: 390,
  targetSpawnY: 455,
  returnExteriorX: 2062,
  returnExteriorY: 752,
};

export const ISLAND_NORTH_CAVE_ENTRANCES: IslandCaveEntranceSpec[] = [
  {
    id: 'north-cave-aurora-entry',
    label: 'Cavidad de la Aurora',
    actionLabel: 'Entrar en la Cavidad',
    x: 1392,
    y: -144,
    accentHex: '#67e8f9',
    targetArea: 'cave-cavidad-aurora',
    targetSpawnX: 360,
    targetSpawnY: 430,
    returnExteriorX: 1392,
    returnExteriorY: -112,
    secretId: 'secret-cavidad-aurora',
  },
  {
    id: 'north-cave-echo-entry',
    label: 'Cámara del Eco Boreal',
    actionLabel: 'Descender a la Cámara',
    x: 2848,
    y: -128,
    accentHex: '#a5f3fc',
    targetArea: 'cave-camara-eco',
    targetSpawnX: 360,
    targetSpawnY: 430,
    returnExteriorX: 2848,
    returnExteriorY: -96,
    secretId: 'secret-camara-eco-boreal',
  },
];

/* Embarcadero en La Costa y las Ruinas del Tiempo hacia la siguiente isla */
export const HARBOR_80S_FERRY = {
  id: 'ferry-to-80s',
  x: 3255,
  y: 1125,
  targetArea: 'island-80s' as RpgAreaId,
  targetSpawnX: 190,
  targetSpawnY: 360,
  returnExteriorX: 3215,
  returnExteriorY: 1155,
};

/* Mecanismo averiado reparable con el Soldador Lógico al sur de la Plaza */
export const BROKEN_RELAY_MECHANISM = {
  id: 'mech-ruinas-puente',
  label: 'Mecanismo Antiguo del Puente Costero',
  x: 1745,
  y: 1618,
  accentHex: '#4ca64c',
};

/* ============================================================================
   4. COFRES PERSISTENTES EN LA ISLA DEL ORIGEN, CUEVAS E ISLA 80s
   ============================================================================ */
export const RPG_CHESTS: RpgChestSpec[] = [
  {
    id: 'chest-glitch-memoria',
    areaId: 'dungeon-cueva-glitch',
    label: 'Arca de la Memoria Fractal (1978)',
    x: 1040,
    y: 160,
    accentHex: '#c084fc',
    rewardItemIds: ['item-fragmento-memoria'],
    requiresPuzzleId: 'puzzle-glitch-fractal',
  },
  {
    id: 'chest-costa-cala',
    areaId: 'exterior-70s',
    label: 'Cofre de la Cala del Pueblo',
    x: 248,
    y: 1925,
    accentHex: '#5cc8ff',
    rewardItemIds: ['item-cinta-alfa'],
  },
  {
    id: 'chest-pueblo-trasero',
    areaId: 'exterior-70s',
    label: 'Cofre Oculto Tras el Centro de Historia',
    x: 632,
    y: 1556,
    accentHex: '#f2c94c',
    rewardItemIds: ['item-visor-vectorial'],
  },
  {
    id: 'chest-bosque-arboles',
    areaId: 'exterior-70s',
    label: 'Cofre Escondido Entre los Árboles del Bosque',
    x: 608,
    y: 896,
    accentHex: '#8cd96c',
    rewardItemIds: ['item-mapa-secreto-isla'],
  },
  {
    id: 'chest-lago-germanio',
    areaId: 'exterior-70s',
    label: 'Cofre de Componentes del Lago',
    x: 620,
    y: 1358,
    accentHex: '#fb923c',
    rewardItemIds: ['item-transistores-germanio-lago', 'item-componentes-estano'],
  },
  {
    id: 'chest-faro-lente',
    areaId: 'exterior-70s',
    label: 'Arcón de la Terraza del Faro',
    x: 4300,
    y: 1720,
    accentHex: '#fde68a',
    rewardItemIds: ['item-lente-fresnel'],
  },
  {
    id: 'chest-caverna-cuarzo',
    areaId: 'exterior-70s',
    label: 'Cofre de Cuarzo Subterráneo',
    x: 615,
    y: 425,
    accentHex: '#c084fc',
    rewardItemIds: ['item-condensador-cuarzo'],
  },
  {
    id: 'chest-secreto-1958',
    areaId: 'secret-camara-osciloscopio',
    label: 'Arca Fundacional de 1958',
    x: 380,
    y: 175,
    accentHex: '#5cc8ff',
    rewardItemIds: ['item-reliquia-osciloscopio', 'item-llave-binaria'],
  },
  {
    id: 'chest-templo-boveda',
    areaId: 'interior-templo-pioneros',
    label: 'Cofre Armónico del Archivo',
    x: 410,
    y: 158,
    accentHex: '#f2c94c',
    rewardItemIds: ['item-escaner-frecuencias'],
    requiresPuzzleId: 'puzzle-templo-losetas',
  },
  {
    id: 'chest-gruta-cascada',
    areaId: 'cave-gruta-cascada',
    label: 'Cofre Sumergido tras la Cascada',
    x: 610,
    y: 205,
    accentHex: '#fbbf24',
    rewardItemIds: ['item-cinta-beta'],
    requiresLanternInDark: true,
  },
  {
    id: 'chest-boveda-bobina',
    areaId: 'chamber-boveda-cronoscopio',
    label: 'Relicario de la Cámara Abisal',
    x: 380,
    y: 172,
    accentHex: '#00f3ff',
    rewardItemIds: ['item-bobina-temporal'],
  },
  {
    id: 'chest-80s-callejon',
    areaId: 'island-80s',
    label: 'Cofre Cerrado del Callejón 1980',
    x: 865,
    y: 185,
    accentHex: '#f43f5e',
    rewardItemIds: ['item-visor-vectorial'],
    requiresItemId: 'item-llave-binaria',
  },
  {
    id: 'chest-museo-vectorial',
    areaId: 'interior-museo-viviente',
    label: 'Vitrinario Vectorial XY (1979)',
    x: 490,
    y: 242,
    accentHex: '#a78bfa',
    rewardItemIds: ['item-lente-vectorial-79'],
    requiresPuzzleId: 'puzzle-museo-vector-79',
  },
  {
    id: 'chest-sala-breakout',
    areaId: 'secret-sala-breakout',
    label: 'Arca Prototipo de Cuatro Noches (1976)',
    x: 590,
    y: 205,
    accentHex: '#f97316',
    rewardItemIds: ['item-llave-binaria'],
  },
  {
    id: 'chest-cavidad-aurora',
    areaId: 'cave-cavidad-aurora',
    label: 'Archivo Sellado de la Aurora',
    x: 570,
    y: 188,
    accentHex: '#67e8f9',
    rewardItemIds: ['item-memoria-aurora'],
    requiresPuzzleId: 'puzzle-aurora-3-nodos',
  },
  {
    id: 'chest-camara-eco-boreal',
    areaId: 'cave-camara-eco',
    label: 'Relicario del Eco Boreal',
    x: 570,
    y: 188,
    accentHex: '#a5f3fc',
    rewardItemIds: ['item-cristal-armonico'],
    requiresPuzzleId: 'puzzle-eco-4-frecuencias',
  },
  {
    id: 'chest-laberinto-secreto',
    areaId: 'castle-laberinto',
    label: 'Arcón de las Doce Puertas',
    x: 780,
    y: 160,
    accentHex: '#818cf8',
    rewardItemIds: ['item-cronica-fragmento-1'],
  },
  {
    id: 'chest-cimientos-vapor',
    areaId: 'castle-cimientos',
    label: 'Cámara Estanca de los Cimientos',
    x: 760,
    y: 180,
    accentHex: '#06b6d4',
    rewardItemIds: ['item-nucleo-vital-castillo'],
    requiresPuzzleId: 'puzzle-valvulas-hidraulicas',
  },
  {
    id: 'chest-biblioteca-arcano',
    areaId: 'castle-biblioteca',
    label: 'Atril de Manuscritos Prohibidos',
    x: 180,
    y: 180,
    accentHex: '#f59e0b',
    rewardItemIds: ['item-cronica-fragmento-2', 'item-cronica-fragmento-3'],
  },
  {
    id: 'chest-torre-archivo',
    areaId: 'castle-torre',
    label: 'Relicario del Péndulo Boreal',
    x: 780,
    y: 220,
    accentHex: '#fbbf24',
    rewardItemIds: ['item-cronica-fragmento-4'],
    requiresPuzzleId: 'puzzle-torre-tiempo',
  },
];

/* ============================================================================
   5. OBJETOS EXAMINABLES, SÍMBOLOS DEL PULSO, PAREDES FALSAS Y SECRETOS
   ============================================================================ */
export const RPG_EXAMINABLES: RpgExaminableSpec[] = [
  // --- CALA DE LLEGADA · PUENTE DEL ASENTAMIENTO ---
  {
    id: 'exam-puente-cala',
    areaId: 'exterior-70s',
    label: 'Mecanismo del Puente de la Cala',
    actionLabel: 'Examinar Mecanismo',
    x: 624,
    y: 1912,
    accentHex: '#f59e0b',
    category: 'COSTA DE LLEGADA · PUENTE LEVADIZO',
    paragraphs: [
      'El torno del puente gira en vacío: falta la rueda dentada que transmite la fuerza al mecanismo de las vigas. Sin ella, el canal que separa la playa del asentamiento permanece infranqueable.',
      'El viejo amigo de la familia asegura que el engranaje quedó enterrado en la arena cuando el temblor quebró el puente.',
    ],
    hint: 'Usa el Pulso Sonar (no consume energía) cerca de la orilla para desenterrar el engranaje y montalo aquí.',
  },
  // --- TALLER RETRO STATE TS · GENERADOR ---
  {
    id: 'exam-generador-retrostate',
    areaId: 'interior-taller-alcorn',
    label: 'Generador del Sector 03',
    actionLabel: 'Examinar Generador',
    x: 380,
    y: 188,
    accentHex: '#22c55e',
    category: 'RETRO STATE TS · SALA DE MÁQUINAS',
    paragraphs: [
      'Un generador de hierro y cobre alimenta las líneas del taller: lámparas, tornos y las placas de los gabinetes.',
      'El conmutador de potencia está reventado. Sin la pieza de repuesto el taller seguirá a oscuras, aunque la compuerta del bosque responde a la palanca de seguridad.',
    ],
    hint: 'Habla con el Maestro Kertz para conseguir la pieza que falta.',
  },
  // --- PASO AL SECTOR 03 · PALANCA DEL LÁSER DE SEGURIDAD ---
  {
    id: 'exam-palanca-laser',
    areaId: 'exterior-70s',
    label: 'Consola de la Palanca de Seguridad',
    actionLabel: 'Examinar Consola',
    x: 1398,
    y: 1312,
    accentHex: '#f97316',
    category: 'SECTOR 03 · SISTEMA DE SEGURIDAD AUTOMÁTICO',
    paragraphs: [
      'Una palanca de bronce emerge de una consola de baquelita. Los indicadores siguen en rojo: el láser de seguridad continúa alimentado.',
      'La orden de apagado existe, pero el mecanismo electrónico que la transmite ya no responde. El Reinicio Cero fundió parte de sus contactos.',
    ],
    hint: 'Dylan, el técnico del Taller Retro State TS, sabe cómo devolverle la voz a esta palanca.',
  },
  // --- SECTOR 03 · RESTOS DE LA INSTALACIÓN QUE EL LÁSER PROTEGÍA ---
  {
    id: 'exam-instalacion-seguridad',
    areaId: 'exterior-70s',
    label: 'Instalación Cubierta por la Vegetación',
    actionLabel: 'Investigar Instalación',
    x: 1524,
    y: 1360,
    accentHex: '#67e8f9',
    category: 'SECTOR 03 · RESTOS DE UNA INSTALACIÓN ANTIGUA',
    paragraphs: [
      'Bajo la hiedra asoman placas de hormigón, antenas dobladas y conductos de cobre que ya no zumban. No es una ruina cualquiera: alguien construyó este lugar para vigilar el paso.',
      'Las marcas del Reinicio Cero recorren los muros como grietas de calor. El sistema láser no era el único mecanismo afectado: otros conductos también quedaron mudos.',
    ],
    hint: 'Hay un panel de control semienterrado junto a los restos. Examinalo.',
  },
  {
    id: 'exam-panel-instalacion',
    areaId: 'exterior-70s',
    label: 'Panel de Control Semienterrado',
    actionLabel: 'Leer Panel Dañado',
    x: 1576,
    y: 1376,
    accentHex: '#22d3ee',
    category: 'SECTOR 03 · REGISTRO INCOMPLETO DEL SISTEMA',
    paragraphs: [
      'La pantalla del panel parpadea con datos incompletos. Reconoce conexiones con el acueducto del Claro de Pong y con el observatorio del Cronoscopio, pero todas figuran sin respuesta desde el Reinicio Cero.',
      'En el borde inferior queda una silueta borroneada: una segunda compuerta, más al norte, marcada como PRIORIDAD CERO. El sistema de seguridad no protegía este paso: protegía lo que hay detrás de él.',
    ],
    hint: 'Nuevo objetivo: investigar la instalación y descubrir qué protegía realmente el sistema de seguridad.',
  },
  // --- BOSQUE · GABINETE DEL DESAFÍO ---
  {
    id: 'exam-gabinete-circuito-anfibio',
    areaId: 'exterior-70s',
    label: 'Gabinete Frogger «Cruce de Circuitos» (1979)',
    actionLabel: 'Jugar Frogger (E)',
    x: 856,
    y: 1344,
    accentHex: '#22c55e',
    category: 'LAGO DEL BOSQUE · GABINETE FROGGER',
    paragraphs: [
      'Un gabinete arcade ubicado físicamente junto a la orilla del lago del bosque.',
      'En la pequeña isla del centro del lago se divisa el cofre que guarda los materiales requeridos. Superá el minijuego Frogger para cruzar el lago y acceder al cofre.',
    ],
    hint: 'Presioná [E] para iniciar el desafío Frogger y cruzar el lago.',
  },
  // --- CUEVA GLITCH RPG EXAMINABLES ---
  {
    id: 'exam-glitch-reflector',
    areaId: 'dungeon-cueva-glitch',
    label: 'Prisma de Fase Cuántica · Sintonizador 1972',
    actionLabel: 'Orientar Prisma',
    x: 260,
    y: 640,
    accentHex: '#00f3ff',
    category: 'SECTOR DEL PULSO · CUEVA GLITCH',
    paragraphs: [
      'Un prisma de cristal puro sobre un pedestal electromagnético. Refleja el haz de fotones cian emitido desde el oscilador sur.',
      'Al pulsar la acción, el prisma rota 90 grados, alineando el haz con el receptor cuántico del norte.',
    ],
    hint: 'Orienta el prisma hacia el norte para que el haz incida directamente en el receptor.',
  },
  {
    id: 'exam-glitch-receptor',
    areaId: 'dungeon-cueva-glitch',
    label: 'Receptor de Pulso Continuo (1972)',
    actionLabel: 'Sintonizar Señal de Pulso',
    x: 260,
    y: 500,
    accentHex: '#38bdf8',
    category: 'SECTOR DEL PULSO · CUEVA GLITCH',
    paragraphs: [
      'Célula fotovoltaica calibrada para absorber exactamente la longitud de onda de 1972.',
      'Cuando el haz del reflector incide sobre el centro, el cristal brilla con intensidad y libera el Fragmento de Pulso.',
    ],
    hint: 'Gira el prisma al sur hasta que la luz láser impacte en este receptor.',
  },
  {
    id: 'exam-glitch-clue-ttl',
    areaId: 'dungeon-cueva-glitch',
    label: 'Terminal de Registro TTL 1976',
    actionLabel: 'Leer Registro Lógico',
    x: 840,
    y: 730,
    accentHex: '#f59e0b',
    category: 'SECTOR DE CIRCUITOS · REGISTRO TTL',
    paragraphs: [
      '«REGISTRO LÓGICO DE COMPUERTAS 1976: Los tres interruptores no deben activarse al azar.»',
      '«Para evitar la sobrecarga y liberar el fragmento, activa primero el intermediador intermedio [BETA 1976], luego la alimentación base [ALFA 1972], y por último la compuerta de salida [GAMMA 1978].»',
    ],
    hint: 'Secuencia de activación de interruptores: BETA → ALFA → GAMMA.',
    clueIdToDiscover: 'clue-ttl-switches-seq',
  },
  {
    id: 'exam-glitch-sw-alfa',
    areaId: 'dungeon-cueva-glitch',
    label: 'Interruptor Lógico [ALFA · 1972]',
    actionLabel: 'Conmutar Interruptor Alfa',
    x: 960,
    y: 660,
    accentHex: '#00f3ff',
    category: 'SECTOR DE CIRCUITOS · INTERRUPTOR ALFA',
    paragraphs: ['Interruptor de compuerta lógica TTL ALFA. Emite una frecuencia de tono agudo.'],
  },
  {
    id: 'exam-glitch-sw-beta',
    areaId: 'dungeon-cueva-glitch',
    label: 'Interruptor Lógico [BETA · 1976]',
    actionLabel: 'Conmutar Interruptor Beta',
    x: 840,
    y: 660,
    accentHex: '#f59e0b',
    category: 'SECTOR DE CIRCUITOS · INTERRUPTOR BETA',
    paragraphs: ['Interruptor de compuerta lógica TTL BETA. Regula el voltaje intermedio de sincronización.'],
  },
  {
    id: 'exam-glitch-sw-gamma',
    areaId: 'dungeon-cueva-glitch',
    label: 'Interruptor Lógico [GAMMA · 1978]',
    actionLabel: 'Conmutar Interruptor Gamma',
    x: 1080,
    y: 660,
    accentHex: '#c084fc',
    category: 'SECTOR DE CIRCUITOS · INTERRUPTOR GAMMA',
    paragraphs: ['Interruptor de compuerta lógica TTL GAMMA. Cierra el circuito maestro.'],
  },
  {
    id: 'exam-glitch-false-wall',
    areaId: 'dungeon-cueva-glitch',
    label: 'Fractura Glitch en la Roca · Pared Falsa',
    actionLabel: 'Inspeccionar Grieta Fractal',
    x: 880,
    y: 380,
    accentHex: '#c084fc',
    category: 'PASADIZO SECRETO · MEMORIA FRACTAL',
    paragraphs: [
      'Los píxeles de esta roca parpadean y se desvanecen al observarlos de cerca.',
      'Al acercarte con la lámpara o el escáner, los bloques sólidos se disuelven revelando la entrada secreta hacia la Cámara de la Memoria Fractal.',
    ],
    hint: 'Cruza la abertura para descubrir el puzle de losetas y el cofre del Fragmento de Memoria.',
    isFalseWall: true,
    secretIdToDiscover: 'secret-cueva-fractal-passage',
  },
  {
    id: 'exam-glitch-nucleo-console',
    areaId: 'dungeon-cueva-glitch',
    label: 'Consola Central del Núcleo del Origen',
    actionLabel: 'Inspeccionar Diagnóstico del Núcleo',
    x: 600,
    y: 150,
    accentHex: '#facc15',
    category: 'NÚCLEO DEL ORIGEN · ALINEACIÓN MAESTRA',
    paragraphs: [
      'Una monumental consola que vibra con los datos puros de los años 70.',
      'Para estabilizar el Núcleo y forjar el Cartucho Maestro ORIGEN se exigen seis requisitos verificados:',
      '1. Victoria real en Pong (1972) · 2. Victoria real en Breakout (1976) · 3. Victoria en Space Invaders (1978, 1000+ PTS)',
      '4. Fragmento de Pulso · 5. Fragmento de Circuito · 6. Fragmento de Memoria',
      'Con los seis requisitos reunidos, sintoniza los tres pilones resonadores en orden: 1972 → 1976 → 1978.',
    ],
    hint: 'Sintoniza los resonadores en orden cronológico una vez reunidos todos los fragmentos.',
  },
  {
    id: 'exam-resonador-1972',
    areaId: 'dungeon-cueva-glitch',
    label: 'Resonador I [1972 · PONG]',
    actionLabel: 'Estabilizar Frecuencia 1972',
    x: 480,
    y: 220,
    accentHex: '#00f3ff',
    category: 'NÚCLEO DEL ORIGEN · RESONADOR I',
    paragraphs: ['Pilar resonador que vibra a 1972 Hz con la señal de Pong.'],
  },
  {
    id: 'exam-resonador-1976',
    areaId: 'dungeon-cueva-glitch',
    label: 'Resonador II [1976 · BREAKOUT]',
    actionLabel: 'Estabilizar Frecuencia 1976',
    x: 600,
    y: 220,
    accentHex: '#f59e0b',
    category: 'NÚCLEO DEL ORIGEN · RESONADOR II',
    paragraphs: ['Pilar resonador que vibra a 1976 Hz con la señal cromática de Breakout.'],
  },
  {
    id: 'exam-resonador-1978',
    areaId: 'dungeon-cueva-glitch',
    label: 'Resonador III [1978 · SPACE INVADERS]',
    actionLabel: 'Estabilizar Frecuencia 1978',
    x: 720,
    y: 220,
    accentHex: '#c084fc',
    category: 'NÚCLEO DEL ORIGEN · RESONADOR III',
    paragraphs: ['Pilar resonador que vibra a 1978 Hz con la frecuencia defensiva de Space Invaders.'],
  },

  // --- LOS CUATRO CAMINOS Y CASTILLO KONG ---
  {
    id: 'exam-cuatro-caminos-board',
    areaId: 'exterior-70s',
    label: 'Tablero de Control de Los Cuatro Caminos',
    actionLabel: 'Examinar Estado de Gabinetes',
    x: 1952,
    y: -240,
    accentHex: '#38bdf8',
    category: 'SALA ARCADE · LOS CUATRO CAMINOS',
    paragraphs: [
      'Plaza central donde convergen las cuatro máquinas históricas: Lunar Lander (1979), Sea Wolf (1976), Tank (1974) y Galaxian (1979).',
      'Gran Koopa quemó sus transistores de germanio. El técnico Dylan en Taller RS puede repararlas con los componentes de Night Driver.',
    ],
    hint: 'Habla con los custodios Rodo y Nora junto al cruce.',
  },
  {
    id: 'exam-castle-gate-north',
    areaId: 'exterior-70s',
    label: 'Portón Norte al Puente del Castillo de Gran Koopa',
    actionLabel: 'Inspeccionar Portón',
    x: 1984,
    y: -540,
    accentHex: '#ef4444',
    category: 'BARRERA SEPTENTRIONAL · ACCESO AL CASTILLO',
    paragraphs: [
      'Un portón macizo de hierro forjado y barras electrificadas que conduce al puente del castillo de Gran Koopa.',
      'Cuatro sellos arcade gobiernan los cerrojos: Lunar Lander, Sea Wolf, Tank y Galaxian.',
      'Solo se abrirá cuando la Sala de Los Cuatro Caminos haya sido reparada por Dylan y se hayan conquistado las victorias requeridas en los cuatro gabinetes.',
    ],
    hint: 'Restaura y supera las cuatro máquinas arcade para retirar los cerrojos.',
  },
  {
    id: 'exam-simbolo-pulso-1',
    areaId: 'exterior-70s',
    label: 'Estela Rúnica [ ◈ ] · Símbolo I del Primer Pulso',
    actionLabel: 'Sintonizar Glifo I',
    x: 828,
    y: 1948,
    accentHex: '#00f3ff',
    category: 'ARQUEOLOGÍA DIGITAL · SÍMBOLO I DE III',
    paragraphs: [
      'Al acercarte, el grabado espiral de la piedra se enciende con luz cian: «[ ◈ ] Donde nace la primera chispa sobre la pantalla oscura».',
      'Una vibración recorre el suelo hacia el Portal Anómalo del Mirador Sur.',
    ],
    hint: 'Busca los otros dos Símbolos del Primer Pulso en el Bosque de las Señales y en la Terraza Costera de Pong.',
    secretIdToDiscover: 'secret-glyph-1',
  },
  {
    id: 'exam-simbolo-pulso-2',
    areaId: 'exterior-70s',
    label: 'Estela Rúnica [ ◈◈ ] · Símbolo II del Primer Pulso',
    actionLabel: 'Sintonizar Glifo II',
    x: 1192,
    y: 956,
    accentHex: '#34d399',
    category: 'ARQUEOLOGÍA DIGITAL · SÍMBOLO II DE III',
    paragraphs: [
      'Entre raíces cubiertas de musgo y filamentos de cobre despierta el segundo símbolo: «[ ◈◈ ] Dos señales dialogan a través del bosque del tiempo».',
    ],
    hint: 'El tercer símbolo aguarda junto a la brisa marina al sureste del Claro de Pong.',
    secretIdToDiscover: 'secret-glyph-2',
  },
  {
    id: 'exam-simbolo-pulso-3',
    areaId: 'exterior-70s',
    label: 'Estela Rúnica [ ◈◈◈ ] · Símbolo III del Primer Pulso',
    actionLabel: 'Sintonizar Glifo III',
    x: 3064,
    y: 1764,
    accentHex: '#fde047',
    category: 'ARQUEOLOGÍA DIGITAL · SÍMBOLO III DE III',
    paragraphs: [
      'Las líneas doradas del monolito costero resplandecen: «[ ◈◈◈ ] Tres frecuencias abren el pliegue entre las ruinas y la aldea».',
      'Si ya sintonizaste los glifos de la Aldea y del Bosque, ¡el Portal Anómalo de Continuidad se habrá activado!',
    ],
    hint: 'Comprueba los Portales Anómalos en el Mirador de la Aldea o al sur de Las Ruinas del Primer Pulso.',
    secretIdToDiscover: 'secret-glyph-3',
  },
  {
    id: 'exam-recreativa-olvidada-costa',
    areaId: 'exterior-70s',
    label: 'Bastidor Arcade Erosionado por la Marea',
    actionLabel: 'Inspeccionar Restos',
    x: 3128,
    y: 1428,
    accentHex: '#38bdf8',
    category: 'ARQUEOLOGÍA DE LA COSTA · MÁQUINA OLVIDADA',
    paragraphs: [
      'Un antiguo chasis recreativo descansa semienterrado en la arena húmeda, cubierto de percebes luminosos y placas oxidadas de los años 70.',
      'En su interior alguien grabó una coordenada: «Bajo las Cavernas de Memoria abrimos una bóveda para resguardar la Bobina del Cronoscopio antes de que la tormenta temporal nos alcanzara».',
    ],
    hint: 'Explora la galería noreste de Las Cavernas de Memoria para encontrar el Portal Abisal.',
    secretIdToDiscover: 'secret-arcade-olvidado',
  },
  {
    id: 'exam-inscripcion-boveda',
    areaId: 'chamber-boveda-cronoscopio',
    label: 'Bitácora Mural de los Primeros Arquitectos',
    actionLabel: 'Leer Grabado Antiguo',
    x: 215,
    y: 235,
    accentHex: '#c084fc',
    category: 'CÁMARA ABISAL · EL SECRETO DE LAS RUINAS',
    paragraphs: [
      '«Construimos Las Ruinas del Primer Pulso y el Cronoscopio porque cada década del videojuego es un eslabón vivo de la imaginación humana.»',
      '«Si algún día la continuidad se fractura, reúne el pulso de 1972, estabiliza la falla del Sendero Glitch y defiende el bastión de 1978: entonces la Máquina del Tiempo abrirá el horizonte hacia los años 80.»',
    ],
    hint: 'Abre el relicario central de esta cámara para recuperar la Bobina de Resonancia Temporal.',
    secretIdToDiscover: 'secret-boveda-cronoscopio',
  },
  {
    id: 'exam-monolito-costa',
    areaId: 'exterior-70s',
    label: 'Piedra Tallada del Pueblo del Origen',
    actionLabel: 'Leer Inscripción',
    x: 392,
    y: 1808,
    accentHex: '#5cc8ff',
    category: 'INSCRIPCIÓN DEL PUEBLO · PISTA DE EXPLORADOR',
    paragraphs: [
      '«Quien camina con curiosidad por la Isla del Origen descubre que ningún rincón está vacío: detrás de la casa azul del pueblo se esconde un jardín secreto, y entre los árboles del norte del Bosque se abre un claro invisible.»',
    ],
    hint: 'Rodea el Centro de Historia por su costado izquierdo para hallar el pasadizo trasero.',
    secretIdToDiscover: 'clue-monolito-cero',
  },
  {
    id: 'exam-secreto-origen-pixelverse',
    areaId: 'exterior-70s',
    label: 'Altar Ancestral de las Ruinas del Tiempo',
    actionLabel: 'Descifrar Reliquia del Origen',
    x: 3248,
    y: 1504,
    accentHex: '#ffd166',
    category: 'GRAN SECRETO · EL ORIGEN DE PIXELVERSE',
    paragraphs: [
      'Entre columnas bañadas por la marea descansa el grabado fundacional de PIXELVERSE: antes de que existieran consolas, géneros o fronteras tecnológicas, cada juego nacido de la creatividad humana encendía una estrella en este archipiélago.',
      'Pixel no fue creado por accidente durante el colapso de SUPER CUPA: es la chispa viva del primer píxel dibujado en una pantalla, destinado a enlazar todas las décadas para que ninguna generación olvide de dónde venimos.',
    ],
    hint: '¡Has descubierto el Gran Secreto de La Costa y las Ruinas del Tiempo!',
    secretIdToDiscover: 'secret-origen-pixelverse',
  },
  {
    id: 'exam-cronologia-historia',
    areaId: 'interior-centro-historia',
    label: 'Mural Cronológico · Los Primeros Videojuegos',
    actionLabel: 'Estudiar Mural',
    x: 205,
    y: 215,
    accentHex: '#60a5fa',
    category: 'CENTRO DE HISTORIA · CRÓNICA INTERACTIVA',
    paragraphs: [
      '1958–1962: Los laboratorios universitarios alumbran los primeros experimentos interactivos en pantallas circulares de radar y osciloscopio.',
      '1972: Pong lleva la diversión directa de dos paletas y un punto luminoso a millones de personas, simbolizado en esta isla por Las Praderas del Pixel.',
      '1978: Space Invaders inaugura la intensidad estratégica, las tablas de récords y los duelos legendarios representados en La Fortaleza Volcánica.',
    ],
    hint: 'Alcanzar 1.000 puntos en Space Invaders registra tu hazaña de forma permanente.',
  },
  {
    id: 'exam-atlas-islas',
    areaId: 'interior-centro-historia',
    label: 'Mesa Cartográfica de las Cinco Zonas',
    actionLabel: 'Consultar Mapa Mural',
    x: 525,
    y: 215,
    accentHex: '#f2c94c',
    category: 'CENTRO DE HISTORIA · GUÍA DE LA ISLA DEL ORIGEN',
    paragraphs: [
      '1. El Pueblo del Origen · 2. Las Praderas del Pixel · 3. El Bosque de los Secretos · 4. La Fortaleza Volcánica · 5. La Costa y las Ruinas del Tiempo.',
      'Una nota escrita a tinta añade: «En el extremo sur de las Ruinas Costeras del Este reposa un altar que revela el verdadero origen de Pixel».',
    ],
  },
  {
    id: 'exam-banco-taller',
    areaId: 'interior-taller-alcorn',
    label: 'Planos de Lógica Discreta (1972)',
    actionLabel: 'Leer Planos',
    x: 215,
    y: 265,
    accentHex: '#8cd96c',
    category: 'DOCUMENTO TÉCNICO · TALLER DEL BOSQUE',
    paragraphs: [
      'Diagramas originales trazados a mano: contadores síncronos y generadores de pulso horizontal construidos con pura lógica electrónica.',
      'Una nota al margen dice: «Sentí una corriente de aire detrás del ladrillo agrietado del muro norte... como si resguardara el viejo laboratorio de 1958».',
    ],
    hint: 'Inspecciona el centro del muro norte del Taller con [E] o usa el Buscador [R].',
  },
  {
    id: 'exam-muro-falso-taller',
    areaId: 'interior-taller-alcorn',
    label: 'Muro Norte con Ladrillos Huecos',
    actionLabel: 'Examinar Grieta Sospechosa',
    x: 380,
    y: 108,
    accentHex: '#5cc8ff',
    category: 'DESCUBRIMIENTO · PARED FALSA',
    paragraphs: [
      '¡Los ladrillos ceden con un chasquido mecánico! Detrás del muro se abre un pasadizo secreto hacia la Cámara Oculta de 1958.',
    ],
    secretIdToDiscover: 'secret-muro-taller',
    isFalseWall: true,
    unlocksDoorToArea: {
      targetArea: 'secret-camara-osciloscopio',
      spawnX: 380,
      spawnY: 395,
    },
  },
  {
    id: 'exam-altar-1958',
    areaId: 'secret-camara-osciloscopio',
    label: 'Terminal Analógico de Brookhaven (1958)',
    actionLabel: 'Inspeccionar Osciloscopio',
    x: 230,
    y: 210,
    accentHex: '#5cc8ff',
    category: 'CÁMARA SECRETA · MEMORIA PROFUNDA',
    paragraphs: [
      'Un tubo redondo muestra un destello verde rebotando sobre una red central: la chispa experimental nacida catorce años antes de los salones arcade.',
    ],
    hint: 'El Ermitaño que medita detrás de la cascada busca la válvula resguardada en el cofre de esta sala.',
  },
  {
    id: 'exam-estela-templo',
    areaId: 'interior-templo-pioneros',
    label: 'Códice Tallado de Secuencia Armónica',
    actionLabel: 'Leer Estela',
    x: 195,
    y: 235,
    accentHex: '#f2c94c',
    category: 'ACERTIJO DEL ARCHIVO · PISTA DE LOSETAS',
    paragraphs: [
      '«Camina sobre los tres nodos del suelo respetando el orden del tiempo: primero el Alba (I · Izquierda), luego el Pulso Dorado (II · Derecha) y finalmente el Cenit (III · Centro).»',
    ],
    hint: 'Pisa las tres baldosas cuadradas en orden I → II → III para abrir el cofre superior.',
  },
  {
    id: 'exam-cartel-80s',
    areaId: 'island-80s',
    label: 'Cartel Luminoso · Muelle de las Vigas Rojas',
    actionLabel: 'Leer Cartel',
    x: 475,
    y: 205,
    accentHex: '#f43f5e',
    category: 'NUEVA REGIÓN · DÉCADA DE 1980',
    paragraphs: [
      '¡Has navegado más allá de la Isla del Origen! Al este del muelle te aguarda el desafío vertical de vigas y barriles de 1981.',
    ],
    hint: 'Usa la Llave Antigua de 8 Pines para abrir el cofre del callejón noreste.',
  },
  {
    id: 'exam-bitacora-sunnyvale',
    areaId: 'interior-centro-historia',
    label: 'Recorte de Prensa · El Misterio de Sunnyvale (1972)',
    actionLabel: 'Examinar Crónica',
    x: 360,
    y: 162,
    accentHex: '#38bdf8',
    category: 'PISTA ARQUEOLÓGICA · CASO 01',
    paragraphs: [
      '«Dos días después de instalar la cabina prototipo de Pong en la taberna Andy Capp’s de Sunnyvale, el dueño llamó de madrugada asegurando que la máquina se había averiado y rechazaba monedas.»',
      '«Allan Alcorn acudió con sus herramientas esperando un cortocircuito en los chips TTL, pero al abrir la puerta inferior descubrió una sorpresa histórica: una caja metálica de leche rebosando cuartos de dólar.»',
    ],
    hint: 'Pista registrada en tu Diario [Q] para el Caso 01.',
    clueIdToDiscover: 'clue-sunnyvale-monedas',
  },
  {
    id: 'exam-nota-celofan-taller',
    areaId: 'interior-taller-alcorn',
    label: 'Cuaderno de Ingeniería · Bandas Cromáticas CRT',
    actionLabel: 'Leer Apunte Técnico',
    x: 435,
    y: 175,
    accentHex: '#f97316',
    category: 'PISTA ARQUEOLÓGICA · CASO 02',
    paragraphs: [
      '«En 1976 la memoria de color aún resultaba prohibitiva para un salón recreativo. La solución fue tan ingeniosa como artesanal: adherir cuatro tiras de celofán translúcido directamente sobre el cristal monocromo.»',
      '«Desde la base hacia la cúspide del muro, el haz blanco atravesaba amarillo (1 punto), verde (3 puntos), naranja (5 puntos) y rojo en lo más alto (7 puntos), mientras Steve Wozniak reducía la lógica a menos de cincuenta chips TTL.»',
    ],
    hint: 'Recuerda el orden ascendente del muro: Amarillo → Verde → Naranja → Rojo.',
    clueIdToDiscover: 'clue-celofan-wozniak',
  },
  {
    id: 'exam-estela-laberinto-76',
    areaId: 'dungeon-laberinto-origen',
    label: 'Placa de Sincronía · Cerradura del Muro 1976',
    actionLabel: 'Descifrar Secuencia',
    x: 205,
    y: 185,
    accentHex: '#f97316',
    category: 'LABERINTO DE SEÑALES · PISTA DE PILARES RGB',
    paragraphs: [
      '«Cuatro frecuencias custodian la cámara del prototipo oculto. Sintoniza los pilares en el mismo orden en que una esfera asciende perforando el muro de 1976: desde la franja inferior de menor valor hasta la cima carmesí.»',
    ],
    hint: 'Orden de impacto ascendente: 1º Amarillo · 2º Verde · 3º Naranja · 4º Rojo.',
    clueIdToDiscover: 'clue-secuencia-laberinto',
  },
  {
    id: 'exam-bitacora-wozniak-76',
    areaId: 'secret-sala-breakout',
    label: 'Esquemático Original · Las Cuatro Noches de 1976',
    actionLabel: 'Inspeccionar Plano',
    x: 205,
    y: 215,
    accentHex: '#22d3ee',
    category: 'SALA SECRETA 1976 · MEMORIA PROFUNDA',
    paragraphs: [
      'Un plano azulado muestra trazos de circuitos integrados TTL meticulosamente entrelazados: «Cuatro noches sin descanso bastaron para demostrar que la elegancia electrónica podía esculpir un clásico inmortal».',
      'Al jugar y superar 400 puntos en el gabinete central, la vitrina cifrada del Museo Viviente de los 70 despertará para siempre.',
    ],
    secretIdToDiscover: 'secret-sala-breakout-1976',
    clueIdToDiscover: 'clue-wozniak-ttl',
  },
  {
    id: 'exam-archivo-polar-carta',
    areaId: 'interior-archivo-norte',
    label: 'Carta de la Cordillera · Lectura de Aurora',
    actionLabel: 'Leer Carta Celeste',
    x: 360,
    y: 210,
    accentHex: '#67e8f9',
    category: 'CARTOGRAFÍA POLAR · CLAVE DE LA CAVIDAD',
    paragraphs: [
      'El mapa registra tres pulsos sobre la cresta norte. La señal más baja despierta primero; la central responde después y la más alta cierra el circuito.',
      'Una anotación al margen dice: «El eco se lee de la base al cielo, no de oeste a este».',
    ],
    hint: 'En la Cavidad de la Aurora, pisa los tres nodos de menor a mayor altura.',
    clueIdToDiscover: 'clue-lectura-aurora',
  },
  {
    id: 'exam-estacion-boreal-receptor',
    areaId: 'interior-observatorio-boreal',
    label: 'Receptor de Cuatro Bandas',
    actionLabel: 'Sintonizar Receptor',
    x: 360,
    y: 218,
    accentHex: '#a5f3fc',
    category: 'ESTACIÓN BOREAL · CLAVE DE FRECUENCIAS',
    paragraphs: [
      'Cuatro filtros de cuarzo guardan la última medición: primero el destello más tenue, después el que cruza la línea del horizonte, luego el pulso doble y, al final, la señal que vuelve desde el cielo.',
    ],
    hint: 'En la Cámara del Eco Boreal, sigue el orden tenue → horizonte → doble → retorno.',
    clueIdToDiscover: 'clue-cuatro-frecuencias-boreales',
  },
  {
    id: 'exam-castillo-portal-estela',
    areaId: 'exterior-70s',
    label: 'Estela Rúnica del Puente Levadizo',
    actionLabel: 'Leer Inscripción Milenaria',
    x: 1952,
    y: -480,
    accentHex: '#c084fc',
    category: 'CASTILLO DEL REY CORRUPTO · SELLO EXTERIOR',
    paragraphs: [
      'Una losa de basalto oscuro grabada con runas luminosas: «Las cuatro torres vigilan el abismo septentrional. El puente sólo descenderá para aquel que encienda los pedestales en el orden del ciclo eterno:»',
      '«Primero despierta el Sol [☀] al alba. Al atardecer responde la Luna [☾]. En la noche guían las Estrellas [★], y la tormenta concluye con el Rayo [⚡].»',
    ],
    hint: 'Sigue el orden: 1. Sol ☀ → 2. Luna ☾ → 3. Estrella ★ → 4. Rayo ⚡ para descender el puente levadizo.',
    clueIdToDiscover: 'clue-sellos-cuatro-torres',
  },
  {
    id: 'exam-castillo-muralla-mural',
    areaId: 'castle-murallas',
    label: 'Mural de la Guardia Antigua',
    actionLabel: 'Examinar Relieve',
    x: 440,
    y: 170,
    accentHex: '#c084fc',
    category: 'MURALLAS DEL DESTIERRO · CRÓNICA DE DEFENSA',
    paragraphs: [
      'El relieve tallado muestra a Donkey Kong protegiendo con sus brazos la nave estelar en la cumbre: «El guardián juró custodiar el paso entre mundos».',
      'Sin embargo, grietas de cristal violeta atraviesan la piedra: la corrupción digital de Super KOOPA envenenó el corazón de la fortaleza.',
    ],
  },
  {
    id: 'exam-castillo-laberinto-puerta-atajo',
    areaId: 'castle-laberinto',
    label: 'Reja de Hierro Forjado · Atajo Bidireccional',
    actionLabel: 'Accionar Palanca de Paso',
    x: 480,
    y: 310,
    accentHex: '#818cf8',
    category: 'LABERINTO DE LAS DOCE PUERTAS · ATAJO',
    paragraphs: [
      'Una pesada compuerta de rejas de hierro que comunica directamente la entrada del laberinto con las escaleras subterráneas.',
    ],
  },
  {
    id: 'exam-castillo-laberinto-glifo-alfa',
    areaId: 'castle-laberinto',
    label: 'Glifo Alfa [α] · Memoria de 1971',
    actionLabel: 'Sintonizar Frecuencia',
    x: 240,
    y: 200,
    accentHex: '#38bdf8',
    category: 'LABERINTO DE LAS DOCE PUERTAS · GUÍA HISTÓRICA',
    paragraphs: [
      'Inscripción de bronce pulido: «Las doce compuertas abren caminos ilusorios salvo la secuencia histórica: Computer Space (1971) → Pong (1972) → Breakout (1976) → Space Invaders (1978).»',
    ],
    hint: 'Sigue los glifos de las décadas hacia el norte para descender a los Cimientos.',
  },
  {
    id: 'exam-castillo-valvula-caudal',
    areaId: 'castle-cimientos',
    label: 'Válvula de Caudal Hidráulico [A]',
    actionLabel: 'Girar Válvula A',
    x: 220,
    y: 230,
    accentHex: '#06b6d4',
    category: 'CIMIENTOS DEL REINO · SISTEMA HIDRÁULICO',
    paragraphs: [
      'Una rueda de latón conectada al acueducto subterráneo. Al girarla, el agua fluye con fuerza hacia los pistones del montacargas.',
    ],
  },
  {
    id: 'exam-castillo-valvula-drenaje',
    areaId: 'castle-cimientos',
    label: 'Válvula de Drenaje Abisal [B]',
    actionLabel: 'Girar Válvula B',
    x: 460,
    y: 230,
    accentHex: '#06b6d4',
    category: 'CIMIENTOS DEL REINO · SISTEMA HIDRÁULICO',
    paragraphs: [
      'Válvula inferior de drenaje. Desaloja el exceso de agua termal de la fosa central.',
    ],
  },
  {
    id: 'exam-castillo-valvula-presion',
    areaId: 'castle-cimientos',
    label: 'Válvula de Presión de Vapor [C]',
    actionLabel: 'Girar Válvula C',
    x: 700,
    y: 230,
    accentHex: '#06b6d4',
    category: 'CIMIENTOS DEL REINO · SISTEMA HIDRÁULICO',
    paragraphs: [
      'Válvula de purga de vapor a alta presión. Permite equilibrar el flujo antes del drenaje final.',
    ],
    hint: 'El orden hidráulico correcto es: Flujo [A] → Vapor [C] → Drenaje [B].',
  },
  {
    id: 'exam-castillo-biblioteca-atril-1',
    areaId: 'castle-biblioteca',
    label: 'Atril I · La Era Fundacional',
    actionLabel: 'Inspeccionar Atril I',
    x: 230,
    y: 320,
    accentHex: '#f59e0b',
    category: 'BIBLIOTECA DE LOS REYES · CRÓNICA I',
    paragraphs: [
      '«Aquí descansa la memoria del origen: el Rey Donkey Kong levantó este baluarte cuando los videojuegos daban sus primeros pasos analógicos.»',
    ],
  },
  {
    id: 'exam-castillo-biblioteca-atril-2',
    areaId: 'castle-biblioteca',
    label: 'Atril II · El Hangar Estelar',
    actionLabel: 'Inspeccionar Atril II',
    x: 390,
    y: 320,
    accentHex: '#38bdf8',
    category: 'BIBLIOTECA DE LOS REYES · CRÓNICA II',
    paragraphs: [
      '«En la cima de la fortaleza aguarda la nave insignia de 1978, el primer vehículo estelar capaz de cruzar hacia la década de 1980.»',
    ],
  },
  {
    id: 'exam-castillo-biblioteca-atril-3',
    areaId: 'castle-biblioteca',
    label: 'Atril III · La Sombra de Super KOOPA',
    actionLabel: 'Inspeccionar Atril III',
    x: 550,
    y: 320,
    accentHex: '#a855f7',
    category: 'BIBLIOTECA DE LOS REYES · CRÓNICA III',
    paragraphs: [
      '«Super KOOPA inoculó filamentos de código oscuro en los engranajes del trono, manipulando los recuerdos del monarca para convertirlo en su carcelero.»',
    ],
  },
  {
    id: 'exam-castillo-biblioteca-atril-4',
    areaId: 'castle-biblioteca',
    label: 'Atril IV · La Purificación del Rey',
    actionLabel: 'Inspeccionar Atril IV',
    x: 710,
    y: 320,
    accentHex: '#ef4444',
    category: 'BIBLIOTECA DE LOS REYES · CRÓNICA IV',
    paragraphs: [
      '«Solo sobrecargando los acumuladores laterales de la sala del trono se disipará la coraza violeta, dejando al descubierto el Núcleo de Corrupción.»',
    ],
  },
  {
    id: 'exam-castillo-biblioteca-estanteria',
    areaId: 'castle-biblioteca',
    label: 'Gran Estantería Mecánica de los Reyes',
    actionLabel: 'Examinar Mecanismo Oculto',
    x: 470,
    y: 150,
    accentHex: '#f59e0b',
    category: 'BIBLIOTECA DE LOS REYES · PASADIZO SECRETO',
    paragraphs: [
      'Una majestuosa estantería de roble antiguo con engranajes de bronce incrustados en la pared. Al disponer los 4 fragmentos de la crónica en sus atriles, se deslizará para revelar la subida hacia la Torre del Tiempo.',
    ],
  },
  {
    id: 'exam-castillo-torre-palanca-izq',
    areaId: 'castle-torre',
    label: 'Palanca del Engranaje Mayor',
    actionLabel: 'Sincronizar Engranaje Izquierdo',
    x: 260,
    y: 260,
    accentHex: '#fbbf24',
    category: 'TORRE DEL TIEMPO · SINCRONIZACIÓN',
    paragraphs: [
      'Palanca de bronce macizo que ajusta la velocidad de rotación de las ruedas dentadas superiores.',
    ],
  },
  {
    id: 'exam-castillo-torre-palanca-der',
    areaId: 'castle-torre',
    label: 'Palanca del Péndulo Boreal',
    actionLabel: 'Alinear Péndulo Derecho',
    x: 640,
    y: 260,
    accentHex: '#fbbf24',
    category: 'TORRE DEL TIEMPO · SINCRONIZACIÓN',
    paragraphs: [
      'Palanca de contrapeso que alinea la oscilación del péndulo central para desbloquear las puertas de la cumbre.',
    ],
  },
  {
    id: 'exam-castillo-trono-rey',
    areaId: 'castle-trono',
    label: 'Trono Monumental de la Fortaleza',
    actionLabel: 'Observar Trono',
    x: 490,
    y: 180,
    accentHex: '#ec4899',
    category: 'SALA DEL TRONO · CORAZÓN DEL REINO',
    paragraphs: [
      'El colosal trono de piedra negra donde Donkey Kong reinaba con honor. Encima de él flota el Núcleo Digital de Super KOOPA palpitando con rayos violetas.',
    ],
  },
  {
    id: 'exam-castillo-nave-invaders',
    areaId: 'castle-trono',
    label: 'Nave Insignia de Space Invaders',
    actionLabel: 'Abordar Nave Espacial [E]',
    x: 490,
    y: 80,
    accentHex: '#22c55e',
    category: 'HANGAR SECRETO · PUENTE HACIA LOS 80',
    paragraphs: [
      '¡La legendaria nave canónica de 1978! Sus turbinas emiten un zumbido cósmico estable y su cabina brilla con fósforo verde. Requiere la Llave Maestra del Hangar entregada por Donkey Kong para despegar rumbo a la Isla de los 80.',
    ],
  },
  // --- FARO DEL REINICIO · ARCHIVO DE LA BALIZA (SECTOR 11) ---
  {
    id: 'exam-faro-registro-ondas',
    areaId: 'exterior-70s',
    label: 'Registro de Ondas del Faro',
    actionLabel: 'Leer Registro',
    x: 4048,
    y: 1988,
    accentHex: '#7dd3fc',
    category: 'FARO DEL REINICIO · ARCHIVO DE LA BALIZA',
    paragraphs: [
      'Una placa de cobre registra las lecturas de la baliza: durante décadas marcó el pulso del archipiélago con una luz azul que ninguna tormenta apagaba.',
      'El 23 de octubre de 2026 el registro se corta de golpe. La última línea anota una onda expansiva de origen desconocido y un temblor que partió la compuerta PRIORIDAD CERO del acantilado.',
      'Al pie, con letra del abuelo: «La radio guarda una válvula de repuesto. Las compuertas viejas la reconocen.»',
    ],
    hint: 'La terraza oriental conserva la baliza. La compuerta de acceso responde a una válvula de vacío.',
  },
];

/* ============================================================================
   6. PERSONAJES ORIGINALES EN INTERIORES, CUEVAS E ISLA 80s
   ============================================================================ */
export const RPG_SUBAREA_NPCS: RpgSubAreaNpcSpec[] = [
  {
    id: 'npc-donkey-kong-freed',
    areaId: 'castle-trono',
    name: 'Donkey Kong · Rey de la Fortaleza',
    role: 'Monarca Restaurado de la Isla del Origen',
    x: 490,
    y: 220,
    facing: 'down',
    palette: { primary: '#b45309', secondary: '#ef4444', glow: '#fbbf24' },
    pitch: 0.65,
  },
  {
    id: 'npc-cronista-orfeo',
    areaId: 'interior-centro-historia',
    name: 'Sabio Orfeo · Historiador',
    role: 'Director del Centro de Historia (Pueblo del Origen)',
    x: 360,
    y: 265,
    facing: 'down',
    palette: { primary: '#2563eb', secondary: '#fde047', glow: '#60a5fa' },
    pitch: 0.92,
  },
  {
    id: 'npc-maestro-kertz',
    areaId: 'interior-taller-alcorn',
    name: 'Maestro Kertz · Artesano TTL',
    role: 'Ingeniero del Bosque de los Secretos',
    x: 525,
    y: 255,
    facing: 'down',
    palette: { primary: '#2d7a47', secondary: '#fbbf24', glow: '#8cd96c' },
    pitch: 0.88,
  },
  {
    id: 'npc-dylan-tecnico',
    areaId: 'interior-taller-alcorn',
    name: 'Dylan · Técnico de Hardware Retro',
    role: 'Especialista en TTL y Lógica Discreta de Taller RS',
    x: 280,
    y: 280,
    facing: 'right',
    palette: { primary: '#f97316', secondary: '#38bdf8', glow: '#fbbf24' },
    pitch: 1.04,
  },
  {
    id: 'npc-archivera-lira',
    areaId: 'interior-templo-pioneros',
    name: 'Archivera Lira',
    role: 'Custodia del Archivo de la Plaza Mayor',
    x: 615,
    y: 265,
    facing: 'left',
    palette: { primary: '#0284c7', secondary: '#fde047', glow: '#5cc8ff' },
    pitch: 1.14,
  },
  {
    id: 'npc-ermitano-cascada',
    areaId: 'cave-gruta-cascada',
    name: 'Ermitaño del Bit Cero',
    role: 'Sabio Oculto tras la Cascada',
    x: 245,
    y: 225,
    facing: 'right',
    palette: { primary: '#7b2cbf', secondary: '#e0f2fe', glow: '#c084fc' },
    pitch: 0.76,
  },
  {
    id: 'npc-automa-crono',
    areaId: 'interior-cronoscopio',
    name: 'Crono-0 · Guardián del Tiempo',
    role: 'Custodio del Observatorio del Cronoscopio',
    x: 235,
    y: 305,
    facing: 'right',
    palette: { primary: '#0e7490', secondary: '#fde047', glow: '#00f3ff' },
    pitch: 0.98,
  },
  {
    id: 'npc-capitana-vectoria',
    areaId: 'island-80s',
    name: 'Capitana Vectoria',
    role: 'Navegante de la Expansión 1980s',
    x: 355,
    y: 315,
    facing: 'down',
    palette: { primary: '#e11d48', secondary: '#5cc8ff', glow: '#fb7185' },
    pitch: 1.05,
  },
  {
    id: 'npc-curadora-selene',
    areaId: 'interior-museo-viviente',
    name: 'Curadora Sélene',
    role: 'Directora del Museo Viviente de los 70',
    x: 490,
    y: 365,
    facing: 'down',
    palette: { primary: '#0891b2', secondary: '#fde047', glow: '#22d3ee' },
    pitch: 1.08,
  },
  {
    id: 'npc-centinela-galahad',
    areaId: 'castle-murallas',
    name: 'Sir Galahad · Vigía de las Murallas',
    role: 'Patrón de la Guardia del Castillo',
    x: 360,
    y: 320,
    facing: 'down',
    palette: { primary: '#6366f1', secondary: '#c084fc', glow: '#a855f7' },
    pitch: 0.85,
  },
  {
    id: 'npc-cartografo-gunter',
    areaId: 'castle-laberinto',
    name: 'Gunter el Cartógrafo',
    role: 'Aventurero Atrapado en el Laberinto',
    x: 160,
    y: 320,
    facing: 'right',
    palette: { primary: '#818cf8', secondary: '#f59e0b', glow: '#fbbf24' },
    pitch: 0.95,
  },
  {
    id: 'npc-ingeniero-volcan',
    areaId: 'castle-cimientos',
    name: 'Ingeniero Volcan',
    role: 'Maestro de la Maquinaria Hidráulica',
    x: 340,
    y: 220,
    facing: 'right',
    palette: { primary: '#0891b2', secondary: '#06b6d4', glow: '#22d3ee' },
    pitch: 0.9,
  },
  {
    id: 'npc-archivero-ovidio',
    areaId: 'castle-biblioteca',
    name: 'Archivero Ovidio',
    role: 'Bibliotecario de los Reyes',
    x: 310,
    y: 220,
    facing: 'down',
    palette: { primary: '#d97706', secondary: '#f59e0b', glow: '#fbbf24' },
    pitch: 1.02,
  },
  {
    id: 'npc-crono-vigia',
    areaId: 'castle-torre',
    name: 'Crono-Vigía',
    role: 'Maestro Relojero de la Torre del Tiempo',
    x: 340,
    y: 320,
    facing: 'down',
    palette: { primary: '#ca8a04', secondary: '#fbbf24', glow: '#fde047' },
    pitch: 0.88,
  },
];

/* ============================================================================
   7. DEFINICIÓN ESPACIAL DE INTERIORES, CUEVAS, SALAS SECRETAS E ISLA 80s
   ============================================================================ */
interface CuatroCaminosArcadeMachineSpec {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  marquee: string;
  year: string;
  variant: ArcadeMachineVariant;
  facing: 'north' | 'south';
  accentHex: string;
  broken?: boolean;
}

/**
 * Máquinas ambientales del salón abandonado. Son mobiliario escénico:
 * no se pueden reparar, no abren minijuegos y no entregan recompensas.
 */
const CUATRO_CAMINOS_ARCADE_MACHINES: CuatroCaminosArcadeMachineSpec[] = [
  // Hilera adosada al muro norte (frentes hacia el pasillo central).
  { id: 'arcade-n1', x: 96, y: 154, w: 46, h: 30, marquee: 'METEOR 79', year: '1979', variant: 'upright', facing: 'south', accentHex: '#8df5db' },
  { id: 'arcade-n2', x: 190, y: 154, w: 42, h: 30, marquee: 'GOL 78', year: '1978', variant: 'cabaret', facing: 'south', accentHex: '#9cd67a' },
  { id: 'arcade-n3', x: 284, y: 154, w: 64, h: 30, marquee: 'APEX RACER', year: '1979', variant: 'deluxe', facing: 'south', accentHex: '#f59e0b' },
  { id: 'arcade-n4', x: 382, y: 154, w: 52, h: 30, marquee: 'SECTOR 77', year: '1977', variant: 'shooter', facing: 'south', accentHex: '#f43f5e' },
  { id: 'arcade-n5', x: 472, y: 154, w: 46, h: 30, marquee: 'LABERINTO', year: '1977', variant: 'upright', facing: 'south', accentHex: '#c084fc' },
  { id: 'arcade-n6', x: 566, y: 154, w: 42, h: 30, marquee: 'ESCALADA', year: '1978', variant: 'cabaret', facing: 'south', accentHex: '#38bdf8' },
  { id: 'arcade-n7', x: 660, y: 154, w: 46, h: 30, marquee: 'CENTINELA', year: '1979', variant: 'upright', facing: 'south', accentHex: '#39ff14' },
  { id: 'arcade-n8', x: 754, y: 154, w: 46, h: 30, marquee: 'ORBITA 79', year: '1979', variant: 'vector', facing: 'south', accentHex: '#a5f3fc', broken: true },
  { id: 'arcade-n9', x: 848, y: 154, w: 64, h: 30, marquee: 'RALLY 80', year: '1980', variant: 'deluxe', facing: 'south', accentHex: '#fb923c' },
  { id: 'arcade-n10', x: 946, y: 154, w: 42, h: 30, marquee: 'DUELO', year: '1978', variant: 'cabaret', facing: 'south', accentHex: '#fde047' },
  { id: 'arcade-n11', x: 1040, y: 154, w: 46, h: 30, marquee: 'RONDA', year: '1976', variant: 'upright', facing: 'south', accentHex: '#f472b6', broken: true },
  { id: 'arcade-tank', x: 1130, y: 154, w: 46, h: 30, marquee: 'TANK', year: '1974', variant: 'upright', facing: 'south', accentHex: '#a3e635' },
  { id: 'arcade-galaxian', x: 1220, y: 154, w: 46, h: 30, marquee: 'GALAXIAN', year: '1979', variant: 'upright', facing: 'south', accentHex: '#39ff14' },
  { id: 'arcade-seawolf', x: 1310, y: 154, w: 46, h: 30, marquee: 'SEA WOLF', year: '1976', variant: 'upright', facing: 'south', accentHex: '#10b981' },

  // Isla central de doble cara: dorso contra dorso.
  { id: 'arcade-c1', x: 276, y: 346, w: 46, h: 28, marquee: 'NAVE 77', year: '1977', variant: 'upright', facing: 'north', accentHex: '#8df5db' },
  { id: 'arcade-c2', x: 366, y: 346, w: 42, h: 28, marquee: 'PISTA 78', year: '1978', variant: 'cabaret', facing: 'north', accentHex: '#fb923c' },
  { id: 'arcade-c3', x: 456, y: 346, w: 46, h: 28, marquee: 'VECTOR 79', year: '1979', variant: 'vector', facing: 'north', accentHex: '#a5f3fc' },
  { id: 'arcade-c4', x: 700, y: 346, w: 46, h: 28, marquee: 'ASALTO', year: '1980', variant: 'shooter', facing: 'north', accentHex: '#f43f5e' },
  { id: 'arcade-c5', x: 790, y: 346, w: 52, h: 28, marquee: 'FRONTERA', year: '1979', variant: 'shooter', facing: 'north', accentHex: '#fde047' },
  { id: 'arcade-c6', x: 880, y: 346, w: 42, h: 28, marquee: 'SALTOS', year: '1978', variant: 'cabaret', facing: 'north', accentHex: '#9cd67a' },
  { id: 'arcade-c7', x: 276, y: 374, w: 46, h: 28, marquee: 'TUNEL 76', year: '1976', variant: 'upright', facing: 'south', accentHex: '#f59e0b' },
  { id: 'arcade-c8', x: 366, y: 374, w: 42, h: 28, marquee: 'GOLPE', year: '1977', variant: 'cabaret', facing: 'south', accentHex: '#f472b6' },
  { id: 'arcade-c9', x: 456, y: 374, w: 46, h: 28, marquee: 'CUMBRE', year: '1979', variant: 'upright', facing: 'south', accentHex: '#38bdf8', broken: true },
  { id: 'arcade-c10', x: 700, y: 374, w: 46, h: 28, marquee: 'SIN SEÑAL', year: '1977', variant: 'gutted', facing: 'south', accentHex: '#94a3b8' },
  { id: 'arcade-c11', x: 790, y: 374, w: 46, h: 28, marquee: 'FANTASMA 79', year: '1979', variant: 'vector', facing: 'south', accentHex: '#c084fc' },
  { id: 'arcade-c12', x: 880, y: 374, w: 42, h: 28, marquee: 'RECUERDO 74', year: '1974', variant: 'tilted', facing: 'south', accentHex: '#b58b2a' },

  // Hilera sur: se ven los dorsales, paneles de servicio y cables colgando.
  { id: 'arcade-s1', x: 120, y: 716, w: 46, h: 28, marquee: 'CARRERA 80', year: '1980', variant: 'upright', facing: 'north', accentHex: '#fb923c' },
  { id: 'arcade-s2', x: 214, y: 716, w: 42, h: 28, marquee: 'TIRO 78', year: '1978', variant: 'cabaret', facing: 'north', accentHex: '#f43f5e' },
  { id: 'arcade-s3', x: 308, y: 716, w: 46, h: 28, marquee: 'METEORO', year: '1977', variant: 'upright', facing: 'north', accentHex: '#8df5db' },
  { id: 'arcade-s4', x: 402, y: 716, w: 52, h: 28, marquee: 'PATRULLA', year: '1979', variant: 'shooter', facing: 'north', accentHex: '#fde047' },
  { id: 'arcade-s5', x: 496, y: 716, w: 46, h: 28, marquee: 'SALTOS 79', year: '1979', variant: 'gutted', facing: 'north', accentHex: '#9cd67a', broken: true },
  { id: 'arcade-s6', x: 744, y: 716, w: 42, h: 28, marquee: 'RONDA 77', year: '1977', variant: 'cabaret', facing: 'north', accentHex: '#f472b6' },
  { id: 'arcade-s7', x: 838, y: 716, w: 46, h: 28, marquee: 'ORBITA II', year: '1979', variant: 'vector', facing: 'north', accentHex: '#a5f3fc' },
  { id: 'arcade-s8', x: 932, y: 716, w: 46, h: 28, marquee: 'ASALTO 80', year: '1980', variant: 'upright', facing: 'north', accentHex: '#f59e0b' },
  { id: 'arcade-s9', x: 1026, y: 716, w: 52, h: 28, marquee: 'FRONTERA II', year: '1980', variant: 'shooter', facing: 'north', accentHex: '#f43f5e' },
  { id: 'arcade-s10', x: 1104, y: 716, w: 46, h: 28, marquee: 'CENTINELA II', year: '1979', variant: 'upright', facing: 'north', accentHex: '#39ff14', broken: true },

  // Islas centrales de pasillo: rompen la llanura del salón y crean recorridos.
  { id: 'arcade-m1', x: 160, y: 560, w: 46, h: 28, marquee: 'GALERÍA 78', year: '1978', variant: 'upright', facing: 'south', accentHex: '#f59e0b' },
  { id: 'arcade-m2', x: 250, y: 560, w: 42, h: 28, marquee: 'MOTOR 76', year: '1976', variant: 'cabaret', facing: 'south', accentHex: '#9cd67a' },
  { id: 'arcade-m3', x: 340, y: 560, w: 52, h: 28, marquee: 'ASEDIO', year: '1980', variant: 'shooter', facing: 'south', accentHex: '#f43f5e' },
  { id: 'arcade-m4', x: 430, y: 560, w: 46, h: 28, marquee: 'ECO 77', year: '1977', variant: 'vector', facing: 'south', accentHex: '#38bdf8', broken: true },
  { id: 'arcade-m5', x: 760, y: 560, w: 46, h: 28, marquee: 'CUMBRE II', year: '1979', variant: 'upright', facing: 'north', accentHex: '#c084fc' },
  { id: 'arcade-m6', x: 850, y: 560, w: 64, h: 28, marquee: 'RALLY 81', year: '1981', variant: 'deluxe', facing: 'north', accentHex: '#fb923c' },
  { id: 'arcade-m7', x: 940, y: 560, w: 42, h: 28, marquee: 'DUELO II', year: '1978', variant: 'cabaret', facing: 'north', accentHex: '#fde047' },
  { id: 'arcade-m8', x: 1030, y: 560, w: 46, h: 28, marquee: 'ORBITA III', year: '1979', variant: 'tilted', facing: 'north', accentHex: '#a5f3fc' },

  // Mesas cocktail aisladas en los pasillos laterales.
  { id: 'arcade-t1', x: 120, y: 470, w: 74, h: 54, marquee: 'MESA 74', year: '1974', variant: 'cocktail', facing: 'south', accentHex: '#f59e0b' },
  { id: 'arcade-t2', x: 1006, y: 470, w: 74, h: 54, marquee: 'DOMINO 75', year: '1975', variant: 'cocktail', facing: 'south', accentHex: '#38bdf8' },
];

export const SUB_AREAS: Record<Exclude<RpgAreaId, 'exterior-70s'>, SubAreaSpec> = {
  'interior-archivo-norte': {
    id: 'interior-archivo-norte',
    numberLabel: 'CORDILLERA DEL PRIMER PULSO · ARCHIVO',
    name: 'Archivo de Cartografía Polar',
    subtitle: 'Cartas de ruta, cuadernos de campo y la lectura de la aurora boreal',
    accentHex: '#67e8f9',
    floorHex: '#303f45',
    floorGridHex: 'rgba(165, 243, 252, 0.08)',
    wallHex: '#14272d',
    borderHex: '#67e8f9',
    width: 720,
    height: 490,
    walkableBounds: { x: 84, y: 112, w: 552, h: 336 },
    obstacles: [
      { id: 'polar-map-table', x: 270, y: 156, w: 180, h: 54 },
      { id: 'polar-shelf-west', x: 130, y: 150, w: 90, h: 48 },
      { id: 'polar-shelf-east', x: 500, y: 150, w: 90, h: 48 },
    ],
    exits: [
      {
        id: 'exit-archivo-polar',
        label: 'Puerta a la Cordillera del Primer Pulso',
        actionLabel: 'Salir a la Cordillera',
        x: 360,
        y: 440,
        accentHex: '#67e8f9',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      { kind: 'archive-shelf', x: 130, y: 150, w: 90, h: 48, accentHex: '#67e8f9', label: 'ATLAS POLAR' },
      { kind: 'archive-shelf', x: 500, y: 150, w: 90, h: 48, accentHex: '#a5f3fc', label: 'RUTAS NORTE' },
      { kind: 'fireplace', x: 335, y: 120, w: 50, h: 36, accentHex: '#f97316', label: 'HOGAR POLAR' },
      { kind: 'carpet', x: 260, y: 240, w: 200, h: 120, accentHex: '#67e8f9' },
      { kind: 'dining-table', x: 310, y: 260, w: 100, h: 50, accentHex: '#d8be88', label: 'CARTOGRAFÍA' },
      { kind: 'bed', x: 100, y: 240, w: 50, h: 70, accentHex: '#67e8f9', label: 'CATRE REFUGIO' },
      { kind: 'potted-plant', x: 590, y: 380, w: 28, h: 32, accentHex: '#8cd96c' },
    ],
  },
  'interior-observatorio-boreal': {
    id: 'interior-observatorio-boreal',
    numberLabel: 'CORDILLERA DEL PRIMER PULSO · ESTACIÓN',
    name: 'Estación de Señales Boreales',
    subtitle: 'Receptores analógicos que registran cuatro ecos a través de la montaña',
    accentHex: '#a5f3fc',
    floorHex: '#26343c',
    floorGridHex: 'rgba(103, 232, 249, 0.08)',
    wallHex: '#101c26',
    borderHex: '#a5f3fc',
    width: 720,
    height: 490,
    walkableBounds: { x: 84, y: 112, w: 552, h: 336 },
    obstacles: [
      { id: 'boreal-receiver', x: 270, y: 156, w: 180, h: 64 },
      { id: 'boreal-rack-west', x: 140, y: 152, w: 72, h: 56 },
      { id: 'boreal-rack-east', x: 508, y: 152, w: 72, h: 56 },
    ],
    exits: [
      {
        id: 'exit-estacion-boreal',
        label: 'Puerta a la Cordillera del Primer Pulso',
        actionLabel: 'Salir a la Cordillera',
        x: 360,
        y: 440,
        accentHex: '#a5f3fc',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      { kind: 'vector-projector', x: 270, y: 156, w: 180, h: 64, accentHex: '#a5f3fc', label: 'RECEPTOR BOREAL' },
      { kind: 'crt-rack', x: 140, y: 152, w: 72, h: 56, accentHex: '#67e8f9', label: 'BANDA I' },
      { kind: 'crt-rack', x: 508, y: 152, w: 72, h: 56, accentHex: '#67e8f9', label: 'BANDA IV' },
      { kind: 'carpet', x: 270, y: 250, w: 180, h: 110, accentHex: '#a5f3fc' },
      { kind: 'dining-table', x: 310, y: 270, w: 100, h: 50, accentHex: '#d8be88', label: 'ESCRITORIO BOREAL' },
      { kind: 'potted-plant', x: 100, y: 380, w: 28, h: 32, accentHex: '#34d399' },
      { kind: 'potted-plant', x: 590, y: 380, w: 28, h: 32, accentHex: '#34d399' },
      { kind: 'framed-painting', x: 200, y: 120, w: 40, h: 28, accentHex: '#a5f3fc', label: 'CARTA CELESTE' },
    ],
  },
  'cave-cavidad-aurora': {
    id: 'cave-cavidad-aurora',
    numberLabel: 'CORDILLERA DEL PRIMER PULSO · CAVIDAD',
    name: 'Cavidad de la Aurora',
    subtitle: 'Tres nodos de resonancia conservan el orden ascendente de la luz',
    accentHex: '#67e8f9',
    floorHex: '#263743',
    floorGridHex: 'rgba(103, 232, 249, 0.08)',
    wallHex: '#0c1720',
    borderHex: '#67e8f9',
    width: 720,
    height: 490,
    walkableBounds: { x: 84, y: 112, w: 552, h: 336 },
    obstacles: [],
    exits: [
      {
        id: 'exit-cavidad-aurora',
        label: 'Boca de la Cavidad de la Aurora',
        actionLabel: 'Volver a la Cordillera',
        x: 360,
        y: 440,
        accentHex: '#67e8f9',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    pressurePuzzle: {
      puzzleId: 'puzzle-aurora-3-nodos',
      tiles: [
        { id: 'aurora-node-low', orderIndex: 1, label: 'I · destello bajo', x: 250, y: 340, accentHex: '#67e8f9' },
        { id: 'aurora-node-mid', orderIndex: 2, label: 'II · pulso medio', x: 360, y: 270, accentHex: '#a5f3fc' },
        { id: 'aurora-node-high', orderIndex: 3, label: 'III · eco alto', x: 470, y: 340, accentHex: '#e0f2fe' },
      ],
      successMessage: '¡La secuencia ascendente de la aurora abrió el Archivo Sellado!',
    },
    decorProps: [
      { kind: 'cave-crystal', x: 128, y: 132, w: 70, h: 54, accentHex: '#67e8f9', label: 'NODO I' },
      { kind: 'cave-crystal', x: 510, y: 132, w: 70, h: 54, accentHex: '#a5f3fc', label: 'NODO III' },
    ],
  },
  'cave-camara-eco': {
    id: 'cave-camara-eco',
    numberLabel: 'CORDILLERA DEL PRIMER PULSO · CÁMARA',
    name: 'Cámara del Eco Boreal',
    subtitle: 'Cuatro bandas de cuarzo responden a una pauta de ida y retorno',
    accentHex: '#a5f3fc',
    floorHex: '#252f3d',
    floorGridHex: 'rgba(165, 243, 252, 0.08)',
    wallHex: '#0c1420',
    borderHex: '#a5f3fc',
    width: 720,
    height: 490,
    walkableBounds: { x: 84, y: 112, w: 552, h: 336 },
    obstacles: [],
    exits: [
      {
        id: 'exit-camara-eco',
        label: 'Boca de la Cámara del Eco Boreal',
        actionLabel: 'Volver a la Cordillera',
        x: 360,
        y: 440,
        accentHex: '#a5f3fc',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    pressurePuzzle: {
      puzzleId: 'puzzle-eco-4-frecuencias',
      tiles: [
        { id: 'echo-frequency-soft', orderIndex: 1, label: 'I · tenue', x: 220, y: 330, accentHex: '#67e8f9' },
        { id: 'echo-frequency-horizon', orderIndex: 2, label: 'II · horizonte', x: 330, y: 250, accentHex: '#7dd3fc' },
        { id: 'echo-frequency-double', orderIndex: 3, label: 'III · doble', x: 440, y: 330, accentHex: '#a5f3fc' },
        { id: 'echo-frequency-return', orderIndex: 4, label: 'IV · retorno', x: 530, y: 250, accentHex: '#e0f2fe' },
      ],
      successMessage: '¡Las cuatro frecuencias se alinearon y revelaron el Relicario del Eco!',
    },
    decorProps: [
      { kind: 'cave-crystal', x: 130, y: 132, w: 68, h: 54, accentHex: '#67e8f9', label: 'BANDA I' },
      { kind: 'cave-crystal', x: 520, y: 132, w: 68, h: 54, accentHex: '#a5f3fc', label: 'BANDA IV' },
    ],
  },
  'interior-centro-historia': {
    id: 'interior-centro-historia',
    numberLabel: 'PUEBLO DEL ORIGEN · INTERIOR',
    name: 'Centro de Historia del Videojuego',
    subtitle: 'Biblioteca cálida de madera y cartuchos clásicos en el corazón del pueblo',
    accentHex: '#60a5fa',
    floorHex: '#3b2b1d',
    floorGridHex: 'rgba(248, 245, 230, 0.08)',
    wallHex: '#1c1510',
    borderHex: '#f2c94c',
    width: 720,
    height: 490,
    walkableBounds: { x: 84, y: 112, w: 552, h: 336 },
    obstacles: [
      { id: 'hist-shelf-left', x: 135, y: 145, w: 130, h: 48 },
      { id: 'hist-shelf-right', x: 455, y: 145, w: 130, h: 48 },
    ],
    exits: [
      {
        id: 'exit-historia-outside',
        label: 'Puerta al Pueblo del Origen',
        actionLabel: 'Salir al Pueblo',
        x: 360,
        y: 440,
        accentHex: '#60a5fa',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      { kind: 'archive-shelf', x: 135, y: 145, w: 130, h: 48, accentHex: '#60a5fa', label: 'HISTORIA 58-78' },
      { kind: 'archive-shelf', x: 455, y: 145, w: 130, h: 48, accentHex: '#f2c94c', label: 'ATLAS ORIGEN' },
      { kind: 'fireplace', x: 335, y: 120, w: 50, h: 36, accentHex: '#f59e0b', label: 'CHIMENEA CENTRAL' },
      { kind: 'carpet', x: 260, y: 260, w: 200, h: 110, accentHex: '#f2c94c' },
      { kind: 'dining-table', x: 310, y: 280, w: 100, h: 50, accentHex: '#f2c94c', label: 'MESA DE LECTURA' },
      { kind: 'potted-plant', x: 100, y: 135, w: 28, h: 32, accentHex: '#8cd96c' },
      { kind: 'potted-plant', x: 590, y: 135, w: 28, h: 32, accentHex: '#8cd96c' },
      { kind: 'framed-painting', x: 280, y: 120, w: 40, h: 28, accentHex: '#60a5fa', label: 'PONG 1972' },
      { kind: 'framed-painting', x: 400, y: 120, w: 40, h: 28, accentHex: '#39ff14', label: 'INVADERS 1978' },
      { kind: 'dresser', x: 95, y: 360, w: 54, h: 42, accentHex: '#f2c94c', label: 'CÓMODA' },
      { kind: 'carpet', x: 100, y: 214, w: 110, h: 64, accentHex: '#7a1c28' },
      { kind: 'carpet', x: 510, y: 214, w: 110, h: 64, accentHex: '#1f4a6a' },
      { kind: 'dresser', x: 570, y: 360, w: 54, h: 42, accentHex: '#f2c94c', label: 'VITRINA' },
      { kind: 'potted-plant', x: 100, y: 410, w: 28, h: 32, accentHex: '#8cd96c' },
      { kind: 'potted-plant', x: 590, y: 410, w: 28, h: 32, accentHex: '#8cd96c' },
      { kind: 'potted-plant', x: 300, y: 404, w: 28, h: 32, accentHex: '#6cc04a' },
      { kind: 'potted-plant', x: 392, y: 404, w: 28, h: 32, accentHex: '#6cc04a' },
    ],
  },

  'interior-taller-alcorn': {
    id: 'interior-taller-alcorn',
    numberLabel: 'BOSQUE DE LOS SECRETOS · RETRO STATE TS',
    name: 'Taller Retro State TS',
    subtitle: 'Mesas de madera, osciloscopios, el generador del Sector 03 y una grieta en el muro norte',
    accentHex: '#8cd96c',
    floorHex: '#253528',
    floorGridHex: 'rgba(140, 217, 108, 0.1)',
    wallHex: '#111b14',
    borderHex: '#4ca64c',
    width: 760,
    height: 520,
    walkableBounds: { x: 86, y: 112, w: 588, h: 356 },
    obstacles: [
      { id: 'taller-bench-left', x: 145, y: 195, w: 140, h: 52 },
      { id: 'taller-rack-right', x: 545, y: 165, w: 96, h: 54 },
    ],
    exits: [
      {
        id: 'exit-taller-outside',
        label: 'Puerta al Bosque de los Secretos',
        actionLabel: 'Salir al Bosque',
        x: 380,
        y: 462,
        accentHex: '#8cd96c',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      { kind: 'workbench', x: 145, y: 195, w: 140, h: 52, accentHex: '#8cd96c', label: 'BANCO TTL' },
      { kind: 'crt-rack', x: 545, y: 165, w: 96, h: 54, accentHex: '#facc15', label: 'OSCILOSCOPIO' },
      { kind: 'fireplace', x: 355, y: 120, w: 50, h: 36, accentHex: '#f97316', label: 'FORJA DE SOLDADURA' },
      { kind: 'carpet', x: 290, y: 280, w: 180, h: 100, accentHex: '#8cd96c' },
      { kind: 'bed', x: 620, y: 250, w: 50, h: 70, accentHex: '#8cd96c', label: 'CAMA INGENIERO' },
      { kind: 'potted-plant', x: 100, y: 130, w: 28, h: 32, accentHex: '#4ca64c' },
      { kind: 'framed-painting', x: 480, y: 120, w: 40, h: 28, accentHex: '#8cd96c', label: 'CIRCUITO 1972' },
      { kind: 'dresser', x: 620, y: 360, w: 50, h: 42, accentHex: '#fbbf24', label: 'ARMARIO PIEZAS' },
      { kind: 'archive-shelf', x: 100, y: 130, w: 100, h: 44, accentHex: '#8cd96c', label: 'MANUALES' },
      { kind: 'carpet', x: 110, y: 330, w: 130, h: 80, accentHex: '#5a3a1a' },
      { kind: 'dresser', x: 100, y: 420, w: 50, h: 40, accentHex: '#fbbf24', label: 'CAJONES' },
      { kind: 'potted-plant', x: 630, y: 130, w: 28, h: 32, accentHex: '#4ca64c' },
      { kind: 'potted-plant', x: 560, y: 420, w: 28, h: 32, accentHex: '#4ca64c' },
    ],
  },

  'secret-camara-osciloscopio': {
    id: 'secret-camara-osciloscopio',
    numberLabel: 'HABITACIÓN SECRETA',
    name: 'Cámara Oculta de 1958',
    subtitle: 'Sala sellada tras la pared falsa del Taller · Recuerdo analógico primigenio',
    accentHex: '#5cc8ff',
    floorHex: '#102235',
    floorGridHex: 'rgba(92, 200, 255, 0.12)',
    wallHex: '#07111d',
    borderHex: '#5cc8ff',
    width: 760,
    height: 460,
    walkableBounds: { x: 140, y: 118, w: 480, h: 300 },
    obstacles: [{ id: 'altar-1958-prop', x: 185, y: 160, w: 92, h: 42 }],
    exits: [
      {
        id: 'exit-secret-to-taller',
        label: 'Pasadizo de regreso al Taller',
        actionLabel: 'Volver al Taller',
        x: 380,
        y: 412,
        accentHex: '#5cc8ff',
        targetArea: 'interior-taller-alcorn',
        targetX: 380,
        targetY: 146,
      },
    ],
    decorProps: [
      { kind: 'oscilloscope-altar', x: 185, y: 160, w: 92, h: 42, accentHex: '#5cc8ff', label: 'BROOKHAVEN 58' },
      { kind: 'carpet', x: 280, y: 220, w: 200, h: 100, accentHex: '#5cc8ff' },
      { kind: 'workbench', x: 480, y: 155, w: 110, h: 48, accentHex: '#5cc8ff', label: 'MESÓN DEDICADO' },
      { kind: 'potted-plant', x: 580, y: 340, w: 28, h: 32, accentHex: '#38bdf8' },
      { kind: 'framed-painting', x: 410, y: 120, w: 40, h: 28, accentHex: '#5cc8ff', label: 'BROOKHAVEN 1958' },
    ],
  },

  'interior-templo-pioneros': {
    id: 'interior-templo-pioneros',
    numberLabel: 'PLAZA MAYOR · INTERIOR',
    name: 'Archivo de la Plaza Mayor',
    subtitle: 'Bóveda de cartuchos históricos y acertijo de baldosas de presión',
    accentHex: '#f2c94c',
    floorHex: '#3a342c',
    floorGridHex: 'rgba(196, 176, 138, 0.16)',
    wallHex: '#2c2822',
    borderHex: '#c4b08a',
    width: 820,
    height: 540,
    walkableBounds: { x: 92, y: 118, w: 636, h: 372 },
    obstacles: [
      { id: 'templo-shelf-l', x: 130, y: 160, w: 120, h: 48 },
      { id: 'templo-shelf-r', x: 570, y: 160, w: 120, h: 48 },
    ],
    exits: [
      {
        id: 'exit-templo-outside',
        label: 'Puerta a la Plaza Mayor',
        actionLabel: 'Salir a la Plaza',
        x: 410,
        y: 482,
        accentHex: '#f2c94c',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    pressurePuzzle: {
      puzzleId: 'puzzle-templo-losetas',
      successMessage:
        '¡Secuencia I → II → III resuelta! El Cofre Armónico del Archivo se ha desbloqueado.',
      tiles: [
        { id: 'tile-1', orderIndex: 1, label: 'I', x: 265, y: 335, accentHex: '#8cd96c' },
        { id: 'tile-3', orderIndex: 3, label: 'III', x: 410, y: 295, accentHex: '#5cc8ff' },
        { id: 'tile-2', orderIndex: 2, label: 'II', x: 555, y: 335, accentHex: '#f2c94c' },
      ],
    },
    decorProps: [
      { kind: 'archive-shelf', x: 130, y: 160, w: 120, h: 48, accentHex: '#f59e0b', label: 'MEMORIAS 70-74' },
      { kind: 'archive-shelf', x: 570, y: 160, w: 120, h: 48, accentHex: '#5cc8ff', label: 'MEMORIAS 75-79' },
      { kind: 'fireplace', x: 380, y: 120, w: 50, h: 36, accentHex: '#f2c94c', label: 'HOGAR ARCHIVO' },
      { kind: 'carpet', x: 310, y: 210, w: 200, h: 150, accentHex: '#f2c94c' },
      { kind: 'dining-table', x: 360, y: 230, w: 100, h: 50, accentHex: '#f2c94c', label: 'MESA PROTOCOLOS' },
      { kind: 'potted-plant', x: 105, y: 140, w: 28, h: 32, accentHex: '#8cd96c' },
      { kind: 'potted-plant', x: 685, y: 140, w: 28, h: 32, accentHex: '#8cd96c' },
      { kind: 'framed-painting', x: 280, y: 120, w: 40, h: 28, accentHex: '#f2c94c', label: 'PIONEROS 8 PINES' },
      { kind: 'dresser', x: 675, y: 370, w: 50, h: 42, accentHex: '#f59e0b', label: 'ARMARIO ARCHIVO' },
      { kind: 'bed', x: 105, y: 370, w: 50, h: 70, accentHex: '#f59e0b', label: 'DESCANSO CUSTODIO' },
    ],
  },

  'cave-gruta-cascada': {
    id: 'cave-gruta-cascada',
    numberLabel: 'CUEVA OCULTA',
    name: 'Gruta Subterránea Tras la Cascada',
    subtitle: 'Caverna oscura bajo la cascada · Usa la Lámpara [L] para hallar el gabinete oculto de Night Driver (1976)',
    accentHex: '#c084fc',
    floorHex: '#18122b',
    floorGridHex: 'rgba(192, 132, 252, 0.09)',
    wallHex: '#090614',
    borderHex: '#9d7cd8',
    width: 780,
    height: 510,
    walkableBounds: { x: 96, y: 118, w: 588, h: 356 },
    isDarkCave: true,
    obstacles: [
      { id: 'cave-pool', x: 350, y: 235, w: 125, h: 72 },
      { id: 'cave-night-driver-cab', x: 494, y: 136, w: 48, h: 48 },
    ],
    exits: [
      {
        id: 'exit-cave-waterfall',
        label: 'Cortina de Agua · Regreso al Exterior',
        actionLabel: 'Salir por la Cascada',
        x: 390,
        y: 468,
        accentHex: '#5cc8ff',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      {
        kind: 'underground-pool',
        x: 350,
        y: 235,
        w: 125,
        h: 72,
        accentHex: '#5cc8ff',
      },
      {
        kind: 'night-driver-cabinet-1976',
        x: 492,
        y: 132,
        w: 52,
        h: 58,
        accentHex: '#38bdf8',
        label: 'NIGHT DRIVER',
      },
      {
        kind: 'cave-crystal',
        x: 150,
        y: 155,
        w: 36,
        h: 42,
        accentHex: '#a855f7',
      },
      {
        kind: 'cave-crystal',
        x: 620,
        y: 345,
        w: 36,
        h: 42,
        accentHex: '#5cc8ff',
      },
    ],
  },

  'interior-cronoscopio': {
    id: 'interior-cronoscopio',
    numberLabel: 'INSTALACIÓN ESPECIAL · MÁQUINA DEL TIEMPO',
    name: 'Observatorio del Cronoscopio',
    subtitle: 'Cámara abovedada donde aguarda la Máquina del Tiempo que enlaza las décadas de PIXELVERSE',
    accentHex: '#00f3ff',
    floorHex: '#101d33',
    floorGridHex: 'rgba(0, 243, 255, 0.1)',
    wallHex: '#060c18',
    borderHex: '#d8be88',
    width: 820,
    height: 540,
    walkableBounds: { x: 92, y: 118, w: 636, h: 372 },
    obstacles: [
      { id: 'chrono-core-pedestal', x: 350, y: 168, w: 120, h: 64 },
      { id: 'chrono-conduit-left', x: 140, y: 165, w: 84, h: 48 },
      { id: 'chrono-conduit-right', x: 596, y: 165, w: 84, h: 48 },
    ],
    exits: [
      {
        id: 'exit-cronoscopio-outside',
        label: 'Puerta a Las Ruinas del Primer Pulso',
        actionLabel: 'Salir a las Ruinas',
        x: 410,
        y: 482,
        accentHex: '#00f3ff',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      {
        kind: 'temporal-conduit',
        x: 140,
        y: 165,
        w: 84,
        h: 48,
        accentHex: '#f59e0b',
        label: 'PULSO 1972',
      },
      {
        kind: 'temporal-conduit',
        x: 596,
        y: 165,
        w: 84,
        h: 48,
        accentHex: '#34d399',
        label: 'ANCLA 1978',
      },
      {
        kind: 'time-machine-core',
        x: 350,
        y: 168,
        w: 120,
        h: 64,
        accentHex: '#00f3ff',
        label: 'CRONOSCOPIO',
      },
      { kind: 'carpet', x: 310, y: 270, w: 200, h: 130, accentHex: '#00f3ff' },
      { kind: 'potted-plant', x: 105, y: 380, w: 28, h: 32, accentHex: '#34d399' },
      { kind: 'potted-plant', x: 685, y: 380, w: 28, h: 32, accentHex: '#34d399' },
      { kind: 'potted-plant', x: 260, y: 360, w: 28, h: 32, accentHex: '#34d399' },
      { kind: 'potted-plant', x: 520, y: 360, w: 28, h: 32, accentHex: '#d8be88' },
      { kind: 'framed-painting', x: 260, y: 125, w: 40, h: 28, accentHex: '#00f3ff', label: 'ANILLO BOREAL' },
      { kind: 'framed-painting', x: 520, y: 125, w: 40, h: 28, accentHex: '#d8be88', label: 'CRONOSCOPIO 70' },
      { kind: 'framed-painting', x: 140, y: 220, w: 40, h: 28, accentHex: '#00f3ff', label: 'MARTE 1971' },
      { kind: 'framed-painting', x: 600, y: 220, w: 40, h: 28, accentHex: '#d8be88', label: 'LUNA 1975' },
      { kind: 'archive-shelf', x: 140, y: 260, w: 90, h: 48, accentHex: '#00f3ff', label: 'ARTIFACTOS' },
      { kind: 'archive-shelf', x: 600, y: 260, w: 90, h: 48, accentHex: '#d8be88', label: 'REGISTROS' },
      { kind: 'bed', x: 105, y: 380, w: 50, h: 70, accentHex: '#00f3ff', label: 'DESCANSO MEX' },
      { kind: 'bed', x: 685, y: 380, w: 50, h: 70, accentHex: '#d8be88', label: 'DESCANSO SOL' },
      { kind: 'dresser', x: 140, y: 130, w: 54, h: 42, accentHex: '#00f3ff', label: 'VESTIDERO' },
      { kind: 'dresser', x: 600, y: 130, w: 54, h: 42, accentHex: '#d8be88', label: 'VESTIDERO' },
    ],
  },

  'chamber-boveda-cronoscopio': {
    id: 'chamber-boveda-cronoscopio',
    numberLabel: 'CAVERNAS DE MEMORIA · CÁMARA SECRETA',
    name: 'Cámara Abisal del Cronoscopio',
    subtitle: 'Antigua instalación subterránea tras el Portal Abisal de las Cavernas de Memoria',
    accentHex: '#c084fc',
    floorHex: '#191332',
    floorGridHex: 'rgba(192, 132, 252, 0.12)',
    wallHex: '#080514',
    borderHex: '#c084fc',
    width: 760,
    height: 480,
    walkableBounds: { x: 110, y: 118, w: 540, h: 332 },
    obstacles: [
      { id: 'boveda-conduit-l', x: 150, y: 155, w: 88, h: 46 },
      { id: 'boveda-conduit-r', x: 522, y: 155, w: 88, h: 46 },
    ],
    exits: [
      {
        id: 'exit-boveda-to-cavernas',
        label: 'Portal Abisal · Regreso a Las Cavernas de Memoria',
        actionLabel: 'Regresar a la Caverna',
        x: 380,
        y: 440,
        accentHex: '#c084fc',
        targetArea: 'exterior-70s',
        targetX: 1360,
        targetY: 544,
      },
    ],
    decorProps: [
      {
        kind: 'temporal-conduit',
        x: 150,
        y: 155,
        w: 88,
        h: 46,
        accentHex: '#c084fc',
        label: 'MEMORIA 01',
      },
      {
        kind: 'temporal-conduit',
        x: 522,
        y: 155,
        w: 88,
        h: 46,
        accentHex: '#00f3ff',
        label: 'MEMORIA 02',
      },
      {
        kind: 'cave-crystal',
        x: 285,
        y: 270,
        w: 32,
        h: 38,
        accentHex: '#00f3ff',
      },
      {
        kind: 'cave-crystal',
        x: 445,
        y: 270,
        w: 32,
        h: 38,
        accentHex: '#c084fc',
      },
    ],
  },

  'island-80s': {
    id: 'island-80s',
    numberLabel: 'NUEVA ÉPOCA HISTÓRICA · DÉCADA DE 1980',
    name: 'Isla 1980s · Muelle de las Vigas Rojas',
    subtitle: 'Siguiente etapa histórica alcanzada a través del Cronoscopio o el Muelle del Este',
    accentHex: '#f43f5e',
    floorHex: '#1b1130',
    floorGridHex: 'rgba(244, 63, 94, 0.14)',
    wallHex: '#090414',
    borderHex: '#f43f5e',
    width: 1040,
    height: 580,
    walkableBounds: { x: 90, y: 145, w: 860, h: 365 },
    obstacles: [
      { id: '80s-arch-prop', x: 430, y: 150, w: 96, h: 38 },
      { id: '80s-dk-pedestal', x: 705, y: 245, w: 72, h: 52 },
    ],
    exits: [
      {
        id: 'exit-80s-ferry',
        label: 'Navío · Regresar a la Costa de la Isla del Origen',
        actionLabel: 'Zarpar a Isla del Origen',
        x: 145,
        y: 360,
        accentHex: '#5cc8ff',
        targetArea: 'exterior-70s',
        targetX: 3215,
        targetY: 1155,
      },
      {
        id: 'exit-80s-cronoscopio',
        label: 'Ancla del Cronoscopio · Regreso Temporal a 1970s',
        actionLabel: 'Volver al Cronoscopio (70s)',
        x: 235,
        y: 185,
        accentHex: '#00f3ff',
        targetArea: 'interior-cronoscopio',
        targetX: 410,
        targetY: 315,
      },
    ],
    decorProps: [
      {
        kind: 'astral-ferry',
        x: 96,
        y: 325,
        w: 84,
        h: 46,
        accentHex: '#5cc8ff',
        label: 'NAVÍO ORIGEN',
      },
      {
        kind: 'temporal-conduit',
        x: 195,
        y: 148,
        w: 80,
        h: 32,
        accentHex: '#00f3ff',
        label: 'NEXO 1970s',
      },
      {
        kind: 'neon-arch',
        x: 430,
        y: 150,
        w: 96,
        h: 38,
        accentHex: '#f43f5e',
        label: 'SECTOR 1980',
      },
      {
        kind: 'dk-cabinet-1981',
        x: 740,
        y: 280,
        w: 64,
        h: 72,
        accentHex: '#f43f5e',
        label: '1981 ARCADE',
      },
    ],
  },

  'interior-museo-viviente': {
    id: 'interior-museo-viviente',
    numberLabel: 'MUSEO INTERACTIVO · DÉCADA DE 1970',
    name: 'Museo Viviente de los 70 · Galería del Origen',
    subtitle: 'Hitos jugables y exhibiciones documentadas (1971–1979) que se iluminan conforme restauras la memoria',
    accentHex: '#22d3ee',
    floorHex: '#3a342c',
    floorGridHex: 'rgba(196, 176, 138, 0.18)',
    wallHex: '#2c2822',
    borderHex: '#c4b08a',
    width: 980,
    height: 720,
    walkableBounds: { x: 76, y: 118, w: 828, h: 560 },
    obstacles: [
      { id: 'mus-ped-1', x: 133, y: 210, w: 64, h: 46 },
      { id: 'mus-ped-2', x: 283, y: 210, w: 64, h: 46 },
      { id: 'mus-ped-3', x: 633, y: 210, w: 64, h: 46 },
      { id: 'mus-ped-4', x: 783, y: 210, w: 64, h: 46 },
      { id: 'mus-ped-5', x: 133, y: 310, w: 64, h: 46 },
      { id: 'mus-ped-6', x: 283, y: 310, w: 64, h: 46 },
      { id: 'mus-ped-7', x: 633, y: 310, w: 64, h: 46 },
      { id: 'mus-ped-8', x: 783, y: 310, w: 64, h: 46 },
      { id: 'mus-ped-9', x: 133, y: 410, w: 64, h: 46 },
      { id: 'mus-ped-10', x: 283, y: 410, w: 64, h: 46 },
      { id: 'mus-ped-11', x: 633, y: 410, w: 64, h: 46 },
      { id: 'mus-ped-12', x: 783, y: 410, w: 64, h: 46 },
      { id: 'mus-ped-13', x: 133, y: 510, w: 64, h: 46 },
      { id: 'mus-ped-14', x: 283, y: 510, w: 64, h: 46 },
      { id: 'mus-vec-proj', x: 446, y: 144, w: 88, h: 46 },
    ],
    exits: [
      {
        id: 'exit-museo-outside',
        label: 'Puerta Principal · Las Ruinas del Primer Pulso',
        actionLabel: 'Salir a la Explanada',
        x: 490,
        y: 660,
        accentHex: '#22d3ee',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: [
      {
        kind: 'vector-projector',
        x: 446,
        y: 144,
        w: 88,
        h: 46,
        accentHex: '#a78bfa',
        label: 'PROYECTOR XY 79',
      },
      {
        kind: 'museum-pedestal',
        x: 133,
        y: 210,
        w: 64,
        h: 46,
        accentHex: '#38bdf8',
        label: '1971 COMP. SPACE',
        exhibitId: 'exhibit-computer-space-1971',
      },
      {
        kind: 'museum-pedestal',
        x: 283,
        y: 210,
        w: 64,
        h: 46,
        accentHex: '#f59e0b',
        label: '1972 ODYSSEY',
        exhibitId: 'exhibit-odyssey-1972',
      },
      {
        kind: 'museum-pedestal',
        x: 633,
        y: 210,
        w: 64,
        h: 46,
        accentHex: '#00f3ff',
        label: '1972 PONG · JUGAR',
        exhibitId: 'exhibit-pong-1972',
      },
      {
        kind: 'museum-pedestal',
        x: 783,
        y: 210,
        w: 64,
        h: 46,
        accentHex: '#f472b6',
        label: '1973 GOTCHA',
        exhibitId: 'exhibit-gotcha-1973',
      },
      {
        kind: 'museum-pedestal',
        x: 133,
        y: 310,
        w: 64,
        h: 46,
        accentHex: '#eab308',
        label: '1974 GRAN TRAK',
        exhibitId: 'exhibit-gran-trak-1974',
      },
      {
        kind: 'museum-pedestal',
        x: 283,
        y: 310,
        w: 64,
        h: 46,
        accentHex: '#a3e635',
        label: '1974 TANK',
        exhibitId: 'exhibit-tank-1974',
      },
      {
        kind: 'museum-pedestal',
        x: 633,
        y: 310,
        w: 64,
        h: 46,
        accentHex: '#fb923c',
        label: '1975 GUN FIGHT',
        exhibitId: 'exhibit-gun-fight-1975',
      },
      {
        kind: 'museum-pedestal',
        x: 783,
        y: 310,
        w: 64,
        h: 46,
        accentHex: '#f97316',
        label: '1976 BREAKOUT',
        exhibitId: 'exhibit-breakout-1976',
      },
      {
        kind: 'museum-pedestal',
        x: 133,
        y: 410,
        w: 64,
        h: 46,
        accentHex: '#f43f5e',
        label: '1976 DEATH RACE',
        exhibitId: 'exhibit-death-race-1976',
      },
      {
        kind: 'museum-pedestal',
        x: 283,
        y: 410,
        w: 64,
        h: 46,
        accentHex: '#c084fc',
        label: '1977 SPACE WARS',
        exhibitId: 'exhibit-space-wars-1977',
      },
      {
        kind: 'museum-pedestal',
        x: 633,
        y: 410,
        w: 64,
        h: 46,
        accentHex: '#39ff14',
        label: '1978 INVADERS',
        exhibitId: 'exhibit-space-invaders-1978',
      },
      {
        kind: 'museum-pedestal',
        x: 783,
        y: 410,
        w: 64,
        h: 46,
        accentHex: '#a78bfa',
        label: '1979 LUNAR L.',
        exhibitId: 'exhibit-lunar-lander-1979',
      },
      {
        kind: 'museum-pedestal',
        x: 133,
        y: 510,
        w: 64,
        h: 46,
        accentHex: '#22d3ee',
        label: '1979 ASTEROIDS · PEND.',
        exhibitId: 'exhibit-asteroids-1979',
      },
      {
        kind: 'museum-pedestal',
        x: 283,
        y: 510,
        w: 64,
        h: 46,
        accentHex: '#38bdf8',
        label: '1979 GALAXIAN',
        exhibitId: 'exhibit-galaxian-1979',
      },
      { kind: 'carpet', x: 300, y: 480, w: 600, h: 260, accentHex: '#0c1c2e' },
      { kind: 'potted-plant', x: 140, y: 160, w: 28, h: 32, accentHex: '#22d3ee' },
      { kind: 'potted-plant', x: 330, y: 160, w: 28, h: 32, accentHex: '#f59e0b' },
      { kind: 'potted-plant', x: 520, y: 160, w: 28, h: 32, accentHex: '#a78bfa' },
      { kind: 'potted-plant', x: 740, y: 160, w: 28, h: 32, accentHex: '#f43f5e' },
      { kind: 'potted-plant', x: 140, y: 260, w: 28, h: 32, accentHex: '#00f3ff' },
      { kind: 'potted-plant', x: 330, y: 260, w: 28, h: 32, accentHex: '#38bdf8' },
      { kind: 'potted-plant', x: 520, y: 260, w: 28, h: 32, accentHex: '#a3e635' },
      { kind: 'potted-plant', x: 740, y: 260, w: 28, h: 32, accentHex: '#eab308' },
      { kind: 'potted-plant', x: 140, y: 360, w: 28, h: 32, accentHex: '#38bdf8' },
      { kind: 'potted-plant', x: 330, y: 360, w: 28, h: 32, accentHex: '#f59e0b' },
      { kind: 'potted-plant', x: 520, y: 360, w: 28, h: 32, accentHex: '#00f3ff' },
      { kind: 'potted-plant', x: 740, y: 360, w: 28, h: 32, accentHex: '#f43f5e' },
      { kind: 'dresser', x: 140, y: 200, w: 54, h: 42, accentHex: '#22d3ee', label: 'GUARDIAN SELENE' },
      { kind: 'dresser', x: 400, y: 200, w: 54, h: 42, accentHex: '#22d3ee', label: 'MESA VIDA' },
      { kind: 'dresser', x: 660, y: 200, w: 54, h: 42, accentHex: '#22d3ee', label: 'ARCHIVO PLANO' },
      { kind: 'bed', x: 140, y: 500, w: 50, h: 70, accentHex: '#22d3ee', label: 'COLCHÓN DEL NUEVO' },
      { kind: 'bed', x: 400, y: 500, w: 50, h: 70, accentHex: '#22d3ee', label: 'TIEMPO DESPERTAR' },
      { kind: 'bed', x: 660, y: 500, w: 50, h: 70, accentHex: '#22d3ee', label: 'ALAS IMPLOR' },
      { kind: 'fireplace', x: 300, y: 240, w: 50, h: 36, accentHex: '#f97316', label: 'FOCO DEL VENDEDOR' },
      { kind: 'fireplace', x: 500, y: 240, w: 50, h: 36, accentHex: '#f97316', label: 'MESA DEL CRONISTA' },
    ],
  },

  'dungeon-cueva-glitch': {
    id: 'dungeon-cueva-glitch',
    numberLabel: 'CUEVA GLITCH RPG · NÚCLEO DEL ORIGEN',
    name: 'Cueva Glitch · Laberinto de Corrupción Digital',
    subtitle: 'Sectores del Pulso (1972), Circuitos (1976), Memoria Fractal (1978) y la Consola del Núcleo',
    accentHex: '#00f3ff',
    floorHex: '#070b19',
    floorGridHex: 'rgba(0, 243, 255, 0.08)',
    wallHex: '#02040b',
    borderHex: '#00f3ff',
    width: 1360,
    height: 960,
    walkableBounds: { x: 70, y: 70, w: 1220, h: 820 },
    isDarkCave: true,
    obstacles: [
      // Pared divisoria central sur (entre Sector Pulso y Sector Circuitos)
      { id: 'glitch-obs-div-south', x: 640, y: 560, w: 40, h: 260 },
      // Pared divisoria central norte (barrera del Núcleo)
      { id: 'glitch-obs-core-left', x: 260, y: 440, w: 320, h: 40 },
      { id: 'glitch-obs-core-right', x: 740, y: 440, w: 340, h: 40 },
      // Columnas de basalto corrupto en sector pulso
      { id: 'glitch-col-p1', x: 200, y: 560, w: 36, h: 60 },
      { id: 'glitch-col-p2', x: 380, y: 680, w: 36, h: 60 },
      // Columnas en sector circuito
      { id: 'glitch-col-c1', x: 880, y: 560, w: 36, h: 60 },
      { id: 'glitch-col-c2', x: 1040, y: 680, w: 36, h: 60 },
      // Pasadizo secreto pared fracturada noreste
      { id: 'glitch-obs-secret-pass', x: 1120, y: 240, w: 40, h: 200 },
    ],
    exits: [
      {
        id: 'exit-cueva-glitch',
        label: 'Portal Anómalo · Salir al Cañón de las Cascadas',
        actionLabel: 'Salir de la Cueva',
        x: 625,
        y: 870,
        accentHex: '#00f3ff',
        targetArea: 'exterior-70s',
        targetX: 1880,
        targetY: 710,
      },
    ],
    pressurePuzzle: {
      puzzleId: 'puzzle-glitch-fractal',
      tiles: [
        { id: 'glitch-tile-1', orderIndex: 1, label: '1972 · PONG', x: 940, y: 220, accentHex: '#00f3ff' },
        { id: 'glitch-tile-2', orderIndex: 2, label: '1976 · BREAKOUT', x: 990, y: 220, accentHex: '#f59e0b' },
        { id: 'glitch-tile-3', orderIndex: 3, label: '1978 · SPACE INVADERS', x: 1040, y: 220, accentHex: '#c084fc' },
        { id: 'glitch-tile-4', orderIndex: 4, label: '1979 · ASTEROIDS', x: 1090, y: 220, accentHex: '#34d399' },
      ],
      successMessage: '¡Matriz de Memoria Fractal sintonizada! El arca mnemónica ha emergido.',
    },
    decorProps: [
      { kind: 'vector-projector', x: 160, y: 720, w: 48, h: 48, accentHex: '#00f3ff', label: 'EMISOR PULSO 1972' },
      { kind: 'crt-rack', x: 260, y: 500, w: 54, h: 46, accentHex: '#38bdf8', label: 'RECEPTOR DE SEÑAL' },
      { kind: 'archive-shelf', x: 840, y: 730, w: 60, h: 36, accentHex: '#f59e0b', label: 'TERMINAL TTL 1976' },
      { kind: 'vector-projector', x: 600, y: 150, w: 120, h: 80, accentHex: '#facc15', label: 'NÚCLEO DEL ORIGEN' },
    ],
  },

  'dungeon-laberinto-origen': {
    id: 'dungeon-laberinto-origen',
    numberLabel: 'MAZMORRA SUBTERRÁNEA · 1976',
    name: 'Laberinto de Señales Cromáticas',
    subtitle: 'Corredores TTL bajo las Praderas · Usa la Lámpara [L], armoniza a Sincro-76 y resuelve los 4 pilares RGB',
    accentHex: '#f97316',
    floorHex: '#131629',
    floorGridHex: 'rgba(249, 115, 22, 0.1)',
    wallHex: '#060813',
    borderHex: '#f97316',
    width: 920,
    height: 560,
    walkableBounds: { x: 76, y: 112, w: 768, h: 396 },
    isDarkCave: true,
    obstacles: [
      { id: 'lab-wall-1', x: 256, y: 216, w: 32, h: 292 },
      { id: 'lab-wall-2', x: 424, y: 112, w: 32, h: 148 },
      { id: 'lab-wall-3', x: 424, y: 348, w: 32, h: 160 },
      { id: 'lab-wall-4', x: 604, y: 212, w: 32, h: 204 },
    ],
    exits: [
      {
        id: 'exit-laberinto-surface',
        label: 'Escotilla Superior · Regreso a las Praderas de Pong',
        actionLabel: 'Subir a las Praderas',
        x: 150,
        y: 486,
        accentHex: '#8cd96c',
        targetArea: 'exterior-70s',
        targetX: 2704,
        targetY: 1368,
      },
    ],
    decorProps: [
      {
        kind: 'labyrinth-wall',
        x: 256,
        y: 216,
        w: 32,
        h: 292,
        accentHex: '#38bdf8',
      },
      {
        kind: 'labyrinth-wall',
        x: 424,
        y: 112,
        w: 32,
        h: 148,
        accentHex: '#f97316',
      },
      {
        kind: 'labyrinth-wall',
        x: 424,
        y: 348,
        w: 32,
        h: 160,
        accentHex: '#f97316',
      },
      {
        kind: 'labyrinth-wall',
        x: 604,
        y: 212,
        w: 32,
        h: 204,
        accentHex: '#22c55e',
      },
      {
        kind: 'rgb-frequency-pillar',
        x: 326,
        y: 424,
        w: 36,
        h: 44,
        accentHex: '#facc15',
        label: 'BANDA AMARILLA',
      },
      {
        kind: 'rgb-frequency-pillar',
        x: 512,
        y: 152,
        w: 36,
        h: 44,
        accentHex: '#ef4444',
        label: 'BANDA ROJA',
      },
      {
        kind: 'rgb-frequency-pillar',
        x: 512,
        y: 424,
        w: 36,
        h: 44,
        accentHex: '#22c55e',
        label: 'BANDA VERDE',
      },
      {
        kind: 'rgb-frequency-pillar',
        x: 716,
        y: 424,
        w: 36,
        h: 44,
        accentHex: '#f97316',
        label: 'BANDA NARANJA',
      },
    ],
  },

  'secret-sala-breakout': {
    id: 'secret-sala-breakout',
    numberLabel: 'CÁMARA SECRETA · MAYO DE 1976',
    name: 'Sala Secreta de Breakout (1976)',
    subtitle: 'Bóveda subterránea donde reposa el prototipo jugable de cuatro bandas cromáticas',
    accentHex: '#f97316',
    floorHex: '#161124',
    floorGridHex: 'rgba(249, 115, 22, 0.12)',
    wallHex: '#070510',
    borderHex: '#22d3ee',
    width: 760,
    height: 480,
    walkableBounds: { x: 112, y: 118, w: 536, h: 326 },
    obstacles: [],
    exits: [
      {
        id: 'exit-breakout-to-labyrinth',
        label: 'Compuerta Sur · Regreso al Laberinto de Señales',
        actionLabel: 'Volver al Laberinto',
        x: 380,
        y: 432,
        accentHex: '#22d3ee',
        targetArea: 'dungeon-laberinto-origen',
        targetX: 748,
        targetY: 192,
      },
    ],
    decorProps: [
      {
        kind: 'temporal-conduit',
        x: 152,
        y: 152,
        w: 84,
        h: 44,
        accentHex: '#ef4444',
        label: 'TTL-44 CHIPS',
      },
      {
        kind: 'temporal-conduit',
        x: 524,
        y: 152,
        w: 84,
        h: 44,
        accentHex: '#22d3ee',
        label: 'CELOFÁN RGB',
      },
    ],
  },

  'castle-murallas': {
    id: 'castle-murallas',
    numberLabel: 'ZONA I · LAS MURALLAS DEL DESTIERRO',
    name: 'Murallas del Destierro · Patio de Armas',
    subtitle: 'Almenas de basalto milenario azotadas por viento oscuro y centinelas de piedra',
    accentHex: '#c084fc',
    floorHex: '#1e1c29',
    floorGridHex: 'rgba(192, 132, 252, 0.08)',
    wallHex: '#0f0e17',
    borderHex: '#c084fc',
    width: 880,
    height: 560,
    walkableBounds: { x: 50, y: 80, w: 780, h: 430 },
    obstacles: [
      { id: 'mur-col-w', x: 220, y: 190, w: 56, h: 64 },
      { id: 'mur-col-e', x: 604, y: 190, w: 56, h: 64 },
      { id: 'mur-col-sw', x: 220, y: 350, w: 56, h: 64 },
      { id: 'mur-col-se', x: 604, y: 350, w: 56, h: 64 },
    ],
    exits: [
      {
        id: 'exit-murallas-to-exterior',
        label: 'Puente Levadizo · Regreso al Exterior de la Isla',
        actionLabel: 'Salir al Exterior',
        x: 440,
        y: 490,
        accentHex: '#c084fc',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
      {
        id: 'exit-murallas-to-laberinto',
        label: 'Rastrillo Norte · Entrada al Laberinto de las Doce Puertas',
        actionLabel: 'Entrar al Laberinto',
        x: 440,
        y: 120,
        accentHex: '#818cf8',
        targetArea: 'castle-laberinto',
        targetX: 480,
        targetY: 480,
      },
    ],
    decorProps: [
      { kind: 'castle-banner', x: 140, y: 130, w: 40, h: 80, accentHex: '#a855f7', label: 'ESTANDARTE OSCURO' },
      { kind: 'castle-banner', x: 700, y: 130, w: 40, h: 80, accentHex: '#a855f7', label: 'ESTANDARTE OSCURO' },
      { kind: 'castle-statue', x: 300, y: 120, w: 48, h: 64, accentHex: '#94a3b8', label: 'GUARDIÁN DEL SOL' },
      { kind: 'castle-statue', x: 532, y: 120, w: 48, h: 64, accentHex: '#94a3b8', label: 'GUARDIÁN DE LA LUNA' },
      { kind: 'castle-statue', x: 220, y: 190, w: 56, h: 64, accentHex: '#c084fc', label: 'TORREÓN OESTE' },
      { kind: 'castle-statue', x: 604, y: 190, w: 56, h: 64, accentHex: '#c084fc', label: 'TORREÓN ESTE' },
      { kind: 'castle-statue', x: 220, y: 350, w: 56, h: 64, accentHex: '#c084fc', label: 'PILAR SUR OESTE' },
      { kind: 'castle-statue', x: 604, y: 350, w: 56, h: 64, accentHex: '#c084fc', label: 'PILAR SUR ESTE' },
    ],
  },

  'castle-laberinto': {
    id: 'castle-laberinto',
    numberLabel: 'ZONA II · EL LABERINTO DE LAS DOCE PUERTAS',
    name: 'Laberinto de las Doce Puertas',
    subtitle: 'Corredores de piedra tallada, glifos de la edad dorada y atajos mecánicos',
    accentHex: '#818cf8',
    floorHex: '#181827',
    floorGridHex: 'rgba(129, 140, 248, 0.08)',
    wallHex: '#0c0c16',
    borderHex: '#818cf8',
    width: 960,
    height: 600,
    walkableBounds: { x: 50, y: 80, w: 860, h: 480 },
    obstacles: [
      { id: 'lab-wall-1', x: 220, y: 160, w: 32, h: 220 },
      { id: 'lab-wall-2', x: 380, y: 260, w: 32, h: 220 },
      { id: 'lab-wall-3', x: 560, y: 160, w: 32, h: 220 },
      { id: 'lab-wall-4', x: 720, y: 260, w: 32, h: 220 },
    ],
    exits: [
      {
        id: 'exit-laberinto-to-murallas',
        label: 'Rastrillo Sur · Regreso a las Murallas',
        actionLabel: 'Volver a las Murallas',
        x: 480,
        y: 530,
        accentHex: '#c084fc',
        targetArea: 'castle-murallas',
        targetX: 440,
        targetY: 160,
      },
      {
        id: 'exit-laberinto-to-cimientos',
        label: 'Escalera Espiral · Descenso a los Cimientos del Reino',
        actionLabel: 'Bajar a los Cimientos',
        x: 820,
        y: 130,
        accentHex: '#06b6d4',
        targetArea: 'castle-cimientos',
        targetX: 460,
        targetY: 480,
      },
    ],
    decorProps: [
      { kind: 'labyrinth-wall', x: 220, y: 160, w: 32, h: 220, accentHex: '#818cf8', label: 'MURO DE PIEDRA I' },
      { kind: 'labyrinth-wall', x: 380, y: 260, w: 32, h: 220, accentHex: '#818cf8', label: 'MURO DE PIEDRA II' },
      { kind: 'labyrinth-wall', x: 560, y: 160, w: 32, h: 220, accentHex: '#818cf8', label: 'MURO DE PIEDRA III' },
      { kind: 'labyrinth-wall', x: 720, y: 260, w: 32, h: 220, accentHex: '#818cf8', label: 'MURO DE PIEDRA IV' },
      { kind: 'castle-statue', x: 120, y: 140, w: 48, h: 64, accentHex: '#818cf8', label: 'GLIFO ALFA' },
      { kind: 'castle-statue', x: 480, y: 140, w: 48, h: 64, accentHex: '#818cf8', label: 'GLIFO OMEGA' },
      { kind: 'temporal-conduit', x: 300, y: 130, w: 60, h: 40, accentHex: '#818cf8', label: 'CONDUCCIÓN 1971' },
      { kind: 'temporal-conduit', x: 640, y: 130, w: 60, h: 40, accentHex: '#818cf8', label: 'CONDUCCIÓN 1978' },
    ],
  },

  'castle-cimientos': {
    id: 'castle-cimientos',
    numberLabel: 'ZONA III · LOS CIMIENTOS DEL REINO',
    name: 'Cimientos del Reino · Canal Hidráulico',
    subtitle: 'Maquinaria de vapor, acueductos subterráneos y pistones del gran montacargas',
    accentHex: '#06b6d4',
    floorHex: '#0c1d28',
    floorGridHex: 'rgba(6, 182, 212, 0.08)',
    wallHex: '#050f16',
    borderHex: '#06b6d4',
    width: 920,
    height: 580,
    walkableBounds: { x: 50, y: 80, w: 820, h: 460 },
    obstacles: [
      { id: 'cim-canal-w', x: 150, y: 290, w: 220, h: 48 },
      { id: 'cim-canal-e', x: 550, y: 290, w: 220, h: 48 },
      { id: 'cim-piston', x: 430, y: 150, w: 60, h: 60 },
    ],
    exits: [
      {
        id: 'exit-cimientos-to-laberinto',
        label: 'Escalera Espiral · Regreso al Laberinto',
        actionLabel: 'Subir al Laberinto',
        x: 460,
        y: 510,
        accentHex: '#818cf8',
        targetArea: 'castle-laberinto',
        targetX: 820,
        targetY: 170,
      },
      {
        id: 'exit-cimientos-to-biblioteca',
        label: 'Montacargas Hidráulico · Ascenso a la Gran Biblioteca',
        actionLabel: 'Subir a la Biblioteca',
        x: 460,
        y: 120,
        accentHex: '#f59e0b',
        targetArea: 'castle-biblioteca',
        targetX: 470,
        targetY: 480,
      },
    ],
    decorProps: [
      { kind: 'castle-valve', x: 220, y: 230, w: 48, h: 54, accentHex: '#06b6d4', label: 'VÁLVULA [A]' },
      { kind: 'castle-valve', x: 460, y: 230, w: 48, h: 54, accentHex: '#06b6d4', label: 'VÁLVULA [B]' },
      { kind: 'castle-valve', x: 700, y: 230, w: 48, h: 54, accentHex: '#06b6d4', label: 'VÁLVULA [C]' },
      { kind: 'underground-pool', x: 150, y: 290, w: 220, h: 48, accentHex: '#06b6d4' },
      { kind: 'underground-pool', x: 550, y: 290, w: 220, h: 48, accentHex: '#06b6d4' },
      { kind: 'temporal-conduit', x: 430, y: 150, w: 60, h: 60, accentHex: '#06b6d4', label: 'PISTÓN HIDRÁULICO' },
    ],
  },

  'castle-biblioteca': {
    id: 'castle-biblioteca',
    numberLabel: 'ZONA IV · LA BIBLIOTECA DE LOS REYES',
    name: 'Gran Biblioteca de los Reyes',
    subtitle: 'Crónicas fundacionales, manuscritos del origen y estanterías mecánicas',
    accentHex: '#f59e0b',
    floorHex: '#221912',
    floorGridHex: 'rgba(245, 158, 11, 0.08)',
    wallHex: '#120d09',
    borderHex: '#f59e0b',
    width: 940,
    height: 600,
    walkableBounds: { x: 50, y: 80, w: 840, h: 480 },
    obstacles: [
      { id: 'bib-shelf-1', x: 130, y: 170, w: 100, h: 50 },
      { id: 'bib-shelf-2', x: 710, y: 170, w: 100, h: 50 },
      { id: 'bib-shelf-secret', x: 420, y: 120, w: 100, h: 54 },
    ],
    exits: [
      {
        id: 'exit-biblioteca-to-cimientos',
        label: 'Montacargas Hidráulico · Regreso a los Cimientos',
        actionLabel: 'Bajar a los Cimientos',
        x: 470,
        y: 530,
        accentHex: '#06b6d4',
        targetArea: 'castle-cimientos',
        targetX: 460,
        targetY: 160,
      },
      {
        id: 'exit-biblioteca-to-torre',
        label: 'Pasadizo Secreto tras la Estantería · Ascenso a la Torre del Tiempo',
        actionLabel: 'Subir a la Torre del Tiempo',
        x: 470,
        y: 120,
        accentHex: '#fbbf24',
        targetArea: 'castle-torre',
        targetX: 450,
        targetY: 480,
      },
    ],
    decorProps: [
      { kind: 'castle-lectern', x: 230, y: 320, w: 44, h: 48, accentHex: '#f59e0b', label: 'ATRIL I' },
      { kind: 'castle-lectern', x: 390, y: 320, w: 44, h: 48, accentHex: '#38bdf8', label: 'ATRIL II' },
      { kind: 'castle-lectern', x: 550, y: 320, w: 44, h: 48, accentHex: '#a855f7', label: 'ATRIL III' },
      { kind: 'castle-lectern', x: 710, y: 320, w: 44, h: 48, accentHex: '#ef4444', label: 'ATRIL IV' },
      { kind: 'archive-shelf', x: 130, y: 170, w: 100, h: 50, accentHex: '#f59e0b', label: 'TOMOS 1971-1975' },
      { kind: 'archive-shelf', x: 710, y: 170, w: 100, h: 50, accentHex: '#f59e0b', label: 'TOMOS 1976-1979' },
      { kind: 'archive-shelf', x: 420, y: 120, w: 100, h: 54, accentHex: '#fde047', label: 'ESTANTERÍA MECÁNICA' },
    ],
  },

  'castle-torre': {
    id: 'castle-torre',
    numberLabel: 'ZONA V · LA TORRE DEL TIEMPO',
    name: 'La Torre del Tiempo',
    subtitle: 'Engranajes colosales de latón, péndulos oscilantes y la puerta hacia el cielo',
    accentHex: '#fbbf24',
    floorHex: '#221c12',
    floorGridHex: 'rgba(251, 191, 36, 0.08)',
    wallHex: '#120e09',
    borderHex: '#fbbf24',
    width: 900,
    height: 600,
    walkableBounds: { x: 50, y: 80, w: 800, h: 480 },
    obstacles: [
      { id: 'tor-gear-left', x: 180, y: 220, w: 76, h: 76 },
      { id: 'tor-gear-right', x: 644, y: 220, w: 76, h: 76 },
      { id: 'tor-central-column', x: 420, y: 230, w: 60, h: 60 },
    ],
    exits: [
      {
        id: 'exit-torre-to-biblioteca',
        label: 'Pasadizo de Escaleras · Regreso a la Biblioteca',
        actionLabel: 'Bajar a la Biblioteca',
        x: 450,
        y: 530,
        accentHex: '#f59e0b',
        targetArea: 'castle-biblioteca',
        targetX: 470,
        targetY: 170,
      },
      {
        id: 'exit-torre-to-trono',
        label: 'Portal Maestro del Reloj · Entrada a la Sala del Trono',
        actionLabel: 'Entrar a la Sala del Trono',
        x: 450,
        y: 120,
        accentHex: '#ec4899',
        targetArea: 'castle-trono',
        targetX: 490,
        targetY: 510,
      },
    ],
    decorProps: [
      { kind: 'castle-gear', x: 180, y: 220, w: 76, h: 76, accentHex: '#fbbf24', label: 'ENGRANAJE I' },
      { kind: 'castle-gear', x: 644, y: 220, w: 76, h: 76, accentHex: '#fbbf24', label: 'ENGRANAJE II' },
      { kind: 'castle-pendulum', x: 420, y: 130, w: 60, h: 90, accentHex: '#fde047', label: 'PÉNDULO BOREAL' },
      { kind: 'temporal-conduit', x: 130, y: 140, w: 60, h: 40, accentHex: '#fbbf24', label: 'RELOJ MASTER' },
      { kind: 'temporal-conduit', x: 710, y: 140, w: 60, h: 40, accentHex: '#fbbf24', label: 'ESCAPE DE ANCLA' },
    ],
  },

  'castle-trono': {
    id: 'castle-trono',
    numberLabel: 'ZONA VI · LA SALA DEL TRONO DEL REY CORRUPTO',
    name: 'Sala del Trono del Rey Corrupto',
    subtitle: 'El santuario corrompido de Donkey Kong, el Núcleo de Super KOOPA y el Hangar Estelar',
    accentHex: '#ec4899',
    floorHex: '#1d122b',
    floorGridHex: 'rgba(236, 72, 153, 0.09)',
    wallHex: '#0f0917',
    borderHex: '#a855f7',
    width: 980,
    height: 640,
    walkableBounds: { x: 50, y: 80, w: 880, h: 510 },
    obstacles: [
      { id: 'tro-pillar-w1', x: 200, y: 230, w: 48, h: 48 },
      { id: 'tro-pillar-w2', x: 200, y: 390, w: 48, h: 48 },
      { id: 'tro-pillar-e1', x: 732, y: 230, w: 48, h: 48 },
      { id: 'tro-pillar-e2', x: 732, y: 390, w: 48, h: 48 },
    ],
    exits: [
      {
        id: 'exit-trono-to-torre',
        label: 'Portal Maestro · Regreso a la Torre del Tiempo',
        actionLabel: 'Volver a la Torre',
        x: 490,
        y: 560,
        accentHex: '#fbbf24',
        targetArea: 'castle-torre',
        targetX: 450,
        targetY: 160,
      },
    ],
    decorProps: [
      { kind: 'castle-throne', x: 450, y: 140, w: 80, h: 80, accentHex: '#ec4899', label: 'TRONO CORRUPTO' },
      { kind: 'corruption-core', x: 466, y: 100, w: 48, h: 48, accentHex: '#a855f7', label: 'NÚCLEO DIGITAL' },
      { kind: 'space-invaders-ship', x: 440, y: 40, w: 100, h: 64, accentHex: '#22c55e', label: 'NAVE 1978' },
      { kind: 'castle-banner', x: 120, y: 110, w: 40, h: 80, accentHex: '#ec4899', label: 'BLASÓN CORROMPIDO' },
      { kind: 'castle-banner', x: 820, y: 110, w: 40, h: 80, accentHex: '#ec4899', label: 'BLASÓN CORROMPIDO' },
    ],
  },

  'interior-sala-cuatro-caminos': {
    id: 'interior-sala-cuatro-caminos',
    numberLabel: 'CORDILLERA DEL PRIMER PULSO · LOS CUATRO CAMINOS',
    name: 'Sala Arcade de Los Cuatro Caminos',
    subtitle:
      'Un salón recreativo clausurado hace décadas: hileras de gabinetes apagados, cables sueltos y el eco de una edad dorada',
    accentHex: '#f59e0b',
    floorHex: '#241b15',
    floorGridHex: 'rgba(245, 158, 11, 0.06)',
    wallHex: '#140e0a',
    borderHex: '#7c4a22',
    width: 2100,
    height: 820,
    walkableBounds: { x: 72, y: 156, w: 1956, h: 596 },
    obstacles: [
      ...CUATRO_CAMINOS_ARCADE_MACHINES.map((machine) => ({
        id: machine.id,
        x: machine.x,
        y: machine.y,
        w: machine.w,
        h: machine.h,
      })),
      { id: 'arcade-change-machine', x: 86, y: 210, w: 34, h: 46 },
      { id: 'arcade-crate-stack', x: 92, y: 604, w: 44, h: 38 },
      { id: 'arcade-parts-table', x: 1016, y: 604, w: 48, h: 36 },
    ],
    exits: [
      {
        id: 'exit-arcade-cuatro-caminos',
        label: 'Puerta principal · Salida a Los Cuatro Caminos',
        actionLabel: 'Salir a Los Cuatro Caminos',
        x: 620,
        y: 742,
        accentHex: '#f59e0b',
        targetArea: 'exterior-70s',
        returnToSavedExterior: true,
      },
    ],
    decorProps: CUATRO_CAMINOS_ARCADE_MACHINES.map((machine) => ({
      kind: 'arcade-machine' as const,
      x: machine.x,
      y: machine.y,
      w: machine.w,
      h: machine.h,
      accentHex: machine.accentHex,
      label: machine.marquee,
      arcade: {
        variant: machine.variant,
        facing: machine.facing,
        marquee: machine.marquee,
        year: machine.year,
        broken: machine.broken,
      },
    })),
  },
};

export const DK_CABINET_80S_INTERACT = {
  x: 740,
  y: 312,
};

export const LABYRINTH_1976_ENTRANCE = {
  id: 'hatch-laberinto-1976',
  label: 'Escotilla Subterránea Cifrada · Sector 1976',
  x: 2704,
  y: 1336,
  targetArea: 'dungeon-laberinto-origen' as RpgAreaId,
  targetSpawnX: 150,
  targetSpawnY: 446,
  returnExteriorX: 2704,
  returnExteriorY: 1368,
};

export const LABYRINTH_SECRET_DOOR = {
  id: 'door-to-sala-breakout',
  label: 'Compuerta Sellada · Sala Secreta de 1976',
  x: 748,
  y: 148,
  puzzleId: 'puzzle-laberinto-rgb-1976',
  targetArea: 'secret-sala-breakout' as RpgAreaId,
  targetSpawnX: 380,
  targetSpawnY: 396,
};

export const BREAKOUT_CABINET_INTERACT = {
  x: 380,
  y: 236,
};

export interface RgbFrequencyPillarSpec {
  id: string;
  stepOrder: 1 | 2 | 3 | 4; // 1 Amarillo -> 2 Verde -> 3 Naranja -> 4 Rojo
  bandName: string;
  pointsHint: string;
  x: number;
  y: number;
  colorHex: string;
}

export const LABYRINTH_RGB_PILLARS: RgbFrequencyPillarSpec[] = [
  {
    id: 'pillar-yellow',
    stepOrder: 1,
    bandName: 'Pilar Amarillo (Franja Inferior · 1 pto)',
    pointsHint: 'Franja 1 · Base Amarilla',
    x: 344,
    y: 446,
    colorHex: '#facc15',
  },
  {
    id: 'pillar-green',
    stepOrder: 2,
    bandName: 'Pilar Verde (Franja Media-Baja · 3 pts)',
    pointsHint: 'Franja 2 · Capa Verde',
    x: 530,
    y: 446,
    colorHex: '#22c55e',
  },
  {
    id: 'pillar-orange',
    stepOrder: 3,
    bandName: 'Pilar Naranja (Franja Media-Alta · 5 pts)',
    pointsHint: 'Franja 3 · Capa Naranja',
    x: 734,
    y: 446,
    colorHex: '#f97316',
  },
  {
    id: 'pillar-red',
    stepOrder: 4,
    bandName: 'Pilar Rojo (Cúspide del Muro · 7 pts)',
    pointsHint: 'Franja 4 · Cúspide Roja',
    x: 530,
    y: 174,
    colorHex: '#ef4444',
  },
];

export const MUSEUM_VECTOR_CONSOLE = {
  id: 'console-vector-79',
  puzzleId: 'puzzle-museo-vector-79',
  label: 'Proyector Vectorial QuadraScan XY (1979)',
  x: 490,
  y: 198,
  targetAngles: [45, 90, 180] as [number, number, number],
};

export interface MuseumPedestalPlacement {
  exhibitId: string;
  x: number;
  y: number;
}

export const MUSEUM_PEDESTAL_SPOTS: MuseumPedestalPlacement[] = [
  { exhibitId: 'exhibit-computer-space-1971', x: 165, y: 259 },
  { exhibitId: 'exhibit-odyssey-1972', x: 315, y: 259 },
  { exhibitId: 'exhibit-pong-1972', x: 665, y: 259 },
  { exhibitId: 'exhibit-gotcha-1973', x: 815, y: 259 },
  { exhibitId: 'exhibit-gran-trak-1974', x: 165, y: 359 },
  { exhibitId: 'exhibit-tank-1974', x: 315, y: 359 },
  { exhibitId: 'exhibit-gun-fight-1975', x: 665, y: 359 },
  { exhibitId: 'exhibit-breakout-1976', x: 815, y: 359 },
  { exhibitId: 'exhibit-death-race-1976', x: 165, y: 459 },
  { exhibitId: 'exhibit-space-wars-1977', x: 315, y: 459 },
  { exhibitId: 'exhibit-space-invaders-1978', x: 665, y: 459 },
  { exhibitId: 'exhibit-lunar-lander-1979', x: 815, y: 459 },
  { exhibitId: 'exhibit-asteroids-1979', x: 165, y: 559 },
  { exhibitId: 'exhibit-galaxian-1979', x: 315, y: 559 },
];

export interface GuardianCreatureSpec {
  id: string;
  name: string;
  speciesLabel: string;
  areaId: RpgAreaId;
  x: number;
  y: number;
  accentHex: string;
  secondaryHex: string;
  blocksPassageRect?: SolidObstacleRect;
  requiresLanternOrScanner: boolean;
  dormantPrompt: string;
  calmedMessage: string;
  clueIdGranted?: string;
}

export const GUARDIAN_CREATURES: GuardianCreatureSpec[] = [
  {
    id: 'creature-lumen-bosque',
    name: 'Lumen-Bit del Claro',
    speciesLabel: 'CRIATURA DE FÓSFORO · BOSQUE DE LAS SEÑALES',
    areaId: 'exterior-70s',
    x: 825,
    y: 968,
    accentHex: '#34d399',
    secondaryHex: '#facc15',
    requiresLanternOrScanner: false,
    dormantPrompt: 'Sintonizar Lumen-Bit',
    calmedMessage:
      'La polilla de fósforo danza alrededor de Pixel trazando ondas sinusoidales verdes: su zumbido reproduce el reloj de cristal de 14.318 MHz empleado en las primeras placas arcade.',
    clueIdGranted: 'clue-frecuencia-bosque',
  },
  {
    id: 'creature-sincro-laberinto',
    name: 'Sincro-76 · Centinela de Fase',
    speciesLabel: 'GUARDIÁN DE CORREDOR · LABERINTO 1976',
    areaId: 'dungeon-laberinto-origen',
    x: 440,
    y: 302,
    accentHex: '#f97316',
    secondaryHex: '#22d3ee',
    blocksPassageRect: { id: 'sincro-barrier', x: 416, y: 262, w: 48, h: 84 },
    requiresLanternOrScanner: true,
    dormantPrompt: 'Armonizar Centinela',
    calmedMessage:
      'Al bañarlo con la Lámpara de Fósforo [L] o el pulso del Escáner [R], Sincro-76 pliega sus escudos geométricos y despeja el corredor central del Laberinto de Señales.',
  },
  {
    id: 'creature-vectra-caverna',
    name: 'Vectra-79 · Prisma Viviente',
    speciesLabel: 'ENTIDAD VECTORIAL · CAVERNAS DE MEMORIA',
    areaId: 'exterior-70s',
    x: 1140,
    y: 652,
    accentHex: '#a78bfa',
    secondaryHex: '#22d3ee',
    requiresLanternOrScanner: false,
    dormantPrompt: 'Observar Prisma Vectra-79',
    calmedMessage:
      'Sus alas poliédricas trazan líneas puras sin píxeles escalonados, exactamente como un monitor vectorial XY cuyos ángulos maestros son 45°, 90° y 180°.',
    clueIdGranted: 'clue-haz-vectorial-79',
  },
];

export interface InvestigationCaseSpec {
  id: string;
  code: string;
  title: string;
  eraTag: string;
  accentHex: string;
  summary: string;
  clues: {
    id: string;
    title: string;
    sourceHint: string;
    findingText: string;
  }[];
  deductionQuestion: string;
  options: {
    id: string;
    label: string;
    isCorrect: boolean;
  }[];
  conclusionText: string;
  rewardSummary: string;
  rewardItemIds: string[];
}

export const INVESTIGATION_CASES: InvestigationCaseSpec[] = [
  {
    id: 'case-origen-1972',
    code: 'CASO-01',
    title: 'El Enigma de la Taberna de Sunnyvale (1972)',
    eraTag: 'INVESTIGACIÓN · 1971–1972',
    accentHex: '#00f3ff',
    summary:
      'Averigua qué ocurrió realmente cuando el primer prototipo público de Pong dejó de funcionar apenas unos días después de su estreno.',
    clues: [
      {
        id: 'clue-sunnyvale-monedas',
        title: 'Recorte de Sunnyvale',
        sourceHint: 'Inspecciona el recorte de prensa en el Centro de Historia (Aldea).',
        findingText:
          'Allan Alcorn abrió el prototipo en Andy Capp’s Tavern y halló el depósito de monedas desbordado de cuartos de dólar.',
      },
      {
        id: 'clue-museo-odyssey-pong',
        title: 'Placa Curatorial de 1972',
        sourceHint: 'Examina el pedestal de Pong o Magnavox Odyssey en el Museo Viviente.',
        findingText:
          'Pong carecía de microprocesador y código de software; funcionaba con contadores TTL discretos sumamente fiables.',
      },
      {
        id: 'clue-frecuencia-bosque',
        title: 'Armonía de Cristal TTL',
        sourceHint: 'Observa a la criatura Lumen-Bit en el Bosque de las Señales.',
        findingText:
          'El reloj de cristal de la placa mantenía el pulso intacto: la supuesta avería nunca fue electrónica.',
      },
    ],
    deductionQuestion:
      'Según las evidencias reunidas, ¿por qué dejó de aceptar partidas el primer prototipo de Pong en Sunnyvale?',
    options: [
      {
        id: 'opt-overheat',
        label: 'Se fundió el microprocesador de 8 bits por exceso de temperatura.',
        isCorrect: false,
      },
      {
        id: 'opt-coinbox',
        label: 'El cajón de monedas rebosó de cuartos de dólar y bloqueó el mecanismo de entrada.',
        isCorrect: true,
      },
      {
        id: 'opt-crt',
        label: 'Se agotó la batería interna de la memoria ROM tras cien partidas.',
        isCorrect: false,
      },
    ],
    conclusionText:
      '¡Caso resuelto! El éxito fue tan abrumador que las monedas atascaron el mecanismo mecánico, confirmando a Atari que el videojuego arcade tenía un futuro masivo.',
    rewardSummary: 'Registro Histórico Verificado + Avance de Cronista',
    rewardItemIds: [],
  },
  {
    id: 'case-muro-1976',
    code: 'CASO-02',
    title: 'Las Cuatro Bandas del Prototipo Secreto (1976)',
    eraTag: 'INVESTIGACIÓN · BREAKOUT 1976',
    accentHex: '#f97316',
    summary:
      'Descubre cómo lograba Breakout mostrar cuatro franjas de color en 1976 sin memoria gráfica RGB y cuál era su orden energético.',
    clues: [
      {
        id: 'clue-celofan-wozniak',
        title: 'Cuaderno de Bandas CRT',
        sourceHint: 'Lee el cuaderno técnico dentro del Taller Analógico del Bosque.',
        findingText:
          'El monitor era monocromo blanco y negro; cuatro tiras físicas de celofán coloreaban el muro (Amarillo, Verde, Naranja y Rojo en la cima).',
      },
      {
        id: 'clue-museo-breakout-hint',
        title: 'Pedestal Cifrado de 1976',
        sourceHint: 'Inspecciona el pedestal de Breakout (1976) en el Museo Viviente.',
        findingText:
          'El diseño original optimizado en cuatro noches redujo drásticamente el número de chips TTL antes de la era del Apple II.',
      },
      {
        id: 'clue-secuencia-laberinto',
        title: 'Estela del Laberinto',
        sourceHint: 'Desciende a la Escotilla de 1976 al norte de las Praderas de Pong.',
        findingText:
          'La puntuación y la velocidad aumentan al perforar desde la base amarilla hasta la franja roja superior.',
      },
    ],
    deductionQuestion:
      '¿Qué técnica permitía ver ladrillos amarillos, verdes, naranjas y rojos en el gabinete original de Breakout (1976)?',
    options: [
      {
        id: 'opt-celofan',
        label: 'Tiras translúcidas de celofán adheridas sobre un monitor CRT monocromo.',
        isCorrect: true,
      },
      {
        id: 'opt-vga',
        label: 'Una tarjeta gráfica VGA de 256 colores conectada a un chip de sonido FM.',
        isCorrect: false,
      },
      {
        id: 'opt-laser',
        label: 'Proyectores láser rotatorios detrás de un espejo cóncavo.',
        isCorrect: false,
      },
    ],
    conclusionText:
      '¡Deducción impecable! Aquel ingenio óptico de celofán sobre fósforo blanco convirtió una señal monocroma en uno de los iconos cromáticos más célebres de los años 70.',
    rewardSummary: 'Lámina de Celofán Ámbar-Cian [CEL-76]',
    rewardItemIds: ['item-filtro-interdecada'],
  },
  {
    id: 'case-horizonte-vectorial',
    code: 'CASO-03',
    title: 'El Salto de los Haces de Luz Pura (1979)',
    eraTag: 'INVESTIGACIÓN · FRONTERA 1979',
    accentHex: '#a78bfa',
    summary:
      'Investiga cómo cerraron la década de 1970 clásicos como Lunar Lander y Asteroids antes de la llegada del color raster de los años 80.',
    clues: [
      {
        id: 'clue-haz-vectorial-79',
        title: 'Geometría de Vectra-79',
        sourceHint: 'Observa a la criatura Vectra-79 en Las Cavernas de Memoria.',
        findingText:
          'Sus trazos luminosos se orientan en ángulos exactos de 45°, 90° y 180° sin barrido horizontal de televisión.',
      },
      {
        id: 'clue-museo-vector-1979',
        title: 'Placas de Lunar Lander y Asteroids',
        sourceHint: 'Examina las exhibiciones de 1979 en el ala derecha del Museo Viviente.',
        findingText:
          'En 1979, el Generador Vectorial Digital (DVG) dirigía el haz de electrones directamente entre coordenadas X e Y.',
      },
    ],
    deductionQuestion:
      '¿Qué diferenciaba a los monitores vectoriales de Lunar Lander y Asteroids (1979) frente a las pantallas arcade convencionales?',
    options: [
      {
        id: 'opt-lcd',
        label: 'Utilizaban pantallas de cristal líquido iluminadas con velas internas.',
        isCorrect: false,
      },
      {
        id: 'opt-xy-beam',
        label: 'Trazaban líneas geométricas directas entre puntos X-Y con el haz de electrones, logrando nitidez extrema.',
        isCorrect: true,
      },
      {
        id: 'opt-film',
        label: 'Reproducían rollos de película de celuloide de 16 milímetros.',
        isCorrect: false,
      },
    ],
    conclusionText:
      '¡Caso cerrado! La tecnología vectorial XY de 1979 coronó la primera década arcade con naves ingrávidas y rocas afiladas de luz pura.',
    rewardSummary: 'Lente Vectorial QuadraScan [VEC-79]',
    rewardItemIds: ['item-lente-vectorial-79'],
  },
];

export function doesCircleCollideRect(
  cx: number,
  cy: number,
  radius: number,
  rect: { x: number; y: number; w: number; h: number }
): boolean {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function isBlockedByExteriorBuilding(px: number, py: number): boolean {
  for (const b of ISLAND_70S_BUILDINGS) {
    if (doesCircleCollideRect(px, py, 12, { x: b.x, y: b.y, w: b.w, h: b.h })) {
      return true;
    }
  }
  return false;
}

export function isWalkableInSubArea(
  area: SubAreaSpec,
  px: number,
  py: number,
  calmedCreatureIds: string[] = [],
  allUnlocked = false,
  solvedPuzzleIds: string[] = []
): boolean {
  const b = area.walkableBounds;
  if (px < b.x + 4 || px > b.x + b.w - 4 || py < b.y + 4 || py > b.y + b.h - 4) {
    return false;
  }
  for (const obs of area.obstacles) {
    if (
      obs.id === 'bib-shelf-secret' &&
      (allUnlocked || solvedPuzzleIds.includes('puzzle-cronica-reyes'))
    ) {
      continue;
    }
    if (doesCircleCollideRect(px, py, 10, obs)) {
      return false;
    }
  }
  if (!allUnlocked) {
    for (const cr of GUARDIAN_CREATURES) {
      if (
        cr.areaId === area.id &&
        cr.blocksPassageRect &&
        !calmedCreatureIds.includes(cr.id) &&
        doesCircleCollideRect(px, py, 10, cr.blocksPassageRect)
      ) {
        return false;
      }
    }
  }
  return true;
}
