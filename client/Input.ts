import { GameState } from "./types";

export class Input {
  private onMove: (dx: number, dy: number) => void;
  private getState: () => GameState | null;
  private getTileAt: (cx: number, cy: number) => { x: number; y: number } | null;

  constructor(
    canvas: HTMLCanvasElement,
    onMove: (dx: number, dy: number) => void,
    getState: () => GameState | null,
    getTileAt: (cx: number, cy: number) => { x: number; y: number } | null
  ) {
    this.onMove = onMove;
    this.getState = getState;
    this.getTileAt = getTileAt;

    document.addEventListener("keydown", this.handleKey);
    canvas.addEventListener("click", this.handleClick);
  }

  private handleKey = (e: KeyboardEvent): void => {
    const state = this.getState();
    if (!state || state.status !== "playing") return;

    const key = e.key.toLowerCase();
    switch (key) {
      case "w":
      case "arrowup":
        e.preventDefault();
        this.onMove(0, -1);
        break;
      case "s":
      case "arrowdown":
        e.preventDefault();
        this.onMove(0, 1);
        break;
      case "a":
      case "arrowleft":
        e.preventDefault();
        this.onMove(-1, 0);
        break;
      case "d":
      case "arrowright":
        e.preventDefault();
        this.onMove(1, 0);
        break;
    }
  };

  private handleClick = (e: MouseEvent): void => {
    const state = this.getState();
    if (!state || state.status !== "playing") return;

    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const tile = this.getTileAt(cx, cy);
    if (!tile) return;

    const dx = tile.x - state.player.x;
    const dy = tile.y - state.player.y;

    // Only allow adjacent moves
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      this.onMove(dx, dy);
    }
  };
}
