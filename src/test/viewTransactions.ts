import { OfflineMeshPaymentsApp } from "../index.js";

async function viewTransactions() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 VER TRANSACCIONES");
  console.log("=".repeat(60) + "\n");

  const app = new OfflineMeshPaymentsApp();

  try {
    // Inicializar la aplicación
    console.log("⏳ Inicializando aplicación...\n");
    await app.initialize();

    const paymentService = app.getPaymentService();
    const walletAddress = paymentService.getAddress();

    console.log(`📍 Tu wallet: ${walletAddress}\n`);

    // Obtener todas las transacciones
    const transactions = await paymentService.getTransactions();

    if (transactions.length === 0) {
      console.log("📭 No hay transacciones aún.\n");
      console.log("💡 Usa 'npm run send-payment' para crear un pago.\n");
      await app.shutdown();
      return;
    }

    console.log(`✅ Encontradas ${transactions.length} transacción(es):\n`);

    transactions.forEach((tx, index) => {
      const amountInTokens = (Number(tx.amount) / 1e18).toFixed(6);
      const date = new Date(Number(tx.timestamp) * 1000).toLocaleString();

      console.log("=".repeat(60));
      console.log(`📄 Transacción #${index + 1}`);
      console.log("=".repeat(60));
      console.log(`ID:        ${tx.id}`);
      console.log(`De:        ${tx.from}`);
      console.log(`Para:      ${tx.to}`);
      console.log(`Cantidad:  ${tx.amount} wei (${amountInTokens} tokens)`);
      console.log(`Estado:    ${tx.status}`);
      console.log(`Fecha:     ${date}`);
      if (tx.message) {
        console.log(`Mensaje:   ${tx.message}`);
      }
      console.log();
    });

    console.log("=".repeat(60) + "\n");

    // Estadísticas
    const pending = transactions.filter((tx) => tx.status === "pending").length;
    const synced = transactions.filter((tx) => tx.status === "synced").length;
    const failed = transactions.filter((tx) => tx.status === "failed").length;

    console.log("📈 ESTADÍSTICAS:");
    console.log(`   - Pendientes: ${pending}`);
    console.log(`   - Sincronizadas: ${synced}`);
    console.log(`   - Fallidas: ${failed}`);
    console.log();

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
viewTransactions().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});

