# NIOCHAT MOBILE - FLUTTER

App móvel em **Flutter** desenvolvido para clientes da NIOCHAT. Sistema de gestão de internet com assistente IA, faturas e suporte técnico.

## 📋 Sobre o App

O aplicativo móvel NIOCHAT permite que clientes de provedores de internet:
- Façam login com CPF
- Acompanhem suas faturas e paguem via PIX
- Monitorem a qualidade da conexão Wi-Fi
- Recebam notificações push importantes
- Falem com assistente IA (Gemini) para suporte
- Acessem informações sobre seus planos e contratos

## 📁 Estrutura do Projeto

```
mobile/                              # Aplicativo Flutter
├── lib/
│   ├── main.dart                    # Ponto de entrada da aplicação
│   ├── provider.dart                 # Provider para gerenciar estado global
│   ├── services.dart                 # Serviços de API e rede
│   └── screens/
│       ├── splash_screen.dart       # Tela inicial com animação
│       ├── login/
│       │   └── login_screen.dart  # Tela de autenticação
│       ├── home/
│       │   └── home_screen.dart     # Tela principal
│       ├── fatura/
│       │   └── fatura_screen.dart # Tela de faturas
│       ├── ai/
│       │   └── ai_chat_screen.dart   # Chat com assistente IA
│       ├── planos/
│       │   └── planos_screen.dart   # Planos disponíveis
│       └── perfil/
│           └── perfil_screen.dart  # Perfil do usuário
├── assets/
│   ├── images/                      # Imagens (logo, ícones, etc.)
│   └── icons/                       # Ícones do app
├── pubspec.yaml                     # Dependências do Flutter
├── android/                          # Configuração Android
└── .flutter/                           # Configuração local do Flutter
```

## 🚀 Tecnologias Utilizadas

### Framework e UI
- **Flutter**: Framework principal
- **SDK**: Flutter SDK 3.0+
- **Dart**: Linguagem principal
- **Material Design**: Google Material Design 3

### Principais Pacotes
- `provider` - Gerenciamento de estado
- `shared_preferences` - Armazenamento local
- `http` - Requisições HTTP
- `connectivity_plus` - Verificação de conexão
- `firebase_messaging` - Notificações push
- `firebase_core` - Integração Firebase
- `google_sign_in` - Login com Google (opcional)
- `path_provider` - Acesso a sistema de arquivos
- `flutter_local_notifications` - Notificações locais

## 📱 Funcionalidades do App

### 1. Autenticação
- Login com CPF e senha
- Armazenamento seguro de credenciais
- Sessão persistente
- Logout seguro

### 2. Tela Principal (Home)
- **Header Personalizado**:
  - Logo do provedor
  - Indicador de notificações
  - Menu lateral (Drawer)
- **Card de Usuário**:
  - Avatar do cliente
  - Número do contrato
  - Status (Ativo/Suspenso)
  - Nome do cliente
  - Informações do plano
  - Endereço de instalação
- **Card de Fatura Atual**:
  - Valor destacado
  - Data de vencimento
  - Status (Paga/Aberta/Atrasada)
  - Botões de ação:
    - Pagar com PIX (azul)
    - Boleto (cinza)
    - Cartão (cinza)
- **Card de Conexão**:
  - SSID da rede
  - Força do sinal (com barra de progresso)
  - Informações de frequência (2.4GHz/5GHz)
  - Endereço IP local
- **Grid de Acesso Rápido**:
  - Faturas
  - Reativar
  - Suporte
  - Consumo
  - Avisos
  - Modem
  - Contrato
  - Speed Test

### 3. Faturas
- **Listagem de todas as faturas**
- **Indicadores visuais**:
  - Status colorido (Atrasada = vermelho, Aberta = laranja, Paga = verde)
  - Ícone de status (Aviso, Sucesso, OK)
  - Valor em destaque
  - Data de vencimento
- **Opções de pagamento**:
  - **PIX** (principal):
    - Código PIX
    - QR Code do PIX
    - Botões de cópia
  - **Boleto**:
    - Visualização do boleto
  - **Cartão de Crédito**:
    - Informações do cartão
- **Pull-to-refresh** para atualizar
- **Mensagem de erro** quando falha ao carregar
- **Diálogo de pagamento** com:
  - Opções de PIX/Boleto/Histórico
  - Detalhes de pagamento
  - Botão de copiar código

### 4. Chat com IA (Gemini 2.0)
- **Interface moderna de chat**:
  - Header personalizado com logo do provedor
  - Indicador "digitando..."
  - Lista de mensagens
- **Bubbles coloridos**:
  - Mensagens do usuário (azul, alinhado à direita)
  - Mensagens da IA (branco, alinhado à esquerda)
  - Timestamp em cada mensagem
