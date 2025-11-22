'use client'

import { PrivyProvider } from '@privy-io/react-auth'

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  if (!privyAppId) {
    throw new Error('NEXT_PUBLIC_PRIVY_APP_ID is not set in environment variables')
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

