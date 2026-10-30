/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RETO DE PONG DE LA ISLA NATAL — «EL ARCADE QUE ESPERÓ SU MOMENTO»
 *
 * Encuentro a 3 goles contra la máquina que dejó el viejo viajero. Usa exactamente
 * el mismo núcleo de reglas y física que el gabinete histórico del Santuario Pong
 * (src/pong/pongMatchCore.ts), con una IA ligeramente más asequible porque es la
 * primera partida de toda la aventura. La intensidad audiovisual crece con cada gol
 * y la victoria desemboca en la señal que despierta la Isla del Origen.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { retroAudio } from '../audio/retroAudio';
import {
  aiPaddleX,
  createPongMatch,
  PONG_CABINET_COURT,
  PONG_TARGET_GOALS,
  playerPaddleX,
  stepPongMatch,
  updatePongEffects,
} from '../pong/pongMatchCore';

type NatalPongPhase = 'boot' | 'playing' | 'lost';

const AI_FAIRNESS_SCALE = 0.9;
const BOOT_MS = 1900;
const SIGNAL_HOLD_SEC = 2.3;

export function IslaNatalPongChallenge({
  onVictory,
  onQuit,
}: {
  onVictory: (arcadePoints: number, rallies: number) => void;
  onQuit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });
  const onVictoryRef = useRef(onVictory);
  onVictoryRef.current = onVictory;

  const [phase, setPhase] = useState<NatalPongPhase>('boot');
  const [matchKey, setMatchKey] = useState(1);
  const [score, setScore] = useState({ p1: 0, p2: 0, points: 0 });
  const [goalFlash, setGoalFlash] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setPhase('playing'), BOOT_MS);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    retroAudio.portalResonance(true);
    return () => retroAudio.portalResonance(false);
  }, []);

  useEffect(() => {
    const isEditable = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

    const down = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') {
        e.preventDefault();
        keysRef.current.up = true;
      }
      if (k === 's' || e.key === 'ArrowDown') {
        e.preventDefault();
        keysRef.current.down = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keysRef.current.up = false;
      if (k === 's' || e.key === 'ArrowDown') keysRef.current.down = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      keysRef.current.up = false;
      keysRef.current.down = false;
    };
  }, []);

  const restart = useCallback(() => {
    retroAudio.uiClick();
    keysRef.current.up = false;
    keysRef.current.down = false;
    setScore({ p1: 0, p2: 0, points: 0 });
    setMatchKey((k) => k + 1);
    setPhase('playing');
  }, []);

  const quit = useCallback(() => {
    retroAudio.uiClick();
    keysRef.current.up = false;
    keysRef.current.down = false;
    onQuit();
  }, [onQuit]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const court = PONG_CABINET_COURT;
    const W = canvas.width;
    const H = canvas.height;
    const match = createPongMatch(court);

    let cancelled = false;
    let rafId = 0;
    let prev = performance.now();
    let wonAt: number | null = null;
    let victoryFired = false;
    let lastScore1 = 0;
    let lastScore2 = 0;
    let lastPoints = 0;

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.04, (now - prev) / 1000);
      prev = now;

      if (wonAt === null) {
        const events = stepPongMatch(match, court, dt, keysRef.current, {
          aiSpeedScale: AI_FAIRNESS_SCALE,
        });

        for (const ev of events) {
          if (ev.type === 'wall') retroAudio.pongWall();
          else if (ev.type === 'paddle') retroAudio.pongPaddle();
          else if (ev.type === 'goal') {
            retroAudio.pongScore(ev.side === 'player');
            setGoalFlash((n) => n + 1);
            window.dispatchEvent(new CustomEvent('pixelverse-shake'));
          } else if (ev.type === 'matchWon') {
            wonAt = 0;
            retroAudio.portalVictory();
          } else if (ev.type === 'matchLost') {
            cancelled = true;
            keysRef.current.up = false;
            keysRef.current.down = false;
            setPhase('lost');
            return;
          }
        }

        if (
          match.score1 !== lastScore1 ||
          match.score2 !== lastScore2 ||
          match.arcadePoints !== lastPoints
        ) {
          lastScore1 = match.score1;
          lastScore2 = match.score2;
          lastPoints = match.arcadePoints;
          setScore({ p1: match.score1, p2: match.score2, points: match.arcadePoints });
        }
      } else {
        wonAt += dt;
        if (wonAt >= SIGNAL_HOLD_SEC && !victoryFired) {
          victoryFired = true;
          cancelled = true;
          onVictoryRef.current(match.arcadePoints, match.rallies);
          return;
        }
      }

      updatePongEffects(match, dt);
      draw(ctx, W, H, match, court, wonAt);
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [phase, matchKey]);

  useEffect(() => {
    if (goalFlash === 0) return;
    const t = window.setTimeout(() => setGoalFlash(0), 260);
    return () => window.clearTimeout(t);
  }, [goalFlash]);

  const intensity = 0.3 + (score.p1 / PONG_TARGET_GOALS) * 0.7;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#01040a]/92 px-3 py-4 backdrop-blur-[3px]">
      <div
        id="arcade-cabinet-natal"
        className="arcade-cabinet-yellow w-full max-w-[760px] select-none px-5 pt-5 pb-6 sm:px-9"
        style={{
          boxShadow: `0 0 ${Math.round(26 + intensity * 46)}px rgba(0, 243, 255, ${(
            0.16 + intensity * 0.3
          ).toFixed(2)})`,
        }}
      >
        <div className="flex w-full items-baseline justify-between gap-3 border-b border-amber-950/25 px-1 pb-2">
          <div>
            <span className="block font-mono-tabular text-[10px] uppercase tracking-[0.24em] text-neutral-900/75">
              Isla Natal · Arboleda · Máquina regalada
            </span>
            <h2 className="font-display text-xl font-bold tracking-widest text-neutral-950 sm:text-2xl">
              PONG · EL RETO DEL VIAJERO
            </h2>
          </div>
          <div className="text-right font-mono-tabular text-xs font-bold text-neutral-950">
            <span className="block">
              {score.p1} - {score.p2} · META {PONG_TARGET_GOALS}
            </span>
            <span className="text-[10px] tracking-widest text-neutral-900/70">
              {score.points} PTS
            </span>
          </div>
        </div>

        <div className="arcade-screen-bezel relative mt-4 w-full overflow-hidden">
          {phase === 'boot' ? (
            <div className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-3 bg-black">
              <div className="h-[2px] w-1/3 bg-cyan-200/80 animate-pulse" />
              <p className="font-mono-tabular text-[11px] tracking-[0.3em] text-cyan-200/85">
                CALENTANDO EL TUBO…
              </p>
              <p className="font-mono-tabular text-[10px] tracking-[0.2em] text-cyan-100/45">
                «JUEGA. Y NO PARES HASTA GANARME.»
              </p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className="crisp-arcade-canvas block h-auto w-full aspect-[3/2] bg-black"
            />
          )}

          <div aria-hidden="true" className="crt-glass-reflection pointer-events-none absolute inset-0" />

          {goalFlash > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cyan-200/20 mix-blend-screen"
            />
          )}

          {phase === 'lost' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/88 p-6 text-center backdrop-blur-sm">
              <p className="font-mono-tabular text-lg font-bold text-white sm:text-xl">
                LA MÁQUINA APAGA LA LUZ ({score.p1} - {score.p2})
              </p>
              <p className="max-w-sm font-ui text-xs text-slate-300 sm:text-sm">
                El viajero no tenía prisa. La isla entera puede esperar: nada de lo que has
                descubierto aquí se pierde. Respira y vuelve a intentarlo.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={restart} className="btn-ui cursor-pointer rounded px-6 py-2.5 text-sm font-bold">
                  Reintentar (3 goles)
                </button>
                <button
                  type="button"
                  onClick={quit}
                  className="cursor-pointer rounded border border-amber-900/30 bg-amber-200/75 px-4 py-2.5 text-sm font-bold text-neutral-950 hover:bg-amber-100"
                >
                  Salir del cobertizo
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-3 pt-1 text-xs font-bold text-neutral-950">
          <span className="font-mono-tabular">W / S · MOVER PALETA · {score.points} PTS</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.up = true;
              }}
              onPointerUp={() => {
                keysRef.current.up = false;
              }}
              onPointerLeave={() => {
                keysRef.current.up = false;
              }}
              className="cursor-pointer rounded bg-neutral-950 px-3.5 py-1.5 text-amber-300 hover:bg-neutral-800"
            >
              W · Subir
            </button>
            <button
              type="button"
              onPointerDown={() => {
                keysRef.current.down = true;
              }}
              onPointerUp={() => {
                keysRef.current.down = false;
              }}
              onPointerLeave={() => {
                keysRef.current.down = false;
              }}
              className="cursor-pointer rounded bg-neutral-950 px-3.5 py-1.5 text-amber-300 hover:bg-neutral-800"
            >
              S · Bajar
            </button>
            <button
              type="button"
              onClick={quit}
              className="cursor-pointer rounded border border-amber-900/30 bg-amber-200/75 px-3 py-1.5 text-neutral-950 hover:bg-amber-100"
            >
              Apagar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DIBUJO DEL TUBO CRT                                                */
