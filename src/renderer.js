// Estado da aplicacao
let ferramentas = [];
let currentUser = null;
let currentPage = 'ferramentas';

// Elementos DOM
const cardsGrid = document.getElementById('cardsGrid');
const connectionStatus = document.getElementById('connectionStatus');
const descriptionModal = document.getElementById('descriptionModal');
const avatarModal = document.getElementById('avatarModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const userNameEl = document.getElementById('userName');
const userPlanEl = document.getElementById('userPlan');
const userExpiryEl = document.getElementById('userExpiry');
const userAvatarEl = document.getElementById('userAvatar');
const pageTitleEl = document.getElementById('pageTitle');

// Inicializacao
document.addEventListener('DOMContentLoaded', async () => {
  console.log('FileHub iniciando...');
  await loadUserInfo();
  await loadFerramentas();
  setupEventListeners();
  setupNavigation();
  setupProfilePage();
});

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

// Atualiza exibicao do avatar em todos os lugares
function updateAvatarDisplay() {
  if (!currentUser) return;

  const avatarLetter = (currentUser.name || 'U').charAt(0).toUpperCase();

  // Avatar na sidebar
  if (currentUser.avatar) {
    userAvatarEl.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar">`;
  } else {
    userAvatarEl.innerHTML = `<span>${avatarLetter}</span>`;
  }

  // Avatar no perfil
  const profileAvatarLetter = document.getElementById('profileAvatarLetter');
  const profileAvatarImg = document.getElementById('profileAvatarImg');

  if (profileAvatarLetter && profileAvatarImg) {
    if (currentUser.avatar) {
      profileAvatarLetter.style.display = 'none';
      profileAvatarImg.src = currentUser.avatar;
      profileAvatarImg.style.display = 'block';
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

// URL base para as capas
const STORAGE_URL = 'https://filehub.space/storage/';

// Renderizar cards das ferramentas
function renderCards() {
  if (ferramentas.length === 0) {
    cardsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">&#128194;</div>
        <h3>Nenhuma ferramenta encontrada</h3>
        <p>Verifique a conexao com o banco de dados</p>
      </div>
    `;
    return;
  }

  cardsGrid.innerHTML = ferramentas.map(f => {
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
          <span class="card-tipo">${f.tipo_acesso === 'sessao' ? 'Sessao' : 'Link'}</span>
          <h3 class="card-title">${escapeHtml(f.titulo)}</h3>
          ${f.descricao
            ? `<p class="card-description">${stripHtml(f.descricao)}</p>`
            : ''
          }
          <div class="card-actions">
            ${botaoAcesso}
            ${f.descricao ? `<button class="btn btn-secondary btn-small btn-info" data-id="${f.id}">Info</button>` : ''}
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

  // Esconde todas as paginas
  document.getElementById('pageFerramentas').classList.add('hidden');
  document.getElementById('pagePerfil').classList.add('hidden');

  // Mostra a pagina selecionada
  if (page === 'ferramentas') {
    document.getElementById('pageFerramentas').classList.remove('hidden');
    pageTitleEl.textContent = 'Ferramentas';
    connectionStatus.classList.remove('hidden');
  } else if (page === 'perfil') {
    document.getElementById('pagePerfil').classList.remove('hidden');
    pageTitleEl.textContent = 'Meu Perfil';
    connectionStatus.classList.add('hidden');
    loadProfileData();
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

// Configurar event listeners
function setupEventListeners() {
  // Botao atualizar
  document.getElementById('btnRefresh').addEventListener('click', async () => {
    await loadFerramentas();
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

    loadingOverlay.classList.remove('active');

    if (!result.success) {
      alert('Erro ao abrir ferramenta: ' + result.error);
    }
  } catch (error) {
    loadingOverlay.classList.remove('active');
    console.error('Erro ao abrir ferramenta:', error);
    alert('Erro ao abrir a ferramenta. Verifique os dados da sessao.');
  }
}

// Mostra modal de upgrade
function showUpgradeModal() {
  const planoAtual = currentUser?.plano_nome || 'Atual';
  alert(`Seu plano ${planoAtual} nao tem acesso a esta ferramenta.\n\nFaca um upgrade para continuar.`);
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
