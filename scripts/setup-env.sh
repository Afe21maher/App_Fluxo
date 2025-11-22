#!/bin/bash

echo "🔑 Configuración de Credenciales para Offline Mesh Payments"
echo "============================================================"
echo ""

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env..."
    touch .env
else
    echo "⚠️  El archivo .env ya existe. Se agregarán las nuevas variables."
fi

echo ""
echo "=== EVVM Configuration (MATE Metaprotocol) ==="
echo ""

# Sepolia RPC URL
read -p "Ingresa tu Sepolia RPC URL (Infura/Alchemy): " SEPOLIA_RPC
if [ ! -z "$SEPOLIA_RPC" ]; then
    echo "SEPOLIA_RPC_URL=$SEPOLIA_RPC" >> .env
fi

# Sepolia Private Key
read -p "Ingresa tu Sepolia Private Key (0x...): " SEPOLIA_KEY
if [ ! -z "$SEPOLIA_KEY" ]; then
    echo "SEPOLIA_PRIVATE_KEY=$SEPOLIA_KEY" >> .env
fi

# MATE Protocol Address (opcional)
read -p "Dirección del MATE Metaprotocol (opcional, Enter para omitir): " MATE_ADDRESS
if [ ! -z "$MATE_ADDRESS" ]; then
    echo "EVVM_MATE_PROTOCOL_ADDRESS=$MATE_ADDRESS" >> .env
fi

echo ""
echo "=== Configuración Básica ==="
echo "MESH_PORT=9000" >> .env
echo "NODE_ENV=development" >> .env
echo "LOG_LEVEL=info" >> .env
echo "PORT=3000" >> .env

echo ""
echo "✅ Configuración básica completada!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Configurar credenciales de Hedera (ver GUIA_CREDENCIALES.md)"
echo "   2. Configurar credenciales de XMTP (ver GUIA_CREDENCIALES.md)"
echo ""
echo "📖 Ver GUIA_CREDENCIALES.md para instrucciones detalladas"

