import { logger } from "./utils/logger";
import { config } from "./config";
import { showAppBanner } from "./utils/banners";
import { MeshNetwork } from "./mesh/meshNetwork";
import { EVVMFisher } from "./evvm/fisher";
import { HederaSyncService } from "./hedera/syncService";
// XMTP will be imported dynamically if needed
import { OfflineStorage } from "./storage/offlineStorage";
import { SyncManager } from "./sync/syncManager";
import { PaymentService } from "./services/paymentService";
class OfflineMeshPaymentsApp {
    async initialize() {
        try {
            showAppBanner();
            logger.info("Initializing Offline Mesh Payments Application...");
            // Initialize storage
            logger.info("Initializing offline storage...");
            this.storage = new OfflineStorage();
            // Initialize mesh network
            logger.info("Initializing mesh network...");
            this.meshNetwork = new MeshNetwork();
            await this.meshNetwork.start();
            // Initialize EVVM Fisher (optional)
            if (config.evvm.sepoliaRpcUrl) {
                logger.info("Initializing EVVM Fisher...");
                this.evvmFisher = new EVVMFisher();
                await this.evvmFisher.initialize();
            }
            else {
                logger.warn("EVVM not configured (SEPOLIA_RPC_URL missing), skipping EVVM initialization");
                this.evvmFisher = null;
            }
            // Initialize Hedera sync service (optional)
            if (config.hedera.accountId && config.hedera.privateKey) {
                logger.info("Initializing Hedera sync service...");
                this.hederaSync = new HederaSyncService();
                await this.hederaSync.initialize();
            }
            else {
                logger.warn("Hedera credentials not configured, skipping Hedera initialization");
                this.hederaSync = null;
            }
            // Initialize XMTP messaging (optional)
            if (config.xmtp.privateKey) {
                try {
                    logger.info("Initializing XMTP messaging...");
                    const { XMTPMessaging } = await import("./xmtp/messaging.js");
                    this.xmtpMessaging = new XMTPMessaging();
                    await this.xmtpMessaging.initialize();
                }
                catch (error) {
                    logger.warn("Could not initialize XMTP, continuing without it:", error);
                    this.xmtpMessaging = null;
                }
            }
            else {
                logger.warn("XMTP private key not configured, skipping XMTP initialization");
                // Create a dummy XMTP instance for now
                this.xmtpMessaging = null;
            }
            // Initialize sync manager (only if Hedera is available)
            if (this.hederaSync) {
                logger.info("Initializing sync manager...");
                this.syncManager = new SyncManager(this.storage, this.hederaSync);
            }
            else {
                logger.warn("Sync manager not initialized (Hedera not available)");
                this.syncManager = null;
            }
            // Initialize payment service
            logger.info("Initializing payment service...");
            const walletPrivateKey = config.evvm.sepoliaPrivateKey || config.xmtp.privateKey;
            this.paymentService = new PaymentService(this.meshNetwork, this.evvmFisher, this.storage, this.xmtpMessaging, this.syncManager, walletPrivateKey);
            // Start auto-sync (only if sync manager is available)
            if (this.syncManager) {
                this.syncManager.startAutoSync(30000); // Sync every 30 seconds
            }
            logger.info("✅ Application initialized successfully!");
            logger.info(`Mesh Peer ID: ${this.meshNetwork.getPeerId()}`);
            logger.info(`Wallet Address: ${this.paymentService.getAddress()}`);
            logger.info(`Connected Peers: ${this.meshNetwork.getConnectedPeers().length}`);
        }
        catch (error) {
            logger.error("Error initializing application:", error);
            throw error;
        }
    }
    getPaymentService() {
        return this.paymentService;
    }
    getMeshNetwork() {
        return this.meshNetwork;
    }
    getSyncManager() {
        return this.syncManager || null;
    }
    async shutdown() {
        logger.info("Shutting down application...");
        if (this.syncManager) {
            this.syncManager.stopAutoSync();
        }
        await this.meshNetwork.stop();
        if (this.hederaSync) {
            await this.hederaSync.close();
        }
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
    }
    catch (error) {
        logger.error("Fatal error:", error);
        process.exit(1);
    }
}
// Run if this is the main module (not when imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts')) {
    main();
}
export { OfflineMeshPaymentsApp };
//# sourceMappingURL=index.js.map