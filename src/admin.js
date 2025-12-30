// =============================================
// ADMIN - AREA ADMINISTRATIVA
// =============================================

// Estado do admin
let adminUsers = [];
let adminFerramentas = [];
let adminAcessosPremium = [];
let adminCanvaCategorias = [];
let adminCanvaArquivos = [];
let adminCanvaAcessos = [];
let adminTools = [];
let adminPlanos = [];
let adminPlanosPlataforma = [];
let adminPlanosDetalhes = [];
let currentFilterCategoria = '';
let currentEditType = null;
let currentEditId = null;

// Verifica se o usuario e admin
function isAdmin() {
  const user = window.getCurrentUser ? window.getCurrentUser() : null;
  return user && (user.nivel_acesso === 'admin' || user.plano_id === 8);
}

// Inicializa o menu admin se for admin
function initAdminMenu() {
  if (isAdmin()) {
    const adminMenu = document.getElementById('adminMenu');
    if (adminMenu) {
      adminMenu.classList.remove('hidden');
    }
    setupAdminMenu();
  }
}

// Configura o menu admin
function setupAdminMenu() {
  const adminMenu = document.getElementById('adminMenu');
  const adminToggle = adminMenu?.querySelector('[data-toggle="admin"]');
  const adminSubmenu = document.getElementById('adminSubmenu');

  if (!adminMenu || !adminToggle) return;

  // Toggle expandir/colapsar
  adminToggle.addEventListener('click', (e) => {
    e.preventDefault();
    adminMenu.classList.toggle('expanded');
  });

  // Clique nos itens do submenu
  adminSubmenu.addEventListener('click', (e) => {
    const item = e.target.closest('.nav-submenu-item');
    if (!item) return;

    e.preventDefault();
    const page = item.dataset.page;
    if (page) {
      navigateTo(page);
    }
  });

  // Setup tabs do Canva admin
  setupAdminCanvaTabs();

  // Setup modal
  setupAdminModal();

  // Setup botoes de adicionar
  setupAdminAddButtons();
}

// Setup tabs do Canva admin
function setupAdminCanvaTabs() {
  const tabs = document.querySelectorAll('.admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Remove active de todas as tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Esconde todos os conteudos
      document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
      });

      // Mostra o conteudo correto
      if (tabName === 'categorias') {
        document.getElementById('tabCategorias').classList.add('active');
      } else if (tabName === 'arquivos') {
        document.getElementById('tabArquivos').classList.add('active');
      } else if (tabName === 'acessos-canva') {
        document.getElementById('tabAcessosCanva').classList.add('active');
      }
    });
  });
}

// Setup modal de edicao
function setupAdminModal() {
  const modal = document.getElementById('adminEditModal');
  const closeBtn = document.getElementById('closeAdminEditModal');
  const cancelBtn = document.getElementById('btnCancelEdit');
  const saveBtn = document.getElementById('btnSaveEdit');
  const deleteBtn = document.getElementById('btnDeleteEdit');

  if (!modal) return;

  closeBtn.addEventListener('click', () => closeAdminModal());
  cancelBtn.addEventListener('click', () => closeAdminModal());

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeAdminModal();
  });

  saveBtn.addEventListener('click', () => saveAdminEdit());
  deleteBtn.addEventListener('click', () => deleteAdminItem());

  // Event delegation para botoes de acao nas tabelas
  setupAdminTableEventDelegation();
}

// Event delegation para botoes edit/delete nas tabelas admin
function setupAdminTableEventDelegation() {
  // Lista de todas as tabelas admin
  const tableIds = [
    'adminUsersBody',
    'adminFerramentasBody',
    'adminAcessosBody',
    'adminCanvaCategoriasBody',
    'adminCanvaArquivosBody',
    'adminCanvaAcessosBody',
    'adminToolsBody',
    'adminPlanosBody',
    'adminPlanosDetalhesBody',
    'adminBannersBody',
    'adminCoversBody',
    'adminMenuBody'
  ];

  tableIds.forEach(tableId => {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;

    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const type = btn.dataset.type;
      const id = parseInt(btn.dataset.id);

      if (action === 'edit') {
        openAdminModal(type, id);
      } else if (action === 'delete') {
        confirmDelete(type, id);
      }
    });
  });
}

// Setup botoes de adicionar
function setupAdminAddButtons() {
  // Ferramentas
  document.getElementById('btnAddFerramenta')?.addEventListener('click', () => {
    openAdminModal('ferramenta', null);
  });

  // Acessos Premium
  document.getElementById('btnAddAcesso')?.addEventListener('click', () => {
    openAdminModal('acesso-premium', null);
  });

  // Canva Categorias
  document.getElementById('btnAddCanvaCategoria')?.addEventListener('click', () => {
    openAdminModal('canva-categoria', null);
  });

  // Canva Arquivos
  document.getElementById('btnAddCanvaArquivo')?.addEventListener('click', () => {
    openAdminModal('canva-arquivo', null);
  });

  // Canva Acessos
  document.getElementById('btnAddCanvaAcesso')?.addEventListener('click', () => {
    openAdminModal('canva-acesso', null);
  });

  // Tools
  document.getElementById('btnAddTool')?.addEventListener('click', () => {
    openAdminModal('tool', null);
  });

  // Planos Plataforma
  document.getElementById('btnAddPlano')?.addEventListener('click', () => {
    openAdminModal('plano-plataforma', null);
  });

  // Planos Detalhes
  document.getElementById('btnAddPlanoDetalhe')?.addEventListener('click', () => {
    openAdminModal('plano-detalhe', null);
  });

  // Filtro de categoria dos detalhes
  document.getElementById('filterCategoriaDetalhe')?.addEventListener('change', (e) => {
    currentFilterCategoria = e.target.value;
    renderAdminPlanosDetalhes();
  });

  // Setup busca de usuarios
  setupAdminUserSearch();
}

// Setup busca de usuarios
function setupAdminUserSearch() {
  const searchInput = document.getElementById('adminUserSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterAdminUsers(searchTerm);
  });
}

// Filtrar usuarios na tabela
function filterAdminUsers(searchTerm) {
  const tbody = document.getElementById('adminUsersBody');
  if (!tbody) return;

  if (!searchTerm) {
    // Mostra todos os usuarios
    renderAdminUsers();
    return;
  }

  // Filtra usuarios pelo nome ou email
  const filteredUsers = adminUsers.filter(user => {
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(searchTerm) || email.includes(searchTerm);
  });

  // Renderiza usuarios filtrados
  tbody.innerHTML = filteredUsers.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${escapeHtml(user.name || '')}</td>
      <td>${escapeHtml(user.email || '')}</td>
      <td>${getPlanoName(user.plano_id)}</td>
      <td><span class="status-badge ${user.status === 1 ? 'active' : 'inactive'}">${user.status === 1 ? 'Ativo' : 'Inativo'}</span></td>
      <td>${user.data_expiracao ? new Date(user.data_expiracao).toLocaleDateString('pt-BR') : '-'}</td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="usuario" data-id="${user.id}">Editar</button>
      </td>
    </tr>
  `).join('');

  // Mostra mensagem se nao encontrou
  if (filteredUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 20px; color: #888;">
          Nenhum usuario encontrado para "${escapeHtml(searchTerm)}"
        </td>
      </tr>
    `;
  }
}

// =============================================
// CARREGAR DADOS ADMIN
// =============================================

