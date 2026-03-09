import { GameState, LeaderboardEntry } from "./types";

const BASE = "/api";

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(BASE + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function newGame(): Promise<GameState> {
  return post("/new", {});
}

export async function move(gameId: string, dx: number, dy: number): Promise<GameState> {
  return post("/move", { gameId, dx, dy });
}

export async function useItem(gameId: string, itemId: string): Promise<GameState> {
  return post("/use-item", { gameId, itemId });
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(BASE + "/leaderboard");
  return res.json();
}
