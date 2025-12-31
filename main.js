const { app, BrowserWindow, ipcMain, session, dialog, Menu, shell } = require('electron');
const path = require('path');
const CryptoJS = require('crypto-js');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');
const Database = require('./src/database');

// Configuracao do auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Usuario logado atualmente
let currentUser = null;
let currentSessionToken = null;
let sessionCheckInterval = null;

// Configuracao do banco de dados MySQL
const mysqlConfig = {
  host: '157.230.211.234',
  user: 'filehub',
  password: 'Mel102424!@#',
  database: 'filehub',
  waitForConnections: true,
  connectionLimit: 10
};

let mysqlPool = null;

// Inicializa conexao MySQL
async function initMySQL() {
  try {
    mysqlPool = mysql.createPool(mysqlConfig);
    const connection = await mysqlPool.getConnection();
    console.log('Conectado ao MySQL com sucesso!');
    connection.release();
    return true;
  } catch (error) {
    console.error('Erro ao conectar ao MySQL:', error.message);
    return false;
  }
}

// Busca ferramentas do banco MySQL com informacao de acesso do usuario
async function getFerramentas() {
  try {
    if (!currentUser) {
      return [];
    }

    // Admin e colaborador tem acesso a tudo
    const isAdmin = currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8;
    const isColaborador = currentUser.nivel_acesso === 'colaborador' || currentUser.plano_id === 5;
    const isModerador = currentUser.nivel_acesso === 'moderador';

    // Busca todas as ferramentas (todos os status para mostrar)
    const [ferramentas] = await mysqlPool.execute(
      'SELECT * FROM ferramentas ORDER BY titulo'
    );

    // Se for admin, colaborador ou moderador, tem acesso a tudo
    if (isAdmin || isColaborador || isModerador) {
      return ferramentas.map(f => ({ ...f, temAcesso: true }));
    }

    // Busca quais ferramentas o plano do usuario tem acesso
    const [acessos] = await mysqlPool.execute(
      'SELECT ferramenta_id FROM ferramenta_plano WHERE plano_id = ?',
      [currentUser.plano_id]
    );

    const ferramentasComAcesso = new Set(acessos.map(a => a.ferramenta_id));

    // Marca cada ferramenta se o usuario tem acesso
    return ferramentas.map(f => ({
      ...f,
      temAcesso: ferramentasComAcesso.has(f.id)
    }));
  } catch (error) {
    console.error('Erro ao buscar ferramentas:', error.message);
    return [];
  }
}

// Busca uma ferramenta por ID
async function getFerramentaById(id) {
  try {
    const [rows] = await mysqlPool.execute(
      'SELECT * FROM ferramentas WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar ferramenta:', error.message);
    return null;
  }
}

// === ACESSOS PREMIUM ===

// Busca acessos premium do banco MySQL com informacao de acesso do usuario
async function getAcessosPremium() {
  try {
    if (!currentUser) {
      return [];
    }

    // Admin e colaborador tem acesso a tudo
    const isAdmin = currentUser.nivel_acesso === 'admin' || currentUser.plano_id === 8;
    const isColaborador = currentUser.nivel_acesso === 'colaborador' || currentUser.plano_id === 5;
    const isModerador = currentUser.nivel_acesso === 'moderador';

    // Busca todos os acessos premium
    const [acessos] = await mysqlPool.execute(
      'SELECT * FROM acesso_premiums ORDER BY titulo'
    );

    // Se for admin, colaborador ou moderador, tem acesso a tudo
    if (isAdmin || isColaborador || isModerador) {
      return acessos.map(a => ({ ...a, temAcesso: true }));
    }

    // Busca quais acessos premium o plano do usuario tem acesso
    const [permissoes] = await mysqlPool.execute(
      'SELECT acesso_premium_id FROM acesso_premium_plano WHERE plano_id = ?',
      [currentUser.plano_id]
    );

    const acessosComPermissao = new Set(permissoes.map(p => p.acesso_premium_id));

    // Marca cada acesso se o usuario tem permissao
    return acessos.map(a => ({
      ...a,
      temAcesso: acessosComPermissao.has(a.id)
    }));
  } catch (error) {
    console.error('Erro ao buscar acessos premium:', error.message);
    return [];
  }
}

// Busca um acesso premium por ID
async function getAcessoPremiumById(id) {
  try {
    const [rows] = await mysqlPool.execute(
      'SELECT * FROM acesso_premiums WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar acesso premium:', error.message);
    return null;
  }
}

// === TOOLS (MENUS) ===

