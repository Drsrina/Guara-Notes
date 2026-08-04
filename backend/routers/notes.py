import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List, Annotated

from .. import schemas, models
from ..database import get_db
from .auth import get_current_user
from ..tasks import generate_embeddings

router = APIRouter(prefix="/notes", tags=["notes"])

# Regex para capturar [[título da nota]]
WIKILINK_RE = re.compile(r"\[\[([^\[\]]+)\]\]")


def _enqueue_embedding(note_id: uuid.UUID):
    """Dispara a task Celery de geração de embedding em background."""
    try:
        generate_embeddings.delay(str(note_id))
    except Exception as e:
        # Não bloqueia o request se o Redis estiver temporariamente indisponível
        print(f"[notes] Aviso: falha ao enfileirar embedding para {note_id}: {e}")


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


@router.get("/", response_model=List[schemas.Note])
async def get_notes(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    folder_id: uuid.UUID | None = None,
):
    query = select(models.Note).filter(models.Note.user_id == current_user.id)
    if folder_id is not None:
        query = query.filter(models.Note.folder_id == folder_id)
    result = await db.execute(query.order_by(models.Note.updated_at.desc()))
    return result.scalars().all()


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

    # Resync wikilinks, re-embeds, and versioning se título ou conteúdo mudam
    if "content" in update_data or "title" in update_data:
        # Verifica se o conteúdo ou título realmente mudaram em relação à versão salva para gerar backup
        if getattr(db_note, "_original_content", db_note.content) != update_data.get("content", db_note.content) or getattr(db_note, "_original_title", db_note.title) != update_data.get("title", db_note.title):
            # Cria versão
            version = models.NoteVersion(
                note_id=db_note.id,
                title=getattr(db_note, "_original_title", db_note.title),
                content=getattr(db_note, "_original_content", db_note.content)
            )
            db.add(version)
            await db.commit()
            
            # Limpa versões antigas mantendo apenas as 2 mais recentes
            versions_result = await db.execute(
                select(models.NoteVersion).filter(models.NoteVersion.note_id == db_note.id).order_by(models.NoteVersion.created_at.desc())
            )
            all_versions = versions_result.scalars().all()
            if len(all_versions) > 2:
                for v_to_delete in all_versions[2:]:
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
        select(models.NoteVersion).filter(models.NoteVersion.note_id == note_id).order_by(models.NoteVersion.created_at.desc())
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
        select(models.NoteVersion).filter(models.NoteVersion.id == version_id, models.NoteVersion.note_id == note_id)
    )
    version = v_result.scalars().first()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Salva original para virar o novo backup
    old_title = db_note.title
    old_content = db_note.content

    # Restaura
    db_note.title = version.title
    db_note.content = version.content

    # Cria versão do estado imediatamente anterior à restauração
    new_backup = models.NoteVersion(
        note_id=db_note.id,
        title=old_title,
        content=old_content
    )
    db.add(new_backup)
    await db.delete(version) # Remove a versão que acabou de ser restaurada
    await db.commit()
    await db.refresh(db_note)

    await _sync_wikilinks(db, db_note)
    await db.commit()
    _enqueue_embedding(db_note.id)

    return db_note
