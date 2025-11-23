import { OfflineMeshPaymentsApp } from "../index.js";
import readline from "readline";
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}
async function sendPayment() {
    console.log("\n" + "=".repeat(60));
    console.log("💸 ENVIAR PAGO OFFLINE");
    console.log("=".repeat(60) + "\n");
    const app = new OfflineMeshPaymentsApp();
    try {
        // Inicializar la aplicación
        console.log("⏳ Inicializando aplicación...\n");
        await app.initialize();
        const paymentService = app.getPaymentService();
        const walletAddress = paymentService.getAddress();
        console.log("✅ Aplicación inicializada!");
        console.log(`📍 Tu wallet: ${walletAddress}\n`);
        // Solicitar datos del pago
        const recipientAddress = await question("👤 Dirección de la wallet destino (0x...): ");
        if (!recipientAddress.startsWith("0x") || recipientAddress.length !== 42) {
            console.error("❌ Dirección inválida. Debe empezar con 0x y tener 42 caracteres.");
            process.exit(1);
        }
        const amountInput = await question("💰 Cantidad a enviar (en tokens, ej: 1.5 para 1.5 tokens): ");
        // Convertir a wei (18 decimals)
        const amountInTokens = parseFloat(amountInput);
        if (isNaN(amountInTokens) || amountInTokens <= 0) {
            console.error("❌ Cantidad inválida.");
            process.exit(1);
        }
        const amountInWei = BigInt(Math.floor(amountInTokens * 1e18)).toString();
        const message = await question("💬 Mensaje (opcional, presiona Enter para omitir): ");
        console.log("\n" + "=".repeat(60));
        console.log("📋 RESUMEN DEL PAGO");
        console.log("=".repeat(60));
        console.log(`De:     ${walletAddress}`);
        console.log(`Para:   ${recipientAddress}`);
        console.log(`Cantidad: ${amountInput} tokens (${amountInWei} wei)`);
        if (message) {
            console.log(`Mensaje: ${message}`);
        }
        console.log("=".repeat(60) + "\n");
        const confirm = await question("¿Confirmar envío? (s/n): ");
        if (confirm.toLowerCase() !== "s" && confirm.toLowerCase() !== "y") {
            console.log("\n❌ Pago cancelado.");
            await app.shutdown();
            process.exit(0);
        }
        // Crear el pago
        console.log("\n⏳ Creando pago offline...\n");
        const tx = await paymentService.createOfflinePayment(recipientAddress, amountInWei, undefined, // Token nativo
        message || undefined);
        console.log("✅ ¡Pago creado exitosamente!\n");
        console.log("=".repeat(60));
        console.log("📄 DETALLES DE LA TRANSACCIÓN");
        console.log("=".repeat(60));
        console.log(`ID:        ${tx.id}`);
        console.log(`De:        ${tx.from}`);
        console.log(`Para:      ${tx.to}`);
        console.log(`Cantidad:  ${tx.amount} wei (${amountInput} tokens)`);
        console.log(`Estado:    ${tx.status}`);
        console.log(`Timestamp: ${new Date(Number(tx.timestamp) * 1000).toLocaleString()}`);
        if (tx.message) {
            console.log(`Mensaje:   ${tx.message}`);
        }
        console.log("=".repeat(60) + "\n");
        // Mostrar todas las transacciones
        const allTransactions = await paymentService.getTransactions();
        console.log(`📊 Total de transacciones: ${allTransactions.length}\n`);
        console.log("💡 El pago está almacenado offline y se sincronizará cuando haya conexión.");
        console.log("💡 La transacción se propagará por la red mesh a otros peers.\n");
        // Mantener la app corriendo
        console.log("⏳ La aplicación seguirá corriendo. Presiona Ctrl+C para salir.\n");
    }
    catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}
// Ejecutar
sendPayment().catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
});
//# sourceMappingURL=sendPayment.js.map