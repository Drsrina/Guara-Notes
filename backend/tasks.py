import os
import asyncio
import httpx
import numpy as np
from .worker import celery_app
from .database import AsyncSessionLocal
from .models import Note, NoteLink, LinkType
from sqlalchemy.future import select
from sqlalchemy import delete, text, update

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_MODEL_EMBED", "nomic-embed-text")

# Limiar de similaridade coseno para considerar link semântico (0 = idêntico, 1 = oposto)
SEMANTIC_THRESHOLD = float(os.getenv("SEMANTIC_THRESHOLD", "0.35"))
# Máximo de links semânticos por nota
SEMANTIC_TOP_K = int(os.getenv("SEMANTIC_TOP_K", "8"))


# ---------------------------------------------------------------------------
# Helpers async
# ---------------------------------------------------------------------------

async def _generate_embedding(text: str) -> list[float]:
    """Chama Ollama para gerar embedding. Retorna lista vazia em caso de erro."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": text},
                timeout=60.0,
            )
            response.raise_for_status()
            return response.json().get("embedding", [])
        except Exception as e:
            print(f"[embedding] Erro ao chamar Ollama: {e}")
            return []


async def _process_note_embedding(note_id: str):
    """Gera embedding para a nota e dispara o recálculo de links semânticos."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Note).filter(Note.id == note_id))
        note = result.scalars().first()

        if not note:
            print(f"[embedding] Nota {note_id} não encontrada.")
            return

        text_to_embed = f"{note.title}\n{note.content}"
        embedding = await _generate_embedding(text_to_embed)

        if embedding:
            note.embedding = embedding
            await session.commit()
            print(f"[embedding] ✅ Nota {note_id} vetorizada.")
            # Dispara recálculo de links semânticos
            calculate_semantic_links.delay(note_id)
        else:
            print(f"[embedding] ❌ Falhou para nota {note_id}.")


async def _calculate_semantic_links(note_id: str):
    """
    Recalcula note_links do tipo 'semantic' para a nota indicada.
    Usa pgvector (<=> = distância coseno) para encontrar as notas mais similares.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Note).filter(Note.id == note_id))
        source_note = result.scalars().first()

        if not source_note or source_note.embedding is None:
            print(f"[semantic] Nota {note_id} sem embedding — pulando.")
            return

        # Remove links semânticos antigos desta nota como origem
        await session.execute(
            delete(NoteLink).where(
                NoteLink.source_note_id == source_note.id,
                NoteLink.link_type == LinkType.semantic,
            )
        )

        # Busca as K notas mais próximas via pgvector (mesmo usuário, exceto a própria nota)
        # A coluna embedding usa o tipo vector do pgvector; <=> = cosine distance
        similar_query = text("""
            SELECT id, (embedding <=> CAST(:vec AS vector)) AS dist
            FROM notes
            WHERE user_id = :uid
              AND id != :nid
              AND embedding IS NOT NULL
            ORDER BY dist ASC
            LIMIT :k
        """)

        rows = await session.execute(
            similar_query,
            {
                "vec": str(source_note.embedding),
                "uid": str(source_note.user_id),
                "nid": str(source_note.id),
                "k": SEMANTIC_TOP_K,
            },
        )
        similar = rows.fetchall()

        new_links = []
        for row in similar:
            dist = float(row.dist)
            if dist < SEMANTIC_THRESHOLD:
                weight = round(1.0 - dist, 4)  # 0 = sem similitude, 1 = idêntico
                new_links.append(
                    NoteLink(
                        source_note_id=source_note.id,
                        target_note_id=row.id,
                        link_type=LinkType.semantic,
                        weight=weight,
                    )
                )

        if new_links:
            session.add_all(new_links)

        await session.commit()
        print(f"[semantic] ✅ {len(new_links)} links semânticos para nota {note_id}.")

        # Dispara recálculo das coordenadas UMAP do usuário
        calculate_umap_coordinates.delay(str(source_note.user_id))


async def _calculate_umap_coordinates(user_id: str):
    """
    Reduz embeddings para 3D com UMAP e persiste umap_x/y/z em cada nota.
    Requer ao menos 3 notas com embedding.
    """
    print(f"[umap] Calculando coordenadas 3D para usuário {user_id}...")
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Note)
            .filter(Note.user_id == user_id, Note.embedding.is_not(None))
        )
        notes = result.scalars().all()

        if len(notes) < 3:
            print(f"[umap] Notas insuficientes ({len(notes)}) — mínimo 3.")
            return

        import umap

        embeddings = np.array([np.array(note.embedding) for note in notes])

        # n_neighbors não pode ser maior que o número de amostras - 1
        n_neighbors = min(15, len(notes) - 1)

        reducer = umap.UMAP(
            n_components=3,
            n_neighbors=n_neighbors,
            min_dist=0.1,
            metric="cosine",
            random_state=42,
        )
        try:
            projected = reducer.fit_transform(embeddings)
            for note, coords in zip(notes, projected):
                await session.execute(
                    update(Note)
                    .where(Note.id == note.id)
                    .values(
                        umap_x=float(coords[0]),
                        umap_y=float(coords[1]),
                        umap_z=float(coords[2]),
                    )
                )
            await session.commit()
            print(f"[umap] ✅ {len(notes)} notas com coordenadas 3D atualizadas.")
        except Exception as e:
            print(f"[umap] ❌ Erro no UMAP: {e}")


# ---------------------------------------------------------------------------
# Celery tasks (entry points síncronos que executam as coroutines acima)
# ---------------------------------------------------------------------------

@celery_app.task(name="backend.tasks.generate_embeddings", bind=True, max_retries=3)
def generate_embeddings(self, note_id: str):
    try:
        asyncio.run(_process_note_embedding(note_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)


@celery_app.task(name="backend.tasks.calculate_semantic_links", bind=True, max_retries=3)
def calculate_semantic_links(self, note_id: str):
    try:
        asyncio.run(_calculate_semantic_links(note_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=10)


@celery_app.task(name="backend.tasks.calculate_umap_coordinates", bind=True, max_retries=3)
def calculate_umap_coordinates(self, user_id: str):
    try:
        asyncio.run(_calculate_umap_coordinates(user_id))
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
