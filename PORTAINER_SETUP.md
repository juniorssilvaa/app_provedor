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

---

## Erro "No such image" no Swarm (tasks Rejected)

Se os serviços aparecem com **Rejected** e o erro é `No such image: ghcr.io/juniorssilvaa/app_provedor-backend:latest@sha256:...`, o **nó** onde o serviço sobe (ex.: appProvador) não consegue puxar a imagem. Em Swarm, o pull é feito no nó que executa a task, não só no Portainer.

### Solução 1: Login no nó (recomendado para pacote privado)

No servidor que é nó do Swarm (ex.: **appProvador**), faça login no GHCR:

```bash
# No servidor (appProvador), use o mesmo token do GHCR_TOKEN (read:packages ou write:packages)
docker login ghcr.io -u juniorssilvaa -p SEU_GHCR_TOKEN
```

Depois force a atualização do serviço para puxar de novo:

```bash
# Atualizar o serviço para forçar novo pull (no manager do Swarm)
docker service update --force app_provedor_app-provedor-backend
docker service update --force app_provedor_app-provedor-scheduler
```

Ou pelo Portainer: **Stacks** → sua stack → **Editor** → **Pull and redeploy** → **Update the stack**.

### Solução 2: Deixar o pacote público (sem login no servidor)

1. No GitHub: **juniorssilvaa/app_provedor** → **Packages** (ou acesse o package do container).
2. Abra o package **app_provedor-backend**.
3. **Package settings** → **Change visibility** → **Public**.

Assim qualquer nó consegue `docker pull` sem credenciais. Depois faça **Update the stack** no Portainer (Pull and redeploy).

### Solução 3: Verificar se a imagem existe

No servidor ou em qualquer máquina:

```bash
docker pull ghcr.io/juniorssilvaa/app_provedor-backend:latest
```

- Se der **unauthorized**: o pacote é privado → use Solução 1 ou 2.
- Se der **not found**: a imagem ainda não foi publicada → confira o workflow no GitHub Actions e se o job **build-and-push** concluiu com sucesso.

---

## Por que o Portainer não puxa a imagem sozinho (e o pull manual funciona)?

Em **Docker Swarm**, quem puxa a imagem é o **nó** onde a task vai rodar (ex.: appProvador), não o Portainer. Duas coisas costumam causar o problema:

1. **Digest antigo no serviço** – O serviço pode ter ficado com um digest (`sha256:...`) antigo na especificação. Quando o registry atualiza `latest`, esse digest pode deixar de existir e o nó passa a receber "No such image". O `docker pull` manual usa o `latest` atual; o serviço continua tentando o digest antigo.
2. **Deploy logo após o push** – O workflow faz push e em seguida chama o Portainer. O GHCR pode ainda não ter propagado a nova imagem quando o nó tenta puxar.

**O que já foi feito no workflow:** Foi adicionada uma espera de 45 segundos antes do deploy para dar tempo do registry propagar.

**Quando os serviços continuam Rejected:** No servidor (manager do Swarm), force o serviço a usar a imagem de novo e recriar as tasks:

```bash
docker service update --image ghcr.io/juniorssilvaa/app_provedor-backend:latest --force app_provedor_app-provedor-backend
docker service update --image ghcr.io/juniorssilvaa/app_provedor-backend:latest --force app_provedor_app-provedor-scheduler
docker service update --image ghcr.io/juniorssilvaa/app_provedor-webhook:latest --force app_provedor_app-provedor-webhook
```

Assim o Swarm resolve de novo o `:latest`, puxa a imagem (que já existe no nó ou será baixada) e recria as tasks.
