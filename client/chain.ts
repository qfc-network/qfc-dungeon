// QFC Chain Integration for AI Dungeon
// Handles wallet connection, on-chain seed, and leaderboard submission

const QFC_RPC = "https://rpc.testnet.qfc.network";
const CHAIN_ID = 9000;
const LEADERBOARD_ADDRESS = "0xE5e2956eEEfD3374A2C67640F429114e52639f4c";

const LEADERBOARD_ABI = [
  "function submitRun(uint256 score, uint8 floor, uint16 turns, uint256 seed) external",
  "function getSeed() external view returns (uint256)",
  "event RunCompleted(address indexed player, uint256 score, uint8 floor, uint16 turns, uint256 seed)",
  "event NewHighScore(address indexed player, uint256 score)"
];

interface WalletState {
  connected: boolean;
  address: string | null;
  balance: string | null;
  provider: any | null;
  signer: any | null;
}

let walletState: WalletState = {
  connected: false,
  address: null,
  balance: null,
  provider: null,
  signer: null,
};

// Check if MetaMask or similar wallet is available
export function hasWallet(): boolean {
  return typeof (window as any).ethereum !== "undefined";
}

// Connect wallet via MetaMask
export async function connectWallet(): Promise<WalletState> {
  const { ethers } = await import("ethers");
  
  if (hasWallet()) {
    // MetaMask path
    const ethereum = (window as any).ethereum;
    
    // Request account access
    await ethereum.request({ method: "eth_requestAccounts" });
    
    // Switch to QFC network
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x" + CHAIN_ID.toString(16) }],
      });
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x" + CHAIN_ID.toString(16),
            chainName: "QFC Testnet",
            rpcUrls: [QFC_RPC],
            nativeCurrency: { name: "QFC", symbol: "QFC", decimals: 18 },
          }],
        });
      }
    }
    
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const balance = ethers.formatEther(await provider.getBalance(address));
    
    walletState = { connected: true, address, balance, provider, signer };
  } else {
    // Fallback: connect to QFC RPC directly (read-only, or prompt for private key)
    const provider = new ethers.JsonRpcProvider(QFC_RPC);
    walletState = { connected: false, address: null, balance: null, provider, signer: null };
  }
  
  return walletState;
}

// Connect with private key (for testnet without MetaMask)
export async function connectWithKey(privateKey: string): Promise<WalletState> {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(QFC_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = wallet.address;
  const balance = ethers.formatEther(await provider.getBalance(address));
  
  walletState = { connected: true, address, balance, provider, signer: wallet };
  return walletState;
}

export function getWalletState(): WalletState {
  return walletState;
}

// Get on-chain seed (block hash) for verifiable randomness
export async function getChainSeed(): Promise<bigint> {
  const { ethers } = await import("ethers");
  const provider = walletState.provider || new ethers.JsonRpcProvider(QFC_RPC);
  const block = await provider.getBlock("latest");
  return BigInt(block.hash);
}

// Submit dungeon run to on-chain leaderboard
export async function submitRunOnChain(
  score: number,
  floor: number,
  turns: number,
  seed: bigint
): Promise<{ txHash: string; success: boolean }> {
  if (!walletState.signer) {
    throw new Error("Wallet not connected");
  }
  
  const { ethers } = await import("ethers");
  const contract = new ethers.Contract(LEADERBOARD_ADDRESS, LEADERBOARD_ABI, walletState.signer);
  
  try {
    const tx = await contract.submitRun(score, floor, turns, seed);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, success: receipt.status === 1 };
  } catch (error: any) {
    console.error("Chain submission failed:", error);
    return { txHash: "", success: false };
  }
}

// Get chain info for display
export async function getChainInfo(): Promise<{ blockNumber: number; chainId: number }> {
  const { ethers } = await import("ethers");
  const provider = walletState.provider || new ethers.JsonRpcProvider(QFC_RPC);
  const blockNumber = await provider.getBlockNumber();
  return { blockNumber, chainId: CHAIN_ID };
}
