# Configuração do Portainer para GitHub Container Registry

## Problema
O Portainer não está puxando as novas imagens do GitHub Container Registry (ghcr.io) automaticamente.

## Solução

### 1. Configurar Registry no Portainer

Para que o Portainer possa puxar imagens do GitHub Container Registry, você precisa configurar um registry:

1. Acesse o Portainer: `https://app-provedor.niochat.com.br`
2. Vá em **Settings** > **Registries**
3. Clique em **Add registry**
4. Preencha os campos:
   - **Name**: `GitHub Container Registry` (ou qualquer nome)
   - **Registry URL**: `ghcr.io`
   - **Authentication**: Marque a opção
   - **Username**: `juniorssilvaa`
   - **Password**: Use o token do GitHub (GHCR_TOKEN)
     - Para gerar um token: GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
     - Permissões necessárias: `read:packages`

### 2. Verificar se o Registry está configurado

Após adicionar o registry, verifique se ele aparece na lista de registries disponíveis.

### 3. Atualizar a Stack

Quando o GitHub Actions fizer o deploy, o Portainer deve:
1. Receber a atualização via API
2. Puxar automaticamente as novas imagens do ghcr.io
3. Recriar os containers com as novas imagens

### 4. Troubleshooting

Se o Portainer ainda não estiver puxando as imagens:

1. **Verifique os logs do workflow do GitHub Actions**
   - Vá em: `https://github.com/juniorssilvaa/app_provedor/actions`
   - Veja se o job `deploy` está executando com sucesso

2. **Verifique se o registry está funcionando**
   - No Portainer, vá em **Registries**
   - Clique no registry do ghcr.io
   - Teste a conexão

3. **Force o pull manualmente**
   - No Portainer, vá em **Stacks**
   - Encontre a stack `app_provedor`
   - Clique em **Editor**
   - Clique em **Update the stack**
   - Marque a opção **Pull and redeploy**
   - Clique em **Update the stack**

4. **Verifique as permissões da API Key**
   - A `PORTAINER_API_KEY` precisa ter permissões para:
     - Ler stacks
     - Atualizar stacks
     - Gerenciar containers

### 5. Configuração do GitHub Actions

O workflow já está configurado para:
- Fazer build das imagens
- Enviar para o ghcr.io
- Atualizar a stack no Portainer via API

Certifique-se de que os seguintes secrets estão configurados no GitHub:
- `GHCR_TOKEN`: Token do GitHub com permissão `write:packages`
- `PORTAINER_API_KEY`: API Key do Portainer com permissões de escrita

### 6. Verificar as Imagens

Para verificar se as imagens estão sendo criadas:
1. Acesse: `https://github.com/juniorssilvaa/app_provedor/pkgs/container/app_provedor-backend`
2. Verifique se as novas tags estão aparecendo após cada push
