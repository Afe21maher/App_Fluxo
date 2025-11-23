'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import { getEVVMFisherService } from '@/lib/evvm-fisher'
import { createOfflinePayment, getWalletBalance, getBalance, depositHBAR } from '@/lib/hedera'
import styles from './page.module.css'

// Hacer la página dinámica para evitar errores de prerender
export const dynamic = 'force-dynamic'

export default function EVVMTestPage() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [toAddress, setToAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [balance, setBalance] = useState(0)
  const [testResults, setTestResults] = useState<any[]>([])
  const [mounted, setMounted] = useState(false)
  const [evvmFisher, setEvvmFisher] = useState<ReturnType<typeof getEVVMFisherService> | null>(null)

  useEffect(() => {
    setMounted(true)
    // Solo inicializar cuando esté en el navegador
    if (typeof window !== 'undefined') {
      setEvvmFisher(getEVVMFisherService())
    }
  }, [])

  useEffect(() => {
    if (ready && wallets.length > 0 && evvmFisher) {
      loadBalance()
    }
  }, [ready, wallets, evvmFisher])

  const loadBalance = async () => {
    if (wallets.length === 0) return
    try {
      const bal = await getWalletBalance(wallets[0].address)
      setBalance(bal)
    } catch (error) {
      console.error('Error loading balance:', error)
    }
  }

  const handleCreateTestTransaction = async () => {
    if (!toAddress || !amount || wallets.length === 0) {
      setStatus('❌ Por favor completa todos los campos')
      return
    }

    setLoading(true)
    setStatus('Creando transacción de prueba...')

    try {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Monto inválido')
      }

      // Obtener provider
      const provider = (window as any).ethereum || wallets[0].getEthereumProvider?.()
      if (!provider) {
        throw new Error('Provider no disponible')
      }

      // Verificar balance en el contrato antes de crear el pago
      let currentContractBalance = 0
      try {
        currentContractBalance = await getBalance(wallets[0].address)
      } catch (error) {
        console.warn('No se pudo obtener balance del contrato, asumiendo 0:', error)
      }
      
      if (currentContractBalance < amountNum) {
        // No hay suficiente balance en el contrato, necesitamos depositar
        const neededAmount = amountNum - currentContractBalance
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
          
          // Recargar balance
          await loadBalance()
          
          setStatus('Balance depositado. Creando transacción...')
        } catch (depositError: any) {
          console.error('Error en depósito:', depositError)
          throw new Error(`Error al depositar: ${depositError.message || 'Error desconocido'}`)
        }
      }

      // Crear firma
      const signature = `TestPayment:${wallets[0].address}:${toAddress}:${amountNum}:${Date.now()}`
      const timestamp = Math.floor(Date.now() / 1000)

      // Crear pago offline en Hedera
      setStatus('Creando pago offline en Hedera...')
      const paymentId = await createOfflinePayment(
        provider,
        toAddress,
        amountNum,
        message || 'Transacción de prueba EVVM',
        signature
      )

      if (paymentId && evvmFisher) {
        // Guardar transacción en localStorage para que sea detectada por el escaneo
        const tx = {
          id: paymentId,
          type: 'send',
          from: wallets[0].address,
          to: toAddress,
          amount: amountNum,
          timestamp: timestamp,
          synced: false,
          message: message || 'Transacción de prueba EVVM',
        }
        
        // Guardar en localStorage
        const stored = localStorage.getItem('fluxo_transactions')
        const transactions = stored ? JSON.parse(stored) : []
        transactions.push(tx)
        localStorage.setItem('fluxo_transactions', JSON.stringify(transactions))
        
        // Capturar para EVVM Fisher
        evvmFisher.catchTransaction({
          id: paymentId,
          fishingSpotId: 'contract-pending',
          paymentId: paymentId,
          from: wallets[0].address,
          to: toAddress,
          amount: BigInt(Math.floor(amountNum * 100_000_000)),
          timestamp: timestamp,
          executed: false,
        })

        setStatus(`✅ Transacción creada! ID: ${paymentId.substring(0, 16)}...`)
        
        // Agregar a resultados
        setTestResults(prev => [{
          id: paymentId,
          from: wallets[0].address,
          to: toAddress,
          amount: amountNum,
          timestamp: new Date().toLocaleString(),
          status: 'Creada - Pendiente de ejecución'
        }, ...prev])
        
        // Disparar evento personalizado para notificar a otras páginas
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('evvm-transaction-captured', {
            detail: { transactionId: paymentId }
          }))
        }

        // Limpiar formulario
        setToAddress('')
        setAmount('')
        setMessage('')
      }
    } catch (error: any) {
      console.error('Error:', error)
      setStatus(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickTest = async () => {
    // Generar dirección de prueba
    const testAddress = '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    
    setToAddress(testAddress)
    setAmount('0.1')
    setMessage('Transacción de prueba rápida EVVM')
  }

  if (!mounted || !ready || !evvmFisher) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando...</div>
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>🔒 Acceso Requerido</h2>
          <p>Por favor inicia sesión para usar la DApp de prueba EVVM</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🧪 DApp de Prueba EVVM</h1>
        <p>Crea transacciones de prueba para probar el sistema Fisher/Relayer</p>
      </div>

      <div className={styles.walletInfo}>
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>Tu Wallet</div>
          <div className={styles.infoValue}>
            {wallets[0]?.address.substring(0, 10)}...{wallets[0]?.address.substring(wallets[0].address.length - 8)}
          </div>
        </div>
        <div className={styles.infoCard}>
          <div className={styles.infoLabel}>Balance</div>
          <div className={styles.infoValue}>
            {balance.toFixed(4)} HBAR
            <button onClick={loadBalance} className={styles.refreshBtn}>🔄</button>
          </div>
        </div>
      </div>

      <div className={styles.form}>
        <h2>Crear Transacción de Prueba</h2>
        
        <div className={styles.formGroup}>
          <label>Dirección Destinataria</label>
          <input
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            className={styles.input}
          />
          <button onClick={handleQuickTest} className={styles.quickBtn}>
            🎲 Generar Dirección de Prueba
          </button>
        </div>

        <div className={styles.formGroup}>
          <label>Cantidad (HBAR)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            step="0.001"
            min="0"
            className={styles.input}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Mensaje (opcional)</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mensaje de prueba"
            className={styles.input}
          />
        </div>

        <button
          onClick={handleCreateTestTransaction}
          disabled={loading}
          className={styles.submitBtn}
        >
          {loading ? '⏳ Creando...' : '🚀 Crear Transacción de Prueba'}
        </button>

        {status && (
          <div className={styles.status}>{status}</div>
        )}
      </div>

      {testResults.length > 0 && (
        <div className={styles.results}>
          <h2>Transacciones de Prueba Creadas</h2>
          <div className={styles.resultsList}>
            {testResults.map((result, index) => (
              <div key={index} className={styles.resultCard}>
                <div className={styles.resultHeader}>
                  <div className={styles.resultId}>
                    ID: {result.id.substring(0, 16)}...
                  </div>
                  <div className={styles.resultStatus}>{result.status}</div>
                </div>
                <div className={styles.resultDetails}>
                  <div><strong>Desde:</strong> {result.from.substring(0, 10)}...</div>
                  <div><strong>Hacia:</strong> {result.to.substring(0, 10)}...</div>
                  <div><strong>Monto:</strong> {result.amount} HBAR</div>
                  <div><strong>Fecha:</strong> {result.timestamp}</div>
                </div>
                <div className={styles.resultNote}>
                  💡 Esta transacción está disponible para ser capturada por EVVM Fisher
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.instructions}>
        <h3>📖 Instrucciones</h3>
        <ol>
          <li>Genera una dirección de prueba o ingresa una dirección válida</li>
          <li>Ingresa una cantidad en HBAR</li>
          <li>Haz clic en "Crear Transacción de Prueba"</li>
          <li>La transacción se creará en Hedera y será capturada por EVVM Fisher</li>
          <li>Ve a la página de Pagos para ver la transacción en EVVM Fisher</li>
          <li>Ejecuta la transacción desde EVVM Fisher para sincronizarla</li>
        </ol>
      </div>
    </div>
  )
}

