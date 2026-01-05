const { app, BrowserWindow, ipcMain, session, dialog, Menu, shell } = require('electron');
const path = require('path');
const CryptoJS = require('crypto-js');
const bcrypt = require('bcryptjs');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');
const Database = require('./src/database'); // Database local
const api = require('./src/api'); // API do FileHub

// Configuracao do auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.forceAppQuit = true;

// Usuario logado atualmente
let currentUser = null;
let currentSessionToken = null;
let sessionCheckInterval = null;

// =============================================
// SEGURANCA: MySQL DESATIVADO - USANDO APENAS API
// =============================================
// As credenciais do banco foram removidas por seguranca.
// O app agora usa exclusivamente a API Laravel.
// Variaveis mantidas para compatibilidade com codigo legado.
const mysqlPool = null; // MySQL desativado permanentemente
const USE_API = true;   // Sempre usar API
const apiOnline = true; // API sempre considerada online

// Busca ferramentas via API
async function getFerramentasViaAPI() {
  try {
    if (!currentUser) return [];
    api.setAuthToken(currentSessionToken);
    const ferramentas = await api.getFerramentas();

    // Admin e colaborador tem acesso a tudo
    const isAdmin = currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8;
    const isColaborador = currentUser.nivel_acesso === 'colaborador' || currentUser.plano_id === 5;
    const isModerador = currentUser.nivel_acesso === 'moderador';

    if (isAdmin || isColaborador || isModerador) {
      return ferramentas.map(f => ({ ...f, temAcesso: true }));
    }
    return ferramentas;
  } catch (error) {
    console.error('Erro ao buscar ferramentas via API:', error.message);
    return [];
  }
}

// Funcao principal - usa apenas API (MySQL removido por seguranca)
async function getFerramentas() {
  return await getFerramentasViaAPI();
}

// Busca uma ferramenta por ID (via API)
async function getFerramentaById(id) {
  try {
    api.setAuthToken(currentSessionToken);
    return await api.getFerramentaById(id);
  } catch (error) {
    console.error('Erro ao buscar ferramenta:', error.message);
    return null;
  }
}

// === ACESSOS PREMIUM ===

// Busca acessos premium via API
async function getAcessosPremiumViaAPI() {
  try {
    if (!currentUser) return [];
    api.setAuthToken(currentSessionToken);
    const acessos = await api.getAcessosPremium();

    // Admin e colaborador tem acesso a tudo
    const isAdmin = currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8;
    const isColaborador = currentUser.nivel_acesso === 'colaborador' || currentUser.plano_id === 5;
    const isModerador = currentUser.nivel_acesso === 'moderador';

    if (isAdmin || isColaborador || isModerador) {
      return acessos.map(a => ({ ...a, temAcesso: true }));
    }
    return acessos;
  } catch (error) {
    console.error('Erro ao buscar acessos premium via API:', error.message);
    return [];
  }
}

// Funcao principal - usa apenas API (MySQL removido por seguranca)
async function getAcessosPremium() {
  return await getAcessosPremiumViaAPI();
}

// Busca um acesso premium por ID (via API)
async function getAcessoPremiumById(id) {
  try {
    api.setAuthToken(currentSessionToken);
    return await api.getAcessoPremiumById(id);
  } catch (error) {
    console.error('Erro ao buscar acesso premium:', error.message);
    return null;
  }
}

// === TOOLS (MENUS) ===

// Busca menus/tools via API organizados hierarquicamente
async function getMenuTools() {
  try {
    api.setAuthToken(currentSessionToken);
    const tools = await api.getTools();

    // Organiza em estrutura hierarquica (pai -> filhos)
    const toolMap = new Map();
    const rootTools = [];

    // Primeiro, cria o mapa de todos os tools
    tools.forEach(tool => {
      toolMap.set(tool.id, { ...tool, children: [] });
    });

    // Depois, organiza a hierarquia
    tools.forEach(tool => {
      const toolItem = toolMap.get(tool.id);
      if (tool.parent_id && toolMap.has(tool.parent_id)) {
        // Se tem parent_id, adiciona como filho
        toolMap.get(tool.parent_id).children.push(toolItem);
      } else {
        // Se nao tem parent_id, e um item raiz
        rootTools.push(toolItem);
      }
    });

    return rootTools;
  } catch (error) {
    console.error('Erro ao buscar menus/tools:', error.message);
    return [];
  }
}

// === CANVA ===

// Busca categorias do Canva via API
async function getCanvaCategorias() {
  try {
    api.setAuthToken(currentSessionToken);
    const categorias = await api.getCanvaCategorias();
    return categorias;
  } catch (error) {
    console.error('Erro ao buscar categorias Canva:', error.message);
    return [];
  }
}

// Busca arquivos do Canva via API
async function getCanvaArquivos(filtros = {}) {
  try {
    api.setAuthToken(currentSessionToken);
    let arquivos = await api.getCanvaArquivos();

    // Aplica filtros localmente (API retorna todos)
    if (filtros.categoria_id) {
      arquivos = arquivos.filter(a => a.categoria_id === filtros.categoria_id);
    }
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      arquivos = arquivos.filter(a => a.nome.toLowerCase().includes(busca));
    }

    return arquivos;
  } catch (error) {
    console.error('Erro ao buscar arquivos Canva:', error.message);
    return [];
  }
}

// Busca um arquivo Canva por ID via API
async function getCanvaArquivoById(id) {
  try {
    api.setAuthToken(currentSessionToken);
    const arquivo = await api.getCanvaArquivoById(id);
    return arquivo;
  } catch (error) {
    console.error('Erro ao buscar arquivo Canva:', error.message);
    return null;
  }
}

// Busca acessos do Canva com verificacao de permissao via API
async function getCanvaAcessos() {
  try {
    if (!currentUser) {
      console.log('Usuario nao logado para buscar acessos Canva');
      return [];
    }

    api.setAuthToken(currentSessionToken);
    const acessos = await api.getCanvaAcessos();

    // Admin e colaborador tem acesso a tudo
    const isAdmin = currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8;
    const isColaborador = currentUser.nivel_acesso === 'colaborador' || currentUser.plano_id === 5;
    const isModerador = currentUser.nivel_acesso === 'moderador';

    // Se for admin, colaborador ou moderador, tem acesso a tudo
    if (isAdmin || isColaborador || isModerador) {
      return acessos.map(a => ({ ...a, temAcesso: true }));
    }

    // A API ja retorna com a informacao de acesso baseada no plano do usuario
    return acessos;
  } catch (error) {
    console.error('Erro ao buscar acessos Canva:', error.message);
    return [];
  }
}

// === MATERIAIS ===

