// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OfflinePaymentSync
 * @dev Contract for syncing offline payments to Hedera
 * This contract receives batches of offline transactions and processes them
 */
contract OfflinePaymentSync {
    struct OfflineTransaction {
        bytes32 id;
        address from;
        address to;
        uint256 amount;
        address tokenAddress; // address(0) for HBAR
        uint256 timestamp;
        bytes signature;
    }

    struct SyncBatch {
        OfflineTransaction[] transactions;
        uint256 timestamp;
        bytes signature;
    }

    // Events
    event TransactionSynced(
        bytes32 indexed txId,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    event BatchSynced(
        uint256 indexed batchId,
        uint256 transactionCount,
        uint256 timestamp
    );

    // State
    mapping(bytes32 => bool) public syncedTransactions;
    uint256 public batchCounter;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Syncs a single offline transaction
     */
    function syncTransaction(OfflineTransaction memory tx) external {
        require(!syncedTransactions[tx.id], "Transaction already synced");
        require(verifyTransaction(tx), "Invalid transaction signature");

        // Mark as synced
        syncedTransactions[tx.id] = true;

        // In a real implementation, you would:
        // 1. Transfer tokens/HBAR from 'from' to 'to'
        // 2. Handle token transfers if tokenAddress is not zero
        // 3. Emit events

        emit TransactionSynced(tx.id, tx.from, tx.to, tx.amount);
    }

    /**
     * @dev Syncs a batch of offline transactions
     */
    function syncBatch(SyncBatch memory batch) external {
        require(verifyBatch(batch), "Invalid batch signature");

        uint256 count = 0;
        for (uint256 i = 0; i < batch.transactions.length; i++) {
            OfflineTransaction memory tx = batch.transactions[i];
            if (!syncedTransactions[tx.id] && verifyTransaction(tx)) {
                syncedTransactions[tx.id] = true;
                emit TransactionSynced(tx.id, tx.from, tx.to, tx.amount);
                count++;
            }
        }

        batchCounter++;
        emit BatchSynced(batchCounter, count, block.timestamp);
    }

    /**
     * @dev Verifies a transaction signature
     * In production, this would use EIP-191 signature verification
     */
    function verifyTransaction(
        OfflineTransaction memory tx
    ) internal pure returns (bool) {
        // Simplified verification - in production, implement proper EIP-191
        bytes32 messageHash = keccak256(
            abi.encodePacked(tx.from, tx.to, tx.amount, tx.timestamp)
        );
        // Verify signature using ecrecover
        // This is a simplified version - implement proper signature verification
        return tx.signature.length > 0;
    }

    /**
     * @dev Verifies a batch signature
     */
    function verifyBatch(SyncBatch memory batch) internal pure returns (bool) {
        // Verify batch signature
        return batch.signature.length > 0;
    }

    /**
     * @dev Checks if a transaction has been synced
     */
    function isSynced(bytes32 txId) external view returns (bool) {
        return syncedTransactions[txId];
    }

    /**
     * @dev Gets the number of synced batches
     */
    function getBatchCount() external view returns (uint256) {
        return batchCounter;
    }
}

