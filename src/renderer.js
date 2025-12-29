// Estado da aplicacao
let ferramentas = [];
let currentUser = null;

// Elementos DOM
const cardsGrid = document.getElementById('cardsGrid');
const connectionStatus = document.getElementById('connectionStatus');
const descriptionModal = document.getElementById('descriptionModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const userNameEl = document.getElementById('userName');
const userExpiryEl = document.getElementById('userExpiry');

// Inicializacao
document.addEventListener('DOMContentLoaded', async () => {
  console.log('FileHub iniciando...');
  await loadUserInfo();
  await loadFerramentas();
  setupEventListeners();
});

// Carrega informacoes do usuario logado
async function loadUserInfo() {
  try {
    currentUser = await window.api.getCurrentUser();
    if (currentUser) {
      // Mostra nome e plano
      userNameEl.textContent = `${currentUser.name} (${currentUser.plano_nome || 'Plano'})`;

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
        <div class="empty-state-icon">📂</div>
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
            : '<div class="card-cover-placeholder">🔧</div>'
          }
          ${!f.temAcesso ? '<div class="card-lock-overlay"><span class="lock-icon">🔒</span></div>' : ''}
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
      this.parentElement.innerHTML = '<div class="card-cover-placeholder">🔧</div>';
    });
  });
}

// Retorna o botao de acesso baseado no status e permissao
function getBotaoAcesso(ferramenta) {
  // Se usuario nao tem acesso
  if (!ferramenta.temAcesso) {
    return `<button class="btn btn-locked btn-small" data-id="${ferramenta.id}" disabled>
      <span class="btn-lock-icon">🔒</span> Upgrade
    </button>`;
  }

  // Baseado no status da ferramenta
  switch (ferramenta.status) {
    case 'online':
      return `<button class="btn btn-primary btn-small btn-open" data-id="${ferramenta.id}">Acessar</button>`;

    case 'manutencao':
      return `<button class="btn btn-warning btn-small" data-id="${ferramenta.id}" disabled>
        <span>⚠️</span> Manutencao
      </button>`;

    case 'offline':
      return `<button class="btn btn-offline btn-small" data-id="${ferramenta.id}" disabled>
        <span>⛔</span> Offline
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
