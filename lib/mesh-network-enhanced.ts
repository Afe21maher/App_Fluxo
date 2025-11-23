/**
 * Enhanced Mesh Network Service
 * Red MESH verdadera con routing multi-hop
 * Permite enrutar mensajes a través de múltiples dispositivos
 */

export interface MeshPeer {
  id: string
  address: string
  name?: string
  connected: boolean
  lastSeen: number
  knownPeers?: string[] // IDs de peers que este peer conoce
}

export interface MeshPayment {
  id: string
  from: string
  to: string
  amount: number
  message?: string
  timestamp: number
  signature: string
  synced: boolean
}

export interface MeshMessage {
  type: 'payment' | 'sync-request' | 'sync-response' | 'ping' | 'pong' | 'route-request' | 'route-response' | 'peer-discovery'
  data: any
  timestamp: number
  from: string
  to?: string // Destinatario final (para routing)
  hops?: number // Número de saltos realizados
  path?: string[] // Ruta tomada (para evitar loops)
  ttl?: number // Time To Live
}

export interface PeerConnection {
  peerId: string
  connection: RTCPeerConnection
  dataChannel: RTCDataChannel
  connected: boolean
  lastPing: number
}

export interface RoutingEntry {
  destination: string // Peer ID o wallet address
  nextHop: string // Peer ID del siguiente salto
  distance: number // Número de hops
  lastUpdated: number
}

class EnhancedMeshNetworkService {
  // Múltiples conexiones simultáneas
  private peerConnections: Map<string, PeerConnection> = new Map()
  
  // Tabla de routing
  private routingTable: Map<string, RoutingEntry> = new Map()
  
  // Información local
  private localPeerId: string = ''
  private localWalletAddress: string = ''
  
  // Estado
  private peers: Map<string, MeshPeer> = new Map()
  private pendingPayments: Map<string, MeshPayment> = new Map()
  private messageQueue: Map<string, MeshMessage[]> = new Map() // Cola de mensajes por peer
  
  // Callbacks
  private onPaymentReceivedCallback?: (payment: MeshPayment) => void
  private onPeerConnectedCallback?: (peer: MeshPeer) => void
  private onPeerDisconnectedCallback?: (peerId: string) => void
  
  // Configuración
  private isOnline: boolean = navigator.onLine
  private meshMode: boolean = false
  private maxHops: number = 5 // Máximo de saltos permitidos
  private messageTTL: number = 30000 // 30 segundos
  
  // Servidor de señalización
  private signalingServer: WebSocket | null = null

  constructor() {
    this.localPeerId = this.generatePeerId()
    
    window.addEventListener('online', () => {
      this.isOnline = true
      this.onConnectionChange()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      this.onConnectionChange()
    })

    this.loadPendingPayments()
    
    // Iniciar proceso de descubrimiento periódico
    setInterval(() => this.discoverPeers(), 10000) // Cada 10 segundos
  }

  /**
   * Establece la dirección de wallet local
   */
  setLocalWalletAddress(address: string): void {
    this.localWalletAddress = address
    // Agregar ruta directa a nosotros mismos
    this.routingTable.set(address, {
      destination: address,
      nextHop: this.localPeerId,
      distance: 0,
      lastUpdated: Date.now(),
    })
  }

