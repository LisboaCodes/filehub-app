# FileHub

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg" alt="Platform">
  <img src="https://img.shields.io/badge/electron-28.0.0-47848F.svg" alt="Electron">
</p>

**FileHub** é um gerenciador de sessões compartilhadas que permite aos usuários acessar ferramentas online já logadas. Ideal para equipes que precisam compartilhar acessos de forma segura.

---

## Funcionalidades

- **Login seguro** - Autenticação via banco de dados MySQL
- **Controle de acesso por plano** - Cada usuário vê apenas as ferramentas do seu plano
- **Sessões compartilhadas** - Abre ferramentas já logadas com cookies injetados
- **Status das ferramentas** - Online, Manutenção ou Offline
- **Auto-update** - Atualização automática quando há nova versão
- **Multiplataforma** - Windows, macOS e Linux
- **PWA** - Versão web que funciona no celular

---

## Screenshots

| Login | Dashboard |
|-------|-----------|
| Tela de login segura | Grid de ferramentas com cards |

---

## Instalação

### Download
Baixe a versão mais recente na [página de Releases](../../releases/latest):

| Sistema | Arquivo |
|---------|---------|
| Windows | `FileHub-Setup-X.X.X.exe` |
| macOS | `FileHub-X.X.X-arm64.dmg` ou `FileHub-X.X.X-x64.dmg` |
| Linux | `FileHub-X.X.X.AppImage` ou `FileHub-X.X.X.deb` |

### Instalação Windows
1. Baixe `FileHub-Setup-X.X.X.exe`
2. Execute o instalador
3. Siga as instruções na tela
4. O app será instalado e criará atalho na área de trabalho

### Instalação macOS
1. Baixe o arquivo `.dmg` correspondente à sua arquitetura
2. Abra o arquivo DMG
3. Arraste o FileHub para a pasta Applications
4. Na primeira execução, clique com botão direito > Abrir

### Instalação Linux
```bash
# AppImage
chmod +x FileHub-X.X.X.AppImage
./FileHub-X.X.X.AppImage

# Debian/Ubuntu
sudo dpkg -i FileHub-X.X.X.deb
```

---

## Uso

### Primeiro Acesso
1. Abra o FileHub
2. Digite seu e-mail e senha cadastrados
3. Clique em "Entrar"

### Acessando Ferramentas
1. Na tela principal, você verá as ferramentas disponíveis para seu plano
2. Clique em "Acessar" para abrir a ferramenta já logada
3. Clique em "Info" para ver detalhes da ferramenta

### Status das Ferramentas
- **Verde (Online)** - Ferramenta disponível para uso
- **Amarelo (Manutenção)** - Ferramenta temporariamente indisponível
- **Vermelho (Offline)** - Ferramenta fora do ar
- **Cadeado** - Seu plano não tem acesso (faça upgrade)

### Atualizações
O app verifica automaticamente por atualizações ao iniciar. Quando uma atualização está disponível:
1. Um popup aparece perguntando se deseja baixar
2. Clique em "Baixar Agora"
3. Após o download, clique em "Reiniciar Agora"
4. O app reinicia com a nova versão

---

## Desenvolvimento

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Git

### Instalação do Ambiente
```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/filehub.git
cd filehub

# Instale as dependências
npm install

# Execute em modo desenvolvimento
npm start
```

### Estrutura do Projeto
```
filehub/
├── main.js              # Processo principal Electron
├── preload.js           # Bridge IPC segura
├── package.json         # Configurações e dependências
├── src/                 # Interface do app Electron
│   ├── index.html       # Tela principal
│   ├── login.html       # Tela de login
│   ├── styles.css       # Estilos
│   ├── renderer.js      # Lógica da tela principal
│   ├── login.js         # Lógica do login
│   └── database.js      # SQLite local
├── web/                 # PWA (versão web/mobile)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── sw.js
│   ├── manifest.json
│   └── api.php
├── build/               # Recursos do instalador (ícones)
├── dist/                # Instaladores gerados
└── assets/              # Recursos adicionais
```

