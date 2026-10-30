/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TANK (1974 · Kee Games / Atari) — HITO JUGABLE DE DUELO TÁCTICO DE PIXELVERSE
 * Recrea el laberinto visto desde arriba, controles de oruga independientes, rebote de
 * proyectiles y minas explosivas. Superar los 500 PTS desbloquea el BÚNKER MILITAR.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Shield, Trophy } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';

const CANVAS_W = 640;
const CANVAS_H = 440;

interface TankActor {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  color: string;
  alive: boolean;
  score: number;
  reloadTimer: number;
}

interface Shell {
  x: number;
  y: number;
  vx: number;
  vy: number;
  bouncesLeft: number;
  ownerIsPlayer: boolean;
  life: number;
}

interface Mine {
  x: number;
  y: number;
}

interface WallBlock {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function Tank1974Stage({
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
  const [kills, setKills] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [restorationCeremonyActive, setRestorationCeremonyActive] = useState(false);

  const playerTankRef = useRef<TankActor>({
    x: 80,
    y: CANVAS_H / 2,
    angle: 0,
    vx: 0,
    vy: 0,
    color: '#00f3ff',
    alive: true,
    score: 0,
    reloadTimer: 0,
  });

  const enemyTankRef = useRef<TankActor>({
    x: CANVAS_W - 80,
    y: CANVAS_H / 2,
    angle: Math.PI,
    vx: 0,
    vy: 0,
    color: '#f97316',
    alive: true,
    score: 0,
    reloadTimer: 0,
  });

  const shellsRef = useRef<Shell[]>([]);
  const minesRef = useRef<Mine[]>([
    { x: CANVAS_W / 2 - 80, y: CANVAS_H / 2 - 60 },
    { x: CANVAS_W / 2 + 80, y: CANVAS_H / 2 - 60 },
    { x: CANVAS_W / 2 - 80, y: CANVAS_H / 2 + 60 },
    { x: CANVAS_W / 2 + 80, y: CANVAS_H / 2 + 60 },
  ]);

  const wallsRef = useRef<WallBlock[]>([
    // Outer Border
    { x: 10, y: 10, w: CANVAS_W - 20, h: 10 },
    { x: 10, y: CANVAS_H - 20, w: CANVAS_W - 20, h: 10 },
    { x: 10, y: 10, w: 10, h: CANVAS_H - 20 },
    { x: CANVAS_W - 20, y: 10, w: 10, h: CANVAS_H - 20 },
    // Internal Maze Blocks
    { x: 160, y: 80, w: 20, h: 120 },
    { x: 160, y: CANVAS_H - 200, w: 20, h: 120 },
    { x: CANVAS_W - 180, y: 80, w: 20, h: 120 },
    { x: CANVAS_W - 180, y: CANVAS_H - 200, w: 20, h: 120 },
    { x: CANVAS_W / 2 - 10, y: 140, w: 20, h: 160 },
  ]);

  const keysRef = useRef<Record<string, boolean>>({});
  const memoryData = getHistoricalMemory('tank');

  const resetGame = useCallback(() => {
    setScore(0);
    setKills(0);
    setGameOver(false);
    setGameWon(false);

    playerTankRef.current = {
      x: 80,
      y: CANVAS_H / 2,
      angle: 0,
      vx: 0,
      vy: 0,
      color: '#00f3ff',
      alive: true,
      score: 0,
      reloadTimer: 0,
    };

    enemyTankRef.current = {
      x: CANVAS_W - 80,
      y: CANVAS_H / 2,
      angle: Math.PI,
      vx: 0,
      vy: 0,
      color: '#f97316',
      alive: true,
      score: 0,
      reloadTimer: 0,
    };

    shellsRef.current = [];
  }, []);

  useEffect(() => {
    if (active) {
      resetGame();
    }
  }, [active, resetGame]);

  // Input listener
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      if (e.code === 'Space' && playerTankRef.current.alive && !gameOver) {
        e.preventDefault();
        const p = playerTankRef.current;
        if (p.reloadTimer <= 0) {
          p.reloadTimer = 0.4;
          retroAudio.laserShoot();
          shellsRef.current.push({
            x: p.x + Math.cos(p.angle) * 18,
            y: p.y + Math.sin(p.angle) * 18,
            vx: Math.cos(p.angle) * 280,
            vy: Math.sin(p.angle) * 280,
            bouncesLeft: 1,
            ownerIsPlayer: true,
            life: 2.5,
          });
        }
      }
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
  }, [active, gameOver]);

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
      const p = playerTankRef.current;
      const e = enemyTankRef.current;

