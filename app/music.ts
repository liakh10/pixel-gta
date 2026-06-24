// Music player backed by a user-provided audio file in /public/music.
// Same API as before so the player UI keeps working.

interface Track { name: string; src: string; }

const TRACKS: Track[] = [
  { name: "ONLY GIRL IN THE WORLD", src: "/music/theme.mp3" },
];

export class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  trackIndex = 0;
  playing = false;
  volume = 0.6;
  muted = false;

  get trackName(): string { return TRACKS[this.trackIndex].name; }

  private ensure() {
    if (this.audio) return;
    const a = new Audio(TRACKS[this.trackIndex].src);
    a.loop = TRACKS.length === 1;
    a.volume = this.muted ? 0 : this.volume;
    a.addEventListener("ended", () => { if (TRACKS.length > 1) this.next(); });
    this.audio = a;
  }

  play() {
    this.ensure();
    if (!this.audio) return;
    this.audio.play().then(() => { this.playing = true; }).catch(() => { /* autoplay blocked until gesture */ });
    this.playing = true;
  }

  pause() { this.audio?.pause(); this.playing = false; }
  toggle() { this.playing ? this.pause() : this.play(); }

  next() {
    this.trackIndex = (this.trackIndex + 1) % TRACKS.length;
    if (this.audio) {
      this.audio.src = TRACKS[this.trackIndex].src;
      this.audio.currentTime = 0;
      if (this.playing) this.audio.play().catch(() => { /* */ });
    }
  }

  setMuted(m: boolean) { this.muted = m; if (this.audio) this.audio.volume = m ? 0 : this.volume; }
  setVolume(v: number) { this.volume = v; if (this.audio && !this.muted) this.audio.volume = v; }

  dispose() { this.pause(); this.audio = null; }
}
