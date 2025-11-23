require("@nomicfoundation/hardhat-toolbox");
// Cargar variables de entorno desde .env.local primero, luego .env
require("dotenv").config({ path: ".env.local" });
require("dotenv").config(); // Fallback a .env si .env.local no existe

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 296,
      // Hedera requiere un gasPrice mínimo de 680 gwei (680000000000 wei)
      // Usamos 1 gwei (1000000000) que es el estándar, pero Hedera lo ajusta automáticamente
      // Si falla, podemos usar: gasPrice: 680000000000
    },
    hederaPreviewnet: {
      url: "https://previewnet.hashio.io/api",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 297,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

