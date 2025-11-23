import { PaymentRequest, OfflineTransaction } from "../types";
export declare class XMTPMessaging {
    private client;
    private wallet;
    private conversationHandlers;
    initialize(): Promise<void>;
    private startListening;
    private handleConversation;
    private handlePaymentRequest;
    /**
     * Sends a payment request to a peer
     */
    sendPaymentRequest(toAddress: string, request: PaymentRequest): Promise<void>;
    /**
     * Sends a transaction notification
     */
    sendTransactionNotification(toAddress: string, tx: OfflineTransaction): Promise<void>;
    /**
     * Registers a handler for incoming messages
     */
    onMessage(handler: (message: string, from: string) => void): string;
    /**
     * Removes a message handler
     */
    removeMessageHandler(id: string): void;
    /**
     * Gets the wallet address
     */
    getAddress(): string;
}
//# sourceMappingURL=messaging.d.ts.map