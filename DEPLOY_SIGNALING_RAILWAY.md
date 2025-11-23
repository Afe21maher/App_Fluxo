# Guía Paso a Paso: Desplegar Servidor de Señalización en Railway

## Paso 1: Crear cuenta en Railway

1. Ve a https://railway.app
2. Haz clic en "Start a New Project" o "Login"
3. Inicia sesión con GitHub (recomendado) o crea una cuenta

## Paso 2: Crear nuevo proyecto

1. En el dashboard de Railway, haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Autoriza Railway para acceder a tus repositorios de GitHub
4. Selecciona el repositorio: `Afe21maher/App_Fluxo`

## Paso 3: Configurar el servicio

1. Railway detectará automáticamente que es un proyecto Node.js
2. Haz clic en el servicio creado
3. Ve a la pestaña "Settings"
4. Configura:
   - **Root Directory**: `server`
   - **Start Command**: `npm start`
   - Railway detectará automáticamente el `package.json` en la carpeta `server`

## Paso 4: Configurar variables de entorno (opcional)

Railway asignará automáticamente el puerto usando la variable `PORT`, pero puedes configurar:
- `PORT`: Railway lo asigna automáticamente (no necesitas configurarlo)
- `SIGNALING_PORT`: Solo si quieres un puerto específico (no recomendado)

## Paso 5: Obtener la URL del servidor

1. Una vez desplegado, ve a la pestaña "Settings"
2. Busca la sección "Networking" o "Domains"
3. Railway asignará automáticamente una URL pública, algo como:
   - `tu-proyecto-production.up.railway.app`
4. **IMPORTANTE**: La URL será `wss://` (WebSocket Secure), no `ws://`
   - Ejemplo: `wss://tu-proyecto-production.up.railway.app`

## Paso 6: Configurar en Netlify

1. Ve a tu proyecto en Netlify
2. Ve a "Project configuration" → "Environment variables"
3. Agrega la variable:
   - **Key**: `NEXT_PUBLIC_SIGNALING_URL`
   - **Value**: `wss://tu-proyecto-production.up.railway.app` (la URL que obtuviste de Railway)
   - **Scopes**: All scopes
4. Guarda

## Paso 7: Redesplegar en Netlify

1. Ve a "Deploys"
2. Haz clic en "Trigger deploy" → "Deploy site"
3. Espera a que termine el deployment

## Paso 8: Probar

1. Abre tu aplicación en Netlify: `fluxxo.netlify.app/fluxo/pagos`
2. Abre la consola del navegador (F12)
3. Deberías ver mensajes como:
   - `✅ Conectado al servidor de señalización`
   - `📋 [SIGNALING] Lista de peers recibida`

## Notas importantes

- Railway tiene un plan gratuito con límites generosos
- El servidor se mantendrá activo mientras haya tráfico
- Si no hay actividad, Railway puede poner el servidor en "sleep" (se despertará automáticamente con la primera conexión)
- La URL de Railway es permanente y no cambia

## Solución de problemas

### Si el servidor no inicia:
- Verifica los logs en Railway (pestaña "Deployments" → "View Logs")
- Asegúrate de que `Root Directory` esté configurado como `server`

### Si no se conecta desde Netlify:
- Verifica que la URL use `wss://` (no `ws://`)
- Verifica que la variable `NEXT_PUBLIC_SIGNALING_URL` esté configurada correctamente
- Revisa la consola del navegador para ver errores

