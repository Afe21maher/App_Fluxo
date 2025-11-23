import { OfflineTransaction, PaymentRequest } from "../types";
import { MeshNetwork } from "../mesh/meshNetwork";
import { EVVMFisher } from "../evvm/fisher";
import { OfflineStorage } from "../storage/offlineStorage";
import { XMTPMessaging } from "../xmtp/messaging";
import { SyncManager } from "../sync/syncManager";
export declare class PaymentService {
    private meshNetwork;
    private evvmFisher;
    private storage;
    private xmtpMessaging;
    private syncManager;
    private wallet;
    constructor(meshNetwork: MeshNetwork, evvmFisher: EVVMFisher, storage: OfflineStorage, xmtpMessaging: XMTPMessaging, syncManager: SyncManager, privateKey?: string);
    private setupHandlers;
    /**
     * Creates a payment request
     */
    createPaymentRequest(to: string, amount: string, tokenAddress?: string, message?: string): Promise<PaymentRequest>;
    /**
     * Creates and processes an offline payment
     */
    createOfflinePayment(to: string, amount: string, tokenAddress?: string, message?: string): Promise<OfflineTransaction>;
    /**
     * Handles an incoming transaction from the mesh network
     */
    private handleIncomingTransaction;
    /**
     * Gets all transactions for the current wallet
     */
    getTransactions(): Promise<OfflineTransaction[]>;
    /**
     * Gets a specific transaction
     */
    getTransaction(txId: string): Promise<OfflineTransaction | null>;
    /**
     * Gets the wallet address
     */
    getAddress(): string;
}
//# sourceMappingURL=paymentService.d.ts.map