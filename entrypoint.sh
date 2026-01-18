#!/bin/bash

# Espera o banco de dados estar pronto se necessário (opcional com healthcheck no docker-compose)
echo "Aplicando migrações do banco de dados..."
python manage.py migrate --noinput

echo "Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

# Executa o comando passado para o container (gunicorn, uvicorn, etc)
exec "$@"
