/**
 * Servico de API para o FileHub
 * Substitui a conexao direta ao MySQL
 */

const API_BASE_URL = 'https://filehub.space/api/app';

let authToken = null;

/**
 * Define o token de autenticacao
 */
function setAuthToken(token) {
  authToken = token;
}

/**
 * Obtem o token de autenticacao
 */
function getAuthToken() {
  return authToken;
}

/**
 * Limpa o token de autenticacao
 */
function clearAuthToken() {
  authToken = null;
}

/**
 * Faz uma requisicao para a API
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // Adiciona token de autenticacao se disponivel
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || 'Erro na requisicao');
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}

// =============================================
// AUTENTICACAO
// =============================================

/**
 * Login do usuario
 */
async function login(email, password) {
  const data = await apiRequest('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (data.success && data.token) {
    setAuthToken(data.token);
  }

  return data;
}

/**
 * Valida sessao ativa
 */
async function validateSession() {
  return await apiRequest('/validate-session', {
    method: 'POST',
  });
}

/**
 * Logout
 */
async function logout() {
  try {
    await apiRequest('/logout', {
      method: 'POST',
    });
  } catch (e) {
    // Ignora erros no logout
  }
  clearAuthToken();
}

// =============================================
// FERRAMENTAS
// =============================================

/**
 * Lista todas as ferramentas
 */
async function getFerramentas() {
  return await apiRequest('/ferramentas');
}

/**
 * Busca ferramenta por ID
 */
async function getFerramentaById(id) {
  return await apiRequest(`/ferramentas/${id}`);
}

// =============================================
// ACESSOS PREMIUM
// =============================================

/**
 * Lista todos os acessos premium
 */
async function getAcessosPremium() {
  return await apiRequest('/acessos-premium');
}

/**
 * Busca acesso premium por ID
 */
async function getAcessoPremiumById(id) {
  return await apiRequest(`/acessos-premium/${id}`);
}

// =============================================
// TOOLS (MENU DE NAVEGACAO)
// =============================================

/**
 * Lista tools ativos
 */
async function getTools() {
  return await apiRequest('/tools');
}

// =============================================
// PLANOS
// =============================================

/**
 * Lista planos internos
 */
async function getPlanos() {
  return await apiRequest('/planos');
}

/**
 * Lista planos da plataforma
 */
async function getPlanosPlataforma() {
  return await apiRequest('/planos-plataforma');
}

/**
 * Lista detalhes dos planos
 */
async function getPlanosDetalhes() {
  return await apiRequest('/planos-detalhes');
}

// =============================================
// DASHBOARD
// =============================================

/**
 * Lista banners do dashboard
 */
async function getDashboardBanners() {
  return await apiRequest('/dashboard/banners');
}

/**
 * Lista covers do dashboard
 */
async function getDashboardCovers() {
  return await apiRequest('/dashboard/covers');
}

// =============================================
// MATERIAIS
// =============================================

/**
 * Lista materiais
 */
async function getMateriais() {
  return await apiRequest('/materiais');
}

// =============================================
// CANVA
// =============================================

/**
 * Lista categorias do Canva
 */
async function getCanvaCategorias() {
  return await apiRequest('/canva/categorias');
}

/**
 * Lista arquivos do Canva
 */
async function getCanvaArquivos() {
  return await apiRequest('/canva/arquivos');
}

/**
 * Busca arquivo Canva por ID
 */
async function getCanvaArquivoById(id) {
  return await apiRequest(`/canva/arquivos/${id}`);
}

/**
 * Lista acessos do Canva
 */
async function getCanvaAcessos() {
  return await apiRequest('/canva/acessos');
}

// =============================================
// MENU
// =============================================

/**
 * Lista itens do menu
 */
async function getMenuItems() {
  return await apiRequest('/menu');
}

// =============================================
// REPORTS
// =============================================

/**
 * Cria um novo report
 */
async function createReport(ferramentaId, tipoReport, motivo) {
  return await apiRequest('/reports', {
    method: 'POST',
    body: JSON.stringify({
      ferramenta_id: ferramentaId,
      tipo_report: tipoReport,
      motivo: motivo,
    }),
  });
}

// =============================================
// PERFIL
// =============================================

/**
 * Atualiza perfil do usuario
 */
async function updateProfile(data) {
  return await apiRequest('/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// =============================================
// VERSAO DA API
// =============================================

/**
 * Verifica versao da API
 */
async function getVersion() {
  return await apiRequest('/version');
}

/**
 * Verifica se a API esta online
 */
async function checkApiStatus() {
  try {
    const data = await getVersion();
    return { online: true, ...data };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

// Exporta todas as funcoes
module.exports = {
  // Config
  setAuthToken,
  getAuthToken,
  clearAuthToken,

  // Auth
  login,
  validateSession,
  logout,

  // Ferramentas
  getFerramentas,
  getFerramentaById,

  // Acessos Premium
  getAcessosPremium,
  getAcessoPremiumById,

  // Tools
  getTools,

  // Planos
  getPlanos,
  getPlanosPlataforma,
  getPlanosDetalhes,

  // Dashboard
  getDashboardBanners,
  getDashboardCovers,

  // Materiais
  getMateriais,

  // Canva
  getCanvaCategorias,
  getCanvaArquivos,
  getCanvaArquivoById,
  getCanvaAcessos,

  // Menu
  getMenuItems,

  // Reports
  createReport,

  // Profile
  updateProfile,

  // Utils
  getVersion,
  checkApiStatus,
};
