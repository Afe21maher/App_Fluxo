/**
 * Fluxo API Client - Integración con Backend
 * Maneja Privy, EVVM, Hedera y pagos offline
 */

// Estado global de la aplicación
window.FluxoApp = {
  apiBase: '/api',
  privyInitialized: false,
  user: null,
  wallet: null,
  transactions: [],
  status: null,
};

/**
 * Inicializar Privy
 */
async function initPrivy() {
  if (window.FluxoApp.privyInitialized) {
    return window.PrivyInit.getState();
  }

  try {
    // Cargar módulo Privy si no está cargado
    if (!window.PrivyInit) {
      const script = document.createElement('script');
      script.src = '/privy-init.js';
      document.head.appendChild(script);
      await new Promise((resolve) => {
        script.onload = resolve;
        setTimeout(resolve, 2000); // Timeout de seguridad
      });
    }

    // Inicializar Privy
    await window.PrivyInit.initialize();
    window.FluxoApp.privyInitialized = true;

    // Obtener usuario si ya está logueado
    const state = window.PrivyInit.getState();
    if (state.user && state.user.wallet) {
      window.FluxoApp.user = state.user;
      window.FluxoApp.wallet = {
        address: state.user.wallet.address,
        provider: state.user.wallet,
      };
    }

    return state;
  } catch (error) {
    console.error('Error inicializando Privy:', error);
    throw error;
  }
}

/**
 * Login con Privy
 */
