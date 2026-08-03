from pydantic import BaseModel, UUID4, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    theme_prefs: Dict[str, Any] = {}

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class FolderBase(BaseModel):
    name: str
    parent_folder_id: Optional[UUID4] = None
    order_index: Optional[float] = 0.0

class FolderCreate(FolderBase):
    pass

class FolderUpdate(FolderBase):
    pass

class Folder(FolderBase):
    id: UUID4
    user_id: UUID4

    class Config:
        from_attributes = True

class NoteBase(BaseModel):
    title: str
    content: str
    folder_id: Optional[UUID4] = None
    tags: List[str] = []

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    folder_id: Optional[UUID4] = None
    tags: Optional[List[str]] = None

class Note(NoteBase):
    id: UUID4
    user_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NoteLinkBase(BaseModel):
    target_note_id: UUID4
    link_type: str
    weight: float

class NoteLink(NoteLinkBase):
    id: UUID4
    source_note_id: UUID4

    class Config:
        from_attributes = True
