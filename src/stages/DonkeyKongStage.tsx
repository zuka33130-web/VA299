import React, { useEffect, useRef, useState } from 'react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';

interface GirderPlatform {
  id: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  accent: string;
}

interface LadderSpec {
  id: string;
  x: number;
  fromGirder: number;
  toGirder: number;
}

interface RollingBarrel {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  girderId: number;
  targetGirderId: number;
  state: 'rolling' | 'falling' | 'ladder';
  rot: number;
  checkedLadders: Set<string>;
  scoredJump: boolean;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

const STAGE_W = 900;
const STAGE_H = 560;

// Niveles inclinados en zigzag clásico (gravedad real hacia el extremo más bajo)
const GIRDERS: GirderPlatform[] = [
  // Piso 0 (Base): más alto a la derecha (506) -> barriles ruedan a la IZQUIERDA (528)
  { id: 0, x1: 36, x2: 864, y1: 528, y2: 506, accent: '#00f3ff' },
  // Piso 1: más alto a la izquierda (402) -> barriles ruedan a la DERECHA (426)
  { id: 1, x1: 46, x2: 824, y1: 402, y2: 426, accent: '#d946ef' },
  // Piso 2: más alto a la derecha (300) -> barriles ruedan a la IZQUIERDA (324)
  { id: 2, x1: 76, x2: 854, y1: 324, y2: 300, accent: '#00f3ff' },
  // Piso 3: más alto a la izquierda (196) -> barriles ruedan a la DERECHA (220)
  { id: 3, x1: 46, x2: 824, y1: 196, y2: 220, accent: '#d946ef' },
  // Piso 4 (Cima del Villano): inclinado hacia la derecha (104 -> 114)
  { id: 4, x1: 74, x2: 565, y1: 104, y2: 114, accent: '#f59e0b' },
];

const LADDERS: LadderSpec[] = [
  { id: 'L0-main', x: 786, fromGirder: 0, toGirder: 1 },
  { id: 'L0-mid', x: 452, fromGirder: 0, toGirder: 1 },
  { id: 'L1-main', x: 118, fromGirder: 1, toGirder: 2 },
  { id: 'L1-mid', x: 488, fromGirder: 1, toGirder: 2 },
  { id: 'L2-main', x: 786, fromGirder: 2, toGirder: 3 },
  { id: 'L2-mid', x: 416, fromGirder: 2, toGirder: 3 },
  { id: 'L3-main', x: 500, fromGirder: 3, toGirder: 4 },
  { id: 'L3-chute', x: 332, fromGirder: 3, toGirder: 4 },
];

function getGirderById(id: number): GirderPlatform {
  return GIRDERS[id] || GIRDERS[0];
}

function getGirderY(g: GirderPlatform, x: number): number {
  const clamped = Math.max(g.x1, Math.min(g.x2, x));
  const t = (clamped - g.x1) / Math.max(1, g.x2 - g.x1);
  return g.y1 + t * (g.y2 - g.y1);
}

function getSlopeDirection(g: GirderPlatform): 1 | -1 {
  return g.y2 >= g.y1 ? 1 : -1;
}

function checkAABB(
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

export function HD2DDonkeyKongStage({
  skinColor,
  hairColor,
  shirtColor,
  alreadyRestoredBefore = false,
  onVictoryRecorded,
  onComplete,
}: {
  skinColor: string;
  hairColor: string;
  shirtColor: string;
  alreadyRestoredBefore?: boolean;
  onVictoryRecorded?: (diamonds: number) => void;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onVictoryRecordedRef = useRef(onVictoryRecorded);
  onVictoryRecordedRef.current = onVictoryRecorded;

  const [runSeed, setRunSeed] = useState<number>(1);
  const [diamondsCollected, setDiamondsCollected] = useState<number>(0);
  const [shields, setShields] = useState<number>(3);
  const [summitHint, setSummitHint] = useState<boolean>(false);
  const [missionUnlocked, setMissionUnlocked] = useState<boolean>(false);
  const [ceremonyOpen, setCeremonyOpen] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);

  const controlsRef = useRef<{
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jumpHeld: boolean;
    jumpBuffer: number;
  }>({
    left: false,
    right: false,
    up: false,
    down: false,
    jumpHeld: false,
    jumpBuffer: 0,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft') controlsRef.current.left = true;
      if (k === 'd' || e.key === 'ArrowRight') controlsRef.current.right = true;
      if (k === 'w' || e.key === 'ArrowUp') {
        controlsRef.current.up = true;
      }
      if (k === 's' || e.key === 'ArrowDown') {
        controlsRef.current.down = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!controlsRef.current.jumpHeld) {
          controlsRef.current.jumpBuffer = 0.13;
        }
        controlsRef.current.jumpHeld = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft') controlsRef.current.left = false;
      if (k === 'd' || e.key === 'ArrowRight') controlsRef.current.right = false;
      if (k === 'w' || e.key === 'ArrowUp') controlsRef.current.up = false;
      if (k === 's' || e.key === 'ArrowDown') controlsRef.current.down = false;
      if (e.code === 'Space') controlsRef.current.jumpHeld = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rootStyles = getComputedStyle(document.documentElement);
    const resolvedSkin =
      rootStyles.getPropertyValue('--avatar-skin').trim() || skinColor;
    const resolvedHair =
      rootStyles.getPropertyValue('--avatar-hair').trim() || hairColor;
    const resolvedShirt =
      rootStyles.getPropertyValue('--avatar-shirt').trim() || shirtColor;

    setDiamondsCollected(0);
    setShields(3);
    setSummitHint(false);
    setMissionUnlocked(false);
    setGameOver(false);

    const baseGirder = getGirderById(0);
    const startX = 96;
    const PW = 26;
    const PH = 36;

    const player = {
      x: startX,
      y: getGirderY(baseGirder, startX + PW / 2) - PH,
      w: PW,
      h: PH,
      vx: 0,
      vy: 0,
      onGround: true,
      currentGirderId: 0,
      activeLadder: null as LadderSpec | null,
      facing: 1 as 1 | -1,
      walkCycle: 0,
      climbCycle: 0,
      invulnTimer: 1.4,
    };

    const trailNodes: { x: number; y: number; alpha: number }[] = [];
    let trailSample = 0;

    // 3 Diamantes de Memoria repartidos estratégicamente en las vigas inclinadas
    const diamonds = [
      {
        id: 1,
        x: 248,
        y: getGirderY(getGirderById(1), 248) - 28,
        color: '#00f3ff',
        collected: false,
      },
      {
        id: 2,
        x: 615,
        y: getGirderY(getGirderById(2), 615) - 28,
        color: '#fde047',
        collected: false,
      },
      {
        id: 3,
        x: 112,
        y: getGirderY(getGirderById(3), 112) - 28,
        color: '#ff00ff',
        collected: false,
      },
    ];

    const barrels: RollingBarrel[] = [];
    let nextBarrelId = 1;
    let barrelSpawnTimer = 1.65;
    let villainThrowAnim = 0;

    const sparks: SparkParticle[] = [];
    const floatingPopups: { x: number; y: number; text: string; life: number }[] = [];

    const MAX_SPEED = 228;
    const ACCEL = 1850;
    const FRICTION = 1550;
    const CLIMB_SPEED = 162;
    const JUMP_VELOCITY = -430;
    const GRAVITY = 1160;
    const BARREL_SIZE = 22;
    const BARREL_SPEED = 176;

    let collectedCount = 0;
    let currentShields = 3;
    let pausedForVictory = false;
    let pausedForDefeat = false;
    let hintTimer = 0;
    let cancelled = false;
    let rafId = 0;
    let prevNow = performance.now();

    const spawnBurst = (cx: number, cy: number, color: string, count = 20) => {
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + Math.random() * 0.25;
        const spd = 65 + (i % 5) * 38;
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 30,
          life: 0.52,
          maxLife: 0.52,
          color,
        });
      }
    };

    const spawnBarrelFromVillain = () => {
      const g4 = getGirderById(4);
      const spawnX = 192;
      barrels.push({
        id: nextBarrelId++,
        x: spawnX,
        y: getGirderY(g4, spawnX) - BARREL_SIZE,
        vx: BARREL_SPEED,
        vy: 0,
        girderId: 4,
        targetGirderId: 3,
        state: 'rolling',
        rot: 0,
        checkedLadders: new Set<string>(),
        scoredJump: false,
      });
      villainThrowAnim = 0.45;
    };

    // Primer barril temprano para dinamismo inmediato
    spawnBarrelFromVillain();

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.035, (now - prevNow) / 1000);
      prevNow = now;
      const elapsed = now / 1000;