async function loginPrivy(method = 'email') {
  try {
    await initPrivy();
    const user = await window.PrivyInit.login(method);
    
    window.FluxoApp.user = user;
    if (user.wallet) {
      window.FluxoApp.wallet = {
        address: user.wallet.address,
        provider: user.wallet,
      };
    }

    // Configurar signer
    await window.PrivyInit.setupSigner();

    return user;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

/**
 * Logout
 */
async function logoutPrivy() {
  try {
    if (window.PrivyState && window.PrivyState.app) {
      await window.PrivyState.app.logout();
    }
    window.FluxoApp.user = null;
    window.FluxoApp.wallet = null;
    window.FluxoApp.privyInitialized = false;
  } catch (error) {
    console.error('Error en logout:', error);
  }
}

/**
 * Obtener estado del backend
 */
async function getStatus() {
  try {
    const response = await fetch(`${window.FluxoApp.apiBase}/status`);
    const data = await response.json();
    window.FluxoApp.status = data;
    return data;
  } catch (error) {
    console.error('Error obteniendo status:', error);
    return null;
  }
}

/**
 * Obtener transacciones
 */
async function getTransactions() {
  try {
    const response = await fetch(`${window.FluxoApp.apiBase}/transactions`);
    const data = await response.json();
    window.FluxoApp.transactions = data.transactions || [];
    return window.FluxoApp.transactions;
  } catch (error) {
    console.error('Error obteniendo transacciones:', error);
    return [];
  }
}

/**
 * Crear pago offline con Privy
 */
async function createPayment(to, amount, message = '') {
  try {
    if (!window.FluxoApp.wallet) {
      throw new Error('No hay wallet conectada');
    }

    const state = window.PrivyInit.getState();
    if (!state.signer) {
      await window.PrivyInit.setupSigner();
    }

    // Crear mensaje para firmar
    const timestamp = Date.now();
    const signMessage = `Fluxo Payment\nTo: ${to}\nAmount: ${amount}\nTimestamp: ${timestamp}\nMessage: ${message || 'No message'}`;

    // Firmar con Privy
    const signature = await state.signer.signMessage(signMessage);

    // Enviar al backend
    const response = await fetch(`${window.FluxoApp.apiBase}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: window.FluxoApp.wallet.address,
        to: to,
        amount: amount,
        message: message,
        signature: signature,
        timestamp: timestamp,
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Error creando pago');
    }

    // Actualizar transacciones
    await getTransactions();

    return data.transaction;
  } catch (error) {
    console.error('Error creando pago:', error);
    throw error;
  }
}

/**
 * Sincronizar con Hedera
 */
async function syncHedera() {
  try {
    const response = await fetch(`${window.FluxoApp.apiBase}/sync`, {
      method: 'POST',
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sincronizando con Hedera:', error);
    throw error;
  }
}

/**
 * Obtener balance de Hedera
 */
async function getHederaBalance() {
  try {
    const status = await getStatus();
    return status?.hedera?.balance || '0';
  } catch (error) {
    console.error('Error obteniendo balance:', error);
    return '0';
  }
}

/**
 * Formatear dirección (mostrar solo primeros y últimos caracteres)
 */
function formatAddress(address) {
  if (!address) return 'N/A';
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Formatear fecha
 */
function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Hace un momento';
  if (minutes < 60) return `Hace ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
  return date.toLocaleDateString('es-ES');
}

/**
 * Actualizar UI con estado del usuario
 */
function updateUserUI() {
  const walletAddressEl = document.getElementById('wallet-address');
  const walletNameEl = document.getElementById('wallet-name');
  const userEmailEl = document.getElementById('user-email');

  if (window.FluxoApp.wallet && walletAddressEl) {
    walletAddressEl.textContent = formatAddress(window.FluxoApp.wallet.address);
  }

  if (window.FluxoApp.user) {
    if (walletNameEl) {
      walletNameEl.textContent = 'Privy Wallet';
    }
    if (userEmailEl && window.FluxoApp.user.email) {
      userEmailEl.textContent = window.FluxoApp.user.email.address;
    }
  }
}

/**
 * Actualizar UI con transacciones
 */
function updateTransactionsUI(transactions) {
  const historialList = document.getElementById('historial-list');
  if (!historialList) return;

  if (!transactions || transactions.length === 0) {
    historialList.innerHTML = '<div style="color:#888;padding:1rem;text-align:center;">No hay transacciones</div>';
    return;
  }

  historialList.innerHTML = transactions
    .slice(0, 10) // Mostrar solo las últimas 10
    .map((tx) => {
      const isOutgoing = tx.from === window.FluxoApp.wallet?.address;
      const icon = isOutgoing ? '📤' : '📥';
      const amount = parseFloat(tx.amount || 0);
      const amountDisplay = isOutgoing ? `-$${amount.toFixed(2)}` : `+$${amount.toFixed(2)}`;
      const toFrom = isOutgoing ? `A ${formatAddress(tx.to)}` : `De ${formatAddress(tx.from)}`;

      return `
        <div class="historial-item">
          <div class="historial-icon">${icon}</div>
          <div class="historial-details">
            ${toFrom}
            <div style="font-size:0.85rem;color:#888;">${formatDate(tx.timestamp)}</div>
          </div>
          <div class="historial-amount">${amountDisplay}</div>
        </div>
      `;
    })
    .join('');
}

/**
 * Actualizar UI con balance
 */
function updateBalanceUI() {
  const saldoAmountEl = document.getElementById('saldo-amount');
  if (saldoAmountEl && window.FluxoApp.status) {
    const balance = window.FluxoApp.status.hedera?.balance || '0';
    saldoAmountEl.textContent = `$${parseFloat(balance).toFixed(2)}`;
  }
}

/**
 * Actualizar UI con estado de red
 */
function updateNetworkUI() {
  const networkStatusEl = document.getElementById('network-status');
  const networkDotEl = document.getElementById('network-dot');

  if (window.FluxoApp.status) {
    const mesh = window.FluxoApp.status.mesh;
    const isConnected = mesh && mesh.connectedPeers > 0;

    if (networkStatusEl) {
      networkStatusEl.textContent = isConnected
        ? `Mesh Network (${mesh.connectedPeers} peers)`
        : 'Mesh Network (Offline)';
    }

    if (networkDotEl) {
      networkDotEl.style.background = isConnected ? '#4caf50' : '#f44336';
    }
  }
}

/**
 * Inicializar aplicación
 */
async function initFluxoApp() {
  try {
    console.log('🚀 Inicializando Fluxo App...');

    // Obtener estado del backend
    await getStatus();

    // Si hay usuario logueado, actualizar UI
    if (window.FluxoApp.wallet) {
      updateUserUI();
      await getTransactions();
      updateTransactionsUI(window.FluxoApp.transactions);
    }

    // Actualizar balance y red
    updateBalanceUI();
    updateNetworkUI();

    console.log('✅ Fluxo App inicializada');
  } catch (error) {
    console.error('Error inicializando Fluxo App:', error);
  }
}

// Exportar funciones globales
window.FluxoAPI = {
  init: initFluxoApp,
  login: loginPrivy,
  logout: logoutPrivy,
  getStatus: getStatus,
  getTransactions: getTransactions,
  createPayment: createPayment,
  syncHedera: syncHedera,
  getHederaBalance: getHederaBalance,
  formatAddress: formatAddress,
  formatDate: formatDate,
  updateUserUI: updateUserUI,
  updateTransactionsUI: updateTransactionsUI,
  updateBalanceUI: updateBalanceUI,
  updateNetworkUI: updateNetworkUI,
};

console.log('✅ Fluxo API Client cargado');

