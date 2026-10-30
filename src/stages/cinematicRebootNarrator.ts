/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Guion, subtítulos y voces de la cinemática de apertura de PIXELVERSE.
 *
 * Nueve escenas, 128 segundos:
 *   01  00:00–18:00  La consola antigua y la garra
 *   02  00:18–24:00  La pulsación del Reinicio Cero
 *   03  00:24–53.2   SUPER KING KOOPA revela su plan
 *   04  53.2–78:00   La onda borra la memoria de los videojuegos
 *   05  78–94 s      El planeta, el destello y la fecha
 *   06  94–108 s     El océano y la isla lejana
 *   07  108–122 s    Vuelo hacia la casa y la ventana
 *   08  122–128 s    Transición a la escena existente
 *   09  escena jugable que ya existe (radio, temblor, viajero)
 *
 * El primer acto (0–94 s) se reproduce al abrir el juego y desemboca en el
 * menú. El segundo acto (94–128 s) se reproduce después de crear la identidad
 * y entrega la cabaña real de Isla Natal, sin recrear a Pixel.
 */

import { bgmEngine } from '../audio/bgmEngine';

export const TOTAL_CINEMATIC_DURATION_SEC = 128.0;
/** Punto de corte entre la catástrofe y el descenso a la isla. */
export const CINEMATIC_ACT_ONE_END_SEC = 94.0;

export type CinematicVoiceTone = 'villain' | 'narrator';

export interface CinematicRebootBeat {
  id: string;
  startSec: number;
  endSec: number;
  subtitle: string;
  speechText: string;
  tone: CinematicVoiceTone;
  rate?: number;
  pitch?: number;
}

export const CINEMATIC_REBOOT_BEATS: CinematicRebootBeat[] = [
  {
    id: 'koopa-1',
    startSec: 31.6,
    endSec: 39.2,
    subtitle:
      '¡Al fin obtendré mi venganza y podré salir del bucle infinito de la derrota junto con mis secuaces!',
    speechText:
      '¡Al fin obtendré mi venganza y podré salir del bucle infinito de la derrota junto con mis secuaces!',
    tone: 'villain',
    rate: 0.84,
    pitch: 0.12,
  },
  {
    id: 'koopa-2',
    startSec: 40.4,
    endSec: 47.6,
    subtitle:
      '¡Ya nadie me podrá vencer! Si los juegos dejan de existir, ¡no habrá nadie que me detenga!',
    speechText:
      '¡Ya nadie me podrá vencer! Si los juegos dejan de existir, ¡no habrá nadie que me detenga!',
    tone: 'villain',
    rate: 0.8,
    pitch: 0.1,
  },
  {
    id: 'koopa-3',
    startSec: 49.2,
    endSec: 52.6,
    subtitle: '¡Ja, ja, ja, ja!',
    speechText: '¡Ja, ja, ja, ja!',
    tone: 'villain',
    rate: 0.72,
    pitch: 0.08,
  },
  {
    id: 'island',
    startSec: 96.2,
    endSec: 104.6,
    subtitle: 'Mientras tanto, en una isla muy lejana, apartada de todo…',
    speechText: 'Mientras tanto, en una isla muy lejana, apartada de todo…',
    tone: 'narrator',
    rate: 0.86,
    pitch: 0.82,
  },
];

export function getActiveRebootBeatAtTime(elapsedSec: number): CinematicRebootBeat | null {
  for (const beat of CINEMATIC_REBOOT_BEATS) {
    if (elapsedSec >= beat.startSec && elapsedSec <= beat.endSec) {
      return beat;
    }
  }
  return null;
}

/** La boca del villano se mueve mientras dura su voz. */
export function isVillainSpeakingAt(elapsedSec: number): boolean {
  return CINEMATIC_REBOOT_BEATS.some(
    (beat) =>
      beat.tone === 'villain' &&
      elapsedSec >= beat.startSec &&
      elapsedSec <= beat.endSec - 0.3
  );
}

class CinematicRebootVoice {
  private spokenBeatIds = new Set<string>();
  private narratorVoice: SpeechSynthesisVoice | null = null;
  private villainVoice: SpeechSynthesisVoice | null = null;
  private fallbackTimer: number | null = null;

  public preload(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const load = () => {
        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) return;
        const spanish = voices.filter((voice) =>
          voice.lang.toLowerCase().startsWith('es')
        );
        this.narratorVoice =
          spanish.find((voice) =>
            /natural|neural|alvaro|jorge|alonso|diego|pablo|google español/i.test(
              voice.name
            )
          ) ||
          spanish.find((voice) =>
            /google|microsoft|apple|paulina|monica|mónica/i.test(voice.name)
          ) ||
          spanish[0] ||
          null;
        this.villainVoice =
          spanish.find((voice) =>
            /pablo|jorge|diego|alonso|enrique|raul|raúl|carlos|gonzalo|miguel|pedro|méxico|mexico/i.test(
              voice.name
            )
          ) ||
          spanish.find((voice) => /masculin|male|hombre/i.test(voice.name)) ||
          this.narratorVoice;
      };
      load();
      window.speechSynthesis.addEventListener?.('voiceschanged', load);
    } catch {
      // Sin voz disponible: la narración queda en subtítulos.
    }
  }

  public resetTimeline(fromSec = 0): void {
    this.stopCurrent();
    this.spokenBeatIds.clear();
    for (const beat of CINEMATIC_REBOOT_BEATS) {
      if (beat.endSec < fromSec) this.spokenBeatIds.add(beat.id);
    }
  }

  public syncTimeline(elapsedSec: number, paused: boolean): void {
    if (paused || bgmEngine.isMuted() || typeof window === 'undefined') return;
    if (!('speechSynthesis' in window)) return;

    for (const beat of CINEMATIC_REBOOT_BEATS) {
      if (
        elapsedSec >= beat.startSec &&
        elapsedSec < beat.endSec - 0.5 &&
        !this.spokenBeatIds.has(beat.id)
      ) {
        this.spokenBeatIds.add(beat.id);
        this.speak(beat);
        return;
      }
    }
  }

  private speak(beat: CinematicRebootBeat): void {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(beat.speechText);
      if (!this.narratorVoice) this.preload();
      const voice =
        beat.tone === 'villain' ? this.villainVoice : this.narratorVoice;
      if (voice) utterance.voice = voice;
      utterance.lang = voice?.lang || 'es-ES';
      utterance.rate = beat.rate ?? 0.85;
      utterance.pitch = beat.pitch ?? 0.78;
      utterance.volume = 1;

      if (this.fallbackTimer !== null) window.clearTimeout(this.fallbackTimer);
      const finish = () => {
        if (this.fallbackTimer !== null) {
          window.clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      this.fallbackTimer = window.setTimeout(
        finish,
        Math.max(2600, (beat.endSec - beat.startSec + 1.2) * 1000)
      );
      window.speechSynthesis.speak(utterance);
    } catch {
      // La cinemática continúa sólo con subtítulos.
    }
  }

  public stopCurrent(): void {
    if (this.fallbackTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignorar.
      }
    }
  }
}

export const cinematicRebootNarrator = new CinematicRebootVoice();
