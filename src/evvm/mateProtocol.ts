import { ethers } from "ethers";
import { logger } from "../utils/logger";
import { config } from "../config";
import { EVVMTransaction } from "../types";

/**
 * MATE Metaprotocol Integration
 * 
 * MATE Metaprotocol allows gasless transactions and instant finality
 * using Ethereum's security. This module handles interaction with MATE contracts.
 */

// MATE Protocol Contract ABI (simplified - actual ABI may vary)
const MATE_PROTOCOL_ABI = [
  "function executeTransaction(address to, uint256 value, bytes calldata data, uint256 nonce) external",
  "function getNonce(address account) external view returns (uint256)",
  "function fishingSpot(address spot) external view returns (bool)",
  "function registerFishingSpot() external",
  "event TransactionExecuted(address indexed from, address indexed to, uint256 value, uint256 nonce)",
];

// MATE Protocol addresses on Sepolia
const MATE_CONTRACTS = {
  // Main EVVM contract (for executing transactions)
  EVVM_MAIN: "0x9902984d86059234c3B6e11D5eAEC55f9627dD0f", // EVVM ID: 2
  // Additional MATE services
  STAKING: "0x2FE943eE9bD346aF46d46BD36c9ccb86201Da21A",
  NAME_SERVICE: "0x93DFFaEd15239Ec77aaaBc79DF3b9818dD3E406A",
  TREASURY: "0x213F4c8b5a228977436c2C4929F7bd67B29Af8CD",
  P2P_SWAP: "0xC175f4Aa8b761ca7D0B35138969DF8095A1657B5",
};

// Default MATE Protocol address on Sepolia (EVVM Main contract)
const DEFAULT_MATE_PROTOCOL_ADDRESS = MATE_CONTRACTS.EVVM_MAIN;

export class MATEProtocol {
  private contract: ethers.Contract | null = null;
  private protocolAddress: string;

  constructor(
    _provider: ethers.JsonRpcProvider,
    wallet: ethers.Wallet,
    protocolAddress?: string
  ) {
    this.protocolAddress =
      protocolAddress ||
      config.evvm.mateProtocolAddress ||
      DEFAULT_MATE_PROTOCOL_ADDRESS;

    if (this.protocolAddress !== DEFAULT_MATE_PROTOCOL_ADDRESS) {
      this.contract = new ethers.Contract(
        this.protocolAddress,
        MATE_PROTOCOL_ABI,
        wallet
      );
    }
  }

  /**
   * Gets the next nonce for an account (async nonces)
   */
  async getNonce(account: string): Promise<bigint> {
    if (!this.contract) {
      // If no contract, use a simple timestamp-based nonce
      return BigInt(Date.now());
    }

    try {
      const nonce = await this.contract.getNonce(account);
      return BigInt(nonce.toString());
    } catch (error) {
      logger.warn("Could not get nonce from MATE, using timestamp-based nonce");
      return BigInt(Date.now());
    }
  }

  /**
   * Executes a transaction through MATE Metaprotocol
   */
  async executeTransaction(
    evvmTx: EVVMTransaction
  ): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract) {
      throw new Error("MATE Protocol contract not initialized");
    }

    try {
      // Prepare transaction data
      const to = evvmTx.to;
      const value = BigInt(evvmTx.amount);
      const data = "0x"; // Empty data for simple transfers
      const nonce = BigInt(evvmTx.nonce);

      logger.info(
        `Executing MATE transaction: ${evvmTx.from} -> ${to}, amount: ${value}, nonce: ${nonce}`
      );

      // Execute transaction through MATE
      const tx = await this.contract.executeTransaction(
        to,
        value,
        data,
        nonce,
        {
          gasLimit: 500000, // Adjust as needed
        }
      );

      logger.info(`MATE transaction sent: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      logger.error("Error executing MATE transaction:", error);
      throw error;
    }
  }

  /**
   * Checks if a fishing spot is available
   */
  async isFishingSpotAvailable(spot: string): Promise<boolean> {
    if (!this.contract) {
      return false;
    }

    try {
      const isAvailable = await this.contract.fishingSpot(spot);
      return isAvailable;
    } catch (error) {
      logger.warn(`Could not check fishing spot ${spot}:`, error);
      return false;
    }
  }

  /**
   * Registers a new fishing spot
   */
  async registerFishingSpot(): Promise<ethers.ContractTransactionResponse> {
    if (!this.contract) {
      throw new Error("MATE Protocol contract not initialized");
    }

    try {
      logger.info("Registering new fishing spot...");
      const tx = await this.contract.registerFishingSpot({
        gasLimit: 200000,
      });
      logger.info(`Fishing spot registration sent: ${tx.hash}`);
      return tx;
    } catch (error: any) {
      logger.error("Error registering fishing spot:", error);
      throw error;
    }
  }

  /**
   * Validates a transaction signature for MATE
   */
  async validateTransactionSignature(
    evvmTx: EVVMTransaction
  ): Promise<boolean> {
    try {
      // MATE uses EIP-191 signatures
      // Create the message hash using keccak256 of packed data
      const messageHash = ethers.keccak256(
        ethers.solidityPacked(
          ["address", "address", "uint256", "uint256"],
          [evvmTx.from, evvmTx.to, evvmTx.amount, evvmTx.nonce]
        )
      );

      // Recover address from signature
      const recoveredAddress = ethers.recoverAddress(messageHash, evvmTx.signature);
      return recoveredAddress.toLowerCase() === evvmTx.from.toLowerCase();
    } catch (error) {
      logger.error("Error validating MATE transaction signature:", error);
      return false;
    }
  }

  /**
   * Gets the protocol address
   */
  getProtocolAddress(): string {
    return this.protocolAddress;
  }

  /**
   * Checks if MATE Protocol is properly configured
   */
  isConfigured(): boolean {
    return (
      this.contract !== null &&
      this.protocolAddress !== DEFAULT_MATE_PROTOCOL_ADDRESS
    );
  }
}

