/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@privy-io/react-auth'],
  // Configuración para evitar problemas con archivos estáticos
  generateEtags: false,
  poweredByHeader: false,
}

module.exports = nextConfig

