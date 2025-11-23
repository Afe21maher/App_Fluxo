'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FluxoLanding from '@/components/fluxo/FluxoLanding'

// Hacer la página dinámica para evitar errores de prerender
export const dynamic = 'force-dynamic'

export default function FluxoPage() {
  const { ready, authenticated } = usePrivy()
  const router = useRouter()

  useEffect(() => {
    if (ready && authenticated) {
      router.push('/fluxo/pagos')
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

  return <FluxoLanding />
}

