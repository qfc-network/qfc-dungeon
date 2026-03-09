import { GameState, Tile } from "./types";

const TILE_SIZE = 40;
const MAP_SIZE = 15;

const COLORS = {
  floor: "#2a2a3a",
  wall: "#1a1a2a",
  door: "#4a3a2a",
  stairs: "#2a3a5a",
  chest: "#5a4a1a",
  trap: "#3a1a1a",
  player: "#1a4a1a",
  monster: "#4a1a1a",
  item: "#4a3a0a",
  fog: "rgba(0,0,0,0.7)",
  unexplored: "#000000",
};

interface Animation {
  type: "attack" | "damage" | "death";
  x: number;
  y: number;
  text?: string;
  frame: number;
  maxFrames: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private animations: Animation[] = [];
  private prevLog: string[] = [];

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 600, 600);

    // Detect new log entries for animations
    this.detectAnimations(state);

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = state.map[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (!tile.explored && !tile.visible) {
          ctx.fillStyle = COLORS.unexplored;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          continue;
        }

        // Base tile color
        ctx.fillStyle = COLORS[tile.type] || COLORS.floor;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

        if (tile.visible) {
          // Draw items
          if (tile.item) {
            ctx.fillStyle = COLORS.item;
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            this.drawEmoji(ctx, tile.item.emoji, px, py);
          }

          // Draw monsters
          if (tile.monster && tile.monster.hp > 0) {
            ctx.fillStyle = COLORS.monster;
            ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            this.drawEmoji(ctx, tile.monster.emoji, px, py);

            // HP bar
            const hpPct = tile.monster.hp / tile.monster.maxHp;
            ctx.fillStyle = "#300";
            ctx.fillRect(px + 4, py + TILE_SIZE - 8, TILE_SIZE - 8, 4);
            ctx.fillStyle = hpPct > 0.5 ? "#0a0" : hpPct > 0.25 ? "#aa0" : "#a00";
            ctx.fillRect(px + 4, py + TILE_SIZE - 8, (TILE_SIZE - 8) * hpPct, 4);
          }

          // Draw tile emoji for special tiles
          if (tile.type === "stairs" && !tile.monster && !tile.item) {
            this.drawEmoji(ctx, "\u{1FA9C}", px, py);
          }
          if (tile.type === "chest") {
            this.drawEmoji(ctx, "\u{1F4E6}", px, py);
          }
          if (tile.type === "trap") {
            this.drawEmoji(ctx, "\u{26A0}\uFE0F", px, py);
          }
        } else {
          // Explored but not visible — fog
          ctx.fillStyle = COLORS.fog;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }

        // Grid lines
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw player
    const pp = state.player;
    const ppx = pp.x * TILE_SIZE;
    const ppy = pp.y * TILE_SIZE;
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(ppx + 2, ppy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    this.drawEmoji(ctx, "\u{1F9D1}\u200D\u{1F4BB}", ppx, ppy);

    // Draw animations
    this.drawAnimations(ctx);
    this.prevLog = [...state.log];
  }

  private drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, px: number, py: number): void {
    ctx.font = "24px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(emoji, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 2);
  }

  private detectAnimations(state: GameState): void {
    const newLogs = state.log.slice(this.prevLog.length);
    for (const msg of newLogs) {
      if (msg.includes("hit") && msg.includes("for")) {
        const dmgMatch = msg.match(/for (\d+) damage/);
        if (dmgMatch) {
          // Show damage number on player if monster hit, otherwise on approximate location
          const isPlayerHit = msg.includes("hits you");
          this.animations.push({
            type: "damage",
            x: isPlayerHit ? state.player.x : state.player.x,
            y: isPlayerHit ? state.player.y : state.player.y,
            text: `-${dmgMatch[1]}`,
            frame: 0,
            maxFrames: 20,
          });
        }
      }
    }
  }

  private drawAnimations(ctx: CanvasRenderingContext2D): void {
    this.animations = this.animations.filter((a) => {
      a.frame++;
      if (a.frame > a.maxFrames) return false;

      const px = a.x * TILE_SIZE + TILE_SIZE / 2;
      const py = a.y * TILE_SIZE - (a.frame * 1.5);
      const alpha = 1 - a.frame / a.maxFrames;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#f44";
      ctx.fillText(a.text || "", px, py);
      ctx.restore();

      return true;
    });
  }

  getTileAt(canvasX: number, canvasY: number): { x: number; y: number } | null {
    const x = Math.floor(canvasX / TILE_SIZE);
    const y = Math.floor(canvasY / TILE_SIZE);
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return null;
    return { x, y };
  }
}

export class MinimapRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    const scale = 150 / MAP_SIZE;
    ctx.clearRect(0, 0, 150, 150);

    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const tile = state.map[y][x];
        if (!tile.explored) {
          ctx.fillStyle = "#000";
        } else if (tile.type === "wall") {
          ctx.fillStyle = "#333";
        } else if (tile.type === "stairs") {
          ctx.fillStyle = "#44f";
        } else {
          ctx.fillStyle = "#555";
        }
        ctx.fillRect(x * scale, y * scale, scale, scale);

        if (tile.visible && tile.monster && tile.monster.hp > 0) {
          ctx.fillStyle = "#f44";
          ctx.fillRect(x * scale + 1, y * scale + 1, scale - 2, scale - 2);
        }
      }
    }

    // Player
    ctx.fillStyle = "#0f0";
    ctx.fillRect(
      state.player.x * scale + 1,
      state.player.y * scale + 1,
      scale - 2,
      scale - 2
    );
  }
}
