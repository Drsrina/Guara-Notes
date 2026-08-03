import uuid
from datetime import datetime, timezone
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .database import Base


def _now():
    return datetime.now(timezone.utc)


class LinkType(enum.Enum):
    wikilink = "wikilink"
    semantic = "semantic"


class ChatScope(enum.Enum):
    note = "note"
    folder = "folder"
    database = "database"


class ChatRole(enum.Enum):
    user = "user"
    assistant = "assistant"


class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    display_name = Column(String)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    theme_prefs = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)


class Folder(Base):
    __tablename__ = "folders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    parent_folder_id = Column(UUID(as_uuid=True), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    order_index = Column(Float, default=0.0)

    user = relationship("User")


class Note(Base):
    __tablename__ = "notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    folder_id = Column(UUID(as_uuid=True), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False, default="Sem título")
    content = Column(Text, nullable=False, default="")
    embedding = Column(Vector(768), nullable=True)
    # Coordenadas 3D calculadas por UMAP no worker (persistidas para evitar reprocessar)
    umap_x = Column(Float, nullable=True)
    umap_y = Column(Float, nullable=True)
    umap_z = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)
    updated_at = Column(DateTime(timezone=True), default=_now, onupdate=_now)
    tags = Column(ARRAY(String), default=list)

    user = relationship("User")
    folder = relationship("Folder")


class NoteLink(Base):
    __tablename__ = "note_links"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"))
    target_note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"))
    link_type = Column(Enum(LinkType), nullable=False)
    weight = Column(Float, default=1.0)

    source = relationship("Note", foreign_keys=[source_note_id])
    target = relationship("Note", foreign_keys=[target_note_id])


class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"))
    scope = Column(Enum(ChatScope), nullable=False)
    scope_ref_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=_now)

    user = relationship("User")
    messages = relationship("AIChatMessage", back_populates="session", cascade="all, delete-orphan")


class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"))
    role = Column(Enum(ChatRole), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_now)

    session = relationship("AIChatSession", back_populates="messages")
