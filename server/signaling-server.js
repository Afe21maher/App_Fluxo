/**
 * Servidor de Señalización WebSocket
 * Facilita el descubrimiento y conexión de peers en la red MESH
 * 
 * Uso:
 *   node server/signaling-server.js
 * 
 * O con nodemon:
 *   npx nodemon server/signaling-server.js
 */

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.SIGNALING_PORT || 8081;

// Crear servidor HTTP
const server = http.createServer();

// Crear servidor WebSocket
const wss = new WebSocket.Server({ server });

// Almacenar peers conectados
const peers = new Map();

console.log(`🚀 Servidor de señalización iniciado en puerto ${PORT}`);

wss.on('connection', (ws, req) => {
  let peerId = null;
  let walletAddress = null;

  console.log('📡 Nueva conexión WebSocket');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch(data.type) {
        case 'register':
          // Registrar nuevo peer
          peerId = data.peerId;
          walletAddress = data.walletAddress;
          
          peers.set(peerId, { 
            ws, 
            walletAddress,
            connectedAt: Date.now(),
            lastSeen: Date.now()
          });

          console.log(`✅ Peer registrado: ${peerId} (${walletAddress || 'sin wallet'})`);

          // Enviar lista de peers disponibles (excluyendo el que se acaba de conectar)
          const availablePeers = Array.from(peers.entries())
            .filter(([id]) => id !== peerId)
            .map(([id, info]) => ({
              peerId: id,
              walletAddress: info.walletAddress,
              connectedAt: info.connectedAt
            }));

          ws.send(JSON.stringify({
            type: 'peers-list',
            peers: availablePeers
          }));

          // Notificar a otros peers sobre el nuevo peer
          broadcastToOthers(peerId, {
            type: 'peer-joined',
            peer: {
              peerId,
              walletAddress
            }
          });
          break;

        case 'offer':
          // Reenviar oferta WebRTC al destinatario
          const targetPeer = peers.get(data.target);
          if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
            targetPeer.ws.send(JSON.stringify({
              type: 'offer',
              from: peerId,
              offer: data.offer
            }));
            console.log(`📤 Oferta enviada de ${peerId} a ${data.target}`);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: `Peer ${data.target} no disponible`
            }));
          }
          break;

        case 'answer':
          // Reenviar respuesta WebRTC al originador
          const originPeer = peers.get(data.target);
          if (originPeer && originPeer.ws.readyState === WebSocket.OPEN) {
            originPeer.ws.send(JSON.stringify({
              type: 'answer',
              from: peerId,
              answer: data.answer
            }));
            console.log(`📥 Respuesta enviada de ${peerId} a ${data.target}`);
          }
          break;

        case 'ice-candidate':
          // Reenviar candidato ICE
          const candidatePeer = peers.get(data.target);
          if (candidatePeer && candidatePeer.ws.readyState === WebSocket.OPEN) {
            candidatePeer.ws.send(JSON.stringify({
              type: 'ice-candidate',
              from: peerId,
              candidate: data.candidate
            }));
          }
          break;

        case 'ping':
          // Heartbeat
          if (peerId) {
            const peer = peers.get(peerId);
            if (peer) {
              peer.lastSeen = Date.now();
              ws.send(JSON.stringify({ type: 'pong' }));
            }
          }
          break;

        case 'request-peers':
          // Solicitar lista de peers
          const allPeers = Array.from(peers.entries())
            .filter(([id]) => id !== peerId)
            .map(([id, info]) => ({
              peerId: id,
              walletAddress: info.walletAddress,
              connectedAt: info.connectedAt
            }));

          ws.send(JSON.stringify({
            type: 'peers-list',
            peers: allPeers
          }));
          break;

        default:
          console.warn(`⚠️ Tipo de mensaje desconocido: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error procesando mensaje'
      }));
    }
  });

  ws.on('close', () => {
    if (peerId) {
      console.log(`❌ Peer desconectado: ${peerId}`);
      peers.delete(peerId);
      
      // Notificar a otros peers
      broadcastToOthers(peerId, {
        type: 'peer-left',
        peerId
      });
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ Error en WebSocket:`, error);
  });

  // Enviar ping periódico para mantener conexión
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 30000); // Cada 30 segundos
});

/**
 * Envía un mensaje a todos los peers excepto al especificado
 */
function broadcastToOthers(excludePeerId, message) {
  peers.forEach((peer, peerId) => {
    if (peerId !== excludePeerId && peer.ws.readyState === WebSocket.OPEN) {
      peer.ws.send(JSON.stringify(message));
    }
  });
}

/**
 * Limpia peers desconectados periódicamente
 */
setInterval(() => {
  const now = Date.now();
  const timeout = 120000; // 120 segundos (2 minutos) sin actividad

  peers.forEach((peer, peerId) => {
    // Solo limpiar si el WebSocket está cerrado o inactivo
    if (peer.ws.readyState === WebSocket.CLOSED || peer.ws.readyState === WebSocket.CLOSING) {
      console.log(`🧹 Limpiando peer desconectado: ${peerId}`);
      peers.delete(peerId);
      // Notificar a otros peers
      broadcastToOthers(peerId, {
        type: 'peer-left',
        peerId
      });
    } else if (now - peer.lastSeen > timeout) {
      console.log(`🧹 Limpiando peer inactivo: ${peerId} (sin actividad por ${Math.floor((now - peer.lastSeen) / 1000)}s)`);
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.close();
      }
      peers.delete(peerId);
      // Notificar a otros peers
      broadcastToOthers(peerId, {
        type: 'peer-left',
        peerId
      });
    }
  });
}, 60000); // Cada 60 segundos

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en ws://localhost:${PORT}`);
  console.log(`📊 Peers conectados: ${peers.size}`);
});

// Manejo de errores
server.on('error', (error) => {
  console.error('❌ Error del servidor:', error);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  });
});

