# Servidor de Señalización WebSocket para Fluxo MESH

Este servidor facilita el descubrimiento y conexión de peers en la red MESH de Fluxo.

## Despliegue en Railway

### Opción 1: Desde GitHub (Recomendado)

1. Crea un repositorio separado para el servidor (opcional) o usa el mismo repositorio
2. Ve a [Railway](https://railway.app)
3. Haz clic en "New Project"
4. Selecciona "Deploy from GitHub repo"
5. Selecciona tu repositorio
6. Railway detectará automáticamente Node.js
7. Configura:
   - **Root Directory**: `server`
   - **Start Command**: `npm start`
   - **Port**: Railway asignará uno automáticamente (usa `PORT` env var)

### Opción 2: Desde código local

1. Instala Railway CLI: `npm i -g @railway/cli`
2. En la carpeta `server/`, ejecuta: `railway init`
3. Ejecuta: `railway up`

## Variables de Entorno

- `PORT`: Puerto del servidor (Railway lo asigna automáticamente)
- `SIGNALING_PORT`: Puerto alternativo (por defecto 8081)

## Uso Local

```bash
cd server
npm install
npm start
```

El servidor estará disponible en `ws://localhost:8081`

## Notas

- Railway asignará automáticamente una URL pública (ej: `wss://tu-proyecto.railway.app`)
- Usa esa URL en `NEXT_PUBLIC_SIGNALING_URL` en Netlify

