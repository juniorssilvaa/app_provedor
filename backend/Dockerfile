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
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir psycopg2-binary gunicorn uvicorn dj-database-url whitenoise

# Copia o restante do código do projeto
COPY backend/ .

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

echo ">>> REPARANDO HISTÓRICO DE MIGRAÇÕES (MODO ROBUSTO)..."
# Injeta TODAS as migrações padrão do Django auth e contenttypes que estejam faltando.
# Isso resolve o InconsistentMigrationHistory sem apagar dados, permitindo que o Django inicie.
psql "$DATABASE_URL" << 'SQLEOF'
INSERT INTO django_migrations (app, name, applied)
SELECT app, name, now() FROM (
  SELECT 'contenttypes' AS app, '0001_initial' AS name UNION ALL
  SELECT 'contenttypes', '0002_remove_content_type_name' UNION ALL
  SELECT 'auth', '0001_initial' UNION ALL
  SELECT 'auth', '0002_alter_permission_name_max_length' UNION ALL
  SELECT 'auth', '0003_alter_user_email_max_length' UNION ALL
  SELECT 'auth', '0004_alter_user_username_opts' UNION ALL
  SELECT 'auth', '0005_alter_user_last_login_null' UNION ALL
  SELECT 'auth', '0006_require_contenttypes_0002' UNION ALL
  SELECT 'auth', '0007_alter_validators_add_error_messages' UNION ALL
  SELECT 'auth', '0008_alter_user_username_max_length' UNION ALL
  SELECT 'auth', '0009_alter_user_last_name_max_length' UNION ALL
  SELECT 'auth', '0010_alter_group_name_max_length' UNION ALL
  SELECT 'auth', '0011_update_proxy_permissions' UNION ALL
  SELECT 'auth', '0012_alter_user_first_name_max_length'
) AS t(app, name)
WHERE NOT EXISTS (
  SELECT 1 FROM django_migrations dm WHERE dm.app = t.app AND dm.name = t.name
);
SQLEOF
echo ">>> SINCRONIZAÇÃO CONCLUÍDA."

echo "Running migrations..."
python manage.py migrate --fake-initial --noinput

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
