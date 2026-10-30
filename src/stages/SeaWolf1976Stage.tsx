/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SEA WOLF (1976 · Midway / Dave Nutting) — HITO JUGABLE NAVAL DE PIXELVERSE
 * Recrea la vista por periscopio, disparos de torpedos con recarga, convoyes de barcos
 * de superficie (PT boats, destructores, cargueros) y esquive de minas flotantes.
 * Superar los 400 PTS restaura la memoria histórica de Sea Wolf para la isla.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Waves } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';

const CANVAS_W = 640;
const CANVAS_H = 440;

interface TargetShip {
  id: number;
  x: number;
  y: number;
  speed: number;
  dir: 1 | -1;
  type: 'pt' | 'destroyer' | 'cargo';
  w: number;
  h: number;
  points: number;
}

interface Torpedo {
  id: number;
  x: number;
  y: number;
  speed: number;
  tubeIndex: number;
}

interface NavalMine {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface Explosion {
  x: number;
  y: number;
  radius: number;
  life: number;
  color: string;
}

export function SeaWolf1976Stage({
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
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [restorationCeremonyActive, setRestorationCeremonyActive] = useState(false);

  const periscopeXRef = useRef(CANVAS_W / 2);
  const torpedoesRef = useRef<Torpedo[]>([]);
  const shipsRef = useRef<TargetShip[]>([]);
  const minesRef = useRef<NavalMine[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const tubeReloadsRef = useRef<number[]>([0, 0, 0, 0, 0]);

  const memoryData = getHistoricalMemory('sea-wolf');

  const spawnShip = useCallback(() => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    const types: ('pt' | 'destroyer' | 'cargo')[] = ['pt', 'destroyer', 'cargo'];
    const randType = types[Math.floor(Math.random() * types.length)];

    let w = 40;
    let h = 14;
    let points = 30;
    let speed = 60 + Math.random() * 40;
    const y = 110 + Math.random() * 40;

    if (randType === 'pt') {
      w = 28;
      h = 10;
      points = 100;
      speed = 130 + Math.random() * 50;
    } else if (randType === 'destroyer') {
      w = 54;
      h = 16;
      points = 50;
      speed = 80 + Math.random() * 30;
    }

    const startX = dir === 1 ? -w : CANVAS_W + w;

    shipsRef.current.push({
      id: Math.random(),
      x: startX,
      y,
      speed: speed * dir,
      dir,
      type: randType,
      w,
      h,
      points,
    });
  }, []);

  const spawnMine = useCallback(() => {
    const dir = Math.random() < 0.5 ? 1 : -1;
    minesRef.current.push({
      id: Math.random(),
      x: dir === 1 ? -20 : CANVAS_W + 20,
      y: 220 + Math.random() * 60,
      speed: (30 + Math.random() * 20) * dir,
    });
  }, []);

  const resetGame = useCallback(() => {
    setScore(0);
    setTimeLeft(60);
    setGameOver(false);
    setGameWon(false);
    periscopeXRef.current = CANVAS_W / 2;
    torpedoesRef.current = [];
    shipsRef.current = [];
    minesRef.current = [];
    explosionsRef.current = [];
    tubeReloadsRef.current = [0, 0, 0, 0, 0];

    // Initial ships and mines
    for (let i = 0; i < 4; i++) spawnShip();
    for (let i = 0; i < 3; i++) spawnMine();
  }, [spawnMine, spawnShip]);

  useEffect(() => {
    if (active) {
      resetGame();
    }
  }, [active, resetGame]);

  // Countdown timer
  useEffect(() => {
    if (!active || gameOver) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, gameOver]);

  // Fire torpedo logic
  const fireTorpedo = useCallback(() => {
    if (gameOver) return;
    const reloads = tubeReloadsRef.current;
    const readyTube = reloads.findIndex((r) => r <= 0);
    if (readyTube !== -1) {
      retroAudio.scannerPing(true);
      reloads[readyTube] = 1.2; // 1.2s reload
      torpedoesRef.current.push({
        id: Math.random(),
        x: periscopeXRef.current,
        y: CANVAS_H - 40,
        speed: 260,
        tubeIndex: readyTube,
      });
    }
  }, [gameOver]);

  // Input Handling
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        periscopeXRef.current = Math.max(40, periscopeXRef.current - 18);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        periscopeXRef.current = Math.min(CANVAS_W - 40, periscopeXRef.current + 18);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        fireTorpedo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, fireTorpedo]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const scaleX = CANVAS_W / rect.width;
    periscopeXRef.current = Math.max(40, Math.min(CANVAS_W - 40, sx * scaleX));
  };

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

