// Estado da aplicacao
let ferramentas = [];
let acessosPremium = [];
let materiais = [];
let tools = [];
let canvaArquivos = [];
let canvaCategorias = [];
let canvaAcessos = [];
let currentCanvaCategoria = 'all';
let currentCanvaBusca = '';
let currentUser = null;
let currentPage = 'ferramentas';

// Elementos DOM
const cardsGrid = document.getElementById('cardsGrid');
const acessosGrid = document.getElementById('acessosGrid');
const materiaisGrid = document.getElementById('materiaisGrid');
const connectionStatus = document.getElementById('connectionStatus');
const descriptionModal = document.getElementById('descriptionModal');
const avatarModal = document.getElementById('avatarModal');
const acessoPremiumModal = document.getElementById('acessoPremiumModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const userNameEl = document.getElementById('userName');
const userPlanEl = document.getElementById('userPlan');
const userExpiryEl = document.getElementById('userExpiry');
const userAvatarEl = document.getElementById('userAvatar');
const pageTitleEl = document.getElementById('pageTitle');

// Elementos do update overlay
const updateOverlay = document.getElementById('updateOverlay');
const updateTitle = document.getElementById('updateTitle');
const updateMessage = document.getElementById('updateMessage');
const updateProgressBar = document.getElementById('updateProgressBar');
const updatePercent = document.getElementById('updatePercent');
const updateStatus = document.getElementById('updateStatus');

// Substituir emojis do menu por icones Lucide SVG
function replaceMenuIcons() {
  if (typeof window.renderLucideIcon !== 'function') {
    console.warn('Lucide Icons nao carregado');
    return;
  }

  // Mapa de data-page/data-toggle para icone Lucide
  const iconMap = {
    'ferramentas': 'bot',
    'canva': 'palette',
    'canva-arquivos': 'file-text',
    'canva-acesso': 'link',
    'tools': 'tool',
    'acessos': 'star',
    'materiais': 'folder',
    'perfil': 'user',
    'admin': 'settings',
    'admin-usuarios': 'users',
    'admin-ferramentas': 'bot',
    'admin-acessos': 'star',
    'admin-canva': 'palette',
    'admin-tools': 'tool'
  };

  // Substitui icones nos itens de navegacao
  document.querySelectorAll('.nav-item, .nav-submenu-item').forEach(item => {
    const page = item.dataset.page || item.dataset.toggle;
    if (page && iconMap[page]) {
      const iconEl = item.querySelector('.nav-icon');
      if (iconEl) {
        iconEl.innerHTML = window.renderLucideIcon(iconMap[page], 18);
      }
    }
  });

  // Substitui setas de expansao
  document.querySelectorAll('.nav-arrow').forEach(arrow => {
    arrow.innerHTML = window.renderLucideIcon('chevron-down', 14);
  });
}

// Inicializacao
document.addEventListener('DOMContentLoaded', async () => {
  console.log('FileHub iniciando...');

  // Substitui emojis por icones SVG
  replaceMenuIcons();

  await loadUserInfo();
  await loadFerramentas();
  await loadAcessosPremium();
  await loadMateriais();
  await loadTools();
  await loadCanvaCategorias();
  await loadCanvaAcessos();
  setupEventListeners();
  setupNavigation();
  setupProfilePage();
  setupAcessosPremiumPage();
  setupMateriaisPage();
  setupToolsMenu();
  setupCanvaMenu();
  setupCanvaPage();
  setupUpdateListeners();
  setupMenuListeners();
  setupFerramentasSearch();
  setupReportModal();
  setupPlanosDetalhesModal();

  // Inicializa menu admin se for admin
  if (typeof initAdminMenu === 'function') {
    initAdminMenu();
  }

  // Inicializa pagina de reports admin
  if (typeof initAdminReportsSetup === 'function') {
    initAdminReportsSetup();
  }

  // Carrega o Dashboard como pagina inicial
  loadDashboard();
});

// Configurar busca de ferramentas (IAs)
function setupFerramentasSearch() {
  const searchInput = document.getElementById('ferramentasSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    ferramentasBusca = e.target.value.trim();
    renderCards();
  });

  // Enter para buscar (ja funciona com input, mas adiciona feedback visual)
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ferramentasBusca = searchInput.value.trim();
      renderCards();
    }
  });
}

// Configura listeners do menu
function setupMenuListeners() {
  window.api.onMenuRefresh(async () => {
    console.log('Atualizando via menu...');
    if (currentPage === 'acessos') {
      await loadAcessosPremium();
    } else if (currentPage === 'materiais') {
      await loadMateriais();
    } else {
      await loadFerramentas();
    }
  });
}

// Configura listeners de atualizacao automatica
function setupUpdateListeners() {
  // Atualizacao disponivel
  window.api.onUpdateAvailable((info) => {
    console.log('Atualizacao disponivel:', info.version);
    showUpdateOverlay();
    updateTitle.textContent = 'Atualizando FileHub';
    updateMessage.textContent = `Baixando versao ${info.version}...`;
    updateStatus.textContent = 'Iniciando download...';
  });

  // Progresso do download
  window.api.onUpdateProgress((progress) => {
    const percent = Math.round(progress.percent);
    updateProgressBar.style.width = percent + '%';
    updatePercent.textContent = percent + '%';

    const mbDownloaded = (progress.transferred / 1024 / 1024).toFixed(1);
    const mbTotal = (progress.total / 1024 / 1024).toFixed(1);
    updateStatus.textContent = `${mbDownloaded} MB de ${mbTotal} MB`;
  });

  // Download concluido
  window.api.onUpdateDownloaded((info) => {
    updateTitle.textContent = 'Atualizacao Pronta!';
    updateMessage.textContent = 'Instalando...';
    updatePercent.textContent = '100%';
    updateProgressBar.style.width = '100%';
    updateStatus.textContent = 'O app sera reiniciado automaticamente';
  });

  // Erro na atualizacao
  window.api.onUpdateError((error) => {
    console.error('Erro na atualizacao:', error);
    hideUpdateOverlay();
  });
}

// Mostra overlay de atualizacao
function showUpdateOverlay() {
  if (updateOverlay) {
    updateOverlay.classList.add('active');
  }
}

// Esconde overlay de atualizacao
function hideUpdateOverlay() {
  if (updateOverlay) {
    updateOverlay.classList.remove('active');
  }
}

// Carrega informacoes do usuario logado
async function loadUserInfo() {
  try {
    currentUser = await window.api.getCurrentUser();
    if (currentUser) {
      // Nome do usuario
      userNameEl.textContent = currentUser.name || 'Usuario';
      userPlanEl.textContent = currentUser.plano_nome || 'Plano';

      // Avatar
      updateAvatarDisplay();

      // Expiracao
      if (currentUser.data_expiracao) {
        const expiry = new Date(currentUser.data_expiracao);
        userExpiryEl.textContent = 'Expira em: ' + expiry.toLocaleDateString('pt-BR');
      } else {
        userExpiryEl.textContent = 'Assinatura ativa';
      }

      console.log('Usuario:', currentUser.name, '- Plano:', currentUser.plano_nome, '- Nivel:', currentUser.nivel_acesso);
    }
  } catch (error) {
    console.error('Erro ao carregar usuario:', error);
  }
}

// Monta URL completa do avatar
function getAvatarUrl(avatar) {
  if (!avatar) return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  // Avatar vem como "avatars/arquivo.jpg", adiciona o dominio base
  return STORAGE_URL + avatar;
}

// Atualiza exibicao do avatar em todos os lugares
function updateAvatarDisplay() {
  if (!currentUser) return;

  const avatarLetter = (currentUser.name || 'U').charAt(0).toUpperCase();
  const avatarUrl = getAvatarUrl(currentUser.avatar);

  // Avatar na sidebar
  if (avatarUrl) {
    userAvatarEl.innerHTML = `<img src="${avatarUrl}" alt="Avatar" onerror="this.parentElement.innerHTML='<span>${avatarLetter}</span>'">`;
  } else {
    userAvatarEl.innerHTML = `<span>${avatarLetter}</span>`;
  }

  // Avatar no perfil
  const profileAvatarLetter = document.getElementById('profileAvatarLetter');
  const profileAvatarImg = document.getElementById('profileAvatarImg');

  if (profileAvatarLetter && profileAvatarImg) {
    if (avatarUrl) {
      profileAvatarLetter.style.display = 'none';
      profileAvatarImg.src = avatarUrl;
      profileAvatarImg.style.display = 'block';
      profileAvatarImg.onerror = function() {
        this.style.display = 'none';
        profileAvatarLetter.style.display = 'block';
        profileAvatarLetter.textContent = avatarLetter;
      };
    } else {
      profileAvatarLetter.style.display = 'block';
      profileAvatarLetter.textContent = avatarLetter;
      profileAvatarImg.style.display = 'none';
    }
  }
}

// Carregar ferramentas do banco MySQL
async function loadFerramentas() {
  try {
    connectionStatus.textContent = 'Conectando ao servidor...';
    connectionStatus.className = 'connection-status';

    ferramentas = await window.api.getFerramentas();

    if (ferramentas.length > 0) {
      connectionStatus.textContent = `Conectado - ${ferramentas.length} ferramenta(s) disponivel(is)`;
      connectionStatus.className = 'connection-status connected';

      // Esconde apos 3 segundos
      setTimeout(() => {
        connectionStatus.classList.add('hidden');
      }, 3000);
    } else {
      connectionStatus.textContent = 'Nenhuma ferramenta encontrada no banco de dados';
      connectionStatus.className = 'connection-status';
    }

    renderCards();
    console.log('Ferramentas carregadas:', ferramentas.length);
  } catch (error) {
    console.error('Erro ao carregar ferramentas:', error);
    connectionStatus.textContent = 'Erro ao conectar ao servidor';
    connectionStatus.className = 'connection-status error';
  }
}

