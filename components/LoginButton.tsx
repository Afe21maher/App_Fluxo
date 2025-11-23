'use client'

import { usePrivy } from '@privy-io/react-auth'

export default function LoginButton() {
  const { login } = usePrivy()

  return (
    <button
      onClick={login}
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors duration-200"
    >
      Iniciar Sesión
    </button>
  )
}

