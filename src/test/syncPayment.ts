import { OfflineMeshPaymentsApp } from "../index.js";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function syncPayment() {
  console.log("\n" + "=".repeat(60));
  console.log("🔄 SINCRONIZAR PAGOS OFFLINE");
  console.log("=".repeat(60) + "\n");

  const app = new OfflineMeshPaymentsApp();

  try {
    // Inicializar la aplicación
    console.log("⏳ Inicializando aplicación...\n");
    await app.initialize();

    const paymentService = app.getPaymentService();
    const syncManager = app.getSyncManager();

    if (!syncManager) {
      console.log("❌ ERROR: Sync Manager no está disponible.");
      console.log("💡 Necesitas configurar las credenciales de Hedera en el archivo .env");
      console.log("   - HEDERA_ACCOUNT_ID");
      console.log("   - HEDERA_PRIVATE_KEY");
      console.log("   - HEDERA_NETWORK=testnet\n");
      await app.shutdown();
      process.exit(1);
    }

    // Obtener transacciones pendientes
    const transactions = await paymentService.getTransactions();
    const pendingTxs = transactions.filter((tx) => tx.status === "pending");

    if (pendingTxs.length === 0) {
      console.log("✅ No hay transacciones pendientes para sincronizar.\n");
      await app.shutdown();
      return;
    }

    console.log(`📋 Encontradas ${pendingTxs.length} transacción(es) pendiente(s):\n`);

    pendingTxs.forEach((tx, index) => {
      const amountInTokens = (Number(tx.amount) / 1e18).toFixed(6);
      console.log(`${index + 1}. ID: ${tx.id.substring(0, 8)}...`);
      console.log(`   De: ${tx.from} → Para: ${tx.to}`);
      console.log(`   Cantidad: ${amountInTokens} tokens`);
      console.log();
    });

    const confirm = await question("¿Sincronizar estas transacciones ahora? (s/n): ");

    if (confirm.toLowerCase() !== "s" && confirm.toLowerCase() !== "y") {
      console.log("\n❌ Sincronización cancelada.");
      await app.shutdown();
      process.exit(0);
    }

    console.log("\n⏳ Sincronizando transacciones...\n");

    // Sincronizar cada transacción
    let successCount = 0;
    let failCount = 0;

    for (const tx of pendingTxs) {
      try {
        console.log(`🔄 Sincronizando ${tx.id.substring(0, 8)}...`);
        const success = await syncManager.syncTransaction(tx.id);
        
        if (success) {
          console.log(`   ✅ Sincronizada exitosamente!`);
          successCount++;
        } else {
          console.log(`   ❌ Falló la sincronización`);
          failCount++;
        }
      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        failCount++;
      }
      console.log();
    }

    console.log("=".repeat(60));
    console.log("📊 RESULTADO DE LA SINCRONIZACIÓN");
    console.log("=".repeat(60));
    console.log(`✅ Exitosas: ${successCount}`);
    console.log(`❌ Fallidas: ${failCount}`);
    console.log(`📋 Total: ${pendingTxs.length}`);
    console.log("=".repeat(60) + "\n");

    if (successCount > 0) {
      console.log("💡 Las transacciones exitosas han sido enviadas a la blockchain.");
      console.log("💡 Los tokens deberían aparecer en las wallets de destino.\n");
    }

    // Mantener la app corriendo
    console.log("⏳ La aplicación seguirá corriendo. Presiona Ctrl+C para salir.\n");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar
syncPayment().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});

