/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gabinete histórico PONG (Atari · 1972)
 * - Conserva el encuentro narrativo inicial de la pelota blanca y el destello CRT.
 * - Condición inmutable de victoria: alcanzar exactamente 3 puntos reales antes que la IA.
 * - Ceremonia «Memoria Desbloqueada» seguida de transformación de la paleta blanca en
 *   tabla voladora para desplazarse dentro de la misma Isla de los 70 (nunca a otra década).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';
import {
  aiPaddleX,
  createPongMatch,
  PONG_CABINET_COURT,
  PONG_TARGET_GOALS,
  playerPaddleX,
  spawnPongSparks,
  stepPongMatch,
  updatePongEffects,
} from '../pong/pongMatchCore';

export type PongCabinetPhase = 'intro' | 'flash' | 'playing' | 'lost';

export function Pong1972Stage({
  skipIntro = false,
  alreadyRestoredBefore = false,
  onVictoryRecorded,
  onCeremonyCompleted,
  onReturnToIslandOnBoard,
  onBackToIsland,
}: {
  skipIntro?: boolean;
  alreadyRestoredBefore?: boolean;
  onVictoryRecorded: (finalScore: number) => void;
  onCeremonyCompleted: () => void;
  onReturnToIslandOnBoard: () => void;
  onBackToIsland: () => void;
}) {
  const [pongPhase, setPongPhase] = useState<PongCabinetPhase>(
    skipIntro ? 'playing' : 'intro'
  );
  const [matchKey, setMatchKey] = useState<number>(1);
  const [pongStarflight, setPongStarflight] = useState<boolean>(false);
  const [pongCeremonyOpen, setPongCeremonyOpen] = useState<boolean>(false);
  const [wasRestoredSnapshot, setWasRestoredSnapshot] = useState<boolean>(
    alreadyRestoredBefore
  );
  const [p1Score, setP1Score] = useState<number>(0);
  const [p1Points, setP1Points] = useState<number>(0);
  const [p2Score, setP2Score] = useState<number>(0);

  const pongCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });
  const ceremonyGateRef = useRef<'none' | 'waiting' | 'approved'>('none');
  const victoryFiredRef = useRef<boolean>(false);

  const alreadyRestoredRef = useRef(alreadyRestoredBefore);
  alreadyRestoredRef.current = alreadyRestoredBefore;
  const onVictoryRecordedRef = useRef(onVictoryRecorded);
  onVictoryRecordedRef.current = onVictoryRecorded;
  const onCeremonyCompletedRef = useRef(onCeremonyCompleted);
  onCeremonyCompletedRef.current = onCeremonyCompleted;
  const onReturnToIslandOnBoardRef = useRef(onReturnToIslandOnBoard);
  onReturnToIslandOnBoardRef.current = onReturnToIslandOnBoard;

  useEffect(() => {
    setPongPhase(skipIntro ? 'playing' : 'intro');
    setP1Score(0);
    setP1Points(0);
    setP2Score(0);
    setPongStarflight(false);
    setPongCeremonyOpen(false);
    ceremonyGateRef.current = 'none';
    victoryFiredRef.current = false;
    keysRef.current.up = false;
    keysRef.current.down = false;
  }, [skipIntro]);

  useEffect(() => {
    if (pongPhase !== 'playing') {
      keysRef.current.up = false;
      keysRef.current.down = false;
    }
  }, [pongPhase]);

  useEffect(() => {
    if (pongPhase === 'intro') {
      const t = window.setTimeout(() => {
        retroAudio.flashBurst();
        setPongPhase('flash');
      }, 2200);
      return () => window.clearTimeout(t);
    }

    if (pongPhase === 'flash') {
      const t = window.setTimeout(() => {
        setPongPhase('playing');
      }, 600);
      return () => window.clearTimeout(t);
    }
  }, [pongPhase]);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keysRef.current.up = true;
      if (k === 's' || e.key === 'ArrowDown') keysRef.current.down = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') keysRef.current.up = false;
      if (k === 's' || e.key === 'ArrowDown') keysRef.current.down = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const handleCeremonyContinue = useCallback(() => {
    onCeremonyCompletedRef.current();
    setPongCeremonyOpen(false);
    ceremonyGateRef.current = 'approved';
    setPongStarflight(true);
  }, []);

  useEffect(() => {
    if (pongPhase !== 'playing') return;

    const canvas = pongCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const resolvedSkin =
      rootStyles.getPropertyValue('--avatar-skin').trim() || '#ffccaa';
    const resolvedHair =
      rootStyles.getPropertyValue('--avatar-hair').trim() || '#331100';
    const resolvedShirt =
      rootStyles.getPropertyValue('--avatar-shirt').trim() || '#00f3ff';

    const court = PONG_CABINET_COURT;
    const W = canvas.width;
    const H = canvas.height;
    const PADDLE_W = court.paddleW;
    const PADDLE_H = court.paddleH;
    const BALL_SIZE = court.ballSize;

    const match = createPongMatch(court);

    const warpStars = Array.from({ length: 65 }, (_, i) => ({
      x: (i * 83) % W,
      y: (i * 59) % H,
      speed: 140 + (i % 5) * 90,
      size: 1.5 + (i % 3),
    }));

    let score1 = 0;
    let arcadePts = 0;
    let score2 = 0;
    let victoryCutscene = false;
    let cutsceneElapsed = 0;
    let launchSfxPlayed = false;
    let anchorPaddleCy = H / 2;
    let cutsceneP1Y = match.p1Y;
    let cancelled = false;
    victoryFiredRef.current = false;

    const triggerPongVictory = () => {
      if (victoryFiredRef.current) return;
      victoryFiredRef.current = true;
      victoryCutscene = true;
      cutsceneElapsed = 0;
      match.ballTrail.length = 0;
      cutsceneP1Y = match.p1Y;
      anchorPaddleCy = Math.max(92, Math.min(H - 82, match.p1Y + PADDLE_H / 2));
      setWasRestoredSnapshot(alreadyRestoredRef.current);
      onVictoryRecordedRef.current(arcadePts);
      ceremonyGateRef.current = 'waiting';
      setPongCeremonyOpen(true);
      retroAudio.portalVictory();
    };

    let rafId = 0;
    let prevNow = performance.now();

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.04, (now - prevNow) / 1000);
      prevNow = now;

      if (!victoryCutscene) {
        const events = stepPongMatch(match, court, dt, {
          up: keysRef.current.up,
          down: keysRef.current.down,
        });

        for (const ev of events) {
          if (ev.type === 'wall') {
            retroAudio.pongWall();
          } else if (ev.type === 'paddle') {
            retroAudio.pongPaddle();
          } else if (ev.type === 'goal') {
            retroAudio.pongScore(ev.side === 'player');
          } else if (ev.type === 'matchLost') {
            cancelled = true;
            keysRef.current.up = false;
            keysRef.current.down = false;
            setPongPhase('lost');
            return;
          }
        }

        if (match.arcadePoints !== arcadePts) {
          arcadePts = match.arcadePoints;
          setP1Points(arcadePts);
        }
        if (match.score1 !== score1) {
          score1 = match.score1;
          setP1Score(score1);
        }
        if (match.score2 !== score2) {
          score2 = match.score2;
          setP2Score(score2);
        }
        if (match.winner === 'player') {
          triggerPongVictory();
        }
      } else if (ceremonyGateRef.current === 'approved') {
        cutsceneElapsed += dt;
        if (cutsceneElapsed >= 0.78 && !launchSfxPlayed) {
          launchSfxPlayed = true;
          retroAudio.hoverboardLaunch();
          spawnPongSparks(match, 26, anchorPaddleCy, 18);
        }
        if (cutsceneElapsed >= 2.55) {
          cancelled = true;
          setPongStarflight(false);
          ceremonyGateRef.current = 'none';
          onReturnToIslandOnBoardRef.current();
          return;
        }
      }

      updatePongEffects(match, dt);

      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'source-over';
      ctx.shadowBlur = 0;
      const crtBg = ctx.createRadialGradient(
        W / 2,
        H / 2,
        20,
        W / 2,
        H / 2,
        W * 0.72
      );
      crtBg.addColorStop(0, victoryCutscene ? '#081226' : '#060d18');
      crtBg.addColorStop(0.75, '#02050a');
      crtBg.addColorStop(1, '#010204');
      ctx.fillStyle = crtBg;
      ctx.fillRect(0, 0, W, H);

      if (!victoryCutscene) {
        ctx.fillStyle = 'rgba(224, 242, 254, 0.14)';
        ctx.fillRect(12, 4, W - 24, 2);
        ctx.fillRect(12, H - 6, W - 24, 2);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (!victoryCutscene) {
        const rp1Y = Math.round(match.p1Y);
        const rp2Y = Math.round(match.p2Y);
        const rBallX = Math.round(match.ballX);
        const rBallY = Math.round(match.ballY);
        const ballTrail = match.ballTrail;

        ctx.shadowBlur = 0;
        for (let t = 0; t < ballTrail.length; t++) {
          const ratio = (t + 1) / ballTrail.length;
          ctx.globalAlpha = ratio * 0.28;
          ctx.fillStyle = '#7dd3fc';
          ctx.fillRect(
            Math.round(ballTrail[t].x),
            Math.round(ballTrail[t].y),
            BALL_SIZE,
            BALL_SIZE
          );
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = 'rgba(0, 243, 255, 0.22)';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 16;
        ctx.fillRect(playerPaddleX(court), rp1Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(aiPaddleX(court), rp2Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(rBallX, rBallY, BALL_SIZE, BALL_SIZE);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
        for (let i = 10; i < H; i += 22) {
          ctx.fillRect(W / 2 - 2, i, 4, 11);
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(playerPaddleX(court), rp1Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(aiPaddleX(court), rp2Y, PADDLE_W, PADDLE_H);
        ctx.fillRect(rBallX, rBallY, BALL_SIZE, BALL_SIZE);
      } else {
        const starAlpha = Math.min(1, cutsceneElapsed / 0.85);
        for (const ws of warpStars) {
          if (cutsceneElapsed > 0.78) {
            ws.x -= ws.speed * dt * 1.4;
            ws.y += ws.speed * dt * 0.35;
            if (ws.x < 0) ws.x += W;
            if (ws.y > H) ws.y -= H;
          }
          ctx.globalAlpha = starAlpha * 0.85;
          ctx.fillStyle = '#e0f2fe';
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 8;
          const streakW = cutsceneElapsed > 1.35 ? 14 : ws.size;
          ctx.fillRect(ws.x, ws.y, streakW, ws.size);
        }
        ctx.globalAlpha = 1;

        const courtFade = Math.max(0, 1 - cutsceneElapsed / 1.15);
        if (courtFade > 0.02) {
          ctx.globalAlpha = courtFade * 0.75;
          ctx.fillStyle = '#ffffff';
          for (let i = 10; i < H; i += 22) {
            ctx.fillRect(W / 2 - 2, i, 4, 11);
          }
          ctx.fillRect(aiPaddleX(court), Math.round(match.p2Y), PADDLE_W, PADDLE_H);
          ctx.globalAlpha = 1;
        }

        let boardCx = 25;
        let boardCy = anchorPaddleCy;
        let boardAngle = 0;
        let avatarX = 25;
        let avatarBottomY = anchorPaddleCy - PADDLE_H / 2;

        if (cutsceneElapsed < 0.75) {
          const dropT = cutsceneElapsed / 0.75;
          const easeIn = dropT * dropT;
          avatarBottomY =
            -18 + (anchorPaddleCy - PADDLE_H / 2 + 18) * easeIn;
          cutsceneP1Y += (anchorPaddleCy - PADDLE_H / 2 - cutsceneP1Y) * Math.min(1, dt * 12);
          boardCy = cutsceneP1Y + PADDLE_H / 2;
        } else if (cutsceneElapsed < 1.42) {
          const morphT = (cutsceneElapsed - 0.75) / 0.67;
          const smooth = morphT * morphT * (3 - 2 * morphT);
          boardCx = 25 + 88 * smooth;
          boardCy = anchorPaddleCy + (H * 0.58 - anchorPaddleCy) * smooth;
          boardAngle = (Math.PI / 2) * smooth;
          avatarX = boardCx;
          avatarBottomY =
            boardCy - ((1 - smooth) * (PADDLE_H / 2) + smooth * 6);
        } else {
          const flyT = (cutsceneElapsed - 1.42) / 1.13;
          const accel = flyT * flyT * 1.35 + flyT * 0.35;
          boardCx = 113 + accel * (W + 140);
          boardCy = H * 0.58 - accel * (H * 0.78);
          boardAngle = Math.PI / 2 - 0.24;
          avatarX = boardCx;
          avatarBottomY = boardCy - 6;

          const trailGrad = ctx.createLinearGradient(
            boardCx - 170,
            boardCy + 42,
            boardCx,
            boardCy
          );
          trailGrad.addColorStop(0, 'rgba(0, 243, 255, 0)');
          trailGrad.addColorStop(0.55, 'rgba(157, 0, 255, 0.65)');
          trailGrad.addColorStop(1, 'rgba(0, 243, 255, 0.98)');
          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(boardCx - 165, boardCy + 40);
          ctx.lineTo(boardCx - 18, boardCy + 4);
          ctx.stroke();
        }

        ctx.save();
        ctx.translate(boardCx, boardCy);
        ctx.rotate(boardAngle);
        ctx.shadowColor = cutsceneElapsed >= 0.75 ? '#00f3ff' : '#ffffff';
        ctx.shadowBlur = 26;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-PADDLE_W / 2, -PADDLE_H / 2, PADDLE_W, PADDLE_H);

        if (cutsceneElapsed >= 0.75) {
          ctx.fillStyle = '#00f3ff';
          ctx.fillRect(PADDLE_W / 2, -PADDLE_H * 0.35, 5, PADDLE_H * 0.7);
        }
        ctx.restore();

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const avTilt = cutsceneElapsed >= 1.42 ? -0.22 : 0;
        ctx.translate(avatarX, avatarBottomY);
        ctx.rotate(avTilt);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = resolvedShirt;
        ctx.fillRect(-13, -36, 26, 36);
        ctx.restore();

        ctx.shadowBlur = 0;
        ctx.fillStyle = resolvedHair;
        ctx.fillRect(-10, -34, 20, 6);
        ctx.fillStyle = resolvedSkin;
        ctx.fillRect(-8, -28, 16, 10);
        ctx.fillStyle = '#05070f';
        ctx.fillRect(-3, -25, 3, 3);
        ctx.fillRect(4, -25, 3, 3);
        ctx.fillStyle = resolvedShirt;
        ctx.fillRect(-9, -18, 18, 11);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-9, -9, 18, 2);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-8, -7, 6, 7);
        ctx.fillRect(2, -7, 6, 7);
        ctx.restore();
      }

      for (const sp of match.sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.36);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(sp.x - 2, sp.y - 2, 4, 4);
      }
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
      ctx.fillText(String(score1), W / 2 - 90, 50);
      ctx.fillText(String(score2), W / 2 + 90, 50);

      // Marcador CRT de objetivo de 3 goles
      ctx.shadowBlur = 0;
      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.fillStyle = score1 >= PONG_TARGET_GOALS ? '#39ff14' : '#00f3ff';
      ctx.fillText(
        `GOLES ${score1} / ${PONG_TARGET_GOALS}`,
        W / 2,
        24
      );
      ctx.restore();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [pongPhase, matchKey]);

  return (
    <>
      {pongPhase === 'intro' && (
        <div className="max-w-xl text-center flex flex-col items-center space-y-12 px-4">
          <div className="h-24 flex items-center justify-center">
            <div className="approaching-ball" />
          </div>
          <p className="font-mono-tabular text-lg sm:text-2xl text-white leading-relaxed">
            Una pequeña pelota blanca se acerca en la oscuridad... ¡Esquívala!
          </p>
        </div>
      )}

      {pongPhase === 'flash' && (
        <div className="fixed inset-0 z-50 bg-white white-flash-active pointer-events-none" />
      )}

      {(pongPhase === 'playing' || pongPhase === 'lost') && (
        <div
          id="arcade-cabinet"
          className="w-full max-w-[780px] arcade-cabinet-yellow px-6 sm:px-10 pt-6 pb-8 flex flex-col items-center space-y-4 select-none"
        >
          <div className="w-full flex items-baseline justify-between gap-3 px-2 border-b border-amber-950/25 pb-2">
            <div>
              <span className="block font-mono-tabular text-[10px] tracking-[0.24em] text-neutral-900/75 uppercase">
                ATARI · UP-RIGHT CABINET
              </span>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-widest text-neutral-950">
                PONG · 1972
              </h2>
            </div>
            <div className="text-right font-mono-tabular text-xs font-bold text-neutral-950">
              <span className="block">
                GOLES {p1Score} - {p2Score} (META: {PONG_TARGET_GOALS})
              </span>
              <span className="text-[10px] tracking-widest text-neutral-900/75">
                META: PRIMERO EN ALCANZAR 3 GOLES
              </span>
            </div>
          </div>

          <div
            id="arcade-screen-bezel"
            className="relative w-full arcade-screen-bezel overflow-hidden"
          >
            <canvas
              id="pong-canvas"
              ref={pongCanvasRef}
              width={600}
              height={400}
              className="block w-full h-auto aspect-[3/2] bg-black crisp-arcade-canvas"
            />

            <div
              className="absolute inset-0 crt-glass-reflection pointer-events-none"
              aria-hidden="true"
            />

            {pongStarflight && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 glass-hud rounded px-4 py-1.5 text-xs font-mono-tabular text-[#00f3ff] pointer-events-none whitespace-nowrap">
                ¡3 Goles alcanzados! La barra de Pong desciende sobre la Isla de los 70...
              </div>
            )}

            {pongPhase === 'lost' && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <p className="font-mono-tabular text-lg sm:text-xl font-bold text-white">
                  RONDA FINALIZADA ({p1Score} - {p2Score} GOLES)
                </p>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm font-ui">
                  Alcanza 3 goles contra la IA para recuperar la memoria de Pong y seguir recorriendo la Isla de los 70 sobre la barra.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    keysRef.current.up = false;
                    keysRef.current.down = false;
                    setP1Score(0);
                    setP1Points(0);
                    setP2Score(0);
                    setMatchKey((k) => k + 1);
                    setPongPhase('playing');
                  }}
                  className="btn-ui rounded px-6 py-2.5 text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Reintentar Pong
                </button>
              </div>
            )}
          </div>

          <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-1 text-xs font-bold text-neutral-950">
            <span className="font-mono-tabular">
              W / S · MOVER PALETA · META: 3 GOLES
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  retroAudio.uiClick();
                  onBackToIsland();
                }}
                className="px-3 py-1.5 bg-amber-200/75 text-neutral-950 hover:bg-amber-100 rounded border border-amber-900/30 cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                ← Isla 70s
              </button>
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
                className="px-3.5 py-1.5 bg-neutral-950 text-amber-300 hover:bg-neutral-800 rounded cursor-pointer select-none whitespace-nowrap shrink-0"
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
                className="px-3.5 py-1.5 bg-neutral-950 text-amber-300 hover:bg-neutral-800 rounded cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                S · Bajar
              </button>
            </div>
          </div>

          {pongCeremonyOpen && (
            <MemoryUnlockedModal
              entry={getHistoricalMemory('pong')}
              continueLabel="Volar en Tabla por la Isla de los 70"
              alreadyRestoredBefore={wasRestoredSnapshot}
              onContinue={handleCeremonyContinue}
            />
          )}
        </div>
      )}
    </>
  );
}
