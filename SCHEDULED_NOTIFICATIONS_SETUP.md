# Configuração de Notificações Agendadas

## Funcionalidade

O sistema agora suporta agendamento de notificações push. Quando você preenche o campo "Agendar envio" no formulário de notificações, a notificação é salva e enviada automaticamente no horário especificado.

## Como Funciona

1. **Agendamento**: Ao preencher o campo de data/hora e enviar o formulário, a notificação é salva como "agendada" no banco de dados.

2. **Processamento**: Um comando Django (`process_scheduled_notifications`) verifica periodicamente se há notificações agendadas que estão no horário de envio.

3. **Envio Automático**: Quando o horário chega, a notificação é enviada automaticamente e o status é atualizado.

## Configuração do Processador

### ✅ Automático via Docker (Já Configurado)

O processador de notificações agendadas **já está configurado** no `docker-compose.yml` e roda automaticamente junto com o backend. O serviço `app-provedor-scheduler` executa o comando a cada 60 segundos (1 minuto).

**Não é necessário configurar nada manualmente!** O scheduler inicia automaticamente quando o Docker Compose/Docker Swarm sobe.

### Para Desenvolvimento Local (sem Docker)

Se estiver rodando localmente sem Docker, você pode:

#### Opção 1: Cron (Linux/Mac)

Adicione ao crontab para executar a cada minuto:

```bash
* * * * * cd /caminho/para/app_provedor-main && python manage.py process_scheduled_notifications
```

#### Opção 2: Task Scheduler (Windows)

1. Abra o Agendador de Tarefas do Windows
2. Crie uma nova tarefa
3. Configure para executar a cada minuto:
   - Programa: `python`
   - Argumentos: `manage.py process_scheduled_notifications`
   - Diretório inicial: `E:\app\app_provedor-main`

## Teste Manual

Para testar sem agendar:

```bash
python manage.py process_scheduled_notifications --dry-run
```

Isso mostra quais notificações seriam enviadas sem realmente enviá-las.

## Status das Notificações

- **Pendente**: Aguardando o horário agendado
- **Enviada**: Foi enviada com sucesso
- **Falhou**: Erro ao enviar
- **Cancelada**: Cancelada manualmente

## Visualização

As notificações agendadas aparecem na coluna direita da tela de envio de notificações, mostrando:
- Título
- Status
- Data/hora agendada
- Quantidade de envios (quando enviada)
