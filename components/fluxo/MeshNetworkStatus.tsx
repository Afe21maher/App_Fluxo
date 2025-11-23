'use client'

import { useState, useEffect } from 'react'
import { getEnhancedMeshNetwork, MeshPeer } from '@/lib/mesh-network-enhanced'
import styles from './MeshNetworkStatus.module.css'

export default function MeshNetworkStatus() {
  const [meshMode, setMeshMode] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [connectedPeers, setConnectedPeers] = useState<MeshPeer[]>([])
  const [pendingPayments, setPendingPayments] = useState(0)
  const [scanning, setScanning] = useState(false)
  const [routingTableSize, setRoutingTableSize] = useState(0)
  const [knownPeersCount, setKnownPeersCount] = useState(0)

  const meshNetwork = getEnhancedMeshNetwork()

  useEffect(() => {
    // Cargar estado inicial
    updateStatus()

    // Configurar callbacks
    meshNetwork.onPeerConnected((peer) => {
      console.log('Peer conectado:', peer)
      updateStatus()
    })

    meshNetwork.onPeerDisconnected((peerId) => {
      console.log('Peer desconectado:', peerId)
      updateStatus()
    })

    // Actualizar estado periódicamente (más frecuente para mejor UX)
    const interval = setInterval(updateStatus, 1000)

    // Escuchar cambios de conexión
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const updateStatus = () => {
    const status = meshNetwork.getStatus()
    setMeshMode(status.meshMode)
    setIsOnline(status.isOnline)
    const peers = meshNetwork.getConnectedPeers()
    setConnectedPeers(peers)
    setPendingPayments(status.pendingPayments)
    setRoutingTableSize(status.routingTableSize)
    
    // Contar todos los peers conocidos (conectados + en tabla de routing)
    const routingTable = meshNetwork.getRoutingTable()
    const knownPeerIds = new Set<string>()
    peers.forEach(p => knownPeerIds.add(p.id))
    routingTable.forEach(route => {
      if (route.nextHop) knownPeerIds.add(route.nextHop)
      if (route.destination) knownPeerIds.add(route.destination)
    })
    setKnownPeersCount(knownPeerIds.size)
  }

  const toggleMeshMode = async () => {
    if (meshMode) {
      meshNetwork.stopMeshMode()
    } else {
      await meshNetwork.startMeshMode()
    }
    updateStatus()
  }

  const scanForPeers = async () => {
    setScanning(true)
    // En una implementación completa, aquí escanearíamos por Bluetooth, WiFi Direct, etc.
    // Por ahora, simulamos la búsqueda
    setTimeout(() => {
      setScanning(false)
      updateStatus()
    }, 3000)
  }

  return (
    <div className={styles.meshStatus}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          🌐 Red MESH
        </h3>
        <button
          className={`${styles.toggleBtn} ${meshMode ? styles.active : ''}`}
          onClick={toggleMeshMode}
        >
          {meshMode ? 'Desactivar' : 'Activar'} MESH
        </button>
      </div>

      <div className={styles.statusGrid}>
        <div className={styles.statusItem}>
          <div className={styles.statusLabel}>Estado de Internet</div>
          <div className={`${styles.statusValue} ${isOnline ? styles.online : styles.offline}`}>
            {isOnline ? '🟢 Conectado' : '🔴 Sin conexión'}
          </div>
        </div>

        <div className={styles.statusItem}>
          <div className={styles.statusLabel}>Modo MESH</div>
          <div className={`${styles.statusValue} ${meshMode ? styles.active : styles.inactive}`}>
            {meshMode ? '🟢 Activo' : '⚪ Inactivo'}
          </div>
        </div>

        <div className={`${styles.statusItem} ${styles.highlight}`}>
          <div className={styles.statusLabel}>📱 Dispositivos Identificados</div>
          <div className={`${styles.statusValue} ${styles.bigNumber}`}>
            {knownPeersCount}
          </div>
          <div className={styles.statusSubtext}>
            {connectedPeers.length} conectados directamente
          </div>
        </div>

        <div className={styles.statusItem}>
          <div className={styles.statusLabel}>Peers Conectados</div>
          <div className={styles.statusValue}>
            {connectedPeers.length}
          </div>
        </div>

        <div className={styles.statusItem}>
          <div className={styles.statusLabel}>Rutas Conocidas</div>
          <div className={styles.statusValue}>
            {routingTableSize}
          </div>
        </div>

        <div className={styles.statusItem}>
          <div className={styles.statusLabel}>Pagos Pendientes</div>
          <div className={styles.statusValue}>
            {pendingPayments}
          </div>
        </div>
      </div>

      {meshMode && (
        <div className={styles.actions}>
          <button
            className={styles.scanBtn}
            onClick={scanForPeers}
            disabled={scanning}
          >
            {scanning ? 'Escaneando...' : '🔍 Buscar Dispositivos'}
          </button>
        </div>
      )}

      {meshMode && connectedPeers.length > 0 && (
        <div className={styles.peersList}>
          <div className={styles.peersTitle}>
            📱 Dispositivos Conectados ({connectedPeers.length})
          </div>
          
          {connectedPeers.map((peer) => (
            <div key={peer.id} className={styles.peerItem}>
              <div className={styles.peerIcon}>📱</div>
              <div className={styles.peerInfo}>
                <div className={styles.peerName}>
                  {peer.name || `Dispositivo ${peer.id.substring(0, 8)}`}
                </div>
                <div className={styles.peerAddress}>
                  {peer.address ? `${peer.address.substring(0, 10)}...${peer.address.substring(peer.address.length - 6)}` : 'Sin dirección'}
                </div>
                <div className={styles.peerId}>
                  ID: {peer.id.substring(0, 12)}...
                </div>
              </div>
              <div className={styles.peerStatus}>
                <span className={styles.peerDot}></span>
                <span>Conectado</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isOnline && meshMode && (
        <div className={styles.offlineNotice}>
          <div className={styles.noticeIcon}>📡</div>
          <div className={styles.noticeText}>
            <strong>Modo Offline Activo</strong>
            <p>Puedes realizar pagos a través de la red MESH local</p>
          </div>
        </div>
      )}
    </div>
  )
}

