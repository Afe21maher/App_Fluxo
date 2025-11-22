import { ethers } from "ethers";
import { logger } from "../utils/logger";
import { config } from "../config";
import { OfflineTransaction, EVVMTransaction } from "../types";
import { showEVVMBanner } from "../utils/banners";
import { MATEProtocol } from "./mateProtocol";

export class EVVMFisher {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private mateProtocol: MATEProtocol | null = null;
  private pendingTransactions: Map<string, EVVMTransaction> = new Map();
  private fishingSpots: Set<string> = new Set();
  private nonceCache: Map<string, bigint> = new Map();

  async initialize(): Promise<void> {
    try {
      if (!config.evvm.sepoliaRpcUrl) {
        throw new Error("Sepolia RPC URL not configured");
      }

      this.provider = new ethers.JsonRpcProvider(config.evvm.sepoliaRpcUrl);

      if (config.evvm.sepoliaPrivateKey) {
        // Clean up private key: remove any whitespace and fix common errors
        let privateKey = config.evvm.sepoliaPrivateKey.trim();
        
        // Fix common error: 0xOx -> 0x (O instead of 0)
        privateKey = privateKey.replace(/^0xOx/i, "0x");
        privateKey = privateKey.replace(/^Ox/i, "0x");
        
        // Ensure it starts with 0x
        if (!privateKey.startsWith("0x")) {
          privateKey = "0x" + privateKey;
        }
        
        // Validate format
        if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
          throw new Error(`Invalid private key format. It should be 64 hex characters after 0x. Got: ${privateKey.substring(0, 10)}...`);
        }
        
        this.wallet = new ethers.Wallet(
          privateKey,
          this.provider
        );
        showEVVMBanner();
        logger.info(
          `EVVM Fisher initialized with wallet: ${this.wallet.address}`
        );

        // Initialize MATE Protocol
        try {
          this.mateProtocol = new MATEProtocol(
            this.provider,
            this.wallet,
            config.evvm.mateProtocolAddress
          );

          if (this.mateProtocol.isConfigured()) {
            logger.info(
              `MATE Protocol initialized: ${this.mateProtocol.getProtocolAddress()}`
            );

            // Try to register a fishing spot if not already registered
            try {
              // Check if we can register a fishing spot
              const fishingSpotAddress = this.wallet.address;
              const isAvailable = await this.mateProtocol.isFishingSpotAvailable(
                fishingSpotAddress
              );

              if (!isAvailable) {
                logger.info("Registering fishing spot...");
                await this.mateProtocol.registerFishingSpot();
              }

              this.fishingSpots.add(fishingSpotAddress);
              logger.info(`Fishing spot registered: ${fishingSpotAddress}`);
            } catch (error) {
              logger.warn("Could not register fishing spot, continuing without it:", error);
              // Add wallet address as fallback fishing spot
              this.fishingSpots.add(this.wallet.address);
            }
          } else {
            logger.warn(
              "MATE Protocol address not configured, using simulation mode"
            );
            // Fallback: use wallet address as fishing spot
            this.fishingSpots.add(this.wallet.address);
          }
        } catch (error) {
          logger.warn("Could not initialize MATE Protocol, using simulation mode:", error);
          // Fallback: use wallet address as fishing spot
          this.fishingSpots.add(this.wallet.address);
        }
      } else {
        logger.warn("EVVM Fisher initialized without wallet (read-only mode)");
      }
    } catch (error) {
      logger.error("Error initializing EVVM Fisher:", error);
      throw error;
    }
  }

  /**
   * Captures a transaction from the mesh network and prepares it for execution in EVVM
   */
  async captureTransaction(tx: OfflineTransaction): Promise<string> {
    try {
      logger.info(`Capturing transaction ${tx.id} for EVVM processing`);

      // Get async nonce from MATE Protocol if available
      let nonce: bigint;
      if (this.mateProtocol && this.mateProtocol.isConfigured()) {
        try {
          nonce = await this.mateProtocol.getNonce(tx.from);
          // Cache the nonce
          this.nonceCache.set(tx.from, nonce);
        } catch (error) {
          logger.warn("Could not get nonce from MATE, using cached or timestamp-based nonce");
          const cachedNonce = this.nonceCache.get(tx.from);
          nonce = cachedNonce ? cachedNonce + 1n : BigInt(Date.now());
          this.nonceCache.set(tx.from, nonce);
        }
      } else {
        // Fallback: use timestamp-based nonce
        const cachedNonce = this.nonceCache.get(tx.from);
        nonce = cachedNonce ? cachedNonce + 1n : BigInt(Date.now());
        this.nonceCache.set(tx.from, nonce);
      }

      // Select fishing spot
      const fishingSpot = this.selectFishingSpot();

      // Convert offline transaction to EVVM transaction format
      const evvmTx: EVVMTransaction = {
        from: tx.from,
        to: tx.to,
        amount: tx.amount,
        nonce: Number(nonce),
        signature: tx.signature,
        fishingSpot: fishingSpot,
      };

      // Store the transaction
      this.pendingTransactions.set(tx.id, evvmTx);

      logger.info(
        `Transaction ${tx.id} captured and ready for EVVM execution (nonce: ${nonce}, fishing spot: ${fishingSpot})`
      );

      return tx.id;
    } catch (error) {
      logger.error(`Error capturing transaction ${tx.id}:`, error);
      throw error;
    }
  }

  /**
   * Executes a captured transaction in the EVVM virtual blockchain using MATE Metaprotocol
   */
  async executeTransaction(txId: string): Promise<boolean> {
    try {
      const evvmTx = this.pendingTransactions.get(txId);
      if (!evvmTx) {
        throw new Error(`Transaction ${txId} not found`);
      }

      logger.info(`Executing transaction ${txId} in EVVM via MATE Protocol`);

      // Validate transaction signature using MATE Protocol
      if (this.mateProtocol && this.mateProtocol.isConfigured()) {
        const isValid = await this.mateProtocol.validateTransactionSignature(evvmTx);
        if (!isValid) {
          logger.error(`Transaction ${txId} signature validation failed`);
          this.pendingTransactions.delete(txId);
          return false;
        }

        // Execute transaction through MATE Metaprotocol
        try {
          const tx = await this.mateProtocol.executeTransaction(evvmTx);
          logger.info(`Transaction ${txId} executed via MATE Protocol: ${tx.hash}`);

          // Wait for confirmation (optional, for logging)
          try {
            const receipt = await tx.wait(1);
            if (receipt) {
              logger.info(
                `Transaction ${txId} confirmed in block ${receipt.blockNumber}`
              );
            }
          } catch (waitError) {
            // Transaction sent but confirmation failed (non-critical)
            logger.warn(`Transaction ${txId} sent but confirmation pending`);
          }

          // Mark as executed
          this.pendingTransactions.delete(txId);
          return true;
        } catch (execError: any) {
          logger.error(`Error executing transaction ${txId} via MATE:`, execError);
          // Don't delete from pending, might retry later
          return false;
        }
      } else {
        // Fallback: simulate execution if MATE is not configured
        logger.warn(
          `MATE Protocol not configured, simulating execution for transaction ${txId}`
        );
        // Simulate delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Mark as executed
        this.pendingTransactions.delete(txId);
        logger.info(`Transaction ${txId} executed in EVVM (simulated)`);
        return true;
      }
    } catch (error) {
      logger.error(`Error executing transaction ${txId}:`, error);
      return false;
    }
  }

  /**
   * Relays a transaction to other nodes in the mesh network
   */
  async relayTransaction(tx: OfflineTransaction): Promise<void> {
    try {
      logger.info(`Relaying transaction ${tx.id} to mesh network`);
      // This would be called by the mesh network handler
      // The actual relaying is done by the mesh network itself
    } catch (error) {
      logger.error(`Error relaying transaction ${tx.id}:`, error);
      throw error;
    }
  }

  /**
   * Selects a fishing spot for gasless communication
   */
  private selectFishingSpot(): string {
    const spots = Array.from(this.fishingSpots);
    if (spots.length === 0) {
      // Fallback to wallet address if no fishing spots available
      return this.wallet?.address || "0x0000000000000000000000000000000000000000";
    }
    // Select a random fishing spot
    return spots[Math.floor(Math.random() * spots.length)];
  }

  /**
   * Gets MATE Protocol instance (if available)
   */
  getMATEProtocol(): MATEProtocol | null {
    return this.mateProtocol;
  }

  /**
   * Checks if MATE Protocol is configured and ready
   */
  isMATEConfigured(): boolean {
    return this.mateProtocol !== null && this.mateProtocol.isConfigured();
  }

  /**
   * Gets all pending transactions waiting for EVVM execution
   */
  getPendingTransactions(): EVVMTransaction[] {
    return Array.from(this.pendingTransactions.values());
  }

  /**
   * Validates a transaction signature
   */
  async validateTransaction(tx: OfflineTransaction): Promise<boolean> {
    try {
      // In production, this would validate the EIP-191 signature
      // For now, we do a basic check
      if (!tx.signature || tx.signature.length < 10) {
        return false;
      }

      // Verify signature using ethers
      const message = `${tx.from}${tx.to}${tx.amount}${tx.timestamp}`;
      const recoveredAddress = ethers.verifyMessage(message, tx.signature);

      return recoveredAddress.toLowerCase() === tx.from.toLowerCase();
    } catch (error) {
      logger.error(`Error validating transaction ${tx.id}:`, error);
      return false;
    }
  }
}