### Scripts Disponíveis
```bash
npm start          # Inicia o app em desenvolvimento
npm run dev        # Inicia com logs detalhados
npm run build      # Cria instalador para o SO atual
npm run build:win  # Cria instalador Windows
npm run build:mac  # Cria instalador macOS
npm run build:linux # Cria instalador Linux
npm run publish    # Publica release no GitHub
```

---

## Build e Distribuição

### Criando Instaladores Localmente
```bash
# Windows
npm run build:win

# macOS (requer macOS)
npm run build:mac

# Linux
npm run build:linux

# Todos (requer macOS para dmg)
npm run build:all
```

Os instaladores serão gerados na pasta `dist/`.

### Publicando uma Nova Versão

#### 1. Atualize a versão
Edite `package.json`:
```json
"version": "1.1.0"
```

#### 2. Faça commit e push
```bash
git add .
git commit -m "Release v1.1.0"
git push origin main
```

#### 3. Configure o token do GitHub
```bash
# Windows (CMD)
set GH_TOKEN=seu_token_aqui

# Windows (PowerShell)
$env:GH_TOKEN="seu_token_aqui"

# macOS/Linux
export GH_TOKEN=seu_token_aqui
```

#### 4. Publique
```bash
npm run publish
```

Isso criará automaticamente uma Release no GitHub com os instaladores.

---

## Configuração do Banco de Dados

### Tabelas Necessárias

#### users
```sql
CREATE TABLE users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  plano_id BIGINT UNSIGNED,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  status ENUM('ativo', 'desativado', 'banido', 'inadimplente', 'trial') DEFAULT 'ativo',
  nivel_acesso ENUM('admin', 'moderador', 'colaborador', 'usuario') DEFAULT 'usuario',
  data_expiracao DATE,
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### ferramentas
```sql
CREATE TABLE ferramentas (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  link_ou_conteudo TEXT,
  capa VARCHAR(255),
  status ENUM('online', 'manutencao', 'offline') DEFAULT 'online',
  tipo_acesso VARCHAR(50),
  login VARCHAR(255),
  senha VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### ferramenta_plano
```sql
CREATE TABLE ferramenta_plano (
  ferramenta_id BIGINT UNSIGNED NOT NULL,
  plano_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (ferramenta_id, plano_id)
);
```

### Planos
| ID | Nome |
|----|------|
| 1 | Básico |
| 2 | Premium |
| 3 | Plus |
| 4 | Elite |
| 5 | Colaborador |
| 6 | Gratuito |
| 7 | Desativado |
| 8 | Admin |
| 9 | Start |
| 10 | Go |

---

## PWA (Versão Web/Mobile)

A pasta `web/` contém uma versão PWA que funciona em qualquer navegador e pode ser instalada no celular.

### Hospedagem
1. Faça upload da pasta `web/` para seu servidor
2. Edite `app.js` e configure a URL da API:
   ```javascript
   const API_URL = 'https://seusite.com/api/api.php';
   ```
3. Coloque `api.php` em seu servidor com PHP
4. Acesse pelo navegador

### Instalação no Celular
1. Acesse a URL do PWA no navegador do celular
2. No Chrome: Menu > "Adicionar à tela inicial"
3. No Safari: Compartilhar > "Adicionar à Tela de Início"

---

## Segurança

- Senhas são armazenadas com hash bcrypt
- Comunicação via IPC segura com contextIsolation
- Cookies de sessão são criptografados com AES-256
- Tokens de autenticação expiram em 24 horas (PWA)

---

## Solução de Problemas

### O app não abre
- Verifique se o antivírus não está bloqueando
- Tente executar como administrador
- Reinstale o aplicativo

### Erro de conexão
- Verifique sua conexão com a internet
- O servidor pode estar temporariamente indisponível
- Tente novamente em alguns minutos

### Ferramenta abre em branco
- A sessão pode ter expirado
- Entre em contato com o administrador para atualizar os cookies

### Atualização não funciona
- Verifique sua conexão com a internet
- Baixe manualmente da página de Releases

---

## Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona NovaFeature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

---

## Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## Contato

- **Website:** [filehub.space](https://filehub.space)
- **Email:** suporte@filehub.space

---

<p align="center">
  Feito com ❤️ pela equipe FileHub
</p>
