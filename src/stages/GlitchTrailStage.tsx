/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NIVEL ORIGINAL DE AVENTURA Y PLATAFORMAS HD-2D:
 * «EL SENDERO DEL GLITCH PERDIDO»
 *
 * Conecta el Santuario de Pong (1972) con La Fortaleza de las Oleadas (1978)
 * dentro de La Gran Isla de los 70. Incluye:
 * 1. Plataformas de sincronización con telegrafía clara e interruptores estabilizadores
 * 2. Corrientes direccionales de píxeles (ascendentes y laterales)
 * 3. Acertijo ambiental de Prismas Armónicos + Puentes que se construyen jugando
 * 4. Sombras del pasado (Odyssey 1972 y Breakout 1976)
 * 5. Diamantes de Memoria cian persistentes sin duplicar recompensas
 * 6. Movimiento fluido (Coyote Time, Jump Buffer, Dash de Fase, plataformas móviles)
 * 7. Checkpoints persistentes y reinicio instantáneo a punto de control
 * 8. Encuentros con personajes, El Cartógrafo del Caos y 3 Resonadores Astrales finales
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Diamond, Layers, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';
import { drawPixelAvatar4Dir } from '../island/island70sRenderer';
import type { AvatarAppearance } from '../avatar/avatarOptions';

export interface GlitchTrailStageProps {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  collectedDiamondIds: string[];
  alreadyRestoredBefore: boolean;
  discoveredEchoIds: string[];
  onCheckpointReached?: (checkpointId: string) => void;
  onCollectDiamond: (diamondId: string) => void;
  onDiscoverEcho: (echoId: string) => void;
  onVictoryRecorded: (totalTrailDiamonds: number) => void;
  onComplete: () => void;
  onReturnToIsland: () => void;
}

interface TrailPlatform {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'solid' | 'sync' | 'moving' | 'reconstructed-mid' | 'reconstructed-final';
  syncPeriod?: number;
  syncOffset?: number;
  stabilizerGroup?: string;
  moveAmpX?: number;
  moveAmpY?: number;
  moveSpeed?: number;
  surfaceTint?: 'emerald' | 'cyan' | 'amber' | 'crystal';
  reality?: 'stable' | 'glitch';
}

type TrailReality = 'stable' | 'glitch';
type TrailEnemyKind = 'sentinel' | 'drone' | 'guardian';

interface TrailEnemySpec {
  id: string;
  kind: TrailEnemyKind;
  x: number;
  y: number;
  range: number;
  hp: number;
  fireRate?: number;
}

interface TrailEnemyState extends TrailEnemySpec {
  originX: number;
  originY: number;
  health: number;
  alive: boolean;
  fireTimer: number;
  hitFlash: number;
}

interface TrailProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hostile?: boolean;
}

interface PixelCurrentZone {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
  color: string;
  label: string;
}

interface StabilizerSwitch {
  id: string;
  group: string;
  x: number;
  y: number;
  label: string;
}

interface HarmonicPrism {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  label: string;
}

interface BridgeShard {
  id: string;
  x: number;
  y: number;
  shape: 'triangle' | 'prism' | 'hex';
  color: string;
  label: string;
}

interface TrailDiamond {
  id: string;
  x: number;
  y: number;
  label: string;
}

interface TrailEchoNode {
  id: string;
  year: number;
  title: string;
  x: number;
  y: number;
  accentHex: string;
  message: string;
}

interface TrailNpcNode {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  isCartographer?: boolean;
  accentHex: string;
  speech: string;
  speechAfterGoal?: string;
}

interface FinalResonatorNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface GlitchWisp {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  speed: number;
  phase: number;
  reality?: TrailReality;
}

const LEVEL_W = 4760;
const LEVEL_H = 1060;

const CHECKPOINTS = [
  { id: 'cp-1', x: 130, y: 700, name: 'Acto I · Umbral Desfasado' },
  { id: 'cp-2', x: 1210, y: 660, name: 'Acto II · Cañón de las Corrientes' },
  { id: 'cp-3', x: 2330, y: 660, name: 'Acto III · Abismo Geométrico' },
  { id: 'cp-4', x: 3530, y: 680, name: 'Acto IV · El Nodo del Cartógrafo' },
];

const PLATFORMS: TrailPlatform[] = [
  // ACTO I: El Umbral Desfasado (0 .. 1180)
  { id: 'p-start', x: 40, y: 760, w: 390, h: 48, kind: 'solid', surfaceTint: 'emerald' },
  {
    id: 'p-sync-1',
    x: 485,
    y: 710,
    w: 155,
    h: 22,
    kind: 'sync',
    syncPeriod: 4.4,
    syncOffset: 0,
    stabilizerGroup: 'grp-1',
    surfaceTint: 'cyan',
    reality: 'stable',
  },
  { id: 'p-mid-1', x: 695, y: 665, w: 185, h: 32, kind: 'solid', surfaceTint: 'emerald', reality: 'stable' },
  {
    id: 'p-sync-2',
    x: 935,
    y: 620,
    w: 165,
    h: 22,
    kind: 'sync',
    syncPeriod: 4.4,
    syncOffset: 2.2,
    stabilizerGroup: 'grp-1',
    surfaceTint: 'cyan',
    reality: 'glitch',
  },
  { id: 'p-high-1', x: 680, y: 485, w: 170, h: 22, kind: 'solid', surfaceTint: 'amber', reality: 'glitch' },

  // ACTO II: El Cañón de las Corrientes (1160 .. 2300)
  { id: 'p-cp2', x: 1155, y: 715, w: 280, h: 46, kind: 'solid', surfaceTint: 'emerald' },
  {
    id: 'p-mov-1',
    x: 1510,
    y: 675,
    w: 150,
    h: 22,
    kind: 'moving',
    moveAmpX: 85,
    moveAmpY: 0,
    moveSpeed: 1.5,
    surfaceTint: 'cyan',
    reality: 'stable',
  },
  { id: 'p-sky-2', x: 1740, y: 410, w: 240, h: 24, kind: 'solid', surfaceTint: 'amber' },
  { id: 'p-mid-2', x: 1960, y: 640, w: 250, h: 34, kind: 'solid', surfaceTint: 'emerald' },

  // ACTO III: Acertijo de Prismas + Puente que se Construye Jugando + Gruta de Cristal (2280 .. 3480)
  { id: 'p-cp3', x: 2270, y: 715, w: 290, h: 46, kind: 'solid', surfaceTint: 'emerald' },
  { id: 'p-cave-step', x: 2460, y: 845, w: 160, h: 24, kind: 'solid', surfaceTint: 'crystal' },
  { id: 'p-cave-main', x: 2640, y: 905, w: 410, h: 38, kind: 'solid', surfaceTint: 'crystal' },
  {
    id: 'p-sync-3',
    x: 2610,
    y: 590,
    w: 150,
    h: 22,
    kind: 'sync',
    syncPeriod: 4.2,
    syncOffset: 0.6,
    stabilizerGroup: 'grp-2',
    surfaceTint: 'cyan',
    reality: 'glitch',
  },
  { id: 'p-shard-top', x: 2820, y: 485, w: 210, h: 26, kind: 'solid', surfaceTint: 'amber' },
  {
    id: 'p-mov-2',
    x: 3090,
    y: 555,
    w: 145,
    h: 22,
    kind: 'moving',
    moveAmpX: 0,
    moveAmpY: 65,
    moveSpeed: 1.7,
    surfaceTint: 'cyan',
    reality: 'stable',
  },
  {
    id: 'p-bridge-mid',
    x: 2560,
    y: 715,
    w: 830,
    h: 28,
    kind: 'reconstructed-mid',
    surfaceTint: 'amber',
  },

  // ACTO IV: El Nodo del Cartógrafo — Desafío Final de Maestría (3390 .. 4700)
  { id: 'p-cp4', x: 3390, y: 730, w: 340, h: 48, kind: 'solid', surfaceTint: 'emerald' },
  {
    id: 'p-arena-sync-w',
    x: 3775,
    y: 635,
    w: 145,
    h: 22,
    kind: 'sync',
    syncPeriod: 4.0,
    syncOffset: 0,
    stabilizerGroup: 'grp-3',
    surfaceTint: 'cyan',
    reality: 'glitch',
  },
  { id: 'p-res-1', x: 3960, y: 550, w: 185, h: 28, kind: 'solid', surfaceTint: 'emerald' },
  {
    id: 'p-arena-mov-c',
    x: 3760,
    y: 435,
    w: 150,
    h: 22,
    kind: 'moving',
    moveAmpX: 70,
    moveAmpY: 0,
    moveSpeed: 1.6,
    surfaceTint: 'amber',
    reality: 'stable',
  },
  { id: 'p-res-2', x: 3500, y: 340, w: 195, h: 28, kind: 'solid', surfaceTint: 'amber' },
  {
    id: 'p-arena-sync-e',
    x: 3980,
    y: 370,
    w: 150,
    h: 22,
    kind: 'sync',
    syncPeriod: 4.0,
    syncOffset: 2.0,
    stabilizerGroup: 'grp-3',
    surfaceTint: 'cyan',
    reality: 'glitch',
  },
  { id: 'p-res-3', x: 4185, y: 475, w: 190, h: 28, kind: 'solid', surfaceTint: 'emerald' },
  { id: 'p-arena-low', x: 3920, y: 785, w: 330, h: 32, kind: 'solid', surfaceTint: 'crystal' },

  {
    id: 'p-bridge-final',
    x: 4230,
    y: 730,
    w: 220,
    h: 28,
    kind: 'reconstructed-final',
    surfaceTint: 'cyan',
  },
  { id: 'p-goal-sanctuary', x: 4445, y: 730, w: 270, h: 52, kind: 'solid', surfaceTint: 'amber' },
];

const PIXEL_CURRENTS: PixelCurrentZone[] = [
  {
    id: 'cur-1',
    x: 745,
    y: 495,
    w: 74,
    h: 170,
    ax: 0,
    ay: -980,
    color: '#00f3ff',
    label: 'Corriente Ascendente',
  },
  {
    id: 'cur-2',
    x: 1665,
    y: 400,
    w: 86,
    h: 320,
    ax: 90,
    ay: -1080,
    color: '#00f3ff',
    label: 'Géiser de Píxeles',
  },
  {
    id: 'cur-3',
    x: 1980,
    y: 470,
    w: 310,
    h: 120,
    ax: 640,
    ay: -280,
    color: '#34d399',
    label: 'Ráfaga Horizontal',
  },
  {
    id: 'cur-4',
    x: 3005,
    y: 560,
    w: 84,
    h: 355,
    ax: 0,
    ay: -1120,
    color: '#a855f7',
    label: 'Ascensor de Cuarzo',
  },
  {
    id: 'cur-5',
    x: 4205,
    y: 490,
    w: 82,
    h: 295,
    ax: 0,
    ay: -1060,
    color: '#facc15',
    label: 'Columna Astral',
  },
];

const STABILIZERS: StabilizerSwitch[] = [
  { id: 'stab-1', group: 'grp-1', x: 385, y: 760, label: 'Estabilizador de Fase I' },
  { id: 'stab-2', group: 'grp-2', x: 2515, y: 715, label: 'Estabilizador del Abismo' },
  { id: 'stab-3', group: 'grp-3', x: 3695, y: 730, label: 'Estabilizador del Nodo' },
];

// Acertijo Ambiental: 2 Prismas Armónicos que enfocan los anclajes ópticos del Puente Central
const HARMONIC_PRISMS: HarmonicPrism[] = [
  {
    id: 'prism-alfa',
    x: 2455,
    y: 715,
    targetX: 2575,
    targetY: 729,
    color: '#00f3ff',
    label: 'Prisma Armónico Alfa (440 Hz)',
  },
  {
    id: 'prism-beta',
    x: 2535,
    y: 845,
    targetX: 2975,
    targetY: 729,
    color: '#a855f7',
    label: 'Prisma Armónico Beta (554 Hz)',
  },
];

const BRIDGE_SHARDS: BridgeShard[] = [
  {
    id: 'shard-1',
    x: 2745,
    y: 865,
    shape: 'triangle',
    color: '#00f3ff',
    label: 'Fragmento 1/3 · Triángulo de Fósforo',
  },
  {
    id: 'shard-2',
    x: 2925,
    y: 445,
    shape: 'prism',
    color: '#facc15',
    label: 'Fragmento 2/3 · Prisma de Sincronía',
  },
  {
    id: 'shard-3',
    x: 3160,
    y: 455,
    shape: 'hex',
    color: '#34d399',
    label: 'Fragmento 3/3 · Núcleo Hexagonal',
  },
];

const TRAIL_DIAMONDS: TrailDiamond[] = [
  { id: 'trl-dia-umbral', x: 765, y: 440, label: 'Diamante del Umbral Alto' },
  { id: 'trl-dia-corriente-alta', x: 1860, y: 365, label: 'Diamante de la Corriente Celeste' },
  { id: 'trl-dia-gruta-secreta', x: 2920, y: 860, label: 'Diamante de la Gruta Breakout' },
  { id: 'trl-dia-cumbre-cartografo', x: 3595, y: 295, label: 'Diamante de la Corona del Cartógrafo' },
];

