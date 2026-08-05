import re
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, func, or_
from sqlalchemy import text as sa_text
from typing import List, Annotated, Optional

from .. import schemas, models
from ..database import get_db
from .auth import get_current_user
from ..tasks import generate_embeddings

router = APIRouter(prefix="/notes", tags=["notes"])
logger = logging.getLogger(__name__)

# Regex para capturar [[título da nota]]
WIKILINK_RE = re.compile(r"\[\[([^\[\]]+)\]\]")


def _enqueue_embedding(note_id: uuid.UUID):
    """Dispara a task Celery de geração de embedding em background."""
    try:
        generate_embeddings.delay(str(note_id))
    except Exception as e:
        # Não bloqueia o request se o Redis estiver temporariamente indisponível
        logger.warning(f"[notes] Falha ao enfileirar embedding para {note_id}: {e}")


async def _sync_wikilinks(db: AsyncSession, note: models.Note):
    """
    Extrai [[wikilinks]] do conteúdo e atualiza note_links do tipo wikilink.
    Resolve por título (case-insensitive) dentro das notas do mesmo usuário.
    """
    # Remove links wikilink antigos desta nota como origem
    await db.execute(
        delete(models.NoteLink).where(
            models.NoteLink.source_note_id == note.id,
            models.NoteLink.link_type == models.LinkType.wikilink,
        )
    )

    titles = WIKILINK_RE.findall(note.content or "")
    if not titles:
        return

    # Busca notas pelo título (case-insensitive), mesmo usuário
    for title in set(titles):
        result = await db.execute(
            select(models.Note).filter(
                models.Note.user_id == note.user_id,
                models.Note.title.ilike(title.strip()),
                models.Note.id != note.id,
            )
        )
        target = result.scalars().first()
        if target:
            db.add(
                models.NoteLink(
                    source_note_id=note.id,
                    target_note_id=target.id,
                    link_type=models.LinkType.wikilink,
                    weight=1.0,
                )
            )


