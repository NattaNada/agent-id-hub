const { ethers } = require("hardhat");

// BSC Mainnet (chain 56). Agent ID contract address is the same on mainnet & testnet.
const AGENT_ID = process.env.AGENT_ID_ADDRESS || "0x60b9262456de011f7d15a54cdd8c48baaa8b022f";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  console.log("Agent ID contract:", AGENT_ID);

  const Hub = await ethers.getContractFactory("AgentIDHub");
  const hub = await Hub.deploy(AGENT_ID);
  await hub.waitForDeployment();
  const address = await hub.getAddress();
  console.log("AgentIDHub deployed to:", address);
  console.log("Verify: npx hardhat verify --network bsc", address, AGENT_ID);
  console.log("Frontend: set CONTRACT_ADDRESS in frontend/config.js to", address);
}

main().catch((e) => { console.error(e); process.exit(1); });
