# Use uma imagem oficial do Python como base
FROM python:3.12-slim

# Evita que o Python gere arquivos .pyc e que o output seja buffereado
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências do sistema necessárias para psycopg2 e outras libs
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia o arquivo de requisitos e instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir psycopg2-binary gunicorn uvicorn dj-database-url whitenoise

# Copia o restante do código do projeto
COPY . .

# Cria os diretórios para arquivos estáticos e media
RUN mkdir -p staticfiles media

# Script de entrada para migrações e coleta de estáticos
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
