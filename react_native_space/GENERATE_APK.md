# Guia para Gerar APK e AAB para NANET

## Configurações Atualizadas

- **Provider ID**: 1
- **Token**: sk_live_ (consulte o arquivo config/index.ts)
- **Nome**: NANET
- **Package**: com.nanet.telecom
- **API URL**: https://apis.niochat.com.br/api/

## Passo 1: Criar Keystore para Produção

Execute o comando abaixo para gerar o keystore de produção:

```bash
cd react_native_space/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore nanet-release.keystore -alias nanet-key -keyalg RSA -keysize 2048 -validity 10000
```

**Informações solicitadas:**
- Password do keystore: (escolha uma senha segura e anote)
- Password da key: (pode ser a mesma do keystore)
- Nome completo: NANET Telecom
- Unidade organizacional: NANET
- Organização: NANET Telecom
- Cidade: (sua cidade)
- Estado: (seu estado)
- Código do país: BR

## Passo 2: Configurar gradle.properties

Adicione as seguintes linhas no arquivo `android/gradle.properties`:

```
NANET_UPLOAD_STORE_FILE=nanet-release.keystore
NANET_UPLOAD_KEY_ALIAS=nanet-key
NANET_UPLOAD_STORE_PASSWORD=sua_senha_aqui
NANET_UPLOAD_KEY_PASSWORD=sua_senha_aqui
```

⚠️ **IMPORTANTE**: O arquivo `gradle.properties` NÃO deve ser commitado no Git! Adicione ao `.gitignore`.

## Passo 3: Atualizar build.gradle

O arquivo `android/app/build.gradle` já está configurado para usar o keystore de debug. Para produção, você precisa adicionar a configuração de release.

Adicione no `signingConfigs`:

```gradle
release {
    if (project.hasProperty('NANET_UPLOAD_STORE_FILE')) {
        storeFile file(NANET_UPLOAD_STORE_FILE)
        storePassword NANET_UPLOAD_STORE_PASSWORD
        keyAlias NANET_UPLOAD_KEY_ALIAS
        keyPassword NANET_UPLOAD_KEY_PASSWORD
    }
}
```

E atualize o `buildTypes.release`:

```gradle
release {
    signingConfig signingConfigs.release
    // ... resto da configuração
}
```

## Passo 4: Gerar APK

### Opção A: Usando EAS Build (Recomendado)

```bash
cd react_native_space
npx eas-cli build --platform android --profile production
```

### Opção B: Build Local

```bash
cd react_native_space/android
./gradlew assembleRelease
```

O APK estará em: `android/app/build/outputs/apk/release/app-release.apk`

## Passo 5: Gerar AAB para Google Play

### Opção A: Usando EAS Build (Recomendado)

```bash
cd react_native_space
npx eas-cli build --platform android --profile production-aab
```

### Opção B: Build Local

```bash
cd react_native_space/android
./gradlew bundleRelease
```

O AAB estará em: `android/app/build/outputs/bundle/release/app-release.aab`

## Passo 6: Preparar para Google Play

### Arquivos Necessários:

1. **AAB (Android App Bundle)**: `app-release.aab`
2. **Ícone**: `assets/icon.png` (512x512px)
3. **Screenshots**: Prepare screenshots do app
4. **Descrição**: Prepare descrição do app em português
5. **Política de Privacidade**: URL da política de privacidade

### Informações do App:

- **Nome**: NANET
- **Package Name**: com.nanet.telecom
- **Versão**: 1.0.0
- **Version Code**: 1

### Checklist Google Play:

- [ ] AAB assinado gerado
- [ ] Ícone do app (512x512px)
- [ ] Screenshots (mínimo 2, recomendado 4-8)
- [ ] Descrição curta (até 80 caracteres)
- [ ] Descrição completa (até 4000 caracteres)
- [ ] Categoria do app
- [ ] Classificação de conteúdo
- [ ] Política de privacidade (URL)
- [ ] Contato do desenvolvedor
- [ ] Conta Google Play Console criada

## Notas Importantes

1. **Keystore**: Guarde o arquivo `nanet-release.keystore` e as senhas em local seguro. Você precisará deles para todas as atualizações futuras.

2. **Version Code**: A cada nova versão na Google Play, incremente o `versionCode` no `build.gradle`.

3. **Version Name**: Atualize o `versionName` no `build.gradle` para cada release (ex: 1.0.1, 1.0.2, etc).

4. **Testes**: Sempre teste o APK antes de fazer upload na Google Play.
