/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * COMPONENTE 'PowersMenu' — Menú de Poderes [K] de PIXELVERSE.
 *
 * Rediseño premium con estética RPG de Game Boy Advance:
 * - Panel compacto de dos columnas: lista de habilidades + ficha de detalle.
 * - Ilustraciones pixel art propias (dibujadas en canvas) para cada poder.
 * - Barra de recurso segmentada, estados de desbloqueo y mejoras existentes.
 * - Navegación con clic y flechas ↑/↓; toda la lógica original se conserva.
 *
 * Este archivo controla ÚNICAMENTE la ventana modal de la tecla K.
 * El HUD de poderes durante la exploración vive en Origin70sIsland.tsx.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Zap,
  Flame,
  Wrench,
  Radio,
  CheckCircle2,
  Lock,
  Sparkles,
  X,
  ChevronRight,
  ShieldAlert,
  Gem,
} from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { PixelverseProgressState, getAvailableDiamonds } from '../memories/progressionState';

/* ============================================================================
   ILUSTRACIONES PIXEL ART (CANVAS DE BAJA RESOLUCIÓN ESCALADO)
   ============================================================================ */

const ART_W = 224;
const ART_H = 132;

type ArtVariant = 'pong' | 'lantern' | 'scanner' | 'welder';

/** Generador pseudoaleatorio determinista para partículas y texturas. */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const STARS = (() => {
  const rand = mulberry32(1337);
  return Array.from({ length: 54 }, () => ({
    x: Math.floor(rand() * ART_W),
    y: Math.floor(rand() * 100),
    s: rand() > 0.82 ? 2 : 1,
    p: rand() * Math.PI * 2,
  }));
})();

const DUST = (() => {
  const rand = mulberry32(9042);
  return Array.from({ length: 20 }, () => ({
    x: 24 + rand() * 176,
    y: 22 + rand() * 92,
    p: rand() * Math.PI * 2,
    s: rand() > 0.7 ? 2 : 1,
  }));
})();

const PIXELS = (() => {
  const rand = mulberry32(5150);
  return Array.from({ length: 16 }, () => ({
    x: rand() * ART_W,
    y: rand() * ART_H,
    p: rand() * Math.PI * 2,
    s: rand() > 0.6 ? 2 : 1,
  }));
})();

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
}

function poly(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}

function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width = 1
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  inner: string,
  mid: string,
  outer: string
) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, inner);
  g.addColorStop(0.5, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function rounded(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function vignette(ctx: CanvasRenderingContext2D) {
  const g = ctx.createRadialGradient(ART_W / 2, ART_H / 2, 36, ART_W / 2, ART_H / 2, 150);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ART_W, ART_H);
}

function rune(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, seed: number) {
  const rand = mulberry32(seed);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  const a = rand() * Math.PI * 2;
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
  ctx.moveTo(x + 1, y + 2);
  ctx.lineTo(x + 4, y - 1);
  ctx.moveTo(x - 1, y - 3);
  ctx.lineTo(x + 3, y + 1);
  ctx.stroke();
}

/* ---------------------------- ESCENA 1: PONG ---------------------------- */

function drawPongScene(ctx: CanvasRenderingContext2D, t: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, ART_H);
  sky.addColorStop(0, '#060412');
  sky.addColorStop(0.6, '#190a2c');
  sky.addColorStop(0.72, '#2a1038');
  sky.addColorStop(1, '#080512');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, ART_W, ART_H);

  glow(ctx, 166, 40, 66, 'rgba(139,92,246,0.34)', 'rgba(109,40,217,0.16)', 'rgba(109,40,217,0)');
  glow(ctx, 52, 52, 42, 'rgba(236,72,153,0.16)', 'rgba(190,24,93,0.08)', 'rgba(190,24,93,0)');

  // Planeta anillado de fondo
  glow(ctx, 46, 40, 34, 'rgba(167,139,250,0.30)', 'rgba(109,40,217,0.12)', 'rgba(109,40,217,0)');
  ctx.fillStyle = '#241343';
  ctx.beginPath();
  ctx.arc(46, 40, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a1f63';
  ctx.beginPath();
  ctx.arc(41, 35, 11, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, 38, 34, 9, 2, '#5b3392');
  px(ctx, 33, 42, 12, 2, '#4a2779');
  ctx.strokeStyle = 'rgba(216,180,254,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(46, 42, 24, 6, -0.32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(216,180,254,0.22)';
  ctx.beginPath();
  ctx.ellipse(46, 42, 28, 8, -0.32, 0, Math.PI * 2);
  ctx.stroke();

  for (const st of STARS) {
    if (st.y > 92) continue;
    const twinkle = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.6 + st.p));
    ctx.globalAlpha = twinkle;
    px(ctx, st.x, st.y, st.s, st.s, st.s > 1 ? '#fef3c7' : '#c7d2fe');
  }
  ctx.globalAlpha = 1;

  // Horizonte luminoso
  glow(ctx, 116, 98, 96, 'rgba(251,191,36,0.24)', 'rgba(217,119,6,0.10)', 'rgba(217,119,6,0)');

  // Islas lejanas
  poly(ctx, [[-10, 99], [24, 86], [52, 99]], '#150b24');
  poly(ctx, [[150, 99], [178, 84], [210, 99]], '#170c26');
  poly(ctx, [[96, 99], [108, 92], [122, 99]], '#140a22');
  line(ctx, 24, 86, 52, 99, 'rgba(251,191,36,0.55)');
  line(ctx, 178, 84, 210, 99, 'rgba(251,191,36,0.35)');

  // Nubes bajas del horizonte
  for (let i = 0; i < 5; i++) {
    const cx = 12 + i * 46 + Math.sin(t * 0.2 + i) * 4;
    const cy = 90 + (i % 3) * 3;
    px(ctx, cx, cy, 34, 2, 'rgba(76,29,149,0.55)');
    px(ctx, cx + 8, cy - 2, 22, 2, 'rgba(109,40,217,0.35)');
    px(ctx, cx + 4, cy + 2, 26, 1, 'rgba(192,132,252,0.18)');
  }
  px(ctx, 0, 97, ART_W, 1, 'rgba(253,224,71,0.30)');

  // Mar cósmico
  px(ctx, 0, 99, ART_W, 33, '#070411');
  for (let i = 0; i < 11; i++) {
    const y = 102 + i * 2.7;
    const w = 42 - i * 2.8;
    const x = 120 - w / 2 + Math.sin(t * 1.3 + i * 0.8) * 4;
    px(ctx, x, y, w, 1, i % 2 === 0 ? 'rgba(250,204,21,0.30)' : 'rgba(167,139,250,0.20)');
    px(ctx, x + w * 0.2, y + 1, w * 0.5, 1, 'rgba(217,119,6,0.10)');
  }

  // Estela de vuelo
  for (let i = 0; i < 16; i++) {
    const x = 88 - i * 4.4;
    const y = 80 + Math.sin(t * 3 - i * 0.55) * 2.2;
    const alpha = Math.max(0, 0.5 - i * 0.03);
    px(ctx, x, y, Math.max(1, 5 - i * 0.28), 1, `rgba(253,224,71,${alpha.toFixed(2)})`);
    if (i % 4 === 0) px(ctx, x + 2, y + 2, 1, 1, `rgba(255,255,255,${(alpha * 0.8).toFixed(2)})`);
  }

  // Halo bajo la tabla
  glow(ctx, 124, 90, 44, 'rgba(253,224,71,0.55)', 'rgba(217,119,6,0.22)', 'rgba(217,119,6,0)');
  glow(ctx, 124, 92, 62, 'rgba(56,189,248,0.18)', 'rgba(14,116,144,0.08)', 'rgba(14,116,144,0)');

  // Tabla-aeropatín (pala de Pong horizontal)
  ctx.save();
  ctx.translate(124, 85);
  ctx.rotate(-0.08);
  rounded(ctx, -33, -7, 66, 14, 6, '#6b4310');
  rounded(ctx, -31, -5, 62, 10, 5, '#f6cf5f');
  px(ctx, -27, -5, 54, 3, '#fdf0ac');
  px(ctx, -27, 3, 54, 1, '#c98a1c');
  px(ctx, -1, -5, 3, 10, '#d9a52e');
  px(ctx, -21, -2, 3, 3, '#fff8d0');
  px(ctx, 18, -2, 3, 3, '#fff8d0');
  rounded(ctx, -33, 4, 66, 3, 2, 'rgba(56,189,248,0.55)');
  ctx.restore();

  // Surfista (silueta con acentos turquesa)
  const bob = Math.sin(t * 2.4) * 1;
  const bx = 120;
  const by = 77 + bob;
  // piernas
  px(ctx, bx - 5, by - 12, 4, 12, '#111827');
  px(ctx, bx + 3, by - 12, 4, 12, '#111827');
  px(ctx, bx - 7, by - 2, 7, 3, '#0b1220');
  px(ctx, bx + 3, by - 2, 7, 3, '#0b1220');
  // torso
  px(ctx, bx - 7, by - 26, 15, 15, '#0f8f86');
  px(ctx, bx - 7, by - 26, 15, 3, '#2dd4bf');
  // brazos extendidos
  px(ctx, bx - 17, by - 24, 11, 3, '#0e766e');
  px(ctx, bx + 8, by - 24, 12, 3, '#0e766e');
  px(ctx, bx - 18, by - 24, 3, 3, '#f0c69a');
  px(ctx, bx + 18, by - 24, 3, 3, '#f0c69a');
  // bufanda al viento
  const sway = Math.sin(t * 4) * 2;
  px(ctx, bx - 14, by - 28, 8, 3, '#e879f9');
  px(ctx, bx - 24, by - 27 + sway, 11, 2, '#c026d3');
  px(ctx, bx - 33, by - 29 + sway * 1.5, 10, 2, '#a21caf');
  // cabeza
  px(ctx, bx - 5, by - 36, 10, 9, '#f0c69a');
  px(ctx, bx - 6, by - 38, 12, 5, '#2b1a12');
  px(ctx, bx + 1, by - 33, 2, 2, '#1f2937');
  ctx.globalAlpha = 0.6;
  px(ctx, bx + 5, by - 33, 1, 2, '#e0b48c');
  ctx.globalAlpha = 1;

  // Destellos
  for (let i = 0; i < 6; i++) {
    const a = t * 0.9 + i * 1.7;
    const x = 124 + Math.cos(a) * (36 + i * 4);
    const y = 82 + Math.sin(a * 1.3) * 18;
    const alpha = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3 + i));
    px(ctx, x, y, i % 3 === 0 ? 2 : 1, 1, `rgba(254,240,138,${alpha.toFixed(2)})`);
  }

  vignette(ctx);
}

