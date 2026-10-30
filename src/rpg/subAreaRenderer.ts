/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Renderizador pixel-art cenital para Interiores Accesibles, Salas tras Paredes Falsas,
 * Grutas Subterráneas con Iluminación Dinámica (Lámpara de Fósforo) y la
 * Isla Neón 1980s (Muelle de las Vigas Rojas).
 */

import {
  drawGuardianCreatureSprite,
  drawPixelAvatar4Dir,
  drawRpgTreasureChest,
  IslandPickupBurst,
  IslandPromptRenderSpec,
} from '../island/island70sRenderer';
import { MUSEUM_1970S_EXHIBITS } from '../memories/historicalCatalog';
import { PixelverseProgressState } from '../memories/progressionState';
import type { AvatarAppearance } from '../avatar/avatarOptions';
import {
  evaluateTimeMachineStatus,
  FacingDirection,
  GUARDIAN_CREATURES,
  LABYRINTH_RGB_PILLARS,
  LABYRINTH_SECRET_DOOR,
  RPG_CHESTS,
  RPG_EXAMINABLES,
  RPG_SUBAREA_NPCS,
  SubAreaSpec,
} from './rpgContent';

export interface CastleBossCombatState {
  phase: number;
  bossHp: number;
  maxHp: number;
  dkPos: { x: number; y: number };
  barrels: { x: number; y: number; vx: number; angle: number }[];
  shockwaves: { x: number; y: number; r: number; maxR: number; alpha: number }[];
  conduitOverloads: [boolean, boolean];
  dkPurified: boolean;
  attackTimer?: number;
}

export interface SubAreaRenderParams {
  ctx: CanvasRenderingContext2D;
  vw: number;
  vh: number;
  area: SubAreaSpec;
  elapsed: number;
  reducedMotion: boolean;
  player: {
    x: number;
    y: number;
    facingDir: FacingDirection;
    walking: boolean;
    sprinting: boolean;
    interactAnim: number;
  };
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  appearance: AvatarAppearance;
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  steppedTileOrder: number[];
  activeRgbPillars?: number[];
  pickupBursts: IslandPickupBurst[];
  prompt: IslandPromptRenderSpec | null;
  scannerPulse: { active: boolean; elapsed: number };
  bossCombatState?: CastleBossCombatState;
}

/**
 * Muro de casa-biblioteca: papel damasco burdeos, zócalo de nogal tallado con
 * filete dorado, ventanas arqueadas con cortinas de terciopelo, apliques de
 * pared con luz cálida, cornisa y marco de madera en los laterales.
 */
function drawLibraryHouseWall(
  ctx: CanvasRenderingContext2D,
  area: { width: number; height: number },
  wb: { x: number; y: number; w: number; h: number },
  elapsed: number,
  reducedMotion: boolean
): void {
  const wallH = wb.y;
  const flicker = reducedMotion ? 1 : 0.9 + Math.sin(elapsed * 7) * 0.05 + Math.sin(elapsed * 13) * 0.03;

  // Papel pintado damasco: franjas verticales con motivos de flor de lis.
  ctx.fillStyle = '#4e2326';
  ctx.fillRect(0, 0, area.width, wallH);
  for (let wx = 0; wx < area.width; wx += 32) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
    ctx.fillRect(wx, 0, 16, wallH);
    ctx.fillStyle = 'rgba(255, 214, 160, 0.05)';
    ctx.fillRect(wx + 16, 0, 1, wallH);
  }
  for (let wy = 12; wy < wallH - 36; wy += 22) {
    for (let wx = 8; wx < area.width; wx += 32) {
      const dx = wx + (Math.floor(wy / 22) % 2) * 16;
      ctx.fillStyle = 'rgba(214, 160, 96, 0.28)';
      ctx.fillRect(dx, wy, 2, 6);
      ctx.fillRect(dx - 2, wy + 2, 6, 2);
      ctx.fillRect(dx - 1, wy + 6, 4, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(dx + 1, wy + 1, 1, 6);
    }
  }

  // Cornisa superior con dentellones.
  ctx.fillStyle = '#1a0d08';
  ctx.fillRect(0, 0, area.width, 10);
  ctx.fillStyle = '#6a3e22';
  ctx.fillRect(0, 0, area.width, 7);
  ctx.fillStyle = '#b07a42';
  ctx.fillRect(0, 0, area.width, 2);
  ctx.fillStyle = '#3a2012';
  for (let cx = 2; cx < area.width; cx += 8) ctx.fillRect(cx, 7, 4, 3);
  ctx.fillStyle = '#e0b860';
  ctx.fillRect(0, 10, area.width, 1);

  // Zócalo de nogal con paneles biselados y filete dorado.
  const baseH = 30;
  const baseTop = wallH - baseH;
  ctx.fillStyle = '#140a05';
  ctx.fillRect(0, baseTop, area.width, baseH);
  ctx.fillStyle = '#3a2112';
  ctx.fillRect(0, baseTop + 3, area.width, baseH - 3);
  for (let px = 10; px < area.width - 20; px += 40) {
    ctx.fillStyle = '#1e0f07';
    ctx.fillRect(px, baseTop + 7, 32, baseH - 12);
    ctx.fillStyle = '#5a3620';
    ctx.fillRect(px + 1, baseTop + 8, 30, baseH - 14);
    ctx.fillStyle = '#442714';
    ctx.fillRect(px + 3, baseTop + 10, 26, baseH - 18);
    ctx.fillStyle = 'rgba(255, 220, 160, 0.14)';
    ctx.fillRect(px + 1, baseTop + 8, 30, 1);
  }
  ctx.fillStyle = '#c99a4a';
  ctx.fillRect(0, baseTop, area.width, 2);
  ctx.fillStyle = '#f0d078';
  ctx.fillRect(0, baseTop, area.width, 1);
  ctx.fillStyle = '#8a5a2c';
  ctx.fillRect(0, wallH - 4, area.width, 4);
  ctx.fillStyle = '#0c0603';
  ctx.fillRect(0, wallH - 1, area.width, 1);

  // Ventanas arqueadas con cortinas de terciopelo granate.
  const windows = [area.width * 0.3, area.width * 0.7];
  windows.forEach((wc) => {
    if (wc < 70 || wc > area.width - 70) return;
    const wx = Math.round(wc - 24);
    const wy = 20;
    const ww = 48;
    const wh = baseTop - wy - 6;
    ctx.fillStyle = '#120804';
    ctx.fillRect(wx - 4, wy - 3, ww + 8, wh + 7);
    ctx.fillStyle = '#7a4a28';
    ctx.fillRect(wx - 3, wy - 2, ww + 6, wh + 5);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#2a3f70');
    sky.addColorStop(0.6, '#e0a45c');
    sky.addColorStop(1, '#f6d58a');
    ctx.fillStyle = sky;
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh);
    ctx.lineTo(wx, wy + 16);
    ctx.quadraticCurveTo(wx + ww / 2, wy - 10, wx + ww, wy + 16);
    ctx.lineTo(wx + ww, wy + wh);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4a2a14';
    ctx.fillRect(wx + ww / 2 - 1, wy + 2, 2, wh - 2);
    ctx.fillRect(wx, wy + Math.floor(wh * 0.5), ww, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(wx + 4, wy + 14, 5, wh - 18);
    ctx.fillStyle = '#1a0d08';
    ctx.fillRect(wx - 6, wy + wh, ww + 12, 5);
    ctx.fillStyle = '#a06a38';
    ctx.fillRect(wx - 5, wy + wh, ww + 10, 2);
    for (const side of [-1, 1]) {
      const cx0 = side < 0 ? wx - 12 : wx + ww - 2;
      ctx.fillStyle = '#5a0f1c';
      ctx.fillRect(cx0, wy - 4, 14, wh + 4);
      ctx.fillStyle = '#8a1c2e';
      for (let fx = 0; fx < 14; fx += 4) ctx.fillRect(cx0 + fx, wy - 2, 2, wh);
      ctx.fillStyle = '#2e0610';
      for (let fx = 2; fx < 14; fx += 4) ctx.fillRect(cx0 + fx, wy - 2, 1, wh);
      ctx.fillStyle = '#e0b860';
      ctx.fillRect(cx0, wy + Math.floor(wh * 0.55), 14, 3);
    }
    ctx.fillStyle = '#c99a4a';
    ctx.fillRect(wx - 16, wy - 8, ww + 32, 4);
    ctx.fillStyle = '#f0d078';
    ctx.fillRect(wx - 16, wy - 8, ww + 32, 1);
    ctx.fillStyle = '#7a1424';
    ctx.fillRect(wx - 12, wy - 4, ww + 24, 5);
  });

  // Apliques de pared con pantalla de cristal y halo cálido.
  const sconceXs = [area.width * 0.5, area.width * 0.12, area.width * 0.88];
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  sconceXs.forEach((sx) => {
    const g = ctx.createRadialGradient(sx, 54, 2, sx, 54, 52);
    g.addColorStop(0, `rgba(255, 196, 110, ${(0.3 * flicker).toFixed(2)})`);
    g.addColorStop(1, 'rgba(255, 170, 80, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 52, 4, 104, 104);
  });
  ctx.restore();
  sconceXs.forEach((sx) => {
    const x = Math.round(sx);
    ctx.fillStyle = '#c99a4a';
    ctx.fillRect(x - 3, 58, 6, 4);
    ctx.fillRect(x - 1, 50, 2, 8);
    ctx.fillStyle = `rgba(255, 226, 150, ${flicker.toFixed(2)})`;
    ctx.fillRect(x - 4, 40, 8, 10);
    ctx.fillStyle = '#fff6d0';
    ctx.fillRect(x - 1, 42, 2, 6);
    ctx.fillStyle = '#8a5a2c';
    ctx.fillRect(x - 5, 38, 10, 3);
  });

  // Laterales del recinto: marco de madera oscura con vetas.
  const sideRects = [
    { x: 0, y: wallH, w: wb.x, h: area.height - wallH },
    { x: wb.x + wb.w, y: wallH, w: area.width - (wb.x + wb.w), h: area.height - wallH },
    { x: wb.x, y: wb.y + wb.h, w: wb.w, h: area.height - (wb.y + wb.h) },
  ];
  for (const r of sideRects) {
    if (r.w <= 0 || r.h <= 0) continue;
    ctx.fillStyle = '#26150b';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#3c2212';
    for (let ly = r.y + 3; ly < r.y + r.h; ly += 9) ctx.fillRect(r.x, ly, r.w, 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    for (let lx = r.x + 7; lx < r.x + r.w; lx += 23) ctx.fillRect(lx, r.y, 1, r.h);
  }

  // Motas de polvo dorado flotando en la luz de las ventanas.
  if (!reducedMotion) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    windows.forEach((wc, wi) => {
      for (let p = 0; p < 7; p++) {
        const px = wc + Math.sin(elapsed * 1.2 + p * 1.9 + wi) * 26 + (p * 7 - 20);
        const py = wb.y + ((elapsed * 10 + p * 41) % (wb.h * 0.7));
        ctx.fillStyle = 'rgba(255, 224, 150, 0.35)';
        ctx.fillRect(px, py, 2, 2);
      }
    });
    ctx.restore();
  }
}


function drawSubAreaWallsAndFloor(
  ctx: CanvasRenderingContext2D,
  area: {
    id: string;
    width: number;
    height: number;
    wallHex: string;
    borderHex: string;
    floorHex: string;
    floorGridHex: string;
  },
  wb: { x: number; y: number; w: number; h: number },
  elapsed: number,
  reducedMotion: boolean
): void {
  if (area.id === 'interior-sala-cuatro-caminos') {
    drawCuatroCaminosArcadeShell(
      ctx,
      area as SubAreaSpec,
      wb,
      elapsed,
      reducedMotion
    );
    return;
  }

  const isHouseInterior =
    area.id.startsWith('interior-') ||
    area.id.startsWith('secret-');
  const isLibraryHouse =
    area.id === 'interior-centro-historia' ||
    area.id === 'interior-archivo-norte';
  const isStoneHall =
    area.id === 'interior-museo-viviente' ||
    area.id === 'interior-templo-pioneros' ||
    area.id === 'interior-cronoscopio';

  // 1. Muros perimetrales y fondo
  ctx.fillStyle = area.wallHex;
  ctx.fillRect(0, 0, area.width, area.height);

  if (isLibraryHouse) {
    drawLibraryHouseWall(ctx, area, wb, elapsed, reducedMotion);
  } else if (isStoneHall) {
    const wallH = wb.y;
    const flicker = reducedMotion ? 1 : 0.9 + Math.sin(elapsed * 6) * 0.05;
    ctx.fillStyle = '#4e4a44';
    ctx.fillRect(0, 0, area.width, wallH);
    for (let row = 0, ry = 12; ry < wallH - 8; row++, ry += 10) {
      const odd = row % 2;
      for (let sx = odd ? -8 : 0; sx < area.width; sx += 18) {
        const n = (sx * 17 + ry * 11) % 100;
        ctx.fillStyle = n > 70 ? '#8d867a' : n > 40 ? '#746d62' : '#635c52';
        ctx.fillRect(sx + 1, ry, 16, 8);
        ctx.fillStyle = 'rgba(230, 220, 200, 0.14)';
        ctx.fillRect(sx + 1, ry, 14, 1);
        ctx.fillStyle = 'rgba(20, 16, 12, 0.28)';
        ctx.fillRect(sx + 1, ry + 7, 16, 1);
      }
    }
    ctx.fillStyle = '#2a2218';
    ctx.fillRect(0, 0, area.width, 10);
    ctx.fillStyle = '#c4b08a';
    ctx.fillRect(0, 10, area.width, 3);
    ctx.fillStyle = '#3a3228';
    ctx.fillRect(0, wallH - 22, area.width, 22);
    ctx.fillStyle = '#c4b08a';
    ctx.fillRect(0, wallH - 22, area.width, 2);
    for (let px = 12; px < area.width; px += 28) {
      ctx.fillStyle = '#2a2218';
      ctx.fillRect(px, wallH - 18, 22, 14);
      ctx.fillStyle = '#5a5044';
      ctx.fillRect(px + 1, wallH - 17, 20, 12);
    }
    const cols = [90, area.width - 90];
    cols.forEach((cx) => {
      ctx.fillStyle = '#9aa3ae';
      ctx.fillRect(cx - 10, 18, 20, wallH - 18);
      ctx.fillStyle = '#d5dce4';
      ctx.fillRect(cx - 10, 18, 4, wallH - 18);
      ctx.fillStyle = '#c4b08a';
      ctx.fillRect(cx - 14, 16, 28, 6);
      ctx.fillRect(cx - 14, wallH - 10, 28, 8);
    });
    const winCenters = [area.width * 0.32, area.width * 0.68];
    winCenters.forEach((wc) => {
      const wx = Math.round(wc - 18);
      ctx.fillStyle = '#1a140c';
      ctx.fillRect(wx, 22, 36, 40);
      ctx.fillStyle = '#c4b08a';
      ctx.fillRect(wx + 2, 24, 32, 36);
      const sky = ctx.createLinearGradient(0, 24, 0, 60);
      sky.addColorStop(0, '#243656');
      sky.addColorStop(1, '#e8b86a');
      ctx.fillStyle = sky;
      ctx.fillRect(wx + 5, 28, 26, 28);
      ctx.fillStyle = '#3a2a18';
      ctx.fillRect(wx + 16, 28, 2, 28);
      ctx.fillRect(wx + 5, 42, 26, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(wx + 7, 30, 6, 8);
    });
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    [area.width * 0.2, area.width * 0.5, area.width * 0.8].forEach((sx) => {
      const g = ctx.createRadialGradient(sx, 48, 2, sx, 48, 46);
      g.addColorStop(0, `rgba(255, 190, 100, ${(0.28 * flicker).toFixed(2)})`);
      g.addColorStop(1, 'rgba(255, 190, 100, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 46, 4, 92, 90);
    });
    ctx.restore();
    const sideRects = [
      { x: 0, y: wallH, w: wb.x, h: area.height - wallH },
      { x: wb.x + wb.w, y: wallH, w: area.width - (wb.x + wb.w), h: area.height - wallH },
      { x: wb.x, y: wb.y + wb.h, w: wb.w, h: area.height - (wb.y + wb.h) },
    ];
    for (const r of sideRects) {
      if (r.w <= 0 || r.h <= 0) continue;
      ctx.fillStyle = '#2c2822';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      for (let ly = r.y; ly < r.y + r.h; ly += 10) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(r.x, ly, r.w, 1);
      }
    }
  } else if (isHouseInterior) {
    const wallH = wb.y;

    // Fondo de pared: Tono cálido base de yeso/madera estilo GBA 16-bits
    ctx.fillStyle = '#2b1b13';
    ctx.fillRect(0, 0, area.width, wallH);

    // Papel pintado / Paneles de yeso con textura vertical y micro-imperfecciones
    for (let wx = 12; wx < area.width; wx += 24) {
      ctx.fillStyle = (wx % 48 === 0) ? 'rgba(254, 243, 199, 0.06)' : 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(wx, 10, 12, wallH - 24);
      // Moteado sutil de textura de pared
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(wx + 2, 16 + (wx % 9), 3, wallH - 36);
    }

    // Ventanas artesanales con marco de madera y cristales emplomados
    const winCenters = [area.width * 0.28, area.width * 0.72];
    winCenters.forEach((wc) => {
      if (wc > 60 && wc < area.width - 60) {
        const winX = Math.round(wc - 20);
        const winY = 14;
        const winW = 40;
        const winH = 34;

        // Marco exterior de madera nogal
        ctx.fillStyle = '#1b0e07';
        ctx.fillRect(winX - 2, winY - 2, winW + 4, winH + 4);
        ctx.fillStyle = '#422513';
        ctx.fillRect(winX, winY, winW, winH);

        // Cristales emplomados con reflejo de cielo
        ctx.fillStyle = '#0e2338';
        ctx.fillRect(winX + 3, winY + 3, 15, 12);
        ctx.fillRect(winX + 22, winY + 3, 15, 12);
        ctx.fillRect(winX + 3, winY + 18, 15, 13);
        ctx.fillRect(winX + 22, winY + 18, 15, 13);

        ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.fillRect(winX + 4, winY + 4, 6, 6);
        ctx.fillRect(winX + 23, winY + 4, 6, 6);

        // Alféizar de madera con sombra
        ctx.fillStyle = '#1b0e07';
        ctx.fillRect(winX - 4, winY + winH, winW + 8, 4);
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(winX - 3, winY + winH, winW + 6, 2);
      }
    });

    // Zócalo de madera nogal tallada con moldura de relieve (Chair Rail & Wainscoting)
    const baseH = 28;
    const baseTop = wallH - baseH;
    ctx.fillStyle = '#120a06'; // Sombra de fondo
    ctx.fillRect(0, baseTop, area.width, baseH);
    ctx.fillStyle = '#3d2314'; // Madera nogal principal
    ctx.fillRect(0, baseTop + 2, area.width, baseH - 2);

    // Paneles tallados del zócalo
    for (let px = 16; px < area.width; px += 36) {
      ctx.fillStyle = '#22130a';
      ctx.fillRect(px, baseTop + 6, 28, baseH - 10);
      ctx.fillStyle = '#5c381f';
      ctx.fillRect(px + 1, baseTop + 7, 26, baseH - 12);
      ctx.fillStyle = '#2b180d';
      ctx.fillRect(px + 3, baseTop + 9, 22, baseH - 16);
    }

    // Moldura superior e inferior biselada (Chair rail molding)
    ctx.fillStyle = '#854f2a';
    ctx.fillRect(0, baseTop, area.width, 3);
    ctx.fillStyle = '#b87848';
    ctx.fillRect(0, baseTop, area.width, 1);
    ctx.fillStyle = '#190d07';
    ctx.fillRect(0, baseTop + 3, area.width, 1);

    ctx.fillStyle = '#7a4826';
    ctx.fillRect(0, wallH - 3, area.width, 3);
    ctx.fillStyle = '#0f0804';
    ctx.fillRect(0, wallH - 1, area.width, 1);

    // Vigas vistas de madera maciza en el techo con veteado y sombras proyectadas
    for (let bx = 64; bx < area.width; bx += 120) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(bx - 12, 0, 24, wallH);
      ctx.fillStyle = '#1f1109';
      ctx.fillRect(bx - 9, 0, 18, wallH);
      ctx.fillStyle = '#4a2b16';
      ctx.fillRect(bx - 7, 0, 14, wallH);
      ctx.fillStyle = '#7a4b2a';
      ctx.fillRect(bx - 7, 0, 3, wallH); // Brillo de canto
      // Vetas de madera en la viga
      ctx.fillStyle = '#2d180b';
      for (let vy = 12; vy < wallH - 10; vy += 20) {
        ctx.fillRect(bx - 4, vy, 8, 2);
      }
    }

    // Haces de luz solar diagonal (Dusty Sunbeams) con partículas de polvo flotante
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lightG = ctx.createLinearGradient(0, 0, 0, area.height);
    lightG.addColorStop(0, 'rgba(254, 240, 138, 0.14)');
    lightG.addColorStop(0.5, 'rgba(254, 240, 138, 0.04)');
    lightG.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lightG;

    winCenters.forEach((wc) => {
      ctx.beginPath();
      ctx.moveTo(wc - 20, 18);
      ctx.lineTo(wc + 20, 18);
      ctx.lineTo(wc + 85, wb.y + wb.h * 0.7);
      ctx.lineTo(wc - 45, wb.y + wb.h * 0.7);
      ctx.closePath();
      ctx.fill();

      // Motes de polvo dorados bailando en el haz de luz
      for (let p = 0; p < 6; p++) {
        const px = wc + Math.sin(elapsed * 1.5 + p * 1.7) * 22 + (p * 8 - 20);
        const py = wb.y + ((elapsed * 12 + p * 45) % (wb.h * 0.65));
        ctx.fillStyle = 'rgba(254, 240, 138, 0.4)';
        ctx.fillRect(px, py, 2, 2);
      }
    });
    ctx.restore();
  } else {
    ctx.strokeStyle = area.borderHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, area.width - 8, area.height - 8);
  }

  // 2. Suelo cuadriculado / Parquet / Terracota
  ctx.fillStyle = area.floorHex;
  ctx.fillRect(wb.x, wb.y, wb.w, wb.h);

  const isWoodenFloor =
    area.id.startsWith('interior-') ||
    area.id === 'secret-camara-osciloscopio' ||
    area.id === 'secret-sala-breakout';
  const isTileFloor =
    area.id === 'interior-templo-pioneros' ||
    area.id === 'interior-museo-viviente' ||
    area.id === 'chamber-boveda-cronoscopio';

  if (isWoodenFloor && !isTileFloor) {
    // Parquet de roble/nogal 32x16 con vetas detalladas y sombras de bisel 2.5D
    const plankW = 32;
    const plankH = 16;
    for (let py = wb.y; py < wb.y + wb.h; py += plankH) {
      const rowIdx = Math.floor((py - wb.y) / plankH);
      const rowOffset = (rowIdx % 2 === 0) ? 0 : 16;

      for (let px = wb.x - rowOffset; px < wb.x + wb.w + 16; px += plankW) {
        const rx = Math.max(wb.x, Math.min(wb.x + wb.w, px));
        const rw = Math.min(plankW, wb.x + wb.w - rx);
        if (rw <= 0) continue;

        // Borde de luz superior e izquierda de la tabla
        ctx.fillStyle = 'rgba(255, 235, 190, 0.07)';
        ctx.fillRect(rx, py, rw, 1);
        ctx.fillRect(rx, py, 1, plankH);

        // Borde de sombra inferior y derecha de la tabla (junta de calafateo)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.fillRect(rx, py + plankH - 1, rw, 1);
        ctx.fillRect(px + plankW - 1, py, 1, plankH);

        // Vetas de madera (Wood Grain Lines)
        const seed = (Math.floor(px / 32) * 17 + rowIdx * 31) % 100;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.fillRect(rx + 2, py + 4, rw - 4, 1);
        if (seed > 30) {
          ctx.fillRect(rx + 6, py + 9, rw - 10, 1);
        }
        if (seed > 60) {
          // Detalle de nudo de madera (wood knot)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
          ctx.fillRect(rx + 14, py + 6, 3, 2);
        }
      }
    }

    // Lustre central satinado del suelo (Sheen reflection)
    const sheenGrad = ctx.createRadialGradient(
      wb.x + wb.w / 2, wb.y + wb.h / 2, 20,
      wb.x + wb.w / 2, wb.y + wb.h / 2, wb.w * 0.45
    );
    sheenGrad.addColorStop(0, 'rgba(254, 243, 199, 0.04)');
    sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(wb.x, wb.y, wb.w, wb.h);
  } else {
    // Rejilla de azulejos o basalto con biseles 2.5D
    ctx.strokeStyle = area.floorGridHex || 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let gx = wb.x; gx <= wb.x + wb.w; gx += 32) {
      ctx.moveTo(gx, wb.y);
      ctx.lineTo(gx, wb.y + wb.h);
    }
    for (let gy = wb.y; gy <= wb.y + wb.h; gy += 32) {
      ctx.moveTo(wb.x, gy);
      ctx.lineTo(wb.x + wb.w, gy);
    }
    ctx.stroke();

    if (isTileFloor) {
      for (let gy = wb.y; gy < wb.y + wb.h; gy += 32) {
        for (let gx = wb.x; gx < wb.x + wb.w; gx += 32) {
          const checker = (Math.floor((gx - wb.x) / 32) + Math.floor((gy - wb.y) / 32)) % 2;
          ctx.fillStyle = checker === 0 ? 'rgba(214, 204, 178, 0.16)' : 'rgba(40, 36, 32, 0.22)';
          ctx.fillRect(gx + 1, gy + 1, 30, 30);
          ctx.fillStyle = 'rgba(255, 246, 220, 0.12)';
          ctx.fillRect(gx + 1, gy + 1, 28, 1);
          ctx.fillRect(gx + 1, gy + 1, 1, 28);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
          ctx.fillRect(gx + 1, gy + 30, 30, 1);
          ctx.fillRect(gx + 30, gy + 1, 1, 30);
        }
      }
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      for (let gx = wb.x; gx <= wb.x + wb.w; gx += 32) {
        for (let gy = wb.y; gy <= wb.y + wb.h; gy += 32) {
          ctx.fillRect(gx - 1, gy - 1, 3, 3);
        }
      }
    }
  }

  // Sombra de contacto perimetral proyectada desde las paredes hacia el suelo
  const wallShadowG = ctx.createLinearGradient(0, wb.y, 0, wb.y + 16);
  wallShadowG.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
  wallShadowG.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = wallShadowG;
  ctx.fillRect(wb.x, wb.y, wb.w, 16);

  ctx.strokeStyle = area.borderHex;
  ctx.lineWidth = 2;
  ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);
}