// Busca todos os materiais
async function getMateriais() {
  try {
    api.setAuthToken(currentSessionToken);
    const materiais = await api.getMateriais();
    return materiais;
  } catch (error) {
    console.error('Erro ao buscar materiais:', error.message);
    return [];
  }
}

// Abre material no Google Drive (nova janela com navegacao)
async function openMaterialWindow(material) {
  const materialWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      webviewTag: true
    },
    title: material.name
  });

  // HTML da barra de navegacao
  const navBarHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #1a1a2e;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .nav-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: linear-gradient(135deg, #0c6957, #157f67);
          border-bottom: 1px solid #0a5a4a;
        }
        .nav-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.15);
          color: white;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .nav-btn:hover { background: rgba(255,255,255,0.25); }
        .nav-btn:active { transform: scale(0.95); }
        .nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .nav-title {
          flex: 1;
          color: white;
          font-size: 14px;
          font-weight: 500;
          margin-left: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .nav-url {
          flex: 2;
          padding: 8px 12px;
          border: none;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          outline: none;
        }
        webview {
          flex: 1;
          border: none;
        }
      </style>
    </head>
    <body>
      <div class="nav-bar">
        <button class="nav-btn" id="btnBack" title="Voltar">&#8592;</button>
        <button class="nav-btn" id="btnForward" title="Avancar">&#8594;</button>
        <button class="nav-btn" id="btnRefresh" title="Atualizar">&#8635;</button>
        <button class="nav-btn" id="btnHome" title="Pagina inicial">&#8962;</button>
        <span class="nav-title">${material.name.replace(/'/g, "\\'")}</span>
        <input type="text" class="nav-url" id="urlBar" readonly>
      </div>
      <webview id="webview" src="${material.file_path}" allowpopups></webview>
      <script>
        const webview = document.getElementById('webview');
        const btnBack = document.getElementById('btnBack');
        const btnForward = document.getElementById('btnForward');
        const btnRefresh = document.getElementById('btnRefresh');
        const btnHome = document.getElementById('btnHome');
        const urlBar = document.getElementById('urlBar');
        const homeUrl = '${material.file_path}';

        btnBack.onclick = () => webview.goBack();
        btnForward.onclick = () => webview.goForward();
        btnRefresh.onclick = () => webview.reload();
        btnHome.onclick = () => webview.loadURL(homeUrl);

        webview.addEventListener('did-navigate', updateNavState);
        webview.addEventListener('did-navigate-in-page', updateNavState);

        function updateNavState() {
          btnBack.disabled = !webview.canGoBack();
          btnForward.disabled = !webview.canGoForward();
          urlBar.value = webview.getURL();
        }

        webview.addEventListener('dom-ready', updateNavState);
      </script>
    </body>
    </html>
  `;

  // Carrega o HTML com a barra de navegacao
  materialWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(navBarHtml));

  // Configura para permitir downloads
  materialWindow.webContents.session.on('will-download', (event, item, webContents) => {
    console.log('Download iniciado:', item.getFilename());
  });

  return { success: true };
}

// === FUNCAO DE VERIFICACAO ADMIN ===
function isCurrentUserAdmin() {
  if (!currentUser) return false;
  return currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8;
}

// === AUTENTICACAO ===

// Verifica se a assinatura esta valida
function isSubscriptionValid(user) {
  if (!user.data_expiracao) {
    return true; // Sem data de expiracao = sempre valido
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(user.data_expiracao);
  expiry.setHours(0, 0, 0, 0);

  return expiry >= today;
}

// Mensagens de erro por status
const STATUS_MESSAGES = {
  desativado: 'Sua conta foi desativada. Entre em contato com o suporte.',
  banido: 'Sua conta foi banida por violacao dos termos de uso.',
  inadimplente: 'Sua conta esta inadimplente. Regularize seu pagamento para continuar.',
  trial: 'Seu periodo de teste expirou. Assine um plano para continuar.'
};

// Nomes dos planos
const PLANO_NAMES = {
  1: 'Basico',
  2: 'Premium',
  3: 'Plus',
  4: 'Elite',
  5: 'Colaborador',
  6: 'Gratuito',
  7: 'Desativado',
  8: 'Admin',
  9: 'Start',
  10: 'Go'
};

// Faz login do usuario via API
async function loginUserViaAPI(email, password) {
  try {
    console.log('Tentando login via API para:', email);

    const result = await api.login(email, password);

    if (!result.success) {
      return { success: false, error: result.message || 'E-mail ou senha incorretos' };
    }

    // Salva o token da API
    currentSessionToken = result.token;

    // Adiciona nome do plano se nao veio
    if (!result.user.plano_nome) {
      result.user.plano_nome = PLANO_NAMES[result.user.plano_id] || 'Desconhecido';
    }

    currentUser = result.user;

    console.log('Login via API bem sucedido:', result.user.name, '- Plano:', result.user.plano_nome);
    return {
      success: true,
      user: result.user
    };
  } catch (error) {
    console.error('Erro no login via API:', error.message);
    return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
  }
}

// Funcao principal de login - usa apenas API (MySQL removido por seguranca)
async function loginUser(email, password) {
  return await loginUserViaAPI(email, password);
}

// Formata data para exibicao
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}

// Faz logout
function logoutUser() {
  // Para a verificacao de sessao
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
  currentUser = null;
  currentSessionToken = null;
  return { success: true };
}

// Inicia verificacao periodica da sessao (desativado - API valida sessao)
function startSessionCheck(userId) {
  // Verificacao de sessao agora e feita pela API
  // O servidor invalida automaticamente sessoes antigas quando um novo login e feito
  console.log('Verificacao de sessao ativa via API para usuario:', userId);
}

// Funcao para parsear cookies no formato Netscape (cookies.txt)
// Formato: dominio\tflag_subdominio\tpath\tsecure\texpiracao\tnome\tvalor
function parseNetscapeCookies(data) {
  const lines = data.split('\n');
  const cookies = [];
  let detectedDomain = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Ignora linhas vazias e comentarios
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Separa por TAB
    const parts = trimmedLine.split('\t');

    // Formato Netscape tem 7 campos
    if (parts.length >= 7) {
      const [domain, includeSubdomains, path, secure, expiration, name, value] = parts;

      // Captura o dominio principal para construir a URL
      if (!detectedDomain) {
        detectedDomain = domain.startsWith('.') ? domain.substring(1) : domain;
      }

      const cookie = {
        name: name,
        value: value,
        domain: domain,
        path: path || '/',
        secure: secure.toUpperCase() === 'TRUE',
        httpOnly: false // Netscape format nao tem essa info, assume false
      };

      // Adiciona expiracao se nao for 0 (sessao)
      const exp = parseInt(expiration, 10);
      if (exp && exp > 0) {
        cookie.expirationDate = exp;
      }

      cookies.push(cookie);
    }
  }

  return {
    cookies,
    detectedDomain
  };
}

// Verifica se o texto esta no formato Netscape cookies.txt
function isNetscapeFormat(data) {
  // Verifica se contem o header tipico do Netscape ou linhas com formato de cookie
  const lines = data.split('\n');

  // Verifica header Netscape
  if (data.includes('# Netscape HTTP Cookie File') || data.includes('# HTTP Cookie File')) {
    return true;
  }

  // Verifica se tem linhas no formato correto (7 campos separados por TAB)
  let validLines = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split('\t');
    if (parts.length >= 7) {
      // Verifica se o 4o campo (secure) e TRUE ou FALSE
      if (parts[3].toUpperCase() === 'TRUE' || parts[3].toUpperCase() === 'FALSE') {
        validLines++;
      }
    }
  }

  // Se tem pelo menos 3 linhas validas, provavelmente e formato Netscape
  return validLines >= 3;
}

// Funcao para descriptografar dados do FileHub/Session Share
function decryptSessionShare(encryptedData, password = '') {
  try {
    let data = encryptedData.trim();

    // Remove o prefixo "filehub " ou "session_paste " se existir
    if (data.startsWith('filehub ')) {
      data = data.substring(8).trim(); // "filehub " = 8 caracteres
    } else if (data.startsWith('session_paste ')) {
      data = data.substring(14).trim();
    }

    // Verifica se e formato Netscape (cookies.txt)
    if (isNetscapeFormat(data)) {
      console.log('Detectado formato Netscape cookies.txt');
      const { cookies, detectedDomain } = parseNetscapeCookies(data);

      if (cookies.length > 0) {
        // Constroi URL a partir do dominio detectado
        const url = detectedDomain ? `https://${detectedDomain}` : null;
        console.log(`Parseados ${cookies.length} cookies do formato Netscape. Dominio: ${detectedDomain}`);
        return { success: true, cookies, url };
      }

      return { success: false, error: 'Nenhum cookie valido encontrado no formato Netscape.' };
    }

    // Se ja for JSON valido, retorna direto
    if (data.startsWith('[') || data.startsWith('{')) {
      const parsed = JSON.parse(data);
      // Verifica se é formato {url, cookies} ou apenas [cookies]
      if (parsed.cookies && parsed.url) {
        return { success: true, cookies: parsed.cookies, url: parsed.url };
      }
      return { success: true, cookies: parsed };
    }

    // Chave de criptografia do FileHub
    const ENCRYPTION_KEY = 'iLFB0yJSLsObtH6tNcfXMqo7L8qcEHqZ';
    const passwordsToTry = password ? [password, ENCRYPTION_KEY] : [ENCRYPTION_KEY];

    for (const pwd of passwordsToTry) {
      try {
        const decrypted = CryptoJS.AES.decrypt(data, pwd);
        const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);

        if (decryptedStr && decryptedStr.startsWith('{')) {
          const parsed = JSON.parse(decryptedStr);
          // Formato FileHub: { url: "...", cookies: [...] }
          if (parsed.cookies && parsed.url) {
            console.log('Descriptografado com sucesso:', parsed.cookies.length, 'cookies para', parsed.url);
            return { success: true, cookies: parsed.cookies, url: parsed.url };
          }
          return { success: true, cookies: parsed };
        } else if (decryptedStr && decryptedStr.startsWith('[')) {
          return { success: true, cookies: JSON.parse(decryptedStr) };
        }
      } catch (e) {
        // Continua tentando
      }
    }

    return { success: false, error: 'Nao foi possivel descriptografar. Verifique os dados.' };
  } catch (error) {
    return { success: false, error: 'Erro ao processar dados: ' + error.message };
  }
}

