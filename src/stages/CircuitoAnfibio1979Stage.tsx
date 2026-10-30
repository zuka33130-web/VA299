/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CRUCE DE CIRCUITOS (1979) — DESAFÍO ARCADE ORIGINAL
 * Prototipo inspirado en los juegos de cruce de carriles de finales de los 70:
 * - Tres carriles de tráfico de datos con chips móviles
 * - Tres canales de río con plataformas de circuitos que arrastran al personaje
 * - Tres pads de meta que deben completarse para imprimir la pieza del generador
 * - Controles de teclado y D-pad en pantalla, sin recursos de franquicias existentes
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Cpu, Heart, Play, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';

export interface CircuitoAnfibio1979StageProps {
  alreadyRestored: boolean;
  bestSavedScore: number;
  onVictory: (finalScore: number) => void;
  onReturnToRoom: () => void;
}

const W = 640;
const H = 460;
const PLAYER_W = 26;
const PLAYER_H = 30;
const HOP = 46;
const STEP = 40;

const PAD_X = [120, 320, 520];
const PAD_Y = 48;

const RIVER_LANES = [
  { y: 92, speed: 54, width: 116 },
  { y: 138, speed: -68, width: 96 },
  { y: 184, speed: 44, width: 128 },
];

const ROAD_LANES = [
  { y: 292, speed: 112, width: 62 },
  { y: 338, speed: -138, width: 70 },
  { y: 384, speed: 96, width: 58 },
];

interface Chip {
  lane: number;
  x: number;
  w: number;
  speed: number;
}

interface AnfibioState {
  player: { x: number; y: number };
  pads: boolean[];
  chips: Chip[];
  cars: Chip[];
  lives: number;
  timeLeft: number;
  score: number;
  elapsed: number;
  victoryReported: boolean;
  hurtFlash: number;
  padFlash: number;
}

type Phase = 'attract' | 'playing' | 'victory' | 'gameover';

function createChips(): Chip[] {
  return RIVER_LANES.flatMap((lane, laneIndex) => [
    {
      lane: laneIndex,
      x: 40 + laneIndex * 26,
      w: lane.width,
      speed: lane.speed,
    },
    {
      lane: laneIndex,
      x: 380 + laneIndex * 40,
      w: lane.width + 18,
      speed: lane.speed,
    },
  ]);
}

function createCars(): Chip[] {
  return ROAD_LANES.flatMap((lane, laneIndex) => [
    {
      lane: laneIndex,
      x: 120 + laneIndex * 60,
      w: lane.width,
      speed: lane.speed,
    },
    {
      lane: laneIndex,
      x: 470 + laneIndex * 30,
      w: lane.width,
      speed: lane.speed,
    },
  ]);
}

