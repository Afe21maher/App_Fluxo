import { logger } from "./utils/logger";
import { config } from "./config";
import { MeshNetwork } from "./mesh/meshNetwork";
import { EVVMFisher } from "./evvm/fisher";
import { HederaSyncService } from "./hedera/syncService";
import { XMTPMessaging } from "./xmtp/messaging";
import { OfflineStorage } from "./storage/offlineStorage";
import { SyncManager } from "./sync/syncManager";
import { PaymentService } from "./services/paymentService";

class OfflineMeshPaymentsApp {
  private meshNetwork!: MeshNetwork;
  private evvmFisher!: EVVMFisher;
  private hederaSync!: HederaSyncService;
  private xmtpMessaging!: XMTPMessaging;
  private storage!: OfflineStorage;
  private syncManager!: SyncManager;
  private paymentService!: PaymentService;

  async initialize(): Promise<void> {
    try {
      logger.info("Initializing Offline Mesh Payments Application...");

      // Initialize storage
      logger.info("Initializing offline storage...");
      this.storage = new OfflineStorage();

      // Initialize mesh network
      logger.info("Initializing mesh network...");
      this.meshNetwork = new MeshNetwork();
      await this.meshNetwork.start();

      // Initialize EVVM Fisher
      logger.info("Initializing EVVM Fisher...");
      this.evvmFisher = new EVVMFisher();
      await this.evvmFisher.initialize();

      // Initialize Hedera sync service
      logger.info("Initializing Hedera sync service...");
      this.hederaSync = new HederaSyncService();
      await this.hederaSync.initialize();

      // Initialize XMTP messaging
      logger.info("Initializing XMTP messaging...");
      this.xmtpMessaging = new XMTPMessaging();
      await this.xmtpMessaging.initialize();

      // Initialize sync manager
      logger.info("Initializing sync manager...");
      this.syncManager = new SyncManager(this.storage, this.hederaSync);

      // Initialize payment service
      logger.info("Initializing payment service...");
      const walletPrivateKey = config.evvm.sepoliaPrivateKey || config.xmtp.privateKey;
      this.paymentService = new PaymentService(
        this.meshNetwork,
        this.evvmFisher,
        this.storage,
        this.xmtpMessaging,
        this.syncManager,
        walletPrivateKey
      );

      // Start auto-sync
      this.syncManager.startAutoSync(30000); // Sync every 30 seconds

      logger.info("✅ Application initialized successfully!");
      logger.info(`Mesh Peer ID: ${this.meshNetwork.getPeerId()}`);
      logger.info(`Wallet Address: ${this.paymentService.getAddress()}`);
      logger.info(`Connected Peers: ${this.meshNetwork.getConnectedPeers().length}`);

    } catch (error) {
      logger.error("Error initializing application:", error);
      throw error;
    }
  }

  getPaymentService(): PaymentService {
    return this.paymentService;
  }

  getMeshNetwork(): MeshNetwork {
    return this.meshNetwork;
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down application...");

    this.syncManager.stopAutoSync();
    await this.meshNetwork.stop();
    await this.hederaSync.close();
    await this.storage.close();

    logger.info("Application shut down complete");
  }
}

// Main execution
async function main() {
  const app = new OfflineMeshPaymentsApp();

  try {
    await app.initialize();

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("Received SIGINT, shutting down...");
      await app.shutdown();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down...");
      await app.shutdown();
      process.exit(0);
    });

    // Example: Create a test payment (uncomment to test)
    // const paymentService = app.getPaymentService();
    // const tx = await paymentService.createOfflinePayment(
    //   "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    //   "1000000000000000000" // 1 token (18 decimals)
    // );
    // logger.info(`Test payment created: ${tx.id}`);

  } catch (error) {
    logger.error("Fatal error:", error);
    process.exit(1);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

export { OfflineMeshPaymentsApp };

