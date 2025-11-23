'use client'

import styles from './FluxoLanding.module.css'

export default function FluxoDemo() {
  return (
    <div>
      {/* Navbar */}
      <nav className={styles.navbar} id="navbar">
        <div className={styles.navContainer}>
          <a href="/fluxo" className={styles.logoNav}>
            <div className={styles.logoIcon}>
              <img src="/Fluxo/imagenes/IconLogoRe.jpeg" alt="Logo" />
            </div>
            <span className={styles.logoText}>Fluxo</span>
          </a>
          <ul className={styles.navLinks} id="navLinks">
            <li><a href="/fluxo#inicio">Inicio</a></li>
            <li><a href="/fluxo#caracteristicas">Características</a></li>
            <li><a href="/fluxo#como-funciona">Cómo Funciona</a></li>
            <a href="/fluxo" className={styles.navCta}>Comienza Aquí</a>
          </ul>
          <button className={styles.menuToggle} id="menuToggle">☰</button>
        </div>
      </nav>

      {/* Hero Section adaptada para Demo */}
      <section className={styles.hero}>
        <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>
        <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>
        <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>
        <div className={styles.bgCircle}><span className={styles.bgMoney}>$</span></div>

        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>Demo de Fluxo</h1>
            <p className={styles.heroSubtitle}>Aquí puedes ver cómo funciona Fluxo.</p>
          </div>
          <div className={styles.loginCard}>
            <div className={styles.loginHeader}>
              <h2 className={styles.loginTitle}>Haz click para reproducir</h2>
              <p className={styles.loginSubtitle}>Los limites estan en tu mente!</p>
            </div>
            <div style={{
              position: 'relative',
              paddingBottom: '56.25%',
              height: 0,
              overflow: 'hidden',
              borderRadius: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              marginBottom: '1rem'
            }}>
              <iframe
                src="https://www.youtube.com/embed/ysz5S6PUM-U"
                title="Demo Fluxo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '20px'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLinks}>
            <a href="/fluxo">Inicio</a>
            <a href="/fluxo#caracteristicas">Características</a>
            <a href="/fluxo#como-funciona">Cómo Funciona</a>
            <a href="/fluxo#contacto">Contacto</a>
          </div>
          <p>&copy; 2023 Fluxo. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

