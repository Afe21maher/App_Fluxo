require("dotenv").config({ path: ".env.local" });

console.log("🔍 Verificando configuración...\n");

// Verificar PRIVATE_KEY
if (process.env.PRIVATE_KEY) {
  console.log("✅ PRIVATE_KEY encontrada");
  console.log("   Longitud:", process.env.PRIVATE_KEY.length, "caracteres");
  console.log("   Formato:", process.env.PRIVATE_KEY.startsWith("0x") ? "Correcto (0x...)" : "⚠️  Debería empezar con 0x");
} else {
  console.log("❌ PRIVATE_KEY NO encontrada");
  console.log("\n💡 Para configurar:");
  console.log("1. Crea .env.local en la raíz del proyecto");
  console.log("2. Agrega: PRIVATE_KEY=0xTU_PRIVATE_KEY_AQUI");
}

// Verificar otras variables
console.log("\n📋 Otras variables:");
console.log("   NEXT_PUBLIC_PRIVY_APP_ID:", process.env.NEXT_PUBLIC_PRIVY_APP_ID ? "✅ Configurada" : "❌ No configurada");
console.log("   NEXT_PUBLIC_HEDERA_NETWORK:", process.env.NEXT_PUBLIC_HEDERA_NETWORK || "testnet (default)");

console.log("\n💡 Para obtener una PRIVATE_KEY:");
console.log("   Visita: https://portal.hedera.com/");
console.log("   Crea una cuenta en Testnet y copia tu Private Key");

