import { createLibp2p, Libp2p } from "libp2p";
import { webSockets } from "@libp2p/websockets";
import { mplex } from "@libp2p/mplex";
import { noise } from "@chainsafe/libp2p-noise";
import { bootstrap } from "@libp2p/bootstrap";
import { kadDHT } from "@libp2p/kad-dht";
import { gossipsub } from "@chainsafe/libp2p-gossipsub";
import { identify } from "@libp2p/identify";
import { ping } from "@libp2p/ping";
import { MemoryDatastore } from "datastore-core";
import { logger } from "../utils/logger";
import { config } from "../config";
import { OfflineTransaction, MeshNode } from "../types";
import { showMeshBanner } from "../utils/banners";

export class MeshNetwork {
  private node: Libp2p | null = null;
  private knownNodes: Map<string, MeshNode> = new Map();
  private transactionHandlers: Map<
    string,
    (tx: OfflineTransaction) => void
  > = new Map();

  async start(): Promise<void> {
    try {
      const datastore = new MemoryDatastore();
      const port = config.mesh.port;

      this.node = await createLibp2p({
        addresses: {
          listen: [`/ip4/0.0.0.0/tcp/${port}/ws`],
        },
        transports: [webSockets()],
        streamMuxers: [mplex()],
        connectionEncrypters: [noise()] as any,
        peerDiscovery: config.mesh.bootstrapNodes.length > 0 ? [
          bootstrap({
            list: config.mesh.bootstrapNodes,
          }),
        ] : [],
        services: {
          identify: identify(),
          ping: ping(),
          dht: kadDHT({
            clientMode: false,
          }),
          pubsub: gossipsub({
            emitSelf: true,
          }),
        } as any,
        datastore,
      } as any);

      this.setupEventHandlers();
      await this.node.start();

      showMeshBanner();
      logger.info(
        `Mesh network started on port ${config.mesh.port}, PeerID: ${this.node.peerId.toString()}`
      );
    } catch (error) {
      logger.error("Error starting mesh network:", error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.node) return;

    this.node.addEventListener("peer:discovery", (evt) => {
      const peerId = evt.detail.id.toString();
      logger.info(`Peer discovered: ${peerId}`);

      this.knownNodes.set(peerId, {
        peerId,
        address: evt.detail.multiaddrs[0]?.toString() || "",
        lastSeen: Date.now(),
        isOnline: true,
      });
    });

    this.node.addEventListener("peer:connect", (evt) => {
      const peerId = evt.detail.toString();
      logger.info(`Peer connected: ${peerId}`);

      const node = this.knownNodes.get(peerId);
      if (node) {
        node.isOnline = true;
        node.lastSeen = Date.now();
      }
    });

    this.node.addEventListener("peer:disconnect", (evt) => {
      const peerId = evt.detail.toString();
      logger.info(`Peer disconnected: ${peerId}`);

      const node = this.knownNodes.get(peerId);
      if (node) {
        node.isOnline = false;
      }
    });

    // Subscribe to transaction topic
    const pubsub = this.node.services.pubsub as any;
    if (pubsub && pubsub.addEventListener) {
      pubsub.addEventListener("message", (evt: any) => {
        if (evt.detail.topic === "offline-payments") {
          try {
            const tx = JSON.parse(
              new TextDecoder().decode(evt.detail.data)
            ) as OfflineTransaction;
            this.handleTransaction(tx);
          } catch (error) {
            logger.error("Error parsing transaction from mesh:", error);
          }
        }
      });

      // Subscribe to the topic
      pubsub.subscribe("offline-payments");
    }
  }

  async broadcastTransaction(tx: OfflineTransaction): Promise<void> {
    if (!this.node) {
      throw new Error("Mesh network not started");
    }

    try {
      const data = new TextEncoder().encode(JSON.stringify(tx));
      const pubsub = this.node.services.pubsub as any;
      if (pubsub && pubsub.publish) {
        await pubsub.publish("offline-payments", data);
        logger.info(`Transaction ${tx.id} broadcasted to mesh network`);
      } else {
        logger.warn("Pubsub service not available");
      }
    } catch (error) {
      logger.error(`Error broadcasting transaction ${tx.id}:`, error);
      throw error;
    }
  }

  private handleTransaction(tx: OfflineTransaction): void {
    logger.debug(`Received transaction ${tx.id} from mesh network`);

    // Add this node to the list of nodes that have seen this transaction
    if (!tx.meshNodes.includes(this.getPeerId())) {
      tx.meshNodes.push(this.getPeerId());
    }

    // Notify all registered handlers
    this.transactionHandlers.forEach((handler) => {
      try {
        handler(tx);
      } catch (error) {
        logger.error("Error in transaction handler:", error);
      }
    });
  }

  onTransaction(handler: (tx: OfflineTransaction) => void): string {
    const id = Math.random().toString(36).substring(7);
    this.transactionHandlers.set(id, handler);
    return id;
  }

  removeTransactionHandler(id: string): void {
    this.transactionHandlers.delete(id);
  }

  getPeerId(): string {
    if (!this.node) {
      throw new Error("Mesh network not started");
    }
    return this.node.peerId.toString();
  }

  getConnectedPeers(): MeshNode[] {
    return Array.from(this.knownNodes.values()).filter((node) => node.isOnline);
  }

  async stop(): Promise<void> {
    if (this.node) {
      await this.node.stop();
      logger.info("Mesh network stopped");
    }
  }
}

