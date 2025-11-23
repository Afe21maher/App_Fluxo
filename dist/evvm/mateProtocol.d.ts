import { ethers } from "ethers";
import { EVVMTransaction } from "../types";
export declare class MATEProtocol {
    private contract;
    private protocolAddress;
    constructor(_provider: ethers.JsonRpcProvider, wallet: ethers.Wallet, protocolAddress?: string);
    /**
     * Gets the next nonce for an account (async nonces)
     */
    getNonce(account: string): Promise<bigint>;
    /**
     * Executes a transaction through MATE Metaprotocol
     */
    executeTransaction(evvmTx: EVVMTransaction): Promise<ethers.ContractTransactionResponse>;
    /**
     * Checks if a fishing spot is available
     */
    isFishingSpotAvailable(spot: string): Promise<boolean>;
    /**
     * Registers a new fishing spot
     */
    registerFishingSpot(): Promise<ethers.ContractTransactionResponse>;
    /**
     * Validates a transaction signature for MATE
     */
    validateTransactionSignature(evvmTx: EVVMTransaction): Promise<boolean>;
    /**
     * Gets the protocol address
     */
    getProtocolAddress(): string;
    /**
     * Checks if MATE Protocol is properly configured
     */
    isConfigured(): boolean;
}
//# sourceMappingURL=mateProtocol.d.ts.map