/* --------------------------- ESCENA 2: LÁMPARA --------------------------- */

function drawLanternScene(ctx: CanvasRenderingContext2D, t: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, ART_H);
  bg.addColorStop(0, '#070604');
  bg.addColorStop(0.55, '#150e07');
  bg.addColorStop(1, '#0b0805');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ART_W, ART_H);

  // Pared de cueva
  px(ctx, 0, 14, ART_W, 104, '#171008');
  poly(ctx, [[0, 0], [52, 0], [44, 40], [56, 76], [34, 118], [0, 132]], '#100b06');
  poly(ctx, [[224, 0], [172, 0], [182, 44], [168, 82], [190, 120], [224, 132]], '#0f0a05');
  poly(ctx, [[0, 0], [224, 0], [224, 10], [178, 18], [126, 8], [70, 20], [0, 9]], '#0a0704');
  for (let i = 0; i < 7; i++) {
    const x = 24 + i * 28;
    poly(
      ctx,
      [[x, 0], [x + 7, 0], [x + 3 + (i % 3), 12 + (i % 4) * 4]],
      i % 2 === 0 ? '#171008' : '#1d150c'
    );
  }
  // Vetas de roca
  for (let i = 0; i < 9; i++) {
    const y = 24 + i * 10;
    line(ctx, 8, y, 46, y + 4, 'rgba(90,66,38,0.12)');
    line(ctx, 178, y + 2, 216, y, 'rgba(90,66,38,0.10)');
  }

  // Inscripciones tenues
  ctx.globalAlpha = 0.35 + Math.sin(t * 1.2) * 0.12;
  for (let i = 0; i < 4; i++) rune(ctx, 186, 44 + i * 12, '#e0a94e', 31 + i);
  for (let i = 0; i < 3; i++) rune(ctx, 36, 56 + i * 12, '#b3792f', 77 + i);
  ctx.globalAlpha = 1;

  // Piso
  px(ctx, 0, 112, ART_W, 20, '#0b0805');
  line(ctx, 0, 112, ART_W, 112, 'rgba(120,88,44,0.28)');
  // Charco reflectante
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(217,119,6,0.28)';
  ctx.beginPath();
  ctx.ellipse(112, 121, 30, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Rayos de luz
  const ray = 0.05 + Math.sin(t * 2.2) * 0.012;
  ctx.globalAlpha = ray;
  poly(ctx, [[112, 72], [12, 118], [56, 126]], '#fbbf24');
  poly(ctx, [[112, 72], [212, 118], [170, 126]], '#fbbf24');
  ctx.globalAlpha = 1;

  // Resplandor de la lámpara
  const flicker = 1 + Math.sin(t * 6.4) * 0.05 + Math.sin(t * 15.7) * 0.025;
  glow(ctx, 112, 74, 70 * flicker, 'rgba(253,224,71,0.55)', 'rgba(217,119,6,0.24)', 'rgba(120,53,15,0)');
  glow(ctx, 112, 74, 28 * flicker, 'rgba(255,251,235,0.55)', 'rgba(251,191,36,0.28)', 'rgba(251,191,36,0)');

  // Estructura del farol
  // Asa
  ctx.strokeStyle = '#c9a24a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(112, 48, 9, Math.PI, Math.PI * 2);
  ctx.stroke();
  px(ctx, 110, 38, 4, 5, '#e0b95c');
  // Tapa
  poly(ctx, [[100, 56], [124, 56], [120, 63], [104, 63]], '#7c4d13');
  px(ctx, 100, 55, 24, 2, '#d9a94e');
  // Cristal
  const glassGrad = ctx.createLinearGradient(0, 63, 0, 85);
  glassGrad.addColorStop(0, '#fde68a');
  glassGrad.addColorStop(0.55, '#fbbf24');
  glassGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = glassGrad;
  ctx.fillRect(105, 63, 14, 21);
  // Llama
  const flameH = 9 + Math.sin(t * 7.3) * 1.7 + Math.sin(t * 13.1) * 0.9;
  px(ctx, 110, 82 - flameH, 5, flameH, '#fdba74');
  px(ctx, 111, 83 - flameH * 0.78, 3, flameH * 0.78, '#fef3c7');
  px(ctx, 112, 81 - flameH * 0.45, 1, flameH * 0.45, '#ffffff');
  // Marco
  px(ctx, 103, 62, 2, 23, '#a9762a');
  px(ctx, 119, 62, 2, 23, '#a9762a');
  px(ctx, 103, 72, 18, 2, '#8a5a1b');
  px(ctx, 104, 62, 1, 10, '#f3d48b');
  // Base
  poly(ctx, [[103, 84], [121, 84], [125, 92], [99, 92]], '#7a4a16');
  px(ctx, 99, 91, 26, 2, '#d9a94e');
  px(ctx, 101, 93, 5, 2, '#5c3a12');
  px(ctx, 118, 93, 5, 2, '#5c3a12');

  // Polvo flotante
  for (const d of DUST) {
    const y = ((d.y - t * 3.2 + 260) % 120) + 8;
    const x = d.x + Math.sin(t * 0.7 + d.p) * 5;
    const alpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.4 + d.p));
    ctx.globalAlpha = alpha;
    px(ctx, x, y, d.s, d.s, '#fde68a');
  }
  ctx.globalAlpha = 1;

  // Brasas ascendentes
  for (let i = 0; i < 7; i++) {
    const yy = 80 - ((t * 12 + i * 16) % 62);
    const xx = 112 + Math.sin(t * 1.6 + i * 2.1) * (6 + i * 1.6);
    ctx.globalAlpha = Math.max(0, yy / 100);
    px(ctx, xx, yy, 1, 2, i % 2 ? '#fbbf24' : '#f97316');
  }
  ctx.globalAlpha = 1;

  vignette(ctx);
}

