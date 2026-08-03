IDENTIDADE DO PRODUTO
Guará-Notes (GN) — sistema de anotações e escrita pessoal em Markdown, com base de conhecimento conectada por grafo semântico (2D e 3D navegável) e um companion de IA para escrita. Visual: dark mode, glassmorphism, acentos em laranja neon (referência ao lobo-guará). Mobile-first e desktop.

ARQUITETURA GERAL (Docker Compose, tudo self-hosted na VPS)
Serviços:

frontend — React + TypeScript + Vite + Tailwind CSS. SPA servida via Nginx.
backend — API REST (Node.js + Fastify/Express, ou Python + FastAPI — escolher o que o Antigravity avaliar como mais performático para essa combinação). Responsável por: auth, CRUD de notas/pastas, orquestração de embeddings, proxy para o companion de IA, cálculo de similaridade/grafo.
worker — processo separado (BullMQ se backend em Node, ou Celery/RQ se Python) que consome fila do Redis para gerar embeddings de forma assíncrona (não bloqueante) sempre que uma nota é salva/editada.
postgres — Postgres 16 com extensão pgvector habilitada. Fonte única de verdade dos dados.
redis — usado para: (a) fila de jobs do worker de embeddings, (b) cache de resultados de similaridade/queries pesadas, (c) armazenamento de sessão (se optarmos por sessão server-side em vez de puro JWT).
ollama — serve os modelos locais:
Modelo de embeddings local (ex: nomic-embed-text ou mxbai-embed-large) — usado pelo worker para vetorizar as notas, 100% local, sem depender de API externa.
Modelo de linguagem local (ex: llama3.1:8b ou similar, o que couber no hardware da VPS) para o companion de IA — com fallback opcional configurável para API externa (Gemini/Claude) caso o usuário prefira qualidade maior em troca de custo de API.
reverse-proxy — Nginx ou Traefik na frente de tudo, com HTTPS (Let's Encrypt/Certbot).
Toda a stack sobe com docker-compose up, com .env centralizando credenciais e toggles (ex: AI_PROVIDER=local|gemini|claude).

MODELO DE DADOS (Postgres + pgvector)
-- users
id (uuid, pk), username (unique), password_hash, display_name, avatar_url, bio,
theme_prefs (jsonb), created_at, updated_at

-- folders
id (uuid, pk), user_id (fk), name, parent_folder_id (fk nullable), order_index

-- notes
id (uuid, pk), user_id (fk), folder_id (fk nullable), title, content (text, markdown puro),
embedding (vector(dim)), created_at, updated_at, tags (text[])

-- note_links
id (pk), source_note_id (fk), target_note_id (fk), link_type (enum: 'wikilink' | 'semantic'),
weight (float, usado no grafo de forças)

-- ai_chat_sessions
id (pk), user_id (fk), scope (enum: 'note' | 'folder' | 'database'), scope_ref_id (nullable),
created_at

-- ai_chat_messages
id (pk), session_id (fk), role (enum: 'user' | 'assistant'), content, created_at
Índice vetorial: CREATE INDEX ON notes USING ivfflat (embedding vector_cosine_ops); para buscas de similaridade rápidas mesmo com a base crescendo.

FLUXO DE EMBEDDINGS
Usuário edita nota → frontend faz debounce (~2s) → chama PUT /notes/:id.
Backend salva o conteúdo no Postgres e enfileira um job no Redis (embed:noteId).
worker consome o job, chama o Ollama (modelo de embeddings local) via API HTTP interna, recebe o vetor, faz UPDATE notes SET embedding = ....
Parsing de [[wikilinks]] roda no backend ao salvar, populando note_links com link_type='wikilink'.
Um job periódico (ou disparado após novo embedding) recalcula note_links do tipo semantic comparando o novo vetor contra os demais via pgvector (<=> cosine distance), guardando as N conexões mais fortes acima de um threshold.
Isso mantém a UI sempre responsiva — nada de embedding bloqueando a digitação.

GRAFO 2D E CÉREBRO 3D
Grafo 2D: frontend consome GET /graph (nós + arestas com pesos de note_links), renderiza com react-force-graph (força e distância proporcionais ao weight).
Cérebro 3D: como agora temos backend real, calcular a redução dimensional no servidor (Python/worker) usando UMAP de verdade (mais fiel que PCA) sobre os embeddings, expor via GET /brain3d (coordenadas x,y,z pré-calculadas, recalculadas em background quando a base muda significativamente, com cache em Redis). Frontend só renderiza com react-three-fiber, sem processar matemática pesada no client.
AUTENTICAÇÃO
Agora com backend real, implementar auth de verdade:

POST /auth/login, POST /auth/register (registro pode ficar desabilitado/admin-only na v1).
Senha com hash (bcrypt/argon2), sessão via JWT (access + refresh token) ou sessão server-side no Redis — escolher o que for mais simples de manter no Antigravity.
Seed inicial: ao subir a stack pela primeira vez, criar automaticamente um usuário admin com senha admin (via script de migration/seed), para permitir o primeiro acesso. Deixar aviso na tela de login/README para trocar a senha padrão em produção.
Página de edição de perfil (nome, avatar, bio, preferências) via PUT /users/me.
COMPANION DE IA
Endpoint POST /ai/chat, com scope: 'note' | 'folder' | 'database':

Foco na Nota: injeta o conteúdo integral da nota atual no prompt.
Foco na Pasta: RAG — busca via pgvector as notas mais relevantes da pasta (top-k) e injeta os trechos.
Foco no Banco: RAG sobre toda a base do usuário — busca top-k globais por similaridade de cosseno via pgvector antes de montar o prompt (nunca manda a base inteira).
Provider configurável (AI_PROVIDER no .env):

local: chama o modelo do Ollama.
gemini/claude: chama a API externa correspondente, mesma interface interna.
Modo Ghost Writer: endpoint gera um trecho/rascunho a partir de instrução do usuário, retornado como sugestão editável (não sobrescreve automaticamente a nota).

LAYOUT E UI (igual ao protótipo, agora com dados reais)
Menu lateral esquerdo (fixo, colapsável)
Nova Nota, Nova Pasta, Ordenar (nome/criação/edição), árvore navegável com drag-and-drop.
Painéis centrais (estilo VS Code)
Divisíveis horizontal/verticalmente, redimensionáveis, abas arrastáveis entre painéis.
Menu "⋮" por painel: baixar .md, baixar .pdf, trocar tipo de conteúdo (Editor | Grafo 2D | Cérebro 3D | Chat IA), Modo Escritor (tela cheia, foco na linha central).
Editor
Markdown com preview ao vivo, parsing de [[wikilinks]], autosave com debounce.
DESIGN VISUAL
Dark mode como padrão.
Glassmorphism: backdrop-blur, fundos semi-transparentes, bordas com brilho sutil.
Acento neon laranja (#FF6B1A–#FF8C42) em botões primários, elementos ativos, nós selecionados no grafo/cérebro 3D.
Responsivo: sidebar vira drawer no mobile, painéis empilham verticalmente, gestos touch funcionais no grafo 2D e no cérebro 3D.
DEPLOY
docker-compose.yml com todos os serviços acima, .env.example documentado.
Volumes persistentes para postgres, redis (se AOF/RDB) e ollama (modelos baixados).
Script de bootstrap: sobe stack, roda migrations, roda seed do usuário admin, baixa os modelos necessários no Ollama automaticamente no primeiro start.
README com instruções de deploy na VPS (Oracle Cloud Free Tier, conforme já uso hoje) e como trocar AI_PROVIDER entre local e APIs externas.
ESCOPO DESTA VERSÃO
Incluir: auth completa (com seed admin/admin), CRUD de notas/pastas, embeddings locais via Ollama, grafo 2D, cérebro 3D (UMAP server-side), companion de IA com 3 escopos e provider configurável, editor com modo escritor, exportação .md/.pdf, design completo (dark/glassmorphism/neon).

Deixar para depois: colaboração multiusuário em tempo real, versionamento de notas, plugins de terceiros, temas customizáveis além do dark mode.