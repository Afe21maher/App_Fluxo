import { ethers } from "ethers";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
export class PaymentService {
    constructor(meshNetwork, evvmFisher, storage, xmtpMessaging, syncManager, privateKey) {
        this.wallet = null;
        this.meshNetwork = meshNetwork;
        this.evvmFisher = evvmFisher;
        this.storage = storage;
        this.xmtpMessaging = xmtpMessaging;
        this.syncManager = syncManager;
        if (privateKey) {
            // Clean up private key: remove any whitespace and fix common errors
            let cleanedKey = privateKey.trim();
            // Fix common error: 0xOx -> 0x (O instead of 0)
            cleanedKey = cleanedKey.replace(/^0xOx/i, "0x");
            cleanedKey = cleanedKey.replace(/^Ox/i, "0x");
            // Ensure it starts with 0x
            if (!cleanedKey.startsWith("0x")) {
                cleanedKey = "0x" + cleanedKey;
            }
            this.wallet = new ethers.Wallet(cleanedKey);
        }
        this.setupHandlers();
    }
    setupHandlers() {
        // Handle transactions from mesh network
        this.meshNetwork.onTransaction(async (tx) => {
            await this.handleIncomingTransaction(tx);
        });
    }
    /**
     * Creates a payment request
     */
    async createPaymentRequest(to, amount, tokenAddress, message) {
        const request = {
            id: uuidv4(),
            from: this.getAddress(),
            to,
            amount,
            tokenAddress,
            message,
            timestamp: Date.now(),
        };
        logger.info(`Payment request created: ${request.id} to ${to}`);
        // Send via XMTP if available
        if (this.xmtpMessaging) {
            try {
                await this.xmtpMessaging.sendPaymentRequest(to, request);
            }
            catch (error) {
                logger.warn("Could not send payment request via XMTP:", error);
            }
        }
        return request;
    }
    /**
     * Creates and processes an offline payment
     */
    async createOfflinePayment(to, amount, tokenAddress, message) {
        if (!this.wallet) {
            throw new Error("Wallet not initialized");
        }
        const tx = {
            id: uuidv4(),
            from: this.wallet.address,
            to,
            amount,
            tokenAddress,
            timestamp: Date.now(),
            signature: "",
            status: "pending",
            meshNodes: [],
            message,
        };
        // Sign the transaction
        const signMessage = `${tx.from}${tx.to}${tx.amount}${tx.timestamp}`;
        tx.signature = await this.wallet.signMessage(signMessage);
        logger.info(`Offline payment created: ${tx.id} from ${tx.from} to ${to}`);
        // Validate transaction (if EVVM is available)
        if (this.evvmFisher) {
            const isValid = await this.evvmFisher.validateTransaction(tx);
            if (!isValid) {
                throw new Error("Transaction signature validation failed");
            }
        }
        // Save to offline storage
        await this.storage.saveTransaction(tx);
        // Capture in EVVM Fisher (if available)
        if (this.evvmFisher) {
            await this.evvmFisher.captureTransaction(tx);
            // Execute in EVVM (virtual blockchain)
            await this.evvmFisher.executeTransaction(tx.id);
        }
        else {
            logger.warn("EVVM not available, transaction saved but not processed in EVVM");
        }
        // Broadcast to mesh network
        await this.meshNetwork.broadcastTransaction(tx);
        // Send notification via XMTP
        if (this.xmtpMessaging) {
            try {
                await this.xmtpMessaging.sendTransactionNotification(to, tx);
            }
            catch (error) {
                logger.warn("Could not send transaction notification via XMTP:", error);
            }
        }
        // Try to sync immediately if online (only if sync manager is available)
        if (this.syncManager) {
            this.syncManager.syncTransaction(tx.id).catch((error) => {
                logger.debug(`Could not sync transaction ${tx.id} immediately:`, error);
            });
        }
        return tx;
    }
    /**
     * Handles an incoming transaction from the mesh network
     */
    async handleIncomingTransaction(tx) {
        try {
            logger.info(`Handling incoming transaction ${tx.id}`);
            // Validate transaction (if EVVM is available)
            if (this.evvmFisher) {
                const isValid = await this.evvmFisher.validateTransaction(tx);
                if (!isValid) {
                    logger.warn(`Invalid transaction ${tx.id}, ignoring`);
                    return;
                }
            }
            // Check if we've already seen this transaction
            const existing = await this.storage.getTransaction(tx.id);
            if (existing) {
                logger.debug(`Transaction ${tx.id} already processed`);
                return;
            }
            // Save to storage
            await this.storage.saveTransaction(tx);
            // Capture in EVVM Fisher (if available)
            if (this.evvmFisher) {
                await this.evvmFisher.captureTransaction(tx);
                // Execute in EVVM
                await this.evvmFisher.executeTransaction(tx.id);
            }
            // If this transaction is for us, update status
            if (tx.to.toLowerCase() === this.getAddress().toLowerCase()) {
                logger.info(`Received payment: ${tx.amount} from ${tx.from}`);
                // You could emit an event here for the frontend
            }
        }
        catch (error) {
            logger.error(`Error handling incoming transaction ${tx.id}:`, error);
        }
    }
    /**
     * Gets all transactions for the current wallet
     */
    async getTransactions() {
        // In a real implementation, you would filter by wallet address
        // For now, we return all pending transactions
        return await this.storage.getPendingTransactions();
    }
    /**
     * Gets a specific transaction
     */
    async getTransaction(txId) {
        return await this.storage.getTransaction(txId);
    }
    /**
     * Gets the wallet address
     */
    getAddress() {
        if (this.wallet) {
            return this.wallet.address;
        }
        if (this.xmtpMessaging && typeof this.xmtpMessaging.getAddress === 'function') {
            try {
                return this.xmtpMessaging.getAddress();
            }
            catch {
                // Fall through
            }
        }
        return this.meshNetwork.getPeerId();
    }
}
//# sourceMappingURL=paymentService.js.map