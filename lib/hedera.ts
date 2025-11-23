/**
 * Hedera EVM Integration
 * Maneja la conexión con Hedera y las interacciones con los smart contracts
 */

import { ethers } from 'ethers'

// Direcciones de los contratos desplegados en Hedera Testnet
const FLUXO_PAYMENT_CONTRACT = process.env.NEXT_PUBLIC_FLUXO_PAYMENT_CONTRACT || '0xFF0dc94E621B666DB7C303a4cF326aE63B2efb51'
const ORACLE_CONTRACT = process.env.NEXT_PUBLIC_ORACLE_CONTRACT || '0x5B8A3205Dd56A99F96F9C65B455b483D31cFF1eB'

// RPC de Hedera según la red
const getHederaRPC = () => {
  const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK || 'testnet'
  if (network === 'testnet') {
    return 'https://testnet.hashio.io/api'
  } else if (network === 'previewnet') {
    return 'https://previewnet.hashio.io/api'
  }
  return 'https://testnet.hashio.io/api'
}

// ABI del contrato FluxoPayment (simplificado, se generará automáticamente)
const FLUXO_PAYMENT_ABI = [
  'function createOfflinePayment(address _to, uint256 _amount, string memory _message, bytes memory _signature) external returns (bytes32)',
  'function syncOfflinePayment(bytes32 _paymentId) external',
  'function deposit() external payable',
  'function withdraw(uint256 _amount) external',
  'function getBalance(address _user) external view returns (uint256)',
  'function getPayment(bytes32 _paymentId) external view returns (tuple(address from, address to, uint256 amount, uint256 timestamp, string message, bytes signature, bool synced, uint256 syncTimestamp))',
  'function convertHbarToUSD(uint256 _hbarAmount) external view returns (uint256)',
  'function hbarPriceUSD() external view returns (uint256)',
  'event PaymentCreated(bytes32 indexed paymentId, address indexed from, address indexed to, uint256 amount, uint256 timestamp)',
  'event PaymentSynced(bytes32 indexed paymentId, address indexed from, address indexed to, uint256 amount, uint256 syncTimestamp)',
]

/**
 * Obtiene un provider de Hedera
 */
export function getHederaProvider() {
  const rpcUrl = getHederaRPC()
  return new ethers.JsonRpcProvider(rpcUrl)
}

/**
 * Convierte un provider EIP-1193 (como Privy) a un signer de ethers
 * Usa un enfoque que evita completamente ENS para redes que no lo soportan
 */
export async function getSignerFromProvider(provider: any) {
  // Primero intentar con BrowserProvider (método estándar)
  try {
    const hederaNetwork = {
      chainId: 296,
      name: 'hedera-testnet',
    }
    const ethersProvider = new ethers.BrowserProvider(provider, hederaNetwork)
    return await ethersProvider.getSigner()
  } catch (error: any) {
    // Si el error es por ENS, usar un enfoque alternativo
    if (error.message?.includes('ENS') || error.code === 'UNSUPPORTED_OPERATION' || error.message?.includes('does not support ENS')) {
      console.warn('Error de ENS detectado, usando enfoque alternativo...', error.message)
      
      try {
        // Obtener la dirección de la cuenta desde el provider
        const accounts = await provider.request({ method: 'eth_accounts' })
        if (!accounts || accounts.length === 0) {
          throw new Error('No se encontraron cuentas en el provider')
        }
        const address = accounts[0]
        
        // Usar JsonRpcProvider directamente con el RPC de Hedera
        // Esto evita completamente el problema de ENS
        const rpcUrl = getHederaRPC()
        const jsonRpcProvider = new ethers.JsonRpcProvider(rpcUrl)
        
        // Crear un signer usando JsonRpcSigner
        // Este signer usará el provider EIP-1193 para firmar transacciones
        const signer = new ethers.JsonRpcSigner(jsonRpcProvider, address)
        
        // Sobrescribir sendTransaction para usar el provider EIP-1193
        const originalSendTransaction = signer.sendTransaction.bind(signer)
        signer.sendTransaction = async function(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
          // Preparar la transacción
          const txRequest = await this.populateTransaction(tx)
          
          // Enviar a través del provider EIP-1193
          const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address,
              to: txRequest.to,
              value: txRequest.value ? `0x${txRequest.value.toString(16)}` : undefined,
              data: txRequest.data,
              gas: txRequest.gasLimit ? `0x${txRequest.gasLimit.toString(16)}` : undefined,
              gasPrice: txRequest.gasPrice ? `0x${txRequest.gasPrice.toString(16)}` : undefined,
            }]
          })
          
          // Obtener la transacción usando el JsonRpcProvider
          const txResponse = await jsonRpcProvider.getTransaction(txHash)
          if (!txResponse) {
            throw new Error('No se pudo obtener la transacción después de enviarla')
          }
          
          return txResponse
        }
        
        return signer
      } catch (altError: any) {
        console.error('Error en enfoque alternativo:', altError)
        throw new Error(`No se pudo obtener el signer. Error original: ${error.message}. Error alternativo: ${altError.message}`)
      }
    }
    
    // Si el error no es por ENS, relanzarlo
    throw error
  }
}

/**
 * Obtiene una instancia del contrato FluxoPayment
 */
export function getFluxoPaymentContract(signerOrProvider?: ethers.Signer | ethers.Provider) {
  const provider = signerOrProvider || getHederaProvider()
  const contract = new ethers.Contract(
    FLUXO_PAYMENT_CONTRACT,
    FLUXO_PAYMENT_ABI,
    provider
  )
  return contract
}

