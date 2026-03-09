import express from "express";
import path from "path";
import fs from "fs";
import { createGame, handleMove, handleUseItem, getClientState } from "./game";
import { GameState, LeaderboardEntry } from "./types";

const app = express();
const PORT = 3240;

app.use(express.json());

// Serve static files from dist
const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// In-memory game sessions
const games = new Map<string, GameState>();

// Leaderboard persistence
const LB_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || ".",
  ".qfc-dungeon"
);
const LB_FILE = path.join(LB_DIR, "leaderboard.json");

function loadLeaderboard(): LeaderboardEntry[] {
  try {
    if (fs.existsSync(LB_FILE)) {
      return JSON.parse(fs.readFileSync(LB_FILE, "utf-8"));
    }
  } catch {}
  return [];
}

function saveLeaderboard(entries: LeaderboardEntry[]): void {
  if (!fs.existsSync(LB_DIR)) {
    fs.mkdirSync(LB_DIR, { recursive: true });
  }
  fs.writeFileSync(LB_FILE, JSON.stringify(entries, null, 2));
}

// API Routes

app.post("/api/new", (_req, res) => {
  const state = createGame();
  games.set(state.id, state);
  res.json(getClientState(state));
});

app.post("/api/move", (req, res) => {
  const { gameId, dx, dy } = req.body;
  const state = games.get(gameId);
  if (!state) return res.status(404).json({ error: "Game not found" });
  if (typeof dx !== "number" || typeof dy !== "number")
    return res.status(400).json({ error: "Invalid move" });
  if (Math.abs(dx) + Math.abs(dy) !== 1)
    return res.status(400).json({ error: "Invalid move distance" });

  handleMove(state, dx, dy);

  // Auto-save to leaderboard on death/victory
  if (state.status === "dead" || state.status === "victory") {
    addToLeaderboard(state);
  }

  res.json(getClientState(state));
});

app.post("/api/use-item", (req, res) => {
  const { gameId, itemId } = req.body;
  const state = games.get(gameId);
  if (!state) return res.status(404).json({ error: "Game not found" });

  handleUseItem(state, itemId);
  res.json(getClientState(state));
});

app.get("/api/leaderboard", (_req, res) => {
  res.json(loadLeaderboard());
});

function addToLeaderboard(state: GameState, walletAddress?: string, txHash?: string): void {
  const entries = loadLeaderboard();
  entries.push({
    score: state.score,
    floor: state.floor,
    turns: state.turns,
    level: state.player.level,
    date: new Date().toISOString(),
    wallet: walletAddress || null,
    txHash: txHash || null,
    onChain: !!txHash,
  });
  entries.sort((a, b) => b.score - a.score);
  saveLeaderboard(entries.slice(0, 20));
}

// Chain info endpoint
app.get("/api/chain", async (_req, res) => {
  try {
    const response = await fetch("https://rpc.testnet.qfc.network", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", id: 1 }),
    });
    const data = await response.json() as any;
    res.json({
      chainId: 9000,
      blockNumber: parseInt(data.result, 16),
      rpc: "https://rpc.testnet.qfc.network",
      leaderboardContract: "0xE5e2956eEEfD3374A2C67640F429114e52639f4c",
    });
  } catch {
    res.json({ chainId: 9000, blockNumber: 0, error: "RPC unavailable" });
  }
});

// Submit run with optional chain proof
app.post("/api/submit-run", (req, res) => {
  const { gameId, walletAddress, txHash } = req.body;
  const state = games.get(gameId);
  if (!state) return res.status(404).json({ error: "Game not found" });
  if (state.status !== "dead" && state.status !== "victory") {
    return res.status(400).json({ error: "Game still in progress" });
  }
  addToLeaderboard(state, walletAddress, txHash);
  res.json({ success: true, onChain: !!txHash });
});

// SPA fallback
app.get("*", (_req, res) => {
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Build not found. Run: npm run build");
  }
});

app.listen(PORT, () => {
  console.log(`QFC AI Dungeon server running on http://localhost:${PORT}`);
});
