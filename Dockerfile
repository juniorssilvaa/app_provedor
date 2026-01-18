# Use uma imagem oficial do Python como base
FROM python:3.12-slim

# Evita que o Python gere arquivos .pyc e que o output seja buffereado
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    postgresql-client \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copia o arquivo de requisitos e instala as dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir psycopg2-binary gunicorn uvicorn dj-database-url whitenoise

# Copia o restante do código do projeto
COPY . .

# Cria os diretórios para arquivos estáticos e media
RUN mkdir -p staticfiles media

# ============================================
# Create ENTRYPOINT script
# ============================================
RUN cat << 'EOF' > /app/entrypoint.sh
#!/bin/bash
set -e

echo "Starting App Provedor Backend..."

# Extrair host e porta para o teste de conexão
if [ -n "$DATABASE_URL" ]; then
    # Suporte a postgresql://user:pass@host:port/db
    DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|/.*||' -e 's|:.*||')
    DB_PORT=$(echo $DATABASE_URL | sed -e 's|.*:||' -e 's|/.*||')
    [[ ! "$DB_PORT" =~ ^[0-9]+$ ]] && DB_PORT=5432
else
    DB_HOST="postgres"
    DB_PORT=5432
fi

echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

until nc -z -v -w3 "$DB_HOST" "$DB_PORT"; do
  echo "⏳ PostgreSQL ainda não disponível... aguardando 1s"
  sleep 1
done

echo "✅ PostgreSQL disponível!"

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Launching server..."
exec "$@"
EOF

RUN chmod +x /app/entrypoint.sh

# Expose port
EXPOSE 8000

# Use entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]

# Default command
CMD ["gunicorn", "niochat.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
