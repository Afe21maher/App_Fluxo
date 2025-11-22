import { ethers } from "hardhat";
import { logger } from "../src/utils/logger";

async function main() {
  console.log("Deploying OfflinePaymentSync contract to Hedera...");

  // Get the contract factory
  const OfflinePaymentSync = await ethers.getContractFactory(
    "OfflinePaymentSync"
  );

  // Deploy the contract
  console.log("Deploying contract...");
  const contract = await OfflinePaymentSync.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`✅ Contract deployed to: ${address}`);

  // Verify on Hashscan (manual step)
  console.log("\n📝 Next steps:");
  console.log(`1. Verify contract on Hashscan: https://hashscan.io/${network.name}/contract/${address}`);
  console.log(`2. Update .env with: HEDERA_SYNC_CONTRACT_ADDRESS=${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

