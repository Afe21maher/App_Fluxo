import { OfflineTransaction, EVVMTransaction } from "../types";
import { MATEProtocol } from "./mateProtocol";
export declare class EVVMFisher {
    private provider;
    private wallet;
    private mateProtocol;
    private pendingTransactions;
    private fishingSpots;
    private nonceCache;
    initialize(): Promise<void>;
    /**
     * Captures a transaction from the mesh network and prepares it for execution in EVVM
     */
    captureTransaction(tx: OfflineTransaction): Promise<string>;
    /**
     * Executes a captured transaction in the EVVM virtual blockchain using MATE Metaprotocol
     */
    executeTransaction(txId: string): Promise<boolean>;
    /**
     * Relays a transaction to other nodes in the mesh network
     */
    relayTransaction(tx: OfflineTransaction): Promise<void>;
    /**
     * Selects a fishing spot for gasless communication
     */
    private selectFishingSpot;
    /**
     * Gets MATE Protocol instance (if available)
     */
    getMATEProtocol(): MATEProtocol | null;
    /**
     * Checks if MATE Protocol is configured and ready
     */
    isMATEConfigured(): boolean;
    /**
     * Gets all pending transactions waiting for EVVM execution
     */
    getPendingTransactions(): EVVMTransaction[];
    /**
     * Validates a transaction signature
     */
    validateTransaction(tx: OfflineTransaction): Promise<boolean>;
}
//# sourceMappingURL=fisher.d.ts.map