// URL base para storage (capas e avatares)
const STORAGE_URL = 'https://filehub.space/storage/';

// Variavel para busca de ferramentas
let ferramentasBusca = '';

// Renderizar cards das ferramentas
function renderCards() {
  // Filtra ferramentas pela busca
  const ferramentasFiltradas = ferramentasBusca
    ? ferramentas.filter(f => f.titulo.toLowerCase().includes(ferramentasBusca.toLowerCase()))
    : ferramentas;

  if (ferramentasFiltradas.length === 0) {
    cardsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128194;</div>
        <h3>${ferramentasBusca ? 'Nenhuma IA encontrada para "' + escapeHtml(ferramentasBusca) + '"' : 'Nenhuma ferramenta encontrada'}</h3>
        <p>${ferramentasBusca ? 'Tente outro termo de busca' : 'Verifique a conexao com o banco de dados'}</p>
      </div>
    `;
    return;
  }

  cardsGrid.innerHTML = ferramentasFiltradas.map(f => {
    // Monta URL completa da capa
    let capaUrl = '';
    if (f.capa) {
      if (f.capa.startsWith('http')) {
        capaUrl = f.capa;
      } else {
        capaUrl = STORAGE_URL + f.capa;
      }
    }

    // Determina o botao baseado no status e acesso
    const botaoAcesso = getBotaoAcesso(f);

    return `
      <div class="card ${!f.temAcesso ? 'card-locked' : ''} ${f.status !== 'online' ? 'card-' + f.status : ''}" data-id="${f.id}">
        <div class="card-cover">
          ${capaUrl
            ? `<img src="${escapeHtml(capaUrl)}" alt="${escapeHtml(f.titulo)}" class="card-img">`
            : '<div class="card-cover-placeholder">&#128295;</div>'
          }
          ${!f.temAcesso ? '<div class="card-lock-overlay"><span class="lock-icon">&#128274;</span></div>' : ''}
        </div>
        <div class="card-body">
          <span class="card-status ${f.status}">${getStatusLabel(f.status)}</span>
          <h3 class="card-title">${escapeHtml(f.titulo)}</h3>
          ${f.descricao
            ? `<p class="card-description">${stripHtml(f.descricao)}</p>`
            : ''
          }
          <div class="card-actions">
            ${botaoAcesso}
            ${f.descricao ? `<button class="btn btn-secondary btn-small btn-info" data-id="${f.id}">Info</button>` : ''}
            <button class="btn-report btn-small" data-id="${f.id}" data-titulo="${escapeHtml(f.titulo)}" title="Reportar problema">&#128680; Report</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Adiciona handler para erros de imagem
  document.querySelectorAll('.card-img').forEach(img => {
    img.addEventListener('error', function() {
      this.parentElement.innerHTML = '<div class="card-cover-placeholder">&#128295;</div>';
    });
  });
}

// Retorna o botao de acesso baseado no status e permissao
function getBotaoAcesso(ferramenta) {
  // Se usuario nao tem acesso
  if (!ferramenta.temAcesso) {
    return `<button class="btn btn-locked btn-small" data-id="${ferramenta.id}" disabled>
      <span class="btn-lock-icon">&#128274;</span> Upgrade
    </button>`;
  }

  // Baseado no status da ferramenta
  switch (ferramenta.status) {
    case 'online':
      return `<button class="btn btn-primary btn-small btn-open" data-id="${ferramenta.id}">Acessar</button>`;

    case 'manutencao':
      return `<button class="btn btn-warning btn-small" data-id="${ferramenta.id}" disabled>
        <span>&#9888;</span> Manutencao
      </button>`;

    case 'offline':
      return `<button class="btn btn-offline btn-small" data-id="${ferramenta.id}" disabled>
        <span>&#9940;</span> Offline
      </button>`;

    default:
      return `<button class="btn btn-secondary btn-small" data-id="${ferramenta.id}" disabled>Indisponivel</button>`;
  }
}

// Retorna label do status
function getStatusLabel(status) {
  switch (status) {
    case 'online': return 'Online';
    case 'manutencao': return 'Manutencao';
    case 'offline': return 'Offline';
    default: return status;
  }
}

// Configurar navegacao da sidebar
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

// Navegar para uma pagina
function navigateTo(page) {
  currentPage = page;

  // Atualiza navegacao ativa
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Atualiza navegacao ativa nos submenus
  document.querySelectorAll('.nav-submenu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Esconde todas as paginas
  document.getElementById('pageDashboard')?.classList.add('hidden');
  document.getElementById('pageFerramentas').classList.add('hidden');
  document.getElementById('pageAcessos').classList.add('hidden');
  document.getElementById('pageMateriais').classList.add('hidden');
  document.getElementById('pageCanvaArquivos').classList.add('hidden');
  document.getElementById('pageCanvaAcesso').classList.add('hidden');
  document.getElementById('pagePerfil').classList.add('hidden');
  document.getElementById('pagePlanos')?.classList.add('hidden');

  // Esconde paginas admin
  document.getElementById('pageAdminUsuarios')?.classList.add('hidden');
  document.getElementById('pageAdminFerramentas')?.classList.add('hidden');
  document.getElementById('pageAdminAcessos')?.classList.add('hidden');
  document.getElementById('pageAdminCanva')?.classList.add('hidden');
  document.getElementById('pageAdminTools')?.classList.add('hidden');
  document.getElementById('pageAdminReports')?.classList.add('hidden');
  document.getElementById('pageAdminPlanos')?.classList.add('hidden');
  document.getElementById('pageAdminPlanosDetalhes')?.classList.add('hidden');
  document.getElementById('pageAdminDashboard')?.classList.add('hidden');
  document.getElementById('pageAdminMenu')?.classList.add('hidden');

  // Mostra a pagina selecionada
  if (page === 'dashboard') {
    document.getElementById('pageDashboard').classList.remove('hidden');
    pageTitleEl.textContent = 'Dashboard';
    connectionStatus.classList.add('hidden');
    loadDashboard();
  } else if (page === 'ferramentas') {
    document.getElementById('pageFerramentas').classList.remove('hidden');
    pageTitleEl.textContent = 'Inteligencia Artificial';
    connectionStatus.classList.remove('hidden');
  } else if (page === 'acessos') {
    document.getElementById('pageAcessos').classList.remove('hidden');
    pageTitleEl.textContent = 'Acessos Premium';
    connectionStatus.classList.add('hidden');
  } else if (page === 'materiais') {
    document.getElementById('pageMateriais').classList.remove('hidden');
    pageTitleEl.textContent = 'Materiais';
    connectionStatus.classList.add('hidden');
  } else if (page === 'canva-arquivos') {
    document.getElementById('pageCanvaArquivos').classList.remove('hidden');
    pageTitleEl.textContent = 'Arquivos Canva';
    connectionStatus.classList.add('hidden');
    loadCanvaArquivos();
  } else if (page === 'canva-acesso') {
    document.getElementById('pageCanvaAcesso').classList.remove('hidden');
    pageTitleEl.textContent = 'Acesso Canva';
    connectionStatus.classList.add('hidden');
    renderCanvaAcessos();
  } else if (page === 'planos') {
    document.getElementById('pagePlanos').classList.remove('hidden');
    pageTitleEl.textContent = 'Planos';
    connectionStatus.classList.add('hidden');
    loadPlanos();
  } else if (page === 'perfil') {
    document.getElementById('pagePerfil').classList.remove('hidden');
    pageTitleEl.textContent = 'Meu Perfil';
    connectionStatus.classList.add('hidden');
    loadProfileData();
  }
  // Paginas Admin
  else if (page === 'admin-usuarios') {
    document.getElementById('pageAdminUsuarios').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Usuarios';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminPlanos === 'function') loadAdminPlanos();
    if (typeof loadAdminUsers === 'function') loadAdminUsers();
  } else if (page === 'admin-ferramentas') {
    document.getElementById('pageAdminFerramentas').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Inteligencia Artificial';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminFerramentas === 'function') loadAdminFerramentas();
  } else if (page === 'admin-acessos') {
    document.getElementById('pageAdminAcessos').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Acessos Premium';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminAcessosPremium === 'function') loadAdminAcessosPremium();
  } else if (page === 'admin-canva') {
    document.getElementById('pageAdminCanva').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Canva';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminCanvaCategorias === 'function') loadAdminCanvaCategorias();
    if (typeof loadAdminCanvaArquivos === 'function') loadAdminCanvaArquivos();
    if (typeof loadAdminCanvaAcessos === 'function') loadAdminCanvaAcessos();
  } else if (page === 'admin-tools') {
    document.getElementById('pageAdminTools').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Tools';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminTools === 'function') loadAdminTools();
  } else if (page === 'admin-reports') {
    document.getElementById('pageAdminReports').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Reports';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminReports === 'function') loadAdminReports();
  } else if (page === 'admin-planos') {
    document.getElementById('pageAdminPlanos').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Planos';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminPlanosPlataforma === 'function') loadAdminPlanosPlataforma();
  } else if (page === 'admin-planos-detalhes') {
    document.getElementById('pageAdminPlanosDetalhes').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Detalhes dos Planos';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminPlanosDetalhes === 'function') loadAdminPlanosDetalhes();
  } else if (page === 'admin-dashboard') {
    document.getElementById('pageAdminDashboard').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Dashboard';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminDashboard === 'function') loadAdminDashboard();
  } else if (page === 'admin-menu') {
    document.getElementById('pageAdminMenu').classList.remove('hidden');
    pageTitleEl.textContent = 'Administracao - Menu';
    connectionStatus.classList.add('hidden');
    if (typeof loadAdminMenuItems === 'function') loadAdminMenuItems();
  }
}

// Carrega dados do perfil
function loadProfileData() {
  if (!currentUser) return;

  document.getElementById('profileName').textContent = currentUser.name || 'Usuario';
  document.getElementById('profileEmail').textContent = currentUser.email || '';
  document.getElementById('inputEmail').value = currentUser.email || '';
  document.getElementById('inputWhatsapp').value = currentUser.whatsapp || '';
  document.getElementById('inputPin').value = '';
  document.getElementById('inputNewPassword').value = '';
  document.getElementById('inputConfirmPassword').value = '';

  // ID FileHub
  const idFilehub = currentUser.id_filehub || `FH-${currentUser.id}`;
  document.getElementById('profileIdFilehub').textContent = `ID FileHub: ${idFilehub}`;
  document.getElementById('inputIdFilehub').value = idFilehub;

  // PIN de Seguranca (mostra asteriscos se existir)
  const pinDisplay = document.getElementById('inputPinDisplay');
  if (pinDisplay) {
    pinDisplay.value = currentUser.security_pin ? '****' : 'Nao definido';
  }

  updateAvatarDisplay();
}

// Configurar pagina de perfil
function setupProfilePage() {
  // Botao editar avatar
  document.getElementById('btnEditAvatar').addEventListener('click', () => {
    avatarModal.classList.add('active');
    document.getElementById('inputAvatarUrl').value = currentUser?.avatar || '';
    updateAvatarPreview();
  });

  // Fechar modal avatar
  document.getElementById('closeAvatarModal').addEventListener('click', () => {
    avatarModal.classList.remove('active');
  });

  document.getElementById('btnCancelAvatar').addEventListener('click', () => {
    avatarModal.classList.remove('active');
  });

  avatarModal.addEventListener('click', (e) => {
    if (e.target === avatarModal) {
      avatarModal.classList.remove('active');
    }
  });

  // Preview do avatar
  document.getElementById('inputAvatarUrl').addEventListener('input', updateAvatarPreview);

  // Salvar avatar
  document.getElementById('btnSaveAvatar').addEventListener('click', async () => {
    const url = document.getElementById('inputAvatarUrl').value.trim();
    await saveAvatar(url);
  });

  // Salvar perfil
  document.getElementById('btnSaveProfile').addEventListener('click', async () => {
    await saveProfile();
  });
}

// Atualiza preview do avatar
function updateAvatarPreview() {
  const url = document.getElementById('inputAvatarUrl').value.trim();
  const preview = document.getElementById('avatarPreview');

  if (url) {
    preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span>Erro ao carregar</span>'">`;
  } else {
    preview.innerHTML = '<span>Preview</span>';
  }
}

// Salvar avatar
async function saveAvatar(url) {
  try {
    const result = await window.api.updateProfile({ avatar: url });

    if (result.success) {
      currentUser.avatar = url;
      updateAvatarDisplay();
      avatarModal.classList.remove('active');
      showProfileMessage('Avatar atualizado com sucesso!', 'success');
    } else {
      showProfileMessage(result.error || 'Erro ao salvar avatar', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar avatar:', error);
    showProfileMessage('Erro ao salvar avatar', 'error');
  }
}

// Salvar perfil
async function saveProfile() {
  const whatsapp = document.getElementById('inputWhatsapp').value.trim();
  const pin = document.getElementById('inputPin').value.trim();
  const newPassword = document.getElementById('inputNewPassword').value;
  const confirmPassword = document.getElementById('inputConfirmPassword').value;

  // Validacoes
  if (pin && pin.length !== 4) {
    showProfileMessage('O PIN deve ter exatamente 4 digitos', 'error');
    return;
  }

  if (pin && !/^\d{4}$/.test(pin)) {
    showProfileMessage('O PIN deve conter apenas numeros', 'error');
    return;
  }

  if (newPassword && newPassword !== confirmPassword) {
    showProfileMessage('As senhas nao conferem', 'error');
    return;
  }

  if (newPassword && newPassword.length < 6) {
    showProfileMessage('A senha deve ter pelo menos 6 caracteres', 'error');
    return;
  }

  try {
    const data = { whatsapp };

    if (pin) {
      data.pin = pin;
    }

    if (newPassword) {
      data.password = newPassword;
    }

    const result = await window.api.updateProfile(data);

    if (result.success) {
      currentUser.whatsapp = whatsapp;
      showProfileMessage('Perfil atualizado com sucesso!', 'success');

      // Limpa campos de senha
      document.getElementById('inputPin').value = '';
      document.getElementById('inputNewPassword').value = '';
      document.getElementById('inputConfirmPassword').value = '';
    } else {
      showProfileMessage(result.error || 'Erro ao salvar perfil', 'error');
    }
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    showProfileMessage('Erro ao salvar perfil', 'error');
  }
}

// Mostra mensagem no perfil
function showProfileMessage(message, type) {
  const messageEl = document.getElementById('profileMessage');
  messageEl.textContent = message;
  messageEl.className = `profile-message ${type}`;
  messageEl.classList.remove('hidden');

  setTimeout(() => {
    messageEl.classList.add('hidden');
  }, 5000);
}

// =============================================
// ACESSOS PREMIUM
// =============================================

// Carregar acessos premium do banco MySQL
async function loadAcessosPremium() {
  try {
    acessosPremium = await window.api.getAcessosPremium();
    renderAcessosCards();
    console.log('Acessos Premium carregados:', acessosPremium.length);
  } catch (error) {
    console.error('Erro ao carregar acessos premium:', error);
  }
}

// Renderizar cards dos acessos premium
function renderAcessosCards() {
  if (!acessosGrid) return;

  if (acessosPremium.length === 0) {
    acessosGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#11088;</div>
        <h3>Nenhum acesso premium encontrado</h3>
        <p>Verifique a conexao com o banco de dados</p>
      </div>
    `;
    return;
  }

  acessosGrid.innerHTML = acessosPremium.map(a => {
    // Monta URL completa da capa
    let capaUrl = '';
    if (a.capa) {
      if (a.capa.startsWith('http')) {
        capaUrl = a.capa;
      } else {
        capaUrl = STORAGE_URL + a.capa;
      }
    }

    // Determina o botao baseado no status e acesso
    const botaoAcesso = getBotaoAcessoPremium(a);

    return `
      <div class="card ${!a.temAcesso ? 'card-locked' : ''} ${a.status !== 'online' ? 'card-' + a.status : ''}" data-acesso-id="${a.id}">
        <div class="card-cover">
          ${capaUrl
            ? `<img src="${escapeHtml(capaUrl)}" alt="${escapeHtml(a.titulo)}" class="card-img">`
            : '<div class="card-cover-placeholder">&#11088;</div>'
          }
          ${!a.temAcesso ? '<div class="card-lock-overlay"><span class="lock-icon">&#128274;</span></div>' : ''}
          <span class="card-premium-badge">Premium</span>
        </div>
        <div class="card-body">
          <span class="card-status ${a.status}">${getStatusLabel(a.status)}</span>
          <span class="card-tipo">${getTipoAcessoLabel(a.tipo_acesso)}</span>
          <h3 class="card-title">${escapeHtml(a.titulo)}</h3>
          ${a.descricao
            ? `<p class="card-description">${stripHtml(a.descricao)}</p>`
            : ''
          }
          <div class="card-actions">
            ${botaoAcesso}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Adiciona handler para erros de imagem
  acessosGrid.querySelectorAll('.card-img').forEach(img => {
    img.addEventListener('error', function() {
      this.parentElement.innerHTML = '<div class="card-cover-placeholder">&#11088;</div><span class="card-premium-badge">Premium</span>';
    });
  });
}

// Retorna o botao de acesso para acessos premium
function getBotaoAcessoPremium(acesso) {
  // Se usuario nao tem acesso
  if (!acesso.temAcesso) {
    return `<button class="btn btn-locked btn-small" disabled>
      <span class="btn-lock-icon">&#128274;</span> Upgrade
    </button>`;
  }

  // Baseado no status
  switch (acesso.status) {
    case 'online':
      // Texto do botao baseado no tipo de acesso
      let btnText = 'Acessar';
      let btnClass = 'btn-acesso-premium';

      if (acesso.tipo_acesso === 'login_senha') {
        btnText = 'Ver Acesso';
      } else if (acesso.tipo_acesso === 'link_url') {
        btnText = 'Abrir Site';
      } else if (acesso.tipo_acesso === 'chave_extensao') {
        btnText = 'Acessar';
      }

      return `<button class="btn btn-primary btn-small ${btnClass}" data-acesso-id="${acesso.id}" data-tipo="${acesso.tipo_acesso}">${btnText}</button>`;

    case 'manutencao':
      return `<button class="btn btn-warning btn-small" disabled>
        <span>&#9888;</span> Manutencao
      </button>`;

    case 'offline':
      return `<button class="btn btn-offline btn-small" disabled>
        <span>&#9940;</span> Offline
      </button>`;

    default:
      return `<button class="btn btn-secondary btn-small" disabled>Indisponivel</button>`;
  }
}

// Retorna label do tipo de acesso
function getTipoAcessoLabel(tipo) {
  switch (tipo) {
    case 'login_senha': return 'Login/Senha';
    case 'link_url': return 'Link';
    case 'chave_extensao': return 'Sessao';
    default: return tipo || 'Acesso';
  }
}

// Configurar pagina de acessos premium
function setupAcessosPremiumPage() {
  // Fechar modal acesso premium
  document.getElementById('closeAcessoPremiumModal').addEventListener('click', () => {
    acessoPremiumModal.classList.remove('active');
  });

  acessoPremiumModal.addEventListener('click', (e) => {
    if (e.target === acessoPremiumModal) {
      acessoPremiumModal.classList.remove('active');
    }
  });

  // Clique nos cards de acessos premium
  acessosGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-acesso-premium');
    if (btn) {
      e.stopPropagation();
      const acessoId = parseInt(btn.dataset.acessoId);
      const acesso = acessosPremium.find(a => a.id === acessoId);
      if (acesso) {
        await handleAcessoPremiumClick(acesso);
      }
      return;
    }

    // Clique no card
    const card = e.target.closest('.card');
    if (card && !e.target.closest('button')) {
      const acessoId = parseInt(card.dataset.acessoId);
      const acesso = acessosPremium.find(a => a.id === acessoId);
      if (acesso && acesso.temAcesso && acesso.status === 'online') {
        await handleAcessoPremiumClick(acesso);
      }
    }
  });

  // Botoes de copiar
  acessoPremiumModal.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.copy;
      const input = document.getElementById(inputId);
      if (input) {
        const value = input.value;
        navigator.clipboard.writeText(value).then(() => {
          btn.classList.add('copied');
          setTimeout(() => btn.classList.remove('copied'), 1500);
        });
      }
    });
  });

  // Botao mostrar/ocultar senha
  acessoPremiumModal.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.toggle;
      const input = document.getElementById(inputId);
      if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
      }
    });
  });

  // Botao abrir URL
  document.getElementById('btnOpenUrl').addEventListener('click', () => {
    const url = document.getElementById('acessoUrl').value;
    if (url) {
      window.open(url, '_blank');
    }
  });
}

