/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mundo visual de la cinemática de apertura de PIXELVERSE.
 *
 * Todo se dibuja con Canvas 2D a 640×360 y se escala con píxeles nítidos:
 *   0–24 s    santuario de la consola y garra del villano
 *   24–53.2 s revelación y discurso de SUPER KING KOOPA
 *   53.2–78 s la onda borra salas, cartuchos, ciudad y espacio
 *   78–94 s   el planeta, el destello y la fecha
 *   94–128 s  océano, isla, casa y ventana encendida
 *
 * El primer acto termina en negro y entrega al menú. El segundo acto se
 * reproduce tras crear la identidad y termina fundiendo a negro para que la
 * escena existente de Isla Natal muestre a Pixel junto a la radio.
 */

import {
  CINEMA_H as H,
  CINEMA_W as W,
  glow,
  hash2,
  lerp,
  mulberry32,
  px,
  smoothstep,
} from './cinematicRebootDraw';
import {
  CINEMATIC_ACT_ONE_END_SEC,
  TOTAL_CINEMATIC_DURATION_SEC,
} from './cinematicRebootNarrator';
import { createCosmicRebootScene } from './cinematicRebootScenes';

export interface CinematicRebootWorld {
  renderAtTime: (elapsedSec: number, deltaSec: number) => void;
  dispose: () => void;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
  warm: boolean;
}

