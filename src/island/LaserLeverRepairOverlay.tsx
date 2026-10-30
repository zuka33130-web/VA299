/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MINIJUEGO DE REPARACIÓN · PALANCA DEL LÁSER DE SEGURIDAD
 * Pixel identifica los contactos fríos de la consola y los suelda con el
 * soldador de estaño de Dylan. No es decorativo: sin cerrar las tres uniones
 * dañadas la palanca no puede enviar la orden de apagado.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircuitBoard, Flame, ShieldAlert, X, Zap } from 'lucide-react';
import { retroAudio } from '../audio/retroAudio';

interface ContactSpec {
  id: number;
  damaged: boolean;
  x: number;
  y: number;
  label: string;
}

const CONTACTS: ContactSpec[] = [
  { id: 0, damaged: false, x: 16, y: 30, label: 'C1' },
  { id: 1, damaged: true, x: 38, y: 18, label: 'C2' },
  { id: 2, damaged: false, x: 62, y: 32, label: 'C3' },
  { id: 3, damaged: true, x: 24, y: 68, label: 'C4' },
  { id: 4, damaged: false, x: 52, y: 72, label: 'C5' },
  { id: 5, damaged: true, x: 80, y: 56, label: 'C6' },
];

const DAMAGED_TOTAL = CONTACTS.filter((c) => c.damaged).length;

export interface LaserLeverRepairOverlayProps {
  onClose: () => void;
  onComplete: () => void;
}

