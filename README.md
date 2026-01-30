# NIOCHAT SERVIÇOS TECNOLÓGICOS

Bem-vindo ao sistema de administração e gestão da **NIOCHAT SERVIÇOS TECNOLÓGICOS**. Este sistema foi desenvolvido para gerenciar provedores, usuários de aplicativos, notificações e integrações de forma centralizada e eficiente.

## 📋 Sobre o Sistema

O sistema é composto por duas partes principais:
- **Backend Django**: Painel administrativo web para gestão de provedores
- **App Mobile (React Native)**: Aplicativo para clientes finais com chat com IA, faturas, suporte e monitoramento de rede

## 📁 Estrutura do Projeto

```
app_provedor/
├── backend/                    # Django Backend
│   ├── api/                   # APIs REST
│   │   ├── views.py            # Views principais (CRUD de provedores, usuários, planos)
│   │   ├── ai_views.py         # Views de IA (chat com Gemini)
│   │   ├── views_push.py       # Views de Push Notifications
│   │   ├── sgp_proxy.py        # Proxy para integração SGP
│   │   ├── push_service.py     # Serviço de envio de Push
│   │   └── urls.py            # Rotas da API
│   ├── core/                  # Core do Django
│   │   ├── models.py           # Modelos de dados (Provider, AppUser, Notification, etc.)
│   │   ├── views.py            # Views do painel Django
│   │   ├── admin.py            # Configurações do Admin
│   │   ├── management/         # Comandos de gerenciamento
│   │   │   └── commands/
│   │   │       └── process_scheduled_notifications.py
│   │   ├── migrations/         # Migrações do banco
│   │   └── urls.py            # Rotas do core
│   ├── niochat/               # Configurações do Django
│   │   ├── settings.py         # Configurações principais
│   │   ├── urls.py            # URLs principais
│   │   └── wsgi.py
│   ├── templates/              # Templates HTML
│   │   ├── base.html          # Template base
│   │   ├── dashboard.html     # Dashboard
│   │   ├── notifications.html   # Gestão de notificações
│   │   ├── plans_config.html   # Configuração de planos
│   │   └── pages/            # Páginas específicas
│   ├── static/                 # Arquivos estáticos
│   ├── manage.py              # Gerenciador Django
│   ├── webhook_server.py       # Servidor de Webhook (FastAPI)
│   ├── check_scheduled.py     # Script de verificação de agendamentos
│   └── requirements.txt       # Dependências Python
├── mobile/                     # React Native Mobile App
│   ├── src/
│   │   ├── screens/           # Telas do app
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── InvoicesScreen.tsx
│   │   │   ├── AIChatScreen.tsx
│   │   │   ├── PlansScreen.tsx
│   │   │   └── ... (mais telas)
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── contexts/          # React Context (Auth, Theme, Config)
│   │   ├── navigation/        # Navegação
│   │   ├── services/          # Serviços API (SGP, Notificações)
│   │   ├── theme/             # Cores e estilos
│   │   ├── utils/             # Utilitários
│   │   └── types/            # TypeScript types
│   ├── assets/               # Imagens e ícones
│   ├── package.json          # Dependências Node.js
│   └── app.json             # Configuração Expo
├── docker-compose.yml         # Docker Orquestração
├── Dockerfile               # Docker Image
└── README.md               # Este arquivo
```

## 🔧 Tecnologias Utilizadas

### Backend (Django)
- **Framework**: Django 5.2.8
- **API**: Django REST Framework
- **Banco de Dados**: PostgreSQL 14
- **Push Notifications**: Firebase Admin SDK
- **IA**: Google Gemini 2.0 Flash
- **Proxy Webhook**: FastAPI
- **Web Server**: Gunicorn
- **Static Files**: WhiteNoise

### Mobile (React Native/Expo)
- **Framework**: React Native 0.81.5 + Expo SDK 54
- **Linguagem**: TypeScript
- **Navegação**: React Navigation (Bottom Tabs + Native Stack)
- **UI**: React Native Paper (Material Design 3)
- **Estado**: React Context (Auth, Theme, Config)
- **Notificações**: Expo Notifications (Firebase)
- **Networking**: React Native NetInfo, Expo Location
- **Ícones**: @expo/vector-icons

## 🚀 Como Rodar o Sistema

### Opção 1: Usando Docker Compose (Recomendado)

```bash
docker-compose up -d
```

Isso iniciará:
- PostgreSQL (porta 5433)
- Backend Django (porta 8000)
- Webhook Server (porta 8001)
- Scheduler de Notificações

