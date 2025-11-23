'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import { getBalance, depositHBAR, syncOfflinePayment, getHbarPriceUSD, convertHbarToUSD } from '@/lib/hedera'

export default function HederaIntegration() {
  const { user, ready } = usePrivy()
  const { wallets } = useWallets()
  const [balance, setBalance] = useState<number>(0)
  const [hbarPrice, setHbarPrice] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')

  useEffect(() => {
    if (ready && wallets.length > 0) {
      loadBalance()
      loadHbarPrice()
    }
  }, [ready, wallets])

  const loadBalance = async () => {
    if (wallets.length === 0) return
    
    try {
      const balanceHBAR = await getBalance(wallets[0].address)
      setBalance(balanceHBAR)
    } catch (error) {
      console.error('Error loading balance:', error)
    }
  }

  const loadHbarPrice = async () => {
    try {
      const price = await getHbarPriceUSD()
      setHbarPrice(price)
    } catch (error) {
      console.error('Error loading HBAR price:', error)
    }
  }

  const handleDeposit = async () => {
    if (wallets.length === 0) {
      setStatus('No hay wallet conectada')
      return
    }

    setLoading(true)
    setStatus('Depositando HBAR...')

    try {
      const wallet = wallets[0]
      // El wallet de Privy tiene un provider EIP-1193
      // Accedemos a través de window.ethereum o el provider del wallet
      const provider = (window as any).ethereum || wallet.getEthereumProvider?.()
      
      if (!provider) {
        throw new Error('Provider no disponible. Asegúrate de tener una wallet conectada.')
      }

      // Depositar 1 HBAR como ejemplo
      const txHash = await depositHBAR(provider, 1)
      setStatus(`✅ Depósito exitoso! TX: ${txHash.substring(0, 10)}...`)
      
      // Recargar balance
      await loadBalance()
    } catch (error: any) {
      console.error('Error depositing:', error)
      setStatus(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncPayment = async (paymentId: string) => {
    if (wallets.length === 0) {
      setStatus('No hay wallet conectada')
      return
    }

    setLoading(true)
    setStatus('Sincronizando pago...')

    try {
      const wallet = wallets[0]
      const provider = (window as any).ethereum || wallet.getEthereumProvider?.()
      
      if (!provider) {
        throw new Error('Provider no disponible')
      }

      const txHash = await syncOfflinePayment(provider, paymentId)
      setStatus(`✅ Pago sincronizado! TX: ${txHash.substring(0, 10)}...`)
      
      // Recargar balance
      await loadBalance()
    } catch (error: any) {
      console.error('Error syncing payment:', error)
      setStatus(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const usdValue = balance * hbarPrice

  return (
    <div style={{
      background: 'white',
      borderRadius: '18px',
      padding: '2rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      marginTop: '2rem'
    }}>
      <h3 style={{ color: '#ff6b35', marginBottom: '1rem', fontSize: '1.5rem' }}>
        💎 Integración Hedera
      </h3>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ color: '#666' }}>Balance HBAR:</span>
          <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{balance.toFixed(4)} HBAR</span>
        </div>
        {hbarPrice > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#666' }}>Valor USD:</span>
            <span style={{ fontWeight: 'bold', color: '#4caf50' }}>${usdValue.toFixed(2)}</span>
          </div>
        )}
        {hbarPrice > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#888' }}>
            <span>Precio HBAR:</span>
            <span>${hbarPrice.toFixed(4)}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={handleDeposit}
          disabled={loading || wallets.length === 0}
          style={{
            background: 'linear-gradient(45deg, #ff6b35, #f7931e)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '0.7rem 1.3rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.2s'
          }}
        >
          {loading ? 'Procesando...' : 'Depositar HBAR'}
        </button>

        <button
          onClick={loadBalance}
          disabled={loading}
          style={{
            background: '#f5f5f5',
            color: '#333',
            border: 'none',
            borderRadius: '12px',
            padding: '0.7rem 1.3rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Actualizar Balance
        </button>
      </div>

      {status && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '8px',
          background: status.includes('✅') ? '#e8f5e9' : status.includes('❌') ? '#ffebee' : '#e3f2fd',
          color: status.includes('✅') ? '#2e7d32' : status.includes('❌') ? '#c62828' : '#1565c0',
          fontSize: '0.9rem'
        }}>
          {status}
        </div>
      )}

      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
          <strong>Estado de la red:</strong>
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#4caf50',
            display: 'inline-block'
          }}></span>
          <span style={{ fontSize: '0.9rem' }}>Hedera Testnet</span>
        </div>
      </div>
    </div>
  )
}

