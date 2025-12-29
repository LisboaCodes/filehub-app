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

  // Perfil do usuario
  updateProfile: (data) => ipcRenderer.invoke('profile:update', data)
});
