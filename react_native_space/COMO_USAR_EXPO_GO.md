# Como Usar o Expo Go com Ngrok

## Entendendo as URLs

1. **URL do Ngrok** (Backend Django): `https://3fcc7c8f4f27.ngrok-free.app/api/`
   - Esta URL é para o app se conectar ao backend
   - NÃO é para colocar no Expo Go diretamente

2. **URL do Expo** (Servidor Metro): `exp://<SEU_IP>:8081`
   - Esta URL é para o Expo Go se conectar ao servidor de desenvolvimento
   - Esta é a URL que você escaneia ou digita no Expo Go

## Passo a Passo

### 1. Configure o app para usar a URL do ngrok

No PowerShell, antes de iniciar o Expo:

```powershell
# Configure a variável de ambiente com a URL do ngrok
$env:EXPO_PUBLIC_DEV_API_URL="https://3fcc7c8f4f27.ngrok-free.app/api/"

# Navegue até a pasta do app
cd e:\app\react_native_space\react_native_space
```

### 2. Inicie o servidor Expo

```powershell
npm run start:lan
```

Ou:

```powershell
npx expo start --lan
```

### 3. No Expo Go

Você verá algo assim no terminal:

```
Metro waiting on exp://192.168.1.100:8081
Scan the QR code above with Expo Go
```

**Opções:**

#### Opção A: Escanear QR Code (Mais Fácil)
- Abra o Expo Go no celular
- Toque em "Scan QR Code"
- Escaneie o QR code exibido no terminal

#### Opção B: Digitar URL Manualmente
- No Expo Go, toque em "Enter URL manually"
- Digite: `exp://192.168.1.100:8081` (substitua pelo IP do seu PC)

### 4. Descobrir o IP do seu PC

Se precisar do IP para digitar manualmente:

```powershell
ipconfig | findstr IPv4
```

Você verá algo como:
```
IPv4 Address. . . . . . . . . . . : 192.168.1.100
```

Use esse IP na URL: `exp://192.168.1.100:8081`

## Resumo

- **URL do Ngrok**: Configure via variável de ambiente `EXPO_PUBLIC_DEV_API_URL`
- **URL do Expo Go**: Use o QR code ou `exp://<IP_DO_PC>:8081`

## Exemplo Completo

```powershell
# 1. Configure o backend URL (ngrok)
$env:EXPO_PUBLIC_DEV_API_URL="https://3fcc7c8f4f27.ngrok-free.app/api/"

# 2. Vá para a pasta do app
cd e:\app\react_native_space\react_native_space

# 3. Inicie o Expo
npm run start:lan

# 4. No Expo Go, escaneie o QR code que aparece no terminal
```

## Troubleshooting

### Expo Go não conecta
- Certifique-se que o celular está na mesma rede Wi-Fi
- Verifique se a porta 8081 não está bloqueada pelo firewall
- Tente usar `--tunnel` se estiver em redes diferentes:
  ```powershell
  npx expo start --tunnel
  ```

### App não conecta ao backend
- Verifique se a variável `EXPO_PUBLIC_DEV_API_URL` está configurada
- Verifique se o ngrok ainda está rodando
- Teste a URL do ngrok no navegador primeiro