async function loadAdminUsers() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetUsers();
  if (result.success) {
    adminUsers = result.data;
    renderAdminUsers();
  }
}

async function loadAdminFerramentas() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetFerramentas();
  if (result.success) {
    adminFerramentas = result.data;
    renderAdminFerramentas();
  }
}

async function loadAdminAcessosPremium() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetAcessosPremium();
  if (result.success) {
    adminAcessosPremium = result.data;
    renderAdminAcessosPremium();
  }
}

async function loadAdminCanvaCategorias() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetCanvaCategorias();
  if (result.success) {
    adminCanvaCategorias = result.data;
    renderAdminCanvaCategorias();
  }
}

async function loadAdminCanvaArquivos() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetCanvaArquivos();
  if (result.success) {
    adminCanvaArquivos = result.data;
    renderAdminCanvaArquivos();
  }
}

async function loadAdminCanvaAcessos() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetCanvaAcessos();
  if (result.success) {
    adminCanvaAcessos = result.data;
    renderAdminCanvaAcessos();
  }
}

async function loadAdminTools() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetTools();
  if (result.success) {
    adminTools = result.data;
    renderAdminTools();
  }
}

async function loadAdminPlanos() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetPlanos();
  if (result.success) {
    adminPlanos = result.data;
  }
}

async function loadAdminPlanosPlataforma() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetPlanosPlataforma();
  if (result.success) {
    adminPlanosPlataforma = result.data;
    renderAdminPlanosPlataforma();
  }
}

async function loadAdminPlanosDetalhes() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetPlanosDetalhes();
  if (result.success) {
    adminPlanosDetalhes = result.data;
    renderAdminPlanosDetalhes();
  }
}

// =============================================
// RENDERIZAR TABELAS ADMIN
// =============================================

