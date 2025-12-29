const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');
const CryptoJS = require('crypto-js');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { autoUpdater } = require('electron-updater');
const Database = require('./src/database');

// Configuracao do auto-updater
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// Usuario logado atualmente
let currentUser = null;

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

    // Atualiza last_seen_at
    await mysqlPool.execute(
      'UPDATE users SET last_seen_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Adiciona nome do plano ao usuario
    user.plano_nome = PLANO_NAMES[user.plano_id] || 'Desconhecido';

    // Remove a senha antes de retornar
    const { password: _, ...userWithoutPassword } = user;
    currentUser = userWithoutPassword;

    console.log('Login bem sucedido:', user.name, '- Plano:', user.plano_nome, '- Nivel:', user.nivel_acesso);
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
  currentUser = null;
  return { success: true };
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
async function openSessionWindow(sessionData) {
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
      return { success: false, error: decrypted.error };
    }

    // Cria a sessao com os dados
    const sessionData = {
      id: `ferramenta-${ferramenta.id}`,
      name: ferramenta.titulo,
      url: decrypted.url,
      cookies: JSON.stringify(decrypted.cookies)
    };

    console.log('Abrindo sessao para URL:', sessionData.url);

    return await openSessionWindow(sessionData);
  } catch (error) {
    console.error('Erro ao abrir ferramenta:', error);
    return { success: false, error: error.message };
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
      updates.push('pin = ?');
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
// APP LIFECYCLE
// =============================================

app.whenReady().then(async () => {
  await initMySQL();
  initDatabase();
  createWindow();

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
