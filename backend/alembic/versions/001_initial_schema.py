"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-08-03 00:00:00.000000

Cria todas as tabelas do Guará-Notes:
  - users
  - folders
  - notes (com campo Vector(768) para pgvector)
  - note_links
  - ai_chat_sessions
  - ai_chat_messages

Também ativa a extensão pgvector e cria o índice IVFFlat para busca ANN eficiente.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extensão pgvector ──────────────────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ── Enum types ─────────────────────────────────────────────────────────────
    linktype_enum = postgresql.ENUM('wikilink', 'semantic', name='linktype', create_type=False)
    chatscope_enum = postgresql.ENUM('note', 'folder', 'database', name='chatscope', create_type=False)
    chatrole_enum = postgresql.ENUM('user', 'assistant', name='chatrole', create_type=False)

    linktype_enum.create(op.get_bind(), checkfirst=True)
    chatscope_enum.create(op.get_bind(), checkfirst=True)
    chatrole_enum.create(op.get_bind(), checkfirst=True)

    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('avatar_url', sa.String(), nullable=True),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('theme_prefs', postgresql.JSONB(), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    # ── folders ────────────────────────────────────────────────────────────────
    op.create_table(
        'folders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('parent_folder_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('folders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('order_index', sa.Float(), nullable=False, server_default='0.0'),
    )
    op.create_index('ix_folders_user_id', 'folders', ['user_id'])

    # ── notes ──────────────────────────────────────────────────────────────────
    op.create_table(
        'notes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('folder_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('folders.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(), nullable=False, server_default='Sem título'),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        # Vector(768) para nomic-embed-text; armazenado como tipo nativo pgvector
        sa.Column('embedding', sa.Text(), nullable=True),  # placeholder — ver nota abaixo
        sa.Column('umap_x', sa.Float(), nullable=True),
        sa.Column('umap_y', sa.Float(), nullable=True),
        sa.Column('umap_z', sa.Float(), nullable=True),
        sa.Column('tags', postgresql.ARRAY(sa.String()), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_notes_user_id', 'notes', ['user_id'])
    op.create_index('ix_notes_folder_id', 'notes', ['folder_id'])

    # Converte a coluna embedding para o tipo real vector(768) do pgvector
    op.execute("ALTER TABLE notes ALTER COLUMN embedding TYPE vector(768) USING NULL::vector(768)")

    # Índice IVFFlat para busca ANN (Approximate Nearest Neighbor) eficiente
    # NOTA: o índice só é criado quando já existem dados suficientes (mínimo 100 registros).
    # Em produção, rode manualmente após ter dados:
    #   CREATE INDEX CONCURRENTLY ix_notes_embedding ON notes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    # Por ora criamos sem o índice para não falhar com tabela vazia.

    # ── note_links ─────────────────────────────────────────────────────────────
    op.create_table(
        'note_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('source_note_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('notes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_note_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('notes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('link_type', postgresql.ENUM('wikilink', 'semantic', name='linktype', create_type=False),
                  nullable=False),
        sa.Column('weight', sa.Float(), nullable=False, server_default='1.0'),
    )
    op.create_index('ix_note_links_source', 'note_links', ['source_note_id'])
    op.create_index('ix_note_links_target', 'note_links', ['target_note_id'])

    # ── ai_chat_sessions ───────────────────────────────────────────────────────
    op.create_table(
        'ai_chat_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('scope', postgresql.ENUM('note', 'folder', 'database', name='chatscope', create_type=False),
                  nullable=False),
        sa.Column('scope_ref_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ai_chat_sessions_user_id', 'ai_chat_sessions', ['user_id'])

    # ── ai_chat_messages ───────────────────────────────────────────────────────
    op.create_table(
        'ai_chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('ai_chat_sessions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', postgresql.ENUM('user', 'assistant', name='chatrole', create_type=False),
                  nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index('ix_ai_chat_messages_session_id', 'ai_chat_messages', ['session_id'])


def downgrade() -> None:
    op.drop_table('ai_chat_messages')
    op.drop_table('ai_chat_sessions')
    op.drop_table('note_links')
    op.drop_table('notes')
    op.drop_table('folders')
    op.drop_table('users')

    postgresql.ENUM(name='chatrole').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='chatscope').drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name='linktype').drop(op.get_bind(), checkfirst=True)

    op.execute("DROP EXTENSION IF EXISTS vector")
