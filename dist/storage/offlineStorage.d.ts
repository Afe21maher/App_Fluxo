import { OfflineTransaction } from "../types";
export declare class OfflineStorage {
    private db;
    constructor(dbPath?: string);
    saveTransaction(tx: OfflineTransaction): Promise<void>;
    getTransaction(txId: string): Promise<OfflineTransaction | null>;
    getPendingTransactions(): Promise<OfflineTransaction[]>;
    updateTransactionStatus(txId: string, status: OfflineTransaction["status"]): Promise<void>;
    private addToPendingIndex;
    private removeFromPendingIndex;
    private getPendingTransactionIds;
    close(): Promise<void>;
}
//# sourceMappingURL=offlineStorage.d.ts.map