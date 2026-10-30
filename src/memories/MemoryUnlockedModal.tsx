/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ceremonia cinematográfica e histórica universal «MEMORIA DESBLOQUEADA».
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { HistoricalMemoryEntry } from './historicalCatalog';
import { bgmEngine } from '../audio/bgmEngine';
import { retroAudio } from '../audio/retroAudio';

function playRestorationHarmonicOnce(): void {
  if (typeof window === 'undefined' || bgmEngine.isMuted()) return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const freqs = [392.0, 523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx < 2 ? 'triangle' : 'sine';
      const start = now + idx * 0.095;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.055, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.68);
    });
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1400);
  } catch {
    // Silencioso si el navegador bloquea Web Audio
  }
}

export function MemoryUnlockedModal({
  entry,
  continueLabel,
  onContinue,
  alreadyRestoredBefore = false,
}: {
  entry: HistoricalMemoryEntry;
  continueLabel: string;
  onContinue: () => void;
  alreadyRestoredBefore?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const continuedRef = useRef<boolean>(false);
  const soundPlayedRef = useRef<boolean>(false);
  const [ceremonyReady, setCeremonyReady] = useState<boolean>(false);

  const handleConfirmContinue = useCallback(() => {
    if (continuedRef.current) return;
    continuedRef.current = true;
    retroAudio.uiClick();
    onContinue();
  }, [onContinue]);

  useEffect(() => {
    if (!soundPlayedRef.current) {
      soundPlayedRef.current = true;
      playRestorationHarmonicOnce();
    }
    const readyTimer = window.setTimeout(() => {
      setCeremonyReady(true);
    }, 1500);
    return () => window.clearTimeout(readyTimer);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!ceremonyReady) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ceremonyReady, handleConfirmContinue]);

  // Animación específica de reconstrucción digital e integración en línea temporal
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H * 0.48;

    const fragments = Array.from({ length: 24 }, (_, i) => {
      const ang = (i / 24) * Math.PI * 2;
      const dist = 95 + (i % 4) * 32;
      return {
        sx: cx + Math.cos(ang) * dist * 1.45,
        sy: cy + Math.sin(ang) * dist * 0.62,
        size: 4 + (i % 3) * 2,
        delay: (i % 6) * 0.08,
        isSecondary: i % 3 === 0,
      };
    });

    let rafId = 0;
    const startT = performance.now();

    const render = (now: number) => {
      const elapsed = (now - startT) / 1000;
      const convergeT = Math.min(1, elapsed / 2.1);
      const pulseT = Math.min(1, Math.max(0, (elapsed - 1.55) / 1.4));

      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = false;
      ctx.shadowBlur = 0;

      // Fondo profundo de cámara de restauración
      const bg = ctx.createRadialGradient(cx, cy, 8, cx, cy, W * 0.56);
      bg.addColorStop(0, '#071629');
      bg.addColorStop(0.65, '#030814');
      bg.addColorStop(1, '#010308');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Interferencias iniciales que desaparecen conforme se estabiliza el recuerdo
      const glitchFade = Math.max(0, 1 - convergeT * 1.35);
      if (glitchFade > 0.02) {
        ctx.fillStyle = `rgba(0, 243, 255, ${0.16 * glitchFade})`;
        for (let g = 0; g < 3; g++) {
          const gy = ((elapsed * 90 + g * 37) % H);
          ctx.fillRect(24, gy, W - 48, 2);
        }
      }

      // Líneas de energía conectando fragmentos hacia el núcleo
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < fragments.length; i++) {
        const f = fragments[i];
        const localT = Math.min(1, Math.max(0, (elapsed - f.delay) / 1.75));
        const ease = 1 - Math.pow(1 - localT, 3);
        const fx = f.sx + (cx - f.sx) * ease;
        const fy = f.sy + (cy - f.sy) * ease;

        if (localT < 0.98) {
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(fx, fy);
          ctx.lineTo(cx, cy);
          ctx.stroke();

          ctx.fillStyle = f.isSecondary
            ? entry.visualIdentity.secondaryHex
            : entry.visualIdentity.accentHex;
          ctx.fillRect(
            Math.round(fx - f.size / 2),
            Math.round(fy - f.size / 2),
            f.size,
            f.size
          );
        }
      }

      // Motivos específicos del videojuego orbitando y estabilizándose
      const motif = entry.visualIdentity.motif;
      if (motif === 'pong') {
        // Dos paletas geométricas blancas, red central y pelota luminosa
        const padAlpha = Math.min(1, elapsed / 1.2);
        ctx.globalAlpha = padAlpha * 0.9;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 118, cy - 16, 5, 32);
        ctx.fillRect(cx + 113, cy - 16, 5, 32);
        for (let ny = cy - 24; ny <= cy + 20; ny += 10) {
          ctx.fillRect(cx - 88, ny, 2, 5);
          ctx.fillRect(cx + 86, ny, 2, 5);
        }
        const ballOrbitX = cx + Math.cos(elapsed * 2.8) * (96 * (1 - convergeT * 0.35));
        const ballOrbitY = cy + Math.sin(elapsed * 2.8) * 18;
        ctx.fillStyle = '#00f3ff';
        ctx.fillRect(Math.round(ballOrbitX - 4), Math.round(ballOrbitY - 4), 8, 8);
      } else if (motif === 'breakout') {
        // Muro cromático de 4 bandas (rojo, naranja, verde, amarillo) + paleta cian y esfera
        const rowColors = ['#ef4444', '#f97316', '#22c55e', '#facc15'];
        ctx.globalAlpha = Math.min(1, elapsed / 1.1) * 0.92;
        for (const side of [-112, 76]) {
          rowColors.forEach((col, rIdx) => {
            ctx.fillStyle = col;
            for (let c = 0; c < 3; c++) {
              ctx.fillRect(cx + side + c * 13, cy - 22 + rIdx * 6, 11, 4);
            }
          });
        }
        ctx.fillStyle = '#22d3ee';
        const padX = cx + Math.sin(elapsed * 2.6) * 58;
        ctx.fillRect(Math.round(padX - 18), cy + 18, 36, 4);
        ctx.fillStyle = '#ffffff';
        const bx = cx + Math.cos(elapsed * 3.4) * 74;
        const by = cy + Math.sin(elapsed * 5.1) * 14;
        ctx.fillRect(Math.round(bx - 3), Math.round(by - 3), 6, 6);
      } else if (motif === 'space-invaders') {
        // Estrellas e iconos pixelados de invasores y escudos de 1978
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = '#39ff14';
        for (const side of [-108, 108]) {
          const bob = Math.round(Math.sin(elapsed * 4 + side) * 3);
          const ix = cx + side - 11;
          const iy = cy - 8 + bob;
          // Silueta pixel-art compacta de invasor + escudo inferior
          ctx.fillRect(ix + 4, iy, 14, 3);
          ctx.fillRect(ix + 2, iy + 3, 18, 6);
          ctx.fillRect(ix, iy + 9, 4, 4);
          ctx.fillRect(ix + 18, iy + 9, 4, 4);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(ix + 6, iy + 5, 3, 2);
          ctx.fillRect(ix + 13, iy + 5, 3, 2);
          ctx.fillStyle = '#39ff14';
        }
      } else if (motif === 'donkey-kong') {
        // Vigas inclinadas y 3 Diamantes de Memoria restaurados
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = '#fb7185';
        ctx.fillRect(cx - 128, cy + 12, 48, 4);
        ctx.fillRect(cx + 80, cy + 12, 48, 4);
        const dColors = ['#00f3ff', '#fde047', '#d946ef'];
        dColors.forEach((col, idx) => {
          const dx = cx + (idx - 1) * 92;
          const dy = cy - 10 + Math.sin(elapsed * 3.5 + idx) * 3;
          if (idx !== 1) {
            ctx.fillStyle = col;
            ctx.fillRect(Math.round(dx - 5), Math.round(dy - 5), 10, 10);
          }
        });
      }
      ctx.globalAlpha = 1;

      // Pulso limpio de luz al completarse la convergencia
      if (pulseT > 0 && pulseT < 1) {
        const ringR = 16 + pulseT * 92;
        ctx.strokeStyle = `rgba(0, 243, 255, ${(1 - pulseT) * 0.78})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Símbolo central de Memoria Restaurada de PIXELVERSE (Cristal Octogonal Pixel-Art)
      const crestScale = 0.55 + Math.min(1, elapsed / 1.65) * 0.45;
      const halo = ctx.createRadialGradient(cx, cy, 2, cx, cy, 46 * crestScale);
      halo.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
      halo.addColorStop(0.35, 'rgba(0, 243, 255, 0.55)');
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, 46 * crestScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Cristal pixel-art nítido en el centro
      ctx.save();
      ctx.translate(cx, cy);
      const s = Math.max(2, Math.round(3 * crestScale));
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(-3 * s, -7 * s, 6 * s, 14 * s);
      ctx.fillRect(-5 * s, -5 * s, 10 * s, 10 * s);
      ctx.fillRect(-7 * s, -2 * s, 14 * s, 4 * s);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-2 * s, -4 * s, 4 * s, 8 * s);
      ctx.fillRect(-4 * s, -1 * s, 8 * s, 2 * s);
      ctx.restore();

      // Línea temporal inferior de PIXELVERSE integrando el recuerdo
      const lineY = H - 15;
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.32)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(74, lineY);
      ctx.lineTo(W - 74, lineY);
      ctx.stroke();

      const milestones = [
        { yr: '1972', x: W * 0.2, active: entry.year === 1972 },
        { yr: '1976', x: W * 0.4, active: entry.year === 1976 },
        { yr: '1978', x: W * 0.6, active: entry.year === 1978 },
        { yr: '1981', x: W * 0.8, active: entry.year === 1981 },
      ];
      milestones.forEach((m) => {
        ctx.fillStyle = m.active ? '#00f3ff' : '#334155';
        ctx.fillRect(Math.round(m.x - 4), lineY - 4, 8, 8);
        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = m.active ? '#ffffff' : '#64748b';
        ctx.fillText(m.yr, m.x, lineY - 7);
      });

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [entry]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="memory-unlocked-title"
      className="fixed inset-0 z-50 bg-[#02040c]/88 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none"
    >
      <div className="w-full max-w-2xl glass-panel rounded-xl border border-[#00f3ff]/65 shadow-[0_0_55px_rgba(0,243,255,0.22)] overflow-hidden my-auto">
        {/* Cabecera animada de reconstrucción de memoria */}
        <div className="relative border-b border-[#00f3ff]/25 bg-[#020612]">
          <canvas
            ref={canvasRef}
            width={560}
            height={116}
            className="block w-full h-[108px] sm:h-[116px] crisp-arcade-canvas"
          />
          <div className="absolute top-2.5 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#041122]/90 border border-[#00f3ff]/40 text-[10px] font-mono-tabular text-[#00f3ff]">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>{entry.visualIdentity.timelineBadge}</span>
          </div>
        </div>

        {/* Contenido documental y ceremonia */}
        <div className="p-5 sm:px-7 sm:py-6 space-y-4 text-left">
          <div className="text-center space-y-1">
            <p className="text-[11px] font-mono-tabular tracking-[0.28em] text-[#00f3ff] uppercase">
              {alreadyRestoredBefore
                ? 'ARCHIVO HISTÓRICO PRESERVADO'
                : 'ARCHIVO TEMPORAL DE PIXELVERSE'}
            </p>
            <h2
              id="memory-unlocked-title"
              className="font-display text-2xl sm:text-4xl font-bold tracking-[0.14em] text-white drop-shadow-[0_0_16px_rgba(0,243,255,0.55)]"
            >
              MEMORIA DESBLOQUEADA
            </h2>
            <p className="text-xs sm:text-sm font-mono-tabular text-cyan-200">
              «Este juego ha sido restaurado para la humanidad».
            </p>
          </div>

          {/* Ficha histórica del videojuego con tipografía editorial limpia */}
          <div className="border-t border-b border-white/12 py-4 space-y-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-base sm:text-lg font-bold tracking-wide text-[#fde047]">
                {entry.headline}
              </h3>
              <span className="font-mono-tabular text-xs font-semibold text-[#00f3ff]">
                Año {entry.year} · {entry.visualIdentity.timelineBadge}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 font-ui">
              <span>
                <strong className="text-slate-100 font-semibold">Autoría:</strong> {entry.creator}
              </span>
              <span aria-hidden="true" className="text-slate-500">·</span>
              <span>
                <strong className="text-slate-100 font-semibold">Compañía:</strong> {entry.company}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 font-ui leading-relaxed">
              {entry.review}
            </p>

            <div className="rounded-lg bg-cyan-950/30 border border-[#00f3ff]/25 px-4 py-3 space-y-1">
              <p className="text-[11px] font-mono-tabular text-[#00f3ff]">
                Dato histórico documentado
              </p>
              <p className="text-xs text-slate-200 font-ui leading-relaxed">
                {entry.funFact}
              </p>
            </div>

            <div className="flex items-start gap-2 pt-0.5 text-xs text-emerald-300 font-mono-tabular">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{entry.restorationMessage}</span>
            </div>
          </div>

          {/* Acción clara para continuar */}
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] font-mono-tabular text-slate-400">
              {ceremonyReady
                ? 'Memoria sincronizada · Puedes continuar cuando termines de leer'
                : 'Reconstruyendo fragmentos en la línea temporal...'}
            </span>

            <button
              id="btn-memory-continue"
              type="button"
              onClick={handleConfirmContinue}
              className="btn-ui rounded-md px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wider inline-flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{continueLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
