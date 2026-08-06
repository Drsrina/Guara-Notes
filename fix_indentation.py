import re

with open('backend/routers/ai.py', 'r') as f:
    content = f.read()

content = content.replace(
    'async def _embed_query(query: str) -> list[float]:\n    """Gera embedding para o query RAG via Ollama."""\n    ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434")\n        ollama_model_chat = os.getenv("OLLAMA_MODEL_CHAT", "llama3.2:3b")\n        async with httpx.AsyncClient(timeout=60.0) as client:',
    'async def _embed_query(query: str) -> list[float]:\n    """Gera embedding para o query RAG via Ollama."""\n    ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434")\n    ollama_model_embed = os.getenv("OLLAMA_MODEL_EMBED", "nomic-embed-text")\n    async with httpx.AsyncClient(timeout=10.0) as client:'
)

with open('backend/routers/ai.py', 'w') as f:
    f.write(content)
print("done")
