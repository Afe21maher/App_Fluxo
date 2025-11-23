'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FluxoPagos from '@/components/fluxo/FluxoPagos'

// Hacer la página dinámica para evitar errores de prerender
export const dynamic = 'force-dynamic'

export default function FluxoPagosPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/fluxo')
    }
  }, [ready, authenticated, router])

  if (!ready) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem'
      }}>
        Cargando...
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  return <FluxoPagos />
}

