'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './FluxoPagos.module.css'
import HederaIntegration from './HederaIntegration'
import MeshNetworkStatus from './MeshNetworkStatus'
import EVVMFisher from './EVVMFisher'
import { getBalance, getWalletBalance, createOfflinePayment, syncOfflinePayment, getHbarPriceUSD, convertHbarToUSD, depositHBAR } from '@/lib/hedera'
import { getEnhancedMeshNetwork, MeshPayment } from '@/lib/mesh-network-enhanced'
import { getEVVMFisherService } from '@/lib/evvm-fisher'

interface Transaction {
  id: string
  type: 'send' | 'receive' | 'buy'
  from?: string
  to?: string
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
  const [balance, setBalance] = useState<number>(0) // Balance de la wallet
  const [contractBalance, setContractBalance] = useState<number>(0) // Balance en el contrato
  const [hbarPrice, setHbarPrice] = useState<number>(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [meshMode, setMeshMode] = useState(false)
  
  const meshNetwork = getEnhancedMeshNetwork()

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
        })
      }
    }

    // Configurar callbacks de MESH
    meshNetwork.onPaymentReceived((payment) => {
      console.log('Pago recibido vía MESH:', payment)
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
      setStatus(`💸 Nuevo pago recibido vía MESH de ${formatAddress(payment.from)} por ${payment.amount} HBAR!`)
    })

    // Listener para eventos de transacciones capturadas por EVVM Fisher
    const handleEVVMTxCaptured = () => {
      console.log('Evento evvm-transaction-captured detectado, actualizando estado...')
    }

    window.addEventListener('evvm-transaction-captured', handleEVVMTxCaptured)

    return () => {
      window.removeEventListener('evvm-transaction-captured', handleEVVMTxCaptured)
    }

  }, [ready, wallets, meshNetwork])

  const loadBalance = async () => {
    if (wallets.length === 0) return
    try {
      const balanceHBAR = await getWalletBalance(wallets[0].address)
      setBalance(balanceHBAR)
    } catch (error) {
      console.error('Error loading wallet balance:', error)
      setBalance(0)
    }
  }

  const loadContractBalance = async () => {
    if (wallets.length === 0) return
    try {
      const balanceInContract = await getBalance(wallets[0].address)
      setContractBalance(balanceInContract)
    } catch (error) {
      console.error('Error loading contract balance:', error)
      setContractBalance(0)
    }
  }

  const loadHbarPrice = async () => {
    try {
      const price = await getHbarPriceUSD()
      setHbarPrice(price)
    } catch (error) {
      console.error('Error loading HBAR price:', error)
      setHbarPrice(0)
    }
  }

  const loadTransactions = () => {
    if (typeof window === 'undefined') return
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
    if (typeof window === 'undefined') return
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
        throw new Error('Saldo insuficiente en wallet')
      }

      const provider = (window as any).ethereum || wallets[0].getEthereumProvider?.()
      if (!provider) {
        throw new Error('Provider no disponible')
      }

      const signature = `Payment:${wallets[0].address}:${payTo}:${amount}:${Date.now()}`
      const timestamp = Math.floor(Date.now() / 1000)
      const paymentId = `payment_${wallets[0].address}_${payTo}_${amount}_${timestamp}`

      const meshStatus = meshNetwork.getStatus()
      if (meshStatus.meshMode && !meshStatus.isOnline) {
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

      let currentContractBalance = 0
      try {
        currentContractBalance = await getBalance(wallets[0].address)
      } catch (error) {
        console.warn('No se pudo obtener balance del contrato, asumiendo 0:', error)
      }
      
      if (currentContractBalance < amount) {
        const neededAmount = amount - currentContractBalance
        const depositAmount = Math.max(neededAmount + 0.5, 1.0)
        
        if (balance < depositAmount) {
          throw new Error(`Saldo insuficiente en wallet. Necesitas ${depositAmount.toFixed(4)} HBAR para depositar en el contrato (tienes ${balance.toFixed(4)} HBAR).`)
        }
        
        setStatus(`Depositando ${depositAmount.toFixed(4)} HBAR en el contrato...`)
        
        try {
          const depositTxHash = await depositHBAR(provider, depositAmount)
          console.log('Depósito realizado:', depositTxHash)
          
          setStatus(`✅ Depósito confirmado! Esperando actualización del balance...`)
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          await loadContractBalance()
          
          setStatus('Balance depositado. Creando pago...')
        } catch (depositError: any) {
          console.error('Error en depósito:', depositError)
          throw new Error(`Error al depositar: ${depositError.message || 'Error desconocido'}`)
        }
      }

      const hederaPaymentId = await createOfflinePayment(
        provider,
        payTo,
        amount,
        payMessage || '',
        signature
      )

      if (hederaPaymentId) {
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

        if (typeof window !== 'undefined') {
          const evvmFisher = getEVVMFisherService()
          evvmFisher.catchTransaction({
            id: hederaPaymentId,
            fishingSpotId: 'contract-pending',
            paymentId: hederaPaymentId,
            from: wallets[0].address,
            to: payTo,
            amount: BigInt(Math.floor(amount * 100_000_000)),
            timestamp: timestamp,
            executed: false,
          })
          window.dispatchEvent(new CustomEvent('evvm-transaction-captured'))
        }

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
        
        setTimeout(() => {
          closeModal()
        }, 2000)
      } else {
        throw new Error('No se pudo crear el pago en Hedera')
      }
    } catch (error: any) {
      console.error('Error enviando pago:', error)
      setStatus(`❌ Error enviando pago: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleReceivePayment = async () => {
    setStatus('Funcionalidad de recibir pago no implementada aún.')
    setTimeout(() => {
      closeModal()
    }, 2000)
  }

  const handleSyncPayment = async (paymentId: string) => {
    setLoading(true)
    setStatus(`Sincronizando pago ${paymentId.substring(0, 10)}...`)
    try {
      const provider = (window as any).ethereum || wallets[0].getEthereumProvider?.()
      if (!provider) {
        throw new Error('Provider no disponible')
      }
      const txHash = await syncOfflinePayment(provider, paymentId)
      setStatus(`✅ Pago sincronizado! Hash: ${txHash.substring(0, 10)}...`)
      setTransactions(prev => prev.map(tx => tx.id === paymentId ? { ...tx, synced: true } : tx))
      await loadBalance()
      await loadContractBalance()
    } catch (error: any) {
      console.error('Error sincronizando pago:', error)
      setStatus(`❌ Error sincronizando pago: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const usdBalance = hbarPrice > 0 && hbarPrice < 1000 ? balance * hbarPrice : 0
  const usdContractBalance = hbarPrice > 0 && hbarPrice < 1000 ? contractBalance * hbarPrice : 0

  if (!ready || !authenticated) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loadingText}>Cargando...</div>
      </div>
    )
  }

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
            <li><a href="/evvm-test">EVVM Test</a></li>
            <button onClick={handleLogout} className={styles.navCta}>Cerrar Sesión</button>
          </ul>
          <button className={styles.menuToggle} id="menuToggle">☰</button>
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
                  <>
                    <div className={styles.walletItem}>
                      <div className={styles.walletIcon}>🔐</div>
                      <div>
                        <div className={styles.walletName}>Privy Wallet (Hedera)</div>
                        <div className={styles.walletAddress}>
                          {formatAddress(wallets[0].address)}
                        </div>
                      </div>
                    </div>
                    <div className={styles.walletItem}>
                      <div className={styles.walletIcon}>📜</div>
                      <div>
                        <div className={styles.walletName}>Contrato FluxoPayment</div>
                        <div className={styles.walletAddress}>
                          {formatAddress(process.env.NEXT_PUBLIC_FLUXO_PAYMENT_CONTRACT || 'N/A')}
                        </div>
                      </div>
                    </div>
                  </>
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
                {hbarPrice > 0 ? 'USD (Wallet)' : 'HBAR (Wallet)'}
              </div>
              <div className={styles.saldoTitle} style={{ marginTop: '1rem' }}>Saldo en Contrato</div>
              <div className={styles.saldoAmount}>
                {hbarPrice > 0 ? `$${usdContractBalance.toFixed(2)}` : `${contractBalance.toFixed(4)} HBAR`}
              </div>
              <div className={styles.saldoCurrency}>
                {hbarPrice > 0 ? 'USD (Contrato)' : 'HBAR (Contrato)'}
              </div>
              <div className={styles.saldoActions}>
                <button 
                  className={styles.saldoActionBtn} 
                  onClick={() => { loadBalance(); loadContractBalance(); }}
                  disabled={loading}
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>
          <div className={styles.networkBox}>
            {/* Integración Hedera */}
            <HederaIntegration />

            {/* Estado de Red MESH */}
            <MeshNetworkStatus />

            {/* EVVM Fisher */}
            <EVVMFisher />
          </div>
          <div className={styles.transactionsBox}>
            <div className={styles.transactionsTitle}>Historial de Transacciones</div>
            {transactions.length === 0 ? (
              <div className={styles.noTransactions}>No hay transacciones aún.</div>
            ) : (
              <div className={styles.transactionsList}>
                {transactions.map((tx) => (
                  <div key={tx.id} className={styles.transactionItem}>
                    <div className={styles.transactionIcon}>
                      {tx.type === 'send' ? '📤' : tx.type === 'receive' ? '📥' : '🛒'}
                    </div>
                    <div className={styles.transactionDetails}>
                      <div className={styles.transactionType}>
                        {tx.type === 'send' ? 'Envío' : tx.type === 'receive' ? 'Recepción' : 'Compra'}
                        {tx.to && ` a ${formatAddress(tx.to)}`}
                        {tx.from && ` de ${formatAddress(tx.from)}`}
                      </div>
                      <div className={styles.transactionAmount}>
                        {tx.amount.toFixed(4)} HBAR
                      </div>
                      <div className={styles.transactionDate}>
                        {formatDate(tx.timestamp)}
                      </div>
                      {tx.message && (
                        <div className={styles.transactionMessage}>
                          Mensaje: {tx.message}
                        </div>
                      )}
                    </div>
                    <div className={styles.transactionStatus}>
                      {tx.synced ? (
                        <span className={styles.synced}>✅ Sincronizado</span>
                      ) : (
                        <button
                          className={styles.syncButton}
                          onClick={() => handleSyncPayment(tx.id)}
                          disabled={loading}
                          style={{
                            backgroundColor: loading ? '#ccc' : '#ff6b35',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0.5rem 1rem',
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
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Overlay para cerrar modales */}
      {activeModal && <div className={styles.modalOverlay} onClick={closeModal}></div>}

      {/* Modal de Enviar Pago */}
      {activeModal === 'pay' && (
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h3>Enviar Pago</h3>
            <button onClick={closeModal} className={styles.closeModalBtn}>&times;</button>
          </div>
          <div className={styles.modalBody}>
            <form onSubmit={(e) => { e.preventDefault(); handleSendPayment(); }}>
              <div className={styles.formGroup}>
                <label htmlFor="payTo">Destinatario (Dirección de Wallet)</label>
                <input
                  type="text"
                  id="payTo"
                  value={payTo}
                  onChange={(e) => setPayTo(e.target.value)}
                  placeholder="Ej: 0x..."
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="payAmount">Monto (HBAR)</label>
                <input
                  type="number"
                  id="payAmount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Ej: 5.0"
                  step="0.0001"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="payMessage">Mensaje (Opcional)</label>
                <input
                  type="text"
                  id="payMessage"
                  value={payMessage}
                  onChange={(e) => setPayMessage(e.target.value)}
                  placeholder="Ej: Cena con amigos"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="payNetwork">Red</label>
                <select
                  id="payNetwork"
                  value={payNetwork}
                  onChange={(e) => setPayNetwork(e.target.value)}
                >
                  <option value="hedera">Hedera EVM</option>
                  <option value="mesh">Red MESH (Offline)</option>
                </select>
              </div>
              {status && <p className={styles.statusMessage}>{status}</p>}
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Pago'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Recibir Pago */}
      {activeModal === 'receive' && (
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h3>Recibir Pago</h3>
            <button onClick={closeModal} className={styles.closeModalBtn}>&times;</button>
          </div>
          <div className={styles.modalBody}>
            <p>Tu dirección de wallet para recibir pagos:</p>
            <div className={styles.receiveAddress}>
              {wallets.length > 0 ? wallets[0].address : 'Conectando...'}
            </div>
            <p className={styles.qrCodePlaceholder}>[Código QR aquí]</p>
            <p>Comparte esta dirección o el código QR para recibir pagos.</p>
            {status && <p className={styles.statusMessage}>{status}</p>}
            <button onClick={closeModal} className={styles.submitBtn}>Cerrar</button>
          </div>
        </div>
      )}

      {/* Modal de Comprar HBAR */}
      {activeModal === 'buy' && (
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <h3>Comprar HBAR</h3>
            <button onClick={closeModal} className={styles.closeModalBtn}>&times;</button>
          </div>
          <div className={styles.modalBody}>
            <p>Puedes comprar HBAR a través de exchanges como:</p>
            <ul>
              <li>Binance</li>
              <li>Coinbase</li>
              <li>Kraken</li>
            </ul>
            <p>Envía HBAR a tu dirección de wallet:</p>
            <div className={styles.receiveAddress}>
              {wallets.length > 0 ? wallets[0].address : 'Conectando...'}
            </div>
            {status && <p className={styles.statusMessage}>{status}</p>}
            <button onClick={closeModal} className={styles.submitBtn}>Cerrar</button>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <a href="/fluxo">Inicio</a> | <a href="/fluxo/pagos">Pagos</a> | <a href="/evvm-test">EVVM Test</a>
          </div>
          <p>&copy; 2023 Fluxo. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
