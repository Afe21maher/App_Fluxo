// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OracleMock
 * @dev Mock de oráculo para testing. En producción se usaría Chainlink o Pyth
 * Este contrato simula un oráculo de precios para HBAR/USD
 */
contract OracleMock {
    uint256 public hbarPriceUSD;
    address public fluxoPaymentContract;
    address public owner;

    event PriceUpdated(uint256 newPrice, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor() {
        owner = msg.sender;
        // Precio inicial de HBAR en USD (con 8 decimales)
        // Ejemplo: $0.05 = 5000000 (5 * 10^6)
        hbarPriceUSD = 5000000; // $0.05 por HBAR
    }

    /**
     * @dev Establece el contrato FluxoPayment que puede actualizar precios
     */
    function setFluxoPaymentContract(address _contract) external onlyOwner {
        fluxoPaymentContract = _contract;
    }

    /**
     * @dev Actualiza el precio de HBAR (simula actualización de oráculo)
     * @param _newPrice Nuevo precio en USD con 8 decimales
     */
    function updatePrice(uint256 _newPrice) external onlyOwner {
        require(_newPrice > 0, "Price must be greater than 0");
        hbarPriceUSD = _newPrice;
        emit PriceUpdated(_newPrice, block.timestamp);
        
        // Actualizar precio en FluxoPayment si está configurado
        if (fluxoPaymentContract != address(0)) {
            (bool success, ) = fluxoPaymentContract.call(
                abi.encodeWithSignature("updateHbarPrice(uint256)", _newPrice)
            );
            require(success, "Failed to update price in FluxoPayment");
        }
    }

    /**
     * @dev Obtiene el precio actual de HBAR
     * @return Precio en USD con 8 decimales
     */
    function getPrice() external view returns (uint256) {
        return hbarPriceUSD;
    }
}

