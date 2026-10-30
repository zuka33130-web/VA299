/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * GALAXIAN (1979) — INVASIÓN ESPACIAL VECTORIAL RGB
 * Primer shooter espacial arcade con gráficos a color RGB y ataques en picada parabólica:
 * - Flota de aliens con Flagships insignia, Escoltas rojas, Drones púrpuras y Drones azules
 * - Movimiento de formación oscilante y maniobras de ataque en picada con trayectorias curvas
 * - Nave Galaxip con cañones de pulso láser gemelos
 * - Campo estelar multicolor desplazable con paralaje
 * - Sistema de puntuación y meta de victoria verificable (500 PTS) para restaurar el gabinete
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play, RotateCcw, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';

export interface Galaxian1979StageProps {
  alreadyRestored: boolean;
  bestSavedScore: number;
  onMemoryRestored: (finalScore: number) => void;
  onReturnToRoom: () => void;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  color: string;
}

interface Alien {
  id: string;
  type: 'flagship' | 'escort' | 'purple' | 'blue';
  row: number;
  col: number;
  origX: number;
  origY: number;
  x: number;
  y: number;
  state: 'formation' | 'swoop' | 'return';
  swoopT: number;
  swoopPath?: { p0: { x: number; y: number }; p1: { x: number; y: number }; p2: { x: number; y: number }; p3: { x: number; y: number } };
  points: number;
  divePoints: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isAlien: boolean;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
}

