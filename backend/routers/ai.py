import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from pydantic import BaseModel
from typing import Annotated, Optional, List
import uuid

from .. import models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

AI_PROVIDER = os.getenv("AI_PROVIDER", "local")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
OLLAMA_MODEL_CHAT = os.getenv("OLLAMA_MODEL_CHAT", "llama3.2:3b")
OLLAMA_MODEL_EMBED = os.getenv("OLLAMA_MODEL_EMBED", "nomic-embed-text")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))


# ---------------------------------------------------------------------------
# Helpers de provider
# ---------------------------------------------------------------------------

async def _call_ollama(messages: list[dict]) -> str:
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_URL}/api/chat",
            json={"model": OLLAMA_MODEL_CHAT, "messages": messages, "stream": False},
        )
        response.raise_for_status()
        return response.json()["message"]["content"]


async def _call_gemini(messages: list[dict]) -> str:
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada")
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")
        # Monta histórico no formato Gemini
        history = []
        last_user = ""
        for m in messages:
            if m["role"] == "system":
                last_user = m["content"]
            elif m["role"] == "user":
                last_user = (last_user + "\n\n" + m["content"]).strip()
            elif m["role"] == "assistant" and history:
                history.append({"role": "model", "parts": [m["content"]]})
        chat = model.start_chat(history=history)
        resp = chat.send_message(last_user)
        return resp.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini error: {e}")


async def _call_claude(messages: list[dict]) -> str:
    if not CLAUDE_API_KEY:
        raise HTTPException(status_code=500, detail="CLAUDE_API_KEY não configurada")
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=CLAUDE_API_KEY)
        system_parts = [m["content"] for m in messages if m["role"] == "system"]
        chat_messages = [m for m in messages if m["role"] != "system"]
        resp = client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=2048,
            system="\n\n".join(system_parts) if system_parts else "You are a helpful writing assistant.",
            messages=chat_messages,
        )
        return resp.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude error: {e}")


async def _dispatch_ai(messages: list[dict]) -> str:
    """Chama o provider configurado via AI_PROVIDER."""
    if AI_PROVIDER == "gemini":
        return await _call_gemini(messages)
    elif AI_PROVIDER == "claude":
        return await _call_claude(messages)
    else:
        return await _call_ollama(messages)


