/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cinemática de apertura de PIXELVERSE.
 *
 * Nueve escenas y 128 segundos: la consola antigua, la garra, la pulsación del
 * Reinicio Cero, SUPER KING KOOPA, la onda que borra la memoria de los
 * videojuegos, el planeta y la fecha, el océano, la isla y la ventana
 * encendida. El lienzo se ocupa de la imagen y de la cámara; esta capa React
 * sólo añade subtítulos, la fecha y los controles discretos.
 *
 * El primer acto (0–94 s) termina en el menú. El segundo (94–128 s) se lanza
 * después de crear la identidad y se funde a negro para que la escena de la
 * cabaña que ya existe en Isla Natal tome el relevo sin recrearla.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { bgmEngine } from '../audio/bgmEngine';
import { retroAudio } from '../audio/retroAudio';
import { cinematicRebootAudio } from './cinematicRebootAudio';
import {
  cinematicRebootNarrator,
  getActiveRebootBeatAtTime,
  TOTAL_CINEMATIC_DURATION_SEC,
} from './cinematicRebootNarrator';
import { createCinematicRebootWorld } from './cinematicRebootWorld';

const DATE_TEXT = '23 DE OCTUBRE DE 2026';
const DATE_VISIBLE_START_SEC = 84.35;
const DATE_VISIBLE_END_SEC = 92.55;
const DATE_TYPE_START_SEC = 84.6;
const DATE_TYPE_INTERVAL_SEC = 0.17;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function ramp01(value: number): number {
  const c = clamp01(value);
  return c * c * (3 - 2 * c);
}

export interface EpicCinematicStageProps {
  runKey: number;
  onComplete: () => void;
  /** Segundo del metraje en el que arranca esta reproducción. */
  startAtSec?: number;
  /** Segundo del metraje en el que termina esta reproducción. */
  endAtSec?: number;
}

