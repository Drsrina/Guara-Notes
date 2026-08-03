import uuid
import datetime
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from .database import Base

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
    theme_prefs = Column(JSONB, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Folder(Base):
    __tablename__ = "folders"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    name = Column(String)
    parent_folder_id = Column(UUID(as_uuid=True), ForeignKey("folders.id"), nullable=True)
    order_index = Column(Float, default=0.0)

    user = relationship("User")

class Note(Base):
    __tablename__ = "notes"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    folder_id = Column(UUID(as_uuid=True), ForeignKey("folders.id"), nullable=True)
    title = Column(String)
    content = Column(Text)
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    tags = Column(ARRAY(String), default=[])

    user = relationship("User")
    folder = relationship("Folder")

class NoteLink(Base):
    __tablename__ = "note_links"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id"))
    target_note_id = Column(UUID(as_uuid=True), ForeignKey("notes.id"))
    link_type = Column(Enum(LinkType))
    weight = Column(Float, default=1.0)

class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    scope = Column(Enum(ChatScope))
    scope_ref_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User")
    messages = relationship("AIChatMessage", back_populates="session", cascade="all, delete")

class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("ai_chat_sessions.id"))
    role = Column(Enum(ChatRole))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("AIChatSession", back_populates="messages")
