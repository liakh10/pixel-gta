export class Camera {
  x = 0; y = 0;            // top-left in world coords
  zoom: number;
  dpr = 1;                 // device pixel ratio (baked into the world transform)
  private shakeT = 0;
  private shakeMag = 0;

  constructor(public viewW: number, public viewH: number, zoom = 2) {
    this.zoom = zoom;
  }

  resize(w: number, h: number) { this.viewW = w; this.viewH = h; }

  shake(mag: number, time = 0.3) { this.shakeMag = Math.max(this.shakeMag, mag); this.shakeT = Math.max(this.shakeT, time); }

  follow(tx: number, ty: number, worldW: number, worldH: number, dt: number, lead = 0) {
    const halfW = this.viewW / (2 * this.zoom);
    const halfH = this.viewH / (2 * this.zoom);
    const targetX = tx - halfW;
    const targetY = ty - halfH;
    const k = 1 - Math.pow(0.001, dt); // smooth follow
    this.x += (targetX - this.x) * k;
    this.y += (targetY - this.y) * k;
    void lead;
    // clamp
    this.x = Math.max(0, Math.min(worldW - this.viewW / this.zoom, this.x));
    this.y = Math.max(0, Math.min(worldH - this.viewH / this.zoom, this.y));
    if (this.shakeT > 0) this.shakeT -= dt;
  }

  applyShakeOffset(): { x: number; y: number } {
    if (this.shakeT <= 0) return { x: 0, y: 0 };
    const m = this.shakeMag * (this.shakeT > 0 ? 1 : 0);
    return { x: (Math.random() - 0.5) * m, y: (Math.random() - 0.5) * m };
  }

  apply(ctx: CanvasRenderingContext2D) {
    const s = this.applyShakeOffset();
    const z = this.zoom * this.dpr;
    ctx.setTransform(z, 0, 0, z, -(this.x + s.x) * z, -(this.y + s.y) * z);
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom };
  }
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y };
  }
}
