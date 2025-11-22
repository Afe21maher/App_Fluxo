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
    // Default to Sepolia EVVM Main contract if not specified
    mateProtocolAddress:
      process.env.EVVM_MATE_PROTOCOL_ADDRESS ||
      "0x9902984d86059234c3B6e11D5eAEC55f9627dD0f", // EVVM ID: 2 on Sepolia
    sepoliaRpcUrl: process.env.SEPOLIA_RPC_URL || "",
    sepoliaPrivateKey: process.env.SEPOLIA_PRIVATE_KEY || "",
    // Additional MATE services (optional)
    mateStaking: "0x2FE943eE9bD346aF46d46BD36c9ccb86201Da21A",
    mateNameService: "0x93DFFaEd15239Ec77aaaBc79DF3b9818dD3E406A",
    mateTreasury: "0x213F4c8b5a228977436c2C4929F7bd67B29Af8CD",
    mateP2PSwap: "0xC175f4Aa8b761ca7D0B35138969DF8095A1657B5",
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

