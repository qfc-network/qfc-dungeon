// QFC Chain Integration for AI Dungeon — uses @qfc/chain-sdk
import {
  connectWallet,
  connectWithKey,
  getWalletState,
  getChainInfo,
  getBlockHash,
  getContract,
  sendTx,
  initChainUI,
  type WalletState,
} from "@qfc/chain-sdk";

const LEADERBOARD_ADDRESS = "0xE5e2956eEEfD3374A2C67640F429114e52639f4c";
const LEADERBOARD_ABI = [
  "function submitRun(uint256 score, uint8 floor, uint16 turns, uint256 seed) external",
  "function getSeed() external view returns (uint256)",
  "event RunCompleted(address indexed player, uint256 score, uint8 floor, uint16 turns, uint256 seed)",
  "event NewHighScore(address indexed player, uint256 score)",
];

export async function getChainSeed(): Promise<bigint> {
  return getBlockHash();
}

export async function submitRunOnChain(
  score: number,
  floor: number,
  turns: number,
  seed: bigint
): Promise<{ txHash: string; success: boolean }> {
  const contract = await getContract(LEADERBOARD_ADDRESS, LEADERBOARD_ABI);
  return sendTx(() => contract.submitRun(score, floor, turns, seed));
}

// Re-export SDK functions for main.ts
export { connectWallet, connectWithKey, getWalletState, getChainInfo, initChainUI };
export type { WalletState };
