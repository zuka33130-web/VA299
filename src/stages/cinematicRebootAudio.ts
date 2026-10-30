/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Diseño sonoro original de la cinemática de apertura de PIXELVERSE.
 *
 * Nueve escenas, 128 segundos:
 *   01  consola antigua y garra            00:00–14:00
 *   02  la pulsación del Reinicio Cero     14:00–24:00
 *   03  SUPER KING KOOPA                   24:00–53:00
 *   04  la onda borra la memoria           53:00–78:00
 *   05  la fecha del Reinicio Cero         78:00–94:00
 *   06  el océano y la isla lejana         94:00–106:00
 *   07  acercamiento a la casa             106:00–119:00
 *   08  la ventana iluminada               119:00–128:00
 *
 * El zumbido grave de una máquina imposible abre el vacío; un pad oscuro
 * sostiene la amenaza; el clic de la garra despierta la onda; la risa del
 * villano se mezcla con la reverberación; y el mar, el viento y la radio
 * reciben al jugador en la isla.
 */

import { bgmEngine } from '../audio/bgmEngine';

type ToneType = OscillatorType;

interface Layer {
  gain: GainNode;
  target: number;
}

interface Cue {
  id: string;
  time: number;
  run: (score: CinematicRebootScore) => void;
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

class CinematicRebootScore {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private reverbSend: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private layers: Record<string, Layer> = {};
  private sources = new Set<AudioScheduledSourceNode>();
  private fired = new Set<string>();
  private cues: Cue[] = [];

  constructor() {
    this.buildCues();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined' || bgmEngine.isMuted()) return null;
    try {
      if (!this.ctx) {
        const AudioCtor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtor) return null;
        const ctx = new AudioCtor();
        this.ctx = ctx;

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -18;
        comp.knee.value = 16;
        comp.ratio.value = 3;
        comp.attack.value = 0.01;
        comp.release.value = 0.3;
        comp.connect(ctx.destination);

        const master = ctx.createGain();
        master.gain.value = 0.92;
        master.connect(comp);
        this.master = master;

        const music = ctx.createGain();
        music.gain.value = 1;
        music.connect(master);
        this.musicBus = music;

        const sfx = ctx.createGain();
        sfx.gain.value = 1;
        sfx.connect(master);
        this.sfxBus = sfx;

        // Reverberación de cámara metálica enorme.
        const len = Math.floor(ctx.sampleRate * 3.6);
        const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
        let seed = 90210;
        for (let channel = 0; channel < 2; channel += 1) {
          const data = impulse.getChannelData(channel);
          let lp = 0;
          for (let i = 0; i < len; i += 1) {
            seed = (seed * 16807) % 2147483647;
            const white = seed / 1073741824 - 1;
            lp = lp * 0.82 + white * 0.18;
            const time = i / ctx.sampleRate;
            data[i] = lp * Math.pow(1 - time / 3.6, 2.3) * 0.5;
          }
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        const wet = ctx.createGain();
        wet.gain.value = 0.32;
        convolver.connect(wet);
        wet.connect(master);
        this.reverb = convolver;

        const send = ctx.createGain();
        send.gain.value = 0.24;
        send.connect(convolver);
        this.reverbSend = send;

        // Ruido reutilizable.
        const noiseLen = Math.floor(ctx.sampleRate * 2.4);
        const noiseBuffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseLen; i += 1) {
          seed = (seed * 16807) % 2147483647;
          data[i] = seed / 1073741824 - 1;
        }
        this.noise = noiseBuffer;

        this.buildAmbientLayers(ctx);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    } catch {
      return null;
    }
  }

  private createLayer(gainValue: number, destination: AudioNode): Layer {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(destination);
    const layer: Layer = { gain, target: 0 };
    if (gainValue > 0) {
      gain.gain.value = gainValue;
      layer.target = gainValue;
    }
    return layer;
  }

  private buildAmbientLayers(ctx: AudioContext): void {
    if (!this.musicBus || !this.sfxBus) return;

    // 1. Zumbido grave de una máquina antigua en un lugar desconocido.
    const hum = this.createLayer(0, this.sfxBus);
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 190;
    const humMix = ctx.createGain();
    humMix.gain.value = 0.75;
    [43, 86.4, 129.6].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = index * 3;
      const voice = ctx.createGain();
      voice.gain.value = index === 0 ? 0.9 : index === 1 ? 0.35 : 0.14;
      osc.connect(voice);
      voice.connect(humMix);
      this.track(osc);
      osc.start();
    });
    const humLfo = ctx.createOscillator();
    humLfo.frequency.value = 0.17;
    const humLfoGain = ctx.createGain();
    humLfoGain.gain.value = 0.22;
    humLfo.connect(humLfoGain);
    humLfoGain.connect(humMix.gain);
    this.track(humLfo);
    humLfo.start();
    humMix.connect(humFilter);
    humFilter.connect(hum.gain);
    this.layers.hum = hum;

