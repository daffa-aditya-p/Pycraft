import { EventBus, type AudioCueId } from '@/stores/EventBus';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useUIStore } from '@/stores/useUIStore';

/**
 * Procedural Web Audio engine (100% offline, zero external audio file dependencies).
 * Provides master/music/SFX gain buses, BIT/world/UI SFX synthesis, ambient water/beacon
 * loops, two calm ambient music motifs, and -6 dB ducking during dialogue or editor focus.
 */
class WebAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private ambientInterval: number | null = null;
  private musicStep = 0;
  private initialized = false;
  private unsubscribes: Array<() => void> = [];

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const unlock = (): void => {
      this.ensureContext();
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      this.startAmbientLoop();
    };

    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    this.unsubscribes.push(
      EventBus.on('audio.cue', ({ cue }) => {
        this.playCue(cue);
      })
    );

    this.unsubscribes.push(
      useSettingsStore.subscribe((state) => {
        this.syncVolumes(state.audio);
      })
    );

    this.unsubscribes.push(
      useUIStore.subscribe((state) => {
        const shouldDuck =
          state.screen === 'in_game' &&
          (state.inGameOverlay === 'dialogue' ||
            state.inGameOverlay === 'editor' ||
            state.inGameOverlay === 'learning_intro');
        this.setDucking(shouldDuck);
      })
    );
  }

  dispose(): void {
    if (this.ambientInterval !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    for (const unsub of this.unsubscribes) {
      unsub();
    }
    this.unsubscribes = [];
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const masterGain = ctx.createGain();
    const duckGain = ctx.createGain();
    const musicGain = ctx.createGain();
    const sfxGain = ctx.createGain();

    musicGain.connect(duckGain);
    duckGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.ctx = ctx;
    this.masterGain = masterGain;
    this.duckGain = duckGain;
    this.musicGain = musicGain;
    this.sfxGain = sfxGain;

    this.syncVolumes(useSettingsStore.getState().audio);
    return ctx;
  }

  private syncVolumes(audio: { master: number; music: number; sfx: number; muted: boolean }): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const masterVal = audio.muted ? 0 : audio.master;
    this.masterGain.gain.setTargetAtTime(masterVal, now, 0.03);
    this.musicGain.gain.setTargetAtTime(audio.music * 0.25, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(audio.sfx * 0.5, now, 0.03);
  }

  /** Applies -6 dB ducking (factor ~0.501) to music bus during dialogue/editor. */
  setDucking(ducked: boolean): void {
    if (!this.ctx || !this.duckGain) return;
    const target = ducked ? 0.501 : 1.0;
    this.duckGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
  }

  private startAmbientLoop(): void {
    if (this.ambientInterval !== null || typeof window === 'undefined') return;
    // Calm pentatonic motif (C4, D4, E4, G4, A4, C5)
    const motif = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];
    this.ambientInterval = window.setInterval(() => {
      const ui = useUIStore.getState();
      const settings = useSettingsStore.getState();
      if (settings.audio.muted || settings.audio.music <= 0.01) return;
      if (ui.screen !== 'title' && ui.screen !== 'in_game') return;
      if (!this.ctx || this.ctx.state !== 'running' || !this.musicGain) return;

      const freq = motif[this.musicStep % motif.length] ?? 261.63;
      this.musicStep += 1;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      osc.type = ui.screen === 'title' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      env.gain.setValueAtTime(0.0001, now);
      env.gain.linearRampToValueAtTime(0.08, now + 0.25);
      env.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      osc.connect(env);
      env.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 1.85);
    }, 2200);
  }

  playCinematicDrone(step: number): void {
    const settings = useSettingsStore.getState();
    if (settings.audio.muted || settings.audio.music <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    // Chords tailored for each cinematic act:
    // Step 0/1: C maj 9 ethereal floating (C3, G3, D4, E4)
    // Step 2: A min 7 solemn silence (A2, E3, C4, G4)
    // Step 3: F maj 7 awakening promise (F2, C3, A3, E4)
    // Step 4: G maj triumphant dawn (G2, D3, B3, G4)
    const chords: number[][] = [
      [130.81, 196.0, 293.66, 329.63],
      [110.0, 164.81, 261.63, 392.0],
      [87.31, 130.81, 220.0, 329.63],
      [98.0, 146.83, 246.94, 392.0],
    ];
    const freqs = chords[Math.max(0, Math.min(chords.length - 1, step))]!;
    for (let i = 0; i < freqs.length; i++) {
      const freq = freqs[i]!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.07 / freqs.length, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.5);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 5.6);
    }
  }

  playCue(cue: AudioCueId): void {
    const settings = useSettingsStore.getState();
    if (settings.audio.muted || settings.audio.sfx <= 0.01) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    switch (cue) {
      case 'ui_click':
        this.tone(ctx, now, 520, 620, 0.045, 'triangle', 0.18);
        break;
      case 'ui_confirm':
        this.tone(ctx, now, 440, 660, 0.09, 'sine', 0.22);
        this.tone(ctx, now + 0.07, 660, 880, 0.12, 'sine', 0.2);
        break;
      case 'ui_error':
        this.tone(ctx, now, 220, 165, 0.16, 'sawtooth', 0.16);
        break;
      case 'bit_chirp':
        this.tone(ctx, now, 680, 960, 0.07, 'sine', 0.2);
        this.tone(ctx, now + 0.07, 960, 1140, 0.06, 'sine', 0.15);
        break;
      case 'bit_move':
        this.tone(ctx, now, 180, 210, 0.06, 'triangle', 0.14);
        break;
      case 'bit_bump':
        this.tone(ctx, now, 130, 75, 0.14, 'square', 0.22);
        break;
      case 'bit_place':
      case 'bridge_plank':
        this.tone(ctx, now, 240, 190, 0.08, 'triangle', 0.24);
        break;
      case 'bit_plant':
        this.tone(ctx, now, 340, 480, 0.09, 'sine', 0.18);
        break;
      case 'bit_collect':
      case 'crystal_pickup':
        this.tone(ctx, now, 587.33, 880, 0.14, 'sine', 0.24);
        break;
      case 'beacon_chime':
        this.tone(ctx, now, 523.25, 523.25, 0.25, 'sine', 0.25);
        this.tone(ctx, now + 0.12, 659.25, 659.25, 0.3, 'sine', 0.22);
        this.tone(ctx, now + 0.24, 783.99, 783.99, 0.35, 'sine', 0.2);
        break;
      case 'gate_open':
        this.tone(ctx, now, 140, 260, 0.35, 'triangle', 0.24);
        break;
      case 'gate_close':
        this.tone(ctx, now, 240, 110, 0.25, 'triangle', 0.22);
        break;
      case 'water_restore':
        this.tone(ctx, now, 392, 587.33, 0.45, 'sine', 0.2);
        this.tone(ctx, now + 0.15, 587.33, 783.99, 0.45, 'sine', 0.18);
        break;
      case 'quest_complete':
        this.tone(ctx, now, 440, 440, 0.14, 'triangle', 0.22);
        this.tone(ctx, now + 0.12, 554.37, 554.37, 0.14, 'triangle', 0.22);
        this.tone(ctx, now + 0.24, 659.25, 659.25, 0.18, 'triangle', 0.24);
        this.tone(ctx, now + 0.36, 880, 880, 0.32, 'sine', 0.25);
        break;
      case 'footstep':
        this.tone(ctx, now, 110, 85, 0.035, 'sine', 0.08);
        break;
      case 'jump':
        this.tone(ctx, now, 220, 360, 0.09, 'sine', 0.14);
        break;
      case 'land':
        this.tone(ctx, now, 140, 90, 0.06, 'sine', 0.14);
        break;
    }
  }

  private tone(
    ctx: AudioContext,
    startTime: number,
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType,
    peakGain: number
  ): void {
    if (!this.sfxGain) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startTime);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), startTime + durationSec);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
  }
}

export const AudioManager = new WebAudioManager();
