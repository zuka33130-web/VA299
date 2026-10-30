/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NIGHT DRIVER (1976) — SIMULACIÓN DE CONDUCCIÓN NOCTURNA EN MOTOCICLETA
 * Recreación arcade auténtica inspirada en el pionero de conducción nocturna en primera persona:
 * - Perspectiva 3D con postes reflectantes en curva dinámica
 * - Manillar y tablero de motocicleta con velocímetro, tacómetro y medidor de distancia (2.000 m)
 * - Transmisión manual de 2 velocidades (LOW / HIGH), acelerador, freno y derrape
 * - Obstáculos, vehículos averiados y curvas cerradas telegrafiadas
 * - Verificación rigurosa de victoria al cruzar la meta para obtener los 3 Transistores de Germanio
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flag, Gauge, ShieldAlert, Sparkles, Trophy, Zap } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';

export interface NightDriver1976StageProps {
  alreadyCompleted: boolean;
  onVictory: (score: number) => void;
  onReturn: () => void;
}

interface RoadSegment {
  curve: number;
  width: number;
  hazardX?: number; // -1 to 1 offset for obstacle
  hazardType?: 'pylon' | 'oil' | 'barrier';
}

const TOTAL_DISTANCE_METERS = 2000;
const ROAD_SEGMENT_LENGTH = 15; // meters per segment
const TOTAL_SEGMENTS = Math.ceil(TOTAL_DISTANCE_METERS / ROAD_SEGMENT_LENGTH);

