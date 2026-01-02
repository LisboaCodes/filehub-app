# FileHub

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.2-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/electron-28.0.0-47848F.svg" alt="Electron">
</p>

**FileHub** e um aplicativo desktop para gerenciamento de sessoes compartilhadas, ferramentas de IA e recursos premium. Permite que usuarios acessem ferramentas online ja logadas de forma segura e controlada.

---

## Indice

- [Funcionalidades](#funcionalidades)
- [Instalacao](#instalacao)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Administracao](#administracao)
- [Tipos de Acesso](#tipos-de-acesso)
- [Sistema de Paginas](#sistema-de-paginas)
- [Atualizacao Automatica](#atualizacao-automatica)
- [Desenvolvimento](#desenvolvimento)
- [Historico de Versoes](#historico-de-versoes)
- [Tarefas Pendentes](#tarefas-pendentes)
- [Seguranca](#seguranca)

---

## Funcionalidades

### Para Usuarios

| Funcionalidade | Descricao |
|----------------|-----------|
| **Inteligencia Artificial** | Acesso a ferramentas de IA (ChatGPT, Midjourney, CapCut, etc.) |
| **Canva** | Arquivos e acessos ao Canva Pro |
| **Acessos Premium** | Credenciais de plataformas premium |
| **Materiais** | Downloads de materiais exclusivos |
| **Meu Perfil** | Gerenciamento de dados pessoais e avatar |
| **Planos** | Visualizacao e comparativo de planos |
| **Dashboard** | Banners e destaques (quando ativo) |

### Para Administradores

| Funcionalidade | Descricao |
|----------------|-----------|
| **Admin - Usuarios** | CRUD completo de usuarios, planos e status |
| **Admin - IA** | Gerenciamento de ferramentas de IA |
| **Admin - Acessos Premium** | Gerenciamento de credenciais |
| **Admin - Canva** | Categorias, arquivos e acessos |
| **Admin - Tools** | Menu dinamico de ferramentas |
| **Admin - Reports** | Visualizacao de reports/denuncias |
| **Admin - Planos** | Gerenciamento de planos e detalhes |
| **Admin - Dashboard** | Banners e covers do dashboard |
| **Admin - Menu** | Ativar/desativar paginas do sistema |

### Recursos do Sistema

- **Login seguro** com hash bcrypt
- **Sessao unica por conta** - impede login simultaneo
- **Controle de acesso por plano** - cada usuario ve apenas suas ferramentas
- **Sessoes compartilhadas** - ferramentas ja logadas com cookies
- **Auto-update** - atualizacao automatica via GitHub
- **Tema dark** - interface moderna e confortavel

---

## Instalacao

### Download
Baixe a versao mais recente na [pagina de Releases](https://github.com/LisboaCodes/filehub-app/releases/latest):

| Sistema | Arquivo |
|---------|---------|
| Windows | `FileHub-Setup-1.2.2.exe` |

### Instalacao Windows
1. Baixe `FileHub-Setup-X.X.X.exe`
2. Execute o instalador
3. Siga as instrucoes na tela
4. O app criara atalho na area de trabalho

---

## Estrutura do Projeto

```
FILEHUB/
├── main.js                 # Processo principal do Electron
├── preload.js              # Bridge de seguranca IPC
├── package.json            # Dependencias e configuracao de build
├── README.md               # Este arquivo
├── src/
│   ├── index.html          # Pagina principal (todas as telas)
│   ├── login.html          # Pagina de login
│   ├── renderer.js         # Logica do frontend principal
│   ├── admin.js            # Logica do painel administrativo
│   ├── styles.css          # Estilos CSS (tema dark)
│   ├── icons.js            # Icones Lucide SVG
│   ├── database.js         # Electron Store (dados locais)
│   └── login.js            # Logica da tela de login
├── build/                  # Assets para build (icones)
│   └── icon.ico            # Icone do aplicativo
├── dist/                   # Arquivos de distribuicao gerados
│   ├── FileHub-Setup-X.X.X.exe
│   └── latest.yml
└── node_modules/           # Dependencias
```

---

## Administracao

### Niveis de Acesso

| Nivel | Permissoes |
|-------|------------|
| **Admin** | Acesso total ao sistema + painel admin |
| **Colaborador** | Acesso a todas as ferramentas |
| **Moderador** | Acesso a ferramentas + visualizar reports |
| **Usuario** | Acesso conforme plano contratado |

### Status de Usuario

| Status | Descricao |
|--------|-----------|
| `ativo` | Usuario pode acessar normalmente |
| `desativado` | Conta desativada pelo admin |
| `banido` | Conta banida por violacao |
| `inadimplente` | Pagamento pendente |
| `trial` | Periodo de teste |

---

## Tipos de Acesso

As ferramentas de IA suportam 3 tipos de acesso:

### 1. Sessao (Extensao FileHub)
- Usa a extensao FileHub para capturar sessao
- Dados criptografados com AES-256
- Formato: dados criptografados ou JSON

### 2. Cookies.txt (Netscape) - NOVO v1.2.2
- Usa a extensao "Get cookies.txt LOCALLY"
- Formato padrao Netscape compativel com curl/wget
- Detecta automaticamente o dominio

**Como usar:**
1. Instale a extensao "Get cookies.txt LOCALLY" no Chrome
2. Acesse o site e faca login
3. Clique na extensao e exporte os cookies
4. No Admin > IA, selecione tipo "Cookies.txt (Netscape)"
5. Cole o conteudo do arquivo
6. Salve

### 3. Link
- Abre URL diretamente no navegador padrao
- Sem injecao de cookies

---

## Sistema de Paginas

### Ativar/Desativar Paginas (v1.2.1)

Administradores podem controlar quais paginas aparecem no menu:

1. Acesse **Administracao > Menu**
2. Clique em **Editar** no item desejado
3. Altere o **Status** para Ativo ou Inativo
4. Clique em **Salvar**
5. Reabra o app para ver as mudancas

### Comportamento

| Situacao | Resultado |
|----------|-----------|
| Pagina inativa | Nao aparece no menu |
| Tentar acessar pagina inativa | Redireciona para pagina inicial |
| Dashboard inativo | Pagina inicial = Perfil |
| Dashboard ativo | Pagina inicial = Dashboard |

### Paginas Configuraveis

- Dashboard (desativado por padrao)
- Inteligencia Artificial
- Arquivos Canva
- Acesso Canva
- Acessos Premium
- Materiais
- Meu Perfil
- Planos

---

## Atualizacao Automatica

O FileHub usa **electron-updater** para atualizacoes automaticas.

### Como Funciona

1. Ao abrir, verifica se ha nova versao no GitHub Releases
2. Se houver, baixa automaticamente em background
3. Mostra overlay de progresso durante download
4. Instala automaticamente ao fechar o app

### Criar Nova Release

```bash
# 1. Atualizar versao no package.json
# 2. Commit das alteracoes
git add . && git commit -m "v1.x.x - Descricao" && git push

# 3. Criar tag
git tag v1.x.x && git push origin v1.x.x

# 4. Build do instalador
npm run build:win

# 5. Criar release no GitHub com:
#    - FileHub-Setup-1.x.x.exe
#    - latest.yml
```

---

## Desenvolvimento

### Pre-requisitos
- Node.js 18+
- npm

### Instalacao do Ambiente

```bash
# Clone o repositorio
git clone https://github.com/LisboaCodes/filehub-app.git
cd filehub-app

# Instale as dependencias
npm install

# Execute em modo desenvolvimento
npm start
```

### Scripts Disponiveis

| Comando | Descricao |
|---------|-----------|
| `npm start` | Executa o app em desenvolvimento |
| `npm run dev` | Executa com logging habilitado |
| `npm run build:win` | Gera instalador Windows (.exe) |
| `npm run build:mac` | Gera instalador macOS (.dmg) |
| `npm run build:linux` | Gera instalador Linux (.AppImage) |

### Tecnologias

| Tecnologia | Uso |
|------------|-----|
| Electron 28 | Framework desktop |
| MySQL2 | Banco de dados remoto |
| bcryptjs | Hash de senhas |
| CryptoJS | Criptografia de sessoes |
| electron-updater | Auto-update |
| Electron Store | Dados locais |

---

## Historico de Versoes

### v1.2.2 (02/01/2026) - Atual
- Adicionado suporte a **Cookies.txt (Netscape)**
- Novo tipo de acesso para ferramentas de IA
- Parser automatico de formato Netscape
- Deteccao automatica de dominio dos cookies

### v1.2.1 (31/12/2025)
- Sistema de **ativar/desativar paginas**
- Dashboard desativado por padrao
- Gerenciamento via Admin > Menu
- Navegacao inteligente para paginas ativas

### v1.2.0 (31/12/2025)
- **Sessao unica por conta**
- Detecta login em outro dispositivo
- Alerta e logout automatico
- Token de sessao no banco

### v1.1.9 (30/12/2025)
- Ajuste no footer da tela de login

### v1.1.8 (30/12/2025)
- Dashboard com banners e covers
- Admin para gerenciar dashboard
- Melhorias gerais de UI

### v1.1.1 (29/12/2025)
- Atualizacao automatica com overlay de progresso
- Indicador visual de download

### v1.1.0 (28/12/2025)
- Dashboard com sidebar redesenhado
- Pagina de perfil do usuario
- Novas cores e tema dark aprimorado

### v1.0.0
- Versao inicial
- Sistema de login e autenticacao
- Ferramentas de IA com sessao compartilhada
- Painel administrativo basico

---

## Tarefas Pendentes

### Alta Prioridade

- [ ] **Sistema de Notificacoes** - Push notifications para usuarios
- [ ] **Logs de Acesso** - Registrar acessos as ferramentas
- [ ] **Exportar Sessao** - Permitir admin exportar sessao de qualquer ferramenta
- [ ] **Backup de Sessoes** - Backup automatico das sessoes no servidor
- [ ] **Validacao de Cookies** - Verificar se sessao ainda esta valida

### Media Prioridade

- [ ] **Dashboard Personalizado** - Widgets configuraveis por usuario
- [ ] **Relatorios** - Graficos de uso e estatisticas
- [ ] **Sistema de Cupons** - Descontos em planos
- [ ] **Chat de Suporte** - Integrar chat com admin
- [ ] **Multi-idioma** - Suporte a ingles e espanhol
- [ ] **Busca Global** - Buscar em todas as secoes

### Baixa Prioridade

- [ ] **Tema Claro** - Opcao de tema light
- [ ] **Atalhos de Teclado** - Navegacao rapida
- [ ] **Favoritos** - Marcar ferramentas favoritas
- [ ] **Historico** - Ultimas ferramentas acessadas
- [ ] **Build para macOS** - Testar e ajustar para Mac
- [ ] **Build para Linux** - Testar e ajustar para Linux

### Melhorias Tecnicas

- [ ] **Testes Automatizados** - Jest + Spectron
- [ ] **CI/CD** - GitHub Actions para build automatico
- [ ] **Monitoramento de Erros** - Sentry ou similar
- [ ] **Cache de Dados** - Melhorar performance de carregamento
- [ ] **Compressao de Assets** - Reduzir tamanho do instalador
- [ ] **Code Splitting** - Otimizar carregamento

---

## Seguranca

| Recurso | Implementacao |
|---------|---------------|
| Senhas | Hash bcrypt |
| Sessoes | Criptografia AES-256 |
| IPC | Context Isolation habilitado |
| Preload | Script isolado para comunicacao |
| Login Unico | Token de sessao no banco |
| Cookies | Injetados em particao isolada |

---

## Banco de Dados

### Tabelas Principais

| Tabela | Descricao |
|--------|-----------|
| `users` | Usuarios do sistema |
| `ferramentas` | Ferramentas de IA |
| `ferramenta_plano` | Relacao ferramenta x plano |
| `acessos_premium` | Credenciais premium |
| `canva_categorias` | Categorias do Canva |
| `canva_arquivos` | Arquivos do Canva |
| `canva_acessos` | Acessos ao Canva |
| `materiais` | Materiais para download |
| `planos` | Planos disponiveis |
| `planos_detalhes` | Comparativo de planos |
| `tools` | Menu dinamico |
| `menu_items` | Configuracao de paginas |
| `reports` | Reports/denuncias |
| `dashboard_banners` | Banners do dashboard |
| `dashboard_covers` | Covers/destaques |

---

## Contato

- **Repositorio:** https://github.com/LisboaCodes/filehub-app
- **Releases:** https://github.com/LisboaCodes/filehub-app/releases
- **Website:** [filehub.space](https://filehub.space)

---

## Licenca

MIT License - Veja o arquivo LICENSE para detalhes.

---

<p align="center">
  <b>FileHub v1.2.2</b><br>
  Desenvolvido com Electron
</p>
