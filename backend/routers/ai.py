from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, UUID4
from typing import Annotated, Optional, List
import uuid

from .. import schemas, models
from ..database import get_db
from .auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])

class AIChatRequest(BaseModel):
    message: str
    scope: str # 'note', 'folder', 'database'
    scope_ref_id: Optional[UUID4] = None

class AIChatResponse(BaseModel):
    reply: str

@router.post("/chat", response_model=AIChatResponse)
async def chat_with_ai(
    request: AIChatRequest,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    if request.scope not in ["note", "folder", "database"]:
         raise HTTPException(status_code=400, detail="Invalid scope")
         
    stub_reply = f"This is a simulated AI response for scope '{request.scope}'."
    if request.scope_ref_id:
        stub_reply += f" Focusing on reference ID: {request.scope_ref_id}."
        
    return {"reply": stub_reply}

@router.post("/ghost-writer", response_model=AIChatResponse)
async def ghost_writer(
    instruction: str,
    current_user: Annotated[models.User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    return {"reply": f"Ghost writer suggestion based on: {instruction}"}
