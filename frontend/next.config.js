/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configurações para desenvolvimento
  distDir: '.next',
  images: {
    // Para desenvolvimento local, não precisamos otimização
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // Configuração de diretório de páginas
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // A telemetria é desabilitada via variável de ambiente no Dockerfile
  // Variáveis de ambiente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  },
  // Redirecionamentos
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/admin/dashboard',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