// Trata o clique no acesso premium baseado no tipo
async function handleAcessoPremiumClick(acesso) {
  // Verifica se o usuario tem acesso
  if (!acesso.temAcesso) {
    showUpgradeModal();
    return;
  }

  // Verifica o status
  if (acesso.status !== 'online') {
    alert('Este acesso nao esta disponivel no momento.');
    return;
  }

  // Acao baseada no tipo de acesso
  switch (acesso.tipo_acesso) {
    case 'link_url':
      // Abre a URL em uma nova aba externa
      if (acesso.url) {
        window.open(acesso.url, '_blank');
      } else {
        alert('URL nao configurada para este acesso.');
      }
      break;

    case 'login_senha':
      // Abre o modal com login/senha
      showAcessoPremiumModal(acesso);
      break;

    case 'chave_extensao':
      // Abre usando a extensao (mesma logica das ferramentas)
      await openAcessoPremiumExtensao(acesso);
      break;

    default:
      // Fallback - abre modal
      showAcessoPremiumModal(acesso);
      break;
  }
}

// Abre acesso premium usando a extensao (igual ferramentas)
async function openAcessoPremiumExtensao(acesso) {
  try {
    loadingOverlay.classList.add('active');

    console.log('Abrindo acesso premium:', acesso.titulo);
    console.log('Tipo acesso:', acesso.tipo_acesso);

    // Verifica se tem chave de acesso (dados criptografados)
    const conteudo = acesso.chave_de_acesso || '';

    if (!conteudo) {
      loadingOverlay.classList.remove('active');
      alert('Chave de acesso nao configurada para este acesso.');
      return;
    }

    // Verifica se é URL simples ou dados criptografados
    const isEncrypted = conteudo.startsWith('filehub ') || conteudo.startsWith('session_paste ') || conteudo.startsWith('U2FsdGVk');
    const isUrl = conteudo.startsWith('http://') || conteudo.startsWith('https://');

    if (isUrl && !isEncrypted) {
      // É uma URL simples, abre direto
      const result = await window.api.openSession({
        id: `acesso-premium-${acesso.id}`,
        name: acesso.titulo,
        url: conteudo,
        cookies: '[]'
      });
      loadingOverlay.classList.remove('active');
      return;
    }

    // É uma sessao criptografada, usa a mesma API das ferramentas
    // Cria um objeto compativel com o formato de ferramenta
    const ferramentaCompativel = {
      id: acesso.id,
      titulo: acesso.titulo,
      link_ou_conteudo: conteudo
    };

    const result = await window.api.openFerramenta(ferramentaCompativel);

    loadingOverlay.classList.remove('active');

    if (!result.success) {
      alert('Erro ao abrir acesso: ' + result.error);
    }
  } catch (error) {
    loadingOverlay.classList.remove('active');
    console.error('Erro ao abrir acesso premium:', error);
    alert('Erro ao abrir o acesso. Verifique os dados da sessao.');
  }
}