  /**
   * Genera un ID único para este peer
   */
  private generatePeerId(): string {
    const stored = localStorage.getItem('mesh_peer_id')
    if (stored) return stored
    
    const id = `mesh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('mesh_peer_id', id)
    return id
  }

  /**
   * Inicia el modo MESH mejorado
   */
  async startMeshMode(): Promise<void> {
    if (this.meshMode) return

    this.meshMode = true
    console.log('🌐 Modo MESH mejorado activado')

    // Intentar conectar con peers conocidos
    await this.connectToKnownPeers()
  }

  /**
   * Detiene el modo MESH
   */
  stopMeshMode(): void {
    this.meshMode = false
    
    // Cerrar todas las conexiones
    this.peerConnections.forEach((conn) => {
      conn.dataChannel.close()
      conn.connection.close()
    })
    
    this.peerConnections.clear()
    this.peers.clear()
    console.log('🌐 Modo MESH desactivado')
  }

  /**
   * Conecta a un peer específico
   */
  async connectToPeer(peerId: string, offer?: RTCSessionDescriptionInit): Promise<PeerConnection | null> {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId) || null // Ya conectado
    }

    try {
      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      }

      const connection = new RTCPeerConnection(configuration)
      const dataChannel = connection.createDataChannel('mesh', { ordered: true })

      // Configurar handlers
      dataChannel.onopen = () => {
        console.log(`✅ Conexión establecida con peer ${peerId}`)
        const peerConn = this.peerConnections.get(peerId)
        if (peerConn) {
          peerConn.connected = true
          peerConn.lastPing = Date.now()
        }
        this.sendPing(peerId)
        this.requestPeerDiscovery(peerId)
        
        // Notificar callback
        if (this.onPeerConnectedCallback && peerConn) {
          const peer = this.peers.get(peerId) || {
            id: peerId,
            address: '',
            connected: true,
            lastSeen: Date.now(),
          }
          this.onPeerConnectedCallback(peer)
        }
      }

      dataChannel.onmessage = (event) => {
        try {
          const message: MeshMessage = JSON.parse(event.data)
          this.handleMessage(message, peerId)
        } catch (error) {
          console.error('Error procesando mensaje:', error)
        }
      }

      dataChannel.onclose = () => {
        console.log(`❌ Conexión cerrada con peer ${peerId}`)
        this.disconnectPeer(peerId)
      }

      // Manejar candidatos ICE
      connection.onicecandidate = (event) => {
        if (event.candidate && this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
          // Enviar candidato ICE a través del servidor de señalización
          this.signalingServer.send(JSON.stringify({
            type: 'ice-candidate',
            target: peerId,
            candidate: event.candidate
          }))
        }
      }

      // Manejar cambios de estado de conexión
      connection.onconnectionstatechange = () => {
        const state = connection.connectionState
        if (state === 'connected') {
          peerConn.connected = true
          const connectedCount = this.getConnectedPeers().length
          console.log(`✅ [PEER] Conectado a peer ${peerId.substring(0, 8)}...`)
          console.log(`   📊 Total de peers conectados: ${connectedCount}`)
          
          // Actualizar información del peer
          const peer = this.peers.get(peerId)
          if (peer) {
            peer.connected = true
            peer.lastSeen = Date.now()
          } else {
            this.peers.set(peerId, {
              id: peerId,
              address: '',
              connected: true,
              lastSeen: Date.now(),
              knownPeers: [],
            })
          }

          // Notificar callback
          if (this.onPeerConnectedCallback) {
            const peerInfo = this.peers.get(peerId)
            if (peerInfo) {
              this.onPeerConnectedCallback(peerInfo)
            }
          }

          // Solicitar descubrimiento de peers
          this.requestPeerDiscovery(peerId)
          
          // Mostrar tabla de routing actualizada
          if (this.routingTable.size > 0) {
            console.log(`   📋 Tabla de routing: ${this.routingTable.size} rutas conocidas`)
            this.routingTable.forEach((route, dest) => {
              console.log(`      → ${dest.substring(0, 10)}... vía ${route.nextHop.substring(0, 8)}... (${route.distance} saltos)`)
            })
          }
        } else if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          peerConn.connected = false
          const remainingCount = this.getConnectedPeers().length
          console.log(`❌ [PEER] Desconectado de peer ${peerId.substring(0, 8)}... (estado: ${state})`)
          console.log(`   📊 Peers restantes: ${remainingCount}`)
          this.disconnectPeer(peerId)
        }
      }

      // Guardar conexión
      const peerConn: PeerConnection = {
        peerId,
        connection,
        dataChannel,
        connected: false,
        lastPing: Date.now(),
      }
      this.peerConnections.set(peerId, peerConn)

      // Si hay oferta, procesarla
      if (offer) {
        await connection.setRemoteDescription(offer)
        const answer = await connection.createAnswer()
        await connection.setLocalDescription(answer)
        
        // Enviar respuesta al servidor de señalización
        if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
          this.signalingServer.send(JSON.stringify({
            type: 'answer',
            target: peerId,
            answer: answer
          }))
        }
        
        return peerConn
      } else {
        // Crear oferta
        const newOffer = await connection.createOffer()
        await connection.setLocalDescription(newOffer)
        
        // Enviar oferta al servidor de señalización
        if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
          this.signalingServer.send(JSON.stringify({
            type: 'offer',
            target: peerId,
            offer: newOffer
          }))
        }
        
        return peerConn
      }
    } catch (error) {
      console.error(`Error conectando a peer ${peerId}:`, error)
      return null
    }
  }

  /**
   * Desconecta un peer
   */
  private disconnectPeer(peerId: string): void {
    const conn = this.peerConnections.get(peerId)
    if (conn) {
      conn.connection.close()
      this.peerConnections.delete(peerId)
    }

    // Actualizar tabla de routing
    this.routingTable.forEach((entry, dest) => {
      if (entry.nextHop === peerId) {
        this.routingTable.delete(dest)
      }
    })

    // Notificar callback
    if (this.onPeerDisconnectedCallback) {
      this.onPeerDisconnectedCallback(peerId)
    }
  }

  /**
   * Envía un mensaje a través de la red MESH
   */
  private sendMessage(message: MeshMessage, targetPeerId?: string): void {
    // Si hay un destinatario específico, enviar directamente
    if (targetPeerId) {
      const conn = this.peerConnections.get(targetPeerId)
      if (conn && conn.connected && conn.dataChannel.readyState === 'open') {
        conn.dataChannel.send(JSON.stringify(message))
        return
      }
    }

    // Si hay un destinatario final (to), usar routing
    if (message.to) {
      this.routeMessage(message)
      return
    }

    // Broadcast a todos los peers conectados
    this.broadcastMessage(message)
  }

  /**
   * Enruta un mensaje hacia su destinatario
   */
  private routeMessage(message: MeshMessage): void {
    if (!message.to) return

    // Inicializar campos de routing si no existen
    if (!message.hops) message.hops = 0
    if (!message.path) message.path = []
    if (!message.ttl) message.ttl = this.messageTTL

    // Verificar TTL
    if (message.hops >= this.maxHops) {
      console.warn(`Mensaje descartado: máximo de hops alcanzado (${message.hops})`)
      return
    }

    // Verificar si el mensaje ya pasó por aquí (prevenir loops)
    if (message.path.includes(this.localPeerId)) {
      console.warn('Mensaje descartado: loop detectado')
      return
    }

    // Agregar este peer al path
    message.path.push(this.localPeerId)
    message.hops++

    // Buscar en tabla de routing
    const route = this.routingTable.get(message.to)
    
    if (route) {
      // Tenemos una ruta, reenviar al siguiente hop
      const nextHop = route.nextHop
      const conn = this.peerConnections.get(nextHop)
      
      if (conn && conn.connected) {
        console.log(`📤 [ROUTING] Reenviando mensaje a ${nextHop.substring(0, 8)}... (siguiente hop hacia ${message.to.substring(0, 10)}...)`)
        console.log(`   📍 Ruta: ${message.path?.join(' → ') || 'directo'} → ${nextHop.substring(0, 8)}... (salto ${message.hops}/${route.distance})`)
        conn.dataChannel.send(JSON.stringify(message))
      } else {
        // Ruta inválida, buscar nueva ruta
        this.findRoute(message.to, message)
      }
    } else {
      // No tenemos ruta, buscar una
      this.findRoute(message.to, message)
    }
  }

  /**
   * Busca una ruta hacia un destinatario
   */
  private findRoute(destination: string, originalMessage?: MeshMessage): void {
    const connectedCount = this.getConnectedPeers().length
    console.log(`🔍 [ROUTING] Buscando ruta hacia ${destination.substring(0, 10)}... (${connectedCount} peers conectados)`)
    
    // Enviar route-request a todos los peers conectados
    const routeRequest: MeshMessage = {
      type: 'route-request',
      data: { destination, requester: this.localPeerId },
      timestamp: Date.now(),
      from: this.localPeerId,
      to: destination,
      hops: 0,
      path: [this.localPeerId],
      ttl: this.messageTTL,
    }

    this.broadcastMessage(routeRequest)

    // Si hay un mensaje original, guardarlo en cola
    if (originalMessage) {
      if (!this.messageQueue.has(destination)) {
        this.messageQueue.set(destination, [])
      }
      this.messageQueue.get(destination)!.push(originalMessage)
    }
  }

  /**
   * Envía un mensaje a todos los peers conectados
   */
  private broadcastMessage(message: MeshMessage): void {
    this.peerConnections.forEach((conn) => {
      if (conn.connected && conn.dataChannel.readyState === 'open') {
        try {
          conn.dataChannel.send(JSON.stringify(message))
        } catch (error) {
          console.error(`Error enviando mensaje a ${conn.peerId}:`, error)
        }
      }
    })
  }

  /**
   * Maneja mensajes recibidos
   */
  private handleMessage(message: MeshMessage, fromPeerId: string): void {
    // Verificar TTL
    if (message.ttl && Date.now() - message.timestamp > message.ttl) {
      console.warn('Mensaje descartado: TTL expirado')
      return
    }

    // Actualizar información del peer
    this.updatePeerInfo(fromPeerId, message)

    switch (message.type) {
      case 'ping':
        this.sendPong(fromPeerId)
        break

      case 'pong':
        const conn = this.peerConnections.get(fromPeerId)
        if (conn) {
          conn.lastPing = Date.now()
        }
        break

      case 'payment':
        this.handlePaymentMessage(message, fromPeerId)
        break

      case 'route-request':
        this.handleRouteRequest(message, fromPeerId)
        break

      case 'route-response':
        this.handleRouteResponse(message, fromPeerId)
        break

      case 'peer-discovery':
        this.handlePeerDiscovery(message, fromPeerId)
        break

      case 'sync-request':
        this.handleSyncRequest(message, fromPeerId)
        break

      case 'sync-response':
        this.handleSyncResponse(message, fromPeerId)
        break
    }
  }

  /**
   * Maneja mensajes de pago
   */
  private handlePaymentMessage(message: MeshMessage, fromPeerId: string): void {
    const payment = message.data as MeshPayment

    // Si el pago es para nosotros
    if (payment.to === this.localWalletAddress) {
      console.log('💸 Pago recibido para nosotros:', payment)
      this.addPendingPayment(payment)
      if (this.onPaymentReceivedCallback) {
        this.onPaymentReceivedCallback(payment)
      }
    } else if (message.to) {
      // El pago es para otro, reenviar
      console.log(`📤 Reenviando pago hacia ${message.to}`)
      this.routeMessage(message)
    }
  }

  /**
   * Maneja solicitudes de ruta
   */
  private handleRouteRequest(message: MeshMessage, fromPeerId: string): void {
    const { destination, requester } = message.data

    // Si conocemos la ruta, responder
    const route = this.routingTable.get(destination)
    if (route) {
      console.log(`📋 [ROUTING] Ruta encontrada en tabla: ${destination.substring(0, 10)}... → ${route.nextHop.substring(0, 8)}... (${route.distance} saltos)`)
      const routeResponse: MeshMessage = {
        type: 'route-response',
        data: {
          destination,
          nextHop: this.localPeerId,
          distance: route.distance + 1,
        },
        timestamp: Date.now(),
        from: this.localPeerId,
        to: requester,
        hops: 0,
        path: [this.localPeerId],
      }
      this.sendMessage(routeResponse, fromPeerId)
    } else if (destination !== this.localPeerId) {
      // No conocemos la ruta, reenviar la solicitud
      this.routeMessage(message)
    }
  }

  /**
   * Maneja respuestas de ruta
   */
  private handleRouteResponse(message: MeshMessage, fromPeerId: string): void {
    const { destination, nextHop, distance } = message.data

    // Actualizar tabla de routing
    const existingRoute = this.routingTable.get(destination)
    if (!existingRoute || distance < existingRoute.distance) {
      this.routingTable.set(destination, {
        destination,
        nextHop: fromPeerId,
        distance,
        lastUpdated: Date.now(),
      })
      
      console.log(`✅ [ROUTING] Ruta descubierta hacia ${destination.substring(0, 10)}...`)
      console.log(`   📍 Próximo salto: ${fromPeerId.substring(0, 8)}...`)
      console.log(`   📊 Total de saltos: ${distance}`)
      console.log(`   📋 Tabla de routing ahora tiene ${this.routingTable.size} rutas`)

      // Procesar mensajes en cola para este destino
      const queuedMessages = this.messageQueue.get(destination)
      if (queuedMessages) {
        queuedMessages.forEach((queuedMsg) => {
          this.routeMessage(queuedMsg)
        })
        this.messageQueue.delete(destination)
      }
    }

    // Si el mensaje tiene un destinatario, reenviar
    if (message.to && message.to !== this.localPeerId) {
      this.routeMessage(message)
    }
  }

  /**
   * Maneja descubrimiento de peers
   */
  private handlePeerDiscovery(message: MeshMessage, fromPeerId: string): void {
    const { knownPeers, walletAddress } = message.data

    // Actualizar información del peer
    const existingPeer = this.peers.get(fromPeerId)
    const peer: MeshPeer = existingPeer || {
      id: fromPeerId,
      address: walletAddress || '',
      connected: true,
      lastSeen: Date.now(),
      knownPeers: [],
    }
    peer.knownPeers = knownPeers || []
    peer.lastSeen = Date.now()
    if (walletAddress) {
      peer.address = walletAddress
    }
    this.peers.set(fromPeerId, peer)

    // Intentar conectar con peers desconocidos
    if (knownPeers) {
      knownPeers.forEach((peerId: string) => {
        if (peerId !== this.localPeerId && !this.peerConnections.has(peerId)) {
          // En producción, usar servidor de señalización para obtener ofertas
          console.log(`Nuevo peer descubierto: ${peerId}`)
        }
      })
    }
  }

  /**
   * Solicita descubrimiento de peers
   */
  private requestPeerDiscovery(peerId: string): void {
    const discovery: MeshMessage = {
      type: 'peer-discovery',
      data: {
        knownPeers: Array.from(this.peerConnections.keys()),
        walletAddress: this.localWalletAddress,
      },
      timestamp: Date.now(),
      from: this.localPeerId,
    }
    this.sendMessage(discovery, peerId)
  }

  /**
   * Descubre peers en la red
   */
  private discoverPeers(): void {
    if (!this.meshMode) return

    // Enviar solicitud de descubrimiento a todos los peers
    this.peerConnections.forEach((conn, peerId) => {
      if (conn.connected) {
        this.requestPeerDiscovery(peerId)
      }
    })
  }

  /**
   * Conecta a peers conocidos
   */
  private async connectToKnownPeers(): Promise<void> {
    // Cargar peers conocidos del localStorage
    const knownPeers = localStorage.getItem('mesh_known_peers')
    if (knownPeers) {
      try {
        const peerIds: string[] = JSON.parse(knownPeers)
        peerIds.forEach((peerId) => {
          if (peerId !== this.localPeerId) {
            this.connectToPeer(peerId)
          }
        })
      } catch (error) {
        console.error('Error cargando peers conocidos:', error)
      }
    }
  }

  /**
   * Envía un ping a un peer
   */
  private sendPing(peerId: string): void {
    const ping: MeshMessage = {
      type: 'ping',
      data: { peerId: this.localPeerId },
      timestamp: Date.now(),
      from: this.localPeerId,
    }
    this.sendMessage(ping, peerId)
  }

  /**
   * Envía un pong en respuesta a un ping
   */
  private sendPong(peerId: string): void {
    const pong: MeshMessage = {
      type: 'pong',
      data: { peerId: this.localPeerId },
      timestamp: Date.now(),
      from: this.localPeerId,
    }
    this.sendMessage(pong, peerId)
  }

  /**
   * Actualiza información de un peer
   */
  private updatePeerInfo(peerId: string, message: MeshMessage): void {
    const existing = this.peers.get(peerId) || {
      id: peerId,
      address: '',
      connected: true,
      lastSeen: Date.now(),
    }
    existing.lastSeen = Date.now()
    this.peers.set(peerId, existing)
  }

  /**
   * Envía un pago a través de la red MESH
   */
  sendPayment(payment: MeshPayment): void {
    if (!this.meshMode) {
      console.warn('Modo MESH no activo')
      return
    }

    // Guardar localmente
    this.addPendingPayment(payment)

    // Crear mensaje con routing
    const message: MeshMessage = {
      type: 'payment',
      data: payment,
      timestamp: Date.now(),
      from: this.localPeerId,
      to: payment.to, // Destinatario final (wallet address)
      hops: 0,
      path: [this.localPeerId],
      ttl: this.messageTTL,
    }

    // Enrutar mensaje
    this.routeMessage(message)

    console.log('💸 Pago enviado vía MESH:', payment)
  }

  /**
   * Maneja solicitudes de sincronización
   */
  private handleSyncRequest(message: MeshMessage, fromPeerId: string): void {
    const payments = Array.from(this.pendingPayments.values())
    const syncResponse: MeshMessage = {
      type: 'sync-response',
      data: payments,
      timestamp: Date.now(),
      from: this.localPeerId,
      to: message.from,
    }
    this.sendMessage(syncResponse, fromPeerId)
  }

  /**
   * Maneja respuestas de sincronización
   */
  private handleSyncResponse(message: MeshMessage, fromPeerId: string): void {
    if (Array.isArray(message.data)) {
      message.data.forEach((payment: MeshPayment) => {
        this.addPendingPayment(payment)
      })
    }
  }

  /**
   * Agrega un pago pendiente
   */
  private addPendingPayment(payment: MeshPayment): void {
    this.pendingPayments.set(payment.id, payment)
    this.savePendingPayments()
  }

  /**
   * Obtiene pagos pendientes
   */
  getPendingPayments(): MeshPayment[] {
    return Array.from(this.pendingPayments.values())
  }

  /**
   * Marca un pago como sincronizado
   */
  markPaymentSynced(paymentId: string): void {
    const payment = this.pendingPayments.get(paymentId)
    if (payment) {
      payment.synced = true
      this.savePendingPayments()
    }
  }

  /**
   * Obtiene peers conectados
   */
  getConnectedPeers(): MeshPeer[] {
    return Array.from(this.peers.values()).filter(p => p.connected)
  }

  /**
   * Obtiene la tabla de routing
   */
  getRoutingTable(): RoutingEntry[] {
    return Array.from(this.routingTable.values())
  }

  /**
   * Callbacks
   */
  onPaymentReceived(callback: (payment: MeshPayment) => void): void {
    this.onPaymentReceivedCallback = callback
  }

  onPeerConnected(callback: (peer: MeshPeer) => void): void {
    this.onPeerConnectedCallback = callback
  }

  onPeerDisconnected(callback: (peerId: string) => void): void {
    this.onPeerDisconnectedCallback = callback
  }

  /**
   * Guarda pagos pendientes
   */
  private savePendingPayments(): void {
    const payments = Array.from(this.pendingPayments.values())
    localStorage.setItem('mesh_pending_payments', JSON.stringify(payments))
  }

  /**
   * Carga pagos pendientes
   */
  private loadPendingPayments(): void {
    const stored = localStorage.getItem('mesh_pending_payments')
    if (stored) {
      try {
        const payments: MeshPayment[] = JSON.parse(stored)
        payments.forEach(payment => {
          this.pendingPayments.set(payment.id, payment)
        })
      } catch (error) {
        console.error('Error cargando pagos pendientes:', error)
      }
    }
  }

  /**
   * Maneja cambios en la conexión
   */
  private onConnectionChange(): void {
    if (this.isOnline) {
      console.log('🌐 Conexión a internet restaurada')
    } else {
      console.log('📡 Sin conexión a internet - Modo MESH activo')
    }
  }

  /**
   * Conecta al servidor de señalización
   */
  async connectToSignalingServer(url: string): Promise<void> {
    // Verificar que estamos en el navegador
    if (typeof window === 'undefined') {
      console.warn('WebSocket solo está disponible en el navegador')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
          console.log('Ya conectado al servidor de señalización')
          resolve()
          return
        }

        if (typeof WebSocket === 'undefined') {
          reject(new Error('WebSocket no está disponible en este entorno'))
          return
        }

        this.signalingServer = new WebSocket(url)
        
        this.signalingServer.onopen = () => {
          console.log('✅ Conectado al servidor de señalización')
          // Registrarse
          if (this.signalingServer && this.signalingServer.readyState === WebSocket.OPEN) {
            try {
              this.signalingServer.send(JSON.stringify({
                type: 'register',
                peerId: this.localPeerId,
                walletAddress: this.localWalletAddress
              }))
            } catch (error) {
              console.error('Error enviando registro:', error)
            }
          }
          resolve()
        }
        
        this.signalingServer.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            this.handleSignalingMessage(message)
          } catch (error) {
            console.error('Error procesando mensaje del servidor:', error)
          }
        }
        
        this.signalingServer.onerror = (error) => {
          console.error('Error en servidor de señalización:', error)
          // No rechazar inmediatamente, puede ser un error temporal
        }

        this.signalingServer.onclose = (event) => {
          console.log('❌ Desconectado del servidor de señalización', event.code, event.reason)
          this.signalingServer = null
          // Intentar reconectar después de 5 segundos si el modo MESH está activo
          if (this.meshMode) {
            setTimeout(() => {
              if (this.meshMode) {
                this.connectToSignalingServer(url).catch(console.error)
              }
            }, 5000)
          }
        }
      } catch (error) {
        console.error('Error creando conexión WebSocket:', error)
        reject(error)
      }
    })
  }

  /**
   * Maneja mensajes del servidor de señalización
   */
  private handleSignalingMessage(message: any): void {
    switch(message.type) {
      case 'peers-list':
        // Conectar a peers disponibles
        console.log(`📋 [SIGNALING] Lista de peers recibida: ${message.peers?.length || 0} peers disponibles`)
        if (Array.isArray(message.peers) && message.peers.length > 0) {
          message.peers.forEach((peer: any) => {
            if (peer.peerId && peer.peerId !== this.localPeerId) {
              console.log(`🔗 [SIGNALING] Intentando conectar a peer: ${peer.peerId.substring(0, 8)}... (${peer.walletAddress ? peer.walletAddress.substring(0, 10) + '...' : 'sin wallet'})`)
              this.connectToPeer(peer.peerId).catch((error) => {
                console.error(`❌ Error conectando a peer ${peer.peerId.substring(0, 8)}...:`, error)
              })
            }
          })
          console.log(`   📊 Total de peers que intentaremos conectar: ${message.peers.filter((p: any) => p.peerId && p.peerId !== this.localPeerId).length}`)
        } else {
          console.log('ℹ️ [SIGNALING] No hay peers disponibles para conectar')
        }
        break
        
      case 'offer':
        // Procesar oferta WebRTC
        this.handleOfferFromSignaling(message.offer, message.from)
        break
        
      case 'answer':
        // Procesar respuesta WebRTC
        this.handleAnswerFromSignaling(message.answer, message.from)
        break
        
      case 'ice-candidate':
        // Procesar candidato ICE
        const conn = this.peerConnections.get(message.from)
        if (conn && message.candidate) {
          conn.connection.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch(console.error)
        }
        break
        
      case 'peer-joined':
        // Nuevo peer disponible
        const newPeer = message.peer
        console.log(`🆕 [SIGNALING] Nuevo peer disponible: ${newPeer?.peerId?.substring(0, 8) || 'desconocido'}... (${newPeer?.walletAddress ? newPeer.walletAddress.substring(0, 10) + '...' : 'sin wallet'})`)
        if (newPeer && newPeer.peerId && newPeer.peerId !== this.localPeerId) {
          const currentConnected = this.getConnectedPeers().length
          console.log(`🔗 [SIGNALING] Intentando conectar a nuevo peer (actualmente ${currentConnected} peers conectados)`)
          this.connectToPeer(newPeer.peerId).catch((error) => {
            console.error(`❌ Error conectando a nuevo peer ${newPeer.peerId.substring(0, 8)}...:`, error)
          })
        }
        break

      case 'peer-left':
        // Peer desconectado
        console.log(`👋 [SIGNALING] Peer desconectado: ${message.peerId?.substring(0, 8) || 'desconocido'}...`)
        this.disconnectPeer(message.peerId)
        break
        
      case 'peer-left':
        // Peer desconectado
        this.disconnectPeer(message.peerId)
        break
    }
  }

  /**
   * Maneja oferta WebRTC desde servidor de señalización
   */
  private async handleOfferFromSignaling(offer: RTCSessionDescriptionInit, fromPeerId: string): Promise<void> {
    // connectToPeer ya maneja la oferta y envía la respuesta
    await this.connectToPeer(fromPeerId, offer)
  }

  /**
   * Maneja respuesta WebRTC desde servidor de señalización
   */
  private async handleAnswerFromSignaling(answer: RTCSessionDescriptionInit, fromPeerId: string): Promise<void> {
    const conn = this.peerConnections.get(fromPeerId)
    if (conn) {
      await conn.connection.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  /**
   * Obtiene el estado actual
   */
  getStatus(): {
    meshMode: boolean
    isOnline: boolean
    connectedPeers: number
    pendingPayments: number
    routingTableSize: number
  } {
    const status = {
      meshMode: this.meshMode,
      isOnline: this.isOnline,
      connectedPeers: this.getConnectedPeers().length,
      pendingPayments: this.pendingPayments.size,
      routingTableSize: this.routingTable.size,
    }
    
    // Log periódico del estado (solo si hay peers conectados y MESH está activo)
    if (status.connectedPeers > 0 && this.meshMode) {
      console.log(`📊 [STATUS] MESH activo: ${status.connectedPeers} peers conectados, ${status.pendingPayments} pagos pendientes, ${status.routingTableSize} rutas en tabla`)
    }
    
    return status
  }
}

// Singleton instance
let enhancedMeshNetworkInstance: EnhancedMeshNetworkService | null = null

export function getEnhancedMeshNetwork(): EnhancedMeshNetworkService {
  if (!enhancedMeshNetworkInstance) {
    enhancedMeshNetworkInstance = new EnhancedMeshNetworkService()
  }
  return enhancedMeshNetworkInstance
}

