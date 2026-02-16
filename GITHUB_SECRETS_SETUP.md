# Configuração dos Secrets no GitHub Actions

## Secrets Necessários

Para que o workflow funcione corretamente, você precisa configurar os seguintes secrets no GitHub:

### 1. Acessar as Configurações de Secrets

1. Vá para: `https://github.com/juniorssilvaa/app_provedor/settings/secrets/actions`
2. Ou: Repositório > Settings > Secrets and variables > Actions

### 2. Secrets Obrigatórios

#### `PORTAINER_API_KEY`
- **Valor**: `[SUA_PORTAINER_API_KEY]`
- **Descrição**: API Key do Portainer para atualizar stacks
- **Como obter**: Portainer > Settings > API Keys > Create API Key
- **Exemplo**: `ptr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=`

#### `GHCR_TOKEN`
- **Valor**: `[SEU_GHCR_TOKEN]`
- **Descrição**: Token do GitHub para fazer push/pull de imagens no GitHub Container Registry
- **Permissões necessárias**: `write:packages`, `read:packages`
- **Como gerar**: GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)

#### `GEMINI_API_KEY` (se ainda não estiver configurado)
- **Descrição**: Token da API do Google Gemini (para funcionalidades de IA)
- **Opcional**: Apenas se usar funcionalidades de IA

### 3. Verificar se os Secrets Estão Configurados

1. Vá para: `https://github.com/juniorssilvaa/app_provedor/settings/secrets/actions`
2. Verifique se os secrets aparecem na lista
3. Se não estiverem, clique em **New repository secret** e adicione cada um

### 4. Configuração do Portainer

Além dos secrets no GitHub, você também precisa configurar o registry no Portainer:

1. Acesse: `https://app-provedor.niochat.com.br/`
2. Vá em **Settings** > **Registries**
3. Clique em **Add registry**
4. Preencha:
   - **Name**: `GitHub Container Registry`
   - **Registry URL**: `ghcr.io`
   - **Authentication**: Marque
   - **Username**: `juniorssilvaa` (ou seu username do GitHub)
   - **Password**: `[SEU_GHCR_TOKEN]` (mesmo valor configurado no secret GHCR_TOKEN)

### 5. Verificar o Endpoint ID

O workflow está configurado para usar `endpointId=1`. Verifique se este é o ID correto do seu endpoint no Portainer.

### 6. Testar o Workflow

Após configurar tudo:

1. Faça um commit e push para a branch `master`
2. Vá para: `https://github.com/juniorssilvaa/app_provedor/actions`
3. Verifique se o workflow está executando
4. Veja os logs para identificar possíveis erros

### 7. Troubleshooting

Se o Portainer não estiver puxando as imagens:

1. **Verifique os logs do workflow**
   - Procure por erros na etapa "Deploy to Portainer"

2. **Verifique o registry no Portainer**
   - Teste a conexão do registry
   - Verifique se as credenciais estão corretas

3. **Force o pull manualmente no Portainer**
   - Vá em **Stacks** > **app_provedor** > **Editor**
   - Clique em **Update the stack**
   - Marque **Pull and redeploy**
   - Clique em **Update the stack**

4. **Verifique as permissões da API Key**
   - A API Key precisa ter permissões para atualizar stacks
   - Verifique em: Portainer > Settings > API Keys
