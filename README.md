# 🐺 Guará-Notes

> **Ferramenta de escrita com IA e vetores para escritores e pesquisadores.**
> Self-hosted, privado, poderoso. Roda com Ollama local (CPU/GPU) ou APIs externas.

---

## ✨ Features

| Feature | Descrição |
|---|---|
| **Editor Markdown** | Editor com live preview, autosave em 2s e suporte a `[[wikilinks]]` |
| **Grafo de Conhecimento** | Visualização 2D das conexões entre notas (wikilinks + links semânticos) |
| **Cérebro Semântico 3D** | Visualização UMAP tridimensional do espaço vetorial das notas |
| **AI Companion (Guará)** | Chat com IA com 3 escopos de RAG: nota atual, pasta ou base completa |
| **Ghost Writer** | Geração de trechos com instrução em linguagem natural |
| **Embeddings Automáticos** | Pipeline Celery que vetoriza notas em background ao salvar |
| **Links Semânticos** | Worker que detecta notas semanticamente relacionadas via pgvector |
| **Pastas e Organização** | Hierarquia de pastas com drag-and-drop e múltiplos critérios de ordenação |
| **Multi-Provider IA** | Suporta Ollama (local, CPU/GPU), Gemini API e Anthropic Claude API |
| **Self-Hosted** | 100% privado, sem dados na nuvem — sua escrita fica só com você |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    Navegador (:5757)                    │
│  React + Zustand + MDEditor + Three.js + ForceGraph     │
└──────────────────────┬──────────────────────────────────┘
                       │ /api → Nginx proxy reverso
┌──────────────────────▼──────────────────────────────────┐
│              Backend FastAPI (:8000)                    │
│  Auth JWT  │  Notes CRUD  │  Graph  │  AI (RAG)        │
└──────┬──────────────┬───────────────────────────────────┘
       │              │
┌──────▼──────┐ ┌─────▼──────────────────────────────────┐
│  Postgres   │ │  Celery Worker                         │
│  + pgvector │ │  Embeddings → pgvector                 │
│  (vetores)  │ │  Links Semânticos → cosine distance    │
└─────────────┘ │  UMAP 3D coords                        │
                └─────────────┬──────────────────────────┘
┌───────────────┐             │
│  Redis        │◄────────────┘ (broker/result backend)
│  (AOF, :6379) │
└───────────────┘
┌───────────────┐
│  Ollama       │ ← modelos LLM + embeddings (local)
│  (:11434)     │   ou Gemini API / Claude API
└───────────────┘
```

---

## 🚀 Quick Start — Docker (Recomendado)

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/) v2.20+
- Para GPU NVIDIA: [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)

### 1. Clone e configure

```bash
git clone https://github.com/seuuser/guara-notes.git
cd guara-notes
cp .env.example .env
# Edite o .env conforme necessário (JWT_SECRET, AI_PROVIDER, etc.)
```

### 2. Bootstrap (CPU)

```bash
chmod +x bootstrap.sh
./bootstrap.sh
```

### 3. Bootstrap com GPU NVIDIA

```bash
./bootstrap.sh --gpu
```

O script irá:
1. Subir Postgres e Redis
2. Iniciar o Ollama e baixar os modelos configurados
3. Subir o backend (cria tabelas + seed do admin)
4. Subir o worker Celery
5. Subir o frontend

### 4. Acesse

| Serviço | URL |
|---|---|
| 🌐 App | http://localhost:**5757** |
| 📡 API Docs (Swagger) | http://localhost:5757/api/docs |
| 🐳 Ollama | http://localhost:11434 |

**Login inicial:** `admin` / `admin` *(troque a senha após o primeiro acesso!)*

---

## ⚙️ Configuração (.env)

```env
# Provider de IA: local | gemini | claude
AI_PROVIDER=local

# Modelo Ollama (para CPU leve use llama3.2:3b)
OLLAMA_MODEL_CHAT=llama3.2:3b
OLLAMA_MODEL_EMBED=nomic-embed-text

# APIs externas (somente se AI_PROVIDER != local)
GEMINI_API_KEY=
CLAUDE_API_KEY=

