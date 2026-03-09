import { GameState } from "./types";
import { newGame, move, useItem, getLeaderboard } from "./api";
import { Renderer, MinimapRenderer } from "./Renderer";
import { Sidebar } from "./Sidebar";
import { Input } from "./Input";
import {
  connectWallet as chainConnectWallet,
  connectWithKey,
  getWalletState,
  getChainInfo,
  getChainSeed,
  submitRunOnChain,
} from "./chain";

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
document.getElementById("btn-connect-wallet")?.addEventListener("click", connectWallet);
document.getElementById("btn-submit-chain")?.addEventListener("click", () => submitOnChain("chain-submit-status"));
document.getElementById("btn-submit-chain-victory")?.addEventListener("click", () => submitOnChain("chain-submit-victory-status"));

// Load chain info + leaderboard on start
loadChainInfo();
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
    if (getWalletState().connected) {
      document.getElementById("chain-submit")?.classList.remove("hidden");
    }
    loadLeaderboard();
  } else if (state.status === "victory") {
    const info = document.getElementById("victory-info")!;
    info.textContent = `Score: ${state.score} | Level ${state.player.level} | ${state.turns} turns`;
    victoryScreen.classList.remove("hidden");
    if (getWalletState().connected) {
      document.getElementById("chain-submit-victory")?.classList.remove("hidden");
    }
    loadLeaderboard();
  }
}

async function loadLeaderboard(): Promise<void> {
  try {
    const entries = await getLeaderboard();
    const tbody = document.getElementById("leaderboard-body")!;
    tbody.innerHTML = "";
    entries.slice(0, 10).forEach((e: any, i: number) => {
      const tr = document.createElement("tr");
      const chainBadge = e.onChain ? '⛓️' : '💾';
      tr.innerHTML = `<td>${i + 1}</td><td>${e.score}</td><td>${e.floor}</td><td>${e.turns}</td><td>${chainBadge}</td>`;
      tbody.appendChild(tr);
    });
  } catch {}
}

// Chain integration
async function loadChainInfo(): Promise<void> {
  try {
    const info = await getChainInfo();
    const el = document.getElementById("chain-block");
    if (el) el.textContent = `#${info.blockNumber}`;
  } catch {}
}

async function connectWallet(): Promise<void> {
  const statusEl = document.getElementById("wallet-info")!;
  const btnEl = document.getElementById("btn-connect-wallet")!;

  try {
    if (typeof (window as any).ethereum !== "undefined") {
      await chainConnectWallet();
    } else {
      const key = prompt("No MetaMask detected.\nEnter testnet private key (0x...):");
      if (!key) return;
      await connectWithKey(key);
    }

    const ws = getWalletState();
    if (!ws.connected || !ws.address) return;

    document.getElementById("wallet-addr")!.textContent =
      ws.address.slice(0, 6) + "..." + ws.address.slice(-4);
    document.getElementById("wallet-bal")!.textContent =
      parseFloat(ws.balance || "0").toFixed(2);
    statusEl.classList.remove("hidden");
    btnEl.textContent = "✅ Connected";
    btnEl.style.background = "#1a3a1a";
  } catch (err: any) {
    alert("Wallet connection failed: " + (err.message || err));
  }
}

async function submitOnChain(statusElId: string): Promise<void> {
  const ws = getWalletState();
  if (!state || !ws.connected || !ws.address) return;

  const statusEl = document.getElementById(statusElId)!;
  statusEl.textContent = "⏳ Submitting to QFC chain...";
  statusEl.style.color = "#ffa500";

  try {
    const seed = await getChainSeed();
    const result = await submitRunOnChain(state.score, state.floor, state.turns, seed);

    if (result.success) {
      statusEl.textContent = `✅ On-chain! TX: ${result.txHash.slice(0, 14)}...`;
      statusEl.style.color = "#6e6";

      // Also submit to server with chain proof
      await fetch("/api/submit-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: state.id,
          walletAddress: ws.address,
          txHash: result.txHash,
        }),
      });

      loadLeaderboard();
    } else {
      statusEl.textContent = "❌ Transaction failed on-chain";
      statusEl.style.color = "#e44";
    }
  } catch (err: any) {
    statusEl.textContent = `❌ Failed: ${err.message?.slice(0, 60) || "Unknown error"}`;
    statusEl.style.color = "#e44";
  }
}

// Animation loop
function animLoop(): void {
  if (state) {
    renderer.render(state);
  }
  requestAnimationFrame(animLoop);
}
animLoop();
