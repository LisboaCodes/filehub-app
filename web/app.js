// =============================================
// FileHub PWA - App Principal
// =============================================

// URL da API (ajuste para seu servidor)
const API_URL = 'https://filehub.space/api/api.php';
const STORAGE_URL = 'https://filehub.space/storage/';

// Estado da aplicacao
let currentUser = null;
let authToken = null;
let ferramentas = [];
let deferredPrompt = null;

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const btnLogin = document.getElementById('btnLogin');
const loginError = document.getElementById('loginError');
const errorMessage = document.getElementById('errorMessage');
const cardsGrid = document.getElementById('cardsGrid');
const connectionStatus = document.getElementById('connectionStatus');
const descriptionModal = document.getElementById('descriptionModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const userNameEl = document.getElementById('userName');
const userExpiryEl = document.getElementById('userExpiry');
const searchInput = document.getElementById('searchInput');
const installBanner = document.getElementById('installBanner');

// =============================================
// INICIALIZACAO
// =============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('FileHub PWA iniciando...');

  // Registra Service Worker
  registerServiceWorker();

  // Verifica se tem sessao salva
  const savedToken = localStorage.getItem('filehub_token');
  const savedUser = localStorage.getItem('filehub_user');

  if (savedToken && savedUser) {
    try {
      authToken = savedToken;
      currentUser = JSON.parse(savedUser);
      showMainScreen();
      await loadFerramentas();
    } catch (e) {
      console.error('Erro ao restaurar sessao:', e);
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }

  // Event listeners
  setupEventListeners();

  // PWA Install prompt
  setupInstallPrompt();
});

// =============================================
// SERVICE WORKER
// =============================================

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker registrado:', registration.scope);
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
    }
  }
}

// =============================================
// PWA INSTALL
// =============================================

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Mostra banner se nao foi dispensado
    if (!localStorage.getItem('filehub_install_dismissed')) {
      installBanner.style.display = 'flex';
    }
  });

  document.getElementById('btnInstall')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('Install prompt outcome:', outcome);
      deferredPrompt = null;
      installBanner.style.display = 'none';
    }
  });

  document.getElementById('btnDismissInstall')?.addEventListener('click', () => {
    localStorage.setItem('filehub_install_dismissed', 'true');
    installBanner.style.display = 'none';
  });
}

// =============================================
// NAVEGACAO
// =============================================

function showLoginScreen() {
  loginScreen.classList.add('active');
  mainScreen.classList.remove('active');

  // Restaura email salvo
  const savedEmail = localStorage.getItem('filehub_email');
  if (savedEmail) {
    emailInput.value = savedEmail;
    rememberCheckbox.checked = true;
  }
}

function showMainScreen() {
  loginScreen.classList.remove('active');
  mainScreen.classList.add('active');

  // Atualiza info do usuario
  if (currentUser) {
    userNameEl.textContent = `${currentUser.name} (${currentUser.plano_nome || 'Plano'})`;

    if (currentUser.data_expiracao) {
      const expiry = new Date(currentUser.data_expiracao);
      userExpiryEl.textContent = 'Expira: ' + expiry.toLocaleDateString('pt-BR');
    } else {
      userExpiryEl.textContent = 'Assinatura ativa';
    }
  }
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
  // Login form
  loginForm.addEventListener('submit', handleLogin);

  // Refresh
  document.getElementById('btnRefresh')?.addEventListener('click', async () => {
    await loadFerramentas();
  });

  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    if (confirm('Deseja realmente sair?')) {
      logout();
    }
  });

  // Modal close
  document.getElementById('closeDescriptionModal')?.addEventListener('click', () => {
    descriptionModal.classList.remove('active');
  });

  descriptionModal?.addEventListener('click', (e) => {
    if (e.target === descriptionModal) {
      descriptionModal.classList.remove('active');
    }
  });

  // Search
  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    filterFerramentas(query);
  });

  // Card actions
  cardsGrid?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const ferramentaId = parseInt(btn.dataset.id);
    const ferramenta = ferramentas.find(f => f.id === ferramentaId);
    if (!ferramenta) return;

    if (btn.classList.contains('btn-open')) {
      e.stopPropagation();
      await openFerramenta(ferramenta);
    } else if (btn.classList.contains('btn-info')) {
      e.stopPropagation();
      showDescription(ferramenta);
    }
  });
}

// =============================================
// AUTENTICACAO
// =============================================

