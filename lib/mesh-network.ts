/**
 * Mesh Network Service
 * Permite comunicación peer-to-peer entre dispositivos para pagos offline
 * Usa WebRTC para conexiones directas sin necesidad de servidor
 */

export interface MeshPeer {
  id: string
  address: string
  name?: string
  connected: boolean
  lastSeen: number
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
  type: 'payment' | 'sync-request' | 'sync-response' | 'ping' | 'pong'
  data: any
  timestamp: number
  from: string
}

class MeshNetworkService {
  private peerConnection: RTCPeerConnection | null = null
  private dataChannel: RTCDataChannel | null = null
  private localPeerId: string = ''
  private peers: Map<string, MeshPeer> = new Map()
  private pendingPayments: Map<string, MeshPayment> = new Map()
  private onPaymentReceivedCallback?: (payment: MeshPayment) => void
  private onPeerConnectedCallback?: (peer: MeshPeer) => void
  private onPeerDisconnectedCallback?: (peerId: string) => void
  private isOnline: boolean = navigator.onLine
  private meshMode: boolean = false

  constructor() {
    // Generar ID único para este peer
    this.localPeerId = this.generatePeerId()
    
    // Escuchar cambios de conexión
    window.addEventListener('online', () => {
      this.isOnline = true
      this.onConnectionChange()
    })
    
    window.addEventListener('offline', () => {
      this.isOnline = false
      this.onConnectionChange()
    })

    // Cargar pagos pendientes del localStorage
    this.loadPendingPayments()
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
   * Inicia el modo MESH
   */
  async startMeshMode(): Promise<void> {
    if (this.meshMode) return

    this.meshMode = true
    console.log('🌐 Modo MESH activado')

    // Intentar crear conexión WebRTC
    try {
      await this.initializeWebRTC()
    } catch (error) {
      console.error('Error inicializando WebRTC:', error)
      // Si WebRTC falla, usar modo de sincronización manual
      this.meshMode = false
    }
  }

  /**
   * Detiene el modo MESH
   */
  stopMeshMode(): void {
    this.meshMode = false
    if (this.dataChannel) {
      this.dataChannel.close()
      this.dataChannel = null
    }
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }
    this.peers.clear()
    console.log('🌐 Modo MESH desactivado')
  }

  /**
   * Inicializa WebRTC para conexiones peer-to-peer
   */
  private async initializeWebRTC(): Promise<void> {
    // Configuración STUN para NAT traversal
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    }

    this.peerConnection = new RTCPeerConnection(configuration)

    // Crear canal de datos
    this.dataChannel = this.peerConnection.createDataChannel('mesh', {
      ordered: true,
    })

    this.dataChannel.onopen = () => {
      console.log('✅ Canal de datos MESH abierto')
      this.sendMessage({
        type: 'ping',
        data: { peerId: this.localPeerId },
        timestamp: Date.now(),
        from: this.localPeerId,
      })
    }

    this.dataChannel.onmessage = (event) => {
      try {
        const message: MeshMessage = JSON.parse(event.data)
        this.handleMessage(message)
      } catch (error) {
        console.error('Error procesando mensaje MESH:', error)
      }
    }

    this.dataChannel.onerror = (error) => {
      console.error('Error en canal de datos MESH:', error)
    }

    this.dataChannel.onclose = () => {
      console.log('❌ Canal de datos MESH cerrado')
    }

