# NIOCHAT SERVIÇOS TECNOLÓGICOS

Bem-vindo ao sistema de administração e gestão da **NIOCHAT SERVIÇOS TECNOLÓGICOS**. Este sistema foi desenvolvido para gerenciar provedores, usuários de aplicativos, faturas e integrações de forma centralizada e eficiente.

## 📋 Sobre o Sistema

O sistema é composto por duas partes principais:
- **Backend Django**: Painel administrativo web para gestão de provedores e super-admin dashboard.
- **App Mobile (Flutter)**: Aplicativo desenvolvido em Flutter para clientes finais, incluindo chat inteligente com IA, gestão de faturas, suporte técnico e telemetria de rede.

## 📁 Estrutura do Projeto

```
app_provedor/
├── backend/                    # Django Backend
│   ├── api/                   # APIs REST para o App Flutter
│   │   ├── ai_views.py         # Chat com Gemini & Telemetria
│   │   ├── sgp_proxy.py        # Proxy de integração SGP
│   │   └── views_push.py       # Gestão de Push Notifications
│   ├── core/                  # Core Business Logic
│   │   ├── models.py           # Database Schema (Provider, AppUser, etc.)
│   │   └── views.py            # Dashboard & Provider Panel
│   ├── templates/              # Painéis Administrativos
│   │   ├── super_admin/       # Dashboard Global & Gestão de Provedores
│   │   └── pages/provider/    # Painel do Provedor (Integrações SGP, etc.)
│   └── manage.py              # CLI Django
├── mobile/                     # App Mobile Flutter
│   ├── lib/                   # Código-fonte Dart
│   │   ├── main.dart          # Entry point
│   │   ├── screens/           # Interface do Usuário (Home, AI Chat, Faturas)
│   │   ├── services/          # Integrações (SGP, IA, Telemetria)
│   │   └── provider.dart      # State Management
│   ├── assets/                # Design & Media
│   └── pubspec.yaml           # Dependências Flutter
├── docker-compose.yml         # Orquestração de Containers
└── README.md                  # Este arquivo
```

## 🔧 Tecnologias Utilizadas

### Backend (Django)
- **Framework**: Django 5.x + Django REST Framework
- **IA Integration**: Google Gemini 2.0 Flash
- **Database**: PostgreSQL / SQLite (Dev)
- **Static Files**: WhiteNoise + Tailwind CSS
- **Charts**: Chart.js no dashboard

### Mobile (Flutter)
- **Framework**: Flutter 3.x
- **Linguagem**: Dart
- **UI System**: Material Design 3 (Dark Theme)
- **State Management**: Provider
- **Networking**: HTTP, connectivity_plus
- **Notificações**: Firebase Messaging (FCM)

## 🚀 Como Rodar o Sistema

### 1. Backend
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
# Para processar notificações agendadas:
python manage.py process_notifications --loop
```
Acesse o painel em: `http://localhost:8000/login/`
produção: 'https://apis.niochat.com.br/api/'

### 2. Mobile (App)
```bash
cd mobile
flutter pub get
flutter run
```

## 📱 Funcionalidades Principais

### Painel Administrativo
- **Super-Admin Dashboard**: Gráficos analíticos de uso e distribuição de provedores.
- **Gestão de Provedores**: Painel para configuração de logos, cores e tokens de API.
- **Integração SGP**: Configuração fácil de webhooks e tokens para automação.

### App Mobile
- **Login Inteligente**: Autenticação unificada via CPF.
- **Assistente IA**: Chat interativo para diagnóstico de rede e suporte automático.
- **Gestão Financeira**: Visualização de faturas, cópia de PIX e boletos.
- **Telemetria**: Monitoramento em tempo real do sinal Wi-Fi e qualidade da conexão.

## 🤖 Assistente de IA (Gemini 2.0 Flash)

O sistema utiliza o Gemini para automatizar o atendimento:
- **Diagnóstico Automático**: Identifica queda de rede ou contrato suspenso.
- **Auto-Atendimento**: Gera boletos e códigos PIX via chat.
- **Configuração Remota**: (Em desenvolvimento) Alteração de Wi-Fi via IA.

---

© 2024-2026 NIOCHAT SERVIÇOS TECNOLÓGICOS. Todos os direitos reservados.
