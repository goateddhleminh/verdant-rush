import { AudioDataFile, TrackId, VehicleType } from '../data/types';

interface AIVehicleAudioSlot {
  source: AudioBufferSourceNode | null;
  gain: GainNode;
  panner: StereoPannerNode;
  filter: BiquadFilterNode;
  currentType: VehicleType;
}

class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private lastOneShotTime = new Map<string, number>();
  private oneShotMinGapMs = 80;
  private initialized = false;
  private muted = false;

  // Bus Gains
  private masterGain: GainNode | null = null;
  private musicBusGain: GainNode | null = null;
  private musicFilter: BiquadFilterNode | null = null;
  private musicDuckGain: GainNode | null = null;
  private sfxBusGain: GainNode | null = null;
  private ambienceBusGain: GainNode | null = null;
  private uiBusGain: GainNode | null = null;

  private busVolumes = {
    master: 0.85,
    music: 0.7,
    sfx: 0.85,
    ambience: 0.65,
    ui: 0.8,
  };

  // Active music state
  private currentMusicId: string | null = null;
  private currentMusicSource: AudioBufferSourceNode | null = null;
  private currentMusicGain: GainNode | null = null;

  // Active ambience state
  private currentAmbienceTrack: string | null = null;
  private mainAmbienceSource: AudioBufferSourceNode | null = null;
  private mainAmbienceGain: GainNode | null = null;
  private streamAmbienceSource: AudioBufferSourceNode | null = null;
  private streamAmbienceGain: GainNode | null = null;
  private streamAmbiencePanner: StereoPannerNode | null = null;

  // Continuous player vehicle loops
  private engineSource: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineVehicleType: VehicleType = 'car';

  private skidSource: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;

  private gravelSource: AudioBufferSourceNode | null = null;
  private gravelGain: GainNode | null = null;

  private windSource: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;

  // 4 AI vehicle positional slots
  private aiSlots: AIVehicleAudioSlot[] = [];
  private drivingLoopsActive = false;

  // Soft runtime Rush percussion synthesizer
  private rushBeatTimer: number | null = null;
  private rushLevel = 0;
  private calmLevel = 0;
  private isPausedMuffle = false;
  private rushStep = 0;

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.busVolumes.master;
      this.masterGain.connect(this.ctx.destination);

      this.musicDuckGain = this.ctx.createGain();
      this.musicDuckGain.gain.value = 1.0;
      this.musicDuckGain.connect(this.masterGain);

      this.musicFilter = this.ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 16000;
      this.musicFilter.Q.value = 0.7;
      this.musicFilter.connect(this.musicDuckGain);

      this.musicBusGain = this.ctx.createGain();
      this.musicBusGain.gain.value = this.busVolumes.music;
      this.musicBusGain.connect(this.musicFilter);

      this.sfxBusGain = this.ctx.createGain();
      this.sfxBusGain.gain.value = this.busVolumes.sfx;
      this.sfxBusGain.connect(this.masterGain);

      this.ambienceBusGain = this.ctx.createGain();
      this.ambienceBusGain.gain.value = this.busVolumes.ambience;
      this.ambienceBusGain.connect(this.masterGain);

      this.uiBusGain = this.ctx.createGain();
      this.uiBusGain.gain.value = this.busVolumes.ui;
      this.uiBusGain.connect(this.masterGain);

      this.startRushPercussionLoop();
      return this.ctx;
    } catch {
      return null;
    }
  }

  public resumeOnInteraction = () => {
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };

  public async init(
    audioData: AudioDataFile,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    if (this.initialized) return;
    this.oneShotMinGapMs = audioData.oneShotMinGapMs || 80;
    const ctx = this.ensureContext();

    // Attach global listener for first interaction resume
    const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
    const unlock = () => {
      this.resumeOnInteraction();
      if (this.currentMusicId && !this.currentMusicSource) {
        const id = this.currentMusicId;
        this.currentMusicId = null;
        this.playMusic(id);
      }
    };
    unlockEvents.forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

    const files = audioData.files;
    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      onProgress?.(i, files.length);
      if (!ctx) continue;
      try {
        const res = await fetch(`/assets/${entry.file}`);
        if (res.ok) {
          const arr = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arr);
          this.buffers.set(entry.id, decoded);
        }
      } catch {
        // Ignore individual decode failures gracefully
      }
    }
    onProgress?.(files.length, files.length);
    this.initialized = true;
  }

  public setVolumes(vols: Partial<typeof this.busVolumes>, muted?: boolean) {
    Object.assign(this.busVolumes, vols);
    if (muted !== undefined) this.muted = muted;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.busVolumes.master, now, 0.04);
    }
    if (this.musicBusGain) {
      this.musicBusGain.gain.setTargetAtTime(this.busVolumes.music, now, 0.04);
    }
    if (this.sfxBusGain) {
      this.sfxBusGain.gain.setTargetAtTime(this.busVolumes.sfx, now, 0.04);
    }
    if (this.ambienceBusGain) {
      this.ambienceBusGain.gain.setTargetAtTime(this.busVolumes.ambience, now, 0.04);
    }
    if (this.uiBusGain) {
      this.uiBusGain.gain.setTargetAtTime(this.busVolumes.ui, now, 0.04);
    }
  }

  public playOneShot(
    id: string,
    volume: number = 1.0,
    playbackRate: number = 1.0,
    bus: 'sfx' | 'ui' = 'sfx'
  ) {
    const ctx = this.ensureContext();
    if (!ctx || this.muted) return;
    this.resumeOnInteraction();

    const nowMs = performance.now();
    const last = this.lastOneShotTime.get(id) || 0;
    if (nowMs - last < this.oneShotMinGapMs) return;
    this.lastOneShotTime.set(id, nowMs);

    const buf = this.buffers.get(id);
    const targetBus = bus === 'ui' ? this.uiBusGain : this.sfxBusGain;
    if (!buf || !targetBus) return;

    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = Math.max(0.25, Math.min(4.0, playbackRate));

      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1.5, volume));

      src.connect(gain);
      gain.connect(targetBus);
      src.start();

      // Duck music gently on countdown or win-jingle
      if (id === 'countdown-beep' || id === 'countdown-go' || id === 'win-jingle') {
        this.duckMusic(id === 'win-jingle' ? 2.5 : 0.55);
      }
    } catch {
      // Ignore if context is closed
    }
  }

  private duckMusic(durationSec: number) {
    if (!this.ctx || !this.musicDuckGain) return;
    const now = this.ctx.currentTime;
    this.musicDuckGain.gain.cancelScheduledValues(now);
    this.musicDuckGain.gain.setTargetAtTime(0.45, now, 0.06);
    this.musicDuckGain.gain.setTargetAtTime(1.0, now + durationSec, 0.35);
  }

  public playMusic(musicId: string) {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicBusGain) return;
    if (this.currentMusicId === musicId && this.currentMusicSource) return;

    const buf = this.buffers.get(musicId);
    if (!buf) {
      this.currentMusicId = musicId;
      return;
    }

    const now = ctx.currentTime;
    // Crossfade out previous music in 1.5s
    if (this.currentMusicSource && this.currentMusicGain) {
      const oldSrc = this.currentMusicSource;
      const oldGain = this.currentMusicGain;
      oldGain.gain.cancelScheduledValues(now);
      oldGain.gain.setValueAtTime(oldGain.gain.value, now);
      oldGain.gain.linearRampToValueAtTime(0.0001, now + 1.5);
      setTimeout(() => {
        try {
          oldSrc.stop();
          oldSrc.disconnect();
        } catch {}
      }, 1600);
    }

    try {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.85, now + 1.5);

      src.connect(gain);
      gain.connect(this.musicBusGain);
      src.start();

      this.currentMusicId = musicId;
      this.currentMusicSource = src;
      this.currentMusicGain = gain;
    } catch {}
  }

  public startAmbience(trackId: TrackId) {
    const ctx = this.ensureContext();
    if (!ctx || !this.ambienceBusGain) return;
    if (this.currentAmbienceTrack === trackId && this.mainAmbienceSource) return;

    this.stopAmbience();
    this.currentAmbienceTrack = trackId;

    const mainMap: Record<TrackId, string> = {
      'emerald-valley': 'forest-birds-loop',
      'amber-woods': 'autumn-wind-loop',
      'lakeside-haven': 'lake-waves-loop',
    };

    const mainId = mainMap[trackId];
    const mainBuf = this.buffers.get(mainId);
    const now = ctx.currentTime;

    if (mainBuf) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = mainBuf;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.8, now + 1.2);
        src.connect(gain);
        gain.connect(this.ambienceBusGain);
        src.start();
        this.mainAmbienceSource = src;
        this.mainAmbienceGain = gain;
      } catch {}
    }

    const streamBuf = this.buffers.get('stream-loop');
    if (streamBuf) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = streamBuf;
        src.loop = true;
        const gain = ctx.createGain();
        gain.gain.value = 0.0;
        const panner = ctx.createStereoPanner();
        panner.pan.value = 0;
        src.connect(gain);
        gain.connect(panner);
        panner.connect(this.ambienceBusGain);
        src.start();
        this.streamAmbienceSource = src;
        this.streamAmbienceGain = gain;
        this.streamAmbiencePanner = panner;
      } catch {}
    }
  }

  public stopAmbience() {
    this.currentAmbienceTrack = null;
    try {
      this.mainAmbienceSource?.stop();
      this.mainAmbienceSource?.disconnect();
    } catch {}
    try {
      this.streamAmbienceSource?.stop();
      this.streamAmbienceSource?.disconnect();
    } catch {}
    this.mainAmbienceSource = null;
    this.mainAmbienceGain = null;
    this.streamAmbienceSource = null;
    this.streamAmbienceGain = null;
    this.streamAmbiencePanner = null;
  }

  public startDrivingLoops(vehicleType: VehicleType) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxBusGain) return;
    this.stopDrivingLoops();

    this.drivingLoopsActive = true;
    this.engineVehicleType = vehicleType;

    // Player engine loop
    const engId = vehicleType === 'bike' ? 'engine-bike-loop' : 'engine-car-loop';
    const engBuf = this.buffers.get(engId);
    if (engBuf) {
      const src = ctx.createBufferSource();
      src.buffer = engBuf;
      src.loop = true;
      src.playbackRate.value = 0.7;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;

      const gain = ctx.createGain();
      gain.gain.value = 0.16;

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxBusGain);
      src.start();

      this.engineSource = src;
      this.engineFilter = filter;
      this.engineGain = gain;
    }

    // Skid loop
    const skidBuf = this.buffers.get('skid-loop');
    if (skidBuf) {
      const src = ctx.createBufferSource();
      src.buffer = skidBuf;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(this.sfxBusGain);
      src.start();
      this.skidSource = src;
      this.skidGain = gain;
    }

    // Gravel off-road loop
    const gravelBuf = this.buffers.get('gravel-loop');
    if (gravelBuf) {
      const src = ctx.createBufferSource();
      src.buffer = gravelBuf;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(this.sfxBusGain);
      src.start();
      this.gravelSource = src;
      this.gravelGain = gain;
    }

    // Wind loop
    const windBuf = this.buffers.get('wind-loop');
    if (windBuf) {
      const src = ctx.createBufferSource();
      src.buffer = windBuf;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(this.sfxBusGain);
      src.start();
      this.windSource = src;
      this.windGain = gain;
    }

    // 4 AI positional engine slots
    this.aiSlots = [];
    const carBuf = this.buffers.get('engine-car-loop');
    if (carBuf) {
      for (let i = 0; i < 4; i++) {
        const src = ctx.createBufferSource();
        src.buffer = carBuf;
        src.loop = true;
        src.playbackRate.value = 0.8;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 950;

        const gain = ctx.createGain();
        gain.gain.value = 0;

        const panner = ctx.createStereoPanner();
        panner.pan.value = 0;

        src.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.sfxBusGain);
        src.start();

        this.aiSlots.push({
          source: src,
          gain,
          panner,
          filter,
          currentType: 'car',
        });
      }
    }
  }

  public stopDrivingLoops() {
    this.drivingLoopsActive = false;
    const stopNode = (node: AudioBufferSourceNode | null) => {
      try {
        node?.stop();
        node?.disconnect();
      } catch {}
    };
    stopNode(this.engineSource);
    stopNode(this.skidSource);
    stopNode(this.gravelSource);
    stopNode(this.windSource);
    this.engineSource = null;
    this.skidSource = null;
    this.gravelSource = null;
    this.windSource = null;

    for (const slot of this.aiSlots) {
      stopNode(slot.source);
    }
    this.aiSlots = [];
  }

  public setPauseMuffle(paused: boolean) {
    this.isPausedMuffle = paused;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (paused) {
      this.engineGain?.gain.setTargetAtTime(0, now, 0.05);
      this.skidGain?.gain.setTargetAtTime(0, now, 0.05);
      this.gravelGain?.gain.setTargetAtTime(0, now, 0.05);
      this.windGain?.gain.setTargetAtTime(0, now, 0.05);
      for (const s of this.aiSlots) s.gain.gain.setTargetAtTime(0, now, 0.05);
      this.musicFilter?.frequency.setTargetAtTime(550, now, 0.12);
    } else {
      this.updateFlowMix(this.calmLevel, this.rushLevel);
    }
  }

  public updateFlowMix(calm: number, rush: number) {
    this.calmLevel = calm;
    this.rushLevel = rush;
    if (!this.ctx || this.isPausedMuffle) return;
    const now = this.ctx.currentTime;

    // Calm = softer & filtered (around 2200 Hz), Rush = open & bright (up to 18000 Hz)
    const calmNorm = calm / 100;
    const rushNorm = rush / 100;
    const cutoff = 3200 - calmNorm * 1400 + rushNorm * 13500;
    this.musicFilter?.frequency.setTargetAtTime(Math.max(900, Math.min(18000, cutoff)), now, 0.1);

    if (this.currentMusicGain) {
      const targetMusicGain = 0.78 - calmNorm * 0.1 + rushNorm * 0.18;
      this.currentMusicGain.gain.setTargetAtTime(targetMusicGain, now, 0.15);
    }

    if (this.mainAmbienceGain) {
      // Calm boosts birdsong/ambience gently
      const targetAmb = 0.72 + calmNorm * 0.25 - rushNorm * 0.15;
      this.mainAmbienceGain.gain.setTargetAtTime(Math.max(0.3, targetAmb), now, 0.15);
    }
  }

  /**
   * Updates continuous vehicle loops each frame (allocation-free)
   */
  public updateVehicleAudio(params: {
    rpmNorm: number; // 0..1
    throttle: number; // 0..1
    speedKmh: number;
    slipRatio: number; // 0..1
    isOffRoad: boolean;
    waterProximity: number; // 0..1
    waterPan: number; // -1..1
    nearestAIs?: { dist: number; pan: number; relVelMpS: number; rpmNorm: number }[];
  }) {
    if (!this.ctx || !this.drivingLoopsActive || this.isPausedMuffle) return;
    const now = this.ctx.currentTime;
    const rushNorm = this.rushLevel / 100;

    // Engine pitch & tone (kept soft and warm, never harsh)
    if (this.engineSource && this.engineGain && this.engineFilter) {
      const maxRate = this.engineVehicleType === 'bike' ? 2.3 : 2.6;
      const rate = 0.6 + Math.max(0, Math.min(1, params.rpmNorm)) * (maxRate - 0.6);
      this.engineSource.playbackRate.setTargetAtTime(rate, now, 0.04);

      const cutoff = 750 + params.throttle * 1400 + params.rpmNorm * 800;
      this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.05);

      const gain = 0.14 + params.throttle * 0.12 + rushNorm * 0.06;
      this.engineGain.gain.setTargetAtTime(gain, now, 0.05);
    }

    // Tyre skid loop (soft volume)
    if (this.skidGain) {
      const skidVol = params.slipRatio > 0.15 ? Math.min(0.28, (params.slipRatio - 0.15) * 0.35) : 0;
      this.skidGain.gain.setTargetAtTime(skidVol, now, 0.05);
    }

    // Gravel off-road loop
    if (this.gravelGain) {
      const speedNorm = Math.min(1, params.speedKmh / 140);
      const gravVol = params.isOffRoad ? speedNorm * 0.32 : 0;
      this.gravelGain.gain.setTargetAtTime(gravVol, now, 0.06);
    }

    // Wind loop
    if (this.windSource && this.windGain) {
      const speedNorm = Math.min(1, Math.max(0, (params.speedKmh - 25) / 180));
      const windVol = speedNorm * (0.24 + rushNorm * 0.14);
      this.windGain.gain.setTargetAtTime(windVol, now, 0.08);
      this.windSource.playbackRate.setTargetAtTime(0.85 + speedNorm * 0.45, now, 0.08);
    }

    // Positional stream ambience
    if (this.streamAmbienceGain && this.streamAmbiencePanner) {
      this.streamAmbienceGain.gain.setTargetAtTime(params.waterProximity * 0.55, now, 0.1);
      this.streamAmbiencePanner.pan.setTargetAtTime(
        Math.max(-1, Math.min(1, params.waterPan)),
        now,
        0.1
      );
    }

    // Nearest 4 AI vehicles with distance attenuation + Doppler
    if (params.nearestAIs) {
      for (let i = 0; i < this.aiSlots.length; i++) {
        const slot = this.aiSlots[i];
        const ai = params.nearestAIs[i];
        if (!ai || ai.dist > 65 || !slot.source) {
          slot.gain.gain.setTargetAtTime(0, now, 0.08);
          continue;
        }
        const atten = Math.max(0, 1 - ai.dist / 65);
        const vol = atten * atten * 0.15;
        const doppler = Math.max(0.8, Math.min(1.25, 1 + ai.relVelMpS / 120));
        const baseRate = 0.75 + ai.rpmNorm * 1.3;
        slot.source.playbackRate.setTargetAtTime(baseRate * doppler, now, 0.05);
        slot.panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, ai.pan)), now, 0.05);
        slot.gain.gain.setTargetAtTime(vol, now, 0.06);
      }
    }
  }

  /**
   * Optional runtime layer: soft warm shaker & heartbeat pulse when Rush is high (> 40%)
   */
  private startRushPercussionLoop() {
    if (this.rushBeatTimer !== null) return;
    this.rushBeatTimer = window.setInterval(() => {
      if (
        !this.ctx ||
        this.muted ||
        this.isPausedMuffle ||
        !this.drivingLoopsActive ||
        this.rushLevel < 40 ||
        !this.musicBusGain
      ) {
        return;
      }
      const intensity = Math.min(1, (this.rushLevel - 40) / 60);
      const now = this.ctx.currentTime;
      const step = this.rushStep++ % 4;

      try {
        if (step === 0 || step === 2) {
          // Soft warm low kick pulse
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(95, now);
          osc.frequency.exponentialRampToValueAtTime(38, now + 0.09);
          gain.gain.setValueAtTime(intensity * 0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
          osc.connect(gain);
          gain.connect(this.musicBusGain);
          osc.start(now);
          osc.stop(now + 0.12);
        } else {
          // Gentle high-hat leaf shaker
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(3200 + (step === 3 ? 600 : 0), now);
          gain.gain.setValueAtTime(intensity * 0.02, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
          osc.connect(gain);
          gain.connect(this.musicBusGain);
          osc.start(now);
          osc.stop(now + 0.045);
        }
      } catch {}
    }, 240);
  }
}

export const audioManager = new AudioManager();
