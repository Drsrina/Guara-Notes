import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base, AsyncSessionLocal
from .routers import auth, notes, folders, graph, ai
from . import models
from .auth import get_password_hash


CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5757,http://127.0.0.1:5757,http://localhost:5173"
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Criar todas as tabelas se não existirem (fallback — Alembic é preferido)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed: garantir usuário admin existe
    async with AsyncSessionLocal() as session:
        from sqlalchemy.future import select
        result = await session.execute(
            select(models.User).filter(models.User.username == "admin")
        )
        if not result.scalars().first():
            admin = models.User(
                username="admin",
                display_name="Admin",
                password_hash=get_password_hash("admin"),
            )
            session.add(admin)
            await session.commit()
            print("✅ Usuário admin criado (user: admin / senha: admin)")

    yield


app = FastAPI(title="Guará-Notes API", version="1.0.0", lifespan=lifespan)

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


@app.get("/")
async def root():
    return {"message": "Guará-Notes API v1.0 — online 🐺"}


@app.get("/health")
async def health():
    return {"status": "ok"}
