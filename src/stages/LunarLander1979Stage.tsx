/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LUNAR LANDER (1979 · Atari) — HITO JUGABLE VECTORIAL DE PIXELVERSE
 * Recrea el proyector QuadraScan XY, física de gravedad lunar, altímetro, consumo de
 * combustible y aterrizaje de precisión sobre plataformas con multiplicadores (2X, 3X, 5X).
 * Superar los 500 PTS o lograr un alunizaje perfecto desbloquea la LENTE CUÁNTICA.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Compass, RotateCcw, Trophy } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';

const CANVAS_W = 640;
const CANVAS_H = 460;

interface LandingPad {
  x1: number;
  x2: number;
  y: number;
  mult: number;
}

export function LunarLander1979Stage({
  active,
  alreadyRestored,
  bestSavedScore = 0,
  onVictoryRecorded,
  onCeremonyDone,
  onExitToIsland,
}: {
  active: boolean;
  alreadyRestored: boolean;
  bestSavedScore?: number;
  onVictoryRecorded: (score: number) => void;
  onCeremonyDone: () => void;
  onExitToIsland: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(bestSavedScore);
  const [fuel, setFuel] = useState(800);
  const [statusMsg, setStatusMsg] = useState('Desciende con cuidado hacia una plataforma plana (2X, 3X, 5X).');
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [restorationCeremonyActive, setRestorationCeremonyActive] = useState(false);

  const landerRef = useRef({
    x: 100,
    y: 70,
    vx: 24,
    vy: 10,
    angle: 0,
    thrusting: false,
    crashed: false,
    landed: false,
  });

  const padsRef = useRef<LandingPad[]>([
    { x1: 180, x2: 240, y: 380, mult: 2 },
    { x1: 340, x2: 390, y: 340, mult: 3 },
    { x1: 490, x2: 530, y: 400, mult: 5 },
  ]);

  const terrainPointsRef = useRef<{ x: number; y: number }[]>([]);
  const keysRef = useRef<Record<string, boolean>>({});
  const memoryData = getHistoricalMemory('lunar-lander');

  const generateTerrain = useCallback(() => {
    const pts: { x: number; y: number }[] = [];
    const pads = padsRef.current;

    pts.push({ x: 0, y: 320 });
    pts.push({ x: 80, y: 390 });
    pts.push({ x: 140, y: 350 });

    // Pad 1 (2X)
    pts.push({ x: pads[0].x1, y: pads[0].y });
    pts.push({ x: pads[0].x2, y: pads[0].y });

    pts.push({ x: 290, y: 420 });

    // Pad 2 (3X)
    pts.push({ x: pads[1].x1, y: pads[1].y });
    pts.push({ x: pads[1].x2, y: pads[1].y });

    pts.push({ x: 440, y: 360 });

    // Pad 3 (5X)
    pts.push({ x: pads[2].x1, y: pads[2].y });
    pts.push({ x: pads[2].x2, y: pads[2].y });

    pts.push({ x: 590, y: 370 });
    pts.push({ x: CANVAS_W, y: 310 });

    terrainPointsRef.current = pts;
  }, []);

  const resetLander = useCallback(() => {
    landerRef.current = {
      x: 80 + Math.random() * 120,
      y: 60,
      vx: 18 + Math.random() * 15,
      vy: 8 + Math.random() * 10,
      angle: 0,
      thrusting: false,
      crashed: false,
      landed: false,
    };
  }, []);

  const resetGame = useCallback(() => {
    setScore(0);
    setFuel(800);
    setGameOver(false);
    setGameWon(false);
    setStatusMsg('Alinea la nave y regula el empuje [Espacio / ▲].');
    generateTerrain();
    resetLander();
  }, [generateTerrain, resetLander]);

  useEffect(() => {
    if (active) {
      resetGame();
    }
  }, [active, resetGame]);

  // Key listeners
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [active]);

  // Main Loop
  useEffect(() => {
    if (!active) return;
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const keys = keysRef.current;
      const lander = landerRef.current;

      if (!lander.crashed && !lander.landed && !gameOver) {
        // Rotate attitude
        if (keys['ArrowLeft'] || keys['KeyA']) {
          lander.angle -= 1.8 * dt;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
          lander.angle += 1.8 * dt;
        }

        // Thrust
        lander.thrusting = Boolean((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && fuel > 0);
        if (lander.thrusting) {
          retroAudio.syncTick(true);
          const thrustAcc = 48.0;
          lander.vx += Math.sin(lander.angle) * thrustAcc * dt;
          lander.vy -= Math.cos(lander.angle) * thrustAcc * dt;

          setFuel((f) => {
            const nf = Math.max(0, f - 24 * dt);
            if (nf <= 0) setStatusMsg('¡COMBUSTIBLE AGOTADO!');
            return nf;
          });
        }

        // Lunar Gravity (16.2 px/s^2)
        lander.vy += 16.2 * dt;

        // Position update
        lander.x += lander.vx * dt;
        lander.y += lander.vy * dt;

        // Screen wrap horizontally
        if (lander.x < 0) lander.x = CANVAS_W;
        if (lander.x > CANVAS_W) lander.x = 0;

        // Check Terrain Collision
        const pts = terrainPointsRef.current;
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          if (lander.x >= p1.x && lander.x <= p2.x) {
            // Interpolate terrain height
            const t = (lander.x - p1.x) / (p2.x - p1.x);
            const groundY = p1.y + t * (p2.y - p1.y);

            if (lander.y >= groundY - 10) {
              lander.y = groundY - 10;

              // Check if landed on a pad
              const matchedPad = padsRef.current.find(
                (pad) => lander.x >= pad.x1 && lander.x <= pad.x2 && Math.abs(groundY - pad.y) < 2
              );

              const safeVy = Math.abs(lander.vy) <= 18;
              const safeVx = Math.abs(lander.vx) <= 14;
              const safeAngle = Math.abs(lander.angle) <= 0.25;

              if (matchedPad && safeVy && safeVx && safeAngle) {
                // SUCCESSFUL LANDING!
                lander.landed = true;
                retroAudio.questComplete();
                const padPts = 200 * matchedPad.mult;
                setStatusMsg(`¡ALUNIZAJE PERFECTO EN PLATAFORMA ${matchedPad.mult}X! (+${padPts} PTS)`);

                setScore((prev) => {
                  const next = prev + padPts;
                  if (next > highScore) setHighScore(next);
                  if (next >= 500 && !alreadyRestored && !gameWon) {
                    setGameWon(true);
                    onVictoryRecorded(next);
                    setRestorationCeremonyActive(true);
                  }
                  return next;
                });
              } else {
                // CRASH
                lander.crashed = true;
                retroAudio.alienExplode();
                setStatusMsg('¡IMPACTO DEMASIADO FUERTE EN EL CRÁTER! ATERRIZAJE FALLIDO.');
              }
              break;
            }
          }
        }
      }

      // --- VECTOR GRAPHICS RENDER ---
      ctx.fillStyle = '#020614';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw Terrain Line
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      const pts = terrainPointsRef.current;
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) ctx.moveTo(pts[i].x, pts[i].y);
        else ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Draw Landing Pad Multipliers
      ctx.fillStyle = '#fde047';
      ctx.font = '10px monospace';
      ctx.shadowBlur = 0;
      for (const pad of padsRef.current) {
        ctx.fillRect(pad.x1, pad.y, pad.x2 - pad.x1, 3);
        ctx.fillText(`${pad.mult}X`, (pad.x1 + pad.x2) / 2 - 8, pad.y + 14);
      }

      // Draw Lander
      if (!lander.crashed) {
        ctx.save();
        ctx.translate(lander.x, lander.y);
        ctx.rotate(lander.angle);

        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 6;

        // Capsule & Legs
        ctx.beginPath();
        ctx.arc(0, -6, 7, 0, Math.PI * 2);
        ctx.moveTo(-6, 0);
        ctx.lineTo(-10, 8);
        ctx.moveTo(6, 0);
        ctx.lineTo(10, 8);
        ctx.stroke();

        // Thrust Flame
        if (lander.thrusting) {
          ctx.strokeStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(-3, 2);
          ctx.lineTo(0, 12 + Math.random() * 6);
          ctx.lineTo(3, 2);
          ctx.stroke();
        }

        ctx.restore();
      } else {
        // Crash debris particles
        ctx.fillStyle = '#f43f5e';
        for (let i = 0; i < 8; i++) {
          ctx.fillRect(
            lander.x + (Math.random() - 0.5) * 24,
            lander.y + (Math.random() - 0.5) * 24,
            3,
            3
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active, alreadyRestored, fuel, gameOver, gameWon, highScore, onVictoryRecorded]);

  return (
    <div className="relative w-full max-w-[700px] mx-auto flex flex-col items-center">
      {/* Header HUD */}
      <div className="w-full flex items-center justify-between glass-panel p-3 mb-2 rounded-xl border border-[#a78bfa]/30 text-xs font-mono-tabular">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExitToIsland}
            className="btn-ui py-1 px-3 text-xs flex items-center gap-1 text-[#a78bfa] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Salir
          </button>
          <div>
            PUNTOS: <span className="text-[#a78bfa] font-bold text-sm">{score}</span>
          </div>
          <div>
            RÉCORD: <span className="text-[#fde047] font-bold">{highScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            COMBUSTIBLE:{' '}
            <span
              className={`font-bold text-sm ${
                fuel > 200 ? 'text-[#00f3ff]' : 'text-[#f43f5e]'
              }`}
            >
              {Math.floor(fuel)}
            </span>
          </div>
          <div>
            VEL Y:{' '}
            <span
              className={`font-bold ${
                Math.abs(landerRef.current.vy) <= 18 ? 'text-[#22c55e]' : 'text-[#f43f5e]'
              }`}
            >
              {Math.floor(landerRef.current.vy)}
            </span>
          </div>
        </div>
      </div>

      {/* Screen Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#a78bfa]/40 shadow-[0_0_30px_rgba(167,139,250,0.2)] bg-[#020614]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full max-w-[640px] h-auto block"
        />

        {/* Status Bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-1 rounded-md text-[11px] font-mono text-[#a78bfa] border border-[#a78bfa]/30">
          {statusMsg}
        </div>

        {/* Retry Button if crashed or landed */}
        {(landerRef.current.crashed || landerRef.current.landed) && (
          <button
            type="button"
            onClick={() => {
              resetLander();
              setStatusMsg('Alinea la nave y regula el empuje.');
            }}
            className="absolute top-4 right-4 btn-ui py-1.5 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer text-[#a78bfa] z-20"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Nuevo Intento de Alunizaje
          </button>
        )}

        {/* Victory Banner */}
        {gameWon && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel border border-[#a78bfa] px-4 py-2 rounded-lg text-center z-20 animate-bounce">
            <div className="text-xs font-bold text-[#a78bfa] flex items-center justify-center gap-1">
              <Compass className="w-4 h-4 text-[#fde047]" /> ¡SECTOR VECTORIAL Y LENTE CUÁNTICA DESBLOQUEADOS!
            </div>
            <div className="text-[10px] text-slate-300">
              Observatorio vectorial y calibrador del Cronoscopio activos en el Museo Viviente.
            </div>
          </div>
        )}
      </div>

      {/* Controls Legend */}
      <div className="w-full text-center mt-2 text-[11px] text-slate-400 font-mono">
        Controles: <span className="text-slate-200 font-bold">[◄ ► / A D] Girar Actitud</span> ·{' '}
        <span className="text-slate-200 font-bold">[Espacio / ▲ / W] Empuje Principal</span>
      </div>

      {/* Ceremony Modal */}
      {restorationCeremonyActive && (
        <MemoryUnlockedModal
          entry={memoryData}
          alreadyRestoredBefore={alreadyRestored}
          continueLabel="REGRESAR A LA ISLA DEL ORIGEN"
          onContinue={() => {
            setRestorationCeremonyActive(false);
            onCeremonyDone();
          }}
        />
      )}
    </div>
  );
}