- **Campo de entrada de mensagem**:
  - Texto multilinha
  - Placeholder claro
  - Botão de enviar (azul)
  - **Exibição de dados de pagamento**:
  - Quando a IA envia PIX/Boleto
  - Código PIX clicável para copiar
  - Linha digitável
  - Ícones de ação (copiar)
- **Rolagem automática** para nova mensagem
- **Indicador de carregamento**

### 5. Planos
- **Listagem de planos disponíveis**
- **Cards de planos com**:
  - Ícone por tipo (Fibra, Rádio, Cabo)
  - Nome do plano
  - Tecnologia (em maiúsculo)
  - Especificações:
    - Velocidade Download
    - Velocidade Upload
  - Preço em destaque (R$ XX,XX)
  - Descrição detalhada do plano
- **Pull-to-refresh** para atualizar

### 6. Perfil
- **Avatar grande** (100x100)
- **Formulário de edição**:
  - Nome completo
  - CPF
  - E-mail
  - Telefone
- **Cards informativos**:
  - Endereço de instalação
  - Número do contrato
  - Data de cadastro
- **Botão Salvar** (azul)
- **Botão Sair** (vermelho)
- **Logout** que limpa todas as credenciais

### 7. Tela de Splash
- **Animação suave** do logo:
  - Fade-in
  - Scale-in
