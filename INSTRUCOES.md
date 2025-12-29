# FileHub - Instrucoes

## Estrutura do Projeto

```
FILEHUB/
├── main.js              # Processo principal Electron
├── preload.js           # Bridge IPC
├── package.json         # Configuracoes e build
├── src/                 # App Electron
│   ├── index.html
│   ├── login.html
│   ├── styles.css
│   ├── renderer.js
│   └── login.js
├── web/                 # PWA (Web App)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── sw.js
│   ├── manifest.json
│   └── api.php          # Backend API
├── build/               # Icones para o instalador
└── dist/                # Instaladores gerados
```

---

## 1. EXECUTAR EM DESENVOLVIMENTO

```bash
npm start
```

---

## 2. CRIAR INSTALADORES

### Windows (exe)
```bash
npm run build:win
```

### macOS (dmg)
```bash
npm run build:mac
```

### Linux (AppImage/deb)
```bash
npm run build:linux
```

### Todos
```bash
npm run build:all
```

Os instaladores serao gerados na pasta `dist/`

---

## 3. ICONES DO INSTALADOR

Coloque os icones na pasta `build/`:

- `icon.ico` - Windows (256x256 pixels, formato ICO)
- `icon.icns` - macOS (formato ICNS)
- `icons/` - Linux (pasta com PNGs de varios tamanhos)

### Criar icones online:
- https://icoconvert.com (ICO)
- https://cloudconvert.com/png-to-icns (ICNS)

---

## 4. SISTEMA DE AUTO-UPDATE

### Como funciona:
1. Ao iniciar, o app verifica se ha atualizacoes no GitHub
2. Se houver, mostra popup perguntando se quer atualizar
3. Usuario clica "Baixar Agora"
4. Download acontece em background
5. Ao terminar, pergunta se quer reiniciar
6. App reinicia e instala a atualizacao

### Configurar para seu repositorio:

1. Edite `package.json`:
```json
"publish": {
  "provider": "github",
  "owner": "SEU-USUARIO-GITHUB",
  "repo": "filehub",
  "releaseType": "release"
}
```

2. Crie um token no GitHub:
   - Acesse: https://github.com/settings/tokens
   - Gere um token com permissao `repo`

3. Para publicar uma atualizacao:
```bash
# Configure o token
set GH_TOKEN=seu_token_aqui   # Windows
export GH_TOKEN=seu_token_aqui # Mac/Linux

# Atualize a versao no package.json
# Exemplo: "version": "1.1.0"

# Publique
npm run publish
```

Isso cria automaticamente uma Release no GitHub com os instaladores.

---

## 5. PWA (WEB APP)

### Arquivos:
- `web/` - Todos os arquivos do PWA

### Como hospedar:

1. Suba a pasta `web/` para seu servidor
2. Configure a URL da API em `app.js`:
```javascript
const API_URL = 'https://seusite.com/api/api.php';
```

3. Coloque `api.php` em seu servidor PHP

4. Acesse pelo navegador (funciona em celular!)

### Para testar localmente:
```bash
cd web
npx serve
```

---

## 6. COMANDOS UTEIS

```bash
# Desenvolvimento
npm start              # Inicia o app
npm run dev            # Inicia com logs

# Build
npm run build          # Build padrao
npm run build:win      # Apenas Windows
npm run build:mac      # Apenas macOS
npm run build:linux    # Apenas Linux

# Publicar atualizacao
npm run publish        # Publica no GitHub
```

---

## 7. VERSAO DO APP

Para atualizar a versao, edite `package.json`:
```json
"version": "1.0.0"
```

Siga o padrao: MAJOR.MINOR.PATCH
- MAJOR: mudancas grandes
- MINOR: novas funcionalidades
- PATCH: correcoes de bugs

---

## 8. DICAS

### Testar update localmente:
Crie um arquivo `dev-app-update.yml`:
```yaml
provider: generic
url: http://localhost:8080
```

### Logs de debug:
```bash
npm run dev
```

### Limpar cache do build:
```bash
rm -rf dist/
rm -rf node_modules/.cache/
```