export const NightDriver1976Stage: React.FC<NightDriver1976StageProps> = ({
  alreadyCompleted,
  onVictory,
  onReturn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<'intro' | 'driving' | 'crashed' | 'victory'>('intro');
  const [speed, setSpeed] = useState<number>(0);
  const [gear, setGear] = useState<'LOW' | 'HIGH'>('LOW');
  const [distanceRemaining, setDistanceRemaining] = useState<number>(TOTAL_DISTANCE_METERS);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [collisions, setCollisions] = useState<number>(0);
  const [victoryClaimed, setVictoryClaimed] = useState<boolean>(alreadyCompleted);

  const keysRef = useRef<{ left: boolean; right: boolean; up: boolean; down: boolean }>({
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const stateRef = useRef({
    distanceTraveled: 0,
    speedMph: 0,
    gear: 'LOW' as 'LOW' | 'HIGH',
    playerX: 0, // -1 (left road edge) to +1 (right road edge)
    curveAccum: 0,
    cameraZ: 0,
    crashTimer: 0,
    elapsed: 0,
    score: 0,
    collisions: 0,
    victoryDone: false,
  });

  // Track map generation
  const segmentsRef = useRef<RoadSegment[]>([]);

  useEffect(() => {
    const segs: RoadSegment[] = [];
    for (let i = 0; i < TOTAL_SEGMENTS + 30; i++) {
      let curve = 0;
      let width = 580;
      let hazardX: number | undefined;
      let hazardType: 'pylon' | 'oil' | 'barrier' | undefined;

      // Section 1: Intro warm-up (0 - 300m)
      if (i > 10 && i < 25) {
        curve = 0.8;
      } else if (i >= 25 && i < 40) {
        curve = -0.7;
      }
      // Section 2: Winding hills (300 - 800m)
      else if (i >= 40 && i < 70) {
        curve = Math.sin(i * 0.3) * 1.5;
        if (i % 8 === 0) {
          hazardX = (i % 2 === 0 ? 0.4 : -0.4);
          hazardType = 'pylon';
        }
      }
      // Section 3: The Dark Narrow Bridge (800 - 1300m)
      else if (i >= 70 && i < 100) {
        width = 380;
        curve = Math.cos(i * 0.2) * 0.9;
        if (i % 9 === 0) {
          hazardX = (i % 3 === 0 ? 0 : (i % 2 === 0 ? 0.35 : -0.35));
          hazardType = 'barrier';
        }
      }
      // Section 4: Mountain Hairpin S-curves (1300 - 1800m)
      else if (i >= 100 && i < 135) {
        curve = (i % 16 < 8 ? 2.2 : -2.2);
        if (i % 7 === 0) {
          hazardX = (i % 2 === 0 ? 0.3 : -0.3);
          hazardType = 'pylon';
        }
      }
      // Section 5: Final high-speed sprint (1800 - 2000m)
      else if (i >= 135 && i < TOTAL_SEGMENTS) {
        curve = Math.sin(i * 0.1) * 0.4;
      }

      segs.push({ curve, width, hazardX, hazardType });
    }
    segmentsRef.current = segs;
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = true;
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = true;
      } else if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.up = true;
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.down = true;
      } else if (e.code === 'Space' || e.key === 'Shift') {
        e.preventDefault();
        stateRef.current.gear = stateRef.current.gear === 'LOW' ? 'HIGH' : 'LOW';
        setGear(stateRef.current.gear);
        retroAudio.uiClick();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      } else if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.up = false;
      } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keysRef.current.down = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Main game physics and rendering loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const st = stateRef.current;
      const keys = keysRef.current;
      const canvas = canvasRef.current;

      if (gameState === 'driving') {
        st.elapsed += dt;
        setElapsedTime(Math.floor(st.elapsed));

        // Speed calculation based on throttle, brakes, gear
        const maxSpeed = st.gear === 'LOW' ? 55 : 110;
        const accel = st.gear === 'LOW' ? 45 : 30;
        const drag = 18;

        if (st.crashTimer > 0) {
          st.crashTimer -= dt;
          st.speedMph = Math.max(0, st.speedMph - 90 * dt);
        } else {
          if (keys.up) {
            st.speedMph = Math.min(maxSpeed, st.speedMph + accel * dt);
          } else if (keys.down) {
            st.speedMph = Math.max(0, st.speedMph - 75 * dt);
          } else {
            st.speedMph = Math.max(0, st.speedMph - drag * dt);
          }
        }

        setSpeed(Math.round(st.speedMph));

        // Steering & lateral movement
        const currentSegmentIdx = Math.floor(st.distanceTraveled / ROAD_SEGMENT_LENGTH);
        const seg = segmentsRef.current[currentSegmentIdx] || { curve: 0, width: 500 };

        // Centrifugal force pulls motorcycle in opposite direction of curve
        const centrifugal = (st.speedMph / 100) * seg.curve * dt * 1.8;
        st.playerX += centrifugal;

        const steerSpeed = (0.7 + (st.speedMph / maxSpeed) * 0.9) * dt;
        if (keys.left) st.playerX -= steerSpeed;
        if (keys.right) st.playerX += steerSpeed;

        // Advance distance
        const metersPerSecond = (st.speedMph * 1609.34) / 3600;
        st.distanceTraveled += metersPerSecond * dt;
        st.score = Math.floor(st.distanceTraveled * 1.2) - st.collisions * 25;
        setScore(Math.max(0, st.score));

        const remaining = Math.max(0, TOTAL_DISTANCE_METERS - st.distanceTraveled);
        setDistanceRemaining(Math.round(remaining));

        // Collision check with road edge posts or obstacles
        const halfRoadRatio = 1.0;
        if (Math.abs(st.playerX) > halfRoadRatio && st.crashTimer <= 0) {
          // Off road crash!
          st.crashTimer = 0.9;
          st.collisions += 1;
          setCollisions(st.collisions);
          st.playerX = Math.sign(st.playerX) * 0.9;
          retroAudio.uiClick();
        }

        // Check hazard in current segment
        if (seg.hazardX !== undefined && st.crashTimer <= 0) {
          const segProgress = (st.distanceTraveled % ROAD_SEGMENT_LENGTH) / ROAD_SEGMENT_LENGTH;
          if (segProgress > 0.4 && segProgress < 0.6) {
            if (Math.abs(st.playerX - seg.hazardX) < 0.28) {
              st.crashTimer = 0.8;
              st.collisions += 1;
              setCollisions(st.collisions);
              st.speedMph = Math.max(0, st.speedMph - 40);
              retroAudio.uiClick();
            }
          }
        }

        // Win condition check
        if (st.distanceTraveled >= TOTAL_DISTANCE_METERS && !st.victoryDone) {
          st.victoryDone = true;
          setGameState('victory');
          setVictoryClaimed(true);
          retroAudio.achievementUnlock();
          onVictory(st.score);
        }
      }

      // Render 3D Night Driver canvas
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderNightDriverScene(ctx, canvas.width, canvas.height, st, segmentsRef.current);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, onVictory]);

  const handleStart = () => {
    stateRef.current.distanceTraveled = 0;
    stateRef.current.speedMph = 10;
    stateRef.current.gear = 'LOW';
    stateRef.current.playerX = 0;
    stateRef.current.crashTimer = 0;
    stateRef.current.elapsed = 0;
    stateRef.current.score = 0;
    stateRef.current.collisions = 0;
    stateRef.current.victoryDone = false;
    setGear('LOW');
    setGameState('driving');
    retroAudio.uiClick();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#010308] text-slate-100 select-none overflow-hidden font-mono">
      {/* Top Header Bar */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2.5 bg-black/80 backdrop-blur-md border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onReturn();
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-cyan-300 rounded text-xs transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a la Isla</span>
          </button>
          <div>
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
              ATARI 1976 · RUTA NOCTURNA
            </span>
            <h1 className="text-sm font-bold text-white tracking-wide">
              NIGHT DRIVER · LA CARRETERA DE LOS TRANSISTORES
            </h1>
          </div>
        </div>

        {/* Live HUD Telemetry */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-white/10">
            <Flag className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">Meta:</span>
            <span className="font-bold text-cyan-300 tabular-nums">{distanceRemaining} m</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-white/10">
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400">Velocidad:</span>
            <span className="font-bold text-amber-300 tabular-nums">{speed} MPH</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded border border-white/10">
            <span className="text-slate-400">Marcha:</span>
            <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${gear === 'HIGH' ? 'bg-amber-500 text-black' : 'bg-cyan-500 text-black'}`}>
              {gear}
            </span>
          </div>
        </div>
      </header>

      {/* Main Simulation Canvas */}
      <div className="relative w-full max-w-4xl h-[78vh] mt-12 bg-black rounded-lg overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_40px_rgba(0,243,255,0.18)]">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain crisp-arcade-canvas"
        />

        {/* Modal: Intro / Instructions */}
        {gameState === 'intro' && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-950 border-2 border-cyan-400 p-6 rounded-lg text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 mx-auto rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center text-cyan-300">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                  1976 FIRST-PERSON MOTORCYCLE
                </span>
                <h2 className="text-xl font-bold text-white mt-1">NIGHT DRIVER</h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Conduce por la carretera de montaña a través de la noche. Los postes reflectantes marcan el asfalto. Completa los <strong>2.000 metros</strong> para recuperar los <strong>3 Transistores de Germanio</strong> requeridos por el técnico Dylan para reparar Los Cuatro Caminos.
                </p>
              </div>

              {/* Controls guide */}
              <div className="bg-black/70 p-3 rounded border border-white/10 text-left text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-cyan-400 font-bold">[ ↑ ] o [ W ]</span>
                  <span>Acelerar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400 font-bold">[ ↓ ] o [ S ]</span>
                  <span>Frenar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-400 font-bold">[ ← / → ] o [ A / D ]</span>
                  <span>Girar Manillar</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400 font-bold">[ ESPACIO ] o [ SHIFT ]</span>
                  <span>Cambiar Marcha (LOW / HIGH)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStart}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold uppercase tracking-wider rounded shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer text-sm"
              >
                Encender Motor y Comenzar
              </button>
            </div>
          </div>
        )}

        {/* Modal: Victory Screen */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-950 border-2 border-amber-400 p-6 rounded-lg text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-amber-950/80 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_25px_rgba(251,191,36,0.5)]">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-widest">
                  ¡RUTA NOCTURNA COMPLETADA!
                </span>
                <h2 className="text-2xl font-bold text-white mt-1">META ALCANZADA</h2>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Has dominado las curvas y la inercia de la medianoche. En el punto de control final recogiste el estuche blindado:
                </p>
              </div>

              <div className="p-4 bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-500/50 rounded-lg text-left space-y-1">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>3 Transistores de Germanio (1976)</span>
                </div>
                <p className="text-[11px] text-amber-100/80">
                  Semiconductores analógicos genuinos. Dylan los necesita en <strong>Taller RS — Retro State</strong> para revivir las cuatro máquinas arcade.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-black/60 p-2 rounded border border-white/10">
                  <span className="text-slate-400 block text-[10px]">TIEMPO</span>
                  <span className="font-bold text-cyan-300">{elapsedTime}s</span>
                </div>
                <div className="bg-black/60 p-2 rounded border border-white/10">
                  <span className="text-slate-400 block text-[10px]">PUNTOS</span>
                  <span className="font-bold text-amber-300">{score}</span>
                </div>
                <div className="bg-black/60 p-2 rounded border border-white/10">
                  <span className="text-slate-400 block text-[10px]">COLISIONES</span>
                  <span className="font-bold text-rose-400">{collisions}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleStart}
                  className="flex-1 py-2.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-bold rounded cursor-pointer transition"
                >
                  Correr de Nuevo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    onReturn();
                  }}
                  className="flex-1 py-2.5 bg-cyan-400 hover:bg-cyan-300 text-black text-xs font-bold rounded cursor-pointer transition shadow-md"
                >
                  Regresar a la Isla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* On-screen touch/mouse helper controls for accessibility */}
      <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
        <span className="text-[11px] text-slate-500">
          Usa [W / S] acelerar/frenar · [A / D] volante · [ESPACIO] marcha
        </span>
      </div>
    </div>
  );
};

/**
 * 3D Pseudo-depth rendering of Night Driver road, reflector posts, motorcycle handlebars, and instruments.
 */
function renderNightDriverScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: {
    distanceTraveled: number;
    speedMph: number;
    gear: 'LOW' | 'HIGH';
    playerX: number;
    crashTimer: number;
    elapsed: number;
  },
  segments: RoadSegment[]
): void {
  // Clear black CRT night sky
  ctx.fillStyle = '#020409';
  ctx.fillRect(0, 0, width, height);

  // Distant mountain silhouette and twinkling stars
  ctx.fillStyle = '#ffffff';
  for (let s = 0; s < 40; s++) {
    const sx = ((s * 137 + state.elapsed * 5) % width);
    const sy = (s * 43) % (height * 0.4);
    const size = (s % 3 === 0) ? 2 : 1;
    ctx.fillRect(sx, sy, size, size);
  }

  // Horizon & Dark ground
  const horizonY = height * 0.44;
  ctx.fillStyle = '#010204';
  ctx.fillRect(0, horizonY, width, height - horizonY);

  const currentSegmentIdx = Math.floor(state.distanceTraveled / ROAD_SEGMENT_LENGTH);
  const segPercent = (state.distanceTraveled % ROAD_SEGMENT_LENGTH) / ROAD_SEGMENT_LENGTH;

  // Render road posts from horizon forward (painter's algorithm)
  const DRAW_DISTANCE = 45; // segments ahead
  let accumulatedCurve = 0;

  for (let n = DRAW_DISTANCE; n > 0; n--) {
    const segIdx = currentSegmentIdx + n;
    const seg = segments[segIdx] || { curve: 0, width: 500 };

    accumulatedCurve += seg.curve;

    // Perspective projection
    const z = (n - segPercent) * ROAD_SEGMENT_LENGTH;
    if (z <= 1) continue;

    const scale = 320 / z;
    const screenY = horizonY + (120 * scale);
    if (screenY > height) continue;

    // Center of road with curve offset & player lateral offset
    const curveOffset = accumulatedCurve * (scale * 24);
    const playerOffset = state.playerX * (seg.width * 0.5 * scale);
    const screenX = width * 0.5 + curveOffset - playerOffset;

    const roadHalfW = (seg.width * 0.5) * scale;
    const leftPostX = screenX - roadHalfW;
    const rightPostX = screenX + roadHalfW;

    const postH = Math.max(2, 28 * scale);
    const postW = Math.max(2, 6 * scale);

    // Render left white reflector post
    ctx.fillStyle = n % 2 === 0 ? '#ffffff' : '#94a3b8';
    ctx.fillRect(leftPostX - postW * 0.5, screenY - postH, postW, postH);

    // Amber reflector tip
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(leftPostX - postW * 0.5, screenY - postH, postW, Math.max(1, postH * 0.3));

    // Render right white reflector post
    ctx.fillStyle = n % 2 === 0 ? '#ffffff' : '#94a3b8';
    ctx.fillRect(rightPostX - postW * 0.5, screenY - postH, postW, postH);

    // Cyan reflector tip
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(rightPostX - postW * 0.5, screenY - postH, postW, Math.max(1, postH * 0.3));

    // Center dash line on road
    if (n % 3 === 0 && scale > 0.08) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillRect(screenX - 1.5, screenY - 2, 3, Math.max(2, 10 * scale));
    }

    // Render Hazard / Obstacle if present
    if (seg.hazardX !== undefined && scale > 0.08) {
      const hazardScreenX = screenX + seg.hazardX * roadHalfW;
      const hSize = 32 * scale;

      ctx.fillStyle = '#e11d48';
      ctx.fillRect(hazardScreenX - hSize * 0.5, screenY - hSize, hSize, hSize);

      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(hazardScreenX - hSize * 0.3, screenY - hSize * 0.8, hSize * 0.6, hSize * 0.4);
    }
  }

  // Crash flash effect
  if (state.crashTimer > 0) {
    ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.65, state.crashTimer)})`;
    ctx.fillRect(0, 0, width, height);

    // Collision spark lines
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const len = 35 + Math.sin(state.elapsed * 30 + i) * 15;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.7);
      ctx.lineTo(width * 0.5 + Math.cos(angle) * len, height * 0.7 + Math.sin(angle) * len);
      ctx.stroke();
    }
  }

  // Draw 1976 Motorcycle Cockpit & Handlebars
  drawMotorcycleCockpit(ctx, width, height, state.speedMph, state.gear, state.elapsed);
}