// Busca menus/tools do banco MySQL organizados hierarquicamente
async function getMenuTools() {
  try {
    // Busca todos os tools ativos que devem aparecer no app (show_app=1)
    const [tools] = await mysqlPool.execute(
      'SELECT * FROM tools WHERE is_active = 1 AND show_app = 1 ORDER BY ordem ASC'
    );

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

// Busca categorias do Canva
async function getCanvaCategorias() {
  try {
    const [categorias] = await mysqlPool.execute(
      'SELECT * FROM canva_categorias WHERE status = 1 ORDER BY ordem ASC, nome ASC'
    );
    return categorias;
  } catch (error) {
    console.error('Erro ao buscar categorias Canva:', error.message);
    return [];
  }
}

// Busca arquivos do Canva com filtros opcionais
async function getCanvaArquivos(filtros = {}) {
  try {
    let query = `
      SELECT ca.*, cc.nome as categoria_nome
      FROM canva_arquivos ca
      LEFT JOIN canva_categorias cc ON ca.categoria_id = cc.id
      WHERE ca.status = 1
    `;
    const params = [];

    // Filtro por categoria
    if (filtros.categoria_id) {
      query += ' AND ca.categoria_id = ?';
      params.push(filtros.categoria_id);
    }

    // Filtro por busca (nome)
    if (filtros.busca) {
      query += ' AND ca.nome LIKE ?';
      params.push('%' + filtros.busca + '%');
    }

    query += ' ORDER BY ca.nome ASC';

    const [arquivos] = await mysqlPool.execute(query, params);
    return arquivos;
  } catch (error) {
    console.error('Erro ao buscar arquivos Canva:', error.message);
    return [];
  }
}

// Busca um arquivo Canva por ID
async function getCanvaArquivoById(id) {
  try {
    const [rows] = await mysqlPool.execute(
      `SELECT ca.*, cc.nome as categoria_nome
       FROM canva_arquivos ca
       LEFT JOIN canva_categorias cc ON ca.categoria_id = cc.id
       WHERE ca.id = ?`,
      [id]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar arquivo Canva:', error.message);
    return null;
  }
}

// Busca acessos do Canva
async function getCanvaAcessos() {
  try {
    const [acessos] = await mysqlPool.execute(
      'SELECT * FROM canva_acessos WHERE status = 1 ORDER BY titulo ASC'
    );
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
    const [materiais] = await mysqlPool.execute(
      'SELECT * FROM materials ORDER BY name'
    );
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

// Busca usuario por email
async function getUserByEmail(email) {
  try {
    const [rows] = await mysqlPool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar usuario:', error.message);
    return null;
  }
}

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

// Faz login do usuario
async function loginUser(email, password) {
  try {
    console.log('Tentando login para:', email);

    const user = await getUserByEmail(email);

    if (!user) {
      console.log('Usuario nao encontrado');
      return { success: false, error: 'E-mail ou senha incorretos' };
    }

    // Verifica a senha com bcrypt (Laravel usa bcrypt por padrao)
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.log('Senha incorreta');
      return { success: false, error: 'E-mail ou senha incorretos' };
    }

    // Verifica o status do usuario - so permite 'ativo'
    if (user.status && user.status !== 'ativo') {
      console.log('Status do usuario:', user.status);
      const errorMsg = STATUS_MESSAGES[user.status] || 'Sua conta nao esta ativa.';
      return { success: false, error: errorMsg, statusBlocked: true };
    }

    // Verifica se a assinatura esta valida
    if (!isSubscriptionValid(user)) {
      console.log('Assinatura expirada');
      return {
        success: false,
        error: 'Sua assinatura expirou em ' + formatDate(user.data_expiracao),
        expired: true
      };
    }

    // Gera token de sessao unico
    const sessionToken = crypto.randomUUID();
    currentSessionToken = sessionToken;

    // Atualiza last_seen_at e session_token no banco
    await mysqlPool.execute(
      'UPDATE users SET last_seen_at = NOW(), session_token = ?, session_updated_at = NOW() WHERE id = ?',
      [sessionToken, user.id]
    );

    // Inicia verificacao periodica da sessao (a cada 10 segundos)
    startSessionCheck(user.id);

    // Adiciona nome do plano ao usuario
    user.plano_nome = PLANO_NAMES[user.plano_id] || 'Desconhecido';

    // Remove a senha antes de retornar
    const { password: _, ...userWithoutPassword } = user;
    currentUser = userWithoutPassword;

    console.log('Login bem sucedido:', user.name, '- Plano:', user.plano_nome, '- Nivel:', user.nivel_acesso);
    console.log('Avatar do usuario:', user.avatar);
    console.log('Session token:', sessionToken);
    return {
      success: true,
      user: userWithoutPassword
    };
  } catch (error) {
    console.error('Erro no login:', error.message);
    return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
  }
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

// Inicia verificacao periodica da sessao
function startSessionCheck(userId) {
  // Para qualquer verificacao anterior
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }

  // Verifica a cada 10 segundos
  sessionCheckInterval = setInterval(async () => {
    try {
      if (!currentSessionToken || !userId) return;

      const [rows] = await mysqlPool.execute(
        'SELECT session_token FROM users WHERE id = ?',
        [userId]
      );

      if (rows.length > 0) {
        const dbToken = rows[0].session_token;

        // Se o token do banco for diferente, outra sessao foi iniciada
        if (dbToken && dbToken !== currentSessionToken) {
          console.log('Sessao invalidada! Outro login detectado.');

          // Notifica o renderer para mostrar alerta e deslogar
          mainWindow?.webContents.send('session:invalidated');

          // Para a verificacao
          clearInterval(sessionCheckInterval);
          sessionCheckInterval = null;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar sessao:', error.message);
    }
  }, 10000); // 10 segundos
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    show: false
  });

  // Inicia na tela de login
  mainWindow.loadFile('src/login.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize(); // Abre em tela cheia (maximizado)
    mainWindow.show();
    // mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

    // Se tem ferramentaId, salva no banco
    if (windowInfo.ferramentaId) {
      await mysqlPool.execute(
        'UPDATE ferramentas SET link_ou_conteudo = ? WHERE id = ?',
        [encrypted.data, windowInfo.ferramentaId]
      );

      dialog.showMessageBox(windowInfo.window, {
        type: 'info',
        title: 'Sessao Salva',
        message: 'Sessao salva com sucesso!',
        detail: `${cookies.length} cookies foram salvos para "${windowInfo.name}".\nOutros usuarios poderao acessar com esta sessao.`
      });
    } else {
      // Se nao tem ferramentaId, copia para clipboard
      const { clipboard } = require('electron');
      clipboard.writeText(encrypted.data);

      dialog.showMessageBox(windowInfo.window, {
        type: 'info',
        title: 'Sessao Copiada',
        message: 'Dados da sessao copiados para a area de transferencia!',
        detail: `${cookies.length} cookies foram copiados.\nCole no campo "Link ou Conteudo" da ferramenta.`
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

    // Descriptografa os dados da sessao
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
ipcMain.handle('admin:getUsers', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [users] = await mysqlPool.execute(
      'SELECT id, name, email, avatar, whatsapp, plano_id, nivel_acesso, status, data_expiracao, id_filehub, security_pin, created_at FROM users ORDER BY name'
    );
    return { success: true, data: users };
  } catch (error) {
    console.error('Erro ao buscar usuarios:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:updateUser', async (event, userId, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.email !== undefined) { updates.push('email = ?'); values.push(data.email); }
    if (data.whatsapp !== undefined) { updates.push('whatsapp = ?'); values.push(data.whatsapp); }
    if (data.plano_id !== undefined) { updates.push('plano_id = ?'); values.push(data.plano_id); }
    if (data.nivel_acesso !== undefined) { updates.push('nivel_acesso = ?'); values.push(data.nivel_acesso); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.data_expiracao !== undefined) { updates.push('data_expiracao = ?'); values.push(data.data_expiracao); }
    if (data.security_pin !== undefined) { updates.push('security_pin = ?'); values.push(data.security_pin); }
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) return { success: true };

    values.push(userId);
    await mysqlPool.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar usuario:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:deleteUser', async (event, userId) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM users WHERE id = ?', [userId]);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar usuario:', error);
    return { success: false, error: error.message };
  }
});

// === ADMIN - FERRAMENTAS ===
ipcMain.handle('admin:getFerramentasAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [ferramentas] = await mysqlPool.execute('SELECT * FROM ferramentas ORDER BY titulo');
    return { success: true, data: ferramentas };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:createFerramenta', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO ferramentas (titulo, descricao, capa, tipo_acesso, link_ou_conteudo, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.titulo, data.descricao || '', data.capa || '', data.tipo_acesso || 'sessao', data.link_ou_conteudo || '', data.status || 'online']
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:updateFerramenta', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.titulo !== undefined) { updates.push('titulo = ?'); values.push(data.titulo); }
    if (data.descricao !== undefined) { updates.push('descricao = ?'); values.push(data.descricao); }
    if (data.capa !== undefined) { updates.push('capa = ?'); values.push(data.capa); }
    if (data.tipo_acesso !== undefined) { updates.push('tipo_acesso = ?'); values.push(data.tipo_acesso); }
    if (data.link_ou_conteudo !== undefined) { updates.push('link_ou_conteudo = ?'); values.push(data.link_ou_conteudo); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE ferramentas SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:deleteFerramenta', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM ferramentas WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === ADMIN - ACESSOS PREMIUM ===
ipcMain.handle('admin:getAcessosPremiumAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [acessos] = await mysqlPool.execute('SELECT * FROM acesso_premiums ORDER BY titulo');
    return { success: true, data: acessos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:createAcessoPremium', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO acesso_premiums (titulo, descricao, capa, tipo_acesso, url, login, senha, chave_de_acesso, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.titulo, data.descricao || '', data.capa || '', data.tipo_acesso || 'login_senha', data.url || '', data.login || '', data.senha || '', data.chave_de_acesso || '', data.status || 'online']
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:updateAcessoPremium', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.titulo !== undefined) { updates.push('titulo = ?'); values.push(data.titulo); }
    if (data.descricao !== undefined) { updates.push('descricao = ?'); values.push(data.descricao); }
    if (data.capa !== undefined) { updates.push('capa = ?'); values.push(data.capa); }
    if (data.tipo_acesso !== undefined) { updates.push('tipo_acesso = ?'); values.push(data.tipo_acesso); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (data.login !== undefined) { updates.push('login = ?'); values.push(data.login); }
    if (data.senha !== undefined) { updates.push('senha = ?'); values.push(data.senha); }
    if (data.chave_de_acesso !== undefined) { updates.push('chave_de_acesso = ?'); values.push(data.chave_de_acesso); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE acesso_premiums SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:deleteAcessoPremium', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM acesso_premiums WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === ADMIN - CANVA CATEGORIAS ===
ipcMain.handle('admin:getCanvaCategoriasAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [categorias] = await mysqlPool.execute('SELECT * FROM canva_categorias ORDER BY ordem, nome');
    return { success: true, data: categorias };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:createCanvaCategoria', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO canva_categorias (nome, descricao, ordem, status) VALUES (?, ?, ?, ?)',
      [data.nome, data.descricao || '', data.ordem || 0, data.status !== undefined ? data.status : 1]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:updateCanvaCategoria', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.nome !== undefined) { updates.push('nome = ?'); values.push(data.nome); }
    if (data.descricao !== undefined) { updates.push('descricao = ?'); values.push(data.descricao); }
    if (data.ordem !== undefined) { updates.push('ordem = ?'); values.push(data.ordem); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE canva_categorias SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:deleteCanvaCategoria', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM canva_categorias WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === ADMIN - CANVA ARQUIVOS ===
ipcMain.handle('admin:getCanvaArquivosAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [arquivos] = await mysqlPool.execute(`
      SELECT ca.*, cc.nome as categoria_nome
      FROM canva_arquivos ca
      LEFT JOIN canva_categorias cc ON ca.categoria_id = cc.id
      ORDER BY ca.nome
    `);
    return { success: true, data: arquivos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:createCanvaArquivo', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO canva_arquivos (nome, legenda_sugerida, categoria_id, capa, download, status) VALUES (?, ?, ?, ?, ?, ?)',
      [data.nome, data.legenda_sugerida || '', data.categoria_id || null, data.capa || '', data.download || '', data.status !== undefined ? data.status : 1]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:updateCanvaArquivo', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.nome !== undefined) { updates.push('nome = ?'); values.push(data.nome); }
    if (data.legenda_sugerida !== undefined) { updates.push('legenda_sugerida = ?'); values.push(data.legenda_sugerida); }
    if (data.categoria_id !== undefined) { updates.push('categoria_id = ?'); values.push(data.categoria_id); }
    if (data.capa !== undefined) { updates.push('capa = ?'); values.push(data.capa); }
    if (data.download !== undefined) { updates.push('download = ?'); values.push(data.download); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE canva_arquivos SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:deleteCanvaArquivo', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM canva_arquivos WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === ADMIN - TOOLS ===
ipcMain.handle('admin:getToolsAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [tools] = await mysqlPool.execute('SELECT * FROM tools ORDER BY ordem, label');
    return { success: true, data: tools };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:createTool', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO tools (parent_id, label, icon, url, ordem, show_app, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.parent_id || null, data.label, data.icon || '', data.url || '', data.ordem || 0, data.show_app !== undefined ? data.show_app : 1, data.is_active !== undefined ? data.is_active : 1]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:updateTool', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.parent_id !== undefined) { updates.push('parent_id = ?'); values.push(data.parent_id); }
    if (data.label !== undefined) { updates.push('label = ?'); values.push(data.label); }
    if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (data.ordem !== undefined) { updates.push('ordem = ?'); values.push(data.ordem); }
    if (data.show_app !== undefined) { updates.push('show_app = ?'); values.push(data.show_app); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE tools SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:deleteTool', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    // Remove filhos primeiro
    await mysqlPool.execute('UPDATE tools SET parent_id = NULL WHERE parent_id = ?', [id]);
    await mysqlPool.execute('DELETE FROM tools WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === ADMIN - CANVA ACESSOS ===
ipcMain.handle('admin:getCanvaAcessosAll', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [acessos] = await mysqlPool.execute('SELECT * FROM canva_acessos ORDER BY titulo');
    return { success: true, data: acessos };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:createCanvaAcesso', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO canva_acessos (titulo, descricao, url, capa, status) VALUES (?, ?, ?, ?, ?)',
      [data.titulo, data.descricao || '', data.url, data.capa || '', data.status !== undefined ? data.status : 1]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:updateCanvaAcesso', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.titulo !== undefined) { updates.push('titulo = ?'); values.push(data.titulo); }
    if (data.descricao !== undefined) { updates.push('descricao = ?'); values.push(data.descricao); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (data.capa !== undefined) { updates.push('capa = ?'); values.push(data.capa); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE canva_acessos SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('admin:deleteCanvaAcesso', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM canva_acessos WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// === ADMIN - PLANOS (para dropdown) ===
ipcMain.handle('admin:getPlanos', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [planos] = await mysqlPool.execute('SELECT * FROM planos ORDER BY nome');
    return { success: true, data: planos };
  } catch (error) {
    // Se a tabela nao existir, retorna os planos padrao
    return { success: true, data: Object.entries(PLANO_NAMES).map(([id, nome]) => ({ id: parseInt(id), nome })) };
  }
});

// === PERFIL DO USUARIO ===
ipcMain.handle('profile:update', async (event, data) => {
  try {
    if (!currentUser) {
      return { success: false, error: 'Usuario nao autenticado' };
    }

    const updates = [];
    const values = [];

    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(data.avatar);
    }

    if (data.whatsapp !== undefined) {
      updates.push('whatsapp = ?');
      values.push(data.whatsapp);
    }

    if (data.pin !== undefined) {
      updates.push('security_pin = ?');
      values.push(data.pin);
    }

    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (updates.length === 0) {
      return { success: true };
    }

    values.push(currentUser.id);

    await mysqlPool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Atualiza o usuario local
    if (data.avatar !== undefined) currentUser.avatar = data.avatar;
    if (data.whatsapp !== undefined) currentUser.whatsapp = data.whatsapp;
    if (data.pin !== undefined) currentUser.security_pin = data.pin;

    console.log('Perfil atualizado com sucesso');
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { success: false, error: 'Erro ao atualizar perfil' };
  }
});

// =============================================
// AUTO-UPDATER
// =============================================

function setupAutoUpdater() {
  // Verifica atualizacoes ao iniciar
  autoUpdater.checkForUpdates().catch(err => {
    console.log('Erro ao verificar atualizacoes:', err.message);
  });

  // Atualizacao disponivel - inicia download automaticamente
  autoUpdater.on('update-available', (info) => {
    console.log('Atualizacao disponivel:', info.version);
    // Notifica o renderer para mostrar overlay
    mainWindow?.webContents.send('update:available', info);
  });

  // Nenhuma atualizacao disponivel
  autoUpdater.on('update-not-available', () => {
    console.log('App esta atualizado');
  });

  // Progresso do download
  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download: ${Math.round(progress.percent)}%`);
    mainWindow?.webContents.send('update:progress', progress);
  });

  // Download concluido - instala automaticamente
  autoUpdater.on('update-downloaded', (info) => {
    console.log('Atualizacao baixada:', info.version);
    mainWindow?.webContents.send('update:downloaded', info);

    // Aguarda 2 segundos e instala automaticamente
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 2000);
  });

  // Erro no update
  autoUpdater.on('error', (err) => {
    console.error('Erro no auto-updater:', err.message);
    mainWindow?.webContents.send('update:error', err.message);
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

// Buscar planos da plataforma (para usuarios)
ipcMain.handle('planos:getAll', async () => {
  try {
    const [planos] = await mysqlPool.execute(
      'SELECT * FROM planos_plataforma WHERE status = 1 ORDER BY ordem ASC'
    );
    return { success: true, data: planos };
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar todos os planos
ipcMain.handle('admin:getPlanosPlataforma', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [planos] = await mysqlPool.execute(
      'SELECT * FROM planos_plataforma ORDER BY ordem ASC'
    );
    return { success: true, data: planos };
  } catch (error) {
    console.error('Erro ao buscar planos:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Criar plano
ipcMain.handle('admin:createPlanoPlataforma', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      `INSERT INTO planos_plataforma (nome, descricao, valor, valor_original, recursos, cor_destaque, icone, is_popular, ordem, link_pagamento, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nome,
        data.descricao || null,
        data.valor,
        data.valor_original || null,
        data.recursos || null,
        data.cor_destaque || '#157f67',
        data.icone || 'star',
        data.is_popular || 0,
        data.ordem || 0,
        data.link_pagamento || null,
        data.status !== undefined ? data.status : 1
      ]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('Erro ao criar plano:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Atualizar plano
ipcMain.handle('admin:updatePlanoPlataforma', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.nome !== undefined) { updates.push('nome = ?'); values.push(data.nome); }
    if (data.descricao !== undefined) { updates.push('descricao = ?'); values.push(data.descricao); }
    if (data.valor !== undefined) { updates.push('valor = ?'); values.push(data.valor); }
    if (data.valor_original !== undefined) { updates.push('valor_original = ?'); values.push(data.valor_original); }
    if (data.recursos !== undefined) { updates.push('recursos = ?'); values.push(data.recursos); }
    if (data.cor_destaque !== undefined) { updates.push('cor_destaque = ?'); values.push(data.cor_destaque); }
    if (data.icone !== undefined) { updates.push('icone = ?'); values.push(data.icone); }
    if (data.is_popular !== undefined) { updates.push('is_popular = ?'); values.push(data.is_popular); }
    if (data.ordem !== undefined) { updates.push('ordem = ?'); values.push(data.ordem); }
    if (data.link_pagamento !== undefined) { updates.push('link_pagamento = ?'); values.push(data.link_pagamento); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE planos_plataforma SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar plano:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Deletar plano
ipcMain.handle('admin:deletePlanoPlataforma', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM planos_plataforma WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar plano:', error);
    return { success: false, error: error.message };
  }
});

// =============================================
// PLANOS DETALHES (Comparativo)
// =============================================

// Buscar detalhes dos planos (para usuarios - modal comparativo)
ipcMain.handle('planosDetalhes:getAll', async () => {
  try {
    const [detalhes] = await mysqlPool.execute(
      'SELECT * FROM planos_detalhes WHERE status = 1 ORDER BY categoria, ordem ASC'
    );
    return { success: true, data: detalhes };
  } catch (error) {
    console.error('Erro ao buscar detalhes dos planos:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar todos os detalhes
ipcMain.handle('admin:getPlanosDetalhes', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [detalhes] = await mysqlPool.execute(
      'SELECT * FROM planos_detalhes ORDER BY categoria, ordem ASC'
    );
    return { success: true, data: detalhes };
  } catch (error) {
    console.error('Erro ao buscar detalhes:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Criar detalhe
ipcMain.handle('admin:createPlanoDetalhe', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      `INSERT INTO planos_detalhes (categoria, nome_recurso, icone, plano_1, plano_2, plano_3, plano_4, ordem, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.categoria,
        data.nome_recurso,
        data.icone || '',
        data.plano_1 || '❌',
        data.plano_2 || '❌',
        data.plano_3 || '❌',
        data.plano_4 || '❌',
        data.ordem || 0,
        data.status !== undefined ? data.status : 1
      ]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('Erro ao criar detalhe:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Atualizar detalhe
ipcMain.handle('admin:updatePlanoDetalhe', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.categoria !== undefined) { updates.push('categoria = ?'); values.push(data.categoria); }
    if (data.nome_recurso !== undefined) { updates.push('nome_recurso = ?'); values.push(data.nome_recurso); }
    if (data.icone !== undefined) { updates.push('icone = ?'); values.push(data.icone); }
    if (data.plano_1 !== undefined) { updates.push('plano_1 = ?'); values.push(data.plano_1); }
    if (data.plano_2 !== undefined) { updates.push('plano_2 = ?'); values.push(data.plano_2); }
    if (data.plano_3 !== undefined) { updates.push('plano_3 = ?'); values.push(data.plano_3); }
    if (data.plano_4 !== undefined) { updates.push('plano_4 = ?'); values.push(data.plano_4); }
    if (data.ordem !== undefined) { updates.push('ordem = ?'); values.push(data.ordem); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE planos_detalhes SET ${updates.join(', ')} WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar detalhe:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Deletar detalhe
ipcMain.handle('admin:deletePlanoDetalhe', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM planos_detalhes WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar detalhe:', error);
    return { success: false, error: error.message };
  }
});

// =============================================
// REPORTS
// =============================================

// Usuario criar report
ipcMain.handle('reports:create', async (event, data) => {
  if (!currentUser) {
    return { success: false, error: 'Usuario nao autenticado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      `INSERT INTO reports (ferramenta_id, tipo_report, user_id, motivo, status, created_at)
       VALUES (?, ?, ?, ?, 'pendente', NOW())`,
      [data.ferramenta_id, data.tipo_report || 'ferramenta', currentUser.id, data.motivo]
    );
    return { success: true, id: result.insertId };
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
  try {
    let query = `
      SELECT r.*,
             f.titulo as ferramenta_titulo,
             u.name as usuario_nome,
             u.email as usuario_email
      FROM reports r
      LEFT JOIN ferramentas f ON r.ferramenta_id = f.id
      LEFT JOIN users u ON r.user_id = u.id
    `;
    const params = [];

    if (filtros?.status) {
      query += ' WHERE r.status = ?';
      params.push(filtros.status);
    }

    query += ' ORDER BY r.created_at DESC';

    const [reports] = await mysqlPool.execute(query, params);
    return { success: true, data: reports };
  } catch (error) {
    console.error('Erro ao buscar reports:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar report por ID
ipcMain.handle('admin:getReportById', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [reports] = await mysqlPool.execute(
      `SELECT r.*,
              f.titulo as ferramenta_titulo,
              u.name as usuario_nome,
              u.email as usuario_email
       FROM reports r
       LEFT JOIN ferramentas f ON r.ferramenta_id = f.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [id]
    );
    return { success: true, data: reports[0] || null };
  } catch (error) {
    console.error('Erro ao buscar report:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Atualizar status do report e da ferramenta
ipcMain.handle('admin:updateReportStatus', async (event, reportId, newStatus) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    // Busca o report para pegar o ferramenta_id
    const [reports] = await mysqlPool.execute(
      'SELECT ferramenta_id FROM reports WHERE id = ?',
      [reportId]
    );

    if (reports.length === 0) {
      return { success: false, error: 'Report nao encontrado' };
    }

    const ferramentaId = reports[0].ferramenta_id;

    // Atualiza o status do report
    const readAt = newStatus === 'resolvido' ? 'NOW()' : 'NULL';
    await mysqlPool.execute(
      `UPDATE reports SET status = ?, read_at = ${newStatus === 'resolvido' ? 'NOW()' : 'NULL'} WHERE id = ?`,
      [newStatus, reportId]
    );

    // Atualiza o status da ferramenta baseado no status do report
    if (ferramentaId) {
      let ferramentaStatus = 'online'; // resolvido = online
      if (newStatus === 'pendente') {
        ferramentaStatus = 'offline';
      } else if (newStatus === 'em_andamento') {
        ferramentaStatus = 'manutencao';
      }

      await mysqlPool.execute(
        'UPDATE ferramentas SET status = ? WHERE id = ?',
        [ferramentaStatus, ferramentaId]
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar status do report:', error);
    return { success: false, error: error.message };
  }
});

// =============================================
// DASHBOARD - BANNERS E COVERS
// =============================================

// Buscar banners ativos
ipcMain.handle('dashboard:getBanners', async () => {
  try {
    const [banners] = await mysqlPool.execute(
      'SELECT * FROM dashboard_banners WHERE is_active = 1 ORDER BY `order` ASC'
    );
    return { success: true, data: banners };
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    return { success: false, error: error.message };
  }
});

// Buscar covers ativos
ipcMain.handle('dashboard:getCovers', async () => {
  try {
    const [covers] = await mysqlPool.execute(
      'SELECT * FROM dashboard_covers WHERE is_active = 1 ORDER BY `order` ASC'
    );
    return { success: true, data: covers };
  } catch (error) {
    console.error('Erro ao buscar covers:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar todos os banners
ipcMain.handle('admin:getBanners', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [banners] = await mysqlPool.execute('SELECT * FROM dashboard_banners ORDER BY `order` ASC');
    return { success: true, data: banners };
  } catch (error) {
    console.error('Erro ao buscar banners:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Criar banner
ipcMain.handle('admin:createBanner', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO dashboard_banners (image, url, is_active, `order`, created_at) VALUES (?, ?, ?, ?, NOW())',
      [data.image, data.url || null, data.is_active || 1, data.order || 0]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('Erro ao criar banner:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Atualizar banner
ipcMain.handle('admin:updateBanner', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.image !== undefined) { updates.push('image = ?'); values.push(data.image); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }
    if (data.order !== undefined) { updates.push('`order` = ?'); values.push(data.order); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE dashboard_banners SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar banner:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Deletar banner
ipcMain.handle('admin:deleteBanner', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM dashboard_banners WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar banner:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar todos os covers
ipcMain.handle('admin:getCovers', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [covers] = await mysqlPool.execute('SELECT * FROM dashboard_covers ORDER BY `order` ASC');
    return { success: true, data: covers };
  } catch (error) {
    console.error('Erro ao buscar covers:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Criar cover
ipcMain.handle('admin:createCover', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO dashboard_covers (image, title, url, `order`, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [data.image, data.title || null, data.url || null, data.order || 0, data.is_active || 1]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('Erro ao criar cover:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Atualizar cover
ipcMain.handle('admin:updateCover', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.image !== undefined) { updates.push('image = ?'); values.push(data.image); }
    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.url !== undefined) { updates.push('url = ?'); values.push(data.url); }
    if (data.order !== undefined) { updates.push('`order` = ?'); values.push(data.order); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE dashboard_covers SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar cover:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Deletar cover
ipcMain.handle('admin:deleteCover', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM dashboard_covers WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar cover:', error);
    return { success: false, error: error.message };
  }
});

// =============================================
// MENU - GERENCIAMENTO
// =============================================

// Buscar itens do menu ativos (para exibicao)
ipcMain.handle('menu:getItems', async () => {
  try {
    const [items] = await mysqlPool.execute(
      'SELECT * FROM menu_items WHERE is_active = 1 ORDER BY `order` ASC'
    );
    return { success: true, data: items };
  } catch (error) {
    console.error('Erro ao buscar menu:', error);
    return { success: false, error: error.message };
  }
});

// Buscar TODOS os itens do menu (para verificar paginas ativas/inativas)
ipcMain.handle('menu:getAllItems', async () => {
  try {
    const [items] = await mysqlPool.execute(
      'SELECT * FROM menu_items ORDER BY `order` ASC'
    );
    return { success: true, data: items };
  } catch (error) {
    console.error('Erro ao buscar todos os itens do menu:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Buscar todos os itens do menu
ipcMain.handle('admin:getMenuItems', async () => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [items] = await mysqlPool.execute('SELECT * FROM menu_items ORDER BY `order` ASC');
    return { success: true, data: items };
  } catch (error) {
    console.error('Erro ao buscar menu:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Criar item do menu
ipcMain.handle('admin:createMenuItem', async (event, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const [result] = await mysqlPool.execute(
      'INSERT INTO menu_items (label, icon, page, `order`, is_active, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())',
      [data.label, data.icon || null, data.page, data.order || 0, data.is_active || 1, data.parent_id || null]
    );
    return { success: true, id: result.insertId };
  } catch (error) {
    console.error('Erro ao criar menu item:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Atualizar item do menu
ipcMain.handle('admin:updateMenuItem', async (event, id, data) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    const updates = [];
    const values = [];

    if (data.label !== undefined) { updates.push('label = ?'); values.push(data.label); }
    if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon); }
    if (data.page !== undefined) { updates.push('page = ?'); values.push(data.page); }
    if (data.order !== undefined) { updates.push('`order` = ?'); values.push(data.order); }
    if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active); }
    if (data.parent_id !== undefined) { updates.push('parent_id = ?'); values.push(data.parent_id); }

    if (updates.length === 0) return { success: true };

    values.push(id);
    await mysqlPool.execute(`UPDATE menu_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    return { success: true };
  } catch (error) {
    console.error('Erro ao atualizar menu item:', error);
    return { success: false, error: error.message };
  }
});

// Admin - Deletar item do menu
ipcMain.handle('admin:deleteMenuItem', async (event, id) => {
  if (!isCurrentUserAdmin()) {
    return { success: false, error: 'Acesso negado' };
  }
  try {
    await mysqlPool.execute('DELETE FROM menu_items WHERE id = ?', [id]);
    return { success: true };
  } catch (error) {
    console.error('Erro ao deletar menu item:', error);
    return { success: false, error: error.message };
  }
});

// =============================================
// INICIALIZACAO DE MENU ITEMS PADRAO
// =============================================

async function initDefaultMenuItems() {
  if (!mysqlPool) return;

  try {
    // Cria tabela se nao existir
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(100) NOT NULL,
        icon VARCHAR(50),
        page VARCHAR(50),
        \`order\` INT DEFAULT 0,
        is_active TINYINT DEFAULT 1,
        parent_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Verifica se ja existem itens no menu
    const [existing] = await mysqlPool.execute('SELECT COUNT(*) as count FROM menu_items');
    if (existing[0].count > 0) {
      console.log('Menu items ja existem:', existing[0].count);
      return;
    }

    console.log('Inicializando menu_items padrao...');

    // Itens padrao do menu (Dashboard desativado por padrao)
    const defaultItems = [
      { label: 'Dashboard', icon: '&#127968;', page: 'dashboard', order: 1, is_active: 0 },
      { label: 'Inteligencia Artificial', icon: '&#129302;', page: 'ferramentas', order: 2, is_active: 1 },
      { label: 'Acessos Premium', icon: '&#11088;', page: 'acessos', order: 5, is_active: 1 },
      { label: 'Materiais', icon: '&#128218;', page: 'materiais', order: 6, is_active: 1 },
      { label: 'Meu Perfil', icon: '&#128100;', page: 'perfil', order: 7, is_active: 1 },
      { label: 'Planos', icon: '&#128179;', page: 'planos', order: 8, is_active: 1 },
      { label: 'Arquivos Canva', icon: '&#128196;', page: 'canva-arquivos', order: 3, is_active: 1 },
      { label: 'Acesso Canva', icon: '&#128279;', page: 'canva-acesso', order: 4, is_active: 1 },
    ];

    for (const item of defaultItems) {
      await mysqlPool.execute(
        'INSERT INTO menu_items (label, icon, page, `order`, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [item.label, item.icon, item.page, item.order, item.is_active]
      );
      console.log(`Menu item criado: ${item.label} (ativo: ${item.is_active})`);
    }

    console.log('Menu items inicializados com sucesso!');
  } catch (error) {
    console.error('Erro ao inicializar menu items:', error);
  }
}

// =============================================
// APP LIFECYCLE
// =============================================

app.whenReady().then(async () => {
  await initMySQL();
  await initDefaultMenuItems(); // Inicializa menu items padrao
  initDatabase();
  createWindow();
  createMenu();

  // Configura auto-updater (apenas em producao)
  if (!process.argv.includes('--dev')) {
    setupAutoUpdater();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