// Funcao para criptografar dados de sessao
function encryptSessionShare(url, cookies) {
  try {
    const ENCRYPTION_KEY = 'iLFB0yJSLsObtH6tNcfXMqo7L8qcEHqZ';
    const data = JSON.stringify({ url, cookies });
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    return { success: true, data: encrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Armazena janelas de sessao abertas (para poder salvar depois)
const sessionWindows = new Map();

let mainWindow;
let db;

// Flag para controlar se ja foi para o login
let hasNavigatedToLogin = false;

function createWindow() {
  // Preload do splash (simplificado, so para receber eventos de update)
  const splashPreload = app.isPackaged
    ? path.join(__dirname, 'preload-splash.js')
    : path.join(__dirname, 'preload-splash.js');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: splashPreload
    },
    titleBarStyle: 'default',
    show: false
  });

  // Inicia na tela de splash
  const splashPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'splash.html')
    : path.join(__dirname, 'assets', 'splash.html');
  mainWindow.loadFile(splashPath);

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();

    // Se estiver em producao, verifica updates durante o splash
    if (app.isPackaged) {
      checkForUpdatesOnSplash();
    } else {
      // Em dev, vai direto para o login apos 2 segundos
      console.log('Modo desenvolvimento - pulando verificacao de updates');
      setTimeout(() => {
        goToLoginFromSplash();
      }, 2000);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Verifica updates durante o splash screen
async function checkForUpdatesOnSplash() {
  console.log('Verificando atualizacoes durante o splash...');

  // Envia status inicial
  sendSplashStatus({ type: 'checking' });

  // Verifica API em paralelo
  try {
    const status = await api.checkApiStatus();
    console.log('API Status:', status);
  } catch (e) {
    console.log('Erro ao verificar API:', e.message);
  }

  // Timeout de seguranca - se demorar muito, vai para o login
  const safetyTimeout = setTimeout(() => {
    if (!hasNavigatedToLogin) {
      console.log('Timeout de seguranca - indo para login');
      sendSplashStatus({ type: 'error' });
      goToLoginFromSplash();
    }
  }, 15000); // 15 segundos de timeout

  try {
    const result = await autoUpdater.checkForUpdates();
    console.log('Resultado da verificacao:', result?.updateInfo?.version || 'nenhuma atualizacao');

    // Se nao tem update, vai para o login
    if (!result || !result.updateInfo) {
      clearTimeout(safetyTimeout);
      sendSplashStatus({ type: 'update-not-available' });
      setTimeout(() => goToLoginFromSplash(), 1500);
    }
    // Se tem update, o evento 'update-available' sera disparado e o download comeca automaticamente
  } catch (error) {
    console.log('Erro ao verificar updates:', error.message);
    clearTimeout(safetyTimeout);
    sendSplashStatus({ type: 'error' });
    setTimeout(() => goToLoginFromSplash(), 1500);
  }
}

// Envia status para o splash screen
function sendSplashStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('splash:status', status);
  }
}

// Envia progresso para o splash screen
function sendSplashProgress(progress) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('splash:progress', progress);
  }
}

