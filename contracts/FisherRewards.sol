// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FisherRewards
 * @dev Smart contract para manejar recompensas de Fishers en el sistema EVVM
 * Los Fishers capturan y ejecutan transacciones pendientes, recibiendo recompensas
 */
contract FisherRewards {
    // Estructura para un Fisher
    struct Fisher {
        address fisherAddress;
        uint256 totalCaught;
        uint256 totalExecuted;
        uint256 totalRewards;
        bool active;
        uint256 lastActivity;
    }

    // Estructura para una transacción capturada
    struct CaughtTransaction {
        bytes32 transactionId;
        address fisher;
        bytes32 paymentId;
        uint256 amount;
        uint256 reward;
        uint256 timestamp;
        bool executed;
        bytes32 executionTxHash;
    }

    // Mapeo de fishers por dirección
    mapping(address => Fisher) public fishers;
    
    // Mapeo de transacciones capturadas
    mapping(bytes32 => CaughtTransaction) public caughtTransactions;
    
    // Array de direcciones de fishers activos
    address[] public activeFishers;
    
    // Owner del contrato
    address public owner;
    
    // Tasa de recompensa (en basis points, 10 = 0.1%)
    uint256 public rewardRate = 10; // 0.1%
    
    // Mínimo de recompensa (en tinybars)
    uint256 public minReward = 1000; // 0.00001 HBAR
    
    // Máximo de recompensa (en tinybars)
    uint256 public maxReward = 1000000000; // 10 HBAR
    
    // Eventos
    event FisherRegistered(address indexed fisher, uint256 timestamp);
    event TransactionCaught(
        bytes32 indexed transactionId,
        address indexed fisher,
        bytes32 indexed paymentId,
        uint256 amount,
        uint256 timestamp
    );
    event TransactionExecuted(
        bytes32 indexed transactionId,
        address indexed fisher,
        bytes32 indexed executionTxHash,
        uint256 reward,
        uint256 timestamp
    );
    event RewardClaimed(
        address indexed fisher,
        uint256 amount,
        uint256 timestamp
    );
    event RewardRateUpdated(uint256 newRate, uint256 timestamp);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    modifier onlyActiveFisher() {
        require(fishers[msg.sender].active, "Fisher not active");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Registra un nuevo fisher
     */
    function registerFisher() external {
        require(!fishers[msg.sender].active, "Fisher already registered");
        
        fishers[msg.sender] = Fisher({
            fisherAddress: msg.sender,
            totalCaught: 0,
            totalExecuted: 0,
            totalRewards: 0,
            active: true,
            lastActivity: block.timestamp
        });
        
        activeFishers.push(msg.sender);
        
        emit FisherRegistered(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Registra una transacción capturada
     * @param _transactionId ID único de la transacción
     * @param _paymentId ID del pago relacionado
     * @param _amount Monto de la transacción
     */
    function catchTransaction(
        bytes32 _transactionId,
        bytes32 _paymentId,
        uint256 _amount
    ) external onlyActiveFisher {
        require(
            caughtTransactions[_transactionId].fisher == address(0),
            "Transaction already caught"
        );
        
        // Calcular recompensa
        uint256 reward = calculateReward(_amount);
        
        caughtTransactions[_transactionId] = CaughtTransaction({
            transactionId: _transactionId,
            fisher: msg.sender,
            paymentId: _paymentId,
            amount: _amount,
            reward: reward,
            timestamp: block.timestamp,
            executed: false,
            executionTxHash: bytes32(0)
        });
        
        // Actualizar estadísticas del fisher
        fishers[msg.sender].totalCaught++;
        fishers[msg.sender].lastActivity = block.timestamp;
        
        emit TransactionCaught(
            _transactionId,
            msg.sender,
            _paymentId,
            _amount,
            block.timestamp
        );
    }
    
    /**
     * @dev Marca una transacción como ejecutada y otorga recompensa
     * @param _transactionId ID de la transacción
     * @param _executionTxHash Hash de la transacción de ejecución
     */
    function markTransactionExecuted(
        bytes32 _transactionId,
        bytes32 _executionTxHash
    ) external onlyActiveFisher {
        CaughtTransaction storage tx = caughtTransactions[_transactionId];
        
        require(tx.fisher == msg.sender, "Not your transaction");
        require(!tx.executed, "Transaction already executed");
        
        tx.executed = true;
        tx.executionTxHash = _executionTxHash;
        
        // Actualizar estadísticas del fisher
        fishers[msg.sender].totalExecuted++;
        fishers[msg.sender].totalRewards += tx.reward;
        fishers[msg.sender].lastActivity = block.timestamp;
        
        // Transferir recompensa al fisher
        payable(msg.sender).transfer(tx.reward);
        
        emit TransactionExecuted(
            _transactionId,
            msg.sender,
            _executionTxHash,
            tx.reward,
            block.timestamp
        );
    }
    
    /**
     * @dev Reclama recompensas acumuladas
     */
    function claimRewards() external onlyActiveFisher {
        uint256 rewards = fishers[msg.sender].totalRewards;
        require(rewards > 0, "No rewards to claim");
        
        // Resetear recompensas
        fishers[msg.sender].totalRewards = 0;
        
        // Transferir recompensas
        payable(msg.sender).transfer(rewards);
        
        emit RewardClaimed(msg.sender, rewards, block.timestamp);
    }
    
    /**
     * @dev Calcula la recompensa para un monto dado
     * @param _amount Monto de la transacción
     * @return reward Recompensa calculada
     */
    function calculateReward(uint256 _amount) public view returns (uint256) {
        uint256 reward = (_amount * rewardRate) / 10000;
        
        if (reward < minReward) {
            reward = minReward;
        }
        
        if (reward > maxReward) {
            reward = maxReward;
        }
        
        return reward;
    }
    
    /**
     * @dev Obtiene información de un fisher
     * @param _fisherAddress Dirección del fisher
     * @return fisher Estructura del fisher
     */
    function getFisher(address _fisherAddress) external view returns (Fisher memory) {
        return fishers[_fisherAddress];
    }
    
    /**
     * @dev Obtiene información de una transacción capturada
     * @param _transactionId ID de la transacción
     * @return transaction Estructura de la transacción
     */
    function getCaughtTransaction(bytes32 _transactionId) external view returns (CaughtTransaction memory) {
        return caughtTransactions[_transactionId];
    }
    
    /**
     * @dev Obtiene el número de fishers activos
     * @return count Número de fishers activos
     */
    function getActiveFishersCount() external view returns (uint256) {
        return activeFishers.length;
    }
    
    /**
     * @dev Obtiene la lista de fishers activos
     * @return fishersList Array de direcciones de fishers activos
     */
    function getActiveFishers() external view returns (address[] memory) {
        return activeFishers;
    }
    
    /**
     * @dev Actualiza la tasa de recompensa (solo owner)
     * @param _newRate Nueva tasa en basis points
     */
    function setRewardRate(uint256 _newRate) external onlyOwner {
        require(_newRate <= 1000, "Reward rate too high"); // Máximo 10%
        rewardRate = _newRate;
        emit RewardRateUpdated(_newRate, block.timestamp);
    }
    
    /**
     * @dev Actualiza el mínimo de recompensa (solo owner)
     * @param _newMin Nuevo mínimo en tinybars
     */
    function setMinReward(uint256 _newMin) external onlyOwner {
        minReward = _newMin;
    }
    
    /**
     * @dev Actualiza el máximo de recompensa (solo owner)
     * @param _newMax Nuevo máximo en tinybars
     */
    function setMaxReward(uint256 _newMax) external onlyOwner {
        maxReward = _newMax;
    }
    
    /**
     * @dev Desactiva un fisher (solo owner)
     * @param _fisherAddress Dirección del fisher a desactivar
     */
    function deactivateFisher(address _fisherAddress) external onlyOwner {
        require(fishers[_fisherAddress].active, "Fisher already inactive");
        fishers[_fisherAddress].active = false;
    }
    
    /**
     * @dev Permite recibir HBAR
     */
    receive() external payable {}
    
    /**
     * @dev Permite al owner retirar fondos
     * @param _amount Cantidad a retirar
     */
    function withdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        payable(owner).transfer(_amount);
    }
}