/* ============================================================================
   SALA ARCADE DE LOS CUATRO CAMINOS · Salón recreativo abandonado (1976-1980)
   Mobiliario escénico: ningún gabinete del interior es recuperable ni jugable.
   ============================================================================ */

function arcadeNoise(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function tintHex(hex: string, factor: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function drawCuatroCaminosArcadeShell(
  ctx: CanvasRenderingContext2D,
  area: SubAreaSpec,
  wb: SubAreaSpec['walkableBounds'],
  elapsed: number,
  reducedMotion: boolean
): void {
  const width = area.width;
  const height = area.height;
  const wallH = wb.y;
  const southTop = wb.y + wb.h;
  const rightX = wb.x + wb.w;

  // ------------------------------------------------------------------
  // 1. MUROS DE LADRILLO ENVEJECIDO, ZÓCALO Y TECHO DE YESO
  // ------------------------------------------------------------------
  ctx.fillStyle = '#170f0a';
  ctx.fillRect(0, 0, width, height);

  const drawBrickWall = (wx: number, wy: number, ww: number, wh: number) => {
    ctx.fillStyle = '#241a13';
    ctx.fillRect(wx, wy, ww, wh);
    let row = 0;
    for (let by = wy + 4; by < wy + wh - 2; by += 14, row++) {
      ctx.fillStyle = 'rgba(8, 5, 3, 0.4)';
      ctx.fillRect(wx, by + 12, ww, 2);
      for (let bx = wx + (row % 2 === 0 ? 0 : -18); bx < wx + ww; bx += 36) {
        const n = arcadeNoise(bx * 3.1 + by * 7.7);
        if (n > 0.9) {
          // Ladrillo hundido / hueco de mortero
          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(bx + 1, by + 1, 32, 10);
        } else {
          ctx.fillStyle = n > 0.55 ? '#33251b' : '#2b1f17';
          ctx.fillRect(bx + 1, by + 1, 32, 10);
          ctx.fillStyle = 'rgba(255, 214, 160, 0.035)';
          ctx.fillRect(bx + 1, by + 1, 32, 1);
        }
      }
    }
  };

  drawBrickWall(0, 0, width, wallH);
  drawBrickWall(0, wallH, wb.x, wb.h);
  drawBrickWall(rightX, wallH, width - rightX, wb.h);
  drawBrickWall(0, southTop, width, height - southTop);

  // Humedades y desconchones del yeso
  for (let i = 0; i < 14; i++) {
    const sx = arcadeNoise(i * 5.3) * width;
    const sy = 10 + arcadeNoise(i * 9.1) * (wallH - 40);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(10, 7, 4, 0.3)' : 'rgba(90, 70, 48, 0.12)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 16 + arcadeNoise(i * 3.7) * 24, 6 + arcadeNoise(i * 7.1) * 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Zócalo y moldura inferior del muro norte
  ctx.fillStyle = '#0c0704';
  ctx.fillRect(0, wallH - 18, width, 18);
  ctx.fillStyle = '#3a2617';
  ctx.fillRect(0, wallH - 16, width, 13);
  ctx.fillStyle = '#5b3a20';
  ctx.fillRect(0, wallH - 16, width, 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  for (let px = 10; px < width; px += 44) {
    ctx.fillRect(px, wallH - 13, 3, 9);
  }

  // Zócalos laterales
  ctx.fillStyle = '#0c0704';
  ctx.fillRect(wb.x - 6, wallH, 6, wb.h);
  ctx.fillRect(rightX, wallH, 6, wb.h);
  ctx.fillStyle = '#3a2617';
  ctx.fillRect(wb.x - 5, wallH, 4, wb.h);
  ctx.fillRect(rightX + 1, wallH, 4, wb.h);

  // Tubería eléctrica y cajas de conexión
  ctx.fillStyle = '#5b5b58';
  ctx.fillRect(wb.x, 16, wb.w, 3);
  ctx.fillStyle = '#2e2e2c';
  ctx.fillRect(wb.x, 19, wb.w, 1);
  for (const jx of [180, 520, 900, 1110]) {
    ctx.fillStyle = '#141312';
    ctx.fillRect(jx - 6, 12, 12, 12);
    ctx.fillStyle = '#6b6b66';
    ctx.fillRect(jx - 4, 14, 8, 8);
    ctx.fillStyle = '#d8be88';
    ctx.fillRect(jx - 3, 17, 2, 2);
    ctx.fillRect(jx + 1, 17, 2, 2);
  }
  // Cables colgantes hasta la altura de las marquesinas
  ctx.strokeStyle = '#0b0907';
  ctx.lineWidth = 2;
  for (const [cx0, drop] of [[300, 34], [690, 52], [980, 28], [1150, 44]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx0, 21);
    ctx.bezierCurveTo(cx0 + 8, 30, cx0 - 8, 21 + drop * 0.6, cx0 + 4, 21 + drop);
    ctx.stroke();
  }

  // Carteles descoloridos de la edad dorada
  const drawFadedPoster = (
    px: number,
    py: number,
    pw: number,
    ph: number,
    accent: string,
    motif: 'rocket' | 'racer' | 'maze'
  ) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(px + 2, py + 2, pw, ph);
    ctx.fillStyle = '#0b0806';
    ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = tintHex(accent, 0.42);
    ctx.fillRect(px + 2, py + 2, pw - 4, ph - 4);
    ctx.fillStyle = 'rgba(250, 240, 210, 0.18)';
    ctx.fillRect(px + 2, py + 2, pw - 4, 3);

    ctx.fillStyle = tintHex(accent, 0.9);
    if (motif === 'rocket') {
      ctx.fillRect(px + pw / 2 - 2, py + 10, 4, 12);
      ctx.fillRect(px + pw / 2 - 4, py + 20, 8, 3);
      ctx.fillRect(px + pw / 2 - 1, py + 23, 2, 5);
    } else if (motif === 'racer') {
      ctx.fillRect(px + 6, py + 14, pw - 12, 5);
      ctx.fillRect(px + 9, py + 10, pw - 18, 4);
      ctx.fillStyle = '#1a120c';
      ctx.fillRect(px + 8, py + 19, 4, 3);
      ctx.fillRect(px + pw - 12, py + 19, 4, 3);
    } else {
      for (let my = 0; my < 3; my++) {
        for (let mx = 0; mx < 3; mx++) {
          if (arcadeNoise(px + mx * 7 + my * 3) > 0.4) {
            ctx.fillRect(px + 6 + mx * 8, py + 10 + my * 6, 6, 4);
          }
        }
      }
    }
    // Esquinas rotas / cinta adhesiva
    ctx.fillStyle = '#241a13';
    ctx.fillRect(px + pw - 5, py + ph - 4, 5, 4);
    ctx.fillStyle = 'rgba(226, 214, 180, 0.35)';
    ctx.fillRect(px + 2, py - 1, 6, 2);
    ctx.fillRect(px + pw - 8, py - 1, 6, 2);
  };
  drawFadedPoster(132, 30, 38, 46, '#38bdf8', 'rocket');
  drawFadedPoster(322, 38, 42, 40, '#f97316', 'racer');
  drawFadedPoster(430, 26, 34, 40, '#f43f5e', 'maze');
  drawFadedPoster(1010, 30, 42, 46, '#a855f7', 'rocket');

  // Aviso de clausura con sello municipal
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.fillRect(948, 44, 40, 42);
  ctx.fillStyle = '#d9cba6';
  ctx.fillRect(946, 42, 38, 40);
  ctx.fillStyle = '#8b7a58';
  ctx.fillRect(950, 48, 30, 2);
  ctx.fillRect(950, 54, 24, 2);
  ctx.fillRect(950, 60, 28, 2);
  ctx.fillStyle = '#a3271f';
  ctx.fillRect(956, 68, 18, 7);
  ctx.fillStyle = '#e8dcc0';
  ctx.font = '700 4px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CLAUSURADO', 965, 73);

  // Reloj de pared detenido a las 3:40
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.arc(621, 62, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1510';
  ctx.beginPath();
  ctx.arc(620, 60, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c9b98f';
  ctx.beginPath();
  ctx.arc(620, 60, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b2c1c';
  for (let t = 0; t < 12; t++) {
    const ang = (t / 12) * Math.PI * 2;
    ctx.fillRect(620 + Math.cos(ang) * 9 - 1, 60 + Math.sin(ang) * 9 - 1, 2, 2);
  }
  ctx.fillStyle = '#241a12';
  ctx.fillRect(619, 52, 2, 9);
  ctx.fillRect(620, 59, 7, 2);
  ctx.fillStyle = 'rgba(70, 50, 30, 0.5)';
  ctx.beginPath();
  ctx.arc(620, 60, 12, 0, Math.PI * 2);
  ctx.stroke();

  // Rótulo interior de neón agonizante sobre la pared norte (alto, sobre las cabinas)
  const neonAlive = reducedMotion || Math.sin(elapsed * 6.7) > -0.82;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(700, 48, 240, 26);
  ctx.fillStyle = '#120d09';
  ctx.fillRect(698, 46, 240, 26);
  ctx.strokeStyle = neonAlive ? 'rgba(245, 158, 11, 0.7)' : 'rgba(90, 60, 24, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(701, 49, 234, 20);
  ctx.fillStyle = neonAlive ? '#fbbf24' : '#6b4a1c';
  ctx.font = '700 10px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SALÓN RECREATIVO', 818, 64);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
  ctx.fillRect(704, 66, 228, 3);
  if (neonAlive) {
    const signGlow = ctx.createRadialGradient(818, 60, 8, 818, 60, 110);
    signGlow.addColorStop(0, 'rgba(245, 158, 11, 0.12)');
    signGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = signGlow;
    ctx.fillRect(700, 8, 240, 110);
  }

  // ------------------------------------------------------------------
  // 2. SUELO DE VINILO GASTADO, ALFOMBRA Y SUCIEDAD DE DÉCADAS
  // ------------------------------------------------------------------
  ctx.fillStyle = area.floorHex;
  ctx.fillRect(wb.x, wb.y, wb.w, wb.h);

  const tileW = 52;
  const tileH = 52;
  for (let ty = wb.y; ty < wb.y + wb.h; ty += tileH) {
    for (let tx = wb.x; tx < wb.x + wb.w; tx += tileW) {
      const n = arcadeNoise(tx * 0.7 + ty * 1.3);
      const worn = n > 0.86;
      ctx.fillStyle = worn
        ? '#221913'
        : (Math.floor(tx / tileW) + Math.floor(ty / tileH)) % 2 === 0
          ? '#33271d'
          : '#2b2018';
      ctx.fillRect(tx, ty, tileW, tileH);

      // Bisel del vinilo
      ctx.fillStyle = 'rgba(255, 220, 170, 0.06)';
      ctx.fillRect(tx, ty, tileW, 1);
      ctx.fillRect(tx, ty, 1, tileH);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.fillRect(tx, ty + tileH - 2, tileW, 2);
      ctx.fillRect(tx + tileW - 2, ty, 2, tileH);

      // Juntas ennegrecidas y manchas de uso
      if (n > 0.5) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.fillRect(tx + 8 + n * 18, ty + 10 + n * 14, 14 + n * 12, 5);
      }
      if (n > 0.72) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(tx + tileW - 8, ty + tileH - 8, 5, 3);
      }
    }
  }

  // Alfombra central deshilachada (recorrido hacia la puerta)
  const carpetX = 548;
  const carpetW = 144;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(carpetX - 2, wb.y, carpetW + 4, wb.h);
  ctx.fillStyle = '#4a191c';
  ctx.fillRect(carpetX, wb.y, carpetW, wb.h);
  ctx.fillStyle = '#3a1215';
  ctx.fillRect(carpetX + 7, wb.y, carpetW - 14, wb.h);
  ctx.fillStyle = 'rgba(201, 160, 84, 0.32)';
  ctx.fillRect(carpetX + 4, wb.y, 2, wb.h);
  ctx.fillRect(carpetX + carpetW - 6, wb.y, 2, wb.h);
  for (let ry = wb.y + 20; ry < wb.y + wb.h - 10; ry += 46) {
    ctx.fillStyle = 'rgba(201, 160, 84, 0.13)';
    ctx.fillRect(carpetX + 12, ry, carpetW - 24, 3);
  }
  // Zonas desgastadas donde el vinilo asoma bajo la alfombra
  for (let i = 0; i < 9; i++) {
    const wx = carpetX + 10 + arcadeNoise(i * 4.3) * (carpetW - 26);
    const wy = wb.y + 30 + arcadeNoise(i * 8.9) * (wb.h - 80);
    ctx.fillStyle = 'rgba(32, 24, 18, 0.75)';
    ctx.beginPath();
    ctx.ellipse(wx, wy, 5 + arcadeNoise(i * 2.1) * 7, 3 + arcadeNoise(i * 6.7) * 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cables y regletas arrastradas por el suelo
  ctx.strokeStyle = 'rgba(8, 7, 6, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(104, 256);
  ctx.lineTo(110, 380);
  ctx.lineTo(96, 470);
  ctx.lineTo(116, 588);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1150, 210);
  ctx.lineTo(1138, 340);
  ctx.lineTo(1152, 470);
  ctx.lineTo(1070, 598);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(510, 196);
  ctx.lineTo(468, 212);
  ctx.lineTo(470, 330);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(20, 18, 14, 0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(470, 330);
  ctx.quadraticCurveTo(492, 360, 470, 396);
  ctx.stroke();

  // Manchas de humedad, chicles y polvo
  for (let i = 0; i < 26; i++) {
    const gx = wb.x + 12 + arcadeNoise(i * 3.31) * (wb.w - 24);
    const gy = wb.y + 24 + arcadeNoise(i * 7.73) * (wb.h - 48);
    if (i % 5 === 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.beginPath();
      ctx.ellipse(gx, gy, 12 + arcadeNoise(i) * 18, 6 + arcadeNoise(i + 1) * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(210, 190, 150, 0.12)' : 'rgba(0, 0, 0, 0.28)';
      ctx.fillRect(gx, gy, 2 + (i % 2), 2);
    }
  }

  // Arañazos de patas de máquinas y arrastres
  ctx.strokeStyle = 'rgba(220, 200, 170, 0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const sx = wb.x + arcadeNoise(i * 11.2) * wb.w;
    const sy = wb.y + arcadeNoise(i * 5.6) * wb.h;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 10 + arcadeNoise(i) * 26, sy + 2 + arcadeNoise(i + 2) * 6);
    ctx.stroke();
  }

  // Sombra de contacto de los muros sobre el suelo
  const northShadow = ctx.createLinearGradient(0, wb.y, 0, wb.y + 22);
  northShadow.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  northShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = northShadow;
  ctx.fillRect(wb.x, wb.y, wb.w, 22);

  const westShadow = ctx.createLinearGradient(wb.x, 0, wb.x + 22, 0);
  westShadow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  westShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = westShadow;
  ctx.fillRect(wb.x, wb.y, 22, wb.h);

  const eastShadow = ctx.createLinearGradient(rightX, 0, rightX - 22, 0);
  eastShadow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  eastShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = eastShadow;
  ctx.fillRect(rightX - 22, wb.y, 22, wb.h);

  const southShadow = ctx.createLinearGradient(0, southTop, 0, southTop - 18);
  southShadow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  southShadow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = southShadow;
  ctx.fillRect(wb.x, southTop - 18, wb.w, 18);

  // ------------------------------------------------------------------
  // 3. PUERTA SUR DE SALIDA (la única entrada/salida del salón)
  // ------------------------------------------------------------------
  const doorX = 620;
  ctx.fillStyle = '#0a0705';
  ctx.fillRect(doorX - 56, southTop - 8, 112, height - southTop + 8);
  ctx.fillStyle = '#1c1410';
  ctx.fillRect(doorX - 52, southTop - 2, 104, height - southTop);
  // Luz exterior que se cuela por la rendija y charco cálido sobre el vinilo
  const doorGlow = ctx.createRadialGradient(doorX, southTop - 6, 6, doorX, southTop - 6, 92);
  doorGlow.addColorStop(0, 'rgba(253, 224, 139, 0.3)');
  doorGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.1)');
  doorGlow.addColorStop(1, 'rgba(253, 224, 139, 0)');
  ctx.fillStyle = doorGlow;
  ctx.beginPath();
  ctx.ellipse(doorX, southTop - 4, 92, 62, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hojas metálicas con placa de patada y ventanilla enrejada
  ctx.fillStyle = '#2c2119';
  ctx.fillRect(doorX - 48, southTop + 4, 46, height - southTop - 4);
  ctx.fillRect(doorX + 2, southTop + 4, 46, height - southTop - 4);
  ctx.fillStyle = '#3d2d21';
  ctx.fillRect(doorX - 48, southTop + 4, 6, height - southTop - 4);
  ctx.fillRect(doorX + 2, southTop + 4, 6, height - southTop - 4);
  ctx.fillStyle = '#4d3927';
  ctx.fillRect(doorX - 44, southTop + 8, 38, 2);
  ctx.fillRect(doorX + 6, southTop + 8, 38, 2);
  ctx.fillStyle = 'rgba(253, 224, 139, 0.3)';
  ctx.fillRect(doorX - 40, southTop + 16, 12, 8);
  ctx.fillRect(doorX + 28, southTop + 16, 12, 8);
  ctx.fillStyle = 'rgba(20, 14, 10, 0.85)';
  ctx.fillRect(doorX - 38, southTop + 18, 8, 4);
  ctx.fillRect(doorX + 30, southTop + 18, 8, 4);
  // Placas de patada inferiores
  ctx.fillStyle = '#57493c';
  ctx.fillRect(doorX - 46, height - 16, 42, 3);
  ctx.fillRect(doorX + 4, height - 16, 42, 3);
  // Tiradores y cerradura
  ctx.fillStyle = '#1b1612';
  ctx.fillRect(doorX - 10, southTop + 26, 4, 9);
  ctx.fillRect(doorX + 6, southTop + 26, 4, 9);
  ctx.fillStyle = '#c9b98f';
  ctx.fillRect(doorX - 9, southTop + 28, 2, 5);
  ctx.fillRect(doorX + 7, southTop + 28, 2, 5);
  // Rendija de luz entre las dos hojas
  ctx.fillStyle = 'rgba(253, 224, 139, 0.55)';
  ctx.fillRect(doorX - 2, southTop + 4, 4, height - southTop - 10);

  // Felpudo desgastado, umbral y rótulo de salida
  ctx.fillStyle = '#0f0b07';
  ctx.fillRect(doorX - 50, southTop - 28, 100, 25);
  ctx.fillStyle = '#2b1d14';
  ctx.fillRect(doorX - 47, southTop - 25, 94, 18);
  ctx.fillStyle = 'rgba(201, 160, 84, 0.14)';
  for (let mx = doorX - 43; mx < doorX + 47; mx += 9) {
    ctx.fillRect(mx, southTop - 23, 3, 12);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(doorX - 47, southTop - 9, 94, 2);
  ctx.fillStyle = '#0d0a07';
  ctx.fillRect(doorX - 31, southTop - 50, 62, 14);
  ctx.strokeStyle = 'rgba(201, 160, 84, 0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(doorX - 30.5, southTop - 49.5, 61, 13);
  ctx.fillStyle = '#e7c67f';
  ctx.font = '700 7px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SALIDA', doorX, southTop - 40);

  // ------------------------------------------------------------------
  // 4. ILUMINACIÓN AMBIENTAL: CHAROLES CÁLIDOS Y ZONAS EN PENUMBRA
  // ------------------------------------------------------------------
  const lampSpots: Array<[number, number, number, number]> = [
    [330, 268, 160, 0.19],
    [620, 342, 176, 0.22],
    [930, 268, 160, 0.17],
    [300, 628, 166, 0.16],
    [940, 628, 168, 0.12],
    [620, 706, 138, 0.19],
  ];
  for (let i = 0; i < lampSpots.length; i++) {
    const [lx, ly, lr, baseAlpha] = lampSpots[i];
    const flicker =
      reducedMotion || i !== 3
        ? 1
        : Math.max(0.15, 0.55 + Math.sin(elapsed * 8.3) * 0.4 + Math.sin(elapsed * 2.1) * 0.12);
    const glow = ctx.createRadialGradient(lx, ly, 6, lx, ly, lr);
    glow.addColorStop(0, `rgba(253, 224, 139, ${baseAlpha * flicker})`);
    glow.addColorStop(0.4, `rgba(245, 158, 11, ${baseAlpha * 0.55 * flicker})`);
    glow.addColorStop(0.75, `rgba(180, 110, 30, ${baseAlpha * 0.16 * flicker})`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Reflejo especular tenue del vinilo bajo los charoles
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [lx, ly] of lampSpots) {
    const sheen = ctx.createRadialGradient(lx, ly + 18, 2, lx, ly + 18, 46);
    sheen.addColorStop(0, 'rgba(253, 224, 139, 0.05)');
    sheen.addColorStop(1, 'rgba(253, 224, 139, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(lx - 52, ly - 32, 104, 104);
  }
  ctx.restore();

  // Lavado cálido sobre el ladrillo del muro norte (luz de techo rebotada)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, wallH);
  ctx.clip();
  for (const [gx, gy, gr] of [
    [330, 118, 142],
    [620, 126, 158],
    [930, 118, 142],
  ] as const) {
    const wash = ctx.createRadialGradient(gx, gy, 8, gx, gy, gr);
    wash.addColorStop(0, 'rgba(253, 224, 139, 0.07)');
    wash.addColorStop(0.6, 'rgba(245, 158, 11, 0.028)');
    wash.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
  }
  ctx.restore();

  // Zócalo de cimentación de los muros (remate visual)
  ctx.strokeStyle = 'rgba(124, 74, 34, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(wb.x, wb.y, wb.w, wb.h);

  // ------------------------------------------------------------------
  // 5. MOBILIARIO FIJO: MÁQUINA DE CAMBIO, CAJAS Y MESA DE REPUESTOS
  // ------------------------------------------------------------------
  // Máquina de cambio contra el muro oeste
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(88, 250, 38, 9);
  ctx.fillStyle = '#0b0907';
  ctx.fillRect(84, 200, 38, 58);
  ctx.fillStyle = '#4a4f52';
  ctx.fillRect(86, 202, 34, 54);
  ctx.fillStyle = '#5f666a';
  ctx.fillRect(86, 202, 34, 3);
  ctx.fillStyle = '#2b2f31';
  ctx.fillRect(89, 208, 28, 12);
  ctx.fillStyle = '#d8be88';
  ctx.font = '700 5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CAMBIO', 103, 216);
  ctx.fillStyle = '#141313';
  ctx.fillRect(92, 224, 22, 14);
  ctx.fillStyle = '#8a8f8c';
  ctx.fillRect(95, 227, 3, 8);
  ctx.fillRect(104, 227, 3, 8);
  ctx.fillStyle = '#0a0908';
  ctx.fillRect(93, 232, 20, 4);
  ctx.fillStyle = '#6b4a1c';
  ctx.fillRect(98, 242, 10, 2);

  // Pila de cajas de repuestos en el rincón suroeste
  const crate = (cx0: number, cy0: number, cw: number, ch: number, tone: string) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(cx0 + 2, cy0 + ch - 2, cw, 5);
    ctx.fillStyle = '#0c0805';
    ctx.fillRect(cx0, cy0, cw, ch);
    ctx.fillStyle = tone;
    ctx.fillRect(cx0 + 1, cy0 + 1, cw - 2, ch - 2);
    ctx.fillStyle = 'rgba(255, 220, 170, 0.09)';
    ctx.fillRect(cx0 + 1, cy0 + 1, cw - 2, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(cx0 + 1, cy0 + Math.floor(ch / 2), cw - 2, 2);
    ctx.fillRect(cx0 + Math.floor(cw / 2), cy0 + 1, 2, ch - 2);
    ctx.fillStyle = '#c9a054';
    ctx.fillRect(cx0 + 3, cy0 + 3, 4, 2);
  };
  crate(92, 604, 44, 38, '#5a3d22');
  crate(96, 588, 26, 16, '#4a321c');
  crate(122, 614, 16, 24, '#6b4a28');

  // Mesa de taller con piezas sueltas en el rincón sureste
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(1014, 634, 52, 9);
  ctx.fillStyle = '#3c2a1b';
  ctx.fillRect(1018, 610, 4, 28);
  ctx.fillRect(1058, 610, 4, 28);
  ctx.fillStyle = '#0c0805';
  ctx.fillRect(1014, 604, 52, 32);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(1016, 606, 48, 28);
  ctx.fillStyle = '#875f36';
  ctx.fillRect(1016, 606, 48, 3);
  // Placas y herramientas
  ctx.fillStyle = '#1f3a2a';
  ctx.fillRect(1022, 612, 14, 9);
  ctx.fillStyle = '#39ff14';
  ctx.fillRect(1025, 615, 3, 2);
  ctx.fillRect(1030, 617, 2, 2);
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(1040, 610, 10, 4);
  ctx.fillStyle = '#d8be88';
  ctx.fillRect(1044, 620, 8, 2);
  ctx.fillStyle = '#94402a';
  ctx.fillRect(1020, 626, 12, 4);
  ctx.fillStyle = '#0c0b0a';
  ctx.fillRect(1036, 626, 22, 3);

  // ------------------------------------------------------------------
  // 6. RESTOS DE ABANDONO: FICHAS, HERRAMIENTAS, TUBO CRT Y CARTEL
  // ------------------------------------------------------------------
  const token = (tx0: number, ty0: number, tone: string) => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(tx0 + 1, ty0 + 1, 4, 3);
    ctx.fillStyle = tone;
    ctx.fillRect(tx0, ty0, 4, 3);
    ctx.fillStyle = 'rgba(255, 240, 210, 0.4)';
    ctx.fillRect(tx0, ty0, 2, 1);
  };
  token(330, 598, '#c9a054');
  token(338, 606, '#b58b2a');
  token(346, 598, '#8d928e');
  token(560, 700, '#c9a054');
  token(574, 690, '#b58b2a');
  token(212, 502, '#8d928e');
  token(222, 508, '#c9a054');
  token(132, 300, '#b58b2a');
  token(140, 306, '#c9a054');

  // Tornillos y arandelas junto a la mesa de taller
  ctx.fillStyle = '#8d928e';
  ctx.fillRect(972, 668, 3, 2);
  ctx.fillRect(980, 672, 2, 2);
  ctx.fillStyle = '#5f666a';
  ctx.fillRect(988, 665, 4, 1);

  // Destornillador olvidado en el suelo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(970, 664, 18, 3);
  ctx.fillStyle = '#94402a';
  ctx.fillRect(968, 660, 8, 4);
  ctx.fillStyle = '#8d928e';
  ctx.fillRect(975, 661, 12, 2);
  ctx.fillStyle = '#c9c9c0';
  ctx.fillRect(986, 661, 2, 2);

  // Tubo CRT desechado, boca abajo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  ctx.ellipse(950, 686, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0a09';
  ctx.fillRect(934, 666, 30, 18);
  ctx.fillStyle = '#20262a';
  ctx.fillRect(936, 668, 26, 14);
  ctx.fillStyle = '#3b4a50';
  ctx.fillRect(938, 670, 10, 4);
  ctx.fillStyle = '#141a1c';
  ctx.fillRect(938, 676, 22, 4);
  ctx.fillStyle = '#2b3e33';
  ctx.fillRect(950, 682, 12, 3);
  ctx.fillStyle = 'rgba(160, 200, 190, 0.12)';
  ctx.fillRect(940, 671, 6, 1);

  // Cartel de cartón "FUERA DE SERVICIO" caído junto al gabinete desvalijado
  ctx.save();
  ctx.translate(742, 432);
  ctx.rotate(-0.12);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(2, 2, 34, 20);
  ctx.fillStyle = '#a99062';
  ctx.fillRect(0, 0, 34, 20);
  ctx.fillStyle = '#c2ad7c';
  ctx.fillRect(1, 1, 32, 18);
  ctx.fillStyle = '#8f2f24';
  ctx.fillRect(3, 3, 28, 4);
  ctx.fillStyle = '#4a3a22';
  ctx.fillRect(4, 10, 24, 2);
  ctx.fillRect(4, 14, 18, 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(26, 16, 6, 3);
  ctx.restore();

  // Mando arrancado de un panel
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(470, 683, 13, 7);
  ctx.fillStyle = '#0d0b09';
  ctx.fillRect(468, 678, 10, 7);
  ctx.fillStyle = '#5f666a';
  ctx.fillRect(472, 680, 2, 3);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(475, 677, 2, 0, Math.PI * 2);
  ctx.fill();

  // Colillas y polvo junto al felpudo
  ctx.fillStyle = 'rgba(210, 195, 165, 0.28)';
  ctx.fillRect(586, 738, 5, 1);
  ctx.fillRect(660, 730, 4, 1);
  ctx.fillStyle = '#b58b2a';
  ctx.fillRect(592, 736, 2, 2);
}

function drawCuatroCaminosArcadeMachine(
  ctx: CanvasRenderingContext2D,
  prop: SubAreaSpec['decorProps'][number],
  elapsed: number,
  reducedMotion: boolean
): void {
  const arcade = prop.arcade;
  if (!arcade) return;

  const variant = arcade.variant;
  const facing = arcade.facing;
  const broken = Boolean(arcade.broken);
  const accent = prop.accentHex;
  const bw = prop.w;
  const cx = Math.round(prop.x + prop.w / 2);
  const baseY = Math.round(prop.y + prop.h);

  ctx.save();

  // -------------------- MESAS COCKTAIL --------------------
  if (variant === 'cocktail') {
    const topY = prop.y - 8;
    const boardH = prop.h - 6;
    const boardBottom = topY + boardH;

    // Sombra de contacto y peana central
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx + 2, baseY - 2, bw * 0.56, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(cx + 9, baseY + 2, bw * 0.4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0908';
    ctx.fillRect(cx - 18, baseY - 7, 36, 7);
    ctx.fillStyle = '#3a2c21';
    ctx.fillRect(cx - 16, baseY - 6, 32, 3);
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(cx - 8, boardBottom - 6, 16, baseY - boardBottom + 7);
    ctx.fillStyle = '#4a3624';
    ctx.fillRect(cx - 6, boardBottom - 6, 12, baseY - boardBottom + 6);
    ctx.fillStyle = '#6b4d33';
    ctx.fillRect(cx - 6, boardBottom - 6, 2, baseY - boardBottom + 2);

    // Tablero con bisel de madera
    ctx.fillStyle = '#0b0806';
    ctx.fillRect(prop.x, topY, prop.w, boardH);
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(prop.x + 2, topY + 2, prop.w - 4, boardH - 4);
    ctx.fillStyle = '#7a5330';
    ctx.fillRect(prop.x + 2, topY + 2, prop.w - 4, 3);
    ctx.fillStyle = '#3a2717';
    ctx.fillRect(prop.x + 2, topY + boardH - 7, prop.w - 4, 5);
    ctx.fillStyle = '#1d1712';
    ctx.fillRect(prop.x + 6, topY + 9, prop.w - 12, boardH - 20);

    // Cristal dividido con reflejo tenue
    ctx.fillStyle = broken ? '#141210' : '#0a0d0f';
    ctx.fillRect(prop.x + 8, topY + 11, prop.w - 16, boardH - 25);
    if (!broken) {
      const glassGlow = ctx.createRadialGradient(cx, topY + 22, 2, cx, topY + 22, bw * 0.42);
      glassGlow.addColorStop(0, `${accent}20`);
      glassGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glassGlow;
      ctx.fillRect(prop.x + 8, topY + 11, prop.w - 16, boardH - 25);
    }
    ctx.fillStyle = 'rgba(140, 180, 190, 0.1)';
    ctx.fillRect(prop.x + 9, topY + 12, prop.w - 20, 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(cx - 1, topY + 11, 2, boardH - 25);
    if (broken) {
      ctx.strokeStyle = 'rgba(200, 220, 220, 0.32)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(prop.x + 14, topY + 13);
      ctx.lineTo(prop.x + 26, topY + 24);
      ctx.lineTo(prop.x + 19, topY + 32);
      ctx.moveTo(prop.x + 26, topY + 24);
      ctx.lineTo(prop.x + 42, topY + 28);
      ctx.stroke();
    } else {
      // Aros de vasos secos sobre el cristal
      ctx.strokeStyle = 'rgba(210, 200, 170, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx - 8, topY + 19, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + 12, topY + 27, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Paneles de control en los extremos con mandos y botones
    for (const side of [-1, 1]) {
      const pxc = cx + side * (bw * 0.31);
      ctx.fillStyle = '#0a0806';
      ctx.fillRect(pxc - 9, topY + 7, 18, 10);
      ctx.fillStyle = '#3a2c21';
      ctx.fillRect(pxc - 8, topY + 8, 16, 8);
      ctx.fillStyle = 'rgba(255, 240, 210, 0.08)';
      ctx.fillRect(pxc - 8, topY + 8, 16, 1);
      ctx.fillStyle = '#0d0b09';
      ctx.beginPath();
      ctx.arc(pxc - 3, topY + 12.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(pxc + 2, topY + 11, 2, 2);
      ctx.fillRect(pxc + 6, topY + 12, 2, 2);
    }

    // Placa con el nombre en el canto frontal
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(prop.x + 4, boardBottom - 8, prop.w - 8, 6);
    ctx.fillStyle = tintHex(accent, 0.5);
    ctx.fillRect(prop.x + 5, boardBottom - 7, prop.w - 10, 4);
    ctx.fillStyle = 'rgba(255, 240, 210, 0.6)';
    ctx.font = '700 5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(arcade.marquee, cx, boardBottom - 3);

    ctx.restore();
    return;
  }

  // -------------------- GABINETES VERTICALES --------------------
  // La altura se deriva del ancho real del mueble para conservar proporciones
  // de gabinete (los más anchos son deluxe/shooter) y evitar siluetas aplanadas.
  const bodyH = Math.round(
    variant === 'cabaret' ? bw * 1.32
      : variant === 'deluxe' ? bw * 1.6
        : variant === 'vector' ? bw * 1.72
          : variant === 'gutted' ? bw * 1.68
            : variant === 'tilted' ? bw * 1.76
              : variant === 'shooter' ? bw * 1.8
                : bw * 1.76
  );
  const bodyTop = baseY - bodyH;

  if (variant === 'tilted') {
    ctx.translate(cx + 3, baseY);
    ctx.rotate(-0.055);
    ctx.translate(-cx, -baseY);
  }

  // Sombra de contacto y sombra proyectada
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, baseY - 3, bw * 0.6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(cx + 9, baseY + 4, bw * 0.52, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyPalette =
    variant === 'cabaret' ? { body: '#5a3a1f', panel: '#744a28', edge: '#8a5c33' }
      : variant === 'deluxe' ? { body: '#3c2b34', panel: '#4f3844', edge: '#6b4d5c' }
        : variant === 'shooter' ? { body: '#2c2a38', panel: '#3a3749', edge: '#514d63' }
          : variant === 'vector' ? { body: '#232b31', panel: '#303b43', edge: '#43525c' }
            : variant === 'gutted' ? { body: '#2b241d', panel: '#392f25', edge: '#4c3e30' }
              : { body: '#3a2c22', panel: '#4a372a', edge: '#5d4634' };

  // Cuerpo del gabinete con contorno nítido
  ctx.fillStyle = '#080605';
  ctx.fillRect(cx - bw / 2 - 2, bodyTop - 2, bw + 4, bodyH + 4);
  ctx.fillStyle = bodyPalette.body;
  ctx.fillRect(cx - bw / 2, bodyTop, bw, bodyH);

  // Paneles laterales biselados
  ctx.fillStyle = bodyPalette.panel;
  ctx.fillRect(cx - bw / 2, bodyTop + 4, 5, bodyH - 8);
  ctx.fillRect(cx + bw / 2 - 5, bodyTop + 4, 5, bodyH - 8);
  ctx.fillStyle = bodyPalette.edge;
  ctx.fillRect(cx - bw / 2, bodyTop + 4, 1, bodyH - 8);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(cx + bw / 2 - 5, bodyTop + 4, 1, bodyH - 8);

  // Luz cálida rebotada en el canto superior izquierdo del mueble
  ctx.fillStyle = 'rgba(253, 224, 139, 0.09)';
  ctx.fillRect(cx - bw / 2, bodyTop + 3, 1, bodyH - 6);
  ctx.fillStyle = 'rgba(253, 224, 139, 0.05)';
  ctx.fillRect(cx - bw / 2 + 1, bodyTop + 1, bw - 2, 1);

  // Vetas / gráficos laterales para cabarets y deluxe
  if (variant === 'cabaret') {
    ctx.fillStyle = 'rgba(30, 16, 7, 0.5)';
    for (let gy = bodyTop + 12; gy < baseY - 16; gy += 9) {
      ctx.fillRect(cx - bw / 2 + 2, gy, 3, 4);
      ctx.fillRect(cx + bw / 2 - 5, gy + 3, 3, 4);
    }
  } else if (variant === 'deluxe') {
    ctx.fillStyle = tintHex(accent, 0.55);
    for (let sy = bodyTop + 16; sy < baseY - 18; sy += 12) {
      ctx.fillRect(cx - bw / 2 + 2, sy, 4, 6);
      ctx.fillRect(cx + bw / 2 - 6, sy, 4, 6);
    }
  }

  // Sombra lateral proyectada para separar el mueble del fondo
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  ctx.fillRect(cx + bw / 2 + 1, bodyTop + 4, 4, bodyH - 8);

  // Tapa superior y patas de goma: rematan la silueta contra el suelo
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(cx - bw / 2 - 1, bodyTop - 2, bw + 2, 3);
  ctx.fillStyle = tintHex(accent, broken ? 0.2 : 0.4);
  ctx.fillRect(cx - bw / 2, bodyTop - 2, bw, 1);
  ctx.fillStyle = '#0b0a08';
  ctx.fillRect(cx - bw / 2 + 5, baseY - 3, 4, 3);
  ctx.fillRect(cx + bw / 2 - 9, baseY - 3, 4, 3);

  // -------------------- DORSAL DE SERVICIO (máquinas orientadas al norte) --------------------
  if (facing === 'north') {
    const panelTop = bodyTop + 10;
    const panelH = Math.max(18, bodyH - 24);
    const panelX = cx - bw / 2 + 6;
    const panelW = bw - 12;

    // Marco hundido del acceso trasero
    ctx.fillStyle = '#0a0807';
    ctx.fillRect(panelX - 1, panelTop - 1, panelW + 2, panelH + 2);
    if (variant === 'gutted') {
      // Chapa arrancada: hueco, placa base y cables colgando
      ctx.fillStyle = '#050403';
      ctx.fillRect(panelX, panelTop, panelW, panelH);
      ctx.fillStyle = '#1f3a2a';
      ctx.fillRect(panelX + 3, panelTop + 6, Math.max(8, panelW - 18), 7);
      ctx.fillStyle = '#39ff14';
      for (let bx = panelX + 5; bx < panelX + panelW - 10; bx += 5) {
        ctx.fillRect(bx, panelTop + 8, 2, 1);
      }
      ctx.fillStyle = '#4a3a22';
      ctx.fillRect(panelX + 2, panelTop + Math.floor(panelH / 2) + 4, 5, 10);
      ctx.strokeStyle = '#8a6a2a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 4, panelTop + panelH - 4);
      ctx.quadraticCurveTo(cx - 10, panelTop + panelH + 9, cx - 2, panelTop + panelH + 15);
      ctx.moveTo(cx + 5, panelTop + panelH - 2);
      ctx.quadraticCurveTo(cx + 11, panelTop + panelH + 7, cx + 4, panelTop + panelH + 12);
      ctx.stroke();
      ctx.strokeStyle = '#a33b2a';
      ctx.beginPath();
      ctx.moveTo(cx - 1, panelTop + panelH - 5);
      ctx.quadraticCurveTo(cx + 6, panelTop + panelH + 4, cx + 10, panelTop + panelH + 10);
      ctx.stroke();
      // Chapa desmontada apoyada contra el mueble
      ctx.save();
      ctx.translate(cx + bw / 2 + 3, baseY - 2);
      ctx.rotate(0.16);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(2, -20, 12, 18);
      ctx.fillStyle = '#2b241d';
      ctx.fillRect(0, -20, 12, 18);
      ctx.fillStyle = 'rgba(255, 220, 170, 0.06)';
      ctx.fillRect(0, -20, 12, 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      for (let vy = -16; vy < -8; vy += 3) {
        ctx.fillRect(2, vy, 8, 1);
      }
      ctx.fillStyle = 'rgba(140, 135, 120, 0.45)';
      ctx.fillRect(2, -18, 1, 1);
      ctx.fillRect(9, -18, 1, 1);
      ctx.restore();
    } else {
      ctx.fillStyle = tintHex(bodyPalette.panel, 0.62);
      ctx.fillRect(panelX, panelTop, panelW, panelH);
      ctx.fillStyle = 'rgba(255, 220, 170, 0.05)';
      ctx.fillRect(panelX, panelTop, panelW, 2);
      // Franja pintada del fabricante sobre el acceso trasero
      ctx.fillStyle = tintHex(accent, broken ? 0.18 : 0.34);
      ctx.fillRect(panelX, bodyTop + 3, panelW, 2);
      // Rejillas de ventilación
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let vy = panelTop + 5; vy < panelTop + 5 + Math.min(18, panelH * 0.3); vy += 3) {
        ctx.fillRect(panelX + 4, vy, panelW - 8, 1);
      }
      // Tornillos de chapa
      ctx.fillStyle = 'rgba(200, 195, 180, 0.4)';
      ctx.fillRect(panelX + 2, panelTop + 2, 1, 1);
      ctx.fillRect(panelX + panelW - 3, panelTop + 2, 1, 1);
      ctx.fillRect(panelX + 2, panelTop + panelH - 3, 1, 1);
      ctx.fillRect(panelX + panelW - 3, panelTop + panelH - 3, 1, 1);
      // Bisagras del portón de servicio
      ctx.fillStyle = 'rgba(140, 135, 120, 0.5)';
      ctx.fillRect(panelX + panelW - 2, panelTop + 7, 2, 5);
      ctx.fillRect(panelX + panelW - 2, panelTop + panelH - 15, 2, 5);
      // Candado y aldaba en los modelos más antiguos
      if (arcade.year <= '1977') {
        ctx.fillStyle = '#8d928e';
        ctx.fillRect(panelX + 1, panelTop + Math.round(panelH * 0.52), 4, 5);
        ctx.fillStyle = '#d8be88';
        ctx.fillRect(panelX + 2, panelTop + Math.round(panelH * 0.52) + 1, 2, 2);
      }
      // Aviso de tensión estarcido
      ctx.fillStyle = 'rgba(143, 47, 36, 0.6)';
      ctx.font = '700 3px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ALTA TENSIÓN', panelX + 3, panelTop + Math.min(panelH - 18, 20));
      // Golpes, óxido y polvo acumulado
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(panelX + 4, panelTop + panelH - 10, Math.max(6, panelW - 20), 2);
      if (broken) {
        ctx.fillStyle = 'rgba(122, 62, 28, 0.45)';
        ctx.beginPath();
        ctx.moveTo(panelX + panelW - 10, panelTop + 4);
        ctx.lineTo(panelX + panelW - 2, panelTop + 9);
        ctx.lineTo(panelX + panelW - 4, panelTop + 18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.moveTo(panelX + 4, panelTop + 10);
        ctx.lineTo(panelX + 14, panelTop + 15);
        ctx.lineTo(panelX + 9, panelTop + 24);
        ctx.stroke();
      }
      // Etiqueta de mantenimiento y número de serie
      ctx.fillStyle = '#cbb98d';
      ctx.fillRect(panelX + 3, panelTop + panelH - 15, 13, 7);
      ctx.fillStyle = '#8f2f24';
      ctx.fillRect(panelX + 4, panelTop + panelH - 14, 11, 2);
      ctx.fillStyle = 'rgba(60, 45, 30, 0.8)';
      ctx.fillRect(panelX + 5, panelTop + panelH - 10, 8, 1);
      ctx.fillStyle = 'rgba(226, 214, 180, 0.32)';
      ctx.font = '700 3px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`N.º ${arcade.year}`, panelX + panelW - 3, panelTop + panelH - 4);
    }

    // El periscopio del shooter también asoma por detrás
    if (variant === 'shooter') {
      ctx.fillStyle = '#0b0908';
      ctx.fillRect(cx - 5, bodyTop - 9, 10, 10);
      ctx.fillStyle = '#3f3b4c';
      ctx.fillRect(cx - 4, bodyTop - 8, 8, 8);
      ctx.fillStyle = accent;
      ctx.fillRect(cx - 2, bodyTop - 7, 4, 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(cx - 1, bodyTop - 7, 1, 1);
    }

    // Cable de alimentación arrastrado hasta el suelo
    ctx.strokeStyle = 'rgba(6, 5, 4, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + panelW / 2 - 4, panelTop + panelH - 2);
    ctx.bezierCurveTo(cx + bw * 0.5, baseY - 6, cx + bw * 0.62, baseY + 2, cx + bw * 0.7, baseY + 6);
    ctx.stroke();
    ctx.fillStyle = '#14110d';
    ctx.fillRect(cx + Math.round(bw * 0.7), baseY + 4, 5, 3);
    // Polvo y arañazos del trasero
    ctx.fillStyle = 'rgba(210, 195, 165, 0.1)';
    ctx.fillRect(cx - bw / 2 + 3, baseY - 8, bw - 6, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(cx - bw / 2 + 2, bodyTop + Math.round(bodyH * 0.45), 2, Math.round(bodyH * 0.3));

    ctx.restore();
    return;
  }

  // Marquesina superior iluminada (fundida o muerta)
  const marqueeH = Math.max(9, Math.round(bodyH * 0.15));
  if (!broken) {
    const halo = ctx.createRadialGradient(
      cx,
      bodyTop + marqueeH / 2,
      3,
      cx,
      bodyTop + marqueeH / 2,
      bw * 0.85
    );
    halo.addColorStop(0, `${accent}24`);
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(cx - bw, bodyTop - 6, bw * 2, marqueeH + 20);
  }
  ctx.fillStyle = '#0b0908';
  ctx.fillRect(cx - bw / 2 + 4, bodyTop + 4, bw - 8, marqueeH);
  ctx.fillStyle = broken ? '#2a251f' : tintHex(accent, 0.55);
  ctx.fillRect(cx - bw / 2 + 5, bodyTop + 5, bw - 10, marqueeH - 2);
  ctx.fillStyle = broken
    ? 'rgba(210, 200, 180, 0.35)'
    : 'rgba(255, 245, 220, 0.85)';
  const marqueeFont = bw >= 60 ? 6 : 5;
  ctx.font = `700 ${marqueeFont}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(arcade.marquee, cx, bodyTop + 5 + marqueeH - 3);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(cx - bw / 2 + 5, bodyTop + 5, bw - 10, 1);

  // Pantalla CRT hundida en el mueble
  const screenW = bw - 16;
  const screenH = Math.max(10, Math.round(bodyH * 0.36));
  const screenX = cx - screenW / 2;
  const screenY = bodyTop + marqueeH + 6;
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(screenX - 2, screenY - 2, screenW + 4, screenH + 4);
  ctx.fillStyle = '#050606';
  ctx.fillRect(screenX, screenY, screenW, screenH);
  ctx.fillStyle = broken ? '#15130f' : tintHex(accent, 0.22);
  ctx.fillRect(screenX + 1, screenY + 1, screenW - 2, screenH - 2);

  if (!broken) {
    // Fantasmas de imagen y reflejo del local (sin juego activo)
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = accent;
    for (let gy = screenY + 3; gy < screenY + screenH - 2; gy += 3) {
      ctx.fillRect(screenX + 3, gy, Math.max(2, screenW - 8 - (gy % 11)), 1);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(180, 220, 220, 0.1)';
    ctx.fillRect(screenX + 3, screenY + 2, screenW - 6, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.beginPath();
    ctx.moveTo(screenX + 4, screenY + screenH - 3);
    ctx.lineTo(screenX + screenW * 0.55, screenY + 2);
    ctx.lineTo(screenX + screenW * 0.72, screenY + 2);
    ctx.lineTo(screenX + 9, screenY + screenH - 3);
    ctx.closePath();
    ctx.fill();
  } else {
    // Cristal roto: grietas y polvo
    ctx.strokeStyle = 'rgba(200, 210, 205, 0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(screenX + 4, screenY + 2);
    ctx.lineTo(screenX + screenW * 0.4, screenY + screenH * 0.5);
    ctx.lineTo(screenX + screenW * 0.2, screenY + screenH - 3);
    ctx.moveTo(screenX + screenW * 0.4, screenY + screenH * 0.5);
    ctx.lineTo(screenX + screenW - 4, screenY + screenH * 0.68);
    ctx.moveTo(screenX + screenW * 0.4, screenY + screenH * 0.5);
    ctx.lineTo(screenX + screenW * 0.65, screenY + 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(210, 200, 180, 0.2)';
    ctx.fillRect(screenX + 3, screenY + screenH - 4, screenW - 6, 2);
  }

  // Bisel inferior de la pantalla
  ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.fillRect(screenX, screenY + screenH, screenW, 1);

  // Panel de control con joystick y botones (sobresale del cuerpo)
  const panelY = screenY + screenH + 4;
  const panelH = Math.max(7, Math.round(bodyH * 0.14));
  ctx.fillStyle = '#0b0908';
  ctx.fillRect(cx - bw / 2 - 3, panelY - 1, bw + 6, panelH + 4);
  ctx.fillStyle = bodyPalette.edge;
  ctx.fillRect(cx - bw / 2 - 2, panelY - 1, bw + 4, 2);
  ctx.fillStyle = variant === 'cabaret' ? '#2a1b10' : '#1a1917';
  ctx.fillRect(cx - bw / 2 - 1, panelY + 1, bw + 2, panelH);
  ctx.fillStyle = 'rgba(255, 240, 210, 0.08)';
  ctx.fillRect(cx - bw / 2 - 1, panelY + 1, bw + 2, 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(cx - bw / 2 - 3, panelY + panelH + 2, bw + 6, 2);

  if (variant === 'gutted') {
    // Panel arrancado: cables y hueco
    ctx.fillStyle = '#080706';
    ctx.fillRect(cx - bw / 2 + 5, panelY - 2, bw - 10, panelH + 4);
    ctx.strokeStyle = '#8a6a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 6, panelY + panelH);
    ctx.quadraticCurveTo(cx - 10, panelY + panelH + 8, cx - 3, panelY + panelH + 12);
    ctx.moveTo(cx + 4, panelY + panelH);
    ctx.quadraticCurveTo(cx + 9, panelY + panelH + 6, cx + 2, panelY + panelH + 10);
    ctx.stroke();
  } else if (variant === 'deluxe') {
    // Volante y botones cromados
    ctx.strokeStyle = '#c9b98f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx - 6, panelY + Math.floor(panelH / 2), 3.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.fillRect(cx + 2, panelY + 2, 2, 2);
    ctx.fillRect(cx + 6, panelY + 3, 2, 2);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(cx + 10, panelY + 2, 2, 2);
  } else if (variant === 'vector') {
    // Botonera mínima de vectorial
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(cx - 7, panelY + Math.floor(panelH / 2) - 1, 2, 2);
    ctx.fillStyle = accent;
    ctx.fillRect(cx + 3, panelY + 2, 2, 2);
    ctx.fillRect(cx + 7, panelY + 3, 2, 2);
  } else {
    // Joystick y botones
    ctx.fillStyle = '#0a0908';
    ctx.beginPath();
    ctx.arc(cx - 7, panelY + Math.floor(panelH / 2), 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(cx + 1, panelY + 2, 2, 2);
    ctx.fillRect(cx + 5, panelY + 3, 2, 2);
    if (bw >= 58) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(cx + 9, panelY + 2, 2, 2);
    }
  }

  // Puerta de monedas con ranuras y placa metálica
  const coinY = baseY - Math.round(bodyH * 0.16);
  ctx.fillStyle = '#0a0908';
  ctx.fillRect(cx - 8, coinY, 16, 12);
  ctx.fillStyle = '#4b4f4e';
  ctx.fillRect(cx - 7, coinY + 1, 14, 10);
  ctx.fillStyle = '#151413';
  ctx.fillRect(cx - 6, coinY + 3, 4, 5);
  ctx.fillRect(cx + 2, coinY + 3, 4, 5);
  ctx.fillStyle = '#8d928e';
  ctx.fillRect(cx - 5, coinY + 4, 2, 1);
  ctx.fillRect(cx + 3, coinY + 4, 2, 1);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(cx - 5, coinY + 9, 10, 1);

  // Rejilla de ventilación / zócalo de patas
  ctx.fillStyle = '#0b0a09';
  ctx.fillRect(cx - bw / 2 + 4, baseY - 5, bw - 8, 4);
  ctx.fillStyle = 'rgba(200, 200, 190, 0.12)';
  for (let vx = cx - bw / 2 + 6; vx < cx + bw / 2 - 6; vx += 4) {
    ctx.fillRect(vx, baseY - 4, 1, 2);
  }

  // Periscopio del shooter
  if (variant === 'shooter') {
    ctx.fillStyle = '#0b0908';
    ctx.fillRect(cx - 4, bodyTop - 7, 8, 9);
    ctx.fillStyle = '#3f3b4c';
    ctx.fillRect(cx - 3, bodyTop - 6, 6, 7);
    ctx.fillStyle = accent;
    ctx.fillRect(cx - 2, bodyTop - 5, 4, 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(cx - 1, bodyTop - 5, 1, 1);
  }

  // Etiqueta de año / número de serie en la parte baja del mueble
  ctx.fillStyle = 'rgba(226, 214, 180, 0.35)';
  ctx.font = '700 3px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${arcade.year}`, cx, baseY - 20);

  // Repisa con vasos / cenicero en algunos modelos
  if (variant === 'upright' && arcade.year <= '1977') {
    ctx.fillStyle = '#0b0908';
    ctx.fillRect(cx + bw / 2 - 3, screenY + 4, 6, 2);
    ctx.fillStyle = 'rgba(200, 190, 160, 0.28)';
    ctx.fillRect(cx + bw / 2 - 2, screenY + 3, 3, 1);
  }

  ctx.restore();
}

function drawCuatroCaminosArcadeAtmosphere(
  ctx: CanvasRenderingContext2D,
  area: SubAreaSpec,
  wb: SubAreaSpec['walkableBounds'],
  elapsed: number,
  reducedMotion: boolean
): void {
  // Polvo suspendido en la luz cálida
  ctx.save();
  for (let i = 0; i < 44; i++) {
    const speed = 2 + arcadeNoise(i * 2.7) * 5;
    const px = wb.x + 16 + arcadeNoise(i * 4.1) * (wb.w - 32) + Math.sin(elapsed * 0.4 + i) * 8;
    const py = wb.y + 20 + ((arcadeNoise(i * 9.3) * wb.h + elapsed * speed) % (wb.h - 20));
    const alpha = 0.08 + arcadeNoise(i * 6.3) * 0.13;
    ctx.fillStyle = `rgba(253, 224, 139, ${alpha})`;
    ctx.fillRect(px, py, i % 5 === 0 ? 3 : 2, 2);
  }
  ctx.restore();

  // Viñeta de abandono: esquinas oscuras, centro tibio
  const cx = wb.x + wb.w / 2;
  const cy = wb.y + wb.h / 2;
  const vignette = ctx.createRadialGradient(
    cx,
    cy,
    Math.min(wb.w, wb.h) * 0.24,
    cx,
    cy,
    Math.max(wb.w, wb.h) * 0.62
  );
  vignette.addColorStop(0, 'rgba(4, 3, 6, 0)');
  vignette.addColorStop(0.62, 'rgba(4, 3, 6, 0.14)');
  vignette.addColorStop(1, 'rgba(3, 2, 5, 0.54)');
  ctx.fillStyle = vignette;
  ctx.fillRect(wb.x, wb.y, wb.w, wb.h);

  // Parpadeo tenue del tubo fluorescente del rincón oeste
  if (!reducedMotion) {
    const flick = Math.sin(elapsed * 9.3) * Math.sin(elapsed * 2.1);
    if (flick > 0.55) {
      ctx.fillStyle = 'rgba(253, 224, 139, 0.035)';
      ctx.fillRect(wb.x, wb.y, wb.w, wb.h);
    }
  }
}


export function renderSubAreaFrame(params: SubAreaRenderParams): void {
  const {
    ctx,
    vw,
    vh,
    area,
    elapsed,
    reducedMotion,
    player,
    skinColor,
    hairColor,
    shirtColor,
    appearance,
    progressState,
    allUnlocked,
    steppedTileOrder,
    activeRgbPillars = [],
    pickupBursts,
    prompt,
    scannerPulse,
  } = params;

  ctx.imageSmoothingEnabled = false;

  // Fondo exterior de la sala o mar estelar 80s
  if (area.id === 'island-80s') {
    const grad = ctx.createLinearGradient(0, 0, 0, vh);
    grad.addColorStop(0, '#090318');
    grad.addColorStop(0.5, '#1e0b36');
    grad.addColorStop(1, '#09051a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);

    // Sol retrowave pixelado en el horizonte de los 80
    const sunX = vw * 0.76;
    const sunY = Math.max(92, vh * 0.16);
    ctx.save();
    const sunGrad = ctx.createLinearGradient(sunX, sunY - 48, sunX, sunY + 48);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(0.55, '#f97316');
    sunGrad.addColorStop(1, '#e11d48');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e0b36';
    for (let sy = sunY + 6; sy < sunY + 46; sy += 9) {
      ctx.fillRect(sunX - 50, sy, 100, 3);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#030612';
    ctx.fillRect(0, 0, vw, vh);
  }

  // Cámara centrada o desplazable suavemente según tamaño del recinto
  const camX =
    area.width <= vw
      ? -(vw - area.width) * 0.5
      : Math.max(-40, Math.min(area.width - vw + 40, player.x - vw * 0.5));
  const camY =
    area.height <= vh
      ? -(vh - area.height) * 0.5
      : Math.max(-40, Math.min(area.height - vh + 40, player.y - vh * 0.5));

  ctx.save();
  ctx.translate(-Math.round(camX), -Math.round(camY));

  const wb = area.walkableBounds;

  // Muros perimetrales, zócalos, vigas de madera, haces de luz y suelo de parquet/terracota
  drawSubAreaWallsAndFloor(ctx, area, wb, elapsed, reducedMotion);

  // Taller Retro State TS · ambiente interior (forja, tablero de herramientas,
  // planos, conducciones y desorden de trabajo) por debajo de los props y PNJ.
  if (area.id === 'interior-taller-alcorn') {
    ctx.save();

    // Luz cálida de la forja derramada sobre muro y suelo.
    const forgeGlow = ctx.createRadialGradient(380, 146, 6, 380, 146, 118);
    forgeGlow.addColorStop(0, 'rgba(251, 146, 60, 0.17)');
    forgeGlow.addColorStop(0.45, 'rgba(249, 115, 22, 0.08)');
    forgeGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
    ctx.fillStyle = forgeGlow;
    ctx.fillRect(250, 96, 260, 230);

    // Lámparas colgantes del techo con conos de luz tenues.
    for (const lampX of [340, 470]) {
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(lampX - 1, 0, 2, 24);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(lampX - 11, 24, 22, 4);
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(lampX - 9, 28, 18, 4);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(lampX - 7, 28, 14, 3);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(lampX - 5, 29, 10, 1);
      const cone = ctx.createLinearGradient(lampX, 30, lampX, 148);
      cone.addColorStop(0, 'rgba(253, 224, 139, 0.1)');
      cone.addColorStop(1, 'rgba(253, 224, 139, 0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(lampX - 7, 30);
      ctx.lineTo(lampX + 7, 30);
      ctx.lineTo(lampX + 34, 150);
      ctx.lineTo(lampX - 34, 150);
      ctx.closePath();
      ctx.fill();
    }

    // Tablero de herramientas (pegboard) sobre el banco TTL.
    ctx.fillStyle = '#1a0e07';
    ctx.fillRect(323, 45, 86, 36);
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(325, 47, 82, 32);
    ctx.fillStyle = '#3a2412';
    for (let py = 50; py < 78; py += 4) {
      for (let px = 328; px < 405; px += 5) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
    // Herramientas colgadas: destornilladores, pinza y calibre.
    const tools = [
      { x: 333, col: '#f59e0b', len: 15 },
      { x: 344, col: '#ef4444', len: 12 },
      { x: 355, col: '#60a5fa', len: 16 },
      { x: 369, col: '#cbd5e1', len: 13 },
      { x: 388, col: '#94a3b8', len: 17 },
    ];
    for (const tool of tools) {
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(tool.x, 51, 2, tool.len);
      ctx.fillStyle = tool.col;
      ctx.fillRect(tool.x, 51, 1, tool.len - 3);
      ctx.fillStyle = '#2b1a0d';
      ctx.fillRect(tool.x - 1, 51, 4, 3);
      ctx.fillStyle = '#0b0f14';
      ctx.fillRect(tool.x - 1, 64 + (tool.x % 3), 4, 2);
    }
    ctx.fillStyle = '#8a5a2c';
    ctx.fillRect(365, 72, 14, 2);
    ctx.fillRect(371, 64, 2, 10);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(363, 63, 4, 3);

    // Planos y notas clavados en la pared este.
    ctx.fillStyle = '#0b111b';
    ctx.fillRect(449, 49, 80, 35);
    ctx.fillStyle = '#12324a';
    ctx.fillRect(451, 51, 76, 31);
    ctx.fillStyle = 'rgba(103, 232, 249, 0.65)';
    ctx.fillRect(455, 55, 30, 1);
    ctx.fillRect(455, 58, 44, 1);
    ctx.fillRect(455, 61, 22, 1);
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(492, 55, 26, 18);
    ctx.strokeRect(498, 60, 12, 8);
    ctx.fillStyle = 'rgba(253, 224, 139, 0.7)';
    ctx.fillRect(520, 74, 5, 4);
    ctx.fillStyle = '#fca5a5';
    ctx.fillRect(455, 68, 8, 6);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(466, 70, 16, 1);
    ctx.fillRect(466, 73, 11, 1);
    // Chinchetas.
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(452, 51, 2, 2);
    ctx.fillRect(526, 51, 2, 2);

    // Estantería de frascos con componentes al oeste.
    ctx.fillStyle = '#1a0e07';
    ctx.fillRect(102, 52, 64, 30);
    ctx.fillStyle = '#4a2b16';
    ctx.fillRect(104, 54, 60, 26);
    ctx.fillStyle = '#7a4b2a';
    ctx.fillRect(104, 54, 60, 2);
    ctx.fillRect(104, 66, 60, 2);
    for (let j = 0; j < 6; j++) {
      const jx = 107 + j * 9;
      ctx.fillStyle = j % 2 === 0 ? '#0e2a2f' : '#2a2314';
      ctx.fillRect(jx, 57, 6, 8);
      ctx.fillStyle = j % 3 === 0 ? '#67e8f9' : j % 3 === 1 ? '#f59e0b' : '#a3e635';
      ctx.fillRect(jx + 1, 58, 4, 6);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(jx + 2, 59, 1, 4);
      ctx.fillStyle = '#2a2314';
      ctx.fillRect(jx, 68, 6, 6);
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(jx + 1, 69, 4, 4);
    }

    // Tubería de cobre y caja de derivación en el muro oriental.
    ctx.fillStyle = '#6b4423';
    ctx.fillRect(592, 52, 58, 3);
    ctx.fillRect(647, 52, 3, 32);
    ctx.fillStyle = '#b8763a';
    ctx.fillRect(592, 52, 58, 1);
    ctx.fillRect(647, 52, 1, 32);
    ctx.fillStyle = '#202a34';
    ctx.fillRect(588, 48, 8, 10);
    ctx.fillRect(590, 78, 12, 3);
    ctx.fillStyle = Math.sin(elapsed * 2.2) > 0 ? '#4ade80' : '#14532d';
    ctx.fillRect(591, 51, 2, 2);
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(645, 82, 7, 2);

    // Manchas de aceite y virutas en el suelo.
    for (const [ox, oy, orad] of [
      [316, 238, 13],
      [505, 332, 10],
      [432, 214, 8],
    ] as const) {
      const stain = ctx.createRadialGradient(ox, oy, 1, ox, oy, orad);
      stain.addColorStop(0, 'rgba(8, 12, 10, 0.32)');
      stain.addColorStop(1, 'rgba(8, 12, 10, 0)');
      ctx.fillStyle = stain;
      ctx.fillRect(ox - orad, oy - orad, orad * 2, orad * 2);
      ctx.fillStyle = 'rgba(20, 26, 20, 0.4)';
      ctx.fillRect(ox - 5, oy + 1, 8, 2);
      ctx.fillRect(ox + 1, oy - 3, 4, 1);
    }
    // Carrete de cable junto al banco, con cable suelto.
    ctx.fillStyle = '#3b2412';
    ctx.beginPath();
    ctx.arc(500, 254, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a5a2c';
    ctx.beginPath();
    ctx.arc(500, 254, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a0e';
    ctx.beginPath();
    ctx.arc(500, 254, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8763a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(509, 258);
    ctx.quadraticCurveTo(524, 268, 516, 282);
    ctx.quadraticCurveTo(508, 292, 522, 298);
    ctx.stroke();
    // Caja de herramientas y piezas sueltas.
    ctx.fillStyle = '#0b0f14';
    ctx.fillRect(492, 396, 24, 14);
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(493, 397, 22, 12);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(493, 397, 22, 2);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(499, 393, 10, 4);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(500, 399, 8, 2);
    for (let bit = 0; bit < 8; bit++) {
      const th = (bit * 37 + 11) % 100;
      ctx.fillStyle = bit % 3 === 0 ? '#f59e0b' : bit % 3 === 1 ? '#67e8f9' : '#94a3b8';
      ctx.fillRect(330 + (th % 46), 206 + (th % 28), 2, 1);
    }
    // Umbral metálico de la puerta sur.
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(358, 444, 44, 6);
    ctx.fillStyle = '#475569';
    ctx.fillRect(358, 444, 44, 1);
    ctx.fillStyle = '#0b0f14';
    for (let bx2 = 362; bx2 < 400; bx2 += 7) {
      ctx.fillRect(bx2, 446, 1, 4);
    }

    ctx.restore();
  }

  // Muro Falso en el Taller Analógico (grieta sutil o puerta secreta abierta)
  if (area.id === 'interior-taller-alcorn') {
    const wallOpened =
      allUnlocked ||
      progressState.rpg.discoveredSecretIds.includes('secret-muro-taller');
    ctx.save();
    if (wallOpened) {
      ctx.fillStyle = '#020617';
      ctx.fillRect(360, wb.y - 34, 40, 36);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(360, wb.y - 34, 40, 36);
      ctx.fillStyle = '#22d3ee';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('1958 ↑', 380, wb.y - 14);
    } else {
      // Grieta sutil en mampostería para observadores atentos
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.48)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(374, wb.y - 24);
      ctx.lineTo(381, wb.y - 14);
      ctx.lineTo(376, wb.y - 6);
      ctx.lineTo(384, wb.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Cortina de agua luminiscente en la salida sur de la Gruta tras la Cascada
  if (area.id === 'cave-gruta-cascada') {
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
    ctx.fillRect(348, wb.y + wb.h - 8, 84, 26);
    ctx.fillStyle = '#e0f2fe';
    for (let i = 0; i < 5; i++) {
      const drop = reducedMotion ? i * 4 : ((elapsed * 45 + i * 9) % 20);
      ctx.fillRect(356 + i * 16, wb.y + wb.h - 6 + drop, 4, 6);
    }
    ctx.restore();
  }

  // Compuerta Norte hacia la Sala Secreta de Breakout (1976) en el Laberinto de Señales
  if (area.id === 'dungeon-laberinto-origen') {
    const rgbSolved =
      allUnlocked ||
      progressState.rpg.solvedPuzzleIds.includes(LABYRINTH_SECRET_DOOR.puzzleId);
    const dx = LABYRINTH_SECRET_DOOR.x;
    const dy = wb.y - 34;
    ctx.save();
    ctx.fillStyle = rgbSolved ? '#04121f' : '#1e1324';
    ctx.fillRect(dx - 26, dy, 52, 36);
    ctx.strokeStyle = rgbSolved ? '#22d3ee' : '#f97316';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(dx - 26, dy, 52, 36);
    ctx.fillStyle = rgbSolved ? '#22d3ee' : '#fb923c';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(rgbSolved ? '1976 ↑' : 'SELLADO', dx, dy + 21);
    ctx.restore();
  }

  // CUEVA GLITCH RPG · Efectos visuales de corrupción digital, haz láser y Núcleo del Origen
  if (area.id === 'dungeon-cueva-glitch') {
    ctx.save();

    // 1. Partículas flotantes de corrupción digital
    for (let i = 0; i < 35; i++) {
      const px = ((i * 123 + elapsed * 25) % (wb.w - 40)) + wb.x + 20;
      const py = ((i * 77 + Math.sin(elapsed * 2 + i) * 30) % (wb.h - 40)) + wb.y + 20;
      const colors = ['#00f3ff', '#f59e0b', '#c084fc', '#ef4444'];
      ctx.fillStyle = colors[i % colors.length];
      const gSize = (i % 3 === 0) ? 3 : 2;
      ctx.fillRect(px, py, gSize, gSize);
    }

    // 2. Sector del Pulso: Haz láser fotónico continuo
    const pulseAligned = allUnlocked || Boolean(progressState.rpg.cuevaPulseAligned) || progressState.rpg.inventoryItems.includes('item-fragmento-pulso');
    // Láser desde el emisor al prisma
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(180, 720);
    ctx.lineTo(260, 640);
    ctx.stroke();

    // Reflejo desde el prisma: si está alineado sube al receptor (y: 500), si no apunta a la pared
    ctx.beginPath();
    ctx.moveTo(260, 640);
    if (pulseAligned) {
      ctx.lineTo(260, 500);
      ctx.strokeStyle = '#38bdf8';
      ctx.stroke();

      // Resplandor en el receptor
      const glowR = 14 + Math.sin(elapsed * 8) * 3;
      const grad = ctx.createRadialGradient(260, 500, 2, 260, 500, glowR);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.8)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(260, 500, glowR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineTo(140, 640);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.stroke();
    }

    // 3. Sector de Circuitos: Conduits lógicos en el suelo
    const circuitDone = allUnlocked || Boolean(progressState.rpg.cuevaCircuitSolved) || progressState.rpg.inventoryItems.includes('item-fragmento-circuito');
    ctx.strokeStyle = circuitDone ? '#f59e0b' : 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(840, 660);
    ctx.lineTo(960, 660);
    ctx.lineTo(1080, 660);
    ctx.lineTo(1080, 730);
    ctx.stroke();

    // 4. Pared Secreta Fractal
    const secretPassageOpen = allUnlocked || progressState.rpg.discoveredSecretIds.includes('secret-cueva-fractal-passage');
    ctx.fillStyle = secretPassageOpen ? 'rgba(192, 132, 252, 0.15)' : '#10142b';
    ctx.fillRect(860, 360, 40, 40);
    ctx.strokeStyle = secretPassageOpen ? '#c084fc' : 'rgba(192, 132, 252, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(860, 360, 40, 40);
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(secretPassageOpen ? 'FRACTAL' : 'GRIETA', 880, 384);

    // 5. El Núcleo del Origen (Consola y anillos rotatorios 1972 - 1976 - 1978)
    const coreX = 600;
    const coreY = 150;
    const ringSpin = elapsed * 1.5;

    // Tres anillos de frecuencia concéntricos
    // Anillo 1972 (Cian)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 38, ringSpin, ringSpin + Math.PI * 1.5);
    ctx.stroke();

    // Anillo 1976 (Ámbar)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 52, -ringSpin * 0.8, -ringSpin * 0.8 + Math.PI * 1.4);
    ctx.stroke();

    // Anillo 1978 (Púrpura / Magenta)
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 66, ringSpin * 0.6, ringSpin * 0.6 + Math.PI * 1.3);
    ctx.stroke();

    // Resplandor del Núcleo
    const coreGlow = ctx.createRadialGradient(coreX, coreY, 5, coreX, coreY, 45);
    const origenStabilized = Boolean(progressState.rpg.origenMasterStabilized) || progressState.rpg.inventoryItems.includes('item-cartucho-origen');
    coreGlow.addColorStop(0, origenStabilized ? '#fef08a' : '#cffafe');
    coreGlow.addColorStop(0.6, origenStabilized ? 'rgba(250, 204, 21, 0.4)' : 'rgba(0, 243, 255, 0.3)');
    coreGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGlow;
    ctx.beginPath();
    ctx.arc(coreX, coreY, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = origenStabilized ? '#facc15' : '#ffffff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ORIGEN', coreX, coreY - 4);
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('1972·1976·1978', coreX, coreY + 6);

    ctx.restore();
  }

  // Alfombras / portales de salida
  for (const ex of area.exits) {
    if (area.id === 'interior-sala-cuatro-caminos') {
      // El umbral del salón se marca con la luz que entra de la calle,
      // no con el portal tecnológico genérico del resto de sub-áreas.
      const thresholdGlow = ctx.createRadialGradient(ex.x, ex.y - 4, 4, ex.x, ex.y - 4, 58);
      thresholdGlow.addColorStop(0, 'rgba(253, 224, 139, 0.24)');
      thresholdGlow.addColorStop(1, 'rgba(253, 224, 139, 0)');
      ctx.save();
      ctx.fillStyle = thresholdGlow;
      ctx.beginPath();
      ctx.ellipse(ex.x, ex.y - 2, 58, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(253, 224, 139, 0.5)';
      ctx.fillRect(ex.x - 15, ex.y + 2, 3, 2);
      ctx.fillRect(ex.x + 12, ex.y + 2, 3, 2);
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(ex.x - 24, ex.y - 10, 48, 18);
    ctx.strokeStyle = ex.accentHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(ex.x - 24, ex.y - 10, 48, 18);
    ctx.restore();
  }

  // Losetas de presión reactivas (Acertijo del Templo Pionero)
  if (area.pressurePuzzle) {
    const puzzleSolved =
      allUnlocked ||
      progressState.rpg.solvedPuzzleIds.includes(area.pressurePuzzle.puzzleId);
    for (const tile of area.pressurePuzzle.tiles) {
      const active =
        puzzleSolved || steppedTileOrder.includes(tile.orderIndex);
      ctx.save();
      ctx.translate(tile.x, tile.y);
      ctx.fillStyle = active ? tile.accentHex : '#1e293b';
      ctx.fillRect(-18, -18, 36, 36);
      ctx.strokeStyle = active ? '#ffffff' : tile.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(-18, -18, 36, 36);
      ctx.fillStyle = active ? '#020617' : '#e2e8f0';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tile.label, 0, 4);
      ctx.restore();
    }
  }

  // Mobiliario, cristales, estanques y el gabinete Donkey Kong 1981 en Isla 80s
  for (const prop of area.decorProps) {
    // Los gabinetes del salón arcade se dibujan en dos pasadas con orden de profundidad.
    if (prop.kind === 'arcade-machine') continue;
    ctx.save();
    if (prop.kind === 'carpet') {
      // Sombra proyectada por la alfombra sobre el parquet
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);

      // Fondo del tejido de lana
      const baseFabricHex = prop.accentHex || '#881337';
      ctx.fillStyle = baseFabricHex;
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);

      // Textura de entramado de tejido (Woven cross-hatch pattern)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let tx = prop.x + 2; tx < prop.x + prop.w - 2; tx += 6) {
        for (let ty = prop.y + 2; ty < prop.y + prop.h - 2; ty += 6) {
          ctx.fillRect(tx, ty, 3, 3);
        }
      }

      // Cenefa decorativa doble con motivos retro estilo GBA
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x + 5, prop.y + 5, prop.w - 10, prop.h - 10);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1;
      ctx.strokeRect(prop.x + 8, prop.y + 8, prop.w - 16, prop.h - 16);

      // Medallón central geométrico
      const cx = Math.floor(prop.x + prop.w / 2);
      const cy = Math.floor(prop.y + prop.h / 2);
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 20, cy);
      ctx.lineTo(cx, cy + 14);
      ctx.lineTo(cx - 20, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = baseFabricHex;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();

      // Flecos de hilo en los laterales izquierdo y derecho (Fabric fringes)
      ctx.fillStyle = '#fef08a';
      for (let fy = prop.y + 2; fy < prop.y + prop.h - 2; fy += 3) {
        ctx.fillRect(prop.x - 4, fy, 4, 1.5);
        ctx.fillRect(prop.x + prop.w, fy, 4, 1.5);
      }
    } else if (prop.kind === 'fireplace') {
      // Sombra proyectada
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(prop.x - 6, prop.y + prop.h - 4, prop.w + 12, 10);

      // Mampostería de ladrillo con relieve y mortero (Stone/Brick Masonry)
      ctx.fillStyle = '#220d04';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#6b2d13';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Patrón de ladrillos en bajorrelieve
      ctx.strokeStyle = '#1b0903';
      ctx.lineWidth = 1;
      let bRow = 0;
      for (let ly = prop.y + 4; ly < prop.y + prop.h - 8; ly += 7) {
        ctx.beginPath();
        ctx.moveTo(prop.x + 2, ly);
        ctx.lineTo(prop.x + prop.w - 2, ly);
        ctx.stroke();

        const offset = (bRow % 2 === 0) ? 0 : 8;
        for (let bx = prop.x + 2 + offset; bx < prop.x + prop.w - 2; bx += 16) {
          ctx.beginPath();
          ctx.moveTo(bx, ly);
          ctx.lineTo(bx, ly + 7);
          ctx.stroke();
        }
        bRow++;
      }

      // Cavidad del hogar del fuego
      ctx.fillStyle = '#080c14';
      ctx.fillRect(prop.x + 10, prop.y + 14, prop.w - 20, prop.h - 16);

      // Troncos de leña de encina incandescentes
      ctx.fillStyle = '#2d1305';
      ctx.fillRect(prop.x + 14, prop.y + prop.h - 8, prop.w - 28, 4);
      ctx.fillStyle = '#782d08';
      ctx.fillRect(prop.x + 18, prop.y + prop.h - 11, prop.w - 36, 4);

      // Fuego animado multicapa
      const flicker = reducedMotion ? 1 : 0.82 + Math.sin(elapsed * 9.5) * 0.18;
      const flameH = (prop.h - 18) * flicker;
      const fireGrad = ctx.createLinearGradient(0, prop.y + prop.h - 6, 0, prop.y + prop.h - 6 - flameH);
      fireGrad.addColorStop(0, '#dc2626');
      fireGrad.addColorStop(0.4, '#ea580c');
      fireGrad.addColorStop(0.8, '#facc15');
      fireGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = fireGrad;

      ctx.beginPath();
      ctx.moveTo(prop.x + 12, prop.y + prop.h - 6);
      ctx.quadraticCurveTo(prop.x + prop.w / 2, prop.y + prop.h - 6 - flameH * 1.35, prop.x + prop.w - 12, prop.y + prop.h - 6);
      ctx.closePath();
      ctx.fill();

      // Chispas flotantes que ascienden por el tiro de la chimenea
      if (!reducedMotion) {
        for (let sp = 0; sp < 4; sp++) {
          const sx = prop.x + prop.w / 2 + Math.sin(elapsed * 4 + sp * 2) * 10;
          const sy = prop.y + prop.h - 12 - ((elapsed * 28 + sp * 14) % (prop.h - 16));
          ctx.fillStyle = (sp % 2 === 0) ? '#fde047' : '#f97316';
          ctx.fillRect(sx, sy, 2, 2);
        }
      }

      // Resplandor cálido ambiental en abanico (Warm Radial Halo)
      const glowR = 48 + Math.sin(elapsed * 6) * 8;
      const fGlow = ctx.createRadialGradient(
        prop.x + prop.w / 2, prop.y + prop.h - 8, 4,
        prop.x + prop.w / 2, prop.y + prop.h - 8, glowR
      );
      fGlow.addColorStop(0, 'rgba(251, 146, 60, 0.45)');
      fGlow.addColorStop(0.5, 'rgba(251, 146, 60, 0.15)');
      fGlow.addColorStop(1, 'rgba(251, 146, 60, 0)');
      ctx.fillStyle = fGlow;
      ctx.beginPath();
      ctx.arc(prop.x + prop.w / 2, prop.y + prop.h - 8, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Repisa superior tallada de madera nogal maciza (Mantlepiece)
      ctx.fillStyle = '#170c06';
      ctx.fillRect(prop.x - 3, prop.y - 3, prop.w + 6, 7);
      ctx.fillStyle = '#5c351c';
      ctx.fillRect(prop.x - 2, prop.y - 3, prop.w + 4, 3);
      ctx.fillStyle = '#8f5630';
      ctx.fillRect(prop.x - 2, prop.y - 3, prop.w + 4, 1);

      // Adorno sobre la repisa: Reloj de bronce estilo chimenea victoriana
      const clockX = Math.round(prop.x + prop.w / 2 - 6);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(clockX, prop.y - 11, 12, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(clockX + 3, prop.y - 9, 6, 4);

      if (prop.label) {
        ctx.fillStyle = '#fde047';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 14);
      }
    } else if (prop.kind === 'bed') {
      // Sombra de contacto
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(prop.x - 2, prop.y + prop.h - 4, prop.w + 4, 8);

      // Cabecero de madera nogal maciza con paneles tallados
      ctx.fillStyle = '#1f1007';
      ctx.fillRect(prop.x, prop.y, prop.w, 16);
      ctx.fillStyle = '#422513';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, 12);
      ctx.fillStyle = '#6e3e20';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, 2);

      // Colchón con sábana de lino crema y pliegue superior doblado
      ctx.fillStyle = '#2b180d'; // Bastidor de la cama
      ctx.fillRect(prop.x + 1, prop.y + 14, prop.w - 2, prop.h - 16);
      ctx.fillStyle = '#fef3c7'; // Sábana base
      ctx.fillRect(prop.x + 3, prop.y + 14, prop.w - 6, prop.h - 18);

      // Manta acolchada con patrón de costura de rombos (Quilted Bedspread)
      const quiltHex = prop.accentHex || '#b45309';
      ctx.fillStyle = quiltHex;
      ctx.fillRect(prop.x + 3, prop.y + 28, prop.w - 6, prop.h - 32);

      // Líneas de costura acolchada
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 1;
      for (let qx = prop.x + 7; qx < prop.x + prop.w - 6; qx += 8) {
        ctx.beginPath();
        ctx.moveTo(qx, prop.y + 28);
        ctx.lineTo(qx + 10, prop.y + prop.h - 4);
        ctx.stroke();
      }

      // Embozo de la sábana doblada sobre la manta
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(prop.x + 3, prop.y + 26, prop.w - 6, 3);

      // Almohadas esponjosas dobles con hundimiento central (Pillows)
      const pillowW = Math.floor((prop.w - 14) / 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(prop.x + 5, prop.y + 16, pillowW, 9);
      ctx.fillRect(prop.x + prop.w - 5 - pillowW, prop.y + 16, pillowW, 9);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(prop.x + 6, prop.y + 16, pillowW - 2, 7);
      ctx.fillRect(prop.x + prop.w - 4 - pillowW, prop.y + 16, pillowW - 2, 7);

      // Pie de cama de madera
      ctx.fillStyle = '#1f1007';
      ctx.fillRect(prop.x, prop.y + prop.h - 5, prop.w, 5);
      ctx.fillStyle = '#543720';
      ctx.fillRect(prop.x + 2, prop.y + prop.h - 5, prop.w - 4, 2);

      if (prop.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 4);
      }
    } else if (prop.kind === 'dining-table') {
      // Sombra elíptica suave debajo de la mesa y las sillas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(prop.x + prop.w / 2, prop.y + prop.h / 2 + 10, prop.w * 0.58, prop.h * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sillas de madera con respaldo de barrotes y cojín (Chairs)
      ctx.fillStyle = '#23130a'; // Silla izquierda
      ctx.fillRect(prop.x - 12, prop.y + Math.floor(prop.h / 2) - 14, 12, 28);
      ctx.fillRect(prop.x + prop.w, prop.y + Math.floor(prop.h / 2) - 14, 12, 28);
      ctx.fillStyle = '#5c381f';
      ctx.fillRect(prop.x - 10, prop.y + Math.floor(prop.h / 2) - 12, 9, 24);
      ctx.fillRect(prop.x + prop.w + 1, prop.y + Math.floor(prop.h / 2) - 12, 9, 24);

      // Cojín de la silla
      ctx.fillStyle = prop.accentHex || '#b45309';
      ctx.fillRect(prop.x - 9, prop.y + Math.floor(prop.h / 2) - 4, 8, 12);
      ctx.fillRect(prop.x + prop.w + 1, prop.y + Math.floor(prop.h / 2) - 4, 8, 12);

      // Patas de la mesa de madera torneada
      ctx.fillStyle = '#1c0f08';
      ctx.fillRect(prop.x + 6, prop.y + 16, 6, prop.h - 16);
      ctx.fillRect(prop.x + prop.w - 12, prop.y + 16, 6, prop.h - 16);

      // Tablero principal con veteado de madera (Tabletop)
      ctx.fillStyle = '#361e0e';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h - 10);
      ctx.fillStyle = '#5e361b';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 14);
      ctx.fillStyle = '#8f5630';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, 2);

      // Camino de mesa de encaje/lino en el centro (Table runner)
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(prop.x + 14, prop.y + 2, prop.w - 28, prop.h - 14);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(prop.x + 14, prop.y + 2, 2, prop.h - 14);
      ctx.fillRect(prop.x + prop.w - 16, prop.y + 2, 2, prop.h - 14);

      // Vajilla cotidiana sobre la mesa: Plato cerámico, taza de té humeante y jarra
      const mx = Math.floor(prop.x + prop.w / 2);
      // Plato cerámico
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(mx - 12, prop.y + 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.arc(mx - 12, prop.y + 12, 4, 0, Math.PI * 2);
      ctx.fill();

      // Taza de té humeante
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(mx + 10, prop.y + 9, 6, 6);
      if (!reducedMotion) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(mx + 12 + Math.sin(elapsed * 4) * 2, prop.y + 3, 2, 4);
      }

      // Lámpara de quinqué / Candelabro de bronce encendido con resplandor cálido
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(mx - 2, prop.y + 10, 4, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(mx - 1, prop.y + 6, 2, 4);

      const lampGlow = ctx.createRadialGradient(mx, prop.y + 8, 2, mx, prop.y + 8, 24);
      lampGlow.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
      lampGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(mx, prop.y + 8, 24, 0, Math.PI * 2);
      ctx.fill();

      if (prop.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 4);
      }
    } else if (prop.kind === 'potted-plant') {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.beginPath();
      ctx.ellipse(prop.x + prop.w / 2, prop.y + prop.h - 2, prop.w * 0.48, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Maceta de terracota texturizada con moldura superior
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(prop.x + 4, prop.y + prop.h - 18);
      ctx.lineTo(prop.x + prop.w - 4, prop.y + prop.h - 18);
      ctx.lineTo(prop.x + prop.w - 7, prop.y + prop.h);
      ctx.lineTo(prop.x + 7, prop.y + prop.h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#c2410c';
      ctx.fillRect(prop.x + 3, prop.y + prop.h - 18, prop.w - 6, prop.h - 20);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(prop.x + 2, prop.y + prop.h - 21, prop.w - 4, 4);

      // Frondosas hojas multicapa con nervaduras y rocío
      const leaves = [
        { x: prop.x + prop.w / 2, y: prop.y + 6, r: 12, c1: '#14532d', c2: '#16a34a' },
        { x: prop.x + 8, y: prop.y + 13, r: 9, c1: '#14532d', c2: '#22c55e' },
        { x: prop.x + prop.w - 8, y: prop.y + 13, r: 9, c1: '#14532d', c2: '#22c55e' },
        { x: prop.x + 12, y: prop.y + 5, r: 8, c1: '#16a34a', c2: '#4ade80' },
        { x: prop.x + prop.w - 12, y: prop.y + 5, r: 8, c1: '#16a34a', c2: '#4ade80' },
      ];

      leaves.forEach((l) => {
        ctx.fillStyle = l.c1;
        ctx.beginPath();
        ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = l.c2;
        ctx.beginPath();
        ctx.arc(l.x - 1, l.y - 1, l.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      // Brillo de gota de rocío
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(prop.x + prop.w / 2 - 1, prop.y + 3, 2, 2);
    } else if (prop.kind === 'framed-painting') {
      // Cuadro con marco de madera dorada/nogal estilo pieza de museo GBA
      ctx.fillStyle = '#1c0e06';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(prop.x + 3, prop.y + 3, prop.w - 6, prop.h - 6);

      // Lienzo interior pintado (Canvas artwork)
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(prop.x + 5, prop.y + 5, prop.w - 10, prop.h - 10);

      // Paisaje pixel-art: Sol naciente, montañas e hilos de cascada
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(prop.x + 5, prop.y + 5, prop.w - 10, Math.floor((prop.h - 10) * 0.6));
      ctx.fillStyle = '#facc15';
      ctx.fillRect(prop.x + prop.w - 14, prop.y + 7, 5, 5);

      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(prop.x + 5, prop.y + prop.h - 5);
      ctx.lineTo(prop.x + 16, prop.y + 11);
      ctx.lineTo(prop.x + 26, prop.y + prop.h - 5);
      ctx.closePath();
      ctx.fill();

      // Reflejo diagonal de cristal (Glass glare)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(prop.x + 5, prop.y + 5);
      ctx.lineTo(prop.x + 15, prop.y + 5);
      ctx.lineTo(prop.x + 5, prop.y + 15);
      ctx.closePath();
      ctx.fill();

      if (prop.label) {
        ctx.fillStyle = prop.accentHex || '#fde047';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 4);
      }
    } else if (prop.kind === 'dresser') {
      // Sombra
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(prop.x - 2, prop.y + prop.h - 4, prop.w + 4, 8);

      // Armario / Cómoda de madera nogal con molduras
      ctx.fillStyle = '#1e1007';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#452613';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Cajones con paneles marqueteados y tiradores metálicos
      const drawers = 3;
      const drawerH = (prop.h - 8) / drawers;
      for (let d = 0; d < drawers; d++) {
        const dy = prop.y + 4 + d * drawerH;
        ctx.fillStyle = '#22130a';
        ctx.fillRect(prop.x + 4, dy, prop.w - 8, drawerH - 2);
        ctx.fillStyle = '#5c381f';
        ctx.fillRect(prop.x + 5, dy + 1, prop.w - 10, drawerH - 4);

        // Tiradores de latón pulido (Brass Ring Handles)
        ctx.fillStyle = '#fde047';
        ctx.fillRect(prop.x + Math.floor(prop.w * 0.3) - 2, dy + drawerH / 2 - 2, 4, 3);
        ctx.fillRect(prop.x + Math.floor(prop.w * 0.7) - 2, dy + drawerH / 2 - 2, 4, 3);
      }

      // Adorno sobre la cómoda: Pequeña planta o candelabro
      ctx.fillStyle = '#15803d';
      ctx.fillRect(prop.x + 8, prop.y - 6, 8, 6);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(prop.x + 9, prop.y - 3, 6, 3);

      if (prop.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 8);
      }
    } else if (prop.kind === 'workbench') {
      const isSecretShelf = prop.label === 'Estantería Mecánica';
      const shelfSolved =
        isSecretShelf &&
        (allUnlocked || progressState.rpg.solvedPuzzleIds.includes('puzzle-cronica-reyes'));
      const drawX = shelfSolved ? prop.x + 64 : prop.x;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(drawX - 2, prop.y + prop.h - 4, prop.w + 4, 8);

      // Banco de trabajo / Estantería de roble pesado
      ctx.fillStyle = shelfSolved ? '#1e293b' : '#1f1108';
      ctx.fillRect(drawX, prop.y, prop.w, prop.h);
      ctx.fillStyle = shelfSolved ? '#334155' : '#4a2c18';
      ctx.fillRect(drawX + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Herramientas y planos esparcidos sobre la mesa
      ctx.fillStyle = '#fef08a'; // Plano enrollado
      ctx.fillRect(drawX + 10, prop.y + 8, 22, 10);
      ctx.fillStyle = '#94a3b8'; // Llave inglesa / herramientas
      ctx.fillRect(drawX + 38, prop.y + 12, 12, 3);
      ctx.fillRect(drawX + 46, prop.y + 10, 3, 7);

      ctx.strokeStyle = shelfSolved ? '#f59e0b' : prop.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, prop.y, prop.w, prop.h);

      if (prop.label) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          shelfSolved ? '¡Pasadizo Abierto!' : prop.label,
          drawX + prop.w / 2,
          prop.y + prop.h - 10
        );
      }
    } else if (prop.kind === 'archive-shelf') {
      // Estantería de biblioteca de caoba con libros multicolor y tomos encuadernados
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(prop.x - 2, prop.y + prop.h - 4, prop.w + 4, 8);

      ctx.fillStyle = '#1a0e07';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#3d2212';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Estantes interiores
      const shelves = 2;
      const shelfH = (prop.h - 8) / shelves;
      const bookColors = ['#991b1b', '#1e3a8a', '#065f46', '#854d0e', '#581c87', '#9a3412'];

      for (let s = 0; s < shelves; s++) {
        const sy = prop.y + 4 + s * shelfH;
        // Hueco del estante
        ctx.fillStyle = '#100804';
        ctx.fillRect(prop.x + 4, sy, prop.w - 8, shelfH - 3);

        // Lomos de libros alineados
        let bx = prop.x + 6;
        let cIdx = s;
        while (bx < prop.x + prop.w - 10) {
          const bW = 3 + (bx % 3);
          const bH = shelfH - 6 - (bx % 4);
          ctx.fillStyle = bookColors[cIdx % bookColors.length];
          ctx.fillRect(bx, sy + shelfH - 3 - bH, bW, bH);

          // Nervio dorado del lomo
          ctx.fillStyle = '#fde047';
          ctx.fillRect(bx, sy + shelfH - 3 - bH + 2, bW, 1);

          bx += bW + 1;
          cIdx++;
        }

        // Estante de madera
        ctx.fillStyle = '#6e3e20';
        ctx.fillRect(prop.x + 2, sy + shelfH - 3, prop.w - 4, 3);
      }

      if (prop.label) {
        ctx.fillStyle = prop.accentHex || '#fde047';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 4);
      }
    } else if (prop.kind === 'crt-rack' || prop.kind === 'oscilloscope-altar') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = prop.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(prop.x + prop.w / 2, prop.y + prop.h / 2, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#39ff14';
      ctx.beginPath();
      ctx.moveTo(prop.x + prop.w / 2 - 9, prop.y + prop.h / 2 + 2);
      ctx.quadraticCurveTo(
        prop.x + prop.w / 2,
        prop.y + prop.h / 2 - 9 * Math.sin(elapsed * 3),
        prop.x + prop.w / 2 + 9,
        prop.y + prop.h / 2 + 2
      );
      ctx.stroke();
    } else if (prop.kind === 'underground-pool') {
      const hydraulicSolved =
        area.id === 'castle-cimientos' &&
        (allUnlocked || progressState.rpg.solvedPuzzleIds.includes('puzzle-valvulas-hidraulicas'));
      ctx.fillStyle = hydraulicSolved ? '#0f172a' : '#083344';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = hydraulicSolved ? '#06b6d4' : '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      if (hydraulicSolved) {
        ctx.fillStyle = '#22d3ee';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('FOSA DRENADA · MONTACARGAS ACTIVO', prop.x + prop.w / 2, prop.y + prop.h / 2 + 3);
      } else {
        ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
        const rip = reducedMotion ? 8 : 8 + Math.sin(elapsed * 3) * 6;
        ctx.fillRect(prop.x + 18, prop.y + rip, prop.w - 36, 4);
      }
    } else if (prop.kind === 'cave-crystal') {
      ctx.translate(prop.x + prop.w / 2, prop.y + prop.h);
      ctx.fillStyle = prop.accentHex;
      ctx.beginPath();
      ctx.moveTo(0, -prop.h);
      ctx.lineTo(prop.w / 2, -prop.h * 0.35);
      ctx.lineTo(prop.w * 0.3, 0);
      ctx.lineTo(-prop.w * 0.3, 0);
      ctx.lineTo(-prop.w / 2, -prop.h * 0.4);
      ctx.closePath();
      ctx.fill();
    } else if (prop.kind === 'astral-ferry') {
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NAVÍO 70s', prop.x + prop.w / 2, prop.y + prop.h / 2 + 3);
    } else if (prop.kind === 'neon-arch') {
      ctx.fillStyle = '#311042';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#fde047';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PASEO NEÓN 80s', prop.x + prop.w / 2, prop.y + 23);
    } else if (prop.kind === 'dk-cabinet-1981') {
      const dkDone =
        allUnlocked || Boolean(progressState.games['donkey-kong']?.memoryUnlocked);
      const cx = prop.x;
      const cy = prop.y;
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 8, 52, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = dkDone ? '#39ff14' : '#f43f5e';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Gabinete azul celeste clásico de 1981 con vigas rojas en pantalla
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(cx - 24, cy - 64, 48, 70);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(cx - 20, cy - 60, 40, 11);
      ctx.fillStyle = '#fde047';
      ctx.font = '700 6px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('1981 KONG', cx, cy - 52);

      ctx.fillStyle = '#020617';
      ctx.fillRect(cx - 16, cy - 45, 32, 24);
      ctx.fillStyle = '#e11d48';
      ctx.fillRect(cx - 13, cy - 40, 26, 3);
      ctx.fillRect(cx - 13, cy - 32, 26, 3);
      ctx.fillRect(cx - 13, cy - 25, 26, 3);
    } else if (prop.kind === 'temporal-conduit') {
      const pulse = reducedMotion ? 0.75 : 0.55 + Math.sin(elapsed * 3.6 + prop.x * 0.02) * 0.35;
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1b263b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#d8be88';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Núcleo conductor vertical con anillos de latón y pulso cian/violeta
      ctx.fillStyle = '#09111f';
      ctx.fillRect(prop.x + 10, prop.y + 8, prop.w - 20, prop.h - 16);
      ctx.globalAlpha = Math.max(0.25, pulse);
      ctx.fillStyle = prop.accentHex;
      ctx.fillRect(prop.x + 14, prop.y + 12, prop.w - 28, prop.h - 24);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#d8be88';
      for (let ry = prop.y + 14; ry < prop.y + prop.h - 12; ry += 14) {
        ctx.fillRect(prop.x + 6, ry, prop.w - 12, 3);
      }
      if (prop.label) {
        ctx.fillStyle = '#f8f5e6';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 6);
      }
    } else if (prop.kind === 'time-machine-core') {
      const tm = evaluateTimeMachineStatus(progressState, allUnlocked);
      const cx = Math.round(prop.x + prop.w / 2);
      const cy = Math.round(prop.y + prop.h / 2);
      const spinSpeed =
        tm.stageNumber === 4 ? 2.1 : tm.stageNumber === 3 ? 1.15 : tm.stageNumber === 2 ? 0.45 : 0.12;
      const rot = reducedMotion ? 0.35 : elapsed * spinSpeed;

      // Plataforma circular escalonada de obsidiana y bronce arqueológico
      ctx.fillStyle = '#050811';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 28, 86, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tm.canTravelTo80s ? '#00f3ff' : '#d8be88';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#131d31';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 24, 72, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bastidor principal de El Cronoscopio
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 4, prop.y - 4, prop.w + 8, prop.h + 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = '#d8be88';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(prop.x + 2, prop.y + 2, prop.w - 4, prop.h - 4);

      // Columnas laterales de bobinas de cobre
      ctx.fillStyle = '#784820';
      ctx.fillRect(prop.x + 8, prop.y + 10, 16, prop.h - 20);
      ctx.fillRect(prop.x + prop.w - 24, prop.y + 10, 16, prop.h - 20);
      ctx.fillStyle = '#eab308';
      for (let by = prop.y + 16; by < prop.y + prop.h - 16; by += 12) {
        ctx.fillRect(prop.x + 6, by, 20, 3);
        ctx.fillRect(prop.x + prop.w - 26, by, 20, 3);
      }

      // Cámara central de apertura temporal
      ctx.fillStyle = '#040814';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tm.canTravelTo80s ? '#00f3ff' : '#64748b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Anillos astrolábicos contrarrotatorios según etapa (1..4)
      ctx.save();
      ctx.translate(cx, cy - 4);
      ctx.rotate(rot);
      ctx.strokeStyle = tm.stageNumber >= 2 ? '#d8be88' : '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(-22, -22, 44, 44);
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy - 4);
      ctx.rotate(-rot * 1.35);
      ctx.strokeStyle = tm.canTravelTo80s
        ? '#00f3ff'
        : tm.stageNumber >= 3
        ? '#38bdf8'
        : '#334155';
      ctx.lineWidth = 2;
      ctx.strokeRect(-15, -15, 30, 30);
      ctx.restore();

      // Vórtice luminoso cuando la Etapa 4 está lista para viajar a 1980s
      if (tm.canTravelTo80s) {
        const glowR = reducedMotion ? 13 : 11 + Math.sin(elapsed * 5) * 3;
        const vGrad = ctx.createRadialGradient(cx, cy - 4, 2, cx, cy - 4, glowR + 10);
        vGrad.addColorStop(0, '#ffffff');
        vGrad.addColorStop(0.45, '#00f3ff');
        vGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = vGrad;
        ctx.beginPath();
        ctx.arc(cx, cy - 4, glowR + 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = tm.syncedCount > 0 ? '#38bdf8' : '#334155';
        ctx.fillRect(cx - 4, cy - 8, 8, 8);
      }

      // 4 Indicadores reales de subsistemas en el frontal inferior del Cronoscopio
      const modules = [
        { ok: tm.pongReady, hex: '#facc15', tag: '72' },
        { ok: tm.glitchReady, hex: '#00f3ff', tag: 'GL' },
        { ok: tm.invadersReady, hex: '#39ff14', tag: '78' },
        { ok: tm.archaeologyReady, hex: '#c084fc', tag: 'ARQ' },
      ];
      modules.forEach((mod, idx) => {
        const mx = prop.x + 28 + idx * 28;
        const my = prop.y + prop.h - 20;
        ctx.fillStyle = '#070b14';
        ctx.fillRect(mx - 1, my - 1, 22, 14);
        ctx.fillStyle = mod.ok ? mod.hex : '#1e293b';
        ctx.fillRect(mx, my, 20, 12);
        ctx.fillStyle = mod.ok ? '#050811' : '#94a3b8';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(mod.tag, mx + 10, my + 9);
      });

      // Placa superior con etapa del Cronoscopio
      ctx.fillStyle = '#070b14';
      ctx.fillRect(cx - 64, prop.y - 16, 128, 15);
      ctx.strokeStyle = tm.canTravelTo80s ? '#00f3ff' : '#d8be88';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 64, prop.y - 16, 128, 15);
      ctx.fillStyle = tm.canTravelTo80s ? '#fde047' : '#f8f5e6';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        tm.canTravelTo80s
          ? 'CRONOSCOPIO · SALTO 1980s LISTO'
          : `CRONOSCOPIO · ETAPA ${tm.stageNumber}/4`,
        cx,
        prop.y - 6
      );
    } else if (prop.kind === 'labyrinth-wall') {
      // Muro biselado basáltico-cobre con traza luminosa en el Laberinto de Señales
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(prop.x + 4, prop.y + 6, prop.w, prop.h);
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#334155';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, 8);
      ctx.fillStyle = prop.accentHex;
      ctx.globalAlpha = 0.65;
      if (prop.h > prop.w) {
        ctx.fillRect(prop.x + Math.floor(prop.w / 2) - 1, prop.y + 12, 2, prop.h - 24);
      } else {
        ctx.fillRect(prop.x + 12, prop.y + Math.floor(prop.h / 2) - 1, prop.w - 24, 2);
      }
      ctx.globalAlpha = 1;
    } else if (prop.kind === 'rgb-frequency-pillar') {
      const rgbSolved =
        allUnlocked ||
        progressState.rpg.solvedPuzzleIds.includes('puzzle-laberinto-rgb-1976');
      const matchingSpec = LABYRINTH_RGB_PILLARS.find(
        (p) => Math.abs(p.x - (prop.x + prop.w / 2)) < 24 && Math.abs(p.y - (prop.y + prop.h / 2)) < 24
      );
      const isLit =
        rgbSolved ||
        (matchingSpec ? activeRgbPillars.includes(matchingSpec.stepOrder) : false);
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;

      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(prop.x - 4, prop.y + prop.h - 4, prop.w + 8, 8);
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = isLit ? '#ffffff' : prop.accentHex;
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);

      ctx.fillStyle = isLit ? prop.accentHex : '#0f172a';
      ctx.fillRect(prop.x + 7, prop.y + 7, prop.w - 14, prop.h - 14);
      if (isLit) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3, cy - 3, 6, 6);
      }
    } else if (prop.kind === 'breakout-cabinet-1976') {
      const brkDone =
        allUnlocked || Boolean(progressState.games['breakout']?.memoryUnlocked);
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h;
      ctx.fillStyle = '#17122b';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 4, 48, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = brkDone ? '#39ff14' : '#f97316';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Gabinete upright Atari Breakout (1976) con bisel blanco/madera y 4 franjas CRT
      ctx.fillStyle = '#070b14';
      ctx.fillRect(cx - 24, cy - 68, 48, 66);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(cx - 22, cy - 66, 44, 62);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 18, cy - 52, 36, 46);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 18, cy - 64, 36, 9);
      ctx.fillStyle = '#0f172a';
      ctx.font = '700 6px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BREAKOUT', cx, cy - 57);

      const bands = ['#ef4444', '#f97316', '#22c55e', '#facc15'];
      bands.forEach((bHex, idx) => {
        ctx.fillStyle = bHex;
        ctx.fillRect(cx - 14, cy - 46 + idx * 4, 28, 3);
      });
      const bx = Math.round(Math.sin(elapsed * 4.2) * 9);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(cx - 6 + Math.round(bx * 0.5), cy - 22, 12, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + bx - 1, cy - 28, 3, 3);
    } else if (prop.kind === 'vector-projector') {
      const vecSolved =
        allUnlocked ||
        progressState.rpg.solvedPuzzleIds.includes('puzzle-museo-vector-79');
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;
      ctx.fillStyle = '#070b14';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.strokeStyle = vecSolved ? '#39ff14' : '#a78bfa';
      ctx.lineWidth = 2;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);

      // Pantalla vectorial XY
      ctx.strokeStyle = vecSolved ? '#22d3ee' : '#a78bfa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const rot = reducedMotion ? 0.4 : elapsed * (vecSolved ? 1.8 : 0.6);
      for (let k = 0; k < 4; k++) {
        const a = rot + (k * Math.PI) / 2;
        const px = cx + Math.cos(a) * 14;
        const py = cy + Math.sin(a) * 11;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      if (prop.label) {
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 6);
      }
    } else if (prop.kind === 'museum-pedestal') {
      const exhibit = MUSEUM_1970S_EXHIBITS.find((e) => e.id === prop.exhibitId);
      const isPlayable = exhibit?.mode === 'playable';
      const isPending = exhibit?.mode === 'playable-pending';
      const gameId = exhibit?.linkedGameId;
      const isEncryptedBreakout =
        gameId === 'breakout' &&
        !allUnlocked &&
        !progressState.games['breakout']?.memoryUnlocked &&
        !progressState.rpg.discoveredSecretIds.includes('secret-sala-breakout-1976');
      const isRestored =
        allUnlocked ||
        (gameId
          ? Boolean(progressState.games[gameId]?.memoryUnlocked)
          : progressState.rpg.inspectedExhibitIds.includes(prop.exhibitId || ''));

      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;

      // Sombra y zócalo de museo
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(prop.x - 4, prop.y + prop.h - 2, prop.w + 8, 8);
      ctx.fillStyle = '#1a140c';
      ctx.fillRect(prop.x - 2, prop.y - 2, prop.w + 4, prop.h + 4);
      ctx.fillStyle = isEncryptedBreakout ? '#1e1b2e' : '#6a6358';
      ctx.fillRect(prop.x, prop.y, prop.w, prop.h);
      ctx.fillStyle = '#c4b08a';
      ctx.fillRect(prop.x + 2, prop.y + 2, prop.w - 4, 3);
      ctx.fillStyle = isEncryptedBreakout ? '#1e1b2e' : '#4a453c';
      ctx.fillRect(prop.x + 4, prop.y + 8, prop.w - 8, prop.h - 12);
      ctx.strokeStyle = isEncryptedBreakout
        ? '#64748b'
        : isPending
        ? '#fbbf24'
        : isRestored
        ? prop.accentHex
        : 'rgba(148, 163, 184, 0.55)';
      ctx.lineWidth = isPlayable || isPending ? 2.5 : 1.5;
      ctx.strokeRect(prop.x, prop.y, prop.w, prop.h);

      // Vitrina / Holograma específico de cada hito de los años 70
      ctx.fillStyle = '#050a14';
      ctx.fillRect(prop.x + 8, prop.y + 6, prop.w - 16, 24);
      if (isEncryptedBreakout) {
        ctx.fillStyle = '#f97316';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('? 1976', cx, prop.y + 22);
      } else if (prop.exhibitId === 'exhibit-pong-1972') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 14, prop.y + 12, 2, 10);
        ctx.fillRect(cx + 12, prop.y + 12, 2, 10);
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(cx - 2, prop.y + 16, 4, 4);
      } else if (prop.exhibitId === 'exhibit-breakout-1976') {
        const cols = ['#ef4444', '#f97316', '#22c55e', '#facc15'];
        cols.forEach((cHex, i) => {
          ctx.fillStyle = cHex;
          ctx.fillRect(cx - 16, prop.y + 9 + i * 3, 32, 2);
        });
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(cx - 6, prop.y + 25, 12, 2);
      } else if (prop.exhibitId === 'exhibit-space-invaders-1978') {
        ctx.fillStyle = '#39ff14';
        ctx.fillRect(cx - 7, prop.y + 12, 14, 6);
        ctx.fillRect(cx - 9, prop.y + 18, 3, 3);
        ctx.fillRect(cx + 6, prop.y + 18, 3, 3);
      } else if (
        prop.exhibitId === 'exhibit-lunar-lander-1979' ||
        prop.exhibitId === 'exhibit-asteroids-1979'
      ) {
        ctx.strokeStyle = prop.accentHex;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, prop.y + 10);
        ctx.lineTo(cx + 9, prop.y + 25);
        ctx.lineTo(cx, prop.y + 21);
        ctx.lineTo(cx - 9, prop.y + 25);
        ctx.closePath();
        ctx.stroke();
      } else {
        ctx.fillStyle = prop.accentHex;
        ctx.fillRect(cx - 10, prop.y + 13, 20, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 3, prop.y + 16, 6, 4);
      }

      // Indicador frontal: JUGABLE vs EXHIBICIÓN
      ctx.fillStyle = isPlayable ? prop.accentHex : isPending ? '#fbbf24' : '#94a3b8';
      ctx.fillRect(prop.x + 10, prop.y + prop.h - 9, prop.w - 20, 4);

      if (prop.label) {
        ctx.fillStyle = isRestored ? '#ffffff' : '#cbd5e1';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 6);
      }
    } else if (prop.kind === 'castle-banner') {
      const wave = reducedMotion ? 0 : Math.sin(elapsed * 3 + prop.x * 0.05) * 4;
      ctx.fillStyle = '#07050d';
      ctx.fillRect(prop.x - 2, prop.y, prop.w + 4, 6);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(prop.x, prop.y + 1, prop.w, 4);

      ctx.fillStyle = '#1e112a';
      ctx.beginPath();
      ctx.moveTo(prop.x + 2, prop.y + 5);
      ctx.lineTo(prop.x + prop.w - 2, prop.y + 5);
      ctx.lineTo(prop.x + prop.w - 4 + wave, prop.y + prop.h - 14);
      ctx.lineTo(prop.x + prop.w / 2 + wave * 0.5, prop.y + prop.h);
      ctx.lineTo(prop.x + 4 + wave, prop.y + prop.h - 14);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = prop.accentHex;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = prop.accentHex;
      ctx.fillRect(prop.x + prop.w / 2 - 4 + wave * 0.5, prop.y + 24, 8, 8);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(prop.x + prop.w / 2 - 2 + wave * 0.5, prop.y + 26, 4, 4);

      if (prop.label) {
        ctx.fillStyle = '#c084fc';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, prop.x + prop.w / 2, prop.y - 4);
      }
    } else if (prop.kind === 'castle-statue') {
      const cx = prop.x + prop.w / 2;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(prop.x - 2, prop.y + prop.h - 18, prop.w + 4, 18);
      ctx.fillStyle = '#334155';
      ctx.fillRect(prop.x, prop.y + prop.h - 16, prop.w, 14);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(prop.x, prop.y + prop.h - 16, prop.w, 14);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 14, prop.y + 8, 28, prop.h - 26);
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 12, prop.y + 10, 24, 18);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 10, prop.y + 16, 20, 6);

      ctx.fillStyle = prop.accentHex;
      ctx.fillRect(cx - 6, prop.y + 17, 3, 3);
      ctx.fillRect(cx + 3, prop.y + 17, 3, 3);

      if (prop.label) {
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 4);
      }
    } else if (prop.kind === 'castle-valve') {
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;
      ctx.fillStyle = '#451a03';
      ctx.fillRect(prop.x - 8, cy + 6, prop.w + 16, 12);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(prop.x - 8, cy + 8, prop.w + 16, 8);

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(cx, cy - 4, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = prop.accentHex;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 14, cy - 4);
      ctx.lineTo(cx + 14, cy - 4);
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      if (!reducedMotion) {
        const steam = Math.sin(elapsed * 4 + prop.x * 0.1) * 3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(cx + steam, cy - 24, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (prop.label) {
        ctx.fillStyle = prop.accentHex;
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 8);
      }
    } else if (prop.kind === 'castle-lectern') {
      const cx = prop.x + prop.w / 2;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 8, prop.y + 18, 16, prop.h - 18);
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 6, prop.y + 18, 12, prop.h - 20);

      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 18, prop.y + 6, 36, 14);
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 18, prop.y + 6, 36, 14);

      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 14, prop.y + 8, 13, 10);
      ctx.fillRect(cx + 1, prop.y + 8, 13, 10);
      ctx.fillStyle = prop.accentHex;
      ctx.fillRect(cx - 10, prop.y + 11, 6, 2);
      ctx.fillRect(cx + 4, prop.y + 11, 6, 2);

      if (prop.label) {
        ctx.fillStyle = prop.accentHex;
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 4);
      }
    } else if (prop.kind === 'castle-gear') {
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;
      const rot = reducedMotion ? 0.3 : elapsed * 0.85;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);

      const radius = 28;
      const teeth = 8;
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = prop.accentHex;
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a1 = (i / teeth) * Math.PI * 2;
        const a2 = ((i + 0.5) / teeth) * Math.PI * 2;
        const a3 = ((i + 0.8) / teeth) * Math.PI * 2;
        ctx.lineTo(Math.cos(a1) * (radius + 6), Math.sin(a1) * (radius + 6));
        ctx.lineTo(Math.cos(a2) * (radius + 6), Math.sin(a2) * (radius + 6));
        ctx.lineTo(Math.cos(a3) * radius, Math.sin(a3) * radius);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (prop.label) {
        ctx.fillStyle = prop.accentHex;
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 8);
      }
    } else if (prop.kind === 'castle-pendulum') {
      const cx = prop.x + prop.w / 2;
      const swing = reducedMotion ? 0 : Math.sin(elapsed * 2.2) * 0.32;
      const len = prop.h - 16;

      ctx.save();
      ctx.translate(cx, prop.y + 4);
      ctx.rotate(swing);

      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, len);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, len, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = prop.accentHex;
      ctx.beginPath();
      ctx.arc(0, len, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (prop.label) {
        ctx.fillStyle = prop.accentHex;
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 6);
      }
    } else if (prop.kind === 'castle-throne') {
      const cx = prop.x + prop.w / 2;
      ctx.fillStyle = '#07050f';
      ctx.beginPath();
      ctx.moveTo(cx - 36, prop.y + prop.h);
      ctx.lineTo(cx - 36, prop.y + 16);
      ctx.lineTo(cx - 18, prop.y);
      ctx.lineTo(cx, prop.y + 8);
      ctx.lineTo(cx + 18, prop.y);
      ctx.lineTo(cx + 36, prop.y + 16);
      ctx.lineTo(cx + 36, prop.y + prop.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#581c87';
      ctx.fillRect(cx - 24, prop.y + 16, 48, prop.h - 28);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(cx - 20, prop.y + 20, 40, prop.h - 36);

      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(cx - 32, prop.y + prop.h - 28, 64, 18);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - 34, prop.y + prop.h - 34, 10, 24);
      ctx.fillRect(cx + 24, prop.y + prop.h - 34, 10, 24);

      if (prop.label) {
        ctx.fillStyle = '#f472b6';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 6);
      }
    } else if (prop.kind === 'corruption-core') {
      const cx = prop.x + prop.w / 2;
      const floatY = prop.y + prop.h / 2 + (reducedMotion ? 0 : Math.sin(elapsed * 3.5) * 6);
      const pulse = reducedMotion ? 1 : 0.85 + Math.sin(elapsed * 6) * 0.25;

      ctx.save();
      const grad = ctx.createRadialGradient(cx, floatY, 4, cx, floatY, 32 * pulse);
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
      grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, floatY, 32 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#180728';
      ctx.beginPath();
      ctx.arc(cx, floatY, 14 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 5, floatY - 3, 10, 6);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 1, floatY - 2, 2, 4);

      for (let p = 0; p < 4; p++) {
        const ang = elapsed * 2.5 + (p * Math.PI) / 2;
        const px = cx + Math.cos(ang) * 22;
        const py = floatY + Math.sin(ang) * 16;
        ctx.fillStyle = '#ec4899';
        ctx.fillRect(px - 2, py - 2, 4, 4);
      }
      ctx.restore();

      if (prop.label) {
        ctx.fillStyle = '#f43f5e';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 8);
      }
    } else if (prop.kind === 'space-invaders-ship') {
      const cx = prop.x + prop.w / 2;
      const cy = prop.y + prop.h / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(cx - 36, cy + 18, 72, 10);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 34, cy - 10, 68, 24);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(cx - 32, cy - 8, 64, 20);

      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cx - 24, cy - 24, 6, 16);
      ctx.fillRect(cx + 18, cy - 24, 6, 16);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 23, cy - 26, 4, 4);
      ctx.fillRect(cx + 19, cy - 26, 4, 4);

      ctx.fillStyle = '#14532d';
      ctx.fillRect(cx - 14, cy - 14, 28, 14);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 10, cy - 12, 20, 10);
      ctx.fillStyle = '#86efac';
      ctx.fillRect(cx - 6, cy - 10, 6, 4);

      const flame = reducedMotion ? 6 : 4 + Math.sin(elapsed * 8) * 4;
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(cx - 26, cy + 12, 12, 4);
      ctx.fillRect(cx + 14, cy + 12, 12, 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(cx - 24, cy + 16, 8, flame);
      ctx.fillRect(cx + 16, cy + 16, 8, flame);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(cx - 22, cy + 16, 4, flame * 0.6);
      ctx.fillRect(cx + 18, cy + 16, 4, flame * 0.6);

      ctx.restore();

      if (prop.label) {
        ctx.fillStyle = '#22c55e';
        ctx.font = '700 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(prop.label, cx, prop.y - 12);
      }
    }
    ctx.restore();
  }

  // Gabinetes del salón arcade por detrás del avatar (orden de profundidad)
  const arcadeMachines = area.decorProps.filter((prop) => prop.kind === 'arcade-machine');
  if (arcadeMachines.length > 0) {
    const behindPlayer = arcadeMachines
      .filter((prop) => prop.y + prop.h <= player.y)
      .sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const prop of behindPlayer) {
      drawCuatroCaminosArcadeMachine(ctx, prop, elapsed, reducedMotion);
    }
  }

  // Cofres dentro de la sub-área
  for (const chest of RPG_CHESTS) {
    if (chest.areaId !== area.id) continue;
    const opened = progressState.rpg.openedChestIds.includes(chest.id);
    const lockedByPuzzle =
      chest.requiresPuzzleId &&
      !allUnlocked &&
      !progressState.rpg.solvedPuzzleIds.includes(chest.requiresPuzzleId);

    drawRpgTreasureChest(
      ctx,
      chest.x,
      chest.y,
      opened,
      lockedByPuzzle ? '#64748b' : chest.accentHex,
      elapsed,
      reducedMotion
    );

    if (lockedByPuzzle && !opened) {
      ctx.save();
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(chest.x - 19, chest.y - 18, 38, 30);
      ctx.restore();
    }
  }

  // Combate contra Donkey Kong Corrupto en la Sala del Trono (Fases 1, 2 y 3)
  const boss = params.bossCombatState;
  if (area.id === 'castle-trono' && boss && !boss.dkPurified) {
    // 1. Ondas de choque en el suelo
    for (const sw of boss.shockwaves) {
      ctx.save();
      ctx.strokeStyle = `rgba(236, 72, 153, ${sw.alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(sw.x, sw.y, sw.r, sw.r * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Barriles rodantes
    for (const b of boss.barrels) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-14, -10, 28, 20);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-12, -8, 24, 16);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-14, -6, 28, 2);
      ctx.fillRect(-14, 4, 28, 2);
      ctx.restore();
    }

    // 3. Sprite colosal de Donkey Kong Corrupto
    const dkx = boss.dkPos.x;
    const dky = boss.dkPos.y;
    ctx.save();
    // Sombra del jefe
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(dkx, dky + 28, 36, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aura de corrupción de Super KOOPA
    if (boss.phase === 2) {
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dkx, dky, 42 + Math.sin(elapsed * 8) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cuerpo masivo de gorila
    ctx.fillStyle = '#451a03';
    ctx.fillRect(dkx - 28, dky - 24, 56, 48);
    ctx.fillStyle = '#713f12';
    ctx.fillRect(dkx - 24, dky - 20, 48, 42);

    // Pecho y rostro dorados
    ctx.fillStyle = '#fde047';
    ctx.fillRect(dkx - 14, dky - 10, 28, 24);
    ctx.fillStyle = '#fed7aa';
    ctx.fillRect(dkx - 18, dky - 30, 36, 16);

    // Corbata roja legendaria "DK"
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(dkx - 5, dky - 14);
    ctx.lineTo(dkx + 5, dky - 14);
    ctx.lineTo(dkx + 7, dky + 10);
    ctx.lineTo(dkx, dky + 16);
    ctx.lineTo(dkx - 7, dky + 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = '900 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DK', dkx, dky - 2);

    // Venas de corrupción violeta en los brazos
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(dkx - 26, dky - 8, 4, 18);
    ctx.fillRect(dkx + 22, dky - 8, 4, 18);

    // Ojos (rojo furia si lucha, mareado si aturdido)
    if (boss.phase === 3) {
      ctx.fillStyle = '#facc15';
      ctx.font = '700 9px monospace';
      ctx.fillText('★', dkx - 8, dky - 34);
      ctx.fillText('★', dkx + 8, dky - 34);
    } else {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(dkx - 10, dky - 24, 6, 4);
      ctx.fillRect(dkx + 4, dky - 24, 6, 4);
    }

    // Brazos golpeando
    const armOffset = Math.sin(elapsed * 7) * 4;
    ctx.fillStyle = '#542d0c';
    ctx.fillRect(dkx - 34, dky - 6 + armOffset, 12, 28);
    ctx.fillRect(dkx + 22, dky - 6 - armOffset, 12, 28);
    ctx.restore();

    // 4. Barra de vida del Jefe en el HUD superior de la sala
    const barW = 320;
    const barX = Math.round(area.width / 2 - barW / 2);
    const barY = 28;
    const hpPct = Math.max(0, Math.min(1, boss.bossHp / boss.maxHp));

    ctx.save();
    ctx.fillStyle = 'rgba(7, 5, 15, 0.9)';
    ctx.fillRect(barX - 8, barY - 18, barW + 16, 36);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 8, barY - 18, barW + 16, 36);

    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(barX, barY - 4, barW, 14);

    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, '#ef4444');
    hpGrad.addColorStop(0.6, '#ec4899');
    hpGrad.addColorStop(1, '#a855f7');
    ctx.fillStyle = hpGrad;
    ctx.fillRect(barX, barY - 4, Math.round(barW * hpPct), 14);

    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const titleText =
      boss.phase === 3
        ? '¡NÚCLEO DIGITAL DE SUPER KOOPA EXPUESTO!'
        : `REY DONKEY KONG CORRUPTO [FASE ${boss.phase}]`;
    ctx.fillText(`${titleText} · ${Math.round(boss.bossHp)}/${boss.maxHp}`, area.width / 2, barY - 8);
    ctx.restore();
  }

  // NPCs originales dentro de la sub-área
  for (const npc of RPG_SUBAREA_NPCS) {
    if (npc.areaId !== area.id) continue;
    // Si estamos en castle-trono y Donkey Kong no ha sido purificado, no dibujar el NPC pacífico
    if (npc.id === 'npc-donkey-kong-freed' && boss && !boss.dkPurified) continue;

    drawPixelAvatar4Dir(
      ctx,
      npc.x,
      npc.y,
      npc.facing,
      false,
      false,
      elapsed + npc.x * 0.01,
      '#fde2c8',
      npc.palette.secondary,
      npc.palette.primary,
      { reducedMotion }
    );
  }

  // Criaturas guardianas dentro de sub-áreas (ej. Sincro-76 en el Laberinto de Señales)
  for (const creature of GUARDIAN_CREATURES) {
    if (creature.areaId !== area.id) continue;
    const calmed =
      allUnlocked || progressState.rpg.calmedCreatureIds.includes(creature.id);
    drawGuardianCreatureSprite(ctx, creature, calmed, elapsed, reducedMotion);
  }

  // Jugador Pixel con sprite en 4 direcciones
  drawPixelAvatar4Dir(
    ctx,
    player.x,
    player.y,
    player.facingDir,
    player.walking,
    player.sprinting,
    elapsed,
    skinColor,
    hairColor,
    shirtColor,
    {
      reducedMotion,
      equippedCosmetic: progressState.rpg.equippedCosmetic,
      lanternActive: progressState.rpg.lanternActive,
      interactAnim: player.interactAnim,
      appearance,
    }
  );

  // Gabinetes del salón arcade delante del avatar (los más cercanos a cámara)
  if (arcadeMachines.length > 0) {
    const inFrontOfPlayer = arcadeMachines
      .filter((prop) => prop.y + prop.h > player.y)
      .sort((a, b) => a.y + a.h - (b.y + b.h));
    for (const prop of inFrontOfPlayer) {
      drawCuatroCaminosArcadeMachine(ctx, prop, elapsed, reducedMotion);
    }
    drawCuatroCaminosArcadeAtmosphere(ctx, area, wb, elapsed, reducedMotion);
  }

  // Halos HD-2D RGB sutiles en interiores luminosos y Museo Viviente
  if (!area.isDarkCave) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const prop of area.decorProps) {
      if (
        prop.kind === 'museum-pedestal' ||
        prop.kind === 'breakout-cabinet-1976' ||
        prop.kind === 'vector-projector' ||
        prop.kind === 'time-machine-core'
      ) {
        const lx = prop.x + prop.w / 2;
        const ly = prop.y + prop.h / 2;
        const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 68);
        g.addColorStop(0, 'rgba(34, 211, 238, 0.11)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, 68, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Penumbra de caverna subterránea perforada dinámicamente por la Lámpara de Fósforo
  if (area.isDarkCave) {
    const lanternLit = progressState.rpg.lanternActive || allUnlocked;
    const lightRadius = lanternLit ? 215 : 82;
    ctx.save();
    const darkGrad = ctx.createRadialGradient(
      player.x,
      player.y - 12,
      lightRadius * 0.28,
      player.x,
      player.y - 12,
      lightRadius
    );
    darkGrad.addColorStop(0, 'rgba(5, 4, 15, 0)');
    darkGrad.addColorStop(0.65, lanternLit ? 'rgba(5, 4, 15, 0.42)' : 'rgba(5, 4, 15, 0.78)');
    darkGrad.addColorStop(1, 'rgba(3, 2, 10, 0.94)');
    ctx.fillStyle = darkGrad;
    ctx.fillRect(0, 0, area.width, area.height);
    ctx.restore();
  }

  // Onda de pulso del Escáner de Secretos TTL [R] dentro de interiores
  if (scannerPulse.active) {
    const pRatio = Math.min(1, scannerPulse.elapsed / 1.45);
    const radius = 20 + pRatio * 380;
    ctx.save();
    ctx.strokeStyle = `rgba(0, 243, 255, ${(1 - pRatio) * 0.9})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 10, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (const ex of RPG_EXAMINABLES) {
      if (ex.areaId !== area.id) continue;
      if (Math.hypot(ex.x - player.x, ex.y - player.y) <= radius + 24) {
        ctx.fillStyle = ex.isFalseWall ? '#fde047' : '#00f3ff';
        ctx.fillText(
          ex.isFalseWall ? '★ ¡PARED FALSA DETECTADA!' : '◆ PISTA',
          ex.x,
          ex.y + 24
        );
      }
    }
    for (const ch of RPG_CHESTS) {
      if (ch.areaId !== area.id || progressState.rpg.openedChestIds.includes(ch.id)) {
        continue;
      }
      if (Math.hypot(ch.x - player.x, ch.y - player.y) <= radius + 24) {
        ctx.fillStyle = '#39ff14';
        ctx.fillText('◆ COFRE OCULTO', ch.x, ch.y - 26);
      }
    }
    ctx.restore();
  }

  // Partículas de recolección / apertura de cofre
  for (const pb of pickupBursts) {
    ctx.globalAlpha = Math.max(0, pb.life / 0.55);
    ctx.fillStyle = pb.color;
    ctx.fillRect(Math.round(pb.x - 2), Math.round(pb.y - 2), 5, 5);
  }
  ctx.globalAlpha = 1;

  // Etiqueta contextual de acción [E]
  if (prompt) {
    const py = prompt.y - 48 + (reducedMotion ? 0 : Math.sin(elapsed * 5) * 3);
    ctx.save();
    ctx.font = '700 11px "JetBrains Mono", monospace';
    const badgeText = `[E] ${prompt.actionLabel}`;
    const tw = ctx.measureText(badgeText).width + 18;
    ctx.fillStyle = 'rgba(4, 9, 24, 0.92)';
    ctx.fillRect(prompt.x - tw / 2, py - 14, tw, 22);
    ctx.strokeStyle = prompt.accentHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(prompt.x - tw / 2, py - 14, tw, 22);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, prompt.x, py + 1);
    ctx.restore();
  }

  // Banner de Objetivo Inmediato del Castillo (HUD superior)
  if (area.id.startsWith('castle-')) {
    let objectiveText = '';
    const solved = progressState.rpg.solvedPuzzleIds;
    if (area.id === 'castle-murallas') {
      const isDrawbridgeDown =
        allUnlocked ||
        solved.includes('puzzle-sellos-castillo') ||
        progressState.rpg.discoveredSecretIds.includes('castle-drawbridge-lowered');
      objectiveText = isDrawbridgeDown
        ? '✓ PUENTE LEVADIZO BAJADO · ACCESO AL LABERINTO EXPEDITO'
        : 'OBJETIVO: ACTIVA LOS 4 SELLOS (SOL ☀ → LUNA ☾ → ESTRELLA ★ → RAYO ⚡) PARA BAJAR EL PUENTE';
    } else if (area.id === 'castle-laberinto') {
      objectiveText = 'OBJETIVO: RESUELVE EL LABERINTO Y ENCUENTRA EL PASADIZO A LOS CIMIENTOS';
    } else if (area.id === 'castle-cimientos') {
      const isHydraulicSolved = allUnlocked || solved.includes('puzzle-valvulas-hidraulicas');
      objectiveText = isHydraulicSolved
        ? '✓ PRESIÓN EQUILIBRADA · MONTACARGAS A LA BIBLIOTECA ACTIVO'
        : 'OBJETIVO: CALIBRA LAS 3 VÁLVULAS (CAUDAL → VAPOR → DRENAJE) PARA DRENAR LA FOSA';
    } else if (area.id === 'castle-biblioteca') {
      const isChronicleSolved = allUnlocked || solved.includes('puzzle-cronica-reyes');
      objectiveText = isChronicleSolved
        ? '✓ CRÓNICA COMPLETADA · PASADIZO A LA TORRE DEL TIEMPO REVELADO'
        : 'OBJETIVO: COLOCA LOS 4 FRAGMENTOS DE LA CRÓNICA EN LOS ATRIL CON LUZ DEDICADA';
    } else if (area.id === 'castle-torre') {
      const isTowerSolved = allUnlocked || solved.includes('puzzle-torre-tiempo');
      objectiveText = isTowerSolved
        ? '✓ ENGRANAJES ALINEADOS · PUERTAS A LA SALA DEL TRONO ABIERTAS'
        : 'OBJETIVO: ACCIONA LAS PALANCAS DE ENGRANAJE IZQUIERDA Y DERECHA EN LA TORRE';
    } else if (area.id === 'castle-trono') {
      const isDkFreed =
        allUnlocked || progressState.rpg.discoveredSecretIds.includes('castle-donkey-kong-freed');
      objectiveText = isDkFreed
        ? '✓ DONKEY KONG LIBERADO · ABORDA LA NAVE DE SPACE INVADERS HACIA LA ISLA 80S'
        : 'OBJETIVO: DERROTA A SUPER KOOPA, PURIFICA A DONKEY KONG Y LIBERA LA NAVE';
    }

    if (objectiveText) {
      ctx.save();
      const bw = Math.min(600, area.width - 32);
      const bx = area.width / 2 - bw / 2;
      const by = area.height <= vh ? 16 : Math.max(16, camY + 16);
      ctx.fillStyle = 'rgba(7, 5, 15, 0.92)';
      ctx.fillRect(bx, by, bw, 24);
      ctx.strokeStyle = area.accentHex;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(objectiveText, area.width / 2, by + 15);
      ctx.restore();
    }
  }

  ctx.restore();
}