export function EpicCinematicStage({
  runKey,
  onComplete,
  startAtSec = 0,
  endAtSec = TOTAL_CINEMATIC_DURATION_SEC,
}: EpicCinematicStageProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const segmentStartRef = useRef(startAtSec);
  const segmentEndRef = useRef(endAtSec);
  segmentStartRef.current = startAtSec;
  segmentEndRef.current = Math.min(
    TOTAL_CINEMATIC_DURATION_SEC,
    Math.max(startAtSec + 1, endAtSec)
  );

  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(() => bgmEngine.isMuted());
  const [uiTimeSec, setUiTimeSec] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [dateForcedComplete, setDateForcedComplete] = useState(false);
  const dateForcedCompleteRef = useRef(false);
  const lastTypedRef = useRef(0);

  const playbackRef = useRef({
    elapsedSec: 0,
    paused: false,
    finished: false,
    lastUiSyncSec: -1,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const unsub = bgmEngine.subscribe((muted) => {
      setIsMuted(muted);
      if (muted) {
        cinematicRebootAudio.stopAll();
        cinematicRebootNarrator.stopCurrent();
      }
    });
    return unsub;
  }, []);

  const finishCinematic = useCallback(() => {
    if (playbackRef.current.finished) return;
    playbackRef.current.finished = true;
    cinematicRebootAudio.stopAll();
    cinematicRebootNarrator.stopCurrent();
    bgmEngine.setDuckFactor(1);
    onCompleteRef.current();
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      playbackRef.current.paused = next;
      if (next) {
        cinematicRebootAudio.stopAll();
        cinematicRebootNarrator.stopCurrent();
      } else {
        cinematicRebootAudio.resetTimeline(playbackRef.current.elapsedSec);
        cinematicRebootNarrator.resetTimeline(playbackRef.current.elapsedSec);
      }
      return next;
    });
  }, []);

  // Inicio o repetición del metraje.
  useEffect(() => {
    bgmEngine.setDuckFactor(0);

    const segmentStart = Math.max(
      0,
      Math.min(TOTAL_CINEMATIC_DURATION_SEC - 0.05, segmentStartRef.current)
    );
    const seekTo = segmentStart;

    playbackRef.current = {
      elapsedSec: seekTo,
      paused: false,
      finished: false,
      lastUiSyncSec: -1,
    };
    setIsPaused(false);
    setUiTimeSec(seekTo);
    setDateForcedComplete(false);
    dateForcedCompleteRef.current = false;
    lastTypedRef.current = 0;

    cinematicRebootAudio.resetTimeline(seekTo);
    cinematicRebootNarrator.resetTimeline(seekTo);
    cinematicRebootNarrator.preload();

    const unlockAudio = () => {
      retroAudio.unlock();
      cinematicRebootAudio.unlock();
    };
    unlockAudio();

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      cinematicRebootAudio.stopAll();
      cinematicRebootNarrator.stopCurrent();
      bgmEngine.setDuckFactor(1);
    };
  }, [runKey]);

  // Lienzo y cámara.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const world = createCinematicRebootWorld(mount, reducedMotion);
    let frameId = 0;
    let disposed = false;
    let lastNow = performance.now();

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDelta = Math.max(0.001, Math.min(0.25, (now - lastNow) / 1000));
      lastNow = now;

      const pb = playbackRef.current;
      if (!pb.paused && !pb.finished) {
        pb.elapsedSec += rawDelta;
        cinematicRebootAudio.syncTimeline(pb.elapsedSec, false);
        cinematicRebootNarrator.syncTimeline(pb.elapsedSec, false);

        if (Math.abs(pb.elapsedSec - pb.lastUiSyncSec) >= 0.08) {
          pb.lastUiSyncSec = pb.elapsedSec;
          setUiTimeSec(pb.elapsedSec);
        }

        if (pb.elapsedSec >= segmentEndRef.current) {
          world.renderAtTime(segmentEndRef.current, rawDelta);
          finishCinematic();
          return;
        }
      }

      world.renderAtTime(pb.elapsedSec, rawDelta);
      frameId = requestAnimationFrame(tick);
    }

    lastNow = performance.now();
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      world.dispose();
    };
  }, [finishCinematic, reducedMotion]);

  // Espacio: durante la fecha completa la escritura y luego avanza.
  // En el resto del metraje pausa; Escape omite.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finishCinematic();
        return;
      }
      if (event.key !== ' ') return;
      event.preventDefault();

      const time = playbackRef.current.elapsedSec;
      if (time >= DATE_VISIBLE_START_SEC && time <= DATE_VISIBLE_END_SEC) {
        const typed = dateForcedCompleteRef.current
          ? DATE_TEXT.length
          : Math.min(
              DATE_TEXT.length,
              Math.max(
                0,
                Math.floor((time - DATE_TYPE_START_SEC) / DATE_TYPE_INTERVAL_SEC) + 1
              )
            );
        if (typed < DATE_TEXT.length) {
          dateForcedCompleteRef.current = true;
          setDateForcedComplete(true);
        } else {
          finishCinematic();
        }
        return;
      }

      handleTogglePause();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finishCinematic, handleTogglePause]);

  const activeBeat = getActiveRebootBeatAtTime(uiTimeSec);
  const words = useMemo(
    () => (activeBeat ? activeBeat.subtitle.split(' ') : []),
    [activeBeat]
  );

  let revealedWords = words.length;
  if (activeBeat && words.length > 0) {
    const span = Math.max(0.6, activeBeat.endSec - activeBeat.startSec);
    const progress = ramp01((uiTimeSec - activeBeat.startSec) / (span * 0.78));
    revealedWords = Math.max(1, Math.ceil(progress * words.length));
  }

  const dateVisible =
    uiTimeSec >= DATE_VISIBLE_START_SEC && uiTimeSec <= DATE_VISIBLE_END_SEC;
  const dateOpacity = Math.min(
    ramp01((uiTimeSec - DATE_VISIBLE_START_SEC) / 0.55),
    1 - ramp01((uiTimeSec - 90.9) / 1.5)
  );
  const typedCount = Math.min(
    DATE_TEXT.length,
    dateForcedComplete
      ? DATE_TEXT.length
      : Math.max(
          0,
          Math.floor((uiTimeSec - DATE_TYPE_START_SEC) / DATE_TYPE_INTERVAL_SEC) + 1
        )
  );
  const typedDate = DATE_TEXT.slice(0, Math.max(0, typedCount));
  const flashOpacity =
    uiTimeSec >= 81.34 && uiTimeSec <= 82.28
      ? 1 - ramp01((uiTimeSec - 81.42) / 0.82)
      : 0;

  // Cada letra de la fecha tiene su pequeño chasquido.
  useEffect(() => {
    const previous = lastTypedRef.current;
    if (
      uiTimeSec >= DATE_VISIBLE_START_SEC &&
      typedCount > previous &&
      typedCount - previous <= 2 &&
      !isPaused
    ) {
      cinematicRebootAudio.typeTick();
    }
    lastTypedRef.current = typedCount;
  }, [isPaused, typedCount, uiTimeSec]);

  return (
    <div className="cr-stage select-none" role="region" aria-label="Cinemática de apertura de PIXELVERSE">
      <div ref={mountRef} className="cr-canvas-mount" />
      <div className="cr-atmosphere" aria-hidden="true" />

      {flashOpacity > 0.001 && (
        <div
          className="cr-flash"
          aria-hidden="true"
          style={{ opacity: flashOpacity }}
        />
      )}

      {dateVisible && dateOpacity > 0.01 && (
        <div
          className="cr-date"
          style={{ opacity: dateOpacity }}
          aria-label="23 de octubre de 2026"
        >
          <span className="cr-date__eyebrow">REGISTRO DEL REINICIO CERO</span>
          <span className="cr-date__value" data-text={typedDate}>
            {typedDate}
            {typedCount < DATE_TEXT.length && (
              <span className="cr-date__caret" aria-hidden="true" />
            )}
          </span>
          <span className="cr-date__rule" aria-hidden="true" />
        </div>
      )}

      {activeBeat && dateOpacity < 0.15 && (
        <div
          className={`cr-subtitle${
            activeBeat.tone === 'villain' ? ' cr-subtitle--villain' : ''
          }`}
          aria-live="polite"
        >
          <p className="cr-subtitle__text">
            {words.map((word, index) => (
              <span
                key={`${activeBeat.id}-${index}`}
                className={`cr-word ${index < revealedWords ? 'is-on' : ''}`}
              >
                {word}
                {index < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="cr-controls">
        <button
          type="button"
          onClick={handleTogglePause}
          aria-label="Pausar cinemática"
          title="Pausar (Espacio)"
          className="cr-icon-btn"
        >
          <Pause />
        </button>
        <button
          type="button"
          onClick={() => bgmEngine.toggleMute()}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
          className="cr-icon-btn"
        >
          {isMuted ? <VolumeX /> : <Volume2 />}
        </button>
        <button
          type="button"
          onClick={finishCinematic}
          className="cr-skip"
          title="Omitir cinemática (Esc)"
        >
          <SkipForward />
          <span>Omitir</span>
        </button>
      </div>

      {isPaused && (
        <button
          type="button"
          onClick={handleTogglePause}
          className="cr-pause"
        >
          <span className="cr-pause__badge">
            <Play />
            <span>PAUSA</span>
          </span>
          <span className="cr-pause__hint">Espacio o clic para continuar</span>
        </button>
      )}
    </div>
  );
}
