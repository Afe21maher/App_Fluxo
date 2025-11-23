'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { useEffect, useState } from 'react'

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const [privyAppId, setPrivyAppId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID
    if (!appId) {
      console.warn('⚠️ NEXT_PUBLIC_PRIVY_APP_ID is not set in environment variables. Privy features will not work.')
    }
    setPrivyAppId(appId || null)
  }, [])

  // Durante el build o SSR, renderizar sin PrivyProvider
  // Esto permite que el build se complete sin errores
  if (!mounted || !privyAppId) {
    return <>{children}</>
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['email', 'wallet', 'sms'],
        appearance: {
          theme: 'light',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}