// Mostra modal com detalhes do acesso premium
function showAcessoPremiumModal(acesso) {
  document.getElementById('acessoPremiumTitle').textContent = acesso.titulo;

  // URL
  const rowUrl = document.getElementById('rowUrl');
  const acessoUrl = document.getElementById('acessoUrl');
  if (acesso.url) {
    rowUrl.style.display = 'flex';
    acessoUrl.value = acesso.url;
  } else {
    rowUrl.style.display = 'none';
  }

  // Login
  const rowLogin = document.getElementById('rowLogin');
  const acessoLogin = document.getElementById('acessoLogin');
  if (acesso.login) {
    rowLogin.style.display = 'flex';
    acessoLogin.value = acesso.login;
  } else {
    rowLogin.style.display = 'none';
  }

  // Senha
  const rowSenha = document.getElementById('rowSenha');
  const acessoSenha = document.getElementById('acessoSenha');
  if (acesso.senha) {
    rowSenha.style.display = 'flex';
    acessoSenha.value = acesso.senha;
    acessoSenha.type = 'password'; // Reset para oculto
  } else {
    rowSenha.style.display = 'none';
  }

  // Chave de acesso
  const rowChave = document.getElementById('rowChave');
  const acessoChave = document.getElementById('acessoChave');
  if (acesso.chave_de_acesso) {
    rowChave.style.display = 'flex';
    acessoChave.value = acesso.chave_de_acesso;
  } else {
    rowChave.style.display = 'none';
  }

  // Descricao
  const descricaoEl = document.getElementById('acessoDescricao');
  if (acesso.descricao) {
    descricaoEl.style.display = 'block';
    descricaoEl.innerHTML = `
      <h4>Descricao</h4>
      <div class="description-text">${sanitizeHtml(acesso.descricao)}</div>
    `;
  } else {
    descricaoEl.style.display = 'none';
  }

  acessoPremiumModal.classList.add('active');
}

// =============================================
// MATERIAIS
// =============================================

// Carregar materiais do banco MySQL
async function loadMateriais() {
  try {
    materiais = await window.api.getMateriais();
    renderMateriaisCards();
    console.log('Materiais carregados:', materiais.length);
  } catch (error) {
    console.error('Erro ao carregar materiais:', error);
  }
}

