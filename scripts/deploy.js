const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("═══════════════════════════════════════════");
  console.log("  AgreeMint Escrow — Deployment");
  console.log("═══════════════════════════════════════════");
  console.log("Network:      ", hre.network.name);
  console.log("Chain ID:     ", (await deployer.provider.getNetwork()).chainId.toString());
  console.log("Deployer:     ", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:      ", hre.ethers.formatEther(balance), "ETH");
  console.log("───────────────────────────────────────────");

  if (balance === 0n) {
    console.error("\n❌ Deployer has 0 ETH. Fund it first!");
    console.log("   Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
    console.log("   Or:     https://faucet.quicknode.com/base/sepolia");
    process.exit(1);
  }

  // Use deployer address as the platform wallet (receives fees)
  const platformWallet = deployer.address;

  console.log("Platform Wallet:", platformWallet);
  console.log("Deploying AgreeMintEscrow...\n");

  const AgreeMintEscrow = await hre.ethers.getContractFactory("AgreeMintEscrow");
  const escrow = await AgreeMintEscrow.deploy(platformWallet);

  await escrow.waitForDeployment();
  const contractAddress = await escrow.getAddress();

  console.log("═══════════════════════════════════════════");
  console.log("  ✅ DEPLOYED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════");
  console.log("Contract:     ", contractAddress);
  console.log("Platform fee: ", "0.5%");
  console.log("───────────────────────────────────────────");
  console.log("\nNext steps:");
  console.log(`  1. Add to .env:  ESCROW_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`  2. Update:       ESCROW_RPC_URL=https://sepolia.base.org`);
  console.log(`  3. Update:       ESCROW_CHAIN_ID=84532`);
  console.log("  4. Restart the server");
  console.log("═══════════════════════════════════════════");

  // Write a deployment record
  const fs = require("fs");
  const record = {
    network: hre.network.name,
    chainId: (await deployer.provider.getNetwork()).chainId.toString(),
    contract: contractAddress,
    deployer: deployer.address,
    platformWallet,
    deployedAt: new Date().toISOString(),
    txHash: escrow.deploymentTransaction()?.hash || "unknown",
  };
  
  const deploymentsDir = "./deployments";
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);
  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}.json`,
    JSON.stringify(record, null, 2)
  );
  console.log(`\nDeployment record saved to deployments/${hre.network.name}.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
