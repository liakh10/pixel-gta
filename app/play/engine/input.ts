export class Input {
  keys = new Set<string>();
  mouseX = 0; mouseY = 0;
  mouseDown = false;
  private pressed = new Set<string>();   // edge-triggered this frame
  private el: HTMLElement;

  constructor(el: HTMLElement) {
    this.el = el;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    el.addEventListener("mousemove", this.onMouseMove);
    el.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    el.addEventListener("contextmenu", this.onContext);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
    if (!this.keys.has(e.code)) this.pressed.add(e.code);
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);
  private onMouseMove = (e: MouseEvent) => {
    const r = this.el.getBoundingClientRect();
    this.mouseX = e.clientX - r.left;
    this.mouseY = e.clientY - r.top;
  };
  private onMouseDown = (e: MouseEvent) => { if (e.button === 0) this.mouseDown = true; };
  private onMouseUp = () => { this.mouseDown = false; };
  private onContext = (e: Event) => e.preventDefault();

  down(code: string): boolean { return this.keys.has(code); }
  consumePressed(code: string): boolean {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }
  endFrame() { this.pressed.clear(); }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.el.removeEventListener("mousemove", this.onMouseMove);
    this.el.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    this.el.removeEventListener("contextmenu", this.onContext);
  }
}