// Renderizar cards dos materiais
function renderMateriaisCards() {
  if (!materiaisGrid) return;

  if (materiais.length === 0) {
    materiaisGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128218;</div>
        <h3>Nenhum material encontrado</h3>
        <p>Verifique a conexao com o banco de dados</p>
      </div>
    `;
    return;
  }

  materiaisGrid.innerHTML = materiais.map(m => {
    // Monta URL completa da capa
    let capaUrl = '';
    if (m.capa) {
      if (m.capa.startsWith('http')) {
        capaUrl = m.capa;
      } else {
        capaUrl = STORAGE_URL + m.capa;
      }
    }

    return `
      <div class="card" data-material-id="${m.id}">
        <div class="card-cover">
          ${capaUrl
            ? `<img src="${escapeHtml(capaUrl)}" alt="${escapeHtml(m.name)}" class="card-img">`
            : '<div class="card-cover-placeholder">&#128218;</div>'
          }
          <span class="card-material-badge">Material</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">${escapeHtml(m.name)}</h3>
          ${m.description
            ? `<p class="card-description">${stripHtml(m.description)}</p>`
            : ''
          }
          <div class="card-actions">
            <button class="btn btn-primary btn-small btn-open-material" data-material-id="${m.id}">
              <span>&#128196;</span> Abrir Material
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Adiciona handler para erros de imagem
  materiaisGrid.querySelectorAll('.card-img').forEach(img => {
    img.addEventListener('error', function() {
      this.parentElement.innerHTML = '<div class="card-cover-placeholder">&#128218;</div><span class="card-material-badge">Material</span>';
    });
  });
}

// =============================================
// TOOLS (MENUS)
// =============================================

// Carregar tools do banco MySQL
async function loadTools() {
  try {
    tools = await window.api.getTools();
    renderToolsSubmenu();
    console.log('Tools carregados:', tools.length);
  } catch (error) {
    console.error('Erro ao carregar tools:', error);
  }
}

// Renderizar submenu de tools
function renderToolsSubmenu() {
  const submenu = document.getElementById('toolsSubmenu');
  if (!submenu) return;

  if (tools.length === 0) {
    submenu.innerHTML = '<span class="nav-submenu-item" style="opacity: 0.5;">Nenhum item</span>';
    return;
  }

  // Helper para renderizar icone (Lucide ou fallback)
  const getIcon = (iconName) => {
    if (typeof window.renderLucideIcon === 'function' && iconName) {
      return window.renderLucideIcon(iconName, 16);
    }
    // Fallback para icone generico SVG
    return window.renderLucideIcon ? window.renderLucideIcon('link', 16) : '<span class="nav-icon">&#128279;</span>';
  };

  submenu.innerHTML = tools.map(tool => {
    // Se tem filhos, renderiza como grupo expansivel
    if (tool.children && tool.children.length > 0) {
      return `
        <div class="nav-submenu-group" data-tool-id="${tool.id}">
          <a href="#" class="nav-submenu-item nav-submenu-parent" data-tool-id="${tool.id}">
            <span class="nav-icon">${getIcon(tool.icon || 'folder')}</span>
            <span class="nav-text">${escapeHtml(tool.label)}</span>
            <span class="nav-arrow">${window.renderLucideIcon ? window.renderLucideIcon('chevron-down', 14) : '&#9662;'}</span>
          </a>
          <div class="nav-submenu-nested" style="display: none;">
            ${tool.children.map(child => `
              <a href="#" class="nav-submenu-item" data-tool-id="${child.id}" data-url="${escapeHtml(child.url || '')}">
                <span class="nav-icon">${getIcon(child.icon || 'link')}</span>
                <span class="nav-text">${escapeHtml(child.label)}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Item simples (sem filhos)
    return `
      <a href="#" class="nav-submenu-item" data-tool-id="${tool.id}" data-url="${escapeHtml(tool.url || '')}">
        <span class="nav-icon">${getIcon(tool.icon || 'link')}</span>
        <span class="nav-text">${escapeHtml(tool.label)}</span>
      </a>
    `;
  }).join('');
}

// Configurar menu de tools
function setupToolsMenu() {
  const toolsMenu = document.getElementById('toolsMenu');
  const toolsToggle = toolsMenu?.querySelector('[data-toggle="tools"]');
  const toolsSubmenu = document.getElementById('toolsSubmenu');

  if (!toolsMenu || !toolsToggle) return;

  // Toggle expandir/colapsar menu principal de tools
  toolsToggle.addEventListener('click', (e) => {
    e.preventDefault();
    toolsMenu.classList.toggle('expanded');
  });

  // Clique nos itens do submenu
  toolsSubmenu.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-submenu-item');
    if (!item) return;

    e.preventDefault();

    // Se e um item pai (tem filhos), expande/colapsa
    if (item.classList.contains('nav-submenu-parent')) {
      const group = item.closest('.nav-submenu-group');
      const nested = group?.querySelector('.nav-submenu-nested');
      if (nested) {
        const isVisible = nested.style.display !== 'none';
        nested.style.display = isVisible ? 'none' : 'block';
        item.querySelector('.nav-arrow').style.transform = isVisible ? '' : 'rotate(180deg)';
      }
      return;
    }

    // Item final - abre a URL
    const url = item.dataset.url;
    if (url) {
      window.open(url, '_blank');
    }
  });
}

// =============================================
// CANVA
// =============================================

// Carregar categorias do Canva
async function loadCanvaCategorias() {
  try {
    canvaCategorias = await window.api.getCanvaCategorias();
    renderCanvaCategoryFilter();
    console.log('Categorias Canva carregadas:', canvaCategorias.length);
  } catch (error) {
    console.error('Erro ao carregar categorias Canva:', error);
  }
}

// Carregar acessos do Canva
async function loadCanvaAcessos() {
  try {
    canvaAcessos = await window.api.getCanvaAcessos();
    console.log('Acessos Canva carregados:', canvaAcessos.length);
  } catch (error) {
    console.error('Erro ao carregar acessos Canva:', error);
  }
}

// Carregar arquivos do Canva com filtros
async function loadCanvaArquivos() {
  try {
    const filtros = {};

    if (currentCanvaCategoria !== 'all') {
      filtros.categoria_id = parseInt(currentCanvaCategoria);
    }

    if (currentCanvaBusca) {
      filtros.busca = currentCanvaBusca;
    }

    canvaArquivos = await window.api.getCanvaArquivos(filtros);
    renderCanvaArquivosCards();
    console.log('Arquivos Canva carregados:', canvaArquivos.length);
  } catch (error) {
    console.error('Erro ao carregar arquivos Canva:', error);
  }
}

// Renderizar filtro de categorias
function renderCanvaCategoryFilter() {
  const filterContainer = document.getElementById('canvaCategoryFilter');
  if (!filterContainer) return;

  filterContainer.innerHTML = `
    <button class="category-btn ${currentCanvaCategoria === 'all' ? 'active' : ''}" data-categoria="all">Todas</button>
    ${canvaCategorias.map(cat => `
      <button class="category-btn ${currentCanvaCategoria == cat.id ? 'active' : ''}" data-categoria="${cat.id}">
        ${escapeHtml(cat.nome)}
      </button>
    `).join('')}
  `;
}