      // Reload timers
      if (p.reloadTimer > 0) p.reloadTimer -= dt;
      if (e.reloadTimer > 0) e.reloadTimer -= dt;

      // Update Player Tank
      if (p.alive && !gameOver) {
        if (keys['ArrowLeft'] || keys['KeyA']) p.angle -= 3.0 * dt;
        if (keys['ArrowRight'] || keys['KeyD']) p.angle += 3.0 * dt;

        let moveSpeed = 0;
        if (keys['ArrowUp'] || keys['KeyW']) moveSpeed = 110;
        if (keys['ArrowDown'] || keys['KeyS']) moveSpeed = -70;

        const nextX = p.x + Math.cos(p.angle) * moveSpeed * dt;
        const nextY = p.y + Math.sin(p.angle) * moveSpeed * dt;

        // Wall collision test
        let blocked = false;
        for (const w of wallsRef.current) {
          if (
            nextX + 12 >= w.x &&
            nextX - 12 <= w.x + w.w &&
            nextY + 12 >= w.y &&
            nextY - 12 <= w.y + w.h
          ) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          p.x = nextX;
          p.y = nextY;
        }
      }

      // Enemy AI Tank
      if (e.alive && !gameOver) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const targetAngle = Math.atan2(dy, dx);

        // Turn toward player
        let diff = targetAngle - e.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        e.angle += Math.sign(diff) * Math.min(Math.abs(diff), 2.2 * dt);

        // Move forward if roughly aligned
        if (Math.abs(diff) < 0.8) {
          const eNextX = e.x + Math.cos(e.angle) * 80 * dt;
          const eNextY = e.y + Math.sin(e.angle) * 80 * dt;
          let eBlocked = false;
          for (const w of wallsRef.current) {
            if (
              eNextX + 12 >= w.x &&
              eNextX - 12 <= w.x + w.w &&
              eNextY + 12 >= w.y &&
              eNextY - 12 <= w.y + w.h
            ) {
              eBlocked = true;
              break;
            }
          }
          if (!eBlocked) {
            e.x = eNextX;
            e.y = eNextY;
          }
        }