/**
 * Convierte HBAR a tinybars
 */
export function hbarToTinybars(hbar: number): bigint {
  return BigInt(Math.floor(hbar * 100_000_000))
}

/**
 * Convierte tinybars a HBAR
 */
export function tinybarsToHbar(tinybars: bigint): number {
  return Number(tinybars) / 100_000_000
}

/**
 * Crea un pago offline
 */
export async function createOfflinePayment(
  provider: any,
  to: string,
  amountHBAR: number,
  message: string,
  signature: string
) {
  const signer = await getSignerFromProvider(provider)
  const contract = getFluxoPaymentContract(signer)
  const amount = hbarToTinybars(amountHBAR)
  const signatureBytes = ethers.toUtf8Bytes(signature)

  const tx = await contract.createOfflinePayment(
    to,
    amount,
    message,
    signatureBytes
  )
  const receipt = await tx.wait()
  
  // Obtener el evento PaymentCreated
  const event = receipt.logs.find((log: any) => {
    try {
      const parsed = contract.interface.parseLog(log)
      return parsed?.name === 'PaymentCreated'
    } catch {
      return false
    }
  })

  if (event) {
    const parsed = contract.interface.parseLog(event)
    return parsed?.args[0] // paymentId
  }

  return null
}

/**
 * Sincroniza un pago offline
 */
export async function syncOfflinePayment(
  provider: any,
  paymentId: string
) {
  const signer = await getSignerFromProvider(provider)
  const contract = getFluxoPaymentContract(signer)
  const tx = await contract.syncOfflinePayment(paymentId)
  await tx.wait()
  return tx.hash
}

/**
 * Deposita HBAR en el contrato
 */
export async function depositHBAR(
  provider: any,
  amountHBAR: number
) {
  const signer = await getSignerFromProvider(provider)
  const contract = getFluxoPaymentContract(signer)
  
  // Convertir HBAR a wei (ethers.js usa wei, no tinybars)
  // 1 HBAR = 10^8 tinybars, pero ethers espera wei (10^18)
  // En Hedera EVM, 1 HBAR = 10^18 wei (como Ethereum)
  const amountWei = ethers.parseEther(amountHBAR.toString())
  
  console.log('Depositando:', amountHBAR, 'HBAR =', amountWei.toString(), 'wei')
  
  try {
    // Estimar gas primero
    const gasEstimate = await contract.deposit.estimateGas({ value: amountWei })
    console.log('Gas estimado:', gasEstimate.toString())
    
    // Enviar transacción con gas estimado
    const tx = await contract.deposit({ 
      value: amountWei,
      gasLimit: gasEstimate * BigInt(120) / BigInt(100) // Agregar 20% de margen
    })
    
    console.log('Transacción enviada, esperando confirmación...')
    const receipt = await tx.wait()
    console.log('Depósito confirmado:', receipt.hash)
    
    return receipt.hash
  } catch (error: any) {
    console.error('Error en depósito:', error)
    // Si el error es por gas, intentar con un valor más bajo
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || error.message?.includes('gas')) {
      throw new Error('Error estimando gas. Verifica que tengas suficiente balance para cubrir el depósito y las fees.')
    }
    throw error
  }
}

/**
 * Obtiene el balance de un usuario en el contrato
 */
export async function getBalance(userAddress: string): Promise<number> {
  const contract = getFluxoPaymentContract()
  const balance = await contract.getBalance(userAddress)
  return tinybarsToHbar(balance)
}

/**
 * Obtiene el balance real de HBAR de una wallet en Hedera
 */
export async function getWalletBalance(userAddress: string): Promise<number> {
  const provider = getHederaProvider()
  const balanceWei = await provider.getBalance(userAddress)
  
  // ethers devuelve el balance en wei (10^18), pero Hedera usa tinybars (10^8)
  // Necesitamos convertir de wei a HBAR
  // 1 HBAR = 100,000,000 tinybars = 10^8
  // Pero ethers trata todo como wei (10^18), así que necesitamos dividir por 10^18
  // y luego multiplicar por 10^8 para obtener HBAR
  
  // Convertir de wei a HBAR directamente
  const balanceHBAR = Number(balanceWei) / 1e18
  
  console.log('Balance raw (wei):', balanceWei.toString())
  console.log('Balance en HBAR:', balanceHBAR)
  
  return balanceHBAR
}

/**
 * Obtiene información de un pago
 */
export async function getPayment(paymentId: string) {
  const contract = getFluxoPaymentContract()
  const payment = await contract.getPayment(paymentId)
  return {
    from: payment.from,
    to: payment.to,
    amount: tinybarsToHbar(payment.amount),
    timestamp: Number(payment.timestamp),
    message: payment.message,
    synced: payment.synced,
    syncTimestamp: Number(payment.syncTimestamp),
  }
}

/**
 * Convierte HBAR a USD usando el precio del oráculo
 */
export async function convertHbarToUSD(hbarAmount: number): Promise<number> {
  const contract = getFluxoPaymentContract()
  const amount = hbarToTinybars(hbarAmount)
  const usdAmount = await contract.convertHbarToUSD(amount)
  // El resultado tiene 8 decimales
  return Number(usdAmount) / 1e8
}

/**
 * Obtiene el precio actual de HBAR en USD
 */
export async function getHbarPriceUSD(): Promise<number> {
  const contract = getFluxoPaymentContract()
  const price = await contract.hbarPriceUSD()
  // El precio tiene 8 decimales
  return Number(price) / 1e8
}

