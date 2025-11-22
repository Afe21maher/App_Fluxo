import { Client, Conversation } from "@xmtp/xmtp-js";
import { ethers } from "ethers";
import { logger } from "../utils/logger";
import { config } from "../config";
import { PaymentRequest, OfflineTransaction } from "../types";

export class XMTPMessaging {
  private client: Client | null = null;
  private wallet: ethers.Wallet | null = null;
  private conversationHandlers: Map<
    string,
    (message: string, from: string) => void
  > = new Map();

  async initialize(): Promise<void> {
    try {
      if (!config.xmtp.privateKey) {
        throw new Error("XMTP private key not configured");
      }

      // Create wallet from private key
      this.wallet = new ethers.Wallet(config.xmtp.privateKey);

      // Create XMTP client
      this.client = await Client.create(this.wallet, {
        env: config.xmtp.env,
      });

      logger.info(
        `XMTP messaging initialized, address: ${this.wallet.address}`
      );

      // Start listening for messages
      await this.startListening();
    } catch (error) {
      logger.error("Error initializing XMTP messaging:", error);
      throw error;
    }
  }

  private async startListening(): Promise<void> {
    if (!this.client) {
      throw new Error("XMTP client not initialized");
    }

    // Listen to all conversations
    const stream = await this.client.conversations.stream();
    
    for await (const conversation of stream) {
      this.handleConversation(conversation);
    }
  }

  private async handleConversation(conversation: Conversation): Promise<void> {
    if (!this.client) return;

    logger.info(`New conversation with ${conversation.peerAddress}`);

    // Listen to messages in this conversation
    const stream = await conversation.streamMessages();

    for await (const message of stream) {
      try {
        const content = message.content as string;
        const from = message.senderAddress;

        logger.debug(`Received message from ${from}: ${content}`);

        // Try to parse as payment request
        try {
          const paymentRequest = JSON.parse(content) as PaymentRequest;
          if (paymentRequest.id && paymentRequest.amount) {
            this.handlePaymentRequest(paymentRequest, from);
            continue;
          }
        } catch {
          // Not a payment request, handle as regular message
        }

        // Notify all handlers
        this.conversationHandlers.forEach((handler) => {
          try {
            handler(content, from);
          } catch (error) {
            logger.error("Error in conversation handler:", error);
          }
        });
      } catch (error) {
        logger.error("Error handling message:", error);
      }
    }
  }

  private handlePaymentRequest(
    request: PaymentRequest,
    from: string
  ): void {
    logger.info(
      `Payment request received from ${from}: ${request.amount} to ${request.to}`
    );
    // This will be handled by the payment service
  }

  /**
   * Sends a payment request to a peer
   */
  async sendPaymentRequest(
    toAddress: string,
    request: PaymentRequest
  ): Promise<void> {
    if (!this.client) {
      throw new Error("XMTP client not initialized");
    }

    try {
      const conversation = await this.client.conversations.newConversation(
        toAddress
      );

      await conversation.send(JSON.stringify(request));

      logger.info(`Payment request sent to ${toAddress}`);
    } catch (error) {
      logger.error(`Error sending payment request to ${toAddress}:`, error);
      throw error;
    }
  }

  /**
   * Sends a transaction notification
   */
  async sendTransactionNotification(
    toAddress: string,
    tx: OfflineTransaction
  ): Promise<void> {
    if (!this.client) {
      throw new Error("XMTP client not initialized");
    }

    try {
      const conversation = await this.client.conversations.newConversation(
        toAddress
      );

      const message = `Transaction ${tx.id} completed: ${tx.amount} from ${tx.from} to ${tx.to}`;
      await conversation.send(message);

      logger.info(`Transaction notification sent to ${toAddress}`);
    } catch (error) {
      logger.error(
        `Error sending transaction notification to ${toAddress}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Registers a handler for incoming messages
   */
  onMessage(handler: (message: string, from: string) => void): string {
    const id = Math.random().toString(36).substring(7);
    this.conversationHandlers.set(id, handler);
    return id;
  }

  /**
   * Removes a message handler
   */
  removeMessageHandler(id: string): void {
    this.conversationHandlers.delete(id);
  }

  /**
   * Gets the wallet address
   */
  getAddress(): string {
    if (!this.wallet) {
      throw new Error("XMTP not initialized");
    }
    return this.wallet.address;
  }
}

