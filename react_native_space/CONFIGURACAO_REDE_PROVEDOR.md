# Configuração de Rede para Acesso do Provedor

## Situação
Você está na mesma rede do provedor, mas não no mesmo Wi-Fi. Isso significa que você está em uma sub-rede diferente, mas ainda dentro da infraestrutura do provedor.

## IPs Configurados

1. **72.14.201.202** - IP do bloco do provedor (pode ser público ou privado da rede do provedor)
2. **100.64.38.78** - IP do roteador (CGNAT - Carrier-Grade NAT)

## Como Funcionar

### Opção 1: Usar IP do Roteador (100.64.38.78) - RECOMENDADO

Se o servidor Django está rodando no roteador ou em um dispositivo acessível por esse IP:

```bash
# No terminal, antes de rodar o app:
set EXPO_PUBLIC_DEV_API_URL=http://100.64.38.78:8000/api/

# Depois rode o app:
npm run start:lan
```

### Opção 2: Usar IP do Bloco (72.14.201.202)

Se o servidor está acessível por esse IP:

```bash
set EXPO_PUBLIC_DEV_API_URL=http://72.14.201.202:8000/api/
npm run start:lan
```

### Opção 3: Descobrir o IP Correto do Servidor

1. **No servidor onde o Django está rodando**, execute:
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   ```

2. Procure pelo IP que está na mesma faixa de rede (ex: 100.64.x.x ou 72.14.x.x)

3. Use esse IP na variável de ambiente

## Verificações Necessárias

### 1. Backend Django está rodando?
```bash
# No servidor, verifique se está rodando na porta 8000:
netstat -an | findstr :8000
```

### 2. Firewall está bloqueando?
- Verifique se a porta 8000 está aberta no firewall do Windows
- Verifique se o roteador permite comunicação entre sub-redes

### 3. Django está escutando no IP correto?
```bash
# O Django deve estar rodando assim:
python manage.py runserver 0.0.0.0:8000
# OU
python manage.py runserver 100.64.38.78:8000
```

**NÃO use:**
```bash
python manage.py runserver 127.0.0.1:8000  # Só funciona localmente
python manage.py runserver localhost:8000   # Só funciona localmente
```

## Teste de Conectividade

Antes de rodar o app, teste se consegue acessar o backend:

```bash
# No PowerShell, teste a conexão:
Test-NetConnection -ComputerName 100.64.38.78 -Port 8000

# Ou teste via curl:
curl http://100.64.38.78:8000/api/public/config/?provider_token=seu_token
```

## Configuração no App

O app já está configurado para aceitar esses IPs. Você só precisa:

1. **Definir a variável de ambiente** com o IP correto
2. **Rodar o app** normalmente

## Exemplo Completo

```powershell
# 1. Defina o IP do servidor
$env:EXPO_PUBLIC_DEV_API_URL="http://100.64.38.78:8000/api/"

# 2. Navegue até a pasta do app
cd e:\app\react_native_space\react_native_space

# 3. Inicie o servidor Expo
npm run start:lan

# 4. No app, escaneie o QR code ou use a URL exp://...
```

## Troubleshooting

### Erro: "Network request failed"
- Verifique se o backend está rodando
- Verifique se o IP está correto
- Verifique se não há firewall bloqueando

### Erro: "Connection refused"
- O Django não está escutando nesse IP
- Use `0.0.0.0:8000` ao iniciar o Django

### Erro: "Timeout"
- Pode haver roteamento bloqueado entre sub-redes
- Verifique com o administrador da rede do provedor

## Nota Importante

Se você está em uma sub-rede diferente, pode ser necessário:
1. Configurar roteamento no roteador
2. Abrir portas no firewall
3. Usar um IP público se disponível
