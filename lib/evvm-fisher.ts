/**
 * EVVM Fisher/Relayer Service
 * Captura y ejecuta transacciones usando EVVM/MATE protocol
 * Integrado con Hedera y red MESH
 */

import { ethers, JsonRpcProvider } from 'ethers'
import { getHederaProvider, getFluxoPaymentContract } from './hedera'
import { getEnhancedMeshNetwork, MeshPayment } from './mesh-network-enhanced'

// Configuración de MATE protocol (EVVM en Sepolia)
const MATE_PROTOCOL_ADDRESS = '0x0000000000000000000000000000000000000000' // Se actualizará con la dirección real
const MATE_RPC_URL = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY' // O usar el RPC público

export interface FishingSpot {
  id: string
  name: string
  type: 'mesh' | 'mempool' | 'local' | 'pending'
  description: string
  transactionCount: number
  lastUpdate: number
  active: boolean
}

export interface CaughtTransaction {
  id: string
  fishingSpotId: string
  paymentId?: string
  from: string
  to: string
  amount: bigint
  data?: string
  timestamp: number
  caughtBy?: string // Address del fisher que la capturó
  executed: boolean
  executionTxHash?: string
  reward?: bigint
}

export interface Fisher {
  address: string
  totalCaught: number
  totalExecuted: number
  totalRewards: bigint
  active: boolean
  lastActivity: number
}

export class EVVMFisherService {
  private fishingSpots: Map<string, FishingSpot> = new Map()
  private caughtTransactions: Map<string, CaughtTransaction> = new Map()
  private fishers: Map<string, Fisher> = new Map()
  private meshNetwork: ReturnType<typeof getEnhancedMeshNetwork>
  private provider: JsonRpcProvider | null = null
  private isRunning: boolean = false
  private localWalletAddress: string = ''

  constructor() {
    this.meshNetwork = getEnhancedMeshNetwork()
    this.initializeFishingSpots()
  }

  /**
   * Inicializa los Fishing Spots disponibles
   */
  private initializeFishingSpots(): void {
    // Fishing Spot 1: Red MESH (transacciones offline)
    this.fishingSpots.set('mesh-network', {
      id: 'mesh-network',
      name: '🌐 Red MESH',
      type: 'mesh',
      description: 'Transacciones pendientes en la red MESH offline',
      transactionCount: 0,
      lastUpdate: Date.now(),
      active: true,
    })

    // Fishing Spot 2: Mempool de Hedera
    this.fishingSpots.set('hedera-mempool', {
      id: 'hedera-mempool',
      name: '⛓️ Mempool Hedera',
      type: 'mempool',
      description: 'Transacciones pendientes en el mempool de Hedera',
      transactionCount: 0,
      lastUpdate: Date.now(),
      active: true,
    })

    // Fishing Spot 3: Pagos locales pendientes
    this.fishingSpots.set('local-pending', {
      id: 'local-pending',
      name: '💾 Local Storage',
      type: 'local',
      description: 'Pagos guardados localmente pendientes de sincronización',
      transactionCount: 0,
      lastUpdate: Date.now(),
      active: true,
    })

    // Fishing Spot 4: Contrato FluxoPayment (pagos no sincronizados)
    this.fishingSpots.set('contract-pending', {
      id: 'contract-pending',
      name: '📜 Contrato FluxoPayment',
      type: 'pending',
      description: 'Pagos creados en el contrato pero no sincronizados',
      transactionCount: 0,
      lastUpdate: Date.now(),
      active: true,
    })
  }

