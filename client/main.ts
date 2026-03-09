import { GameState } from "./types";
import { newGame, move, useItem, getLeaderboard } from "./api";
import { Renderer, MinimapRenderer } from "./Renderer";
import { Sidebar } from "./Sidebar";
import { Input } from "./Input";

let state: GameState | null = null;
let busy = false;
let walletAddress: string | null = null;
let walletSigner: any = null;

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
    if (walletAddress) {
      document.getElementById("chain-submit")?.classList.remove("hidden");
    }
    loadLeaderboard();
  } else if (state.status === "victory") {
    const info = document.getElementById("victory-info")!;
    info.textContent = `Score: ${state.score} | Level ${state.player.level} | ${state.turns} turns`;
    victoryScreen.classList.remove("hidden");
    if (walletAddress) {
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
    const res = await fetch("/api/chain");
    const data = await res.json();
    const el = document.getElementById("chain-block");
    if (el) el.textContent = `#${data.blockNumber}`;
  } catch {}
}

async function connectWallet(): Promise<void> {
  const statusEl = document.getElementById("wallet-info")!;
  const btnEl = document.getElementById("btn-connect-wallet")!;
  
  try {
    if (typeof (window as any).ethereum !== "undefined") {
      // MetaMask path
      const { ethers } = await import("ethers");
      const ethereum = (window as any).ethereum;
      await ethereum.request({ method: "eth_requestAccounts" });
      
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2328" }],
        });
      } catch (switchErr: any) {
        if (switchErr.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x2328",
              chainName: "QFC Testnet",
              rpcUrls: ["https://rpc.testnet.qfc.network"],
              nativeCurrency: { name: "QFC", symbol: "QFC", decimals: 18 },
            }],
          });
        }
      }
      
      const provider = new ethers.BrowserProvider(ethereum);
      walletSigner = await provider.getSigner();
      walletAddress = await walletSigner.getAddress();
      const balance = ethers.formatEther(await provider.getBalance(walletAddress));
      
      document.getElementById("wallet-addr")!.textContent = walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
      document.getElementById("wallet-bal")!.textContent = parseFloat(balance).toFixed(2);
      statusEl.classList.remove("hidden");
      btnEl.textContent = "✅ Connected";
      btnEl.style.background = "#1a3a1a";
    } else {
      // No MetaMask — prompt for private key (testnet only)
      const key = prompt("No MetaMask detected.\nEnter testnet private key (0x...):");
      if (!key) return;
      
      const { ethers } = await import("ethers");
      const provider = new ethers.JsonRpcProvider("https://rpc.testnet.qfc.network");
      const wallet = new ethers.Wallet(key, provider);
      walletSigner = wallet;
      walletAddress = wallet.address;
      const balance = ethers.formatEther(await provider.getBalance(walletAddress));
      
      document.getElementById("wallet-addr")!.textContent = walletAddress.slice(0, 6) + "..." + walletAddress.slice(-4);
      document.getElementById("wallet-bal")!.textContent = parseFloat(balance).toFixed(2);
      statusEl.classList.remove("hidden");
      btnEl.textContent = "✅ Connected";
      btnEl.style.background = "#1a3a1a";
    }
  } catch (err: any) {
    alert("Wallet connection failed: " + (err.message || err));
  }
}

async function submitOnChain(statusElId: string): Promise<void> {
  if (!state || !walletSigner || !walletAddress) return;
  
  const statusEl = document.getElementById(statusElId)!;
  statusEl.textContent = "⏳ Submitting to QFC chain...";
  statusEl.style.color = "#ffa500";
  
  try {
    const { ethers } = await import("ethers");
    const LEADERBOARD = "0xE5e2956eEEfD3374A2C67640F429114e52639f4c";
    const ABI = ["function submitRun(uint256 score, uint8 floor, uint16 turns, uint256 seed) external"];
    
    const contract = new ethers.Contract(LEADERBOARD, ABI, walletSigner);
    const seed = Date.now(); // Use timestamp as seed for now
    
    const tx = await contract.submitRun(state.score, state.floor, state.turns, seed);
    statusEl.textContent = `⏳ TX sent: ${tx.hash.slice(0, 10)}... waiting...`;
    
    const receipt = await tx.wait();
    statusEl.textContent = `✅ On-chain! Block #${receipt.blockNumber} | TX: ${receipt.hash.slice(0, 14)}...`;
    statusEl.style.color = "#6e6";
    
    // Also submit to server with chain proof
    await fetch("/api/submit-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: state.id,
        walletAddress,
        txHash: receipt.hash,
      }),
    });
    
    loadLeaderboard();
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
