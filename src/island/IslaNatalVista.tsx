/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vista del mirador del Alto de las Rocas: la silueta lejana de la Isla del
 * Origen sobre el mar abierto. La forma se toma directamente de las regiones
 * caminables de la Isla del Origen para que el perfil reconocible se mantenga
 * al otro lado del horizonte, sin recursos externos.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ISLAND_WALKABLE_RECTS } from './island70sData';

interface IslaOrigenMask {
  canvas: HTMLCanvasElement;
  cols: number;
  rows: number;
}

let maskCache: IslaOrigenMask | null = null;

/** Huella de la Isla del Origen rasterizada una sola vez en un canvas mínimo. */
function getIslaOrigenMask(): IslaOrigenMask {
  if (maskCache) return maskCache;

  const step = 12;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const rect of ISLAND_WALKABLE_RECTS) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }

  const cols = Math.max(1, Math.ceil((maxX - minX) / step));
  const rows = Math.max(1, Math.ceil((maxY - minY) / step));
  const filled = new Uint8Array(cols * rows);
  for (const rect of ISLAND_WALKABLE_RECTS) {
    const x0 = Math.max(0, Math.floor((rect.x - minX) / step));
    const x1 = Math.min(cols, Math.ceil((rect.x + rect.w - minX) / step));
    const y0 = Math.max(0, Math.floor((rect.y - minY) / step));
    const y1 = Math.min(rows, Math.ceil((rect.y + rect.h - minY) / step));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) filled[y * cols + x] = 1;
    }
  }

  // Rellena los huecos internos y dilata la costa para que la huella se lea
  // como una isla sólida, conservando sus ensenadas y su perfil reconocible.
  const outside = new Uint8Array(cols * rows);
  const queue: number[] = [];
  const markOutside = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return;
    const index = y * cols + x;
    if (filled[index] || outside[index]) return;
    outside[index] = 1;
    queue.push(index);
  };
  for (let x = 0; x < cols; x++) {
    markOutside(x, 0);
    markOutside(x, rows - 1);
  }
  for (let y = 0; y < rows; y++) {
    markOutside(0, y);
    markOutside(cols - 1, y);
  }
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    const x = index % cols;
    const y = (index - x) / cols;
    markOutside(x - 1, y);
    markOutside(x + 1, y);
    markOutside(x, y - 1);
    markOutside(x, y + 1);
  }
  for (let i = 0; i < filled.length; i++) {
    if (!filled[i] && !outside[i]) filled[i] = 1;
  }
  const coast = filled.slice();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!filled[y * cols + x]) continue;
      if (x > 0) coast[y * cols + x - 1] = 1;
      if (x < cols - 1) coast[y * cols + x + 1] = 1;
      if (y > 0) coast[(y - 1) * cols + x] = 1;
      if (y < rows - 1) coast[(y + 1) * cols + x] = 1;
    }
  }
  filled.set(coast);

  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const mctx = canvas.getContext('2d');
  if (!mctx) {
    maskCache = { canvas, cols, rows };
    return maskCache;
  }
  const image = mctx.createImageData(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!filled[y * cols + x]) continue;
      const i = (y * cols + x) * 4;
      const top = y === 0 || !filled[(y - 1) * cols + x];
      const bottom = y === rows - 1 || !filled[(y + 1) * cols + x];
      const left = x === 0 || !filled[y * cols + (x - 1)];
      const right = x === cols - 1 || !filled[y * cols + (x + 1)];
      // Silueta definida: dosel iluminado, costa clara y masa interior profunda.
      const tone = (x * 13 + y * 7) % 5;
      if (top) {
        image.data[i] = 132 + tone;
        image.data[i + 1] = 188 + tone;
        image.data[i + 2] = 150 + tone;
      } else if (left || right) {
        image.data[i] = 68 + tone;
        image.data[i + 1] = 124 + tone;
        image.data[i + 2] = 104 + tone;
      } else if (bottom) {
        image.data[i] = 92 + tone;
        image.data[i + 1] = 112 + tone;
        image.data[i + 2] = 88 + tone;
      } else {
        image.data[i] = 22 + tone;
        image.data[i + 1] = 62 + tone;
        image.data[i + 2] = 64 + tone;
      }
      image.data[i + 3] = 255;
    }
  }
  mctx.putImageData(image, 0, 0);
  maskCache = { canvas, cols, rows };
  return maskCache;
}

