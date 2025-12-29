# Configuração do GitHub para Auto-Update

Este guia explica como configurar o GitHub para que o sistema de auto-update funcione corretamente.

---

## Passo 1: Criar o Repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Preencha:
   - **Repository name:** `filehub`
   - **Description:** `Gerenciador de Sessões Compartilhadas`
   - **Visibility:** `Private` (recomendado) ou `Public`
3. **NÃO** marque "Add a README file" (já temos)
4. Clique em **Create repository**

---

## Passo 2: Criar Token de Acesso (Personal Access Token)

O token é necessário para publicar releases automaticamente.

### 2.1. Acesse as configurações de tokens
1. Vá para [github.com/settings/tokens](https://github.com/settings/tokens)
2. Ou: Clique na sua foto > Settings > Developer settings > Personal access tokens > Tokens (classic)

### 2.2. Gere um novo token
1. Clique em **Generate new token** > **Generate new token (classic)**
2. Preencha:
   - **Note:** `FileHub Auto-Update`
   - **Expiration:** `No expiration` (ou escolha uma data)
3. Marque as permissões:
   - [x] `repo` (acesso completo aos repositórios)
   - [x] `write:packages` (opcional, para pacotes)
4. Clique em **Generate token**
5. **IMPORTANTE:** Copie o token agora! Ele não será mostrado novamente.

### 2.3. Guarde o token
Salve o token em um lugar seguro. Ele terá este formato:
```
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Passo 3: Configurar o package.json

Edite o arquivo `package.json` e atualize a seção `publish` com seu usuário GitHub:

```json
"publish": {
  "provider": "github",
  "owner": "SEU_USUARIO_GITHUB",
  "repo": "filehub",
  "releaseType": "release"
}
```

**Exemplo:** Se seu GitHub é `github.com/joaosilva`, configure:
```json
"publish": {
  "provider": "github",
  "owner": "joaosilva",
  "repo": "filehub",
  "releaseType": "release"
}
```

---

## Passo 4: Enviar o Código para o GitHub

Abra o terminal na pasta do projeto e execute:

```bash
# Inicializa o Git (se ainda não foi feito)
git init

# Adiciona todos os arquivos
git add .

# Faz o primeiro commit
git commit -m "Versão inicial do FileHub v1.0.0"

# Adiciona o repositório remoto (substitua SEU_USUARIO)
git remote add origin https://github.com/SEU_USUARIO/filehub.git

# Renomeia a branch para main
git branch -M main

# Envia para o GitHub
git push -u origin main
```

---

## Passo 5: Publicar a Primeira Release

### 5.1. Configure o token no terminal

**Windows (CMD):**
```cmd
set GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Windows (PowerShell):**
```powershell
$env:GH_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**macOS/Linux:**
```bash
export GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5.2. Execute o publish
```bash
npm run publish
```

### 5.3. Aguarde o processo
O electron-builder irá:
1. Compilar o app
2. Criar os instaladores
3. Fazer upload para o GitHub Releases
4. Criar a Release automaticamente

---

## Passo 6: Verificar a Release

1. Acesse seu repositório no GitHub
2. Clique em **Releases** (lado direito)
3. Você verá a release `v1.0.0` com os arquivos:
   - `FileHub-Setup-1.0.0.exe`
   - `FileHub-Setup-1.0.0.exe.blockmap`
   - `latest.yml`

---

## Publicando Atualizações

Quando quiser lançar uma nova versão:

### 1. Faça as alterações no código

### 2. Atualize a versão no package.json
```json
"version": "1.1.0"
```

### 3. Commit e push
```bash
git add .
git commit -m "Release v1.1.0 - Descrição das mudanças"
git push origin main
```

### 4. Publique
```bash
# Configure o token (se não estiver configurado)
set GH_TOKEN=seu_token_aqui

# Publique
npm run publish
```

### 5. Usuários recebem a atualização
Quando os usuários abrirem o app, verão um popup:
> "Uma nova versão (1.1.0) está disponível! Deseja baixar agora?"

---

## Estrutura da Release no GitHub

Após publicar, sua release terá:

```
v1.0.0
├── FileHub-Setup-1.0.0.exe          # Instalador Windows
├── FileHub-Setup-1.0.0.exe.blockmap # Mapa para atualizações incrementais
├── latest.yml                        # Metadados da versão (auto-update lê este arquivo)
└── Source code (zip/tar.gz)          # Código fonte (automático)
```

O arquivo `latest.yml` contém:
```yaml
version: 1.0.0
files:
  - url: FileHub-Setup-1.0.0.exe
    sha512: ...
    size: ...
path: FileHub-Setup-1.0.0.exe
sha512: ...
releaseDate: '2024-01-01T00:00:00.000Z'
```

---

## Como o Auto-Update Funciona

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLUXO DE UPDATE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. App inicia                                                  │
│     │                                                           │
│     ▼                                                           │
│  2. Verifica latest.yml no GitHub Releases                      │
│     │                                                           │
│     ▼                                                           │
│  3. Compara versão atual com versão no latest.yml               │
│     │                                                           │
│     ├─► Se igual: "App está atualizado" (log)                   │
│     │                                                           │
│     └─► Se diferente: Mostra popup "Update disponível"          │
│         │                                                       │
│         ▼                                                       │
│  4. Usuário clica "Baixar Agora"                                │
│     │                                                           │
│     ▼                                                           │
│  5. Download do novo instalador                                 │
│     │                                                           │
│     ▼                                                           │
│  6. Popup "Reiniciar Agora?"                                    │
│     │                                                           │
│     ▼                                                           │
│  7. App fecha, instala update, reabre                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Dicas e Troubleshooting

### O publish falha com erro de autenticação
- Verifique se o token está correto
- O token precisa ter permissão `repo`
- Tente gerar um novo token

### A release não aparece no GitHub
- Verifique se o push foi feito antes do publish
- Veja os logs do terminal para erros

### Usuários não recebem o update
- Verifique se o `latest.yml` foi publicado
- O app só verifica updates em produção (não em `npm start`)
- O repositório deve ser acessível (se privado, o app pode não conseguir baixar)

### Repositório Privado
Se o repositório for privado, o auto-update pode não funcionar diretamente. Opções:
1. Use repositório público
2. Configure um servidor próprio para hospedar as releases
3. Use S3, DigitalOcean Spaces, ou similar

### Testando localmente
Para testar o update localmente, crie um arquivo `dev-app-update.yml` na raiz:
```yaml
provider: github
owner: SEU_USUARIO
repo: filehub
```

---

## Checklist Final

- [ ] Repositório criado no GitHub
- [ ] Token gerado com permissão `repo`
- [ ] package.json atualizado com owner/repo corretos
- [ ] Código enviado para o GitHub (git push)
- [ ] Primeira release publicada (npm run publish)
- [ ] Release visível em github.com/SEU_USUARIO/filehub/releases
- [ ] Arquivos .exe e latest.yml presentes na release

---

## Comandos Rápidos

```bash
# Ver versão atual
npm pkg get version

# Atualizar versão (patch: 1.0.0 → 1.0.1)
npm version patch

# Atualizar versão (minor: 1.0.0 → 1.1.0)
npm version minor

# Atualizar versão (major: 1.0.0 → 2.0.0)
npm version major

# Publicar
npm run publish
```

---

## Suporte

Se tiver problemas, verifique:
1. Logs do terminal durante `npm run publish`
2. Aba "Actions" do GitHub (se usar CI/CD)
3. Seção "Releases" do repositório