@router.get("/search", response_model=List[schemas.NoteSearchResult])
async def search_notes(
    q: str = Query(..., min_length=1, description="Termo de busca"),
    mode: str = Query("text", description="Modo: text | semantic | hybrid"),
    limit: int = Query(20, ge=1, le=100),
    folder_id: Optional[uuid.UUID] = Query(None),
    current_user: Annotated[models.User, Depends(get_current_user)] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Busca notas por texto (ILIKE), semântica (pgvector) ou híbrida.
    - text: busca em título e conteúdo via ILIKE (rápido, sem embedding)
    - semantic: busca por similaridade de embedding (requer Ollama)
    - hybrid: combina text + semantic, ordena por score combinado
    """
    results: List[schemas.NoteSearchResult] = []

    folder_filter = ""
    folder_params: dict = {}
    if folder_id:
        folder_filter = "AND folder_id = :fid"
        folder_params["fid"] = str(folder_id)

    if mode in ("text", "hybrid"):
        # Busca full-text via ILIKE no título (peso maior) e conteúdo
        pattern = f"%{q}%"
        text_query = sa_text(f"""
            SELECT id,
                   CASE
                       WHEN title ILIKE :pattern THEN 1.0
                       WHEN content ILIKE :pattern THEN 0.6
                       ELSE 0.0
                   END AS score
            FROM notes
            WHERE user_id = :uid
              AND (title ILIKE :pattern OR content ILIKE :pattern)
              {folder_filter}
            ORDER BY score DESC
            LIMIT :lim
        """)
        rows = await db.execute(
            text_query,
            {"pattern": pattern, "uid": str(current_user.id), "lim": limit, **folder_params},
        )
        text_hits = {str(row.id): float(row.score) for row in rows.fetchall()}

        if text_hits:
            note_rows = await db.execute(
                select(models.Note).filter(
                    models.Note.id.in_([uuid.UUID(k) for k in text_hits])
                )
            )
            for note in note_rows.scalars().all():
                r = schemas.NoteSearchResult.model_validate(note)
                r.score = text_hits.get(str(note.id), 0.0)
                results.append(r)

    if mode in ("semantic", "hybrid"):
        # Gera embedding da query via Ollama
        import httpx
        OLLAMA_URL = __import__("os").getenv("OLLAMA_URL", "http://ollama:11434")
        EMBED_MODEL = __import__("os").getenv("OLLAMA_MODEL_EMBED", "nomic-embed-text")
        query_vec = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    f"{OLLAMA_URL}/api/embeddings",
                    json={"model": EMBED_MODEL, "prompt": q},
                )
                r.raise_for_status()
                query_vec = r.json().get("embedding", [])
        except Exception as e:
            logger.warning(f"[search] Embedding da query falhou: {e}")

        if query_vec:
            semantic_query = sa_text(f"""
                SELECT id, (1.0 - (embedding <=> CAST(:vec AS vector))) AS score
                FROM notes
                WHERE user_id = :uid
                  AND embedding IS NOT NULL
                  {folder_filter}
                ORDER BY score DESC
                LIMIT :lim
            """)
            sem_rows = await db.execute(
                semantic_query,
                {"vec": str(query_vec), "uid": str(current_user.id), "lim": limit, **folder_params},
            )
            sem_hits = {str(row.id): float(row.score) for row in sem_rows.fetchall()}

            # Para hybrid: combina scores; para semantic puro: usa apenas sem_hits
            existing_ids = {str(r.id) for r in results}
            new_ids = set(sem_hits.keys()) - existing_ids

            if new_ids:
                new_note_rows = await db.execute(
                    select(models.Note).filter(
                        models.Note.id.in_([uuid.UUID(k) for k in new_ids])
                    )
                )
                for note in new_note_rows.scalars().all():
                    r = schemas.NoteSearchResult.model_validate(note)
                    r.score = sem_hits.get(str(note.id), 0.0)
                    results.append(r)

            # Para hybrid: boosta score de resultados que aparecem nos dois
            if mode == "hybrid":
                for res in results:
                    if str(res.id) in sem_hits:
                        res.score = res.score * 0.5 + sem_hits[str(res.id)] * 0.5

    # Ordena por score decrescente e limita
    results.sort(key=lambda x: x.score, reverse=True)
    return results[:limit]


@router.get("/", response_model=schemas.PaginatedNotes)
async def get_notes(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    folder_id: uuid.UUID | None = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    query = select(models.Note).filter(models.Note.user_id == current_user.id)
    count_query = select(func.count()).select_from(models.Note).filter(
        models.Note.user_id == current_user.id
    )

    if folder_id is not None:
        query = query.filter(models.Note.folder_id == folder_id)
        count_query = count_query.filter(models.Note.folder_id == folder_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    result = await db.execute(
        query.order_by(models.Note.updated_at.desc()).limit(limit).offset(offset)
    )
    items = result.scalars().all()

    return schemas.PaginatedNotes(items=list(items), total=total, limit=limit, offset=offset)


@router.get("/{note_id}", response_model=schemas.Note)
async def get_note(
    note_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
    )
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    return db_note


@router.post("/", response_model=schemas.Note, status_code=status.HTTP_201_CREATED)
async def create_note(
    note: schemas.NoteCreate,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    db_note = models.Note(**note.model_dump(), user_id=current_user.id)
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)

    await _sync_wikilinks(db, db_note)
    await db.commit()

    _enqueue_embedding(db_note.id)
    return db_note


@router.put("/{note_id}", response_model=schemas.Note)
async def update_note(
    note_id: uuid.UUID,
    note_update: schemas.NoteUpdate,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
    )
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Salva original para comparar
    setattr(db_note, "_original_content", db_note.content)
    setattr(db_note, "_original_title", db_note.title)

    update_data = note_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_note, key, value)

    await db.commit()
    await db.refresh(db_note)

    if "content" in update_data or "title" in update_data:
        orig_content = getattr(db_note, "_original_content", db_note.content)
        orig_title = getattr(db_note, "_original_title", db_note.title)
        new_content = update_data.get("content", db_note.content)
        new_title = update_data.get("title", db_note.title)

        if orig_content != new_content or orig_title != new_title:
            # Cria versão do estado anterior
            version = models.NoteVersion(
                note_id=db_note.id,
                title=orig_title,
                content=orig_content,
            )
            db.add(version)
            await db.commit()

            # Mantém apenas as 50 versões mais recentes (configurável)
            import os
            max_versions = int(os.getenv("NOTE_MAX_VERSIONS", "50"))
            versions_result = await db.execute(
                select(models.NoteVersion)
                .filter(models.NoteVersion.note_id == db_note.id)
                .order_by(models.NoteVersion.created_at.desc())
            )
            all_versions = versions_result.scalars().all()
            if len(all_versions) > max_versions:
                for v_to_delete in all_versions[max_versions:]:
                    await db.delete(v_to_delete)
                await db.commit()

        await _sync_wikilinks(db, db_note)
        await db.commit()
        _enqueue_embedding(db_note.id)

    return db_note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
    )
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    await db.delete(db_note)
    await db.commit()
    return None


@router.get("/{note_id}/versions", response_model=List[schemas.NoteVersion])
async def get_note_versions(
    note_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
    )
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    versions_result = await db.execute(
        select(models.NoteVersion)
        .filter(models.NoteVersion.note_id == note_id)
        .order_by(models.NoteVersion.created_at.desc())
    )
    return versions_result.scalars().all()


@router.post("/{note_id}/restore/{version_id}", response_model=schemas.Note)
async def restore_note_version(
    note_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
    )
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    v_result = await db.execute(
        select(models.NoteVersion).filter(
            models.NoteVersion.id == version_id, models.NoteVersion.note_id == note_id
        )
    )
    version = v_result.scalars().first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    old_title = db_note.title
    old_content = db_note.content

    db_note.title = version.title
    db_note.content = version.content

    new_backup = models.NoteVersion(note_id=db_note.id, title=old_title, content=old_content)
    db.add(new_backup)
    await db.delete(version)
    await db.commit()
    await db.refresh(db_note)

    await _sync_wikilinks(db, db_note)
    await db.commit()
    _enqueue_embedding(db_note.id)

    return db_note


@router.post("/{note_id}/embed", status_code=status.HTTP_202_ACCEPTED)
async def force_embed_note(
    note_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Força o re-embedding de uma nota específica via Celery."""
    result = await db.execute(
        select(models.Note).filter(
            models.Note.id == note_id, models.Note.user_id == current_user.id
        )
    )
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")

    _enqueue_embedding(db_note.id)
    logger.info(f"[notes] Re-embedding forçado para nota {note_id} pelo usuário {current_user.id}")
    return {"status": "queued", "note_id": str(note_id)}


@router.post("/bulk-embed", status_code=status.HTTP_202_ACCEPTED)
async def bulk_embed_notes(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Enfileira re-embedding de TODAS as notas do usuário."""
    result = await db.execute(
        select(models.Note.id).filter(models.Note.user_id == current_user.id)
    )
    note_ids = [str(row.id) for row in result.fetchall()]

    for nid in note_ids:
        _enqueue_embedding(uuid.UUID(nid))

    logger.info(f"[notes] Bulk re-embed: {len(note_ids)} notas enfileiradas para {current_user.id}")
    return {"status": "queued", "count": len(note_ids)}
