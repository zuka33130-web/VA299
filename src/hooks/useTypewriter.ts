/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook personalizado 'useTypewriter' para desplegar cadenas de texto carácter a carácter
 * de forma fluida y sincronizada con la locución o duración de audio deseada.
 * Incluye un temporizador de respaldo (safety fallback) para evitar bloqueos si el audio o el bucle se retrasa.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseTypewriterOptions {
  text: string;
  durationSec?: number;
  enabled?: boolean;
  targetAudioRatio?: number; // Por defecto 0.82 (completa al 82% del tiempo de voz)
  minDelayMs?: number; // Mínimo delay entre caracteres (ms)
  maxDelayMs?: number; // Máximo delay entre caracteres (ms)
  onComplete?: () => void;
}

export interface UseTypewriterResult {
  displayedText: string;
  typedChars: number;
  isComplete: boolean;
  progressPct: number;
  reset: () => void;
  completeImmediately: () => void;
}

export function useTypewriter({
  text,
  durationSec = 3.0,
  enabled = true,
  targetAudioRatio = 0.82,
  minDelayMs = 16,
  maxDelayMs = 65,
  onComplete,
}: UseTypewriterOptions): UseTypewriterResult {
  const [typedChars, setTypedChars] = useState<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reiniciar cuando cambia la cadena de texto objetivo o el estado enabled
  useEffect(() => {
    setTypedChars(0);
  }, [text, enabled]);

  // Cálculo de delay por carácter para sincronizar el tipeo al ratio objetivo del audio
  const computedDelayMs = useMemo(() => {
    if (!text || text.length === 0) return 30;
    const targetAudioMs = durationSec * 1000 * targetAudioRatio;
    return Math.max(
      minDelayMs,
      Math.min(maxDelayMs, Math.round(targetAudioMs / text.length))
    );
  }, [text, durationSec, targetAudioRatio, minDelayMs, maxDelayMs]);

  // Bucle de temporización con temporizador setTimeout controlado
  useEffect(() => {
    if (!enabled || !text) return;
    if (typedChars >= text.length) {
      if (text.length > 0) {
        onCompleteRef.current?.();
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setTypedChars((prev) => prev + 1);
    }, computedDelayMs);

    return () => window.clearTimeout(timer);
  }, [enabled, typedChars, text, computedDelayMs]);

  // Temporizador de seguridad (safety fallback): Si transcurre el 90% de la duración máxima o 4.0s, fuerza completado
  useEffect(() => {
    if (!enabled || !text || text.length === 0) return;
    const safetyMs = Math.min(4000, Math.max(1200, Math.round(durationSec * 1000 * 0.9)));
    const safetyTimer = window.setTimeout(() => {
      setTypedChars((prev) => (prev < text.length ? text.length : prev));
    }, safetyMs);

    return () => window.clearTimeout(safetyTimer);
  }, [enabled, text, durationSec]);

  const reset = useCallback(() => {
    setTypedChars(0);
  }, []);

  const completeImmediately = useCallback(() => {
    if (text) {
      setTypedChars(text.length);
    }
  }, [text]);

  const displayedText = useMemo(() => {
    if (!text) return '';
    return text.slice(0, typedChars);
  }, [text, typedChars]);

  const isComplete = !text || text.length === 0 ? true : typedChars >= text.length;
  const progressPct = text && text.length > 0 ? Math.min(100, Math.round((typedChars / text.length) * 100)) : 100;

  return {
    displayedText,
    typedChars,
    isComplete,
    progressPct,
    reset,
    completeImmediately,
  };
}
