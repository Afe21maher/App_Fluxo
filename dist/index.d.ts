import { MeshNetwork } from "./mesh/meshNetwork";
import { SyncManager } from "./sync/syncManager";
import { PaymentService } from "./services/paymentService";
declare class OfflineMeshPaymentsApp {
    private meshNetwork;
    private evvmFisher;
    private hederaSync;
    private xmtpMessaging;
    private storage;
    private syncManager;
    private paymentService;
    initialize(): Promise<void>;
    getPaymentService(): PaymentService;
    getMeshNetwork(): MeshNetwork;
    getSyncManager(): SyncManager | null;
    shutdown(): Promise<void>;
}
export { OfflineMeshPaymentsApp };
//# sourceMappingURL=index.d.ts.map