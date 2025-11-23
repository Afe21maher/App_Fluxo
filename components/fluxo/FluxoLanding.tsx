'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useState } from 'react'
import styles from './FluxoLanding.module.css'

export default function FluxoLanding() {
  const { login } = usePrivy()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login()
      // La redirección se manejará automáticamente en el componente padre
    } catch (error) {
      console.error('Error en login:', error)
      alert('Error al iniciar sesión. Por favor, intenta de nuevo.')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    // Para registro, también usamos login de Privy
    // Privy maneja automáticamente el registro si el usuario no existe
    try {
      await login()
    } catch (error) {
      console.error('Error en registro:', error)
      alert('Error al crear cuenta. Por favor, intenta de nuevo.')
    }
  }

  return (
    <div>
        {/* Navbar */}
        <nav className={styles.navbar} id="navbar">
          <div className={styles.navContainer}>
            <a href="#" className={styles.logoNav}>
              <div className={styles.logoIcon}>
                <img src="/Fluxo/imagenes/IconLogoRe.jpeg" alt="Logo" />
              </div>
              <span className={styles.logoText}>Fluxo</span>
            </a>
            <ul className={styles.navLinks} id="navLinks">
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#caracteristicas">Características</a></li>
              <li><a href="#como-funciona">Cómo Funciona</a></li>
              <a href="#" className={styles.navCta}>Comienza Aquí</a>
            </ul>
            <button className={styles.menuToggle} id="menuToggle">☰</button>
          </div>
        </nav>

        {/* Hero Section */}
        <section id="inicio" className={styles.hero}>
          <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>
          <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>
          <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>
          <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>

          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <h1 className={styles.heroTitle}>Realiza Pagos Sin Conexión a Internet</h1>
              <p className={styles.heroSubtitle}>
                La solución más segura y confiable para procesar transacciones offline. 
                Acepta pagos en cualquier lugar, sin importar la conectividad.
              </p>
              
              <div className={styles.heroFeatures}>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>✓</div>
                  <span>100% Seguro y Encriptado</span>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>✓</div>
                  <span>Sin Necesidad de Internet</span>
                </div>
                <div className={styles.featureItem}>
                  <div className={styles.featureIcon}>✓</div>
                  <span>Sincronización Automática</span>
                </div>
              </div>

              <div className={styles.heroButtons}>
                <a href="#" className={styles.btnPrimary}>Comenzar</a>
                <a href="/fluxo/demo" className={styles.btnSecondary}>Ver Demo</a>
              </div>
            </div>

            {/* Login Card con Privy */}
            <div className={styles.loginCard}>
              <div className={styles.loginHeader}>
                <h2 className={styles.loginTitle}>Accede a tu Cuenta</h2>
                <p className={styles.loginSubtitle}>Gestiona tus pagos desde cualquier lugar</p>
              </div>

              <div className={styles.tabSelector}>
                <div 
                  className={`${styles.tabIndicator} ${activeTab === 'register' ? styles.register : ''}`}
                ></div>
                <button 
                  className={`${styles.tabButton} ${activeTab === 'login' ? styles.active : ''}`}
                  onClick={() => setActiveTab('login')}
                >
                  Iniciar Sesión
                </button>
                <button 
                  className={`${styles.tabButton} ${activeTab === 'register' ? styles.active : ''}`}
                  onClick={() => setActiveTab('register')}
                >
                  Registrarse
                </button>
              </div>

              <div className={styles.formContainer}>
                {/* Login Form */}
                <div className={`${styles.formView} ${activeTab === 'login' ? styles.active : ''}`}>
                  <form onSubmit={handleLogin}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Inicia sesión con Privy</label>
                      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        Haz clic en el botón para iniciar sesión con email, wallet o SMS
                      </p>
                    </div>

                    <button type="submit" className={styles.submitButton}>
                      Iniciar Sesión con Privy
                    </button>
                  </form>
                </div>

                {/* Register Form */}
                <div className={`${styles.formView} ${activeTab === 'register' ? styles.active : ''}`}>
                  <form onSubmit={handleRegister}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Crea tu cuenta con Privy</label>
                      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                        Privy creará automáticamente tu wallet embebido al registrarte
                      </p>
                    </div>

                    <button type="submit" className={styles.submitButton}>
                      Crear Cuenta con Privy
                    </button>

                    <div className={styles.loginFooter}>
                      Al registrarte aceptas nuestros <a href="#">Términos</a> y <a href="#">Privacidad</a>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="caracteristicas" className={styles.featuresSection}>
          <div className={styles.container}>
            <h2 className={styles.sectionTitle}>¿Por qué Fluxo?</h2>
            <p className={styles.sectionSubtitle}>Fluxo rompe las limitantes de conexión!</p>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureCardIcon}>
                  <img src="/Fluxo/imagenes/no-wifi.png" alt="Pagos Offline" />
                </div>
                <h3>Pagos Offline</h3>
                <p>
                  Procesa pagos sin necesidad de conexión a internet. Ideal para zonas con poca 
                  disponibilidad de red o eventos masivos.
                </p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureCardIcon}>
                  <img src="/Fluxo/imagenes/secure-shield.png" alt="Seguridad y confianza" />
                </div>
                <h3>Seguridad y confianza</h3>
                <p>Todas las transacciones están encriptadas.</p>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureCardIcon}>
                  <img src="/Fluxo/imagenes/money.png" alt="Transacciones rápidas" />
                </div>
                <h3>Transacciones rápidas</h3>
                <p>Transacciones lanzadas por medio de dispositivos compatibles.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo Funciona Section */}
        <section id="como-funciona" style={{ background: 'linear-gradient(135deg, #ff6b35, #f7931e)', padding: '5rem 2rem' }}>
          <div className={styles.container} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2 className={styles.sectionTitle} style={{ color: 'white' }}>¿Cómo funciona?</h2>
            <p className={styles.sectionSubtitle} style={{ color: '#fff', opacity: 0.9 }}>
              Así es el proceso de pago offline y sincronización en Fluxo
            </p>
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: '3rem' }}>
              <div className={styles.funcionaCard}>
                <img src="/Fluxo/imagenes/Mesh.png" alt="Mesh Network" className={styles.funcionaImg} />
                <h3 style={{ color: '#ff6b35', fontSize: '1.3rem', marginBottom: '0.7rem' }}>Red Mesh Local</h3>
                <p style={{ color: '#333', textAlign: 'center' }}>
                  Los dispositivos se conectan entre sí formando una red mesh, permitiendo la 
                  comunicación y validación de pagos sin internet.
                </p>
              </div>
              <div className={styles.funcionaCard}>
                <img src="/Fluxo/imagenes/way.png" alt="Camino de Pago" className={styles.funcionaImg} />
                <h3 style={{ color: '#ff6b35', fontSize: '1.3rem', marginBottom: '0.7rem' }}>Ruta de Transacción</h3>
                <p style={{ color: '#333', textAlign: 'center' }}>
                  El pago viaja entre los puntos de la red mesh hasta llegar al receptor, 
                  asegurando la entrega y registro de la transacción.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            <div className={styles.footerLinks}>
              <a href="#">Inicio</a>
              <a href="#">Características</a>
              <a href="#">Cómo Funciona</a>
              <a href="#">Contacto</a>
            </div>
            <p>&copy; 2023 Fluxo. Todos los derechos reservados.</p>
          </div>
        </footer>
    </div>
  )
}

