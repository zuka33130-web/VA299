/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ASTEROIDS (1979 · Atari) — HITO JUGABLE VECTORIAL DE PIXELVERSE
 * Recrea el monitor QuadraScan XY, física inercial de 360°, fragmentación de rocas,
 * ovnis cazadores, hiperespacio y el desbloqueo del DASH ORBITAL.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Zap } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';

const CANVAS_W = 640;
const CANVAS_H = 480;

interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: 'large' | 'medium' | 'small';
  radius: number;
  points: number[];
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface UFO {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  shootTimer: number;
}

export function Asteroids1979Stage({
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
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [restorationCeremonyActive, setRestorationCeremonyActive] = useState(false);

  // Ship State
  const shipRef = useRef({
    x: CANVAS_W / 2,
    y: CANVAS_H / 2,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    radius: 12,
    thrust: false,
    invulnerableTimer: 2.0,
    alive: true,
  });

  const asteroidsRef = useRef<Asteroid[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ufoRef = useRef<UFO | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});

  const memoryData = getHistoricalMemory('asteroids');

  const createAsteroid = (x: number, y: number, size: 'large' | 'medium' | 'small'): Asteroid => {
    const radius = size === 'large' ? 32 : size === 'medium' ? 18 : 10;
    const speed = size === 'large' ? 1.2 : size === 'medium' ? 2.2 : 3.4;
    const angle = Math.random() * Math.PI * 2;
    const pointsCount = 8 + Math.floor(Math.random() * 4);
    const points: number[] = [];
    for (let i = 0; i < pointsCount; i++) {
      const pAngle = (i / pointsCount) * Math.PI * 2;
      const offset = (Math.random() * 0.4 + 0.8) * radius;
      points.push(pAngle, offset);
    }

    return {
      id: Math.random(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      radius,
      points,
    };
  };

  const spawnWave = useCallback((waveNum: number) => {
    const count = 3 + waveNum * 2;
    const newAsteroids: Asteroid[] = [];
    for (let i = 0; i < count; i++) {
      let ax = Math.random() * CANVAS_W;
      let ay = Math.random() * CANVAS_H;
      // ensure far from center
      while (Math.hypot(ax - CANVAS_W / 2, ay - CANVAS_H / 2) < 120) {
        ax = Math.random() * CANVAS_W;
        ay = Math.random() * CANVAS_H;
      }
      newAsteroids.push(createAsteroid(ax, ay, 'large'));
    }
    asteroidsRef.current = newAsteroids;
  }, []);

  const resetGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setWave(1);
    setGameOver(false);
    setGameWon(false);
    shipRef.current = {
      x: CANVAS_W / 2,
      y: CANVAS_H / 2,
      angle: -Math.PI / 2,
      vx: 0,
      vy: 0,
      radius: 12,
      thrust: false,
      invulnerableTimer: 2.0,
      alive: true,
    };
    bulletsRef.current = [];
    particlesRef.current = [];
    ufoRef.current = null;
    spawnWave(1);
  }, [spawnWave]);

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

      if (e.code === 'Space' && shipRef.current.alive && !gameOver) {
        e.preventDefault();
        // Fire bullet
        const ship = shipRef.current;
        if (bulletsRef.current.length < 8) {
          retroAudio.laserShoot();
          const muzzleVx = Math.cos(ship.angle) * 7 + ship.vx * 0.5;
          const muzzleVy = Math.sin(ship.angle) * 7 + ship.vy * 0.5;
          bulletsRef.current.push({
            x: ship.x + Math.cos(ship.angle) * ship.radius,
            y: ship.y + Math.sin(ship.angle) * ship.radius,
            vx: muzzleVx,
            vy: muzzleVy,
            life: 1.1,
          });
        }
      }

      if ((e.code === 'ShiftLeft' || e.code === 'KeyH') && shipRef.current.alive && !gameOver) {
        // Hyperspace
        retroAudio.dashImpulse();
        shipRef.current.x = Math.random() * CANVAS_W;
        shipRef.current.y = Math.random() * CANVAS_H;
        shipRef.current.vx = 0;
        shipRef.current.vy = 0;
        shipRef.current.invulnerableTimer = 1.0;
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
      const ship = shipRef.current;

      // Update Ship
      if (ship.alive && !gameOver) {
        if (keys['ArrowLeft'] || keys['KeyA']) {
          ship.angle -= 4.2 * dt;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
          ship.angle += 4.2 * dt;
        }

        ship.thrust = Boolean(keys['ArrowUp'] || keys['KeyW']);
        if (ship.thrust) {
          ship.vx += Math.cos(ship.angle) * 220 * dt;
          ship.vy += Math.sin(ship.angle) * 220 * dt;

          // Thrust particles
          if (Math.random() < 0.6) {
            particlesRef.current.push({
              x: ship.x - Math.cos(ship.angle) * 12,
              y: ship.y - Math.sin(ship.angle) * 12,
              vx: -Math.cos(ship.angle) * 80 + (Math.random() - 0.5) * 40,
              vy: -Math.sin(ship.angle) * 80 + (Math.random() - 0.5) * 40,
              life: 0.25,
              color: '#00f3ff',
            });
          }
        }

        // Friction
        ship.vx *= 0.985;
        ship.vy *= 0.985;

        ship.x = (ship.x + ship.vx * dt + CANVAS_W) % CANVAS_W;
        ship.y = (ship.y + ship.vy * dt + CANVAS_H) % CANVAS_H;

        if (ship.invulnerableTimer > 0) {
          ship.invulnerableTimer -= dt;
        }
      }

      // Update Bullets
      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const b = bulletsRef.current[i];
        b.life -= dt;
        if (b.life <= 0) {
          bulletsRef.current.splice(i, 1);
          continue;
        }
        b.x = (b.x + b.vx * 60 * dt + CANVAS_W) % CANVAS_W;
        b.y = (b.y + b.vy * 60 * dt + CANVAS_H) % CANVAS_H;
      }

      // Update Particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life -= dt;
        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // Update UFO
      if (!ufoRef.current && Math.random() < 0.002 && !gameOver) {
        retroAudio.ufoWarble();
        const side = Math.random() < 0.5 ? 0 : CANVAS_W;
        ufoRef.current = {
          x: side,
          y: Math.random() * CANVAS_H * 0.7 + 50,
          vx: side === 0 ? 80 : -80,
          vy: (Math.random() - 0.5) * 30,
          radius: 14,
          shootTimer: 2.0,
        };
      }

      if (ufoRef.current) {
        const u = ufoRef.current;
        u.x += u.vx * dt;
        u.y += u.vy * dt;
        if (u.x < -30 || u.x > CANVAS_W + 30) {
          ufoRef.current = null;
        }
      }

      // Update Asteroids
      for (const ast of asteroidsRef.current) {
        ast.x = (ast.x + ast.vx * 60 * dt + CANVAS_W) % CANVAS_W;
        ast.y = (ast.y + ast.vy * 60 * dt + CANVAS_H) % CANVAS_H;
      }

      // Collision: Bullets vs Asteroids
      for (let bi = bulletsRef.current.length - 1; bi >= 0; bi--) {
        const b = bulletsRef.current[bi];
        let bulletHit = false;

        for (let ai = asteroidsRef.current.length - 1; ai >= 0; ai--) {
          const ast = asteroidsRef.current[ai];
          if (Math.hypot(b.x - ast.x, b.y - ast.y) < ast.radius) {
            bulletHit = true;
            retroAudio.alienExplode();

            // Particles
            for (let k = 0; k < 10; k++) {
              const pAng = Math.random() * Math.PI * 2;
              const pSpd = Math.random() * 120 + 30;
              particlesRef.current.push({
                x: ast.x,
                y: ast.y,
                vx: Math.cos(pAng) * pSpd,
                vy: Math.sin(pAng) * pSpd,
                life: 0.4,
                color: '#22d3ee',
              });
            }

            // Score & Split
            const addedPts = ast.size === 'large' ? 20 : ast.size === 'medium' ? 50 : 100;
            setScore((prev) => {
              const next = prev + addedPts;
              if (next > highScore) setHighScore(next);
              if (next >= 600 && !alreadyRestored && !gameWon) {
                setGameWon(true);
                onVictoryRecorded(next);
                setRestorationCeremonyActive(true);
              }
              return next;
            });

            if (ast.size === 'large') {
              asteroidsRef.current.push(createAsteroid(ast.x, ast.y, 'medium'));
              asteroidsRef.current.push(createAsteroid(ast.x, ast.y, 'medium'));
            } else if (ast.size === 'medium') {
              asteroidsRef.current.push(createAsteroid(ast.x, ast.y, 'small'));
              asteroidsRef.current.push(createAsteroid(ast.x, ast.y, 'small'));
            }

            asteroidsRef.current.splice(ai, 1);
            break;
          }
        }

        if (bulletHit) {
          bulletsRef.current.splice(bi, 1);
        }
      }

      // Collision: Ship vs Asteroids
      if (ship.alive && ship.invulnerableTimer <= 0 && !gameOver) {
        for (const ast of asteroidsRef.current) {
          if (Math.hypot(ship.x - ast.x, ship.y - ast.y) < ship.radius + ast.radius * 0.7) {
            retroAudio.playerHit();

            // Explosion
            for (let k = 0; k < 20; k++) {
              const pAng = Math.random() * Math.PI * 2;
              const pSpd = Math.random() * 160 + 40;
              particlesRef.current.push({
                x: ship.x,
                y: ship.y,
                vx: Math.cos(pAng) * pSpd,
                vy: Math.sin(pAng) * pSpd,
                life: 0.6,
                color: '#ff0055',
              });
            }

            setLives((prev) => {
              const next = prev - 1;
              if (next <= 0) {
                setGameOver(true);
                ship.alive = false;
              } else {
                ship.x = CANVAS_W / 2;
                ship.y = CANVAS_H / 2;
                ship.vx = 0;
                ship.vy = 0;
                ship.invulnerableTimer = 2.5;
              }
              return next;
            });
            break;
          }
        }
      }

      // Check next wave
      if (asteroidsRef.current.length === 0 && !gameOver) {
        retroAudio.waveAdvance();
        setWave((w) => {
          const nw = w + 1;
          spawnWave(nw);
          return nw;
        });
      }

      // --- RENDER ---
      ctx.fillStyle = '#020614';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Grid Vector Scanlines
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let y = 0; y < CANVAS_H; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_W, y);
        ctx.stroke();
      }

      // Draw Particles
      for (const p of particlesRef.current) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 0.6;
        ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
      }
      ctx.globalAlpha = 1.0;

      // Draw Bullets
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 8;
      for (const b of bulletsRef.current) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Asteroids
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 6;
      for (const ast of asteroidsRef.current) {
        ctx.beginPath();
        const pLen = ast.points.length;
        for (let i = 0; i < pLen; i += 2) {
          const pAng = ast.points[i];
          const pRad = ast.points[i + 1];
          const px = ast.x + Math.cos(pAng) * pRad;
          const py = ast.y + Math.sin(pAng) * pRad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw UFO
      if (ufoRef.current) {
        const u = ufoRef.current;
        ctx.strokeStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y, u.radius, u.radius * 0.5, 0, 0, Math.PI * 2);
        ctx.moveTo(u.x - u.radius * 0.6, u.y);
        ctx.lineTo(u.x + u.radius * 0.6, u.y);
        ctx.stroke();
      }

      // Draw Ship
      if (ship.alive && (ship.invulnerableTimer <= 0 || Math.floor(now / 100) % 2 === 0)) {
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.angle);

        ctx.strokeStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(ship.radius, 0);
        ctx.lineTo(-ship.radius * 0.8, -ship.radius * 0.7);
        ctx.lineTo(-ship.radius * 0.4, 0);
        ctx.lineTo(-ship.radius * 0.8, ship.radius * 0.7);
        ctx.closePath();
        ctx.stroke();

        if (ship.thrust) {
          ctx.strokeStyle = '#f97316';
          ctx.beginPath();
          ctx.moveTo(-ship.radius * 0.5, 0);
          ctx.lineTo(-ship.radius * 1.2, -4);
          ctx.lineTo(-ship.radius * 1.6, 0);
          ctx.lineTo(-ship.radius * 1.2, 4);
          ctx.closePath();
          ctx.stroke();
        }

        ctx.restore();
      }

      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active, alreadyRestored, gameOver, gameWon, highScore, onVictoryRecorded, spawnWave]);

  return (
    <div className="relative w-full max-w-[700px] mx-auto flex flex-col items-center">
      {/* Header HUD */}
      <div className="w-full flex items-center justify-between glass-panel p-3 mb-2 rounded-xl border border-[#00f3ff]/30 text-xs font-mono-tabular">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onExitToIsland}
            className="btn-ui py-1 px-3 text-xs flex items-center gap-1 text-[#00f3ff] cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Salir
          </button>
          <div>
            PUNTOS: <span className="text-[#00f3ff] font-bold text-sm">{score}</span>
          </div>
          <div>
            RÉCORD: <span className="text-[#fde047] font-bold">{highScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            OLA: <span className="text-[#38bdf8] font-bold">{wave}</span>
          </div>
          <div className="flex items-center gap-1">
            VIDAS:{' '}
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <span key={i} className="text-[#00f3ff]">
                ▲
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas Screen */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#00f3ff]/40 shadow-[0_0_30px_rgba(0,243,255,0.2)] bg-[#020614]">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full max-w-[640px] h-auto block"
        />

        {/* Overlay Game Over */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
            <h3 className="text-2xl font-black tracking-widest text-[#f43f5e] mb-2 font-mono">
              MISIÓN NAVE VECTORIAL PERDIDA
            </h3>
            <p className="text-sm text-slate-300 mb-4 max-w-sm">
              Tu nave ha sucumbido al cinturón de asteroides. Reintenta para superar los 600 PTS y desbloquear el <span className="text-[#00f3ff] font-bold">DASH ORBITAL</span>.
            </p>
            <button
              type="button"
              onClick={resetGame}
              className="btn-ui py-2.5 px-6 font-bold text-sm flex items-center gap-2 cursor-pointer text-[#00f3ff]"
            >
              <RotateCcw className="w-4 h-4" /> Reintentar Vuelo Vectorial
            </button>
          </div>
        )}

        {/* Victory Banner */}
        {gameWon && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-panel border border-[#00f3ff] px-4 py-2 rounded-lg text-center z-20 animate-bounce">
            <div className="text-xs font-bold text-[#00f3ff] flex items-center justify-center gap-1">
              <Zap className="w-4 h-4 text-[#fde047]" /> ¡PODER DESBLOQUEADO: DASH ORBITAL!
            </div>
            <div className="text-[10px] text-slate-300">
              Despeja barreras de glitch en la isla usando [1-4] + [F/Acción].
            </div>
          </div>
        )}
      </div>

      {/* Controls Legend */}
      <div className="w-full text-center mt-2 text-[11px] text-slate-400 font-mono">
        Controles: <span className="text-slate-200 font-bold">[▲ / W] Propulsión</span> ·{' '}
        <span className="text-slate-200 font-bold">[◄ ► / A D] Girar</span> ·{' '}
        <span className="text-slate-200 font-bold">[Espacio] Disparo</span> ·{' '}
        <span className="text-slate-200 font-bold">[Shift / H] Hiperespacio</span>
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
