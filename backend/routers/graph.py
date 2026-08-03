from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Annotated, List, Dict, Any
import json
import uuid

from .. import schemas, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/graph", tags=["graph"])

@router.get("/", response_model=Dict[str, Any])
async def get_graph(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    notes_result = await db.execute(select(models.Note.id, models.Note.title).filter(models.Note.user_id == current_user.id))
    notes = notes_result.all()
    
    nodes = [{"id": str(note.id), "title": note.title} for note in notes]
    
    links_result = await db.execute(select(models.NoteLink))
    user_note_ids = {str(note.id) for note in notes}
    
    links = []
    for link in links_result.scalars().all():
        if str(link.source_note_id) in user_note_ids and str(link.target_note_id) in user_note_ids:
             links.append({
                 "source": str(link.source_note_id),
                 "target": str(link.target_note_id),
                 "type": link.link_type.value,
                 "weight": link.weight
             })
             
    return {"nodes": nodes, "links": links}

@router.get("/brain3d")
async def get_brain3d(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    notes_result = await db.execute(select(models.Note.id, models.Note.title).filter(models.Note.user_id == current_user.id))
    notes = notes_result.all()
    
    nodes = [{"id": str(note.id), "title": note.title, "x": 0.0, "y": 0.0, "z": 0.0} for note in notes]
    
    return {"nodes": nodes}
