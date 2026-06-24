// Procedural synthwave music engine (WebAudio). No external assets.
// A small playlist of tracks (chord progressions + tempo). Bass + arp + pad + drums.

export interface Track { name: string; bpm: number; chords: number[][]; }

const TRACKS: Track[] = [
  { name: "NEON DRIVE", bpm: 100, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [50, 55, 59]] },
  { name: "SUNSET CRUISE", bpm: 90, chords: [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]] },
  { name: "MIAMI HEAT", bpm: 112, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]] },
  { name: "MIDNIGHT RUN", bpm: 104, chords: [[55, 58, 62], [50, 53, 57], [57, 60, 64], [52, 55, 59]] },
  { name: "PALM BOULEVARD", bpm: 96, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 55, 59]] },
];

function mtof(m: number): number { return 440 * Math.pow(2, (m - 69) / 12); }

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  trackIndex = 0;
  playing = false;
  volume = 0.45;
  muted = false;

  get track(): Track { return TRACKS[this.trackIndex]; }
  get trackName(): string { return this.track.name; }

  private ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      // noise buffer for drums
      const len = this.ctx.sampleRate * 0.4;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch { /* audio unavailable */ }
  }

  play() {
    this.ensure();
    if (!this.ctx || !this.master) return;
    this.ctx.resume();
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = window.setInterval(() => this.scheduler(), 25);
  }

  pause() {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  toggle() { this.playing ? this.pause() : this.play(); }

  next() {
    this.trackIndex = (this.trackIndex + 1) % TRACKS.length;
    if (this.playing) { this.pause(); this.step = 0; this.play(); }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(m ? 0 : this.volume, this.ctx.currentTime);
  }

  private scheduler() {
    if (!this.ctx) return;
    const spb = 60 / this.track.bpm / 2; // seconds per 1/8 step
    while (this.nextTime < this.ctx.currentTime + 0.2) {
      this.scheduleStep(this.step, this.nextTime);
      this.step++;
      this.nextTime += spb;
    }
  }

  private scheduleStep(step: number, t: number) {
    const ch = this.track.chords;
    const bar = Math.floor(step / 8) % ch.length;
    const chord = ch[bar];
    const s = step % 8;

    // bass — quarter notes
    if (s % 2 === 0) this.osc("sawtooth", mtof(chord[0] - 24), t, 0.26, 0.32, 600);
    // arp — every 1/8
    this.osc("square", mtof(chord[s % chord.length] + 12), t, 0.16, 0.14, 2600);
    // pad — once per bar, sustained
    if (s === 0) {
      for (const n of chord) {
        this.osc("sawtooth", mtof(n), t, spbBar(this.track.bpm), 0.05, 1400, 0.02);
        this.osc("sawtooth", mtof(n) * 1.005, t, spbBar(this.track.bpm), 0.05, 1400, 0.02);
      }
    }
    // drums
    if (s === 0 || s === 4) this.kick(t);
    if (s === 2 || s === 6) this.snare(t);
    this.hat(t, s % 2 === 0 ? 0.05 : 0.08);
  }

  private osc(type: OscillatorType, freq: number, t: number, dur: number, peak: number, filt: number, attack = 0.008) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filt;
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  private kick(t: number) {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator(); o.type = "sine";
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.2);
  }
  private snare(t: number) { this.noiseBurst(t, 0.18, 1800, 0.22); }
  private hat(t: number, peak: number) { this.noiseBurst(t, 0.04, 7000, peak); }

  private noiseBurst(t: number, dur: number, filt: number, peak: number) {
    if (!this.ctx || !this.master || !this.noise) return;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = filt;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  dispose() { this.pause(); try { this.ctx?.close(); } catch { /* */ } this.ctx = null; }
}

function spbBar(bpm: number): number { return (60 / bpm) * 2; } // ~1 bar of 4 beats