// Renderizar cards de arquivos Canva
function renderCanvaArquivosCards() {
  const grid = document.getElementById('canvaArquivosGrid');
  if (!grid) return;

  if (canvaArquivos.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#127912;</div>
        <h3>Nenhum arquivo encontrado</h3>
        <p>${currentCanvaBusca ? 'Tente outra busca' : 'Adicione arquivos no painel admin'}</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = canvaArquivos.map(a => {
    let capaUrl = '';
    if (a.capa) {
      if (a.capa.startsWith('http')) {
        capaUrl = a.capa;
      } else {
        capaUrl = STORAGE_URL + a.capa;
      }
    }

    return `
      <div class="card" data-canva-id="${a.id}">
        <div class="card-cover">
          ${capaUrl
            ? `<img src="${escapeHtml(capaUrl)}" alt="${escapeHtml(a.nome)}" class="card-img">`
            : '<div class="card-cover-placeholder">&#127912;</div>'
          }
          <span class="card-canva-badge">Canva</span>
        </div>
        <div class="card-body">
          ${a.categoria_nome ? `<span class="card-categoria-badge">${escapeHtml(a.categoria_nome)}</span>` : ''}
          <h3 class="card-title">${escapeHtml(a.nome)}</h3>
          ${a.legenda_sugerida
            ? `<p class="card-description">${stripHtml(a.legenda_sugerida)}</p>`
            : ''
          }
          <div class="card-actions">
            <button class="btn btn-canva btn-small btn-open-canva" data-canva-id="${a.id}">
              <span>&#127912;</span> Ver Arquivo
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Handler para erros de imagem
  grid.querySelectorAll('.card-img').forEach(img => {
    img.addEventListener('error', function() {
      this.parentElement.innerHTML = '<div class="card-cover-placeholder">&#127912;</div><span class="card-canva-badge">Canva</span>';
    });
  });
}

// Renderizar acessos Canva
function renderCanvaAcessos() {
  const container = document.getElementById('canvaAcessoContainer');
  if (!container) return;

  if (canvaAcessos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128279;</div>
        <h3>Nenhum acesso configurado</h3>
        <p>Configure acessos no painel admin</p>
      </div>
    `;
    return;
  }

  container.innerHTML = canvaAcessos.map(a => {
    let capaUrl = '';
    if (a.capa) {
      if (a.capa.startsWith('http')) {
        capaUrl = a.capa;
      } else {
        capaUrl = STORAGE_URL + a.capa;
      }
    }

    return `
      <div class="canva-acesso-card">
        <div class="canva-acesso-cover">
          ${capaUrl
            ? `<img src="${escapeHtml(capaUrl)}" alt="${escapeHtml(a.titulo)}">`
            : '<span class="canva-acesso-cover-placeholder">&#127912;</span>'
          }
        </div>
        <div class="canva-acesso-body">
          <h3 class="canva-acesso-title">${escapeHtml(a.titulo)}</h3>
          ${a.descricao
            ? `<p class="canva-acesso-desc">${stripHtml(a.descricao)}</p>`
            : ''
          }
          <button class="btn btn-canva canva-acesso-btn" data-canva-url="${escapeHtml(a.url)}">
            <span>&#127912;</span> Acessar Canva
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Event delegation para botoes Canva (apenas uma vez)
  if (!container.dataset.listenerAdded) {
    container.dataset.listenerAdded = 'true';
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.canva-acesso-btn');
      if (btn && btn.dataset.canvaUrl) {
        window.open(btn.dataset.canvaUrl, '_blank');
      }
    });
  }
}

// Mostrar modal de arquivo Canva
async function showCanvaArquivoModal(arquivoId) {
  const arquivo = canvaArquivos.find(a => a.id === arquivoId);
  if (!arquivo) {
    // Busca do banco se nao estiver em cache
    const result = await window.api.getCanvaArquivoById(arquivoId);
    if (!result) return;
    Object.assign(arquivo || {}, result);
  }

  const modal = document.getElementById('canvaArquivoModal');
  const title = document.getElementById('canvaArquivoTitle');
  const cover = document.getElementById('canvaArquivoCover');
  const categoria = document.getElementById('canvaArquivoCategoria');
  const legenda = document.getElementById('canvaArquivoLegenda');
  const btnAbrir = document.getElementById('btnAbrirCanva');

  title.textContent = arquivo.nome;

  // Capa
  let capaUrl = '';
  if (arquivo.capa) {
    if (arquivo.capa.startsWith('http')) {
      capaUrl = arquivo.capa;
    } else {
      capaUrl = STORAGE_URL + arquivo.capa;
    }
    cover.innerHTML = `<img src="${capaUrl}" alt="${escapeHtml(arquivo.nome)}" onerror="this.parentElement.innerHTML='<span class=\\'canva-arquivo-cover-placeholder\\'>&#127912;</span>'">`;
  } else {
    cover.innerHTML = '<span class="canva-arquivo-cover-placeholder">&#127912;</span>';
  }

  // Categoria
  if (arquivo.categoria_nome) {
    categoria.innerHTML = `<span class="card-categoria-badge">${escapeHtml(arquivo.categoria_nome)}</span>`;
    categoria.style.display = 'block';
  } else {
    categoria.style.display = 'none';
  }

  // Legenda
  legenda.textContent = arquivo.legenda_sugerida || 'Sem legenda sugerida';

  // Botao abrir no Canva
  btnAbrir.onclick = () => {
    if (arquivo.download) {
      window.open(arquivo.download, '_blank');
    }
  };

  modal.classList.add('active');
}

// Configurar menu Canva
function setupCanvaMenu() {
  const canvaMenu = document.getElementById('canvaMenu');
  const canvaToggle = canvaMenu?.querySelector('[data-toggle="canva"]');
  const canvaSubmenu = document.getElementById('canvaSubmenu');

  if (!canvaMenu || !canvaToggle) return;

  // Toggle expandir/colapsar menu
  canvaToggle.addEventListener('click', (e) => {
    e.preventDefault();
    canvaMenu.classList.toggle('expanded');
  });

  // Clique nos itens do submenu
  canvaSubmenu.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-submenu-item');
    if (!item) return;

    e.preventDefault();
    const page = item.dataset.page;
    if (page) {
      navigateTo(page);
    }
  });
}

// Configurar pagina do Canva
function setupCanvaPage() {
  const searchInput = document.getElementById('canvaSearchInput');
  const btnSearch = document.getElementById('btnCanvaSearch');
  const categoryFilter = document.getElementById('canvaCategoryFilter');
  const arquivosGrid = document.getElementById('canvaArquivosGrid');
  const modal = document.getElementById('canvaArquivoModal');

  if (!searchInput) return;

  // Busca por titulo
  btnSearch.addEventListener('click', () => {
    currentCanvaBusca = searchInput.value.trim();
    loadCanvaArquivos();
  });

  // Enter para buscar
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      currentCanvaBusca = searchInput.value.trim();
      loadCanvaArquivos();
    }
  });

  // Filtro por categoria
  categoryFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn');
    if (!btn) return;

    currentCanvaCategoria = btn.dataset.categoria;

    // Atualiza botao ativo
    categoryFilter.querySelectorAll('.category-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.categoria === currentCanvaCategoria);
    });

    loadCanvaArquivos();
  });

  // Clique nos cards de arquivos
  arquivosGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-open-canva');
    if (btn) {
      e.stopPropagation();
      const id = parseInt(btn.dataset.canvaId);
      showCanvaArquivoModal(id);
      return;
    }

    const card = e.target.closest('.card');
    if (card && !e.target.closest('button')) {
      const id = parseInt(card.dataset.canvaId);
      showCanvaArquivoModal(id);
    }
  });

  // Fechar modal
  document.getElementById('closeCanvaArquivoModal').addEventListener('click', () => {
    modal.classList.remove('active');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Copiar legenda
  document.getElementById('btnCopyLegenda').addEventListener('click', () => {
    const legenda = document.getElementById('canvaArquivoLegenda').textContent;
    navigator.clipboard.writeText(legenda).then(() => {
      const btn = document.getElementById('btnCopyLegenda');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span>&#10003;</span> Copiado!';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    });
  });
}

// Configurar pagina de materiais
function setupMateriaisPage() {
  // Clique nos cards de materiais
  materiaisGrid.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-open-material');
    if (btn) {
      e.stopPropagation();
      const materialId = parseInt(btn.dataset.materialId);
      const material = materiais.find(m => m.id === materialId);
      if (material) {
        await openMaterial(material);
      }
      return;
    }

    // Clique no card
    const card = e.target.closest('.card');
    if (card && !e.target.closest('button')) {
      const materialId = parseInt(card.dataset.materialId);
      const material = materiais.find(m => m.id === materialId);
      if (material) {
        await openMaterial(material);
      }
    }
  });
}

// Abre material em nova janela
async function openMaterial(material) {
  try {
    loadingOverlay.classList.add('active');
    console.log('Abrindo material:', material.name);

    const result = await window.api.openMaterial(material);

    loadingOverlay.classList.remove('active');

    if (!result.success) {
      alert('Erro ao abrir material: ' + result.error);
    }
  } catch (error) {
    loadingOverlay.classList.remove('active');
    console.error('Erro ao abrir material:', error);
    alert('Erro ao abrir o material.');
  }
}

// Configurar event listeners
function setupEventListeners() {
  // Botao atualizar
  document.getElementById('btnRefresh').addEventListener('click', async () => {
    if (currentPage === 'acessos') {
      await loadAcessosPremium();
    } else if (currentPage === 'materiais') {
      await loadMateriais();
    } else {
      await loadFerramentas();
    }
  });

  // Botao logout
  document.getElementById('btnLogout').addEventListener('click', async () => {
    if (confirm('Deseja realmente sair?')) {
      await window.api.logout();
    }
  });

  // Fechar modal descricao
  document.getElementById('closeDescriptionModal').addEventListener('click', () => {
    descriptionModal.classList.remove('active');
  });

  descriptionModal.addEventListener('click', (e) => {
    if (e.target === descriptionModal) {
      descriptionModal.classList.remove('active');
    }
  });

  // Acoes nos cards
  cardsGrid.addEventListener('click', async (e) => {
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
    } else if (btn.classList.contains('btn-report')) {
      e.stopPropagation();
      showReportModal(ferramenta);
    }
  });

  // Clique no card (abrir ferramenta)
  cardsGrid.addEventListener('click', async (e) => {
    const card = e.target.closest('.card');
    if (!card || e.target.closest('button')) return;

    const ferramentaId = parseInt(card.dataset.id);
    const ferramenta = ferramentas.find(f => f.id === ferramentaId);
    if (ferramenta) {
      await openFerramenta(ferramenta);
    }
  });
}

// Abrir ferramenta
async function openFerramenta(ferramenta) {
  // Verifica se o usuario tem acesso
  if (!ferramenta.temAcesso) {
    showUpgradeModal();
    return;
  }

  // Verifica o status da ferramenta
  if (ferramenta.status === 'manutencao') {
    alert('Esta ferramenta esta em manutencao. Tente novamente mais tarde.');
    return;
  }

  if (ferramenta.status === 'offline') {
    alert('Esta ferramenta esta offline no momento.');
    return;
  }

  if (ferramenta.status !== 'online') {
    alert('Esta ferramenta nao esta disponivel no momento.');
    return;
  }

  try {
    loadingOverlay.classList.add('active');

    console.log('Abrindo ferramenta:', ferramenta.titulo);
    console.log('Tipo acesso:', ferramenta.tipo_acesso);
    console.log('Conteudo (100 chars):', ferramenta.link_ou_conteudo?.substring(0, 100));

    // Verifica se o conteudo parece ser uma sessao criptografada
    const conteudo = ferramenta.link_ou_conteudo || '';
    const isEncrypted = conteudo.startsWith('filehub ') || conteudo.startsWith('session_paste ') || conteudo.startsWith('U2FsdGVk');
    const isUrl = conteudo.startsWith('http://') || conteudo.startsWith('https://');

    console.log('É criptografado?', isEncrypted);
    console.log('É URL?', isUrl);

    if (isUrl && !isEncrypted) {
      // É uma URL simples, abre direto
      const result = await window.api.openSession({
        id: `ferramenta-${ferramenta.id}`,
        name: ferramenta.titulo,
        url: conteudo,
        cookies: '[]'
      });
      loadingOverlay.classList.remove('active');
      return;
    }

    // É uma sessao criptografada, descriptografa e abre
    const result = await window.api.openFerramenta(ferramenta);

    console.log('Resultado openFerramenta:', result);

    loadingOverlay.classList.remove('active');

    if (!result || !result.success) {
      // Se precisa configurar e usuario e admin, oferece opcao de configurar
      if (result && result.needsSetup && result.isAdmin) {
        // Mostra modal para configurar URL
        const url = await showSessionSetupModal(ferramenta.titulo);

        if (url && url.startsWith('http')) {
          loadingOverlay.classList.add('active');
          const blankResult = await window.api.openFerramentaBlank(ferramenta, url);
          loadingOverlay.classList.remove('active');

          if (blankResult.success) {
            showSessionInstructions();
          } else {
            alert('Erro ao abrir sessao: ' + blankResult.error);
          }
        }
      } else if (result && result.needsSetup) {
        alert('Esta ferramenta ainda nao foi configurada.\n\nPeca ao administrador para configurar a sessao.');
      } else {
        alert('Erro ao abrir ferramenta: ' + (result?.error || 'Erro desconhecido'));
      }
    }
  } catch (error) {
    loadingOverlay.classList.remove('active');
    console.error('Erro ao abrir ferramenta (catch):', error);
    alert('Erro ao abrir a ferramenta: ' + error.message);
  }
}

// Mostra modal de upgrade
function showUpgradeModal() {
  const planoAtual = currentUser?.plano_nome || 'Atual';
  alert(`Seu plano ${planoAtual} nao tem acesso a esta ferramenta.\n\nFaca um upgrade para continuar.`);
}

// Mostra modal para configurar URL da sessao
function showSessionSetupModal(ferramentaTitulo) {
  return new Promise((resolve) => {
    const modal = document.getElementById('sessionSetupModal');
    const title = document.getElementById('sessionSetupTitle');
    const urlInput = document.getElementById('sessionSetupUrl');
    const btnConfirm = document.getElementById('btnConfirmSessionSetup');
    const btnCancel = document.getElementById('btnCancelSessionSetup');
    const btnClose = document.getElementById('closeSessionSetup');

    title.textContent = `Configurar: ${ferramentaTitulo}`;
    urlInput.value = 'https://';

    const closeModal = (url = null) => {
      modal.classList.remove('active');
      resolve(url);
    };

    const handleConfirm = () => {
      const url = urlInput.value.trim();
      if (url && url.startsWith('http')) {
        closeModal(url);
      } else {
        urlInput.style.borderColor = '#ff4444';
        urlInput.focus();
      }
    };

    btnConfirm.onclick = handleConfirm;
    btnCancel.onclick = () => closeModal(null);
    btnClose.onclick = () => closeModal(null);

    modal.onclick = (e) => {
      if (e.target === modal) closeModal(null);
    };

    urlInput.onkeydown = (e) => {
      urlInput.style.borderColor = '#444';
      if (e.key === 'Enter') handleConfirm();
      if (e.key === 'Escape') closeModal(null);
    };

    modal.classList.add('active');
    urlInput.focus();
    urlInput.select();
  });
}

// Mostra instrucoes apos abrir sessao em branco
function showSessionInstructions() {
  const modal = document.getElementById('descriptionModal');
  const titleEl = modal.querySelector('.modal-header h2') || modal.querySelector('h2');
  const bodyEl = modal.querySelector('.modal-body') || modal.querySelector('.description-content');

  if (titleEl) titleEl.textContent = 'Sessao Aberta!';
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="text-align: left; line-height: 1.8;">
        <p><strong>Siga os passos para salvar a sessao:</strong></p>
        <ol style="margin: 15px 0; padding-left: 20px;">
          <li>Faca login normalmente na janela que abriu</li>
          <li>Apos logar com sucesso, va no menu <strong>Sessao</strong></li>
          <li>Clique em <strong>Salvar Sessao</strong> (ou pressione <kbd>Ctrl+S</kbd>)</li>
        </ol>
        <p style="color: #4CAF50;"><strong>Pronto!</strong> A sessao sera salva e outros usuarios poderao usar automaticamente!</p>
      </div>
    `;
  }

  modal.classList.add('active');
}

// Mostrar descricao
function showDescription(ferramenta) {
  document.getElementById('descriptionTitle').textContent = ferramenta.titulo;

  // Renderiza HTML da descricao (remove scripts por seguranca)
  const descHtml = sanitizeHtml(ferramenta.descricao || 'Sem descricao disponivel.');

  document.getElementById('descriptionContent').innerHTML = `
    <div class="description-text">${descHtml}</div>
    ${ferramenta.login ? `<p><strong>Login:</strong> ${escapeHtml(ferramenta.login)}</p>` : ''}
    ${ferramenta.senha ? `<p><strong>Senha:</strong> ${escapeHtml(ferramenta.senha)}</p>` : ''}
  `;
  descriptionModal.classList.add('active');
}

// Sanitiza HTML removendo scripts e eventos perigosos
function sanitizeHtml(html) {
  if (!html) return '';

  // Remove tags script e eventos inline
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

// Utilitarios
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Remove tags HTML para preview
function stripHtml(html) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// =============================================
// SISTEMA DE REPORTS
// =============================================

// Mostra modal de report
function showReportModal(ferramenta) {
  const modal = document.getElementById('reportModal');
  const titleEl = document.getElementById('reportModalTitle');
  const idInput = document.getElementById('reportFerramentaId');
  const nomeInput = document.getElementById('reportFerramentaNome');
  const motivoInput = document.getElementById('reportMotivo');

  titleEl.textContent = 'Reportar Problema';
  idInput.value = ferramenta.id;
  nomeInput.value = ferramenta.titulo;
  motivoInput.value = '';

  modal.classList.add('active');
  motivoInput.focus();
}

// Fecha modal de report
function closeReportModal() {
  const modal = document.getElementById('reportModal');
  modal.classList.remove('active');
}

// Envia o report
async function sendReport() {
  const ferramentaId = parseInt(document.getElementById('reportFerramentaId').value);
  const motivo = document.getElementById('reportMotivo').value.trim();

  if (!motivo) {
    alert('Por favor, descreva o problema encontrado.');
    return;
  }

  if (motivo.length < 10) {
    alert('Por favor, descreva o problema com mais detalhes (minimo 10 caracteres).');
    return;
  }

  try {
    const result = await window.api.createReport({
      ferramenta_id: ferramentaId,
      motivo: motivo,
      tipo_report: 'ferramenta'
    });

    if (result.success) {
      closeReportModal();
      alert('Report enviado com sucesso! Nossa equipe ira analisar o problema.');
    } else {
      alert('Erro ao enviar report: ' + (result.error || 'Erro desconhecido'));
    }
  } catch (error) {
    console.error('Erro ao enviar report:', error);
    alert('Erro ao enviar report. Tente novamente.');
  }
}

// Configura listeners do modal de report
function setupReportModal() {
  const modal = document.getElementById('reportModal');
  const closeBtn = document.getElementById('closeReportModal');
  const cancelBtn = document.getElementById('btnCancelReport');
  const sendBtn = document.getElementById('btnSendReport');

  if (!modal) return;

  closeBtn.addEventListener('click', closeReportModal);
  cancelBtn.addEventListener('click', closeReportModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeReportModal();
  });

  sendBtn.addEventListener('click', sendReport);

  // Enter para enviar (com Ctrl)
  document.getElementById('reportMotivo').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      sendReport();
    }
  });
}

