// Minimal WebAudio blips. Created lazily on first use (after a user gesture).
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  constructor() {
    try { this.enabled = localStorage.getItem("pixelgta_muted") !== "1"; } catch { /* */ }
  }

  private ac(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); }
      catch { this.enabled = false; return null; }
    }
    return this.ctx;
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    const ac = this.ac(); if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + dur);
  }

  shoot() { this.blip(420, 0.08, "square", 0.06, 120); }
  melee() { this.blip(180, 0.06, "sawtooth", 0.05, 90); }
  crash() { this.blip(90, 0.18, "sawtooth", 0.09, 40); }
  pickup() { this.blip(660, 0.1, "triangle", 0.08, 990); }
  cash() { this.blip(880, 0.12, "triangle", 0.07, 1320); }
  hurt() { this.blip(200, 0.1, "square", 0.07, 80); }
  start() { this.blip(330, 0.12, "triangle", 0.06, 660); }
}
