/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@privy-io/react-auth'],
  // Configuración para evitar problemas con archivos estáticos
  generateEtags: false,
  poweredByHeader: false,
  // Excluir archivos de Hardhat del build
  webpack: (config, { isServer }) => {
    // Ignorar imports de hardhat y archivos de configuración
    config.resolve.alias = {
      ...config.resolve.alias,
      'hardhat/config': false,
      'hardhat': false,
      '@nomicfoundation/hardhat-toolbox': false,
    }
    
    // Ignorar archivos de Hardhat durante el build usando un loader vacío
    config.module.rules.push({
      test: /(hardhat\.config|scripts\/.*\.ts)$/,
      use: 'empty-loader',
    })
    
    return config
  },
}

module.exports = nextConfig

