import { logger } from "../utils/logger";
import { OfflineStorage } from "../storage/offlineStorage";
import { HederaSyncService } from "../hedera/syncService";

export class SyncManager {
  private storage: OfflineStorage;
  private hederaSync: HederaSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  constructor(storage: OfflineStorage, hederaSync: HederaSyncService) {
    this.storage = storage;
    this.hederaSync = hederaSync;
  }

  /**
   * Starts the automatic sync process
   */
  startAutoSync(intervalMs: number = 30000): void {
    if (this.syncInterval) {
      this.stopAutoSync();
    }

    logger.info(`Starting auto-sync with interval ${intervalMs}ms`);

    this.syncInterval = setInterval(() => {
      this.syncPendingTransactions().catch((error) => {
        logger.error("Error in auto-sync:", error);
      });
    }, intervalMs);

    // Do an initial sync
    this.syncPendingTransactions().catch((error) => {
      logger.error("Error in initial sync:", error);
    });
  }

  /**
   * Stops the automatic sync process
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info("Auto-sync stopped");
    }
  }

  /**
   * Manually triggers a sync of pending transactions
   */
  async syncPendingTransactions(): Promise<void> {
    if (this.isSyncing) {
      logger.debug("Sync already in progress, skipping");
      return;
    }

    try {
      this.isSyncing = true;

      // Check if we have internet connection
      const hasConnection = await this.hederaSync.checkConnection();
      if (!hasConnection) {
        logger.debug("No internet connection, skipping sync");
        return;
      }

      // Get pending transactions
      const pendingTxs = await this.storage.getPendingTransactions();
      if (pendingTxs.length === 0) {
        logger.debug("No pending transactions to sync");
        return;
      }

      logger.info(`Syncing ${pendingTxs.length} pending transactions`);

      // Update status to confirmed before syncing
      for (const tx of pendingTxs) {
        await this.storage.updateTransactionStatus(tx.id, "confirmed");
      }

      // Sync to Hedera
      const results = await this.hederaSync.syncTransactions(pendingTxs);

      // Update transaction statuses based on results
      for (const [txId, success] of results.entries()) {
        if (success) {
          await this.storage.updateTransactionStatus(txId, "synced");
          logger.info(`Transaction ${txId} successfully synced`);
        } else {
          await this.storage.updateTransactionStatus(txId, "failed");
          logger.warn(`Transaction ${txId} failed to sync`);
        }
      }

      const successCount = Array.from(results.values()).filter((r) => r).length;
      logger.info(
        `Sync completed: ${successCount}/${pendingTxs.length} transactions synced`
      );
    } catch (error) {
      logger.error("Error syncing pending transactions:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Syncs a single transaction immediately
   */
  async syncTransaction(txId: string): Promise<boolean> {
    try {
      const tx = await this.storage.getTransaction(txId);
      if (!tx) {
        throw new Error(`Transaction ${txId} not found`);
      }

      if (tx.status === "synced") {
        logger.debug(`Transaction ${txId} already synced`);
        return true;
      }

      // Check connection
      const hasConnection = await this.hederaSync.checkConnection();
      if (!hasConnection) {
        throw new Error("No internet connection");
      }

      // Update status
      await this.storage.updateTransactionStatus(tx.id, "confirmed");

      // Sync to Hedera
      const results = await this.hederaSync.syncTransactions([tx]);
      const success = results.get(txId) || false;

      if (success) {
        await this.storage.updateTransactionStatus(txId, "synced");
        logger.info(`Transaction ${txId} successfully synced`);
      } else {
        await this.storage.updateTransactionStatus(txId, "failed");
        logger.warn(`Transaction ${txId} failed to sync`);
      }

      return success;
    } catch (error) {
      logger.error(`Error syncing transaction ${txId}:`, error);
      return false;
    }
  }
}

