'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './FluxoPagos.module.css'
import HederaIntegration from './HederaIntegration'
import { getBalance, getWalletBalance, createOfflinePayment, syncOfflinePayment, getHbarPriceUSD, convertHbarToUSD, depositHBAR } from '@/lib/hedera'
import { getEnhancedMeshNetwork, MeshPayment } from '@/lib/mesh-network-enhanced'
import { getEVVMFisherService } from '@/lib/evvm-fisher'
import MeshNetworkStatus from './MeshNetworkStatus'
import EVVMFisher from './EVVMFisher'

interface Transaction {
  id: string
  type: 'send' | 'receive' | 'buy'
  to?: string
  from?: string
  amount: number
  timestamp: number
  synced: boolean
  message?: string
}

export default function FluxoPagos() {
  const { user, logout, authenticated, ready } = usePrivy()
  const { wallets } = useWallets()
  const router = useRouter()

  // Estados para modales
  const [activeModal, setActiveModal] = useState<'pay' | 'receive' | 'buy' | null>(null)
  
  // Estados para formularios
  const [payTo, setPayTo] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payNetwork, setPayNetwork] = useState('hedera')
  const [payMessage, setPayMessage] = useState('')
  
  const [receiveFrom, setReceiveFrom] = useState('')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [receiveNetwork, setReceiveNetwork] = useState('hedera')

  // Estados para datos
  const [balance, setBalance] = useState<number>(0)
  const [contractBalance, setContractBalance] = useState<number>(0) // Balance en el contrato
  const [hbarPrice, setHbarPrice] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [meshMode, setMeshMode] = useState(false)
  
  const meshNetwork = getEnhancedMeshNetwork()
  const evvmFisher = getEVVMFisherService()

  // Redirigir si no está autenticado
  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/fluxo')
    }
  }, [ready, authenticated, router])

  // Cargar datos iniciales
  useEffect(() => {
    if (ready && wallets.length > 0) {
      loadBalance()
      loadContractBalance()
      loadHbarPrice()
      loadTransactions()

      // Configurar wallet address en el servicio MESH
      meshNetwork.setLocalWalletAddress(wallets[0].address)

      // Conectar al servidor de señalización solo en el navegador
      if (typeof window !== 'undefined') {
        const signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8081'
        meshNetwork.connectToSignalingServer(signalingUrl).catch((error) => {
          console.warn('No se pudo conectar al servidor de señalización:', error)
          console.log('💡 Asegúrate de que el servidor esté corriendo: npm run signaling')
        })
      }
    }

    // Configurar callbacks de MESH
    meshNetwork.onPaymentReceived((payment) => {
      console.log('Pago recibido vía MESH:', payment)
      // Convertir a formato de transacción
      const tx: Transaction = {
        id: payment.id,
        type: 'receive',
        from: payment.from,
        amount: payment.amount,
        timestamp: payment.timestamp,
        synced: payment.synced,
        message: payment.message,
      }
      saveTransaction(tx)
      setStatus(`✅ Pago recibido vía MESH: ${payment.amount} HBAR`)
    })

    // Actualizar estado MESH periódicamente
    const meshInterval = setInterval(() => {
      const status = meshNetwork.getStatus()
      setMeshMode(status.meshMode)
    }, 1000)

    return () => clearInterval(meshInterval)
  }, [ready, wallets])

  const loadBalance = async () => {
    if (wallets.length === 0) return
    try {
      // Obtener balance real de HBAR de la wallet en Hedera
      const balanceHBAR = await getWalletBalance(wallets[0].address)
      setBalance(balanceHBAR)
      console.log('Balance cargado:', balanceHBAR, 'HBAR')
      console.log('Dirección de wallet:', wallets[0].address)
    } catch (error) {
      console.error('Error loading balance:', error)
      // Si falla, intentar obtener del contrato como fallback
      try {
        const contractBalance = await getBalance(wallets[0].address)
        setBalance(contractBalance)
        console.log('Balance del contrato:', contractBalance, 'HBAR')
      } catch (fallbackError) {
        console.error('Error loading balance from contract:', fallbackError)
      }
    }
  }

  const loadContractBalance = async () => {
    if (wallets.length === 0) return
    try {
      // Obtener balance en el contrato
      const balanceInContract = await getBalance(wallets[0].address)
      setContractBalance(balanceInContract)
      console.log('Balance en contrato:', balanceInContract, 'HBAR')
    } catch (error) {
      console.error('Error loading contract balance:', error)
      setContractBalance(0)
    }
  }

  const loadHbarPrice = async () => {
    try {
      const price = await getHbarPriceUSD()
      setHbarPrice(price)
      console.log('Precio de HBAR cargado:', price, 'USD')
    } catch (error) {
      console.error('Error loading HBAR price:', error)
      // Si falla, usar un precio por defecto aproximado
      setHbarPrice(0.05) // $0.05 USD por HBAR (precio aproximado)
      console.log('Usando precio por defecto: $0.05 USD por HBAR')
    }
  }

  const loadTransactions = async () => {
    // Por ahora, cargamos transacciones del localStorage
    // En el futuro, se cargarán desde el contrato
    const stored = localStorage.getItem('fluxo_transactions')
    if (stored) {
      try {
        setTransactions(JSON.parse(stored))
      } catch (error) {
        console.error('Error loading transactions:', error)
      }
    }
  }

  const saveTransaction = (tx: Transaction) => {
    const updated = [tx, ...transactions]
    setTransactions(updated)
    localStorage.setItem('fluxo_transactions', JSON.stringify(updated))
  }

  const handleLogout = async () => {
    await logout()
    router.push('/fluxo')
  }

  const formatAddress = (address: string) => {
    if (!address) return 'N/A'
    if (address.length <= 10) return address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (hours < 1) return 'Hace menos de una hora'
    if (hours < 24) return `Hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
    if (days === 1) return 'Ayer'
    if (days < 7) return `Hace ${days} días`
    return date.toLocaleDateString('es-ES')
  }

  const closeModal = () => {
    setActiveModal(null)
    setPayTo('')
    setPayAmount('')
    setPayMessage('')
    setReceiveFrom('')
    setReceiveAmount('')
    setStatus('')
  }

  const handleSendPayment = async () => {
    if (!payTo || !payAmount) {
      setStatus('❌ Por favor completa todos los campos')
      return
    }

    if (wallets.length === 0) {
      setStatus('❌ No hay wallet conectada')
      return
    }

    setLoading(true)
    setStatus('Enviando pago...')

    try {
      const amount = parseFloat(payAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Monto inválido')
      }

      if (amount > balance) {
        throw new Error('Saldo insuficiente')
      }

      // Obtener provider del wallet
      const provider = (window as any).ethereum || wallets[0].getEthereumProvider?.()
      if (!provider) {
        throw new Error('Provider no disponible')
      }

      // Crear firma simple (en producción, usaría una firma más segura)
      const signature = `Payment:${wallets[0].address}:${payTo}:${amount}:${Date.now()}`
      const timestamp = Math.floor(Date.now() / 1000)
      const paymentId = `payment_${wallets[0].address}_${payTo}_${amount}_${timestamp}`

      // Si el modo MESH está activo, enviar a través de MESH primero
      const meshStatus = meshNetwork.getStatus()
      if (meshStatus.meshMode && !meshStatus.isOnline) {
        // Modo offline: enviar solo por MESH
        const meshPayment: MeshPayment = {
          id: paymentId,
          from: wallets[0].address,
          to: payTo,
          amount: amount,
          message: payMessage || undefined,
          timestamp: timestamp,
          signature: signature,
          synced: false,
        }

        meshNetwork.sendPayment(meshPayment)

        // Guardar transacción localmente
        const tx: Transaction = {
          id: paymentId,
          type: 'send',
          to: payTo,
          amount: amount,
          timestamp: timestamp,
          synced: false,
          message: payMessage || undefined,
        }
        saveTransaction(tx)

        setStatus(`✅ Pago enviado vía MESH! Se sincronizará cuando haya conexión.`)
        
        setTimeout(() => {
          closeModal()
        }, 2000)
        return
      }

      // Verificar balance en el contrato antes de crear el pago
      let currentContractBalance = 0
      try {
        currentContractBalance = await getBalance(wallets[0].address)
      } catch (error) {
        console.warn('No se pudo obtener balance del contrato, asumiendo 0:', error)
      }
      
      if (currentContractBalance < amount) {
        // No hay suficiente balance en el contrato, necesitamos depositar
        const neededAmount = amount - currentContractBalance
        // Depositar un poco más para cubrir fees (mínimo 0.5 HBAR para fees)
        const depositAmount = Math.max(neededAmount + 0.5, 1.0) // Mínimo 1 HBAR
        
        if (balance < depositAmount) {
          throw new Error(`Saldo insuficiente en wallet. Necesitas ${depositAmount.toFixed(4)} HBAR para depositar en el contrato (tienes ${balance.toFixed(4)} HBAR).`)
        }
        
        setStatus(`Depositando ${depositAmount.toFixed(4)} HBAR en el contrato...`)
        
        try {
          // Depositar HBAR en el contrato
          const depositTxHash = await depositHBAR(provider, depositAmount)
          console.log('Depósito realizado:', depositTxHash)
          
          setStatus(`✅ Depósito confirmado! Esperando actualización del balance...`)
          
          // Esperar un momento para que se actualice el balance
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          // Actualizar balance del contrato
          await loadContractBalance()
          
          setStatus('Balance depositado. Creando pago...')
        } catch (depositError: any) {
          console.error('Error en depósito:', depositError)
          throw new Error(`Error al depositar: ${depositError.message || 'Error desconocido'}`)
        }
      }

      // Modo online: crear pago en Hedera
      const hederaPaymentId = await createOfflinePayment(
        provider,
        payTo,
        amount,
        payMessage || '',
        signature
      )

      if (hederaPaymentId) {
        // Guardar transacción localmente
        const tx: Transaction = {
          id: hederaPaymentId,
          type: 'send',
          to: payTo,
          amount: amount,
          timestamp: timestamp,
          synced: false,
          message: payMessage || undefined,
        }
        saveTransaction(tx)
        
        // Capturar transacción para EVVM Fisher
        // Esto permite que los Fishers puedan ejecutar la sincronización
        try {
          evvmFisher.catchTransaction({
            id: hederaPaymentId,
            fishingSpotId: 'contract-pending',
            paymentId: hederaPaymentId,
            from: wallets[0].address,
            to: payTo,
            amount: BigInt(Math.floor(amount * 100_000_000)), // Convertir a tinybars
            timestamp: timestamp,
            executed: false,
          })
          console.log('🎣 Transacción capturada por EVVM Fisher:', hederaPaymentId)
        } catch (error) {
          console.warn('No se pudo capturar transacción para EVVM:', error)
        }

        // También enviar por MESH si está activo (para redundancia)
        if (meshStatus.meshMode) {
          const meshPayment: MeshPayment = {
            id: hederaPaymentId,
            from: wallets[0].address,
            to: payTo,
            amount: amount,
            message: payMessage || undefined,
            timestamp: timestamp,
            signature: signature,
            synced: false,
          }
          meshNetwork.sendPayment(meshPayment)
        }

        setStatus(`✅ Pago creado! ID: ${hederaPaymentId.substring(0, 10)}...`)
        await loadBalance()
        await loadContractBalance()
        
        setTimeout(() => {
          closeModal()
        }, 2000)
      } else {
        throw new Error('No se pudo crear el pago')
      }
    } catch (error: any) {
      console.error('Error sending payment:', error)
      setStatus(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReceivePayment = async () => {
    // Para recibir, simplemente mostramos la dirección del wallet
    if (wallets.length === 0) {
      setStatus('❌ No hay wallet conectada')
      return
    }

    setStatus(`✅ Tu dirección para recibir: ${wallets[0].address}`)
    
    // Copiar al portapapeles
    if (navigator.clipboard) {
      navigator.clipboard.writeText(wallets[0].address)
      setStatus(`✅ Dirección copiada al portapapeles: ${formatAddress(wallets[0].address)}`)
    }
  }

  const handleSyncPayment = async (paymentId: string) => {
    if (wallets.length === 0) {
      setStatus('❌ No hay wallet conectada')
      return
    }

    setLoading(true)
    setStatus('Sincronizando pago...')

    try {
      const provider = (window as any).ethereum || wallets[0].getEthereumProvider?.()
      if (!provider) {
        throw new Error('Provider no disponible')
      }

      const txHash = await syncOfflinePayment(provider, paymentId)
      
      // Actualizar transacción
      const updated = transactions.map(tx => 
        tx.id === paymentId ? { ...tx, synced: true } : tx
      )
      setTransactions(updated)
      localStorage.setItem('fluxo_transactions', JSON.stringify(updated))

      setStatus(`✅ Pago sincronizado! TX: ${txHash.substring(0, 10)}...`)
      await loadBalance()
    } catch (error: any) {
      console.error('Error syncing payment:', error)
      setStatus(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  // Calcular balance en USD
  // Si el precio es 0 o muy grande, mostrar solo en HBAR
  const usdBalance = hbarPrice > 0 && hbarPrice < 1000 ? balance * hbarPrice : 0

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <a href="/fluxo" className={styles.logoNav}>
            <div className={styles.logoIcon}>
              <img src="/Fluxo/imagenes/IconLogoRe.jpeg" alt="Logo" />
            </div>
            <span className={styles.logoText}>Fluxo</span>
          </a>
          <ul className={styles.navLinks}>
            <li><a href="/fluxo#inicio">Inicio</a></li>
            <li><a href="/fluxo/pagos">Pagos</a></li>
            <li>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Salir
              </button>
            </li>
            <a href="/fluxo" className={styles.navCta}>Comienza Aquí</a>
          </ul>
        </div>
      </nav>

      {/* Sección de Pagos */}
      <main className={styles.pagosMain}>
        <div className={styles.pagosSidebar}>
          <button 
            className={styles.pagosBtn} 
            title="Comprar"
            onClick={() => setActiveModal('buy')}
          >
            <img src="/Fluxo/imagenes/cart.png" alt="Comprar" />
          </button>
          <button 
            className={styles.pagosBtn} 
            title="Enviar"
            onClick={() => setActiveModal('pay')}
          >
            <img src="/Fluxo/imagenes/direct.png" alt="Enviar" />
          </button>
          <button 
            className={styles.pagosBtn} 
            title="Recibir"
            onClick={() => setActiveModal('receive')}
          >
            <img src="/Fluxo/imagenes/received.png" alt="Recibir" />
          </button>
          <button className={styles.pagosBtn} title="Más opciones">⋯</button>
        </div>
        <div className={styles.pagosContent}>
          <div className={styles.pagosRow}>
            <div className={styles.walletsBox}>
              <div className={styles.walletsTitle}>Wallets</div>
              <div className={styles.walletList}>
                {wallets.length > 0 ? (
                  <div className={styles.walletItem}>
                    <div className={styles.walletIcon}>🔐</div>
                    <div>
                      <div className={styles.walletName}>Privy Wallet</div>
                      <div className={styles.walletAddress}>
                        {formatAddress(wallets[0].address)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.walletItem}>
                    <div className={styles.walletIcon}>🔐</div>
                    <div>
                      <div className={styles.walletName}>Conectando...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.saldoBox}>
              <div className={styles.saldoTitle}>Saldo de la cuenta</div>
              <div className={styles.saldoAmount}>
                {hbarPrice > 0 ? `$${usdBalance.toFixed(2)}` : `${balance.toFixed(4)} HBAR`}
              </div>
              <div className={styles.saldoCurrency}>
                {hbarPrice > 0 ? 'USD' : 'HBAR (Hedera)'}
              </div>
              <div className={styles.saldoActions}>
                <button 
                  className={styles.saldoActionBtn} 
                  onClick={loadBalance}
                  disabled={loading}
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
          <div className={styles.networkBox}>
            <div className={styles.networkTitle}>Red utilizada</div>
            <div className={styles.networkStatus}>
              <span className={styles.networkDot}></span>
              <span>Hedera Testnet</span>
            </div>
          </div>
          <div className={styles.historialBox}>
            <div className={styles.historialTitle}>Historial de transacciones</div>
            <div className={styles.historialList}>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <div key={tx.id} className={styles.historialItem}>
                    <div className={styles.historialIcon}>
                      {tx.type === 'send' ? '📤' : tx.type === 'receive' ? '📥' : '🛒'}
                    </div>
                    <div className={styles.historialDetails}>
                      {tx.type === 'send' && `Envío a ${formatAddress(tx.to || '')}`}
                      {tx.type === 'receive' && `Depósito de ${formatAddress(tx.from || '')}`}
                      {tx.type === 'buy' && 'Compra'}
                      <div style={{ fontSize: '0.85rem', color: '#888' }}>
                        {formatDate(tx.timestamp)}
                        {!tx.synced && (
                          <span style={{ marginLeft: '0.5rem', color: '#ff6b35' }}>
                            • Pendiente sincronización
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <div className={styles.historialAmount}>
                        {tx.type === 'send' ? '-' : '+'}{tx.amount.toFixed(4)} HBAR
                      </div>
                      {!tx.synced && tx.type === 'send' && (
                        <button
                          onClick={() => handleSyncPayment(tx.id)}
                          disabled={loading}
                          style={{
                            background: '#ff6b35',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.75rem',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          Sincronizar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', padding: '1rem', textAlign: 'center' }}>
                  No hay transacciones aún
                </div>
              )}
            </div>
          </div>

          {/* Integración Hedera */}
          <HederaIntegration />

          {/* Estado de Red MESH */}
          <MeshNetworkStatus />

          {/* EVVM Fisher/Relayer */}
          <EVVMFisher />
        </div>
      </main>

      {/* Overlay para cerrar modales */}
      {activeModal && (
        <div 
          className={styles.modalOverlay}
          onClick={closeModal}
        />
      )}

      {/* Modales */}
      {/* Modal Enviar */}
      <div 
        className={`${styles.floatingModal} ${activeModal === 'pay' ? styles.active : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Realizar pago</h3>
        <label htmlFor="payTo">Enviar a (Dirección wallet):</label>
        <input
          type="text"
          id="payTo"
          placeholder="Ej: 0xA1...B2C3"
          value={payTo}
          onChange={(e) => setPayTo(e.target.value)}
        />
        <label htmlFor="payAmount">Monto (HBAR):</label>
        <input
          type="number"
          id="payAmount"
          placeholder="0.00"
          value={payAmount}
          onChange={(e) => setPayAmount(e.target.value)}
        />
        <label htmlFor="payMessage">Mensaje (opcional):</label>
        <input
          type="text"
          id="payMessage"
          placeholder="Mensaje opcional"
          value={payMessage}
          onChange={(e) => setPayMessage(e.target.value)}
        />
        <label htmlFor="payNetwork">Red:</label>
        <select
          id="payNetwork"
          className={styles.networkSelect}
          value={payNetwork}
          onChange={(e) => setPayNetwork(e.target.value)}
        >
          <option value="hedera">Hedera Testnet</option>
        </select>
        {status && (
          <div style={{
            padding: '0.8rem',
            borderRadius: '8px',
            background: status.includes('✅') ? '#e8f5e9' : status.includes('❌') ? '#ffebee' : '#e3f2fd',
            color: status.includes('✅') ? '#2e7d32' : status.includes('❌') ? '#c62828' : '#1565c0',
            fontSize: '0.9rem',
            marginBottom: '0.8rem',
          }}>
            {status}
          </div>
        )}
        <div className={styles.modalActions}>
          <button className={styles.modalBtn} onClick={closeModal} disabled={loading}>
            Cancelar
          </button>
          <button 
            className={styles.modalBtn} 
            onClick={handleSendPayment}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>

      {/* Modal Recibir */}
      <div 
        className={`${styles.floatingModal} ${activeModal === 'receive' ? styles.active : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Recibir dinero</h3>
        {wallets.length > 0 ? (
          <>
            <label>Tu dirección de wallet:</label>
            <div style={{
              padding: '1rem',
              background: '#f5f5f5',
              borderRadius: '10px',
              wordBreak: 'break-all',
              marginBottom: '1rem',
              fontFamily: 'monospace',
            }}>
              {wallets[0].address}
            </div>
            <button
              className={styles.modalBtn}
              onClick={handleReceivePayment}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              Copiar dirección
            </button>
          </>
        ) : (
          <p style={{ color: '#888' }}>No hay wallet conectada</p>
        )}
        {status && (
          <div style={{
            padding: '0.8rem',
            borderRadius: '8px',
            background: status.includes('✅') ? '#e8f5e9' : '#ffebee',
            color: status.includes('✅') ? '#2e7d32' : '#c62828',
            fontSize: '0.9rem',
            marginBottom: '0.8rem',
          }}>
            {status}
          </div>
        )}
        <div className={styles.modalActions}>
          <button className={styles.modalBtn} onClick={closeModal}>
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal Comprar */}
      <div 
        className={`${styles.floatingModal} ${activeModal === 'buy' ? styles.active : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Comprar</h3>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <img 
            src="/Fluxo/imagenes/cart.png" 
            alt="Comprar" 
            style={{ width: '64px', height: '64px', marginBottom: '1rem' }}
          />
          <p style={{ fontSize: '1.2rem', color: '#888' }}>Coming soon...</p>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.modalBtn} onClick={closeModal}>
            Cerrar
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <a href="/fluxo">Inicio</a> |
            <a href="/fluxo#caracteristicas">Características</a> |
            <a href="/fluxo#como-funciona">Cómo Funciona</a> |
            <a href="/fluxo#contacto">Contacto</a>
          </div>
          <p>&copy; 2023 Fluxo. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
