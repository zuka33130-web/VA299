/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RENDERER DE LA ISLA NATAL — Pixel-art procedural estilo GBA (hora dorada).
 *
 * Todo se dibuja por código (sin hojas de sprites externas), en el mismo lenguaje
 * visual que la Isla del Origen pero con identidad propia: mar en calma, arena
 * cálida, pradera verde, un alto rocoso, palmeras con brisa y el resplandor cian
 * del viejo gabinete de Pong dormido en la arboleda.
 *
 * Convención de coordenadas: el escenario aplica el transform (dpr · zoom) y pasa
 * vw/vh en unidades de mundo; este módulo rellena el fondo en espacio de pantalla
 * y después traslada a (-camX, -camY).
 */

import type { AvatarAppearance } from '../avatar/avatarOptions';
import type { FacingDirection } from '../rpg/rpgContent';
import {
  drawPixelAvatar4Dir,
  drawGbcWoodenSign,
  drawPongHoverboard,
  drawRpgTreasureChest,
  isWorldBoxVisible,
} from './island70sRenderer';
import {
  ISLA_NATAL_ARCADE_ANCHOR,
  ISLA_NATAL_BOULDERS,
  ISLA_NATAL_CABIN,
  ISLA_NATAL_DEPARTURE,
  ISLA_NATAL_FLOWERS,
  ISLA_NATAL_PALMS,
  ISLA_NATAL_PATH_PLAZAS,
  ISLA_NATAL_PATH_ROUTES,
  ISLA_NATAL_PEBBLES,
  ISLA_NATAL_SHELLS,
  ISLA_NATAL_SIGNS,
  ISLA_NATAL_SOLIDS,
  ISLA_NATAL_TRAVELER_SITE,
  ISLA_NATAL_TREES,
  ISLA_NATAL_TUFTS,
  ISLA_NATAL_WALK_RECTS,
  ISLA_NATAL_WORLD_H,
  ISLA_NATAL_WORLD_W,
  isIslaNatalPointOnLand,
  type IslaNatalPathPlaza,
  type IslaNatalPathRoute,
  type IslaNatalPathTextureId,
  type IslaNatalSurface,
  type IslaNatalWalkRect,
} from './islaNatalData';

export type ArcadeCabinetState = 'dusty' | 'powered' | 'won';

export interface IslaNatalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface IslaNatalPromptSpec {
  x: number;
  y: number;
  label: string;
  accentHex: string;
}

export interface IslaNatalPlayerRender {
  x: number;
  y: number;
  facingDir: FacingDirection;
  walking: boolean;
  sprinting: boolean;
  interactAnim: number;
  ridingPaddle: boolean;
  /** Inclinación de la tabla al surfear (radianes). */
  rideTilt: number;
}

export interface IslaNatalRenderParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  camera: { x: number; y: number };
  elapsed: number;
  reducedMotion: boolean;
  player: IslaNatalPlayerRender;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  arcadeState: ArcadeCabinetState;
  /** 0 = isla en reposo, 1 = máquina encendida y cargando el aire. */
  charge: number;
  /** Pulso de la anomalía tras la victoria (decae de 1 a 0). */
  signalPulse: number;
  /** La paleta sigue en el suelo, esperando junto al gabinete. */
  paddleOnGround: boolean;
  /** El faro de partida de la playa sur está encendido. */
  departureReady: boolean;
  particles: IslaNatalParticle[];
  prompt: IslaNatalPromptSpec | null;
  shockwaves: { x: number; y: number; t: number; life: number }[];
  /** Escena del viajero del futuro: fase y segundos transcurridos dentro de ella. */
  travelerEvent?: {
    phase: 'storm' | 'arrival' | 'descend' | 'talk' | 'board' | 'departure';
    t: number;
  } | null;
}

const CELL = 32;

const CABINET_POS = { x: 1251, y: 588 };
const HUT_POS = { x: 430, y: 694 };
const SHED_POS = { x: 1178, y: 512 };
const SIGN_POS = { x: 872, y: 946 };
const NET_POS = { x: 668, y: 958 };
const SHELLS_POI_POS = { x: 946, y: 974 };
const MAILBOX_POS = { x: 574, y: 792 };
const MIRADOR_POS = { x: 452, y: 306 };

/** Carteles de zona: mismo formato pequeño que los del Origen. */

interface NatalBushSpec {
  x: number;
  y: number;
  seed: number;
  berry: boolean;
}

/** Arbustos de pradera: rompen la repetición de matas y dan volumen al borde de los caminos. */
const NATAL_BUSHES: NatalBushSpec[] = [
  { x: 604, y: 668, seed: 0.22, berry: false },
  { x: 1000, y: 690, seed: 0.54, berry: true },
  { x: 1088, y: 748, seed: 0.81, berry: false },
  { x: 392, y: 648, seed: 0.36, berry: true },
  { x: 1008, y: 872, seed: 0.64, berry: false },
];

function hash2(x: number, y: number): number {
  let h = Math.imul(x ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(y ^ 0xc2b2ae35, 0x27d4eb2f);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2545f491);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967295;
}

/* ------------------------------------------------------------------ */
/* GEOMETRÍA ORGÁNICA DE LA ISLA: CONTORNOS ASIMÉTRICOS Y PLAYAS       */
/* ------------------------------------------------------------------ */

type Vec2 = readonly [number, number];

function catmullRom1D(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

/** Subdivide un polígono cerrado de control en una curva orgánica suave sin esquinas duras. */
function subdivideClosedCatmullRom(
  control: readonly Vec2[],
  samplesPerSegment = 9
): [number, number][] {
  const n = control.length;
  if (n < 3) return control.map((p) => [p[0], p[1]]);
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = control[(i - 1 + n) % n];
    const p1 = control[i];
    const p2 = control[(i + 1) % n];
    const p3 = control[(i + 2) % n];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      out.push([
        catmullRom1D(p0[0], p1[0], p2[0], p3[0], t),
        catmullRom1D(p0[1], p1[1], p2[1], p3[1], t),
      ]);
    }
  }
  return out;
}

function tracePolygonRing(ctx: CanvasRenderingContext2D, ring: readonly Vec2[]): void {
  if (ring.length === 0) return;
  ctx.moveTo(ring[0][0], ring[0][1]);
  for (let i = 1; i < ring.length; i++) {
    ctx.lineTo(ring[i][0], ring[i][1]);
  }
  ctx.closePath();
}

function pointInPolygonRing(x: number, y: number, ring: readonly Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Silueta exterior artesanal de Isla Natal (sentido horario desde Puerto Norte):
 * combina bahías abrigadas, penínsulas asimétricas, cabos rocosos, ensenadas
 * curvas y lenguas de arena formadas por la erosión del mar.
 */
const NATAL_ISLAND_CONTROL_POINTS: readonly Vec2[] = [
  // Bahía del Puerto Norte (abraza el arranque del muelle de madera en x ≈ 820, y ≈ 500)
  [772, 488],
  [820, 498],
  [868, 490],
  // Punta de la Brisa y Caleta del Norte (sustituye la muesca cuadrada norte por una caleta curva)
  [922, 484],
  [976, 484],
  [1008, 494],
  [1026, 526],
  [1048, 546],
  [1072, 518],
  [1088, 472],
  // Península de la Arboleda (doble lóbulo boscoso asimétrico al noreste y este)
  [1136, 444],
  [1206, 430],
  [1284, 442],
  [1356, 436],
  [1416, 470],
  [1436, 528],
  [1404, 582],
  [1434, 644],
  [1398, 704],
  [1318, 728],
  [1238, 722],
  // Ensenada del Este y Punta del Oleaje (bahía turquesa profunda + cabo arenoso curvo al sureste)
  [1180, 732],
  [1224, 748],
  [1288, 758],
  [1328, 804],
  [1312, 860],
  [1270, 892],
  [1208, 906],
  [1174, 960],
  [1108, 958],
  [1052, 982],
  // Playa del Aurora (doble punta arenosa asimétrica y bahía curva central)
  [1028, 1020],
  [962, 1050],
  [886, 1034],
  [810, 1020],
  [738, 1032],
  [664, 1050],
  [592, 1020],
  // Boca y Caleta del Poniente + Loma de la Cabaña (costa oeste escalonada por erosión natural)
  [582, 968],
  [520, 962],
  [462, 948],
  [454, 892],
  [418, 882],
  [374, 812],
  [360, 742],
  [370, 700],
  [338, 634],
  [364, 572],
  // Promontorio del Alto de las Rocas (acantilados quebrados al noroeste)
  [290, 548],
  [254, 492],
  [276, 428],
  [254, 366],
  [292, 330],
  [344, 320],
  [350, 272],
  [416, 242],
  [494, 250],
  [544, 274],
  [564, 324],
  [596, 344],
  [610, 422],
  // Caleta de las Rocas y Cabo de las Palmas (saliente norte al oeste del puerto)
  [596, 488],
  [628, 482],
  [678, 442],
  [734, 458],
];

/** Pequeños escollos y cayos costeros desgastados por el oleaje frente a los cabos. */
const NATAL_COASTAL_SKERRIES: readonly { surface: IslaNatalSurface; points: readonly Vec2[] }[] = [
  {
    surface: 'rock',
    points: [
      [218, 342],
      [232, 333],
      [246, 338],
      [244, 352],
      [228, 357],
      [216, 350],
    ],
  },
  {
    surface: 'rock',
    points: [
      [372, 222],
      [385, 216],
      [396, 222],
      [392, 232],
      [378, 234],
    ],
  },
  {
    surface: 'sand',
    points: [
      [1338, 824],
      [1354, 818],
      [1368, 827],
      [1364, 840],
      [1346, 843],
      [1335, 834],
    ],
  },
  {
    surface: 'rock',
    points: [
      [420, 956],
      [433, 949],
      [444, 956],
      [440, 967],
      [425, 968],
    ],
  },
];

/**
 * Contorno curvo de la pradera interior: se retira tierra adentro frente a las
 * bahías para formar playas curvas naturales y deja una fina ribera orgánica en los cabos.
 */
const NATAL_MEADOW_CONTROL_POINTS: readonly Vec2[] = [
  // Media luna de arena del Puerto Norte
  [756, 478],
  [786, 507],
  [820, 516],
  [856, 507],
  // Ribera norte y playa escondida de Caleta del Norte
  [906, 496],
  [974, 496],
  [1008, 508],
  [1048, 562],
  [1088, 502],
  // Península de la Arboleda (ribera boscosa con estrecho margen costero)
  [1138, 458],
  [1206, 444],
  [1284, 454],
  [1352, 450],
  [1404, 480],
  [1420, 530],
  [1390, 582],
  [1418, 642],
  [1384, 690],
  [1314, 714],
  [1238, 710],
  // Transición curva continua hacia Punta del Oleaje y Ensenada Este (sin esquinas de 90°)
  [1184, 730],
  [1168, 766],
  [1138, 808],
  [1094, 848],
  [1038, 876],
  // Arco curvo de Playa del Aurora (abraza la pasarela de madera en x = 740..804, y = 912)
  [982, 896],
  [926, 912],
  [864, 922],
  [804, 914],
  [742, 914],
  [682, 918],
  [622, 902],
  // Playa curva de Caleta del Poniente y subida por Loma de la Cabaña
  [568, 872],
  [514, 848],
  [458, 856],
  [428, 862],
  [390, 804],
  [376, 740],
  [384, 696],
  [354, 634],
  [378, 572],
  // Encuentro bajo el Alto de las Rocas y Caleta de las Rocas
  [430, 524],
  [558, 524],
  [594, 510],
  [628, 498],
  [680, 458],
  [730, 470],
];

/** Meseta rocosa orgánica del Alto de las Rocas (elimina el bloque rectangular noroeste). */
const NATAL_ROCK_PLATEAU_CONTROL_POINTS: readonly Vec2[] = [
  [348, 266],
  [416, 238],
  [494, 246],
  [546, 270],
  [568, 322],
  [600, 344],
  [614, 422],
  [598, 486],
  [584, 514],
  [562, 536],
  [528, 545],
  [494, 539],
  [470, 538],
  [448, 540],
  [410, 547],
  [364, 539],
  [320, 546],
  [284, 546],
  [248, 492],
  [272, 428],
  [248, 366],
  [288, 328],
  [340, 318],
];

/** Terraza superior curva donde se asienta el Mirador del Alto de las Rocas. */
const NATAL_ROCK_CREST_CONTROL_POINTS: readonly Vec2[] = [
  [354, 270],
  [418, 244],
  [492, 252],
  [538, 276],
  [542, 322],
  [524, 354],
  [488, 362],
  [452, 358],
  [412, 364],
  [364, 356],
  [334, 336],
  [342, 302],
];

const NATAL_ISLAND_RING = subdivideClosedCatmullRom(NATAL_ISLAND_CONTROL_POINTS, 9);
const NATAL_SKERRY_RINGS = NATAL_COASTAL_SKERRIES.map((s) => ({
  surface: s.surface,
  ring: subdivideClosedCatmullRom(s.points, 7),
}));
const NATAL_MEADOW_RING = subdivideClosedCatmullRom(NATAL_MEADOW_CONTROL_POINTS, 9);
const NATAL_ROCK_PLATEAU_RING = subdivideClosedCatmullRom(NATAL_ROCK_PLATEAU_CONTROL_POINTS, 8);
const NATAL_ROCK_CREST_RING = subdivideClosedCatmullRom(NATAL_ROCK_CREST_CONTROL_POINTS, 7);

function pointOnLand(x: number, y: number): boolean {
  return pointInPolygonRing(x, y, NATAL_ISLAND_RING);
}

function isPointOnNatalMeadow(x: number, y: number): boolean {
  if (!pointInPolygonRing(x, y, NATAL_MEADOW_RING)) return false;
  if (pointInPolygonRing(x, y, NATAL_ROCK_PLATEAU_RING)) return false;
  return pointInPolygonRing(x, y, NATAL_ISLAND_RING);
}

/* ------------------------------------------------------------------ */
/* TERRENO PRERENDERIZADO: MÁSCARA DE COSTA Y TEXTURAS ARTESANALES    */
/* ------------------------------------------------------------------ */

const GROUND_PAD = 96;
const COAST_STEP = 2;
const SHELF_RANGE = 104;

const SURFACE_CODE_SAND = 0;
const SURFACE_CODE_GRASS = 1;
const SURFACE_CODE_ROCK = 2;

/** Campo de distancia a la silueta orgánica: controla costa erosionada, bajío y rompiente. */
interface NatalCoastField {
  cols: number;
  rows: number;
  pad: number;
  step: number;
  /** Distancia (en celdas) desde el mar hasta la orilla erosionada. */
  dist: Float32Array;
  /** Distancia (en celdas) desde la tierra hacia el mar: define la orla húmeda de marea. */
  inDist: Float32Array;
  /** Superficie costera más próxima: 0 = arena, 1 = césped, 2 = roca. */
  surface: Uint8Array;
}

interface NatalFoamPoint {
  x: number;
  y: number;
  phase: number;
  band: number;
  horiz: boolean;
  seed: number;
}

interface NatalGrassTiles {
  base: HTMLImageElement | null;
  clover: HTMLImageElement | null;
  sunlit: HTMLImageElement | null;
  mask: number;
}

interface NatalPathTiles {
  images: Record<IslaNatalPathTextureId, HTMLImageElement | null>;
  mask: number;
}

const NATAL_PATH_TILE_SOURCES: Record<IslaNatalPathTextureId, string> = {
  terracotta: '/assets/pixelverse/natal-path-terracotta.png',
  coastal: '/assets/pixelverse/natal-path-coastal.png',
  port: '/assets/pixelverse/natal-path-port.png',
  arboleda: '/assets/pixelverse/natal-path-arboleda.png',
  highland: '/assets/pixelverse/natal-path-highland.png',
};

const NATAL_PATH_FALLBACK_HEX: Record<IslaNatalPathTextureId, string> = {
  terracotta: '#b89464',
  coastal: '#bcae8e',
  port: '#c4ba9c',
  arboleda: '#6e765c',
  highland: '#7f7a6c',
};

const NATAL_PATH_TEXTURE_ORDER: IslaNatalPathTextureId[] = [
  'terracotta',
  'coastal',
  'port',
  'arboleda',
  'highland',
];

interface NatalSandTiles {
  granular: HTMLCanvasElement | null;
  rippled: HTMLCanvasElement | null;
  mask: number;
}

const NATAL_SAND_GRANULAR_SRC = '/assets/aistudio/96630aeb4027b8722e28830b57576564_6e16ae7c.jpg';
const NATAL_SAND_RIPPLED_SRC = '/assets/aistudio/091ef03ceb1f7adf1d6967ee322945fc_0c1f74b1.jpg';

let coastField: NatalCoastField | null = null;
let coastGroundLayer: HTMLCanvasElement | null = null;
let coastLayerTileMask = -1;
let coastFoam: NatalFoamPoint[] = [];
let natalGrassTileImg: HTMLImageElement | null = null;
let natalGrassCloverImg: HTMLImageElement | null = null;
let natalGrassSunlitImg: HTMLImageElement | null = null;
let natalSandGranularImg: HTMLImageElement | null = null;
let natalSandRippledImg: HTMLImageElement | null = null;
let natalSandGranularTile: HTMLCanvasElement | null = null;
let natalSandRippledTile: HTMLCanvasElement | null = null;
const natalPathTileImgs: Partial<Record<IslaNatalPathTextureId, HTMLImageElement>> = {};

function ensureNatalGrassTiles(): NatalGrassTiles {
  if (typeof Image === 'undefined') {
    return { base: null, clover: null, sunlit: null, mask: 0 };
  }
  if (!natalGrassTileImg) {
    natalGrassTileImg = new Image();
    natalGrassTileImg.decoding = 'async';
    natalGrassTileImg.src = '/assets/pixelverse/natal-grass-tile.png';
  }
  if (!natalGrassCloverImg) {
    natalGrassCloverImg = new Image();
    natalGrassCloverImg.decoding = 'async';
    natalGrassCloverImg.src = '/assets/pixelverse/natal-grass-clover.png';
  }
  if (!natalGrassSunlitImg) {
    natalGrassSunlitImg = new Image();
    natalGrassSunlitImg.decoding = 'async';
    natalGrassSunlitImg.src = '/assets/pixelverse/natal-grass-sunlit.png';
  }
  const base =
    natalGrassTileImg.complete && natalGrassTileImg.naturalWidth > 0 ? natalGrassTileImg : null;
  const clover =
    natalGrassCloverImg.complete && natalGrassCloverImg.naturalWidth > 0
      ? natalGrassCloverImg
      : null;
  const sunlit =
    natalGrassSunlitImg.complete && natalGrassSunlitImg.naturalWidth > 0
      ? natalGrassSunlitImg
      : null;
  const mask = (base ? 1 : 0) | (clover ? 2 : 0) | (sunlit ? 4 : 0);
  return { base, clover, sunlit, mask };
}

function ensureNatalPathTiles(): NatalPathTiles {
  const empty: Record<IslaNatalPathTextureId, HTMLImageElement | null> = {
    terracotta: null,
    coastal: null,
    port: null,
    arboleda: null,
    highland: null,
  };
  if (typeof Image === 'undefined') {
    return { images: empty, mask: 0 };
  }
  let mask = 0;
  for (let i = 0; i < NATAL_PATH_TEXTURE_ORDER.length; i++) {
    const key = NATAL_PATH_TEXTURE_ORDER[i];
    let img = natalPathTileImgs[key];
    if (!img) {
      img = new Image();
      img.decoding = 'async';
      img.src = NATAL_PATH_TILE_SOURCES[key];
      natalPathTileImgs[key] = img;
    }
    if (img.complete && img.naturalWidth > 0) {
      empty[key] = img;
      mask |= 1 << i;
    }
  }
  return { images: empty, mask };
}

/**
 * Convierte una fotografía de arena en un mosaico toroidal 100% continuo (sin cortes
 * ni costuras visibles al repetirse con createPattern) y equilibra su escala/color
 * para integrarse con la iluminación dorada de Isla Natal.
 */
function bakeSeamlessSandTile(
  img: HTMLImageElement,
  size: number,
  mode: 'granular' | 'rippled'
): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !img.complete || img.naturalWidth <= 0) return null;

  const nw = img.naturalWidth;
  const nh = img.naturalHeight;

  // Recorte central limpio evitando bordes de compresión JPG
  let sx = 0;
  let sy = 0;
  let sw = nw;
  let sh = nh;
  if (mode === 'granular') {
    const crop = Math.min(nw, Math.round(nh * 0.72));
    sx = Math.floor((nw - crop) * 0.5);
    sy = Math.floor((nh - crop) * 0.45);
    sw = crop;
    sh = crop;
  } else {
    const cropH = Math.round(nh * 0.88);
    const cropW = Math.min(nw, Math.round(cropH * 1.18));
    sx = Math.floor((nw - cropW) * 0.5);
    sy = Math.floor((nh - cropH) * 0.5);
    sw = cropW;
    sh = cropH;
  }

  const rawCanvas = document.createElement('canvas');
  rawCanvas.width = size;
  rawCanvas.height = size;
  const rctx = rawCanvas.getContext('2d');
  if (!rctx) return null;
  rctx.imageSmoothingEnabled = true;
  rctx.imageSmoothingQuality = 'high';
  rctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);

  const srcData = rctx.getImageData(0, 0, size, size).data;

  // Normalizamos gradientes macro de iluminación para que no se perciba repetición en grilla,
  // preservando intactos el grano mineral, las conchas diminutas y las ondas de viento.
  const blurRadius = Math.max(8, Math.round(size * 0.14));
  const tempLum = new Float32Array(size * size);
  const macroLum = new Float32Array(size * size);
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  const totalPx = size * size;

  for (let i = 0; i < totalPx; i++) {
    const p = i * 4;
    sumR += srcData[p];
    sumG += srcData[p + 1];
    sumB += srcData[p + 2];
  }
  const meanR = sumR / totalPx;
  const meanG = sumG / totalPx;
  const meanB = sumB / totalPx;
  const meanLum = 0.299 * meanR + 0.587 * meanG + 0.114 * meanB;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      let count = 0;
      for (let k = -blurRadius; k <= blurRadius; k += 2) {
        const xx = (x + k + size) % size;
        const p = (y * size + xx) * 4;
        acc += 0.299 * srcData[p] + 0.587 * srcData[p + 1] + 0.114 * srcData[p + 2];
        count++;
      }
      tempLum[y * size + x] = acc / count;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let acc = 0;
      let count = 0;
      for (let k = -blurRadius; k <= blurRadius; k += 2) {
        const yy = (y + k + size) % size;
        acc += tempLum[yy * size + x];
        count++;
      }
      macroLum[y * size + x] = acc / count;
    }
  }

  const eqData = new Uint8ClampedArray(totalPx * 4);
  const flattenStrength = mode === 'granular' ? 0.62 : 0.72;
  // Paleta objetivo cálida y coherente entre ambas muestras de arena
  const targetR = mode === 'granular' ? 210 : 219;
  const targetG = mode === 'granular' ? 176 : 186;
  const targetB = mode === 'granular' ? 124 : 131;
  const contrast = mode === 'granular' ? 0.88 : 0.94;

  for (let i = 0; i < totalPx; i++) {
    const p = i * 4;
    const localMacro = macroLum[i] || meanLum;
    const corr = Math.pow(meanLum / Math.max(32, localMacro), flattenStrength);
    const nr = (srcData[p] * corr - meanR) * contrast + targetR;
    const ng = (srcData[p + 1] * corr - meanG) * contrast + targetG;
    const nb = (srcData[p + 2] * corr - meanB) * contrast + targetB;
    eqData[p] = Math.max(0, Math.min(255, Math.round(nr)));
    eqData[p + 1] = Math.max(0, Math.min(255, Math.round(ng)));
    eqData[p + 2] = Math.max(0, Math.min(255, Math.round(nb)));
    eqData[p + 3] = 255;
  }

  // Síntesis toroidal de 4 cuadrantes desfasados con pesos suaves cosenoidales:
  // garantiza continuidad C1 perfecta en bordes X e Y sin líneas de unión.
  const outCanvas = document.createElement('canvas');
  outCanvas.width = size;
  outCanvas.height = size;
  const octx = outCanvas.getContext('2d');
  if (!octx) return null;
  const outImg = octx.createImageData(size, size);
  const out = outImg.data;
  const half = size >> 1;

  for (let y = 0; y < size; y++) {
    const wy = 0.5 - 0.5 * Math.cos((2 * Math.PI * y) / size);
    const yShift = (y + half) % size;
    for (let x = 0; x < size; x++) {
      const wx = 0.5 - 0.5 * Math.cos((2 * Math.PI * x) / size);
      const xShift = (x + half) % size;

      const w00 = wx * wy;
      const w10 = (1 - wx) * wy;
      const w01 = wx * (1 - wy);
      const w11 = (1 - wx) * (1 - wy);

      const i00 = (y * size + x) * 4;
      const i10 = (y * size + xShift) * 4;
      const i01 = (yShift * size + x) * 4;
      const i11 = (yShift * size + xShift) * 4;

      const dst = i00;
      const r = eqData[i00] * w00 + eqData[i10] * w10 + eqData[i01] * w01 + eqData[i11] * w11;
      const g =
        eqData[i00 + 1] * w00 +
        eqData[i10 + 1] * w10 +
        eqData[i01 + 1] * w01 +
        eqData[i11 + 1] * w11;
      const b =
        eqData[i00 + 2] * w00 +
        eqData[i10 + 2] * w10 +
        eqData[i01 + 2] * w01 +
        eqData[i11 + 2] * w11;

      // Sutil cuantización estética para integrarse con el pixel-art de alta calidad
      out[dst] = Math.min(255, Math.round(r / 3) * 3);
      out[dst + 1] = Math.min(255, Math.round(g / 3) * 3);
      out[dst + 2] = Math.min(255, Math.round(b / 3) * 3);
      out[dst + 3] = 255;
    }
  }

  octx.putImageData(outImg, 0, 0);
  return outCanvas;
}

function ensureNatalSandTiles(): NatalSandTiles {
  if (typeof Image === 'undefined') {
    return { granular: null, rippled: null, mask: 0 };
  }
  if (!natalSandGranularImg) {
    natalSandGranularImg = new Image();
    natalSandGranularImg.decoding = 'async';
    natalSandGranularImg.src = NATAL_SAND_GRANULAR_SRC;
  }
  if (!natalSandRippledImg) {
    natalSandRippledImg = new Image();
    natalSandRippledImg.decoding = 'async';
    natalSandRippledImg.src = NATAL_SAND_RIPPLED_SRC;
  }
  if (
    !natalSandGranularTile &&
    natalSandGranularImg.complete &&
    natalSandGranularImg.naturalWidth > 0
  ) {
    natalSandGranularTile = bakeSeamlessSandTile(natalSandGranularImg, 144, 'granular');
  }
  if (
    !natalSandRippledTile &&
    natalSandRippledImg.complete &&
    natalSandRippledImg.naturalWidth > 0
  ) {
    natalSandRippledTile = bakeSeamlessSandTile(natalSandRippledImg, 168, 'rippled');
  }
  const mask = (natalSandGranularTile ? 1 : 0) | (natalSandRippledTile ? 2 : 0);
  return {
    granular: natalSandGranularTile,
    rippled: natalSandRippledTile,
    mask,
  };
}

/**
 * Micro-erosión natural de la línea de costa (en píxeles): suave y fluida en playas
 * de arena, más quebrada y mineral en los acantilados del Alto de las Rocas.
 */
function coastMicroErosion(wx: number, wy: number, surfaceCode: number): number {
  const waveLong = Math.sin(wx * 0.024 + Math.cos(wy * 0.019) * 1.9);
  const waveMed = Math.sin(wy * 0.043 - wx * 0.029 + 1.4);
  const waveFine = Math.sin((wx - wy) * 0.085 + 0.8);
  const grain = hash2(Math.floor(wx / 5) + 31, Math.floor(wy / 5) - 47) - 0.5;
  if (surfaceCode === SURFACE_CODE_ROCK) {
    return waveLong * 4.6 + waveMed * 3.8 + waveFine * 2.4 + grain * 4.2;
  }
  return waveLong * 3.4 + waveMed * 2.1 + waveFine * 0.9 + grain * 1.6;
}

/** Garantiza que ningún punto caminable del jugador quede jamás sobre el agua. */
function isInsideWalkableSafetyCore(wx: number, wy: number): boolean {
  const inset = 4;
  for (let i = 0; i < ISLA_NATAL_WALK_RECTS.length; i++) {
    const r: IslaNatalWalkRect = ISLA_NATAL_WALK_RECTS[i];
    if (
      wx >= r.x + inset &&
      wx <= r.x + r.w - inset &&
      wy >= r.y + inset &&
      wy <= r.y + r.h - inset
    ) {
      return true;
    }
  }
  return false;
}

function runChamferSweep(
  cols: number,
  rows: number,
  dist: Float32Array,
  inDist: Float32Array,
  surface?: Uint8Array
): void {
  const D = Math.SQRT2;
  const relax = (i: number, ni: number, weight: number) => {
    if (dist[ni] + weight < dist[i]) {
      dist[i] = dist[ni] + weight;
      if (surface) surface[i] = surface[ni];
    }
  };
  const relaxInner = (i: number, ni: number, weight: number) => {
    if (inDist[ni] + weight < inDist[i]) inDist[i] = inDist[ni] + weight;
  };

  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      if (cx > 0) {
        relax(i, i - 1, 1);
        relaxInner(i, i - 1, 1);
      }
      if (cy > 0) {
        relax(i, i - cols, 1);
        relaxInner(i, i - cols, 1);
        if (cx > 0) {
          relax(i, i - cols - 1, D);
          relaxInner(i, i - cols - 1, D);
        }
        if (cx < cols - 1) {
          relax(i, i - cols + 1, D);
          relaxInner(i, i - cols + 1, D);
        }
      }
    }
  }
  for (let cy = rows - 1; cy >= 0; cy--) {
    for (let cx = cols - 1; cx >= 0; cx--) {
      const i = cy * cols + cx;
      if (cx < cols - 1) {
        relax(i, i + 1, 1);
        relaxInner(i, i + 1, 1);
      }
      if (cy < rows - 1) {
        relax(i, i + cols, 1);
        relaxInner(i, i + cols, 1);
        if (cx < cols - 1) {
          relax(i, i + cols + 1, D);
          relaxInner(i, i + cols + 1, D);
        }
        if (cx > 0) {
          relax(i, i + cols - 1, D);
          relaxInner(i, i + cols - 1, D);
        }
      }
    }
  }
}

function buildCoastField(): NatalCoastField {
  const pad = GROUND_PAD;
  const step = COAST_STEP;
  const cols = Math.ceil((ISLA_NATAL_WORLD_W + pad * 2) / step) + 1;
  const rows = Math.ceil((ISLA_NATAL_WORLD_H + pad * 2) / step) + 1;
  const total = cols * rows;
  const dist = new Float32Array(total);
  const inDist = new Float32Array(total);
  const surface = new Uint8Array(total);

  // 1. Rasterización rápida de los contornos orgánicos (isla, escollos, pradera y roca)
  const baseLand = new Uint8Array(total);
  if (typeof document !== 'undefined') {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = cols;
    maskCanvas.height = rows;
    const mctx = maskCanvas.getContext('2d');
    if (mctx) {
      mctx.save();
      mctx.scale(1 / step, 1 / step);
      mctx.translate(pad, pad);

      // Canal R: masa terrestre principal + cayos/escollos + núcleo seguro caminable
      mctx.fillStyle = '#ff0000';
      mctx.beginPath();
      tracePolygonRing(mctx, NATAL_ISLAND_RING);
      for (const sk of NATAL_SKERRY_RINGS) tracePolygonRing(mctx, sk.ring);
      mctx.fill();
      for (const r of ISLA_NATAL_WALK_RECTS) {
        mctx.fillRect(r.x + 4, r.y + 4, Math.max(2, r.w - 8), Math.max(2, r.h - 8));
      }

      // Canal G: pradera interior (solo donde ya existe masa terrestre)
      mctx.globalCompositeOperation = 'source-atop';
      mctx.fillStyle = '#ff8000';
      mctx.beginPath();
      tracePolygonRing(mctx, NATAL_MEADOW_RING);
      mctx.fill();

      // Canal B: promontorio rocoso y escollos de roca
      mctx.fillStyle = '#ff00ff';
      mctx.beginPath();
      tracePolygonRing(mctx, NATAL_ROCK_PLATEAU_RING);
      for (const sk of NATAL_SKERRY_RINGS) {
        if (sk.surface === 'rock') tracePolygonRing(mctx, sk.ring);
      }
      mctx.fill();
      mctx.restore();

      const img = mctx.getImageData(0, 0, cols, rows).data;
      for (let i = 0; i < total; i++) {
        const p = i * 4;
        if (img[p + 3] > 96 && img[p] > 96) {
          baseLand[i] = 1;
          surface[i] =
            img[p + 2] > 128
              ? SURFACE_CODE_ROCK
              : img[p + 1] > 64
                ? SURFACE_CODE_GRASS
                : SURFACE_CODE_SAND;
        }
      }
    }
  } else {
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const wx = cx * step - pad + step * 0.5;
        const wy = cy * step - pad + step * 0.5;
        const idx = cy * cols + cx;
        if (pointInPolygonRing(wx, wy, NATAL_ISLAND_RING) || isInsideWalkableSafetyCore(wx, wy)) {
          baseLand[idx] = 1;
          surface[idx] = pointInPolygonRing(wx, wy, NATAL_ROCK_PLATEAU_RING)
            ? SURFACE_CODE_ROCK
            : pointInPolygonRing(wx, wy, NATAL_MEADOW_RING)
              ? SURFACE_CODE_GRASS
              : SURFACE_CODE_SAND;
        }
      }
    }
  }

  for (let i = 0; i < total; i++) {
    if (baseLand[i]) {
      dist[i] = 0;
      inDist[i] = 9999;
    } else {
      dist[i] = 9999;
      inDist[i] = 0;
    }
  }
  runChamferSweep(cols, rows, dist, inDist, surface);

  // 2. Aplicamos micro-erosión marina al borde para tallar calas, salientes y rocas vivas
  const erodedLand = new Uint8Array(total);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const i = cy * cols + cx;
      const wx = cx * step - pad + step * 0.5;
      const wy = cy * step - pad + step * 0.5;
      const rawSdPx = (dist[i] > 0 ? dist[i] : -inDist[i]) * step;
      if (Math.abs(rawSdPx) > 14) {
        erodedLand[i] = rawSdPx <= 0 ? 1 : 0;
        continue;
      }
      // En el arranque del muelle del Puerto Norte mantenemos la orilla limpia en y ≈ 498
      const dockBlend =
        wy > 480 && wy < 524 && wx > 786 && wx < 854
          ? Math.max(0, 1 - Math.abs(wx - 820) / 34)
          : 0;
      const erosion = coastMicroErosion(wx, wy, surface[i]) * (1 - dockBlend * 0.75);
      if (rawSdPx - erosion <= 0 || isInsideWalkableSafetyCore(wx, wy)) {
        erodedLand[i] = 1;
      }
    }
  }

  // 3. Campo de distancias definitivo sobre la silueta erosionada
  for (let i = 0; i < total; i++) {
    if (erodedLand[i]) {
      dist[i] = 0;
      inDist[i] = 9999;
    } else {
      dist[i] = 9999;
      inDist[i] = 0;
    }
  }
  runChamferSweep(cols, rows, dist, inDist, surface);

  return { cols, rows, pad, step, dist, inDist, surface };
}

function sampleDistancePx(field: NatalCoastField, wx: number, wy: number): number {
  const fx = (wx + field.pad) / field.step - 0.5;
  const fy = (wy + field.pad) / field.step - 0.5;
  const x0 = Math.max(0, Math.min(field.cols - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(field.rows - 1, Math.floor(fy)));
  const x1 = Math.min(field.cols - 1, x0 + 1);
  const y1 = Math.min(field.rows - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0));
  const ty = Math.max(0, Math.min(1, fy - y0));
  const i00 = y0 * field.cols + x0;
  const i10 = y0 * field.cols + x1;
  const i01 = y1 * field.cols + x0;
  const i11 = y1 * field.cols + x1;
  const top = field.dist[i00] + (field.dist[i10] - field.dist[i00]) * tx;
  const bottom = field.dist[i01] + (field.dist[i11] - field.dist[i01]) * tx;
  return (top + (bottom - top) * ty) * field.step;
}

function sampleSurfaceAt(field: NatalCoastField, wx: number, wy: number): IslaNatalSurface {
  const cx = Math.round((wx + field.pad) / field.step - 0.5);
  const cy = Math.round((wy + field.pad) / field.step - 0.5);
  const x = Math.max(0, Math.min(field.cols - 1, cx));
  const y = Math.max(0, Math.min(field.rows - 1, cy));
  const code = field.surface[y * field.cols + x];
  if (code === SURFACE_CODE_ROCK) return 'rock';
  if (code === SURFACE_CODE_GRASS) return 'grass';
  return 'sand';
}

function sampleInnerDistancePx(field: NatalCoastField, wx: number, wy: number): number {
  const fx = (wx + field.pad) / field.step - 0.5;
  const fy = (wy + field.pad) / field.step - 0.5;
  const x0 = Math.max(0, Math.min(field.cols - 1, Math.floor(fx)));
  const y0 = Math.max(0, Math.min(field.rows - 1, Math.floor(fy)));
  const x1 = Math.min(field.cols - 1, x0 + 1);
  const y1 = Math.min(field.rows - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, fx - x0));
  const ty = Math.max(0, Math.min(1, fy - y0));
  const i00 = y0 * field.cols + x0;
  const i10 = y0 * field.cols + x1;
  const i01 = y1 * field.cols + x0;
  const i11 = y1 * field.cols + x1;
  const top = field.inDist[i00] + (field.inDist[i10] - field.inDist[i00]) * tx;
  const bottom = field.inDist[i01] + (field.inDist[i11] - field.inDist[i01]) * tx;
  return Math.min(60, (top + (bottom - top) * ty) * field.step);
}

