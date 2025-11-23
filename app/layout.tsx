import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PrivyProviderWrapper from '@/components/PrivyProviderWrapper'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fluxo - Privy Session Signer App',
  description: 'App with Privy authentication and session signers',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <PrivyProviderWrapper>
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  )
}

