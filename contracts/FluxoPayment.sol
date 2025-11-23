// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FluxoPayment
 * @dev Smart contract para manejar pagos offline que se sincronizan con Hedera
 * Cumple con los requisitos del Hedera EVM Innovator Track
 */
contract FluxoPayment {
    // Estructura para representar un pago offline
    struct OfflinePayment {
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string message;
        bytes signature;
        bool synced;
        uint256 syncTimestamp;
    }

    // Mapeo de pagos offline por ID único
    mapping(bytes32 => OfflinePayment) public offlinePayments;
    
    // Mapeo de balances de usuarios
    mapping(address => uint256) public balances;
    
    // Array de todos los IDs de pagos
    bytes32[] public paymentIds;
    
    // Eventos
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );
    
    event PaymentSynced(
        bytes32 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 syncTimestamp
    );
    
    event BalanceUpdated(
        address indexed user,
        uint256 newBalance,
        uint256 timestamp
    );

    // Precio del HBAR en USD (será actualizado por oráculo)
    uint256 public hbarPriceUSD;
    address public oracleAddress;
    
    // Owner del contrato
    address public owner;
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(address _oracleAddress) {
        owner = msg.sender;
        oracleAddress = _oracleAddress;
        hbarPriceUSD = 0; // Se actualizará por oráculo
    }

    /**
     * @dev Crea un pago offline que será sincronizado después
     * @param _to Dirección del destinatario
     * @param _amount Cantidad en tinybars (1 HBAR = 100,000,000 tinybars)
     * @param _message Mensaje opcional
     * @param _signature Firma del mensaje
     * @return paymentId ID único del pago
     */
    function createOfflinePayment(
        address _to,
        uint256 _amount,
        string memory _message,
        bytes memory _signature
    ) external returns (bytes32) {
        require(_to != address(0), "Invalid recipient address");
        require(_amount > 0, "Amount must be greater than 0");
        require(balances[msg.sender] >= _amount, "Insufficient balance");

        // Generar ID único del pago
        bytes32 paymentId = keccak256(
            abi.encodePacked(
                msg.sender,
                _to,
                _amount,
                block.timestamp,
                _message
            )
        );

        // Verificar que el pago no existe
        require(offlinePayments[paymentId].from == address(0), "Payment already exists");

        // Crear el pago offline
        offlinePayments[paymentId] = OfflinePayment({
            from: msg.sender,
            to: _to,
            amount: _amount,
            timestamp: block.timestamp,
            message: _message,
            signature: _signature,
            synced: false,
            syncTimestamp: 0
        });

        paymentIds.push(paymentId);

        emit PaymentCreated(paymentId, msg.sender, _to, _amount, block.timestamp);

        return paymentId;
    }

    /**
     * @dev Sincroniza un pago offline con Hedera
     * @param _paymentId ID del pago a sincronizar
     */
    function syncOfflinePayment(bytes32 _paymentId) external {
        OfflinePayment storage payment = offlinePayments[_paymentId];
        
        require(payment.from != address(0), "Payment does not exist");
        require(!payment.synced, "Payment already synced");
        require(balances[payment.from] >= payment.amount, "Insufficient balance");

        // Transferir fondos
        balances[payment.from] -= payment.amount;
        balances[payment.to] += payment.amount;

        // Marcar como sincronizado
        payment.synced = true;
        payment.syncTimestamp = block.timestamp;

        emit PaymentSynced(
            _paymentId,
            payment.from,
            payment.to,
            payment.amount,
            block.timestamp
        );

        emit BalanceUpdated(payment.from, balances[payment.from], block.timestamp);
        emit BalanceUpdated(payment.to, balances[payment.to], block.timestamp);
    }

    /**
     * @dev Deposita fondos en el contrato
     */
    function deposit() public payable {
        require(msg.value > 0, "Must send some HBAR");
        balances[msg.sender] += msg.value;
        emit BalanceUpdated(msg.sender, balances[msg.sender], block.timestamp);
    }

    /**
     * @dev Retira fondos del contrato
     * @param _amount Cantidad a retirar
     */
    function withdraw(uint256 _amount) external {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        balances[msg.sender] -= _amount;
        payable(msg.sender).transfer(_amount);
        emit BalanceUpdated(msg.sender, balances[msg.sender], block.timestamp);
    }

    /**
     * @dev Obtiene información de un pago
     * @param _paymentId ID del pago
     * @return payment Estructura del pago
     */
    function getPayment(bytes32 _paymentId) external view returns (OfflinePayment memory) {
        return offlinePayments[_paymentId];
    }

    /**
     * @dev Obtiene el balance de un usuario
     * @param _user Dirección del usuario
     * @return Balance del usuario
     */
    function getBalance(address _user) external view returns (uint256) {
        return balances[_user];
    }

    /**
     * @dev Actualiza el precio de HBAR desde el oráculo
     * @param _price Nuevo precio en USD (con 8 decimales)
     */
    function updateHbarPrice(uint256 _price) external {
        require(msg.sender == oracleAddress, "Only oracle can update price");
        hbarPriceUSD = _price;
    }

    /**
     * @dev Convierte HBAR a USD usando el precio del oráculo
     * @param _hbarAmount Cantidad en tinybars
     * @return Valor en USD (con 8 decimales)
     */
    function convertHbarToUSD(uint256 _hbarAmount) external view returns (uint256) {
        require(hbarPriceUSD > 0, "Price not set by oracle");
        // _hbarAmount está en tinybars (1e8), hbarPriceUSD tiene 8 decimales
        // Resultado: (hbarAmount / 1e8) * (priceUSD / 1e8) * 1e8
        return (_hbarAmount * hbarPriceUSD) / 1e8;
    }

    /**
     * @dev Obtiene el número total de pagos
     * @return Número total de pagos
     */
    function getTotalPayments() external view returns (uint256) {
        return paymentIds.length;
    }

    /**
     * @dev Permite al owner cambiar la dirección del oráculo
     * @param _newOracle Nueva dirección del oráculo
     */
    function setOracleAddress(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle address");
        oracleAddress = _newOracle;
    }

    // Función para recibir HBAR
    receive() external payable {
        deposit();
    }
}