### Opção 2: Desenvolvimento Local

#### Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

#### Mobile

```bash
cd mobile
npm install
npx expo start
# ou para Android:
npm run android
# ou para iOS:
npm run ios
```

## 🔑 Acessando o Sistema

### Painel Administrativo (Backend)

1. Acesse `http://127.0.0.1:8000/login/`
2. Entre com as credenciais do Superusuário
3. Você será redirecionado para o Dashboard

### App Mobile

1. Inicie o app com `npx expo start`
2. Escaneie o QR Code com o app Expo Go
3. Ou execute `npm run android`/`npm run ios` para testes nativos

## 📱 Funcionalidades do Sistema

### Painel Administrativo (Backend)
- **Gestão de Provedores (ISPs)**: Cadastro, edição, bloqueio e desbloqueio
- **Gestão de Usuários**: Criação de admins e superadmins
- **Gestão de Usuários do App**: Monitoramento de clientes finais
- **Envio de Notificações Push**: Segmentação por tags, CPF, contrato
- **Templates de Notificação**: Salvar e reutilizar mensagens
- **Agendamento**: Agendar envios para datas futuras
- **Avisos In-App**: Criar pop-ups direcionados
- **Configuração de Planos**: Gerenciar planos de internet
- **Integração SGP**: Configurar URL e token do sistema SGP
- **Configuração IA**: Configurar chave API do Gemini
- **Personalização**: Cores, logo e estilo do app por provedor

### App Mobile
- **Login**: Autenticação via SGP
- **Home**: Visão geral do contrato, fatura atual, status Wi-Fi
- **Faturas**: Listagem e pagamento via PIX/Boleto
- **Planos**: Visualização dos planos disponíveis
- **Chat com IA**: Assistente inteligente usando Gemini 2.0 Flash
- **Suporte**: Listagem de canais de atendimento
- **Speed Test**: Teste de velocidade de conexão
- **Monitoramento Wi-Fi**: Sinal, SSID, frequência (2.4GHz/5GHz)
- **Telemetria**: Envio de dados de rede para análise
- **Notificações**: Recebimento de push e avisos in-app

## 🤖 Assistente de IA (Gemini 2.0 Flash)

O sistema integra o **Google Gemini 2.0 Flash** como assistente inteligente no app mobile, com funcionalidades:

- Diagnóstico de problemas de internet
- Verificação de status do contrato (ativo/suspenso)
- Envio de dados de pagamento (PIX/Boleto)
- Consulta de informações do modem (CPE)
- Alteração de configurações Wi-Fi
- Abertura automática de chamados técnicos

**Ferramentas disponíveis**:
- `verificar_status_conexao`: Verifica status do contrato no SGP
- `realizar_liberacao_confianca`: Desbloqueio temporário para pagamento
- `consultar_cpe_modem`: Busca informações do modem
- `alterar_configuracao_wifi`: Altera SSID/senha do Wi-Fi
- `abrir_chamado`: Abre chamado técnico no SGP

## 🔌 Integrações

### Firebase Cloud Messaging
- Envio de notificações push para dispositivos Android/iOS
- Registro automático de tokens
- Segregação por provedor (isolação total)

### SGP (Sistema de Gestão Provedor)
- Proxy de requisições do app para o SGP
- Webhooks para notificações automáticas
- Consulta de clientes, contratos, faturas

## 📦 Produção

### Imagens Docker

As imagens são construídas automaticamente via GitHub Actions:
- `ghcr.io/juniorssilvaa/app_provedor-backend:latest`
- `ghcr.io/juniorssilvaa/app_provedor-webhook:latest`

### Portainer

Veja `PORTAINER_SETUP.md` para instruções de configuração no Portainer.

### GitHub Secrets

Configure as seguintes secrets no repositório:
- `SECRET_KEY`: Chave secreta do Django
- `POSTGRES_PASSWORD`: Senha do PostgreSQL
- `GEMINI_API_KEY`: Chave API do Google Gemini
- `FIREBASE_CREDENTIALS`: Credenciais do Firebase (Base64)

## 📝 Documentação Adicional

- `SCHEDULED_NOTIFICATIONS_SETUP.md` - Guia de notificações agendadas
- `GITHUB_SECRETS_SETUP.md` - Configuração de secrets GitHub
- `PORTAINER_SETUP.md` - Instalação no Portainer

---

© 2024 NIOCHAT SERVIÇOS TECNOLÓGICOS. Todos os direitos reservados.