async function handleLogin(e) {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showLoginError('Preencha todos os campos');
    return;
  }

  setLoginLoading(true);
  hideLoginError();

  try {
    const response = await fetch(`${API_URL}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {
      // Salva sessao
      authToken = result.token;
      currentUser = result.user;

      localStorage.setItem('filehub_token', authToken);
      localStorage.setItem('filehub_user', JSON.stringify(currentUser));

      if (rememberCheckbox.checked) {
        localStorage.setItem('filehub_email', email);
      } else {
        localStorage.removeItem('filehub_email');
      }

      showMainScreen();
      await loadFerramentas();
    } else {
      showLoginError(result.error);
    }
  } catch (error) {
    console.error('Erro no login:', error);
    showLoginError('Erro ao conectar ao servidor. Verifique sua conexao.');
  } finally {
    setLoginLoading(false);
  }
}

function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('filehub_token');
  localStorage.removeItem('filehub_user');
  showLoginScreen();
}

function showLoginError(message) {
  errorMessage.textContent = message;
  loginError.style.display = 'block';
}

function hideLoginError() {
  loginError.style.display = 'none';
}

function setLoginLoading(loading) {
  btnLogin.disabled = loading;
  btnLogin.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
  btnLogin.querySelector('.btn-loading').style.display = loading ? 'inline' : 'none';
}

// =============================================
// FERRAMENTAS
// =============================================

async function loadFerramentas() {
  try {
    connectionStatus.textContent = 'Carregando ferramentas...';
    connectionStatus.className = 'connection-status';

    const response = await fetch(`${API_URL}?action=ferramentas`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (response.status === 401) {
      logout();
      return;
    }

    const result = await response.json();

    if (result.success) {
      ferramentas = result.ferramentas;
      connectionStatus.textContent = `${ferramentas.length} ferramenta(s) disponivel(is)`;
      connectionStatus.className = 'connection-status connected';

      setTimeout(() => {
        connectionStatus.classList.add('hidden');
      }, 3000);

      renderCards();
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Erro ao carregar ferramentas:', error);
    connectionStatus.textContent = 'Erro ao carregar ferramentas';
    connectionStatus.className = 'connection-status error';
  }
}

function filterFerramentas(query) {
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.card-description')?.textContent.toLowerCase() || '';
    const match = title.includes(query) || desc.includes(query);
    card.style.display = match ? '' : 'none';
  });
}

function renderCards() {
  if (ferramentas.length === 0) {
    cardsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <h3>Nenhuma ferramenta encontrada</h3>
        <p>Verifique a conexao com o servidor</p>
      </div>
    `;
    return;
  }

  cardsGrid.innerHTML = ferramentas.map(f => {
    let capaUrl = '';
    if (f.capa) {
      capaUrl = f.capa.startsWith('http') ? f.capa : STORAGE_URL + f.capa;
    }

    const botaoAcesso = getBotaoAcesso(f);

    return `
      <div class="card ${!f.temAcesso ? 'card-locked' : ''}" data-id="${f.id}">
        <div class="card-cover">
          ${capaUrl
            ? `<img src="${escapeHtml(capaUrl)}" alt="${escapeHtml(f.titulo)}" onerror="this.parentElement.innerHTML='<div class=card-cover-placeholder>🔧</div>'">`
            : '<div class="card-cover-placeholder">🔧</div>'
          }
          ${!f.temAcesso ? '<div class="card-lock-overlay"><span class="lock-icon">🔒</span></div>' : ''}
        </div>
        <div class="card-body">
          <span class="card-status ${f.status}">${getStatusLabel(f.status)}</span>
          <span class="card-tipo">${f.tipo_acesso === 'sessao' ? 'Sessao' : 'Link'}</span>
          <h3 class="card-title">${escapeHtml(f.titulo)}</h3>
          ${f.descricao ? `<p class="card-description">${stripHtml(f.descricao)}</p>` : ''}
          <div class="card-actions">
            ${botaoAcesso}
            ${f.descricao ? `<button class="btn btn-secondary btn-small btn-info" data-id="${f.id}">Info</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getBotaoAcesso(ferramenta) {
  if (!ferramenta.temAcesso) {
    return `<button class="btn btn-locked btn-small" data-id="${ferramenta.id}">🔒 Upgrade</button>`;
  }

  switch (ferramenta.status) {
    case 'online':
      return `<button class="btn btn-primary btn-small btn-open" data-id="${ferramenta.id}">Acessar</button>`;
    case 'manutencao':
      return `<button class="btn btn-warning btn-small" disabled>⚠️ Manutencao</button>`;
    case 'offline':
      return `<button class="btn btn-offline btn-small" disabled>⛔ Offline</button>`;
    default:
      return `<button class="btn btn-secondary btn-small" disabled>Indisponivel</button>`;
  }
}

function getStatusLabel(status) {
  const labels = { online: 'Online', manutencao: 'Manutencao', offline: 'Offline' };
  return labels[status] || status;
}

// =============================================
// ABRIR FERRAMENTA
// =============================================

async function openFerramenta(ferramenta) {
  if (!ferramenta.temAcesso) {
    alert(`Seu plano ${currentUser?.plano_nome || 'atual'} nao tem acesso a esta ferramenta.\n\nFaca um upgrade para continuar.`);
    return;
  }

  if (ferramenta.status !== 'online') {
    const msgs = {
      manutencao: 'Esta ferramenta esta em manutencao.',
      offline: 'Esta ferramenta esta offline.'
    };
    alert(msgs[ferramenta.status] || 'Ferramenta indisponivel.');
    return;
  }

  const conteudo = ferramenta.link_ou_conteudo || '';

  // Se for URL simples, abre em nova aba
  if (conteudo.startsWith('http') && !conteudo.startsWith('filehub ') && !conteudo.startsWith('U2FsdGVk')) {
    window.open(conteudo, '_blank');
    return;
  }

  // Sessao criptografada - descriptografa e mostra info
  loadingOverlay.classList.add('active');

  try {
    const response = await fetch(`${API_URL}?action=decrypt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: conteudo })
    });

    const result = await response.json();
    loadingOverlay.classList.remove('active');

    if (result.success && result.url) {
      // No PWA, nao conseguimos injetar cookies
      // Mostramos a URL e cookies para o usuario copiar
      showSessionInfo(ferramenta, result);
    } else {
      alert('Erro ao processar sessao: ' + (result.error || 'Dados invalidos'));
    }
  } catch (error) {
    loadingOverlay.classList.remove('active');
    console.error('Erro:', error);
    alert('Erro ao processar a ferramenta.');
  }
}

function showSessionInfo(ferramenta, sessionData) {
  const modal = descriptionModal;
  document.getElementById('descriptionTitle').textContent = ferramenta.titulo;

  document.getElementById('descriptionContent').innerHTML = `
    <div style="margin-bottom: 16px;">
      <p style="margin-bottom: 12px;">Esta ferramenta requer sessao logada.</p>
      <p style="margin-bottom: 12px;"><strong>Para acessar no navegador:</strong></p>
      <ol style="margin-left: 20px; margin-bottom: 16px;">
        <li>Instale a extensao "Session Share" ou "EditThisCookie"</li>
        <li>Acesse a URL abaixo</li>
        <li>Importe os cookies usando a extensao</li>
      </ol>
    </div>

    <div style="margin-bottom: 16px;">
      <label style="font-weight: 600; display: block; margin-bottom: 6px;">URL:</label>
      <input type="text" value="${escapeHtml(sessionData.url)}" readonly
        style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #333; background: #1a1a1a; color: #fff;"
        onclick="this.select()">
    </div>

    <div style="margin-bottom: 16px;">
      <label style="font-weight: 600; display: block; margin-bottom: 6px;">Cookies (${sessionData.cookies?.length || 0}):</label>
      <textarea readonly
        style="width: 100%; height: 100px; padding: 10px; border-radius: 6px; border: 1px solid #333; background: #1a1a1a; color: #fff; font-size: 12px;"
        onclick="this.select()">${JSON.stringify(sessionData.cookies, null, 2)}</textarea>
    </div>

    <div style="display: flex; gap: 10px;">
      <button class="btn btn-primary btn-small" onclick="window.open('${escapeHtml(sessionData.url)}', '_blank')">
        Abrir URL
      </button>
      <button class="btn btn-secondary btn-small" onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(sessionData.cookies)})); alert('Cookies copiados!')">
        Copiar Cookies
      </button>
    </div>

    <p style="margin-top: 16px; font-size: 12px; color: #888;">
      💡 Dica: Use o app desktop do FileHub para abrir sessoes automaticamente.
    </p>
  `;

  modal.classList.add('active');
}

// =============================================
// DESCRICAO
// =============================================

function showDescription(ferramenta) {
  document.getElementById('descriptionTitle').textContent = ferramenta.titulo;

  const descHtml = sanitizeHtml(ferramenta.descricao || 'Sem descricao disponivel.');

  document.getElementById('descriptionContent').innerHTML = `
    <div class="description-text">${descHtml}</div>
    ${ferramenta.login ? `<p><strong>Login:</strong> ${escapeHtml(ferramenta.login)}</p>` : ''}
    ${ferramenta.senha ? `<p><strong>Senha:</strong> ${escapeHtml(ferramenta.senha)}</p>` : ''}
  `;

  descriptionModal.classList.add('active');
}

// =============================================
// UTILITARIOS
// =============================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

function sanitizeHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}
