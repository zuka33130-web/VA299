/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Escenas 1–5 de la cinemática de apertura de PIXELVERSE:
 * el santuario de la consola, la pulsación del Reinicio Cero, SUPER KING
 * KOOPA, la onda que borra la memoria de los videojuegos y el planeta
 * silencioso donde se escribe la fecha canónica.
 *
 * El dibujo mantiene un único diseño de garra y de villano. Los efectos
 * buscan volumen, polvo y luz cinematográfica, no explosiones de sprites.
 */

import {
  CINEMA_H as H,
  CINEMA_W as W,
  boneClaw,
  clamp01,
  glow,
  hash2,
  lerp,
  mulberry32,
  poly,
  px,
  scalePlate,
  smoothstep,
} from './cinematicRebootDraw';
import { isVillainSpeakingAt } from './cinematicRebootNarrator';

export interface CosmicRebootScene {
  renderAtTime: (elapsedSec: number) => void;
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

interface Mote {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  drift: number;
}

const SCALE_DARK = '#1b2b1b';
const SCALE_MID = '#2f4a2c';
const SCALE_LIGHT = '#4c6c41';
const ARMOR_DARK = '#181b21';
const ARMOR_MID = '#2b3038';
const ARMOR_EDGE = '#4a525e';
const BONE = '#d9c7a0';

function shakeAt(time: number, start: number, amplitude: number, speed = 60): number {
  if (time < start) return 0;
  const decay = Math.exp(-(time - start) * 3.1);
  return Math.sin((time - start) * speed) * amplitude * decay;
}

function drawBackdropStars(
  target: CanvasRenderingContext2D,
  stars: Star[],
  time: number,
  alpha: number
): void {
  for (let i = 0; i < stars.length; i += 1) {
    const star = stars[i];
    const twinkle = 0.55 + 0.45 * Math.sin(time * star.speed + star.phase);
    const a = alpha * star.alpha * twinkle;
    if (a <= 0.015) continue;
    target.globalAlpha = a;
    target.fillStyle = star.warm ? '#fde9b5' : '#dff8ff';
    target.fillRect(
      Math.round(star.x),
      Math.round(star.y + Math.sin(time * 0.06 + star.phase) * 1.2),
      star.size,
      star.size
    );
  }
  target.globalAlpha = 1;
}

export function createCosmicRebootScene(
  target: CanvasRenderingContext2D,
  reducedMotion: boolean
): CosmicRebootScene {
  const rand = mulberry32(3160427);
  const stars: Star[] = Array.from({ length: 230 }, () => ({
    x: rand() * W,
    y: rand() * H,
    size: rand() < 0.88 ? 1 : 2,
    alpha: 0.25 + rand() * 0.7,
    phase: rand() * Math.PI * 2,
    speed: 0.35 + rand() * 1.5,
    warm: rand() < 0.22,
  }));
  const motes: Mote[] = Array.from({ length: 46 }, () => ({
    x: rand() * W,
    y: rand() * H,
    size: rand() < 0.8 ? 1 : 2,
    phase: rand() * Math.PI * 2,
    speed: 3 + rand() * 14,
    drift: (rand() - 0.5) * 10,
  }));

  function drawMotes(
    time: number,
    alpha: number,
    color = 'rgba(255, 196, 150, 0.5)'
  ): void {
    if (alpha <= 0) return;
    for (let i = 0; i < motes.length; i += 1) {
      const mote = motes[i];
      const x = (mote.x + Math.sin(time * 0.3 + mote.phase) * 18 + time * mote.drift) % W;
      const y = (mote.y - time * mote.speed + H * 4) % H;
      target.globalAlpha = alpha * (0.2 + 0.4 * Math.abs(Math.sin(time * 0.7 + mote.phase)));
      target.fillStyle = color;
      target.fillRect(Math.round(x), Math.round(y), mote.size, mote.size);
    }
    target.globalAlpha = 1;
  }

  /* ------------------------------------------------------------------ */
  /* ESCENA 1 · LA CONSOLA Y LA GARRA                                    */
  /* ------------------------------------------------------------------ */

  function drawRoom(time: number, reveal: number): void {
    const wall = target.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, '#030407');
    wall.addColorStop(0.55, '#07080c');
    wall.addColorStop(1, '#0b0b0f');
    target.fillStyle = wall;
    target.fillRect(0, 0, W, H);

    // Estructura lejana, apenas enfocada.
    target.save();
    target.filter = 'blur(2.4px)';
    for (let i = 0; i < 9; i += 1) {
      const x = 24 + i * 74;
      px(target, x, 34, 46, 260, i % 2 === 0 ? '#05060a' : '#070810');
      px(target, x + 4, 40, 2, 248, 'rgba(64, 76, 92, 0.18)');
      px(target, x + 40, 40, 1, 248, 'rgba(9, 10, 14, 0.8)');
    }
    // Tuberías y cables del techo.
    for (let i = 0; i < 5; i += 1) {
      px(target, 0, 16 + i * 13, W, 3, i % 2 === 0 ? '#0a0c12' : '#07090e');
      px(target, 0, 17 + i * 13, W, 1, 'rgba(86, 96, 110, 0.14)');
    }
    for (let i = 0; i < 6; i += 1) {
      target.strokeStyle = 'rgba(5, 6, 9, 0.9)';
      target.lineWidth = 3;
      target.beginPath();
      target.moveTo(40 + i * 104, 0);
      target.bezierCurveTo(30 + i * 104, 90, 90 + i * 104, 120, 66 + i * 104, 250);
      target.stroke();
    }
    // Conductos inclinados.
    for (let i = 0; i < 4; i += 1) {
      target.strokeStyle = '#080a10';
      target.lineWidth = 10;
      target.beginPath();
      target.moveTo(70 + i * 160, 0);
      target.lineTo(120 + i * 160, 250);
      target.stroke();
      target.strokeStyle = 'rgba(96, 108, 124, 0.08)';
      target.lineWidth = 1;
      target.stroke();
    }
    target.restore();

    // Luz roja lateral, la única fuente.
    const slitX = 56;
    const slit = target.createLinearGradient(0, 40, 0, 300);
    slit.addColorStop(0, 'rgba(255, 60, 36, 0)');
    slit.addColorStop(0.18, 'rgba(255, 60, 36, 0.5)');
    slit.addColorStop(0.72, 'rgba(255, 74, 44, 0.62)');
    slit.addColorStop(1, 'rgba(255, 60, 36, 0)');
    target.fillStyle = slit;
    target.fillRect(slitX, 36, 4, 268);
    glow(target, slitX + 2, 168, 220, 'rgba(255, 40, 22, 0.34)', reveal);
    glow(target, slitX + 2, 168, 70, 'rgba(255, 90, 60, 0.32)', reveal);

    // Piso de rejilla.
    px(target, 0, 318, W, 42, '#050608');
    for (let i = 0; i < 22; i += 1) {
      px(target, i * 31, 322, 26, 1, 'rgba(58, 66, 78, 0.16)');
    }
    for (let y = 326; y < H; y += 7) {
      px(target, 0, y, W, 1, 'rgba(38, 44, 54, 0.15)');
    }
    // Niebla baja.
    const fog = target.createLinearGradient(0, 280, 0, H);
    fog.addColorStop(0, 'rgba(10, 12, 18, 0)');
    fog.addColorStop(1, 'rgba(12, 14, 20, 0.75)');
    target.fillStyle = fog;
    target.fillRect(0, 280, W, H - 280);

    // Polvo rojo en el haz lateral.
    target.save();
    target.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i += 1) {
      const x = 60 + hash2(i, 9) * 180 + Math.sin(time * 0.25 + i) * 12;
      const y = 60 + hash2(i, 13) * 220 + Math.cos(time * 0.2 + i) * 8;
      const a = reveal * (0.06 + hash2(i, 17) * 0.16);
      px(target, x, y, 1, 1, `rgba(255, 120, 90, ${a})`);
    }
    target.restore();
  }

  function drawConsole(
    time: number,
    reveal: number,
    press: number,
    powered: number
  ): void {
    if (reveal <= 0.001) return;
    target.save();
    target.globalAlpha = reveal;

    // Cuerpo principal: base, superficie inclinada y frontal.
    poly(
      target,
      [
        [92, 250],
        [556, 236],
        [600, 302],
        [56, 320],
      ],
      '#101319'
    );
    poly(
      target,
      [
        [104, 252],
        [548, 240],
        [584, 294],
        [66, 310],
      ],
      '#1c212a'
    );
    poly(
      target,
      [
        [66, 310],
        [584, 294],
        [570, 360],
        [54, 360],
      ],
      '#0d1015'
    );
    // Bisel luminoso del borde superior.
    target.strokeStyle = 'rgba(112, 128, 148, 0.35)';
    target.lineWidth = 1;
    target.beginPath();
    target.moveTo(104, 252);
    target.lineTo(548, 240);
    target.lineTo(584, 294);
    target.stroke();
    // Reflejo rojo en el metal.
    const rim = target.createLinearGradient(70, 250, 300, 300);
    rim.addColorStop(0, 'rgba(255, 62, 40, 0.3)');
    rim.addColorStop(0.5, 'rgba(255, 62, 40, 0.04)');
    rim.addColorStop(1, 'rgba(255, 62, 40, 0)');
    target.fillStyle = rim;
    target.fillRect(70, 244, 260, 56);

    // Paneles, juntas y desgaste.
    for (let i = 0; i < 7; i += 1) {
      const x = 118 + i * 66;
      target.strokeStyle = 'rgba(6, 8, 11, 0.7)';
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(x, 254 + i * 1.4);
      target.lineTo(x - 12, 356);
      target.stroke();
    }
    for (let i = 0; i < 18; i += 1) {
      const x = 120 + hash2(i, 31) * 430;
      const y = 258 + hash2(i, 37) * 80;
      px(target, x, y, 5 + hash2(i, 41) * 14, 1, `rgba(118, 128, 140, ${0.05 + hash2(i, 43) * 0.12})`);
      if (i % 4 === 0) {
        px(target, x + 3, y + 2, 1, 3 + hash2(i, 47) * 8, 'rgba(96, 62, 44, 0.18)');
      }
    }
    // Remaches.
    for (let i = 0; i < 12; i += 1) {
      const x = 112 + i * 40;
      px(target, x, 248 + i * 0.6, 2, 2, 'rgba(150, 160, 172, 0.22)');
    }

    // Botón central rojo.
    const bx = 352;
    const by = 276;
    const sink = press * 3.2;
    target.beginPath();
    target.ellipse(bx, by, 28, 17, -0.04, 0, Math.PI * 2);
    ctxGradientMetal(target, bx - 20, by - 12, bx + 20, by + 14);
    target.fill();
    target.strokeStyle = 'rgba(70, 78, 90, 0.85)';
    target.lineWidth = 2;
    target.stroke();

    const glowPower = 0.35 + powered * 0.65 + press * 0.3;
    glow(target, bx, by - 2, 44, 'rgba(255, 58, 38, 0.5)', glowPower);
    target.beginPath();
    target.ellipse(bx, by + sink, 15, 9.5, -0.04, 0, Math.PI * 2);
    const buttonGrad = target.createRadialGradient(bx - 3, by - 4, 1, bx, by, 16);
    buttonGrad.addColorStop(0, '#ffd0b8');
    buttonGrad.addColorStop(0.25, '#ff6a45');
    buttonGrad.addColorStop(0.7, '#c11b13');
    buttonGrad.addColorStop(1, '#5c0a08');
    target.fillStyle = buttonGrad;
    target.fill();
    target.strokeStyle = 'rgba(255, 120, 90, 0.45)';
    target.lineWidth = 1;
    target.stroke();
    if (press > 0.05) {
      target.beginPath();
      target.ellipse(bx, by + sink, 8, 4, 0, 0, Math.PI * 2);
      target.fillStyle = `rgba(255, 238, 224, ${0.5 + press * 0.4})`;
      target.fill();
      glow(target, bx, by + sink, 22, 'rgba(255, 110, 70, 0.8)', press);
    }

    // Aro de la consola alrededor del botón, con marcas.
    target.strokeStyle = `rgba(255, 76, 48, ${0.14 + powered * 0.4})`;
    target.lineWidth = 1;
    target.beginPath();
    target.ellipse(bx, by, 46, 27, -0.04, 0, Math.PI * 2);
    target.stroke();
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2;
      const x = bx + Math.cos(a) * 40;
      const y = by + Math.sin(a) * 23;
      px(target, x - 1, y - 1, 2, 2, i % 3 === 0 ? `rgba(255, 90, 60, ${0.2 + powered * 0.5})` : 'rgba(120, 132, 148, 0.2)');
    }

    // Luces de estado que despiertan en secuencia.
    const steps = 6;
    const active = press > 0.01 ? clamp01((time - 18.3) / 2.1) * steps : 0;
    for (let side = 0; side < 2; side += 1) {
      for (let i = 0; i < 6; i += 1) {
        const x = side === 0 ? 160 + i * 24 : 456 + i * 24;
        const y = side === 0 ? 306 - i * 1.4 : 300 - i * 1.4;
        const on = active >= i + 1 + side * 0.5;
        px(target, x, y, 12, 3, on ? (i % 2 === 0 ? '#ff5a3a' : '#ffd0a0') : '#1a1e25');
        if (on) glow(target, x + 6, y + 1, 9, 'rgba(255, 90, 60, 0.55)', 0.7);
      }
    }
    // Pequeñas pantallas de datos, sin texto legible.
    for (let i = 0; i < 2; i += 1) {
      const sx = i === 0 ? 150 : 458;
      const sy = 262;
      px(target, sx - 4, sy - 4, 60, 20, '#06090d');
      px(target, sx, sy, 52, 12, press > 0.02 ? '#3a0c08' : '#0a0d12');
      if (press > 0.02) {
        for (let g = 0; g < 5; g += 1) {
          px(target, sx + 4, sy + 2 + g * 2, 18 + hash2(g, i + Math.floor(time * 6)) * 26, 1, 'rgba(255, 120, 80, 0.5)');
        }
      }
    }

    // Cables laterales.
    target.strokeStyle = '#080a0e';
    target.lineWidth = 5;
    target.beginPath();
    target.moveTo(80, 300);
    target.bezierCurveTo(40, 322, 70, 350, 28, 360);
    target.stroke();
    target.beginPath();
    target.moveTo(588, 300);
    target.bezierCurveTo(618, 320, 600, 344, 630, 356);
    target.stroke();

    target.restore();
  }

  function ctxGradientMetal(
    target: CanvasRenderingContext2D,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): void {
    const metal = target.createLinearGradient(x0, y0, x1, y1);
    metal.addColorStop(0, '#3d444e');
    metal.addColorStop(0.4, '#20252d');
    metal.addColorStop(0.75, '#11151b');
    metal.addColorStop(1, '#2a3039');
    target.fillStyle = metal;
  }

  /** Garra gigantesca, siempre con el mismo diseño. */
  function drawGarlandHand(
    tipX: number,
    tipY: number,
    scale: number,
    alpha: number,
    curl: number,
    shadowAlpha: number
  ): void {
    if (alpha <= 0.001) return;

    // Sombra proyectada por las garras sobre la consola.
    if (shadowAlpha > 0.01) {
      target.save();
      target.globalAlpha = shadowAlpha;
      target.filter = 'blur(3px)';
      target.strokeStyle = 'rgba(0, 0, 0, 0.55)';
      target.lineWidth = 5;
      for (let i = 0; i < 3; i += 1) {
        target.beginPath();
        target.moveTo(tipX + i * 9, tipY + 18);
        target.quadraticCurveTo(tipX + 42 + i * 18, tipY + 30, tipX + 84 + i * 26, tipY + 46 + i * 4);
        target.stroke();
      }
      target.globalAlpha = shadowAlpha * 0.4;
      target.fillStyle = 'rgba(0, 0, 0, 0.6)';
      target.beginPath();
      target.ellipse(tipX + 34, tipY + 30, 78, 20, 0.08, 0, Math.PI * 2);
      target.fill();
      target.restore();
    }

    target.save();
    target.globalAlpha = alpha;
    target.translate(tipX, tipY);
    target.rotate(-0.05);
    target.scale(scale, scale);

    const fillShape = (
      points: Array<[number, number]>,
      fill: string | CanvasGradient
    ): void => {
      if (!points.length) return;
      target.beginPath();
      target.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) {
        target.lineTo(points[i][0], points[i][1]);
      }
      target.closePath();
      target.fillStyle = fill;
      target.fill();
    };

    /**
     * Dedo reptiliano con volumen: contorno oscuro, cuerpo cilíndrico,
     * nudillo abultado, arrugas y brillo húmedo.
     */
    const drawDigit = (
      ax: number,
      ay: number,
      cx: number,
      cy: number,
      bx: number,
      by: number,
      w0: number,
      w1: number
    ): void => {
      const steps = 18;
      const left: Array<[number, number]> = [];
      const right: Array<[number, number]> = [];
      const centers: Array<[number, number, number, number, number]> = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * ax + 2 * mt * t * cx + t * t * bx;
        const y = mt * mt * ay + 2 * mt * t * cy + t * t * by;
        const dx = 2 * mt * (cx - ax) + 2 * t * (bx - cx);
        const dy = 2 * mt * (cy - ay) + 2 * t * (by - cy);
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const w = (w0 * (1 - t) + w1 * t) * (1 + Math.sin(Math.PI * t) * 0.14);
        centers.push([x, y, w, nx, ny]);
        left.push([x + nx * w * 0.5, y + ny * w * 0.5]);
        right.push([x - nx * w * 0.5, y - ny * w * 0.5]);
      }
      // Oclusión entre dedos.
      target.strokeStyle = 'rgba(4, 9, 4, 0.44)';
      target.lineWidth = w0 + 3.4;
      target.lineCap = 'round';
      target.beginPath();
      target.moveTo(ax, ay);
      target.quadraticCurveTo(cx, cy, bx, by);
      target.stroke();
      // Cuerpo con sombreado de cilindro.
      const bodyGrad = target.createLinearGradient(
        left[0][0],
        left[0][1],
        right[0][0],
        right[0][1]
      );
      bodyGrad.addColorStop(0, '#4a6b3a');
      bodyGrad.addColorStop(0.2, '#3c5a31');
      bodyGrad.addColorStop(0.48, '#2e4728');
      bodyGrad.addColorStop(0.78, '#1e301c');
      bodyGrad.addColorStop(1, '#111c10');
      fillShape(left.concat(right.reverse()), bodyGrad);
      // Brillo longitudinal húmedo.
      const hi = centers[Math.floor(steps * 0.42)];
      const hiA = centers[Math.floor(steps * 0.1)];
      const hiB = centers[Math.floor(steps * 0.86)];
      target.strokeStyle = 'rgba(190, 220, 156, 0.17)';
      target.lineWidth = Math.max(1.4, w0 * 0.2);
      target.lineCap = 'round';
      target.beginPath();
      target.moveTo(
        hiA[0] + hiA[3] * hiA[2] * 0.2,
        hiA[1] + hiA[4] * hiA[2] * 0.2
      );
      target.quadraticCurveTo(
        hi[0] + hi[3] * hi[2] * 0.2,
        hi[1] + hi[4] * hi[2] * 0.2,
        hiB[0] + hiB[3] * hiB[2] * 0.2,
        hiB[1] + hiB[4] * hiB[2] * 0.2
      );
      target.stroke();
      // Arruga del nudillo.
      const joint = centers[Math.floor(steps * 0.54)];
      target.strokeStyle = 'rgba(9, 16, 8, 0.42)';
      target.lineWidth = 1.1;
      target.beginPath();
      target.moveTo(
        joint[0] + joint[3] * joint[2] * 0.42,
        joint[1] + joint[4] * joint[2] * 0.42
      );
      target.lineTo(
        joint[0] - joint[3] * joint[2] * 0.42,
        joint[1] - joint[4] * joint[2] * 0.42
      );
      target.stroke();
      target.strokeStyle = 'rgba(168, 200, 136, 0.12)';
      target.beginPath();
      target.moveTo(
        joint[0] + joint[3] * joint[2] * 0.34 + 1.5,
        joint[1] + joint[4] * joint[2] * 0.34 + 1.5
      );
      target.lineTo(
        joint[0] - joint[3] * joint[2] * 0.34 + 1.5,
        joint[1] - joint[4] * joint[2] * 0.34 + 1.5
      );
      target.stroke();
      // Escamas dispersas.
      for (let s = 0; s < 3; s += 1) {
        const c = centers[Math.floor(steps * (0.24 + s * 0.2))];
        const ang = Math.atan2(c[4], c[3]);
        target.beginPath();
        target.ellipse(
          c[0] + (s % 2 === 0 ? 1 : -1) * c[2] * 0.14,
          c[1],
          c[2] * 0.22,
          c[2] * 0.13,
          ang,
          0,
          Math.PI * 2
        );
        target.fillStyle = 'rgba(150, 182, 116, 0.16)';
        target.fill();
        target.beginPath();
        target.ellipse(
          c[0] + (s % 2 === 0 ? 1 : -1) * c[2] * 0.14,
          c[1] - c[2] * 0.06,
          c[2] * 0.1,
          c[2] * 0.06,
          ang,
          0,
          Math.PI * 2
        );
        target.fillStyle = 'rgba(14, 24, 12, 0.3)';
        target.fill();
      }
    };

    // Antebrazo: masa cilíndrica que entra desde arriba.
    fillShape(
      [
        [-42, -96],
        [46, -104],
        [104, -330],
        [8, -340],
      ],
      '#0e160d'
    );
    const foreGrad = target.createLinearGradient(-40, 0, 104, 0);
    foreGrad.addColorStop(0, '#172414');
    foreGrad.addColorStop(0.22, '#2a4025');
    foreGrad.addColorStop(0.46, '#3d5d33');
    foreGrad.addColorStop(0.68, '#2b4227');
    foreGrad.addColorStop(0.88, '#182516');
    foreGrad.addColorStop(1, '#0e160d');
    fillShape(
      [
        [-36, -98],
        [38, -104],
        [92, -328],
        [26, -334],
      ],
      foreGrad
    );
    // Arista superior iluminada y tendones bajo la piel.
    fillShape(
      [
        [12, -110],
        [24, -112],
        [76, -323],
        [64, -326],
      ],
      'rgba(158, 194, 126, 0.13)'
    );
    target.strokeStyle = 'rgba(11, 19, 9, 0.34)';
    target.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      target.beginPath();
      target.moveTo(-16 + i * 13, -114);
      target.quadraticCurveTo(-2 + i * 14, -212, 32 + i * 12, -318);
      target.stroke();
    }
    // Placas de escamas del antebrazo, con profundidad.
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        const x = -26 + col * 16 + row * 5.4 + (hash2(row, col) - 0.5) * 4;
        const y = -118 - row * 25 - col * 2 + (hash2(col, row) - 0.5) * 3;
        const edge = col === 0 || col === 4 ? 0.5 : 1;
        scalePlate(
          target,
          x,
          y,
          14.5 - row * 0.3,
          10.5 - row * 0.2,
          row % 2 === 0 ? '#243a20' : '#1b2c19',
          `rgba(132, 168, 104, ${0.08 + 0.14 * edge})`
        );
      }
    }
    // Humedad del antebrazo.
    target.fillStyle = 'rgba(198, 226, 168, 0.13)';
    for (let i = 0; i < 4; i += 1) {
      target.beginPath();
      target.ellipse(
        34 + hash2(i, 31) * 34,
        -300 + i * 60,
        4 + hash2(i, 33) * 4,
        1.6,
        -0.1,
        0,
        Math.PI * 2
      );
      target.fill();
    }

    // Placas de armadura sobre el dorso de la mano.
    fillShape(
      [
        [-54, -124],
        [52, -132],
        [44, -82],
        [-44, -76],
      ],
      '#0d1015'
    );
    const armorGrad = target.createLinearGradient(-46, -126, 44, -86);
    armorGrad.addColorStop(0, '#1a1f27');
    armorGrad.addColorStop(0.4, '#3a424d');
    armorGrad.addColorStop(0.62, '#2b313a');
    armorGrad.addColorStop(1, '#161a20');
    fillShape(
      [
        [-46, -120],
        [44, -126],
        [38, -92],
        [-38, -86],
      ],
      armorGrad
    );
    for (let i = 0; i < 3; i += 1) {
      px(target, -26 + i * 24, -116, 14, 3, 'rgba(88, 98, 112, 0.35)');
      px(target, -22 + i * 24, -108, 2, 2, 'rgba(206, 216, 228, 0.35)');
    }
    target.strokeStyle = 'rgba(230, 238, 246, 0.16)';
    target.lineWidth = 1;
    target.beginPath();
    target.moveTo(-44, -118);
    target.lineTo(42, -123);
    target.stroke();
    // Reflejo rojo de la consola en el borde metálico.
    target.strokeStyle = 'rgba(255, 112, 76, 0.28)';
    target.beginPath();
    target.moveTo(-52, -122);
    target.lineTo(-46, -80);
    target.stroke();

    // Palma carnosa, con nudillos.
    const palmGrad = target.createRadialGradient(-12, -74, 6, 0, -64, 82);
    palmGrad.addColorStop(0, '#476637');
    palmGrad.addColorStop(0.5, '#334e2c');
    palmGrad.addColorStop(0.82, '#23381f');
    palmGrad.addColorStop(1, '#141f12');
    fillShape(
      [
        [-52, -104],
        [50, -110],
        [44, -42],
        [-8, -30],
        [-48, -52],
      ],
      palmGrad
    );
    // Escamas de la palma.
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        scalePlate(
          target,
          -32 + col * 24 + (row % 2) * 7,
          -94 + row * 17,
          13,
          8,
          row % 2 === 0 ? '#2c4526' : '#263d22',
          'rgba(138, 172, 110, 0.1)'
        );
      }
    }
    for (let i = 0; i < 12; i += 1) {
      target.beginPath();
      target.ellipse(
        -44 + (i % 4) * 24 + Math.floor(i / 4) * 6,
        -88 + Math.floor(i / 4) * 15,
        5,
        3,
        -0.15,
        0,
        Math.PI * 2
      );
      target.fillStyle = 'rgba(126, 158, 100, 0.07)';
      target.fill();
    }
    // Nudillos.
    for (let i = 0; i < 3; i += 1) {
      target.beginPath();
      target.ellipse(10 + i * 14, -68 - (i % 2) * 5, 12, 8, -0.2, 0, Math.PI * 2);
      target.fillStyle = '#3a5830';
      target.fill();
      target.beginPath();
      target.ellipse(9 + i * 14, -71 - (i % 2) * 5, 7, 3.4, -0.25, 0, Math.PI * 2);
      target.fillStyle = 'rgba(176, 206, 142, 0.16)';
      target.fill();
    }
    // Pliegue de la palma.
    target.strokeStyle = 'rgba(12, 21, 10, 0.4)';
    target.lineWidth = 1.3;
    target.beginPath();
    target.moveTo(-40, -58);
    target.quadraticCurveTo(-6, -48, 30, -60);
    target.stroke();

    // Dedos curvados: meñique, anular y medio.
    const curled: Array<[number, number, number, number, number, number, number, number]> = [
      [48, -88, 60, -112, 62, -58, 15, 8],
      [34, -98, 46, -124, 48, -46, 17, 9],
      [12, -102, 23, -130, 26, -34, 19, 11],
    ];
    for (let i = 0; i < curled.length; i += 1) {
      const [ax, ay, cx, cy, bx, by, w0, w1] = curled[i];
      drawDigit(ax, ay, cx, cy, bx, by, w0, w1);
      // Nudillo visible en la base.
      target.beginPath();
      target.ellipse(ax, ay, w0 * 0.5, w0 * 0.32, 0.1, 0, Math.PI * 2);
      target.fillStyle = 'rgba(58, 86, 46, 0.65)';
      target.fill();
      target.beginPath();
      target.ellipse(ax - 1, ay - 2, w0 * 0.3, w0 * 0.16, 0.12, 0, Math.PI * 2);
      target.fillStyle = 'rgba(178, 208, 144, 0.14)';
      target.fill();
      // Garra.
      target.beginPath();
      target.ellipse(bx, by + 1, 4.6 - i * 0.4, 2.8, 0.2, 0, Math.PI * 2);
      target.fillStyle = '#5f4b30';
      target.fill();
      boneClaw(target, bx, by + 2, 13 - i, 7.5, -3 - i, BONE, '#6b573a');
    }

    // Dedo índice extendido: yema apoyada sobre el botón.
    drawDigit(-32, -52, -31, -26, -9, -5, 20, 12);
    // Nudillo que funde la base del dedo con la palma.
    const indexKnuckle = target.createRadialGradient(-30, -54, 1, -31, -50, 12);
    indexKnuckle.addColorStop(0, '#4a6a3c');
    indexKnuckle.addColorStop(0.6, '#33502b');
    indexKnuckle.addColorStop(1, 'rgba(35, 54, 28, 0)');
    target.beginPath();
    target.ellipse(-31, -51, 12, 8, 0.05, 0, Math.PI * 2);
    target.fillStyle = indexKnuckle;
    target.fill();
    target.beginPath();
    target.ellipse(-33, -55, 5.5, 2.8, 0.05, 0, Math.PI * 2);
    target.fillStyle = 'rgba(176, 206, 142, 0.12)';
    target.fill();
    target.beginPath();
    target.ellipse(-9, -5, 7, 4.4, 0.1, 0, Math.PI * 2);
    target.fillStyle = 'rgba(74, 104, 56, 0.8)';
    target.fill();
    target.beginPath();
    target.ellipse(-10, -7, 4.4, 2.2, 0.1, 0, Math.PI * 2);
    target.fillStyle = 'rgba(184, 212, 148, 0.2)';
    target.fill();
    target.beginPath();
    target.ellipse(-7, 0, 5.4, 3.2, 0.1, 0, Math.PI * 2);
    target.fillStyle = '#5f4b30';
    target.fill();
    boneClaw(target, -6, 0, 17, 9.5, -1.5, BONE, '#6b573a');

    // Pulgar grueso con garra grande.
    drawDigit(-48, -84, -80, -66, -86, -32 - curl * 8, 26, 17);
    target.beginPath();
    target.ellipse(-47, -82, 13, 9, 0.5, 0, Math.PI * 2);
    target.fillStyle = '#2f4a29';
    target.fill();
    target.beginPath();
    target.ellipse(-50, -86, 6, 3.4, 0.5, 0, Math.PI * 2);
    target.fillStyle = 'rgba(176, 206, 142, 0.12)';
    target.fill();
    target.beginPath();
    target.ellipse(-86, -34 - curl * 8, 6.6, 4.2, 0.3, 0, Math.PI * 2);
    target.fillStyle = '#5f4b30';
    target.fill();
    boneClaw(target, -85, -32 - curl * 8, 17, 10.5, -8, BONE, '#6b573a');

    // Luz roja de borde en el lado de la máquina: curvas suaves, no aristas.
    target.save();
    target.filter = 'blur(1.1px)';
    target.strokeStyle = 'rgba(255, 96, 64, 0.22)';
    target.lineWidth = 2.4;
    target.lineCap = 'round';
    target.beginPath();
    target.moveTo(-54, -108);
    target.quadraticCurveTo(-56, -78, -46, -56);
    target.stroke();
    target.strokeStyle = 'rgba(255, 128, 88, 0.18)';
    target.lineWidth = 2;
    target.beginPath();
    target.moveTo(-62, -86);
    target.quadraticCurveTo(-98, -70, -100, -36);
    target.stroke();
    target.beginPath();
    target.moveTo(-35, -66);
    target.quadraticCurveTo(-35, -36, -23, -9);
    target.stroke();
    target.strokeStyle = 'rgba(255, 110, 76, 0.12)';
    target.lineWidth = 3;
    target.beginPath();
    target.moveTo(-30, -120);
    target.quadraticCurveTo(-8, -220, 26, -320);
    target.stroke();
    target.restore();
    // Contraluz frío del otro lado.
    target.strokeStyle = 'rgba(120, 170, 210, 0.18)';
    target.beginPath();
    target.moveTo(46, -128);
    target.lineTo(90, -300);
    target.stroke();

    // Resplandor rojo de la consola sobre la palma.
    target.save();
    target.globalCompositeOperation = 'lighter';
    glow(target, -2, 18, 110, 'rgba(255, 84, 50, 0.6)', 0.08 + curl * 0.2);
    target.restore();

    target.restore();
  }

  function drawSanctum(time: number): void {
    // Negro inicial, la máquina respira antes de que exista imagen.
    px(target, 0, 0, W, H, '#000000');
    const reveal = smoothstep(0.9, 2.6, time);
    const press = smoothstep(17.9, 18.1, time);
    const charge = smoothstep(18.1, 21.7, time);
    const burst = smoothstep(21.5, 23.6, time);

    const shakeX = shakeAt(time, 18, 6.5, 84) + shakeAt(time, 22.3, 3, 50);
    const shakeY = shakeAt(time, 18.4, 4.5, 77);

    const zoom = 0.96 + smoothstep(2.6, 15.5, time) * 0.1 + charge * 0.04;
    const focusX = lerp(330, 356, smoothstep(2.6, 15.5, time));
    const focusY = lerp(222, 258, smoothstep(2.6, 15.5, time));

    target.save();
    target.translate(shakeX, shakeY);
    target.translate(W / 2, H / 2);
    target.scale(zoom, zoom);
    target.translate(-focusX, -focusY);
    drawRoom(time, reveal);
    drawConsole(time, reveal, press, charge);
    target.restore();

    // Garra: entra desde arriba, se detiene sobre el botón y presiona.
    let tipY = lerp(-120, 82, smoothstep(5.7, 8.6, time));
    tipY = lerp(tipY, 188, smoothstep(8.6, 12.7, time));
    tipY = lerp(tipY, 208, smoothstep(12.7, 13.6, time));
    tipY = lerp(tipY, 262, smoothstep(13.6, 17.95, time));
    let tipX = lerp(466, 404, smoothstep(5.7, 9.8, time));
    tipX = lerp(tipX, 358, smoothstep(9.8, 15.2, time));
    const handAlpha =
      smoothstep(5.6, 6.7, time) * (1 - smoothstep(22.6, 23.8, time));
    const hover = clamp01((262 - tipY) / 300);
    drawGarlandHand(
      tipX + shakeX * 0.6,
      tipY + shakeY * 0.6,
      1.32,
      handAlpha,
      press,
      handAlpha * (1 - hover) * 0.9 + handAlpha * 0.2
    );

    // Energía: aro que crece y columna de luz con volumen.
    if (charge > 0.01) {
      const cx = 356;
      const cy = 278;
      target.save();
      target.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i += 1) {
        const r = 26 + charge * (120 + i * 58);
        target.filter = 'blur(1.2px)';
        target.strokeStyle = `rgba(255, ${70 + i * 18}, 48, ${0.32 * (1 - charge * 0.6)})`;
        target.lineWidth = 2 - i * 0.4;
        target.beginPath();
        target.ellipse(cx, cy, r * 1.6, r * 0.8, -0.04, 0, Math.PI * 2);
        target.stroke();
        target.filter = 'none';
      }
      // Cono de energía con volumen: capas suaves que desbordan el encuadre.
      const cone = (halfTop: number, alpha: number, blurPx: number) => {
        target.filter = `blur(${blurPx}px)`;
        const layer = target.createLinearGradient(cx, cy, cx, -20);
        layer.addColorStop(0, `rgba(255, 224, 196, ${alpha})`);
        layer.addColorStop(0.32, `rgba(255, 118, 68, ${alpha * 0.62})`);
        layer.addColorStop(1, 'rgba(255, 70, 40, 0)');
        target.fillStyle = layer;
        target.beginPath();
        target.moveTo(cx - 14, cy);
        target.lineTo(cx - halfTop, -20);
        target.lineTo(cx + halfTop, -20);
        target.lineTo(cx + 14, cy);
        target.closePath();
        target.fill();
        target.filter = 'none';
      };
      cone(150 + charge * 62, 0.1 * charge, 9);
      cone(78 + charge * 30, 0.14 * charge, 4.5);
      cone(34 + charge * 10, 0.2 * charge, 1.8);
      // Núcleo y chispas.
      target.fillStyle = `rgba(255, 244, 230, ${0.34 * charge})`;
      target.fillRect(cx - 1.5, 0, 3, cy);
      for (let i = 0; i < 34; i += 1) {
        const a = hash2(i, 3) * Math.PI * 2;
        const speed = 0.4 + hash2(i, 7);
        const pxX = cx + Math.cos(a) * (30 + charge * 190 * speed);
        const pxY = cy - charge * 270 * speed + Math.sin(time * 2 + i) * 8;
        target.fillStyle = `rgba(255, ${140 + (i % 3) * 30}, 100, ${0.5 * charge})`;
        target.fillRect(pxX, pxY, 1, 1 + (i % 2));
      }
      target.restore();
      glow(target, cx, cy - 20, 80 + charge * 130, 'rgba(255, 72, 40, 0.55)', charge);
    }

    if (burst > 0.01) {
      glow(target, W / 2, H * 0.48, 360, 'rgba(255, 150, 110, 0.75)', burst);
      px(target, 0, 0, W, H, `rgba(255, 238, 226, ${smoothstep(22.6, 23.9, time) * 0.95})`);
    }

    // Polvo suspendido frente a la cámara.
    drawMotes(time, 0.25 + 0.35 * reveal, 'rgba(255, 180, 140, 0.45)');

    // Viñeta lateral roja.
    const vignette = target.createRadialGradient(W * 0.55, H * 0.55, 60, W * 0.55, H * 0.55, 390);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.72)');
    target.fillStyle = vignette;
    target.fillRect(0, 0, W, H);
  }

  /* ------------------------------------------------------------------ */
  /* ESCENA 3 · SUPER KING KOOPA                                         */
  /* ------------------------------------------------------------------ */

  function drawKoopa(
    time: number,
    alpha: number,
    mouth: number,
    headLift: number,
    armSpread: number,
    eyeOpen: number
  ): void {
    target.save();
    target.globalAlpha = alpha;

    const fillShape = (
      points: Array<[number, number]>,
      fill: string | CanvasGradient
    ): void => {
      if (!points.length) return;
      target.beginPath();
      target.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) {
        target.lineTo(points[i][0], points[i][1]);
      }
      target.closePath();
      target.fillStyle = fill;
      target.fill();
    };
    const shade = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      stops: Array<[number, string]>
    ): CanvasGradient => {
      const g = target.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([p, c]) => g.addColorStop(p, c));
      return g;
    };

    // Capa desgarrada.
    poly(
      target,
      [
        [-92, -228],
        [-52, -252],
        [46, -254],
        [98, -228],
        [118, -26],
        [76, 18],
        [50, -48],
        [8, 6],
        [-30, -40],
        [-72, 26],
        [-104, -14],
      ],
      '#100d16'
    );
    fillShape(
      [
        [-72, -226],
        [72, -230],
        [86, -54],
        [42, -80],
        [8, -34],
        [-32, -66],
        [-66, -20],
      ],
      shade(-72, -104, 86, -104, [
        [0, '#120f18'],
        [0.45, '#1e1728'],
        [0.7, '#171220'],
        [1, '#0d0a12'],
      ])
    );
    // Pliegues de la tela.
    target.strokeStyle = 'rgba(84, 70, 104, 0.18)';
    target.lineWidth = 1.2;
    for (let i = 0; i < 3; i += 1) {
      target.beginPath();
      target.moveTo(-58 + i * 44, -206);
      target.quadraticCurveTo(-40 + i * 40, -120, -58 + i * 36, -34 + (i % 2) * 16);
      target.stroke();
    }

    // Caparazón con púas.
    target.beginPath();
    target.ellipse(4, -168, 104, 116, 0, 0, Math.PI * 2);
    const shell = target.createRadialGradient(-16, -196, 12, 4, -164, 128);
    shell.addColorStop(0, '#26382a');
    shell.addColorStop(0.55, '#14251b');
    shell.addColorStop(1, '#0a140f');
    target.fillStyle = shell;
    target.fill();
    target.strokeStyle = 'rgba(120, 150, 106, 0.2)';
    target.lineWidth = 2;
    target.stroke();
    // Placas del caparazón y brillo húmedo.
    target.save();
    target.beginPath();
    target.ellipse(4, -168, 100, 112, 0, 0, Math.PI * 2);
    target.clip();
    for (let ring = 0; ring < 3; ring += 1) {
      target.beginPath();
      target.ellipse(
        4,
        -168,
        42 + ring * 26,
        46 + ring * 28,
        0,
        -Math.PI * 0.92,
        Math.PI * 0.92
      );
      target.strokeStyle = `rgba(146, 178, 128, ${0.13 - ring * 0.03})`;
      target.lineWidth = 1.2;
      target.stroke();
    }
    for (let i = 0; i < 12; i += 1) {
      const a = -Math.PI * 0.9 + (i / 11) * Math.PI * 1.8;
      target.beginPath();
      target.moveTo(4 + Math.cos(a) * 26, -168 + Math.sin(a) * 30);
      target.lineTo(4 + Math.cos(a) * 100, -168 + Math.sin(a) * 112);
      target.strokeStyle = 'rgba(10, 18, 12, 0.28)';
      target.lineWidth = 1;
      target.stroke();
    }
    const shellSheen = target.createRadialGradient(-34, -216, 2, -34, -216, 62);
    shellSheen.addColorStop(0, 'rgba(176, 208, 158, 0.16)');
    shellSheen.addColorStop(1, 'rgba(176, 208, 158, 0)');
    target.fillStyle = shellSheen;
    target.fillRect(-96, -280, 120, 120);
    target.restore();
    // Borde iluminado: rojo de la máquina y frío del relámpago.
    target.strokeStyle = 'rgba(255, 104, 72, 0.2)';
    target.lineWidth = 1.6;
    target.beginPath();
    target.ellipse(4, -168, 101, 113, 0, Math.PI * 0.62, Math.PI * 1.08);
    target.stroke();
    target.strokeStyle = 'rgba(150, 176, 204, 0.16)';
    target.beginPath();
    target.ellipse(4, -168, 101, 113, 0, -Math.PI * 0.34, Math.PI * 0.1);
    target.stroke();

    for (let i = 0; i < 9; i += 1) {
      const a = -Math.PI * 0.92 + (i / 8) * Math.PI * 1.84;
      const sx = 4 + Math.cos(a) * 98;
      const sy = -168 + Math.sin(a) * 110;
      const spikeTip: [number, number] = [sx + Math.cos(a) * 22, sy - 3];
      fillShape(
        [
          [sx, sy - 10],
          spikeTip,
          [sx + Math.cos(a) * 4, sy + 10],
        ],
        shade(sx, sy - 10, sx + Math.cos(a) * 22, sy + 10, [
          [0, '#566b58'],
          [0.35, '#2e3f34'],
          [1, '#151f1a'],
        ])
      );
      poly(
        target,
        [
          [sx + Math.cos(a) * 2, sy - 6],
          [sx + Math.cos(a) * 13, sy - 4],
          [sx + Math.cos(a) * 3, sy + 2],
        ],
        'rgba(156, 180, 150, 0.16)'
      );
      target.beginPath();
      target.moveTo(sx, sy - 9);
      target.lineTo(spikeTip[0], spikeTip[1]);
      target.strokeStyle = 'rgba(214, 230, 210, 0.16)';
      target.lineWidth = 0.8;
      target.stroke();
    }

    // Piernas musculosas: muslo, rodilla, pantorrilla y pie con garras.
    for (const side of [-1, 1] as const) {
      const legStops: Array<[number, string]> =
        side < 0
          ? [
              [0, '#4f7042'],
              [0.22, '#3f5d36'],
              [0.55, '#2c4527'],
              [0.8, '#1c2e1a'],
              [1, '#0e170d'],
            ]
          : [
              [0, '#0e170d'],
              [0.2, '#1c2e1a'],
              [0.45, '#2c4527'],
              [0.78, '#3f5d36'],
              [1, '#4f7042'],
            ];
      const legGrad = target.createLinearGradient(side * 24, 0, side * 70, 0);
      legStops.forEach(([stop, color]) => legGrad.addColorStop(stop, color));
      // Contorno oscuro del muslo y la pantorrilla.
      target.strokeStyle = '#0c140b';
      target.lineWidth = 44;
      target.lineCap = 'round';
      target.beginPath();
      target.moveTo(side * 45, -110);
      target.quadraticCurveTo(side * 51, -88, side * 48, -66);
      target.stroke();
      target.lineWidth = 36;
      target.beginPath();
      target.moveTo(side * 48, -68);
      target.quadraticCurveTo(side * 47, -40, side * 43, -16);
      target.stroke();
      // Volumen del muslo.
      target.strokeStyle = legGrad;
      target.lineWidth = 38;
      target.beginPath();
      target.moveTo(side * 45, -110);
      target.quadraticCurveTo(side * 51, -88, side * 48, -66);
      target.stroke();
      // Volumen de la pantorrilla, más estrecho.
      target.lineWidth = 30;
      target.beginPath();
      target.moveTo(side * 48, -70);
      target.quadraticCurveTo(side * 47, -40, side * 43, -16);
      target.stroke();
      // Rodilla y tendón.
      const knee = target.createRadialGradient(
        side * 44,
        -72,
        1,
        side * 46,
        -67,
        17
      );
      knee.addColorStop(0, 'rgba(100, 132, 74, 0.4)');
      knee.addColorStop(1, 'rgba(15, 24, 14, 0)');
      target.fillStyle = knee;
      target.beginPath();
      target.ellipse(side * 46, -69, 17, 13, 0.1, 0, Math.PI * 2);
      target.fill();
      target.strokeStyle = 'rgba(12, 22, 12, 0.4)';
      target.lineWidth = 1.2;
      target.beginPath();
      target.moveTo(side * 33, -70);
      target.quadraticCurveTo(side * 46, -63, side * 58, -71);
      target.stroke();
      target.strokeStyle = 'rgba(182, 212, 146, 0.14)';
      target.lineWidth = 2.4;
      target.beginPath();
      target.moveTo(side * 35, -100);
      target.quadraticCurveTo(side * 38, -84, side * 36, -70);
      target.stroke();
      target.beginPath();
      target.moveTo(side * 35, -58);
      target.quadraticCurveTo(side * 37, -38, side * 34, -20);
      target.stroke();
      // Escamas de la pierna.
      for (let i = 0; i < 7; i += 1) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        scalePlate(
          target,
          side * (32 + col * 9 + row * 2),
          -104 + row * 22 + col * 2,
          11,
          7,
          side < 0 ? '#2c4527' : '#1e301b',
          'rgba(150, 184, 118, 0.09)'
        );
      }
      // Pie y dedos.
      const footGrad = target.createLinearGradient(side * 30, -8, side * 66, 0);
      footGrad.addColorStop(0, side < 0 ? '#47663b' : '#16241a');
      footGrad.addColorStop(0.55, '#2c4527');
      footGrad.addColorStop(1, side < 0 ? '#16241a' : '#3c5a33');
      target.beginPath();
      target.ellipse(side * 44, -3, 24, 11, -0.04, 0, Math.PI * 2);
      target.fillStyle = '#0c140b';
      target.fill();
      target.beginPath();
      target.ellipse(side * 44, -4, 21, 9, -0.04, 0, Math.PI * 2);
      target.fillStyle = footGrad;
      target.fill();
      target.strokeStyle = 'rgba(188, 218, 152, 0.14)';
      target.lineWidth = 1.4;
      target.beginPath();
      target.moveTo(side * 30, -9);
      target.quadraticCurveTo(side * 44, -13, side * 58, -8);
      target.stroke();
      for (let i = 0; i < 3; i += 1) {
        const toeX = side * (32 + i * 12);
        target.beginPath();
        target.ellipse(toeX, -1, 6.5, 4.2, 0.12, 0, Math.PI * 2);
        target.fillStyle = '#4a6338';
        target.fill();
        target.beginPath();
        target.ellipse(toeX - 1, -3, 4, 1.8, 0.12, 0, Math.PI * 2);
        target.fillStyle = 'rgba(196, 222, 158, 0.16)';
        target.fill();
        target.beginPath();
        target.ellipse(toeX, 1, 5, 3, 0.12, 0, Math.PI * 2);
        target.fillStyle = '#5a472e';
        target.fill();
        boneClaw(target, toeX, 1, 13, 7, side * -2, BONE, '#6b573a');
      }
    }

    // Torso.
    fillShape(
      [
        [-66, -216],
        [66, -210],
        [56, -108],
        [-54, -104],
      ],
      shade(-66, 0, 66, 0, [
        [0, '#20351f'],
        [0.22, '#33512c'],
        [0.5, '#3c5c32'],
        [0.78, '#2c4527'],
        [1, '#172416'],
      ])
    );
    // Pectorales y sombra bajo el caparazón.
    target.fillStyle = 'rgba(16, 28, 14, 0.45)';
    target.beginPath();
    target.ellipse(0, -206, 56, 16, 0, 0, Math.PI);
    target.fill();
    target.strokeStyle = 'rgba(190, 220, 158, 0.1)';
    target.lineWidth = 1.4;
    target.beginPath();
    target.moveTo(-54, -196);
    target.quadraticCurveTo(-30, -186, -4, -196);
    target.stroke();
    target.beginPath();
    target.moveTo(8, -196);
    target.quadraticCurveTo(34, -186, 54, -194);
    target.stroke();
    // Placas ventrales: escudos que se solapan, con brillo y sombra de unión.
    const bellyBand = target.createLinearGradient(-34, 0, 34, 0);
    bellyBand.addColorStop(0, 'rgba(26, 18, 8, 0.55)');
    bellyBand.addColorStop(0.5, 'rgba(72, 52, 24, 0.5)');
    bellyBand.addColorStop(1, 'rgba(20, 14, 6, 0.55)');
    target.fillStyle = bellyBand;
    target.beginPath();
    target.moveTo(-31, -171);
    target.quadraticCurveTo(0, -177, 31, -171);
    target.lineTo(25, -102);
    target.quadraticCurveTo(0, -96, -25, -102);
    target.closePath();
    target.fill();
    for (let i = 0; i < 6; i += 1) {
      const y = -166 + i * 11;
      const rx = 33 - Math.abs(i - 2.5) * 2.4;
      const plateGrad = target.createLinearGradient(-rx, y - 8, rx, y + 8);
      plateGrad.addColorStop(0, i % 2 === 0 ? '#6d532c' : '#614a28');
      plateGrad.addColorStop(0.24, i % 2 === 0 ? '#b08a4a' : '#9c7a3e');
      plateGrad.addColorStop(0.62, i % 2 === 0 ? '#8a6a37' : '#7a5b2e');
      plateGrad.addColorStop(1, i % 2 === 0 ? '#4e3a1c' : '#42311a');
      target.beginPath();
      target.ellipse(0, y, rx, 6.6, 0, 0, Math.PI * 2);
      target.fillStyle = plateGrad;
      target.fill();
      target.strokeStyle = 'rgba(40, 26, 10, 0.5)';
      target.lineWidth = 0.9;
      target.stroke();
      target.beginPath();
      target.ellipse(-rx * 0.24, y - 3.2, rx * 0.42, 1.4, -0.06, 0, Math.PI * 2);
      target.fillStyle = 'rgba(246, 222, 168, 0.2)';
      target.fill();
      // Sombra de la placa inferior sobre la siguiente.
      target.beginPath();
      target.ellipse(0, y + 5.4, rx * 0.94, 2.2, 0, 0, Math.PI);
      target.fillStyle = 'rgba(28, 18, 8, 0.28)';
      target.fill();
    }
    // Escamas del pecho y hombros.
    for (let i = 0; i < 22; i += 1) {
      const x = -56 + hash2(i, 51) * 112;
      const y = -206 + hash2(i, 53) * 48;
      scalePlate(target, x, y, 7, 4.6, SCALE_MID, 'rgba(140, 172, 110, 0.08)');
    }

    // Hombreras metálicas con púas.
    for (const side of [-1, 1] as const) {
      const sx = side * 66;
      poly(
        target,
        [
          [sx - 20, -222],
          [sx + 24, -228],
          [sx + 30, -196],
          [sx - 14, -188],
        ],
        ARMOR_DARK
      );
      fillShape(
        [
          [sx - 16, -218],
          [sx + 20, -223],
          [sx + 24, -200],
          [sx - 10, -193],
        ],
        shade(sx - 16, -218, sx + 24, -200, [
          [0, '#454d59'],
          [0.28, '#333a44'],
          [0.55, '#232830'],
          [1, '#141820'],
        ])
      );
      // Remaches y filo pulido.
      for (let r = 0; r < 3; r += 1) {
        px(target, sx - 10 + r * 12, -212, 2, 2, 'rgba(198, 208, 220, 0.35)');
      }
      target.strokeStyle = 'rgba(214, 224, 236, 0.28)';
      target.lineWidth = 0.9;
      target.beginPath();
      target.moveTo(sx - 14, -217);
      target.lineTo(sx + 18, -221);
      target.stroke();
      target.strokeStyle = 'rgba(255, 104, 72, 0.22)';
      target.beginPath();
      target.moveTo(sx - 19, -220);
      target.lineTo(sx - 12, -192);
      target.stroke();
      // Púas metálicas.
      fillShape(
        [
          [sx - 4, -224],
          [sx + 2, -244],
          [sx + 12, -222],
        ],
        shade(sx - 4, -224, sx + 12, -244, [
          [0, '#59616e'],
          [0.45, '#3a414b'],
          [1, '#1a1f26'],
        ])
      );
      fillShape(
        [
          [sx + 12, -224],
          [sx + 26, -238],
          [sx + 26, -218],
        ],
        shade(sx + 12, -224, sx + 26, -238, [
          [0, '#4c535f'],
          [0.5, '#333a44'],
          [1, '#181c23'],
        ])
      );
      px(target, sx, -208, 8, 2, 'rgba(186, 196, 210, 0.3)');
    }

    // Brazos y manos con el mismo diseño de garra.
    const armAngle = armSpread * 12;
    for (const side of [-1, 1] as const) {
      target.save();
      target.translate(side * 68, -190);
      target.rotate(side * (0.1 + armSpread * 0.5));
      target.translate(0, armAngle * 0.4);
      // Brazo con volumen: deltoides, bíceps y antebrazo más estrecho.
      target.strokeStyle = '#0e170d';
      target.lineWidth = 36;
      target.lineCap = 'round';
      target.beginPath();
      target.moveTo(0, 0);
      target.quadraticCurveTo(side * 18, 42, side * 12, 82);
      target.stroke();
      const armGrad = target.createLinearGradient(-18, 0, 18, 0);
      armGrad.addColorStop(0, '#456637');
      armGrad.addColorStop(0.28, '#375430');
      armGrad.addColorStop(0.62, '#294225');
      armGrad.addColorStop(1, '#152315');
      target.strokeStyle = armGrad;
      target.lineWidth = 31;
      target.beginPath();
      target.moveTo(0, 0);
      target.quadraticCurveTo(side * 18, 42, side * 12, 72);
      target.stroke();
      // Antebrazo más delgado.
      target.lineWidth = 24;
      target.beginPath();
      target.moveTo(side * 14, 58);
      target.quadraticCurveTo(side * 15, 74, side * 12.5, 86);
      target.stroke();
      // Bíceps y brillo del hombro.
      const bicep = target.createRadialGradient(
        side * 4,
        26,
        2,
        side * 6,
        30,
        20
      );
      bicep.addColorStop(0, 'rgba(122, 156, 92, 0.28)');
      bicep.addColorStop(1, 'rgba(26, 42, 22, 0)');
      target.fillStyle = bicep;
      target.beginPath();
      target.ellipse(side * 5, 28, 19, 17, 0, 0, Math.PI * 2);
      target.fill();
      target.strokeStyle = 'rgba(182, 214, 146, 0.16)';
      target.lineWidth = 3.6;
      target.beginPath();
      target.moveTo(side * -8, 6);
      target.quadraticCurveTo(side * 7, 38, side * 3, 72);
      target.stroke();
      // Codo y pliegue del antebrazo.
      target.strokeStyle = 'rgba(12, 22, 12, 0.42)';
      target.lineWidth = 1.2;
      target.beginPath();
      target.moveTo(side * -11, 48);
      target.quadraticCurveTo(0, 54, side * 12, 48);
      target.stroke();
      target.strokeStyle = 'rgba(160, 194, 126, 0.1)';
      target.beginPath();
      target.moveTo(side * 10, 60);
      target.quadraticCurveTo(side * 12, 72, side * 10, 84);
      target.stroke();
      // Mano: palma carnosa con nudillos y dedos curvados.
      const handGrad = target.createRadialGradient(
        side * 6,
        92,
        2,
        side * 12,
        98,
        23
      );
      handGrad.addColorStop(0, '#4a6b3d');
      handGrad.addColorStop(0.55, '#304b29');
      handGrad.addColorStop(1, '#132010');
      target.fillStyle = handGrad;
      target.beginPath();
      target.ellipse(side * 12, 97, 19, 16, 0, 0, Math.PI * 2);
      target.fill();
      // Dedos: tres cápsulas cortas con garra.
      for (let f = 0; f < 3; f += 1) {
        const fx = side * (3 + f * 8);
        const fy = 104 + Math.abs(f - 1) * 1.6;
        const fingerGrad = target.createLinearGradient(fx - 4, fy, fx + 4, fy + 8);
        fingerGrad.addColorStop(0, '#426034');
        fingerGrad.addColorStop(1, '#1b2b18');
        target.beginPath();
        target.ellipse(fx, fy, 5, 7.5, side * (f - 1) * 0.16, 0, Math.PI * 2);
        target.fillStyle = fingerGrad;
        target.fill();
        target.beginPath();
        target.ellipse(fx - side * 1.5, fy - 2.4, 2.4, 2, 0, 0, Math.PI * 2);
        target.fillStyle = 'rgba(190, 218, 152, 0.16)';
        target.fill();
        target.beginPath();
        target.ellipse(fx, fy + 5.5, 3.8, 2.6, 0, 0, Math.PI * 2);
        target.fillStyle = '#5a472e';
        target.fill();
        boneClaw(target, fx, fy + 6, 13, 6.6, side * (f - 1) * 2, BONE, '#6b573a');
      }
      // Guantelete metálico en tres placas.
      for (let f = 0; f < 3; f += 1) {
        const gx = side * (3 + f * 8);
        const plateGrad = target.createLinearGradient(gx - 6, 82, gx + 6, 93);
        plateGrad.addColorStop(0, '#59626f');
        plateGrad.addColorStop(0.4, '#333a44');
        plateGrad.addColorStop(1, '#171c22');
        target.beginPath();
        target.ellipse(gx, 88.5, 6.6, 5.2, side * (f - 1) * 0.1, 0, Math.PI * 2);
        target.fillStyle = plateGrad;
        target.fill();
        target.strokeStyle = 'rgba(196, 206, 220, 0.22)';
        target.lineWidth = 0.8;
        target.stroke();
      }
      target.beginPath();
      target.ellipse(side * 11, 96, 11, 3.2, 0, 0, Math.PI * 2);
      target.fillStyle = 'rgba(6, 10, 8, 0.35)';
      target.fill();
      target.restore();
    }

    // Cuello y cabeza.
    target.save();
    target.translate(0, -headLift * 8);

    fillShape(
      [
        [-26, -230],
        [26, -232],
        [30, -252],
        [-28, -250],
      ],
      shade(-26, 0, 30, 0, [
        [0, '#1a2b18'],
        [0.5, '#2b4326'],
        [1, '#152213'],
      ])
    );

    // Fondo de la boca: se abre como una garganta al hablar.
    fillShape(
      [
        [-56, -246],
        [30, -248],
        [27, -232 + mouth * 38],
        [-50, -231 + mouth * 38],
      ],
      shade(0, -249, 0, -210, [
        [0, '#0c0403'],
        [0.5, '#2c0b08'],
        [0.85, '#51160f'],
        [1, '#1d0705'],
      ])
    );

    // Mandíbula inferior, articulada sobre la comisura.
    target.save();
    target.translate(6, -238);
    target.rotate(-mouth * 0.58);
    fillShape(
      [
        [-64, -1],
        [-36, -7],
        [8, -6],
        [22, -1],
        [24, 6],
        [13, 13],
        [-16, 15],
        [-44, 12],
        [-62, 5],
      ],
      '#0f1c0e'
    );
    fillShape(
      [
        [-60, 0],
        [-30, -3],
        [18, -2],
        [19, 4],
        [10, 9],
        [-18, 11],
        [-44, 9],
        [-60, 5],
      ],
      shade(-64, 0, 21, 10, [
        [0, '#46683c'],
        [0.4, '#33502c'],
        [0.78, '#233a20'],
        [1, '#101b0f'],
      ])
    );
    // Labio interno: el borde rojo que separa la piel de la garganta.
    target.strokeStyle = 'rgba(104, 36, 28, 0.9)';
    target.lineWidth = 2.6;
    target.beginPath();
    target.moveTo(-58, 0.6);
    target.quadraticCurveTo(-20, -2.6, 18, -1.4);
    target.stroke();
    target.strokeStyle = 'rgba(255, 156, 120, 0.18)';
    target.lineWidth = 1;
    target.beginPath();
    target.moveTo(-56, -1.6);
    target.quadraticCurveTo(-20, -4.8, 17, -3.6);
    target.stroke();
    // Barbilla y labio inferior.
    target.beginPath();
    target.ellipse(-6, 8.5, 20, 4.6, 0, 0, Math.PI * 2);
    target.fillStyle = 'rgba(46, 68, 40, 0.85)';
    target.fill();
    target.strokeStyle = 'rgba(18, 28, 16, 0.55)';
    target.lineWidth = 1.2;
    target.beginPath();
    target.moveTo(-58, 7);
    target.quadraticCurveTo(-6, 13, 18, 5);
    target.stroke();
    target.strokeStyle = 'rgba(176, 208, 144, 0.14)';
    target.lineWidth = 1.6;
    target.beginPath();
    target.moveTo(-52, 2.6);
    target.quadraticCurveTo(-4, 7.6, 16, 2.4);
    target.stroke();
    // Encía y lengua.
    target.beginPath();
    target.ellipse(0, 4, 30, 5, 0, 0, Math.PI * 2);
    target.fillStyle = '#5f201a';
    target.fill();
    target.beginPath();
    target.ellipse(-4, 5, 20, 3, 0, 0, Math.PI * 2);
    target.fillStyle = '#8a3a2c';
    target.fill();
    target.fillStyle = 'rgba(255, 168, 140, 0.18)';
    target.beginPath();
    target.ellipse(-8, 4, 9, 1.4, 0, 0, Math.PI * 2);
    target.fill();
    // Dientes inferiores irregulares.
    for (let i = 0; i < 5; i += 1) {
      const dx = -56 + i * 16;
      const th = 5 + (i % 3) * 1.4;
      fillShape(
        [
          [dx, 1],
          [dx + 5.4, 1],
          [dx + 2.7, 1 - th],
        ],
        `rgba(232, 220, 192, ${0.82 + (i % 2) * 0.1})`
      );
    }
    target.restore();

    // Cráneo y hocico, con volumen y plano de mejilla.
    fillShape(
      [
        [-58, -264],
        [-78, -252],
        [-68, -236],
        [-34, -232],
        [18, -236],
        [48, -250],
        [42, -276],
        [10, -290],
        [-32, -284],
      ],
      shade(-78, -260, 48, -250, [
        [0, '#213720'],
        [0.26, '#33512c'],
        [0.5, '#3e6036'],
        [0.75, '#2b4527'],
        [1, '#172716'],
      ])
    );
    fillShape(
      [
        [-56, -262],
        [-74, -252],
        [-64, -242],
        [-34, -238],
        [-36, -258],
      ],
      shade(-74, -250, -34, -254, [
        [0, '#456b3b'],
        [0.6, '#38572f'],
        [1, '#243a20'],
      ])
    );
    // Arco superciliar y sombra de la cuenca.
    target.fillStyle = 'rgba(16, 28, 14, 0.5)';
    target.beginPath();
    target.ellipse(-24, -270, 12, 5, -0.18, 0, Math.PI * 2);
    target.fill();
    // Pliegue del hocico y fosas nasales.
    target.strokeStyle = 'rgba(16, 28, 14, 0.42)';
    target.lineWidth = 1;
    target.beginPath();
    target.moveTo(-70, -248);
    target.quadraticCurveTo(-58, -244, -46, -246);
    target.stroke();
    target.fillStyle = '#0f1b0e';
    target.beginPath();
    target.ellipse(-64, -251, 3.2, 1.8, -0.3, 0, Math.PI * 2);
    target.fill();
    target.fillStyle = 'rgba(190, 222, 160, 0.12)';
    target.beginPath();
    target.ellipse(-52, -246, 7, 2.2, -0.32, 0, Math.PI * 2);
    target.fill();
    // Encía superior y dientes.
    target.fillStyle = '#4a1712';
    target.fillRect(-64, -240, 84, 3);
    for (let i = 0; i < 7; i += 1) {
      const x = -62 + i * 14;
      const th = 6 + (i % 3) * 1.6;
      fillShape(
        [
          [x, -238],
          [x + 6, -238],
          [x + 3, -238 + th],
        ],
        `rgba(246, 236, 210, ${0.88 + (i % 2) * 0.08})`
      );
      target.fillStyle = 'rgba(255, 255, 255, 0.35)';
      target.fillRect(x + 1.4, -236.4, 1, th * 0.4);
    }
    // Cuernos óseos curvos: cuerpo cónico, sombreado de cilindro y anillos.
    const drawHorn = (
      bx: number,
      by: number,
      tx: number,
      ty: number,
      width: number,
      bow: number
    ): void => {
      const nx = tx - bx;
      const ny = ty - by;
      const len = Math.hypot(nx, ny) || 1;
      const ox = -ny / len;
      const oy = nx / len;
      const qx = bx + nx * 0.48 + ox * bow;
      const qy = by + ny * 0.48 + oy * bow;
      const steps = 20;
      const left: Array<[number, number]> = [];
      const right: Array<[number, number]> = [];
      const spine: Array<[number, number, number]> = [];
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const mt = 1 - t;
        const x = mt * mt * bx + 2 * mt * t * qx + t * t * tx;
        const y = mt * mt * by + 2 * mt * t * qy + t * t * ty;
        const dx = 2 * mt * (qx - bx) + 2 * t * (tx - qx);
        const dy = 2 * mt * (qy - by) + 2 * t * (ty - qy);
        const l = Math.hypot(dx, dy) || 1;
        const ux = -dy / l;
        const uy = dx / l;
        const hw =
          width * 0.5 * Math.pow(1 - t, 1.3) * (1 + Math.sin(Math.PI * t) * 0.24) +
          0.25;
        spine.push([x, y, hw]);
        left.push([x + ux * hw, y + uy * hw]);
        right.push([x - ux * hw, y - uy * hw]);
      }
      // Cuenca oscura en la base del cuerno.
      target.beginPath();
      target.ellipse(bx, by, width * 0.62, width * 0.4, Math.atan2(ny, nx), 0, Math.PI * 2);
      target.fillStyle = 'rgba(12, 18, 10, 0.55)';
      target.fill();
      const outline = left.concat(right.slice().reverse());
      const hornGrad = target.createLinearGradient(
        bx + ox * width * 0.6,
        by + oy * width * 0.6,
        bx - ox * width * 0.6,
        by - oy * width * 0.6
      );
      hornGrad.addColorStop(0, '#fff3d6');
      hornGrad.addColorStop(0.2, '#e2cea6');
      hornGrad.addColorStop(0.46, '#bba17a');
      hornGrad.addColorStop(0.72, '#806846');
      hornGrad.addColorStop(1, '#392a1c');
      fillShape(outline, hornGrad);
      // Costillas de crecimiento, recortadas al cuerpo del cuerno.
      target.save();
      target.beginPath();
      target.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i += 1) {
        target.lineTo(outline[i][0], outline[i][1]);
      }
      target.closePath();
      target.clip();
      for (let i = 1; i <= 6; i += 1) {
        const t = 0.1 + i * 0.115;
        const idx = Math.round(t * steps);
        const [sx, sy, hw] = spine[idx];
        const dx = tx - bx;
        const dy = ty - by;
        const l = Math.hypot(dx, dy) || 1;
        const ux = -dy / l;
        const uy = dx / l;
        target.strokeStyle = 'rgba(58, 41, 24, 0.34)';
        target.lineWidth = 1.2;
        target.beginPath();
        target.moveTo(sx + ux * hw, sy + uy * hw);
        target.quadraticCurveTo(sx, sy + hw * 0.28, sx - ux * hw, sy - uy * hw);
        target.stroke();
        target.strokeStyle = 'rgba(255, 244, 220, 0.16)';
        target.lineWidth = 0.9;
        target.beginPath();
        target.moveTo(sx + ux * hw * 0.9, sy + uy * hw * 0.9 + 1.1);
        target.quadraticCurveTo(
          sx,
          sy + hw * 0.28 + 1.1,
          sx - ux * hw * 0.9,
          sy - uy * hw * 0.9 + 1.1
        );
        target.stroke();
      }
      // Brillo longitudinal del lado iluminado.
      target.strokeStyle = 'rgba(255, 250, 234, 0.22)';
      target.lineWidth = 1.8;
      target.beginPath();
      target.moveTo(spine[2][0] + (spine[2][2] * 0.42) * ox, spine[2][1] + (spine[2][2] * 0.42) * oy);
      for (let i = 3; i < steps - 2; i += 1) {
        target.lineTo(
          spine[i][0] + spine[i][2] * 0.4 * ox,
          spine[i][1] + spine[i][2] * 0.4 * oy
        );
      }
      target.stroke();
      target.restore();
      target.strokeStyle = 'rgba(28, 18, 10, 0.55)';
      target.lineWidth = 0.9;
      target.beginPath();
      target.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i += 1) {
        target.lineTo(outline[i][0], outline[i][1]);
      }
      target.closePath();
      target.stroke();
    };
    drawHorn(-4, -286, 96, -334, 15, 22);
    drawHorn(24, -282, 106, -306, 11, -14);
    drawHorn(-18, -283, -52, -318, 8, 10);
    // Cresta y placas del cráneo.
    for (let i = 0; i < 5; i += 1) {
      scalePlate(target, -30 + i * 16, -276 + (i % 2) * 4, 10.5, 6.4, SCALE_MID, 'rgba(146, 178, 116, 0.1)');
    }
    // Ojo ámbar con pupila vertical y brillo húmedo.
    const eyeH = lerp(3.2, 7.2, eyeOpen);
    target.save();
    target.translate(-24, -266);
    target.rotate(-0.12);
    const eyeGrad = target.createRadialGradient(-2, -2, 1, 0, 0, 10);
    eyeGrad.addColorStop(0, '#fff1c4');
    eyeGrad.addColorStop(0.55, '#ffd489');
    eyeGrad.addColorStop(1, '#c98234');
    target.beginPath();
    target.ellipse(0, 0, 9, eyeH, 0, 0, Math.PI * 2);
    target.fillStyle = eyeGrad;
    target.fill();
    const irisGrad = target.createRadialGradient(2, 0, 0.5, 2, 0, Math.max(2, eyeH));
    irisGrad.addColorStop(0, '#ffb347');
    irisGrad.addColorStop(0.6, '#e0651f');
    irisGrad.addColorStop(1, '#8c2a0c');
    target.beginPath();
    target.ellipse(2, 0, 4.2, eyeH * 0.86, 0, 0, Math.PI * 2);
    target.fillStyle = irisGrad;
    target.fill();
    target.beginPath();
    target.ellipse(2, 0, 2.1, eyeH * 0.82, 0, 0, Math.PI * 2);
    target.fillStyle = '#180503';
    target.fill();
    target.beginPath();
    target.ellipse(-1.4, -eyeH * 0.3, 1.7, 1.1, -0.4, 0, Math.PI * 2);
    target.fillStyle = 'rgba(255, 255, 245, 0.85)';
    target.fill();
    // Párpado inferior y comisura.
    target.strokeStyle = 'rgba(20, 30, 16, 0.6)';
    target.lineWidth = 1;
    target.beginPath();
    target.ellipse(0, 0, 9, eyeH, 0, Math.PI * 0.15, Math.PI * 0.85);
    target.stroke();
    target.restore();
    glow(target, -24, -266, 18, 'rgba(255, 116, 60, 0.7)', 0.5);
    // Ceño y mejilla.
    fillShape(
      [
        [-40, -276],
        [-16, -280],
        [-20, -270],
        [-38, -268],
      ],
      '#162613'
    );
    fillShape(
      [
        [10, -264],
        [36, -266],
        [28, -248],
        [4, -248],
      ],
      shade(10, -266, 36, -248, [
        [0, '#33512c'],
        [0.6, '#284126'],
        [1, '#1b2e19'],
      ])
    );
    // Escamas de la mejilla.
    for (let i = 0; i < 5; i += 1) {
      scalePlate(
        target,
        12 + (i % 3) * 8,
        -258 + Math.floor(i / 3) * 7,
        6,
        4,
        '#2c4527',
        'rgba(160, 192, 126, 0.1)'
      );
    }
    // Fosa nasal y espina de la mejilla.
    px(target, -62, -254, 4, 2, '#152315');
    // Espina pequeña en la mejilla, integrada al verde de la piel.
    poly(
      target,
      [
        [38, -248],
        [52, -240],
        [40, -238],
      ],
      '#3b5530'
    );

    // Luz roja de la máquina en el perfil izquierdo.
    target.strokeStyle = 'rgba(255, 102, 68, 0.4)';
    target.lineWidth = 1.4;
    target.beginPath();
    target.moveTo(-78, -251);
    target.lineTo(-66, -240);
    target.lineTo(-46, -234);
    target.stroke();

    target.restore();
    target.restore();
  }

  function drawVillain(time: number): void {
    // Transición desde el estallido de la consola.
    px(target, 0, 0, W, H, '#030204');
    const fadeIn = 1 - smoothstep(24.0, 25.4, time);
    if (fadeIn > 0.001) {
      px(target, 0, 0, W, H, `rgba(255, 238, 224, ${fadeIn})`);
    }

    // Cámara de la instalación.
    const chamber = target.createLinearGradient(0, 0, 0, H);
    chamber.addColorStop(0, '#050407');
    chamber.addColorStop(0.6, '#0b070a');
    chamber.addColorStop(1, '#120a0a');
    target.fillStyle = chamber;
    target.fillRect(0, 0, W, H);

    // Máquina y ventanal de energía a la izquierda.
    const machineX = 94;
    const machineY = 176;
    px(target, machineX - 46, 60, 92, 274, '#080a0d');
    px(target, machineX - 40, 66, 80, 262, '#0d1116');
    for (let i = 0; i < 5; i += 1) {
      target.beginPath();
      target.ellipse(machineX, machineY - 40, 60 + i * 12, 18 + i * 4, 0.18, 0, Math.PI * 2);
      target.strokeStyle = `rgba(255, 70, 44, ${0.22 - i * 0.03})`;
      target.lineWidth = 2;
      target.stroke();
    }
    const energy = smoothstep(25.5, 30, time) * (0.6 + 0.4 * Math.sin(time * 2.2));
    glow(target, machineX, machineY - 46, 150, 'rgba(255, 52, 30, 0.5)', energy);
    glow(target, machineX, machineY - 46, 46, 'rgba(255, 190, 150, 0.65)', energy);
    // Haz que escapa hacia arriba.
    const beam = target.createLinearGradient(machineX, machineY - 50, machineX, 0);
    beam.addColorStop(0, `rgba(255, 96, 60, ${0.4 * energy})`);
    beam.addColorStop(1, 'rgba(255, 70, 40, 0)');
    target.fillStyle = beam;
    target.fillRect(machineX - 20, 0, 40, machineY - 40);

    // Suelo y barandillas.
    px(target, 0, 300, W, 60, '#070609');
    for (let i = 0; i < 26; i += 1) {
      px(target, i * 26, 306, 20, 1, 'rgba(88, 76, 74, 0.12)');
    }
    for (let i = 0; i < 7; i += 1) {
      px(target, 60 + i * 88, 250, 3, 62, '#0b0a0d');
    }
    px(target, 30, 248, 580, 3, '#0c0b0e');

    // Humo detrás del villano.
    for (let i = 0; i < 6; i += 1) {
      const cx = 250 + i * 44 + Math.sin(time * 0.2 + i) * 14;
      const cy = 232 - i * 8 + Math.cos(time * 0.16 + i) * 8;
      glow(target, cx, cy, 90, 'rgba(96, 94, 98, 0.12)', 0.5);
    }

    // Relámpagos rojos: revelan la silueta sin mostrarla del todo.
    const bolt1 = 1 - smoothstep(28.3, 28.85, time);
    const bolt2 = 1 - smoothstep(30.2, 30.62, time);
    const flash = Math.max(bolt1, bolt2 * 0.8);
    if (flash > 0.01) {
      target.save();
      target.globalCompositeOperation = 'lighter';
      px(target, 0, 0, W, H, `rgba(90, 10, 6, ${flash * 0.35})`);
      target.strokeStyle = `rgba(255, 110, 80, ${flash})`;
      target.lineWidth = 2;
      target.beginPath();
      target.moveTo(448, 0);
      target.lineTo(410, 62);
      target.lineTo(438, 76);
      target.lineTo(392, 140);
      target.lineTo(418, 152);
      target.lineTo(372, 212);
      target.stroke();
      target.strokeStyle = `rgba(255, 236, 220, ${flash * 0.8})`;
      target.lineWidth = 1;
      target.stroke();
      target.restore();
    }

    const reveal = smoothstep(26.6, 30.6, time);
    const face = smoothstep(31.2, 34.2, time);
    const pull = smoothstep(49.4, 52.6, time);
    const laugh = smoothstep(48.9, 49.6, time) * (1 - smoothstep(52.3, 53, time));

    const zoom = (1 + reveal * 0.02 + face * 1.05) * (1 - pull * 0.44);
    const focusX = lerp(400, 398, face);
    const focusY = lerp(188, 74, face) + pull * 60;
    const shake = shakeAt(time, 49.2, 3.4, 40) + bolt1 * 1.6 + bolt2 * 1.1;
    const shakeY = shakeAt(time, 49.4, 2.4, 33) + bolt1 * -1.4;

    target.save();
    target.translate(shake, shakeY);
    target.translate(W / 2, H / 2);
    target.scale(zoom, zoom);
    target.translate(-focusX, -focusY);

    // Resplandor de contorno: primero silueta, luego escamas.
    if (reveal > 0.01) {
      target.save();
      target.translate(400, 330);
      const headLift = smoothstep(43.6, 45.2, time);
      let mouth = 0.06;
      if (isVillainSpeakingAt(time)) {
        mouth = 0.2 + 0.32 * Math.abs(Math.sin(time * 8.4 + 0.5));
      }
      mouth = lerp(mouth, 0.58 + 0.3 * Math.abs(Math.sin(time * 11.2)), laugh);
      const eyeOpen =
        0.5 +
        0.5 * smoothstep(31.2, 33, time) -
        0.25 * laugh +
        0.2 * smoothstep(40.2, 41, time);
      drawKoopa(time, 0.55 + reveal * 0.45, mouth, headLift, laugh, clamp01(eyeOpen));
      target.restore();
    }
    target.restore();

    // Humo en primer plano, se aclara al acercarse la cámara.
    const smokeFront = 0.85 - face * 0.45 + laugh * 0.1;
    for (let i = 0; i < 5; i += 1) {
      const x = 120 + i * 108 + Math.sin(time * 0.24 + i * 1.7) * 26;
      const y = 260 + (i % 2) * 34 + Math.cos(time * 0.19 + i) * 10;
      glow(target, x, y, 110, 'rgba(122, 118, 126, 0.16)', smokeFront * 0.55);
    }

    // Ciclo reflejado en una pantalla rota: la derrota que se repite.
    const loopAlpha =
      smoothstep(34.4, 35.2, time) * (1 - smoothstep(39.2, 40.2, time));
    if (loopAlpha > 0.01) {
      const lx = 84;
      const ly = 158;
      target.save();
      target.globalAlpha = loopAlpha;
      px(target, lx, ly, 104, 74, 'rgba(4, 6, 10, 0.9)');
      target.strokeStyle = 'rgba(255, 90, 64, 0.4)';
      target.lineWidth = 1;
      target.strokeRect(lx + 0.5, ly + 0.5, 103, 73);
      for (let g = 0; g < 3; g += 1) {
        const ghost = 1 - g * 0.28;
        target.globalAlpha = loopAlpha * ghost;
        px(target, lx + 8 + g * 6, ly + 10 + g * 4, 84 - g * 12, 52 - g * 8, 'rgba(16, 10, 12, 0.85)');
        // Silueta diminuta que cae una y otra vez.
        const fall = (time * 0.6 + g * 0.33) % 1;
        const sy = ly + 18 + fall * 32;
        px(target, lx + 42 + g * 6, sy, 10, 8, 'rgba(90, 130, 86, 0.55)');
        px(target, lx + 44 + g * 6, sy + 8, 6, 4, 'rgba(60, 90, 58, 0.5)');
        px(target, lx + 30 + g * 6, ly + 58, 36, 1, 'rgba(255, 86, 60, 0.35)');
      }
      target.restore();
    }

    // Chispas y ceniza en el aire.
    drawMotes(time, 0.25 + laugh * 0.2, 'rgba(255, 150, 120, 0.45)');

    // Pulso de energía durante la risa.
    if (laugh > 0.01) {
      glow(target, W / 2, H / 2, 260, 'rgba(255, 60, 36, 0.25)', laugh);
      px(target, 0, 0, W, H, `rgba(60, 4, 4, ${0.08 * laugh})`);
    }
  }

  /* ------------------------------------------------------------------ */
  /* ESCENA 4 · LA ONDA BORRA LA MEMORIA                                 */
  /* ------------------------------------------------------------------ */

  function drawCorridor(time: number): void {
    px(target, 0, 0, W, H, '#020305');
    const push = smoothstep(53.2, 55.8, time);
    const cx = W / 2;
    const cy = H * 0.52;

    // Túnel de la instalación.
    for (let i = 0; i < 12; i += 1) {
      const k = i / 11;
      const w = lerp(40, 560, k) * (1 + push * 0.4);
      const h = lerp(26, 330, k) * (1 + push * 0.4);
      target.strokeStyle = `rgba(44, 52, 62, ${0.12 + k * 0.16})`;
      target.lineWidth = 1 + k * 2;
      target.strokeRect(cx - w / 2, cy - h / 2, w, h);
    }
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      target.strokeStyle = 'rgba(26, 30, 38, 0.7)';
      target.lineWidth = 4;
      target.beginPath();
      target.moveTo(cx + Math.cos(a) * 20, cy + Math.sin(a) * 12);
      target.lineTo(cx + Math.cos(a) * 420, cy + Math.sin(a) * 260);
      target.stroke();
    }

    // Frente de onda: aros que vienen hacia la cámara.
    const ringR = 18 + push * 330;
    for (let i = 0; i < 4; i += 1) {
      const r = ringR - i * 26;
      if (r < 4) continue;
      target.strokeStyle = `rgba(255, ${120 + i * 24}, 90, ${0.55 - i * 0.1})`;
      target.lineWidth = 3 - i * 0.6;
      target.beginPath();
      target.ellipse(cx, cy, r * 1.5, r, 0, 0, Math.PI * 2);
      target.stroke();
    }
    glow(target, cx, cy, ringR * 1.9, 'rgba(255, 80, 52, 0.7)', 0.55 + push * 0.3);
    glow(target, cx, cy, ringR * 0.5, 'rgba(255, 230, 210, 0.55)', 0.4 + push * 0.4);

    // Escombros que flotan hacia la cámara.
    for (let i = 0; i < 24; i += 1) {
      const k = ((time * 0.35 + hash2(i, 1)) % 1) * 1.6;
      const x = cx + (hash2(i, 3) - 0.5) * 300 * k;
      const y = cy + (hash2(i, 5) - 0.5) * 210 * k;
      px(target, x, y, 1 + (i % 3), 1, `rgba(180, 150, 140, ${0.2 + k * 0.2})`);
    }

    // Estallido final que entrega la sala de arcades.
    const cut = smoothstep(55.45, 55.95, time);
    if (cut > 0.001) px(target, 0, 0, W, H, `rgba(255, 244, 232, ${cut})`);
  }

  function drawCabinet(
    x: number,
    baseY: number,
    scale: number,
    state: number,
    flicker: number,
    time: number
  ): void {
    const w = 36 * scale;
    const h = 112 * scale;
    const top = baseY - h;
    const s = scale;
    target.save();
    target.globalAlpha = 0.96;

    // Sombra y reflejo sobre la moqueta.
    target.fillStyle = 'rgba(0, 0, 0, 0.5)';
    target.beginPath();
    target.ellipse(x, baseY + 2 * s, w * 0.72, 5 * s, 0, 0, Math.PI * 2);
    target.fill();
    if (state === 0) {
      const refl = target.createLinearGradient(0, baseY, 0, baseY + 34 * s);
      refl.addColorStop(0, 'rgba(84, 196, 220, 0.12)');
      refl.addColorStop(1, 'rgba(84, 196, 220, 0)');
      target.fillStyle = refl;
      target.fillRect(x - w * 0.42, baseY, w * 0.84, 34 * s);
      // Charco de luz de la pantalla sobre la moqueta.
      target.save();
      target.globalCompositeOperation = 'lighter';
      const pool = target.createRadialGradient(
        x,
        baseY + 5 * s,
        1,
        x,
        baseY + 5 * s,
        44 * s
      );
      pool.addColorStop(0, 'rgba(64, 178, 208, 0.14)');
      pool.addColorStop(0.55, 'rgba(48, 130, 160, 0.05)');
      pool.addColorStop(1, 'rgba(40, 110, 140, 0)');
      target.fillStyle = pool;
      target.beginPath();
      target.ellipse(x, baseY + 7 * s, 44 * s, 13 * s, 0, 0, Math.PI * 2);
      target.fill();
      target.restore();
    }

    // Cuerpo con volumen y moldura en T.
    const bodyGrad = target.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    bodyGrad.addColorStop(0, '#070b10');
    bodyGrad.addColorStop(0.16, '#1a2430');
    bodyGrad.addColorStop(0.46, '#243140');
    bodyGrad.addColorStop(0.78, '#151f2a');
    bodyGrad.addColorStop(1, '#060a0e');
    target.fillStyle = bodyGrad;
    target.fillRect(x - w / 2, top, w, h);
    target.fillStyle = '#030507';
    target.fillRect(x - w / 2, top, 2.2 * s, h);
    target.fillRect(x + w / 2 - 2.2 * s, top, 2.2 * s, h);
    target.fillStyle = 'rgba(120, 140, 160, 0.16)';
    target.fillRect(x - w / 2 + 2.2 * s, top, 0.8 * s, h);

    // Arte lateral: franjas y brillo.
    target.save();
    target.beginPath();
    target.rect(x - w / 2 + 3 * s, top + 20 * s, 5 * s, h - 30 * s);
    target.rect(x + w / 2 - 8 * s, top + 20 * s, 5 * s, h - 30 * s);
    target.clip();
    for (let i = 0; i < 7; i += 1) {
      const yy = top + 24 * s + i * 13 * s;
      target.fillStyle = i % 2 === 0 ? 'rgba(236, 106, 72, 0.16)' : 'rgba(84, 196, 220, 0.14)';
      target.beginPath();
      target.moveTo(x - w / 2, yy);
      target.lineTo(x - w / 2 + 9 * s, yy - 5 * s);
      target.lineTo(x - w / 2 + 9 * s, yy - 1 * s);
      target.lineTo(x - w / 2, yy + 4 * s);
      target.closePath();
      target.fill();
    }
    target.restore();

    // Marquesina luminosa.
    const marqueeY = top + 5 * s;
    const marqueeH = 10 * s;
    const marqueeGlow = state === 0 ? 1 : state === 1 ? flicker * 0.7 : 0.12;
    const marquee = target.createLinearGradient(0, marqueeY, 0, marqueeY + marqueeH);
    marquee.addColorStop(0, `rgba(38, 72, 92, ${0.4 + marqueeGlow * 0.5})`);
    marquee.addColorStop(0.5, `rgba(20, 44, 60, ${0.35 + marqueeGlow * 0.4})`);
    marquee.addColorStop(1, 'rgba(8, 16, 24, 0.9)');
    target.fillStyle = marquee;
    target.fillRect(x - w / 2 + 3 * s, marqueeY, w - 6 * s, marqueeH);
    if (marqueeGlow > 0.05) {
      target.fillStyle = `rgba(120, 236, 255, ${0.5 * marqueeGlow})`;
      target.fillRect(x - w / 2 + 6 * s, marqueeY + 2 * s, w - 12 * s, 1.4 * s);
      target.fillStyle = `rgba(255, 128, 96, ${0.55 * marqueeGlow})`;
      target.fillRect(x - w / 2 + 8 * s, marqueeY + 5 * s, w * 0.32, 2 * s);
      target.fillStyle = `rgba(255, 216, 130, ${0.45 * marqueeGlow})`;
      target.fillRect(x + w * 0.08, marqueeY + 5 * s, w * 0.26, 1.6 * s);
      glow(target, x, marqueeY + marqueeH / 2, 30 * s, 'rgba(90, 210, 236, 0.34)', 0.7 * marqueeGlow);
    }

    // Pantalla con bisel y cristal.
    const sy = top + 18 * s;
    const screenW = w - 9 * s;
    const screenH = 34 * s;
    target.fillStyle = '#05070b';
    target.fillRect(x - screenW / 2 - 1.5 * s, sy - 1.5 * s, screenW + 3 * s, screenH + 3 * s);
    const glass = target.createLinearGradient(x, sy, x, sy + screenH);
    glass.addColorStop(0, '#081018');
    glass.addColorStop(1, '#03060a');
    target.fillStyle = glass;
    target.fillRect(x - screenW / 2, sy, screenW, screenH);

    if (state === 0) {
      const screen = target.createLinearGradient(x, sy, x, sy + screenH);
      screen.addColorStop(0, 'rgba(22, 70, 96, 0.95)');
      screen.addColorStop(0.55, 'rgba(10, 40, 60, 0.95)');
      screen.addColorStop(1, 'rgba(4, 14, 24, 0.95)');
      target.fillStyle = screen;
      target.fillRect(x - screenW / 2 + 1, sy + 1, screenW - 2, screenH - 2);
      // Estrellas y nave del attract mode.
      target.fillStyle = 'rgba(180, 240, 255, 0.5)';
      for (let i = 0; i < 9; i += 1) {
        const starX = x - screenW / 2 + 2 + hash2(i, Math.round(x)) * (screenW - 4);
        const starY = sy + 2 + ((hash2(i, 9) * 26 + time * (4 + i)) % 26) * s;
        target.fillRect(starX, starY, 1, 1);
      }
      const shipX = x + Math.sin(time * 1.1 + x * 0.3) * screenW * 0.24;
      target.fillStyle = 'rgba(253, 224, 71, 0.9)';
      target.fillRect(shipX - 1.5 * s, sy + screenH - 7 * s, 3 * s, 2 * s);
      target.fillRect(shipX - 0.5 * s, sy + screenH - 9 * s, 1 * s, 2 * s);
      target.fillStyle = 'rgba(255, 122, 90, 0.85)';
      for (let i = 0; i < 4; i += 1) {
        target.fillRect(
          x - screenW / 2 + 4 * s + i * 7 * s,
          sy + 5 * s + (i % 2) * 4 * s,
          2.4 * s,
          1.6 * s
        );
      }
      // HUD y líneas de barrido.
      target.fillStyle = 'rgba(130, 230, 255, 0.4)';
      target.fillRect(x - screenW / 2 + 2, sy + 1.5 * s, screenW * 0.3, 1);
      for (let i = 0; i < 6; i += 1) {
        target.fillStyle = 'rgba(0, 0, 0, 0.22)';
        target.fillRect(x - screenW / 2 + 1, sy + 2 + i * 5 * s, screenW - 2, 1);
      }
      glow(target, x, sy + screenH / 2, 38 * s, 'rgba(64, 190, 224, 0.42)', 0.85);
      // Reflejo del cristal.
      target.save();
      target.globalCompositeOperation = 'screen';
      const sheen = target.createLinearGradient(
        x - screenW / 2,
        sy,
        x + screenW / 2,
        sy + screenH
      );
      sheen.addColorStop(0, 'rgba(190, 224, 240, 0.14)');
      sheen.addColorStop(0.4, 'rgba(190, 224, 240, 0)');
      sheen.addColorStop(0.7, 'rgba(190, 224, 240, 0.08)');
      sheen.addColorStop(1, 'rgba(190, 224, 240, 0)');
      target.fillStyle = sheen;
      target.fillRect(x - screenW / 2, sy, screenW, screenH);
      target.restore();
    } else if (state === 1) {
      // La pantalla muere: colapso a una línea de fósforo.
      target.fillStyle = `rgba(226, 250, 255, ${flicker * 0.9})`;
      target.fillRect(x - screenW / 2 + 1, sy + screenH / 2, screenW - 2, 1.2 * s);
      target.fillStyle = `rgba(4, 8, 12, ${0.5 + flicker * 0.3})`;
      target.fillRect(x - screenW / 2 + 1, sy + 1, screenW - 2, screenH - 2);
      for (let i = 0; i < 10; i += 1) {
        target.fillStyle = `rgba(190, 230, 240, ${flicker * hash2(i, 5) * 0.5})`;
        target.fillRect(
          x - screenW / 2 + hash2(i, 7) * screenW,
          sy + hash2(i, 11) * screenH,
          2,
          1
        );
      }
    } else {
      // Cristal muerto, agrietado y hollín.
      target.fillStyle = 'rgba(2, 4, 6, 0.95)';
      target.fillRect(x - screenW / 2 + 1, sy + 1, screenW - 2, screenH - 2);
      target.strokeStyle = 'rgba(150, 168, 180, 0.22)';
      target.lineWidth = 1;
      target.beginPath();
      target.moveTo(x - 4 * s, sy);
      target.lineTo(x + 2 * s, sy + screenH * 0.45);
      target.lineTo(x - 6 * s, sy + screenH);
      target.stroke();
      target.beginPath();
      target.moveTo(x + 2 * s, sy + screenH * 0.45);
      target.lineTo(x + screenW * 0.3, sy + screenH * 0.6);
      target.stroke();
      target.fillStyle = 'rgba(0, 0, 0, 0.5)';
      target.beginPath();
      target.ellipse(x, sy + screenH * 0.55, screenW * 0.42, screenH * 0.4, 0, 0, Math.PI * 2);
      target.fill();
    }

    // Panel de control inclinado.
    const panelY = top + 55 * s;
    const panel = target.createLinearGradient(0, panelY, 0, panelY + 9 * s);
    panel.addColorStop(0, '#1c2732');
    panel.addColorStop(0.55, '#0e1620');
    panel.addColorStop(1, '#060b11');
    target.fillStyle = panel;
    target.beginPath();
    target.moveTo(x - w / 2 + 1 * s, panelY);
    target.lineTo(x + w / 2 - 1 * s, panelY);
    target.lineTo(x + w / 2 - 3 * s, panelY + 9 * s);
    target.lineTo(x - w / 2 + 3 * s, panelY + 9 * s);
    target.closePath();
    target.fill();
    // Joystick con bola roja.
    target.strokeStyle = '#6b7480';
    target.lineWidth = 1.4 * s;
    target.beginPath();
    target.moveTo(x - w * 0.2, panelY + 4 * s);
    target.lineTo(x - w * 0.2, panelY + 1.6 * s);
    target.stroke();
    target.beginPath();
    target.arc(x - w * 0.2, panelY + 1.2 * s, 2 * s, 0, Math.PI * 2);
    target.fillStyle = state === 0 ? '#c8342a' : '#3a1512';
    target.fill();
    if (state === 0) {
      target.beginPath();
      target.arc(x - w * 0.2 - 0.6 * s, panelY + 0.6 * s, 0.7 * s, 0, Math.PI * 2);
      target.fillStyle = 'rgba(255, 210, 190, 0.5)';
      target.fill();
    }
    // Botones.
    for (let i = 0; i < 4; i += 1) {
      const bx = x + w * 0.02 + i * 4.4 * s;
      const by = panelY + 3.4 * s;
      target.beginPath();
      target.arc(bx, by + 0.8 * s, 1.8 * s, 0, Math.PI * 2);
      target.fillStyle = 'rgba(0, 0, 0, 0.6)';
      target.fill();
      target.beginPath();
      target.arc(bx, by, 1.8 * s, 0, Math.PI * 2);
      target.fillStyle =
        state !== 0
          ? '#2a3138'
          : ['#e8b23a', '#3fa7c0', '#b84a86', '#d0d4d8'][i];
      target.fill();
      if (state === 0) {
        target.beginPath();
        target.arc(bx - 0.5 * s, by - 0.5 * s, 0.6 * s, 0, Math.PI * 2);
        target.fillStyle = 'rgba(255, 255, 255, 0.4)';
        target.fill();
      }
    }

    // Puerta de monedas.
    const coinY = top + 70 * s;
    const coinGrad = target.createLinearGradient(0, coinY, 0, coinY + 18 * s);
    coinGrad.addColorStop(0, '#2a3037');
    coinGrad.addColorStop(0.5, '#1a1f24');
    coinGrad.addColorStop(1, '#0b0e12');
    target.fillStyle = coinGrad;
    target.fillRect(x - w * 0.32, coinY, w * 0.64, 18 * s);
    target.strokeStyle = 'rgba(150, 160, 172, 0.24)';
    target.lineWidth = 0.8 * s;
    target.strokeRect(x - w * 0.32 + 0.5, coinY + 0.5, w * 0.64 - 1, 18 * s - 1);
    for (let i = 0; i < 2; i += 1) {
      const slotX = x - w * 0.18 + i * w * 0.22;
      target.fillStyle = '#05070a';
      target.fillRect(slotX, coinY + 3 * s, 4.2 * s, 1.6 * s);
      target.fillStyle = 'rgba(210, 220, 232, 0.25)';
      target.fillRect(slotX, coinY + 3 * s, 4.2 * s, 0.5 * s);
      target.fillStyle = '#3a4148';
      target.fillRect(slotX + 1 * s, coinY + 6.4 * s, 2.2 * s, 1.6 * s);
    }
    // Cerradura y retorno.
    target.beginPath();
    target.arc(x, coinY + 12 * s, 1.4 * s, 0, Math.PI * 2);
    target.fillStyle = '#0a0d11';
    target.fill();
    target.fillStyle = 'rgba(180, 190, 202, 0.35)';
    target.fillRect(x - 0.3 * s, coinY + 12 * s, 0.6 * s, 1.6 * s);

    // Patas y desgaste.
    target.fillStyle = '#080c11';
    target.fillRect(x - w / 2, baseY - 5 * s, w, 5 * s);
    target.fillStyle = 'rgba(120, 132, 146, 0.12)';
    target.fillRect(x - w / 2 + 2 * s, baseY - 4 * s, w - 4 * s, 0.8 * s);
    for (let i = 0; i < 3; i += 1) {
      target.fillStyle = 'rgba(200, 206, 214, 0.08)';
      target.fillRect(
        x - w / 2 + 4 * s + hash2(i, 21) * w * 0.6,
        top + 30 * s + hash2(i, 23) * 60 * s,
        3 + hash2(i, 25) * 4,
        0.8
      );
    }
    // Calcomanía de precio.
    target.fillStyle = 'rgba(232, 222, 196, 0.32)';
    target.fillRect(x + screenW * 0.5 + 1.4 * s, sy + 2 * s, 3.4 * s, 2.6 * s);
    target.fillStyle = 'rgba(196, 60, 48, 0.4)';
    target.fillRect(x + screenW * 0.5 + 1.8 * s, sy + 2.6 * s, 2.4 * s, 0.8 * s);

    if (state === 2) {
      target.globalAlpha = 0.4;
      target.fillStyle = 'rgba(4, 6, 9, 0.8)';
      target.fillRect(x - w / 2, top + h * 0.6, w, h * 0.4);
    }
    target.restore();
  }

  function drawArcade(time: number): void {
    px(target, 0, 0, W, H, '#030508');
    const wave = smoothstep(56.0, 60.6, time);
    const shake = shakeAt(time, 56.4, 1.6, 50);

    // Pared del fondo: neones lejanos que todavía respiran.
    const wall = target.createLinearGradient(0, 0, 0, 212);
    wall.addColorStop(0, '#04070b');
    wall.addColorStop(0.7, '#070c12');
    wall.addColorStop(1, '#0a1017');
    target.fillStyle = wall;
    target.fillRect(0, 0, W, 214);
    glow(target, 94, 92, 120, 'rgba(58, 186, 218, 0.12)', 0.9);
    glow(target, 552, 84, 132, 'rgba(214, 66, 150, 0.1)', 0.85);
    px(target, 58, 86, 62, 2, 'rgba(88, 214, 244, 0.2)');
    px(target, 528, 68, 68, 3, 'rgba(240, 96, 176, 0.16)');
    px(target, 530, 74, 42, 1, 'rgba(255, 170, 210, 0.12)');
    // Carteles y marquesinas apagadas.
    for (let i = 0; i < 4; i += 1) {
      const pxX = 140 + i * 96;
      const pxY = 70 + (i % 2) * 10;
      px(target, pxX, pxY, 24, 30, 'rgba(7, 12, 18, 0.9)');
      px(target, pxX + 2, pxY + 2, 20, 18, `rgba(${40 + i * 6}, ${54 + i * 4}, 66, 0.4)`);
      px(target, pxX + 3, pxY + 21, 15, 2, 'rgba(120, 150, 170, 0.12)');
      px(target, pxX + 3, pxY + 25, 10, 1, 'rgba(120, 150, 170, 0.1)');
    }
    px(target, 0, 208, W, 5, '#080d13');

    // Suelo en perspectiva.
    const floor = target.createLinearGradient(0, 213, 0, H);
    floor.addColorStop(0, '#060a0e');
    floor.addColorStop(0.5, '#0a0f15');
    floor.addColorStop(1, '#101720');
    target.fillStyle = floor;
    target.fillRect(0, 210, W, H - 210);
    // Moqueta con rombos tenues.
    target.save();
    target.beginPath();
    target.rect(0, 210, W, H - 210);
    target.clip();
    for (let i = -10; i < 22; i += 1) {
      const bx = i * 46;
      target.fillStyle =
        i % 2 === 0 ? 'rgba(40, 96, 108, 0.06)' : 'rgba(126, 44, 92, 0.05)';
      target.beginPath();
      target.moveTo(bx, 210);
      target.lineTo(bx + 26, 210);
      target.lineTo(bx + 120, H);
      target.lineTo(bx + 54, H);
      target.closePath();
      target.fill();
    }
    for (let row = 0; row < 7; row += 1) {
      const yy = 222 + row * row * 3.6;
      for (let col = 0; col < 16; col += 1) {
        const xx = -20 + col * 44 + (row % 2) * 22;
        target.fillStyle = 'rgba(150, 200, 214, 0.035)';
        target.fillRect(xx, yy, 3, 2);
      }
    }
    target.restore();
    for (let i = -8; i <= 8; i += 1) {
      target.strokeStyle = 'rgba(52, 68, 82, 0.18)';
      target.lineWidth = 1;
      target.beginPath();
      target.moveTo(W / 2 + i * 10, 210);
      target.lineTo(W / 2 + i * 90, H);
      target.stroke();
    }
    for (let i = 0; i < 8; i += 1) {
      const y = 220 + i * i * 3.4;
      px(target, 0, y, W, 1, `rgba(40, 54, 68, ${0.08 + i * 0.02})`);
    }
    // Luces colgantes con cono volumétrico.
    for (let i = 0; i < 4; i += 1) {
      const x = 150 + i * 114;
      const y = 34 + i * 5;
      px(target, x, 0, 2, y, '#0b0f15');
      target.save();
      target.globalCompositeOperation = 'lighter';
      const lampCone = target.createLinearGradient(0, y, 0, 230);
      lampCone.addColorStop(0, 'rgba(255, 206, 138, 0.09)');
      lampCone.addColorStop(1, 'rgba(255, 206, 138, 0)');
      target.fillStyle = lampCone;
      target.beginPath();
      target.moveTo(x - 5, y);
      target.lineTo(x + 5, y);
      target.lineTo(x + 54, 230);
      target.lineTo(x - 54, 230);
      target.closePath();
      target.fill();
      target.restore();
      glow(target, x + 1, y, 38, 'rgba(255, 196, 120, 0.2)', 0.75);
      px(target, x - 4, y, 10, 3, '#1a222c');
      px(target, x - 3, y + 2, 8, 1, 'rgba(255, 232, 190, 0.55)');
    }

    // Máquinas, de fondo a primer plano.
    const slots = [0.08, 0.2, 0.34, 0.5, 0.68, 0.88];
    for (let s = 0; s < slots.length; s += 1) {
      const z = slots[s];
      const scale = 0.36 + z * 1.45;
      const baseY = 214 + z * z * 190;
      const spread = 56 + z * 288;
      for (const side of [-1, 1] as const) {
        const x = W / 2 + side * spread;
        const hit = clamp01((wave - z + 0.1) * 8);
        const state = hit <= 0 ? 0 : hit < 1 ? 1 : 2;
        const flicker =
          state === 1
            ? 0.3 + 0.7 * Math.abs(Math.sin(time * 26 + s * 1.7))
            : 0.15;
        drawCabinet(x, baseY, scale, state, flicker, time);
        if (state === 2) {
          for (let i = 0; i < 8; i += 1) {
            const dustX = x + (hash2(i, s) - 0.5) * 40 * scale;
            const dustY = baseY - 50 * scale - ((time * (10 + i)) % (60 * scale));
            px(target, dustX, dustY, 1, 1, 'rgba(190, 200, 210, 0.28)');
          }
        }
      }
    }

    // Frente de onda luminoso.
    const frontX = W / 2;
    const frontY = H * 0.56;
    target.save();
    target.globalCompositeOperation = 'lighter';
    const ringR = 40 + wave * 330;
    target.strokeStyle = `rgba(255, 120, 84, ${0.5 * (1 - wave * 0.4)})`;
    target.lineWidth = 3;
    target.beginPath();
    target.ellipse(frontX + shake, frontY, ringR * 1.3, ringR, 0, 0, Math.PI * 2);
    target.stroke();
    target.strokeStyle = `rgba(255, 240, 225, ${0.35 * (1 - wave * 0.3)})`;
    target.lineWidth = 1;
    target.stroke();
    // Haz volumétrico que acompaña la onda.
    const vol = target.createLinearGradient(0, 0, W, 0);
    vol.addColorStop(0, 'rgba(255, 90, 60, 0)');
    vol.addColorStop(0.42 + wave * 0.2, `rgba(255, 90, 60, ${0.16 * (1 - wave * 0.5)})`);
    vol.addColorStop(0.52 + wave * 0.2, `rgba(255, 240, 220, ${0.2 * (1 - wave * 0.5)})`);
    vol.addColorStop(0.62 + wave * 0.2, 'rgba(255, 90, 60, 0)');
    target.fillStyle = vol;
    target.fillRect(0, 0, W, H);
    target.restore();

    // Polvo en la luz.
    drawMotes(time, 0.35, 'rgba(210, 226, 240, 0.4)');

    // Corte al detalle de los cartuchos.
    const cut = smoothstep(59.55, 59.95, time);
    if (cut > 0.001) px(target, 0, 0, W, H, `rgba(255, 240, 224, ${cut * 0.85})`);
  }

  function drawCartridge(
    x: number,
    y: number,
    w: number,
    h: number,
    rot: number,
    labelHue: string,
    dissolve: number
  ): void {
    if (dissolve >= 1) return;
    target.save();
    target.translate(x, y);
    target.rotate(rot);
    const clipTop = -h / 2;
    const clipBottom = -h / 2 + h * (1 - dissolve);
    target.beginPath();
    target.rect(-w / 2 - 8, clipTop - 8, w + 16, Math.max(0, clipBottom - clipTop) + 8);
    target.clip();

    // Cuerpo del cartucho.
    px(target, -w / 2, -h / 2, w, h, '#15181c');
    px(target, -w / 2 + 2, -h / 2 + 2, w - 4, h - 4, '#242a30');
    px(target, -w / 2 + 4, -h / 2 + 5, w - 8, h * 0.5, labelHue);
    px(target, -w / 2 + 7, -h / 2 + 9, w - 14, 2, 'rgba(255, 255, 255, 0.25)');
    // Ranuras y contactos.
    for (let i = 0; i < 5; i += 1) {
      px(target, -w / 2 + 6 + i * (w / 5), h / 2 - 9, w / 9, 7, '#0a0c0f');
      px(target, -w / 2 + 7 + i * (w / 5), h / 2 - 8, w / 14, 1, 'rgba(196, 170, 110, 0.5)');
    }
    px(target, -w / 2 + 6, -h / 2 + 4, 2, h - 8, 'rgba(255, 255, 255, 0.08)');
    target.restore();

    if (dissolve > 0.02) {
      // Borde incandescente y polvo que sube.
      target.save();
      target.globalAlpha = 0.6 * (1 - dissolve);
      target.strokeStyle = 'rgba(255, 214, 170, 0.8)';
      target.lineWidth = 1;
      target.beginPath();
      target.moveTo(x - w / 2, y - h / 2 + h * (1 - dissolve));
      target.lineTo(x + w / 2, y - h / 2 + h * (1 - dissolve));
      target.stroke();
      target.restore();
      for (let i = 0; i < 14; i += 1) {
        const dx = (hash2(i, Math.round(x)) - 0.5) * w;
        const rise = ((x + i * 7) % 30) + dissolve * 30;
        px(
          target,
          x + dx + Math.sin(rise * 0.2 + i) * 2,
          y + h * 0.5 - rise,
          1,
          1,
          `rgba(220, 210, 200, ${0.4 * (1 - dissolve)})`
        );
      }
    }
  }

  function drawCartridges(time: number): void {
    px(target, 0, 0, W, H, '#060403');
    const push = smoothstep(60.0, 63.4, time);
    const light = smoothstep(60.1, 61.0, time);

    // Mesa de madera oscura.
    const table = target.createLinearGradient(0, 180, 0, H);
    table.addColorStop(0, '#24170f');
    table.addColorStop(1, '#0f0906');
    target.fillStyle = table;
    target.fillRect(0, 176, W, H - 176);
    for (let i = 0; i < 10; i += 1) {
      px(target, 0, 186 + i * 17, W, 1, 'rgba(84, 54, 34, 0.22)');
    }
    // Luz de la onda entrando desde la izquierda.
    const ray = target.createLinearGradient(0, 0, W * 0.7, H);
    ray.addColorStop(0, `rgba(255, 100, 64, ${0.35 * light})`);
    ray.addColorStop(0.45, `rgba(255, 180, 140, ${0.1 * light})`);
    ray.addColorStop(1, 'rgba(255, 120, 80, 0)');
    target.fillStyle = ray;
    target.fillRect(0, 0, W, H);

    target.save();
    target.translate(W / 2, H / 2);
    target.scale(1 + push * 0.16, 1 + push * 0.16);
    target.translate(-W / 2, -H / 2);

    // Cartucho grande, casi en el centro.
    drawCartridge(304, 214, 118, 138, -0.06, '#3a5876', smoothstep(60.7, 62.6, time));
    // Mando.
    const padDissolve = smoothstep(61.0, 62.9, time);
    if (padDissolve < 1) {
      target.save();
      target.translate(438, 262);
      target.rotate(0.12);
      const w = 96;
      const h = 44;
      target.beginPath();
      target.rect(-w / 2 - 8, -h / 2 - 8, w + 16, h * (1 - padDissolve) + 8);
      target.clip();
      px(target, -w / 2, -h / 2, w, h, '#1a1d21');
      px(target, -w / 2 + 4, -h / 2 + 3, w - 8, h - 10, '#2b3037');
      px(target, -16, -6, 26, 5, '#0d0f12');
      px(target, 20, -10, 5, 14, '#0d0f12');
      px(target, 14, -4, 14, 4, '#0d0f12');
      px(target, -26, -8, 6, 4, '#6f7782');
      px(target, 30, -4, 4, 4, '#c8a24a');
      target.restore();
    }
    // Consola portátil a la izquierda.
    drawCartridge(186, 248, 62, 88, -0.2, '#2f4a56', smoothstep(61.8, 63.2, time));
    // Contactos y polvo.
    for (let i = 0; i < 20; i += 1) {
      px(target, 120 + hash2(i, 3) * 400, 200 + hash2(i, 5) * 120, 1, 1, 'rgba(255, 210, 170, 0.2)');
    }
    target.restore();

    // Defecto de la onda sobre la mesa: sombra que se traga los objetos.
    const voidGlow = smoothstep(62.2, 63.3, time);
    if (voidGlow > 0.01) {
      glow(target, W * 0.48, H * 0.55, 220, 'rgba(255, 90, 60, 0.2)', voidGlow);
    }
    const cut = smoothstep(63.0, 63.4, time);
    if (cut > 0.001) px(target, 0, 0, W, H, `rgba(255, 236, 220, ${cut})`);
  }

  function drawCity(time: number): void {
    px(target, 0, 0, W, H, '#020307');
    const waveX = lerp(-60, W + 60, smoothstep(63.3, 66.9, time));
    const drift = smoothstep(63.2, 67.4, time) * 18;

    // Cielo y luna tenue.
    const sky = target.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#050711');
    sky.addColorStop(1, '#0c1220');
    target.fillStyle = sky;
    target.fillRect(0, 0, W, H);
    drawBackdropStars(target, stars, time, 0.4);
    glow(target, 504, 66, 76, 'rgba(164, 196, 230, 0.2)', 1);
    px(target, 496, 58, 16, 16, 'rgba(210, 226, 242, 0.55)');

    // Edificios lejanos.
    for (let i = 0; i < 14; i += 1) {
      const x = i * 50 - drift * 0.4;
      const h = 90 + hash2(i, 11) * 120;
      px(target, x, H - 90 - h, 46, h + 90, i % 3 === 0 ? '#070b12' : '#050810');
      // Ventanas.
      for (let wy = H - 84 - h; wy < H - 20; wy += 12) {
        for (let wx = 0; wx < 3; wx += 1) {
          const lit = hash2(i * 3 + wx, wy) > 0.45;
          const dead = x + 8 + wx * 12 < waveX;
          if (lit && !dead) {
            px(target, x + 8 + wx * 12, wy, 4, 5, `rgba(255, 198, 118, ${0.28 + hash2(wx, wy) * 0.3})`);
          } else if (lit) {
            px(target, x + 8 + wx * 12, wy, 4, 5, 'rgba(20, 26, 36, 0.8)');
          }
        }
      }
    }

    // Edificios cercanos.
    for (let i = 0; i < 6; i += 1) {
      const x = 40 + i * 112 - drift;
      const h = 130 + hash2(i, 21) * 90;
      const y = H - h - 30;
      px(target, x, y, 92, h + 30, '#080c13');
      px(target, x + 4, y + 6, 84, h - 6, '#0b1119');
      for (let wy = y + 16; wy < H - 60; wy += 15) {
        for (let wx = 0; wx < 4; wx += 1) {
          const lit = hash2(i * 4 + wx, wy) > 0.4;
          const dead = x + 8 + wx * 20 < waveX;
          if (lit && !dead) {
            px(target, x + 8 + wx * 20, wy, 8, 6, `rgba(255, 206, 132, ${0.2 + hash2(wx, wy) * 0.35})`);
          } else if (lit) {
            px(target, x + 8 + wx * 20, wy, 8, 6, 'rgba(16, 20, 28, 0.9)');
          }
        }
      }
    }

    // Neón de una sala de juegos.
    const signX = 182 - drift;
    const signY = 128;
    px(target, signX, signY, 70, 38, '#0b1018');
    const signDead = signX + 35 < waveX;
    if (!signDead) {
      px(target, signX + 4, signY + 4, 62, 30, 'rgba(44, 18, 54, 0.9)');
      px(target, signX + 8, signY + 8, 54, 2, 'rgba(255, 100, 200, 0.7)');
      px(target, signX + 8, signY + 24, 54, 2, 'rgba(103, 232, 249, 0.65)');
      glow(target, signX + 35, signY + 19, 46, 'rgba(180, 80, 220, 0.4)', 0.8);
      // Icono de joystick.
      px(target, signX + 30, signY + 15, 4, 10, '#d7f8ff');
      px(target, signX + 26, signY + 24, 12, 3, '#d7f8ff');
    } else {
      // El vacío que dejó el neón.
      px(target, signX + 4, signY + 4, 62, 30, 'rgba(0, 0, 0, 0.85)');
      target.strokeStyle = 'rgba(80, 90, 104, 0.2)';
      target.lineWidth = 1;
      target.strokeRect(signX + 4.5, signY + 4.5, 61, 29);
      for (let i = 0; i < 14; i += 1) {
        px(target, signX + hash2(i, 3) * 62, signY + 4 + hash2(i, 5) * 30, 1, 1, 'rgba(190, 160, 200, 0.35)');
      }
    }

    // Calle mojada.
    px(target, 0, 306, W, 54, '#05070c');
    for (let i = 0; i < 26; i += 1) {
      const y = 312 + (i % 6) * 7;
      px(target, (i * 47 + time * 3) % W, y, 20 + (i % 4) * 10, 1, `rgba(120, 150, 190, ${0.05 + (i % 3) * 0.03})`);
    }

    // Frente de onda.
    const grad = target.createLinearGradient(waveX - 60, 0, waveX + 10, 0);
    grad.addColorStop(0, 'rgba(255, 90, 60, 0)');
    grad.addColorStop(0.6, 'rgba(255, 90, 60, 0.26)');
    grad.addColorStop(0.88, 'rgba(255, 238, 220, 0.55)');
    grad.addColorStop(1, 'rgba(255, 90, 60, 0)');
    target.fillStyle = grad;
    target.fillRect(waveX - 60, 0, 80, H);
    glow(target, waveX, H * 0.6, 180, 'rgba(255, 100, 64, 0.4)', 0.7);

    drawMotes(time, 0.3, 'rgba(220, 210, 230, 0.4)');
    const cut = smoothstep(67.0, 67.4, time);
    if (cut > 0.001) px(target, 0, 0, W, H, `rgba(255, 240, 226, ${cut * 0.9})`);
  }

  function drawSpaceErasure(time: number): void {
    px(target, 0, 0, W, H, '#010208');
    drawBackdropStars(target, stars, time, 0.85);
    const wave = smoothstep(67.6, 75.5, time);

    // Limbo de un planeta en la parte inferior.
    const planetGrad = target.createRadialGradient(320, 500, 40, 320, 500, 340);
    planetGrad.addColorStop(0, 'rgba(28, 62, 92, 0.5)');
    planetGrad.addColorStop(1, 'rgba(6, 14, 28, 0)');
    target.fillStyle = planetGrad;
    target.beginPath();
    target.ellipse(320, 500, 330, 220, 0, Math.PI, Math.PI * 2);
    target.fill();

    // Ondas concéntricas que se alejan.
    for (let i = 0; i < 4; i += 1) {
      const r = 40 + wave * (240 + i * 70);
      target.strokeStyle = `rgba(255, ${110 + i * 20}, 80, ${0.32 * (1 - wave * 0.7)})`;
      target.lineWidth = 2 - i * 0.4;
      target.beginPath();
      target.ellipse(320, 300, r * 1.7, r * 0.8, 0, 0, Math.PI * 2);
      target.stroke();
    }
    glow(target, 320, 300, 300, 'rgba(255, 80, 52, 0.18)', 0.5);

    // Restos flotantes que se borran: consola, cartucho, mando.
    const items = [
      { x: 190, y: 196, kind: 0, at: 68.2 },
      { x: 448, y: 150, kind: 1, at: 69.6 },
      { x: 360, y: 258, kind: 2, at: 71.2 },
    ];
    for (const item of items) {
      const alive = 1 - smoothstep(item.at, item.at + 2.4, time);
      if (alive <= 0.01) {
        // Vacío: un hueco negro con borde frío.
        target.save();
        target.globalAlpha = 0.8 * smoothstep(item.at + 2.4, item.at + 3.2, time);
        target.fillStyle = '#000000';
        target.beginPath();
        target.ellipse(item.x, item.y, 34, 22, 0, 0, Math.PI * 2);
        target.fill();
        target.strokeStyle = 'rgba(90, 116, 140, 0.2)';
        target.lineWidth = 1;
        target.stroke();
        target.restore();
        continue;
      }
      const bob = Math.sin(time * 0.5 + item.x) * 3;
      target.save();
      target.globalAlpha = alive * 0.75;
      target.translate(item.x, item.y + bob);
      target.rotate(-0.08 + item.kind * 0.06);
      if (item.kind === 0) {
        px(target, -30, -38, 60, 76, '#0a0e14');
        px(target, -24, -32, 48, 26, '#101a24');
        px(target, -20, -28, 40, 18, 'rgba(80, 140, 160, 0.35)');
        px(target, -30, 4, 60, 12, '#0c1219');
      } else if (item.kind === 1) {
        px(target, -18, -24, 36, 48, '#14171b');
        px(target, -14, -20, 28, 18, 'rgba(70, 100, 130, 0.5)');
        for (let i = 0; i < 4; i += 1) px(target, -12 + i * 7, 16, 4, 5, '#07090b');
      } else {
        px(target, -26, -12, 52, 24, '#1b1f24');
        px(target, -20, -8, 40, 16, '#2a3038');
        px(target, -12, -2, 14, 3, '#0c0e11');
        px(target, 10, -5, 8, 8, '#0c0e11');
      }
      target.restore();
      if (alive < 0.98) {
        for (let i = 0; i < 8; i += 1) {
          px(
            target,
            item.x + (hash2(i, item.x) - 0.5) * 60,
            item.y - (1 - alive) * 40 + hash2(i, item.y) * 20,
            1,
            1,
            `rgba(200, 214, 228, ${alive * 0.3})`
          );
        }
      }
    }

    // Al final, el espacio queda casi vacío.
    const empty = smoothstep(73, 77, time);
    if (empty > 0.01) px(target, 0, 0, W, H, `rgba(0, 2, 6, ${empty * 0.35})`);
  }

  /* ------------------------------------------------------------------ */
  /* ESCENA 5 · EL PLANETA Y LA FECHA                                    */
  /* ------------------------------------------------------------------ */

  function drawPlanetScene(time: number): void {
    px(target, 0, 0, W, H, '#010207');
    drawBackdropStars(target, stars, time, 0.9);
    const after = smoothstep(81.4, 82.4, time);
    const drift = smoothstep(78, 94, time);
    const planetX = 320;
    const planetY = 272 + drift * 26;
    const radius = 168 - drift * 34;

    // Atmósfera.
    glow(target, planetX, planetY, radius * 1.5, 'rgba(64, 130, 180, 0.25)', 0.8 * (1 - after * 0.4));
    // Cuerpo.
    const body = target.createRadialGradient(
      planetX - radius * 0.35,
      planetY - radius * 0.4,
      radius * 0.1,
      planetX,
      planetY,
      radius
    );
    body.addColorStop(0, after > 0.2 ? '#3b5e72' : '#4b7e96');
    body.addColorStop(0.55, '#1e3c52');
    body.addColorStop(1, '#071522');
    target.fillStyle = body;
    target.beginPath();
    target.arc(planetX, planetY, radius, 0, Math.PI * 2);
    target.fill();

    // Continentes y nubes, sólo en el lado iluminado.
    target.save();
    target.beginPath();
    target.arc(planetX, planetY, radius, 0, Math.PI * 2);
    target.clip();
    for (let i = 0; i < 9; i += 1) {
      const a = hash2(i, 3) * Math.PI * 2;
      const r = hash2(i, 5) * radius * 0.8;
      const x = planetX + Math.cos(a) * r;
      const y = planetY + Math.sin(a) * r * 0.8;
      target.beginPath();
      target.ellipse(
        x,
        y,
        12 + hash2(i, 7) * 36,
        6 + hash2(i, 9) * 20,
        a,
        0,
        Math.PI * 2
      );
      target.fillStyle = `rgba(48, 96, 82, ${0.2 + hash2(i, 11) * 0.2})`;
      target.fill();
    }
    for (let i = 0; i < 6; i += 1) {
      const y = planetY - radius * 0.6 + i * radius * 0.22;
      target.beginPath();
      target.ellipse(planetX, y, radius * 0.9, 6 + i * 1.5, -0.1, 0, Math.PI * 2);
      target.fillStyle = `rgba(190, 220, 235, ${0.035 + i * 0.008})`;
      target.fill();
    }
    // Terminador nocturno.
    const night = target.createLinearGradient(planetX - radius * 0.4, 0, planetX + radius, 0);
    night.addColorStop(0, 'rgba(0, 4, 10, 0)');
    night.addColorStop(0.55, 'rgba(0, 4, 10, 0.35)');
    night.addColorStop(1, 'rgba(0, 3, 8, 0.9)');
    target.fillStyle = night;
    target.fillRect(planetX - radius, planetY - radius, radius * 2, radius * 2);
    target.restore();

    // Onda que envuelve el planeta (antes del destello).
    const wrap = smoothstep(78.4, 81.4, time);
    if (wrap > 0.01 && after < 0.9) {
      target.save();
      target.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 3; i += 1) {
        const arc = target.createLinearGradient(planetX - radius, 0, planetX + radius, 0);
        arc.addColorStop(0, 'rgba(255, 90, 60, 0)');
        arc.addColorStop(clamp01(0.2 + wrap * 0.55), `rgba(255, 110, 70, ${0.35 * (1 - after)})`);
        arc.addColorStop(clamp01(0.32 + wrap * 0.55), `rgba(255, 240, 220, ${0.4 * (1 - after)})`);
        arc.addColorStop(1, 'rgba(255, 90, 60, 0)');
        target.strokeStyle = arc;
        target.lineWidth = 2 + i;
        target.beginPath();
        target.ellipse(planetX, planetY, radius + 6 + i * 8, radius * 0.44 + i * 4, -0.28, 0, Math.PI * 2);
        target.stroke();
      }
      target.restore();
    }

    // Destello blanco.
    const flash = 1 - smoothstep(81.4, 82.2, time);
    if (flash > 0.001) px(target, 0, 0, W, H, `rgba(255, 255, 255, ${flash})`);

    // Después: silencio, planeta oscuro y cámara que se aleja lentamente.
    if (after > 0.01) {
      target.fillStyle = `rgba(1, 3, 9, ${after * 0.22})`;
      target.fillRect(0, 0, W, H);
    }

    // Fundido al final del acto.
    const fade = smoothstep(92.4, 94, time);
    if (fade > 0.001) px(target, 0, 0, W, H, `rgba(0, 0, 0, ${fade})`);
  }

  function renderAtTime(elapsedSec: number): void {
    const time = Math.max(0, Math.min(94, elapsedSec));
    if (time < 0.9) {
      px(target, 0, 0, W, H, '#000000');
      return;
    }
    if (time < 24) {
      drawSanctum(time);
      return;
    }
    if (time < 53.2) {
      drawVillain(time);
      return;
    }
    if (time < 55.9) {
      drawCorridor(time);
      return;
    }
    if (time < 60.0) {
      drawArcade(time);
      return;
    }
    if (time < 63.4) {
      drawCartridges(time);
      return;
    }
    if (time < 67.4) {
      drawCity(time);
      return;
    }
    if (time < 78) {
      drawSpaceErasure(time);
      return;
    }
    drawPlanetScene(time);
  }

  return { renderAtTime };
}
