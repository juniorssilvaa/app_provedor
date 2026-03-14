# WR TELECOM Mobile App

Aplicativo de autoatendimento desenvolvido em Flutter para clientes da WR TELECOM.

## ✨ Funcionalidades

- **Dashboard**: Visão geral do plano e atalhos.
- **Faturas**: Visualização de boletos e pagamento via PIX (Copia e Cola).
- **Suporte**: Abertura e acompanhamento de chamados técnicos.
- **IA Assistente**: Chat inteligente para suporte e dúvidas.
- **Gestão Wi-Fi**: Visualização de dispositivos conectados (via GenieACS).
- **Notificações**: Alertas de faturas e avisos importantes via Firebase.

## 🚀 Como Rodar (Desenvolvimento)

Para rodar o app no seu emulador ou dispositivo físico, utilize o comando:

```bash
flutter run --flavor wrtelecom
```

## ⚙️ Configuração de Ambiente

### 🌐 URLs da API (Back-end)

A URL base da API fica configurada no arquivo `lib/core/app_config.dart`.

- **🔗 Produção (Oficial):** `https://apis.niochat.com.br/`
- **💻 Desenvolvimento Local:** `http://10.0.2.2:8000/` *(usado para rodar a API de testes na própria máquina junto com o emulador Android)*

### Android (Release)
Para gerar os arquivos de produção para as lojas, você também deve especificar o flavor:
```bash
# Gerar APK
flutter build apk --flavor wrtelecom --release

# Gerar AAB (para Google Play)
flutter build appbundle --flavor wrtelecom --release
```

### iOS
Requer macOS e Xcode configurado. O esquema de compilação acompanha o flavor.
```bash
flutter build ios --flavor wrtelecom --release
```

## 🏗 Estrutura de Pastas
- `lib/providers/`: Cérebro do app, gerencia login e dados globais (ex: `app_provider.dart`).
- `lib/screens/`: Todas as telas divididas por funcionalidade.
- `lib/services/`: Conectores de API (SGP, AI, Telemetria).
- `lib/core/app_config.dart`: Fica armazenado as configurações de URL da API e Tokens.
