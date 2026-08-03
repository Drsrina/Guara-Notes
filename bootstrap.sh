#!/usr/bin/env bash
# =============================================================
#  Guará-Notes — Script de Bootstrap
#  Sobe a stack completa, roda migrations e baixa os modelos.
#
#  Uso:
#    ./bootstrap.sh            # CPU (padrão)
#    ./bootstrap.sh --gpu      # GPU NVIDIA
# =============================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROFILE="cpu"
if [[ "${1:-}" == "--gpu" ]]; then
  PROFILE="gpu"
  echo -e "${CYAN}🚀 Modo GPU ativado${NC}"
fi

echo -e "${CYAN}═══════════════════════════════════════${NC}"
echo -e "${CYAN}   Guará-Notes — Bootstrap             ${NC}"
echo -e "${CYAN}═══════════════════════════════════════${NC}"

# 1. Garantir que o .env existe
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}⚠️  .env não encontrado — copiando .env.example${NC}"
  cp .env.example .env
  echo -e "${YELLOW}   Edite o .env antes de usar em produção!${NC}"
fi

# 2. Sobe Postgres e Redis primeiro
echo -e "\n${GREEN}[1/5] Subindo Postgres e Redis...${NC}"
docker compose up -d postgres redis

echo -e "      Aguardando Postgres ficar saudável..."
until docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-guaranotes}" > /dev/null 2>&1; do
  sleep 2
done
echo -e "      ✅ Postgres pronto."

# 3. Sobe o Ollama
echo -e "\n${GREEN}[2/5] Subindo Ollama (profile: $PROFILE)...${NC}"
docker compose --profile "$PROFILE" up -d ollama
sleep 3

# 4. Pull dos modelos Ollama (nomic-embed-text e o LLM configurado)
EMBED_MODEL="${OLLAMA_MODEL_EMBED:-nomic-embed-text}"
CHAT_MODEL="${OLLAMA_MODEL_CHAT:-llama3.2:3b}"

echo -e "\n${GREEN}[3/5] Baixando modelos Ollama...${NC}"
echo -e "      Modelo de embedding: ${CYAN}${EMBED_MODEL}${NC}"
docker compose exec ollama ollama pull "$EMBED_MODEL" || \
  docker compose exec ollama-gpu ollama pull "$EMBED_MODEL" || true

echo -e "      Modelo de chat: ${CYAN}${CHAT_MODEL}${NC}"
docker compose exec ollama ollama pull "$CHAT_MODEL" || \
  docker compose exec ollama-gpu ollama pull "$CHAT_MODEL" || true

# 5. Sobe o backend para rodar as migrations (lifespan cria tabelas + seed admin)
echo -e "\n${GREEN}[4/5] Subindo backend e worker...${NC}"
docker compose --profile "$PROFILE" up -d backend worker

echo -e "      Aguardando backend ficar saudável..."
until docker compose exec -T backend curl -sf http://localhost:8000/health > /dev/null 2>&1; do
  sleep 3
done
echo -e "      ✅ Backend pronto."

# 6. Sobe o frontend
echo -e "\n${GREEN}[5/5] Subindo frontend...${NC}"
docker compose --profile "$PROFILE" up -d frontend

echo -e "\n${CYAN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Guará-Notes está rodando!${NC}"
echo -e ""
echo -e "   🌐 App:    ${CYAN}http://localhost:5757${NC}"
echo -e "   📡 API:    ${CYAN}http://localhost:5757/api${NC}"
echo -e "   📚 Docs:   ${CYAN}http://localhost:5757/api/docs${NC}"
echo -e ""
echo -e "   👤 Login inicial: ${YELLOW}admin${NC} / ${YELLOW}admin${NC}"
echo -e "   ${YELLOW}⚠️  Troque a senha do admin em produção!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════${NC}"