      if (!pausedForVictory && !pausedForDefeat) {
        if (player.invulnTimer > 0) {
          player.invulnTimer = Math.max(0, player.invulnTimer - dt);
        }
        if (villainThrowAnim > 0) {
          villainThrowAnim = Math.max(0, villainThrowAnim - dt);
        }
        if (controlsRef.current.jumpBuffer > 0) {
          controlsRef.current.jumpBuffer = Math.max(
            0,
            controlsRef.current.jumpBuffer - dt
          );
        }

        const pCenterX = player.x + player.w / 2;
        const pBottom = player.y + player.h;

        // 1. Detectar enganche a escaleras con W o S
        if (!player.activeLadder) {
          if (controlsRef.current.up) {
            for (const lad of LADDERS) {
              const gLow = getGirderById(lad.fromGirder);
              const gHigh = getGirderById(lad.toGirder);
              const yBottom = getGirderY(gLow, lad.x);
              const yTop = getGirderY(gHigh, lad.x);
              if (
                Math.abs(pCenterX - lad.x) <= 20 &&
                pBottom <= yBottom + 10 &&
                pBottom >= yTop + 6
              ) {
                player.activeLadder = lad;
                player.vx = 0;
                player.vy = 0;
                player.onGround = false;
                break;
              }
            }
          } else if (controlsRef.current.down && player.onGround) {
            for (const lad of LADDERS) {
              const gHigh = getGirderById(lad.toGirder);
              const yTop = getGirderY(gHigh, lad.x);
              if (
                Math.abs(pCenterX - lad.x) <= 22 &&
                Math.abs(pBottom - yTop) <= 12
              ) {
                player.activeLadder = lad;
                player.y += 4;
                player.vx = 0;
                player.vy = 0;
                player.onGround = false;
                break;
              }
            }
          }
        }

        // 2. Movimiento en escalera vs Movimiento en viga/aire
        if (player.activeLadder) {
          const lad = player.activeLadder;
          const gLow = getGirderById(lad.fromGirder);
          const gHigh = getGirderById(lad.toGirder);
          const yBottom = getGirderY(gLow, lad.x);
          const yTop = getGirderY(gHigh, lad.x);

          // Alinear suavemente el centro de Pixel con el eje de la escalera
          const targetX = lad.x - player.w / 2;
          player.x += (targetX - player.x) * Math.min(1, dt * 16);

          let climbDir = 0;
          if (controlsRef.current.up) climbDir = -1;
          else if (controlsRef.current.down) climbDir = 1;

          player.y += climbDir * CLIMB_SPEED * dt;
          if (climbDir !== 0) {
            player.climbCycle += dt * 9;
          }

          // Permite saltar desde una escalera si presiona Espacio
          if (controlsRef.current.jumpBuffer > 0) {
            player.activeLadder = null;
            player.vy = JUMP_VELOCITY * 0.92;
            controlsRef.current.jumpBuffer = 0;
            retroAudio.jump();
          } else if (player.y + player.h <= yTop + 2) {
            player.y = yTop - player.h;
            player.activeLadder = null;
            player.onGround = true;
            player.currentGirderId = lad.toGirder;
          } else if (player.y + player.h >= yBottom) {
            player.y = yBottom - player.h;
            player.activeLadder = null;
            player.onGround = true;
            player.currentGirderId = lad.fromGirder;
          } else if (
            (controlsRef.current.left || controlsRef.current.right) &&
            (Math.abs(player.y + player.h - yBottom) < 9 ||
              Math.abs(player.y + player.h - yTop) < 9)
          ) {
            const nearTop = Math.abs(player.y + player.h - yTop) < 9;
            player.currentGirderId = nearTop ? lad.toGirder : lad.fromGirder;
            const snapG = getGirderById(player.currentGirderId);
            player.y = getGirderY(snapG, player.x + player.w / 2) - player.h;
            player.activeLadder = null;
            player.onGround = true;
          }
        } else {
          // Movimiento horizontal con inercia en vigas inclinadas
          const inputDir =
            (controlsRef.current.right ? 1 : 0) -
            (controlsRef.current.left ? 1 : 0);

          if (inputDir !== 0) {
            player.vx += inputDir * ACCEL * dt;
            player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));
            player.facing = inputDir > 0 ? 1 : -1;
            player.walkCycle += dt * (Math.abs(player.vx) / MAX_SPEED);
          } else {
            const decel = FRICTION * dt;
            if (Math.abs(player.vx) <= decel) player.vx = 0;
            else player.vx -= Math.sign(player.vx) * decel;
          }

