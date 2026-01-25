# Checklist de Preparação para Produção - NANET

## ✅ Configurações Verificadas

### 1. Configuração do App (app.json)
- ✅ Nome: NANET
- ✅ Package: com.nanet.telecom
- ✅ Versão: 1.0.0
- ✅ Version Code: 1
- ✅ Google Services configurado

### 2. Configuração da API (src/config/index.ts)
- ✅ URL de produção: `https://apis.niochat.com.br/api/`
- ✅ Usa `__DEV__` para alternar entre dev/prod automaticamente
- ✅ Token de API configurado
- ✅ Número de WhatsApp do provedor configurado

### 3. Build Configuration
- ✅ EAS Build configurado (eas.json)
- ✅ Android build.gradle configurado com signing
- ✅ ProGuard configurado para otimização

## 📋 Checklist Antes do Build

### Antes de Fazer o Build de Produção:

1. **Verificar Versão**
   - [ ] Atualizar `version` em `app.json` se necessário
   - [ ] Atualizar `versionCode` em `app.json` e `build.gradle` (incrementar para cada release)
   - [ ] Verificar `versionName` em `build.gradle`

2. **Verificar Configurações de Ambiente**
   - [ ] Confirmar que `__DEV__` está `false` em produção (automático)
   - [ ] Verificar que API URL aponta para produção
   - [ ] Confirmar token de API está correto

3. **Keystore de Assinatura (Android)**
   - [ ] Verificar se keystore de produção existe
   - [ ] Configurar variáveis de ambiente:
     - `NANET_UPLOAD_STORE_FILE` - caminho do keystore
     - `NANET_UPLOAD_STORE_PASSWORD` - senha do keystore
     - `NANET_UPLOAD_KEY_ALIAS` - alias da chave
     - `NANET_UPLOAD_KEY_PASSWORD` - senha da chave

4. **Google Services**
   - [ ] Verificar se `google-services.json` está atualizado
   - [ ] Confirmar que Firebase está configurado corretamente

5. **Assets e Recursos**
   - [ ] Verificar se ícone do app está correto (`assets/icon.png`)
   - [ ] Verificar splash screen (`assets/logo_home.png`)
   - [ ] Confirmar que todos os assets necessários estão presentes

## 🚀 Comandos de Build

### Build Local (APK)
```bash
# Build APK de produção localmente
cd android
./gradlew assembleRelease
# O APK estará em: android/app/build/outputs/apk/release/app-release.apk
```

### Build com EAS (Recomendado)
```bash
# Build de produção (AAB para Google Play)
eas build --platform android --profile production

# Build de preview (APK para testes)
eas build --platform android --profile preview
```

### Build Local com Expo
```bash
# Gerar AAB
npx expo build:android -t app-bundle

# Gerar APK
npx expo build:android -t apk
```

## 📝 Notas Importantes

### Console Logs
- Os `console.log` estão presentes no código, mas o Metro bundler remove automaticamente em builds de produção
- Para logs críticos, use `console.error` (sempre mantido) ou o utilitário `logger` em `src/utils/logger.ts`

### Variáveis de Ambiente
- O app usa `__DEV__` do React Native para detectar ambiente
- URLs de API alternam automaticamente entre dev/prod baseado em `__DEV__`
- Não é necessário arquivo `.env` para produção (configuração está em `src/config/index.ts`)

### Otimizações
- ✅ ProGuard habilitado para minificação
- ✅ Hermes habilitado para melhor performance
- ✅ Bundle compression habilitado
- ✅ PNG crunch habilitado em release

## 🔐 Segurança

- ✅ Token de API está no código (necessário para identificação do provedor)
- ✅ Keystore de produção deve ser mantido seguro
- ✅ Não commitar keystore no repositório
- ✅ Usar variáveis de ambiente para credenciais de build

## 📱 Testes Antes de Publicar

1. [ ] Testar login/logout
2. [ ] Testar todas as telas principais
3. [ ] Testar integração com WhatsApp
4. [ ] Testar notificações push
5. [ ] Testar em diferentes tamanhos de tela
6. [ ] Testar em modo offline
7. [ ] Verificar performance e uso de memória

## 🎯 Próximos Passos

1. Incrementar `versionCode` para cada nova release
2. Atualizar `version` quando houver mudanças significativas
3. Testar build de produção antes de publicar
4. Fazer upload para Google Play Console
5. Configurar release notes na Google Play
