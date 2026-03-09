import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC = "https://rpc.testnet.qfc.network";
const KEYSTORE_PATH = path.join(process.env.HOME, ".openclaw/qfc-wallets/keystore/0x5be349d95787b0b4135cc4cfee27ad70ac9f3132.json");
const PASSWORD = "qfc-testnet-2026";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const keystore = fs.readFileSync(KEYSTORE_PATH, "utf8");
  const wallet = await ethers.Wallet.fromEncryptedJson(keystore, PASSWORD);
  const deployer = wallet.connect(provider);
  
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await provider.getBalance(deployer.address)), "QFC");
  
  const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "build/contracts_DungeonLeaderboard_sol_DungeonLeaderboard.abi"), "utf8"));
  const bytecode = "0x" + fs.readFileSync(path.join(__dirname, "build/contracts_DungeonLeaderboard_sol_DungeonLeaderboard.bin"), "utf8").trim();
  
  console.log("Deploying DungeonLeaderboard...");
  const factory = new ethers.ContractFactory(abi, bytecode, deployer);
  const contract = await factory.deploy();
  console.log("TX:", contract.deploymentTransaction().hash);
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("✅ DungeonLeaderboard deployed at:", address);
  
  // Save deployment info
  const deployment = {
    contract: "DungeonLeaderboard",
    address,
    deployer: deployer.address,
    chainId: 9000,
    network: "qfc-testnet",
    txHash: contract.deploymentTransaction().hash,
    timestamp: new Date().toISOString()
  };
  fs.writeFileSync(path.join(__dirname, "deployment.json"), JSON.stringify(deployment, null, 2));
  console.log("Deployment info saved to contracts/deployment.json");
  
  // Test: submit a run
  console.log("\nTesting submitRun...");
  const tx = await contract.submitRun(100, 3, 50, 12345);
  await tx.wait();
  console.log("✅ Test run submitted");
  
  const count = await contract.getRunCount();
  console.log("Run count:", count.toString());
  
  const best = await contract.bestScore(deployer.address);
  console.log("Best score:", best.toString());
}

main().catch(console.error);
