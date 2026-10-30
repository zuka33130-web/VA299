import React, { useCallback, useEffect, useRef, useState } from 'react';
import { retroAudio } from '../audio/retroAudio';
import { getHistoricalMemory } from '../memories/historicalCatalog';
import { MemoryUnlockedModal } from '../memories/MemoryUnlockedModal';
import { SPACE_INVADERS_UNLOCK_SCORE } from '../memories/progressionState';

const INVADER_FRAME_A: string[] = [
  '..X.....X..',
  '...X...X...',
  '..XXXXXXX..',
  '.XX.XXX.XX.',
  'XXXXXXXXXXX',
  'X.XXXXXXX.X',
  'X.X.....X.X',
  '...XX.XX...',
];

const INVADER_FRAME_B: string[] = [
  '..X.....X..',
  'X..X...X..X',
  'X.XXXXXXX.X',
  'XXX.XXX.XXX',
  '.XXXXXXXXX.',
  '..XXXXXXX..',
  '..X.....X..',
  '.X.......X.',
];

const UFO_MATRIX: string[] = [
  '....XXXXXX....',
  '..XXXXXXXXXX..',
  '.XXXXXXXXXXXX.',
  'XX.XX.XX.XX.XX',
  'XXXXXXXXXXXXXX',
  '..XXX....XXX..',
  '...X......X...',
];

interface AlienEntity {
  id: number;
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  points: number;
  color: string;
}

interface MysteryUfo {
  active: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  dir: 1 | -1;
  speed: number;
  points: number;
  warbleTimer: number;
}

interface FloatingScoreText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface LaserBolt {
  x: number;
  y: number;
  vy: number;
  fromPlayer: boolean;
}

interface ShieldBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
}

type InvadersPostVictoryPhase =
  | 'none'
  | 'calm'
  | 'ceremony'
  | 'ship-departure';

const INV_W = 640;
const INV_H = 440;