- **Fundo azul escuro** (#1A1F2E)
- **Nome do app**: NANET
- **Indicador de carregamento**

### 8. Funcionalidades Globais
- **Tema Dark**:
  - Fundo: #1A1F2E (azul escuro)
  - Texto: branco (#FFFFFF)
  - Cores de acento: azul (#2196F3)
- **Drawer (Menu Lateral)**:
  - Avatar do usuário
  - Nome (se logado)
  - CPF
  - Links para telas principais:
    - Home
    - Faturas
    - Planos
    - Suporte
    - Assistente IA
    - Perfil
  - Logout (em vermelho)
- **Navegação**:
  - Stack navigator
  - Transições suaves
- **Pull-to-refresh** em listagens
- **Indicadores de carregamento**
- **Validação de formulários**
- **Toast/SnackBar** para feedback

## 🔄 Integração com Backend

### API REST
O app se conecta ao backend Django em `http://127.0.0.1:8000/api/`

#### Endpoints Utilizados
- **Login**: `POST /api/login/`
- **Configuração App**: `GET /api/public/config/`
- **Faturas**: `GET /api/public/invoices/`
- **Planos**: `GET /api/public/plans/`
- **Chat IA**: `POST /api/ai/chat/`
- **Perfil**: `POST /api/profile/update/`

### Autenticação
- Token JWT armazenado localmente
- Headers: `Authorization: Bearer {token}`
- Refresh automático de token (TODO)

### Notificações Push
- Firebase Cloud Messaging (FCM)
- Token registrado no backend
- Recebimento de push para:
  - Novas faturas
  - Avisos importantes
  - Lembretes de pagamento
  - Promoções

## 🤖 Assistente IA

O app utiliza **Google Gemini 2.0 Flash** como assistente inteligente.

### Funcionalidades da IA
- Diagnóstico de problemas de conexão
- Verificação de status do contrato (ativo/suspenso)
- Consulta de informações do modem (CPE)
- Alteração de configurações Wi-Fi
- Abertura automática de chamados técnicos
- Envio de dados de pagamento (PIX/Boleto)

### Ferramentas da IA (para implementar no backend)
- `verificar_status_conexao`: Verifica status no SGP
- `realizar_liberacao_confianca`: Desbloqueio temporário
- `consultar_cpe_modem`: Busca informações do modem
- `alterar_configuracao_wifi`: Altera SSID/senha
- `abrir_chamado`: Abre chamado técnico

## 📦 Notificações

### Tipos de Notificação
- **Faturas**: Vencimento, aviso de pagamento
- **Suporte**: Abertura de chamados
- **Promocionais**: Novos planos, descontos
- **Sistema**: Manutenção, melhorias

### Canais de Recebimento
- Push (Firebase)
- In-App Banners
- Drawer (ícone com contador)

## 🚀 Como Rodar o App

### Pré-requisitos
- **Flutter SDK**: 3.0 ou superior
- **Dart**: 3.0 ou superior
- **Android Studio**: 2023.1 ou superior (para desenvolvimento Android)
- **Java JDK**: 17 ou superior
- **Dispositivo**: Android/iOS ou Emulador

### Instalação

```bash
cd mobile
flutter pub get
```

### Rodar no Emulador Android

```bash
cd mobile
flutter run
```

### Rodar no Android Studio

1. **Abrir o projeto**:
   - File → Open
   - Navegue até: `c:\app\app_provedor\mobile`
   - Selecione a pasta
   - Clique em "OK"

2. **Sincronizar o Gradle**:
   - O Android Studio vai automaticamente detectar o projeto Flutter
   - Aguarde a conclusão do Gradle sync (primeira vez pode demorar alguns minutos)

3. **Rodar o app**:
   - Clique no botão "Run" (▶️) na barra superior
   - Ou pressione `Shift + F10`
   - O app será instalado no emulador Android
   - A tela de Splash será exibida primeiro

### Rodar em Dispositivo Físico

1. **Ativar USB Debugging** no dispositivo Android
2. **Conectar via USB** ao computador
3. **Configurar o Android Studio** para usar o dispositivo
4. **Executar** `flutter run`

### Build para Produção

```bash
cd mobile
flutter build apk --release
# ou
flutter build appbundle --release
```

## 🐛 Solução de Problemas

### Erro: "No Android device found"
- Verifique se o emulador está rodando (Android Emulator ou AVD Manager)
- Execute `adb devices` para listar dispositivos conectados
- Verifique se o USB Debugging está ativado

### Erro: "Gradle sync failed"
- Limpe o cache do Gradle: `mobile/android → Build → Clean Project`
- Invalidate caches: `File → Invalidate Caches / Restart`
- Verifique sua conexão com a internet

### Erro: "Connection refused"
- Verifique se o backend Django está rodando
- Execute `python manage.py runserver` no backend
- Verifique a URL no `lib/services.dart`

### Notificações Push Não Chegam
- Verifique se o Firebase está configurado
- Verifique o `google-services.json` em `mobile/android/app/`
- Teste o envio de push pelo console do Firebase

## 📝 Configurações Importantes

### API URL
Ajuste a URL no arquivo `lib/services.dart`:
```dart
static const String baseUrl = 'http://SEU_IP_OU_DOMINIO:8000/api';
```

### Tokens do Provedor
Para testar, você precisa de um `provider_token` válido:
- Crie um provedor no backend Django
- Obtenha o `provider_token` gerado
- Use esse token para configurar o app

### Firebase
- Crie um projeto no Firebase Console
- Baixe o `google-services.json`
- Coloque em `mobile/android/app/`
- Configure o FCM para Android

## 🎨 Design System

### Cores Principais
- **Primary**: #2196F3 (Azul)
- **Background**: #1A1F2E (Azul escuro)
- **Success**: #4CAF50 (Verde)
- **Warning**: #FF9800 (Laranja)
- **Error**: #F44336 (Vermelho)
- **Surface**: #FFFFFF (Branco)
- **On Surface**: #FFFFFF.withOpacity(0.9)

### Tipografia
- **Display Large**: 32px, Bold
- **Headline**: 24px, Bold
- **Title**: 20px, Bold
- **Body**: 14px, Regular
- **Caption**: 12px, Regular

### Componentes
- **Cards** com bordas arredondadas de 20px
- **Buttons** com bordas arredondadas de 12px
- **Inputs** com bordas arredondadas de 12px
- **Avatares** circulares
- **Ícones** com tamanho 24px/48px

## 📊 Monitoramento e Análise

### Telemetria (TODO)
- Sinal Wi-Fi (dBm)
- Taxa de transferência (upload/download)
- Latência (ms)
- Packet loss (%)
- Jitter (ms)

### Métricas do App (TODO)
- Tempo de carregamento de telas
- Taxa de cliques em botões
- Taxa de conversão em chat com IA
- Uso de funcionalidades

## 🔄 Próximos Passos

### Backend
- Criar endpoints da API Flutter:
  - Login com CPF
  - Listagem de faturas
  - Listagem de planos
  - Chat com IA
  - Atualização de perfil
- Configurar CORS para permitir requisições do Flutter
- Configurar autenticação JWT
- Implementar endpoints de IA (SGP integration)

### Mobile
- Implementar navegação completa entre telas
- Adicionar validação de formulários
- Implementar pull-to-refresh em todas as listagens
- Configurar notificações push reais
- Adicionar mais telas (Suporte, Contrato, Speed Test)
- Implementar gráfico de uso de internet
- Adicionar histórico de faturas
- Testar em múltiplos dispositivos

### Integrações
- Configurar Firebase Cloud Messaging real
- Testar chat com Gemini 2.0 Flash
- Implementar ferramentas da IA (CPE, Wi-Fi, chamados)
- Adicionar monitoramento em tempo real

## 📱 Suporte a Múltiplas Plataformas

### Android
- ✅ Suporte completo
- ✅ Push notifications via FCM
- ✅ Integração com backend

### iOS (TODO)
- 🔳 Pendente de desenvolvimento
- 🔳 Push notifications via APNs
- 🔳 Integração com backend

## 📞 Recursos

- Documentação oficial do Flutter: https://flutter.dev/docs
- Documentação do Provider: https://pub.dev/documentation/provider
- Material Design 3: https://m3.material.io/

---

© 2024 NIOCHAT SERVIÇOS TECNOLÓGICOS. Todos os direitos reservados.
