import { OfflineTransaction } from "../types";
export declare class HederaSyncService {
    private client;
    private accountId;
    private privateKey;
    initialize(): Promise<void>;
    /**
     * Syncs a batch of offline transactions to Hedera
     */
    syncTransactions(transactions: OfflineTransaction[]): Promise<Map<string, boolean>>;
    /**
     * Syncs a single transaction to Hedera
     */
    private syncSingleTransaction;
    /**
     * Checks if we have internet connection and can sync
     */
    checkConnection(): Promise<boolean>;
    /**
     * Gets the account balance
     */
    getBalance(): Promise<bigint>;
    close(): Promise<void>;
}
//# sourceMappingURL=syncService.d.ts.map