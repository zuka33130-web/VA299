/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NIGHT DRIVER (1976) — GABINETE OCULTO EN LA GRUTA TRAS LA CASCADA
 * Recreación fiel al clásico arcade de Atari (1976) en primera persona nocturna:
 * - Pantalla CRT negra monocroma donde la ruta solo es visible mediante los postes reflectantes blancos
 * - Aceleración manteniendo presionada la BARRA ESPACIADORA (como el pedal del gabinete original)
 * - Integración 3D en perspectiva real de curvas hacia el horizonte + fuerza centrífuga en curvas
 * - Caja de 4 velocidades (1–4) con asistencia automática y cambio manual opcional [1-4 / ↑↓]
 * - Silueta retroiluminada clásica del morro del deportivo impresa en la base del monitor CRT
 * - Al completar la ruta nocturna (2.400 m), libera el «Núcleo Fotónico de Haluro (1976)» para continuar la trama
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Flag, Gauge, RotateCcw, Sparkles, Trophy, Volume2 } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';
import { bgmEngine } from '../audio/bgmEngine';

export interface NightDriver1976StageProps {
  alreadyCompleted: boolean;
  onVictory: (score: number) => void;
  onReturn: () => void;
}

interface RoadSegment {
  curve: number; // + right turn, - left turn
  widthScale: number; // 1.0 standard, <1.0 narrow section
}

interface ScatteredPylon {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  life: number;
}

const GOAL_DISTANCE_METERS = 2400;
const CHECKPOINT_METERS = 1200;
const SEGMENT_LENGTH_METERS = 10;
const DRAW_DISTANCE_SEGMENTS = 38;
const INITIAL_TIME_SECONDS = 90;
const CHECKPOINT_BONUS_SECONDS = 15;
const MAX_BASE_SPEED_KMH = 200;
const BASE_CRUISE_SPEED_KMH = 96;
const SPACEBAR_SPEED_MULTIPLIER = 1.65;
const MAX_EFFECTIVE_SPEED_KMH = Math.round(MAX_BASE_SPEED_KMH * SPACEBAR_SPEED_MULTIPLIER);

const GEAR_SPECS: Record<1 | 2 | 3 | 4, { minOpt: number; maxKmh: number; accel: number }> = {
  1: { minOpt: 0, maxKmh: 68, accel: 95 },
  2: { minOpt: 48, maxKmh: 116, accel: 74 },
  3: { minOpt: 92, maxKmh: 160, accel: 58 },
  4: { minOpt: 136, maxKmh: MAX_BASE_SPEED_KMH, accel: 46 },
};

function buildNightDriverTrack(): RoadSegment[] {
  const segs: RoadSegment[] = [];
  const addSection = (
    enter: number,
    hold: number,
    exit: number,
    targetCurve: number,
    widthScale = 1.0
  ) => {
    for (let i = 0; i < enter; i++) {
      const t = (i + 1) / enter;
      const smooth = t * t * (3 - 2 * t);
      segs.push({ curve: targetCurve * smooth, widthScale });
    }
    for (let i = 0; i < hold; i++) {
      segs.push({ curve: targetCurve, widthScale });
    }
    for (let i = 0; i < exit; i++) {
      const t = 1 - (i + 1) / exit;
      const smooth = t * t * (3 - 2 * t);
      segs.push({ curve: targetCurve * smooth, widthScale });
    }
  };

  // Tramo 1: Recta de salida nocturna (Novice Start)
  addSection(4, 18, 4, 0, 1.06);
  // Tramo 2: Curva suave derecha e izquierda para tomar ritmo
  addSection(8, 16, 8, 0.55, 1.02);
  addSection(6, 14, 6, -0.62, 1.0);
  // Tramo 3: Recta rápida hacia las eses del desfiladero
  addSection(4, 12, 4, 0, 1.0);
  addSection(7, 12, 7, 0.85, 0.96);
  addSection(7, 12, 7, -0.9, 0.96);
  // Tramo 4: Garganta estrecha tras la cascada (Chicane)
  addSection(5, 14, 5, 0.42, 0.86);
  addSection(5, 12, 5, -0.48, 0.86);
  // Tramo 5: Horquilla Pro derecha + aceleración en recta larga
  addSection(8, 16, 8, 1.15, 0.95);
  addSection(4, 18, 4, 0, 1.02);
  // Tramo 6: Horquilla izquierda + eses encadenadas Expert
  addSection(8, 15, 8, -1.18, 0.94);
  addSection(6, 10, 6, 0.92, 0.92);
  addSection(6, 10, 6, -0.92, 0.92);
  // Tramo 7: Sprint final hacia el Núcleo Fotónico
  addSection(6, 20, 6, 0.35, 1.0);

  return segs;
}