function createInitialState(): AnfibioState {
  return {
    player: { x: 320, y: 430 },
    pads: [false, false, false],
    chips: createChips(),
    cars: createCars(),
    lives: 3,
    timeLeft: 80,
    score: 0,
    elapsed: 0,
    victoryReported: false,
    hurtFlash: 0,
    padFlash: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export const CircuitoAnfibio1979Stage: React.FC<CircuitoAnfibio1979StageProps> = ({
  alreadyRestored,
  bestSavedScore,
  onVictory,
  onReturnToRoom,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<AnfibioState>(createInitialState());
  const [phase, setPhase] = useState<Phase>('attract');
  const phaseRef = useRef<Phase>('attract');
  const [lives, setLives] = useState(3);
  const [padsFilled, setPadsFilled] = useState(0);
  const [timeLeft, setTimeLeft] = useState(80);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(Math.max(0, bestSavedScore));
  const [recordBroken, setRecordBroken] = useState(false);
  const lastHopRef = useRef(0);

  const syncHud = useCallback(() => {
    const s = stateRef.current;
    setLives(s.lives);
    setPadsFilled(s.pads.filter(Boolean).length);
    setTimeLeft(Math.max(0, Math.ceil(s.timeLeft)));
    setScore(Math.floor(s.score));
  }, []);

  const resetRun = useCallback(() => {
    stateRef.current = createInitialState();
    lastHopRef.current = 0;
    phaseRef.current = 'playing';
    setPhase('playing');
    setRecordBroken(false);
    syncHud();
  }, [syncHud]);

  const finishVictory = useCallback(() => {
    const s = stateRef.current;
    if (s.victoryReported) return;
    s.victoryReported = true;
    const finalScore = Math.floor(s.score + s.timeLeft * 2 + s.lives * 50);
    s.score = finalScore;
    setScore(finalScore);
    setBestScore((prev) => Math.max(prev, finalScore));
    if (finalScore > bestSavedScore) setRecordBroken(true);
    phaseRef.current = 'victory';
    setPhase('victory');
    retroAudio.questComplete();
    onVictory(finalScore);
  }, [bestSavedScore, onVictory]);

  const loseLife = useCallback(
    (reason: string) => {
      const s = stateRef.current;
      if (s.lives <= 0) return;
      s.lives -= 1;
      s.hurtFlash = 0.6;
      retroAudio.playerHit();
      s.player = { x: 320, y: 430 };
      syncHud();
      if (s.lives <= 0) {
        phaseRef.current = 'gameover';
        setPhase('gameover');
        retroAudio.npcBlip(0.5);
      } else {
        retroAudio.npcBlip(0.7);
        void reason;
      }
    },
    [syncHud]
  );

  const stepPlayer = useCallback(
    (dx: number, dy: number) => {
      if (phaseRef.current !== 'playing') return;
      const s = stateRef.current;
      const now = performance.now();
      if (now - lastHopRef.current < 110) return;
      lastHopRef.current = now;

      const prevX = s.player.x;
      const prevY = s.player.y;
      s.player.x = clamp(s.player.x + dx, 24, W - 24);
      s.player.y = clamp(s.player.y + dy, 46, 430);

      // Los pads de meta solo aceptan al personaje dentro de su ranura.
      if (s.player.y <= PAD_Y + 8) {
        const padIndex = PAD_X.findIndex((px) => Math.abs(px - s.player.x) < 40);
        if (padIndex >= 0) {
          if (!s.pads[padIndex]) {
            s.pads[padIndex] = true;
            s.score += 150;
            s.padFlash = 0.8;
            retroAudio.collectDiamond(1);
            syncHud();
            if (s.pads.every(Boolean)) {
              finishVictory();
              return;
            }
          }
          s.player = { x: 320, y: 246 };
        } else {
          s.player = { x: prevX, y: prevY };
          retroAudio.npcBlip(0.6);
        }
        return;
      }

      // No se puede quedar parado dentro del agua sin una plataforma.
      const riverLane = RIVER_LANES.findIndex((lane) => Math.abs(lane.y - s.player.y) < 24);
      if (riverLane >= 0) {
        const onChip = s.chips.some(
          (chip) =>
            chip.lane === riverLane &&
            s.player.x + PLAYER_W / 2 > chip.x &&
            s.player.x - PLAYER_W / 2 < chip.x + chip.w
        );
        if (!onChip) loseLife('agua');
      }

      retroAudio.stepTile(dy < 0 ? 2 : 1);
    },
    [finishVictory, loseLife, syncHud]
  );

  // Teclado
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (['arrowup', 'w'].includes(key)) {
        event.preventDefault();
        stepPlayer(0, -HOP);
      } else if (['arrowdown', 's'].includes(key)) {
        event.preventDefault();
        stepPlayer(0, HOP);
      } else if (['arrowleft', 'a'].includes(key)) {
        event.preventDefault();
        stepPlayer(-STEP, 0);
      } else if (['arrowright', 'd'].includes(key)) {
        event.preventDefault();
        stepPlayer(STEP, 0);
      } else if (key === 'enter' || key === ' ') {
        if (phaseRef.current === 'attract' || phaseRef.current === 'gameover') {
          event.preventDefault();
          resetRun();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetRun, stepPlayer]);

  // Bucle de simulación y dibujo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();

    const draw = () => {
      const s = stateRef.current;
      const currentPhase = phaseRef.current;

      // Fondo: placa de circuito bajo un CRT de fósforo verde.
      const board = ctx.createLinearGradient(0, 16, 0, H);
      board.addColorStop(0, '#06251b');
      board.addColorStop(0.48, '#04170f');
      board.addColorStop(1, '#020d09');
      ctx.fillStyle = board;
      ctx.fillRect(0, 0, W, H);

      // Pistas y nodos de la placa base.
      ctx.fillStyle = 'rgba(52, 211, 153, 0.12)';
      for (let y = 24; y < H; y += 24) {
        for (let x = 24; x < W; x += 24) {
          ctx.fillRect(x - 1, y - 1, 2, 2);
        }
      }
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.09)';
      ctx.lineWidth = 1;
      for (let t = 0; t < 7; t++) {
        const y0 = 232 + t * 5;
        ctx.beginPath();
        ctx.moveTo(14 + t * 86, y0);
        ctx.lineTo(34 + t * 86, y0);
        ctx.lineTo(34 + t * 86, y0 + 6);
        ctx.lineTo(58 + t * 86, y0 + 6);
        ctx.stroke();
        ctx.fillStyle = 'rgba(250, 204, 21, 0.14)';
        ctx.fillRect(58 + t * 86, y0 + 5, 2, 3);
      }

      // Banda de metas: tres puertos de memoria en un marco de cobre.
      const goal = ctx.createLinearGradient(0, 16, 0, 74);
      goal.addColorStop(0, '#0f3f2c');
      goal.addColorStop(0.6, '#0a2e20');
      goal.addColorStop(1, '#071f16');
      ctx.fillStyle = goal;
      ctx.fillRect(0, 16, W, 58);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(0, 16, W, 1);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(0, 17, W, 1);
      ctx.fillStyle = '#0b3b2b';
      ctx.fillRect(0, 72, W, 2);
      ctx.fillStyle = 'rgba(110, 231, 183, 0.5)';
      ctx.font = 'bold 6px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('TRES PUERTOS DE MEMORIA · CABINETE 1979', W / 2, 26);

      for (let i = 0; i < 3; i++) {
        const x = PAD_X[i] - 52;
        const filled = s.pads[i];
        // Zócalo metálico con tornillos en las esquinas.
        ctx.fillStyle = '#07140e';
        ctx.fillRect(x - 2, 29, 108, 38);
        ctx.fillStyle = filled ? '#0d3f2a' : '#12211b';
        ctx.fillRect(x, 31, 104, 34);
        ctx.fillStyle = filled ? 'rgba(74, 222, 128, 0.4)' : 'rgba(15, 118, 110, 0.25)';
        ctx.fillRect(x, 31, 104, 2);
        ctx.fillStyle = '#0b3b2b';
        for (let pin = 0; pin < 10; pin++) {
          ctx.fillRect(x + 8 + pin * 9, 60, 5, 3);
        }
        ctx.strokeStyle = filled ? '#86efac' : '#2f6b52';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, 32, 102, 30);
        // Tornillos.
        ctx.fillStyle = '#94a3b8';
        for (const [sx, sy] of [
          [x - 1, 30],
          [x + 101, 30],
          [x - 1, 63],
          [x + 101, 63],
        ] as const) {
          ctx.fillRect(sx, sy, 2, 2);
        }
        if (filled) {
          // Ranura encendida y sello de memoria recuperada.
          ctx.fillStyle = `rgba(134, 239, 172, ${0.2 + Math.abs(Math.sin(s.elapsed * 3 + i)) * 0.2})`;
          ctx.fillRect(x + 6, 36, 92, 18);
          ctx.fillStyle = '#052e16';
          ctx.fillRect(x + 40, 40, 24, 12);
          ctx.fillStyle = '#86efac';
          ctx.font = 'bold 8px ui-monospace, monospace';
          ctx.fillText('OK', x + 52, 49);
          ctx.fillStyle = '#dcfce7';
          ctx.font = 'bold 6px ui-monospace, monospace';
          ctx.fillText('MEMORIA', x + 52, 57);
        } else {
          ctx.fillStyle = '#05201a';
          ctx.fillRect(x + 10, 38, 84, 14);
          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 8px ui-monospace, monospace';
          ctx.fillText(`PUERTO ${['I', 'II', 'III'][i]}`, x + 52, 48);
          ctx.fillStyle = 'rgba(52, 211, 153, 0.45)';
          ctx.font = '5px ui-monospace, monospace';
          ctx.fillText('EN ESPERA', x + 52, 56);
        }
      }

      // Río de datos: canales con corriente, espuma y trazas.
      const river = ctx.createLinearGradient(0, 70, 0, 224);
      river.addColorStop(0, '#062c38');
      river.addColorStop(0.5, '#04222e');
      river.addColorStop(1, '#031a24');
      ctx.fillStyle = river;
      ctx.fillRect(0, 70, W, 154);
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(0, 70, W, 1);
      ctx.fillRect(0, 223, W, 1);
      for (let i = 0; i < 3; i++) {
        const lane = RIVER_LANES[i];
        const top = lane.y - 23;
        const laneGrad = ctx.createLinearGradient(0, top, 0, top + 46);
        laneGrad.addColorStop(0, i % 2 === 0 ? '#0a3a4a' : '#072f40');
        laneGrad.addColorStop(0.5, i % 2 === 0 ? '#0d4c5e' : '#093a4e');
        laneGrad.addColorStop(1, '#05222f');
        ctx.fillStyle = laneGrad;
        ctx.fillRect(0, top, W, 46);
        // Corriente y brillo superficial.
        const flow = (s.elapsed * (lane.speed > 0 ? 26 : -26) + i * 40) % 64;
        for (let x = flow - 64; x < W + 64; x += 32) {
          ctx.fillStyle = 'rgba(125, 211, 252, 0.18)';
          ctx.fillRect(x, top + 6 + (i % 2) * 3, 14, 1);
          ctx.fillRect(x + 12, top + 34 - (i % 2) * 4, 9, 1);
          ctx.fillStyle = 'rgba(103, 232, 249, 0.4)';
          ctx.fillRect(x + 4, top + 14, 3, 1);
        }
        // Juncos/bordes de datos.
        ctx.fillStyle = 'rgba(8, 145, 178, 0.35)';
        for (let x = 0; x < W; x += 18) {
          ctx.fillRect(x, top, 10, 1);
          ctx.fillRect(x + 8, top + 45, 10, 1);
        }
      }

      // Plataformas de circuitos flotantes.
      for (const chip of s.chips) {
        const lane = RIVER_LANES[chip.lane];
        const y = lane.y - 12;
        const dir = chip.speed > 0 ? 1 : -1;
        // Estela y espuma detrás del chip.
        ctx.fillStyle = 'rgba(103, 232, 249, 0.16)';
        ctx.fillRect(chip.x - dir * 10, y + 20, chip.w + 10, 3);
        ctx.fillStyle = 'rgba(224, 242, 254, 0.3)';
        for (let w = 0; w < 3; w++) {
          ctx.fillRect(chip.x + (dir > 0 ? -6 - w * 4 : chip.w + 2 + w * 4), y + 19 + w, 3, 1);
        }
        // Sombra en el agua.
        ctx.fillStyle = 'rgba(2, 18, 26, 0.5)';
        ctx.fillRect(chip.x + 2, y + 23, chip.w, 4);
        // Cuerpo de baquelita y marco de cobre.
        ctx.fillStyle = '#05120f';
        ctx.fillRect(chip.x - 1, y - 1, chip.w + 2, 26);
        ctx.fillStyle = '#0f5132';
        ctx.fillRect(chip.x, y, chip.w, 24);
        ctx.fillStyle = '#134e4a';
        ctx.fillRect(chip.x + 2, y + 2, chip.w - 4, 20);
        ctx.fillStyle = '#b8763a';
        ctx.fillRect(chip.x, y, chip.w, 2);
        ctx.fillStyle = '#f0b56b';
        ctx.fillRect(chip.x, y, chip.w, 1);
        ctx.fillStyle = '#7c4a20';
        ctx.fillRect(chip.x, y + 22, chip.w, 2);
        // Pistas doradas, componentes y LEDs.
        ctx.fillStyle = 'rgba(253, 224, 71, 0.3)';
        for (let bx = 7; bx < chip.w - 8; bx += 16) {
          ctx.fillRect(chip.x + bx, y + 6, 9, 1);
          ctx.fillRect(chip.x + bx + 6, y + 6, 1, 6);
        }
        ctx.fillStyle = '#0b3b2b';
        for (let bx = 10; bx < chip.w - 10; bx += 21) {
          ctx.fillRect(chip.x + bx, y + 9, 7, 6);
          ctx.fillStyle = '#2dd4bf';
          ctx.fillRect(chip.x + bx + 2, y + 10, 3, 2);
          ctx.fillStyle = '#0b3b2b';
        }
        const ledOn = Math.floor(s.elapsed * 4 + chip.x * 0.05) % 3;
        ctx.fillStyle = ledOn === 0 ? '#f87171' : ledOn === 1 ? '#facc15' : '#4ade80';
        ctx.fillRect(chip.x + chip.w - 8, y + 18, 2, 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(chip.x + 4, y + 18, 3, 2);
        // Antena corta.
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(chip.x + chip.w - 5, y - 4, 1, 5);
      }

      // Mediana segura: isla de servicio con franjas de peligro.
      const median = ctx.createLinearGradient(0, 224, 0, 270);
      median.addColorStop(0, '#163f2a');
      median.addColorStop(1, '#0d2a1d');
      ctx.fillStyle = median;
      ctx.fillRect(0, 224, W, 46);
      ctx.fillStyle = '#08170f';
      for (let x = -8; x < W; x += 16) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x, 225, 8, 3);
        ctx.fillStyle = '#111827';
        ctx.fillRect(x + 8, 225, 4, 3);
      }
      for (let x = -8; x < W; x += 16) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(x, 266, 8, 3);
        ctx.fillStyle = '#111827';
        ctx.fillRect(x + 8, 266, 4, 3);
      }
      ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
      for (let gx = 6; gx < W; gx += 14) {
        ctx.fillRect(gx, 240 + (gx % 7), 3, 1);
        ctx.fillRect(gx + 5, 251 - (gx % 5), 2, 1);
      }
      // Poste de mantenimiento con baliza.
      ctx.fillStyle = '#0b111b';
      ctx.fillRect(26, 238, 2, 22);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(26, 238, 1, 22);
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(18, 234, 16, 5);
      ctx.fillStyle = Math.sin(s.elapsed * 4) > 0 ? '#f59e0b' : '#78350f';
      ctx.fillRect(21, 235, 3, 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 4px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('ZONA SEGURA', 34, 244);

      // Carretera de datos.
      const road = ctx.createLinearGradient(0, 270, 0, 420);
      road.addColorStop(0, '#151d2e');
      road.addColorStop(0.5, '#111827');
      road.addColorStop(1, '#0c1320');
      ctx.fillStyle = road;
      ctx.fillRect(0, 270, W, 150);
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 270, W, 1);
      for (let i = 0; i < 3; i++) {
        const lane = ROAD_LANES[i];
        // Textura de asfalto.
        for (let sx = (i * 37) % 23; sx < W; sx += 46) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.07)';
          ctx.fillRect(sx, lane.y + 14, 5, 2);
          ctx.fillRect(sx + 19, lane.y + 5, 3, 1);
        }
        // Línea discontinua con brillo.
        for (let x = 0; x < W; x += 46) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
          ctx.fillRect(x, lane.y + 23, 24, 2);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
          ctx.fillRect(x + 2, lane.y + 25, 20, 1);
        }
      }

      // Cápsulas de tráfico con faros y estela.
      for (const car of s.cars) {
        const lane = ROAD_LANES[car.lane];
        const y = lane.y - 16;
        const dir = car.speed > 0 ? 1 : -1;
        const frontX = dir > 0 ? car.x + car.w : car.x;
        // Estela de datos.
        ctx.fillStyle = 'rgba(248, 113, 113, 0.12)';
        ctx.fillRect(car.x - dir * 14, y + 10, car.w + 14, 12);
        // Sombra.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.fillRect(car.x + 2, y + 30, car.w, 4);
        // Chasis.
        ctx.fillStyle = '#1a0b12';
        ctx.fillRect(car.x - 1, y - 1, car.w + 2, 34);
        ctx.fillStyle = '#3f1d2b';
        ctx.fillRect(car.x, y, car.w, 32);
        ctx.fillStyle = '#6b2c3f';
        ctx.fillRect(car.x, y, car.w, 3);
        // Cabina/circuito superior.
        ctx.fillStyle = '#0b111b';
        ctx.fillRect(car.x + 5, y + 4, car.w - 10, 10);
        ctx.fillStyle = '#f87171';
        ctx.fillRect(car.x + 6, y + 5, car.w - 12, 8);
        ctx.fillStyle = '#fca5a5';
        for (let seg = 6; seg < car.w - 8; seg += 7) {
          ctx.fillRect(car.x + seg, y + 6, 3, 3);
        }
        // Rejilla y luces.
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(car.x + 8, y + 17, car.w - 16, 6);
        ctx.fillStyle = '#475569';
        for (let gr = 10; gr < car.w - 10; gr += 4) {
          ctx.fillRect(car.x + gr, y + 18, 2, 4);
        }
        const lightOn = Math.floor(s.elapsed * 8) % 2 === 0;
        ctx.fillStyle = lightOn ? '#fde047' : '#a16207';
        ctx.fillRect(frontX - (dir > 0 ? 3 : 1), y + 12, 2, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(frontX - (dir > 0 ? 1 : 3), y + 17, 2, 2);
        // Ruedas.
        ctx.fillStyle = '#020617';
        ctx.fillRect(car.x + 7, y + 26, 11, 6);
        ctx.fillRect(car.x + car.w - 18, y + 26, 11, 6);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(car.x + 9, y + 27, 3, 2);
        ctx.fillRect(car.x + car.w - 16, y + 27, 3, 2);
      }

      // Zona de inicio con chevrones.
      ctx.fillStyle = '#0a2418';
      ctx.fillRect(0, 420, W, 40);
      ctx.fillStyle = '#123a26';
      ctx.fillRect(0, 420, W, 2);
      for (let x = -20; x < W; x += 34) {
        ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
        ctx.fillRect(x, 431, 18, 3);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(x + 18, 431, 8, 3);
      }
      ctx.fillStyle = 'rgba(134, 239, 172, 0.45)';
      ctx.font = 'bold 8px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('INICIO · PULSA ENTER', 320, 448);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.35)';
      ctx.font = '5px ui-monospace, monospace';
      ctx.fillText('PLATAFORMA DE ACCESO AL GABINETE', 320, 457);

      // Personaje (Pixel) con sombra, contorno y paso animado.
      const px = s.player.x - PLAYER_W / 2;
      const py = s.player.y - PLAYER_H / 2;
      const walkingFrame = s.player.y < 420 ? Math.floor(s.elapsed * 7) % 2 : 0;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(s.player.x, py + PLAYER_H + 1, 10, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      if (s.hurtFlash > 0 && Math.floor(s.elapsed * 18) % 2 === 0) {
        ctx.globalAlpha = 0.35;
      }
      // Contorno pixelado.
      ctx.fillStyle = '#04120c';
      ctx.fillRect(px + 5, py + 1, 16, 27);
      ctx.fillRect(px + 3, py + 7, 20, 15);
      // Cabello.
      ctx.fillStyle = '#7c3a1a';
      ctx.fillRect(px + 6, py, 14, 6);
      ctx.fillRect(px + 5, py + 3, 2, 4);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(px + 7, py + 1, 9, 1);
      // Rostro.
      ctx.fillStyle = '#f5c98a';
      ctx.fillRect(px + 7, py + 5, 12, 8);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 9, py + 8, 2, 2);
      ctx.fillRect(px + 15, py + 8, 2, 2);
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(px + 12, py + 11, 3, 1);
      // Chaqueta cian y mochila.
      ctx.fillStyle = '#0e7490';
      ctx.fillRect(px + 4, py + 13, 18, 10);
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(px + 6, py + 13, 14, 8);
      ctx.fillStyle = '#164e63';
      ctx.fillRect(px + 12, py + 13, 3, 10);
      ctx.fillStyle = '#0b3b4a';
      ctx.fillRect(px + 4, py + 20, 18, 2);
      // Brazos con balanceo.
      ctx.fillStyle = '#f5c98a';
      ctx.fillRect(px + (walkingFrame ? 2 : 3), py + 15, 3, 5);
      ctx.fillRect(px + (walkingFrame ? 19 : 20), py + 15, 3, 5);
      // Piernas y botas.
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(px + (walkingFrame ? 5 : 6), py + 22, 6, 5);
      ctx.fillRect(px + (walkingFrame ? 15 : 14), py + 22, 6, 5);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(px + (walkingFrame ? 3 : 4), py + 26, 8, 4);
      ctx.fillRect(px + (walkingFrame ? 16 : 15), py + 26, 8, 4);
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(px + (walkingFrame ? 3 : 4), py + 26, 8, 1);
      ctx.fillRect(px + (walkingFrame ? 16 : 15), py + 26, 8, 1);
      ctx.globalAlpha = 1;

      // HUD superior del gabinete.
      ctx.fillStyle = 'rgba(2, 8, 6, 0.92)';
      ctx.fillRect(0, 0, W, 16);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(0, 15, W, 1);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 9px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CRUCE DE CIRCUITOS · 1979', 10, 11);
      ctx.textAlign = 'right';
      ctx.fillStyle = s.timeLeft <= 15 ? '#f87171' : '#fde68a';
      ctx.fillText(
        `VIDAS ${'♥'.repeat(Math.max(0, s.lives))}  ·  PADS ${s.pads.filter(Boolean).length}/3  ·  ${Math.ceil(s.timeLeft)}s`,
        W - 10,
        11
      );

      if (s.padFlash > 0) {
        ctx.fillStyle = `rgba(134, 239, 172, ${Math.min(0.35, s.padFlash)})`;
        ctx.fillRect(0, 16, W, 58);
      }

      // Líneas de barrido y viñeta del CRT.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      for (let sy = 0; sy < H; sy += 3) {
        ctx.fillRect(0, sy, W, 1);
      }
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.78);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, W, 2);
      ctx.fillRect(0, H - 2, W, 2);

      const drawPanel = (top: number, height: number) => {
        ctx.fillStyle = 'rgba(2, 8, 6, 0.8)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#03140d';
        ctx.fillRect(88, top, W - 176, height);
        ctx.fillStyle = '#0a2e20';
        ctx.fillRect(91, top + 3, W - 182, height - 6);
        ctx.strokeStyle = '#2dd4bf';
        ctx.lineWidth = 1;
        ctx.strokeRect(88.5, top + 0.5, W - 177, height - 1);
        ctx.strokeStyle = 'rgba(15, 118, 110, 0.6)';
        ctx.strokeRect(94.5, top + 6.5, W - 189, height - 13);
        // Tornillos y remaches del marco.
        ctx.fillStyle = '#94a3b8';
        for (const [sx, sy] of [
          [92, top + 4],
          [W - 92, top + 4],
          [92, top + height - 4],
          [W - 92, top + height - 4],
        ] as const) {
          ctx.fillRect(sx, sy, 2, 2);
        }
        // Línea de fósforo superior.
        ctx.fillStyle = 'rgba(45, 212, 191, 0.2)';
        ctx.fillRect(100, top + 9, W - 200, 1);
      };

      if (currentPhase === 'attract') {
        drawPanel(78, 300);
        // Mascota original: anfibio de circuito.
        const mx = W / 2;
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(mx - 16, 96, 32, 20);
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(mx - 12, 112, 24, 6);
        ctx.fillStyle = '#052e16';
        ctx.fillRect(mx - 11, 102, 7, 7);
        ctx.fillRect(mx + 4, 102, 7, 7);
        ctx.fillStyle = '#86efac';
        ctx.fillRect(mx - 9, 104, 3, 3);
        ctx.fillRect(mx + 6, 104, 3, 3);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(mx - 18, 118, 6, 4);
        ctx.fillRect(mx + 12, 118, 6, 4);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#6ee7b7';
        ctx.font = 'bold 26px ui-monospace, monospace';
        ctx.fillText('CRUCE DE CIRCUITOS', W / 2, 158);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 10px ui-monospace, monospace';
        ctx.fillText('MEMORIA ANFIBIA · GABINETE 1979', W / 2, 178);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('Dylan necesita que la vieja memoria anfibia responda.', W / 2, 208);
        ctx.fillText('Cruzá los canales de datos y el tráfico de chips.', W / 2, 226);
        ctx.fillText('Completá los 3 puertos antes de que se agote el tiempo.', W / 2, 244);
        ctx.fillStyle = '#34d399';
        ctx.font = 'bold 7px ui-monospace, monospace';
        ctx.fillText('EL GABINETE GUARDA UNA PRUEBA DEL REINICIO CERO', W / 2, 268);
        ctx.fillStyle = '#86efac';
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.fillText('FLECHAS / WASD · ENTER PARA EMPEZAR', W / 2, 300);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.font = '8px ui-monospace, monospace';
        ctx.fillText('SI PERDÉS, LA MEMORIA SIGUE ESPERANDO', W / 2, 348);
      }

      if (currentPhase === 'victory') {
        drawPanel(86, 288);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#86efac';
        ctx.font = 'bold 23px ui-monospace, monospace';
        ctx.fillText('MEMORIA ANFIBIA RESTAURADA', W / 2, 132);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 13px ui-monospace, monospace';
        ctx.fillText(`PUNTUACIÓN: ${Math.floor(s.score)}`, W / 2, 166);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(180, 180, W - 360, 1);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('Los tres canales de datos volvieron a responder.', W / 2, 206);
        ctx.fillText('El gabinete liberó su sello y dejó de bloquear el claro.', W / 2, 224);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.fillText('RECUPERÁ LOS TRANSISTORES DE GERMANIO', W / 2, 254);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('en la otra orilla del lago y lleválos a Dylan.', W / 2, 272);
        ctx.fillStyle = '#86efac';
        ctx.font = 'bold 7px ui-monospace, monospace';
        ctx.fillText('TALLER RETRO STATE TS · LA PALANCA DEL SECTOR 03 ESPERA', W / 2, 300);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.font = '8px ui-monospace, monospace';
        ctx.fillText('PULSA VOLVER AL BOSQUE PARA CONTINUAR', W / 2, 340);
      }

      if (currentPhase === 'gameover') {
        drawPanel(104, 244);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 23px ui-monospace, monospace';
        ctx.fillText('SEÑAL PERDIDA', W / 2, 158);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('El cruce consumió tus tres vidas.', W / 2, 196);
        ctx.fillText('La memoria anfibia sigue esperando en el bosque.', W / 2, 214);
        ctx.fillStyle = '#fde68a';
        ctx.font = 'bold 11px ui-monospace, monospace';
        ctx.fillText('ENTER / REINTENTAR PARA VOLVER A INTENTARLO', W / 2, 252);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.font = '8px ui-monospace, monospace';
        ctx.fillText('LA PRUEBA DE DYLAN NO SE PUEDE SALTEAR', W / 2, 300);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current;
      const currentPhase = phaseRef.current;

      if (currentPhase === 'playing') {
        s.elapsed += dt;
        s.timeLeft = Math.max(0, s.timeLeft - dt);
        if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);
        if (s.padFlash > 0) s.padFlash = Math.max(0, s.padFlash - dt);

        const difficulty = 1 + s.pads.filter(Boolean).length * 0.1;
        for (const chip of s.chips) {
          chip.x += chip.speed * difficulty * dt;
          if (chip.speed > 0 && chip.x > W + 20) chip.x = -chip.w - 20;
          if (chip.speed < 0 && chip.x + chip.w < -20) chip.x = W + 20;
        }
        for (const car of s.cars) {
          car.x += car.speed * difficulty * dt;
          if (car.speed > 0 && car.x > W + 20) car.x = -car.w - 20;
          if (car.speed < 0 && car.x + car.w < -20) car.x = W + 20;
        }

        // El personaje es arrastrado por la plataforma del río.
        const riverLane = RIVER_LANES.findIndex((lane) => Math.abs(lane.y - s.player.y) < 24);
        if (riverLane >= 0) {
          const chip = s.chips.find(
            (c) =>
              c.lane === riverLane &&
              s.player.x + PLAYER_W / 2 > c.x &&
              s.player.x - PLAYER_W / 2 < c.x + c.w
          );
          if (chip) {
            s.player.x = clamp(s.player.x + chip.speed * difficulty * dt, 24, W - 24);
          } else {
            loseLife('agua');
          }
        }

        // Colisiones con el tráfico.
        for (const car of s.cars) {
          const lane = ROAD_LANES[car.lane];
          if (
            overlaps(
              s.player.x - PLAYER_W / 2,
              s.player.y - PLAYER_H / 2,
              PLAYER_W,
              PLAYER_H,
              car.x + 4,
              lane.y - 14,
              car.w - 8,
              28
            )
          ) {
            loseLife('tráfico');
            break;
          }
        }

        if (s.timeLeft <= 0 && phaseRef.current === 'playing') {
          phaseRef.current = 'gameover';
          setPhase('gameover');
          retroAudio.npcBlip(0.5);
        }

        syncHud();
      } else {
        s.elapsed += dt;
        if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);
        if (s.padFlash > 0) s.padFlash = Math.max(0, s.padFlash - dt);
      }

      draw();
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loseLife, syncHud]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-3 border border-emerald-300/25 bg-[#04120c] px-4 py-3 shadow-[0_0_30px_rgba(16,185,129,0.12)]">
        <div className="flex items-center gap-3">
          <Cpu className="h-6 w-6 text-emerald-300" />
          <div>
            <p className="font-mono text-[9px] tracking-[0.28em] text-emerald-200/70">
              BOSQUE DE LAS SEÑALES · GABINETE RECUPERADO
            </p>
            <h2 className="font-display text-xl tracking-[0.08em] text-emerald-100">
              CRUCE DE CIRCUITOS (1979)
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            retroAudio.uiClick();
            onReturnToRoom();
          }}
          className="flex items-center gap-2 border border-emerald-300/40 px-3 py-2 font-mono text-[10px] text-emerald-100 transition-colors hover:bg-emerald-300/10"
        >
          <ArrowLeft className="h-4 w-4" /> VOLVER AL BOSQUE
        </button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-emerald-300/20 bg-[#031a12] px-4 py-2 font-mono text-[10px] text-emerald-100">
        <span className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 text-rose-300" /> VIDAS: {lives}
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" /> PADS: {padsFilled}/3
        </span>
        <span>TIEMPO: {timeLeft}s</span>
        <span className="flex items-center gap-1">
          <Trophy className="h-3.5 w-3.5 text-yellow-300" /> RÉCORD: {Math.max(bestScore, score)}
        </span>
        {alreadyRestored && (
          <span className="border border-emerald-300/40 px-2 py-0.5 text-[9px] text-emerald-200">
            PROTOTIPO YA SUPERADO
          </span>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border-2 border-[#6b4423] bg-[#140d08] p-2.5 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
        <div className="mb-2 flex items-center justify-between rounded-sm border border-amber-300/30 bg-[#0b2a1c] px-3 py-1.5 font-mono text-[8px] tracking-[0.24em] text-emerald-200/80">
          <span>RETRO STATE TS · PRUEBA DE MEMORIA</span>
          <span className="flex items-center gap-2 text-amber-200/80">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_6px_#6ee7b7]" />
            CABINETE EN LÍNEA
          </span>
        </div>
        <div className="relative overflow-hidden rounded-lg border-[3px] border-[#050a08] bg-black">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block h-auto w-full cursor-crosshair"
          aria-label="Cruce de Circuitos 1979"
        />

        {phase === 'attract' && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                resetRun();
              }}
              className="flex items-center gap-2 border-2 border-emerald-300 bg-emerald-400 px-5 py-2.5 font-mono text-xs font-bold tracking-[0.1em] text-[#04120c] shadow-[4px_4px_0_#065f46] transition-transform hover:-translate-y-0.5"
            >
              <Play className="h-4 w-4" /> INICIAR CRUCE
            </button>
          </div>
        )}

        {phase === 'victory' && (
          <div className="absolute inset-x-0 bottom-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                onReturnToRoom();
              }}
              className="flex items-center gap-2 border-2 border-emerald-300 bg-emerald-400 px-4 py-2.5 font-mono text-xs font-bold text-[#04120c] shadow-[4px_4px_0_#065f46]"
            >
              VOLVER AL BOSQUE
            </button>
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                resetRun();
              }}
              className="flex items-center gap-2 border border-white/30 px-3 py-2.5 font-mono text-[10px] text-emerald-100 hover:bg-emerald-300/10"
            >
              <RotateCcw className="h-4 w-4" /> REJUGAR
            </button>
          </div>
        )}

        {phase === 'gameover' && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                resetRun();
              }}
              className="flex items-center gap-2 border-2 border-rose-300 bg-rose-400 px-5 py-2.5 font-mono text-xs font-bold text-[#1a0508] shadow-[4px_4px_0_#7f1d1d]"
            >
              <RotateCcw className="h-4 w-4" /> REINTENTAR
            </button>
          </div>
        )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-sm border border-amber-300/20 bg-[#1a1109] px-3 py-1.5 font-mono text-[8px] tracking-[0.18em] text-amber-200/70">
          <div className="flex items-center gap-1" aria-hidden>
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="h-3 w-0.5 bg-amber-200/30" />
            ))}
          </div>
          <span>MONEDA · 1 CRÉDITO</span>
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-rose-400/80" />
            <span className="h-2 w-2 rounded-full bg-amber-300/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="rounded-xl border border-amber-300/25 bg-[#140d08] p-2 shadow-[0_5px_0_#0b0704]">
        <div className="grid grid-cols-3 gap-1 font-mono text-[10px]">
          <span />
          <button
            type="button"
            onClick={() => stepPlayer(0, -HOP)}
            className="border border-emerald-300/40 px-6 py-2 text-emerald-100 active:bg-emerald-300/20"
          >
            ▲
          </button>
          <span />
          <button
            type="button"
            onClick={() => stepPlayer(-STEP, 0)}
            className="border border-emerald-300/40 px-6 py-2 text-emerald-100 active:bg-emerald-300/20"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => stepPlayer(0, HOP)}
            className="border border-emerald-300/40 px-6 py-2 text-emerald-100 active:bg-emerald-300/20"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={() => stepPlayer(STEP, 0)}
            className="border border-emerald-300/40 px-6 py-2 text-emerald-100 active:bg-emerald-300/20"
          >
            ▶
          </button>
        </div>
        </div>
        <p className="text-center font-mono text-[10px] text-slate-400">
          Flechas o WASD para moverte · Enter para iniciar · Completá los 3 puertos antes del tiempo límite
        </p>
        {recordBroken && (
          <p className="font-mono text-[10px] text-amber-300">¡NUEVO RÉCORD DEL PROTOTIPO!</p>
        )}
      </div>
    </div>
  );
};

export default CircuitoAnfibio1979Stage;