  /**
   * Inicia el servicio de fishing
   */
  async start(provider?: JsonRpcProvider, walletAddress?: string): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ EVVM Fisher ya está corriendo')
      return
    }

    this.provider = provider || getHederaProvider()
    if (walletAddress) {
      this.localWalletAddress = walletAddress
    }
    this.isRunning = true

    console.log('🎣 EVVM Fisher iniciado')
    if (walletAddress) {
      console.log('👤 Wallet del fisher:', walletAddress.substring(0, 10) + '...')
    }
    console.log('📍 Fishing Spots activos:', this.fishingSpots.size)

    // Configurar listeners
    this.setupMeshListener()
    this.setupMempoolListener()
    this.setupLocalStorageListener()

    // Iniciar polling
    this.startPolling()
  }

  /**
   * Detiene el servicio de fishing
   */
  stop(): void {
    this.isRunning = false
    console.log('🛑 EVVM Fisher detenido')
  }

  /**
   * Configura listener para transacciones MESH
   */
  private setupMeshListener(): void {
    this.meshNetwork.onPaymentReceived((payment: MeshPayment) => {
      if (!payment.synced) {
        this.catchTransaction({
          id: payment.id,
          fishingSpotId: 'mesh-network',
          paymentId: payment.id,
          from: payment.from,
          to: payment.to,
          amount: BigInt(payment.amount),
          timestamp: payment.timestamp,
          executed: false,
        })
      }
    })
  }

  /**
   * Configura listener para mempool de Hedera
   */
  private setupMempoolListener(): void {
    // En una implementación completa, aquí se escucharía el mempool
    // Por ahora, simulamos con polling
  }

  /**
   * Configura listener para localStorage
   */
  private setupLocalStorageListener(): void {
    // Escuchar cambios en localStorage para pagos pendientes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'fluxo_pending_transactions') {
          this.scanLocalStorage()
        }
      })
    }
  }

  /**
   * Inicia el polling para buscar transacciones
   */
  private startPolling(): void {
    if (!this.isRunning) return

    // Escanear cada 5 segundos
    setInterval(async () => {
      if (!this.isRunning) return

      await this.scanFishingSpots()
    }, 5000)

    // Escanear inmediatamente
    this.scanFishingSpots()
  }

  /**
   * Escanea todos los Fishing Spots en busca de transacciones
   */
  async scanFishingSpots(): Promise<void> {
    for (const [spotId, spot] of this.fishingSpots.entries()) {
      if (!spot.active) continue

      try {
        switch (spot.type) {
          case 'mesh':
            await this.scanMeshNetwork(spotId)
            break
          case 'mempool':
            await this.scanMempool(spotId)
            break
          case 'local':
            await this.scanLocalStorage(spotId)
            break
          case 'pending':
            await this.scanContractPending(spotId)
            break
        }
      } catch (error) {
        console.error(`Error escaneando fishing spot ${spotId}:`, error)
      }
    }
  }

  /**
   * Escanea la red MESH en busca de transacciones pendientes
   */
  private async scanMeshNetwork(spotId: string): Promise<void> {
    const status = this.meshNetwork.getStatus()
    if (!status.meshMode) return

    // Obtener pagos pendientes de la red MESH
    const pendingPayments = this.meshNetwork.getPendingPayments()
    
    let count = 0
    for (const payment of pendingPayments) {
      if (!payment.synced && !this.caughtTransactions.has(payment.id)) {
        this.catchTransaction({
          id: payment.id,
          fishingSpotId: spotId,
          paymentId: payment.id,
          from: payment.from,
          to: payment.to,
          amount: BigInt(payment.amount),
          timestamp: payment.timestamp,
          executed: false,
        })
        count++
      }
    }

    if (count > 0) {
      this.updateFishingSpot(spotId, count)
      console.log(`🎣 Capturadas ${count} transacciones del Fishing Spot: ${spotId}`)
    }
  }

  /**
   * Escanea el mempool de Hedera
   */
  private async scanMempool(spotId: string): Promise<void> {
    // En una implementación completa, aquí se consultaría el mempool
    // Por ahora, esto es un placeholder
  }

  /**
   * Escanea localStorage en busca de pagos pendientes
   */
  private async scanLocalStorage(spotId?: string): Promise<void> {
    if (typeof window === 'undefined') return

    const spotIdToUse = spotId || 'local-pending'
    const stored = localStorage.getItem('fluxo_pending_transactions')
    if (!stored) return

    try {
      const transactions = JSON.parse(stored)
      let count = 0

      for (const tx of transactions) {
        if (!tx.synced && !this.caughtTransactions.has(tx.id)) {
          this.catchTransaction({
            id: tx.id,
            fishingSpotId: spotIdToUse,
            paymentId: tx.id,
            from: tx.from || '',
            to: tx.to,
            amount: BigInt(tx.amount || 0),
            timestamp: tx.timestamp || Date.now(),
            executed: false,
          })
          count++
        }
      }

      if (count > 0) {
        this.updateFishingSpot(spotIdToUse, count)
      }
    } catch (error) {
      console.error('Error escaneando localStorage:', error)
    }
  }

  /**
   * Escanea el contrato en busca de pagos no sincronizados
   */
  private async scanContractPending(spotId: string): Promise<void> {
    if (!this.provider) return

    try {
      // Escanear localStorage para encontrar transacciones guardadas
      // que tienen paymentId de Hedera pero no están sincronizadas
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('fluxo_transactions')
        if (stored) {
          const transactions = JSON.parse(stored)
          let count = 0
          
          for (const tx of transactions) {
            // Si la transacción tiene un ID pero no está sincronizada
            if (tx.id && !tx.synced && !this.caughtTransactions.has(tx.id)) {
              // Verificar si ya está sincronizada en el contrato
              try {
                const contract = getFluxoPaymentContract(this.provider)
                const paymentInfo = await contract.getPayment(tx.id)
                
                // Si ya está sincronizada, actualizar localStorage y saltar
                if (paymentInfo.synced) {
                  const updated = transactions.map((t: any) => 
                    t.id === tx.id ? { ...t, synced: true } : t
                  )
                  localStorage.setItem('fluxo_transactions', JSON.stringify(updated))
                  continue
                }
              } catch (error) {
                // Si hay error al verificar, continuar (puede ser que el pago no exista aún)
                console.warn(`No se pudo verificar estado del pago ${tx.id}:`, error)
              }
              
              // Intentar capturar si tiene información suficiente
              if (tx.to && tx.amount) {
                this.catchTransaction({
                  id: tx.id,
                  fishingSpotId: spotId,
                  paymentId: tx.id,
                  from: tx.from || '',
                  to: tx.to,
                  amount: BigInt(Math.floor(tx.amount * 100_000_000)), // Convertir a tinybars
                  timestamp: tx.timestamp || Date.now(),
                  executed: false,
                })
                count++
              }
            }
          }
          
          if (count > 0) {
            console.log(`🎣 Capturadas ${count} transacciones del contrato desde localStorage`)
          }
        }
      }
    } catch (error) {
      console.error('Error escaneando contrato:', error)
    }
  }

  /**
   * Captura una transacción
   */
  catchTransaction(tx: CaughtTransaction): void {
    // Verificar que no esté ya capturada
    if (this.caughtTransactions.has(tx.id)) {
      console.log(`⚠️ Transacción ${tx.id} ya estaba capturada`)
      return
    }
    
    this.caughtTransactions.set(tx.id, tx)
    console.log(`🎣 Transacción capturada: ${tx.id} desde ${tx.fishingSpotId}`)
    
    // Actualizar el fishing spot
    this.updateFishingSpot(tx.fishingSpotId, 1)
  }

  /**
   * Actualiza el estado de un Fishing Spot
   */
  private updateFishingSpot(spotId: string, newTransactions: number): void {
    const spot = this.fishingSpots.get(spotId)
    if (spot) {
      spot.transactionCount += newTransactions
      spot.lastUpdate = Date.now()
      this.fishingSpots.set(spotId, spot)
    }
  }

  /**
   * Ejecuta una transacción capturada usando EVVM/MATE
   */
  async executeTransaction(
    transactionId: string,
    fisherAddress: string,
    provider: any
  ): Promise<string | null> {
    const tx = this.caughtTransactions.get(transactionId)
    if (!tx) {
      throw new Error('Transacción no encontrada')
    }

    if (tx.executed) {
      throw new Error('Transacción ya ejecutada')
    }

    try {
      // Obtener signer
      const signer = await this.getSigner(provider)
      const contract = getFluxoPaymentContract(signer)

      // Si es un pago offline, verificar estado primero
      if (tx.paymentId) {
        // Verificar si el pago ya está sincronizado en el contrato
        try {
          const paymentInfo = await contract.getPayment(tx.paymentId)
          if (paymentInfo.synced) {
            // El pago ya está sincronizado, marcarlo como ejecutado sin intentar sincronizar
            console.log(`⚠️ Pago ${tx.paymentId} ya está sincronizado en el contrato`)
            tx.executed = true
            tx.caughtBy = fisherAddress
            // No otorgar recompensa si ya estaba sincronizado
            
            // Actualizar fishing spot
            const spot = this.fishingSpots.get(tx.fishingSpotId)
            if (spot) {
              spot.transactionCount = Math.max(0, spot.transactionCount - 1)
            }
            
            // Actualizar transacciones en localStorage
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem('fluxo_transactions')
              if (stored) {
                const transactions = JSON.parse(stored)
                const updated = transactions.map((t: any) => 
                  t.id === transactionId ? { ...t, synced: true } : t
                )
                localStorage.setItem('fluxo_transactions', JSON.stringify(updated))
              }
            }
            
            throw new Error('Este pago ya fue sincronizado anteriormente')
          }
        } catch (checkError: any) {
          // Si el error es que ya está sincronizado, lanzarlo
          if (checkError.message?.includes('ya fue sincronizado') || 
              checkError.message?.includes('already synced')) {
            throw checkError
          }
          // Si es otro error al verificar, continuar con la sincronización
          console.warn('No se pudo verificar estado del pago, continuando:', checkError)
        }

        // Sincronizar el pago
        const syncTx = await contract.syncOfflinePayment(tx.paymentId)
        const receipt = await syncTx.wait()

        // Marcar como ejecutada
        tx.executed = true
        tx.executionTxHash = receipt.hash
        tx.caughtBy = fisherAddress
        tx.reward = this.calculateReward(tx.amount)

        // Actualizar estadísticas del fisher
        this.updateFisherStats(fisherAddress, tx.reward)

        // Actualizar fishing spot
        const spot = this.fishingSpots.get(tx.fishingSpotId)
        if (spot) {
          spot.transactionCount = Math.max(0, spot.transactionCount - 1)
        }

        // Actualizar transacciones en localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('fluxo_transactions')
          if (stored) {
            const transactions = JSON.parse(stored)
            const updated = transactions.map((t: any) => 
              t.id === transactionId ? { ...t, synced: true } : t
            )
            localStorage.setItem('fluxo_transactions', JSON.stringify(updated))
          }
        }

        console.log(`✅ Transacción ejecutada: ${transactionId} por ${fisherAddress}`)
        return receipt.hash
      }

      return null
    } catch (error: any) {
      console.error(`Error ejecutando transacción ${transactionId}:`, error)
      
      // Si el error es que ya está sincronizado, marcar como ejecutado
      if (error.message?.includes('already synced') || 
          error.reason?.includes('already synced') ||
          error.message?.includes('ya fue sincronizado')) {
        tx.executed = true
        // Actualizar localStorage
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('fluxo_transactions')
          if (stored) {
            const transactions = JSON.parse(stored)
            const updated = transactions.map((t: any) => 
              t.id === transactionId ? { ...t, synced: true } : t
            )
            localStorage.setItem('fluxo_transactions', JSON.stringify(updated))
          }
        }
        throw new Error('Este pago ya fue sincronizado anteriormente. La transacción se ha actualizado.')
      }
      
      throw error
    }
  }

  /**
   * Calcula la recompensa para el fisher
   */
  private calculateReward(amount: bigint): bigint {
    // Recompensa del 0.1% del monto
    return (amount * BigInt(1)) / BigInt(1000)
  }

  /**
   * Actualiza las estadísticas de un fisher
   */
  private updateFisherStats(address: string, reward: bigint): void {
    let fisher = this.fishers.get(address)
    if (!fisher) {
      fisher = {
        address,
        totalCaught: 0,
        totalExecuted: 0,
        totalRewards: BigInt(0),
        active: true,
        lastActivity: Date.now(),
      }
    }

    fisher.totalExecuted++
    fisher.totalRewards += reward
    fisher.lastActivity = Date.now()
    this.fishers.set(address, fisher)
  }

  /**
   * Obtiene un signer desde un provider
   */
  private async getSigner(provider: any): Promise<ethers.Signer> {
    // Verificar que el provider sea válido
    if (!provider) {
      throw new Error('Provider no proporcionado')
    }
    
    // Verificar que tenga las propiedades necesarias de EIP-1193
    if (typeof provider.request !== 'function') {
      throw new Error('Provider no es válido (no tiene método request)')
    }
    
    try {
      // Si es un provider EIP-1193 (como Privy o MetaMask)
      const browserProvider = new ethers.BrowserProvider(provider)
      const signer = await browserProvider.getSigner()
      return signer
    } catch (error: any) {
      console.error('Error creando signer:', error)
      throw new Error(`Error al crear signer: ${error.message || 'Error desconocido'}`)
    }
  }

  /**
   * Obtiene todos los Fishing Spots
   */
  getFishingSpots(): FishingSpot[] {
    return Array.from(this.fishingSpots.values())
  }

  /**
   * Obtiene todas las transacciones capturadas
   */
  getCaughtTransactions(): CaughtTransaction[] {
    return Array.from(this.caughtTransactions.values())
  }

  /**
   * Obtiene transacciones capturadas por un fisher
   */
  getFisherTransactions(fisherAddress: string): CaughtTransaction[] {
    return Array.from(this.caughtTransactions.values()).filter(
      (tx) => tx.caughtBy === fisherAddress
    )
  }

  /**
   * Obtiene información de un fisher
   */
  getFisher(address: string): Fisher | undefined {
    return this.fishers.get(address)
  }

  /**
   * Obtiene todos los fishers
   */
  getAllFishers(): Fisher[] {
    return Array.from(this.fishers.values())
  }

  /**
   * Registra un nuevo fisher
   */
  registerFisher(address: string): void {
    if (!this.fishers.has(address)) {
      this.fishers.set(address, {
        address,
        totalCaught: 0,
        totalExecuted: 0,
        totalRewards: BigInt(0),
        active: true,
        lastActivity: Date.now(),
      })
      console.log(`🎣 Nuevo fisher registrado: ${address}`)
    }
  }
}

// Singleton instance
let evvmFisherInstance: EVVMFisherService | null = null

export function getEVVMFisherService(): EVVMFisherService {
  if (!evvmFisherInstance) {
    evvmFisherInstance = new EVVMFisherService()
  }
  return evvmFisherInstance
}