    // 2. Vibración de la instalación, más tacto que sonido.
    if (this.noise) {
      const vibration = this.createLayer(0, this.sfxBus);
      const vibSrc = ctx.createBufferSource();
      vibSrc.buffer = this.noise;
      vibSrc.loop = true;
      const vibFilter = ctx.createBiquadFilter();
      vibFilter.type = 'lowpass';
      vibFilter.frequency.value = 70;
      vibFilter.Q.value = 1.4;
      const vibBody = ctx.createGain();
      vibBody.gain.value = 0.7;
      const vibLfo = ctx.createOscillator();
      vibLfo.type = 'sine';
      vibLfo.frequency.value = 2.1;
      const vibLfoGain = ctx.createGain();
      vibLfoGain.gain.value = 0.3;
      vibLfo.connect(vibLfoGain);
      vibLfoGain.connect(vibBody.gain);
      vibSrc.connect(vibFilter);
      vibFilter.connect(vibBody);
      vibBody.connect(vibration.gain);
      this.track(vibSrc);
      this.track(vibLfo);
      vibSrc.start();
      vibLfo.start();
      this.layers.vibration = vibration;
    }

    // 3. Pad oscuro: la amenaza que respira detrás de todo.
    const pad = this.createLayer(0, this.musicBus);
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 520;
    padFilter.Q.value = 0.4;
    const padLfo = ctx.createOscillator();
    padLfo.frequency.value = 0.05;
    const padLfoGain = ctx.createGain();
    padLfoGain.gain.value = 180;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    this.track(padLfo);
    padLfo.start();
    [55, 82.41, 110, 164.81].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 3 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (index - 1.5) * 5;
      const voice = ctx.createGain();
      voice.gain.value = index === 3 ? 0.09 : 0.2;
      osc.connect(voice);
      voice.connect(padFilter);
      this.track(osc);
      osc.start();
    });
    padFilter.connect(pad.gain);
    this.layers.pad = pad;

    // 4. Cristales lejanos: la luz roja y lo que queda del universo.
    const shimmer = this.createLayer(0, this.musicBus);
    const shimmerFilter = ctx.createBiquadFilter();
    shimmerFilter.type = 'highpass';
    shimmerFilter.frequency.value = 1100;
    [1318.51, 1760, 2637.02].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const voice = ctx.createGain();
      voice.gain.value = 0.022 - index * 0.005;
      osc.connect(voice);
      voice.connect(shimmerFilter);
      this.track(osc);
      osc.start();
    });
    shimmerFilter.connect(shimmer.gain);
    this.layers.shimmer = shimmer;

    // 5. Zumbido de la onda de energía.
    const drone = this.createLayer(0, this.musicBus);
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 280;
    droneFilter.Q.value = 1.1;
    const droneLfo = ctx.createOscillator();
    droneLfo.frequency.value = 0.13;
    const droneLfoGain = ctx.createGain();
    droneLfoGain.gain.value = 110;
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(droneFilter.frequency);
    this.track(droneLfo);
    droneLfo.start();
    [41.2, 61.74].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      osc.detune.value = index === 0 ? -6 : 7;
      const voice = ctx.createGain();
      voice.gain.value = 0.18;
      osc.connect(voice);
      voice.connect(droneFilter);
      this.track(osc);
      osc.start();
    });
    droneFilter.connect(drone.gain);
    this.layers.drone = drone;

    if (!this.noise) return;

    // 6. Mar nocturno.
    const ocean = this.createLayer(0, this.sfxBus);
    const oceanSrc = ctx.createBufferSource();
    oceanSrc.buffer = this.noise;
    oceanSrc.loop = true;
    const oceanFilter = ctx.createBiquadFilter();
    oceanFilter.type = 'lowpass';
    oceanFilter.frequency.value = 480;
    const oceanBody = ctx.createGain();
    oceanBody.gain.value = 0.85;
    const oceanLfo = ctx.createOscillator();
    oceanLfo.frequency.value = 0.085;
    const oceanLfoGain = ctx.createGain();
    oceanLfoGain.gain.value = 0.26;
    oceanLfo.connect(oceanLfoGain);
    oceanLfoGain.connect(oceanBody.gain);
    oceanSrc.connect(oceanFilter);
    oceanFilter.connect(oceanBody);
    oceanBody.connect(ocean.gain);
    this.track(oceanSrc);
    this.track(oceanLfo);
    oceanSrc.start();
    oceanLfo.start();
    this.layers.ocean = ocean;

    // 7. Estática de la radio de transistores.
    const crackle = this.createLayer(0, this.sfxBus);
    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = this.noise;
    crackleSrc.loop = true;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 2400;
    crackleFilter.Q.value = 0.6;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.15;
    crackleSrc.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(crackle.gain);
    this.track(crackleSrc);
    crackleSrc.start();
    this.layers.crackle = crackle;

    // 8. Viento entre los árboles de la isla.
    const wind = this.createLayer(0, this.sfxBus);
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = this.noise;
    windSrc.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 760;
    windFilter.Q.value = 0.5;
    windSrc.connect(windFilter);
    windFilter.connect(wind.gain);
    this.track(windSrc);
    windSrc.start();
    this.layers.wind = wind;
  }

  private track(node: AudioScheduledSourceNode): void {
    this.sources.add(node);
    node.onended = () => this.sources.delete(node);
  }

  public unlock(): void {
    this.ensureContext();
  }

  private setLayer(name: string, value: number, timeConstant = 0.25): void {
    const layer = this.layers[name];
    if (!layer) return;
    if (Math.abs(layer.target - value) < 0.0008) return;
    layer.target = value;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    layer.gain.gain.cancelScheduledValues(now);
    layer.gain.gain.setTargetAtTime(value, now, timeConstant);
  }

  public resetTimeline(fromSec = 0): void {
    this.stopAll();
    this.fired.clear();
    for (const cue of this.cues) {
      if (cue.time < fromSec - 0.12) this.fired.add(cue.id);
    }
  }

  public stopAll(): void {
    const list = Array.from(this.sources);
    this.sources.clear();
    for (const source of list) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // La fuente ya estaba detenida.
      }
    }
    for (const layer of Object.values(this.layers)) {
      try {
        const ctx = this.ctx;
        if (!ctx) continue;
        layer.gain.gain.cancelScheduledValues(ctx.currentTime);
        layer.gain.gain.setValueAtTime(0, ctx.currentTime);
        layer.target = 0;
      } catch {
        // Ignorar.
      }
    }
    this.layers = {};
    try {
      this.ctx?.close();
    } catch {
      // Ignorar.
    }
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.reverb = null;
    this.reverbSend = null;
    this.noise = null;
  }

  public syncTimeline(elapsedSec: number, paused: boolean): void {
    if (paused || bgmEngine.isMuted()) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (ctx.state !== 'running') {
      for (const cue of this.cues) {
        if (elapsedSec - cue.time > 0.8) this.fired.add(cue.id);
      }
      return;
    }

    for (const cue of this.cues) {
      if (elapsedSec >= cue.time && !this.fired.has(cue.id)) {
        this.fired.add(cue.id);
        if (elapsedSec - cue.time <= 1.4) cue.run(this);
      }
    }

    const t = elapsedSec;

    // La máquina respira desde el primer segundo y calla al pulsar el botón.
    const hum =
      t < 18
        ? 0.085 * smoothstep(0.4, 2.2, t) * (1 - smoothstep(16.7, 18.0, t))
        : 0;
    this.setLayer('hum', hum, 0.3);

    let vibration = 0;
    if (t >= 0.2 && t < 18) {
      vibration = 0.08 * smoothstep(0.2, 1.4, t) * (1 - smoothstep(16.6, 18, t));
    } else if (t >= 18 && t < 24.8) {
      vibration = 0.05 + 0.07 * smoothstep(18, 22.4, t);
    } else if (t >= 24.8 && t < 25.6) {
      vibration = 0.12 * (1 - smoothstep(24.8, 25.6, t));
    } else if (t >= 53 && t < 81.4) {
      vibration = 0.055 * smoothstep(53, 55, t) * (1 - smoothstep(74, 81.4, t));
    }
    this.setLayer('vibration', vibration, 0.35);

    let pad = 0;
    if (t >= 2.6 && t < 18) pad = 0.045 * smoothstep(2.6, 6.5, t);
    else if (t >= 18 && t < 31.2) pad = 0.06;
    else if (t >= 31.2 && t < 49.2) pad = 0.075 + 0.02 * smoothstep(31.2, 42, t);
    else if (t >= 49.2 && t < 53) pad = 0.095;
    else if (t >= 53 && t < 70) pad = 0.075 - 0.035 * smoothstep(58, 70, t);
    else if (t >= 70 && t < 80.5) pad = 0.04 - 0.012 * smoothstep(74, 80.5, t);
    else if (t >= 80.5 && t < 84) pad = 0;
    else if (t >= 84 && t < 92) pad = 0.022 * smoothstep(84, 86.5, t);
    else if (t >= 92 && t < 94) pad = 0.022 * (1 - smoothstep(92, 94, t));
    else if (t >= 94 && t < 122) pad = 0.024;
    else if (t >= 122) pad = 0.024 * (1 - smoothstep(124, 127.4, t));
    this.setLayer('pad', pad, 0.6);

    let shimmer = 0;
    if (t >= 2 && t < 14) {
      shimmer = 0.035 * smoothstep(2.4, 5.5, t) * (1 - smoothstep(12, 14, t));
    } else if (t >= 26 && t < 31.6) {
      shimmer = 0.012 * smoothstep(26, 29, t);
    } else if (t >= 31.6 && t < 53) {
      shimmer = 0.008;
    } else if (t >= 53 && t < 70) {
      shimmer = 0.018 * (1 - smoothstep(55, 70, t));
    } else if (t >= 83.6 && t < 91) {
      shimmer = 0.011 * smoothstep(83.6, 85.4, t) * (1 - smoothstep(89, 91, t));
    } else if (t >= 99 && t < 124) {
      shimmer = 0.007 * smoothstep(99, 103, t);
    }
    this.setLayer('shimmer', shimmer, 0.7);

    let drone = 0;
    if (t >= 18.1 && t < 24.8) drone = 0.11 * smoothstep(18.1, 22.2, t);
    else if (t >= 24.8 && t < 53) drone = 0.07;
    else if (t >= 53 && t < 78) drone = 0.075 * (1 - smoothstep(64, 78, t));
    else if (t >= 78 && t < 81.5) drone = 0.045 * smoothstep(77.6, 80.2, t);
    else if (t >= 81.5) drone = 0;
    this.setLayer('drone', drone, 0.5);

    const ocean =
      t >= 93.4 && t < 128
        ? 0.13 * smoothstep(93.4, 97.5, t) * (1 - smoothstep(125.4, 127.8, t))
        : 0;
    this.setLayer('ocean', ocean, 0.9);

    const wind =
      t >= 97 && t < 128
        ? 0.05 * smoothstep(97, 103, t) * (1 - smoothstep(125.8, 127.8, t))
        : 0;
    this.setLayer('wind', wind, 1);

    const crackle =
      t >= 103 && t < 128
        ? 0.014 * smoothstep(103, 108, t) * (1 - smoothstep(126.2, 127.9, t))
        : 0;
    this.setLayer('crackle', crackle, 0.7);
  }

  /* ------------------------------------------------------------------ */
  /* INSTRUMENTOS Y EFECTOS                                              */
  /* ------------------------------------------------------------------ */

  private connectTone(
    node: AudioNode,
    gain: GainNode,
    bus: AudioNode,
    pan: number
  ): void {
    const ctx = this.ctx;
    if (!ctx) return;
    let tail: AudioNode = node;
    if (pan !== 0) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = pan;
      tail.connect(panner);
      tail = panner;
    }
    tail.connect(gain);
    gain.connect(bus);
    if (this.reverbSend) gain.connect(this.reverbSend);
  }

  public tone(
    freq: number,
    duration: number,
    volume = 0.08,
    type: ToneType = 'sine',
    delay = 0,
    pan = 0,
    bus: 'music' | 'sfx' = 'sfx'
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const busNode = bus === 'music' ? this.musicBus : this.sfxBus;
    if (!busNode) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    this.connectTone(osc, gain, busNode, pan);
    this.track(osc);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  public sweep(
    from: number,
    to: number,
    duration: number,
    volume = 0.07,
    type: ToneType = 'sine',
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    this.connectTone(osc, gain, this.sfxBus, 0);
    this.track(osc);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  public noiseBurst(
    duration: number,
    volume = 0.06,
    filter: BiquadFilterType = 'highpass',
    frequency = 1200,
    delay = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noise || !this.sfxBus) return;
    const start = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const biquad = ctx.createBiquadFilter();
    biquad.type = filter;
    biquad.frequency.value = frequency;
    biquad.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(biquad);
    biquad.connect(gain);
    gain.connect(this.sfxBus);
    if (this.reverbSend) gain.connect(this.reverbSend);
    this.track(src);
    src.start(start);
    src.stop(start + duration + 0.03);
  }

  public chime(freq: number, delay = 0, volume = 0.045): void {
    this.tone(freq, 0.9, volume, 'sine', delay, -0.2, 'music');
    this.tone(freq * 2.01, 0.55, volume * 0.4, 'triangle', delay + 0.006, 0.25, 'music');
  }

  /**
   * Presencia de monstruo bajo la voz de Gran Koopa: subgraves, garganta
   * rasposa y pulsos lentos que le dan tamaño sin tapar el diálogo.
   */
  public monsterVoice(duration = 6, volume = 0.032, delay = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBus) return;
    const start = ctx.currentTime + delay;
    const end = Math.max(start + 0.8, start + duration);

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, start);
    out.gain.linearRampToValueAtTime(volume, start + 0.45);
    out.gain.setValueAtTime(volume, Math.max(start + 0.5, end - 0.7));
    out.gain.exponentialRampToValueAtTime(0.0001, end);

    const throat = ctx.createBiquadFilter();
    throat.type = 'lowpass';
    throat.frequency.setValueAtTime(560, start);
    throat.frequency.linearRampToValueAtTime(360, end);
    throat.Q.value = 1.1;
    out.connect(throat);
    // Formante de garganta: da cuerpo de criatura a la capa grave.
    const formant = ctx.createBiquadFilter();
    formant.type = 'peaking';
    formant.frequency.setValueAtTime(620, start);
    formant.frequency.linearRampToValueAtTime(520, end);
    formant.Q.value = 1.3;
    formant.gain.value = 8;
    throat.connect(formant);
    formant.connect(this.sfxBus);
    if (this.reverbSend) formant.connect(this.reverbSend);

    // Vibración de la garganta.
    const vibrato = ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5.4;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = 2.6;
    vibrato.connect(vibratoDepth);
    this.track(vibrato);
    vibrato.start(start);
    vibrato.stop(end + 0.05);

    [41.2, 55, 82.4, 123.5].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 3 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 0.94, end);
      osc.detune.value = index === 2 ? 7 : -4;
      vibratoDepth.connect(osc.frequency);
      const voice = ctx.createGain();
      voice.gain.value = index === 0 ? 0.5 : index === 1 ? 0.3 : 0.12;
      osc.connect(voice);
      voice.connect(out);
      this.track(osc);
      osc.start(start);
      osc.stop(end + 0.05);
    });

    // Garganta rasposa.
    if (this.noise) {
      const rasp = ctx.createBufferSource();
      rasp.buffer = this.noise;
      rasp.loop = true;
      const raspFilter = ctx.createBiquadFilter();
      raspFilter.type = 'bandpass';
      raspFilter.frequency.value = 210;
      raspFilter.Q.value = 3.2;
      const raspGain = ctx.createGain();
      raspGain.gain.value = 0.32;
      const raspLfo = ctx.createOscillator();
      raspLfo.type = 'sine';
      raspLfo.frequency.value = 3.1;
      const raspDepth = ctx.createGain();
      raspDepth.gain.value = 0.16;
      raspLfo.connect(raspDepth);
      raspDepth.connect(raspGain.gain);
      rasp.connect(raspFilter);
      raspFilter.connect(raspGain);
      raspGain.connect(out);
      // Segundo formante de gruñido, más áspero.
      const snarl = ctx.createBiquadFilter();
      snarl.type = 'bandpass';
      snarl.frequency.value = 940;
      snarl.Q.value = 1.7;
      const snarlGain = ctx.createGain();
      snarlGain.gain.value = 0.12;
      rasp.connect(snarl);
      snarl.connect(snarlGain);
      snarlGain.connect(out);
      this.track(rasp);
      this.track(raspLfo);
      rasp.start(start);
      rasp.stop(end + 0.05);
      raspLfo.start(start);
      raspLfo.stop(end + 0.05);
    }
  }

  /** Chirrido de metal y servo: la garra y los mecanismos de la consola. */
  public metalCreak(duration = 1.4, volume = 0.04): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.noise || !this.sfxBus) return;
    const start = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 7;
    filter.frequency.setValueAtTime(780, start);
    filter.frequency.linearRampToValueAtTime(300, start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus);
    if (this.reverbSend) gain.connect(this.reverbSend);
    this.track(src);
    src.start(start);
    src.stop(start + duration + 0.05);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(152, start);
    osc.frequency.linearRampToValueAtTime(88, start + duration);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;
    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.0001, start);
    oscGain.gain.linearRampToValueAtTime(volume * 0.4, start + duration * 0.4);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(lp);
    lp.connect(oscGain);
    oscGain.connect(this.sfxBus);
    if (this.reverbSend) oscGain.connect(this.reverbSend);
    this.track(osc);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** El clic de la garra y el golpe grave que despierta al Reinicio Cero. */
  public pressButton(): void {
    this.noiseBurst(0.05, 0.09, 'bandpass', 3600);
    this.tone(980, 0.07, 0.045, 'square');
    this.tone(34, 2.9, 0.17, 'sine');
    this.sweep(150, 28, 2.6, 0.13, 'sawtooth');
    this.noiseBurst(1.3, 0.075, 'lowpass', 260);
    this.tone(98, 2.4, 0.02, 'triangle');
  }

  /** Encendido de la consola, luz por luz. */
  public powerStep(step: number): void {
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    const freq = notes[Math.min(step, notes.length - 1)];
    this.tone(freq, 0.2, 0.028, 'square');
    this.chime(freq * 2, 0.01, 0.014);
  }

  /** Relámpago rojo: descarga seca y trueno bajo. */
  public thunder(): void {
    this.noiseBurst(0.3, 0.045, 'highpass', 1600);
    this.noiseBurst(1.5, 0.09, 'lowpass', 680);
    this.tone(41, 1.7, 0.1, 'sine');
  }

  /** Pulso de la risa de SUPER KING KOOPA. */
  public laughPulse(strength = 1): void {
    this.tone(87.31, 0.24, 0.05 * strength, 'sawtooth', 0, -0.15);
    this.tone(130.81, 0.2, 0.03 * strength, 'triangle', 0.01, 0.15);
    this.noiseBurst(0.08, 0.022 * strength, 'bandpass', 720);
  }

  /** Tecla de la fecha: escritura cinematográfica sobre la imagen. */
  public typeTick(): void {
    this.noiseBurst(0.02, 0.02, 'bandpass', 3200);
    this.tone(1180, 0.035, 0.011, 'square');
  }

  public glitchHit(strength = 1): void {
    this.noiseBurst(0.09 * strength, 0.05 * strength, 'bandpass', 1800);
    this.tone(72 + Math.random() * 30, 0.18, 0.035 * strength, 'square', 0, 0, 'sfx');
  }

  public radioPhrase(offset = 0, volume = 0.05): void {
    // La misma melodía de la radio de la cabaña, para que la entrega sea continua.
    const notes = [392.0, 493.88, 440.0, 349.23, 392.0];
    notes.forEach((freq, index) => {
      const delay = offset + index * 0.46;
      this.tone(freq, 0.43, volume, 'triangle', delay, 0.15, 'music');
      this.tone(freq * 2.01, 0.3, volume * 0.28, 'sine', delay + 0.004, -0.1, 'music');
    });
    this.noiseBurst(0.05, volume * 0.3, 'highpass', 2400, offset + 0.05);
  }

  private buildCues(): void {
    this.cues = [
      /* ---------------- 01 · consola y garra ---------------- */
      {
        id: 'power-on',
        time: 0.55,
        run: (s) => {
          s.tone(46, 2.6, 0.05, 'sine');
          s.noiseBurst(0.4, 0.02, 'lowpass', 300);
        },
      },
      {
        id: 'red-light',
        time: 2.1,
        run: (s) => {
          s.tone(174.61, 4.4, 0.022, 'sine', 0, -0.3, 'music');
          s.sweep(320, 170, 3.2, 0.018, 'sine');
          s.chime(880, 0.6, 0.012);
        },
      },
      { id: 'creak-1', time: 3.2, run: (s) => s.metalCreak(1.5, 0.035) },
      { id: 'console-hum', time: 3.8, run: (s) => s.noiseBurst(1.6, 0.014, 'lowpass', 220) },
      {
        id: 'claw-enter',
        time: 6.3,
        run: (s) => {
          s.metalCreak(1.9, 0.05);
          s.sweep(240, 62, 2.4, 0.045, 'sawtooth');
          s.tone(58, 2.2, 0.03, 'triangle');
        },
      },
      { id: 'claw-2', time: 8.5, run: (s) => s.metalCreak(1.3, 0.035) },
      {
        id: 'claw-shadow',
        time: 9.7,
        run: (s) => {
          s.tone(61.74, 3, 0.04, 'triangle');
          s.noiseBurst(1.8, 0.012, 'lowpass', 300);
        },
      },
      {
        id: 'approach',
        time: 11.2,
        run: (s) => {
          s.sweep(90, 150, 2.6, 0.028, 'sine');
          s.noiseBurst(0.6, 0.012, 'bandpass', 600);
        },
      },
      { id: 'claw-slow', time: 12.8, run: (s) => s.metalCreak(1.5, 0.045) },
      {
        id: 'hover',
        time: 13.7,
        run: (s) => {
          s.tone(110, 1.8, 0.02, 'sine');
          s.tone(220, 1.3, 0.012, 'sine', 0.03);
        },
      },

      /* ------------- 02 · la pulsación del reinicio ------------- */
      {
        id: 'descend',
        time: 14.3,
        run: (s) => {
          s.sweep(70, 120, 3.2, 0.032, 'sawtooth');
          s.metalCreak(1.7, 0.04);
        },
      },
      {
        id: 'near-button',
        time: 16.6,
        run: (s) => {
          s.tone(65, 2.2, 0.05, 'triangle');
          s.noiseBurst(0.9, 0.012, 'lowpass', 180);
        },
      },
      { id: 'press', time: 18.0, run: (s) => s.pressButton() },
      { id: 'power-1', time: 18.45, run: (s) => s.powerStep(0) },
      { id: 'power-2', time: 18.85, run: (s) => s.powerStep(1) },
      { id: 'power-3', time: 19.25, run: (s) => s.powerStep(2) },
      { id: 'power-4', time: 19.6, run: (s) => s.powerStep(3) },
      { id: 'power-5', time: 19.95, run: (s) => s.powerStep(4) },
      {
        id: 'energy-build',
        time: 19.4,
        run: (s) => {
          s.sweep(48, 320, 3.6, 0.055, 'sawtooth');
          s.sweep(90, 640, 3.4, 0.028, 'triangle');
        },
      },
      {
        id: 'overload',
        time: 21.9,
        run: (s) => {
          s.noiseBurst(2.8, 0.085, 'lowpass', 520);
          s.tone(52, 3.2, 0.08, 'sine');
        },
      },
      {
        id: 'wave-burst',
        time: 22.4,
        run: (s) => {
          s.noiseBurst(2.4, 0.11, 'highpass', 700);
          s.sweep(60, 1200, 2.8, 0.065, 'sine');
          s.chime(1318.51, 0.25, 0.026);
        },
      },
      {
        id: 'beam',
        time: 23.2,
        run: (s) => {
          s.tone(1567.98, 3, 0.02, 'sine');
          s.sweep(220, 880, 2.6, 0.028);
        },
      },

      /* ------------------ 03 · SUPER KING KOOPA ------------------ */
      {
        id: 'follow-energy',
        time: 24.7,
        run: (s) => {
          s.sweep(300, 120, 2.6, 0.038, 'sine');
          s.noiseBurst(1, 0.018, 'bandpass', 900);
        },
      },
      { id: 'smoke', time: 26.4, run: (s) => s.noiseBurst(2.6, 0.028, 'lowpass', 420) },
      { id: 'lightning-1', time: 28.3, run: (s) => s.thunder() },
      {
        id: 'reveal',
        time: 29.5,
        run: (s) => {
          s.sweep(60, 180, 3, 0.045, 'sawtooth');
          s.tone(82.41, 3.2, 0.055, 'triangle');
        },
      },
      {
        id: 'lightning-2',
        time: 30.2,
        run: (s) => {
          s.noiseBurst(0.8, 0.065, 'lowpass', 900);
          s.tone(48, 1, 0.075, 'sine');
        },
      },
      {
        id: 'face',
        time: 31.2,
        run: (s) => {
          s.tone(110, 3.4, 0.035, 'triangle');
          s.chime(329.63, 0.35, 0.018);
        },
      },
      // La voz del rey tiene cuerpo de monstruo.
      { id: 'monster-voice-1', time: 31.55, run: (s) => s.monsterVoice(7.6, 0.05) },
      { id: 'monster-voice-2', time: 40.35, run: (s) => s.monsterVoice(7.3, 0.052) },
      { id: 'monster-voice-3', time: 49.15, run: (s) => s.monsterVoice(3.8, 0.058) },
      { id: 'loop-1', time: 35.6, run: (s) => s.glitchHit(0.28) },
      { id: 'loop-2', time: 36.4, run: (s) => s.glitchHit(0.22) },
      { id: 'loop-3', time: 37.2, run: (s) => s.glitchHit(0.32) },
      {
        id: 'line-2',
        time: 40.5,
        run: (s) => {
          s.tone(55, 1.4, 0.045, 'square');
          s.noiseBurst(0.8, 0.02, 'lowpass', 360);
        },
      },
      {
        id: 'head-lift',
        time: 44,
        run: (s) => {
          s.sweep(70, 150, 2, 0.035, 'sine');
          s.chime(392, 0.4, 0.014);
        },
      },
      { id: 'laugh-1', time: 49.2, run: (s) => s.laughPulse(1) },
      { id: 'laugh-2', time: 49.55, run: (s) => s.laughPulse(0.9) },
      { id: 'laugh-3', time: 49.95, run: (s) => s.laughPulse(0.8) },
      { id: 'laugh-4', time: 50.35, run: (s) => s.laughPulse(0.7) },
      { id: 'laugh-5', time: 50.8, run: (s) => s.laughPulse(0.62) },
      { id: 'laugh-6', time: 51.25, run: (s) => s.laughPulse(0.55) },
      { id: 'laugh-7', time: 51.7, run: (s) => s.laughPulse(0.5) },
      { id: 'laugh-8', time: 52.15, run: (s) => s.laughPulse(0.45) },
      {
        id: 'pull-back',
        time: 52.7,
        run: (s) => {
          s.sweep(600, 80, 2.4, 0.045);
          s.noiseBurst(1.6, 0.028, 'lowpass', 700);
        },
      },

      /* ---------------- 04 · la onda borra la memoria ---------------- */
      {
        id: 'wave-leaves',
        time: 53.4,
        run: (s) => {
          s.noiseBurst(2.4, 0.045, 'bandpass', 1100);
          s.sweep(300, 90, 2.2, 0.035);
        },
      },
      {
        id: 'arcade',
        time: 55.6,
        run: (s) => {
          s.sweep(2400, 150, 2.8, 0.03, 'sawtooth');
          s.tone(60, 2.8, 0.045);
        },
      },
      { id: 'crt-1', time: 56.6, run: (s) => s.glitchHit(0.5) },
      {
        id: 'power-down',
        time: 57.4,
        run: (s) => {
          s.sweep(1800, 40, 1.6, 0.028, 'sawtooth');
          s.noiseBurst(0.6, 0.028, 'lowpass', 300);
        },
      },
      { id: 'crt-2', time: 58.2, run: (s) => s.glitchHit(0.35) },
      {
        id: 'crack',
        time: 59.2,
        run: (s) => {
          s.noiseBurst(1, 0.05, 'bandpass', 700);
          s.tone(48, 0.8, 0.045);
        },
      },
      {
        id: 'cartridge',
        time: 60.4,
        run: (s) => {
          s.glitchHit(0.2);
          s.sweep(900, 200, 1.8, 0.026);
        },
      },
      {
        id: 'dissolve',
        time: 61.4,
        run: (s) => {
          s.sweep(1200, 120, 2.6, 0.022, 'triangle');
          s.noiseBurst(1.8, 0.018, 'highpass', 2000);
        },
      },
      {
        id: 'city',
        time: 63.4,
        run: (s) => {
          s.noiseBurst(2.6, 0.026, 'lowpass', 500);
          s.tone(41, 3.4, 0.05);
        },
      },
      {
        id: 'muffle',
        time: 65.6,
        run: (s) => {
          s.tone(36, 4.6, 0.035);
          s.noiseBurst(3.2, 0.016, 'lowpass', 240);
        },
      },
      {
        id: 'space',
        time: 67.4,
        run: (s) => {
          s.chime(1046.5, 0, 0.012);
          s.sweep(400, 60, 3.4, 0.018);
        },
      },
      {
        id: 'void',
        time: 70.4,
        run: (s) => {
          s.chime(783.99, 0.4, 0.01);
          s.tone(55, 4.6, 0.018);
        },
      },
      { id: 'last-trace', time: 73.2, run: (s) => s.glitchHit(0.12) },

      /* ---------------- 05 · la fecha del reinicio ---------------- */
      {
        id: 'planet-wrap',
        time: 77.6,
        run: (s) => {
          s.noiseBurst(3, 0.03, 'lowpass', 620);
          s.tone(52, 3.6, 0.045);
        },
      },
      {
        id: 'inhale',
        time: 80.5,
        run: (s) => s.sweep(120, 900, 1.3, 0.026),
      },
      {
        id: 'white-flash',
        time: 81.4,
        run: (s) => {
          s.noiseBurst(0.7, 0.16, 'highpass', 900);
          s.tone(2637, 1.2, 0.038);
          s.sweep(180, 40, 1.4, 0.04);
        },
      },
      { id: 'planet-silent', time: 82.1, run: (s) => s.tone(65, 3, 0.018) },
      { id: 'date-rule', time: 86.6, run: (s) => s.chime(523.25, 0, 0.012) },
      { id: 'date-hold', time: 88.2, run: (s) => s.tone(174.61, 3.4, 0.01, 'sine') },
      {
        id: 'date-fade',
        time: 91,
        run: (s) => {
          s.sweep(300, 120, 2.4, 0.014);
          s.chime(659.25, 0.4, 0.008);
        },
      },
      {
        id: 'to-ocean',
        time: 92.6,
        run: (s) => {
          s.noiseBurst(1.8, 0.022, 'lowpass', 400);
          s.sweep(200, 80, 2.2, 0.018);
        },
      },

      /* ---------------- 06 · el océano y la isla ---------------- */
      { id: 'ocean-in', time: 94, run: (s) => s.noiseBurst(3.2, 0.018, 'lowpass', 600) },
      { id: 'island-chime', time: 99.2, run: (s) => s.chime(392, 0, 0.018) },
      { id: 'island-chime-2', time: 102.4, run: (s) => s.chime(523.25, 0.2, 0.014) },
      { id: 'shore', time: 103.8, run: (s) => s.noiseBurst(2.8, 0.022, 'lowpass', 520) },
      { id: 'radio-far', time: 105.2, run: (s) => s.radioPhrase(0, 0.016) },

      /* ---------------- 07 · la casa de Pixel ---------------- */
      { id: 'flyover', time: 106.6, run: (s) => s.noiseBurst(2.4, 0.02, 'bandpass', 800) },
      { id: 'house', time: 109.4, run: (s) => s.chime(659.25, 0, 0.018) },
      { id: 'branch', time: 111.2, run: (s) => s.noiseBurst(0.7, 0.018, 'highpass', 1600) },
      { id: 'radio-mid', time: 112.6, run: (s) => s.radioPhrase(0, 0.026) },
      {
        id: 'window',
        time: 115,
        run: (s) => {
          s.chime(783.99, 0, 0.016);
          s.noiseBurst(0.6, 0.012, 'lowpass', 900);
        },
      },
      { id: 'radio-near', time: 116.2, run: (s) => s.radioPhrase(0, 0.036) },

      /* ---------------- 08 · la ventana iluminada ---------------- */
      {
        id: 'glass',
        time: 119.4,
        run: (s) => {
          s.sweep(700, 240, 1.8, 0.018);
          s.noiseBurst(0.7, 0.016, 'bandpass', 1200);
        },
      },
      { id: 'radio-near-2', time: 120.6, run: (s) => s.radioPhrase(0, 0.04) },
      {
        id: 'interior',
        time: 122.5,
        run: (s) => {
          s.tone(196, 2.6, 0.018, 'triangle');
          s.chime(587.33, 0.25, 0.01);
        },
      },
      { id: 'radio-near-3', time: 123.8, run: (s) => s.radioPhrase(0, 0.043) },
      { id: 'radio-final', time: 125.6, run: (s) => s.radioPhrase(0, 0.04) },
      { id: 'handoff', time: 126.8, run: (s) => s.tone(130.81, 2.6, 0.016, 'sine') },
    ];
  }

  public silence(): void {
    // Silencio absoluto: el Reinicio Cero se lleva todo.
    for (const layer of Object.values(this.layers)) {
      const ctx = this.ctx;
      if (!ctx) continue;
      layer.gain.gain.cancelScheduledValues(ctx.currentTime);
      layer.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      layer.target = 0;
    }
  }
}

export const cinematicRebootAudio = new CinematicRebootScore();
