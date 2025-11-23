export interface OfflineTransaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress?: string;
  timestamp: number;
  signature: string;
  status: "pending" | "confirmed" | "synced" | "failed";
  meshNodes: string[]; // Nodos que han visto esta transacción
  message?: string; // Mensaje opcional
}

export interface MeshNode {
  peerId: string;
  address: string;
  lastSeen: number;
  isOnline: boolean;
}

export interface PaymentRequest {
  id: string;
  from: string;
  to: string;
  amount: string;
  tokenAddress?: string;
  message?: string;
  timestamp: number;
}

export interface SyncBatch {
  transactions: OfflineTransaction[];
  timestamp: number;
  signature: string;
}

export interface EVVMTransaction {
  from: string;
  to: string;
  amount: string;
  nonce: number;
  signature: string;
  fishingSpot?: string;
}