/**
 * Draws the motorcycle handlebars, windscreen rim, instrument dials, and headlamp reflection.
 */
function drawMotorcycleCockpit(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  speedMph: number,
  gear: 'LOW' | 'HIGH',
  elapsed: number
): void {
  const centerY = h - 110;
  const vibration = (speedMph / 110) * Math.sin(elapsed * 45) * 2;

  ctx.save();
  ctx.translate(0, vibration);

  // Motorcycle windshield / fairing base
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w * 0.15, h - 90);
  ctx.lineTo(w * 0.85, h - 90);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Headlight beam glow reflecting off front fender
  const glowGrad = ctx.createRadialGradient(w * 0.5, centerY + 20, 10, w * 0.5, centerY + 20, 140);
  glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.22)');
  glowGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(w * 0.3, centerY - 40, w * 0.4, 120);

  // Chrome handlebars bar
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.18, centerY + 10);
  ctx.lineTo(w * 0.38, centerY + 40);
  ctx.lineTo(w * 0.62, centerY + 40);
  ctx.lineTo(w * 0.82, centerY + 10);
  ctx.stroke();

  // Rubber Grips
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(w * 0.14, centerY - 2, 40, 22);
  ctx.fillRect(w * 0.86 - 40, centerY - 2, 40, 22);

  ctx.fillStyle = '#334155';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(w * 0.14 + i * 10, centerY - 2, 4, 22);
    ctx.fillRect(w * 0.86 - 40 + i * 10, centerY - 2, 4, 22);
  }

  // Instrument Gauges (Speedometer & Tachometer)
  // Left: Speedometer (0 - 120)
  const speedX = w * 0.42;
  const speedY = centerY + 30;
  const radius = 34;

  ctx.fillStyle = '#05070d';
  ctx.beginPath();
  ctx.arc(speedX, speedY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00f3ff';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MPH', speedX, speedY + 14);

  // Needle
  const speedAngle = -Math.PI * 0.75 + (speedMph / 120) * (Math.PI * 1.5);
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(speedX, speedY);
  ctx.lineTo(speedX + Math.cos(speedAngle) * (radius - 6), speedY + Math.sin(speedAngle) * (radius - 6));
  ctx.stroke();

  // Center cap
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(speedX, speedY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Right: Tachometer (0 - 10k RPM)
  const tachX = w * 0.58;
  const tachY = centerY + 30;

  ctx.fillStyle = '#05070d';
  ctx.beginPath();
  ctx.arc(tachX, tachY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('RPM x1000', tachX, tachY + 14);

  const rpm = (speedMph / (gear === 'LOW' ? 55 : 110)) * 8000 + 1000;
  const rpmAngle = -Math.PI * 0.75 + (rpm / 10000) * (Math.PI * 1.5);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tachX, tachY);
  ctx.lineTo(tachX + Math.cos(rpmAngle) * (radius - 6), tachY + Math.sin(rpmAngle) * (radius - 6));
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(tachX, tachY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Gear Indicator in Center
  ctx.fillStyle = gear === 'HIGH' ? '#f59e0b' : '#00f3ff';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(gear, w * 0.5, centerY + 35);

  ctx.restore();
}