function buildFoamPoints(field: NatalCoastField): NatalFoamPoint[] {
  const bands: { min: number; max: number; skip: number }[] = [
    { min: 1.5, max: 7, skip: 0.5 },
    { min: 11, max: 18, skip: 0.68 },
    { min: 23, max: 32, skip: 0.78 },
    { min: 38, max: 50, skip: 0.87 },
  ];
  const pts: NatalFoamPoint[] = [];
  const step = field.step;
  const stride = Math.max(1, Math.round(4 / step));
  for (let cy = stride; cy < field.rows - stride; cy += stride) {
    for (let cx = stride; cx < field.cols - stride; cx += stride) {
      const d = field.dist[cy * field.cols + cx] * step;
      if (d < 1 || d > 52) continue;
      for (let b = 0; b < bands.length; b++) {
        const band = bands[b];
        if (d < band.min || d > band.max) continue;
        const h = hash2(cx * 37 + b * 911, cy * 53 - b * 277);
        if (h < band.skip) continue;
        const gx =
          field.dist[cy * field.cols + cx + stride] - field.dist[cy * field.cols + cx - stride];
        const gy =
          field.dist[(cy + stride) * field.cols + cx] -
          field.dist[(cy - stride) * field.cols + cx];
        const horiz = Math.abs(gy) >= Math.abs(gx);
        pts.push({
          x: cx * step - field.pad + (h - 0.5) * 6.5,
          y: cy * step - field.pad + (hash2(cx + 191, cy - 71) - 0.5) * 6.5,
          phase: h * 6.283 + b * 1.37,
          band: b,
          horiz,
          seed: h,
        });
      }
    }
  }
  return pts;
}

function shelfColor(d: number): string {
  // Bajío estilo Isla del Origen: franja turquesa estrecha y translúcida que
  // se funde rápido con el mar profundo (sin halo lavado alrededor de la isla).
  if (d <= 2.5) return 'rgba(198, 250, 240, 0.95)';
  if (d <= 6) return 'rgba(45, 180, 210, 0.6)';
  if (d <= 11) return 'rgba(45, 180, 210, 0.44)';
  if (d <= 18) return 'rgba(30, 140, 175, 0.34)';
  if (d <= 28) return 'rgba(24, 112, 148, 0.26)';
  if (d <= 42) return 'rgba(18, 90, 124, 0.2)';
  if (d <= 58) return 'rgba(14, 74, 106, 0.14)';
  if (d <= 76) return 'rgba(11, 60, 92, 0.09)';
  return 'rgba(10, 53, 84, 0.05)';
}

function wetRimColor(surface: IslaNatalSurface, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (surface === 'sand') return `rgba(136, 98, 52, ${(a * 0.62).toFixed(3)})`;
  if (surface === 'grass') return `rgba(26, 64, 29, ${(a * 0.44).toFixed(3)})`;
  if (surface === 'path') return `rgba(102, 74, 42, ${(a * 0.5).toFixed(3)})`;
  return `rgba(50, 46, 40, ${(a * 0.46).toFixed(3)})`;
}

/**
 * Mancha suave de luz o de oclusión sobre el terreno. Se usa en la capa
 * prerenderizada: aporta volumen amplio sin el borde duro de un rectángulo.
 */
function paintGroundHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rgb: string,
  alpha: number
): void {
  if (rx <= 0 || ry <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, Math.max(0.2, ry / rx));
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb}, ${alpha.toFixed(3)})`);
  g.addColorStop(0.55, `rgba(${rgb}, ${(alpha * 0.55).toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/* ------------------------------ ARENA ----------------------------- */

function paintSandTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  const sandTiles = ensureNatalSandTiles();

  // 1. Manto base continuo con la arena granular orgánica (imagen adjunta 1)
  ctx.fillStyle = '#d4b27c';
  ctx.fillRect(x, y, w, h);

  const granularPattern = sandTiles.granular
    ? ctx.createPattern(sandTiles.granular, 'repeat')
    : null;
  if (granularPattern) {
    ctx.fillStyle = granularPattern;
    ctx.fillRect(x, y, w, h);
  }

  // 2. Bancos y lomas de arena rizada por el viento (imagen adjunta 2) fundidos
  // con máscaras radiales suaves en playas abiertas, cabos y caletas secas.
  const rippledPattern = sandTiles.rippled
    ? ctx.createPattern(sandTiles.rippled, 'repeat')
    : null;
  if (rippledPattern && typeof document !== 'undefined') {
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = 420;
    patchCanvas.height = 280;
    const patchCtx = patchCanvas.getContext('2d');
    if (patchCtx) {
      const duneZones: [number, number, number, number, number][] = [
        // Playa del Aurora (abanicos de dunas suaves a ambos lados del paso costero)
        [670, 978, 158, 76, 0.88],
        [882, 976, 166, 78, 0.86],
        [996, 998, 128, 66, 0.82],
        [604, 996, 108, 58, 0.78],
        // Punta del Oleaje y Ensenada Este (lenguas de arena peinada por la brisa marina)
        [1234, 838, 134, 88, 0.90],
        [1160, 902, 124, 72, 0.84],
        [1348, 830, 52, 34, 0.82],
        // Caleta del Poniente y ribera suroeste
        [496, 916, 114, 68, 0.82],
        [426, 842, 82, 58, 0.72],
        // Media luna de arena del Puerto Norte y Caleta del Norte
        [820, 496, 86, 38, 0.74],
        [1044, 534, 74, 42, 0.78],
        [682, 464, 72, 38, 0.68],
      ];
      for (const [cx, cy, rx, ry, alpha] of duneZones) {
        paintTexturedMeadowPatch(ctx, rippledPattern, patchCanvas, patchCtx, cx, cy, rx, ry, alpha);
      }
    }
  } else if (!granularPattern) {
    // Respaldo cromático armónico mientras decodifican las texturas asíncronamente
    for (let py = y; py < y + h; py += 52) {
      for (let px = x; px < x + w; px += 52) {
        const th = hash2(px * 0.23 + seed, py * 0.31 - seed);
        const cx = px + 14 + Math.floor(th * 26);
        const cy = py + 16 + Math.floor(hash2(px + 7, py + 3) * 22);
        if (th > 0.54) {
          paintGroundHalo(ctx, cx, cy, 26 + th * 16, 12 + th * 8, '238, 212, 162', 0.16);
        } else {
          paintGroundHalo(ctx, cx, cy, 24 + th * 18, 11 + th * 8, '166, 128, 78', 0.12);
        }
      }
    }
  }

  // 3. Relieve volumétrico de hora dorada: calidez de sol poniente en lomos altos
  // y sutil humedad ocre en hondonadas para dar profundidad orgánica a toda la costa.
  for (let py = y; py < y + h; py += 64) {
    for (let px = x; px < x + w; px += 64) {
      const th = hash2(px * 0.19 + seed, py * 0.29 - seed);
      const cx = px + 16 + Math.floor(th * 30);
      const cy = py + 16 + Math.floor(hash2(px + 11, py - 5) * 28);
      if (th > 0.60) {
        paintGroundHalo(ctx, cx, cy, 34 + th * 20, 16 + th * 10, '252, 232, 184', 0.11);
      } else if (th < 0.32) {
        paintGroundHalo(ctx, cx, cy, 30 + th * 22, 15 + th * 9, '138, 100, 56', 0.10);
      }
    }
  }

  // 4. Micro-destellos minerales de cuarzo y diminutos restos marinos integrados en la arena
  for (let py = y + 6; py < y + h - 6; py += 18) {
    for (let px = x + 6; px < x + w - 6; px += 21) {
      const th = hash2(px + 41 + seed, py - 19);
      if (th > 0.92) {
        ctx.fillStyle = 'rgba(255, 246, 218, 0.46)';
        ctx.fillRect(px, py, 2, 1);
      } else if (th < 0.06) {
        ctx.fillStyle = 'rgba(122, 88, 48, 0.32)';
        ctx.fillRect(px, py, 2, 1);
      }
    }
  }
}

/* ------------------------------ CÉSPED ---------------------------- */

/**
 * Pinta un parche orgánico difuminado de una textura de césped secundaria en
 * coordenadas de mundo, manteniendo continuidad de fase con el patrón global.
 */
function paintTexturedMeadowPatch(
  ctx: CanvasRenderingContext2D,
  pattern: CanvasPattern,
  patchCanvas: HTMLCanvasElement,
  patchCtx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  alpha: number
): void {
  if (rx <= 2 || ry <= 2 || alpha <= 0) return;
  const w = Math.ceil(rx * 2);
  const h = Math.ceil(ry * 2);
  if (patchCanvas.width < w) patchCanvas.width = w;
  if (patchCanvas.height < h) patchCanvas.height = h;

  const left = Math.round(cx - rx);
  const top = Math.round(cy - ry);

  patchCtx.save();
  patchCtx.globalCompositeOperation = 'source-over';
  patchCtx.clearRect(0, 0, w, h);

  // Máscara radial suave
  patchCtx.save();
  patchCtx.translate(rx, ry);
  patchCtx.scale(1, Math.max(0.25, ry / rx));
  const mask = patchCtx.createRadialGradient(0, 0, rx * 0.12, 0, 0, rx);
  mask.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(3)})`);
  mask.addColorStop(0.58, `rgba(255, 255, 255, ${(alpha * 0.62).toFixed(3)})`);
  mask.addColorStop(1, 'rgba(255, 255, 255, 0)');
  patchCtx.fillStyle = mask;
  patchCtx.fillRect(-rx, -rx, rx * 2, rx * 2);
  patchCtx.restore();

  // Relleno con la textura en fase exacta de coordenadas de mundo
  patchCtx.globalCompositeOperation = 'source-in';
  patchCtx.translate(-left, -top);
  patchCtx.fillStyle = pattern;
  patchCtx.fillRect(left, top, w, h);
  patchCtx.restore();

  ctx.drawImage(patchCanvas, 0, 0, w, h, left, top, w, h);
}

/**
 * Unifica toda la vegetación de Isla Natal dentro de un contorno costero curvo
 * y festoneado que integra las tres texturas de césped sin bordes rectos.
 */
function paintUnifiedIslandMeadow(ctx: CanvasRenderingContext2D): void {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of NATAL_MEADOW_RING) {
    if (px < minX) minX = px;
    if (py < minY) minY = py;
    if (px > maxX) maxX = px;
    if (py > maxY) maxY = py;
  }
  minX = Math.floor(minX - 18);
  minY = Math.floor(minY - 18);
  maxX = Math.ceil(maxX + 18);
  maxY = Math.ceil(maxY + 18);

  const tiles = ensureNatalGrassTiles();

  ctx.save();
  // Primero recortamos al perímetro exterior de la isla y luego al contorno
  // festoneado de la pradera para que las playas curvas afloren con suavidad.
  ctx.beginPath();
  tracePolygonRing(ctx, NATAL_ISLAND_RING);
  ctx.clip();

  ctx.beginPath();
  tracePolygonRing(ctx, NATAL_MEADOW_RING);
  // Pequeños lóbulos herbáceos a lo largo del contorno para romper cualquier trazo continuo
  for (let i = 0; i < NATAL_MEADOW_RING.length; i += 2) {
    const [mx, my] = NATAL_MEADOW_RING[i];
    const h = hash2(Math.round(mx * 3) + i * 19, Math.round(my * 3) - i * 11);
    if (h < 0.35) continue;
    const r = 3.2 + h * 5.2;
    ctx.moveTo(mx + r, my);
    ctx.arc(mx, my, r, 0, Math.PI * 2);
  }
  ctx.clip();

  // 1. Manto base continuo (césped frondoso volumétrico)
  const basePattern = tiles.base ? ctx.createPattern(tiles.base, 'repeat') : null;
  ctx.fillStyle = basePattern ?? '#387624';
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

  // 2. Mezcla orgánica de biomas con las otras dos texturas de césped
  const cloverPattern = tiles.clover ? ctx.createPattern(tiles.clover, 'repeat') : null;
  const sunlitPattern = tiles.sunlit ? ctx.createPattern(tiles.sunlit, 'repeat') : null;
  if ((cloverPattern || sunlitPattern) && typeof document !== 'undefined') {
    const patchCanvas = document.createElement('canvas');
    patchCanvas.width = 360;
    patchCanvas.height = 280;
    const patchCtx = patchCanvas.getContext('2d');
    if (patchCtx) {
      // Claros soleados de la pradera central y lomas occidentales (textura 2: pradera soleada)
      if (sunlitPattern) {
        const sunlitClearings: [number, number, number, number, number][] = [
          [645, 765, 155, 105, 0.62],
          [855, 735, 145, 96, 0.56],
          [505, 650, 120, 88, 0.54],
          [735, 625, 135, 84, 0.52],
          [920, 835, 118, 76, 0.48],
          [445, 785, 110, 84, 0.50],
          [690, 495, 90, 56, 0.46],
        ];
        for (const [cx, cy, rx, ry, a] of sunlitClearings) {
          paintTexturedMeadowPatch(ctx, sunlitPattern, patchCanvas, patchCtx, cx, cy, rx, ry, a);
        }
      }

      // Sotobosque de tréboles y tierra húmeda en Península de la Arboleda y al pie de árboles (textura 1)
      if (cloverPattern) {
        const woodlandPockets: [number, number, number, number, number][] = [
          [1245, 585, 195, 145, 0.78],
          [1365, 565, 115, 110, 0.72],
          [1120, 680, 130, 98, 0.72],
          [790, 545, 155, 82, 0.64],
          [1105, 785, 96, 86, 0.60],
          [455, 580, 105, 78, 0.58],
        ];
        for (const [cx, cy, rx, ry, a] of woodlandPockets) {
          paintTexturedMeadowPatch(ctx, cloverPattern, patchCanvas, patchCtx, cx, cy, rx, ry, a);
        }
        for (const t of ISLA_NATAL_TREES) {
          paintTexturedMeadowPatch(ctx, cloverPattern, patchCanvas, patchCtx, t.x + 4, t.y + 4, 54, 34, 0.68);
        }
        for (const p of ISLA_NATAL_PALMS) {
          paintTexturedMeadowPatch(ctx, cloverPattern, patchCanvas, patchCtx, p.x + 6, p.y + 4, 46, 28, 0.56);
        }
      }
    }
  }

  // 3. Modulación lumínica de hora dorada para fundir las tres capas con la arena y la arboleda
  for (let py = minY; py < maxY; py += 68) {
    for (let px = minX; px < maxX; px += 68) {
      const th = hash2(px * 0.19 + 31, py * 0.27 + 13);
      const cx = px + 18 + Math.floor(hash2(px + 5, py - 3) * 32);
      const cy = py + 18 + Math.floor(hash2(px - 9, py + 7) * 30);
      if (th > 0.62) {
        paintGroundHalo(ctx, cx, cy, 44 + th * 22, 26 + th * 12, '232, 244, 146', 0.085);
      } else if (th < 0.28) {
        paintGroundHalo(ctx, cx, cy, 40 + th * 24, 24 + th * 12, '14, 46, 18', 0.12);
      }
    }
  }

  // Transición cálida donde la pradera se acerca a las playas curvas del sur y sureste
  const beachWarmth = ctx.createLinearGradient(0, 825, 0, 926);
  beachWarmth.addColorStop(0, 'rgba(214, 180, 126, 0)');
  beachWarmth.addColorStop(1, 'rgba(210, 174, 118, 0.24)');
  ctx.fillStyle = beachWarmth;
  ctx.fillRect(minX, 825, maxX - minX, 104);

  ctx.restore();
}

/* ---------------------- RED DE CAMINOS EMPEDRADOS ----------------- */

interface PathSamplePoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
  t: number;
}

function subdividePathPoints(points: [number, number][]): PathSamplePoint[] {
  if (points.length < 2) return [];
  let pts: [number, number][] = points.map((p) => [p[0], p[1]]);
  // Suavizado Chaikin conservando extremos exactos para conectar umbrales y cruces.
  for (let iter = 0; iter < 3; iter++) {
    const next: [number, number][] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
      next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
  }

  // Remuestreo uniforme cada ~3.5 px para trazos orgánicos continuos.
  const dense: [number, number][] = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    const segLen = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(segLen / 3.5));
    for (let s = 1; s <= steps; s++) {
      const u = s / steps;
      dense.push([ax + (bx - ax) * u, ay + (by - ay) * u]);
    }
  }

  const out: PathSamplePoint[] = [];
  const lastIdx = Math.max(1, dense.length - 1);
  for (let i = 0; i < dense.length; i++) {
    const prev = dense[Math.max(0, i - 1)];
    const next = dense[Math.min(dense.length - 1, i + 1)];
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    out.push({
      x: dense[i][0],
      y: dense[i][1],
      nx: -dy,
      ny: dx,
      t: i / lastIdx,
    });
  }
  return out;
}

function smoothStep01(v: number): number {
  const c = Math.max(0, Math.min(1, v));
  return c * c * (3 - 2 * c);
}

function paintPathBedShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  alphaScale: number
): void {
  if (alphaScale <= 0.02) return;
  let rgb = '22, 46, 18';
  let baseAlpha = 0.28;
  if (y > 892 || !isPointOnNatalMeadow(x, y)) {
    rgb = '118, 84, 44';
    baseAlpha = 0.25;
  } else if (x < 590 && y < 544) {
    rgb = '42, 38, 32';
    baseAlpha = 0.26;
  }
  ctx.fillStyle = `rgba(${rgb}, ${(baseAlpha * alphaScale).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(x + 1.2, y + 1.8, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function applyPathWorldShading(
  offCtx: CanvasRenderingContext2D,
  left: number,
  top: number,
  w: number,
  h: number,
  texture: IslaNatalPathTextureId
): void {
  offCtx.save();
  offCtx.globalCompositeOperation = 'source-atop';

  // Luz cálida del oeste y sombra sutil hacia el este para integrar con la hora dorada.
  const sunGrad = offCtx.createLinearGradient(0, 0, w, h);
  sunGrad.addColorStop(0, 'rgba(255, 232, 178, 0.09)');
  sunGrad.addColorStop(0.55, 'rgba(255, 224, 168, 0)');
  sunGrad.addColorStop(1, 'rgba(20, 42, 28, 0.10)');
  offCtx.fillStyle = sunGrad;
  offCtx.fillRect(0, 0, w, h);

  // Sombra fresca bajo el dosel de La Arboleda.
  if (texture === 'arboleda' && left + w > 1060) {
    const canopyX = Math.max(0, 1080 - left);
    const canopyGrad = offCtx.createLinearGradient(canopyX, 0, w, 0);
    canopyGrad.addColorStop(0, 'rgba(18, 44, 22, 0)');
    canopyGrad.addColorStop(1, 'rgba(16, 42, 22, 0.16)');
    offCtx.fillStyle = canopyGrad;
    offCtx.fillRect(canopyX, 0, w - canopyX, h);
  }

  // Veladura cálida de arena barrida por la brisa en los tramos playeros y costeros.
  if (texture === 'coastal' && top + h > 875) {
    const sandY = Math.max(0, 875 - top);
    const sandGrad = offCtx.createLinearGradient(0, sandY, 0, h);
    sandGrad.addColorStop(0, 'rgba(214, 180, 126, 0)');
    sandGrad.addColorStop(1, 'rgba(214, 180, 126, 0.34)');
    offCtx.fillStyle = sandGrad;
    offCtx.fillRect(0, sandY, w, h - sandY);
  } else if (texture === 'port' && left + w > 1110 && top + h > 730) {
    const sandX = Math.max(0, 1110 - left);
    const sandGrad = offCtx.createLinearGradient(sandX, 0, w, h);
    sandGrad.addColorStop(0, 'rgba(214, 180, 126, 0)');
    sandGrad.addColorStop(1, 'rgba(214, 180, 126, 0.28)');
    offCtx.fillStyle = sandGrad;
    offCtx.fillRect(sandX, 0, w - sandX, h);
  }

  offCtx.restore();
}

function paintScallopedPlaza(
  ctx: CanvasRenderingContext2D,
  plaza: IslaNatalPathPlaza,
  tiles: NatalPathTiles
): void {
  if (typeof document === 'undefined') return;
  const pad = 18;
  const left = Math.floor(plaza.x - plaza.rx - pad);
  const top = Math.floor(plaza.y - plaza.ry - pad);
  const w = Math.ceil((plaza.rx + pad) * 2);
  const h = Math.ceil((plaza.ry + pad) * 2);

  paintPathBedShadow(ctx, plaza.x, plaza.y, plaza.rx + 4, plaza.ry + 3.5, 0.95);

  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;

  const cx = plaza.x - left;
  const cy = plaza.y - top;

  // Núcleo de piedra y corona festoneada de lajas irregulares en el borde.
  offCtx.fillStyle = 'rgba(255, 255, 255, 0.98)';
  offCtx.beginPath();
  offCtx.ellipse(cx, cy, plaza.rx * 0.78, plaza.ry * 0.78, 0, 0, Math.PI * 2);
  offCtx.fill();

  const lobes = 26;
  for (let i = 0; i < lobes; i++) {
    const ang = (i / lobes) * Math.PI * 2;
    const h1 = hash2(Math.round(plaza.x) + i * 19, Math.round(plaza.y) - i * 13);
    const h2 = hash2(Math.round(plaza.x) - i * 31, Math.round(plaza.y) + i * 7);
    const distScale = 0.7 + h1 * 0.26;
    const lx = cx + Math.cos(ang) * plaza.rx * distScale;
    const ly = cy + Math.sin(ang) * plaza.ry * distScale;
    const lr = 4.2 + h2 * 4.4;
    offCtx.fillStyle = `rgba(255, 255, 255, ${(0.82 + h1 * 0.18).toFixed(2)})`;
    offCtx.beginPath();
    offCtx.ellipse(lx, ly, lr * 1.12, lr * 0.92, ang * 0.5, 0, Math.PI * 2);
    offCtx.fill();
  }

  // Relleno con la textura del trayecto alineada en coordenadas de mundo.
  offCtx.save();
  offCtx.globalCompositeOperation = 'source-in';
  offCtx.translate(-left, -top);
  const img = tiles.images[plaza.texture];
  const pattern = img ? offCtx.createPattern(img, 'repeat') : null;
  offCtx.fillStyle = pattern ?? NATAL_PATH_FALLBACK_HEX[plaza.texture];
  offCtx.fillRect(left, top, w, h);
  offCtx.restore();

  applyPathWorldShading(offCtx, left, top, w, h, plaza.texture);
  ctx.drawImage(off, 0, 0, w, h, left, top, w, h);
}

function paintScallopedRoute(
  ctx: CanvasRenderingContext2D,
  route: IslaNatalPathRoute,
  samples: PathSamplePoint[],
  tiles: NatalPathTiles
): void {
  if (samples.length === 0 || typeof document === 'undefined') return;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of samples) {
    if (s.x < minX) minX = s.x;
    if (s.y < minY) minY = s.y;
    if (s.x > maxX) maxX = s.x;
    if (s.y > maxY) maxY = s.y;
  }

  const pad = Math.ceil(route.width * 0.9 + 18);
  const left = Math.floor(minX - pad);
  const top = Math.floor(minY - pad);
  const w = Math.ceil(maxX - minX + pad * 2);
  const h = Math.ceil(maxY - minY + pad * 2);

  // 1. Lecho hundido de tierra/musgo/arena bajo el empedrado.
  for (let i = 0; i < samples.length; i += 2) {
    const s = samples[i];
    let endFade = 1;
    if (route.featherStart && s.t < 0.14) endFade = smoothStep01(s.t / 0.14);
    if (route.featherEnd && s.t > 0.86) endFade = Math.min(endFade, smoothStep01((1 - s.t) / 0.14));
    const halfW = route.width * 0.5 * (0.72 + 0.28 * endFade);
    paintPathBedShadow(ctx, s.x, s.y, halfW + 3.2, halfW * 0.88 + 2.8, endFade * 0.55);
  }

  // 2. Máscara festoneada del sendero: centro continuo + piedras salientes en ambos bordes.
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const offCtx = off.getContext('2d');
  if (!offCtx) return;

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    let alpha = 1;
    let widthScale = 1;
    if (route.featherStart && s.t < 0.15) {
      const f = smoothStep01(s.t / 0.15);
      alpha = 0.22 + 0.78 * f;
      widthScale = 0.62 + 0.38 * f;
    }
    if (route.featherEnd && s.t > 0.85) {
      const f = smoothStep01((1 - s.t) / 0.15);
      alpha = Math.min(alpha, 0.22 + 0.78 * f);
      widthScale = Math.min(widthScale, 0.62 + 0.38 * f);
    }

    const wobble =
      Math.sin(i * 0.29 + s.x * 0.03) * 1.35 + Math.cos(i * 0.17 + s.y * 0.03) * 0.95;
    const halfW = Math.max(6, route.width * 0.5 * widthScale + wobble);
    const sx = s.x - left;
    const sy = s.y - top;

    offCtx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    offCtx.beginPath();
    offCtx.arc(sx, sy, halfW * 0.76, 0, Math.PI * 2);
    offCtx.fill();

    // Lóbulos laterales de piedra para evitar bordes rectos artificiales.
    if (i % 2 === 0) {
      for (const side of [-1, 1] as const) {
        const h1 = hash2(i * 23 + (side > 0 ? 7 : 53), Math.round(s.x + s.y));
        if (h1 < 0.18) continue;
        const h2 = hash2(i * 41 + (side > 0 ? 97 : 13), Math.round(s.x - s.y));
        const offset = halfW * (0.58 + h1 * 0.36);
        const lx = sx + s.nx * side * offset;
        const ly = sy + s.ny * side * offset;
        const lr = 3.4 + h2 * 3.8;
        offCtx.fillStyle = `rgba(255, 255, 255, ${(alpha * (0.78 + h1 * 0.22)).toFixed(3)})`;
        offCtx.beginPath();
        offCtx.ellipse(lx, ly, lr * 1.15, lr * 0.9, h1 * Math.PI, 0, Math.PI * 2);
        offCtx.fill();
      }
    }
  }

  // 3. Aplicación del patrón seamless en coordenadas de mundo.
  offCtx.save();
  offCtx.globalCompositeOperation = 'source-in';
  offCtx.translate(-left, -top);
  const img = tiles.images[route.texture];
  const pattern = img ? offCtx.createPattern(img, 'repeat') : null;
  offCtx.fillStyle = pattern ?? NATAL_PATH_FALLBACK_HEX[route.texture];
  offCtx.fillRect(left, top, w, h);
  offCtx.restore();

  applyPathWorldShading(offCtx, left, top, w, h, route.texture);
  ctx.drawImage(off, 0, 0, w, h, left, top, w, h);
}

/** Peldaños de piedra tallada donde el sendero sube al Alto de las Rocas (y ≈ 542). */
function paintHighlandRampSteps(ctx: CanvasRenderingContext2D): void {
  const steps = [
    { cx: 470, y: 538, w: 30 },
    { cx: 472, y: 543, w: 31 },
    { cx: 474, y: 548, w: 32 },
    { cx: 476, y: 553, w: 32 },
    { cx: 478, y: 558, w: 30 },
  ];

  // Muretes laterales de contención integrados con el acantilado de la meseta.
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const lx = Math.round(st.cx - st.w * 0.5 - 4);
    const rx = Math.round(st.cx + st.w * 0.5);
    ctx.fillStyle = '#5c574d';
    ctx.fillRect(lx, st.y - 1, 5, 6);
    ctx.fillRect(rx, st.y - 1, 5, 6);
    ctx.fillStyle = '#a49b88';
    ctx.fillRect(lx, st.y - 1, 4, 2);
    ctx.fillRect(rx + 1, st.y - 1, 4, 2);
  }

  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const sx = Math.round(st.cx - st.w * 0.5);
    // Sombra de contrahuella
    ctx.fillStyle = 'rgba(34, 30, 24, 0.62)';
    ctx.fillRect(sx, st.y + 3, st.w, 2);
    // Huella de losa de montaña
    ctx.fillStyle = i % 2 === 0 ? '#8c8576' : '#7f796b';
    ctx.fillRect(sx, st.y, st.w, 3);
    // Junta intermedia de sillar
    const split = sx + 11 + ((i * 7) % 9);
    ctx.fillStyle = 'rgba(44, 40, 34, 0.55)';
    ctx.fillRect(split, st.y, 1, 3);
    // Bisel soleado superior
    ctx.fillStyle = 'rgba(226, 214, 186, 0.62)';
    ctx.fillRect(sx + 1, st.y, st.w - 2, 1);
    // Musgo en las esquinas del peldaño
    if (i % 2 === 1) {
      ctx.fillStyle = 'rgba(96, 138, 72, 0.58)';
      ctx.fillRect(sx + 1, st.y + 2, 5, 1);
    } else {
      ctx.fillStyle = 'rgba(96, 138, 72, 0.52)';
      ctx.fillRect(sx + st.w - 6, st.y + 2, 5, 1);
    }
  }
}

/** Briznas de césped, musgo, arena y guijarros que abrazan los bordes de cada trayecto. */
function paintRouteEdgeIntegration(
  ctx: CanvasRenderingContext2D,
  route: IslaNatalPathRoute,
  samples: PathSamplePoint[]
): void {
  for (let i = 2; i < samples.length - 2; i += 3) {
    const s = samples[i];
    const halfW = route.width * 0.5;

    for (const side of [-1, 1] as const) {
      const h1 = hash2(i * 37 + (side > 0 ? 11 : 73), Math.round(s.x * 2 + s.y));
      if (h1 < 0.34) continue;
      const edgeDist = halfW * (0.82 + (h1 - 0.34) * 0.42);
      const ex = Math.round(s.x + s.nx * side * edgeDist);
      const ey = Math.round(s.y + s.ny * side * edgeDist);

      const onBeachMargin =
        ey > 892 || (!isPointOnNatalMeadow(ex, ey) && !(ex < 588 && ey < 540));
      if (onBeachMargin) {
        // Tramos sobre arena: lenguas de arena ocre-dorada y granos sueltos que montan las piedras.
        ctx.fillStyle = h1 > 0.68 ? 'rgba(228, 198, 146, 0.78)' : 'rgba(196, 158, 106, 0.68)';
        ctx.fillRect(ex - 1, ey, 3, 2);
        ctx.fillStyle = 'rgba(246, 224, 178, 0.48)';
        ctx.fillRect(ex, ey, 2, 1);
        if (h1 > 0.78) {
          const px = Math.round(s.x + s.nx * side * (halfW + 3 + (h1 - 0.78) * 14));
          const py = Math.round(s.y + s.ny * side * (halfW + 3 + (h1 - 0.78) * 14));
          ctx.fillStyle = 'rgba(122, 88, 48, 0.46)';
          ctx.fillRect(px, py + 1, 3, 2);
          ctx.fillStyle = '#c4ae8c';
          ctx.fillRect(px, py, 3, 2);
        }
      } else if (ex < 588 && ey < 540) {
        // Meseta del Alto de las Rocas: líquenes y esquirlas minerales.
        ctx.fillStyle = h1 > 0.66 ? 'rgba(116, 152, 90, 0.52)' : 'rgba(92, 86, 76, 0.48)';
        ctx.fillRect(ex - 1, ey, 3, 2);
        if (h1 > 0.8) {
          ctx.fillStyle = '#afa693';
          ctx.fillRect(ex + side * 2, ey - 1, 2, 1);
        }
      } else {
        // Pradera y Arboleda: briznas de hierba que montan sobre las piedras del borde.
        const darkGrass = route.texture === 'arboleda' ? '#1f4e1c' : '#295e20';
        const midGrass = route.texture === 'arboleda' ? '#387624' : '#468a2c';
        const tipGrass = route.texture === 'arboleda' ? '#6db03b' : '#82c444';
        ctx.fillStyle = darkGrass;
        ctx.fillRect(ex - 1, ey, 3, 2);
        ctx.fillStyle = midGrass;
        ctx.fillRect(ex, ey - 2, 2, 3);
        ctx.fillStyle = tipGrass;
        ctx.fillRect(ex, ey - 3, 1, 2);
        if (h1 > 0.82) {
          // Piedrecilla suelta junto al borde en la hierba
          const px = Math.round(s.x + s.nx * side * (halfW + 3.5));
          const py = Math.round(s.y + s.ny * side * (halfW + 3.5));
          ctx.fillStyle = 'rgba(24, 48, 18, 0.42)';
          ctx.fillRect(px, py + 1, 2, 2);
          ctx.fillStyle = NATAL_PATH_FALLBACK_HEX[route.texture];
          ctx.fillRect(px, py, 2, 1);
        }
      }
    }

    // Brotes diminutos de musgo entre juntas en tramos húmedos o boscosos.
    const hm = hash2(i * 59 + 17, Math.round(s.x - s.y * 2));
    if (s.y <= 886 && hm > (route.texture === 'arboleda' ? 0.76 : 0.88)) {
      const mx = Math.round(s.x + s.nx * ((hm - 0.82) * route.width * 1.4));
      const my = Math.round(s.y + s.ny * ((hm - 0.82) * route.width * 1.4));
      ctx.fillStyle = 'rgba(74, 128, 50, 0.46)';
      ctx.fillRect(mx, my, 2, 1);
    }
  }
}

function paintIslandPaths(ctx: CanvasRenderingContext2D): void {
  const tiles = ensureNatalPathTiles();
  const sampledRoutes = ISLA_NATAL_PATH_ROUTES.map((route) => ({
    route,
    samples: subdividePathPoints(route.points),
  }));

  // 1. Plazas base de cruces y umbrales para asentar los empalmes.
  for (const plaza of ISLA_NATAL_PATH_PLAZAS) {
    if (plaza.id === 'plaza-crucero-central' || plaza.id === 'plaza-crucero-norte') {
      paintScallopedPlaza(ctx, plaza, tiles);
    }
  }

  // 2. Trazado continuo de cada trayecto con su textura correspondiente.
  for (const { route, samples } of sampledRoutes) {
    paintScallopedRoute(ctx, route, samples, tiles);
  }

  // 3. Plazas terminales (umbral de Casa de Pixel, muelle norte, cobertizo Pong y mirador rocoso).
  for (const plaza of ISLA_NATAL_PATH_PLAZAS) {
    if (plaza.id !== 'plaza-crucero-central' && plaza.id !== 'plaza-crucero-norte') {
      paintScallopedPlaza(ctx, plaza, tiles);
    }
  }

  // 4. Escalones tallados en la subida al Alto de las Rocas.
  paintHighlandRampSteps(ctx);

  // 5. Integración fina de césped, musgo y arena sobre los bordes del empedrado.
  for (const { route, samples } of sampledRoutes) {
    paintRouteEdgeIntegration(ctx, route, samples);
  }
}

/* ------------------------------ ROCA ------------------------------ */

function paintRockTexture(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  ctx.fillStyle = '#8b8577';
  ctx.fillRect(x, y, w, h);

  // Tonalidad macro: vetas grandes de mineral que rompen la uniformidad.
  for (let py = y; py < y + h; py += 26) {
    for (let px = x; px < x + w; px += 30) {
      const th = hash2(px * 0.23 + seed, py * 0.41 + 7);
      const tone =
        th > 0.74 ? 'rgba(158, 150, 133, 0.4)' : th < 0.24 ? 'rgba(112, 106, 94, 0.42)' : null;
      if (!tone) continue;
      ctx.fillStyle = tone;
      ctx.fillRect(px + 2, py + 1, 16 + Math.floor(th * 12), 9 + Math.floor((1 - th) * 8));
      ctx.fillRect(px + 7, py + 13, 10 + Math.floor(th * 9), 6);
    }
  }

  // Losas irregulares grandes: junta quebrada, no rejilla de ladrillos.
  const slabH = 26;
  for (let py = y; py < y + h; py += slabH) {
    const row = Math.floor((py - y) / slabH);
    ctx.fillStyle = 'rgba(60, 56, 50, 0.22)';
    ctx.fillRect(x, py + slabH - 2, w, 2);
    const joint = x + Math.floor(hash2(row * 17 + 3, py) * (w - 30));
    ctx.fillStyle = 'rgba(60, 56, 50, 0.24)';
    ctx.fillRect(joint, py, 2, slabH);
    for (let px = x; px < x + w; px += 52) {
      const off = Math.floor(hash2(px + 13, py + seed) * 8) - 4;
      const sx = px + off;
      const sxw = Math.min(50, x + w - sx);
      if (sxw <= 4 || sx + sxw <= joint + 2) continue;
      ctx.fillStyle = 'rgba(178, 170, 150, 0.26)';
      ctx.fillRect(sx + 1, py + 1, sxw - 2, 1);
      ctx.fillRect(sx + 1, py + 1, 1, slabH - 4);
      ctx.fillStyle = 'rgba(66, 62, 55, 0.28)';
      ctx.fillRect(sx + sxw - 2, py + 2, 1, slabH - 5);
    }
  }

  // Estratos horizontales y vetas.
  ctx.fillStyle = 'rgba(94, 87, 75, 0.3)';
  for (let py = y + 9; py < y + h - 6; py += 19) {
    ctx.fillRect(x + (py % 3 === 0 ? 12 : 0), py, w - (py % 3 === 0 ? 16 : 4), 1);
  }

  // Grietas finas.
  for (let py = y + 8; py < y + h - 10; py += 31) {
    for (let px = x + 14; px < x + w - 10; px += 43) {
      const th = hash2(px + 3, py + 71);
      if (th < 0.45) continue;
      ctx.fillStyle = 'rgba(58, 54, 47, 0.55)';
      let cx = px;
      let cy = py;
      for (let s = 0; s < 5; s++) {
        cx += hash2(px + s, py - s) > 0.5 ? 2 : -1;
        cy += 2;
        ctx.fillRect(cx, cy, 1, 2);
      }
    }
  }

  // Musgo en juntas y líquenes.
  for (let py = y + 12; py < y + h - 8; py += 23) {
    for (let px = x + 8; px < x + w - 8; px += 29) {
      const th = hash2(px - 17, py + 137);
      if (th > 0.72) {
        ctx.fillStyle = 'rgba(116, 152, 90, 0.5)';
        ctx.fillRect(px, py, 6 + Math.floor(th * 7), 2);
        ctx.fillStyle = 'rgba(86, 124, 68, 0.45)';
        ctx.fillRect(px + 2, py + 2, 4, 1);
      } else if (th < 0.09) {
        ctx.fillStyle = 'rgba(196, 214, 168, 0.42)';
        ctx.fillRect(px + 1, py, 2, 2);
      }
    }
  }

  // Pedruscos sueltos y polvo de roca.
  for (let py = y + 4; py < y + h - 3; py += 11) {
    for (let px = x + 4; px < x + w - 3; px += 13) {
      const th = hash2(px + 23, py + 53);
      if (th < 0.74) continue;
      ctx.fillStyle = th > 0.88 ? '#b8ae9a' : '#6f6a5e';
      ctx.fillRect(px, py, 2, 1);
    }
  }
}