export function createCinematicRebootWorld(
  mount: HTMLElement,
  reducedMotion = false
): CinematicRebootWorld {
  const rand = mulberry32(20261023);

  const stars: Star[] = Array.from({ length: 210 }, () => ({
    x: rand() * W,
    y: rand() * H * 0.6,
    size: rand() < 0.88 ? 1 : 2,
    alpha: 0.25 + rand() * 0.75,
    phase: rand() * Math.PI * 2,
    speed: 0.4 + rand() * 1.6,
    warm: rand() < 0.18,
  }));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'cinematic-reboot-canvas';
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    mount.appendChild(canvas);
    return { renderAtTime: () => {}, dispose: () => canvas.remove() };
  }
  mount.appendChild(canvas);

  const cosmic = createCosmicRebootScene(ctx, reducedMotion);

  const grainCanvas = document.createElement('canvas');
  grainCanvas.width = 160;
  grainCanvas.height = 160;
  const grainCtx = grainCanvas.getContext('2d');
  if (grainCtx) {
    const image = grainCtx.createImageData(160, 160);
    const grainRand = mulberry32(778899);
    for (let i = 0; i < image.data.length; i += 4) {
      const value = Math.floor(grainRand() * 255);
      image.data[i] = value;
      image.data[i + 1] = value;
      image.data[i + 2] = value;
      image.data[i + 3] = grainRand() < 0.5 ? 10 : 26;
    }
    grainCtx.putImageData(image, 0, 0);
  }

  /* ------------------------------------------------------------------ */
  /* CIELO Y MAR                                                        */
  /* ------------------------------------------------------------------ */

  function drawStars(target: CanvasRenderingContext2D, time: number, alpha: number): void {
    for (let i = 0; i < stars.length; i += 1) {
      const star = stars[i];
      const twinkle = 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
      const a = alpha * star.alpha * twinkle;
      if (a <= 0.015) continue;
      target.globalAlpha = a;
      target.fillStyle = star.warm ? '#fde9b5' : '#dff8ff';
      target.fillRect(
        Math.round(star.x),
        Math.round(star.y + Math.sin(time * 0.05 + star.phase) * 1.2),
        star.size,
        star.size
      );
    }
    target.globalAlpha = 1;
  }

  function drawMoon(target: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    glow(target, x, y, radius * 5.4, 'rgba(174, 218, 245, 0.26)', 1);
    for (let row = -radius; row <= radius; row += 1) {
      const half = Math.round(Math.sqrt(Math.max(0, radius * radius - row * row)));
      px(target, x - half, y + row, half * 2, 1, row < -radius * 0.24 ? '#e6f1fa' : '#c6dcee');
    }
    px(target, x - radius * 0.42, y - radius * 0.3, 5, 3, 'rgba(132, 166, 192, 0.5)');
    px(target, x + radius * 0.22, y + radius * 0.12, 6, 4, 'rgba(132, 166, 192, 0.42)');
    px(target, x - radius * 0.14, y + radius * 0.48, 3, 2, 'rgba(132, 166, 192, 0.45)');
  }

  function drawAerialSea(target: CanvasRenderingContext2D, time: number): void {
    const horizon = lerp(112, 62, smoothstep(94.2, 102.4, time));

    // Cielo nocturno sobre el horizonte.
    const sky = target.createLinearGradient(0, 0, 0, horizon + 8);
    sky.addColorStop(0, '#02040e');
    sky.addColorStop(0.62, '#061224');
    sky.addColorStop(1, '#0b2136');
    target.fillStyle = sky;
    target.fillRect(0, 0, W, horizon + 8);

    drawStars(target, time, 0.6 * (1 - smoothstep(97.5, 103.5, time)));

    // Luna y su halo.
    const moonX = 508;
    const moonY = Math.max(26, horizon - 44);
    drawMoon(target, moonX, moonY, 14);

    // Mar profundo con perspectiva.
    const sea = target.createLinearGradient(0, horizon, 0, H);
    sea.addColorStop(0, '#0b2438');
    sea.addColorStop(0.35, '#071a2c');
    sea.addColorStop(1, '#020a13');
    target.fillStyle = sea;
    target.fillRect(0, horizon, W, H - horizon);

    // Bruma del horizonte.
    const mist = target.createLinearGradient(0, horizon - 12, 0, horizon + 26);
    mist.addColorStop(0, 'rgba(78, 122, 152, 0)');
    mist.addColorStop(0.45, 'rgba(78, 122, 152, 0.16)');
    mist.addColorStop(1, 'rgba(78, 122, 152, 0)');
    target.fillStyle = mist;
    target.fillRect(0, horizon - 12, W, 40);

    // Oleaje: filas que se abren hacia la cámara.
    for (let i = 0; i < 26; i += 1) {
      const p = i / 26;
      const y = horizon + 3 + Math.pow(p, 1.9) * (H - horizon);
      const gap = 9 + p * 34;
      const offset = (time * (4 + p * 24) + i * 29) % (gap * 2);
      for (let x = -gap * 2 + offset; x < W + gap; x += gap * 2) {
        const w = 5 + p * 24 + Math.sin(i * 1.7 + time) * 2;
        const a = 0.045 + p * 0.12;
        px(target, x, y, w, p > 0.55 ? 2 : 1, `rgba(118, 194, 218, ${a})`);
        if (i % 4 === 0) {
          px(target, x + w * 0.4, y - 2, w * 0.4, 1, `rgba(186, 228, 240, ${a * 0.7})`);
        }
      }
    }

    // Reflejo quebrado de la luna.
    for (let i = 0; i < 24; i += 1) {
      const p = i / 24;
      const y = horizon + 3 + Math.pow(p, 1.45) * (H - horizon);
      const w = 7 + p * 46 + Math.sin(time * 1.3 + i) * 4;
      px(
        target,
        moonX - w / 2 + Math.sin(time * 0.7 + i) * 5,
        y,
        w,
        1,
        `rgba(202, 233, 250, ${0.2 * (1 - p * 0.55)})`
      );
    }

    // Nubes que pasan y se pierden al descender.
    const cloudAlpha =
      smoothstep(93.4, 94.8, time) * (1 - smoothstep(104.5, 109.5, time));
    if (cloudAlpha > 0.01) {
      for (let i = 0; i < 7; i += 1) {
        const x = ((i * 197 + time * (7 + i * 3.4)) % (W + 460)) - 230;
        const y = horizon - 60 + (i % 4) * 22 + Math.sin(time * 0.24 + i) * 3;
        const w = 92 + (i % 3) * 58;
        glow(target, x, y, w * 0.62, 'rgba(124, 156, 184, 0.11)', cloudAlpha);
        glow(target, x + w * 0.4, y + 5, w * 0.4, 'rgba(96, 130, 160, 0.08)', cloudAlpha);
      }
      // Nube en primer plano que cruza al empezar.
      const pass = 1 - smoothstep(96.5, 99.5, time);
      if (pass > 0.01) {
        const fx = -180 + (time - 94) * 130;
        glow(target, fx, 116, 120, 'rgba(150, 178, 200, 0.14)', pass * 0.8);
        glow(target, fx + 90, 128, 90, 'rgba(130, 160, 185, 0.1)', pass * 0.7);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* ISLA NOCTURNA                                                      */
  /* ------------------------------------------------------------------ */

  function drawTree(
    target: CanvasRenderingContext2D,
    x: number,
    baseY: number,
    scale: number,
    sway: number,
    alpha = 1
  ): void {
    target.save();
    target.translate(x, baseY);
    target.scale(scale, scale);
    target.globalAlpha = alpha;
    // Tronco con corteza y raíces.
    px(target, -3, -32, 6, 32, '#1a130d');
    px(target, -2, -32, 3, 32, '#33251a');
    px(target, -1, -32, 1, 32, 'rgba(112, 80, 50, 0.45)');
    px(target, -6, -2, 4, 2, '#181109');
    px(target, 3, -2, 4, 2, '#181109');
    // Ramas que sostienen la copa.
    px(target, -10, -40, 8, 2, '#1d150e');
    px(target, 4, -44, 9, 2, '#1d150e');

    // Copa en capas irregulares.
    const s = sway;
    px(target, -11 + s * 0.5, -52, 24, 5, '#0a1a14');
    px(target, -19 + s * 0.7, -46, 38, 12, '#0b1f18');
    px(target, -23 + s, -39, 46, 13, '#092018');
    px(target, -14 + s, -57, 20, 6, '#0d241b');
    px(target, -6 + s * 1.2, -62, 14, 5, '#0c211a');
    // Luz de luna en el borde alto.
    px(target, -12 + s, -54, 7, 1, 'rgba(84, 150, 108, 0.28)');
    px(target, -19 + s * 0.8, -47, 11, 1, 'rgba(84, 150, 108, 0.18)');
    // Matas de hojas.
    for (let i = 0; i < 12; i += 1) {
      const lx = -21 + hash2(i, Math.round(x)) * 42;
      const ly = -49 + hash2(i, Math.round(x) + 7) * 22;
      px(
        target,
        lx + s * 0.6,
        ly,
        3 + (i % 3),
        2,
        i % 3 === 0 ? 'rgba(38, 96, 66, 0.55)' : 'rgba(20, 58, 42, 0.6)'
      );
    }
    target.restore();
  }

  function drawHouse(
    target: CanvasRenderingContext2D,
    time: number,
    glowStrength: number
  ): void {
    const hx = 320;
    const baseY = 300;
    const flicker =
      0.86 + Math.sin(time * 2.7) * 0.06 + Math.sin(time * 7.3) * 0.03;

    target.save();
    target.translate(hx, baseY);

    // Cimiento de piedra.
    px(target, -64, -16, 128, 16, '#15171c');
    px(target, -61, -14, 122, 12, '#2d3138');
    for (let i = 0; i < 12; i += 1) {
      px(target, -58 + i * 10, -13, 8, 4, i % 2 === 0 ? '#3a3f47' : '#33373e');
      px(target, -55 + i * 10, -8, 7, 4, i % 2 === 0 ? '#2b2f35' : '#363b42');
    }

    // Paredes de madera.
    px(target, -56, -82, 112, 68, '#1b130d');
    px(target, -53, -79, 106, 64, '#4a3222');
    for (let x = -50; x < 53; x += 9) {
      px(target, x, -78, 1, 62, 'rgba(30, 18, 10, 0.65)');
      px(target, x + 1, -78, 1, 62, 'rgba(120, 82, 50, 0.22)');
    }
    // Vetas y nudos de la madera.
    for (let i = 0; i < 9; i += 1) {
      const x = -48 + hash2(i, 71) * 96;
      const y = -72 + hash2(i, 73) * 48;
      px(target, x, y, 3, 1, 'rgba(96, 66, 42, 0.35)');
      px(target, x + 1, y + 1, 1, 1, 'rgba(28, 17, 9, 0.4)');
      if (i % 3 === 0) px(target, x - 6, y + 4, 5, 1, 'rgba(88, 60, 38, 0.22)');
    }
    // Vigas y alero.
    px(target, -58, -84, 116, 5, '#24170e');
    px(target, -56, -79, 112, 3, '#5a3d26');
    px(target, -56, -24, 112, 9, '#2a1a10');
    px(target, -56, -24, 112, 2, '#6f4c2c');

    // Tejado a dos aguas.
    for (let row = 0; row < 16; row += 1) {
      const half = 34 + row * 2.4;
      px(target, -half - 20, -104 + row, half * 2 + 40, 2, row % 3 === 0 ? '#2b1a12' : '#372117');
    }
    px(target, -76, -104, 152, 3, '#0c0806');
    px(target, -72, -101, 144, 2, '#5a3924');
    for (let i = 0; i < 11; i += 1) {
      px(target, -68 + i * 13, -98, 1, 12, 'rgba(16, 9, 5, 0.45)');
    }
    // Tejas escalonadas y luz de luna en el caballete.
    for (let row = 0; row < 4; row += 1) {
      const half = 34 + row * 6;
      for (let i = -half; i < half; i += 9) {
        px(target, i + (row % 2) * 4, -100 + row * 2, 1, 2, 'rgba(18, 10, 5, 0.4)');
        px(target, i + (row % 2) * 4 + 1, -100 + row * 2, 3, 1, 'rgba(122, 84, 52, 0.18)');
      }
    }
    px(target, -74, -104, 148, 1, 'rgba(168, 200, 220, 0.16)');
    // Chimenea y humo.
    px(target, 30, -126, 17, 26, '#2a1c17');
    px(target, 33, -129, 11, 4, '#1a110e');
    px(target, 32, -124, 3, 22, '#4b3428');
    for (let i = 0; i < 5; i += 1) {
      const drift = Math.sin(time * 0.5 + i) * 6;
      const a = 0.18 - i * 0.025;
      px(
        target,
        39 + drift + i * 2,
        -136 - i * 9 + Math.sin(time * 0.7 + i) * 2,
        5 + i,
        4,
        `rgba(190, 205, 220, ${a})`
      );
    }

    // Ventana principal cálida.
    const wx = -16;
    const wy = -63;
    px(target, wx - 4, wy - 4, 38, 34, '#24150c');
    px(target, wx, wy, 30, 26, '#ffb85c');
    px(target, wx + 2, wy + 2, 26, 22, `rgba(255, 213, 132, ${flicker})`);
    px(target, wx + 2, wy + 2, 26, 7, `rgba(255, 236, 189, ${0.55 * flicker})`);
    // Cortinas.
    px(target, wx, wy, 5, 26, '#7c3b25');
    px(target, wx + 25, wy, 5, 26, '#7c3b25');
    px(target, wx + 1, wy, 2, 26, '#a85a37');
    px(target, wx + 27, wy, 2, 26, '#a85a37');
    // Marco y cruceta.
    px(target, wx + 14, wy, 2, 26, '#3a2415');
    px(target, wx, wy + 12, 30, 2, '#3a2415');
    // Silueta de la radio y el interior al otro lado del cristal.
    px(target, wx + 5, wy + 18, 7, 5, 'rgba(74, 44, 24, 0.7)');
    px(target, wx + 12, wy + 16, 3, 1, 'rgba(74, 44, 24, 0.55)');
    px(target, wx + 17, wy + 14, 5, 9, 'rgba(90, 52, 28, 0.45)');

    // Luz cálida derramada sobre la pared y el alero.
    const spill = target.createRadialGradient(wx + 15, wy + 13, 6, wx + 15, wy + 13, 82);
    spill.addColorStop(0, 'rgba(255, 176, 88, 0.18)');
    spill.addColorStop(1, 'rgba(255, 176, 88, 0)');
    target.fillStyle = spill;
    target.fillRect(-58, -86, 118, 70);

    // Ventana lateral apagada.
    px(target, 32, -62, 15, 18, '#1a120c');
    px(target, 34, -60, 11, 14, '#0b1420');
    px(target, 39, -60, 1, 14, '#2b1d14');

    // Puerta.
    px(target, 52, -58, 30, 42, '#1b100a');
    px(target, 55, -55, 24, 39, '#392416');
    px(target, 56, -54, 22, 37, '#4a2e1b');
    for (let y = -50; y < -18; y += 6) {
      px(target, 57, y, 20, 1, 'rgba(26, 15, 8, 0.55)');
    }
    px(target, 73, -34, 2, 2, '#e0b64b');

    // Farol del porche.
    px(target, 83, -52, 2, 10, '#0d0906');
    px(target, 79, -46, 10, 8, '#241710');
    px(target, 81, -44, 6, 5, '#ffd27a');
    glow(target, 84, -42, 34, 'rgba(255, 191, 98, 0.55)', glowStrength);

    // Escalones y camino.
    px(target, 46, -4, 40, 4, '#343941');
    px(target, 42, 0, 48, 4, '#2b3038');
    px(target, 30, 4, 64, 3, '#22262d');

    target.restore();

    // Luz que sale de la ventana.
    glow(target, hx - 1, baseY - 50, 110, 'rgba(255, 186, 92, 0.28)', glowStrength);
    glow(target, hx - 1, baseY - 50, 44, 'rgba(255, 217, 140, 0.3)', glowStrength);
  }

  function drawIslandGroup(target: CanvasRenderingContext2D, time: number): void {
    // Lomas que se pierden en la noche.
    for (let i = 0; i < 34; i += 1) {
      const x = 116 + i * 12;
      const taper = Math.round((1 - Math.min(1, Math.min(i, 33 - i) / 5)) * 30);
      const rise = Math.round(hash2(i, 3) * 12) + taper;
      px(target, x, 208 + rise, 14, 40 - rise + taper, '#07161d');
    }
    for (let i = 0; i < 38; i += 1) {
      const x = 126 + i * 10;
      const taper = Math.round((1 - Math.min(1, Math.min(i, 37 - i) / 5)) * 26);
      const top = 220 + Math.round(hash2(i, 11) * 8) + taper;
      px(target, x, top, 12, 256 - top, i % 4 === 0 ? '#0d2a23' : '#0a201b');
    }
    // Meseta de pasto con borde irregular.
    px(target, 150, 238, 342, 62, '#123126');
    px(target, 156, 234, 330, 8, '#173a2c');
    for (let i = 0; i < 44; i += 1) {
      const x = 152 + i * 8;
      const h = 2 + Math.floor(hash2(i, 19) * 5);
      px(target, x, 234 - h, 8, h, i % 3 === 0 ? '#22523b' : '#1a4230');
    }
    // Matas, tierra y piedras sobre el pasto.
    for (let i = 0; i < 46; i += 1) {
      const x = 162 + hash2(i, 23) * 316;
      const y = 242 + hash2(i, 29) * 54;
      const w = 3 + Math.round(hash2(i, 31) * 8);
      px(
        target,
        x,
        y,
        w,
        1,
        hash2(i, 37) > 0.5 ? 'rgba(34, 82, 59, 0.75)' : 'rgba(72, 120, 88, 0.3)'
      );
      if (i % 5 === 0) px(target, x + 1, y - 2, 2, 2, 'rgba(110, 148, 118, 0.22)');
    }
    // Acantilado con estratos que cae al agua.
    for (let row = 0; row < 22; row += 1) {
      const y = 300 + row;
      const inset = Math.round(row * 3.1 + hash2(row, 41) * 4);
      const left = 152 + inset;
      const right = 492 - inset;
      px(target, left, y, right - left, 1, row < 6 ? '#20272b' : row < 13 ? '#192024' : '#12191d');
      if (row % 4 === 1) {
        px(target, left + 16, y, Math.max(0, right - left - 40), 1, 'rgba(96, 116, 124, 0.16)');
      }
    }
    // Playa y espuma.
    px(target, 206, 318, 236, 6, '#37322a');
    px(target, 214, 316, 220, 3, '#463e31');
    for (let i = 0; i < 20; i += 1) {
      const x = 196 + i * 12 + Math.sin(time * 1.1 + i) * 3;
      px(target, x, 324 + (i % 3), 7, 1, `rgba(196, 236, 244, ${0.14 + (i % 3) * 0.07})`);
    }
    // Rocas en la orilla.
    for (let i = 0; i < 7; i += 1) {
      const x = 166 + i * 15;
      const h = 5 + Math.round(hash2(i, 59) * 5);
      const y = 306 + (i % 3) * 5;
      px(target, x, y - h, 10, h, '#131c21');
      px(target, x + 1, y - h, 8, 2, '#2a373d');
    }
    for (let i = 0; i < 5; i += 1) {
      const x = 418 + i * 14;
      const h = 6 + Math.round(hash2(i, 61) * 4);
      const y = 308 + (i % 2) * 6;
      px(target, x, y - h, 9, h, '#131c21');
      px(target, x + 1, y - h, 7, 2, '#2a373d');
    }

    // Vegetación y rocas.
    for (let i = 0; i < 22; i += 1) {
      const x = 168 + i * 13;
      const y = 250 + (i % 4) * 7;
      px(target, x, y, 3 + (i % 3), 2, i % 4 === 0 ? '#24513a' : '#163a2b');
    }

    drawTree(target, 300, 248, 0.9, Math.sin(time * 0.62) * 0.9, 0.6);
    drawTree(target, 236, 266, 2.1, Math.sin(time * 0.6) * 1.2);
    drawTree(target, 408, 262, 2.4, Math.sin(time * 0.5 + 1.3) * 1.4);
    drawTree(target, 452, 276, 1.7, Math.sin(time * 0.7 + 2.1) * 1.0);
    drawTree(target, 192, 282, 1.6, Math.sin(time * 0.55 + 3.1) * 1.1);
    drawTree(target, 444, 252, 1.25, Math.sin(time * 0.66 + 4.2) * 1.0, 0.85);
    drawTree(target, 506, 288, 2.2, Math.sin(time * 0.48 + 5.1) * 1.3);
    drawTree(target, 170, 262, 1.5, Math.sin(time * 0.72 + 6.3) * 0.9, 0.9);

    // Cerca del jardín, a la izquierda de la casa.
    for (let i = 0; i < 6; i += 1) {
      px(target, 172 + i * 17, 292, 2, 11, '#2b2119');
      px(target, 172 + i * 17, 295, 15, 1, '#3a2c20');
      px(target, 172 + i * 17, 300, 15, 1, '#30241a');
    }
    // Sendero de piedras desde la puerta hasta la playa.
    for (let i = 0; i < 12; i += 1) {
      const x = 370 - i * 2.6 + Math.sin(i * 0.7) * 4;
      const y = 305 + i * 1.4;
      px(target, x, y, 7 - i * 0.3, 2, 'rgba(92, 74, 51, 0.55)');
    }
    // Sombra y reflejo roto bajo la isla.
    px(target, 214, 326, 216, 8, 'rgba(3, 12, 18, 0.7)');
    for (let i = 0; i < 9; i += 1) {
      const x = 246 + i * 20 + Math.sin(time * 0.8 + i) * 4;
      px(target, x, 330 + (i % 4) * 3, 10 + (i % 3) * 8, 1, 'rgba(120, 198, 221, 0.1)');
    }

    // Casa iluminada.
    drawHouse(target, time, 1);

    // Luciérnagas.
    for (let i = 0; i < 10; i += 1) {
      const x = 190 + i * 26 + Math.sin(time * 0.9 + i) * 7;
      const y = 250 + (i % 5) * 14 + Math.cos(time * 0.7 + i) * 4;
      const a = 0.2 + 0.35 * Math.abs(Math.sin(time * 1.4 + i * 2));
      glow(target, x, y, 6, 'rgba(253, 224, 71, 0.7)', a);
    }
  }

  /* ------------------------------------------------------------------ */
  /* DETALLES DE LA CASA Y EL CRISTAL                                   */
  /* ------------------------------------------------------------------ */

  function drawLeaf(
    target: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    rotation: number,
    color: string
  ): void {
    target.save();
    target.translate(x, y);
    target.rotate(rotation);
    target.beginPath();
    target.ellipse(0, 0, size * 0.5, size * 0.18, 0, 0, Math.PI * 2);
    target.fillStyle = color;
    target.fill();
    target.strokeStyle = 'rgba(126, 164, 128, 0.22)';
    target.lineWidth = 1;
    target.beginPath();
    target.moveTo(-size * 0.42, 0);
    target.lineTo(size * 0.42, 0);
    target.stroke();
    target.restore();
  }

  function drawWindBranch(target: CanvasRenderingContext2D, time: number, alpha: number): void {
    const sway = Math.sin(time * 0.9) * 5 + Math.sin(time * 1.7) * 2;
    target.save();
    target.globalAlpha = alpha;
    target.lineCap = 'round';
    target.strokeStyle = '#080f0b';
    target.lineWidth = 3;
    target.beginPath();
    target.moveTo(40, 92);
    target.quadraticCurveTo(120, 86 + sway * 0.4, 202, 138 + sway);
    target.stroke();
    target.strokeStyle = 'rgba(96, 128, 92, 0.3)';
    target.lineWidth = 1.2;
    target.beginPath();
    target.moveTo(41, 90);
    target.quadraticCurveTo(120, 84 + sway * 0.4, 200, 136 + sway);
    target.stroke();

    for (let i = 0; i < 8; i += 1) {
      const t = 0.22 + i * 0.1;
      const bx = lerp(40, 202, t) + Math.sin(i * 2.1) * 4;
      const by = lerp(92, 138, t) + sway * t + Math.cos(i * 1.7) * 3;
      drawLeaf(
        target,
        bx,
        by,
        14 + (i % 3) * 5,
        -0.7 + i * 0.32 + sway * 0.015,
        i % 2 === 0 ? 'rgba(8, 24, 15, 0.95)' : 'rgba(12, 32, 20, 0.9)'
      );
    }
    target.restore();
  }

  function drawCanopyOverlay(
    target: CanvasRenderingContext2D,
    time: number,
    alpha: number
  ): void {
    if (alpha <= 0.01) return;
    target.save();
    target.globalAlpha = alpha;
    target.filter = 'blur(1.1px)';
    const clusters = [
      { x: -26, y: 34, spread: 0.62, dir: 1 },
      { x: W + 24, y: 66, spread: 0.58, dir: -1 },
    ];
    for (const cluster of clusters) {
      for (let i = 0; i < 9; i += 1) {
        const angle = (cluster.dir === 1 ? 0.5 : Math.PI - 0.5) + (i - 4) * 0.15 + Math.sin(time * 0.7 + i) * 0.03;
        const len = (86 + (i % 3) * 38) * cluster.spread * 2;
        const x0 = cluster.x;
        const y0 = cluster.y;
        target.beginPath();
        target.moveTo(x0, y0);
        target.quadraticCurveTo(
          x0 + Math.cos(angle) * len * 0.5,
          y0 + Math.sin(angle) * len * 0.5 - 20,
          x0 + Math.cos(angle) * len,
          y0 + Math.sin(angle) * len + 12
        );
        target.quadraticCurveTo(
          x0 + Math.cos(angle + 0.13) * len * 0.55,
          y0 + Math.sin(angle + 0.13) * len * 0.55 + 2,
          x0,
          y0
        );
        target.fillStyle = i % 2 === 0 ? 'rgba(5, 16, 11, 0.94)' : 'rgba(9, 26, 17, 0.88)';
        target.fill();
        target.strokeStyle = 'rgba(70, 112, 78, 0.18)';
        target.lineWidth = 1;
        target.beginPath();
        target.moveTo(x0, y0);
        target.quadraticCurveTo(
          x0 + Math.cos(angle) * len * 0.55,
          y0 + Math.sin(angle) * len * 0.55 - 6,
          x0 + Math.cos(angle) * len * 0.95,
          y0 + Math.sin(angle) * len * 0.95 + 8
        );
        target.stroke();
      }
    }
    target.restore();
  }

  function drawForegroundShore(
    target: CanvasRenderingContext2D,
    time: number,
    alpha: number,
    push: number
  ): void {
    if (alpha <= 0.01) return;
    const top = 301 + push * 44 + Math.sin(time * 0.32) * 1.4;
    target.save();
    target.globalAlpha = alpha;
    target.filter = 'blur(1.1px)';

    target.beginPath();
    target.moveTo(-24, H + 24);
    target.lineTo(-24, top + 20);
    for (let x = -24; x <= W + 24; x += 16) {
      const bump =
        Math.sin(x * 0.021 + 1.3) * 5 + hash2(Math.floor(x / 16), 5) * 6;
      target.lineTo(x, top + bump);
    }
    target.lineTo(W + 24, H + 24);
    target.closePath();
    const ground = target.createLinearGradient(0, top - 8, 0, H);
    ground.addColorStop(0, '#0c2014');
    ground.addColorStop(0.42, '#07140d');
    ground.addColorStop(1, '#020806');
    target.fillStyle = ground;
    target.fill();

    // Pasto y helechos del borde.
    for (let i = 0; i < 52; i += 1) {
      const x = -8 + i * 13 + hash2(i, 7) * 12;
      const y =
        top +
        Math.sin(x * 0.021 + 1.3) * 5 +
        hash2(Math.floor(x / 16), 5) * 6 +
        2;
      const h = 3 + hash2(i, 9) * 9;
      target.strokeStyle = `rgba(70, 118, 80, ${0.18 + hash2(i, 11) * 0.2})`;
      target.lineWidth = 1.3;
      target.beginPath();
      target.moveTo(x, y);
      target.quadraticCurveTo(x + 2, y - h * 0.6, x + (i % 2 === 0 ? 4 : -3), y - h);
      target.stroke();
    }

    // Rocas y hojas en primer plano.
    for (let i = 0; i < 3; i += 1) {
      const rx = 70 + i * 210 + Math.sin(time * 0.2 + i) * 3;
      const ry = top + 22 + (i % 2) * 12;
      target.beginPath();
      target.ellipse(rx, ry, 30 + i * 8, 10 + i * 2, -0.06, 0, Math.PI * 2);
      target.fillStyle = '#0b1511';
      target.fill();
      target.strokeStyle = 'rgba(96, 126, 104, 0.16)';
      target.lineWidth = 1;
      target.beginPath();
      target.ellipse(rx - 2, ry - 6, 24 + i * 6, 4, -0.08, 0, Math.PI);
      target.stroke();
    }
    drawLeaf(target, 48, top + 26, 54, -0.5 + Math.sin(time * 0.5) * 0.03, 'rgba(5, 17, 11, 0.95)');
    drawLeaf(target, 86, top + 34, 42, -0.2, 'rgba(7, 22, 14, 0.9)');
    drawLeaf(target, W - 36, top + 30, 48, Math.PI + 0.45, 'rgba(5, 17, 11, 0.95)');

    target.restore();
    target.filter = 'none';
  }

  function drawGlassAndInterior(
    target: CanvasRenderingContext2D,
    time: number,
    win: { x: number; y: number; w: number; h: number },
    push: number
  ): void {
    if (push <= 0.01) return;
    const cx = win.x + win.w / 2;
    const cy = win.y + win.h / 2;
    const reflections = push * (1 - smoothstep(121.1, 123.2, time));
    const interior = smoothstep(118.6, 123.2, time);

    target.save();
    target.beginPath();
    target.rect(win.x - 2, win.y - 2, win.w + 4, win.h + 4);
    target.clip();

    // El interior gana cuerpo y contraste.
    if (interior > 0.01) {
      target.fillStyle = `rgba(96, 44, 16, ${0.2 * interior})`;
      target.fillRect(win.x, win.y, win.w, win.h);
    }

    // Reflejos fríos del cristal, cada vez más tenues.
    if (reflections > 0.01) {
      target.globalCompositeOperation = 'screen';
      const sheen = target.createLinearGradient(win.x, win.y, win.x + win.w, win.y + win.h);
      sheen.addColorStop(0, `rgba(168, 212, 240, ${0.24 * reflections})`);
      sheen.addColorStop(0.34, 'rgba(168, 212, 240, 0)');
      sheen.addColorStop(0.55, `rgba(196, 228, 250, ${0.16 * reflections})`);
      sheen.addColorStop(1, 'rgba(196, 228, 250, 0)');
      target.fillStyle = sheen;
      target.fillRect(win.x, win.y, win.w, win.h);

      target.save();
      target.translate(cx, cy);
      target.rotate(-0.52);
      for (let i = 0; i < 3; i += 1) {
        const bandX = -win.w * 0.85 + i * win.w * 0.62 + Math.sin(time * 0.6 + i) * 6;
        const band = target.createLinearGradient(0, -win.h, 0, win.h);
        band.addColorStop(0, 'rgba(210, 238, 255, 0)');
        band.addColorStop(0.5, `rgba(210, 238, 255, ${0.13 * reflections})`);
        band.addColorStop(1, 'rgba(210, 238, 255, 0)');
        target.fillStyle = band;
        target.fillRect(bandX, -win.h, win.w * 0.16, win.h * 2.4);
      }
      target.restore();

      // Destello del reflejo de la luna.
      glow(
        target,
        win.x + win.w * 0.78,
        win.y + win.h * 0.24,
        win.w * 0.2,
        'rgba(208, 238, 255, 0.9)',
        0.35 * reflections
      );
    }

    // El interior se revela: lámpara, mesa y la radio encendida.
    if (interior > 0.01) {
      target.globalCompositeOperation = 'lighter';
      glow(target, cx, cy - win.h * 0.12, win.w * 0.4, 'rgba(255, 176, 92, 0.4)', interior * 0.6);
      glow(target, cx - win.w * 0.26, cy + win.h * 0.1, win.w * 0.17, 'rgba(255, 214, 150, 0.55)', interior * 0.6);

      target.globalCompositeOperation = 'source-over';
      // Mesa.
      target.fillStyle = `rgba(52, 28, 14, ${0.72 * interior})`;
      target.fillRect(cx - win.w * 0.42, cy + win.h * 0.26, win.w * 0.84, win.h * 0.05);
      // Radio de transistores.
      const radioW = win.w * 0.23;
      const radioH = win.h * 0.17;
      const radioX = cx - radioW * 0.5;
      const radioY = cy + win.h * 0.08;
      target.fillStyle = `rgba(56, 32, 18, ${0.82 * interior})`;
      target.fillRect(radioX, radioY, radioW, radioH);
      target.fillStyle = `rgba(78, 46, 26, ${0.85 * interior})`;
      target.fillRect(radioX + radioW * 0.08, radioY + radioH * 0.18, radioW * 0.8, radioH * 0.34);
      target.fillStyle = `rgba(20, 12, 8, ${0.8 * interior})`;
      target.fillRect(radioX + radioW * 0.1, radioY + radioH * 0.62, radioW * 0.42, radioH * 0.3);
      target.fillStyle = `rgba(255, 214, 140, ${0.55 * interior})`;
      target.fillRect(radioX + radioW * 0.6, radioY + radioH * 0.68, radioW * 0.26, 1.6);
      target.fillRect(radioX + radioW * 0.72, radioY + radioH * 0.62, 1.6, 2.4);
      // Antena.
      target.strokeStyle = `rgba(150, 128, 98, ${0.5 * interior})`;
      target.lineWidth = 1;
      target.beginPath();
      target.moveTo(radioX + radioW * 0.82, radioY);
      target.lineTo(radioX + radioW * 1.05, radioY - radioH * 0.5);
      target.stroke();
      // Onda de la radio.
      for (let i = 0; i < 4; i += 1) {
        const phase = (time * 0.42 + i * 0.25) % 1;
        const nx = radioX + radioW + 4 + i * 3 + Math.sin(time * 1.4 + i) * 2;
        const ny = radioY - phase * win.h * 0.16;
        const a = (1 - phase) * 0.35 * interior;
        target.fillStyle = `rgba(255, 224, 160, ${a})`;
        target.fillRect(nx, ny, 1.6, 2.4);
      }
      // Cortinas en sombra a los lados.
      target.fillStyle = `rgba(46, 20, 10, ${0.32 * interior})`;
      target.fillRect(win.x, win.y, win.w * 0.08, win.h);
      target.fillRect(win.x + win.w * 0.92, win.y, win.w * 0.08, win.h);
      // Techo del interior, en penumbra.
      const innerShade = target.createLinearGradient(0, win.y, 0, win.y + win.h * 0.4);
      innerShade.addColorStop(0, `rgba(34, 14, 6, ${0.5 * interior})`);
      innerShade.addColorStop(1, 'rgba(34, 14, 6, 0)');
      target.fillStyle = innerShade;
      target.fillRect(win.x, win.y, win.w, win.h * 0.4);
    }
    target.restore();

    // Halo cálido contenido; ya no lava la pared.
    glow(target, cx, cy, win.w * 1.35, 'rgba(255, 186, 92, 0.22)', push * 0.8);
    glow(target, cx, cy, win.w * 0.62, 'rgba(255, 219, 150, 0.3)', push * 0.75);

    // Marco del cristal, en sombra.
    target.save();
    target.strokeStyle = `rgba(18, 10, 6, ${0.55 * push})`;
    target.lineWidth = Math.max(1.5, win.w * 0.024);
    target.strokeRect(win.x - 1, win.y - 1, win.w + 2, win.h + 2);
    target.restore();
  }

  /* ------------------------------------------------------------------ */
  /* DESCENSO A LA ISLA (ACTO II)                                       */
  /* ------------------------------------------------------------------ */

  function drawApproach(target: CanvasRenderingContext2D, time: number): void {
    const reveal = smoothstep(95.4, 99.2, time);
    const descent = smoothstep(98.6, 106.2, time);
    const flyover = smoothstep(105.2, 113.4, time);
    const housePush = smoothstep(112.2, 118.4, time);
    const windowPush = smoothstep(117.4, 123.6, time);
    const glassPush = smoothstep(121.2, 123.8, time);

    drawAerialSea(target, time);

    const scale =
      lerp(0.09, 0.72, descent) +
      flyover * 0.52 +
      housePush * 1.18 +
      windowPush * 3.35 +
      glassPush * 2.1;
    const focusX = lerp(lerp(320, 398, flyover), 319, smoothstep(111.8, 120.4, time));
    const focusY = lerp(lerp(250, 262, flyover), 250, smoothstep(111.8, 120.4, time));

    const islandAlpha = smoothstep(95.4, 99.6, time);
    const farBlur = (1 - smoothstep(100.4, 106.8, time)) * 1.1;

    target.save();
    target.globalAlpha = islandAlpha;
    if (farBlur > 0.12) target.filter = `blur(${farBlur.toFixed(2)}px)`;
    target.translate(W / 2, H / 2 + (1 - reveal) * 54);
    target.scale(scale, scale);
    target.translate(-focusX, -focusY);
    drawIslandGroup(target, time);
    target.restore();
    target.filter = 'none';

    // La ventana, en coordenadas de pantalla.
    const win = {
      x: W / 2 + (304 - focusX) * scale,
      y: H / 2 + (237 - focusY) * scale,
      w: 30 * scale,
      h: 26 * scale,
    };

    // Niebla baja que funde la isla con el mar.
    const seaFog = smoothstep(99, 104, time) * (1 - smoothstep(110, 114, time));
    if (seaFog > 0.01) {
      const fog = target.createLinearGradient(0, H * 0.62, 0, H);
      fog.addColorStop(0, 'rgba(10, 26, 40, 0)');
      fog.addColorStop(0.55, `rgba(14, 34, 50, ${0.24 * seaFog})`);
      fog.addColorStop(1, `rgba(6, 16, 26, ${0.4 * seaFog})`);
      target.fillStyle = fog;
      target.fillRect(0, H * 0.62, W, H * 0.38);
    }

    // Rama en primer plano que se mueve con el viento.
    const branchAlpha =
      smoothstep(112.6, 116.2, time) * (1 - smoothstep(121.4, 123.2, time));
    if (branchAlpha > 0.01) {
      target.save();
      target.filter = 'blur(0.7px)';
      drawWindBranch(target, time, branchAlpha);
      target.restore();
      target.filter = 'none';
    }

    // Follaje de paso durante el sobrevuelo.
    const canopyAlpha =
      smoothstep(105.4, 108.2, time) * (1 - smoothstep(113.8, 116.8, time));
    drawCanopyOverlay(target, time, canopyAlpha);

    // Suelo y vegetación en primer plano: asienta la casa en la isla.
    const shoreAlpha =
      smoothstep(110.2, 114.4, time) * (1 - smoothstep(124.8, 126.9, time));
    drawForegroundShore(target, time, shoreAlpha, windowPush);

    // Cristal, reflejos e interior sugerido.
    if (windowPush > 0.01) {
      drawGlassAndInterior(target, time, win, windowPush);
    }

    // El fondo se oscurece cuando la ventana llena el encuadre.
    const settle = smoothstep(123.4, 125.8, time);
    if (settle > 0.01) {
      const shade = target.createRadialGradient(
        W / 2,
        H / 2,
        H * 0.22,
        W / 2,
        H / 2,
        W * 0.7
      );
      shade.addColorStop(0, 'rgba(2, 4, 8, 0)');
      shade.addColorStop(1, `rgba(2, 4, 8, ${0.62 * settle})`);
      target.fillStyle = shade;
      target.fillRect(0, 0, W, H);
    }

    // Fundido a negro: la escena existente toma el relevo.
    const fade = smoothstep(126.4, 127.8, time);
    if (fade > 0.001) {
      px(target, 0, 0, W, H, `rgba(0, 0, 0, ${fade})`);
    }
  }

  function drawGrainAndVignette(target: CanvasRenderingContext2D, time: number): void {
    // Grano de película sutil.
    const gx = Math.floor(hash2(Math.floor(time * 24), 11) * 160);
    const gy = Math.floor(hash2(Math.floor(time * 24), 12) * 160);
    target.save();
    target.globalAlpha = 0.4;
    for (let y = -gy; y < H; y += 160) {
      for (let x = -gx; x < W; x += 160) {
        target.drawImage(grainCanvas, x, y);
      }
    }
    target.restore();

    // Viñeta.
    const vignette = target.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.62);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
    target.fillStyle = vignette;
    target.fillRect(0, 0, W, H);

    // Líneas de barrido muy suaves.
    for (let y = 0; y < H; y += 3) {
      target.fillStyle = 'rgba(0, 0, 0, 0.055)';
      target.fillRect(0, y, W, 1);
    }
  }

  function renderAtTime(elapsedSec: number): void {
    if (!ctx) return;
    const time = Math.max(0, Math.min(TOTAL_CINEMATIC_DURATION_SEC, elapsedSec));

    if (time < CINEMATIC_ACT_ONE_END_SEC) {
      cosmic.renderAtTime(time);
    } else {
      drawApproach(ctx, time);
    }

    drawGrainAndVignette(ctx, time);
  }

  return {
    renderAtTime,
    dispose: () => {
      canvas.remove();
    },
  };
}
