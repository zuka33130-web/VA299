/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Primitivas de dibujo compartidas por la cinemática de apertura.
 * Canvas 2D a 640×360, con píxeles nítidos y gradientes suaves.
 */

export const CINEMA_W = 640;
export const CINEMA_H = 360;

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(w)),
    Math.max(1, Math.round(h))
  );
}

export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number
): void {
  if (alpha <= 0.001 || radius <= 0.5) return;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

/** Rellena un polígono con un color plano. */
export function poly(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  color: string
): void {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Escama reptiliana sencilla: una placa redondeada con brillo superior. */
export function scalePlate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: string,
  highlight: string
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.8, w / 2), Math.max(0.8, h / 2), 0, 0, Math.PI * 2);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.16, Math.max(0.5, w * 0.32), Math.max(0.4, h * 0.24), -0.35, 0, Math.PI * 2);
  ctx.fillStyle = highlight;
  ctx.fill();
}

/** Clavo o garra curva de hueso oscuro. */
export function boneClaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  width: number,
  curve: number,
  color = '#d9c9a3',
  base = '#6a5638'
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(-width / 2, 0);
  ctx.quadraticCurveTo(width * 0.15 + curve, length * 0.55, curve, length);
  ctx.quadraticCurveTo(-width * 0.62 + curve, length * 0.5, -width / 2, 0);
  ctx.closePath();
  const grad = ctx.createLinearGradient(-width / 2, 0, width / 2, length);
  grad.addColorStop(0, base);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, '#fff6e2');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}