/* --------------------------- ESCENA 3: BUSCADOR --------------------------- */

function drawScannerScene(ctx: CanvasRenderingContext2D, t: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, ART_H);
  bg.addColorStop(0, '#030d16');
  bg.addColorStop(0.65, '#061a26');
  bg.addColorStop(1, '#03101a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ART_W, ART_H);

  // Muro de fondo
  px(ctx, 0, 4, ART_W, 86, '#06131c');
  for (let i = 0; i < 5; i++) {
    line(ctx, 0, 20 + i * 16, ART_W, 20 + i * 16, 'rgba(56,189,248,0.06)');
  }
  for (let i = 0; i < 11; i++) {
    line(ctx, 14 + i * 20, 4, 14 + i * 20, 90, 'rgba(56,189,248,0.045)');
  }

  // Puerta secreta revelada
  glow(ctx, 162, 58, 58, 'rgba(56,189,248,0.20)', 'rgba(14,116,144,0.10)', 'rgba(14,116,144,0)');
  rounded(ctx, 137, 28, 50, 60, 22, '#04161f');
  ctx.strokeStyle = 'rgba(125,211,252,0.85)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(136.5, 27.5, 51, 61, 22);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(56,189,248,0.35)';
  ctx.beginPath();
  ctx.roundRect(141.5, 33.5, 41, 51, 18);
  ctx.stroke();
  const pulse = 0.4 + 0.35 * (0.5 + 0.5 * Math.sin(t * 2.4));
  ctx.globalAlpha = pulse;
  for (let i = 0; i < 5; i++) rune(ctx, 150 + (i % 2) * 14, 44 + i * 8, '#7dd3fc', 200 + i);
  px(ctx, 160, 78, 1, 8, 'rgba(125,211,252,0.5)');
  ctx.globalAlpha = 1;

  // Piso en perspectiva
  px(ctx, 0, 90, ART_W, 42, '#04121a');
  for (let i = -8; i <= 8; i++) {
    line(ctx, 112 + i * 4, 90, 112 + i * 28, 132, 'rgba(56,189,248,0.10)');
  }
  for (let i = 0; i < 5; i++) {
    const y = 92 + Math.pow(i, 1.7) * 2.4;
    line(ctx, 0, y, ART_W, y, `rgba(56,189,248,${(0.12 - i * 0.015).toFixed(2)})`);
  }

  // Ondas de sonar
  const originX = 84;
  const originY = 74;
  for (let k = 0; k < 3; k++) {
    const radius = 9 + ((t * 24 + k * 24) % 68);
    const alpha = Math.max(0, 1 - radius / 78) * 0.7;
    ctx.strokeStyle = `rgba(56,189,248,${alpha.toFixed(2)})`;
    ctx.lineWidth = radius > 50 ? 1 : 2;
    ctx.beginPath();
    ctx.arc(originX, originY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Cono del haz
  ctx.globalAlpha = 0.10 + Math.sin(t * 2.6) * 0.03;
  poly(ctx, [[originX + 8, originY - 10], [137, 34], [137, 86], [originX + 8, originY + 8]], '#38bdf8');
  ctx.globalAlpha = 1;

  // Dispositivo
  const bob = Math.sin(t * 1.8) * 0.8;
  const dx = 68;
  const dy = 63 + bob;
  glow(ctx, dx + 18, dy + 12, 26, 'rgba(56,189,248,0.30)', 'rgba(14,116,144,0.14)', 'rgba(14,116,144,0)');
  rounded(ctx, dx + 2, dy + 4, 34, 26, 4, '#081a24');
  rounded(ctx, dx, dy, 34, 26, 4, '#0d2733');
  ctx.strokeStyle = '#2b728a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(dx + 0.5, dy + 0.5, 33, 25, 4);
  ctx.stroke();
  // Pantalla
  const screenGrad = ctx.createLinearGradient(0, dy + 3, 0, dy + 15);
  screenGrad.addColorStop(0, '#67e8f9');
  screenGrad.addColorStop(1, '#0891b2');
  ctx.fillStyle = screenGrad;
  ctx.fillRect(dx + 4, dy + 3, 26, 12);
  px(ctx, dx + 4, dy + 14, 26, 1, '#04222b');
  // Onda en pantalla
  ctx.strokeStyle = '#042f3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 26; i += 2) {
    const yy = dy + 9 + Math.sin(t * 5 + i * 0.7) * 3;
    if (i === 0) ctx.moveTo(dx + 4 + i, yy);
    else ctx.lineTo(dx + 4 + i, yy);
  }
  ctx.stroke();
  // Botones
  px(ctx, dx + 5, dy + 19, 4, 3, '#facc15');
  px(ctx, dx + 11, dy + 19, 4, 3, '#2dd4bf');
  px(ctx, dx + 17, dy + 19, 4, 3, '#94a3b8');
  // Antena
  line(ctx, dx + 22, dy + 1, dx + 30, dy - 13, '#8ea9b5', 1);
  px(ctx, dx + 29, dy - 15, 3, 3, '#7dd3fc');
  glow(ctx, dx + 30, dy - 13, 8, 'rgba(125,211,252,0.65)', 'rgba(56,189,248,0.18)', 'rgba(56,189,248,0)');

  // Datos flotantes
  for (const p of PIXELS) {
    const x = p.x + Math.sin(t * 0.6 + p.p) * 6;
    const y = ((p.y - t * 5 + 160) % 120) + 6;
    ctx.globalAlpha = 0.18 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2 + p.p));
    px(ctx, x, y, p.s, p.s, '#7dd3fc');
  }
  ctx.globalAlpha = 1;

  vignette(ctx);
}

