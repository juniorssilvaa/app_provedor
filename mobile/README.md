# Jocanet Telecom Mobile App

Aplicativo de autoatendimento desenvolvido em Flutter para clientes da Jocanet Telecom.

## ✨ Funcionalidades

- **Dashboard**: Visão geral do plano e atalhos.
- **Faturas**: Visualização de boletos e pagamento via PIX (Copia e Cola).
- **Suporte**: Abertura e acompanhamento de chamados técnicos.
- **IA Assistente**: Chat inteligente para suporte e dúvidas.
- **Gestão Wi-Fi**: Visualização de dispositivos conectados (via GenieACS).
- **Notificações**: Alertas de faturas e avisos importantes via Firebase.

## ⚙️ Configuração de Ambiente

O app utiliza **Product Flavors** para suportar múltiplos provedores (White-Label). Os sabores disponíveis são `nanet` e `jocanet`.

### Firebase (Android)
As credenciais do Firebase são separadas por sabor:
- **Nanet**: `android/app/src/nanet/google-services.json` (ID: `com.nanettelecom.app.niochat`)
- **Jocanet**: `android/app/src/jocanet/google-services.json` (ID: `com.jocanet.app.niochat`)

### Variáveis de API
As URLs e Tokens estão no arquivo `lib/config.dart`.

- **🔗 Produção (Oficial):** `https://apis.niochat.com.br/`
- **💻 Desenvolvimento Local:** `http://10.0.2.2:8000/` *(usado para rodar a API de testes na própria máquina junto com o emulador Android)*

## 🚀 Como Rodar e Buildar

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

### Execução Local
Para rodar o app no emulador ou dispositivo físico:
```bash
# Para rodar a versão da Jocanet
flutter run --flavor jocanet

# Para rodar a versão da Nanet
flutter run --flavor nanet
```

### Android (Release)
Para gerar os arquivos de produção:
```bash
# Gerar APK (Jocanet)
flutter build apk --flavor jocanet --release

# Gerar AAB (Jocanet - para Google Play)
flutter build appbundle --flavor jocanet --release
```

### iOS
Requer macOS e Xcode configurado.
```bash
# Jocanet
flutter build ios --flavor jocanet --release
```

## 🏗 Estrutura de Pastas
- `lib/provider.dart`: Cérebro do app, gerencia login e dados globais.
- `lib/screens/`: Todas as telas divididas por funcionalidade.
- `lib/services/`: Conectores de API (SGP, AI, Telemetria).
