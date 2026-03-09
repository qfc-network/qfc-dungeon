import { GameState } from "./types";
import { newGame, move, useItem, getLeaderboard } from "./api";
import { Renderer, MinimapRenderer } from "./Renderer";
import { Sidebar } from "./Sidebar";
import { Input } from "./Input";

let state: GameState | null = null;
let busy = false;

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const minimapCanvas = document.getElementById("minimap-canvas") as HTMLCanvasElement;

const renderer = new Renderer(canvas);
const minimap = new MinimapRenderer(minimapCanvas);
const sidebar = new Sidebar(handleUseItem);

new Input(
  canvas,
  handleMove,
  () => state,
  (cx, cy) => renderer.getTileAt(cx, cy)
);

// Screens
const startScreen = document.getElementById("start-screen")!;
const deathScreen = document.getElementById("death-screen")!;
const victoryScreen = document.getElementById("victory-screen")!;

document.getElementById("btn-start")!.addEventListener("click", startGame);
document.getElementById("btn-restart")!.addEventListener("click", startGame);
document.getElementById("btn-victory-restart")!.addEventListener("click", startGame);

// Load leaderboard on start
loadLeaderboard();

async function startGame(): Promise<void> {
  startScreen.classList.add("hidden");
  deathScreen.classList.add("hidden");
  victoryScreen.classList.add("hidden");

  state = await newGame();
  render();
}

async function handleMove(dx: number, dy: number): Promise<void> {
  if (!state || state.status !== "playing" || busy) return;
  busy = true;

  try {
    state = await move(state.id, dx, dy);
    render();
    checkGameEnd();
  } finally {
    busy = false;
  }
}

async function handleUseItem(itemId: string): Promise<void> {
  if (!state || state.status !== "playing" || busy) return;
  busy = true;

  try {
    state = await useItem(state.id, itemId);
    render();
  } finally {
    busy = false;
  }
}

function render(): void {
  if (!state) return;
  renderer.render(state);
  minimap.render(state);
  sidebar.update(state);
}

function checkGameEnd(): void {
  if (!state) return;

  if (state.status === "dead") {
    const info = document.getElementById("death-info")!;
    info.textContent = `Floor ${state.floor} | Score: ${state.score} | Level ${state.player.level}`;
    deathScreen.classList.remove("hidden");
    loadLeaderboard();
  } else if (state.status === "victory") {
    const info = document.getElementById("victory-info")!;
    info.textContent = `Score: ${state.score} | Level ${state.player.level} | ${state.turns} turns`;
    victoryScreen.classList.remove("hidden");
    loadLeaderboard();
  }
}

async function loadLeaderboard(): Promise<void> {
  try {
    const entries = await getLeaderboard();
    const tbody = document.getElementById("leaderboard-body")!;
    tbody.innerHTML = "";
    entries.slice(0, 10).forEach((e, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i + 1}</td><td>${e.score}</td><td>${e.floor}</td><td>${e.turns}</td>`;
      tbody.appendChild(tr);
    });
  } catch {}
}

// Animation loop
function animLoop(): void {
  if (state) {
    renderer.render(state);
  }
  requestAnimationFrame(animLoop);
}
animLoop();
