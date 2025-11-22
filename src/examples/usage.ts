/**
 * Example usage of the Offline Mesh Payments system
 * 
 * This file demonstrates how to use the payment service
 * to create offline payments and interact with the mesh network
 */

import { OfflineMeshPaymentsApp } from "../index";

async function exampleUsage() {
  // Initialize the application
  const app = new OfflineMeshPaymentsApp();
  await app.initialize();

  const paymentService = app.getPaymentService();
  const meshNetwork = app.getMeshNetwork();

  console.log("=== Offline Mesh Payments Example ===\n");

  // Example 1: Create an offline payment
  console.log("1. Creating offline payment...");
  try {
    const tx = await paymentService.createOfflinePayment(
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // Recipient address
      "1000000000000000000", // 1 token (18 decimals)
      undefined // Token address (undefined = native token/HBAR)
    );
    console.log(`✅ Payment created: ${tx.id}`);
    console.log(`   From: ${tx.from}`);
    console.log(`   To: ${tx.to}`);
    console.log(`   Amount: ${tx.amount}`);
    console.log(`   Status: ${tx.status}\n`);
  } catch (error) {
    console.error("Error creating payment:", error);
  }

  // Example 2: Create a payment request
  console.log("2. Creating payment request...");
  try {
    const request = await paymentService.createPaymentRequest(
      "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      "500000000000000000", // 0.5 tokens
      undefined,
      "Payment for services"
    );
    console.log(`✅ Payment request created: ${request.id}`);
    console.log(`   To: ${request.to}`);
    console.log(`   Amount: ${request.amount}`);
    console.log(`   Message: ${request.message}\n`);
  } catch (error) {
    console.error("Error creating payment request:", error);
  }

  // Example 3: Get pending transactions
  console.log("3. Getting pending transactions...");
  try {
    const transactions = await paymentService.getTransactions();
    console.log(`✅ Found ${transactions.length} pending transactions`);
    transactions.forEach((tx) => {
      console.log(`   - ${tx.id}: ${tx.amount} from ${tx.from} to ${tx.to}`);
    });
    console.log();
  } catch (error) {
    console.error("Error getting transactions:", error);
  }

  // Example 4: Check mesh network status
  console.log("4. Mesh network status...");
  try {
    const peers = meshNetwork.getConnectedPeers();
    console.log(`✅ Connected to ${peers.length} peers`);
    console.log(`   Peer ID: ${meshNetwork.getPeerId()}`);
    peers.forEach((peer) => {
      console.log(`   - ${peer.peerId} (${peer.isOnline ? "online" : "offline"})`);
    });
    console.log();
  } catch (error) {
    console.error("Error getting mesh status:", error);
  }

  // Keep the app running
  console.log("Application is running. Press Ctrl+C to exit.");
}

// Run the example
if (require.main === module) {
  exampleUsage().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { exampleUsage };

