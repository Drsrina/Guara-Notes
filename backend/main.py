import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command

from .database import AsyncSessionLocal
from .routers import auth, notes, folders, graph, ai, admin, ollama
from . import models
from .auth import get_password_hash

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5757,http://127.0.0.1:5757,http://localhost:5173"
).split(",")


def _run_migrations():
    """Roda alembic upgrade head de forma síncrona com psycopg2 (recomendado pelo Alembic)."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_cfg = AlembicConfig(os.path.join(base_dir, "alembic.ini"))
    alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "alembic"))

    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://guaranotes:guaranotes_secret@localhost:5432/guaranotes"
    )
    sync_url = db_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    alembic_cfg.set_main_option("sqlalchemy.url", sync_url)
    try:
        alembic_command.upgrade(alembic_cfg, "head")
        logger.info("✅ Migrations aplicadas com sucesso.")
    except Exception as e:
        logger.error(f"⚠️  Falha ao aplicar migrations: {e}")
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Roda migrations Alembic na inicialização
    import asyncio
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _run_migrations)

    # Seed: garantir usuário admin existe com is_admin=True
    async with AsyncSessionLocal() as session:
        from sqlalchemy.future import select
        from sqlalchemy.exc import IntegrityError
        result = await session.execute(
            select(models.User).filter(models.User.username == "admin")
        )
        existing_admin = result.scalars().first()
        if not existing_admin:
            admin_user = models.User(
                username="admin",
                display_name="Admin",
                password_hash=get_password_hash("admin"),
                is_admin=True,
            )
            session.add(admin_user)
            try:
                await session.commit()
                logger.info("✅ Usuário admin criado (user: admin / senha: admin)")
            except IntegrityError:
                await session.rollback()
                logger.info("ℹ️  Usuário admin já existe (race condition ignorada).")
        else:
            # Garante que o admin existente tenha is_admin=True
            if not existing_admin.is_admin:
                existing_admin.is_admin = True
                await session.commit()
                logger.info("✅ Privilégios de admin garantidos para usuário 'admin'.")

    yield


app = FastAPI(
    title="Guará-Notes API",
    version="1.1.0",
    lifespan=lifespan,
    description="API para o Guará-Notes — ferramenta de escrita com IA e grafo semântico.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(notes.router)
app.include_router(folders.router)
app.include_router(graph.router)
app.include_router(ai.router)
app.include_router(admin.router)
app.include_router(ollama.router)


@app.get("/")
async def root():
    return {"message": "Guará-Notes API v1.1 — online 🐺"}


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.1.0"}