    // Manejar candidatos ICE
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // En una implementación completa, enviaríamos esto a través de un servidor de señalización
        // Por ahora, usamos un enfoque simplificado
      }
    }

    // Manejar conexión de peers
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      console.log('Estado de conexión MESH:', state)
    }
  }

  /**
   * Maneja mensajes recibidos de otros peers
   */
  private handleMessage(message: MeshMessage): void {
    switch (message.type) {
      case 'ping':
        this.sendMessage({
          type: 'pong',
          data: { peerId: this.localPeerId },
          timestamp: Date.now(),
          from: this.localPeerId,
        })
        break

      case 'pong':
        // Actualizar información del peer
        if (message.data?.peerId) {
          this.updatePeer(message.data.peerId, {
            connected: true,
            lastSeen: Date.now(),
          })
        }
        break

      case 'payment':
        this.handlePaymentReceived(message.data as MeshPayment)
        break

      case 'sync-request':
        // Enviar pagos pendientes
        this.sendPendingPayments(message.from)
        break

      case 'sync-response':
        // Recibir pagos de otro peer
        if (Array.isArray(message.data)) {
          message.data.forEach((payment: MeshPayment) => {
            this.addPendingPayment(payment)
          })
        }
        break
    }
  }

  /**
   * Envía un mensaje a través del canal de datos
   */
  private sendMessage(message: MeshMessage): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(message))
    } else {
      console.warn('Canal de datos no disponible')
    }
  }

  /**
   * Maneja un pago recibido de otro peer
   */
  private handlePaymentReceived(payment: MeshPayment): void {
    console.log('💸 Pago recibido vía MESH:', payment)
    
    // Guardar pago pendiente
    this.addPendingPayment(payment)

    // Notificar callback
    if (this.onPaymentReceivedCallback) {
      this.onPaymentReceivedCallback(payment)
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
   * Envía un pago a través de la red MESH
   */
  sendPayment(payment: MeshPayment): void {
    if (!this.meshMode) {
      console.warn('Modo MESH no activo')
      return
    }

    // Guardar localmente
    this.addPendingPayment(payment)

    // Enviar a través de la red MESH
    this.sendMessage({
      type: 'payment',
      data: payment,
      timestamp: Date.now(),
      from: this.localPeerId,
    })

    console.log('💸 Pago enviado vía MESH:', payment)
  }

  /**
   * Sincroniza pagos pendientes con otro peer
   */
  requestSync(peerId?: string): void {
    this.sendMessage({
      type: 'sync-request',
      data: { peerId: this.localPeerId },
      timestamp: Date.now(),
      from: this.localPeerId,
    })
  }

  /**
   * Envía pagos pendientes a otro peer
   */
  private sendPendingPayments(toPeerId: string): void {
    const payments = Array.from(this.pendingPayments.values())
    this.sendMessage({
      type: 'sync-response',
      data: payments,
      timestamp: Date.now(),
      from: this.localPeerId,
    })
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
   * Actualiza información de un peer
   */
  private updatePeer(peerId: string, updates: Partial<MeshPeer>): void {
    const existing = this.peers.get(peerId) || {
      id: peerId,
      address: '',
      connected: false,
      lastSeen: Date.now(),
    }

    const updated = { ...existing, ...updates }
    this.peers.set(peerId, updated)

    if (updates.connected && this.onPeerConnectedCallback) {
      this.onPeerConnectedCallback(updated)
    }

    if (!updates.connected && this.onPeerDisconnectedCallback) {
      this.onPeerDisconnectedCallback(peerId)
    }
  }

  /**
   * Obtiene lista de peers conectados
   */
  getConnectedPeers(): MeshPeer[] {
    return Array.from(this.peers.values()).filter(p => p.connected)
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
   * Guarda pagos pendientes en localStorage
   */
  private savePendingPayments(): void {
    const payments = Array.from(this.pendingPayments.values())
    localStorage.setItem('mesh_pending_payments', JSON.stringify(payments))
  }

  /**
   * Carga pagos pendientes de localStorage
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
      // Intentar sincronizar pagos pendientes
    } else {
      console.log('📡 Sin conexión a internet - Modo MESH activo')
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
  } {
    return {
      meshMode: this.meshMode,
      isOnline: this.isOnline,
      connectedPeers: this.getConnectedPeers().length,
      pendingPayments: this.pendingPayments.size,
    }
  }

  /**
   * Genera una oferta WebRTC para compartir con otro peer
   */
  async createOffer(): Promise<string> {
    if (!this.peerConnection) {
      await this.initializeWebRTC()
    }

    const offer = await this.peerConnection!.createOffer()
    await this.peerConnection!.setLocalDescription(offer)
    
    return JSON.stringify(offer)
  }

  /**
   * Procesa una oferta WebRTC de otro peer
   */
  async handleOffer(offerJson: string): Promise<string> {
    if (!this.peerConnection) {
      await this.initializeWebRTC()
    }

    const offer = JSON.parse(offerJson)
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(offer))
    
    const answer = await this.peerConnection!.createAnswer()
    await this.peerConnection!.setLocalDescription(answer)
    
    return JSON.stringify(answer)
  }

  /**
   * Procesa una respuesta WebRTC de otro peer
   */
  async handleAnswer(answerJson: string): Promise<void> {
    if (!this.peerConnection) return

    const answer = JSON.parse(answerJson)
    await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(answer))
  }
}

// Singleton instance
let meshNetworkInstance: MeshNetworkService | null = null

export function getMeshNetwork(): MeshNetworkService {
  if (!meshNetworkInstance) {
    meshNetworkInstance = new MeshNetworkService()
  }
  return meshNetworkInstance
}

