/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MOTOR DE RENDERIZADO PIXEL-ART ESTILO GAME BOY COLOR (CUADRÍCULA LÓGICA 16×16 ESCALADA 2×)
 * ISLA 01 — ISLA DEL ORIGEN:
 *   - Zona 1: El Pueblo del Origen (casas GBC, empedrado, vallas, Terminal de Guardado, carteles)
 *   - Zona 2: Las Praderas del Pixel (hierba verde, flores animadas, arroyo con puente, Pong)
 *   - Zona 3: El Bosque de los Secretos (árboles GBC densos, pasadizo oculto entre copas, Taller)
 *   - Zona 4: La Fortaleza Volcánica (roca basáltica, lava pixel-art animada, murallas, Space Invaders)
 *   - Zona 5: La Costa y las Ruinas del Tiempo (arena, muelle, túneles en rocas, Secreto del Origen)
 */

import { PixelverseProgressState } from '../memories/progressionState';
import type { AvatarAppearance } from '../avatar/avatarOptions';
import {
  AnomalyPortalSpec,
  BROKEN_RELAY_MECHANISM,
  COASTAL_SUBTERRANEAN_TUNNELS,
  evaluateTimeMachineStatus,
  ExteriorBuildingSpec,
  FacingDirection,
  GUARDIAN_CREATURES,
  GuardianCreatureSpec,
  HARBOR_80S_FERRY,
  ISLAND_70S_BUILDINGS,
  ISLAND_ANOMALY_PORTALS,
  ISLAND_NORTH_CAVE_ENTRANCES,
  IslandCaveEntranceSpec,
  ISLAND_WOODEN_SIGNS,
  LABYRINTH_1976_ENTRANCE,
  RPG_CHESTS,
  RPG_EXAMINABLES,
  VILLAGE_SAVE_TERMINAL,
  WATERFALL_SECRET_ENTRANCE,
} from '../rpg/rpgContent';
import {
  DISTANT_DECADE_VISTAS,
  ISLAND_DIAMONDS,
  ISLAND_ECHOES,
  ISLAND_KEY_COORDS,
  ISLAND_ROUTE_RAILS,
  NORTH_ARCADE_LAYOUT,
  VOLCANIC_ARCADE_LAYOUT,
  VOLCANIC_GUARD_ID,
  ISLAND_NPCS,
  IslandNpcSpec,
  ISLAND_SWITCHES,
  ISLAND_WALKABLE_RECTS,
  ISLAND_WORLD_H,
  ISLAND_WORLD_W,
  ISLAND_ZONES,
  IslandZoneId,
  WalkableRect,
  ISLAND_PIER_SPEC,
  ISLAND_SAND_MOUNDS,
  LAVA_STRAIGHT_BRIDGE_SPEC,
  ORIGEN_CALA_CANAL,
  ORIGEN_FOREST_LAKE,
  ORIGEN_LASER_CONSOLE,
  ORIGEN_SECURITY_RUINS,
  ORIGEN_SECTOR_GATE,
} from './island70sData';

export interface IslandStar {
  nx: number;
  ny: number;
  size: number;
  twinkle: number;
  parallax: number;
}

export interface IslandAmbientBit {
  x: number;
  y: number;
  vy: number;
  phase: number;
  color: string;
}

export interface IslandDigitalCritter {
  homeX: number;
  homeY: number;
  phase: number;
  color: string;
}

export interface IslandPickupBurst {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export interface IslandPromptRenderSpec {
  x: number;
  y: number;
  actionLabel: string;
  accentHex: string;
}

/** Celda base de mundo 32×32 px con detalle artesanal de píxel nítido */
const CELL = 32;
const PX = 2;

interface HandcraftedTreeSpec {
  x: number;
  y: number;
  variant: 'forest' | 'meadow' | 'pine';
}

const ISLAND_TREES: HandcraftedTreeSpec[] = [
  // La Aldea de los Orígenes — arboleda variada y línea que disimula el callejón secreto norte
  { x: 260, y: 1740, variant: 'meadow' },
  { x: 304, y: 1968, variant: 'pine' },
  { x: 520, y: 1612, variant: 'meadow' },
  { x: 734, y: 1612, variant: 'meadow' },
  { x: 516, y: 1554, variant: 'forest' },
  { x: 742, y: 1554, variant: 'forest' },
  { x: 856, y: 1765, variant: 'pine' },
  { x: 1028, y: 1812, variant: 'meadow' },
  { x: 368, y: 1620, variant: 'meadow' },
  { x: 440, y: 1604, variant: 'pine' },
  { x: 880, y: 1640, variant: 'meadow' },
  { x: 1060, y: 1930, variant: 'pine' },
  { x: 230, y: 1880, variant: 'meadow' },

  // El Bosque de las Señales Perdidas — dosel frondoso con paso secreto entre x=608 y x=692
  { x: 576, y: 1004, variant: 'forest' },
  { x: 608, y: 1004, variant: 'pine' },
  // Hueco secreto entre x=608 y x=692 hacia el Claro Oculto (MANTENIDO DESPEJADO)
  { x: 692, y: 1004, variant: 'pine' },
  { x: 728, y: 1004, variant: 'forest' },
  { x: 556, y: 928, variant: 'forest' },
  { x: 556, y: 868, variant: 'pine' },
  { x: 756, y: 882, variant: 'forest' },
  { x: 640, y: 1120, variant: 'forest' },
  { x: 760, y: 1156, variant: 'pine' },
  { x: 896, y: 1084, variant: 'forest' },
  { x: 1140, y: 1068, variant: 'pine' },
  { x: 1280, y: 1052, variant: 'forest' },
  { x: 620, y: 1360, variant: 'pine' },
  { x: 1036, y: 1412, variant: 'forest' },
  { x: 1188, y: 1336, variant: 'pine' },
  { x: 816, y: 1468, variant: 'forest' },
  // Arboleda densa perimetral de GBA para el Bosque de las Señales
  { x: 500, y: 1080, variant: 'forest' },
  { x: 504, y: 1240, variant: 'pine' },
  { x: 520, y: 1420, variant: 'forest' },
  { x: 704, y: 1260, variant: 'forest' },
  { x: 830, y: 1220, variant: 'pine' },
  { x: 960, y: 1180, variant: 'forest' },
  { x: 1080, y: 1280, variant: 'pine' },
  { x: 1240, y: 1200, variant: 'forest' },
  { x: 1340, y: 1100, variant: 'pine' },
  { x: 1310, y: 1360, variant: 'forest' },
  { x: 920, y: 1490, variant: 'pine' },
  { x: 1090, y: 1510, variant: 'forest' },

  // Las Ruinas del Primer Pulso
  { x: 1548, y: 1124, variant: 'pine' },
  { x: 2248, y: 1236, variant: 'meadow' },
  { x: 1556, y: 1540, variant: 'meadow' },
  { x: 1720, y: 1140, variant: 'pine' },
  { x: 2180, y: 1380, variant: 'meadow' },
  { x: 2320, y: 1280, variant: 'pine' },

  // Terrazas y Claro de Pong
  { x: 2452, y: 1476, variant: 'meadow' },
  { x: 2496, y: 1316, variant: 'pine' },
  { x: 2880, y: 1320, variant: 'meadow' },
  { x: 3052, y: 1492, variant: 'pine' },
  { x: 2468, y: 1856, variant: 'meadow' },
  { x: 2948, y: 1884, variant: 'pine' },
  { x: 2780, y: 1440, variant: 'meadow' },
  { x: 2820, y: 1750, variant: 'pine' },
  { x: 2580, y: 1820, variant: 'meadow' },
  { x: 3120, y: 1380, variant: 'pine' },
];

/** Farolas de fósforo ámbar y antenas eólicas de señal que dan identidad retrofuturista propia */
const PHOSPHOR_LAMPS: { x: number; y: number; color: string }[] = [
  { x: 468, y: 1796, color: '#fbbf24' },
  { x: 748, y: 1796, color: '#fbbf24' },
  { x: 888, y: 1852, color: '#00f3ff' },
  { x: 1624, y: 1268, color: '#fbbf24' },
  { x: 2042, y: 1218, color: '#00f3ff' },
  { x: 2668, y: 1564, color: '#fbbf24' },
  { x: 3212, y: 1244, color: '#38bdf8' },
];

const SIGNAL_WINDMILLS: { x: number; y: number }[] = [
  { x: 842, y: 1712 },
  { x: 1084, y: 1168 },
  { x: 2236, y: 1098 },
];

interface LavaPoolRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const MOONSTONE_PATH_RECT = { x: 1360, y: 580, w: 200, h: 180 };

/** Fosos y canales magmáticos del Bastión de las Oleadas (fuera del paso caminable) */
const VOLCANIC_LAVA_POOLS: LavaPoolRect[] = [
  // Gran foso de lava horizontal (Bajo el puente colgante recto)
  { x: 2060, y: 600, w: 344, h: 140 },
  
  // Foso bajo el camino de piedras lunares
  { x: 1360, y: 580, w: 200, h: 180 },
  
  // Fosos decorativos adicionales
  { x: 2432, y: 960, w: 480, h: 64 },
  { x: 3216, y: 480, w: 96, h: 384 },
  { x: 2880, y: 352, w: 288, h: 64 },
  { x: 1424, y: 576, w: 20, h: 256 }, // Reducido para no solapar con el camino principal
];

export function isWorldBoxVisible(
  wx: number,
  wy: number,
  ww: number,
  wh: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  pad = 160
): boolean {
  return (
    wx + ww >= camX - pad &&
    wx <= camX + vw + pad &&
    wy + bhPad(wh) >= camY - pad &&
    wy <= camY + vh + pad
  );
}

function bhPad(wh: number): number {
  return wh;
}

function hashTile(tx: number, ty: number): number {
  const n = Math.imul(tx * 374761393 + ty * 668265263, 1274126177);
  return (n ^ (n >>> 13)) >>> 0;
}

/**
 * ÁRBOLES ARTESANALES DE CALIDAD GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO / VERDE HOJA)
 * - Perspectiva cenital ligeramente oblicua con copa esférica en múltiples lóbulos.
 * - 6 niveles tonales de sombreado escalonado (crevice, shadow, mid, sunlit, high, specular).
 * - Grupos de píxeles que representan racimos de hojas individuales, sin cajas planas.
 * - Tronco leñoso con aristas de corteza, nudos y raíces extendidas sobre el césped.
 * - Sombra de contacto suave y elíptica en el suelo orientada hacia el sur-este.
 */
export function drawHandcraftedTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  variant: 'forest' | 'meadow' | 'pine',
  elapsed = 0,
  reducedMotion = false
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  // Vaivén de copa de 1 px: da vida al dosel sin romper la lectura pixel-art.
  const canopySway = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.15 + cx * 0.045) * 1.25);

  ctx.save();
  ctx.translate(x, y);

  // 1. Sombra elíptica escalonada en el suelo con desvanecimiento de borde
  ctx.fillStyle = 'rgba(5, 14, 10, 0.16)';
  ctx.fillRect(-25, 3, 47, 10);
  ctx.fillStyle = 'rgba(5, 14, 10, 0.30)';
  ctx.fillRect(-20, 5, 38, 8);
  ctx.fillStyle = 'rgba(5, 14, 10, 0.42)';
  ctx.fillRect(-15, 7, 28, 5);

  if (variant === 'pine') {
    // ----------------------------------------------------
    // PINO DE AGUJA ALPINO GBA: 4 niveles cónicos escalonados con franjas dentadas
    // ----------------------------------------------------
    const pOutline = '#051e1b';
    const pShadow = '#0a3a33';
    const pMid = '#13675a';
    const pSun = '#289d89';
    const pHigh = '#5eead4';
    const pGlint = '#ccfbf1';

    // Tronco de pino nudoso
    ctx.fillStyle = '#100703';
    ctx.fillRect(-6, -10, 12, 14);
    ctx.fillStyle = '#452613';
    ctx.fillRect(-4, -9, 8, 12);
    ctx.fillStyle = '#784320';
    ctx.fillRect(-2, -9, 3, 11);
    ctx.fillStyle = '#261208';
    ctx.fillRect(1, -8, 2, 10);
    // Raíces
    ctx.fillStyle = '#100703';
    ctx.fillRect(-8, 1, 3, 3);
    ctx.fillRect(5, 1, 3, 3);

    // La copa entera mece sobre el tronco fijo.
    ctx.save();
    ctx.translate(canopySway, 0);

    // Tier 1: Faldón inferior de agujas (y = -26 a -10)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-27, -26, 54, 18);
    ctx.fillRect(-25, -8, 12, 4);
    ctx.fillRect(-6, -8, 12, 4);
    ctx.fillRect(13, -8, 12, 4);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-25, -24, 50, 15);
    ctx.fillRect(-23, -6, 8, 2);
    ctx.fillRect(-4, -6, 8, 2);
    ctx.fillRect(15, -6, 8, 2);

    ctx.fillStyle = pMid;
    ctx.fillRect(-23, -25, 46, 12);
    ctx.fillStyle = pSun;
    ctx.fillRect(-21, -25, 20, 6);
    ctx.fillRect(-17, -19, 14, 4);
    ctx.fillRect(3, -24, 14, 5);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-19, -25, 10, 2);
    ctx.fillRect(-15, -19, 6, 2);
    ctx.fillRect(5, -24, 6, 2);

    // Tier 2: Faldón intermedio (y = -40 a -23)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-22, -40, 44, 17);
    ctx.fillRect(-20, -23, 10, 3);
    ctx.fillRect(-5, -23, 10, 3);
    ctx.fillRect(10, -23, 10, 3);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-20, -38, 40, 15);
    ctx.fillRect(-18, -21, 6, 2);
    ctx.fillRect(-3, -21, 6, 2);
    ctx.fillRect(12, -21, 6, 2);

    ctx.fillStyle = pMid;
    ctx.fillRect(-18, -39, 36, 11);
    ctx.fillStyle = pSun;
    ctx.fillRect(-17, -39, 16, 6);
    ctx.fillRect(-13, -33, 10, 4);
    ctx.fillRect(2, -38, 12, 4);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-15, -39, 8, 2);
    ctx.fillRect(-11, -33, 5, 2);
    ctx.fillRect(4, -38, 6, 2);

    // Tier 3: Faldón superior (y = -52 a -37)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-16, -52, 32, 15);
    ctx.fillRect(-14, -37, 8, 3);
    ctx.fillRect(6, -37, 8, 3);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-14, -50, 28, 13);
    ctx.fillStyle = pMid;
    ctx.fillRect(-12, -51, 24, 10);
    ctx.fillStyle = pSun;
    ctx.fillRect(-11, -51, 12, 5);
    ctx.fillRect(1, -50, 8, 4);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-9, -51, 7, 2);

    // Tier 4: Ápice / Espira cónica superior (y = -65 a -49)
    ctx.fillStyle = pOutline;
    ctx.fillRect(-9, -65, 18, 16);
    ctx.fillRect(-4, -68, 8, 4);
    ctx.fillRect(-1, -71, 2, 4);

    ctx.fillStyle = pShadow;
    ctx.fillRect(-7, -63, 14, 13);
    ctx.fillStyle = pMid;
    ctx.fillRect(-6, -64, 12, 10);
    ctx.fillStyle = pSun;
    ctx.fillRect(-5, -64, 7, 6);
    ctx.fillStyle = pHigh;
    ctx.fillRect(-4, -66, 4, 3);
    ctx.fillStyle = pGlint;
    ctx.fillRect(-2, -67, 2, 2);

    // Agujas sueltas en los bordes de cada faldón: rompen la silueta
    // escalonada y aportan la aspereza propia de un pino.
    const needleSites: [number, number, number][] = [
      [-27, -18, 0], [-23, -24, 1], [-19, -38, 0], [-13, -52, 1],
      [-8, -63, 0], [9, -61, 1], [15, -49, 0], [21, -36, 1],
      [26, -25, 0], [22, -15, 1], [-25, -12, 1], [18, -11, 0],
    ];
    for (let i = 0; i < needleSites.length; i++) {
      const [nx, ny, side] = needleSites[i];
      ctx.fillStyle = i % 3 === 0 ? pSun : pMid;
      ctx.fillRect(nx, ny, side ? 3 : 2, 2);
      ctx.fillStyle = pShadow;
      ctx.fillRect(nx + 1, ny + 2, 2, 1);
      if (i % 4 === 0) {
        ctx.fillStyle = pHigh;
        ctx.fillRect(nx + (side ? 1 : 0), ny, 1, 1);
      }
    }

    // Luz de borde del oeste sobre las capas superiores.
    ctx.fillStyle = pHigh;
    ctx.fillRect(-27, -22, 3, 1);
    ctx.fillRect(-21, -37, 3, 1);
    ctx.fillRect(-15, -50, 3, 1);
    ctx.fillRect(-10, -62, 2, 1);
    ctx.fillStyle = pGlint;
    ctx.fillRect(-24, -23, 1, 1);
    ctx.fillRect(-18, -38, 1, 1);

    // Vetas de corteza y resina en el tronco.
    ctx.fillStyle = 'rgba(224, 168, 108, 0.28)';
    ctx.fillRect(-5, -8, 1, 6);
    ctx.fillRect(-1, -7, 1, 4);
    ctx.fillStyle = 'rgba(20, 10, 4, 0.4)';
    ctx.fillRect(3, -9, 1, 7);

    // Piñas maduras y escamas de resina
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-12, -18, 3, 4);
    ctx.fillRect(11, -17, 3, 4);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-11, -17, 1, 2);
    ctx.fillRect(12, -16, 1, 2);

    ctx.restore();
  } else {
    // ----------------------------------------------------
    // ROBLE DE BOSQUE / ÁRBOL DE PRADERA GBA:
    // Copa esférica con 5 lóbulos de follaje volumétrico,
    // reflejos superiores, sombras cavernosas e iluminación lateral
    // ----------------------------------------------------
    const isForest = variant === 'forest';

    // Paletas GBA ricas de 6 tonos escalonados
    const cOutline = isForest ? '#081a10' : '#102206';
    const cShadow = isForest ? '#113a21' : '#1f480d';
    const cMid = isForest ? '#1d6b38' : '#3f7c19';
    const cSun = isForest ? '#3aa250' : '#6cb528';
    const cHigh = isForest ? '#86e470' : '#bcf65c';
    const cGlint = isForest ? '#d4fec0' : '#fcfdbe';
    const cSpore = isForest ? '#5eead4' : '#fef08a';

    // Tronco robusto de roble con vetas de corteza mejoradas (estilo detallado)
    ctx.fillStyle = '#100703';
    ctx.fillRect(-8, -16, 16, 20);
    ctx.fillRect(-13, 0, 6, 4);
    ctx.fillRect(7, 0, 6, 4);

    ctx.fillStyle = '#452310';
    ctx.fillRect(-6, -15, 12, 18);
    ctx.fillRect(-11, 1, 4, 3);
    ctx.fillRect(7, 1, 4, 3);

    ctx.fillStyle = '#733e1c';
    ctx.fillRect(-5, -15, 5, 17);
    ctx.fillRect(-10, 1, 3, 2);
    ctx.fillStyle = '#9e5a2c';
    ctx.fillRect(-4, -15, 2, 15);
    // Veta adicional
    ctx.fillStyle = '#d48a58';
    ctx.fillRect(-2, -14, 1, 12);
    ctx.fillStyle = '#c47d44';
    ctx.fillRect(-4, -12, 1, 6);

    ctx.fillStyle = '#261208';
    ctx.fillRect(1, -14, 3, 16);
    // Nudo en el tronco con más detalle
    ctx.fillStyle = '#1a0c04';
    ctx.fillRect(-1, -7, 3, 3);
    ctx.fillStyle = '#9e5a2c';
    ctx.fillRect(0, -7, 1, 1);

    // La corona de hojas se mece levemente sobre el tronco.
    ctx.save();
    ctx.translate(canopySway, 0);

    // Helper interno para dibujar un lóbulo de follaje redondeado en estilo pixel art GBA
    const drawFoliageLobe = (
      lx: number,
      ly: number,
      rw: number,
      rh: number,
      highlightLobe = false
    ) => {
      // Contorno exterior redondeado (esquinas achaflanadas)
      ctx.fillStyle = cOutline;
      ctx.fillRect(lx - rw + 3, ly - rh, rw * 2 - 6, rh * 2);
      ctx.fillRect(lx - rw, ly - rh + 3, rw * 2, rh * 2 - 6);
      ctx.fillRect(lx - rw + 1, ly - rh + 1, rw * 2 - 2, rh * 2 - 2);

      // Sombra inferior profunda
      ctx.fillStyle = cShadow;
      ctx.fillRect(lx - rw + 4, ly - rh + 2, rw * 2 - 8, rh * 2 - 4);
      ctx.fillRect(lx - rw + 2, ly - rh + 4, rw * 2 - 4, rh * 2 - 8);

      // Cuerpo medio de follaje
      ctx.fillStyle = cMid;
      ctx.fillRect(lx - rw + 4, ly - rh + 2, rw * 2 - 8, Math.floor(rh * 1.5));
      ctx.fillRect(lx - rw + 2, ly - rh + 4, rw * 2 - 4, Math.floor(rh * 1.3));

      // Cara superior iluminada por el sol
      ctx.fillStyle = cSun;
      const sunH = Math.floor(rh * 0.95);
      const sunW = Math.floor(rw * 1.5);
      ctx.fillRect(lx - rw + 4, ly - rh + 2, sunW, sunH);
      ctx.fillRect(lx - rw + 2, ly - rh + 4, Math.floor(rw * 1.7), Math.floor(rh * 0.75));

      // Racimos de hojas brillantes
      ctx.fillStyle = cHigh;
      ctx.fillRect(lx - rw + 6, ly - rh + 3, Math.floor(rw * 0.9), Math.floor(rh * 0.45));
      ctx.fillRect(lx - rw + 4, ly - rh + 5, Math.floor(rw * 1.1), Math.floor(rh * 0.3));

      // Manchas de textura orgánica (hojas individuales agrupadas)
      ctx.fillStyle = cSun;
      ctx.fillRect(lx + 2, ly - 2, 4, 3);
      ctx.fillRect(lx - 4, ly + 2, 5, 2);
      ctx.fillStyle = cShadow;
      ctx.fillRect(lx + Math.floor(rw * 0.4), ly + Math.floor(rh * 0.2), 4, 3);

      if (highlightLobe) {
        ctx.fillStyle = cGlint;
        ctx.fillRect(lx - rw + 8, ly - rh + 3, 5, 2);
        ctx.fillRect(lx - rw + 5, ly - rh + 6, 3, 2);
      }
    };

    // 1. Lóbulo inferior izquierdo
    drawFoliageLobe(-17, -26, 15, 13);
    // 2. Lóbulo inferior derecho
    drawFoliageLobe(17, -25, 15, 13);
    // 3. Lóbulo lateral izquierdo (ensancha la copa sin romper la silueta)
    drawFoliageLobe(-22, -33, 10, 9);
    // 4. Lóbulo lateral derecho
    drawFoliageLobe(22, -32, 10, 9);
    // 5. Lóbulo medio izquierdo
    drawFoliageLobe(-13, -41, 16, 14, true);
    // 6. Lóbulo medio derecho
    drawFoliageLobe(13, -40, 15, 13);
    // 7. Cúpula superior de la corona
    drawFoliageLobe(0, -53, 17, 15, true);

    // Hojas que muerden el contorno: el dosel pierde el borde de bloque y se
    // lee como follaje denso, con mechones que sobresalen de la copa.
    for (let i = 0; i < 34; i++) {
      const th = (hashTile(i * 17 + Math.round(cx), Math.round(cy) - i * 3) % 1000) / 1000;
      const ang = (i / 34) * Math.PI * 2 + th * 0.5;
      const radiusX = 27 + th * 5;
      const radiusY = 27 + th * 3;
      const ex = Math.round(Math.cos(ang) * radiusX);
      const ey = Math.round(-40 + Math.sin(ang) * radiusY);
      if (ey > -8) continue;
      const lit = Math.cos(ang) < -0.15 && Math.sin(ang) < 0.45;
      ctx.fillStyle = i % 4 === 0 ? cSun : cMid;
      ctx.fillRect(ex, ey, 3, 2);
      if (lit) {
        ctx.fillStyle = cHigh;
        ctx.fillRect(ex, ey, 2, 1);
        if (i % 5 === 0) {
          ctx.fillStyle = cGlint;
          ctx.fillRect(ex, ey, 1, 1);
        }
      } else if (i % 3 === 0) {
        ctx.fillStyle = cShadow;
        ctx.fillRect(ex + 1, ey + 1, 2, 1);
      }
    }

    // Claros y costuras internas: separan los lóbulos y hunden el centro.
    ctx.fillStyle = cShadow;
    ctx.fillRect(-4, -33, 7, 2);
    ctx.fillRect(5, -27, 5, 2);
    ctx.fillRect(-12, -20, 4, 2);
    ctx.fillRect(10, -47, 4, 2);
    ctx.fillStyle = cOutline;
    ctx.fillRect(-1, -34, 2, 1);
    ctx.fillRect(8, -28, 1, 1);

    // Racimos de hojas iluminadas y reflejo superior desde el oeste.
    ctx.fillStyle = cHigh;
    ctx.fillRect(-22, -44, 4, 2);
    ctx.fillRect(-10, -57, 4, 2);
    ctx.fillRect(4, -60, 3, 2);
    ctx.fillRect(17, -35, 3, 2);
    ctx.fillStyle = cGlint;
    ctx.fillRect(-25, -45, 2, 1);
    ctx.fillRect(-12, -58, 2, 1);
    ctx.fillRect(5, -61, 2, 1);
    ctx.fillRect(-18, -33, 2, 1);

    // Destellos de hojas / esporas bioluminiscentes en el bosque o flores en la pradera
    ctx.fillStyle = cSpore;
    ctx.fillRect(-18, -44, 3, 2);
    ctx.fillRect(-8, -55, 3, 2);
    ctx.fillRect(9, -46, 3, 2);
    ctx.fillRect(19, -28, 2, 2);
    ctx.fillRect(-22, -25, 2, 2);

    ctx.fillStyle = isForest ? '#a7f3d0' : '#ffffff';
    ctx.fillRect(-17, -43, 1, 1);
    ctx.fillRect(-7, -54, 1, 1);
    ctx.fillRect(10, -45, 1, 1);

    ctx.restore();
  }

  ctx.restore();
}

/** Farola retrofuturista de hierro forjado y bulbo de fósforo con estética GBA */
function drawPhosphorStreetlamp(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  glowHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(lx);
  const y = Math.round(ly);
  const pulse = reducedMotion ? 0.25 : 0.2 + Math.sin(elapsed * 3.1 + lx * 0.05) * 0.06;

  ctx.save();
  ctx.translate(x, y);

  // Halo cálido de iluminación sutil sobre el camino
  ctx.fillStyle = glowHex;
  ctx.globalAlpha = pulse * 0.4;
  ctx.beginPath();
  ctx.ellipse(0, -2, 34, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = pulse * 0.8;
  ctx.beginPath();
  ctx.arc(0, -38, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Sombra del poste
  ctx.fillStyle = 'rgba(7, 11, 20, 0.45)';
  ctx.fillRect(-8, 3, 16, 4);

  // Pedestal de hierro fundido con escalonamiento
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-7, -2, 14, 6);
  ctx.fillRect(-5, -6, 10, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-6, -1, 12, 4);
  ctx.fillRect(-4, -5, 8, 3);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-5, -1, 2, 4);

  // Mástil acanalado de hierro forjado
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-3, -38, 6, 32);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-2, -37, 4, 30);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-2, -37, 1, 30);
  // Anillos ornamentales
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-4, -20, 8, 2);
  ctx.fillRect(-4, -34, 8, 2);

  // Soporte curvo y ménsula de la linterna
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-9, -48, 18, 12);
  ctx.fillRect(-6, -52, 12, 5);
  ctx.fillRect(-2, -55, 4, 4);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-8, -46, 16, 8);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-7, -50, 14, 3);
  ctx.fillRect(-1, -54, 2, 3);

  // Cámara de cristal con bulbo incandescente
  ctx.fillStyle = glowHex;
  ctx.fillRect(-6, -45, 12, 7);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2, -44, 4, 4);
  ctx.fillRect(-1, -43, 2, 2);

  ctx.restore();
}

/** Molino-antena acústica que capta frecuencias antiguas de la isla */
function drawSignalWindmill(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  const angle = reducedMotion ? 0.4 : elapsed * 1.35 + wx * 0.01;

  ctx.save();
  ctx.translate(x, y);

  // Sombra elíptica
  ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
  ctx.fillRect(-16, 2, 32, 6);

  // Pizarras y base de sillería
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-10, -50, 20, 54);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-8, -48, 16, 50);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-7, -47, 4, 48);

  // Celosía y molduras de latón
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-8, -32, 16, 3);
  ctx.fillRect(-8, -16, 16, 3);
  ctx.fillRect(-10, -50, 20, 4);

  // Caja de engranajes y buje acústico
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-6, -56, 12, 7);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-4, -55, 8, 5);

  // Aspas rotatorias en la cúspide con ángulo continuo
  ctx.save();
  ctx.translate(0, -52);
  ctx.rotate(angle);

  // Contorno negro de aspas
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-22, -3, 44, 6);
  ctx.fillRect(-3, -22, 6, 44);

  // Palas aerodinámicas con relieve
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-20, -2, 40, 4);
  ctx.fillRect(-2, -20, 4, 40);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-20, 0, 40, 2);
  ctx.fillRect(0, -20, 2, 40);

  // Núcleo central de señal con diodo cian
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(-3, -3, 6, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();

  ctx.restore();
}

/** Cartel indicador tallado en madera y latón arqueológico estilo GBA */
export function drawGbcWoodenSign(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  mapLabel?: string,
  large = false,
  kicker = 'SALA ARCADE · 1976'
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  ctx.save();
  ctx.translate(x, y);

  if (large) {
    // Cartel de gran formato: nombre del cruce legible desde la distancia
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(-24, 4, 48, 7);

    // Postes reforzados
    ctx.fillStyle = '#100703';
    ctx.fillRect(-20, -10, 7, 18);
    ctx.fillRect(13, -10, 7, 18);
    ctx.fillStyle = '#5c3115';
    ctx.fillRect(-19, -10, 4, 16);
    ctx.fillRect(14, -10, 4, 16);
    ctx.fillStyle = '#8a5c33';
    ctx.fillRect(-19, -10, 1, 16);
    ctx.fillRect(14, -10, 1, 16);

    // Tablón principal con bisel de latón
    ctx.fillStyle = '#100703';
    ctx.fillRect(-34, -46, 68, 38);
    ctx.fillStyle = '#854d24';
    ctx.fillRect(-32, -44, 64, 34);
    ctx.fillStyle = '#a86b32';
    ctx.fillRect(-32, -44, 64, 3);
    ctx.fillStyle = '#5c3115';
    ctx.fillRect(-32, -13, 64, 3);

    // Pergamino frontal
    ctx.fillStyle = '#d4a365';
    ctx.fillRect(-29, -41, 58, 27);
    ctx.fillStyle = '#f3d9aa';
    ctx.fillRect(-29, -41, 58, 3);
    ctx.fillRect(-29, -41, 3, 27);
    ctx.fillStyle = 'rgba(60, 30, 8, 0.14)';
    ctx.fillRect(-6, -41, 2, 27);

    // Cabecera y nombre del cruce
    ctx.fillStyle = '#5c3115';
    ctx.font = '700 4px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(kicker, 0, -34);
    ctx.fillStyle = '#2b1404';
    const boardLabel = mapLabel ?? '4 CAMINOS';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    if (ctx.measureText(boardLabel).width <= 52) {
      ctx.fillText(boardLabel, 0, -23);
    } else {
      // Nombres largos: se ajustan en dos líneas dentro del pergamino para
      // conservar la legibilidad en lugar de desbordar el tablón.
      ctx.font = '700 7px "JetBrains Mono", monospace';
      const words = boardLabel.split(' ');
      const lines: string[] = [];
      let line = words[0] ?? '';
      for (let wi = 1; wi < words.length; wi++) {
        const test = `${line} ${words[wi]}`;
        if (line && ctx.measureText(test).width > 52) {
          lines.push(line);
          line = words[wi];
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      if (lines.length === 1) {
        ctx.fillText(lines[0], 0, -22);
      } else {
        ctx.fillText(lines[0], 0, -31);
        ctx.fillText(lines[1], 0, -21);
      }
    }
    ctx.fillStyle = '#7a4a1c';
    ctx.fillRect(-24, -20, 48, 1);

    // Líneas talladas de direcciones
    ctx.fillStyle = '#3b1d08';
    ctx.fillRect(-23, -16, 20, 2);
    ctx.fillRect(-23, -11, 14, 2);
    ctx.fillRect(3, -16, 20, 2);
    ctx.fillRect(3, -11, 16, 2);

    // Clavos de latón
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-30, -42, 3, 3);
    ctx.fillRect(27, -42, 3, 3);
    ctx.fillRect(-30, -17, 3, 3);
    ctx.fillRect(27, -17, 3, 3);

    ctx.restore();
    return;
  }

  // Sombra arrojada
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(-14, 3, 28, 5);

  // Dos postes de madera tallada
  ctx.fillStyle = '#100703';
  ctx.fillRect(-10, -8, 5, 14);
  ctx.fillRect(5, -8, 5, 14);
  ctx.fillStyle = '#5c3115';
  ctx.fillRect(-9, -8, 3, 12);
  ctx.fillRect(6, -8, 3, 12);

  // Tablón de anuncios con bisel y veta
  ctx.fillStyle = '#100703';
  ctx.fillRect(-17, -29, 34, 23);
  ctx.fillStyle = '#854d24';
  ctx.fillRect(-15, -27, 30, 19);

  // Cara frontal de pergamino / madera clara
  ctx.fillStyle = '#d4a365';
  ctx.fillRect(-13, -25, 26, 15);
  ctx.fillStyle = '#f3d9aa';
  ctx.fillRect(-13, -25, 26, 3);
  ctx.fillRect(-13, -25, 3, 15);

  // Líneas de texto simulado en pixel art
  ctx.fillStyle = '#3b1d08';
  ctx.fillRect(-9, -19, 18, 2);
  ctx.fillRect(-9, -14, 14, 2);
  ctx.fillRect(-9, -9, 8, 2);

  // Clavos de latón en las esquinas
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-14, -26, 2, 2);
  ctx.fillRect(12, -26, 2, 2);

  ctx.restore();
}

/** Terminal / Punto de Guardado estilo Game Boy Advance en el Pueblo del Origen */
function drawGbcSaveTerminal(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  elapsed: number,
  hasSaved: boolean
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const blink = Math.floor(elapsed * 3) % 2 === 0;

  ctx.save();
  ctx.translate(x, y);

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-18, 5, 36, 6);

  // Chasis industrial color marfil y bronce con contorno nítido
  ctx.fillStyle = '#080e18';
  ctx.fillRect(-15, -34, 30, 40);
  ctx.fillStyle = '#e8ecf0';
  ctx.fillRect(-13, -32, 26, 36);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-13, -8, 26, 12);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-13, -32, 26, 3);
  ctx.fillRect(-13, -32, 3, 36);

  // Rejillas de ventilación superiores
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-10, -30, 20, 1);
  ctx.fillRect(-10, -28, 20, 1);

  // Pantalla CRT curva
  ctx.fillStyle = '#080e18';
  ctx.fillRect(-11, -25, 22, 16);
  ctx.fillStyle = hasSaved ? '#14532d' : '#0c4a6e';
  ctx.fillRect(-9, -23, 18, 12);

  // Osciloscopio / onda de memoria pulsante en pantalla
  const waveCol = hasSaved ? (blink ? '#86efac' : '#22c55e') : (blink ? '#7dd3fc' : '#0284c7');
  ctx.fillStyle = waveCol;
  ctx.fillRect(-7, -18, 3, 2);
  ctx.fillRect(-4, -20, 3, 2);
  ctx.fillRect(-1, -16, 3, 3);
  ctx.fillRect(2, -19, 3, 2);
  ctx.fillRect(5, -17, 2, 2);

  // Ranura de cartucho / casete y diodo de actividad
  ctx.fillStyle = '#080e18';
  ctx.fillRect(-8, -5, 16, 2);
  ctx.fillStyle = blink ? '#fbbf24' : '#ef4444';
  ctx.fillRect(9, -7, 2, 2);

  // Rótulo dorado SAVE
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-9, 0, 18, 3);
  ctx.fillStyle = '#080e18';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SAVE', 0, 2);

  ctx.restore();
}

/** Entrada a túnel subterráneo disimulada entre rocas costeras/cavernosas con volumen GBA */
function drawGbcRockTunnelEntrance(ctx: CanvasRenderingContext2D, tx: number, ty: number): void {
  const x = Math.round(tx);
  const y = Math.round(ty);
  ctx.save();
  ctx.translate(x, y);

  // Sombra de contacto en el suelo
  ctx.fillStyle = 'rgba(5, 8, 14, 0.46)';
  ctx.fillRect(-24, 4, 48, 8);

  // Formación rocosa exterior: contorno oscuro
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-22, -32, 44, 36);
  ctx.fillRect(-16, -38, 32, 8);
  ctx.fillRect(-26, -16, 6, 20);
  ctx.fillRect(20, -16, 6, 20);

  // Rocas basálticas / areniscas exteriores con caras de luz y sombra
  ctx.fillStyle = '#524335';
  ctx.fillRect(-20, -30, 40, 32);
  ctx.fillRect(-14, -36, 28, 8);
  ctx.fillRect(-24, -14, 6, 16);
  ctx.fillRect(18, -14, 6, 16);

  // Facetas iluminadas en la parte superior e izquierda
  ctx.fillStyle = '#8a735c';
  ctx.fillRect(-14, -36, 26, 4);
  ctx.fillRect(-20, -28, 5, 20);
  ctx.fillRect(-24, -14, 3, 14);
  ctx.fillStyle = '#bfa58a';
  ctx.fillRect(-12, -35, 12, 2);
  ctx.fillRect(-19, -26, 2, 10);

  // Facetas en sombra profunda a la derecha
  ctx.fillStyle = '#30251c';
  ctx.fillRect(14, -30, 6, 30);
  ctx.fillRect(18, -12, 4, 14);

  // Parche de musgo clinging en la cornisa superior
  ctx.fillStyle = '#2d6d34';
  ctx.fillRect(-10, -38, 18, 3);
  ctx.fillRect(1, -35, 8, 2);
  ctx.fillStyle = '#65ad4d';
  ctx.fillRect(-8, -38, 10, 1);

  // Boca oscura de la caverna con arco escalonado
  ctx.fillStyle = '#03060a';
  ctx.fillRect(-13, -22, 26, 24);
  ctx.fillRect(-9, -26, 18, 5);

  // Peldaños de piedra descendentes iluminados tenuemente
  ctx.fillStyle = '#241b16';
  ctx.fillRect(-11, -8, 22, 4);
  ctx.fillRect(-10, -2, 20, 4);
  ctx.fillStyle = '#423226';
  ctx.fillRect(-10, -8, 20, 1);
  ctx.fillRect(-9, -2, 18, 1);

  ctx.restore();
}

/** Escotilla subterránea cifrada hacia el Laberinto de Señales de 1976 */
function drawLabyrinth1976Hatch(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  unlockedBreakout: boolean,
  elapsed: number
): void {
  const x = Math.round(hx);
  const y = Math.round(hy);
  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada
  ctx.fillStyle = 'rgba(5, 8, 18, 0.52)';
  ctx.fillRect(-28, -12, 56, 32);

  // Zócalo octogonal de bronce y acero TTL
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-25, -16, 50, 34);
  ctx.fillRect(-22, -18, 44, 38);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-23, -14, 46, 30);
  ctx.fillRect(-20, -16, 40, 34);

  // Borde biselado de bronce industrial
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-21, -13, 42, 3);
  ctx.fillRect(-21, -13, 3, 26);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-21, 13, 42, 3);
  ctx.fillRect(18, -13, 3, 28);

  // Remaches metálicos en las esquinas
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-19, -12, 2, 2);
  ctx.fillRect(17, -12, 2, 2);
  ctx.fillRect(-19, 12, 2, 2);
  ctx.fillRect(17, 12, 2, 2);

  // Boca de descenso con escalerilla metálica iluminada
  ctx.fillStyle = '#03050c';
  ctx.fillRect(-15, -6, 30, 20);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-13, -5, 2, 18);
  ctx.fillRect(11, -5, 2, 18);
  ctx.fillStyle = '#cbd5e1';
  for (let sy = -3; sy <= 10; sy += 5) {
    ctx.fillRect(-11, sy, 22, 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-10, sy, 20, 1);
    ctx.fillStyle = '#cbd5e1';
  }

  // 4 testigos cromáticos de 1976 (amarillo, verde, naranja, rojo)
  const leds = ['#facc15', '#22c55e', '#f97316', '#ef4444'];
  leds.forEach((col, i) => {
    const active = unlockedBreakout || Math.floor(elapsed * 3 + i) % 4 === 0;
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-17 + i * 9, -12, 8, 5);
    ctx.fillStyle = active ? col : '#334155';
    ctx.fillRect(-16 + i * 9, -11, 6, 3);
    if (active) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-15 + i * 9, -11, 2, 1);
    }
  });

  ctx.restore();
}

/** Criaturas guardianas originales de PIXELVERSE (Lumen-Bit, Sincro-76, Vectra-79) con pixel art GBA */
export function drawGuardianCreatureSprite(
  ctx: CanvasRenderingContext2D,
  creature: GuardianCreatureSpec,
  calmed: boolean,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(creature.x);
  const y = Math.round(creature.y);
  const floatY = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 3.4 + x * 0.05) * 4);
  const wingBeat = reducedMotion ? 0 : Math.sin(elapsed * 9) > 0 ? 3 : -2;

  ctx.save();
  ctx.translate(x, y + floatY);

  // Sombra de oclusión en el suelo
  ctx.fillStyle = 'rgba(4, 8, 18, 0.45)';
  ctx.fillRect(-14, 6 - floatY, 28, 5);
  ctx.fillRect(-8, 9 - floatY, 16, 2);

  // Halo cromático HD-2D RGB
  ctx.globalAlpha = calmed ? 0.35 : 0.22;
  ctx.fillStyle = calmed ? creature.secondaryHex : creature.accentHex;
  ctx.beginPath();
  ctx.arc(0, -14, calmed ? 26 : 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (creature.id === 'creature-sincro-laberinto') {
    // Sincro-76: Centinela geométrico de anillos TTL
    if (!calmed) {
      // Barrera energética activa en el corredor
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-24, -40, 48, 52);
    }
    // Núcleo central
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-15, -28, 30, 26);
    ctx.fillStyle = calmed ? '#0891b2' : '#c2410c';
    ctx.fillRect(-13, -26, 26, 22);
    ctx.fillStyle = calmed ? '#22d3ee' : '#f97316';
    ctx.fillRect(-11, -24, 22, 18);
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-7, -20, 14, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -17, 6, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-1, -16, 3, 3);
  } else if (creature.id === 'creature-vectra-caverna') {
    // Vectra-79: Prisma vectorial XY flotante
    ctx.strokeStyle = calmed ? '#22d3ee' : '#a78bfa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(16 + wingBeat, -14);
    ctx.lineTo(0, 4);
    ctx.lineTo(-16 - wingBeat, -14);
    ctx.closePath();
    ctx.stroke();

    // Aristas interiores
    ctx.strokeStyle = calmed ? '#67e8f9' : '#c084fc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -32);
    ctx.lineTo(0, 4);
    ctx.moveTo(-16 - wingBeat, -14);
    ctx.lineTo(16 + wingBeat, -14);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -18, 8, 8);
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-2, -16, 4, 4);
  } else {
    // Lumen-Bit: Polilla luminiscente de fósforo esmeralda/ámbar
    // Antenas emplumadas
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-6, -34 + wingBeat, 2, 6);
    ctx.fillRect(4, -34 + wingBeat, 2, 6);
    ctx.fillStyle = calmed ? '#fef08a' : '#67e8f9';
    ctx.fillRect(-7, -35 + wingBeat, 4, 2);
    ctx.fillRect(3, -35 + wingBeat, 4, 2);

    // Alas cristalinas con batido
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-18, -24 + wingBeat, 14, 14);
    ctx.fillRect(4, -24 + wingBeat, 14, 14);
    ctx.fillStyle = calmed ? '#facc15' : '#10b981';
    ctx.fillRect(-16, -22 + wingBeat, 11, 10);
    ctx.fillRect(5, -22 + wingBeat, 11, 10);
    ctx.fillStyle = calmed ? '#fef08a' : '#6ee7b7';
    ctx.fillRect(-14, -20 + wingBeat, 6, 6);
    ctx.fillRect(7, -20 + wingBeat, 6, 6);

    // Cuerpo esponjoso central
    ctx.fillStyle = '#060a12';
    ctx.fillRect(-6, -24, 12, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-4, -22, 8, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -19, 2, 3);
    ctx.fillRect(1, -19, 2, 3);
  }

  ctx.restore();
}

/**
 * PROTAGONISTA PIXEL CON CALIDAD VISUAL GBA RPG (BRENDAN / MAY / RED / LEAF)
 * - Proporciones estilizadas de 16×22 píxeles lógicos con silueta nítida.
 * - Cabello con volumen y brillo cenital, rostro expresivo con ojos vivos.
 * - Chaqueta con cuello, camiseta interior, cinturón con hebilla dorada.
 * - Botas de explorador con suela y puntera en relieve.
 * - Ciclo de 4 fases de animación de marcha con balanceo de brazos y zancada natural.
 */
function drawAvatarOutfit(ctx: CanvasRenderingContext2D, id: string): void {
  const accents: Record<string, string> = {
    rocker: '#f05b50', mage: '#bf91ff', indie: '#d7a77b', hippie: '#f2bd4b', punk: '#f34b75',
    ninja: '#a68bff', knight: '#c2d0da', explorer: '#91b978', pirate: '#da5149', scientist: '#f0eee3',
    athlete: '#57d2e1', cowboy: '#cf843a', cyberpunk: '#ff4bd8', artist: '#f0a638', detective: '#a9b5c9',
    space: '#66d9ed', tribal: '#da8a50', vintage: '#e1cb91', inventor: '#ce9157',
  };
  const a = accents[id] ?? '#f5d675';
  ctx.save();
  switch (id) {
    case 'rocker': ctx.fillStyle = '#20232d'; ctx.fillRect(-9,-18,18,11); ctx.fillStyle=a; ctx.fillRect(-2,-16,2,2);ctx.fillRect(0,-14,2,2);ctx.fillRect(-2,-12,2,2);for(let x=-7;x<=7;x+=7)ctx.fillRect(x,-17,2,1);break;
    case 'mage': ctx.fillStyle=a;ctx.fillRect(-10,-9,20,7);ctx.fillRect(-5,-14,10,2);ctx.fillRect(-1,-17,2,9);ctx.fillStyle='#111827';ctx.fillRect(-10,-38,20,3);ctx.fillRect(-6,-44,12,7);ctx.fillRect(-3,-48,6,5);break;
    case 'indie': ctx.fillStyle='#e7d5bd';ctx.fillRect(-7,-17,14,10);ctx.fillStyle=a;ctx.fillRect(-7,-17,3,9);ctx.fillRect(4,-17,3,9);ctx.fillRect(-2,-15,4,2);break;
    case 'hippie': ctx.fillStyle=a;ctx.fillRect(-8,-16,16,2);ctx.fillRect(-9,-10,18,2);ctx.fillStyle='#ed7464';ctx.fillRect(-6,-13,3,2);ctx.fillStyle='#6fbd76';ctx.fillRect(3,-15,3,2);break;
    case 'punk': ctx.fillStyle='#171b27';ctx.fillRect(-10,-19,20,10);ctx.fillStyle=a;ctx.fillRect(-9,-18,4,2);ctx.fillRect(5,-18,4,2);for(let x=-7;x<9;x+=7)ctx.fillRect(x,-15,2,2);ctx.fillStyle='#d7dde4';ctx.fillRect(4,-12,4,1);break;
    case 'ninja': ctx.fillStyle='#161627';ctx.fillRect(-9,-17,18,12);ctx.fillStyle=a;ctx.fillRect(-8,-20,16,2);ctx.fillRect(-8,-10,16,2);ctx.fillStyle='#eee6d2';ctx.fillRect(-5,-23,10,2);break;
    case 'knight': ctx.fillStyle='#526474';ctx.fillRect(-12,-18,7,6);ctx.fillRect(5,-18,7,6);ctx.fillStyle='#ccd6dd';ctx.fillRect(-10,-17,5,4);ctx.fillRect(5,-17,5,4);ctx.fillStyle=a;ctx.fillRect(-2,-15,4,4);break;
    case 'explorer': ctx.fillStyle='#77502f';ctx.fillRect(-7,-17,2,11);ctx.fillRect(5,-17,2,11);ctx.fillStyle=a;ctx.fillRect(-6,-15,12,2);ctx.fillRect(-6,-9,12,2);break;
    case 'pirate': ctx.fillStyle=a;ctx.fillRect(-9,-17,18,3);ctx.fillRect(-2,-14,4,7);ctx.fillStyle='#15151a';ctx.fillRect(-11,-37,22,3);ctx.fillRect(-7,-40,14,4);break;
    case 'scientist': ctx.fillStyle='#f4f1e8';ctx.fillRect(-8,-17,4,11);ctx.fillRect(4,-17,4,11);ctx.fillStyle=a;ctx.fillRect(-1,-17,2,7);ctx.fillStyle='#65b9b5';ctx.fillRect(4,-11,4,3);break;
    case 'athlete': ctx.fillStyle=a;ctx.fillRect(-9,-17,2,10);ctx.fillRect(7,-17,2,10);ctx.fillStyle='#f7f4e6';ctx.fillRect(-6,-17,2,10);ctx.fillRect(4,-17,2,10);break;
    case 'cowboy': ctx.fillStyle='#75401f';ctx.fillRect(-7,-16,14,8);ctx.fillStyle=a;ctx.fillRect(-8,-18,4,10);ctx.fillRect(4,-18,4,10);ctx.fillStyle='#cf4840';ctx.fillRect(-5,-15,10,3);ctx.fillStyle='#111827';ctx.fillRect(-10,-35,20,2);ctx.fillRect(-6,-40,12,6);break;
    case 'cyberpunk': ctx.fillStyle='#16182a';ctx.fillRect(-9,-18,18,12);ctx.fillStyle=a;ctx.fillRect(-8,-17,2,9);ctx.fillRect(6,-17,2,9);ctx.fillRect(-4,-12,8,1);ctx.fillStyle='#64f6ed';ctx.fillRect(-2,-16,4,3);break;
    case 'artist': ctx.fillStyle='#ded4bd';ctx.fillRect(-8,-17,16,12);ctx.fillStyle='#e75152';ctx.fillRect(-6,-15,3,2);ctx.fillStyle='#397fc0';ctx.fillRect(2,-13,3,2);ctx.fillStyle=a;ctx.fillRect(-8,-18,16,2);break;
    case 'detective': ctx.fillStyle='#263247';ctx.fillRect(-10,-18,20,14);ctx.fillStyle='#ddd6c4';ctx.fillRect(-3,-17,6,3);ctx.fillStyle=a;ctx.fillRect(-1,-14,2,7);ctx.fillStyle='#171923';ctx.fillRect(-12,-36,24,3);ctx.fillRect(-8,-39,16,4);break;
    case 'space': ctx.fillStyle='#dfe7e4';ctx.fillRect(-10,-19,20,14);ctx.fillStyle=a;ctx.fillRect(-8,-17,2,10);ctx.fillRect(6,-17,2,10);ctx.fillStyle='#df6652';ctx.fillRect(-8,-12,4,3);ctx.fillStyle='#53687e';ctx.fillRect(-12,-17,3,9);break;
    case 'tribal': ctx.fillStyle='#8e5336';ctx.fillRect(-10,-18,20,5);ctx.fillRect(-8,-13,16,2);ctx.fillStyle=a;for(let x=-8;x<=8;x+=4)ctx.fillRect(x,-21,2,5);break;
    case 'vintage': ctx.fillStyle='#eee6d0';ctx.fillRect(-7,-17,14,10);ctx.fillStyle=a;ctx.fillRect(-5,-16,10,2);ctx.fillRect(-1,-14,2,6);ctx.fillStyle='#f5d675';ctx.fillRect(4,-10,2,2);break;
    case 'inventor': ctx.fillStyle='#975e35';ctx.fillRect(-8,-16,16,10);ctx.fillStyle=a;ctx.fillRect(-6,-15,12,2);ctx.fillStyle='#e7c96a';ctx.fillRect(-3,-11,6,4);break;
  }
  ctx.restore();
}

function drawAvatarTransformation(ctx: CanvasRenderingContext2D, id: string, t: number): void {
  ctx.save();
  switch (id) {
    case 'monster': ctx.fillStyle='#111827';ctx.fillRect(-11,-36,5,8);ctx.fillRect(6,-36,5,8);ctx.fillStyle='#f4d469';ctx.fillRect(-6,-22,3,2);ctx.fillRect(3,-22,3,2);ctx.fillRect(-11,-18,3,4);ctx.fillRect(8,-18,3,4);break;
    case 'frankenstein': ctx.fillStyle='#101827';ctx.fillRect(-11,-36,22,13);ctx.fillStyle='#8fbd75';ctx.fillRect(-8,-34,16,9);ctx.fillStyle='#f1dfbf';ctx.fillRect(-10,-29,20,1);ctx.fillRect(-8,-26,2,1);ctx.fillRect(6,-26,2,1);ctx.fillStyle='#f2d05d';ctx.fillRect(-13,-29,2,4);ctx.fillRect(11,-29,2,4);break;
    case 'mummy': ctx.fillStyle='#c4b28b';ctx.fillRect(-9,-35,18,17);ctx.fillRect(-10,-17,20,13);ctx.fillStyle='#e5d4a8';for(let y=-33;y<-17;y+=4)ctx.fillRect(-9,y,18,2);for(let y=-16;y<-5;y+=4)ctx.fillRect(-10,y,20,2);ctx.fillStyle='#111827';ctx.fillRect(-6,-25,4,2);ctx.fillRect(2,-25,4,2);break;
    case 'vampire': ctx.fillStyle='#f0dde5';ctx.fillRect(-8,-28,16,11);ctx.fillStyle='#c53e5d';ctx.fillRect(-8,-17,4,12);ctx.fillRect(4,-17,4,12);ctx.fillRect(-11,-17,4,5);ctx.fillRect(7,-17,4,5);ctx.fillStyle='#171321';ctx.fillRect(-6,-23,3,3);ctx.fillRect(3,-23,3,3);ctx.fillStyle='#fff2dc';ctx.fillRect(-2,-19,2,3);ctx.fillRect(1,-19,2,3);break;
    case 'werewolf': ctx.fillStyle='#342922';ctx.fillRect(-11,-37,8,11);ctx.fillRect(3,-37,8,11);ctx.fillStyle='#bd916d';ctx.fillRect(-8,-27,16,10);ctx.fillRect(-10,-19,3,3);ctx.fillRect(7,-19,3,3);ctx.fillStyle='#111827';ctx.fillRect(-5,-23,3,2);ctx.fillRect(2,-23,3,2);ctx.fillRect(-2,-19,4,2);ctx.fillStyle='#f4e7d2';ctx.fillRect(-4,-18,2,3);ctx.fillRect(2,-18,2,3);break;
    case 'skeleton': ctx.fillStyle='#f0e9d5';ctx.fillRect(-8,-35,16,17);ctx.fillRect(-10,-16,20,9);ctx.fillStyle='#111521';ctx.fillRect(-6,-27,4,5);ctx.fillRect(2,-27,4,5);ctx.fillRect(-3,-20,6,2);ctx.fillStyle='#f0e9d5';ctx.fillRect(-1,-16,2,9);ctx.fillRect(-8,-14,16,2);for(let x=-7;x<=5;x+=4)ctx.fillRect(x,-12,2,5);break;
    case 'alien': ctx.fillStyle='#75df91';ctx.fillRect(-10,-31,20,14);ctx.fillStyle='#12252b';ctx.fillRect(-6,-27,5,5);ctx.fillRect(1,-27,5,5);ctx.fillStyle='#b9ffca';ctx.fillRect(-5,-26,2,2);ctx.fillRect(2,-26,2,2);ctx.fillStyle='#75df91';ctx.fillRect(-7,-37,2,7);ctx.fillRect(5,-37,2,7);ctx.fillRect(-10,-39,7,2);ctx.fillRect(3,-39,7,2);break;
    case 'ghost': ctx.globalAlpha=.8;ctx.fillStyle='#b9edf0';ctx.fillRect(-10,-32,20,31);ctx.fillRect(-7,-36,14,5);ctx.fillStyle='#293b62';ctx.fillRect(-6,-25,3,4);ctx.fillRect(3,-25,3,4);ctx.fillRect(-2,-17,4,2);ctx.fillStyle='#b9edf0';ctx.fillRect(-10,-2,5,5);ctx.fillRect(-2,-4,5,7);ctx.fillRect(6,-2,4,5);break;
    case 'demon': ctx.fillStyle='#711e35';ctx.fillRect(-11,-37,7,9);ctx.fillRect(4,-37,7,9);ctx.fillStyle='#ed594b';ctx.fillRect(-9,-34,18,15);ctx.fillRect(-9,-18,18,12);ctx.fillStyle='#fff0a3';ctx.fillRect(-6,-26,4,2);ctx.fillRect(2,-26,4,2);ctx.fillStyle='#f5cf53';ctx.fillRect(-3,-20,2,3);ctx.fillRect(1,-20,2,3);break;
    case 'glitch': { const n=Math.floor(t*14)%3-1;ctx.globalAlpha=.8;ctx.fillStyle='#ff4bd8';ctx.fillRect(-13+n,-32,4,5);ctx.fillRect(8-n,-22,5,4);ctx.fillStyle='#47f5ed';ctx.fillRect(9-n,-37,4,6);ctx.fillRect(-13+n,-12,4,5);ctx.fillStyle='#161b34';ctx.fillRect(-7+n,-25,4,3);ctx.fillRect(3-n,-25,4,3);break; }
  }
  ctx.restore();
}

function drawAvatarAccessories(ctx: CanvasRenderingContext2D, accessories: string[], facing: FacingDirection): void {
  const has=(id:string)=>accessories.includes(id);ctx.save();
  if(has('cape')){ctx.fillStyle='#080d16';ctx.fillRect(-12,-17,5,16);ctx.fillRect(7,-17,5,16);ctx.fillStyle='#b83145';ctx.fillRect(-11,-16,3,13);ctx.fillRect(8,-16,3,13);ctx.fillStyle='#f1cc65';ctx.fillRect(-2,-17,4,3);}
  if(has('backpack')){ctx.fillStyle='#080d16';ctx.fillRect(-13,-18,6,12);ctx.fillStyle='#8c5835';ctx.fillRect(-12,-17,4,10);ctx.fillStyle='#edc45d';ctx.fillRect(-11,-14,2,2);}
  if(has('hat')){ctx.fillStyle='#15141a';ctx.fillRect(-14,-37,28,3);ctx.fillRect(-8,-43,16,7);ctx.fillStyle='#ad773a';ctx.fillRect(-9,-39,18,2);}
  if(has('cap')){ctx.fillStyle='#111725';ctx.fillRect(-10,-38,20,5);ctx.fillRect(-8,-41,16,4);ctx.fillStyle='#d77745';ctx.fillRect(-1,-40,5,2);}
  if(has('bandana')){ctx.fillStyle='#bd354b';ctx.fillRect(-10,-35,20,3);ctx.fillRect(7,-33,6,3);ctx.fillRect(10,-30,3,4);}
  if(has('headphones')){ctx.fillStyle='#161c2a';ctx.fillRect(-12,-35,3,12);ctx.fillRect(9,-35,3,12);ctx.fillRect(-9,-39,18,3);ctx.fillStyle='#5bdbe0';ctx.fillRect(-12,-29,4,5);ctx.fillRect(8,-29,4,5);}
  if(facing!=='up'){
    if(has('glasses')){ctx.fillStyle='#111827';ctx.fillRect(-8,-24,7,6);ctx.fillRect(1,-24,7,6);ctx.fillRect(-1,-22,2,2);ctx.fillStyle='#86e6ef';ctx.fillRect(-6,-23,3,2);ctx.fillRect(2,-23,3,2);}
    if(has('mask')){ctx.fillStyle='#111827';ctx.fillRect(-7,-19,14,5);ctx.fillStyle='#a9bacb';ctx.fillRect(-6,-18,12,3);}
    if(has('scarf')){ctx.fillStyle='#d9503d';ctx.fillRect(-10,-18,20,4);ctx.fillRect(5,-15,4,9);}
    if(has('earrings')){ctx.fillStyle='#f7d45b';ctx.fillRect(-10,-21,2,3);ctx.fillRect(8,-21,2,3);}
  }
  ctx.restore();
}

export function drawPixelAvatar4Dir(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  facingDir: FacingDirection,
  walking: boolean,
  sprinting: boolean,
  t: number,
  skin: string,
  hair: string,
  shirt: string,
  opts?: {
    reducedMotion?: boolean;
    equippedCosmetic?: string | null;
    lanternActive?: boolean;
    lanternRadiusScale?: number;
    interactAnim?: number;
    appearance?: AvatarAppearance;
  }
): void {
  const appearance = opts?.appearance;
  const transformation = appearance?.transformationId;
  if (transformation === 'frankenstein') skin = '#8fbd75';
  else if (transformation === 'mummy') skin = '#d9c79c';
  else if (transformation === 'vampire') skin = '#ead9df';
  else if (transformation === 'werewolf') skin = '#a87955';
  else if (transformation === 'skeleton') skin = '#e7dfc8';
  else if (transformation === 'alien') skin = '#75df91';
  else if (transformation === 'ghost') skin = '#b9edf0';
  else if (transformation === 'demon') skin = '#d94445';
  else if (transformation === 'monster') skin = '#76bd69';
  else if (transformation === 'glitch') skin = '#65d7c8';

  if (transformation === 'skeleton') {
    hair = '#eee5cf';
    shirt = '#e8dfc9';
  } else if (transformation === 'mummy') {
    hair = '#b9a67c';
    shirt = '#d8c69a';
  }
  const reducedMotion = Boolean(opts?.reducedMotion);
  const animT = reducedMotion ? 0 : t;
  const stepPhase = walking ? Math.floor(animT * (sprinting ? 11 : 7.5)) % 4 : 0;
  const bob = walking && (stepPhase === 1 || stepPhase === 3) ? 2 : 0;
  const idleBob = !walking && !reducedMotion && Math.sin(animT * 2.8) > 0.62 ? 1 : 0;
  const idleBlink = !walking && !reducedMotion && (animT % 4.8) > 4.64;
  const stride =
    !walking || reducedMotion ? 0 : stepPhase === 1 ? 3 : stepPhase === 3 ? -3 : 0;
  const armSwing =
    !walking || reducedMotion ? 0 : stepPhase === 1 ? 3 : stepPhase === 3 ? -3 : 0;
  const interactReach = (opts?.interactAnim ?? 0) > 0 ? 3 : 0;

  ctx.save();
  ctx.translate(Math.round(ax), Math.round(ay - bob - idleBob));

  // 1. Sombra suave elíptica de oclusión en el suelo
  ctx.fillStyle = 'rgba(6, 10, 18, 0.24)';
  ctx.fillRect(-10, 5 + bob + idleBob, 20, 5);
  ctx.fillStyle = 'rgba(6, 10, 18, 0.4)';
  ctx.fillRect(-7, 6 + bob + idleBob, 14, 4);
  ctx.fillRect(-4, 9 + bob + idleBob, 8, 1);

  // Halo de la Lámpara de Fósforo si está encendida
  if (opts?.lanternActive) {
    const lanternScale = opts.lanternRadiusScale ?? 1;
    ctx.save();
    ctx.fillStyle = 'rgba(250, 204, 21, 0.2)';
    ctx.beginPath();
    ctx.arc(0, -14, 48 * lanternScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(254, 240, 138, 0.28)';
    ctx.beginPath();
    ctx.arc(0, -14, 26 * lanternScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const darkOutline = '#070b14';

  // Mochila de exploración visible desde atrás, separada por contorno y luz de borde.
  if (facingDir === 'up') {
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-8, -18, 16, 10);
    ctx.fillStyle = '#8b4e20';
    ctx.fillRect(-6, -17, 12, 8);
    ctx.fillStyle = '#c47d44';
    ctx.fillRect(-5, -16, 3, 5);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(3, -16, 2, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1, -14, 3, 2);
  }

  // 2. PIERNAS Y BOTAS DE EXPLORADOR
  ctx.fillStyle = darkOutline;
  if (facingDir === 'down' || facingDir === 'up') {
    // Vista frontal o trasera: dos piernas simétricas con zancada vertical
    const lStride = Math.max(0, stride);
    const rStride = Math.max(0, -stride);
    ctx.fillRect(-8, -6 + lStride, 7, 9);
    ctx.fillRect(1, -6 + rStride, 7, 9);

    // Pantalones oscuros
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-7, -6 + lStride, 5, 4);
    ctx.fillRect(2, -6 + rStride, 5, 4);

    // Botas con suela y puntera
    ctx.fillStyle = appearance?.bootColor ?? '#334155';
    ctx.fillRect(-7, -2 + lStride, 5, 4);
    ctx.fillRect(2, -2 + rStride, 5, 4);
    ctx.fillStyle = appearance?.bootColor ? '#f1d7a1' : '#64748b';
    ctx.fillRect(-6, -1 + lStride, 3, 2);
    ctx.fillRect(3, -1 + rStride, 3, 2);
  } else {
    // Vista lateral (izquierda o derecha): pierna delantera y trasera
    ctx.fillRect(-6 + stride, -6, 7, 9);
    ctx.fillRect(-1 - stride, -6, 7, 9);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-5 + stride, -6, 5, 4);
    ctx.fillRect(-stride, -6, 5, 4);

    ctx.fillStyle = appearance?.bootColor ?? '#334155';
    ctx.fillRect(-5 + stride, -2, 5, 4);
    ctx.fillRect(-stride, -2, 5, 4);
    ctx.fillStyle = appearance?.bootColor ? '#f1d7a1' : '#64748b';
    ctx.fillRect(-4 + stride, -1, 3, 2);
    ctx.fillRect(1 - stride, -1, 3, 2);
  }

  // 3. TORSO: CHAQUETA DE AVENTURA, CAMISETA Y CINTURÓN
  ctx.fillStyle = darkOutline;
  ctx.fillRect(-9, -18, 18, 14);

  // Chaqueta de color personalizable
  ctx.fillStyle = shirt;
  ctx.fillRect(-8, -17, 16, 12);

  // Cinturón de cuero con hebilla dorada
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-8, -8, 16, 3);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, -8, 4, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-1, -7, 2, 1);

  if (facingDir === 'up') {
    // Espalda: pliegues de chaqueta y costura central
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-1, -17, 2, 9);
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-6, -17, 12, 2);
  } else if (facingDir === 'down') {
    // Frontal: solapas de chaqueta y cuello de camiseta interior
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -17, 6, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-2, -15, 4, 3);
    // Solapas de chaqueta
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-4, -17, 1, 7);
    ctx.fillRect(3, -17, 1, 7);
  }

  // 4. BRAZOS EN 4 DIRECCIONES
  ctx.fillStyle = darkOutline;
  if (facingDir === 'down') {
    ctx.fillRect(-12, -17 + armSwing, 4, 9 + interactReach);
    ctx.fillRect(8, -17 - armSwing, 4, 9 + interactReach);
    // Mangas
    ctx.fillStyle = shirt;
    ctx.fillRect(-11, -16 + armSwing, 2, 4);
    ctx.fillRect(9, -16 - armSwing, 2, 4);
    // Manos
    ctx.fillStyle = skin;
    ctx.fillRect(-11, -12 + armSwing, 2, 4 + interactReach);
    ctx.fillRect(9, -12 - armSwing, 2, 4 + interactReach);
  } else if (facingDir === 'up') {
    ctx.fillRect(-12, -17 - armSwing, 4, 9);
    ctx.fillRect(8, -17 + armSwing, 4, 9);
    ctx.fillStyle = shirt;
    ctx.fillRect(-11, -16 - armSwing, 2, 5);
    ctx.fillRect(9, -16 + armSwing, 2, 5);
    ctx.fillStyle = skin;
    ctx.fillRect(-11, -11 - armSwing, 2, 3);
    ctx.fillRect(9, -11 + armSwing, 2, 3);
  } else if (facingDir === 'right') {
    ctx.fillRect(-2 + armSwing + interactReach, -16, 5, 9);
    ctx.fillStyle = shirt;
    ctx.fillRect(-1 + armSwing + interactReach, -15, 3, 4);
    ctx.fillStyle = skin;
    ctx.fillRect(-1 + armSwing + interactReach, -11, 3, 4);
  } else {
    ctx.fillRect(-3 - armSwing - interactReach, -16, 5, 9);
    ctx.fillStyle = shirt;
    ctx.fillRect(-2 - armSwing - interactReach, -15, 3, 4);
    ctx.fillStyle = skin;
    ctx.fillRect(-2 - armSwing - interactReach, -11, 3, 4);
  }

  // 5. CABEZA Y CABELLO CON ESTILO ANIME RETRO GBA
  ctx.fillStyle = darkOutline;
  ctx.fillRect(-10, -34, 20, 18);
  ctx.fillRect(-8, -36, 16, 3);

  if (facingDir === 'up') {
    // Vista trasera del cabello con textura y volumen
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 16);
    ctx.fillRect(-7, -35, 14, 2);
    // Reflejo cenital
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -34, 10, 2);
    // Sombra del cuello
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-4, -18, 8, 2);
  } else if (facingDir === 'down') {
    // Rostro frontal
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -27, 16, 11);
    // Sombra bajo el cabello
    ctx.fillStyle = '#d49b6a';
    ctx.fillRect(-8, -27, 16, 2);

    // Cabello superior con flequillo
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 8);
    ctx.fillRect(-7, -35, 14, 2);
    // Mechones laterales y flequillo
    ctx.fillRect(-9, -27, 3, 6);
    ctx.fillRect(6, -27, 3, 6);
    ctx.fillRect(-3, -27, 2, 3);
    ctx.fillRect(1, -27, 2, 3);

    // Brillo cenital del cabello
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -34, 8, 2);

    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      // Visor vectorial cian brillante
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-8, -25, 16, 6);
      ctx.fillStyle = '#0891b2';
      ctx.fillRect(-7, -24, 14, 4);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(-6, -23, 12, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -23, 4, 1);
    } else {
      // Ojos anime GBA con pupila y destello blanco
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-6, -23, 4, 5);
      ctx.fillRect(2, -23, 4, 5);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5, -22, 2, 3);
      ctx.fillRect(3, -22, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-5, -23, 1, 2);
      ctx.fillRect(3, -23, 1, 2);
    }
  } else if (facingDir === 'right') {
    // Perfil derecho
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -27, 14, 11);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 8);
    ctx.fillRect(-7, -35, 14, 2);
    ctx.fillRect(-9, -27, 7, 9);
    ctx.fillRect(-2, -27, 3, 3);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -34, 8, 2);

    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(0, -25, 9, 6);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(1, -24, 7, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, -23, 3, 1);
    } else {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(2, -23, 4, 5);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(3, -22, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(3, -23, 1, 2);
    }
  } else {
    // Perfil izquierdo
    ctx.fillStyle = skin;
    ctx.fillRect(-8, -27, 14, 11);
    ctx.fillStyle = hair;
    ctx.fillRect(-9, -34, 18, 8);
    ctx.fillRect(-7, -35, 14, 2);
    ctx.fillRect(2, -27, 7, 9);
    ctx.fillRect(-1, -27, 3, 3);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-4, -34, 8, 2);

    if (opts?.equippedCosmetic === 'item-visor-vectorial') {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-9, -25, 9, 6);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(-8, -24, 7, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -23, 3, 1);
    } else {
      ctx.fillStyle = darkOutline;
      ctx.fillRect(-6, -23, 4, 5);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(-5, -22, 2, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -23, 1, 2);
    }
  }

  // Parpadeo breve y espaciado para dar vida al reposo sin distraer al caminar.
  if (idleBlink && facingDir === 'down') {
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -22, 4, 2);
    ctx.fillRect(2, -22, 4, 2);
  } else if (idleBlink && facingDir === 'right') {
    ctx.fillStyle = skin;
    ctx.fillRect(2, -22, 4, 2);
  } else if (idleBlink && facingDir === 'left') {
    ctx.fillStyle = skin;
    ctx.fillRect(-6, -22, 4, 2);
  }

  // Corona Dorada del Origen (Cosmético de Arquitecto)
  if (opts?.equippedCosmetic === 'item-manto-arquitecto') {
    ctx.fillStyle = darkOutline;
    ctx.fillRect(-8, -41, 16, 8);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-7, -39, 14, 5);
    ctx.fillRect(-7, -41, 3, 3);
    ctx.fillRect(-1, -42, 2, 4);
    ctx.fillRect(4, -41, 3, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-1, -38, 2, 2);
  }

  if (appearance && !transformation) drawAvatarOutfit(ctx, appearance.outfitId);
  if (transformation) drawAvatarTransformation(ctx, transformation, t);
  if (appearance?.accessories.length) drawAvatarAccessories(ctx, appearance.accessories, facingDir);

  ctx.restore();
}

/** Cofre de tesoro arqueológico con riqueza de madera y herrajes GBA */
export function drawRpgTreasureChest(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  opened: boolean,
  accentHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(-15, 4, 30, 6);

  // Contorno negro GBA
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-15, -19, 30, 24);

  // Cuerpo de roble tostado con vetas
  ctx.fillStyle = opened ? '#3f2b1d' : '#8b4e20';
  ctx.fillRect(-13, -11, 26, 14);
  ctx.fillStyle = opened ? '#281a10' : '#683612';
  ctx.fillRect(-13, 0, 26, 3);

  // Tapa abombada del cofre
  if (opened) {
    // Tapa abierta hacia atrás: interior de terciopelo y bisagras
    ctx.fillStyle = '#1e140d';
    ctx.fillRect(-13, -17, 26, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-11, -15, 22, 4);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-4, -14, 8, 2);
  } else {
    // Tapa cerrada con curvatura y reflejo de barniz
    ctx.fillStyle = '#b4672e';
    ctx.fillRect(-13, -17, 26, 7);
    ctx.fillStyle = '#d98b4c';
    ctx.fillRect(-13, -17, 26, 2);
  }

  // Bandas de refuerzo de oro / latón y cerradura
  ctx.fillStyle = opened ? '#64748b' : '#facc15';
  ctx.fillRect(-13, -12, 26, 3);
  ctx.fillRect(-10, -17, 3, 20);
  ctx.fillRect(7, -17, 3, 20);

  // Cerradura central con bocallave
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-4, -13, 8, 7);
  ctx.fillStyle = opened ? '#94a3b8' : '#fde047';
  ctx.fillRect(-3, -12, 6, 5);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-1, -11, 2, 3);

  // Destello de tesoro esperando ser abierto
  if (!opened && !reducedMotion && Math.floor(elapsed * 3) % 2 === 0) {
    ctx.fillStyle = accentHex;
    ctx.fillRect(-1, -13, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -12, 1, 1);
  }

  ctx.restore();
}

/** Gabinete de arcade Pong 1972 con lateral de madera noble y monitor CRT vivo */
function drawPong1972CabinetWorld(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  restored: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Tarima ceremonial de losas sobre la pradera
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-46, -10, 92, 36);
  ctx.fillStyle = '#d9b878';
  ctx.fillRect(-42, -6, 84, 28);
  ctx.fillStyle = '#f3e2be';
  ctx.fillRect(-42, -6, 84, 3);
  ctx.fillStyle = '#9c7b44';
  ctx.fillRect(-38, 0, 76, 18);

  // Mueble arcade vertical Atari 1972: laterales de nogal y perfil amarillo
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-24, -64, 48, 66);
  ctx.fillStyle = '#eab308';
  ctx.fillRect(-22, -62, 44, 62);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-18, -60, 36, 58);
  ctx.fillStyle = '#a16207';
  ctx.fillRect(-17, -59, 4, 56);

  // Marquesina retroiluminada PONG
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, -58, 36, 12);
  ctx.fillStyle = '#fef08a';
  ctx.fillRect(-16, -56, 32, 8);
  ctx.fillStyle = '#070b14';
  ctx.font = '900 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PONG', 0, -50);

  // Monitor CRT curvo con fósforo verde/negro
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-17, -44, 34, 26);
  ctx.fillStyle = restored ? '#062817' : '#0f172a';
  ctx.fillRect(-15, -42, 30, 22);

  // Partido de Pong animado en tiempo real
  const bx = Math.round(Math.sin(elapsed * 4.5) * 9);
  const by = Math.round(Math.cos(elapsed * 3.1) * 5);
  ctx.fillStyle = '#ffffff';
  // Paletas izquierda y derecha
  ctx.fillRect(-12, -36, 2, 9);
  ctx.fillRect(10, -36 + (by > 0 ? 2 : -2), 2, 9);
  // Red discontinua central
  for (let ny = -40; ny < -22; ny += 4) {
    ctx.fillRect(-0.5, ny, 1, 2);
  }
  // Pelota cuadrada
  ctx.fillRect(bx - 1, -33 + by, 3, 3);

  // Monedero de latón con ranuras para 25 centavos
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-10, -14, 20, 12);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-8, -12, 16, 8);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-5, -9, 3, 2);
  ctx.fillRect(2, -9, 3, 2);

  ctx.restore();
}

/** Gabinete de arcade Space Invaders 1978 con mueble upright y pantalla espacial */
function drawSpaceInvaders1978CabinetWorld(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  restored: boolean,
  unlocked: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Pedestal de basalto volcánico esculpido
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-48, -10, 96, 36);
  ctx.fillStyle = '#3f2832';
  ctx.fillRect(-44, -6, 88, 28);
  ctx.fillStyle = '#5c3d4b';
  ctx.fillRect(-44, -6, 88, 3);
  ctx.fillStyle = restored ? '#22c55e' : unlocked ? '#f97316' : '#64748b';
  ctx.fillRect(-40, 14, 80, 4);

  // Mueble arcade upright crema y naranja 1978
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-26, -68, 52, 70);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-24, -66, 48, 66);
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(-22, -64, 44, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-20, -48, 40, 46);

  // Marquesina retroiluminada de marcianos
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-20, -64, 40, 12);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(-18, -62, 36, 8);
  ctx.fillStyle = '#fef08a';
  ctx.font = '900 6px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('INVADERS', 0, -56);

  // Pantalla CRT espacial con invasores pixelados marchando
  ctx.fillStyle = '#050a14';
  ctx.fillRect(-16, -46, 32, 24);
  const shift = Math.floor(elapsed * 2) % 2 === 0 ? -2 : 2;
  ctx.fillStyle = unlocked ? '#4ade80' : '#94a3b8';
  for (let ix = -9; ix <= 7; ix += 8) {
    // Marciano fila 1
    ctx.fillRect(ix + shift, -42, 4, 3);
    // Marciano fila 2
    ctx.fillRect(ix - shift, -36, 4, 3);
  }
  // Cañón láser defensor en la base de la pantalla
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-3, -28, 6, 3);
  ctx.fillRect(-1, -30, 2, 2);

  ctx.restore();
}

type NorthArcadeId = 'breakout' | 'asteroids' | 'seaWolf' | 'tank' | 'lunarLander' | 'galaxian';

/** Rutas legibles y pequeñas plazas temáticas del cruce septentrional. */
function drawNorthernArcadeDistrict(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const { junction: j, arcades: a } = NORTH_ARCADE_LAYOUT;
  const road = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#171b22'; ctx.fillRect(x - 4, y - 4, w + 8, h + 8);
    ctx.fillStyle = '#687078'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#89908e'; ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    ctx.fillStyle = '#59625f';
    for (let tx = x + 8; tx < x + w - 4; tx += 24) ctx.fillRect(tx, y + Math.floor(h / 2), 10, 2);
    for (let ty = y + 8; ty < y + h - 4; ty += 24) ctx.fillRect(x + Math.floor(w / 2), ty, 2, 10);
  };
  road(1896, -552, 112, 232);
  road(1896, -176, 112, 336);
  road(2032, -296, 256, 112);
  road(1568, -296, 304, 112);
  ctx.fillStyle = '#342c25'; ctx.fillRect(j.x - 80, j.y - 80, 160, 160);
  ctx.fillStyle = '#a88955'; ctx.fillRect(j.x - 76, j.y - 76, 152, 152);
  ctx.fillStyle = '#686d69'; ctx.fillRect(j.x - 68, j.y - 68, 136, 136);
  ctx.fillStyle = '#9b8a64'; ctx.fillRect(j.x - 58, j.y - 58, 116, 116);
  ctx.fillStyle = '#4a514d';
  for (let x = j.x - 52; x <= j.x + 44; x += 24) {
    ctx.fillRect(x, j.y - 44, 16, 2); ctx.fillRect(x, j.y + 42, 16, 2);
  }

  // Cuatro pequeñas áreas de juego a los extremos de los caminos.
  const alcove = (x: number, y: number, fill: string, edge: string) => {
    ctx.fillStyle = '#171a1c'; ctx.fillRect(x - 42, y - 28, 84, 56);
    ctx.fillStyle = edge; ctx.fillRect(x - 38, y - 24, 76, 48);
    ctx.fillStyle = fill; ctx.fillRect(x - 34, y - 20, 68, 40);
  };
  alcove(a.seaWolf.x, a.seaWolf.y, '#2d7883', '#a5d6c7');
  for (let i = 0; i < 4; i++) {
    const wave = Math.round(Math.sin(elapsed * 2 + i) * 2);
    ctx.fillStyle = i % 2 ? '#5dc1c1' : '#d3e9bc';
    ctx.fillRect(a.seaWolf.x - 30 + i * 18, a.seaWolf.y + 13 + wave, 10, 2);
  }
  alcove(a.tank.x, a.tank.y, '#745b39', '#d6bd7c');
  ctx.fillStyle = '#3c4633';
  for (let i = 0; i < 3; i++) {
    const ox = a.tank.x - 24 + i * 22;
    ctx.fillRect(ox, a.tank.y - 13, 12, 3); ctx.fillRect(ox + 4, a.tank.y + 7, 16, 3);
  }
  alcove(a.lunarLander.x, a.lunarLander.y, '#777b7d', '#c5c2a8');
  ctx.fillStyle = '#d7d1b1';
  for (const [dx, dy, r] of [[-22, -8, 6], [8, 8, 9], [23, -10, 4]] as const) {
    ctx.fillRect(a.lunarLander.x + dx, a.lunarLander.y + dy, r * 2, 3);
    ctx.fillRect(a.lunarLander.x + dx + 3, a.lunarLander.y + dy - 2, r, 2);
  }
  alcove(a.galaxian.x, a.galaxian.y, '#1e1b4b', '#f43f5e');
  ctx.fillStyle = '#facc15';
  ctx.fillRect(a.galaxian.x - 12, a.galaxian.y + 8, 24, 2);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(a.galaxian.x - 18, a.galaxian.y + 14, 36, 2);

  // Placas de latón guían al jugador desde el centro hacia cada descubrimiento.
  ctx.fillStyle = '#47351f'; ctx.fillRect(j.x - 10, j.y - 10, 20, 20);
  ctx.fillStyle = '#e5cc8a'; ctx.fillRect(j.x - 6, j.y - 6, 12, 12);
}

/** Gabinetes originales de siluetas CRT diferentes para el cruce norte. */
function drawNorthernArcadeCabinet(
  ctx: CanvasRenderingContext2D,
  id: NorthArcadeId,
  wx: number,
  wy: number,
  elapsed: number,
  restored: boolean
): void {
  const palettes: Record<NorthArcadeId, { body: string; trim: string; screen: string; glow: string; title: string }> = {
    breakout: { body: '#ead9ad', trim: '#bd7138', screen: '#16352c', glow: '#fff1a6', title: 'BREAKOUT' },
    asteroids: { body: '#373d43', trim: '#9ad7c8', screen: '#061923', glow: '#b6fff0', title: 'ASTEROIDS' },
    seaWolf: { body: '#d6d1b5', trim: '#286b70', screen: '#092c36', glow: '#8df5db', title: 'SEA WOLF' },
    tank: { body: '#65513a', trim: '#b1a165', screen: '#1d281c', glow: '#d9dc80', title: 'TANK' },
    lunarLander: { body: '#d4d1c5', trim: '#777b80', screen: '#131a2b', glow: '#f2edc4', title: 'LUNAR' },
    galaxian: { body: '#1e1b4b', trim: '#f43f5e', screen: '#08051a', glow: '#facc15', title: 'GALAXIAN' },
  };
  const p = palettes[id];
  ctx.save(); ctx.translate(Math.round(wx), Math.round(wy));
  ctx.fillStyle = 'rgba(9,10,12,.58)'; ctx.fillRect(-35, 8, 70, 11); ctx.fillRect(-29, 6, 58, 15);
  ctx.fillStyle = '#34261b'; ctx.fillRect(-36, -2, 72, 12);
  ctx.fillStyle = '#9e8052'; ctx.fillRect(-33, -1, 66, 9);
  ctx.fillStyle = '#17191c'; ctx.fillRect(-24, -68, 48, 68);
  ctx.fillStyle = p.body; ctx.fillRect(-21, -65, 42, 63);
  ctx.fillStyle = p.trim; ctx.fillRect(-19, -63, 38, 12);
  ctx.fillStyle = '#201a17'; ctx.fillRect(-18, -61, 36, 8);
  ctx.fillStyle = p.glow; ctx.font = 'bold 5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(p.title, 0, -55);
  // Sea Wolf tiene el periscopio distintivo; el resto conserva marquesina upright.
  if (id === 'seaWolf') {
    ctx.fillStyle = '#25272a'; ctx.fillRect(-12, -78, 24, 10); ctx.fillRect(-8, -70, 16, 8);
    ctx.fillStyle = '#b3b7a1'; ctx.fillRect(-10, -76, 20, 4);
  }
  ctx.fillStyle = '#11171b'; ctx.fillRect(-16, -47, 32, 25);
  ctx.fillStyle = restored ? (id === 'galaxian' ? '#0b0c26' : '#0f3c2c') : p.screen; ctx.fillRect(-14, -45, 28, 21);
  ctx.fillStyle = p.glow;
  if (id === 'breakout') {
    for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) ctx.fillRect(-12 + col * 5, -42 + row * 4, 4, 2);
    ctx.fillRect(-5, -27, 10, 2); ctx.fillRect(-1, -31, 2, 2);
  } else if (id === 'asteroids') {
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8,-38); ctx.lineTo(-4,-43); ctx.lineTo(1,-40); ctx.lineTo(0,-35); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8,-30); ctx.lineTo(11,-34); ctx.lineTo(14,-30); ctx.closePath(); ctx.stroke();
    ctx.fillRect(-1,-29,2,4); ctx.fillRect(-4,-27,8,1);
  } else if (id === 'seaWolf') {
    ctx.fillRect(-11,-34,22,1); ctx.fillRect(-7,-38,12,2); ctx.fillRect(2,-41,2,13);
    ctx.strokeStyle = p.glow; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(2,-35,7,Math.PI,Math.PI*2); ctx.stroke();
  } else if (id === 'tank') {
    ctx.fillStyle = '#536344'; ctx.fillRect(-11,-41,7,2); ctx.fillRect(4,-36,8,2); ctx.fillRect(-7,-29,9,2);
    ctx.fillStyle = p.glow; ctx.fillRect(-1,-35,5,5); ctx.fillRect(1,-39,2,4); ctx.fillRect(4,-37,4,1);
  } else if (id === 'galaxian') {
    // Galaxian Flagship and Fighter
    ctx.fillStyle = '#facc15'; ctx.fillRect(-3, -42, 6, 3); ctx.fillRect(-1, -44, 2, 2);
    ctx.fillStyle = '#f43f5e'; ctx.fillRect(-7, -37, 4, 2); ctx.fillRect(3, -37, 4, 2);
    ctx.fillStyle = '#38bdf8'; ctx.fillRect(-2, -28, 4, 4); ctx.fillRect(0, -31, 1, 3);
  } else {
    ctx.fillRect(-2,-43,4,2); ctx.fillRect(-5,-41,10,3); ctx.fillRect(-8,-37,16,1);
    ctx.fillRect(-6,-32,3,1); ctx.fillRect(4,-29,4,1);
    const blink = Math.floor(elapsed * 3) % 2;
    ctx.fillRect(-1,-34 + blink,2,3);
  }
  // Control deck, joystick, buttons and side-lit bevels.
  ctx.fillStyle = '#211b16'; ctx.fillRect(-18, -20, 36, 12);
  ctx.fillStyle = p.trim; ctx.fillRect(-15, -18, 30, 7);
  ctx.fillStyle = '#17191c'; ctx.fillRect(-8, -16, 3, 3); ctx.fillRect(4, -16, 3, 2); ctx.fillRect(9, -16, 3, 2);
  ctx.fillStyle = '#e9d49e'; ctx.fillRect(-7, -18, 1, 3);
  ctx.fillStyle = p.trim; ctx.fillRect(-21, -63, 2, 59); ctx.fillRect(19, -63, 2, 59);
  ctx.fillStyle = restored ? '#61db90' : p.glow; ctx.fillRect(-23, 0, 46, 2);
  ctx.restore();
}

function drawVolcanicGuard(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number, approved: boolean): void {
  const step = Math.floor(elapsed * 2) % 2;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = 'rgba(5, 8, 12, .48)'; ctx.fillRect(-14, 0, 28, 6);
  // Botas altas y pantalón ignífugo con bandas reflectantes.
  ctx.fillStyle = '#15191c'; ctx.fillRect(-10, -8 + step, 8, 9); ctx.fillRect(2, -8 - step, 8, 9);
  ctx.fillStyle = '#f2a51a'; ctx.fillRect(-10, -6 + step, 8, 2); ctx.fillRect(2, -6 - step, 8, 2);
  ctx.fillStyle = '#351b17'; ctx.fillRect(-11, -25, 22, 20);
  ctx.fillStyle = '#9b321f'; ctx.fillRect(-10, -24, 20, 18);
  ctx.fillStyle = '#e66a22'; ctx.fillRect(-8, -23, 16, 14);
  ctx.fillStyle = '#f7bd35'; ctx.fillRect(-9, -19, 18, 4); ctx.fillRect(-3, -24, 6, 15);
  ctx.fillStyle = '#22282b'; ctx.fillRect(-14, -23, 5, 15); ctx.fillRect(9, -23, 5, 15);
  ctx.fillStyle = '#e66a22'; ctx.fillRect(-14, -11, 5, 5); ctx.fillRect(9, -11, 5, 5);
  // Casco integral, respirador frontal, visor tintado y mangueras laterales.
  ctx.fillStyle = '#181c20'; ctx.fillRect(-11, -39, 22, 16); ctx.fillRect(-13, -36, 26, 9);
  ctx.fillStyle = '#e66a22'; ctx.fillRect(-10, -38, 20, 5); ctx.fillRect(-13, -35, 3, 8); ctx.fillRect(10, -35, 3, 8);
  ctx.fillStyle = '#9fe8e0'; ctx.fillRect(-8, -32, 16, 5);
  ctx.fillStyle = '#274e52'; ctx.fillRect(-6, -31, 11, 3);
  ctx.fillStyle = '#d9d6c4'; ctx.fillRect(-5, -25, 10, 5);
  ctx.fillStyle = '#374348'; ctx.fillRect(-3, -24, 6, 3); ctx.fillRect(-2, -20, 4, 2);
  ctx.fillStyle = '#f5c34b'; ctx.fillRect(-12, -40, 24, 3); ctx.fillRect(-8, -43, 16, 3);
  ctx.fillStyle = '#fff0b5'; ctx.fillRect(-8, -42, 5, 1);
  if (approved) {
    // Brazo alzado en saludo de aprobación.
    ctx.fillStyle = '#e66a22'; ctx.fillRect(12, -34, 7, 8); ctx.fillRect(16, -42, 5, 10);
    ctx.fillStyle = '#f7bd35'; ctx.fillRect(16, -44, 5, 4);
  } else {
    ctx.fillStyle = '#c8c4ad'; ctx.fillRect(-3, -16, 6, 3);
  }
  ctx.restore();
}

function drawBreakoutLegendStone(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number, extracted: boolean, extracting: boolean): void {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y));
  ctx.fillStyle = 'rgba(4, 6, 9, .56)'; ctx.fillRect(-33, 14, 66, 9);
  // Silueta irregular de basalto, vetas y cristales cobrizos.
  ctx.fillStyle = '#100d12'; ctx.fillRect(-29, -21, 58, 39); ctx.fillRect(-23, -27, 46, 6); ctx.fillRect(-35, -13, 6, 24); ctx.fillRect(29, -12, 6, 22);
  ctx.fillStyle = '#352831'; ctx.fillRect(-27, -19, 54, 34); ctx.fillRect(-21, -25, 42, 6); ctx.fillRect(-33, -11, 6, 20); ctx.fillRect(27, -10, 6, 19);
  ctx.fillStyle = '#58414a'; ctx.fillRect(-22, -22, 18, 4); ctx.fillRect(7, -18, 14, 3); ctx.fillRect(-27, -8, 4, 11);
  ctx.fillStyle = '#170f14'; ctx.fillRect(-18, -4, 4, 15); ctx.fillRect(8, -1, 3, 12);
  ctx.fillStyle = '#b84b22'; ctx.fillRect(-20, 0, 2, 7); ctx.fillRect(11, 1, 2, 7);
  ctx.fillStyle = '#f5bb44'; ctx.fillRect(-27, 8, 4, 3); ctx.fillRect(23, -13, 3, 4); ctx.fillRect(16, 11, 3, 2);
  const lift = extracting ? 24 + Math.round(Math.sin(elapsed * 9) * 4) : extracted ? 46 : 0;
  if (!extracted || extracting) {
    ctx.fillStyle = 'rgba(249, 115, 22, .22)';
    if (extracting) ctx.fillRect(-16, -54 - lift, 32, 45);
    ctx.fillStyle = '#17252b'; ctx.fillRect(-4, -27 - lift, 8, 25);
    ctx.fillStyle = '#50b7c5'; ctx.fillRect(-2, -26 - lift, 4, 21);
    ctx.fillStyle = '#273038'; ctx.fillRect(-16, -34 - lift, 32, 10);
    ctx.fillStyle = '#11191e'; ctx.fillRect(-18, -36 - lift, 36, 12);
    ctx.fillStyle = '#f6c74c'; ctx.fillRect(-15, -33 - lift, 30, 6);
    ctx.fillStyle = '#fff4bc'; ctx.fillRect(-13, -32 - lift, 26, 2);
    ctx.fillStyle = '#df7729'; ctx.fillRect(-6, -24 - lift, 12, 4);
  }
  ctx.restore();
}

/** Gabinete de arcade con manillar de motocicleta para Night Driver (1976). */
function drawNightDriverArcadeTerminal(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  elapsed: number,
  restored: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(wx), Math.round(wy));

  // Base shadow
  ctx.fillStyle = 'rgba(5, 8, 12, 0.55)';
  ctx.fillRect(-32, 6, 64, 12);

  // Cabinet body (Chasis negro y cian con líneas de carreras)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-22, -64, 44, 66);
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(-20, -62, 40, 14);

  // Marquee "NIGHT DRIVER"
  ctx.fillStyle = '#020617';
  ctx.fillRect(-18, -60, 36, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('NIGHT DRV', 0, -53);

  // CRT Screen
  ctx.fillStyle = '#05070d';
  ctx.fillRect(-16, -46, 32, 24);
  ctx.fillStyle = restored ? '#082f49' : '#020408';
  ctx.fillRect(-14, -44, 28, 20);

  // Road posts on screen
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-10, -32, 2, 4);
  ctx.fillRect(8, -32, 2, 4);
  ctx.fillRect(-6, -38, 1, 2);
  ctx.fillRect(5, -38, 1, 2);

  // Motorcycle Handlebars mounted to front deck
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-18, -20, 36, 12);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-16, -14);
  ctx.lineTo(-4, -10);
  ctx.lineTo(4, -10);
  ctx.lineTo(16, -14);
  ctx.stroke();

  // Headlight beam glow
  const blink = (Math.sin(elapsed * 6) + 1) * 0.5;
  ctx.fillStyle = restored ? `rgba(56, 189, 248, ${0.4 + blink * 0.3})` : 'rgba(250, 204, 21, 0.35)';
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.lineTo(6, -10);
  ctx.lineTo(16, 8);
  ctx.lineTo(-16, 8);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** Dibuja al técnico Dylan acompañando físicamente al jugador (compañero de escolta). */
function drawEscortDylan(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: 'up' | 'down' | 'left' | 'right' | string,
  walking: boolean,
  elapsed: number
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const step = walking ? Math.floor(elapsed * 6) % 2 : 0;
  const bob = walking ? (step === 0 ? -1 : 0) : 0;

  // Sombra suave en el suelo
  ctx.fillStyle = 'rgba(5, 8, 12, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Botas de trabajo
  ctx.fillStyle = '#331100';
  ctx.fillRect(-6, -5 + step, 5, 6);
  ctx.fillRect(1, -5 + (1 - step), 5, 6);

  // Mono de trabajo / Overall de mecánico (Naranja retro con cincha azul)
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(-7, -20 + bob, 14, 16);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-5, -17 + bob, 10, 3);

  // Cabeza y rostro de Dylan
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(-5, -28 + bob, 10, 9);

  // Cabello castaño despeinado con visera
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-6, -32 + bob, 12, 5);
  ctx.fillRect(-6, -29 + bob, 3, 4);

  // Ojos según dirección
  ctx.fillStyle = '#0f172a';
  if (facing === 'right') {
    ctx.fillRect(0, -25 + bob, 2, 2);
    ctx.fillRect(3, -25 + bob, 2, 2);
  } else if (facing === 'left') {
    ctx.fillRect(-5, -25 + bob, 2, 2);
    ctx.fillRect(-2, -25 + bob, 2, 2);
  } else if (facing === 'down') {
    ctx.fillRect(-3, -25 + bob, 2, 2);
    ctx.fillRect(1, -25 + bob, 2, 2);
  }

  // Llave inglesa / herramienta en la mano de Dylan
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(6, -18 + bob, 3, 8);
  ctx.fillRect(5, -20 + bob, 5, 3);
  ctx.fillStyle = '#020617';
  ctx.fillRect(7, -19 + bob, 1, 1);

  // Bocadillo sutil "Técnico Dylan" flotando
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DYLAN', 0, -36 + bob);

  ctx.restore();
}

function drawVolcanicFortressDetails(ctx: CanvasRenderingContext2D, elapsed: number, gateOpen: boolean): void {
  // Formaciones de basalto en los márgenes del patio, lejos de los pasos y los frentes de las máquinas.
  const rocks = [
    { x: 2660, y: 486, s: 1 }, { x: 3128, y: 528, s: 1.2 },
    { x: 2650, y: 898, s: 1.2 }, { x: 3118, y: 884, s: 1 },
  ];
  for (const rock of rocks) {
    const s = rock.s;
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(rock.x - 22*s, rock.y + 4, 44*s, 8);
    ctx.fillStyle = '#171319'; ctx.fillRect(rock.x - 18*s, rock.y - 12*s, 36*s, 18*s); ctx.fillRect(rock.x - 11*s, rock.y - 21*s, 23*s, 12*s);
    ctx.fillStyle = '#503743'; ctx.fillRect(rock.x - 15*s, rock.y - 12*s, 29*s, 14*s); ctx.fillRect(rock.x - 8*s, rock.y - 18*s, 17*s, 7*s);
    ctx.fillStyle = '#8c5960'; ctx.fillRect(rock.x - 8*s, rock.y - 17*s, 10*s, 2); ctx.fillRect(rock.x - 14*s, rock.y - 8*s, 8*s, 2);
    ctx.fillStyle = '#f05a27'; ctx.fillRect(rock.x + 5*s, rock.y - 4*s, 2, 6);
  }
  // Fisuras pequeñas, de borde amarillo y núcleo incandescente, incrustadas en el basalto.
  const cracks = [[2700, 512], [3068, 594], [2658, 782], [3090, 846]] as const;
  for (let i = 0; i < cracks.length; i++) {
    const [x, y] = cracks[i];
    ctx.fillStyle = '#170d12'; ctx.fillRect(x, y, 34, 4); ctx.fillRect(x + 12, y - 5, 3, 12);
    ctx.fillStyle = i % 2 === 0 ? '#e65325' : '#f18725'; ctx.fillRect(x + 2, y + 1, 27, 2); ctx.fillRect(x + 13, y - 3, 2, 9);
    ctx.fillStyle = '#ffd45b'; ctx.fillRect(x + 6 + (Math.floor(elapsed * 2) % 4), y + 1, 7, 1);
  }
  if (!gateOpen) {
    const gx = VOLCANIC_ARCADE_LAYOUT.accessGateX;
    ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fillRect(gx - 8, 380, 18, 572);
    ctx.fillStyle = '#20151b'; ctx.fillRect(gx - 5, 368, 10, 592);
    ctx.fillStyle = '#7b3025'; ctx.fillRect(gx - 2, 368, 4, 592);
    for (let y = 376; y < 950; y += 40) {
      ctx.fillStyle = y % 80 === 16 ? '#f7c145' : '#e15b2f';
      ctx.fillRect(gx - 9, y, 18, 5);
      ctx.fillStyle = '#130f14'; ctx.fillRect(gx - 4, y + 8, 8, 10);
    }
    ctx.fillStyle = '#ffb52f'; ctx.fillRect(gx - 15, 668, 30, 36);
    ctx.fillStyle = '#20151b'; ctx.fillRect(gx - 12, 671, 24, 30);
    ctx.fillStyle = '#ffe28a'; ctx.font = 'bold 5px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText('ZONA', gx, 682); ctx.fillText('DE RIESGO', gx, 690);
  }
}

/**
 * TABLA FLOTANTE DE PONG (1972) ESTILO GBA SCI-FI VINTAGE
 * - Chasis aerodinámico con palas de Pong en los extremos, carcasa marfil/crema con biseles sombreados
 * - Pista central de Pong con fósforo cian, pelota luminosa animada y red de puntos
 * - Almohadillas de tracción de goma texturizada para las botas del héroe
 * - Retropropulsores de plasma con aura pulsante sobre el suelo
 */
export function drawPongHoverboard(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  tilt: number,
  mounted: boolean,
  elapsed: number,
  skinColor: string,
  hairColor: string,
  shirtColor: string,
  reducedMotion: boolean,
  appearance?: AvatarAppearance
): void {
  const hover = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 5.2) * 2.5);
  const px = Math.round(hx);
  const py = Math.round(hy + hover);

  ctx.save();
  ctx.translate(px, py);
  if (tilt !== 0) ctx.rotate(tilt);

  // Sombra elíptica suave en el suelo con escala según la altura
  const shadowDist = 10 - hover;
  ctx.fillStyle = 'rgba(5, 8, 14, 0.42)';
  ctx.fillRect(-26, shadowDist, 52, 6);
  ctx.fillRect(-20, shadowDist - 1, 40, 8);

  // Aura de plasma inferior proyectada por los antigravitatorios
  const glowPulse = reducedMotion ? 0.3 : 0.25 + 0.15 * Math.sin(elapsed * 8);
  ctx.fillStyle = `rgba(56, 189, 248, ${glowPulse})`;
  ctx.fillRect(-22, 4, 44, 4);
  ctx.fillStyle = `rgba(0, 243, 255, ${glowPulse * 1.5})`;
  ctx.fillRect(-14, 5, 28, 2);

  // Toberas de levitación magnética inferiores
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, 2, 8, 4);
  ctx.fillRect(10, 2, 8, 4);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-16, 2, 4, 3);
  ctx.fillRect(12, 2, 4, 3);

  // Contorno exterior nítido estilo GBA
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-27, -5, 54, 9);
  ctx.fillRect(-25, -6, 50, 11);
  ctx.fillRect(-28, -3, 56, 5);

  // Carcasa aerodinámica principal (marfil vintage de consola de los 70)
  ctx.fillStyle = '#f8f5e6';
  ctx.fillRect(-26, -4, 52, 7);
  // Bisel de luz superior
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-24, -5, 48, 2);
  // Bisel de sombra inferior
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-25, 1, 50, 2);

  // Paragolpes / palas de Pong en los extremos (estilo paleta analógica 1972)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-26, -4, 5, 7);
  ctx.fillRect(21, -4, 5, 7);
  ctx.fillStyle = '#f26419';
  ctx.fillRect(-25, -3, 3, 5);
  ctx.fillRect(22, -3, 3, 5);

  // Almohadillas de goma antideslizantes para los pies de Pixel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-18, -3, 10, 5);
  ctx.fillRect(8, -3, 10, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-16, -2, 6, 3);
  ctx.fillRect(10, -2, 6, 3);

  // Pista central de Pong incrustada en el chasis
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-6, -4, 12, 7);
  // Red discontinua de Pong
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-1, -3, 2, 1);
  ctx.fillRect(-1, -1, 2, 1);
  ctx.fillRect(-1, 1, 2, 1);

  // Pelota de Pong luminosa oscilando de lado a lado
  const ballOffset = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 6) * 4);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(ballOffset - 1, -2, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ballOffset, -2, 1, 1);

  // Si Pixel está montado sobre la tabla
  if (mounted) {
    drawPixelAvatar4Dir(
      ctx,
      0,
      -3,
      tilt < 0 ? 'up' : 'down',
      false,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      { reducedMotion, appearance }
    );
  }

  ctx.restore();
}

/**
 * LANZADERA ESTELAR (SPACE INVADERS 1978) ESTILO GBA RPG
 * - Fuselaje delta aerodinámico con placas cerámicas esmaltadas y biselado de sombras
 * - Cabina de mando en cúpula ahumada con reflejos de luz y cuadro de instrumentos
 * - Alerones laterales con franjas de carreras retro (rojo y azul) y luces de navegación
 * - Toberas dobles de propulsión con estela de fuego escalonado en 4 tonos
 */
function drawStarShuttle(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  scale: number,
  tilt: number,
  thrustersOn: boolean
): void {
  ctx.save();
  ctx.translate(Math.round(sx), Math.round(sy));
  ctx.scale(scale, scale);
  if (tilt !== 0) ctx.rotate(tilt);

  // Sombra de contacto en plataforma
  ctx.fillStyle = 'rgba(5, 8, 14, 0.46)';
  ctx.fillRect(-34, 12, 68, 10);
  ctx.fillRect(-26, 10, 52, 14);

  // Silueta base exterior
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-36, -18, 72, 30);
  ctx.fillRect(-28, -26, 56, 42);
  ctx.fillRect(-14, -34, 28, 52);
  ctx.fillRect(-6, -38, 12, 8);

  // Fuselaje principal: placas cerámicas blancas y grises
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-34, -16, 68, 26);
  ctx.fillRect(-26, -24, 52, 38);
  ctx.fillRect(-12, -32, 24, 48);

  // Reflejos de luz en el flanco izquierdo (sol cenital)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-12, -32, 4, 46);
  ctx.fillRect(-24, -22, 6, 32);
  ctx.fillRect(-32, -14, 8, 22);

  // Sombreado de volumen en el flanco derecho
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(8, -32, 4, 46);
  ctx.fillRect(18, -22, 6, 32);
  ctx.fillRect(24, -14, 8, 22);

  // Franjas aerodinámicas de carreras estilo 70s
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-22, -12, 44, 4);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(-20, -6, 40, 4);

  // Luces estroboscópicas en las puntas de las alas
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-34, -8, 3, 4);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(31, -8, 3, 4);

  // Cúpula de la cabina de mando (cristal ahumado con reflejo y HUD verde)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-10, -22, 20, 14);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-8, -20, 16, 10);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-6, -19, 4, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-6, -19, 2, 2);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(1, -16, 4, 3);

  // Alerón vertical / timón con emblema retro
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-4, 0, 8, 14);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-3, 1, 6, 12);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, 3, 4, 4);

  // Toberas de propulsión traseras
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-22, 12, 14, 8);
  ctx.fillRect(8, 12, 14, 8);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-20, 14, 10, 5);
  ctx.fillRect(10, 14, 10, 5);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-18, 16, 6, 3);
  ctx.fillRect(12, 16, 6, 3);

  // Estelas de propulsión de cohete
  if (thrustersOn) {
    // Llamarada izquierda
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-18, 19, 6, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-20, 23, 10, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-19, 29, 8, 8);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-17, 35, 4, 6);

    // Llamarada derecha
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 19, 6, 6);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(10, 23, 10, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(11, 29, 8, 8);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(13, 35, 4, 6);
  }

  ctx.restore();
}

interface NpcLookSpec {
  skin: number;
  hair: number;
  eyes: string;
  beard?: boolean;
}

/** Tonos de piel y cabello para que cada aldeano tenga un rostro propio. */
const NPC_SKIN_TONES = [
  { base: '#f3c59c', light: '#ffdfbf', shade: '#d19a72', deep: '#ab6f4e' },
  { base: '#dca36f', light: '#f4c795', shade: '#b2784a', deep: '#8a5633' },
  { base: '#b97c50', light: '#d99b6d', shade: '#8e5737', deep: '#693d26' },
  { base: '#8a5738', light: '#a9704b', shade: '#6b402a', deep: '#4b2b1c' },
];

const NPC_HAIR_TONES = [
  { base: '#1f2937', light: '#3b4a5f', dark: '#0b1220' },
  { base: '#5b3a1e', light: '#8b5a2b', dark: '#2a1608' },
  { base: '#7a2e1d', light: '#b45309', dark: '#361007' },
  { base: '#6b7280', light: '#cbd5e1', dark: '#374151' },
  { base: '#b7791f', light: '#f2c94c', dark: '#5c3a07' },
];

const NPC_LOOKS: Record<string, NpcLookSpec> = {
  'npc-bit01': { skin: 0, hair: 3, eyes: '#3b6b8a' },
  'npc-ambar': { skin: 1, hair: 2, eyes: '#6b4423' },
  'npc-guardabosques-nilo': { skin: 2, hair: 1, eyes: '#3f6212' },
  'npc-eco-caverna': { skin: 3, hair: 0, eyes: '#4c1d95' },
  'npc-cartografo-isla': { skin: 1, hair: 1, eyes: '#7c2d12', beard: true },
  'npc-guardian-cumbre': { skin: 0, hair: 4, eyes: '#1e3a8a' },
  'npc-custodio-rodo': { skin: 2, hair: 0, eyes: '#1e40af' },
  'npc-operadora-nora': { skin: 1, hair: 2, eyes: '#9d174d' },
};

function resolveNpcLook(id: string): NpcLookSpec {
  const known = NPC_LOOKS[id];
  if (known) return known;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return {
    skin: h % NPC_SKIN_TONES.length,
    hair: (h >> 3) % NPC_HAIR_TONES.length,
    eyes: '#334155',
  };
}

/**
 * SPRITE DE PERSONAJES NO JUGABLES (NPCs) ESTILO GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO)
 * - Proporciones estándar GBA de 16×24 píxeles lógicos con contornos nítidos y paletas ricas
 * - Sombra de contacto en suelo con pies plantados: solo respira el tren superior
 * - Tonos de piel, cabello y ojos propios por aldeano para rostros diferenciados
 * - Rasgos faciales con mandíbula, orejas, cejas, iris, nariz y boca
 * - Ropa con hombros, pliegues, botonadura, puños y manos; accesorios de profesión
 * - Sombreros y atuendos personalizados según el rol de cada cronista, arqueólogo o explorador
 */
function drawGbaNpcSprite(
  ctx: CanvasRenderingContext2D,
  npc: IslandNpcSpec,
  elapsed: number,
  reducedMotion: boolean,
  animFrame4: number
): void {
  const look = resolveNpcLook(npc.id);
  const skin = NPC_SKIN_TONES[look.skin];
  const hair = NPC_HAIR_TONES[look.hair];

  // Respiración sutil de 1 píxel: los pies y las piernas permanecen plantados.
  const breath = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.6 + npc.x * 0.045));
  const x = Math.round(npc.x);
  const y = Math.round(npc.y);

  ctx.save();
  ctx.translate(x, y);

  // 1. Sombra de contacto en el suelo
  ctx.fillStyle = 'rgba(5, 8, 14, 0.18)';
  ctx.fillRect(-10, 3, 20, 3);
  ctx.fillStyle = 'rgba(5, 8, 14, 0.42)';
  ctx.fillRect(-8, 2, 16, 4);
  ctx.fillRect(-6, 1, 12, 6);

  // 2. Botas de explorador: suela oscura, empeine iluminado y cordones
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-7, 0, 6, 5);
  ctx.fillRect(2, 0, 6, 5);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-6, 1, 4, 4);
  ctx.fillRect(3, 1, 4, 4);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-6, 1, 4, 1);
  ctx.fillRect(3, 1, 4, 1);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-5, 2, 2, 1);
  ctx.fillRect(4, 2, 2, 1);

  // 3. Pantalones con rodilla marcada y costura central
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-7, -9, 14, 10);
  ctx.fillStyle = '#243449';
  ctx.fillRect(-6, -8, 5, 7);
  ctx.fillRect(1, -8, 5, 7);
  ctx.fillStyle = '#16202f';
  ctx.fillRect(-6, -4, 5, 2);
  ctx.fillRect(1, -4, 5, 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(-6, -8, 1, 4);
  ctx.fillRect(1, -8, 1, 4);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-1, -8, 2, 8);

  // 4. Cinturón de cuero con hebilla y bolsa
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-7, -11, 14, 3);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-6, -10, 12, 2);
  ctx.fillStyle = '#5b3a1e';
  ctx.fillRect(-6, -10, 12, 1);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-2, -11, 4, 3);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(-2, -11, 4, 1);

  // 5. Tronco y brazos: respiran con un desplazamiento superior de 1 píxel
  ctx.save();
  ctx.translate(0, breath);

  // Silueta con hombros redondeados y cintura
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-8, -21, 16, 12);
  ctx.fillRect(-9, -20, 1, 4);
  ctx.fillRect(8, -20, 1, 4);

  // Tela principal con volumen
  ctx.fillStyle = npc.palette.primary;
  ctx.fillRect(-7, -20, 14, 10);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(-7, -20, 5, 2);
  ctx.fillRect(-6, -18, 2, 4);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.fillRect(4, -20, 3, 10);
  ctx.fillRect(-7, -12, 14, 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.fillRect(-4, -17, 1, 4);
  ctx.fillRect(3, -16, 1, 4);

  // Camisa interior y cuello en V
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-5, -21, 10, 4);
  ctx.fillStyle = npc.palette.secondary;
  ctx.fillRect(-4, -20, 8, 3);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fillRect(-4, -20, 3, 1);
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-2, -20, 4, 2);
  ctx.fillRect(-1, -18, 2, 2);

  // Botonadura central
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.fillRect(0, -17, 1, 5);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(0, -16, 1, 1);
  ctx.fillRect(0, -13, 1, 1);

  // Mangas con puño y manos de piel
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-9, -19, 3, 9);
  ctx.fillRect(6, -19, 3, 9);
  ctx.fillStyle = npc.palette.primary;
  ctx.fillRect(-8, -18, 2, 5);
  ctx.fillRect(6, -18, 2, 5);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.fillRect(7, -18, 1, 5);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(-8, -18, 1, 2);
  ctx.fillStyle = npc.palette.secondary;
  ctx.fillRect(-8, -13, 2, 1);
  ctx.fillRect(6, -13, 2, 1);
  ctx.fillStyle = skin.base;
  ctx.fillRect(-8, -12, 2, 3);
  ctx.fillRect(6, -12, 2, 3);
  ctx.fillStyle = skin.shade;
  ctx.fillRect(-8, -10, 2, 1);
  ctx.fillRect(6, -10, 2, 1);
  ctx.fillStyle = skin.light;
  ctx.fillRect(-8, -12, 1, 1);
  ctx.fillRect(6, -12, 1, 1);

  // 6. Cabeza con mandíbula escalonada, orejas y sombreado facial
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-6, -30, 12, 9);
  ctx.fillRect(-5, -21, 10, 3);
  ctx.fillStyle = skin.base;
  ctx.fillRect(-5, -29, 10, 8);
  ctx.fillRect(-4, -21, 8, 2);
  ctx.fillStyle = skin.shade;
  ctx.fillRect(3, -29, 2, 8);
  ctx.fillRect(-4, -20, 2, 1);
  ctx.fillRect(2, -20, 2, 1);
  ctx.fillStyle = skin.light;
  ctx.fillRect(-5, -29, 3, 2);
  ctx.fillRect(-5, -23, 2, 2);
  // Orejas
  ctx.fillStyle = skin.shade;
  ctx.fillRect(-6, -26, 1, 3);
  ctx.fillRect(5, -26, 1, 3);

  // Cabello: casquete, flequillo escalonado y patillas
  ctx.fillStyle = hair.dark;
  ctx.fillRect(-5, -30, 10, 1);
  ctx.fillStyle = hair.base;
  ctx.fillRect(-5, -29, 10, 2);
  ctx.fillStyle = hair.light;
  ctx.fillRect(-4, -29, 4, 1);
  ctx.fillStyle = hair.base;
  ctx.fillRect(-5, -27, 3, 1);
  ctx.fillRect(-1, -27, 2, 1);
  ctx.fillRect(2, -27, 3, 1);
  ctx.fillStyle = hair.dark;
  ctx.fillRect(-5, -27, 1, 3);
  ctx.fillRect(4, -27, 1, 3);

  // Cejas, ojos con iris y destello, nariz y boca
  ctx.fillStyle = hair.dark;
  ctx.fillRect(-4, -26, 3, 1);
  ctx.fillRect(2, -26, 3, 1);
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-4, -25, 3, 2);
  ctx.fillRect(2, -25, 3, 2);
  ctx.fillStyle = look.eyes;
  ctx.fillRect(-3, -25, 1, 2);
  ctx.fillRect(3, -25, 1, 2);
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(-3, -24, 1, 1);
  ctx.fillRect(3, -24, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-4, -25, 1, 1);
  ctx.fillRect(2, -25, 1, 1);
  ctx.fillStyle = skin.shade;
  ctx.fillRect(0, -23, 1, 2);

  // Barba opcional del cartógrafo
  if (look.beard) {
    ctx.fillStyle = hair.base;
    ctx.fillRect(-4, -22, 8, 2);
    ctx.fillRect(-3, -20, 6, 1);
    ctx.fillStyle = hair.light;
    ctx.fillRect(-4, -22, 8, 1);
  }
  ctx.fillStyle = look.beard ? '#3f2418' : skin.shade;
  ctx.fillRect(-1, -21, 3, 1);
  if (!look.beard) {
    ctx.fillStyle = skin.deep;
    ctx.fillRect(0, -21, 1, 1);
  }

  // 7. Accesorios y tocados específicos según el rol del NPC
  if (npc.id === 'npc-bit01') {
    // Bit-01: Boina de erudito/cronista con vivo claro, pluma y monóculo
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -33, 16, 5);
    ctx.fillRect(-9, -31, 4, 3);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-7, -32, 14, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(-6, -32, 6, 1);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-1, -35, 2, 3);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-1, -35, 1, 2);
    // Sombra de la boina sobre la frente
    ctx.fillStyle = 'rgba(5, 8, 14, 0.35)';
    ctx.fillRect(-5, -28, 10, 1);
    // Monóculo dorado sobre el ojo derecho
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(2, -26, 3, 1);
    ctx.fillRect(2, -23, 3, 1);
    ctx.fillRect(1, -25, 1, 2);
    ctx.fillRect(5, -25, 1, 2);
    // Rollo de pergamino en bandolera
    ctx.fillStyle = '#070b14';
    ctx.fillRect(4, -16, 4, 8);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(5, -15, 2, 6);
    ctx.fillStyle = '#d6b25e';
    ctx.fillRect(5, -15, 2, 1);
    ctx.fillRect(5, -10, 2, 1);
  } else if (npc.id === 'npc-ambar') {
    // Ámbar: Sombrero de ala ancha de arqueóloga con cinta y libreta de campo
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-9, -30, 18, 4);
    ctx.fillRect(-6, -34, 12, 5);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-8, -29, 16, 2);
    ctx.fillRect(-5, -33, 10, 4);
    ctx.fillStyle = '#e8cf72';
    ctx.fillRect(-5, -30, 10, 1);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-5, -32, 10, 1);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(-5, -31, 10, 1);
    // Sombra del ala sobre el rostro
    ctx.fillStyle = 'rgba(5, 8, 14, 0.28)';
    ctx.fillRect(-5, -26, 10, 1);
    // Libreta de campo con cantos de papel
    ctx.fillStyle = '#070b14';
    ctx.fillRect(4, -15, 4, 4);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(5, -14, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(5, -14, 1, 1);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, -11, 1, 2);
  } else if (npc.id === 'npc-guardabosques-nilo') {
    // Nilo: Gorra de guardabosques con visera, insignia y cantimplora
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -32, 14, 5);
    ctx.fillRect(-8, -28, 7, 2);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-6, -31, 12, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillRect(-6, -31, 6, 1);
    ctx.fillStyle = '#4ca64c';
    ctx.fillRect(-8, -28, 6, 1);
    // Insignia de hoja
    ctx.fillStyle = '#86efac';
    ctx.fillRect(-1, -30, 2, 1);
    ctx.fillRect(0, -29, 1, 1);
    // Cantimplora al cinto
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -14, 4, 5);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-7, -13, 2, 3);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-7, -13, 1, 1);
  } else if (npc.id === 'npc-eco-caverna') {
    // Cuarzo: Casco de espeleólogo con lámpara frontal cian
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -33, 14, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -32, 12, 5);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-5, -32, 5, 2);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(2, -32, 4, 1);
    // Lámpara frontal con parpadeo
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-2, -31, 4, 4);
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#38bdf8' : '#00f3ff';
    ctx.fillRect(-1, -30, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -30, 1, 1);
    // Sombra del casco sobre los ojos
    ctx.fillStyle = 'rgba(5, 8, 14, 0.40)';
    ctx.fillRect(-5, -28, 10, 1);
  } else if (npc.id === 'npc-cartografo-isla') {
    // Cartógrafo del Caos: Capucha carmesí de viajero y estuche de mapas
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -32, 16, 6);
    ctx.fillRect(-8, -28, 3, 8);
    ctx.fillRect(5, -28, 3, 8);
    ctx.fillStyle = '#8c2d19';
    ctx.fillRect(-7, -31, 14, 5);
    ctx.fillRect(-7, -27, 2, 7);
    ctx.fillRect(5, -27, 2, 7);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-7, -31, 14, 1);
    ctx.fillStyle = 'rgba(5, 8, 14, 0.30)';
    ctx.fillRect(-5, -28, 10, 1);
    // Tubo porta-mapas a la espalda
    ctx.fillStyle = '#070b14';
    ctx.fillRect(5, -22, 4, 12);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(6, -21, 2, 10);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(6, -21, 2, 1);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(6, -14, 2, 1);
  } else if (npc.id === 'npc-custodio-rodo') {
    // Custodio Rodo: Casco con cresta, protector nasal y hombrera
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -33, 14, 6);
    ctx.fillRect(-8, -28, 2, 3);
    ctx.fillRect(6, -28, 2, 3);
    ctx.fillStyle = npc.palette.primary;
    ctx.fillRect(-6, -32, 12, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.fillRect(-6, -32, 6, 1);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-6, -29, 12, 1);
    // Cresta del casco
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-1, -35, 3, 3);
    ctx.fillStyle = npc.palette.glow;
    ctx.fillRect(0, -35, 1, 2);
    // Protector nasal
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-1, -28, 2, 2);
    // Hombrera izquierda
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-10, -20, 5, 5);
    ctx.fillStyle = npc.palette.primary;
    ctx.fillRect(-9, -19, 3, 3);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-9, -19, 3, 1);
  } else if (npc.id === 'npc-operadora-nora') {
    // Operadora Nora: coleta, diadema con auriculares y micrófono
    ctx.fillStyle = hair.dark;
    ctx.fillRect(5, -28, 4, 8);
    ctx.fillStyle = hair.base;
    ctx.fillRect(6, -27, 2, 6);
    ctx.fillStyle = hair.light;
    ctx.fillRect(6, -27, 1, 3);
    // Diadema
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-6, -30, 12, 2);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-6, -30, 12, 1);
    // Auriculares
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -27, 3, 5);
    ctx.fillRect(5, -27, 3, 5);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-6, -26, 2, 3);
    ctx.fillRect(5, -26, 2, 3);
    // Micrófono frente al rostro
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-5, -24, 2, 1);
    ctx.fillRect(-4, -23, 2, 1);
    ctx.fillRect(-3, -22, 2, 2);
    ctx.fillStyle = npc.palette.glow;
    ctx.fillRect(-3, -22, 1, 1);
    // Aro luminoso de los auriculares
    ctx.fillStyle = npc.palette.glow;
    ctx.fillRect(-6, -25, 1, 1);
    ctx.fillRect(5, -25, 1, 1);
  } else {
    // Vigía del Cráter: gorro de montaña con pompón y bufanda al cuello
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-7, -32, 14, 6);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-6, -31, 12, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillRect(-6, -31, 5, 1);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-1, -35, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -34, 1, 1);
    // Bufanda enrollada al cuello con caída lateral
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-6, -20, 12, 4);
    ctx.fillRect(4, -17, 3, 6);
    ctx.fillStyle = npc.palette.secondary;
    ctx.fillRect(-5, -19, 10, 3);
    ctx.fillRect(5, -16, 2, 5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.fillRect(-5, -19, 8, 1);
  }

  ctx.restore();
  ctx.restore();
}

/**
 * BOCA DE CAVERNA BOREAL ESTILO GBA RPG
 * - Pared rocosa de montaña con estratos geológicos, bloques de piedra biselados y sombras profundas
 * - Cavidad en arco natural que conduce a la oscuridad interior con peldaños de piedra labrada
 * - Cornisa superior con vegetación alpina y carámbanos/líquenes
 * - Cristales rúnicos luminosos en las jambas que pulsan con la tonalidad mística de la cueva
 */
function drawGbaNorthCaveEntrance(
  ctx: CanvasRenderingContext2D,
  entrance: IslandCaveEntranceSpec,
  elapsed: number
): void {
  const x = Math.round(entrance.x);
  const y = Math.round(entrance.y);

  ctx.save();
  ctx.translate(x, y);

  // 1. Sombra de contacto en la base
  ctx.fillStyle = 'rgba(5, 8, 14, 0.48)';
  ctx.fillRect(-36, 6, 72, 8);

  // 2. Bloque rocoso de montaña circundante (silueta exterior)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-36, -42, 72, 48);
  ctx.fillRect(-28, -48, 56, 8);
  ctx.fillRect(-18, -52, 36, 6);

  // 3. Estratos de piedra de montaña (grises azulados y pizarras)
  ctx.fillStyle = '#334155';
  ctx.fillRect(-34, -40, 68, 44);
  ctx.fillRect(-26, -46, 52, 8);
  ctx.fillRect(-16, -50, 32, 6);

  // Facetas iluminadas en la cornisa superior e izquierda
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-34, -40, 6, 38);
  ctx.fillRect(-26, -46, 14, 6);
  ctx.fillRect(-16, -50, 12, 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-24, -45, 8, 2);
  ctx.fillRect(-14, -49, 8, 2);

  // Facetas en sombra profunda en el lateral derecho
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(26, -40, 8, 42);
  ctx.fillRect(18, -46, 8, 6);

  // 4. Salientes de roca y líquenes alpinos en la cornisa
  ctx.fillStyle = '#15803d';
  ctx.fillRect(-22, -48, 14, 4);
  ctx.fillRect(4, -46, 16, 4);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(-20, -48, 10, 2);
  ctx.fillRect(6, -46, 12, 2);

  // 5. Boca de la caverna (arco de oscuridad profunda con degradado hacia el interior)
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-20, -26, 40, 32);
  ctx.fillRect(-16, -32, 32, 8);
  ctx.fillRect(-10, -36, 20, 6);

  // Interior tenebroso de la gruta
  ctx.fillStyle = '#020408';
  ctx.fillRect(-18, -24, 36, 30);
  ctx.fillRect(-14, -30, 28, 8);
  ctx.fillRect(-8, -34, 16, 6);

  // Peldaños de piedra labrada que descienden hacia la penumbra
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-14, -6, 28, 4);
  ctx.fillRect(-12, -1, 24, 4);
  ctx.fillRect(-10, 4, 20, 3);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-14, -6, 28, 1);
  ctx.fillRect(-12, -1, 24, 1);
  ctx.fillRect(-10, 4, 20, 1);

  // Estalactitas de roca que cuelgan del dintel
  ctx.fillStyle = '#475569';
  ctx.fillRect(-12, -30, 4, 6);
  ctx.fillRect(8, -30, 4, 8);
  ctx.fillRect(-2, -33, 4, 5);

  // 6. Cristales rúnicos o gemas guardianas que titilan a los lados de la entrada
  const pulseR = Math.sin(elapsed * 3) * 0.2 + 0.8;
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-26, -26, 6, 12);
  ctx.fillRect(20, -26, 6, 12);

  ctx.fillStyle = entrance.accentHex;
  ctx.fillRect(-25, -25, 4, 10);
  ctx.fillRect(21, -25, 4, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-24, -24, 2, 3);
  ctx.fillRect(22, -24, 2, 3);

  // Halo luminoso sutil en el umbral
  ctx.fillStyle = `rgba(103, 232, 249, ${0.12 * pulseR})`;
  ctx.fillRect(-16, -2, 32, 8);

  ctx.restore();
}

/**
 * SUPERFICIES NATURALES Y ARQUEOLÓGICAS ESTILO GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO / VERDE HOJA)
 * - Césped con parches armónicos, penachos de hierba de 3 briznas, flores silvestres de 4 pétalos y tréboles.
 * - Arena con ondulaciones eólicas, conchas marinas, guijarros pulidos y charcos cristalinos.
 * - Losas de piedra con biseles de luz/sombra, juntas de mortero y musgo rastrero.
 * - Puentes y muelles de madera noble con vetas, clavos de forja y aristas trabajadas.
 * - Basalto volcánico con fisuras magmáticas incandescentes.
 */
function drawGbcWalkableSurfaceTile(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  wx: number,
  wy: number,
  surface: WalkableRect['surface'],
  zoneId: IslandZoneId,
  animFrame4: number
): void {
  const h = hashTile(tx, ty);

  if (surface === 'sand') {
    // ----------------------------------------------------
    // ARENA DE PLAYA DORADA GBA (COSTA DEL DESPERTAR)
    // ----------------------------------------------------
    // Base uniforme: el volumen lo aporta el lavado de suelo por sector, así
    // que no aparece una cuadrícula de 32 px.
    ctx.fillStyle = '#e3c780';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Grano de arena anclado a coordenadas de mundo (continúa entre celdas).
    for (let gy = wy + (h & 3); gy < wy + CELL; gy += 8) {
      for (let gx = wx + ((h >> 4) & 3); gx < wx + CELL; gx += 8) {
        const th = hashTile(gx, gy) % 100;
        if (th < 62) continue;
        ctx.fillStyle = th > 86 ? 'rgba(253, 243, 208, 0.5)' : 'rgba(170, 132, 74, 0.28)';
        ctx.fillRect(gx, gy, 1, 1);
      }
    }

    // Pequeños guijarros costeros y conchas marinas
    if (h % 13 === 0) {
      // Concha marina rosada/blanca
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx + 7 + (h % 16), wy + 8 + ((h >> 3) % 16), 2, 2);
      ctx.fillStyle = '#fecdd3';
      ctx.fillRect(wx + 8 + (h % 16), wy + 8 + ((h >> 3) % 16), 1, 1);
    }
    if (h % 6 === 2) {
      // Guijarro gris de playa redondeado
      ctx.fillStyle = '#64748b';
      ctx.fillRect(wx + 18, wy + 16, 3, 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(wx + 18, wy + 16, 2, 1);
    }
    if (h % 41 === 5) {
      // Juncos de mar / mata costera
      ctx.fillStyle = '#5c4028';
      ctx.fillRect(wx + 10, wy + 20, 10, 2);
      ctx.fillStyle = '#65a30d';
      ctx.fillRect(wx + 20, wy + 12, 2, 10);
      ctx.fillRect(wx + 23, wy + 14, 2, 8);
      ctx.fillStyle = '#a3e635';
      ctx.fillRect(wx + 20, wy + 12, 1, 4);
    } else if (h % 17 === 0) {
      // Charco mareal cristalino con borde orgánico y reflejo del cielo
      const px = wx + 7;
      const py = wy + 9;
      ctx.fillStyle = '#0f4a5c';
      ctx.fillRect(px + 2, py, 11, 1);
      ctx.fillRect(px, py + 2, 15, 7);
      ctx.fillRect(px + 2, py + 9, 11, 1);
      ctx.fillStyle = '#1e627d';
      ctx.fillRect(px + 2, py + 1, 11, 8);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(px + 2, py + 2, 11, 6);
      ctx.fillStyle = '#7dd3fc';
      ctx.fillRect(px + 3, py + 2, 7, 2);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(px + 4, py + 3, 4, 1);
      ctx.fillRect(px + 9, py + 5, 2, 1);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(px + 5, py + 7, 3, 1);
    }
    if (h % 19 === 4) {
      // Estrella de mar coral sobre la arena seca
      const sx = wx + 6 + ((h >> 5) % 18);
      const sy = wy + 6 + ((h >> 9) % 18);
      ctx.fillStyle = '#9f1239';
      ctx.fillRect(sx, sy - 1, 2, 2);
      ctx.fillRect(sx - 1, sy, 4, 1);
      ctx.fillRect(sx, sy + 1, 2, 2);
      ctx.fillStyle = '#fb7185';
      ctx.fillRect(sx, sy, 1, 1);
      ctx.fillRect(sx + 1, sy - 1, 1, 1);
      ctx.fillRect(sx - 1, sy, 1, 1);
      ctx.fillStyle = '#fecdd3';
      ctx.fillRect(sx, sy, 1, 1);
    }
    if (h % 23 === 6) {
      // Astilla de madera arrastrada por la marea
      const dx = wx + 4 + ((h >> 7) % 18);
      const dy = wy + 12 + ((h >> 12) % 12);
      ctx.fillStyle = '#6b4a24';
      ctx.fillRect(dx, dy + 1, 6, 1);
      ctx.fillStyle = '#a87944';
      ctx.fillRect(dx + 1, dy, 5, 1);
      ctx.fillStyle = '#d8be88';
      ctx.fillRect(dx + 2, dy, 2, 1);
    }
    return;
  }

  if (surface === 'cobble') {
    // Empedrado irregular de patio: cantos redondeados, mortero oscuro y musgo.
    const isRuins = zoneId === 'ruinas-primer-arcade';
    ctx.fillStyle = isRuins ? '#3a414c' : '#5a4a36';
    ctx.fillRect(wx, wy, CELL, CELL);

    const palettes = isRuins
      ? ['#8b96a4', '#9aa6b4', '#7c8794', '#a8b3c0', '#6f7a88']
      : ['#cbb48a', '#d8c49a', '#bba67a', '#e4d4ae', '#a8946c'];
    const hi = isRuins ? '#dbe4ee' : '#f4ead0';
    const sh = isRuins ? '#556070' : '#8a734c';

    for (let row = 0; row < 4; row++) {
      const odd = row % 2;
      for (let col = 0; col < 4; col++) {
        const th = hashTile(wx + col * 9 + odd * 3, wy + row * 8);
        const px = wx + col * 8 + (odd ? 3 : 0) + (th % 2);
        const py = wy + row * 8 + ((th >> 3) % 2);
        const pw = 7 + (th % 3);
        const ph = 6 + ((th >> 4) % 3);
        if (px + 2 >= wx + CELL || py + 2 >= wy + CELL) continue;
        const clippedW = Math.min(pw, wx + CELL - px - 1);
        const clippedH = Math.min(ph, wy + CELL - py - 1);
        if (clippedW < 3 || clippedH < 3) continue;
        ctx.fillStyle = palettes[th % palettes.length];
        ctx.fillRect(px, py, clippedW, clippedH);
        ctx.fillStyle = hi;
        ctx.fillRect(px + 1, py, Math.max(1, clippedW - 3), 1);
        ctx.fillRect(px, py + 1, 1, Math.max(1, clippedH - 2));
        ctx.fillStyle = sh;
        ctx.fillRect(px + 1, py + clippedH - 1, Math.max(1, clippedW - 1), 1);
        ctx.fillRect(px + clippedW - 1, py + 1, 1, Math.max(1, clippedH - 2));
        if (th % 7 === 0) {
          ctx.fillStyle = sh;
          ctx.fillRect(px + 2, py + 2, 2, 1);
        }
      }
    }

    if (isRuins) {
      if (h % 5 === 0) {
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(wx + 15, wy + 4, 2, 8);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(wx + 8, wy + 15, 16, 2);
      }
    } else if (h % 4 === 0) {
      ctx.fillStyle = '#2d6d34';
      ctx.fillRect(wx + 14, wy + 14, 4, 3);
      ctx.fillStyle = '#65ad4d';
      ctx.fillRect(wx + 15, wy + 14, 2, 2);
    }
    if (h % 11 === 2) {
      ctx.fillStyle = isRuins ? 'rgba(20, 24, 32, 0.28)' : 'rgba(40, 28, 14, 0.22)';
      ctx.fillRect(wx + 6, wy + 20, 12, 2);
    }
    return;
  }

  if (surface === 'grass' || surface === 'circuit' || surface === 'secret-grass') {
    // ----------------------------------------------------
    // CÉSPED CON VOLUMEN Y MICRO-DETALLE GBA RPG (POKÉMON ESMERALDA / ROJO FUEGO)
    // ----------------------------------------------------
    const isForest = zoneId === 'bosque-circuitos';
    const isSecret = surface === 'secret-grass';
    const isCircuit = surface === 'circuit';

    // Macro-parches armónicos de 2×2 baldosas para evitar ruido aleatorio
    const macroX = Math.floor(tx / 2);
    const macroY = Math.floor(ty / 2);
    const patch = (macroX * 3 + macroY * 7 + (h & 1)) % 4;

    // Paletas GBA de césped
    let grassBase = '#3f9440';
    let grassDark = '#2f7c33';
    let grassLight = '#4fae4c';
    let tuftTip = '#7ad463';
    let tuftShadow = '#226a27';

    if (isForest) {
      grassBase = patch === 0 ? '#1b5a38' : patch === 1 ? '#206841' : '#1d5f3c';
      grassDark = '#144429';
      grassLight = '#2b7e52';
      tuftTip = '#48be7c';
      tuftShadow = '#0d321d';
    } else if (isSecret) {
      grassBase = '#1c634a';
      grassDark = '#124835';
      grassLight = '#2a7c5e';
      tuftTip = '#4ade80';
      tuftShadow = '#0d3627';
    } else {
      grassBase = '#3e913d';
      grassDark = '#2f7c33';
      grassLight = '#55b350';
      tuftTip = '#7ad463';
      tuftShadow = '#226a27';
    }

    // 1. Fondo de césped
    ctx.fillStyle = grassBase;
    ctx.fillRect(wx, wy, CELL, CELL);

    // 2. Manchas orgánicas de luz y sombra (formas recortadas, nunca bandas
    //    alineadas al borde de la celda).
    const dapX = wx + 3 + ((h >> 6) % 13);
    const dapY = wy + 3 + ((h >> 11) % 13);
    const lit = (h >> 3) % 3 === 0;
    ctx.fillStyle = lit ? 'rgba(136, 204, 104, 0.26)' : 'rgba(22, 80, 34, 0.22)';
    ctx.fillRect(dapX, dapY, 12, 3);
    ctx.fillRect(dapX + 3, dapY - 1, 6, 1);
    ctx.fillStyle = lit ? 'rgba(168, 226, 126, 0.18)' : 'rgba(14, 58, 26, 0.17)';
    ctx.fillRect(dapX + 2, dapY + 3, 7, 2);

    // Motas de hoja y sombras pequeñas: variación cromática legible sin ruido de píxel.
    const fleckX = 3 + ((h >> 8) % 25);
    const fleckY = 3 + ((h >> 13) % 25);
    ctx.fillStyle = grassDark;
    ctx.fillRect(wx + fleckX, wy + fleckY, 3 + (h % 3), 1);
    ctx.fillRect(wx + ((fleckX + 13) % 29), wy + ((fleckY + 9) % 29), 2, 2);
    ctx.fillStyle = grassLight;
    ctx.fillRect(wx + ((fleckX + 7) % 29), wy + ((fleckY + 16) % 29), 2, 1);

    // 3. Penachos de hierba GBA auténticos de 3 briznas (izquierda, centro alta, derecha)
    const drawGrassTuft = (gx: number, gy: number) => {
      // Sombra en la base
      ctx.fillStyle = tuftShadow;
      ctx.fillRect(gx - 1, gy + 3, 5, 1);
      // Brizna central (más alta)
      ctx.fillStyle = tuftTip;
      ctx.fillRect(gx + 1, gy, 1, 4);
      // Brizna izquierda
      ctx.fillRect(gx, gy + 1, 1, 3);
      // Brizna derecha
      ctx.fillRect(gx + 2, gy + 1, 1, 3);
      // Reflejo en la punta
      ctx.fillStyle = isForest ? '#86efac' : '#bbf78a';
      ctx.fillRect(gx + 1, gy, 1, 1);
    };

    // Penacho 1 fijo por hash
    drawGrassTuft(wx + 6 + (h % 7), wy + 6 + ((h >> 2) % 6));
    // Penacho 2 en el cuadrante inferior
    if ((h & 3) !== 0) {
      drawGrassTuft(wx + 18 + ((h >> 4) % 8), wy + 18 + ((h >> 6) % 7));
    }
    if ((h & 7) === 3) {
      const sprigX = wx + 10 + ((h >> 9) % 12);
      const sprigY = wy + 10 + ((h >> 14) % 12);
      ctx.fillStyle = tuftShadow;
      ctx.fillRect(sprigX, sprigY + 3, 6, 1);
      ctx.fillStyle = tuftTip;
      ctx.fillRect(sprigX + 1, sprigY + 1, 1, 2);
      ctx.fillRect(sprigX + 3, sprigY, 1, 3);
      ctx.fillRect(sprigX + 5, sprigY + 1, 1, 2);
      ctx.fillStyle = isForest ? '#a7f3d0' : '#d9f99d';
      ctx.fillRect(sprigX + 3, sprigY, 1, 1);
    }

    // 4. Flores silvestres de 4 pétalos (margaritas, dientes de león, amapolas)
    if (!isForest && !isSecret && (h % 19 === 1 || h % 31 === 9)) {
      const fx = wx + 8 + ((h >> 3) % 16);
      const fy = wy + 8 + ((h >> 5) % 14);
      const flowerKind = (h >> 2) % 3;
      const petalCol = flowerKind === 0 ? '#fef08a' : flowerKind === 1 ? '#fb7185' : '#f8fafc';
      const centerCol = flowerKind === 1 ? '#9f1239' : '#f59e0b';

      // Tallo verde
      ctx.fillStyle = '#226027';
      ctx.fillRect(fx + 1, fy + 3, 1, 3);

      // 4 pétalos
      ctx.fillStyle = petalCol;
      ctx.fillRect(fx, fy + 1, 3, 1);
      ctx.fillRect(fx + 1, fy, 1, 3);
      // Centro
      ctx.fillStyle = centerCol;
      ctx.fillRect(fx + 1, fy + 1, 1, 1);
    }

    // 4B. Tréboles, hojas caídas y rocío: riqueza de suelo en toda la isla
    if ((h & 15) === 5) {
      const clx = wx + 6 + ((h >> 6) % 18);
      const cly = wy + 6 + ((h >> 10) % 18);
      ctx.fillStyle = tuftShadow;
      ctx.fillRect(clx - 1, cly + 3, 4, 1);
      ctx.fillStyle = isForest ? '#3fae6c' : '#4f9e3f';
      ctx.fillRect(clx, cly, 1, 2);
      ctx.fillRect(clx - 2, cly + 1, 2, 2);
      ctx.fillRect(clx + 1, cly + 1, 2, 2);
      ctx.fillStyle = tuftTip;
      ctx.fillRect(clx - 2, cly + 1, 1, 1);
      ctx.fillRect(clx + 2, cly + 1, 1, 1);
      ctx.fillRect(clx, cly, 1, 1);
    }
    if (!isForest && (h & 31) === 9) {
      const lx = wx + 5 + ((h >> 7) % 20);
      const ly = wy + 8 + ((h >> 13) % 16);
      ctx.fillStyle = '#7c4a16';
      ctx.fillRect(lx, ly + 1, 5, 1);
      ctx.fillStyle = '#c98a25';
      ctx.fillRect(lx + 1, ly, 4, 1);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(lx + 2, ly, 2, 1);
    }
    if ((h & 63) === 21) {
      const dx = wx + 6 + ((h >> 9) % 20);
      const dy = wy + 7 + ((h >> 15) % 18);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(dx, dy, 1, 1);
      ctx.fillStyle = 'rgba(224, 242, 254, 0.32)';
      ctx.fillRect(dx + 1, dy + 1, 1, 1);
    }

    // 5. Trazas arqueológicas enterradas bajo el musgo (Bosque de Circuitos)
    if (isCircuit && h % 5 === 0) {
      ctx.fillStyle = '#0f3824';
      ctx.fillRect(wx + 4, wy + 23, 24, 5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(wx + 5, wy + 24, 22, 3);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#2dd4bf' : '#06b6d4';
      ctx.fillRect(wx + 8, wy + 25, 16, 1);
      // Micro-nodo
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wx + 6, wy + 24, 2, 2);
      ctx.fillRect(wx + 22, wy + 24, 2, 2);
    }

    // 6. Setas bioluminiscentes en el bosque profundo
    if (isForest && h % 9 === 0) {
      const mx = wx + 12;
      const my = wy + 14;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(mx + 2, my + 3, 2, 4);
      ctx.fillStyle = h % 2 === 0 ? '#38bdf8' : '#c084fc';
      ctx.fillRect(mx, my, 6, 3);
      ctx.fillRect(mx + 1, my - 1, 4, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx + 2, my, 1, 1);
      ctx.fillRect(mx + 4, my + 1, 1, 1);
    } else if (isSecret && h % 4 === 0) {
      // Destellos feéricos en el claro oculto
      ctx.fillStyle = '#5eead4';
      ctx.fillRect(wx + 14, wy + 14, 2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx + 15, wy + 15, 1, 1);
    }
    return;
  }

  if (surface === 'fortress') {
    // ----------------------------------------------------
    // BASALTO VOLCÁNICO Y FISURAS DE LAVA (BASTIÓN DE LAS OLEADAS)
    // ----------------------------------------------------
    ctx.fillStyle = (h & 1) === 0 ? '#32242c' : '#3c2b35';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Juntas de mortero basáltico oscuro
    ctx.fillStyle = '#1c1318';
    ctx.fillRect(wx, wy + 15, CELL, 1);
    ctx.fillRect(wx + 15, wy, 1, CELL);

    // Caras de roca ígnea
    ctx.fillStyle = '#513b48';
    ctx.fillRect(wx + 2, wy + 2, 11, 2);
    ctx.fillRect(wx + 18, wy + 18, 11, 2);
    ctx.fillStyle = '#24171f';
    ctx.fillRect(wx + 2, wy + 13, 11, 2);
    ctx.fillRect(wx + 18, wy + 29, 11, 2);

    // Grieta de magma pulsante
    if (h % 5 === 0) {
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#ef4444' : '#f97316';
      ctx.fillRect(wx + 8, wy + 14, 14, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wx + 12, wy + 14, 6, 1);
    }
    return;
  }

  if (surface === 'crystal') {
    // ----------------------------------------------------
    // LECHO DE CRISTAL VECTORIAL ARCANO
    // ----------------------------------------------------
    ctx.fillStyle = (h & 1) === 0 ? '#221b33' : '#28203c';
    ctx.fillRect(wx, wy, CELL, CELL);
    ctx.fillStyle = '#140f22';
    ctx.fillRect(wx + 15, wy, 1, CELL);
    ctx.fillRect(wx, wy + 15, CELL, 1);

    // Facetas de cuarzo reflectante
    ctx.fillStyle = '#4c3f73';
    ctx.fillRect(wx + 3, wy + 3, 10, 10);
    ctx.fillRect(wx + 19, wy + 19, 10, 10);
    ctx.fillStyle = '#818cf8';
    ctx.fillRect(wx + 4, wy + 4, 3, 3);
    ctx.fillRect(wx + 20, wy + 20, 3, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 4, wy + 4, 1, 1);
    ctx.fillRect(wx + 20, wy + 20, 1, 1);
    return;
  }

  if (surface === 'pier') {
    // ----------------------------------------------------
    // MUELLE DE TABLAS DE MADERA PORTUARIA
    // ----------------------------------------------------
    ctx.fillStyle = '#8f5c2c';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Juntas entre maderos y clavos de hierro
    ctx.fillStyle = '#4a2c12';
    for (let py = 0; py < CELL; py += 8) {
      ctx.fillRect(wx, wy + py, CELL, 2);
      // Clavos cuadrados de forja
      ctx.fillStyle = '#1f1308';
      ctx.fillRect(wx + 3, wy + py + 3, 2, 2);
      ctx.fillRect(wx + CELL - 5, wy + py + 3, 2, 2);
      ctx.fillStyle = '#4a2c12';
    }
    // Veta clara iluminada de las tablas
    ctx.fillStyle = '#b87c42';
    ctx.fillRect(wx + 5, wy + 2, 20, 1);
    ctx.fillRect(wx + 6, wy + 10, 18, 1);
    ctx.fillRect(wx + 4, wy + 18, 22, 1);
    ctx.fillRect(wx + 8, wy + 26, 16, 1);
    return;
  }

  if (surface === 'bridge') {
    // ----------------------------------------------------
    // PUENTE COLGANTE DE MADERA CON BARANDILLAS
    // ----------------------------------------------------
    ctx.fillStyle = '#a66e35';
    ctx.fillRect(wx, wy, CELL, CELL);

    // Tablas transversales
    ctx.fillStyle = '#45260c';
    for (let bx = 0; bx < CELL; bx += 8) {
      ctx.fillRect(wx + bx, wy, 2, CELL);
    }
    // Resaltes superiores e inferiores de la madera
    ctx.fillStyle = '#d49b5c';
    ctx.fillRect(wx, wy + 4, CELL, 2);
    ctx.fillRect(wx, wy + CELL - 6, CELL, 2);

    // Vigas guía de sujeción
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(wx, wy, CELL, 3);
    ctx.fillRect(wx, wy + CELL - 3, CELL, 3);
    return;
  }

  // 'stone' — Terrazas y miradores tallados en roca antigua
  const stoneMortar = '#4a5563';
  ctx.fillStyle = stoneMortar;
  ctx.fillRect(wx, wy, CELL, CELL);

  const slabFace = ['#7c8898', '#74808f', '#828e9e'];
  const slabHi = '#b6c2d1';
  const slabShadow = '#4d5968';
  const slabDeep = '#3f4a58';

  const drawSlab = (px: number, py: number, pw: number, ph: number, v: number) => {
    ctx.fillStyle = slabFace[v % 3];
    ctx.fillRect(px, py, pw, ph);
    // Bisel iluminado al noroeste y sombra al sureste
    ctx.fillStyle = slabHi;
    ctx.fillRect(px, py, pw, 1);
    ctx.fillRect(px, py, 1, ph);
    ctx.fillStyle = slabShadow;
    ctx.fillRect(px, py + ph - 1, pw, 1);
    ctx.fillRect(px + pw - 1, py, 1, ph);
    // Desconchado de esquina en algunas lajas
    if (v % 4 === 0) {
      ctx.fillStyle = stoneMortar;
      ctx.fillRect(px + pw - 2, py, 2, 1);
      ctx.fillRect(px, py + ph - 2, 1, 2);
    }
    // Fisuras finas y veta interna
    if (v % 3 === 0) {
      ctx.fillStyle = slabDeep;
      ctx.fillRect(px + 4, py + 5, 4, 1);
      ctx.fillRect(px + 7, py + 6, 1, 3);
      ctx.fillStyle = slabHi;
      ctx.fillRect(px + 3, py + 3, 2, 1);
    }
  };

  const stoneLayout = (h >> 8) % 3;
  if (stoneLayout === 0) {
    drawSlab(wx + 1, wy + 1, 14, 14, h);
    drawSlab(wx + 17, wy + 1, 14, 14, h >> 2);
    drawSlab(wx + 1, wy + 17, 14, 14, h >> 4);
    drawSlab(wx + 17, wy + 17, 14, 14, h >> 6);
  } else if (stoneLayout === 1) {
    drawSlab(wx + 1, wy + 1, 14, 30, h >> 1);
    drawSlab(wx + 17, wy + 1, 14, 30, h >> 5);
  } else {
    drawSlab(wx + 1, wy + 1, 30, 14, h >> 2);
    drawSlab(wx + 1, wy + 17, 14, 14, h >> 4);
    drawSlab(wx + 17, wy + 17, 14, 14, h >> 7);
  }

  // Liquen y humedad en las terrazas de piedra
  if (h % 11 === 4) {
    ctx.fillStyle = 'rgba(95, 122, 74, 0.8)';
    ctx.fillRect(wx + 5 + ((h >> 7) % 20), wy + 19 + ((h >> 12) % 8), 4, 1);
    ctx.fillStyle = 'rgba(138, 168, 106, 0.9)';
    ctx.fillRect(wx + 6 + ((h >> 7) % 20), wy + 19 + ((h >> 12) % 8), 1, 1);
  }
}

/**
 * SENDEROS ORGÁNICOS DE TIERRA APISONADA Y ESCALINATAS TALLADAS ESTILO GBA RPG
 * - Bordes orgánicos irregulares con flequillos de hierba que muerden la tierra.
 * - Degradado natural de tierra batida: borde de tránsito oscuro, cuerpo de arcilla y centro arenoso claro.
 * - Guijarros y piedras incrustadas a lo largo de las rutas.
 * - Escalinatas con relieve 3D: parapetos laterales de contención, huellas iluminadas y tabicas en sombra.
 */
function drawHandcraftedPathsAndStairs(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  const drawGbaPathSegment = (
    pts: [number, number][],
    coreHex: string,
    bodyHex: string,
    edgeHex: string
  ) => {
    const width = 26;

    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const horizontal = y0 === y1;
      const x = horizontal ? Math.min(x0, x1) - width / 2 : x0 - width / 2;
      const y = horizontal ? y0 - width / 2 : Math.min(y0, y1) - width / 2;
      const segmentWidth = horizontal ? Math.abs(x1 - x0) + width : width;
      const segmentHeight = horizontal ? width : Math.abs(y1 - y0) + width;

      if (!isWorldBoxVisible(x - 8, y - 8, segmentWidth + 16, segmentHeight + 16, camX, camY, vw, vh)) {
        continue;
      }

      // 1. Capa exterior de tierra húmeda de borde (28 px de ancho)
      ctx.fillStyle = edgeHex;
      ctx.fillRect(x - 1, y - 1, segmentWidth + 2, segmentHeight + 2);

      // 2. Cuerpo de arcilla apisonada (24 px de ancho)
      ctx.fillStyle = bodyHex;
      ctx.fillRect(x + 1, y + 1, segmentWidth - 2, segmentHeight - 2);

      // 3. Huella central más clara y desgastada por el paso (14 px de ancho)
      ctx.fillStyle = coreHex;
      if (horizontal) {
        ctx.fillRect(x + 2, y + 6, segmentWidth - 4, width - 12);
      } else {
        ctx.fillRect(x + 6, y + 2, width - 12, segmentHeight - 4);
      }

      // 3B. Textura de tierra: vetas, motas y doble surco de carreta
      if (horizontal) {
        ctx.fillStyle = 'rgba(139, 104, 55, 0.32)';
        ctx.fillRect(x + 10, y + 10, segmentWidth - 20, 1);
        ctx.fillRect(x + 10, y + width - 11, segmentWidth - 20, 1);
        for (let mx = x + 9; mx < x + segmentWidth - 9; mx += 13) {
          const seed = Math.abs(Math.sin(mx * 0.31 + y * 0.07));
          if (seed < 0.34) continue;
          ctx.fillStyle = seed > 0.66 ? '#b08a4e' : '#d9bb80';
          ctx.fillRect(mx + Math.round(seed * 3), y + 8 + Math.round(seed * 10), 2, 1);
        }
      } else {
        ctx.fillStyle = 'rgba(139, 104, 55, 0.32)';
        ctx.fillRect(x + 10, y + 10, 1, segmentHeight - 20);
        ctx.fillRect(x + width - 11, y + 10, 1, segmentHeight - 20);
        for (let my = y + 9; my < y + segmentHeight - 9; my += 13) {
          const seed = Math.abs(Math.sin(my * 0.31 + x * 0.07));
          if (seed < 0.34) continue;
          ctx.fillStyle = seed > 0.66 ? '#b08a4e' : '#d9bb80';
          ctx.fillRect(x + 8 + Math.round(seed * 10), my + Math.round(seed * 3), 1, 2);
        }
      }

      // Borde tallado y sombra de pisada para separar el camino del césped con píxeles nítidos.
      ctx.fillStyle = '#6f4928';
      if (horizontal) {
        ctx.fillRect(x + 2, y + segmentHeight - 3, segmentWidth - 4, 2);
        ctx.fillStyle = '#e8c982';
        ctx.fillRect(x + 2, y + 2, segmentWidth - 4, 1);
      } else {
        ctx.fillRect(x + segmentWidth - 3, y + 2, 2, segmentHeight - 4);
        ctx.fillStyle = '#e8c982';
        ctx.fillRect(x + 2, y + 2, 1, segmentHeight - 4);
      }

      // 4. Flequillos de hierba orgánicos en los bordes para eliminar la línea recta artificial
      const grassGreen = '#42a344';
      ctx.fillStyle = grassGreen;
      if (horizontal) {
        for (let fx = x; fx < x + segmentWidth - 6; fx += 8) {
          const tooth = Math.round(Math.abs(Math.sin(fx * 0.17)) * 4);
          // Dientes de hierba arriba y abajo
          ctx.fillRect(fx, y - 1, 3, tooth);
          ctx.fillRect(fx + 4, y + segmentHeight - tooth, 3, tooth + 1);
        }
      } else {
        for (let fy = y; fy < y + segmentHeight - 6; fy += 8) {
          const tooth = Math.round(Math.abs(Math.sin(fy * 0.17)) * 4);
          // Dientes de hierba izquierda y derecha
          ctx.fillRect(x - 1, fy, tooth, 3);
          ctx.fillRect(x + segmentWidth - tooth, fy + 4, tooth + 1, 3);
        }
      }

      // 5. Pequeños guijarros incrustados a lo largo del sendero
      ctx.fillStyle = '#f5eedb';
      if (horizontal) {
        for (let px = x + 12; px < x + segmentWidth - 12; px += 36) {
          ctx.fillRect(px, y + 9, 3, 2);
          ctx.fillStyle = '#7a5a30';
          ctx.fillRect(px, y + 11, 3, 1);
          ctx.fillStyle = '#f5eedb';
        }
      } else {
        for (let py = y + 12; py < y + segmentHeight - 12; py += 36) {
          ctx.fillRect(x + 9, py, 2, 3);
          ctx.fillStyle = '#7a5a30';
          ctx.fillRect(x + 9, py + 3, 2, 1);
          ctx.fillStyle = '#f5eedb';
        }
      }
    }
  };

  // 1. Senderos de la Aldea de los Orígenes (tierra ocre dorada de pueblo GBA)
  drawGbaPathSegment(
    [
      [416, 1760],
      [560, 1760],
      [560, 1808],
      [688, 1808],
      [688, 1856],
      [944, 1856],
    ],
    '#dfc38a',
    '#c8a568',
    '#8b6837'
  );
  drawGbaPathSegment(
    [
      [560, 1808],
      [544, 1808],
      [544, 1936],
      [672, 1936],
      [672, 1952],
      [816, 1952],
    ],
    '#dfc38a',
    '#c8a568',
    '#8b6837'
  );

  // 2. Sendero serpenteante del Bosque de las Señales hacia el Claro
  drawGbaPathSegment(
    [
      [640, 1600],
      [640, 1488],
      [672, 1488],
      [672, 1408],
      [816, 1408],
      [816, 1360],
      [928, 1360],
      [928, 1280],
      [960, 1280],
      [960, 1104],
    ],
    '#bfa373',
    '#a28253',
    '#684f2b'
  );
  drawGbaPathSegment(
    [[928, 1280], [1616, 1280]],
    '#c8ac7c',
    '#af8f5d',
    '#73562e'
  );

  // 3. Paseo monumental hacia las Ruinas del Primer Pulso (losas y polvo de piedra)
  drawGbaPathSegment(
    [
      [1616, 1280],
      [1888, 1280],
      [1888, 1200],
      [1936, 1200],
      [2144, 1200],
      [2144, 1424],
      [2144, 1584],
      [2592, 1584],
      [2816, 1584],
      [2816, 1616],
    ],
    '#cbd5e1',
    '#94a3b8',
    '#475569'
  );
  drawGbaPathSegment(
    [
      [1888, 1280],
      [1760, 1280],
      [1760, 1424],
      [1664, 1424],
      [1664, 1536],
    ],
    '#cbd5e1',
    '#94a3b8',
    '#475569'
  );
  drawGbaPathSegment(
    [[1648, 1280], [1648, 1056]],
    '#e2e8f0',
    '#94a3b8',
    '#475569'
  );

  // 4. Sendero de Pong y Terrazas
  drawGbaPathSegment(
    [[2688, 1568], [2688, 1360]],
    '#e2d2a4',
    '#beaa78',
    '#7e6a3c'
  );

  // 5. Rutas de la Cumbre Boreal (Expansión Norte)
  drawGbaPathSegment(
    [[1952, 160], [1952, 80], [1952, -112], [1952, -448], [1952, -640]],
    '#e2e8f0',
    '#94a3b8',
    '#475569'
  );
  drawGbaPathSegment(
    [[1952, -144], [1552, -144], [1392, -144], [1240, -144]],
    '#dfc38a',
    '#c8a568',
    '#8b6837'
  );
  drawGbaPathSegment(
    [[1952, -128], [2352, -128], [2608, -128], [2848, -128]],
    '#e2e8f0',
    '#94a3b8',
    '#475569'
  );

  // ESCALINATAS TALLADAS EN PIEDRA CON PERSPECTIVA 3D (DESNIVELES ENTRE TERRAZAS)
  const stairConnectors = [
    { x: 576, y: 1528, w: 112, steps: 5, isBastionMain: false },
    { x: 1760, y: 960, w: 256, steps: 7, isBastionMain: true },
  ];

  for (const st of stairConnectors) {
    const stairH = st.steps * 13;
    if (!isWorldBoxVisible(st.x - 300, st.y - 20, st.w + 600, stairH + 60, camX, camY, vw, vh)) {
      continue;
    }

    // Si es la gran escalinata del Bastión de las Oleadas, renderizar el muro de contención del desnivel a los lados
    if (st.isBastionMain) {
      const wallY = st.y;
      const wallH = 28;

      // 1. Muro de contención de piedra a la izquierda de la escalera (x: 1504 a 1752)
      // Base y cara vertical en sombra
      ctx.fillStyle = '#070b14';
      ctx.fillRect(1504, wallY - 2, 248, wallH + 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(1504, wallY, 248, wallH);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(1504, wallY + 12, 248, wallH - 12);
      // Albardilla (remate superior iluminado del muro)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(1504, wallY - 2, 248, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1504, wallY - 2, 248, 1);
      // Bloques de sillería y fisuras
      ctx.fillStyle = '#475569';
      for (let wx = 1520; wx < 1740; wx += 32) {
        ctx.fillRect(wx, wallY, 1, wallH);
        ctx.fillRect(wx + 16, wallY + 14, 1, wallH - 14);
      }
      // Sombra arrojada sobre la plaza inferior
      ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
      ctx.fillRect(1504, wallY + wallH, 248, 8);

      // 2. Muro de contención de piedra a la derecha de la escalera (x: 2024 a 2272)
      ctx.fillStyle = '#070b14';
      ctx.fillRect(2024, wallY - 2, 248, wallH + 4);
      ctx.fillStyle = '#334155';
      ctx.fillRect(2024, wallY, 248, wallH);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(2024, wallY + 12, 248, wallH - 12);
      // Albardilla (remate superior iluminado)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(2024, wallY - 2, 248, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2024, wallY - 2, 248, 1);
      // Bloques de sillería
      ctx.fillStyle = '#475569';
      for (let wx = 2040; wx < 2260; wx += 32) {
        ctx.fillRect(wx, wallY, 1, wallH);
        ctx.fillRect(wx + 16, wallY + 14, 1, wallH - 14);
      }
      // Sombra arrojada sobre la plaza
      ctx.fillStyle = 'rgba(7, 11, 20, 0.42)';
      ctx.fillRect(2024, wallY + wallH, 248, 8);
    }

    // Parapetos / Pretiles de sillería monumentales a los lados de la escalera
    const railW = st.isBastionMain ? 10 : 8;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(st.x - railW, st.y - 6, railW, stairH + 12);
    ctx.fillRect(st.x + st.w, st.y - 6, railW, stairH + 12);

    ctx.fillStyle = '#475569';
    ctx.fillRect(st.x - railW + 1, st.y - 5, railW - 2, stairH + 10);
    ctx.fillRect(st.x + st.w + 1, st.y - 5, railW - 2, stairH + 10);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(st.x - railW + 1, st.y - 5, 2, stairH + 10);
    ctx.fillRect(st.x + st.w + 1, st.y - 5, 2, stairH + 10);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(st.x - railW + 1, st.y - 5, 1, stairH + 10);

    // Pilastras de remate en los extremos de la barandilla
    const drawPillar = (px: number, py: number) => {
      ctx.fillStyle = '#070b14';
      ctx.fillRect(px - 2, py - 2, railW + 4, 8);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(px - 1, py - 1, railW + 2, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1, py - 1, railW + 2, 2);
    };
    drawPillar(st.x - railW, st.y - 6);
    drawPillar(st.x + st.w, st.y - 6);
    drawPillar(st.x - railW, st.y + stairH);
    drawPillar(st.x + st.w, st.y + stairH);

    // Peldaños individuales (huella clara iluminada, tabica vertical en sombra y resalte frontal)
    for (let i = 0; i < st.steps; i++) {
      const sy = st.y + i * 13;

      // Sombra de contacto inferior
      ctx.fillStyle = '#070b14';
      ctx.fillRect(st.x - 1, sy, st.w + 2, 13);

      // Tabica (cara vertical en sombra de piedra tallada)
      ctx.fillStyle = '#334155';
      ctx.fillRect(st.x, sy + 5, st.w, 7);

      // Huella (cara horizontal superior iluminada)
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(st.x, sy + 1, st.w, 5);

      // Resalte brillante frontal de mármol/sillería
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(st.x, sy + 1, st.w, 1);

      // Textura de junta central de piedra para escalinatas anchas
      if (st.w >= 160) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(st.x + Math.floor(st.w / 2), sy + 1, 2, 11);
        ctx.fillRect(st.x + Math.floor(st.w / 4), sy + 2, 1, 9);
        ctx.fillRect(st.x + Math.floor((st.w * 3) / 4), sy + 2, 1, 9);
      }
    }
  }
}

/** Barandilla de madera artesanal con postes torneados y vetas */
/** Barandilla de madera artesanal de alta calidad con postes torneados, vetas y acabados GBA RPG */
function drawWoodenRail(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): void {
  const horizontal = startY === endY;
  const start = horizontal ? startX : startY;
  const end = horizontal ? endX : endY;
  const length = end - start;
  if (length <= 0) return;

  const drawWoodenPost = (px: number, py: number) => {
    ctx.save();
    ctx.translate(Math.round(px), Math.round(py));
    // Sombra de contacto circular suave
    ctx.fillStyle = 'rgba(5, 10, 18, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 1. Cuerpo del poste (Contorno y masa)
    ctx.fillStyle = '#070b14'; // Outlines
    ctx.fillRect(-5, -12, 10, 22);
    ctx.fillStyle = '#8b5a2b'; // Tono medio
    ctx.fillRect(-4, -11, 8, 20);
    ctx.fillStyle = '#a16207'; // Veta de madera / Sombra lateral
    ctx.fillRect(1, -11, 3, 20);
    ctx.fillStyle = '#d8be88'; // Luz lateral
    ctx.fillRect(-4, -11, 2, 20);
    // 2. Capuchón / Remate superior torneado
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-6, -15, 12, 5);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(-5, -14, 10, 3);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-3, -14, 4, 1);
    ctx.fillRect(-5, -12, 10, 1);
    // 3. Perno / Clavo de fijación
    ctx.fillStyle = '#334155';
    ctx.fillRect(-1, -4, 2, 2);
    ctx.fillRect(-1, 4, 2, 2);
    ctx.restore();
  };

  // Sombra arrojada larga de la estructura sobre el suelo
  ctx.fillStyle = 'rgba(5, 10, 18, 0.28)';
  if (horizontal) {
    ctx.fillRect(startX, startY + 6, length, 4);
  } else {
    ctx.fillRect(startX + 6, startY, 4, length);
  }

  // Travesaños dobles con relieve
  const drawSingleBar = (x: number, y: number, w: number, h: number, isH: boolean) => {
    ctx.fillStyle = '#070b14';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#783e1c';
    ctx.fillRect(x, y + (isH ? 1 : 0), w, h - (isH ? 2 : 0));
    ctx.fillStyle = '#d8be88';
    if (isH) ctx.fillRect(x, y + 1, w, 1);
    else ctx.fillRect(x + 1, y, 1, h);
    ctx.fillStyle = '#4a2c12';
    if (isH) ctx.fillRect(x, y + h - 2, w, 1);
    else ctx.fillRect(x + w - 2, y, 1, h);
  };

  if (horizontal) {
    drawSingleBar(startX, startY - 8, length, 4, true);
    drawSingleBar(startX, startY + 2, length, 4, true);
  } else {
    drawSingleBar(startX - 8, startY, 4, length, false);
    drawSingleBar(startX + 2, startY, 4, length, false);
  }

  // Postes: uno al inicio, uno al final, y intermedios cada ~40px
  const postStep = 40;
  const postCount = Math.max(1, Math.floor(length / postStep));
  const actualStep = length / postCount;

  // Escuadras / Soportes de esquina decorativos
  ctx.fillStyle = '#4a2c12';
  if (horizontal) {
    // Escuadra inicio
    ctx.beginPath(); ctx.moveTo(startX, startY - 8); ctx.lineTo(startX + 12, startY); ctx.lineTo(startX, startY + 8); ctx.fill();
    // Escuadra fin
    ctx.beginPath(); ctx.moveTo(endX, startY - 8); ctx.lineTo(endX - 12, startY); ctx.lineTo(endX, startY + 8); ctx.fill();
  } else {
    // Escuadra inicio
    ctx.beginPath(); ctx.moveTo(startX - 8, startY); ctx.lineTo(startX, startY + 12); ctx.lineTo(startX + 8, startY); ctx.fill();
    // Escuadra fin
    ctx.beginPath(); ctx.moveTo(startX - 8, endY); ctx.lineTo(startX, endY - 12); ctx.lineTo(startX + 8, endY); ctx.fill();
  }

  for (let i = 0; i <= postCount; i++) {
    const pos = start + i * actualStep;
    if (horizontal) drawWoodenPost(pos, startY);
    else drawWoodenPost(startX, pos);
  }
}

type IslandPerimeterEdge = {
  side: 'top' | 'bottom' | 'left' | 'right';
  fixed: number;
  start: number;
  end: number;
};

const ISLAND_PERIMETER_TILE = 16;
const ISLAND_PERIMETER_OPENINGS: IslandPerimeterEdge[] = [
  { side: 'bottom', fixed: 2192, start: 380, end: 560 }, // Apertura muelle sur (Isla Natal)
  { side: 'left', fixed: 224, start: 1950, end: 2100 },  // Costa oeste
  { side: 'right', fixed: 2992, start: 1056, end: 1392 }, // Puerto oriental
];

const ISLAND_PERIMETER_EDGES: IslandPerimeterEdge[] = (() => {
  const cellKey = (x: number, y: number) => `${x},${y}`;
  const occupied = new Set<string>();
  const railCells: Array<{ x: number; y: number }> = [];
  const railCellKeys = new Set<string>();

  for (const rect of ISLAND_WALKABLE_RECTS) {
    for (let y = rect.y; y < rect.y + rect.h; y += ISLAND_PERIMETER_TILE) {
      for (let x = rect.x; x < rect.x + rect.w; x += ISLAND_PERIMETER_TILE) {
        const key = cellKey(x, y);
        occupied.add(key);
        if (rect.surface !== 'bridge' && rect.surface !== 'pier' && !railCellKeys.has(key)) {
          railCellKeys.add(key);
          railCells.push({ x, y });
        }
      }
    }
  }

  const spansByEdge = new Map<string, { side: IslandPerimeterEdge['side']; fixed: number; start: number; end: number }[]>();
  const addSpan = (side: IslandPerimeterEdge['side'], fixed: number, start: number) => {
    const key = `${side}:${fixed}`;
    const spans = spansByEdge.get(key) ?? [];
    spans.push({ side, fixed, start, end: start + ISLAND_PERIMETER_TILE });
    spansByEdge.set(key, spans);
  };

  for (const { x, y } of railCells) {
    if (!occupied.has(cellKey(x, y - ISLAND_PERIMETER_TILE))) addSpan('top', y, x);
    if (!occupied.has(cellKey(x, y + ISLAND_PERIMETER_TILE))) addSpan('bottom', y + ISLAND_PERIMETER_TILE, x);
    if (!occupied.has(cellKey(x - ISLAND_PERIMETER_TILE, y))) addSpan('left', x, y);
    if (!occupied.has(cellKey(x + ISLAND_PERIMETER_TILE, y))) addSpan('right', x + ISLAND_PERIMETER_TILE, y);
  }

  const edges: IslandPerimeterEdge[] = [];
  for (const spans of spansByEdge.values()) {
    spans.sort((a, b) => a.start - b.start);
    let current = { ...spans[0] };
    for (let i = 1; i < spans.length; i++) {
      const next = spans[i];
      if (next.start <= current.end) {
        current.end = Math.max(current.end, next.end);
      } else {
        edges.push(current);
        current = { ...next };
      }
    }
    edges.push(current);
  }
  return edges;
})();

function drawIslandPerimeterRails(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  for (const edge of ISLAND_PERIMETER_EDGES) {
    let spans = [{ start: edge.start, end: edge.end }];
    for (const opening of ISLAND_PERIMETER_OPENINGS) {
      if (opening.side !== edge.side || opening.fixed !== edge.fixed) continue;
      const nextSpans: typeof spans = [];
      for (const span of spans) {
        if (opening.end <= span.start || opening.start >= span.end) {
          nextSpans.push(span);
          continue;
        }
        if (opening.start > span.start) nextSpans.push({ start: span.start, end: opening.start });
        if (opening.end < span.end) nextSpans.push({ start: opening.end, end: span.end });
      }
      spans = nextSpans;
    }

    for (const span of spans) {
      const horizontal = edge.side === 'top' || edge.side === 'bottom';
      const railX = horizontal
        ? span.start
        : edge.side === 'left'
        ? edge.fixed + 8
        : edge.fixed - 8;
      const railY = horizontal
        ? edge.side === 'top'
          ? edge.fixed + 8
          : edge.fixed - 8
        : span.start;
      const length = span.end - span.start;
      if (length <= 0) continue;
      const boxX = horizontal ? railX : railX - 10;
      const boxY = horizontal ? railY - 10 : railY;
      if (!isWorldBoxVisible(boxX, boxY, horizontal ? length : 20, horizontal ? 20 : length, camX, camY, vw, vh)) {
        continue;
      }
      drawWoodenRail(
        ctx,
        railX,
        railY,
        horizontal ? span.end : railX,
        horizontal ? railY : span.end
      );
    }
  }
}

function drawRusticFence(ctx: CanvasRenderingContext2D, fx: number, fy: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const x = fx + i * 16;
    // Sombra de contacto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(x + 2, fy + 11, 12, 3);

    // Estacas verticales
    ctx.fillStyle = '#070b14'; // Outline
    ctx.fillRect(x + 2, fy, 4, 13);
    ctx.fillRect(x + 10, fy, 4, 13);
    
    ctx.fillStyle = '#8b5a2b'; // Body
    ctx.fillRect(x + 3, fy + 1, 2, 11);
    ctx.fillRect(x + 11, fy + 1, 2, 11);
    
    // Puntas afiladas
    ctx.fillStyle = '#070b14';
    ctx.beginPath();
    ctx.moveTo(x + 2, fy); ctx.lineTo(x + 4, fy - 3); ctx.lineTo(x + 6, fy); ctx.fill();
    ctx.moveTo(x + 10, fy); ctx.lineTo(x + 12, fy - 3); ctx.lineTo(x + 14, fy); ctx.fill();

    // Travesaños horizontales
    ctx.fillStyle = '#070b14';
    ctx.fillRect(x, fy + 4, 16, 4);
    ctx.fillStyle = '#a16207';
    ctx.fillRect(x, fy + 5, 16, 2);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(x, fy + 5, 16, 1);
  }
}

function drawIslandWoodRailSystem(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  southShortcutActive: boolean,
  glitchTrailCleared: boolean
): void {
  if (southShortcutActive && isWorldBoxVisible(864, 1632, 720, 112, camX, camY, vw, vh)) {
    drawWoodenRail(ctx, 912, 1640, 1536, 1640);
    drawWoodenRail(ctx, 912, 1736, 1536, 1736);
  }

  if (isWorldBoxVisible(2992, 1056, 528, 336, camX, camY, vw, vh)) {
    drawWoodenRail(ctx, 3000, 1136, 3000, 1344);
    drawWoodenRail(ctx, 3512, 1088, 3512, 1280);
  }

  for (const rail of ISLAND_ROUTE_RAILS) {
    if (rail.id.startsWith('bridge-rail')) continue; // Saltar barandas del puente (ya dibujadas por el renderer especializado)
    if (isWorldBoxVisible(rail.x1, rail.y1 - 12, rail.x2 - rail.x1, 24, camX, camY, vw, vh)) {
      drawWoodenRail(ctx, rail.x1, rail.y1, rail.x2, rail.y2);
    }
  }

  drawIslandPerimeterRails(ctx, camX, camY, vw, vh);
}

/** Dibuja un Portal Anómalo con distinción visual clara entre estado latente y activo estilo GBA */
function drawAnomalyPortalWorld(
  ctx: CanvasRenderingContext2D,
  portal: AnomalyPortalSpec,
  unlocked: boolean,
  syncedGlyphsCount: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(portal.x);
  const y = Math.round(portal.y);
  const t = reducedMotion ? 0 : elapsed;

  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada del monolito
  ctx.fillStyle = 'rgba(5, 8, 18, 0.52)';
  ctx.fillRect(-38, -6, 76, 20);

  // Zócalo escalonado de roca basáltica grabada
  ctx.fillStyle = '#060a14';
  ctx.fillRect(-36, -12, 72, 24);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-34, -10, 68, 20);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-34, -10, 68, 2);
  ctx.fillStyle = unlocked ? portal.accentHex : '#475569';
  ctx.fillRect(-26, 4, 52, 3);

  // Pilares gemelos de obsidiana y bronce que enmarcan la anomalía
  ctx.fillStyle = '#060a14';
  ctx.fillRect(-30, -60, 16, 54);
  ctx.fillRect(14, -60, 16, 54);
  ctx.fillRect(-32, -66, 64, 12);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-28, -58, 12, 50);
  ctx.fillRect(16, -58, 12, 50);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-28, -58, 3, 50);
  ctx.fillRect(16, -58, 3, 50);

  // Entablamento superior de bronce con runas
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-30, -64, 60, 6);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-28, -63, 56, 1);

  // 3 Engastes superiores para mostrar progreso de los 3 Símbolos de Pulso
  if (portal.requiredSecretIds && portal.requiredSecretIds.length === 3) {
    for (let i = 0; i < 3; i++) {
      const lit = i < syncedGlyphsCount;
      const gx = -14 + i * 14;
      ctx.fillStyle = '#060a14';
      ctx.fillRect(gx - 4, -73, 8, 8);
      ctx.fillStyle = lit ? '#00f3ff' : '#334155';
      ctx.fillRect(gx - 3, -72, 6, 6);
      if (lit) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx - 1, -70, 2, 2);
      }
    }
  }

  if (unlocked) {
    // Vórtice dimensional activo con nebulosa y fragmentos
    const pulse = reducedMotion ? 0.88 : 0.75 + Math.sin(t * 4.5) * 0.2;
    ctx.fillStyle = '#050c1a';
    ctx.fillRect(-16, -54, 32, 46);

    ctx.globalAlpha = pulse;
    ctx.fillStyle = portal.style === 'abyssal-chamber' ? '#6b21a8' : '#0369a1';
    ctx.fillRect(-14, -51, 28, 40);
    ctx.fillStyle = portal.accentHex;
    ctx.fillRect(-10, -44, 20, 26);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -36, 10, 10);
    ctx.globalAlpha = 1;

    // Fragmentos digitales orbitando
    for (let k = 0; k < 5; k++) {
      const ang = t * 2.2 + (k * Math.PI * 2) / 5;
      const fx = Math.round(Math.cos(ang) * 21);
      const fy = Math.round(-32 + Math.sin(ang * 1.3) * 15);
      ctx.fillStyle = k % 2 === 0 ? '#00f3ff' : '#fde047';
      ctx.fillRect(fx - 2, fy - 2, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx - 1, fy - 1, 2, 2);
    }
  } else {
    // Estado latente / inactivo: fisura estática tenue
    ctx.fillStyle = '#080d18';
    ctx.fillRect(-16, -54, 32, 46);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -50);
    ctx.lineTo(4, -36);
    ctx.lineTo(-3, -24);
    ctx.lineTo(3, -12);
    ctx.stroke();
  }

  ctx.restore();
}

/** Estela arqueológica tallada con los glifos de pulso [ ◈ ], [ ◈◈ ], [ ◈◈◈ ] */
function drawPulseGlyphStele(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  glyphIndex: 1 | 2 | 3,
  discovered: boolean,
  accentHex: string,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(sx);
  const y = Math.round(sy);
  const glow = discovered
    ? 0.95
    : reducedMotion
    ? 0.45
    : 0.35 + Math.sin(elapsed * 3 + glyphIndex) * 0.2;

  ctx.save();
  ctx.translate(x, y);

  // Sombra
  ctx.fillStyle = 'rgba(5, 8, 17, 0.46)';
  ctx.fillRect(-18, 3, 36, 6);

  // Obelisco con contorno oscuro y facetas
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-15, -38, 30, 42);
  ctx.fillRect(-11, -44, 22, 8);

  ctx.fillStyle = discovered ? '#334155' : '#475569';
  ctx.fillRect(-13, -36, 26, 38);
  ctx.fillStyle = discovered ? '#64748b' : '#64748b';
  ctx.fillRect(-13, -36, 3, 38);
  ctx.fillRect(-9, -42, 18, 6);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-9, -42, 3, 6);

  // Rombos de pulso grabados en la piedra
  ctx.globalAlpha = glow;
  ctx.fillStyle = discovered ? accentHex : '#cbd5e1';
  for (let i = 0; i < glyphIndex; i++) {
    const gy = -31 + i * 10;
    ctx.fillRect(-5, gy, 10, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, gy + 1, 4, 4);
    ctx.fillStyle = discovered ? accentHex : '#cbd5e1';
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

/** Chasis de máquina recreativa olvidada semienterrada en la arena de la costa */
function drawForgottenCoastalCabinet(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  inspected: boolean,
  elapsed: number
): void {
  const x = Math.round(cx);
  const y = Math.round(cy);
  ctx.save();
  ctx.translate(x, y);

  // Duna de arena que cubre la base inclinada
  ctx.fillStyle = '#caa356';
  ctx.fillRect(-26, -3, 52, 12);
  ctx.fillStyle = '#e4c781';
  ctx.fillRect(-24, -2, 48, 8);

  ctx.rotate(-0.14);
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-19, -46, 38, 46);
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(-17, -44, 34, 42);
  ctx.fillStyle = '#9c5a28';
  ctx.fillRect(-17, -44, 4, 42);

  // Marquesina desgastada
  ctx.fillStyle = '#060a12';
  ctx.fillRect(-14, -40, 28, 9);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(-12, -38, 24, 5);

  // Monitor CRT apagado con un destello fantasma ocasional
  ctx.fillStyle = '#080d16';
  ctx.fillRect(-13, -29, 26, 18);
  if (inspected || Math.floor(elapsed * 2) % 5 === 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-7, -22, 14, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -22, 6, 1);
  }

  // Musgo costero y salitre sobre el mueble
  ctx.fillStyle = '#2d6d34';
  ctx.fillRect(-17, -44, 12, 4);
  ctx.fillRect(7, -16, 10, 6);
  ctx.fillStyle = '#65ad4d';
  ctx.fillRect(-15, -43, 6, 2);

  ctx.restore();
}

/**
 * ARQUITECTURA DETALLADA DE EDIFICIOS ESTILO GBA RPG
 * - Tejas cerámicas o de pizarra con aristas y líneas de sombra.
 * - Fachadas de mampostería, entramado de madera y sillares en las esquinas (quoins).
 * - Sombra de caída bajo el alero que da volumen 3D al edificio.
 * - Ventanas con cristal reflectante, parteluces y jardineras florales en la aldea.
 * - Puertas de madera maciza con herrajes de forja, escalón de piedra y rótulo pulido.
 */
function drawPixelverseBuilding(
  ctx: CanvasRenderingContext2D,
  bldg: ExteriorBuildingSpec,
  elapsed: number,
  reducedMotion: boolean,
  tmReadyFor80s: boolean
): void {
  const bx = Math.round(bldg.x);
  const by = Math.round(bldg.y);
  const style = bldg.archStyle ?? 'cottage-archive';

  ctx.save();

  // 1. Sombra suave en el suelo para anclar el edificio al terreno
  ctx.fillStyle = 'rgba(5, 9, 18, 0.48)';
  ctx.fillRect(bx - 10, by + bldg.h - 2, bldg.w + 20, 16);
  ctx.fillRect(bx - 6, by + bldg.h + 8, bldg.w + 12, 4);

  // Zócalo de cimentación de piedra
  ctx.fillStyle = '#524332';
  ctx.fillRect(bx - 4, by + bldg.h - 4, bldg.w + 8, 6);
  ctx.fillStyle = '#7a654c';
  ctx.fillRect(bx - 4, by + bldg.h - 4, bldg.w + 8, 2);

  // Tejas cerámicas, pizarra, escamas góticas o paja: cursos alternos, barniz y musgo.
  const drawRoofTiles = (
    rx: number,
    ry: number,
    rWidth: number,
    rHeight: number,
    shadeHex: string,
    glintHex: string,
    tileWidth = 14,
    kind: 'ceramic' | 'slate' | 'hex' | 'thatch' = 'ceramic'
  ) => {
    if (kind === 'thatch') {
      const rows = Math.max(1, Math.ceil(rHeight / 3));
      for (let row = 0; row < rows; row++) {
        const top = ry + row * 3;
        const t = row / rows;
        ctx.fillStyle = row % 2 === 0 ? bldg.roofHex : shadeHex;
        ctx.fillRect(rx, top, rWidth, 3);
        ctx.fillStyle = t < 0.25 ? 'rgba(255, 236, 180, 0.22)' : 'rgba(70, 48, 16, 0.14)';
        ctx.fillRect(rx + 1, top, rWidth - 2, 1);
        for (let sx = rx + 2; sx < rx + rWidth - 2; sx += 6) {
          const th = hashTile(sx, top) % 100;
          if (th < 38) continue;
          ctx.fillStyle = th > 70 ? 'rgba(255, 236, 176, 0.45)' : 'rgba(90, 62, 22, 0.4)';
          ctx.fillRect(sx, top + 1, 2 + (th % 3), 1);
        }
      }
      ctx.fillStyle = shadeHex;
      ctx.fillRect(rx, ry + rHeight - 1, rWidth, 1);
      for (let mx = rx; mx < rx + rWidth; mx += 5) {
        const th = hashTile(mx, ry + rHeight) % 100;
        if (th < 35) continue;
        ctx.fillStyle = th > 60 ? glintHex : shadeHex;
        ctx.fillRect(mx, ry + rHeight, 2, 1 + (th % 3));
      }
      return;
    }

    const rowH = kind === 'hex' ? 5 : 6;
    const tw = kind === 'hex' ? 10 : kind === 'slate' ? 16 : tileWidth;
    const rows = Math.max(1, Math.ceil(rHeight / rowH));
    for (let row = 0; row < rows; row++) {
      const top = ry + row * rowH;
      const hRow = Math.min(rowH, ry + rHeight - top);
      if (hRow <= 0) break;
      ctx.fillStyle = row % 2 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(rx, top, rWidth, hRow);
      const offset = row % 2 === 0 ? 0 : Math.floor(tw / 2);
      for (let tileX = rx - offset; tileX < rx + rWidth; tileX += tw) {
        const x0 = Math.max(rx + 1, tileX + 1);
        const x1 = Math.min(rx + rWidth - 1, tileX + tw - 1);
        if (x1 - x0 < 3) continue;
        const th = hashTile(tileX, top) % 100;
        if (th > 72) {
          ctx.fillStyle = th > 90 ? 'rgba(255, 246, 228, 0.12)' : 'rgba(0, 0, 0, 0.1)';
          ctx.fillRect(x0, top, x1 - x0, hRow - 1);
        }
        if (tileX >= rx) {
          ctx.fillStyle = shadeHex;
          ctx.fillRect(tileX, top, 1, hRow);
        }
        if (kind === 'hex') {
          ctx.fillStyle = shadeHex;
          ctx.fillRect(x0, top + hRow - 1, Math.max(2, x1 - x0), 1);
          ctx.fillStyle = glintHex;
          ctx.fillRect(x0 + 1, top + 1, Math.max(1, x1 - x0 - 4), 1);
          ctx.fillRect(Math.floor((x0 + x1) / 2), top, 1, 2);
        } else {
          ctx.fillStyle = glintHex;
          ctx.fillRect(x0, top + 1, Math.max(2, x1 - x0 - 3), 1);
          ctx.fillStyle = shadeHex;
          ctx.fillRect(x0, top + hRow - 2, Math.max(2, x1 - x0 - 1), 1);
        }
        if (th > 93 && hRow >= 5) {
          ctx.fillStyle = 'rgba(6, 10, 18, 0.22)';
          ctx.fillRect(x0 + 2, top + 2, 2, 2);
        }
      }
      ctx.fillStyle = shadeHex;
      ctx.fillRect(rx, top + hRow - 1, rWidth, 1);
    }
    for (let mx = rx + 2; mx < rx + rWidth - 2; mx += 7) {
      const th = hashTile(mx, ry + rHeight) % 100;
      if (th < 74) continue;
      const rise = 1 + (th % Math.max(1, Math.round(rows * 4)));
      ctx.fillStyle = th > 90 ? 'rgba(116, 150, 86, 0.34)' : 'rgba(70, 104, 58, 0.26)';
      ctx.fillRect(mx, ry + rHeight - rise, 2, rise);
    }
    ctx.fillStyle = glintHex;
    ctx.fillRect(rx + 1, ry + 1, Math.min(rWidth - 2, 20), 1);
    ctx.fillStyle = 'rgba(6, 10, 18, 0.34)';
    ctx.fillRect(rx, ry + rHeight - 1, rWidth, 1);
  };

  const drawPitchedGable = (
    gx: number,
    gy: number,
    gw: number,
    gh: number,
    fillHex: string,
    shadeHex: string,
    glintHex: string,
    kind: 'ceramic' | 'slate' | 'hex' | 'thatch'
  ) => {
    ctx.fillStyle = '#1a140c';
    ctx.beginPath();
    ctx.moveTo(gx + gw / 2, gy);
    ctx.lineTo(gx + gw + 8, gy + gh);
    ctx.lineTo(gx - 8, gy + gh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = fillHex;
    ctx.beginPath();
    ctx.moveTo(gx + gw / 2, gy + 2);
    ctx.lineTo(gx + gw + 4, gy + gh - 1);
    ctx.lineTo(gx - 4, gy + gh - 1);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(gx + gw / 2, gy + 3);
    ctx.lineTo(gx + gw + 2, gy + gh - 2);
    ctx.lineTo(gx - 2, gy + gh - 2);
    ctx.closePath();
    ctx.clip();
    drawRoofTiles(gx - 6, gy + 4, gw + 12, gh - 6, shadeHex, glintHex, 12, kind);
    ctx.restore();
    ctx.fillStyle = '#5a3a1c';
    ctx.fillRect(gx + gw / 2 - 4, gy - 2, 8, 5);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(gx + gw / 2 - 3, gy - 1, 6, 2);
  };

  const drawStoneCourses = (sx: number, sy: number, sw: number, sh: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    for (let row = 0, ry = sy; ry < sy + sh; row++, ry += 8) {
      const odd = row % 2;
      for (let cx = sx - (odd ? 6 : 0); cx < sx + sw; cx += 14) {
        const th = hashTile(cx, ry) % 100;
        const pw = 12 + (th % 4);
        ctx.fillStyle = th > 70 ? '#c4b49a' : th > 40 ? '#b3a388' : '#9e9078';
        ctx.fillRect(cx + 1, ry + 1, pw, 6);
        ctx.fillStyle = 'rgba(255, 244, 220, 0.22)';
        ctx.fillRect(cx + 1, ry + 1, pw - 2, 1);
        ctx.fillStyle = 'rgba(40, 32, 22, 0.28)';
        ctx.fillRect(cx + 1, ry + 6, pw, 1);
        ctx.fillRect(cx + pw, ry + 1, 1, 6);
      }
    }
    ctx.restore();
  };

  const drawHangingLantern = (lx: number, ly: number) => {
    const flicker = reducedMotion ? 0.9 : 0.82 + Math.sin(elapsed * 5.4 + lx) * 0.1;
    ctx.fillStyle = '#4a3420';
    ctx.fillRect(lx - 8, ly - 2, 10, 2);
    ctx.fillRect(lx + 1, ly, 2, 6);
    ctx.fillStyle = '#6b5a48';
    ctx.fillRect(lx - 3, ly + 6, 8, 2);
    ctx.fillStyle = `rgba(255, 196, 96, ${flicker.toFixed(2)})`;
    ctx.fillRect(lx - 2, ly + 8, 6, 7);
    ctx.fillStyle = '#fff3c4';
    ctx.fillRect(lx - 1, ly + 9, 3, 4);
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(lx - 3, ly + 15, 8, 2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(lx + 1, ly + 11, 1, lx + 1, ly + 11, 22);
    g.addColorStop(0, `rgba(255, 186, 90, ${(0.32 * flicker).toFixed(2)})`);
    g.addColorStop(1, 'rgba(255, 186, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(lx - 22, ly - 8, 46, 46);
    ctx.restore();
  };

  // Grano de fachada: revoque, sillería o tablón con vetas de lluvia y
  // oscurecimiento de contacto en el zócalo. Se recorta al paño del muro.
  const drawFacadeGrain = (
    fx: number,
    fy: number,
    fw: number,
    fh: number,
    kind: 'plaster' | 'stone' | 'wood'
  ) => {
    if (fw <= 0 || fh <= 0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(fx, fy, fw, fh);
    ctx.clip();

    const grainStep = kind === 'stone' ? 5 : 6;
    for (let gy = fy + 2; gy < fy + fh - 2; gy += grainStep) {
      for (let gx = fx + 2; gx < fx + fw - 2; gx += grainStep) {
        const th = hashTile(gx * 3, gy) % 100;
        if (th < 58) continue;
        ctx.fillStyle = th > 84 ? 'rgba(255, 250, 236, 0.09)' : 'rgba(34, 28, 20, 0.08)';
        ctx.fillRect(gx, gy, th > 93 ? 2 : 1, 1);
      }
    }

    // Vetas de lluvia que bajan del alero y se desvanecen.
    for (let sx = fx + 5; sx < fx + fw - 4; sx += 13) {
      const th = hashTile(sx, fy + 1) % 100;
      if (th < 62) continue;
      const len = 5 + (th % 17);
      ctx.fillStyle = kind === 'wood' ? 'rgba(40, 26, 14, 0.1)' : 'rgba(40, 34, 26, 0.07)';
      ctx.fillRect(sx, fy + 2, 1, Math.min(len, fh - 4));
    }

    // Contacto con el suelo: banda de oclusión y humedad ascendente.
    ctx.fillStyle = 'rgba(22, 18, 12, 0.16)';
    ctx.fillRect(fx, fy + fh - 5, fw, 5);
    const dampH = Math.min(7, Math.max(3, Math.round(fh * 0.1)));
    for (let sx = fx + 2; sx < fx + fw - 2; sx += 6) {
      const th = hashTile(sx, fy + fh) % 100;
      if (th < 56) continue;
      ctx.fillStyle =
        kind === 'wood' && th > 82
          ? 'rgba(78, 96, 52, 0.26)'
          : th > 88
            ? 'rgba(74, 92, 52, 0.2)'
            : 'rgba(48, 38, 24, 0.18)';
      ctx.fillRect(sx, fy + fh - 1 - (th % dampH), 2, 1 + (th % dampH));
    }
    ctx.restore();
  };

  if (style === 'chrono-dome') {
    // ----------------------------------------------------
    // OBSERVATORIO DEL CRONOSCOPIO (RUINAS DEL PRIMER PULSO)
    // Cúpula octogonal de sillería de basalto, bronce y lente temporal cian
    // ----------------------------------------------------
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 2, by + 22, bldg.w + 4, bldg.h - 20);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 24, bldg.w, bldg.h - 24);

    // Contrafuertes y pilares de sillería
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(bx, by + 24, 12, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 12, by + 24, 12, bldg.h - 24);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(bx, by + 24, 3, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 12, by + 24, 3, bldg.h - 24);

    // Hiladas de sillares horizontales
    ctx.fillStyle = '#64748b';
    for (let courseY = by + 38; courseY < by + bldg.h - 10; courseY += 14) {
      ctx.fillRect(bx + 14, courseY, bldg.w - 28, 2);
    }
    ctx.fillStyle = '#e2d1a7';
    ctx.fillRect(bx + 12, by + 25, bldg.w - 24, 3);

    // Cúpula escalonada
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx + 8, by + 4, bldg.w - 16, 22);
    ctx.fillRect(bx + 26, by - 10, bldg.w - 52, 16);
    ctx.fillRect(bx + 52, by - 18, bldg.w - 104, 10);

    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx + 10, by + 6, bldg.w - 20, 18);
    ctx.fillRect(bx + 28, by - 8, bldg.w - 56, 14);
    drawRoofTiles(bx + 12, by + 6, bldg.w - 24, 14, bldg.roofShadeHex, '#67e8f9', 18, 'slate');

    // Meridiano astronómico de latón y lente ocular del Cronoscopio
    const cx = Math.round(bx + bldg.w / 2);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(cx - 4, by - 16, 8, 38);
    ctx.fillStyle = '#060a12';
    ctx.beginPath();
    ctx.arc(cx, by + 6, 14, 0, Math.PI * 2);
    ctx.fill();

    // Lente temporal viva
    const lensCol = tmReadyFor80s ? '#00f3ff' : (reducedMotion || Math.floor(elapsed * 2) % 2 === 0 ? '#38bdf8' : '#0284c7');
    ctx.fillStyle = lensCol;
    ctx.beginPath();
    ctx.arc(cx, by + 6, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 4, by + 2, 4, 3);
  } else if (style === 'forest-workshop') {
    // ----------------------------------------------------
    // TALLER ANALÓGICO DE KERTZ (BOSQUE DE LAS SEÑALES)
    // Cobre oxidado, entramado de roble, forja y ventanales cálidos
    // ----------------------------------------------------
    // Sombra del alero arrojada sobre la fachada.
    ctx.fillStyle = 'rgba(8, 12, 18, 0.45)';
    ctx.fillRect(bx - 4, by + 24, bldg.w + 8, 7);

    // Chimenea de ladrillo con corona de hierro y brasa viva.
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx + bldg.w - 32, by - 22, 20, 30);
    ctx.fillStyle = '#5b2a16';
    ctx.fillRect(bx + bldg.w - 30, by - 20, 16, 26);
    for (let row = 0; row < 7; row++) {
      ctx.fillStyle = row % 2 === 0 ? '#7c2d12' : '#6b2510';
      ctx.fillRect(bx + bldg.w - 30, by - 20 + row * 4, 16, 3);
      ctx.fillStyle = 'rgba(20, 10, 6, 0.5)';
      ctx.fillRect(bx + bldg.w - 30 + (row % 2 === 0 ? 4 : 8), by - 20 + row * 4, 1, 3);
    }
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(bx + bldg.w - 33, by - 25, 22, 4);
    ctx.fillStyle = '#475569';
    ctx.fillRect(bx + bldg.w - 33, by - 25, 22, 1);
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(bx + bldg.w - 26, by - 27, 8, 2);
    const emberGlow = 0.4 + Math.abs(Math.sin(elapsed * 3.1)) * 0.4;
    ctx.fillStyle = `rgba(251, 146, 60, ${emberGlow.toFixed(2)})`;
    ctx.fillRect(bx + bldg.w - 26, by - 27, 8, 1);
    // Humo en volutas que sube y se abre.
    for (let s = 0; s < 5; s++) {
      const rise = (elapsed * 5 + s * 9) % 34;
      const drift = Math.sin(elapsed * 0.9 + s * 1.4) * 4;
      ctx.fillStyle = `rgba(226, 232, 240, ${(0.4 - rise / 90).toFixed(2)})`;
      ctx.fillRect(bx + bldg.w - 24 + drift + s, by - 30 - rise, 4 + (s % 2) * 2, 2);
    }

    // Fachada de madera y piedra.
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 2, by + 24, bldg.w + 4, bldg.h - 22);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 26, bldg.w, bldg.h - 26);
    drawStoneCourses(bx + 8, by + 26, bldg.w - 16, bldg.h - 26);
    // Tablones verticales finos bajo el revoque.
    for (let boardX = bx + 9; boardX < bx + bldg.w - 8; boardX += 11) {
      const th = hashTile(boardX, by + 30) % 100;
      if (th < 48) continue;
      ctx.fillStyle = 'rgba(52, 36, 20, 0.12)';
      ctx.fillRect(boardX, by + 58, 1, bldg.h - 66);
      if (th > 82) {
        ctx.fillStyle = 'rgba(255, 244, 214, 0.14)';
        ctx.fillRect(boardX + 1, by + 58, 1, bldg.h - 66);
      }
    }

    // Entramado de vigas de roble con diagonales y clavos de hierro.
    ctx.fillStyle = '#5c3115';
    ctx.fillRect(bx, by + 26, 8, bldg.h - 26);
    ctx.fillRect(bx + bldg.w - 8, by + 26, 8, bldg.h - 26);
    ctx.fillRect(bx, by + 52, bldg.w, 5);
    ctx.fillStyle = '#8b4b1e';
    ctx.fillRect(bx, by + 26, 2, bldg.h - 26);
    ctx.fillRect(bx, by + 52, bldg.w, 1);
    ctx.fillRect(bx + bldg.w - 8, by + 26, 1, bldg.h - 26);
    // Diagonales en los paños libres entre ventana, puerta y ventana.
    ctx.strokeStyle = '#5c3115';
    ctx.lineWidth = 4;
    for (const [x0, x1] of [
      [bx + 8, bx + 19],
      [bldg.doorX - 34, bldg.doorX - 17],
      [bldg.doorX + 17, bx + bldg.w - 9],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x0, by + bldg.h - 4);
      ctx.lineTo(x1, by + 58);
      ctx.stroke();
    }
    ctx.fillStyle = '#2b1a0d';
    for (const bxp of [bx + 3, bx + bldg.w - 5]) {
      ctx.fillRect(bxp, by + 54, 2, 2);
      ctx.fillRect(bxp, by + 72, 2, 2);
    }

    // Tablones horizontales del zócalo.
    ctx.fillStyle = '#bca982';
    for (let boardY = by + 60; boardY < by + bldg.h - 8; boardY += 8) {
      ctx.fillRect(bx + 9, boardY, bldg.w - 18, 1);
    }

    // Cubierta de cobre con pátina, cresta y canaleta.
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 8, by + 4, bldg.w + 16, 24);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 6, by + 6, bldg.w + 12, 20);
    drawRoofTiles(bx - 4, by + 6, bldg.w + 8, 16, bldg.roofShadeHex, '#e8c878', 16, 'thatch');
    // Vetas de verdín que escurren por los escalones de cobre.
    for (let vx = bx - 2; vx < bx + bldg.w + 2; vx += 9) {
      const th = hashTile(vx, 411) % 100;
      if (th < 54) continue;
      ctx.fillStyle = th > 78 ? 'rgba(45, 122, 104, 0.5)' : 'rgba(38, 94, 84, 0.34)';
      ctx.fillRect(vx, by + 9, 1, 4 + (th % 9));
    }
    ctx.fillStyle = '#2f6f60';
    ctx.fillRect(bx - 7, by + 24, bldg.w + 14, 2);
    ctx.fillStyle = '#65a99a';
    ctx.fillRect(bx - 7, by + 24, bldg.w + 14, 1);
    ctx.fillStyle = '#13232a';
    ctx.fillRect(bx - 8, by + 26, bldg.w + 16, 2);
    // Canaleta y gárgola.
    ctx.fillStyle = '#4b5563';
    ctx.fillRect(bx + bldg.w - 12, by + 27, 12, 2);
    ctx.fillRect(bx + bldg.w - 4, by + 29, 2, 8);
    const drip = (elapsed * 18) % 12;
    ctx.fillStyle = 'rgba(186, 230, 253, 0.6)';
    ctx.fillRect(bx + bldg.w - 4, by + 31 + drip, 1, 2);

    // Dos tragaluces de cobre con luz de taller.
    for (const [sx, sw] of [
      [bx + 18, 26],
      [bx + 62, 30],
    ] as const) {
      ctx.fillStyle = '#060a12';
      ctx.fillRect(sx - 2, by + 8, sw + 4, 15);
      ctx.fillStyle = '#2f6f60';
      ctx.fillRect(sx - 1, by + 9, sw + 2, 13);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(sx, by + 11, sw, 9);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(sx + 2, by + 13, sw - 4, 5);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(sx + 2, by + 11, Math.max(4, sw * 0.3), 2);
      ctx.fillStyle = '#0b111b';
      ctx.fillRect(sx + Math.floor(sw / 2), by + 9, 1, 13);
    }
    // Antena de cobre y aisladores sobre la cumbrera.
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(bx + 8, by - 12, 2, 16);
    ctx.fillRect(bx + 8, by - 12, 9, 1);
    ctx.fillStyle = '#b8763a';
    ctx.fillRect(bx + 8, by - 2, 2, 2);
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(bx + 16, by - 13, 2, 2);

    // Ventilación de forja: rejilla con brasa detrás.
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(bx + 102, by + 64, 16, 12);
    ctx.fillStyle = `rgba(251, 146, 60, ${(0.5 + Math.sin(elapsed * 2.4) * 0.22).toFixed(2)})`;
    ctx.fillRect(bx + 103, by + 65, 14, 10);
    ctx.fillStyle = '#1f2937';
    for (let vy = by + 66; vy < by + 75; vy += 3) {
      ctx.fillRect(bx + 103, vy, 14, 1);
    }
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(bx + 102, by + 76, 16, 2);

    // Tubería de cobre con llave y soportes.
    ctx.fillStyle = '#8a5a2c';
    ctx.fillRect(bx + bldg.w - 14, by + 32, 3, bldg.h - 48);
    ctx.fillStyle = '#c99a5b';
    ctx.fillRect(bx + bldg.w - 14, by + 32, 1, bldg.h - 48);
    for (let py = by + 40; py < by + bldg.h - 18; py += 20) {
      ctx.fillStyle = '#202a34';
      ctx.fillRect(bx + bldg.w - 16, py, 7, 2);
    }
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(bx + bldg.w - 17, by + 84, 3, 3);

    // Hiedra trepando el ángulo oeste.
    for (let i = 0; i < 18; i++) {
      const th = hashTile(i * 23, 811) % 100;
      const ix = bx + 1 + (th % 9);
      const iy = by + bldg.h - 6 - ((th * (bldg.h - 26)) / 130);
      ctx.fillStyle = th > 70 ? '#4f8a3c' : '#356b2e';
      ctx.fillRect(ix, iy, 2, 2);
      if (th > 86) {
        ctx.fillStyle = '#7fae52';
        ctx.fillRect(ix, iy, 1, 1);
      }
    }

    // Banco de trabajo exterior: caja de herramientas, carrete y barril.
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx + 10, by + bldg.h - 22, 20, 17);
    ctx.fillStyle = '#7a4620';
    ctx.fillRect(bx + 11, by + bldg.h - 21, 18, 15);
    ctx.fillStyle = '#c99a5b';
    ctx.fillRect(bx + 11, by + bldg.h - 21, 18, 1);
    ctx.fillStyle = '#3b2412';
    ctx.fillRect(bx + 14, by + bldg.h - 16, 12, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(bx + 19, by + bldg.h - 19, 2, 3);
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(bx + bldg.w - 26, by + bldg.h - 20, 10, 15);
    ctx.fillStyle = '#5c3115';
    ctx.fillRect(bx + bldg.w - 25, by + bldg.h - 19, 8, 13);
    ctx.fillStyle = '#8a5a2c';
    for (let by2 = by + bldg.h - 17; by2 < by + bldg.h - 7; by2 += 3) {
      ctx.fillRect(bx + bldg.w - 25, by2, 8, 1);
    }
    // Escalón de piedra gastado.
    ctx.fillStyle = '#6b5a3e';
    ctx.fillRect(bldg.doorX - 20, by + bldg.h + 1, 40, 4);
    ctx.fillStyle = '#a08a5e';
    ctx.fillRect(bldg.doorX - 20, by + bldg.h + 1, 40, 1);
    ctx.fillStyle = 'rgba(74, 110, 52, 0.6)';
    ctx.fillRect(bldg.doorX - 17, by + bldg.h + 4, 6, 1);
    ctx.fillRect(bldg.doorX + 6, by + bldg.h + 4, 9, 1);
  } else if (style === 'ruins-sanctuary') {
    // ----------------------------------------------------
    // SANTUARIO DEL ARCHIVO PIONERO (TEMPLO CLÁSICO DE PIEDRA)
    // ----------------------------------------------------
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 4, by + 18, bldg.w + 8, bldg.h - 16);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx - 2, by + 20, bldg.w + 4, bldg.h - 20);
    drawStoneCourses(bx - 2, by + 20, bldg.w + 4, bldg.h - 20);

    // Columnas frontales de sillería estriada
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(bx + 8, by + 28, 14, bldg.h - 32);
    ctx.fillRect(bx + bldg.w - 22, by + 28, 14, bldg.h - 32);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(bx + 8, by + 28, 3, bldg.h - 32);
    ctx.fillRect(bx + bldg.w - 22, by + 28, 3, bldg.h - 32);

    // Capitel y base de columnas de latón dorado
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(bx + 6, by + 28, 18, 4);
    ctx.fillRect(bx + bldg.w - 24, by + 28, 18, 4);
    ctx.fillRect(bx + 6, by + bldg.h - 8, 18, 4);
    ctx.fillRect(bx + bldg.w - 24, by + bldg.h - 8, 18, 4);

    drawPitchedGable(
      bx - 6,
      by - 10,
      bldg.w + 12,
      32,
      bldg.roofHex,
      bldg.roofShadeHex,
      '#d4deea',
      'slate'
    );

    ctx.fillStyle = '#c4b08a';
    ctx.fillRect(bx + 4, by + 16, bldg.w - 8, 3);
    drawHangingLantern(bx + 6, by + 32);
    drawHangingLantern(bx + bldg.w - 2, by + 32);
  } else if (style === 'museum-hall') {
    // ----------------------------------------------------
    // MUSEO VIVIENTE DE LOS 70 (GALERÍA NEOCLÁSICA RETROFUTURISTA)
    // ----------------------------------------------------
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 4, by + 18, bldg.w + 8, bldg.h - 16);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx - 2, by + 20, bldg.w + 4, bldg.h - 20);
    drawStoneCourses(bx - 2, by + 20, bldg.w + 4, bldg.h - 20);

    // Columnata de mármol
    ctx.fillStyle = '#94a3b8';
    for (const cxOff of [10, 44, bldg.w - 56, bldg.w - 22]) {
      ctx.fillRect(bx + cxOff, by + 28, 12, bldg.h - 32);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(bx + cxOff, by + 28, 2, bldg.h - 32);
      ctx.fillStyle = '#94a3b8';
    }

    drawPitchedGable(
      bx - 6,
      by - 12,
      bldg.w + 12,
      34,
      bldg.roofHex,
      bldg.roofShadeHex,
      '#f4c4b0',
      'hex'
    );
    ctx.fillStyle = '#3a342c';
    ctx.fillRect(bx + bldg.w - 28, by - 36, 18, 28);
    drawRoofTiles(bx + bldg.w - 32, by - 48, 26, 14, bldg.roofShadeHex, '#f4c4b0', 10, 'hex');
    ctx.fillStyle = '#c4b08a';
    ctx.fillRect(bx + bldg.w - 24, by - 22, 10, 12);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(bx + bldg.w - 22, by - 20, 6, 8);
    drawHangingLantern(bx + 8, by + 32);
    drawHangingLantern(bx + bldg.w - 4, by + 32);

    // Friso de 4 bandas cromáticas de los 70 (Cian, Amarillo, Naranja, Verde)
    const frieze = ['#00f3ff', '#facc15', '#f97316', '#22c55e'];
    const segW = Math.floor((bldg.w - 16) / 4);
    frieze.forEach((hex, idx) => {
      ctx.fillStyle = hex;
      ctx.fillRect(bx + 8 + idx * segW, by + 21, segW - 2, 4);
    });
  } else if (style === 'arcade-hall') {
    // ----------------------------------------------------
    // SALA ARCADE DE LOS CUATRO CAMINOS (SALÓN CLAUSURADO)
    // Ladrillo oscuro, parapeto plano, ventanas tapiadas y neón moribundo
    // ----------------------------------------------------
    // Fachada de ladrillo
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 2, by + 22, bldg.w + 4, bldg.h - 20);
    ctx.fillStyle = bldg.wallHex;
    ctx.fillRect(bx, by + 24, bldg.w, bldg.h - 24);

    for (let ry = by + 30, row = 0; ry < by + bldg.h - 8; ry += 8, row++) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(bx, ry, bldg.w, 1);
      for (let rx = bx + (row % 2 === 0 ? 0 : -10); rx < bx + bldg.w; rx += 20) {
        if ((Math.abs(rx) * 13 + ry * 7) % 5 === 0) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
          ctx.fillRect(rx + 1, ry + 1, 18, 6);
        } else {
          ctx.fillStyle = 'rgba(255, 214, 160, 0.025)';
          ctx.fillRect(rx + 1, ry + 1, 18, 1);
        }
      }
    }

    // Desconchones de ladrillo y humedad
    ctx.fillStyle = 'rgba(20, 14, 9, 0.55)';
    ctx.fillRect(bx + 34, by + 70, 22, 10);
    ctx.fillRect(bx + 120, by + 36, 16, 14);
    ctx.fillStyle = 'rgba(120, 96, 64, 0.18)';
    ctx.fillRect(bx + 52, by + 84, 34, 8);

    // Pilastras de ladrillo claro en los extremos
    ctx.fillStyle = '#5d4431';
    ctx.fillRect(bx, by + 24, 9, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 9, by + 24, 9, bldg.h - 24);
    ctx.fillStyle = '#7a5a3e';
    ctx.fillRect(bx, by + 24, 2, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 9, by + 24, 2, bldg.h - 24);

    // Parapeto plano con alero y grava del techo
    ctx.fillStyle = '#060a12';
    ctx.fillRect(bx - 6, by + 2, bldg.w + 12, 24);
    ctx.fillStyle = bldg.roofHex;
    ctx.fillRect(bx - 4, by + 4, bldg.w + 8, 20);
    ctx.fillStyle = bldg.roofShadeHex;
    ctx.fillRect(bx - 4, by + 20, bldg.w + 8, 3);
    for (let gi = 0; gi < 46; gi++) {
      const gx = bx - 2 + ((gi * 37) % (bldg.w + 4));
      const gy = by + 6 + ((gi * 13) % 14);
      ctx.fillStyle = gi % 3 === 0 ? 'rgba(200, 190, 170, 0.18)' : 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(gx, gy, 2, 1);
    }
    // Cornisa de piedra
    ctx.fillStyle = '#8a7458';
    ctx.fillRect(bx - 4, by + 22, bldg.w + 8, 3);
    ctx.fillStyle = '#5d4a36';
    ctx.fillRect(bx - 4, by + 25, bldg.w + 8, 2);

    // Letrero vertical de neón roto junto a la esquina
    const bladeOn = reducedMotion || Math.sin(elapsed * 5.1) > -0.4;
    ctx.fillStyle = '#0b0705';
    ctx.fillRect(bx + 4, by - 18, 22, 42);
    ctx.fillStyle = '#241a12';
    ctx.fillRect(bx + 6, by - 16, 18, 38);
    ctx.fillStyle = bladeOn ? '#f59e0b' : '#6b4a1c';
    ctx.font = '700 6px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ['A', 'R', 'C', 'A'].forEach((letter, idx) => {
      ctx.fillText(letter, bx + 15, by - 7 + idx * 8);
    });
    ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
    ctx.fillRect(bx + 8, by - 14, 14, 34);

    // Ventanas tapiadas con tablones de madera
    const boardWindow = (wx: number, wy: number) => {
      ctx.fillStyle = '#060a12';
      ctx.fillRect(wx - 2, wy - 2, 26, 24);
      ctx.fillStyle = '#2e2117';
      ctx.fillRect(wx, wy, 22, 20);
      ctx.fillStyle = '#6b5236';
      ctx.fillRect(wx + 1, wy + 1, 20, 18);
      ctx.fillStyle = '#8a6b48';
      ctx.fillRect(wx + 1, wy + 1, 20, 2);
      ctx.fillStyle = '#4d3a25';
      ctx.fillRect(wx + 1, wy + 7, 20, 1);
      ctx.fillRect(wx + 1, wy + 13, 20, 1);
      ctx.strokeStyle = '#3a2a19';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(wx + 2, wy + 2);
      ctx.lineTo(wx + 20, wy + 18);
      ctx.moveTo(wx + 20, wy + 2);
      ctx.lineTo(wx + 2, wy + 18);
      ctx.stroke();
      ctx.fillStyle = '#c9b98f';
      ctx.fillRect(wx + 1, wy + 1, 2, 2);
      ctx.fillRect(wx + 19, wy + 1, 2, 2);
      ctx.fillRect(wx + 1, wy + 17, 2, 2);
      ctx.fillRect(wx + 19, wy + 17, 2, 2);
    };
    boardWindow(bx + 16, by + 40);
    boardWindow(bx + bldg.w - 38, by + 40);

    // Cartel descolorido pegado al ladrillo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(bx + 48, by + 40, 16, 20);
    ctx.fillStyle = '#c9b98f';
    ctx.fillRect(bx + 47, by + 39, 16, 20);
    ctx.fillStyle = '#a3271f';
    ctx.fillRect(bx + 51, by + 46, 8, 2);
    ctx.fillRect(bx + 51, by + 51, 6, 2);

    // Canalón oxidado y mancha de óxido
    ctx.fillStyle = '#4a3a2c';
    ctx.fillRect(bx + bldg.w - 4, by + 24, 4, bldg.h - 26);
    ctx.fillStyle = 'rgba(148, 64, 32, 0.35)';
    ctx.fillRect(bx + bldg.w - 8, by + 60, 8, 20);
  } else {
    // Casa de aldea: muros de mampostería, entramado de troncos y tejado de paja.
    const puff = Math.floor(elapsed * 2) % 3;
    ctx.fillStyle = '#3f3830';
    ctx.fillRect(bx + 18, by - 10, 14, 28);
    ctx.fillStyle = '#8a8376';
    ctx.fillRect(bx + 20, by - 8, 10, 24);
    for (let cy = by - 6; cy < by + 16; cy += 6) {
      ctx.fillStyle = 'rgba(40, 34, 28, 0.35)';
      ctx.fillRect(bx + 20, cy, 10, 1);
    }
    ctx.fillStyle = '#5c4630';
    ctx.fillRect(bx + 18, by - 12, 14, 3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.fillRect(bx + 22 + puff * 2, by - 20, 6, 4);

    ctx.fillStyle = '#1a140c';
    ctx.fillRect(bx - 2, by + 22, bldg.w + 4, bldg.h - 20);
    ctx.fillStyle = '#b7a88c';
    ctx.fillRect(bx, by + 24, bldg.w, bldg.h - 24);
    drawStoneCourses(bx, by + 24, bldg.w, bldg.h - 24);
    drawFacadeGrain(bx, by + 24, bldg.w, bldg.h - 24, 'stone');

    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(bx, by + 24, 8, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 8, by + 24, 8, bldg.h - 24);
    ctx.fillStyle = '#8a5a2c';
    ctx.fillRect(bx + 1, by + 24, 2, bldg.h - 24);
    ctx.fillRect(bx + bldg.w - 7, by + 24, 2, bldg.h - 24);
    for (let qy = by + 28; qy < by + bldg.h - 8; qy += 10) {
      ctx.fillStyle = 'rgba(30, 18, 8, 0.4)';
      ctx.fillRect(bx + 1, qy, 6, 2);
      ctx.fillRect(bx + bldg.w - 7, qy + 4, 6, 2);
    }

    drawPitchedGable(
      bx - 4,
      by - 8,
      bldg.w + 8,
      34,
      bldg.roofHex,
      bldg.roofShadeHex,
      '#f3dd9a',
      'thatch'
    );
    ctx.fillStyle = '#6b4a24';
    ctx.fillRect(bx + 28, by - 12, bldg.w - 56, 6);
    ctx.fillStyle = '#4a3218';
    for (let lx = bx + 34; lx < bx + bldg.w - 34; lx += 14) ctx.fillRect(lx, by - 14, 3, 8);
    ctx.fillStyle = 'rgba(7, 12, 20, 0.38)';
    ctx.fillRect(bx, by + 24, bldg.w, 5);
    drawHangingLantern(bx + 12, by + 34);
    drawHangingLantern(bx + bldg.w - 6, by + 34);
    for (const fx of [bx + 8, bx + 28, bx + bldg.w - 36, bx + bldg.w - 16]) {
      ctx.fillStyle = '#2d6d34';
      ctx.fillRect(fx, by + bldg.h - 8, 10, 8);
      ctx.fillStyle = '#65ad4d';
      ctx.fillRect(fx + 1, by + bldg.h - 12, 8, 6);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(fx + 2, by + bldg.h - 14, 2, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(fx + 6, by + bldg.h - 13, 2, 2);
    }
  }

  const drawGbaWindow = (wx: number, wy: number, glowHex: string, hasFlowerBox = false) => {
    const gothic = style === 'ruins-sanctuary' || style === 'museum-hall';
    ctx.fillStyle = '#1a140c';
    if (gothic) {
      ctx.fillRect(wx - 2, wy + 6, 26, 18);
      ctx.beginPath();
      ctx.moveTo(wx - 2, wy + 8);
      ctx.quadraticCurveTo(wx + 11, wy - 10, wx + 24, wy + 8);
      ctx.lineTo(wx + 24, wy + 8);
      ctx.fill();
      ctx.fillStyle = '#c4b08a';
      ctx.fillRect(wx, wy + 6, 22, 16);
      ctx.beginPath();
      ctx.moveTo(wx, wy + 8);
      ctx.quadraticCurveTo(wx + 11, wy - 6, wx + 22, wy + 8);
      ctx.fill();
      ctx.fillStyle = glowHex;
      ctx.fillRect(wx + 2, wy + 8, 18, 12);
      ctx.beginPath();
      ctx.moveTo(wx + 2, wy + 9);
      ctx.quadraticCurveTo(wx + 11, wy - 2, wx + 20, wy + 9);
      ctx.fill();
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(wx + 10, wy + 2, 2, 18);
      ctx.fillRect(wx + 2, wy + 12, 18, 1);
    } else {
      ctx.fillRect(wx - 1, wy - 2, 24, 22);
      ctx.fillStyle = '#6b3c1b';
      ctx.fillRect(wx, wy - 3, 22, 2);
      ctx.fillStyle = glowHex;
      ctx.fillRect(wx + 1, wy, 20, 18);
      ctx.fillStyle = '#2a1a10';
      ctx.fillRect(wx + 10, wy, 2, 18);
      ctx.fillRect(wx + 1, wy + 8, 20, 2);
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx + 3, wy + 3, 4, 2);
    ctx.fillRect(wx + 13, wy + 3, 3, 2);
    if (hasFlowerBox) {
      ctx.fillStyle = '#5c3115';
      ctx.fillRect(wx - 1, wy + 19, 24, 6);
      ctx.fillStyle = '#3f8a41';
      ctx.fillRect(wx, wy + 17, 22, 3);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(wx + 3, wy + 16, 3, 2);
      ctx.fillRect(wx + 16, wy + 16, 3, 2);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(wx + 9, wy + 15, 3, 3);
      ctx.fillStyle = '#f9a8d4';
      ctx.fillRect(wx + 6, wy + 16, 2, 2);
    }
  };

  const winGlow = style === 'chrono-dome' ? '#67e8f9' : '#fef08a';
  const isCottage = style === 'cottage-archive';
  if (style !== 'arcade-hall') {
    drawGbaWindow(bx + 16, by + 40, winGlow, isCottage);
    drawGbaWindow(bx + bldg.w - 38, by + 40, winGlow, isCottage);
  }

  const dLeft = Math.round(bldg.doorX - 16);
  ctx.fillStyle = '#1a140c';
  ctx.fillRect(dLeft - 4, by + bldg.h - 38, 40, 42);
  ctx.fillStyle = '#9a8f7a';
  ctx.fillRect(dLeft - 4, by + bldg.h - 1, 40, 6);
  ctx.fillStyle = '#cfc3aa';
  ctx.fillRect(dLeft - 3, by + bldg.h - 1, 38, 2);
  ctx.fillStyle = '#7a7060';
  ctx.fillRect(dLeft - 3, by + bldg.h + 3, 38, 1);

  const gothicDoor = style === 'ruins-sanctuary' || style === 'museum-hall';
  ctx.fillStyle = gothicDoor ? '#c4b08a' : style === 'arcade-hall' ? '#8a949b' : '#6b3c1b';
  ctx.fillRect(dLeft - 3, by + bldg.h - 38, 38, 38);
  if (gothicDoor) {
    ctx.beginPath();
    ctx.moveTo(dLeft - 3, by + bldg.h - 24);
    ctx.quadraticCurveTo(dLeft + 16, by + bldg.h - 52, dLeft + 35, by + bldg.h - 24);
    ctx.fill();
  }

  const isArcadeDoor = style === 'arcade-hall';
  ctx.fillStyle = isArcadeDoor ? '#3f474c' : '#5a3214';
  ctx.fillRect(dLeft, by + bldg.h - 36, 32, 36);
  if (gothicDoor) {
    ctx.beginPath();
    ctx.moveTo(dLeft, by + bldg.h - 24);
    ctx.quadraticCurveTo(dLeft + 16, by + bldg.h - 48, dLeft + 32, by + bldg.h - 24);
    ctx.fill();
  }
  ctx.fillStyle = isArcadeDoor ? '#5b666d' : '#7a4620';
  for (let px = dLeft + 2; px < dLeft + 30; px += 6) {
    ctx.fillRect(px, by + bldg.h - 32, 4, 30);
    ctx.fillStyle = 'rgba(30, 16, 6, 0.35)';
    ctx.fillRect(px + 4, by + bldg.h - 32, 1, 30);
    ctx.fillStyle = isArcadeDoor ? '#5b666d' : '#7a4620';
  }
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(dLeft + 15, by + bldg.h - 32, 2, 30);
  ctx.fillStyle = '#c9b07a';
  ctx.fillRect(dLeft + 4, by + bldg.h - 22, 3, 3);
  ctx.fillRect(dLeft + 25, by + bldg.h - 22, 3, 3);
  ctx.fillRect(dLeft + 4, by + bldg.h - 10, 3, 3);
  ctx.fillRect(dLeft + 25, by + bldg.h - 10, 3, 3);
  if (isArcadeDoor) {
    // Lama de persiana y luz cálida escapándose por la rendija inferior
    ctx.fillStyle = '#2c3337';
    for (let ly = by + bldg.h - 32; ly < by + bldg.h - 2; ly += 4) {
      ctx.fillRect(dLeft + 1, ly, 30, 1);
    }
    ctx.fillStyle = 'rgba(253, 224, 139, 0.55)';
    ctx.fillRect(dLeft + 1, by + bldg.h - 2, 30, 2);
    ctx.fillStyle = 'rgba(253, 224, 139, 0.12)';
    ctx.fillRect(dLeft - 2, by + bldg.h, 36, 4);
    // Cadena y candado
    ctx.strokeStyle = '#8a949b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dLeft - 2, by + bldg.h - 20);
    ctx.quadraticCurveTo(dLeft + 16, by + bldg.h - 12, dLeft + 34, by + bldg.h - 22);
    ctx.stroke();
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(dLeft + 14, by + bldg.h - 15, 4, 4);
  }

  // Pomo de latón dorado
  ctx.fillStyle = isArcadeDoor ? '#9aa3a8' : '#fde047';
  ctx.fillRect(dLeft + 24, by + bldg.h - 18, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(dLeft + 25, by + bldg.h - 17, 1, 1);

  // Rótulo arquitectónico pulido sobre el dintel
  const signHalfW = isArcadeDoor ? 50 : 44;
  ctx.fillStyle = '#060a12';
  ctx.fillRect(bldg.doorX - signHalfW, by + 8, signHalfW * 2, 16);
  ctx.fillStyle = isArcadeDoor ? '#f59e0b' : '#d8be88';
  ctx.fillRect(bldg.doorX - signHalfW + 2, by + 10, signHalfW * 2 - 4, 12);
  ctx.fillStyle = isArcadeDoor ? '#241206' : '#0f172a';
  ctx.fillRect(bldg.doorX - signHalfW + 4, by + 12, signHalfW * 2 - 8, 8);
  ctx.fillStyle = isArcadeDoor ? '#fbbf24' : '#fef08a';
  ctx.font = `700 ${isArcadeDoor ? 8 : 7}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(bldg.signText, bldg.doorX, by + (isArcadeDoor ? 20 : 19));

  if (isArcadeDoor) {
    // Neón "ABIERTO" moribundo junto a la puerta
    const openOn = reducedMotion || Math.sin(elapsed * 4.3) > 0.1;
    ctx.fillStyle = '#0b0705';
    ctx.fillRect(bldg.doorX - 62, by + 34, 26, 9);
    ctx.fillStyle = openOn ? '#f59e0b' : '#5a401c';
    ctx.font = '700 5px "JetBrains Mono", monospace';
    ctx.fillText('ABIERTO', bldg.doorX - 49, by + 40);
    // Graffiti desvaído y colillas en el umbral
    ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.fillRect(bldg.doorX + 38, by + 44, 12, 2);
    ctx.fillRect(bldg.doorX + 44, by + 47, 8, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(bldg.doorX - 24, by + bldg.h + 3, 5, 1);
    ctx.fillRect(bldg.doorX + 10, by + bldg.h + 4, 4, 1);
  }

  ctx.restore();
}

/**
 * EL CASTILLO DEL REY CORRUPTO — Fachada colosal, almenas de basalto, torres centinela,
 * estandarte oscuro ondeando en la niebla, foso abisal, puente levadizo articulado
 * y los 4 pedestales de sellos rúnicos (Sol, Luna, Estrella, Rayo).
 */
export function drawCastleCorruptoExterior(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  elapsed: number,
  reducedMotion: boolean,
  drawbridgeDown: boolean,
  discoveredSecrets: string[]
): void {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));

  // 1. Aura de corrupción violeta de Super KOOPA en lo alto del castillo
  const auraPulse = reducedMotion ? 1 : 0.85 + Math.sin(elapsed * 2.5) * 0.2;
  const auraGrad = ctx.createRadialGradient(0, -90, 20, 0, -90, 180 * auraPulse);
  auraGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
  auraGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.18)');
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, -90, 180 * auraPulse, 0, Math.PI * 2);
  ctx.fill();

  const drawCastleMasonry = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#2c3038';
    ctx.fillRect(x, y, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    for (let row = 0, ry = y; ry < y + h; row++, ry += 8) {
      const odd = row % 2;
      for (let cx = x - (odd ? 8 : 0); cx < x + w; cx += 16) {
        const th = ((cx * 13 + ry * 7) >>> 0) % 100;
        ctx.fillStyle = th > 72 ? '#8a909a' : th > 40 ? '#6e7580' : '#5a616c';
        ctx.fillRect(cx + 1, ry + 1, 14, 6);
        ctx.fillStyle = 'rgba(220, 226, 234, 0.18)';
        ctx.fillRect(cx + 1, ry + 1, 12, 1);
        ctx.fillStyle = 'rgba(12, 10, 18, 0.28)';
        ctx.fillRect(cx + 1, ry + 6, 14, 1);
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(120, 70, 180, 0.12)';
    ctx.fillRect(x, y, w, h);
  };

  const drawConeTurret = (cx: number, topY: number, radius: number, height: number) => {
    for (let i = 0; i < height; i += 3) {
      const t = i / height;
      const rw = Math.max(3, radius * (1 - t));
      ctx.fillStyle = i % 2 === 0 ? '#8a4324' : '#6b3018';
      ctx.fillRect(cx - rw, topY + i, rw * 2, 3);
      ctx.fillStyle = 'rgba(255, 190, 140, 0.16)';
      ctx.fillRect(cx - rw + 1, topY + i, Math.max(1, rw * 0.55), 1);
      ctx.fillStyle = '#4a1c0c';
      for (let tx = cx - rw + 2; tx < cx + rw - 2; tx += 6) {
        ctx.fillRect(tx, topY + i, 1, 3);
      }
    }
    ctx.fillStyle = '#3a2214';
    ctx.fillRect(cx - 2, topY - 6, 4, 8);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(cx - 1, topY - 8, 2, 3);
  };

  // Cuerpo central de sillería gris con tinte de corrupción
  ctx.fillStyle = '#141018';
  ctx.fillRect(-144, -100, 288, 164);
  drawCastleMasonry(-140, -96, 280, 156);
  ctx.fillStyle = '#4a5560';
  for (let ax = -136; ax < 136; ax += 16) {
    ctx.fillRect(ax, -110, 10, 14);
  }

  // Keep central
  ctx.fillStyle = '#141018';
  ctx.fillRect(-64, -176, 128, 86);
  drawCastleMasonry(-60, -170, 120, 78);
  ctx.fillStyle = '#4a5560';
  for (let ax = -56; ax < 56; ax += 16) {
    ctx.fillRect(ax, -184, 10, 14);
  }
  drawConeTurret(0, -248, 42, 68);

  // Ventanal gótico de la cima iluminado con fulgor violeta (despacho del trono)
  const winGlow = reducedMotion ? 0.7 : 0.5 + Math.sin(elapsed * 4) * 0.4;
  ctx.fillStyle = '#090710';
  ctx.fillRect(-18, -145, 36, 42);
  ctx.fillStyle = `rgba(192, 132, 252, ${winGlow})`;
  ctx.fillRect(-14, -141, 28, 34);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-3, -128, 6, 6);

  // Estandarte oscuro de la fortaleza en lo alto ondeando
  const flagWave = reducedMotion ? 0 : Math.sin(elapsed * 3.5) * 6;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-2, -210, 4, 30);
  ctx.fillStyle = '#090710';
  ctx.fillRect(2, -208, 36 + flagWave, 18);
  ctx.fillStyle = '#581c87';
  ctx.fillRect(2, -206, 32 + flagWave, 14);
  ctx.fillStyle = '#ec4899';
  ctx.fillRect(14 + flagWave * 0.5, -202, 8, 6);

  // 4. Torres centinelas izquierda y derecha
  const drawTower = (tx: number) => {
    ctx.fillStyle = '#141018';
    ctx.fillRect(tx - 38, -140, 76, 174);
    drawCastleMasonry(tx - 34, -136, 68, 166);
    ctx.fillStyle = '#4a5560';
    for (let ax = tx - 32; ax < tx + 32; ax += 14) {
      ctx.fillRect(ax, -150, 8, 12);
    }
    drawConeTurret(tx, -214, 28, 64);
    ctx.fillStyle = '#141018';
    ctx.fillRect(tx - 4, -90, 8, 30);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(tx - 2, -88, 4, 26);
    ctx.fillStyle = '#090710';
    ctx.fillRect(tx - 10, -50, 8, 10);
    ctx.fillRect(tx + 4, -50, 8, 10);
    ctx.fillStyle = `rgba(192, 132, 252, ${winGlow})`;
    ctx.fillRect(tx - 8, -48, 4, 6);
    ctx.fillRect(tx + 6, -48, 4, 6);
  };
  drawTower(-140);
  drawTower(140);

  ctx.fillStyle = '#3a342c';
  ctx.fillRect(-48, -8, 96, 16);
  ctx.fillStyle = '#c4b08a';
  ctx.fillRect(-46, -6, 92, 4);
  ctx.fillStyle = '#141018';
  ctx.beginPath();
  ctx.arc(0, 18, 38, Math.PI, 0);
  ctx.lineTo(38, 60);
  ctx.lineTo(-38, 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2438';
  ctx.beginPath();
  ctx.arc(0, 20, 32, Math.PI, 0);
  ctx.lineTo(32, 60);
  ctx.lineTo(-32, 60);
  ctx.closePath();
  ctx.fill();

  // Rastrillo de hierro
  ctx.fillStyle = '#0f172a';
  for (let barX = -26; barX <= 26; barX += 9) {
    ctx.fillRect(barX, -10, 3, 70);
  }
  ctx.fillRect(-28, 16, 56, 3);
  ctx.fillRect(-28, 36, 56, 3);

  // 6. Foso abisal y Puente Levadizo
  ctx.fillStyle = '#05040a';
  ctx.fillRect(-90, 60, 180, 40);

  if (drawbridgeDown) {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-32, 60, 64, 40);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-30, 62, 60, 36);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-32, 72, 64, 3);
    ctx.fillRect(-32, 86, 64, 3);

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, 100);
    ctx.lineTo(-36, 30);
    ctx.moveTo(32, 100);
    ctx.lineTo(36, 30);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-32, 20, 64, 40);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-32, 20);
    ctx.lineTo(-36, 0);
    ctx.moveTo(32, 20);
    ctx.lineTo(36, 0);
    ctx.stroke();
  }

  // 7. Los 4 Pedestales de Sellos Rúnicos (Sol, Luna, Estrella, Rayo) y Estela de la Clave
  const seals = [
    { id: 'castle-seal-sol', x: -112, y: 160, sym: '☀', label: 'SOL', hex: '#f59e0b' },
    { id: 'castle-seal-luna', x: -62, y: 180, sym: '☾', label: 'LUNA', hex: '#38bdf8' },
    { id: 'castle-seal-estrella', x: 62, y: 180, sym: '★', label: 'ESTRELLA', hex: '#fde047' },
    { id: 'castle-seal-rayo', x: 112, y: 160, sym: '⚡', label: 'RAYO', hex: '#c084fc' },
  ];

  for (const s of seals) {
    const isLit = discoveredSecrets.includes(s.id);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(s.x - 14, s.y - 18, 28, 24);
    ctx.fillStyle = '#334155';
    ctx.fillRect(s.x - 12, s.y - 16, 24, 20);
    ctx.strokeStyle = isLit ? s.hex : '#64748b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(s.x - 12, s.y - 16, 24, 20);

    ctx.fillStyle = isLit ? s.hex : '#1e293b';
    ctx.beginPath();
    ctx.arc(s.x, s.y - 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isLit ? '#ffffff' : '#94a3b8';
    ctx.font = '900 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(s.sym, s.x, s.y - 5);

    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.fillText(s.label, s.x, s.y + 16);
  }

  // Estela Rúnica Central con la pista del acertijo
  ctx.fillStyle = '#070b14';
  ctx.fillRect(-18, 170, 36, 32);
  ctx.fillStyle = '#1e1b2e';
  ctx.fillRect(-16, 172, 32, 28);
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-16, 172, 32, 28);
  ctx.fillStyle = '#c084fc';
  ctx.font = '700 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('◈ CLAVE ◈', 0, 186);
  ctx.font = '700 6px "JetBrains Mono", monospace';
  ctx.fillText('4 SELLOS', 0, 196);

  ctx.restore();
}

export interface IslandRenderFrameParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  camera: { x: number; y: number };
  elapsed: number;
  reducedMotion: boolean;
  stars: IslandStar[];
  ambientBits: IslandAmbientBit[];
  digitalCritters: IslandDigitalCritter[];
  pickupBursts: IslandPickupBurst[];
  player: {
    x: number;
    y: number;
    facing: 1 | -1;
    facingDir?: FacingDirection;
    walking: boolean;
    sprinting?: boolean;
    interactAnim?: number;
  };
  flight: {
    type:
      | 'none'
      | 'pong-landing'
      | 'pong-to-garganta'
      | 'garganta-to-pong'
      | 'shuttle-landing'
      | 'hoverboard';
    elapsed: number;
    duration: number;
    /** Inclinación de la tabla durante el descenso del surf. */
    tilt?: number;
  };
  pongBoardDeparture?: { x: number; y: number; elapsed: number; duration: number } | null;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance?: AvatarAppearance;
  pongRestored: boolean;
  breakoutRestored: boolean;
  glitchTrailCleared: boolean;
  invadersRestored: boolean;
  invadersCabinetUnlocked: boolean;
  volcanicPassageOpen: boolean;
  breakoutSwordExtracting: boolean;
  southShortcutActive: boolean;
  allUnlocked: boolean;
  progressState: PixelverseProgressState;
  activeZoneId: IslandZoneId | null;
  prompt: IslandPromptRenderSpec | null;
  scannerPulse?: { active: boolean; elapsed: number };
  /** Progreso 0..1 del descenso del puente de la cala (1 = completamente apoyado). */
  bridgeProgress?: number;
  /** Progreso 0..1 del apagado progresivo del láser de seguridad del Sector 03. */
  laserShutdownProgress?: number;
  /** La palanca ya recibió el estaño de Dylan y puede accionarse. */
  laserRepaired?: boolean;
  /** Progreso 0..1 de la apertura de la compuerta PRIORIDAD CERO del Sector 11. */
  faroGateProgress?: number;
  /** La baliza del Faro del Reinicio ya está encendida. */
  faroBeaconLit?: boolean;
  /** Posiciones temporales para animaciones guionadas de PNJ (p. ej. el amigo saliendo de su casa). */
  npcOverrides?: Record<string, { x: number; y: number } | undefined> | null;
}

/**
 * Sombra suave de nubes a la deriva sobre el terreno: aporta profundidad y
 * movimiento continuo a toda la isla sin tocar la lógica de colisiones.
 */
function drawDriftingCloudShadows(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  const clouds = [
    { x: 760, y: 1900, r: 230, speed: 0.05, phase: 0.4 },
    { x: 1980, y: 1260, r: 280, speed: 0.037, phase: 2.1 },
    { x: 2940, y: 1780, r: 210, speed: 0.06, phase: 4.2 },
    { x: 1320, y: 760, r: 250, speed: 0.043, phase: 1.3 },
    { x: 2520, y: 480, r: 190, speed: 0.052, phase: 5.1 },
  ];

  ctx.save();
  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    const driftX = reducedMotion ? 0 : Math.sin(elapsed * c.speed + c.phase) * 150;
    const driftY = reducedMotion ? 0 : Math.cos(elapsed * c.speed * 0.7 + c.phase) * 46;
    const cx = c.x + driftX;
    const cy = c.y + driftY;
    if (!isWorldBoxVisible(cx - c.r, cy - c.r * 0.7, c.r * 2, c.r * 1.4, camX, camY, vw, vh, 30)) {
      continue;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.52);
    const shade = ctx.createRadialGradient(0, 0, c.r * 0.12, 0, 0, c.r);
    shade.addColorStop(0, 'rgba(4, 16, 22, 0.105)');
    shade.addColorStop(0.55, 'rgba(4, 16, 22, 0.075)');
    shade.addColorStop(1, 'rgba(4, 16, 22, 0)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(0, 0, c.r, 0, Math.PI * 2);
    ctx.fill();

    // Segundo lóbulo desplazado para que la sombra no parezca un óvalo perfecto.
    ctx.translate(c.r * 0.42, c.r * 0.1);
    const lobe = ctx.createRadialGradient(0, 0, c.r * 0.08, 0, 0, c.r * 0.62);
    lobe.addColorStop(0, 'rgba(4, 16, 22, 0.075)');
    lobe.addColorStop(1, 'rgba(4, 16, 22, 0)');
    ctx.fillStyle = lobe;
    ctx.beginPath();
    ctx.arc(0, 0, c.r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function getIslandLandRect(
  x: number,
  y: number,
  southShortcutActive: boolean,
  glitchTrailCleared: boolean
): WalkableRect | null {
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
  }
  return null;
}

/**
 * Motas de polen, esporas y luciérnagas digitales: vida ambiental sutil que
 * recorre todos los sectores de la isla por encima del terreno caminable.
 */
function drawAmbientIslandLife(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  ambientBits: IslandAmbientBit[],
  digitalCritters: IslandDigitalCritter[],
  southShortcutActive: boolean,
  glitchTrailCleared: boolean
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const bit of ambientBits) {
    // Densidad baja: unas pocas motas visibles a la vez, como polen de GBA.
    if (((bit.x * 13 + bit.y * 7) & 3) !== 0) continue;
    const driftX = reducedMotion ? 0 : Math.cos(elapsed * 0.55 + bit.phase * 0.7) * 5;
    const driftY = reducedMotion ? 0 : Math.sin(elapsed * 0.85 + bit.phase) * 6;
    const x = Math.round(bit.x + driftX);
    const y = Math.round(bit.y + driftY);
    if (x < camX - 10 || x > camX + vw + 10 || y < camY - 10 || y > camY + vh + 10) continue;
    const land = getIslandLandRect(x, y, southShortcutActive, glitchTrailCleared);
    if (!land) continue;
    // Polen y esporas solo sobre suelo natural; evita "píxeles" sueltos en plazas y piedra.
    if (
      land.surface !== 'grass' &&
      land.surface !== 'secret-grass' &&
      land.surface !== 'circuit' &&
      land.surface !== 'sand'
    ) {
      continue;
    }

    const pulse = reducedMotion ? 0.42 : 0.3 + Math.sin(elapsed * 2.1 + bit.phase) * 0.26;
    ctx.globalAlpha = Math.max(0.02, pulse * 0.09);
    ctx.fillStyle = bit.color;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.globalAlpha = Math.max(0.1, pulse * 0.4);
    ctx.fillRect(x, y, 2, 1);
    ctx.globalAlpha = Math.min(0.85, pulse * 0.95);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, 1, 1);
  }

  for (const critter of digitalCritters) {
    const x = Math.round(critter.homeX + Math.sin(elapsed * 0.7 + critter.phase) * 26);
    const y = Math.round(critter.homeY + Math.cos(elapsed * 0.9 + critter.phase) * 14);
    if (x < camX - 12 || x > camX + vw + 12 || y < camY - 12 || y > camY + vh + 12) continue;
    const land = getIslandLandRect(x, y, southShortcutActive, glitchTrailCleared);
    if (
      !land ||
      (land.surface !== 'grass' &&
        land.surface !== 'secret-grass' &&
        land.surface !== 'circuit')
    ) {
      continue;
    }

    const wing = reducedMotion ? 2 : Math.sin(elapsed * 16 + critter.phase) > 0 ? 3 : 1;
    ctx.globalAlpha = 0.24;
    ctx.fillStyle = critter.color;
    ctx.fillRect(x - 3, y - 1, 2, wing);
    ctx.fillRect(x + 2, y - 1, 2, wing);
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x - 1, y - 1, 3, 3);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#f0fdfa';
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.restore();
}

/** Mancha radial suave en coordenadas de mundo para dar volumen al suelo. */
function groundHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rgb: string,
  alpha: number
): void {
  if (rx <= 0 || ry <= 0 || alpha <= 0.003) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, Math.max(0.15, ry / rx));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb}, ${alpha.toFixed(3)})`);
  g.addColorStop(0.6, `rgba(${rgb}, ${(alpha * 0.5).toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/**
 * LAVADO DE SUELO POR SECTOR
 * Se dibuja una sola vez por rectángulo caminable (no por celda), así que la
 * textura atraviesa las juntas de 32 px y desaparece la lectura de tablero.
 * Añade volumen de luz/sombra, grano mineral y ondulaciones eólicas continuas.
 */
function drawOriginGroundDressing(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  southShortcutActive: boolean,
  glitchTrailCleared: boolean
): void {
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    const surface = r.surface;
    const isSand = surface === 'sand';
    const isCobble = surface === 'cobble';
    const isGrass =
      surface === 'grass' || surface === 'circuit' || surface === 'secret-grass';
    if (!isSand && !isCobble && !isGrass) continue;
    if (!isWorldBoxVisible(r.x, r.y, r.w, r.h, camX, camY, vw, vh)) continue;

    const x0 = Math.max(r.x, camX - 8);
    const y0 = Math.max(r.y, camY - 8);
    const x1 = Math.min(r.x + r.w, camX + vw + 8);
    const y1 = Math.min(r.y + r.h, camY + vh + 8);
    if (x1 <= x0 || y1 <= y0) continue;

    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    if (isGrass) {
      // Grandes claros de luz y bolsas de sombra entre el follaje.
      const hx0 = Math.floor(x0 / 208) * 208;
      const hy0 = Math.floor(y0 / 208) * 208;
      for (let hy = hy0; hy < y1 + 208; hy += 208) {
        for (let hx = hx0; hx < x1 + 208; hx += 208) {
          const th = hashTile(hx >> 3, hy >> 3);
          if (th % 3 === 0) continue;
          const px = hx + 40 + (th % 96);
          const py = hy + 34 + ((th >> 7) % 92);
          const rad = 62 + ((th >> 3) % 54);
          if (th & 1) {
            groundHalo(ctx, px, py, rad, rad * 0.62, '168, 214, 112', 0.11);
          } else {
            groundHalo(ctx, px, py, rad, rad * 0.58, '16, 62, 34', 0.13);
          }
        }
      }

      // Sombra de matas y transición de claros secos.
      for (let gy = Math.floor(y0 / 37) * 37; gy < y1; gy += 37) {
        for (let gx = Math.floor(x0 / 37) * 37; gx < x1; gx += 37) {
          const th = hashTile(gx, gy);
          if (th % 10 < 7) continue;
          const px = gx + (th % 9);
          const py = gy + ((th >> 4) % 9);
          ctx.fillStyle = 'rgba(18, 68, 34, 0.2)';
          ctx.fillRect(px, py + 2, 4, 1);
          ctx.fillRect(px + 1, py + 3, 2, 1);
          if ((th >> 6) % 3 === 0) {
            ctx.fillStyle = 'rgba(158, 198, 96, 0.24)';
            ctx.fillRect(px + 2, py, 1, 2);
            ctx.fillRect(px + 4, py + 1, 1, 1);
          }
        }
      }
    } else if (isSand) {
      // Dunas amplias que atraviesan las celdas. La luz se reparte con
      // halos suaves (sin costuras en los bordes de cada sector).
      for (let hy = Math.floor(y0 / 168) * 168; hy < y1 + 168; hy += 168) {
        for (let hx = Math.floor(x0 / 168) * 168; hx < x1 + 168; hx += 168) {
          const th = hashTile(hx >> 4, hy >> 4);
          const px = hx + (th % 120);
          const py = hy + ((th >> 8) % 120);
          const rad = 80 + ((th >> 3) % 60);
          if (th & 1) {
            groundHalo(ctx, px, py, rad, rad * 0.34, '255, 246, 210', 0.16);
          } else {
            groundHalo(ctx, px, py, rad, rad * 0.3, '160, 120, 60', 0.1);
          }
        }
      }

      // Ondulaciones eólicas continuas: 1 px de luz sobre 1 px de sombra.
      const ripStep = 19;
      const segStep = 26;
      for (let gy = Math.floor(y0 / ripStep) * ripStep + 6; gy < y1; gy += ripStep) {
        for (let gx = Math.floor(x0 / segStep) * segStep; gx < x1; gx += segStep) {
          const th = hashTile(gx >> 2, gy);
          if (th % 10 < 4) continue;
          const len = 8 + (th % 8);
          const dy = ((th >> 5) % 3) - 1;
          const sx = Math.max(x0, gx);
          const ex = Math.min(x1, gx + len);
          if (ex <= sx) continue;
          ctx.fillStyle = 'rgba(166, 126, 66, 0.17)';
          ctx.fillRect(sx, gy + 1 + dy, ex - sx, 1);
          ctx.fillStyle = 'rgba(255, 245, 210, 0.34)';
          ctx.fillRect(sx, gy + dy, Math.max(1, ex - sx - 1), 1);
        }
      }

      // Mica y granos sueltos sobre la arena.
      for (let gy = Math.floor(y0 / 29) * 29; gy < y1; gy += 29) {
        for (let gx = Math.floor(x0 / 29) * 29; gx < x1; gx += 29) {
          const th = hashTile(gx + 11, gy - 7);
          if (th % 10 < 7) continue;
          ctx.fillStyle = (th & 1) === 0 ? 'rgba(255, 252, 232, 0.6)' : 'rgba(150, 112, 58, 0.3)';
          ctx.fillRect(gx + (th % 7), gy + ((th >> 5) % 7), 1, 1);
        }
      }
    } else {
      // EMPEDRADO: desgaste amplio, polvo y musgo entre juntas.
      for (let hy = Math.floor(y0 / 176) * 176; hy < y1 + 176; hy += 176) {
        for (let hx = Math.floor(x0 / 176) * 176; hx < x1 + 176; hx += 176) {
          const th = hashTile(hx >> 4, hy >> 4);
          const px = hx + (th % 110);
          const py = hy + ((th >> 8) % 100);
          const rad = 70 + ((th >> 3) % 46);
          if (th & 1) {
            groundHalo(ctx, px, py, rad, rad * 0.4, '255, 244, 204', 0.09);
          } else {
            groundHalo(ctx, px, py, rad, rad * 0.36, '52, 44, 32', 0.07);
          }
        }
      }

      // Grietas finas de lajas y restos de polvo.
      for (let gy = Math.floor(y0 / 31) * 31; gy < y1; gy += 31) {
        for (let gx = Math.floor(x0 / 31) * 31; gx < x1; gx += 31) {
          const th = hashTile(gx - 5, gy + 9);
          if (th % 10 < 8) continue;
          ctx.fillStyle = (th & 1) === 0 ? 'rgba(78, 64, 42, 0.26)' : 'rgba(255, 246, 218, 0.26)';
          ctx.fillRect(gx + (th % 6), gy + ((th >> 4) % 6), 2, 1);
        }
      }
    }

    ctx.restore();
  }
}

/**
 * Canal de la cala: separa visualmente la playa de llegada del asentamiento.
 * El puente levadizo desciende con peso mecánico cuando se instala el engranaje.
 */
function drawOrigenCalaCanal(
  ctx: CanvasRenderingContext2D,
  bridgeOpen: boolean,
  bridgeProgress: number,
  elapsed: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  const { x1, x2, y1, y2, bridgeX1, bridgeX2 } = ORIGEN_CALA_CANAL;
  if (!isWorldBoxVisible(x1 - 12, y1 - 22, x2 - x1 + 24, y2 - y1 + 44, camX, camY, vw, vh)) {
    return;
  }

  const smooth = (t: number) => t * t * (3 - 2 * t);
  const ease = smooth(Math.max(0, Math.min(1, bridgeProgress)));
  const still = Math.floor(elapsed * 1000);

  // 1. Trinchera excavada en la roca y lecho profundo.
  ctx.fillStyle = '#050d16';
  ctx.fillRect(x1 - 3, y1 - 7, x2 - x1 + 6, y2 - y1 + 14);
  const water = ctx.createLinearGradient(0, y1, 0, y2);
  water.addColorStop(0, '#0b3550');
  water.addColorStop(0.42, '#0e4a68');
  water.addColorStop(0.72, '#0a3550');
  water.addColorStop(1, '#072238');
  ctx.fillStyle = water;
  ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

  // 2. Corriente: franjas largas desplazadas, espuma y reflejos del atardecer.
  ctx.save();
  ctx.beginPath();
  ctx.rect(x1, y1, x2 - x1, y2 - y1);
  ctx.clip();
  const wave = still * 0.018;
  for (let wy = y1 + 2; wy < y2; wy += 5) {
    for (let wx = x1 + 2; wx < x2; wx += 26) {
      const offset = ((wx + wave * 18 + (wy - y1) * 9) % 26) - 6;
      const depth = (wy - y1) / Math.max(1, y2 - y1);
      ctx.fillStyle =
        depth < 0.33
          ? 'rgba(125, 211, 252, 0.28)'
          : depth > 0.7
          ? 'rgba(56, 189, 248, 0.16)'
          : 'rgba(186, 230, 253, 0.22)';
      ctx.fillRect(wx + offset, wy, 12 + ((wx >> 3) % 6), 1);
      if ((wx + wy) % 3 === 0) {
        ctx.fillStyle = 'rgba(224, 255, 252, 0.45)';
        ctx.fillRect(wx + offset + 4, wy, 3, 1);
      }
    }
  }
  // Destellos cálidos del sol bajo sobre el agua.
  for (let gx = x1 + 30; gx < x2 - 20; gx += 74) {
    const flicker = Math.sin(elapsed * 1.9 + gx * 0.02) > 0.55;
    if (!flicker) continue;
    ctx.fillStyle = 'rgba(253, 224, 171, 0.5)';
    ctx.fillRect(gx, y1 + 7 + ((gx >> 2) % 10), 8, 1);
  }
  ctx.restore();

  // 3. Márgenes de piedra tallada con musgo y desgaste.
  const bankBlock = 16;
  for (let bx = x1; bx < x2; bx += bankBlock) {
    const th = hashTile(bx, y1);
    ctx.fillStyle = th % 3 === 0 ? '#6b5a3e' : th % 3 === 1 ? '#7d6a49' : '#5d4d35';
    ctx.fillRect(bx, y1 - 5, Math.min(bankBlock, x2 - bx), 5);
    ctx.fillStyle = 'rgba(255, 241, 208, 0.4)';
    ctx.fillRect(bx + 1, y1 - 5, Math.min(bankBlock, x2 - bx) - 2, 1);
    ctx.fillStyle = th % 4 === 0 ? '#4f6b3a' : '#3f5430';
    ctx.fillRect(bx + 2, y1 - 6, 4 + (th % 4), 1);

    const th2 = hashTile(bx + 7, y2);
    ctx.fillStyle = th2 % 3 === 0 ? '#6b5a3e' : th2 % 3 === 1 ? '#7d6a49' : '#5d4d35';
    ctx.fillRect(bx, y2, Math.min(bankBlock, x2 - bx), 5);
    ctx.fillStyle = 'rgba(255, 241, 208, 0.34)';
    ctx.fillRect(bx + 1, y2, Math.min(bankBlock, x2 - bx) - 2, 1);
    ctx.fillStyle = th2 % 4 === 0 ? '#4f6b3a' : '#3f5430';
    ctx.fillRect(bx + 3, y2 + 4, 4 + (th2 % 3), 1);
  }
  // Espuma fija en ambas orillas.
  ctx.fillStyle = 'rgba(224, 255, 252, 0.68)';
  for (let fx = x1; fx < x2; fx += 13) {
    const wobble = Math.sin(elapsed * 2.4 + fx * 0.09) * 1.4;
    ctx.fillRect(fx, y1 + 1 + wobble, 5, 1);
    ctx.fillRect(fx + 6, y2 - 2 - wobble, 4, 1);
  }

  // 4. Juncos y rocas puntuales en los extremos del canal.
  const reeds = [
    { x: x1 + 12, y: y1 - 2 },
    { x: x2 - 18, y: y2 + 1 },
    { x: x1 + 28, y: y2 + 3 },
  ];
  for (const r of reeds) {
    ctx.fillStyle = '#3f5430';
    ctx.fillRect(r.x, r.y - 7, 1, 9);
    ctx.fillRect(r.x + 3, r.y - 9, 1, 11);
    ctx.fillStyle = '#7c8f4d';
    ctx.fillRect(r.x + 1, r.y - 9, 1, 3);
  }

  if (bridgeOpen) {
    // 5. Pasarela de tablones. Durante la animación se despliega desde la
    // orilla norte: primero asoma el canto, después gana longitud y peso.
    const fullTop = y1 - 10;
    const fullH = y2 - y1 + 20;
    const deckH = Math.max(3, Math.round(fullH * ease));
    const deckTop = fullTop;
    const deckBottom = deckTop + deckH;

    // Sombra proyectada sobre el agua.
    ctx.fillStyle = 'rgba(2, 10, 16, 0.35)';
    ctx.fillRect(bridgeX1 + 4, deckTop + 3, bridgeX2 - bridgeX1, deckH + 2);

    // Estribos de piedra en ambas orillas.
    ctx.fillStyle = '#51432d';
    ctx.fillRect(bridgeX1 - 8, y1 - 8, 16, 7);
    ctx.fillRect(bridgeX2 - 8, y1 - 8, 16, 7);
    ctx.fillRect(bridgeX1 - 8, y2 + 2, 16, 7);
    ctx.fillRect(bridgeX2 - 8, y2 + 2, 16, 7);
    ctx.fillStyle = '#a08a5e';
    ctx.fillRect(bridgeX1 - 8, y1 - 8, 16, 2);
    ctx.fillRect(bridgeX2 - 8, y1 - 8, 16, 2);
    ctx.fillRect(bridgeX1 - 8, y2 + 2, 16, 2);
    ctx.fillRect(bridgeX2 - 8, y2 + 2, 16, 2);

    // Vigas longitudinales bajo el piso.
    ctx.fillStyle = '#2a1a0c';
    ctx.fillRect(bridgeX1 + 2, deckTop, 7, deckH);
    ctx.fillRect(bridgeX2 - 9, deckTop, 7, deckH);
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(bridgeX1 + 3, deckTop, 5, deckH);
    ctx.fillRect(bridgeX2 - 8, deckTop, 5, deckH);

    // Tablones transversales con vetas y clavos.
    for (let by = deckTop + 1; by < deckBottom - 1; by += 6) {
      const th = hashTile(Math.round(by), bridgeX1);
      ctx.fillStyle = th % 3 === 0 ? '#9c6b35' : th % 3 === 1 ? '#8a5a2c' : '#a8763d';
      ctx.fillRect(bridgeX1 + 5, by, bridgeX2 - bridgeX1 - 10, 5);
      ctx.fillStyle = 'rgba(255, 224, 164, 0.35)';
      ctx.fillRect(bridgeX1 + 6, by, bridgeX2 - bridgeX1 - 12, 1);
      ctx.fillStyle = 'rgba(58, 34, 14, 0.5)';
      ctx.fillRect(bridgeX1 + 6, by + 4, bridgeX2 - bridgeX1 - 12, 1);
      if (th % 4 === 0) {
        ctx.fillStyle = 'rgba(60, 40, 20, 0.5)';
        ctx.fillRect(bridgeX1 + 14 + (th % 30), by + 2, 5, 1);
      }
      ctx.fillStyle = '#3b2614';
      ctx.fillRect(bridgeX1 + 9, by + 1, 1, 1);
      ctx.fillRect(bridgeX2 - 11, by + 3, 1, 1);
    }

    // Barandas: postes de hierro y cables tensos a ambos lados.
    const railTop = deckTop + 2;
    const railBottom = deckBottom - 2;
    for (const rx of [bridgeX1 + 1, bridgeX2 - 4]) {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(rx, railTop, 3, Math.max(2, railBottom - railTop));
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx, railTop, 1, Math.max(2, railBottom - railTop));
      for (let py = railTop + 2; py < railBottom; py += 14) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rx - 1, py, 5, 4);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(rx, py, 3, 1);
      }
    }
    // Cable superior con leve comba.
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.lineWidth = 1;
    for (const rx of [bridgeX1 + 2, bridgeX2 - 3]) {
      ctx.beginPath();
      ctx.moveTo(rx, railTop);
      ctx.quadraticCurveTo(rx - 1.5, (railTop + railBottom) / 2, rx, railBottom);
      ctx.stroke();
    }

    // Faroles en los extremos del puente.
    for (const lx of [bridgeX1 - 6, bridgeX2 + 6]) {
      ctx.fillStyle = '#2b2118';
      ctx.fillRect(lx - 1, y2 + 1, 2, 9);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(lx - 2, y2 - 1, 4, 3);
      ctx.fillStyle = 'rgba(253, 230, 138, 0.24)';
      ctx.fillRect(lx - 5, y2 - 3, 10, 7);
    }

    // Cadenas y polvo mientras el puente baja.
    if (ease < 0.999) {
      const chainSwing = Math.sin(elapsed * 9) * 2;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      for (const cx of [bridgeX1 + 10, bridgeX2 - 10]) {
        ctx.beginPath();
        ctx.moveTo(cx, y1 - 12);
        ctx.quadraticCurveTo(cx + chainSwing, (y1 + deckBottom) / 2, cx, deckBottom - 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(214, 178, 120, 0.55)';
      for (let d = 0; d < 7; d++) {
        const px = bridgeX1 + 24 + ((still >> 4) + d * 37) % Math.max(1, bridgeX2 - bridgeX1 - 48);
        const py = deckBottom - 1 - ((still >> 3) + d * 11) % 14;
        ctx.fillRect(px, py, 2, 2);
      }
    } else {
      // Polvo asentado en los estribos al terminar.
      ctx.fillStyle = 'rgba(214, 190, 140, 0.22)';
      ctx.fillRect(bridgeX1 - 10, y2 + 6, 24, 2);
      ctx.fillRect(bridgeX2 - 14, y2 + 6, 24, 2);
    }
  } else {
    // 6. Puente roto: muñones de tablones, cadenas colgantes y hueco abierto.
    ctx.fillStyle = '#3a2412';
    ctx.fillRect(bridgeX1 - 2, y1 - 8, 18, 13);
    ctx.fillRect(bridgeX2 - 16, y1 - 8, 18, 13);
    ctx.fillRect(bridgeX1 - 2, y2 - 5, 14, 11);
    ctx.fillRect(bridgeX2 - 12, y2 - 5, 14, 11);
    for (let sx = 0; sx < 3; sx++) {
      ctx.fillStyle = sx % 2 === 0 ? '#8a5a2c' : '#a8763d';
      ctx.fillRect(bridgeX1 + 2 + sx * 5, y1 - 6, 4, 10 - sx);
      ctx.fillRect(bridgeX2 - 8 - sx * 5, y2 - 4, 4, 9 - sx);
    }
    // Cadenas partidas meciéndose sobre el agua.
    const swing = Math.sin(elapsed * 1.7) * 2;
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bridgeX1 + 12, y1 - 4);
    ctx.quadraticCurveTo(bridgeX1 + 20 + swing, y1 + 12, bridgeX1 + 14, y1 + 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bridgeX2 - 12, y2 + 2);
    ctx.quadraticCurveTo(bridgeX2 - 20 + swing, y2 - 10, bridgeX2 - 16, y2 - 20);
    ctx.stroke();
    ctx.fillStyle = 'rgba(248, 113, 113, 0.5)';
    ctx.fillRect((bridgeX1 + bridgeX2) / 2 - 1, y1 + 13, 2, 2);
  }
}

/** Muelle de llegada: tablones sobre pilotes, amarras y una barca amarrada. */
function drawOrigenArrivalDock(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  const { x, y, w, h } = ISLAND_PIER_SPEC;
  if (!isWorldBoxVisible(x - 12, y - 8, w + 24, h + 40, camX, camY, vw, vh)) return;

  const deckX = x + 22;
  const deckW = w - 44;
  const deckTop = y + 8;
  const deckBottom = y + h + 18;

  // Sombra profunda del muelle sobre el agua.
  ctx.fillStyle = 'rgba(3, 12, 20, 0.42)';
  ctx.fillRect(deckX + 6, deckTop + 6, deckW, deckBottom - deckTop);

  // Pilotes con reflejo oscuro y anillos de espuma.
  for (let py = deckTop + 8; py <= deckBottom; py += 34) {
    for (const px of [deckX - 4, deckX + deckW]) {
      ctx.fillStyle = '#2a1a0e';
      ctx.fillRect(px, py, 6, 26);
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(px + 1, py, 4, 24);
      ctx.fillStyle = '#8a5a2c';
      ctx.fillRect(px + 1, py, 2, 3);
      ctx.fillStyle = 'rgba(224, 255, 252, 0.28)';
      ctx.fillRect(px - 3, py + 24, 12, 1);
    }
  }

  // Vigas de sostén y tablones transversales.
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(deckX, deckTop, deckW, deckBottom - deckTop);
  for (let by = deckTop; by < deckBottom; by += 7) {
    const th = hashTile(Math.round(by), deckX);
    ctx.fillStyle = th % 3 === 0 ? '#a8763d' : th % 3 === 1 ? '#94652f' : '#b5854a';
    ctx.fillRect(deckX + 2, by, deckW - 4, 6);
    ctx.fillStyle = 'rgba(255, 230, 176, 0.3)';
    ctx.fillRect(deckX + 3, by, deckW - 6, 1);
    ctx.fillStyle = 'rgba(52, 30, 12, 0.55)';
    ctx.fillRect(deckX + 3, by + 5, deckW - 6, 1);
    if (th % 5 === 0) {
      ctx.fillStyle = 'rgba(58, 40, 20, 0.45)';
      ctx.fillRect(deckX + 10 + (th % 40), by + 2, 8, 1);
    }
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(deckX + 1, by + 1, 1, 1);
    ctx.fillRect(deckX + deckW - 2, by + 4, 1, 1);
  }

  // Largueros laterales que enmarcan la pasarela y evitan el aspecto de escalera.
  ctx.fillStyle = 'rgba(52, 32, 16, 0.92)';
  ctx.fillRect(deckX, deckTop, 3, deckBottom - deckTop);
  ctx.fillRect(deckX + deckW - 3, deckTop, 3, deckBottom - deckTop);
  ctx.fillStyle = 'rgba(226, 184, 122, 0.4)';
  ctx.fillRect(deckX + 1, deckTop + 1, 1, deckBottom - deckTop - 2);
  ctx.fillRect(deckX + deckW - 2, deckTop + 1, 1, deckBottom - deckTop - 2);

  // Travesaños de refuerzo y pernos de hierro sobre la madera.
  for (let sy = deckTop + 26; sy < deckBottom - 10; sy += 48) {
    ctx.fillStyle = 'rgba(44, 27, 14, 0.7)';
    ctx.fillRect(deckX + 3, sy, deckW - 6, 2);
    ctx.fillStyle = 'rgba(186, 196, 204, 0.55)';
    ctx.fillRect(deckX + 6, sy - 1, 1, 1);
    ctx.fillRect(deckX + deckW - 7, sy - 1, 1, 1);
  }

  // Postes de amarre y cabos en el extremo del muelle.
  for (const bx of [deckX + 6, deckX + deckW - 10]) {
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(bx, deckBottom - 16, 5, 14);
    ctx.fillStyle = '#8a5a2c';
    ctx.fillRect(bx + 1, deckBottom - 16, 3, 12);
    ctx.fillStyle = '#d9b878';
    ctx.fillRect(bx - 1, deckBottom - 18, 7, 3);
  }
  ctx.strokeStyle = '#c2a06a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(deckX + 9, deckBottom - 10);
  ctx.quadraticCurveTo(deckX + 26, deckBottom + 10, deckX + 42, deckBottom - 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(deckX + deckW - 8, deckBottom - 10);
  ctx.quadraticCurveTo(deckX + deckW - 20, deckBottom + 8, deckX + deckW - 30, deckBottom - 2);
  ctx.stroke();

  // Barandas de soga con postes cortos en los laterales.
  for (const rx of [deckX - 2, deckX + deckW - 1]) {
    for (let ry = deckTop + 10; ry < deckBottom - 20; ry += 38) {
      ctx.fillStyle = '#2b2118';
      ctx.fillRect(rx, ry, 3, 10);
      ctx.fillStyle = '#8a5a2c';
      ctx.fillRect(rx, ry, 3, 2);
    }
    ctx.strokeStyle = 'rgba(194, 160, 106, 0.75)';
    ctx.beginPath();
    ctx.moveTo(rx + 1, deckTop + 8);
    ctx.quadraticCurveTo(rx - 2, (deckTop + deckBottom) / 2, rx + 1, deckBottom - 18);
    ctx.stroke();
  }

  // Caja de pertrechos y farol junto al acceso de arena.
  const crateX = deckX - 15;
  const crateY = deckTop + 18;
  ctx.fillStyle = 'rgba(3, 12, 20, 0.35)';
  ctx.fillRect(crateX + 2, crateY + 12, 16, 4);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(crateX, crateY, 15, 14);
  ctx.fillStyle = '#8a5a2c';
  ctx.fillRect(crateX + 1, crateY + 1, 13, 12);
  ctx.fillStyle = '#5c3a1e';
  ctx.fillRect(crateX + 1, crateY + 6, 13, 2);
  ctx.fillStyle = '#d9b878';
  ctx.fillRect(crateX + 6, crateY + 2, 3, 10);

  ctx.fillStyle = '#2b2118';
  ctx.fillRect(deckX + deckW - 6, deckTop + 8, 2, 11);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(deckX + deckW - 8, deckTop + 5, 5, 4);
  ctx.fillStyle = 'rgba(253, 230, 138, 0.2)';
  ctx.fillRect(deckX + deckW - 12, deckTop + 2, 13, 10);

  // Barca de remos amarrada al este del muelle, meciéndose sobre el agua.
  const boatX = deckX + deckW + 12;
  const boatY = deckBottom - 44;
  const bob = Math.sin(elapsed * 1.6) * 1.4;
  const roll = Math.sin(elapsed * 1.6 + 0.7) * 0.03;
  ctx.save();
  ctx.translate(boatX + 23, boatY + 9 + bob);
  ctx.rotate(roll);
  // Sombra del casco sobre el agua.
  ctx.fillStyle = 'rgba(3, 12, 20, 0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 30, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Casco con proa y popa apuntadas.
  ctx.fillStyle = '#5a3a1c';
  ctx.beginPath();
  ctx.moveTo(-24, -3);
  ctx.lineTo(-18, -9);
  ctx.lineTo(16, -9);
  ctx.lineTo(24, -3);
  ctx.lineTo(20, 7);
  ctx.lineTo(-20, 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a5a2c';
  ctx.beginPath();
  ctx.moveTo(-20, -4);
  ctx.lineTo(-15, -7);
  ctx.lineTo(14, -7);
  ctx.lineTo(20, -4);
  ctx.lineTo(17, 4);
  ctx.lineTo(-17, 4);
  ctx.closePath();
  ctx.fill();
  // Interior hueco, bancos y remos cruzados.
  ctx.fillStyle = '#2e1c0e';
  ctx.fillRect(-14, -5, 28, 8);
  ctx.fillStyle = '#c2924f';
  ctx.fillRect(-11, 0, 22, 2);
  ctx.fillRect(-13, -5, 2, 8);
  ctx.fillRect(11, -5, 2, 8);
  ctx.strokeStyle = '#d9b878';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-20, -6);
  ctx.lineTo(22, -2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-19, 3);
  ctx.lineTo(20, 6);
  ctx.stroke();
  ctx.restore();
  // Cabo desde la proa hasta un poste del muelle.
  ctx.strokeStyle = '#c2a06a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boatX - 2, boatY + 6 + bob);
  ctx.quadraticCurveTo(deckX + deckW + 2, boatY - 2 + bob, deckX + deckW - 2, deckBottom - 20);
  ctx.stroke();

  // Espuma alrededor de los pilotes y de la barca.
  ctx.fillStyle = 'rgba(224, 255, 252, 0.34)';
  for (let fx = deckX; fx < deckX + deckW; fx += 18) {
    const wob = Math.sin(elapsed * 2.2 + fx * 0.11) * 1.2;
    ctx.fillRect(fx, deckBottom + 2 + wob, 7, 1);
  }
  ctx.fillRect(boatX - 4, boatY + 12 + bob, 12, 1);
  ctx.fillRect(boatX + 34, boatY + 12 + bob, 12, 1);
}

/** Detalles costeros de la cala: rocas, hierba de playa y huellas hacia el puente. */
function drawOrigenCalaDressing(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  if (!isWorldBoxVisible(180, 1840, 760, 420, camX, camY, vw, vh)) return;

  // Rocas erosionadas y charcos de marea en los bordes de la cala.
  const rocks = [
    { x: 232, y: 2148, r: 9 },
    { x: 250, y: 2170, r: 6 },
    { x: 842, y: 2128, r: 8 },
    { x: 856, y: 2160, r: 5 },
    { x: 366, y: 1892, r: 5 },
  ];
  for (const rock of rocks) {
    ctx.fillStyle = 'rgba(16, 24, 30, 0.35)';
    ctx.fillRect(rock.x - rock.r, rock.y + rock.r - 2, rock.r * 2, 3);
    ctx.fillStyle = '#5b5a52';
    ctx.fillRect(rock.x - rock.r, rock.y - rock.r / 2, rock.r * 2, rock.r);
    ctx.fillStyle = '#82806f';
    ctx.fillRect(rock.x - rock.r + 2, rock.y - rock.r / 2, rock.r * 2 - 4, 2);
    ctx.fillStyle = '#3f5430';
    ctx.fillRect(rock.x - 2, rock.y - rock.r / 2, 4, 1);
  }

  // Hierba de playa: matas cortas mecidas por la brisa.
  for (let gx = 240; gx < 860; gx += 29) {
    const th = hashTile(gx, 2170);
    if (th % 3 === 0) continue;
    const sway = Math.sin(elapsed * 1.4 + gx * 0.07) * 1.2;
    ctx.fillStyle = '#4f6b3a';
    ctx.fillRect(gx + sway, 2172, 1, 5);
    ctx.fillRect(gx + 3 + sway, 2170, 1, 7);
    ctx.fillStyle = '#7c8f4d';
    ctx.fillRect(gx + 1 + sway, 2172, 1, 3);
  }

  // Troncos arrastrados por la marea (fuera del paso del muelle).
  ctx.fillStyle = 'rgba(20, 24, 22, 0.35)';
  ctx.fillRect(790, 2182, 46, 5);
  ctx.fillStyle = '#6b5638';
  ctx.fillRect(786, 2178, 48, 6);
  ctx.fillStyle = '#8d744c';
  ctx.fillRect(788, 2178, 42, 2);
  ctx.fillStyle = '#4a3a24';
  ctx.fillRect(820, 2180, 10, 1);

  // Huellas de botas desde el muelle hacia el puente, sobre arena húmeda.
  ctx.fillStyle = 'rgba(92, 72, 42, 0.4)';
  for (let i = 0; i < 9; i++) {
    const py = 2050 - i * 19;
    const side = i % 2 === 0 ? -3 : 3;
    ctx.fillRect(458 + side, py, 3, 2);
  }

  // Destellos de marea sobre la arena mojada.
  for (let i = 0; i < 7; i++) {
    const shimmer = Math.sin(elapsed * 1.8 + i * 1.9) > 0.5;
    if (!shimmer) continue;
    ctx.fillStyle = 'rgba(255, 248, 220, 0.5)';
    ctx.fillRect(300 + i * 78, 2034 + (i % 3) * 22, 5, 1);
  }
}

/** Gabinete original del desafío «Cruce de Circuitos» en el bosque. */
function drawCircuitoAnfibioCabinetWorld(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  active: boolean,
  cleared: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  const glow = cleared ? 0.5 + Math.sin(elapsed * 2.4) * 0.16 : 0;

  // Sombra de contacto.
  ctx.fillStyle = 'rgba(5, 8, 14, 0.5)';
  ctx.fillRect(-27, 2, 54, 8);

  // Cuerpo de madera con moldura en T verde.
  ctx.fillStyle = '#0b111b';
  ctx.fillRect(-25, -66, 50, 68);
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(-24, -64, 48, 66);
  ctx.fillStyle = '#5b3a1d';
  ctx.fillRect(-22, -62, 44, 62);
  ctx.fillStyle = '#8a5a2c';
  ctx.fillRect(-22, -62, 3, 62);
  ctx.fillStyle = '#3b2412';
  ctx.fillRect(19, -62, 3, 62);
  // Moldura verde en T de los laterales.
  ctx.fillStyle = '#1f8a5c';
  ctx.fillRect(-22, -62, 2, 62);
  ctx.fillRect(20, -62, 2, 62);
  ctx.fillStyle = '#7ef0b0';
  ctx.fillRect(-22, -62, 1, 62);
  // Arte lateral estrellado.
  ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
  for (let i = 0; i < 5; i++) {
    const sy = -58 + i * 11;
    ctx.fillRect(-21, sy, 2, 3);
    ctx.fillRect(19, sy + 4, 2, 3);
  }

  // Marquesina retroiluminada.
  ctx.fillStyle = '#071018';
  ctx.fillRect(-20, -61, 40, 16);
  ctx.fillStyle = cleared ? '#bbf7d0' : active ? '#fde047' : '#334155';
  ctx.fillRect(-18, -59, 36, 12);
  ctx.fillStyle = cleared ? '#14532d' : active ? '#7c2d12' : '#1e293b';
  ctx.fillRect(-16, -57, 32, 8);
  ctx.fillStyle = cleared ? '#dcfce7' : active ? '#fef3c7' : '#94a3b8';
  ctx.font = '900 6px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CRUCE 79', 0, -50.5);
  ctx.fillStyle = cleared ? '#4ade80' : active ? '#fbbf24' : '#475569';
  ctx.fillRect(-16, -57, 32, 1);

  // Bisel de la pantalla.
  ctx.fillStyle = '#050a12';
  ctx.fillRect(-19, -44, 38, 28);
  ctx.fillStyle = '#0e1c2b';
  ctx.fillRect(-17, -42, 34, 24);
  ctx.fillStyle = active ? '#082536' : '#0b111b';
  ctx.fillRect(-16, -41, 32, 22);

  if (active) {
    // Mini escena jugable: río, mediana y carretera.
    const scr = -41;
    ctx.fillStyle = '#0b3d4a';
    ctx.fillRect(-16, scr, 32, 9);
    ctx.fillStyle = '#0e4c5c';
    for (let w = 0; w < 4; w++) {
      const wx2 = -16 + ((elapsed * 10 + w * 9) % 32);
      ctx.fillRect(wx2, scr + 2 + (w % 2) * 4, 5, 1);
    }
    ctx.fillStyle = '#123a26';
    ctx.fillRect(-16, scr + 9, 32, 4);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(-16, scr + 13, 32, 9);
    for (let lane = 0; lane < 2; lane++) {
      const ly = scr + 15 + lane * 4;
      ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
      for (let dx = -16; dx < 16; dx += 8) ctx.fillRect(dx, ly, 4, 1);
      const carX = -16 + ((elapsed * (16 + lane * 8) + lane * 17) % 32);
      ctx.fillStyle = lane === 1 ? '#f87171' : '#e2e8f0';
      ctx.fillRect(carX, ly - 2, 5, 2);
    }
    // Anfibio de píxeles en la mediana.
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(-2, scr + 9, 4, 3);
    ctx.fillStyle = '#052e16';
    ctx.fillRect(-1, scr + 10, 1, 1);
    ctx.fillRect(1, scr + 10, 1, 1);
    // Pilotos de los tres puertos.
    ctx.fillStyle = '#86efac';
    ctx.fillRect(-13, -39, 3, 1);
    ctx.fillRect(-1, -39, 3, 1);
    ctx.fillRect(11, -39, 3, 1);
  } else {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
    ctx.fillRect(-13, -34, 26, 1);
    ctx.fillRect(-13, -28, 18, 1);
    ctx.fillStyle = '#475569';
    ctx.font = '700 5px "JetBrains Mono", monospace';
    ctx.fillText('SIN SEÑAL', 0, -30);
  }
  // Reflejo de pantalla.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.beginPath();
  ctx.moveTo(-15, -40);
  ctx.lineTo(-3, -40);
  ctx.lineTo(-12, -20);
  ctx.lineTo(-15, -20);
  ctx.closePath();
  ctx.fill();
  if (cleared) {
    ctx.fillStyle = `rgba(74, 222, 128, ${glow.toFixed(2)})`;
    ctx.fillRect(-18, -44, 36, 1);
    ctx.fillRect(-18, -17, 36, 1);
  }

  // Panel de control con joystick y botones.
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(-19, -16, 38, 9);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-18, -15, 36, 7);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-11, -14, 2, 5);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-12, -15, 4, 2);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(2, -13, 4, 3);
  ctx.fillStyle = '#fca5a5';
  ctx.fillRect(3, -14, 2, 1);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(9, -13, 4, 3);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(10, -14, 2, 1);

  // Monedero doble y rejilla de sonido.
  ctx.fillStyle = '#071018';
  ctx.fillRect(-10, -6, 20, 8);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-9, -5, 18, 6);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-7, -4, 2, 2);
  ctx.fillRect(5, -4, 2, 2);
  ctx.fillStyle = '#0b111b';
  ctx.fillRect(-5, -1, 10, 1);
  ctx.fillStyle = '#334155';
  for (let g = 0; g < 5; g++) {
    ctx.fillRect(-16 + g * 2, -10, 1, 2);
  }

  ctx.restore();
}

/**
 * Compuerta del Sector 03: una reja de haces láser heredada del sistema de
 * seguridad. No es un cartel ni una puerta: es una alarma que sigue encendida
 * desde el Reinicio Cero. Al accionar la palanca se apaga haz por haz.
 */
function drawOrigenSectorGate(
  ctx: CanvasRenderingContext2D,
  open: boolean,
  shutdown: number,
  elapsed: number,
  camX: number,
  camY: number,
  vw: number,
  vh: number
): void {
  const { x1, x2, y1, y2 } = ORIGEN_SECTOR_GATE;
  if (!isWorldBoxVisible(x1 - 46, y1 - 30, x2 - x1 + 92, y2 - y1 + 60, camX, camY, vw, vh)) {
    return;
  }
  const midX = (x1 + x2) / 2;
  const progress = Math.max(0, Math.min(1, shutdown));
  const powered = !open && progress < 0.999;

  // Marcas de calor en el suelo bajo la reja: el láser lleva años encendido.
  ctx.fillStyle = 'rgba(24, 12, 12, 0.55)';
  ctx.fillRect(x1 + 6, y1 + 20, x2 - x1 - 12, y2 - y1 - 40);
  for (let sy = y1 + 26; sy < y2 - 26; sy += 26) {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.35)';
    ctx.fillRect(x1 + 8, sy, x2 - x1 - 16, 1);
  }

  // Pilares de anclaje: hormigón, acero y bobina de cobre del sistema viejo.
  for (const [idx, py] of [y1 + 10, y2 - 10].entries()) {
    const top = idx === 0;
    ctx.fillStyle = 'rgba(4, 7, 12, 0.5)';
    ctx.fillRect(midX - 16, py - 12, 32, 26);
    ctx.fillStyle = '#1b2433';
    ctx.fillRect(midX - 14, py - 13, 28, 26);
    ctx.fillStyle = '#3b4a5f';
    ctx.fillRect(midX - 14, py - 13, 28, 3);
    ctx.fillStyle = '#0d1420';
    ctx.fillRect(midX - 14, py + 9, 28, 4);
    // Bobina y aisladores.
    ctx.fillStyle = '#7c4a20';
    ctx.fillRect(midX - 9, py - 8, 18, 3);
    ctx.fillRect(midX - 9, py - 3, 18, 2);
    ctx.fillStyle = '#b8763a';
    ctx.fillRect(midX - 9, py - 8, 18, 1);
    // Lente emisora orientada al pasillo.
    ctx.fillStyle = '#050a12';
    ctx.fillRect(midX - 5, top ? py + 4 : py - 8, 10, 4);
    const lensCol = open
      ? '#0e7490'
      : powered
        ? Math.floor(elapsed * 9 + idx) % 3 === 0
          ? '#fecaca'
          : '#ef4444'
        : '#14532d';
    ctx.fillStyle = lensCol;
    ctx.fillRect(midX - 3, top ? py + 5 : py - 7, 6, 2);
    // Chapa de advertencia remachada.
    ctx.fillStyle = '#b45309';
    ctx.fillRect(midX - 12, py + 1, 10, 4);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(midX - 10, py + 2, 6, 2);
  }

  // Rieles laterales del sistema, con segmentos de cobre.
  for (const [railX, side] of [
    [x1 + 2, 1],
    [x2 - 4, -1],
  ] as const) {
    ctx.fillStyle = '#101a28';
    ctx.fillRect(railX, y1 + 24, 3, y2 - y1 - 48);
    ctx.fillStyle = side > 0 ? '#29445c' : '#1d3145';
    ctx.fillRect(railX, y1 + 24, 1, y2 - y1 - 48);
    for (let sy = y1 + 40; sy < y2 - 34; sy += 34) {
      ctx.fillStyle = '#8a5a2c';
      ctx.fillRect(railX, sy, 3, 5);
    }
  }

  if (powered) {
    const beamCount = 13;
    const top = y1 + 34;
    const bottom = y2 - 34;
    const step = (bottom - top) / (beamCount - 1);
    for (let i = 0; i < beamCount; i++) {
      const threshold = (beamCount - i) / beamCount;
      if (progress >= threshold) continue;
      const by = Math.round(top + i * step);
      const nearFailure = threshold - progress < 0.08;
      const flicker =
        nearFailure && !(Math.floor(elapsed * 26 + i * 3) % 3 === 0) ? 0.25 : 1;
      const pulse = (0.62 + Math.sin(elapsed * 6 + i * 0.7) * 0.16) * flicker;
      // Halo ancho, cuerpo y núcleo blanco.
      ctx.fillStyle = `rgba(239, 68, 68, ${(pulse * 0.2).toFixed(3)})`;
      ctx.fillRect(x1 + 8, by - 3, x2 - x1 - 16, 6);
      ctx.fillStyle = `rgba(248, 113, 113, ${pulse.toFixed(3)})`;
      ctx.fillRect(x1 + 8, by - 1, x2 - x1 - 16, 2);
      ctx.fillStyle = `rgba(254, 226, 226, ${(pulse * 0.9).toFixed(3)})`;
      ctx.fillRect(x1 + 10, by, x2 - x1 - 20, 1);
      // Nodos emisores en los rieles.
      ctx.fillStyle = '#fecaca';
      ctx.fillRect(x1 + 5, by - 1, 2, 2);
      ctx.fillRect(x2 - 7, by - 1, 2, 2);
    }

    // Chispas que caen cuando un haz acaba de ceder.
    if (progress > 0.02 && progress < 0.98) {
      const failedCount = Math.floor(progress * beamCount);
      for (let s = 0; s < 7; s++) {
        const f = (failedCount + s) % beamCount;
        const sy = top + f * step + ((elapsed * 22 + s * 13) % 18);
        const alpha = 0.5 - ((elapsed * 22 + s * 13) % 18) / 36;
        ctx.fillStyle = `rgba(253, 186, 116, ${Math.max(0, alpha).toFixed(3)})`;
        ctx.fillRect(midX - 9 + ((s * 7) % 18), sy, 1, 2);
      }
    }

    // Zumbido visual en la base: energía acumulada en el umbral.
    ctx.fillStyle = `rgba(239, 68, 68, ${(0.1 + Math.sin(elapsed * 3) * 0.04).toFixed(3)})`;
    ctx.fillRect(x1 - 4, y1 + 22, x2 - x1 + 8, y2 - y1 - 44);
  } else {
    // Reja apagada: sólo quedan los pilotos de reposo y el polvo ionizado.
    for (const py of [y1 + 10, y2 - 10]) {
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.fillRect(midX - 2, py - 1, 4, 2);
      ctx.fillStyle = 'rgba(165, 243, 252, 0.5)';
      ctx.fillRect(midX - 1, py - 8, 1, 6);
    }
    for (let d = 0; d < 9; d++) {
      const dx = x1 + 6 + ((d * 7 + Math.floor(elapsed * 5)) % (x2 - x1 - 12));
      const dy = y1 + 30 + ((d * 53 + Math.floor(elapsed * 9)) % (y2 - y1 - 60));
      ctx.fillStyle = 'rgba(103, 232, 249, 0.3)';
      ctx.fillRect(dx, dy, 1, 1);
    }
    // Barrido tenue del escáner en reposo.
    const sweepY = y1 + 30 + ((elapsed * 36) % (y2 - y1 - 60));
    ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.fillRect(x1 + 6, sweepY, x2 - x1 - 12, 2);
  }
}

/** Consola de la palanca que corta la alimentación del láser de seguridad. */
function drawOrigenLaserConsole(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  repaired: boolean,
  shutdown: boolean,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Sombra de contacto y pie de hormigón.
  ctx.fillStyle = 'rgba(4, 7, 12, 0.5)';
  ctx.fillRect(-13, 2, 34, 8);
  ctx.fillStyle = '#2b2f36';
  ctx.fillRect(-12, -3, 30, 8);
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(-12, -3, 30, 2);

  // Cuerpo de baquelita inclinado.
  ctx.fillStyle = '#0b111b';
  ctx.fillRect(-11, -24, 26, 22);
  ctx.fillStyle = '#1d2a36';
  ctx.fillRect(-10, -23, 24, 20);
  ctx.fillStyle = '#2f4453';
  ctx.fillRect(-10, -23, 24, 2);
  ctx.fillStyle = '#0d1620';
  ctx.fillRect(-10, -8, 24, 5);
  // Franjas de advertencia.
  for (let s = 0; s < 4; s++) {
    ctx.fillStyle = s % 2 === 0 ? '#b45309' : '#fbbf24';
    ctx.fillRect(-9 + s * 6, -6, 3, 2);
  }

  // Pantalla de estado.
  ctx.fillStyle = '#03110f';
  ctx.fillRect(-8, -21, 13, 8);
  const screenCol = shutdown ? '#22d3ee' : repaired ? '#86efac' : '#f87171';
  ctx.fillStyle = screenCol;
  const showText = shutdown || repaired ? 'OK' : 'ERR';
  ctx.font = '700 5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(showText, -1.5, -15.5);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-8, -20, 13, 1);

  // Palanca de bronce.
  const pulled = shutdown;
  const leverBaseX = 10;
  const tipX = pulled ? leverBaseX + 2 : leverBaseX + 4;
  const tipY = pulled ? -12 : -21;
  ctx.strokeStyle = '#0b111b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(leverBaseX, -16);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = '#c99a4b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(leverBaseX, -16);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.fillStyle = shutdown ? '#22c55e' : repaired ? '#f59e0b' : '#7f1d1d';
  ctx.fillRect(tipX - 1, tipY - 1, 4, 4);
  ctx.fillStyle = '#fde68a';
  ctx.fillRect(tipX, tipY, 1, 1);

  // Tres pilotos de contacto.
  const ledCols = shutdown
    ? ['#22d3ee', '#22d3ee', '#22d3ee']
    : repaired
      ? ['#4ade80', '#4ade80', '#fbbf24']
      : ['#ef4444', '#f97316', '#7f1d1d'];
  for (let i = 0; i < 3; i++) {
    const blink = !shutdown && !repaired && (Math.floor(elapsed * 3 + i) % 4 === 0) ? 0.35 : 1;
    ctx.fillStyle = ledCols[i];
    ctx.globalAlpha = blink;
    ctx.fillRect(-8 + i * 4, -11, 2, 2);
    ctx.globalAlpha = 1;
  }

  // Conexión de cobre hacia la compuerta.
  ctx.fillStyle = '#7c4a20';
  ctx.fillRect(15, -4, 16, 2);
  ctx.fillStyle = '#b8763a';
  ctx.fillRect(15, -4, 16, 1);

  // Contactos fríos: chispas intermitentes hasta que Dylan los suelde.
  if (!repaired && !shutdown) {
    const sparkSeed = Math.floor(elapsed * 8);
    for (let s = 0; s < 3; s++) {
      const th = hashTile(sparkSeed + s * 17, 91) % 100;
      if (th < 68) continue;
      ctx.fillStyle = th > 88 ? '#fef3c7' : '#fb923c';
      ctx.fillRect(8 + (th % 5), -13 + (th % 6), 1, 1);
    }
  }

  ctx.restore();
}

/** Restos de la instalación que el sistema de seguridad protegía. */
function drawOrigenSecurityRuins(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  ctx.save();
  ctx.translate(x, y);

  // Plataforma de hormigón agrietada y invadida por la vegetación.
  ctx.fillStyle = 'rgba(4, 7, 12, 0.45)';
  ctx.fillRect(-52, -2, 118, 14);
  ctx.fillStyle = '#3a3f44';
  ctx.fillRect(-50, -8, 114, 14);
  ctx.fillStyle = '#565f66';
  ctx.fillRect(-50, -8, 114, 2);
  ctx.fillStyle = '#24292e';
  ctx.fillRect(-50, 3, 114, 3);
  for (let cx = -46; cx < 60; cx += 17) {
    const th = hashTile(cx, 77) % 100;
    if (th < 46) continue;
    ctx.fillStyle = 'rgba(12, 15, 18, 0.6)';
    ctx.fillRect(cx, -7, 1, 4 + (th % 5));
  }

  // Muros truncos y hierros retorcidos.
  ctx.fillStyle = '#1c232a';
  ctx.fillRect(-46, -44, 20, 38);
  ctx.fillStyle = '#4b5560';
  ctx.fillRect(-44, -42, 16, 34);
  ctx.fillStyle = '#6b7681';
  ctx.fillRect(-44, -42, 16, 2);
  ctx.fillStyle = '#1c232a';
  ctx.fillRect(32, -32, 16, 26);
  ctx.fillStyle = '#4b5560';
  ctx.fillRect(34, -30, 12, 22);
  ctx.fillStyle = '#8d6b45';
  ctx.fillRect(-30, -50, 2, 14);
  ctx.fillRect(-26, -46, 1, 10);
  ctx.fillRect(28, -40, 1, 12);

  // Antena doblada con piloto de reposo.
  ctx.fillStyle = '#202a34';
  ctx.fillRect(8, -62, 3, 56);
  ctx.fillStyle = '#39505f';
  ctx.fillRect(8, -62, 1, 56);
  ctx.fillStyle = '#202a34';
  ctx.fillRect(8, -62, 12, 2);
  ctx.fillRect(18, -63, 2, 8);
  const standby = reducedMotion ? 0.6 : 0.35 + Math.sin(elapsed * 2.2) * 0.25;
  ctx.fillStyle = `rgba(248, 113, 113, ${standby.toFixed(2)})`;
  ctx.fillRect(19, -66, 2, 2);

  // Conductos de cobre que ya no zumban.
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(-46, -14, 66, 2);
  ctx.fillRect(-46, -14, 2, 8);
  ctx.fillStyle = '#a8733c';
  ctx.fillRect(-46, -14, 66, 1);
  ctx.fillStyle = '#4a2f18';
  for (let px = -42; px < 18; px += 12) {
    ctx.fillRect(px, -15, 2, 4);
  }

  // Hiedra y musgo sobre las placas.
  for (let i = 0; i < 22; i++) {
    const th = hashTile(i * 13 + 5, 41) % 100;
    const vx = -48 + (th * 109) / 100;
    const vy = -40 + ((hashTile(i * 7, 59) % 100) * 46) / 100;
    ctx.fillStyle = th > 62 ? '#2f6b34' : '#3f7d3a';
    ctx.fillRect(vx, vy, th > 86 ? 3 : 2, 2);
    if (th > 78) {
      ctx.fillStyle = '#6ba34a';
      ctx.fillRect(vx, vy, 1, 1);
    }
  }
  for (let i = 0; i < 8; i++) {
    const th = hashTile(i * 31, 13) % 100;
    ctx.fillStyle = 'rgba(74, 110, 52, 0.75)';
    ctx.fillRect(-50 + (th * 110) / 100, -9 + (th % 3), 4, 2);
  }

  // Panel de control semienterrado, con registro incompleto.
  ctx.fillStyle = 'rgba(4, 7, 12, 0.5)';
  ctx.fillRect(41, -15, 30, 18);
  ctx.fillStyle = '#0b111b';
  ctx.fillRect(43, -18, 26, 17);
  ctx.fillStyle = '#1f2d3a';
  ctx.fillRect(44, -17, 24, 15);
  ctx.fillStyle = '#2f4356';
  ctx.fillRect(44, -17, 24, 1);
  ctx.fillStyle = '#03110f';
  ctx.fillRect(46, -15, 15, 8);
  const panelFlicker = reducedMotion
    ? 0.55
    : 0.35 + Math.abs(Math.sin(elapsed * 3.7)) * 0.4;
  ctx.fillStyle = `rgba(34, 211, 238, ${panelFlicker.toFixed(2)})`;
  ctx.fillRect(48, -13, 11, 1);
  ctx.fillRect(48, -11, 7, 1);
  ctx.fillRect(48, -9, 9, 1);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
  ctx.fillRect(63, -14, 3, 2);
  // Teclas muertas.
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = k === 2 ? '#7f1d1d' : '#334155';
    ctx.fillRect(46 + k * 4, -5, 3, 2);
  }
  // Grieta térmica sobre el panel.
  ctx.strokeStyle = 'rgba(15, 18, 22, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(58, -18);
  ctx.lineTo(61, -11);
  ctx.lineTo(57, -4);
  ctx.stroke();

  ctx.restore();
}

/**
 * Lago del Bosque de las Señales: corta el paso directo hacia la orilla
 * opuesta, donde quedó la caja estanca con los transistores de germanio. Se
 * rodea por el este, entre juncos y un viejo embarcadero.
 */
function drawOrigenForestLake(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  froggerCleared = false
): void {
  const { x1, x2, y1, y2, islet } = ORIGEN_FOREST_LAKE;
  const w = x2 - x1;
  const h = y2 - y1;
  if (!isWorldBoxVisible(x1 - 40, y1 - 34, w + 80, h + 68, camX, camY, vw, vh)) return;

  const roundedRect = (
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    r: number,
    fill: string
  ) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.lineTo(rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.lineTo(rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.lineTo(rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.closePath();
    ctx.fill();
  };

  // Césped húmedo exterior y barro de la orilla.
  roundedRect(x1 - 9, y1 - 9, w + 18, h + 18, 22, '#2f4a24');
  roundedRect(x1 - 5, y1 - 5, w + 10, h + 10, 19, '#4a3a20');
  roundedRect(x1 - 2, y1 - 2, w + 4, h + 4, 17, '#6f5a32');

  // Espejo de agua con profundidad.
  roundedRect(x1, y1, w, h, 15, '#164554');
  roundedRect(x1 + 5, y1 + 5, w - 10, h - 10, 12, '#1c5a6b');
  roundedRect(x1 + 9, y1 + 9, w - 18, h - 18, 10, '#0f3a49');
  ctx.fillStyle = 'rgba(7, 26, 34, 0.75)';
  ctx.fillRect(x1 + 14, y1 + h * 0.58, w - 28, h * 0.26);

  // Brillo sesgado del claro y reflejos verticales del dosel.
  ctx.fillStyle = 'rgba(125, 211, 252, 0.1)';
  ctx.fillRect(x1 + 22, y1 + 12, w * 0.34, 4);
  ctx.fillRect(x1 + 58, y1 + 18, w * 0.2, 3);
  for (let i = 0; i < 7; i++) {
    const rx = x1 + 26 + i * 33;
    const rh = 12 + (hashTile(i * 19, 23) % 26);
    const drift = reducedMotion ? 0 : Math.sin(elapsed * 1.3 + i) * 1.5;
    ctx.fillStyle = 'rgba(15, 74, 82, 0.55)';
    ctx.fillRect(rx + drift, y1 + 20, 3, rh);
    ctx.fillStyle = 'rgba(186, 230, 253, 0.12)';
    ctx.fillRect(rx + 1 + drift, y1 + 22, 1, rh * 0.6);
  }

  // Ondas horizontales y destellos.
  for (let i = 0; i < 9; i++) {
    const wy2 = y1 + 16 + i * 15;
    const drift = reducedMotion ? 0 : (elapsed * (5 + (i % 3) * 2) + i * 17) % 34;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(103, 232, 249, 0.22)' : 'rgba(148, 233, 226, 0.14)';
    ctx.fillRect(x1 + 14 + drift, wy2, 26 - (i % 4) * 4, 1);
    ctx.fillRect(x1 + w - 46 - drift, wy2 + 5, 18, 1);
  }
  for (let i = 0; i < 6; i++) {
    const th = hashTile(i * 41, 7) % 100;
    const sx = x1 + 18 + (th * (w - 36)) / 100;
    const sy = y1 + 18 + ((hashTile(i * 11, 31) % 100) * (h - 36)) / 100;
    const twinkle = reducedMotion ? 1 : 0.4 + Math.abs(Math.sin(elapsed * 2 + i)) * 0.6;
    ctx.fillStyle = `rgba(224, 242, 254, ${(0.35 * twinkle).toFixed(2)})`;
    ctx.fillRect(sx, sy, 2, 1);
  }

  // Sombra de peces bajo la superficie.
  for (let f = 0; f < 3; f++) {
    const fx = x1 + 60 + ((elapsed * (7 + f * 3) + f * 90) % (w - 120));
    const fy = y1 + 58 + f * 22;
    ctx.fillStyle = 'rgba(8, 30, 38, 0.55)';
    ctx.fillRect(fx, fy, 7, 2);
    ctx.fillRect(fx + 6, fy - 1, 2, 1);
  }

  // Islote central (el árbol del bosque crece aquí).
  const ix = islet.x;
  const iy = islet.y;
  ctx.fillStyle = 'rgba(5, 20, 24, 0.55)';
  ctx.beginPath();
  ctx.ellipse(ix + 2, iy + 12, 34, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6f5a32';
  ctx.beginPath();
  ctx.ellipse(ix, iy + 6, 30, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a7443';
  ctx.beginPath();
  ctx.ellipse(ix, iy + 3, 26, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f7d3a';
  ctx.beginPath();
  ctx.ellipse(ix - 2, iy + 1, 21, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6ba34a';
  ctx.beginPath();
  ctx.ellipse(ix - 5, iy - 1, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Piedra y juncos del islote.
  ctx.fillStyle = '#7b8494';
  ctx.fillRect(ix + 14, iy + 6, 5, 3);
  ctx.fillStyle = '#9aa4b2';
  ctx.fillRect(ix + 14, iy + 6, 5, 1);
  for (let r = 0; r < 4; r++) {
    const rx = ix - 18 + r * 9;
    ctx.fillStyle = '#4a6b2a';
    ctx.fillRect(rx, iy - 8 - (r % 2) * 3, 1, 8 + (r % 2) * 3);
    ctx.fillStyle = '#7a9a3a';
    ctx.fillRect(rx, iy - 9 - (r % 2) * 3, 1, 3);
  }

  // Pasarela de troncos y rocas emergentes al superar Frogger
  if (froggerCleared) {
    const bridgeStartX = ix + 24;
    const bridgeEndX = x2 - 8;
    const count = 6;
    for (let s = 0; s <= count; s++) {
      const logX = bridgeStartX + ((bridgeEndX - bridgeStartX) * s) / count;
      const logY = iy + Math.sin(s * 0.8) * 2;
      ctx.fillStyle = 'rgba(5, 20, 24, 0.45)';
      ctx.fillRect(logX - 8, logY + 4, 16, 6);
      ctx.fillStyle = '#6b4d2b';
      ctx.fillRect(logX - 7, logY - 3, 14, 6);
      ctx.fillStyle = '#8a6639';
      ctx.fillRect(logX - 6, logY - 2, 12, 2);
      ctx.fillStyle = '#4a331a';
      ctx.fillRect(logX - 7, logY + 3, 14, 1);
    }
  }

  // Juncos y nenúfares en los bordes.
  for (let i = 0; i < 10; i++) {
    const th = hashTile(i * 29, 61) % 100;
    const reedX = i < 5 ? x1 + 6 + th * 0.08 : x2 - 12 + th * 0.06;
    const reedY = y1 + 26 + ((hashTile(i * 17, 3) % 100) * (h - 52)) / 100;
    ctx.fillStyle = i % 2 === 0 ? '#43662a' : '#578235';
    ctx.fillRect(reedX, reedY, 1, 7 + (th % 5));
    ctx.fillStyle = '#8aa84a';
    ctx.fillRect(reedX, reedY - 2, 1, 2);
  }
  const pads = [
    { px: x1 + 32, py: y1 + 34 },
    { px: x1 + 52, py: y1 + 52 },
    { px: x1 + w - 40, py: y1 + 34 },
    { px: x1 + w - 62, py: y1 + 66 },
  ];
  for (const [i, pad] of pads.entries()) {
    const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.6 + i) * 1;
    ctx.fillStyle = '#2f6b34';
    ctx.beginPath();
    ctx.ellipse(pad.px, pad.py + bob, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d9c48';
    ctx.fillRect(pad.px - 4, pad.py - 1 + bob, 5, 1);
    if (i % 2 === 0) {
      ctx.fillStyle = '#f9a8d4';
      ctx.fillRect(pad.px + 1, pad.py - 2 + bob, 2, 2);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(pad.px + 1, pad.py - 1 + bob, 1, 1);
    }
  }

  // Embarcadero de tablas en la otra orilla y bote amarrado junto a la caja.
  const dockX = x1 + 226;
  const dockY = y2 - 14;
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(dockX - 1, dockY, 22, 24);
  ctx.fillStyle = '#9c6b36';
  ctx.fillRect(dockX, dockY + 1, 20, 22);
  ctx.fillStyle = '#5c3115';
  for (let p = 0; p < 5; p++) {
    ctx.fillRect(dockX, dockY + 2 + p * 4, 20, 1);
  }
  ctx.fillStyle = '#c99a5b';
  ctx.fillRect(dockX, dockY + 1, 20, 1);
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(dockX + 2, dockY + 21, 2, 6);
  ctx.fillRect(dockX + 16, dockY + 21, 2, 6);

  const boatX = dockX + 26;
  const boatY = y2 - 22;
  const boatBob = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.8) * 1);
  ctx.fillStyle = 'rgba(4, 16, 20, 0.6)';
  ctx.fillRect(boatX + 1, boatY + 5 + boatBob, 24, 4);
  ctx.fillStyle = '#6b3f1d';
  ctx.beginPath();
  ctx.moveTo(boatX, boatY + 2 + boatBob);
  ctx.lineTo(boatX + 22, boatY + 2 + boatBob);
  ctx.lineTo(boatX + 18, boatY + 8 + boatBob);
  ctx.lineTo(boatX + 4, boatY + 8 + boatBob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a9713a';
  ctx.fillRect(boatX + 2, boatY + 2 + boatBob, 18, 1);
  ctx.fillStyle = '#3b2412';
  ctx.fillRect(boatX + 6, boatY + 4 + boatBob, 12, 2);
  ctx.fillStyle = '#c9a15b';
  ctx.fillRect(boatX + 17, boatY + 5 + boatBob, 4, 1);

  // Cartel de madera integrado en la orilla oeste.
  ctx.fillStyle = '#3b2412';
  ctx.fillRect(x1 - 26, y1 + 22, 3, 15);
  ctx.fillStyle = '#8a5a2c';
  ctx.fillRect(x1 - 31, y1 + 20, 14, 7);
  ctx.fillStyle = '#c99a5b';
  ctx.fillRect(x1 - 31, y1 + 20, 14, 1);
  ctx.fillStyle = '#2a1a0e';
  ctx.font = '700 4px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LAGO', x1 - 24, y1 + 25.5);

  // Bruma tenue del amanecer sobre el agua.
  ctx.fillStyle = 'rgba(226, 240, 255, 0.05)';
  ctx.fillRect(x1 + 6, y1 + 6, w - 12, 10);
}

/** Torno del puente de la cala con su rueda dentada instalada o vacía. */
function drawOrigenBridgeMechanism(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  bridgeOpen: boolean,
  bridgeProgress: number,
  elapsed: number
): void {
  const x = Math.round(wx);
  const y = Math.round(wy);
  const running = bridgeOpen && bridgeProgress < 0.999;
  const settle = Math.max(0, Math.min(1, bridgeProgress));
  ctx.save();
  ctx.translate(x, y);

  // Sombra de contacto y base de piedra del torno.
  ctx.fillStyle = 'rgba(5, 8, 14, 0.42)';
  ctx.fillRect(-22, 2, 44, 8);
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(-19, -27, 38, 31);
  ctx.fillStyle = '#6b5a3e';
  ctx.fillRect(-17, -25, 34, 27);
  ctx.fillStyle = '#a08a5e';
  ctx.fillRect(-17, -25, 34, 2);
  ctx.fillStyle = 'rgba(80, 110, 62, 0.55)';
  ctx.fillRect(-16, -2, 7, 2);
  ctx.fillRect(8, -25, 6, 2);
  ctx.fillStyle = '#4a3d2a';
  ctx.fillRect(-13, 2, 26, 4);

  // Eje, soporte y manivela.
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-2, -23, 4, 23);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-1, -23, 2, 23);
  ctx.fillStyle = '#3a2412';
  ctx.fillRect(9, -18, 8, 3);
  ctx.fillStyle = '#8a5a2c';
  ctx.fillRect(9, -18, 8, 1);

  if (bridgeOpen) {
    // Rueda dentada de bronce girando con inercia al terminar.
    const spinSpeed = running ? 9 + (1 - settle) * 10 : 0.35;
    const angle = elapsed * spinSpeed;
    ctx.save();
    ctx.translate(0, -12);
    ctx.rotate(angle);
    ctx.fillStyle = '#78350f';
    for (let tooth = 0; tooth < 8; tooth++) {
      const a = (tooth / 8) * Math.PI * 2;
      ctx.fillRect(Math.cos(a) * 10 - 2, Math.sin(a) * 10 - 2, 4, 4);
    }
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 246, 210, 0.6)';
    ctx.fillRect(-2, -8, 3, 2);
    ctx.fillRect(4, 1, 2, 2);
    ctx.restore();

    // Indicador verde: paso habilitado.
    ctx.fillStyle = '#052e1b';
    ctx.fillRect(-13, -22, 7, 5);
    ctx.fillStyle = running ? '#fbbf24' : '#22c55e';
    ctx.fillRect(-12, -21, 5, 3);
    ctx.fillStyle = running ? 'rgba(251, 191, 36, 0.25)' : 'rgba(34, 197, 94, 0.25)';
    ctx.fillRect(-15, -23, 11, 7);

    // Chispas y vapor durante el descenso del puente.
    if (running) {
      const tick = Math.floor(elapsed * 16);
      for (let s = 0; s < 6; s++) {
        const sx = -4 + ((tick + s * 13) % 22);
        const sy = -26 - ((tick + s * 7) % 12);
        ctx.fillStyle = s % 2 === 0 ? '#fdba74' : '#fde68a';
        ctx.fillRect(sx, sy, 2, 1);
      }
      ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
      ctx.fillRect(-18, -30 - ((tick >> 2) % 6), 8, 3);
      ctx.fillRect(8, -34 - ((tick >> 3) % 8), 7, 3);
    }
  } else {
    // Alojamiento vacío, con el eje mordido y una chispa intermitente.
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(-9, -19, 18, 16);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-7, -17, 14, 12);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, -17, 4, 12);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-7, -10, 14, 3);
    if (Math.floor(elapsed * 3) % 4 === 0) {
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-2, -14, 4, 3);
    }
    // Placa de advertencia con engranaje grabado.
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(-16, -1, 9, 6);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-13, 1, 3, 3);
  }

  ctx.restore();
}

export function renderIsland70sFrame(params: IslandRenderFrameParams): void {
  const {
    ctx,
    vw,
    vh,
    camera,
    elapsed,
    reducedMotion,
    ambientBits,
    digitalCritters,
    pickupBursts,
    player,
    flight,
    pongBoardDeparture,
    skinColor,
    hairColor,
    shirtColor,
    appearance,
    pongRestored,
    breakoutRestored,
    glitchTrailCleared,
    invadersRestored,
    invadersCabinetUnlocked,
    volcanicPassageOpen,
    breakoutSwordExtracting,
    southShortcutActive,
    allUnlocked,
    progressState,
    activeZoneId,
    prompt,
    scannerPulse,
  } = params;

  ctx.imageSmoothingEnabled = false;

  const animFrame4 = reducedMotion ? 0 : Math.floor(elapsed * 3.2) % 4;
  const camX = Math.round(camera.x);
  const camY = Math.round(camera.y);
  const tmStatus = evaluateTimeMachineStatus(progressState, allUnlocked);
  const origenNarrative = progressState.island70s.narrativeEvents;
  const origenBridgeOpen = allUnlocked || origenNarrative.includes('origen-puente-abierto');
  // La compuerta del Sector 03 la manda la palanca de seguridad: sólo se abre
  // cuando el láser queda fuera de línea, no al reparar el generador del taller.
  const origenGeneratorOpen =
    allUnlocked || origenNarrative.includes('origen-laser-desactivado');
  const rawBridgeProgress =
    typeof params.bridgeProgress === 'number' && Number.isFinite(params.bridgeProgress)
      ? params.bridgeProgress
      : 1;
  const bridgeProgress = Math.max(0, Math.min(1, rawBridgeProgress));
  const rawLaserShutdown =
    typeof params.laserShutdownProgress === 'number' && Number.isFinite(params.laserShutdownProgress)
      ? params.laserShutdownProgress
      : 0;
  const laserShutdown = Math.max(0, Math.min(1, rawLaserShutdown));
  const laserRepaired =
    Boolean(params.laserRepaired) ||
    allUnlocked ||
    origenNarrative.includes('origen-laser-controles-reparados');
  const origenFaroOpen =
    allUnlocked || origenNarrative.includes('origen-faro-abierto');
  const origenFaroLit =
    Boolean(params.faroBeaconLit) ||
    allUnlocked ||
    origenNarrative.includes('origen-faro-encendido');
  const rawFaroGate =
    typeof params.faroGateProgress === 'number' && Number.isFinite(params.faroGateProgress)
      ? params.faroGateProgress
      : origenFaroOpen
        ? 1
        : 0;
  const faroGateProgress = Math.max(0, Math.min(1, rawFaroGate));

  // 1. MAR PROFUNDO DEL ARCHIPIÉLAGO CON CORRIENTES Y CRESTAS DE ESPUMA ARTESANALES ESTILO GBA
  ctx.fillStyle = '#0a233a';
  ctx.fillRect(0, 0, vw, vh);

  const startTileX = Math.floor(camX / CELL) - 1;
  const endTileX = Math.ceil((camX + vw) / CELL) + 1;
  const startTileY = Math.floor(camY / CELL) - 1;
  const endTileY = Math.ceil((camY + vh) / CELL) + 1;

  ctx.save();
  ctx.translate(-camX, -camY);

  // Manto marino continuo: gradiente de profundidad + corrientes amplias.
  // Ya no se apoya en el patrón de una baldosa por celda, así que el océano
  // deja de leerse como un tablero.
  const seaDepth = ctx.createLinearGradient(camX, camY - 80, camX, camY + vh + 120);
  seaDepth.addColorStop(0, '#0d3554');
  seaDepth.addColorStop(0.45, '#0a2a45');
  seaDepth.addColorStop(1, '#071d31');
  ctx.fillStyle = seaDepth;
  ctx.fillRect(camX, camY, vw, vh);

  const seaCurrent = ctx.createLinearGradient(camX, camY, camX + vw, camY + vh);
  seaCurrent.addColorStop(0, 'rgba(30, 96, 128, 0.12)');
  seaCurrent.addColorStop(0.42, 'rgba(8, 40, 62, 0.03)');
  seaCurrent.addColorStop(0.74, 'rgba(22, 82, 110, 0.1)');
  seaCurrent.addColorStop(1, 'rgba(4, 22, 38, 0.14)');
  ctx.fillStyle = seaCurrent;
  ctx.fillRect(camX, camY, vw, vh);

  // Oleaje orgánico por franjas: crestas largas, quebradas y con dos tonos.
  const seaRowH = 16;
  const seaRow0 = Math.floor(camY / seaRowH) * seaRowH - seaRowH;
  for (let wy = seaRow0; wy < camY + vh + seaRowH; wy += seaRowH) {
    const row = Math.floor(wy / seaRowH);
    const drift = reducedMotion
      ? 0
      : (elapsed * (4 + (row % 3) * 2) + animFrame4 * 3) % 40;
    const deep = wy > camY + vh * 0.5;
    const body = deep ? '#15506f' : '#1b628a';
    const bodyLit = deep ? '#2a7c9e' : '#3593b4';
    const crest = deep ? '#45b3b4' : '#5fd4cf';
    let wx = camX - 50 + ((hashTile(row, 13) % 61)) - drift;
    while (wx < camX + vw + 50) {
      const th = (hashTile(Math.floor(wx / 8) + row * 29, row + 7) % 1000) / 1000;
      if (th > 0.14) {
        const len = 20 + Math.floor(th * 52);
        const step = th > 0.52 ? 1 : -1;
        const lift = Math.round(
          Math.sin(wx * 0.02 + row * 1.3 + (reducedMotion ? 0 : elapsed * 0.7)) * 2
        );
        const split = Math.max(5, Math.floor(len * 0.56));
        ctx.fillStyle = '#041a2c';
        ctx.fillRect(wx, wy + lift + 2, split + 1, 2);
        ctx.fillRect(wx + split, wy + lift + step + 2, len - split, 2);
        ctx.fillStyle = body;
        ctx.fillRect(wx, wy + lift, split, 2);
        ctx.fillRect(wx + split, wy + lift + step, len - split, 2);
        ctx.fillStyle = bodyLit;
        ctx.fillRect(wx + 2, wy + lift, Math.max(3, split - 4), 1);
        ctx.fillStyle = crest;
        ctx.fillRect(wx + 3, wy + lift, Math.max(2, split - 6), 1);
        ctx.fillRect(wx + split + 2, wy + lift + step, Math.max(2, len - split - 4), 1);
        if (th > 0.8) {
          ctx.fillStyle = '#d1fae5';
          ctx.fillRect(wx + split + Math.floor((len - split) * 0.6), wy + lift + step - 1, 2, 1);
        }
      }
      wx += 26 + ((hashTile(Math.floor(wx) + 5, wy) % 37));
    }
  }

  // Swell largo y destellos de superficie: profundidad sin repetición.
  for (let wy = seaRow0 + 9; wy < camY + vh + seaRowH; wy += seaRowH * 2) {
    const row = Math.floor(wy / seaRowH);
    let wx = camX - 30 + (hashTile(row, 41) % 90) - (reducedMotion ? 0 : (elapsed * 2.6) % 70);
    while (wx < camX + vw + 40) {
      const len = 50 + (hashTile(Math.floor(wx), wy) % 100);
      ctx.fillStyle = 'rgba(26, 92, 122, 0.36)';
      ctx.fillRect(wx, wy, len, 1);
      ctx.fillStyle = 'rgba(125, 211, 208, 0.22)';
      ctx.fillRect(wx + 6, wy - 1, Math.max(6, len * 0.45), 1);
      wx += len + 22 + (hashTile(Math.floor(wx) + 9, wy - 5) % 48);
    }
  }

  const seaSpark = 19;
  for (let wy = Math.floor(camY / seaSpark) * seaSpark; wy < camY + vh + seaSpark; wy += seaSpark) {
    for (let wx = Math.floor(camX / seaSpark) * seaSpark; wx < camX + vw + seaSpark; wx += seaSpark) {
      const th = (hashTile(wx + 61, wy - 37) % 1000) / 1000;
      if (th < 0.78) continue;
      const tw = Math.sin(elapsed * 1.6 + th * 33 + wx * 0.011);
      if (tw < 0.3) continue;
      ctx.fillStyle = `rgba(160, 236, 232, ${(0.12 + tw * 0.22).toFixed(3)})`;
      ctx.fillRect(wx, wy, 2 + Math.floor(th * 3), 1);
      if (th > 0.93) {
        ctx.fillStyle = `rgba(241, 255, 252, ${(0.2 + tw * 0.4).toFixed(3)})`;
        ctx.fillRect(wx + 1, wy - 1, 2, 1);
      }
    }
  }

  // 2. COSTAS Y ACANTILADOS ESTRATIFICADOS CON RELIEVE Y ROMPIENTE DE OLAS GBA
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (!isWorldBoxVisible(r.x - 24, r.y - 24, r.w + 48, r.h + 56, camX, camY, vw, vh)) {
      continue;
    }

    if (r.surface !== 'bridge' && r.surface !== 'pier') {
      const isBeach = r.surface === 'sand';

      if (isBeach) {
        // ----------------------------------------------------
        // TRANSICIÓN COSTERA DE PLAYA GBA:
        // Bajío de agua turquesa translúcida + rompiente de espuma animada que lame la arena
        // ----------------------------------------------------
        // 1. Bajío turquesa somero alrededor de la arena
        ctx.fillStyle = 'rgba(45, 180, 210, 0.45)';
        ctx.fillRect(r.x - 14, r.y - 12, r.w + 28, r.h + 24);

        // 2. Línea de marea de arena húmeda más oscura
        ctx.fillStyle = '#ab8942';
        ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 10);

        // 3. Rompiente de espuma blanca animada con oleaje continuo
        ctx.fillStyle = '#ffffff';
        for (let surfX = r.x - 10; surfX < r.x + r.w + 6; surfX += 16) {
          const tideY = Math.round(Math.sin(elapsed * 2.5 + surfX * 0.1) * 3);
          // Espuma norte y sur
          ctx.fillRect(surfX, r.y - 9 + tideY, 10, 2);
          ctx.fillRect(surfX + 6, r.y + r.h + 5 - tideY, 10, 2);
        }
        for (let surfY = r.y; surfY < r.y + r.h; surfY += 16) {
          const tideX = Math.round(Math.cos(elapsed * 2.5 + surfY * 0.1) * 3);
          // Espuma este y oeste
          ctx.fillRect(r.x - 9 + tideX, surfY, 2, 10);
          ctx.fillRect(r.x + r.w + 6 - tideX, surfY + 4, 2, 10);
        }
      } else {
        // ----------------------------------------------------
        // ACANTILADO ROCOSO ESTRATIFICADO GBA:
        // Visera de césped superior con sombra arrojada, cara de roca con pilastras y rompiente
        // ----------------------------------------------------
        const cliffWallH = 22;

        // Espuma de mar en la base del acantilado
        ctx.fillStyle = animFrame4 % 2 === 0 ? '#bbf7d0' : '#67e8f9';
        ctx.fillRect(r.x - 6, r.y + r.h + cliffWallH - 4, r.w + 12, 8);
        ctx.fillStyle = '#ffffff';
        for (let fx = r.x; fx < r.x + r.w; fx += 18) {
          const spray = ((animFrame4 + Math.floor(fx / 18)) % 3) * 2;
          ctx.fillRect(fx, r.y + r.h + cliffWallH - 2 - spray, 8, 3);
        }

        // Base submarina oscura sumergida
        ctx.fillStyle = '#06101a';
        ctx.fillRect(r.x - 2, r.y + r.h + cliffWallH - 2, r.w + 4, 6);

        // Colores geológicos según bioma
        const rockBase = r.surface === 'fortress' ? '#261720' : r.surface === 'crystal' ? '#181329' : '#4d361e';
        const rockFace = r.surface === 'fortress' ? '#3d2735' : r.surface === 'crystal' ? '#2a2245' : '#705130';
        const rockHi = r.surface === 'fortress' ? '#5a3d4f' : r.surface === 'crystal' ? '#3f3468' : '#96724a';
        const rockShadow = r.surface === 'fortress' ? '#1a0e15' : r.surface === 'crystal' ? '#0f0a1d' : '#2d1e10';

        // Pared vertical del acantilado
        ctx.fillStyle = rockFace;
        ctx.fillRect(r.x, r.y + r.h, r.w, cliffWallH);

        // Estratos y pilastras rocosas verticales cada 20 px
        for (let px = r.x; px < r.x + r.w; px += 20) {
          const pw = Math.min(20, r.x + r.w - px);
          // Faceta iluminada en el lado izquierdo de la pilastra
          ctx.fillStyle = rockHi;
          ctx.fillRect(px + 1, r.y + r.h + 1, Math.min(6, pw), cliffWallH - 2);
          // Faceta en sombra en el lado derecho
          ctx.fillStyle = rockShadow;
          ctx.fillRect(px + pw - 4, r.y + r.h + 1, 4, cliffWallH - 2);
          // Fisura vertical
          ctx.fillStyle = '#060a12';
          ctx.fillRect(px, r.y + r.h, 1, cliffWallH);
        }

        // Estratos sedimentarios horizontales
        ctx.fillStyle = rockShadow;
        ctx.fillRect(r.x, r.y + r.h + 8, r.w, 2);
        ctx.fillRect(r.x, r.y + r.h + 15, r.w, 2);
        ctx.fillStyle = rockHi;
        ctx.fillRect(r.x, r.y + r.h + 10, r.w, 1);

        // Sombra arrojada de la visera superior sobre la pared
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(r.x, r.y + r.h, r.w, 4);

        // Visera del terreno que sobresale ligeramente
        ctx.fillStyle = r.surface === 'fortress' ? '#513b48' : r.surface === 'cobble' ? '#d6c394' : '#2d6d34';
        ctx.fillRect(r.x - 2, r.y + r.h - 1, r.w + 4, 2);
      }
    }
  }

  // 3. SUPERFICIES NATURALES Y ARQUEOLÓGICAS DE LOS 10 SECTORES
  for (const r of ISLAND_WALKABLE_RECTS) {
    if (r.requiresCondition === 'south-shortcut' && !southShortcutActive) continue;
    if (r.requiresCondition === 'garganta-bridge' && !glitchTrailCleared) continue;
    if (!isWorldBoxVisible(r.x, r.y, r.w, r.h, camX, camY, vw, vh)) continue;

    const rTx0 = Math.max(startTileX, Math.floor(r.x / CELL));
    const rTx1 = Math.min(endTileX, Math.ceil((r.x + r.w) / CELL) - 1);
    const rTy0 = Math.max(startTileY, Math.floor(r.y / CELL));
    const rTy1 = Math.min(endTileY, Math.ceil((r.y + r.h) / CELL) - 1);

    for (let ty = rTy0; ty <= rTy1; ty++) {
      for (let tx = rTx0; tx <= rTx1; tx++) {
        drawGbcWalkableSurfaceTile(
          ctx,
          tx,
          ty,
          tx * CELL,
          ty * CELL,
          r.surface,
          r.zoneId,
          animFrame4
        );
      }
    }
  }

  // 3A. LAVADO DE SUELO POR SECTOR: luz, sombra y textura continuas.
  drawOriginGroundDressing(ctx, camX, camY, vw, vh, southShortcutActive, glitchTrailCleared);

  // 3A-0. LAGO DEL BOSQUE DE LAS SEÑALES (corta el paso directo a la otra orilla)
  const anfibioCleared = allUnlocked || Boolean(progressState.games['frogger']?.memoryUnlocked);
  drawOrigenForestLake(ctx, elapsed, reducedMotion, camX, camY, vw, vh, anfibioCleared);

  // 3A-bis. CANAL DE LA CALA Y REJA LÁSER DEL SECTOR 03
  drawOrigenCalaCanal(ctx, origenBridgeOpen, bridgeProgress, elapsed, camX, camY, vw, vh);
  drawOrigenSectorGate(
    ctx,
    origenGeneratorOpen,
    laserShutdown,
    elapsed,
    camX,
    camY,
    vw,
    vh
  );
  drawOrigenArrivalDock(ctx, elapsed, camX, camY, vw, vh);
  drawOrigenCalaDressing(ctx, elapsed, camX, camY, vw, vh);

  // 3B. SENDEROS ORGÁNICOS Y ESCALINATAS TALLADAS ENTRE DESNIVELES
  drawHandcraftedPathsAndStairs(ctx, camX, camY, vw, vh);

  // 3C. SOMBRAS DE NUBES A LA DERIVA SOBRE TODA LA ISLA (profundidad atmosférica)
  drawDriftingCloudShadows(ctx, elapsed, reducedMotion, camX, camY, vw, vh);

  drawIslandWoodRailSystem(
    ctx,
    camX,
    camY,
    vw,
    vh,
    southShortcutActive,
    glitchTrailCleared
  );
  drawVolcanicFortressDetails(ctx, elapsed, volcanicPassageOpen);
  if (isWorldBoxVisible(1560, -580, 760, 760, camX, camY, vw, vh)) {
    drawNorthernArcadeDistrict(ctx, elapsed);
  }

  // 4. COMPOSICIÓN AMBIENTAL ARTESANAL POR SECTOR
  // 4A. Arroyo cristalino y puente de madera hacia el Claro de Pong (1972)
  if (isWorldBoxVisible(2592, 1440, 64, 480, camX, camY, vw, vh)) {
    for (let cy = 1440; cy < 1920; cy += CELL) {
      // Lecho del río de grava visible bajo el agua
      ctx.fillStyle = '#1e3a4e';
      ctx.fillRect(2598, cy, 44, CELL);
      ctx.fillStyle = '#2d5a7b';
      ctx.fillRect(2602, cy, 36, CELL);

      // Corriente de agua transparente
      ctx.fillStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.fillRect(2602, cy, 36, CELL);

      // Ondas animadas de corriente que fluyen hacia el sur
      const flowShift = (animFrame4 * 7) % 24;
      ctx.fillStyle = '#bae6fd';
      ctx.fillRect(2606, cy + flowShift, 10, 2);
      ctx.fillRect(2622, cy + ((flowShift + 12) % 24), 12, 2);

      // Orillas de piedra y césped del arroyo
      ctx.fillStyle = '#060a12';
      ctx.fillRect(2598, cy, 2, CELL);
      ctx.fillRect(2640, cy, 2, CELL);
      ctx.fillStyle = '#2d6d34';
      ctx.fillRect(2596, cy + 4, 3, 6);
      ctx.fillRect(2641, cy + 12, 3, 6);
    }

    // Puente de madera arqueado sobre el arroyo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(2588, 1588, 64, 68);

    ctx.fillStyle = '#060a12';
    ctx.fillRect(2590, 1582, 60, 68);
    ctx.fillStyle = '#b47336';
    ctx.fillRect(2592, 1584, 56, 64);

    // Tablas del puente
    ctx.fillStyle = '#5c3115';
    for (let px = 2596; px < 2648; px += 8) {
      ctx.fillRect(px, 1584, 2, 64);
    }
    // Barandillas laterales del puente
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(2592, 1584, 56, 5);
    ctx.fillRect(2592, 1643, 56, 5);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(2592, 1584, 56, 1);
    ctx.fillRect(2592, 1643, 56, 1);
  }

  // 4B. Fosos magmáticos y murallas del Bastión de las Oleadas (1978)
  for (const lava of VOLCANIC_LAVA_POOLS) {
    if (!isWorldBoxVisible(lava.x, lava.y, lava.w, lava.h, camX, camY, vw, vh)) continue;
    ctx.fillStyle = '#060a12';
    ctx.fillRect(lava.x - 4, lava.y - 4, lava.w + 8, lava.h + 8);
    ctx.fillStyle = '#2e1215';
    ctx.fillRect(lava.x - 2, lava.y - 2, lava.w + 4, lava.h + 4);

    for (let ly = lava.y; ly < lava.y + lava.h; ly += CELL) {
      for (let lx = lava.x; lx < lava.x + lava.w; lx += CELL) {
        const cw = Math.min(CELL, lava.x + lava.w - lx);
        const ch = Math.min(CELL, lava.y + lava.h - ly);

        // Magma incandescente con burbujas y calor ascendente
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(lx, ly, cw, ch);
        const shift = ((animFrame4 + Math.floor(lx / CELL)) % 4) * 4;
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(lx + 3, ly + 3 + (shift % 12), Math.max(4, cw - 6), 7);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(lx + 6, ly + 6 + (shift % 9), Math.max(2, cw - 14), 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lx + 8, ly + 7 + (shift % 9), 2, 2);
      }
    }
  }

  // Murallas del Bastión de las Oleadas
  if (isWorldBoxVisible(2400, 400, 816, 48, camX, camY, vw, vh)) {
    ctx.fillStyle = '#060a12';
    ctx.fillRect(2866, 410, 352, 28);
    ctx.fillStyle = '#4c333f';
    ctx.fillRect(2868, 412, 348, 24);
    ctx.fillStyle = '#6b4759';
    ctx.fillRect(2868, 412, 348, 2);

    // Almenas
    for (let mx = 2872; mx < 3210; mx += 20) {
      ctx.fillStyle = '#060a12';
      ctx.fillRect(mx - 1, 403, 12, 10);
      ctx.fillStyle = '#5a3d4c';
      ctx.fillRect(mx, 404, 10, 8);
      ctx.fillStyle = '#82596e';
      ctx.fillRect(mx, 404, 10, 2);
    }
  }

  // 4C. Cascada animada con pasadizo secreto a la Gruta Subterránea
  if (
    isWorldBoxVisible(
      WATERFALL_SECRET_ENTRANCE.x - 48,
      WATERFALL_SECRET_ENTRANCE.y - 64,
      96,
      96,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const wx = WATERFALL_SECRET_ENTRANCE.x - 24;
    const wy = WATERFALL_SECRET_ENTRANCE.y - 44;

    // Pared rocosa que enmarca la cascada
    ctx.fillStyle = '#060a12';
    ctx.fillRect(wx - 4, wy - 4, 56, 60);
    ctx.fillStyle = '#423226';
    ctx.fillRect(wx - 2, wy - 2, 52, 56);

    // Caverna oscura interior si ha sido descubierta
    const discoveredWf =
      progressState.rpg.discoveredSecretIds.includes('secret-cascada-gruta');
    if (discoveredWf) {
      ctx.fillStyle = '#03060c';
      ctx.fillRect(wx + 10, wy + 16, 28, 36);
    }

    // Cortina de agua en caída vertical
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(wx, wy, 48, 52);

    // Franjas de agua torrencial animadas en tiempo real
    ctx.fillStyle = '#38bdf8';
    for (let sy = 0; sy < 48; sy += 10) {
      const dropY = wy + ((sy + animFrame4 * 5) % 48);
      ctx.fillRect(wx + 3, dropY, 8, 8);
      ctx.fillRect(wx + 37, dropY, 8, 8);
      if (!discoveredWf) {
        ctx.fillRect(wx + 18, dropY, 12, 8);
      }
    }

    // Resaltes espumosos blancos de agua rápida
    ctx.fillStyle = '#ffffff';
    for (let sy = 0; sy < 48; sy += 14) {
      const dropY = wy + ((sy + animFrame4 * 6) % 48);
      ctx.fillRect(wx + 5, dropY, 4, 4);
      ctx.fillRect(wx + 39, dropY, 4, 4);
    }

    // Poza de agua con espuma hirviente en la base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx - 4, wy + 48, 56, 7);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(wx - 2, wy + 52, 52, 4);
  }

  // 4D. La Aldea de los Orígenes: Fuente de las Primeras Señales, bancos de madera y cercas rústicas
  if (isWorldBoxVisible(340, 1700, 520, 220, camX, camY, vw, vh)) {
    drawRusticFence(ctx, 352, 1712, 7);
    drawRusticFence(ctx, 724, 1712, 5);

    // Fuente ornamental circular en la plazuela (x=592, y=1848)
    const fx = 592;
    const fy = 1848;

    // Sombra de la fuente
    ctx.fillStyle = 'rgba(5, 8, 14, 0.45)';
    ctx.fillRect(fx - 24, fy - 6, 48, 22);

    // Basamento octogonal de sillería labrada
    ctx.fillStyle = '#060a12';
    ctx.fillRect(fx - 22, fy - 12, 44, 24);
    ctx.fillRect(fx - 18, fy - 16, 36, 32);

    ctx.fillStyle = '#64748b';
    ctx.fillRect(fx - 20, fy - 10, 40, 20);
    ctx.fillRect(fx - 16, fy - 14, 32, 28);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(fx - 18, fy - 14, 36, 3);
    ctx.fillRect(fx - 20, fy - 10, 3, 20);

    // Estanque de agua cristalina
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(fx - 14, fy - 6, 28, 14);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(fx - 11, fy - 4, 22, 10);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(fx - 7, fy - 3, 14, 3);

    // Pedestal central y surtidor de agua
    ctx.fillStyle = '#060a12';
    ctx.fillRect(fx - 6, fy - 16, 12, 12);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(fx - 5, fy - 15, 10, 10);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(fx - 4, fy - 17, 8, 3);

    // Chorro de agua que danza
    const jetH = (animFrame4 % 2 === 0 ? 8 : 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(fx - 2, fy - 17 - jetH, 4, jetH);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx - 1, fy - 18 - jetH, 2, 3);

    // Bancos de descanso de madera artesanal
    const drawBench = (bx: number, by: number) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(bx - 14, by + 3, 28, 5);
      ctx.fillStyle = '#060a12';
      ctx.fillRect(bx - 14, by - 8, 28, 14);
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(bx - 12, by - 6, 24, 10);
      ctx.fillStyle = '#d8be88';
      ctx.fillRect(bx - 12, by - 6, 24, 2);
      ctx.fillRect(bx - 12, by - 2, 24, 2);
      // Patas de hierro
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(bx - 10, by + 2, 3, 4);
      ctx.fillRect(bx + 7, by + 2, 3, 4);
    };
    drawBench(544, 1848);
    drawBench(640, 1848);
  }

  // Puente Colgante Recto sobre la lava (Camino obligatorio)
  const bSpec = LAVA_STRAIGHT_BRIDGE_SPEC;
  if (isWorldBoxVisible(bSpec.x - 60, bSpec.y - 60, bSpec.w + 120, bSpec.h + 120, camX, camY, vw, vh)) {
    const drawSuspensionArch = (tx: number, ty: number) => {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(tx - 12, ty - 24, 24, 48);
      
      // Pilares del arco (Piedra volcánica tallada)
      ctx.fillStyle = '#0a0a0b';
      ctx.fillRect(tx - 10, ty - 60, 6, 64); // Pillar Norte
      ctx.fillRect(tx + 4, ty - 60, 6, 64); // Pillar Sur
      
      ctx.fillStyle = '#1c1c1e';
      ctx.fillRect(tx - 8, ty - 58, 2, 60);
      ctx.fillRect(tx + 6, ty - 58, 2, 60);

      // Travesaño superior del arco
      ctx.fillStyle = '#2c2c2e';
      ctx.fillRect(tx - 12, ty - 64, 24, 12);
      ctx.fillStyle = '#451a03'; // Madera de refuerzo
      ctx.fillRect(tx - 10, ty - 62, 20, 8);
      
      // Luz de baliza integrada
      const glow = 0.5 + Math.sin(elapsed * 4) * 0.4;
      ctx.fillStyle = `rgba(239, 68, 68, ${glow})`;
      ctx.fillRect(tx - 3, ty - 60, 6, 3);
    };

    // 1. Sombra arrojada sobre la lava
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(bSpec.x + 8, bSpec.y + 8, bSpec.w, bSpec.h);
    
    // 2. Cuerdas principales
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#4a2c12';
    ctx.beginPath();
    ctx.moveTo(bSpec.x, bSpec.y + 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y + 4);
    ctx.moveTo(bSpec.x, bSpec.y + bSpec.h - 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y + bSpec.h - 4);
    ctx.stroke();

    // 3. Tablones de madera colgantes
    ctx.fillStyle = '#5c3115';
    const plankGap = 12;
    for (let px = bSpec.x; px < bSpec.x + bSpec.w; px += plankGap) {
      const sway = Math.sin(elapsed * 2.5 + px * 0.08) * 1.5;
      ctx.fillRect(px, bSpec.y + 6 + sway, 8, bSpec.h - 12);
      ctx.fillStyle = '#783e1c';
      ctx.fillRect(px + 2, bSpec.y + 8 + sway, 2, bSpec.h - 16);
      ctx.fillStyle = '#5c3115';
    }

    // 4. Barandillas de cuerda
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bSpec.x, bSpec.y - 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y - 4);
    ctx.moveTo(bSpec.x, bSpec.y + bSpec.h + 4);
    ctx.lineTo(bSpec.x + bSpec.w, bSpec.y + bSpec.h + 4);
    ctx.stroke();

    // 5. Ataduras verticales
    ctx.fillStyle = '#b45309';
    for (let px = bSpec.x + 8; px < bSpec.x + bSpec.w; px += 24) {
      ctx.fillRect(px, bSpec.y - 4, 2, 8);
      ctx.fillRect(px, bSpec.y + bSpec.h - 4, 2, 8);
    }

    // Efecto de partículas de calor y brasas ascendentes
    for (let i = 0; i < 40; i++) {
      const pSeed = hashTile(i, 999);
      const px = bSpec.x + (pSeed % bSpec.w);
      const py = bSpec.y + (pSeed % bSpec.h);
      const pSpeed = 15 + (pSeed % 20);
      const pLift = (elapsed * pSpeed) % 80;
      const pFlicker = reducedMotion ? 0.8 : 0.4 + Math.sin(elapsed * 12 + i) * 0.4;
      ctx.save();
      ctx.globalAlpha = Math.max(0, pFlicker * (1 - pLift / 80));
      ctx.fillStyle = pSeed % 3 === 0 ? '#facc15' : '#ef4444';
      ctx.fillRect(px, py - pLift + 20, 2, 2);
      ctx.restore();
    }

    // Arcos de entrada y salida
    drawSuspensionArch(bSpec.x, bSpec.y + bSpec.h / 2);
    drawSuspensionArch(bSpec.x + bSpec.w, bSpec.y + bSpec.h / 2);

    // Balizas de seguridad industrial sobre los arcos
    const beacons = [{ x: bSpec.x, y: bSpec.y + bSpec.h / 2 - 58 }, { x: bSpec.x + bSpec.w, y: bSpec.y + bSpec.h / 2 - 58 }];
    for (const b of beacons) {
      const pulse = reducedMotion ? 1 : 0.5 + Math.sin(elapsed * 10) * 0.5;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill();
      const grad = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, 12);
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.5)');
      grad.addColorStop(1, 'rgba(127, 29, 29, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(b.x, b.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  for (const mound of ISLAND_SAND_MOUNDS) {
    if (isWorldBoxVisible(mound.x - 24, mound.y - 24, 48, 48, camX, camY, vw, vh)) {
      const collected = progressState.rpg.openedChestIds.includes(mound.id);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(mound.x - 14, mound.y - 4, 28, 10);
      ctx.fillStyle = '#d9b878';
      ctx.fillRect(mound.x - 12, mound.y - 10, 24, 14);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(mound.x - 8, mound.y - 10, 16, 4);
      if (!collected && mound.rewardItemId) {
        ctx.fillStyle = animFrame4 % 2 === 0 ? '#00f3ff' : '#fde047';
        ctx.fillRect(mound.x - 2, mound.y - 14, 4, 4);
      }
    }
  }

  // 4E. Puente de Asteroides Lunares (Conexión entre Lava y Zona Lunar)
  if (isWorldBoxVisible(MOONSTONE_PATH_RECT.x - 40, MOONSTONE_PATH_RECT.y - 40, MOONSTONE_PATH_RECT.w + 80, MOONSTONE_PATH_RECT.h + 80, camX, camY, vw, vh)) {
    // Lava petrificada a los costados
    const drawPetrifiedLava = (px: number, py: number, pw: number, ph: number) => {
      ctx.fillStyle = '#1a1414';
      ctx.fillRect(px - 2, py - 2, pw + 4, ph + 4);
      ctx.fillStyle = '#2d2424';
      ctx.fillRect(px, py, pw, ph);
      // Grietas de calor residual
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(px + 4, py + ph / 2, pw - 8, 2);
    };

    // Dibujar bordes de lava petrificada
    drawPetrifiedLava(1360, 580, 200, 20); // Borde norte
    drawPetrifiedLava(1360, 740, 200, 20); // Borde sur

    // Dibujar un asteroide individual con detalle rocoso y cráteres lunares
    const drawAsteroid = (ax: number, ay: number, size: number, index: number) => {
      const floatY = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 2.2 + index * 0.7) * 2);
      const x = Math.round(ax);
      const y = Math.round(ay + floatY);

      // Sombra arrojada sobre la lava inferior
      ctx.fillStyle = 'rgba(10, 5, 20, 0.55)';
      ctx.fillRect(x - size / 2, y + size / 2 + 4, size, 6);

      // Aura de energía gravítica lunar cian/púrpura
      const pulse = 0.4 + Math.sin(elapsed * 3.5 + index * 1.1) * 0.25;
      const grad = ctx.createRadialGradient(x, y, 2, x, y, size * 0.9);
      grad.addColorStop(0, `rgba(168, 85, 247, ${pulse * 0.5})`);
      grad.addColorStop(0.7, `rgba(56, 189, 248, ${pulse * 0.25})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Silueta exterior del asteroide (piedra facetada irregular)
      ctx.fillStyle = '#0f0e26';
      ctx.fillRect(x - size / 2 - 1, y - size / 2 - 1, size + 2, size + 2);

      // Cuerpo principal de basalto estelar
      ctx.fillStyle = '#2e1065';
      ctx.fillRect(x - size / 2, y - size / 2, size, size);

      // Faceta sombreada inferior
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(x - size / 2 + 1, y, size - 2, size / 2 - 1);

      // Faceta iluminada superior lunar
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(x - size / 2 + 2, y - size / 2 + 1, size - 4, size / 2 - 1);

      // Cráteres de impacto lunares
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(x - 4, y - 3, 4, 3);
      ctx.fillRect(x + 2, y + 2, 3, 3);
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(x - 3, y - 2, 2, 1);
      ctx.fillRect(x + 3, y + 3, 1, 1);

      // Crestas brillantes de cristal de lunarita en los bordes
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(x - size / 2 + 2, y - size / 2 + 1, size / 3, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - size / 2 + 3, y - size / 2 + 1, 2, 1);
    };

    // Travesaño / Conexión de puente de plasma entre asteroides consecutivos
    const drawBridgeConnector = (x1: number, y1: number, x2: number, y2: number, index: number) => {
      const pulse = 0.5 + Math.sin(elapsed * 4 + index) * 0.3;
      ctx.lineWidth = 3;
      ctx.strokeStyle = `rgba(168, 85, 247, ${pulse})`;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    // Secuencia continua de asteroides alineados como un puente (de oeste a este, 3 filas entrelazadas)
    const bridgeCols = [1370, 1395, 1420, 1445, 1470, 1495, 1520, 1545];
    const bridgeRows = [625, 665, 705];

    // 1. Dibujar conectores de puente entre asteroides adyacentes
    for (let r = 0; r < bridgeRows.length; r++) {
      for (let c = 0; c < bridgeCols.length - 1; c++) {
        drawBridgeConnector(
          bridgeCols[c],
          bridgeRows[r],
          bridgeCols[c + 1],
          bridgeRows[r],
          c + r * 10
        );
      }
    }
    // Conectores transversales verticales
    for (let c = 0; c < bridgeCols.length; c++) {
      for (let r = 0; r < bridgeRows.length - 1; r++) {
        drawBridgeConnector(
          bridgeCols[c],
          bridgeRows[r],
          bridgeCols[c],
          bridgeRows[r + 1],
          c * 5 + r
        );
      }
    }

    // 2. Dibujar la cadena alineada de asteroides uno tras otro
    let astIdx = 0;
    for (let c = 0; c < bridgeCols.length; c++) {
      for (let r = 0; r < bridgeRows.length; r++) {
        const bx = bridgeCols[c];
        const by = bridgeRows[r];
        const size = (c % 2 === 0 && r === 1) ? 24 : 20;
        drawAsteroid(bx, by, size, astIdx++);
      }
    }
  }


  // 4F. Mosaico Astral en la Plaza de Las Ruinas del Primer Pulso
  if (isWorldBoxVisible(1860, 1220, 260, 140, camX, camY, vw, vh)) {
    const mx = 1996;
    const my = 1284;
    ctx.fillStyle = 'rgba(5, 9, 18, 0.45)';
    ctx.fillRect(mx - 34, my - 44, 68, 88);
    ctx.fillRect(mx - 44, my - 34, 88, 68);

    // Marco exterior de basalto
    ctx.fillStyle = '#060a12';
    ctx.fillRect(mx - 32, my - 42, 64, 84);
    ctx.fillRect(mx - 42, my - 32, 84, 64);

    // Anillo cerámico de lapislázuli
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(mx - 30, my - 40, 60, 80);
    ctx.fillRect(mx - 40, my - 30, 80, 60);

    // Incrustaciones de oro con constelaciones
    ctx.fillStyle = '#facc15';
    ctx.fillRect(mx - 26, my - 34, 52, 68);
    ctx.fillRect(mx - 34, my - 26, 68, 52);
    ctx.fillStyle = '#172554';
    ctx.fillRect(mx - 22, my - 28, 44, 56);
    ctx.fillRect(mx - 28, my - 22, 56, 44);

    // Rombos de pulso astral grabados
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(mx - 4, my - 20, 8, 4);
    ctx.fillRect(mx - 20, my - 4, 4, 8);
    ctx.fillRect(mx + 16, my - 4, 4, 8);
    ctx.fillRect(mx - 4, my + 16, 8, 4);

    // Núcleo central pulsante
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#00f3ff' : '#fde047';
    ctx.fillRect(mx - 4, my - 4, 8, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(mx - 2, my - 2, 4, 4);
  }

  // 4F. La Costa de las Máquinas Olvidadas: Columnas jónicas y Altar
  if (isWorldBoxVisible(3080, 1390, 260, 190, camX, camY, vw, vh)) {
    const drawRuinPillar = (px: number, py: number, broken: boolean) => {
      const h = broken ? 24 : 40;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(px - 10, py + 2, 20, 4);
      ctx.fillStyle = '#060a12';
      ctx.fillRect(px - 10, py - h, 20, h + 4);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(px - 8, py - h + 2, 16, h);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(px + 2, py - h + 2, 6, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 8, py - h + 2, 3, h);
      // Capitel y base
      ctx.fillStyle = '#d8be88';
      ctx.fillRect(px - 10, py - h, 20, 4);
      ctx.fillRect(px - 10, py - 2, 20, 4);
    };

    drawRuinPillar(3196, 1488, false);
    drawRuinPillar(3300, 1488, true);
    drawRuinPillar(3196, 1548, true);
    drawRuinPillar(3300, 1548, false);

    // Altar central
    ctx.fillStyle = '#060a12';
    ctx.fillRect(3228, 1482, 40, 30);
    ctx.fillStyle = '#d9b878';
    ctx.fillRect(3230, 1484, 36, 26);
    ctx.fillStyle = animFrame4 % 2 === 0 ? '#00f3ff' : '#fde047';
    ctx.fillRect(3242, 1492, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3245, 1495, 6, 6);

    drawForgottenCoastalCabinet(
      ctx,
      3128,
      1428,
      progressState.rpg.discoveredSecretIds.includes('secret-costa-recreativa'),
      elapsed
    );
  }

  // 4G. Las 3 Estelas Arqueológicas de Símbolos de Pulso ([ ◈ ], [ ◈◈ ], [ ◈◈◈ ])
  const glyphSteles: { x: number; y: number; idx: 1 | 2 | 3; sec: string; hex: string }[] = [
    { x: 828, y: 1948, idx: 1, sec: 'secret-glyph-1', hex: '#38bdf8' },
    { x: 1192, y: 956, idx: 2, sec: 'secret-glyph-2', hex: '#34d399' },
    { x: 3064, y: 1764, idx: 3, sec: 'secret-glyph-3', hex: '#fde047' },
  ];
  for (const gs of glyphSteles) {
    if (isWorldBoxVisible(gs.x - 24, gs.y - 48, 48, 56, camX, camY, vw, vh)) {
      drawPulseGlyphStele(
        ctx,
        gs.x,
        gs.y,
        gs.idx,
        allUnlocked || progressState.rpg.discoveredSecretIds.includes(gs.sec),
        gs.hex,
        elapsed,
        reducedMotion
      );
    }
  }

  // 5. TÚNELES SUBTERRÁNEOS EN ROCAS, CARTELES Y TERMINAL DE GUARDADO
  for (const tunnel of COASTAL_SUBTERRANEAN_TUNNELS) {
    if (isWorldBoxVisible(tunnel.x - 28, tunnel.y - 38, 56, 48, camX, camY, vw, vh)) {
      drawGbcRockTunnelEntrance(ctx, tunnel.x, tunnel.y);
    }
  }

  // Escotilla Cifrada hacia el Laberinto de Señales (1976) al norte de las Praderas de Pong
  if (
    isWorldBoxVisible(
      LABYRINTH_1976_ENTRANCE.x - 32,
      LABYRINTH_1976_ENTRANCE.y - 28,
      64,
      56,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    drawLabyrinth1976Hatch(
      ctx,
      LABYRINTH_1976_ENTRANCE.x,
      LABYRINTH_1976_ENTRANCE.y,
      Boolean(progressState.games['breakout']?.memoryUnlocked) || allUnlocked,
      elapsed
    );
  }

  for (const sign of ISLAND_WOODEN_SIGNS) {
    if (isWorldBoxVisible(sign.x - 20, sign.y - 30, 40, 40, camX, camY, vw, vh)) {
      drawGbcWoodenSign(ctx, sign.x, sign.y, sign.mapLabel, sign.large);
    }
  }

  if (
    isWorldBoxVisible(
      VILLAGE_SAVE_TERMINAL.x - 24,
      VILLAGE_SAVE_TERMINAL.y - 36,
      48,
      48,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    drawGbcSaveTerminal(
      ctx,
      VILLAGE_SAVE_TERMINAL.x,
      VILLAGE_SAVE_TERMINAL.y,
      elapsed,
      Boolean(progressState.rpg.lastManualSaveIso)
    );
  }

  // 5B. PORTALES ANÓMALOS DE PIXELVERSE (Inactivos vs Sincronizados)
  const syncedGlyphsCount = ['secret-glyph-1', 'secret-glyph-2', 'secret-glyph-3'].filter(
    (id) => allUnlocked || progressState.rpg.discoveredSecretIds.includes(id)
  ).length;

  for (const portal of ISLAND_ANOMALY_PORTALS) {
    if (!isWorldBoxVisible(portal.x - 40, portal.y - 76, 80, 96, camX, camY, vw, vh)) {
      continue;
    }
    const unlocked =
      allUnlocked ||
      !portal.requiredSecretIds ||
      portal.requiredSecretIds.every((req) =>
        progressState.rpg.discoveredSecretIds.includes(req)
      );
    drawAnomalyPortalWorld(
      ctx,
      portal,
      unlocked,
      syncedGlyphsCount,
      elapsed,
      reducedMotion
    );
  }

  // Criaturas ambientales amistosas (luciérnagas de señal en Bosque y Praderas)
  for (const critter of digitalCritters) {
    const cx = Math.round(
      critter.homeX + (reducedMotion ? 0 : Math.sin(elapsed * 1.6 + critter.phase) * 24)
    );
    const cy = Math.round(
      critter.homeY + (reducedMotion ? 0 : Math.cos(elapsed * 2.1 + critter.phase) * 14)
    );
    if (!isWorldBoxVisible(cx - 8, cy - 8, 16, 16, camX, camY, vw, vh)) continue;
    ctx.fillStyle = '#070b14';
    ctx.fillRect(cx - 4, cy - 4, 8, 6);
    ctx.fillStyle = critter.color;
    ctx.fillRect(cx - 2, cy - 2, 4, 3);
  }

  // 6. PORTAL DEL SENDERO DEL GLITCH, PLATAFORMA ESTELAR, MONOLITOS Y OBJETOS DE SUELO
  {
    const gp = ISLAND_KEY_COORDS.glitchTrailPortal;
    if (isWorldBoxVisible(gp.x - 54, gp.y - 80, 108, 100, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(gp.x), Math.round(gp.y));

      // Sombra de contacto
      ctx.fillStyle = 'rgba(5, 8, 14, 0.5)';
      ctx.fillRect(-44, 2, 88, 8);

      // Portal megalítico de dolmen / torii de piedra antigua
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-44, -72, 88, 76);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-40, -68, 16, 70);
      ctx.fillRect(24, -68, 16, 70);
      ctx.fillRect(-44, -74, 88, 14);

      // Biseles de cantería
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-44, -74, 86, 2);
      ctx.fillRect(-40, -68, 3, 68);
      ctx.fillRect(24, -68, 3, 68);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-27, -68, 3, 68);
      ctx.fillRect(37, -68, 3, 68);

      // Vórtice de distorsión del Glitch interior (artefactos cromáticos animados)
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-24, -64, 48, 66);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#4338ca' : '#7c3aed';
      ctx.fillRect(-22, -62, 44, 64);

      // Franjas de desfase digital y ruido cuántico
      ctx.fillStyle = '#00f3ff';
      const gShift = (animFrame4 * 7) % 36;
      ctx.fillRect(-18, -56 + gShift, 36, 4);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-16, -42 - (gShift % 20), 32, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -50 + (animFrame4 % 4) * 6, 20, 4);

      ctx.restore();
    }
  }

  {
    const pad = ISLAND_KEY_COORDS.starShuttlePad;
    if (isWorldBoxVisible(pad.x - 220, pad.y - 340, 340, 400, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(pad.x), Math.round(pad.y + 12));
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-56, -20, 112, 40);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-52, -16, 104, 32);
      ctx.strokeStyle = invadersRestored ? '#5cc8ff' : '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(-44, -10, 88, 20);
      ctx.restore();

      if (flight.type === 'shuttle-landing') {
        const p = Math.min(1, flight.elapsed / flight.duration);
        const lp = Math.min(1, p / 0.72);
        const easeOut = 1 - Math.pow(1 - lp, 3);
        const sx = pad.x - 190 * (1 - easeOut);
        const sy = pad.y - 310 * (1 - easeOut);
        drawStarShuttle(ctx, sx, sy, 0.8 + 0.25 * easeOut, (1 - easeOut) * 0.14, p < 0.74);
      } else if (invadersRestored) {
        drawStarShuttle(ctx, pad.x, pad.y, 1.05, 0, false);
      }
    }
  }

  {
    const ast = ISLAND_KEY_COORDS.architectAstrolabe;
    if (isWorldBoxVisible(ast.x - 70, ast.y - 70, 140, 110, camX, camY, vw, vh)) {
      ctx.save();
      ctx.translate(Math.round(ast.x), Math.round(ast.y));

      // Sombra en el suelo
      ctx.fillStyle = 'rgba(5, 8, 14, 0.46)';
      ctx.fillRect(-48, 16, 96, 12);

      // Basamento escalonado de mármol y bronce
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-48, 2, 96, 24);
      ctx.fillRect(-40, -6, 80, 10);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-46, 4, 92, 20);
      ctx.fillRect(-38, -4, 76, 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-46, 4, 90, 2);
      ctx.fillRect(-38, -4, 74, 2);

      // Columna / pedestal del astrolabio
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-20, -46, 40, 42);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-18, -44, 36, 40);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-18, -44, 36, 3);
      ctx.fillRect(-18, -44, 3, 38);

      // Anillos concéntricos del astrolabio armilar (latón labrado)
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-24, -40, 48, 4);
      ctx.fillRect(-30, -30, 60, 4);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-22, -39, 44, 2);
      ctx.fillRect(-28, -29, 56, 2);

      // 3 Gemas de hito histórico que se encienden al restaurar los juegos:
      // Gema 1: Pong (1972) - Esmeralda verde
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-14, -36, 10, 10);
      ctx.fillStyle = pongRestored ? '#22c55e' : '#334155';
      ctx.fillRect(-13, -35, 8, 8);
      if (pongRestored) {
        ctx.fillStyle = '#86efac';
        ctx.fillRect(-12, -34, 3, 3);
      }

      // Gema 2: Glitch Trail - Zafiro cian
      ctx.fillStyle = '#070b14';
      ctx.fillRect(-5, -24, 10, 10);
      ctx.fillStyle = glitchTrailCleared ? '#00f3ff' : '#334155';
      ctx.fillRect(-4, -23, 8, 8);
      if (glitchTrailCleared) {
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(-3, -22, 3, 3);
      }

      // Gema 3: Space Invaders (1978) - Rubí solar
      ctx.fillStyle = '#070b14';
      ctx.fillRect(4, -36, 10, 10);
      ctx.fillStyle = invadersRestored ? '#ef4444' : '#334155';
      ctx.fillRect(5, -35, 8, 8);
      if (invadersRestored) {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(6, -34, 3, 3);
      }

      ctx.restore();
    }
  }

  for (const vista of DISTANT_DECADE_VISTAS) {
    if (!isWorldBoxVisible(vista.x - 20, vista.y - 30, 40, 40, camX, camY, vw, vh)) {
      continue;
    }
    ctx.save();
    ctx.translate(Math.round(vista.x), Math.round(vista.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.42)';
    ctx.fillRect(-8, 2, 16, 4);

    // Trípode de forja / pedestal
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-2, -16, 4, 18);
    ctx.fillRect(-6, 0, 12, 3);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-1, -15, 2, 16);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-5, 0, 10, 1);

    // Tubo óptico del catalejo / telescopio panorámico de costa
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-10, -26, 22, 11);
    ctx.fillRect(10, -24, 4, 7);
    // Carcasa de latón pulido
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-8, -24, 18, 7);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(-8, -24, 18, 2);
    // Franja con el acento cromático de la década
    ctx.fillStyle = vista.accentHex;
    ctx.fillRect(-2, -24, 6, 7);
    // Lente frontal de cristal azul reflectante
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(10, -23, 2, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, -23, 1, 2);

    ctx.restore();
  }

  for (const sw of ISLAND_SWITCHES) {
    if (!isWorldBoxVisible(sw.x - 24, sw.y - 32, 48, 48, camX, camY, vw, vh)) continue;
    const active = progressState.island70s.activatedIslandSwitches.includes(sw.id);
    ctx.save();
    ctx.translate(Math.round(sw.x), Math.round(sw.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.44)';
    ctx.fillRect(-14, 2, 28, 6);

    // Pedestal de piedra labrada estilo templo/ruinas GBA
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-12, -20, 24, 24);
    ctx.fillRect(-14, -22, 28, 4);
    ctx.fillRect(-14, 0, 28, 4);

    ctx.fillStyle = '#475569';
    ctx.fillRect(-10, -18, 20, 20);
    // Biseles de luz y sombra en el fuste
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-12, -22, 26, 2);
    ctx.fillRect(-10, -18, 3, 18);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(7, -18, 3, 18);
    ctx.fillRect(-14, 2, 28, 2);

    // Ranura del mecanismo
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-4, -14, 8, 12);

    // Palanca / interruptor físico (arriba si inactivo, abajo/activado con brillo si activo)
    if (active) {
      // Posición activada: palanca bajada, gema encendida
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -6, 4, 6);
      ctx.fillStyle = sw.accentHex;
      ctx.fillRect(-4, -4, 8, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2, -3, 3, 2);

      // Chispas de energía activa
      if (animFrame4 % 2 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-6, -16, 2, 2);
        ctx.fillRect(4, -16, 2, 2);
      }
    } else {
      // Posición inactiva: palanca alzada
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -18, 4, 10);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-3, -20, 6, 4);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -19, 2, 2);
    }

    ctx.restore();
  }

  for (const echo of ISLAND_ECHOES) {
    if (!isWorldBoxVisible(echo.x - 26, echo.y - 36, 52, 52, camX, camY, vw, vh)) continue;
    const discovered = progressState.island70s.discoveredEchoIds.includes(echo.id);
    ctx.save();
    ctx.translate(Math.round(echo.x), Math.round(echo.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.45)';
    ctx.fillRect(-16, 2, 32, 6);

    // Estela monolítica de basalto con silueta y biseles
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-14, -30, 28, 34);
    ctx.fillRect(-12, -32, 24, 4);
    ctx.fillRect(-16, 0, 32, 4);

    // Cuerpo de piedra oscura tallada
    ctx.fillStyle = discovered ? '#334155' : '#1e293b';
    ctx.fillRect(-12, -28, 24, 30);
    // Biseles de iluminación
    ctx.fillStyle = discovered ? '#64748b' : '#475569';
    ctx.fillRect(-12, -31, 22, 2);
    ctx.fillRect(-12, -28, 3, 28);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(9, -28, 3, 28);

    // Placa de visualización cronológica (estilo display de cuarzo o nixie)
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-10, -24, 20, 14);
    ctx.fillStyle = discovered ? '#0f172a' : '#172554';
    ctx.fillRect(-9, -23, 18, 12);

    // Borde de fósforo con el color del eco
    ctx.fillStyle = echo.accentHex;
    ctx.fillRect(-9, -23, 18, 1);
    ctx.fillRect(-9, -12, 18, 1);

    // Tipografía nítida para el año
    ctx.fillStyle = discovered ? '#cbd5e1' : echo.accentHex;
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(String(echo.year), 0, -14);

    // Glifos grabados en la base del monolito
    ctx.fillStyle = discovered ? '#475569' : echo.accentHex;
    ctx.fillRect(-6, -6, 3, 2);
    ctx.fillRect(3, -6, 3, 2);
    ctx.fillRect(-2, -3, 4, 2);

    ctx.restore();
  }

  for (const dia of ISLAND_DIAMONDS) {
    if (progressState.island70s.collectedDiamondIds.includes(dia.id)) continue;
    if (dia.requiresShortcut && !southShortcutActive) continue;
    if (!isWorldBoxVisible(dia.x - 24, dia.y - 32, 48, 48, camX, camY, vw, vh)) continue;
    const bob = reducedMotion ? 0 : animFrame4 % 2 === 0 ? -2 : 0;
    const dx = Math.round(dia.x);
    const dy = Math.round(dia.y + bob);

    ctx.save();
    ctx.translate(dx, dy);

    // Sombra elíptica en el suelo que no bobea
    ctx.fillStyle = 'rgba(5, 8, 14, 0.4)';
    ctx.fillRect(-8, 8 - bob, 16, 4);

    // Contorno exterior nítido del diamante
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-9, -18, 18, 12);
    ctx.fillRect(-7, -21, 14, 18);
    ctx.fillRect(-4, -23, 8, 22);

    // Facetas del diamante (corte brillante con gradiente de luz cian/zafiro)
    // Faceta superior izquierda (luz pura)
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(-7, -19, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -20, 4, 3);
    // Faceta central
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-2, -19, 8, 6);
    // Facetas inferiores (sombra zafiro)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-6, -13, 6, 7);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, -13, 6, 7);
    // Punta inferior del diamante
    ctx.fillStyle = '#075985';
    ctx.fillRect(-2, -6, 4, 4);

    // Destello blanco especular animado en la esquina superior izquierda
    if (animFrame4 % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, -17, 3, 3);
      ctx.fillRect(-8, -16, 5, 1);
      ctx.fillRect(-6, -18, 1, 5);
    }

    ctx.restore();
  }

  if (
    pongRestored &&
    flight.type !== 'pong-to-garganta' &&
    flight.type !== 'garganta-to-pong' &&
    flight.type !== 'pong-landing'
  ) {
    drawPongHoverboard(
      ctx,
      ISLAND_KEY_COORDS.pongBoardLaunch.x,
      ISLAND_KEY_COORDS.pongBoardLaunch.y,
      0,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
  }
  if (
    pongRestored &&
    flight.type !== 'pong-to-garganta' &&
    flight.type !== 'garganta-to-pong' &&
    flight.type !== 'pong-landing' &&
    !pongBoardDeparture
  ) {
    drawPongHoverboard(
      ctx,
      ISLAND_KEY_COORDS.pongBoardLanding.x - 42,
      ISLAND_KEY_COORDS.pongBoardLanding.y + 16,
      0,
      false,
      elapsed + 1.2,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
  }

  if (
    isWorldBoxVisible(
      HARBOR_80S_FERRY.x - 60,
      HARBOR_80S_FERRY.y - 45,
      120,
      90,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const ferryReady =
      invadersRestored ||
      allUnlocked ||
      progressState.rpg.unlockedIslands.includes('island-80s');
    const bobFerry = reducedMotion ? 0 : animFrame4 % 2 === 0 ? 0 : 2;
    ctx.save();
    ctx.translate(Math.round(HARBOR_80S_FERRY.x), Math.round(HARBOR_80S_FERRY.y + bobFerry));

    // Estela de agua y oleaje suave alrededor del casco del barco
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(-48, 14, 96, 4);
    ctx.fillRect(-52, 16, 104, 3);

    // Silueta general del casco
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-46, -18, 92, 34);
    ctx.fillRect(-50, -6, 100, 22);

    // Casco del navío: rojo granate o azul oscuro según estado
    ctx.fillStyle = ferryReady ? '#991b1b' : '#334155';
    ctx.fillRect(-48, -4, 96, 18);
    // Franja de flotación en la línea de agua
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-48, 6, 96, 3);
    // Quilla inferior sumergida
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-44, 9, 88, 4);

    // Cubierta de madera con tablazón
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-44, -7, 88, 4);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-42, -7, 84, 1);

    // Barandilla de cubierta
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-44, -11, 88, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-43, -10, 86, 2);

    // Cabina superior de mando y camarotes (blanco marfil con ventanas iluminadas)
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-34, -26, 68, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-32, -24, 64, 13);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-32, -15, 64, 3);

    // Ventanas / ojos de buey de la cabina
    ctx.fillStyle = '#0284c7';
    for (let wx = -26; wx <= 22; wx += 12) {
      ctx.fillRect(wx, -21, 6, 5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wx + 1, -20, 2, 2);
      ctx.fillStyle = '#0284c7';
    }

    // Chimenea / chimenea de vapor con franjas retro
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-4, -36, 12, 11);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-3, -34, 10, 8);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-4, -36, 12, 2);
    // Humillo de vapor saliendo de la chimenea
    if (!reducedMotion) {
      ctx.fillStyle = 'rgba(241, 245, 249, 0.6)';
      const smk = (animFrame4 % 3) * 2;
      ctx.fillRect(0 - smk, -40 - smk, 4, 3);
      ctx.fillRect(2 - smk, -44 - smk, 6, 4);
    }

    // Salvavidas ornamental rojo y blanco en la amura
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-38, -3, 8, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-37, -2, 6, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-36, -1, 4, 4);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-35, 0, 2, 2);

    // Rótulo del navío
    ctx.fillStyle = '#070b14';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ferryReady ? 'TRANS-80s' : 'FERRY 70s', 4, -13);

    ctx.restore();
  }

  if (
    isWorldBoxVisible(
      BROKEN_RELAY_MECHANISM.x - 24,
      BROKEN_RELAY_MECHANISM.y - 28,
      48,
      48,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    const repaired = progressState.rpg.repairedMechanismIds.includes(
      BROKEN_RELAY_MECHANISM.id
    );
    ctx.save();
    ctx.translate(Math.round(BROKEN_RELAY_MECHANISM.x), Math.round(BROKEN_RELAY_MECHANISM.y));

    // Sombra de contacto
    ctx.fillStyle = 'rgba(5, 8, 14, 0.45)';
    ctx.fillRect(-16, 2, 32, 6);

    // Bastidor de hierro forjado
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-16, -26, 32, 30);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-14, -24, 28, 26);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-14, -24, 26, 2);
    ctx.fillRect(-14, -24, 2, 24);

    // Bobinas de cobre
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-10, -18, 8, 16);
    ctx.fillRect(2, -18, 8, 16);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-9, -17, 6, 2);
    ctx.fillRect(-9, -13, 6, 2);
    ctx.fillRect(-9, -9, 6, 2);
    ctx.fillRect(3, -17, 6, 2);
    ctx.fillRect(3, -13, 6, 2);
    ctx.fillRect(3, -9, 6, 2);

    // Válvulas de vacío / tubos termoiónicos en la parte superior
    ctx.fillStyle = '#070b14';
    ctx.fillRect(-8, -28, 6, 5);
    ctx.fillRect(2, -28, 6, 5);
    if (repaired) {
      // Válvulas activas con cálido resplandor de filamento y luz verde
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-7, -27, 4, 3);
      ctx.fillRect(3, -27, 4, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(-2, -4, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -3, 2, 2);
    } else {
      // Válvulas apagadas y led rojo de avería parpadeante
      ctx.fillStyle = '#475569';
      ctx.fillRect(-7, -27, 4, 3);
      ctx.fillRect(3, -27, 4, 3);
      ctx.fillStyle = animFrame4 % 2 === 0 ? '#ef4444' : '#7f1d1d';
      ctx.fillRect(-2, -4, 4, 4);
      if (animFrame4 % 2 === 0) {
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(-1, -3, 2, 2);
      }
    }

    ctx.restore();
  }

  for (const chest of RPG_CHESTS) {
    if (chest.areaId !== 'exterior-70s') continue;
    if (!isWorldBoxVisible(chest.x - 24, chest.y - 24, 48, 48, camX, camY, vw, vh)) {
      continue;
    }
    const opened = progressState.rpg.openedChestIds.includes(chest.id);
    drawRpgTreasureChest(
      ctx,
      chest.x,
      chest.y,
      opened,
      chest.accentHex,
      elapsed,
      reducedMotion
    );
  }

  // 6C. EL CASTILLO DEL REY CORRUPTO (CUMBRE SEPTENTRIONAL)
  const castleX = 1952;
  const castleY = -680;
  if (isWorldBoxVisible(castleX - 220, castleY - 240, 440, 480, camX, camY, vw, vh)) {
    const drawbridgeDown =
      allUnlocked ||
      progressState.rpg.discoveredSecretIds.includes('castle-drawbridge-lowered') ||
      progressState.rpg.solvedPuzzleIds.includes('puzzle-sellos-castillo');
    drawCastleCorruptoExterior(
      ctx,
      castleX,
      castleY,
      elapsed,
      reducedMotion,
      drawbridgeDown,
      progressState.rpg.discoveredSecretIds
    );
  }

  // 7. CAPAS DE PROFUNDIDAD CON ORDENAMIENTO Y (Y-SORTING)
  // Permite que Pixel pase detrás de copas de árboles, farolas, tejados y arcos cuando está al norte,
  // y delante cuando camina al sur de su base.
  const ySortedDrawables: { sortY: number; draw: () => void }[] = [];

  for (const tree of ISLAND_TREES) {
    if (isWorldBoxVisible(tree.x - 32, tree.y - 58, 64, 72, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: tree.y,
        draw: () =>
          drawHandcraftedTree(
            ctx,
            tree.x,
            tree.y,
            tree.variant,
            elapsed,
            reducedMotion
          ),
      });
    }
  }

  for (const lamp of PHOSPHOR_LAMPS) {
    if (isWorldBoxVisible(lamp.x - 34, lamp.y - 54, 68, 68, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: lamp.y,
        draw: () =>
          drawPhosphorStreetlamp(ctx, lamp.x, lamp.y, lamp.color, elapsed, reducedMotion),
      });
    }
  }

  for (const mill of SIGNAL_WINDMILLS) {
    if (isWorldBoxVisible(mill.x - 28, mill.y - 68, 56, 76, camX, camY, vw, vh)) {
      ySortedDrawables.push({
        sortY: mill.y,
        draw: () => drawSignalWindmill(ctx, mill.x, mill.y, elapsed, reducedMotion),
      });
    }
  }

  const northernArcades: { id: NorthArcadeId; x: number; y: number; restored: boolean }[] = [
    { id: 'seaWolf', ...NORTH_ARCADE_LAYOUT.arcades.seaWolf, restored: Boolean(progressState.games['sea-wolf']?.memoryUnlocked) || allUnlocked },
    { id: 'tank', ...NORTH_ARCADE_LAYOUT.arcades.tank, restored: Boolean(progressState.games['tank']?.memoryUnlocked) || allUnlocked },
    { id: 'lunarLander', ...NORTH_ARCADE_LAYOUT.arcades.lunarLander, restored: Boolean(progressState.games['lunar-lander']?.memoryUnlocked) || allUnlocked },
    { id: 'galaxian', ...NORTH_ARCADE_LAYOUT.arcades.galaxian, restored: Boolean(progressState.games['galaxian']?.memoryUnlocked) || allUnlocked },
  ];
  for (const arcade of northernArcades) {
    if (!isWorldBoxVisible(arcade.x - 54, arcade.y - 90, 108, 120, camX, camY, vw, vh)) continue;
    ySortedDrawables.push({
      sortY: arcade.y,
      draw: () => drawNorthernArcadeCabinet(ctx, arcade.id, arcade.x, arcade.y, elapsed, arcade.restored),
    });
  }

  const volcanicArcades: { id: 'asteroids' | 'breakout'; x: number; y: number; restored: boolean }[] = [
    { id: 'asteroids', ...VOLCANIC_ARCADE_LAYOUT.asteroids, restored: Boolean(progressState.games['asteroids']?.memoryUnlocked) || allUnlocked },
    { id: 'breakout', ...VOLCANIC_ARCADE_LAYOUT.breakout, restored: Boolean(progressState.games['breakout']?.memoryUnlocked) || allUnlocked },
  ];
  for (const arcade of volcanicArcades) {
    if (!isWorldBoxVisible(arcade.x - 54, arcade.y - 90, 108, 120, camX, camY, vw, vh)) continue;
    ySortedDrawables.push({
      sortY: arcade.y,
      draw: () => drawNorthernArcadeCabinet(ctx, arcade.id, arcade.x, arcade.y, elapsed, arcade.restored),
    });
  }

  if (isWorldBoxVisible(VOLCANIC_ARCADE_LAYOUT.breakoutStone.x - 44, VOLCANIC_ARCADE_LAYOUT.breakoutStone.y - 50, 88, 84, camX, camY, vw, vh)) {
    const swordClaimed = breakoutRestored && progressState.rpg.discoveredSecretIds.includes('breakout-sword-extracted');
    ySortedDrawables.push({
      sortY: VOLCANIC_ARCADE_LAYOUT.breakoutStone.y + 18,
      draw: () => drawBreakoutLegendStone(ctx, VOLCANIC_ARCADE_LAYOUT.breakoutStone.x, VOLCANIC_ARCADE_LAYOUT.breakoutStone.y, elapsed, swordClaimed, breakoutSwordExtracting),
    });
  }

  if (isWorldBoxVisible(VOLCANIC_ARCADE_LAYOUT.guard.x - 24, VOLCANIC_ARCADE_LAYOUT.guard.y - 48, 48, 58, camX, camY, vw, vh)) {
    const guardApproved = allUnlocked || progressState.island70s.talkedNpcIds.includes(VOLCANIC_GUARD_ID);
    ySortedDrawables.push({
      sortY: VOLCANIC_ARCADE_LAYOUT.guard.y,
      draw: () => drawVolcanicGuard(ctx, VOLCANIC_ARCADE_LAYOUT.guard.x, VOLCANIC_ARCADE_LAYOUT.guard.y, elapsed, guardApproved),
    });
  }

  if (
    isWorldBoxVisible(
      ORIGEN_CALA_CANAL.mechanism.x - 24,
      ORIGEN_CALA_CANAL.mechanism.y - 32,
      48,
      48,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ORIGEN_CALA_CANAL.mechanism.y,
      draw: () =>
        drawOrigenBridgeMechanism(
          ctx,
          ORIGEN_CALA_CANAL.mechanism.x,
          ORIGEN_CALA_CANAL.mechanism.y,
          origenBridgeOpen,
          bridgeProgress,
          elapsed
        ),
    });
  }

  if (
    isWorldBoxVisible(
      ORIGEN_LASER_CONSOLE.x - 22,
      ORIGEN_LASER_CONSOLE.y - 34,
      54,
      44,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ORIGEN_LASER_CONSOLE.y,
      draw: () =>
        drawOrigenLaserConsole(
          ctx,
          ORIGEN_LASER_CONSOLE.x,
          ORIGEN_LASER_CONSOLE.y,
          laserRepaired,
          origenGeneratorOpen,
          elapsed
        ),
    });
  }

  if (
    isWorldBoxVisible(
      ORIGEN_SECURITY_RUINS.x - 56,
      ORIGEN_SECURITY_RUINS.y - 78,
      130,
      96,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ORIGEN_SECURITY_RUINS.y,
      draw: () =>
        drawOrigenSecurityRuins(
          ctx,
          ORIGEN_SECURITY_RUINS.x,
          ORIGEN_SECURITY_RUINS.y,
          elapsed,
          reducedMotion
        ),
    });
  }

  const anfibioActive =
    allUnlocked ||
    Boolean(progressState.rpg.questStates['quest-generador-retrostate']) ||
    Boolean(progressState.rpg.questStates['quest-laser-seguridad']) ||
    progressState.rpg.inventoryItems.includes('item-pieza-generador');
  const anfibioRestored = Boolean(progressState.games['frogger']?.memoryUnlocked);
  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.origenFroggerCabinet.x - 30,
      ISLAND_KEY_COORDS.origenFroggerCabinet.y - 70,
      60,
      84,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ISLAND_KEY_COORDS.origenFroggerCabinet.y,
      draw: () =>
        drawCircuitoAnfibioCabinetWorld(
          ctx,
          ISLAND_KEY_COORDS.origenFroggerCabinet.x,
          ISLAND_KEY_COORDS.origenFroggerCabinet.y,
          anfibioActive,
          anfibioRestored,
          elapsed
        ),
    });
  }

  if (
    isWorldBoxVisible(
      ISLAND_KEY_COORDS.invadersCabinet.x - 80,
      ISLAND_KEY_COORDS.invadersCabinet.y - 85,
      160,
      125,
      camX,
      camY,
      vw,
      vh
    )
  ) {
    ySortedDrawables.push({
      sortY: ISLAND_KEY_COORDS.invadersCabinet.y,
      draw: () =>
        drawSpaceInvaders1978CabinetWorld(
          ctx,
          ISLAND_KEY_COORDS.invadersCabinet.x,
          ISLAND_KEY_COORDS.invadersCabinet.y,
          invadersRestored,
          invadersCabinetUnlocked,
          elapsed
        ),
    });
  }

  for (const bldg of ISLAND_70S_BUILDINGS) {
    if (
      isWorldBoxVisible(
        bldg.x - 28,
        bldg.y - 48,
        bldg.w + 56,
        bldg.h + 76,
        camX,
        camY,
        vw,
        vh
      )
    ) {
      ySortedDrawables.push({
        sortY: bldg.y + bldg.h,
        draw: () =>
          drawPixelverseBuilding(
            ctx,
            bldg,
            elapsed,
            reducedMotion,
            tmStatus.canTravelTo80s
          ),
      });
    }
  }

  for (const entrance of ISLAND_NORTH_CAVE_ENTRANCES) {
    if (!isWorldBoxVisible(entrance.x - 36, entrance.y - 46, 72, 58, camX, camY, vw, vh)) {
      continue;
    }
    ySortedDrawables.push({
      sortY: entrance.y,
      draw: () => drawGbaNorthCaveEntrance(ctx, entrance, elapsed),
    });
  }

  for (const npc of ISLAND_NPCS) {
    const override = params.npcOverrides?.[npc.id];
    const npcX = override ? override.x : npc.x;
    const npcY = override ? override.y : npc.y;
    if (!isWorldBoxVisible(npcX - 20, npcY - 36, 40, 48, camX, camY, vw, vh)) continue;
    const drawSpec: IslandNpcSpec = override ? { ...npc, x: npcX, y: npcY } : npc;
    ySortedDrawables.push({
      sortY: npcY,
      draw: () => drawGbaNpcSprite(ctx, drawSpec, elapsed, reducedMotion, animFrame4),
    });
  }

  // Criaturas guardianas originales en el mundo exterior (Lumen-Bit y Vectra-79)
  for (const creature of GUARDIAN_CREATURES) {
    if (creature.areaId !== 'exterior-70s') continue;
    if (!isWorldBoxVisible(creature.x - 32, creature.y - 40, 64, 56, camX, camY, vw, vh)) {
      continue;
    }
    const calmed =
      allUnlocked || progressState.rpg.calmedCreatureIds.includes(creature.id);
    ySortedDrawables.push({
      sortY: creature.y,
      draw: () =>
        drawGuardianCreatureSprite(ctx, creature, calmed, elapsed, reducedMotion),
    });
  }

  // Jugador Pixel integrado en el ordenamiento de profundidad cuando camina en tierra
  const playerFlyingHover =
    flight.type === 'pong-landing' ||
    flight.type === 'pong-to-garganta' ||
    flight.type === 'garganta-to-pong' ||
    flight.type === 'hoverboard';
  if (
    !playerFlyingHover &&
    (flight.type !== 'shuttle-landing' || flight.elapsed / flight.duration >= 0.72)
  ) {
    ySortedDrawables.push({
      // Ordenar por el contacto de las botas con el suelo conserva la oclusión de copas y troncos.
      sortY: player.y + 4,
      draw: () =>
        drawPixelAvatar4Dir(
          ctx,
          player.x,
          player.y,
          player.facingDir ?? (player.facing >= 0 ? 'right' : 'left'),
          player.walking,
          Boolean(player.sprinting),
          elapsed,
          skinColor,
          hairColor,
          shirtColor,
          {
            reducedMotion,
            equippedCosmetic: progressState.rpg.equippedCosmetic,
            lanternActive: progressState.rpg.lanternActive,
            lanternRadiusScale: progressState.rpg.powersState?.upgradesPurchased.includes(
              'upg-lantern-radius-1'
            )
              ? 1.4
              : 1,
            interactAnim: player.interactAnim,
            appearance,
          }
        ),
    });

    if (progressState.rpg.dylanEscortActive) {
      const dir = player.facingDir ?? 'down';
      const dylanOx = dir === 'left' ? 24 : dir === 'right' ? -24 : -16;
      const dylanOy = dir === 'up' ? 20 : dir === 'down' ? -20 : 0;
      ySortedDrawables.push({
        sortY: player.y + dylanOy + 4,
        draw: () =>
          drawEscortDylan(
            ctx,
            player.x + dylanOx,
            player.y + dylanOy,
            dir,
            player.walking,
            elapsed
          ),
      });
    }
  }

  ySortedDrawables.sort((a, b) => a.sortY - b.sortY);
  for (const item of ySortedDrawables) {
    item.draw();
  }

  // Si Pixel vuela por el aire sobre la Tabla de Pong, se dibuja por encima del dosel
  if (playerFlyingHover) {
    const rideTilt =
      flight.type === 'pong-to-garganta'
        ? -0.18
        : flight.type === 'garganta-to-pong'
          ? 0.18
          : flight.type === 'pong-landing'
            ? flight.tilt ?? 0
            : 0;
    // Estela acuática bajo la tabla cuando el surf avanza sobre el mar
    if (flight.type === 'pong-landing' || flight.type === 'pong-to-garganta') {
      ctx.save();
      ctx.translate(player.x, player.y + 8);
      ctx.rotate(rideTilt);
      const wake = ctx.createLinearGradient(-120, 0, 0, 0);
      wake.addColorStop(0, 'rgba(224, 250, 255, 0)');
      wake.addColorStop(0.6, 'rgba(190, 246, 255, 0.28)');
      wake.addColorStop(1, 'rgba(255, 255, 255, 0.55)');
      ctx.fillStyle = wake;
      ctx.fillRect(-120, -4, 120, 9);
      for (let i = 0; i < 5; i++) {
        const dist = 18 + i * 21;
        const spread = 3 + i * 2.3;
        const drift = Math.sin(elapsed * 8 - i * 1.1) * 2;
        ctx.fillStyle = `rgba(224, 250, 255, ${(0.5 - i * 0.08).toFixed(2)})`;
        ctx.fillRect(-dist - 10, -spread, 11, 2);
        ctx.fillRect(-dist - 10, spread, 11, 2);
      }
      const bowPulse = reducedMotion ? 0.7 : 0.5 + Math.sin(elapsed * 11) * 0.25;
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.5 + bowPulse * 0.3).toFixed(2)})`;
      ctx.fillRect(19, -3, 7, 2);
      ctx.restore();
    }
    drawPongHoverboard(
      ctx,
      player.x,
      player.y,
      rideTilt,
      true,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
  }

  // La Barra de Pong despega del punto de aterrizaje y se pierde en el horizonte
  if (pongBoardDeparture && pongBoardDeparture.duration > 0) {
    const depT = Math.min(1, pongBoardDeparture.elapsed / pongBoardDeparture.duration);
    const depEase = 1 - Math.pow(1 - depT, 2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - depT);
    drawPongHoverboard(
      ctx,
      pongBoardDeparture.x + depEase * 260,
      pongBoardDeparture.y - depEase * 150,
      -0.12 - depT * 0.22,
      false,
      elapsed,
      skinColor,
      hairColor,
      shirtColor,
      reducedMotion,
      appearance
    );
    ctx.restore();
  }

  // 8. VIDA AMBIENTAL: polen, esporas y luciérnagas digitales sobre el terreno
  drawAmbientIslandLife(
    ctx,
    elapsed,
    reducedMotion,
    camX,
    camY,
    vw,
    vh,
    ambientBits,
    digitalCritters,
    southShortcutActive,
    glitchTrailCleared
  );

  // 9. ONDA DE PULSO DEL SONAR DE FRECUENCIAS TTL [R]
  if (scannerPulse && scannerPulse.active) {
    const scannerRangeScale = progressState.rpg.powersState?.upgradesPurchased.includes(
      'upg-scanner-range-1'
    )
      ? 1.6
      : 1;
    const pRatio = Math.min(1, scannerPulse.elapsed / 1.45);
    const radius = Math.round((24 + pRatio * 480) * scannerRangeScale);
    ctx.save();
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(Math.round(player.x), Math.round(player.y - 10), radius, 0, Math.PI * 2);
    ctx.stroke();

    const secretTargets: { x: number; y: number; tag: string }[] = [
      {
        x: WATERFALL_SECRET_ENTRANCE.x,
        y: WATERFALL_SECRET_ENTRANCE.y,
        tag: '¡GRUTA TRAS CASCADA!',
      },
      ...ISLAND_NORTH_CAVE_ENTRANCES.map((entrance) => ({
        x: entrance.x,
        y: entrance.y,
        tag: 'CAVIDAD BOREAL',
      })),
      {
        x: LABYRINTH_1976_ENTRANCE.x,
        y: LABYRINTH_1976_ENTRANCE.y,
        tag: 'ESCOTILLA LABERINTO 1976',
      },
      ...GUARDIAN_CREATURES.filter((cr) => cr.areaId === 'exterior-70s').map((cr) => ({
        x: cr.x,
        y: cr.y,
        tag: 'GUARDIÁN DE FRECUENCIA',
      })),
      ...ISLAND_ANOMALY_PORTALS.map((ap) => ({
        x: ap.x,
        y: ap.y,
        tag: 'PORTAL ANÓMALO',
      })),
      ...COASTAL_SUBTERRANEAN_TUNNELS.map((t) => ({
        x: t.x,
        y: t.y,
        tag: 'TÚNEL EN ROCA',
      })),
      ...RPG_CHESTS.filter(
        (c) =>
          c.areaId === 'exterior-70s' &&
          !progressState.rpg.openedChestIds.includes(c.id)
      ).map((c) => ({ x: c.x, y: c.y, tag: 'COFRE OCULTO' })),
      ...RPG_EXAMINABLES.filter((ex) => ex.areaId === 'exterior-70s').map((ex) => ({
        x: ex.x,
        y: ex.y,
        tag: ex.id.startsWith('exam-simbolo-pulso') ? 'GLIFO DE PULSO' : 'HALLAZGO ARQUEOLÓGICO',
      })),
    ];

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const st of secretTargets) {
      if (Math.hypot(st.x - player.x, st.y - player.y) <= radius + 30) {
        ctx.fillStyle = '#070b14';
        ctx.fillRect(st.x - 66, st.y - 46, 132, 16);
        ctx.fillStyle = '#f8f5e6';
        ctx.fillText(`▶ ${st.tag}`, st.x, st.y - 35);
      }
    }
    ctx.restore();
  }

  // Etiqueta flotante de interacción [E] con marco propio de PIXELVERSE (obsidiana + bronce)
  if (prompt && (flight.type === 'none' || flight.type === 'hoverboard')) {
    const py = Math.round(prompt.y - 54 + (animFrame4 % 2 === 0 ? 0 : -2));
    const px = Math.round(prompt.x);
    ctx.save();
    ctx.font = '700 10px "JetBrains Mono", monospace';
    const badgeText = `[E] ${prompt.actionLabel}`;
    const tw = Math.ceil(ctx.measureText(badgeText).width) + 20;
    const left = Math.round(px - tw / 2);

    ctx.fillStyle = '#050811';
    ctx.fillRect(left - 2, py - 16, tw + 4, 24);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(left, py - 14, tw, 20);
    ctx.fillStyle = '#0b1324';
    ctx.fillRect(left + 2, py - 12, tw - 4, 16);
    ctx.fillStyle = '#f8f5e6';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, px, py);
    ctx.restore();
  }

  for (const pb of pickupBursts) {
    ctx.fillStyle = pb.color;
    ctx.fillRect(Math.round(pb.x - 2), Math.round(pb.y - 2), 6, 6);
  }

  // 10. ILUMINACIÓN ATMOSFÉRICA HD-2D + RGB PLAYGROUNDS (halos aditivos limpios y semánticos)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lightPools: { x: number; y: number; r: number; rgba: string }[] = [
    ...PHOSPHOR_LAMPS.map((l) => ({
      x: l.x,
      y: l.y - 18,
      r: 72,
      rgba: l.color === '#00f3ff' ? 'rgba(0, 243, 255, 0.11)' : 'rgba(251, 191, 36, 0.12)',
    })),
    {
      x: ISLAND_KEY_COORDS.pongCabinet.x,
      y: ISLAND_KEY_COORDS.pongCabinet.y - 24,
      r: 92,
      rgba: pongRestored ? 'rgba(0, 243, 255, 0.14)' : 'rgba(250, 204, 21, 0.1)',
    },
    {
      x: ISLAND_KEY_COORDS.invadersCabinet.x,
      y: ISLAND_KEY_COORDS.invadersCabinet.y - 26,
      r: 96,
      rgba: invadersRestored ? 'rgba(57, 255, 20, 0.14)' : 'rgba(249, 115, 22, 0.12)',
    },
    {
      x: ISLAND_KEY_COORDS.glitchTrailPortal.x,
      y: ISLAND_KEY_COORDS.glitchTrailPortal.y - 28,
      r: 105,
      rgba: 'rgba(168, 85, 247, 0.14)',
    },
    {
      x: 1640,
      y: 990,
      r: 110,
      rgba: 'rgba(34, 211, 238, 0.11)',
    },
    {
      x: LABYRINTH_1976_ENTRANCE.x,
      y: LABYRINTH_1976_ENTRANCE.y,
      r: 68,
      rgba: 'rgba(249, 115, 22, 0.13)',
    },
  ];
  for (const lp of lightPools) {
    if (!isWorldBoxVisible(lp.x - lp.r, lp.y - lp.r, lp.r * 2, lp.r * 2, camX, camY, vw, vh)) {
      continue;
    }
    const g = ctx.createRadialGradient(lp.x, lp.y, 4, lp.x, lp.y, lp.r);
    g.addColorStop(0, lp.rgba);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, lp.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();

  if (activeZoneId) {
    ctx.fillStyle = ISLAND_ZONES[activeZoneId].ambientTint;
    ctx.fillRect(0, 0, vw, vh);
  }

  // Grado de color global: luz cálida desde el norte y sombras marinas al sur.
  const grade = ctx.createLinearGradient(0, 0, 0, vh);
  grade.addColorStop(0, 'rgba(255, 221, 166, 0.055)');
  grade.addColorStop(0.42, 'rgba(255, 236, 196, 0.012)');
  grade.addColorStop(0.72, 'rgba(18, 40, 66, 0)');
  grade.addColorStop(1, 'rgba(10, 24, 48, 0.085)');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, vw, vh);

  // Viñeta cinematográfica sutil estilo Octopath / HD-2D sin oscurecer el centro jugable
  const vig = ctx.createRadialGradient(
    vw * 0.5,
    vh * 0.5,
    Math.min(vw, vh) * 0.36,
    vw * 0.5,
    vh * 0.5,
    Math.max(vw, vh) * 0.74
  );
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(2, 6, 18, 0.32)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);
}
