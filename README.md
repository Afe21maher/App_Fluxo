# Integraciones
Acerca de Sistema de Pagos blockchain Offline utilizando Redes Mesh, implementado con EVVM, Hedera y Privy...

## Requisitos del Hackathon

**Construido usando Privy's APIs o SDK**
- Usa `@privy-io/react-auth` para autenticación
- Usa `useHeadlessDelegatedActions` hook para gestión de session signers y delegación de wallets

 **Usa Privy para autenticación y gestión de wallets embebidos**
- Configurado con `embeddedWallets` en el PrivyProvider
- Soporta múltiples métodos de login (email, wallet, SMS)

**Genera y autoriza una clave de session signer de Privy**
- Implementado en `components/SessionSignerDemo.tsx`
- Función `handleDelegateWallet` usa `delegateWallet` de `useHeadlessDelegatedActions` para crear y autorizar el session signer

**Demuestra al menos una acción delegada usando el session signer**
- `handleDelegatedAction` muestra cómo ejecutar acciones sin re-aprobación
- Preparación de transacciones usando el session signer

## Configuración

1. Instala las dependencias:
```bash
npm install
```

2. Configura tu App ID de Privy:
   - Edita `.env.local` y reemplaza `your_privy_app_id_here` con tu App ID real de Privy

3. Ejecuta la aplicación en modo desarrollo:
```bash
npm run dev
```

4. Abre [http://localhost:3000](http://localhost:3000) en tu navegador

## Características

- **Inicio de Sesión**: Múltiples métodos (email, wallet, SMS)
- **Wallets Embebidos**: Creación automática de wallets para usuarios sin wallet
- **Session Signers**: Creación y autorización de session signers
- **Acciones Delegadas**: Ejecución de acciones sin re-aprobación constante
- **UI Moderna**: Interfaz limpia y responsive

## Estructura del Proyecto

```
privy/
├── app/
│   ├── layout.tsx          # Layout principal con PrivyProvider
│   ├── page.tsx            # Página principal
│   └── globals.css         # Estilos globales
├── components/
│   ├── LoginButton.tsx     # Botón de inicio de sesión
│   └── SessionSignerDemo.tsx # Demo de session signers
├── package.json
├── tsconfig.json
└── README.md
```

## Uso

1. Inicia sesión usando cualquier método disponible
2. Una vez autenticado, verás la información de tu usuario y wallets
3. Haz clic en "Crear Session Signer" para generar y autorizar un session signer
4. Usa "Ejecutar Acción Delegada" para demostrar acciones sin re-aprobación

## Notas

- Asegúrate de tener tu App ID de Privy configurado en `.env.local`
- El session signer permite ejecutar acciones en nombre del usuario sin requerir aprobación constante
- Esto es ideal para aplicaciones que requieren alta velocidad y continuidad (pagos rápidos, trading, etc.)