export const Galaxian1979Stage: React.FC<Galaxian1979StageProps> = ({
  alreadyRestored,
  bestSavedScore,
  onMemoryRestored,
  onReturnToRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'attract' | 'playing' | 'gameover' | 'victory'>('attract');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(Math.max(1500, bestSavedScore));
  const [lives, setLives] = useState<number>(3);
  const [wave, setWave] = useState<number>(1);
  const [victoryToast, setVictoryToast] = useState<string | null>(null);

  const keysRef = useRef<{ left: boolean; right: boolean; fire: boolean }>({
    left: false,
    right: false,
    fire: false,
  });

  const stateRef = useRef({
    playerX: 240,
    playerY: 530,
    playerW: 24,
    playerH: 22,
    fireCooldown: 0,
    aliens: [] as Alien[],
    bullets: [] as Bullet[],
    particles: [] as Particle[],
    stars: [] as Star[],
    formationOffset: 0,
    formationDir: 1,
    formationTimer: 0,
    swoopTimer: 1.5,
    score: 0,
    lives: 3,
    wave: 1,
    victoryReported: false,
    elapsed: 0,
  });

  // Init stars
  useEffect(() => {
    const starColors = ['#f43f5e', '#38bdf8', '#fbbf24', '#ffffff', '#c084fc'];
    const s: Star[] = [];
    for (let i = 0; i < 90; i++) {
      s.push({
        x: Math.random() * 480,
        y: Math.random() * 600,
        speed: 0.5 + Math.random() * 2.2,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }
    stateRef.current.stars = s;
  }, []);

  // Init Alien Formation
  const initAliens = useCallback(() => {
    const aliens: Alien[] = [];
    let idCounter = 0;

    // Row 0: 2 Flagships (Yellow/Cyan)
    for (let c = 0; c < 2; c++) {
      const origX = 200 + c * 80;
      const origY = 90;
      aliens.push({
        id: `alien-${idCounter++}`,
        type: 'flagship',
        row: 0,
        col: c,
        origX,
        origY,
        x: origX,
        y: origY,
        state: 'formation',
        swoopT: 0,
        points: 60,
        divePoints: 300,
        alive: true,
      });
    }

    // Row 1: 6 Red Escorts
    for (let c = 0; c < 6; c++) {
      const origX = 140 + c * 40;
      const origY = 125;
      aliens.push({
        id: `alien-${idCounter++}`,
        type: 'escort',
        row: 1,
        col: c,
        origX,
        origY,
        x: origX,
        y: origY,
        state: 'formation',
        swoopT: 0,
        points: 40,
        divePoints: 100,
        alive: true,
      });
    }

    // Row 2: 8 Purple Drones
    for (let c = 0; c < 8; c++) {
      const origX = 100 + c * 40;
      const origY = 160;
      aliens.push({
        id: `alien-${idCounter++}`,
        type: 'purple',
        row: 2,
        col: c,
        origX,
        origY,
        x: origX,
        y: origY,
        state: 'formation',
        swoopT: 0,
        points: 30,
        divePoints: 80,
        alive: true,
      });
    }

    // Row 3 & 4: 10 Blue Drones each
    for (let r = 3; r <= 4; r++) {
      for (let c = 0; c < 10; c++) {
        const origX = 60 + c * 40;
        const origY = 195 + (r - 3) * 35;
        aliens.push({
          id: `alien-${idCounter++}`,
          type: 'blue',
          row: r,
          col: c,
          origX,
          origY,
          x: origX,
          y: origY,
          state: 'formation',
          swoopT: 0,
          points: 20,
          divePoints: 60,
          alive: true,
        });
      }
    }

    stateRef.current.aliens = aliens;
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = true;
      if (e.code === 'Space' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        keysRef.current.fire = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = false;
      if (e.code === 'Space' || e.key === 'z' || e.key === 'Z') keysRef.current.fire = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main game loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const st = stateRef.current;
      const keys = keysRef.current;
      const canvas = canvasRef.current;

      st.elapsed += dt;

      // Update stars
      for (const star of st.stars) {
        star.y += star.speed;
        if (star.y > 600) {
          star.y = 0;
          star.x = Math.random() * 480;
        }
      }

      if (gameState === 'playing') {
        // Player movement
        if (keys.left) st.playerX = Math.max(30, st.playerX - 240 * dt);
        if (keys.right) st.playerX = Math.min(450, st.playerX + 240 * dt);

        // Player shooting
        st.fireCooldown -= dt;
        if (keys.fire && st.fireCooldown <= 0) {
          const playerBullets = st.bullets.filter((b) => !b.isAlien);
          if (playerBullets.length < 2) {
            st.bullets.push({
              x: st.playerX,
              y: st.playerY - 14,
              vy: -550,
              isAlien: false,
              color: '#38bdf8',
            });
            st.fireCooldown = 0.22;
            retroAudio.uiClick();
          }
        }

        // Formation sway animation
        st.formationTimer += dt * 1.5;
        st.formationOffset = Math.sin(st.formationTimer) * 45;

        // Swoop scheduler
        st.swoopTimer -= dt;
        if (st.swoopTimer <= 0) {
          st.swoopTimer = 1.8 + Math.random() * 1.2;
          const aliveFormation = st.aliens.filter((a) => a.alive && a.state === 'formation');
          if (aliveFormation.length > 0) {
            const attacker = aliveFormation[Math.floor(Math.random() * aliveFormation.length)];
            attacker.state = 'swoop';
            attacker.swoopT = 0;
            // Generate Bezier swoop curve toward player
            const targetX = st.playerX + (Math.random() - 0.5) * 80;
            attacker.swoopPath = {
              p0: { x: attacker.x, y: attacker.y },
              p1: { x: attacker.x + (Math.random() > 0.5 ? 90 : -90), y: attacker.y + 120 },
              p2: { x: targetX, y: 380 },
              p3: { x: targetX, y: 640 },
            };
          }
        }

        // Update aliens
        for (const alien of st.aliens) {
          if (!alien.alive) continue;

          if (alien.state === 'formation') {
            alien.x = alien.origX + st.formationOffset;
            alien.y = alien.origY;
          } else if (alien.state === 'swoop' && alien.swoopPath) {
            alien.swoopT += dt * 0.9;
            const t = alien.swoopT;
            const path = alien.swoopPath;

            // Cubic bezier position
            const inv = 1 - t;
            alien.x =
              inv * inv * inv * path.p0.x +
              3 * inv * inv * t * path.p1.x +
              3 * inv * t * t * path.p2.x +
              t * t * t * path.p3.x;
            alien.y =
              inv * inv * inv * path.p0.y +
              3 * inv * inv * t * path.p1.y +
              3 * inv * t * t * path.p2.y +
              t * t * t * path.p3.y;

            // Alien firing during swoop
            if (t > 0.3 && t < 0.7 && Math.random() < 0.04) {
              st.bullets.push({
                x: alien.x,
                y: alien.y + 10,
                vy: 240,
                isAlien: true,
                color: '#f43f5e',
              });
            }

            // Loop back to formation once off screen
            if (alien.y > 620) {
              alien.state = 'formation';
              alien.y = alien.origY;
            }
          }
        }

        // Update bullets
        for (let i = st.bullets.length - 1; i >= 0; i--) {
          const b = st.bullets[i];
          b.y += b.vy * dt;

          if (b.y < -10 || b.y > 610) {
            st.bullets.splice(i, 1);
            continue;
          }

          // Bullet collisions
          if (!b.isAlien) {
            // Player bullet hits alien
            let hit = false;
            for (const alien of st.aliens) {
              if (!alien.alive) continue;
              if (Math.abs(b.x - alien.x) < 16 && Math.abs(b.y - alien.y) < 14) {
                alien.alive = false;
                hit = true;

                const earned = alien.state === 'swoop' ? alien.divePoints : alien.points;
                st.score += earned;
                setScore(st.score);
                if (st.score > highScore) setHighScore(st.score);

                // Spawn explosion particles
                for (let p = 0; p < 12; p++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 40 + Math.random() * 120;
                  st.particles.push({
                    x: alien.x,
                    y: alien.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: alien.type === 'flagship' ? '#facc15' : '#f43f5e',
                    life: 0.5,
                    maxLife: 0.5,
                  });
                }

                retroAudio.shardCollect(1);

                // Check victory condition: score >= 500 or all aliens defeated!
                if ((st.score >= 500 || st.aliens.every((a) => !a.alive)) && !st.victoryReported) {
                  st.victoryReported = true;
                  setGameState('victory');
                  setVictoryToast('¡MEMORIA ARCADE GALAXIAN (1979) RESTAURADA!');
                  retroAudio.achievementUnlock();
                  onMemoryRestored(st.score);
                }
                break;
              }
            }
            if (hit) {
              st.bullets.splice(i, 1);
            }
          } else {
            // Alien bullet hits player
            if (Math.abs(b.x - st.playerX) < 16 && Math.abs(b.y - st.playerY) < 14) {
              st.bullets.splice(i, 1);
              st.lives -= 1;
              setLives(st.lives);

              // Spawn player death particles
              for (let p = 0; p < 20; p++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 50 + Math.random() * 160;
                st.particles.push({
                  x: st.playerX,
                  y: st.playerY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: '#38bdf8',
                  life: 0.8,
                  maxLife: 0.8,
                });
              }

              retroAudio.uiClick();

              if (st.lives <= 0) {
                setGameState('gameover');
              } else {
                st.playerX = 240;
              }
            }
          }
        }

        // Alien crashes into player
        for (const alien of st.aliens) {
          if (!alien.alive) continue;
          if (Math.abs(alien.x - st.playerX) < 20 && Math.abs(alien.y - st.playerY) < 18) {
            alien.alive = false;
            st.lives -= 1;
            setLives(st.lives);
            retroAudio.uiClick();
            if (st.lives <= 0) {
              setGameState('gameover');
            }
          }
        }

        // Update particles
        for (let i = st.particles.length - 1; i >= 0; i--) {
          const p = st.particles[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
          if (p.life <= 0) st.particles.splice(i, 1);
        }
      }

      // Draw everything
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderGalaxianFrame(ctx, canvas.width, canvas.height, st, gameState);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, highScore, onMemoryRestored]);

  const handleStartGame = () => {
    stateRef.current.playerX = 240;
    stateRef.current.score = 0;
    stateRef.current.lives = 3;
    stateRef.current.wave = 1;
    stateRef.current.victoryReported = false;
    stateRef.current.bullets = [];
    stateRef.current.particles = [];
    setScore(0);
    setLives(3);
    setWave(1);
    initAliens();
    setGameState('playing');
    retroAudio.uiClick();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#020307] text-slate-100 select-none overflow-hidden font-mono">
      {/* Header bar */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-black/85 backdrop-blur-md border-b border-rose-500/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onReturnToRoom();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 hover:border-rose-400 text-rose-300 rounded text-xs transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Los Cuatro Caminos</span>
          </button>
          <div>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
              NAMCO / MIDWAY 1979 · COLOR RGB ARCADE
            </span>
            <h1 className="text-sm font-bold text-white tracking-wide">
              GALAXIAN · MEMORIA DE LOS CUATRO CAMINOS
            </h1>
          </div>
        </div>

        {/* Arcade Telemetry HUD */}
        <div className="flex items-center gap-5 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">1UP</span>
            <span className="font-bold text-cyan-300 tabular-nums">{score}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">HIGH SCORE</span>
            <span className="font-bold text-amber-300 tabular-nums">{highScore}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[10px]">NAVES:</span>
            {Array.from({ length: lives }).map((_, i) => (
              <span key={i} className="text-rose-400 text-sm">▲</span>
            ))}
          </div>
        </div>
      </header>

      {/* Arcade Screen Frame */}
      <div className="relative w-full max-w-lg h-[80vh] mt-12 bg-black rounded-lg overflow-hidden border-2 border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.22)]">
        <canvas
          ref={canvasRef}
          width={480}
          height={600}
          className="w-full h-full object-contain crisp-arcade-canvas"
        />

        {/* Modal: Attract / Title Mode */}
        {gameState === 'attract' && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-950 border-2 border-rose-500 p-6 rounded-lg text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/80 border border-rose-400 flex items-center justify-center text-rose-300">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                  1979 COLOR SPACE SHOOTER
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">GALAXIAN</h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Defiende la galaxia de la armada invasora. Las naves nodrizas y sus escoltas se lanzan en picada con trayectorias curvas impredecibles. Restaura la máquina alcanzando <strong>500 PUNTOS</strong>.
                </p>
              </div>

              {/* Point table */}
              <div className="bg-black/70 p-3 rounded border border-white/10 text-xs space-y-1.5 text-slate-300 text-left">
                <div className="flex justify-between items-center text-yellow-400 font-bold">
                  <span>★ FLAGSHIP (AMARILLA)</span>
                  <span>60 PTS / PICADA 300 PTS</span>
                </div>
                <div className="flex justify-between items-center text-rose-400 font-bold">
                  <span>♦ ESCOLTA ROJA</span>
                  <span>40 PTS / PICADA 100 PTS</span>
                </div>
                <div className="flex justify-between items-center text-purple-400 font-bold">
                  <span>♣ DRON PÚRPURA</span>
                  <span>30 PTS / PICADA 80 PTS</span>
                </div>
                <div className="flex justify-between items-center text-cyan-400 font-bold">
                  <span>▲ DRON AZUL</span>
                  <span>20 PTS / PICADA 60 PTS</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartGame}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-black font-bold uppercase tracking-wider rounded shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer text-sm"
              >
                Insertar Moneda e Iniciar
              </button>
            </div>
          </div>
        )}

        {/* Modal: Game Over */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="max-w-sm w-full bg-slate-950 border-2 border-rose-500 p-6 rounded-lg text-center space-y-4 shadow-2xl">
              <h2 className="text-2xl font-bold text-rose-400 tracking-wider">GAME OVER</h2>
              <p className="text-xs text-slate-300">
                Puntuación final: <strong className="text-cyan-300 font-bold">{score} PTS</strong>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-black font-bold text-xs uppercase rounded cursor-pointer transition"
                >
                  Reintentar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    onReturnToRoom();
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded cursor-pointer transition"
                >
                  Volver a la Sala
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Victory */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-950 border-2 border-amber-400 p-6 rounded-lg text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                  ¡MEMORIA ARCADE RECUPERADA!
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">GALAXIAN (1979)</h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Has alcanzado la meta requerida con <strong>{score} PUNTOS</strong>. La máquina de Galaxian en la Sala de Los Cuatro Caminos queda oficialmente restablecida y resplandeciendo en color RGB.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStartGame}
                  className="flex-1 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-bold rounded cursor-pointer transition"
                >
                  Seguir Jugando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    onReturnToRoom();
                  }}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-black text-xs font-bold rounded cursor-pointer transition shadow-md"
                >
                  Regresar a la Sala
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control hints */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span>[ A / D ] o [ ← / → ] Moverse</span>
        <span>·</span>
        <span>[ ESPACIO ] Disparar Láser</span>
      </div>
    </div>
  );
};

/**
 * Renders the Galaxian starfield, armada, Galaxip fighter, lasers, and explosions.
 */
function renderGalaxianFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  st: {
    playerX: number;
    playerY: number;
    aliens: Alien[];
    bullets: Bullet[];
    particles: Particle[];
    stars: Star[];
    elapsed: number;
  },
  gameState: string
): void {
  // Clear space background
  ctx.fillStyle = '#020308';
  ctx.fillRect(0, 0, w, h);

  // Draw colorful starfield
  for (const s of st.stars) {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, 2, 2);
  }

  // Draw Galaxip Player Ship
  if (gameState === 'playing' || gameState === 'attract') {
    drawGalaxipShip(ctx, st.playerX, st.playerY);
  }

  // Draw Aliens
  for (const a of st.aliens) {
    if (!a.alive) continue;
    drawGalaxianAlien(ctx, a.x, a.y, a.type, st.elapsed);
  }

  // Draw Bullets
  for (const b of st.bullets) {
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - 1.5, b.y - 6, 3, 10);
  }

  // Draw Explosion Particles
  for (const p of st.particles) {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    ctx.globalAlpha = 1.0;
  }
}

