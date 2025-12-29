// Elementos DOM
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberCheckbox = document.getElementById('remember');
const btnLogin = document.getElementById('btnLogin');
const loginError = document.getElementById('loginError');
const errorMessage = document.getElementById('errorMessage');

// Elementos do update overlay
const updateOverlay = document.getElementById('updateOverlay');
const updateTitle = document.getElementById('updateTitle');
const updateMessage = document.getElementById('updateMessage');
const updateProgressBar = document.getElementById('updateProgressBar');
const updatePercent = document.getElementById('updatePercent');
const updateStatus = document.getElementById('updateStatus');

// Inicializacao
document.addEventListener('DOMContentLoaded', () => {
  console.log('FileHub Login iniciando...');

  // Verifica se tem credenciais salvas
  const savedEmail = localStorage.getItem('filehub_email');
  if (savedEmail) {
    emailInput.value = savedEmail;
    rememberCheckbox.checked = true;
    passwordInput.focus();
  } else {
    emailInput.focus();
  }

  // Configura listeners de atualizacao
  setupUpdateListeners();
});

// Configura listeners de atualizacao automatica
function setupUpdateListeners() {
  // Atualizacao disponivel
  window.api.onUpdateAvailable((info) => {
    console.log('Atualizacao disponivel:', info.version);
    showUpdateOverlay();
    updateTitle.textContent = 'Atualizando FileHub';
    updateMessage.textContent = `Baixando versao ${info.version}...`;
    updateStatus.textContent = 'Iniciando download...';
  });

  // Progresso do download
  window.api.onUpdateProgress((progress) => {
    const percent = Math.round(progress.percent);
    updateProgressBar.style.width = percent + '%';
    updatePercent.textContent = percent + '%';

    const mbDownloaded = (progress.transferred / 1024 / 1024).toFixed(1);
    const mbTotal = (progress.total / 1024 / 1024).toFixed(1);
    updateStatus.textContent = `${mbDownloaded} MB de ${mbTotal} MB`;
  });

  // Download concluido
  window.api.onUpdateDownloaded((info) => {
    updateTitle.textContent = 'Atualizacao Pronta!';
    updateMessage.textContent = 'Instalando...';
    updatePercent.textContent = '100%';
    updateProgressBar.style.width = '100%';
    updateStatus.textContent = 'O app sera reiniciado automaticamente';
  });

  // Erro na atualizacao
  window.api.onUpdateError((error) => {
    console.error('Erro na atualizacao:', error);
    hideUpdateOverlay();
  });
}

// Mostra overlay de atualizacao
function showUpdateOverlay() {
  updateOverlay.classList.add('active');
}

// Esconde overlay de atualizacao
function hideUpdateOverlay() {
  updateOverlay.classList.remove('active');
}

// Handler do formulario de login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Preencha todos os campos');
    return;
  }

  // Desabilita o botao e mostra loading
  setLoading(true);
  hideError();

  try {
    const result = await window.api.login(email, password);

    if (result.success) {
      // Salva email se "lembrar" estiver marcado
      if (rememberCheckbox.checked) {
        localStorage.setItem('filehub_email', email);
      } else {
        localStorage.removeItem('filehub_email');
      }

      console.log('Login bem sucedido!');
      // A navegacao para a tela principal é feita pelo main.js
    } else {
      showError(result.error);

      // Se a assinatura expirou, mostra estilo diferente
      if (result.expired) {
        loginError.classList.add('subscription-warning');
      }
    }
  } catch (error) {
    console.error('Erro no login:', error);
    showError('Erro ao conectar ao servidor. Tente novamente.');
  } finally {
    setLoading(false);
  }
});

// Mostra erro
function showError(message) {
  errorMessage.textContent = message;
  loginError.style.display = 'block';
  loginError.classList.remove('subscription-warning');
}

// Esconde erro
function hideError() {
  loginError.style.display = 'none';
}

// Ativa/desativa estado de loading
function setLoading(loading) {
  btnLogin.disabled = loading;
  btnLogin.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
  btnLogin.querySelector('.btn-loading').style.display = loading ? 'inline' : 'none';
}
