from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Annotated
import uuid

from .. import schemas, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])

def enqueue_embedding_task(note_id: uuid.UUID):
    pass

@router.get("/", response_model=List[schemas.Note])
async def get_notes(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Note).filter(models.Note.user_id == current_user.id))
    return result.scalars().all()

@router.get("/{note_id}", response_model=schemas.Note)
async def get_note(
    note_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
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
    db: AsyncSession = Depends(get_db)
):
    db_note = models.Note(**note.model_dump(), user_id=current_user.id)
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    
    enqueue_embedding_task(db_note.id)
    
    return db_note

@router.put("/{note_id}", response_model=schemas.Note)
async def update_note(
    note_id: uuid.UUID,
    note_update: schemas.NoteUpdate,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Note).filter(models.Note.id == note_id, models.Note.user_id == current_user.id)
    )
    db_note = result.scalars().first()
    if not db_note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = note_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_note, key, value)
    
    await db.commit()
    await db.refresh(db_note)
    
    if 'content' in update_data or 'title' in update_data:
        enqueue_embedding_task(db_note.id)
        
    return db_note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
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