      // Update reload timers
      for (let i = 0; i < tubeReloadsRef.current.length; i++) {
        if (tubeReloadsRef.current[i] > 0) {
          tubeReloadsRef.current[i] -= dt;
        }
      }

      // Maintain ship count
      if (shipsRef.current.length < 5 && Math.random() < 0.03) {
        spawnShip();
      }
      if (minesRef.current.length < 3 && Math.random() < 0.02) {
        spawnMine();
      }

      // Update ships
      for (let i = shipsRef.current.length - 1; i >= 0; i--) {
        const s = shipsRef.current[i];
        s.x += s.speed * dt;
        if ((s.dir === 1 && s.x > CANVAS_W + 80) || (s.dir === -1 && s.x < -80)) {
          shipsRef.current.splice(i, 1);
        }
      }

      // Update mines
      for (let i = minesRef.current.length - 1; i >= 0; i--) {
        const m = minesRef.current[i];
        m.x += m.speed * dt;
        if (m.x < -40 || m.x > CANVAS_W + 40) {
          minesRef.current.splice(i, 1);
        }
      }

      // Update torpedoes & collisions
      for (let ti = torpedoesRef.current.length - 1; ti >= 0; ti--) {
        const torp = torpedoesRef.current[ti];
        torp.y -= torp.speed * dt;

        let hit = false;

        // Check Mine collision
        for (let mi = minesRef.current.length - 1; mi >= 0; mi--) {
          const m = minesRef.current[mi];
          if (Math.hypot(torp.x - m.x, torp.y - m.y) < 18) {
            hit = true;
            retroAudio.playerHit();
            explosionsRef.current.push({
              x: m.x,
              y: m.y,
              radius: 12,
              life: 0.35,
              color: '#f97316',
            });
            minesRef.current.splice(mi, 1);
            break;
          }
        }

        if (!hit) {
          // Check Ship collision
          for (let si = shipsRef.current.length - 1; si >= 0; si--) {
            const s = shipsRef.current[si];
            if (
              torp.x >= s.x - s.w / 2 &&
              torp.x <= s.x + s.w / 2 &&
              torp.y >= s.y - s.h / 2 &&
              torp.y <= s.y + s.h / 2
            ) {
              hit = true;
              retroAudio.alienExplode();

              explosionsRef.current.push({
                x: s.x,
                y: s.y,
                radius: 20,
                life: 0.5,
                color: '#22c55e',
              });

              setScore((prev) => {
                const next = prev + s.points;
                if (next > highScore) setHighScore(next);
                if (next >= 400 && !alreadyRestored && !gameWon) {
                  setGameWon(true);
                  onVictoryRecorded(next);
                  setRestorationCeremonyActive(true);
                }
                return next;
              });

              shipsRef.current.splice(si, 1);
              break;
            }
          }
        }

        if (hit || torp.y < 90) {
          torpedoesRef.current.splice(ti, 1);
        }
      }

      // Update Explosions
      for (let ei = explosionsRef.current.length - 1; ei >= 0; ei--) {
        const ex = explosionsRef.current[ei];
        ex.life -= dt;
        ex.radius += 20 * dt;
        if (ex.life <= 0) {
          explosionsRef.current.splice(ei, 1);
        }
      }