const TRAIL_ECHOES: TrailEchoNode[] = [
  {
    id: 'echo-1972-odyssey',
    year: 1972,
    title: 'Sombra del Pasado · Magnavox Odyssey (1972)',
    x: 805,
    y: 665,
    accentHex: '#38bdf8',
    message:
      'Diseñada por Ralph Baer, llevó por primera vez el juego electrónico al televisor del hogar usando láminas translúcidas. Pista: usa la corriente azul sobre ti para alcanzar el primer Diamante.',
  },
  {
    id: 'echo-1976-breakout',
    year: 1976,
    title: 'Sombra del Pasado · Breakout (Atari, 1976)',
    x: 2825,
    y: 905,
    accentHex: '#f59e0b',
    message:
      'Concebido en Atari y optimizado en chips TTL por Steve Wozniak, convirtió el rebote geométrico en pura arquitectura destructible. ¡A la derecha brilla un Diamante y el ascensor de cuarzo!',
  },
  {
    id: 'echo-cronoscopio-anomalia',
    year: 1979,
    title: 'Anomalía Temporal · Eco de El Cronoscopio',
    x: 2065,
    y: 640,
    accentHex: '#c084fc',
    message:
      'Las grietas violetas y cian de este cañón resuenan con El Cronoscopio de Las Ruinas del Primer Pulso. Cuando restaures este puente y defiendas 1978, la Máquina del Tiempo podrá abrir el salto hacia los años 80.',
  },
  {
    id: 'echo-double-jump-core',
    year: 1978,
    title: 'Núcleo de Impulso · Salto Doble',
    x: 1845,
    y: 372,
    accentHex: '#facc15',
    message: 'Un núcleo recuperado enseña a PIXEL a impulsarse una segunda vez en el aire. La mejora queda registrada en el Códice y abre rutas de altura en futuras incursiones.',
  },
];

const TRAIL_NPCS: TrailNpcNode[] = [
  {
    id: 'cartographer-intro',
    name: 'El Cartógrafo del Caos',
    role: 'Arquitecto de Coordenadas Desfasadas',
    x: 255,
    y: 760,
    isCartographer: true,
    accentHex: '#c084fc',
    speech:
      '«Bienvenido a La Máquina que Sueña, Pixel. Pulsa Q o X para alternar entre Estado Estable y Glitch. Cada cambio libera un Pulso de Reconstrucción que revela por un instante las rutas de la otra memoria. Shift conserva tu Impulso de Fase.»',
  },
  {
    id: 'npc-chispa76',
    name: 'Chispa-76 · Cursor Errante',
    role: 'Explorador Amistoso del Cañón',
    x: 1295,
    y: 715,
    accentHex: '#34d399',
    speech:
      '«¡Fiuuu! Estas Corrientes de Píxeles son divertidísimas: déjate llevar hacia arriba para descubrir atajos aéreos y Diamantes de Memoria cian.»',
  },
  {
    id: 'npc-nibble',
    name: 'Nibble · Guardagujas Geométrico',
    role: 'Vigilante del Abismo Central',
    x: 2355,
    y: 715,
    accentHex: '#38bdf8',
    speech:
      '«¡Acertijo del Abismo! Sintoniza los 2 Prismas Armónicos [E] y reúne los 3 Fragmentos Geométricos (uno en la gruta inferior y dos en las terrazas altas) para tender el Puente Central.»',
    speechAfterGoal:
      '«¡Increíble! Alineaste los haces ópticos y reconstruiste el puente como todo un Arquitecto de los 70.»',
  },
  {
    id: 'cartographer-finale',
    name: 'El Cartógrafo del Caos',
    role: 'Maestro de Ceremonias del Nodo Final',
    x: 3560,
    y: 730,
    isCartographer: true,
    accentHex: '#facc15',
    speech:
      '«¡Nada de peleas aburridas con barras de vida! Activa mis 3 Resonadores Astrales combinando corrientes, plataformas en fase y precisión para tender el Gran Puente hacia Space Invaders (1978).»',
    speechAfterGoal:
      '«¡Bravo, Arquitecto! El Conducto Astral está completo. Cruza el portal dorado: La Fortaleza de las Oleadas de 1978 te espera.»',
  },
];

const FINAL_RESONATORS: FinalResonatorNode[] = [
  { id: 'res-este', label: 'Resonador Este', x: 4050, y: 550, color: '#00f3ff' },
  { id: 'res-cenit', label: 'Resonador Cenital', x: 3595, y: 340, color: '#facc15' },
  { id: 'res-astral', label: 'Resonador Astral', x: 4280, y: 475, color: '#39ff14' },
];

const TRAIL_ENEMIES: TrailEnemySpec[] = [
  { id: 'sentinel-umbral', kind: 'sentinel', x: 760, y: 631, range: 64, hp: 2 },
  { id: 'drone-corriente', kind: 'drone', x: 1880, y: 354, range: 58, hp: 2, fireRate: 2.6 },
  { id: 'guardian-fundicion', kind: 'guardian', x: 3130, y: 510, range: 72, hp: 4 },
];

const EXTRA_LIFE_PICKUP = { x: 3438, y: 674, id: 'life-core-checkpoint' };

const GLITCH_WISPS: GlitchWisp[] = [
  { cx: 2085, cy: 595, rx: 65, ry: 22, speed: 2.1, phase: 0, reality: 'stable' },
  { cx: 3890, cy: 495, rx: 72, ry: 32, speed: 1.9, phase: 1.4, reality: 'glitch' },
  { cx: 4095, cy: 420, rx: 58, ry: 26, speed: 2.2, phase: 2.8 },
];

type GrovePalette = { outline: string; deep: string; shade: string; leaf: string; sun: string; glint: string; bark: string; barkLight: string };

function drawPixelGroveTree(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  scale: number,
  seed: number,
  palette: GrovePalette
) {
  const px = Math.max(1, Math.round(scale));
  const trunkW = 12 * px;
  const trunkH = 45 * px;
  const crownW = (50 + (seed % 3) * 8) * px;
  const crownH = (52 + (seed % 2) * 10) * px;
  const crownY = groundY - trunkH - crownH + 8 * px;

  // Raíces y tronco en escalones de corteza, con caras de luz y sombra.
  ctx.fillStyle = palette.outline;
  ctx.fillRect(cx - trunkW / 2 - 2 * px, groundY - 10 * px, trunkW + 4 * px, 12 * px);
  ctx.fillRect(cx - 4 * px, groundY - trunkH, 8 * px, trunkH);
  ctx.fillRect(cx - 9 * px, groundY - 4 * px, 8 * px, 5 * px);
  ctx.fillRect(cx + 4 * px, groundY - 3 * px, 8 * px, 4 * px);
  ctx.fillStyle = palette.bark;
  ctx.fillRect(cx - 3 * px, groundY - trunkH, 6 * px, trunkH - 2 * px);
  ctx.fillRect(cx - 7 * px, groundY - 7 * px, 5 * px, 4 * px);
  ctx.fillRect(cx + 3 * px, groundY - 6 * px, 6 * px, 3 * px);
  ctx.fillStyle = palette.barkLight;
  ctx.fillRect(cx - 2 * px, groundY - trunkH + 3 * px, 2 * px, trunkH - 9 * px);
  ctx.fillRect(cx - 5 * px, groundY - 22 * px, 3 * px, 2 * px);
  ctx.fillStyle = palette.deep;
  ctx.fillRect(cx + 2 * px, groundY - 31 * px, 2 * px, 14 * px);

  // Copa escalonada en lóbulos cosidos entre sí, no una silueta oval plana.
  const lobes = [
    { x: -0.43, y: 0.50, w: 0.62, h: 0.50 },
    { x: 0.34, y: 0.54, w: 0.61, h: 0.48 },
    { x: -0.28, y: 0.22, w: 0.58, h: 0.49 },
    { x: 0.22, y: 0.25, w: 0.58, h: 0.48 },
    { x: 0, y: 0.02, w: 0.57, h: 0.46 },
  ];
  for (let li = 0; li < lobes.length; li++) {
    const lobe = lobes[li];
    const centerX = cx + lobe.x * crownW;
    const centerY = crownY + lobe.y * crownH;
    const halfW = lobe.w * crownW * 0.5;
    const halfH = lobe.h * crownH * 0.5;
    const rows = 9;
    for (let row = 0; row < rows; row++) {
      const ratio = row / (rows - 1);
      const shoulder = Math.min(ratio, 1 - ratio) * 2;
      const rowW = halfW * (0.48 + shoulder * 0.52);
      const y = Math.round(centerY - halfH + ratio * (2 * halfH));
      const h = Math.max(px * 2, Math.round((2 * halfH) / rows));
      ctx.fillStyle = palette.outline;
      ctx.fillRect(Math.round(centerX - rowW - px), y, Math.round(rowW * 2 + px * 2), h);
      ctx.fillStyle = ratio > 0.58 ? palette.deep : palette.shade;
      ctx.fillRect(Math.round(centerX - rowW), y + px, Math.round(rowW * 2), Math.max(px, h - px));
      const lightW = Math.round(rowW * (li === 4 ? 1.48 : 1.24));
      ctx.fillStyle = ratio < 0.43 ? palette.leaf : palette.shade;
      ctx.fillRect(Math.round(centerX - rowW + px), y + px, Math.max(px, lightW), Math.max(px, h - px * 2));
      if (ratio < 0.28 && row % 2 === 0) {
        ctx.fillStyle = palette.sun;
        ctx.fillRect(Math.round(centerX - rowW + px * 2), y + px, Math.round(rowW * 0.46), px);
      }
    }
    // Racimos visibles sobre el volumen de cada lóbulo.
    for (let fleck = 0; fleck < 5; fleck++) {
      const fx = Math.round(centerX + (((seed + li * 13 + fleck * 17) % 19) - 9) * px);
      const fy = Math.round(centerY + (((seed * 3 + li * 7 + fleck * 11) % 13) - 8) * px);
      ctx.fillStyle = fleck % 3 === 0 ? palette.glint : palette.sun;
      ctx.fillRect(fx, fy, 2 * px, px);
      ctx.fillStyle = palette.deep;
      ctx.fillRect(fx + 3 * px, fy + px, px, px);
    }
  }
}

function drawDigitalWaterfall(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  height: number,
  width: number,
  elapsed: number,
  color: string
) {
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#101a31';
  ctx.fillRect(x - 5, top, width + 10, 7);
  ctx.fillStyle = color;
  ctx.fillRect(x, top + 6, width, height);
  ctx.fillStyle = 'rgba(4, 10, 27, 0.44)';
  ctx.fillRect(x + Math.floor(width * 0.58), top + 6, Math.ceil(width * 0.42), height);
  for (let strand = 0; strand < 5; strand++) {
    const sx = x + 4 + strand * Math.max(4, Math.floor((width - 8) / 5));
    for (let drop = 0; drop < 6; drop++) {
      const sy = top + 9 + ((drop * 31 + strand * 17 + Math.floor(elapsed * (9 + strand))) % Math.max(12, height - 10));
      ctx.fillStyle = drop % 3 === 0 ? '#fff4b8' : color;
      ctx.fillRect(sx, sy, strand % 2 ? 2 : 3, 5 + (drop % 2) * 3);
    }
  }
  ctx.restore();
}