/**
 * Draws the iconic Galaxip white/blue/red arrow ship.
 */
function drawGalaxipShip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  // Ship hull (White)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(10, 8);
  ctx.lineTo(4, 6);
  ctx.lineTo(0, 10);
  ctx.lineTo(-4, 6);
  ctx.lineTo(-10, 8);
  ctx.closePath();
  ctx.fill();

  // Red wingtips
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-12, 4, 4, 6);
  ctx.fillRect(8, 4, 4, 6);

  // Blue cockpit core
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-2, -4, 4, 7);

  // Yellow cannon nozzles
  ctx.fillStyle = '#facc15';
  ctx.fillRect(-1, -14, 2, 4);

  ctx.restore();
}

/**
 * Draws alien sprites for the 4 Galaxian ranks.
 */
function drawGalaxianAlien(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: 'flagship' | 'escort' | 'purple' | 'blue',
  elapsed: number
): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));

  const flap = Math.floor(elapsed * 4) % 2;

  if (type === 'flagship') {
    // Flagship: Yellow crown with cyan eyes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-9, -6, 18, 5);
    ctx.fillRect(-6, -10, 12, 4);
    ctx.fillRect(-2, -12, 4, 2);

    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-5, -4, 3, 3);
    ctx.fillRect(2, -4, 3, 3);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-8 + flap, 1, 4, 5);
    ctx.fillRect(4 - flap, 1, 4, 5);
  } else if (type === 'escort') {
    // Red Escort
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-8, -6, 16, 6);
    ctx.fillRect(-4, -9, 8, 3);

    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4, -4, 2, 2);
    ctx.fillRect(2, -4, 2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7 + flap, 1, 3, 4);
    ctx.fillRect(4 - flap, 1, 3, 4);
  } else if (type === 'purple') {
    // Purple Drone
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-7, -5, 14, 5);
    ctx.fillRect(-5, -8, 10, 3);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-3, -3, 2, 2);
    ctx.fillRect(1, -3, 2, 2);

    ctx.fillStyle = '#e879f9';
    ctx.fillRect(-6 + flap, 1, 3, 4);
    ctx.fillRect(3 - flap, 1, 3, 4);
  } else {
    // Blue Drone
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(-7, -5, 14, 5);
    ctx.fillRect(-4, -7, 8, 2);

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-3, -3, 2, 2);
    ctx.fillRect(1, -3, 2, 2);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-6 + flap, 1, 3, 4);
    ctx.fillRect(3 - flap, 1, 3, 4);
  }

  ctx.restore();
}