      // --- RENDER PERISCOPE VISTA ---
      // Sky & Horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, 100);
      skyGrad.addColorStop(0, '#020617');
      skyGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, CANVAS_W, 100);

      // Sea Surface
      const seaGrad = ctx.createLinearGradient(0, 100, 0, CANVAS_H);
      seaGrad.addColorStop(0, '#0284c7');
      seaGrad.addColorStop(0.3, '#0369a1');
      seaGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, 100, CANVAS_W, CANVAS_H - 100);

      // Horizon line
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 100);
      ctx.lineTo(CANVAS_W, 100);
      ctx.stroke();

      // Draw Ships
      for (const s of shipsRef.current) {
        ctx.fillStyle = s.type === 'pt' ? '#38bdf8' : s.type === 'destroyer' ? '#94a3b8' : '#e2e8f0';
        ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
        // Ship bridge
        ctx.fillRect(s.x - 6, s.y - s.h / 2 - 6, 12, 6);
      }

      // Draw Mines
      for (const m of minesRef.current) {
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fda4af';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Torpedoes
      ctx.fillStyle = '#facc15';
      for (const torp of torpedoesRef.current) {
        ctx.beginPath();
        ctx.arc(torp.x, torp.y, 3, 0, Math.PI * 2);
        ctx.fill();
        // Wake trail
        ctx.strokeStyle = 'rgba(250,204,21,0.5)';
        ctx.beginPath();
        ctx.moveTo(torp.x, torp.y);
        ctx.lineTo(torp.x, torp.y + 12);
        ctx.stroke();
      }

      // Draw Explosions
      for (const ex of explosionsRef.current) {
        ctx.fillStyle = ex.color;
        ctx.globalAlpha = ex.life / 0.5;
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // --- PERISCOPE RETICLE OVERLAY ---
      ctx.save();
      const px = periscopeXRef.current;

      // Dark vignette outside periscope
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      ctx.lineWidth = 2;

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, CANVAS_H);
      ctx.stroke();

      // Horizontal crosshairs on horizon
      ctx.beginPath();
      ctx.moveTo(0, 110);
      ctx.lineTo(CANVAS_W, 110);
      ctx.stroke();

      // Reticle tick marks
      for (let dx = -100; dx <= 100; dx += 20) {
        ctx.beginPath();
        ctx.moveTo(px + dx, 105);
        ctx.lineTo(px + dx, 115);
        ctx.stroke();
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active, alreadyRestored, gameOver, gameWon, highScore, onVictoryRecorded, spawnMine, spawnShip]);

  return (
    <div className="relative w-full max-w-[700px] mx-auto flex flex-col items-center">
      {/* Header HUD */}
      <div className="w-full flex items-center justify-between glass-panel p-3 mb-2 rounded-xl border border-[#10b981]/30 text-xs font-mono-tabular">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExitToIsland}
            className="btn-ui py-1 px-3 text-xs flex items-center gap-1 text-[#10b981] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Salir
          </button>
          <div>
            PUNTOS: <span className="text-[#10b981] font-bold text-sm">{score}</span>
          </div>
          <div>
            RÉCORD: <span className="text-[#fde047] font-bold">{highScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            TIEMPO: <span className="text-[#f43f5e] font-bold text-sm">{timeLeft}s</span>
          </div>
          <div className="flex gap-1 items-center">
            TUBOS:{' '}
            {tubeReloadsRef.current.map((r, i) => (
              <span
                key={i}
                className={`w-2.5 h-3 rounded-xs ${
                  r <= 0 ? 'bg-[#10b981]' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Screen Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#10b981]/40 shadow-[0_0_30px_rgba(16,185,129,0.2)] bg-[#020617]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onPointerMove={handlePointerMove}
          onClick={fireTorpedo}
          className="w-full max-w-[640px] h-auto block cursor-crosshair"
        />

        {/* Overlay Game Over */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h3 className="text-2xl font-black tracking-widest text-[#10b981] mb-2 font-mono">
              FIN DE LA MISIÓN PERISCOPIO
            </h3>
            <p className="text-sm text-slate-300 mb-4 max-w-sm">
              Has alcanzado <span className="text-[#10b981] font-bold">{score} PUNTOS</span>. Se requieren 400 PTS para restaurar la <span className="text-[#00f3ff] font-bold">MEMORIA DE SEA WOLF</span>.
            </p>
            <button
              type="button"
              onClick={resetGame}
              className="btn-ui py-2.5 px-6 font-bold text-sm flex items-center gap-2 cursor-pointer text-[#10b981]"
            >
              <RotateCcw className="w-4 h-4" /> Reintentar Inmersión
            </button>
          </div>
        )}

        {/* Victory Banner */}
        {gameWon && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel border border-[#10b981] px-4 py-2 rounded-lg text-center z-20 animate-bounce">
            <div className="text-xs font-bold text-[#10b981] flex items-center justify-center gap-1">
              <Waves className="w-4 h-4 text-[#38bdf8]" /> ¡MEMORIA RESTAURADA: SEA WOLF (1976)!
            </div>
            <div className="text-[10px] text-slate-300">
              La frecuencia naval vuelve a latir en la isla.
            </div>
          </div>
        )}
      </div>

      {/* Controls Legend */}
      <div className="w-full text-center mt-2 text-[11px] text-slate-400 font-mono">
        Controles: <span className="text-slate-200 font-bold">[Mover Ratón / A D] Orientar Periscopio</span> ·{' '}
        <span className="text-slate-200 font-bold">[Clic / Espacio] Lanzar Torpedo</span>
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
