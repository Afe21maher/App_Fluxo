import { Level } from "level";
import { logger } from "../utils/logger";
export class OfflineStorage {
    constructor(dbPath = "./data/offline-storage") {
        this.db = new Level(dbPath, { valueEncoding: "json" });
        logger.info(`Offline storage initialized at ${dbPath}`);
    }
    async saveTransaction(tx) {
        try {
            await this.db.put(`tx:${tx.id}`, tx);
            await this.addToPendingIndex(tx.id);
            logger.debug(`Transaction ${tx.id} saved to offline storage`);
        }
        catch (error) {
            logger.error(`Error saving transaction ${tx.id}:`, error);
            throw error;
        }
    }
    async getTransaction(txId) {
        try {
            const tx = await this.db.get(`tx:${txId}`);
            return tx;
        }
        catch (error) {
            if (error.code === "LEVEL_NOT_FOUND") {
                return null;
            }
            logger.error(`Error getting transaction ${txId}:`, error);
            throw error;
        }
    }
    async getPendingTransactions() {
        try {
            const pendingIds = await this.getPendingTransactionIds();
            const transactions = [];
            for (const id of pendingIds) {
                const tx = await this.getTransaction(id);
                if (tx && tx.status === "pending") {
                    transactions.push(tx);
                }
            }
            return transactions;
        }
        catch (error) {
            logger.error("Error getting pending transactions:", error);
            return [];
        }
    }
    async updateTransactionStatus(txId, status) {
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
        }
        catch (error) {
            logger.error(`Error updating transaction status ${txId}:`, error);
            throw error;
        }
    }
    async addToPendingIndex(txId) {
        try {
            const pending = await this.getPendingTransactionIds();
            if (!pending.includes(txId)) {
                pending.push(txId);
                await this.db.put("pending:index", pending);
            }
        }
        catch (error) {
            if (error.code === "LEVEL_NOT_FOUND") {
                await this.db.put("pending:index", [txId]);
            }
            else {
                throw error;
            }
        }
    }
    async removeFromPendingIndex(txId) {
        try {
            const pending = await this.getPendingTransactionIds();
            const filtered = pending.filter((id) => id !== txId);
            await this.db.put("pending:index", filtered);
        }
        catch (error) {
            logger.error("Error removing from pending index:", error);
        }
    }
    async getPendingTransactionIds() {
        try {
            const ids = await this.db.get("pending:index");
            return ids;
        }
        catch (error) {
            if (error.code === "LEVEL_NOT_FOUND") {
                return [];
            }
            throw error;
        }
    }
    async close() {
        await this.db.close();
        logger.info("Offline storage closed");
    }
}
//# sourceMappingURL=offlineStorage.js.map