          if (controlsRef.current.jumpBuffer > 0 && player.onGround) {
            player.vy = JUMP_VELOCITY;
            player.onGround = false;
            controlsRef.current.jumpBuffer = 0;
            retroAudio.jump();
          }

          if (!controlsRef.current.jumpHeld && player.vy < -210) {
            player.vy *= 0.89;
          }

          const prevBottom = player.y + player.h;
          player.x += player.vx * dt;
          player.x = Math.max(36, Math.min(STAGE_W - 36 - player.w, player.x));

          const newCenterX = player.x + player.w / 2;

          if (player.onGround) {
            const curG = getGirderById(player.currentGirderId);
            if (newCenterX >= curG.x1 - 6 && newCenterX <= curG.x2 + 6) {
              player.y = getGirderY(curG, newCenterX) - player.h;
              player.vy = 0;
            } else {
              // Se dejó caer del borde de la viga
              player.onGround = false;
            }
          }

          if (!player.onGround) {
            player.vy = Math.min(720, player.vy + GRAVITY * dt);
            player.y += player.vy * dt;
            const newBottom = player.y + player.h;

            if (player.vy >= 0) {
              for (let gi = GIRDERS.length - 1; gi >= 0; gi--) {
                const g = GIRDERS[gi];
                if (newCenterX >= g.x1 - 4 && newCenterX <= g.x2 + 4) {
                  const gy = getGirderY(g, newCenterX);
                  if (prevBottom <= gy + 12 && newBottom >= gy - 2) {
                    player.y = gy - player.h;
                    player.vy = 0;
                    player.onGround = true;
                    player.currentGirderId = g.id;
                    break;
                  }
                }
              }
            }
          }
        }

        // Estela luminosa del Arquitecto
        const speedMag = Math.hypot(
          player.vx,
          player.activeLadder ? CLIMB_SPEED : player.vy
        );
        trailSample += dt;
        if (speedMag > 45 && trailSample >= 0.025) {
          trailSample = 0;
          trailNodes.push({
            x: player.x,
            y: player.y,
            alpha: 0.48,
          });
          if (trailNodes.length > 10) trailNodes.shift();
        }
        for (let i = trailNodes.length - 1; i >= 0; i--) {
          trailNodes[i].alpha -= dt * 2.3;
          if (trailNodes[i].alpha <= 0) trailNodes.splice(i, 1);
        }

        // 3. Generación y física de los Barriles Brillantes del Villano
        barrelSpawnTimer -= dt;
        if (barrelSpawnTimer <= 0) {
          spawnBarrelFromVillain();
          barrelSpawnTimer = 2.25;
        }

        for (let bi = barrels.length - 1; bi >= 0; bi--) {
          const b = barrels[bi];
          const bCenterX = b.x + BARREL_SIZE / 2;

          if (b.state === 'rolling') {
            const g = getGirderById(b.girderId);
            const dir = getSlopeDirection(g);
            b.vx = dir * BARREL_SPEED;
            b.x += b.vx * dt;
            b.rot += dir * dt * 9.5;

            const updatedCenterX = b.x + BARREL_SIZE / 2;

            // Probabilidad de descender por escaleras conectadas
            for (const lad of LADDERS) {
              if (
                lad.toGirder === b.girderId &&
                !b.checkedLadders.has(lad.id) &&
                Math.abs(updatedCenterX - lad.x) <= 7
              ) {
                b.checkedLadders.add(lad.id);
                if (Math.random() < 0.36) {
                  b.state = 'ladder';
                  b.x = lad.x - BARREL_SIZE / 2;
                  b.targetGirderId = lad.fromGirder;
                  break;
                }
              }
            }

            if (b.state === 'rolling') {
              if (b.girderId === 0 && updatedCenterX <= g.x1 + 12) {
                // Incinerador de energía en la esquina inferior izquierda
                spawnBurst(b.x + BARREL_SIZE / 2, b.y + BARREL_SIZE / 2, '#00f3ff', 12);
                barrels.splice(bi, 1);
                continue;
              }

              if (updatedCenterX < g.x1 || updatedCenterX > g.x2) {
                b.state = 'falling';
                b.vy = 45;
                b.targetGirderId = Math.max(0, b.girderId - 1);
              } else {
                b.y = getGirderY(g, updatedCenterX) - BARREL_SIZE;
              }
            }
          } else if (b.state === 'ladder') {
            const targetG = getGirderById(b.targetGirderId);
            const destY = getGirderY(targetG, bCenterX) - BARREL_SIZE;
            b.y += 152 * dt;
            b.rot += dt * 6;
            if (b.y >= destY) {
              b.y = destY;
              b.girderId = b.targetGirderId;
              b.state = 'rolling';
            }
          } else if (b.state === 'falling') {
            b.vy += GRAVITY * 0.92 * dt;
            b.x += b.vx * 0.24 * dt;
            b.y += b.vy * dt;
            b.rot += Math.sign(b.vx || 1) * dt * 8;

            const targetG = getGirderById(b.targetGirderId);
            const landY = getGirderY(targetG, b.x + BARREL_SIZE / 2) - BARREL_SIZE;
            if (b.y >= landY) {
              b.y = landY;
              b.vy = 0;
              b.girderId = b.targetGirderId;
              b.state = 'rolling';
              retroAudio.pongWall();
            }
          }

          // Bonificación visual al saltar limpiamente sobre un barril
          if (
            !b.scoredJump &&
            !player.onGround &&
            !player.activeLadder &&
            Math.abs(player.x + player.w / 2 - (b.x + BARREL_SIZE / 2)) < 16 &&
            player.y + player.h < b.y &&
            b.y - (player.y + player.h) < 54
          ) {
            b.scoredJump = true;
            floatingPopups.push({
              x: player.x + player.w / 2,
              y: player.y - 8,
              text: '¡SALTO PERFECTO!',
              life: 0.75,
            });
          }

          // 4. Colisión AABB estricta Jugador vs Barril Brillante
          if (
            player.invulnTimer <= 0 &&
            checkAABB(
              player.x + 5,
              player.y + 4,
              player.w - 10,
              player.h - 6,
              b.x + 2,
              b.y + 2,
              BARREL_SIZE - 4,
              BARREL_SIZE - 4
            )
          ) {
            retroAudio.playerHit();
            spawnBurst(b.x + BARREL_SIZE / 2, b.y + BARREL_SIZE / 2, '#ff0055', 24);
            barrels.splice(bi, 1);
            currentShields -= 1;
            setShields(currentShields);
            player.invulnTimer = 1.65;

            if (currentShields <= 0) {
              pausedForDefeat = true;
              setGameOver(true);
              break;
            }
          }
        }

        // 5. Recolección de los 3 Diamantes de Memoria
        for (const d of diamonds) {
          if (d.collected) continue;
          const bobY = d.y + Math.sin(elapsed * 3.6 + d.id * 1.4) * 5.5;
          if (
            checkAABB(
              player.x,
              player.y,
              player.w,
              player.h,
              d.x - 14,
              bobY - 14,
              28,
              28
            )
          ) {
            d.collected = true;
            collectedCount += 1;
            setDiamondsCollected(collectedCount);
            setSummitHint(false);
            retroAudio.collectDiamond(collectedCount);
            spawnBurst(d.x, bobY, d.color, 26);
          }
        }

        // 6. Condición de Meta en la Cima junto al Villano
        const onSummitTier =
          player.currentGirderId === 4 &&
          player.y + player.h <= 126 &&
          player.x <= 325;

        if (onSummitTier) {
          if (collectedCount >= 3) {
            pausedForVictory = true;
            setMissionUnlocked(true);
            setSummitHint(false);
            retroAudio.portalVictory();
            onVictoryRecordedRef.current?.(collectedCount);
            window.setTimeout(() => {
              if (!cancelled) {
                setCeremonyOpen(true);
              }
            }, 1150);
          } else if (now > hintTimer) {
            setSummitHint(true);
            hintTimer = now + 1800;
          }
        } else if (now > hintTimer) {
          setSummitHint(false);
        }
      }

      // Actualizar chispas y textos flotantes
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy += 290 * dt;
        sp.life -= dt;
        if (sp.life <= 0) sparks.splice(i, 1);
      }

      for (let i = floatingPopups.length - 1; i >= 0; i--) {
        floatingPopups[i].y -= 28 * dt;
        floatingPopups[i].life -= dt;
        if (floatingPopups[i].life <= 0) floatingPopups.splice(i, 1);
      }

      // =========================================================
      // RENDERIZADO HD-2D CON MATERIALES DIFERENCIADOS Y PÍXELES NÍTIDOS
      // =========================================================
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = false;
      ctx.shadowBlur = 0;

      // Fondo nocturno industrial-arcade con atmósfera profunda
      const bgGrad = ctx.createLinearGradient(0, 0, 0, STAGE_H);
      bgGrad.addColorStop(0, '#040310');
      bgGrad.addColorStop(0.45, '#080d22');
      bgGrad.addColorStop(0.85, '#050816');
      bgGrad.addColorStop(1, '#020309');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, STAGE_W, STAGE_H);

      // Capa Parallax 1: Silueta urbana lejana y andamiaje de fondo
      const camShiftX = (player.x / STAGE_W - 0.5) * 28;
      const camShiftY = (player.y / STAGE_H - 0.5) * 12;

      ctx.fillStyle = 'rgba(12, 18, 42, 0.72)';
      for (let b = 0; b < 9; b++) {
        const bw = 64 + (b % 3) * 22;
        const bh = 140 + ((b * 37) % 160);
        const bx = b * 108 - 18 - camShiftX * 0.22;
        ctx.fillRect(bx, STAGE_H - bh - camShiftY * 0.15, bw, bh);
      }

      // Capa Parallax 2: Columnas estructurales verticales con remaches
      for (let col = 0; col < 7; col++) {
        const bx = 68 + col * 132 - camShiftX * 0.42;
        ctx.fillStyle = 'rgba(15, 23, 48, 0.55)';
        ctx.fillRect(bx, 16, 36, STAGE_H - 32);
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, 16, 36, STAGE_H - 32);
      }

      // Partículas ambientales limitadas (16 motas deterministas, cero asignaciones)
      ctx.fillStyle = 'rgba(165, 243, 252, 0.24)';
      for (let m = 0; m < 16; m++) {
        const mx =
          (((m * 113 + elapsed * (8 + (m % 4) * 3)) % (STAGE_W - 40)) + 20) -
          camShiftX * 0.3;
        const my =
          ((STAGE_H - ((m * 71 + elapsed * 14) % (STAGE_H - 40))) + 20);
        ctx.fillRect(mx, my, 2, 2);
      }

      // Escaleras metálicas iluminadas conectando las plataformas inclinadas
      for (const lad of LADDERS) {
        const gLow = getGirderById(lad.fromGirder);
        const gHigh = getGirderById(lad.toGirder);
        const yBottom = getGirderY(gLow, lad.x);
        const yTop = getGirderY(gHigh, lad.x);

        ctx.save();
        // Sombra sutil detrás de la escalera para separarla del fondo
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(lad.x - 11, yTop);
        ctx.lineTo(lad.x - 11, yBottom);
        ctx.moveTo(lad.x + 11, yTop);
        ctx.lineTo(lad.x + 11, yBottom);
        ctx.stroke();

        // Rieles verticales de acero cian
        ctx.shadowColor = 'rgba(0, 243, 255, 0.6)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(lad.x - 11, yTop);
        ctx.lineTo(lad.x - 11, yBottom);
        ctx.moveTo(lad.x + 11, yTop);
        ctx.lineTo(lad.x + 11, yBottom);
        ctx.stroke();

        // Peldaños metálicos nítidos con reflejo superior
        ctx.shadowBlur = 0;
        for (let ry = yTop + 8; ry < yBottom - 4; ry += 11) {
          ctx.fillStyle = '#0e7490';
          ctx.fillRect(lad.x - 10, Math.round(ry), 20, 3);
          ctx.fillStyle = '#e0f2fe';
          ctx.fillRect(lad.x - 10, Math.round(ry), 20, 1.5);
        }
        ctx.restore();
      }

      // Vigas de acero remachadas inclinadas (diferenciación de material metálico)
      for (const g of GIRDERS) {
        const thickness = 14;
        ctx.save();

        // Sombra proyectada inferior de la viga
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y1 + thickness);
        ctx.lineTo(g.x2, g.y2 + thickness);
        ctx.lineTo(g.x2, g.y2 + thickness + 6);
        ctx.lineTo(g.x1, g.y1 + thickness + 6);
        ctx.closePath();
        ctx.fill();

        // Cuerpo estructural metálico oscuro
        ctx.shadowColor = g.accent;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#171332';
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y1);
        ctx.lineTo(g.x2, g.y2);
        ctx.lineTo(g.x2, g.y2 + thickness);
        ctx.lineTo(g.x1, g.y1 + thickness);
        ctx.closePath();
        ctx.fill();

        // Bordes de brida superior e inferior
        ctx.strokeStyle = g.accent;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Riel especular blanco/cian en el borde pisable superior
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g.x1, g.y1 + 1);
        ctx.lineTo(g.x2, g.y2 + 1);
        ctx.stroke();

        // Celosía diagonal interna + remaches industriales
        ctx.strokeStyle = g.accent + '80';
        ctx.lineWidth = 1.4;
        const span = g.x2 - g.x1;
        const steps = Math.floor(span / 22);
        ctx.beginPath();
        for (let s = 0; s < steps; s++) {
          const xa = g.x1 + s * 22;
          const xb = Math.min(g.x2, xa + 22);
          const ya = getGirderY(g, xa);
          const yb = getGirderY(g, xb);
          if (s % 2 === 0) {
            ctx.moveTo(xa, ya + thickness - 2);
            ctx.lineTo(xb, yb + 2);
          } else {
            ctx.moveTo(xa, ya + 2);
            ctx.lineTo(xb, yb + thickness - 2);
          }
        }
        ctx.stroke();

        // Remaches metálicos a lo largo de la viga
        ctx.fillStyle = '#f8fafc';
        for (let s = 0; s <= steps; s += 2) {
          const rx = g.x1 + s * 22;
          if (rx <= g.x2 - 2) {
            const ry = getGirderY(g, rx);
            ctx.fillRect(Math.round(rx), Math.round(ry) + 2, 2, 2);
          }
        }
        ctx.restore();
      }

      // Tambor incinerador de plasma en la esquina inferior izquierda
      const baseLeftY = getGirderY(baseGirder, 48);
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.fillRect(36, baseLeftY - 34, 26, 34);
      ctx.strokeRect(36, baseLeftY - 34, 26, 34);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(38, baseLeftY - 24, 22, 3);
      ctx.fillRect(38, baseLeftY - 13, 22, 3);

      ctx.globalCompositeOperation = 'lighter';
      const flameH = 12 + Math.sin(elapsed * 12) * 4;
      ctx.fillStyle = 'rgba(0, 243, 255, 0.45)';
      ctx.fillRect(39, baseLeftY - 34 - flameH - 3, 20, flameH + 3);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(43, baseLeftY - 34 - flameH * 0.7, 12, flameH * 0.7);
      ctx.restore();

      // Baliza de Meta en la Cima junto al Villano ("1978")
      const summitG = getGirderById(4);
      const goalX = 248;
      const goalY = getGirderY(summitG, goalX);
      const goalUnlocked = collectedCount >= 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const portalGrad = ctx.createRadialGradient(
        goalX,
        goalY - 28,
        4,
        goalX,
        goalY - 28,
        goalUnlocked ? 46 : 28
      );
      portalGrad.addColorStop(
        0,
        goalUnlocked ? 'rgba(57, 255, 20, 0.85)' : 'rgba(250, 204, 21, 0.32)'
      );
      portalGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = portalGrad;
      ctx.beginPath();
      ctx.arc(goalX, goalY - 28, goalUnlocked ? 46 : 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = goalUnlocked ? '#39ff14' : '#fde047';
      ctx.shadowBlur = 10;
      ctx.fillStyle = goalUnlocked ? '#39ff14' : '#fde047';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        goalUnlocked ? 'META 1978 ACTIVA' : 'CIMA · 3 DIAMANTES',
        goalX,
        goalY - 56
      );
      ctx.restore();

      // Reserva de barriles y Villano Colosal HD-2D en la Cima
      const villainX = 144;
      const villainY = getGirderY(summitG, villainX);

      for (let stack = 0; stack < 3; stack++) {
        const sx = 86 + (stack === 2 ? 9 : stack * 18);
        const sy = villainY - 20 - (stack === 2 ? 18 : 0);
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(sx, sy, 16, 20);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(sx + 3, sy + 1, 6, 18);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(sx, sy, 16, 20);
      }

      // Villano HD-2D (sombra de contacto + aura controlada + pixel-art nítido)
      ctx.save();
      ctx.translate(villainX, villainY);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(-30, -3, 60, 5);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const vAura = ctx.createRadialGradient(0, -34, 4, 0, -34, 48);
      vAura.addColorStop(0, 'rgba(239, 68, 68, 0.34)');
      vAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = vAura;
      ctx.beginPath();
      ctx.arc(0, -34, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const armOffset = villainThrowAnim > 0 ? -14 : Math.sin(elapsed * 5) * 4;

      // Pelaje y musculatura con sombreado de dos tonos sin desenfoque
      ctx.fillStyle = '#3b1d0c';
      ctx.fillRect(-28, -50, 56, 38);
      ctx.fillStyle = '#5c2d16';
      ctx.fillRect(-22, -46, 44, 28);
      ctx.fillStyle = '#3b1d0c';
      ctx.fillRect(-24, -12, 16, 12);
      ctx.fillRect(8, -12, 16, 12);
      ctx.fillRect(-42, -52 + armOffset * 0.5, 16, 32);
      ctx.fillRect(26, -52 + armOffset, 16, 32);
      ctx.fillStyle = '#5c2d16';
      ctx.fillRect(-40, -50 + armOffset * 0.5, 10, 26);
      ctx.fillRect(28, -50 + armOffset, 10, 26);

      // Cabeza, ceño y mandíbula
      ctx.fillStyle = '#4a2511';
      ctx.fillRect(-18, -72, 36, 24);
      ctx.fillStyle = '#d4a373';
      ctx.fillRect(-14, -61, 28, 12);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(-10, -55, 20, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-8, -55, 4, 2);
      ctx.fillRect(4, -55, 4, 2);

      // Ojos luminosos y corbata roja clásica
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-10, -67, 6, 5);
      ctx.fillRect(4, -67, 6, 5);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-5, -42, 10, 24);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-3, -40, 6, 18);
      ctx.restore();

      // 3 Diamantes de Memoria con facetas nítidas y halo controlado
      for (const d of diamonds) {
        if (d.collected) continue;
        const bobY = d.y + Math.sin(elapsed * 3.6 + d.id * 1.4) * 5.5;
        const r = 12 + Math.sin(elapsed * 5 + d.id) * 1.2;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const halo = ctx.createRadialGradient(d.x, bobY, 2, d.x, bobY, 30);
        halo.addColorStop(0, d.color + 'aa');
        halo.addColorStop(0.55, d.color + '33');
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(d.x, bobY, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.fillStyle = d.color;
        ctx.beginPath();
        ctx.moveTo(d.x, bobY - r);
        ctx.lineTo(d.x + r * 0.82, bobY);
        ctx.lineTo(d.x, bobY + r);
        ctx.lineTo(d.x - r * 0.82, bobY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(d.x, bobY - r * 0.48);
        ctx.lineTo(d.x + r * 0.36, bobY);
        ctx.lineTo(d.x, bobY + r * 0.48);
        ctx.lineTo(d.x - r * 0.36, bobY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Barriles Rodantes con cuerpo metálico/cobre y aros luminosos bien definidos
      for (const b of barrels) {
        const bcx = b.x + BARREL_SIZE / 2;
        const bcy = b.y + BARREL_SIZE / 2;

        ctx.save();
        ctx.translate(bcx, bcy);

        // Halo exterior controlado
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(245, 158, 11, 0.24)';
        ctx.beginPath();
        ctx.arc(0, 0, BARREL_SIZE / 2 + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.rotate(b.rot);
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.arc(0, 0, BARREL_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, BARREL_SIZE / 2 - 1, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#fef3c7';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-BARREL_SIZE / 2 + 3, 0);
        ctx.lineTo(BARREL_SIZE / 2 - 3, 0);
        ctx.moveTo(0, -BARREL_SIZE / 2 + 3);
        ctx.lineTo(0, BARREL_SIZE / 2 - 3);
        ctx.stroke();
        ctx.restore();
      }

      // Estela de luz del jugador
      if (trailNodes.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < trailNodes.length; i++) {
          const tn = trailNodes[i];
          ctx.globalAlpha = Math.max(0, tn.alpha * ((i + 1) / trailNodes.length) * 0.42);
          ctx.fillStyle = resolvedShirt;
          ctx.fillRect(tn.x + 4, tn.y + 6, player.w - 8, player.h - 10);
        }
        ctx.restore();
      }

      // Partículas de impacto y recolección
      if (sparks.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const sp of sparks) {
          ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
          ctx.fillStyle = sp.color;
          ctx.fillRect(Math.round(sp.x) - 2, Math.round(sp.y) - 2, 4, 4);
        }
        ctx.restore();
      }

      // Textos flotantes de salto sobre barriles
      for (const fp of floatingPopups) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, fp.life * 1.6);
        ctx.fillStyle = '#00f3ff';
        ctx.font = '700 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(fp.text, fp.x, fp.y);
        ctx.restore();
      }

      // Arquitecto Pixelado: aura posterior suave + píxeles 100% nítidos en primer plano
      const blinkSkip =
        player.invulnTimer > 0 && Math.floor(elapsed * 16) % 2 === 0;
      if (!blinkSkip) {
        const px = Math.round(player.x);
        const py = Math.round(player.y);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = resolvedShirt;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(px - 2, py + 2, player.w + 4, player.h - 2);
        ctx.restore();

        ctx.save();
        ctx.shadowBlur = 0;

        ctx.fillStyle = resolvedHair;
        ctx.fillRect(px + 2, py, 22, 7);

        ctx.fillStyle = resolvedSkin;
        ctx.fillRect(px + 4, py + 6, 18, 11);

        if (!player.activeLadder) {
          const eyeOff = player.facing === 1 ? 3 : -3;
          ctx.fillStyle = '#05070f';
          ctx.fillRect(px + 8 + eyeOff, py + 9, 3, 4);
          ctx.fillRect(px + 15 + eyeOff, py + 9, 3, 4);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(px + 8 + eyeOff, py + 9, 1, 2);
          ctx.fillRect(px + 15 + eyeOff, py + 9, 1, 2);
        }

        ctx.fillStyle = resolvedShirt;
        ctx.fillRect(px + 3, py + 17, 20, 11);

        ctx.fillStyle = '#facc15';
        ctx.fillRect(px + 3, py + 25, 20, 3);

        const legAnim = player.activeLadder
          ? Math.round(Math.sin(player.climbCycle) * 3)
          : !player.onGround
          ? 3
          : Math.abs(player.vx) > 18
          ? Math.round(Math.sin(player.walkCycle * 15) * 3)
          : 0;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + 4, py + 28, 7, 8 - Math.max(0, legAnim));
        ctx.fillRect(px + 15, py + 28, 7, 8 - Math.max(0, -legAnim));
        ctx.restore();
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [skinColor, hairColor, shirtColor, runSeed]);

  return (
    <div className="w-full max-w-[940px] flex flex-col items-center space-y-3.5 px-2 select-none">
      {/* Barra superior HUD */}
      <div className="w-full glass-panel rounded-lg flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs sm:text-sm font-mono-tabular">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-[#00f3ff]">EL VIAJE · TORRE NEÓN</span>
          <span className="text-slate-500">·</span>
          <span className="text-white">
            DIAMANTES:{' '}
            <strong className="text-[#fde047]">{diamondsCollected} / 3</strong>
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-white">
            ESCUDOS:{' '}
            <strong className="text-[#39ff14]">
              {Array.from({ length: Math.max(0, shields) })
                .map(() => '■')
                .join(' ') || '0'}
            </strong>
          </span>
        </div>

        <span className="text-slate-300 text-xs">
          {diamondsCollected < 3
            ? 'A/D: Mover · W/S: Escaleras · ESPACIO: Saltar barriles'
            : '¡3/3 Diamantes! Sube a la cima junto al villano →'}
        </span>
      </div>

      {/* Lienzo vertical estilo Donkey Kong HD-2D */}
      <div className="relative w-full rounded-lg border border-[#00f3ff]/75 bg-[#050312] shadow-[0_0_45px_rgba(0,243,255,0.2)] overflow-hidden">
        <canvas
          id="platformer-canvas"
          ref={canvasRef}
          width={STAGE_W}
          height={STAGE_H}
          className="block w-full h-auto aspect-[45/28]"
        />

        {summitHint && !missionUnlocked && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 glass-hud rounded px-4 py-2 text-[#fde047] text-xs font-mono-tabular whitespace-nowrap">
            Recolecta los 3 Diamantes de Memoria antes de alcanzar la cima
          </div>
        )}

        {missionUnlocked && !ceremonyOpen && (
          <div className="absolute inset-0 bg-black/84 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-3">
            <p className="font-mono-tabular text-xl sm:text-3xl font-bold text-[#39ff14] phosphor-green-glow tracking-wide">
              Siguiente hito desbloqueado: 1978
            </p>
            <p className="text-xs sm:text-sm text-slate-300 font-ui">
              Estabilizando memoria histórica de plataformas...
            </p>
          </div>
        )}

        {ceremonyOpen && (
          <MemoryUnlockedModal
            entry={getHistoricalMemory('donkey-kong')}
            alreadyRestoredBefore={alreadyRestoredBefore}
            continueLabel="Continuar a Space Invaders (1978)"
            onContinue={() => {
              setCeremonyOpen(false);
              onCompleteRef.current();
            }}
          />
        )}

        {gameOver && !missionUnlocked && (
          <div className="absolute inset-0 bg-black/86 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center space-y-4">
            <p className="font-mono-tabular text-xl sm:text-2xl font-bold text-rose-400">
              Escudos agotados por impacto de barriles
            </p>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md font-ui">
              Esquiva o salta los barriles luminosos con Espacio y usa las escaleras (W / S) para reunir los 3 Diamantes de Memoria.
            </p>
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                setRunSeed((s) => s + 1);
              }}
              className="btn-ui rounded px-6 py-2.5 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              Reintentar El Viaje
            </button>
          </div>
        )}
      </div>

      {/* Controles táctiles / clic en pantalla */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono-tabular">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onPointerDown={() => {
              controlsRef.current.left = true;
            }}
            onPointerUp={() => {
              controlsRef.current.left = false;
            }}
            onPointerLeave={() => {
              controlsRef.current.left = false;
            }}
            className="px-3.5 py-2 glass-panel rounded text-slate-200 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            ← A · Izq
          </button>
          <button
            type="button"
            onPointerDown={() => {
              controlsRef.current.right = true;
            }}
            onPointerUp={() => {
              controlsRef.current.right = false;
            }}
            onPointerLeave={() => {
              controlsRef.current.right = false;
            }}
            className="px-3.5 py-2 glass-panel rounded text-slate-200 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            D · Der →
          </button>
          <button
            type="button"
            onPointerDown={() => {
              controlsRef.current.up = true;
            }}
            onPointerUp={() => {
              controlsRef.current.up = false;
            }}
            onPointerLeave={() => {
              controlsRef.current.up = false;
            }}
            className="px-3.5 py-2 glass-panel rounded text-slate-200 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            ↑ W · Subir
          </button>
          <button
            type="button"
            onPointerDown={() => {
              controlsRef.current.down = true;
            }}
            onPointerUp={() => {
              controlsRef.current.down = false;
            }}
            onPointerLeave={() => {
              controlsRef.current.down = false;
            }}
            className="px-3.5 py-2 glass-panel rounded text-slate-200 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          >
            ↓ S · Bajar
          </button>
        </div>

        <button
          type="button"
          onPointerDown={() => {
            controlsRef.current.jumpBuffer = 0.13;
            controlsRef.current.jumpHeld = true;
          }}
          onPointerUp={() => {
            controlsRef.current.jumpHeld = false;
          }}
          onPointerLeave={() => {
            controlsRef.current.jumpHeld = false;
          }}
          className="btn-ui px-5 py-2 text-xs font-bold rounded cursor-pointer whitespace-nowrap shrink-0"
        >
          ESPACIO · Saltar
        </button>
      </div>
    </div>
  );
}