        // Enemy shoot
        if (Math.abs(diff) < 0.3 && e.reloadTimer <= 0 && Math.hypot(dx, dy) < 320) {
          e.reloadTimer = 0.8;
          shellsRef.current.push({
            x: e.x + Math.cos(e.angle) * 18,
            y: e.y + Math.sin(e.angle) * 18,
            vx: Math.cos(e.angle) * 260,
            vy: Math.sin(e.angle) * 260,
            bouncesLeft: 1,
            ownerIsPlayer: false,
            life: 2.5,
          });
        }
      }

      // Shells & Bounces
      for (let si = shellsRef.current.length - 1; si >= 0; si--) {
        const s = shellsRef.current[si];
        s.life -= dt;
        if (s.life <= 0) {
          shellsRef.current.splice(si, 1);
          continue;
        }

        let nextSx = s.x + s.vx * dt;
        let nextSy = s.y + s.vy * dt;

        // Check walls
        for (const w of wallsRef.current) {
          if (
            nextSx >= w.x &&
            nextSx <= w.x + w.w &&
            nextSy >= w.y &&
            nextSy <= w.y + w.h
          ) {
            if (s.bouncesLeft > 0) {
              s.bouncesLeft--;
              retroAudio.pongWall();
              if (s.x < w.x || s.x > w.x + w.w) s.vx = -s.vx;
              else s.vy = -s.vy;
              nextSx = s.x + s.vx * dt;
              nextSy = s.y + s.vy * dt;
            } else {
              s.life = 0;
            }
            break;
          }
        }

        s.x = nextSx;
        s.y = nextSy;

        // Check Hit Enemy
        if (e.alive && Math.hypot(s.x - e.x, s.y - e.y) < 14) {
          retroAudio.alienExplode();
          e.x = CANVAS_W - 80;
          e.y = CANVAS_H / 2;

          setKills((k) => {
            const nk = k + 1;
            const newScore = nk * 100;
            setScore(newScore);
            if (newScore > highScore) setHighScore(newScore);

            if (nk >= 5 && !alreadyRestored && !gameWon) {
              setGameWon(true);
              onVictoryRecorded(newScore);
              setRestorationCeremonyActive(true);
            }
            return nk;
          });

          shellsRef.current.splice(si, 1);
          continue;
        }

        // Check Hit Player
        if (p.alive && Math.hypot(s.x - p.x, s.y - p.y) < 14) {
          retroAudio.playerHit();
          p.x = 80;
          p.y = CANVAS_H / 2;
          shellsRef.current.splice(si, 1);
          continue;
        }
      }

      // --- RENDER ---
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Walls
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#a3e635';
      ctx.lineWidth = 2;
      for (const w of wallsRef.current) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.strokeRect(w.x, w.y, w.w, w.h);
      }

      // Mines
      ctx.fillStyle = '#ef4444';
      for (const m of minesRef.current) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shells
      ctx.fillStyle = '#fde047';
      for (const s of shellsRef.current) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player Tank
      if (p.alive) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-12, -10, 24, 20);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, -3, 16, 6);
        ctx.restore();
      }

      // Draw Enemy Tank
      if (e.alive) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.fillStyle = e.color;
        ctx.fillRect(-12, -10, 24, 20);
        ctx.fillStyle = '#9a3412';
        ctx.fillRect(0, -3, 16, 6);
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active, alreadyRestored, gameOver, gameWon, highScore, onVictoryRecorded]);

  return (
    <div className="relative w-full max-w-[700px] mx-auto flex flex-col items-center">
      {/* Header HUD */}
      <div className="w-full flex items-center justify-between glass-panel p-3 mb-2 rounded-xl border border-[#a3e635]/30 text-xs font-mono-tabular">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExitToIsland}
            className="btn-ui py-1 px-3 text-xs flex items-center gap-1 text-[#a3e635] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Salir
          </button>
          <div>
            PUNTOS: <span className="text-[#a3e635] font-bold text-sm">{score}</span>
          </div>
          <div>
            RÉCORD: <span className="text-[#fde047] font-bold">{highScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            BAJAS TÁCTICAS: <span className="text-[#00f3ff] font-bold text-sm">{kills} / 5</span>
          </div>
        </div>
      </div>

      {/* Screen Canvas */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#a3e635]/40 shadow-[0_0_30px_rgba(163,230,53,0.2)] bg-[#0f172a]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full max-w-[640px] h-auto block"
        />

        {/* Victory Banner */}
        {gameWon && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel border border-[#a3e635] px-4 py-2 rounded-lg text-center z-20 animate-bounce">
            <div className="text-xs font-bold text-[#a3e635] flex items-center justify-center gap-1">
              <Shield className="w-4 h-4 text-[#fde047]" /> ¡BÚNKER MILITAR Y LLAVE DE LAS RUINAS DESBLOQUEADOS!
            </div>
            <div className="text-[10px] text-slate-300">
              Sector militar y cofre de armadura disponibles en Ruinas Centrales.
            </div>
          </div>
        )}
      </div>

      {/* Controls Legend */}
      <div className="w-full text-center mt-2 text-[11px] text-slate-400 font-mono">
        Controles: <span className="text-slate-200 font-bold">[▲ ▼ / W S] Orugas</span> ·{' '}
        <span className="text-slate-200 font-bold">[◄ ► / A D] Girar Torreta</span> ·{' '}
        <span className="text-slate-200 font-bold">[Espacio] Disparo de Cañón</span>
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