// Navega do splash para o login
function goToLoginFromSplash() {
  if (hasNavigatedToLogin) return;
  hasNavigatedToLogin = true;

  console.log('Navegando para tela de login...');

  // Troca o preload para o principal antes de carregar o login
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Carrega o login com o preload principal
    mainWindow.webContents.session.setPreloads([path.join(__dirname, 'preload.js')]);

    // Pequeno delay para a transicao
    setTimeout(() => {
      mainWindow.loadFile('src/login.html');
    }, 500);
  }
}

// Navega para a tela principal apos login
function goToMainScreen() {
  if (mainWindow) {
    mainWindow.loadFile('src/index.html');
  }
}

// Navega para a tela de login
function goToLoginScreen() {
  if (mainWindow) {
    currentUser = null;
    mainWindow.loadFile('src/login.html');
  }
}

// Inicializa o banco de dados
function initDatabase() {
  db = new Database();
  db.initialize();
}

// Abre uma nova janela com a sessão logada
async function openSessionWindow(sessionData, ferramentaId = null) {
  const partition = `persist:session-${sessionData.id}`;

  const sessionWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: partition
    },
    title: sessionData.name
  });

  // Armazena referencia da janela para poder salvar sessao depois
  const windowInfo = {
    window: sessionWindow,
    partition: partition,
    url: sessionData.url,
    ferramentaId: ferramentaId,
    name: sessionData.name
  };
  sessionWindows.set(sessionWindow.id, windowInfo);

  // Remove da lista quando fechar
  sessionWindow.on('closed', () => {
    sessionWindows.delete(sessionWindow.id);
  });

  // Cria menu com opcao de salvar sessao (apenas para admins)
  console.log('Verificando se usuario e admin:', currentUser?.nivel_acesso, currentUser?.plano_id);
  if (currentUser && (currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8)) {
    console.log('Usuario e admin - criando menu de sessao...');
    const menuTemplate = [
      {
        label: 'Arquivo',
        submenu: [
          { role: 'close', label: 'Fechar' }
        ]
      },
      {
        label: 'Sessao',
        submenu: [
          {
            label: 'Salvar Sessao',
            accelerator: 'CmdOrCtrl+S',
            click: async () => {
              await saveSessionFromWindow(sessionWindow.id);
            }
          },
          { type: 'separator' },
          {
            label: 'Copiar Cookies',
            click: async () => {
              await copyCookiesFromWindow(sessionWindow.id);
            }
          }
        ]
      },
      {
        label: 'Navegar',
        submenu: [
          { role: 'reload', label: 'Recarregar' },
          { role: 'forceReload', label: 'Forcar Recarga' },
          { type: 'separator' },
          { role: 'toggleDevTools', label: 'DevTools' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    sessionWindow.setMenu(menu);
  }

  const ses = session.fromPartition(partition);

  // Limpa cookies anteriores da partição
  await ses.clearStorageData({ storages: ['cookies'] });

  // Injeta os cookies da sessão
  if (sessionData.cookies) {
    let cookies;
    try {
      cookies = typeof sessionData.cookies === 'string'
        ? JSON.parse(sessionData.cookies)
        : sessionData.cookies;
    } catch (e) {
      console.error('Erro ao parsear cookies:', e);
      cookies = [];
    }

    for (const cookie of cookies) {
      try {
        // Cookies com prefixo __Host- não podem ter domain
        const isHostCookie = cookie.name.startsWith('__Host-');
        const isSecureCookie = cookie.name.startsWith('__Secure-');

        const cookieDetails = {
          url: sessionData.url,
          name: cookie.name,
          value: cookie.value,
          path: cookie.path || '/',
          httpOnly: cookie.httpOnly || false,
          sameSite: cookie.sameSite || 'lax'
        };

        // __Host- cookies: sem domain, path=/, secure=true
        if (isHostCookie) {
          cookieDetails.secure = true;
          cookieDetails.path = '/';
          // Não adiciona domain para __Host- cookies
        } else if (isSecureCookie) {
          cookieDetails.secure = true;
          if (cookie.domain) {
            cookieDetails.domain = cookie.domain;
          }
        } else {
          cookieDetails.secure = cookie.secure || false;
          if (cookie.domain) {
            cookieDetails.domain = cookie.domain;
          }
        }

        // Se tiver expirationDate, adiciona
        if (cookie.expirationDate) {
          cookieDetails.expirationDate = cookie.expirationDate;
        }

        await ses.cookies.set(cookieDetails);
      } catch (err) {
        console.error(`Erro ao setar cookie ${cookie.name}:`, err.message);
      }
    }
  }

  // Log dos cookies setados
  const setCookies = await ses.cookies.get({ url: sessionData.url });
  console.log('Cookies setados na sessao:', setCookies.length);

  // Navega para a URL
  console.log('Navegando para:', sessionData.url);
  sessionWindow.loadURL(sessionData.url);

  // Debug: escuta eventos de navegacao
  sessionWindow.webContents.on('did-start-loading', () => {
    console.log('Pagina iniciou carregamento...');
  });

  sessionWindow.webContents.on('did-finish-load', () => {
    console.log('Pagina terminou de carregar:', sessionWindow.webContents.getURL());
  });

  sessionWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Erro ao carregar pagina:', errorCode, errorDescription, validatedURL);
  });

  return { success: true };
}

// Salva a sessao da janela para o banco de dados
async function saveSessionFromWindow(windowId) {
  console.log('=== SALVANDO SESSAO ===');
  console.log('Window ID:', windowId);

  const windowInfo = sessionWindows.get(windowId);
  console.log('Window Info:', windowInfo ? 'Encontrado' : 'NAO ENCONTRADO');
  console.log('Ferramenta ID:', windowInfo?.ferramentaId);

  if (!windowInfo) {
    dialog.showErrorBox('Erro', 'Janela de sessao nao encontrada');
    return;
  }

  try {
    const ses = session.fromPartition(windowInfo.partition);
    const currentUrl = windowInfo.window.webContents.getURL();

    // Pega todos os cookies da sessao
    const cookies = await ses.cookies.get({});

    console.log('Cookies capturados:', cookies.length);
    console.log('URL atual:', currentUrl);

    // Criptografa os dados
    const encrypted = encryptSessionShare(currentUrl, cookies);

    if (!encrypted.success) {
      dialog.showErrorBox('Erro', 'Erro ao criptografar sessao: ' + encrypted.error);
      return;
    }

    // Copia sessao para clipboard (salvamento direto no banco desativado por seguranca)
    const { clipboard } = require('electron');
    clipboard.writeText(encrypted.data);

    if (windowInfo.ferramentaId) {
      // Informa que precisa colar no painel admin
      dialog.showMessageBox(windowInfo.window, {
        type: 'info',
        title: 'Sessao Copiada',
        message: 'Dados da sessao copiados para a area de transferencia!',
        detail: `${cookies.length} cookies foram copiados.\n\nPara salvar, cole no campo "Link ou Conteudo" da ferramenta no painel admin (filehub.space/admin).`
      });
    } else {
      dialog.showMessageBox(windowInfo.window, {
        type: 'info',
        title: 'Sessao Copiada',
        message: 'Dados da sessao copiados para a area de transferencia!',
        detail: `${cookies.length} cookies foram copiados.\nCole no campo "Link ou Conteudo" da ferramenta no painel admin.`
      });
    }
  } catch (error) {
    console.error('Erro ao salvar sessao:', error);
    dialog.showErrorBox('Erro', 'Erro ao salvar sessao: ' + error.message);
  }
}

// Copia cookies da janela para clipboard
async function copyCookiesFromWindow(windowId) {
  const windowInfo = sessionWindows.get(windowId);
  if (!windowInfo) {
    dialog.showErrorBox('Erro', 'Janela de sessao nao encontrada');
    return;
  }

  try {
    const ses = session.fromPartition(windowInfo.partition);
    const currentUrl = windowInfo.window.webContents.getURL();

    // Pega todos os cookies da sessao
    const cookies = await ses.cookies.get({});

    // Criptografa os dados
    const encrypted = encryptSessionShare(currentUrl, cookies);

    if (encrypted.success) {
      const { clipboard } = require('electron');
      clipboard.writeText(encrypted.data);

      dialog.showMessageBox(windowInfo.window, {
        type: 'info',
        title: 'Cookies Copiados',
        message: 'Cookies copiados para a area de transferencia!',
        detail: `${cookies.length} cookies foram criptografados e copiados.\nVoce pode colar no campo "Link ou Conteudo" de outra ferramenta.`
      });
    }
  } catch (error) {
    console.error('Erro ao copiar cookies:', error);
    dialog.showErrorBox('Erro', 'Erro ao copiar cookies: ' + error.message);
  }
}

// IPC Handlers
ipcMain.handle('db:getCategories', () => {
  return db.getCategories();
});

ipcMain.handle('db:addCategory', (event, category) => {
  return db.addCategory(category);
});

ipcMain.handle('db:updateCategory', (event, id, category) => {
  return db.updateCategory(id, category);
});

ipcMain.handle('db:deleteCategory', (event, id) => {
  return db.deleteCategory(id);
});

ipcMain.handle('db:getSessions', () => {
  return db.getSessions();
});

ipcMain.handle('db:getSessionsByCategory', (event, categoryId) => {
  return db.getSessionsByCategory(categoryId);
});

ipcMain.handle('db:addSession', (event, sessionData) => {
  return db.addSession(sessionData);
});

ipcMain.handle('db:updateSession', (event, id, sessionData) => {
  return db.updateSession(id, sessionData);
});

ipcMain.handle('db:deleteSession', (event, id) => {
  return db.deleteSession(id);
});

ipcMain.handle('session:open', async (event, sessionData) => {
  return await openSessionWindow(sessionData);
});

// Abre URL externa no navegador padrao
ipcMain.handle('shell:openExternal', async (event, url) => {
  try {
    if (url && url.startsWith('http')) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: 'URL invalida' };
  } catch (error) {
    console.error('Erro ao abrir URL externa:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('crypto:decrypt', (event, data, password) => {
  return decryptSessionShare(data, password);
});

// === AUTENTICACAO IPC ===
ipcMain.handle('auth:login', async (event, email, password) => {
  const result = await loginUser(email, password);
  if (result.success) {
    goToMainScreen();
  }
  return result;
});

ipcMain.handle('auth:logout', () => {
  logoutUser();
  goToLoginScreen();
  return { success: true };
});

ipcMain.handle('auth:getCurrentUser', () => {
  return currentUser;
});

// === FERRAMENTAS DO MYSQL ===
ipcMain.handle('ferramentas:getAll', async () => {
  return await getFerramentas();
});

ipcMain.handle('ferramentas:getById', async (event, id) => {
  return await getFerramentaById(id);
});

// Abre uma ferramenta do banco de dados
ipcMain.handle('ferramentas:open', async (event, ferramenta) => {
  try {
    console.log('=== ABRINDO FERRAMENTA ===');
    console.log('Titulo:', ferramenta.titulo);
    console.log('Tipo acesso:', ferramenta.tipo_acesso);
    console.log('Link/Conteudo (primeiros 100 chars):', ferramenta.link_ou_conteudo?.substring(0, 100));

    const tipoAcesso = ferramenta.tipo_acesso || 'sessao';

    // === TIPO: LINK - Abre URL diretamente no navegador ===
    if (tipoAcesso === 'link') {
      const url = ferramenta.link_ou_conteudo;
      if (url) {
        shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: 'URL nao configurada' };
    }

    // === TIPO: COOKIES_TXT (Netscape) - Parser especifico ===
    if (tipoAcesso === 'cookies_txt') {
      console.log('Processando formato Cookies.txt (Netscape)...');

      if (!ferramenta.link_ou_conteudo || !isNetscapeFormat(ferramenta.link_ou_conteudo)) {
        const isAdmin = currentUser && (currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8);
        return {
          success: false,
          error: 'Cookies.txt nao configurado ou formato invalido',
          needsSetup: true,
          isAdmin: isAdmin
        };
      }

      const { cookies, detectedDomain } = parseNetscapeCookies(ferramenta.link_ou_conteudo);

      if (cookies.length === 0) {
        return { success: false, error: 'Nenhum cookie valido encontrado no arquivo cookies.txt' };
      }

      const url = detectedDomain ? `https://${detectedDomain}` : null;
      if (!url) {
        return { success: false, error: 'Nao foi possivel detectar o dominio dos cookies' };
      }

      console.log(`Cookies.txt: ${cookies.length} cookies para ${url}`);

      const sessionData = {
        id: `ferramenta-${ferramenta.id}`,
        name: ferramenta.titulo,
        url: url,
        cookies: JSON.stringify(cookies)
      };

      return await openSessionWindow(sessionData, ferramenta.id);
    }

    // === TIPO: SESSAO (Extensao FileHub) - Fluxo original sem modificacoes ===
    const decrypted = decryptSessionShare(ferramenta.link_ou_conteudo);

    console.log('Resultado descriptografia:', decrypted.success ? 'SUCESSO' : 'FALHA');
    if (decrypted.success) {
      console.log('URL encontrada:', decrypted.url);
      console.log('Cookies encontrados:', decrypted.cookies?.length || 0);
    } else {
      console.log('Erro:', decrypted.error);
    }

    if (!decrypted.success) {
      // Se nao tem sessao e usuario e admin, retorna erro especial para permitir configurar
      const isAdmin = currentUser && (currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8);
      return {
        success: false,
        error: decrypted.error,
        needsSetup: true,
        isAdmin: isAdmin
      };
    }

    // Cria a sessao com os dados
    const sessionData = {
      id: `ferramenta-${ferramenta.id}`,
      name: ferramenta.titulo,
      url: decrypted.url,
      cookies: JSON.stringify(decrypted.cookies)
    };

    console.log('Abrindo sessao para URL:', sessionData.url);

    // Passa o ID da ferramenta para poder salvar a sessao depois
    return await openSessionWindow(sessionData, ferramenta.id);
  } catch (error) {
    console.error('Erro ao abrir ferramenta:', error);
    return { success: false, error: error.message };
  }
});

// Abre sessao em branco para configurar login (apenas admin)
ipcMain.handle('ferramentas:openBlank', async (event, ferramenta, url) => {
  try {
    // Verifica se e admin
    if (!currentUser || (currentUser.nivel_acesso !== 'admin' && currentUser.plano_id !== 8)) {
      return { success: false, error: 'Apenas administradores podem configurar sessoes' };
    }

    console.log('=== ABRINDO SESSAO EM BRANCO ===');
    console.log('Ferramenta:', ferramenta.titulo);
    console.log('URL:', url);

    // Cria a sessao sem cookies
    const sessionData = {
      id: `ferramenta-${ferramenta.id}`,
      name: ferramenta.titulo,
      url: url,
      cookies: '[]'
    };

    return await openSessionWindow(sessionData, ferramenta.id);
  } catch (error) {
    console.error('Erro ao abrir sessao em branco:', error);
    return { success: false, error: error.message };
  }
});

// === ACESSOS PREMIUM IPC ===
ipcMain.handle('acessosPremium:getAll', async () => {
  return await getAcessosPremium();
});

ipcMain.handle('acessosPremium:getById', async (event, id) => {
  return await getAcessoPremiumById(id);
});

// === TOOLS (MENUS) IPC ===
ipcMain.handle('tools:getAll', async () => {
  return await getMenuTools();
});

// === CANVA IPC ===
ipcMain.handle('canva:getCategorias', async () => {
  return await getCanvaCategorias();
});

ipcMain.handle('canva:getArquivos', async (event, filtros) => {
  return await getCanvaArquivos(filtros);
});

ipcMain.handle('canva:getArquivoById', async (event, id) => {
  return await getCanvaArquivoById(id);
});

ipcMain.handle('canva:getAcessos', async () => {
  return await getCanvaAcessos();
});

// === MATERIAIS IPC ===
ipcMain.handle('materiais:getAll', async () => {
  return await getMateriais();
});

ipcMain.handle('materiais:open', async (event, material) => {
  return await openMaterialWindow(material);
});

// =============================================
// ADMIN - GERENCIAMENTO (APENAS ADMIN)
// =============================================

// === ADMIN - USUARIOS ===
// NOTA: Gerenciamento de usuarios deve ser feito pelo painel admin em filehub.space/admin

ipcMain.handle('admin:getUsers', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  // Para visualizar usuarios, use o painel admin
  return { success: false, error: 'Para gerenciar usuarios, use o painel admin em filehub.space/admin', useAdminPanel: true, data: [] };
});

ipcMain.handle('admin:updateUser', async (event, userId, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar usuarios, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:deleteUser', async (event, userId) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar usuarios, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// === ADMIN - FERRAMENTAS ===
// NOTA: Operacoes de escrita devem ser feitas pelo painel admin em filehub.space/admin

ipcMain.handle('admin:getFerramentasAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const ferramentas = await api.getFerramentas();
    return { success: true, data: ferramentas };
  } catch (error) {
    console.error('Erro ao buscar ferramentas:', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle('admin:createFerramenta', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  // Operacao de escrita - usar painel admin
  return {
    success: false,
    error: 'Para criar ferramentas, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:updateFerramenta', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  // Operacao de escrita - usar painel admin
  return {
    success: false,
    error: 'Para editar ferramentas, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:deleteFerramenta', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  // Operacao de escrita - usar painel admin
  return {
    success: false,
    error: 'Para deletar ferramentas, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Buscar quais planos tem acesso a uma ferramenta
ipcMain.handle('admin:getFerramentaPlanos', async (event, ferramentaId) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  // Esta informacao vem junto com as ferramentas na API
  return { success: true, data: [] };
});

// Atualizar quais planos tem acesso a uma ferramenta
ipcMain.handle('admin:updateFerramentaPlanos', async (event, ferramentaId, planosIds) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  // Operacao de escrita - usar painel admin
  return {
    success: false,
    error: 'Para gerenciar planos das ferramentas, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// === ADMIN - ACESSOS PREMIUM ===
// NOTA: Operacoes de escrita devem ser feitas pelo painel admin em filehub.space/admin

ipcMain.handle('admin:getAcessosPremiumAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const acessos = await api.getAcessosPremium();
    return { success: true, data: acessos };
  } catch (error) {
    console.error('Erro ao buscar acessos premium:', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle('admin:createAcessoPremium', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar acessos premium, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:updateAcessoPremium', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar acessos premium, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:deleteAcessoPremium', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar acessos premium, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Buscar quais planos tem acesso a um acesso premium
ipcMain.handle('admin:getAcessoPremiumPlanos', async (event, acessoId) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return { success: true, data: [] };
});

// Atualizar quais planos tem acesso a um acesso premium
ipcMain.handle('admin:updateAcessoPremiumPlanos', async (event, acessoId, planosIds) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para gerenciar planos dos acessos, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// === ADMIN - CANVA CATEGORIAS ===
// NOTA: Operacoes de escrita devem ser feitas pelo painel admin em filehub.space/admin

ipcMain.handle('admin:getCanvaCategoriasAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const categorias = await api.getCanvaCategorias();
    return { success: true, data: categorias };
  } catch (error) {
    console.error('Erro ao buscar categorias Canva:', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle('admin:createCanvaCategoria', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar categorias Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:updateCanvaCategoria', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar categorias Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:deleteCanvaCategoria', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar categorias Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// === ADMIN - CANVA ARQUIVOS ===
// NOTA: Operacoes de escrita devem ser feitas pelo painel admin em filehub.space/admin

ipcMain.handle('admin:getCanvaArquivosAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const arquivos = await api.getCanvaArquivos();
    return { success: true, data: arquivos };
  } catch (error) {
    console.error('Erro ao buscar arquivos Canva:', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle('admin:createCanvaArquivo', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar arquivos Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:updateCanvaArquivo', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar arquivos Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:deleteCanvaArquivo', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar arquivos Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// === ADMIN - TOOLS ===
// NOTA: Operacoes de escrita devem ser feitas pelo painel admin em filehub.space/admin

ipcMain.handle('admin:getToolsAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const tools = await api.getTools();
    return { success: true, data: tools };
  } catch (error) {
    console.error('Erro ao buscar tools:', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle('admin:createTool', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar tools, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:updateTool', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar tools, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:deleteTool', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar tools, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// === ADMIN - CANVA ACESSOS ===
// NOTA: Operacoes de escrita devem ser feitas pelo painel admin em filehub.space/admin

ipcMain.handle('admin:getCanvaAcessosAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const acessos = await api.getCanvaAcessos();
    return { success: true, data: acessos };
  } catch (error) {
    console.error('Erro ao buscar acessos Canva:', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle('admin:createCanvaAcesso', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar acessos Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:updateCanvaAcesso', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar acessos Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

ipcMain.handle('admin:deleteCanvaAcesso', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar acessos Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Buscar quais planos tem acesso a um acesso canva
ipcMain.handle('admin:getCanvaAcessoPlanos', async (event, canvaAcessoId) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return { success: true, data: [] };
});

// Atualizar quais planos tem acesso a um acesso canva
ipcMain.handle('admin:updateCanvaAcessoPlanos', async (event, canvaAcessoId, planosIds) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para gerenciar planos dos acessos Canva, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// === ADMIN - PLANOS (para dropdown) ===
ipcMain.handle('admin:getPlanos', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const planos = await api.getPlanos();
    return { success: true, data: planos };
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    // Se falhar, retorna os planos padrao
    return { success: true, data: Object.entries(PLANO_NAMES).map(([id, nome]) => ({ id: parseInt(id), nome })) };
  }
});

// === PERFIL DO USUARIO ===
ipcMain.handle('profile:update', async (event, data) => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Usuario nao autenticado' };
    }

    // Usa a API para atualizar perfil
    api.setAuthToken(currentSessionToken);
    await api.updateProfile(data);

    // Atualiza o usuario local
    if (data.avatar !== undefined) currentUser.avatar = data.avatar;
    if (data.whatsapp !== undefined) currentUser.whatsapp = data.whatsapp;
    if (data.pin !== undefined) currentUser.security_pin = data.pin;

    console.log('Perfil atualizado com sucesso');
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { success: false, error: error.message || 'Erro ao atualizar perfil' };
  }
});

// =============================================
// AUTO-UPDATER
// =============================================

function setupAutoUpdater() {
  // NAO verifica automaticamente aqui - sera feito no splash
  // autoUpdater.checkForUpdates() - removido

  // Atualizacao disponivel - inicia download automaticamente
  autoUpdater.on('update-available', (info) => {
    console.log('Atualizacao disponivel:', info.version);

    // Envia para o splash
    sendSplashStatus({ type: 'update-available', version: info.version });

    // Tambem notifica o renderer (para quando ja passou do splash)
    mainWindow?.webContents.send('update:available', info);
  });

  // Nenhuma atualizacao disponivel
  autoUpdater.on('update-not-available', () => {
    console.log('App esta atualizado');

    // Envia para o splash e vai para login
    sendSplashStatus({ type: 'update-not-available' });

    if (!hasNavigatedToLogin) {
      setTimeout(() => goToLoginFromSplash(), 1500);
    }
  });

  // Progresso do download
  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download: ${Math.round(progress.percent)}%`);

    // Envia para o splash
    sendSplashProgress(progress);

    // Tambem notifica o renderer
    mainWindow?.webContents.send('update:progress', progress);
  });

  // Download concluido - instala automaticamente
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Atualizacao baixada:', info.version);

    // Envia para o splash
    sendSplashStatus({ type: 'downloaded', version: info.version });

    // Tambem notifica o renderer
    mainWindow?.webContents.send('update:downloaded', info);

    // Aguarda 2 segundos e instala automaticamente
    setTimeout(() => {
      console.log('Iniciando instalacao da atualizacao...');
      sendSplashStatus({ type: 'installing' });

      // Metodo mais seguro de instalar a atualizacao
      setImmediate(() => {
        try {
          // Remove listeners de close de todas as janelas para evitar bloqueios
          const allWindows = BrowserWindow.getAllWindows();
          allWindows.forEach(win => {
            win.removeAllListeners('close');
            win.destroy();
          });

          // Usa quitAndInstall com parametros corretos
          // isSilent = false (mostra instalador)
          // isForceRunAfter = true (reinicia app apos instalacao)
          autoUpdater.quitAndInstall(false, true);
        } catch (err) {
          console.error('Erro ao instalar update:', err);
          // Fallback: forca saida do app
          app.exit(0);
        }
      });
    }, 2000);
  });

  // Erro no update
  autoUpdater.on('error', (err) => {
    console.error('Erro no auto-updater:', err.message);

    // Envia para o splash
    sendSplashStatus({ type: 'error', message: err.message });

    // Tambem notifica o renderer
    mainWindow?.webContents.send('update:error', err.message);

    // Se ainda esta no splash, vai para o login
    if (!hasNavigatedToLogin) {
      setTimeout(() => goToLoginFromSplash(), 1500);
    }
  });
}

// IPC para verificar atualizacoes manualmente
ipcMain.handle('update:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, version: result?.updateInfo?.version };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// =============================================
// MENU PERSONALIZADO
// =============================================

function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Atualizar Ferramentas',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.send('menu:refresh');
          }
        },
        { type: 'separator' },
        {
          label: 'Verificar Atualizacoes',
          click: () => {
            autoUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Colar', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        { label: 'Selecionar Tudo', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Exibir',
      submenu: [
        {
          label: 'Tela Cheia',
          accelerator: 'F11',
          click: () => {
            const isFullScreen = mainWindow?.isFullScreen();
            mainWindow?.setFullScreen(!isFullScreen);
          }
        },
        { type: 'separator' },
        {
          label: 'Aumentar Zoom',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            const currentZoom = mainWindow?.webContents.getZoomFactor();
            mainWindow?.webContents.setZoomFactor(currentZoom + 0.1);
          }
        },
        {
          label: 'Diminuir Zoom',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            const currentZoom = mainWindow?.webContents.getZoomFactor();
            mainWindow?.webContents.setZoomFactor(Math.max(0.5, currentZoom - 0.1));
          }
        },
        {
          label: 'Zoom Padrao',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            mainWindow?.webContents.setZoomFactor(1);
          }
        },
        { type: 'separator' },
        {
          label: 'Ferramentas do Desenvolvedor',
          accelerator: 'F12',
          click: () => {
            mainWindow?.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Janela',
      submenu: [
        {
          label: 'Minimizar',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize'
        },
        {
          label: 'Fechar',
          accelerator: 'CmdOrCtrl+W',
          role: 'close'
        }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre o FileHub',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre o FileHub',
              message: 'FileHub',
              detail: `Versao: ${app.getVersion()}\n\nGerenciador de Sessoes Compartilhadas\n\n© 2025 Creative Next - FileHub Plus`
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Visitar Site',
          click: () => {
            shell.openExternal('https://filehub.space');
          }
        },
        {
          label: 'Suporte via WhatsApp',
          click: () => {
            shell.openExternal('https://wa.me/5511999999999');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// =============================================
// PLANOS PLATAFORMA
// =============================================

// Buscar planos da plataforma (para usuarios) - via API
ipcMain.handle('planos:getAll', async () => {
  try {
    api.setAuthToken(currentSessionToken);
    const planos = await api.getPlanosPlataforma();
    return { success: true, data: planos };
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Buscar todos os planos - via API
ipcMain.handle('admin:getPlanosPlataforma', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const planos = await api.getPlanosPlataforma();
    return { success: true, data: planos };
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Criar plano
ipcMain.handle('admin:createPlanoPlataforma', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar planos, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Atualizar plano
ipcMain.handle('admin:updatePlanoPlataforma', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar planos, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Deletar plano
ipcMain.handle('admin:deletePlanoPlataforma', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar planos, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// =============================================
// PLANOS DETALHES (Comparativo)
// =============================================

// Buscar detalhes dos planos (para usuarios - modal comparativo) - via API
ipcMain.handle('planosDetalhes:getAll', async () => {
  try {
    api.setAuthToken(currentSessionToken);
    const detalhes = await api.getPlanosDetalhes();
    return { success: true, data: detalhes };
  } catch (error) {
    console.error('Erro ao buscar detalhes dos planos:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Buscar todos os detalhes - via API
ipcMain.handle('admin:getPlanosDetalhes', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const detalhes = await api.getPlanosDetalhes();
    return { success: true, data: detalhes };
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Criar detalhe
ipcMain.handle('admin:createPlanoDetalhe', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar detalhes de planos, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Atualizar detalhe
ipcMain.handle('admin:updatePlanoDetalhe', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar detalhes de planos, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Deletar detalhe
ipcMain.handle('admin:deletePlanoDetalhe', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar detalhes de planos, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// =============================================
// REPORTS
// =============================================

// Usuario criar report - via API
ipcMain.handle('reports:create', async (event, data) => {
  if (!currentUser) {
    return { success: false, error: 'Usuario nao autenticado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const result = await api.createReport(data.ferramenta_id, data.tipo_report || 'ferramenta', data.motivo);
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Erro ao criar report:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar todos os reports
ipcMain.handle('admin:getReports', async (event, filtros) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  // Reports devem ser gerenciados pelo painel admin
  return { success: false, error: 'Para gerenciar reports, use o painel admin em filehub.space/admin', useAdminPanel: true, data: [] };
});

// Admin - Buscar report por ID
ipcMain.handle('admin:getReportById', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return { success: false, error: 'Para ver reports, use o painel admin em filehub.space/admin', useAdminPanel: true };
});

// Admin - Atualizar status do report e da ferramenta
ipcMain.handle('admin:updateReportStatus', async (event, reportId, newStatus) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para gerenciar reports, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// =============================================
// DASHBOARD - BANNERS E COVERS
// =============================================

// Buscar banners ativos (via API)
ipcMain.handle('dashboard:getBanners', async () => {
  try {
    api.setAuthToken(currentSessionToken);
    const banners = await api.getDashboardBanners();
    return { success: true, data: banners };
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Buscar covers ativos (via API)
ipcMain.handle('dashboard:getCovers', async () => {
  try {
    api.setAuthToken(currentSessionToken);
    const covers = await api.getDashboardCovers();
    return { success: true, data: covers };
  } catch (error) {
    console.error('Erro ao buscar covers:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar todos os banners (via API)
ipcMain.handle('admin:getBanners', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const banners = await api.getDashboardBanners();
    return { success: true, data: banners };
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Criar banner
ipcMain.handle('admin:createBanner', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar banners, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Atualizar banner
ipcMain.handle('admin:updateBanner', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar banners, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Deletar banner
ipcMain.handle('admin:deleteBanner', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar banners, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Buscar todos os covers (via API)
ipcMain.handle('admin:getCovers', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const covers = await api.getDashboardCovers();
    return { success: true, data: covers };
  } catch (error) {
    console.error('Erro ao buscar covers:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Criar cover
ipcMain.handle('admin:createCover', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar covers, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Atualizar cover
ipcMain.handle('admin:updateCover', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar covers, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Deletar cover
ipcMain.handle('admin:deleteCover', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar covers, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// =============================================
// MENU - GERENCIAMENTO
// =============================================

// Buscar itens do menu ativos (para exibicao) - via API
ipcMain.handle('menu:getItems', async () => {
  try {
    api.setAuthToken(currentSessionToken);
    const items = await api.getMenuItems();
    // Filtra apenas os ativos
    const activeItems = items.filter(item => item.is_active === 1);
    return { success: true, data: activeItems };
  } catch (error) {
    console.error('Erro ao buscar menu:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Buscar TODOS os itens do menu (para verificar paginas ativas/inativas) - via API
ipcMain.handle('menu:getAllItems', async () => {
  try {
    api.setAuthToken(currentSessionToken);
    const items = await api.getMenuItems();
    return { success: true, data: items };
  } catch (error) {
    console.error('Erro ao buscar todos os itens do menu:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Buscar todos os itens do menu (via API)
ipcMain.handle('admin:getMenuItems', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    api.setAuthToken(currentSessionToken);
    const items = await api.getMenuItems();
    return { success: true, data: items };
  } catch (error) {
    console.error('Erro ao buscar menu:', error);
    return { success: false, error: error.message, data: [] };
  }
});

// Admin - Criar item do menu
ipcMain.handle('admin:createMenuItem', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para criar itens do menu, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Atualizar item do menu
ipcMain.handle('admin:updateMenuItem', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para editar itens do menu, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// Admin - Deletar item do menu
ipcMain.handle('admin:deleteMenuItem', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  return {
    success: false,
    error: 'Para deletar itens do menu, use o painel admin em filehub.space/admin',
    useAdminPanel: true
  };
});

// =============================================
// INICIALIZACAO (MySQL removido - menu vem da API)
// =============================================

// =============================================
// APP LIFECYCLE
// =============================================

app.whenReady().then(async () => {
  // MySQL removido por seguranca - usando apenas API
  // await initDefaultMenuItems(); // Desativado - menu vem da API
  initDatabase();

  // Configura auto-updater ANTES de criar a janela (para eventos funcionarem no splash)
  if (app.isPackaged) {
    setupAutoUpdater();
  } else {
    console.log('Skip checkForUpdates because application is not packed and dev update config is not forced');
  }

  // Reseta flag de navegacao
  hasNavigatedToLogin = false;

  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      hasNavigatedToLogin = false;
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
