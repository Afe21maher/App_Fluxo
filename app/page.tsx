'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoginButton from '@/components/LoginButton'

// Hacer la página dinámica para evitar errores de prerender
export const dynamic = 'force-dynamic'

export default function Home() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/fluxo')
    }
  }, [ready, authenticated, router])

  if (!ready) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="text-xl">Cargando...</div>
      </main>
    )
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
          <h1 className="text-4xl font-bold mb-8 text-center">
            Fluxo - Privy Session Signer App
          </h1>
          <p className="text-center mb-8 text-lg">
            Inicia sesión para comenzar a usar Fluxo
          </p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      </main>
    )
  }

  // Mientras redirige, mostrar loading
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-xl">Redirigiendo...</div>
    </main>
  )
}