export function HD2DSpaceInvadersStage({
  skinColor = '#ffccaa',
  hairColor = '#331100',
  shirtColor = '#00f3ff',
  alreadyRestoredBefore = false,
  onVictoryRecorded,
  onCeremonyCompleted,
  onReturnToIslandWithShip,
  onBackToMap,
  onRestartCinematic,
}: {
  skinColor?: string;
  hairColor?: string;
  shirtColor?: string;
  alreadyRestoredBefore?: boolean;
  onVictoryRecorded?: (finalScore: number) => void;
  onCeremonyCompleted?: () => void;
  onReturnToIslandWithShip?: () => void;
  onBackToMap: () => void;
  onRestartCinematic: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [waveKey, setWaveKey] = useState<number>(1);
  const [score, setScore] = useState<number>(0);
  const [waveNumber, setWaveNumber] = useState<number>(1);
  const [ships, setShips] = useState<number>(3);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [victoryPhase, setVictoryPhase] =
    useState<InvadersPostVictoryPhase>('none');
  const [departureCaption, setDepartureCaption] = useState<string>('');

  const victoryPhaseRef = useRef<InvadersPostVictoryPhase>('none');
  victoryPhaseRef.current = victoryPhase;

  // Bloqueo estricto de ejecución única para el desbloqueo histórico (>= 1000 puntos reales)
  const memoryUnlockFiredRef = useRef<boolean>(false);

  const avatarColorsRef = useRef({ skinColor, hairColor, shirtColor });
  avatarColorsRef.current = { skinColor, hairColor, shirtColor };

  const onVictoryRecordedRef = useRef(onVictoryRecorded);
  onVictoryRecordedRef.current = onVictoryRecorded;
  const onCeremonyCompletedRef = useRef(onCeremonyCompleted);
  onCeremonyCompletedRef.current = onCeremonyCompleted;
  const onReturnToIslandWithShipRef = useRef(onReturnToIslandWithShip);
  onReturnToIslandWithShipRef.current = onReturnToIslandWithShip;

  const departureDoneRef = useRef<boolean>(false);

  const completeShipReturn = useCallback(() => {
    if (departureDoneRef.current) return;
    departureDoneRef.current = true;
    if (onReturnToIslandWithShipRef.current) {
      onReturnToIslandWithShipRef.current();
    } else {
      onBackToMap();
    }
  }, [onBackToMap]);

  const handleCeremonyContinue = useCallback(() => {
    onCeremonyCompletedRef.current?.();
    departureDoneRef.current = false;
    setDepartureCaption(
      'Señal orbital detectada · La nave estelar de PIXELVERSE aterriza en el sector 1978...'
    );
    setVictoryPhase('ship-departure');
  }, []);

  const controlsRef = useRef<{
    left: boolean;
    right: boolean;
    fireQueued: boolean;
    fireHeld: boolean;
  }>({
    left: false,
    right: false,
    fireQueued: false,
    fireHeld: false,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft') controlsRef.current.left = true;
      if (k === 'd' || e.key === 'ArrowRight') controlsRef.current.right = true;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!controlsRef.current.fireHeld) {
          controlsRef.current.fireQueued = true;
        }
        controlsRef.current.fireHeld = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || e.key === 'ArrowLeft') controlsRef.current.left = false;
      if (k === 'd' || e.key === 'ArrowRight') controlsRef.current.right = false;
      if (e.code === 'Space') controlsRef.current.fireHeld = false;
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

    setScore(0);
    setWaveNumber(1);
    setShips(3);
    setStatus('playing');
    setVictoryPhase('none');
    victoryPhaseRef.current = 'none';
    setDepartureCaption('');
    departureDoneRef.current = false;
    memoryUnlockFiredRef.current = false;

    const defender = {
      x: INV_W / 2 - 20,
      y: 392,
      w: 40,
      h: 20,
      speed: 270,
      cooldown: 0,
      invuln: 0,
    };

    const aliens: AlienEntity[] = [];
    let aid = 1;
    const ROWS = 4;
    const COLS = 8;
    const ALIEN_W = 33;
    const ALIEN_H = 24;

    const populateWave = (waveIdx: number) => {
      aliens.length = 0;
      const startY = Math.min(82, 64 + (waveIdx - 1) * 6);
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          aliens.push({
            id: aid++,
            row: r,
            col: c,
            x: 86 + c * 58,
            y: startY + r * 39,
            w: ALIEN_W,
            h: ALIEN_H,
            alive: true,
            points: r === 0 ? 30 : r < 3 ? 20 : 10,
            color: r % 2 === 0 ? '#39ff14' : '#ffffff',
          });
        }
      }
    };

    populateWave(1);

    // 4 Búnkeres clásicos de fósforo verde destructibles
    const bunkers: ShieldBlock[] = [];
    const buildBunkers = () => {
      bunkers.length = 0;
      for (let b = 0; b < 4; b++) {
        const baseX = 92 + b * 136;
        const baseY = 334;
        for (let br = 0; br < 3; br++) {
          for (let bc = 0; bc < 4; bc++) {
            if (br === 2 && (bc === 1 || bc === 2)) continue;
            bunkers.push({
              x: baseX + bc * 13,
              y: baseY + br * 10,
              w: 12,
              h: 9,
              hp: 2,
            });
          }
        }
      }
    };
    buildBunkers();

    // OVNI Misterioso Rojo original de 1978 en la franja superior de celofán
    const ufo: MysteryUfo = {
      active: false,
      x: -48,
      y: 39,
      w: 42,
      h: 21,
      dir: 1,
      speed: 118,
      points: 100,
      warbleTimer: 0,
    };
    let ufoSpawnCooldown = 7.5;
    let shotsFiredCount = 0;

    const lasers: LaserBolt[] = [];
    const sparks: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      color: string;
    }[] = [];
    const scorePopups: FloatingScoreText[] = [];

    let currentWave = 1;
    let waveBannerTimer = 0;
    let formationDir: 1 | -1 = 1;
    let enemyShotTimer = 1.05;
    let animToggleTimer = 0;
    let useAltFrame = false;
    let localScore = 0;
    let localShips = 3;
    let ended = false;
    let memoryUnlockTriggered = false;
    let calmElapsed = 0;
    let calmDone = false;
    let shipSeqElapsed = 0;
    let engineIgnitedSfx = false;
    let lastCaptionStage = 0;
    const shuttleParticles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
      size: number;
    }[] = [];
    let cancelled = false;
    let rafId = 0;
    let prevNow = performance.now();

    const spawnPhosphorBurst = (cx: number, cy: number, color: string) => {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        const spd = 55 + Math.random() * 115;
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.38,
          color,
        });
      }
    };

    const spawnScorePopup = (x: number, y: number, text: string, color: string) => {
      scorePopups.push({
        x,
        y,
        text,
        color,
        life: 0.95,
        maxLife: 0.95,
      });
    };

    // Evaluación en tiempo real sobre el puntaje real con guardia de ejecución única
    const evaluateHistoricalUnlock = (realScore: number): boolean => {
      if (
        memoryUnlockTriggered ||
        memoryUnlockFiredRef.current ||
        realScore < SPACE_INVADERS_UNLOCK_SCORE
      ) {
        return false;
      }
      memoryUnlockTriggered = true;
      memoryUnlockFiredRef.current = true;
      ended = true;
      ufo.active = false;
      lasers.length = 0;
      controlsRef.current.left = false;
      controlsRef.current.right = false;
      controlsRef.current.fireHeld = false;
      controlsRef.current.fireQueued = false;
      spawnPhosphorBurst(INV_W / 2, 136, '#39ff14');
      spawnPhosphorBurst(INV_W / 2 - 96, 162, '#00f3ff');
      spawnPhosphorBurst(INV_W / 2 + 96, 162, '#f97316');
      setStatus('won');
      setVictoryPhase('calm');
      victoryPhaseRef.current = 'calm';
      retroAudio.portalVictory();
      onVictoryRecordedRef.current?.(realScore);
      return true;
    };

    const overlaps = (
      ax: number,
      ay: number,
      aw: number,
      ah: number,
      bx: number,
      by: number,
      bw: number,
      bh: number
    ) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

    const loop = (now: number) => {
      if (cancelled) return;
      const dt = Math.min(0.035, (now - prevNow) / 1000);
      prevNow = now;

      if (waveBannerTimer > 0) {
        waveBannerTimer = Math.max(0, waveBannerTimer - dt);
      }

      if (!ended) {
        if (defender.cooldown > 0) defender.cooldown -= dt;
        if (defender.invuln > 0) defender.invuln -= dt;

        // 1. Movimiento de la nave defensora (A / D o flechas)
        const moveDir =
          (controlsRef.current.right ? 1 : 0) -
          (controlsRef.current.left ? 1 : 0);
        defender.x += moveDir * defender.speed * dt;
        defender.x = Math.max(24, Math.min(INV_W - 24 - defender.w, defender.x));

        // 2. Disparo láser del jugador (Espacio)
        if (
          (controlsRef.current.fireQueued || controlsRef.current.fireHeld) &&
          defender.cooldown <= 0
        ) {
          controlsRef.current.fireQueued = false;
          defender.cooldown = 0.27;
          shotsFiredCount += 1;
          lasers.push({
            x: defender.x + defender.w / 2 - 2,
            y: defender.y - 12,
            vy: -475,
            fromPlayer: true,
          });
          retroAudio.laserShoot();
        }

        // 2b. OVNI Misterioso Rojo (100 / 150 puntos en la banda superior)
        if (!ufo.active) {
          ufoSpawnCooldown -= dt;
          if (ufoSpawnCooldown <= 0) {
            ufo.active = true;
            ufo.dir = currentWave % 2 === 1 ? 1 : -1;
            ufo.x = ufo.dir === 1 ? -ufo.w - 4 : INV_W + 4;
            ufo.y = 39;
            ufo.points = shotsFiredCount % 3 === 0 ? 150 : 100;
            ufo.warbleTimer = 0.05;
            ufoSpawnCooldown = 10.5 + Math.random() * 4.5;
          }
        } else {
          ufo.x += ufo.dir * ufo.speed * dt;
          ufo.warbleTimer -= dt;
          if (ufo.warbleTimer <= 0) {
            ufo.warbleTimer = 0.42;
            retroAudio.ufoWarble();
          }
          if (
            (ufo.dir === 1 && ufo.x > INV_W + 14) ||
            (ufo.dir === -1 && ufo.x + ufo.w < -14)
          ) {
            ufo.active = false;
          }
        }

        // 3. Movimiento sincronizado de la cuadrícula de aliens y avance de oleadas
        const livingAliens = aliens.filter((a) => a.alive);
        if (livingAliens.length === 0) {
          if (!evaluateHistoricalUnlock(localScore)) {
            // La oleada cayó pero aún no se alcanzan los 1000 puntos reales: desplegar nueva oleada
            currentWave += 1;
            setWaveNumber(currentWave);
            formationDir = 1;
            lasers.length = 0;
            populateWave(currentWave);
            for (const bk of bunkers) {
              bk.hp = Math.min(2, bk.hp + 1);
            }
            waveBannerTimer = 2.0;
            retroAudio.waveAdvance();
          }
        } else {
          const waveSpeedBoost = 1 + (currentWave - 1) * 0.14;
          const speedRatio =
            (1 + (aliens.length - livingAliens.length) * 0.062) * waveSpeedBoost;
          const marchSpeed = 48 * speedRatio;

          animToggleTimer += dt * speedRatio;
          if (animToggleTimer >= 0.44) {
            animToggleTimer = 0;
            useAltFrame = !useAltFrame;
          }

          let hitEdge = false;
          for (const a of livingAliens) {
            const nextX = a.x + formationDir * marchSpeed * dt;
            if (nextX <= 22 || nextX + a.w >= INV_W - 22) {
              hitEdge = true;
              break;
            }
          }

          if (hitEdge) {
            formationDir = formationDir === 1 ? -1 : 1;
            for (const a of livingAliens) {
              a.y += 15;
              if (a.y + a.h >= defender.y - 6) {
                ended = true;
                setStatus('lost');
                retroAudio.playerHit();
              }
            }
          } else {
            for (const a of livingAliens) {
              a.x += formationDir * marchSpeed * dt;
            }
          }

          // 4. Disparos de proyectiles alienígenas hacia abajo
          enemyShotTimer -= dt;
          if (enemyShotTimer <= 0 && !ended) {
            const bottomByCol = new Map<number, AlienEntity>();
            for (const a of livingAliens) {
              const prev = bottomByCol.get(a.col);
              if (!prev || a.row > prev.row) {
                bottomByCol.set(a.col, a);
              }
            }
            const shooters = Array.from(bottomByCol.values());
            if (shooters.length > 0) {
              const shooter =
                shooters[Math.floor(Math.random() * shooters.length)];
              lasers.push({
                x: shooter.x + shooter.w / 2 - 2,
                y: shooter.y + shooter.h + 2,
                vy: 235 + (currentWave - 1) * 18,
                fromPlayer: false,
              });
            }
            enemyShotTimer = Math.max(
              0.48,
              (0.72 + Math.random() * 0.62) - (currentWave - 1) * 0.08
            );
          }
        }

        // 5. Actualizar proyectiles y colisiones
        for (let li = lasers.length - 1; li >= 0; li--) {
          if (ended) break;
          const l = lasers[li];
          l.y += l.vy * dt;

          if (l.y < 32 || l.y > INV_H - 22) {
            lasers.splice(li, 1);
            continue;
          }

          // Colisión contra búnkeres
          let absorbedByBunker = false;
          for (let bi = bunkers.length - 1; bi >= 0; bi--) {
            const bk = bunkers[bi];
            if (overlaps(l.x, l.y, 4, 13, bk.x, bk.y, bk.w, bk.h)) {
              bk.hp -= 1;
              spawnPhosphorBurst(l.x + 2, l.y + 6, '#39ff14');
              if (bk.hp <= 0) bunkers.splice(bi, 1);
              lasers.splice(li, 1);
              absorbedByBunker = true;
              break;
            }
          }
          if (absorbedByBunker) continue;

          if (l.fromPlayer) {
            // Colisión contra OVNI Misterioso Rojo (100 / 150 puntos)
            if (
              ufo.active &&
              overlaps(l.x, l.y, 4, 13, ufo.x, ufo.y, ufo.w, ufo.h)
            ) {
              ufo.active = false;
              lasers.splice(li, 1);
              localScore += ufo.points;
              setScore(localScore);
              retroAudio.ufoBonusHit();
              spawnPhosphorBurst(ufo.x + ufo.w / 2, ufo.y + ufo.h / 2, '#ef4444');
              spawnScorePopup(
                ufo.x + ufo.w / 2,
                ufo.y + 12,
                `+${ufo.points}`,
                '#fca5a5'
              );
              evaluateHistoricalUnlock(localScore);
              continue;
            }

            for (const a of aliens) {
              if (!a.alive) continue;
              if (overlaps(l.x, l.y, 4, 13, a.x, a.y, a.w, a.h)) {
                a.alive = false;
                lasers.splice(li, 1);
                localScore += a.points;
                setScore(localScore);
                retroAudio.alienExplode();
                spawnPhosphorBurst(a.x + a.w / 2, a.y + a.h / 2, a.color);
                evaluateHistoricalUnlock(localScore);
                break;
              }
            }
          } else if (
            defender.invuln <= 0 &&
            overlaps(
              l.x,
              l.y,
              4,
              13,
              defender.x + 3,
              defender.y + 3,
              defender.w - 6,
              defender.h - 3
            )
          ) {
            lasers.splice(li, 1);
            localShips -= 1;
            setShips(localShips);
            defender.invuln = 1.4;
            retroAudio.playerHit();
            spawnPhosphorBurst(
              defender.x + defender.w / 2,
              defender.y + defender.h / 2,
              '#39ff14'
            );
            if (localShips <= 0) {
              ended = true;
              setStatus('lost');
            }
          }
        }
      }

      // Progresión post-victoria (Escena A -> Escena B -> Escenas C, D y E)
      const currentVPhase = victoryPhaseRef.current;
      if (ended && currentVPhase === 'calm' && !calmDone) {
        calmElapsed += dt;
        if (calmElapsed >= 1.35) {
          calmDone = true;
          setVictoryPhase('ceremony');
          victoryPhaseRef.current = 'ceremony';
        }
      } else if (ended && currentVPhase === 'ship-departure') {
        shipSeqElapsed += dt;
        if (shipSeqElapsed >= 1.45 && lastCaptionStage < 1) {
          lastCaptionStage = 1;
          setDepartureCaption(
            'Compuerta abierta · Pixel aborda su nave para llevar el recuerdo de 1978 a la isla...'
          );
        }
        if (shipSeqElapsed >= 3.25 && lastCaptionStage < 2) {
          lastCaptionStage = 2;
          setDepartureCaption(
            'Propulsores encendidos · Aterrizaje programado en la plataforma de la Isla de los 70...'
          );
        }
        if (shipSeqElapsed >= 3.15 && !engineIgnitedSfx) {
          engineIgnitedSfx = true;
          retroAudio.hoverboardLaunch();
        }
        if (shipSeqElapsed >= 5.1) {
          completeShipReturn();
        }
      }

      for (let si = sparks.length - 1; si >= 0; si--) {
        sparks[si].x += sparks[si].vx * dt;
        sparks[si].y += sparks[si].vy * dt;
        sparks[si].life -= dt;
        if (sparks[si].life <= 0) sparks.splice(si, 1);
      }

      for (let pi = scorePopups.length - 1; pi >= 0; pi--) {
        scorePopups[pi].y -= 22 * dt;
        scorePopups[pi].life -= dt;
        if (scorePopups[pi].life <= 0) scorePopups.splice(pi, 1);
      }

      for (let pi = shuttleParticles.length - 1; pi >= 0; pi--) {
        const pt = shuttleParticles[pi];
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) shuttleParticles.splice(pi, 1);
      }

      const liftoffRaw =
        currentVPhase === 'ship-departure'
          ? Math.max(0, Math.min(1, (shipSeqElapsed - 3.35) / 1.65))
          : 0;
      const liftoffEase = liftoffRaw * liftoffRaw * (3 - 2 * liftoffRaw);
      const worldDropY = liftoffEase * 190;

      // =========================================================
      // RENDERIZADO CRT FÓSFORO NÍTIDO Y CAPAS DE CELOFÁN 1978
      // =========================================================
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = false;
      ctx.shadowBlur = 0;

      const crtBg = ctx.createRadialGradient(
        INV_W / 2,
        INV_H * 0.46,
        20,
        INV_W / 2,
        INV_H * 0.5,
        INV_W * 0.76
      );
      crtBg.addColorStop(
        0,
        currentVPhase === 'ship-departure' ? '#041224' : '#04130a'
      );
      crtBg.addColorStop(0.65, '#020805');
      crtBg.addColorStop(1, '#010302');
      ctx.fillStyle = crtBg;
      ctx.fillRect(0, 0, INV_W, INV_H);

      ctx.fillStyle =
        liftoffRaw > 0.05
          ? 'rgba(186, 230, 253, 0.65)'
          : 'rgba(186, 230, 253, 0.22)';
      for (let s = 0; s < 32; s++) {
        const sx = ((s * 137 + 29) % (INV_W - 40)) + 20;
        const baseSy = ((s * 89 + 44) % (INV_H - 90)) + 42;
        const sy =
          liftoffRaw > 0
            ? ((baseSy + liftoffEase * (220 + (s % 4) * 55)) % (INV_H - 48)) + 38
            : baseSy;
        const streakH =
          liftoffRaw > 0.15 ? Math.round(2 + liftoffEase * 14) : s % 3 === 0 ? 2 : 1;
        ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1, streakH);
      }

      // Franja superior roja/ámbar (banda celofán zona OVNI original 1978)
      const upperBand = ctx.createLinearGradient(0, 0, 0, 64);
      upperBand.addColorStop(0, 'rgba(239, 68, 68, 0.095)');
      upperBand.addColorStop(0.65, 'rgba(249, 115, 22, 0.045)');
      upperBand.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = upperBand;
      ctx.fillRect(0, 0, INV_W, 64);

      // Franja inferior tipo celofán verde 1978
      const lowerBand = ctx.createLinearGradient(0, 318, 0, INV_H);
      lowerBand.addColorStop(0, 'rgba(57, 255, 20, 0)');
      lowerBand.addColorStop(0.35, 'rgba(57, 255, 20, 0.035)');
      lowerBand.addColorStop(1, 'rgba(57, 255, 20, 0.06)');
      ctx.fillStyle = lowerBand;
      ctx.fillRect(0, 318, INV_W, INV_H - 318);

      // Encabezado CRT 1978 con meta explícita de 1000 puntos reales
      ctx.save();
      ctx.font = '700 14px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'left';
      ctx.fillText(
        `SCORE ${String(localScore).padStart(4, '0')} / ${SPACE_INVADERS_UNLOCK_SCORE}`,
        22,
        24
      );
      ctx.textAlign = 'center';
      ctx.fillStyle = '#39ff14';
      ctx.shadowColor = 'rgba(57, 255, 20, 0.55)';
      ctx.fillText(`OLEADA ${currentWave} · 1978`, INV_W / 2, 24);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
      ctx.fillText(`NAVES ${Math.max(0, localShips)}`, INV_W - 22, 24);
      ctx.restore();

      // Barra de progreso fina hacia los 1000 puntos históricos
      const progressRatio = Math.min(1, localScore / SPACE_INVADERS_UNLOCK_SCORE);
      ctx.fillStyle = 'rgba(57, 255, 20, 0.16)';
      ctx.fillRect(22, 32, INV_W - 44, 2);
      ctx.fillStyle = progressRatio >= 1 ? '#00f3ff' : '#39ff14';
      ctx.fillRect(22, 32, Math.round((INV_W - 44) * progressRatio), 2);

      // Mundo de superficie de Space Invaders (se aleja hacia abajo en Escena E)
      ctx.save();
      ctx.translate(0, Math.round(worldDropY));

      ctx.save();
      ctx.shadowColor = 'rgba(57, 255, 20, 0.75)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(18, INV_H - 19, INV_W - 36, 2);
      ctx.restore();

      // OVNI Misterioso Rojo (pixel-art nítido + aura carmesí)
      if (ufo.active && !ended) {
        const ux = Math.round(ufo.x);
        const uy = Math.round(ufo.y);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
        ctx.fillRect(ux - 4, uy - 3, ufo.w + 8, ufo.h + 6);
        ctx.restore();

        ctx.fillStyle = '#ef4444';
        for (let r = 0; r < UFO_MATRIX.length; r++) {
          const rowStr = UFO_MATRIX[r];
          for (let c = 0; c < rowStr.length; c++) {
            if (rowStr[c] === 'X') {
              ctx.fillRect(ux + c * 3, uy + r * 3, 3, 3);
            }
          }
        }
      }

      // Búnkeres de defensa
      for (const bk of bunkers) {
        if (bk.hp === 2) {
          ctx.fillStyle = '#39ff14';
          ctx.fillRect(bk.x, bk.y, bk.w, bk.h);
          ctx.fillStyle = '#bbf7d0';
          ctx.fillRect(bk.x, bk.y, bk.w, 2);
        } else {
          ctx.fillStyle = 'rgba(57, 255, 20, 0.58)';
          ctx.fillRect(bk.x + 1, bk.y + 1, bk.w - 2, bk.h - 2);
        }
      }

      // Pasada 1 de Aliens: aura suave de fósforo por entidad
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const a of aliens) {
        if (!a.alive) continue;
        ctx.fillStyle =
          a.color === '#39ff14'
            ? 'rgba(57, 255, 20, 0.11)'
            : 'rgba(224, 242, 254, 0.09)';
        ctx.fillRect(
          Math.round(a.x) - 3,
          Math.round(a.y) - 3,
          a.w + 6,
          a.h + 6
        );
      }
      ctx.restore();

      // Pasada 2 de Aliens: píxeles 100% nítidos sin desenfoque
      const matrix = useAltFrame ? INVADER_FRAME_B : INVADER_FRAME_A;
      const pxSize = 3;
      ctx.shadowBlur = 0;
      for (const a of aliens) {
        if (!a.alive) continue;
        const ax = Math.round(a.x);
        const ay = Math.round(a.y);
        ctx.fillStyle = a.color;
        for (let r = 0; r < matrix.length; r++) {
          const rowStr = matrix[r];
          for (let c = 0; c < rowStr.length; c++) {
            if (rowStr[c] === 'X') {
              ctx.fillRect(ax + c * pxSize, ay + r * pxSize, pxSize, pxSize);
            }
          }
        }
      }

      // Nave defensora del jugador
      const shipBlink =
        defender.invuln > 0 && Math.floor(now / 80) % 2 === 0;
      if (!shipBlink) {
        const dx = Math.round(defender.x);
        const dy = Math.round(defender.y);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(57, 255, 20, 0.18)';
        ctx.fillRect(dx - 4, dy - 5, defender.w + 8, defender.h + 8);
        ctx.restore();

        ctx.fillStyle = '#39ff14';
        ctx.fillRect(dx, dy + 8, defender.w, 12);
        ctx.fillRect(dx + 6, dy + 4, defender.w - 12, 5);
        ctx.fillRect(dx + defender.w / 2 - 3, dy - 3, 6, 8);
        ctx.fillStyle = '#dcfce7';
        ctx.fillRect(dx + defender.w / 2 - 1, dy - 3, 2, 6);
        ctx.fillRect(dx + 6, dy + 4, defender.w - 12, 2);
      }

      ctx.restore();

      // Aviso de nueva oleada cuando aún faltan puntos para llegar a 1000
      if (waveBannerTimer > 0 && !ended) {
        ctx.save();
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = 'rgba(250, 204, 21, 0.65)';
        ctx.shadowBlur = 8;
        ctx.fillText(
          `OLEADA ${currentWave} EN CURSO · FALTAN ${Math.max(
            0,
            SPACE_INVADERS_UNLOCK_SCORE - localScore
          )} PTS PARA RESTAURAR 1978`,
          INV_W / 2,
          56
        );
        ctx.restore();
      }

      // Mensaje breve de estabilización durante Escena A (Calma previa a ceremonia)
      if (currentVPhase === 'calm') {
        ctx.save();
        ctx.font = '700 15px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#39ff14';
        ctx.shadowColor = 'rgba(57, 255, 20, 0.8)';
        ctx.shadowBlur = 12;
        ctx.fillText(
          `META ${SPACE_INVADERS_UNLOCK_SCORE} PTS SUPERADA · SECTOR 1978 RESTAURADO`,
          INV_W / 2,
          212
        );
        ctx.restore();
      }

      // =========================================================
      // ESCENAS C, D y E: NAVE ESTELAR DE PIXELVERSE, ABORDAJE Y DESPEGUE
      // =========================================================
      if (currentVPhase === 'ship-departure') {
        const {
          skinColor: avSkin,
          hairColor: avHair,
          shirtColor: avShirt,
        } = avatarColorsRef.current;

        const padX = Math.min(INV_W - 118, Math.max(defender.x + 150, 446));
        const groundY = INV_H - 19 + worldDropY;

        const descendT = Math.min(1, shipSeqElapsed / 1.35);
        const descendEase = 1 - Math.pow(1 - descendT, 3);

        const rampOpen =
          shipSeqElapsed < 1.35
            ? 0
            : shipSeqElapsed < 1.85
            ? (shipSeqElapsed - 1.35) / 0.5
            : shipSeqElapsed < 2.85
            ? 1
            : shipSeqElapsed < 3.25
            ? 1 - (shipSeqElapsed - 2.85) / 0.4
            : 0;

        const walkT = Math.max(0, Math.min(1, (shipSeqElapsed - 1.7) / 1.15));
        const walkEase = walkT * walkT * (3 - 2 * walkT);
        const pixelBoarded = shipSeqElapsed >= 2.85;

        const launchT = Math.max(0, Math.min(1, (shipSeqElapsed - 3.35) / 1.7));
        const launchAccel = launchT * launchT * 1.45 + launchT * 0.25;

        const shuttleX = padX - launchAccel * 76;
        const shuttleLandedY = INV_H - 42;
        const shuttleY =
          shipSeqElapsed < 1.35
            ? -60 + (shuttleLandedY + 60) * descendEase
            : shuttleLandedY - launchAccel * 365;
        const shuttleTilt = launchT > 0 ? -0.14 * Math.min(1, launchT * 1.8) : 0;

        const enginesHot = shipSeqElapsed < 1.25 || shipSeqElapsed >= 3.1;
        if (enginesHot && Math.random() < 0.85) {
          for (let e = 0; e < 2; e++) {
            shuttleParticles.push({
              x: shuttleX + (e === 0 ? -18 : 18) + (Math.random() - 0.5) * 8,
              y: shuttleY + 20,
              vx: (Math.random() - 0.5) * 38 + (launchT > 0 ? 18 : 0),
              vy: 85 + Math.random() * 115,
              life: 0.42,
              maxLife: 0.42,
              color: e % 2 === 0 ? '#00f3ff' : '#fde047',
              size: 3 + (e % 2) * 2,
            });
          }
        }

        if (launchT < 0.45) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const beaconAlpha =
            (1 - launchT * 2) * (0.45 + Math.sin(shipSeqElapsed * 8) * 0.2);
          ctx.fillStyle = `rgba(0, 243, 255, ${Math.max(0, beaconAlpha)})`;
          ctx.fillRect(padX - 42, groundY - 4, 84, 4);
          ctx.fillRect(padX - 2, groundY - 68, 4, 66);
          ctx.restore();
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        if (launchT > 0.04) {
          const wakeH = 44 + launchT * 140;
          const wakeGrad = ctx.createLinearGradient(
            shuttleX,
            shuttleY + 18,
            shuttleX + 26,
            shuttleY + 18 + wakeH
          );
          wakeGrad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
          wakeGrad.addColorStop(0.3, 'rgba(0, 243, 255, 0.72)');
          wakeGrad.addColorStop(0.7, 'rgba(157, 0, 255, 0.32)');
          wakeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = wakeGrad;
          ctx.beginPath();
          ctx.moveTo(shuttleX - 20, shuttleY + 18);
          ctx.lineTo(shuttleX + 20, shuttleY + 18);
          ctx.lineTo(shuttleX + 34, shuttleY + 18 + wakeH);
          ctx.lineTo(shuttleX - 6, shuttleY + 18 + wakeH);
          ctx.closePath();
          ctx.fill();
        }

        for (const pt of shuttleParticles) {
          ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.fillRect(
            Math.round(pt.x - pt.size / 2),
            Math.round(pt.y - pt.size / 2),
            pt.size,
            pt.size
          );
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        ctx.save();
        ctx.translate(Math.round(shuttleX), Math.round(shuttleY));
        ctx.rotate(shuttleTilt);

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const hullGlow = ctx.createRadialGradient(0, 0, 6, 0, 0, 56);
        hullGlow.addColorStop(0, 'rgba(0, 243, 255, 0.34)');
        hullGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = hullGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const gearDeploy = Math.max(0, 1 - launchT * 3);
        if (gearDeploy > 0.05) {
          ctx.fillStyle = '#64748b';
          ctx.fillRect(
            -26,
            Math.round(14 * gearDeploy),
            5,
            Math.round(9 * gearDeploy)
          );
          ctx.fillRect(
            21,
            Math.round(14 * gearDeploy),
            5,
            Math.round(9 * gearDeploy)
          );
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-30, Math.round(21 * gearDeploy), 12, 3);
          ctx.fillRect(18, Math.round(21 * gearDeploy), 12, 3);
        }

        if (rampOpen > 0.04) {
          const rLen = Math.round(28 * rampOpen);
          ctx.fillStyle = 'rgba(0, 243, 255, 0.25)';
          ctx.beginPath();
          ctx.moveTo(-22, 10);
          ctx.lineTo(-22 - rLen, 23);
          ctx.lineTo(-6 - rLen, 23);
          ctx.lineTo(-8, 10);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(-20 - rLen, 18, rLen + 10, 4);
        }

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-44, 4, 88, 12);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-36, -4, 72, 16);
        ctx.fillRect(-22, -12, 44, 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-32, -4, 64, 4);
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(-34, 4, 68, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-44, 6, 8, 6);
        ctx.fillRect(36, 6, 8, 6);

        ctx.fillStyle = enginesHot ? '#00f3ff' : '#334155';
        ctx.fillRect(-24, 12, 12, 5);
        ctx.fillRect(12, 12, 12, 5);

        const canopySlideY = Math.round(-rampOpen * 10);
        if (pixelBoarded) {
          ctx.fillStyle = avHair;
          ctx.fillRect(-6, -21, 12, 4);
          ctx.fillStyle = avSkin;
          ctx.fillRect(-5, -17, 10, 6);
          ctx.fillStyle = avShirt;
          ctx.fillRect(-6, -11, 12, 4);
        }
        ctx.fillStyle = 'rgba(56, 189, 248, 0.42)';
        ctx.fillRect(-14, -22 + canopySlideY, 28, 11);
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-14, -22 + canopySlideY, 28, 11);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillRect(-10, -20 + canopySlideY, 8, 2);

        ctx.restore();

        if (!pixelBoarded) {
          const startPx = defender.x + defender.w + 12;
          const endPx = padX - 24;
          const curPx = startPx + (endPx - startPx) * walkEase;
          const climbLift = walkT > 0.72 ? ((walkT - 0.72) / 0.28) * 12 : 0;
          const stepBob =
            walkT > 0 && walkT < 1
              ? Math.abs(Math.sin(shipSeqElapsed * 16)) * 3
              : 0;
          const curPy = groundY - climbLift - stepBob;

          ctx.save();
          ctx.translate(Math.round(curPx), Math.round(curPy));

          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = avShirt;
          ctx.globalAlpha = 0.26;
          ctx.fillRect(-10, -28, 20, 28);
          ctx.restore();

          const legStride =
            walkT > 0 && walkT < 1
              ? Math.round(Math.sin(shipSeqElapsed * 16) * 2)
              : 0;
          ctx.fillStyle = avHair;
          ctx.fillRect(-7, -26, 14, 5);
          ctx.fillStyle = avSkin;
          ctx.fillRect(-6, -21, 12, 8);
          ctx.fillStyle = '#05070f';
          ctx.fillRect(1, -19, 2, 2);
          ctx.fillRect(4, -19, 2, 2);
          ctx.fillStyle = avShirt;
          ctx.fillRect(-7, -13, 14, 9);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-7, -6, 14, 2);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-6 + legStride, -4, 5, 4);
          ctx.fillRect(1 - legStride, -4, 5, 4);
          ctx.restore();
        }
      }

      // Proyectiles láser y textos flotantes de puntuación
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const l of lasers) {
        const lx = Math.round(l.x);
        const ly = Math.round(l.y);
        if (l.fromPlayer) {
          ctx.fillStyle = 'rgba(57, 255, 20, 0.35)';
          ctx.fillRect(lx - 2, ly - 1, 8, 15);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(lx, ly, 4, 13);
        } else {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.3)';
          ctx.fillRect(lx - 2, ly - 1, 8, 14);
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(lx, ly, 4, 12);
        }
      }

      for (const sp of sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 0.38);
        ctx.fillStyle = sp.color;
        ctx.fillRect(Math.round(sp.x) - 2, Math.round(sp.y) - 2, 4, 4);
      }

      ctx.font = '700 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      for (const pop of scorePopups) {
        ctx.globalAlpha = Math.max(0, pop.life / pop.maxLife);
        ctx.fillStyle = pop.color;
        ctx.fillText(pop.text, Math.round(pop.x), Math.round(pop.y));
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [waveKey, completeShipReturn]);

  return (
    <div className="w-full max-w-[800px] flex flex-col items-center space-y-3.5 select-none">
      {/* GABINETE ARCADE UPRIGHT ORIGINAL SPACE INVADERS (TAITO / MIDWAY · 1978) */}
      <div
        id="invaders-cabinet"
        className="w-full arcade-cabinet-invaders px-5 sm:px-9 pt-4 pb-6 flex flex-col items-center space-y-3.5"
      >
        {/* Marquesina retroiluminada naranja/roja clásica de 1978 */}
        <div className="w-full invaders-marquee rounded-sm py-2.5 px-4 sm:px-6 flex items-center justify-between gap-2">
          <div className="flex flex-col text-left">
            <span className="text-[10px] tracking-[0.26em] text-orange-200 font-mono-tabular font-bold">
              TAITO · MIDWAY
            </span>
            <span className="text-[9px] tracking-[0.2em] text-amber-300/85 font-mono-tabular">
              UPRIGHT · 1978 · OLEADA {waveNumber}
            </span>
          </div>

          <h2 className="font-display text-xl sm:text-3xl font-extrabold tracking-[0.22em] text-amber-200 drop-shadow-[0_0_12px_rgba(251,146,60,0.85)] text-center">
            SPACE INVADERS
          </h2>

          <div className="text-right font-mono-tabular">
            <span className="block text-[9px] tracking-widest text-orange-200/85">
              META {SPACE_INVADERS_UNLOCK_SCORE} PTS
            </span>
            <span className="text-xs sm:text-sm font-bold text-[#39ff14]">
              {String(score).padStart(4, '0')}
            </span>
          </div>
        </div>

        {/* Bisel ilustrado cósmico/lunar 1978 que rodea el monitor CRT hundido */}
        <div className="relative w-full invaders-moon-artwork rounded-md p-2.5 sm:p-4">
          <div
            aria-hidden="true"
            className="hidden sm:flex items-center justify-between px-2 pb-2 text-[9px] font-mono-tabular tracking-[0.18em] text-orange-200/75 uppercase"
          >
            <span>OVNI ROJO = 100/150 PTS · 30 · 20 · 10 PTS</span>
            <span>DESBLOQUEO HISTÓRICO: {SPACE_INVADERS_UNLOCK_SCORE} PTS</span>
          </div>

          {/* Tubo CRT hundido con reflejo curvo y juego a 640x440 */}
          <div className="relative w-full invaders-crt-bezel overflow-hidden">
            <canvas
              id="invaders-canvas"
              ref={canvasRef}
              width={INV_W}
              height={INV_H}
              className="block w-full h-auto aspect-[16/11] bg-black crisp-arcade-canvas"
            />

            <div
              className="absolute inset-0 crt-glass-reflection pointer-events-none"
              aria-hidden="true"
            />

            {/* Subtítulo cinematográfico durante las Escenas C, D y E (Abordaje y Despegue) */}
            {status === 'won' && victoryPhase === 'ship-departure' && (
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 glass-hud rounded px-3.5 py-2 text-xs font-mono-tabular text-cyan-100">
                <span className="truncate">{departureCaption}</span>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    completeShipReturn();
                  }}
                  className="px-2.5 py-1 rounded border border-[#00f3ff]/50 bg-cyan-950/60 hover:bg-cyan-900/75 text-[10px] font-bold text-[#00f3ff] hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                >
                  Aterrizar en la Isla 70s →
                </button>
              </div>
            )}

            {status === 'lost' && (
              <div className="absolute inset-0 bg-black/86 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <p className="font-mono-tabular text-lg sm:text-2xl font-bold text-white">
                  Sector comprometido ({score} / {SPACE_INVADERS_UNLOCK_SCORE} pts)
                </p>
                <p className="text-xs sm:text-sm text-slate-300 max-w-sm font-ui">
                  Alcanza al menos {SPACE_INVADERS_UNLOCK_SCORE} puntos reales derribando las oleadas alienígenas y el OVNI rojo superior para restaurar la memoria de 1978.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    retroAudio.uiClick();
                    setWaveKey((w) => w + 1);
                  }}
                  className="btn-ui rounded px-6 py-2.5 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                >
                  Reintentar Space Invaders
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panel de control metálico cepillado estilo gabinete 1978 */}
        <div className="w-full invaders-control-deck rounded px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular text-neutral-200">
          <div className="flex items-center gap-2">
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
              className="px-3.5 py-1.5 bg-neutral-950 border border-zinc-500/50 text-slate-100 hover:border-[#39ff14] rounded cursor-pointer whitespace-nowrap shrink-0"
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
              className="px-3.5 py-1.5 bg-neutral-950 border border-zinc-500/50 text-slate-100 hover:border-[#39ff14] rounded cursor-pointer whitespace-nowrap shrink-0"
            >
              D · Der →
            </button>
          </div>

          <span className="hidden md:inline-block text-[10px] text-orange-200/80 tracking-[0.22em]">
            CREDIT 01 · TAITO 1978
          </span>

          <button
            type="button"
            onPointerDown={() => {
              controlsRef.current.fireQueued = true;
              controlsRef.current.fireHeld = true;
            }}
            onPointerUp={() => {
              controlsRef.current.fireHeld = false;
            }}
            onPointerLeave={() => {
              controlsRef.current.fireHeld = false;
            }}
            className="px-5 py-1.5 bg-orange-600/25 border border-orange-400 text-amber-200 hover:bg-orange-500 hover:text-black font-bold rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            ESPACIO · Disparar Láser
          </button>
        </div>
      </div>

      {/* Navegación secundaria inferior */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onBackToMap}
          className="px-4 py-2 text-xs font-mono-tabular text-slate-200 hover:text-white glass-panel rounded transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          Volver a la Gran Isla de los 70
        </button>
        <button
          type="button"
          onClick={onRestartCinematic}
          className="btn-ui rounded px-4 py-2 text-xs font-bold tracking-wider whitespace-nowrap shrink-0"
        >
          Repetir Cinemática Inicial
        </button>
      </div>

      {/* ESCENA B — Ceremonia «Memoria Desbloqueada» con reseña histórica de Space Invaders (1978) */}
      {status === 'won' && victoryPhase === 'ceremony' && (
        <MemoryUnlockedModal
          entry={getHistoricalMemory('space-invaders')}
          continueLabel="Abordar Nave y Regresar a la Isla de los 70"
          alreadyRestoredBefore={alreadyRestoredBefore}
          onContinue={handleCeremonyContinue}
        />
      )}
    </div>
  );
}
