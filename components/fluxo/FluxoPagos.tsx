'use client'

import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import styles from './FluxoPagos.module.css'

export default function FluxoPagos() {
  const { user, logout, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/fluxo')
  }

  const formatAddress = (address: string) => {
    if (!address) return 'N/A'
    if (address.length <= 10) return address
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <div className={styles.container}>
      {/* Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.navContainer}>
          <a href="/fluxo" className={styles.logoNav}>
            <div className={styles.logoIcon}>
              <img src="/Fluxo/imagenes/IconLogoRe.jpeg" alt="Logo" />
            </div>
            <span className={styles.logoText}>Fluxo</span>
          </a>
          <ul className={styles.navLinks}>
            <li><a href="/fluxo#inicio">Inicio</a></li>
            <li><a href="/fluxo/pagos">Pagos</a></li>
            <li>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Salir
              </button>
            </li>
            <a href="/fluxo" className={styles.navCta}>Comienza Aquí</a>
          </ul>
        </div>
      </nav>

      {/* Sección de Pagos */}
      <main className={styles.pagosMain}>
        <div className={styles.pagosSidebar}>
          <button className={styles.pagosBtn} title="Comprar">
            <img src="/Fluxo/imagenes/cart.png" alt="Comprar" />
          </button>
          <button className={styles.pagosBtn} title="Enviar">
            <img src="/Fluxo/imagenes/direct.png" alt="Enviar" />
          </button>
          <button className={styles.pagosBtn} title="Recibir">
            <img src="/Fluxo/imagenes/received.png" alt="Recibir" />
          </button>
          <button className={styles.pagosBtn} title="Más opciones">⋯</button>
        </div>
        <div className={styles.pagosContent}>
          <div className={styles.pagosRow}>
            <div className={styles.walletsBox}>
              <div className={styles.walletsTitle}>Wallets</div>
              <div className={styles.walletList}>
                {wallets.length > 0 ? (
                  <div className={styles.walletItem}>
                    <div className={styles.walletIcon}>🔐</div>
                    <div>
                      <div className={styles.walletName}>Privy Wallet</div>
                      <div className={styles.walletAddress}>
                        {formatAddress(wallets[0].address)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.walletItem}>
                    <div className={styles.walletIcon}>🔐</div>
                    <div>
                      <div className={styles.walletName}>Conectando...</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.saldoBox}>
              <div className={styles.saldoTitle}>Saldo de la cuenta</div>
              <div className={styles.saldoAmount} id="saldo-amount">$0.00</div>
              <div className={styles.saldoCurrency}>HBAR (Hedera)</div>
              <div className={styles.saldoActions}>
                <button className={styles.saldoActionBtn} onClick={() => alert('Función de sincronización próximamente')}>
                  Sincronizar
                </button>
              </div>
            </div>
          </div>
          <div className={styles.networkBox}>
            <div className={styles.networkTitle}>Red utilizada</div>
            <div className={styles.networkStatus}>
              <span className={styles.networkDot}></span>
              <span>Mesh Network</span>
            </div>
          </div>
          <div className={styles.historialBox}>
            <div className={styles.historialTitle}>Historial de transacciones</div>
            <div className={styles.historialList}>
              <div style={{ color: '#888', padding: '1rem', textAlign: 'center' }}>
                No hay transacciones aún
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <a href="/fluxo">Inicio</a> |
            <a href="/fluxo#caracteristicas">Características</a> |
            <a href="/fluxo#como-funciona">Cómo Funciona</a> |
            <a href="/fluxo#contacto">Contacto</a>
          </div>
          <p>&copy; 2023 Fluxo. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
