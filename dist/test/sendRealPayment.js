import { ethers } from "ethers";
import { config } from "../config";
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
async function sendRealPayment() {
    console.log("\n" + "=".repeat(60));
    console.log("💸 ENVIAR PAGO REAL (Sepolia Testnet)");
    console.log("=".repeat(60) + "\n");
    try {
        // Verificar configuración
        if (!config.evvm.sepoliaRpcUrl || !config.evvm.sepoliaPrivateKey) {
            console.log("❌ ERROR: Sepolia no está configurado.");
            console.log("💡 Necesitas configurar en el archivo .env:");
            console.log("   - SEPOLIA_RPC_URL");
            console.log("   - SEPOLIA_PRIVATE_KEY\n");
            rl.close();
            process.exit(1);
        }
        // Limpiar private key
        let privateKey = config.evvm.sepoliaPrivateKey.trim();
        privateKey = privateKey.replace(/^0xOx/i, "0x");
        privateKey = privateKey.replace(/^Ox/i, "0x");
        if (!privateKey.startsWith("0x")) {
            privateKey = "0x" + privateKey;
        }
        // Conectar a Sepolia
        const provider = new ethers.JsonRpcProvider(config.evvm.sepoliaRpcUrl);
        const wallet = new ethers.Wallet(privateKey, provider);
        console.log(`📍 Tu wallet: ${wallet.address}\n`);
        // Verificar balance
        const balance = await provider.getBalance(wallet.address);
        const balanceInEth = ethers.formatEther(balance);
        console.log(`💰 Balance actual: ${balanceInEth} ETH\n`);
        if (balance === 0n) {
            console.log("⚠️  Tu wallet no tiene ETH. Necesitas obtener Sepolia ETH del faucet:");
            console.log("   https://sepoliafaucet.com/\n");
            rl.close();
            process.exit(1);
        }
        // Solicitar datos
        const recipientAddress = await question("👤 Dirección de la wallet destino (0x...): ");
        if (!ethers.isAddress(recipientAddress)) {
            console.error("❌ Dirección inválida.");
            rl.close();
            process.exit(1);
        }
        const amountInput = await question("💰 Cantidad a enviar (en ETH, ej: 0.01): ");
        const amountInEth = parseFloat(amountInput);
        if (isNaN(amountInEth) || amountInEth <= 0) {
            console.error("❌ Cantidad inválida.");
            rl.close();
            process.exit(1);
        }
        const amountInWei = ethers.parseEther(amountInput);
        if (amountInWei > balance) {
            console.error("❌ No tienes suficiente balance.");
            rl.close();
            process.exit(1);
        }
        console.log("\n" + "=".repeat(60));
        console.log("📋 RESUMEN DEL PAGO");
        console.log("=".repeat(60));
        console.log(`De:     ${wallet.address}`);
        console.log(`Para:   ${recipientAddress}`);
        console.log(`Cantidad: ${amountInput} ETH`);
        console.log(`Red:    Sepolia Testnet`);
        console.log("=".repeat(60) + "\n");
        const confirm = await question("¿Confirmar envío? (s/n): ");
        if (confirm.toLowerCase() !== "s" && confirm.toLowerCase() !== "y") {
            console.log("\n❌ Pago cancelado.");
            rl.close();
            process.exit(0);
        }
        // Enviar transacción
        console.log("\n⏳ Enviando transacción a Sepolia...\n");
        const tx = await wallet.sendTransaction({
            to: recipientAddress,
            value: amountInWei,
        });
        console.log(`📤 Transacción enviada!`);
        console.log(`🔗 Hash: ${tx.hash}`);
        console.log(`⏳ Esperando confirmación...\n`);
        const receipt = await tx.wait();
        if (!receipt) {
            console.error("❌ No se recibió el receipt de la transacción");
            rl.close();
            process.exit(1);
        }
        console.log("=".repeat(60));
        console.log("✅ PAGO COMPLETADO");
        console.log("=".repeat(60));
        console.log(`Hash:        ${receipt.hash}`);
        console.log(`Block:       ${receipt.blockNumber}`);
        console.log(`Gas usado:   ${receipt.gasUsed.toString()}`);
        console.log(`Estado:      ${receipt.status === 1 ? "Éxito" : "Fallido"}`);
        console.log("=".repeat(60) + "\n");
        console.log(`🔗 Ver en explorer: https://sepolia.etherscan.io/tx/${receipt.hash}\n`);
        // Verificar nuevo balance
        const newBalance = await provider.getBalance(wallet.address);
        const newBalanceInEth = ethers.formatEther(newBalance);
        console.log(`💰 Nuevo balance: ${newBalanceInEth} ETH\n`);
        rl.close();
    }
    catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.reason) {
            console.error(`   Razón: ${error.reason}`);
        }
        if (error.transaction) {
            console.error(`   Hash: ${error.transaction.hash}`);
        }
        rl.close();
        process.exit(1);
    }
}
// Ejecutar
sendRealPayment().catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
});
//# sourceMappingURL=sendRealPayment.js.map