function hash01(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

export function IslaNatalVista({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motionQuery.matches;
    const onMotionChange = () => {
      reducedMotion = motionQuery.matches;
    };
    motionQuery.addEventListener('change', onMotionChange);

    let dpr = 1;
    let w = 0;
    let h = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const mask = getIslaOrigenMask();
    let raf = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - start) / 1000;
      const t = reducedMotion ? 0 : elapsed;
      const horizon = Math.round(h * 0.6);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;

      // Cielo de atardecer.
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#0f2b45');
      sky.addColorStop(0.42, '#345268');
      sky.addColorStop(0.72, '#8a6c72');
      sky.addColorStop(0.88, '#d89a6c');
      sky.addColorStop(1, '#f6c88d');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon);
      ctx.fillStyle = '#f6c88d';
      ctx.fillRect(0, horizon - 1, w, 1);

      // Sol bajo sobre el agua.
      const sunX = Math.round(w * 0.2);
      const sunY = Math.round(horizon - h * 0.055);
      const sunR = Math.max(20, Math.min(w, h) * 0.048);
      const halo = ctx.createRadialGradient(sunX, sunY, sunR * 0.4, sunX, sunY, sunR * 4.4);
      halo.addColorStop(0, 'rgba(255, 220, 168, 0.4)');
      halo.addColorStop(0.42, 'rgba(255, 194, 132, 0.16)');
      halo.addColorStop(1, 'rgba(255, 180, 120, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(sunX - sunR * 4.4, sunY - sunR * 4.4, sunR * 8.8, sunR * 8.8);
      const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sun.addColorStop(0, '#ffecc4');
      sun.addColorStop(0.6, '#ffd394');
      sun.addColorStop(1, '#f2ab68');
      ctx.fillStyle = sun;
      ctx.fillRect(sunX - sunR, sunY - sunR, sunR * 2, sunR * 2);
      ctx.fillStyle = 'rgba(226, 141, 88, 0.22)';
      ctx.fillRect(sunX - sunR, sunY + sunR * 0.18, sunR * 2, Math.max(2, sunR * 0.12));
      ctx.fillRect(sunX - sunR, sunY + sunR * 0.52, sunR * 2, Math.max(2, sunR * 0.16));

      // Nubes de píxeles, lentas y cálidas.
      for (let i = 0; i < 7; i++) {
        const speed = 4 + (i % 3) * 2.5;
        const cw = 70 + (i % 4) * 46;
        const cx = ((i * 233 + t * speed) % (w + cw * 2)) - cw;
        const cy = Math.round(horizon - h * (0.06 + (i % 5) * 0.052));
        const alpha = 0.1 + (i % 3) * 0.04;
        ctx.fillStyle = `rgba(255, 206, 164, ${alpha.toFixed(3)})`;
        ctx.fillRect(cx, cy, cw, Math.max(3, Math.round(h * 0.008)));
        ctx.fillRect(cx + cw * 0.16, cy - Math.max(2, Math.round(h * 0.006)), cw * 0.52, Math.max(2, Math.round(h * 0.007)));
        ctx.fillRect(cx + cw * 0.34, cy + Math.max(3, Math.round(h * 0.008)), cw * 0.44, Math.max(2, Math.round(h * 0.006)));
      }

      // Mar abierto.
      const sea = ctx.createLinearGradient(0, horizon, 0, h);
      sea.addColorStop(0, '#5c8782');
      sea.addColorStop(0.12, '#3f6d75');
      sea.addColorStop(0.42, '#1d465a');
      sea.addColorStop(1, '#081d2c');
      ctx.fillStyle = sea;
      ctx.fillRect(0, horizon, w, h - horizon);

      // Franjas y destellos de agua.
      for (let i = 0; i < 26; i++) {
        const y = horizon + 4 + ((h - horizon - 32) * i) / 26;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(6, 22, 34, 0.18)' : 'rgba(126, 176, 168, 0.05)';
        ctx.fillRect(0, Math.round(y), w, Math.max(1, Math.round((h - horizon) * 0.006)));
      }
      for (let i = 0; i < 34; i++) {
        const drift = t * (4 + (i % 4) * 2.4);
        const gw = 10 + (i % 6) * 8;
        const gx = ((i * 157 + drift) % (w + gw * 2)) - gw;
        const gy = Math.round(horizon + 6 + (i * 61) % Math.max(12, h - horizon - 90));
        ctx.fillStyle = `rgba(255, 210, 158, ${(0.06 + (i % 4) * 0.035).toFixed(3)})`;
        ctx.fillRect(gx, gy, gw, 1);
      }

      // Silueta de la Isla del Origen, derivada de su huella caminable.
      const islandW = Math.round(Math.min(w * 0.54, 900, h * 1.12));
      const islandH = Math.round(islandW * (mask.rows / mask.cols) * 0.32);
      const islandX = Math.round(w * 0.5 - islandW * 0.5 + w * 0.02);
      const islandY = Math.round(horizon - islandH + h * 0.012);

      const glow = ctx.createLinearGradient(0, islandY - islandH * 0.3, 0, horizon + h * 0.04);
      glow.addColorStop(0, 'rgba(255, 208, 156, 0)');
      glow.addColorStop(0.7, 'rgba(255, 208, 156, 0.1)');
      glow.addColorStop(1, 'rgba(255, 208, 156, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(islandX - w * 0.06, islandY - islandH, islandW + w * 0.12, islandH * 1.5);

      // Reflejo tenue sobre el agua.
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.translate(islandX, islandY + islandH);
      ctx.scale(1, -0.46);
      ctx.drawImage(mask.canvas, 0, 0, islandW, islandH);
      ctx.restore();

      ctx.globalAlpha = 0.98;
      ctx.drawImage(mask.canvas, islandX, islandY, islandW, islandH);
      ctx.globalAlpha = 1;

      // Silueta del castillo del Bastión, en el extremo noreste de la isla.
      const castleW = Math.max(34, Math.round(islandW * 0.105));
      const castleH = Math.max(34, Math.round(islandH * 0.62));
      const castleX = Math.round(islandX + islandW * 0.74);
      const castleBase = Math.round(islandY + islandH * 0.7);
      const keepW = Math.round(castleW * 0.34);
      const keepH = castleH;
      const keepX = castleX - Math.round(keepW * 0.5);
      const wallH = Math.round(castleH * 0.4);
      const wallW = castleW;
      const wallX = castleX - Math.round(wallW * 0.5);
      const wallY = castleBase - wallH;

      ctx.fillStyle = '#2b5e58';
      // Muralla baja entre las torres.
      ctx.fillRect(wallX, wallY, wallW, wallH);
      // Torres laterales.
      const towerW = Math.round(castleW * 0.22);
      const towerH = Math.round(castleH * 0.74);
      ctx.fillRect(wallX, castleBase - towerH, towerW, towerH);
      ctx.fillRect(wallX + wallW - towerW, castleBase - towerH, towerW, towerH);
      // Torreón central.
      ctx.fillRect(keepX, castleBase - keepH, keepW, keepH);

      // Almenas del torreón y de las torres.
      ctx.fillStyle = '#37746b';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(
          keepX + Math.round((keepW / 4) * i) + 1,
          castleBase - keepH - Math.max(4, Math.round(castleH * 0.06)),
          Math.max(2, Math.round(keepW / 8)),
          Math.max(4, Math.round(castleH * 0.06))
        );
      }
      for (let i = 0; i < 2; i++) {
        const off = Math.round((towerW / 2) * i) + 1;
        ctx.fillRect(
          wallX + off,
          castleBase - towerH - Math.max(3, Math.round(castleH * 0.05)),
          Math.max(2, Math.round(towerW * 0.34)),
          Math.max(3, Math.round(castleH * 0.05))
        );
        ctx.fillRect(
          wallX + wallW - towerW + off,
          castleBase - towerH - Math.max(3, Math.round(castleH * 0.05)),
          Math.max(2, Math.round(towerW * 0.34)),
          Math.max(3, Math.round(castleH * 0.05))
        );
      }

      // Puerta y ventanas encendidas del castillo.
      ctx.fillStyle = '#0d2a2f';
      ctx.fillRect(
        castleX - Math.round(keepW * 0.15),
        castleBase - Math.round(wallH * 0.7),
        Math.round(keepW * 0.3),
        Math.round(wallH * 0.7)
      );
      ctx.fillRect(
        castleX - Math.round(keepW * 0.08),
        castleBase - Math.round(wallH * 0.88),
        Math.round(keepW * 0.16),
        Math.round(wallH * 0.2)
      );
      const windowGlow = reducedMotion ? 0.7 : 0.55 + Math.sin(t * 2.2) * 0.2;
      ctx.fillStyle = `rgba(255, 205, 132, ${windowGlow.toFixed(3)})`;
      const windowSize = Math.max(2, Math.round(castleW * 0.028));
      ctx.fillRect(castleX - Math.round(keepW * 0.3), castleBase - keepH * 0.72, windowSize, windowSize);
      ctx.fillRect(castleX + Math.round(keepW * 0.22), castleBase - keepH * 0.72, windowSize, windowSize);
      ctx.fillRect(
        wallX + Math.round(towerW * 0.28),
        castleBase - towerH * 0.64,
        windowSize,
        windowSize
      );
      ctx.fillRect(
        wallX + wallW - towerW + Math.round(towerW * 0.28),
        castleBase - towerH * 0.64,
        windowSize,
        windowSize
      );

      // Luz rasante del atardecer sobre el borde izquierdo de la silueta.
      ctx.fillStyle = 'rgba(255, 205, 145, 0.5)';
      ctx.fillRect(keepX, castleBase - keepH, 1, keepH);
      ctx.fillRect(wallX, castleBase - towerH, 1, towerH);
      ctx.fillRect(wallX + wallW - towerW, castleBase - towerH, 1, towerH);

      // Estandarte del torreón.
      const flagX = keepX + Math.round(keepW * 0.5);
      const flagTop = castleBase - keepH - Math.max(6, Math.round(castleH * 0.09));
      ctx.fillStyle = '#1b3a3c';
      ctx.fillRect(flagX, flagTop - Math.round(castleH * 0.16), 1, Math.round(castleH * 0.16));
      ctx.fillStyle = 'rgba(240, 170, 96, 0.75)';
      ctx.fillRect(flagX + 1, flagTop - Math.round(castleH * 0.15), Math.max(4, Math.round(castleW * 0.12)), Math.max(3, Math.round(castleH * 0.05)));

      // Base de espuma y bruma marina sobre la costa lejana.
      ctx.fillStyle = 'rgba(238, 218, 184, 0.16)';
      ctx.fillRect(islandX, islandY + islandH - 1, islandW, 1);
      const haze = ctx.createLinearGradient(0, islandY + islandH * 0.72, 0, horizon + h * 0.05);
      haze.addColorStop(0, 'rgba(126, 158, 158, 0)');
      haze.addColorStop(1, 'rgba(126, 158, 158, 0.13)');
      ctx.fillStyle = haze;
      ctx.fillRect(islandX - islandW * 0.02, islandY + islandH * 0.72, islandW * 1.04, horizon - (islandY + islandH * 0.72) + h * 0.05);

      // Pulso cian del santuario de Pong, al este de la isla.
      const pulse = reducedMotion ? 0.55 : 0.4 + Math.sin(t * 1.6) * 0.28;
      const beaconX = Math.round(islandX + islandW * 0.82);
      const beaconY = Math.round(islandY + islandH * 0.46);
      const beaconGlow = ctx.createRadialGradient(beaconX, beaconY, 1, beaconX, beaconY, 18);
      beaconGlow.addColorStop(0, `rgba(110, 240, 255, ${(0.5 * pulse).toFixed(3)})`);
      beaconGlow.addColorStop(1, 'rgba(110, 240, 255, 0)');
      ctx.fillStyle = beaconGlow;
      ctx.fillRect(beaconX - 18, beaconY - 18, 36, 36);
      ctx.fillStyle = `rgba(196, 250, 255, ${(0.55 + pulse * 0.4).toFixed(3)})`;
      ctx.fillRect(beaconX - 1, beaconY - 1, 2, 2);

      // Aves lejanas.
      for (let i = 0; i < 3; i++) {
        const bx = Math.round(w * 0.42 + Math.sin(t * 0.18 + i * 1.9) * w * 0.16 + i * 46);
        const by = Math.round(horizon - h * (0.2 + i * 0.055) + Math.cos(t * 0.5 + i) * 3);
        const flap = reducedMotion ? 0 : Math.round(Math.sin(t * 6 + i * 2) * 1.5);
        ctx.fillStyle = 'rgba(40, 36, 38, 0.55)';
        ctx.fillRect(bx - 3, by - flap, 2, 1);
        ctx.fillRect(bx + 1, by - flap, 2, 1);
        ctx.fillRect(bx - 1, by, 2, 1);
      }

      // Vista a través del ocular: el catalejo no aparece en cuadro, sólo el
      // viñeteado circular del cristal y la imagen limpia del horizonte.
      const lens = ctx.createRadialGradient(
        w / 2,
        h * 0.52,
        Math.min(w, h) * 0.34,
        w / 2,
        h * 0.52,
        Math.min(w, h) * 0.74
      );
      lens.addColorStop(0, 'rgba(2, 8, 12, 0)');
      lens.addColorStop(0.78, 'rgba(2, 8, 12, 0.16)');
      lens.addColorStop(1, 'rgba(2, 8, 12, 0.8)');
      ctx.fillStyle = lens;
      ctx.fillRect(0, 0, w, h);

      // Viñeta y calidez final.
      const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.78);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(4, 10, 18, 0.6)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
      const warm = ctx.createLinearGradient(0, 0, 0, h);
      warm.addColorStop(0, 'rgba(255, 186, 120, 0.06)');
      warm.addColorStop(0.55, 'rgba(255, 156, 100, 0.02)');
      warm.addColorStop(1, 'rgba(8, 20, 32, 0.26)');
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, w, h);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-label="Vista del mirador hacia la Isla del Origen"
      className={`fixed inset-0 z-[55] bg-[#06121c] transition-opacity duration-300 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="crisp-arcade-canvas block h-full w-full" />

      {/* Marco de visor del catalejo */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-3 sm:inset-5">
        <span className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-amber-100/35" />
        <span className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-amber-100/35" />
        <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-amber-100/35" />
        <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-amber-100/35" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-[7%] flex justify-center px-4">
        <div className="glass-hud px-5 py-2.5 text-center" style={{ borderColor: '#fcd34d88' }}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-amber-200/80">
            Alto de las Rocas · Mirador de la infancia
          </p>
          <h2 className="mt-1 font-mono text-lg font-bold uppercase tracking-[0.28em] text-amber-100 sm:text-2xl">
            Isla del Origen
          </h2>
          <p className="mt-1 font-mono text-[10px] text-cyan-100/80 sm:text-[11px]">
            La isla y la silueta del castillo, al otro lado del mar.
          </p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[4.5%] flex justify-center px-4">
        <button
          type="button"
          onClick={onClose}
          className="glass-hud cursor-pointer px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-amber-100 transition-colors hover:text-amber-50 sm:text-xs"
          style={{ borderColor: '#fcd34d66' }}
        >
          [E] Volver al mirador
        </button>
      </div>
    </div>
  );
}
