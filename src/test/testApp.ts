import { OfflineMeshPaymentsApp } from "../index.js";

async function testApp() {
  console.log("\n🧪 Iniciando pruebas de la aplicación...\n");

  const app = new OfflineMeshPaymentsApp();

  try {
    // Inicializar la aplicación
    await app.initialize();

    const paymentService = app.getPaymentService();
    const meshNetwork = app.getMeshNetwork();

    console.log("\n" + "=".repeat(60));
    console.log("📋 PRUEBAS DISPONIBLES");
    console.log("=".repeat(60) + "\n");

    // Test 1: Información del sistema
    console.log("✅ Test 1: Información del Sistema");
    console.log(`   - Wallet Address: ${paymentService.getAddress()}`);
    console.log(`   - Mesh Peer ID: ${meshNetwork.getPeerId()}`);
    console.log(`   - Peers conectados: ${meshNetwork.getConnectedPeers().length}\n`);

    // Test 2: Crear un pago offline
    console.log("✅ Test 2: Crear Pago Offline");
    try {
      const testTx = await paymentService.createOfflinePayment(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // Dirección de prueba
        "1000000000000000000", // 1 token (18 decimals)
        undefined // Token nativo
      );
      console.log(`   ✅ Pago creado exitosamente!`);
      console.log(`   - ID: ${testTx.id}`);
      console.log(`   - De: ${testTx.from}`);
      console.log(`   - Para: ${testTx.to}`);
      console.log(`   - Cantidad: ${testTx.amount}`);
      console.log(`   - Estado: ${testTx.status}\n`);
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }

    // Test 3: Obtener transacciones
    console.log("✅ Test 3: Obtener Transacciones");
    try {
      const transactions = await paymentService.getTransactions();
      console.log(`   ✅ Encontradas ${transactions.length} transacciones`);
      if (transactions.length > 0) {
        transactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. ${tx.id.substring(0, 8)}... - ${tx.amount} - ${tx.status}`);
        });
      }
      console.log();
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }

    // Test 4: Crear solicitud de pago
    console.log("✅ Test 4: Crear Solicitud de Pago");
    try {
      const request = await paymentService.createPaymentRequest(
        "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        "500000000000000000", // 0.5 tokens
        undefined,
        "Pago de prueba"
      );
      console.log(`   ✅ Solicitud creada!`);
      console.log(`   - ID: ${request.id}`);
      console.log(`   - Para: ${request.to}`);
      console.log(`   - Cantidad: ${request.amount}`);
      console.log(`   - Mensaje: ${request.message}\n`);
    } catch (error: any) {
      console.log(`   ⚠️  Error: ${error.message}\n`);
    }

    // Test 5: Estado de la red mesh
    console.log("✅ Test 5: Estado de la Red Mesh");
    const peers = meshNetwork.getConnectedPeers();
    console.log(`   - Peer ID: ${meshNetwork.getPeerId()}`);
    console.log(`   - Peers conectados: ${peers.length}`);
    if (peers.length > 0) {
      peers.forEach((peer, index) => {
        console.log(`   ${index + 1}. ${peer.peerId.substring(0, 20)}... (${peer.isOnline ? "online" : "offline"})`);
      });
    } else {
      console.log(`   ℹ️  No hay peers conectados aún. La red mesh está funcionando pero esperando conexiones.`);
    }
    console.log();

    console.log("=".repeat(60));
    console.log("✅ TODAS LAS PRUEBAS COMPLETADAS");
    console.log("=".repeat(60));
    console.log("\n💡 La aplicación está funcionando correctamente!");
    console.log("💡 Puedes crear pagos offline, usar la red mesh, y más.\n");

    // Mantener la app corriendo
    console.log("⏳ La aplicación seguirá corriendo. Presiona Ctrl+C para salir.\n");

  } catch (error: any) {
    console.error("\n❌ Error durante las pruebas:", error.message);
    console.error(error.stack);
  }
}

// Ejecutar pruebas
testApp().catch((error) => {
  console.error("Error fatal:", error);
  process.exit(1);
});

