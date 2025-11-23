# Guía de Despliegue en Vercel

## Pasos para desplegar desde cero

### 1. Eliminar el proyecto actual en Vercel (opcional)
- Ve a tu proyecto en Vercel
- Settings → General → Delete Project
- Confirma la eliminación

### 2. Crear nuevo proyecto en Vercel
1. Ve a https://vercel.com/new
2. Selecciona "Import Git Repository"
3. Ingresa la URL: `https://github.com/Afe21maher/App_Fluxo`
4. Haz clic en "Continue"

### 3. Configuración del proyecto
- **Framework Preset:** Next.js (debería detectarse automáticamente)
- **Root Directory:** `./` (dejar por defecto)
- **Build Command:** `npm run build` (dejar por defecto)
- **Output Directory:** `.next` (dejar por defecto)
- **Install Command:** `npm install` (dejar por defecto)

### 4. Configurar Variables de Entorno
**IMPORTANTE:** Configura estas variables ANTES de hacer el primer deploy:

1. Haz clic en "Environment Variables" o "Add Environment Variable"
2. Agrega las siguientes variables:

| Variable | Valor | Ambientes |
|----------|-------|-----------|
| `NEXT_PUBLIC_PRIVY_APP_ID` | Tu App ID de Privy | Production, Preview, Development |
| `NEXT_PUBLIC_FLUXO_PAYMENT_CONTRACT` | `0xFF0dc94E621B666DB7C303a4cF326aE63B2efb51` | Production, Preview, Development |
| `NEXT_PUBLIC_ORACLE_CONTRACT` | `0x5B8A3205Dd56A99F96F9C65B455b483D31cFF1eB` | Production, Preview, Development |
| `NEXT_PUBLIC_HEDERA_NETWORK` | `testnet` | Production, Preview, Development |

### 5. Deploy
- Haz clic en "Deploy"
- Espera a que termine el build (2-5 minutos)

### 6. Verificar el despliegue
- Una vez completado, visita tu URL: `tu-proyecto.vercel.app`
- Prueba las rutas:
  - `/` - Página principal (redirige a `/fluxo` después del login)
  - `/fluxo` - Landing page de Fluxo
  - `/fluxo/pagos` - Página de pagos
  - `/evvm-test` - DApp de prueba EVVM

## Dependencias del proyecto

### Dependencies (producción)
- `@privy-io/react-auth`: ^2.0.0
- `ethers`: ^6.15.0
- `next`: ^14.2.0
- `react`: ^18.3.1
- `react-dom`: ^18.3.1
- `viem`: ^2.0.0

### DevDependencies (desarrollo)
- `@types/node`: ^20.0.0
- `@types/react`: ^18.2.0
- `@types/react-dom`: ^18.2.0
- `empty-loader`: ^1.0.1
- `eslint`: ^8.0.0
- `eslint-config-next`: ^14.0.0
- `typescript`: ^5.0.0

## Estructura del proyecto

```
app/
├── fluxo/
│   ├── page.tsx          # Landing page
│   ├── pagos/
│   │   └── page.tsx      # Página de pagos
│   └── demo/
│       └── page.tsx      # Demo page
├── evvm-test/
│   └── page.tsx          # DApp de prueba EVVM
└── page.tsx              # Página principal (redirige a /fluxo)

components/
└── fluxo/
    ├── FluxoLanding.tsx
    ├── FluxoPagos.tsx
    ├── EVVMFisher.tsx
    ├── MeshNetworkStatus.tsx
    └── HederaIntegration.tsx

lib/
├── hedera.ts
├── evvm-fisher.ts
└── mesh-network-enhanced.ts
```

## Notas importantes

- El proyecto usa Next.js 14 con App Router
- Todas las páginas están configuradas como dinámicas (`export const dynamic = 'force-dynamic'`)
- Los archivos de Hardhat están excluidos del build mediante `tsconfig.json` y `next.config.js`
- El servidor de señalización (`server/signaling-server.js`) no se despliega en Vercel (solo para desarrollo local)

