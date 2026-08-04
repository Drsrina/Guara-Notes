from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from typing import Annotated, Dict, Any

from .. import models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/", response_model=Dict[str, Any])
async def get_graph(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Retorna nós (notas) e arestas (note_links) do usuário para o grafo 2D."""
    notes_result = await db.execute(
        select(models.Note.id, models.Note.title, models.Note.tags)
        .filter(models.Note.user_id == current_user.id)
    )
    notes = notes_result.all()
    note_ids = {str(n.id) for n in notes}

    nodes = [
        {"id": str(n.id), "title": n.title, "tags": n.tags or []}
        for n in notes
    ]

    # Busca links onde AMBOS os lados pertencem ao usuário — via SQL JOIN seguro
    links_result = await db.execute(
        select(models.NoteLink)
        .join(
            models.Note,
            and_(
                models.NoteLink.source_note_id == models.Note.id,
                models.Note.user_id == current_user.id,
            ),
        )
    )

    links = []
    for link in links_result.scalars().all():
        if str(link.target_note_id) in note_ids:
            links.append({
                "source": str(link.source_note_id),
                "target": str(link.target_note_id),
                "type": link.link_type.value,
                "weight": link.weight,
            })

    return {"nodes": nodes, "links": links}


@router.get("/brain3d", response_model=Dict[str, Any])
async def get_brain3d(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Retorna coordenadas 3D (UMAP) pré-calculadas das notas do usuário."""
    notes_result = await db.execute(
        select(
            models.Note.id,
            models.Note.title,
            models.Note.umap_x,
            models.Note.umap_y,
            models.Note.umap_z,
            models.Note.embedding,
        ).filter(models.Note.user_id == current_user.id)
    )
    notes = notes_result.all()

    nodes = [
        {
            "id": str(n.id),
            "title": n.title,
            "x": n.umap_x or 0.0,
            "y": n.umap_y or 0.0,
            "z": n.umap_z or 0.0,
            "has_embedding": n.umap_x is not None or n.embedding is not None,
            "embedding": list(n.embedding) if n.embedding is not None else None,
        }
        for n in notes
    ]

    return {"nodes": nodes, "ready": any(n["has_embedding"] for n in nodes)}
