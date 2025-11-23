'use client'

import { usePrivy, useHeadlessDelegatedActions } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth'
import { useState, useEffect } from 'react'
import { parseEther, formatEther } from 'viem'

export default function SessionSignerDemo() {
  const { user, logout } = usePrivy()
  const { wallets } = useWallets()
  const { delegateWallet } = useHeadlessDelegatedActions()
  const [isActive, setIsActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [balance, setBalance] = useState<string>('')
  const [walletAddress, setWalletAddress] = useState<string>('')

  // Inicializar wallet address cuando hay wallets disponibles
  useEffect(() => {
    if (wallets.length > 0) {
      const wallet = wallets[0]
      setWalletAddress(wallet.address)
      if (!status) {
        setStatus('Listo para delegar wallet y crear session signer')
      }
    } else {
      setStatus('No hay wallets disponibles. Por favor, inicia sesión primero.')
    }
  }, [wallets])

  const checkDelegationStatus = () => {
    if (wallets.length === 0) {
      setStatus('No hay wallets disponibles')
      setIsActive(false)
      return
    }

    if (isActive) {
      setStatus('✅ Wallet delegado y session signer activo')
    } else {
      setStatus('Wallet no está delegado. Haz clic en "Delegar Wallet" para activar el session signer.')
    }
  }

  // Delegar wallet para crear session signer
  const handleDelegateWallet = async () => {
    if (wallets.length === 0) {
      setStatus('❌ No hay wallets disponibles. Por favor, crea un wallet primero.')
      return
    }

    setLoading(true)
    setStatus('Solicitando delegación del wallet...')
    
    try {
      const wallet = wallets[0]
      await delegateWallet({
        address: wallet.address,
        chainType: 'ethereum',
      })
      
      setIsActive(true)
      setWalletAddress(wallet.address)
      setStatus('✅ Wallet delegado exitosamente! Session signer activo y listo para usar.')
    } catch (error: any) {
      console.error('Error delegating wallet:', error)
      setStatus(`❌ Error: ${error.message || 'Error al delegar wallet'}`)
    } finally {
      setLoading(false)
    }
  }

  // Obtener balance usando session signer
  const handleGetBalance = async () => {
    if (!isActive || !walletAddress) {
      setStatus('Primero debes delegar tu wallet')
      return
    }

    setLoading(true)
    setStatus('Obteniendo balance...')
    try {
      // En una aplicación real, usarías un provider para obtener el balance
      // Esto es solo una demostración
      setStatus(`✅ Balance obtenido para dirección: ${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`)
      setBalance('0.0 ETH') // Placeholder - en producción usarías un RPC call
    } catch (error: any) {
      console.error('Error getting balance:', error)
      setStatus(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  // Ejemplo de acción delegada: preparar una transacción
  const handleDelegatedAction = async () => {
    if (!isActive || !walletAddress) {
      setStatus('Primero debes delegar tu wallet para usar el session signer')
      return
    }

    setLoading(true)
    setStatus('Ejecutando acción delegada con session signer...')
    try {
      // Ejemplo de acción que se puede ejecutar sin re-aprobación del usuario
      // Esto demuestra el poder del session signer
      // En producción, esto se ejecutaría desde el servidor usando la API de Privy
      
      // Simulación de una acción delegada
      // En producción, esto podría ser una transacción real, una firma, etc.
      const shortAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`
      
      // Ejemplo: preparar una transacción (sin enviarla)
      const transaction = {
        to: '0x0000000000000000000000000000000000000000' as `0x${string}`,
        value: parseEther('0.001'),
      }
      
      setStatus(`✅ Acción delegada ejecutada exitosamente para ${shortAddress}\n` +
                `Transacción preparada: ${formatEther(transaction.value)} ETH a ${transaction.to}\n` +
                `Esta acción se ejecutó sin requerir re-aprobación del usuario gracias al session signer.`)
    } catch (error: any) {
      console.error('Error executing delegated action:', error)
      setStatus(`❌ Error: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-semibold mb-4">Session Signer Demo</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={checkDelegationStatus}
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Verificar Estado
          </button>
          
          {!isActive && (
            <button
              onClick={handleDelegateWallet}
              disabled={loading || wallets.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
            >
              {loading ? 'Delegando...' : 'Delegar Wallet (Crear Session Signer)'}
            </button>
          )}
          
          {isActive && (
            <>
              <button
                onClick={handleGetBalance}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                Obtener Balance
              </button>
              
              <button
                onClick={handleDelegatedAction}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded transition-colors"
              >
                {loading ? 'Ejecutando...' : 'Ejecutar Acción Delegada'}
              </button>
            </>
          )}
          
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>

        {status && (
          <div className={`p-4 rounded ${
            status.includes('✅') 
              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
              : status.includes('❌')
              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
          }`}>
            <p className="font-semibold">Estado:</p>
            <p>{status}</p>
          </div>
        )}

        {isActive && (
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded border border-green-200 dark:border-green-800">
            <p className="font-semibold text-green-800 dark:text-green-200">
              ✓ Session Signer Activo
            </p>
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              El session signer está activo y listo para ejecutar acciones delegadas sin requerir re-aprobación del usuario.
            </p>
          </div>
        )}

        {balance && (
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded">
            <p><strong>Balance:</strong> {balance}</p>
          </div>
        )}
      </div>
    </div>
  )
}

