import { Level } from "level";
import { OfflineTransaction } from "../types";
import { logger } from "../utils/logger";

export class OfflineStorage {
  private db: Level<string, any>;

  constructor(dbPath: string = "./data/offline-storage") {
    this.db = new Level(dbPath, { valueEncoding: "json" });
    logger.info(`Offline storage initialized at ${dbPath}`);
  }

  async saveTransaction(tx: OfflineTransaction): Promise<void> {
    try {
      await this.db.put(`tx:${tx.id}`, tx);
      await this.addToPendingIndex(tx.id);
      logger.debug(`Transaction ${tx.id} saved to offline storage`);
    } catch (error) {
      logger.error(`Error saving transaction ${tx.id}:`, error);
      throw error;
    }
  }

  async getTransaction(txId: string): Promise<OfflineTransaction | null> {
    try {
      const tx = await this.db.get(`tx:${txId}`);
      return tx as OfflineTransaction;
    } catch (error: any) {
      if (error.code === "LEVEL_NOT_FOUND") {
        return null;
      }
      logger.error(`Error getting transaction ${txId}:`, error);
      throw error;
    }
  }

  async getPendingTransactions(): Promise<OfflineTransaction[]> {
    try {
      const pendingIds = await this.getPendingTransactionIds();
      const transactions: OfflineTransaction[] = [];

      for (const id of pendingIds) {
        const tx = await this.getTransaction(id);
        if (tx && tx.status === "pending") {
          transactions.push(tx);
        }
      }

      return transactions;
    } catch (error) {
      logger.error("Error getting pending transactions:", error);
      return [];
    }
  }

  async updateTransactionStatus(
    txId: string,
    status: OfflineTransaction["status"]
  ): Promise<void> {
    try {
      const tx = await this.getTransaction(txId);
      if (!tx) {
        throw new Error(`Transaction ${txId} not found`);
      }

      tx.status = status;
      await this.db.put(`tx:${txId}`, tx);

      if (status === "synced") {
        await this.removeFromPendingIndex(txId);
      }

      logger.debug(`Transaction ${txId} status updated to ${status}`);
    } catch (error) {
      logger.error(`Error updating transaction status ${txId}:`, error);
      throw error;
    }
  }

  private async addToPendingIndex(txId: string): Promise<void> {
    try {
      const pending = await this.getPendingTransactionIds();
      if (!pending.includes(txId)) {
        pending.push(txId);
        await this.db.put("pending:index", pending);
      }
    } catch (error: any) {
      if (error.code === "LEVEL_NOT_FOUND") {
        await this.db.put("pending:index", [txId]);
      } else {
        throw error;
      }
    }
  }

  private async removeFromPendingIndex(txId: string): Promise<void> {
    try {
      const pending = await this.getPendingTransactionIds();
      const filtered = pending.filter((id) => id !== txId);
      await this.db.put("pending:index", filtered);
    } catch (error) {
      logger.error("Error removing from pending index:", error);
    }
  }

  private async getPendingTransactionIds(): Promise<string[]> {
    try {
      const ids = await this.db.get("pending:index");
      return ids as string[];
    } catch (error: any) {
      if (error.code === "LEVEL_NOT_FOUND") {
        return [];
      }
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.db.close();
    logger.info("Offline storage closed");
  }
}

