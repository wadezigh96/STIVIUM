/**
 * Deploy AgentRegistry to BNB testnet (or mainnet).
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network bscTestnet
 *   npx hardhat run scripts/deploy.js --network bsc
 */
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Network :", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Balance :", hre.ethers.formatEther(balance), "BNB");

  const Registry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("\n✅ AgentRegistry deployed at:", address);
  console.log("   Explorer: https://testnet.bscscan.com/address/" + address);
  console.log("\nSave this address in docs or .env as AGENT_REGISTRY_ADDRESS");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