/* --------------------- TRANSICIONES Y ACANTILADOS CURVOS ---------- */

/**
 * Integra de forma natural el borde curvo de la pradera con las playas de arena
 * y las riberas costeras mediante matas dunares, lenguas de arena y guijarros.
 */
function paintCurvedMeadowBeachFringe(ctx: CanvasRenderingContext2D): void {
  const n = NATAL_MEADOW_RING.length;
  for (let i = 0; i < n; i++) {
    const [x, y] = NATAL_MEADOW_RING[i];
    if (!pointInPolygonRing(x, y, NATAL_ISLAND_RING)) continue;
    if (pointInPolygonRing(x, y, NATAL_ROCK_PLATEAU_RING)) continue;

    const prev = NATAL_MEADOW_RING[(i - 1 + n) % n];
    const next = NATAL_MEADOW_RING[(i + 1) % n];
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    // En un anillo horario (coordenadas de pantalla Y hacia abajo), la normal exterior es (dy, -dx)
    const nx = dy;
    const ny = -dx;

    const th = hash2(Math.round(x * 2) + i * 17, Math.round(y * 2) - i * 13);
    if (i % 3 === 0) {
      paintGroundHalo(ctx, x + nx * 4, y + ny * 4, 15 + th * 11, 9 + th * 6, '212, 178, 124', 0.18);
    }
    if (th < 0.28) continue;

    const sx = Math.round(x + nx * 1.5);
    const sy = Math.round(y + ny * 1.5);
    // Sombra suave de contacto del tapiz herbáceo sobre la nueva arena granular
    ctx.fillStyle = 'rgba(38, 52, 22, 0.34)';
    ctx.fillRect(sx - 1, sy, 3, 2);

    // Matas costeras escalonadas que avanzan hacia la arena
    const tx = Math.round(x + nx * (2.5 + th * 4.5));
    const ty = Math.round(y + ny * (2.5 + th * 4.5));
    ctx.fillStyle = th > 0.64 ? '#4d8f2d' : '#356d22';
    ctx.fillRect(tx - 1, ty - 2, 2, 3);
    ctx.fillStyle = '#7ec043';
    ctx.fillRect(tx, ty - 3, 1, 2);

    if (th > 0.62) {
      const tx2 = Math.round(x + nx * (6 + th * 5) + dx * 3);
      const ty2 = Math.round(y + ny * (6 + th * 5) + dy * 3);
      ctx.fillStyle = '#3b7525';
      ctx.fillRect(tx2, ty2 - 1, 2, 2);
      ctx.fillStyle = '#8ad04e';
      ctx.fillRect(tx2, ty2 - 2, 1, 1);
    }

    // Lengua fina de arena dorada-ocre barrida por la brisa hacia el césped
    if (th > 0.46 && th < 0.82) {
      const bx = Math.round(x - nx * (2 + th * 4.5));
      const by = Math.round(y - ny * (2 + th * 4.5));
      ctx.fillStyle = 'rgba(216, 182, 128, 0.58)';
      ctx.fillRect(bx - 1, by, 3, 2);
      ctx.fillStyle = 'rgba(242, 216, 168, 0.40)';
      ctx.fillRect(bx, by, 2, 1);
    }
  }
}

/**
 * Dibuja los acantilados estratificados y bordes rocosos siguiendo la silueta
 * curva del Alto de las Rocas y su terraza superior (respetando la escalinata tallada).
 */
function paintCurvedCliffArc(
  ctx: CanvasRenderingContext2D,
  ring: readonly Vec2[],
  baseFaceH: number,
  gapMinX: number,
  gapMaxX: number,
  minBrowseY: number
): void {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x, y] = ring[i];
    if (y < minBrowseY) continue;
    if (!pointInPolygonRing(x, y + 6, NATAL_ISLAND_RING)) continue;

    const prev = ring[(i - 1 + n) % n];
    const next = ring[(i + 1) % n];
    const segLen = Math.hypot(next[0] - x, next[1] - y);
    let dx = next[0] - prev[0];
    let dy = next[1] - prev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const nx = dy;
    const ny = -dx;

    const steps = Math.max(1, Math.ceil(segLen / 3));
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const px = Math.round(x + (next[0] - x) * u);
      const py = Math.round(y + (next[1] - y) * u);
      if (px >= gapMinX && px <= gapMaxX && ny > 0.15) continue;

      const th = hash2(px + 13, py - 29);
      if (ny > 0.26) {
        // Cara de acantilado orientada al sur/sureste con estratos minerales y musgo
        const hh = Math.max(7, Math.round(baseFaceH * (0.58 + 0.48 * ny) + (th - 0.5) * 4));
        ctx.fillStyle = 'rgba(14, 24, 16, 0.20)';
        ctx.fillRect(px, py + hh, 4, 4);

        ctx.fillStyle = th > 0.54 ? '#6f6a5e' : '#7a7468';
        ctx.fillRect(px, py, 4, hh);
        ctx.fillStyle = '#a49c8b';
        ctx.fillRect(px, py, 4, 2);
        ctx.fillStyle = 'rgba(226, 216, 192, 0.62)';
        ctx.fillRect(px, py, 4, 1);

        if (hh >= 12) {
          ctx.fillStyle = 'rgba(52, 48, 42, 0.55)';
          ctx.fillRect(px, py + Math.round(hh * 0.36), 4, 2);
          ctx.fillRect(px, py + Math.round(hh * 0.72), 4, 2);
        }
        if (th > 0.76) {
          ctx.fillStyle = 'rgba(40, 36, 30, 0.60)';
          ctx.fillRect(px + 1, py + 3, 1, Math.max(3, hh - 5));
        }
        if (th < 0.26) {
          ctx.fillStyle = 'rgba(104, 144, 78, 0.55)';
          ctx.fillRect(px, py + 1, 3, 2);
        }
        ctx.fillStyle = 'rgba(18, 26, 18, 0.36)';
        ctx.fillRect(px, py + hh - 2, 4, 2);
      } else if (nx > 0.25 && pointInPolygonRing(px + 6, py, NATAL_ISLAND_RING)) {
        // Talud lateral este hacia Caleta de las Rocas: esquirlas y musgo
        if (th > 0.45) {
          ctx.fillStyle = 'rgba(42, 38, 32, 0.52)';
          ctx.fillRect(px, py, 3, 3);
          ctx.fillStyle = '#968f7f';
          ctx.fillRect(px - 1, py, 2, 2);
          if (th > 0.72) {
            ctx.fillStyle = 'rgba(112, 148, 86, 0.55)';
            ctx.fillRect(px + 1, py + 1, 3, 2);
          }
        }
      }
    }
  }
}

function paintOrganicRockHeadland(ctx: CanvasRenderingContext2D): void {
  // 1. Meseta principal y escollos rocosos recortados a la silueta costera
  ctx.save();
  ctx.beginPath();
  tracePolygonRing(ctx, NATAL_ROCK_PLATEAU_RING);
  for (const sk of NATAL_SKERRY_RINGS) {
    if (sk.surface === 'rock') tracePolygonRing(ctx, sk.ring);
  }
  ctx.clip();
  paintRockTexture(ctx, 210, 210, 420, 360, 41);
  paintRockTexture(ctx, 412, 944, 40, 32, 73);
  ctx.restore();

  // 2. Terraza alta curva del Mirador del Alto de las Rocas
  ctx.save();
  ctx.beginPath();
  tracePolygonRing(ctx, NATAL_ROCK_CREST_RING);
  ctx.clip();
  paintRockTexture(ctx, 328, 240, 224, 132, 89);
  ctx.fillStyle = 'rgba(236, 226, 200, 0.08)';
  ctx.fillRect(328, 240, 224, 132);
  ctx.restore();

  // 3. Frentes de acantilado curvos con paso abierto para el sendero empedrado
  paintCurvedCliffArc(ctx, NATAL_ROCK_CREST_RING, 11, 434, 472, 324);
  paintCurvedCliffArc(ctx, NATAL_ROCK_PLATEAU_RING, 18, 451, 489, 470);
}

/* ----------------- COSTA, BAJÍO Y MAREA PRERENDERIZADOS ----------- */

/** Anchura variable del bajío turquesa: amplia en bahías/playas y más abrupta en acantilados. */
function localShelfRange(wx: number, wy: number, surface: IslaNatalSurface): number {
  const macro =
    Math.sin(wx * 0.0085 + 0.7) * 11 + Math.cos(wy * 0.011 - 0.4) * 9;
  if (surface === 'rock') {
    return Math.max(44, Math.min(72, 54 + macro * 0.65));
  }
  // Lagunas turquesas más generosas en Playa del Aurora, Ensenada del Este y Punta del Oleaje
  const southLagoon = wy > 720 ? 14 : 0;
  return Math.max(66, Math.min(SHELF_RANGE, 84 + southLagoon + macro));
}

function paintCoastBand(ctx: CanvasRenderingContext2D, field: NatalCoastField): void {
  const step = 2;
  const width = ISLA_NATAL_WORLD_W + field.pad * 2;
  const height = ISLA_NATAL_WORLD_H + field.pad * 2;

  for (let py = 0; py < height; py += step) {
    for (let px = 0; px < width; px += step) {
      const wx = px - field.pad + step * 0.5;
      const wy = py - field.pad + step * 0.5;
      const d = sampleDistancePx(field, wx, wy);

      if (d <= 0.05) {
        // Tierra firme: pintamos la orla húmeda de marea y el filo vivo de espuma/roca mojada
        const inner = sampleInnerDistancePx(field, wx, wy);
        if (inner < 17) {
          const surface = sampleSurfaceAt(field, wx, wy);
          ctx.fillStyle = wetRimColor(surface, 1 - inner / 17);
          ctx.fillRect(px, py, step, step);
          const th = hash2(px + 29, py - 61);
          if (inner < 3.2 && th > 0.46) {
            ctx.fillStyle =
              surface === 'rock'
                ? 'rgba(210, 238, 236, 0.34)'
                : 'rgba(255, 248, 224, 0.36)';
            ctx.fillRect(px, py, step, 1);
          }
        }
        continue;
      }

      // Fuera de la silueta erosionada recortamos cualquier excedente de textura
      if (d < 34) {
        ctx.clearRect(px, py, step, step);
      }
      if (d > SHELF_RANGE + 18) continue;

      const surface = sampleSurfaceAt(field, wx, wy);
      const maxShelf = localShelfRange(wx, wy, surface);
      const th = hash2(px + 17, py + 89);
      const wobble =
        Math.sin(wx * 0.052 + wy * 0.023) * 2.8 + Math.sin(wy * 0.074 - wx * 0.015) * 2.1;
      const band = d + wobble;
      if (band > maxShelf) continue;
      if (band > maxShelf - 24) {
        const chance = (band - (maxShelf - 24)) / 26;
        if (th < chance) continue;
      }

      const normBand = (band / maxShelf) * 84;
      ctx.fillStyle = shelfColor(normBand);
      ctx.fillRect(px, py, step, step);

      // Bancos de arena sumergidos bajo el agua cristalina de las playas curvas
      if (surface === 'sand' && band > 3 && band < 28) {
        const sandGlow = (1 - band / 28) * 0.2;
        ctx.fillStyle = `rgba(222, 190, 134, ${sandGlow.toFixed(3)})`;
        ctx.fillRect(px, py, step, step);
      }

      // Detalle submarino: destellos, praderas de posidonia y arrecifes someros
      if (band < 26 && th > 0.88) {
        ctx.fillStyle = 'rgba(224, 255, 250, 0.42)';
        ctx.fillRect(px, py, 2 + Math.floor(th * 3), 1);
      } else if (band > 8 && band < 38 && th < 0.036) {
        ctx.fillStyle =
          surface === 'rock' ? 'rgba(22, 58, 72, 0.42)' : 'rgba(18, 78, 68, 0.35)';
        ctx.fillRect(px, py, 3, 2);
      }
      if (band < 12 && th > 0.74) {
        ctx.fillStyle = 'rgba(214, 244, 228, 0.34)';
        ctx.fillRect(px, py, 2, 1);
      }
    }
  }
}

function paintGroundLayer(field: NatalCoastField): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = ISLA_NATAL_WORLD_W + field.pad * 2;
  canvas.height = ISLA_NATAL_WORLD_H + field.pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;

  ctx.save();
  ctx.translate(field.pad, field.pad);

  // 1. Manto continuo de arena dorada enmascarado a la silueta orgánica (+ margen de erosión)
  ctx.save();
  ctx.beginPath();
  tracePolygonRing(ctx, NATAL_ISLAND_RING);
  for (const sk of NATAL_SKERRY_RINGS) tracePolygonRing(ctx, sk.ring);
  ctx.lineWidth = 22;
  ctx.lineJoin = 'round';
  ctx.fillStyle = '#d4b27c';
  ctx.strokeStyle = '#d4b27c';
  ctx.fill();
  ctx.stroke();
  for (const r of ISLA_NATAL_WALK_RECTS) {
    ctx.fillRect(r.x + 2, r.y + 2, Math.max(2, r.w - 4), Math.max(2, r.h - 4));
  }
  ctx.globalCompositeOperation = 'source-atop';
  paintSandTexture(ctx, 204, 204, 1272, 876, 37);
  ctx.restore();

  // 2. Pradera orgánica unificada (3 texturas) + integración curva con las playas
  paintUnifiedIslandMeadow(ctx);
  paintCurvedMeadowBeachFringe(ctx);

  // 3. Promontorio y terrazas curvas del Alto de las Rocas + acantilados estratificados
  paintOrganicRockHeadland(ctx);

  // 4. Red coherente de caminos empedrados según cada trayecto (intacta)
  paintIslandPaths(ctx);

  ctx.restore();

  // 5. Esculpido costero final, orla húmeda de marea y bajío turquesa asimétrico
  paintCoastBand(ctx, field);

  // 6. Luz de la isla dentro de la masa terrestre y su bajío (sin teñir el mar abierto)
  const worldW = canvas.width;
  const worldH = canvas.height;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const worldLight = ctx.createLinearGradient(0, 0, worldW, worldH);
  worldLight.addColorStop(0, 'rgba(255, 222, 156, 0.13)');
  worldLight.addColorStop(0.34, 'rgba(255, 236, 190, 0.045)');
  worldLight.addColorStop(0.62, 'rgba(210, 230, 200, 0)');
  worldLight.addColorStop(1, 'rgba(18, 52, 64, 0.08)');
  ctx.fillStyle = worldLight;
  ctx.fillRect(0, 0, worldW, worldH);

  // 7. Grandes sombras de nube y calvas de sol sobre el relieve insular
  for (let i = 0; i < 9; i += 1) {
    const th = hash2(i * 91 + 7, i * 37 + 19);
    const cx = (th * 0.9 + 0.05) * worldW;
    const cy = (hash2(i * 13 + 3, i * 71 + 5) * 0.86 + 0.07) * worldH;
    const rx = 90 + th * 110;
    const ry = 44 + th * 52;
    paintGroundHalo(ctx, cx, cy, rx, ry, '22, 52, 46', 0.05);
    paintGroundHalo(ctx, cx + rx * 0.5, cy + ry * 0.6, rx * 0.6, ry * 0.6, '12, 38, 34', 0.035);
  }
  ctx.restore();

  return canvas;
}

function ensureCoastLayer(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const tileMask =
    ensureNatalGrassTiles().mask |
    (ensureNatalPathTiles().mask << 3) |
    (ensureNatalSandTiles().mask << 8);
  if (coastGroundLayer && coastLayerTileMask === tileMask) {
    return coastGroundLayer;
  }
  if (!coastField) {
    coastField = buildCoastField();
    coastFoam = buildFoamPoints(coastField);
  }
  coastGroundLayer = paintGroundLayer(coastField);
  coastLayerTileMask = tileMask;
  return coastGroundLayer;
}

/* ------------------------------------------------------------------ */
/* MAR                                                                */
/* ------------------------------------------------------------------ */

function drawOcean(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number,
  animFrame4: number,
  charge: number,
  reducedMotion: boolean
): void {
  // Gradiente de profundidad: el mar pierde luz hacia el sur, como en la hora dorada.
  const depth = ctx.createLinearGradient(0, camY, 0, camY + vh);
  depth.addColorStop(0, '#0c3452');
  depth.addColorStop(0.42, '#092b47');
  depth.addColorStop(1, '#051c31');
  ctx.fillStyle = depth;
  ctx.fillRect(camX, camY, vw, vh);

  // Corrientes de gran escala: bandas suaves que impiden leer el mar como un
  // color plano y acompañan la dirección del oleaje.
  const current = ctx.createLinearGradient(camX, camY, camX + vw, camY + vh);
  current.addColorStop(0, 'rgba(22, 82, 112, 0.1)');
  current.addColorStop(0.38, 'rgba(8, 40, 62, 0.04)');
  current.addColorStop(0.72, 'rgba(16, 70, 96, 0.09)');
  current.addColorStop(1, 'rgba(4, 22, 38, 0.12)');
  ctx.fillStyle = current;
  ctx.fillRect(camX, camY, vw, vh);

  // Luz cálida del oeste: el agua cercana al sol pierde azul y gana ámbar.
  // La capa de tierra se pinta después, así que sólo queda sobre el mar.
  const westGlow = ctx.createLinearGradient(camX, 0, camX + vw * 0.6, 0);
  westGlow.addColorStop(0, 'rgba(255, 176, 108, 0.055)');
  westGlow.addColorStop(0.55, 'rgba(255, 162, 98, 0.018)');
  westGlow.addColorStop(1, 'rgba(255, 150, 90, 0)');
  ctx.fillStyle = westGlow;
  ctx.fillRect(camX, camY, vw * 0.6, vh);

  const drawCrest = (
    cx: number,
    cy: number,
    len: number,
    deep: boolean,
    foam: boolean,
    step: number
  ) => {
    const shadow = deep ? '#03121f' : '#04182a';
    const body = charge > 0.4 ? (deep ? '#134e70' : '#1b6b92') : deep ? '#0f4058' : '#195f86';
    const crest = charge > 0.4 ? (deep ? '#4cb6b2' : '#63d4ce') : deep ? '#3d9a9c' : '#4fbdbd';
    const split = Math.max(4, Math.floor(len * 0.56));
    const right = len - split;
    const cy2 = cy + step;
    // Sombra escalonada: la cresta se quiebra en dos tramos, no es un guion.
    ctx.fillStyle = shadow;
    ctx.fillRect(cx, cy + 2, split + 1, 2);
    ctx.fillRect(cx + split, cy2 + 2, right, 2);
    ctx.fillRect(cx + 3, cy + 4, Math.max(2, split - 5), 1);
    ctx.fillStyle = body;
    ctx.fillRect(cx, cy, split, 2);
    ctx.fillRect(cx + split, cy2, right, 2);
    ctx.fillStyle = crest;
    ctx.fillRect(cx + 2, cy, Math.max(2, split - 3), 1);
    ctx.fillRect(cx + split + 1, cy2, Math.max(2, right - 2), 1);
    if (foam) {
      ctx.fillStyle = 'rgba(223, 247, 238, 0.85)';
      ctx.fillRect(cx + split + 1, cy2 - 1, 2, 1);
    }
  };

  // Oleaje orgánico: crestas largas y quebradas, sin retícula de celdas.
  const rowH = 15;
  const row0 = Math.floor(camY / rowH) * rowH - rowH;
  for (let wy = row0; wy < camY + vh + rowH; wy += rowH) {
    const row = Math.floor(wy / rowH);
    const phase = hash2(row, 7) * 6.283;
    const drift = reducedMotion
      ? 0
      : (elapsed * (5 + (row % 3) * 2) + animFrame4 * 2.4) % 38;
    const deep = wy > camY + vh * 0.48;
    let wx = camX - 48 + Math.floor(hash2(row, 13) * 70) - drift;
    while (wx < camX + vw + 46) {
      const th = hash2(Math.floor(wx / 9) + row * 31, row);
      if (th > 0.12) {
        const len = 18 + Math.floor(th * 46);
        const lift = Math.round(
          Math.sin(wx * 0.021 + row * 1.37 + (reducedMotion ? 0 : elapsed * 0.8)) * 2
        );
        drawCrest(wx, wy + lift, len, deep, th > 0.82, th > 0.5 ? 1 : -1);
        // Eco de cresta: una segunda línea corta por encima rompe la lectura
        // de "guiones" repetidos y da grosor al agua.
        if (th > 0.56) {
          ctx.fillStyle = deep ? 'rgba(42, 118, 140, 0.55)' : 'rgba(44, 128, 154, 0.55)';
          ctx.fillRect(wx + 6, wy + lift - 3, Math.max(4, len - 14), 1);
          ctx.fillStyle = 'rgba(132, 214, 208, 0.32)';
          ctx.fillRect(wx + 9, wy + lift - 4, Math.max(3, len - 22), 1);
        }
      }
      wx += 24 + Math.floor(hash2(wx + 9, wy + 5) * 34);
    }
  }

  // Swell profundo: líneas largas y tenues que atraviesan el mar abierto.
  for (let wy = row0 + 7; wy < camY + vh + rowH; wy += rowH * 2) {
    const row = Math.floor(wy / rowH);
    let wx = camX - 30 + Math.floor(hash2(row, 41) * 80) - (reducedMotion ? 0 : (elapsed * 3) % 60);
    while (wx < camX + vw + 30) {
      const len = 46 + Math.floor(hash2(wx, wy) * 90);
      ctx.fillStyle = 'rgba(28, 92, 120, 0.34)';
      ctx.fillRect(wx, wy, len, 1);
      ctx.fillStyle = 'rgba(86, 178, 176, 0.22)';
      ctx.fillRect(wx + 5, wy - 1, Math.max(6, len * 0.45), 1);
      wx += len + 20 + Math.floor(hash2(wx + 3, wy - 7) * 46);
    }
  }

  // Chop fino: micro-ondas que rellenan los huecos entre crestas y evitan
  // que el mar abierto se lea como una superficie vacía.
  const chopW = 14;
  const chopH = 9;
  for (let wy = Math.floor(camY / chopH) * chopH; wy < camY + vh + chopH; wy += chopH) {
    for (let wx = Math.floor(camX / chopW) * chopW; wx < camX + vw + chopW; wx += chopW) {
      const th = hash2(wx * 0.7 + 3, wy);
      if (th < 0.58) continue;
      const drift = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 0.9 + th * 12));
      const oy = Math.round(hash2(wx + 17, wy - 5) * 5) - 2;
      const deep = wy > camY + vh * 0.5;
      ctx.fillStyle = deep ? 'rgba(30, 92, 112, 0.3)' : 'rgba(46, 124, 148, 0.32)';
      ctx.fillRect(wx + drift, wy + oy, 2 + Math.floor(th * 5), 1);
      if (th > 0.88) {
        ctx.fillStyle = 'rgba(126, 206, 202, 0.22)';
        ctx.fillRect(wx + drift + 1, wy + oy - 1, 1, 1);
      }
    }
  }

  // Destellos de corriente y reflejo dorado del sol poniente al oeste.
  const sparkGrid = 18;
  const gx0 = Math.floor(camX / sparkGrid) * sparkGrid;
  const gy0 = Math.floor(camY / sparkGrid) * sparkGrid;
  for (let wy = gy0; wy < camY + vh + sparkGrid; wy += sparkGrid) {
    for (let wx = gx0; wx < camX + vw + sparkGrid; wx += sparkGrid) {
      const th = hash2(wx + 61, wy - 37);
      if (th < 0.76) continue;
      const tw = Math.sin(elapsed * 1.5 + th * 31 + wx * 0.01 + wy * 0.013);
      if (tw < 0.25) continue;
      const len = 2 + Math.floor(th * 4);
      if (wx < 820) {
        ctx.fillStyle = `rgba(247, 214, 142, ${(0.18 + tw * 0.3).toFixed(3)})`;
        ctx.fillRect(wx, wy, len + 2, 1);
        if (tw > 0.8) {
          ctx.fillStyle = 'rgba(255, 246, 216, 0.75)';
          ctx.fillRect(wx + 1, wy - 1, 2, 1);
        }
      } else {
        ctx.fillStyle = `rgba(150, 226, 220, ${(0.12 + tw * 0.22).toFixed(3)})`;
        ctx.fillRect(wx, wy, len, 1);
      }
    }
  }

  // Reflejo del sol bajo: una lengua cálida y rota sobre el agua del oeste.
  // Se dibuja en coordenadas de mundo, así que acompaña al jugador; la capa
  // de tierra y bajío se pinta después y recorta el brillo contra la costa.
  const reflX = 120;
  const reflY = 420;
  if (reflX + 620 > camX && reflY + 220 > camY && reflY - 220 < camY + vh) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const reflPulse = reducedMotion ? 0.82 : 0.74 + Math.sin(elapsed * 0.65) * 0.18;

    // Banda ancha de agua iluminada bajo el reflejo.
    const band = ctx.createLinearGradient(0, reflY - 100, 0, reflY + 100);
    band.addColorStop(0, 'rgba(255, 190, 120, 0)');
    band.addColorStop(0.5, `rgba(255, 196, 128, ${(0.07 * reflPulse).toFixed(3)})`);
    band.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.fillStyle = band;
    ctx.fillRect(reflX - 40, reflY - 100, 660, 200);

    // Trazos horizontales de distinta longitud: el reflejo se quiebra con la
    // marea en vez de leerse como una columna plana.
    for (let row = -4; row <= 4; row++) {
      const ry = Math.round(
        reflY + row * 12 + (reducedMotion ? 0 : Math.sin(row * 1.7 + elapsed * 0.4) * 3)
      );
      const lead = hash2(row * 31 + 7, 91);
      const strokes = 2 + (Math.abs(row) < 2 ? 1 : 0);
      for (let i = 0; i < strokes; i++) {
        const h = hash2(row * 17 + i * 7, 53);
        const len = Math.round((30 - Math.abs(row) * 3) * (0.55 + h * 0.9));
        const drift = reducedMotion ? 0 : (elapsed * (5 + h * 6) + i * 67 + row * 23) % 230;
        const rx = reflX - 26 + lead * 80 + i * 90 + drift;
        const a = (0.13 + (1 - Math.abs(row) / 6) * 0.2) * reflPulse;
        ctx.fillStyle = `rgba(255, 232, 180, ${a.toFixed(3)})`;
        ctx.fillRect(Math.round(rx), ry, len, 1);
        if (h > 0.58) {
          ctx.fillStyle = `rgba(255, 248, 224, ${Math.min(1, a * 2.1).toFixed(3)})`;
          ctx.fillRect(Math.round(rx + len * 0.36), ry - 1, 2, 1);
        }
      }
    }
    ctx.restore();
  }

  // Remolinos y espuma suelta, sólo donde la corriente se cruza.
  for (let wy = row0 + 3; wy < camY + vh + rowH; wy += rowH * 3) {
    const row = Math.floor(wy / rowH);
    for (let wx = camX - 20 + Math.floor(hash2(row, 23) * 60); wx < camX + vw; wx += 90) {
      const th = hash2(wx, wy + 11);
      if (th < 0.72) continue;
      ctx.fillStyle = 'rgba(120, 208, 200, 0.35)';
      ctx.fillRect(wx, wy, 3, 1);
      ctx.fillRect(wx + 4, wy + 1, 2, 1);
      ctx.fillStyle = 'rgba(223, 247, 238, 0.5)';
      ctx.fillRect(wx + 1, wy - 1, 1, 1);
    }
  }
}

/* ------------------------------------------------------------------ */
/* TIERRA: bajío, arena húmeda, superficies y espuma                   */
/* ------------------------------------------------------------------ */