// =============================================
// PLANOS DA PLATAFORMA
// =============================================

let planosPlataforma = [];

async function loadPlanos() {
  const planosGrid = document.getElementById('planosGrid');
  if (!planosGrid) return;

  planosGrid.innerHTML = '<div class="loading-message">Carregando planos...</div>';

  try {
    const result = await window.api.getPlanos();
    if (result.success) {
      planosPlataforma = result.data;
      renderPlanos();
    } else {
      planosGrid.innerHTML = '<div class="error-message">Erro ao carregar planos</div>';
    }
  } catch (error) {
    console.error('Erro ao carregar planos:', error);
    planosGrid.innerHTML = '<div class="error-message">Erro ao carregar planos</div>';
  }
}

function renderPlanos() {
  const planosGrid = document.getElementById('planosGrid');
  if (!planosGrid) return;

  if (planosPlataforma.length === 0) {
    planosGrid.innerHTML = '<div class="empty-message">Nenhum plano disponivel</div>';
    return;
  }

  planosGrid.innerHTML = planosPlataforma.map(plano => {
    // Parse recursos
    let recursos = [];
    if (plano.recursos) {
      try {
        recursos = typeof plano.recursos === 'string' ? JSON.parse(plano.recursos) : plano.recursos;
      } catch (e) {
        recursos = [];
      }
    }

    // Icone baseado no tipo
    const icones = {
      'rocket': '&#128640;',
      'zap': '&#9889;',
      'star': '&#11088;',
      'crown': '&#128081;',
      'gem': '&#128142;'
    };
    const icone = icones[plano.icone] || '&#11088;';

    // Formata valor
    const valor = parseFloat(plano.valor || 0).toFixed(2).replace('.', ',');
    const valorOriginal = plano.valor_original ? parseFloat(plano.valor_original).toFixed(2).replace('.', ',') : null;

    return `
      <div class="plano-card ${plano.is_popular ? 'popular' : ''}" style="--plano-color: ${plano.cor_destaque || '#157f67'}">
        ${plano.is_popular ? '<div class="plano-badge">Mais Popular</div>' : ''}
        <div class="plano-icon">${icone}</div>
        <h3 class="plano-nome">${escapeHtml(plano.nome)}</h3>
        <p class="plano-descricao">${escapeHtml(plano.descricao || '')}</p>
        <div class="plano-preco">
          ${valorOriginal ? `<span class="preco-original">R$ ${valorOriginal}</span>` : ''}
          <span class="preco-atual">R$ ${valor}</span>
          <span class="preco-periodo">/mes</span>
        </div>
        <ul class="plano-recursos">
          ${recursos.map(r => `<li><span class="check">&#10003;</span> ${escapeHtml(r)}</li>`).join('')}
        </ul>
        <button class="btn btn-ver-detalhes" data-action="ver-detalhes">
          Ver Detalhes
        </button>
        ${plano.link_pagamento ? `
          <a href="${escapeHtml(plano.link_pagamento)}" target="_blank" class="btn btn-plano" style="background-color: ${plano.cor_destaque || '#157f67'}">
            Assinar Agora
          </a>
        ` : `
          <button class="btn btn-plano btn-disabled" disabled>
            Em breve
          </button>
        `}
      </div>
    `;
  }).join('');
}

// =============================================
// DASHBOARD - BANNERS E COVERS
// =============================================

let dashboardBanners = [];
let dashboardCovers = [];
let currentBannerIndex = 0;
let bannerInterval = null;

async function loadDashboard() {
  await Promise.all([
    loadDashboardBanners(),
    loadDashboardCovers()
  ]);
}

async function loadDashboardBanners() {
  const container = document.getElementById('dashboardBanners');
  if (!container) return;

  try {
    const result = await window.api.getDashboardBanners();
    if (result.success && result.data.length > 0) {
      dashboardBanners = result.data;
      renderDashboardBanners();
      startBannerAutoPlay();
    } else {
      container.innerHTML = '<div class="banner-placeholder">Nenhum banner disponivel</div>';
    }
  } catch (error) {
    console.error('Erro ao carregar banners:', error);
    container.innerHTML = '<div class="banner-placeholder">Erro ao carregar banners</div>';
  }
}

function renderDashboardBanners() {
  const container = document.getElementById('dashboardBanners');
  const dotsContainer = document.getElementById('bannerDots');
  if (!container) return;

  container.innerHTML = dashboardBanners.map((banner, index) => {
    const imageUrl = banner.image.startsWith('http') ? banner.image : `https://filehub.space/storage/${banner.image}`;
    return `
      <div class="banner-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
        ${banner.url ? `<a href="${escapeHtml(banner.url)}" target="_blank">` : ''}
          <img src="${escapeHtml(imageUrl)}" alt="Banner ${index + 1}" class="banner-img">
        ${banner.url ? '</a>' : ''}
      </div>
    `;
  }).join('');

  // Cria dots de navegacao
  if (dotsContainer && dashboardBanners.length > 1) {
    dotsContainer.innerHTML = dashboardBanners.map((_, index) =>
      `<span class="banner-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`
    ).join('');

    // Event listeners para dots
    dotsContainer.querySelectorAll('.banner-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        goToBanner(parseInt(dot.dataset.index));
      });
    });
  }
}