/* --------------------------- ESCENA 4: SOLDADOR --------------------------- */

function drawWelderScene(ctx: CanvasRenderingContext2D, t: number) {
  const bg = ctx.createLinearGradient(0, 0, 0, ART_H);
  bg.addColorStop(0, '#02100b');
  bg.addColorStop(0.65, '#062018');
  bg.addColorStop(1, '#03130d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, ART_W, ART_H);

  // Banco de trabajo
  px(ctx, 0, 94, ART_W, 38, '#04160f');
  line(ctx, 0, 94, ART_W, 94, 'rgba(95,214,168,0.18)');

  // Placa de circuito
  rounded(ctx, 12, 62, 200, 60, 3, '#0a3a2a');
  rounded(ctx, 12, 62, 200, 3, 2, '#14573c');
  ctx.strokeStyle = 'rgba(20,87,60,0.65)';
  ctx.lineWidth = 1;
  ctx.strokeRect(12.5, 62.5, 199, 59);

  // Pistas de cobre
  const traces: Array<Array<[number, number]>> = [
    [[20, 74], [58, 74], [58, 88], [96, 88]],
    [[20, 100], [48, 100], [48, 112], [88, 112]],
    [[126, 70], [158, 70], [158, 84], [196, 84]],
    [[118, 104], [146, 104], [146, 96], [188, 96]],
    [[24, 86], [40, 86], [40, 92], [58, 92]],
  ];
  for (const pts of traces) {
    ctx.strokeStyle = '#a3653a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
    ctx.strokeStyle = '#d99a5b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1] - 1);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1] - 1);
    ctx.stroke();
    for (const p of pts) px(ctx, p[0] - 2, p[1] - 2, 4, 4, '#e7b268');
  }

  // Chips y componentes
  rounded(ctx, 30, 106, 26, 12, 1, '#0d1720');
  for (let i = 0; i < 5; i++) {
    px(ctx, 32 + i * 5, 104, 2, 2, '#c8a25a');
    px(ctx, 32 + i * 5, 118, 2, 2, '#c8a25a');
  }
  rounded(ctx, 158, 66, 24, 12, 1, '#0d1720');
  for (let i = 0; i < 5; i++) {
    px(ctx, 160 + i * 4.5, 64, 2, 2, '#c8a25a');
    px(ctx, 160 + i * 4.5, 78, 2, 2, '#c8a25a');
  }
  // Condensadores
  for (const [cx, cy] of [[120, 74], [70, 66], [190, 112]] as const) {
    ctx.fillStyle = '#123a4a';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b6478';
    ctx.lineWidth = 1;
    ctx.stroke();
    px(ctx, cx - 1, cy - 1, 2, 2, '#7dd3fc');
  }

  // Resplandor del punto de soldadura
  const contactX = 112;
  const contactY = 80;
  const flick = 0.85 + Math.sin(t * 9.1) * 0.1 + Math.sin(t * 21.3) * 0.05;
  glow(ctx, contactX, contactY, 40 * flick, 'rgba(167,243,208,0.55)', 'rgba(45,212,191,0.24)', 'rgba(16,185,129,0)');
  glow(ctx, contactX, contactY, 16 * flick, 'rgba(236,254,255,0.85)', 'rgba(94,234,212,0.30)', 'rgba(94,234,212,0)');

  // Estela de humo
  for (let i = 0; i < 6; i++) {
    const yy = contactY - 6 - ((t * 9 + i * 9) % 54);
    const xx = contactX + Math.sin(t * 1.1 + i * 0.9) * (3 + i * 1.1);
    const alpha = Math.max(0, 0.30 - (contactY - yy) * 0.004);
    px(ctx, xx, yy, 2 + (i % 2), 2, `rgba(148,163,184,${alpha.toFixed(2)})`);
  }

  // Soldador (diagonal)
  ctx.save();
  ctx.translate(30, 26);
  ctx.rotate(0.56);
  // Mango
  rounded(ctx, 0, -7, 30, 14, 3, '#1b2430');
  px(ctx, 2, -6, 26, 3, '#374151');
  px(ctx, 4, -6, 4, 12, '#0f172a');
  px(ctx, 12, -6, 4, 12, '#0f172a');
  rounded(ctx, 28, -4, 8, 8, 2, '#4b5563');
  // Eje metálico
  const shaft = ctx.createLinearGradient(0, -3, 0, 3);
  shaft.addColorStop(0, '#e5e7eb');
  shaft.addColorStop(0.5, '#9ca3af');
  shaft.addColorStop(1, '#4b5563');
  ctx.fillStyle = shaft;
  ctx.fillRect(36, -3, 34, 6);
  px(ctx, 36, -3, 34, 1, '#f9fafb');
  // Punta
  ctx.fillStyle = '#c2410c';
  ctx.fillRect(70, -2, 12, 4);
  px(ctx, 82, -1.5, 8, 3, '#fbbf24');
  px(ctx, 88, -1, 3, 2, '#fff7ed');
  ctx.restore();

  // Chispa de soldadura
  const rays = 6;
  ctx.globalAlpha = flick;
  for (let i = 0; i < rays; i++) {
    const a = (Math.PI * 2 * i) / rays + Math.sin(t * 6 + i) * 0.15;
    const len = 4 + ((i * 3 + Math.floor(t * 12)) % 7);
    line(
      ctx,
      contactX + Math.cos(a) * 2,
      contactY + Math.sin(a) * 2,
      contactX + Math.cos(a) * len,
      contactY + Math.sin(a) * len,
      i % 2 === 0 ? '#a7f3d0' : '#fef3c7',
      1
    );
  }
  px(ctx, contactX - 1, contactY - 1, 3, 3, '#ffffff');
  ctx.globalAlpha = 1;

  // Chispas verdes
  for (let i = 0; i < 6; i++) {
    const a = t * 2.2 + i * 1.1;
    const rad = 8 + ((i * 5 + t * 14) % 18);
    const x = contactX + Math.cos(a) * rad;
    const y = contactY + Math.sin(a) * rad * 0.6 - 2;
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 5 + i);
    px(ctx, x, y, 1 + (i % 2), 1, '#5eead4');
  }
  ctx.globalAlpha = 1;

  vignette(ctx);
}