/* ------------------------------------------------------------------ */

function draw(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  match: ReturnType<typeof createPongMatch>,
  court: typeof PONG_CABINET_COURT,
  wonAt: number | null
): void {
  ctx.imageSmoothingEnabled = false;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  const bg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.72);
  bg.addColorStop(0, wonAt !== null ? '#081226' : '#060d18');
  bg.addColorStop(0.75, '#02050a');
  bg.addColorStop(1, '#010204');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const p1x = playerPaddleX(court);
  const p2x = aiPaddleX(court);

  if (wonAt !== null) {
    // La pantalla deja de ser un juego y se convierte en una señal
    const t = wonAt / SIGNAL_HOLD_SEC;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let y = 0; y < H; y += 3) {
      const n = Math.sin(y * 0.35 + wonAt * 14) * Math.cos(y * 0.11 - wonAt * 6);
      if (n < 0.25) continue;
      ctx.globalAlpha = Math.min(0.85, n * (0.25 + t));
      ctx.fillStyle = y % 6 === 0 ? '#67e8f9' : '#e0f2fe';
      ctx.fillRect(0, y, W, 1 + Math.round(n));
    }
    ctx.globalAlpha = 1;

    // Silueta de un archipiélago que se forma entre la estática
    if (t > 0.32) {
      const a = Math.min(1, (t - 0.32) / 0.4);
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) {
        const px = (i / 24) * W;
        const py =
          H * 0.62 +
          Math.sin(i * 0.9) * 16 +
          Math.cos(i * 0.37) * 26 -
          (i > 8 && i < 15 ? 34 : 0);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(0, H * 0.62, W, H * 0.38);
    }

    if (t > 0.6) {
      ctx.globalAlpha = Math.min(1, (t - 0.6) / 0.3);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 22;
      ctx.fillText('ISLA DEL ORIGEN', W / 2, H * 0.4);
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = '#a5f3fc';
      ctx.fillText('·  ·  ·  señal entrante  ·  ·  ·', W / 2, H * 0.4 + 22);
    }

    ctx.globalAlpha = Math.min(1, t * 1.6) * 0.5;
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  ctx.fillStyle = 'rgba(224, 242, 254, 0.14)';
  ctx.fillRect(12, 4, W - 24, 2);
  ctx.fillRect(12, H - 6, W - 24, 2);

  const trail = match.ballTrail;
  for (let i = 0; i < trail.length; i++) {
    ctx.globalAlpha = ((i + 1) / trail.length) * 0.3;
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(Math.round(trail[i].x), Math.round(trail[i].y), court.ballSize, court.ballSize);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(0, 243, 255, 0.22)';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 16;
  ctx.fillRect(p1x, Math.round(match.p1Y), court.paddleW, court.paddleH);
  ctx.fillRect(p2x, Math.round(match.p2Y), court.paddleW, court.paddleH);
  ctx.fillRect(Math.round(match.ballX), Math.round(match.ballY), court.ballSize, court.ballSize);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
  for (let i = 10; i < H; i += 22) ctx.fillRect(W / 2 - 2, i, 4, 11);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(p1x, Math.round(match.p1Y), court.paddleW, court.paddleH);
  ctx.fillRect(p2x, Math.round(match.p2Y), court.paddleW, court.paddleH);
  ctx.fillRect(Math.round(match.ballX), Math.round(match.ballY), court.ballSize, court.ballSize);

  for (const sp of match.sparks) {
    ctx.globalAlpha = Math.max(0, sp.life / 0.36);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(sp.x - 2, sp.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;

  for (const pop of match.popups) {
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.globalAlpha = Math.min(1, pop.life * 1.4);
    ctx.fillStyle = '#fde047';
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;

  ctx.font = '700 38px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 18;
  ctx.fillText(String(match.score1), W / 2 - 90, 50);
  ctx.fillText(String(match.score2), W / 2 + 90, 50);

  ctx.shadowBlur = 0;
  ctx.font = '700 12px "JetBrains Mono", monospace';
  ctx.fillStyle = match.score1 >= PONG_TARGET_GOALS ? '#39ff14' : '#00f3ff';
  ctx.fillText(`GOLES ${match.score1} / ${PONG_TARGET_GOALS}`, W / 2, 24);

  ctx.restore();
}
