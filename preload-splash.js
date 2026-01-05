const { contextBridge, ipcRenderer } = require('electron');

// Preload simplificado para o splash screen
// Apenas recebe eventos de atualizacao do main process

contextBridge.exposeInMainWorld('splashAPI', {
  // Recebe status do update
  onUpdateStatus: (callback) => ipcRenderer.on('splash:status', (event, status) => callback(status)),
  onUpdateProgress: (callback) => ipcRenderer.on('splash:progress', (event, progress) => callback(progress)),
  onGoToLogin: (callback) => ipcRenderer.on('splash:goToLogin', () => callback()),

  // Versao do app
  getAppVersion: () => ipcRenderer.invoke('app:getVersion')
});