export const NightDriver1976Stage: React.FC<NightDriver1976StageProps> = ({
  alreadyCompleted,
  onVictory,
  onReturn,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<RoadSegment[]>(buildNightDriverTrack());

  const [gameState, setGameState] = useState<'intro' | 'driving' | 'timeup' | 'victory'>('intro');
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [speedMultiplierUi, setSpeedMultiplierUi] = useState<number>(1);
  const [gear, setGear] = useState<1 | 2 | 3 | 4>(1);
  const [autoShift, setAutoShift] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIME_SECONDS);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [collisions, setCollisions] = useState<number>(0);
  const [checkpointBanner, setCheckpointBanner] = useState<boolean>(false);
  const [acceleratingUi, setAcceleratingUi] = useState<boolean>(false);

  const keysRef = useRef({
    left: false,
    right: false,
    up: false, // Acelerador estándar [↑ / W]
    spaceBoost: false, // BARRA ESPACIADORA: aplica multiplicador de velocidad mientras se mantiene presionada
    brake: false,
  });

  const simRef = useRef({
    distance: 0,
    baseSpeedKmh: 0,
    speedMultiplier: 1,
    speedKmh: 0,
    gear: 1 as 1 | 2 | 3 | 4,
    playerX: 0, // -1 = poste izquierdo, +1 = poste derecho
    steerInput: 0, // -1 .. +1 suavizado para el volante
    crashTimer: 0,
    flashTimer: 0,
    timeLeft: INITIAL_TIME_SECONDS,
    checkpointReached: false,
    checkpointBannerTimer: 0,
    score: 0,
    collisions: 0,
    victoryTriggered: false,
    victoryTimestamp: 0,
    scattered: [] as ScatteredPylon[],
  });

  // Sintetizador Web Audio para el rugido grave del motor 1976 y choques con postes
  const engineAudioRef = useRef<{
    ctx: AudioContext;
    osc: OscillatorNode;
    subOsc: OscillatorNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null>(null);

  const stopEngineAudio = useCallback(() => {
    const node = engineAudioRef.current;
    if (!node) return;
    engineAudioRef.current = null;
    try {
      node.gain.gain.setTargetAtTime(0.0001, node.ctx.currentTime, 0.04);
      setTimeout(() => {
        try {
          node.osc.stop();
          node.subOsc.stop();
          node.ctx.close().catch(() => {});
        } catch {
          // ignore cleanup errors
        }
      }, 90);
    } catch {
      // ignore
    }
  }, []);

  const ensureEngineAudio = useCallback(() => {
    if (typeof window === 'undefined' || bgmEngine.isMuted()) return;
    if (engineAudioRef.current) {
      if (engineAudioRef.current.ctx.state === 'suspended') {
        engineAudioRef.current.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const subOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      subOsc.type = 'square';
      osc.frequency.value = 52;
      subOsc.frequency.value = 26;

      filter.type = 'lowpass';
      filter.frequency.value = 220;
      filter.Q.value = 2.2;

      gain.gain.value = 0.001;

      osc.connect(filter);
      subOsc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      subOsc.start();
      engineAudioRef.current = { ctx, osc, subOsc, filter, gain };
    } catch {
      // ignore if audio blocked
    }
  }, []);

  const playCrashBurst = useCallback(() => {
    if (typeof window === 'undefined' || bgmEngine.isMuted()) return;
    const eng = engineAudioRef.current;
    if (!eng) {
      retroAudio.uiClick();
      return;
    }
    try {
      const { ctx } = eng;
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.16, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      noise.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      noise.start();
    } catch {
      retroAudio.uiClick();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopEngineAudio();
    };
  }, [stopEngineAudio]);

  const startNewRace = useCallback(
    (keepSpaceHeld = false) => {
      retroAudio.unlock();
      retroAudio.uiClick();
      ensureEngineAudio();
      const initialMult = keepSpaceHeld ? SPACEBAR_SPEED_MULTIPLIER : 1;
      simRef.current = {
        distance: 0,
        baseSpeedKmh: 0,
        speedMultiplier: initialMult,
        speedKmh: 0,
        gear: 1,
        playerX: 0,
        steerInput: 0,
        crashTimer: 0,
        flashTimer: 0,
        timeLeft: INITIAL_TIME_SECONDS,
        checkpointReached: false,
        checkpointBannerTimer: 0,
        score: 0,
        collisions: 0,
        victoryTriggered: false,
        victoryTimestamp: 0,
        scattered: [],
      };
      keysRef.current.left = false;
      keysRef.current.right = false;
      keysRef.current.up = false;
      keysRef.current.brake = false;
      keysRef.current.spaceBoost = keepSpaceHeld;
      setAcceleratingUi(keepSpaceHeld);
      setSpeedKmh(0);
      setSpeedMultiplierUi(initialMult);
      setGear(1);
      setTimeLeft(INITIAL_TIME_SECONDS);
      setDistanceMeters(0);
      setScore(0);
      setCollisions(0);
      setCheckpointBanner(false);
      setGameState('driving');
    },
    [ensureEngineAudio]
  );

  // Controles de teclado: BARRA ESPACIADORA incrementa la velocidad mediante multiplicador mientras se mantiene presionada
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isSpace = e.code === 'Space' || e.key === ' ';
      if (isSpace) {
        e.preventDefault();
        keysRef.current.spaceBoost = true;
        setAcceleratingUi(true);
        if (gameState === 'intro') {
          startNewRace(true);
          return;
        }
        if (gameState === 'timeup') {
          startNewRace(true);
          return;
        }
        if (
          gameState === 'victory' &&
          performance.now() - simRef.current.victoryTimestamp > 750
        ) {
          stopEngineAudio();
          onReturn();
          return;
        }
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        stopEngineAudio();
        onReturn();
        return;
      }

      if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        keysRef.current.left = true;
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        keysRef.current.right = true;
      } else if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        keysRef.current.up = true;
      } else if (
        e.code === 'ArrowDown' ||
        e.code === 'KeyS' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight'
      ) {
        e.preventDefault();
        keysRef.current.brake = true;
      } else if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        const manualG = Number(e.key) as 1 | 2 | 3 | 4;
        setAutoShift(false);
        simRef.current.gear = manualG;
        setGear(manualG);
        retroAudio.tick();
      } else if (e.key === 'e' || e.key === 'E') {
        if (simRef.current.gear < 4) {
          setAutoShift(false);
          const nextG = (simRef.current.gear + 1) as 1 | 2 | 3 | 4;
          simRef.current.gear = nextG;
          setGear(nextG);
          retroAudio.tick();
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        if (simRef.current.gear > 1) {
          setAutoShift(false);
          const prevG = (simRef.current.gear - 1) as 1 | 2 | 3 | 4;
          simRef.current.gear = prevG;
          setGear(prevG);
          retroAudio.tick();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (gameState === 'driving' || gameState === 'timeup') {
          startNewRace(false);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        keysRef.current.spaceBoost = false;
        setAcceleratingUi(false);
      } else if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysRef.current.left = false;
      } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysRef.current.right = false;
      } else if (e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        keysRef.current.up = false;
      } else if (
        e.code === 'ArrowDown' ||
        e.code === 'KeyS' ||
        e.key === 's' ||
        e.key === 'S' ||
        e.code === 'ShiftLeft' ||
        e.code === 'ShiftRight'
      ) {
        keysRef.current.brake = false;
      }
    };

    const onBlur = () => {
      keysRef.current = {
        left: false,
        right: false,
        up: false,
        spaceBoost: false,
        brake: false,
      };
      setAcceleratingUi(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [gameState, onReturn, startNewRace, stopEngineAudio]);

  // Bucle principal de física y renderizado 3D estilo Atari 1976
  useEffect(() => {
    let rafId = 0;
    let lastNow = performance.now();
    let uiSyncAccum = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;
      uiSyncAccum += dt;

      const sim = simRef.current;
      const keys = keysRef.current;
      const track = trackRef.current;

      if (gameState === 'driving') {
        ensureEngineAudio();

        // Temporizador arcade
        sim.timeLeft = Math.max(0, sim.timeLeft - dt);
        if (sim.checkpointBannerTimer > 0) {
          sim.checkpointBannerTimer = Math.max(0, sim.checkpointBannerTimer - dt);
          if (sim.checkpointBannerTimer <= 0) setCheckpointBanner(false);
        }

        // Asistencia automática de transmisión de 4 velocidades basada en la velocidad base
        if (autoShift) {
          let desiredGear: 1 | 2 | 3 | 4 = 1;
          if (sim.baseSpeedKmh >= 142) desiredGear = 4;
          else if (sim.baseSpeedKmh >= 98) desiredGear = 3;
          else if (sim.baseSpeedKmh >= 54) desiredGear = 2;
          if (desiredGear !== sim.gear) {
            sim.gear = desiredGear;
            setGear(desiredGear);
          }
        }

        const gSpec = GEAR_SPECS[sim.gear];

        // Multiplicador de velocidad activo mientras se mantiene presionada la BARRA ESPACIADORA
        const targetMultiplier =
          keys.spaceBoost && sim.crashTimer <= 0 ? SPACEBAR_SPEED_MULTIPLIER : 1.0;
        const multRate = targetMultiplier > sim.speedMultiplier ? 14 : 18;
        sim.speedMultiplier +=
          (targetMultiplier - sim.speedMultiplier) * Math.min(1, multRate * dt);

        // Velocidad base del coche + aceleración impulsada por Barra Espaciadora o [↑/W]
        if (sim.crashTimer > 0) {
          sim.crashTimer = Math.max(0, sim.crashTimer - dt);
          sim.baseSpeedKmh = Math.max(24, sim.baseSpeedKmh - 175 * dt);
        } else if (keys.brake) {
          sim.baseSpeedKmh = Math.max(0, sim.baseSpeedKmh - 150 * dt);
        } else if (keys.spaceBoost || keys.up) {
          const lugPenalty = sim.baseSpeedKmh < gSpec.minOpt * 0.72 ? 0.55 : 1.0;
          const accelBoost = keys.spaceBoost ? sim.speedMultiplier : 1.0;
          if (sim.baseSpeedKmh < gSpec.maxKmh) {
            sim.baseSpeedKmh = Math.min(
              gSpec.maxKmh,
              sim.baseSpeedKmh + gSpec.accel * lugPenalty * accelBoost * dt
            );
          } else {
            sim.baseSpeedKmh = Math.max(gSpec.maxKmh, sim.baseSpeedKmh - 38 * dt);
          }
        } else {
          // Marcha crucero base para que el coche avance y el multiplicador de Espacio se perciba al instante
          const cruiseCap = Math.min(gSpec.maxKmh, BASE_CRUISE_SPEED_KMH);
          if (sim.baseSpeedKmh < cruiseCap) {
            sim.baseSpeedKmh = Math.min(cruiseCap, sim.baseSpeedKmh + 52 * dt);
          } else {
            sim.baseSpeedKmh = Math.max(cruiseCap, sim.baseSpeedKmh - 46 * dt);
          }
        }

        // Velocidad efectiva final = velocidad base × multiplicador de Barra Espaciadora
        sim.speedKmh = sim.baseSpeedKmh * sim.speedMultiplier;

        if (sim.flashTimer > 0) {
          sim.flashTimer = Math.max(0, sim.flashTimer - dt);
        }

        // Volante suavizado
        const targetSteer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        const steerLerp = targetSteer !== 0 ? 11 * dt : 14 * dt;
        sim.steerInput += (targetSteer - sim.steerInput) * Math.min(1, steerLerp);

        // Segmento actual de carretera
        const segIdx = Math.floor(sim.distance / SEGMENT_LENGTH_METERS) % track.length;
        const currentSeg = track[segIdx];

        // Fuerza centrífuga proporcional a la velocidad efectiva (incluye el multiplicador)
        const speedNorm = sim.speedKmh / MAX_EFFECTIVE_SPEED_KMH;
        const centrifugal =
          currentSeg.curve * (0.32 + speedNorm * 1.18) * speedNorm * dt * 1.52;
        sim.playerX -= centrifugal;

        // Dirección activa del volante
        const steerAuthority = (0.68 + speedNorm * 1.32) * dt * 1.58;
        sim.playerX += sim.steerInput * steerAuthority;

        // Avance longitudinal y puntaje multiplicados por la velocidad efectiva
        const metersDelta = (sim.speedKmh / 3.6) * dt;
        sim.distance += metersDelta;
        sim.score += metersDelta * (1.2 + speedNorm * 1.8) * sim.speedMultiplier;

        // Checkpoint de mitad de recorrido (+15s)
        if (!sim.checkpointReached && sim.distance >= CHECKPOINT_METERS) {
          sim.checkpointReached = true;
          sim.timeLeft += CHECKPOINT_BONUS_SECONDS;
          sim.checkpointBannerTimer = 2.8;
          setCheckpointBanner(true);
          retroAudio.zoneChime();
        }

        // Colisión contra los postes reflectantes laterales
        const roadLimit = 0.96 * currentSeg.widthScale;
        if (Math.abs(sim.playerX) > roadLimit && sim.crashTimer <= 0) {
          const side = Math.sign(sim.playerX) || 1;
          sim.crashTimer = 0.48;
          sim.flashTimer = 0.25;
          sim.collisions += 1;
          sim.playerX = side * (roadLimit - 0.16);
          sim.baseSpeedKmh = Math.max(28, sim.baseSpeedKmh * 0.48);
          sim.speedMultiplier = 1.0;
          sim.speedKmh = sim.baseSpeedKmh;
          setCollisions(sim.collisions);
          playCrashBurst();

          // Postes blancos saliendo despedidos por el impacto
          for (let k = 0; k < 5; k++) {
            sim.scattered.push({
              x: 410 + side * (165 + Math.random() * 45),
              y: 350 - Math.random() * 35,
              vx: -side * (90 + Math.random() * 160),
              vy: -(150 + Math.random() * 170),
              rot: Math.random() * Math.PI,
              vrot: (Math.random() - 0.5) * 14,
              life: 0.55,
            });
          }
        }

        // Actualizar partículas de postes golpeados
        for (let i = sim.scattered.length - 1; i >= 0; i--) {
          const p = sim.scattered[i];
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 460 * dt;
          p.rot += p.vrot * dt;
          p.life -= dt;
          if (p.life <= 0) sim.scattered.splice(i, 1);
        }

        // Actualizar sintetizador del motor reflejando el multiplicador de la Barra Espaciadora
        const eng = engineAudioRef.current;
        if (eng && !bgmEngine.isMuted()) {
          const gearMax = GEAR_SPECS[sim.gear].maxKmh;
          const gearMin = GEAR_SPECS[sim.gear].minOpt * 0.65;
          const rpmRatio = Math.max(
            0.08,
            Math.min(1.15, (sim.baseSpeedKmh - gearMin) / Math.max(25, gearMax - gearMin))
          );
          const baseFreq = (44 + rpmRatio * 92 + sim.gear * 8) * (0.85 + sim.speedMultiplier * 0.22);
          eng.osc.frequency.setTargetAtTime(baseFreq, eng.ctx.currentTime, 0.03);
          eng.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, eng.ctx.currentTime, 0.03);
          eng.filter.frequency.setTargetAtTime(
            180 + rpmRatio * 420 + (keys.spaceBoost ? 220 : 0),
            eng.ctx.currentTime,
            0.04
          );
          const targetVol =
            sim.speedKmh < 2 ? 0.012 : keys.spaceBoost ? 0.056 : 0.032;
          eng.gain.gain.setTargetAtTime(targetVol, eng.ctx.currentTime, 0.04);
        } else if (eng && bgmEngine.isMuted()) {
          eng.gain.gain.setTargetAtTime(0.0001, eng.ctx.currentTime, 0.03);
        }

        // Sincronizar HUD React a ~15 Hz para fluidez máxima
        if (uiSyncAccum >= 0.065) {
          uiSyncAccum = 0;
          setSpeedKmh(Math.round(sim.speedKmh));
          setSpeedMultiplierUi(Number(sim.speedMultiplier.toFixed(2)));
          setDistanceMeters(Math.min(GOAL_DISTANCE_METERS, Math.floor(sim.distance)));
          setTimeLeft(Math.ceil(sim.timeLeft));
          setScore(Math.floor(sim.score));
        }

        // Condición de victoria: cruzar los 2.400 m
        if (sim.distance >= GOAL_DISTANCE_METERS && !sim.victoryTriggered) {
          sim.victoryTriggered = true;
          sim.victoryTimestamp = now;
          const timeBonus = Math.round(sim.timeLeft * 25);
          const finalScore = Math.max(100, Math.floor(sim.score) + timeBonus);
          setDistanceMeters(GOAL_DISTANCE_METERS);
          setScore(finalScore);
          setSpeedKmh(Math.round(sim.speedKmh));
          setSpeedMultiplierUi(1);
          stopEngineAudio();
          retroAudio.achievementUnlock();
          setGameState('victory');
          onVictory(finalScore);
        } else if (sim.timeLeft <= 0 && !sim.victoryTriggered) {
          stopEngineAudio();
          retroAudio.npcBlip(0.5);
          setTimeLeft(0);
          setGameState('timeup');
        }
      } else {
        // Silenciar motor fuera de carrera activa
        const eng = engineAudioRef.current;
        if (eng) {
          eng.gain.gain.setTargetAtTime(0.0001, eng.ctx.currentTime, 0.04);
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawAtariNightDriverCRT(ctx, canvas.width, canvas.height, sim, track, now * 0.001);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [autoShift, ensureEngineAudio, gameState, onVictory, playCrashBurst, stopEngineAudio]);

  const progressPct = Math.min(100, (distanceMeters / GOAL_DISTANCE_METERS) * 100);

  return (
    <div className="relative mx-auto flex h-full max-h-[92vh] w-full max-w-5xl flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-sky-500/40 bg-[#03050a] p-3 text-slate-100 shadow-[0_0_60px_rgba(56,189,248,0.18)] select-none sm:p-4">
      {/* Marquesina superior inspirada en el gabinete Atari Night Driver (1976) */}
      <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-sky-400/30 bg-slate-950/90 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            stopEngineAudio();
            onReturn();
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs font-bold text-slate-200 transition hover:border-sky-400 hover:text-sky-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          VOLVER A LA GRUTA
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="font-mono text-[10px] tracking-[0.26em] text-sky-400 uppercase">
            ATARI INC. · OCTUBRE 1976 · GRUTA TRAS LA CASCADA
          </span>
          <h1 className="font-['Silkscreen',monospace] text-base font-bold tracking-wider text-white sm:text-xl">
            NIGHT DRIVER
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            setAutoShift((prev) => !prev);
            retroAudio.tick();
          }}
          className="rounded-lg border border-sky-500/40 bg-sky-950/50 px-2.5 py-1.5 font-mono text-[11px] font-bold text-sky-200 transition hover:border-sky-300"
          title="Alternar caja automática o manual [1-4 / ↑↓]"
        >
          CAJA: {autoShift ? 'AUTO 1-4' : 'MANUAL 1-4'}
        </button>
      </div>

      {/* Barra de telemetría superior y progreso hacia el Núcleo Fotónico */}
      <div className="mt-2 grid w-full grid-cols-4 gap-2 rounded-xl border border-slate-800 bg-black/80 px-3 py-2 font-mono text-xs">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">TIEMPO</span>
          <span
            className={`text-base font-bold sm:text-lg ${
              timeLeft <= 15 ? 'animate-pulse text-rose-400' : 'text-amber-300'
            }`}
          >
            {String(timeLeft).padStart(2, '0')} s
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">VELOCIDAD / MULT.</span>
          <span className="flex items-baseline gap-1.5 text-base font-bold text-sky-300 sm:text-lg">
            <span>
              {String(speedKmh).padStart(3, '0')} <span className="text-xs">KM/H</span> · M{gear}
            </span>
            <span
              className={`rounded px-1 py-0.5 text-[10px] font-bold ${
                speedMultiplierUi > 1.05
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              ×{speedMultiplierUi.toFixed(2)}
            </span>
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400">PUNTUACIÓN</span>
          <span className="text-base font-bold text-white sm:text-lg">
            {String(score).padStart(5, '0')}
          </span>
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>RUTA NOCTURNA</span>
            <span className="font-bold text-emerald-300">
              {distanceMeters} / {GOAL_DISTANCE_METERS} m
            </span>
          </div>
          <svg
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-900 ring-1 ring-slate-700"
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
          >
            <rect x="0" y="0" width={progressPct} height="8" className="fill-sky-400" />
          </svg>
        </div>
      </div>

      {/* Monitor CRT monocromo con bisel impreso original de 1976 */}
      <div className="relative my-2 flex w-full flex-1 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-800 bg-black shadow-inner">
        <canvas
          ref={canvasRef}
          width={820}
          height={450}
          className="h-full w-full max-h-[58vh] object-contain"
        />

        {checkpointBanner && gameState === 'driving' && (
          <div className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 rounded-lg border border-emerald-400/70 bg-emerald-950/90 px-4 py-1.5 font-mono text-xs font-bold tracking-widest text-emerald-200 shadow-lg">
            ★ CONTROL DE RUTA ALCANZADO · +15 SEGUNDOS EXTRA ★
          </div>
        )}

        {/* Pantalla inicial de instrucciones del gabinete */}
        {gameState === 'intro' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 backdrop-blur-[2px]">
            <div className="w-full max-w-lg rounded-2xl border border-sky-400/50 bg-slate-950/95 p-5 text-center shadow-[0_0_45px_rgba(56,189,248,0.25)]">
              <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-md border border-sky-400/40 bg-sky-950/60 px-2.5 py-1 font-mono text-[11px] font-bold text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                GABINETE OCULTO BAJO LA CASCADA
              </div>
              <h2 className="font-['Silkscreen',monospace] text-lg font-bold text-white sm:text-xl">
                NIGHT DRIVER · 1976
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                En plena oscuridad, guíate únicamente por los{' '}
                <span className="font-semibold text-white">postes reflectantes blancos</span> de la
                carretera. Completa los{' '}
                <span className="font-semibold text-sky-300">2.400 metros</span> antes de que se
                agote el reloj para liberar el{' '}
                <span className="font-semibold text-amber-300">
                  Núcleo Fotónico de Haluro (1976)
                </span>
                .
              </p>

              <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-black/70 p-3 text-left font-mono text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-sky-400 bg-sky-950 px-2 py-0.5 font-bold text-sky-200">
                    ESPACIO
                  </span>
                  <span className="text-slate-200">
                    Mantener: Velocidad ×{SPACEBAR_SPEED_MULTIPLIER}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 font-bold text-slate-200">
                    ← / → · A / D
                  </span>
                  <span className="text-slate-200">Girar volante</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 font-bold text-slate-200">
                    ↑ / W · 1-4
                  </span>
                  <span className="text-slate-300">Acelerador base / Marchas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 font-bold text-slate-200">
                    ↓ / S / SHIFT
                  </span>
                  <span className="text-slate-300">Frenar en horquillas</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => startNewRace(false)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-500 px-5 py-2.5 font-mono text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.5)] transition hover:bg-sky-400"
              >
                <Gauge className="h-4 w-4" />
                INSERT COIN · INICIAR RUTA [ESPACIO]
              </button>
            </div>
          </div>
        )}

        {/* Pantalla de Tiempo Agotado */}
        {gameState === 'timeup' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-950 p-5 text-center shadow-2xl">
              <p className="font-mono text-xs font-bold tracking-widest text-rose-400">
                GAME OVER · TIEMPO AGOTADO
              </p>
              <h3 className="mt-1 font-['Silkscreen',monospace] text-lg font-bold text-white">
                LA NOCHE TE DETUVO A {GOAL_DISTANCE_METERS - distanceMeters} M
              </h3>
              <p className="mt-2 text-xs text-slate-300">
                Mantén presionada la <span className="font-bold text-sky-300">Barra Espaciadora</span>{' '}
                en las rectas y suéltala ligeramente al entrar en las horquillas más cerradas para no
                impactar contra los postes reflectantes.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => startNewRace(false)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 font-mono text-xs font-bold text-slate-950 transition hover:bg-sky-400"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  REINTENTAR [ESPACIO]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopEngineAudio();
                    onReturn();
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 font-mono text-xs font-bold text-slate-300 transition hover:border-slate-500"
                >
                  SALIR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pantalla de Victoria: Obtención del Núcleo Fotónico de Haluro (1976) */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border-2 border-sky-400/70 bg-slate-950 p-5 text-center shadow-[0_0_50px_rgba(56,189,248,0.35)]">
              <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-md border border-emerald-400/50 bg-emerald-950/70 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
                <Trophy className="h-3.5 w-3.5" />
                ¡RUTA NOCTURNA DE 1976 COMPLETADA!
              </div>
              <h3 className="font-['Silkscreen',monospace] text-lg font-bold text-white sm:text-xl">
                NÚCLEO FOTÓNICO DE HALURO
              </h3>
              <p className="mt-1 font-mono text-xs font-semibold text-sky-300">
                {alreadyCompleted
                  ? 'ARTEFACTO DE TRAMA VERIFICADO EN TU MOCHILA [I]'
                  : '★ NUEVO OBJETO CLAVE AÑADIDO AL INVENTARIO [I] ★'}
              </p>

              <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-950/30 p-3 text-left text-xs leading-relaxed text-slate-200">
                El compartimento sellado del gabinete de <span className="font-bold">Night Driver</span>{' '}
                se abre entre la bruma de la cascada y revela el{' '}
                <span className="font-bold text-sky-300">Núcleo Fotónico de Haluro (1976)</span>.
                Llévaselo al técnico <span className="font-bold text-amber-300">Dylan</span> en{' '}
                <span className="italic">Taller RS — Retro State</span> para purgar la oscuridad de
                Gran Koopa y reactivar la Sala de Los Cuatro Caminos.
              </div>

              <div className="mt-3 flex justify-center gap-6 font-mono text-xs text-slate-300">
                <span>
                  PUNTOS: <strong className="text-white">{score}</strong>
                </span>
                <span>
                  IMPACTOS: <strong className="text-amber-300">{collisions}</strong>
                </span>
                <span>
                  TIEMPO RESTANTE: <strong className="text-emerald-300">{timeLeft}s</strong>
                </span>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopEngineAudio();
                    onReturn();
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-300 bg-sky-400 px-4 py-2.5 font-mono text-xs font-bold text-slate-950 transition hover:bg-sky-300"
                >
                  <Flag className="h-4 w-4" />
                  GUARDAR NÚCLEO Y VOLVER A LA CUEVA
                </button>
                <button
                  type="button"
                  onClick={() => startNewRace(false)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 font-mono text-xs font-bold text-slate-300 transition hover:border-sky-400 hover:text-sky-200"
                >
                  REJUGAR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Panel inferior de controles del gabinete (Teclado + soporte táctil/clic) */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2 font-mono text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onMouseDown={() => {
              keysRef.current.left = true;
            }}
            onMouseUp={() => {
              keysRef.current.left = false;
            }}
            onMouseLeave={() => {
              keysRef.current.left = false;
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              keysRef.current.left = true;
            }}
            onTouchEnd={() => {
              keysRef.current.left = false;
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-bold text-slate-200 active:border-sky-400 active:bg-sky-950"
          >
            ◀ IZQ [A]
          </button>
          <button
            type="button"
            onMouseDown={() => {
              keysRef.current.right = true;
            }}
            onMouseUp={() => {
              keysRef.current.right = false;
            }}
            onMouseLeave={() => {
              keysRef.current.right = false;
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              keysRef.current.right = true;
            }}
            onTouchEnd={() => {
              keysRef.current.right = false;
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-bold text-slate-200 active:border-sky-400 active:bg-sky-950"
          >
            DER [D] ▶
          </button>
        </div>

        <button
          type="button"
          onMouseDown={() => {
            if (gameState === 'intro' || gameState === 'timeup') {
              startNewRace(true);
            } else {
              keysRef.current.spaceBoost = true;
              setAcceleratingUi(true);
            }
          }}
          onMouseUp={() => {
            keysRef.current.spaceBoost = false;
            setAcceleratingUi(false);
          }}
          onMouseLeave={() => {
            keysRef.current.spaceBoost = false;
            setAcceleratingUi(false);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            if (gameState === 'intro' || gameState === 'timeup') {
              startNewRace(true);
            } else {
              keysRef.current.spaceBoost = true;
              setAcceleratingUi(true);
            }
          }}
          onTouchEnd={() => {
            keysRef.current.spaceBoost = false;
            setAcceleratingUi(false);
          }}
          className={`flex-1 rounded-lg border px-4 py-1.5 text-center font-bold tracking-wider transition sm:max-w-xs ${
            acceleratingUi
              ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.65)]'
              : 'border-sky-500/50 bg-sky-950/60 text-sky-200 hover:border-sky-400'
          }`}
        >
          {acceleratingUi
            ? `▲ VELOCIDAD ×${SPACEBAR_SPEED_MULTIPLIER} ACTIVA [ESPACIO]`
            : `MANTENER [ESPACIO] VELOCIDAD ×${SPACEBAR_SPEED_MULTIPLIER}`}
        </button>

        <div className="hidden items-center gap-2 text-[11px] text-slate-400 md:flex">
          <Volume2 className="h-3.5 w-3.5 text-sky-400" />
          <span>MARCHAS [1-4 / Q·E] · FRENO [S] · REINICIAR [R]</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Renderizador CRT monocromo + superposición plástica original de Atari Night Driver (1976)
 */
function drawAtariNightDriverCRT(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  sim: {
    distance: number;
    speedMultiplier: number;
    speedKmh: number;
    gear: 1 | 2 | 3 | 4;
    playerX: number;
    steerInput: number;
    crashTimer: number;
    flashTimer: number;
    timeLeft: number;
    score: number;
    scattered: ScatteredPylon[];
  },
  track: RoadSegment[],
  elapsedSec: number
): void {
  // 1. Noche absoluta de tubo catódico
  ctx.fillStyle = sim.flashTimer > 0 ? '#1e0b16' : '#020306';
  ctx.fillRect(0, 0, w, h);

  const horizonY = Math.round(h * 0.34);
  const centerX = w * 0.5;
  const baseSegIdx = Math.floor(sim.distance / SEGMENT_LENGTH_METERS);
  const segFrac = (sim.distance % SEGMENT_LENGTH_METERS) / SEGMENT_LENGTH_METERS;

  // 2. Integrar curvatura hacia adelante desde el morro del coche hasta el horizonte (fiel al arcade)
  const projected: {
    i: number;
    screenY: number;
    leftX: number;
    rightX: number;
    postW: number;
    postH: number;
    alpha: number;
    isFinish: boolean;
    isCheckpoint: boolean;
  }[] = [];

  let dx = 0;
  let curveOffset = 0;

  for (let i = 1; i <= DRAW_DISTANCE_SEGMENTS; i++) {
    const worldSegIndex = baseSegIdx + i;
    const seg = track[worldSegIndex % track.length];

    // Acumulación cuadrática hacia adelante de la curva
    dx += seg.curve * 0.92;
    curveOffset += dx;

    const z = Math.max(0.35, i - segFrac);
    // Perspectiva hiperbólica auténtica
    const persp = 1 / (0.28 + z * 0.145);
    const screenY = horizonY + (h * 0.68) * persp;
    if (screenY > h + 40) continue;

    const roadHalfW = w * 0.46 * seg.widthScale * persp;
    // La posición del jugador desplaza la carretera en sentido opuesto; la curva desplaza el horizonte
    const curveScreenShift = curveOffset * 2.35 * (1 - persp * 0.55);
    const crashShake =
      sim.crashTimer > 0 ? Math.sin(elapsedSec * 55) * 14 * sim.crashTimer : 0;

    const roadCenter =
      centerX - sim.playerX * roadHalfW + curveScreenShift + crashShake;

    const postW = Math.max(2, Math.round(15 * persp));
    const postH = Math.max(3, Math.round(36 * persp));
    const fade = Math.min(1, Math.max(0.14, 1.12 - z / (DRAW_DISTANCE_SEGMENTS + 3)));

    const segMeters = worldSegIndex * SEGMENT_LENGTH_METERS;
    const isFinish =
      Math.abs(segMeters - GOAL_DISTANCE_METERS) < SEGMENT_LENGTH_METERS * 0.6;
    const isCheckpoint =
      Math.abs(segMeters - CHECKPOINT_METERS) < SEGMENT_LENGTH_METERS * 0.6;

    projected.push({
      i: worldSegIndex,
      screenY,
      leftX: roadCenter - roadHalfW,
      rightX: roadCenter + roadHalfW,
      postW,
      postH,
      alpha: fade,
      isFinish,
      isCheckpoint,
    });
  }

  // 3. Suave cono de faros delanteros sobre el asfalto invisible cerca del parachoques
  const beamGrad = ctx.createRadialGradient(centerX, h * 0.86, 12, centerX, h * 0.72, 230);
  beamGrad.addColorStop(0, 'rgba(56, 189, 248, 0.08)');
  beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = beamGrad;
  ctx.fillRect(0, horizonY, w, h - horizonY);

  // 4. Dibujar de atrás (horizonte) hacia adelante (cámara) los postes reflectantes blancos de Atari
  for (let idx = projected.length - 1; idx >= 0; idx--) {
    const p = projected[idx];

    // Bandera de meta o control de mitad de ruta en perspectiva
    if (p.isFinish || p.isCheckpoint) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      const checkerCount = 10;
      const span = p.rightX - p.leftX;
      const cellW = span / checkerCount;
      const bandH = Math.max(3, p.postH * 0.35);
      for (let c = 0; c < checkerCount; c++) {
        ctx.fillStyle =
          c % 2 === 0
            ? p.isFinish
              ? '#facc15'
              : '#38bdf8'
            : '#0f172a';
        ctx.fillRect(p.leftX + c * cellW, p.screenY - bandH * 0.5, cellW + 0.5, bandH);
      }
      ctx.restore();
    }

    // En el Atari Night Driver original los postes aparecen rítmicamente a ambos lados
    ctx.save();
    ctx.globalAlpha = p.alpha;

    // Resplandor sutil de fósforo blanco/celeste en el tubo CRT
    ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
    ctx.fillRect(
      Math.round(p.leftX - p.postW * 0.8),
      Math.round(p.screenY - p.postH - 2),
      Math.round(p.postW * 1.6),
      Math.round(p.postH + 4)
    );
    ctx.fillRect(
      Math.round(p.rightX - p.postW * 0.8),
      Math.round(p.screenY - p.postH - 2),
      Math.round(p.postW * 1.6),
      Math.round(p.postH + 4)
    );

    // Poste reflectante sólido blanco puro estilo 1976
    ctx.fillStyle = p.i % 2 === 0 ? '#ffffff' : '#dbeafe';
    ctx.fillRect(
      Math.round(p.leftX - p.postW * 0.5),
      Math.round(p.screenY - p.postH),
      p.postW,
      p.postH
    );
    ctx.fillRect(
      Math.round(p.rightX - p.postW * 0.5),
      Math.round(p.screenY - p.postH),
      p.postW,
      p.postH
    );
    ctx.restore();
  }

  // 5. Postes dispersados al chocar
  for (const sp of sim.scattered) {
    ctx.save();
    ctx.translate(sp.x, sp.y);
    ctx.rotate(sp.rot);
    ctx.globalAlpha = Math.max(0, sp.life / 0.55);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-5, -14, 10, 28);
    ctx.restore();
  }

  // 6. Marcador arcade pixelado en la franja superior del CRT (como el gabinete original de 1976)
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 22px "Silkscreen", "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`GEAR ${sim.gear}`, w * 0.22, 36);
  ctx.fillText(String(Math.floor(sim.score)).padStart(5, '0'), w * 0.5, 36);
  ctx.fillText(`TIME ${String(Math.ceil(sim.timeLeft)).padStart(2, '0')}`, w * 0.78, 36);
  if (sim.speedMultiplier > 1.05) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillText(`OVERDRIVE ×${sim.speedMultiplier.toFixed(2)}`, w * 0.5, 56);
  }
  ctx.restore();

  // 7. Silueta retroiluminada icónica del morro del coche de Atari Night Driver (1976)
  const rpmVib =
    sim.speedKmh > 3
      ? Math.sin(elapsedSec * (26 + sim.speedKmh * 0.25)) *
        (0.6 + (sim.speedKmh / MAX_EFFECTIVE_SPEED_KMH) * 1.4)
      : 0;
  const carShiftX = sim.steerInput * 18;
  const carTilt = sim.steerInput * 0.035;
  const boostActive = sim.speedMultiplier > 1.08;

  ctx.save();
  ctx.translate(centerX + carShiftX, h + 2 + rpmVib);
  ctx.rotate(carTilt);

  // Guardabarros izquierdo y derecho + capó central (inserto plástico translúcido celeste/ámbar 1976)
  ctx.fillStyle = boostActive ? 'rgba(217, 119, 6, 0.34)' : 'rgba(14, 116, 144, 0.34)';
  ctx.strokeStyle = boostActive ? '#fbbf24' : '#38bdf8';
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  // Guardabarros izquierdo elevado
  ctx.moveTo(-142, 0);
  ctx.lineTo(-130, -54);
  ctx.quadraticCurveTo(-112, -78, -86, -74);
  ctx.lineTo(-64, -52);
  // Capó central rebajado
  ctx.lineTo(64, -52);
  // Guardabarros derecho elevado
  ctx.lineTo(86, -74);
  ctx.quadraticCurveTo(112, -78, 130, -54);
  ctx.lineTo(142, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Franjas de competición estilo Atari 1976 sobre el capó
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.78)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-22, -4);
  ctx.lineTo(-14, -50);
  ctx.moveTo(22, -4);
  ctx.lineTo(14, -50);
  ctx.stroke();

  // Volante sutil en el borde inferior de cabina
  ctx.save();
  ctx.translate(0, -8);
  ctx.rotate(sim.steerInput * 0.65);
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.72)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 8, 34, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // 8. Scanlines sutiles de monitor CRT 1976
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < h; y += 4) {
    ctx.fillRect(0, y, w, 1.5);
  }
}
