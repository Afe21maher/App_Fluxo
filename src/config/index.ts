import * as dotenv from "dotenv";

dotenv.config();

export const config = {
  // Hedera
  hedera: {
    network: process.env.HEDERA_NETWORK || "testnet",
    accountId: process.env.HEDERA_ACCOUNT_ID || "",
    privateKey: process.env.HEDERA_PRIVATE_KEY || "",
  },

  // EVVM
  evvm: {
    mateProtocolAddress: process.env.EVVM_MATE_PROTOCOL_ADDRESS || "",
    sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || "",
    sepoliaPrivateKey: process.env.SEPOLIA_PRIVATE_KEY || "",
  },

  // XMTP
  xmtp: {
    privateKey: process.env.XMTP_PRIVATE_KEY || "",
    env: (process.env.XMTP_ENV as "dev" | "production") || "dev",
  },

  // Mesh Network
  mesh: {
    port: parseInt(process.env.MESH_PORT || "9000"),
    bootstrapNodes: process.env.MESH_BOOTSTRAP_NODES?.split(",") || [],
  },

  // Application
  app: {
    nodeEnv: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
    port: parseInt(process.env.PORT || "3000"),
  },
};