async def _embed_query(query: str) -> list[float]:
    """Gera embedding para o query RAG via Ollama."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            r = await client.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": OLLAMA_MODEL_EMBED, "prompt": query},
            )
            r.raise_for_status()
            return r.json().get("embedding", [])
        except Exception:
            return []


async def _rag_context(
    db: AsyncSession,
    user_id: uuid.UUID,
    query: str,
    scope: str,
    scope_ref_id: Optional[uuid.UUID],
) -> str:
    """
    Monta o contexto RAG baseado no scope:
    - note: conteúdo integral da nota
    - folder: top-k notas da pasta por similaridade
    - database: top-k notas globais por similaridade
    """
    if scope == "note" and scope_ref_id:
        result = await db.execute(
            select(models.Note).filter(
                models.Note.id == scope_ref_id,
                models.Note.user_id == user_id,
            )
        )
        note = result.scalars().first()
        if note:
            return f"# {note.title}\n\n{note.content}"
        return ""

    # Para folder e database: RAG via pgvector
    query_vec = await _embed_query(query)
    if not query_vec:
        # Fallback sem embedding: retorna as k notas mais recentes
        filters = [models.Note.user_id == user_id]
        if scope == "folder" and scope_ref_id:
            filters.append(models.Note.folder_id == scope_ref_id)
        result = await db.execute(
            select(models.Note).filter(*filters).limit(RAG_TOP_K)
        )
        notes = result.scalars().all()
    else:
        where_clause = "user_id = :uid AND embedding IS NOT NULL"
        params = {"vec": str(query_vec), "uid": str(user_id), "k": RAG_TOP_K}
        if scope == "folder" and scope_ref_id:
            where_clause += " AND folder_id = :fid"
            params["fid"] = str(scope_ref_id)

        rows = await db.execute(
            text(f"""
                SELECT id FROM notes
                WHERE {where_clause}
                ORDER BY (embedding <=> CAST(:vec AS vector)) ASC
                LIMIT :k
            """),
            params,
        )
        note_ids = [r.id for r in rows.fetchall()]
        result = await db.execute(
            select(models.Note).filter(models.Note.id.in_(note_ids))
        )
        notes = result.scalars().all()

    if not notes:
        return ""

    snippets = [f"## {n.title}\n{n.content[:800]}" for n in notes]
    return "\n\n---\n\n".join(snippets)


# ---------------------------------------------------------------------------
# Schemas de request/response
# ---------------------------------------------------------------------------

class AIChatRequest(BaseModel):
    message: str
    scope: str  # 'note' | 'folder' | 'database'
    scope_ref_id: Optional[uuid.UUID] = None
    session_id: Optional[uuid.UUID] = None


class AIChatResponse(BaseModel):
    reply: str
    session_id: uuid.UUID


class GhostWriterRequest(BaseModel):
    instruction: str
    current_content: Optional[str] = None
    note_id: Optional[uuid.UUID] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_ai(
    request: AIChatRequest,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    if request.scope not in ["note", "folder", "database"]:
        raise HTTPException(status_code=400, detail="scope inválido. Use: note, folder, database")

    # Busca ou cria sessão de chat
    session = None
    if request.session_id:
        result = await db.execute(
            select(models.AIChatSession).filter(
                models.AIChatSession.id == request.session_id,
                models.AIChatSession.user_id == current_user.id,
            )
        )
        session = result.scalars().first()

    if not session:
        session = models.AIChatSession(
            user_id=current_user.id,
            scope=models.ChatScope[request.scope],
            scope_ref_id=request.scope_ref_id,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

    # Monta contexto RAG
    context = await _rag_context(
        db, current_user.id, request.message, request.scope, request.scope_ref_id
    )

    # Busca histórico de mensagens da sessão
    hist_result = await db.execute(
        select(models.AIChatMessage)
        .filter(models.AIChatMessage.session_id == session.id)
        .order_by(models.AIChatMessage.created_at)
        .limit(20)
    )
    history = hist_result.scalars().all()

    # Monta messages para o provider
    system_prompt = (
        "Você é um companion de escrita criativa chamado Guará. "
        "Seja conciso, insightful e ajude o usuário a desenvolver suas ideias.\n\n"
    )
    if context:
        system_prompt += f"Contexto das notas do usuário:\n\n{context}"

    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        messages.append({"role": h.role.value, "content": h.content})
    messages.append({"role": "user", "content": request.message})

    # Chama o provider
    reply = await _dispatch_ai(messages)

    # Persiste as mensagens
    db.add(models.AIChatMessage(
        session_id=session.id,
        role=models.ChatRole.user,
        content=request.message,
    ))
    db.add(models.AIChatMessage(
        session_id=session.id,
        role=models.ChatRole.assistant,
        content=reply,
    ))
    await db.commit()

    return {"reply": reply, "session_id": session.id}


@router.post("/ghost-writer")
async def ghost_writer(
    request: GhostWriterRequest,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Gera um trecho/rascunho a partir de instrução. Retorna sugestão editável."""
    context = ""
    if request.current_content:
        context = f"Conteúdo atual da nota:\n\n{request.current_content}\n\n"

    messages = [
        {
            "role": "system",
            "content": (
                "Você é um escritor criativo assistindo o usuário. "
                "Gere APENAS o trecho solicitado, sem explicações adicionais. "
                "Escreva em Markdown quando apropriado."
            ),
        },
        {
            "role": "user",
            "content": f"{context}Instrução: {request.instruction}",
        },
    ]

    suggestion = await _dispatch_ai(messages)
    return {"suggestion": suggestion}


@router.get("/sessions", response_model=List[dict])
async def list_sessions(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.AIChatSession)
        .filter(models.AIChatSession.user_id == current_user.id)
        .order_by(models.AIChatSession.created_at.desc())
        .limit(20)
    )
    sessions = result.scalars().all()
    return [{"id": str(s.id), "scope": s.scope.value, "created_at": s.created_at.isoformat()} for s in sessions]
