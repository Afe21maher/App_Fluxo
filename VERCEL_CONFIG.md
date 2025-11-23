# Configuración de Vercel para Fluxo

## Acceso a las páginas

### URLs disponibles:
- **`/`** (raíz) → Redirige automáticamente a `/fluxo`
- **`/fluxo`** → Landing page de Fluxo (accesible sin autenticación)
- **`/fluxo/pagos`** → Página de pagos (requiere autenticación)
- **`/fluxo/demo`** → Página de demo
- **`/evvm-test`** → DApp de prueba para EVVM

## Configurar dominio personalizado en Vercel

### Opción 1: Usar el dominio de Vercel
Vercel te proporciona automáticamente un dominio como:
- `tu-proyecto.vercel.app`
- `tu-proyecto-git-main-tu-usuario.vercel.app`

### Opción 2: Agregar dominio personalizado

1. **Ve a tu proyecto en Vercel:**
   - https://vercel.com/dashboard
   - Selecciona tu proyecto "privy" o "appflux"

2. **Configuración → Domains:**
   - Haz clic en "Add" o "Agregar"
   - Ingresa tu dominio (ej: `fluxo.com` o `app.fluxo.com`)

3. **Configurar DNS:**
   - Vercel te dará registros DNS para agregar
   - Agrega estos registros en tu proveedor de dominio

### Opción 3: Usar múltiples URLs del mismo proyecto

Vercel permite múltiples dominios para el mismo proyecto:
- Puedes agregar varios dominios en Settings → Domains
- Todos apuntarán a la misma aplicación

## Variables de entorno en Vercel

Asegúrate de configurar estas variables en Vercel:

1. **Ve a Settings → Environment Variables**
2. Agrega:
   ```
   NEXT_PUBLIC_PRIVY_APP_ID=tu_app_id_aqui
   NEXT_PUBLIC_FLUXO_PAYMENT_CONTRACT=0x...
   NEXT_PUBLIC_ORACLE_CONTRACT=0x...
   NEXT_PUBLIC_HEDERA_NETWORK=testnet
   NEXT_PUBLIC_SIGNALING_URL=wss://tu-servidor-railway.up.railway.app
   ```

3. **Haz clic en "Save" y redeploy**

## Redirecciones

- La raíz (`/`) redirige automáticamente a `/fluxo`
- `/fluxo` muestra la landing page (sin autenticación)
- `/fluxo/pagos` requiere autenticación y redirige a `/fluxo` si no estás autenticado

## Solución de problemas

### Si no puedes acceder a `/fluxo`:
1. Verifica que el deployment esté completo
2. Limpia la caché del navegador
3. Verifica que las variables de entorno estén configuradas
4. Revisa los logs de Vercel para errores

### Si ves la página de login de Privy en lugar de Fluxo:
- Esto significa que estás en la raíz (`/`) que ahora redirige a `/fluxo`
- Accede directamente a: `tu-dominio.vercel.app/fluxo`

