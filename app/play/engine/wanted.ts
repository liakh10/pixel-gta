// Wanted/heat system. heat 0..100 → stars 0..5.
export class Wanted {
  heat = 0;
  level = 0;
  sinceCrime = 999;

  private setLevel() { this.level = Math.min(5, Math.floor(this.heat / 18)); }

  crime(amount: number) {
    this.heat = Math.min(100, this.heat + amount);
    this.sinceCrime = 0;
    this.setLevel();
  }

  hitPed() { this.crime(14); }
  stealCar() { this.crime(7); }
  shoot() { this.crime(5); }
  killCop() { this.crime(28); }
  wreck() { this.crime(16); }

  update(dt: number, beingChased: boolean) {
    this.sinceCrime += dt;
    // decay only after a grace period; faster when not actively chased / out of sight
    if (this.sinceCrime > 3) {
      const rate = beingChased ? 1.2 : 4.5;
      this.heat = Math.max(0, this.heat - rate * dt);
      this.setLevel();
    }
  }

  clear() { this.heat = 0; this.level = 0; }
}