# Segurança — gere com: openssl rand -hex 32
JWT_SECRET=super_secret_jwt_key_please_change_in_production
```

### Escolhendo o modelo Ollama

| Situação | Modelo sugerido | VRAM / RAM |
|---|---|---|
| CPU (qualquer máquina) | `llama3.2:3b` | ~4GB RAM |
| GPU moderada (8GB VRAM) | `llama3.1:8b` | ~6GB VRAM |
| GPU alta (24GB+ VRAM) | `llama3.1:70b` | ~40GB VRAM |
| Embeddings | `nomic-embed-text` | ~400MB |

---

## 🛠️ Desenvolvimento Local (sem Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure o .env com DATABASE_URL e REDIS_URL apontando para localhost
alembic upgrade head

uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Worker Celery

```bash
# Com o venv ativo e Redis rodando
celery -A backend.worker.celery_app worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Abre em http://localhost:5757
# Proxy /api → backend:8000 já configurado no vite.config.ts
```

---

## 🧠 Como funciona a IA

### Pipeline de Embeddings (automático)

1. Você salva/edita uma nota
2. O backend enfileira `generate_embeddings` no Celery via Redis
3. O worker chama Ollama (`nomic-embed-text`) e salva o vetor (1536 dims) no Postgres via **pgvector**
4. Em seguida, busca as `k` notas mais próximas por distância cosseno e cria `note_links` do tipo `semantic`
5. Por fim, roda UMAP para calcular as coordenadas 3D e salva `umap_x/y/z` na nota

### RAG no Chat

O **Guará AI** injeta contexto das suas notas antes de responder:

- **Escopo "Nota atual"** → conteúdo integral da nota aberta
- **Escopo "Pasta"** → top-K notas da pasta por similaridade semântica
- **Escopo "Base completa"** → top-K notas de toda a base por similaridade

### Wikilinks

Ao salvar uma nota com `[[Título de Outra Nota]]`, o sistema automaticamente cria um `note_link` do tipo `wikilink` entre as duas notas — alimentando o grafo de conhecimento.

---

## 📦 Stack Técnica

| Camada | Tecnologias |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Zustand, Tailwind CSS |
| **Editor** | @uiw/react-md-editor (Markdown + live preview) |
| **Visualização** | Three.js (@react-three/fiber), react-force-graph-2d |
| **Backend** | FastAPI, SQLAlchemy (async), Pydantic v2 |
| **Banco** | PostgreSQL 16 + pgvector (similaridade vetorial) |
| **Queue** | Celery + Redis (AOF) |
| **IA Local** | Ollama (llama3.x, nomic-embed-text) |
| **IA Cloud** | Google Gemini API, Anthropic Claude API |
| **Vetores** | UMAP-learn, NumPy, pgvector |
| **Deploy** | Docker Compose, Nginx (SPA + proxy reverso) |

---

## 🗂️ Estrutura do Projeto

```
guara-notes/
├── backend/
│   ├── main.py          # FastAPI app + lifespan + CORS
│   ├── models.py        # SQLAlchemy models (Note, Folder, NoteLink, AI*)
│   ├── schemas.py       # Pydantic schemas
│   ├── database.py      # Conexão async PostgreSQL
│   ├── auth.py          # JWT + bcrypt
│   ├── worker.py        # Celery app config
│   ├── tasks.py         # Embeddings + links semânticos + UMAP
│   ├── requirements.txt
│   ├── Dockerfile
│   └── routers/
│       ├── auth.py      # Login, register, /me
│       ├── notes.py     # CRUD + wikilinks + enqueue embedding
│       ├── folders.py   # CRUD de pastas
│       ├── graph.py     # Grafo 2D + Brain 3D (UMAP coords)
│       └── ai.py        # Chat RAG + Ghost Writer + sessões
├── frontend/
│   ├── src/
│   │   ├── api/         # Clients axios tipados
│   │   ├── components/  # Editor, Sidebar, AIChat, Graph2D, Brain3D
│   │   ├── pages/       # LoginPage
│   │   └── store/       # Zustand (auth + app state)
│   ├── nginx.conf       # SPA + proxy reverso
│   ├── vite.config.ts   # Dev server :5757 + proxy /api
│   └── Dockerfile       # Multi-stage (Node build + Nginx serve)
├── docker-compose.yml   # Stack completa (CPU + GPU opcional)
├── bootstrap.sh         # Setup automático com pull de modelos
├── .env.example         # Template documentado
└── README.md
```

---

## 🔐 Segurança

- Autenticação JWT (Bearer token)
- Senhas com bcrypt hash
- Todas as queries de notas filtradas por `user_id` (isolamento multi-user)
- Links do grafo validados por JOIN SQL (sem leak entre usuários)
- CORS configurável via `CORS_ORIGINS`

---

## 🤝 Contribuindo

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit: `git commit -m 'feat: descrição'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

MIT — veja [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  Feito com ❤️ para escritores que levam a sério seus pensamentos.
  <br>
  <strong>🐺 Guará-Notes</strong> — Escreva. Conecte. Descubra.
</div>
