const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // === AUTENTICACAO ===
  login: (email, password) => ipcRenderer.invoke('auth:login', email, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),

  // === AUTO-UPDATE ===
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (event, info) => callback(info)),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update:error', (event, error) => callback(error)),

  // Categories
  getCategories: () => ipcRenderer.invoke('db:getCategories'),
  addCategory: (category) => ipcRenderer.invoke('db:addCategory', category),
  updateCategory: (id, category) => ipcRenderer.invoke('db:updateCategory', id, category),
  deleteCategory: (id) => ipcRenderer.invoke('db:deleteCategory', id),

  // Sessions
  getSessions: () => ipcRenderer.invoke('db:getSessions'),
  getSessionsByCategory: (categoryId) => ipcRenderer.invoke('db:getSessionsByCategory', categoryId),
  addSession: (session) => ipcRenderer.invoke('db:addSession', session),
  updateSession: (id, session) => ipcRenderer.invoke('db:updateSession', id, session),
  deleteSession: (id) => ipcRenderer.invoke('db:deleteSession', id),

  // Open session window
  openSession: (session) => ipcRenderer.invoke('session:open', session),

  // Decrypt Session Share data
  decryptSessionShare: (data, password) => ipcRenderer.invoke('crypto:decrypt', data, password),

  // Ferramentas do MySQL
  getFerramentas: () => ipcRenderer.invoke('ferramentas:getAll'),
  getFerramentaById: (id) => ipcRenderer.invoke('ferramentas:getById', id),
  openFerramenta: (ferramenta) => ipcRenderer.invoke('ferramentas:open', ferramenta),
  openFerramentaBlank: (ferramenta, url) => ipcRenderer.invoke('ferramentas:openBlank', ferramenta, url),

  // Acessos Premium do MySQL
  getAcessosPremium: () => ipcRenderer.invoke('acessosPremium:getAll'),
  getAcessoPremiumById: (id) => ipcRenderer.invoke('acessosPremium:getById', id),

  // Tools (Menus) do MySQL
  getTools: () => ipcRenderer.invoke('tools:getAll'),

  // Canva do MySQL
  getCanvaCategorias: () => ipcRenderer.invoke('canva:getCategorias'),
  getCanvaArquivos: (filtros) => ipcRenderer.invoke('canva:getArquivos', filtros),
  getCanvaArquivoById: (id) => ipcRenderer.invoke('canva:getArquivoById', id),
  getCanvaAcessos: () => ipcRenderer.invoke('canva:getAcessos'),

  // Materiais do MySQL
  getMateriais: () => ipcRenderer.invoke('materiais:getAll'),
  openMaterial: (material) => ipcRenderer.invoke('materiais:open', material),

  // Perfil do usuario
  updateProfile: (data) => ipcRenderer.invoke('profile:update', data),

  // Menu events
  onMenuRefresh: (callback) => ipcRenderer.on('menu:refresh', () => callback()),

  // Session events
  onSessionInvalidated: (callback) => ipcRenderer.on('session:invalidated', () => callback()),

  // =============================================
  // ADMIN - APENAS PARA ADMINISTRADORES
  // =============================================

  // Usuarios
  adminGetUsers: () => ipcRenderer.invoke('admin:getUsers'),
  adminUpdateUser: (userId, data) => ipcRenderer.invoke('admin:updateUser', userId, data),
  adminDeleteUser: (userId) => ipcRenderer.invoke('admin:deleteUser', userId),

  // Ferramentas
  adminGetFerramentas: () => ipcRenderer.invoke('admin:getFerramentasAll'),
  adminCreateFerramenta: (data) => ipcRenderer.invoke('admin:createFerramenta', data),
  adminUpdateFerramenta: (id, data) => ipcRenderer.invoke('admin:updateFerramenta', id, data),
  adminDeleteFerramenta: (id) => ipcRenderer.invoke('admin:deleteFerramenta', id),

  // Acessos Premium
  adminGetAcessosPremium: () => ipcRenderer.invoke('admin:getAcessosPremiumAll'),
  adminCreateAcessoPremium: (data) => ipcRenderer.invoke('admin:createAcessoPremium', data),
  adminUpdateAcessoPremium: (id, data) => ipcRenderer.invoke('admin:updateAcessoPremium', id, data),
  adminDeleteAcessoPremium: (id) => ipcRenderer.invoke('admin:deleteAcessoPremium', id),

  // Canva Categorias
  adminGetCanvaCategorias: () => ipcRenderer.invoke('admin:getCanvaCategoriasAll'),
  adminCreateCanvaCategoria: (data) => ipcRenderer.invoke('admin:createCanvaCategoria', data),
  adminUpdateCanvaCategoria: (id, data) => ipcRenderer.invoke('admin:updateCanvaCategoria', id, data),
  adminDeleteCanvaCategoria: (id) => ipcRenderer.invoke('admin:deleteCanvaCategoria', id),

  // Canva Arquivos
  adminGetCanvaArquivos: () => ipcRenderer.invoke('admin:getCanvaArquivosAll'),
  adminCreateCanvaArquivo: (data) => ipcRenderer.invoke('admin:createCanvaArquivo', data),
  adminUpdateCanvaArquivo: (id, data) => ipcRenderer.invoke('admin:updateCanvaArquivo', id, data),
  adminDeleteCanvaArquivo: (id) => ipcRenderer.invoke('admin:deleteCanvaArquivo', id),

  // Canva Acessos
  adminGetCanvaAcessos: () => ipcRenderer.invoke('admin:getCanvaAcessosAll'),
  adminCreateCanvaAcesso: (data) => ipcRenderer.invoke('admin:createCanvaAcesso', data),
  adminUpdateCanvaAcesso: (id, data) => ipcRenderer.invoke('admin:updateCanvaAcesso', id, data),
  adminDeleteCanvaAcesso: (id) => ipcRenderer.invoke('admin:deleteCanvaAcesso', id),

  // Tools
  adminGetTools: () => ipcRenderer.invoke('admin:getToolsAll'),
  adminCreateTool: (data) => ipcRenderer.invoke('admin:createTool', data),
  adminUpdateTool: (id, data) => ipcRenderer.invoke('admin:updateTool', id, data),
  adminDeleteTool: (id) => ipcRenderer.invoke('admin:deleteTool', id),

  // Planos (para dropdowns)
  adminGetPlanos: () => ipcRenderer.invoke('admin:getPlanos'),

  // Planos Plataforma (para usuarios)
  getPlanos: () => ipcRenderer.invoke('planos:getAll'),

  // Planos Plataforma (admin CRUD)
  adminGetPlanosPlataforma: () => ipcRenderer.invoke('admin:getPlanosPlataforma'),
  adminCreatePlanoPlataforma: (data) => ipcRenderer.invoke('admin:createPlanoPlataforma', data),
  adminUpdatePlanoPlataforma: (id, data) => ipcRenderer.invoke('admin:updatePlanoPlataforma', id, data),
  adminDeletePlanoPlataforma: (id) => ipcRenderer.invoke('admin:deletePlanoPlataforma', id),

  // Planos Detalhes (comparativo - para usuarios)
  getPlanosDetalhes: () => ipcRenderer.invoke('planosDetalhes:getAll'),

  // Planos Detalhes (admin CRUD)
  adminGetPlanosDetalhes: () => ipcRenderer.invoke('admin:getPlanosDetalhes'),
  adminCreatePlanoDetalhe: (data) => ipcRenderer.invoke('admin:createPlanoDetalhe', data),
  adminUpdatePlanoDetalhe: (id, data) => ipcRenderer.invoke('admin:updatePlanoDetalhe', id, data),
  adminDeletePlanoDetalhe: (id) => ipcRenderer.invoke('admin:deletePlanoDetalhe', id),

  // =============================================
  // REPORTS
  // =============================================

  // Usuario criar report
  createReport: (data) => ipcRenderer.invoke('reports:create', data),

  // Admin - Reports
  adminGetReports: (filtros) => ipcRenderer.invoke('admin:getReports', filtros),
  adminGetReportById: (id) => ipcRenderer.invoke('admin:getReportById', id),
  adminUpdateReportStatus: (id, status) => ipcRenderer.invoke('admin:updateReportStatus', id, status),

  // =============================================
  // DASHBOARD
  // =============================================

  // Dashboard - Banners e Covers (usuario)
  getDashboardBanners: () => ipcRenderer.invoke('dashboard:getBanners'),
  getDashboardCovers: () => ipcRenderer.invoke('dashboard:getCovers'),

  // Admin - Banners
  adminGetBanners: () => ipcRenderer.invoke('admin:getBanners'),
  adminCreateBanner: (data) => ipcRenderer.invoke('admin:createBanner', data),
  adminUpdateBanner: (id, data) => ipcRenderer.invoke('admin:updateBanner', id, data),
  adminDeleteBanner: (id) => ipcRenderer.invoke('admin:deleteBanner', id),

  // Admin - Covers
  adminGetCovers: () => ipcRenderer.invoke('admin:getCovers'),
  adminCreateCover: (data) => ipcRenderer.invoke('admin:createCover', data),
  adminUpdateCover: (id, data) => ipcRenderer.invoke('admin:updateCover', id, data),
  adminDeleteCover: (id) => ipcRenderer.invoke('admin:deleteCover', id),

  // =============================================
  // MENU
  // =============================================

  // Menu - Itens (usuario)
  getMenuItems: () => ipcRenderer.invoke('menu:getItems'),

  // Admin - Menu Items
  adminGetMenuItems: () => ipcRenderer.invoke('admin:getMenuItems'),
  adminCreateMenuItem: (data) => ipcRenderer.invoke('admin:createMenuItem', data),
  adminUpdateMenuItem: (id, data) => ipcRenderer.invoke('admin:updateMenuItem', id, data),
  adminDeleteMenuItem: (id) => ipcRenderer.invoke('admin:deleteMenuItem', id)
});
