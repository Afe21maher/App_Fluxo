import { OfflineStorage } from "../storage/offlineStorage";
import { HederaSyncService } from "../hedera/syncService";
export declare class SyncManager {
    private storage;
    private hederaSync;
    private syncInterval;
    private isSyncing;
    constructor(storage: OfflineStorage, hederaSync: HederaSyncService);
    /**
     * Starts the automatic sync process
     */
    startAutoSync(intervalMs?: number): void;
    /**
     * Stops the automatic sync process
     */
    stopAutoSync(): void;
    /**
     * Manually triggers a sync of pending transactions
     */
    syncPendingTransactions(): Promise<void>;
    /**
     * Syncs a single transaction immediately
     */
    syncTransaction(txId: string): Promise<boolean>;
}
//# sourceMappingURL=syncManager.d.ts.map