export const LaserLeverRepairOverlay: React.FC<LaserLeverRepairOverlayProps> = ({
  onClose,
  onComplete,
}) => {
  const [soldered, setSoldered] = useState<boolean[]>(() => CONTACTS.map(() => false));
  const [soldering, setSoldering] = useState<number | null>(null);
  const [message, setMessage] = useState('Elegí un contacto y aplicá estaño sólo si la unión está resquebrajada.');
  const [mistakes, setMistakes] = useState(0);
  const [finished, setFinished] = useState(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) window.clearTimeout(id);
      timersRef.current = [];
    };
  }, []);

  const solderCount = soldered.filter(Boolean).length;

  const handleContact = (contact: ContactSpec) => {
    if (finished || soldering !== null) return;
    if (soldered[contact.id]) {
      setMessage(`${contact.label} ya tiene una unión limpia.`);
      return;
    }

    if (!contact.damaged) {
      setMistakes((m) => m + 1);
      setMessage(
        `${contact.label}: el estaño está sano. Calentar una pista buena puede levantar el cobre.`
      );
      retroAudio.npcBlip(0.62);
      return;
    }

    setSoldering(contact.id);
    setMessage(`${contact.label}: calentando la unión fría…`);
    retroAudio.laserShoot();
    const timer = window.setTimeout(() => {
      setSoldered((prev) => {
        const next = [...prev];
        next[contact.id] = true;
        const total = next.filter(Boolean).length;
        if (total >= DAMAGED_TOTAL) {
          setFinished(true);
          setMessage('Continuidad restablecida. La palanca ya puede enviar la orden de apagado.');
          retroAudio.questComplete();
        } else {
          setMessage(`${contact.label}: unión cerrada. Quedan ${DAMAGED_TOTAL - total} contactos fríos.`);
          retroAudio.collectDiamond(total + 1);
        }
        return next;
      });
      setSoldering(null);
    }, 620);
    timersRef.current.push(timer);
  };

  return (
    <div className="dialogue-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-5">
      <div className="dialogue-frame dialogue-wood w-full max-w-2xl max-h-[94vh] overflow-y-auto p-4 sm:p-6 space-y-3">
        <div className="flex items-start justify-between gap-3 border-b-2 border-dashed border-white/30 pb-2.5">
          <div>
            <p className="dialogue-kicker text-[10px] font-mono tracking-widest uppercase">
              SECTOR 03 · MANTENIMIENTO ELECTRÓNICO
            </p>
            <h3 className="dialogue-speaker font-mono text-base sm:text-lg font-bold mt-0.5">
              Consola de la Palanca de Seguridad
            </h3>
            <p className="text-[11px] font-mono text-[#7dd3fc] mt-1">
              {finished ? 'CONTINUIDAD RESTABLECIDA' : 'Identificá y soldá los contactos fríos'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              retroAudio.uiClick();
              onClose();
            }}
            aria-label="Cerrar reparación"
            className="text-white hover:text-amber-300 cursor-pointer p-1 font-mono font-bold"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-amber-100">
          <span className="flex items-center gap-1">
            <CircuitBoard className="h-3.5 w-3.5 text-emerald-300" /> CONTACTOS{' '}
            {solderCount}/{DAMAGED_TOTAL}
          </span>
          <span className="flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-orange-300" /> ESTAÑO{' '}
            {Math.max(0, DAMAGED_TOTAL - solderCount)}/{DAMAGED_TOTAL}
          </span>
          <span className="flex items-center gap-1 text-rose-200/80">
            <ShieldAlert className="h-3.5 w-3.5" /> ERRORES {mistakes}
          </span>
        </div>

        <div
          className="relative mx-auto w-full overflow-hidden rounded-md border-2 border-[#0b3b2e] bg-[#062a20] shadow-[inset_0_0_40px_rgba(0,0,0,0.65)]"
          style={{ aspectRatio: '16 / 10' }}
        >
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(74,222,128,0.16) 1px, transparent 1px), linear-gradient(0deg, rgba(74,222,128,0.12) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
            }}
          />
          <div className="absolute inset-3 rounded border border-emerald-300/25" />

          {/* Trazas principales de la placa */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 62" preserveAspectRatio="none" aria-hidden>
            <g stroke="#0f766e" strokeWidth="0.7" fill="none" opacity="0.85">
              <path d="M16 19 L16 30 L38 18 L62 32 L80 56" />
              <path d="M24 68 L52 72 L80 56" />
              <path d="M5 8 L30 8 L38 18" />
              <path d="M62 32 L70 10 L95 10" />
              <path d="M24 68 L10 54 L8 40" />
            </g>
            <g stroke="#34d399" strokeWidth="0.35" fill="none" opacity="0.55">
              <path d="M16 30 L24 68" />
              <path d="M38 18 L52 72" />
              <path d="M80 56 L95 30" />
            </g>
          </svg>

          {/* Chips y componentes decorativos */}
          <div className="absolute left-[42%] top-[42%] h-[13%] w-[17%] rounded-sm border border-emerald-300/30 bg-[#0a1f18] shadow-[0_0_10px_rgba(16,185,129,0.18)]">
            <div className="absolute inset-x-1 top-1/2 h-px -translate-y-1/2 bg-emerald-300/25" />
            <span className="absolute left-1 top-0.5 font-mono text-[6px] text-emerald-200/50">U-03</span>
          </div>
          <div className="absolute left-[8%] top-[10%] h-[8%] w-[9%] rounded-sm border border-emerald-300/25 bg-[#0a1f18]" />
          <div className="absolute right-[10%] bottom-[12%] h-[7%] w-[12%] rounded-sm border border-emerald-300/25 bg-[#0a1f18]" />

          {CONTACTS.map((contact) => {
            const done = soldered[contact.id];
            const isHot = soldering === contact.id;
            const bad = contact.damaged;
            return (
              <button
                key={contact.id}
                type="button"
                onClick={() => handleContact(contact)}
                disabled={finished}
                aria-label={`Contacto ${contact.label}${bad ? ' dañado' : ' sano'}`}
                className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer disabled:cursor-default"
                style={{ left: `${contact.x}%`, top: `${contact.y}%` }}
              >
                <span
                  className={`relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 transition-all ${
                    done
                      ? 'border-emerald-200 bg-emerald-400/25 shadow-[0_0_18px_rgba(52,211,153,0.7)]'
                      : isHot
                        ? 'border-orange-200 bg-orange-400/30 shadow-[0_0_22px_rgba(251,146,60,0.85)]'
                        : bad
                          ? 'border-rose-300/60 bg-[#1c1212] shadow-[0_0_10px_rgba(239,68,68,0.25)]'
                          : 'border-amber-200/70 bg-[#3a2a14] shadow-[0_0_8px_rgba(253,230,138,0.2)]'
                  }`}
                >
                  <span
                    className={`h-3.5 w-3.5 rounded-full sm:h-4 sm:w-4 ${
                      done
                        ? 'bg-emerald-100'
                        : isHot
                          ? 'animate-pulse bg-orange-100'
                          : bad
                            ? 'bg-[#5b2a2a]'
                            : 'bg-[#e8c878]'
                    }`}
                  />
                  {bad && !done && !isHot && (
                    <span className="absolute -right-1 -top-1 font-mono text-[8px] text-rose-300">!</span>
                  )}
                  {done && <CheckCircle2 className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-emerald-200" />}
                </span>
                <span className="mt-1 block text-center font-mono text-[8px] tracking-wider text-amber-100/70">
                  {contact.label}
                </span>
              </button>
            );
          })}

          {finished && (
            <div className="absolute inset-x-4 bottom-4 flex items-center justify-center gap-2 rounded border border-emerald-200/60 bg-[#04120c]/90 px-3 py-2 font-mono text-[10px] text-emerald-100">
              <Zap className="h-4 w-4 text-emerald-300" />
              TRES UNIONES FRÍAS CERRADAS · PALANCA OPERATIVA
            </div>
          )}
        </div>

        <p className="min-h-[32px] border-l-2 border-amber-300/60 pl-2 font-mono text-[11px] text-amber-100/90">
          {message}
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {finished ? (
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                onComplete();
              }}
              className="dialogue-action px-4 py-1.5 font-mono font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Volver a la consola
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                retroAudio.uiClick();
                onClose();
              }}
              className="border border-white/30 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-amber-100 hover:bg-white/10"
            >
              Salir y revisar luego
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LaserLeverRepairOverlay;
