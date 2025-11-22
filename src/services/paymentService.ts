import { ethers } from "ethers";
import { logger } from "../utils/logger";
import { OfflineTransaction, PaymentRequest } from "../types";
import { v4 as uuidv4 } from "uuid";
import { MeshNetwork } from "../mesh/meshNetwork";
import { EVVMFisher } from "../evvm/fisher";
import { OfflineStorage } from "../storage/offlineStorage";
import { XMTPMessaging } from "../xmtp/messaging";
import { SyncManager } from "../sync/syncManager";

export class PaymentService {
  private meshNetwork: MeshNetwork;
  private evvmFisher: EVVMFisher;
  private storage: OfflineStorage;
  private xmtpMessaging: XMTPMessaging;
  private syncManager: SyncManager;
  private wallet: ethers.Wallet | null = null;

  constructor(
    meshNetwork: MeshNetwork,
    evvmFisher: EVVMFisher,
    storage: OfflineStorage,
    xmtpMessaging: XMTPMessaging,
    syncManager: SyncManager,
    privateKey?: string
  ) {
    this.meshNetwork = meshNetwork;
    this.evvmFisher = evvmFisher;
    this.storage = storage;
    this.xmtpMessaging = xmtpMessaging;
    this.syncManager = syncManager;

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey);
    }

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle transactions from mesh network
    this.meshNetwork.onTransaction(async (tx) => {
      await this.handleIncomingTransaction(tx);
    });
  }

  /**
   * Creates a payment request
   */
  async createPaymentRequest(
    to: string,
    amount: string,
    tokenAddress?: string,
    message?: string
  ): Promise<PaymentRequest> {
    const request: PaymentRequest = {
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
    try {
      await this.xmtpMessaging.sendPaymentRequest(to, request);
    } catch (error) {
      logger.warn("Could not send payment request via XMTP:", error);
    }

    return request;
  }

  /**
   * Creates and processes an offline payment
   */
  async createOfflinePayment(
    to: string,
    amount: string,
    tokenAddress?: string
  ): Promise<OfflineTransaction> {
    if (!this.wallet) {
      throw new Error("Wallet not initialized");
    }

    const tx: OfflineTransaction = {
      id: uuidv4(),
      from: this.wallet.address,
      to,
      amount,
      tokenAddress,
      timestamp: Date.now(),
      signature: "",
      status: "pending",
      meshNodes: [],
    };

    // Sign the transaction
    const message = `${tx.from}${tx.to}${tx.amount}${tx.timestamp}`;
    tx.signature = await this.wallet.signMessage(message);

    logger.info(`Offline payment created: ${tx.id} from ${tx.from} to ${to}`);

    // Validate transaction
    const isValid = await this.evvmFisher.validateTransaction(tx);
    if (!isValid) {
      throw new Error("Transaction signature validation failed");
    }

    // Save to offline storage
    await this.storage.saveTransaction(tx);

    // Capture in EVVM Fisher
    await this.evvmFisher.captureTransaction(tx);

    // Execute in EVVM (virtual blockchain)
    await this.evvmFisher.executeTransaction(tx.id);

    // Broadcast to mesh network
    await this.meshNetwork.broadcastTransaction(tx);

    // Send notification via XMTP
    try {
      await this.xmtpMessaging.sendTransactionNotification(to, tx);
    } catch (error) {
      logger.warn("Could not send transaction notification via XMTP:", error);
    }

    // Try to sync immediately if online
    this.syncManager.syncTransaction(tx.id).catch((error) => {
      logger.debug(`Could not sync transaction ${tx.id} immediately:`, error);
    });

    return tx;
  }

  /**
   * Handles an incoming transaction from the mesh network
   */
  private async handleIncomingTransaction(tx: OfflineTransaction): Promise<void> {
    try {
      logger.info(`Handling incoming transaction ${tx.id}`);

      // Validate transaction
      const isValid = await this.evvmFisher.validateTransaction(tx);
      if (!isValid) {
        logger.warn(`Invalid transaction ${tx.id}, ignoring`);
        return;
      }

      // Check if we've already seen this transaction
      const existing = await this.storage.getTransaction(tx.id);
      if (existing) {
        logger.debug(`Transaction ${tx.id} already processed`);
        return;
      }

      // Save to storage
      await this.storage.saveTransaction(tx);

      // Capture in EVVM Fisher
      await this.evvmFisher.captureTransaction(tx);

      // Execute in EVVM
      await this.evvmFisher.executeTransaction(tx.id);

      // If this transaction is for us, update status
      if (tx.to.toLowerCase() === this.getAddress().toLowerCase()) {
        logger.info(`Received payment: ${tx.amount} from ${tx.from}`);
        // You could emit an event here for the frontend
      }
    } catch (error) {
      logger.error(`Error handling incoming transaction ${tx.id}:`, error);
    }
  }

  /**
   * Gets all transactions for the current wallet
   */
  async getTransactions(): Promise<OfflineTransaction[]> {
    // In a real implementation, you would filter by wallet address
    // For now, we return all pending transactions
    return await this.storage.getPendingTransactions();
  }

  /**
   * Gets a specific transaction
   */
  async getTransaction(txId: string): Promise<OfflineTransaction | null> {
    return await this.storage.getTransaction(txId);
  }

  /**
   * Gets the wallet address
   */
  getAddress(): string {
    if (this.wallet) {
      return this.wallet.address;
    }
    if (this.xmtpMessaging) {
      return this.xmtpMessaging.getAddress();
    }
    return this.meshNetwork.getPeerId();
  }
}

