'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import LoginButton from '@/components/LoginButton'
import SessionSignerDemo from '@/components/SessionSignerDemo'

export default function Home() {
  const { ready, authenticated, user } = usePrivy()
  const { wallets } = useWallets()

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
            Privy Session Signer App
          </h1>
          <p className="text-center mb-8 text-lg">
            Inicia sesión para comenzar a usar session signers
          </p>
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">
          ¡Bienvenido!
        </h1>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-semibold mb-4">Información del Usuario</h2>
          <div className="space-y-2">
            <p><strong>ID:</strong> {user?.id}</p>
            <p><strong>Email:</strong> {user?.email?.address || 'N/A'}</p>
            <p><strong>Wallets:</strong> {wallets.length}</p>
            {wallets.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold">Direcciones de Wallet:</p>
                <ul className="list-disc list-inside mt-2">
                  {wallets.map((wallet, index) => (
                    <li key={index} className="text-sm break-all">
                      {wallet.address}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        <SessionSignerDemo />
      </div>
    </main>
  )
}

