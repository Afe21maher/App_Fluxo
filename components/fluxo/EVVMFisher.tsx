'use client'

import { useState, useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { getEVVMFisherService, FishingSpot, CaughtTransaction, Fisher } from '@/lib/evvm-fisher'
import { getHederaProvider } from '@/lib/hedera'
import styles from './EVVMFisher.module.css'

export default function EVVMFisher() {
  const { ready, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [fishingSpots, setFishingSpots] = useState<FishingSpot[]>([])
  const [caughtTransactions, setCaughtTransactions] = useState<CaughtTransaction[]>([])
  const [fisher, setFisher] = useState<Fisher | null>(null)
  const [isFishing, setIsFishing] = useState(false)
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null)

  const fisherService = getEVVMFisherService()

  useEffect(() => {
    if (ready && authenticated && wallets.length > 0) {
      initializeFisher()
    }
  }, [ready, authenticated, wallets])

  const initializeFisher = async () => {
    try {
      // Registrar fisher si no está registrado
      const walletAddress = wallets[0].address
      fisherService.registerFisher(walletAddress)

      // Obtener información del fisher
      const fisherInfo = fisherService.getFisher(walletAddress)
      setFisher(fisherInfo || null)

      // Iniciar servicio de fishing
      const provider = getHederaProvider()
      await fisherService.start(provider, walletAddress)
      setIsFishing(true)

      // Actualizar estado periódicamente
      const interval = setInterval(() => {
        updateStatus()
      }, 2000)

      // Escuchar eventos de nuevas transacciones capturadas
      const handleTransactionCaptured = () => {
        console.log('🔄 Nueva transacción capturada, actualizando estado...')
        updateStatus()
      }
      
      window.addEventListener('evvm-transaction-captured', handleTransactionCaptured)
      
      // Escuchar cambios en localStorage
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'fluxo_transactions') {
          console.log('🔄 Cambios en localStorage, actualizando estado...')
          updateStatus()
        }
      }
      
      window.addEventListener('storage', handleStorageChange)

      updateStatus()

      return () => {
        clearInterval(interval)
        window.removeEventListener('evvm-transaction-captured', handleTransactionCaptured)
        window.removeEventListener('storage', handleStorageChange)
      }
    } catch (error) {
      console.error('Error inicializando fisher:', error)
    }
  }

  const updateStatus = () => {
    setFishingSpots(fisherService.getFishingSpots())
    setCaughtTransactions(fisherService.getCaughtTransactions())
    
    if (wallets.length > 0) {
      const fisherInfo = fisherService.getFisher(wallets[0].address)
      setFisher(fisherInfo || null)
    }
  }

  const handleExecuteTransaction = async (transactionId: string) => {
    if (!wallets.length) return

    try {
      // Obtener provider del wallet (mismo método que en FluxoPagos)
      const provider = (window as any).ethereum || wallets[0].getEthereumProvider?.()
      if (!provider) {
        throw new Error('Provider no disponible')
      }
      
      console.log('Provider obtenido:', provider)
      
      const txHash = await fisherService.executeTransaction(
        transactionId,
        wallets[0].address,
        provider
      )

      if (txHash) {
        alert(`✅ Transacción ejecutada exitosamente!\n\nHash: ${txHash}`)
        // Actualizar estado después de un breve delay para que se refleje en el contrato
        setTimeout(() => {
          updateStatus()
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error ejecutando transacción:', error)
      
      // Mensajes de error más amigables
      let errorMessage = 'Error desconocido'
      if (error.message?.includes('ya fue sincronizado') || 
          error.message?.includes('already synced') ||
          error.reason?.includes('already synced')) {
        errorMessage = '⚠️ Este pago ya fue sincronizado anteriormente.\n\nLa transacción se ha actualizado en el sistema.'
        // Actualizar estado para reflejar que ya está sincronizado
        setTimeout(() => {
          updateStatus()
        }, 1000)
      } else if (error.message?.includes('ya ejecutada')) {
        errorMessage = '⚠️ Esta transacción ya fue ejecutada anteriormente.'
        updateStatus()
      } else if (error.message?.includes('no encontrada')) {
        errorMessage = '❌ Transacción no encontrada en el sistema.'
      } else {
        errorMessage = `❌ Error: ${error.message || error.reason || 'Error desconocido'}`
      }
      
      alert(errorMessage)
    }
  }

  const toggleFishing = async () => {
    if (!wallets.length) return
    
    if (isFishing) {
      fisherService.stop()
      setIsFishing(false)
    } else {
      const provider = getHederaProvider()
      await fisherService.start(provider, wallets[0].address)
      setIsFishing(true)
    }
  }

  const formatAmount = (amount: bigint) => {
    return (Number(amount) / 100000000).toFixed(4) + ' HBAR'
  }

  const formatReward = (reward: bigint | undefined) => {
    if (!reward) return '0 HBAR'
    return formatAmount(reward)
  }

  if (!ready || !authenticated) {
    return null
  }

  return (
    <div className={styles.evvmFisher}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          🎣 EVVM Fisher/Relayer
        </h3>
        <button
          className={`${styles.toggleBtn} ${isFishing ? styles.active : ''}`}
          onClick={toggleFishing}
        >
          {isFishing ? '🛑 Detener Fishing' : '🎣 Iniciar Fishing'}
        </button>
      </div>

      {/* Estadísticas del Fisher */}
      {fisher && (
        <div className={styles.fisherStats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Transacciones Capturadas</div>
            <div className={styles.statValue}>{fisher.totalCaught}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Transacciones Ejecutadas</div>
            <div className={styles.statValue}>{fisher.totalExecuted}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Recompensas Totales</div>
            <div className={styles.statValue}>
              {formatReward(fisher.totalRewards)}
            </div>
          </div>
        </div>
      )}

      {/* Fishing Spots */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>📍 Fishing Spots</h4>
        <div className={styles.fishingSpots}>
          {fishingSpots.map((spot) => (
            <div
              key={spot.id}
              className={`${styles.spotCard} ${spot.active ? styles.active : ''} ${selectedSpot === spot.id ? styles.selected : ''}`}
              onClick={() => setSelectedSpot(selectedSpot === spot.id ? null : spot.id)}
            >
              <div className={styles.spotHeader}>
                <div className={styles.spotName}>{spot.name}</div>
                <div className={styles.spotStatus}>
                  {spot.active ? '🟢' : '⚪'}
                </div>
              </div>
              <div className={styles.spotDescription}>{spot.description}</div>
              <div className={styles.spotStats}>
                <div className={styles.spotStat}>
                  <span className={styles.spotStatLabel}>Transacciones:</span>
                  <span className={styles.spotStatValue}>{spot.transactionCount}</span>
                </div>
                <div className={styles.spotStat}>
                  <span className={styles.spotStatLabel}>Última actualización:</span>
                  <span className={styles.spotStatValue}>
                    {new Date(spot.lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transacciones Capturadas */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>
          🎣 Transacciones Capturadas ({caughtTransactions.length})
        </h4>
        {caughtTransactions.length > 0 ? (
          <div className={styles.transactionsList}>
            {caughtTransactions
              .filter((tx) => {
                // Filtrar por fishing spot si está seleccionado
                if (selectedSpot && tx.fishingSpotId !== selectedSpot) return false
                // Solo mostrar transacciones no ejecutadas
                return !tx.executed
              })
              .map((tx) => (
                <div
                  key={tx.id}
                  className={`${styles.transactionCard} ${tx.executed ? styles.executed : ''}`}
                >
                  <div className={styles.transactionHeader}>
                    <div className={styles.transactionId}>
                      ID: {tx.id.substring(0, 16)}...
                    </div>
                    <div className={styles.transactionStatus}>
                      {tx.executed ? '✅ Ejecutada' : '⏳ Pendiente'}
                    </div>
                  </div>
                  <div className={styles.transactionDetails}>
                    <div className={styles.transactionDetail}>
                      <span className={styles.detailLabel}>Desde:</span>
                      <span className={styles.detailValue}>
                        {tx.from.substring(0, 10)}...{tx.from.substring(tx.from.length - 6)}
                      </span>
                    </div>
                    <div className={styles.transactionDetail}>
                      <span className={styles.detailLabel}>Hacia:</span>
                      <span className={styles.detailValue}>
                        {tx.to.substring(0, 10)}...{tx.to.substring(tx.to.length - 6)}
                      </span>
                    </div>
                    <div className={styles.transactionDetail}>
                      <span className={styles.detailLabel}>Monto:</span>
                      <span className={styles.detailValue}>{formatAmount(tx.amount)}</span>
                    </div>
                    {tx.reward && (
                      <div className={styles.transactionDetail}>
                        <span className={styles.detailLabel}>Recompensa:</span>
                        <span className={styles.detailValue}>{formatReward(tx.reward)}</span>
                      </div>
                    )}
                    <div className={styles.transactionDetail}>
                      <span className={styles.detailLabel}>Fishing Spot:</span>
                      <span className={styles.detailValue}>
                        {fishingSpots.find((s) => s.id === tx.fishingSpotId)?.name || tx.fishingSpotId}
                      </span>
                    </div>
                    {tx.executionTxHash && (
                      <div className={styles.transactionDetail}>
                        <span className={styles.detailLabel}>Tx Hash:</span>
                        <span className={styles.detailValue}>
                          {tx.executionTxHash.substring(0, 16)}...
                        </span>
                      </div>
                    )}
                  </div>
                  {!tx.executed && (
                    <button
                      className={styles.executeBtn}
                      onClick={() => handleExecuteTransaction(tx.id)}
                    >
                      ⚡ Ejecutar Transacción
                    </button>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎣</div>
            <div className={styles.emptyText}>
              <strong>No hay transacciones capturadas</strong>
              <p>Activa el fishing para comenzar a capturar transacciones pendientes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

