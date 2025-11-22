# Offline Mesh Payments

Sistema de pagos blockchain offline utilizando redes mesh, implementado con EVVM, Hedera y Privy.

## Arquitectura

```
Red Mesh (libp2p + XMTP) → EVVM Fisher/Relayer → Sincronización (Hedera)
```

### Flujo de una Transacción:

1. **Usuario crea pago offline** → Se firma localmente
2. **Se guarda en storage offline** → Base de datos local (LevelDB)
3. **EVVM Fisher captura** → Procesa en blockchain virtual (sin gas)
4. **Se ejecuta en EVVM** → Transacción válida en red virtual
5. **Se transmite por mesh** → Otros nodos cercanos la reciben
6. **Cuando hay internet** → Se sincroniza con Hedera (rápido y barato)

## Instalación

```bash
# Instalar dependencias
npm install

# Compilar contratos
npm run compile:contracts
```

## Configuración

1. Copia `.env.example` a `.env`
2. Configura las variables de entorno:

```env
# Hedera (obligatorio para sincronización)
HEDERA_NETWORK=testnet
HEDERA_ACCOUNT_ID=0.0.xxxxx
HEDERA_PRIVATE_KEY=302e...

# EVVM (obligatorio para fishing/relaying)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
SEPOLIA_PRIVATE_KEY=0x...

# XMTP (obligatorio para comunicación)
XMTP_PRIVATE_KEY=0x...
XMTP_ENV=dev

# Mesh Network (opcional)
MESH_PORT=9000
MESH_BOOTSTRAP_NODES=/ip4/127.0.0.1/tcp/9000/p2p/...
```

## Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

### Ejemplo de Uso
```bash
# Ver src/examples/usage.ts para ejemplos completos
ts-node src/examples/usage.ts
```

## Estructura del Proyecto

```
src/
├── config/         # Configuración de la aplicación
├── mesh/           # Red mesh (libp2p)
│   └── meshNetwork.ts
├── evvm/           # EVVM Fisher/Relayer
│   └── fisher.ts
├── hedera/         # Sincronización Hedera
│   └── syncService.ts
├── xmtp/           # Comunicación XMTP
│   └── messaging.ts
├── storage/        # Almacenamiento offline (LevelDB)
│   └── offlineStorage.ts
├── sync/           # Sistema de sincronización
│   └── syncManager.ts
├── services/       # Servicios principales
│   └── paymentService.ts
├── utils/          # Utilidades
│   └── logger.ts
├── types/          # TypeScript types
│   └── index.ts
├── examples/       # Ejemplos de uso
│   └── usage.ts
└── index.ts        # Punto de entrada

contracts/
└── OfflinePaymentSync.sol  # Contrato para Hedera

scripts/
└── deploy-hedera.ts        # Script de deployment
```

## Funcionalidades Principales

### 1. Red Mesh (libp2p)
- Comunicación P2P entre dispositivos cercanos
- Transmisión de transacciones sin internet
- Descubrimiento automático de peers

### 2. EVVM Fisher/Relayer
- Captura transacciones offline
- Ejecuta en blockchain virtual (sin gas)
- Usa fishing spots para comunicación
- Valida firmas EIP-191

### 3. Sincronización Hedera
- Sincroniza transacciones cuando hay internet
- Alta velocidad (10k+ TPS)
- Bajas tarifas
- Soporte para tokens y HBAR

### 4. XMTP Messaging
- Comunicación descentralizada
- Envío de solicitudes de pago
- Notificaciones de transacciones

### 5. Almacenamiento Offline
- Base de datos local (LevelDB)
- Persistencia de transacciones
- Índices para búsqueda rápida

## API Principal

```typescript
// Crear pago offline
const tx = await paymentService.createOfflinePayment(
  "0x...",      // Dirección destino
  "1000000",    // Cantidad
  undefined     // Token address (undefined = HBAR)
);

// Crear solicitud de pago
const request = await paymentService.createPaymentRequest(
  "0x...",
  "500000",
  undefined,
  "Payment for services"
);

// Obtener transacciones pendientes
const txs = await paymentService.getTransactions();

// Obtener transacción específica
const tx = await paymentService.getTransaction(txId);
```

## Deployment

### Deployar Contrato en Hedera

```bash
# Configurar .env con credenciales de Hedera
npm run deploy:hedera
```

## 🧪 Testing

```bash
npm test
```

## 📚 Recursos

- [EVVM Documentation](https://evvm.info)
- [Hedera Documentation](https://docs.hedera.com)
- [XMTP Documentation](https://docs.xmtp.org)
- [libp2p Documentation](https://docs.libp2p.io)

## 📝 Licencia

MIT