function startBannerAutoPlay() {
  if (bannerInterval) clearInterval(bannerInterval);
  if (dashboardBanners.length <= 1) return;

  bannerInterval = setInterval(() => {
    nextBanner();
  }, 5000); // Muda a cada 5 segundos
}

function nextBanner() {
  currentBannerIndex = (currentBannerIndex + 1) % dashboardBanners.length;
  updateBannerDisplay();
}

function goToBanner(index) {
  currentBannerIndex = index;
  updateBannerDisplay();
}

function updateBannerDisplay() {
  const slides = document.querySelectorAll('.banner-slide');
  const dots = document.querySelectorAll('.banner-dot');

  slides.forEach((slide, index) => {
    slide.classList.toggle('active', index === currentBannerIndex);
  });

  dots.forEach((dot, index) => {
    dot.classList.toggle('active', index === currentBannerIndex);
  });
}

async function loadDashboardCovers() {
  const container = document.getElementById('dashboardCovers');
  if (!container) return;

  try {
    const result = await window.api.getDashboardCovers();
    if (result.success && result.data.length > 0) {
      dashboardCovers = result.data;
      renderDashboardCovers();
    } else {
      container.innerHTML = '<div class="covers-placeholder">Nenhum destaque disponivel</div>';
    }
  } catch (error) {
    console.error('Erro ao carregar covers:', error);
    container.innerHTML = '<div class="covers-placeholder">Erro ao carregar destaques</div>';
  }
}

function renderDashboardCovers() {
  const container = document.getElementById('dashboardCovers');
  if (!container) return;

  container.innerHTML = dashboardCovers.map(cover => {
    const imageUrl = cover.image.startsWith('http') ? cover.image : `https://filehub.space/storage/${cover.image}`;
    return `
      <div class="cover-card" ${cover.url ? `data-url="${escapeHtml(cover.url)}"` : ''}>
        <img src="${escapeHtml(imageUrl)}" alt="Cover" class="cover-img">
      </div>
    `;
  }).join('');

  // Adiciona event listeners para os covers
  container.querySelectorAll('.cover-card[data-url]').forEach(card => {
    card.addEventListener('click', () => {
      const url = card.dataset.url;
      if (url) {
        window.open(url, '_blank');
      }
    });
  });
}

// =============================================
// MODAL DETALHES DOS PLANOS
// =============================================

let planosDetalhes = [];

async function openPlanosDetalhesModal() {
  const modal = document.getElementById('planosDetalhesModal');
  if (!modal) return;

  modal.classList.add('active');

  // Carrega detalhes se ainda nao carregou
  if (planosDetalhes.length === 0) {
    await loadPlanosDetalhes();
  }

  // Renderiza a primeira aba (cotas)
  renderPlanosDetalhesTab('cotas');
}

async function loadPlanosDetalhes() {
  try {
    const result = await window.api.getPlanosDetalhes();
    if (result.success) {
      planosDetalhes = result.data;
    }
  } catch (error) {
    console.error('Erro ao carregar detalhes dos planos:', error);
  }
}

function renderPlanosDetalhesTab(categoria) {
  const tbody = document.getElementById('planosDetalhesBody');
  if (!tbody) return;

  // Filtra por categoria
  const detalhes = planosDetalhes.filter(d => d.categoria === categoria && d.status === 1);

  // Ordena por ordem
  detalhes.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  if (detalhes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 20px; color: #888;">
          Nenhum recurso disponivel nesta categoria
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = detalhes.map(d => {
    // Renderiza icone ou emoji
    const icone = renderDetalheIcone(d.icone);

    return `
      <tr>
        <td class="recurso-nome">${icone} ${escapeHtml(d.nome_recurso)}</td>
        <td class="valor-plano">${renderValorPlano(d.plano_1)}</td>
        <td class="valor-plano">${renderValorPlano(d.plano_2)}</td>
        <td class="valor-plano">${renderValorPlano(d.plano_3)}</td>
        <td class="valor-plano">${renderValorPlano(d.plano_4)}</td>
      </tr>
    `;
  }).join('');
}

function renderDetalheIcone(icone) {
  if (!icone) return '';

  // Se for emoji (tem certos caracteres ou unicode)
  if (/[\u{1F300}-\u{1FAF8}]/u.test(icone) || icone.length <= 2) {
    return `<span class="recurso-emoji">${icone}</span>`;
  }

  // Se for nome de icone conhecido, poderia usar uma imagem ou SVG
  const iconesConhecidos = {
    'freepik': 'https://filehub.space/icons/freepik.svg',
    'envato': 'https://filehub.space/icons/envato.svg',
    'adobestock': 'https://filehub.space/icons/adobestock.svg',
    'flaticon': 'https://filehub.space/icons/flaticon.svg',
    'vecteezy': 'https://filehub.space/icons/vecteezy.svg',
    'shutterstock': 'https://filehub.space/icons/shutterstock.svg',
    'istock': 'https://filehub.space/icons/istock.svg'
  };

  if (iconesConhecidos[icone.toLowerCase()]) {
    return `<img src="${iconesConhecidos[icone.toLowerCase()]}" alt="${icone}" class="recurso-icon-img" onerror="this.style.display='none'">`;
  }

  return `<span class="recurso-emoji">${icone}</span>`;
}

function renderValorPlano(valor) {
  if (!valor) return '<span class="valor-no">-</span>';

  // Verifica se e positivo (check, numero)
  if (valor === '✓' || valor === 'V' || valor.includes('✓')) {
    return '<span class="valor-yes">&#10003;</span>';
  }

  // Verifica se e negativo (X)
  if (valor === '❌' || valor === 'X' || valor === '-') {
    return '<span class="valor-no">&#10007;</span>';
  }

  // Se for numero/texto (ex: "10 /Dia")
  return `<span class="valor-text">${escapeHtml(valor)}</span>`;
}

function closePlanosDetalhesModal() {
  const modal = document.getElementById('planosDetalhesModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function setupPlanosDetalhesModal() {
  const modal = document.getElementById('planosDetalhesModal');
  if (!modal) return;

  // Fecha ao clicar fora
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closePlanosDetalhesModal();
    }
  });

  // Botao fechar
  const closeBtn = document.getElementById('closePlanosDetalhesModal');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePlanosDetalhesModal);
  }

  // Tabs
  document.querySelectorAll('.planos-detalhes-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active de todas
      document.querySelectorAll('.planos-detalhes-tab').forEach(t => t.classList.remove('active'));
      // Adiciona active na clicada
      tab.classList.add('active');
      // Renderiza conteudo
      renderPlanosDetalhesTab(tab.dataset.categoria);
    });
  });

  // Event delegation para botoes "Ver Detalhes" nos planos
  const planosGrid = document.getElementById('planosGrid');
  if (planosGrid) {
    planosGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="ver-detalhes"]');
      if (btn) {
        openPlanosDetalhesModal();
      }
    });
  }
}

// Expoe funcao globalmente
window.openPlanosDetalhesModal = openPlanosDetalhesModal;

// Expoe funcoes globalmente para outros scripts (admin.js)
window.escapeHtml = escapeHtml;
window.stripHtml = stripHtml;
window.navigateTo = navigateTo;
window.getCurrentUser = () => currentUser;
