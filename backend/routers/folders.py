from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Annotated
import uuid

from .. import schemas, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/folders", tags=["folders"])

@router.get("/", response_model=List[schemas.Folder])
async def get_folders(
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Folder).filter(models.Folder.user_id == current_user.id))
    return result.scalars().all()

@router.post("/", response_model=schemas.Folder, status_code=status.HTTP_201_CREATED)
async def create_folder(
    folder: schemas.FolderCreate,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    db_folder = models.Folder(**folder.model_dump(), user_id=current_user.id)
    db.add(db_folder)
    await db.commit()
    await db.refresh(db_folder)
    return db_folder

@router.put("/{folder_id}", response_model=schemas.Folder)
async def update_folder(
    folder_id: uuid.UUID,
    folder_update: schemas.FolderUpdate,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Folder).filter(models.Folder.id == folder_id, models.Folder.user_id == current_user.id)
    )
    db_folder = result.scalars().first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    update_data = folder_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_folder, key, value)
    
    await db.commit()
    await db.refresh(db_folder)
    return db_folder

@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder(
    folder_id: uuid.UUID,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(models.Folder).filter(models.Folder.id == folder_id, models.Folder.user_id == current_user.id)
    )
    db_folder = result.scalars().first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    await db.delete(db_folder)
    await db.commit()
    return None
