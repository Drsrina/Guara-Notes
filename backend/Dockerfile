FROM python:3.12-slim

WORKDIR /app

# Instala dependências de sistema para psycopg2 e umap
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expõe porta padrão do uvicorn
EXPOSE 8000
