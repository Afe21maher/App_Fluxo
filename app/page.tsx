'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Hacer la página dinámica para evitar errores de prerender
export const dynamic = 'force-dynamic'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir siempre a /fluxo
    router.push('/fluxo')
  }, [router])

  // Mientras redirige, mostrar loading
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-xl">Redirigiendo a Fluxo...</div>
    </main>
  )
}

