from pydantic import BaseModel, UUID4, Field, field_validator
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

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    theme_prefs: Optional[Dict[str, Any]] = None

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

class UserAdminCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6)
    display_name: str
    is_admin: bool = False

class UserAdminUpdate(BaseModel):
    display_name: Optional[str] = None
    is_admin: Optional[bool] = None
    new_password: Optional[str] = Field(default=None, min_length=6)

class User(UserBase):
    id: UUID4
    is_admin: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserAdminView(BaseModel):
    id: UUID4
    username: str
    display_name: str
    is_admin: bool
    created_at: datetime
    note_count: int = 0

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
    title: str = Field(min_length=1, max_length=500)
    content: str = Field(max_length=2_000_000)
    folder_id: Optional[UUID4] = None
    tags: List[str] = []

    @field_validator('tags')
    @classmethod
    def validate_tags(cls, v: List[str]) -> List[str]:
        return [t.strip().lower() for t in v if t.strip()]

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=500)
    content: Optional[str] = Field(default=None, max_length=2_000_000)
    folder_id: Optional[UUID4] = None
    tags: Optional[List[str]] = None

class Note(NoteBase):
    id: UUID4
    user_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class NoteSearchResult(Note):
    score: float = 0.0

class PaginatedNotes(BaseModel):
    items: List[Note]
    total: int
    limit: int
    offset: int

class NoteLinkBase(BaseModel):
    target_note_id: UUID4
    link_type: str
    weight: float

class NoteLink(NoteLinkBase):
    id: UUID4
    source_note_id: UUID4

    class Config:
        from_attributes = True

class NoteVersion(BaseModel):
    id: UUID4
    note_id: UUID4
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True
