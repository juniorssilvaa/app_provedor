# WR TELECOM Mobile App

Aplicativo de autoatendimento desenvolvido em Flutter para clientes da WR TELECOM.

## ✨ Funcionalidades

- **Dashboard**: Visão geral do plano e atalhos.
- **Faturas**: Visualização de boletos e pagamento via PIX (Copia e Cola).
- **Suporte**: Abertura e acompanhamento de chamados técnicos.
- **IA Assistente**: Chat inteligente para suporte e dúvidas.
- **Gestão Wi-Fi**: Visualização de dispositivos conectados (via GenieACS).
- **Notificações**: Alertas de faturas e avisos importantes via Firebase.

## ⚙️ Configuração de Ambiente

- Para rodar o app:
```bash
flutter run
```

### Android (Release)
Para gerar os arquivos de produção:
```bash
# Gerar APK
flutter build apk --release

# Gerar AAB (para Google Play)
flutter build appbundle --release
```

### iOS
Requer macOS e Xcode configurado.
```bash
flutter build ios --release
```

## 🏗 Estrutura de Pastas
- `lib/provider.dart`: Cérebro do app, gerencia login e dados globais.
- `lib/screens/`: Todas as telas divididas por funcionalidade.
- `lib/services/`: Conectores de API (SGP, AI, Telemetria).
