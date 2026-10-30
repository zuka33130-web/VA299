/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Howl, Howler } from 'howler';

/**
 * Convierte nota MIDI a frecuencia en Hz.
 */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Onda de pulso suave (25% ciclo útil) estilo consola/arcade años 80.
 */
function pulse25(phase: number): number {
  const p = phase - Math.floor(phase);
  return p < 0.25 ? 0.75 : -0.25;
}

/**
 * Onda triangular cálida sin aliasing brusco.
 */
function triangleWave(phase: number): number {
  const p = phase - Math.floor(phase);
  return 1 - 4 * Math.abs(Math.round(p - 0.25) - (p - 0.25));
}

/**
 * Sintetiza en memoria un archivo WAV estéreo de 16 bits (loop perfecto de 8 compases a 120 BPM)
 * con bajo synthwave octavado, arpegiador chiptune con eco estéreo, melodía principal y percusión arcade.
 */
function buildRetroArcadeWavBlobUrl(): string {
  const sampleRate = 24000;
  const bpm = 120;
  const stepSec = 60 / bpm / 4; // Semicorchea = 0.125s
  const totalSteps = 128; // 8 compases * 16 semicorcheas = 16.0s exactos
  const durationSec = totalSteps * stepSec;
  const totalSamples = Math.floor(sampleRate * durationSec);

  const leftBuf = new Float32Array(totalSamples);
  const rightBuf = new Float32Array(totalSamples);

  // Progresión retro-arcade espacial: Am (2 compases) | Fmaj7 (2) | C (2) | G -> E7 (2)
  const bassRootsMidi = [
    45, 45, // Am (A2)
    41, 41, // F (F2)
    36, 36, // C (C2)
    43, 40, // G (G2) -> E (E2)
  ];

  const arpChordsMidi: number[][] = [
    [69, 72, 76, 81], // Am
    [69, 72, 76, 84], // Am add high C
    [65, 69, 72, 76], // Fmaj7
    [65, 69, 72, 81], // F6/maj7
    [67, 72, 76, 79], // C
    [67, 72, 76, 84], // C high
    [67, 71, 74, 79], // G
    [68, 71, 74, 76], // E7 (retorno tenso a Am)
  ];

  // Melodía principal heroica de PIXELVERSE (tuplas: [pasoInicio, duraciónPasos, notaMidi])
  const leadNotes: [number, number, number][] = [
    // Compases 1-2 (Am)
    [0, 6, 81],
    [6, 2, 79],
    [8, 4, 76],
    [12, 4, 72],
    [16, 8, 74],
    [24, 8, 76],
    // Compases 3-4 (Fmaj7)
    [32, 6, 77],
    [38, 2, 76],
    [40, 4, 72],
    [44, 4, 69],
    [48, 12, 72],
    // Compases 5-6 (C)
    [64, 6, 79],
    [70, 2, 81],
    [72, 4, 84],
    [76, 4, 79],
    [80, 8, 76],
    [88, 8, 72],
    // Compases 7-8 (G -> E7)
    [96, 6, 74],
    [102, 2, 76],
    [104, 4, 79],
    [108, 4, 74],
    [112, 10, 76],
    [122, 6, 80],
  ];

  const samplesPerStep = Math.floor(sampleRate * stepSec);

  // 1. Sintetizar Bajo Octavado + Arpegiador 8-bit + Pad Ambiental + Percusión Retro
  let bassPhase = 0;
  let arpPhase = 0;
  let noiseSeed = 1337;

  for (let step = 0; step < totalSteps; step++) {
    const barIdx = Math.floor(step / 16);
    const stepInBar = step % 16;

    // Bajo octavado estilo arcade 1984 (alterna fundamental y octava cada semicorchea/corchea)
    const rootMidi = bassRootsMidi[barIdx];
    const bassMidi = step % 2 === 0 ? rootMidi : rootMidi + 12;
    const bassFreq = midiToFreq(bassMidi);

    // Nota del arpegiador cristalino
    const chord = arpChordsMidi[barIdx];
    const arpMidi = chord[step % chord.length];
    const arpFreq = midiToFreq(arpMidi);

    // Pad suave de fondo (fundamental + quinta)
    const padFreq1 = midiToFreq(rootMidi + 12);
    const padFreq2 = midiToFreq(chord[2] - 12);

    const isKick = stepInBar === 0 || stepInBar === 8;
    const isSnare = stepInBar === 4 || stepInBar === 12;
    const isHat = step % 2 === 1;

    const startSample = step * samplesPerStep;

    for (let i = 0; i < samplesPerStep; i++) {
      const idx = startSample + i;
      if (idx >= totalSamples) break;

      const localT = i / sampleRate;
      const stepProgress = i / samplesPerStep;

      // Envolvente percusiva para el bajo
      const bassEnv =
        Math.min(1, i / 48) * Math.exp(-localT * 14.5) * (1 - stepProgress * 0.15);
      bassPhase += bassFreq / sampleRate;
      const bassSig =
        (pulse25(bassPhase) * 0.55 + triangleWave(bassPhase) * 0.45) *
        bassEnv *
        0.24;

      // Envolvente para el arpegiador 8-bit
      const arpEnv = Math.min(1, i / 36) * Math.exp(-localT * 18.0);
      arpPhase += arpFreq / sampleRate;
      const arpSig = pulse25(arpPhase) * arpEnv * 0.13;

      // Pad cálido continuo (envolvente suave por compás para evitar cortes)
      const globalT = idx / sampleRate;
      const padSig =
        (Math.sin(2 * Math.PI * padFreq1 * globalT) +
          Math.sin(2 * Math.PI * padFreq2 * globalT)) *
        0.045;

      // Bombo sintetizado (barrido exponencial de seno)
      let drumSig = 0;
      if (isKick) {
        const kickFreq = 44 + 115 * Math.exp(-localT * 34);
        const kickEnv = Math.exp(-localT * 19);
        drumSig += Math.sin(2 * Math.PI * kickFreq * localT) * kickEnv * 0.28;
      }

      // Caja y charles de ruido digital 8-bit (LFSR determinista)
      noiseSeed = (noiseSeed * 16807) % 2147483647;
      const whiteNoise = (noiseSeed / 1073741824) - 1;

      if (isSnare) {
        const snareEnv = Math.exp(-localT * 24);
        const snareBody = Math.sin(2 * Math.PI * 185 * localT) * Math.exp(-localT * 32);
        drumSig += (whiteNoise * 0.65 + snareBody * 0.35) * snareEnv * 0.14;
      } else if (isHat) {
        const hatEnv = Math.exp(-localT * 52);
        drumSig += whiteNoise * hatEnv * 0.045;
      }

      // Panorama estéreo ligero para el arpegiador
      const panL = step % 2 === 0 ? 1.15 : 0.75;
      const panR = step % 2 === 0 ? 0.75 : 1.15;

      leftBuf[idx] += bassSig + padSig + drumSig + arpSig * panL;
      rightBuf[idx] += bassSig + padSig + drumSig + arpSig * panR;
    }
  }

  // 2. Sintetizar Melodía Principal con Vibrato Sutil
  for (const [startStep, lenSteps, midi] of leadNotes) {
    const startIdx = startStep * samplesPerStep;
    const noteSamples = lenSteps * samplesPerStep;
    const baseFreq = midiToFreq(midi);
    let phase = 0;

    for (let i = 0; i < noteSamples; i++) {
      const idx = (startIdx + i) % totalSamples;
      const t = i / sampleRate;
      const noteDur = noteSamples / sampleRate;

      const attack = Math.min(1, t / 0.018);
      const release = Math.min(1, (noteDur - t) / 0.045);
      const sustainDecay = 0.72 + 0.28 * Math.exp(-t * 2.4);
      const env = Math.max(0, attack * release * sustainDecay);

      const vibrato = 1 + Math.sin(2 * Math.PI * 5.5 * t) * 0.0035;
      phase += (baseFreq * vibrato) / sampleRate;

      const leadSig =
        (triangleWave(phase) * 0.7 + pulse25(phase) * 0.3) * env * 0.165;

      leftBuf[idx] += leadSig * 0.96;
      rightBuf[idx] += leadSig * 1.04;
    }
  }

  // 3. Eco Estéreo Cruzado Envolvente (Módulo totalSamples para loop 100% continuo sin clic)
  const delaySamples = Math.floor(stepSec * 3 * sampleRate); // Corchea con puntillo
  const copyL = new Float32Array(leftBuf);
  const copyR = new Float32Array(rightBuf);

  for (let i = 0; i < totalSamples; i++) {
    const delayedIdx = (i + delaySamples) % totalSamples;
    leftBuf[delayedIdx] += copyR[i] * 0.22;
    rightBuf[delayedIdx] += copyL[i] * 0.22;
  }

  // 4. Limitador Suave (tanh) y Codificación PCM 16-bit Estéreo WAV
  const numChannels = 2;
  const bytesPerSample = 2;
  const dataSize = totalSamples * numChannels * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size PCM
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // 16 bits por muestra
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  let byteOffset = 44;
  for (let i = 0; i < totalSamples; i++) {
    const softL = Math.tanh(leftBuf[i] * 0.92);
    const softR = Math.tanh(rightBuf[i] * 0.92);
    const sL = Math.max(-32768, Math.min(32767, Math.round(softL * 32767)));
    const sR = Math.max(-32768, Math.min(32767, Math.round(softR * 32767)));
    view.setInt16(byteOffset, sL, true);
    view.setInt16(byteOffset + 2, sR, true);
    byteOffset += 4;
  }

  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class RetroArcadeBgmManager {
  private howl: Howl | null = null;
  private blobUrl: string | null = null;
  private muted = false;
  private initialized = false;
  private readonly baseVolume = 0.34;
  private duckFactor = 1.0;
  private listeners: Set<(isMuted: boolean, isPlaying: boolean) => void> = new Set();

  private notify(): void {
    const playing = Boolean(this.howl && this.howl.playing());
    this.listeners.forEach((cb) => cb(this.muted, playing));
  }

  public subscribe(cb: (isMuted: boolean, isPlaying: boolean) => void): () => void {
    this.listeners.add(cb);
    cb(this.muted, Boolean(this.howl && this.howl.playing()));
    return () => {
      this.listeners.delete(cb);
    };
  }

  public setDuckFactor(factor: number): void {
    const clamped = Math.max(0, Math.min(1, factor));
    if (Math.abs(clamped - this.duckFactor) < 0.005) return;
    this.duckFactor = clamped;
    if (this.howl) {
      this.howl.volume(this.baseVolume * this.duckFactor);
    }
  }

  public initAndStart(): void {
    if (typeof window === 'undefined' || this.initialized) return;
    this.initialized = true;

    this.blobUrl = buildRetroArcadeWavBlobUrl();

    this.howl = new Howl({
      src: [this.blobUrl],
      format: ['wav'],
      loop: true,
      volume: this.baseVolume * this.duckFactor,
      preload: true,
      onplay: () => {
        this.notify();
      },
      onpause: () => {
        this.notify();
      },
      onmute: () => {
        this.notify();
      },
      onplayerror: () => {
        // Si la política de autoplay bloquea el inicio automático, Howler emite 'unlock' en el primer gesto
        if (this.howl) {
          this.howl.once('unlock', () => {
            if (this.howl && !this.howl.playing() && !this.muted) {
              this.howl.play();
            }
            this.notify();
          });
        }
      },
    });

    this.howl.play();

    // Respaldo universal ante gestos del usuario para reanudar Howler.ctx si arranca suspendido
    const unlockHandler = () => {
      this.ensurePlaying();
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
  }

  public ensurePlaying(): void {
    if (!this.initialized) {
      this.initAndStart();
      return;
    }
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().catch(() => {});
    }
    if (this.howl && !this.howl.playing() && !this.muted) {
      this.howl.play();
    }
    this.notify();
  }

  public setMuted(nextMuted: boolean): boolean {
    if (!this.initialized && !nextMuted) {
      this.initAndStart();
    }
    this.muted = nextMuted;
    Howler.mute(this.muted);

    if (!this.muted) {
      this.ensurePlaying();
    } else {
      if (this.howl && this.howl.playing()) {
        this.howl.mute(true);
      }
      this.notify();
    }
    return this.muted;
  }

  public toggleMute(): boolean {
    return this.setMuted(!this.muted);
  }

  public isMuted(): boolean {
    return this.muted;
  }
}

export const bgmEngine = new RetroArcadeBgmManager();
