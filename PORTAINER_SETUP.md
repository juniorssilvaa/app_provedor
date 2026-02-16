# Configuração do Portainer para GitHub Container Registry

## Problema
O Portainer não está puxando as novas imagens do GitHub Container Registry (ghcr.io) automaticamente.

## Solução Automática (Implementada)

O sistema agora utiliza tags dinâmicas baseadas no commit SHA do GitHub. Isso garante que:
1. O Swarm sempre identifique uma nova versão da imagem.
2. O pull seja obrigatório e automático em todos os nós.
3. Não haja conflito de digest antigo.

### Troubleshooting (Se o deploy automático falhar)

Se por algum motivo o deploy automático não refletir as mudanças:

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
