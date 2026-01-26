# Como Iniciar o App com o Backend

## Backend está rodando! ✅

O servidor Django está ativo em `0.0.0.0:8000`

## Passo a Passo para Rodar o App

### 1. Configure a URL da API

No PowerShell, defina a variável de ambiente com o IP do servidor:

```powershell
# Use o IP do roteador (recomendado):
$env:EXPO_PUBLIC_DEV_API_URL="http://100.64.38.78:8000/api/"

# OU use o IP do bloco:
$env:EXPO_PUBLIC_DEV_API_URL="http://72.14.201.202:8000/api/"

# OU use localhost se estiver no mesmo PC:
$env:EXPO_PUBLIC_DEV_API_URL="http://localhost:8000/api/"
```

### 2. Navegue até a pasta do app

```powershell
cd e:\app\react_native_space\react_native_space
```

### 3. Inicie o servidor Expo

```powershell
npm run start:lan
```

### 4. Conecte o app

- **Expo Go**: Escaneie o QR code exibido no terminal
- **Development Build**: O app deve conectar automaticamente

## Verificar se está funcionando

Após iniciar o app, você deve ver:
- Tela de login carregando
- Sem erros de conexão
- API respondendo corretamente

## Troubleshooting

### Erro: "Network request failed"
- Verifique se o backend está rodando: `netstat -an | findstr :8000`
- Verifique se o IP está correto na variável de ambiente
- Teste no navegador: `http://100.64.38.78:8000/api/public/config/?provider_token=seu_token`

### Erro: "Connection refused"
- O Django pode não estar escutando no IP correto
- Verifique se está usando `0.0.0.0:8000` e não `127.0.0.1:8000`

### Erro: "Timeout"
- Pode haver firewall bloqueando
- Verifique se a porta 8000 está aberta no firewall do Windows
