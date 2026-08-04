FROM python:3.12-slim

WORKDIR /app

# Instala dependências de sistema para psycopg2 e umap
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código como subpacote /app/backend/ para que
# 'uvicorn backend.main:app' e 'celery -A backend.worker' resolvam corretamente
COPY . ./backend/

# Expõe porta padrão do uvicorn
EXPOSE 8000
