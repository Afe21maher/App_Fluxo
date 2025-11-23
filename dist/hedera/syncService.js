import { Client, PrivateKey, AccountId, TokenId, TransferTransaction, Hbar, AccountBalanceQuery, } from "@hashgraph/sdk";
import { logger } from "../utils/logger";
import { config } from "../config";
export class HederaSyncService {
    constructor() {
        this.client = null;
        this.accountId = null;
        this.privateKey = null;
    }
    async initialize() {
        try {
            if (!config.hedera.accountId || !config.hedera.privateKey) {
                throw new Error("Hedera credentials not configured");
            }
            this.accountId = AccountId.fromString(config.hedera.accountId);
            this.privateKey = PrivateKey.fromString(config.hedera.privateKey);
            // Initialize Hedera client
            if (config.hedera.network === "testnet") {
                this.client = Client.forTestnet();
            }
            else if (config.hedera.network === "mainnet") {
                this.client = Client.forMainnet();
            }
            else {
                throw new Error(`Unknown Hedera network: ${config.hedera.network}`);
            }
            this.client.setOperator(this.accountId, this.privateKey);
            logger.info(`Hedera sync service initialized for ${config.hedera.network}, account: ${this.accountId.toString()}`);
        }
        catch (error) {
            logger.error("Error initializing Hedera sync service:", error);
            throw error;
        }
    }
    /**
     * Syncs a batch of offline transactions to Hedera
     */
    async syncTransactions(transactions) {
        if (!this.client) {
            throw new Error("Hedera client not initialized");
        }
        const results = new Map();
        logger.info(`Syncing ${transactions.length} transactions to Hedera`);
        for (const tx of transactions) {
            try {
                const success = await this.syncSingleTransaction(tx);
                results.set(tx.id, success);
            }
            catch (error) {
                logger.error(`Error syncing transaction ${tx.id}:`, error);
                results.set(tx.id, false);
            }
        }
        const successCount = Array.from(results.values()).filter((r) => r).length;
        logger.info(`Synced ${successCount}/${transactions.length} transactions to Hedera`);
        return results;
    }
    /**
     * Syncs a single transaction to Hedera
     */
    async syncSingleTransaction(tx) {
        if (!this.client || !this.accountId) {
            throw new Error("Hedera client not initialized");
        }
        try {
            // Convert amounts (assuming they're in smallest unit, e.g., tinybars or token units)
            const amount = BigInt(tx.amount);
            if (tx.tokenAddress) {
                // Token transfer
                const tokenId = TokenId.fromString(tx.tokenAddress);
                const transferTx = new TransferTransaction()
                    .addTokenTransfer(tokenId, AccountId.fromString(tx.from), -Number(amount))
                    .addTokenTransfer(tokenId, AccountId.fromString(tx.to), Number(amount))
                    .setTransactionMemo(`Offline payment sync: ${tx.id}`);
                const response = await transferTx.execute(this.client);
                const receipt = await response.getReceipt(this.client);
                logger.info(`Transaction ${tx.id} synced to Hedera, receipt: ${receipt.status}`);
                return receipt.status.toString() === "SUCCESS";
            }
            else {
                // HBAR transfer
                const transferTx = new TransferTransaction()
                    .addHbarTransfer(AccountId.fromString(tx.from), Hbar.fromTinybars(-Number(amount)))
                    .addHbarTransfer(AccountId.fromString(tx.to), Hbar.fromTinybars(Number(amount)))
                    .setTransactionMemo(`Offline payment sync: ${tx.id}`);
                const response = await transferTx.execute(this.client);
                const receipt = await response.getReceipt(this.client);
                logger.info(`Transaction ${tx.id} synced to Hedera, receipt: ${receipt.status}`);
                return receipt.status.toString() === "SUCCESS";
            }
        }
        catch (error) {
            logger.error(`Error syncing transaction ${tx.id} to Hedera:`, error);
            throw error;
        }
    }
    /**
     * Checks if we have internet connection and can sync
     */
    async checkConnection() {
        if (!this.client) {
            return false;
        }
        try {
            // Try to get account balance as a connectivity test
            const balanceQuery = new AccountBalanceQuery().setAccountId(this.accountId);
            const balance = await balanceQuery.execute(this.client);
            return balance !== null;
        }
        catch (error) {
            logger.warn("Hedera connection check failed:", error);
            return false;
        }
    }
    /**
     * Gets the account balance
     */
    async getBalance() {
        if (!this.client || !this.accountId) {
            throw new Error("Hedera client not initialized");
        }
        try {
            const balanceQuery = new AccountBalanceQuery().setAccountId(this.accountId);
            const balance = await balanceQuery.execute(this.client);
            return BigInt(balance.hbars.toTinybars().toString());
        }
        catch (error) {
            logger.error("Error getting Hedera balance:", error);
            throw error;
        }
    }
    async close() {
        if (this.client) {
            await this.client.close();
            logger.info("Hedera sync service closed");
        }
    }
}
//# sourceMappingURL=syncService.js.map