const ART_PAINTERS: Record<ArtVariant, (ctx: CanvasRenderingContext2D, t: number) => void> = {
  pong: drawPongScene,
  lantern: drawLanternScene,
  scanner: drawScannerScene,
  welder: drawWelderScene,
};

function PowerArt({
  variant,
  animate = true,
  className = '',
}: {
  variant: ArtVariant;
  animate?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = ART_W;
    canvas.height = ART_H;
    ctx.imageSmoothingEnabled = false;

    const painter = ART_PAINTERS[variant];
    let animId = 0;
    let last = 0;

    if (!animate) {
      painter(ctx, 0.9);
      return;
    }

    const render = (now: number) => {
      if (now - last > 33) {
        last = now;
        ctx.clearRect(0, 0, ART_W, ART_H);
        painter(ctx, now / 1000);
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [variant, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={ART_W}
      height={ART_H}
      aria-hidden="true"
      className={`block w-full h-full [image-rendering:pixelated] ${className}`}
    />
  );
}

/* ============================================================================
   MEDIDOR DE RECURSO SEGMENTADO (ESTILO GBA)
   ============================================================================ */

function SegmentEnergyBar({
  current,
  max,
  label,
  fillHex,
}: {
  current: number;
  max: number;
  label: string;
  fillHex: string;
}) {
  const pct = Math.min(100, Math.max(0, (current / Math.max(1, max)) * 100));
  const totalBlocks = 12;
  const filledBlocks = Math.round((pct / 100) * totalBlocks);

  return (
    <div className="space-y-1.5 rounded-[4px] border border-[#2a3547] bg-[#070c15]/80 px-2.5 py-2">
      <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.14em]">
        <span className="text-[#9fb0c4]">{label}</span>
        <span className="font-mono tabular-nums" style={{ color: fillHex }}>
          {current}
          <span className="text-[#5f7088]"> / {max}</span>
        </span>
      </div>

      <div className="flex h-[9px] gap-[2px] rounded-[1px] border border-[#0b1018] bg-[#04070c] p-[2px]">
        {Array.from({ length: totalBlocks }).map((_, idx) => {
          const isFilled = idx < filledBlocks;
          return (
            <div
              key={idx}
              className="flex-1 rounded-[1px] transition-colors duration-200"
              style={{
                backgroundColor: isFilled ? fillHex : '#141c28',
                boxShadow: isFilled ? `0 0 4px ${fillHex}66, inset 0 -1px 0 rgba(0,0,0,0.35)` : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
   ESTRUCTURA DE DATOS Y COMPONENTE PRINCIPAL 'PowersMenu'
   ============================================================================ */

export interface PowerSpec {
  id: 'pong-hoverboard' | 'phosphor-lantern' | 'secret-scanner' | 'circuit-welder';
  title: string;
  subtitle: string;
  categoryLabel: string;
  accentHex: string;
  borderHex: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  artVariant: ArtVariant;
  resourceLabel: string;
  description: string;
  utility: string;
  requirements: string;
  isUnlocked: boolean;
  currentEnergy: number;
  maxEnergy: number;
  costLabel: string;
  actionButtonText: string;
  upgrades: {
    id: string;
    name: string;
    description: string;
    costDiamonds: number;
    purchased: boolean;
  }[];
}

export interface PowersMenuProps {
  progressState: PixelverseProgressState;
  allUnlocked: boolean;
  onClose: () => void;
  onInvokeFlight: () => void;
  onToggleLantern: () => void;
  onUseScanner: () => void;
  onUseWelder: () => void;
  onUpgradePower: (upgradeId: string, costDiamonds: number) => void;
}

export function PowersMenu({
  progressState,
  allUnlocked,
  onClose,
  onInvokeFlight,
  onToggleLantern,
  onUseScanner,
  onUseWelder,
  onUpgradePower,
}: PowersMenuProps) {
  const [selectedId, setSelectedId] = useState<PowerSpec['id']>('pong-hoverboard');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const powersData = progressState.rpg.powersState ?? {
    flightFuel: 100,
    maxFlightFuel: 100,
    lanternBattery: 100,
    maxLanternBattery: 100,
    scannerEnergy: 100,
    maxScannerEnergy: 100,
    welderEnergy: 100,
    maxWelderEnergy: 100,
    upgradesPurchased: [],
  };

  const inventory = progressState.rpg.inventoryItems;
  const abilities = progressState.island70s.abilitiesUnlocked;
  const availableDiamonds = getAvailableDiamonds(progressState);

  const pongUnlocked =
    allUnlocked ||
    abilities.includes('pong-hoverboard') ||
    inventory.includes('item-barra-pong') ||
    Boolean(progressState.games['pong']?.memoryUnlocked);

  const lanternUnlocked =
    allUnlocked ||
    abilities.includes('phosphor-lantern') ||
    inventory.includes('item-lampara-fosforo');

  const scannerUnlocked =
    allUnlocked ||
    abilities.includes('secret-scanner') ||
    inventory.includes('item-escaner-frecuencias');

  const welderUnlocked =
    allUnlocked ||
    abilities.includes('circuit-welder') ||
    inventory.includes('item-soldador-logico');

  const upgradesPurchased = powersData.upgradesPurchased ?? [];

  const powerList: PowerSpec[] = [
    {
      id: 'pong-hoverboard',
      title: 'Barra de Pong',
      subtitle: 'Vuelo Astral · 1972',
      categoryLabel: 'HABILIDAD DE VUELO',
      accentHex: '#f2c14e',
      borderHex: '#a8741a',
      icon: Compass,
      artVariant: 'pong',
      resourceLabel: 'Combustible',
      description:
        'Pala de Pong (1972) canalizada como aeropatín para sobrevolar libremente la isla.',
      utility: 'Cruza abismos, agua y elevaciones inaccesibles a pie.',
      requirements: 'Victoria en Pong (1972) por 3 goles.',
      isUnlocked: pongUnlocked,
      currentEnergy: Math.round(powersData.flightFuel),
      maxEnergy: powersData.maxFlightFuel,
      costLabel: upgradesPurchased.includes('upg-flight-efficiency-1')
        ? '5 Combustible / seg en vuelo'
        : '8 Combustible / seg en vuelo',
      actionButtonText: 'INVOCAR VUELO [F]',
      upgrades: [
        {
          id: 'upg-flight-tank-1',
          name: 'Tanque Estelar (+50 Capacidad)',
          description: 'Aumenta el combustible total a 150 unidades.',
          costDiamonds: 2,
          purchased: upgradesPurchased.includes('upg-flight-tank-1'),
        },
        {
          id: 'upg-flight-efficiency-1',
          name: 'Propulsor Eficiente (-35% Consumo)',
          description: 'Reduce el consumo a 5 unidades/seg.',
          costDiamonds: 3,
          purchased: upgradesPurchased.includes('upg-flight-efficiency-1'),
        },
      ],
    },
    {
      id: 'phosphor-lantern',
      title: 'Lámpara de Fósforo',
      subtitle: 'Resonador Fotónico',
      categoryLabel: 'HERRAMIENTA FOTÓNICA',
      accentHex: '#f0a33c',
      borderHex: '#9c5a12',
      icon: Flame,
      artVariant: 'lantern',
      resourceLabel: 'Batería',
      description:
        'Farol de fósforo ámbar para iluminar cavernas y abrir cofres en la penumbra.',
      utility: 'Disipa la oscuridad e ilumina grutas subterráneas.',
      requirements: 'Obtenida en el Archivo de la Isla del Origen.',
      isUnlocked: lanternUnlocked,
      currentEnergy: Math.round(powersData.lanternBattery),
      maxEnergy: powersData.maxLanternBattery,
      costLabel: '1 Batería / 5 seg activa',
      actionButtonText: progressState.rpg.lanternActive ? 'APAGAR LÁMPARA [L]' : 'ENCENDER LÁMPARA [L]',
      upgrades: [
        {
          id: 'upg-lantern-battery-1',
          name: 'Acumulador de Ámbar (+50 Batería)',
          description: 'Eleva la batería total a 150 unidades.',
          costDiamonds: 1,
          purchased: upgradesPurchased.includes('upg-lantern-battery-1'),
        },
        {
          id: 'upg-lantern-radius-1',
          name: 'Foco de Difusión (+40% Radio)',
          description: 'Amplía el rango de visión iluminado.',
          costDiamonds: 2,
          purchased: upgradesPurchased.includes('upg-lantern-radius-1'),
        },
      ],
    },
    {
      id: 'secret-scanner',
      title: 'Buscador GBC',
      subtitle: 'Pulso Armónico TTL',
      categoryLabel: 'RADAR DE ARTEFACTOS',
      accentHex: '#57c7e8',
      borderHex: '#1d6f8c',
      icon: Radio,
      artVariant: 'scanner',
      resourceLabel: 'Energía',
      description:
        'Escáner que emite una onda para revelar paredes falsas, rocas e inscripciones.',
      utility: 'Marca la ubicación exacta de secretos cercanos en 220px.',
      requirements: 'Completar la misión del Templo Pionero.',
      isUnlocked: scannerUnlocked,
      currentEnergy: Math.round(powersData.scannerEnergy),
      maxEnergy: powersData.maxScannerEnergy,
      costLabel: '20 Energía por Pulso emitido',
      actionButtonText: 'EMITIR PULSO TTL [R]',
      upgrades: [
        {
          id: 'upg-scanner-range-1',
          name: 'Resonador Largo Alcance (+60%)',
          description: 'Detección en toda la pantalla.',
          costDiamonds: 2,
          purchased: upgradesPurchased.includes('upg-scanner-range-1'),
        },
        {
          id: 'upg-scanner-recharge-1',
          name: 'Amplificador de Frecuencia',
          description: 'Recarga 5 de energía por secreto hallado.',
          costDiamonds: 2,
          purchased: upgradesPurchased.includes('upg-scanner-recharge-1'),
        },
      ],
    },
    {
      id: 'circuit-welder',
      title: 'Soldador Lógico',
      subtitle: 'Circuito TTL de Cobre',
      categoryLabel: 'HERRAMIENTA MAESTRA',
      accentHex: '#5fd6a8',
      borderHex: '#1f7a58',
      icon: Wrench,
      artVariant: 'welder',
      resourceLabel: 'Energía',
      description:
        'Soldador de precisión para unir relés rotos y activar puentes averiados.',
      utility: 'Repara mecanismos de circuitos para abrir atajos.',
      requirements: 'Entregado por el Maestro Kertz en Taller TTL.',
      isUnlocked: welderUnlocked,
      currentEnergy: Math.round(powersData.welderEnergy),
      maxEnergy: powersData.maxWelderEnergy,
      costLabel: '15 Energía por Reparación',
      actionButtonText: 'USAR SOLDADOR LÓGICO',
      upgrades: [
        {
          id: 'upg-welder-efficiency-1',
          name: 'Punta de Plata Quántica',
          description: 'Reduce el consumo a solo 5 por uso.',
          costDiamonds: 2,
          purchased: upgradesPurchased.includes('upg-welder-efficiency-1'),
        },
      ],
    },
  ];

  const selectedPower = powerList.find((p) => p.id === selectedId) ?? powerList[0];
  const unlockedCount = powerList.filter((p) => p.isUnlocked).length;
  const isExpanded = expandedCardId === selectedPower.id;

  const handleCardAction = (p: PowerSpec) => {
    if (!p.isUnlocked) return;
    retroAudio.uiClick();
    if (p.id === 'pong-hoverboard') {
      onInvokeFlight();
      onClose();
    } else if (p.id === 'phosphor-lantern') {
      onToggleLantern();
    } else if (p.id === 'secret-scanner') {
      onUseScanner();
    } else if (p.id === 'circuit-welder') {
      onUseWelder();
    }
  };

  // Navegación con flechas ↑/↓ (interceptada en captura para no mover al personaje)
  const powerCount = powerList.length;
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setSelectedId((prev) => {
        const index = powerList.findIndex((p) => p.id === prev);
        const next = (index + (e.key === 'ArrowDown' ? 1 : -1) + powerCount) % powerCount;
        return powerList[next].id;
      });
      setExpandedCardId(null);
      retroAudio.uiClick();
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [powerCount, powerList.map((p) => p.id).join('|')]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="powers-menu-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#03060c]/80 p-2 backdrop-blur-[3px] sm:p-4"
      onClick={onClose}
    >
      <style>{`
        @keyframes pvpm-enter {
          from { opacity: 0; transform: translateY(8px) scale(0.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pvpm-sweep {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        @keyframes pvpm-glow {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.9; }
        }
        @keyframes pvpm-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .pvpm-root { animation: pvpm-enter 200ms steps(5, end) both; }
        .pvpm-scanlines {
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255,255,255,0.045) 0px,
            rgba(255,255,255,0.045) 1px,
            transparent 1px,
            transparent 3px
          );
          mix-blend-mode: overlay;
        }
        .pvpm-row { transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease; }
        .pvpm-row:hover { transform: translateX(2px); }
        .pvpm-row-selected::before {
          content: '';
          position: absolute;
          left: 0; top: 8px; bottom: 8px;
          width: 2px;
          background: currentColor;
          box-shadow: 0 0 8px currentColor;
        }
        .pvpm-art-sweep::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0; left: 0;
          width: 28%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent);
          animation: pvpm-sweep 4.8s ease-in-out infinite;
          pointer-events: none;
        }
        .pvpm-corner { position: absolute; width: 12px; height: 12px; border-color: rgba(226,190,116,0.85); pointer-events: none; }
        .pvpm-scroll { scrollbar-width: thin; scrollbar-color: #3d4c60 transparent; }
        .pvpm-scroll::-webkit-scrollbar { width: 6px; }
        .pvpm-scroll::-webkit-scrollbar-thumb { background: #3d4c60; border-radius: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .pvpm-root, .pvpm-art-sweep::after { animation: none; }
        }
      `}</style>

      <div
        className="pvpm-root relative flex max-h-[94vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[8px] text-[#eee4cf] shadow-[0_0_0_1px_#000,0_0_0_3px_rgba(196,158,84,0.35),0_26px_70px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            'linear-gradient(158deg, #152135 0%, #0c1524 42%, #08101d 100%)',
          border: '1px solid rgba(196,158,84,0.55)',
        }}
      >
        <span className="pvpm-corner left-1.5 top-1.5 border-l border-t" />
        <span className="pvpm-corner right-1.5 top-1.5 border-r border-t" />
        <span className="pvpm-corner bottom-1.5 left-1.5 border-b border-l" />
        <span className="pvpm-corner bottom-1.5 right-1.5 border-r border-b" />
        <div className="pvpm-scanlines pointer-events-none absolute inset-0 opacity-[0.18]" />

        {/* CABECERA */}
        <header className="relative flex items-center gap-3 border-b border-[#c49e54]/30 bg-[#070d17]/70 px-3.5 py-2.5 sm:px-5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-[#c49e54]/70 bg-[#101a2a] shadow-[inset_0_0_10px_rgba(226,190,116,0.18)]">
            <span className="absolute inset-[2px] border border-[#c49e54]/25" />
            <Zap className="relative h-4 w-4 text-[#e2be74]" strokeWidth={2.4} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2
                id="powers-menu-title"
                className="font-display text-[15px] font-black uppercase leading-none tracking-[0.22em] text-[#f3e6c8] sm:text-[17px]"
                style={{ textShadow: '0 1px 0 #000, 0 0 14px rgba(226,190,116,0.25)' }}
              >
                Poderes
              </h2>
              <span className="hidden text-[9px] uppercase tracking-[0.2em] text-[#7f8fa5] sm:inline">
                Archivo de habilidades
              </span>
            </div>
            <p className="mt-1 flex items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-[#94a3b8]">
              <span className="text-[#e2be74]">Isla del Origen</span>
              <span className="text-[#3d4c60]">·</span>
              <span>
                {unlockedCount}/{powerList.length} desbloqueadas
              </span>
            </p>
          </div>

          <div className="hidden items-center gap-1.5 border border-[#c49e54]/35 bg-[#0a1320] px-2 py-1 text-[10px] font-bold text-[#f0d9a2] sm:flex">
            <Gem className="h-3 w-3 text-[#7dd3fc]" />
            <span className="tabular-nums">{availableDiamonds}</span>
            <span className="text-[8px] uppercase tracking-wider text-[#7f8fa5]">Diamantes</span>
          </div>

          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar menú de poderes"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border border-[#c49e54]/45 bg-[#0d1726] text-[#c9b58c] transition-colors hover:border-[#e2be74] hover:bg-[#16233a] hover:text-[#f8eed6] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#e2be74]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* CUERPO: LISTA + FICHA */}
        <div className="pvpm-scroll relative grid max-h-[calc(94vh-124px)] grid-cols-1 gap-2.5 overflow-y-auto p-2.5 sm:p-3.5 md:grid-cols-[252px_minmax(0,1fr)]">
          {/* LISTA COMPACTA */}
          <nav aria-label="Lista de poderes" className="flex flex-col gap-1.5">
            {powerList.map((p, index) => {
              const isSelected = p.id === selectedPower.id;
              const IconComp = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (!isSelected) retroAudio.uiClick();
                    setSelectedId(p.id);
                    setExpandedCardId(null);
                  }}
                  onMouseEnter={() => setSelectedId(p.id)}
                  aria-pressed={isSelected}
                  className={`pvpm-row group relative flex items-center gap-2.5 overflow-hidden border px-2 py-1.5 text-left cursor-pointer ${
                    isSelected
                      ? 'pvpm-row-selected border-[#c49e54]/85 bg-[linear-gradient(90deg,rgba(226,190,116,0.16),rgba(226,190,116,0.03))]'
                      : 'border-[#263349] bg-[#0a1220]/70 hover:border-[#3c4d66] hover:bg-[#101a2b]'
                  }`}
                  style={isSelected ? { color: p.accentHex, boxShadow: `inset 0 0 22px ${p.accentHex}14` } : undefined}
                >
                  {/* Miniatura ilustrada */}
                  <span
                    className={`relative block h-[42px] w-[62px] shrink-0 overflow-hidden border ${
                      p.isUnlocked ? 'border-[#3c4d66]' : 'border-[#263349]'
                    }`}
                  >
                    <span className={p.isUnlocked ? 'block h-full w-full' : 'block h-full w-full grayscale brightness-[0.55]'}>
                      <PowerArt variant={p.artVariant} animate={false} />
                    </span>
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050a12]/60 to-transparent" />
                    {!p.isUnlocked && (
                      <span className="absolute inset-0 flex items-center justify-center bg-[#050a12]/45">
                        <Lock className="h-3 w-3 text-[#8b9bb0]" />
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <IconComp
                        className="h-3 w-3 shrink-0"
                        style={{ color: p.isUnlocked ? p.accentHex : '#64748b' }}
                      />
                      <span
                        className={`truncate font-display text-[11px] font-bold uppercase tracking-[0.08em] ${
                          p.isUnlocked ? 'text-[#f1e6cf]' : 'text-[#8b9bb0]'
                        }`}
                      >
                        {p.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[8.5px] uppercase tracking-[0.13em] text-[#7f8fa5]">
                      {p.subtitle}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.12em]">
                      {p.isUnlocked ? (
                        <>
                          <span className="h-1 w-1 rounded-full" style={{ backgroundColor: p.accentHex, boxShadow: `0 0 4px ${p.accentHex}` }} />
                          <span style={{ color: p.accentHex }}>Activo</span>
                          <span className="ml-auto tabular-nums text-[#6b7c93]">
                            {p.currentEnergy}/{p.maxEnergy}
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-2.5 w-2.5 text-[#64748b]" />
                          <span className="text-[#8b9bb0]">Sellado</span>
                        </>
                      )}
                    </span>
                  </span>

                  <span className="absolute right-1.5 top-1.5 text-[8px] font-bold tabular-nums text-[#3f4f66]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {isSelected && (
                    <ChevronRight className="h-3 w-3 shrink-0" style={{ color: p.accentHex }} />
                  )}
                </button>
              );
            })}

            <div className="mt-auto hidden items-center justify-between border-t border-[#263349] px-1 pt-2 text-[8px] uppercase tracking-[0.14em] text-[#5f7088] md:flex">
              <span>↑ ↓ Seleccionar</span>
              <span>[K] Cerrar</span>
            </div>
          </nav>

          {/* FICHA DEL PODER SELECCIONADO */}
          <section
            key={selectedPower.id}
            aria-live="polite"
            className="relative flex min-w-0 flex-col overflow-hidden border bg-[#080e18]/75"
            style={{
              borderColor: selectedPower.isUnlocked ? `${selectedPower.borderHex}aa` : '#263349',
              boxShadow: `inset 0 0 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,0,0,0.6)`,
            }}
          >
            {/* Ilustración grande */}
            <div className="pvpm-art-sweep relative h-[136px] shrink-0 overflow-hidden border-b border-[#263349] sm:h-[164px]">
              <div className={selectedPower.isUnlocked ? 'h-full w-full' : 'h-full w-full grayscale brightness-[0.5]'}>
                <PowerArt variant={selectedPower.artVariant} />
              </div>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#080e18] via-[#080e18]/15 to-transparent" />
              <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

              <span className="absolute left-2.5 top-2.5 border border-[#c49e54]/30 bg-[#050a12]/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-[#d9c398]">
                {selectedPower.categoryLabel}
              </span>

              <span
                className="absolute right-2.5 top-2.5 flex items-center gap-1 border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]"
                style={
                  selectedPower.isUnlocked
                    ? {
                        color: selectedPower.accentHex,
                        borderColor: `${selectedPower.accentHex}66`,
                        backgroundColor: 'rgba(5,10,18,0.82)',
                      }
                    : {
                        color: '#9aa8bc',
                        borderColor: '#3c4d66',
                        backgroundColor: 'rgba(5,10,18,0.82)',
                      }
                }
              >
                {selectedPower.isUnlocked ? (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Desbloqueado
                  </>
                ) : (
                  <>
                    <Lock className="h-2.5 w-2.5" />
                    Sellado
                  </>
                )}
              </span>

              {!selectedPower.isUnlocked && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#4a5c74] bg-[#050a12]/80 shadow-[0_0_24px_rgba(0,0,0,0.7)]">
                    <Lock className="h-5 w-5 text-[#9aa8bc]" />
                  </span>
                </span>
              )}

              <div className="absolute inset-x-3 bottom-2">
                <h3
                  className="font-display text-[17px] font-black uppercase leading-none tracking-[0.1em] text-[#f7ecd4] sm:text-[20px]"
                  style={{ textShadow: '0 2px 0 #000, 0 0 18px rgba(0,0,0,0.9)' }}
                >
                  {selectedPower.title}
                </h3>
                <p
                  className="mt-1 text-[9px] uppercase tracking-[0.18em]"
                  style={{ color: selectedPower.accentHex }}
                >
                  {selectedPower.subtitle}
                </p>
              </div>
            </div>

            {/* Contenido */}
            <div className="pvpm-scroll flex flex-1 flex-col gap-2 overflow-y-auto p-3">
              <p className="text-[11px] leading-snug text-[#c9d2df]">{selectedPower.description}</p>

              <div className="flex items-start gap-1.5 border-l-2 pl-2" style={{ borderColor: `${selectedPower.accentHex}66` }}>
                <Sparkles className="mt-[1px] h-3 w-3 shrink-0" style={{ color: selectedPower.accentHex }} />
                <p className="text-[10px] leading-snug text-[#e6d8b8]">{selectedPower.utility}</p>
              </div>

              {selectedPower.isUnlocked ? (
                <>
                  <SegmentEnergyBar
                    current={selectedPower.currentEnergy}
                    max={selectedPower.maxEnergy}
                    label={selectedPower.resourceLabel}
                    fillHex={selectedPower.accentHex}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] uppercase tracking-[0.1em] text-[#7f8fa5]">
                    <span>{selectedPower.costLabel}</span>
                    <span className="flex items-center gap-1 text-[#8fa1b8]">
                      Mejoras
                      <span className="font-bold text-[#d9c398]">
                        {selectedPower.upgrades.filter((u) => u.purchased).length}/{selectedPower.upgrades.length}
                      </span>
                    </span>
                  </div>

                  {selectedPower.upgrades.length > 0 && (
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          retroAudio.uiClick();
                          setExpandedCardId(isExpanded ? null : selectedPower.id);
                        }}
                        aria-expanded={isExpanded}
                        className="flex w-full cursor-pointer items-center justify-between border border-[#2a3547] bg-[#0a1220] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-[#b7c3d3] transition-colors hover:border-[#41536d] hover:text-[#f1e6cf]"
                      >
                        <span>Ver mejoras disponibles</span>
                        <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="space-y-1">
                          {selectedPower.upgrades.map((upg) => (
                            <div
                              key={upg.id}
                              className="flex items-center justify-between gap-2 border border-[#202b3c] bg-[#050a12]/80 px-2 py-1.5 text-[9px]"
                            >
                              <div className="min-w-0">
                                <span className="block truncate font-bold text-[#efe2c7]">{upg.name}</span>
                                <span className="block truncate text-[#7f8fa5]">{upg.description}</span>
                              </div>
                              {upg.purchased ? (
                                <span className="shrink-0 border border-emerald-600/40 bg-emerald-950/70 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-300">
                                  Comprado
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={availableDiamonds < upg.costDiamonds}
                                  onClick={() => {
                                    retroAudio.uiClick();
                                    onUpgradePower(upg.id, upg.costDiamonds);
                                  }}
                                  className={`flex shrink-0 cursor-pointer items-center gap-1 border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide transition-colors ${
                                    availableDiamonds >= upg.costDiamonds
                                      ? 'border-[#f0d9a2] bg-[#e2be74] text-[#1a1206] hover:bg-[#f3d99a]'
                                      : 'cursor-not-allowed border-slate-700 bg-slate-800 text-slate-500'
                                  }`}
                                >
                                  <Gem className="h-2.5 w-2.5" />
                                  {upg.costDiamonds}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCardAction(selectedPower)}
                    className="group relative mt-auto flex w-full cursor-pointer items-center justify-center gap-1.5 overflow-hidden border border-[#f3d99a] bg-[linear-gradient(180deg,#e9c97e,#c9a24a)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#1c1307] shadow-[0_2px_0_#6b4c14,inset_0_1px_0_rgba(255,255,255,0.5)] transition-all hover:bg-[linear-gradient(180deg,#f6dda2,#d9b45c)] active:translate-y-[1px] active:shadow-[0_1px_0_#6b4c14]"
                  >
                    <span className="absolute inset-y-0 left-0 w-1/3 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-500 group-hover:translate-x-[240%]" />
                    <Zap className="h-3 w-3" />
                    {selectedPower.actionButtonText}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 border border-rose-900/50 bg-[#1a0b0e]/70 px-2.5 py-2 text-[10px] text-rose-200">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                    <div>
                      <span className="mb-0.5 block text-[8px] font-bold uppercase tracking-[0.16em] text-rose-300">
                        Requisito de desbloqueo
                      </span>
                      <span className="leading-snug">{selectedPower.requirements}</span>
                    </div>
                  </div>

                  <div className="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-1.5 border border-[#2a3547] bg-[#0a1220] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b7c93]">
                    <Lock className="h-3 w-3" />
                    Habilidad sellada
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        {/* PIE */}
        <footer className="relative flex flex-wrap items-center justify-between gap-2 border-t border-[#c49e54]/20 bg-[#070d17]/70 px-3.5 py-2 text-[8.5px] uppercase tracking-[0.14em] text-[#6b7c93] sm:px-5">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-2.5 w-2.5 text-[#c49e54]/70" />
            Recarga recursos en altares, cofres y puntos de guardado
          </span>
          <span className="text-[#4b5c73]">ESC · [K] Cerrar</span>
        </footer>
      </div>
    </div>
  );
}

// Exportación alias 'PowersMenuModal' para retrocompatibilidad
export const PowersMenuModal = PowersMenu;