export function GlitchTrailStage({
  skinColor,
  hairColor,
  shirtColor,
  appearance,
  collectedDiamondIds,
  alreadyRestoredBefore,
  discoveredEchoIds,
  onCheckpointReached,
  onCollectDiamond,
  onDiscoverEcho,
  onVictoryRecorded,
  onComplete,
  onReturnToIsland,
}: GlitchTrailStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cada entrada es una nueva tentativa desde el umbral; los checkpoints rigen esta sesión.
  const resolvedStartCp = CHECKPOINTS[0];

  const [shardsCount, setShardsCount] = useState<number>(0);
  const [prismsCount, setPrismsCount] = useState<number>(0);
  const [resonatorsCount, setResonatorsCount] = useState<number>(0);
  const [realityMode, setRealityMode] = useState<TrailReality>('stable');
  const [healthPoints, setHealthPoints] = useState<number>(3);
  const [livesCount, setLivesCount] = useState<number>(3);
  const [bossHealthDisplay, setBossHealthDisplay] = useState<number>(0);
  const [bossActiveDisplay, setBossActiveDisplay] = useState<boolean>(false);
  const [doubleJumpAvailable, setDoubleJumpAvailable] = useState<boolean>(
    discoveredEchoIds.includes('echo-double-jump-core')
  );
  const discoveredEchoIdsRef = useRef(discoveredEchoIds);
  discoveredEchoIdsRef.current = discoveredEchoIds;
  const [activeCheckpointName, setActiveCheckpointName] = useState<string>(
    resolvedStartCp.name
  );
  const [speechBubble, setSpeechBubble] = useState<{
    speaker: string;
    role: string;
    text: string;
    accentHex: string;
  } | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [ceremonyOpen, setCeremonyOpen] = useState<boolean>(false);

  const collectedRef = useRef<string[]>(collectedDiamondIds);
  collectedRef.current = collectedDiamondIds;

  const callbacksRef = useRef({
    onCheckpointReached,
    onCollectDiamond,
    onDiscoverEcho,
    onVictoryRecorded,
  });
  callbacksRef.current = {
    onCheckpointReached,
    onCollectDiamond,
    onDiscoverEcho,
    onVictoryRecorded,
  };

  const respawnRequestRef = useRef<boolean>(false);

  const virtualControlsRef = useRef({
    left: false,
    right: false,
    jumpPressed: false,
    jumpHeld: false,
    dashPressed: false,
    realityPressed: false,
    attackPressed: false,
    shieldPressed: false,
    interactPressed: false,
  });

  const notifyToast = useCallback((msg: string) => {
    setStatusToast(msg);
    window.setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = reducedMotionQuery.matches;
    const onMotionChange = (ev: MediaQueryListEvent) => {
      reducedMotion = ev.matches;
    };
    reducedMotionQuery.addEventListener('change', onMotionChange);

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const startCp = CHECKPOINTS[0];

    const player = {
      x: startCp.x,
      y: startCp.y,
      w: 22,
      h: 34,
      vx: 0,
      vy: 0,
      facing: 1 as 1 | -1,
      grounded: false,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      invulnTimer: 0,
      standingPlatformId: '',
      airJumpUsed: false,
      doubleJumpUnlocked: discoveredEchoIdsRef.current.includes('echo-double-jump-core'),
    };

    let currentCp = startCp;
    let activeReality: TrailReality = 'stable';
    let reconstructionPulse = 0;
    let pulseOrigin = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
    const collectedShards = new Set<string>();
    const alignedPrisms = new Set<string>();
    const activatedResonators = new Set<string>();
    const enemies: TrailEnemyState[] = TRAIL_ENEMIES.map((enemy) => ({
      ...enemy,
      originX: enemy.x,
      originY: enemy.y,
      health: enemy.hp,
      alive: true,
      fireTimer: enemy.fireRate ?? 0,
      hitFlash: 0,
    }));
    const playerShots: TrailProjectile[] = [];
    const hostileShots: TrailProjectile[] = [];
    let playerHealth = 3;
    let playerLives = 3;
    let attackCooldown = 0;
    let shieldTimer = 0;
    let shieldCooldown = 0;
    let bossHealth = 8;
    let bossAttackTimer = 1.8;
    let bossHintCooldown = 0;
    let bossIntroShown = false;
    let exitHintShown = false;
    let extraLifeCollected = false;
    const groupStabilizeTimers: Record<string, number> = {
      'grp-1': 0,
      'grp-2': 0,
      'grp-3': 0,
    };
    const localSessionDiamonds = new Set<string>(collectedRef.current);
    let levelCompleted = false;
    let victoryDispatched = false;
    let lastTickBeat = -1;

    const afterimages: { x: number; y: number; life: number }[] = [];
    const sparks: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }[] = [];

    const spawnSparks = (sx: number, sy: number, color: string, count = 16) => {
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const sp = 60 + Math.random() * 140;
        sparks.push({
          x: sx,
          y: sy,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.5,
          color,
        });
      }
    };

    const hurtPlayer = (sourceX: number) => {
      if (player.invulnTimer > 0 || shieldTimer > 0) return;
      playerHealth -= 1;
      setHealthPoints(playerHealth);
      player.invulnTimer = 0.95;
      player.vx = player.x < sourceX ? -250 : 250;
      player.vy = -260;
      retroAudio.playerHit();
      spawnSparks(player.x + player.w / 2, player.y + player.h / 2, '#fb7185', 14);
      if (playerHealth <= 0) {
        playerLives -= 1;
        if (playerLives <= 0) {
          playerLives = 3;
          notifyToast('Tres vidas recuperadas en el último checkpoint. Sigue intentando.');
        } else {
          notifyToast(`Vida perdida · ${playerLives} restantes. Reapareces en ${currentCp.name}.`);
        }
        playerHealth = 3;
        setLivesCount(playerLives);
        setHealthPoints(playerHealth);
        player.x = currentCp.x;
        player.y = currentCp.y - 36;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;
        player.standingPlatformId = '';
        player.airJumpUsed = false;
        player.invulnTimer = 1.35;
      }
    };

    const fireHostileBolt = (sx: number, sy: number, speed: number) => {
      const dx = player.x + player.w / 2 - sx;
      const dy = player.y + player.h / 2 - sy;
      const length = Math.max(1, Math.hypot(dx, dy));
      hostileShots.push({ x: sx, y: sy, vx: (dx / length) * speed, vy: (dy / length) * speed, life: 3, hostile: true });
    };

    const camera = {
      x: Math.max(0, Math.min(LEVEL_W - vw, player.x - vw * 0.36)),
      y: Math.max(0, Math.min(LEVEL_H - vh, player.y - vh * 0.58)),
    };

    const keys: Record<string, boolean> = {};
    let jumpJustPressed = false;
    let dashJustPressed = false;
    let realityJustPressed = false;
    let attackJustPressed = false;
    let shieldJustPressed = false;
    let interactJustPressed = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      keys[e.code] = true;
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        jumpJustPressed = true;
      }
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') {
        dashJustPressed = true;
      }
      if (e.code === 'KeyQ' || e.code === 'KeyX') {
        e.preventDefault();
        e.stopPropagation();
        realityJustPressed = true;
      }
      if (e.code === 'KeyZ' || e.code === 'KeyJ') attackJustPressed = true;
      if (e.code === 'KeyC') shieldJustPressed = true;
      if (e.code === 'KeyE' || e.code === 'Enter') {
        interactJustPressed = true;
      }
      if (e.code === 'KeyR') {
        respawnRequestRef.current = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const stars = Array.from({ length: 120 }, (_, i) => ({
      nx: ((i * 89) % 1000) / 1000,
      ny: ((i * 47) % 1000) / 1000,
      s: 1 + (i % 3) * 0.8,
      p: i * 0.7,
    }));

    const prevPlatPos: Record<string, { x: number; y: number }> = {};

    const isBoxInCam = (bx: number, by: number, bw: number, bh: number, pad = 160) =>
      bx + bw >= camera.x - pad &&
      bx <= camera.x + vw + pad &&
      by + bh >= camera.y - pad &&
      by <= camera.y + vh + pad;

    const getWispPosition = (wisp: GlitchWisp, t: number, reality = activeReality) => {
      const realityActive = !wisp.reality || wisp.reality === reality;
      return {
        x: wisp.cx + Math.cos(t * wisp.speed + wisp.phase) * wisp.rx + (realityActive ? 0 : 48),
        y: wisp.cy + Math.sin(t * wisp.speed + wisp.phase) * wisp.ry + (realityActive ? 0 : -22),
        realityActive,
      };
    };

    const computePlatformState = (p: TrailPlatform, t: number) => {
      let rx = p.x;
      let ry = p.y;
      let solid = true;
      let telegraphRatio = 1;

      if (p.kind === 'moving') {
        const sp = p.moveSpeed ?? 1.5;
        rx = p.x + Math.sin(t * sp) * (p.moveAmpX ?? 0);
        ry = p.y + Math.cos(t * sp) * (p.moveAmpY ?? 0);
      } else if (p.kind === 'sync') {
        const stabLeft = p.stabilizerGroup ? groupStabilizeTimers[p.stabilizerGroup] || 0 : 0;
        if (stabLeft > 0) {
          solid = true;
          telegraphRatio = 1;
        } else {
          const period = p.syncPeriod ?? 4.2;
          const cycle = ((t + (p.syncOffset ?? 0)) % period) / period;
          if (cycle < 0.62) {
            solid = true;
            telegraphRatio = (0.62 - cycle) / 0.62;
          } else {
            solid = false;
            telegraphRatio = (cycle - 0.62) / 0.38;
          }
        }
      } else if (p.kind === 'reconstructed-mid') {
        // El Puente Central se construye combinando los 2 Prismas Armónicos + los 3 Fragmentos Geométricos (5 unidades)
        const totalUnits = alignedPrisms.size + collectedShards.size;
        solid = totalUnits > 0;
      } else if (p.kind === 'reconstructed-final') {
        solid = activatedResonators.size >= 3;
      }

      const realityActive = !p.reality || p.reality === activeReality;
      if (!realityActive) solid = false;

      const effectiveW =
        p.kind === 'reconstructed-mid'
          ? (p.w * Math.min(5, alignedPrisms.size + collectedShards.size)) / 5
          : p.w;

      return { rx, ry, rw: effectiveW, rh: p.h, solid, telegraphRatio, realityActive };
    };

    let rafId = 0;
    let prevNow = performance.now();
    let elapsed = 0;
    let lastActiveSpeakerId = '';
    let nearUnalignedPrism: HarmonicPrism | null = null;

    const loop = (now: number) => {
      const dt = Math.min(0.035, (now - prevNow) / 1000);
      prevNow = now;

      if (!levelCompleted) {
        elapsed += dt;
        reconstructionPulse = Math.max(0, reconstructionPulse - dt);

        if (respawnRequestRef.current) {
          respawnRequestRef.current = false;
          retroAudio.uiClick();
          player.x = currentCp.x;
          player.y = currentCp.y - 36;
          player.vx = 0;
          player.vy = 0;
          player.airJumpUsed = false;
          player.invulnTimer = 0.9;
          spawnSparks(player.x + 11, player.y + 18, '#00f3ff', 14);
          notifyToast(`Reubicado en ${currentCp.name}`);
        }

        for (const gk of Object.keys(groupStabilizeTimers)) {
          if (groupStabilizeTimers[gk] > 0) {
            groupStabilizeTimers[gk] = Math.max(0, groupStabilizeTimers[gk] - dt);
          }
        }

        const beat = Math.floor(elapsed * 2);
        if (beat !== lastTickBeat) {
          lastTickBeat = beat;
          const nearSync = PLATFORMS.some(
            (p) => p.kind === 'sync' && Math.abs(p.x + p.w * 0.5 - player.x) < 380
          );
          if (nearSync) {
            retroAudio.syncTick(false);
          }
        }

        const vCtrl = virtualControlsRef.current;
        if (vCtrl.jumpPressed) {
          jumpJustPressed = true;
          vCtrl.jumpPressed = false;
        }
        if (vCtrl.dashPressed) {
          dashJustPressed = true;
          vCtrl.dashPressed = false;
        }
        if (vCtrl.realityPressed) {
          realityJustPressed = true;
          vCtrl.realityPressed = false;
        }
        if (vCtrl.attackPressed) {
          attackJustPressed = true;
          vCtrl.attackPressed = false;
        }
        if (vCtrl.shieldPressed) {
          shieldJustPressed = true;
          vCtrl.shieldPressed = false;
        }
        if (vCtrl.interactPressed) {
          interactJustPressed = true;
          vCtrl.interactPressed = false;
        }

        if (realityJustPressed) {
          realityJustPressed = false;
          const nextReality: TrailReality = activeReality === 'stable' ? 'glitch' : 'stable';
          const blockedByGeometry = PLATFORMS.some((p) => {
            if (p.reality !== activeReality && p.reality !== nextReality) return false;
            const platform = computePlatformState(p, elapsed);
            return (
              player.x + player.w > platform.rx + 2 &&
              player.x < platform.rx + platform.rw - 2 &&
              player.y + player.h > platform.ry + 2 &&
              player.y < platform.ry + platform.rh - 2
            );
          });
          const blockedByHazard = GLITCH_WISPS.some((wisp) => {
            const nextPosition = getWispPosition(wisp, elapsed, nextReality);
            return nextPosition.realityActive &&
              Math.hypot(player.x + player.w / 2 - nextPosition.x, player.y + player.h / 2 - nextPosition.y) < 38;
          });
          if (blockedByGeometry || blockedByHazard) {
            notifyToast(blockedByGeometry
              ? 'Pulso bloqueado · despeja la estructura antes de cambiar la realidad.'
              : 'Pulso bloqueado · espera a que pase el remolino antes de cambiar.');
          } else {
            activeReality = nextReality;
            setRealityMode(nextReality);
            reconstructionPulse = 1.15;
            pulseOrigin = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
            retroAudio.dashImpulse();
            spawnSparks(pulseOrigin.x, pulseOrigin.y, nextReality === 'glitch' ? '#e879f9' : '#facc15', 22);
            notifyToast(nextReality === 'glitch'
              ? 'PULSO DE RECONSTRUCCIÓN · la realidad Glitch revela rutas perdidas.'
              : 'ESTADO ESTABLE · la memoria vuelve a encajar.');
          }
        }

        if (attackCooldown > 0) attackCooldown = Math.max(0, attackCooldown - dt);
        if (shieldCooldown > 0) shieldCooldown = Math.max(0, shieldCooldown - dt);
        if (shieldTimer > 0) shieldTimer = Math.max(0, shieldTimer - dt);
        if (bossHintCooldown > 0) bossHintCooldown = Math.max(0, bossHintCooldown - dt);
        if (attackJustPressed) {
          attackJustPressed = false;
          if (attackCooldown <= 0 && playerShots.length < 8) {
            playerShots.push({
              x: player.x + (player.facing > 0 ? player.w : -10),
              y: player.y + 14,
              vx: player.facing * 620,
              vy: 0,
              life: 1.05,
            });
            attackCooldown = 0.28;
            retroAudio.dashImpulse();
          }
        }
        if (shieldJustPressed) {
          shieldJustPressed = false;
          if (shieldCooldown <= 0) {
            shieldTimer = 0.8;
            shieldCooldown = 4.2;
            retroAudio.syncTick(true);
            spawnSparks(player.x + player.w / 2, player.y + player.h / 2, '#67e8f9', 12);
          }
        }

        const moveLeft = Boolean(keys['KeyA'] || keys['ArrowLeft'] || vCtrl.left);
        const moveRight = Boolean(keys['KeyD'] || keys['ArrowRight'] || vCtrl.right);
        const jumpHeld = Boolean(
          keys['Space'] || keys['KeyW'] || keys['ArrowUp'] || vCtrl.jumpHeld
        );

        if (moveRight && !moveLeft) player.facing = 1;
        else if (moveLeft && !moveRight) player.facing = -1;

        if (jumpJustPressed) {
          player.jumpBufferTimer = 0.14;
          jumpJustPressed = false;
        } else if (player.jumpBufferTimer > 0) {
          player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
        }

        if (player.coyoteTimer > 0) {
          player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
        }
        if (player.dashCooldown > 0) {
          player.dashCooldown = Math.max(0, player.dashCooldown - dt);
        }
        if (player.invulnTimer > 0) {
          player.invulnTimer = Math.max(0, player.invulnTimer - dt);
        }

        if (dashJustPressed && player.dashCooldown <= 0) {
          dashJustPressed = false;
          player.dashTimer = 0.17;
          player.dashCooldown = 0.65;
          player.vx = player.facing * 560;
          player.vy = Math.min(player.vy, 0) * 0.25;
          retroAudio.dashImpulse();
        } else {
          dashJustPressed = false;
        }

        if (player.dashTimer > 0) {
          player.dashTimer = Math.max(0, player.dashTimer - dt);
          afterimages.push({ x: player.x, y: player.y, life: 0.2 });
        } else {
          const targetVx = (moveRight ? 1 : 0) - (moveLeft ? 1 : 0);
          const maxSpeed = 295;
          const accel = player.grounded ? 2100 : 1450;
          if (targetVx !== 0) {
            player.vx += targetVx * accel * dt;
            player.vx = Math.max(-maxSpeed, Math.min(maxSpeed, player.vx));
          } else {
            const friction = player.grounded ? 1900 : 650;
            if (Math.abs(player.vx) <= friction * dt) player.vx = 0;
            else player.vx -= Math.sign(player.vx) * friction * dt;
          }

          const gravity = player.vy < 0 && !jumpHeld ? 2150 : 1320;
          player.vy = Math.min(760, player.vy + gravity * dt);
        }

        if (
          player.jumpBufferTimer > 0 &&
          (player.coyoteTimer > 0 || (player.doubleJumpUnlocked && !player.airJumpUsed))
        ) {
          const groundedJump = player.coyoteTimer > 0;
          player.vy = groundedJump ? -565 : -515;
          if (!groundedJump) player.airJumpUsed = true;
          player.grounded = false;
          player.coyoteTimer = 0;
          player.jumpBufferTimer = 0;
          player.standingPlatformId = '';
          retroAudio.jump();
          spawnSparks(player.x + player.w * 0.5, player.y + player.h, '#00f3ff', 8);
        }

        for (const cur of PIXEL_CURRENTS) {
          const overlap =
            player.x + player.w > cur.x &&
            player.x < cur.x + cur.w &&
            player.y + player.h > cur.y &&
            player.y < cur.y + cur.h;
          if (overlap) {
            player.vx += cur.ax * dt;
            player.vy = Math.max(-490, player.vy + cur.ay * dt);
            if (Math.random() < 0.08) {
              retroAudio.pixelCurrentBoost();
            }
          }
        }

        const platStates = PLATFORMS.map((p) => {
          const st = computePlatformState(p, elapsed);
          const prev = prevPlatPos[p.id];
          const dx = prev ? st.rx - prev.x : 0;
          const dy = prev ? st.ry - prev.y : 0;
          prevPlatPos[p.id] = { x: st.rx, y: st.ry };
          return { p, ...st, dx, dy };
        });

        if (player.grounded && player.standingPlatformId) {
          const carrier = platStates.find((ps) => ps.p.id === player.standingPlatformId);
          if (carrier && carrier.solid) {
            player.x += carrier.dx;
            player.y += carrier.dy;
          }
        }

        const prevBottom = player.y + player.h;
        player.x = Math.max(20, Math.min(LEVEL_W - 44, player.x + player.vx * dt));
        player.y += player.vy * dt;

        player.grounded = false;
        player.standingPlatformId = '';
        for (const ps of platStates) {
          if (!ps.solid || ps.rw <= 4) continue;
          const horizOverlap =
            player.x + player.w - 3 > ps.rx && player.x + 3 < ps.rx + ps.rw;
          if (
            horizOverlap &&
            player.vy >= 0 &&
            prevBottom <= ps.ry + 14 &&
            player.y + player.h >= ps.ry
          ) {
            player.y = ps.ry - player.h;
            player.vy = 0;
            player.grounded = true;
            player.coyoteTimer = 0.13;
            player.airJumpUsed = false;
            player.standingPlatformId = ps.p.id;
            break;
          }
        }

        // IA de patrulla, drones con aviso de disparo y guardianes de embestida legible.
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
          if (enemy.kind === 'sentinel') {
            enemy.x = enemy.originX + Math.sin(elapsed * 1.7) * enemy.range;
            enemy.y = enemy.originY + Math.max(0, Math.sin(elapsed * 3.4)) * 3;
          } else if (enemy.kind === 'drone') {
            enemy.x = enemy.originX + Math.sin(elapsed * 0.9) * enemy.range;
            enemy.y = enemy.originY + Math.sin(elapsed * 2.1) * 24;
            enemy.fireTimer -= dt;
            if (enemy.fireTimer <= 0 && Math.abs(player.x - enemy.x) < 540) {
              fireHostileBolt(enemy.x + 5, enemy.y + 20, 205);
              enemy.fireTimer = enemy.fireRate ?? 2.6;
            } else if (enemy.fireTimer <= 0) {
              enemy.fireTimer = 0.42;
            }
          } else {
            const distance = player.x - enemy.originX;
            const chargeCycle = (elapsed + 0.4) % 3.2;
            const charge = Math.abs(distance) < 245 && chargeCycle > 0.62 && chargeCycle < 1.15;
            enemy.x = charge
              ? enemy.originX + Math.sign(distance) * Math.min(enemy.range + 35, (chargeCycle - 0.62) * 390)
              : enemy.originX + Math.sin(elapsed * 1.15) * enemy.range * 0.35;
            enemy.y = enemy.originY + (Math.abs(distance) < 245 && chargeCycle < 0.62 ? -3 : 0);
          }
        }

        // Actualizar y persistir Checkpoints
        for (const cp of CHECKPOINTS) {
          if (player.x >= cp.x - 24 && cp.x > currentCp.x) {
            currentCp = cp;
            setActiveCheckpointName(cp.name);
            callbacksRef.current.onCheckpointReached?.(cp.id);
            retroAudio.zoneChime();
            notifyToast(`Punto de control guardado · ${cp.name}`);
          }
        }

        // Reaparición justa e instantánea si cae al vacío
        if (player.y > LEVEL_H + 60) {
          retroAudio.playerHit();
          playerLives -= 1;
          if (playerLives <= 0) playerLives = 3;
          setLivesCount(playerLives);
          playerHealth = 3;
          setHealthPoints(playerHealth);
          player.x = currentCp.x;
          player.y = currentCp.y - 36;
          player.vx = 0;
          player.vy = 0;
          player.invulnTimer = 1.1;
          player.airJumpUsed = false;
          spawnSparks(player.x + 11, player.y + 18, '#00f3ff', 14);
        }

        const pcx = player.x + player.w * 0.5;
        const pcy = player.y + player.h * 0.5;

        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          const ew = enemy.kind === 'drone' ? 34 : enemy.kind === 'guardian' ? 38 : 28;
          const eh = enemy.kind === 'drone' ? 24 : 32;
          if (
            player.x + player.w > enemy.x - ew / 2 &&
            player.x < enemy.x + ew / 2 &&
            player.y + player.h > enemy.y &&
            player.y < enemy.y + eh
          ) {
            hurtPlayer(enemy.x);
          }
        }

        const coreActive = activatedResonators.size >= 3;
        const bossX = 4340 + Math.sin(elapsed * 0.75) * 32;
        const bossY = 630 + Math.sin(elapsed * 1.5) * 18;
        const bossCycle = elapsed % 4.8;
        const bossVulnerable = bossCycle > 2.5 && bossCycle < 3.6;
        if (coreActive && !bossIntroShown) {
          bossIntroShown = true;
          bossAttackTimer = 1.8;
          setBossActiveDisplay(true);
          setBossHealthDisplay(bossHealth);
          notifyToast('El núcleo abre su ojo durante cada Pulso · ataca en la ventana dorada.');
        }
        if (coreActive && bossHealth > 0) {
          bossAttackTimer -= dt;
          if (bossAttackTimer <= 0) {
            fireHostileBolt(bossX - 20, bossY + 15, 245);
            bossAttackTimer = 1.9;
          }
          if (Math.hypot(pcx - bossX, pcy - bossY) < 48) hurtPlayer(bossX);
        }

        for (let i = playerShots.length - 1; i >= 0; i--) {
          const shot = playerShots[i];
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          shot.life -= dt;
          let consumed = shot.life <= 0 || shot.x < camera.x - 80 || shot.x > camera.x + vw + 80;

          for (const enemy of enemies) {
            if (!enemy.alive || consumed) continue;
            const ew = enemy.kind === 'drone' ? 34 : enemy.kind === 'guardian' ? 38 : 28;
            const eh = enemy.kind === 'drone' ? 24 : 32;
            if (shot.x + 12 > enemy.x - ew / 2 && shot.x < enemy.x + ew / 2 && shot.y + 8 > enemy.y && shot.y < enemy.y + eh) {
              consumed = true;
              const guardianCycle = (elapsed + 0.4) % 3.2;
              const exposed = enemy.kind !== 'guardian' || (guardianCycle > 0.62 && guardianCycle < 1.15);
              if (exposed) {
                enemy.health -= 1;
                enemy.hitFlash = 0.14;
                spawnSparks(shot.x, shot.y, enemy.kind === 'guardian' ? '#f472b6' : '#67e8f9', 10);
                retroAudio.npcBlip(0.75);
                if (enemy.health <= 0) {
                  enemy.alive = false;
                  spawnSparks(enemy.x, enemy.y + 14, '#facc6b', 22);
                  notifyToast(enemy.kind === 'guardian' ? 'Guardián de Fundición desactivado.' : 'Centinela de la cicatriz desarmado.');
                }
              } else {
                spawnSparks(shot.x, shot.y, '#fda4af', 7);
              }
            }
          }

          for (const stab of STABILIZERS) {
            if (consumed) break;
            if (Math.hypot(shot.x - stab.x, shot.y - (stab.y - 16)) < 22) {
              groupStabilizeTimers[stab.group] = 7.5;
              consumed = true;
              retroAudio.bridgeActivate();
              spawnSparks(stab.x, stab.y - 16, '#fde047', 16);
              notifyToast(`${stab.label} activado con el Pulso de Energía · plataformas fijadas.`);
            }
          }

          if (coreActive && bossHealth > 0 && !consumed && Math.hypot(shot.x - bossX, shot.y - bossY) < 46) {
            consumed = true;
            if (bossVulnerable) {
              bossHealth -= 1;
              setBossHealthDisplay(bossHealth);
              retroAudio.shardCollect(3);
              spawnSparks(bossX, bossY, '#fde047', 18);
              if (bossHealth <= 0) {
                spawnSparks(bossX, bossY, '#facc6b', 56);
                retroAudio.bridgeActivate();
                notifyToast('Núcleo liberado · La Máquina que Sueña recuerda su origen.');
              }
            } else {
              spawnSparks(shot.x, shot.y, '#94a3b8', 8);
              if (bossHintCooldown <= 0) {
                bossHintCooldown = 1.4;
                notifyToast('El núcleo está sellado · espera a que su ojo se vuelva dorado.');
              }
            }
          }
          if (consumed) playerShots.splice(i, 1);
        }

        for (let i = hostileShots.length - 1; i >= 0; i--) {
          const shot = hostileShots[i];
          shot.x += shot.vx * dt;
          shot.y += shot.vy * dt;
          shot.life -= dt;
          const hit = shot.x > player.x - 3 && shot.x < player.x + player.w + 3 &&
            shot.y > player.y - 2 && shot.y < player.y + player.h + 2;
          if (hit) {
            if (shieldTimer > 0) {
              spawnSparks(shot.x, shot.y, '#67e8f9', 9);
              retroAudio.syncTick(true);
            } else {
              hurtPlayer(shot.x);
            }
            hostileShots.splice(i, 1);
          } else if (shot.life <= 0 || shot.x < camera.x - 120 || shot.x > camera.x + vw + 120) {
            hostileShots.splice(i, 1);
          }
        }

        if (!extraLifeCollected && Math.hypot(pcx - EXTRA_LIFE_PICKUP.x, pcy - EXTRA_LIFE_PICKUP.y) < 30) {
          extraLifeCollected = true;
          playerLives = Math.min(5, playerLives + 1);
          setLivesCount(playerLives);
          retroAudio.shardCollect(2);
          spawnSparks(EXTRA_LIFE_PICKUP.x, EXTRA_LIFE_PICKUP.y, '#fb7185', 24);
          notifyToast('Núcleo vital recuperado · +1 vida.');
        }

        if (player.invulnTimer <= 0 && player.dashTimer <= 0) {
          for (const wisp of GLITCH_WISPS) {
            const position = getWispPosition(wisp, elapsed);
            if (!position.realityActive) continue;
            const wx = position.x;
            const wy = position.y;
            if (Math.hypot(pcx - wx, pcy - wy) < 22) {
              hurtPlayer(wx);
              notifyToast('Desfase temporal · Reubicado en el último punto de control.');
              break;
            }
          }
        }

        for (const stab of STABILIZERS) {
          if (
            Math.hypot(pcx - stab.x, pcy - (stab.y - 16)) < 40 &&
            (groupStabilizeTimers[stab.group] || 0) < 5.5
          ) {
            groupStabilizeTimers[stab.group] = 7.5;
            retroAudio.shardCollect(2);
            spawnSparks(stab.x, stab.y - 16, '#facc15', 14);
            notifyToast(`${stab.label} activado · Plataformas fijadas 7.5s`);
          }
        }

        // Acertijo Ambiental: Sintonizar los 2 Prismas Armónicos ([E] o Impulso/Salto sobre su lente)
        nearUnalignedPrism = null;
        for (const prism of HARMONIC_PRISMS) {
          if (alignedPrisms.has(prism.id)) continue;
          const dist = Math.hypot(pcx - prism.x, pcy - (prism.y - 26));
          if (dist < 64) {
            nearUnalignedPrism = prism;
            if (interactJustPressed || player.dashTimer > 0 || (dist < 30 && player.vy < -60)) {
              alignedPrisms.add(prism.id);
              setPrismsCount(alignedPrisms.size);
              retroAudio.prismAlign(alignedPrisms.size);
              spawnSparks(prism.x, prism.y - 28, prism.color, 22);
              const bridgeReady =
                alignedPrisms.size >= 2 && collectedShards.size >= 3;
              if (bridgeReady) {
                retroAudio.bridgeActivate();
                notifyToast('¡Prismas y Fragmentos en resonancia! Puente Central completado.');
              } else {
                notifyToast(
                  `${prism.label} alineado (${alignedPrisms.size}/2) · Haz óptico proyectado al puente.`
                );
              }
            }
          }
        }
        interactJustPressed = false;

        // Recolectar Fragmentos Geométricos del Puente (Acto III)
        for (const shard of BRIDGE_SHARDS) {
          if (collectedShards.has(shard.id)) continue;
          if (Math.hypot(pcx - shard.x, pcy - shard.y) < 36) {
            collectedShards.add(shard.id);
            setShardsCount(collectedShards.size);
            retroAudio.shardCollect(collectedShards.size);
            spawnSparks(shard.x, shard.y, shard.color, 22);
            if (collectedShards.size === 3 && alignedPrisms.size >= 2) {
              retroAudio.bridgeActivate();
              notifyToast('¡Puente Geométrico Central completo! Cruza hacia el Nodo del Cartógrafo.');
            } else if (collectedShards.size === 3) {
              notifyToast(
                '¡3/3 Fragmentos reunidos! Sintoniza los 2 Prismas Armónicos [E] para tender todo el puente.'
              );
            } else {
              notifyToast(`${shard.label} acoplado al puente.`);
            }
          }
        }

        // Recolectar Diamantes de Memoria Cian (únicos)
        for (const dia of TRAIL_DIAMONDS) {
          if (localSessionDiamonds.has(dia.id)) continue;
          if (Math.hypot(pcx - dia.x, pcy - dia.y) < 34) {
            localSessionDiamonds.add(dia.id);
            callbacksRef.current.onCollectDiamond(dia.id);
            retroAudio.collectDiamond(localSessionDiamonds.size);
            spawnSparks(dia.x, dia.y, '#00f3ff', 24);
            notifyToast(`¡Diamante de Memoria recuperado! · ${dia.label}`);
          }
        }

        // Activar los 3 Resonadores Astrales del Desafío Final (Acto IV)
        for (const res of FINAL_RESONATORS) {
          if (activatedResonators.has(res.id)) continue;
          if (Math.hypot(pcx - res.x, pcy - (res.y - 22)) < 42) {
            activatedResonators.add(res.id);
            setResonatorsCount(activatedResonators.size);
            retroAudio.shardCollect(activatedResonators.size + 1);
            spawnSparks(res.x, res.y - 22, res.color, 26);
            if (activatedResonators.size === 3) {
              retroAudio.bridgeActivate();
              notifyToast(
                '¡Conducto Astral armonizado! El Puente Monumental hacia 1978 se ha desplegado.'
              );
            } else {
              notifyToast(
                `${res.label} sincronizado (${activatedResonators.size}/3) · ¡Sigue ascendiendo!`
              );
            }
          }
        }

        // Encuentros automáticos con NPCs, Cartógrafo y Sombras del Pasado
        let nearSpeaker: {
          id: string;
          speaker: string;
          role: string;
          text: string;
          accentHex: string;
          isEcho?: boolean;
        } | null = null;

        for (const npc of TRAIL_NPCS) {
          if (Math.hypot(pcx - npc.x, pcy - (npc.y - 20)) < 95) {
            const solved =
              npc.id === 'npc-nibble'
                ? collectedShards.size >= 3 && alignedPrisms.size >= 2
                : activatedResonators.size >= 3;
            nearSpeaker = {
              id: npc.id,
              speaker: npc.name,
              role: npc.role,
              text: solved && npc.speechAfterGoal ? npc.speechAfterGoal : npc.speech,
              accentHex: npc.accentHex,
            };
            break;
          }
        }

        if (!nearSpeaker) {
          for (const echo of TRAIL_ECHOES) {
            if (Math.hypot(pcx - echo.x, pcy - (echo.y - 20)) < 85) {
              nearSpeaker = {
                id: echo.id,
                speaker: echo.title,
                role: `ARCHIVO HOLOGRÁFICO · ${echo.year}`,
                text: echo.message,
                accentHex: echo.accentHex,
                isEcho: true,
              };
              break;
            }
          }
        }

        const nextSpeakerId = nearSpeaker ? nearSpeaker.id : '';
        if (nextSpeakerId !== lastActiveSpeakerId) {
          lastActiveSpeakerId = nextSpeakerId;
          if (nearSpeaker) {
            if (nearSpeaker.isEcho) {
              retroAudio.echoDiscover();
              callbacksRef.current.onDiscoverEcho(nearSpeaker.id);
              if (nearSpeaker.id === 'echo-double-jump-core' && !player.doubleJumpUnlocked) {
                player.doubleJumpUnlocked = true;
                setDoubleJumpAvailable(true);
                notifyToast('Salto doble desbloqueado y registrado en el Códice. Pulsa Espacio otra vez en el aire.');
              }
            } else {
              retroAudio.npcBlip(1.0);
            }
            setSpeechBubble({
              speaker: nearSpeaker.speaker,
              role: nearSpeaker.role,
              text: nearSpeaker.text,
              accentHex: nearSpeaker.accentHex,
            });
          } else {
            setSpeechBubble(null);
          }
        }

        // Meta Final con guardia de ejecución única
        if (!exitHintShown && activatedResonators.size >= 3 && bossHealth > 0 && pcx >= 4500) {
          exitHintShown = true;
          notifyToast('El portal sigue sellado · derrota al Guardián del Núcleo para reconstruir la salida.');
        }
        if (!victoryDispatched && activatedResonators.size >= 3 && bossHealth <= 0 && pcx >= 4565 && pcy <= 745) {
          victoryDispatched = true;
          levelCompleted = true;
          retroAudio.portalVictory();
          const trailDiamondsOwned = TRAIL_DIAMONDS.filter((d) =>
            localSessionDiamonds.has(d.id)
          ).length;
          callbacksRef.current.onVictoryRecorded(trailDiamondsOwned);
          setCeremonyOpen(true);
        }
      }

      for (let i = afterimages.length - 1; i >= 0; i--) {
        afterimages[i].life -= dt;
        if (afterimages[i].life <= 0) afterimages.splice(i, 1);
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].x += sparks[i].vx * dt;
        sparks[i].y += sparks[i].vy * dt;
        sparks[i].life -= dt;
        if (sparks[i].life <= 0) sparks.splice(i, 1);
      }

      const targetCamX = Math.max(
        0,
        Math.min(LEVEL_W - vw, player.x - vw * 0.36 + player.facing * 55)
      );
      const targetCamY = Math.max(0, Math.min(LEVEL_H - vh, player.y - vh * 0.56));
      camera.x += (targetCamX - camera.x) * Math.min(1, dt * 7);
      camera.y += (targetCamY - camera.y) * Math.min(1, dt * 6);

      // ================================================================
      // RENDERIZADO HD-2D CON PARALLAX MULTICAPA Y VIEWPORT CULLING
      // ================================================================
      ctx.imageSmoothingEnabled = false;
      const bg = ctx.createLinearGradient(0, 0, 0, vh);
      if (activeReality === 'stable') {
        bg.addColorStop(0, '#030716');
        bg.addColorStop(0.55, '#071a33');
        bg.addColorStop(1, '#09263a');
      } else {
        bg.addColorStop(0, '#0b0617');
        bg.addColorStop(0.55, '#24103c');
        bg.addColorStop(1, '#341533');
      }
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, vw, vh);

      for (const s of stars) {
        const sx = (((s.nx * vw * 1.4 - camera.x * 0.14) % vw) + vw) % vw;
        const sy = (((s.ny * vh * 1.2 - camera.y * 0.08) % vh) + vh) % vh;
        ctx.fillStyle = activeReality === 'stable' ? 'rgba(224, 242, 254, 0.65)' : 'rgba(249, 168, 255, 0.78)';
        ctx.fillRect(Math.round(sx), Math.round(sy), s.s, s.s);
      }

      const moonX = vw * 0.78 - camera.x * 0.05;
      const moonY = vh * 0.18;
      ctx.fillStyle = activeReality === 'stable' ? 'rgba(226, 232, 240, 0.88)' : 'rgba(255, 214, 255, 0.82)';
      ctx.beginPath();
      ctx.arc(moonX, moonY, 42, 0, Math.PI * 2);
      ctx.fill();

      // Bosque de Circuitos en tres planos: dosel distante, troncos medios y cascadas de datos.
      const grovePalette: GrovePalette = activeReality === 'stable'
        ? { outline: '#101c2a', deep: '#123b39', shade: '#1d6555', leaf: '#2f956a', sun: '#68bd71', glint: '#c3ed9a', bark: '#4e382f', barkLight: '#93704d' }
        : { outline: '#160e29', deep: '#332052', shade: '#583578', leaf: '#8d4db4', sun: '#c05abb', glint: '#ffd1fb', bark: '#38203e', barkLight: '#87527c' };
      ctx.save();
      // Techo vegetal en siluetas escalonadas y haces cálidos que cruzan la cicatriz.
      ctx.fillStyle = activeReality === 'stable' ? 'rgba(11, 33, 37, 0.92)' : 'rgba(25, 10, 39, 0.94)';
      ctx.fillRect(0, 0, vw, 46);
      for (let leaf = 0; leaf < Math.ceil(vw / 54) + 1; leaf++) {
        const lx = leaf * 54 - ((camera.x * 0.08) % 54);
        ctx.fillRect(lx, 32 + (leaf % 3) * 6, 38, 20);
        ctx.fillRect(lx + 9, 20 + (leaf % 2) * 8, 26, 19);
        ctx.fillRect(lx + 17, 10 + (leaf % 3) * 3, 11, 16);
        if (leaf % 2 === 0) {
          ctx.fillStyle = grovePalette.sun;
          ctx.fillRect(lx + 8, 34, 8, 3);
          ctx.fillStyle = activeReality === 'stable' ? 'rgba(11, 33, 37, 0.92)' : 'rgba(25, 10, 39, 0.94)';
        }
      }
      // Columnas de luz, dispuestas como facetas para mantener el borde de píxel nítido.
      for (let beam = 0; beam < 4; beam++) {
        const bx = Math.round(vw * (0.16 + beam * 0.23) - camera.x * (0.06 + beam * 0.025));
        ctx.globalAlpha = activeReality === 'stable' ? 0.11 : 0.09;
        ctx.fillStyle = beam % 2 === 0 ? '#fff2b0' : activeReality === 'glitch' ? '#ec9bff' : '#8ce6d2';
        ctx.beginPath();
        ctx.moveTo(bx, 38);
        ctx.lineTo(bx + 18, 38);
        ctx.lineTo(bx + 154, vh * 0.76);
        ctx.lineTo(bx + 91, vh * 0.76);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Arcos de recreativas perdidas emergen entre los árboles lejanos.
      const farOffset = -((camera.x * 0.18) % 420);
      for (let ruin = -1; ruin < Math.ceil(vw / 420) + 1; ruin++) {
        const rx = farOffset + ruin * 420 + 88;
        const ry = vh * 0.62 + (ruin % 2) * 18;
        ctx.fillStyle = 'rgba(5, 13, 28, 0.85)';
        ctx.fillRect(rx, ry - 94, 112, 102);
        ctx.fillRect(rx - 12, ry - 72, 136, 76);
        ctx.fillStyle = activeReality === 'stable' ? 'rgba(35, 57, 72, 0.9)' : 'rgba(65, 34, 85, 0.9)';
        ctx.fillRect(rx + 9, ry - 86, 94, 82);
        ctx.fillStyle = activeReality === 'stable' ? 'rgba(62, 144, 135, 0.62)' : 'rgba(196, 86, 224, 0.66)';
        ctx.fillRect(rx + 18, ry - 74, 76, 43);
        ctx.fillStyle = 'rgba(8, 12, 26, 0.8)';
        ctx.fillRect(rx + 24, ry - 68, 64, 31);
        ctx.fillStyle = grovePalette.glint;
        ctx.fillRect(rx + 34, ry - 60, 16, 3);
        ctx.fillRect(rx + 62, ry - 50, 21, 2);
        ctx.fillStyle = '#7d6448';
        ctx.fillRect(rx + 17, ry - 1, 80, 5);
      }

      // Arboleda media con variación de escala y siluetas reconocibles.
      const midOffset = -((camera.x * 0.31) % 300);
      for (let tree = -1; tree < Math.ceil(vw / 300) + 1; tree++) {
        const tx = midOffset + tree * 300 + 60 + (tree % 2) * 38;
        drawPixelGroveTree(ctx, tx, vh * 0.88 - camera.y * 0.045, tree % 3 === 0 ? 2 : 1, tree + 8, grovePalette);
      }
      const fallsOffset = -((camera.x * 0.27) % 570);
      for (let fall = -1; fall < Math.ceil(vw / 570) + 1; fall++) {
        drawDigitalWaterfall(ctx, fallsOffset + fall * 570 + 344, vh * 0.49 - camera.y * 0.06, vh * 0.36, 26, elapsed, activeReality === 'stable' ? '#31b8b2' : '#cb63dc');
      }
      ctx.restore();

      // Acantilados lejanos del Cañón en parallax (0.28)
      ctx.save();
      ctx.fillStyle = 'rgba(8, 22, 42, 0.76)';
      ctx.beginPath();
      ctx.moveTo(0, vh);
      for (let x = 0; x <= vw + 90; x += 90) {
        const sample = x + camera.x * 0.28;
        const hOff = Math.sin(sample * 0.005) * 65 + Math.cos(sample * 0.013) * 28;
        ctx.lineTo(x, vh * 0.66 - hOff);
      }
      ctx.lineTo(vw, vh);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Fisuras Anómalas Temporales en parallax (ecos visuales de El Cronoscopio y la década de 1980)
      const rifts = [
        { wx: 960, wy: 240, r: 42, hex: '#00f3ff' },
        { wx: 2380, wy: 215, r: 52, hex: '#c084fc' },
        { wx: 3920, wy: 230, r: 58, hex: '#f43f5e' },
      ];
      for (const rf of rifts) {
        const sx = rf.wx * 0.55 - camera.x * 0.42;
        const sy = rf.wy - camera.y * 0.15;
        if (sx < -90 || sx > vw + 90) continue;
        ctx.save();
        ctx.translate(Math.round(sx), Math.round(sy));
        ctx.globalAlpha = 0.34;
        ctx.rotate(reducedMotion ? 0.3 : elapsed * 0.45);
        ctx.strokeStyle = '#d8be88';
        ctx.lineWidth = 2;
        ctx.strokeRect(-rf.r, -rf.r, rf.r * 2, rf.r * 2);
        ctx.rotate(reducedMotion ? -0.6 : -elapsed * 0.9);
        ctx.strokeStyle = rf.hex;
        ctx.strokeRect(-rf.r * 0.66, -rf.r * 0.66, rf.r * 1.32, rf.r * 1.32);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(-Math.round(camera.x), -Math.round(camera.y));

      // Cuadrícula arquitectónica sutil solo en el rango de cámara
      ctx.strokeStyle = activeReality === 'stable' ? 'rgba(0, 243, 255, 0.055)' : 'rgba(232, 121, 249, 0.09)';
      ctx.lineWidth = 1;
      const firstGridX = Math.floor(camera.x / 120) * 120;
      for (let gx = firstGridX; gx < camera.x + vw + 120; gx += 120) {
        ctx.beginPath();
        ctx.moveTo(gx, camera.y);
        ctx.lineTo(gx, camera.y + vh);
        ctx.stroke();
      }

      // La Máquina que Sueña: una recreativa imposible suspendida sobre el umbral.
      if (isBoxInCam(285, 430, 188, 210)) {
        const machineGlow = activeReality === 'stable' ? '#facc6b' : '#f472ff';
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = 'rgba(3, 7, 18, 0.42)';
        ctx.fillRect(316, 582, 138, 11);
        ctx.fillStyle = '#070b18';
        ctx.fillRect(330, 468, 112, 112);
        ctx.fillRect(318, 486, 136, 82);
        ctx.fillRect(342, 452, 88, 12);
        ctx.fillStyle = activeReality === 'stable' ? '#344254' : '#562c69';
        ctx.fillRect(334, 472, 104, 100);
        ctx.fillRect(322, 490, 128, 74);
        ctx.fillStyle = machineGlow;
        ctx.fillRect(348, 480, 76, 56);
        ctx.fillStyle = '#100c1b';
        ctx.fillRect(354, 486, 64, 44);
        ctx.fillStyle = activeReality === 'stable' ? '#e8bd65' : '#a637cc';
        ctx.fillRect(360, 491, 52, 2);
        ctx.fillRect(360, 523, 52, 2);
        ctx.fillStyle = '#f8e7b1';
        ctx.fillRect(370, 500, 4, 4);
        ctx.fillRect(398, 508, 3, 3);
        ctx.fillStyle = machineGlow;
        ctx.fillRect(376, 500, 20, 2);
        ctx.fillRect(376, 516, 12, 2);
        ctx.fillStyle = '#070b18';
        ctx.fillRect(338, 542, 96, 28);
        ctx.fillStyle = '#9a6b37';
        ctx.fillRect(346, 547, 80, 4);
        ctx.fillStyle = machineGlow;
        ctx.fillRect(354, 555, 8, 5);
        ctx.fillRect(370, 555, 8, 5);
        ctx.fillRect(386, 555, 8, 5);
        ctx.fillStyle = '#d8be88';
        ctx.fillRect(344, 464, 5, 4);
        ctx.fillRect(424, 464, 5, 4);
        ctx.fillRect(310, 506, 4, 12);
        ctx.fillRect(456, 506, 4, 12);
        ctx.globalAlpha = 0.46;
        for (let i = 0; i < 8; i++) {
          const px = 300 + ((i * 37 + Math.floor(elapsed * 13)) % 170);
          const py = 444 + ((i * 29 + Math.floor(elapsed * 7)) % 132);
          ctx.fillStyle = i % 3 === 0 ? '#facc6b' : machineGlow;
          ctx.fillRect(px, py, i % 2 ? 3 : 5, i % 2 ? 5 : 3);
        }
        ctx.restore();
      }

      // Checkpoints visibles como balizas de sincronía
      for (const cp of CHECKPOINTS) {
        if (!isBoxInCam(cp.x - 16, cp.y - 44, 32, 54)) continue;
        const reached = player.x >= cp.x - 24 || currentCp.x >= cp.x;
        ctx.save();
        ctx.translate(cp.x, cp.y + 60);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, -36, 8, 36);
        ctx.fillStyle = reached ? '#34d399' : '#64748b';
        ctx.fillRect(-7, -44, 14, 9);
        ctx.restore();
      }

      // Corrientes direccionales de píxeles
      for (const cur of PIXEL_CURRENTS) {
        if (!isBoxInCam(cur.x, cur.y, cur.w, cur.h)) continue;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.fillRect(cur.x, cur.y, cur.w, cur.h);
        ctx.strokeStyle = cur.color;
        ctx.globalAlpha = 0.35;
        ctx.strokeRect(cur.x, cur.y, cur.w, cur.h);
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = cur.color;
        for (let i = 0; i < 12; i++) {
          const prog = reducedMotion ? (i / 12) : (elapsed * 1.6 + i * 0.19) % 1;
          const px =
            cur.ax !== 0
              ? cur.x + prog * cur.w
              : cur.x + 10 + ((i * 19) % Math.max(12, cur.w - 20));
          const py =
            cur.ay < 0
              ? cur.y + cur.h - prog * cur.h
              : cur.y + 12 + ((i * 23) % Math.max(12, cur.h - 24));
          ctx.fillRect(Math.round(px), Math.round(py), 5, 5);
        }
        ctx.restore();
      }

      // Plataformas con culling
      for (const p of PLATFORMS) {
        const st = computePlatformState(p, elapsed);
        if (!isBoxInCam(st.rx, st.ry, p.w, p.h)) continue;

        if (p.reality && !st.realityActive) {
          if (reconstructionPulse <= 0) continue;
          ctx.save();
          ctx.globalAlpha = Math.min(0.48, reconstructionPulse * 0.42);
          ctx.strokeStyle = p.reality === 'glitch' ? '#f0abfc' : '#a7f3d0';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 6]);
          ctx.strokeRect(Math.round(st.rx), Math.round(st.ry), Math.round(st.rw), st.rh);
          ctx.setLineDash([]);
          ctx.fillStyle = p.reality === 'glitch' ? 'rgba(217, 70, 239, 0.18)' : 'rgba(52, 211, 153, 0.16)';
          ctx.fillRect(Math.round(st.rx + 2), Math.round(st.ry + 2), Math.max(0, Math.round(st.rw - 4)), Math.max(0, st.rh - 2));
          for (let bit = 0; bit < 4; bit++) {
            const bx = Math.round(st.rx + ((bit * 31 + 13) % Math.max(8, st.rw - 4)));
            ctx.fillStyle = '#fff7cf';
            ctx.fillRect(bx, Math.round(st.ry - 2 - (bit % 2) * 3), 3, 3);
          }
          ctx.restore();
          continue;
        }

        if (p.kind === 'reconstructed-mid' || p.kind === 'reconstructed-final') {
          ctx.save();
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
          ctx.setLineDash([8, 8]);
          ctx.strokeRect(p.x, p.y, p.w, p.h);
          ctx.setLineDash([]);
          if (st.solid && st.rw > 4) {
            const grad = ctx.createLinearGradient(p.x, p.y, p.x + st.rw, p.y);
            grad.addColorStop(0, '#00f3ff');
            grad.addColorStop(0.5, '#facc15');
            grad.addColorStop(1, '#39ff14');
            ctx.fillStyle = grad;
            ctx.fillRect(p.x, p.y, st.rw, p.h);
          }
          ctx.restore();
          continue;
        }

        if (p.kind === 'sync' && !st.solid) {
          ctx.save();
          ctx.strokeStyle = p.reality === 'glitch' ? 'rgba(232, 121, 249, 0.62)' : 'rgba(0, 243, 255, 0.38)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
          ctx.strokeRect(st.rx, st.ry, st.rw, st.rh);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(0, 243, 255, 0.45)';
          ctx.fillRect(st.rx, st.ry + st.rh - 3, st.rw * st.telegraphRatio, 3);
          ctx.restore();
          continue;
        }

        const isWarning = p.kind === 'sync' && st.telegraphRatio < 0.3;
        const phaseTint = p.reality === 'glitch' ? '#e879f9' : p.reality === 'stable' ? '#6ee7b7' : null;
        const topColor = isWarning
          ? '#f59e0b'
          : phaseTint
          ? phaseTint
          : p.surfaceTint === 'amber'
          ? '#eab308'
          : p.surfaceTint === 'crystal'
          ? '#a855f7'
          : p.surfaceTint === 'cyan'
          ? '#00f3ff'
          : '#10b981';

        const px = Math.round(st.rx);
        const py = Math.round(st.ry);
        const pw = Math.round(st.rw);
        ctx.fillStyle = p.reality === 'glitch' ? '#251235' : p.surfaceTint === 'crystal' ? '#1e1b4b' : '#0f292a';
        ctx.fillRect(px, py, pw, st.rh);
        ctx.fillStyle = p.reality === 'glitch' ? '#090713' : '#06131a';
        ctx.fillRect(px, py + st.rh - 3, pw, 3);
        ctx.fillStyle = p.reality === 'glitch' ? '#9d4edd' : '#2c7a62';
        ctx.fillRect(px + 3, py + 6, Math.max(0, pw - 6), Math.max(0, st.rh - 10));
        ctx.fillStyle = topColor;
        ctx.fillRect(px, py, pw, 4);
        ctx.fillStyle = p.reality === 'glitch' ? '#f5d0fe' : '#d1fae5';
        ctx.fillRect(px + 4, py + 1, Math.max(0, pw - 12), 1);
        ctx.fillStyle = p.reality === 'glitch' ? '#c026d3' : '#047857';
        for (let node = 0; node < Math.floor(pw / 28); node++) {
          const nx = px + 12 + node * 28;
          ctx.fillRect(nx, py + st.rh - 8, 4, 2);
          ctx.fillRect(nx + 1, py + st.rh - 6, 2, 3);
        }

        // Capas de suelo: filo de musgo iluminado arriba, estratos de roca
        // abajo y pequeñas vetas deterministas para que cada tramo tenga textura.
        const platformSeed = p.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
        const organicSurface = !p.reality && p.surfaceTint !== 'crystal' && p.kind !== 'sync';
        ctx.fillStyle = organicSurface ? '#b2c96c' : p.reality === 'glitch' ? '#ffd4fb' : '#b5fff0';
        ctx.fillRect(px + 2, py - 1, Math.max(0, pw - 4), 2);
        ctx.fillStyle = organicSurface ? '#547a4c' : p.reality === 'glitch' ? '#672d7d' : '#155b59';
        for (let tuft = 0; tuft < Math.floor(pw / 31); tuft++) {
          const tx = px + 7 + tuft * 31 + ((platformSeed + tuft * 7) % 9);
          if (tx + 4 >= px + pw) continue;
          ctx.fillRect(tx, py - 3, 2, 3);
          ctx.fillRect(tx + 2, py - 2, 2, 2);
        }
        for (let seam = 0; seam < Math.floor(pw / 42); seam++) {
          const sx = px + 20 + seam * 42 + ((platformSeed + seam * 13) % 11);
          if (sx >= px + pw - 4) continue;
          ctx.fillStyle = organicSurface ? '#20443c' : p.reality === 'glitch' ? '#bd6dcc' : '#28665e';
          ctx.fillRect(sx, py + 9, 2, Math.max(2, st.rh - 14));
          ctx.fillStyle = organicSurface ? '#6e9b5c' : p.reality === 'glitch' ? '#f0abfc' : '#62b6a0';
          ctx.fillRect(sx + 3, py + 11 + ((platformSeed + seam) % 5), 4, 1);
          if (st.rh > 24) {
            ctx.fillStyle = p.reality === 'glitch' ? '#9e58b4' : '#183d3b';
            ctx.fillRect(sx - 3, py + st.rh - 8, 7, 2);
          }
        }
        if (p.surfaceTint === 'crystal' || p.reality === 'glitch') {
          for (let shard = 0; shard < Math.floor(pw / 58); shard++) {
            const sx = px + 17 + shard * 58 + ((platformSeed + shard * 5) % 19);
            ctx.fillStyle = shard % 2 ? '#f0abfc' : '#fef3c7';
            ctx.fillRect(sx, py + 6, 2, 5);
            ctx.fillRect(sx - 2, py + 8, 6, 2);
          }
        }

        if (p.kind === 'sync') {
          ctx.fillStyle = isWarning ? '#fef08a' : '#67e8f9';
          ctx.fillRect(
            Math.round(st.rx),
            Math.round(st.ry + st.rh - 3),
            Math.round(st.rw * st.telegraphRatio),
            3
          );
        }
      }

      // Pulso de reconstrucción: un frente poligonal de píxeles barre el plano y marca rutas.
      if (reconstructionPulse > 0) {
        const pulseT = 1 - reconstructionPulse / 1.15;
        const radius = 70 + pulseT * 660;
        ctx.save();
        ctx.globalAlpha = Math.min(0.72, reconstructionPulse * 0.72);
        ctx.lineWidth = 3;
        for (let ring = 0; ring < 3; ring++) {
          const r = Math.max(8, radius - ring * 24);
          ctx.strokeStyle = ring === 0
            ? activeReality === 'glitch' ? '#f0abfc' : '#fde68a'
            : activeReality === 'glitch' ? 'rgba(217, 70, 239, 0.7)' : 'rgba(45, 212, 191, 0.72)';
          ctx.beginPath();
          ctx.moveTo(pulseOrigin.x, pulseOrigin.y - r);
          ctx.lineTo(pulseOrigin.x + r * 0.72, pulseOrigin.y - r * 0.28);
          ctx.lineTo(pulseOrigin.x + r, pulseOrigin.y);
          ctx.lineTo(pulseOrigin.x + r * 0.28, pulseOrigin.y + r * 0.72);
          ctx.lineTo(pulseOrigin.x, pulseOrigin.y + r);
          ctx.lineTo(pulseOrigin.x - r * 0.72, pulseOrigin.y + r * 0.28);
          ctx.lineTo(pulseOrigin.x - r, pulseOrigin.y);
          ctx.lineTo(pulseOrigin.x - r * 0.28, pulseOrigin.y - r * 0.72);
          ctx.closePath();
          ctx.stroke();
        }
        for (let bit = 0; bit < 26; bit++) {
          const angle = (bit / 26) * Math.PI * 2;
          const radiusOffset = 0.88 + (bit % 4) * 0.035;
          const bx = Math.round(pulseOrigin.x + Math.cos(angle) * radius * radiusOffset);
          const by = Math.round(pulseOrigin.y + Math.sin(angle) * radius * radiusOffset);
          ctx.fillStyle = bit % 3 === 0 ? '#fff1b8' : activeReality === 'glitch' ? '#e879f9' : '#5eead4';
          ctx.fillRect(bx, by, bit % 2 ? 3 : 5, bit % 2 ? 5 : 3);
        }
        ctx.restore();
      }

      // Prismas Armónicos y haces ópticos hacia el Puente Central
      for (const prism of HARMONIC_PRISMS) {
        const aligned = alignedPrisms.has(prism.id);
        ctx.save();
        if (aligned) {
          ctx.strokeStyle = prism.color;
          ctx.globalAlpha = 0.65;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(prism.x, prism.y - 30);
          ctx.lineTo(prism.targetX, prism.targetY);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.translate(prism.x, prism.y);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-10, -18, 20, 18);
        ctx.save();
        ctx.translate(0, -30);
        ctx.rotate(aligned ? Math.PI / 4 : elapsed * 0.8);
        ctx.fillStyle = aligned ? prism.color : '#64748b';
        ctx.shadowColor = prism.color;
        ctx.shadowBlur = aligned ? 16 : 4;
        ctx.fillRect(-9, -9, 18, 18);
        ctx.restore();
        ctx.restore();
      }

      if (nearUnalignedPrism) {
        const pr = nearUnalignedPrism;
        ctx.save();
        ctx.font = '700 10px "JetBrains Mono", monospace';
        const txt = '[E] Sintonizar Prisma';
        const tw = ctx.measureText(txt).width + 14;
        ctx.fillStyle = 'rgba(4, 9, 24, 0.9)';
        ctx.fillRect(pr.x - tw / 2, pr.y - 68, tw, 18);
        ctx.strokeStyle = pr.color;
        ctx.strokeRect(pr.x - tw / 2, pr.y - 68, tw, 18);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(txt, pr.x, pr.y - 55);
        ctx.restore();
      }

      // Interruptores Estabilizadores
      for (const stab of STABILIZERS) {
        if (!isBoxInCam(stab.x - 20, stab.y - 44, 40, 48)) continue;
        const rem = groupStabilizeTimers[stab.group] || 0;
        ctx.save();
        ctx.translate(stab.x, stab.y);
        ctx.fillStyle = '#334155';
        ctx.fillRect(-12, -24, 24, 24);
        ctx.fillStyle = rem > 0 ? '#facc15' : '#00f3ff';
        ctx.fillRect(-8, -32, 16, 10);
        if (rem > 0) {
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#fef08a';
          ctx.textAlign = 'center';
          ctx.fillText(`${rem.toFixed(1)}s`, 0, -38);
        }
        ctx.restore();
      }

      // Fragmentos Geométricos del Puente (Acto III)
      for (const shard of BRIDGE_SHARDS) {
        if (collectedShards.has(shard.id)) continue;
        if (!isBoxInCam(shard.x - 24, shard.y - 24, 48, 48)) continue;
        const bob = reducedMotion ? 0 : Math.sin(elapsed * 4 + shard.x) * 6;
        ctx.save();
        ctx.translate(shard.x, shard.y + bob);
        ctx.rotate(reducedMotion ? 0.4 : elapsed * 1.6);
        ctx.fillStyle = shard.color;
        ctx.shadowColor = shard.color;
        ctx.shadowBlur = 14;
        if (shard.shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(0, -16);
          ctx.lineTo(15, 12);
          ctx.lineTo(-15, 12);
          ctx.closePath();
          ctx.fill();
        } else if (shard.shape === 'prism') {
          ctx.fillRect(-12, -12, 24, 24);
        } else {
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k;
            const hx = Math.cos(a) * 15;
            const hy = Math.sin(a) * 15;
            if (k === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }

      // Diamantes de Memoria Cian
      for (const dia of TRAIL_DIAMONDS) {
        if (!isBoxInCam(dia.x - 20, dia.y - 24, 40, 40)) continue;
        const owned = localSessionDiamonds.has(dia.id);
        const bob = reducedMotion ? 0 : Math.sin(elapsed * 4.2 + dia.x) * 5;
        ctx.save();
        ctx.translate(dia.x, dia.y + bob);
        ctx.globalAlpha = owned ? 0.28 : 1;
        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(12, -4);
        ctx.lineTo(0, 10);
        ctx.lineTo(-12, -4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3, -12, 5, 6);
        ctx.restore();
      }

      // Sombras del Pasado
      for (const echo of TRAIL_ECHOES) {
        if (!isBoxInCam(echo.x - 24, echo.y - 44, 48, 48)) continue;
        ctx.save();
        ctx.translate(
          echo.x,
          echo.y - 22 + (reducedMotion ? 0 : Math.sin(elapsed * 3) * 3)
        );
        ctx.strokeStyle = echo.accentHex;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = echo.accentHex;
        ctx.textAlign = 'center';
        ctx.fillText(String(echo.year), 0, 3);
        ctx.restore();
      }

      // Resonadores Astrales del Acto IV
      for (const res of FINAL_RESONATORS) {
        const on = activatedResonators.has(res.id);
        ctx.save();
        if (on) {
          ctx.strokeStyle = res.color;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(res.x, res.y - 24);
          ctx.lineTo(4340, 730);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        ctx.translate(res.x, res.y);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-14, -36, 28, 36);
        ctx.fillStyle = on ? res.color : '#64748b';
        ctx.shadowColor = res.color;
        ctx.shadowBlur = on ? 18 : 0;
        ctx.beginPath();
        ctx.arc(0, -44, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Portal Final Dorado hacia 1978
      if (isBoxInCam(4520, 620, 120, 130)) {
        const open = activatedResonators.size >= 3 && bossHealth <= 0;
        ctx.save();
        ctx.translate(4580, 730);
        ctx.fillStyle = '#334155';
        ctx.fillRect(-38, -82, 12, 82);
        ctx.fillRect(26, -82, 12, 82);
        ctx.fillRect(-42, -92, 84, 12);
        if (open) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = 'rgba(250, 204, 21, 0.52)';
          ctx.beginPath();
          ctx.ellipse(0, -42, 24, 36, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillStyle = open ? '#fde047' : '#94a3b8';
        ctx.textAlign = 'center';
        ctx.fillText(open ? 'SALIDA · GARGANTA 1978' : 'ACTIVA 3 RESONADORES', 0, -100);
        ctx.restore();
      }

      // NPCs y El Cartógrafo del Caos
      for (const npc of TRAIL_NPCS) {
        if (!isBoxInCam(npc.x - 24, npc.y - 60, 48, 68)) continue;
        const floatY = npc.isCartographer
          ? (reducedMotion ? -8 : Math.sin(elapsed * 3.2 + npc.x) * 6 - 8)
          : 0;
        ctx.save();
        ctx.translate(npc.x, npc.y + floatY);
        if (npc.isCartographer) {
          ctx.fillStyle = '#581c87';
          ctx.fillRect(-12, -30, 24, 26);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-16, -38, 32, 6);
          ctx.fillRect(-9, -48, 18, 10);
          ctx.fillStyle = '#00f3ff';
          ctx.fillRect(2, -26, 5, 5);
          ctx.fillRect(-6, -26, 4, 4);
        } else {
          ctx.fillStyle = npc.accentHex;
          ctx.fillRect(-9, -24, 18, 22);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-5, -19, 3, 3);
          ctx.fillRect(2, -19, 3, 3);
        }
        ctx.restore();
      }

      // Remolinos de desfase
      for (const wisp of GLITCH_WISPS) {
        const position = getWispPosition(wisp, elapsed);
        const wx = position.x;
        const wy = position.y;
        if (!isBoxInCam(wx - 20, wy - 20, 40, 40)) continue;
        ctx.save();
        if (!position.realityActive) ctx.globalAlpha = reconstructionPulse > 0 ? 0.62 : 0.18;
        ctx.translate(wx, wy);
        ctx.rotate(reducedMotion ? 0 : elapsed * 5);
        ctx.strokeStyle = wisp.reality === 'stable' ? '#5eead4' : '#e879f9';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-11, -11, 22, 22);
        ctx.fillStyle = position.realityActive ? wisp.reality === 'stable' ? '#0f766e' : '#a855f7' : '#334155';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();
      }

      // Centinelas y drones: siluetas compactas, puntos débiles visibles y destello al impacto.
      for (const enemy of enemies) {
        if (!enemy.alive || !isBoxInCam(enemy.x - 30, enemy.y - 8, 60, 46)) continue;
        ctx.save();
        ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
        const flash = enemy.hitFlash > 0;
        if (enemy.kind === 'sentinel') {
          ctx.fillStyle = '#080b18';
          ctx.fillRect(-15, 4, 30, 24);
          ctx.fillRect(-11, -5, 22, 13);
          ctx.fillStyle = flash ? '#fff' : '#315d68';
          ctx.fillRect(-12, 7, 24, 15);
          ctx.fillStyle = '#0b1522';
          ctx.fillRect(-8, -1, 16, 8);
          ctx.fillStyle = '#facc6b';
          ctx.fillRect(-5, 1, 4, 3);
          ctx.fillRect(3, 1, 4, 3);
          ctx.fillStyle = '#67e8f9';
          ctx.fillRect(-10, 25, 7, 4);
          ctx.fillRect(4, 25, 7, 4);
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-18, 10, 4, 8);
          ctx.fillRect(14, 10, 4, 8);
        } else if (enemy.kind === 'drone') {
          const warn = enemy.fireTimer < 0.48;
          ctx.fillStyle = '#080b18';
          ctx.fillRect(-17, -6, 34, 24);
          ctx.fillRect(-22, 1, 8, 10);
          ctx.fillRect(14, 1, 8, 10);
          ctx.fillStyle = flash ? '#fff' : '#4c2870';
          ctx.fillRect(-13, -3, 26, 17);
          ctx.fillStyle = warn ? '#fb7185' : '#e879f9';
          ctx.fillRect(-5, 3, 10, 6);
          ctx.fillStyle = '#f0abfc';
          ctx.fillRect(-2, 4, 4, 3);
          ctx.fillStyle = '#a78bfa';
          ctx.fillRect(-24, 3, 3, 6);
          ctx.fillRect(21, 3, 3, 6);
          if (warn) {
            ctx.fillStyle = 'rgba(251, 113, 133, 0.32)';
            ctx.fillRect(-38, 6, 72, 2);
          }
        } else {
          const chargeTelegraph = Math.abs(player.x - enemy.originX) < 245 && (elapsed + 0.4) % 3.2 < 0.62;
          ctx.fillStyle = '#080b18';
          ctx.fillRect(-21, -4, 42, 34);
          ctx.fillRect(-16, -12, 32, 12);
          ctx.fillStyle = flash ? '#fff' : '#52283e';
          ctx.fillRect(-17, 0, 34, 24);
          ctx.fillStyle = chargeTelegraph ? '#fb7185' : '#f472b6';
          ctx.fillRect(-8, 5, 16, 8);
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(-4, 7, 8, 4);
          ctx.fillStyle = '#312033';
          ctx.fillRect(-13, 24, 9, 8);
          ctx.fillRect(4, 24, 9, 8);
          ctx.fillStyle = '#fda4af';
          ctx.fillRect(-23, 5, 5, 4);
          ctx.fillRect(18, 5, 5, 4);
        }
        ctx.fillStyle = '#070b18';
        ctx.fillRect(-16, -12, 32, 3);
        ctx.fillStyle = enemy.kind === 'guardian' ? '#f472b6' : '#67e8f9';
        ctx.fillRect(-15, -11, Math.max(1, Math.round(30 * enemy.health / enemy.hp)), 2);
        ctx.restore();
      }

      // Núcleo guardián: su ojo dorado marca exactamente la ventana segura de ataque.
      if (bossActiveDisplay || activatedResonators.size >= 3) {
        const bossX = 4340 + Math.sin(elapsed * 0.75) * 32;
        const bossY = 630 + Math.sin(elapsed * 1.5) * 18;
        const vulnerable = elapsed % 4.8 > 2.5 && elapsed % 4.8 < 3.6;
        if (isBoxInCam(bossX - 66, bossY - 64, 132, 140)) {
          ctx.save();
          ctx.translate(Math.round(bossX), Math.round(bossY));
          if (bossHealth > 0) {
            ctx.fillStyle = 'rgba(217, 70, 239, 0.12)';
            ctx.fillRect(-62, -48, 124, 92);
            ctx.fillStyle = '#080714';
            ctx.fillRect(-48, -38, 96, 72);
            ctx.fillRect(-58, -24, 116, 42);
            ctx.fillStyle = '#3a1a53';
            ctx.fillRect(-41, -32, 82, 58);
            ctx.fillRect(-52, -18, 104, 30);
            ctx.fillStyle = '#a855f7';
            ctx.fillRect(-30, -48, 60, 12);
            ctx.fillRect(-23, 32, 46, 8);
            ctx.fillStyle = '#f0abfc';
            ctx.fillRect(-21, -45, 14, 5);
            ctx.fillRect(9, -45, 14, 5);
            ctx.fillStyle = '#090713';
            ctx.fillRect(-29, -18, 58, 25);
            ctx.fillStyle = vulnerable ? '#fde047' : '#e879f9';
            ctx.fillRect(-20, -11, 40, 12);
            ctx.fillStyle = vulnerable ? '#fff7c2' : '#f5d0fe';
            ctx.fillRect(-7, -8, 14, 6);
            ctx.fillStyle = '#090713';
            ctx.fillRect(-16, 18, 9, 9);
            ctx.fillRect(7, 18, 9, 9);
          } else {
            ctx.fillStyle = '#171324';
            ctx.fillRect(-48, 10, 96, 20);
            ctx.fillStyle = '#facc6b';
            ctx.fillRect(-22, 17, 44, 4);
            ctx.fillStyle = '#d8be88';
            ctx.fillRect(-34, 8, 10, 3);
            ctx.fillRect(24, 8, 10, 3);
          }
          ctx.restore();
        }
      }

      // Vidas, disparo y escudo usan píxeles sólidos para conservar lectura durante la acción.
      if (!extraLifeCollected && isBoxInCam(EXTRA_LIFE_PICKUP.x - 14, EXTRA_LIFE_PICKUP.y - 16, 28, 30)) {
        const bob = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 4) * 3);
        ctx.fillStyle = '#3b0b28';
        ctx.fillRect(EXTRA_LIFE_PICKUP.x - 10, EXTRA_LIFE_PICKUP.y - 7 + bob, 20, 17);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(EXTRA_LIFE_PICKUP.x - 7, EXTRA_LIFE_PICKUP.y - 11 + bob, 6, 8);
        ctx.fillRect(EXTRA_LIFE_PICKUP.x + 1, EXTRA_LIFE_PICKUP.y - 11 + bob, 6, 8);
        ctx.fillRect(EXTRA_LIFE_PICKUP.x - 7, EXTRA_LIFE_PICKUP.y - 4 + bob, 14, 10);
        ctx.fillStyle = '#fff1f2';
        ctx.fillRect(EXTRA_LIFE_PICKUP.x - 4, EXTRA_LIFE_PICKUP.y - 7 + bob, 3, 3);
      }

      for (const shot of playerShots) {
        ctx.fillStyle = '#082737';
        ctx.fillRect(Math.round(shot.x - 3), Math.round(shot.y - 2), 16, 12);
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(Math.round(shot.x), Math.round(shot.y), 10, 8);
        ctx.fillStyle = '#f0fdfa';
        ctx.fillRect(Math.round(shot.x + 3), Math.round(shot.y + 2), 4, 4);
      }
      for (const shot of hostileShots) {
        ctx.fillStyle = '#4a102f';
        ctx.fillRect(Math.round(shot.x - 5), Math.round(shot.y - 5), 14, 14);
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(Math.round(shot.x - 2), Math.round(shot.y - 2), 8, 8);
        ctx.fillStyle = '#fff1f2';
        ctx.fillRect(Math.round(shot.x), Math.round(shot.y), 3, 3);
      }

      for (const ai of afterimages) {
        ctx.fillStyle = shirtColor;
        ctx.globalAlpha = (ai.life / 0.2) * 0.35;
        ctx.fillRect(Math.round(ai.x), Math.round(ai.y), player.w, player.h);
      }
      ctx.globalAlpha = 1;

      // Shared Pixel sprite: the same saved outfit and gear as the island explorer.
      ctx.save();
      if (player.invulnTimer > 0 && Math.floor(elapsed * 16) % 2 === 0) ctx.globalAlpha = 0.55;
      if (shieldTimer > 0) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
        ctx.fillRect(player.x - 10, player.y - 9, player.w + 20, player.h + 18);
        ctx.strokeStyle = '#22d3ee'; ctx.lineWidth = 2;
        ctx.strokeRect(player.x - 10, player.y - 9, player.w + 20, player.h + 18);
      }
      const stepping = Math.abs(player.vx) > 26 && player.grounded;
      ctx.translate(player.x + player.w / 2, player.y + player.h);
      ctx.scale(0.8, 0.8);
      drawPixelAvatar4Dir(ctx, 0, 0, player.facing >= 0 ? 'right' : 'left', stepping, false, elapsed, skinColor, hairColor, shirtColor, { appearance });
      ctx.restore();

      for (const sp of sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.5);
        ctx.fillStyle = sp.color;
        ctx.fillRect(Math.round(sp.x - 2), Math.round(sp.y - 2), 4, 4);
      }
      ctx.globalAlpha = 1;

      ctx.restore();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      reducedMotionQuery.removeEventListener('change', onMotionChange);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [appearance, hairColor, notifyToast, shirtColor, skinColor]);

  const trailDiamondsCollected = TRAIL_DIAMONDS.filter((d) =>
    collectedDiamondIds.includes(d.id)
  ).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#030716]">
      <canvas ref={canvasRef} className="block w-full h-full" />

      {/* HUD Superior Izquierdo limpio sin píldoras estáticas */}
      <div className="absolute top-4 left-4 z-20 glass-hud rounded-xl px-4 py-3.5 space-y-2 max-w-md">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono-tabular tracking-[0.2em] text-[#00f3ff] uppercase">
            CICATRIZ GLITCH 01 · ISLA DE LOS 70
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                respawnRequestRef.current = true;
              }}
              title="Volver al último punto de control [R]"
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-white/15 bg-black/50 hover:border-amber-300 text-[10px] font-mono-tabular text-amber-200 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Checkpoint [R]</span>
            </button>
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                onReturnToIsland();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/20 bg-black/50 hover:border-[#00f3ff] text-[10px] font-mono-tabular text-slate-200 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Isla 70s</span>
            </button>
          </div>
        </div>

        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">
            La Máquina que Sueña
          </h2>
          <p className="text-[11px] font-mono-tabular text-amber-200">
            {activeCheckpointName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-white/10 text-[11px] font-mono-tabular">
          <span className="inline-flex items-center gap-1.5 text-[#00f3ff]">
            <Layers className="w-3 h-3 shrink-0" />
            <span>PUENTE {prismsCount + shardsCount}/5</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>RESONADORES {resonatorsCount}/3</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-purple-300">
            <span>PRISMAS {prismsCount}/2</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-sky-200">
            <Diamond className="w-3 h-3 shrink-0" />
            <span>DIAMANTES {trailDiamondsCollected}/4</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/10 pt-1.5 font-mono-tabular text-[10px]">
          <span className="inline-flex items-center gap-1 text-rose-200">
            <span className="tracking-[0.12em]">HP</span>
            <span className="inline-flex gap-0.5">{Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={`h-2.5 w-2.5 border border-rose-100/60 ${i < healthPoints ? 'bg-rose-400' : 'bg-slate-800'}`} />
            ))}</span>
          </span>
          <span className="text-amber-200">VIDAS × {livesCount}</span>
          <span className={doubleJumpAvailable ? 'text-yellow-200' : 'text-slate-400'}>
            {doubleJumpAvailable ? 'SALTO DOBLE · LISTO' : 'ECO · SALTO DOBLE'}
          </span>
        </div>
        {bossActiveDisplay && (
          <div className="space-y-1 border-t border-fuchsia-300/25 pt-1.5 font-mono-tabular text-[9px] text-fuchsia-100">
            <div className="flex justify-between gap-2"><span>GUARDIÁN DEL NÚCLEO</span><span>{bossHealthDisplay}/8</span></div>
            <div className="h-2 border border-fuchsia-200/70 bg-black/60 p-[1px]">
              <div className="h-full bg-fuchsia-400" style={{ width: `${Math.max(0, (bossHealthDisplay / 8) * 100)}%` }} />
            </div>
            <span className="text-yellow-200">Ojo dorado = núcleo vulnerable</span>
          </div>
        )}

        <div className={`flex items-center justify-between gap-3 border-2 px-2.5 py-1.5 font-mono-tabular text-[10px] ${realityMode === 'stable' ? 'border-emerald-300/70 bg-emerald-950/65 text-emerald-100' : 'border-fuchsia-300/70 bg-fuchsia-950/65 text-fuchsia-100'}`}>
          <span className="inline-flex items-center gap-2 font-bold tracking-widest">
            <span className={`h-2.5 w-2.5 ${realityMode === 'stable' ? 'bg-emerald-300' : 'bg-fuchsia-300'} shadow-[0_0_8px_currentColor]`} />
            {realityMode === 'stable' ? 'ESTADO ESTABLE' : 'ESTADO GLITCH'}
          </span>
          <span>Q / X · PULSO</span>
        </div>

        <p className="text-[10px] font-mono-tabular text-slate-300 pt-1 border-t border-white/10">
          A/D · Moverse | Espacio · Saltar{doubleJumpAvailable ? ' + doble salto' : ''} | Shift · Impulso | Z · Pulso | C · Escudo | Q · Realidad
        </p>
      </div>

      {statusToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-lg px-4 py-2 text-xs font-mono-tabular text-[#00f3ff] text-center">
          {statusToast}
        </div>
      )}

      {speechBubble && !ceremonyOpen && (
        <div className="absolute bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 glass-panel rounded-xl px-5 py-3.5 max-w-2xl w-[92%] space-y-1 pointer-events-none">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-sm font-bold text-white">
              {speechBubble.speaker}
            </span>
            <span className="text-[10px] font-mono-tabular text-[#00f3ff]">
              {speechBubble.role}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 font-ui leading-relaxed">
            {speechBubble.text}
          </p>
        </div>
      )}

      {/* Controles táctiles discretos */}
      <div className="sm:hidden absolute bottom-3 inset-x-3 z-20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.left = true;
            }}
            onPointerUp={() => {
              virtualControlsRef.current.left = false;
            }}
            onPointerLeave={() => {
              virtualControlsRef.current.left = false;
            }}
            className="glass-hud px-3.5 py-2.5 rounded text-xs font-mono-tabular text-white whitespace-nowrap shrink-0"
          >
            ← Izq
          </button>
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.right = true;
            }}
            onPointerUp={() => {
              virtualControlsRef.current.right = false;
            }}
            onPointerLeave={() => {
              virtualControlsRef.current.right = false;
            }}
            className="glass-hud px-3.5 py-2.5 rounded text-xs font-mono-tabular text-white whitespace-nowrap shrink-0"
          >
            Der →
          </button>
        </div>

        <div className="flex max-w-[68vw] flex-wrap items-center justify-end gap-1">
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.interactPressed = true;
            }}
            className="glass-hud px-3 py-2.5 rounded text-xs font-mono-tabular text-purple-200 whitespace-nowrap shrink-0"
          >
            [E]
          </button>
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.attackPressed = true;
            }}
            className="glass-hud px-2.5 py-2.5 rounded text-xs font-mono-tabular text-cyan-200 whitespace-nowrap shrink-0"
            aria-label="Disparar Pulso de Energía"
          >
            [Z]
          </button>
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.shieldPressed = true;
            }}
            className="glass-hud px-2.5 py-2.5 rounded text-xs font-mono-tabular text-sky-200 whitespace-nowrap shrink-0"
            aria-label="Activar Escudo de Reconstrucción"
          >
            [C]
          </button>
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.dashPressed = true;
            }}
            className="glass-hud px-3 py-2.5 rounded text-xs font-mono-tabular text-[#00f3ff] inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Impulso</span>
          </button>
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.realityPressed = true;
            }}
            className={`glass-hud px-2.5 py-2.5 rounded text-[10px] font-mono-tabular whitespace-nowrap shrink-0 ${realityMode === 'stable' ? 'text-emerald-200' : 'text-fuchsia-200'}`}
          >
            Q REALIDAD
          </button>
          <button
            type="button"
            onPointerDown={() => {
              virtualControlsRef.current.jumpPressed = true;
              virtualControlsRef.current.jumpHeld = true;
            }}
            onPointerUp={() => {
              virtualControlsRef.current.jumpHeld = false;
            }}
            onPointerLeave={() => {
              virtualControlsRef.current.jumpHeld = false;
            }}
            className="btn-ui px-3.5 py-2.5 rounded text-xs font-bold whitespace-nowrap shrink-0"
          >
            Saltar
          </button>
        </div>
      </div>

      {ceremonyOpen && (
        <MemoryUnlockedModal
          entry={getHistoricalMemory('glitch-trail')}
          continueLabel="Cruzar el Puente Astral hacia 1978"
          alreadyRestoredBefore={alreadyRestoredBefore}
          onContinue={() => {
            setCeremonyOpen(false);
            onComplete();
          }}
        />
      )}
    </div>
  );
}
