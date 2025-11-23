import { createLibp2p } from "libp2p";
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
import { showMeshBanner } from "../utils/banners";
export class MeshNetwork {
    constructor() {
        this.node = null;
        this.knownNodes = new Map();
        this.transactionHandlers = new Map();
    }
    async start() {
        try {
            const datastore = new MemoryDatastore();
            const port = config.mesh.port;
            this.node = await createLibp2p({
                addresses: {
                    listen: [`/ip4/0.0.0.0/tcp/${port}/ws`],
                },
                transports: [webSockets()],
                streamMuxers: [mplex()],
                connectionEncrypters: [noise()],
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
                },
                datastore,
            });
            this.setupEventHandlers();
            await this.node.start();
            showMeshBanner();
            logger.info(`Mesh network started on port ${config.mesh.port}, PeerID: ${this.node.peerId.toString()}`);
        }
        catch (error) {
            logger.error("Error starting mesh network:", error);
            throw error;
        }
    }
    setupEventHandlers() {
        if (!this.node)
            return;
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
        const pubsub = this.node.services.pubsub;
        if (pubsub && pubsub.addEventListener) {
            pubsub.addEventListener("message", (evt) => {
                if (evt.detail.topic === "offline-payments") {
                    try {
                        const tx = JSON.parse(new TextDecoder().decode(evt.detail.data));
                        this.handleTransaction(tx);
                    }
                    catch (error) {
                        logger.error("Error parsing transaction from mesh:", error);
                    }
                }
            });
            // Subscribe to the topic
            pubsub.subscribe("offline-payments");
        }
    }
    async broadcastTransaction(tx) {
        if (!this.node) {
            throw new Error("Mesh network not started");
        }
        try {
            const data = new TextEncoder().encode(JSON.stringify(tx));
            const pubsub = this.node.services.pubsub;
            if (pubsub && pubsub.publish) {
                await pubsub.publish("offline-payments", data);
                logger.info(`Transaction ${tx.id} broadcasted to mesh network`);
            }
            else {
                logger.warn("Pubsub service not available");
            }
        }
        catch (error) {
            logger.error(`Error broadcasting transaction ${tx.id}:`, error);
            throw error;
        }
    }
    handleTransaction(tx) {
        logger.debug(`Received transaction ${tx.id} from mesh network`);
        // Add this node to the list of nodes that have seen this transaction
        if (!tx.meshNodes.includes(this.getPeerId())) {
            tx.meshNodes.push(this.getPeerId());
        }
        // Notify all registered handlers
        this.transactionHandlers.forEach((handler) => {
            try {
                handler(tx);
            }
            catch (error) {
                logger.error("Error in transaction handler:", error);
            }
        });
    }
    onTransaction(handler) {
        const id = Math.random().toString(36).substring(7);
        this.transactionHandlers.set(id, handler);
        return id;
    }
    removeTransactionHandler(id) {
        this.transactionHandlers.delete(id);
    }
    getPeerId() {
        if (!this.node) {
            throw new Error("Mesh network not started");
        }
        return this.node.peerId.toString();
    }
    getConnectedPeers() {
        return Array.from(this.knownNodes.values()).filter((node) => node.isOnline);
    }
    async stop() {
        if (this.node) {
            await this.node.stop();
            logger.info("Mesh network stopped");
        }
    }
}
//# sourceMappingURL=meshNetwork.js.map