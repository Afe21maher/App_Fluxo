import { OfflineTransaction, MeshNode } from "../types";
export declare class MeshNetwork {
    private node;
    private knownNodes;
    private transactionHandlers;
    start(): Promise<void>;
    private setupEventHandlers;
    broadcastTransaction(tx: OfflineTransaction): Promise<void>;
    private handleTransaction;
    onTransaction(handler: (tx: OfflineTransaction) => void): string;
    removeTransactionHandler(id: string): void;
    getPeerId(): string;
    getConnectedPeers(): MeshNode[];
    stop(): Promise<void>;
}
//# sourceMappingURL=meshNetwork.d.ts.map