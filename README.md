# NIOCHAT SERVIÇOS TECNOLÓGICOS

Bem-vindo ao sistema de administração e gestão da **NIOCHAT SERVIÇOS TECNOLÓGICOS**. Este sistema foi desenvolvido para gerenciar provedores, usuários de aplicativos, notificações e integrações de forma centralizada e eficiente.

## 📋 Sobre o Sistema

O **NIOCHAT ADMIN** é uma plataforma web desenvolvida em Django que serve como painel de controle para:

*   **Gestão de Provedores (ISPs)**: Cadastro, edição, bloqueio e desbloqueio de provedores parceiros.
*   **Gestão de Usuários do App**: Monitoramento e gerenciamento da base de usuários finais do aplicativo de chat.
*   **Comunicação**: Envio de notificações Push (via Firebase) e criação de Avisos In-App (pop-ups) para os usuários.
*   **Personalização**: Configuração de aparência do aplicativo (cores, logos, abas) por provedor.
*   **Integrações**: Módulos para conexão com sistemas externos (ex: SGP).

## 🚀 Como Rodar o Sistema

Siga os passos abaixo para configurar e executar o ambiente de desenvolvimento.

### 1. Pré-requisitos

Certifique-se de ter instalado em sua máquina:
*   [Python](https://www.python.org/) (versão 3.8 ou superior)
*   `pip` (gerenciador de pacotes do Python)

### 2. Instalação das Dependências

Na raiz do projeto (`c:\niochat_admin`), execute o comando para instalar as bibliotecas necessárias:

```bash
pip install -r requirements.txt
```

### 3. Configuração do Banco de Dados

O sistema utiliza banco de dados para armazenar todas as informações. Execute as migrações para criar as tabelas necessárias:

```bash
python manage.py migrate
```

### 4. Criando um Superusuário (Admin)

Para ter acesso total ao sistema (incluindo o painel de Super Admin), você precisa criar um usuário administrador:

```bash
python manage.py createsuperuser
```
Você será solicitado a informar:
*   **Username**: Nome de usuário (ex: admin)
*   **Email address**: E-mail (pode deixar em branco)
*   **Password**: Senha segura
*   **Password (again)**: Confirmação da senha

### 5. Iniciando o Servidor (Modo Desenvolvimento)

Para rodar o sistema localmente:

```bash
python manage.py runserver
```

Após iniciar, acesse no seu navegador:
*   **URL do Sistema**: [http://127.0.0.1:8000](http://127.0.0.1:8000)

## 🔑 Acessando o Sistema

1.  Acesse `http://127.0.0.1:8000/login/`.
2.  Entre com as credenciais do **Superusuário** criado no passo 4.
3.  Você será redirecionado para o Dashboard.

## 📱 Servidor de Webhook (Recursos Adicionais)

O projeto também inclui um servidor para webhooks (focado em notificações e integrações em tempo real), localizado em `webhook_server.py`. Ele utiliza FastAPI.

Para rodá-lo:
```bash
python webhook_server.py
```
*Nota: Verifique as configurações de credenciais do Firebase dentro do arquivo antes de rodar em produção.*

---
© 2024 NIOCHAT SERVIÇOS TECNOLÓGICOS. Todos os direitos reservados.