function renderAdminUsers() {
  const tbody = document.getElementById('adminUsersBody');
  if (!tbody) return;

  tbody.innerHTML = adminUsers.map(user => `
    <tr>
      <td>${user.id}</td>
      <td>${escapeHtml(user.name || '')}</td>
      <td>${escapeHtml(user.email || '')}</td>
      <td>${getPlanoName(user.plano_id)}</td>
      <td><span class="status-badge ${user.status === 1 ? 'active' : 'inactive'}">${user.status === 1 ? 'Ativo' : 'Inativo'}</span></td>
      <td>${user.data_expiracao ? new Date(user.data_expiracao).toLocaleDateString('pt-BR') : '-'}</td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="usuario" data-id="${user.id}">Editar</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminFerramentas() {
  const tbody = document.getElementById('adminFerramentasBody');
  if (!tbody) return;

  tbody.innerHTML = adminFerramentas.map(f => `
    <tr>
      <td>${f.id}</td>
      <td>${escapeHtml(f.titulo || '')}</td>
      <td>${f.tipo_acesso || 'sessao'}</td>
      <td><span class="status-badge ${f.status}">${f.status}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="ferramenta" data-id="${f.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="ferramenta" data-id="${f.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminAcessosPremium() {
  const tbody = document.getElementById('adminAcessosBody');
  if (!tbody) return;

  tbody.innerHTML = adminAcessosPremium.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${escapeHtml(a.titulo || '')}</td>
      <td>${a.tipo_acesso || '-'}</td>
      <td><span class="status-badge ${a.status}">${a.status}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="acesso-premium" data-id="${a.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="acesso-premium" data-id="${a.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminCanvaCategorias() {
  const tbody = document.getElementById('adminCanvaCategoriasBody');
  if (!tbody) return;

  tbody.innerHTML = adminCanvaCategorias.map(c => `
    <tr>
      <td>${c.id}</td>
      <td>${escapeHtml(c.nome || '')}</td>
      <td>${c.ordem || 0}</td>
      <td><span class="status-badge ${c.status === 1 ? 'active' : 'inactive'}">${c.status === 1 ? 'Ativo' : 'Inativo'}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="canva-categoria" data-id="${c.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="canva-categoria" data-id="${c.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminCanvaArquivos() {
  const tbody = document.getElementById('adminCanvaArquivosBody');
  if (!tbody) return;

  tbody.innerHTML = adminCanvaArquivos.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${escapeHtml(a.nome || '')}</td>
      <td>${escapeHtml(a.categoria_nome || '-')}</td>
      <td><span class="status-badge ${a.status === 1 ? 'active' : 'inactive'}">${a.status === 1 ? 'Ativo' : 'Inativo'}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="canva-arquivo" data-id="${a.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="canva-arquivo" data-id="${a.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminCanvaAcessos() {
  const tbody = document.getElementById('adminCanvaAcessosBody');
  if (!tbody) return;

  tbody.innerHTML = adminCanvaAcessos.map(a => `
    <tr>
      <td>${a.id}</td>
      <td>${escapeHtml(a.titulo || '')}</td>
      <td>${escapeHtml(a.url || '-')}</td>
      <td><span class="status-badge ${a.status === 1 ? 'active' : 'inactive'}">${a.status === 1 ? 'Ativo' : 'Inativo'}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="canva-acesso" data-id="${a.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="canva-acesso" data-id="${a.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminTools() {
  const tbody = document.getElementById('adminToolsBody');
  if (!tbody) return;

  tbody.innerHTML = adminTools.map(t => `
    <tr>
      <td>${t.id}</td>
      <td>${escapeHtml(t.label || '')}</td>
      <td>${t.parent_id ? getToolParentLabel(t.parent_id) : '-'}</td>
      <td>${escapeHtml(t.url || '-')}</td>
      <td>${t.ordem || 0}</td>
      <td><span class="status-badge ${t.show_app === 1 ? 'active' : 'inactive'}">${t.show_app === 1 ? 'Sim' : 'Nao'}</span></td>
      <td><span class="status-badge ${t.is_active === 1 ? 'active' : 'inactive'}">${t.is_active === 1 ? 'Sim' : 'Nao'}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="tool" data-id="${t.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="tool" data-id="${t.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminPlanosPlataforma() {
  const tbody = document.getElementById('adminPlanosBody');
  if (!tbody) return;

  tbody.innerHTML = adminPlanosPlataforma.map(p => `
    <tr>
      <td>${p.id}</td>
      <td>${escapeHtml(p.nome || '')}</td>
      <td>R$ ${parseFloat(p.valor || 0).toFixed(2)}</td>
      <td><span class="status-badge ${p.is_popular === 1 ? 'active' : 'inactive'}">${p.is_popular === 1 ? 'Sim' : 'Nao'}</span></td>
      <td>${p.ordem || 0}</td>
      <td><span class="status-badge ${p.status === 1 ? 'active' : 'inactive'}">${p.status === 1 ? 'Ativo' : 'Inativo'}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="plano-plataforma" data-id="${p.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="plano-plataforma" data-id="${p.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function renderAdminPlanosDetalhes() {
  const tbody = document.getElementById('adminPlanosDetalhesBody');
  if (!tbody) return;

  // Filtra por categoria se selecionado
  const detalhes = currentFilterCategoria
    ? adminPlanosDetalhes.filter(d => d.categoria === currentFilterCategoria)
    : adminPlanosDetalhes;

  if (detalhes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 20px; color: #888;">
          Nenhum detalhe encontrado
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = detalhes.map(d => {
    const categoriaLabel = getCategoriaLabel(d.categoria);
    return `
      <tr>
        <td>${d.id}</td>
        <td>${categoriaLabel}</td>
        <td>${escapeHtml(d.nome_recurso || '')}</td>
        <td>${escapeHtml(d.plano_1 || '-')}</td>
        <td>${escapeHtml(d.plano_2 || '-')}</td>
        <td>${escapeHtml(d.plano_3 || '-')}</td>
        <td>${escapeHtml(d.plano_4 || '-')}</td>
        <td>${d.ordem || 0}</td>
        <td><span class="status-badge ${d.status === 1 ? 'active' : 'inactive'}">${d.status === 1 ? 'Ativo' : 'Inativo'}</span></td>
        <td class="admin-actions-cell">
          <button class="btn-edit" data-action="edit" data-type="plano-detalhe" data-id="${d.id}">Editar</button>
          <button class="btn-delete" data-action="delete" data-type="plano-detalhe" data-id="${d.id}">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Helper para label da categoria
function getCategoriaLabel(categoria) {
  switch (categoria) {
    case 'cotas': return 'Cotas/Downloads';
    case 'plataformas': return 'Acessos';
    case 'recursos': return 'Inteligencia Artificial';
    default: return categoria || '-';
  }
}

// Helper para pegar label do parent
function getToolParentLabel(parentId) {
  const parent = adminTools.find(t => t.id === parentId);
  return parent ? parent.label : parentId;
}

// =============================================
// MODAL DE EDICAO
// =============================================

function openAdminModal(type, id) {
  currentEditType = type;
  currentEditId = id;

  const modal = document.getElementById('adminEditModal');
  const title = document.getElementById('adminEditTitle');
  const form = document.getElementById('adminEditForm');
  const deleteBtn = document.getElementById('btnDeleteEdit');

  // Mostra botao excluir apenas para edicao
  deleteBtn.classList.toggle('hidden', !id);

  let item = null;
  let formHtml = '';

  switch (type) {
    case 'usuario':
      title.textContent = id ? 'Editar Usuario' : 'Novo Usuario';
      item = adminUsers.find(u => u.id === id);
      formHtml = getUsuarioForm(item);
      break;

    case 'ferramenta':
      title.textContent = id ? 'Editar Ferramenta' : 'Nova Ferramenta';
      item = adminFerramentas.find(f => f.id === id);
      formHtml = getFerramentaForm(item);
      break;

    case 'acesso-premium':
      title.textContent = id ? 'Editar Acesso Premium' : 'Novo Acesso Premium';
      item = adminAcessosPremium.find(a => a.id === id);
      formHtml = getAcessoPremiumForm(item);
      break;

    case 'canva-categoria':
      title.textContent = id ? 'Editar Categoria' : 'Nova Categoria';
      item = adminCanvaCategorias.find(c => c.id === id);
      formHtml = getCanvaCategoriaForm(item);
      break;

    case 'canva-arquivo':
      title.textContent = id ? 'Editar Arquivo' : 'Novo Arquivo';
      item = adminCanvaArquivos.find(a => a.id === id);
      formHtml = getCanvaArquivoForm(item);
      break;

    case 'canva-acesso':
      title.textContent = id ? 'Editar Acesso Canva' : 'Novo Acesso Canva';
      item = adminCanvaAcessos.find(a => a.id === id);
      formHtml = getCanvaAcessoForm(item);
      break;

    case 'tool':
      title.textContent = id ? 'Editar Tool' : 'Novo Tool';
      item = adminTools.find(t => t.id === id);
      formHtml = getToolForm(item);
      break;

    case 'plano-plataforma':
      title.textContent = id ? 'Editar Plano' : 'Novo Plano';
      item = adminPlanosPlataforma.find(p => p.id === id);
      formHtml = getPlanoPlataformaForm(item);
      break;

    case 'plano-detalhe':
      title.textContent = id ? 'Editar Detalhe' : 'Novo Detalhe';
      item = adminPlanosDetalhes.find(d => d.id === id);
      formHtml = getPlanoDetalheForm(item);
      break;

    case 'banner':
      title.textContent = id ? 'Editar Banner' : 'Novo Banner';
      item = adminBanners.find(b => b.id === id);
      formHtml = getBannerForm(item);
      break;

    case 'cover':
      title.textContent = id ? 'Editar Cover' : 'Novo Cover';
      item = adminCovers.find(c => c.id === id);
      formHtml = getCoverForm(item);
      break;

    case 'menu-item':
      title.textContent = id ? 'Editar Item Menu' : 'Novo Item Menu';
      item = adminMenuItems.find(m => m.id === id);
      formHtml = getMenuItemForm(item);
      break;
  }

  form.innerHTML = formHtml;
  modal.classList.add('active');
}

function closeAdminModal() {
  const modal = document.getElementById('adminEditModal');
  modal.classList.remove('active');
  currentEditType = null;
  currentEditId = null;
}

// =============================================
// FORMULARIOS
// =============================================

function getUsuarioForm(user) {
  const planosOptions = adminPlanos.map(p =>
    `<option value="${p.id}" ${user?.plano_id === p.id ? 'selected' : ''}>${p.nome}</option>`
  ).join('');

  return `
    <div class="form-group">
      <label>Nome</label>
      <input type="text" id="editNome" value="${escapeHtml(user?.name || '')}">
    </div>
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="editEmail" value="${escapeHtml(user?.email || '')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Plano</label>
        <select id="editPlano">
          ${planosOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${user?.status === 1 ? 'selected' : ''}>Ativo</option>
          <option value="0" ${user?.status === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Nivel de Acesso</label>
        <select id="editNivelAcesso">
          <option value="user" ${user?.nivel_acesso === 'user' ? 'selected' : ''}>Usuario</option>
          <option value="admin" ${user?.nivel_acesso === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </div>
      <div class="form-group">
        <label>Data Expiracao</label>
        <input type="date" id="editExpiracao" value="${user?.data_expiracao ? formatDateForInput(user.data_expiracao) : ''}">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Nova Senha (deixe em branco para manter)</label>
        <input type="password" id="editPassword" placeholder="Nova senha">
      </div>
      <div class="form-group">
        <label>PIN de Seguranca (4 digitos)</label>
        <input type="text" id="editPin" value="${user?.security_pin || ''}" placeholder="Ex: 1234" maxlength="4" pattern="[0-9]{4}">
        <small style="color: #888;">Deixe em branco para manter o atual</small>
      </div>
    </div>
  `;
}

function getFerramentaForm(item) {
  return `
    <div class="form-group">
      <label>Titulo *</label>
      <input type="text" id="editTitulo" value="${escapeHtml(item?.titulo || '')}" required>
    </div>
    <div class="form-group">
      <label>Descricao</label>
      <textarea id="editDescricao">${escapeHtml(item?.descricao || '')}</textarea>
    </div>
    <div class="form-group">
      <label>URL da Capa</label>
      <input type="text" id="editCapa" value="${escapeHtml(item?.capa || '')}" placeholder="https://...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tipo de Acesso</label>
        <select id="editTipoAcesso">
          <option value="sessao" ${item?.tipo_acesso === 'sessao' ? 'selected' : ''}>Sessao</option>
          <option value="link" ${item?.tipo_acesso === 'link' ? 'selected' : ''}>Link</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="online" ${item?.status === 'online' ? 'selected' : ''}>Online</option>
          <option value="offline" ${item?.status === 'offline' ? 'selected' : ''}>Offline</option>
          <option value="manutencao" ${item?.status === 'manutencao' ? 'selected' : ''}>Manutencao</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Link ou Conteudo (Sessao)</label>
      <textarea id="editLinkConteudo" rows="4">${escapeHtml(item?.link_ou_conteudo || '')}</textarea>
    </div>
  `;
}

function getAcessoPremiumForm(item) {
  return `
    <div class="form-group">
      <label>Titulo *</label>
      <input type="text" id="editTitulo" value="${escapeHtml(item?.titulo || '')}" required>
    </div>
    <div class="form-group">
      <label>Descricao</label>
      <textarea id="editDescricao">${escapeHtml(item?.descricao || '')}</textarea>
    </div>
    <div class="form-group">
      <label>URL da Capa</label>
      <input type="text" id="editCapa" value="${escapeHtml(item?.capa || '')}" placeholder="https://...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Tipo de Acesso</label>
        <select id="editTipoAcesso">
          <option value="login_senha" ${item?.tipo_acesso === 'login_senha' ? 'selected' : ''}>Login/Senha</option>
          <option value="link_url" ${item?.tipo_acesso === 'link_url' ? 'selected' : ''}>Link URL</option>
          <option value="chave_extensao" ${item?.tipo_acesso === 'chave_extensao' ? 'selected' : ''}>Chave/Extensao</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="online" ${item?.status === 'online' ? 'selected' : ''}>Online</option>
          <option value="offline" ${item?.status === 'offline' ? 'selected' : ''}>Offline</option>
          <option value="manutencao" ${item?.status === 'manutencao' ? 'selected' : ''}>Manutencao</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>URL</label>
      <input type="text" id="editUrl" value="${escapeHtml(item?.url || '')}">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Login</label>
        <input type="text" id="editLogin" value="${escapeHtml(item?.login || '')}">
      </div>
      <div class="form-group">
        <label>Senha</label>
        <input type="text" id="editSenha" value="${escapeHtml(item?.senha || '')}">
      </div>
    </div>
    <div class="form-group">
      <label>Chave de Acesso</label>
      <textarea id="editChave" rows="3">${escapeHtml(item?.chave_de_acesso || '')}</textarea>
    </div>
  `;
}

function getCanvaCategoriaForm(item) {
  return `
    <div class="form-group">
      <label>Nome *</label>
      <input type="text" id="editNome" value="${escapeHtml(item?.nome || '')}" required>
    </div>
    <div class="form-group">
      <label>Descricao</label>
      <textarea id="editDescricao">${escapeHtml(item?.descricao || '')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Ordem</label>
        <input type="number" id="editOrdem" value="${item?.ordem || 0}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${item?.status === 1 ? 'selected' : ''}>Ativo</option>
          <option value="0" ${item?.status === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
  `;
}

function getCanvaArquivoForm(item) {
  const categoriasOptions = adminCanvaCategorias.map(c =>
    `<option value="${c.id}" ${item?.categoria_id === c.id ? 'selected' : ''}>${c.nome}</option>`
  ).join('');

  return `
    <div class="form-group">
      <label>Nome *</label>
      <input type="text" id="editNome" value="${escapeHtml(item?.nome || '')}" required>
    </div>
    <div class="form-group">
      <label>Legenda Sugerida</label>
      <textarea id="editLegenda">${escapeHtml(item?.legenda_sugerida || '')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Categoria</label>
        <select id="editCategoria">
          <option value="">Sem categoria</option>
          ${categoriasOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${item?.status === 1 ? 'selected' : ''}>Ativo</option>
          <option value="0" ${item?.status === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>URL da Capa</label>
      <input type="text" id="editCapa" value="${escapeHtml(item?.capa || '')}" placeholder="https://...">
    </div>
    <div class="form-group">
      <label>Link Download (Canva) *</label>
      <input type="text" id="editDownload" value="${escapeHtml(item?.download || '')}" required placeholder="https://www.canva.com/...">
    </div>
  `;
}

function getCanvaAcessoForm(item) {
  return `
    <div class="form-group">
      <label>Titulo *</label>
      <input type="text" id="editTitulo" value="${escapeHtml(item?.titulo || '')}" required>
    </div>
    <div class="form-group">
      <label>Descricao</label>
      <textarea id="editDescricao">${escapeHtml(item?.descricao || '')}</textarea>
    </div>
    <div class="form-group">
      <label>URL *</label>
      <input type="text" id="editUrl" value="${escapeHtml(item?.url || '')}" required placeholder="https://www.canva.com/...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>URL da Capa</label>
        <input type="text" id="editCapa" value="${escapeHtml(item?.capa || '')}" placeholder="https://...">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${item?.status === 1 ? 'selected' : ''}>Ativo</option>
          <option value="0" ${item?.status === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
  `;
}

function getToolForm(item) {
  const parentOptions = adminTools
    .filter(t => t.id !== item?.id && !t.parent_id)
    .map(t => `<option value="${t.id}" ${item?.parent_id === t.id ? 'selected' : ''}>${t.label}</option>`)
    .join('');

  return `
    <div class="form-group">
      <label>Label *</label>
      <input type="text" id="editLabel" value="${escapeHtml(item?.label || '')}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Parent (Tool Pai)</label>
        <select id="editParent">
          <option value="">Nenhum (Raiz)</option>
          ${parentOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Icone (nome do icone Lucide)</label>
        <input type="text" id="editIcon" value="${escapeHtml(item?.icon || '')}" placeholder="ex: home, settings, star">
        <small>Ver icones em: lucide.dev/icons</small>
      </div>
    </div>
    <div class="form-group">
      <label>URL</label>
      <input type="text" id="editUrl" value="${escapeHtml(item?.url || '')}" placeholder="https://...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Ordem</label>
        <input type="number" id="editOrdem" value="${item?.ordem || 0}">
      </div>
      <div class="form-group">
        <label>Mostrar no App</label>
        <select id="editShowApp">
          <option value="1" ${item?.show_app === 1 || item?.show_app === undefined ? 'selected' : ''}>Sim</option>
          <option value="0" ${item?.show_app === 0 ? 'selected' : ''}>Nao</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ativo</label>
        <select id="editAtivo">
          <option value="1" ${item?.is_active === 1 || item?.is_active === undefined ? 'selected' : ''}>Sim</option>
          <option value="0" ${item?.is_active === 0 ? 'selected' : ''}>Nao</option>
        </select>
      </div>
    </div>
  `;
}

function getPlanoPlataformaForm(item) {
  // Parse recursos se for string JSON
  let recursosText = '';
  if (item?.recursos) {
    try {
      const recursos = typeof item.recursos === 'string' ? JSON.parse(item.recursos) : item.recursos;
      recursosText = Array.isArray(recursos) ? recursos.join('\n') : item.recursos;
    } catch (e) {
      recursosText = item.recursos;
    }
  }

  return `
    <div class="form-group">
      <label>Nome *</label>
      <input type="text" id="editNome" value="${escapeHtml(item?.nome || '')}" required>
    </div>
    <div class="form-group">
      <label>Descricao</label>
      <textarea id="editDescricao" rows="2">${escapeHtml(item?.descricao || '')}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Valor (R$) *</label>
        <input type="number" step="0.01" id="editValor" value="${item?.valor || 0}" required>
      </div>
      <div class="form-group">
        <label>Valor Original (riscado)</label>
        <input type="number" step="0.01" id="editValorOriginal" value="${item?.valor_original || ''}">
      </div>
    </div>
    <div class="form-group">
      <label>Recursos (um por linha)</label>
      <textarea id="editRecursos" rows="5" placeholder="Digite um recurso por linha">${recursosText}</textarea>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Cor Destaque</label>
        <input type="color" id="editCorDestaque" value="${item?.cor_destaque || '#157f67'}">
      </div>
      <div class="form-group">
        <label>Icone</label>
        <select id="editIcone">
          <option value="rocket" ${item?.icone === 'rocket' ? 'selected' : ''}>Foguete</option>
          <option value="zap" ${item?.icone === 'zap' ? 'selected' : ''}>Raio</option>
          <option value="star" ${item?.icone === 'star' ? 'selected' : ''}>Estrela</option>
          <option value="crown" ${item?.icone === 'crown' ? 'selected' : ''}>Coroa</option>
          <option value="gem" ${item?.icone === 'gem' ? 'selected' : ''}>Diamante</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Popular?</label>
        <select id="editPopular">
          <option value="0" ${!item?.is_popular ? 'selected' : ''}>Nao</option>
          <option value="1" ${item?.is_popular === 1 ? 'selected' : ''}>Sim</option>
        </select>
      </div>
      <div class="form-group">
        <label>Ordem</label>
        <input type="number" id="editOrdem" value="${item?.ordem || 0}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${item?.status === 1 || item?.status === undefined ? 'selected' : ''}>Ativo</option>
          <option value="0" ${item?.status === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Link de Pagamento</label>
      <input type="text" id="editLinkPagamento" value="${escapeHtml(item?.link_pagamento || '')}" placeholder="https://...">
    </div>
  `;
}

function getPlanoDetalheForm(item) {
  return `
    <div class="form-row">
      <div class="form-group">
        <label>Categoria *</label>
        <select id="editCategoria" required>
          <option value="cotas" ${item?.categoria === 'cotas' ? 'selected' : ''}>Cotas/Downloads</option>
          <option value="plataformas" ${item?.categoria === 'plataformas' ? 'selected' : ''}>Acessos</option>
          <option value="recursos" ${item?.categoria === 'recursos' ? 'selected' : ''}>Inteligencia Artificial</option>
        </select>
      </div>
      <div class="form-group">
        <label>Icone</label>
        <input type="text" id="editIcone" value="${escapeHtml(item?.icone || '')}" placeholder="Ex: freepik, ou emoji">
      </div>
    </div>
    <div class="form-group">
      <label>Nome do Recurso *</label>
      <input type="text" id="editNomeRecurso" value="${escapeHtml(item?.nome_recurso || '')}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Go!</label>
        <input type="text" id="editPlano1" value="${escapeHtml(item?.plano_1 || '')}" placeholder="Ex: 10 /Dia ou ✓ ou ❌">
      </div>
      <div class="form-group">
        <label>Lite</label>
        <input type="text" id="editPlano2" value="${escapeHtml(item?.plano_2 || '')}" placeholder="Ex: 20 /Dia ou ✓ ou ❌">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>HubPlus+</label>
        <input type="text" id="editPlano3" value="${escapeHtml(item?.plano_3 || '')}" placeholder="Ex: 35 /Dia ou ✓ ou ❌">
      </div>
      <div class="form-group">
        <label>HubPro+</label>
        <input type="text" id="editPlano4" value="${escapeHtml(item?.plano_4 || '')}" placeholder="Ex: 50 /Dia ou ✓ ou ❌">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Ordem</label>
        <input type="number" id="editOrdem" value="${item?.ordem || 0}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${item?.status === 1 || item?.status === undefined ? 'selected' : ''}>Ativo</option>
          <option value="0" ${item?.status === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
  `;
}

// =============================================
// SALVAR EDICAO
// =============================================

async function saveAdminEdit() {
  let result;

  switch (currentEditType) {
    case 'usuario':
      result = await saveUsuario();
      break;
    case 'ferramenta':
      result = await saveFerramenta();
      break;
    case 'acesso-premium':
      result = await saveAcessoPremium();
      break;
    case 'canva-categoria':
      result = await saveCanvaCategoria();
      break;
    case 'canva-arquivo':
      result = await saveCanvaArquivo();
      break;
    case 'canva-acesso':
      result = await saveCanvaAcesso();
      break;
    case 'tool':
      result = await saveTool();
      break;
    case 'plano-plataforma':
      result = await savePlanoPlataforma();
      break;
    case 'plano-detalhe':
      result = await savePlanoDetalhe();
      break;
    case 'banner':
      result = await saveBanner();
      break;
    case 'cover':
      result = await saveCover();
      break;
    case 'menu-item':
      result = await saveMenuItem();
      break;
  }

  if (result?.success) {
    closeAdminModal();
    // Recarrega os dados
    switch (currentEditType) {
      case 'usuario': await loadAdminUsers(); break;
      case 'ferramenta': await loadAdminFerramentas(); break;
      case 'acesso-premium': await loadAdminAcessosPremium(); break;
      case 'canva-categoria': await loadAdminCanvaCategorias(); break;
      case 'canva-arquivo': await loadAdminCanvaArquivos(); break;
      case 'canva-acesso': await loadAdminCanvaAcessos(); break;
      case 'tool': await loadAdminTools(); break;
      case 'plano-plataforma': await loadAdminPlanosPlataforma(); break;
      case 'plano-detalhe': await loadAdminPlanosDetalhes(); break;
      case 'banner': await loadAdminBanners(); break;
      case 'cover': await loadAdminCovers(); break;
      case 'menu-item': await loadAdminMenuItems(); break;
    }
  } else {
    alert('Erro ao salvar: ' + (result?.error || 'Erro desconhecido'));
  }
}

async function saveUsuario() {
  const data = {
    name: document.getElementById('editNome').value,
    email: document.getElementById('editEmail').value,
    plano_id: parseInt(document.getElementById('editPlano').value),
    status: parseInt(document.getElementById('editStatus').value),
    nivel_acesso: document.getElementById('editNivelAcesso').value,
    data_expiracao: document.getElementById('editExpiracao').value || null
  };

  const password = document.getElementById('editPassword').value;
  if (password) data.password = password;

  const pin = document.getElementById('editPin').value.trim();
  if (pin) {
    // Valida que o PIN tem 4 digitos numericos
    if (!/^\d{4}$/.test(pin)) {
      alert('O PIN deve ter exatamente 4 digitos numericos');
      return { success: false, error: 'PIN invalido' };
    }
    data.security_pin = pin;
  }

  return await window.api.adminUpdateUser(currentEditId, data);
}

async function saveFerramenta() {
  const data = {
    titulo: document.getElementById('editTitulo').value,
    descricao: document.getElementById('editDescricao').value,
    capa: document.getElementById('editCapa').value,
    tipo_acesso: document.getElementById('editTipoAcesso').value,
    status: document.getElementById('editStatus').value,
    link_ou_conteudo: document.getElementById('editLinkConteudo').value
  };

  if (currentEditId) {
    return await window.api.adminUpdateFerramenta(currentEditId, data);
  } else {
    return await window.api.adminCreateFerramenta(data);
  }
}

async function saveAcessoPremium() {
  const data = {
    titulo: document.getElementById('editTitulo').value,
    descricao: document.getElementById('editDescricao').value,
    capa: document.getElementById('editCapa').value,
    tipo_acesso: document.getElementById('editTipoAcesso').value,
    status: document.getElementById('editStatus').value,
    url: document.getElementById('editUrl').value,
    login: document.getElementById('editLogin').value,
    senha: document.getElementById('editSenha').value,
    chave_de_acesso: document.getElementById('editChave').value
  };

  if (currentEditId) {
    return await window.api.adminUpdateAcessoPremium(currentEditId, data);
  } else {
    return await window.api.adminCreateAcessoPremium(data);
  }
}

async function saveCanvaCategoria() {
  const data = {
    nome: document.getElementById('editNome').value,
    descricao: document.getElementById('editDescricao').value,
    ordem: parseInt(document.getElementById('editOrdem').value) || 0,
    status: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdateCanvaCategoria(currentEditId, data);
  } else {
    return await window.api.adminCreateCanvaCategoria(data);
  }
}

async function saveCanvaArquivo() {
  const data = {
    nome: document.getElementById('editNome').value,
    legenda_sugerida: document.getElementById('editLegenda').value,
    categoria_id: document.getElementById('editCategoria').value || null,
    capa: document.getElementById('editCapa').value,
    download: document.getElementById('editDownload').value,
    status: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdateCanvaArquivo(currentEditId, data);
  } else {
    return await window.api.adminCreateCanvaArquivo(data);
  }
}

async function saveCanvaAcesso() {
  const data = {
    titulo: document.getElementById('editTitulo').value,
    descricao: document.getElementById('editDescricao').value,
    url: document.getElementById('editUrl').value,
    capa: document.getElementById('editCapa').value,
    status: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdateCanvaAcesso(currentEditId, data);
  } else {
    return await window.api.adminCreateCanvaAcesso(data);
  }
}

async function saveTool() {
  const data = {
    label: document.getElementById('editLabel').value,
    parent_id: document.getElementById('editParent').value || null,
    icon: document.getElementById('editIcon').value,
    url: document.getElementById('editUrl').value,
    ordem: parseInt(document.getElementById('editOrdem').value) || 0,
    show_app: parseInt(document.getElementById('editShowApp').value),
    is_active: parseInt(document.getElementById('editAtivo').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdateTool(currentEditId, data);
  } else {
    return await window.api.adminCreateTool(data);
  }
}

async function savePlanoPlataforma() {
  // Converte recursos de texto para array JSON
  const recursosText = document.getElementById('editRecursos').value.trim();
  const recursosArray = recursosText ? recursosText.split('\n').filter(r => r.trim()) : [];

  const data = {
    nome: document.getElementById('editNome').value,
    descricao: document.getElementById('editDescricao').value,
    valor: parseFloat(document.getElementById('editValor').value) || 0,
    valor_original: document.getElementById('editValorOriginal').value ? parseFloat(document.getElementById('editValorOriginal').value) : null,
    recursos: JSON.stringify(recursosArray),
    cor_destaque: document.getElementById('editCorDestaque').value,
    icone: document.getElementById('editIcone').value,
    is_popular: parseInt(document.getElementById('editPopular').value),
    ordem: parseInt(document.getElementById('editOrdem').value) || 0,
    link_pagamento: document.getElementById('editLinkPagamento').value || null,
    status: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdatePlanoPlataforma(currentEditId, data);
  } else {
    return await window.api.adminCreatePlanoPlataforma(data);
  }
}

async function savePlanoDetalhe() {
  const data = {
    categoria: document.getElementById('editCategoria').value,
    nome_recurso: document.getElementById('editNomeRecurso').value,
    icone: document.getElementById('editIcone').value,
    plano_1: document.getElementById('editPlano1').value || '❌',
    plano_2: document.getElementById('editPlano2').value || '❌',
    plano_3: document.getElementById('editPlano3').value || '❌',
    plano_4: document.getElementById('editPlano4').value || '❌',
    ordem: parseInt(document.getElementById('editOrdem').value) || 0,
    status: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdatePlanoDetalhe(currentEditId, data);
  } else {
    return await window.api.adminCreatePlanoDetalhe(data);
  }
}

// =============================================
// EXCLUIR ITEM
// =============================================

async function confirmDelete(type, id) {
  if (!confirm('Tem certeza que deseja excluir este item? Esta acao nao pode ser desfeita.')) {
    return;
  }

  currentEditType = type;
  currentEditId = id;
  await deleteAdminItem();
}

async function deleteAdminItem() {
  if (!confirm('Confirma a exclusao?')) return;

  let result;

  switch (currentEditType) {
    case 'usuario':
      result = await window.api.adminDeleteUser(currentEditId);
      break;
    case 'ferramenta':
      result = await window.api.adminDeleteFerramenta(currentEditId);
      break;
    case 'acesso-premium':
      result = await window.api.adminDeleteAcessoPremium(currentEditId);
      break;
    case 'canva-categoria':
      result = await window.api.adminDeleteCanvaCategoria(currentEditId);
      break;
    case 'canva-arquivo':
      result = await window.api.adminDeleteCanvaArquivo(currentEditId);
      break;
    case 'canva-acesso':
      result = await window.api.adminDeleteCanvaAcesso(currentEditId);
      break;
    case 'tool':
      result = await window.api.adminDeleteTool(currentEditId);
      break;
    case 'plano-plataforma':
      result = await window.api.adminDeletePlanoPlataforma(currentEditId);
      break;
    case 'plano-detalhe':
      result = await window.api.adminDeletePlanoDetalhe(currentEditId);
      break;
    case 'banner':
      result = await window.api.adminDeleteBanner(currentEditId);
      break;
    case 'cover':
      result = await window.api.adminDeleteCover(currentEditId);
      break;
    case 'menu-item':
      result = await window.api.adminDeleteMenuItem(currentEditId);
      break;
  }

  if (result?.success) {
    closeAdminModal();
    // Recarrega os dados
    switch (currentEditType) {
      case 'usuario': await loadAdminUsers(); break;
      case 'ferramenta': await loadAdminFerramentas(); break;
      case 'acesso-premium': await loadAdminAcessosPremium(); break;
      case 'canva-categoria': await loadAdminCanvaCategorias(); break;
      case 'canva-arquivo': await loadAdminCanvaArquivos(); break;
      case 'canva-acesso': await loadAdminCanvaAcessos(); break;
      case 'tool': await loadAdminTools(); break;
      case 'plano-plataforma': await loadAdminPlanosPlataforma(); break;
      case 'plano-detalhe': await loadAdminPlanosDetalhes(); break;
      case 'banner': await loadAdminBanners(); break;
      case 'cover': await loadAdminCovers(); break;
      case 'menu-item': await loadAdminMenuItems(); break;
    }
  } else {
    alert('Erro ao excluir: ' + (result?.error || 'Erro desconhecido'));
  }
}

// Helper para nome do plano
function getPlanoName(planoId) {
  const plano = adminPlanos.find(p => p.id === planoId);
  return plano?.nome || `Plano ${planoId}`;
}

// Helper para formatar data para input type="date"
function formatDateForInput(dateValue) {
  if (!dateValue) return '';

  // Se ja for string no formato correto
  if (typeof dateValue === 'string') {
    // Se tem 'T' (ISO format)
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    // Se ja esta no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
  }

  // Se for objeto Date ou string de data
  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {
    console.error('Erro ao formatar data:', e);
  }

  return '';
}

// =============================================
// REPORTS ADMIN
// =============================================

let adminReports = [];
let currentReportFilter = '';

// Carrega reports
async function loadAdminReports() {
  if (!isAdmin()) return;
  const filtros = currentReportFilter ? { status: currentReportFilter } : {};
  const result = await window.api.adminGetReports(filtros);
  if (result.success) {
    adminReports = result.data;
    renderAdminReports();
  }
}

// Renderiza tabela de reports
function renderAdminReports() {
  const tbody = document.getElementById('adminReportsBody');
  if (!tbody) return;

  if (adminReports.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: #888;">
          Nenhum report encontrado
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminReports.map(r => {
    const data = r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';

    const motivoPreview = r.motivo ? (r.motivo.length > 50 ? r.motivo.substring(0, 50) + '...' : r.motivo) : '-';

    return `
      <tr>
        <td>${r.id}</td>
        <td>${escapeHtml(r.ferramenta_titulo || '-')}</td>
        <td>${escapeHtml(r.usuario_nome || '-')}</td>
        <td title="${escapeHtml(r.motivo || '')}">${escapeHtml(motivoPreview)}</td>
        <td><span class="status-badge ${r.status}">${getReportStatusLabel(r.status)}</span></td>
        <td>${data}</td>
        <td class="admin-actions-cell">
          <button class="btn-view" data-action="view-report" data-id="${r.id}">Ver</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Label do status do report
function getReportStatusLabel(status) {
  switch (status) {
    case 'pendente': return 'Pendente';
    case 'em_andamento': return 'Em Andamento';
    case 'resolvido': return 'Resolvido';
    default: return status || 'Desconhecido';
  }
}

// Abre modal de detalhes do report
async function openReportDetailModal(reportId) {
  const result = await window.api.adminGetReportById(reportId);
  if (!result.success || !result.data) {
    alert('Erro ao carregar detalhes do report');
    return;
  }

  const report = result.data;
  const modal = document.getElementById('reportDetailModal');

  document.getElementById('reportDetailId').value = report.id;
  document.getElementById('reportDetailIdDisplay').textContent = '#' + report.id;
  document.getElementById('reportDetailFerramenta').textContent = report.ferramenta_titulo || 'N/A';
  document.getElementById('reportDetailUsuario').textContent = `${report.usuario_nome || 'N/A'} (${report.usuario_email || ''})`;
  document.getElementById('reportDetailData').textContent = report.created_at
    ? new Date(report.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : '-';
  document.getElementById('reportDetailMotivo').textContent = report.motivo || 'Sem descricao';

  const statusAtual = document.getElementById('reportDetailStatusAtual');
  statusAtual.textContent = getReportStatusLabel(report.status);
  statusAtual.className = 'status-badge ' + report.status;

  document.getElementById('reportDetailStatus').value = report.status;

  modal.classList.add('active');
}

// Fecha modal de detalhes do report
function closeReportDetailModal() {
  document.getElementById('reportDetailModal').classList.remove('active');
}

// Salva status do report
async function saveReportStatus() {
  const reportId = parseInt(document.getElementById('reportDetailId').value);
  const newStatus = document.getElementById('reportDetailStatus').value;

  const result = await window.api.adminUpdateReportStatus(reportId, newStatus);

  if (result.success) {
    closeReportDetailModal();
    await loadAdminReports();
    alert('Status atualizado com sucesso!');
  } else {
    alert('Erro ao atualizar status: ' + (result.error || 'Erro desconhecido'));
  }
}

// Setup da pagina de reports admin
function setupAdminReportsPage() {
  // Filtro de status
  const filterSelect = document.getElementById('filterReportStatus');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      currentReportFilter = e.target.value;
      loadAdminReports();
    });
  }

  // Event delegation para botoes na tabela
  const tbody = document.getElementById('adminReportsBody');
  if (tbody) {
    tbody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="view-report"]');
      if (btn) {
        const id = parseInt(btn.dataset.id);
        openReportDetailModal(id);
      }
    });
  }

  // Modal de detalhes do report
  const modal = document.getElementById('reportDetailModal');
  const closeBtn = document.getElementById('closeReportDetailModal');
  const closeBtn2 = document.getElementById('btnCloseReportDetail');
  const saveBtn = document.getElementById('btnSaveReportStatus');

  if (closeBtn) closeBtn.addEventListener('click', closeReportDetailModal);
  if (closeBtn2) closeBtn2.addEventListener('click', closeReportDetailModal);
  if (saveBtn) saveBtn.addEventListener('click', saveReportStatus);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeReportDetailModal();
    });
  }
}

// Inicializa pagina de reports no setup do admin
function initAdminReportsSetup() {
  setupAdminReportsPage();
}

// =============================================
// EXPOE FUNCOES GLOBALMENTE
// =============================================
// Necessario para os onclick inline funcionarem
window.openAdminModal = openAdminModal;
window.confirmDelete = confirmDelete;
window.loadAdminUsers = loadAdminUsers;
window.loadAdminFerramentas = loadAdminFerramentas;
window.loadAdminAcessosPremium = loadAdminAcessosPremium;
window.loadAdminCanvaCategorias = loadAdminCanvaCategorias;
window.loadAdminCanvaArquivos = loadAdminCanvaArquivos;
window.loadAdminCanvaAcessos = loadAdminCanvaAcessos;
window.loadAdminTools = loadAdminTools;
window.loadAdminPlanos = loadAdminPlanos;
window.loadAdminPlanosPlataforma = loadAdminPlanosPlataforma;
window.loadAdminPlanosDetalhes = loadAdminPlanosDetalhes;
window.loadAdminReports = loadAdminReports;
window.loadAdminDashboard = loadAdminDashboard;
window.loadAdminMenuItems = loadAdminMenuItems;
window.initAdminMenu = initAdminMenu;
window.isAdmin = isAdmin;
window.initAdminReportsSetup = initAdminReportsSetup;

// =============================================
// DASHBOARD ADMIN - BANNERS E COVERS
// =============================================

let adminBanners = [];
let adminCovers = [];

async function loadAdminDashboard() {
  await Promise.all([
    loadAdminBanners(),
    loadAdminCovers()
  ]);
  setupDashboardAdminTabs();
}

function setupDashboardAdminTabs() {
  const tabs = document.querySelectorAll('#pageAdminDashboard .admin-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Remove active de todas as tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Esconde todos os conteudos
      document.querySelectorAll('#pageAdminDashboard .admin-tab-content').forEach(content => {
        content.classList.remove('active');
      });

      // Mostra o conteudo correto
      if (tabName === 'banners') {
        document.getElementById('tabBanners').classList.add('active');
      } else if (tabName === 'covers') {
        document.getElementById('tabCovers').classList.add('active');
      }
    });
  });

  // Setup botoes
  document.getElementById('btnAddBanner')?.addEventListener('click', () => {
    openAdminModal('banner', null);
  });

  document.getElementById('btnAddCover')?.addEventListener('click', () => {
    openAdminModal('cover', null);
  });
}

async function loadAdminBanners() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetBanners();
  if (result.success) {
    adminBanners = result.data;
    renderAdminBanners();
  }
}

function renderAdminBanners() {
  const tbody = document.getElementById('adminBannersBody');
  if (!tbody) return;

  if (adminBanners.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 20px; color: #888;">
          Nenhum banner encontrado
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminBanners.map(b => {
    const imageUrl = b.image.startsWith('http') ? b.image : `https://filehub.space/storage/${b.image}`;
    return `
      <tr>
        <td>${b.id}</td>
        <td><img src="${escapeHtml(imageUrl)}" alt="Banner" style="width: 80px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
        <td>${escapeHtml(b.url || '-')}</td>
        <td>${b.order || 0}</td>
        <td><span class="status-badge ${b.is_active === 1 ? 'active' : 'inactive'}">${b.is_active === 1 ? 'Ativo' : 'Inativo'}</span></td>
        <td class="admin-actions-cell">
          <button class="btn-edit" data-action="edit" data-type="banner" data-id="${b.id}">Editar</button>
          <button class="btn-delete" data-action="delete" data-type="banner" data-id="${b.id}">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function loadAdminCovers() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetCovers();
  if (result.success) {
    adminCovers = result.data;
    renderAdminCovers();
  }
}

function renderAdminCovers() {
  const tbody = document.getElementById('adminCoversBody');
  if (!tbody) return;

  if (adminCovers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 20px; color: #888;">
          Nenhum cover encontrado
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminCovers.map(c => {
    const imageUrl = c.image.startsWith('http') ? c.image : `https://filehub.space/storage/${c.image}`;
    return `
      <tr>
        <td>${c.id}</td>
        <td><img src="${escapeHtml(imageUrl)}" alt="Cover" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;"></td>
        <td>${escapeHtml(c.title || '-')}</td>
        <td>${escapeHtml(c.url || '-')}</td>
        <td>${c.order || 0}</td>
        <td><span class="status-badge ${c.is_active === 1 ? 'active' : 'inactive'}">${c.is_active === 1 ? 'Ativo' : 'Inativo'}</span></td>
        <td class="admin-actions-cell">
          <button class="btn-edit" data-action="edit" data-type="cover" data-id="${c.id}">Editar</button>
          <button class="btn-delete" data-action="delete" data-type="cover" data-id="${c.id}">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

function getBannerForm(item) {
  return `
    <div class="form-group">
      <label>URL da Imagem *</label>
      <input type="text" id="editImage" value="${escapeHtml(item?.image || '')}" required placeholder="https://... ou caminho relativo">
    </div>
    <div class="form-group">
      <label>Link (ao clicar)</label>
      <input type="text" id="editUrl" value="${escapeHtml(item?.url || '')}" placeholder="https://...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Ordem</label>
        <input type="number" id="editOrdem" value="${item?.order || 0}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${item?.is_active === 1 || item?.is_active === undefined ? 'selected' : ''}>Ativo</option>
          <option value="0" ${item?.is_active === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
  `;
}

function getCoverForm(item) {
  return `
    <div class="form-group">
      <label>URL da Imagem *</label>
      <input type="text" id="editImage" value="${escapeHtml(item?.image || '')}" required placeholder="https://... ou caminho relativo">
    </div>
    <div class="form-group">
      <label>Titulo</label>
      <input type="text" id="editTitulo" value="${escapeHtml(item?.title || '')}" placeholder="Titulo do card">
    </div>
    <div class="form-group">
      <label>Link (ao clicar)</label>
      <input type="text" id="editUrl" value="${escapeHtml(item?.url || '')}" placeholder="https://...">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Ordem</label>
        <input type="number" id="editOrdem" value="${item?.order || 0}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editStatus">
          <option value="1" ${item?.is_active === 1 || item?.is_active === undefined ? 'selected' : ''}>Ativo</option>
          <option value="0" ${item?.is_active === 0 ? 'selected' : ''}>Inativo</option>
        </select>
      </div>
    </div>
  `;
}

async function saveBanner() {
  const data = {
    image: document.getElementById('editImage').value,
    url: document.getElementById('editUrl').value || null,
    order: parseInt(document.getElementById('editOrdem').value) || 0,
    is_active: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdateBanner(currentEditId, data);
  } else {
    return await window.api.adminCreateBanner(data);
  }
}

async function saveCover() {
  const data = {
    image: document.getElementById('editImage').value,
    title: document.getElementById('editTitulo').value || null,
    url: document.getElementById('editUrl').value || null,
    order: parseInt(document.getElementById('editOrdem').value) || 0,
    is_active: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdateCover(currentEditId, data);
  } else {
    return await window.api.adminCreateCover(data);
  }
}

// =============================================
// MENU ADMIN
// =============================================

let adminMenuItems = [];

async function loadAdminMenuItems() {
  if (!isAdmin()) return;
  const result = await window.api.adminGetMenuItems();
  if (result.success) {
    adminMenuItems = result.data;
    renderAdminMenuItems();
  }
  setupMenuAdminButtons();
}

function setupMenuAdminButtons() {
  document.getElementById('btnAddMenuItem')?.addEventListener('click', () => {
    openAdminModal('menu-item', null);
  });
}

function renderAdminMenuItems() {
  const tbody = document.getElementById('adminMenuBody');
  if (!tbody) return;

  if (adminMenuItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 20px; color: #888;">
          Nenhum item de menu encontrado
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = adminMenuItems.map(m => `
    <tr data-id="${m.id}">
      <td style="cursor: grab;">&#8693;</td>
      <td>${m.id}</td>
      <td>${escapeHtml(m.icon || '-')}</td>
      <td>${escapeHtml(m.label || '-')}</td>
      <td>${escapeHtml(m.page || '-')}</td>
      <td>${m.order || 0}</td>
      <td><span class="status-badge ${m.is_active === 1 ? 'active' : 'inactive'}">${m.is_active === 1 ? 'Ativo' : 'Inativo'}</span></td>
      <td class="admin-actions-cell">
        <button class="btn-edit" data-action="edit" data-type="menu-item" data-id="${m.id}">Editar</button>
        <button class="btn-delete" data-action="delete" data-type="menu-item" data-id="${m.id}">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function getMenuItemForm(item) {
  const parentOptions = adminMenuItems
    .filter(m => m.id !== item?.id && !m.parent_id)
    .map(m => `<option value="${m.id}" ${item?.parent_id === m.id ? 'selected' : ''}>${m.label}</option>`)
    .join('');

  return `
    <div class="form-group">
      <label>Nome (Label) *</label>
      <input type="text" id="editLabel" value="${escapeHtml(item?.label || '')}" required>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Icone (emoji ou codigo)</label>
        <input type="text" id="editIcon" value="${escapeHtml(item?.icon || '')}" placeholder="Ex: &#127968; ou home">
      </div>
      <div class="form-group">
        <label>Pagina</label>
        <input type="text" id="editPage" value="${escapeHtml(item?.page || '')}" placeholder="Ex: dashboard, ferramentas">
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Item Pai (submenu)</label>
        <select id="editParent">
          <option value="">Nenhum (Raiz)</option>
          ${parentOptions}
        </select>
      </div>
      <div class="form-group">
        <label>Ordem</label>
        <input type="number" id="editOrdem" value="${item?.order || 0}">
      </div>
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="editStatus">
        <option value="1" ${item?.is_active === 1 || item?.is_active === undefined ? 'selected' : ''}>Ativo</option>
        <option value="0" ${item?.is_active === 0 ? 'selected' : ''}>Inativo</option>
      </select>
    </div>
  `;
}

async function saveMenuItem() {
  const data = {
    label: document.getElementById('editLabel').value,
    icon: document.getElementById('editIcon').value || null,
    page: document.getElementById('editPage').value || null,
    parent_id: document.getElementById('editParent').value || null,
    order: parseInt(document.getElementById('editOrdem').value) || 0,
    is_active: parseInt(document.getElementById('editStatus').value)
  };

  if (currentEditId) {
    return await window.api.adminUpdateMenuItem(currentEditId, data);
  } else {
    return await window.api.adminCreateMenuItem(data);
  }
}
