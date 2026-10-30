/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hito Secreto Jugable de PIXELVERSE: BREAKOUT (1976 · Atari).
 * Descubierto en la Sala Secreta de 1976 bajo el Laberinto de Señales.
 * Recrea fielmente las 8 filas cromáticas (rojo, naranja, verde, amarillo),
 * la aceleración al alcanzar las capas altas y el umbral de restauración de 400 PTS.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';
import { BREAKOUT_UNLOCK_SCORE } from '../memories/progressionState';

interface BrickCell {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  points: number;
  tier: 0 | 1 | 2 | 3; // 0 amarillo, 1 verde, 2 naranja, 3 rojo
  colorHex: string;
  alive: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const CANVAS_W = 640;
const CANVAS_H = 440;
const COLS = 14;
const ROWS = 8;
const BRICK_GAP = 4;
const WALL_MARGIN_X = 28;
const WALL_TOP_Y = 70;
const BRICK_H = 12;
const BRICK_W = Math.floor((CANVAS_W - WALL_MARGIN_X * 2 - BRICK_GAP * (COLS - 1)) / COLS);
const PADDLE_Y = CANVAS_H - 34;
const BASE_PADDLE_W = 84;
const PADDLE_H = 10;

function createBrickWall(): BrickCell[] {
  const cells: BrickCell[] = [];
  for (let r = 0; r < ROWS; r++) {
    let tier: 0 | 1 | 2 | 3 = 0;
    let points = 1;
    let colorHex = '#facc15'; // Amarillo (filas 6-7)
    if (r < 2) {
      tier = 3;
      points = 7;
      colorHex = '#ef4444'; // Rojo (filas 0-1)
    } else if (r < 4) {
      tier = 2;
      points = 5;
      colorHex = '#f97316'; // Naranja (filas 2-3)
    } else if (r < 6) {
      tier = 1;
      points = 3;
      colorHex = '#22c55e'; // Verde (filas 4-5)
    }
    for (let c = 0; c < COLS; c++) {
      cells.push({
        row: r,
        col: c,
        x: WALL_MARGIN_X + c * (BRICK_W + BRICK_GAP),
        y: WALL_TOP_Y + r * (BRICK_H + BRICK_GAP),
        w: BRICK_W,
        h: BRICK_H,
        points,
        tier,
        colorHex,
        alive: true,
      });
    }
  }
  return cells;
}

export function Breakout1976Stage({
  active,
  alreadyRestored,
  bestSavedScore = 0,
  onMemoryRestored,
  onCeremonyDone,
  onExitToSecretRoom,
}: {
  active: boolean;
  alreadyRestored: boolean;
  bestSavedScore?: number;
  onMemoryRestored: (finalScore: number) => void;
  onCeremonyDone: () => void;
  onExitToSecretRoom: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(bestSavedScore);
  const [ballsLeft, setBallsLeft] = useState<number>(3);
  const [wallNumber, setWallNumber] = useState<number>(1);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'ceremony' | 'gameover'>('ready');
  const [ceremonyWasAlreadyRestored, setCeremonyWasAlreadyRestored] = useState<boolean>(false);

  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const pointerXRef = useRef<number | null>(null);
  const triggeredUnlockRef = useRef<boolean>(false);

  const gameRef = useRef<{
    paddleX: number;
    paddleW: number;
    ballX: number;
    ballY: number;
    ballVX: number;
    ballVY: number;
    baseSpeed: number;
    speedTierHits: number;
    orangeUnlocked: boolean;
    redUnlocked: boolean;
    ceilingShrunk: boolean;
    bricks: BrickCell[];
    sparks: SparkParticle[];
    score: number;
    balls: number;
    wall: number;
    launchDelay: number;
  }>({
    paddleX: (CANVAS_W - BASE_PADDLE_W) / 2,
    paddleW: BASE_PADDLE_W,
    ballX: CANVAS_W / 2,
    ballY: PADDLE_Y - 12,
    ballVX: 220,
    ballVY: -260,
    baseSpeed: 315,
    speedTierHits: 0,
    orangeUnlocked: false,
    redUnlocked: false,
    ceilingShrunk: false,
    bricks: createBrickWall(),
    sparks: [],
    score: 0,
    balls: 3,
    wall: 1,
    launchDelay: 0.45,
  });

  const resetMatch = useCallback(() => {
    retroAudio.unlock();
    retroAudio.uiClick();
    triggeredUnlockRef.current = alreadyRestored;
    const g = gameRef.current;
    g.paddleW = BASE_PADDLE_W;
    g.paddleX = (CANVAS_W - BASE_PADDLE_W) / 2;
    g.ballX = CANVAS_W / 2;
    g.ballY = PADDLE_Y - 12;
    g.baseSpeed = 315;
    g.speedTierHits = 0;
    g.orangeUnlocked = false;
    g.redUnlocked = false;
    g.ceilingShrunk = false;
    const dir = Math.random() > 0.5 ? 1 : -1;
    g.ballVX = dir * 195;
    g.ballVY = -265;
    g.bricks = createBrickWall();
    g.sparks = [];
    g.score = 0;
    g.balls = 3;
    g.wall = 1;
    g.launchDelay = 0.55;
    setScore(0);
    setBallsLeft(3);
    setWallNumber(1);
    setPhase('playing');
  }, [alreadyRestored]);

  useEffect(() => {
    setBestScore((prev) => Math.max(prev, bestSavedScore));
  }, [bestSavedScore]);

  useEffect(() => {
    if (!active) return;
    triggeredUnlockRef.current = alreadyRestored;
    setPhase('ready');
  }, [active, alreadyRestored]);

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = true;
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (phase === 'ready' || phase === 'gameover') {
          e.preventDefault();
          resetMatch();
        }
      } else if (e.key === 'Escape') {
        if (phase !== 'ceremony') {
          e.preventDefault();
          retroAudio.uiClick();
          onExitToSecretRoom();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [active, phase, resetMatch, onExitToSecretRoom]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTs = performance.now();

    const computeTargetSpeed = (g: typeof gameRef.current): number => {
      let mult = 1;
      if (g.speedTierHits >= 4) mult += 0.12;
      if (g.speedTierHits >= 12) mult += 0.14;
      if (g.orangeUnlocked) mult += 0.14;
      if (g.redUnlocked) mult += 0.16;
      return g.baseSpeed * mult;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const g = gameRef.current;

      // Movimiento de la paleta (teclado o puntero)
      const paddleSpeed = 520;
      if (keysRef.current.left) {
        pointerXRef.current = null;
        g.paddleX -= paddleSpeed * dt;
      }
      if (keysRef.current.right) {
        pointerXRef.current = null;
        g.paddleX += paddleSpeed * dt;
      }
      if (pointerXRef.current !== null) {
        const targetX = pointerXRef.current - g.paddleW / 2;
        g.paddleX += (targetX - g.paddleX) * Math.min(1, dt * 22);
      }
      g.paddleX = Math.max(14, Math.min(CANVAS_W - 14 - g.paddleW, g.paddleX));

      if (phase === 'playing') {
        if (g.launchDelay > 0) {
          g.launchDelay -= dt;
          g.ballX = g.paddleX + g.paddleW / 2;
          g.ballY = PADDLE_Y - 8;
        } else {
          g.ballX += g.ballVX * dt;
          g.ballY += g.ballVY * dt;

          // Rebote en muros laterales
          if (g.ballX <= 14) {
            g.ballX = 14;
            g.ballVX = Math.abs(g.ballVX);
            retroAudio.pongWall();
          } else if (g.ballX >= CANVAS_W - 14) {
            g.ballX = CANVAS_W - 14;
            g.ballVX = -Math.abs(g.ballVX);
            retroAudio.pongWall();
          }

          // Rebote en techo (acorta paleta la primera vez, como en el arcade de 1976)
          if (g.ballY <= 22) {
            g.ballY = 22;
            g.ballVY = Math.abs(g.ballVY);
            if (!g.ceilingShrunk) {
              g.ceilingShrunk = true;
              g.paddleW = Math.round(BASE_PADDLE_W * 0.74);
            }
            retroAudio.pongWall();
          }

          // Colisión con la paleta
          if (
            g.ballVY > 0 &&
            g.ballY + 5 >= PADDLE_Y &&
            g.ballY - 5 <= PADDLE_Y + PADDLE_H &&
            g.ballX + 5 >= g.paddleX &&
            g.ballX - 5 <= g.paddleX + g.paddleW
          ) {
            const rel = (g.ballX - (g.paddleX + g.paddleW / 2)) / (g.paddleW / 2);
            const clampedRel = Math.max(-0.92, Math.min(0.92, rel));
            const angle = clampedRel * (Math.PI * 0.36);
            g.speedTierHits += 1;
            const spd = computeTargetSpeed(g);
            g.ballVX = Math.sin(angle) * spd;
            g.ballVY = -Math.cos(angle) * spd;
            g.ballY = PADDLE_Y - 6;
            retroAudio.breakoutPaddle();
          }

          // Colisión con ladrillos
          for (let i = 0; i < g.bricks.length; i++) {
            const b = g.bricks[i];
            if (!b.alive) continue;
            if (
              g.ballX + 5 >= b.x &&
              g.ballX - 5 <= b.x + b.w &&
              g.ballY + 5 >= b.y &&
              g.ballY - 5 <= b.y + b.h
            ) {
              b.alive = false;
              const overlapLeft = g.ballX + 5 - b.x;
              const overlapRight = b.x + b.w - (g.ballX - 5);
              const overlapTop = g.ballY + 5 - b.y;
              const overlapBottom = b.y + b.h - (g.ballY - 5);
              const minHoriz = Math.min(overlapLeft, overlapRight);
              const minVert = Math.min(overlapTop, overlapBottom);
              if (minHoriz < minVert) {
                g.ballVX = -g.ballVX;
              } else {
                g.ballVY = -g.ballVY;
              }

              if (b.tier === 2) g.orangeUnlocked = true;
              if (b.tier === 3) g.redUnlocked = true;
              const spd = computeTargetSpeed(g);
              const curMag = Math.hypot(g.ballVX, g.ballVY) || 1;
              g.ballVX = (g.ballVX / curMag) * spd;
              g.ballVY = (g.ballVY / curMag) * spd;

              g.score += b.points * 10;
              setScore(g.score);
              setBestScore((prev) => Math.max(prev, g.score));
              retroAudio.breakoutBrick(b.tier);

              for (let s = 0; s < 7; s++) {
                const ang = (s / 7) * Math.PI * 2 + Math.random() * 0.4;
                const sp = 45 + Math.random() * 95;
                g.sparks.push({
                  x: b.x + b.w / 2,
                  y: b.y + b.h / 2,
                  vx: Math.cos(ang) * sp,
                  vy: Math.sin(ang) * sp,
                  life: 0.42,
                  color: b.colorHex,
                });
              }

              // ¿Muro despejado? Regenerar segundo muro (fiel al gabinete original de 2 muros)
              const remaining = g.bricks.some((cell) => cell.alive);
              if (!remaining) {
                g.wall += 1;
                setWallNumber(g.wall);
                g.bricks = createBrickWall();
                g.launchDelay = 0.65;
                g.baseSpeed = Math.min(410, g.baseSpeed + 28);
                retroAudio.portalVictory();
              }

              // ¿Alcanzó el umbral histórico de restauración (400 PTS)?
              if (g.score >= BREAKOUT_UNLOCK_SCORE && !triggeredUnlockRef.current) {
                triggeredUnlockRef.current = true;
                setCeremonyWasAlreadyRestored(alreadyRestored);
                onMemoryRestored(g.score);
                setPhase('ceremony');
              }
              break;
            }
          }

          // Pérdida de pelota por el borde inferior
          if (g.ballY > CANVAS_H + 12) {
            g.balls -= 1;
            setBallsLeft(g.balls);
            retroAudio.pongScore(false);
            if (g.balls <= 0) {
              if (g.score >= BREAKOUT_UNLOCK_SCORE && alreadyRestored) {
                onMemoryRestored(g.score);
              }
              setPhase('gameover');
            } else {
              g.launchDelay = 0.7;
              const dir = Math.random() > 0.5 ? 1 : -1;
              const spd = computeTargetSpeed(g);
              g.ballVX = dir * spd * 0.55;
              g.ballVY = -spd * 0.83;
            }
          }
        }
      }

      // Actualizar chispas
      for (let i = g.sparks.length - 1; i >= 0; i--) {
        const sp = g.sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.life -= dt;
        if (sp.life <= 0) g.sparks.splice(i, 1);
      }

      // Renderizado CRT / Celofán de 1976 con atmósfera HD-2D RGB
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#040711';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Resplandor sutil de bandas de celofán sobre el tubo CRT
      const bands = [
        { y: WALL_TOP_Y - 4, h: 32, rgba: 'rgba(239, 68, 68, 0.08)' },
        { y: WALL_TOP_Y + 28, h: 32, rgba: 'rgba(249, 115, 22, 0.08)' },
        { y: WALL_TOP_Y + 60, h: 32, rgba: 'rgba(34, 197, 94, 0.08)' },
        { y: WALL_TOP_Y + 92, h: 34, rgba: 'rgba(250, 204, 21, 0.08)' },
      ];
      for (const band of bands) {
        ctx.fillStyle = band.rgba;
        ctx.fillRect(14, band.y, CANVAS_W - 28, band.h);
      }

      // Marco estructural blanco-cian del monitor de 1976
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(10, 16, CANVAS_W - 20, 4);
      ctx.fillRect(10, 16, 4, CANVAS_H - 16);
      ctx.fillRect(CANVAS_W - 14, 16, 4, CANVAS_H - 16);

      // Marcadores superiores tipo dígitos TTL de 7 segmentos
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'left';
      ctx.fillText(`SCORE ${String(g.score).padStart(4, '0')}`, 26, 46);
      ctx.textAlign = 'center';
      ctx.fillStyle = g.score >= BREAKOUT_UNLOCK_SCORE ? '#39ff14' : '#f97316';
      ctx.fillText(
        `META RESTAURACIÓN: ${BREAKOUT_UNLOCK_SCORE} PTS`,
        CANVAS_W / 2,
        46
      );
      ctx.textAlign = 'right';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`BALLS ${Math.max(0, g.balls)} · MURO ${g.wall}`, CANVAS_W - 26, 46);

      // Ladrillos estratificados
      for (const b of g.bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(b.x + 2, b.y + 2, b.w, b.h);
        ctx.fillStyle = b.colorHex;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(b.x, b.y, b.w, 2);
      }

      // Chispas de demolición
      for (const sp of g.sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.42);
        ctx.fillStyle = sp.color;
        ctx.fillRect(Math.round(sp.x - 2), Math.round(sp.y - 2), 4, 4);
      }
      ctx.globalAlpha = 1;

      // Paleta luminosa cian (celofán inferior del gabinete)
      ctx.fillStyle = 'rgba(34, 211, 238, 0.24)';
      ctx.fillRect(Math.round(g.paddleX - 4), PADDLE_Y - 3, g.paddleW + 8, PADDLE_H + 6);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(Math.round(g.paddleX), PADDLE_Y, g.paddleW, PADDLE_H);
      ctx.fillStyle = '#ecfeff';
      ctx.fillRect(Math.round(g.paddleX + 4), PADDLE_Y + 1, g.paddleW - 8, 2);

      // Esfera de fósforo blanco
      if (phase === 'playing' || phase === 'ready') {
        const bx = phase === 'ready' ? g.paddleX + g.paddleW / 2 : g.ballX;
        const by = phase === 'ready' ? PADDLE_Y - 8 : g.ballY;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(Math.round(bx - 6), Math.round(by - 6), 12, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(bx - 4), Math.round(by - 4), 8, 8);
      }

      // Scanlines sutiles de tubo CRT
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      for (let sy = 0; sy < CANVAS_H; sy += 4) {
        ctx.fillRect(0, sy, CANVAS_W, 1);
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [active, phase, alreadyRestored, onMemoryRestored]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    pointerXRef.current = relX;
  };

  if (!active) return null;

  const breakoutMemory = getHistoricalMemory('breakout');

  return (
    <div className="min-h-screen w-full bg-[#03060f] text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden select-none">
      {/* Iluminación ambiental HD-2D RGB subterránea de la Sala Secreta 1976 */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(249,115,22,0.14),transparent_45%),radial-gradient(circle_at_78%_75%,rgba(34,211,238,0.14),transparent_48%)]"
      />

      <div className="w-full max-w-4xl z-10 space-y-3">
        {/* Cabecera limpia sin píldoras decorativas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <p className="text-xs font-mono-tabular text-orange-300 tracking-wider">
              Sala Secreta Subterránea · Atari, Mayo de 1976
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
              Breakout — Gabinete Prototipo TTL
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono-tabular text-slate-300">
            <span>
              Récord: <strong className="text-amber-300">{Math.max(bestScore, score)} PTS</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Estado:{' '}
              <strong className={alreadyRestored || score >= BREAKOUT_UNLOCK_SCORE ? 'text-emerald-400' : 'text-cyan-300'}>
                {alreadyRestored || score >= BREAKOUT_UNLOCK_SCORE
                  ? 'Memoria Restaurada'
                  : `Meta ${BREAKOUT_UNLOCK_SCORE} PTS`}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                onExitToSecretRoom();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la Sala Secreta</span>
            </button>
          </div>
        </div>

        {/* Marco del monitor arcade */}
        <div className="relative rounded-xl border border-orange-400/35 bg-[#050914] p-2 sm:p-3 shadow-[0_0_50px_rgba(249,115,22,0.14)]">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerMove={handlePointerMove}
            onClick={() => {
              if (phase === 'ready' || phase === 'gameover') {
                resetMatch();
              }
            }}
            className="w-full aspect-[640/440] rounded-lg block cursor-ew-resize crisp-arcade-canvas bg-[#040711]"
          />

          {phase === 'ready' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#02050d]/82 rounded-xl p-6 text-center">
              <div className="max-w-md space-y-4">
                <p className="text-xs font-mono-tabular text-orange-300">
                  Hito Oculto Descubierto · Isla del Origen
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  El Muro de Luz de 1976
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Desplaza la paleta con <strong className="text-white">A / D</strong>,{' '}
                  <strong className="text-white">Flechas</strong> o el puntero. Alcanza{' '}
                  <strong className="text-amber-300">{BREAKOUT_UNLOCK_SCORE} puntos</strong>{' '}
                  perforando las bandas cromáticas para restaurar la memoria secreta de{' '}
                  <em>Breakout</em> e iluminar su pedestal en el Museo Viviente.
                </p>
                <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetMatch}
                    className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Iniciar Partida
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'gameover' && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#02050d]/86 rounded-xl p-6 text-center">
              <div className="max-w-md space-y-4">
                <Trophy className="w-8 h-8 text-amber-400 mx-auto" />
                <h2 className="font-display text-2xl font-bold text-white">
                  Secuencia Finalizada · {score} PTS
                </h2>
                <p className="text-sm text-slate-300">
                  {score >= BREAKOUT_UNLOCK_SCORE || alreadyRestored
                    ? 'La memoria de Breakout (1976) permanece restaurada y sincronizada con el Museo Viviente de los 70.'
                    : `Necesitas ${BREAKOUT_UNLOCK_SCORE} PTS para estabilizar el circuito TTL de 1976 (lograste ${score} PTS en el muro ${wallNumber}).`}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={resetMatch}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reintentar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      retroAudio.uiClick();
                      onExitToSecretRoom();
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-medium transition-colors cursor-pointer"
                  >
                    Regresar al Laberinto
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie informativo sobrio */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono-tabular">
          <span>Amarillo: 10 pts · Verde: 30 pts · Naranja: 50 pts · Rojo: 70 pts</span>
          <span>Controles: Flechas / A-D / Ratón · ESC para salir</span>
        </div>
      </div>

      {phase === 'ceremony' && (
        <MemoryUnlockedModal
          entry={breakoutMemory}
          alreadyRestoredBefore={ceremonyWasAlreadyRestored}
          continueLabel="VOLVER A LA SALA SECRETA DE 1976"
          onContinue={() => {
            onCeremonyDone();
            onExitToSecretRoom();
          }}
        />
      )}
    </div>
  );
}