function drawLandmass(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number
): void {
  const layer = ensureCoastLayer();

  if (layer) {
    const sx = Math.max(0, Math.round(camX) + GROUND_PAD - 6);
    const sy = Math.max(0, Math.round(camY) + GROUND_PAD - 6);
    const sw = Math.min(layer.width - sx, Math.ceil(vw) + 12);
    const sh = Math.min(layer.height - sy, Math.ceil(vh) + 12);
    if (sw > 0 && sh > 0) {
      ctx.drawImage(layer, sx, sy, sw, sh, sx - GROUND_PAD, sy - GROUND_PAD, sw, sh);
    }
  } else {
    // Respaldo mínimo si el canvas no está disponible.
    ctx.fillStyle = '#e8d3a0';
    for (const r of ISLA_NATAL_WALK_RECTS) {
      if (!isWorldBoxVisible(r.x, r.y, r.w, r.h, camX, camY, vw, vh)) continue;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }

  drawShoreWater(ctx, camX, camY, vw, vh, elapsed);
}

/** Brillo, ondulación y espuma animada sobre la costa prerenderizada. */
function drawShoreWater(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number
): void {
  const field = coastField;
  if (!field) return;

  // Cáusticas del bajío: destellos quietos que respiran con la marea.
  const grid = 14;
  const gx0 = Math.floor(camX / grid) * grid;
  const gy0 = Math.floor(camY / grid) * grid;
  for (let wy = gy0; wy < camY + vh + grid; wy += grid) {
    for (let wx = gx0; wx < camX + vw + grid; wx += grid) {
      const th = hash2(wx + 61, wy - 37);
      if (th < 0.82) continue;
      const d = sampleDistancePx(field, wx + 7, wy + 7);
      if (d < 2 || d > 46) continue;
      const shimmer = Math.sin(elapsed * 2.1 + th * 34 + d * 0.18);
      if (shimmer < 0.15) continue;
      const alpha = 0.1 + (shimmer + 0.5) * 0.2;
      ctx.fillStyle = `rgba(196, 255, 249, ${alpha.toFixed(3)})`;
      const len = 3 + Math.floor(th * 5);
      ctx.fillRect(wx + Math.floor(th * 8), wy + Math.floor(th * 10), len, 1);
    }
  }

  // Rompiente: espuma que sube y baja siguiendo el contorno real de la isla.
  const foam = coastFoam;
  for (let i = 0; i < foam.length; i++) {
    const f = foam[i];
    if (!isWorldBoxVisible(f.x - 14, f.y - 14, 28, 28, camX, camY, vw, vh)) continue;
    const wave = Math.sin(elapsed * (1.5 + f.band * 0.18) + f.phase);
    const tide = wave * (1.3 + f.band * 0.7);
    const x = Math.round(f.x + (f.horiz ? 0 : tide));
    const y = Math.round(f.y + (f.horiz ? tide : 0));

    if (f.band === 0) {
      // Lengua de espuma que lame la arena.
      const a = 0.28 + Math.max(0, wave) * 0.55;
      ctx.fillStyle = `rgba(255, 255, 255, ${a.toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 7, 2);
      else ctx.fillRect(x, y, 2, 6);
      if (f.seed > 0.62) {
        ctx.fillStyle = 'rgba(190, 246, 236, 0.75)';
        if (f.horiz) ctx.fillRect(x + 2, y - 1, 3, 1);
        else ctx.fillRect(x - 1, y + 1, 1, 3);
      }
    } else if (f.band === 1) {
      const a = 0.16 + Math.max(0, wave) * 0.34;
      ctx.fillStyle = `rgba(232, 255, 250, ${a.toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 8, 1);
      else ctx.fillRect(x, y, 1, 7);
    } else if (f.band === 2) {
      const a = 0.08 + Math.max(0, wave) * 0.18;
      ctx.fillStyle = `rgba(190, 240, 236, ${a.toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 5, 1);
      else ctx.fillRect(x, y, 1, 5);
    } else if (wave > 0.5) {
      ctx.fillStyle = `rgba(220, 250, 246, ${(0.05 + wave * 0.1).toFixed(3)})`;
      if (f.horiz) ctx.fillRect(x, y, 4, 1);
      else ctx.fillRect(x, y, 1, 4);
    }
  }

  // Sheen dorado del atardecer sobre el agua que roza la costa oeste: une el
  // reflejo del sol con la rompiente y evita que la orilla quede fría.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < foam.length; i++) {
    const f = foam[i];
    if (f.x > 660) continue;
    const dy = Math.abs(f.y - 420);
    if (dy > 180) continue;
    const flick = 0.55 + Math.sin(elapsed * 1.35 + f.phase) * 0.45;
    const a = (1 - dy / 180) * 0.13 * flick;
    if (a <= 0.004) continue;
    ctx.fillStyle = `rgba(255, 214, 148, ${a.toFixed(3)})`;
    if (f.horiz) ctx.fillRect(Math.round(f.x - 2), Math.round(f.y - 1), 7, 1);
    else ctx.fillRect(Math.round(f.x - 1), Math.round(f.y - 3), 1, 7);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* VEGETACIÓN Y ROCAS                                                 */
/* ------------------------------------------------------------------ */

function drawTuft(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number, sway: number): void {
  const h = 3 + Math.floor(seed * 6);
  const kind = Math.floor(hash2(x, y) * 3);
  ctx.fillStyle = 'rgba(30, 68, 32, 0.35)';
  ctx.fillRect(x - 2, y, 6, 1);

  // Tres variantes de mata: abanico alto, penacho bajo y brote doble. Así el
  // campo no repite la misma silueta por todas partes.
  if (kind === 0) {
    ctx.fillStyle = seed > 0.5 ? '#356f36' : '#3d7c3c';
    ctx.fillRect(x - 3, y - h + 2, 1, h - 1);
    ctx.fillRect(x + 3, y - h + 1, 1, h - 1);
    ctx.fillStyle = seed > 0.5 ? '#5fae4e' : '#4f9a45';
    ctx.fillRect(x - 2, y - h, 1, h);
    ctx.fillRect(x + 2, y - h + 1, 1, h - 1);
    ctx.fillStyle = seed > 0.5 ? '#8ddb74' : '#79c96a';
    ctx.fillRect(x - 1 + sway, y - h, 1, h - 1);
    ctx.fillRect(x + 1 + sway, y - h - 1, 1, h);
    ctx.fillRect(x + sway, y - h + 2, 1, h - 3);
    if (seed > 0.62) {
      ctx.fillStyle = '#b7e88f';
      ctx.fillRect(x + 1 + sway, y - h - 1, 1, 1);
    }
  } else if (kind === 1) {
    // Penacho bajo y tupido, sin punta brillante.
    ctx.fillStyle = '#3d7c3c';
    ctx.fillRect(x - 2, y - h + 1, 5, h - 1);
    ctx.fillStyle = '#589c48';
    ctx.fillRect(x - 1 + sway, y - h, 3, h - 1);
    ctx.fillStyle = '#74c161';
    ctx.fillRect(x + sway, y - h, 1, h - 2);
  } else {
    // Brote doble, más oscuro y discreto.
    ctx.fillStyle = '#356f36';
    ctx.fillRect(x - 2, y - h + 2, 1, h - 2);
    ctx.fillRect(x + 1, y - h + 1, 1, h - 1);
    ctx.fillStyle = '#549e44';
    ctx.fillRect(x - 1 + sway, y - h, 1, h - 1);
    ctx.fillRect(x + 2 + sway, y - h + 1, 1, h - 2);
  }
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  ctx.fillStyle = 'rgba(30, 68, 32, 0.35)';
  ctx.fillRect(x - 1, y, 4, 1);
  ctx.fillStyle = '#3f8a41';
  ctx.fillRect(x, y - 4, 1, 4);
  ctx.fillRect(x + 1, y - 2, 2, 1);
  const petal = seed > 0.8 ? '#f9a8d4' : seed > 0.55 ? '#fde68a' : seed > 0.3 ? '#f8fafc' : '#c4b5fd';
  ctx.fillStyle = petal;
  ctx.fillRect(x - 1, y - 6, 3, 1);
  ctx.fillRect(x - 1, y - 5, 1, 3);
  ctx.fillRect(x + 1, y - 5, 1, 3);
  ctx.fillRect(x, y - 7, 1, 1);
  ctx.fillRect(x, y - 3, 1, 1);
  ctx.fillStyle = seed > 0.5 ? '#fbbf24' : '#f59e0b';
  ctx.fillRect(x, y - 5, 1, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(x - 1, y - 6, 1, 1);
}

function drawPebble(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  const s = 2 + Math.floor(seed * 3);
  const onSand = !isPointOnNatalMeadow(x, y) && !(x < 590 && y < 544);
  if (onSand) {
    // Cuenco de arena hundida y reborde cálido semienterrado
    ctx.fillStyle = 'rgba(104, 72, 36, 0.36)';
    ctx.fillRect(x, y + 1, s + 2, 2);
    ctx.fillStyle = 'rgba(234, 204, 152, 0.55)';
    ctx.fillRect(x - 1, y + 1, s + 2, 1);
  } else {
    ctx.fillStyle = 'rgba(60, 50, 36, 0.28)';
    ctx.fillRect(x, y + 1, s + 1, 1);
  }
  ctx.fillStyle = seed > 0.5 ? '#c2b398' : '#a49680';
  ctx.fillRect(x, y, s, s - 1);
  ctx.fillStyle = 'rgba(255, 246, 224, 0.48)';
  ctx.fillRect(x, y, Math.max(1, s - 1), 1);
  ctx.fillStyle = 'rgba(84, 68, 48, 0.52)';
  ctx.fillRect(x + s - 1, y, 1, s - 1);
}

function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number, seed: number): void {
  // Pequeña depresión cálida y granos de arena apoyados sobre el borde de la concha
  ctx.fillStyle = 'rgba(108, 76, 38, 0.38)';
  ctx.fillRect(x, y + 2, 5, 2);
  ctx.fillStyle = 'rgba(238, 210, 160, 0.58)';
  ctx.fillRect(x - 1, y + 2, 2, 1);
  ctx.fillStyle = seed > 0.5 ? '#f8cde4' : '#fbe4c8';
  ctx.fillRect(x, y, 4, 3);
  ctx.fillRect(x + 1, y - 1, 2, 1);
  ctx.fillStyle = 'rgba(182, 118, 138, 0.72)';
  ctx.fillRect(x + 1, y, 1, 3);
  ctx.fillRect(x + 3, y + 1, 1, 2);
  ctx.fillStyle = 'rgba(255, 250, 238, 0.75)';
  ctx.fillRect(x, y, 2, 1);
  ctx.fillStyle = 'rgba(206, 168, 114, 0.52)';
  ctx.fillRect(x + 3, y + 2, 2, 1);
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const sway = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.6 + seed * 8) * 0.8);
  const w = 26 + Math.floor(seed * 10);
  const half = Math.round(w / 2);

  // Sombra de contacto.
  ctx.fillStyle = 'rgba(18, 44, 22, 0.34)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + 1, half - 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lóbulos redondeados con esquinas achaflanadas: la copa deja de ser una
  // pila de rectángulos y gana volumen de arbusto pintado a mano.
  const blob = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string,
    pad = 0
  ) => {
    const hw = Math.max(2, Math.round(rx + pad));
    const hh = Math.max(2, Math.round(ry + pad));
    ctx.fillStyle = color;
    ctx.fillRect(cx - hw + 2, cy - hh, hw * 2 - 4, hh * 2);
    ctx.fillRect(cx - hw, cy - hh + 2, hw * 2, hh * 2 - 4);
    ctx.fillRect(cx - hw + 1, cy - hh + 1, hw * 2 - 2, hh * 2 - 2);
  };

  const lobes = [
    { cx: x - half * 0.54, cy: y - 8, rx: half * 0.56, ry: 8 },
    { cx: x + half * 0.5, cy: y - 9, rx: half * 0.57, ry: 8 },
    { cx: x - half * 0.2 + sway, cy: y - 17, rx: half * 0.52, ry: 9 },
    { cx: x + half * 0.22 + sway, cy: y - 18, rx: half * 0.5, ry: 8 },
    { cx: x + sway * 0.6, cy: y - 25, rx: half * 0.43, ry: 7 },
  ];

  for (const l of lobes) blob(l.cx, l.cy, l.rx, l.ry, '#123217', 1.4);
  for (const l of lobes) blob(l.cx, l.cy + 1, l.rx, l.ry, '#1e4a24', 0.2);
  for (const l of lobes) blob(l.cx, l.cy, l.rx - 1, l.ry - 1, '#2c642f', 0);
  for (const l of lobes) {
    blob(l.cx - 2, l.cy - 2, l.rx * 0.55, l.ry * 0.52, '#3f8a3f', 0);
    blob(l.cx - 3, l.cy - 3, l.rx * 0.28, l.ry * 0.26, '#69b854', 0);
  }

  // Hojas individuales en el borde: rompen la silueta y dan textura de follaje.
  for (let i = 0; i < 12; i++) {
    const th = hash2(x + i * 13, y - i * 7);
    if (th < 0.32) continue;
    const ang = th * Math.PI * 2;
    const lx = x + sway + Math.round(Math.cos(ang) * (half - 1 + th * 4));
    const ly = y - 14 + Math.round(Math.sin(ang) * (13 + th * 5));
    const lit = Math.cos(ang) < -0.1 && Math.sin(ang) < 0.35;
    ctx.fillStyle = lit ? '#83c962' : th > 0.7 ? '#3f8a3f' : '#1d4723';
    ctx.fillRect(lx, ly, 3, 2);
    if (lit) {
      ctx.fillStyle = '#a9e284';
      ctx.fillRect(lx, ly, 1, 1);
    }
  }

  // Mechones y sombras internas: profundidad dentro de la copa.
  for (let i = 0; i < 6; i++) {
    const th = hash2(x + 19 + i * 7, y - 9 - i * 4);
    const lx = x - half + 4 + Math.round(th * (w - 8));
    const ly = y - 8 - Math.floor(hash2(i + 5, x) * 16);
    ctx.fillStyle = th > 0.55 ? 'rgba(18, 52, 24, 0.55)' : 'rgba(120, 190, 90, 0.5)';
    ctx.fillRect(lx, ly, 3, 2);
    ctx.fillRect(lx + 2, ly - 1, 1, 1);
  }

  // Bayas rojas sobre el follaje (sólo en los arbustos marcados).
  if (seed > 0.5) {
    for (let i = 0; i < 4; i++) {
      const bx = x - half + 6 + Math.round(hash2(x + i, y + 5) * (w - 14));
      const by = y - 8 - Math.floor(hash2(y - i, x + 9) * 12);
      ctx.fillStyle = 'rgba(30, 10, 12, 0.5)';
      ctx.fillRect(bx + 1, by + 1, 3, 3);
      ctx.fillStyle = '#8b1e24';
      ctx.fillRect(bx, by, 3, 3);
      ctx.fillStyle = '#e0524e';
      ctx.fillRect(bx, by, 2, 2);
      ctx.fillStyle = '#ffd9cf';
      ctx.fillRect(bx, by, 1, 1);
    }
  }

  // Pastito de la base.
  ctx.fillStyle = '#2f6d33';
  ctx.fillRect(x - half + 2, y, 5, 2);
  ctx.fillRect(x + half - 7, y + 1, 4, 2);
  ctx.fillStyle = '#7fc460';
  ctx.fillRect(x - half + 3, y - 1, 2, 2);
}

interface NatalMote {
  x: number;
  y: number;
  phase: number;
  speed: number;
  size: number;
}

/** Polen dorado flotando sobre la pradera y la playa. */
const NATAL_MOTES: NatalMote[] = (() => {
  const out: NatalMote[] = [];
  let guard = 0;
  while (out.length < 120 && guard < 4000) {
    guard++;
    const x = 280 + hash2(guard, 13) * 1160;
    const y = 250 + hash2(guard + 421, 29) * 830;
    if (!pointOnLand(x, y)) continue;
    out.push({
      x: Math.round(x),
      y: Math.round(y),
      phase: hash2(guard + 7, 3) * 6.283,
      speed: 0.25 + hash2(guard + 3, 11) * 0.5,
      size: hash2(guard + 5, 17) > 0.78 ? 2 : 1,
    });
  }
  return out;
})();

interface NatalButterfly {
  x: number;
  y: number;
  phase: number;
  color: string;
}

/** Mariposas que rondan las flores silvestres. */
const NATAL_BUTTERFLIES: NatalButterfly[] = ISLA_NATAL_FLOWERS.filter(
  (_, index) => index % 24 === 5
).map((f, i) => ({
  x: f.x,
  y: f.y,
  phase: f.seed * 6.283 + i,
  color: i % 2 === 0 ? '#fde68a' : '#fbcfe8',
}));

function drawAmbientLife(
  ctx: CanvasRenderingContext2D,
  camX: number,
  camY: number,
  vw: number,
  vh: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  for (let i = 0; i < NATAL_MOTES.length; i++) {
    const m = NATAL_MOTES[i];
    if (!isWorldBoxVisible(m.x - 12, m.y - 12, 24, 24, camX, camY, vw, vh)) continue;
    const t = elapsed * m.speed + m.phase;
    const x = Math.round(m.x + Math.sin(t) * 13 + Math.cos(t * 0.6) * 5);
    const y = Math.round(m.y + Math.cos(t * 0.8) * 7 - Math.sin(t * 0.4) * 4);
    const a = 0.18 + (Math.sin(t * 1.7) * 0.5 + 0.5) * 0.4;
    ctx.fillStyle = `rgba(255, 238, 184, ${a.toFixed(3)})`;
    ctx.fillRect(x, y, m.size, m.size);
  }

  if (reducedMotion) return;
  for (let i = 0; i < NATAL_BUTTERFLIES.length; i++) {
    const b = NATAL_BUTTERFLIES[i];
    const t = elapsed * 0.7 + b.phase;
    const x = Math.round(b.x + Math.sin(t) * 26 + Math.sin(t * 0.37) * 9);
    const y = Math.round(b.y - 10 + Math.cos(t * 0.8) * 12);
    if (!isWorldBoxVisible(x - 8, y - 8, 16, 16, camX, camY, vw, vh)) continue;
    const flap = Math.sin(elapsed * 12 + b.phase) > 0 ? 1 : 0;
    ctx.fillStyle = b.color;
    ctx.fillRect(x - 2, y - flap, 2, 2);
    ctx.fillRect(x + 1, y - flap, 2, 2);
    ctx.fillStyle = 'rgba(80, 60, 40, 0.8)';
    ctx.fillRect(x, y, 1, 2);
  }
}


interface NatalPalmBakedSet {
  sunlit: [HTMLCanvasElement, HTMLCanvasElement];
  woodland: [HTMLCanvasElement, HTMLCanvasElement];
}

let natalPalmSprite1: HTMLImageElement | null = null;
let natalPalmSprite2: HTMLImageElement | null = null;
let natalPalmBaked1: NatalPalmBakedSet | null = null;
let natalPalmBaked2: NatalPalmBakedSet | null = null;

function bakeIntegratedPalmCanvas(
  img: HTMLImageElement,
  outW: number,
  outH: number,
  flipX: boolean,
  woodlandShade: boolean
): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !img.complete || img.naturalWidth <= 0) return null;
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const bctx = canvas.getContext('2d');
  if (!bctx) return null;

  bctx.save();
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  if (flipX) {
    bctx.translate(outW, 0);
    bctx.scale(-1, 1);
  }
  bctx.drawImage(img, 0, 0, outW, outH);
  bctx.restore();

  // Baño lumínico de Hora Dorada: sol cálido desde el oeste y penumbra esmeralda al este
  bctx.globalCompositeOperation = 'source-atop';
  const sunGrad = bctx.createLinearGradient(0, outH * 0.08, outW, outH * 0.92);
  if (woodlandShade) {
    sunGrad.addColorStop(0, 'rgba(255, 214, 134, 0.14)');
    sunGrad.addColorStop(0.45, 'rgba(64, 128, 42, 0.08)');
    sunGrad.addColorStop(1, 'rgba(12, 42, 24, 0.28)');
  } else {
    sunGrad.addColorStop(0, 'rgba(255, 224, 146, 0.21)');
    sunGrad.addColorStop(0.48, 'rgba(128, 186, 62, 0.06)');
    sunGrad.addColorStop(1, 'rgba(16, 48, 26, 0.22)');
  }
  bctx.fillStyle = sunGrad;
  bctx.fillRect(0, 0, outW, outH);

  // Luz cálida rebotada desde la arena/pradera en el envés bajo de la copa y oclusión en la raíz
  const baseGrad = bctx.createLinearGradient(0, outH * 0.82, 0, outH);
  baseGrad.addColorStop(0, 'rgba(22, 42, 20, 0)');
  baseGrad.addColorStop(1, 'rgba(18, 36, 16, 0.34)');
  bctx.fillStyle = baseGrad;
  bctx.fillRect(0, outH * 0.82, outW, outH * 0.18);
  bctx.globalCompositeOperation = 'source-over';

  // Limpieza suave de bordes sin escalones blancos: preserva puntas finas de palma y oscurece semitransparencias
  const imgData = bctx.getImageData(0, 0, outW, outH);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 22) {
      d[i + 3] = 0;
      continue;
    }
    if (a < 215) {
      const k = 0.84 + (a / 215) * 0.16;
      d[i] = Math.round(d[i] * k * 0.94);
      d[i + 1] = Math.round(d[i + 1] * k);
      d[i + 2] = Math.round(d[i + 2] * k * 0.88);
      d[i + 3] = Math.min(255, Math.round(Math.pow(a / 255, 0.92) * 255));
    }
  }
  bctx.putImageData(imgData, 0, 0);
  return canvas;
}

function ensureNatalPalmSprites(): [NatalPalmBakedSet | null, NatalPalmBakedSet | null] {
  if (typeof Image === 'undefined') return [null, null];
  if (!natalPalmSprite1) {
    natalPalmSprite1 = new Image();
    natalPalmSprite1.decoding = 'async';
    natalPalmSprite1.src = '/assets/pixelverse/natal-palm-1.png';
  }
  if (!natalPalmSprite2) {
    natalPalmSprite2 = new Image();
    natalPalmSprite2.decoding = 'async';
    natalPalmSprite2.src = '/assets/pixelverse/natal-palm-2.png';
  }
  if (!natalPalmBaked1 && natalPalmSprite1.complete && natalPalmSprite1.naturalWidth > 0) {
    const s0 = bakeIntegratedPalmCanvas(natalPalmSprite1, 184, 188, false, false);
    const s1 = bakeIntegratedPalmCanvas(natalPalmSprite1, 184, 188, true, false);
    const w0 = bakeIntegratedPalmCanvas(natalPalmSprite1, 184, 188, false, true);
    const w1 = bakeIntegratedPalmCanvas(natalPalmSprite1, 184, 188, true, true);
    if (s0 && s1 && w0 && w1) {
      natalPalmBaked1 = { sunlit: [s0, s1], woodland: [w0, w1] };
    }
  }
  if (!natalPalmBaked2 && natalPalmSprite2.complete && natalPalmSprite2.naturalWidth > 0) {
    const s0 = bakeIntegratedPalmCanvas(natalPalmSprite2, 164, 212, false, false);
    const s1 = bakeIntegratedPalmCanvas(natalPalmSprite2, 164, 212, true, false);
    const w0 = bakeIntegratedPalmCanvas(natalPalmSprite2, 164, 212, false, true);
    const w1 = bakeIntegratedPalmCanvas(natalPalmSprite2, 164, 212, true, true);
    if (s0 && s1 && w0 && w1) {
      natalPalmBaked2 = { sunlit: [s0, s1], woodland: [w0, w1] };
    }
  }
  return [natalPalmBaked1, natalPalmBaked2];
}

function drawPalm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const baseX = Math.round(x);
  const baseY = Math.round(y);
  const [palmSingleSet, palmTwinSet] = ensureNatalPalmSprites();
  const useTwinVariant = seed >= 0.48;
  const set = useTwinVariant ? palmTwinSet : palmSingleSet;
  const flipped = hash2(baseX + 31, baseY - 19) > 0.5;

  const land = isIslaNatalPointOnLand(baseX, baseY);
  const onMeadow = isPointOnNatalMeadow(baseX, baseY);
  const onSand = !onMeadow && land?.surface !== 'path';
  const nearBeach = onSand || !isPointOnNatalMeadow(baseX, baseY + 20);
  const onPath = land?.surface === 'path';
  const inArboleda = land?.zone === 'arboleda-arcade' || baseX > 1080;

  const pair = set ? (inArboleda ? set.woodland : set.sunlit) : null;
  const sprite = pair ? pair[flipped ? 1 : 0] : null;

  const scale = 0.90 + seed * 0.16;
  const drawW = Math.round((useTwinVariant ? 80 : 90) * scale);
  const drawH = Math.round((useTwinVariant ? 104 : 92) * scale);
  const naturalLean = (hash2(baseX - 13, baseY + 29) - 0.46) * 0.055;
  const breeze = reducedMotion
    ? 0
    : Math.sin(elapsed * 1.06 + seed * 9 + baseX * 0.018) * 0.02 +
      Math.sin(elapsed * 2.15 + seed * 15) * 0.005;
  const totalShear = naturalLean + breeze;
  const shadowShift = Math.round(-totalShear * 52);

  ctx.save();
  ctx.translate(baseX, baseY);

  // 1. Sombra proyectada de tronco + abanico de hojas hacia el este-sureste (hora dorada)
  const shadowColor = onSand
    ? 'rgba(88, 62, 28, 0.20)'
    : onPath
      ? 'rgba(54, 36, 18, 0.21)'
      : 'rgba(12, 36, 18, 0.21)';
  ctx.fillStyle = shadowColor;
  // Sombra alargada del tronco en el suelo
  ctx.beginPath();
  ctx.moveTo(-3, 2);
  ctx.lineTo(3, 0);
  ctx.lineTo(24 + shadowShift, 5);
  ctx.lineTo(18 + shadowShift, 8);
  ctx.closePath();
  ctx.fill();

  // Silueta lobulada de las palmas proyectada sobre el césped/arena
  const crownShadowX = 27 + shadowShift;
  const crownShadowY = 6;
  const frondAngles = [-2.5, -1.55, -0.65, 0.25, 1.15, 2.15];
  for (let fi = 0; fi < frondAngles.length; fi++) {
    const ang = frondAngles[fi] + seed * 0.8 + breeze * 2.4;
    const fx = crownShadowX + Math.cos(ang) * (drawW * 0.16);
    const fy = crownShadowY + Math.sin(ang) * 5.2;
    ctx.beginPath();
    ctx.ellipse(fx, fy, drawW * 0.17, 4.2, ang * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Lecho de raíces y oclusión ambiental de contacto con la isla
  ctx.fillStyle = onSand
    ? 'rgba(84, 58, 26, 0.30)'
    : onPath
      ? 'rgba(58, 38, 18, 0.32)'
      : 'rgba(14, 38, 16, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 3, useTwinVariant ? 18 : 11, 4.8, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!onSand && !onPath) {
    // Pequeño mantillo húmedo y trébol bajo la base para fundirse con el césped
    ctx.fillStyle = 'rgba(48, 34, 20, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 3, useTwinVariant ? 13 : 8, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3. Dibujo de la palmera con suavizado de alta calidad para conservar el detalle de las hojas
  if (sprite) {
    ctx.save();
    ctx.translate(0, 4);
    ctx.transform(1, 0, totalShear, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sprite, -drawW * 0.5, -drawH * 0.965, drawW, drawH);
    ctx.restore();
  } else {
    ctx.fillStyle = '#6e4a29';
    ctx.fillRect(-3, -52, 6, 54);
    ctx.fillStyle = '#2e7226';
    ctx.beginPath();
    ctx.ellipse(0, -54, 24, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Integración frontal al pie según el terreno real (arena costera, sendero o pradera)
  if (nearBeach) {
    // Pequeño montículo de arena removida y rizada abrazando la raíz de la palmera
    ctx.fillStyle = 'rgba(186, 148, 96, 0.58)';
    ctx.beginPath();
    ctx.ellipse(0, 4, useTwinVariant ? 17 : 11, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(222, 188, 134, 0.72)';
    ctx.fillRect(-10, 3, 8, 2);
    ctx.fillRect(3, 3, 8, 2);
    ctx.fillStyle = 'rgba(246, 224, 178, 0.55)';
    ctx.fillRect(-8, 2, 5, 1);
    ctx.fillRect(4, 3, 4, 1);
  }
  if (onPath) {
    ctx.fillStyle = 'rgba(166, 130, 82, 0.62)';
    ctx.fillRect(-10, 3, 8, 2);
    ctx.fillRect(3, 3, 8, 2);
  }
  if (!onSand) {
    const sway = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.45 + seed * 6) * 0.7);
    const offsets = useTwinVariant ? [-15, -9, -3, 3, 9, 15] : [-8, -4, 0, 4, 8];
    for (let i = 0; i < offsets.length; i++) {
      const gx = offsets[i] + Math.round((hash2(baseX + i * 7, baseY - i * 5) - 0.5) * 2);
      const gh = 3 + ((i + Math.floor(seed * 10)) % 3);
      ctx.fillStyle = i % 2 === 0 ? '#24571c' : '#387624';
      ctx.fillRect(gx - 1, 5 - gh, 2, gh);
      ctx.fillStyle = i % 3 === 0 ? '#8ad04e' : '#64ab35';
      ctx.fillRect(gx + sway, 4 - gh, 1, gh - 1);
    }
  }

  // Coco caído ocasional al pie para dar vida natural a la isla
  if (seed > 0.36) {
    const cx = useTwinVariant ? (flipped ? -13 : 12) : flipped ? -8 : 7;
    ctx.fillStyle = onSand ? 'rgba(96, 66, 32, 0.42)' : 'rgba(20, 36, 18, 0.35)';
    ctx.fillRect(cx, 5, 5, 2);
    ctx.fillStyle = '#6e431f';
    ctx.fillRect(cx, 3, 4, 3);
    ctx.fillStyle = '#b67837';
    ctx.fillRect(cx, 3, 2, 2);
    if (onSand) {
      ctx.fillStyle = 'rgba(226, 194, 142, 0.62)';
      ctx.fillRect(cx - 1, 5, 3, 1);
    }
  }

  ctx.restore();
}

function drawBoulder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  seed: number
): void {
  const w = 16 + Math.floor(seed * 14);
  const h = 11 + Math.floor(seed * 10);
  const left = Math.round(x - w / 2);
  const top = Math.round(y - h);
  const onSand = !isPointOnNatalMeadow(x, y) && !(x < 590 && y < 544);

  // Sombra de contacto adaptada al terreno (ocre cálida sobre arena, verde húmeda sobre hierba)
  ctx.fillStyle = onSand ? 'rgba(92, 64, 30, 0.32)' : 'rgba(24, 40, 26, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 2, w * 0.62, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Silueta facetada por filas: luz del oeste, base en sombra.
  for (let i = 0; i < h; i++) {
    const t = i / Math.max(1, h - 1);
    const inset = Math.round(Math.pow(Math.abs(t - 0.42) * 1.5, 1.7) * (w * 0.24));
    const rowW = Math.max(3, w - inset * 2);
    const rx = left + inset;
    const ry = top + i;
    ctx.fillStyle = t < 0.32 ? '#8d8779' : t < 0.72 ? '#797366' : '#6a6559';
    ctx.fillRect(rx, ry, rowW, 1);
    if (i === 0) {
      ctx.fillStyle = 'rgba(255, 244, 220, 0.4)';
      ctx.fillRect(rx + 1, ry, rowW - 2, 1);
    }
  }

  // Faceta iluminada superior izquierda y cara este en sombra.
  ctx.fillStyle = 'rgba(255, 244, 220, 0.28)';
  ctx.fillRect(left + Math.round(w * 0.16), top + 1, Math.round(w * 0.32), 2);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.16)';
  ctx.fillRect(left + Math.round(w * 0.1), top + 3, Math.round(w * 0.2), 1);
  ctx.fillStyle = 'rgba(38, 36, 32, 0.45)';
  ctx.fillRect(left + Math.round(w * 0.66), top + Math.round(h * 0.32), Math.round(w * 0.24), Math.round(h * 0.58));

  // Grietas y vetas.
  ctx.fillStyle = 'rgba(48, 45, 40, 0.6)';
  ctx.fillRect(left + Math.round(w * 0.34), top + 3, 1, Math.max(3, h - 5));
  if (seed > 0.45) {
    ctx.fillRect(left + Math.round(w * 0.52), top + Math.round(h * 0.4), Math.round(w * 0.2), 1);
    ctx.fillRect(left + Math.round(w * 0.56), top + Math.round(h * 0.4), 1, 3);
  }

  // Musgo y liquen en la cara superior.
  if (seed > 0.35) {
    ctx.fillStyle = '#5f9a52';
    ctx.fillRect(left + Math.round(w * 0.18), top, Math.floor(w * 0.44), 3);
    ctx.fillStyle = '#7bb967';
    ctx.fillRect(left + Math.round(w * 0.24), top, Math.floor(w * 0.2), 1);
    ctx.fillStyle = 'rgba(196, 214, 168, 0.55)';
    ctx.fillRect(left + Math.round(w * 0.52), top + 1, 2, 1);
  }

  // Pedruscos y arena acumulada al pie.
  ctx.fillStyle = '#6f6a5e';
  ctx.fillRect(left + Math.round(w * 0.08), y - 1, 3, 2);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.35)';
  ctx.fillRect(left + Math.round(w * 0.08), y - 1, 2, 1);
  if (onSand) {
    ctx.fillStyle = 'rgba(218, 184, 130, 0.72)';
    ctx.fillRect(left + 2, y - 1, Math.round(w * 0.42), 2);
    ctx.fillRect(left + Math.round(w * 0.56), y, Math.round(w * 0.32), 2);
    ctx.fillStyle = 'rgba(244, 220, 174, 0.50)';
    ctx.fillRect(left + 3, y - 1, Math.round(w * 0.28), 1);
  }
}

/** Grandes peñascos que dan cuerpo a los bloqueos de la meseta y de la costa. */
function drawRockOutcrop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  const left = Math.round(x);
  const top = Math.round(y);
  const onSand = !isPointOnNatalMeadow(left + w * 0.5, top + h) && !(left < 590 && top < 544);

  ctx.fillStyle = onSand ? 'rgba(92, 64, 30, 0.30)' : 'rgba(24, 40, 26, 0.26)';
  ctx.beginPath();
  ctx.ellipse(left + w * 0.55, top + h + 2, w * 0.55, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cuerpo en dos bloques superpuestos, con silueta redondeada por filas.
  const blocks: [number, number, number, number, number][] = [
    [0, 0.24, 1, 1, 0],
    [0.16, 0.06, 0.78, 0.62, 1],
  ];
  for (let b = 0; b < blocks.length; b++) {
    const [bx, by, bw, bh] = blocks[b];
    const bwPx = w * bw;
    const bhPx = h * bh;
    const bxPx = left + w * bx;
    const byPx = top + h * by;
    for (let i = 0; i < bhPx; i++) {
      const t = i / Math.max(1, bhPx - 1);
      const inset = Math.round(Math.pow(Math.abs(t - 0.5) * 1.45, 1.8) * (bwPx * 0.16));
      const rowW = Math.max(3, bwPx - inset * 2);
      const tone =
        t < 0.26 ? '#9a9384' : t < 0.6 ? '#857f71' : t < 0.85 ? '#726c60' : '#625d52';
      ctx.fillStyle = tone;
      ctx.fillRect(bxPx + inset, byPx + i, rowW, 1);
      if (i === 0) {
        ctx.fillStyle = 'rgba(255, 244, 220, 0.32)';
        ctx.fillRect(bxPx + inset + 2, byPx + i, Math.max(2, rowW - 5), 1);
      }
    }
    if (b === 1) {
      ctx.fillStyle = 'rgba(255, 244, 220, 0.2)';
      ctx.fillRect(bxPx + bwPx * 0.18, byPx + 3, bwPx * 0.3, 2);
    }
  }

  // Estratos, grietas y musgo.
  ctx.fillStyle = 'rgba(62, 58, 50, 0.5)';
  ctx.fillRect(left + 4, top + h * 0.55, w - 8, 2);
  ctx.fillRect(left + w * 0.24, top + h * 0.72, w * 0.44, 1);
  ctx.fillStyle = 'rgba(42, 39, 34, 0.55)';
  ctx.fillRect(left + w * 0.36, top + 4, 1, h * 0.42);
  ctx.fillRect(left + w * 0.37, top + h * 0.42, w * 0.16, 1);
  if (seed > 0.28) {
    ctx.fillStyle = '#5f9a52';
    ctx.fillRect(left + w * 0.14, top, w * 0.38, 3);
    ctx.fillStyle = '#86bd6e';
    ctx.fillRect(left + w * 0.22, top, w * 0.16, 1);
    ctx.fillStyle = '#4c7f44';
    ctx.fillRect(left + w * 0.15, top + 3, w * 0.2, 1);
  }
  ctx.fillStyle = 'rgba(196, 214, 168, 0.5)';
  ctx.fillRect(left + w * 0.62, top + h * 0.18, 2, 1);
  ctx.fillRect(left + w * 0.7, top + h * 0.28, 1, 1);

  // Esquirlas y duna adherida al pie en peñascos playeros.
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(left + 3, top + h - 1, 4, 2);
  ctx.fillRect(left + w - 8, top + h - 2, 3, 2);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.32)';
  ctx.fillRect(left + 3, top + h - 1, 3, 1);
  if (onSand) {
    ctx.fillStyle = 'rgba(216, 182, 128, 0.74)';
    ctx.fillRect(left + 4, top + h - 2, Math.round(w * 0.46), 3);
    ctx.fillRect(left + Math.round(w * 0.54), top + h - 1, Math.round(w * 0.36), 2);
    ctx.fillStyle = 'rgba(244, 220, 174, 0.52)';
    ctx.fillRect(left + 6, top + h - 2, Math.round(w * 0.30), 1);
  }
}

/** Tronco caído del claro: corteza, anillos y musgo húmedo. */
function drawFallenLog(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  const left = Math.round(x);
  const top = Math.round(y);
  const logH = Math.max(12, h - 6);

  ctx.fillStyle = 'rgba(24, 40, 26, 0.3)';
  ctx.beginPath();
  ctx.ellipse(left + w * 0.5, top + h + 1, w * 0.5, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sombra bajo el tronco.
  ctx.fillStyle = '#3e2816';
  ctx.fillRect(left, top + logH - 4, w, 5);

  // Cuerpo del tronco con vetas.
  ctx.fillStyle = '#6b4626';
  ctx.fillRect(left, top, w, logH);
  ctx.fillStyle = '#825833';
  ctx.fillRect(left, top + 1, w, logH - 6);
  ctx.fillStyle = '#9c6b3d';
  ctx.fillRect(left, top + 2, w, 3);
  ctx.fillStyle = 'rgba(255, 220, 170, 0.28)';
  ctx.fillRect(left + 2, top + 1, w - 6, 1);
  for (let px = left + 8; px < left + w - 6; px += 13) {
    const th = hash2(px + 3, top + seed * 100);
    ctx.fillStyle = 'rgba(74, 48, 26, 0.55)';
    ctx.fillRect(px, top + 3, 1 + Math.floor(th * 3), logH - 8);
    ctx.fillStyle = 'rgba(196, 142, 90, 0.4)';
    ctx.fillRect(px + 2, top + 5, 4 + Math.floor(th * 5), 1);
  }

  // Anillos del corte en el extremo oeste.
  ctx.fillStyle = '#c89a63';
  ctx.fillRect(left - 2, top + 2, 5, logH - 6);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(left - 1, top + 4, 1, logH - 10);
  ctx.fillStyle = '#6b4626';
  ctx.fillRect(left - 2, top + 2, 1, logH - 6);

  // Musgo sobre la corteza.
  ctx.fillStyle = '#5f9a52';
  ctx.fillRect(left + 6, top + 1, Math.floor(w * 0.22), 3);
  ctx.fillRect(left + w * 0.62, top + 2, Math.floor(w * 0.18), 2);
  ctx.fillStyle = '#86bd6e';
  ctx.fillRect(left + 8, top + 1, Math.floor(w * 0.1), 1);

  // Hongos y hojas al pie.
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(left + w * 0.28, top + logH - 1, 2, 3);
  ctx.fillStyle = '#d97706';
  ctx.fillRect(left + w * 0.28 - 1, top + logH - 2, 4, 2);
}

/* ------------------------------------------------------------------ */
/* CONSTRUCCIONES                                                     */
/* ------------------------------------------------------------------ */

function drawHut(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const { x, y } = HUT_POS;
  const s = ISLA_NATAL_SOLIDS.find((v) => v.id === 'cabana');
  const w = s ? s.w : 112;
  const h = s ? s.h : 94;

  // Sombra proyectada hacia el este.
  ctx.fillStyle = 'rgba(24, 44, 28, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.62, y + h - 3, w * 0.78, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(16, 34, 20, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.4, y + h - 1, w * 0.5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cimiento de piedra.
  ctx.fillStyle = '#5c564c';
  ctx.fillRect(x - 2, y + h - 8, w + 4, 9);
  ctx.fillStyle = '#8d8779';
  for (let sx = x; sx < x + w; sx += 14) {
    const th = hash2(sx, y + h);
    ctx.fillStyle = th > 0.5 ? '#8d8779' : '#797366';
    ctx.fillRect(sx + 1, y + h - 7, 12, 6);
    ctx.fillStyle = 'rgba(255, 244, 220, 0.25)';
    ctx.fillRect(sx + 1, y + h - 7, 10, 1);
  }
  ctx.fillStyle = 'rgba(36, 40, 30, 0.45)';
  ctx.fillRect(x - 2, y + h + 1, w + 4, 2);

  // Muros de mampostería con entramado de troncos.
  ctx.fillStyle = '#6b482c';
  ctx.fillRect(x, y + 26, w, h - 26);
  ctx.fillStyle = '#b7a88c';
  ctx.fillRect(x + 3, y + 28, w - 6, h - 32);
  for (let py = y + 30, row = 0; py < y + h - 8; py += 8, row++) {
    const odd = row % 2;
    for (let px = x + 4 + (odd ? -6 : 0); px < x + w - 6; px += 14) {
      const th = hash2(px + 3, py - 7);
      ctx.fillStyle = th > 0.66 ? '#c4b49a' : th > 0.33 ? '#a89880' : '#8e8270';
      ctx.fillRect(px, py, 12, 6);
      ctx.fillStyle = 'rgba(255, 244, 220, 0.22)';
      ctx.fillRect(px, py, 10, 1);
      ctx.fillStyle = 'rgba(40, 32, 22, 0.3)';
      ctx.fillRect(px, py + 5, 12, 1);
    }
  }

  // Esquineros y vigas verticales.
  ctx.fillStyle = '#4f3521';
  ctx.fillRect(x, y + 26, 5, h - 26);
  ctx.fillRect(x + w - 5, y + 26, 5, h - 26);
  ctx.fillStyle = '#9a6f45';
  ctx.fillRect(x + 1, y + 26, 1, h - 26);
  ctx.fillRect(x + w - 5, y + 26, 1, h - 26);
  ctx.fillStyle = 'rgba(52, 33, 19, 0.4)';
  for (let py = y + 34; py < y + h - 10; py += 14) {
    ctx.fillRect(x + 1, py, 2, 4);
    ctx.fillRect(x + w - 3, py + 5, 2, 4);
  }

  // Ventana del este con postigos y luz cálida.
  const winX = x + w - 24;
  const winY = y + 42;
  ctx.fillStyle = '#3b2717';
  ctx.fillRect(winX - 3, winY - 3, 22, 20);
  ctx.fillStyle = '#6b482c';
  ctx.fillRect(winX - 3, winY - 3, 22, 2);
  ctx.fillRect(winX - 3, winY + 14, 22, 2);
  const flicker = reducedMotion ? 0.85 : 0.78 + Math.sin(elapsed * 3.1) * 0.07;
  ctx.fillStyle = `rgba(255, 196, 106, ${flicker.toFixed(2)})`;
  ctx.fillRect(winX, winY, 16, 14);
  ctx.fillStyle = 'rgba(255, 236, 178, 0.55)';
  ctx.fillRect(winX + 1, winY + 1, 6, 4);
  ctx.fillStyle = '#3b2717';
  ctx.fillRect(winX + 7, winY, 2, 14);
  ctx.fillRect(winX, winY + 6, 16, 2);
  // Postigos azules a los lados.
  ctx.fillStyle = '#3f5f6b';
  ctx.fillRect(winX - 8, winY - 1, 5, 16);
  ctx.fillRect(winX + 16, winY - 1, 5, 16);
  ctx.fillStyle = '#4d7180';
  ctx.fillRect(winX - 8, winY - 1, 5, 2);
  ctx.fillRect(winX + 16, winY - 1, 5, 2);
  ctx.fillStyle = 'rgba(20, 34, 40, 0.5)';
  for (let sy = winY + 3; sy < winY + 14; sy += 4) {
    ctx.fillRect(winX - 7, sy, 3, 1);
    ctx.fillRect(winX + 17, sy, 3, 1);
  }
  // Jardinera con flores.
  ctx.fillStyle = '#5d3f28';
  ctx.fillRect(winX - 3, winY + 16, 22, 4);
  ctx.fillStyle = '#8a6242';
  ctx.fillRect(winX - 2, winY + 16, 20, 1);
  const blooms = ['#f9a8d4', '#fde68a', '#f8fafc'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = '#3f8a41';
    ctx.fillRect(winX + 1 + i * 5, winY + 13, 1, 3);
    ctx.fillStyle = blooms[i % 3];
    ctx.fillRect(winX + i * 5, winY + 12, 3, 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(winX + 1 + i * 5, winY + 12, 1, 1);
  }

  // Puerta al este, con umbral y pomo.
  const doorX = x + w - 46;
  const doorY = y + h - 40;
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(doorX - 3, doorY - 3, 30, 43);
  ctx.fillStyle = '#5d3f28';
  ctx.fillRect(doorX, doorY, 24, 40);
  ctx.fillStyle = '#6e4a2d';
  ctx.fillRect(doorX + 2, doorY + 2, 20, 36);
  for (let dy = doorY + 5; dy < doorY + 37; dy += 7) {
    ctx.fillStyle = 'rgba(52, 33, 19, 0.5)';
    ctx.fillRect(doorX + 2, dy, 20, 1);
  }
  ctx.fillStyle = '#8a5f3a';
  ctx.fillRect(doorX + 11, doorY + 2, 1, 36);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(doorX + 18, doorY + 20, 2, 3);
  ctx.fillStyle = 'rgba(255, 236, 160, 0.6)';
  ctx.fillRect(doorX + 18, doorY + 20, 1, 1);
  // Umbral de piedra.
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(doorX - 2, y + h - 2, 28, 3);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.3)';
  ctx.fillRect(doorX - 2, y + h - 2, 26, 1);

  // Farol del porche y su halo suave.
  const lanternX = doorX + 27;
  const lanternY = doorY - 8;
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(lanternX, doorY - 16, 2, 10);
  ctx.fillStyle = '#6b6259';
  ctx.fillRect(lanternX - 3, lanternY - 2, 8, 2);
  ctx.fillStyle = `rgba(255, 198, 108, ${(0.66 + flicker * 0.2).toFixed(2)})`;
  ctx.fillRect(lanternX - 2, lanternY, 6, 6);
  ctx.fillStyle = '#fde9b0';
  ctx.fillRect(lanternX - 1, lanternY + 1, 4, 3);
  ctx.fillStyle = '#4a3120';
  ctx.fillRect(lanternX - 3, lanternY + 6, 8, 2);
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(lanternX + 1, lanternY + 3, 1, lanternX + 1, lanternY + 3, 22);
    gl.addColorStop(0, 'rgba(255, 196, 106, 0.28)');
    gl.addColorStop(1, 'rgba(255, 196, 106, 0)');
    ctx.fillStyle = gl;
    ctx.fillRect(lanternX - 21, lanternY - 18, 44, 44);
    ctx.restore();
  }

  // Techo de paja a dos aguas, con haces y borde deshilachado.
  const roofTop = y - 12;
  const roofBottom = y + 31;
  for (let i = 0; i < roofBottom - roofTop; i += 3) {
    const t = i / (roofBottom - roofTop);
    const halfW = (w / 2 + 2) * (0.56 + 0.44 * t);
    const left = Math.round(x + w / 2 - halfW);
    const width = Math.round(halfW * 2);
    const row = Math.floor(i / 3);
    ctx.fillStyle = row % 2 === 0 ? '#c9a24a' : '#bd9642';
    ctx.fillRect(left, roofTop + i, width, 3);
    ctx.fillStyle = row % 3 === 0 ? 'rgba(255, 226, 154, 0.4)' : 'rgba(150, 116, 54, 0.38)';
    ctx.fillRect(left + 2, roofTop + i, width - 4, 1);
    // Hebras de paja.
    for (let px = left + 3; px < left + width - 3; px += 7) {
      const th = hash2(px, roofTop + i);
      if (th < 0.45) continue;
      ctx.fillStyle = th > 0.72 ? 'rgba(255, 236, 176, 0.5)' : 'rgba(126, 94, 42, 0.5)';
      ctx.fillRect(px, roofTop + i + 1, 2 + Math.floor(th * 4), 1);
    }
  }
  // Pátina del material: paja asoleada junto a la cumbrera y verdín húmedo
  // en el alero oriental, donde la luz del oeste ya no llega.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ridgeGlow = ctx.createLinearGradient(0, roofTop, 0, roofTop + 30);
  ridgeGlow.addColorStop(0, 'rgba(255, 228, 156, 0.15)');
  ridgeGlow.addColorStop(0.55, 'rgba(255, 210, 132, 0.05)');
  ridgeGlow.addColorStop(1, 'rgba(255, 198, 120, 0)');
  ctx.fillStyle = ridgeGlow;
  ctx.fillRect(x + 8, roofTop, w - 16, 30);
  ctx.restore();
  for (let i = 0; i < 9; i++) {
    const th = hash2(i * 19 + x, roofBottom + 7);
    if (th < 0.48) continue;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(96, 128, 70, 0.38)' : 'rgba(74, 106, 58, 0.32)';
    ctx.fillRect(
      x + w * 0.58 + i * 4.4,
      roofBottom - 2 - Math.floor(th * 3),
      3 + Math.floor(th * 3),
      2
    );
  }
  // Hebras sueltas que el viento arrastra desde el alero.
  if (!reducedMotion) {
    for (let i = 0; i < 3; i++) {
      const t = (elapsed * 0.16 + i / 3) % 1;
      const sx = x + w * 0.3 + t * 52 + Math.sin(t * 7 + i * 2.1) * 9;
      const sy = roofBottom - 6 - t * 30 - i * 2;
      ctx.fillStyle = `rgba(244, 218, 156, ${(0.45 * (1 - t)).toFixed(3)})`;
      ctx.fillRect(Math.round(sx), Math.round(sy), 2, 1);
    }
  }

  // Alero y sombra bajo el techo.
  ctx.fillStyle = '#8f6f30';
  ctx.fillRect(x - 10, roofBottom - 2, w + 20, 4);
  ctx.fillStyle = 'rgba(42, 32, 18, 0.45)';
  ctx.fillRect(x - 10, roofBottom + 2, w + 20, 2);
  ctx.fillStyle = 'rgba(255, 236, 180, 0.3)';
  ctx.fillRect(x - 6, roofTop + 2, w * 0.5, 2);
  // Borde deshilachado de la paja.
  for (let px = x - 9; px < x + w + 9; px += 6) {
    const th = hash2(px, roofBottom);
    if (th < 0.4) continue;
    ctx.fillStyle = th > 0.6 ? '#b8913f' : '#a8823a';
    ctx.fillRect(px, roofBottom + 1, 2, 1 + Math.floor(th * 3));
  }
  // Viga cumbrera y ataduras.
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x + w / 2 - w * 0.3, roofTop - 2, w * 0.6, 4);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x + w / 2 - w * 0.28, roofTop - 1, w * 0.56, 1);
  for (let px = x + w * 0.26; px < x + w * 0.76; px += 17) {
    ctx.fillStyle = '#4f3521';
    ctx.fillRect(px, roofTop - 3, 2, 6);
  }

  // Chimenea de piedra y humo lento.
  ctx.fillStyle = '#5c564c';
  ctx.fillRect(x + 24, roofTop - 8, 13, 17);
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(x + 24, roofTop - 8, 13, 3);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.3)';
  ctx.fillRect(x + 25, roofTop - 8, 10, 1);
  ctx.fillStyle = 'rgba(60, 56, 48, 0.5)';
  ctx.fillRect(x + 29, roofTop - 5, 1, 12);
  ctx.fillRect(x + 33, roofTop - 3, 1, 10);
  if (!reducedMotion) {
    for (let i = 0; i < 6; i++) {
      const st = (elapsed * 0.28 + i / 6) % 1;
      const alpha = 0.28 * (1 - st);
      ctx.fillStyle = `rgba(228, 234, 240, ${alpha.toFixed(3)})`;
      const sx = x + 30 + Math.sin(st * 7 + i) * 8;
      const sy = roofTop - 12 - st * 42;
      const size = 2 + Math.round(st * 5);
      ctx.fillRect(Math.round(sx), Math.round(sy), size, size - 1);
    }
  }

  // Pila de leña y macetas junto al muro oeste.
  ctx.fillStyle = '#4f3521';
  ctx.fillRect(x - 14, y + h - 18, 16, 18);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#7d5530';
    ctx.fillRect(x - 13, y + h - 16 + i * 5, 14, 4);
    ctx.fillStyle = '#c89a63';
    ctx.fillRect(x - 13, y + h - 16 + i * 5, 2, 4);
    ctx.fillStyle = 'rgba(60, 38, 22, 0.5)';
    ctx.fillRect(x - 13, y + h - 13 + i * 5, 14, 1);
  }
  ctx.fillStyle = '#9a5a3a';
  ctx.fillRect(x + 10, y + h - 3, 8, 4);
  ctx.fillStyle = '#c97a4a';
  ctx.fillRect(x + 10, y + h - 3, 8, 1);
  ctx.fillStyle = '#5f9a52';
  ctx.fillRect(x + 12, y + h - 4, 3, 1);

  // ---------------------------------------------------------------
  // PORCHE DE ENTRADA: alero, postes, banco y rótulo tallado.
  // ---------------------------------------------------------------
  const porchY = doorY - 22;
  const postLeft = doorX - 16;
  const postRight = doorX + 42;
  // Sombra del porche sobre el muro.
  ctx.fillStyle = 'rgba(36, 20, 10, 0.3)';
  ctx.fillRect(doorX - 8, porchY + 2, 58, 6);
  // Postes torneados.
  for (const px of [postLeft, postRight]) {
    ctx.fillStyle = '#3f2a19';
    ctx.fillRect(px, porchY - 2, 5, doorY - porchY + 22);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(px + 1, porchY - 1, 2, doorY - porchY + 20);
    ctx.fillStyle = '#5c3f26';
    ctx.fillRect(px - 1, porchY - 3, 7, 3);
    ctx.fillRect(px - 1, y + h - 6, 7, 3);
  }
  // Viga del alero y tablillas.
  ctx.fillStyle = '#4f3521';
  ctx.fillRect(postLeft - 4, porchY - 8, postRight - postLeft + 13, 7);
  ctx.fillStyle = '#8f6f30';
  ctx.fillRect(postLeft - 3, porchY - 8, postRight - postLeft + 11, 2);
  for (let px = postLeft - 2; px < postRight + 8; px += 9) {
    ctx.fillStyle = 'rgba(50, 32, 18, 0.45)';
    ctx.fillRect(px, porchY - 6, 1, 4);
  }
  // Alero de paja inclinado.
  ctx.fillStyle = '#c9a24a';
  ctx.beginPath();
  ctx.moveTo(postLeft - 6, porchY - 8);
  ctx.lineTo(postRight + 10, porchY - 8);
  ctx.lineTo(postRight + 4, porchY - 16);
  ctx.lineTo(postLeft - 1, porchY - 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 226, 154, 0.45)';
  ctx.fillRect(postLeft - 1, porchY - 16, postRight - postLeft + 5, 1);
  ctx.fillStyle = 'rgba(126, 94, 42, 0.6)';
  ctx.fillRect(postLeft - 2, porchY - 10, postRight - postLeft + 8, 1);
  for (let px = postLeft - 2; px < postRight + 4; px += 5) {
    const th = hash2(px, porchY);
    if (th < 0.45) continue;
    ctx.fillStyle = th > 0.7 ? '#b8913f' : '#a8823a';
    ctx.fillRect(px, porchY - 8, 1, 1 + Math.floor(th * 2));
  }
  // Rótulo tallado «CASA» colgado bajo el alero.
  const signCx = doorX + 12;
  ctx.fillStyle = '#2f1d0f';
  ctx.fillRect(signCx - 26, porchY - 6, 52, 14);
  ctx.fillStyle = '#a87c45';
  ctx.fillRect(signCx - 25, porchY - 5, 50, 12);
  ctx.fillStyle = '#c69a5c';
  ctx.fillRect(signCx - 24, porchY - 5, 48, 1);
  ctx.fillStyle = '#4a2f18';
  ctx.fillRect(signCx - 22, porchY - 10, 1, 5);
  ctx.fillRect(signCx + 21, porchY - 10, 1, 5);
  ctx.fillStyle = '#2c1a0d';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CASA', signCx, porchY + 4);
  ctx.textAlign = 'left';
  // Banco de madera junto a la ventana.
  const benchX = winX - 16;
  const benchY = y + h - 14;
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(benchX, benchY, 30, 3);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(benchX + 1, benchY - 1, 28, 2);
  ctx.fillRect(benchX + 2, benchY + 2, 2, 8);
  ctx.fillRect(benchX + 26, benchY + 2, 2, 8);
  ctx.fillStyle = 'rgba(50, 32, 18, 0.5)';
  ctx.fillRect(benchX + 4, benchY + 4, 22, 1);
  // Maceta de barro con lavanda sobre el banco.
  ctx.fillStyle = '#9a5a3a';
  ctx.fillRect(benchX + 20, benchY - 7, 7, 6);
  ctx.fillStyle = '#c97a4a';
  ctx.fillRect(benchX + 20, benchY - 7, 7, 1);
  ctx.fillStyle = '#6b8f5a';
  ctx.fillRect(benchX + 21, benchY - 11, 1, 4);
  ctx.fillRect(benchX + 24, benchY - 12, 1, 5);
  ctx.fillStyle = '#a78bd0';
  ctx.fillRect(benchX + 20, benchY - 13, 3, 2);
  ctx.fillRect(benchX + 24, benchY - 13, 3, 2);
  // Solera de umbral de piedra al pie de la puerta, enlazada con la plaza de entrada.
  ctx.fillStyle = 'rgba(34, 24, 14, 0.34)';
  ctx.fillRect(doorX - 2, y + h, 28, 4);
  ctx.fillStyle = '#c49d6c';
  ctx.fillRect(doorX - 1, y + h, 26, 3);
  ctx.fillStyle = 'rgba(255, 242, 214, 0.45)';
  ctx.fillRect(doorX, y + h, 24, 1);
  // Charco de luz cálida que la ventana proyecta en la hierba.
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const spill = ctx.createRadialGradient(winX + 6, y + h + 2, 2, winX + 6, y + h + 2, 26);
    spill.addColorStop(0, `rgba(255, 196, 110, ${(0.14 * flicker).toFixed(2)})`);
    spill.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = spill;
    ctx.fillRect(winX - 20, y + h - 18, 56, 48);
    ctx.restore();
  }
}

function drawShed(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  arcadeState: ArcadeCabinetState,
  reducedMotion: boolean
): void {
  const s = ISLA_NATAL_SOLIDS.find((v) => v.id === 'cobertizo');
  const x = SHED_POS.x;
  const y = SHED_POS.y;
  const w = s ? s.w : 146;
  const h = s ? s.h : 122;
  const lit = arcadeState !== 'dusty';

  ctx.fillStyle = 'rgba(18, 40, 26, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.62, y + h - 1, w * 0.72, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(12, 30, 18, 0.25)';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.35, y + h + 1, w * 0.4, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Interior en sombra con profundidad.
  ctx.fillStyle = '#1d150e';
  ctx.fillRect(x + 6, y + 20, w - 12, h - 22);
  ctx.fillStyle = '#241a12';
  ctx.fillRect(x + 8, y + 22, w - 16, h - 28);
  ctx.fillStyle = 'rgba(10, 12, 10, 0.55)';
  ctx.fillRect(x + 10, y + 26, w - 20, 22);
  ctx.fillStyle = '#3a2a1c';
  ctx.fillRect(x + 14, y + 44, w - 28, 4);

  // Maderos traseros y tablones del fondo.
  ctx.fillStyle = '#4f3a26';
  ctx.fillRect(x + 10, y + 24, 6, h - 30);
  ctx.fillRect(x + w - 16, y + 24, 6, h - 30);
  ctx.fillStyle = 'rgba(104, 76, 48, 0.5)';
  ctx.fillRect(x + 12, y + 30, 2, h - 40);
  ctx.fillRect(x + w - 14, y + 30, 2, h - 40);

  // Postes y tablas del frente.
  ctx.fillStyle = '#6f5136';
  ctx.fillRect(x, y + 16, 9, h - 16);
  ctx.fillRect(x + w - 9, y + 16, 9, h - 16);
  ctx.fillStyle = '#9a7248';
  ctx.fillRect(x + 1, y + 16, 2, h - 16);
  ctx.fillRect(x + w - 8, y + 16, 1, h - 16);
  ctx.fillStyle = 'rgba(52, 36, 22, 0.5)';
  for (let py = y + 24; py < y + h - 8; py += 12) {
    ctx.fillRect(x + 1, py, 7, 1);
    ctx.fillRect(x + w - 8, py, 7, 1);
  }
  ctx.fillStyle = '#5c4229';
  ctx.fillRect(x, y + h - 8, w, 8);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(x, y + h - 8, w, 2);

  // Tejadillo de chapa acanalada, con óxido y tornillos.
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 4 === 0 ? '#3f3225' : i % 3 === 0 ? '#584634' : '#4a3a2a';
    ctx.fillRect(x - 10, y - 4 + i, w + 20, 1);
  }
  for (let px = x - 6; px < x + w + 6; px += 14) {
    ctx.fillStyle = 'rgba(24, 20, 16, 0.4)';
    ctx.fillRect(px, y - 4, 1, 24);
    ctx.fillStyle = 'rgba(196, 160, 110, 0.18)';
    ctx.fillRect(px + 1, y - 4, 2, 2);
    if (hash2(px, y) > 0.7) {
      ctx.fillStyle = 'rgba(154, 88, 52, 0.5)';
      ctx.fillRect(px + 3, y + 3, 2, 14);
    }
  }
  ctx.fillStyle = '#3b2f22';
  ctx.fillRect(x - 12, y + 18, w + 24, 5);
  ctx.fillStyle = 'rgba(255, 232, 190, 0.22)';
  ctx.fillRect(x - 8, y - 2, w * 0.6, 2);
  ctx.fillStyle = 'rgba(20, 26, 16, 0.35)';
  ctx.fillRect(x - 12, y + 23, w + 24, 2);
  // Herrajes y cadenas.
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(x + 20, y + 18, 3, 5);
  ctx.fillRect(x + w - 32, y + 18, 3, 5);

  // Lona medio caída sobre el lateral este.
  ctx.fillStyle = '#3f5f6b';
  ctx.fillRect(x + w - 48, y + 36, 42, 50);
  ctx.fillStyle = '#4d7180';
  ctx.fillRect(x + w - 48, y + 36, 42, 5);
  ctx.fillStyle = 'rgba(20, 34, 40, 0.45)';
  ctx.fillRect(x + w - 30, y + 41, 2, 43);
  ctx.fillRect(x + w - 15, y + 41, 2, 43);
  ctx.fillStyle = 'rgba(126, 168, 178, 0.45)';
  ctx.fillRect(x + w - 44, y + 42, 3, 40);
  ctx.fillStyle = '#2b3e46';
  ctx.fillRect(x + w - 46, y + 80, 3, 3);
  ctx.fillRect(x + w - 12, y + 80, 3, 3);

  // Cajones, taburete y herramientas.
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x + 16, y + 78, 26, 20);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(x + 16, y + 78, 26, 3);
  ctx.fillStyle = 'rgba(52, 33, 19, 0.5)';
  ctx.fillRect(x + 18, y + 86, 22, 2);
  ctx.fillRect(x + 18, y + 93, 22, 2);
  ctx.fillStyle = '#3f2a19';
  ctx.fillRect(x + 20, y + 96, 2, 4);
  ctx.fillRect(x + 36, y + 96, 2, 4);
  // Taburete.
  ctx.fillStyle = '#5d3f28';
  ctx.fillRect(x + 50, y + 90, 14, 4);
  ctx.fillRect(x + 52, y + 94, 2, 10);
  ctx.fillRect(x + 60, y + 94, 2, 10);
  // Herramientas colgadas.
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(x + 48, y + 34, 2, 26);
  ctx.fillRect(x + 45, y + 34, 8, 3);
  ctx.fillStyle = '#9a7248';
  ctx.fillRect(x + 56, y + 34, 2, 18);
  ctx.fillStyle = '#6b6259';
  ctx.fillRect(x + 54, y + 50, 6, 3);
  // Cable que sale hacia ninguna parte.
  ctx.strokeStyle = '#2b2b33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CABINET_POS.x + 14, CABINET_POS.y + 26);
  ctx.quadraticCurveTo(x + w - 4, y + h - 10, x + w + 16, y + h - 2);
  ctx.stroke();

  // Bombilla colgante del interior.
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(x + 88, y + 24, 1, 16);
  ctx.fillStyle = lit ? '#fef3c7' : '#8d8168';
  ctx.fillRect(x + 86, y + 39, 5, 5);
  if (lit && !reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x + 88, y + 42, 1, x + 88, y + 42, 26);
    g.addColorStop(0, 'rgba(255, 236, 160, 0.24)');
    g.addColorStop(1, 'rgba(255, 236, 160, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + 62, y + 16, 52, 52);
    ctx.restore();
  }

  drawCabinet(ctx, elapsed, arcadeState, reducedMotion);
}

function drawCabinet(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  arcadeState: ArcadeCabinetState,
  reducedMotion: boolean
): void {
  const x = CABINET_POS.x - 18;
  const y = CABINET_POS.y - 40;
  const lit = arcadeState !== 'dusty';

  // Sombra del gabinete.
  ctx.fillStyle = 'rgba(10, 16, 10, 0.4)';
  ctx.fillRect(x - 3, y + 62, 42, 5);

  // Cuerpo con moldura, vetas y laterales de madera.
  ctx.fillStyle = '#2c2114';
  ctx.fillRect(x - 2, y + 2, 40, 63);
  ctx.fillStyle = lit ? '#d9a521' : '#8f7233';
  ctx.fillRect(x, y + 4, 36, 59);
  ctx.fillStyle = lit ? '#f0bf3c' : '#a8893f';
  ctx.fillRect(x + 2, y + 6, 32, 9);
  ctx.fillStyle = 'rgba(60, 40, 12, 0.5)';
  ctx.fillRect(x, y + 52, 36, 11);
  ctx.fillStyle = 'rgba(92, 60, 20, 0.55)';
  ctx.fillRect(x + 1, y + 8, 2, 44);
  ctx.fillRect(x + 33, y + 8, 2, 44);
  // Vetas laterales.
  ctx.fillStyle = 'rgba(255, 226, 150, 0.16)';
  for (let py = y + 10; py < y + 50; py += 8) {
    ctx.fillRect(x + 1, py, 1, 4);
    ctx.fillRect(x + 34, py + 3, 1, 3);
  }
  // T-molding.
  ctx.fillStyle = '#1c1a16';
  ctx.fillRect(x - 2, y + 2, 40, 2);
  ctx.fillRect(x - 2, y + 60, 40, 2);

  // Marquesina con bisel y brillo.
  ctx.fillStyle = '#1c1a16';
  ctx.fillRect(x + 2, y - 6, 32, 12);
  ctx.fillStyle = lit ? '#0d2136' : '#2a2118';
  ctx.fillRect(x + 3, y - 5, 30, 10);
  ctx.fillStyle = lit ? '#fef3c7' : '#8d8168';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PONG', x + 18, y + 3);
  if (lit) {
    ctx.fillStyle = 'rgba(254, 243, 199, 0.22)';
    ctx.fillRect(x + 4, y - 4, 28, 1);
  }

  // Pantalla con marco, bisel interior y reflejos.
  const sx = x + 5;
  const sy = y + 16;
  const sw = 26;
  const sh = 22;
  ctx.fillStyle = '#1c1a16';
  ctx.fillRect(sx - 2, sy - 2, sw + 4, sh + 4);
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);

  if (!lit) {
    ctx.fillStyle = 'rgba(190, 200, 210, 0.14)';
    ctx.fillRect(sx + 2, sy + 2, sw - 8, 3);
    ctx.fillStyle = 'rgba(120, 130, 140, 0.2)';
    ctx.fillRect(sx + 4, sy + sh - 6, 10, 2);
    ctx.fillStyle = 'rgba(120, 130, 140, 0.16)';
    ctx.fillRect(sx + 15, sy + 6, 4, 8);
  } else if (arcadeState === 'powered') {
    ctx.fillStyle = '#0d2136';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';
    ctx.fillRect(sx, sy, sw, sh);
    const bounce = reducedMotion
      ? sh / 2
      : sh / 2 + Math.sin(elapsed * 2.6) * (sh / 2 - 4);
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(sx + 3, sy + sh / 2 - 4, 2, 8);
    ctx.fillRect(sx + sw - 5, sy + sh / 2 - 4, 2, 8);
    ctx.fillRect(sx + sw / 2 - 1 + Math.round(Math.sin(elapsed * 1.7) * 6), sy + bounce - 1, 2, 2);
    // Líneas de barrido del tubo.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    for (let ly = sy; ly < sy + sh; ly += 3) ctx.fillRect(sx, ly, sw, 1);
  } else {
    for (let i = 0; i < sh; i += 2) {
      const n = hash2(Math.floor(elapsed * 12) + i, i);
      ctx.fillStyle = n > 0.72 ? 'rgba(232, 251, 255, 0.9)' : 'rgba(20, 60, 80, 0.8)';
      ctx.fillRect(sx, sy + i, sw, 1 + Math.floor(n));
    }
    ctx.fillStyle = '#39ff14';
    ctx.font = '700 7px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('3-0', sx + sw / 2, sy + sh / 2 + 2);
  }
  // Reflejo de pantalla.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fillRect(sx + 2, sy + 2, 8, 2);
  ctx.fillRect(sx + 2, sy + 5, 4, 8);

  // Panel de control con dos perillas, monedero y ranura.
  ctx.fillStyle = '#2b2116';
  ctx.fillRect(x + 4, y + 41, 28, 10);
  ctx.fillStyle = 'rgba(255, 226, 150, 0.12)';
  ctx.fillRect(x + 4, y + 41, 28, 1);
  const knob = (kx: number) => {
    ctx.fillStyle = '#0f0d0a';
    ctx.fillRect(kx - 2, y + 44, 5, 5);
    ctx.fillStyle = lit ? '#f8fafc' : '#6b7280';
    ctx.fillRect(kx - 1, y + 45, 3, 3);
    ctx.fillStyle = lit ? '#fbbf24' : '#6b5a2a';
    ctx.fillRect(kx, y + 45, 1, 2);
  };
  knob(x + 9);
  knob(x + 27);
  ctx.fillStyle = lit ? '#fbbf24' : '#6b5a2a';
  ctx.fillRect(x + 16, y + 54, 4, 3);
  ctx.fillStyle = '#0f0d0a';
  ctx.fillRect(x + 17, y + 54, 2, 1);
  // Rejilla inferior.
  ctx.fillStyle = 'rgba(20, 16, 10, 0.5)';
  for (let px = x + 6; px < x + 30; px += 4) {
    ctx.fillRect(px, y + 58, 2, 2);
  }

  if (lit) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const pulse = reducedMotion ? 0.5 : 0.42 + Math.sin(elapsed * 2.2) * 0.1;
    const g = ctx.createRadialGradient(sx + sw / 2, sy + sh / 2, 2, sx + sw / 2, sy + sh / 2, 66);
    g.addColorStop(0, `rgba(0, 243, 255, ${(0.34 * pulse * 2).toFixed(3)})`);
    g.addColorStop(0.45, `rgba(0, 243, 255, ${(0.1 * pulse * 2).toFixed(3)})`);
    g.addColorStop(1, 'rgba(0, 243, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 64, sy - 64, sw + 128, sh + 128);
    ctx.restore();
  }
}

function drawSign(ctx: CanvasRenderingContext2D): void {
  // Montículo de arena compactada abrazando el poste del cartel playero
  ctx.fillStyle = 'rgba(104, 72, 36, 0.32)';
  ctx.beginPath();
  ctx.ellipse(SIGN_POS.x + 2, SIGN_POS.y + 1, 10, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  drawGbcWoodenSign(ctx, SIGN_POS.x, SIGN_POS.y);
  ctx.fillStyle = 'rgba(220, 186, 132, 0.76)';
  ctx.fillRect(SIGN_POS.x - 5, SIGN_POS.y - 1, 10, 2);
  ctx.fillStyle = 'rgba(246, 222, 176, 0.52)';
  ctx.fillRect(SIGN_POS.x - 4, SIGN_POS.y - 1, 5, 1);
}

function drawNet(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const { x, y } = NET_POS;
  // Depresión húmeda en la arena donde descansa la red tendida al sol
  ctx.fillStyle = 'rgba(116, 82, 42, 0.36)';
  ctx.beginPath();
  ctx.ellipse(x + 1, y + 1, 25, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(148, 110, 62, 0.38)';
  ctx.fillRect(x - 21, y - 7, 42, 14);
  ctx.strokeStyle = '#a8bdb0';
  ctx.lineWidth = 1;
  for (let i = -20; i <= 20; i += 5) {
    ctx.beginPath();
    ctx.moveTo(x + i, y - 8);
    ctx.lineTo(x + i + 3, y + 8);
    ctx.stroke();
  }
  for (let j = -6; j <= 6; j += 4) {
    ctx.beginPath();
    ctx.moveTo(x - 22, y + j + Math.sin(elapsed * 1.4 + j) * 0.6);
    ctx.lineTo(x + 22, y + j);
    ctx.stroke();
  }
  // Remiendo de hilo cian imposible
  ctx.strokeStyle = '#22d3ee';
  ctx.beginPath();
  ctx.moveTo(x + 8, y - 6);
  ctx.lineTo(x + 16, y + 2);
  ctx.lineTo(x + 9, y + 6);
  ctx.stroke();
  // Flotadores de corcho naranja con sombra en la arena
  ctx.fillStyle = 'rgba(92, 64, 30, 0.42)';
  ctx.fillRect(x - 20, y - 8, 4, 2);
  ctx.fillRect(x + 18, y - 8, 4, 2);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(x - 20, y - 10, 3, 3);
  ctx.fillRect(x + 18, y - 10, 3, 3);
  // Lenguas finas de arena sobre los bordes inferiores de la red
  ctx.fillStyle = 'rgba(222, 188, 134, 0.68)';
  ctx.fillRect(x - 19, y + 6, 8, 2);
  ctx.fillRect(x + 6, y + 7, 9, 2);
  ctx.fillStyle = 'rgba(246, 222, 176, 0.48)';
  ctx.fillRect(x - 17, y + 6, 5, 1);
}

function drawShellCluster(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const { x, y } = SHELLS_POI_POS;
  // Pequeña hondonada de arena removida alrededor de las caracolas
  ctx.fillStyle = 'rgba(116, 82, 42, 0.30)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const sx = x - 10 + i * 9;
    const sy = y - 2 + (i % 2);
    ctx.fillStyle = 'rgba(96, 66, 32, 0.36)';
    ctx.fillRect(sx, sy + 3, 6, 2);
    ctx.fillStyle = i % 2 === 0 ? '#f8cde4' : '#fbe4c8';
    ctx.fillRect(sx, sy, 5, 4);
    ctx.fillStyle = 'rgba(182, 118, 138, 0.65)';
    ctx.fillRect(sx + 1, sy, 1, 4);
    ctx.fillStyle = 'rgba(224, 190, 136, 0.58)';
    ctx.fillRect(sx - 1, sy + 3, 3, 1);
  }
  // Cangrejo que recoloca y huye dejando leve rastro en la arena
  const scuttle = (Math.sin(elapsed * 0.9) + 1) / 2;
  const cx = x + 16 + scuttle * 14;
  const cy = y + 8 - scuttle * 3;
  ctx.fillStyle = 'rgba(132, 94, 48, 0.28)';
  ctx.fillRect(x + 15, y + 8, Math.max(2, Math.round(scuttle * 14)), 1);
  ctx.fillStyle = 'rgba(92, 62, 28, 0.36)';
  ctx.fillRect(cx - 3, cy + 2, 7, 1);
  ctx.fillStyle = '#f4763c';
  ctx.fillRect(cx - 3, cy - 2, 6, 4);
  ctx.fillRect(cx - 5, cy - 1, 2, 2);
  ctx.fillRect(cx + 3, cy - 1, 2, 2);
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(cx - 2, cy - 3, 1, 1);
  ctx.fillRect(cx + 1, cy - 3, 1, 1);
}

function drawMailbox(ctx: CanvasRenderingContext2D): void {
  const { x, y } = MAILBOX_POS;
  ctx.fillStyle = 'rgba(24, 44, 28, 0.3)';
  ctx.fillRect(x + 1, y, 12, 3);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x, y - 18, 3, 19);
  ctx.fillStyle = '#8b95a5';
  ctx.fillRect(x - 7, y - 30, 18, 13);
  ctx.fillStyle = '#a8b2c1';
  ctx.fillRect(x - 7, y - 30, 18, 4);
  ctx.fillStyle = '#3f4a5a';
  ctx.fillRect(x - 4, y - 24, 12, 2);
  // Postal asomando
  ctx.fillStyle = '#f8f5e6';
  ctx.fillRect(x - 2, y - 27, 8, 5);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(x - 1, y - 26, 6, 1);
}

/**
 * Mirador del Alto de las Rocas: tarima de tablones, baranda y catalejo de latón
 * apuntando hacia adelante, sobre el horizonte donde duerme la Isla del Origen.
 */
function drawAltoMirador(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean
): void {
  const { x, y } = MIRADOR_POS;
  const glint = reducedMotion ? 0.55 : 0.35 + (Math.sin(elapsed * 1.7) + 1) * 0.18;

  // Sombra sobre la roca.
  ctx.fillStyle = 'rgba(14, 20, 26, 0.34)';
  ctx.fillRect(x - 62, y - 2, 124, 9);

  // Tarima de tablones.
  ctx.fillStyle = '#3a2413';
  ctx.fillRect(x - 62, y - 8, 124, 10);
  ctx.fillStyle = '#7a4f2a';
  ctx.fillRect(x - 62, y - 10, 124, 5);
  ctx.fillStyle = '#9a6a3c';
  ctx.fillRect(x - 62, y - 10, 124, 1);
  for (let i = -56; i <= 56; i += 12) {
    ctx.fillStyle = 'rgba(36, 20, 8, 0.45)';
    ctx.fillRect(x + i, y - 5, 1, 7);
  }

  // Postes y doble baranda de madera.
  for (const px of [x - 58, x - 4, x + 50]) {
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(px, y - 33, 6, 25);
    ctx.fillStyle = '#8a5a30';
    ctx.fillRect(px, y - 33, 2, 25);
    ctx.fillStyle = '#c9a06a';
    ctx.fillRect(px, y - 34, 6, 2);
  }
  ctx.fillStyle = '#5c3a1f';
  ctx.fillRect(x - 60, y - 31, 120, 4);
  ctx.fillRect(x - 60, y - 18, 120, 3);
  ctx.fillStyle = '#a8743f';
  ctx.fillRect(x - 60, y - 32, 120, 2);
  ctx.fillStyle = `rgba(255, 214, 150, ${glint.toFixed(2)})`;
  ctx.fillRect(x - 60, y - 32, 120, 1);

  // Catalejo de latón sobre trípode, apuntando al horizonte (arriba).
  const tx = x - 8;
  const ty = y - 24;
  ctx.fillStyle = '#1c120a';
  ctx.beginPath();
  ctx.moveTo(tx, ty + 1);
  ctx.lineTo(tx - 16, y + 2);
  ctx.lineTo(tx - 11, y + 2);
  ctx.lineTo(tx + 1, ty + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx, ty + 1);
  ctx.lineTo(tx + 17, y + 2);
  ctx.lineTo(tx + 12, y + 2);
  ctx.lineTo(tx + 1, ty + 3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2616';
  ctx.fillRect(tx - 4, ty, 9, 4);

  // Tubo largo inclinado hacia adelante.
  ctx.save();
  ctx.translate(tx, ty - 2);
  ctx.rotate(-1.08);
  ctx.fillStyle = '#5b3a16';
  ctx.fillRect(-12, -4, 58, 9);
  ctx.fillStyle = '#a97a35';
  ctx.fillRect(-12, -4, 58, 4);
  ctx.fillStyle = '#e0b766';
  ctx.fillRect(-12, -4, 58, 1);
  // Refuerzos del tubo.
  ctx.fillStyle = '#3d260f';
  ctx.fillRect(-8, -5, 4, 11);
  ctx.fillRect(28, -5, 4, 11);
  // Campana del objetivo.
  ctx.fillStyle = '#3d260f';
  ctx.fillRect(42, -6, 9, 13);
  ctx.fillStyle = '#d9c082';
  ctx.fillRect(45, -4, 5, 9);
  ctx.fillStyle = `rgba(186, 244, 255, ${glint.toFixed(2)})`;
  ctx.fillRect(47, -2, 3, 6);
  // Ocular y contrapeso.
  ctx.fillStyle = '#6b471f';
  ctx.fillRect(-17, -5, 6, 11);
  ctx.fillStyle = '#2a1a0b';
  ctx.fillRect(-20, -3, 4, 7);
  ctx.restore();
}

function drawPaddleItem(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const x = CABINET_POS.x + 60;
  const y = CABINET_POS.y + 76;
  const bob = reducedMotion ? 0 : Math.sin(elapsed * 2.4) * 1.6;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y - 10 + bob, 1, x, y - 10 + bob, 34);
  g.addColorStop(0, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.4, 'rgba(0,243,255,0.22)');
  g.addColorStop(1, 'rgba(0,243,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 36, y - 46 + bob, 72, 72);
  ctx.restore();

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(x - 3, y - 26 + bob, 7, 22);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(x - 3, y - 26 + bob, 2, 22);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x - 1, y - 4 + bob, 3, 8);
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(x + 4, y - 20 + bob, 2, 12);
}

/** Muelle de madera del Puerto Norte: la rampa desde la que parte la barra. */
/** Pasarela de tablones donde el sendero de tierra entra en la arena de la playa. */
function drawBeachBoardwalk(ctx: CanvasRenderingContext2D): void {
  const x = 740;
  const y = 912;
  const w = 64;
  const h = 26;

  // Sombra húmeda sobre la arena y bajo los tablones.
  ctx.fillStyle = 'rgba(58, 42, 22, 0.26)';
  ctx.fillRect(x - 3, y + 5, w + 6, h + 4);
  ctx.fillStyle = 'rgba(30, 22, 12, 0.4)';
  ctx.fillRect(x, y + h, w, 3);

  // Tablones horizontales con veta, brillo y clavos.
  for (let row = 0; row < 4; row++) {
    const py = y + row * 6;
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(x, py, w, 6);
    ctx.fillStyle = row % 2 === 0 ? '#8a6238' : '#7c5732';
    ctx.fillRect(x + 1, py + 1, w - 2, 4);
    ctx.fillStyle = 'rgba(255, 226, 170, 0.22)';
    ctx.fillRect(x + 1, py + 1, w - 2, 1);
    ctx.fillStyle = 'rgba(52, 33, 19, 0.5)';
    for (let px = x + 9; px < x + w - 4; px += 16) {
      ctx.fillRect(px, py + 3, 1, 1);
    }
  }

  // Largueros laterales planos que enmarcan la pasarela sin levantar barandas
  // (una baranda alta se leería como un obstáculo sobre el camino).
  for (const px of [x - 3, x + w]) {
    ctx.fillStyle = 'rgba(30, 22, 12, 0.35)';
    ctx.fillRect(px, y, 3, h + 2);
    ctx.fillStyle = '#5c4229';
    ctx.fillRect(px, y, 3, h);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(px, y, 1, h);
  }

  // Cabeceras transversales en los dos extremos, al ras del suelo.
  for (const py of [y - 1, y + h - 3]) {
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(x - 3, py, w + 6, 4);
    ctx.fillStyle = '#8a6238';
    ctx.fillRect(x - 2, py, w + 4, 2);
    ctx.fillStyle = 'rgba(255, 226, 170, 0.28)';
    ctx.fillRect(x - 2, py, w + 4, 1);
  }

  // Arena arrastrada por la brisa marina sobre los extremos y tablones inferiores de la pasarela
  ctx.fillStyle = 'rgba(220, 186, 132, 0.72)';
  ctx.fillRect(x - 5, y + h - 2, 14, 3);
  ctx.fillRect(x + w - 11, y + h - 2, 16, 3);
  ctx.fillRect(x + 18, y + h - 1, 12, 2);
  ctx.fillStyle = 'rgba(244, 220, 174, 0.52)';
  ctx.fillRect(x - 3, y + h - 2, 8, 1);
  ctx.fillRect(x + w - 8, y + h - 2, 9, 1);
  ctx.fillStyle = 'rgba(214, 180, 126, 0.45)';
  ctx.fillRect(x + 4, y + 19, 9, 2);
  ctx.fillRect(x + w - 15, y + 13, 8, 2);
}

function drawNorthPortDock(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  ready: boolean,
  reducedMotion: boolean
): void {
  const { x, y } = ISLA_NATAL_DEPARTURE;
  const left = Math.round(x - 26);
  const bottom = Math.round(y + 4);
  const top = Math.round(y - 56);

  // Estribo costero: arena húmeda y sombra de apoyo donde el muelle nace en la orilla norte
  ctx.fillStyle = 'rgba(104, 72, 36, 0.34)';
  ctx.beginPath();
  ctx.ellipse(x, bottom + 1, 31, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sombra sobre el agua.
  ctx.fillStyle = 'rgba(4, 20, 30, 0.35)';
  ctx.fillRect(left + 4, top + 8, 48, bottom - top + 2);

  // Pilotes que se hunden en el mar.
  for (let i = 0; i < 3; i++) {
    const px = left + 3 + i * 21;
    ctx.fillStyle = '#2e1d10';
    ctx.fillRect(px, top + 6, 5, bottom - top + 12);
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(px + 1, top + 6, 3, bottom - top + 8);
    ctx.fillStyle = 'rgba(30, 52, 58, 0.55)';
    ctx.fillRect(px, bottom + 6, 5, 6);
  }

  // Plataforma de tablones, con vetas y clavos.
  for (let py = top; py < bottom; py += 6) {
    const row = Math.round((py - top) / 6);
    const tone = row % 2 === 0 ? '#8a6238' : '#7a5530';
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(left, py, 52, 6);
    ctx.fillStyle = tone;
    ctx.fillRect(left + 1, py + 1, 50, 4);
    ctx.fillStyle = 'rgba(255, 226, 170, 0.22)';
    ctx.fillRect(left + 2, py + 1, 48, 1);
    ctx.fillStyle = 'rgba(52, 33, 19, 0.45)';
    for (let px = left + 8; px < left + 48; px += 14) {
      ctx.fillRect(px, py + 3, 1, 1);
    }
  }

  // Barandas laterales.
  for (const railX of [left + 1, left + 47]) {
    ctx.fillStyle = '#4f3521';
    ctx.fillRect(railX, top + 4, 4, bottom - top - 4);
    ctx.fillStyle = '#9a6f45';
    ctx.fillRect(railX, top + 4, 1, bottom - top - 4);
  }
  ctx.fillStyle = '#9a6f45';
  ctx.fillRect(left + 1, top + 6, 4, 3);
  ctx.fillRect(left + 47, top + 6, 4, 3);

  // Arena seca de la media luna del puerto abrazando el primer tablón sur del muelle
  ctx.fillStyle = 'rgba(218, 184, 130, 0.66)';
  ctx.fillRect(left - 2, bottom - 2, 11, 3);
  ctx.fillRect(left + 43, bottom - 2, 11, 3);
  ctx.fillStyle = 'rgba(244, 220, 174, 0.45)';
  ctx.fillRect(left, bottom - 2, 6, 1);
  ctx.fillRect(left + 45, bottom - 2, 6, 1);

  // Amarre y farolillo cian: señal de que el carril está disponible.
  ctx.fillStyle = '#2b2b33';
  ctx.fillRect(left + 45, top + 2, 2, 14);
  const glow = ready && !reducedMotion ? 0.6 + Math.sin(elapsed * 3.2) * 0.22 : ready ? 0.7 : 0.25;
  ctx.fillStyle = `rgba(0, 243, 255, ${glow.toFixed(2)})`;
  ctx.fillRect(left + 43, top - 3, 6, 6);
  ctx.fillStyle = 'rgba(224, 250, 255, 0.9)';
  ctx.fillRect(left + 44, top - 2, 4, 3);

  if (!ready) return;

  // Carril de luz que se pierde hacia el norte.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lane = ctx.createLinearGradient(0, top, 0, top - 120);
  lane.addColorStop(0, 'rgba(0, 243, 255, 0.28)');
  lane.addColorStop(1, 'rgba(0, 243, 255, 0)');
  ctx.fillStyle = lane;
  ctx.fillRect(left + 16, top - 118, 20, 122);
  for (let i = 0; i < 6; i++) {
    const t = reducedMotion ? i / 6 : ((elapsed * 0.24 + i / 6) % 1);
    const ly = top - 10 - t * 96;
    const alpha = 0.12 + (1 - t) * 0.32;
    ctx.fillStyle = `rgba(190, 246, 255, ${alpha.toFixed(3)})`;
    ctx.fillRect(left + 21 + Math.sin(t * 9 + i) * 6, Math.round(ly), 8, 2);
  }
  ctx.restore();
}

function drawDepartureBeacon(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  active: boolean,
  reducedMotion: boolean
): void {
  const { x, y } = ISLA_NATAL_DEPARTURE;
  if (!active) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const t = reducedMotion ? i / 3 : ((elapsed * 0.55 + i / 3) % 1);
    const r = 10 + t * 46;
    ctx.strokeStyle = `rgba(0, 243, 255, ${(0.5 * (1 - t)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(224, 250, 255, 0.7)';
  ctx.fillRect(x - 1, y - 26 - Math.sin(elapsed * 2) * 2, 2, 12);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* AVATARES Y PARTÍCULAS                                              */
/* ------------------------------------------------------------------ */

type NatalAvatarParams = Pick<
  IslaNatalRenderParams,
  'player' | 'reducedMotion' | 'skinColor' | 'hairColor' | 'shirtColor' | 'appearance'
>;

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  params: NatalAvatarParams,
  elapsed: number
): void {
  const p = params.player;

  if (p.ridingPaddle) {
    const hover = params.reducedMotion ? 0 : Math.round(Math.sin(elapsed * 5.2) * 2.5);
    const boardY = p.y + 4;
    const avatarY = boardY + hover - 3;
    const tilt = p.rideTilt;

    // Estela en V: chorro de plasma y espuma que se abren tras la tabla
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, avatarY + 6);
    ctx.rotate(tilt);
    const plasma = ctx.createLinearGradient(-128, 0, 0, 0);
    plasma.addColorStop(0, 'rgba(0, 243, 255, 0)');
    plasma.addColorStop(0.6, 'rgba(0, 243, 255, 0.2)');
    plasma.addColorStop(1, 'rgba(0, 243, 255, 0.55)');
    ctx.fillStyle = plasma;
    ctx.fillRect(-128, -5, 128, 10);
    ctx.restore();

    // Espuma en abanico: dos filas de guiones que se abren tras la tabla
    ctx.save();
    ctx.translate(p.x, avatarY + 6);
    ctx.rotate(tilt);
    for (let i = 0; i < 6; i++) {
      const dist = 16 + i * 20;
      const spread = 3 + i * 2.2;
      const drift = Math.sin(elapsed * 8 - i * 1.15) * 2;
      const alpha = Math.max(0.08, 0.52 - i * 0.07);
      ctx.fillStyle = `rgba(224, 250, 255, ${alpha.toFixed(2)})`;
      ctx.fillRect(-dist - 10, -spread - 2 + drift, 12, 2);
      ctx.fillRect(-dist - 10, spread - 1 - drift, 12, 2);
      ctx.fillStyle = `rgba(165, 243, 252, ${(alpha * 0.85).toFixed(2)})`;
      ctx.fillRect(-dist - 3, 0, 9, 3);
    }
    // Cresta de proa: el canto corta el agua y levanta espuma delante
    const bow = params.reducedMotion
      ? 0.7
      : 0.55 + Math.sin(elapsed * 11) * 0.25;
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.55 + bow * 0.25).toFixed(2)})`;
    ctx.fillRect(20, -3, 7, 2);
    ctx.fillRect(26, 0, 5, 2);
    ctx.restore();

    // Rocío marino levantado por el canto de la tabla
    ctx.fillStyle = 'rgba(224, 250, 255, 0.6)';
    for (let i = 1; i <= 5; i++) {
      const back = i * 14;
      const wobble = Math.sin(elapsed * 7 + i) * 3;
      ctx.fillRect(
        p.x - Math.cos(tilt) * back + wobble - 2,
        avatarY - Math.sin(tilt) * back + 9,
        4,
        2
      );
    }

    // La Barra de Pong: la misma pieza del viejo viajero que espera en la Isla del Origen
    drawPongHoverboard(
      ctx,
      p.x,
      boardY,
      tilt,
      false,
      elapsed,
      params.skinColor,
      params.hairColor,
      params.shirtColor,
      params.reducedMotion,
      params.appearance
    );

    // Postura de surf: el cuerpo acompaña la inclinación de la tabla
    ctx.save();
    ctx.translate(p.x, avatarY);
    ctx.rotate(tilt * 0.72);
    drawPixelAvatar4Dir(
      ctx,
      0,
      0,
      p.facingDir,
      false,
      false,
      elapsed,
      params.skinColor,
      params.hairColor,
      params.shirtColor,
      {
        reducedMotion: params.reducedMotion,
        interactAnim: p.interactAnim,
        appearance: params.appearance,
      }
    );
    ctx.restore();
    return;
  }

  const playerOnSand = !isPointOnNatalMeadow(p.x, p.y) && !(p.x < 590 && p.y < 544);
  ctx.fillStyle = playerOnSand ? 'rgba(92, 64, 30, 0.34)' : 'rgba(20, 44, 28, 0.34)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 3, 10, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  drawPixelAvatar4Dir(
    ctx,
    p.x,
    p.y,
    p.facingDir,
    p.walking,
    p.sprinting,
    elapsed,
    params.skinColor,
    params.hairColor,
    params.shirtColor,
    {
      reducedMotion: params.reducedMotion,
      interactAnim: p.interactAnim,
      appearance: params.appearance,
    }
  );
}

function drawPromptBadge(ctx: CanvasRenderingContext2D, prompt: IslaNatalPromptSpec, bob: number): void {
  const px = Math.round(prompt.x);
  const py = Math.round(prompt.y - 52 + bob);
  ctx.save();
  ctx.font = '700 10px "JetBrains Mono", monospace';
  const text = `[E] ${prompt.label}`;
  const tw = Math.ceil(ctx.measureText(text).width) + 20;
  const left = Math.round(px - tw / 2);

  ctx.fillStyle = '#050811';
  ctx.fillRect(left - 2, py - 16, tw + 4, 24);
  ctx.fillStyle = prompt.accentHex || '#d8be88';
  ctx.fillRect(left, py - 14, tw, 20);
  ctx.fillStyle = '#0b1324';
  ctx.fillRect(left + 2, py - 12, tw - 4, 16);
  ctx.fillStyle = '#f8f5e6';
  ctx.textAlign = 'center';
  ctx.fillText(text, px, py);
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* EL VIAJERO Y SU MÁQUINA DEL TIEMPO                                  */
/* ------------------------------------------------------------------ */

/** Geometría de la escena, derivada del punto de aterrizaje. */
const SHIP_HALF_W = 54;
const SHIP_LEG = 16;
const SHIP_HULL_H = 34;
const RAMP_LEN = 76;
const TALK_OFFSET = 104;
const DOOR_OFFSET = 46;
const DOOR_HEIGHT = 34;

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smoothstep = (v: number): number => {
  const p = clamp01(v);
  return p * p * (3 - 2 * p);
};

/** Rastro chamuscado y polvo asentado en el punto de aterrizaje. */
function drawLandingScorch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(28, 26, 18, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 66, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(46, 38, 22, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 3, 42, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trizas radiales en la hierba.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + hash2(i, 41) * 0.25;
    const r = 46 + hash2(i, 9) * 26;
    const len = 4 + hash2(i, 5) * 8;
    ctx.strokeStyle = `rgba(34, 30, 20, ${(0.18 + hash2(i, 3) * 0.16).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.26);
    ctx.lineTo(x + Math.cos(a) * (r + len), y + Math.sin(a) * (r + len) * 0.26);
    ctx.stroke();
  }

  // Brasas que aún respiran.
  for (let i = 0; i < 4; i++) {
    const pulse = 0.15 + 0.5 * Math.abs(Math.sin(elapsed * 1.6 + i * 1.7));
    ctx.fillStyle = `rgba(103, 232, 249, ${(pulse * 0.4).toFixed(3)})`;
    ctx.fillRect(
      Math.round(x - 30 + hash2(i, 21) * 60),
      Math.round(y - 1 + hash2(i, 13) * 3),
      2,
      2
    );
  }
  ctx.restore();
}

/**
 * Nave del viajero: casco metálico con remaches y paneles, cúpula de cristal,
 * patas hidráulicas, rampa de descenso y luces de aterrizaje.
 */
function drawTravelerShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  lift: number,
  elapsed: number,
  reducedMotion: boolean,
  landed: boolean
): void {
  const bob = !landed && !reducedMotion ? Math.sin(elapsed * 1.7) * 1.2 : 0;
  const cy = groundY - lift + bob;
  const hullBottom = cy - SHIP_LEG;
  const hullTop = hullBottom - SHIP_HULL_H;
  const left = x - SHIP_HALF_W;
  const right = x + SHIP_HALF_W;
  const shrink = clamp01(1 - lift / 300);
  const blink = reducedMotion ? 0.6 : 0.35 + Math.abs(Math.sin(elapsed * 3.4)) * 0.65;

  ctx.save();

  // Haz de aterrizaje: una columna de luz suave mientras baja.
  if (lift > 6) {
    const beam = ctx.createLinearGradient(0, hullBottom, 0, groundY);
    beam.addColorStop(0, 'rgba(150, 240, 255, 0.26)');
    beam.addColorStop(1, 'rgba(150, 240, 255, 0)');
    ctx.fillStyle = beam;
    ctx.fillRect(x - 34, hullBottom, 68, groundY - hullBottom);
  }

  // Sombra proyectada, se achica a medida que sube.
  ctx.fillStyle = `rgba(8, 20, 30, ${(0.3 * shrink).toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(x, groundY + 3, 62 * (0.55 + 0.45 * shrink), 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Patas hidráulicas.
  for (const legX of [x - 38, x + 30]) {
    ctx.fillStyle = '#4b6172';
    ctx.fillRect(Math.round(legX), hullBottom, 5, SHIP_LEG);
    ctx.fillStyle = '#7e97a6';
    ctx.fillRect(Math.round(legX + 1), hullBottom, 1, SHIP_LEG - 3);
    ctx.fillStyle = '#2b3b48';
    ctx.fillRect(Math.round(legX - 4), groundY - 2, 13, 4);
    ctx.fillStyle = '#93a9b6';
    ctx.fillRect(Math.round(legX - 4), groundY - 2, 13, 1);
  }

  // Rampa de descenso hacia el oeste, sólo con la nave apoyada.
  if (landed) {
    const doorX = x - DOOR_OFFSET;
    const doorY = hullBottom - 4;
    const footX = doorX - RAMP_LEN;
    ctx.fillStyle = '#53697a';
    ctx.beginPath();
    ctx.moveTo(doorX - 2, doorY);
    ctx.lineTo(doorX + 14, doorY);
    ctx.lineTo(footX + 16, groundY + 1);
    ctx.lineTo(footX, groundY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7d95a4';
    ctx.beginPath();
    ctx.moveTo(doorX - 2, doorY);
    ctx.lineTo(doorX + 2, doorY);
    ctx.lineTo(footX + 2, groundY + 1);
    ctx.lineTo(footX, groundY + 1);
    ctx.closePath();
    ctx.fill();
    // Travesaños y luces de borde.
    for (let i = 1; i < 6; i++) {
      const p = i / 6;
      const px = doorX + (footX - doorX) * p;
      const py = doorY + (groundY - doorY) * p;
      ctx.fillStyle = 'rgba(24, 34, 42, 0.5)';
      ctx.fillRect(Math.round(px), Math.round(py), 14, 1);
    }
    ctx.fillStyle = `rgba(150, 240, 255, ${(0.4 + blink * 0.3).toFixed(3)})`;
    ctx.fillRect(Math.round(footX), Math.round(groundY - 1), 2, 2);
    ctx.fillRect(Math.round(footX + 13), Math.round(groundY - 1), 2, 2);
  }

  // Casco principal con degradado metálico.
  const hull = ctx.createLinearGradient(0, hullTop, 0, hullBottom);
  hull.addColorStop(0, '#54707f');
  hull.addColorStop(0.28, '#334c5c');
  hull.addColorStop(0.72, '#223542');
  hull.addColorStop(1, '#121e27');
  ctx.fillStyle = hull;
  ctx.fillRect(left, hullTop, SHIP_HALF_W * 2, SHIP_HULL_H);

  // Borde superior iluminado y panza en sombra.
  ctx.fillStyle = 'rgba(196, 228, 238, 0.5)';
  ctx.fillRect(left + 3, hullTop, SHIP_HALF_W * 2 - 6, 1);
  ctx.fillStyle = 'rgba(178, 208, 220, 0.22)';
  ctx.fillRect(left + 3, hullTop + 1, SHIP_HALF_W * 2 - 6, 3);
  ctx.fillStyle = 'rgba(8, 14, 18, 0.6)';
  ctx.fillRect(left, hullBottom - 5, SHIP_HALF_W * 2, 5);

  // Paneles verticales y remaches.
  for (let px = left + 12; px < right - 6; px += 18) {
    ctx.fillStyle = 'rgba(12, 20, 26, 0.45)';
    ctx.fillRect(px, hullTop + 4, 1, SHIP_HULL_H - 8);
    ctx.fillStyle = 'rgba(150, 186, 200, 0.14)';
    ctx.fillRect(px + 1, hullTop + 4, 1, SHIP_HULL_H - 8);
  }
  ctx.fillStyle = 'rgba(168, 200, 212, 0.4)';
  for (let px = left + 8; px < right - 4; px += 18) {
    for (let py = hullTop + 8; py < hullBottom - 8; py += 9) {
      ctx.fillRect(px, py, 1, 1);
    }
  }

  // Franjas de advertencia en los costados.
  for (const sx of [left + 2, right - 10]) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c9a227' : '#1b262e';
      ctx.fillRect(sx + i * 2, hullBottom - 12, 2, 6);
    }
  }

  // Compuerta lateral izquierda.
  const doorX = x - DOOR_OFFSET;
  ctx.fillStyle = '#0d161d';
  ctx.fillRect(doorX - 2, hullBottom - DOOR_HEIGHT, 15, DOOR_HEIGHT - 4);
  ctx.fillStyle = '#3f5a6b';
  ctx.fillRect(doorX + 13, hullBottom - DOOR_HEIGHT, 2, DOOR_HEIGHT - 4);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.55)';
  ctx.fillRect(doorX - 1, hullBottom - DOOR_HEIGHT + 2, 13, 1);

  // Ventanillas.
  for (const wx of [x + 8, x + 26]) {
    ctx.fillStyle = '#0e1a22';
    ctx.fillRect(wx - 2, hullTop + 10, 12, 10);
    ctx.fillStyle = '#5fd7e8';
    ctx.fillRect(wx - 1, hullTop + 11, 10, 8);
    ctx.fillStyle = 'rgba(230, 253, 255, 0.85)';
    ctx.fillRect(wx, hullTop + 12, 4, 2);
    ctx.fillStyle = 'rgba(24, 70, 84, 0.5)';
    ctx.fillRect(wx + 6, hullTop + 14, 3, 4);
  }

  // Toberas y llama de los propulsores.
  for (const nx of [x - 30, x + 22]) {
    ctx.fillStyle = '#18262f';
    ctx.fillRect(nx, hullBottom - 2, 14, 4);
    ctx.fillStyle = '#4c6575';
    ctx.fillRect(nx + 1, hullBottom - 2, 12, 1);
  }
  if (lift > 2 && !reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const nx of [x - 27, x + 25]) {
      const flame = 8 + Math.abs(Math.sin(elapsed * 22 + nx)) * 10;
      const g = ctx.createLinearGradient(0, hullBottom, 0, hullBottom + flame);
      g.addColorStop(0, 'rgba(220, 252, 255, 0.95)');
      g.addColorStop(0.5, 'rgba(103, 232, 249, 0.55)');
      g.addColorStop(1, 'rgba(103, 232, 249, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(nx - 2, hullBottom, 8, flame);
    }
    ctx.restore();
  }

  // Cúpula de cristal: anillos de píxeles y reflejos.
  const domeH = 34;
  const domeTop = hullTop - domeH;
  const rows = [26, 40, 50, 58, 64, 68];
  for (let i = 0; i < rows.length; i++) {
    const w = rows[i];
    const ry = domeTop + i * 5;
    ctx.fillStyle = i < 2 ? '#9fb6c4' : i > 3 ? '#6f8798' : '#8aa3b3';
    ctx.fillRect(Math.round(x - w / 2), ry, w, 5);
  }
  const glass = ctx.createLinearGradient(0, domeTop, 0, hullTop);
  glass.addColorStop(0, 'rgba(176, 236, 246, 0.85)');
  glass.addColorStop(0.45, 'rgba(74, 152, 176, 0.85)');
  glass.addColorStop(1, 'rgba(20, 58, 76, 0.9)');
  ctx.fillStyle = glass;
  ctx.fillRect(x - 26, domeTop + 4, 52, domeH - 8);
  ctx.fillRect(x - 32, domeTop + 14, 64, domeH - 18);
  // Reflejo vertical.
  ctx.fillStyle = 'rgba(236, 254, 255, 0.5)';
  ctx.fillRect(x - 20, domeTop + 6, 5, domeH - 14);
  ctx.fillRect(x - 16, domeTop + 9, 2, domeH - 20);
  // Costillas de la cúpula.
  ctx.fillStyle = 'rgba(28, 54, 68, 0.55)';
  ctx.fillRect(x - 1, domeTop + 2, 2, domeH - 4);
  ctx.fillRect(x - 32, hullTop - 4, 64, 4);
  ctx.fillStyle = '#b9cdd8';
  ctx.fillRect(x - 32, hullTop - 4, 64, 1);
  // Luces internas.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const domeGlow = ctx.createRadialGradient(x, domeTop + 18, 2, x, domeTop + 18, 34);
  domeGlow.addColorStop(0, `rgba(103, 232, 249, ${(0.28 + blink * 0.18).toFixed(3)})`);
  domeGlow.addColorStop(1, 'rgba(103, 232, 249, 0)');
  ctx.fillStyle = domeGlow;
  ctx.fillRect(x - 34, domeTop - 6, 68, 52);
  ctx.restore();

  // Antena con baliza.
  ctx.fillStyle = '#5c7484';
  ctx.fillRect(x + 18, domeTop - 16, 2, 18);
  ctx.fillRect(x + 16, domeTop - 18, 6, 2);
  ctx.fillStyle = `rgba(255, 120, 90, ${blink.toFixed(3)})`;
  ctx.fillRect(x + 17, domeTop - 21, 4, 3);

  // Luces de aterrizaje en el borde del casco.
  const lightA = 0.35 + Math.abs(Math.sin(elapsed * 2.4)) * 0.65;
  const lightB = 0.35 + Math.abs(Math.sin(elapsed * 2.4 + Math.PI)) * 0.65;
  ctx.fillStyle = `rgba(150, 240, 255, ${lightA.toFixed(3)})`;
  ctx.fillRect(left + 4, hullTop + 2, 3, 3);
  ctx.fillStyle = `rgba(255, 170, 120, ${lightB.toFixed(3)})`;
  ctx.fillRect(right - 7, hullTop + 2, 3, 3);

  // Motas de energía alrededor de la nave.
  if (!reducedMotion) {
    for (let i = 0; i < 6; i++) {
      const a = (elapsed * 0.6 + i * 0.17) % 1;
      const mx = x - 46 + hash2(i * 3 + 1, Math.floor(elapsed * 3)) * 92;
      const my = hullBottom - 6 - a * 54;
      ctx.fillStyle = `rgba(150, 240, 255, ${((1 - a) * 0.4).toFixed(3)})`;
      ctx.fillRect(Math.round(mx), Math.round(my), 1, 2);
    }
  }

  ctx.restore();
}

/**
 * El viajero: silueta encapuchada. Bajo la capucha no hay rostro, sólo una
 * sombra fría. Camina con el peso de alguien que ya no debería estar aquí.
 */
function drawFutureTraveler(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsed: number,
  facing: -1 | 1,
  walking: boolean
): void {
  const step = walking && Math.floor(elapsed * 7) % 2 === 0 ? 1 : 0;
  const bob = walking ? Math.abs(Math.sin(elapsed * 7)) * 1.5 : Math.sin(elapsed * 1.4) * 0.6;
  const bx = Math.round(x);
  const by = Math.round(y - bob);
  const look = facing >= 0 ? 1 : -1;
  const sway = walking ? Math.sin(elapsed * 7) * 1.3 : Math.sin(elapsed * 1.1) * 0.5;

  ctx.save();

  // Sombra doble: cuerpo y halo frío de la máquina.
  ctx.fillStyle = 'rgba(6, 16, 26, 0.36)';
  ctx.beginPath();
  ctx.ellipse(bx, y + 2, 14, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(103, 232, 249, 0.08)';
  ctx.beginPath();
  ctx.ellipse(bx, y + 2, 9, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Botas de suela gruesa.
  ctx.fillStyle = '#090d15';
  ctx.fillRect(bx - 9 + step, by - 6, 7, 5);
  ctx.fillRect(bx + 2 - step, by - 6, 7, 5);
  ctx.fillStyle = '#39465f';
  ctx.fillRect(bx - 9 + step, by - 6, 6, 1);
  ctx.fillRect(bx + 2 - step, by - 6, 6, 1);
  ctx.fillStyle = '#05080e';
  ctx.fillRect(bx - 10 + step, by - 2, 8, 2);
  ctx.fillRect(bx + 2 - step, by - 2, 8, 2);

  // Túnica larga con vuelo y pliegues profundos.
  const hemL = bx - 13 + sway * 0.45;
  const hemR = bx + 13 + sway * 0.45;
  ctx.fillStyle = '#1b2238';
  ctx.beginPath();
  ctx.moveTo(bx - 8, by - 31);
  ctx.lineTo(bx + 8, by - 31);
  ctx.lineTo(hemR, by - 6);
  ctx.lineTo(hemL, by - 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#242e4b';
  ctx.beginPath();
  ctx.moveTo(bx - 7, by - 30);
  ctx.lineTo(bx + 1, by - 30);
  ctx.lineTo(bx + 3 + sway * 0.3, by - 7);
  ctx.lineTo(bx - 9 + sway * 0.45, by - 7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(8, 12, 22, 0.6)';
  ctx.fillRect(bx - 1, by - 29, 2, 21);
  ctx.fillRect(bx - 6, by - 28, 1, 18);
  ctx.fillRect(bx + 6, by - 28, 1, 18);
  // Dobladillo reforzado.
  ctx.fillStyle = '#39456a';
  ctx.fillRect(Math.round(hemL), by - 7, Math.round(hemR - hemL), 2);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.28)';
  ctx.fillRect(Math.round(hemL) + 1, by - 6, Math.round(hemR - hemL) - 2, 1);

  // Torso y capa corta de viaje.
  ctx.fillStyle = '#242e4b';
  ctx.fillRect(bx - 9, by - 40, 18, 11);
  ctx.fillStyle = '#303d63';
  ctx.beginPath();
  ctx.moveTo(bx - 13, by - 37);
  ctx.lineTo(bx - 8, by - 42);
  ctx.lineTo(bx + 8, by - 42);
  ctx.lineTo(bx + 13, by - 37);
  ctx.lineTo(bx + 10, by - 31);
  ctx.lineTo(bx - 10, by - 31);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3d4b78';
  ctx.fillRect(bx - 8, by - 42, 16, 1);
  ctx.fillStyle = '#141a2a';
  ctx.fillRect(bx - 10, by - 32, 20, 2);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.18)';
  ctx.fillRect(bx - 12, by - 36, 1, 5);
  ctx.fillRect(bx + 11, by - 36, 1, 5);

  // Mangas anchas y guantes.
  ctx.fillStyle = '#202944';
  ctx.beginPath();
  ctx.moveTo(bx - 12, by - 39);
  ctx.lineTo(bx - 16, by - 27);
  ctx.lineTo(bx - 11, by - 25);
  ctx.lineTo(bx - 8, by - 35);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(bx + 12, by - 39);
  ctx.lineTo(bx + 16, by - 27);
  ctx.lineTo(bx + 11, by - 25);
  ctx.lineTo(bx + 8, by - 35);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2f3c60';
  ctx.fillRect(bx - 15, by - 39, 2, 10);
  ctx.fillRect(bx + 13, by - 39, 2, 10);
  ctx.fillStyle = '#0a0f1b';
  ctx.fillRect(bx - 13, by - 26, 5, 4);
  ctx.fillRect(bx + 8, by - 26, 5, 4);

  // Cinturón con hebilla de energía.
  ctx.fillStyle = '#0d1320';
  ctx.fillRect(bx - 9, by - 23, 18, 3);
  ctx.fillStyle = '#67e8f9';
  ctx.fillRect(bx + look * 2 - 1, by - 23, 3, 2);
  ctx.fillStyle = 'rgba(224, 255, 255, 0.8)';
  ctx.fillRect(bx + look * 2, by - 23, 1, 1);

  // Capucha alta y capa de viaje.
  ctx.fillStyle = '#1a2138';
  ctx.fillRect(bx - 8, by - 45, 16, 5);
  ctx.beginPath();
  ctx.moveTo(bx - 9, by - 41);
  ctx.lineTo(bx - 8, by - 48);
  ctx.lineTo(bx - 4, by - 53);
  ctx.lineTo(bx + 4, by - 53);
  ctx.lineTo(bx + 8, by - 47);
  ctx.lineTo(bx + 9, by - 40);
  ctx.lineTo(bx + 6, by - 37);
  ctx.lineTo(bx - 6, by - 37);
  ctx.closePath();
  ctx.fillStyle = '#2c3859';
  ctx.fill();
  ctx.fillStyle = '#3d4b75';
  ctx.beginPath();
  ctx.moveTo(bx - 4, by - 52);
  ctx.lineTo(bx + 4, by - 52);
  ctx.lineTo(bx + 6, by - 46);
  ctx.lineTo(bx - 6, by - 46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(103, 232, 249, 0.3)';
  ctx.fillRect(bx + look * 7, by - 46, 1, 6);
  ctx.fillStyle = '#101524';
  ctx.fillRect(bx - 8, by - 39, 16, 2);

  // Velo del rostro: un vacío frío, sin rasgos.
  const faceX = bx + look;
  const faceGrad = ctx.createLinearGradient(0, by - 50, 0, by - 40);
  faceGrad.addColorStop(0, '#03050a');
  faceGrad.addColorStop(0.7, '#070c16');
  faceGrad.addColorStop(1, 'rgba(10, 18, 32, 0.9)');
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(faceX, by - 45, 4.5, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(125, 211, 252, 0.22)';
  ctx.fillRect(bx + look * 5, by - 48, 1, 6);

  // Estrellas diminutas atrapadas en el vacío.
  for (let i = 0; i < 3; i++) {
    const drift = (elapsed * 0.3 + i * 0.31) % 1;
    const sx = faceX - 2 + Math.round(hash2(i + 3, 7) * 4);
    const sy = Math.round(by - 48 + drift * 5);
    ctx.fillStyle = `rgba(186, 230, 253, ${(0.25 + (1 - drift) * 0.5).toFixed(3)})`;
    ctx.fillRect(sx, sy, 1, 1);
  }

  // Motas de tiempo alrededor de la figura.
  if (!walking) {
    for (let i = 0; i < 4; i++) {
      const a = (elapsed * 0.5 + i * 0.26) % 1;
      ctx.fillStyle = `rgba(140, 226, 248, ${((1 - a) * 0.5).toFixed(3)})`;
      ctx.fillRect(bx - 13 + i * 8, Math.round(by - 12 - a * 24), 1, 2);
    }
  }

  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* INTERIOR DE LA CABAÑA                                              */
/* ------------------------------------------------------------------ */

export interface IslaNatalCabinRenderParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  camera: { x: number; y: number };
  elapsed: number;
  reducedMotion: boolean;
  player: IslaNatalPlayerRender;
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  prompt: IslaNatalPromptSpec | null;
  /** La mochila sigue colgada del clavo junto a la ventana. */
  backpackOnHook: boolean;
  /** El cofre del abuelo ya fue abierto con la combinación. */
  chestOpened: boolean;
  /** La radio de la mesa está encendida y suena durante la intro. */
  radioOn?: boolean;
  /** Interferencia y estática que interrumpen la transmisión de la radio. */
  radioStatic?: { t: number } | null;
  /** Tormenta y anomalías del Reinicio Cero mientras Pixel está adentro. */
  storm?: { t: number } | null;
}

const CABIN_BOOK_COLORS = [
  '#1d3d78',
  '#164a38',
  '#7a1c28',
  '#8a5a16',
  '#3a2468',
  '#1f5868',
  '#6a3416',
  '#b07a22',
  '#2f5c2a',
  '#4a1c48',
  '#245a78',
  '#8c3a18',
];

function drawCabinBookRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  let bx = x;
  let col = seed | 0;
  while (bx < x + w - 2) {
    const bw = 2 + (col % 3);
    if (bx + bw > x + w) break;
    const bh = Math.max(6, h - 1 - (col % 5));
    ctx.fillStyle = CABIN_BOOK_COLORS[col % CABIN_BOOK_COLORS.length];
    ctx.fillRect(bx, y + h - bh, bw, bh);
    ctx.fillStyle = 'rgba(232, 198, 112, 0.55)';
    ctx.fillRect(bx, y + h - bh + 1 + (col % 3), bw, 1);
    if (col % 5 === 0) {
      ctx.fillStyle = 'rgba(255, 244, 210, 0.22)';
      ctx.fillRect(bx, y + h - bh, 1, bh);
    }
    bx += bw + 1;
    col++;
  }
}

function drawCabinBookshelfBay(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number
): void {
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3a2214';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = '#5a3820';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  const rows = 5;
  const rowH = Math.floor((h - 10) / rows);
  for (let r = 0; r < rows; r++) {
    const sy = y + 6 + r * rowH;
    ctx.fillStyle = '#100804';
    ctx.fillRect(x + 4, sy, w - 8, rowH - 4);
    drawCabinBookRow(ctx, x + 5, sy + 1, w - 10, rowH - 7, seed + r * 17);
    ctx.fillStyle = '#6a4428';
    ctx.fillRect(x + 3, sy + rowH - 4, w - 6, 3);
    ctx.fillStyle = '#8a5c34';
    ctx.fillRect(x + 3, sy + rowH - 4, w - 6, 1);
  }
  ctx.fillStyle = '#24140c';
  ctx.fillRect(x, y, 3, h);
  ctx.fillRect(x + w - 3, y, 3, h);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(x + 1, y, 1, h);
  ctx.fillRect(x + w - 2, y, 1, h);
}

function drawCabinColumn(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  ctx.fillStyle = '#140c08';
  ctx.fillRect(x, y, 16, h);
  ctx.fillStyle = '#3a2416';
  ctx.fillRect(x + 2, y, 12, h);
  ctx.fillStyle = '#6a462a';
  ctx.fillRect(x + 2, y, 3, h);
  ctx.fillStyle = '#24140c';
  for (let vy = y + 8; vy < y + h - 6; vy += 18) ctx.fillRect(x + 5, vy, 7, 2);
  ctx.fillStyle = '#8a6240';
  ctx.fillRect(x + 1, y, 14, 4);
  ctx.fillRect(x + 1, y + h - 5, 14, 5);
}

function drawCabinArchNiche(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: 'moon' | 'sun'
): void {
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#4a301c';
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
  ctx.fillStyle = '#120a06';
  ctx.beginPath();
  ctx.moveTo(x + 8, y + h - 8);
  ctx.quadraticCurveTo(x + w / 2, y + 4, x + w - 8, y + h - 8);
  ctx.lineTo(x + w - 8, y + h - 4);
  ctx.lineTo(x + 8, y + h - 4);
  ctx.closePath();
  ctx.fill();
  if (kind === 'moon') {
    const sky = ctx.createLinearGradient(0, y + 8, 0, y + h - 10);
    sky.addColorStop(0, '#1a2748');
    sky.addColorStop(1, '#3a2a48');
    ctx.fillStyle = sky;
  } else {
    const sky = ctx.createLinearGradient(0, y + 8, 0, y + h - 10);
    sky.addColorStop(0, '#c47a38');
    sky.addColorStop(1, '#e8b868');
    ctx.fillStyle = sky;
  }
  ctx.fillRect(x + 10, y + 14, w - 20, h - 28);
  ctx.fillStyle = '#5a3820';
  ctx.fillRect(x + 6, y + h - 12, w - 12, 6);
  ctx.fillStyle = '#8a5c34';
  ctx.fillRect(x + 6, y + h - 12, w - 12, 2);
  ctx.fillStyle = '#d8c090';
  ctx.fillRect(x + 16, y + h - 22, w - 32, 8);
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(x + 18, y + h - 20, w - 36, 5);
  if (kind === 'moon') {
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath();
    ctx.arc(x + w / 2 + 8, y + 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2748';
    ctx.beginPath();
    ctx.arc(x + w / 2 + 12, y + 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(240, 220, 160, 0.45)';
    ctx.fillRect(x + 16, y + 22, 2, 2);
    ctx.fillRect(x + 28, y + 30, 1, 1);
    ctx.fillRect(x + 22, y + 18, 1, 1);
  } else {
    ctx.fillStyle = '#f4d878';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 26, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 236, 180, 0.7)';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 26, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Sala de la cabaña: biblioteca cálida, parquet y luz de tarde. */
function drawCabinShell(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const W = ISLA_NATAL_CABIN.roomW;
  const H = ISLA_NATAL_CABIN.roomH;
  const wallH = 132;

  // Marco de caoba de la sala.
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#4a2c18';
  ctx.fillRect(6, 6, W - 12, H - 12);
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(10, 10, W - 20, H - 20);

  // Parquet de roble con vetas y juntas.
  ctx.fillStyle = '#5a3820';
  ctx.fillRect(10, wallH, W - 20, H - wallH - 10);
  const plankH = 12;
  for (let y = wallH; y < H - 10; y += plankH) {
    const row = Math.floor((y - wallH) / plankH);
    const offset = row % 2 === 0 ? 0 : 16;
    ctx.fillStyle = row % 2 === 0 ? '#6a4428' : '#624022';
    ctx.fillRect(10, y, W - 20, plankH);
    ctx.fillStyle = 'rgba(255, 214, 160, 0.08)';
    ctx.fillRect(10, y, W - 20, 1);
    ctx.fillStyle = 'rgba(20, 10, 4, 0.35)';
    ctx.fillRect(10, y + plankH - 1, W - 20, 1);
    for (let x = 18 + offset; x < W - 16; x += 48) {
      ctx.fillStyle = 'rgba(24, 12, 6, 0.4)';
      ctx.fillRect(x, y, 1, plankH);
      if (hash2(x, y) > 0.72) {
        ctx.fillStyle = 'rgba(32, 16, 8, 0.4)';
        ctx.fillRect(x + 10, y + 4, 3, 2);
      }
    }
  }
  const floorSheen = ctx.createRadialGradient(W * 0.5, 210, 12, W * 0.5, 210, 180);
  floorSheen.addColorStop(0, 'rgba(255, 214, 150, 0.07)');
  floorSheen.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = floorSheen;
  ctx.fillRect(10, wallH, W - 20, H - wallH - 10);

  // Pared de biblioteca: tres bahías de estantes, columnas y nichos.
  const wallGrad = ctx.createLinearGradient(0, 0, 0, wallH);
  wallGrad.addColorStop(0, '#2c1a10');
  wallGrad.addColorStop(0.7, '#23140c');
  wallGrad.addColorStop(1, '#1a0e08');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(10, 10, W - 20, wallH - 10);
  for (let x = 18; x < W - 16; x += 22) {
    ctx.fillStyle = 'rgba(255, 220, 170, 0.04)';
    ctx.fillRect(x, 12, 10, wallH - 22);
  }

  drawCabinBookshelfBay(ctx, 12, 12, 76, 78, 3);
  drawCabinBookshelfBay(ctx, 186, 12, 70, 54, 11);
  drawCabinBookshelfBay(ctx, 328, 12, 72, 54, 19);
  drawCabinBookshelfBay(ctx, 404, 12, 64, 48, 29);
  drawCabinColumn(ctx, 154, 10, wallH - 10);
  drawCabinColumn(ctx, 310, 10, wallH - 10);

  drawCabinArchNiche(ctx, 186, 68, 70, 56, 'moon');
  drawCabinArchNiche(ctx, 328, 68, 72, 56, 'sun');

  // Viga superior, zócalo y moldura.
  ctx.fillStyle = '#140c08';
  ctx.fillRect(8, 8, W - 16, 10);
  ctx.fillStyle = '#5a3820';
  ctx.fillRect(8, 8, W - 16, 3);
  ctx.fillStyle = '#8a5c34';
  ctx.fillRect(8, 8, W - 16, 1);
  for (let x = 20; x < W - 16; x += 36) {
    ctx.fillStyle = 'rgba(16, 8, 4, 0.55)';
    ctx.fillRect(x, 8, 4, 10);
  }
  ctx.fillStyle = '#1a0e08';
  ctx.fillRect(10, wallH - 10, W - 20, 10);
  ctx.fillStyle = '#6a4428';
  ctx.fillRect(10, wallH - 10, W - 20, 3);
  ctx.fillStyle = '#8a5c34';
  ctx.fillRect(10, wallH - 10, W - 20, 1);
  ctx.fillStyle = 'rgba(8, 4, 2, 0.45)';
  ctx.fillRect(10, wallH, W - 20, 10);

  // Ventana al atardecer con cortinas de terciopelo y jardinera.
  const wx = 94;
  const wy = 26;
  const ww = 84;
  const wh = 60;
  ctx.fillStyle = '#140c08';
  ctx.fillRect(wx - 8, wy - 8, ww + 16, wh + 16);
  ctx.fillStyle = '#5a3820';
  ctx.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
  ctx.fillStyle = '#c9a44a';
  ctx.fillRect(wx - 4, wy - 4, ww + 8, 2);
  ctx.fillRect(wx - 4, wy + wh + 2, ww + 8, 2);
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, '#6f87a8');
  sky.addColorStop(0.55, '#e8a86a');
  sky.addColorStop(1, '#f6d39a');
  ctx.fillStyle = sky;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.fillStyle = '#2f6a74';
  ctx.fillRect(wx, wy + wh - 20, ww, 20);
  ctx.fillStyle = '#fce9b8';
  ctx.fillRect(wx + 52, wy + wh - 26, 12, 4);
  ctx.fillStyle = 'rgba(255, 220, 150, 0.5)';
  ctx.fillRect(wx + 50, wy + wh - 22, 16, 8);
  ctx.fillStyle = 'rgba(38, 52, 46, 0.7)';
  ctx.fillRect(wx + 6, wy + wh - 22, 16, 3);
  ctx.fillRect(wx + 12, wy + wh - 27, 3, 6);
  ctx.fillRect(wx + 20, wy + wh - 25, 2, 4);
  ctx.fillStyle = 'rgba(255, 245, 214, 0.28)';
  ctx.fillRect(wx + 2, wy + 2, 20, 1);
  ctx.fillStyle = '#3b2415';
  ctx.fillRect(wx + ww / 2 - 1, wy, 2, wh);
  ctx.fillRect(wx, wy + wh / 2 - 1, ww, 2);
  ctx.fillStyle = '#7a2430';
  ctx.fillRect(wx - 14, wy - 10, 12, wh + 24);
  ctx.fillRect(wx + ww + 2, wy - 10, 12, wh + 24);
  ctx.fillStyle = '#a03844';
  ctx.fillRect(wx - 12, wy - 8, 4, wh + 20);
  ctx.fillRect(wx + ww + 4, wy - 8, 4, wh + 20);
  ctx.fillStyle = '#c9a44a';
  ctx.fillRect(wx - 14, wy - 12, ww + 28, 5);
  ctx.fillStyle = '#4d3320';
  ctx.fillRect(wx - 8, wy + wh + 2, ww + 16, 8);
  ctx.fillStyle = '#77502f';
  ctx.fillRect(wx - 7, wy + wh + 2, ww + 14, 2);
  const blooms = ['#f9a8d4', '#fde68a', '#f8fafc', '#f472b6'];
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = '#3f7a3c';
    ctx.fillRect(wx - 4 + i * 12, wy + wh - 4, 2, 6);
    ctx.fillStyle = blooms[i % blooms.length];
    ctx.fillRect(wx - 6 + i * 12, wy + wh - 7, 5, 3);
  }

  // Haz de luz de la ventana.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createLinearGradient(wx + 10, wy + wh, wx + 40, H);
  beam.addColorStop(0, 'rgba(255, 214, 150, 0.2)');
  beam.addColorStop(1, 'rgba(255, 190, 120, 0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(wx + 4, wy + wh);
  ctx.lineTo(wx + ww - 4, wy + wh);
  ctx.lineTo(wx + ww + 46, H);
  ctx.lineTo(wx - 40, H);
  ctx.closePath();
  ctx.fill();
  const pool = ctx.createRadialGradient(wx + 36, 212, 6, wx + 36, 212, 104);
  pool.addColorStop(0, 'rgba(255, 200, 130, 0.22)');
  pool.addColorStop(1, 'rgba(255, 190, 120, 0)');
  ctx.fillStyle = pool;
  ctx.fillRect(wx - 70, 108, 210, 190);
  ctx.restore();

  // Chimenea de piedra bajo el nicho de la luna.
  ctx.fillStyle = '#2a1c14';
  ctx.fillRect(198, 92, 48, 40);
  ctx.fillStyle = '#6a4a32';
  ctx.fillRect(200, 94, 44, 36);
  ctx.fillStyle = '#120a06';
  ctx.fillRect(208, 104, 28, 24);
  const flicker = reducedMotion ? 0.9 : 0.82 + Math.sin(elapsed * 4.7) * 0.1 + Math.sin(elapsed * 11.3) * 0.04;
  ctx.fillStyle = `rgba(255, 150, 60, ${flicker.toFixed(2)})`;
  ctx.beginPath();
  ctx.moveTo(212, 126);
  ctx.lineTo(222, 108);
  ctx.lineTo(232, 126);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f4d060';
  ctx.fillRect(218, 116, 4, 8);
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(196, 90, 52, 6);
  ctx.fillStyle = '#8a5c34';
  ctx.fillRect(196, 90, 52, 2);

  // Retrato familiar y estante con frascos.
  ctx.fillStyle = '#2a180c';
  ctx.fillRect(256, 32, 50, 42);
  ctx.fillStyle = '#c9a44a';
  ctx.fillRect(258, 34, 46, 38);
  ctx.fillStyle = '#6d4a2b';
  ctx.fillRect(260, 36, 42, 34);
  ctx.fillStyle = '#d9c39a';
  ctx.fillRect(262, 38, 38, 30);
  ctx.fillStyle = 'rgba(96, 72, 46, 0.6)';
  ctx.fillRect(263, 39, 36, 3);
  ctx.fillStyle = '#4a3120';
  ctx.fillRect(272, 50, 6, 14);
  ctx.fillRect(273, 44, 4, 5);
  ctx.fillRect(286, 52, 6, 12);
  ctx.fillRect(288, 46, 3, 5);
  ctx.fillStyle = 'rgba(40, 24, 12, 0.4)';
  ctx.fillRect(262, 62, 38, 1);

  ctx.fillStyle = '#3a2414';
  ctx.fillRect(318, 40, 62, 3);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(318, 43, 62, 4);
  ctx.fillRect(322, 47, 3, 6);
  ctx.fillRect(372, 47, 3, 6);
  const jarColors = ['#9bbf7a', '#d8a24a', '#b45a3c'];
  for (let i = 0; i < 3; i++) {
    const jx = 326 + i * 17;
    ctx.fillStyle = jarColors[i];
    ctx.fillRect(jx, 31, 9, 10);
    ctx.fillStyle = 'rgba(255, 248, 220, 0.45)';
    ctx.fillRect(jx + 1, 32, 2, 6);
    ctx.fillStyle = '#5c3a20';
    ctx.fillRect(jx - 1, 29, 11, 3);
  }

  // Lámpara colgante de aceite.
  ctx.fillStyle = '#241408';
  ctx.fillRect(239, 8, 2, 18);
  ctx.fillStyle = '#8a5f30';
  ctx.beginPath();
  ctx.moveTo(232, 26);
  ctx.lineTo(248, 26);
  ctx.lineTo(244, 34);
  ctx.lineTo(236, 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = `rgba(255, 214, 138, ${flicker.toFixed(2)})`;
  ctx.fillRect(237, 34, 6, 4);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const lampGlow = ctx.createRadialGradient(240, 36, 2, 240, 36, 96);
  lampGlow.addColorStop(0, `rgba(255, 208, 132, ${(0.34 * flicker).toFixed(2)})`);
  lampGlow.addColorStop(1, 'rgba(255, 190, 110, 0)');
  ctx.fillStyle = lampGlow;
  ctx.fillRect(144, -60, 192, 192);
  ctx.restore();

  // Alfombra central de lana bordada (granate y oro).
  ctx.fillStyle = 'rgba(16, 8, 4, 0.28)';
  ctx.fillRect(150, 196, 176, 80);
  ctx.fillStyle = '#6a2428';
  ctx.fillRect(154, 198, 168, 76);
  ctx.fillStyle = '#c9a44a';
  ctx.fillRect(154, 198, 168, 3);
  ctx.fillRect(154, 271, 168, 3);
  ctx.fillRect(154, 198, 3, 76);
  ctx.fillRect(319, 198, 3, 76);
  ctx.fillStyle = '#8a3430';
  ctx.fillRect(164, 208, 148, 56);
  ctx.fillStyle = '#d4b06a';
  ctx.strokeStyle = '#d4b06a';
  ctx.lineWidth = 1;
  ctx.strokeRect(168, 212, 140, 48);
  ctx.strokeRect(176, 220, 124, 32);
  ctx.fillStyle = '#e8d090';
  ctx.beginPath();
  ctx.moveTo(238, 226);
  ctx.lineTo(250, 236);
  ctx.lineTo(238, 246);
  ctx.lineTo(226, 236);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6a2428';
  ctx.beginPath();
  ctx.arc(238, 236, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d4b06a';
  for (let fy = 202; fy < 270; fy += 4) {
    ctx.fillRect(150, fy, 4, 2);
    ctx.fillRect(322, fy, 4, 2);
  }

  // Alfombra ovalada a la derecha.
  ctx.fillStyle = 'rgba(16, 8, 4, 0.22)';
  ctx.beginPath();
  ctx.ellipse(392, 236, 38, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5a28';
  ctx.beginPath();
  ctx.ellipse(390, 234, 36, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9a44a';
  ctx.beginPath();
  ctx.ellipse(390, 234, 28, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a18';
  ctx.beginPath();
  ctx.ellipse(390, 234, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Puerta al sur, con umbral cálido y felpudo.
  const dx0 = 206;
  const dy0 = 258;
  ctx.fillStyle = '#1c0f07';
  ctx.fillRect(dx0 - 6, dy0 - 6, 74, 48);
  ctx.fillStyle = '#4f3320';
  ctx.fillRect(dx0 - 3, dy0 - 3, 68, 45);
  ctx.fillStyle = '#6b482c';
  ctx.fillRect(dx0, dy0, 62, 42);
  for (let y = dy0 + 4; y < 296; y += 8) {
    ctx.fillStyle = 'rgba(46, 27, 14, 0.5)';
    ctx.fillRect(dx0 + 2, y, 58, 1);
  }
  ctx.fillStyle = '#8a5f3a';
  ctx.fillRect(dx0 + 31, dy0 + 2, 1, 40);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(dx0 + 48, dy0 + 22, 3, 4);
  ctx.fillStyle = 'rgba(255, 236, 160, 0.7)';
  ctx.fillRect(dx0 + 48, dy0 + 22, 1, 1);
  ctx.fillStyle = '#8d8779';
  ctx.fillRect(dx0 - 8, 296, 78, 4);
  ctx.fillStyle = 'rgba(255, 244, 220, 0.3)';
  ctx.fillRect(dx0 - 8, 296, 76, 1);
  ctx.fillStyle = '#2a5a38';
  ctx.fillRect(dx0 + 4, 284, 54, 10);
  ctx.fillStyle = '#3a7a4c';
  ctx.fillRect(dx0 + 5, 285, 52, 2);
  ctx.fillStyle = 'rgba(20, 40, 24, 0.45)';
  ctx.fillRect(dx0 + 5, 289, 52, 1);
}

function drawCabinFurniture(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  // Cama de caoba con edredón y almohadas, junto a la pared oeste.
  const bx = 30;
  const by = 150;
  const bw = 112;
  const bh = 114;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.28)';
  ctx.beginPath();
  ctx.ellipse(bx + bw * 0.55, by + bh - 2, bw * 0.62, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a180c';
  ctx.fillRect(bx, by, 12, bh);
  ctx.fillRect(bx + 2, by + bh - 10, bw - 2, 10);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(bx + 2, by + 2, 8, bh - 14);
  ctx.fillStyle = '#c9a44a';
  ctx.fillRect(bx + 3, by + 8, 6, 2);
  ctx.fillRect(bx + 3, by + 28, 6, 2);
  ctx.fillStyle = '#5c381f';
  ctx.fillRect(bx + 10, by + 18, bw - 14, bh - 32);
  ctx.fillStyle = '#efe4c8';
  ctx.fillRect(bx + 12, by + 20, bw - 18, bh - 38);
  ctx.fillStyle = '#f8f1dc';
  ctx.fillRect(bx + 14, by + 22, 32, 20);
  ctx.fillRect(bx + 18, by + 44, 28, 16);
  ctx.fillStyle = 'rgba(180, 160, 122, 0.45)';
  ctx.fillRect(bx + 14, by + 40, 32, 2);
  ctx.fillStyle = '#3f6a4c';
  ctx.fillRect(bx + 46, by + 22, bw - 52, bh - 42);
  ctx.fillStyle = '#528a62';
  for (let y = by + 28; y < by + bh - 28; y += 12) {
    ctx.fillRect(bx + 48, y, bw - 56, 3);
  }
  ctx.fillStyle = '#c96f4a';
  ctx.fillRect(bx + 62, by + 50, 24, 22);
  ctx.fillStyle = '#e0a15a';
  ctx.fillRect(bx + 66, by + 54, 16, 14);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(bx + 46, by + 22, bw - 52, 4);
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(bx + 8, by + 12, bw - 12, 6);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(bx + 10, by + 14, bw - 16, 2);
  ctx.fillStyle = '#24140c';
  for (let i = 0; i < 5; i++) ctx.fillRect(bx + 22 + i * 18, by + 2, 3, 14);

  // Mesita con lámpara de aceite al pie de la cama.
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(26, 248, 22, 16);
  ctx.fillStyle = '#6b4428';
  ctx.fillRect(27, 249, 20, 4);
  ctx.fillStyle = '#c9a44a';
  ctx.fillRect(34, 253, 4, 2);
  ctx.fillStyle = '#8a5c30';
  ctx.fillRect(32, 242, 8, 8);
  ctx.fillStyle = '#f4d878';
  ctx.fillRect(34, 238, 4, 5);

  // Mesa de lectura con mantel, radio, libros y café.
  const tx = 318;
  const ty = 148;
  const tw = 86;
  const th = 58;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.26)';
  ctx.beginPath();
  ctx.ellipse(tx + tw / 2, ty + th, tw * 0.55, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4d3320';
  ctx.fillRect(tx + 4, ty + 10, 6, th - 8);
  ctx.fillRect(tx + tw - 10, ty + 10, 6, th - 8);
  ctx.fillStyle = '#7d5738';
  ctx.fillRect(tx, ty, tw, 12);
  ctx.fillStyle = '#9a6f45';
  ctx.fillRect(tx, ty, tw, 2);
  ctx.fillStyle = '#e7d4ae';
  ctx.fillRect(tx + 4, ty + 10, tw - 8, 22);
  ctx.fillStyle = 'rgba(178, 84, 64, 0.65)';
  for (let x = tx + 10; x < tx + tw - 8; x += 12) ctx.fillRect(x, ty + 10, 4, 22);
  ctx.fillRect(tx + 4, ty + 18, tw - 8, 3);
  ctx.fillStyle = '#3a2468';
  ctx.fillRect(tx + 8, ty + 12, 10, 8);
  ctx.fillStyle = '#1d3d78';
  ctx.fillRect(tx + 11, ty + 10, 9, 8);
  ctx.fillStyle = '#e8d090';
  ctx.fillRect(tx + 13, ty + 11, 5, 6);
  ctx.fillStyle = '#3f5f6b';
  ctx.fillRect(tx + 12, ty - 2, 12, 10);
  ctx.fillStyle = '#5c8491';
  ctx.fillRect(tx + 13, ty - 1, 10, 2);
  ctx.fillStyle = '#2b424c';
  ctx.fillRect(tx + 24, ty + 1, 3, 5);
  ctx.fillStyle = '#c8dbe0';
  ctx.fillRect(tx + 15, ty + 7, 6, 2);
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(tx + 34, ty - 4, 22, 14);
  ctx.fillStyle = '#a8732f';
  ctx.fillRect(tx + 35, ty - 3, 20, 12);
  ctx.fillStyle = '#f0d9a8';
  ctx.fillRect(tx + 37, ty - 1, 10, 5);
  ctx.fillStyle = '#2a1a10';
  for (let i = 0; i < 4; i++) ctx.fillRect(tx + 38 + i * 2, ty + 6, 1, 2);
  ctx.fillStyle = '#c9b27c';
  ctx.fillRect(tx + 50, ty + 4, 3, 3);
  ctx.fillStyle = '#8e8a80';
  ctx.fillRect(tx + 55, ty - 12, 1, 9);
  ctx.fillStyle = '#e8e2d2';
  ctx.fillRect(tx + 62, ty + 2, 8, 5);
  ctx.fillStyle = '#b7ad96';
  ctx.fillRect(tx + 63, ty + 7, 9, 2);
  ctx.fillStyle = '#e8e2d2';
  ctx.fillRect(tx + 69, ty + 3, 2, 2);
  ctx.fillStyle = '#5c3a21';
  ctx.fillRect(tx + 26, ty + 44, 24, 4);
  ctx.fillRect(tx + 26, ty + 48, 3, 16);
  ctx.fillRect(tx + 47, ty + 48, 3, 16);
  ctx.fillStyle = '#7d5530';
  ctx.fillRect(tx + 26, ty + 30, 3, 16);
  ctx.fillRect(tx + 27, ty + 32, 22, 3);
  ctx.fillStyle = '#7a2430';
  ctx.fillRect(tx + 28, ty + 34, 20, 8);

  drawCabinGuitar(ctx);
  drawCabinKeyboard(ctx);

  // Cocina económica / estufa de hierro contra la pared este.
  const kx = 404;
  const ky = 112;
  const kw = 64;
  const kh = 92;
  ctx.fillStyle = 'rgba(20, 12, 6, 0.3)';
  ctx.beginPath();
  ctx.ellipse(kx + kw / 2, ky + kh, kw * 0.6, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3e2a1a';
  ctx.fillRect(kx, ky + 8, kw, kh - 8);
  ctx.fillStyle = '#937f68';
  ctx.fillRect(kx - 2, ky + 4, kw + 4, 8);
  ctx.fillStyle = '#b5a48c';
  ctx.fillRect(kx - 2, ky + 4, kw + 4, 2);
  ctx.fillStyle = '#2f2014';
  ctx.fillRect(kx + 4, ky + 16, kw - 8, 34);
  ctx.fillStyle = '#5a5148';
  ctx.fillRect(kx + 8, ky + 10, 20, 4);
  ctx.fillRect(kx + 36, ky + 10, 20, 4);
  ctx.fillStyle = '#1b1410';
  ctx.fillRect(kx + 10, ky + 8, 16, 4);
  ctx.fillRect(kx + 38, ky + 8, 16, 4);
  ctx.fillStyle = '#3b3330';
  ctx.beginPath();
  ctx.ellipse(kx + 18, ky + 2, 11, 8, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#6b615a';
  ctx.fillRect(kx + 8, ky - 6, 20, 2);
  ctx.fillStyle = '#2a221d';
  ctx.fillRect(kx + 4, ky - 8, 4, 4);
  const ember = reducedMotion ? 0.7 : 0.55 + Math.sin(elapsed * 6.1) * 0.2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const emberGlow = ctx.createRadialGradient(kx + 18, ky + 4, 1, kx + 18, ky + 4, 34);
  emberGlow.addColorStop(0, `rgba(255, 142, 60, ${(0.4 * ember).toFixed(2)})`);
  emberGlow.addColorStop(1, 'rgba(255, 120, 40, 0)');
  ctx.fillStyle = emberGlow;
  ctx.fillRect(kx - 18, ky - 32, 72, 72);
  ctx.restore();
  ctx.fillStyle = `rgba(255, 176, 92, ${ember.toFixed(2)})`;
  ctx.fillRect(kx + 12, ky + 4, 14, 3);
  ctx.fillStyle = '#4f3722';
  ctx.fillRect(kx + 6, ky + 56, 22, 26);
  ctx.fillRect(kx + 34, ky + 56, 22, 26);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(kx + 8, ky + 58, 18, 22);
  ctx.fillRect(kx + 36, ky + 58, 18, 22);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(kx + 24, ky + 68, 2, 3);
  ctx.fillRect(kx + 36, ky + 68, 2, 3);
  if (!reducedMotion) {
    for (let i = 0; i < 3; i++) {
      const st = (elapsed * 0.42 + i / 3) % 1;
      ctx.fillStyle = `rgba(236, 232, 220, ${(0.22 * (1 - st)).toFixed(2)})`;
      ctx.fillRect(Math.round(kx + 16 + Math.sin(st * 6 + i) * 5), Math.round(ky - 14 - st * 26), 2 + Math.round(st * 3), 2);
    }
  }
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(kx - 2, 74, kw + 6, 3);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(kx - 2, 77, kw + 6, 3);
  for (let i = 0; i < 3; i++) {
    const px = kx + 4 + i * 20;
    ctx.fillStyle = i % 2 === 0 ? '#b06a3a' : '#8f8a7c';
    ctx.fillRect(px, 62, 16, 12);
    ctx.fillStyle = 'rgba(255, 226, 180, 0.45)';
    ctx.fillRect(px + 1, 63, 3, 9);
    ctx.fillStyle = '#3a2414';
    ctx.fillRect(px + 5, 58, 2, 4);
  }

  // Planta de interior en la esquina sureste, sobre la cocina.
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(448, 198, 16, 12);
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(447, 196, 18, 4);
  ctx.fillStyle = '#14532d';
  ctx.beginPath();
  ctx.arc(456, 188, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(452, 184, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(460, 186, 5, 0, Math.PI * 2);
  ctx.fill();

  // Banco de lectura arrimado al borde sur de la mesa.
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(338, 200, 24, 10);
  ctx.fillStyle = '#6b4428';
  ctx.fillRect(339, 201, 22, 3);
  ctx.fillStyle = '#7a2430';
  ctx.fillRect(340, 204, 20, 5);
}

/** Guitarra eléctrica roja de la familia, colgada de un clavo sobre la cama. */
function drawCabinGuitar(ctx: CanvasRenderingContext2D): void {
  if (!ctx) return;
  const cx = 52;
  ctx.save();

  // Clavo y cordón de cuero.
  ctx.fillStyle = '#1d1008';
  ctx.fillRect(cx - 1, 46, 3, 5);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(cx, 50, 1, 6);

  // Mástil de palo rosa con trastes claros.
  ctx.fillStyle = '#170c06';
  ctx.fillRect(cx - 3, 62, 7, 26);
  ctx.fillStyle = '#4a2a17';
  ctx.fillRect(cx - 2, 62, 5, 26);
  ctx.fillStyle = '#7d4a2b';
  ctx.fillRect(cx - 2, 62, 1, 26);
  ctx.fillStyle = 'rgba(226, 214, 190, 0.55)';
  for (let y = 67; y < 88; y += 5) ctx.fillRect(cx - 2, y, 5, 1);

  // Pala roja con clavijas de cromo.
  ctx.fillStyle = '#170c06';
  ctx.fillRect(cx - 6, 51, 13, 12);
  ctx.fillStyle = '#b3241c';
  ctx.fillRect(cx - 5, 52, 11, 10);
  ctx.fillStyle = '#e04a36';
  ctx.fillRect(cx - 4, 52, 9, 1);
  ctx.fillStyle = '#d7dbe2';
  ctx.fillRect(cx - 8, 54, 2, 2);
  ctx.fillRect(cx - 8, 58, 2, 2);
  ctx.fillRect(cx + 6, 54, 2, 2);
  ctx.fillRect(cx + 6, 58, 2, 2);
  ctx.fillStyle = '#8f949c';
  ctx.fillRect(cx - 8, 55, 2, 1);
  ctx.fillRect(cx + 6, 55, 2, 1);

  // Cuerpo sólido rojo con doble cutaway.
  const outline: [number, number][] = [
    [cx - 4, 84],
    [cx - 13, 87],
    [cx - 15, 97],
    [cx - 12, 107],
    [cx - 13, 117],
    [cx - 6, 124],
    [cx + 6, 124],
    [cx + 13, 117],
    [cx + 12, 107],
    [cx + 15, 97],
    [cx + 13, 87],
    [cx + 4, 84],
  ];
  const body: [number, number][] = [
    [cx - 4, 86],
    [cx - 11, 89],
    [cx - 13, 97],
    [cx - 10, 107],
    [cx - 11, 116],
    [cx - 5, 122],
    [cx + 5, 122],
    [cx + 11, 116],
    [cx + 10, 107],
    [cx + 13, 97],
    [cx + 11, 89],
    [cx + 4, 86],
  ];
  const trace = (pts: [number, number][]) => {
    if (!pts || pts.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p) ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
  };
  ctx.fillStyle = '#2a0a08';
  trace(outline);
  ctx.fill();
  ctx.fillStyle = '#c22a20';
  trace(body);
  ctx.fill();

  // Brillo del barniz en el lóbulo superior izquierdo.
  ctx.fillStyle = '#e04a36';
  ctx.beginPath();
  ctx.moveTo(cx - 9, 92);
  ctx.lineTo(cx - 3, 90);
  ctx.lineTo(cx - 3, 110);
  ctx.lineTo(cx - 8, 112);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 220, 200, 0.35)';
  ctx.fillRect(cx - 11, 90, 2, 8);
  ctx.fillRect(cx - 10, 88, 5, 1);

  // Golpeador perla.
  ctx.fillStyle = '#ece6d6';
  ctx.beginPath();
  ctx.moveTo(cx + 3, 94);
  ctx.lineTo(cx + 12, 100);
  ctx.lineTo(cx + 10, 113);
  ctx.lineTo(cx + 3, 116);
  ctx.lineTo(cx + 1, 106);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 150, 130, 0.35)';
  ctx.fillRect(cx + 4, 96, 1, 18);

  // Pastillas dobles y puente cromado.
  const pyList = [96, 106];
  for (let pi = 0; pi < pyList.length; pi++) {
    const py = pyList[pi];
    ctx.fillStyle = '#171310';
    ctx.fillRect(cx - 7, py, 12, 4);
    ctx.fillStyle = '#c9ced6';
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - 6 + i * 2, py + 1, 1, 2);
  }
  ctx.fillStyle = '#b9bfc8';
  ctx.fillRect(cx - 7, 116, 14, 3);
  ctx.fillStyle = '#6f7680';
  for (let i = 0; i < 6; i++) ctx.fillRect(cx - 6 + i * 2, 117, 1, 2);
  // Perillas de volumen y tono.
  ctx.fillStyle = '#dfe3e8';
  ctx.fillRect(cx + 8, 115, 3, 3);
  ctx.fillRect(cx + 8, 120, 3, 3);
  ctx.fillStyle = '#5c6169';
  ctx.fillRect(cx + 9, 116, 1, 1);
  ctx.fillRect(cx + 9, 121, 1, 1);

  // Palanca de vibrato.
  ctx.strokeStyle = '#c9ced6';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + 6, 118);
  ctx.lineTo(cx + 12, 124);
  ctx.lineTo(cx + 14, 121);
  ctx.stroke();

  // Cuerdas.
  ctx.fillStyle = 'rgba(236, 240, 246, 0.6)';
  ctx.fillRect(cx - 2, 60, 1, 57);
  ctx.fillRect(cx, 60, 1, 57);
  ctx.fillRect(cx + 2, 60, 1, 57);
  ctx.fillRect(cx + 4, 62, 1, 55);

  ctx.restore();
}

/** Teclado musical blanco sobre su banco, en el rincón del retrato. */
function drawCabinKeyboard(ctx: CanvasRenderingContext2D): void {
  const x = 252;
  const y = 100;
  const w = 56;

  ctx.save();

  // Sombra sobre la pared.
  ctx.fillStyle = 'rgba(16, 9, 4, 0.35)';
  ctx.fillRect(x - 2, y + 24, w + 4, 4);

  // Patas claras hasta el zócalo.
  ctx.fillStyle = '#8f897c';
  ctx.fillRect(x + 4, y + 16, 4, 17);
  ctx.fillRect(x + w - 8, y + 16, 4, 17);
  ctx.fillStyle = '#ddd6c6';
  ctx.fillRect(x + 5, y + 17, 2, 15);
  ctx.fillRect(x + w - 7, y + 17, 2, 15);

  // Mueble blanco marfil con contorno gris cálido.
  ctx.fillStyle = '#5a544a';
  ctx.fillRect(x - 1, y - 1, w + 2, 19);
  ctx.fillStyle = '#ece7da';
  ctx.fillRect(x, y, w, 17);
  ctx.fillStyle = '#fbf7ec';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = '#c9c2b2';
  ctx.fillRect(x, y + 14, w, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + 1, y, w - 2, 1);

  // Fieltro rojo bajo las teclas.
  ctx.fillStyle = '#a83226';
  ctx.fillRect(x + 3, y + 4, w - 6, 3);

  // Teclas blancas con separaciones y teclas negras en patrón de piano.
  const keysY = y + 6;
  const keysW = w - 6;
  ctx.fillStyle = '#f8f3e6';
  ctx.fillRect(x + 3, keysY, keysW, 7);
  ctx.fillStyle = 'rgba(140, 130, 112, 0.5)';
  for (let i = 1; i < 14; i++) {
    ctx.fillRect(x + 3 + Math.round((i * keysW) / 14), keysY, 1, 7);
  }
  // Negras: dos, tres, dos, tres...
  const blackPattern = [1, 2, 4, 5, 6, 8, 9, 11, 12, 13];
  ctx.fillStyle = '#1f1a16';
  for (const k of blackPattern) {
    const kx = x + 3 + Math.round((k * keysW) / 14) - 1;
    ctx.fillRect(kx, keysY, 2, 4);
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(x + 3, keysY, keysW, 1);

  // Nombre grabado en metal y un par de perillas.
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(x + w - 15, y + 1, 11, 2);
  ctx.fillStyle = '#3a3630';
  ctx.fillRect(x + 5, y + 1, 2, 2);
  ctx.fillRect(x + 10, y + 1, 2, 2);

  // Reflejo cálido de la lámpara sobre el mueble.
  ctx.fillStyle = 'rgba(255, 214, 150, 0.16)';
  ctx.fillRect(x + 4, y + 2, 20, 2);

  ctx.restore();
}

/** Mochila de lona colgada del clavo, con brillo suave para que se descubra. */
function drawCabinBackpack(ctx: CanvasRenderingContext2D, elapsed: number, reducedMotion: boolean): void {
  const { x, y } = ISLA_NATAL_CABIN.backpack;
  const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.6) * 0.6;
  ctx.save();
  ctx.translate(0, Math.round(bob));
  // Clavo y correas.
  ctx.fillStyle = '#241408';
  ctx.fillRect(x - 1, y - 12, 3, 5);
  ctx.fillStyle = '#8a6a45';
  ctx.fillRect(x, y - 9, 1, 3);
  ctx.fillStyle = '#6b4728';
  ctx.fillRect(x - 9, y - 8, 3, 14);
  ctx.fillRect(x + 7, y - 8, 3, 14);
  // Cuerpo de lona.
  ctx.fillStyle = 'rgba(20, 12, 6, 0.35)';
  ctx.fillRect(x - 11, y - 6, 24, 32);
  ctx.fillStyle = '#8c5835';
  ctx.fillRect(x - 12, y - 7, 24, 31);
  ctx.fillStyle = '#a86c42';
  ctx.fillRect(x - 10, y - 5, 20, 9);
  ctx.fillStyle = '#72452a';
  ctx.fillRect(x - 12, y + 4, 24, 3);
  // Solapa y hebilla.
  ctx.fillStyle = '#9c6239';
  ctx.fillRect(x - 10, y + 8, 20, 6);
  ctx.fillStyle = '#d9a521';
  ctx.fillRect(x - 2, y + 10, 4, 3);
  ctx.fillStyle = '#f4d27a';
  ctx.fillRect(x - 1, y + 10, 1, 1);
  // Bolsillo y costuras.
  ctx.fillStyle = '#a06c45';
  ctx.fillRect(x - 7, y + 15, 14, 7);
  ctx.fillStyle = '#7a4f31';
  ctx.fillRect(x - 7, y + 15, 14, 1);
  ctx.fillStyle = 'rgba(255, 224, 180, 0.35)';
  ctx.fillRect(x - 11, y - 6, 1, 24);
  ctx.fillRect(x - 11, y + 14, 23, 1);
  // Asa superior.
  ctx.fillStyle = '#5c3a22';
  ctx.fillRect(x - 4, y - 12, 8, 2);
  ctx.fillRect(x - 6, y - 10, 2, 4);
  ctx.fillRect(x + 4, y - 10, 2, 4);
  ctx.restore();
}

/** El cofre del abuelo, bajo el retrato familiar, con su cerradura de cuatro discos. */
function drawCabinChest(
  ctx: CanvasRenderingContext2D,
  opened: boolean,
  elapsed: number,
  reducedMotion: boolean
): void {
  const { x, y } = ISLA_NATAL_CABIN.chest;
  // Pozo de luz cálida para separar el cofre del parquet.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(x, y + 4, 2, x, y + 4, 42);
  glow.addColorStop(0, opened ? 'rgba(255, 214, 138, 0.16)' : 'rgba(255, 196, 110, 0.2)');
  glow.addColorStop(1, 'rgba(255, 170, 80, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 44, y - 38, 88, 84);
  ctx.restore();

  if (opened) {
    // Tapa levantada contra la pared: sin ella el cofre abierto se confundía
    // con un banco. Se dibuja detrás del cuerpo, con sus herrajes dorados.
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(x - 15, y - 29, 30, 10);
    ctx.fillStyle = '#8b4e20';
    ctx.fillRect(x - 14, y - 28, 28, 8);
    ctx.fillStyle = '#b4672e';
    ctx.fillRect(x - 14, y - 28, 28, 2);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(x - 10, y - 28, 2, 8);
    ctx.fillRect(x + 8, y - 28, 2, 8);
    ctx.fillStyle = '#070b14';
    ctx.fillRect(x - 9, y - 20, 3, 2);
    ctx.fillRect(x + 6, y - 20, 3, 2);
  }

  drawRpgTreasureChest(ctx, x, y, opened, '#facc15', elapsed, reducedMotion);

  if (opened) {
    // Carta y fotografía asomando del interior de terciopelo.
    ctx.fillStyle = '#f4e6c4';
    ctx.fillRect(x - 9, y - 13, 12, 6);
    ctx.fillStyle = '#d8c49a';
    ctx.fillRect(x - 9, y - 11, 12, 1);
    ctx.fillStyle = '#2f4a6a';
    ctx.fillRect(x + 3, y - 15, 9, 8);
    ctx.fillStyle = '#bcd2e6';
    ctx.fillRect(x + 4, y - 14, 7, 2);
    ctx.fillStyle = '#e8d7b4';
    ctx.fillRect(x + 5, y - 11, 4, 3);
  } else if (!reducedMotion && Math.floor(elapsed * 2.2) % 4 === 0) {
    // La cerradura devuelve un destello: el cofre sabe que ya puedes abrirlo.
    ctx.fillStyle = '#fff6cf';
    ctx.fillRect(x + 1, y - 10, 2, 2);
  }
}

/** Radio encendida sobre la mesa: dial cálido y ondas de sonido. */
function drawCabinRadioLive(
  ctx: CanvasRenderingContext2D,
  elapsed: number,
  reducedMotion: boolean
): void {
  const rx = 363;
  const ry = 149;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.5 + Math.sin(elapsed * 3.1) * 0.25;
  const glow = ctx.createRadialGradient(rx, ry, 1, rx, ry, 26);
  glow.addColorStop(0, `rgba(255, 206, 130, ${(0.3 * pulse).toFixed(3)})`);
  glow.addColorStop(1, 'rgba(255, 180, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(rx - 28, ry - 24, 56, 48);

  // Ondas que salen del altavoz.
  for (let i = 0; i < 3; i++) {
    const p = ((reducedMotion ? 0.5 : elapsed * 0.9) + i / 3) % 1;
    ctx.strokeStyle = `rgba(255, 214, 150, ${((1 - p) * 0.4).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rx + 7, ry + 2, 6 + p * 24, -0.8, 0.6);
    ctx.stroke();
  }

  // Dial encendido.
  ctx.fillStyle = `rgba(255, 236, 190, ${(0.55 + pulse * 0.35).toFixed(3)})`;
  ctx.fillRect(rx - 6, ry - 2, 4, 2);
  ctx.restore();
}

/** Interferencia y estática en la radio antes de que se corte la transmisión. */
function drawCabinRadioStatic(
  ctx: CanvasRenderingContext2D,
  staticElapsed: number,
  elapsed: number,
  reducedMotion: boolean
): void {
  const rx = 363;
  const ry = 149;
  const cutProgress = Math.min(1, staticElapsed / 2.6);
  const alive = cutProgress < 0.88;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (alive) {
    const jitter = reducedMotion ? 0.6 : Math.abs(Math.sin(elapsed * 31.7 + staticElapsed * 19));
    const glow = ctx.createRadialGradient(rx, ry, 1, rx, ry, 28);
    glow.addColorStop(0, `rgba(103, 232, 249, ${(0.36 * jitter).toFixed(3)})`);
    glow.addColorStop(0.55, `rgba(244, 63, 94, ${(0.22 * (1 - jitter)).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(rx - 30, ry - 26, 60, 52);

    // Arcos quebrados de estática y chispas de señal interrumpida.
    for (let i = 0; i < 4; i++) {
      const seed = hash2(Math.floor(elapsed * 24) + i * 13, i * 7);
      if (seed < 0.25) continue;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(103, 232, 249, 0.72)' : 'rgba(251, 113, 133, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const baseX = rx + 4 + (seed - 0.5) * 14;
      const baseY = ry - 4 + ((i % 3) - 1) * 5;
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(baseX + 5 - (i % 2) * 9, baseY - 5);
      ctx.lineTo(baseX + 9 - (i % 2) * 14, baseY - 2);
      ctx.lineTo(baseX + 13 - (i % 2) * 18, baseY - 9);
      ctx.stroke();
    }

    // Dial parpadeante antes del apagón definitivo.
    if (Math.floor(elapsed * 18) % 3 !== 0) {
      ctx.fillStyle = Math.floor(elapsed * 22) % 2 === 0 ? '#67e8f9' : '#fda4af';
      ctx.fillRect(rx - 6, ry - 2, 4, 2);
    }
  } else {
    // Última chispa al cortarse por completo la emisora.
    const fade = Math.max(0, 1 - (cutProgress - 0.88) / 0.12);
    ctx.fillStyle = `rgba(226, 232, 240, ${(0.5 * fade).toFixed(3)})`;
    ctx.fillRect(rx - 5, ry - 2, 3, 2);
  }

  ctx.restore();
}

export function renderIslaNatalCabin(params: IslaNatalCabinRenderParams): void {
  const { ctx, vw, vh, camera, elapsed, reducedMotion } = params;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#080604';
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(-Math.round(camera.x), -Math.round(camera.y));
  drawCabinShell(ctx, elapsed, reducedMotion);
  drawCabinFurniture(ctx, elapsed, reducedMotion);
  drawCabinChest(ctx, params.chestOpened, elapsed, reducedMotion);
  if (params.radioOn) drawCabinRadioLive(ctx, elapsed, reducedMotion);
  if (params.radioStatic) {
    drawCabinRadioStatic(ctx, params.radioStatic.t, elapsed, reducedMotion);
  }
  if (params.backpackOnHook) drawCabinBackpack(ctx, elapsed, reducedMotion);
  drawPlayer(ctx, params, elapsed);
  if (params.prompt) {
    const bob = reducedMotion ? 0 : (Math.floor(elapsed * 3.2) % 2 === 0 ? 0 : -2);
    drawPromptBadge(ctx, params.prompt, bob);
  }
  ctx.restore();

  // Calidez interior: viñeta de madera y polvo flotando en la luz.
  const vig = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.26, vw / 2, vh / 2, Math.max(vw, vh) * 0.72);
  vig.addColorStop(0, 'rgba(24, 12, 4, 0)');
  vig.addColorStop(1, 'rgba(12, 6, 2, 0.62)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);
  const grade = ctx.createLinearGradient(0, 0, 0, vh);
  grade.addColorStop(0, 'rgba(255, 176, 96, 0.05)');
  grade.addColorStop(0.5, 'rgba(255, 150, 80, 0.015)');
  grade.addColorStop(1, 'rgba(40, 18, 8, 0.16)');
  ctx.fillStyle = grade;
  ctx.fillRect(0, 0, vw, vh);

  // Parpadeo sutil de la lámpara durante la interferencia de la radio.
  if (params.radioStatic && !reducedMotion) {
    const flickerCut = Math.sin(elapsed * 29) > 0.55 ? 0.18 : 0.04;
    ctx.fillStyle = `rgba(8, 12, 24, ${flickerCut.toFixed(3)})`;
    ctx.fillRect(0, 0, vw, vh);
  }

  // Secuencia cinematográfica de rayos, tormenta y acontecimientos extraños del Reinicio Cero.
  if (params.storm) {
    const st = params.storm.t;
    const dark = Math.min(0.58, 0.16 + Math.min(1, st / 1.4) * 0.36);
    ctx.fillStyle = `rgba(7, 11, 24, ${dark.toFixed(3)})`;
    ctx.fillRect(0, 0, vw, vh);

    const wx0 = 94 - Math.round(camera.x);
    const wy0 = 26 - Math.round(camera.y);
    const ww = 84;
    const wh = 60;

    // Cielo tormentoso y grieta dimensional del Reinicio Cero tras los cristales de la ventana.
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx0, wy0, ww, wh);
    ctx.clip();

    const stormSky = ctx.createLinearGradient(0, wy0, 0, wy0 + wh);
    const anomalyPhase = Math.max(0, Math.min(1, (st - 1.7) / 2.2));
    stormSky.addColorStop(0, anomalyPhase > 0.2 ? '#1e0b2e' : '#091122');
    stormSky.addColorStop(0.58, anomalyPhase > 0.2 ? '#3b0f36' : '#13223b');
    stormSky.addColorStop(1, '#091829');
    ctx.fillStyle = stormSky;
    ctx.fillRect(wx0, wy0, ww, wh);

    // Lluvia diagonal azotando el cristal.
    if (!reducedMotion) {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.38)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const rx = wx0 + ((i * 19 + Math.floor(elapsed * 130)) % (ww + 18)) - 8;
        const ry = wy0 + ((i * 23 + Math.floor(elapsed * 190)) % (wh + 12)) - 6;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 5, ry + 11);
        ctx.stroke();
      }
    }

    // Grieta carmesí/cian del Reinicio Cero abriéndose sobre el horizonte exterior.
    if (anomalyPhase > 0.04) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const riftGlow = ctx.createRadialGradient(
        wx0 + 46,
        wy0 + 22,
        2,
        wx0 + 46,
        wy0 + 22,
        44
      );
      riftGlow.addColorStop(0, `rgba(244, 63, 94, ${(0.72 * anomalyPhase).toFixed(3)})`);
      riftGlow.addColorStop(0.5, `rgba(168, 85, 247, ${(0.45 * anomalyPhase).toFixed(3)})`);
      riftGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = riftGlow;
      ctx.fillRect(wx0, wy0, ww, wh);

      ctx.strokeStyle = `rgba(254, 205, 211, ${(0.85 * anomalyPhase).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx0 + 16, wy0 + 14);
      ctx.lineTo(wx0 + 34, wy0 + 20);
      ctx.lineTo(wx0 + 48, wy0 + 16);
      ctx.lineTo(wx0 + 68, wy0 + 26);
      ctx.stroke();
      ctx.restore();
    }

    // Rejilla de madera de la ventana sobre el cristal tormentoso.
    ctx.fillStyle = '#24140b';
    ctx.fillRect(wx0 + ww / 2 - 1, wy0, 2, wh);
    ctx.fillRect(wx0, wy0 + wh / 2 - 1, ww, 2);
    ctx.restore();

    // Acontecimientos extraños en el interior: motas antigravitatorias y pulso cromático del Reinicio Cero.
    if (anomalyPhase > 0.08) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const roomRift = ctx.createRadialGradient(
        wx0 + 42,
        wy0 + 30,
        6,
        wx0 + 42,
        wy0 + 30,
        260
      );
      roomRift.addColorStop(0, `rgba(244, 63, 94, ${(0.24 * anomalyPhase).toFixed(3)})`);
      roomRift.addColorStop(0.48, `rgba(56, 189, 248, ${(0.14 * anomalyPhase).toFixed(3)})`);
      roomRift.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = roomRift;
      ctx.fillRect(0, 0, vw, vh);

      if (!reducedMotion) {
        for (let i = 0; i < 18; i++) {
          const seedX = hash2(i * 17, 5);
          const seedY = hash2(i * 29, 11);
          const mx = Math.round(seedX * vw);
          const lift = ((elapsed * 36 + seedY * vh) % vh);
          const my = Math.round(vh - lift);
          ctx.fillStyle =
            i % 3 === 0
              ? `rgba(103, 232, 249, ${(0.52 * anomalyPhase).toFixed(3)})`
              : i % 3 === 1
                ? `rgba(244, 114, 182, ${(0.46 * anomalyPhase).toFixed(3)})`
                : `rgba(253, 224, 71, ${(0.4 * anomalyPhase).toFixed(3)})`;
          ctx.fillRect(mx, my, i % 4 === 0 ? 3 : 2, i % 4 === 0 ? 3 : 2);
        }

        for (let b = 0; b < 4; b++) {
          const bandSeed = hash2(Math.floor(elapsed * 14) + b * 23, b);
          if (bandSeed < 0.52) continue;
          const by = Math.round(bandSeed * vh);
          ctx.fillStyle =
            b % 2 === 0
              ? `rgba(103, 232, 249, ${(0.16 * anomalyPhase).toFixed(3)})`
              : `rgba(244, 63, 94, ${(0.14 * anomalyPhase).toFixed(3)})`;
          ctx.fillRect(0, by, vw, 2 + (b % 2));
        }
      }
      ctx.restore();
    }

    const gaussian = (center: number, spread: number) => {
      const d = (st - center) / spread;
      return Math.exp(-d * d);
    };
    const flash = Math.max(
      gaussian(0.32, 0.1),
      gaussian(1.35, 0.13),
      gaussian(2.65, 0.15),
      gaussian(3.85, 0.14),
      gaussian(5.1, 0.16)
    );
    if (flash > 0.01) {
      // Luz eléctrica que entra por la ventana y recorre toda la habitación.
      const wx = 136 - Math.round(camera.x);
      const wy = 56 - Math.round(camera.y);
      const crimsonTint = st > 2.2;
      const beam = ctx.createRadialGradient(wx, wy, 6, wx, wy, 320);
      beam.addColorStop(
        0,
        crimsonTint
          ? `rgba(255, 210, 235, ${(flash * 0.72).toFixed(3)})`
          : `rgba(196, 238, 255, ${(flash * 0.68).toFixed(3)})`
      );
      beam.addColorStop(
        0.42,
        crimsonTint
          ? `rgba(244, 114, 182, ${(flash * 0.32).toFixed(3)})`
          : `rgba(140, 200, 245, ${(flash * 0.3).toFixed(3)})`
      );
      beam.addColorStop(1, 'rgba(120, 180, 230, 0)');
      ctx.fillStyle = beam;
      ctx.fillRect(0, 0, vw, vh);

      ctx.fillStyle = crimsonTint
        ? `rgba(255, 228, 242, ${(flash * 0.28).toFixed(3)})`
        : `rgba(226, 245, 255, ${(flash * 0.3).toFixed(3)})`;
      ctx.fillRect(0, 0, vw, vh);

      // Rayos bifurcados dibujados dentro del marco de la ventana.
      const strike = Math.max(
        Math.exp(-Math.pow((st - 0.32) / 0.06, 2)),
        Math.exp(-Math.pow((st - 1.35) / 0.06, 2)),
        Math.exp(-Math.pow((st - 2.65) / 0.065, 2)),
        Math.exp(-Math.pow((st - 5.1) / 0.07, 2))
      );
      if (strike > 0.05) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = crimsonTint
          ? `rgba(255, 240, 248, ${(strike * 0.96).toFixed(3)})`
          : `rgba(240, 253, 255, ${(strike * 0.95).toFixed(3)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx0 + 54, wy0 + 2);
        ctx.lineTo(wx0 + 48, wy0 + 14);
        ctx.lineTo(wx0 + 55, wy0 + 16);
        ctx.lineTo(wx0 + 42, wy0 + 38);
        ctx.lineTo(wx0 + 48, wy0 + 40);
        ctx.lineTo(wx0 + 36, wy0 + 58);
        ctx.stroke();
        ctx.strokeStyle = crimsonTint
          ? `rgba(244, 63, 94, ${(strike * 0.58).toFixed(3)})`
          : `rgba(150, 226, 255, ${(strike * 0.5).toFixed(3)})`;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.restore();
      }

      // Destello intenso de impacto.
      const blind = Math.max(
        Math.exp(-Math.pow((st - 0.3) / 0.055, 2)),
        Math.exp(-Math.pow((st - 5.08) / 0.06, 2)) * 0.78
      );
      if (blind > 0.01 && !reducedMotion) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(blind * 0.72).toFixed(3)})`;
        ctx.fillRect(0, 0, vw, vh);
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* SPRITES DE ÁRBOLES DE ISLA NATAL (INTEGRACIÓN AL TERRENO)          */
/* ------------------------------------------------------------------ */

let natalTreeSprite1: HTMLImageElement | null = null;
let natalTreeSprite2: HTMLImageElement | null = null;
let natalTreeBaked1: [HTMLCanvasElement, HTMLCanvasElement] | null = null;
let natalTreeBaked2: [HTMLCanvasElement, HTMLCanvasElement] | null = null;

function bakeIntegratedTreeCanvas(img: HTMLImageElement, flipX: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !img.complete || img.naturalWidth <= 0) return null;
  const size = 88;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const bctx = canvas.getContext('2d');
  if (!bctx) return null;

  bctx.save();
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  if (flipX) {
    bctx.translate(size, 0);
    bctx.scale(-1, 1);
  }
  bctx.drawImage(img, 0, 0, size, size);
  bctx.restore();

  // Tinte direccional de hora dorada idéntico al del terreno (sol cálido siempre desde el oeste)
  bctx.globalCompositeOperation = 'source-atop';
  const sunGrad = bctx.createLinearGradient(0, 0, size, size);
  sunGrad.addColorStop(0, 'rgba(255, 224, 152, 0.14)');
  sunGrad.addColorStop(0.45, 'rgba(255, 236, 190, 0.03)');
  sunGrad.addColorStop(1, 'rgba(16, 48, 40, 0.18)');
  bctx.fillStyle = sunGrad;
  bctx.fillRect(0, 0, size, size);

  // Sombra ambiental en la base de las raíces para fundirse con el suelo húmedo/pradera
  const rootGrad = bctx.createLinearGradient(0, size * 0.78, 0, size);
  rootGrad.addColorStop(0, 'rgba(22, 42, 20, 0)');
  rootGrad.addColorStop(1, 'rgba(22, 42, 20, 0.28)');
  bctx.fillStyle = rootGrad;
  bctx.fillRect(0, size * 0.78, size, size * 0.22);
  bctx.globalCompositeOperation = 'source-over';

  // Limpieza de bordes semitransparentes para evitar halos sobre césped/sendero pixel-art
  const imgData = bctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 42) {
      d[i + 3] = 0;
    } else if (a < 150) {
      d[i + 3] = Math.round(a * 0.85);
    } else {
      d[i + 3] = 255;
    }
  }
  bctx.putImageData(imgData, 0, 0);
  return canvas;
}

function ensureNatalTreeSprites(): [
  [HTMLCanvasElement, HTMLCanvasElement] | null,
  [HTMLCanvasElement, HTMLCanvasElement] | null,
] {
  if (typeof Image === 'undefined') return [null, null];
  if (!natalTreeSprite1) {
    natalTreeSprite1 = new Image();
    natalTreeSprite1.decoding = 'async';
    natalTreeSprite1.src = '/assets/pixelverse/natal-tree-1.png';
  }
  if (!natalTreeSprite2) {
    natalTreeSprite2 = new Image();
    natalTreeSprite2.decoding = 'async';
    natalTreeSprite2.src = '/assets/pixelverse/natal-tree-2.png';
  }
  if (!natalTreeBaked1 && natalTreeSprite1.complete && natalTreeSprite1.naturalWidth > 0) {
    const normal = bakeIntegratedTreeCanvas(natalTreeSprite1, false);
    const flipped = bakeIntegratedTreeCanvas(natalTreeSprite1, true);
    if (normal && flipped) natalTreeBaked1 = [normal, flipped];
  }
  if (!natalTreeBaked2 && natalTreeSprite2.complete && natalTreeSprite2.naturalWidth > 0) {
    const normal = bakeIntegratedTreeCanvas(natalTreeSprite2, false);
    const flipped = bakeIntegratedTreeCanvas(natalTreeSprite2, true);
    if (normal && flipped) natalTreeBaked2 = [normal, flipped];
  }
  return [natalTreeBaked1, natalTreeBaked2];
}

/* ------------------------------------------------------------------ */
/* CUADRO COMPLETO                                                    */
/* ------------------------------------------------------------------ */

export function renderIslaNatalFrame(params: IslaNatalRenderParams): void {
  const {
    ctx,
    vw,
    vh,
    camera,
    elapsed,
    reducedMotion,
    arcadeState,
    charge,
    signalPulse,
    paddleOnGround,
    departureReady,
    particles,
    prompt,
    shockwaves,
    travelerEvent,
  } = params;
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  const animFrame4 = reducedMotion ? 0 : Math.floor(elapsed * 3.2) % 4;
  const camX = Math.round(camera.x);
  const camY = Math.round(camera.y);

  // Fondo de mar profundo (cubre todo el viewport antes de trasladar)
  ctx.fillStyle = '#0a2b46';
  ctx.fillRect(0, 0, vw, vh);

  ctx.save();
  ctx.translate(-camX, -camY);

  drawOcean(ctx, camX, camY, vw, vh, elapsed, animFrame4, charge, reducedMotion);
  drawLandmass(ctx, camX, camY, vw, vh, elapsed);

  // Muelle del Puerto Norte: se dibuja como parte del suelo para que el
  // jugador pueda caminar sobre los tablones sin quedar oculto por la pasarela.
  drawNorthPortDock(ctx, elapsed, departureReady, reducedMotion);
  drawBeachBoardwalk(ctx);

  // Detalle de suelo (matas, flores, guijarros, conchas)
  const sway = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 1.4) * 0.6);
  for (const t of ISLA_NATAL_TUFTS) {
    if (!isWorldBoxVisible(t.x - 6, t.y - 10, 12, 12, camX, camY, vw, vh)) continue;
    if (!isPointOnNatalMeadow(t.x, t.y)) continue;
    drawTuft(ctx, t.x, t.y, t.seed, sway);
  }
  for (const f of ISLA_NATAL_FLOWERS) {
    if (!isWorldBoxVisible(f.x - 4, f.y - 8, 8, 10, camX, camY, vw, vh)) continue;
    if (!isPointOnNatalMeadow(f.x, f.y)) continue;
    drawFlower(ctx, f.x, f.y, f.seed);
  }
  for (const p of ISLA_NATAL_PEBBLES) {
    if (!isWorldBoxVisible(p.x - 4, p.y - 4, 8, 8, camX, camY, vw, vh)) continue;
    drawPebble(ctx, p.x, p.y, p.seed);
  }
  for (const s of ISLA_NATAL_SHELLS) {
    if (!isWorldBoxVisible(s.x - 4, s.y - 4, 8, 8, camX, camY, vw, vh)) continue;
    drawShell(ctx, s.x, s.y, s.seed);
  }

  // Elementos ordenados por profundidad (oclusión correcta con el jugador)
  const ySorted: { sortY: number; draw: () => void }[] = [];
  const [treeSpriteOak, treeSpriteTall] = ensureNatalTreeSprites();

  const drawHandcraftedTreeNatal = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    variant: 'forest' | 'meadow' | 'pine',
    treeIndex: number,
    elapsed: number,
    reducedMotion: boolean
  ) => {
    const x = Math.round(cx);
    const y = Math.round(cy);
    const seed = hash2(x + treeIndex * 17, y - treeIndex * 13);
    const useTallVariant =
      variant === 'pine' ? true : variant === 'meadow' ? false : treeIndex % 2 === 1;
    const spritePair = useTallVariant ? treeSpriteTall : treeSpriteOak;
    const flipped = seed > 0.56;
    const sprite = spritePair ? spritePair[flipped ? 1 : 0] : null;
    const size = Math.round((useTallVariant ? 80 : 84) + (seed - 0.5) * 8);
    const windShear = reducedMotion
      ? 0
      : Math.sin(elapsed * 1.15 + cx * 0.045 + cy * 0.02) * 0.016;
    const shadowShift = Math.round(-windShear * 42);

    ctx.save();
    ctx.translate(x, y);

    // 1. Sombra moteada del dosel proyectada al este-sureste (acorde a palmeras y cabaña)
    ctx.fillStyle = 'rgba(14, 38, 22, 0.16)';
    ctx.beginPath();
    ctx.ellipse(15 + shadowShift, 4, size * 0.42, size * 0.14, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(14, 38, 22, 0.14)';
    ctx.beginPath();
    ctx.ellipse(24 + shadowShift, 1, size * 0.25, size * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Lecho de tierra húmeda, musgo y oclusión de contacto donde nacen las raíces
    ctx.fillStyle = 'rgba(26, 54, 24, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 3, size * 0.27, size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(58, 38, 20, 0.38)';
    ctx.fillRect(-13, 1, 26, 4);
    ctx.fillStyle = '#366b31';
    ctx.fillRect(-16, 0, 8, 2);
    ctx.fillRect(9, 1, 8, 2);

    // 3. Árbol integrado a resolución pixel-art del mundo (imageSmoothingEnabled = false)
    if (sprite) {
      ctx.save();
      ctx.translate(0, 6);
      ctx.transform(1, 0, windShear, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sprite, Math.round(-size * 0.5), Math.round(-size * 0.94), size, size);
      ctx.restore();
    } else {
      ctx.fillStyle = '#4a2a14';
      ctx.fillRect(-5, -14, 10, 16);
      ctx.fillStyle = '#1f6a34';
      ctx.beginPath();
      ctx.ellipse(0, -34, 24, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Briznas nativas de la pradera y hojarasca que abrazan las raíces por delante
    const grassOffsets = [-17, -11, -5, 2, 8, 14];
    for (let gi = 0; gi < grassOffsets.length; gi++) {
      const gx = grassOffsets[gi] + Math.round((hash2(x + gi * 11, y - gi * 7) - 0.5) * 3);
      const gy = 3 + (gi % 2);
      const gh = 3 + ((gi + treeIndex) % 3);
      ctx.fillStyle = gi % 2 === 0 ? '#356f36' : '#3d7c3c';
      ctx.fillRect(gx - 1, gy - gh + 1, 2, gh);
      ctx.fillStyle = gi % 3 === 0 ? '#79c96a' : '#589c48';
      ctx.fillRect(gx + sway, gy - gh, 1, gh - 1);
    }
    // Hojas caídas al pie del árbol
    ctx.fillStyle = '#89b84a';
    ctx.fillRect(-19 + (treeIndex % 4), 5, 2, 1);
    ctx.fillRect(15 - (treeIndex % 3), 6, 2, 1);
    ctx.fillStyle = '#c49645';
    ctx.fillRect(6 + (treeIndex % 5), 6, 2, 1);

    ctx.restore();
  };

  for (let ti = 0; ti < ISLA_NATAL_TREES.length; ti++) {
    const tree = ISLA_NATAL_TREES[ti];
    if (!isWorldBoxVisible(tree.x - 48, tree.y - 92, 96, 108, camX, camY, vw, vh)) continue;
    ySorted.push({
      sortY: tree.y + 10,
      draw: () =>
        drawHandcraftedTreeNatal(ctx, tree.x, tree.y, tree.variant, ti, elapsed, reducedMotion),
    });
  }
  for (const p of ISLA_NATAL_PALMS) {
    if (!isWorldBoxVisible(p.x - 56, p.y - 116, 112, 130, camX, camY, vw, vh)) continue;
    ySorted.push({ sortY: p.y + 4, draw: () => drawPalm(ctx, p.x, p.y, p.seed, elapsed, reducedMotion) });
  }
  for (const b of ISLA_NATAL_BOULDERS) {
    if (!isWorldBoxVisible(b.x - 24, b.y - 30, 48, 38, camX, camY, vw, vh)) continue;
    ySorted.push({ sortY: b.y, draw: () => drawBoulder(ctx, b.x, b.y, b.seed) });
  }
  for (const b of NATAL_BUSHES) {
    if (!isWorldBoxVisible(b.x - 22, b.y - 26, 44, 34, camX, camY, vw, vh)) continue;
    ySorted.push({ sortY: b.y + 2, draw: () => drawBush(ctx, b.x, b.y, b.seed, elapsed, reducedMotion) });
  }

  // Peñascos, tronco y rocas costeras que dan cuerpo a los bloqueos del mapa.
  for (const solid of ISLA_NATAL_SOLIDS) {
    if (solid.id === 'cabana' || solid.id === 'cobertizo') continue;
    if (!isWorldBoxVisible(solid.x - 16, solid.y - 26, solid.w + 32, solid.h + 36, camX, camY, vw, vh)) {
      continue;
    }
    const seed = hash2(solid.x + 3, solid.y - 7);
    if (solid.id === 'tronco') {
      ySorted.push({
        sortY: solid.y + solid.h,
        draw: () => drawFallenLog(ctx, solid.x, solid.y, solid.w, solid.h, seed),
      });
    } else {
      ySorted.push({
        sortY: solid.y + solid.h,
        draw: () => drawRockOutcrop(ctx, solid.x, solid.y, solid.w, solid.h, seed),
      });
    }
  }

  ySorted.push({ sortY: HUT_POS.y + 96, draw: () => drawHut(ctx, elapsed, reducedMotion) });
  ySorted.push({ sortY: SHED_POS.y + 124, draw: () => drawShed(ctx, elapsed, arcadeState, reducedMotion) });
  for (const sign of ISLA_NATAL_SIGNS) {
    if (!isWorldBoxVisible(sign.x - 20, sign.y - 30, 40, 40, camX, camY, vw, vh)) continue;
    ySorted.push({
      sortY: sign.y + 1,
      draw: () => {
        const signOnSand = !isPointOnNatalMeadow(sign.x, sign.y) && !(sign.x < 590 && sign.y < 544);
        if (signOnSand) {
          ctx.fillStyle = 'rgba(104, 72, 36, 0.32)';
          ctx.beginPath();
          ctx.ellipse(sign.x + 2, sign.y + 1, 9, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        drawGbcWoodenSign(ctx, sign.x, sign.y);
        if (signOnSand) {
          ctx.fillStyle = 'rgba(220, 186, 132, 0.72)';
          ctx.fillRect(sign.x - 5, sign.y - 1, 10, 2);
          ctx.fillStyle = 'rgba(246, 222, 176, 0.48)';
          ctx.fillRect(sign.x - 4, sign.y - 1, 5, 1);
        }
      },
    });
  }
  ySorted.push({ sortY: SIGN_POS.y + 2, draw: () => drawSign(ctx) });
  ySorted.push({ sortY: NET_POS.y + 8, draw: () => drawNet(ctx, elapsed) });
  ySorted.push({ sortY: SHELLS_POI_POS.y + 8, draw: () => drawShellCluster(ctx, elapsed) });
  ySorted.push({ sortY: MAILBOX_POS.y + 1, draw: () => drawMailbox(ctx) });
  if (isWorldBoxVisible(MIRADOR_POS.x - 64, MIRADOR_POS.y - 40, 128, 52, camX, camY, vw, vh)) {
    ySorted.push({
      sortY: MIRADOR_POS.y + 2,
      draw: () => drawAltoMirador(ctx, elapsed, reducedMotion),
    });
  }
  if (paddleOnGround) {
    ySorted.push({
      sortY: CABINET_POS.y + 24,
      draw: () => drawPaddleItem(ctx, elapsed, reducedMotion),
    });
  }
  if (travelerEvent && travelerEvent.phase !== 'storm') {
    const phase = travelerEvent.phase;
    const tt = travelerEvent.t;
    const site = ISLA_NATAL_TRAVELER_SITE;
    let lift = 0;
    if (phase === 'arrival') {
      lift = 240 * (1 - smoothstep(tt / 2.4));
    } else if (phase === 'departure') {
      lift = 260 * smoothstep(tt / 2.0);
    }
    const landed = lift < 1.5;
    ySorted.push({
      sortY: site.y + 2,
      draw: () => {
        if (lift < 40) drawLandingScorch(ctx, site.x, site.y, elapsed);
        drawTravelerShip(ctx, site.x, site.y, lift, elapsed, reducedMotion, landed);
      },
    });

    if (phase === 'descend' || phase === 'talk' || phase === 'board') {
      const doorX = site.x - DOOR_OFFSET;
      const talkX = site.x - TALK_OFFSET;
      let px = talkX;
      let walking = false;
      if (phase === 'descend') {
        const p = clamp01(tt / 1.7);
        px = doorX + (talkX - doorX) * smoothstep(p);
        walking = p > 0.08 && p < 0.95;
      } else if (phase === 'board') {
        const p = clamp01(tt / 1.4);
        px = talkX + (doorX - talkX) * smoothstep(p);
        walking = p > 0.08 && p < 0.95;
      }
      ySorted.push({
        sortY: site.y + 4,
        draw: () => drawFutureTraveler(ctx, px, site.y, elapsed, -1, walking),
      });
    }
  }

  ySorted.push({ sortY: params.player.y + 4, draw: () => drawPlayer(ctx, params, elapsed) });

  ySorted.sort((a, b) => a.sortY - b.sortY);
  for (const item of ySorted) item.draw();

  // Partículas (polen, chispas de la señal)
  for (const pt of particles) {
    const a = Math.max(0, Math.min(1, pt.life / pt.maxLife));
    ctx.globalAlpha = a;
    ctx.fillStyle = pt.color;
    ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  drawAmbientLife(ctx, camX, camY, vw, vh, elapsed, reducedMotion);

  drawDepartureBeacon(ctx, elapsed, departureReady, reducedMotion);

  // Ondas de choque de la anomalía sobre el mar
  if (shockwaves.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const sw of shockwaves) {
      const t = sw.t / sw.life;
      const r = 20 + t * 1500;
      ctx.strokeStyle = `rgba(180, 245, 255, ${(0.55 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth = 6 - t * 4;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(0, 243, 255, ${(0.3 * (1 - t)).toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, r * 0.72, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Luz ambiental: farol de la cabaña, resplandor del cobertizo y sol poniente
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const pools: { x: number; y: number; r: number; rgba: string }[] = [
    { x: HUT_POS.x + 96, y: HUT_POS.y + 52, r: 74, rgba: 'rgba(255, 178, 92, 0.16)' },
    { x: MAILBOX_POS.x, y: MAILBOX_POS.y - 24, r: 40, rgba: 'rgba(255, 214, 140, 0.1)' },
  ];

  if (arcadeState !== 'dusty') {
    const intensity = arcadeState === 'won' ? 0.3 + signalPulse * 0.35 : 0.18 + charge * 0.16;
    pools.push({
      x: ISLA_NATAL_ARCADE_ANCHOR.x,
      y: ISLA_NATAL_ARCADE_ANCHOR.y - 46,
      r: 150,
      rgba: `rgba(0, 243, 255, ${intensity.toFixed(3)})`,
    });
  }

  for (const pool of pools) {
    const g = ctx.createRadialGradient(pool.x, pool.y, 2, pool.x, pool.y, pool.r);
    g.addColorStop(0, pool.rgba);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(pool.x - pool.r, pool.y - pool.r, pool.r * 2, pool.r * 2);
  }

  // Sol bajo al oeste: baño cálido sobre la isla
  const sunX = 120;
  const sunY = 420;
  const sun = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 1500);
  sun.addColorStop(0, 'rgba(255, 196, 120, 0.26)');
  sun.addColorStop(0.35, 'rgba(255, 168, 100, 0.1)');
  sun.addColorStop(1, 'rgba(255, 150, 90, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(camX, camY, vw, vh);
  ctx.restore();

  // Corrupción de señal en el cielo de la isla durante la anomalía
  if (signalPulse > 0.02) {
    ctx.save();
    const bands = 5;
    for (let i = 0; i < bands; i++) {
      const n = hash2(Math.floor(elapsed * 9) + i * 31, i);
      if (n < 0.45) continue;
      const by = camY + n * vh;
      const bh = 2 + Math.floor(n * 6);
      ctx.globalAlpha = 0.28 * signalPulse;
      ctx.fillStyle = i % 2 === 0 ? '#67e8f9' : '#f0abfc';
      ctx.fillRect(camX + (n * 80) % 120, by, vw, bh);
    }
    ctx.restore();
  }

  if (prompt) {
    drawPromptBadge(ctx, prompt, animFrame4 % 2 === 0 ? 0 : -2);
  }

  // Pájaros sobre la isla (se dispersan con la señal)
  ctx.save();
  const birdScatter = signalPulse > 0.3 ? 2.4 : 1;
  for (let i = 0; i < 3; i++) {
    const bt = elapsed * 0.06 * birdScatter + i * 0.33;
    const bx = ISLA_NATAL_WORLD_W * 0.5 + Math.cos(bt * (1 + i * 0.2)) * (420 + i * 90);
    const by = ISLA_NATAL_WORLD_H * 0.42 + Math.sin(bt * 1.6) * 210;
    if (!isWorldBoxVisible(bx - 10, by - 6, 20, 12, camX, camY, vw, vh)) continue;
    const flap = reducedMotion ? 0 : Math.round(Math.sin(elapsed * 9 + i * 2) * 1.6);
    ctx.fillStyle = 'rgba(226, 240, 250, 0.85)';
    ctx.fillRect(Math.round(bx) - 3, Math.round(by) - flap, 2, 2);
    ctx.fillRect(Math.round(bx) + 1, Math.round(by) - flap, 2, 2);
    ctx.fillRect(Math.round(bx) - 1, Math.round(by), 2, 1);
    ctx.fillStyle = 'rgba(20, 40, 60, 0.22)';
    ctx.fillRect(Math.round(bx) - 14, Math.round(by) + 26, 5, 2);
  }
  ctx.restore();

  ctx.restore();

  // Viñeta suave en espacio de pantalla
  const vig = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.36, vw / 2, vh / 2, Math.max(vw, vh) * 0.8);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(4, 10, 20, 0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, vw, vh);

  // Neblina cálida del atardecer y frescor del mar en el borde inferior
  const haze = ctx.createLinearGradient(0, 0, 0, vh);
  haze.addColorStop(0, 'rgba(255, 190, 126, 0.13)');
  haze.addColorStop(0.42, 'rgba(255, 172, 114, 0.05)');
  haze.addColorStop(0.78, 'rgba(90, 120, 170, 0.04)');
  haze.addColorStop(1, 'rgba(52, 46, 96, 0.13)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, vw, vh);

  // Rayo de sol rasante desde el oeste (sutil, acompaña al sol del mapa)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ray = ctx.createLinearGradient(0, vh * 0.18, vw * 0.7, vh * 0.82);
  ray.addColorStop(0, 'rgba(255, 200, 130, 0.07)');
  ray.addColorStop(1, 'rgba(255, 160, 100, 0)');
  ctx.fillStyle = ray;
  ctx.fillRect(0, 0, vw, vh);
  ctx.restore();

  // Bloom localizado del sol bajo. Puramente atmosférico: no toca objetos,
  // colisiones ni lectura, y sólo se pinta si el sol entra en cuadro.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sunSX = 120 - camX;
  const sunSY = 420 - camY;
  if (sunSX > -360 && sunSX < vw + 360 && sunSY > -360 && sunSY < vh + 360) {
    const bloom = ctx.createRadialGradient(sunSX, sunSY, 4, sunSX, sunSY, 340);
    bloom.addColorStop(0, 'rgba(255, 232, 176, 0.14)');
    bloom.addColorStop(0.38, 'rgba(255, 198, 126, 0.06)');
    bloom.addColorStop(1, 'rgba(255, 168, 100, 0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(sunSX - 340, sunSY - 340, 680, 680);
  }
  ctx.restore();

  // Tormenta de la llegada: el cielo se oscurece y se parte en destellos.
  if (travelerEvent?.phase === 'storm') {
    const st = travelerEvent.t;
    ctx.fillStyle = `rgba(8, 16, 28, ${(0.34 * Math.min(1, st / 0.5)).toFixed(3)})`;
    ctx.fillRect(0, 0, vw, vh);

    const gaussian = (center: number, spread: number) => {
      const d = (st - center) / spread;
      return Math.exp(-d * d);
    };
    const flash = Math.max(
      gaussian(0.3, 0.11),
      gaussian(1.05, 0.13),
      gaussian(1.9, 0.16)
    );
    if (flash > 0.01) {
      ctx.fillStyle = `rgba(226, 245, 255, ${(flash * 0.62).toFixed(3)})`;
      ctx.fillRect(0, 0, vw, vh);
    }
  }
}
