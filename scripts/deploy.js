const hre = require("hardhat");
require("dotenv").config({ path: ".env.local" });

async function main() {
  console.log("🚀 Desplegando contratos en Hedera...");

  // Verificar que existe PRIVATE_KEY
  if (!process.env.PRIVATE_KEY) {
    console.error("❌ ERROR: PRIVATE_KEY no está configurada en .env.local");
    console.log("\n💡 Para configurar:");
    console.log("1. Crea un archivo .env.local en la raíz del proyecto");
    console.log("2. Agrega: PRIVATE_KEY=0xTU_PRIVATE_KEY_AQUI");
    console.log("3. Obtén una private key de: https://portal.hedera.com/");
    process.exit(1);
  }

  // Obtener el signer (wallet con private key)
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    console.error("❌ ERROR: No se encontró ningún signer");
    console.log("💡 Verifica que PRIVATE_KEY esté correctamente configurada en .env.local");
    process.exit(1);
  }

  const deployer = signers[0];
  console.log("📝 Desplegando con la cuenta:", deployer.address);
  
  // Verificar balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Balance de la cuenta:", hre.ethers.formatEther(balance), "HBAR");

  if (balance === 0n) {
    console.log("⚠️  ADVERTENCIA: La cuenta no tiene HBAR. Necesitas obtener HBAR del faucet:");
    console.log("   https://portal.hedera.com/");
  }

  // Obtener el gasPrice recomendado de Hedera (mínimo 680 gwei)
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || hre.ethers.parseUnits("680", "gwei");
  console.log("⛽ Gas Price:", hre.ethers.formatUnits(gasPrice, "gwei"), "gwei");

  // Desplegar OracleMock primero
  console.log("\n1. Desplegando OracleMock...");
  const OracleMock = await hre.ethers.getContractFactory("OracleMock", deployer);
  const oracleMock = await OracleMock.deploy({ gasPrice });
  await oracleMock.waitForDeployment();
  const oracleAddress = await oracleMock.getAddress();
  console.log("✅ OracleMock desplegado en:", oracleAddress);

  // Desplegar FluxoPayment
  console.log("\n2. Desplegando FluxoPayment...");
  const FluxoPayment = await hre.ethers.getContractFactory("FluxoPayment", deployer);
  const fluxoPayment = await FluxoPayment.deploy(oracleAddress, { gasPrice });
  await fluxoPayment.waitForDeployment();
  const fluxoPaymentAddress = await fluxoPayment.getAddress();
  console.log("✅ FluxoPayment desplegado en:", fluxoPaymentAddress);

  // Desplegar FisherRewards
  console.log("\n3. Desplegando FisherRewards...");
  const FisherRewards = await hre.ethers.getContractFactory("FisherRewards", deployer);
  const fisherRewards = await FisherRewards.deploy({ gasPrice });
  await fisherRewards.waitForDeployment();
  const fisherRewardsAddress = await fisherRewards.getAddress();
  console.log("✅ FisherRewards desplegado en:", fisherRewardsAddress);

  // Configurar el contrato FluxoPayment en OracleMock
  console.log("\n4. Configurando OracleMock...");
  const setContractTx = await oracleMock.setFluxoPaymentContract(fluxoPaymentAddress, { gasPrice });
  await setContractTx.wait();
  console.log("✅ OracleMock configurado");

  // Actualizar precio inicial
  console.log("\n5. Actualizando precio inicial de HBAR...");
  const updatePriceTx = await oracleMock.updatePrice(5000000, { gasPrice }); // $0.05
  await updatePriceTx.wait();
  console.log("✅ Precio inicial configurado: $0.05 por HBAR");

  console.log("\n📋 Resumen del despliegue:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("OracleMock Address:", oracleAddress);
  console.log("FluxoPayment Address:", fluxoPaymentAddress);
  console.log("FisherRewards Address:", fisherRewardsAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n💡 Próximos pasos:");
  console.log("1. Verifica los contratos en Hashscan");
  console.log("2. Actualiza las direcciones en tu .env.local");
  console.log("3. Configura las variables de entorno en tu app");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

