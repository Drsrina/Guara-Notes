import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Annotated, List

from .. import schemas, models, auth
from ..database import get_db
from .auth import get_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


@router.get("/users", response_model=List[schemas.UserAdminView])
async def list_all_users(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    """Lista todos os usuários com contagem de notas (admin only)."""
    result = await db.execute(select(models.User).order_by(models.User.created_at.asc()))
    users = result.scalars().all()

    output = []
    for user in users:
        count_result = await db.execute(
            select(func.count()).select_from(models.Note).filter(models.Note.user_id == user.id)
        )
        note_count = count_result.scalar_one()
        output.append(
            schemas.UserAdminView(
                id=user.id,
                username=user.username,
                display_name=user.display_name,
                is_admin=user.is_admin,
                created_at=user.created_at,
                note_count=note_count,
            )
        )
    return output


@router.get("/stats")
async def get_admin_stats(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    """Estatísticas globais do sistema (admin only)."""
    user_count = (await db.execute(select(func.count()).select_from(models.User))).scalar_one()
    note_count = (await db.execute(select(func.count()).select_from(models.Note))).scalar_one()
    embedded_count = (
        await db.execute(
            select(func.count()).select_from(models.Note).filter(models.Note.embedding.is_not(None))
        )
    ).scalar_one()
    link_count = (await db.execute(select(func.count()).select_from(models.NoteLink))).scalar_one()

    return {
        "users": user_count,
        "notes": note_count,
        "embedded_notes": embedded_count,
        "pending_embed": note_count - embedded_count,
        "note_links": link_count,
    }


@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def create_user_admin(
    user_data: schemas.UserAdminCreate,
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    """Cria um novo usuário (admin only)."""
    existing = await db.execute(
        select(models.User).filter(models.User.username == user_data.username)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Username já existe.")

    new_user = models.User(
        username=user_data.username,
        display_name=user_data.display_name,
        password_hash=auth.get_password_hash(user_data.password),
        is_admin=user_data.is_admin,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    logger.info(f"[admin] Usuário '{new_user.username}' criado pelo admin '{current_admin.username}'")
    return new_user


@router.put("/users/{user_id}", response_model=schemas.User)
async def update_user_admin(
    user_id: uuid.UUID,
    update_data: schemas.UserAdminUpdate,
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    """Edita usuário: display_name, is_admin, reset de senha (admin only)."""
    result = await db.execute(select(models.User).filter(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    if update_data.display_name is not None:
        user.display_name = update_data.display_name
    if update_data.is_admin is not None:
        # Impede que o admin remova seus próprios privilégios
        if user.id == current_admin.id and not update_data.is_admin:
            raise HTTPException(status_code=400, detail="Não é possível remover seus próprios privilégios de admin.")
        user.is_admin = update_data.is_admin
    if update_data.new_password:
        user.password_hash = auth.get_password_hash(update_data.new_password)
        logger.info(f"[admin] Senha resetada para '{user.username}' pelo admin '{current_admin.username}'")

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_admin(
    user_id: uuid.UUID,
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    """Deleta usuário e todas as suas notas via CASCADE (admin only)."""
    if user_id == current_admin.id:
        raise HTTPException(status_code=400, detail="Não é possível deletar a própria conta pelo painel admin.")

    result = await db.execute(select(models.User).filter(models.User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    await db.delete(user)
    await db.commit()
    logger.info(f"[admin] Usuário '{user.username}' deletado pelo admin '{current_admin.username}'")
    return None
