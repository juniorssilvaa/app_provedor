FROM python:3.9-slim

WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copiar arquivos de dependência
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fonte
COPY webhook_server.py .
COPY templates/ templates/
# COPY firebase-credentials.json . # Opcional: Melhor injetar via volume ou variável de ambiente

# Expor porta
EXPOSE 8000

# Comando de inicialização
CMD ["uvicorn", "webhook_server:app", "--host", "0.0.0.0", "--port", "8000"]
